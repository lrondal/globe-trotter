# Globe trotter — Design System

Globe trotter is a mobile app (iOS first, light theme) for keeping a record of the places you have visited around the world. Its main view is a 3D globe you can rotate and zoom, with countries colored by status: **visité**, **à visiter**, **non exploré**. Each country, region and city can hold a photo and a travel note, and you can pin places you want to visit ("Envies"). The brief asks for an interface that stays minimal, clean and clear.

**Sources:** a written brief from the founder (in French). There was no codebase, Figma file, logo or existing brand. The visual direction "Papier" was picked from three explorations (`explorations/`: A Papier, B Nuit, C Atlas). Everything here was designed from scratch.

## Index
- `styles.css`: entry point (imports only) → `tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`
- `assets/regions/`: region boundaries for 22 countries (geoBoundaries, ODbL licence)
- `fonts/`: Instrument Serif (regular and italic) and Hanken Grotesk (400/500/600), woff2, Latin subset
- `guidelines/`: foundation cards (Colors, Type, Spacing, Brand)
- `components/`: React primitives (see below)
- `ui_kits/mobile/`: interactive iOS click-through (`index.html`)
- `explorations/`: the three original direction studies (for reference)
- `SKILL.md`

## Components
- **actions/**: Button, IconButton
- **forms/**: Input (default, search, multiline), SegmentedControl, Switch, Checkbox
- **display/**: Icon, StatusBadge, FilterChip, PhotoTile, PlaceRow
- **overlays/**: BottomSheet, Dialog, Toast
- **navigation/**: TabBar
- **globe/**: Globe (d3-geo orthographic; needs `d3@7` and `topojson-client@3` loaded from a CDN)

Intentional additions: **Globe**, the product's core view; **PlaceRow** and **PhotoTile**, which repeat on every place screen; **FilterChip**, which is both the globe filter and its color legend. These primitives were left out because the product doesn't need them yet: Tabs (SegmentedControl covers it), Tooltip (touch-first), Select, Radio.

## CONTENT FUNDAMENTALS
- **Language:** French. Address the user as **vous**. The app never says "je" or "nous".
- **Tone:** like a notebook. Quiet, factual, warm. No hype, no gamification ("Vous avez conquis 8 % du monde !" ✗).
- **Casing:** sentence case everywhere: "Marquer comme visité", "Ajouter une ville". Overlines (region labels such as "ASIE DE L’EST") are the only uppercase, set via CSS.
- **Labels:** verb first for actions ("Ouvrir le carnet", "Rechercher un lieu"). Use the canonical status words: *Visité*, *À visiter*, *Non exploré*. Tabs: *Globe, Carnet, Envies, Profil*.
- **Numbers:** plain counts with a noun ("4 villes · 12 photos"). Use the middle dot `·` as the separator. Dates: "Avril 2024", "12 avril 2024". Coordinates: "35.68° N · 139.69° E".
- **User notes** are quoted in Instrument Serif italic with French guillemets « … ».
- **Empty states** state the fact: "Aucune note pour ce pays."
- **Toasts** confirm with the place name: "Portugal marqué comme visité", plus an "Annuler" action when reversible.
- **No emoji. No exclamation marks.**

## VISUAL FOUNDATIONS
- **Vibe:** a printed travel notebook. Warm paper, black ink, one terracotta accent. The globe is the only large graphic, and the user's photos bring the color.
- **Color:** warm paper neutrals (`--paper-0…4`) for every surface. Ink (`--ink-1…4`) for text and primary actions. **Terracotta** `#C4572E` = visité and the accent. **Ochre** `#E9C48F` = à visiter (always with dark ochre text `--state-wish-ink`). Unexplored land is `--paper-3`. Sage and brick are for feedback only. No gradients, except the dark protection gradient under photo captions.
- **Type:** *Instrument Serif* for place names and display (22–44px, tracking −0.01em, regular weight only) and italic for quoted notes. *Hanken Grotesk* for all UI (15px body, 13px labels at 500, 12px captions, 11px uppercase overlines at +0.08em). Use tabular numbers for counts and coordinates. Serif is for **place names only**. List screen titles (Carnet, Envies, Profil) use Hanken Grotesk 600 28px, tracking −0.02em.
- **Spacing:** scale of 2/4/8/12/16/20/24/32/40/56. Screen gutter 20px. Hit targets are at least 44px (buttons 44, small 36, rows 56).
- **Backgrounds:** flat paper `#F4F1EA`. No textures. The placeholder photo uses faint diagonal hatching.
- **Globe:** orthographic, ocean `--paper-2`, land `--paper-3`, 0.5px paper-colored borders, 10° graticule, 1px rim. Selection = 1.5px ink outline. City pins are 4.5px ink dots with a paper ring. Photos appear as round 2px-ringed markers once zoomed past ×1.8 (or always in "Villes" mode). **Regions:** only when a country is selected (tapped). Any country shows its regions. A visited country fades from terracotta to its soft tint `--state-visited-tint` and its regions appear: visited regions in terracotta, pinned regions in ochre, the rest left in the tint, all with paper hairlines. Wish countries do the same with the ochre tint. Region shapes are in `assets/regions/<ISO3>.json` (geoBoundaries ADM1, simplified, ODbL).
- **Corners:** small, close to print. 2px checkboxes, 4px badges, 6px buttons, inputs and photos, 10px cards and dialogs, 16px sheet tops. Pills are reserved for search, filter chips and floating globe buttons.
- **Borders:** 1px hairlines `--paper-line` separate list rows and outline cards. `--paper-4` for stronger outlines (secondary button, input).
- **Shadows:** barely there. `shadow-1` for resting chips and search, `shadow-2` for floating buttons, dialogs and toasts, `shadow-sheet` upward for bottom sheets. No inner shadows.
- **Cards:** paper-0 surface, 1px hairline, 10px radius, no shadow by default. Never use a colored left border.
- **Transparency and blur:** only the 32% ink scrim behind dialogs. No glass or blur, so the paper stays opaque.
- **Hover/press:** hover → one step darker (ink-2, terracotta-600, paper-2 fill). Press → terracotta-700, scale 0.98 (icon buttons 0.94). Focus → ink border, no glow.
- **Motion:** `--ease-out` cubic-bezier(.2,.7,.2,1). 120ms for press, 220ms for toggles and chips, 420ms for sheets. The globe "flies" to a country in 900ms with cubic in-out. No bounces, no confetti.
- **Imagery:** the user's own photos, full color and unfiltered, cropped with object-fit: cover. They are always placed by the user. No stock illustrations.
- **Layout:** the globe is full-bleed under floating controls (search on top, filters bottom-left, map buttons bottom-right). Details rise in a bottom sheet so the globe stays visible. The tab bar is fixed at the bottom.

## ICONOGRAPHY
- **Lucide** (outline, 2px stroke, round caps), loaded from CDN (`lucide-static@0.452.0`) by the `Icon` component as a CSS mask, so it takes `currentColor`. There is no icon font and no PNG icons.
- Core set: `globe`, `notebook-pen`, `bookmark`, `user-round`, `search`, `map-pin`, `camera`, `layers`, `locate-fixed`, `zoom-in`, `check`, `x`, `chevron-left/right`, `share`, `trash-2`, `plus`.
- Sizes: 16 / 18 (in buttons) / 20 (default) / 24 (tab bar).
- No emoji, and no unicode glyphs as icons (`·` is used only as a text separator).

## Brand mark
There is **no logo**. Wherever a mark is needed, write "Globe trotter" in Instrument Serif. Do not draw one.
