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
export const highlightKind=(m:KeyMoment)=>m.kind==='one-on-one'?'breakaway':m.kind==='corner'?'corner':undefined;
export function playableMoment(c:Career,m:KeyMoment){
 if(c.playableHighlights===false||c.pending?.manual)return false;
 // Version 2.1 counter saves can finish without discarding the attack in progress.
 if(c.pending?.highlight?.momentId===m.id&&c.pending.highlight.kind==='counter')return true;
 return m.kind==='corner'||m.kind==='one-on-one'&&m.clubId===c.clubId;
}
function roll(s:HighlightState){let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function move(p:HighlightActor,x:number,y:number,speed:number,dt:number){const d=Math.hypot(x-p.x,y-p.y);if(d>.01){const k=Math.min(d,speed*dt)/d;const px=p.x,py=p.y;p.x=clamp(p.x+(x-p.x)*k,2,59);p.y=clamp(p.y+(y-p.y)*k,3,37);p.vx=dt>0?(p.x-px)/dt:0;p.vy=dt>0?(p.y-py)/dt:0;}}
export function highlightContext(c:Career,m:KeyMoment){
 const f=managedFixture(c)!,ids=fixtureLineup(f,m.clubId,m.minute-1),formation=m.clubId===f.homeId?f.report!.homeFormation??'4-3-3':f.report!.awayFormation??'4-3-3',other=m.clubId===f.homeId?f.awayId:f.homeId,opponents=fixtureLineup(f,other,m.minute-1),otherFormation=other===f.homeId?f.report!.homeFormation??'4-3-3':f.report!.awayFormation??'4-3-3';
 return {tactic:c.tactic,players:new Map(c.players.map(p=>[p.id,p])),fit:(p:Player)=>p.clubId===m.clubId?lineupFit(p,formation,ids.indexOf(p.id)):lineupFit(p,otherFormation,opponents.indexOf(p.id)),chemistry:c.world.chemistry.pairs};
}
export type HighlightContext=ReturnType<typeof highlightContext>;
export function createHighlight(c:Career,m:KeyMoment):HighlightState {
 if(!playableMoment(c,m)||activeDecision(c)?.id!==m.id)throw Error('This is not a playable break or counterattack.');
 const f=managedFixture(c)!,other=m.clubId===f.homeId?f.awayId:f.homeId,opponents=fixtureLineup(f,other,m.minute-1),byId=new Map(c.players.map(p=>[p.id,p]));
 const defenders=opponents.slice(1).map(id=>byId.get(id)!).sort((a,b)=>Number(['CB','FB'].includes(b.position))-Number(['CB','FB'].includes(a.position))||b.overall-a.overall).slice(0,m.kind==='corner'?3:2);
 const kind=highlightKind(m)!,counter=false,attackers=[m.actorId,...new Set([m.receiverId,m.supportId,m.alternateId].filter(id=>id!==m.actorId))].slice(0,3);
 const actor=(id:string,x:number,y:number):HighlightActor=>({id,x,y,cooldown:0});
 const state:HighlightState={version:1,momentId:m.id,kind,phase:'ready',elapsed:0,limit:counter?18:14,rng:hash(`${f.report!.simulationSeed}:${m.id}:highlight`)||1,attackers:attackers.map((id,i)=>actor(id,i===0?(counter?20:38):counter?24:41,i===0?20:i===1?10:30)),defenders:defenders.map((p,i)=>actor(p.id,counter?(i===0?35:40):(i===0?30:32),i===0?14:28)),keeper:actor(m.keeperId,58.3,20),controlledId:m.actorId,ball:{x:counter?20:38,y:20,z:0,ownerId:m.actorId},aimY:0,passes:0,attempted:0,links:[],notice:counter?'Space to counter. Attack the goal on the right.':'You’re through! Beat the keeper.'};
 if(kind==='corner'){const left=hash(m.id)%2===0;state.limit=18;state.defending=m.clubId!==c.clubId;state.delivered=false;state.attackers.forEach((a,i)=>{a.x=i===0?59:50+i;a.y=i===0?(left?3:37):i===1?17:26;});state.defenders.forEach((a,i)=>{a.x=52+i;a.y=13+i*7;});state.ball={x:59,y:left?3:37,z:0,ownerId:m.actorId};state.controlledId=state.defending?state.defenders[0].id:m.actorId;state.notice=state.defending?'Defend the corner. Track the runner and time your clearance.':'Aim the delivery. Cross into the box or play a short corner.';}
 return state;
}
function finish(s:HighlightState,result:HighlightResult){s.phase='finished';s.result=result;s.ball.ownerId=undefined;s.ball.flight=undefined;s.notice=result.outcome==='goal'?'GOAL!':result.outcome==='saved'?'The keeper makes the save':result.outcome==='wide'?'Just wide':'The defence recovers';}
function endAttack(s:HighlightState,outcome:'blocked'|'intercepted'|'saved'='blocked'){finish(s,{outcome,shooterId:s.defending?s.attackers[0].id:s.controlledId,xG:0,onTarget:outcome==='saved'});}
function speed(p:Player,ctx:HighlightContext){return (4.8+meanSkill(p,'acceleration','sprintSpeed')*.012)*( .82+.18*p.fitness/100)*(.76+.24*ctx.fit(p))*(1+trait(p,'explosive-winger')*.025);}
export function finishTarget(s:HighlightState){return {x:60.8,y:20+s.aimY*2.95};}
function shoot(s:HighlightState,a:HighlightActor,p:Player,power:number,ctx:HighlightContext,chip=false){
 const aerial=s.kind==='corner'&&s.ball.z>.65&&!!s.lastPass&&s.elapsed-s.lastPass.at<1;
 const keeper=ctx.players.get(s.keeper.id)!,dist=60-a.x,angle=Math.abs(a.y-20),finishing=aerial?meanSkill(p,'heading','jumping','composure'):meanSkill(p,'finishing','composure','shotPower'),g=keepingQuality(keeper),placement=Math.abs(s.aimY)*.14;
 const assist=s.lastPass?.to===p.id&&s.elapsed-s.lastPass.at<5?s.lastPass.from:undefined;
 const partnership=assist?Math.min(.03,(ctx.chemistry[pairKey(assist,p.id)]??0)*.001):0,form=clamp(1+(identity(p).development.form-6.5)*.015,.95,1.05);
 const keeperDepth=58.3-s.keeper.x,aimTarget=finishTarget(s),laneY=a.y+(aimTarget.y-a.y)*clamp((s.keeper.x-a.x)/Math.max(.1,aimTarget.x-a.x),0,1),coverage=Math.abs(laneY-s.keeper.y),rounded=a.x>s.keeper.x+1.2;
 // Aim and keeper position matter alongside finishing. Chips reward reading
 // an advancing keeper, with a touch/composure cost and no guaranteed outcome.
 const spatial=aerial?0:chip?(keeperDepth>3?.16+(meanSkill(p,'ballControl','composure')-75)*.003:-.20):rounded?.24:clamp((coverage-1.2)*.05,-.09,.14);
 const xG=clamp(((aerial?.29:.64)-dist*(aerial?.009:.013)-angle*.008+(finishing-g)*.004+placement+spatial+partnership+(assist ? .08 : 0)+trait(p,'clinical-finisher')*.018-Math.abs(power-.65)*.13)*ctx.fit(p)*(.88+.12*p.fitness/100)*form,.06,.90);
 const goalRoll=roll(s),targetRoll=roll(s),target=clamp(.93-dist*.003+(finishing-75)*.001-Math.abs(power-.65)*.18,.62,.97),goal=goalRoll<xG,onTarget=goal||targetRoll<target;
 let endY=aimTarget.y;
 if(!onTarget)endY=20+(s.aimY<0?-1:1)*(4.5+roll(s)*2);
 const blocked=s.defenders.some(d=>d.x>a.x+1&&d.x<59&&Math.abs(d.y-(a.y+(endY-a.y)*(d.x-a.x)/(60-a.x)))<(chip?.55:1.15));
 const result:HighlightResult={outcome:blocked?'blocked':goal?'goal':onTarget?'saved':'wide',shooterId:p.id,assistId:goal?assist:undefined,xG,onTarget:!blocked&&onTarget};
 s.ball={...s.ball,ownerId:undefined,flight:{kind:'shot',fromId:p.id,assistId:assist,startX:a.x,startY:a.y,...(aerial?{startZ:1.65,endZ:.4}:chip?{loft:2.5,endZ:.65}:{}),endX:60.8,endY,elapsed:0,duration:chip?clamp(dist/18,.8,1.6):clamp(dist/(25+power*12),.42,1.3),result}};
 s.notice=blocked?'The defender closes the shooting lane':chip?'Lifted over the keeper!':'Low finish away!';
}
/** A short 3-v-2 attack, never a replacement for the match simulation. Fixed-step input, skill-aware assistance. */
export function stepHighlight(previous:HighlightState,input:HighlightInput,dt:number,ctx:HighlightContext):HighlightState {
 if(previous.phase!=='playing')return previous;
 const s:HighlightState={...previous,attackers:previous.attackers.map(p=>({...p,vx:0,vy:0})),defenders:previous.defenders.map(p=>({...p,vx:0,vy:0})),keeper:{...previous.keeper,vx:0,vy:0},ball:{...previous.ball,flight:previous.ball.flight?{...previous.ball.flight}:undefined},links:previous.links.map(l=>({...l}))};
 dt=clamp(dt,0,.05);s.elapsed=Math.min(s.limit+2,s.elapsed+dt);for(const a of [...s.attackers,...s.defenders,s.keeper])a.cooldown=Math.max(0,a.cooldown-dt);
 if(s.kind==='corner')return stepCorner(s,input,dt,ctx);
 const owner=s.attackers.find(a=>a.id===s.ball.ownerId),controlled=s.attackers.find(a=>a.id===s.controlledId)!;
 if(input.selectId&&owner?.id===input.selectId)s.controlledId=input.selectId;
 if(owner){
  s.controlledId=owner.id;const p=ctx.players.get(owner.id)!,mag=Math.hypot(input.x,input.y),dx=mag>1?input.x/mag:input.x,dy=mag>1?input.y/mag:input.y;
  owner.vx=dx*speed(p,ctx);owner.vy=dy*speed(p,ctx);owner.x=clamp(owner.x+owner.vx*dt,2,58.8);owner.y=clamp(owner.y+owner.vy*dt,3,37);if(Math.abs(input.y)>.12)s.aimY=clamp(input.y,-1,1);
  s.ball.x=owner.x+.55+Math.sin(s.elapsed*13)*.12*mag;s.ball.y=owner.y;s.ball.z=.1+Math.abs(Math.sin(s.elapsed*13))*.09*Math.min(1,mag);
  if(input.shoot!==undefined)shoot(s,owner,p,clamp(input.shoot,.15,1),ctx,!!input.chip);
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
 const keeper=ctx.players.get(s.keeper.id)!,shot=s.ball.flight?.kind==='shot',advancing=!shot&&s.ball.x>43&&Math.abs(s.ball.y-20)<12,keeperX=shot?58.8:advancing?clamp(s.ball.x+4.2,51,56.8):58.3;
 move(s.keeper,keeperX,clamp(shot&&s.ball.flight!.result?.outcome==='saved'?s.ball.flight!.endY:20+(s.ball.y-20)*(advancing?.48:.23),16.2,23.8),3.5+meanSkill(keeper,'oneOnOne','reflexes')*.012,dt);
 if(owner&&s.ball.ownerId&&(!s.lastPass||s.elapsed-s.lastPass.at>1.3))s.notice=owner.x>s.keeper.x+1.2?'Past the keeper. Stay composed.':advancing?'Keeper advances. Pick a corner or chip.':'Carry into space. Watch the keeper.';
 if(owner&&s.ball.ownerId&&distance(owner,s.keeper)<1.25&&s.keeper.cooldown===0){s.keeper.cooldown=.65;const p=ctx.players.get(owner.id)!,chance=clamp(.36+(meanSkill(keeper,'oneOnOne','reflexes')-meanSkill(p,'dribbling','agility','composure'))*.005,.14,.65);if(roll(s)<chance){endAttack(s,'intercepted');s.notice='The keeper smothers at your feet';return s;}}
 const flight=s.ball.flight;
 if(flight){flight.elapsed+=dt;const t=Math.min(1,flight.elapsed/flight.duration);s.ball.x=flight.startX+(flight.endX-flight.startX)*t;s.ball.y=flight.startY+(flight.endY-flight.startY)*t;s.ball.z=(flight.startZ??0)*(1-t)+(flight.endZ??0)*t+Math.sin(t*Math.PI)*(flight.loft??(flight.kind==='shot'?.22:.25));
  if(flight.kind==='pass'&&s.elapsed>2&&s.defenders.some(d=>distance(d,s.ball)<.8)){endAttack(s,'intercepted');return s;}
  if(t>=1){if(flight.kind==='shot'){finish(s,flight.result!);return s;}const receiver=s.attackers.find(a=>a.id===flight.targetId)!;receiver.x=flight.endX;receiver.y=flight.endY;s.controlledId=receiver.id;s.ball={x:receiver.x+.6,y:receiver.y,z:.1,ownerId:receiver.id};s.passes++;s.lastPass={from:flight.fromId,to:receiver.id,at:s.elapsed};const forward=receiver.x-flight.startX>2;if(forward){const link=s.links.find(l=>l.a===flight.fromId&&l.b===receiver.id);if(link)link.passes=Math.min(14,link.passes+1);else s.links.push({a:flight.fromId,b:receiver.id,passes:1,last:s.elapsed});}s.notice='Good pass. You control the receiver.';}
 }
 if(s.elapsed>=s.limit&&!s.ball.flight)endAttack(s);
 return s;
}
function cornerDelivery(s:HighlightState,short:boolean){
 const owner=s.attackers.find(a=>a.id===s.ball.ownerId)!;let target=s.attackers[s.aimY>.15?2:1];
 if(target.id===owner.id)target=s.attackers.find(a=>a.id!==owner.id&&a.id!==s.attackers[0].id)??s.attackers[1];
 if(short&&!s.delivered){target=s.attackers[2];target.x=53;target.y=owner.y<20?6:34;}
 const cross=!short&&!s.delivered;s.delivered=true;s.attempted++;
 s.ball={...s.ball,ownerId:undefined,flight:{kind:cross?'cross':'pass',fromId:owner.id,targetId:target.id,startX:owner.x,startY:owner.y,endX:target.x+.4,endY:target.y,elapsed:0,duration:cross?1.7:clamp(distance(owner,target)/22,.4,1.2)}};
 s.notice=cross?'Delivery in flight. Time your header.':'Short pass. Find the next opening.';
}
function stepCorner(s:HighlightState,input:HighlightInput,dt:number,ctx:HighlightContext):HighlightState {
 const controlled=(s.defending?s.defenders:s.attackers).find(a=>a.id===s.controlledId)!,owner=s.attackers.find(a=>a.id===s.ball.ownerId);
 if(s.defending){
  const mag=Math.max(1,Math.hypot(input.x,input.y));move(controlled,controlled.x+input.x/mag*10,controlled.y+input.y/mag*10,speed(ctx.players.get(controlled.id)!,ctx),dt);
  if(input.pass){const next=s.defenders.filter(a=>a.id!==controlled.id).sort((a,b)=>distance(a,s.ball)-distance(b,s.ball))[0];s.controlledId=next.id;s.notice='Defender switched. Track the delivery.';}
  if(input.shoot!==undefined&&controlled.cooldown===0){controlled.cooldown=.4;const p=ctx.players.get(controlled.id)!,striker=ctx.players.get(s.attackers[1].id)!;
   if(s.delivered&&distance(controlled,s.ball)<3.6&&s.ball.z<3.4){const chance=clamp(.75+(meanSkill(p,'heading','jumping','strength')-meanSkill(striker,'heading','jumping'))*.006+trait(p,'aerial-defender')*.04,.35,.96);if(roll(s)<chance){endAttack(s,'blocked');s.notice=`${p.name} clears the corner`;return s;}}else s.notice='Move closer to the delivery, then tap Clear.';
  }
  if(!s.delivered&&s.elapsed>1.6){s.aimY=roll(s)<.5?-1:1;cornerDelivery(s,false);}
 }else if(owner){
  s.controlledId=owner.id;if(Math.abs(input.y)>.12)s.aimY=clamp(input.y,-1,1);
  if(!s.delivered){if(input.pass||input.shoot!==undefined)cornerDelivery(s,input.shoot!==undefined);}
  else {const mag=Math.max(1,Math.hypot(input.x,input.y));move(owner,owner.x+input.x/mag*10,owner.y+input.y/mag*10,speed(ctx.players.get(owner.id)!,ctx),dt);s.ball.x=owner.x+.6;s.ball.y=owner.y;s.ball.z=Math.max(.1,s.ball.z-dt*5);
   if(input.shoot!==undefined)shoot(s,owner,ctx.players.get(owner.id)!,input.shoot,ctx);else if(input.pass)cornerDelivery(s,true);
  }
 }else if(input.shoot!==undefined&&s.ball.flight?.kind==='cross')s.queuedShot=input.shoot;
 for(const d of s.defenders)if(!s.defending||d.id!==s.controlledId){const receiver=s.attackers.find(a=>a.id===s.ball.flight?.targetId)??owner??s.attackers[1];move(d,receiver.x+.8,receiver.y+(d===s.defenders[0]?-2:2),2.2,dt);}
 move(s.keeper,58.1,clamp(20+(s.ball.y-20)*.16,17,23),3,dt);
 const flight=s.ball.flight;
 if(flight){flight.elapsed+=dt;const t=clamp(flight.elapsed/flight.duration,0,1);s.ball.x=mixCorner(flight.startX,flight.endX,t);s.ball.y=mixCorner(flight.startY,flight.endY,t);s.ball.z=flight.kind==='cross'?Math.sin(t*Math.PI)*2.2+t*1.65:flight.kind==='shot'?(flight.startZ??0)*(1-t)+(flight.endZ??0)*t+Math.sin(t*Math.PI)*.7:Math.sin(t*Math.PI)*.2;
  if(flight.kind!=='shot'&&t>.45&&s.ball.z<.8&&s.defenders.some(d=>(!s.defending||d.id!==s.controlledId)&&distance(d,s.ball)<.65)){endAttack(s,'intercepted');return s;}
  if(t>=1){if(flight.kind==='shot'){finish(s,flight.result!);return s;}const target=s.attackers.find(a=>a.id===flight.targetId)!;target.x=flight.endX;target.y=flight.endY;target.cooldown=.4;s.passes++;s.lastPass={from:flight.fromId,to:target.id,at:s.elapsed};s.ball={x:target.x+.6,y:target.y,z:flight.kind==='cross'?1.65:.1,ownerId:target.id};if(!s.defending)s.controlledId=target.id;s.notice=s.defending?'Close the receiver. Clear the danger!':'Delivery met. Shoot before the defence recovers.';if(!s.defending&&s.queuedShot!==undefined){shoot(s,target,ctx.players.get(target.id)!,s.queuedShot,ctx);s.queuedShot=undefined;}}
 }else if(owner&&s.delivered&&s.defending&&owner.cooldown===0)shoot(s,owner,ctx.players.get(owner.id)!,.65,ctx);
 if(s.elapsed>=s.limit&&!s.ball.flight)endAttack(s);
 return s;
}
const mixCorner=(a:number,b:number,t:number)=>a+(b-a)*t;
export function snapshotHighlight(c:Career,s:HighlightState):Career {
 if(!c.pending||activeDecision(c)?.id!==s.momentId)return c;
 return {...c,pending:{...c.pending,paused:true,highlight:s}};
}
export function completeHighlight(c:Career,s:HighlightState):Career {
 const m=activeDecision(c),f=managedFixture(c);
 if(!c.pending||!m||!f||m.id!==s.momentId||!playableMoment(c,m)||s.phase!=='finished'||!s.result)throw Error('Finish the current attacking highlight first.');
 const result=s.result,shot=['goal','saved','wide'].includes(result.outcome);
 const event:MatchEvent|undefined=shot?{id:m.eventId,momentId:m.id,minute:m.minute,clubId:m.clubId,playerId:result.shooterId,creatorId:result.assistId,assistId:result.outcome==='goal'?result.assistId:undefined,type:result.outcome==='goal'?'goal':'shot',onTarget:result.onTarget,chanceType:m.kind==='one-on-one'?'one-on-one':m.kind==='corner'?'aerial':'close',xG:result.xG}:undefined;
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
 const s=c.pending?.highlight;if(!s)return true;const m=activeDecision(c);if(!m||m.id!==s.momentId||!playableMoment(c,m)||s.version!==1||!['ready','playing','finished'].includes(s.phase)||![14,18].includes(s.limit)||(s.kind!==highlightKind(m)&&!(s.kind==='counter'&&m.kind==='big-chance'))||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>s.limit+2||!Number.isInteger(s.rng)||s.rng<0||s.rng>4294967295)return false;
 const f=managedFixture(c)!,own=fixtureLineup(f,m.clubId,m.minute-1),other=fixtureLineup(f,m.clubId===f.homeId?f.awayId:f.homeId,m.minute-1),actors=[...s.attackers,...s.defenders,s.keeper];
 if(s.kind==='corner'&&(typeof s.defending!=='boolean'||s.defending!==(m.clubId!==c.clubId)||typeof s.delivered!=='boolean'))return false;
 if(s.queuedShot!==undefined&&(!Number.isFinite(s.queuedShot)||s.queuedShot<.15||s.queuedShot>1))return false;
 const expected=[m.actorId,...new Set([m.receiverId,m.supportId,m.alternateId].filter(id=>id!==m.actorId))].slice(0,3);
 if(s.attackers.length!==3||s.defenders.length!==(s.kind==='corner'?3:2)||new Set(actors.map(a=>a.id)).size!==(s.kind==='corner'?7:6)||s.attackers.some((a,i)=>a.id!==expected[i]||!own.slice(1).includes(a.id))||s.defenders.some(a=>!other.slice(1).includes(a.id))||s.keeper.id!==m.keeperId||!(s.defending?s.defenders:s.attackers).some(a=>a.id===s.controlledId)||actors.some(a=>![a.x,a.y,a.cooldown].every(Number.isFinite)||a.x<0||a.x>61||a.y<0||a.y>40||a.cooldown<0||a.vx!==undefined&&!Number.isFinite(a.vx)||a.vy!==undefined&&!Number.isFinite(a.vy)))return false;
 if(![s.ball.x,s.ball.y,s.ball.z,s.aimY].every(Number.isFinite)||s.ball.x<0||s.ball.x>62||s.ball.y<0||s.ball.y>40||s.ball.z<0||s.ball.z>4||Math.abs(s.aimY)>1||!Number.isInteger(s.passes)||!Number.isInteger(s.attempted)||s.passes<0||s.passes>s.attempted||s.attempted>60||s.ball.ownerId&&!s.attackers.some(a=>a.id===s.ball.ownerId))return false;
 if(s.result&&!validHighlightResult(s.result,s.attackers.map(a=>a.id)))return false;if((s.phase==='finished')!==!!s.result)return false;
 const flight=s.ball.flight;if(flight&&([flight.startZ,flight.endZ,flight.loft].some(z=>z!==undefined&&(!Number.isFinite(z)||z<0||z>3.5))))return false;if(flight&&(!['pass','shot','cross'].includes(flight.kind)||!s.attackers.some(a=>a.id===flight.fromId)||s.ball.ownerId!==undefined||![flight.startX,flight.startY,flight.endX,flight.endY,flight.elapsed,flight.duration].every(Number.isFinite)||flight.startX<0||flight.startX>62||flight.endX<0||flight.endX>62||flight.startY<0||flight.startY>40||flight.endY<0||flight.endY>40||flight.duration<=0||flight.duration>2.5||flight.elapsed<0||flight.elapsed>flight.duration+.06||flight.kind==='shot'&&(!flight.result||!validHighlightResult(flight.result,s.attackers.map(a=>a.id)))||['pass','cross'].includes(flight.kind)&&!s.attackers.some(a=>a.id===flight.targetId)))return false;
 if(!Array.isArray(s.links)||s.links.length>6||s.links.some(l=>!s.attackers.some(a=>a.id===l.a)||!s.attackers.some(a=>a.id===l.b)||l.a===l.b||!Number.isInteger(l.passes)||l.passes<0||l.passes>14||!Number.isFinite(l.last)))return false;
 if(s.lastPass&&(!s.attackers.some(a=>a.id===s.lastPass!.from)||!s.attackers.some(a=>a.id===s.lastPass!.to)||s.lastPass.from===s.lastPass.to||!Number.isFinite(s.lastPass.at)||s.lastPass.at<0||s.lastPass.at>s.elapsed))return false;
 if(s.phase==='ready'&&(s.elapsed!==0||s.ball.ownerId!==m.actorId||flight)||s.phase==='playing'&&!s.ball.ownerId&&!flight||s.phase==='finished'&&(flight||s.ball.ownerId))return false;
 return true;
}
export function validHighlightResult(r:HighlightResult,ids:string[]){return !!r&&['goal','saved','wide','blocked','intercepted'].includes(r.outcome)&&ids.includes(r.shooterId)&&(!r.assistId||ids.includes(r.assistId)&&r.assistId!==r.shooterId)&&Number.isFinite(r.xG)&&r.xG>=0&&r.xG<=1&&typeof r.onTarget==='boolean'&&r.onTarget===['goal','saved'].includes(r.outcome);}
