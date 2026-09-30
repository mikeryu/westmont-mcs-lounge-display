const $=s=>document.querySelector(s);let waiting=0,busy=false;
async function request(path,data){
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed');return result;
}
async function status(){
 try{const r=await fetch('/api/state',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error();const s=await r.json();
 $('#connection').textContent=s.online?'Connected to the lounge':'Display offline';$('#title').textContent=s.title||'Waiting for the display';$('#playback').textContent=s.paused?'Paused · remote pauses resume after 5 minutes':`Playing · Slide ${Number(s.index)+1} of ${s.count}`;
 $('#phrase').textContent=`“${s.voicePhrase || 'Hey Monty'}, controls.”`;
 $('#voice-status').textContent=s.voiceOnline?`Microphone active · ${s.voiceMode} · processed locally`:'Voice is offline or not enabled. Phone controls still work.';
 document.querySelectorAll('[data-action]').forEach(b=>b.disabled=!s.online||busy);
 if(waiting&&s.ack>=waiting){$('#feedback').textContent='Done — display updated.';waiting=0;}
 }catch{$('#connection').textContent='Cannot reach the display';document.querySelectorAll('[data-action]').forEach(b=>b.disabled=true);}
}
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',async()=>{
 busy=true;try{const result=await request('/api/command',{action:button.dataset.action});waiting=result.sequence;$('#feedback').textContent='Sent — waiting for the display…';}catch(e){$('#feedback').textContent=e.message;}finally{busy=false;status();}
});
$('#tone').addEventListener('click',async()=>{let ctx;try{ctx=new AudioContext();await ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=1800;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.12,ctx.currentTime+.05);gain.gain.setValueAtTime(.12,ctx.currentTime+1.95);gain.gain.linearRampToValueAtTime(0,ctx.currentTime+2);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+2.05);osc.onended=()=>ctx.close();$('#tone-status').textContent='Playing 1,800 Hz for two seconds. Look for the QR panel on the TV.';}catch{$('#tone-status').textContent='Audio playback unavailable.';ctx?.close();}});
status();setInterval(status,1500);
