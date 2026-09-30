import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
const origin=process.env.DISPLAY_TEST_URL||'http://127.0.0.1:8090';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const display=await browser.newPage({viewport:{width:1920,height:1080}});
 const errors=[];display.on('pageerror',e=>errors.push(e.message));
 await display.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{current:{temperature_2m:76,weather_code:2,time:Date.now()/1000}}}));
 await display.goto(origin);await expect(display.locator('#voice-hint')).toBeVisible();assert.equal(await display.locator('#remote-shortcut').count(),0);
 const phone=await browser.newPage({viewport:{width:390,height:844}});phone.on('pageerror',e=>errors.push(e.message));await phone.goto(origin+'/control/');
 await expect(phone.locator('#connection')).toHaveText('Connected to the lounge');
 await phone.getByRole('button',{name:'Pause · 5 min',exact:true}).click();await expect(display.locator('#pause')).toBeVisible();await expect(phone.locator('#feedback')).toContainText('Done');
 const before=await display.locator('#position').textContent();await phone.getByRole('button',{name:'Next →',exact:true}).click();await expect(display.locator('#position')).not.toHaveText(before);await expect(phone.locator('#feedback')).toContainText('Done');
 await phone.getByRole('button',{name:'Previous slide',exact:true}).click();await expect(display.locator('#position')).toHaveText(before);
 await phone.getByRole('button',{name:'Show large QR on TV',exact:true}).click();await expect(display.locator('#remote-panel')).toBeVisible();
 const png=PNG.sync.read(await display.locator('#remote-panel img').screenshot());assert.equal(jsQR(png.data,png.width,png.height).data,origin+'/control/');
 await mkdir('docs/screenshots/controls',{recursive:true});await display.screenshot({path:'docs/screenshots/controls/qr-panel.png'});
 await phone.screenshot({path:'docs/screenshots/controls/phone.png',fullPage:true});
 await phone.getByRole('button',{name:'Close TV QR',exact:true}).click();await expect(display.locator('#remote-panel')).toBeHidden();
 await phone.getByRole('button',{name:'Resume',exact:true}).click();await expect(display.locator('#pause')).toBeHidden();
 await expect(phone.locator('#feedback')).toContainText('Done');
 await display.screenshot({path:'docs/screenshots/controls/display.png'});
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Phone horizontal overflow');
 assert.equal(await display.locator('#chapters span:last-child').evaluate(e=>e.getBoundingClientRect().right>document.querySelector('#voice-hint').getBoundingClientRect().left),false,'Chapters and voice hint overlap');
 assert.equal(await phone.locator('input[type=password]').count(),0);
 // Real voice API drives the overlay, not just the design preview.
 const boot=await (await display.request.get(origin+'/api/display/bootstrap')).json();
 const headers={Authorization:`Bearer ${boot.token}`};
 await display.request.post(origin+'/api/voice/status',{headers,data:{}});
 await expect(display.locator('#voice-hint')).toContainText('Hey, Monty');
 await display.request.post(origin+'/api/voice/wake',{headers,data:{}});
 await expect(display.locator('#voice-overlay')).toContainText('I’m listening ...');
 assert.equal(await display.locator('.voice-commands').textContent(),'PauseResumeNextPrevious');
 await display.request.post(origin+'/api/voice/command',{headers,data:{action:'next'}});
 await expect(display.locator('#voice-overlay')).toContainText('Next slide');
 await expect(display.locator('#voice-overlay')).toBeHidden({timeout:5000});
 // A remote pause must recover automatically even if the phone disappears.
 await phone.getByRole('button',{name:'Pause · 5 min',exact:true}).click();await expect(display.locator('#pause')).toBeVisible();
 await display.clock.install();await display.clock.fastForward(301000);await expect(display.locator('#pause')).toBeHidden();
 assert.deepEqual(errors,[]);console.log('PASS: phone navigation, pause/resume, automatic resume, QR open/close/decode, mobile layout, footer fit, no admin UI.');
}finally{await browser.close();}
