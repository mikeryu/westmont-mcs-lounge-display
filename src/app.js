import {weatherIcon} from './weather-icons.js';
import {slidesFor,nextIndex,clockParts,weatherURL,parseWeather,weatherLabel,weatherState} from './core.js';
const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo=(path,alt)=>`<img src="${escape(path)}" alt="${escape(alt)}">`;
let data,slides,index=0,paused=false,deadline,weather=null;
const dateFormat=(date,options)=>new Intl.DateTimeFormat('en-US',{timeZone:data.config.timezone,...options}).format(date);
function fit(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));}
fit();addEventListener('resize',fit);
function render(){
  const slide=slides[index],p=slide.item;
  let html='';
  if(slide.type==='welcome') html=`<div class="welcome-copy"><h1>You belong<br>here.</h1><div class="welcome-programs">Mathematics<br>Computer Science<br>Data Analytics</div></div><div class="welcome-photo">${photo(data.config.welcomePhoto,'Students collaborating at Mathematics Field Day')}</div>`;
  if(slide.type==='faculty') html=`<div class="faculty-photo">${photo(p.photo,p.name)}</div><div class="faculty-copy"><div class="eyebrow">MEET OUR FACULTY</div><h1>${escape(p.name)}</h1><p class="faculty-focus">${escape(p.displayFocus)}</p><div class="faculty-office">${escape(p.office)}</div>${p.availability&&Date.parse(p.availability.until)>Date.now()?`<div class="availability">${escape(p.availability.text)}</div>`:''}</div>`;
  if(slide.type==='alumni') html=`<div class="alumni-copy"><div class="eyebrow">BEYOND WESTMONT / CLASS OF ${p.classYear}</div><h1>${escape(p.name)}</h1><p>${escape(p.displayStory)}</p></div><div class="alumni-art">${p.photo?photo(p.photo,p.name):`<span class="alumni-year">’${String(p.classYear).slice(-2)}</span>`}</div>`;
  if(slide.type==='program') html=`<div class="program-copy"><div class="eyebrow">EXPLORE THE PROGRAM</div><h1>${escape(p.name)}</h1><p>${escape(p.headline)}</p></div><div class="program-initials">${escape(p.shortName)}</div>`;
  if(slide.type==='event'){
    const start=new Date(p.start);
    html=`<div class="event-title"><div class="eyebrow">${escape(p.kind)}</div><h1>${escape(p.name)}</h1></div><div class="event-details"><strong>${dateFormat(start,{weekday:'long'})}</strong><span>${dateFormat(start,{month:'long',day:'numeric'})}</span><strong class="event-time">${clockParts(start,data.config.timezone).time}</strong><span>${escape(p.location)}</span></div><div class="event-rsvp"><span>RSVP required · ${escape(p.rsvpContact)}</span><strong>${escape(p.rsvpEmail)}</strong></div>`;
  }
  if(slide.type==='feature') html=`<div class="feature-photo">${photo(p.photo,'CATLab students at the beach')}</div><div class="feature-copy"><h1>${escape(p.name)}</h1><p>${escape(p.displayStory)}</p></div>`;
  if(slide.type==='conditions') html='<div class="conditions-time"><div class="eyebrow">HERE AT WESTMONT</div><h1 id="large-clock"></h1><p id="large-date"></p></div><div class="conditions-weather"><span class="weather-icon" id="large-weather-icon"></span><strong id="large-temperature"></strong><p id="large-weather"></p><div id="large-weather-note"></div><small>Weather by Open-Meteo</small></div>';
  $('#slide').className=slide.type;$('#slide').innerHTML=html;
  $('#section').textContent=({welcome:'THE LOUNGE',faculty:'OUR FACULTY',alumni:'OUR ALUMNI',program:'OUR PROGRAMS',event:'YOU’RE INVITED',feature:'CATLAB',conditions:'CAMPUS NOW'})[slide.type];
  $('#position').textContent=`${index+1} / ${slides.length}`;
  $('#pause').hidden=!paused;
  deadline=Date.now()+data.config.slideSeconds*1000;
}
function tick(){
  const now=Date.now(),clock=clockParts(now,data.config.timezone);
  $('#clock').textContent=clock.time;
  $('#date').textContent=dateFormat(now,{weekday:'short',month:'short',day:'numeric'});
  const nextSlides=slidesFor(data,now);
  if(nextSlides.map(s=>s.id).join()!==slides.map(s=>s.id).join()){
    const id=slides[index].id;slides=nextSlides;index=Math.max(0,slides.findIndex(s=>s.id===id));render();
  }
  if(!paused&&now>=deadline){index=nextIndex(index,1,slides.length);render();}
  $('#progress').style.transform=`scaleX(${paused?0:Math.max(0,Math.min(1,1-(deadline-now)/(data.config.slideSeconds*1000)))})`;
  const state=weatherState(weather,now),available=state!=='unavailable';
  const label=available?weatherLabel(weather.code):'Weather unavailable';
  const temperature=available?`${Math.round(weather.temperature)}°F`:'—';
  const note=state==='stale'?'Last known conditions':'Westmont College';
  $('#weather').textContent=available?`${temperature} · ${label}`:label;
  $('#weather-note').textContent=note;
  const icon=weatherIcon(available?weather.code:null,weather?.isDay!==false);
  if($('#weather-icon').dataset.icon!==icon){$('#weather-icon').innerHTML=icon;$('#weather-icon').dataset.icon=icon;}
  if($('#large-clock')){
    $('#large-clock').textContent=clock.time;$('#large-date').textContent=clock.date;
    $('#large-weather-icon').innerHTML=icon;$('#large-temperature').textContent=temperature;$('#large-weather').textContent=label;
    $('#large-weather-note').textContent=state==='stale'?'Last known conditions':available?'Current conditions':'Waiting for a connection';
  }
  document.querySelectorAll('.availability').forEach(el=>{if(Date.parse(slides[index].item?.availability?.until)<=now)el.remove();});
}
async function refreshWeather(){
  try{
    const response=await fetch(weatherURL(data.config),{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Weather unavailable');
    weather=parseWeather(await response.json());
    try{localStorage.setItem('mcs-weather',JSON.stringify(weather));}catch{}
  }catch{/* Retain observations, with staleness and expiry checked by tick. */}
  tick();
}
async function boot(){
  const response=await fetch('content.json',{cache:'no-store'});
  if(!response.ok)throw Error('Content unavailable');
  data=await response.json();slides=slidesFor(data);
  try{weather=JSON.parse(localStorage.getItem('mcs-weather'));}catch{}
  await document.fonts.ready;
  render();tick();setInterval(tick,1000);refreshWeather();setInterval(refreshWeather,data.config.weatherRefreshMinutes*60000);
  document.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft',' ','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key===' ')paused=!paused;
    else index=event.key==='Home'?0:nextIndex(index,event.key==='ArrowRight'?1:-1,slides.length);
    render();tick();
  });
}
boot().catch(()=>{
  $('#slide').innerHTML='<div class="welcome-copy"><h1>Welcome.</h1><p>The display is reconnecting.</p></div>';
  setTimeout(()=>location.reload(),30000);
});
