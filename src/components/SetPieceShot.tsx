import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AimPoint, KeyMoment, Player } from '../models';
import { pathPosition, pointDistance, shotBall, shotGeometry, shotGoal, shotPathData, shotPower, shotWall } from '../simulation/shotGeometry';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerBodyGlyph } from './PlayerBody';
import { clubTheme } from '../data/clubThemes';

const bound=(n:number)=>Math.round(Math.max(0,Math.min(1,n))*10000)/10000;
export function ShotMatchup({actor,keeper}:{actor:Player;keeper:Player}){
 return <div className="shot-matchup"><div><PlayerAvatar player={actor}/><span><small>Your taker</small><strong>{actor.name}</strong></span></div><span className="shot-versus">v</span><div><PlayerAvatar player={keeper}/><span><small>Goalkeeper</small><strong>{keeper.name}</strong></span></div></div>;
}
export function ShotSurface({moment,keeper,actor,wallPlayers=[],path,onPath,durationMs,progress=0,replay=false}:{moment:KeyMoment;keeper:Player;actor?:Player;wallPlayers?:Player[];path:AimPoint[];onPath?:(path:AimPoint[],durationMs?:number)=>void;durationMs?:number;progress?:number;replay?:boolean}){
 const net=useId().replace(/:/g,''),instructions=useId(),pointer=useRef<number|null>(null),drawn=useRef<AimPoint[]>([]),started=useRef(0),startAtBall=useRef(false),keyboardAim=useRef<AimPoint>({x:.5,y:.28}),[aim,setAim]=useState<AimPoint|null>(null);
 const geometry=useMemo(()=>path.length>=2?shotGeometry({path}):undefined,[path]),stop=moment.outcome==='blocked'&&geometry?.wallAt!==undefined?geometry.wallAt:1;
 const ball=replay?pathPosition(path,Math.min(progress,stop)):shotBall,power=shotPower({path,durationMs}),impact=replay?Math.max(0,(progress-.85)/.15):0;
 const end=path.at(-1)??{x:.5,y:.28},dive=Math.max(0,Math.min(1,(progress-.12)/.7));
 const keeperTarget=moment.outcome==='saved'?end:{x:end.x<.5?.68:.32,y:.35},keeperAt={x:.5+(keeperTarget.x-.5)*dive*.85,y:.46+(Math.max(.25,keeperTarget.y+.13)-.46)*dive};
 function coordinates(e:React.PointerEvent<SVGSVGElement>){const svg=e.currentTarget,matrix=svg.getScreenCTM?.();if(matrix){const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(matrix.inverse());return {x:bound(local.x/320),y:bound(local.y/270)};}const r=svg.getBoundingClientRect();return {x:bound((e.clientX-r.left)/r.width),y:bound((e.clientY-r.top)/r.height)};}
 function append(p:AimPoint){const points=drawn.current;if(pointDistance(points.at(-1)??shotBall,p)<.006)return;const next=[...points,p];if(next.length>64)drawn.current=[next[0],...next.slice(1,-1).filter((_,i)=>i%2===0),p];else drawn.current=next;onPath?.([...drawn.current]);}
 function finish(e:React.PointerEvent<SVGSVGElement>){if(pointer.current!==e.pointerId)return;const p=coordinates(e);if(startAtBall.current){append(p);onPath?.([...drawn.current],Math.max(80,Math.min(6000,performance.now()-started.current)));}else {drawn.current=[shotBall,p];onPath?.([...drawn.current]);}pointer.current=null;if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 return <div className={`shot-surface-wrap ${replay?'is-replay':''}`}>
 <svg className="shot-surface" viewBox="0 0 320 270" role="group" aria-label={replay?'Drawn shot replay':'Shot aiming area'} aria-describedby={instructions} tabIndex={onPath?0:undefined}
 onPointerDown={onPath?e=>{if(pointer.current!==null||e.button>0)return;e.preventDefault();pointer.current=e.pointerId;started.current=performance.now();const p=coordinates(e);startAtBall.current=pointDistance(p,shotBall)<.13;drawn.current=[shotBall];if(!startAtBall.current)drawn.current.push(p);onPath([...drawn.current]);e.currentTarget.setPointerCapture?.(e.pointerId);}:undefined}
 onPointerMove={onPath?e=>{if(pointer.current!==e.pointerId)return;if(startAtBall.current)append(coordinates(e));}:undefined}
 onPointerUp={onPath?finish:undefined} onPointerCancel={onPath?()=>{pointer.current=null;drawn.current=[];onPath([]);}:undefined}
 onLostPointerCapture={onPath?e=>{if(pointer.current===e.pointerId){pointer.current=null;drawn.current=[];onPath([]);}}:undefined}
 onKeyDown={onPath?e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const p=keyboardAim.current;keyboardAim.current={x:bound(p.x+(e.key==='ArrowLeft'?-.03:e.key==='ArrowRight'?.03:0)),y:bound(p.y+(e.key==='ArrowUp'?-.03:e.key==='ArrowDown'?.03:0))};setAim(keyboardAim.current);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();onPath([shotBall,{...keyboardAim.current}]);}}:undefined}>
 <defs><filter id={`${net}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id={`${net}-ink`} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#f6ffff"/><stop offset=".5" stopColor="#b7f47c"/><stop offset="1" stopColor="#73e8df"/></linearGradient><linearGradient id={`${net}-grass`} x2="0" y2="1"><stop stopColor="#113f39"/><stop offset="1" stopColor="#227855"/></linearGradient><pattern id={`${net}-net`} width="13" height="13" patternUnits="userSpaceOnUse"><path d="M13 0H0V13" fill="none" stroke="#bddbd330" strokeWidth=".7"/></pattern></defs>
 <rect width="320" height="270" rx="16" fill={`url(#${net}-grass)`}/><path d="M0 0h320v151H0Z" fill="#162c3e"/><path d="M0 20h320M0 44h320M0 68h320M0 92h320" stroke="#4a6574" strokeWidth="2"/>{Array.from({length:72},(_,i)=><circle key={i} cx={6+i%24*13.4} cy={14+Math.floor(i/24)*24} r="1.6" fill={i%3?'#d7e9db':'#90d1bc'} opacity=".45"/>)}<path d="M0 134h320v17H0Z" fill="#233d4b"/><text x="160" y="145" fill="#bed6d2" textAnchor="middle" fontSize="6" letterSpacing="3">POCKET FOOTBALL GM</text>{[0,1,2,3,4].map(i=><path key={i} d={`M${i*64} 151h32l${(i-2)*12} 119h-50Z`} fill="#d8f0bb" opacity=".035"/>)}<path d="M0 155H320M46 270L69 147H251L274 270" fill="none" stroke="#e2f0df40" strokeWidth="1.5"/>
 <path d="M32 135L17 149H303L288 135" fill="#16382d" stroke="#b3cbc080"/><rect x={shotGoal.left*320} y={shotGoal.top*270} width={(shotGoal.right-shotGoal.left)*320} height={(shotGoal.bottom-shotGoal.top)*270} fill="#0d222ed9" stroke="#eff8f3" strokeWidth="5"/><rect x="34" y="24" width="252" height="109" fill={`url(#${net}-net)`} transform={replay&&moment.outcome==='goal'?`translate(${Math.sin(impact*26)*impact*1.8} ${Math.sin(impact*19)*impact*1.4})`:undefined}/><path d="M34 135V24h252v111" stroke="#fff" strokeWidth="2" fill="none" opacity=".9"/>
 <path d="M34 26L18 11H302L286 26M18 11V148M302 11V148" fill="none" stroke="#a5c6b57a" strokeWidth="1.5"/>
 {moment.kind==='free-kick'&&<g aria-label="Defensive wall">{[.42,.5,.58].map((x,i)=>{const p=wallPlayers[i],jump=replay?Math.sin(Math.min(1,progress*2)*Math.PI)*5:0;return p?<g key={x} transform={`translate(${x*320} ${194-jump}) scale(13.5)`}><PlayerBodyGlyph player={p} kit={clubTheme(p.clubId).primary} trim={clubTheme(p.clubId).secondary}/></g>:<g key={x} transform={`translate(${x*320} ${194-jump})`}><circle cy="-74" r="8" fill="#9caeb8"/><path d="M-11-61h22l3 33h-28Z" fill="#365a75"/><path d="m-7-28-2 26m16-26 2 26" stroke="#9caeb8" strokeWidth="8"/></g>;})}</g>}

 <g transform={`translate(${(replay?keeperAt.x:.5)*320} ${(replay?keeperAt.y:.46)*270}) rotate(${replay?(keeperTarget.x<.5?-58:58)*dive:0})`} className="shot-keeper"><g transform="scale(12)"><PlayerBodyGlyph player={keeper} kit={clubTheme(keeper.clubId).primary} trim="#1c3544" pose={replay?1:0}/></g></g>
 {actor&&<g transform={`translate(131 266) rotate(${replay?-Math.sin(Math.min(1,progress*5)*Math.PI)*8:0}) scale(15)`}><PlayerBodyGlyph player={actor} kit={clubTheme(actor.clubId).primary} trim={clubTheme(actor.clubId).secondary} pose={replay?1:0}/></g>}
 {replay&&progress>.08&&<path d={shotPathData(Array.from({length:12},(_,i)=>pathPosition(path,Math.min(stop,Math.max(0,progress-.14+i*.14/11)))))} fill="none" stroke="#f7ffd8" strokeWidth="5" opacity=".28" strokeLinecap="round" filter={`url(#${net}-glow)`}/>}

 {path.length>=2&&<path data-testid="drawn-shot-path" d={shotPathData(path)} fill="none" stroke={`url(#${net}-ink)`} strokeWidth={replay?1.2:3.2} opacity={replay?.25:1} filter={replay?undefined:`url(#${net}-glow)`} strokeLinecap="round" strokeLinejoin="round"/>}
 {onPath&&(aim??path.at(-1))&&<g transform={`translate(${(aim??end).x*320} ${(aim??end).y*270})`} stroke="#d4f783" fill="none" strokeWidth="1.5"><circle r="8"/><path d="M-12 0h6m12 0h6M0-12v6m0 12v6"/></g>}
 {!replay&&<circle cx={shotBall.x*320} cy={shotBall.y*270} r="23" fill="#d3f78315" stroke="#d3f78370" strokeDasharray="3 4"/>}
 {replay&&impact>0&&<g transform={`translate(${ball.x*320} ${ball.y*270})`} opacity={1-impact*.75}>{Array.from({length:8},(_,i)=><circle key={i} cx={Math.cos(i*Math.PI/4)*impact*25} cy={Math.sin(i*Math.PI/4)*impact*19} r={2.5*(1-impact*.6)} fill={moment.outcome==='goal'?'#ceff8b':'#e5fcff'}/>)}<circle r={8+impact*16} fill="none" stroke="#efffcd" strokeWidth="1.2"/></g>}
 <g data-testid="shot-ball" data-x={ball.x.toFixed(4)} data-y={ball.y.toFixed(4)} transform={`translate(${ball.x*320} ${ball.y*270}) scale(${replay?1-progress*.38:1})`}><ellipse cy="9" rx="9" ry="3" fill="#061b2555"/><circle r="8" fill="#f8faf2" stroke="#122d35" strokeWidth="1.5"/><path d="M-3-4 3-4 5 1 0 5-5 1Z" fill="#273e48" transform={`rotate(${progress*720})`}/><circle cx="-2" cy="-3" r="2" fill="#fff" opacity=".6"/></g>
 </svg>{onPath&&<div className="shot-telemetry"><span><small>POWER</small><meter min="0" max="1" value={power} aria-label="Shot power"/><b>{power>.78?'Power':power<.5?'Touch':'Driven'}</b></span><span><small>AIM</small><b>{geometry?(geometry.inside?geometry.edgeRisk>.65?'Close to the post':'Inside the frame':'Off target'):'Draw your path'}</b></span>{moment.kind==='free-kick'&&<span><small>WALL</small><b>{geometry?(geometry.wallAt===undefined?'Curving around':'In the wall’s path'):'Find a route'}</b></span>}</div>}<p id={instructions} className="shot-help">{replay?'The ball follows your drawn path.':moment.kind==='free-kick'?'Bend your stroke around the wall. A quicker swipe adds power.':'Draw from the ball to your chosen corner. A quicker swipe adds power.'}</p>
 {onPath&&<details className="shot-access-help"><summary>Tap or keyboard aiming</summary><p>Tap a target for a straight path. Or focus the pitch, use arrow keys to move the target, then Enter to preview. Take shot confirms your attempt.</p></details>}
 </div>;
}

export function ShotReplay({moment,keeper,actor,wallPlayers,onComplete}:{moment:KeyMoment;keeper:Player;actor?:Player;wallPlayers?:Player[];onComplete:()=>void}){
 const [progress,setProgress]=useState(0),complete=useRef(onComplete);complete.current=onComplete;
 useEffect(()=>{
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setProgress(1);complete.current();return;}
  let frame=0,start:number|undefined;
  const tick=(now:number)=>{start??=now;const next=Math.min(1,(now-start)/(1450-shotPower(moment.shot!)*500));setProgress(next);if(next<1)frame=requestAnimationFrame(tick);else complete.current();};frame=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(frame);
 },[moment.id]);
 return <ShotSurface moment={moment} keeper={keeper} actor={actor} wallPlayers={wallPlayers} durationMs={moment.shot!.durationMs} path={moment.shot!.path} progress={progress} replay/>;
}
