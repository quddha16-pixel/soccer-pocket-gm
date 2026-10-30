import {validDrawnPlay,drawnOption,copyDrawnPlay} from './drawnMoments';
import { needsDecision } from './momentControl';
import { validAimedShot } from './shotGeometry';
import type { AimedShot, DrawnPlay, Career, KeyMoment, MomentOption } from '../models';
import { resolveMoment } from './momentRules';
import { refreshMatchStatistics } from './match';
export const managedFixture=(c:Career)=>c.pending?.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId);
export function activeDecision(c:Career):KeyMoment|undefined {
 if(!c.pending||c.pending.decisionMode!=='interactive'||c.pending.decisionFeedback||c.pending.minute>=90)return;
 const moments=managedFixture(c)?.report?.keyMoments??[],waiting=(m:KeyMoment)=>needsDecision(c,m)&&m.selection===undefined&&m.minute>c.pending!.minute&&m.minute<=c.pending!.minute+1;
 return moments.find(m=>m.id===c.pending!.highlight?.momentId&&waiting(m))??moments.find(waiting);
}
export function decisionFeedback(c:Career){return managedFixture(c)?.report?.keyMoments?.find(m=>m.id===c.pending?.decisionFeedback);}
export function chooseKeyMoment(c:Career,id:string,option:MomentOption,shot?:AimedShot,drawnPlay?:DrawnPlay):Career {
 if(!c.pending||c.pending.minute>=90||c.pending.decisionMode!=='interactive')throw Error('This match is not waiting for a live decision.');
 if(![0,1,2].includes(option))throw Error('Choose one of the three actions.');
 const f=managedFixture(c)!,existing=f.report?.keyMoments?.find(m=>m.id===id);
 if(existing?.selection!==undefined){if(existing.selection===option&&(!shot||JSON.stringify(existing.shot)===JSON.stringify(shot))&&(!drawnPlay||JSON.stringify(existing.drawnPlay)===JSON.stringify(drawnPlay)))return c;throw Error('This decision has already been made.');}
 const moment=activeDecision(c);if(!moment||moment.id!==id)throw Error('Only the current decision can be played.');
 if(shot&&(!['penalty','free-kick'].includes(moment.kind)||!validAimedShot(shot)||option!==(moment.kind==='penalty'?1:0)))throw Error('Draw a valid shot from the ball towards the goal.');
 if(drawnPlay&&(shot||!validDrawnPlay(drawnPlay,moment.kind)||option!==drawnOption(moment.kind,drawnPlay)))throw Error('Draw a complete, valid path for this opportunity.');
 const result=resolveMoment(f,c,{...moment,selection:option,...(drawnPlay?{drawnPlay:copyDrawnPlay(drawnPlay)}:{}),...(shot?{shot:{...shot,path:shot.path.map(p=>({...p}))}}:{})},option);
 const events=f.report!.events.filter(e=>e.momentId!==id&&e.id!==moment.eventId);if(result.event)events.push(result.event);events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 const resolved=refreshMatchStatistics({...f,report:{...f.report!,events,keyMoments:f.report!.keyMoments!.map(m=>m.id===id?result.moment:m)}},c);
 return {...c,pending:{...c.pending,highlight:undefined,paused:true,decisionFeedback:id,fixtures:c.pending.fixtures.map(x=>x.id===f.id?resolved:x)}};
}
export function continueAfterDecision(c:Career):Career {
 if(!c.pending)return c;const feedback=decisionFeedback(c);if(!feedback)return c;
 const another=managedFixture(c)?.report?.keyMoments?.some(m=>needsDecision(c,m)&&m.selection===undefined&&m.minute===feedback.minute);
 return {...c,pending:{...c.pending,highlight:undefined,decisionFeedback:undefined,paused:false,minute:another?c.pending.minute:Math.max(c.pending.minute,feedback.minute)}};
}
export function advancePlayback(c:Career):Career {
 if(!c.pending||c.pending.paused||c.pending.minute>=90)return c;
 if(activeDecision(c)||c.pending.decisionFeedback)return {...c,pending:{...c.pending,paused:true}};
 return {...c,pending:{...c.pending,minute:Math.min(90,c.pending.minute+1)}};
}
export function skipToFullTime(c:Career):Career {
 if(!c.pending)return c;
 return {...c,pending:{...c.pending,highlight:undefined,minute:90,decisionMode:'automatic',decisionFeedback:undefined,paused:false}};
}

export function shootKeyMoment(c:Career,id:string,shot:AimedShot):Career {
 const moment=managedFixture(c)?.report?.keyMoments?.find(m=>m.id===id);
 if(!moment||!['penalty','free-kick'].includes(moment.kind)||!validAimedShot(shot))throw Error('Draw a valid shot from the ball towards the goal.');
 return chooseKeyMoment(c,id,moment.kind==='penalty'?1:0,shot);
}

export function drawKeyMoment(c:Career,id:string,play:DrawnPlay):Career {
 const m=managedFixture(c)?.report?.keyMoments?.find(m=>m.id===id);
 if(!m||!validDrawnPlay(play,m.kind))throw Error('Draw a complete, valid path for this opportunity.');
 return chooseKeyMoment(c,id,drawnOption(m.kind,play),undefined,play);
}
