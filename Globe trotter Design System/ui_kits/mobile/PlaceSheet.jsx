const { Button, IconButton, Input, SegmentedControl, Switch, Checkbox, StatusBadge, FilterChip, PhotoTile, PlaceRow, Icon, BottomSheet, Dialog, Toast, TabBar, Globe } = window.GlobeTrotterDesignSystem_93b564;
function PlaceSheet({app}){
  const D=window.GT_DATA,{selected,select,visited,wish,markVisited,toggleWish,openNote,level,regionStatus,markRegion}=app;
  const [snap,setSnap]=React.useState('half');
  React.useEffect(()=>setSnap(selected&&selected.region?'peek':'half'),[selected&&selected.id,selected&&selected.region&&selected.region.name]);
  const c=selected, id=c&&c.id, d=(c&&D.details[id])||{};
  const rg=c&&c.region, rs=(c&&regionStatus[id])||{visited:[],wish:[]};
  const status=rg?(rs.visited.includes(rg.name)?'visited':rs.wish.includes(rg.name)?'wish':'unexplored'):c?(visited.includes(id)?'visited':wish.includes(id)?'wish':'unexplored'):'unexplored';
  const country=c?(D.names[id]||window.GT_NAMES_FR[id]||c.name):'', name=rg?rg.name:country;
  const regList=[...rs.visited.map(n=>({name:n,meta:'Visitée'})),...rs.wish.map(n=>({name:n,meta:'Épinglée',status:'wish'}))];
  const list=level==='Régions'?regList:d.cities;
  return <BottomSheet open={!!c} snap={snap} onSnap={setSnap} header={c&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>{(rg||d.region)&&<span style={{font:'var(--text-overline)',textTransform:'uppercase',letterSpacing:'var(--tracking-overline)',color:'var(--text-muted)'}}>{rg?country:d.region}</span>}
        <span style={{font:'var(--text-display-l)',letterSpacing:'var(--tracking-display)'}}>{name}</span></div>
        <IconButton icon="x" label="Fermer" variant="outline" size="sm" onClick={()=>select(null)}/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><StatusBadge status={status}/>{!rg&&d.date&&<span style={{font:'var(--text-caption)',color:'var(--text-muted)'}}>{d.date}</span>}{!rg&&d.coords&&<span style={{font:'var(--text-caption)',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{d.coords}</span>}</div>
    </div>}>
    {c&&rg&&<div style={{display:'flex',gap:10}}>{status==='visited'?<Button variant="secondary" icon="notebook-pen" fullWidth onClick={()=>openNote({country:id,place:rg.name})}>Ouvrir le carnet</Button>:<><Button variant="accent" icon="check" onClick={()=>markRegion(id,rg.name,'visited')} style={{flex:1}}>Marquer visitée</Button><Button variant="secondary" icon={status==='wish'?'bookmark-minus':'bookmark'} onClick={()=>markRegion(id,rg.name,status==='wish'?'none':'wish')} style={{flex:1}}>{status==='wish'?'Retirer':'À visiter'}</Button></>}</div>}
    {c&&!rg&&<div style={{display:'flex',flexDirection:'column',gap:18}}>
      {status==='visited'?<>
        <PhotoTile label={'Photo — '+(d.cities?d.cities[0].name:name)} ratio="16/10"/>
        {d.note&&<p style={{margin:0,font:'italic 400 20px/1.3 var(--font-display)',textWrap:'pretty'}}>« {d.note} »</p>}
        <Button variant="secondary" icon="notebook-pen" fullWidth onClick={()=>openNote({country:id,place:name})}>Ouvrir le carnet</Button>
      </>:<div style={{display:'flex',gap:10}}>
        <Button variant="accent" icon="check" onClick={()=>markVisited(id,name)} style={{flex:1}}>Marquer visité</Button>
        <Button variant="secondary" icon={status==='wish'?'bookmark-minus':'bookmark'} onClick={()=>toggleWish(id,name)} style={{flex:1}}>{status==='wish'?'Retirer':'À visiter'}</Button>
      </div>}
      {status==='wish'&&d.note&&<p style={{margin:0,font:'italic 400 20px/1.3 var(--font-display)'}}>« {d.note} »</p>}
      {list&&list.length>0&&<div><div style={{font:'var(--text-overline)',textTransform:'uppercase',letterSpacing:'var(--tracking-overline)',color:'var(--text-muted)',marginBottom:4}}>{level==='Régions'?'Régions':'Villes'}</div>
        {list.map((x,i)=><PlaceRow key={x.name} name={x.name} meta={x.meta} status={x.status||'visited'} last={i===list.length-1} onClick={()=>level==='Régions'?select({...c,region:{name:x.name}},true):openNote({country:id,place:x.name})}/>)}</div>}
      {!d.region&&status==='unexplored'&&<p style={{margin:0,font:'var(--text-body-s)',color:'var(--text-muted)'}}>Aucune note pour ce pays.</p>}
    </div>}
  </BottomSheet>;
}
window.PlaceSheet=PlaceSheet;
