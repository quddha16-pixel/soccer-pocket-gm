import type { Career, KeyMoment, MatchEvent, Player } from '../models';
import type { HighlightActor, HighlightInput, HighlightResult, HighlightState } from './highlightModels';
import { activeDecision, managedFixture } from './keyMoments';
import { fixtureLineup } from './substitutionRules';
import { refreshMatchStatistics } from './match';
import { hash, identity } from './identity';
import { pairKey } from './chemistry';
import { keepingQuality, meanSkill, trait } from './playerSkills';
import { lineupFit } from './management';

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const highlightKind=(m:KeyMoment)=>m.kind==='one-on-one'?'breakaway':m.kind==='big-chance'&&m.pressure==='space'?'counter':undefined;
export function playableMoment(c:Career,m:KeyMoment){
 if(c.playableHighlights===false||!highlightKind(m)||m.clubId!==c.clubId||c.pending?.manual)return false;
 const eligible=managedFixture(c)?.report?.keyMoments?.filter(x=>x.clubId===c.clubId&&highlightKind(x)).sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id))??[];
 return eligible.slice(0,2).some(x=>x.id===m.id);
}
function roll(s:HighlightState){let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function move(p:HighlightActor,x:number,y:number,speed:number,dt:number){const d=Math.hypot(x-p.x,y-p.y);if(d>.01){const k=Math.min(d,speed*dt)/d;p.x=clamp(p.x+(x-p.x)*k,2,59);p.y=clamp(p.y+(y-p.y)*k,3,37);}}
export function highlightContext(c:Career,m:KeyMoment){
 const f=managedFixture(c)!,ids=fixtureLineup(f,m.clubId,m.minute-1),formation=m.clubId===f.homeId?f.report!.homeFormation??'4-3-3':f.report!.awayFormation??'4-3-3';
 return {tactic:c.tactic,players:new Map(c.players.map(p=>[p.id,p])),fit:(p:Player)=>lineupFit(p,formation,ids.indexOf(p.id)),chemistry:c.world.chemistry.pairs};
}
export type HighlightContext=ReturnType<typeof highlightContext>;
export function createHighlight(c:Career,m:KeyMoment):HighlightState {
 if(!playableMoment(c,m)||activeDecision(c)?.id!==m.id)throw Error('This is not a playable break or counterattack.');
 const f=managedFixture(c)!,other=m.clubId===f.homeId?f.awayId:f.homeId,opponents=fixtureLineup(f,other,m.minute-1),byId=new Map(c.players.map(p=>[p.id,p]));
 const defenders=opponents.slice(1).map(id=>byId.get(id)!).sort((a,b)=>Number(['CB','FB'].includes(b.position))-Number(['CB','FB'].includes(a.position))||b.overall-a.overall).slice(0,2);
 const kind=highlightKind(m)!,counter=kind==='counter',attackers=[m.actorId,...new Set([m.receiverId,m.supportId,m.alternateId].filter(id=>id!==m.actorId))].slice(0,3);
 const actor=(id:string,x:number,y:number):HighlightActor=>({id,x,y,cooldown:0});
 return {version:1,momentId:m.id,kind,phase:'ready',elapsed:0,limit:counter?18:14,rng:hash(`${f.report!.simulationSeed}:${m.id}:highlight`)||1,attackers:attackers.map((id,i)=>actor(id,i===0?(counter?20:38):counter?24:37,i===0?20:i===1?10:30)),defenders:defenders.map((p,i)=>actor(p.id,counter?(i===0?35:40):(i===0?30:32),i===0?14:28)),keeper:actor(m.keeperId,58.3,20),controlledId:m.actorId,ball:{x:counter?20:38,y:20,z:0,ownerId:m.actorId},aimY:0,passes:0,attempted:0,links:[],notice:counter?'Space to counter. Attack the goal on the right.':'You’re through! Beat the keeper.'};
}
function finish(s:HighlightState,result:HighlightResult){s.phase='finished';s.result=result;s.ball.ownerId=undefined;s.ball.flight=undefined;s.notice=result.outcome==='goal'?'GOAL!':result.outcome==='saved'?'The keeper makes the save':result.outcome==='wide'?'Just wide':'The defence recovers';}
function endAttack(s:HighlightState,outcome:'blocked'|'intercepted'|'saved'='blocked'){finish(s,{outcome,shooterId:s.controlledId,xG:0,onTarget:outcome==='saved'});}
function speed(p:Player,ctx:HighlightContext){return (4.8+meanSkill(p,'acceleration','sprintSpeed')*.012)*( .82+.18*p.fitness/100)*(.76+.24*ctx.fit(p))*(1+trait(p,'explosive-winger')*.025);}
function shoot(s:HighlightState,a:HighlightActor,p:Player,power:number,ctx:HighlightContext){
 const keeper=ctx.players.get(s.keeper.id)!,dist=60-a.x,angle=Math.abs(a.y-20),finishing=meanSkill(p,'finishing','composure','shotPower'),g=keepingQuality(keeper),placement=Math.abs(s.aimY)*.14;
 const assist=s.lastPass?.to===p.id&&s.elapsed-s.lastPass.at<5?s.lastPass.from:undefined;
 const partnership=assist?Math.min(.03,(ctx.chemistry[pairKey(assist,p.id)]??0)*.001):0,form=clamp(1+(identity(p).development.form-6.5)*.015,.95,1.05);
 const xG=clamp((.64-dist*.013-angle*.008+(finishing-g)*.004+placement+partnership+(assist ? .08 : 0)+trait(p,'clinical-finisher')*.018-Math.abs(power-.65)*.13)*ctx.fit(p)*(.88+.12*p.fitness/100)*form,.06,.86);
 const goalRoll=roll(s),targetRoll=roll(s),target=clamp(.93-dist*.003+(finishing-75)*.001-Math.abs(power-.65)*.18,.62,.97),goal=goalRoll<xG,onTarget=goal||targetRoll<target;
 let endY=20+s.aimY*2.95;
 if(!onTarget)endY=20+(s.aimY<0?-1:1)*(4.5+roll(s)*2);
 const blocked=s.defenders.some(d=>d.x>a.x+1&&d.x<59&&Math.abs(d.y-(a.y+(endY-a.y)*(d.x-a.x)/(60-a.x)))<1.15);
 const result:HighlightResult={outcome:blocked?'blocked':goal?'goal':onTarget?'saved':'wide',shooterId:p.id,assistId:goal?assist:undefined,xG,onTarget:!blocked&&onTarget};
 s.ball={...s.ball,ownerId:undefined,flight:{kind:'shot',fromId:p.id,assistId:assist,startX:a.x,startY:a.y,endX:60.8,endY,elapsed:0,duration:clamp(dist/(25+power*12),.55,1.3),result}};
 s.notice=blocked?'The defender closes the shooting lane':'Shot away!';
}
/** A short 3-v-2 attack, never a replacement for the match simulation. Fixed 30 Hz input, skill-aware assistance. */
export function stepHighlight(previous:HighlightState,input:HighlightInput,dt:number,ctx:HighlightContext):HighlightState {
 if(previous.phase!=='playing')return previous;
 const s:HighlightState={...previous,attackers:previous.attackers.map(p=>({...p})),defenders:previous.defenders.map(p=>({...p})),keeper:{...previous.keeper},ball:{...previous.ball,flight:previous.ball.flight?{...previous.ball.flight}:undefined},links:previous.links.map(l=>({...l}))};
 dt=clamp(dt,0,.05);s.elapsed=Math.min(s.limit+2,s.elapsed+dt);for(const a of [...s.attackers,...s.defenders,s.keeper])a.cooldown=Math.max(0,a.cooldown-dt);
 const owner=s.attackers.find(a=>a.id===s.ball.ownerId),controlled=s.attackers.find(a=>a.id===s.controlledId)!;
 if(input.selectId&&owner?.id===input.selectId)s.controlledId=input.selectId;
 if(owner){
  s.controlledId=owner.id;const p=ctx.players.get(owner.id)!,mag=Math.hypot(input.x,input.y),dx=mag>1?input.x/mag:input.x,dy=mag>1?input.y/mag:input.y;
  owner.x=clamp(owner.x+dx*speed(p,ctx)*dt,2,58.8);owner.y=clamp(owner.y+dy*speed(p,ctx)*dt,3,37);if(Math.abs(input.y)>.12)s.aimY=clamp(input.y,-1,1);
  s.ball.x=owner.x+.6;s.ball.y=owner.y;s.ball.z=.1;
  if(input.shoot!==undefined)shoot(s,owner,p,clamp(input.shoot,.15,1),ctx);
  else if(input.pass){
   const targets=s.attackers.filter(a=>a.id!==owner.id).sort((a,b)=>{const score=(v:HighlightActor)=>{const d=Math.max(1,distance(owner,v)),direction=mag>.2?((v.x-owner.x)*dx+(v.y-owner.y)*dy)/d:0,lane=Math.min(...s.defenders.map(x=>distance(x,v)));return direction*7+(v.x-owner.x)*.25+Math.min(8,lane)*.5-d*.08;};return score(b)-score(a);}),to=targets[0],passSkill=meanSkill(p,'shortPassing','vision');
   s.attempted++;s.ball={...s.ball,ownerId:undefined,flight:{kind:'pass',fromId:p.id,targetId:to.id,startX:owner.x,startY:owner.y,endX:Math.min(53,to.x+1.8+passSkill*.015),endY:to.y,elapsed:0,duration:clamp(distance(owner,to)/(20+passSkill*.08),.3,1.2)}};s.notice='Pass into space';
  }
 }
 // Support runners are free to change depth and angle, rather than locked to formation rods.
 for(const [i,a] of s.attackers.entries())if(a.id!==s.ball.ownerId){const flight=s.ball.flight;if(flight?.kind==='pass'&&flight.targetId===a.id)move(a,flight.endX,flight.endY,speed(ctx.players.get(a.id)!,ctx),dt);else if(a.id!==controlled.id||s.ball.ownerId)move(a,Math.min(54,(owner?.x??s.ball.x)+5+i),i===1?10:i===2?30:20,speed(ctx.players.get(a.id)!,ctx)*.82,dt);}
 for(const [i,d] of s.defenders.entries()){
  const p=ctx.players.get(d.id)!,reaction=s.kind==='counter'?1.9:2.5;if(s.elapsed<reaction)continue;
  const target=i===0?{x:s.ball.x+1,y:s.ball.y}:s.attackers.filter(a=>a.id!==s.ball.ownerId).sort((a,b)=>b.x-a.x)[0];
  move(d,target.x,target.y,3.05+meanSkill(p,'acceleration','standingTackle')*.008,dt);
  if(owner&&s.ball.ownerId&&distance(d,owner)<1.05&&d.cooldown===0){d.cooldown=.7;const skill=meanSkill(ctx.players.get(owner.id)!,'dribbling','ballControl','agility')+trait(ctx.players.get(owner.id)!,'technical-dribbler')*3,defence=meanSkill(p,'standingTackle','interceptions');if(roll(s)<clamp(.39+(defence-skill)*.006,.13,.65)){endAttack(s);return s;}}
 }
 move(s.keeper,s.ball.flight?.kind==='shot'?58.8:58.3,clamp(s.ball.flight?.kind==='shot'&&s.ball.flight.result?.outcome==='saved'?s.ball.flight.endY:20+(s.ball.y-20)*.19,16.8,23.2),4,dt);
 const flight=s.ball.flight;
 if(flight){flight.elapsed+=dt;const t=Math.min(1,flight.elapsed/flight.duration);s.ball.x=flight.startX+(flight.endX-flight.startX)*t;s.ball.y=flight.startY+(flight.endY-flight.startY)*t;s.ball.z=Math.sin(t*Math.PI)*(flight.kind==='shot'?.7:.25);
  if(flight.kind==='pass'&&s.elapsed>2&&s.defenders.some(d=>distance(d,s.ball)<.8)){endAttack(s,'intercepted');return s;}
  if(t>=1){if(flight.kind==='shot'){finish(s,flight.result!);return s;}const receiver=s.attackers.find(a=>a.id===flight.targetId)!;receiver.x=flight.endX;receiver.y=flight.endY;s.controlledId=receiver.id;s.ball={x:receiver.x+.6,y:receiver.y,z:.1,ownerId:receiver.id};s.passes++;s.lastPass={from:flight.fromId,to:receiver.id,at:s.elapsed};const forward=receiver.x-flight.startX>2;if(forward){const link=s.links.find(l=>l.a===flight.fromId&&l.b===receiver.id);if(link)link.passes=Math.min(14,link.passes+1);else s.links.push({a:flight.fromId,b:receiver.id,passes:1,last:s.elapsed});}s.notice='Good pass. You control the receiver.';}
 }
 if(s.elapsed>=s.limit&&!s.ball.flight)endAttack(s);
 return s;
}
export function snapshotHighlight(c:Career,s:HighlightState):Career {
 if(!c.pending||activeDecision(c)?.id!==s.momentId)return c;
 return {...c,pending:{...c.pending,paused:true,highlight:s}};
}
export function completeHighlight(c:Career,s:HighlightState):Career {
 const m=activeDecision(c),f=managedFixture(c);
 if(!c.pending||!m||!f||m.id!==s.momentId||!playableMoment(c,m)||s.phase!=='finished'||!s.result)throw Error('Finish the current attacking highlight first.');
 const result=s.result,shot=['goal','saved','wide'].includes(result.outcome);
 const event:MatchEvent|undefined=shot?{id:m.eventId,momentId:m.id,minute:m.minute,clubId:m.clubId,playerId:result.shooterId,creatorId:result.assistId,assistId:result.outcome==='goal'?result.assistId:undefined,type:result.outcome==='goal'?'goal':'shot',onTarget:result.onTarget,chanceType:m.kind==='one-on-one'?'one-on-one':'close',xG:result.xG}:undefined;
 const moment:KeyMoment={...m,selection:0,outcome:result.outcome,highlight:{...result,elapsed:s.elapsed,passes:s.passes}},events=f.report!.events.filter(e=>e.momentId!==m.id&&e.id!==m.eventId);
 if(event)events.push(event);events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 const links=(f.report!.manualLinks??[]).map(link=>({...link}));for(const link of s.links){const existing=links.find(l=>l.a===link.a&&l.b===link.b);if(existing)existing.passes=Math.min(14,existing.passes+link.passes);else links.push({...link});}
 const updated=refreshMatchStatistics({...f,report:{...f.report!,events,manualLinks:links,keyMoments:f.report!.keyMoments!.map(x=>x.id===m.id?moment:x)}},c);
 return {...c,pending:{...c.pending,highlight:undefined,paused:true,decisionFeedback:m.id,fixtures:c.pending.fixtures.map(x=>x.id===f.id?updated:x)}};
}
export function validHighlight(c:Career){
 try{return checkHighlight(c);}catch{return false;}
}
function checkHighlight(c:Career){
 const s=c.pending?.highlight;if(!s)return true;const m=activeDecision(c);if(!m||m.id!==s.momentId||!playableMoment(c,m)||s.version!==1||!['ready','playing','finished'].includes(s.phase)||![14,18].includes(s.limit)||s.kind!==highlightKind(m)||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>s.limit+2||!Number.isInteger(s.rng)||s.rng<0||s.rng>4294967295)return false;
 const f=managedFixture(c)!,own=fixtureLineup(f,m.clubId,m.minute-1),other=fixtureLineup(f,m.clubId===f.homeId?f.awayId:f.homeId,m.minute-1),actors=[...s.attackers,...s.defenders,s.keeper];
 const expected=[m.actorId,...new Set([m.receiverId,m.supportId,m.alternateId].filter(id=>id!==m.actorId))].slice(0,3);
 if(s.attackers.length!==3||s.defenders.length!==2||new Set(actors.map(a=>a.id)).size!==6||s.attackers.some((a,i)=>a.id!==expected[i]||!own.slice(1).includes(a.id))||s.defenders.some(a=>!other.slice(1).includes(a.id))||s.keeper.id!==m.keeperId||!s.attackers.some(a=>a.id===s.controlledId)||actors.some(a=>![a.x,a.y,a.cooldown].every(Number.isFinite)||a.x<0||a.x>61||a.y<0||a.y>40||a.cooldown<0))return false;
 if(![s.ball.x,s.ball.y,s.ball.z,s.aimY].every(Number.isFinite)||s.ball.x<0||s.ball.x>62||s.ball.y<0||s.ball.y>40||s.ball.z<0||s.ball.z>2||Math.abs(s.aimY)>1||!Number.isInteger(s.passes)||!Number.isInteger(s.attempted)||s.passes<0||s.passes>s.attempted||s.attempted>60||s.ball.ownerId&&!s.attackers.some(a=>a.id===s.ball.ownerId))return false;
 if(s.result&&!validHighlightResult(s.result,s.attackers.map(a=>a.id)))return false;if((s.phase==='finished')!==!!s.result)return false;
 const flight=s.ball.flight;if(flight&&(!['pass','shot'].includes(flight.kind)||!s.attackers.some(a=>a.id===flight.fromId)||s.ball.ownerId!==undefined||![flight.startX,flight.startY,flight.endX,flight.endY,flight.elapsed,flight.duration].every(Number.isFinite)||flight.startX<0||flight.startX>62||flight.endX<0||flight.endX>62||flight.startY<0||flight.startY>40||flight.endY<0||flight.endY>40||flight.duration<=0||flight.duration>2||flight.elapsed<0||flight.elapsed>flight.duration+.06||flight.kind==='shot'&&(!flight.result||!validHighlightResult(flight.result,s.attackers.map(a=>a.id)))||flight.kind==='pass'&&!s.attackers.some(a=>a.id===flight.targetId)))return false;
 if(!Array.isArray(s.links)||s.links.length>6||s.links.some(l=>!s.attackers.some(a=>a.id===l.a)||!s.attackers.some(a=>a.id===l.b)||l.a===l.b||!Number.isInteger(l.passes)||l.passes<0||l.passes>14||!Number.isFinite(l.last)))return false;
 if(s.lastPass&&(!s.attackers.some(a=>a.id===s.lastPass!.from)||!s.attackers.some(a=>a.id===s.lastPass!.to)||s.lastPass.from===s.lastPass.to||!Number.isFinite(s.lastPass.at)||s.lastPass.at<0||s.lastPass.at>s.elapsed))return false;
 if(s.phase==='ready'&&(s.elapsed!==0||s.ball.ownerId!==m.actorId||flight)||s.phase==='playing'&&!s.ball.ownerId&&!flight||s.phase==='finished'&&(flight||s.ball.ownerId))return false;
 return true;
}
export function validHighlightResult(r:HighlightResult,ids:string[]){return !!r&&['goal','saved','wide','blocked','intercepted'].includes(r.outcome)&&ids.includes(r.shooterId)&&(!r.assistId||ids.includes(r.assistId)&&r.assistId!==r.shooterId)&&Number.isFinite(r.xG)&&r.xG>=0&&r.xG<=1&&typeof r.onTarget==='boolean'&&r.onTarget===['goal','saved'].includes(r.outcome);}
