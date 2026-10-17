# Globe trotter

[![CI](https://github.com/lrondal/globe-trotter/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lrondal/globe-trotter/actions/workflows/ci.yml?query=branch%3Amaster)

A personal iPhone app to keep track of where you've been and where you want to go, centred on a 3D globe you spin and zoom with your finger.

Every Country, Region and City is a **Place** you can mark **Visited** or **Wish**, and annotate with a Note, Todos and Photos. Countries and their Regions are coloured by their Status, so your travels show up at a glance. The interface is in French.

The app is single-user and local-only: no account, no server, no sync. Everything stays on the phone and works in airplane mode; data only leaves through an explicit Export.

## Status

Design and planning are done; the app itself is not built yet.

- **Spec:** [#2 — Spec Globe trotter v1](https://github.com/lrondal/globe-trotter/issues/2)
- **Globe UX requirements** (fluidity, ±60° tilt, stable outlines): [#1](https://github.com/lrondal/globe-trotter/issues/1)
- **Implementation plan:** [#21](https://github.com/lrondal/globe-trotter/issues/21), with the ticket dependency graph and which tickets can run in parallel. Tickets are issues #3–#20.

## Tech

- Expo (React Native) + TypeScript, iPhone first
- SQLite on the device, no backend
- Skia for the globe
- Offline map data built into the app: Natural Earth / world-atlas (countries), geoBoundaries ADM1 (regions), GeoNames `cities1000` (cities)

## Repository layout

| Path | What it is |
|---|---|
| `design-system/` | High-fidelity design: tokens, fonts, components, UI kits, and the design handoff. The visual reference for the app. |
| `docs/agents/` | How coding agents should use this repo (issue tracker, triage labels, domain docs). |
| `CLAUDE.md` | Instructions for Claude Code. |

The repo still holds the initial Python skeleton (`pyproject.toml`, `src/`); it will be removed in favour of the Expo app ([#3](https://github.com/lrondal/globe-trotter/issues/3)).

Related branches:

- `worktree-domain-model-grill`: the domain glossary (`GLOSSARY.md`) and the first architecture decision records (`docs/adr/`), not yet merged.
- `prototype/globe-ux`: a throwaway Expo Go prototype of the globe, with an fps measurement panel.

## Vocabulary

The project uses a small, precise vocabulary (Place, Mark, Status, Visited, Wish, Unexplored, Journal, Wishlist, Clear, Delete…). See `GLOSSARY.md` on the `worktree-domain-model-grill` branch.

## How work happens here

Work is tracked in GitHub Issues. Tickets labelled `ready-for-agent` are fully specified and can be picked up by a coding agent; `ready-for-human` ones need a person. A ticket can start once all the issues blocking it are closed.

## Credits

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain), [geoBoundaries](https://www.geoboundaries.org/) (licence varies by country), [GeoNames](https://www.geonames.org/) (CC BY 4.0).
