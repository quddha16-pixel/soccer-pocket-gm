import type { Career, Fixture, Formation, MatchEvent, Performance, Player, Tactic } from '../models';
import { eligiblePlayers } from './economy';
import { teamChemistry } from './chemistry';
import { autoLineup, lineupFit } from './management';
import { carryingQuality, creationQuality, defenceQuality, conversionProbability, meanSkill, trait } from './playerSkills';
import type { ChanceType } from './playerSkills';
export { score } from './scoring';
function pick<T>(items:T[],weight:(item:T)=>number,rng:()=>number):T{let n=rng()*items.reduce((sum,p)=>sum+weight(p),0);return items.find(p=>(n-=weight(p))<0)??items[items.length-1];}
export function attackWeight(p:Player,starId:string,tactic:Tactic){return ({ST:5,WG:3.5,CM:2,FB:.7,CB:.4,GK:.02}[p.position])*(meanSkill(p,'positioning','finishing','acceleration')/75)**2*(1+trait(p,'intelligent-runner')*.06+trait(p,'poacher')*.04)*(tactic==='feed-star'&&p.id===starId?4.5:1);}
export function lineupStrength(players:Player[],formation:Formation){return players.reduce((s,p,i)=>s+p.overall*lineupFit(p,formation,i)*(.85+.15*p.fitness/100)*(.95+.05*p.morale/100),0)/11;}
export function selectMotm(performances:Performance[]){return [...performances].sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.saves-a.saves||a.playerId.localeCompare(b.playerId))[0].playerId;}
export function resolveMatch(f:Fixture,c:Career,rng:()=>number):Fixture{
 const eleven=(clubId:string)=>{const ids=clubId===c.clubId?c.lineup:autoLineup(eligiblePlayers(c,clubId),clubId,'4-3-3');return ids.map(id=>c.players.find(p=>p.id===id)!);};
 const home=eleven(f.homeId),away=eleven(f.awayId);
 const formation=(id:string)=>id===c.clubId?c.formation:'4-3-3';
 const tactic=(id:string):Tactic=>id===c.clubId?c.tactic:'balanced';
 const effective=(team:Player[],id:string)=>{
 let value=lineupStrength(team,formation(id));
 if(formation(id)==='4-4-2')value+=.5;
 if(formation(id)==='4-2-3-1')value-=.2;
 if(tactic(id)==='feed-star'){const star=team.find(p=>p.id===c.starId);value+=(star? (star.overall-team.reduce((s,p)=>s+p.overall,0)/11)*.18:0)-1.7;}
 value+=(teamChemistry(c,team.map(p=>p.id),formation(id),tactic(id)).score-60)*.045;
 return value;
 };
 const events:MatchEvent[]=[];
 for(const [team,opponent,clubId] of [[home,away,f.homeId],[away,home,f.awayId]] as const){
 const otherId=clubId===f.homeId?f.awayId:f.homeId,ownTactic=tactic(clubId),otherTactic=tactic(otherId),keeper=opponent[0];
 const defence=opponent.filter(p=>['CB','FB','CM'].includes(p.position)).reduce((n,p)=>n+defenceQuality(p),0)/Math.max(1,opponent.filter(p=>['CB','FB','CM'].includes(p.position)).length);
 const creators=team.filter(p=>['CM','WG','FB'].includes(p.position)),creation=creators.reduce((n,p)=>n+creationQuality(p),0)/Math.max(1,creators.length)+(meanSkill(team[0],'distribution','kicking')-70)*.08+trait(team[0],'long-distribution');
 const carriers=team.filter(p=>['WG','ST'].includes(p.position)),carrying=carriers.reduce((n,p)=>n+carryingQuality(p),0)/Math.max(1,carriers.length);
 const intensity=(ownTactic==='attacking'?1.18:ownTactic==='defensive'?.8:1)*(otherTactic==='attacking'?1.15:otherTactic==='defensive'?.85:1);
 const quality=Math.exp((effective(team,clubId)-effective(opponent,otherId))/95)*(1+(creation+carrying-2*defence)/500);
 const shots=Math.max(4,Math.min(22,Math.round((8+rng()*6)*quality*intensity*(clubId===f.homeId?1.08:.95))));
 for(let i=0;i<shots;i++){
 const player=pick(team.filter(p=>p.position!=='GK'),p=>attackWeight(p,c.starId,ownTactic)*lineupFit(p,formation(clubId),team.indexOf(p)),rng);
 const creator=rng()<.78?pick(team.filter(p=>p.id!==player.id&&p.position!=='GK'),p=>Math.max(1,creationQuality(p)/25)*(['CM','WG','FB'].includes(p.position)?2:1),rng):undefined;
 const typeRoll=rng(),chance:ChanceType=typeRoll<.15?'aerial':typeRoll<.3?'distance':typeRoll<.43?'one-on-one':'close';
 const xG=Math.max(.015,Math.min(.48,conversionProbability(player,keeper,defence,chance,lineupFit(player,formation(clubId),team.indexOf(player)))*(creator?.real?(.9+creationQuality(creator)/750):1)));
 const goal=rng()<xG,assist=goal?creator:undefined;
 events.push({id:`${f.id}-${clubId}-${i}`,minute:1+Math.floor(rng()*90),clubId,playerId:player.id,type:goal?'goal':'shot',assistId:assist?.id,creatorId:creator?.id,onTarget:goal||rng()<.38,chanceType:chance,xG});
 }
 }
 const homeGoals=events.filter(e=>e.clubId===f.homeId&&e.type==='goal').length,awayGoals=events.filter(e=>e.clubId===f.awayId&&e.type==='goal').length;
 events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 const performances=[...home,...away].map((p):Performance=>{
 const goals=events.filter(e=>e.playerId===p.id&&e.type==='goal').length,assists=events.filter(e=>e.assistId===p.id).length,shots=events.filter(e=>e.playerId===p.id).length;
 const opponentEvents=events.filter(e=>e.clubId!==p.clubId),conceded=opponentEvents.filter(e=>e.type==='goal').length;
 const saves=p.position==='GK'?opponentEvents.filter(e=>e.onTarget&&e.type==='shot').length:0;
 const tackles=p.position==='GK'?0:Math.floor(rng()*(['CB','FB','CM'].includes(p.position)?6:3)*Math.max(.45,defenceQuality(p)/75));
 const rating=Math.round(Math.min(10,Math.max(4,5.8+goals*1.15+assists*.7+shots*.05+saves*.19+tackles*.13+(conceded===0&&['GK','CB','FB'].includes(p.position)?.7:0)-conceded*(p.position==='GK'?.15:.07)+rng()*.55))*10)/10;
 return {playerId:p.id,clubId:p.clubId,goals,assists,shots,saves,tackles,rating};
 });
 const homePossession=Math.round(Math.max(32,Math.min(68,50+(effective(home,f.homeId)-effective(away,f.awayId))*.5+(rng()-.5)*12)));
 return {...f,homeGoals,awayGoals,report:{events,performances,homePossession,motmId:selectMotm(performances),homeLineup:home.map(p=>p.id),awayLineup:away.map(p=>p.id),homeFormation:formation(f.homeId),awayFormation:formation(f.awayId)}};
}
