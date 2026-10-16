import React from 'react';
export function Switch({checked=false,onChange,label,disabled=false}){
  return <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:44,cursor:disabled?'default':'pointer',opacity:disabled?.5:1}}>
    {label&&<span style={{font:'var(--text-body)',color:'var(--text-primary)'}}>{label}</span>}
    <span role="switch" aria-checked={checked} onClick={()=>!disabled&&onChange&&onChange(!checked)}
      style={{position:'relative',width:44,height:26,flexShrink:0,borderRadius:'var(--radius-pill)',background:checked?'var(--ink-1)':'var(--paper-3)',transition:'background var(--dur-base) var(--ease-out)'}}>
      <span style={{position:'absolute',top:3,left:checked?21:3,width:20,height:20,borderRadius:'50%',background:'var(--paper-0)',boxShadow:'var(--shadow-1)',transition:'left var(--dur-base) var(--ease-out)'}}/>
    </span>
  </label>;
}
