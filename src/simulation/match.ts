import { coachedPattern } from './managerStyles';
import type { Career, Fixture, Formation, MatchEvent, Performance, Player, Substitution, Tactic } from '../models';
import { activeLineup, defaultBench, nextMatchPlan, validateSubstitutions } from './substitutionRules';
import { hash } from './identity';
import { random } from './random';
import { eligiblePlayers } from './economy';
import { teamChemistry } from './chemistry';
import { autoLineup, lineupFit, slots } from './management';
import { carryingQuality, creationQuality, defenceQuality, conversionProbability, meanSkill, trait } from './playerSkills';
import type { ChanceType } from './playerSkills';
export { score } from './scoring';
function pick<T>(items:T[],weight:(item:T)=>number,rng:()=>number):T{let n=rng()*items.reduce((sum,p)=>sum+weight(p),0);return items.find(p=>(n-=weight(p))<0)??items[items.length-1];}
export function attackWeight(p:Player,starId:string,tactic:Tactic,role:Player['position']=p.position){return ({ST:5,WG:3.5,CM:2,FB:.7,CB:.4,GK:.02}[role])*(meanSkill(p,'positioning','finishing','acceleration')/75)**2*(1+trait(p,'intelligent-runner')*.06+trait(p,'poacher')*.04)*(tactic==='feed-star'&&p.id===starId?4.5:1);}
export function lineupStrength(players:Player[],formation:Formation){return players.reduce((s,p,i)=>s+p.overall*lineupFit(p,formation,i)*(.85+.15*p.fitness/100)*(.95+.05*p.morale/100),0)/11;}
export function selectMotm(performances:Performance[]){return [...performances].sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.saves-a.saves||a.playerId.localeCompare(b.playerId))[0].playerId;}
function resolveStaticMatch(f:Fixture,c:Career,rng:()=>number,lineups?:Record<string,string[]>){
 const eleven=(clubId:string)=>{const ids=lineups?.[clubId]??(clubId===c.clubId?c.lineup:autoLineup(eligiblePlayers(c,clubId),clubId,'4-3-3'));return ids.map(id=>c.players.find(p=>p.id===id)!);};
 const home=eleven(f.homeId),away=eleven(f.awayId);
 const formation=(id:string)=>id===c.clubId?c.formation:'4-3-3';
 const tactic=(id:string):Tactic=>id===c.clubId?c.tactic:'balanced';
 const effectiveCache=new Map<string,number>();
 const effective=(team:Player[],id:string)=>{
 if(effectiveCache.has(id))return effectiveCache.get(id)!;
 let value=lineupStrength(team,formation(id));
 if(formation(id)==='4-4-2')value+=.5;
 if(formation(id)==='4-2-3-1')value-=.2;
 if(tactic(id)==='feed-star'){const star=team.find(p=>p.id===c.starId);value+=(star? (star.overall-team.reduce((s,p)=>s+p.overall,0)/11)*.18:0)-1.7;}
 value+=(teamChemistry(c,team.map(p=>p.id),formation(id),tactic(id)).score-60)*.045;
 effectiveCache.set(id,value);return value;
 };
 const events:MatchEvent[]=[];
 for(const [team,opponent,clubId] of [[home,away,f.homeId],[away,home,f.awayId]] as const){
 const otherId=clubId===f.homeId?f.awayId:f.homeId,ownTactic=tactic(clubId),otherTactic=tactic(otherId),keeper=opponent[0],pattern=coachedPattern(c,clubId),otherPattern=coachedPattern(c,otherId);
 const fit=(p:Player)=>lineupFit(p,formation(clubId),team.indexOf(p)),otherFit=(p:Player)=>lineupFit(p,formation(otherId),opponent.indexOf(p));
 const role=(p:Player)=>slots[formation(clubId)][team.indexOf(p)],otherRole=(p:Player)=>slots[formation(otherId)][opponent.indexOf(p)];
 const defenders=opponent.filter(p=>['CB','FB','CM'].includes(otherRole(p))),defence=defenders.reduce((n,p)=>n+defenceQuality(p)*otherFit(p),0)/Math.max(1,defenders.length)+otherPattern.defence;
 const creators=team.filter(p=>['CM','WG','FB'].includes(role(p))),creation=creators.reduce((n,p)=>n+creationQuality(p)*fit(p),0)/Math.max(1,creators.length)+(meanSkill(team[0],'distribution','kicking')-70)*.08+trait(team[0],'long-distribution')+pattern.creation;
 const carriers=team.filter(p=>['WG','ST'].includes(role(p))),carrying=carriers.reduce((n,p)=>n+carryingQuality(p)*fit(p),0)/Math.max(1,carriers.length)+pattern.carrying;
 const intensity=(ownTactic==='attacking'?1.18:ownTactic==='defensive'?.8:1)*(otherTactic==='attacking'?1.15:otherTactic==='defensive'?.85:1)*pattern.intensity;
 const quality=Math.exp((effective(team,clubId)-effective(opponent,otherId))/95)*(1+(creation+carrying-2*defence)/500);
 const shots=Math.max(4,Math.min(22,Math.round((8+rng()*6)*quality*intensity*(clubId===f.homeId?1.08:.95))));
 for(let i=0;i<shots;i++){
 const player=pick(team.filter(p=>p.position!=='GK'),p=>attackWeight(p,c.starId,ownTactic,role(p))*fit(p),rng);
 const creator=rng()<.78?pick(team.filter(p=>p.id!==player.id&&p.position!=='GK'),p=>Math.max(1,creationQuality(p)*fit(p)/25)*(['CM','WG','FB'].includes(role(p))?2:1),rng):undefined;
 const typeRoll=rng(),chance:ChanceType=typeRoll<.15?'aerial':typeRoll<.3?'distance':typeRoll<.43?'one-on-one':'close';
 const xG=Math.max(.015,Math.min(.48,conversionProbability(player,keeper,defence,chance,lineupFit(player,formation(clubId),team.indexOf(player)))*(creator?.real?(.9+creationQuality(creator)*fit(creator)/750):1)*(creator?(.75+.25*fit(creator)):1)*(chance==='one-on-one'?pattern.oneOnOne:1)));
 const goal=rng()<xG,assist=goal?creator:undefined;
 events.push({id:`${f.id}-${clubId}-${i}`,minute:1+Math.floor(rng()*90),clubId,playerId:player.id,type:goal?'goal':'shot',assistId:assist?.id,creatorId:creator?.id,onTarget:goal||rng()<.38,chanceType:chance,xG});
 }
 }
 const homePossession=Math.round(Math.max(25,Math.min(75,50+(effective(home,f.homeId)-effective(away,f.awayId))*.5+(rng()-.5)*12)));
 return {events,homePossession};
}

function aiChanges(c:Career,clubId:string,starting:string[],bench:string[]):Substitution[]{
 const changes:Substitution[]=[],used=new Set<string>();
 const starters=starting.slice(1).map((id,i)=>({p:c.players.find(p=>p.id===id)!,index:i+1})).sort((a,b)=>a.p.fitness-b.p.fitness||a.p.overall-b.p.overall);
 for(const {p,index} of starters){
  const sub=bench.map(id=>c.players.find(p=>p.id===id)!).filter(x=>x.position!=='GK'&&!used.has(x.id)&&lineupFit(x,'4-3-3',index)>=.94&&x.overall>=p.overall-8).sort((a,b)=>b.overall-a.overall)[0];
  if(!sub)continue;used.add(sub.id);changes.push({clubId,offId:p.id,onId:sub.id,minute:changes.length<2?60:75});if(changes.length===3)break;
 }return changes;
}

/** Each interval uses a fixed fixture/minute seed. Changing personnel recomputes
 * only future intervals; the watched prefix is copied byte-for-byte. */
export function resolveMatch(f:Fixture,c:Career,rng:()=>number,known?:Fixture,changesOverride?:Substitution[],preserveThrough=0):Fixture {
 const simulationSeed=known?.report?.simulationSeed??Math.floor(rng()*4294967296);
 const start=(id:string)=>(id===f.homeId?known?.report?.homeLineup:known?.report?.awayLineup)??(id===c.clubId?c.lineup:autoLineup(eligiblePlayers(c,id),id,'4-3-3'));
 const home=start(f.homeId),away=start(f.awayId),plan=nextMatchPlan(c);
 const bench=(id:string,starting:string[])=>(id===f.homeId?known?.report?.homeBench:known?.report?.awayBench)??(id===c.clubId?plan.bench:defaultBench(c,id,starting));
 const homeBench=bench(f.homeId,home),awayBench=bench(f.awayId,away);
 const changes=changesOverride??[...[f.homeId,f.awayId].flatMap(id=>id===c.clubId?plan.changes:aiChanges(c,id,id===f.homeId?home:away,id===f.homeId?homeBench:awayBench))];
 for(const id of [f.homeId,f.awayId])validateSubstitutions(c,id,id===f.homeId?home:away,id===f.homeId?homeBench:awayBench,changes.filter(s=>s.clubId===id));
 const boundaries=[0,...new Set(changes.map(s=>s.minute)),90].sort((a,b)=>a-b),events:MatchEvent[]=[];
 let possession=0;
 const intervals=new Map<string,{entered:number;exited:number}>();
 for(const id of [...home,...away])intervals.set(id,{entered:0,exited:90});
 for(const s of [...changes].sort((a,b)=>a.minute-b.minute)){intervals.get(s.offId)!.exited=s.minute;intervals.set(s.onId,{entered:s.minute,exited:90});}
 for(let i=0;i<boundaries.length-1;i++){
  const from=boundaries[i],to=boundaries[i+1];
  const lineups={[f.homeId]:activeLineup(home,changes.filter(s=>s.clubId===f.homeId),from),[f.awayId]:activeLineup(away,changes.filter(s=>s.clubId===f.awayId),from)};
  const players=c.players.map(p=>{const time=intervals.get(p.id);return time?{...p,fitness:Math.max(40,p.fitness-Math.max(0,from-time.entered)*.18)}:p;});
  const segment=resolveStaticMatch(f,{...c,players},random(from===0?simulationSeed:hash(`${simulationSeed}:${from}`)),lineups);
  events.push(...segment.events.filter(e=>e.minute>Math.max(from,preserveThrough)&&e.minute<=to));possession+=segment.homePossession*(to-from)/90;
 }
 if(known)events.push(...known.report!.events.filter(e=>e.minute<=preserveThrough));
 events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 // Segment IDs retain the old readable format but must be unique in one report.
 events.forEach((e,i)=>{if(e.minute>preserveThrough)e.id=`${f.id}-${e.clubId}-${e.minute}-${i}`;});
 const performances:Performance[]=[...intervals].filter(([,time])=>time.exited>time.entered).map(([id,time])=>{
  const p=c.players.find(p=>p.id===id)!,minutes=time.exited-time.entered,own=events.filter(e=>e.playerId===id),opponent=events.filter(e=>e.clubId!==p.clubId&&e.minute>time.entered&&e.minute<=time.exited);
  const goals=own.filter(e=>e.type==='goal').length,assists=events.filter(e=>e.assistId===id).length,shots=own.length,conceded=opponent.filter(e=>e.type==='goal').length,saves=p.position==='GK'?opponent.filter(e=>e.onTarget&&e.type==='shot').length:0;
  const starting=p.clubId===f.homeId?home:away,formation=p.clubId===c.clubId?c.formation:'4-3-3',index=activeLineup(starting,changes.filter(s=>s.clubId===p.clubId),time.entered).indexOf(id),fit=lineupFit(p,formation,index),role=slots[formation][index];
  const r=random(hash(`${simulationSeed}:${id}`)),tackles=p.position==='GK'?0:Math.floor(r()*(['CB','FB','CM'].includes(role)?6:3)*Math.max(.15,defenceQuality(p)*fit/75)*minutes/90);
  const rating=Math.round(Math.min(10,Math.max(4,5.8-(1-fit)*1.4+goals*1.15+assists*.7+shots*.05+saves*.19+tackles*.13+(minutes>=60&&conceded===0&&['GK','CB','FB'].includes(p.position)?.7:0)-conceded*(p.position==='GK'?.15:.07)+r()*.55))*10)/10;
  return {playerId:id,clubId:p.clubId,goals,assists,shots,saves,tackles,rating,minutes,entered:time.entered,exited:time.exited,conceded};
 });
 return {...f,homeGoals:events.filter(e=>e.clubId===f.homeId&&e.type==='goal').length,awayGoals:events.filter(e=>e.clubId===f.awayId&&e.type==='goal').length,report:{simulationSeed,substitutions:changes,homeBench,awayBench,homeLineup:home,awayLineup:away,homeFormation:f.homeId===c.clubId?c.formation:'4-3-3',awayFormation:f.awayId===c.clubId?c.formation:'4-3-3',events,performances,homePossession:Math.round(possession),motmId:selectMotm(performances)}};
}
