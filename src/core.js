export const activeEvents = (events, now = Date.now()) => events.filter(e => Date.parse(e.end || e.hideAfter) > now && (!e.publishAt || Date.parse(e.publishAt) <= now)).sort((a,b) => Date.parse(a.start)-Date.parse(b.start));
export function slidesFor(data, now = Date.now()) {
  const slides = [{id:'welcome',type:'welcome'}];
  slides.push(...activeEvents(data.events,now).map(item=>({id:`event-${item.id}`,type:'event',item})));
  const count = Math.max(data.programs.length, data.faculty.length, data.alumni.length, (data.features||[]).length);
  for(let i=0;i<count;i++) {
    for(const [type,items] of [['program',data.programs],['faculty',data.faculty],['alumni',data.alumni],['feature',data.features||[]]]) {
      if(items[i]) slides.push({id:`${type}-${items[i].id}`,type,item:items[i]});
    }
    if(i===0) slides.push({id:'conditions',type:'conditions'});
  }
  if(!count) slides.push({id:'conditions',type:'conditions'});
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
