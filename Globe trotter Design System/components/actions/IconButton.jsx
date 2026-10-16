import React from 'react';
import { Icon } from '../display/Icon.jsx';
export function IconButton({icon,label,variant='ghost',size='md',active=false,disabled=false,onClick,style}){
  const [st,setSt]=React.useState('idle');
  const d=size==='sm'?36:44;
  const base={ghost:{bg:'transparent',bd:'transparent',sh:'none'},outline:{bg:'var(--surface-raised)',bd:'var(--border-strong)',sh:'none'},raised:{bg:'var(--surface-raised)',bd:'var(--border-default)',sh:'var(--shadow-2)'}}[variant];
  const bg=active?'var(--ink-1)':st==='idle'?base.bg:'var(--paper-2)';
  return <button aria-label={label} title={label} disabled={disabled} onClick={onClick}
    onMouseEnter={()=>setSt('hover')} onMouseLeave={()=>setSt('idle')} onMouseDown={()=>setSt('press')} onMouseUp={()=>setSt('hover')}
    style={{width:d,height:d,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0,
      background:bg,color:active?'var(--text-inverse)':disabled?'var(--text-disabled)':'var(--text-primary)',border:`1px solid ${active?'transparent':base.bd}`,
      borderRadius:variant==='raised'?'var(--radius-pill)':'var(--radius-md)',boxShadow:base.sh,cursor:disabled?'default':'pointer',
      transform:st==='press'?'scale(.94)':'none',transition:'background var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out)',...style}}>
    <Icon name={icon} size={size==='sm'?18:20}/>
  </button>;
}
