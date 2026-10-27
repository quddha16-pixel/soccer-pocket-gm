import type { Fixture } from '../models';
import { coordinates } from './management';
const mix=(a:number,b:number,t:number)=>a+(b-a)*Math.max(0,Math.min(1,t));
export function animationFrame(f:Fixture,clock:number){
 const report=f.report,home=report?.homeLineup??report?.performances.filter(p=>p.clubId===f.homeId).map(p=>p.playerId)??[],away=report?.awayLineup??report?.performances.filter(p=>p.clubId===f.awayId).map(p=>p.playerId)??[];
 const upcoming=report?.events.find(e=>e.minute>=clock&&e.minute-clock<=3),last=report?.events.filter(e=>e.minute<=clock).at(-1),event=upcoming??last;
 const phase=event?Math.max(0,Math.min(1,(clock-event.minute+3)/3)):0,attacking=event?.clubId??f.homeId,direction=attacking===f.homeId?-1:1;
 const points=[...home.map((id,i)=>({id,clubId:f.homeId,x:coordinates[report?.homeFormation??'4-3-3'][i]?.[0]??50,y:coordinates[report?.homeFormation??'4-3-3'][i]?.[1]??50})),...away.map((id,i)=>({id,clubId:f.awayId,x:100-(coordinates[report?.awayFormation??'4-3-3'][i]?.[0]??50),y:100-(coordinates[report?.awayFormation??'4-3-3'][i]?.[1]??50)}))];
 const actor=points.find(p=>p.id===event?.playerId),creator=points.find(p=>p.id===event?.creatorId)??points.find(p=>p.clubId===attacking&&p.id!==actor?.id&&p.id!==(attacking===f.homeId?home[0]:away[0]));
 const origin=actor?{x:Math.max(20,Math.min(80,actor.x)),y:attacking===f.homeId?34:66}:{x:50,y:50};
 const receiver={x:mix(origin.x,50,.4),y:mix(origin.y,attacking===f.homeId?20:80,Math.min(1,phase/.7))};
 let ball={x:50,y:50};if(actor){if(phase<.28)ball={x:mix(creator?.x??50,origin.x,phase/.28),y:mix(creator?.y??50,origin.y,phase/.28)};else if(phase<.7)ball=receiver;else ball={x:mix(receiver.x,event?.onTarget?50:78,(phase-.7)/.3),y:mix(receiver.y,attacking===f.homeId?(event?.type==='goal'?-1:7):(event?.type==='goal'?101:93),(phase-.7)/.3)};}
 const players=points.map((p,i)=>{
 const keeper=p.id===home[0]||p.id===away[0];if(keeper)return {...p,x:50,y:p.clubId===f.homeId?91:9,number:i%11+1};
 if(p.id===actor?.id)return {...p,...receiver,number:i%11+1};
 const own=p.clubId===attacking;
 return {...p,x:Math.max(5,Math.min(95,own?p.x+Math.sin((clock+i)*.4)*2:mix(p.x,ball.x,.12))),y:Math.max(8,Math.min(92,own?p.y+direction*phase*8:mix(p.y,ball.y,.12))),number:i%11+1};
 });
 const prior=report?.events.filter(e=>event&&e.minute<event.minute).at(-1);
 const counter=prior&&event&&prior.clubId!==event.clubId;
 const label=!event?'Building possession':phase<.28?(counter?'Turnover / counterattack':'Passing sequence / through ball'):phase<.7?'Dribble and defensive pressure':clock<event.minute?'Shot in progress':event.type==='goal'?'Goal':event.onTarget?'Goalkeeper save':'Shot wide';
 return {players,ball,event,label};
}
