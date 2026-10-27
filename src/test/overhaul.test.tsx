import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { clubs } from '../data/clubs';
import type { Career, Performance } from '../models';
import { newCareer, prepareWeek, commitWeek, advance } from '../simulation/career';
import { autoLineup, assignPlayer, changeFormation, formations, validLineup, mostValuable, valuation, eligibleStars } from '../simulation/management';
import { dashboard } from '../simulation/dashboard';
import { attackWeight, resolveMatch, selectMotm } from '../simulation/match';
import { random } from '../simulation/random';
import { decodeSave } from '../simulation/codec';
import { loadCareer, saveCareer, SAVE_KEY } from '../storage';
import { Matchday, playbackInterval, visibleMatch } from '../components/Matchday';
import App from '../App';
const career=()=>newCareer('Jamie Test','unknown','hull',1234);
afterEach(()=>{cleanup();localStorage.clear();vi.useRealTimers();});
describe('management',()=>{
 it('supports three formations, valid automatic lineups and duplicate-free swaps',()=>{
 let c=career();for(const formation of formations){c=changeFormation(c,formation);expect(c.formation).toBe(formation);expect(validLineup(c.players,c.clubId,c.lineup)).toBe(true);}
 const first=c.lineup[9],second=c.lineup[10];c=assignPlayer(c,9,second);expect(c.lineup[10]).toBe(first);expect(new Set(c.lineup).size).toBe(11);
 const keeper=c.lineup[0];expect(assignPlayer(c,9,keeper)).toBe(c);
 const other=c.players.find(p=>p.clubId!==c.clubId)!;expect(assignPlayer(c,9,other.id)).toBe(c);
 const pending=prepareWeek(c);expect(changeFormation(pending,'4-3-3')).toBe(pending);expect(assignPlayer(pending,9,first)).toBe(pending);
 });
 it('ranks the top three dynamically, using supplied values and derived valuations',()=>{
 const c=career(),players=c.players.map(p=>p.id===c.lineup[0]?{...p,transferValue:999e6}:p);
 const top=mostValuable(players,c.clubId);expect(top).toHaveLength(3);expect(top[0].id).toBe(c.lineup[0]);expect(valuation(top[1])).toBeGreaterThanOrEqual(valuation(top[2]));
 expect(mostValuable(players.filter(p=>p.id!==top[0].id),c.clubId)[0].id).not.toBe(top[0].id);
 });
 it('Feed Your Star channels real shots toward the designated player without certain goals',()=>{
 const c=career();c.starId=eligibleStars(c).find(p=>p.position==='ST')!.id;
 const star=c.players.find(p=>p.id===c.starId)!;expect(attackWeight(star,c.starId,'feed-star')).toBeGreaterThan(attackWeight(star,c.starId,'balanced'));
 const fixture=c.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!;
 let fed=0,normal=0,zero=0;
 for(let seed=1;seed<=160;seed++){
 const a=resolveMatch(fixture,c,random(seed)),b=resolveMatch(fixture,{...c,tactic:'feed-star'},random(seed));
 normal+=a.report!.events.filter(e=>e.playerId===c.starId).length;fed+=b.report!.events.filter(e=>e.playerId===c.starId).length;
 if(!b.report!.events.some(e=>e.playerId===c.starId&&e.type==='goal'))zero++;
 }
 expect(fed).toBeGreaterThan(normal*1.5);expect(zero).toBeGreaterThan(10);
 });
 it('formation and assigned players affect match resolution',()=>{
 const c=career(),f=c.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!;
 const changed=changeFormation(c,'4-4-2');expect(resolveMatch(f,c,random(5))).not.toEqual(resolveMatch(f,changed,random(5)));
 });
});
describe('dashboard and reports',()=>{
 it('uses completed fixtures and actual contributions for dashboard metrics',()=>{
 const c=advance(advance(career())),d=dashboard(c);expect(d.row.played).toBe(2);expect(d.row.won+d.row.drawn+d.row.lost).toBe(2);expect(d.recent).toHaveLength(2);
 expect(d.row.gf).toBe(d.recent.reduce((s,r)=>s+r.gf,0));expect(d.row.ga).toBe(d.recent.reduce((s,r)=>s+r.ga,0));expect(d.squad).toHaveLength(24);
 const goals=c.fixtures.flatMap(f=>f.report?.performances??[]).filter(p=>p.clubId===c.clubId).reduce((s,p)=>s+p.goals,0);expect(goals).toBe(d.row.gf);
 });
 it('calculates winning and unbeaten streaks from the actual ordered results',()=>{
 const c=career(),fixtures=[...c.fixtures];let i=0;for(const f of fixtures){if([f.homeId,f.awayId].includes(c.clubId)&&i<3){f.homeGoals=f.homeId===c.clubId?2:0;f.awayGoals=f.awayId===c.clubId?2:0;i++;}}
 const d=dashboard({...c,fixtures});expect(d.winning).toBe(3);expect(d.unbeaten).toBe(3);
 });
 it('awards MoM from either side, including a goalkeeper on the losing team',()=>{
 const p=(playerId:string,clubId:string,rating:number):Performance=>({playerId,clubId,rating,goals:0,assists:0,shots:0,saves:0,tackles:0});
 expect(selectMotm([p('home','a',8.3),{...p('away-keeper','b',9.1),saves:9}])).toBe('away-keeper');
 expect(selectMotm([p('home','a',9.5),p('away','b',7)])).toBe('home');
 const c=advance(career());const sides=new Set<string>();let losingAwards=0;
 for(let seed=0;seed<120;seed++){
  const base=career(),fixture=base.fixtures.find(f=>[f.homeId,f.awayId].includes(base.clubId))!,f=resolveMatch(fixture,base,random(seed));
  const winner=f.report!.performances.find(p=>p.playerId===f.report!.motmId)!;sides.add(winner.clubId);
  if((winner.clubId===f.homeId&&f.homeGoals!<f.awayGoals!)||(winner.clubId===f.awayId&&f.awayGoals!<f.homeGoals!))losingAwards++;
 }
 expect(sides.size).toBe(2);expect(losingAwards).toBeGreaterThan(0);
 for(const f of c.fixtures.filter(f=>f.week===1)){
 expect(f.report!.performances.some(p=>p.playerId===f.report!.motmId)).toBe(true);
 expect(f.report!.events.filter(e=>e.type==='goal'&&e.clubId===f.homeId)).toHaveLength(f.homeGoals!);
 expect(visibleMatch(f,90).homeGoals).toBe(f.homeGoals);
 }
 });
});
describe('matchweek integrity and persistence',()=>{
 it('resolves once, preserves outcomes through speeds and reload, and commits once',()=>{
 const c=career(),watch=prepareWeek(c,true),quick=prepareWeek(c,false);
 expect(watch.pending!.fixtures).toEqual(quick.pending!.fixtures);expect(prepareWeek(watch)).toBe(watch);expect(commitWeek(watch)).toBe(watch);
 for(const speed of [1,2,4] as const){const playback={...watch,pending:{...watch.pending!,speed,minute:90}};saveCareer(playback);const loaded=loadCareer().career!;expect(loaded.pending!.fixtures).toEqual(watch.pending!.fixtures);const committed=commitWeek(loaded);expect(committed.week).toBe(1);expect(committed.fixtures.filter(f=>f.homeGoals!==undefined)).toHaveLength(10);expect(commitWeek(committed,1)).toBe(committed);}
 });
 it('migrates version-1 saves without changing completed results or players',()=>{
 const old=advance(career());const legacy={version:1,manager:old.manager,reputation:old.reputation,clubId:old.clubId,players:old.players,fixtures:old.fixtures.map(({report,...f})=>f),week:old.week,tactic:old.tactic,status:old.status,seed:old.seed};
 localStorage.setItem(SAVE_KEY,JSON.stringify(legacy));const loaded=loadCareer();expect(loaded.error).toBe('');expect(loaded.career!.version).toBe(3);expect(loaded.career!.players).toEqual(legacy.players);expect(loaded.career!.fixtures).toEqual(legacy.fixtures);expect(loaded.career!.statsStartWeek).toBe(2);expect(validLineup(loaded.career!.players,old.clubId,loaded.career!.lineup)).toBe(true);
 saveCareer(loaded.career!);expect(JSON.parse(decodeSave(localStorage.getItem(`${SAVE_KEY}-backup-v1`)!))).toEqual(legacy);
 });
 it('round trips formation, star and lineup changes and rejects invalid pending state',()=>{
 let c=changeFormation(career(),'4-2-3-1');c={...c,tactic:'feed-star'};saveCareer(c);expect(loadCareer().career).toEqual(c);
 c=prepareWeek(c);c.pending!.week=12;saveCareer(c);expect(loadCareer().career).toBeNull();
 });
});
describe('playback and navigation',()=>{
 it('changes the clock interval for 1×, 2× and 4× while retaining the resolved outcome',()=>{
 vi.useFakeTimers();const resolved=prepareWeek(career());let latest=resolved;
 function Harness(){const [c,set]=useState(resolved);latest=c;return <Matchday career={c} onUpdate={set} onStart={()=>{}} onCommit={()=>{}} onTactics={()=>{}}/>;}
 render(<Harness/>);const original=resolved.pending!.fixtures;
 act(()=>vi.advanceTimersByTime(playbackInterval(1)));expect(latest.pending!.minute).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:'2×'}));act(()=>vi.advanceTimersByTime(299));expect(latest.pending!.minute).toBe(1);act(()=>vi.advanceTimersByTime(1));expect(latest.pending!.minute).toBe(2);
 fireEvent.click(screen.getByRole('button',{name:'4×'}));act(()=>vi.advanceTimersByTime(150));expect(latest.pending!.minute).toBe(3);
 fireEvent.click(screen.getByRole('button',{name:'Pause'}));act(()=>vi.advanceTimersByTime(10000));expect(latest.pending!.minute).toBe(3);
 expect(latest.pending!.fixtures).toEqual(original);
 });
 it('retains setup fields and correct previous screens without clearing a saved career',()=>{
 render(<App/>);fireEvent.click(screen.getByRole('button',{name:'START CAREER'}));fireEvent.change(screen.getByLabelText('Manager name'),{target:{value:'Saved Name'}});fireEvent.click(screen.getByRole('button',{name:'Find job offers'}));fireEvent.click(screen.getByRole('button',{name:'Back'}));expect((screen.getByLabelText('Manager name') as HTMLInputElement).value).toBe('Saved Name');
 cleanup();saveCareer(career());render(<App/>);fireEvent.click(screen.getByRole('button',{name:'CONTINUE CAREER'}));fireEvent.click(screen.getAllByRole('button',{name:'Tactics'})[0]);fireEvent.click(screen.getByRole('button',{name:'Back'}));expect(screen.getByRole('heading',{name:'Club overview'})).toBeTruthy();expect(loadCareer().career!.week).toBe(0);
 });
});
