import type { Fixture } from '../models';
import { fixtureLineup } from './substitutionRules';
import { coordinates } from './management';
import { hash } from './identity';
const mix=(a:number,b:number,t:number)=>a+(b-a)*Math.max(0,Math.min(1,t));
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const order=[2,6,1,8,10,7,9,5,4,3];
/** Continuous presentation of simulated possession. Recorded match events alone determine goals/statistics. */
export function animationFrame(f:Fixture,clock:number){
 const report=f.report,home=fixtureLineup(f,f.homeId,clock),away=fixtureLineup(f,f.awayId,clock),seed=report?.simulationSeed??hash(f.id),half=clock<45.5?1:-1;
 const step=Math.floor(clock/1.4),t=clock/1.4-step;
 const team=(n:number)=>hash(`${seed}:possession:${Math.floor(n/4)}`)%100<(report?.homePossession??50)?f.homeId:f.awayId;
 const slot=(n:number)=>order[((n+seed)%10+10)%10],sourceTeam=team(step-1),targetTeam=team(step),source=(sourceTeam===f.homeId?home:away)[slot(step-1)],target=(targetTeam===f.homeId?home:away)[slot(step)];
 const points=[...home.map((id,i)=>({id,clubId:f.homeId,number:i+1,keeper:i===0,x:coordinates[report?.homeFormation??'4-3-3'][i]?.[0]??50,y:coordinates[report?.homeFormation??'4-3-3'][i]?.[1]??50})),...away.map((id,i)=>({id,clubId:f.awayId,number:i+1,keeper:i===0,x:100-(coordinates[report?.awayFormation??'4-3-3'][i]?.[0]??50),y:100-(coordinates[report?.awayFormation??'4-3-3'][i]?.[1]??50)}))].map(p=>({...p,x:half===1?p.x:100-p.x,y:half===1?p.y:100-p.y}));
 if(points.length<22)return {players:points,ball:{x:50,y:50,z:0},event:undefined,label:'Waiting for kickoff',carrierId:'',pass:undefined};
 const baseSource=points.find(p=>p.id===source)??points[6],baseTarget=points.find(p=>p.id===target)??points[17],anchor={x:mix(baseSource.x,baseTarget.x,t),y:mix(baseSource.y,baseTarget.y,t)};
 const players=points.map((p,i)=>p.keeper?{...p,x:clamp(50+(anchor.x-50)*.14,41,59),y:p.y}:{...p,x:clamp(mix(p.x,anchor.x,.10)+Math.sin(clock*1.5+i*1.7)*2.2,6,94),y:clamp(mix(p.y,anchor.y,.16)+Math.cos(clock*1.3+i*.9)*2.6+Math.sin(clock*.24)*4,8,92)});
 const from=players.find(p=>p.id===source)??players[6],to=players.find(p=>p.id===target)??players[17],passT=clamp((t-.15)/.65,0,1);
 let ball={x:mix(from.x,to.x,passT),y:mix(from.y,to.y,passT),z:Math.sin(passT*Math.PI)*.8},carrierId=t<.15?from.id:to.id,label=sourceTeam!==targetTeam?'Interception · possession changes':'Pass into space',pass:{from:string;to:string;progress:number}|undefined={from:from.id,to:to.id,progress:passT};
 const event=report?.events.find(e=>clock>=e.minute-1.2&&clock<=e.minute+.42&&(clock<45.5?e.minute<=45:e.minute>=46));
 if(event){
  const actor=players.find(p=>p.id===event.playerId),creator=players.find(p=>p.id===(event.creatorId??event.assistId)),up=(event.clubId===f.homeId?half:-half)===1,phase=clamp((clock-event.minute+1.2)/1.2,0,1),goalY=up?0:100;
  if(actor){actor.x=mix(actor.x,clamp(actor.x,30,70),phase);actor.y=mix(actor.y,up?19:81,phase);carrierId=actor.id;
   if(phase<.55){const p=creator??from,k=phase/.55;ball={x:mix(p.x,actor.x,k),y:mix(p.y,actor.y,k),z:Math.sin(k*Math.PI)*.7};pass={from:p.id,to:actor.id,progress:k};label='Through ball · runner in behind';}
   else {const k=(phase-.55)/.45,arrived=clock>=event.minute,net=event.type==='goal'&&arrived;ball={x:mix(actor.x,event.onTarget?50:81,k),y:mix(actor.y,net?(up?-1:101):up?6:94,k),z:Math.sin(k*Math.PI)*1.2};pass=undefined;label=!arrived?'Shot away':net?'GOAL!':event.onTarget?'Keeper save':'Shot wide';}
  }
 }
 return {players,ball,event,label,carrierId,pass};
}
