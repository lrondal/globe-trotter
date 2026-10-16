import React from 'react';
import { Icon } from '../display/Icon.jsx';
export function Checkbox({checked=false,onChange,label,disabled=false}){
  return <label onClick={e=>{e.preventDefault();!disabled&&onChange&&onChange(!checked);}} style={{display:'flex',alignItems:'center',gap:12,minHeight:44,cursor:disabled?'default':'pointer',opacity:disabled?.5:1}}>
    <span role="checkbox" aria-checked={checked} style={{width:20,height:20,flexShrink:0,display:'inline-flex',alignItems:'center',justifyContent:'center',
      borderRadius:'var(--radius-xs)',border:`1.5px solid ${checked?'var(--ink-1)':'var(--ink-3)'}`,background:checked?'var(--ink-1)':'transparent',color:'var(--text-inverse)',transition:'background var(--dur-fast)'}}>
      {checked&&<Icon name="check" size={14}/>}</span>
    {label&&<span style={{font:'var(--text-body)',color:checked?'var(--text-muted)':'var(--text-primary)',textDecoration:checked?'line-through':'none'}}>{label}</span>}
  </label>;
}
