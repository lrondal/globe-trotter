/// <reference types="node" />
// Worklets are not hoisted: the worklets Babel plugin turns each one into a `const` whose
// closure is captured where it is defined. A worklet calling a function or constant defined
// below it gets `undefined` on the UI thread, which aborts the app in Expo Go without a log.
// The captured names are only unpacked inside the worklet's body, so a default parameter
// using one throws a ReferenceError on the UI thread too: every tap of #5 crashed so.
// Plain `node --test` never runs that plugin, so this test runs it and checks both.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const workletsPlugin = require.resolve('react-native-worklets/plugin');

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * Every `worklet captures name` where name is defined below the worklet, in the same block,
 * and every `worklet uses name in a default parameter` where name is captured.
 */
function misusedCaptures(file: string): string[] {
  const { ast } = babel.transformFileSync(file, {
    babelrc: false,
    configFile: false,
    ast: true,
    code: false,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: [workletsPlugin],
  });
  const found: string[] = [];
  babel.traverse(ast, {
    // The plugin turns each worklet into `factory({ ...captured })`.
    CallExpression(path: any) {
      const factory = path.node.callee;
      if (factory.type !== 'FunctionExpression' || !factory.id?.name.endsWith('Factory')) return;
      const statement = path.getStatementParent();
      const worklet = factory.id.name.replace(/_\w+Factory$/, '');
      const captured = new Set<string>();
      for (const property of path.node.arguments[0]?.properties ?? []) {
        const name: string | undefined = property.key?.name;
        if (!name || name.startsWith('_')) continue;
        captured.add(name);
        const binding = path.scope.getBinding(name);
        // Imports and function declarations are hoisted.
        if (!binding || binding.kind === 'module' || binding.kind === 'hoisted') continue;
        const declared = binding.path.getStatementParent();
        if (declared.parentPath === statement.parentPath && declared.key > statement.key) {
          found.push(`${worklet} captures ${name}, defined below it`);
        }
      }
      // Default values are evaluated before the body unpacks `this.__closure`.
      path.get('callee').traverse({
        AssignmentPattern(pattern: any) {
          if (pattern.listKey !== 'params') return;
          const names = new Set<string>();
          const right = pattern.get('right');
          if (right.isIdentifier()) names.add(right.node.name);
          right.traverse({ Identifier: (id: any) => void names.add(id.node.name) });
          for (const name of names) {
            if (captured.has(name)) found.push(`${worklet} uses ${name} in a default parameter`);
          }
        },
      });
    },
  });
  return found;
}

test('no worklet in src/ uses a function or constant defined below it, or in a default parameter', () => {
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(SRC, f))
    .filter((f) => readFileSync(f, 'utf8').includes("'worklet'"));
  assert.ok(files.length >= 3, `expected the globe's worklet files, found ${files.length}`);
  for (const file of files) assert.deepEqual(misusedCaptures(file), [], file);
});

test('the check catches a worklet calling a worklet defined below it', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'worklets-')), 'late.ts');
  writeFileSync(
    file,
    [
      "export function draw() { 'worklet'; return helper() + LIMIT; }",
      "function helper() { 'worklet'; return 1; }",
      'const LIMIT = 2;',
    ].join('\n'),
  );
  assert.deepEqual(misusedCaptures(file), [
    'draw captures helper, defined below it',
    'draw captures LIMIT, defined below it',
  ]);
});

/**
 * Every `useDerivedValue` updater that calls a function defined in the component.
 * Reanimated re-runs a derived value only when a shared value found directly in its
 * closure changes: shared values read inside a captured function are never tracked.
 * Skia's `usePathValue` is exempt: it notifies its own path, so it re-runs every frame.
 */
function derivedReadsThroughFunction(file: string): string[] {
  const ast = babel.parseSync(readFileSync(file, 'utf8'), {
    babelrc: false,
    configFile: false,
    filename: file,
    parserOpts: { plugins: ['typescript', 'jsx'] },
  });
  const found: string[] = [];
  babel.traverse(ast, {
    CallExpression(path: any) {
      if (path.node.callee.name !== 'useDerivedValue') return;
      const updater = path.get('arguments.0');
      if (!updater.isFunction()) return;
      updater.traverse({
        Identifier(id: any) {
          if (!id.isReferencedIdentifier()) return;
          const binding = id.scope.getBinding(id.node.name);
          // Module-level helpers cannot capture the component's shared values.
          if (!binding || binding.scope.path.isProgram() || binding.path.isDescendant(updater)) return;
          const declared = binding.path;
          const isFunction =
            declared.isFunctionDeclaration() || (declared.isVariableDeclarator() && declared.get('init').isFunction());
          if (isFunction) found.push(`a derived value reads through ${id.node.name}()`);
        },
      });
    },
  });
  return found;
}

test('no derived value in src/ reads shared values through a function of the component', () => {
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(SRC, f))
    .filter((f) => readFileSync(f, 'utf8').includes('useDerivedValue'));
  assert.ok(files.length >= 1, 'expected the globe to use derived values');
  for (const file of files) assert.deepEqual(derivedReadsThroughFunction(file), [], file);
});

test('the check catches a derived value reading through a function', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'derived-')), 'hidden.tsx');
  writeFileSync(
    file,
    [
      'function helper(n: number) { return n * 2; }',
      'export function Dot() {',
      '  const lon = useSharedValue(0);',
      "  const view = () => { 'worklet'; return lon.value; };",
      '  const direct = useDerivedValue(() => helper(lon.value));',
      '  const hidden = useDerivedValue(() => view() + 1);',
      '}',
    ].join('\n'),
  );
  assert.deepEqual(derivedReadsThroughFunction(file), ['a derived value reads through view()']);
});

test('the check catches a worklet using a captured constant in a default parameter', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'worklets-')), 'defaults.ts');
  writeFileSync(
    file,
    [
      'const REACH = 12;',
      "export function near(x: number, reach = REACH) { 'worklet'; return x < reach; }",
      "export function far(x: number, reach = 2 * REACH) { 'worklet'; return x > reach; }",
    ].join('\n'),
  );
  assert.deepEqual(misusedCaptures(file), [
    'near uses REACH in a default parameter',
    'far uses REACH in a default parameter',
  ]);
});
