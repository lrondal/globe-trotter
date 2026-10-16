import React from 'react';
const S={visited:{bg:'var(--state-visited)',fg:'var(--text-on-accent)',l:'Visité'},wish:{bg:'var(--state-wish)',fg:'var(--state-wish-ink)',l:'À visiter'},unexplored:{bg:'transparent',fg:'var(--text-muted)',l:'Non exploré',bd:'var(--border-strong)'}};
export function StatusBadge({status='visited',children,size='md'}){
  const s=S[status]||S.visited;
  return <span style={{display:'inline-flex',alignItems:'center',height:size==='sm'?20:24,padding:size==='sm'?'0 7px':'0 9px',whiteSpace:'nowrap',
    background:s.bg,color:s.fg,border:`1px solid ${s.bd||'transparent'}`,borderRadius:'var(--radius-sm)',font:size==='sm'?'var(--weight-medium) 11px/1 var(--font-sans)':'var(--text-label)'}}>{children||s.l}</span>;
}
