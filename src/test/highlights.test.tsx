import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { newCareer, prepareWeek, commitWeek } from '../simulation/career';
import { activeDecision, chooseKeyMoment, continueAfterDecision, managedFixture, skipToFullTime } from '../simulation/keyMoments';
import { resolveMoment } from '../simulation/momentRules';
import { refreshMatchStatistics } from '../simulation/match';
import { fixtureLineup } from '../simulation/substitutionRules';
import { createHighlight, playableMoment, highlightContext, stepHighlight, snapshotHighlight, completeHighlight, validHighlight } from '../simulation/highlights';
import { hash } from '../simulation/identity';
import type { Career, MomentKind } from '../models';
import type { HighlightState } from '../simulation/highlightModels';
import { saveCareer, loadCareer, SAVE_KEY } from '../storage';
import { makeLiveSubstitution } from '../simulation/substitutions';
import { KeyMomentDialog } from '../components/KeyMomentDialog';

function scenario(kind:MomentKind='one-on-one'):Career{
 const c=prepareWeek({...newCareer('Highlight coach','elite','liverpool',23),playableHighlights:true}),f=managedFixture(c)!,old=f.report!.keyMoments!.find(m=>m.clubId===c.clubId)!,own=fixtureLineup(f,c.clubId,old.minute-1),other=fixtureLineup(f,c.clubId===f.homeId?f.awayId:f.homeId,old.minute-1);
 const m={...old,kind,pressure:'space' as const,actorId:own[9],receiverId:own[10],alternateId:own[8],supportId:own[6],keeperId:other[0]},result=resolveMoment(f,c,m,m.autoChoice),events=f.report!.events.filter(e=>e.momentId!==m.id);if(result.event)events.push(result.event);
 const updated=refreshMatchStatistics({...f,report:{...f.report!,cornerTarget:undefined,events:events.sort((a,b)=>a.minute-b.minute),keyMoments:f.report!.keyMoments!.map(x=>x.id===m.id?result.moment:x)}},c);
 return {...c,pending:{...c.pending!,minute:m.minute-1,paused:true,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?updated:x)}};
}
function play(c:Career):HighlightState{const s=createHighlight(c,activeDecision(c)!);return {...s,phase:'playing' as const};}
function openLane(s:HighlightState){s.defenders=s.defenders.map((a,i)=>({...a,x:3,y:i?36:4}));return s;}
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();vi.useRealTimers();});
describe('simulated matches with playable attacking highlights',()=>{
 it('plays one-on-ones and corners while retaining coaching decisions for crosses and other chances',()=>{
  for(const kind of ['penalty','free-kick','big-chance','cross'] as const){const c=scenario(kind);expect(playableMoment(c,activeDecision(c)!)).toBe(false);}
  for(const kind of ['one-on-one','corner'] as const){const c=scenario(kind),m=activeDecision(c)!;expect(playableMoment(c,m)).toBe(true);expect(playableMoment({...c,playableHighlights:false},m)).toBe(false);}
 });
 it('starts a real 3-v-2 attack and keeper without replacing the other match events or fixtures',()=>{
  const c=scenario(),before=JSON.stringify(c),s=createHighlight(c,activeDecision(c)!);expect(s.attackers).toHaveLength(3);expect(s.defenders).toHaveLength(2);expect(s.keeper.id).toBe(activeDecision(c)!.keeperId);expect(s.phase).toBe('ready');expect(s.ball.ownerId).toBe(activeDecision(c)!.actorId);expect(JSON.stringify(c)).toBe(before);expect(validHighlight(snapshotHighlight(c,s))).toBe(true);
 });
 it('moves freely in two dimensions with individual pace, positional fit and a finite attack timer',()=>{
  const c=scenario(),ctx=highlightContext(c,activeDecision(c)!);let s=play(c),x=s.attackers[0].x,y=s.attackers[0].y;
  for(let i=0;i<30;i++)s=stepHighlight(s,{x:1,y:-1},1/30,ctx);expect(s.attackers[0].x).toBeGreaterThan(x+2);expect(s.attackers[0].y).toBeLessThan(y-2);expect(s.defenders[0].x).toBe(s.kind==='counter'?35:30);
  for(let i=0;i<700&&s.phase!=='finished';i++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);expect(s.phase).toBe('finished');expect(s.result?.outcome).not.toBe('goal');
 });
 it('passes into space, switches to the receiver and earns capped forward partnership credit',()=>{
  const c=scenario(),ctx=highlightContext(c,activeDecision(c)!);let s=openLane(play(c)),from=s.controlledId;s=stepHighlight(s,{x:1,y:-1,pass:true},1/30,ctx);expect(s.ball.flight?.kind).toBe('pass');expect(s.passes).toBe(0);
  for(let i=0;i<60&&s.ball.flight;i++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);expect(s.passes).toBe(1);expect(s.attempted).toBe(1);expect(s.controlledId).not.toBe(from);expect(s.ball.ownerId).toBe(s.controlledId);expect(s.links).toHaveLength(1);expect(s.links[0].a).toBe(from);
 });
 it('allows good chances to score, miss or be saved, with better finishing and closer positions rewarded',()=>{
  const c=scenario(),m=activeDecision(c)!,ctx=highlightContext(c,m),p=ctx.players.get(m.actorId)!,bad={...p,real:{...p.real!,attributes:{...p.real!.attributes,finishing:20,composure:20,shotPower:20}}},limited={...ctx,players:new Map(ctx.players).set(p.id,bad)};let goals=0,saves=0,misses=0;
  for(let i=0;i<200;i++){let s=openLane(play(c));s.rng=hash(`chance-${i}`);s.attackers[0].x=50;s.attackers[0].y=20;s.aimY=-.85;let first=stepHighlight(s,{x:0,y:0,shoot:.65},1/30,ctx),weak=stepHighlight(s,{x:0,y:0,shoot:.65},1/30,limited);expect(first.ball.flight!.result!.xG).toBeGreaterThan(weak.ball.flight!.result!.xG);
   for(let n=0;n<70&&first.phase!=='finished';n++)first=stepHighlight(first,{x:0,y:0},1/30,ctx);goals+=Number(first.result!.outcome==='goal');saves+=Number(first.result!.outcome==='saved');misses+=Number(first.result!.outcome==='wide');}
  expect(goals).toBeGreaterThan(70);expect(goals).toBeLessThan(180);expect(saves).toBeGreaterThan(0);expect(misses).toBeGreaterThan(0);console.log(`Open-lane 200-chance sample: ${goals} goals, ${saves} saves, ${misses} misses.`);
 });
 it('replaces only the played chance, records its actual scorer and preserves all other fixtures',()=>{
  const c=scenario(),m=activeDecision(c)!,ctx=highlightContext(c,m),f=managedFixture(c)!;let s=openLane(play(c));s.attackers[0].x=50;s=stepHighlight(s,{x:0,y:0,shoot:.65},1/30,ctx);for(let i=0;i<70&&s.phase!=='finished';i++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);
  const done=completeHighlight(c,s),report=managedFixture(done)!.report!;expect(done.pending!.highlight).toBeUndefined();expect(done.pending!.decisionFeedback).toBe(m.id);expect(report.keyMoments!.find(x=>x.id===m.id)!.highlight?.shooterId).toBe(s.result!.shooterId);expect(report.events.filter(e=>e.momentId!==m.id)).toEqual(f.report!.events.filter(e=>e.momentId!==m.id));for(const other of c.pending!.fixtures.filter(x=>x.id!==f.id))expect(done.pending!.fixtures.find(x=>x.id===other.id)).toBe(other);expect(()=>completeHighlight(done,s)).toThrow();expect(commitWeek(done)).toBe(done);
  saveCareer(done);expect(loadCareer().error).toBe('');const continued=continueAfterDecision(done);expect(continued.pending!.minute).toBe(m.minute);expect(commitWeek(skipToFullTime(continued)).week).toBe(1);
 });
 it('reloads a paused attack including live movement and ball flight, without rerolling it',()=>{
  const c=scenario(),ctx=highlightContext(c,activeDecision(c)!);let s=openLane(play(c));for(let i=0;i<40;i++)s=stepHighlight(s,{x:1,y:-.3},1/30,ctx);saveCareer(snapshotHighlight(c,s));s=stepHighlight(s,{x:0,y:0,pass:true},1/30,ctx);saveCareer(snapshotHighlight(c,s));const loaded=loadCareer();expect(loaded.error).toBe('');expect(loaded.career!.pending!.highlight).toEqual(s);expect(loaded.career!.pending!.paused).toBe(true);expect(validHighlight(loaded.career!)).toBe(true);
  const malformed={...s,elapsed:NaN};expect(validHighlight(snapshotHighlight(c,malformed))).toBe(false);expect(()=>makeLiveSubstitution(loaded.career!,'a','b')).toThrow(/highlight/);
 });
 it('keeps played highlights and earned partnerships when live substitutions regenerate later play',()=>{
  let c=scenario();const ctx=highlightContext(c,activeDecision(c)!);let s=openLane(play(c));s=stepHighlight(s,{x:1,y:-1,pass:true},1/30,ctx);for(let n=0;n<60&&s.ball.flight;n++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);s=stepHighlight(s,{x:0,y:0,shoot:.65},1/30,ctx);for(let n=0;n<90&&s.phase!=='finished';n++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);
  c=continueAfterDecision(completeHighlight(c,s));const f=managedFixture(c)!,before=JSON.stringify(c),links=f.report!.manualLinks!,moment=f.report!.keyMoments!.find(m=>m.id===s.momentId),bench=f.homeId===c.clubId?f.report!.homeBench!:f.report!.awayBench!,onId=bench.find(id=>c.players.find(p=>p.id===id)!.position!=='GK')!,offId=fixtureLineup(f,c.clubId,c.pending!.minute)[9];
  expect(links.length).toBeGreaterThan(0);const subbed=makeLiveSubstitution(c,offId,onId),after=managedFixture(subbed)!;expect(after.report!.manualLinks).toEqual(links);expect(after.report!.keyMoments!.find(m=>m.id===s.momentId)).toEqual(moment);expect(JSON.stringify(c)).toBe(before);saveCareer(subbed);expect(loadCareer().error).toBe('');
 });
 it('recovers the authoritative career when an interrupted highlight sidecar is corrupt',()=>{
  const c=scenario(),s=play(c),snapshot=snapshotHighlight(c,s);saveCareer(snapshot);
  localStorage.setItem(`${SAVE_KEY}-playback`,JSON.stringify({seed:c.seed,season:c.world.season,week:c.pending!.week,minute:c.pending!.minute,speed:1,paused:true,decisionMode:'interactive',highlight:{...s,attackers:[]}}));
  const loaded=loadCareer();expect(loaded.error).toBe('');expect(loaded.career!.pending!.highlight).toEqual(s);expect(loaded.career!.week).toBe(c.week);
 });
 it('keeps a v2.1 counter save active when an opponent corner shares its minute',()=>{
  let c=scenario();const m=activeDecision(c)!,s={...play(c),kind:'counter' as const},f=managedFixture(c)!,opponent=f.report!.keyMoments!.find(x=>x.kind==='corner'&&x.clubId!==c.clubId)!;
  const changed={...opponent,minute:m.minute},report={...f.report!,cornerTarget:undefined,keyMoments:[changed,...f.report!.keyMoments!.filter(x=>x.id!==opponent.id).map(x=>x.id===m.id?{...x,kind:'big-chance' as const}:x)],events:f.report!.events.map(e=>e.momentId===opponent.id?{...e,minute:m.minute}:e)};
  c={...c,pending:{...c.pending!,highlight:s,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?{...f,report}:x)}};expect(activeDecision(c)!.id).toBe(m.id);expect(validHighlight(c)).toBe(true);saveCareer(c);const loaded=loadCareer();expect(loaded.error).toBe('');expect(loaded.career!.pending!.highlight!.kind).toBe('counter');expect(activeDecision(loaded.career!)!.id).toBe(m.id);
 });
 it('keeps classic three-option decisions and drawn set pieces accessible',()=>{
  const c=scenario();const view=render(<KeyMomentDialog career={c} onUpdate={()=>{}}/>);expect(screen.getByRole('button',{name:'Play this attack'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Use three coaching options'}));expect(screen.getByRole('group',{name:'1 on 1 options'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Play this attack'})).toBeNull();view.unmount();
  for(const kind of ['penalty','free-kick','cross','big-chance'] as const){const c=scenario(kind),view=render(<KeyMomentDialog career={c} onUpdate={()=>{}}/>);if(['penalty','free-kick'].includes(kind))expect(screen.getByRole('group',{name:'Shot aiming area'})).toBeTruthy();else expect(document.querySelectorAll('.moment-options>button')).toHaveLength(3);view.unmount();}
 });
 it('lets users delegate the highlight once and returns to the simulated match',()=>{
  const c=scenario();let updated:Career|undefined;render(<KeyMomentDialog career={c} onUpdate={next=>{updated=next;}}/>);fireEvent.click(screen.getByRole('button',{name:'Let player decide'}));expect(updated!.pending!.manual).toBeUndefined();expect(updated!.pending!.highlight).toBeUndefined();expect(updated!.pending!.minute).toBe(activeDecision(c)!.minute);expect(managedFixture(updated!)!.report!.keyMoments!.find(m=>m.id===activeDecision(c)!.id)!.selection).toBeDefined();
 });
});
