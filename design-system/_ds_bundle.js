/* @ds-bundle: {"format":4,"namespace":"GlobeTrotterDesignSystem_93b564","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"FilterChip","sourcePath":"components/display/FilterChip.jsx"},{"name":"Icon","sourcePath":"components/display/Icon.jsx"},{"name":"PhotoTile","sourcePath":"components/display/PhotoTile.jsx"},{"name":"PlaceRow","sourcePath":"components/display/PlaceRow.jsx"},{"name":"StatusBadge","sourcePath":"components/display/StatusBadge.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Globe","sourcePath":"components/globe/Globe.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"BottomSheet","sourcePath":"components/overlays/BottomSheet.jsx"},{"name":"Dialog","sourcePath":"components/overlays/Dialog.jsx"},{"name":"Toast","sourcePath":"components/overlays/Toast.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"eebd75f2c3ee","components/actions/IconButton.jsx":"56123d9e640e","components/display/FilterChip.jsx":"c27d67a5c4c5","components/display/Icon.jsx":"a207c716e5a0","components/display/PhotoTile.jsx":"4b99922cf31d","components/display/PlaceRow.jsx":"1768ac00dc6c","components/display/StatusBadge.jsx":"2d267329c06b","components/forms/Checkbox.jsx":"e12e116c2f72","components/forms/Input.jsx":"f96de084cded","components/forms/SegmentedControl.jsx":"8c25da7dd9f0","components/forms/Switch.jsx":"76d8854225a7","components/globe/Globe.jsx":"180a34f6e87b","components/navigation/TabBar.jsx":"f46349ed5c3d","components/overlays/BottomSheet.jsx":"d43c61f66bf0","components/overlays/Dialog.jsx":"5e2c41fc2c84","components/overlays/Toast.jsx":"4af67a3c066a","explorations/globe.js":"8c029a66c82e","ui_kits/mobile/GlobeScreen.jsx":"ed925f23f7dc","ui_kits/mobile/ListScreens.jsx":"a2870b327097","ui_kits/mobile/NoteScreen.jsx":"0ab6b5749fa5","ui_kits/mobile/PlaceSheet.jsx":"7415262b8e1a","ui_kits/mobile/countries.js":"ebbb8cbe638d","ui_kits/mobile/data.js":"626fc9bd113b","ui_kits/mobile/ios-frame.jsx":"24642b887be3","ui_kits/mobile/regions-loader.js":"7deb6cd55b34"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GlobeTrotterDesignSystem_93b564 = window.GlobeTrotterDesignSystem_93b564 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/FilterChip.jsx
try { (() => {
const DOT = {
  visited: 'var(--state-visited)',
  wish: 'var(--state-wish)',
  unexplored: 'var(--state-unexplored)'
};
function FilterChip({
  status,
  label,
  count,
  selected = true,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-pressed": selected,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      padding: '0 12px',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      background: selected ? 'var(--surface-raised)' : 'transparent',
      border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-pill)',
      color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
      font: 'var(--text-label)',
      boxShadow: selected ? 'var(--shadow-1)' : 'none',
      transition: 'all var(--dur-base) var(--ease-out)'
    }
  }, status && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: selected ? DOT[status] : 'transparent',
      boxShadow: `inset 0 0 0 1.5px ${status === 'unexplored' || !selected ? 'var(--ink-3)' : DOT[status]}`
    }
  }), label, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontWeight: 400,
      fontVariantNumeric: 'tabular-nums'
    }
  }, count));
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/display/Icon.jsx
try { (() => {
const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@0.452.0/icons/';
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  style
}) {
  const url = `url(${CDN}${name}.svg)`;
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      flexShrink: 0,
      background: color,
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Icon.jsx", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
const SIZES = {
  md: {
    h: 44,
    px: 18,
    fs: 'var(--size-body)'
  },
  sm: {
    h: 36,
    px: 14,
    fs: 'var(--size-body-s)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  onClick,
  children,
  type = 'button',
  style
}) {
  const [st, setSt] = React.useState('idle');
  const s = SIZES[size] || SIZES.md;
  const V = {
    primary: {
      bg: 'var(--ink-1)',
      bgH: 'var(--ink-2)',
      fg: 'var(--text-inverse)',
      bd: 'transparent'
    },
    accent: {
      bg: 'var(--accent)',
      bgH: 'var(--accent-hover)',
      bgP: 'var(--accent-press)',
      fg: 'var(--text-on-accent)',
      bd: 'transparent'
    },
    secondary: {
      bg: 'var(--surface-raised)',
      bgH: 'var(--paper-2)',
      fg: 'var(--text-primary)',
      bd: 'var(--border-strong)'
    },
    ghost: {
      bg: 'transparent',
      bgH: 'var(--paper-2)',
      fg: 'var(--text-primary)',
      bd: 'transparent'
    }
  }[variant] || {};
  const bg = disabled ? variant === 'ghost' ? 'transparent' : 'var(--paper-2)' : st === 'press' ? V.bgP || V.bgH : st === 'hover' ? V.bgH : V.bg;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setSt('hover'),
    onMouseLeave: () => setSt('idle'),
    onMouseDown: () => setSt('press'),
    onMouseUp: () => setSt('hover'),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: s.h,
      padding: `0 ${s.px}px`,
      width: fullWidth ? '100%' : undefined,
      background: bg,
      color: disabled ? 'var(--text-disabled)' : V.fg,
      border: `1px solid ${disabled ? 'transparent' : V.bd}`,
      borderRadius: 'var(--radius-md)',
      font: `var(--weight-medium) ${s.fs}/1 var(--font-sans)`,
      cursor: disabled ? 'default' : 'pointer',
      whiteSpace: 'nowrap',
      transform: st === 'press' && !disabled ? 'scale(.98)' : 'none',
      transition: 'background var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 16 : 18
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: size === 'sm' ? 16 : 18
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active = false,
  disabled = false,
  onClick,
  style
}) {
  const [st, setSt] = React.useState('idle');
  const d = size === 'sm' ? 36 : 44;
  const base = {
    ghost: {
      bg: 'transparent',
      bd: 'transparent',
      sh: 'none'
    },
    outline: {
      bg: 'var(--surface-raised)',
      bd: 'var(--border-strong)',
      sh: 'none'
    },
    raised: {
      bg: 'var(--surface-raised)',
      bd: 'var(--border-default)',
      sh: 'var(--shadow-2)'
    }
  }[variant];
  const bg = active ? 'var(--ink-1)' : st === 'idle' ? base.bg : 'var(--paper-2)';
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setSt('hover'),
    onMouseLeave: () => setSt('idle'),
    onMouseDown: () => setSt('press'),
    onMouseUp: () => setSt('hover'),
    style: {
      width: d,
      height: d,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      flexShrink: 0,
      background: bg,
      color: active ? 'var(--text-inverse)' : disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
      border: `1px solid ${active ? 'transparent' : base.bd}`,
      borderRadius: variant === 'raised' ? 'var(--radius-pill)' : 'var(--radius-md)',
      boxShadow: base.sh,
      cursor: disabled ? 'default' : 'pointer',
      transform: st === 'press' ? 'scale(.94)' : 'none',
      transition: 'background var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 18 : 20
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/display/PhotoTile.jsx
try { (() => {
function PhotoTile({
  src,
  label,
  caption,
  ratio = '4/3',
  radius = 'var(--radius-md)',
  shape = 'rect',
  style
}) {
  const round = shape === 'circle';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: round ? '1/1' : ratio,
      borderRadius: round ? '50%' : radius,
      overflow: 'hidden',
      background: 'var(--paper-2)',
      border: round ? '2px solid var(--surface-raised)' : 'none',
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: label || '',
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',
      padding: round ? 0 : 10,
      justifyContent: round ? 'center' : 'flex-start',
      alignContent: 'center',
      backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 7px,rgba(27,26,23,.045) 7px 8px)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)',
      alignSelf: round ? 'center' : 'flex-end'
    }
  }, label)), caption && src && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '24px 10px 8px',
      background: 'linear-gradient(transparent,rgba(27,26,23,.55))',
      color: '#fff',
      font: 'var(--text-caption)'
    }
  }, caption));
}
Object.assign(__ds_scope, { PhotoTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PhotoTile.jsx", error: String((e && e.message) || e) }); }

// components/display/PlaceRow.jsx
try { (() => {
const DOT = {
  visited: 'var(--state-visited)',
  wish: 'var(--state-wish)',
  unexplored: 'var(--state-unexplored)'
};
function PlaceRow({
  name,
  meta,
  status = 'visited',
  photo,
  showPhoto = true,
  onClick,
  last = false
}) {
  const [p, setP] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: onClick,
    onMouseDown: () => setP(true),
    onMouseUp: () => setP(false),
    onMouseLeave: () => setP(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      padding: '8px 0',
      cursor: 'pointer',
      borderBottom: last ? 'none' : '1px solid var(--border-default)',
      background: p ? 'var(--paper-2)' : 'transparent',
      transition: 'background var(--dur-fast)'
    }
  }, showPhoto && /*#__PURE__*/React.createElement(__ds_scope.PhotoTile, {
    src: photo,
    label: "",
    ratio: "1/1",
    radius: "var(--radius-sm)",
    style: {
      width: 44,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--text-muted)'
    }
  }, meta)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: DOT[status],
      boxShadow: status === 'unexplored' ? 'inset 0 0 0 1px var(--ink-3)' : 'none'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--ink-4)"
  }));
}
Object.assign(__ds_scope, { PlaceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PlaceRow.jsx", error: String((e && e.message) || e) }); }

// components/display/StatusBadge.jsx
try { (() => {
const S = {
  visited: {
    bg: 'var(--state-visited)',
    fg: 'var(--text-on-accent)',
    l: 'Visité'
  },
  wish: {
    bg: 'var(--state-wish)',
    fg: 'var(--state-wish-ink)',
    l: 'À visiter'
  },
  unexplored: {
    bg: 'transparent',
    fg: 'var(--text-muted)',
    l: 'Non exploré',
    bd: 'var(--border-strong)'
  }
};
function StatusBadge({
  status = 'visited',
  children,
  size = 'md'
}) {
  const s = S[status] || S.visited;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: size === 'sm' ? 20 : 24,
      padding: size === 'sm' ? '0 7px' : '0 9px',
      whiteSpace: 'nowrap',
      background: s.bg,
      color: s.fg,
      border: `1px solid ${s.bd || 'transparent'}`,
      borderRadius: 'var(--radius-sm)',
      font: size === 'sm' ? 'var(--weight-medium) 11px/1 var(--font-sans)' : 'var(--text-label)'
    }
  }, children || s.l);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    onClick: e => {
      e.preventDefault();
      !disabled && onChange && onChange(!checked);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "checkbox",
    "aria-checked": checked,
    style: {
      width: 20,
      height: 20,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-xs)',
      border: `1.5px solid ${checked ? 'var(--ink-1)' : 'var(--ink-3)'}`,
      background: checked ? 'var(--ink-1)' : 'transparent',
      color: 'var(--text-inverse)',
      transition: 'background var(--dur-fast)'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body)',
      color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
      textDecoration: checked ? 'line-through' : 'none'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  value,
  defaultValue,
  placeholder,
  icon,
  multiline = false,
  rows = 4,
  onChange,
  variant = 'default',
  style
}) {
  const [f, setF] = React.useState(false);
  const Tag = multiline ? 'textarea' : 'input';
  const pill = variant === 'search';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: multiline ? 'flex-start' : 'center',
      gap: 8,
      minHeight: 44,
      padding: multiline ? '12px 14px' : '0 14px',
      background: 'var(--surface-raised)',
      border: `1px solid ${f ? 'var(--border-focus)' : 'var(--border-strong)'}`,
      borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-md)',
      boxShadow: pill ? 'var(--shadow-1)' : 'none',
      transition: 'border-color var(--dur-fast)'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: "var(--ink-3)"
  }), /*#__PURE__*/React.createElement(Tag, {
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    rows: multiline ? rows : undefined,
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    onChange: e => onChange && onChange(e.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: 'transparent',
      padding: 0,
      resize: 'none',
      font: 'var(--text-body)',
      color: 'var(--text-primary)'
    }
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function SegmentedControl({
  options = [],
  value,
  onChange,
  fullWidth = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      gap: 2,
      padding: 3,
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)'
    }
  }, options.map(o => {
    const v = typeof o === 'string' ? o : o.value,
      l = typeof o === 'string' ? o : o.label,
      on = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(v),
      style: {
        flex: fullWidth ? 1 : 'none',
        height: 32,
        padding: '0 14px',
        border: 0,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: on ? 'var(--ink-1)' : 'transparent',
        color: on ? 'var(--text-inverse)' : 'var(--text-muted)',
        font: 'var(--text-label)',
        transition: 'background var(--dur-base) var(--ease-out),color var(--dur-base)'
      }
    }, l);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 44,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .5 : 1
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": checked,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: 'relative',
      width: 44,
      height: 26,
      flexShrink: 0,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--ink-1)' : 'var(--paper-3)',
      transition: 'background var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'var(--paper-0)',
      boxShadow: 'var(--shadow-1)',
      transition: 'left var(--dur-base) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/globe/Globe.jsx
try { (() => {
const TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
function loadWorld() {
  if (!window.__gtWorld) window.__gtWorld = fetch(TOPO).then(r => r.json()).then(w => window.topojson.feature(w, w.objects.countries).features);
  return window.__gtWorld;
}
function Globe({
  onSelectPlace,
  maxZoom = 24,
  offsetY = 0,
  regions = {},
  onSelectRegion,
  visited = [],
  wish = [],
  pins = [],
  photos = [],
  filters = {
    visited: true,
    wish: true,
    unexplored: true
  },
  selected,
  focus,
  onSelect,
  photoZoom = 1.8,
  autoRotate = false,
  initialRotate = [-10, -30],
  padding = 0.88,
  style
}) {
  const host = React.useRef(null),
    api = React.useRef({}),
    P = React.useRef({});
  P.current = {
    onSelectPlace,
    offsetY,
    regions,
    onSelectRegion,
    visited: new Set(visited.map(Number)),
    wish: new Set(wish.map(Number)),
    pins,
    photos,
    filters,
    selected: selected != null ? Number(selected) : null,
    onSelect,
    photoZoom
  };
  React.useEffect(() => {
    const d3 = window.d3;
    if (!d3 || !window.topojson) {
      console.error('Globe: load d3@7 and topojson-client@3 first');
      return;
    }
    const el = host.current,
      css = n => getComputedStyle(el).getPropertyValue(n).trim();
    let W = el.clientWidth || 360,
      H = el.clientHeight || 360,
      R = Math.min(W, H) / 2 * padding,
      auto = autoRotate,
      alive = true;
    const svg = d3.select(el).append('svg').style('display', 'block').style('touch-action', 'none').style('cursor', 'grab');
    const proj = d3.geoOrthographic().clipAngle(90).rotate(initialRotate),
      path = d3.geoPath(proj);
    const defs = svg.append('defs');
    const sphere = svg.append('path').datum({
      type: 'Sphere'
    });
    const grat = svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke-width', .5);
    const landG = svg.append('g'),
      regG = svg.append('g'),
      pinG = svg.append('g'),
      photoG = svg.append('g');
    let land = landG.selectAll('path');
    const size = () => {
      W = el.clientWidth || W;
      H = el.clientHeight || H;
      R = Math.min(W, H) / 2 * padding;
      svg.attr('width', W).attr('height', H);
      proj.translate([W / 2, H / 2 + off]).scale(R * k);
    };
    let k = 1,
      prev = d3.zoomIdentity,
      off = offsetY;
    const cache = {},
      loading = {},
      centroids = {},
      byId = {};
    const main = f => {
      if (f.geometry.type !== 'MultiPolygon') return f;
      let best = null,
        a = -1;
      f.geometry.coordinates.forEach(c => {
        const p = {
            type: 'Polygon',
            coordinates: c
          },
          x = d3.geoArea(p);
        if (x > a) {
          a = x;
          best = p;
        }
      });
      return best;
    };
    let fade = 0,
      fadeId = null;
    const blend = () => fade;
    function ensure(id) {
      const r = P.current.regions[id];
      if (!r || cache[id] || loading[id]) return;
      if (r.features) {
        cache[id] = r.features;
        return;
      }
      loading[id] = (r.load ? Promise.resolve(r.load()) : fetch(r.url).then(x => x.json())).then(j => {
        cache[id] = j && j.features || j || [];
        draw();
      }).catch(e => console.error('Globe regions', id, e));
    }
    function fill(d) {
      const p = P.current,
        id = +d.id,
        t = id === fadeId ? fade : 0;
      if (p.visited.has(id)) return p.filters.visited ? d3.interpolateRgb(css('--state-visited'), css('--state-visited-tint'))(t) : css('--globe-land');
      if (p.wish.has(id)) return p.filters.wish ? d3.interpolateRgb(css('--state-wish'), css('--state-wish-tint'))(t) : css('--globe-land');
      return p.filters.unexplored ? css('--globe-land') : css('--globe-ocean');
    }
    function draw() {
      const p = P.current,
        c = [-proj.rotate()[0], -proj.rotate()[1]],
        vis = d => d3.geoDistance([d.lon, d.lat], c) < Math.PI / 2 - .05;
      sphere.attr('d', path).attr('fill', css('--globe-ocean')).attr('stroke', css('--globe-rim'));
      grat.attr('d', path).attr('stroke', css('--globe-graticule'));
      land.attr('d', path).attr('fill', fill).attr('stroke', d => +d.id === p.selected ? css('--ink-1') : css('--globe-stroke')).attr('stroke-width', d => +d.id === p.selected ? 1.5 : .5);
      land.filter(d => +d.id === p.selected).raise();
      const t = blend(),
        active = [];
      if (t > 0 && fadeId != null) [String(fadeId)].forEach(id => {
        if (!p.regions[id]) return;
        {
          ensure(id);
          if (cache[id]) {
            const r = p.regions[id],
              vs = new Set(r.visited || []),
              ws = new Set(r.wish || []);
            cache[id].forEach(f => active.push({
              f,
              id: +id,
              key: id + ':' + f.properties.name,
              st: vs.has(f.properties.name) ? 'v' : ws.has(f.properties.name) ? 'w' : 'u'
            }));
          }
        }
      });
      regG.style('opacity', t).style('pointer-events', t > .5 ? 'auto' : 'none');
      regG.selectAll('path').data(active, d => d.key).join(en => en.append('path').style('cursor', 'pointer').on('click', (e, d) => {
        e.stopPropagation();
        const q = P.current;
        if (q.onSelectRegion) q.onSelectRegion({
          country: d.id,
          name: d.f.properties.name,
          status: d.st === 'v' ? 'visited' : d.st === 'w' ? 'wish' : 'unexplored',
          centroid: d3.geoCentroid(d.f)
        });else q.onSelect && q.onSelect({
          id: d.id,
          name: '',
          centroid: centroids[d.id]
        });
      })).attr('d', d => path(d.f)).attr('fill', d => d.st === 'v' ? css('--state-visited') : d.st === 'w' ? css('--state-wish') : 'transparent').attr('stroke', css('--paper-0')).attr('stroke-width', .6).attr('stroke-opacity', .9);
      pinG.selectAll('circle').data(p.pins).join(en => en.append('circle').style('cursor', 'pointer').on('click', (e, d) => {
        e.stopPropagation();
        const q = P.current;
        q.onSelectPlace && q.onSelectPlace(d);
      })).attr('r', 3.5).attr('fill', css('--globe-pin')).attr('stroke', css('--paper-0')).attr('stroke-width', 1.2).attr('cx', d => proj([d.lon, d.lat])[0]).attr('cy', d => proj([d.lon, d.lat])[1]).attr('display', d => vis(d) ? null : 'none');
      const showPh = k >= p.photoZoom,
        s = Math.min(38, 16 + k * 5);
      const g = photoG.selectAll('g.ph').data(showPh ? p.photos : [], d => d.label).join(en => {
        const g = en.append('g').attr('class', 'ph').style('cursor', 'pointer').style('filter', 'drop-shadow(0 2px 4px rgba(27,26,23,.3))');
        g.on('click', (e, d) => {
          e.stopPropagation();
          const q = P.current;
          q.onSelectPlace && q.onSelectPlace(d);
        });
        g.append('circle').attr('class', 'bg');
        g.append('image').attr('preserveAspectRatio', 'xMidYMid slice');
        g.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central');
        g.append('circle').attr('class', 'ring').attr('fill', 'none');
        return g;
      });
      g.attr('display', d => vis(d) ? null : 'none').attr('transform', d => {
        const q = proj([d.lon, d.lat]);
        return `translate(${q[0]},${q[1] - s / 2 - 4})`;
      });
      g.each(function (d, i) {
        const id = 'gtclip' + i;
        let cp = defs.select('#' + id);
        if (cp.empty()) cp = defs.append('clipPath').attr('id', id).append('circle');else cp = cp.select('circle');
        cp.attr('r', s / 2);
        const n = d3.select(this);
        n.select('.bg').attr('r', s / 2).attr('fill', css('--paper-2'));
        n.select('image').attr('href', d.src || null).attr('x', -s / 2).attr('y', -s / 2).attr('width', s).attr('height', s).attr('clip-path', `url(#${id})`);
        n.select('text').text(d.src ? '' : (d.label || '').slice(0, 2)).attr('fill', css('--ink-3')).style('font', `500 ${Math.round(s / 3.4)}px ${css('--font-sans')}`);
        n.select('.ring').attr('r', s / 2).attr('stroke', css('--paper-0')).attr('stroke-width', 1.5);
      });
    }
    const zoom = d3.zoom().scaleExtent([.8, maxZoom]).on('start', e => {
      if (e.sourceEvent) {
        auto = false;
        svg.style('cursor', 'grabbing');
      }
    }).on('zoom', e => {
      const t = e.transform;
      if (e.sourceEvent && t.k === prev.k) {
        const r = proj.rotate(),
          f = 75 / proj.scale();
        proj.rotate([r[0] + (t.x - prev.x) * f, Math.max(-85, Math.min(85, r[1] - (t.y - prev.y) * f))]);
      }
      k = t.k;
      prev = t;
      proj.scale(R * k);
      draw();
    }).on('end', () => svg.style('cursor', 'grab'));
    svg.call(zoom).on('dblclick.zoom', null);
    api.current = {
      draw,
      fit: (id, pad = .78) => {
        const f = byId[+id];
        if (!f) return false;
        const ce = centroids[+id],
          tp = d3.geoOrthographic().clipAngle(90).rotate([-ce[0], -ce[1]]).scale(1).translate([0, 0]);
        const b = d3.geoPath(tp).bounds(f),
          bw = Math.max(1e-4, b[1][0] - b[0][0]),
          bh = Math.max(1e-4, b[1][1] - b[0][1]),
          aw = W,
          ah = Math.max(120, H + 2 * P.current.offsetY);
        const kk = Math.max(1, Math.min(maxZoom, Math.min(aw * pad / bw, ah * pad / bh) / R));
        api.current.flyTo(ce[0], ce[1], kk);
        return true;
      },
      zoomBy: f => {
        const r = proj.rotate();
        api.current.flyTo(-r[0], -r[1], Math.max(.8, Math.min(maxZoom, k * f)));
      },
      flyTo: (lon, lat, kk) => {
        auto = false;
        const r0 = proj.rotate(),
          r1 = [-lon, -lat],
          k0 = k,
          k1 = kk || k,
          ir = d3.interpolate(r0, r1);
        d3.transition().duration(900).ease(d3.easeCubicInOut).tween('fly', () => t => {
          proj.rotate(ir(t));
          const kt = k0 + (k1 - k0) * t;
          svg.call(zoom.transform, d3.zoomIdentity.scale(kt));
        });
      }
    };
    size();
    loadWorld().then(features => {
      if (!alive) return;
      features.forEach(f => {
        const m = main(f);
        byId[+f.id] = m;
        centroids[+f.id] = d3.geoCentroid(m);
      });
      land = landG.selectAll('path').data(features).join('path').style('cursor', 'pointer').on('click', (e, d) => {
        const p = P.current;
        p.onSelect && p.onSelect({
          id: +d.id,
          name: d.properties.name,
          centroid: d3.geoCentroid(d)
        });
      });
      draw();
    });
    const ro = new ResizeObserver(() => {
      size();
      draw();
    });
    ro.observe(el);
    const timer = d3.timer(() => {
      const sel = P.current.selected,
        has = sel != null && P.current.regions[sel];
      if (has) ensure(String(sel));
      const want = has && cache[sel] ? 1 : 0;
      if (want && fadeId !== sel) {
        if (fade > .02) {
          fade = Math.max(0, fade - .12);
          draw();
        } else {
          fade = 0;
          fadeId = sel;
        }
      } else if (Math.abs(want - fade) > .01) {
        fade += (want - fade) * .12;
        if (fade < .02 && !want) {
          fade = 0;
          fadeId = null;
        }
        draw();
      }
      const to = P.current.offsetY;
      if (Math.abs(to - off) > .5) {
        off += (to - off) * .14;
        proj.translate([W / 2, H / 2 + off]);
        if (!auto) draw();
      }
      if (auto) {
        const r = proj.rotate();
        proj.rotate([r[0] + .08, r[1]]);
        draw();
      }
    });
    return () => {
      alive = false;
      ro.disconnect();
      timer.stop();
      svg.remove();
    };
  }, []);
  React.useEffect(() => {
    api.current.draw && api.current.draw();
  });
  React.useEffect(() => {
    if (!focus || !api.current.flyTo) return;
    const a = api.current;
    if (focus.fit != null) {
      let n = 0;
      const go = () => {
        if (!a.fit(focus.fit, focus.pad) && n++ < 40) setTimeout(go, 100);
      };
      go();
    } else if (focus.zoomBy) a.zoomBy(focus.zoomBy);else a.flyTo(focus.lon, focus.lat, focus.zoom);
  }, [focus && focus.t, focus && focus.fit, focus && focus.zoomBy, focus && focus.lon, focus && focus.lat, focus && focus.zoom]);
  return /*#__PURE__*/React.createElement("div", {
    ref: host,
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Globe });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/globe/Globe.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function TabBar({
  items = [],
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      background: 'var(--surface-raised)',
      borderTop: '1px solid var(--border-default)',
      padding: '6px 8px 0'
    }
  }, items.map(it => {
    const on = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onChange && onChange(it.id),
      "aria-current": on,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        minHeight: 48,
        padding: '4px 0',
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        color: on ? 'var(--text-primary)' : 'var(--ink-4)',
        font: 'var(--weight-medium) 11px/1.2 var(--font-sans)',
        transition: 'color var(--dur-fast)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 24
    }), it.label);
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/overlays/BottomSheet.jsx
try { (() => {
const H = {
  peek: '28%',
  half: '52%',
  full: 'calc(100% - 56px)'
};
function BottomSheet({
  open = true,
  snap = 'half',
  onSnap,
  children,
  header,
  absolute = true
}) {
  const order = ['peek', 'half', 'full'];
  const cycle = () => onSnap && onSnap(order[(order.indexOf(snap) + 1) % order.length]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: absolute ? 'absolute' : 'relative',
      left: 0,
      right: 0,
      bottom: 0,
      height: absolute ? H[snap] : 'auto',
      zIndex: 20,
      transform: open ? 'none' : 'translateY(105%)',
      transition: 'transform var(--dur-slow) var(--ease-out),height var(--dur-slow) var(--ease-out)',
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      boxShadow: 'var(--shadow-sheet)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: cycle,
    style: {
      padding: '8px 0 4px',
      display: 'flex',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 4,
      borderRadius: 2,
      background: 'var(--paper-4)'
    }
  })), header && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px var(--screen-gutter) 12px',
      flexShrink: 0
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 var(--screen-gutter) 24px'
    }
  }, children));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  children,
  actions,
  absolute = true
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: absolute ? 'absolute' : 'relative',
      inset: 0,
      zIndex: 25,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: absolute ? 'var(--surface-scrim)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    style: {
      width: '100%',
      maxWidth: 320,
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-2)',
      padding: '22px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-s)',
      letterSpacing: 'var(--tracking-display)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      textWrap: 'pretty'
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 8
    }
  }, actions)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Toast.jsx
try { (() => {
function Toast({
  message,
  icon,
  action,
  onAction,
  visible = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      padding: '0 8px 0 14px',
      background: 'var(--surface-inverse)',
      color: 'var(--text-inverse)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-2)',
      font: 'var(--text-body-s)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(8px)',
      transition: 'all var(--dur-base) var(--ease-out)'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      padding: '10px 0'
    }
  }, message), action && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      height: 32,
      padding: '0 10px',
      border: 0,
      background: 'transparent',
      color: 'var(--terracotta-300)',
      font: 'var(--text-label)',
      cursor: 'pointer'
    }
  }, action));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Toast.jsx", error: String((e && e.message) || e) }); }

// explorations/globe.js
try { (() => {
// Shared orthographic globe for direction previews (d3-geo + world-atlas).
window.renderGlobe = async function (el, o) {
  await new Promise(r => requestAnimationFrame(r));
  const visited = new Set([250, 380, 724, 620, 392, 504, 840, 124, 484, 604, 352, 300, 704, 764, 826, 276]);
  const wish = new Set([578, 32, 554, 404, 36, 360]);
  const pins = [[2.35, 48.86], [139.69, 35.68], [-9.14, 38.72], [-73.98, 40.75], [-71.97, -13.52]];
  let W = el.clientWidth || innerWidth,
    H = el.clientHeight || innerHeight;
  let R = Math.min(Math.max(W - 380, 240), H) * (o.scale || 0.42);
  let CX = W > 700 ? (W - 330) / 2 : W / 2;
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block').style('cursor', 'grab');
  const proj = d3.geoOrthographic().scale(R).translate([CX, H / 2]).rotate(o.rotate || [-10, -30]).clipAngle(90);
  const path = d3.geoPath(proj);
  const world = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')).json();
  const countries = topojson.feature(world, world.objects.countries).features;
  if (o.glow) svg.append('circle').attr('class', 'g').attr('cx', CX).attr('cy', H / 2).attr('r', R + 18).attr('fill', o.glow);
  const sphere = svg.append('path').datum({
    type: 'Sphere'
  }).attr('fill', o.ocean).attr('stroke', o.rim || 'none').attr('stroke-width', 1);
  const grat = svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke', o.grat || 'none').attr('stroke-width', 0.5);
  const land = svg.append('g').selectAll('path').data(countries).join('path').attr('fill', d => visited.has(+d.id) ? o.visited : wish.has(+d.id) ? o.wish : o.land).attr('stroke', o.stroke).attr('stroke-width', 0.5);
  const pinG = svg.append('g');
  function draw() {
    sphere.attr('d', path);
    grat.attr('d', path);
    land.attr('d', path);
    svg.select('.g').attr('r', proj.scale() + 18);
    const c = proj.invert([CX, H / 2]);
    pinG.selectAll('circle').data(pins).join('circle').attr('r', o.pinR || 3.5).attr('fill', o.pin).attr('stroke', o.pinStroke || 'none').attr('stroke-width', 1.5).attr('cx', d => proj(d)[0]).attr('cy', d => proj(d)[1]).attr('display', d => d3.geoDistance(d, c) < Math.PI / 2 ? null : 'none');
  }
  draw();
  let auto = true;
  svg.call(d3.drag().on('start', () => {
    auto = false;
    svg.style('cursor', 'grabbing');
  }).on('drag', e => {
    const r = proj.rotate(),
      k = 75 / proj.scale();
    proj.rotate([r[0] + e.dx * k, Math.max(-80, Math.min(80, r[1] - e.dy * k))]);
    draw();
  }).on('end', () => svg.style('cursor', 'grab')));
  svg.on('wheel', e => {
    e.preventDefault();
    proj.scale(Math.max(R * 0.6, Math.min(R * 4, proj.scale() * (e.deltaY < 0 ? 1.08 : 0.93))));
    draw();
  });
  new ResizeObserver(() => {
    const w = el.clientWidth,
      h = el.clientHeight;
    if (!w || !h || w === W && h === H) return;
    const k = proj.scale() / R;
    W = w;
    H = h;
    R = Math.min(Math.max(W - 380, 240), H) * (o.scale || 0.42);
    CX = W > 700 ? (W - 330) / 2 : W / 2;
    svg.attr('width', W).attr('height', H);
    svg.select('.g').attr('cx', CX).attr('cy', H / 2);
    proj.translate([CX, H / 2]).scale(R * k);
    draw();
  }).observe(el);
  d3.timer(() => {
    if (auto) {
      const r = proj.rotate();
      proj.rotate([r[0] + 0.08, r[1]]);
      draw();
    }
  });
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "explorations/globe.js", error: String((e && e.message) || e) }); }

// ui_kits/mobile/GlobeScreen.jsx
try { (() => {
const {
  Button,
  IconButton,
  Input,
  SegmentedControl,
  Switch,
  Checkbox,
  StatusBadge,
  FilterChip,
  PhotoTile,
  PlaceRow,
  Icon,
  BottomSheet,
  Dialog,
  Toast,
  TabBar,
  Globe
} = window.GlobeTrotterDesignSystem_93b564;
function GlobeScreen({
  app
}) {
  const D = window.GT_DATA,
    {
      visited,
      wish,
      filters,
      setFilters,
      level,
      setLevel,
      selected,
      select,
      selectRegion,
      focus,
      setFocus,
      regionStatus
    } = app;
  const regions = React.useMemo(() => {
    const o = {};
    Object.keys(window.GT_ISO3).forEach(id => {
      o[+id] = {
        load: () => window.gtLoadRegions(+id),
        ...(regionStatus[id] || {})
      };
    });
    return o;
  }, [regionStatus]);
  const box = React.useRef(null);
  const [h, setH] = React.useState(794);
  React.useEffect(() => {
    const ro = new ResizeObserver(() => box.current && setH(box.current.clientHeight));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const sheetFrac = selected ? selected.region ? .28 : .52 : 0,
    top = 96,
    globeC = top + (h - top) / 2,
    visC = (top + h * (1 - sheetFrac)) / 2,
    off = selected ? visC - globeC : 0;
  const t = k => () => setFilters({
    ...filters,
    [k]: !filters[k]
  });
  const unexplored = 177 - visited.length - wish.length;
  return /*#__PURE__*/React.createElement("div", {
    ref: box,
    style: {
      position: 'relative',
      height: '100%',
      background: 'var(--surface-page)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 96
    }
  }, /*#__PURE__*/React.createElement(Globe, {
    visited: visited,
    wish: wish,
    filters: filters,
    selected: selected && selected.id,
    focus: focus,
    offsetY: off,
    onSelect: select,
    onSelectPlace: app.openPlace,
    regions: regions,
    onSelectRegion: selectRegion,
    photos: app.prefs.photos ? D.photos : [],
    pins: D.pins,
    photoZoom: level === 'Villes' ? 1 : 1.9,
    initialRotate: [-10, -38],
    padding: .9
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 58,
      left: 'var(--screen-gutter)',
      right: 'var(--screen-gutter)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Input, {
    variant: "search",
    icon: "search",
    placeholder: "Rechercher un pays, une ville"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 'var(--screen-gutter)',
      bottom: selected ? 'calc(52% + 12px)' : 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'bottom var(--dur-slow) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "locate-fixed",
    label: "Recentrer",
    variant: "raised",
    onClick: () => setFocus({
      lon: 2.5,
      lat: 46.6,
      zoom: 1,
      t: Date.now()
    })
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "plus",
    label: "Zoomer",
    variant: "raised",
    onClick: () => setFocus({
      zoomBy: 1.6,
      t: Date.now()
    })
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "minus",
    label: "D\xE9zoomer",
    variant: "raised",
    onClick: () => setFocus({
      zoomBy: 1 / 1.6,
      t: Date.now()
    })
  })), !selected && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 'var(--screen-gutter)',
      bottom: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(FilterChip, {
    status: "visited",
    label: "Visit\xE9",
    count: visited.length,
    selected: filters.visited,
    onClick: t('visited')
  }), /*#__PURE__*/React.createElement(FilterChip, {
    status: "wish",
    label: "\xC0 visiter",
    count: wish.length,
    selected: filters.wish,
    onClick: t('wish')
  }), /*#__PURE__*/React.createElement(FilterChip, {
    status: "unexplored",
    label: "Non explor\xE9",
    count: unexplored,
    selected: filters.unexplored,
    onClick: t('unexplored')
  })), /*#__PURE__*/React.createElement(PlaceSheet, {
    app: app
  }));
}
window.GlobeScreen = GlobeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/GlobeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ListScreens.jsx
try { (() => {
const {
  Button,
  IconButton,
  Input,
  SegmentedControl,
  Switch,
  Checkbox,
  StatusBadge,
  FilterChip,
  PhotoTile,
  PlaceRow,
  Icon,
  BottomSheet,
  Dialog,
  Toast,
  TabBar,
  Globe
} = window.GlobeTrotterDesignSystem_93b564;
const gtTitle = {
  font: 'var(--weight-semibold) 28px/1.15 var(--font-sans)',
  letterSpacing: '-0.02em'
};
const gtOver = {
  font: 'var(--text-overline)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-overline)',
  color: 'var(--text-muted)',
  margin: '18px 0 2px'
};
function CarnetScreen({
  app
}) {
  const D = window.GT_DATA,
    groups = [...new Set(D.notes.map(n => n.country))];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflowY: 'auto',
      background: 'var(--surface-page)',
      padding: '62px var(--screen-gutter) 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: gtTitle
  }, "Carnet"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "plus",
    label: "Nouvelle note",
    variant: "outline"
  })), /*#__PURE__*/React.createElement(Input, {
    variant: "search",
    icon: "search",
    placeholder: "Rechercher dans vos notes"
  }), groups.map(g => {
    const ns = D.notes.filter(n => n.country === g);
    return /*#__PURE__*/React.createElement("div", {
      key: g
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...gtOver,
        margin: 0
      }
    }, D.names[g]), /*#__PURE__*/React.createElement(IconButton, {
      icon: "map-pin",
      label: 'Voir ' + D.names[g] + ' sur le globe',
      size: "sm",
      onClick: () => app.showPlace(g)
    })), ns.map((n, i) => /*#__PURE__*/React.createElement(PlaceRow, {
      key: n.place,
      name: n.place,
      meta: n.date,
      status: "visited",
      last: i === ns.length - 1,
      onClick: () => app.openNote(n)
    })));
  }));
}
function WishScreen({
  app
}) {
  const D = window.GT_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflowY: 'auto',
      background: 'var(--surface-page)',
      padding: '62px var(--screen-gutter) 24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: gtTitle
  }, "Envies"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--text-muted)',
      margin: '4px 0 10px'
    }
  }, app.wish.length, " destinations \xE9pingl\xE9es"), app.wish.map((id, i) => /*#__PURE__*/React.createElement(PlaceRow, {
    key: id,
    name: D.names[id],
    meta: D.details[id] && D.details[id].note || 'Épinglé',
    status: "wish",
    last: i === app.wish.length - 1,
    onClick: () => app.showOnGlobe(id)
  })));
}
function ProfileScreen({
  app
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflowY: 'auto',
      background: 'var(--surface-page)',
      padding: '62px var(--screen-gutter) 24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: gtTitle
  }, "Profil"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--text-muted)',
      margin: '4px 0 18px'
    }
  }, app.visited.length, " pays visit\xE9s \xB7 ", app.wish.length, " envies"), /*#__PURE__*/React.createElement("div", {
    style: gtOver
  }, "Globe"), /*#__PURE__*/React.createElement(Switch, {
    label: "Photos sur le globe",
    checked: app.prefs.photos,
    onChange: v => app.setPrefs({
      ...app.prefs,
      photos: v
    })
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Rotation automatique",
    checked: app.prefs.rotate,
    onChange: v => app.setPrefs({
      ...app.prefs,
      rotate: v
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: gtOver
  }, "Donn\xE9es"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "download",
    fullWidth: true
  }, "Exporter mes voyages")));
}
Object.assign(window, {
  CarnetScreen,
  WishScreen,
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ListScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/NoteScreen.jsx
try { (() => {
const {
  Button,
  IconButton,
  Input,
  SegmentedControl,
  Switch,
  Checkbox,
  StatusBadge,
  FilterChip,
  PhotoTile,
  PlaceRow,
  Icon,
  BottomSheet,
  Dialog,
  Toast,
  TabBar,
  Globe
} = window.GlobeTrotterDesignSystem_93b564;
function NoteScreen({
  app
}) {
  const D = window.GT_DATA,
    {
      note,
      closeNote,
      deletePlace,
      showPlace
    } = app,
    d = D.details[note.country] || {};
  const [todo, setTodo] = React.useState(d.todo || []);
  const [confirm, setConfirm] = React.useState(false);
  const country = D.names[note.country];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      background: 'var(--surface-page)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '54px 12px 4px'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-left",
    label: "Retour",
    onClick: closeNote
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "share",
    label: "Partager"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash-2",
    label: "Supprimer",
    onClick: () => setConfirm(true)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 var(--screen-gutter) 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, country !== note.place && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-overline)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-overline)',
      color: 'var(--text-muted)'
    }
  }, country), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-display-xl)',
      letterSpacing: 'var(--tracking-display)'
    }
  }, note.place), /*#__PURE__*/React.createElement("button", {
    onClick: () => showPlace(note.country, note.place),
    style: {
      alignSelf: 'flex-start',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minHeight: 32,
      padding: '0 10px 0 8px',
      marginLeft: -8,
      border: 0,
      borderRadius: 'var(--radius-pill)',
      background: 'transparent',
      cursor: 'pointer',
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--paper-2)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 14,
    color: "var(--accent)"
  }), d.date || 'Épinglé', d.coords ? ' · ' + d.coords : '')), /*#__PURE__*/React.createElement(PhotoTile, {
    label: 'Photo — ' + note.place,
    ratio: "4/3"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Note",
    multiline: true,
    rows: 4,
    defaultValue: d.note || '',
    placeholder: "Ce que vous voulez retenir\u2026"
  }), todo.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-secondary)',
      marginBottom: 2
    }
  }, "\xC0 faire"), todo.map(([l, c], i) => /*#__PURE__*/React.createElement(Checkbox, {
    key: l,
    label: l,
    checked: c,
    onChange: v => setTodo(todo.map((t, j) => j === i ? [t[0], v] : t))
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-secondary)'
    }
  }, "Photos"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "camera"
  }, "Ajouter")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 4
    }
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement(PhotoTile, {
    key: i,
    label: "",
    ratio: "1/1",
    radius: "var(--radius-xs)"
  }))))), /*#__PURE__*/React.createElement(Dialog, {
    open: confirm,
    title: 'Supprimer ' + note.place + ' ?',
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setConfirm(false)
    }, "Annuler"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => {
        setConfirm(false);
        deletePlace(note);
      }
    }, "Supprimer"))
  }, "Les photos et les notes de ce lieu seront supprim\xE9es."));
}
window.NoteScreen = NoteScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/NoteScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/PlaceSheet.jsx
try { (() => {
const {
  Button,
  IconButton,
  Input,
  SegmentedControl,
  Switch,
  Checkbox,
  StatusBadge,
  FilterChip,
  PhotoTile,
  PlaceRow,
  Icon,
  BottomSheet,
  Dialog,
  Toast,
  TabBar,
  Globe
} = window.GlobeTrotterDesignSystem_93b564;
function PlaceSheet({
  app
}) {
  const D = window.GT_DATA,
    {
      selected,
      select,
      visited,
      wish,
      markVisited,
      toggleWish,
      openNote,
      level,
      regionStatus,
      markRegion
    } = app;
  const [snap, setSnap] = React.useState('half');
  React.useEffect(() => setSnap(selected && selected.region ? 'peek' : 'half'), [selected && selected.id, selected && selected.region && selected.region.name]);
  const c = selected,
    id = c && c.id,
    d = c && D.details[id] || {};
  const rg = c && c.region,
    rs = c && regionStatus[id] || {
      visited: [],
      wish: []
    };
  const status = rg ? rs.visited.includes(rg.name) ? 'visited' : rs.wish.includes(rg.name) ? 'wish' : 'unexplored' : c ? visited.includes(id) ? 'visited' : wish.includes(id) ? 'wish' : 'unexplored' : 'unexplored';
  const country = c ? D.names[id] || window.GT_NAMES_FR[id] || c.name : '',
    name = rg ? rg.name : country;
  const regList = [...rs.visited.map(n => ({
    name: n,
    meta: 'Visitée'
  })), ...rs.wish.map(n => ({
    name: n,
    meta: 'Épinglée',
    status: 'wish'
  }))];
  const list = level === 'Régions' ? regList : d.cities;
  return /*#__PURE__*/React.createElement(BottomSheet, {
    open: !!c,
    snap: snap,
    onSnap: setSnap,
    header: c && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, (rg || d.region) && /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--text-overline)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-overline)',
        color: 'var(--text-muted)'
      }
    }, rg ? country : d.region), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--text-display-l)',
        letterSpacing: 'var(--tracking-display)'
      }
    }, name)), /*#__PURE__*/React.createElement(IconButton, {
      icon: "x",
      label: "Fermer",
      variant: "outline",
      size: "sm",
      onClick: () => select(null)
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(StatusBadge, {
      status: status
    }), !rg && d.date && /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--text-caption)',
        color: 'var(--text-muted)'
      }
    }, d.date), !rg && d.coords && /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--text-caption)',
        color: 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, d.coords)))
  }, c && rg && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, status === 'visited' ? /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "notebook-pen",
    fullWidth: true,
    onClick: () => openNote({
      country: id,
      place: rg.name
    })
  }, "Ouvrir le carnet") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    icon: "check",
    onClick: () => markRegion(id, rg.name, 'visited'),
    style: {
      flex: 1
    }
  }, "Marquer visit\xE9e"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: status === 'wish' ? 'bookmark-minus' : 'bookmark',
    onClick: () => markRegion(id, rg.name, status === 'wish' ? 'none' : 'wish'),
    style: {
      flex: 1
    }
  }, status === 'wish' ? 'Retirer' : 'À visiter'))), c && !rg && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, status === 'visited' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PhotoTile, {
    label: 'Photo — ' + (d.cities ? d.cities[0].name : name),
    ratio: "16/10"
  }), d.note && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'italic 400 20px/1.3 var(--font-display)',
      textWrap: 'pretty'
    }
  }, "\xAB ", d.note, " \xBB"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "notebook-pen",
    fullWidth: true,
    onClick: () => openNote({
      country: id,
      place: name
    })
  }, "Ouvrir le carnet")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    icon: "check",
    onClick: () => markVisited(id, name),
    style: {
      flex: 1
    }
  }, "Marquer visit\xE9"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: status === 'wish' ? 'bookmark-minus' : 'bookmark',
    onClick: () => toggleWish(id, name),
    style: {
      flex: 1
    }
  }, status === 'wish' ? 'Retirer' : 'À visiter')), status === 'wish' && d.note && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'italic 400 20px/1.3 var(--font-display)'
    }
  }, "\xAB ", d.note, " \xBB"), list && list.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-overline)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-overline)',
      color: 'var(--text-muted)',
      marginBottom: 4
    }
  }, level === 'Régions' ? 'Régions' : 'Villes'), list.map((x, i) => /*#__PURE__*/React.createElement(PlaceRow, {
    key: x.name,
    name: x.name,
    meta: x.meta,
    status: x.status || 'visited',
    last: i === list.length - 1,
    onClick: () => level === 'Régions' ? select({
      ...c,
      region: {
        name: x.name
      }
    }, true) : openNote({
      country: id,
      place: x.name
    })
  }))), !d.region && status === 'unexplored' && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--text-body-s)',
      color: 'var(--text-muted)'
    }
  }, "Aucune note pour ce pays.")));
}
window.PlaceSheet = PlaceSheet;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/PlaceSheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/countries.js
try { (() => {
window.GT_ISO3 = {
  "4": "AFG",
  "8": "ALB",
  "10": "ATA",
  "12": "DZA",
  "16": "ASM",
  "20": "AND",
  "24": "AGO",
  "28": "ATG",
  "31": "AZE",
  "32": "ARG",
  "36": "AUS",
  "40": "AUT",
  "44": "BHS",
  "48": "BHR",
  "50": "BGD",
  "51": "ARM",
  "52": "BRB",
  "56": "BEL",
  "60": "BMU",
  "64": "BTN",
  "68": "BOL",
  "70": "BIH",
  "72": "BWA",
  "74": "BVT",
  "76": "BRA",
  "84": "BLZ",
  "86": "IOT",
  "90": "SLB",
  "92": "VGB",
  "96": "BRN",
  "100": "BGR",
  "104": "MMR",
  "108": "BDI",
  "112": "BLR",
  "116": "KHM",
  "120": "CMR",
  "124": "CAN",
  "132": "CPV",
  "136": "CYM",
  "140": "CAF",
  "144": "LKA",
  "148": "TCD",
  "152": "CHL",
  "156": "CHN",
  "158": "TWN",
  "162": "CXR",
  "166": "CCK",
  "170": "COL",
  "174": "COM",
  "175": "MYT",
  "178": "COG",
  "180": "COD",
  "184": "COK",
  "188": "CRI",
  "191": "HRV",
  "192": "CUB",
  "196": "CYP",
  "203": "CZE",
  "204": "BEN",
  "208": "DNK",
  "212": "DMA",
  "214": "DOM",
  "218": "ECU",
  "222": "SLV",
  "226": "GNQ",
  "231": "ETH",
  "232": "ERI",
  "233": "EST",
  "234": "FRO",
  "238": "FLK",
  "239": "SGS",
  "242": "FJI",
  "246": "FIN",
  "248": "ALA",
  "250": "FRA",
  "254": "GUF",
  "258": "PYF",
  "260": "ATF",
  "262": "DJI",
  "266": "GAB",
  "268": "GEO",
  "270": "GMB",
  "275": "PSE",
  "276": "DEU",
  "288": "GHA",
  "292": "GIB",
  "296": "KIR",
  "300": "GRC",
  "304": "GRL",
  "308": "GRD",
  "312": "GLP",
  "316": "GUM",
  "320": "GTM",
  "324": "GIN",
  "328": "GUY",
  "332": "HTI",
  "334": "HMD",
  "336": "VAT",
  "340": "HND",
  "344": "HKG",
  "348": "HUN",
  "352": "ISL",
  "356": "IND",
  "360": "IDN",
  "364": "IRN",
  "368": "IRQ",
  "372": "IRL",
  "376": "ISR",
  "380": "ITA",
  "384": "CIV",
  "388": "JAM",
  "392": "JPN",
  "398": "KAZ",
  "400": "JOR",
  "404": "KEN",
  "408": "PRK",
  "410": "KOR",
  "414": "KWT",
  "417": "KGZ",
  "418": "LAO",
  "422": "LBN",
  "426": "LSO",
  "428": "LVA",
  "430": "LBR",
  "434": "LBY",
  "438": "LIE",
  "440": "LTU",
  "442": "LUX",
  "446": "MAC",
  "450": "MDG",
  "454": "MWI",
  "458": "MYS",
  "462": "MDV",
  "466": "MLI",
  "470": "MLT",
  "474": "MTQ",
  "478": "MRT",
  "480": "MUS",
  "484": "MEX",
  "492": "MCO",
  "496": "MNG",
  "498": "MDA",
  "499": "MNE",
  "500": "MSR",
  "504": "MAR",
  "508": "MOZ",
  "512": "OMN",
  "516": "NAM",
  "520": "NRU",
  "524": "NPL",
  "528": "NLD",
  "531": "CUW",
  "533": "ABW",
  "534": "SXM",
  "535": "BES",
  "540": "NCL",
  "548": "VUT",
  "554": "NZL",
  "558": "NIC",
  "562": "NER",
  "566": "NGA",
  "570": "NIU",
  "574": "NFK",
  "578": "NOR",
  "580": "MNP",
  "581": "UMI",
  "583": "FSM",
  "584": "MHL",
  "585": "PLW",
  "586": "PAK",
  "591": "PAN",
  "598": "PNG",
  "600": "PRY",
  "604": "PER",
  "608": "PHL",
  "612": "PCN",
  "616": "POL",
  "620": "PRT",
  "624": "GNB",
  "626": "TLS",
  "630": "PRI",
  "634": "QAT",
  "638": "REU",
  "642": "ROU",
  "643": "RUS",
  "646": "RWA",
  "652": "BLM",
  "654": "SHN",
  "659": "KNA",
  "660": "AIA",
  "662": "LCA",
  "663": "MAF",
  "666": "SPM",
  "670": "VCT",
  "674": "SMR",
  "678": "STP",
  "682": "SAU",
  "686": "SEN",
  "688": "SRB",
  "690": "SYC",
  "694": "SLE",
  "702": "SGP",
  "703": "SVK",
  "704": "VNM",
  "705": "SVN",
  "706": "SOM",
  "710": "ZAF",
  "716": "ZWE",
  "724": "ESP",
  "728": "SSD",
  "729": "SDN",
  "732": "ESH",
  "740": "SUR",
  "744": "SJM",
  "748": "SWZ",
  "752": "SWE",
  "756": "CHE",
  "760": "SYR",
  "762": "TJK",
  "764": "THA",
  "768": "TGO",
  "772": "TKL",
  "776": "TON",
  "780": "TTO",
  "784": "ARE",
  "788": "TUN",
  "792": "TUR",
  "795": "TKM",
  "796": "TCA",
  "798": "TUV",
  "800": "UGA",
  "804": "UKR",
  "807": "MKD",
  "818": "EGY",
  "826": "GBR",
  "831": "GGY",
  "832": "JEY",
  "833": "IMN",
  "834": "TZA",
  "840": "USA",
  "850": "VIR",
  "854": "BFA",
  "858": "URY",
  "860": "UZB",
  "862": "VEN",
  "876": "WLF",
  "882": "WSM",
  "887": "YEM",
  "894": "ZMB"
};
window.GT_NAMES_FR = {
  "4": "Afghanistan",
  "8": "Albanie",
  "10": "Antarctique",
  "12": "Algérie",
  "16": "Samoa américaines",
  "20": "Andorre",
  "24": "Angola",
  "28": "Antigua-et-Barbuda",
  "31": "Azerbaïdjan",
  "32": "Argentine",
  "36": "Australie",
  "40": "Autriche",
  "44": "Bahamas",
  "48": "Bahreïn",
  "50": "Bangladesh",
  "51": "Arménie",
  "52": "Barbade",
  "56": "Belgique",
  "60": "Bermudes",
  "64": "Bhoutan",
  "68": "Bolivie",
  "70": "Bosnie-Herzégovine",
  "72": "Botswana",
  "74": "Île Bouvet",
  "76": "Brésil",
  "84": "Belize",
  "86": "Territoire britannique de l'océan Indien",
  "90": "Îles Salomon",
  "92": "Îles Vierges britanniques",
  "96": "Brunei",
  "100": "Bulgarie",
  "104": "Birmanie",
  "108": "Burundi",
  "112": "Biélorussie",
  "116": "Cambodge",
  "120": "Cameroun",
  "124": "Canada",
  "132": "Îles du Cap-Vert",
  "136": "Îles Caïmans",
  "140": "République centrafricaine",
  "144": "Sri Lanka",
  "148": "Tchad",
  "152": "Chili",
  "156": "Chine",
  "158": "Taïwan",
  "162": "Île Christmas",
  "166": "Îles Cocos",
  "170": "Colombie",
  "174": "Comores",
  "175": "Mayotte",
  "178": "Congo",
  "180": "Congo (Rép. dém.)",
  "184": "Îles Cook",
  "188": "Costa Rica",
  "191": "Croatie",
  "192": "Cuba",
  "196": "Chypre",
  "203": "Tchéquie",
  "204": "Bénin",
  "208": "Danemark",
  "212": "Dominique",
  "214": "République dominicaine",
  "218": "Équateur",
  "222": "Salvador",
  "226": "Guinée équatoriale",
  "231": "Éthiopie",
  "232": "Érythrée",
  "233": "Estonie",
  "234": "Îles Féroé",
  "238": "Îles Malouines",
  "239": "Géorgie du Sud-et-les Îles Sandwich du Sud",
  "242": "Fidji",
  "246": "Finlande",
  "248": "Ahvenanmaa",
  "250": "France",
  "254": "Guyane",
  "258": "Polynésie française",
  "260": "Terres australes et antarctiques françaises",
  "262": "Djibouti",
  "266": "Gabon",
  "268": "Géorgie",
  "270": "Gambie",
  "275": "Palestine",
  "276": "Allemagne",
  "288": "Ghana",
  "292": "Gibraltar",
  "296": "Kiribati",
  "300": "Grèce",
  "304": "Groenland",
  "308": "Grenade",
  "312": "Guadeloupe",
  "316": "Guam",
  "320": "Guatemala",
  "324": "Guinée",
  "328": "Guyana",
  "332": "Haïti",
  "334": "Îles Heard-et-MacDonald",
  "336": "Cité du Vatican",
  "340": "Honduras",
  "344": "Hong Kong",
  "348": "Hongrie",
  "352": "Islande",
  "356": "Inde",
  "360": "Indonésie",
  "364": "Iran",
  "368": "Irak",
  "372": "Irlande",
  "376": "Israël",
  "380": "Italie",
  "384": "Côte d'Ivoire",
  "388": "Jamaïque",
  "392": "Japon",
  "398": "Kazakhstan",
  "400": "Jordanie",
  "404": "Kenya",
  "408": "Corée du Nord",
  "410": "Corée du Sud",
  "414": "Koweït",
  "417": "Kirghizistan",
  "418": "Laos",
  "422": "Liban",
  "426": "Lesotho",
  "428": "Lettonie",
  "430": "Liberia",
  "434": "Libye",
  "438": "Liechtenstein",
  "440": "Lituanie",
  "442": "Luxembourg",
  "446": "Macao",
  "450": "Madagascar",
  "454": "Malawi",
  "458": "Malaisie",
  "462": "Maldives",
  "466": "Mali",
  "470": "Malte",
  "474": "Martinique",
  "478": "Mauritanie",
  "480": "Île Maurice",
  "484": "Mexique",
  "492": "Monaco",
  "496": "Mongolie",
  "498": "Moldavie",
  "499": "Monténégro",
  "500": "Montserrat",
  "504": "Maroc",
  "508": "Mozambique",
  "512": "Oman",
  "516": "Namibie",
  "520": "Nauru",
  "524": "Népal",
  "528": "Pays-Bas",
  "531": "Curaçao",
  "533": "Aruba",
  "534": "Saint-Martin",
  "535": "Pays-Bas caribéens",
  "540": "Nouvelle-Calédonie",
  "548": "Vanuatu",
  "554": "Nouvelle-Zélande",
  "558": "Nicaragua",
  "562": "Niger",
  "566": "Nigéria",
  "570": "Niue",
  "574": "Île Norfolk",
  "578": "Norvège",
  "580": "Îles Mariannes du Nord",
  "581": "Îles mineures éloignées des États-Unis",
  "583": "Micronésie",
  "584": "Îles Marshall",
  "585": "Palaos (Palau)",
  "586": "Pakistan",
  "591": "Panama",
  "598": "Papouasie-Nouvelle-Guinée",
  "600": "Paraguay",
  "604": "Pérou",
  "608": "Philippines",
  "612": "Îles Pitcairn",
  "616": "Pologne",
  "620": "Portugal",
  "624": "Guinée-Bissau",
  "626": "Timor oriental",
  "630": "Porto Rico",
  "634": "Qatar",
  "638": "Réunion",
  "642": "Roumanie",
  "643": "Russie",
  "646": "Rwanda",
  "652": "Saint-Barthélemy",
  "654": "Sainte-Hélène, Ascension et Tristan da Cunha",
  "659": "Saint-Christophe-et-Niévès",
  "660": "Anguilla",
  "662": "Sainte-Lucie",
  "663": "Saint-Martin",
  "666": "Saint-Pierre-et-Miquelon",
  "670": "Saint-Vincent-et-les-Grenadines",
  "674": "Saint-Marin",
  "678": "São Tomé et Príncipe",
  "682": "Arabie Saoudite",
  "686": "Sénégal",
  "688": "Serbie",
  "690": "Seychelles",
  "694": "Sierra Leone",
  "702": "Singapour",
  "703": "Slovaquie",
  "704": "Viêt Nam",
  "705": "Slovénie",
  "706": "Somalie",
  "710": "Afrique du Sud",
  "716": "Zimbabwe",
  "724": "Espagne",
  "728": "Soudan du Sud",
  "729": "Soudan",
  "732": "Sahara Occidental",
  "740": "Surinam",
  "744": "Svalbard et Jan Mayen",
  "748": "Swaziland",
  "752": "Suède",
  "756": "Suisse",
  "760": "Syrie",
  "762": "Tadjikistan",
  "764": "Thaïlande",
  "768": "Togo",
  "772": "Tokelau",
  "776": "Tonga",
  "780": "Trinité-et-Tobago",
  "784": "Émirats arabes unis",
  "788": "Tunisie",
  "792": "Turquie",
  "795": "Turkménistan",
  "796": "Îles Turques-et-Caïques",
  "798": "Tuvalu",
  "800": "Ouganda",
  "804": "Ukraine",
  "807": "Macédoine du Nord",
  "818": "Égypte",
  "826": "Royaume-Uni",
  "831": "Guernesey",
  "832": "Jersey",
  "833": "Île de Man",
  "834": "Tanzanie",
  "840": "États-Unis",
  "850": "Îles Vierges des États-Unis",
  "854": "Burkina Faso",
  "858": "Uruguay",
  "860": "Ouzbékistan",
  "862": "Venezuela",
  "876": "Wallis-et-Futuna",
  "882": "Samoa",
  "887": "Yémen",
  "894": "Zambie"
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/countries.js", error: String((e && e.message) || e) }); }

// ui_kits/mobile/data.js
try { (() => {
window.GT_DATA = {
  visited: [250, 380, 724, 620, 392, 504, 840, 124, 484, 604, 352, 300, 704, 764, 826, 276],
  wish: [578, 32, 554, 404, 36, 360],
  names: {
    250: 'France',
    380: 'Italie',
    724: 'Espagne',
    620: 'Portugal',
    392: 'Japon',
    504: 'Maroc',
    840: 'États-Unis',
    124: 'Canada',
    484: 'Mexique',
    604: 'Pérou',
    352: 'Islande',
    300: 'Grèce',
    704: 'Vietnam',
    764: 'Thaïlande',
    826: 'Royaume-Uni',
    276: 'Allemagne',
    578: 'Norvège',
    32: 'Argentine',
    554: 'Nouvelle-Zélande',
    404: 'Kenya',
    36: 'Australie',
    360: 'Indonésie',
    156: 'Chine',
    76: 'Brésil',
    356: 'Inde',
    643: 'Russie',
    710: 'Afrique du Sud',
    818: 'Égypte',
    152: 'Chili',
    756: 'Suisse'
  },
  centroids: {
    250: [2.5, 46.6],
    380: [12.6, 42.8],
    724: [-3.7, 40.2],
    620: [-8.2, 39.6],
    392: [138.3, 36.2],
    504: [-6.9, 31.8],
    840: [-98.6, 39.8],
    124: [-106, 56],
    484: [-102.5, 23.6],
    604: [-75, -9.2],
    352: [-19, 65],
    300: [22, 39],
    704: [106, 16],
    764: [101, 15.8],
    826: [-2, 54],
    276: [10.4, 51.2],
    578: [8.5, 61],
    32: [-64, -34],
    554: [172, -41.5],
    404: [37.9, 0.2],
    36: [134, -25.7],
    360: [118, -2.5]
  },
  details: {
    392: {
      region: 'Asie de l’Est',
      coords: '36.20° N · 138.25° E',
      date: 'Avril 2024',
      note: 'Les cerisiers étaient en fleurs à Kyoto. Retourner à Naoshima, prendre le ferry tôt le matin.',
      cities: [{
        name: 'Kyoto',
        meta: 'Avril 2024 · 3 notes'
      }, {
        name: 'Tokyo',
        meta: 'Avril 2024 · 1 note'
      }, {
        name: 'Naoshima',
        meta: 'Avril 2024'
      }, {
        name: 'Osaka',
        meta: 'Avril 2024'
      }],
      regions: [{
        name: 'Kansai',
        meta: '3 villes'
      }, {
        name: 'Kantō',
        meta: '1 ville'
      }, {
        name: 'Hokkaidō',
        meta: 'Épinglé',
        status: 'wish'
      }],
      todo: [['Réserver le ryokan à Hakone', true], ['Voir le Fushimi Inari à l’aube', true], ['Aller à Hokkaidō en hiver', false]]
    },
    620: {
      region: 'Europe du Sud',
      coords: '39.40° N · 8.22° O',
      date: 'Septembre 2023',
      note: 'Lisbonne au coucher du soleil depuis le miradouro da Graça. Porto pour le vin et le pont Dom-Luís.',
      cities: [{
        name: 'Lisbonne',
        meta: 'Sept. 2023 · 2 notes'
      }, {
        name: 'Porto',
        meta: 'Sept. 2023'
      }, {
        name: 'Sintra',
        meta: 'Sept. 2023'
      }],
      regions: [{
        name: 'Lisbonne',
        meta: '2 villes'
      }, {
        name: 'Nord',
        meta: '1 ville'
      }, {
        name: 'Algarve',
        meta: 'Épinglé',
        status: 'wish'
      }],
      todo: [['Prendre le tram 28', true], ['Faire la côte de l’Algarve', false]]
    },
    380: {
      region: 'Europe du Sud',
      coords: '41.87° N · 12.57° E',
      date: 'Juin 2022',
      note: 'Florence en juin, trop chaud l’après-midi. Partir tôt pour les Offices.',
      cities: [{
        name: 'Rome',
        meta: 'Juin 2022 · 1 note'
      }, {
        name: 'Florence',
        meta: 'Juin 2022 · 2 notes'
      }, {
        name: 'Sienne',
        meta: 'Juin 2022'
      }],
      regions: [{
        name: 'Toscane',
        meta: '2 villes'
      }, {
        name: 'Latium',
        meta: '1 ville'
      }, {
        name: 'Sicile',
        meta: 'Épinglé',
        status: 'wish'
      }],
      todo: [['Dîner à Trastevere', true]]
    },
    578: {
      region: 'Europe du Nord',
      coords: '60.47° N · 8.47° E',
      note: 'Les fjords en été, puis les Lofoten. Prévoir 10 jours.',
      cities: [{
        name: 'Bergen',
        meta: 'Épinglé',
        status: 'wish'
      }, {
        name: 'Lofoten',
        meta: 'Épinglé',
        status: 'wish'
      }],
      regions: [],
      todo: [['Trouver un vol pour Bergen', false]]
    },
    554: {
      region: 'Océanie',
      coords: '40.90° S · 174.89° E',
      note: 'Île du Sud en van.',
      cities: [{
        name: 'Queenstown',
        meta: 'Épinglé',
        status: 'wish'
      }],
      regions: [],
      todo: []
    }
  },
  photos: [{
    lon: 135.77,
    lat: 35.01,
    label: 'Kyoto',
    country: 392
  }, {
    lon: 139.69,
    lat: 35.68,
    label: 'Tokyo',
    country: 392
  }, {
    lon: -9.14,
    lat: 38.72,
    label: 'Lisbonne',
    country: 620
  }, {
    lon: -8.61,
    lat: 41.15,
    label: 'Porto',
    country: 620
  }, {
    lon: 12.5,
    lat: 41.9,
    label: 'Rome',
    country: 380
  }, {
    lon: 11.25,
    lat: 43.77,
    label: 'Florence',
    country: 380
  }, {
    lon: 2.35,
    lat: 48.86,
    label: 'Paris',
    country: 250
  }, {
    lon: -7.99,
    lat: 31.63,
    label: 'Marrakech',
    country: 504
  }, {
    lon: -21.9,
    lat: 64.15,
    label: 'Reykjavik',
    country: 352
  }, {
    lon: -71.97,
    lat: -13.52,
    label: 'Cusco',
    country: 604
  }, {
    lon: -73.98,
    lat: 40.75,
    label: 'New York',
    country: 840
  }, {
    lon: 105.85,
    lat: 21.03,
    label: 'Hanoï',
    country: 704
  }],
  pins: [{
    lon: 5.32,
    lat: 60.39,
    label: 'Bergen',
    country: 578
  }, {
    lon: 168.66,
    lat: -45.03,
    label: 'Queenstown',
    country: 554
  }, {
    lon: -58.38,
    lat: -34.6,
    label: 'Buenos Aires',
    country: 32
  }, {
    lon: 36.82,
    lat: -1.29,
    label: 'Nairobi',
    country: 404
  }],
  regionFiles: {
    250: 'FRA',
    380: 'ITA',
    724: 'ESP',
    620: 'PRT',
    392: 'JPN',
    504: 'MAR',
    840: 'USA',
    124: 'CAN',
    484: 'MEX',
    604: 'PER',
    352: 'ISL',
    300: 'GRC',
    704: 'VNM',
    764: 'THA',
    826: 'GBR',
    276: 'DEU',
    578: 'NOR',
    32: 'ARG',
    554: 'NZL',
    404: 'KEN',
    36: 'AUS',
    360: 'IDN'
  },
  regionStatus: {
    392: {
      visited: ['Kyoto', 'Tokyo', 'Kagawa', 'Osaka'],
      wish: ['Hokkaido']
    },
    250: {
      visited: ['Île-de-France', 'Bretagne', "Provence-Alpes-Côte d'Azur", 'Auvergne-Rhône-Alpes', 'Occitanie', 'Nouvelle-Aquitaine'],
      wish: ['Corse']
    },
    380: {
      visited: ['Lazio', 'Toscana'],
      wish: ['Sicilia']
    },
    620: {
      visited: ['Lisboa', 'Porto'],
      wish: ['Faro']
    },
    724: {
      visited: ['Cataluña/Catalunya', 'Comunidad de Madrid', 'Andalucía'],
      wish: ['Illes Balears']
    },
    840: {
      visited: ['New York', 'California', 'Massachusetts'],
      wish: ['Alaska']
    },
    124: {
      visited: ['Quebec', 'British Columbia'],
      wish: ['Yukon']
    },
    504: {
      visited: ['Marrakech-Safi', 'Fez-Meknes'],
      wish: []
    },
    352: {
      visited: ['Capital', 'Southern'],
      wish: ['Westfjords']
    },
    484: {
      visited: ['Yucatan', 'Quintana Roo'],
      wish: ['Oaxaca']
    },
    604: {
      visited: ['Cusco', 'Lima'],
      wish: ['Arequipa']
    },
    300: {
      visited: ['Attica', 'Egean'],
      wish: ['Crete']
    },
    704: {
      visited: ['Hà Nội', 'Ho Chi Minh'],
      wish: []
    },
    764: {
      visited: ['Bangkok', 'Chiang Mai'],
      wish: []
    },
    826: {
      visited: ['England', 'Scotland'],
      wish: []
    },
    276: {
      visited: ['Berlin', 'Bayern'],
      wish: []
    },
    578: {
      visited: [],
      wish: ['Vestland', 'Nordland']
    },
    554: {
      visited: [],
      wish: ['Otago', 'Canterbury']
    },
    36: {
      visited: [],
      wish: ['Victoria', 'Tasmania']
    }
  },
  notes: [{
    country: 392,
    place: 'Kyoto',
    date: '12 avril 2024'
  }, {
    country: 392,
    place: 'Tokyo',
    date: '8 avril 2024'
  }, {
    country: 620,
    place: 'Lisbonne',
    date: '21 sept. 2023'
  }, {
    country: 380,
    place: 'Florence',
    date: '14 juin 2022'
  }, {
    country: 380,
    place: 'Rome',
    date: '10 juin 2022'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/data.js", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      "data-om-starter": "ios-frame",
      style: {
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 126,
        height: 37,
        borderRadius: 24,
        background: '#000',
        zIndex: 50
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(IOSStatusBar, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
      title: title,
      dark: dark
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 34,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 8,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 139,
        height: 5,
        borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
      }
    })))
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/regions-loader.js
try { (() => {
// Region boundaries: local simplified file if present, else geoBoundaries ADM1 (ODbL) fetched and simplified on the fly.
(function () {
  const cache = {};
  const thin = (r, tol) => {
    const o = [r[0]];
    for (let i = 1; i < r.length - 1; i++) {
      const p = o[o.length - 1],
        q = r[i];
      if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) > tol) o.push(q);
    }
    o.push(r[r.length - 1]);
    return o;
  };
  const area = r => {
    let a = 0;
    for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    return a / 2;
  };
  const fix = (poly, tol) => {
    const out = [];
    poly.forEach((ring, i) => {
      let r = thin(ring, tol);
      if (r.length < 4) return;
      const a = area(r);
      if (i === 0 ? a > 0 : a < 0) r = r.reverse();
      out.push(r);
    });
    return out.length ? out : null;
  };
  const clean = s => String(s || '').replace(/\t/g, '').replace(/ (Prefecture|Province|Region|Governorate|Oblast|State|Department)$/, '').trim();
  async function remote(iso3) {
    const m = await (await fetch('https://www.geoboundaries.org/api/current/gbOpen/' + iso3 + '/ADM1/')).json();
    const u = m.simplifiedGeometryGeoJSON.replace('https://github.com/wmgeolab/geoBoundaries/raw/', 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/');
    const g = await (await fetch(u)).json();
    let n = 0;
    g.features.forEach(f => {
      const c = f.geometry && f.geometry.coordinates;
      if (c) n += JSON.stringify(c).length;
    });
    const tol = n > 4e6 ? .15 : n > 1.5e6 ? .08 : .04;
    const feats = [];
    g.features.forEach(f => {
      if (!f.geometry) return;
      let ps = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      ps = ps.map(p => fix(p, tol)).filter(Boolean);
      if (ps.length) feats.push({
        type: 'Feature',
        properties: {
          name: clean(f.properties.shapeName)
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: ps
        }
      });
    });
    return feats;
  }
  window.gtLoadRegions = function (id) {
    if (cache[id]) return cache[id];
    const D = window.GT_DATA,
      iso3 = window.GT_ISO3[id];
    cache[id] = D.regionFiles[id] ? fetch('../../assets/regions/' + D.regionFiles[id] + '.json').then(r => r.json()).then(j => j.features) : iso3 ? remote(iso3).catch(e => {
      console.warn('Régions indisponibles pour', iso3, e);
      return [];
    }) : Promise.resolve([]);
    return cache[id];
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/regions-loader.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.PhotoTile = __ds_scope.PhotoTile;

__ds_ns.PlaceRow = __ds_scope.PlaceRow;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Globe = __ds_scope.Globe;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

})();
