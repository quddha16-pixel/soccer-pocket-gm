import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Career, Player } from '../models';
import { newCareer, prepareWeek } from '../simulation/career';
import { developmentTrend } from '../simulation/developmentTrend';
import { assignPlayer, lineupFit, validLineup } from '../simulation/management';
import { eligiblePlayers } from '../simulation/economy';
import { identity } from '../simulation/identity';
import { DepthChart } from '../components/DepthChart';
import { DevelopmentArrows } from '../components/DevelopmentArrows';
import { SquadScreen } from '../components/SquadScreen';
import { loadCareer, saveCareer } from '../storage';

const fresh=()=>newCareer('Depth QA','elite','liverpool',23,'developer');
afterEach(()=>{cleanup();localStorage.clear();});
describe('engine-based development arrows',()=>{
 it('distinguishes normal, fast and ultra growth without changing any player or the career',()=>{
  const c=fresh(),base=c.players.find(p=>p.id===c.lineup[7])!,snapshot=structuredClone(c);
  const model=(age:number,growth:number):Player=>({...base,age,potential:99,identity:{...identity(base),development:{...identity(base).development,tendency:'steady',growth},injuryWeeks:0}});
  const normal=developmentTrend(model(27,.7),c),fast=developmentTrend(model(22,.7),c),ultra=developmentTrend(model(17,2),c);
  expect(normal.direction).toBe('up');expect(normal.arrows).toBe(1);expect(fast.arrows).toBe(2);expect(ultra.arrows).toBe(3);expect(ultra.annual).toBeGreaterThan(fast.annual);expect(c).toEqual(snapshot);
 });
 it('shows normal/fast/ultra decline and stable capped or retired players',()=>{
  const c=fresh(),p=c.players.find(p=>p.clubId===c.clubId)!;
  const at=(age:number)=>developmentTrend({...p,age},c);
  expect(at(31).direction).toBe('down');expect(at(31).arrows).toBe(1);expect(at(34).arrows).toBe(2);expect(at(39).arrows).toBe(3);
  expect(developmentTrend({...p,age:25,potential:p.overall},c).arrows).toBe(0);
  expect(developmentTrend({...p,identity:{...identity(p),retired:true}},c).arrows).toBe(0);
 });
 it('responds to injuries, minutes and Developer coaching rather than assigning a club-wide arrow',()=>{
  const c=fresh(),p=c.players.find(p=>p.id===c.lineup[7])!,young={...p,age:20,potential:99},injured={...young,identity:{...identity(young),injuryWeeks:4}};
  expect(developmentTrend(young,c).annual).toBeGreaterThan(developmentTrend(injured,c).annual);
  expect(developmentTrend(young,c).annual).toBeGreaterThan(developmentTrend(young,{...c,managerStyle:'genius'}).annual);
  expect(developmentTrend(young,c).annual).toBeGreaterThan(developmentTrend(young,{...c,lineup:c.lineup.filter(id=>id!==p.id)}).annual);
  render(<DevelopmentArrows player={young} career={c}/>);expect(screen.getByRole('img',{name:/development.*Estimated/}).className).toContain('up');
 });
});
describe('positional depth chart edits the real starting XI',()=>{
 it('shows all eleven roles, ranks by positional effectiveness, and applies slider changes with unique players',()=>{
  let latest:Career;const start=fresh();function Harness(){const[c,setC]=useState(start);latest=c;return <DepthChart career={c} onChange={setC} onProfile={()=>{}}/>;}
  render(<Harness/>);expect(screen.getAllByRole('button',{name:/Depth for/})).toHaveLength(11);const candidates=eligiblePlayers(start,start.clubId).filter(p=>p.position!=='GK').sort((a,b)=>b.overall*lineupFit(b,start.formation,9)-a.overall*lineupFit(a,start.formation,9)||a.id.localeCompare(b.id));
  const reserveIndex=candidates.findIndex(p=>!start.lineup.includes(p.id));expect(reserveIndex).toBeGreaterThanOrEqual(0);fireEvent.change(screen.getByRole('slider'),{target:{value:reserveIndex}});
  expect(latest!.lineup[9]).toBe(candidates[reserveIndex].id);expect(new Set(latest!.lineup).size).toBe(11);expect(validLineup(eligiblePlayers(latest!,latest!.clubId),latest!.clubId,latest!.lineup)).toBe(true);expect(screen.getByRole('status').textContent).toContain('moves to rotation');
  saveCareer(latest!);expect(loadCareer().career!.lineup).toEqual(latest!.lineup);
 });
 it('swaps existing starters, filters injured/unregistered players and protects the goalkeeper',()=>{
  const c=fresh(),other=c.lineup[7],swapped=assignPlayer(c,9,other);expect(swapped.lineup[9]).toBe(other);expect(swapped.lineup[7]).toBe(c.lineup[9]);
  const reserve=c.players.find(p=>p.clubId===c.clubId&&!c.lineup.includes(p.id)&&p.position!=='GK')!;const injured={...c,players:c.players.map(p=>p.id===reserve.id?{...p,identity:{...identity(p),injuryWeeks:3}}:p)};
  render(<DepthChart career={injured} onChange={()=>{}} onProfile={()=>{}}/>);expect(screen.queryByRole('button',{name:`Start ${reserve.name} at ST slot 10`})).toBeNull();fireEvent.change(screen.getByLabelText('Depth chart position'),{target:{value:0}});
  const cards=document.querySelectorAll('.depth-candidates .depth-profile');expect(cards.length).toBeGreaterThan(0);for(const card of cards)expect(card.textContent).toContain('GK');
  expect(assignPlayer(c,0,c.lineup[9])).toBe(c);
 });
 it('locks all lineup actions during a pending round and points users to matchday substitutions',()=>{
  const c=prepareWeek(fresh());render(<DepthChart career={c} onChange={()=>{throw Error('Should be locked');}} onProfile={()=>{}}/>);
  expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);for(const button of screen.getAllByRole('button',{name:/Start .* at|Drag .* into/}))expect((button as HTMLButtonElement).disabled).toBe(true);expect(screen.getByText(/Use Matchday/)).toBeTruthy();
 });
 it('adds a discoverable Squad tab and exposes development arrows beside player names',()=>{
  render(<SquadScreen career={fresh()} onChange={()=>{}} onProfile={()=>{}} onTactics={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Depth'}));expect(screen.getByRole('heading',{name:'Depth chart'})).toBeTruthy();expect(document.querySelectorAll('.development-arrows.up').length).toBeGreaterThan(0);expect(document.querySelectorAll('.development-arrows.down').length).toBeGreaterThan(0);
 });
});
