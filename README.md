# Globe trotter

[![CI](https://github.com/lrondal/globe-trotter/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lrondal/globe-trotter/actions/workflows/ci.yml?query=branch%3Amaster)

A personal iPhone app to keep track of where you've been and where you want to go, centred on a 3D globe you spin and zoom with your finger. The interface is in French.

Every Country, Island, Region and City is a **Place** you can mark **Visited** or **Wish**, and annotate with a Note, Todos and Photos. Countries and their Regions are coloured by their **Status**, so your travels show at a glance. The **Journal** (« Carnet ») lists every Place you marked or wrote about. The **Wishlist** (« Envies ») lays out your **Plans** as a timeline.

## Principles

- **Local only.** One user, one phone: no account, no server, no sync. Everything is stored on the device, in SQLite, with the Photos as files of the app ([ADR 0001](docs/adr/0001-expo-local-only-no-backend.md)).
- **Offline.** The map and the 170,000 Cities are built into the app, and search runs on the phone ([ADR 0002](docs/adr/0002-bundled-city-list-over-live-geocoding.md)). The app works in airplane mode.
- **Private.** The user's position only centres the globe and is never stored. Data leaves the phone only through an explicit **Export**, a single zip file that an **Import** can restore.
- **The globe comes first.** It stays at 60 fps, tilts at most ±60°, and its outlines never jump ([#1](https://github.com/lrondal/globe-trotter/issues/1)).

The spec of v1 is [#2](https://github.com/lrondal/globe-trotter/issues/2). The words above have precise meanings, defined in [`GLOSSARY.md`](GLOSSARY.md). The decisions behind the map data are in [`docs/adr/`](docs/adr/).

## Requirements

- **Node 26** (see `.nvmrc`) and npm.
- An **iPhone** with [Expo Go](https://expo.dev/go), on the same Wi-Fi network as the computer.
- To rebuild the map data only: an internet connection, and `unzip` or a `tar` that reads zip files (bsdtar, which macOS and Windows ship).

## Install

```sh
npm ci
```

## Run on an iPhone

```sh
npm start
```

Scan the QR code with the iPhone's Camera: the app opens in Expo Go. In development, a measure panel over the globe shows its frame rate (`src/globe/MeasurePanel.tsx`).

The app uses only native modules that Expo Go includes. Adding a library with native code calls for a development build instead (`npx expo run:ios`, see `AGENTS.md`).

## Install on a phone, for free

Pushing a tag `v*` (e.g. `v1.0.0`) makes the **Release builds** workflow attach an unsigned iOS `.ipa` and an Android `.apk` to a GitHub Release. To install the `.ipa` on an iPhone with SideStore and a free Apple ID, which re-signs it on the phone every 7 days, or the `.apk` on Android, see [`docs/install-on-phone.md`](docs/install-on-phone.md).

## Tests

```sh
npm test            # node --test: the pure logic, with node:sqlite in memory, no phone needed
npm run typecheck   # tsc --noEmit
```

CI runs both on every pull request and on every commit to `master` (`.github/workflows/ci.yml`).

## Map data pipeline

The Places come from three sources, turned into assets at build time by the scripts in `scripts/`. The output is committed, so the app needs none of this to run. Run the scripts in this order, as each reads the output of the one before:

| Command | Source | Writes |
|---|---|---|
| `npm run data:countries` | world-atlas 50m (Natural Earth), from npm | `assets/data/countries.json`: the Countries, with the Islands carved out of them ([ADR 0003](docs/adr/0003-islands-from-map-polygons.md)) |
| `npm run data:regions` | geoBoundaries, about 130 MB downloaded once | `assets/data/regions.json` (the index), `assets/regions/<Country id>.geo` (the outlines, loaded on demand) and `src/atlas/regionFiles.ts` |
| `npm run data:cities` | GeoNames `cities1000` and alternate names, about 215 MB downloaded once | `assets/data/cities.tsv` |

Downloads are kept in `node_modules/.cache`, so a second run doesn't download them again.

The Countries and Regions are rebuilt byte for byte. The Cities are not: GeoNames publishes a new dump every day and its source is not pinned, so a rebuild picks up that day's dump. A City's id is its GeoNames id, which never changes, so Cities already in a Journal stay the same.

The Islands are a hand-written list in `scripts/islands.ts`. The geoBoundaries release of each Country is pinned to a commit in `scripts/geoboundaries.json`, so that Region ids never change under a rebuild. That file also records where a Country takes another level than ADM1, and why ([ADR 0004](docs/adr/0004-regions-cut-to-their-country.md), [ADR 0005](docs/adr/0005-regions-at-the-level-a-traveller-names.md)).

## Modules

Everything is in `src/`, in TypeScript. Expo Router routes are in `src/app/` and nothing else lives there.

| Module | What it does |
|---|---|
| **Atlas** (`src/atlas/`) | The reference Places shipped with the app, read-only: Countries and Islands decoded at startup, a Country's Regions and the City list loaded the first time they are needed. It answers which Places are at a point, and searches every Place offline. |
| **Journal** (`src/journal/`) | The user's Places and the rules over them: Marks, Statuses, Visit dates, Notes, Todos, Photos, Plans and Itineraries. It is the only module that writes. Each write goes to SQLite at once, and reads come from a copy in memory. `view.ts` shapes it for the Journal, the Wishlist and the Country page. |
| **Globe camera** (`src/globe/camera.ts`) | The view of the globe (the point facing the user, the zoom) and how gestures, inertia and flights move it. Pure worklets that run on the UI thread. |
| **Globe renderer** (`src/globe/`) | `Globe.tsx` draws the Countries and Regions with Skia, re-projected on every frame on the UI thread (`projection.ts`). The rest of the folder colours them by Status and the filter chips (`layers.ts`), finds the Place under a tap (`hitTest.ts`), and places the Photo thumbnails and City dots (`thumbnails.ts`). |
| **Place sheet** (`src/sheet/`) | The sheet over the bottom of the globe that shows the selected Place. It marks the Place, opens its Note, and Clears or Deletes it. |
| **Search** (`src/search/`) | « Rechercher un lieu »: the search over the globe, by Pays, Îles, Régions and Villes. |
| **Export** (`src/export/`) | « Exporter mes voyages » and its Import, as a zip of the Journal, the Preferences and the Photos, and the Reset of all data. An Import checks the whole file before it writes anything. |
| **Location** (`src/location/`) | Where the globe opens and what the recentre button does, from the user's approximate position, which is never kept. |
| **Profile** (`src/profile/`) | The statistics of Visited Places and the Preferences: Photos on the globe, and auto-rotation. |
| **Theme** (`src/theme/tokens.ts`) | The design tokens, kept in sync with `design-system/` by a test. |

The **screens**:

| Route | Screen |
|---|---|
| `(tabs)/index.tsx` | The globe, with the search, the filter chips and the Place sheet |
| `(tabs)/journal.tsx` | The Journal (« Carnet »): every Place with a Mark or content, grouped by Country |
| `(tabs)/wishlist.tsx` | The Wishlist (« Envies »): the Plans as a timeline, with their Planned dates and Itineraries |
| `(tabs)/profile.tsx` | The Profile: statistics, Preferences, Export, Import, Reset and credits |
| `country/[id].tsx` | A Country page: its Regions, Islands and Cities with a Mark or content |
| `note/[level]/[id].tsx` | A Place's Note, Todos and Photos |
| `photo/[level]/[id].tsx` | A Photo full screen, with its Caption |

The other folders hold the parts these screens share: `components/` for the design system's controls, plus `country/`, `note/`, `photos/` and `plans/`.

## Repository layout

| Path | What it is |
|---|---|
| `src/` | The app (see Modules). |
| `assets/` | The built map data (`data/`, `regions/`) and the app's icons. |
| `scripts/` | The map data pipeline, with its tests. |
| `design-system/` | The high-fidelity design: tokens, fonts, components, UI kits and the design handoff. It is the visual reference for the app. |
| `GLOSSARY.md` | The domain vocabulary: Place, Mark, Status, Visited, Wish, Clear, Delete… |
| `docs/adr/` | Architecture decision records. |
| `docs/install-on-phone.md` | How to install a release on an iPhone (SideStore) or an Android phone. |
| `docs/agents/`, `AGENTS.md`, `CLAUDE.md` | How coding agents work in this repo. |

## How work happens here

Work is tracked in [GitHub Issues](https://github.com/lrondal/globe-trotter/issues). The spec is [#2](https://github.com/lrondal/globe-trotter/issues/2). The plan of v1, with its tickets and their dependencies, is [#21](https://github.com/lrondal/globe-trotter/issues/21). Tickets labelled `ready-for-agent` are fully specified and a coding agent can pick them up. Those labelled `ready-for-human` need a person.

## Credits

Map data, credited in the app's Profile too:

- [Natural Earth](https://www.naturalearthdata.com/), through [world-atlas](https://github.com/topojson/world-atlas): Country and territory borders, public domain.
- [geoBoundaries](https://www.geoboundaries.org/) (William & Mary geoLab): Region boundaries, CC BY 4.0, from open sources specific to each Country, including © OpenStreetMap contributors (ODbL).
- [GeoNames](https://www.geonames.org/): Cities and their names, CC BY 4.0.

Fonts: Instrument Serif and Hanken Grotesk, from Google Fonts (SIL Open Font License).
