import React from 'react';
const DOT={visited:'var(--state-visited)',wish:'var(--state-wish)',unexplored:'var(--state-unexplored)'};
export function FilterChip({status,label,count,selected=true,onClick}){
  return <button onClick={onClick} aria-pressed={selected}
    style={{display:'inline-flex',alignItems:'center',gap:8,height:36,padding:'0 12px',whiteSpace:'nowrap',cursor:'pointer',
      background:selected?'var(--surface-raised)':'transparent',border:`1px solid ${selected?'var(--border-strong)':'var(--border-default)'}`,borderRadius:'var(--radius-pill)',
      color:selected?'var(--text-primary)':'var(--text-muted)',font:'var(--text-label)',boxShadow:selected?'var(--shadow-1)':'none',transition:'all var(--dur-base) var(--ease-out)'}}>
    {status&&<span style={{width:10,height:10,borderRadius:'50%',background:selected?DOT[status]:'transparent',boxShadow:`inset 0 0 0 1.5px ${status==='unexplored'||!selected?'var(--ink-3)':DOT[status]}`}}/>}
    {label}{count!=null&&<span style={{color:'var(--text-muted)',fontWeight:400,fontVariantNumeric:'tabular-nums'}}>{count}</span>}
  </button>;
}
