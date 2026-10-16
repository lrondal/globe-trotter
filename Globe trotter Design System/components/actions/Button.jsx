import React from 'react';
import { Icon } from '../display/Icon.jsx';
const SIZES={md:{h:44,px:18,fs:'var(--size-body)'},sm:{h:36,px:14,fs:'var(--size-body-s)'}};
export function Button({variant='primary',size='md',icon,iconRight,fullWidth=false,disabled=false,onClick,children,type='button',style}){
  const [st,setSt]=React.useState('idle');
  const s=SIZES[size]||SIZES.md;
  const V={
    primary:{bg:'var(--ink-1)',bgH:'var(--ink-2)',fg:'var(--text-inverse)',bd:'transparent'},
    accent:{bg:'var(--accent)',bgH:'var(--accent-hover)',bgP:'var(--accent-press)',fg:'var(--text-on-accent)',bd:'transparent'},
    secondary:{bg:'var(--surface-raised)',bgH:'var(--paper-2)',fg:'var(--text-primary)',bd:'var(--border-strong)'},
    ghost:{bg:'transparent',bgH:'var(--paper-2)',fg:'var(--text-primary)',bd:'transparent'},
  }[variant]||{};
  const bg=disabled?(variant==='ghost'?'transparent':'var(--paper-2)'):st==='press'?(V.bgP||V.bgH):st==='hover'?V.bgH:V.bg;
  return <button type={type} disabled={disabled} onClick={onClick}
    onMouseEnter={()=>setSt('hover')} onMouseLeave={()=>setSt('idle')} onMouseDown={()=>setSt('press')} onMouseUp={()=>setSt('hover')}
    style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,height:s.h,padding:`0 ${s.px}px`,width:fullWidth?'100%':undefined,
      background:bg,color:disabled?'var(--text-disabled)':V.fg,border:`1px solid ${disabled?'transparent':V.bd}`,borderRadius:'var(--radius-md)',
      font:`var(--weight-medium) ${s.fs}/1 var(--font-sans)`,cursor:disabled?'default':'pointer',whiteSpace:'nowrap',
      transform:st==='press'&&!disabled?'scale(.98)':'none',transition:'background var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out)',...style}}>
    {icon&&<Icon name={icon} size={size==='sm'?16:18}/>}{children}{iconRight&&<Icon name={iconRight} size={size==='sm'?16:18}/>}
  </button>;
}
