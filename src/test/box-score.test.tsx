import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Career } from '../models';
import { newCareer, prepareWeek, commitWeek, advance } from '../simulation/career';
import { buildBoxScore, findBoxScore, packBoxScore, unpackBoxScore, validArchivedBoxScore } from '../simulation/boxScore';
import { managedFixture } from '../simulation/keyMoments';
import { nextMatchPlan } from '../simulation/substitutionRules';
import { setMatchPlan } from '../simulation/substitutions';
import { rolloverSeason } from '../simulation/worldTick';
import { saveCareer, loadCareer, SAVE_KEY } from '../storage';
import { BoxScoreDialog } from '../components/BoxScore';
import { FixtureList } from '../components/Fixtures';
import { LeagueScreen } from '../components/LeagueScreen';
import { clubById } from '../data/clubs';
import App from '../App';

afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
const fresh=()=>newCareer('Box QA','elite','liverpool',23);
function played(){
 let c=fresh();const plan=nextMatchPlan(c),on=plan.bench.find(id=>c.players.find(p=>p.id===id)!.position==='GK')!;
 c=setMatchPlan(c,{...plan,changes:[{clubId:c.clubId,offId:c.lineup[0],onId:on,minute:60}]});
 return commitWeek(prepareWeek(c,false));
}
function completed(c=played()):Career{return {...c,week:38,status:'survived',fixtures:c.fixtures.map(f=>f.homeGoals!==undefined?f:{...f,homeGoals:f.homeId===c.clubId?1:0,awayGoals:f.awayId===c.clubId?1:0})};}

// Round-trip/UI integration checks serialize full rosters and multiple match reports.
describe('individual match box-score data',()=>{
 it('accounts for every participant and named sub with actual goals, shots, chances and goalkeeper minutes',()=>{
  const c=played(),f=c.fixtures.find(f=>f.week===1&&[f.homeId,f.awayId].includes(c.clubId))!,b=buildBoxScore(f,c)!,r=f.report!;
  expect(b.home).toHaveLength(20);expect(b.away).toHaveLength(20);expect(b.home.reduce((n,p)=>n+p.goals,0)).toBe(f.homeGoals);expect(b.away.reduce((n,p)=>n+p.goals,0)).toBe(f.awayGoals);
  for(const [clubId,rows] of [[f.homeId,b.home],[f.awayId,b.away]] as const){expect(rows.reduce((n,p)=>n+p.minutes,0)).toBe(990);expect(rows.reduce((n,p)=>n+p.shots,0)).toBe(r.events.filter(e=>e.clubId===clubId).length);expect(rows.reduce((n,p)=>n+p.onTarget,0)).toBe(r.events.filter(e=>e.clubId===clubId&&e.onTarget).length);for(const p of rows){expect(p.chances).toBe(r.events.filter(e=>e.creatorId===p.playerId).length);if(p.minutes===0){expect(p.rating).toBeNull();expect(p.entered).toBeNull();}}}
  const own=f.homeId===c.clubId?b.home:b.away;expect(own.find(p=>p.playerId===c.lineup[0])!.minutes).toBe(60);expect(own.filter(p=>p.position==='GK'&&p.minutes>0).map(p=>p.minutes).sort()).toEqual([30,60]);expect(b.motmId).toBe(r.motmId);
 });
 it('exposes all ten completed fixtures but hides pending/future reports until full time',()=>{
  const c=prepareWeek(fresh()),f=managedFixture(c)!;expect(findBoxScore(c,c.world.season,f.id)).toBeUndefined();expect(findBoxScore({...c,pending:{...c.pending!,minute:90}},c.world.season,f.id)!.box).toBeDefined();
  const done=commitWeek({...c,pending:{...c.pending!,minute:90}});for(const match of done.fixtures.filter(f=>f.week===1))expect(findBoxScore(done,2026,match.id)!.box).toBeDefined();expect(findBoxScore(done,2026,done.fixtures.find(f=>f.week===2)!.id)).toBeUndefined();
 });
 it('does not reassign old performances when a player moves clubs and retains recorded roles',()=>{
  const c=played(),f=c.fixtures.find(f=>f.report)!,b=buildBoxScore(f,c)!,id=b.home[0].playerId;
  const changed={...c,players:c.players.map(p=>p.id===id?{...p,clubId:f.awayId}:p)};expect(buildBoxScore(f,changed)).toEqual(b);
 });
 it('packs, archives and reloads individual games without retaining replay events',()=>{
  const c=completed(),f=c.fixtures.find(f=>f.report)!,b=buildBoxScore(f,c)!,packed=packBoxScore(b);expect(unpackBoxScore(packed)).toEqual(b);expect(validArchivedBoxScore(packed,f,new Set(c.players.map(p=>p.id)))).toBe(true);
  const next=rolloverSeason(c);expect(next.world.history[0].boxScores![f.id]).toEqual(packed);expect(next.world.history[0].results!.find(x=>x.id===f.id)).not.toHaveProperty('report');expect(findBoxScore(next,2026,f.id)!.box).toEqual(b);
  saveCareer(next);expect(loadCareer().error).toBe('');expect(findBoxScore(loadCareer().career!,2026,f.id)!.box).toEqual(b);expect(loadCareer().career).toEqual(next);
  const archived=structuredClone(next.world.history),finance=structuredClone(next.world.finances);const progressed=advance(next);expect(progressed.world.history).toEqual(archived);expect(next.world.history).toEqual(archived);expect(next.world.finances).toEqual(finance);expect(progressed.world.history).not.toBe(next.world.history);expect(progressed.world.finances).not.toBe(next.world.finances);
 },15000);
 it('handles old reports with no benches or minute metadata and older archives without individual data',()=>{
  const c=played(),f=c.fixtures.find(f=>f.report)!,legacy={...f,report:{...f.report!,substitutions:undefined,homeBench:undefined,awayBench:undefined,homeLineup:undefined,awayLineup:undefined,performances:f.report!.performances.map(({minutes,entered,exited,...p})=>p)}};
  const b=buildBoxScore(legacy,c)!;expect(b.home.every(p=>p.minutes===90)).toBe(true);expect(b.away.every(p=>p.minutes===90)).toBe(true);
  const old=rolloverSeason(completed());delete old.world.history[0].boxScores;const match=old.world.history[0].results![0];expect(findBoxScore(old,2026,match.id)!.box).toBeUndefined();saveCareer(old);expect(loadCareer().error).toBe('');
 });
 it('rejects malformed archived rows, duplicate players, invalid minutes and missing fixture references',()=>{
  const c=rolloverSeason(completed()),fixture=c.world.history[0].results!.find(f=>c.world.history[0].boxScores![f.id])!,id=fixture.id;
  for(const mutate of [(x:Career)=>{x.world.history[0].boxScores![id].h[0][2]=900;},(x:Career)=>{x.world.history[0].boxScores![id].h[1]=x.world.history[0].boxScores![id].h[0];},(x:Career)=>{x.world.history[0].boxScores![id].p=101;},(x:Career)=>{x.world.history[0].boxScores!.invented=x.world.history[0].boxScores![id];}]){const broken=structuredClone(c);mutate(broken);localStorage.setItem(SAVE_KEY,JSON.stringify(broken));expect(loadCareer().career).toBeNull();}
 });
});

describe('one-team box-score UI and every-game access',()=>{
 it('shows logo tabs and only one club, expands every recorded stat and switches with keyboard or tap',()=>{
  const c=played(),f=c.fixtures.find(f=>f.report)!,b=buildBoxScore(f,c)!;render(<BoxScoreDialog career={c} season={2026} fixtureId={f.id} onClose={()=>{}}/>);
  const home=screen.getByRole('tab',{name:`${clubById(f.homeId).name} stats`}),away=screen.getByRole('tab',{name:`${clubById(f.awayId).name} stats`});fireEvent.click(home);expect(home.getAttribute('aria-selected')).toBe('true');expect(document.querySelectorAll('.box-player-table tbody')).toHaveLength(20);expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  const player=c.players.find(p=>p.id===b.home[0].playerId)!;fireEvent.click(screen.getByRole('button',{name:`Show stats for ${player.name}`}));const detail=document.getElementById(screen.getByRole('button',{name:`Hide stats for ${player.name}`}).getAttribute('aria-controls')!)!;expect(within(detail).getByText('Goals conceded')).toBeTruthy();expect(within(detail).getByText('Chances created')).toBeTruthy();
  fireEvent.keyDown(home,{key:'ArrowRight'});expect(away.getAttribute('aria-selected')).toBe('true');expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(away.id);expect(screen.queryByRole('button',{name:`Hide stats for ${player.name}`})).toBeNull();
 });
 it('opens a box score for each finished fixture and none for an unplayed fixture',()=>{
  const c=played();let id='';render(<FixtureList fixtures={c.fixtures.filter(f=>f.week<=2)} selected={c.clubId} onBoxScore={f=>{id=f.id;}}/>);expect(screen.getAllByRole('button',{name:/Box score:/})).toHaveLength(10);fireEvent.click(screen.getAllByRole('button',{name:/Box score:/})[4]);expect(id).toBe(c.fixtures.filter(f=>f.week===1)[4].id);
 });
 it('opens an archived fixture using its own season and explicitly labels missing old statistics',()=>{
  const c=rolloverSeason(completed()),f=c.world.history[0].results![0];let selected:{id:string;year:number}|undefined;
  render(<LeagueScreen career={c} onProfile={()=>{}} onBoxScore={(id,year)=>{selected={id,year};}}/>);fireEvent.click(screen.getByRole('button',{name:'Fixtures'}));fireEvent.change(screen.getByLabelText('Fixture season'),{target:{value:'2026'}});fireEvent.click(screen.getAllByRole('button',{name:/Box score:/})[0]);expect(selected).toEqual({id:f.id,year:2026});cleanup();
  delete c.world.history[0].boxScores;render(<BoxScoreDialog career={c} season={2026} fixtureId={f.id} onClose={()=>{}}/>);expect(screen.getByText(/Individual stats unavailable/)).toBeTruthy();
 });
 it('reviews another game from the actual matchweek-results dialog and returns to the same results',()=>{
  const c=prepareWeek(fresh(),false);saveCareer(c);render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Continue career'}));fireEvent.click(screen.getByRole('button',{name:'Finish matchweek & view results'}));
  const results=screen.getByRole('dialog',{name:'Matchweek 1 results'});expect(within(results).getAllByRole('button',{name:/Box score:/})).toHaveLength(10);fireEvent.click(within(results).getAllByRole('button',{name:/Box score:/})[6]);expect(screen.getByRole('dialog',{name:'Match box score'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Close box score'}));expect(screen.getByRole('dialog',{name:'Matchweek 1 results'})).toBeTruthy();
 },15000);
});
