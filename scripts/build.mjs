import {createHash} from 'node:crypto';
import QRCode from 'qrcode';
import { readFile, mkdir, cp, writeFile, rm, readdir } from 'node:fs/promises';
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
 ...['faculty','programs','alumni','features','events'].flatMap(key=>data[key].filter(item=>key!=='events'||item.rsvpEmail||item.url).map(item=>[
 `${({programs:'program',features:'feature',events:'event'})[key]||key}-${item.id}`,
 key==='events'?(item.url||`mailto:${item.rsvpEmail}?subject=${encodeURIComponent(`Question about ${item.name}`)}`):(item.profileUrl||item.source),
 ({faculty:'Meet the professor',programs:'Explore the program',alumni:item.profileUrl?'Connect on LinkedIn':'Read more on Westmont',features:'Explore CATLab',events:item.url?'Meet the speaker':'Contact the organizer'})[key]
 ]))];
for(const [id,url,label] of links){
 if(!/^(https:\/\/|mailto:)/.test(url))throw Error(`Invalid QR destination: ${id}`);
 const path=`qr/${id}.svg`;
 await writeFile(`dist/${path}`,await QRCode.toString(url,{type:'svg',errorCorrectionLevel:'M',margin:4}));
 data.links[id]={url,label,path};
}
await writeFile('dist/content.json' ,JSON.stringify(data));
console.log(`Built ${data.faculty.length} faculty, ${data.programs.length} programs, ${data.alumni.length} alumni, ${data.events.length} events.`);

// Version all module imports and entry assets together, avoiding mixed cached releases.
const jsFiles=(await readdir('dist')).filter(name=>name.endsWith('.js'));
const hash=createHash('sha256');
for(const name of [...jsFiles,'styles.css','index.html'].sort())hash.update(await readFile(`dist/${name}`));
const version=hash.digest('hex').slice(0,16);
for(const name of jsFiles){
 const code=await readFile(`dist/${name}`,'utf8');
 await writeFile(`dist/${name}`,code.replace(/(['"])(\.\/[^'"?]+\.js)\1/g,(_,quote,path)=>`${quote}${path}?v=${version}${quote}`));
}
const html=await readFile('dist/index.html','utf8');
await writeFile('dist/index.html',html.replace('href="styles.css"',`href="styles.css?v=${version}"`).replace('src="app.js"',`src="app.js?v=${version}"`));
