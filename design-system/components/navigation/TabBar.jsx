import React from 'react';
import { Icon } from '../display/Icon.jsx';
export function TabBar({items=[],value,onChange}){
  return <nav style={{display:'flex',background:'var(--surface-raised)',borderTop:'1px solid var(--border-default)',padding:'6px 8px 0'}}>
    {items.map(it=>{const on=it.id===value;return <button key={it.id} onClick={()=>onChange&&onChange(it.id)} aria-current={on}
      style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,minHeight:48,padding:'4px 0',border:0,background:'transparent',cursor:'pointer',
        color:on?'var(--text-primary)':'var(--ink-4)',font:'var(--weight-medium) 11px/1.2 var(--font-sans)',transition:'color var(--dur-fast)'}}>
      <Icon name={it.icon} size={24}/>{it.label}</button>;})}
  </nav>;
}
