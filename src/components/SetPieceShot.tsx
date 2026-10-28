import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AimPoint, KeyMoment, Player } from '../models';
import { pathPosition, pointDistance, shotBall, shotGeometry, shotGoal, shotPathData, shotWall } from '../simulation/shotGeometry';
import { PlayerAvatar } from './PlayerAvatar';

const bound=(n:number)=>Math.round(Math.max(0,Math.min(1,n))*10000)/10000;
export function ShotMatchup({actor,keeper}:{actor:Player;keeper:Player}){
 return <div className="shot-matchup"><div><PlayerAvatar player={actor}/><span><small>Your taker</small><strong>{actor.name}</strong></span></div><span className="shot-versus">v</span><div><PlayerAvatar player={keeper}/><span><small>Goalkeeper</small><strong>{keeper.name}</strong></span></div></div>;
}
export function ShotSurface({moment,keeper,path,onPath,progress=0,replay=false}:{moment:KeyMoment;keeper:Player;path:AimPoint[];onPath?:(path:AimPoint[])=>void;progress?:number;replay?:boolean}){
 const net=useId().replace(/:/g,''),instructions=useId(),pointer=useRef<number|null>(null),drawn=useRef<AimPoint[]>([]),startAtBall=useRef(false),keyboardAim=useRef<AimPoint>({x:.5,y:.28}),[aim,setAim]=useState<AimPoint|null>(null);
 const geometry=useMemo(()=>path.length>=2?shotGeometry({path}):undefined,[path]),stop=moment.outcome==='blocked'&&geometry?.wallAt!==undefined?geometry.wallAt:1;
 const ball=replay?pathPosition(path,Math.min(progress,stop)):shotBall;
 const end=path.at(-1)??{x:.5,y:.28},dive=Math.max(0,Math.min(1,(progress-.12)/.7));
 const keeperTarget=moment.outcome==='saved'?end:{x:end.x<.5?.65:.35,y:.35},keeperAt={x:.5+(keeperTarget.x-.5)*dive,y:.32+(keeperTarget.y-.32)*dive};
 function coordinates(e:React.PointerEvent<SVGSVGElement>){const svg=e.currentTarget,matrix=svg.getScreenCTM?.();if(matrix){const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(matrix.inverse());return {x:bound(local.x/320),y:bound(local.y/270)};}const r=svg.getBoundingClientRect();return {x:bound((e.clientX-r.left)/r.width),y:bound((e.clientY-r.top)/r.height)};}
 function append(p:AimPoint){const points=drawn.current;if(pointDistance(points.at(-1)??shotBall,p)<.006)return;const next=[...points,p];if(next.length>64)drawn.current=[next[0],...next.slice(1,-1).filter((_,i)=>i%2===0),p];else drawn.current=next;onPath?.([...drawn.current]);}
 function finish(e:React.PointerEvent<SVGSVGElement>){if(pointer.current!==e.pointerId)return;const p=coordinates(e);if(startAtBall.current)append(p);else {drawn.current=[shotBall,p];onPath?.([...drawn.current]);}pointer.current=null;if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 return <div className={`shot-surface-wrap ${replay?'is-replay':''}`}>
 <svg className="shot-surface" viewBox="0 0 320 270" role="group" aria-label={replay?'Drawn shot replay':'Shot aiming area'} aria-describedby={instructions} tabIndex={onPath?0:undefined}
 onPointerDown={onPath?e=>{if(pointer.current!==null||e.button>0)return;e.preventDefault();pointer.current=e.pointerId;const p=coordinates(e);startAtBall.current=pointDistance(p,shotBall)<.13;drawn.current=[shotBall];if(!startAtBall.current)drawn.current.push(p);onPath([...drawn.current]);e.currentTarget.setPointerCapture?.(e.pointerId);}:undefined}
 onPointerMove={onPath?e=>{if(pointer.current!==e.pointerId)return;if(startAtBall.current)append(coordinates(e));}:undefined}
 onPointerUp={onPath?finish:undefined} onPointerCancel={onPath?()=>{pointer.current=null;drawn.current=[];onPath([]);}:undefined}
 onLostPointerCapture={onPath?e=>{if(pointer.current===e.pointerId){pointer.current=null;drawn.current=[];onPath([]);}}:undefined}
 onKeyDown={onPath?e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const p=keyboardAim.current;keyboardAim.current={x:bound(p.x+(e.key==='ArrowLeft'?-.03:e.key==='ArrowRight'?.03:0)),y:bound(p.y+(e.key==='ArrowUp'?-.03:e.key==='ArrowDown'?.03:0))};setAim(keyboardAim.current);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();onPath([shotBall,{...keyboardAim.current}]);}}:undefined}>
 <defs><linearGradient id={`${net}-grass`} x2="0" y2="1"><stop stopColor="#113f39"/><stop offset="1" stopColor="#227855"/></linearGradient><pattern id={`${net}-net`} width="13" height="13" patternUnits="userSpaceOnUse"><path d="M13 0H0V13" fill="none" stroke="#bddbd330" strokeWidth=".7"/></pattern></defs>
 <rect width="320" height="270" rx="16" fill={`url(#${net}-grass)`}/><path d="M0 155H320M46 270L69 147H251L274 270" fill="none" stroke="#e2f0df40" strokeWidth="1.5"/>
 <path d="M32 135L17 149H303L288 135" fill="#16382d" stroke="#b3cbc080"/><rect x={shotGoal.left*320} y={shotGoal.top*270} width={(shotGoal.right-shotGoal.left)*320} height={(shotGoal.bottom-shotGoal.top)*270} fill="#0d222e" stroke="#eff8f3" strokeWidth="5"/><rect x="34" y="24" width="252" height="109" fill={`url(#${net}-net)`}/>
 <path d="M34 26L18 11H302L286 26M18 11V148M302 11V148" fill="none" stroke="#a5c6b57a" strokeWidth="1.5"/>
 {moment.kind==='free-kick'&&<g aria-label="Defensive wall"><rect x={shotWall.left*320} y={shotWall.top*270} width={(shotWall.right-shotWall.left)*320} height={(shotWall.bottom-shotWall.top)*270} rx="6" fill="#edba7750"/>{[.44,.5,.56].map(x=><g key={x}><circle cx={x*320} cy="160" r="6" fill="#e4c299"/><path d={`M${x*320-6} 168h12l3 15h-18Z`} fill="#df9a62"/><path d={`M${x*320-3} 182v9m6-9v9`} stroke="#d9e5e1" strokeWidth="3"/></g>)}</g>}
 <g transform={`translate(${(replay?keeperAt.x:.5)*320} ${(replay?keeperAt.y:.32)*270})`} className="shot-keeper"><path d="M-9 6h18l8 19h-34Z" fill="#e8bd55"/><path d="M-14 10l-13 7m41-7 13 7m-31 7-3 10m11-10 3 10" stroke="#ebc668" strokeWidth="6" strokeLinecap="round"/><foreignObject x="-13" y="-21" width="26" height="29"><PlayerAvatar player={keeper}/></foreignObject></g>
 {path.length>=2&&<path data-testid="drawn-shot-path" d={shotPathData(path)} fill="none" stroke="#d4f783" strokeWidth="2.5" strokeDasharray={replay?'4 5':'5 5'} strokeLinecap="round" strokeLinejoin="round"/>}
 {onPath&&(aim??path.at(-1))&&<g transform={`translate(${(aim??end).x*320} ${(aim??end).y*270})`} stroke="#d4f783" fill="none" strokeWidth="1.5"><circle r="8"/><path d="M-12 0h6m12 0h6M0-12v6m0 12v6"/></g>}
 {!replay&&<circle cx={shotBall.x*320} cy={shotBall.y*270} r="23" fill="#d3f78315" stroke="#d3f78370" strokeDasharray="3 4"/>}
 <g data-testid="shot-ball" data-x={ball.x.toFixed(4)} data-y={ball.y.toFixed(4)} transform={`translate(${ball.x*320} ${ball.y*270})`}><ellipse cy="9" rx="9" ry="3" fill="#061b2555"/><circle r="8" fill="#f8faf2" stroke="#122d35" strokeWidth="1.5"/><path d="M-3-4 3-4 5 1 0 5-5 1Z" fill="#273e48"/></g>
 </svg><p id={instructions} className="shot-help">{replay?'The ball follows your drawn path.':moment.kind==='free-kick'?'Draw from the ball toward the goal. Bend your line around the wall.':'Draw from the ball to the part of the goal you want to hit.'}</p>
 {onPath&&<details className="shot-access-help"><summary>Tap or keyboard aiming</summary><p>Tap a target for a straight path. Or focus the pitch, use arrow keys to move the target, then Enter to preview. Take shot confirms your attempt.</p></details>}
 </div>;
}

export function ShotReplay({moment,keeper,onComplete}:{moment:KeyMoment;keeper:Player;onComplete:()=>void}){
 const [progress,setProgress]=useState(0),complete=useRef(onComplete);complete.current=onComplete;
 useEffect(()=>{
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setProgress(1);complete.current();return;}
  let frame=0,start:number|undefined;
  const tick=(now:number)=>{start??=now;const next=Math.min(1,(now-start)/1050);setProgress(next);if(next<1)frame=requestAnimationFrame(tick);else complete.current();};frame=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(frame);
 },[moment.id]);
 return <ShotSurface moment={moment} keeper={keeper} path={moment.shot!.path} progress={progress} replay/>;
}
