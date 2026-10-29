import type { Career, Fixture, MatchPlan, SavedSubPlan, Substitution } from '../models';
import { eligiblePlayers } from './economy';
import { defaultBench, nextMatchPlan, validateSubstitutions } from './substitutionRules';
import { setMatchPlan } from './substitutions';

const signature=(p:SavedSubPlan)=>JSON.stringify([p.clubId,p.formation,[...p.bench].sort(),p.changes.map(s=>[s.clubId,s.minute,s.offId,s.onId])]);
function distinct(plans:SavedSubPlan[]){
 const ids=new Set<string>(),patterns=new Set<string>();return plans.filter(p=>{
  const key=signature(p);if(ids.has(p.id)||patterns.has(key))return false;ids.add(p.id);patterns.add(key);return true;
 }).slice(0,5);
}
function fromFixture(c:Career,f:Fixture):SavedSubPlan|undefined {
 const report=f.report,changes=report?.substitutions?.filter(s=>s.clubId===c.clubId)??[],bench=f.homeId===c.clubId?report?.homeBench:report?.awayBench;
 if(!changes.length||!bench)return;
 return {id:`subs-${c.clubId}-${c.world.season}-${f.week}${f.competition?`-${f.id}`:''}`,clubId:c.clubId,season:c.world.season,week:f.week,formation:(f.homeId===c.clubId?report?.homeFormation:report?.awayFormation)??'4-3-3',source:'match',bench:[...bench],changes:changes.map(s=>({...s}))};
}
/** Existing v1.7/v1.8 match reports supply recent plans without a career reset. */
export function recentSubstitutionPlans(c:Career):SavedSubPlan[]{
 const matches=c.fixtures.filter(f=>f.week<=c.week&&f.homeGoals!==undefined&&(f.homeId===c.clubId||f.awayId===c.clubId)).map(f=>fromFixture(c,f)).filter((p):p is SavedSubPlan=>!!p);
 return distinct([...(c.recentSubPlans??[]).filter(p=>p.clubId===c.clubId),...matches].sort((a,b)=>b.season-a.season||b.week-a.week||Number(b.source==='match')-Number(a.source==='match')));
}
export function rememberCompletedSubstitutions(c:Career){
 const f=c.pending?.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId),plan=f&&c.pending!.minute>=90?fromFixture(c,f):undefined;
 return distinct([...(plan?[plan]:[]),...recentSubstitutionPlans(c)]);
}
export function saveSubstitutionPlan(c:Career):Career {
 if(c.pending||c.status!=='active')throw Error('Save substitution plans before kickoff.');
 const plan=nextMatchPlan(c);if(!plan.changes.length)throw Error('Schedule a substitution before saving a plan.');
 const saved:SavedSubPlan={...plan,id:`saved-subs-${c.clubId}-${c.world.season}-${c.week+1}`,clubId:c.clubId,season:c.world.season,week:c.week+1,formation:c.formation,source:'saved'};
 return {...c,recentSubPlans:distinct([saved,...recentSubstitutionPlans(c)])};
}
export function previewSubstitutionPlan(c:Career,id:string):{plan:MatchPlan;skipped:{change:Substitution;reason:string}[];original:SavedSubPlan}{
 const original=recentSubstitutionPlans(c).find(p=>p.id===id);if(!original)throw Error('That recent substitution plan is no longer available.');
 const eligible=eligiblePlayers(c,c.clubId),available=new Set(eligible.map(p=>p.id)),notStarting=(id:string)=>available.has(id)&&!c.lineup.includes(id);
 const needed=original.changes.map(s=>s.onId).filter(notStarting),defaults=defaultBench(c,c.clubId,c.lineup),keeper=defaults.find(id=>c.players.find(p=>p.id===id)?.position==='GK');
 const bench=[...new Set([...needed,...(keeper?[keeper]:[]),...original.bench,...defaults])].filter(notStarting).slice(0,9),changes:Substitution[]=[],skipped:{change:Substitution;reason:string}[]=[];
 for(const s of [...original.changes].sort((a,b)=>a.minute-b.minute)){
  if(!available.has(s.offId)||!available.has(s.onId)){skipped.push({change:s,reason:'A player is injured, unregistered, retired or no longer at your club.'});continue;}
  try{validateSubstitutions(c,c.clubId,c.lineup,bench,[...changes,s]);changes.push({...s});}catch(e){skipped.push({change:s,reason:(e as Error).message});}
 }
 return {plan:{bench,changes},skipped,original};
}
export function reuseSubstitutionPlan(c:Career,id:string):Career {
 if(c.pending||c.status!=='active')throw Error('Reuse substitution plans before kickoff.');
 const preview=previewSubstitutionPlan(c,id);if(!preview.plan.changes.length)throw Error('No changes from this plan fit your current lineup and available bench. Your current plan is unchanged.');
 return setMatchPlan(c,preview.plan);
}
export const subPlanLabel=(p:SavedSubPlan)=>`${p.source==='saved'?'Saved plan':'Match plan'} · Week ${p.week} · ${p.season}/${String(p.season+1).slice(-2)}`;
