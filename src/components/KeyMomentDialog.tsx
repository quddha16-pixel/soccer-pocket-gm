import {clubById} from '../data/clubs';
import {DrawOpportunity,DrawReplay} from './MomentArena';
import {drawnKinds} from '../simulation/drawnMoments';
import { useState } from 'react';
import { ArrowRight, Flag, Target } from 'lucide-react';
import type { Career, MomentKind, MomentOption } from '../models';
import { activeDecision, drawKeyMoment, chooseKeyMoment, continueAfterDecision, decisionFeedback, managedFixture } from '../simulation/keyMoments';
import { momentOptions, momentTitles } from '../simulation/momentRules';
import { Modal } from './Modal';
import { PlayerAvatar } from './PlayerAvatar';
import { ShotMatchup, ShotReplay } from './SetPieceShot';
import { fixtureLineup } from '../simulation/substitutionRules';
import {DecisionReplay} from './DecisionReplay';

const focus:Record<MomentKind,string[]>={penalty:['Power + finishing','Finishing + composure','Best when the keeper commits'],'free-kick':['Range + set-piece skill','Delivery + an aerial target','Vision + short passing'],corner:['Delivery + a near-post run','Delivery + heading','Passing + close control'],'one-on-one':['A quick, composed finish','Dribbling + acceleration','Best against an advancing keeper'],'big-chance':['Beat the recovering defence','Touch + composure; takes time','Passing + a teammate’s finish'],cross:['Crossing + heading','Delivery + attacking movement','Vision + an arriving shooter']};
function MomentPitch({kind}:{kind:MomentKind}){
 const cross=kind==='corner'||kind==='cross',x=cross?12:50,y=kind==='penalty'?42:kind==='free-kick'?68:kind==='one-on-one'?44:60;
 return <svg className="moment-pitch" viewBox="0 0 100 86" aria-hidden="true"><rect width="100" height="86" rx="7" fill="#204e3b"/><path d="M6 80V8h88v72M25 8v30h50V8M37 8v12h26V8M43 8V3h14v5" stroke="#d6ead478" strokeWidth="1" fill="none"/><circle cx="50" cy="29" r="1" fill="#e6f6dc"/><path d={`M${x} ${y} Q${cross?42:37} ${y-20} 45 9`} fill="none" stroke="#b5f56b" strokeWidth="1.7" strokeDasharray="3 3"/><circle cx="50" cy="14" r="4" fill="#ffc479"/><circle cx={x} cy={y} r="4.5" fill="#b5f56b" stroke="white" strokeWidth="1"/><circle cx={cross?55:x+7} cy={cross?34:y-4} r="2.5" fill="#f4f8ee"/>{cross&&<circle cx="60" cy="35" r="4" fill="#b5f56b"/>}</svg>;
}
export function KeyMomentDialog({career:c,onUpdate}:{career:Career;onUpdate:(c:Career)=>void}){
 const [replayDone,setReplayDone]=useState<string|null>(null),[error,setError]=useState(''),feedback=decisionFeedback(c),decision=activeDecision(c),m=feedback??decision;
 if(!m)return null;
 const inFlight=!!feedback?.shot&&replayDone!==m.id;
 const f=managedFixture(c)!,actor=c.players.find(p=>p.id===m.actorId)!,keeper=c.players.find(p=>p.id===m.keeperId)!,event=f.report!.events.find(e=>e.momentId===m.id);
 const wallPlayers=fixtureLineup(f,keeper.clubId,m.minute-1).slice(1,4).map(id=>c.players.find(p=>p.id===id)!);
 const defending=m.kind==='corner'&&m.clubId!==c.clubId;
 const outcome=defending&&['blocked','intercepted'].includes(m.outcome)?'Corner cleared':{goal:'GOAL!',saved:'Saved by the keeper',wide:m.shot?'Off target':'Just wide',blocked:m.shot?'Blocked by the wall':'The move breaks down',intercepted:'Delivery intercepted'}[m.outcome];
 const name=(id:string)=>c.players.find(p=>p.id===id)?.name??'Teammate';
 const apply=(fn:()=>Career)=>{try{onUpdate(fn());setError('');}catch(e){setError((e as Error).message);}};
 const delegate=()=>apply(()=>continueAfterDecision(chooseKeyMoment(c,m.id,m.autoChoice)));
 const targets=[m.receiverId,m.alternateId,m.supportId].map(id=>c.players.find(p=>p.id===id)!);
 if((!feedback&&m.clubId===c.clubId&&drawnKinds.includes(m.kind))||feedback?.drawnPlay){const complete=replayDone===m.id,visible=f.report!.events.filter(e=>e.type==='goal'&&(e.minute<=c.pending!.minute||complete&&e.momentId===m.id)),score=(id:string)=>visible.filter(e=>e.clubId===id).length;return <Modal title={feedback?'Your moment':momentTitles[m.kind]} onClose={feedback?()=>apply(()=>continueAfterDecision(c)):delegate} closeLabel={feedback?'Close result and continue':'Close and let player decide'} className="draw-moment-modal" footer={feedback?<button disabled={!complete} className="primary full moment-continue" onClick={()=>apply(()=>continueAfterDecision(c))}>{complete?'Continue match':'Watch your chance…'}<ArrowRight size={20}/></button>:undefined}><div className="moment-match-ribbon"><span>{m.minute}′ · {f.competition?'Cup football':'Premier League'}</span><strong>{clubById(f.homeId).short} {score(f.homeId)} — {score(f.awayId)} {clubById(f.awayId).short}</strong><span>{f.homeId===c.clubId?'HOME':'AWAY'}</span></div>{error&&<p role="alert" className="error">{error}</p>}{feedback?<DrawReplay key={m.id} moment={m} actor={actor} keeper={keeper} targets={targets} wall={wallPlayers} onComplete={()=>setReplayDone(m.id)}/>:<DrawOpportunity key={m.id} moment={m} actor={actor} keeper={keeper} targets={targets} wall={wallPlayers} onPlay={p=>apply(()=>drawKeyMoment(c,m.id,p))} onDelegate={delegate}/>}</Modal>;}
 return <Modal title={feedback?'The outcome':momentTitles[m.kind]} onClose={feedback?()=>apply(()=>continueAfterDecision(c)):delegate} closeLabel={feedback?'Close result and continue':'Close and let player decide'} className={`key-moment-modal ${feedback?.shot?'shot-moment-modal':''}`} footer={feedback?<button disabled={inFlight} className="primary full" onClick={()=>apply(()=>continueAfterDecision(c))}>{inFlight?'Ball in flight…':'Continue match'} <ArrowRight size={20}/></button>:<button className="text-button full" onClick={delegate}>Let player decide</button>}>
  <div className="moment-scene-heading"><span className="moment-minute">{m.minute}′</span><span className="eyebrow">{feedback?'Decision played':'Your call'} · {f.homeId===c.clubId?'Home':'Away'}</span><span className="moment-symbol">{['corner','free-kick'].includes(m.kind)?<Flag size={21}/>:<Target size={21}/>}</span></div>
  {error&&<p role="alert" className="error">{error}</p>}
  {!feedback?<>
   <div className="moment-scene"><MomentPitch kind={m.kind}/><div className="moment-actor"><PlayerAvatar player={actor} large/><strong><span className="moment-compact-time">{m.minute}′ · </span>{actor.name}</strong><small>{m.kind==='penalty'?'Steps up to the spot':m.kind==='corner'?'Ready to deliver':m.kind==='free-kick'?'Over the ball':'Has the opportunity'}</small></div></div>
   <p className="moment-read">{m.kind==='penalty'?(m.keeperApproach==='committing'?'The keeper looks ready to commit.':'The keeper holds their ground.'):m.keeperApproach==='advancing'?'The keeper is advancing.':'The keeper is set.'} {m.kind!=='penalty'&&(m.pressure==='closing'?'Defenders are closing down.':'There is space to work with.')}</p>
   <div className="moment-matchup"><span>Against <strong>{keeper.name}</strong></span>{['corner','free-kick','cross'].includes(m.kind)&&<span>Target <strong>{name(m.receiverId)}</strong></span>}</div>
   <p className="moment-instruction">Choose your approach</p>
   <div className="moment-options" role="group" aria-label={`${momentTitles[m.kind]} options`}>{momentOptions[m.kind].map((option,index)=><button type="button" key={option.title} onClick={()=>apply(()=>chooseKeyMoment(c,m.id,index as MomentOption))}><span className="moment-option-number">0{index+1}</span><span><strong>{option.title}</strong><small className="moment-full-hint">{option.hint}</small><small className="moment-compact-hint">{focus[m.kind][index]}</small></span><ArrowRight size={18}/></button>)}</div>
  </>:<div className={`moment-result ${defending&&m.outcome==='goal'?'conceded':m.outcome}`} role="status">{m.shot?<><ShotMatchup actor={actor} keeper={keeper}/><ShotReplay key={m.id} moment={m} keeper={keeper} actor={actor} wallPlayers={wallPlayers} onComplete={()=>setReplayDone(m.id)}/></>:<DecisionReplay moment={m} actor={actor} keeper={keeper} shooter={c.players.find(p=>p.id===(event?.playerId??m.actorId))!} wall={wallPlayers}/>}<p className="eyebrow">{momentTitles[m.kind]} · {m.minute}′</p><h2>{inFlight?'Ball in flight…':outcome}</h2>{!inFlight&&<><p>{event?(m.outcome==='goal'?`${name(event.playerId)} finds the net.`:m.outcome==='saved'?`${keeper.name} denies ${name(event.playerId)}.`:`${name(event.playerId)} cannot find the target.`):m.outcome==='intercepted'?'The defence cuts out the delivery before a shot.':m.shot?'Your shot hits the defensive wall.':'The opposition closes the chance before a shot.'}</p>{event?.assistId&&<p className="small muted">Assist: {name(event.assistId)}</p>}<div className="moment-chosen"><small>Your approach</small><strong>{m.highlight?'Played highlight':m.shot?'Your drawn shot':momentOptions[m.kind][m.selection??m.autoChoice].title}</strong></div></>}</div>}
 </Modal>;
}
