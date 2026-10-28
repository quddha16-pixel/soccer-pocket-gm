import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Career } from '../models';
import { allClubs, clubs, leagueClubs, managedClubs, poolClubs, clubById } from '../data/clubs';
import { championshipClubs } from '../data/championship';
import { championshipProfiles, promotedSquad } from '../data/promotedPlayers';
import { playersFromProfiles, startingProfiles } from '../data/playerProfiles';
import { advance, newCareer } from '../simulation/career';
import { promotionDraw } from '../simulation/promotion';
import { generateFixtures, standings } from '../simulation/league';
import { rolloverSeason } from '../simulation/worldTick';
import { transferDecision } from '../simulation/transferPolicy';
import { eligiblePlayers, askingPrice, submitOffer, wageDemand, finalizeSigning } from '../simulation/economy';
import { autoLineup, validLineup } from '../simulation/management';
import { dashboard } from '../simulation/dashboard';
import { identity } from '../simulation/identity';
import { loadCareer, saveCareer, SAVE_KEY } from '../storage';
import { LeagueScreen } from '../components/LeagueScreen';
import { TransferMarket } from '../components/TransferMarket';
import { legacyCareer } from './legacyCareer';

afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
// Completed, internally consistent fixture results isolate the season-boundary
// rules from match balance and manager dismissal (covered by other tests).
export function completedSeason(c:Career):Career {
 const fixtures=c.fixtures.map(({report,...f})=>({...f,homeGoals:f.homeId===c.clubId?4:f.awayId===c.clubId?0:1,awayGoals:f.awayId===c.clubId?4:f.homeId===c.clubId?0:1}));
 return {...c,week:38,status:'survived',pending:undefined,fixtures};
}
const fresh=()=>newCareer('Promotion test','elite','liverpool',5701);

describe('Championship pool and deterministic promotion',()=>{
 it('adds 24 distinct Championship clubs while leaving the original 20-club universe intact',()=>{
  expect(championshipClubs).toHaveLength(24);expect(clubs).toHaveLength(20);expect(allClubs).toHaveLength(44);
  expect(new Set(allClubs.map(c=>c.id)).size).toBe(44);expect(championshipClubs.some(c=>clubs.some(p=>p.id===c.id))).toBe(false);
  expect(clubById('westham').name).toBe('West Ham United');
  const c=fresh();expect(leagueClubs(c)).toEqual(clubs);expect(poolClubs(c)).toEqual(championshipClubs);
 });
 it('has real, individually referenced incoming squads without duplicating any custom footballer',()=>{
  expect(championshipProfiles).toHaveLength(664);
  const ids=[...startingProfiles,...championshipProfiles].map(p=>p.canonicalIdentityId);expect(new Set(ids).size).toBe(ids.length);
  for(const club of championshipClubs){
   const squad=championshipProfiles.filter(p=>p.assignedClubId===club.id);expect(squad.length).toBeGreaterThanOrEqual(16);
   expect(squad.filter(p=>p.primaryPosition==='GK').length).toBeGreaterThanOrEqual(2);
   expect(squad.every(p=>p.sources.length&&p.estimatedFields.includes('attributes')&&p.estimatedFields.includes('potential'))).toBe(true);
  }
 });
 it('replaces exactly the final bottom three with three distinct clubs from the pre-existing pool',()=>{
  const c=completedSeason(fresh()),table=standings(leagueClubs(c),c.fixtures),draw=promotionDraw(c);
  expect(draw.relegated).toEqual(table.slice(-3).map(r=>r.clubId));expect(draw.promoted).toHaveLength(3);expect(new Set(draw.promoted).size).toBe(3);
  expect(draw.promoted.every(id=>poolClubs(c).some(club=>club.id===id))).toBe(true);
  expect(draw.promoted.some(id=>draw.relegated.includes(id))).toBe(false);
  expect(draw.leagueClubIds).toHaveLength(20);expect(draw.championshipClubIds).toHaveLength(24);
  expect(draw.relegated.every(id=>draw.championshipClubIds.includes(id)&&!draw.leagueClubIds.includes(id))).toBe(true);
  expect(new Set([...draw.leagueClubIds,...draw.championshipClubIds]).size).toBe(44);
 });
 it('draws reproducibly after reload and varies across independent career seeds',()=>{
  const c=completedSeason(fresh()),first=promotionDraw(c);expect(promotionDraw(c)).toEqual(first);
  saveCareer(c);expect(promotionDraw(loadCareer().career!)).toEqual(first);
  const choices=new Set(Array.from({length:40},(_,seed)=>promotionDraw({...c,seed}).promoted.join('|')));expect(choices.size).toBeGreaterThan(20);
 });
 it('rejects partial, pending or malformed draws and keeps the relegated-manager game-over rule',()=>{
  const c=fresh();expect(()=>promotionDraw(c)).toThrow(/completed/);
  const ended=completedSeason(c);expect(()=>promotionDraw({...ended,fixtures:ended.fixtures.slice(10)})).toThrow(/completed/);
  expect(()=>promotionDraw({...ended,world:{...ended.world,championshipClubIds:['hull','hull','hull']}})).toThrow(/membership/);
  const fired={...ended,status:'fired' as const};expect(rolloverSeason(fired)).toBe(fired);
 });
});

describe('season rollover integrates promoted clubs',()=>{
 it('initializes real squads, staff and finances and produces 380 valid fixtures with the new 20 clubs',()=>{
  const c=completedSeason(fresh()),old=structuredClone(c),draw=promotionDraw(c),next=rolloverSeason(c);
  expect(c).toEqual(old);expect(next.world.leagueClubIds).toEqual(draw.leagueClubIds);expect(next.world.championshipClubIds).toEqual(draw.championshipClubIds);
  expect(next.world.season).toBe(2027);expect(next.week).toBe(0);expect(next.fixtures).toEqual(generateFixtures(draw.leagueClubIds));expect(next.fixtures).toHaveLength(380);
  expect(new Set(next.players.map(p=>p.id)).size).toBe(next.players.length);
  expect(new Set(next.players.filter(p=>p.real).map(p=>p.real!.canonicalIdentityId)).size).toBe(next.players.filter(p=>p.real).length);
  for(const id of draw.promoted){
   const squad=next.players.filter(p=>p.clubId===id);expect(squad.length).toBeGreaterThanOrEqual(16);expect(squad.every(p=>p.real?.origin==='championship')).toBe(true);
   expect(next.world.staff.filter(s=>s.clubId===id)).toHaveLength(7);expect(next.world.finances[id].cash).toBeGreaterThan(0);
  }
  for(const club of leagueClubs(next)){const available=eligiblePlayers(next,club.id);expect(validLineup(available,club.id,autoLineup(available,club.id,'4-3-3'))).toBe(true);expect(next.fixtures.filter(f=>f.homeId===club.id)).toHaveLength(19);expect(next.fixtures.filter(f=>f.awayId===club.id)).toHaveLength(19);}
  expect(rolloverSeason(next)).toBe(next);expect(next.world.history).toHaveLength(1);
 });
 it('retains relegated clubs, original player identities, source profiles and archived fixtures',()=>{
  const c=completedSeason(fresh()),draw=promotionDraw(c),next=rolloverSeason(c),snapshot=next.world.history[0];
  expect(snapshot.results).toEqual(c.fixtures.map(({report,...f})=>f));expect(snapshot.leagueClubIds).toEqual(clubs.map(c=>c.id));expect(snapshot.relegated).toEqual(draw.relegated);
  for(const p of c.players){const after=next.players.find(x=>x.id===p.id)!;expect(after).toBeTruthy();expect(after.name).toBe(p.name);expect(after.real).toEqual(p.real);
   if(draw.relegated.includes(p.clubId)&&identity(p).contractEnd>'2027-06-30'&&p.age<39)expect(after.clubId).toBe(p.clubId);
  }
  expect(draw.relegated.every(id=>managedClubs(next).some(club=>club.id===id)&&!!next.world.finances[id])).toBe(true);
 });
 it('keeps careers isolated instead of mutating the global club list',()=>{
  const a=completedSeason(fresh()),b=fresh();rolloverSeason(a);expect(leagueClubs(b)).toEqual(clubs);expect(newCareer('Other','elite','liverpool',3).fixtures).toEqual(b.fixtures);
 });
 it('loads pre-promotion saves, then round trips new membership, players and a pending matchweek',()=>{
  const old=legacyCareer();saveCareer(old);expect(loadCareer().career).toEqual(old);
  const legacyNext=rolloverSeason(completedSeason(old));
  for(const id of legacyNext.world.history[0].promoted!)expect(eligiblePlayers(legacyNext,id)).toHaveLength(legacyNext.players.filter(p=>p.clubId===id).length);
  saveCareer(legacyNext);expect(loadCareer().error).toBe('');
  const next=advance(rolloverSeason(completedSeason(fresh())));saveCareer(next);expect(loadCareer().career).toEqual(next);
  const pending=next.fixtures.filter(f=>f.week===1);expect(pending).toHaveLength(10);expect(pending.every(f=>next.world.leagueClubIds!.includes(f.homeId)&&next.world.leagueClubIds!.includes(f.awayId))).toBe(true);
  expect(dashboard(next).table).toHaveLength(20);expect(dashboard(next).row.clubId).toBe(next.clubId);
 });
 it('rejects corrupted league and pool membership while accepting archived club ownership',()=>{
  const c=rolloverSeason(completedSeason(fresh()));saveCareer(c);expect(loadCareer().error).toBe('');
  for(const world of [{...c.world,championshipClubIds:undefined},{...c.world,leagueClubIds:undefined},{...c.world,leagueClubIds:c.world.leagueClubIds!.slice(1)},{...c.world,leagueClubIds:Array(20).fill('hull')},{...c.world,championshipClubIds:[c.clubId,...c.world.championshipClubIds!.slice(1)]},{...c.world,leagueClubIds:['unknown-club',...c.world.leagueClubIds!.slice(1)]}]){
   // Inject malformed JSON directly; positive save/codec round trips are covered above.
   localStorage.setItem(SAVE_KEY,JSON.stringify({...c,world}));expect(loadCareer().career).toBeNull();
  }
 });
 it('preserves a returning club instead of spawning duplicate players or resetting its cash',()=>{
  const first=rolloverSeason(completedSeason(fresh())),returning=first.world.history[0].relegated![0];
  let ended=completedSeason(first);for(let seed=0;seed<100;seed++)if(promotionDraw({...ended,seed}).promoted.includes(returning)){ended={...ended,seed};break;}
  expect(promotionDraw(ended).promoted).toContain(returning);
  ended.world.finances[returning].cash=123456789;
  const next=rolloverSeason(ended);expect(next.world.finances[returning].cash).toBe(123456789);
  expect(new Set(next.players.map(p=>p.id)).size).toBe(next.players.length);expect(ended.players.every(p=>next.players.some(x=>x.id===p.id))).toBe(true);
 });
 it('never reclaims a previously transferred player from another club',()=>{
  const source=championshipProfiles.find(p=>p.assignedClubId==='westham')!,moved=playersFromProfiles([source]);moved[0].clubId='arsenal';
  expect(promotedSquad('westham',2028,moved).some(p=>p.real!.canonicalIdentityId===source.canonicalIdentityId)).toBe(false);expect(moved[0].clubId).toBe('arsenal');
 });
 it('supports an actual transfer from a promoted club using its initialized accounts',()=>{
  const c=rolloverSeason(completedSeason(fresh())),promoted=c.world.history[0].promoted!;
  const p=c.players.find(p=>promoted.includes(p.clubId)&&p.age<=21&&p.overall<=72&&transferDecision(c,p).available&&askingPrice(c,p)<10e6)!;expect(p).toBeTruthy();
  const offered=submitOffer(c,p.id,askingPrice(c,p)),o=offered.world.offers[0],w=wageDemand(offered,p),signed=finalizeSigning(offered,o.id,w,3,w*5);
  expect(signed.players.find(x=>x.id===p.id)!.clubId).toBe(c.clubId);expect(signed.world.finances[p.clubId].income).toBe(o.fee);
 });
 it('keeps league/pool sizes and historical results consistent over repeated season changes',()=>{
  let c=fresh();const customIds=c.players.filter(p=>p.real).map(p=>p.id);
  for(let i=0;i<6;i++){const completed=completedSeason(c),results=completed.fixtures.map(({report,...f})=>f);c=rolloverSeason(completed);
   expect(leagueClubs(c)).toHaveLength(20);expect(poolClubs(c)).toHaveLength(24);expect(new Set([...leagueClubs(c),...poolClubs(c)].map(p=>p.id)).size).toBe(44);
   expect(c.world.history.at(-1)!.results).toEqual(results);expect(customIds.every(id=>c.players.some(p=>p.id===id))).toBe(true);expect(new Set(c.players.map(p=>p.id)).size).toBe(c.players.length);
  }
  saveCareer(c);expect(loadCareer().error).toBe('');
 },30000);
});

describe('league UI follows career-specific membership',()=>{
 it('shows the pool and promotion history, new league clubs and older-season results',()=>{
  const c=rolloverSeason(completedSeason(fresh()));render(<LeagueScreen career={c} onProfile={()=>{}}/>);
  expect(document.querySelectorAll('.compact-table tbody tr')).toHaveLength(20);
  for(const id of c.world.history[0].promoted!)expect(screen.getAllByText(clubById(id).name).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:'EFL pool'}));expect(screen.getByRole('heading',{name:'Championship pool'})).toBeTruthy();expect(document.querySelectorAll('.pool-club')).toHaveLength(24);expect(screen.getByText('Latest season changes')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Fixtures'}));fireEvent.change(screen.getByLabelText('Fixture season'),{target:{value:'2026'}});expect(document.querySelectorAll('.fixture')).toHaveLength(10);
 });
 it('includes newly promoted clubs in transfer-market filters',()=>{
  const c=rolloverSeason(completedSeason(fresh()));render(<TransferMarket career={c} onChange={()=>{}} onProfile={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Search & filter players'}));
  for(const id of c.world.history[0].promoted!)expect(screen.getByRole('option',{name:clubById(id).name})).toBeTruthy();
 });
});
