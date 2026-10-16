import React from 'react';
export function PhotoTile({src,label,caption,ratio='4/3',radius='var(--radius-md)',shape='rect',style}){
  const round=shape==='circle';
  return <div style={{position:'relative',aspectRatio:round?'1/1':ratio,borderRadius:round?'50%':radius,overflow:'hidden',background:'var(--paper-2)',
    border:round?'2px solid var(--surface-raised)':'none',...style}}>
    {src?<img src={src} alt={label||''} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      :<div style={{position:'absolute',inset:0,display:'flex',alignItems:'flex-end',padding:round?0:10,justifyContent:round?'center':'flex-start',alignContent:'center',
        backgroundImage:'repeating-linear-gradient(135deg,transparent 0 7px,rgba(27,26,23,.045) 7px 8px)'}}>
        <span style={{font:'var(--text-caption)',color:'var(--text-muted)',alignSelf:round?'center':'flex-end'}}>{label}</span></div>}
    {caption&&src&&<div style={{position:'absolute',left:0,right:0,bottom:0,padding:'24px 10px 8px',background:'linear-gradient(transparent,rgba(27,26,23,.55))',color:'#fff',font:'var(--text-caption)'}}>{caption}</div>}
  </div>;
}
