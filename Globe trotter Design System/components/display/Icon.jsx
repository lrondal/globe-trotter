import React from 'react';
const CDN='https://cdn.jsdelivr.net/npm/lucide-static@0.452.0/icons/';
export function Icon({name,size=20,color='currentColor',style}){
  const url=`url(${CDN}${name}.svg)`;
  return <span aria-hidden="true" style={{display:'inline-block',width:size,height:size,flexShrink:0,background:color,
    WebkitMaskImage:url,maskImage:url,WebkitMaskSize:'contain',maskSize:'contain',WebkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',WebkitMaskPosition:'center',maskPosition:'center',...style}}/>;
}
