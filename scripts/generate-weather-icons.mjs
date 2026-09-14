import * as icons from '@fortawesome/free-solid-svg-icons';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
const pkg=JSON.parse(await readFile('node_modules/@fortawesome/free-solid-svg-icons/package.json'));
const selected=['faSun','faMoon','faCloudSun','faCloudMoon','faCloud','faSmog','faCloudRain','faSnowflake','faCloudBolt','faCircleQuestion'];
const paths={};
for(const key of selected){const [width,height,,,path]=icons[key].icon;paths[key]={width,height,path};}
await writeFile('src/weather-icon-paths.js',`// Font Awesome Free ${pkg.version} by Fonticons, Inc. https://fontawesome.com\n// Icons licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/\n// Generated from the official package; paths are unmodified.\nexport const icons = ${JSON.stringify(paths)};\n`);
await copyFile('node_modules/@fortawesome/free-solid-svg-icons/LICENSE.txt','public/fontawesome-LICENSE.txt');
console.log(`Stored ${selected.length} Font Awesome ${pkg.version} weather icons locally.`);
