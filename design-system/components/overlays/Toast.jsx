import React from 'react';
import { Icon } from '../display/Icon.jsx';
export function Toast({message,icon,action,onAction,visible=true}){
  return <div role="status" style={{display:'flex',alignItems:'center',gap:10,minHeight:44,padding:'0 8px 0 14px',background:'var(--surface-inverse)',color:'var(--text-inverse)',
    borderRadius:'var(--radius-md)',boxShadow:'var(--shadow-2)',font:'var(--text-body-s)',opacity:visible?1:0,transform:visible?'none':'translateY(8px)',transition:'all var(--dur-base) var(--ease-out)'}}>
    {icon&&<Icon name={icon} size={18}/>}<span style={{flex:1,padding:'10px 0'}}>{message}</span>
    {action&&<button onClick={onAction} style={{height:32,padding:'0 10px',border:0,background:'transparent',color:'var(--terracotta-300)',font:'var(--text-label)',cursor:'pointer'}}>{action}</button>}
  </div>;
}
