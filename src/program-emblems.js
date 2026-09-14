// Original subject illustrations, not official College marks. Lightweight static SVG.
export function programEmblem(id){
 const art={
  mathematics:`<g transform="translate(200 200)">${[0,30,60,90,120,150].map(a=>`<ellipse rx="142" ry="58" transform="rotate(${a})"/>`).join('')}<circle r="156"/><circle r="12" fill="currentColor" stroke="none"/></g>`,
  'computer-science':`<rect x="108" y="108" width="184" height="184" rx="24"/><rect x="128" y="128" width="144" height="144" rx="12"/><path d="M182 169l-30 31 30 31m36-62 30 31-30 31"/>${[142,180,220,258].map(v=>`<path d="M${v} 62v46m0 184v46M62 ${v}h46m184 0h46"/><circle cx="${v}" cy="54" r="7"/><circle cx="${v}" cy="346" r="7"/><circle cx="54" cy="${v}" r="7"/><circle cx="346" cy="${v}" r="7"/>`).join('')}`,
  'data-analytics':`<circle cx="200" cy="200" r="156" stroke-opacity=".45"/><path d="M85 280H315M104 280v-57h35v57m43 0V173h35v107m43 0V117h35v163"/><path d="M96 194l68-54 70 17 70-78"/>${[[96,194],[164,140],[234,157],[304,79]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="currentColor" stroke="none"/>`).join('')}`
 }[id]||'';
 return `<svg viewBox="0 0 400 400" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${art}</svg>`;
}
