import { fixtureLineup } from './substitutionRules';
import type { AimedShot, Career, Fixture } from '../models';
import type { ManualState } from './manualModels';
import { prepareWeek } from './career';
import { createManualState, manualMinute, startSecondHalf, resetManualKickoff } from './manualEngine';
import { refreshMatchStatistics, selectMotm, resolveMatch } from './match';
import { random } from './random';
import { hash } from './identity';
import { resolveMoment } from './momentRules';
import { validAimedShot } from './shotGeometry';
import { pairKey } from './chemistry';

/** Reports remain compatible with the existing stats/box/awards/save pipeline. */
export function manualFixture(c:Career,s:ManualState):Fixture {
 const f=c.pending!.fixtures.find(f=>f.id===s.fixtureId)!;
 const base=refreshMatchStatistics({...f,report:{...f.report!,cornerTarget:undefined,events:s.events,keyMoments:s.moments,manualStats:s.stats,manualLinks:s.combinations,manualMinutes:manualMinute(s),homePossession:Math.round(s.homePossession+s.awayPossession>0?100*s.homePossession/(s.homePossession+s.awayPossession):50)}},c);
 const performances=base.report!.performances.map(p=>{const actual=s.stats[p.playerId],tackles=actual?.tackles??0;return {...p,tackles,rating:Math.round(Math.max(4,Math.min(10,p.rating-(p.tackles-tackles)*.13+Math.min(.6,(actual?.completed??0)*.025+(actual?.interceptions??0)*.05)))*10)/10};});
 return {...base,report:{...base.report!,performances,motmId:selectMotm(performances)}};
}
export function snapshotManual(c:Career,s:ManualState,paused=c.pending?.paused??true):Career {
 if(!c.pending?.manual||c.pending.manual.fixtureId!==s.fixtureId)return c;
 const f=manualFixture(c,s);
 return {...c,pending:{...c.pending,manual:s,minute:manualMinute(s),paused:paused||s.phase!=='playing'||!!s.setPiece,fixtures:c.pending.fixtures.map(x=>x.id===f.id?f:x)}};
}
export function prepareManualMatch(c:Career,duration:180|240|360=240):Career {
 if(c.pending)throw Error('Finish the current round before choosing a new match mode.');
 const prepared=prepareWeek(c,true);if(!prepared.pending)throw Error('This career has no playable fixture.');
 const f=prepared.pending.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!,manual=createManualState(prepared,f,duration);
 return snapshotManual({...prepared,pending:{...prepared.pending,manual,decisionMode:'automatic',decisionFeedback:undefined,paused:true}},manual,true);
}
export function resumeManualMatch(c:Career):Career {
 if(!c.pending?.manual)return c;let s=c.pending.manual;
 if(s.phase==='fulltime'||s.setPiece)return c;
 if(s.phase==='halftime')s=startSecondHalf(s,c,c.pending.fixtures.find(f=>f.id===s.fixtureId)!);
 return snapshotManual(c,s,false);
}
export function takeManualSetPiece(c:Career,shot?:AimedShot):Career {
 const state=c.pending?.manual,piece=state?.setPiece;if(!state||!piece||piece.resolved)throw Error('No set piece is waiting.');
 if(shot&&!validAimedShot(shot))throw Error('Draw a valid shot.');
 const f=c.pending!.fixtures.find(f=>f.id===state.fixtureId)!,m={...piece.moment,selection:piece.kind==='penalty'?1 as const:0 as const,...(shot?{shot}: {})},result=resolveMoment(f,c,m,m.selection);
 const s={...state,events:[...state.events,...(result.event?[result.event]:[])],moments:[...state.moments,result.moment],setPiece:{...piece,moment:result.moment,resolved:true},lastPass:undefined};
 return snapshotManual(c,s,true);
}
export function continueManualSetPiece(c:Career):Career {
 const original=c.pending?.manual,piece=original?.setPiece;if(!original||!piece?.resolved)return c;
 let s:ManualState={...original,actors:original.actors.map(a=>({...a})),setPiece:undefined,restart:1,lastPass:undefined};
 const opponent=s.actors.find(a=>a.clubId!==piece.moment.clubId)!.clubId,keeper=s.actors.find(a=>a.clubId===opponent&&a.slot===0)!;
 s.ball={x:keeper.x,y:keeper.y,z:0,vz:0,vx:0,vy:0,ownerId:keeper.id,lastClubId:opponent,lastPlayerId:keeper.id};if(piece.moment.outcome==='goal')s=resetManualKickoff(s,c,opponent,'Goal! · opposition kickoff');else s.notice='Play resumes';
 return snapshotManual(c,s,false);
}

export function finishManualWithAssistant(c:Career):Career {
 const s=c.pending?.manual;if(!s||s.setPiece)throw Error('Finish the current set piece first.');
 const current=snapshotManual(c,s,true),f=current.pending!.fixtures.find(f=>f.id===s.fixtureId)!,through=Math.min(90,Math.max(manualMinute(s),...s.events.map(e=>e.minute)));
 const resolved=resolveMatch(f,current,random(hash(`${c.seed}:${s.fixtureId}:assistant`)),f,f.report!.substitutions,through);
 const report={...resolved.report!,manualStats:s.stats,manualLinks:s.combinations,manualMinutes:through};
 const performances=report.performances.map(p=>({...p,tackles:(s.stats[p.playerId]?.tackles??0)+Math.round(p.tackles*(90-through)/90)}));report.performances=performances;report.motmId=selectMotm(performances);
 return {...current,pending:{...current.pending!,manual:undefined,minute:90,paused:true,decisionMode:'automatic',decisionFeedback:undefined,fixtures:current.pending!.fixtures.map(x=>x.id===f.id?{...resolved,report}:x)}};
}

export function validManualState(c:Career){
 const s=c.pending?.manual;if(s===undefined)return true;const p=c.pending!,f=p.fixtures.find(f=>f.id===s.fixtureId),ids=new Set(c.players.map(p=>p.id));
 if(!s||s.version!==1||!f||![f.homeId,f.awayId].includes(c.clubId)||s.userClubId!==c.clubId||![180,240,360].includes(s.duration)||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>s.duration||![1,2].includes(s.half)||!['playing','halftime','fulltime'].includes(s.phase)||manualMinute(s)!==p.minute||p.decisionMode!=='automatic'||p.decisionFeedback!==undefined||!Number.isInteger(s.rng)||s.rng<0||s.rng>4294967295||!Number.isInteger(s.sequence)||s.sequence<0||!Array.isArray(s.actors)||s.actors.length!==22||new Set(s.actors.map(a=>a.id)).size!==22)return false;
 const finite=(...v:number[])=>v.every(Number.isFinite);
 if(!finite(s.homePossession,s.awayPossession,s.restart,s.aim?.x,s.aim?.y)||s.homePossession<0||s.awayPossession<0||s.restart<0||typeof s.notice!=='string'||s.notice.length>300)return false;
 if(s.phase==='playing'&&(s.half===1&&s.elapsed>s.duration/2||s.half===2&&s.elapsed<s.duration/2))return false;
 if(s.phase==='halftime'&&(s.half!==1||s.elapsed!==s.duration/2)||s.phase==='fulltime'&&s.elapsed!==s.duration||s.elapsed===s.duration&&s.phase!=='fulltime')return false;
 for(const club of [f.homeId,f.awayId]){const team=s.actors.filter(a=>a.clubId===club);if(team.length!==11||new Set(team.map(a=>a.slot)).size!==11)return false;}
 if(s.actors.some(a=>!ids.has(a.id)||!Number.isInteger(a.slot)||a.slot<0||a.slot>10||!finite(a.x,a.y,a.vx,a.vy,a.energy,a.cooldown)||a.x<0||a.x>68||a.y<0||a.y>105||a.energy<0||a.energy>100||a.cooldown<0)||!s.actors.some(a=>a.id===s.controlledId&&a.clubId===c.clubId))return false;
 const b=s.ball;if(!b||!finite(b.x,b.y,b.vx,b.vy,b.z,b.vz)||Math.abs(b.x)>100||Math.abs(b.y)>150||b.z<0||b.z>30||!ids.has(b.lastPlayerId)||![f.homeId,f.awayId].includes(b.lastClubId)||(b.ownerId&&!s.actors.some(a=>a.id===b.ownerId)))return false;
 if(b.flight&&(!['pass','shot'].includes(b.flight.kind)||!ids.has(b.flight.actorId)||![f.homeId,f.awayId].includes(b.flight.clubId)||!Number.isFinite(b.flight.age)||b.flight.age<0||b.flight.targetId&&!ids.has(b.flight.targetId)))return false;
 if(!Array.isArray(s.events)||s.events.length>1000||!Array.isArray(s.moments)||s.moments.length>64||!Array.isArray(s.combinations)||s.combinations.length>110||new Set(s.combinations.map(l=>pairKey(l.a,l.b))).size!==s.combinations.length||!Array.isArray(s.appliedSubs)||s.appliedSubs.some(id=>!ids.has(id)))return false;
 for(const e of s.events){if(!ids.has(e.playerId)||![f.homeId,f.awayId].includes(e.clubId)||!['goal','shot'].includes(e.type)||!Number.isInteger(e.minute)||e.minute<1||e.minute>90||typeof e.onTarget!=='boolean'||!fixtureLineup(f,e.clubId,e.minute-1).includes(e.playerId)||(e.creatorId&&!fixtureLineup(f,e.clubId,e.minute-1).includes(e.creatorId))||(e.assistId&&!fixtureLineup(f,e.clubId,e.minute-1).includes(e.assistId)))return false;}
 const validMoment=(m:NonNullable<ManualState['setPiece']>['moment'],resolved:boolean)=>m&&['penalty','free-kick'].includes(m.kind)&&Number.isInteger(m.minute)&&m.minute>=1&&m.minute<=90&&[m.actorId,m.receiverId,m.alternateId,m.supportId,m.keeperId].every(id=>ids.has(id))&&Number.isFinite(m.baseXg)&&m.baseXg>=0&&m.baseXg<=1&&['set','advancing','committing'].includes(m.keeperApproach)&&['space','closing'].includes(m.pressure)&&['goal','saved','wide','blocked','intercepted'].includes(m.outcome)&&[0,1,2].includes(m.autoChoice)&&(!resolved||[0,1,2].includes(m.selection!))&&(!m.shot||validAimedShot(m.shot));
 if(s.moments.some(m=>!validMoment(m,true))||s.setPiece&&!validMoment(s.setPiece.moment,!!s.setPiece.resolved))return false;
 if(JSON.stringify(s.events)!==JSON.stringify(f.report?.events)||JSON.stringify(s.moments)!==JSON.stringify(f.report?.keyMoments))return false;
 if(s.combinations.some(l=>!ids.has(l.a)||!ids.has(l.b)||l.a===l.b||!Number.isInteger(l.passes)||l.passes<0||l.passes>14||!Number.isFinite(l.last)))return false;
 if(!s.stats||Object.entries(s.stats).some(([id,n])=>!ids.has(id)||!n||[n.attempted,n.completed,n.interceptions,n.tackles].some(v=>!Number.isInteger(v)||v<0)||n.completed>n.attempted||!Number.isFinite(n.distance)||n.distance<0))return false;
 if(s.setPiece&&(!['penalty','free-kick'].includes(s.setPiece.kind)||s.setPiece.moment.kind!==s.setPiece.kind||!ids.has(s.setPiece.moment.actorId)||!ids.has(s.setPiece.moment.keeperId)))return false;
 return true;
}
