# Islands from the map's polygons, not from ADM1

Visiting Crète should not make Greece Visited, and tapping Crète should frame Crète rather than mainland Greece. So Islands are Places of their own, marked independently of their Country both ways. We take them from a hand-written list (name, Country, a point or more) and carve the matching polygons out of their Country in world-atlas 50m at build time, each with a stable `i-` id. We rejected modelling them as geoBoundaries ADM1 Regions: gbOpen ADM1 cannot express most of them (Italy's ADM1 merges Sicily and Sardinia into one macro-region, Greece's merges every Aegean island, France's has no overseas departments), whereas world-atlas draws almost every tourist island as its own polygon.

## Considered Options

- **A rule instead of a list** (every Region not touching the Country's largest landmass): it would detach Java, Sumatra and Northern Ireland, so visiting Java would not make Indonesia Visited.
- **Splitting every polygon**: Indonesia alone has 133.

## Consequences

- The list needs hand upkeep, and an island missing from the 50m map (Capri, Boracay) cannot be one. The build fails if a listed point falls in no polygon of its Country.
- Regions made only of Islands (Corse, Illes Balears…) are dropped, and the Cities on an Island roll up to the Island alone, so the Status rule has one exception: Islands are not inside their Country.
