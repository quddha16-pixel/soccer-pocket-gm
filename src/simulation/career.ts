import { clubs } from '../data/clubs';
import { generatePlayers } from '../data/players';
import type { Career, Player, Reputation, Tactic } from '../models';
import { generateFixtures, isRelegated, standings } from './league';
import { random } from './random';
export function offers(reputation:Reputation){return [...clubs].filter(c=>reputation==='unknown'?c.strength<=74:reputation==='established'?c.strength>=75&&c.strength<=81:c.strength>=82).sort((a,b)=>a.strength-b.strength).slice(0,4);}
export function newCareer(manager:string,reputation:Reputation,clubId:string,seed=Date.now()):Career{
 if(!offers(reputation).some(c=>c.id===clubId))throw Error('This club has not offered you a job.');
 return {version:1,manager:manager.trim()||'Alex Morgan',reputation,clubId,players:generatePlayers(clubs,seed),fixtures:generateFixtures(clubs.map(c=>c.id)),week:0,tactic:'balanced',status:'active',seed};
}
export function strength(players:Player[],clubId:string){const squad=players.filter(p=>p.clubId===clubId).sort((a,b)=>b.overall-a.overall).slice(0,11);return squad.reduce((s,p)=>s+p.overall*(.85+.15*p.fitness/100)*(.95+.05*p.morale/100),0)/squad.length;}
function poisson(lambda:number,rng:()=>number){let p=1,k=0;do{k++;p*=rng();}while(p>Math.exp(-lambda));return k-1;}
export function score(home:number,away:number,rng:()=>number,homeTactic:Tactic='balanced',awayTactic:Tactic='balanced'){
 const attack=(t:Tactic)=>t==='attacking'?1.18:t==='defensive'?.8:1;
 const concede=(t:Tactic)=>t==='attacking'?1.15:t==='defensive'?.85:1;
 const diff=(home-away)/27;
 return [poisson(Math.max(.25,Math.min(4.2,1.5*Math.exp(diff)*attack(homeTactic)*concede(awayTactic))),rng),poisson(Math.max(.2,Math.min(3.8,1.15*Math.exp(-diff)*attack(awayTactic)*concede(homeTactic))),rng)];
}
export function advance(c:Career):Career{
 if(c.status!=='active'||c.week>=38)return c;
 const week=c.week+1,rng=random(c.seed+week*7919);
 const fixtures=c.fixtures.map(f=>{if(f.week!==week)return f;const [homeGoals,awayGoals]=score(strength(c.players,f.homeId),strength(c.players,f.awayId),rng,f.homeId===c.clubId?c.tactic:'balanced',f.awayId===c.clubId?c.tactic:'balanced');return {...f,homeGoals,awayGoals};});
 const table=standings(clubs,fixtures);
 const players=c.players.map(p=>({...p,fitness:Math.min(100,Math.max(75,p.fitness+Math.floor(rng()*7)-3)),morale:Math.min(100,Math.max(25,p.morale+Math.floor(rng()*7)-3))}));
 return {...c,fixtures,players,week,status:week===38?(isRelegated(table,c.clubId,true)?'fired':'survived'):'active'};
}
