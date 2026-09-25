export const activeEvents = (events, now = Date.now()) => events.filter(e => (!e.publishUntil || now < Date.parse(e.publishUntil)) && ((e.weekly===true&&!e.hideAfter) || Date.parse(e.end || e.hideAfter) > now) && (!e.publishAt || Date.parse(e.publishAt) <= now)).sort((a,b) => (a.weekly?Infinity:Date.parse(a.start))-(b.weekly?Infinity:Date.parse(b.start)));
export function slidesFor(data, now = Date.now()) {
  const pool=[...activeEvents(data.events,now).map(item=>({id:`event-${item.id}`,type:'event',item})),{id:'welcome',type:'welcome'},
    ...[['program',data.programs],['faculty',data.faculty],['alumni',data.alumni],['feature',data.features||[]]].flatMap(([type,items])=>items.map(item=>({id:`${type}-${item.id}`,type,item})))];
  if(!data.config?.rotation)return pool;
  const slides=[],used=new Set();
  for(const group of data.config.rotation){
    for(const id of group.ids){
      for(const slide of pool.filter(s=>s.id===id||({events:'event',alumni:'alumni',features:'feature'})[id]===s.type)){
        if(!used.has(slide.id)){slides.push({...slide,group:group.label});used.add(slide.id);}
      }
    }
  }
  // Newly added content remains visible even before an editor places it in a group.
  slides.push(...pool.filter(s=>!used.has(s.id)).map(s=>({...s,group:'MORE'})));
  return slides;
}
export function nextIndex(index, delta, length) { return length ? ((index + delta) % length + length) % length : 0; }
export function clockParts(now, timezone) {
  return {
    date:new Intl.DateTimeFormat('en-US',{timeZone:timezone,weekday:'long',month:'long',day:'numeric'}).format(now),
    time:new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'numeric',minute:'2-digit'}).format(now)
  };
}
export function weatherURL(config) {
  const q=new URLSearchParams({latitude:config.campus.latitude,longitude:config.campus.longitude,current:'temperature_2m,weather_code,is_day',temperature_unit:'fahrenheit',timeformat:'unixtime',timezone:config.timezone});
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}
export function parseWeather(payload, now=Date.now()) {
  const c=payload?.current;
  if (!c || !Number.isFinite(c.temperature_2m) || !Number.isInteger(c.weather_code) || !Number.isFinite(c.time) || c.time*1000>now+300000 || c.time*1000<now-86400000) throw Error('Invalid weather response');
  return {temperature:c.temperature_2m,code:c.weather_code,isDay:c.is_day!==0,observedAt:c.time*1000,fetchedAt:now};
}
export function weatherLabel(code) {
  if(code===0) return 'Clear skies';
  if([1,2].includes(code)) return 'Partly cloudy';
  if(code===3) return 'Overcast';
  if([45,48].includes(code)) return 'Fog';
  if([51,53,55,56,57].includes(code)) return 'Drizzle';
  if([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
  if([71,73,75,77,85,86].includes(code)) return 'Snow';
  if([95,96,99].includes(code)) return 'Thunderstorms';
  return 'Conditions unavailable';
}
export function weatherState(weather, now=Date.now()) {
  if(!weather || !Number.isFinite(weather.temperature) || !Number.isInteger(weather.code) || !Number.isFinite(weather.observedAt) || !Number.isFinite(weather.fetchedAt) || now-weather.observedAt>86400000 || weather.observedAt>now+300000) return 'unavailable';
  return now-weather.observedAt>3600000 || now-weather.fetchedAt>1800000 ? 'stale':'fresh';
}
