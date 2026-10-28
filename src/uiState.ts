// Presentation-only drafts live separately from the versioned career save.
// Session storage survives refresh and tab navigation; engine validation still governs every action.
type UiValue=string|number|boolean|null;
export function readUiState<T extends Record<string,UiValue>>(key:string,defaults:T):T{
 try{const raw=JSON.parse(sessionStorage.getItem(`pocket-ui-${key}`)??'null');if(!raw||typeof raw!=='object')return defaults;const result={...defaults};for(const name of Object.keys(defaults) as (keyof T)[]){const v=raw[name];if((defaults[name]===null&&(v===null||typeof v==='string'))||(typeof v===typeof defaults[name]&&(typeof v!=='number'||Number.isFinite(v))))result[name]=v;}return result;}catch{return defaults;}
}
export function writeUiState(key:string,state:Record<string,UiValue>){try{sessionStorage.setItem(`pocket-ui-${key}`,JSON.stringify(state));}catch{/* Career saving reports its own errors; UI drafts remain available in memory. */}}
