import {mic,check,muted} from './voice-icons.js';

// Independent from rotation: losing the control service never stops the slides.
export function startControls({apply,status}){
 let token='',after=0,epoch='',inflight=false,settings=null,shownUntil=0,voiceUntil=0;
 const root=document.querySelector('#display');
 const hint=document.createElement('div');hint.id='voice-hint';hint.setAttribute('role','status');
 const glow=document.createElement('div');glow.id='voice-glow';glow.setAttribute('aria-hidden','true');
 const voice=document.createElement('section');voice.id='voice-overlay';voice.hidden=true;voice.setAttribute('role','status');voice.setAttribute('aria-live','polite');
 const panel=document.createElement('div');panel.id='remote-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Lounge remote');
 panel.innerHTML='<div class="remote-panel-card"><h2>Scan for slide controls</h2><img alt="QR: open lounge remote"><p class="remote-network">Connect your device to “Campus” Wi-Fi.</p><p class="remote-countdown" role="timer">Closes in <span>60</span>s</p></div>';
 document.querySelector('.rotation-strip').append(hint);
 root.append(glow,voice,panel);
 let micOnline=null;
 function health(online){
  if(micOnline===online)return;
  micOnline=online;
  hint.classList.toggle('offline',!online);
  hint.innerHTML=online?`${mic}<span>Try “Hey, Monty” for kiosk controls.</span>`:`${muted}<span>Voice unavailable</span>`;
 }
 let motion=null,transition=0,closing=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let remoteMotion=[],remoteRevision=0,remoteClosing=false,pendingRemote=false,remoteReadyAt=0;
 const card=panel.querySelector('.remote-panel-card');
 function cancelRemoteMotion(){remoteMotion.forEach(a=>a.cancel());remoteMotion=[];}
 function openRemote(){
  pendingRemote=false;remoteReadyAt=0;remoteRevision++;remoteClosing=false;cancelRemoteMotion();
  panel.hidden=false;shownUntil=Date.now()+60000;
  panel.querySelector('.remote-countdown span').textContent='60';
  const options={duration:reduced()?0:800,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'};
  remoteMotion=[panel.animate([{opacity:0},{opacity:1}],options),card.animate([{translate:'0 22px',scale:'.965'},{translate:'0 0',scale:'1'}],options)];
 }
 function closeRemote(){
  pendingRemote=false;remoteReadyAt=0;shownUntil=0;
  if(panel.hidden||remoteClosing)return;
  const opacity=getComputedStyle(panel).opacity;const revision=++remoteRevision;
  remoteClosing=true;cancelRemoteMotion();
  const options={duration:reduced()?0:750,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'};
  remoteMotion=[panel.animate([{opacity},{opacity:0}],options),card.animate([{translate:'0 0',scale:'1'},{translate:'0 20px',scale:'.975'}],options)];
  remoteMotion[0].finished.then(()=>{if(revision===remoteRevision){panel.hidden=true;remoteClosing=false;cancelRemoteMotion();}}).catch(()=>{});
 }
 function stopMotion(){motion?.cancel();motion=null;}
 function rest(){
  voiceUntil=0;root.dataset.voice='idle';
  if(voice.hidden||closing)return;
  closing=true;const revision=++transition;
  const opacity=getComputedStyle(voice).opacity;stopMotion();
  motion=voice.animate([{opacity,translate:'0 0',scale:'1'},{opacity:0,translate:'0 20px',scale:'.975'}],{duration:reduced()?0:750,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  motion.finished.then(()=>{if(revision===transition){voice.hidden=true;closing=false;stopMotion();}}).catch(()=>{});
 }
 async function present(markup,mode,hold){
  const expiresAt=Date.now()+hold;
  const revision=++transition;const wasOpen=!voice.hidden&&!closing;
  closing=false;stopMotion();voiceUntil=0;
  root.dataset.voice=mode;
  if(wasOpen&&!reduced()){
   motion=voice.animate([{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -8px'}],{duration:230,easing:'ease-in-out',fill:'forwards'});
   try{await motion.finished;}catch{return;}
   if(revision!==transition)return;
   stopMotion();
  }
  voice.dataset.mode=mode;voice.innerHTML=markup;voice.hidden=false;
  motion=voice.animate([{opacity:0,translate:'0 22px',scale:'.965'},{opacity:1,translate:'0 0',scale:'1'}],{duration:reduced()?0:800,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
  voiceUntil=expiresAt;
 }

 function listening(seconds=8){
  if(seconds<=0)return;
  closeRemote();
  const markup=`<div class="voice-heading"><div class="voice-symbol">${mic}</div><div><h2 aria-label="I’m listening"><span class="listening-phrase" aria-hidden="true">${Array.from('I’m listening ...',(letter,i)=>`<span style="--letter:${i}">${letter===' '?'&#160;':letter}</span>`).join('')}</span></h2></div></div><div class="voice-commands"><span>Pause</span><span>Resume</span><span>Next</span><span>Previous</span></div><div class="voice-note">Say a command to control the slides; other inputs are ignored as this isn’t a chat assistant.</div>`;
  present(markup,'listening',seconds*1000);
 }
 const labels={next:'Next slide',previous:'Previous slide',pause:'Paused for 5 minutes',resume:'Playing again',controls:'Opening the remote',dismiss:'Remote closed'};
 function heard(action){
  const markup=`<div class="voice-heading"><div class="voice-symbol">${check}</div><div><div class="voice-label">HEARD YOU</div><h2>${labels[action]||'Done'}</h2></div></div>`;
  present(markup,'heard',2800);
 }
 function command(c){
  if(c.action==='wake'){listening(8-(c.age||0));return;}
  if(c.action==='controls'){
   closeRemote();
   if(c.source==='voice'){pendingRemote=true;remoteReadyAt=0;}
   else{rest();pendingRemote=true;remoteReadyAt=0;}
  }
  else if(c.action==='dismiss'){closeRemote();}

  else{pendingRemote=false;remoteReadyAt=0;apply(c.action);}
  if(c.source==='voice')heard(c.action);
 }
 health(false);
 setInterval(()=>{
  if(voiceUntil&&Date.now()>voiceUntil)rest();
  if(shownUntil){
   panel.querySelector('.remote-countdown span').textContent=Math.max(0,Math.ceil((shownUntil-Date.now())/1000));
   if(Date.now()>=shownUntil)closeRemote();
  }
  if(pendingRemote&&voice.hidden){
   if(!remoteReadyAt)remoteReadyAt=Date.now()+(reduced()?0:180);
   if(Date.now()>=remoteReadyAt)openRemote();
  }
 },200);
 // Loopback-only design preview. It never connects to or controls the Pi.
 const demo=new URLSearchParams(location.search).get('voice-demo');
 if(demo&&['127.0.0.1','localhost'].includes(location.hostname)){
  function preview(state){if(!['listening','heard'].includes(state))rest();closeRemote();health(state!=='offline');if(state==='listening')listening();if(state==='heard')heard('next');if(state==='controls')command({action:'controls',source:'voice'});}
  panel.querySelector('img').src='/qr/remote.svg';
  preview(demo);document.addEventListener('keydown',e=>{const state={'1':'idle','2':'listening','3':'heard','4':'offline','5':'controls'}[e.key];if(state)preview(state);});return;
 }
 async function api(path,data){
  const r=await fetch(path,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),cache:'no-store',signal:AbortSignal.timeout(3000)});
  if(!r.ok)throw Error('Remote unavailable');return r.json();
 }
 async function poll(){
  if(inflight)return;inflight=true;
  try{
   if(!token){
    settings=await api('/api/display/bootstrap');token=settings.token;after=settings.sequence;epoch=settings.epoch;
    panel.querySelector('img').src='/qr/remote.svg';
    const qr=await fetch('/control-settings.json',{cache:'no-store',signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)throw Error('QR settings unavailable');return r.json();});
    const ready=settings.qrEnabled!==false&&qr.url===settings.url;
    panel.querySelector('img').hidden=!ready;
    panel.querySelector('h2').textContent=ready?'Scan for slide controls':'Phone remote unavailable';
   }
   const batch=await api(`/api/display/commands?after=${after}`);
   if(batch.epoch!==epoch){token='';rest();return;}
   for(const c of batch.commands)command(c);
   after=batch.sequence;
   await api('/api/display/status',{...status(),ack:after});
   const live=await api('/api/state');health(live.voiceOnline);
   if(!live.voiceOnline&&root.dataset.voice==='listening')rest();
  }catch{token='';health(false);rest();closeRemote();}finally{inflight=false;}
 }
 poll();setInterval(poll,500);
}
