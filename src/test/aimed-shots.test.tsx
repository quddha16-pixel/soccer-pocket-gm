import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import type { AimedShot, Career, KeyMoment } from '../models';
import { newCareer, prepareWeek } from '../simulation/career';
import { activeDecision, continueAfterDecision, decisionFeedback, managedFixture, shootKeyMoment } from '../simulation/keyMoments';
import { refreshMatchStatistics } from '../simulation/match';
import { assessMoment, resolveMoment } from '../simulation/momentRules';
import { pathPosition, shotBall, shotGeometry, shotPathData, shotWall, validAimedShot } from '../simulation/shotGeometry';
import { loadCareer, saveCareer, SAVE_KEY } from '../storage';
import { KeyMomentDialog } from '../components/KeyMomentDialog';
import { makeLiveSubstitution } from '../simulation/substitutions';
import { fixtureLineup } from '../simulation/substitutionRules';

const straight:AimedShot={path:[shotBall,{x:.2,y:.15}]};
const curved:AimedShot={path:[shotBall,{x:.31,y:.73},{x:.27,y:.55},{x:.33,y:.30},{x:.70,y:.16}]};
const wide:AimedShot={path:[shotBall,{x:.98,y:.16}]};
function scenario(kind:'penalty'|'free-kick'='penalty'):Career {
 const c=prepareWeek(newCareer('Aim QA','elite','liverpool',23)),f=managedFixture(c)!,original=f.report!.keyMoments!.find(m=>m.clubId===c.clubId)!,m={...original,kind,autoChoice:0 as const};
 const result=resolveMoment(f,c,m,0),events=f.report!.events.filter(e=>e.momentId!==m.id);if(result.event)events.push(result.event);events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
 const resolved=refreshMatchStatistics({...f,report:{...f.report!,cornerTarget:undefined,events,keyMoments:f.report!.keyMoments!.map(x=>x.id===m.id?result.moment:x)}},c);
 return {...c,pending:{...c.pending!,minute:m.minute-1,paused:true,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?resolved:x)}};
}
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('drawn set-piece geometry and football outcomes',()=>{
 it('validates bounded real strokes, including misses, and rejects invalid or excessive paths',()=>{
  expect(validAimedShot(straight)).toBe(true);expect(validAimedShot(curved)).toBe(true);expect(validAimedShot(wide)).toBe(true);
  for(const path of [[],[shotBall],[shotBall,shotBall],[{x:0,y:0},{x:.3,y:.1}],[shotBall,{x:NaN,y:.1}],[shotBall,{x:1.1,y:.2}],[shotBall,{x:.1,y:.99}],Array.from({length:65},(_,i)=>i?straight.path[1]:shotBall)])expect(validAimedShot({path})).toBe(false);
 });
 it('replays the actual polyline rather than a straight chord and hits its exact endpoint',()=>{
  expect(shotPathData(curved.path)).toBe('M160.00 237.60 L99.20 197.10 L86.40 148.50 L105.60 81.00 L224.00 43.20');
  expect(pathPosition(curved.path,0)).toEqual(shotBall);expect(pathPosition(curved.path,1)).toEqual(curved.path.at(-1));
  expect(pathPosition(curved.path,.5).x).toBeLessThan(.4);expect(pathPosition([],1)).toEqual(shotBall);
 });
 it('distinguishes goal corners, off-target strokes, and curves around the free-kick wall',()=>{
  expect(shotGeometry(straight).inside).toBe(true);expect(shotGeometry(wide).inside).toBe(false);
  expect(shotGeometry({path:[shotBall,{x:.5,y:.28}]}).wallAt).toBeDefined();expect(shotGeometry(curved).wallAt).toBeUndefined();
  const c=scenario('free-kick'),f=managedFixture(c)!,m=activeDecision(c)!;
  expect(assessMoment(f,c,{...m,shot:curved},0).completion).toBe(1);expect(assessMoment(f,c,{...m,shot:{path:[shotBall,{x:.5,y:.28}]}},0).completion).toBeLessThan(1);
 });
 it('uses player and keeper skills, allows goals and saves, and never guarantees a goal for a corner aim',()=>{
  const c=scenario(),f=managedFixture(c)!,m=activeDecision(c)!,actor=c.players.find(p=>p.id===m.actorId)!,keeper=c.players.find(p=>p.id===m.keeperId)!;
  const weak={...c,players:c.players.map(p=>p.id===actor.id?{...p,real:{...p.real!,attributes:{...p.real!.attributes,finishing:15,composure:15}}}:p)},strongKeeper={...c,players:c.players.map(p=>p.id===keeper.id?{...p,real:{...p.real!,attributes:{...p.real!.attributes,diving:99,reflexes:99,handling:99,gkPositioning:99}}}:p)};
  const base=assessMoment(f,c,{...m,shot:straight},1).conversion;expect(base).toBeGreaterThan(assessMoment(f,weak,{...m,shot:straight},1).conversion);expect(base).toBeGreaterThan(assessMoment(f,strongKeeper,{...m,shot:straight},1).conversion);expect(base).toBeLessThan(1);
  const outcomes=new Set();for(let i=0;i<100;i++)outcomes.add(resolveMoment(f,c,{...m,id:`aim-${i}`,shot:straight},1).moment.outcome);expect(outcomes).toContain('goal');expect(outcomes).toContain('saved');expect(outcomes).not.toContain('wide');
 });
 it('makes an off-goal endpoint miss and records no phantom assist or save',()=>{
  const c=scenario(),m=activeDecision(c)!,chosen=shootKeyMoment(c,m.id,wide),f=managedFixture(chosen)!,event=f.report!.events.find(e=>e.momentId===m.id)!;
  expect(decisionFeedback(chosen)!.outcome).toBe('wide');expect(event.type).toBe('shot');expect(event.onTarget).toBe(false);expect(event.xG).toBe(0);expect(event.assistId).toBeUndefined();
  expect(f.report!.performances.find(p=>p.playerId===m.keeperId)!.saves).toBe(f.report!.events.filter(e=>e.clubId===c.clubId&&e.onTarget&&e.type==='shot').length);
 });
 it('can block a straight free kick at the wall, with a replay stop on the authored line and no phantom shot',()=>{
  const c=scenario('free-kick'),f=managedFixture(c)!,m=activeDecision(c)!,shot={path:[shotBall,{x:.5,y:.20}]};let blocked:KeyMoment|undefined;
  for(let i=0;i<100;i++){const r=resolveMoment(f,c,{...m,id:`wall-${i}`,shot},0);if(r.moment.outcome==='blocked'){blocked=r.moment;expect(r.event).toBeUndefined();break;}}
  expect(blocked).toBeDefined();const geometry=shotGeometry(shot),stop=pathPosition(shot.path,geometry.wallAt!);expect(stop.x).toBe(.5);expect(stop.y).toBeGreaterThan(shotWall.top);expect(stop.y).toBeLessThanOrEqual(shotWall.bottom);
 });
 it('locks the drawn path and outcome once and leaves other chances and fixtures untouched',()=>{
  const c=scenario(),m=activeDecision(c)!,f=managedFixture(c)!,before=structuredClone(c),chosen=shootKeyMoment(c,m.id,curved),resolved=managedFixture(chosen)!;
  expect(c).toEqual(before);expect(decisionFeedback(chosen)!.shot).toEqual(curved);expect(shootKeyMoment(chosen,m.id,curved)).toBe(chosen);expect(()=>shootKeyMoment(chosen,m.id,straight)).toThrow(/already/);
  expect(resolved.report!.events.filter(e=>e.momentId!==m.id)).toEqual(f.report!.events.filter(e=>e.momentId!==m.id));
  for(const other of c.pending!.fixtures.filter(x=>x.id!==f.id))expect(chosen.pending!.fixtures.find(x=>x.id===other.id)).toBe(other);
 });
 it('saves and reloads exact paths/results and keeps them through later substitutions',()=>{
  let c=scenario();const m=activeDecision(c)!;c=shootKeyMoment(c,m.id,curved);saveCareer(c);const loaded=loadCareer().career!;expect(loaded).not.toBeNull();expect(decisionFeedback(loaded)!.shot).toEqual(curved);expect(decisionFeedback(loaded)!.outcome).toBe(decisionFeedback(c)!.outcome);
  c=continueAfterDecision(loaded);const f=managedFixture(c)!,bench=(f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)!,on=bench.find(id=>c.players.find(p=>p.id===id)!.position!=='GK')!,off=fixtureLineup(f,c.clubId,c.pending!.minute)[9];
  const changed=makeLiveSubstitution(c,off,on);expect(managedFixture(changed)!.report!.keyMoments!.find(x=>x.id===m.id)!.shot).toEqual(curved);saveCareer(changed);expect(loadCareer().error).toBe('');
 });
 it('rejects corrupted shots and attempts to draw non-set-piece moments',()=>{
  const c=scenario(),m=activeDecision(c)!,chosen=shootKeyMoment(c,m.id,curved);
  for(const path of [[],[shotBall,{x:2,y:.2}],Array.from({length:100},()=>shotBall)]){const bad=structuredClone(chosen);decisionFeedback(bad)!.shot={path};localStorage.setItem(SAVE_KEY,JSON.stringify(bad));expect(loadCareer().career).toBeNull();}
  const bad=structuredClone(c);activeDecision(bad)!.kind='corner';expect(()=>shootKeyMoment(bad,m.id,curved)).toThrow(/valid shot/);expect(()=>shootKeyMoment(c,m.id,{path:[]})).toThrow(/valid shot/);
 });
});
describe('simulation coaching replaces the set-piece mini-game',()=>{
 it('offers three coaching actions for both set pieces without aiming or shooting controls',()=>{
  for(const kind of ['penalty','free-kick'] as const){const c=scenario(kind),m=activeDecision(c)!,actor=c.players.find(p=>p.id===m.actorId)!,keeper=c.players.find(p=>p.id===m.keeperId)!;const {unmount}=render(<KeyMomentDialog career={c} onUpdate={()=>{}}/>);expect(screen.getByText(actor.name)).toBeTruthy();expect(screen.getByText(keeper.name)).toBeTruthy();expect(document.querySelectorAll('.moment-options>button')).toHaveLength(3);expect(screen.queryByRole('group',{name:'Shot aiming area'})).toBeNull();expect(screen.queryByRole('button',{name:'Take shot'})).toBeNull();unmount();}
 });
 it('still replays a previously saved drawn shot and continues without changing its recorded outcome',async()=>{
  const c=scenario(),start=shootKeyMoment(c,activeDecision(c)!.id,curved);let latest:Career;vi.stubGlobal('matchMedia',()=>({matches:true}));function Harness(){const[c,setC]=useState(start);latest=c;return <KeyMomentDialog career={c} onUpdate={setC}/>;}render(<Harness/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Continue match'}) as HTMLButtonElement).disabled).toBe(false));expect(decisionFeedback(latest!)!.shot).toEqual(curved);expect(within(screen.getByRole('dialog',{name:'The outcome'})).getByTestId('shot-ball').getAttribute('data-y')).toBe('0.1600');fireEvent.click(screen.getByRole('button',{name:'Continue match'}));expect(latest!.pending!.decisionFeedback).toBeUndefined();
 });
});
