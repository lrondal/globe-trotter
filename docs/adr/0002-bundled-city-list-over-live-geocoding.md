# Bundled city list over live geocoding

Cities come from a bundled offline copy of GeoNames `cities1000` (~130k places, CC-BY 4.0, attribution required), trimmed to name, French name, point, Country, Region and population, with French names resolved from GeoNames alternate names at build time. Search ranks results by population; anything missing is added as a Custom City by long-pressing the globe. We rejected live geocoding (Apple/Google/Mapbox) because it breaks offline-first use, needs an API key, and sends the user's searches to a third party. A fixed list also gives Cities stable ids, so the same city is never stored twice.

## Considered Options

`cities15000` (~25k places) was smaller but misses places users plausibly visit, such as Naoshima (~3k inhabitants).
