import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {newCareer,prepareWeek,offers} from '../simulation/career';
import {activeDecision,managedFixture} from '../simulation/keyMoments';
import {createHighlight,highlightContext,stepHighlight,snapshotHighlight,validHighlight} from '../simulation/highlights';
import {resolveMatch} from '../simulation/match';
import {random} from '../simulation/random';
import {clubLegacyOpportunity,startingLegacyOpportunity,placementLegacy,settleLegacySeason} from '../simulation/legacy';
import {managerJobOffers} from '../simulation/managerJobs';
import {clubs} from '../data/clubs';
import {LegacyOpportunity} from '../components/LegacyOpportunity';
import {loadCareer,saveCareer} from '../storage';
import type {Career} from '../models';
import type {HighlightState} from '../simulation/highlightModels';
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
function chance(){let c=prepareWeek({...newCareer('Breakaway QA','elite','liverpool',23),playableHighlights:true});const f=managedFixture(c)!,m=f.report!.keyMoments!.find(m=>m.kind==='one-on-one'&&m.clubId===c.clubId)!;c={...c,pending:{...c.pending!,minute:m.minute-1,paused:true,fixtures:c.pending!.fixtures.map(x=>x.id===f.id?{...x,report:{...x.report!,keyMoments:x.report!.keyMoments!.map(k=>k.minute===m.minute&&k.id!==m.id?{...k,selection:k.autoChoice}:k)}}:x)}};const s:HighlightState={...createHighlight(c,m),phase:'playing'};s.defenders.forEach((d,i)=>{d.x=3;d.y=i?36:4;});return {c,m,s,ctx:highlightContext(c,m)};}
function completed(c:Career):Career{return {...c,week:38,status:'survived',fixtures:c.fixtures.map(f=>({...f,homeGoals:f.homeId===c.clubId?1:0,awayGoals:f.awayId===c.clubId?1:0}))};}
describe('more frequent, responsive one-on-one opportunities',()=>{
 it('surfaces more existing chances, with regular one-on-ones, finite limits and deterministic reports',()=>{
  const c=newCareer('Frequency QA','elite','everton',23),f=c.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!;let choices=0,breaks=0;
  for(let seed=1;seed<=50;seed++){const game=resolveMatch(f,c,random(seed)),moments=game.report!.keyMoments!;choices+=moments.filter(m=>m.clubId===c.clubId&&m.kind!=='corner').length;breaks+=moments.filter(m=>m.clubId===c.clubId&&m.kind==='one-on-one').length;expect(moments.length).toBeLessThanOrEqual(40);expect(new Set(moments.map(m=>m.eventId)).size).toBe(moments.length);if(seed===1)expect(resolveMatch(f,c,random(seed))).toEqual(game);}
  expect(choices/50).toBeGreaterThan(5);expect(breaks/50).toBeGreaterThan(1);
 },15000);
 it('advances the keeper to narrow the angle rather than leaving him on the line',()=>{const{c,m,s,ctx}=chance();s.attackers[0].x=47;s.ball.x=47;let next=s;for(let i=0;i<90;i++)next=stepHighlight(next,{x:0,y:0},1/120,ctx);expect(next.keeper.x).toBeLessThan(56);expect(next.phase).toBe('playing');expect(validHighlight(snapshotHighlight(c,next))).toBe(true);expect(activeDecision(c)!.id).toBe(m.id);});
 it('makes aimed placement and rounding the keeper affect the actual chance',()=>{
  const{ctx,s}=chance();const shoot=(aim:number,rounded=false)=>{const state=structuredClone(s);state.aimY=aim;state.attackers[0].x=50;state.keeper.x=rounded?47:56;return stepHighlight(state,{x:0,y:0,shoot:.65},1/120,ctx).ball.flight!.result!.xG;};
  expect(shoot(.95)).toBeGreaterThan(shoot(0));expect(shoot(0,true)).toBeGreaterThan(shoot(0));expect(shoot(.95)).toBeLessThan(1);
 });
 it('rewards a chip against a rushing keeper, animates the loft and reloads the exact flight',()=>{
  const{c,s,ctx}=chance(),deep=structuredClone(s),rush=structuredClone(s);rush.keeper.x=51;
  const a=stepHighlight(deep,{x:0,y:0,shoot:.65,chip:true},1/120,ctx),b=stepHighlight(rush,{x:0,y:0,shoot:.65,chip:true},1/120,ctx);expect(b.ball.flight!.result!.xG).toBeGreaterThan(a.ball.flight!.result!.xG);expect(b.ball.flight!.loft).toBe(2.5);
  let flight=b;for(let i=0;i<40;i++)flight=stepHighlight(flight,{x:0,y:0},1/120,ctx);expect(flight.ball.z).toBeGreaterThan(1);saveCareer(snapshotHighlight(c,flight));const loaded=loadCareer();expect(loaded.error).toBe('');expect(loaded.career!.pending!.highlight!.ball).toEqual(flight.ball);
 },15000);
});
describe('club access and honest legacy forecasts',()=>{
 it('opens smaller and European clubs to established managers, reserving title favourites for elite standing',()=>{
  expect(offers('established')).toHaveLength(17);expect(offers('established').some(c=>c.id==='hull')).toBe(true);expect(offers('established').some(c=>c.id==='chelsea')).toBe(true);expect(offers('established').some(c=>c.id==='city')).toBe(false);expect(offers('elite')).toHaveLength(20);
  const c=completed(newCareer('Established','established','chelsea',23));c.legacy!.settledSeasons=[2026];const jobs=managerJobOffers(c);expect(jobs.filter(o=>o.available).length).toBeGreaterThanOrEqual(17);expect(jobs.some(o=>!o.available)).toBe(true);expect(jobs.find(o=>o.clubId==='chelsea')!.available).toBe(true);
 });
 it('uses the real settlement rules for every starting club, including the underdog bonus',()=>{
  for(const club of clubs){const c=newCareer('Forecast','elite',club.id,23),p=startingLegacyOpportunity(club.id);expect(p.target).toBe(c.legacy!.baseline.target);expect(p).toEqual({...clubLegacyOpportunity(c,club.id),estimated:false});const settled=settleLegacySeason(completed(c));const placement=settled.legacy!.entries.filter(e=>!['award','conduct'].includes(e.kind)&&!['unbeaten','century'].some(k=>e.id.endsWith(`:${k}`)));expect(placement.reduce((n,e)=>n+e.points,0)).toBe(p.title);}
  expect(startingLegacyOpportunity('hull').title).toBeGreaterThan(startingLegacyOpportunity('city').title);
 });
 it('does not advertise repeat first-title or rebuild points, and shows deductions for missing a target',()=>{
  const c=newCareer('Repeat','elite','hull',23);c.legacy!.entries.push({id:'2026:hull:champion',season:2026,clubId:'hull',points:500,reason:'Champion',kind:'title'});const p=clubLegacyOpportunity(c,'hull');expect(p.breakdown.some(r=>['new-champion','rebuild'].includes(r.key))).toBe(false);expect(startingLegacyOpportunity('city').survival).toBeLessThan(0);expect(placementLegacy(17,20,true,true).reduce((n,r)=>n+r.points,0)).toBe(-310);
  render(<LegacyOpportunity projection={p}/>);expect(screen.getByRole('group',{name:'Club legacy point potential'})).toBeTruthy();expect(screen.getByRole('img').getAttribute('aria-label')).toContain(`${p.title} points`);expect(screen.getByText(/not a signing reward/)).toBeTruthy();
 });
});
