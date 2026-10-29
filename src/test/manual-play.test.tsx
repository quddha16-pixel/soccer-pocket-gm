import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Career } from '../models';
import { newCareer, commitWeek } from '../simulation/career';
import { attackDirection, createManualState, manualContext, manualMinute, stepManual, startSecondHalf, manualMovement } from '../simulation/manualEngine';
import { prepareManualMatch, snapshotManual, resumeManualMatch, validManualState, takeManualSetPiece, continueManualSetPiece, finishManualWithAssistant } from '../simulation/manualCareer';
import type { ManualInput, ManualState } from '../simulation/manualModels';
import { loadCareer, saveCareer, saveManualProgress, SAVE_KEY } from '../storage';
import { makeLiveSubstitution } from '../simulation/substitutions';
import { buildFamiliarity, pairKey } from '../simulation/chemistry';
import { Matchday } from '../components/Matchday';

const fresh=()=>prepareManualMatch(newCareer('Player coach','elite','liverpool',23,'developer'),180);
const fixture=(c:Career)=>c.pending!.fixtures.find(f=>f.id===c.pending!.manual!.fixtureId)!;
function setupShot(){const c=fresh(),s=structuredClone(c.pending!.manual!),user=s.actors.find(a=>a.clubId===c.clubId&&a.slot===9)!;s.restart=0;user.x=34;user.y=15;s.controlledId=user.id;s.ball={...s.ball,x:34,y:15,ownerId:user.id,lastClubId:user.clubId,lastPlayerId:user.id};for(const a of s.actors)if(a.clubId!==c.clubId){a.x=5;a.y=2;}return {c,s,user};}
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
describe('authoritative full-contest manual football',()=>{
 it('starts with 22 real players and zero preselected goals, preserving the other nine fixtures',()=>{
  const c=fresh(),f=fixture(c);expect(c.pending!.manual!.actors).toHaveLength(22);expect(new Set(c.pending!.manual!.actors.map(a=>a.id)).size).toBe(22);expect(f.homeGoals).toBe(0);expect(f.awayGoals).toBe(0);expect(f.report!.events).toEqual([]);expect(c.pending!.fixtures.filter(x=>x.id!==f.id)).toHaveLength(9);expect(validManualState(c)).toBe(true);expect(commitWeek(c)).toBe(c);
 });
 it('moves the selected player with analogue input and uses different speed/stamina profiles',()=>{
  const c=fresh(),ctx=manualContext(c);let s=structuredClone(c.pending!.manual!);s.restart=0;const id=s.controlledId,before=s.actors.find(a=>a.id===id)!;const x=before.x;for(let i=0;i<30;i++)s=stepManual(s,c,{x:1,y:0},1/30,ctx);expect(s.actors.find(a=>a.id===id)!.x).toBeGreaterThan(x+2);expect(s.actors.find(a=>a.id===id)!.energy).toBeLessThan(before.energy);
  const p=c.players.find(p=>p.id===id)!;expect(manualMovement(p,100)).toBeGreaterThan(manualMovement(p,40));expect(manualMovement({...p,real:{...p.real!,attributes:{...p.real!.attributes,sprintSpeed:99,acceleration:99}}},100)).toBeGreaterThan(manualMovement({...p,real:{...p.real!,attributes:{...p.real!.attributes,sprintSpeed:10,acceleration:10}}},100));
 });
 it('launches an actual ball from pass input and credits a completed pass only on a teammate reception',()=>{
  const {c,s,user}=setupShot(),ctx=manualContext(c);user.y=60;s.ball.y=60;const target=s.actors.find(a=>a.clubId===c.clubId&&a.slot===6)!;target.x=34;target.y=46;let next=stepManual(s,c,{x:0,y:-1,pass:true},1/30,ctx);expect(next.ball.flight?.kind).toBe('pass');expect(next.stats[user.id].attempted).toBe(1);expect(next.stats[user.id].completed).toBe(0);
  for(let i=0;i<120&&next.ball.flight;i++)next=stepManual(next,c,{x:0,y:0},1/30,ctx);expect(next.stats[user.id].completed).toBe(1);expect(next.ball.ownerId).toBeDefined();expect(next.combinations.length).toBeGreaterThan(0);
 });
 it('scores only after a physical shot crosses the opposing goal and records the actual shooter',()=>{
  const {c,s,user}=setupShot(),ctx=manualContext(c);let next=stepManual(s,c,{x:0,y:0,shoot:.7},1/30,ctx);expect(next.events).toHaveLength(1);expect(next.events[0].type).toBe('shot');for(let i=0;i<90&&!next.events.some(e=>e.type==='goal');i++)next=stepManual(next,c,{x:0,y:0},1/30,ctx);expect(next.events[0].type).toBe('goal');expect(next.events[0].playerId).toBe(user.id);expect(next.events[0].clubId).toBe(c.clubId);const snapshot=snapshotManual(c,next,true);expect(fixture(snapshot).awayGoals).toBe(1);expect(validManualState(snapshot)).toBe(true);
 });
 it('lets a correctly positioned keeper save, instead of a button guaranteeing a goal',()=>{
  const {c,s}=setupShot(),ctx=manualContext(c),keeper=s.actors.find(a=>a.clubId!==c.clubId&&a.slot===0)!;keeper.x=34;keeper.y=4;let next=stepManual(s,c,{x:0,y:0,shoot:.4},1/30,ctx);for(let i=0;i<90&&next.ball.flight;i++)next=stepManual(next,c,{x:0,y:0},1/30,ctx);expect(next.events[0].type).toBe('shot');expect(next.ball.ownerId===keeper.id||next.ball.ownerId===undefined).toBe(true);const snapshot=snapshotManual(c,next,true);expect(fixture(snapshot).report!.performances.find(p=>p.playerId===keeper.id)!.saves).toBe(1);
 });
 it('runs a whole ninety-minute contest with AI opposition, two halves, actual reports and one career commit',()=>{
  const c=fresh(),ctx=manualContext(c);let s=c.pending!.manual!;
  for(let tick=0;tick<6000&&s.phase!=='fulltime';tick++){
   if(s.phase==='halftime'){expect(manualMinute(s)).toBe(45);s=startSecondHalf(s,c,fixture(c));expect(attackDirection(s,c.clubId)).toBe(1);}
   if(s.setPiece){s=continueManualSetPiece(takeManualSetPiece(snapshotManual(c,s,true))).pending!.manual!;}
   const controlled=s.actors.find(a=>a.id===s.controlledId)!,owns=s.ball.ownerId===controlled.id,dir=attackDirection(s,c.clubId),input:ManualInput={x:(34-controlled.x)/30,y:dir};
   if(owns&&controlled.slot===0)input.pass=true;else if(owns&&Math.abs(controlled.y-(dir<0?0:105))<24&&tick%12===0)input.shoot=.6;
   s=stepManual(s,c,input,1/30,ctx);
  }
  expect(s.phase).toBe('fulltime');expect(manualMinute(s)).toBe(90);expect(s.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y))).toBe(true);expect(s.events.length).toBeGreaterThan(0);
  const full=snapshotManual(c,s,true);expect(validManualState(full)).toBe(true);saveCareer(full);expect(loadCareer().error).toBe('');const own=fixture(full),others=c.pending!.fixtures.filter(f=>f.id!==own.id);const committed=commitWeek(full);expect(committed.week).toBe(1);expect(committed.fixtures.find(f=>f.id===own.id)).toEqual(own);for(const other of others)expect(committed.fixtures.find(f=>f.id===other.id)).toEqual(other);expect(commitWeek(committed)).toBe(committed);console.log(`Manual contest: ${own.homeGoals}–${own.awayGoals}, ${s.events.length} shots, ${Object.values(s.stats).reduce((n,p)=>n+p.completed,0)} completed passes`);
 },20000);
 it('keeps scheduled and manual substitutions within the same five-player and three-window rules',()=>{
  let c=fresh(),s=structuredClone(c.pending!.manual!);s.elapsed=62/90*s.duration;s.half=2;s.restart=0;c=snapshotManual(c,s,true);const f=fixture(c),bench=(f.homeId===c.clubId?f.report!.homeBench:f.report!.awayBench)!,on=bench.find(id=>c.players.find(p=>p.id===id)!.position!=='GK')!;c=makeLiveSubstitution(c,c.lineup[9],on);expect(fixture(c).report!.substitutions!.some(x=>x.onId===on)).toBe(true);s=c.pending!.manual!;const ctx=manualContext(c);for(let i=0;i<65;i++)s=stepManual(s,c,{x:0,y:0},1/30,ctx);expect(s.actors.some(a=>a.id===on)).toBe(true);expect(s.actors.some(a=>a.id===c.lineup[9])).toBe(false);for(const event of c.pending!.manual!.events)expect(s.events).toContainEqual(event);
 });
 it('recovers a live checkpoint without rerolling, resets controls on reload and rejects corrupt physical states',()=>{
  const c=fresh(),ctx=manualContext(c);let s=c.pending!.manual!;for(let i=0;i<120;i++)s=stepManual(s,c,{x:1,y:0},1/30,ctx);saveCareer(c);saveManualProgress(c,s);const loaded=loadCareer().career!;expect(loaded.pending!.manual).toEqual(s);expect(loaded.pending!.paused).toBe(true);expect(loaded.pending!.minute).toBe(manualMinute(s));
  const bad=structuredClone(c);bad.pending!.manual!.actors[0].x=Infinity;localStorage.setItem(SAVE_KEY,JSON.stringify(bad));localStorage.removeItem(`${SAVE_KEY}-manual`);expect(loadCareer().career).toBeNull();
 });
 it('rewards real forward combinations within an overlap cap and never applies them twice',()=>{
  const c=fresh(),s=structuredClone(c.pending!.manual!),a=c.lineup[5],b=c.lineup[6];s.elapsed=s.duration;s.phase='fulltime';s.half=2;s.combinations=[{a,b,passes:14,last:100}];const full=snapshotManual(c,s,true),normal=buildFamiliarity({...full,pending:{...full.pending!,fixtures:full.pending!.fixtures.map(f=>({...f,report:{...f.report!,manualLinks:undefined}}))}}),bonus=buildFamiliarity(full);expect(bonus.pairs[pairKey(a,b)]-normal.pairs[pairKey(a,b)]).toBeCloseTo(.35);const done=commitWeek(full);expect(commitWeek(done)).toBe(done);
 });
 it('hands off remaining minutes while preserving actual goals, combinations and the other fixtures',()=>{
  const {c,s}=setupShot(),ctx=manualContext(c);let next=stepManual(s,c,{x:0,y:0,shoot:.7},1/30,ctx);for(let i=0;i<90&&!next.events.some(e=>e.type==='goal');i++)next=stepManual(next,c,{x:0,y:0},1/30,ctx);const snap=snapshotManual(c,next,true),result=finishManualWithAssistant(snap),f=result.pending!.fixtures.find(f=>f.id===next.fixtureId)!;expect(result.pending!.minute).toBe(90);expect(result.pending!.manual).toBeUndefined();for(const e of next.events)expect(f.report!.events).toContainEqual(e);for(const other of snap.pending!.fixtures.filter(f=>f.id!==next.fixtureId))expect(result.pending!.fixtures.find(f=>f.id===other.id)).toBe(other);expect(f.report!.manualMinutes).toBeGreaterThan(0);saveCareer(result);expect(loadCareer().error).toBe('');expect(commitWeek(result).week).toBe(1);
 });
 it('offers Watch and Quick Sim without a direct-control mode',()=>{
  const c=newCareer('UI','elite','liverpool',23);let changed:Career|undefined,watch:boolean|undefined,manual=false;render(<Matchday career={c} onUpdate={next=>{changed=next;}} onStart={value=>{watch=value;}} onCommit={()=>{}} onTactics={()=>{}} onManual={()=>{manual=true;}}/>);expect(screen.queryByRole('button',{name:'Play Match'})).toBeNull();expect(screen.getByRole('button',{name:'Watch Match'})).toBeTruthy();expect(screen.getByRole('button',{name:'Quick Sim'})).toBeTruthy();expect(screen.queryByLabelText('Manual match length')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Watch Match'}));expect(changed?.playableHighlights).toBe(false);expect(watch).toBe(true);expect(manual).toBe(false);
 });
});
