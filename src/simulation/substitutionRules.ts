import type { Career, Fixture, MatchPlan, Substitution } from '../models';
import { eligiblePlayers } from './economy';

export const substitutionLimits={bench:9,players:5,windows:3};
export function activeLineup(starting:string[],changes:Substitution[],minute:number){
 const ids=[...starting];for(const sub of [...changes].sort((a,b)=>a.minute-b.minute))if(sub.minute<=minute){const index=ids.indexOf(sub.offId);if(index>=0)ids[index]=sub.onId;}return ids;
}
export function fixtureLineup(f:Fixture,clubId:string,minute:number){
 const start=(clubId===f.homeId?f.report?.homeLineup:f.report?.awayLineup)??f.report?.performances.filter(p=>p.clubId===clubId).slice(0,11).map(p=>p.playerId)??[];
 return activeLineup(start,(f.report?.substitutions??[]).filter(s=>s.clubId===clubId),minute);
}
export function defaultBench(c:Career,clubId:string,lineup:string[]){
 const available=eligiblePlayers(c,clubId).filter(p=>!lineup.includes(p.id)).sort((a,b)=>b.overall-a.overall||a.id.localeCompare(b.id));
 const keeper=available.find(p=>p.position==='GK');return [...(keeper?[keeper.id]:[]),...available.filter(p=>p.position!=='GK').slice(0,keeper?8:9).map(p=>p.id)];
}
export function validateSubstitutions(c:Career,clubId:string,starting:string[],bench:string[],changes:Substitution[]){
 const eligible=new Set(eligiblePlayers(c,clubId).map(p=>p.id));
 if(bench.length>9||new Set(bench).size!==bench.length||bench.some(id=>!eligible.has(id)||starting.includes(id)))throw Error('Choose up to nine fit, registered substitutes outside the starting XI.');
 if(changes.length>5)throw Error('Only five substitutions are allowed.');
 const windows=new Set(changes.filter(s=>s.minute!==45).map(s=>s.minute));if(windows.size>3)throw Error('Use at most three substitution windows, plus half-time.');
 const active=[...starting],used=new Set(starting);
 for(const s of [...changes].sort((a,b)=>a.minute-b.minute)){
  if(s.clubId!==clubId||!Number.isInteger(s.minute)||s.minute<1||s.minute>89||!active.includes(s.offId)||!bench.includes(s.onId)||used.has(s.onId))throw Error('Choose an active player, an unused bench player and a minute from 1 to 89. A substituted player cannot return.');
  const index=active.indexOf(s.offId),incoming=c.players.find(p=>p.id===s.onId)!;
  if((index===0)!==(incoming.position==='GK'))throw Error('Keep a goalkeeper in goal and outfield players in outfield slots.');
  active[index]=s.onId;used.add(s.onId);
 }
}
/** Lineup edits, injuries or transfers may invalidate a pre-match plan. Retain
 * every still-valid instruction; replace an invalid bench before kickoff. */
export function nextMatchPlan(c:Career):MatchPlan {
 let bench=c.matchPlan?.bench??defaultBench(c,c.clubId,c.lineup);
 try{validateSubstitutions(c,c.clubId,c.lineup,bench,[]);}catch{bench=defaultBench(c,c.clubId,c.lineup);}
 const changes:Substitution[]=[];
 for(const s of [...(c.matchPlan?.changes??[])].sort((a,b)=>a.minute-b.minute)){try{validateSubstitutions(c,c.clubId,c.lineup,bench,[...changes,s]);changes.push(s);}catch{/* Display only executable instructions. */}}
 return {bench,changes};
}
