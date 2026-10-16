const { Button, IconButton, Input, SegmentedControl, Switch, Checkbox, StatusBadge, FilterChip, PhotoTile, PlaceRow, Icon, BottomSheet, Dialog, Toast, TabBar, Globe } = window.GlobeTrotterDesignSystem_93b564;
function GlobeScreen({app}){
  const D=window.GT_DATA, {visited,wish,filters,setFilters,level,setLevel,selected,select,selectRegion,focus,setFocus,regionStatus}=app;
  const regions=React.useMemo(()=>{const o={};Object.keys(window.GT_ISO3).forEach(id=>{o[+id]={load:()=>window.gtLoadRegions(+id),...(regionStatus[id]||{})};});return o;},[regionStatus]);
  const box=React.useRef(null);const [h,setH]=React.useState(794);
  React.useEffect(()=>{const ro=new ResizeObserver(()=>box.current&&setH(box.current.clientHeight));ro.observe(box.current);return ()=>ro.disconnect();},[]);
  const sheetFrac=selected?(selected.region?.28:.52):0, top=96, globeC=top+(h-top)/2, visC=(top+h*(1-sheetFrac))/2, off=selected?visC-globeC:0;
  const t=k=>()=>setFilters({...filters,[k]:!filters[k]});
  const unexplored=177-visited.length-wish.length;
  return <div ref={box} style={{position:'relative',height:'100%',background:'var(--surface-page)',overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,paddingTop:96}}>
      <Globe visited={visited} wish={wish} filters={filters} selected={selected&&selected.id} focus={focus} offsetY={off} onSelect={select} onSelectPlace={app.openPlace} regions={regions} onSelectRegion={selectRegion}
        photos={app.prefs.photos?D.photos:[]} pins={D.pins} photoZoom={level==='Villes'?1:1.9} initialRotate={[-10,-38]} padding={.9}/>
    </div>
    <div style={{position:'absolute',top:58,left:'var(--screen-gutter)',right:'var(--screen-gutter)',display:'flex',flexDirection:'column',gap:10}}>
      <Input variant="search" icon="search" placeholder="Rechercher un pays, une ville"/>
    </div>
    <div style={{position:'absolute',right:'var(--screen-gutter)',bottom:selected?'calc(52% + 12px)':20,display:'flex',flexDirection:'column',gap:10,transition:'bottom var(--dur-slow) var(--ease-out)'}}>
      <IconButton icon="locate-fixed" label="Recentrer" variant="raised" onClick={()=>setFocus({lon:2.5,lat:46.6,zoom:1,t:Date.now()})}/>
      <IconButton icon="plus" label="Zoomer" variant="raised" onClick={()=>setFocus({zoomBy:1.6,t:Date.now()})}/>
      <IconButton icon="minus" label="Dézoomer" variant="raised" onClick={()=>setFocus({zoomBy:1/1.6,t:Date.now()})}/>
    </div>
    {!selected&&<div style={{position:'absolute',left:'var(--screen-gutter)',bottom:20,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:8}}>
      <FilterChip status="visited" label="Visité" count={visited.length} selected={filters.visited} onClick={t('visited')}/>
      <FilterChip status="wish" label="À visiter" count={wish.length} selected={filters.wish} onClick={t('wish')}/>
      <FilterChip status="unexplored" label="Non exploré" count={unexplored} selected={filters.unexplored} onClick={t('unexplored')}/>
    </div>}
    <PlaceSheet app={app}/>
  </div>;
}
window.GlobeScreen=GlobeScreen;
