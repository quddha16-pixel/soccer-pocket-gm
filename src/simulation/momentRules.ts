import {drawnProbabilities,drawnReceiver} from './drawnMoments';
import { aimedProbabilities } from './shotGeometry';
import type { Career, Fixture, KeyMoment, MatchEvent, MomentKind, MomentOption, Player } from '../models';
import { hash, identity } from './identity';
import { random } from './random';
import { fixtureLineup } from './substitutionRules';
import { lineupFit, slots } from './management';
import { defenceQuality, keepingQuality, meanSkill, trait } from './playerSkills';

export const momentKinds:MomentKind[]=['penalty','free-kick','corner','one-on-one','big-chance','cross'];
export const momentTitles:Record<MomentKind,string>={penalty:'Penalty kick','free-kick':'Free kick',corner:'Corner','one-on-one':'1 on 1','big-chance':'Big play chance',cross:'Major cross opportunity'};
export const momentOptions:Record<MomentKind,{title:string;hint:string}[]>={
 penalty:[
  {title:'Power blast low and hard to one side',hint:'Shot power and finishing. Can overpower the keeper, with a risk of missing.'},
  {title:'Precise placement into the opposite corner',hint:'Finishing and composure. Accuracy matters more than power.'},
  {title:'Panenka chip straight down the middle',hint:'Composure and touch. Risky if the keeper holds their ground.'}],
 'free-kick':[
  {title:'Direct shot on goal — curl or power',hint:'Long shots, shot power and set-piece skill against the wall and keeper.'},
  {title:'Floated cross into the box',hint:'Delivery and an aerial target against defensive marking.'},
  {title:'Short pass for a better angle',hint:'Passing and vision to find a teammate before the defence closes.'}],
 corner:[
  {title:'Inswinging delivery to the near post',hint:'Accurate crossing and an aggressive aerial run.'},
  {title:'Outswinging delivery to the far post',hint:'Find a target at the far post or penalty spot. Heading and jumping matter.'},
  {title:'Short corner for a different angle',hint:'Passing and close control can open a new route through the defence.'}],
 'one-on-one':[
  {title:'Early low shot past the keeper',hint:'Finishing and composure before the keeper closes down the angle.'},
  {title:'Dribble around or nutmeg the keeper',hint:'Dribbling, agility and acceleration. Risk losing the ball to the keeper.'},
  {title:'Chip over the advancing keeper',hint:'Touch and composure. Most useful when the keeper advances.'}],
 'big-chance':[
  {title:'First-time shot',hint:'Strike before defenders recover. Finishing and composure are key.'},
  {title:'Take a touch and shoot',hint:'Ball control steadies the shot, but defenders have time to close.'},
  {title:'Square to a better-placed teammate',hint:'Vision and short passing. The teammate takes the finish.'}],
 cross:[
  {title:'High whipped cross to the far post',hint:'Crossing and an aerial finisher against the keeper’s command of the box.'},
  {title:'Low driven cross across the six-yard box',hint:'Delivery, attacking movement and a close-range finish.'},
  {title:'Cut-back to the edge of the area',hint:'Vision and passing to find a teammate arriving for a shot.'}]
};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
function playersAt(f:Fixture,c:Career,clubId:string,minute:number,byId?:Map<string,Player>){
 return fixtureLineup(f,clubId,minute-1).map(id=>{
  const p=(byId?.get(id)??c.players.find(p=>p.id===id))!,entered=f.report?.substitutions?.find(s=>s.onId===id)?.minute??0;
  return {...p,fitness:Math.max(40,p.fitness-(minute-1-entered)*.18)};
 });
}
function context(f:Fixture,c:Career,m:KeyMoment,byId=new Map(c.players.map(p=>[p.id,p]))){
 const team=playersAt(f,c,m.clubId,m.minute,byId),other=m.clubId===f.homeId?f.awayId:f.homeId,opponents=playersAt(f,c,other,m.minute,byId);
 const formation=m.clubId===f.homeId?f.report!.homeFormation??'4-3-3':f.report!.awayFormation??'4-3-3',otherFormation=other===f.homeId?f.report!.homeFormation??'4-3-3':f.report!.awayFormation??'4-3-3';
 const fit=(p:Player)=>lineupFit(p,formation,team.findIndex(x=>x.id===p.id));
 const defence=opponents.slice(1).reduce((sum,p,i)=>sum+defenceQuality(p)*lineupFit(p,otherFormation,i+1),0)/10;
 const player=(id:string)=>team.find(p=>p.id===id)!;
 return {team,opponents,fit,defence,actor:player(m.actorId),receiver:player(m.receiverId),alternate:player(m.alternateId),support:player(m.supportId),keeper:opponents[0]};
}
export interface MomentAssessment {completion:number;conversion:number;onTarget:number;shooterId:string;assistId?:string;chanceType:NonNullable<MatchEvent['chanceType']>}
/** Original game probabilities, not claims about official football statistics.
 * Completing a delivery/dribble and converting the eventual shot are separate. */
export function assessMoment(f:Fixture,c:Career,m:KeyMoment,option:MomentOption,prepared=context(f,c,m)):MomentAssessment {
 const {actor:a,receiver:originalReceiver,alternate:t,support:u,keeper:k,fit,defence:d}=prepared,r=m.drawnPlay?.delivery?prepared.team.find(p=>p.id===drawnReceiver(m,m.drawnPlay!))!:originalReceiver,g=keepingQuality(k),fatigue=.82+.18*a.fitness/100;
 const setPiece=['penalty','free-kick','corner'].includes(m.kind),familiarity=setPiece?1:fit(a),pressure=m.pressure==='closing'?1:0;
 const control=meanSkill(a,'ballControl','composure'),finish=meanSkill(a,'finishing','composure','positioning'),passing=meanSkill(a,'shortPassing','vision'),delivery=meanSkill(a,'crossing','longPassing');
 let completion=1,conversion=.14,onTarget=.48,shooter=a,assistId:string|undefined,chanceType:MomentAssessment['chanceType']='close';
 const score=(p:Player)=>meanSkill(p,'finishing','positioning','composure')*fit(p);
 const aerial=(p:Player)=>meanSkill(p,'heading','jumping','strength')+trait(p,'aerial-threat')*2;
 if(m.kind==='penalty'){
  conversion=option===0?.74+(meanSkill(a,'shotPower','finishing')-75)*.003-(g-75)*.002:
   option===1?.76+(meanSkill(a,'finishing','composure')-75)*.0035-(meanSkill(k,'reflexes','gkPositioning')-75)*.002:
   .64+(control-75)*.004+trait(a,'flair-player')*.012+(m.keeperApproach==='committing'?.09:-.16);
  onTarget=option===0?.73:option===1?.81:.88;
 }else if(m.kind==='free-kick'){
  if(option===0){conversion=.065+(meanSkill(a,'longShots','shotPower','composure')-75)*.0017+(trait(a,'set-piece-specialist')+trait(a,'long-range-specialist'))*.014-(g-75)*.001;chanceType='distance';}
  else if(option===1){completion=.62+(delivery-d)*.004;conversion=.10+(aerial(r)-g)*.002;shooter=r;assistId=a.id;chanceType='aerial';}
  else {completion=.77+(passing-d)*.003-pressure*.05;conversion=.12+(score(u)-g)*.002;shooter=u;assistId=a.id;}
 }else if(m.kind==='corner'){
  if(option<2){shooter=option===0?r:t;completion=(option===0?.61:.71)+(delivery-d)*.004+trait(a,'precision-crosser')*.02-(option===0?pressure*.08:0);conversion=(option===0?.08:.06)+(aerial(shooter)-meanSkill(k,'handling','aerialAbility','gkPositioning'))*.002-(option===0?pressure*.02:0);chanceType='aerial';}
  else {shooter=u;completion=.78+(passing+control-2*d)*.002;conversion=.07+(score(u)-g)*.0018;}
  assistId=a.id;
 }else if(m.kind==='one-on-one'){
  if(m.drawnPlay?.approach==='pass'){completion=.80+(passing-d)*.003-pressure*.06;conversion=.29+(score(r)-g)*.0025;shooter=r;assistId=a.id;}
  else if(option===0)conversion=.27+(finish-g)*.003-(m.keeperApproach==='advancing'?.025:0);
  else if(option===1){completion=.64+(meanSkill(a,'dribbling','agility','acceleration')-meanSkill(k,'oneOnOne','reflexes'))*.006-pressure*.08;conversion=.51+(finish-75)*.003;}
  else conversion=.22+(control-g)*.003+(m.keeperApproach==='advancing'?.12:-.08);
  chanceType='one-on-one';
 }else if(m.kind==='big-chance'){
  if(option===0)conversion=.19+(finish-g)*.0025+(pressure?.025:0);
  else if(option===1){completion=.90+(control-d)*.002-pressure*.16;conversion=.24+(finish+control-2*g)*.0018;}
  else {shooter=r;assistId=a.id;completion=.83+(passing-d)*.003;conversion=.25+(score(r)-g)*.002;}
 }else {
  assistId=a.id;
  if(option===0){shooter=r;completion=.69+(delivery-d)*.004+trait(a,'precision-crosser')*.02;conversion=.14+(aerial(r)-meanSkill(k,'handling','aerialAbility'))*.002;chanceType='aerial';}
  else if(option===1){shooter=r;completion=.73+(delivery+passing-2*d)*.0025;conversion=.21+(score(r)-g)*.002;}
  else {shooter=u;completion=.81+(passing-d)*.003;conversion=.14+(meanSkill(u,'longShots','ballControl','composure')*fit(u)-g)*.002;chanceType='distance';}
 }
 if(m.drawnPlay?.delivery){shooter=prepared.team.find(p=>p.id===drawnReceiver(m,m.drawnPlay!))!;assistId=a.id;}
 const form=clamp(1+(identity(shooter).development.form-6.5)*.015,.95,1.05);
 if(m.kind!=='penalty')completion*=fatigue*(setPiece?1:.7+.3*familiarity);
 conversion*=form*(m.kind==='penalty'?(.9+.1*a.fitness/100):(.75+.25*shooter.fitness/100)*(setPiece?1:shooter.id===a.id?familiarity:fit(shooter)));
 if(m.kind!=='penalty')conversion+=(m.baseXg-.15)*.12;
 const base={completion:completion===1?1:clamp(completion,.2,.97),conversion:clamp(conversion,m.kind==='penalty'?.4:.015,m.kind==='penalty'?.93:.48),onTarget,shooterId:shooter.id,assistId,chanceType};
 if(m.drawnPlay)return {...base,...drawnProbabilities(base,m.drawnPlay,m.kind,meanSkill(shooter,...(m.kind==='free-kick'?['longShots','shotPower','composure'] as const:['finishing','composure'] as const))+trait(a,'set-piece-specialist')*(m.kind==='free-kick'?3:0))};
 if(m.shot&&(m.kind==='penalty'||m.kind==='free-kick'))return {...base,...aimedProbabilities(base,m.shot,m.kind,meanSkill(a,...(m.kind==='penalty'?['finishing','composure'] as const:['longShots','shotPower','composure'] as const))+trait(a,'set-piece-specialist')*3)};
 return base;
}

export function resolveMoment(f:Fixture,c:Career,m:KeyMoment,option:MomentOption,prepared?:ReturnType<typeof context>):{moment:KeyMoment;event?:MatchEvent}{
 const seed=f.report!.simulationSeed??hash(f.id),rng=random(hash(`${seed}:${m.id}:outcome`)),a=assessMoment(f,c,m,option,prepared),deliveryRoll=rng(),goalRoll=rng(),targetRoll=rng();
 if(deliveryRoll>=a.completion)return {moment:{...m,outcome:m.shot||m.drawnPlay&&!m.drawnPlay.delivery?'blocked':m.drawnPlay?.delivery||['corner','cross','free-kick'].includes(m.kind)?'intercepted':'blocked'}};
 const goal=goalRoll<a.conversion,onTarget=goal||targetRoll<a.onTarget;
 const event:MatchEvent={id:m.eventId,momentId:m.id,minute:m.minute,clubId:m.clubId,playerId:a.shooterId,creatorId:a.assistId,assistId:goal?a.assistId:undefined,type:goal?'goal':'shot',onTarget,chanceType:a.chanceType,xG:a.conversion};
 return {moment:{...m,outcome:goal?'goal':onTarget?'saved':'wide'},event};
}

function newMoment(f:Fixture,c:Career,e:MatchEvent,kind:MomentKind,byId:Map<string,Player>) {
 const team=playersAt(f,c,e.clubId,e.minute,byId),other=e.clubId===f.homeId?f.awayId:f.homeId,keeper=playersAt(f,c,other,e.minute,byId)[0],formation=e.clubId===f.homeId?f.report!.homeFormation??'4-3-3':f.report!.awayFormation??'4-3-3';
 const outfield=team.slice(1),fit=(p:Player)=>lineupFit(p,formation,team.findIndex(x=>x.id===p.id));
 const best=(list:Player[],score:(p:Player)=>number)=>[...list].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
 let actor=team.find(p=>p.id===e.playerId)!;
 if(kind==='penalty')actor=best(outfield,p=>meanSkill(p,'finishing','composure','shotPower'))[0];
 if(kind==='free-kick'||kind==='corner')actor=best(outfield,p=>meanSkill(p,'longShots','crossing','vision')+trait(p,'set-piece-specialist')*4)[0];
 if(kind==='cross')actor=team.find(p=>p.id===e.creatorId)??best(outfield,p=>meanSkill(p,'crossing','vision')*fit(p))[0];
 const targets=outfield.filter(p=>p.id!==actor.id),aerial=kind==='corner'||kind==='free-kick'||kind==='cross';
 const preference=(p:Player)=>c.clubId===e.clubId&&c.tactic==='feed-star'&&p.id===c.starId&&fit(p)>=.85?1.8:1;
 const ranked=best(targets,p=>(aerial?meanSkill(p,'heading','jumping','positioning')+trait(p,'aerial-threat')*2:meanSkill(p,'finishing','positioning','composure')*fit(p)*(['ST','WG'].includes(slots[formation][team.findIndex(x=>x.id===p.id)])?1.15:1))*preference(p));
 // A surfaced cross keeps the match engine's intended finisher. Replacing
 // every target with the same best striker would erase tactical shot allocation.
 if(kind==='cross'&&e.playerId!==actor.id){const index=ranked.findIndex(p=>p.id===e.playerId);if(index>0)ranked.unshift(...ranked.splice(index,1));}
 const rng=random(hash(`${f.report!.simulationSeed}:${e.id}:scene`));
 const m:KeyMoment={id:`moment-${e.id}`,eventId:e.id,minute:e.minute,clubId:e.clubId,kind,actorId:actor.id,receiverId:ranked[0].id,alternateId:ranked[1].id,supportId:best(targets,p=>meanSkill(p,'shortPassing','ballControl','longShots')*fit(p)*(slots[formation][team.findIndex(x=>x.id===p.id)]==='CM'?1.2:1))[0].id,keeperId:keeper.id,baseXg:e.xG??.15,keeperApproach:kind==='penalty'?(rng()<.55?'committing':'set'):(rng()<.5?'advancing':'set'),pressure:rng()<.5?'closing':'space',autoChoice:0,outcome:'wide'};
 const prepared=context(f,c,m,byId),scores=([0,1,2] as const).map(option=>{const a=assessMoment(f,c,m,option,prepared);return {option,score:a.completion*a.conversion+(c.clubId===m.clubId&&c.tactic==='feed-star'&&a.shooterId===c.starId?.04:0)};});
 // AI assesses the same football inputs, with a small fixed tactical preference.
 m.autoChoice=scores.sort((a,b)=>(b.score+(hash(`${m.id}:${b.option}`)%15)/1000)-(a.score+(hash(`${m.id}:${a.option}`)%15)/1000))[0].option;
 return {moment:m,prepared};
}

export function addKeyMoments(f:Fixture,c:Career,known?:Fixture,preserveThrough=0):Fixture {
 const byId=new Map(c.players.map(p=>[p.id,p])),report=f.report!,keyMoments=(known?.report?.keyMoments??[]).filter(m=>m.minute<=preserveThrough),events:MatchEvent[]=[];
 for(const e of report.events){
  if(e.minute<=preserveThrough){events.push(e);continue;}
  const roll=(hash(`${report.simulationSeed}:${e.id}:kind`)%10000)/10000;
  // Surface more of the chances already created by the match engine. A one-on-one
  // remains playable rather than being hidden by a second random kind roll.
  const kind:MomentKind|undefined=e.chanceType==='one-on-one'?'one-on-one':roll<.018?'penalty':roll<.11?'free-kick':roll<.36?'cross':e.chanceType==='close'&&(e.xG??0)>=.08&&roll<.90?'big-chance':undefined;
  if(!kind||(kind!=='penalty'&&keyMoments.filter(m=>m.clubId===e.clubId&&m.kind!=='corner').length>=10)){events.push(e);continue;}
  const {moment:m,prepared}=newMoment(f,c,e,kind,byId),resolved=resolveMoment(f,c,m,m.autoChoice,prepared);keyMoments.push(resolved.moment);if(resolved.event)events.push(resolved.event);
 }
 const rng=random(hash(`${report.simulationSeed}:${f.id}:corner-plan`)),past=keyMoments.filter(m=>m.kind==='corner').length,cornerTarget=preserveThrough>=90?past:known?.report?.cornerTarget??4+Math.floor((rng()+rng()+rng())/3*14);
 for(let i=0;keyMoments.filter(m=>m.kind==='corner').length<cornerTarget;i++){
  const eventId=`corner-${f.id}-${i}`;if(keyMoments.some(m=>m.eventId===eventId))continue;
  const planned=1+Math.floor((i+.25+(hash(eventId)%50)/100)*89/cornerTarget),remaining=Math.max(1,90-preserveThrough),minute=planned>preserveThrough?Math.min(90,planned):preserveThrough+1+hash(eventId)%remaining;
  const clubId=hash(`${report.simulationSeed}:${eventId}:team`)%100<report.homePossession?f.homeId:f.awayId,playerId=playersAt(f,c,clubId,minute,byId)[1].id;
  const source:MatchEvent={id:eventId,minute,clubId,playerId,type:'shot',onTarget:false,chanceType:'aerial',xG:.05},created=newMoment(f,c,source,'corner',byId),resolved=resolveMoment(f,c,created.moment,created.moment.autoChoice,created.prepared);
  keyMoments.push(resolved.moment);if(resolved.event)events.push(resolved.event);
 }
 events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));keyMoments.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 return {...f,report:{...report,cornerTarget:cornerTarget<4||cornerTarget>17?undefined:cornerTarget,events,keyMoments}};
}
