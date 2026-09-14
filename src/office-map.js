// Top-down lounge layout supplied by the department; viewer faces the TV/north.
export const officePositions = {
  'mike-ryu': {side:'left',row:0,label:'Mike',direction:'Ahead to your left'},
  'kyle-hansen': {side:'left',row:1,label:'Kyle',direction:'To your left'},
  'maryke-van-der-walt': {side:'left',row:2,label:'Maryke',direction:'Behind you to the left'},
  'russell-howell': {side:'left',row:3,label:'Russ',direction:'Farther behind to the left'},
  'anna-aboud': {side:'right',row:0,label:'Anna',direction:'Ahead to your right'},
  'guang-song': {side:'right',row:1,label:'Guang',direction:'To your right'},
  'patti-hunter': {side:'right',row:2,label:'Patti',direction:'Behind you to the right'}
};
export function officeArrow(id){
  const p=officePositions[id];
  if(!p)return '';
  const x=p.side==='left'?-120:120,y=40+p.row*70-95;
  const angle=Math.atan2(y,x)*180/Math.PI;
  return `<svg class="office-arrow" viewBox="0 0 100 100" aria-hidden="true"><path d="M20 50H80M58 28L80 50 58 72" transform="rotate(${angle} 50 50)" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export function officeMap(id){
  const rooms=[...Object.entries(officePositions).map(([key,p])=>({...p,key})),{side:'right',row:3,label:'Env. Sci.',key:'environmental-science'}];
  return `<svg class="office-map" viewBox="0 0 340 340" role="img" aria-label="Top-down office map, facing the TV. Your location is below the TV; entrance is behind you. Highlighted office: ${officePositions[id]?.label||''}.">
  ${rooms.map(p=>`<rect x="${p.side==='left'?5:235}" y="${p.row*70+12}" width="100" height="56" rx="7" fill="${p.key===id?'#9d2235':'#eeece6'}"/><text x="${p.side==='left'?55:285}" y="${p.row*70+47}" text-anchor="middle" fill="${p.key===id?'white':'#63666a'}">${p.label}</text>`).join('')}
  <rect x="122" y="64" width="96" height="16" rx="3" fill="#25272a"/><text x="170" y="54" text-anchor="middle">TV</text>
  <circle cx="170" cy="95" r="7" fill="#9d2235"/><text x="170" y="126" text-anchor="middle" class="map-you">YOU</text>
  <path d="M170 264V298m-8-8 8 8 8-8" fill="none" stroke="#63666a" stroke-width="3"/><text x="170" y="326" text-anchor="middle">Entrance</text></svg>`;
}
