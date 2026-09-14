import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeEvents,slidesFor,nextIndex,clockParts,parseWeather,weatherState,weatherURL} from '../src/core.js';
import {validate} from '../scripts/validate.mjs';
const data=Object.fromEntries(['config','faculty','programs','events','alumni','features','assets'].map(k=>[k,JSON.parse(readFileSync(`data/${k}.json`))]));
test('real content validates; invalid entries identify their location',()=>{
 assert.deepEqual(validate(data),[]);
 const broken=structuredClone(data);broken.faculty[0].photo='https://example.com/a.jpg';broken.config.slideSeconds=0;
 assert.ok(validate(broken).some(e=>e.startsWith('faculty[0].photo:')));
 assert.ok(validate(broken).some(e=>e.startsWith('config.slideSeconds:')));
});
test('rotation handles empty content and wraps both directions',()=>{
 assert.deepEqual(slidesFor({programs:[],faculty:[],events:[],alumni:[]}),[{id:'welcome',type:'welcome'}]);
 assert.equal(nextIndex(0,-1,13),12);assert.equal(nextIndex(12,1,13),0);
 assert.equal(slidesFor(data,Date.parse('2026-09-14T12:00:00-07:00')).length,15);
});
test('events expire at exact end and honor publish time across DST',()=>{
 const event={id:'test',start:'2026-11-01T01:30:00-07:00',end:'2026-11-01T01:30:00-08:00',publishAt:'2026-10-31T00:00:00-07:00'};
 assert.equal(activeEvents([event],Date.parse('2026-11-01T09:29:59Z')).length,1);
 assert.equal(activeEvents([event],Date.parse('2026-11-01T09:30:00Z')).length,0);
 assert.equal(activeEvents([event],Date.parse('2026-10-30T23:59:59-07:00')).length,0);
});
test('clock uses Pacific date and daylight saving time',()=>{
 assert.equal(clockParts(new Date('2026-07-01T07:00:00Z'),data.config.timezone).time,'12:00 AM');
 assert.equal(clockParts(new Date('2026-01-01T07:00:00Z'),data.config.timezone).date,'Wednesday, December 31');
 assert.equal(clockParts(new Date('2026-01-01T07:00:00Z'),data.config.timezone).time,'11:00 PM');
});
test('weather rejects bad data, marks stale, expires cache, and uses campus coordinates',()=>{
 const now=Date.now();const w=parseWeather({current:{temperature_2m:71.2,weather_code:0,time:Math.floor(now/1000)}},now);
 assert.equal(weatherState(w,now),'fresh');assert.equal(weatherState(w,now+1900000),'stale');assert.equal(weatherState(w,now+86401000),'unavailable');
 assert.equal(weatherState(null),'unavailable');assert.equal(weatherState({temperature:2}),'unavailable');
 assert.throws(()=>parseWeather({current:{temperature_2m:null}},now));
 const url=new URL(weatherURL(data.config));assert.equal(url.searchParams.get('latitude'),'34.449789');assert.equal(url.searchParams.get('longitude'),'-119.659331');
});

test('Fall Kickoff uses confirmed details and an explicit midnight visibility cutoff',()=>{
 const e=data.events[0];assert.equal(e.name,'Fall Kickoff');assert.equal(e.start,'2026-09-17T17:30:00-07:00');assert.equal(e.end,undefined);assert.equal(e.hideAfter,'2026-09-18T00:00:00-07:00');assert.equal(e.rsvpEmail,'sleyva@westmont.edu');assert.equal(e.sourceType,'user');
 assert.equal(activeEvents([e],Date.parse('2026-09-18T06:59:59Z')).length,1);
 assert.equal(activeEvents([e],Date.parse('2026-09-18T07:00:00Z')).length,0);
 const broken=structuredClone(data);broken.events[0].end='2026-09-17T19:00:00-07:00';assert.ok(validate(broken).some(e=>e.includes('not both')));
});
test('faculty titles exactly match the department instruction',()=>{
 for(const person of data.faculty){assert.ok(person.id==='mike-ryu'?person.name==='Mike Ryu':person.name.startsWith('Dr. '));assert.ok(!person.name.includes('Ph.D.'));}
});

test('local Font Awesome icons handle night, weather families, and unknown conditions',async()=>{
 const {weatherIconName,weatherIcon}=await import('../src/weather-icons.js');
 assert.equal(weatherIconName(0,false),'faMoon');assert.equal(weatherIconName(2,false),'faCloudMoon');
 assert.equal(weatherIconName(65),'faCloudRain');assert.equal(weatherIconName(75),'faSnowflake');assert.equal(weatherIconName(95),'faCloudBolt');assert.equal(weatherIconName(null),'faCircleQuestion');
 for(const code of [0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99,null])assert.match(weatherIcon(code),/^<svg.*<path/);
});
