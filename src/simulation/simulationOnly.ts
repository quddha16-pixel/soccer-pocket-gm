import type {Career} from '../models';
import {completeHighlight} from './highlights';
import {chooseKeyMoment,continueAfterDecision,activeDecision} from './keyMoments';
import {finishManualWithAssistant,takeManualSetPiece,continueManualSetPiece} from './manualCareer';
/** Preserve played goals/subs, then hand unfinished legacy controls back to the simulation. */
export function simulationOnly(c:Career):Career{
 let next=c;
 if(next.pending?.manual){const minute=next.pending.minute;if(next.pending.manual.setPiece){if(!next.pending.manual.setPiece.resolved)next=takeManualSetPiece(next);next=continueManualSetPiece(next);}next=finishManualWithAssistant(next);next={...next,pending:{...next.pending!,minute:Math.max(minute,...next.pending!.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!.report!.events.filter(e=>e.minute<=minute).map(e=>e.minute)),paused:true,decisionMode:'interactive'}};}
 if(next.pending?.highlight){const s=next.pending.highlight,m=activeDecision(next);if(s.phase==='finished')next=completeHighlight(next,s);else if(m?.clubId!==next.clubId&&m)next=continueAfterDecision(chooseKeyMoment(next,m.id,m.autoChoice));else{const f=next.pending.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!,links=[...(f.report!.manualLinks??[])].map(l=>({...l}));for(const l of s.links){const old=links.find(x=>x.a===l.a&&x.b===l.b);if(old)old.passes=Math.min(14,old.passes+l.passes);else links.push({...l});}next={...next,pending:{...next.pending,highlight:undefined,paused:true,fixtures:next.pending.fixtures.map(x=>x.id===f.id?{...f,report:{...f.report!,manualLinks:links}}:x)}};}}
 return next.playableHighlights===false?next:{...next,playableHighlights:false};
}
