import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-09-14T19:00:00Z')});
 await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{current:{temperature_2m:76,weather_code:0,time:Date.parse('2026-09-14T19:00:00Z')/1000}}}));
 await page.goto('http://127.0.0.1:8080');await page.waitForSelector('.welcome-copy');await page.evaluate(()=>document.fonts.ready);
 await page.keyboard.press('Space');
 await mkdir('docs/screenshots/v2',{recursive:true});
 const count=Number((await page.locator('#position').textContent()).split('/')[1]);assert.equal(count,15);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const fontRecords=[];
 for(let i=0;i<count;i++){
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  const issues=await page.evaluate(()=>({broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),overflow:[...document.querySelectorAll('h1,p,.event-details,.event-rsvp,.faculty-office,.eyebrow,footer strong,footer span')].filter(e=>{const r=e.getBoundingClientRect(),parent=e.closest('main,footer').getBoundingClientRect();return r.bottom>parent.bottom+1||r.right>1858||r.left<0||e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2;}).map(e=>e.id||e.className||e.tagName)}));
  const qr=await page.locator('#drilldown img').screenshot();
  const png=PNG.sync.read(qr);
  const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
  assert.equal(decoded?.data,await page.locator('#drilldown a').getAttribute('href'),'Rendered QR must decode to its destination');
  const type=await page.locator('main').getAttribute('class');
  await page.screenshot({path:`docs/screenshots/v2/${String(i+1).padStart(2,'0')}-${type}.png`,animations:'disabled'});
  assert.deepEqual(issues,{broken:[],overflow:[]},`Slide ${i+1} ${type}`);
  if(type==='faculty'){
   const name=await page.locator('h1').textContent();assert.ok(name==='Mike Ryu'||name.startsWith('Dr. '));assert.ok(!name.includes('Ph.D.'));
  }
  const root=(await cdp.send('DOM.getDocument')).root.nodeId;
  for(const selector of ['h1','#clock']){
   const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root,selector});
   const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});fontRecords.push({type,selector,fonts});
   assert.ok(fonts.some(f=>/Stone|Museo/i.test(f.familyName)),`Official font missing on ${type} ${selector}: ${JSON.stringify(fonts)}`);
  }
  // A 640×360 render provides a repeatable distance-reading proxy.
  if(['faculty','alumni','event','program','feature','conditions'].includes(type)&&!fontRecords.some(r=>r.preview===type)){
   await page.setViewportSize({width:640,height:360});await page.screenshot({path:`docs/screenshots/v2/distance-${type}.png`,animations:'disabled'});await page.setViewportSize({width:1920,height:1080});fontRecords.push({preview:type});
  }
  await page.keyboard.press('ArrowRight');
 }
 assert.match(await page.locator('#position').textContent(),/^1 \/ 15$/);
 await page.clock.fastForward(60000);assert.match(await page.locator('#position').textContent(),/^1 \/ 15$/);
 await page.keyboard.press('Space');await page.clock.fastForward(19000);assert.match(await page.locator('#position').textContent(),/^2 \/ 15$/);
 await page.keyboard.press('Space');await page.clock.setSystemTime(new Date('2026-09-18T07:00:00Z'));await page.clock.fastForward(1000);assert.equal(await page.locator('.event-title').count(),0);assert.match(await page.locator('#position').textContent(),/\/ 14$/);
 await page.unroute('https://api.open-meteo.com/**');await page.route('https://api.open-meteo.com/**',route=>route.abort());
 await page.evaluate(()=>localStorage.setItem('mcs-weather',JSON.stringify({temperature:68,code:0,observedAt:Date.now()-7200000,fetchedAt:Date.now()-7200000})));
 await page.reload();await page.waitForSelector('.welcome-copy');assert.match(await page.locator('#weather-note').textContent(),/Last known/);
 await page.evaluate(()=>localStorage.removeItem('mcs-weather'));await page.reload();await page.waitForSelector('.welcome-copy');assert.match(await page.locator('#weather').textContent(),/unavailable/);
 const data=JSON.parse(await readFile('dist/content.json'));for(const k of ['programs','faculty','alumni','events','features'])data[k]=[];
 await page.route('**/content.json',route=>route.fulfill({json:data}));await page.reload();await page.waitForSelector('.welcome-copy');assert.match(await page.locator('#position').textContent(),/1 \/ 1/);await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.welcome-copy').count(),1);
 assert.deepEqual(errors,[]);await writeFile('docs/screenshots/v2/font-check.json',JSON.stringify(fontRecords,null,2));
 console.log('PASS: 15 views; official fonts; 1080p overflow and images; reduced previews; titles; pause/wrap/timer; event cutoff while paused; stale/unavailable weather; empty categories.');
}finally{await browser.close();}
