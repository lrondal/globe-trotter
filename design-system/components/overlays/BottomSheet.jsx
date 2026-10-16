import React from 'react';
const H={peek:'28%',half:'52%',full:'calc(100% - 56px)'};
export function BottomSheet({open=true,snap='half',onSnap,children,header,absolute=true}){
  const order=['peek','half','full'];
  const cycle=()=>onSnap&&onSnap(order[(order.indexOf(snap)+1)%order.length]);
  return <div style={{position:absolute?'absolute':'relative',left:0,right:0,bottom:0,height:absolute?H[snap]:'auto',zIndex:20,
    transform:open?'none':'translateY(105%)',transition:'transform var(--dur-slow) var(--ease-out),height var(--dur-slow) var(--ease-out)',
    background:'var(--surface-raised)',borderRadius:'var(--radius-xl) var(--radius-xl) 0 0',boxShadow:'var(--shadow-sheet)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
    <div onClick={cycle} style={{padding:'8px 0 4px',display:'flex',justifyContent:'center',cursor:'pointer',flexShrink:0}}><span style={{width:36,height:4,borderRadius:2,background:'var(--paper-4)'}}/></div>
    {header&&<div style={{padding:'4px var(--screen-gutter) 12px',flexShrink:0}}>{header}</div>}
    <div style={{flex:1,overflowY:'auto',padding:'0 var(--screen-gutter) 24px'}}>{children}</div>
  </div>;
}
