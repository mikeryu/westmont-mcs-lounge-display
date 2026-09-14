import {icons} from './weather-icon-paths.js';
// WMO conditions map to a small, local Font Awesome Free subset.
export function weatherIconName(code, isDay=true){
 if(code===0)return isDay?'faSun':'faMoon';
 if([1,2].includes(code))return isDay?'faCloudSun':'faCloudMoon';
 if(code===3)return 'faCloud';
 if([45,48].includes(code))return 'faSmog';
 if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return 'faCloudRain';
 if([71,73,75,77,85,86].includes(code))return 'faSnowflake';
 if([95,96,99].includes(code))return 'faCloudBolt';
 return 'faCircleQuestion';
}
export function weatherIcon(code,isDay=true){
 const icon=icons[weatherIconName(code,isDay)];
 const paths=Array.isArray(icon.path)?icon.path:[icon.path];
 return `<svg viewBox="0 0 ${icon.width} ${icon.height}" fill="currentColor" aria-hidden="true">${paths.map(path=>`<path d="${path}"/>`).join('')}</svg>`;
}
