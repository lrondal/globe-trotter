import React from 'react';
export function SegmentedControl({options=[],value,onChange,fullWidth=false}){
  return <div role="tablist" style={{display:fullWidth?'flex':'inline-flex',gap:2,padding:3,background:'var(--surface-raised)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-md)'}}>
    {options.map(o=>{const v=typeof o==='string'?o:o.value,l=typeof o==='string'?o:o.label,on=v===value;
      return <button key={v} role="tab" aria-selected={on} onClick={()=>onChange&&onChange(v)}
        style={{flex:fullWidth?1:'none',height:32,padding:'0 14px',border:0,borderRadius:'var(--radius-sm)',cursor:'pointer',whiteSpace:'nowrap',
          background:on?'var(--ink-1)':'transparent',color:on?'var(--text-inverse)':'var(--text-muted)',font:'var(--text-label)',transition:'background var(--dur-base) var(--ease-out),color var(--dur-base)'}}>{l}</button>;})}
  </div>;
}
