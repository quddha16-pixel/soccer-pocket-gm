import type { Career, MatchPlan, Substitution } from '../models';
import { resolveMatch } from './match';
import { defaultBench, fixtureLineup, validateSubstitutions } from './substitutionRules';
import { random } from './random';
import { hash } from './identity';
import { eligibleStars } from './management';

export function setMatchPlan(c:Career,plan:MatchPlan):Career {
 if(c.pending||c.status!=='active')throw Error('Set the bench and planned changes before kickoff.');
 validateSubstitutions(c,c.clubId,c.lineup,plan.bench,plan.changes);
 return {...c,matchPlan:{bench:[...plan.bench],changes:[...plan.changes]}};
}
function editLive(c:Career,changes:Substitution[]):Career {
 if(!c.pending||c.pending.minute<0||c.pending.minute>=90)throw Error('Substitutions are available until full time.');
 if(c.pending.decisionFeedback)throw Error('Continue after the current decision before making a substitution.');
 const pending=c.pending,f=pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
 if(f.report?.keyMoments?.some(m=>m.selection!==undefined&&m.minute>pending.minute))throw Error('Resolve the remaining chances at this minute before making a substitution.');
 const start=(f.homeId===c.clubId?f.report!.homeLineup:f.report!.awayLineup)??fixtureLineup(f,c.clubId,0);
 const bench=(f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)??defaultBench(c,c.clubId,start);
 validateSubstitutions(c,c.clubId,start,bench,changes.filter(s=>s.clubId===c.clubId));
 const resolved=resolveMatch(f,c,random(hash(`${c.seed}:${c.world.season}:${f.id}`)),f,changes,pending.minute);
 return {...c,pending:{...pending,paused:true,fixtures:pending.fixtures.map(x=>x.id===f.id?resolved:x)}};
}
export function makeLiveSubstitution(c:Career,offId:string,onId:string):Career {
 if(!c.pending)throw Error('Start the match first.');
 const f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
 if(c.pending.minute===0){
  if(c.pending.decisionFeedback||f.report?.keyMoments?.some(m=>m.selection!==undefined&&m.minute>0))throw Error('Continue the current chance before changing the kickoff lineup.');
  const start=(f.homeId===c.clubId?f.report!.homeLineup:f.report!.awayLineup)??fixtureLineup(f,c.clubId,0),bench=(f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)??defaultBench(c,c.clubId,start);
  const index=start.indexOf(offId),incoming=c.players.find(p=>p.id===onId);
  if(index<0||!bench.includes(onId)||!incoming||(index===0)!==(incoming.position==='GK'))throw Error('Choose a starting player and a suitable bench replacement.');
  const lineup=start.map(id=>id===offId?onId:id),newBench=bench.map(id=>id===onId?offId:id),swap=(id:string)=>id===offId?onId:id===onId?offId:id;
  const changes=(f.report?.substitutions??[]).map(s=>s.clubId===c.clubId?{...s,offId:swap(s.offId),onId:swap(s.onId)}:s),own=changes.filter(s=>s.clubId===c.clubId);
  validateSubstitutions(c,c.clubId,lineup,newBench,own);
  const base={...c,lineup,matchPlan:{bench:newBench,changes:own}},stars=eligibleStars(base);
  if(!stars.length)throw Error('Keep a midfielder, winger or striker in the starting XI for the designated-star role.');
  const context={...base,starId:stars.some(p=>p.id===c.starId)?c.starId:stars[0].id};
  const known={...f,report:{...f.report!,...(f.homeId===c.clubId?{homeLineup:lineup,homeBench:newBench}:{awayLineup:lineup,awayBench:newBench}),substitutions:changes}};
  const resolved=resolveMatch(f,context,random(hash(`${c.seed}:${c.world.season}:${f.id}`)),known,changes,0);
  return {...context,pending:{...c.pending,paused:true,fixtures:c.pending.fixtures.map(x=>x.id===f.id?resolved:x)}};
 }
 return editLive(c,[...(f.report?.substitutions??[]),{clubId:c.clubId,offId,onId,minute:c.pending.minute}]);
}
export function cancelPlannedSubstitution(c:Career,index:number):Career {
 if(!c.pending)throw Error('Start the match first.');
 const f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!,changes=f.report?.substitutions??[],s=changes[index];
 if(!s||s.clubId!==c.clubId||s.minute<=c.pending.minute)throw Error('Only your future instructions can be cancelled.');
 return editLive(c,changes.filter((_,i)=>i!==index));
}
export function cancelFutureSubstitutions(c:Career):Career {
 if(!c.pending)throw Error('Start the match first.');
 const f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
 return editLive(c,(f.report?.substitutions??[]).filter(s=>s.clubId!==c.clubId||s.minute<=c.pending!.minute));
}
