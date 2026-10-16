import React from 'react';
const TOPO='https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
function loadWorld(){ if(!window.__gtWorld) window.__gtWorld=fetch(TOPO).then(r=>r.json()).then(w=>window.topojson.feature(w,w.objects.countries).features); return window.__gtWorld; }
export function Globe({onSelectPlace,maxZoom=24,offsetY=0,regions={},onSelectRegion,visited=[],wish=[],pins=[],photos=[],filters={visited:true,wish:true,unexplored:true},selected,focus,onSelect,photoZoom=1.8,autoRotate=false,initialRotate=[-10,-30],padding=0.88,style}){
  const host=React.useRef(null), api=React.useRef({}), P=React.useRef({});
  P.current={onSelectPlace,offsetY,regions,onSelectRegion,visited:new Set(visited.map(Number)),wish:new Set(wish.map(Number)),pins,photos,filters,selected:selected!=null?Number(selected):null,onSelect,photoZoom};
  React.useEffect(()=>{
    const d3=window.d3; if(!d3||!window.topojson){console.error('Globe: load d3@7 and topojson-client@3 first');return;}
    const el=host.current, css=n=>getComputedStyle(el).getPropertyValue(n).trim();
    let W=el.clientWidth||360,H=el.clientHeight||360,R=Math.min(W,H)/2*padding,auto=autoRotate,alive=true;
    const svg=d3.select(el).append('svg').style('display','block').style('touch-action','none').style('cursor','grab');
    const proj=d3.geoOrthographic().clipAngle(90).rotate(initialRotate), path=d3.geoPath(proj);
    const defs=svg.append('defs');
    const sphere=svg.append('path').datum({type:'Sphere'});
    const grat=svg.append('path').datum(d3.geoGraticule10()).attr('fill','none').attr('stroke-width',.5);
    const landG=svg.append('g'), regG=svg.append('g'), pinG=svg.append('g'), photoG=svg.append('g');
    let land=landG.selectAll('path');
    const size=()=>{W=el.clientWidth||W;H=el.clientHeight||H;R=Math.min(W,H)/2*padding;svg.attr('width',W).attr('height',H);proj.translate([W/2,H/2+off]).scale(R*k);};
    let k=1,prev=d3.zoomIdentity,off=offsetY;
    const cache={},loading={},centroids={},byId={};
    const main=f=>{if(f.geometry.type!=='MultiPolygon')return f;let best=null,a=-1;f.geometry.coordinates.forEach(c=>{const p={type:'Polygon',coordinates:c},x=d3.geoArea(p);if(x>a){a=x;best=p;}});return best;};
    let fade=0,fadeId=null;const blend=()=>fade;
    function ensure(id){const r=P.current.regions[id];if(!r||cache[id]||loading[id])return;if(r.features){cache[id]=r.features;return;}
      loading[id]=(r.load?Promise.resolve(r.load()):fetch(r.url).then(x=>x.json())).then(j=>{cache[id]=(j&&j.features)||j||[];draw();}).catch(e=>console.error('Globe regions',id,e));}
    function fill(d){const p=P.current,id=+d.id,t=id===fadeId?fade:0;
      if(p.visited.has(id)) return p.filters.visited?d3.interpolateRgb(css('--state-visited'),css('--state-visited-tint'))(t):css('--globe-land');
      if(p.wish.has(id)) return p.filters.wish?d3.interpolateRgb(css('--state-wish'),css('--state-wish-tint'))(t):css('--globe-land');
      return p.filters.unexplored?css('--globe-land'):css('--globe-ocean');}
    function draw(){const p=P.current,c=[-proj.rotate()[0],-proj.rotate()[1]],vis=d=>d3.geoDistance([d.lon,d.lat],c)<Math.PI/2-.05;
      sphere.attr('d',path).attr('fill',css('--globe-ocean')).attr('stroke',css('--globe-rim'));
      grat.attr('d',path).attr('stroke',css('--globe-graticule'));
      land.attr('d',path).attr('fill',fill).attr('stroke',d=>+d.id===p.selected?css('--ink-1'):css('--globe-stroke')).attr('stroke-width',d=>+d.id===p.selected?1.5:.5);
      land.filter(d=>+d.id===p.selected).raise();
      const t=blend(), active=[];
      if(t>0&&fadeId!=null) [String(fadeId)].forEach(id=>{if(!p.regions[id])return;
        {ensure(id);if(cache[id]){const r=p.regions[id],vs=new Set(r.visited||[]),ws=new Set(r.wish||[]);
          cache[id].forEach(f=>active.push({f,id:+id,key:id+':'+f.properties.name,st:vs.has(f.properties.name)?'v':ws.has(f.properties.name)?'w':'u'}));}}});
      regG.style('opacity',t).style('pointer-events',t>.5?'auto':'none');
      regG.selectAll('path').data(active,d=>d.key).join(en=>en.append('path').style('cursor','pointer').on('click',(e,d)=>{e.stopPropagation();const q=P.current;
          if(q.onSelectRegion)q.onSelectRegion({country:d.id,name:d.f.properties.name,status:d.st==='v'?'visited':d.st==='w'?'wish':'unexplored',centroid:d3.geoCentroid(d.f)});
          else q.onSelect&&q.onSelect({id:d.id,name:'',centroid:centroids[d.id]});}))
        .attr('d',d=>path(d.f)).attr('fill',d=>d.st==='v'?css('--state-visited'):d.st==='w'?css('--state-wish'):'transparent')
        .attr('stroke',css('--paper-0')).attr('stroke-width',.6).attr('stroke-opacity',.9);
      pinG.selectAll('circle').data(p.pins).join(en=>en.append('circle').style('cursor','pointer').on('click',(e,d)=>{e.stopPropagation();const q=P.current;q.onSelectPlace&&q.onSelectPlace(d);})).attr('r',3.5).attr('fill',css('--globe-pin')).attr('stroke',css('--paper-0')).attr('stroke-width',1.2)
        .attr('cx',d=>proj([d.lon,d.lat])[0]).attr('cy',d=>proj([d.lon,d.lat])[1]).attr('display',d=>vis(d)?null:'none');
      const showPh=k>=p.photoZoom, s=Math.min(38,16+k*5);
      const g=photoG.selectAll('g.ph').data(showPh?p.photos:[],d=>d.label).join(en=>{const g=en.append('g').attr('class','ph').style('cursor','pointer').style('filter','drop-shadow(0 2px 4px rgba(27,26,23,.3))');
        g.on('click',(e,d)=>{e.stopPropagation();const q=P.current;q.onSelectPlace&&q.onSelectPlace(d);});
        g.append('circle').attr('class','bg'); g.append('image').attr('preserveAspectRatio','xMidYMid slice'); g.append('text').attr('text-anchor','middle').attr('dominant-baseline','central');
        g.append('circle').attr('class','ring').attr('fill','none'); return g;});
      g.attr('display',d=>vis(d)?null:'none').attr('transform',d=>{const q=proj([d.lon,d.lat]);return `translate(${q[0]},${q[1]-s/2-4})`;});
      g.each(function(d,i){const id='gtclip'+i;let cp=defs.select('#'+id);if(cp.empty())cp=defs.append('clipPath').attr('id',id).append('circle');else cp=cp.select('circle');cp.attr('r',s/2);
        const n=d3.select(this);n.select('.bg').attr('r',s/2).attr('fill',css('--paper-2'));
        n.select('image').attr('href',d.src||null).attr('x',-s/2).attr('y',-s/2).attr('width',s).attr('height',s).attr('clip-path',`url(#${id})`);
        n.select('text').text(d.src?'':(d.label||'').slice(0,2)).attr('fill',css('--ink-3')).style('font',`500 ${Math.round(s/3.4)}px ${css('--font-sans')}`);
        n.select('.ring').attr('r',s/2).attr('stroke',css('--paper-0')).attr('stroke-width',1.5);});
    }
    const zoom=d3.zoom().scaleExtent([.8,maxZoom]).on('start',e=>{if(e.sourceEvent){auto=false;svg.style('cursor','grabbing');}})
      .on('zoom',e=>{const t=e.transform;if(e.sourceEvent&&t.k===prev.k){const r=proj.rotate(),f=75/proj.scale();proj.rotate([r[0]+(t.x-prev.x)*f,Math.max(-85,Math.min(85,r[1]-(t.y-prev.y)*f))]);}
        k=t.k;prev=t;proj.scale(R*k);draw();}).on('end',()=>svg.style('cursor','grab'));
    svg.call(zoom).on('dblclick.zoom',null);
    api.current={draw,
      fit:(id,pad=.78)=>{const f=byId[+id];if(!f)return false;const ce=centroids[+id],tp=d3.geoOrthographic().clipAngle(90).rotate([-ce[0],-ce[1]]).scale(1).translate([0,0]);
        const b=d3.geoPath(tp).bounds(f),bw=Math.max(1e-4,b[1][0]-b[0][0]),bh=Math.max(1e-4,b[1][1]-b[0][1]),aw=W,ah=Math.max(120,H+2*P.current.offsetY);
        const kk=Math.max(1,Math.min(maxZoom,Math.min(aw*pad/bw,ah*pad/bh)/R));api.current.flyTo(ce[0],ce[1],kk);return true;},
      zoomBy:f=>{const r=proj.rotate();api.current.flyTo(-r[0],-r[1],Math.max(.8,Math.min(maxZoom,k*f)));},
      flyTo:(lon,lat,kk)=>{auto=false;const r0=proj.rotate(),r1=[-lon,-lat],k0=k,k1=kk||k,ir=d3.interpolate(r0,r1);
      d3.transition().duration(900).ease(d3.easeCubicInOut).tween('fly',()=>t=>{proj.rotate(ir(t));const kt=k0+(k1-k0)*t;svg.call(zoom.transform,d3.zoomIdentity.scale(kt));});}};
    size();
    loadWorld().then(features=>{if(!alive)return;features.forEach(f=>{const m=main(f);byId[+f.id]=m;centroids[+f.id]=d3.geoCentroid(m);});land=landG.selectAll('path').data(features).join('path').style('cursor','pointer')
      .on('click',(e,d)=>{const p=P.current;p.onSelect&&p.onSelect({id:+d.id,name:d.properties.name,centroid:d3.geoCentroid(d)});});draw();});
    const ro=new ResizeObserver(()=>{size();draw();});ro.observe(el);
    const timer=d3.timer(()=>{const sel=P.current.selected,has=sel!=null&&P.current.regions[sel];if(has)ensure(String(sel));
      const want=has&&cache[sel]?1:0;if(want&&fadeId!==sel){if(fade>.02){fade=Math.max(0,fade-.12);draw();}else{fade=0;fadeId=sel;}}
      else if(Math.abs(want-fade)>.01){fade+=(want-fade)*.12;if(fade<.02&&!want){fade=0;fadeId=null;}draw();}
      const to=P.current.offsetY;if(Math.abs(to-off)>.5){off+=(to-off)*.14;proj.translate([W/2,H/2+off]);if(!auto)draw();}if(auto){const r=proj.rotate();proj.rotate([r[0]+.08,r[1]]);draw();}});
    return ()=>{alive=false;ro.disconnect();timer.stop();svg.remove();};
  },[]);
  React.useEffect(()=>{api.current.draw&&api.current.draw();});
  React.useEffect(()=>{if(!focus||!api.current.flyTo)return;const a=api.current;
    if(focus.fit!=null){let n=0;const go=()=>{if(!a.fit(focus.fit,focus.pad)&&n++<40)setTimeout(go,100);};go();}
    else if(focus.zoomBy) a.zoomBy(focus.zoomBy);
    else a.flyTo(focus.lon,focus.lat,focus.zoom);},[focus&&focus.t,focus&&focus.fit,focus&&focus.zoomBy,focus&&focus.lon,focus&&focus.lat,focus&&focus.zoom]);
  return <div ref={host} style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',...style}}/>;
}
