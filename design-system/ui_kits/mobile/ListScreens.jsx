const { Button, IconButton, Input, SegmentedControl, Switch, Checkbox, StatusBadge, FilterChip, PhotoTile, PlaceRow, Icon, BottomSheet, Dialog, Toast, TabBar, Globe } = window.GlobeTrotterDesignSystem_93b564;
const gtTitle={font:'var(--weight-semibold) 28px/1.15 var(--font-sans)',letterSpacing:'-0.02em'};
const gtOver={font:'var(--text-overline)',textTransform:'uppercase',letterSpacing:'var(--tracking-overline)',color:'var(--text-muted)',margin:'18px 0 2px'};
function CarnetScreen({app}){
  const D=window.GT_DATA, groups=[...new Set(D.notes.map(n=>n.country))];
  return <div style={{height:'100%',overflowY:'auto',background:'var(--surface-page)',padding:'62px var(--screen-gutter) 24px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><span style={gtTitle}>Carnet</span><IconButton icon="plus" label="Nouvelle note" variant="outline"/></div>
    <Input variant="search" icon="search" placeholder="Rechercher dans vos notes"/>
    {groups.map(g=>{const ns=D.notes.filter(n=>n.country===g);return <div key={g}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}><span style={{...gtOver,margin:0}}>{D.names[g]}</span><IconButton icon="map-pin" label={'Voir '+D.names[g]+' sur le globe'} size="sm" onClick={()=>app.showPlace(g)}/></div>
      {ns.map((n,i)=><PlaceRow key={n.place} name={n.place} meta={n.date} status="visited" last={i===ns.length-1} onClick={()=>app.openNote(n)}/>)}</div>;})}
  </div>;
}
function WishScreen({app}){
  const D=window.GT_DATA;
  return <div style={{height:'100%',overflowY:'auto',background:'var(--surface-page)',padding:'62px var(--screen-gutter) 24px'}}>
    <span style={gtTitle}>Envies</span>
    <div style={{font:'var(--text-body-s)',color:'var(--text-muted)',margin:'4px 0 10px'}}>{app.wish.length} destinations épinglées</div>
    {app.wish.map((id,i)=><PlaceRow key={id} name={D.names[id]} meta={(D.details[id]&&D.details[id].note)||'Épinglé'} status="wish" last={i===app.wish.length-1} onClick={()=>app.showOnGlobe(id)}/>)}
  </div>;
}
function ProfileScreen({app}){
  return <div style={{height:'100%',overflowY:'auto',background:'var(--surface-page)',padding:'62px var(--screen-gutter) 24px'}}>
    <span style={gtTitle}>Profil</span>
    <div style={{font:'var(--text-body-s)',color:'var(--text-muted)',margin:'4px 0 18px'}}>{app.visited.length} pays visités · {app.wish.length} envies</div>
    <div style={gtOver}>Globe</div>
    <Switch label="Photos sur le globe" checked={app.prefs.photos} onChange={v=>app.setPrefs({...app.prefs,photos:v})}/>
    <Switch label="Rotation automatique" checked={app.prefs.rotate} onChange={v=>app.setPrefs({...app.prefs,rotate:v})}/>
    <div style={gtOver}>Données</div>
    <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}><Button variant="secondary" icon="download" fullWidth>Exporter mes voyages</Button></div>
  </div>;
}
Object.assign(window,{CarnetScreen,WishScreen,ProfileScreen});
