// Requires an SSH tunnel to the temporary Pi inspection browser on localhost:9223.
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
try{
 const page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:8080');await page.waitForSelector('.welcome-copy');await page.keyboard.press('Space');
 const session=await page.context().newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');const evidence=[];
 for(let i=0;i<17;i++){
  await page.evaluate(()=>document.fonts.ready);
  const {root}=await session.send('DOM.getDocument');
  for(const selector of ['h1','#clock']){
   const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector});
   const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
   assert.ok(fonts.some(f=>/Stone|Museo/i.test(f.familyName)),JSON.stringify(fonts));evidence.push({slide:i+1,selector,fonts});
  }
  if(i===1||i===6)await page.screenshot({path:`docs/screenshots/v2/pi-${i===1?'event':'program'}.png`,animations:'disabled'});
  await page.keyboard.press('ArrowRight');
 }
 await writeFile('docs/screenshots/v2/pi-font-check.json',JSON.stringify(evidence,null,2));console.log('Pi Chromium rendered official Stone and Museo fonts across all 17 views.');
}finally{await browser.close();}
