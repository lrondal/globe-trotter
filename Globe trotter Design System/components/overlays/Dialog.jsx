import React from 'react';
export function Dialog({open=true,title,children,actions,absolute=true}){
  if(!open) return null;
  return <div style={{position:absolute?'absolute':'relative',inset:0,zIndex:25,display:'flex',alignItems:'center',justifyContent:'center',padding:24,background:absolute?'var(--surface-scrim)':'transparent'}}>
    <div role="dialog" style={{width:'100%',maxWidth:320,background:'var(--surface-raised)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-2)',padding:'22px 20px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {title&&<div style={{font:'var(--text-display-s)',letterSpacing:'var(--tracking-display)'}}>{title}</div>}
      <div style={{font:'var(--text-body)',color:'var(--text-secondary)',textWrap:'pretty'}}>{children}</div>
      {actions&&<div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>{actions}</div>}
    </div>
  </div>;
}
