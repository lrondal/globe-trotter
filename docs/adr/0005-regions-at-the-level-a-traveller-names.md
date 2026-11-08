# Regions at the level a traveller names, chosen country by country

gbOpen ADM1 is not always the level a traveller names. Italy's is its 5 NUTS1 macro-regions (`Centro`, `Isole`), with no Toscana; Greece's is 8 groupings such as `Egean`. So each country in `scripts/geoboundaries.json` may name another geoBoundaries release or level, with a `why`. The Regions stay geoBoundaries shapes, pinned to a commit and cut to their Country (ADR 0004). Only the file they come from changes.

The audit of #33 went through every country's Regions (how many, and their names) and changed five:

| Country | Was (gbOpen ADM1) | Now |
|---|---|---|
| Italy | 5 NUTS1 macro-regions | gbOpen ADM2: the 20 regioni |
| Greece | 8 groupings (`Egean`) | gbOpen ADM2: the 13 regions and Mount Athos, renamed in French in `scripts/regions.ts` (the source has transliterated genitives: `Kritis`) |
| Niger | 6, `Tahoua/Agadez` and `Zinder/Diffa` merged | gbHumanitarian ADM1: the 8 regions |
| Azerbaijan | Nakhchivan and « Contiguous Azerbaijan » | gbOpen ADM2: its 79 districts and cities |
| Bosnia and Herzegovina | the 3 entities | gbOpen ADM2: the Federation's 10 cantons, Republika Srpska and Brčko |

Coarse Regions were kept where the level below is too fine to tap on a globe: Slovenia (2 cohesion regions; ADM2 is its 213 municipalities), Ireland (4 provinces; ADM2 has 166 units), the United Kingdom (its 4 nations; ADM2 has 216 units). We kept regions that are official and that travellers name: Belgium's 3, Denmark's 5, Uganda's and Malawi's.

The names are cleaned at build time too. UTF-8 read as Latin-1 is mended (Chile's `RegiÃ³n`, Portugal's `BRAGANÃA`), and a source that writes most of its names in capitals is set in title case (Portugal, Paraguay, Romania, Singapore). Capitals in other sources are acronyms, so they're kept (`SNNPR`, `NCR`).

## Considered Options

- **Natural Earth admin-1 for the countries concerned**: it has Italy's regions, but it would add a second source, with its own ids and its own way of pinning a version. Staying within geoBoundaries keeps one download, one pin (the commit) and one kind of id (`shapeID`).
- **Accepting ADM1 as it is**: Italy, a top destination, would have had « Centro » instead of Toscana.

## Consequences

- Region ids of the five countries changed. v1 is not published, so nothing migrates them: a Mark, Note or Photo left on an old id is ignored. Every lookup (`atlas.region`) treats an unknown id as absent, and a City's old `regionId` simply stops rolling up.
- Licences for #19 to check: Niger's gbHumanitarian file says « Other – Humanitarian » (HDX, OCHA/ROWCA); Azerbaijan's is CC BY-SA 3.0 (Wikipedia). The Profile credits each source's licence (#17).
- The pipeline test `the shipped Regions are those a traveller knows` fails if Italy, Greece, Niger, Azerbaijan or Bosnia go back to their ADM1.
