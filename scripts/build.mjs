import QRCode from 'qrcode';
import { readFile, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { validate } from './validate.mjs';
const data={};
for(const key of ['config','faculty','programs','events','alumni','features','assets']) {
  try {data[key]=JSON.parse(await readFile(`data/${key}.json`,'utf8'));}
  catch(error) {throw Error(`data/${key}.json: ${error.message}`);}
}
const errors=validate(data);
if(errors.length) {console.error('Content validation failed:\n'+errors.join('\n'));process.exit(1);}
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true,filter:source=>!source.endsWith('.zip')&&!source.endsWith('.DS_Store')});await cp('src','dist',{recursive:true});
data.links={};
await mkdir('dist/qr',{recursive:true});
const links=[['welcome','https://www.westmont.edu/mathematics','Explore our department'],
 ...['faculty','programs','alumni','features','events'].flatMap(key=>data[key].map(item=>[
 `${({programs:'program',features:'feature',events:'event'})[key]||key}-${item.id}`,
 key==='events'?`mailto:${item.rsvpEmail}?subject=${encodeURIComponent(`RSVP: ${item.name}`)}`:item.source,
 ({faculty:'Meet the professor',programs:'Explore the program',alumni:'Read more on Westmont',features:'Explore CATLab',events:'Email your RSVP'})[key]
 ]))];
for(const [id,url,label] of links){
 if(!/^(https:\/\/|mailto:)/.test(url))throw Error(`Invalid QR destination: ${id}`);
 const path=`qr/${id}.svg`;
 await writeFile(`dist/${path}`,await QRCode.toString(url,{type:'svg',errorCorrectionLevel:'M',margin:4}));
 data.links[id]={url,label,path};
}
await writeFile('dist/content.json' ,JSON.stringify(data));
console.log(`Built ${data.faculty.length} faculty, ${data.programs.length} programs, ${data.alumni.length} alumni, ${data.events.length} events.`);
