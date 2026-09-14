import { existsSync } from 'node:fs';
export function validate(data) {
  const errors=[];
  const check=(ok,path,message)=>{if(!ok) errors.push(`${path}: ${message}`);};
  const str=(v,path,max=240)=>check(typeof v==='string'&&v.trim().length>0&&v.length<=max,path,`required text, maximum ${max} characters`);
  const date=(v,path)=>check(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)),path,'expected YYYY-MM-DD');
  const source=(v,path)=>{check(typeof v.source==='string'&&(v.sourceType==='user' ? v.source.trim().length>0 : /^https:\/\//.test(v.source)),path+'.source','expected HTTPS URL or a user-provided source with sourceType: user');date(v.verifiedAt,path+'.verifiedAt');};
  const photo=(v,path)=>check(typeof v==='string'&&/^assets\/[\w.-]+$/.test(v)&&existsSync('public/'+v),path,'expected an existing local assets/ file');
  const timestamp=(v,path)=>check(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v)),path,'expected ISO timestamp with explicit timezone offset');
  for(const key of ['faculty','programs','alumni','events','features','assets']) check(Array.isArray(data[key]),key,'expected an array');
  if(errors.length) return errors;
  const c=data.config;
  if(!c||!c.campus) return ['config: configuration and campus coordinates required'];
  check(c.school==='Westmont College','config.school','must be Westmont College');
  check(c.department==='Department of Mathematics and Computer Science','config.department','use the approved department name');
  check(c.timezone==='America/Los_Angeles','config.timezone','must be America/Los_Angeles');
  check(Number.isFinite(c.slideSeconds)&&c.slideSeconds>=10&&c.slideSeconds<=120,'config.slideSeconds','must be 10–120');
  check(Number.isFinite(c.weatherRefreshMinutes)&&c.weatherRefreshMinutes>=10&&c.weatherRefreshMinutes<=60,'config.weatherRefreshMinutes','must be 10–60');
  check(Number.isFinite(c.campus.latitude)&&Math.abs(c.campus.latitude)<=90,'config.campus.latitude','invalid latitude');
  check(Number.isFinite(c.campus.longitude)&&Math.abs(c.campus.longitude)<=180,'config.campus.longitude','invalid longitude');
  source(c.campus,'config.campus');photo(c.welcomePhoto,'config.welcomePhoto');
  for(const key of ['faculty','programs','alumni','events','features']) {
    const ids=new Set();
    data[key].forEach((v,i)=>{
      const path=`${key}[${i}]`;
      if(!v || typeof v!=='object'){errors.push(path+': expected object');return;}
      check(typeof v.id==='string'&&/^[a-z0-9-]+$/.test(v.id)&&!ids.has(v.id),path+'.id','expected unique lowercase slug');ids.add(v.id);
      str(v.name,path+'.name',70);source(v,path);if(!['events','features'].includes(key)){str(v.headline,path+'.headline',90);str(v.summary,path+'.summary',240);}
      if(v.photo) photo(v.photo,path+'.photo');
      if(key==='faculty') {
        for(const field of ['role','focus','office','email']) str(v[field],path+'.'+field,110);
        photo(v.photo,path+'.photo');str(v.displayFocus,path+'.displayFocus',75);
        if(v.availability!==null) {str(v.availability?.text,path+'.availability.text',100);timestamp(v.availability?.until,path+'.availability.until');}
      }
      if(key==='programs') {check(Array.isArray(v.offerings)&&v.offerings.length>0&&v.offerings.length<=4,path+'.offerings','expected 1–4 degrees or minors');if(Array.isArray(v.offerings))v.offerings.forEach((o,j)=>str(o,path+`.offerings[${j}]`,40));str(v.shortName,path+'.shortName',4);check(Array.isArray(v.topics)&&v.topics.length<=3,path+'.topics','expected up to 3 topics');if(Array.isArray(v.topics))v.topics.forEach((t,j)=>str(t,path+`.topics[${j}]`,40));}
      if(key==='features'){str(v.displayStory,path+'.displayStory',100);photo(v.photo,path+'.photo');}
      if(key==='alumni') {str(v.displayStory,path+'.displayStory',110);check(Number.isInteger(v.classYear)&&v.classYear>=1937&&v.classYear<=2100,path+'.classYear','expected graduation year');}
      if(key==='events') {
        timestamp(v.start,path+'.start');
        check(Boolean(v.end)!==Boolean(v.hideAfter),path,'provide end OR hideAfter, not both');
        const field=v.end?'end':'hideAfter';timestamp(v[field],path+'.'+field);
        check(Date.parse(v[field])>Date.parse(v.start),path+'.'+field,'must follow start');
        str(v.kind,path+'.kind',40);str(v.location,path+'.location',50);
        str(v.rsvpContact,path+'.rsvpContact',50);str(v.rsvpEmail,path+'.rsvpEmail',60);
        check(typeof v.rsvpEmail==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.rsvpEmail),path+'.rsvpEmail','expected email address');
        if(v.publishAt)timestamp(v.publishAt,path+'.publishAt');
      }
    });
  }
  data.assets.forEach((v,i)=>{photo(v.path,`assets[${i}].path`);if(v.providedBy==='user')check(existsSync(v.source),`assets[${i}].source`,'missing supplied archive');else source(v,`assets[${i}]`);});
  return errors;
}
