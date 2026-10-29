import { useState } from 'react';
import { afterEach,describe,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,within,act } from '@testing-library/react';
import type { Career,KeyMoment,MomentKind } from '../models';
import { newCareer,prepareWeek,commitWeek } from '../simulation/career';
import { refreshMatchStatistics,resolveMatch } from '../simulation/match';
import { random } from '../simulation/random';
import { activeDecision,advancePlayback,chooseKeyMoment,continueAfterDecision,decisionFeedback,managedFixture,skipToFullTime } from '../simulation/keyMoments';
import { assessMoment,momentKinds,momentOptions,momentTitles,resolveMoment } from '../simulation/momentRules';
import { makeLiveSubstitution } from '../simulation/substitutions';
import { fixtureLineup } from '../simulation/substitutionRules';
import { saveCareer,loadCareer,SAVE_KEY } from '../storage';
import { KeyMomentDialog } from '../components/KeyMomentDialog';
import { Matchday,visibleMatch } from '../components/Matchday';

const fresh=()=>({...newCareer('Decision coach','elite','liverpool',23),playableHighlights:false});
function scenario(kind:MomentKind='penalty'):Career {
 const c=prepareWeek(fresh()),f=managedFixture(c)!,old=f.report!.keyMoments!.find(m=>m.clubId===c.clubId)!,m={...old,kind,autoChoice:0 as const};
 const result=resolveMoment(f,c,m,0),events=f.report!.events.filter(e=>e.momentId!==m.id);if(result.event)events.push(result.event);events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 const next=refreshMatchStatistics({...f,report:{...f.report!,events,keyMoments:f.report!.keyMoments!.map(x=>x.id===m.id?result.moment:x)}},c);
 return {...c,pending:{...c.pending!,minute:m.minute-1,paused:true,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?next:x)}};
}
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();vi.useRealTimers();});
describe('six football decisions with real outcomes',()=>{
 it('generates all six types naturally, with three distinct options each and eligible participants',()=>{
  const c=fresh(),f=c.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!,seen=new Set();
  for(let seed=1;seed<=35;seed++){const result=resolveMatch(f,c,random(seed));for(const m of result.report!.keyMoments!){seen.add(m.kind);const ids=fixtureLineup(result,m.clubId,m.minute-1);for(const id of [m.actorId,m.receiverId,m.alternateId,m.supportId])expect(ids.slice(1)).toContain(id);}}
  expect([...seen].sort()).toEqual([...momentKinds].sort());for(const kind of momentKinds){expect(momentOptions[kind]).toHaveLength(3);expect(new Set(momentOptions[kind].map(o=>o.title)).size).toBe(3);}
 },15000);
 it('uses different football profiles for all three approaches, with goals and failed chances possible in every situation',()=>{
  for(const kind of momentKinds){const c=scenario(kind),f=managedFixture(c)!,m=activeDecision(c)!;const profiles=([0,1,2] as const).map(option=>assessMoment(f,c,m,option));expect(new Set(profiles.map(p=>JSON.stringify(p))).size).toBe(3);
   let goals=0,failures=0;for(let i=0;i<120;i++)for(const option of [0,1,2] as const){const r=resolveMoment(f,c,{...m,id:`sample-${kind}-${i}`},option);if(r.moment.outcome==='goal')goals++;else failures++;expect(r.event?.xG??0).toBeLessThan(1);}
   expect(goals).toBeGreaterThan(0);expect(failures).toBeGreaterThan(0);
  }
 },15000);
 it('responds to individual skills, keeper movement, pressure and positional familiarity',()=>{
  const c=scenario('penalty'),f=managedFixture(c)!,m=activeDecision(c)!,actor=c.players.find(p=>p.id===m.actorId)!,bad={...actor,real:{...actor.real!,attributes:{...actor.real!.attributes,finishing:20,shotPower:20,composure:20}}};
  const limited={...c,players:c.players.map(p=>p.id===actor.id?bad:p)};expect(assessMoment(f,c,m,0).conversion).toBeGreaterThan(assessMoment(f,limited,m,0).conversion);
  expect(assessMoment(f,c,{...m,keeperApproach:'committing'},2).conversion).toBeGreaterThan(assessMoment(f,c,{...m,keeperApproach:'set'},2).conversion);
  const one={...m,kind:'one-on-one' as const};expect(assessMoment(f,c,{...one,keeperApproach:'advancing'},2).conversion).toBeGreaterThan(assessMoment(f,c,{...one,keeperApproach:'set'},2).conversion);
  const touch={...m,kind:'big-chance' as const};expect(assessMoment(f,c,{...touch,pressure:'closing'},1).completion).toBeLessThan(assessMoment(f,c,{...touch,pressure:'space'},1).completion);
 });
 it('stops before the chance, applies exactly one choice, and preserves other chances, past events and fixtures',()=>{
  const c=scenario('big-chance'),m=activeDecision(c)!,f=managedFixture(c)!,running={...c,pending:{...c.pending!,paused:false}};expect(advancePlayback(running).pending!.minute).toBe(m.minute-1);expect(advancePlayback(running).pending!.paused).toBe(true);
  const before=f.report!.events.filter(e=>e.momentId!==m.id),chosen=chooseKeyMoment(c,m.id,2),after=managedFixture(chosen)!;
  expect(after.report!.events.filter(e=>e.momentId!==m.id)).toEqual(before);expect(after.report!.keyMoments!.find(x=>x.id===m.id)!.selection).toBe(2);expect(chosen.pending!.decisionFeedback).toBe(m.id);
  for(const other of c.pending!.fixtures.filter(x=>x.id!==f.id))expect(chosen.pending!.fixtures.find(x=>x.id===other.id)).toBe(other);
  expect(chooseKeyMoment(chosen,m.id,2)).toBe(chosen);expect(()=>chooseKeyMoment(chosen,m.id,0)).toThrow(/already/);expect(()=>chooseKeyMoment(c,'future',1)).toThrow(/current/);expect(()=>chooseKeyMoment(c,m.id,4 as 0)).toThrow(/three/);
 });
 it('credits the actual teammate, assists and goalkeeper saves, with no phantom shot from a failed delivery',()=>{
  const c=scenario('cross'),f=managedFixture(c)!,m=activeDecision(c)!;let goal,failed;
  for(let i=0;i<400;i++){const r=resolveMoment(f,c,{...m,id:`credit-${i}`},1);if(r.moment.outcome==='goal')goal=r;if(r.moment.outcome==='intercepted')failed=r;if(goal&&failed)break;}
  expect(goal!.event!.playerId).toBe(m.receiverId);expect(goal!.event!.assistId).toBe(m.actorId);expect(failed!.event).toBeUndefined();
  const chosen=chooseKeyMoment(c,m.id,1),match=managedFixture(chosen)!;for(const p of match.report!.performances){expect(p.goals).toBe(match.report!.events.filter(e=>e.playerId===p.playerId&&e.type==='goal').length);expect(p.assists).toBe(match.report!.events.filter(e=>e.assistId===p.playerId).length);}
  expect(match.report!.performances.reduce((sum,p)=>sum+p.minutes!,0)).toBe(1980);expect(match.homeGoals).toBe(match.report!.events.filter(e=>e.clubId===match.homeId&&e.type==='goal').length);
 });
 it('saves both the waiting decision and its result, including continued playback sidecars',()=>{
  let c=scenario(),m=activeDecision(c)!;saveCareer(c);expect(activeDecision(loadCareer().career!)!.id).toBe(m.id);
  c=chooseKeyMoment(c,m.id,1);saveCareer(c);expect(decisionFeedback(loadCareer().career!)!.selection).toBe(1);
  c=continueAfterDecision(c);saveCareer(c);const loaded=loadCareer().career!;expect(loaded).not.toBeNull();expect(loaded.pending!.decisionFeedback).toBeUndefined();expect(loaded.pending!.minute).toBe(c.pending!.minute);
  const skipped=skipToFullTime(loaded);saveCareer(skipped);expect(loadCareer().career!.pending!.decisionMode).toBe('automatic');expect(loadCareer().career!.pending!.minute).toBe(90);
 },20000);
 it('gives automatic watching and Quick Sim identical reports and skips remaining choices without rerolling or changing selected ones',()=>{
  const c=fresh(),watch=prepareWeek(c),quick=prepareWeek(c,false),automatic=prepareWeek({...c,interactiveMoments:false});expect(watch.pending!.fixtures).toEqual(quick.pending!.fixtures);expect(automatic.pending!.decisionMode).toBe('automatic');expect(automatic.pending!.fixtures).toEqual(quick.pending!.fixtures);
  const s=scenario(),m=activeDecision(s)!,chosen=continueAfterDecision(chooseKeyMoment(s,m.id,2)),skip=skipToFullTime(chosen);expect(skip.pending!.fixtures).toBe(chosen.pending!.fixtures);expect(()=>chooseKeyMoment(skip,m.id,0)).toThrow(/live/);
  const done=commitWeek(skip);expect(done.week).toBe(1);expect(commitWeek(done)).toBe(done);
 });
 it('preserves a chosen result when later substitutions regenerate the remaining match',()=>{
  let c=scenario('big-chance');const m=activeDecision(c)!;c=continueAfterDecision(chooseKeyMoment(c,m.id,0));const f=managedFixture(c)!,bench=(f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)!;
  const onId=bench.find(id=>c.players.find(p=>p.id===id)!.position!=='GK')!,offId=fixtureLineup(f,c.clubId,c.pending!.minute)[9];
  const subbed=makeLiveSubstitution(c,offId,onId),after=managedFixture(subbed)!;
  expect(after.report!.events.filter(e=>e.minute<=c.pending!.minute)).toEqual(f.report!.events.filter(e=>e.minute<=c.pending!.minute));expect(after.report!.keyMoments!.find(x=>x.id===m.id)).toEqual(f.report!.keyMoments!.find(x=>x.id===m.id));
  saveCareer(subbed);expect(loadCareer().error).toBe('');
 });
 it('handles two chances at the same minute without revealing either result early',()=>{
  const c=scenario('big-chance'),f=managedFixture(c)!,m=activeDecision(c)!,second={...m,id:m.id+'-second',eventId:m.eventId+'-second'};
  const result=resolveMoment(f,c,second,second.autoChoice),events=[...f.report!.events,...(result.event?[result.event]:[])].sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
  const expanded=refreshMatchStatistics({...f,report:{...f.report!,events,keyMoments:[...f.report!.keyMoments!,result.moment]}},c),state={...c,pending:{...c.pending!,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?expanded:x)}};
  const first=continueAfterDecision(chooseKeyMoment(state,m.id,0));expect(first.pending!.minute).toBe(m.minute-1);expect(activeDecision(first)!.id).toBe(second.id);
  const final=continueAfterDecision(chooseKeyMoment(first,second.id,1));expect(final.pending!.minute).toBe(m.minute);expect(visibleMatch(managedFixture(first)!,first.pending!.minute).events.some(e=>e.momentId===m.id||e.momentId===second.id)).toBe(false);
 });
 it('requires the 90th-minute decision before revealing full time and commits its outcome once',()=>{
  const c=scenario(),f=managedFixture(c)!,old=activeDecision(c)!,m={...old,minute:90},result=resolveMoment(f,c,m,m.autoChoice),events=f.report!.events.filter(e=>e.momentId!==m.id);if(result.event)events.push(result.event);events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
  const changed=refreshMatchStatistics({...f,report:{...f.report!,events,keyMoments:f.report!.keyMoments!.map(x=>x.id===m.id?result.moment:x)}},c),state={...c,pending:{...c.pending!,minute:89,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?changed:x)}};
  expect(activeDecision(state)!.minute).toBe(90);const chosen=chooseKeyMoment(state,m.id,1);expect(chosen.pending!.minute).toBe(89);saveCareer(chosen);expect(decisionFeedback(loadCareer().career!)!.minute).toBe(90);
  const complete=continueAfterDecision(chosen);expect(complete.pending!.minute).toBe(90);expect(activeDecision(complete)).toBeUndefined();expect(commitWeek(complete).week).toBe(1);
 },15000);
 it('rejects corrupt moment identities, options, outcomes and pending feedback while preserving old saves without moments',()=>{
  const c=scenario();for(const field of [{kind:'throw-in'},{selection:9},{outcome:'guaranteed'},{actorId:'missing'}]){const broken=structuredClone(c);Object.assign(managedFixture(broken)!.report!.keyMoments![0],field);localStorage.setItem(SAVE_KEY,JSON.stringify(broken));expect(loadCareer().career).toBeNull();}
  const bad={...c,pending:{...c.pending!,decisionFeedback:'unknown'}};localStorage.setItem(SAVE_KEY,JSON.stringify(bad));expect(loadCareer().career).toBeNull();
  const legacy=fresh();delete legacy.interactiveMoments;saveCareer(legacy);expect(loadCareer().career).toEqual(legacy);
 });
 it('shows drawing for set pieces, three actions for other moments, and no early outcome',()=>{
  for(const kind of momentKinds){const c=scenario(kind);const {unmount}=render(<KeyMomentDialog career={c} onUpdate={()=>{}}/>);expect(screen.getByRole('dialog',{name:momentTitles[kind]})).toBeTruthy();if(kind==='penalty'||kind==='free-kick'){expect(screen.getByRole('group',{name:'Shot aiming area'})).toBeTruthy();expect(document.querySelector('.moment-options')).toBeNull();}else for(const option of momentOptions[kind])expect(screen.getByRole('button',{name:new RegExp(option.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))})).toBeTruthy();expect(screen.queryByRole('dialog',{name:'The outcome'})).toBeNull();unmount();}
 });
 it('pauses the real Matchday timer, persists a choice and resumes after the result',()=>{
  vi.useFakeTimers();let latest:Career;const start=scenario('penalty');start.pending!.paused=false;
  function Harness(){const [c,setC]=useState(start);latest=c;return <Matchday career={c} onUpdate={setC} onStart={()=>{}} onCommit={()=>{}} onTactics={()=>{}}/>;}
  render(<Harness/>);expect(latest!.pending!.paused).toBe(true);const dialog=screen.getByRole('dialog',{name:'Penalty kick'});act(()=>vi.advanceTimersByTime(5000));expect(latest!.pending!.minute).toBe(start.pending!.minute);
  fireEvent.keyDown(within(dialog).getByRole('group',{name:'Shot aiming area'}),{key:'Enter'});fireEvent.click(within(dialog).getByRole('button',{name:'Take shot'}));expect(screen.getByRole('dialog',{name:'The outcome'})).toBeTruthy();expect(screen.getByRole('status')).toBeTruthy();act(()=>vi.advanceTimersByTime(1200));fireEvent.click(screen.getByRole('button',{name:'Continue match'}));expect(latest!.pending!.decisionFeedback).toBeUndefined();expect(latest!.pending!.minute).toBe(start.pending!.minute+1);
 });
});
