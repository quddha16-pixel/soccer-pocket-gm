import type { Career } from './models';
import { autoLineup, eligibleStars, formations, validLineup } from './simulation/management';
import { clubs, clubById } from './data/clubs';
import { generateFixtures } from './simulation/league';
export const SAVE_KEY='pocket-football-gm-v1';
export function loadCareer():{career:Career|null;error:string}{
 try{
 const raw=localStorage.getItem(SAVE_KEY);if(!raw)return {career:null,error:''};
 const parsed=JSON.parse(raw);
 const c=parsed as Career;
 if(parsed.version===1){
  c.version=2;c.formation='4-3-3';c.lineup=autoLineup(c.players,c.clubId,c.formation);
  c.starId=eligibleStars(c)[0]?.id??'';c.transferBudget=clubById(c.clubId).budget*1e6;c.statsStartWeek=c.week+1;
 }
 const ids=new Set(clubs.map(x=>x.id));
 const expected=generateFixtures([...ids]);
 if(c.version!==2||!ids.has(c.clubId)||typeof c.manager!=='string'||!['unknown','established','elite'].includes(c.reputation)||!['balanced','attacking','defensive','feed-star'].includes(c.tactic)||!['active','survived','fired'].includes(c.status)||!Number.isInteger(c.week)||c.week<0||c.week>38||!Number.isFinite(c.seed)||!Array.isArray(c.fixtures)||c.fixtures.length!==380||!Array.isArray(c.players)||c.players.length!==480)throw Error();
 if(c.fixtures.some((f,i)=>f.id!==expected[i].id||f.homeId!==expected[i].homeId||f.awayId!==expected[i].awayId||f.week!==expected[i].week||(f.week<=c.week? !Number.isInteger(f.homeGoals)||!Number.isInteger(f.awayGoals)||f.homeGoals!<0||f.awayGoals!<0:f.homeGoals!==undefined||f.awayGoals!==undefined)))throw Error();
 if(new Set(c.players.map(p=>p.id)).size!==480||clubs.some(club=>c.players.filter(p=>p.clubId===club.id).length!==24)||c.players.some(p=>!ids.has(p.clubId)||typeof p.id!=='string'||typeof p.name!=='string'||!['GK','CB','FB','CM','WG','ST'].includes(p.position)||[p.age,p.overall,p.potential,p.wage,p.contractYears,p.fitness,p.morale].some(v=>!Number.isFinite(v)||v<0)||p.overall>100||p.fitness>100||p.morale>100||(p.transferValue!==undefined&&(!Number.isFinite(p.transferValue)||p.transferValue<0))))throw Error();
 if(!formations.includes(c.formation)||!validLineup(c.players,c.clubId,c.lineup)||!eligibleStars(c).some(p=>p.id===c.starId)||!Number.isFinite(c.transferBudget)||c.transferBudget<0||!Number.isInteger(c.statsStartWeek)||c.statsStartWeek<1||c.statsStartWeek>39)throw Error();
 if(c.pending){
  const p=c.pending;
  if(c.status!=='active'||p.week!==c.week+1||!Number.isInteger(p.minute)||p.minute<0||p.minute>90||![1,2,4].includes(p.speed)||typeof p.paused!=='boolean'||!Array.isArray(p.fixtures)||p.fixtures.length!==10)throw Error();
  const expectedRound=c.fixtures.filter(f=>f.week===p.week);
  if(p.fixtures.some((f,i)=>f.id!==expectedRound[i].id||f.homeId!==expectedRound[i].homeId||f.awayId!==expectedRound[i].awayId||f.week!==p.week||!Number.isInteger(f.homeGoals)||!Number.isInteger(f.awayGoals)||f.homeGoals!<0||f.awayGoals!<0||!f.report))throw Error();
 }
 for(const f of [...c.fixtures,...(c.pending?.fixtures??[])])if(f.report){
  const r=f.report,ids=new Set(c.players.filter(p=>[f.homeId,f.awayId].includes(p.clubId)).map(p=>p.id));
  if(!Array.isArray(r.events)||!Array.isArray(r.performances)||r.performances.length!==22||!r.performances.some(p=>p.playerId===r.motmId)||!Number.isFinite(r.homePossession)||r.homePossession<0||r.homePossession>100)throw Error();
  if(r.events.some(e=>!ids.has(e.playerId)||(e.assistId&&!ids.has(e.assistId))||(e.creatorId&&!ids.has(e.creatorId))||![f.homeId,f.awayId].includes(e.clubId)||!Number.isInteger(e.minute)||e.minute<1||e.minute>90||!['goal','shot'].includes(e.type)))throw Error();
  if(r.events.filter(e=>e.type==='goal'&&e.clubId===f.homeId).length!==f.homeGoals||r.events.filter(e=>e.type==='goal'&&e.clubId===f.awayId).length!==f.awayGoals||r.performances.some(p=>!ids.has(p.playerId)||!Number.isFinite(p.rating)))throw Error();
 }
 if((c.week===38)===(c.status==='active'))throw Error();
 return {career:c,error:''};
 }catch{return {career:null,error:'Your saved career could not be loaded. Start a new career to replace it.'};}
}
export function saveCareer(c:Career){
 const previous=localStorage.getItem(SAVE_KEY);
 if(previous){try{if(JSON.parse(previous).version===1&&!localStorage.getItem(`${SAVE_KEY}-backup-v1`))localStorage.setItem(`${SAVE_KEY}-backup-v1`,previous);}catch(error){if(error instanceof DOMException)throw error;}}
 localStorage.setItem(SAVE_KEY,JSON.stringify(c));
}
