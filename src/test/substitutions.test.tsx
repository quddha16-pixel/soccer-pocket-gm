import { useState } from 'react';
import { afterEach,describe,it,expect } from 'vitest';
import { cleanup,render,screen,fireEvent } from '@testing-library/react';
import type { Career,Substitution } from '../models';
import { newCareer,prepareWeek,commitWeek } from '../simulation/career';
import { nextMatchPlan,fixtureLineup,validateSubstitutions } from '../simulation/substitutionRules';
import { setMatchPlan,makeLiveSubstitution,cancelPlannedSubstitution,cancelFutureSubstitutions } from '../simulation/substitutions';
import { animationFrame } from '../simulation/animation';
import { pairKey } from '../simulation/chemistry';
import { loadCareer,saveCareer,SAVE_KEY } from '../storage';
import { SubstitutionsPanel } from '../components/SubstitutionsPanel';
import { Matchday } from '../components/Matchday';
const fresh=()=>newCareer('Sub coach','elite','liverpool',37);
const ownFixture=(c:Career)=>c.pending!.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
function instruction(c:Career,minute=60):Substitution{const plan=nextMatchPlan(c),onId=plan.bench.find(id=>c.players.find(p=>p.id===id)!.position!=='GK')!,p=c.players.find(p=>p.id===onId)!;return {clubId:c.clubId,onId,offId:c.lineup.find(id=>c.players.find(x=>x.id===id)!.position===p.position)??c.lineup[9],minute};}
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
describe('planned and live substitutions',()=>{
 it('allows a bench change when paused at kickoff without using a substitution or giving the replaced player minutes',()=>{
  const c=prepareWeek({...fresh(),interactiveMoments:false}),s=instruction(c),changed=makeLiveSubstitution(c,s.offId,s.onId),f=ownFixture(changed);
  expect(changed.lineup).toContain(s.onId);expect(changed.lineup).not.toContain(s.offId);expect(fixtureLineup(f,c.clubId,0)).toContain(s.onId);expect(f.report!.substitutions!.filter(s=>s.clubId===c.clubId)).toHaveLength(0);
  expect((f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)).toContain(s.offId);expect(f.report!.performances.some(p=>p.playerId===s.offId)).toBe(false);
  saveCareer(changed);expect(loadCareer().error).toBe('');const done=commitWeek({...changed,pending:{...changed.pending!,minute:90}});expect(done.players.find(p=>p.id===s.onId)!.identity!.development.minutes).toBe(90);expect(done.players.find(p=>p.id===s.offId)!.identity!.development.minutes).toBe(0);
 },15000);
 it('opens substitutions directly from the match controls and confirms an actual live change',()=>{
  let latest:Career;function Harness(){const [c,setC]=useState(()=>{const initial=prepareWeek({...fresh(),interactiveMoments:false});initial.pending!.minute=30;initial.pending!.paused=true;return initial;});latest=c;return <Matchday career={c} onUpdate={setC} onStart={()=>{}} onCommit={()=>{}} onTactics={()=>{}}/>;}
  render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:/^Substitutions/}));expect(screen.getByRole('dialog',{name:/Make a substitution/})).toBeTruthy();const on=(screen.getByLabelText('Player on') as HTMLSelectElement).value;
  fireEvent.click(screen.getByRole('button',{name:'Confirm substitution'}));expect(ownFixture(latest!).report!.substitutions!.some(s=>s.onId===on&&s.clubId===latest!.clubId&&s.minute===30)).toBe(true);expect(screen.getByRole('status')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Done'}));expect(screen.queryByRole('dialog')).toBeNull();expect(latest!.pending!.paused).toBe(true);
 });
 it('names nine eligible bench players and persists a planned change before kickoff',()=>{
  const c=fresh(),plan=nextMatchPlan(c),s=instruction(c);expect(plan.bench).toHaveLength(9);expect(plan.bench.some(id=>c.lineup.includes(id))).toBe(false);
  const planned=setMatchPlan(c,{...plan,changes:[s]});saveCareer(planned);expect(loadCareer().career!.matchPlan).toEqual(planned.matchPlan);
  const quick=prepareWeek(planned,false),f=ownFixture(quick),out=f.report!.performances.find(p=>p.playerId===s.offId)!,sub=f.report!.performances.find(p=>p.playerId===s.onId)!;
  expect(out.minutes).toBe(60);expect(sub.minutes).toBe(30);expect(fixtureLineup(f,c.clubId,59)).toContain(s.offId);expect(fixtureLineup(f,c.clubId,60)).toContain(s.onId);
  expect(animationFrame(f,61).players.some(p=>p.id===s.onId)).toBe(true);expect(animationFrame(f,61).players.some(p=>p.id===s.offId)).toBe(false);
 });
 it('produces exactly the same result for planned and manual changes at the same minute, preserving every past event and other fixture',()=>{
  const c=fresh(),s=instruction(c),plan=nextMatchPlan(c),planned=prepareWeek(setMatchPlan(c,{...plan,changes:[s]})),watch=prepareWeek(c),live=makeLiveSubstitution({...watch,pending:{...watch.pending!,minute:60}},s.offId,s.onId);
  expect(ownFixture(live)).toEqual(ownFixture(planned));
  expect(ownFixture(live).report!.events.filter(e=>e.minute<=60)).toEqual(ownFixture(watch).report!.events.filter(e=>e.minute<=60));
  for(const f of watch.pending!.fixtures.filter(f=>f.id!==ownFixture(watch).id))expect(live.pending!.fixtures.find(x=>x.id===f.id)).toBe(f);
  expect(live.pending!.paused).toBe(true);
 });
 it('records exact minutes once, awards overlap chemistry, and clears instructions for the next match',()=>{
  const c=fresh(),s=instruction(c),quick=prepareWeek(setMatchPlan(c,{...nextMatchPlan(c),changes:[s]}),false),done=commitWeek(quick);
  expect(done.players.find(p=>p.id===s.offId)!.identity!.development.minutes).toBe(60);expect(done.players.find(p=>p.id===s.onId)!.identity!.development.minutes).toBe(30);
  expect(done.players.reduce((sum,p)=>sum+p.identity!.development.minutes,0)).toBe(20*990);expect(done.world.chemistry.pairs[pairKey(s.offId,s.onId)]??0).toBe(0);expect(done.matchPlan).toBeUndefined();expect(commitWeek(done)).toBe(done);
  saveCareer(done);expect(loadCareer().error).toBe('');expect(loadCareer().career).toEqual(done);
 });
 it('resumes a manually changed, partially watched match without losing its new timeline',()=>{
  const c=fresh(),s=instruction(c),watch=prepareWeek(c),live=makeLiveSubstitution({...watch,pending:{...watch.pending!,minute:55}},s.offId,s.onId);saveCareer(live);expect(loadCareer().career).toEqual(live);
  const loaded=loadCareer().career!,done=commitWeek({...loaded,pending:{...loaded.pending!,minute:90}});expect(done.players.find(p=>p.id===s.onId)!.identity!.development.minutes).toBe(35);
 });
 it('rejects re-entry, non-bench players, wrong goalkeeper roles, six changes and four non-half-time windows',()=>{
  const c=fresh(),plan=nextMatchPlan(c),s=instruction(c);
  expect(()=>validateSubstitutions(c,c.clubId,c.lineup,plan.bench,[s,{...s,offId:s.onId,onId:s.offId,minute:70}])).toThrow();
  expect(()=>validateSubstitutions(c,c.clubId,c.lineup,plan.bench,[{...s,onId:c.lineup[4]}])).toThrow();
  expect(()=>validateSubstitutions(c,c.clubId,c.lineup,plan.bench,[{...s,offId:c.lineup[0]}])).toThrow(/goalkeeper/);
  expect(()=>validateSubstitutions(c,c.clubId,c.lineup,plan.bench,Array(6).fill(s))).toThrow(/five/);
  expect(()=>validateSubstitutions(c,c.clubId,c.lineup,plan.bench,[10,20,30,40].map(minute=>({...s,minute})))).toThrow(/windows/);
 });
 it('allows five changes at three stoppages plus half-time, including a goalkeeper change',()=>{
  const c=fresh(),plan=nextMatchPlan(c),bench=plan.bench.map(id=>c.players.find(p=>p.id===id)!),out=c.lineup.slice(1,5),subs=bench.filter(p=>p.position!=='GK').slice(0,4),keeper=bench.find(p=>p.position==='GK')!;
  const changes=[...subs.map((p,i)=>({clubId:c.clubId,offId:out[i],onId:p.id,minute:[45,60,60,70][i]})),{clubId:c.clubId,offId:c.lineup[0],onId:keeper.id,minute:80}];
  expect(()=>validateSubstitutions(c,c.clubId,c.lineup,plan.bench,changes)).not.toThrow();
  const f=ownFixture(prepareWeek(setMatchPlan(c,{...plan,changes}),false));expect(f.report!.performances.find(p=>p.playerId===keeper.id)!.minutes).toBe(10);
  expect(f.report!.performances.filter(p=>p.clubId===c.clubId).reduce((sum,p)=>sum+p.minutes!,0)).toBe(990);
 });
 it('lets live instructions be cancelled only before they occur and enforces full-time locks',()=>{
  const c=fresh(),s=instruction(c),watch=prepareWeek(setMatchPlan(c,{...nextMatchPlan(c),changes:[s]})),live={...watch,pending:{...watch.pending!,minute:30}},index=ownFixture(live).report!.substitutions!.findIndex(x=>x.onId===s.onId);
  expect(ownFixture(cancelPlannedSubstitution(live,index)).report!.substitutions!.some(x=>x.onId===s.onId)).toBe(false);const manual=cancelFutureSubstitutions(live);expect(ownFixture(manual).report!.substitutions!.filter(x=>x.clubId===c.clubId)).toHaveLength(0);expect(ownFixture(makeLiveSubstitution(manual,s.offId,s.onId)).report!.substitutions!.some(x=>x.onId===s.onId&&x.minute===30)).toBe(true);
  expect(()=>cancelPlannedSubstitution({...live,pending:{...live.pending,minute:65}},index)).toThrow(/future/);
  expect(()=>makeLiveSubstitution({...live,pending:{...live.pending,minute:90}},s.offId,s.onId)).toThrow(/full time/);
  expect(()=>setMatchPlan(live,nextMatchPlan(c))).toThrow(/before kickoff/);
 });
 it('gives AI clubs a bench and useful substitutions while never crediting unused bench players with appearances',()=>{
  const c=prepareWeek(fresh(),false);expect(c.pending!.fixtures.some(f=>f.report!.substitutions!.some(s=>s.clubId!==c.clubId))).toBe(true);
  for(const f of c.pending!.fixtures){expect(f.report!.performances.reduce((sum,p)=>sum+p.minutes!,0)).toBe(1980);for(const e of f.report!.events){expect(fixtureLineup(f,e.clubId,e.minute-1)).toContain(e.playerId);if(e.creatorId)expect(fixtureLineup(f,e.clubId,e.minute-1)).toContain(e.creatorId);}}
 });
 it('rejects corrupt saved substitution timelines',()=>{
  const c=prepareWeek(fresh()),f=ownFixture(c);f.report!.substitutions!.push({clubId:c.clubId,offId:c.lineup[0],onId:c.lineup[1],minute:60});localStorage.setItem(SAVE_KEY,JSON.stringify(c));expect(loadCareer().career).toBeNull();
 });
 it('loads a pre-substitutions pending report and adds a bench without changing the watched past',()=>{
  const c=prepareWeek(fresh());c.pending!.minute=30;c.pending!.paused=true;
  for(const f of c.pending!.fixtures){const r=f.report!,ids=new Set([...r.homeLineup!,...r.awayLineup!]);delete r.substitutions;delete r.keyMoments;delete r.simulationSeed;delete r.homeBench;delete r.awayBench;
   r.events=r.events.map(({momentId,...event})=>event).filter(e=>ids.has(e.playerId)&&(!e.creatorId||ids.has(e.creatorId))&&(!e.assistId||ids.has(e.assistId)));
   r.performances=r.performances.filter(p=>ids.has(p.playerId)).map(({minutes,entered,exited,conceded,...p})=>p);r.motmId=r.performances[0].playerId;
   f.homeGoals=r.events.filter(e=>e.clubId===f.homeId&&e.type==='goal').length;f.awayGoals=r.events.filter(e=>e.clubId===f.awayId&&e.type==='goal').length;
  }
  saveCareer(c);const loaded=loadCareer().career!;expect(loaded).not.toBeNull();const s=instruction(loaded),past=ownFixture(loaded).report!.events.filter(e=>e.minute<=30),changed=makeLiveSubstitution(loaded,s.offId,s.onId);
  expect(ownFixture(changed).report!.events.filter(e=>e.minute<=30)).toEqual(past);saveCareer(changed);expect(loadCareer().error).toBe('');
 });
 it('exposes Set your subs, schedules a change, then provides a paused live manual change area',()=>{
  function Harness(){const [c,setC]=useState(fresh());return <><SubstitutionsPanel career={c} onUpdate={setC}/><button onClick={()=>{const p=prepareWeek(c);setC({...p,pending:{...p.pending!,minute:30}});}}>Kick off</button></>;}
  render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Set your subs'}));expect(screen.getByLabelText('Substitution minute')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Schedule substitution'}));expect(screen.getByText('Cancel planned change')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Done'}));fireEvent.click(screen.getByRole('button',{name:'Kick off'}));fireEvent.click(screen.getByRole('button',{name:'Make a substitution'}));expect(screen.getByText(/Match paused/)).toBeTruthy();expect(screen.getByRole('button',{name:'Confirm substitution'})).toBeTruthy();
 });
});
