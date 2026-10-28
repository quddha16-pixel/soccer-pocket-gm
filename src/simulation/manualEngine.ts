import type { Career, Fixture, KeyMoment, Player } from '../models';
import type { FieldPoint, ManualActor, ManualInput, ManualState } from './manualModels';
import { coordinates, lineupFit, slots } from './management';
import { activeLineup } from './substitutionRules';
import { meanSkill, skill, trait } from './playerSkills';
import { identity, hash } from './identity';
import { coachedPattern } from './managerStyles';
import { pairKey } from './chemistry';

export const field={width:68,height:105,goalLeft:28,goalRight:40};
export const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const distance=(a:FieldPoint,b:FieldPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x:number,y:number)=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:{x:0,y:0};};
export const manualMinute=(s:ManualState)=>Math.min(90,Math.floor(s.elapsed/s.duration*90+1e-7));
export const attackDirection=(s:ManualState,clubId:string)=>(clubId===s.userClubId?-1:1)*(s.half===1?1:-1);
const goalY=(s:ManualState,clubId:string)=>attackDirection(s,clubId)<0?0:105;
function roll(s:ManualState){let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/4294967296;}
function count(s:ManualState,id:string){return s.stats[id]??(s.stats[id]={attempted:0,completed:0,interceptions:0,tackles:0,distance:0});}
export function manualContext(c:Career){
 const players=new Map(c.players.map(p=>[p.id,p]));
 return {players,pattern:new Map([c.clubId,...(c.pending?.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))?[c.pending.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!.homeId,c.pending.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!.awayId]:[])].map(id=>[id,coachedPattern(c,id)])),pairs:c.world.chemistry.pairs};
}
export type ManualContext=ReturnType<typeof manualContext>;
function anchor(s:ManualState,a:ManualActor,c:Career):FieldPoint {const formation=a.clubId===c.clubId?c.formation:'4-3-3',[x,y]=coordinates[formation][a.slot];return attackDirection(s,a.clubId)<0?{x:x*.68,y:y*1.05}:{x:68-x*.68,y:105-y*1.05};}
function actor(s:ManualState,id?:string){return s.actors.find(a=>a.id===id);}
const player=(ctx:ManualContext,a:ManualActor)=>ctx.players.get(a.id)!;
function fit(a:ManualActor,c:Career,ctx:ManualContext){return lineupFit(player(ctx,a),a.clubId===c.clubId?c.formation:'4-3-3',a.slot);}
export function manualMovement(p:Player,energy:number,carrying=false){return (3.6+meanSkill(p,'sprintSpeed','acceleration')*.042)*(carrying?.84+skill(p,'dribbling')*.0018+trait(p,'technical-dribbler')*.018+trait(p,'flair-player')*.008:1)*(.72+.28*energy/100);}
function nearest(s:ManualState,point:FieldPoint,clubId:string,exclude?:string){return s.actors.filter(a=>a.clubId===clubId&&a.slot!==0&&a.id!==exclude).sort((a,b)=>distance(a,point)-distance(b,point))[0];}
function kickoff(s:ManualState,c:Career,clubId:string,text:string){
 for(const a of s.actors){Object.assign(a,anchor(s,a,c),{vx:0,vy:0});a.y=attackDirection(s,a.clubId)<0?53+a.y*.46:52-(105-a.y)*.46;}
 const taker=s.actors.filter(a=>a.clubId===clubId&&a.slot!==0).sort((a,b)=>b.slot-a.slot)[1];
 taker.x=34;taker.y=52.5;const other=nearest(s,{x:34,y:52.5},clubId,taker.id);if(other){other.x=38;other.y=52.5;}
 s.ball={x:34,y:52.5,z:0,vz:0,vx:0,vy:0,ownerId:taker.id,lastClubId:clubId,lastPlayerId:taker.id};s.restart=1;s.lastPass=undefined;s.notice=text;if(clubId===s.userClubId)s.controlledId=taker.id;
}
export function createManualState(c:Career,f:Fixture,duration:180|240|360=240):ManualState {
 const actors=[f.homeId,f.awayId].flatMap(clubId=>{const start=(clubId===f.homeId?f.report!.homeLineup:f.report!.awayLineup)!;return start.map((id,slot)=>({id,clubId,slot,x:0,y:0,vx:0,vy:0,energy:c.players.find(p=>p.id===id)!.fitness,cooldown:0}));});
 const s:ManualState={version:1,fixtureId:f.id,userClubId:c.clubId,elapsed:0,duration,half:1,phase:'playing',rng:(f.report!.simulationSeed??hash(f.id))||1,sequence:0,actors,ball:{x:34,y:52.5,vx:0,vy:0,z:0,vz:0,lastClubId:f.homeId,lastPlayerId:actors[0].id},controlledId:c.lineup[6],aim:{x:0,y:-1},events:[],moments:[],stats:{},combinations:[],appliedSubs:[],homePossession:0,awayPossession:0,restart:1,notice:'Kickoff · move, pass and shoot.'};
 kickoff(s,c,f.homeId,'Kickoff · full player control');return s;
}
function copy(s:ManualState):ManualState{return {...s,actors:s.actors.map(a=>({...a})),ball:{...s.ball,flight:s.ball.flight?{...s.ball.flight}:undefined},events:s.events.map(e=>({...e})),moments:[...s.moments],stats:Object.fromEntries(Object.entries(s.stats).map(([id,n])=>[id,{...n}])),combinations:s.combinations.map(p=>({...p})),appliedSubs:[...s.appliedSubs],aim:{...s.aim},lastPass:s.lastPass?{...s.lastPass}:undefined};}
function segmentDistance(p:FieldPoint,a:FieldPoint,b:FieldPoint){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
function eventMinute(s:ManualState){return Math.max(1,Math.min(90,manualMinute(s)+1));}
function recover(s:ManualState,a:ManualActor){
 const flight=s.ball.flight,old=s.ball.lastPlayerId;
 if(flight?.kind==='pass'){
  if(flight.clubId===a.clubId&&a.id!==flight.actorId){
   if(flight.offside&&a.id===flight.targetId){restart(s,a.clubId===s.userClubId?s.actors.find(p=>p.clubId!==a.clubId)!.clubId:s.userClubId,{x:a.x,y:a.y},'Offside · free kick');return;}
   count(s,flight.actorId).completed++;const sender=actor(s,flight.actorId);s.lastPass=sender?{from:flight.actorId,to:a.id,at:s.elapsed}:undefined;
   const progress=sender?(a.y-sender.y)*attackDirection(s,a.clubId):0;
   if(a.clubId===s.userClubId&&progress>=2){const key=pairKey(flight.actorId,a.id);let link=s.combinations.find(p=>pairKey(p.a,p.b)===key);if(!link){link={a:flight.actorId,b:a.id,passes:0,last:-10};s.combinations.push(link);}if(s.elapsed-link.last>=3&&link.passes<14){link.passes++;link.last=s.elapsed;s.notice='Good combination · partnership growing';}}
  }else if(flight.clubId!==a.clubId){count(s,a.id).interceptions++;s.lastPass=undefined;s.notice='Pass intercepted';}
 }
 if(flight?.kind==='shot'&&a.clubId!==flight.clubId){const e=s.events.find(e=>e.id===flight.eventId);if(e&&a.slot!==0)e.onTarget=false;if(a.slot===0)s.notice=e?.onTarget?'Saved!':'Keeper collects';else {count(s,a.id).interceptions++;s.notice='Shot blocked';}s.lastPass=undefined;}
 if(!flight&&old!==a.id&&s.ball.lastClubId!==a.clubId)s.lastPass=undefined;
 if(flight?.loft&&s.ball.z>.8)s.aerial={playerId:a.id,until:s.elapsed+1};
 s.ball={x:a.x,y:a.y,z:0,vz:0,vx:0,vy:0,ownerId:a.id,lastClubId:a.clubId,lastPlayerId:a.id};a.cooldown=Math.max(a.cooldown,.25);if(a.clubId===s.userClubId)s.controlledId=a.id;
}
function restart(s:ManualState,clubId:string,point:FieldPoint,text:string){const a=nearest(s,point,clubId)!;a.x=clamp(point.x,1,67);a.y=clamp(point.y,2,103);s.ball={x:a.x,y:a.y,z:0,vz:0,vx:0,vy:0,ownerId:a.id,lastClubId:clubId,lastPlayerId:a.id};s.restart=.7;s.notice=text;s.lastPass=undefined;if(clubId===s.userClubId)s.controlledId=a.id;}
function passBall(s:ManualState,a:ManualActor,c:Career,ctx:ManualContext,aim:FieldPoint,loft=false){
 const p=player(ctx,a),dir=unit(aim.x,aim.y),candidates=s.actors.filter(b=>b.clubId===a.clubId&&b.id!==a.id),forward=attackDirection(s,a.clubId),hasAim=Math.hypot(aim.x,aim.y)>.2;
 const target=candidates.map(b=>{const d=distance(a,b),v=unit(b.x-a.x,b.y-a.y),dot=hasAim?v.x*dir.x+v.y*dir.y:(b.y-a.y)*forward/Math.max(1,d);return {b,score:dot*20-d*.14-(b.slot===0?8:0)+(b.y-a.y)*forward*.08};}).sort((a,b)=>b.score-a.score)[0]?.b;if(!target)return;
 const cross=Math.abs(a.x-34)>22&&Math.abs(a.y-goalY(s,a.clubId))<30;
 const d=distance(a,target),passing=cross?meanSkill(p,'crossing','longPassing','vision'):a.slot===0?meanSkill(p,'kicking','distribution'):d>25?meanSkill(p,'longPassing','vision'):meanSkill(p,'shortPassing','vision'),pair=(ctx.pairs[pairKey(a.id,target.id)]??0)+(s.combinations.find(l=>pairKey(l.a,l.b)===pairKey(a.id,target.id))?.passes??0)*.15;
 const pressure=s.actors.some(b=>b.clubId!==a.clubId&&distance(a,b)<4)?1:0,accuracy=passing*fit(a,c,ctx)+Math.min(6,pair*.25)+trait(p,'playmaker')*2+trait(p,'through-ball-specialist')*2+(d>25?trait(p,'long-pass-specialist')*3:trait(p,'press-resistant-distributor')*pressure*3);
 const extra=cross?trait(p,'precision-crosser')*3:0,error=(roll(s)-.5)*Math.max(.005,(105-accuracy-extra)/330+pressure*.04),base=Math.atan2(target.y+target.vy*.3-a.y,target.x+target.vx*.3-a.x)+error,speed=18+passing*.09+trait(p,'long-distribution')*1.5;
 const other=s.actors.filter(b=>b.clubId!==a.clubId).map(b=>b.y*forward).sort((a,b)=>b-a),offside=target.y*forward>52.5*forward&&target.y*forward>a.y*forward&&target.y*forward>(other[1]??Infinity);
 count(s,a.id).attempted++;s.ball={x:a.x,y:a.y,z:.15,vz:loft?5.5+(cross?1:0):0,vx:Math.cos(base)*speed,vy:Math.sin(base)*speed,flight:{kind:'pass',actorId:a.id,clubId:a.clubId,targetId:target.id,age:0,loft,offside},lastClubId:a.clubId,lastPlayerId:a.id};a.cooldown=.45;s.notice=loft?'Lofted pass':'Pass';
}
function shootBall(s:ManualState,a:ManualActor,c:Career,ctx:ManualContext,power:number,aimX:number){
 const p=player(ctx,a),aerial=s.aerial?.playerId===a.id&&s.aerial.until>s.elapsed,goal=goalY(s,a.clubId),d=Math.abs(a.y-goal),pressure=s.actors.filter(b=>b.clubId!==a.clubId&&b.slot!==0&&distance(a,b)<5).length,ability=(aerial?meanSkill(p,'heading','jumping','composure'):d>25?meanSkill(p,'longShots','shotPower','composure'):meanSkill(p,'finishing','composure','positioning'))*fit(a,c,ctx),special=trait(p,aerial?'aerial-threat':d>25?'long-range-specialist':'clinical-finisher')+trait(p,'poacher')*.5;
 const error=(roll(s)-.5)*Math.max(.4,(110-ability-special*3)*.08+pressure*.5+Math.max(0,d-22)*.05+(power>.85?.5:0)),target=34+clamp(aimX,-1,1)*5.5+error,dir=unit(target-a.x,goal-a.y),speed=19+skill(p,'shotPower')*.11+clamp(power,0,1)*8+trait(p,'power-shooter');
 const assist=s.lastPass?.to===a.id&&s.elapsed-s.lastPass.at<8?s.lastPass.from:undefined,eventId=`manual-${s.fixtureId}-${++s.sequence}`;
 s.events.push({id:eventId,minute:eventMinute(s),type:'shot',clubId:a.clubId,playerId:a.id,creatorId:assist,onTarget:target>=field.goalLeft&&target<=field.goalRight,chanceType:aerial?'aerial':d>25?'distance':d<15?'one-on-one':'close',xG:clamp(.08+(ability-70)*.004+(25-d)*.009-pressure*.025,.01,.8)});
 s.ball={x:a.x,y:a.y,z:.2,vz:power>.85?1.2:0,vx:dir.x*speed,vy:dir.y*speed,flight:{kind:'shot',actorId:a.id,clubId:a.clubId,creatorId:assist,eventId,age:0,loft:false},lastClubId:a.clubId,lastPlayerId:a.id};a.cooldown=.65;s.notice='Shot!';
}
function tackle(s:ManualState,a:ManualActor,c:Career,ctx:ManualContext,automatic=false){
 const owner=actor(s,s.ball.ownerId);if(!owner||owner.clubId===a.clubId||a.cooldown>0||distance(a,owner)>2.8)return;
 const p=player(ctx,a),o=player(ctx,owner),attack=meanSkill(p,'standingTackle','slidingTackle','aggression','strength')*fit(a,c,ctx)+trait(p,'ball-winner')*3+trait(p,'strong-tackler')*3,shield=meanSkill(o,'dribbling','balance','strength','composure')*fit(owner,c,ctx)+trait(o,'technical-dribbler')*3+trait(o,'press-resistant-distributor')*3;
 a.cooldown=automatic?1.05:.8;
 if(roll(s)<clamp(.49+(attack-shield)/150,.12,.83)){count(s,a.id).tackles++;recover(s,a);s.notice='Tackle won';}
 else if(roll(s)<(automatic?.025:.09)){const penalty=Math.abs(owner.y-goalY(s,owner.clubId))<16&&Math.abs(owner.x-34)<17;setPiece(s,owner.clubId,owner,penalty?'penalty':'free-kick',c,ctx);}
}
function setPiece(s:ManualState,clubId:string,taker:ManualActor,kind:'penalty'|'free-kick',c:Career,ctx:ManualContext){
 restart(s,clubId,kind==='penalty'?{x:34,y:goalY(s,clubId)+ (attackDirection(s,clubId)<0?12:-12)}:taker,kind==='penalty'?'Penalty awarded':'Free kick awarded');
 if(clubId!==s.userClubId)return;
 const team=s.actors.filter(a=>a.clubId===clubId&&a.slot!==0),best=[...team].sort((a,b)=>meanSkill(player(ctx,b),'finishing','composure','longShots')-meanSkill(player(ctx,a),'finishing','composure','longShots'))[0],keeper=s.actors.find(a=>a.clubId!==clubId&&a.slot===0)!;
 const ids=team.filter(a=>a.id!==best.id);const m:KeyMoment={id:`manual-set-${++s.sequence}`,eventId:`manual-set-shot-${s.sequence}`,minute:eventMinute(s),clubId,kind,actorId:best.id,receiverId:ids[0].id,alternateId:ids[1].id,supportId:ids[2].id,keeperId:keeper.id,baseXg:kind==='penalty'?.75:.08,keeperApproach:'set',pressure:'space',autoChoice:kind==='penalty'?1:0,outcome:'wide'};s.setPiece={kind,moment:m};
}
function syncSubs(s:ManualState,c:Career,f:Fixture){
 if(s.ball.flight?.kind==='shot')return;
 for(const sub of f.report!.substitutions??[])if(sub.minute<=manualMinute(s)&&!s.appliedSubs.includes(sub.onId)){
  const i=s.actors.findIndex(a=>a.id===sub.offId);if(i<0)continue;const old=s.actors[i],p=c.players.find(p=>p.id===sub.onId)!;s.actors[i]={...old,id:p.id,energy:p.fitness,cooldown:.3};s.appliedSubs.push(p.id);if(s.lastPass&&(s.lastPass.from===old.id||s.lastPass.to===old.id))s.lastPass=undefined;if(s.controlledId===old.id)s.controlledId=p.id;if(s.ball.ownerId===old.id){s.ball.ownerId=p.id;s.ball.lastPlayerId=p.id;}s.notice=`Substitution · ${p.name}`;
 }
}
export function stepManual(previous:ManualState,c:Career,input:ManualInput,dt=1/30,ctx=manualContext(c)):ManualState {
 if(previous.phase!=='playing'||previous.setPiece||dt<=0)return previous;
 const s=copy(previous),f=c.pending!.fixtures.find(f=>f.id===s.fixtureId)!;dt=clamp(dt,0,.05);
 s.elapsed=Math.min(s.duration,s.elapsed+dt);
 if(s.half===1&&s.elapsed>=s.duration/2){if(s.ball.flight?.kind==='shot'){const e=s.events.find(e=>e.id===s.ball.flight?.eventId);if(e)e.onTarget=false;}s.ball.flight=undefined;s.ball.vx=0;s.ball.vy=0;s.elapsed=s.duration/2;s.phase='halftime';s.notice='Half time · rest, review and make changes';return s;}
 if(s.elapsed>=s.duration){if(s.ball.flight?.kind==='shot'){const e=s.events.find(e=>e.id===s.ball.flight?.eventId);if(e)e.onTarget=false;}s.ball.flight=undefined;syncSubs(s,c,f);s.elapsed=s.duration;s.phase='fulltime';s.notice='Full time';return s;}
 syncSubs(s,c,f);
 let controlled=actor(s,s.controlledId)!;const owner=actor(s,s.ball.ownerId),otherId=s.actors.find(a=>a.clubId!==s.userClubId)!.clubId;
 if(input.selectId&&s.actors.some(a=>a.id===input.selectId&&a.clubId===s.userClubId))s.controlledId=input.selectId;
 if(input.switchPlayer){const next=nearest(s,s.ball,s.userClubId,s.controlledId);if(next)s.controlledId=next.id;}
 controlled=actor(s,s.controlledId)!;
 if(Math.hypot(input.x,input.y)>.15)s.aim={x:clamp(input.x,-1,1),y:clamp(input.y,-1,1)};
 const unitInput=unit(input.x,input.y),magnitude=Math.min(1,Math.hypot(input.x,input.y));
 if(s.restart>0){s.restart=Math.max(0,s.restart-dt);return s;}
 if(owner){if(owner.clubId===f.homeId)s.homePossession+=dt;else s.awayPossession+=dt;}
 const chasing=new Map([s.userClubId,otherId].map(id=>[id,s.actors.filter(a=>a.clubId===id&&a.slot!==0).sort((a,b)=>distance(a,s.ball)-distance(b,s.ball)).slice(0,2).map(a=>a.id)]));
 for(const a of s.actors){
  const p=player(ctx,a),ownBall=owner?.clubId===a.clubId,dir=attackDirection(s,a.clubId),home=anchor(s,a,c),pattern=ctx.pattern.get(a.clubId)!;a.cooldown=Math.max(0,a.cooldown-dt);
  let target:FieldPoint=home,manual=a.id===controlled.id,desired={x:0,y:0};
  if(manual)desired={x:unitInput.x*magnitude,y:unitInput.y*magnitude};
  else if(a.slot===0&&owner?.id===a.id){target=home;if(a.cooldown===0)passBall(s,a,c,ctx,{x:0,y:dir},true);}
  else if(a.slot===0){
   const ownGoal=dir<0?101:4,flight=s.ball.flight,anticipating=flight?.kind==='shot'&&flight.clubId!==a.clubId&&flight.age>.15+(100-skill(p,'reflexes'))*.004;
   let tx=clamp(34+(s.ball.x-34)*.38,29,39);if(anticipating&&Math.abs(s.ball.vy)>.1)tx=clamp(s.ball.x+s.ball.vx*(ownGoal-s.ball.y)/s.ball.vy,27,41);
   tx+=Math.sin(hash(a.id))*(100-skill(p,'gkPositioning'))/60;
   target={x:tx,y:ownGoal+(trait(p,'sweeper-keeper')&&Math.abs(s.ball.y-ownGoal)<23?(dir<0?-3:3):0)};
  }else if(owner?.id===a.id){
   const block=s.actors.filter(b=>b.clubId!==a.clubId&&b.slot!==0&&distance(a,b)<5).sort((a,b)=>distance(a,s.ball)-distance(b,s.ball))[0];
   target={x:clamp(34+(a.x-34)*.55+(block?(a.x<block.x?-6:6):0),5,63),y:goalY(s,a.clubId)};
   if(a.cooldown===0){const d=Math.abs(a.y-goalY(s,a.clubId));if(d<24&&(d<14||roll(s)<dt*.8))shootBall(s,a,c,ctx,.6,(roll(s)-.5)*1.6);else if((block&&roll(s)<dt*1.8)||roll(s)<dt*.18)passBall(s,a,c,ctx,{x:0,y:dir},false);}
  }else if(!ownBall&&chasing.get(a.clubId)!.includes(a.id)){target={x:s.ball.x+(owner?.vx??0)*skill(p,'marking')/180,y:s.ball.y+(owner?.vy??0)*skill(p,'marking')/180};}
  else {
   const offensive=ownBall?(a.clubId===c.clubId&&c.tactic==='defensive'?2:7)+(trait(p,'intelligent-runner')+trait(p,'poacher'))*1.5:0;
   target={x:clamp(home.x+(s.ball.x-34)*.3,3,65),y:clamp(home.y+(s.ball.y-52.5)*.24+dir*(offensive+pattern.creation*.15),5,100)};
   if(ownBall&&a.slot>=8&&s.ball.y*dir>52.5*dir)target.y=clamp(s.ball.y+dir*(8+trait(p,'intelligent-runner')*2),6,99);
  }
  if(!manual){const d=distance(a,target),toward=unit(target.x-a.x,target.y-a.y);desired={x:toward.x*Math.min(1,d/2),y:toward.y*Math.min(1,d/2)};}
  const max=manualMovement(p,a.energy,owner?.id===a.id)*(a.slot===0?.75:1)*(1+pattern.carrying*.002+trait(p,'recovery-defender')*.012+trait(p,'explosive-winger')*.015),accel=(3+meanSkill(p,'acceleration','agility')*.07)*dt;
  a.vx+=clamp(desired.x*max-a.vx,-accel,accel);a.vy+=clamp(desired.y*max-a.vy,-accel,accel);a.x=clamp(a.x+a.vx*dt,.8,67.2);a.y=clamp(a.y+a.vy*dt,1,104);
  const moved=Math.hypot(a.vx,a.vy)*dt;count(s,a.id).distance+=moved;a.energy=Math.max(35,a.energy-dt*(.025+Math.hypot(a.vx,a.vy)*.014)*(1.25-skill(p,'stamina')/220));
  if(!manual&&owner?.clubId!==a.clubId)tackle(s,a,c,ctx,true);if(s.setPiece||s.restart>0)break;
 }
 if(s.setPiece||s.restart>0)return s;
 const currentOwner=actor(s,s.ball.ownerId);
 if(currentOwner){s.ball.x=currentOwner.x;s.ball.y=currentOwner.y;if(currentOwner.id===s.controlledId){if(input.shoot!==undefined&&currentOwner.cooldown===0)shootBall(s,currentOwner,c,ctx,input.shoot,s.aim.x);else if(input.pass&&currentOwner.cooldown===0)passBall(s,currentOwner,c,ctx,s.aim,!!input.loft);}else if(input.tackle||input.shoot!==undefined)tackle(s,controlled,c,ctx);}
 else if(input.tackle||input.shoot!==undefined)tackle(s,controlled,c,ctx);
 if(!s.ball.ownerId){
  const b=s.ball,old={x:b.x,y:b.y};if(b.flight)b.flight.age+=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z=Math.max(0,b.z+b.vz*dt);b.vz=b.z>0?b.vz-9.81*dt:0;
  if(!b.flight||b.flight.kind==='pass'){b.vx*=Math.exp(-.23*dt);b.vy*=Math.exp(-.23*dt);}
  for(const a of s.actors){
   const p=player(ctx,a),flight=b.flight;if(flight?.actorId===a.id&&flight.age<.4)continue;
   const enemy=flight&&flight.clubId!==a.clubId,radius=a.slot===0?.65+meanSkill(p,'reflexes','diving','oneOnOne')*.007+trait(p,'reflex-specialist')*.07+trait(p,'cross-collector')*.04:flight?.kind==='shot'?.45+trait(p,'shot-blocker')*.1:.8+meanSkill(p,'ballControl','interceptions')*.005+(enemy?trait(p,'interceptor')*.1:trait(p,'press-resistant-distributor')*.06);
   const reach=a.slot===0?1.8+meanSkill(p,'jumping','handling','aerialAbility')*.006:1.2+skill(p,'jumping')*.006+trait(p,'aerial-threat')*.1+trait(p,'aerial-defender')*.1;
   if(b.z<=reach&&segmentDistance(a,old,b)<radius){if(flight?.kind==='shot'&&a.clubId===flight.clubId)continue;if(flight?.kind==='shot'&&a.slot===0&&roll(s)<clamp((100-skill(p,'handling'))/180,.025,.35)){b.ownerId=undefined;b.flight=undefined;b.lastClubId=a.clubId;b.lastPlayerId=a.id;b.x=a.x+(b.x<a.x?-1.8:1.8);b.vx=b.x<a.x?-12:12;b.vy=attackDirection(s,a.clubId)<0?7:-7;b.z=.2;b.vz=2;a.cooldown=.5;s.notice='Keeper parries the shot';s.lastPass=undefined;break;}recover(s,a);break;}
  }
  if(!s.ball.ownerId&&(b.y<0||b.y>105)){
   const flight=b.flight,scoringClub=flight?.clubId;if(flight?.kind==='shot'&&scoringClub&&b.x>=field.goalLeft&&b.x<=field.goalRight&&b.z<2.44&&(goalY(s,scoringClub)===0?b.y<0:b.y>105)){
    const e=s.events.find(e=>e.id===flight.eventId)!;e.type='goal';e.onTarget=true;e.assistId=flight.creatorId;const concede=s.actors.find(a=>a.clubId!==scoringClub)!.clubId;kickoff(s,c,concede,'GOAL! · restart from the centre');
   }else {if(flight?.kind==='shot'){const e=s.events.find(e=>e.id===flight.eventId);if(e)e.onTarget=false;}const end=b.y<0?0:105,defending=s.actors.find(a=>goalY(s,a.clubId)!==end)!.clubId;if(b.lastClubId===defending&&!flight){const attacking=s.actors.find(a=>a.clubId!==defending)!.clubId;restart(s,attacking,{x:b.x<34?1:67,y:end===0?1:104},'Corner · aim a delivery into the box');}else restart(s,defending,{x:34,y:end===0?7:98},'Goal kick');}
  }else if(!s.ball.ownerId&&(b.x<0||b.x>68)){
   const club=s.actors.find(a=>a.clubId!==b.lastClubId)!.clubId;restart(s,club,{x:b.x<0?1:67,y:clamp(b.y,5,100)},'Throw-in');
  }else if(!s.ball.ownerId&&Math.hypot(b.vx,b.vy)<1){const nearestAny=[...s.actors].sort((a,b)=>distance(a,s.ball)-distance(b,s.ball))[0];if(nearestAny&&distance(nearestAny,b)<2)recover(s,nearestAny);}
 }
 return s;
}
export function startSecondHalf(previous:ManualState,c:Career,f:Fixture){if(previous.phase!=='halftime')return previous;const s=copy(previous);s.half=2;s.phase='playing';s.setPiece=undefined;for(const a of s.actors)a.energy=Math.min(100,a.energy+8);kickoff(s,c,f.awayId,'Second half · ends changed');return s;}
export function resetManualKickoff(previous:ManualState,c:Career,clubId:string,text:string){const s=copy(previous);kickoff(s,c,clubId,text);return s;}
