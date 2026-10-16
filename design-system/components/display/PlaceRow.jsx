import React from 'react';
import { Icon } from './Icon.jsx';
import { PhotoTile } from './PhotoTile.jsx';
const DOT={visited:'var(--state-visited)',wish:'var(--state-wish)',unexplored:'var(--state-unexplored)'};
export function PlaceRow({name,meta,status='visited',photo,showPhoto=true,onClick,last=false}){
  const [p,setP]=React.useState(false);
  return <div role="button" onClick={onClick} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)} onMouseLeave={()=>setP(false)}
    style={{display:'flex',alignItems:'center',gap:12,minHeight:56,padding:'8px 0',cursor:'pointer',borderBottom:last?'none':'1px solid var(--border-default)',background:p?'var(--paper-2)':'transparent',transition:'background var(--dur-fast)'}}>
    {showPhoto&&<PhotoTile src={photo} label="" ratio="1/1" radius="var(--radius-sm)" style={{width:44,flexShrink:0}}/>}
    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:2}}>
      <span style={{font:'var(--text-body-strong)',color:'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
      {meta&&<span style={{font:'var(--text-body-s)',color:'var(--text-muted)'}}>{meta}</span>}
    </div>
    <span style={{width:8,height:8,borderRadius:'50%',background:DOT[status],boxShadow:status==='unexplored'?'inset 0 0 0 1px var(--ink-3)':'none'}}/>
    <Icon name="chevron-right" size={18} color="var(--ink-4)"/>
  </div>;
}
