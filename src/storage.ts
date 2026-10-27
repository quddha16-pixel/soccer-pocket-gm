import type { Career } from './models';
import { clubs } from './data/clubs';
import { generateFixtures } from './simulation/league';
export const SAVE_KEY='pocket-football-gm-v1';
export function loadCareer():{career:Career|null;error:string}{
 try{
 const raw=localStorage.getItem(SAVE_KEY);if(!raw)return {career:null,error:''};
 const c=JSON.parse(raw) as Career;
 const ids=new Set(clubs.map(x=>x.id));
 const expected=generateFixtures([...ids]);
 if(c.version!==1||!ids.has(c.clubId)||typeof c.manager!=='string'||!['unknown','established','elite'].includes(c.reputation)||!['balanced','attacking','defensive'].includes(c.tactic)||!['active','survived','fired'].includes(c.status)||!Number.isInteger(c.week)||c.week<0||c.week>38||!Number.isFinite(c.seed)||!Array.isArray(c.fixtures)||c.fixtures.length!==380||!Array.isArray(c.players)||c.players.length!==480)throw Error();
 if(c.fixtures.some((f,i)=>f.id!==expected[i].id||f.homeId!==expected[i].homeId||f.awayId!==expected[i].awayId||f.week!==expected[i].week||(f.week<=c.week? !Number.isInteger(f.homeGoals)||!Number.isInteger(f.awayGoals)||f.homeGoals!<0||f.awayGoals!<0:f.homeGoals!==undefined||f.awayGoals!==undefined)))throw Error();
 if(new Set(c.players.map(p=>p.id)).size!==480||clubs.some(club=>c.players.filter(p=>p.clubId===club.id).length!==24)||c.players.some(p=>!ids.has(p.clubId)||typeof p.id!=='string'||typeof p.name!=='string'||!['GK','CB','FB','CM','WG','ST'].includes(p.position)||[p.age,p.overall,p.potential,p.wage,p.contractYears,p.fitness,p.morale].some(v=>!Number.isFinite(v)||v<0)||p.overall>100||p.fitness>100||p.morale>100))throw Error();
 if((c.week===38)===(c.status==='active'))throw Error();
 return {career:c,error:''};
 }catch{return {career:null,error:'Your saved career could not be loaded. Start a new career to replace it.'};}
}
export function saveCareer(c:Career){localStorage.setItem(SAVE_KEY,JSON.stringify(c));}
