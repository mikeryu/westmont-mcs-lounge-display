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
await writeFile('dist/content.json',JSON.stringify(data));
console.log(`Built ${data.faculty.length} faculty, ${data.programs.length} programs, ${data.alumni.length} alumni, ${data.events.length} events.`);
