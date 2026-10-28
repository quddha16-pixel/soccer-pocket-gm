import type { Career, MatchPlan, Substitution } from '../models';
import { resolveMatch } from './match';
import { defaultBench, fixtureLineup, validateSubstitutions } from './substitutionRules';
import { random } from './random';
import { hash } from './identity';

export function setMatchPlan(c:Career,plan:MatchPlan):Career {
 if(c.pending||c.status!=='active')throw Error('Set the bench and planned changes before kickoff.');
 validateSubstitutions(c,c.clubId,c.lineup,plan.bench,plan.changes);
 return {...c,matchPlan:{bench:[...plan.bench],changes:[...plan.changes]}};
}
function editLive(c:Career,changes:Substitution[]):Career {
 if(!c.pending||c.pending.minute<1||c.pending.minute>=90)throw Error('Substitutions are available from minute 1 until full time.');
 const pending=c.pending,f=pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
 const start=(f.homeId===c.clubId?f.report!.homeLineup:f.report!.awayLineup)??fixtureLineup(f,c.clubId,0);
 const bench=(f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)??defaultBench(c,c.clubId,start);
 validateSubstitutions(c,c.clubId,start,bench,changes.filter(s=>s.clubId===c.clubId));
 const resolved=resolveMatch(f,c,random(hash(`${c.seed}:${c.world.season}:${f.id}`)),f,changes,pending.minute);
 return {...c,pending:{...pending,paused:true,fixtures:pending.fixtures.map(x=>x.id===f.id?resolved:x)}};
}
export function makeLiveSubstitution(c:Career,offId:string,onId:string):Career {
 if(!c.pending)throw Error('Start the match first.');
 const f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
 return editLive(c,[...(f.report?.substitutions??[]),{clubId:c.clubId,offId,onId,minute:c.pending.minute}]);
}
export function cancelPlannedSubstitution(c:Career,index:number):Career {
 if(!c.pending)throw Error('Start the match first.');
 const f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!,changes=f.report?.substitutions??[],s=changes[index];
 if(!s||s.clubId!==c.clubId||s.minute<=c.pending.minute)throw Error('Only your future instructions can be cancelled.');
 return editLive(c,changes.filter((_,i)=>i!==index));
}
