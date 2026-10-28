import type { Career, Fixture } from '../models';
import { naturalSlots } from './management';
import { profileLabel } from './playerSkills';

export interface BoxPlayer {playerId:string;position:string;minutes:number;entered:number|null;exited:number|null;goals:number;assists:number;shots:number;onTarget:number;chances:number;saves:number;tackles:number;conceded:number;rating:number|null}
export interface MatchBoxScore {home:BoxPlayer[];away:BoxPlayer[];homePossession:number;motmId:string}
/** Compact records preserve individual games without retaining replay events. */
export type BoxRow=[string,string,number,number|null,number|null,number,number,number,number,number,number,number,number,number|null];
export interface ArchivedBoxScore {h:BoxRow[];a:BoxRow[];p:number;m:string}
export const completedFixture=(f:Fixture)=>f.homeGoals!==undefined&&f.awayGoals!==undefined;
export function buildBoxScore(f:Fixture,c:Career):MatchBoxScore|undefined {
 if(!completedFixture(f)||!f.report)return;
 const r=f.report,byId=new Map(c.players.map(p=>[p.id,p]));
 function team(clubId:string){
  const performances=r.performances.filter(p=>p.clubId===clubId),start=(clubId===f.homeId?r.homeLineup:r.awayLineup)??performances.slice(0,11).map(p=>p.playerId),bench=(clubId===f.homeId?r.homeBench:r.awayBench)??[];
  const formation=clubId===f.homeId?r.homeFormation:r.awayFormation,roles=new Map<string,string>(start.map((id,i)=>[id,formation?naturalSlots[formation][i]??'':byId.has(id)?profileLabel(byId.get(id)!):'']));
  for(const sub of [...(r.substitutions??[])].filter(s=>s.clubId===clubId).sort((a,b)=>a.minute-b.minute))roles.set(sub.onId,roles.get(sub.offId)??'');
  const order=[...new Set([...start,...performances.map(p=>p.playerId),...bench])];
  return order.map(id=>{
   const p=byId.get(id),perf=performances.find(p=>p.playerId===id),minutes=perf?.minutes??(perf?90:0),entered=perf?(perf.entered??0):null,exited=perf?(perf.exited??entered!+minutes):null;
   return {playerId:id,position:roles.get(id)|| (p?profileLabel(p):'—'),minutes,entered,exited,goals:perf?.goals??0,assists:perf?.assists??0,shots:perf?.shots??0,onTarget:r.events.filter(e=>e.playerId===id&&e.onTarget).length,chances:r.events.filter(e=>e.creatorId===id).length,saves:perf?.saves??0,tackles:perf?.tackles??0,conceded:perf?(perf.conceded??r.events.filter(e=>e.clubId!==clubId&&e.type==='goal'&&e.minute>entered!&&e.minute<=exited!).length):0,rating:perf?.rating??null};
  });
 }
 return {home:team(f.homeId),away:team(f.awayId),homePossession:r.homePossession,motmId:r.motmId};
}
const pack=(p:BoxPlayer):BoxRow=>[p.playerId,p.position,p.minutes,p.entered,p.exited,p.goals,p.assists,p.shots,p.onTarget,p.chances,p.saves,p.tackles,p.conceded,p.rating];
const unpack=([playerId,position,minutes,entered,exited,goals,assists,shots,onTarget,chances,saves,tackles,conceded,rating]:BoxRow):BoxPlayer=>({playerId,position,minutes,entered,exited,goals,assists,shots,onTarget,chances,saves,tackles,conceded,rating});
export const packBoxScore=(b:MatchBoxScore):ArchivedBoxScore=>({h:b.home.map(pack),a:b.away.map(pack),p:b.homePossession,m:b.motmId});
export const unpackBoxScore=(b:ArchivedBoxScore):MatchBoxScore=>({home:b.h.map(unpack),away:b.a.map(unpack),homePossession:b.p,motmId:b.m});
export function archiveBoxScores(c:Career){
 return Object.fromEntries(c.fixtures.flatMap(f=>{const b=buildBoxScore(f,c);return b?[[f.id,packBoxScore(b)]]:[];}));
}
export function findBoxScore(c:Career,season:number,id:string){
 if(season===c.world.season){
  const f=c.fixtures.find(f=>f.id===id&&f.week<=c.week&&completedFixture(f))??(c.pending?.minute===90?c.pending.fixtures.find(f=>f.id===id):undefined);
  return f?{fixture:f,box:buildBoxScore(f,c)}:undefined;
 }
 const archive=c.world.history.find(h=>h.season===season),f=archive?.results?.find(f=>f.id===id&&completedFixture(f)),b=archive?.boxScores?.[id];
 return f?{fixture:f,box:b?unpackBoxScore(b):undefined}:undefined;
}
export function validArchivedBoxScore(b:ArchivedBoxScore,f:Fixture,players:Set<string>){
 if(!b||!Number.isFinite(b.p)||b.p<0||b.p>100||typeof b.m!=='string')return false;
 const all:BoxPlayer[]=[];
 for(const rows of [b.h,b.a]){
  if(!Array.isArray(rows)||rows.length<11||rows.length>20)return false;
  for(const row of rows){
   if(!Array.isArray(row)||row.length!==14||!players.has(row[0])||typeof row[1]!=='string')return false;
   const p=unpack(row);if(!Number.isInteger(p.minutes)||p.minutes<0||p.minutes>90||[p.goals,p.assists,p.shots,p.onTarget,p.chances,p.saves,p.tackles,p.conceded].some(n=>!Number.isInteger(n)||n<0)||p.goals>p.onTarget||p.onTarget>p.shots)return false;
   if(p.minutes===0){if(p.entered!==null||p.exited!==null||p.rating!==null||[p.goals,p.assists,p.shots,p.onTarget,p.chances,p.saves,p.tackles,p.conceded].some(n=>n!==0))return false;}
   else if(!Number.isInteger(p.entered)||!Number.isInteger(p.exited)||p.entered!<0||p.exited!>90||(p.exited! - p.entered!)!==p.minutes||!Number.isFinite(p.rating)||p.rating!<0||p.rating!>10)return false;
   all.push(p);
  }
  if(rows.reduce((sum,row)=>sum+row[2],0)!==990)return false;
 }
 return new Set(all.map(p=>p.playerId)).size===all.length&&all.some(p=>p.playerId===b.m&&p.minutes>0)&&b.h.reduce((n,p)=>n+p[5],0)===f.homeGoals&&b.a.reduce((n,p)=>n+p[5],0)===f.awayGoals;
}
