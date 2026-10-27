import type { Career, Fixture, Formation, MatchEvent, Performance, Player, Tactic } from '../models';
import { autoLineup, positionFit, slots } from './management';
import { score } from './scoring';
export { score } from './scoring';
function pick<T>(items:T[],weight:(item:T)=>number,rng:()=>number):T{let n=rng()*items.reduce((sum,p)=>sum+weight(p),0);return items.find(p=>(n-=weight(p))<0)??items[items.length-1];}
export function attackWeight(p:Player,starId:string,tactic:Tactic){return ({ST:5,WG:3.5,CM:2,FB:.7,CB:.4,GK:.02}[p.position])*(p.overall/75)**2*(tactic==='feed-star'&&p.id===starId?4.5:1);}
export function lineupStrength(players:Player[],formation:Formation){return players.reduce((s,p,i)=>s+p.overall*positionFit(p.position,slots[formation][i])*(.85+.15*p.fitness/100)*(.95+.05*p.morale/100),0)/11;}
export function selectMotm(performances:Performance[]){return [...performances].sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.saves-a.saves||a.playerId.localeCompare(b.playerId))[0].playerId;}
export function resolveMatch(f:Fixture,c:Career,rng:()=>number):Fixture{
 const eleven=(clubId:string)=>{const ids=clubId===c.clubId?c.lineup:autoLineup(c.players,clubId,'4-3-3');return ids.map(id=>c.players.find(p=>p.id===id)!);};
 const home=eleven(f.homeId),away=eleven(f.awayId);
 const formation=(id:string)=>id===c.clubId?c.formation:'4-3-3';
 const tactic=(id:string):Tactic=>id===c.clubId?c.tactic:'balanced';
 const effective=(team:Player[],id:string)=>{
 let value=lineupStrength(team,formation(id));
 if(formation(id)==='4-4-2')value+=.5;
 if(formation(id)==='4-2-3-1')value-=.2;
 if(tactic(id)==='feed-star'){const star=team.find(p=>p.id===c.starId);value+=(star? (star.overall-team.reduce((s,p)=>s+p.overall,0)/11)*.18:0)-1.7;}
 return value;
 };
 const [homeGoals,awayGoals]=score(effective(home,f.homeId),effective(away,f.awayId),rng,tactic(f.homeId),tactic(f.awayId));
 const events:MatchEvent[]=[];
 for(const [team,clubId,goals] of [[home,f.homeId,homeGoals],[away,f.awayId,awayGoals]] as const){
 const shots=goals+5+Math.floor(rng()*8);
 for(let i=0;i<shots;i++){
 const player=pick(team,p=>attackWeight(p,c.starId,tactic(clubId)),rng),goal=i<goals;
 const creator=rng()<.78?pick(team.filter(p=>p.id!==player.id),p=>['CM','WG'].includes(p.position)?4:1,rng):undefined;const assist=goal?creator:undefined;
 events.push({id:`${f.id}-${clubId}-${i}`,minute:1+Math.floor(rng()*90),clubId,playerId:player.id,type:goal?'goal':'shot',assistId:assist?.id,creatorId:creator?.id,onTarget:goal||rng()<.42});
 }
 }
 events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 const performances=[...home,...away].map((p):Performance=>{
 const goals=events.filter(e=>e.playerId===p.id&&e.type==='goal').length,assists=events.filter(e=>e.assistId===p.id).length,shots=events.filter(e=>e.playerId===p.id).length;
 const opponentEvents=events.filter(e=>e.clubId!==p.clubId),conceded=opponentEvents.filter(e=>e.type==='goal').length;
 const saves=p.position==='GK'?opponentEvents.filter(e=>e.onTarget&&e.type==='shot').length:0;
 const tackles=p.position==='GK'?0:Math.floor(rng()*(['CB','FB','CM'].includes(p.position)?6:3));
 const rating=Math.round(Math.min(10,Math.max(4,5.8+goals*1.15+assists*.7+shots*.05+saves*.19+tackles*.13+(conceded===0&&['GK','CB','FB'].includes(p.position)?.7:0)-conceded*(p.position==='GK'?.15:.07)+rng()*.55))*10)/10;
 return {playerId:p.id,clubId:p.clubId,goals,assists,shots,saves,tackles,rating};
 });
 const homePossession=Math.round(Math.max(32,Math.min(68,50+(effective(home,f.homeId)-effective(away,f.awayId))*.5+(rng()-.5)*12)));
 return {...f,homeGoals,awayGoals,report:{events,performances,homePossession,motmId:selectMotm(performances)}};
}
