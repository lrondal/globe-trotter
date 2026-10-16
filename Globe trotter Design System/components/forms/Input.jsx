import React from 'react';
import { Icon } from '../display/Icon.jsx';
export function Input({label,value,defaultValue,placeholder,icon,multiline=false,rows=4,onChange,variant='default',style}){
  const [f,setF]=React.useState(false);
  const Tag=multiline?'textarea':'input';
  const pill=variant==='search';
  return <label style={{display:'flex',flexDirection:'column',gap:6,...style}}>
    {label&&<span style={{font:'var(--text-label)',color:'var(--text-secondary)'}}>{label}</span>}
    <span style={{display:'flex',alignItems:multiline?'flex-start':'center',gap:8,minHeight:44,padding:multiline?'12px 14px':'0 14px',
      background:'var(--surface-raised)',border:`1px solid ${f?'var(--border-focus)':'var(--border-strong)'}`,borderRadius:pill?'var(--radius-pill)':'var(--radius-md)',
      boxShadow:pill?'var(--shadow-1)':'none',transition:'border-color var(--dur-fast)'}}>
      {icon&&<Icon name={icon} size={18} color="var(--ink-3)"/>}
      <Tag value={value} defaultValue={defaultValue} placeholder={placeholder} rows={multiline?rows:undefined} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        onChange={e=>onChange&&onChange(e.target.value)}
        style={{flex:1,minWidth:0,border:0,outline:0,background:'transparent',padding:0,resize:'none',font:'var(--text-body)',color:'var(--text-primary)'}}/>
    </span>
  </label>;
}
