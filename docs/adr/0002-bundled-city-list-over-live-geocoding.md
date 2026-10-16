# Bundled city list over live geocoding

Cities come from a bundled offline copy of GeoNames `cities15000` (~25k cities, CC-BY 4.0, attribution required), searched from the globe's search bar; anything missing is added as a Custom City by long-pressing the globe. We rejected live geocoding (Apple/Google/Mapbox) because it breaks offline-first use, needs an API key, and sends the user's searches to a third party. A fixed list also gives Cities stable ids, so the same city is never stored twice.
