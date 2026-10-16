// Region boundaries: local simplified file if present, else geoBoundaries ADM1 (ODbL) fetched and simplified on the fly.
(function(){
  const cache={};
  const thin=(r,tol)=>{const o=[r[0]];for(let i=1;i<r.length-1;i++){const p=o[o.length-1],q=r[i];if(Math.abs(q[0]-p[0])+Math.abs(q[1]-p[1])>tol)o.push(q);}o.push(r[r.length-1]);return o;};
  const area=r=>{let a=0;for(let i=0;i<r.length-1;i++)a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return a/2;};
  const fix=(poly,tol)=>{const out=[];poly.forEach((ring,i)=>{let r=thin(ring,tol);if(r.length<4)return;const a=area(r);if(i===0?a>0:a<0)r=r.reverse();out.push(r);});return out.length?out:null;};
  const clean=s=>String(s||'').replace(/\t/g,'').replace(/ (Prefecture|Province|Region|Governorate|Oblast|State|Department)$/,'').trim();
  async function remote(iso3){
    const m=await (await fetch('https://www.geoboundaries.org/api/current/gbOpen/'+iso3+'/ADM1/')).json();
    const u=m.simplifiedGeometryGeoJSON.replace('https://github.com/wmgeolab/geoBoundaries/raw/','https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/');
    const g=await (await fetch(u)).json();
    let n=0;g.features.forEach(f=>{const c=f.geometry&&f.geometry.coordinates;if(c)n+=JSON.stringify(c).length;});
    const tol=n>4e6?.15:n>1.5e6?.08:.04;
    const feats=[];g.features.forEach(f=>{if(!f.geometry)return;let ps=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;ps=ps.map(p=>fix(p,tol)).filter(Boolean);
      if(ps.length)feats.push({type:'Feature',properties:{name:clean(f.properties.shapeName)},geometry:{type:'MultiPolygon',coordinates:ps}});});
    return feats;
  }
  window.gtLoadRegions=function(id){
    if(cache[id])return cache[id];
    const D=window.GT_DATA,iso3=window.GT_ISO3[id];
    cache[id]=D.regionFiles[id]?fetch('../../assets/regions/'+D.regionFiles[id]+'.json').then(r=>r.json()).then(j=>j.features)
      :iso3?remote(iso3).catch(e=>{console.warn('Régions indisponibles pour',iso3,e);return [];}):Promise.resolve([]);
    return cache[id];
  };
})();
