/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { colors, duration, easing, layout, pressFeedback, radius, space, text } from './tokens.ts';

// The design system's CSS custom properties are the source of truth; the app's
// tokens must carry the same values.
function cssVariables(file: string): Map<string, string> {
  const css = readFileSync(new URL(`../../design-system/tokens/${file}`, import.meta.url), 'utf8');
  const vars = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/--([\w-]+):([^;]+);/g)) {
    vars.set(name, value.trim());
  }
  const resolve = (value: string): string =>
    value.replace(/var\(--([\w-]+)\)/g, (_, ref: string) => resolve(vars.get(ref) ?? ''));
  return new Map([...vars].map(([name, value]) => [name, resolve(value)]));
}

const camel = (name: string) => name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

// '12px' -> 12, '120ms' -> 120, '0' -> 0
const toNumber = (value: string) => Number(value.replace(/px|ms$/, ''));

function scale(vars: Map<string, string>, prefix: string): Record<string, number> {
  return Object.fromEntries(
    [...vars]
      .filter(([name]) => name.startsWith(`${prefix}-`))
      .map(([name, value]) => [camel(name.slice(prefix.length + 1)), toNumber(value)]),
  );
}

test('every design-system color is available with the same value', () => {
  for (const [name, value] of cssVariables('colors.css')) {
    assert.equal(colors[camel(name) as keyof typeof colors], value, `--${name}`);
  }
});

test('spacing, radii, layout sizes and durations match the design system, as numbers', () => {
  const vars = cssVariables('spacing.css');
  assert.deepEqual(space, scale(vars, 'space'));
  assert.deepEqual(radius, scale(vars, 'radius'));
  assert.deepEqual(duration, scale(vars, 'dur'));
  assert.equal(layout.screenGutter, toNumber(vars.get('screen-gutter')!));
  assert.equal(layout.hitMin, toNumber(vars.get('hit-min')!));
  assert.equal(layout.borderWidth, toNumber(vars.get('border-width')!));
});

test('easing curves match the design system cubic-beziers', () => {
  const vars = cssVariables('spacing.css');
  const bezier = (value: string) => value.match(/[\d.]+/g)!.map(Number);
  assert.deepEqual(easing.out, bezier(vars.get('ease-out')!));
  assert.deepEqual(easing.inOut, bezier(vars.get('ease-in-out')!));
});

test('pressing a button scales it to 0.98, an icon button to 0.94, in 120 ms with ease-out', () => {
  assert.deepEqual(pressFeedback.button, { scale: 0.98, duration: 120, easing: [0.2, 0.7, 0.2, 1] });
  assert.deepEqual(pressFeedback.iconButton, { scale: 0.94, duration: 120, easing: [0.2, 0.7, 0.2, 1] });
});

test('every design-system text style is available with an absolute line height and a loaded font', () => {
  const vars = cssVariables('typography.css');
  // React Native picks a font file by family name, one per weight.
  const loadedFont: Record<string, string> = {
    "'Instrument Serif' 400": 'InstrumentSerif_400Regular',
    "'Hanken Grotesk' 400": 'HankenGrotesk_400Regular',
    "'Hanken Grotesk' 500": 'HankenGrotesk_500Medium',
    "'Hanken Grotesk' 600": 'HankenGrotesk_600SemiBold',
  };
  for (const [name, value] of vars) {
    if (!name.startsWith('text-')) continue;
    const [, weight, size, leading, family] = value.match(/^(\d+) ([\d.]+)px\/([\d.]+) ('[^']+')/)!;
    assert.deepEqual(
      text[camel(name.slice('text-'.length)) as keyof typeof text],
      {
        fontFamily: loadedFont[`${family} ${weight}`],
        fontSize: Number(size),
        lineHeight: Number(size) * Number(leading),
      },
      `--${name}`,
    );
  }
});
