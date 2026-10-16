const { Button, IconButton, Input, SegmentedControl, Switch, Checkbox, StatusBadge, FilterChip, PhotoTile, PlaceRow, Icon, BottomSheet, Dialog, Toast, TabBar, Globe } = window.GlobeTrotterDesignSystem_93b564;
function NoteScreen({app}){
  const D=window.GT_DATA,{note,closeNote,deletePlace,showPlace}=app, d=D.details[note.country]||{};
  const [todo,setTodo]=React.useState(d.todo||[]);
  const [confirm,setConfirm]=React.useState(false);
  const country=D.names[note.country];
  return <div style={{position:'relative',height:'100%',background:'var(--surface-page)',display:'flex',flexDirection:'column'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'54px 12px 4px'}}>
      <IconButton icon="chevron-left" label="Retour" onClick={closeNote}/>
      <div style={{display:'flex'}}><IconButton icon="share" label="Partager"/><IconButton icon="trash-2" label="Supprimer" onClick={()=>setConfirm(true)}/></div>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'0 var(--screen-gutter) 40px',display:'flex',flexDirection:'column',gap:18}}>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {country!==note.place&&<span style={{font:'var(--text-overline)',textTransform:'uppercase',letterSpacing:'var(--tracking-overline)',color:'var(--text-muted)'}}>{country}</span>}
        <span style={{font:'var(--text-display-xl)',letterSpacing:'var(--tracking-display)'}}>{note.place}</span>
        <button onClick={()=>showPlace(note.country,note.place)} style={{alignSelf:'flex-start',display:'inline-flex',alignItems:'center',gap:6,minHeight:32,padding:'0 10px 0 8px',marginLeft:-8,border:0,borderRadius:'var(--radius-pill)',background:'transparent',cursor:'pointer',font:'var(--text-caption)',color:'var(--text-muted)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--paper-2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <Icon name="map-pin" size={14} color="var(--accent)"/>{d.date||'Épinglé'}{d.coords?' · '+d.coords:''}</button>
      </div>
      <PhotoTile label={'Photo — '+note.place} ratio="4/3"/>
      <Input label="Note" multiline rows={4} defaultValue={d.note||''} placeholder="Ce que vous voulez retenir…"/>
      {todo.length>0&&<div><div style={{font:'var(--text-label)',color:'var(--text-secondary)',marginBottom:2}}>À faire</div>
        {todo.map(([l,c],i)=><Checkbox key={l} label={l} checked={c} onChange={v=>setTodo(todo.map((t,j)=>j===i?[t[0],v]:t))}/>)}</div>}
      <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{font:'var(--text-label)',color:'var(--text-secondary)'}}>Photos</span><Button variant="ghost" size="sm" icon="camera">Ajouter</Button></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>{[1,2,3,4,5].map(i=><PhotoTile key={i} label="" ratio="1/1" radius="var(--radius-xs)"/>)}</div></div>
    </div>
    <Dialog open={confirm} title={'Supprimer '+note.place+' ?'} actions={<><Button variant="ghost" size="sm" onClick={()=>setConfirm(false)}>Annuler</Button><Button size="sm" onClick={()=>{setConfirm(false);deletePlace(note);}}>Supprimer</Button></>}>Les photos et les notes de ce lieu seront supprimées.</Dialog>
  </div>;
}
window.NoteScreen=NoteScreen;
