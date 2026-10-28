import { coachedPattern, type ManagerStyle } from './managerStyles';
import { researchedFreeAgents } from '../data/freeAgents';
import { archiveSeasonReview } from './records';
import { clubs, clubById, leagueClubs } from '../data/clubs';
import { customStartingPlayers } from '../data/playerProfiles';
import type { Career, Player, Reputation } from '../models';
import { generateFixtures, isRelegated, standings } from './league';
import { random } from './random';
import { autoLineup, eligibleStars } from './management';
import { buildFamiliarity } from './chemistry';
import { developRound } from './development';
import { aiTransfers, settleFinances } from './worldTick';
import { repairLineup, eligiblePlayers } from './economy';
import { initializeWorld } from './world';
import { rememberCompletedSubstitutions } from './recentSubs';
import { nextMatchPlan } from './substitutionRules';
import { resolveMatch } from './match';
export { score } from './scoring';
export function offers(reputation:Reputation){return [...clubs].filter(c=>reputation==='unknown'?c.strength<=74:true).sort((a,b)=>a.strength-b.strength);}
export function newCareer(manager:string,reputation:Reputation,clubId:string,seed=Date.now(),managerStyle?:ManagerStyle):Career{
 if(!offers(reputation).some(c=>c.id===clubId))throw Error('This club has not offered you a job.');
 const custom=customStartingPlayers(),players=[...custom,...researchedFreeAgents(2026,custom)],lineup=autoLineup(players,clubId,'4-3-3');
 return initializeWorld({version:3,managerStyle,geniusPlaystyle:managerStyle==='genius'?'positional':undefined,manager:manager.trim()||'Alex Morgan',reputation,clubId,players,fixtures:generateFixtures(clubs.map(c=>c.id)),week:0,tactic:'balanced',status:'active',seed,formation:'4-3-3',lineup,starId:eligibleStars({players,lineup})[0].id,transferBudget:clubById(clubId).budget*1e6,statsStartWeek:1} as Career);
}
export function strength(players:Player[],clubId:string){const squad=players.filter(p=>p.clubId===clubId).sort((a,b)=>b.overall-a.overall).slice(0,11);return squad.reduce((s,p)=>s+p.overall*(.85+.15*p.fitness/100)*(.95+.05*p.morale/100),0)/squad.length;}
export function prepareWeek(c:Career,watch=true):Career{
 if(c.pending||c.status!=='active'||c.week>=38)return c;
 c=repairLineup(c);
 const week=c.week+1,rng=random(c.seed+(c.world.season-2026)*104729+week*7919);
 const fixtures=c.fixtures.filter(f=>f.week===week).map(f=>resolveMatch(f,c,rng));
 return {...c,matchPlan:nextMatchPlan(c),pending:{week,fixtures,decisionMode:watch&&(c.interactiveMoments??true)?'interactive':'automatic',minute:watch?0:90,speed:1,paused:false}};
}
export function commitWeek(c:Career,expectedWeek=c.pending?.week):Career{
 if(!c.pending||c.pending.week!==expectedWeek||c.pending.minute<90||c.pending.week!==c.week+1)return c;
 const week=c.pending.week,finished=new Map(c.pending.fixtures.map(f=>[f.id,f]));
 const fixtures=c.fixtures.map(f=>finished.get(f.id)??f),rng=random(c.seed+(c.world.season-2026)*3271+week*3571);
 const grown=developRound(c);
 const played=new Map(c.pending.fixtures.flatMap(f=>f.report?.performances.map(p=>[p.playerId,(p.minutes??90)/90] as const)??[]));
 const players=grown.map(p=>({...p,fitness:Math.min(100,Math.max(75,p.fitness+5+Math.floor(rng()*4)-(played.get(p.id)??0)*(10+coachedPattern(c,p.clubId).fitnessCost))),morale:Math.min(100,Math.max(25,p.morale+Math.floor(rng()*7)-3))}));
 const world={...c.world,chemistry:buildFamiliarity(c)};
 const updated={...c,world,fixtures,players,week,recentSubPlans:rememberCompletedSubstitutions(c),matchPlan:undefined,pending:undefined,status:week===38?(isRelegated(standings(leagueClubs(c),fixtures),c.clubId,true)?'fired' as const:'survived' as const):'active' as const};
 const committed=repairLineup(aiTransfers(settleFinances(updated)));
 return week===38?archiveSeasonReview(committed):committed;
}
// Headless quick simulation retains the original API for full-season tests and tooling.
export function advance(c:Career):Career{const prepared=prepareWeek(c,false);return prepared.pending?commitWeek({...prepared,pending:{...prepared.pending,minute:90}}):prepared;}
