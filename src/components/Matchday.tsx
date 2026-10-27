import { useEffect, useState } from 'react';
import type { Career, Fixture } from '../models';
import { clubById } from '../data/clubs';
import { AnimatedMatch } from './AnimatedMatch';
import { PlayerAvatar } from './PlayerAvatar';
import { ClubMark } from './ClubMark';
export const playbackInterval=(speed:1|2|4)=>600/speed;
export function visibleMatch(f:Fixture,minute:number){const events=f.report?.events.filter(e=>e.minute<=minute)??[];return {events,homeGoals:events.filter(e=>e.type==='goal'&&e.clubId===f.homeId).length,awayGoals:events.filter(e=>e.type==='goal'&&e.clubId===f.awayId).length,homeShots:events.filter(e=>e.clubId===f.homeId).length,awayShots:events.filter(e=>e.clubId===f.awayId).length};}
export function MatchAward({fixture:f,career:c}:{fixture:Fixture;career:Career}){
 const performance=f.report?.performances.find(p=>p.playerId===f.report?.motmId),p=c.players.find(p=>p.id===performance?.playerId);
 if(!performance||!p)return null;
 return <section className="motm"><span className="eyebrow">MAN OF THE MATCH</span><div><PlayerAvatar player={p} large/><span><h3>{p.name}</h3><p>{clubById(performance.clubId).name} · {p.position}</p></span><strong>{performance.rating.toFixed(1)}</strong></div><p>{performance.goals} goals · {performance.assists} assists · {p.position==='GK'?`${performance.saves} saves`:`${performance.tackles} tackles`} · {performance.shots} shots</p></section>;
}
export function Matchday({career:c,onUpdate,onStart,onCommit,onTactics}:{career:Career;onUpdate:(c:Career)=>void;onStart:(watch:boolean)=>void;onCommit:()=>void;onTactics:()=>void}){
 const [animated,setAnimated]=useState(()=>!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const pending=c.pending,minute=pending?.minute??0;
 const fixture=(pending?.fixtures??c.fixtures).find(f=>f.week===(pending?.week??c.week+1)&&[f.homeId,f.awayId].includes(c.clubId));
 useEffect(()=>{
 if(!pending||pending.paused||minute>=90||document.hidden)return;
 const timer=setTimeout(()=>onUpdate({...c,pending:{...pending,minute:Math.min(90,minute+1)}}),playbackInterval(pending.speed));
 return ()=>clearTimeout(timer);
 },[c,onUpdate,minute,pending]);
 useEffect(()=>{const hide=()=>{if(document.hidden&&c.pending&&!c.pending.paused)onUpdate({...c,pending:{...c.pending,paused:true}});};document.addEventListener('visibilitychange',hide);return ()=>document.removeEventListener('visibilitychange',hide);},[c,onUpdate]);
 if(!fixture)return <section className="panel"><h2>Season complete</h2><p>No remaining fixtures.</p></section>;
 const f=fixture,visible=visibleMatch(f,minute);
 const player=(id:string)=>c.players.find(p=>p.id===id)?.name??'Player';
 return <section className="panel matchday-panel"><div className="section-heading"><h2>Matchweek {f.week}</h2><span className="tag">{pending?minute===90?'FULL TIME':minute===0?'KICKOFF':`${minute}′ LIVE`:'PRE-MATCH'}</span></div><div className="match-scoreboard"><div><ClubMark club={clubById(f.homeId)} large/><strong>{clubById(f.homeId).name}</strong><small>HOME</small></div><b>{pending?`${visible.homeGoals} – ${visible.awayGoals}`:'VS'}</b><div><ClubMark club={clubById(f.awayId)} large/><strong>{clubById(f.awayId).name}</strong><small>AWAY</small></div></div>
 {!pending?<><p className="match-plan">{c.formation} · {c.tactic==='feed-star'?'Feed Your Star':c.tactic} {c.tactic==='feed-star'?`· ${player(c.starId)}`:''}</p><div className="matchday-choices"><button className="primary" onClick={()=>onStart(true)}>WATCH MATCH</button><button className="secondary" onClick={()=>onStart(false)}>QUICK SIM</button></div><button className="text-button full" onClick={onTactics}>Review tactics & lineup</button><p className="small muted">Both modes use the same match engine. The other nine fixtures resolve with your match.</p></>:<>
 {minute<90&&<><div className="playback-controls"><button className="secondary" onClick={()=>onUpdate({...c,pending:{...pending,paused:!pending.paused}})}>{pending.paused?'Resume':'Pause'}</button><div role="group" aria-label="Playback speed">{([1,2,4] as const).map(speed=><button key={speed} className={pending.speed===speed?'chosen':''} aria-pressed={pending.speed===speed} onClick={()=>onUpdate({...c,pending:{...pending,speed}})}>{speed}×</button>)}</div></div><button className="secondary full skip-animation" onClick={()=>onUpdate({...c,pending:{...pending,minute:90}})}>Skip to full time</button><p className="small muted">Accelerated match clock · speed never changes the result.</p></>}
 <button className="secondary full view-switch" onClick={()=>setAnimated(!animated)}>{animated?'Use text view':'Show animated pitch'}</button>{animated&&<AnimatedMatch fixture={f} career={c} minute={minute} paused={pending.paused} speed={pending.speed}/>}
 <div className="match-stats"><div><strong>{visible.homeShots}</strong><span>Shots</span><strong>{visible.awayShots}</strong></div><div><strong>{visible.events.filter(e=>e.clubId===f.homeId&&e.onTarget).length}</strong><span>On target</span><strong>{visible.events.filter(e=>e.clubId===f.awayId&&e.onTarget).length}</strong></div>{minute===90&&<div><strong>{f.report?.homePossession}%</strong><span>Possession</span><strong>{100-f.report!.homePossession}%</strong></div>}</div>
 {minute===90&&<><MatchAward fixture={f} career={c}/><button className="primary full" onClick={onCommit}>Finish matchweek & view results</button></>}
 <div className="commentary" role="log" aria-label="Match commentary"><h3>Match commentary</h3>{minute===90&&<p><time>FT</time> The referee brings the match to a close.</p>}{[...visible.events].reverse().map(e=><p key={e.id} className={e.type==='goal'?'goal-event':''}><time>{e.minute}′</time>{e.type==='goal'&&c.players.find(p=>p.id===e.playerId)&&<PlayerAvatar player={c.players.find(p=>p.id===e.playerId)!}/>}<span>{e.type==='goal'?`GOAL! ${player(e.playerId)} scores for ${clubById(e.clubId).name}.`:`${player(e.playerId)} ${e.onTarget?'tests the goalkeeper':'sends an effort wide'}.`}{e.assistId?<small> Assist: {player(e.assistId)}.</small>:e.creatorId&&<small>Chance created by {player(e.creatorId)}.</small>}</span></p>)}<p><time>0′</time> Kickoff. {clubById(f.homeId).name} against {clubById(f.awayId).name}.</p></div></>}
 </section>;
}
