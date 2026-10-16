The 3D globe main view: countries colored visited / à visiter / non exploré, drag to rotate, zoom reveals photo markers.
```html
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>
```
```jsx
<div style={{height:560}}>
  <Globe visited={[250,392,620]} wish={[578,554]} photos={[{lon:135.77,lat:35.01,label:'Kyoto'}]}
    filters={filters} selected={sel} focus={focus} onSelect={c=>setSel(c.id)} />
</div>
```
- Fills its parent; give the parent a height
- Colors come from --globe-* and --state-* tokens
- Country ids: ISO 3166-1 numeric (France 250, Japon 392, Portugal 620, Italie 380, États-Unis 840)
- Regions: pass `regions={{392:{url:'assets/regions/JPN.json',visited:['Kyoto','Tokyo']}}}`. Selecting a visited/wish country (`selected`) fades it to its tint and reveals its regions. Region names must match `properties.name`. Files in `assets/regions/` (geoBoundaries ADM1, ODbL), keyed by ISO3.
- `offsetY` shifts the globe centre up to keep the selection visible above a bottom sheet.
