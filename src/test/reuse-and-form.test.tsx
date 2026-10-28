import { useState } from 'react';
import { afterEach,describe,it,expect } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import type { Career,Performance } from '../models';
import { newCareer,prepareWeek,commitWeek } from '../simulation/career';
import { nextMatchPlan } from '../simulation/substitutionRules';
import { setMatchPlan } from '../simulation/substitutions';
import { previewSubstitutionPlan,recentSubstitutionPlans,rememberCompletedSubstitutions,reuseSubstitutionPlan,saveSubstitutionPlan } from '../simulation/recentSubs';
import { playerFormReport } from '../simulation/playerForm';
import { identity } from '../simulation/identity';
import { lineupFit } from '../simulation/management';
import { rolloverSeason } from '../simulation/worldTick';
import { loadCareer,saveCareer,SAVE_KEY } from '../storage';
import { SubstitutionsPanel } from '../components/SubstitutionsPanel';
import { PlayerFormCard } from '../components/PlayerFormCard';
const fresh=()=>newCareer('Repeat coach','elite','liverpool',37);
function planned(){const c=fresh(),plan=nextMatchPlan(c),on=plan.bench.map(id=>c.players.find(p=>p.id===id)!).find(p=>p.position==='ST')!,off=c.lineup[9];return setMatchPlan(c,{...plan,changes:[{clubId:c.clubId,onId:on.id,offId:off,minute:60}]});}
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
describe('reusable substitution plans',()=>{
 it('saves a plan, reuses names and times in one action, and leaves lineup, ownership and finances intact',()=>{
  const c=saveSubstitutionPlan(planned()),recent=recentSubstitutionPlans(c);expect(recent).toHaveLength(1);
  const ready={...c,matchPlan:undefined},reused=reuseSubstitutionPlan(ready,recent[0].id);expect(reused.matchPlan!.changes).toEqual(c.matchPlan!.changes);expect(reused.players).toBe(c.players);expect(reused.lineup).toBe(c.lineup);expect(reused.world).toBe(c.world);
  saveCareer(reused);expect(loadCareer().career!.recentSubPlans).toEqual(c.recentSubPlans);
 });
 it('automatically remembers completed plans once and recovers plans from pre-feature match reports',()=>{
  const p=prepareWeek(planned(),false);expect(rememberCompletedSubstitutions({...p,pending:{...p.pending!,minute:0}})).toHaveLength(0);
  const done=commitWeek(p);expect(done.recentSubPlans).toHaveLength(1);expect(commitWeek(done)).toBe(done);expect(done.recentSubPlans![0].source).toBe('match');
  const legacy={...done,recentSubPlans:undefined};expect(recentSubstitutionPlans(legacy)).toHaveLength(1);expect(recentSubstitutionPlans(legacy)[0].changes[0].minute).toBe(60);
 });
 it('skips injured, transferred and already-starting incoming players without clearing an existing plan',()=>{
  const c=saveSubstitutionPlan(planned()),id=c.recentSubPlans![0].id,on=c.matchPlan!.changes[0].onId;
  for(const players of [c.players.map(p=>p.id===on?{...p,identity:{...identity(p),injuryWeeks:3}}:p),c.players.map(p=>p.id===on?{...p,clubId:'arsenal'}:p)]){
   const changed={...c,players},preview=previewSubstitutionPlan(changed,id);expect(preview.plan.changes).toHaveLength(0);expect(preview.skipped).toHaveLength(1);expect(()=>reuseSubstitutionPlan(changed,id)).toThrow(/unchanged/);expect(changed.matchPlan).toBe(c.matchPlan);
  }
  const lineup=[...c.lineup];[lineup[9],lineup[10]]=[on,lineup[9]];expect(previewSubstitutionPlan({...c,lineup},id).plan.changes).toHaveLength(0);
 });
 it('rechecks goalkeeper roles, current starting choices and pending/full-time locks',()=>{
  const c=saveSubstitutionPlan(planned()),id=c.recentSubPlans![0].id,on=c.matchPlan!.changes[0].onId,changed={...c,players:c.players.map(p=>p.id===on?{...p,position:'GK' as const}:p)};
  expect(previewSubstitutionPlan(changed,id).plan.changes).toHaveLength(0);expect(()=>reuseSubstitutionPlan(prepareWeek(c),id)).toThrow(/before kickoff/);expect(()=>saveSubstitutionPlan(prepareWeek(c))).toThrow(/before kickoff/);
 });
 it('deduplicates repeated instructions, caps recent history and carries it across season rollover',()=>{
  let c=planned();for(let i=0;i<7;i++){const change={...c.matchPlan!.changes[0],minute:50+i};c=saveSubstitutionPlan({...c,week:i,matchPlan:{...c.matchPlan!,changes:[change]}});}expect(c.recentSubPlans).toHaveLength(5);
  const latest=c.recentSubPlans![0],same=saveSubstitutionPlan({...c,matchPlan:{bench:latest.bench,changes:latest.changes}});expect(same.recentSubPlans).toHaveLength(5);
  const completed={...same,week:38,status:'survived' as const,fixtures:same.fixtures.map(f=>({...f,homeGoals:1,awayGoals:1}))};const next=rolloverSeason(completed);expect(next.world.season).toBe(2027);expect(next.recentSubPlans).toEqual(same.recentSubPlans);
 });
 it('rejects malformed saved plans while allowing stale but valid historical player IDs',()=>{
  const c=saveSubstitutionPlan(planned());saveCareer(c);expect(loadCareer().error).toBe('');
  const broken=structuredClone(c);broken.recentSubPlans![0].changes[0].onId='missing';localStorage.setItem(SAVE_KEY,JSON.stringify(broken));expect(loadCareer().career).toBeNull();
 });
 it('exposes one-tap reuse and explicit saving in the substitution sheet',()=>{
  function Harness(){const [c,setC]=useState(()=>({...saveSubstitutionPlan(planned()),matchPlan:undefined} as Career));return <SubstitutionsPanel career={c} onUpdate={setC}/>;}
  render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Reuse most recent subs'}));expect(screen.getByRole('status').textContent).toContain('Applied 1 of 1');fireEvent.click(screen.getByRole('button',{name:'Set your subs'}));expect((screen.getByLabelText('Substitution minute') as HTMLInputElement).value).toBe('60');fireEvent.click(screen.getByRole('button',{name:'Save this plan for reuse'}));expect(screen.getByRole('status').textContent).toContain('saved for reuse');
 });
});

function formCareer(){
 const c=fresh(),bench=c.players.find(p=>p.clubId===c.clubId&&!c.lineup.includes(p.id)&&p.position==='CM'&&lineupFit(p,c.formation,6)>=.85)!,ids=[bench.id,c.lineup[9],c.lineup[8],c.lineup[6],c.lineup[1],c.lineup[2]],ratings=[8.7,8.2,7.8,5.4,5.8,6.1];
 const fixtures=c.fixtures.map(f=>{if(f.week>3||![f.homeId,f.awayId].includes(c.clubId))return f;const performances:Performance[]=ids.map((playerId,i)=>({playerId,clubId:c.clubId,rating:ratings[i],minutes:i===0?60:90,goals:0,assists:0,shots:0,saves:0,tackles:0}));return {...f,homeGoals:0,awayGoals:0,report:{events:[],performances,homePossession:50,motmId:ids[0]}};});
 return {c:{...c,week:3,fixtures},ids,bench};
}
describe('Home player-form report',()=>{
 it('shows the best and lowest three by actual average, with a suitable bench candidate suggested for a struggling starter',()=>{
  const {c,ids,bench}=formCareer(),r=playerFormReport(c);expect(r.best.map(s=>s.player.id)).toEqual(ids.slice(0,3));expect(r.worst.map(s=>s.player.id)).toEqual(ids.slice(3));expect(r.best[0].average).toBeCloseTo(8.7);expect(r.best[0].advice).toMatch(/Consider a start/);expect(r.worst[0].advice).toContain(bench.name);expect(r.rows.every(s=>!s.early)).toBe(true);
 });
 it('weights by minutes, excludes zero-minute and pending reports, and ignores appearances at other clubs',()=>{
  const {c,ids}=formCareer();let n=0;const fixtures=c.fixtures.map(f=>{if(!f.report)return f;const index=n++;return {...f,report:{...f.report,performances:[{...f.report.performances[0],rating:index===0?6:10,minutes:index===0?90:index===1?10:0},{...f.report.performances[1],clubId:'arsenal',rating:10}]}};});
  const state={...c,fixtures,pending:prepareWeek(fresh()).pending},r=playerFormReport(state);expect(r.rows).toHaveLength(1);expect(r.rows[0].player.id).toBe(ids[0]);expect(r.rows[0].average).toBeCloseTo(6.4);expect(r.rows[0].minutes).toBe(100);expect(r.rows[0].appearances).toBe(2);expect(r.rows[0].early).toBe(true);
 });
 it('handles legacy full-match records and avoids ranking unused or departed players',()=>{
  const {c,ids}=formCareer(),fixtures=c.fixtures.map(f=>!f.report?f:{...f,report:{...f.report,performances:f.report.performances.map(({minutes,...p})=>p)}}),players=c.players.map(p=>p.id===ids[0]?{...p,clubId:'arsenal'}:p),r=playerFormReport({...c,fixtures,players});
  expect(r.rows).toHaveLength(5);expect(r.rows.every(s=>s.minutes===270)).toBe(true);expect(new Set([...r.best,...r.worst].map(s=>s.player.id)).size).toBe(5);
 });
 it('warns about small samples, injuries, fatigue and unfamiliar positions instead of blindly recommending changes',()=>{
  const {c,ids}=formCareer(),early=playerFormReport({...c,week:1});expect(early.rows.every(r=>r.advice.includes('Early sample'))).toBe(true);
  const players=c.players.map(p=>p.id===ids[0]?{...p,identity:{...identity(p),injuryWeeks:2}}:p.id===ids[1]?{...p,fitness:70}:p),r=playerFormReport({...c,players});expect(r.rows.find(r=>r.player.id===ids[0])!.advice).toMatch(/Injured/);expect(r.rows.find(r=>r.player.id===ids[1])!.advice).toMatch(/recovery/);
  const lineup=[...c.lineup];[lineup[6],lineup[2]]=[lineup[2],lineup[6]];expect(playerFormReport({...c,lineup}).rows.find(r=>r.player.id===ids[3])!.advice).toMatch(/natural position/);
 });
 it('renders an empty state before games and profile/lineup actions once evidence exists',()=>{
  const empty=render(<PlayerFormCard career={fresh()}/>);expect(screen.getByText(/Play a match to reveal/)).toBeTruthy();empty.unmount();let profile='',squad=false;const {c,bench}=formCareer();render(<PlayerFormCard career={c} onProfile={id=>{profile=id;}} onSquad={()=>{squad=true;}}/>);
  expect(screen.getByRole('heading',{name:'Best 3 averages'})).toBeTruthy();expect(screen.getByRole('heading',{name:'Lowest 3 averages'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:`View ${bench.name} profile`}));expect(profile).toBe(bench.id);fireEvent.click(screen.getByRole('button',{name:'Review starting XI'}));expect(squad).toBe(true);
 });
});
