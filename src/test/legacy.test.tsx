import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Career } from '../models';
import { allClubs, clubs, leagueClubs } from '../data/clubs';
import { newCareer, prepareWeek, commitWeek } from '../simulation/career';
import { achievementDefinitions, clubAwardIds, legacyPoints, legacyState, settleLegacySeason, updateAchievements, validLegacy } from '../simulation/legacy';
import { managerJobOffers, acceptManagerOffer } from '../simulation/managerJobs';
import { promotionDraw } from '../simulation/promotion';
import { rolloverSeason } from '../simulation/worldTick';
import { archiveSeasonReview, seasonReview, type SeasonReview } from '../simulation/records';
import { eligiblePlayers } from '../simulation/economy';
import { validLineup } from '../simulation/management';
import { loadCareer, saveCareer, SAVE_KEY } from '../storage';
import { LegacyScreen } from '../components/LegacyScreen';

afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
const fresh=(clubId='hull',reputation:Career['reputation']='unknown')=>newCareer('Quentin Legacy',reputation,clubId,72,'developer');
/** Complete a real 380-fixture schedule with an unambiguous champion or relegated club. */
function completed(c=fresh(),win=true):Career {
 return {...c,week:38,status:win?'survived':'fired',fixtures:c.fixtures.map(f=>{
  const own=f.homeId===c.clubId||f.awayId===c.clubId;
  return {...f,homeGoals:own?Number((f.homeId===c.clubId)===win):0,awayGoals:own?Number((f.awayId===c.clubId)===win):0};
 })};
}
describe('legacy season accounting',()=>{
 it('freezes the target, rewards a first underdog title, and never settles twice',()=>{
  const start=fresh(),target=start.legacy!.baseline.target;
  const c=completed({...start,players:start.players.map(p=>p.clubId===start.clubId?{...p,overall:99}:p)});
  const end=settleLegacySeason(c),l=end.legacy!;
  expect(l.baseline.target).toBe(target);expect(l.entries.find(e=>e.id.endsWith(':expectations'))!.points).toBe((target-1)*20);
  expect(l.entries.find(e=>e.kind==='title')!.points).toBe(500);expect(l.entries.find(e=>e.kind==='rebuild')!.points).toBe(800);
  expect(l.achievements.map(a=>a.id)).toEqual(expect.arrayContaining(['champion','rebuilder','unbeaten','century','overachiever','icon']));
  expect(settleLegacySeason(end)).toBe(end);expect(settleLegacySeason(rolloverSeason(end)).legacy!.entries).toEqual(l.entries);
  const unchanged=structuredClone(c);settleLegacySeason(c);expect(c).toEqual(unchanged);
 });
 it('deducts missed targets, relegation, new debt and financial overspend',()=>{
  const c=completed(fresh('city','elite'),false),f=c.world.finances.city;
  f.debt=12e6;f.agentFees=1e9;
  const end=settleLegacySeason(c),l=end.legacy!;
  expect(l.entries.find(e=>e.id.endsWith(':expectations'))!.points).toBeLessThan(0);
  expect(l.entries.find(e=>e.id.endsWith(':relegation'))!.points).toBe(-250);
  expect(l.entries.find(e=>e.id.endsWith(':debt'))!.points).toBe(-100);
  expect(l.entries.find(e=>e.id.endsWith(':compliance'))!.points).toBeLessThan(0);
  expect(legacyPoints(l)).toBeLessThan(0);expect(l.achievements.some(a=>a.id==='relegated')).toBe(true);
 });
 it('ignores pending and incomplete seasons and awards no provisional result',()=>{
  const c=completed();expect(settleLegacySeason({...c,week:37})).toEqual({...c,week:37});
  const p=prepareWeek(fresh(),false);expect(settleLegacySeason(p)).toBe(p);
  const missing={...c,fixtures:c.fixtures.map((f,i)=>i?f:{...f,homeGoals:undefined})};expect(settleLegacySeason(missing)).toBe(missing);
 });
 it('settles through the actual final matchweek commit exactly once',()=>{
  const c=completed(),before={...c,week:37,status:'active' as const,fixtures:c.fixtures.map(f=>f.week===38?{...f,homeGoals:undefined,awayGoals:undefined}:f)};
  const end=commitWeek(prepareWeek(before,false));expect(end.week).toBe(38);expect(end.legacy!.settledSeasons).toEqual([2026]);expect(end.world.seasonReviews!.at(-1)!.complete).toBe(true);
  expect(commitWeek(end)).toBe(end);saveCareer(end);expect(loadCareer().career!.legacy).toEqual(end.legacy);
 });
 it('pays award types once, credits real club appearances and rejects cameo credit',()=>{
  const c=completed(),id=c.lineup[10],review:SeasonReview={season:2026,complete:true,matches:380,reportedMatches:38,players:[{playerId:id,appearances:10} as SeasonReview['players'][number]],awards:[{id:'ballon-dor',title:'Ballon d’Or',winners:[id,id],reason:'Test',score:1}]};
  c.fixtures.slice(0,5).forEach(f=>{f.report={events:[],performances:[{playerId:id,clubId:c.clubId,minutes:90} as never],motmId:id,homePossession:50};});
  expect(clubAwardIds(c,review)).toEqual(['ballon-dor']);c.world.seasonReviews=[review];
  const end=settleLegacySeason(c);expect(end.legacy!.entries.filter(e=>e.kind==='award')).toHaveLength(1);expect(end.legacy!.entries.find(e=>e.kind==='award')!.points).toBe(150);expect(end.legacy!.achievements.some(a=>a.id==='award-ballon-dor')).toBe(true);
  c.fixtures[0].report!.performances=[];expect(clubAwardIds(c,review)).toEqual([]);
 });
 it('adds an archived manager award decided by league performance with stable names',()=>{
  const c=completed(),r=seasonReview(c),manager=r.awards.find(a=>a.id==='manager-season')!;
  expect(manager.clubWinners).toEqual(['hull']);expect(manager.managerNames!.hull).toBe(c.manager);
  const end=settleLegacySeason(archiveSeasonReview(c));expect(end.legacy!.entries.some(e=>e.id.endsWith(':manager-season'))).toBe(true);
 });
});

describe('managerial contracts and continuous careers',()=>{
 it('offers a deterministic next-league graph, all clubs to experienced managers, and genuine better-paid poaching',()=>{
  const c=completed(),snapshot=structuredClone(c),a=managerJobOffers(c),b=managerJobOffers(c),draw=promotionDraw(c);
  expect(a).toEqual(b);expect(c).toEqual(snapshot);expect(a).toHaveLength(20);expect(new Set(a.map(o=>o.clubId))).toEqual(new Set(draw.leagueClubIds));
  expect(a.every(o=>o.available)).toBe(true);expect(a.some(o=>o.poaching&&o.wage>c.legacy!.tenures.at(-1)!.wage)).toBe(true);
  const elite=managerJobOffers(completed(fresh('city','elite'),false));expect(elite.every(o=>o.available)).toBe(true);expect(elite.some(o=>o.clubId==='hull')).toBe(true);
 });
 it('moves clubs without resetting the world, style, player identities, records or legacy',()=>{
  const c=completed(),settled=settleLegacySeason(c),offer=managerJobOffers(c).find(o=>o.poaching)!,next=acceptManagerOffer(c,offer.clubId);
  expect(next.world.season).toBe(2027);expect(next.week).toBe(0);expect(next.clubId).toBe(offer.clubId);expect(next.status).toBe('active');expect(next.managerStyle).toBe(c.managerStyle);expect(next.seed).toBe(c.seed);
  expect(next.legacy!.entries.filter(e=>e.kind!=='move')).toEqual(settled.legacy!.entries);expect(legacyPoints(next.legacy!)).toBe(legacyPoints(settled.legacy!)+50);
  expect(next.legacy!.tenures).toHaveLength(2);expect(next.legacy!.tenures[0].toSeason).toBe(2026);expect(next.legacy!.tenures[1].wage).toBe(offer.wage);
  expect(next.legacy!.baseline.clubId).toBe(offer.clubId);expect(next.legacy!.achievements.some(a=>a.id==='poached')).toBe(true);expect(next.matchPlan).toBeUndefined();
  expect(next.world.history[0].clubId).toBe('hull');expect(next.world.history[0].position).toBe(1);expect(next.world.seasonReviews![0].season).toBe(2026);
  expect(c.players.every(p=>next.players.some(x=>x.id===p.id))).toBe(true);expect(c.players.filter(p=>p.contractYears>1&&p.age<39).every(p=>next.players.find(x=>x.id===p.id)!.clubId===p.clubId)).toBe(true);
  expect(next.world.staff.filter(s=>s.controlled)).toHaveLength(1);expect(next.world.staff.find(s=>s.controlled)!.clubId).toBe(offer.clubId);
  expect(validLineup(eligiblePlayers(next,next.clubId),next.clubId,next.lineup)).toBe(true);expect(managerJobOffers(next)).toEqual([]);expect(()=>acceptManagerOffer(next,'hull')).toThrow(/offered/);
  saveCareer(next);expect(loadCareer().career).toEqual(next);
 });
 it('continues after relegation with another club while keeping relegation and negative legacy',()=>{
  const c=completed(fresh(),false),o=managerJobOffers(c).find(o=>o.available)!,next=acceptManagerOffer(c,o.clubId);
  expect(leagueClubs(next).some(t=>t.id==='hull')).toBe(false);expect(next.world.championshipClubIds).toContain('hull');expect(next.legacy!.achievements.some(a=>a.id==='relegated')).toBe(true);expect(legacyPoints(next.legacy!)).toBeLessThan(0);
  expect(next.clubId).not.toBe('hull');expect(next.world.history[0].clubId).toBe('hull');expect(next.world.history[0].position).toBe(20);expect(()=>acceptManagerOffer(c,'hull')).toThrow(/offered/);
  saveCareer(next);expect(loadCareer().error).toBe('');
 });
 it('does not pay for staying, blocks locked jobs, and makes achievements permanent after setbacks',()=>{
  const c=completed(),stay=acceptManagerOffer(c,c.clubId);expect(stay.legacy!.entries.some(e=>e.kind==='move')).toBe(false);expect(stay.legacy!.tenures).toHaveLength(1);
  const bad=completed(fresh(),false),locked=managerJobOffers(bad).find(o=>!o.available)!;expect(locked).toBeTruthy();expect(()=>acceptManagerOffer(bad,locked.clubId)).toThrow(/offered/);
  const lost=settleLegacySeason(completed(stay,false));expect(lost.legacy!.achievements.some(a=>a.id==='champion')).toBe(true);expect(lost.legacy!.entries.filter(e=>e.kind==='rebuild')).toHaveLength(1);
 });
});

describe('achievements, migration and mobile-facing UI',()=>{
 it('tracks every award, title clubs and the entire original custom universe once',()=>{
  let l=legacyState(fresh());
  l={...l,settledSeasons:[2026],entries:[...clubs.map(t=>({id:`2026:${t.id}:champion`,season:2026,clubId:t.id,points:500,reason:'Champion',kind:'title' as const})),...['ballon-dor','player-season','golden-boot','playmaker','golden-glove','yashin','kopa','creator','manager-season'].map(id=>({id:`2026:hull:${id}`,season:2026,clubId:'hull',points:40,reason:'Award',kind:'award' as const}))]};
  const unlocked=updateAchievements(l,2026,'hull');expect(unlocked.achievements.map(a=>a.id)).toEqual(expect.arrayContaining(['all-original-clubs','all-awards','clean-sweep','three-clubs']));
  expect(unlocked.achievements.some(a=>a.id==='all-clubs')).toBe(false);expect(updateAchievements(unlocked,2026,'hull').achievements).toEqual(unlocked.achievements);
  expect(achievementDefinitions.find(a=>a.id==='all-clubs')!.goal).toBe(allClubs.length);
 });
 it('adopts existing saves safely and rejects malformed or duplicate legacy records',()=>{
  const old=fresh();delete old.legacy;saveCareer(old);const loaded=loadCareer().career!;expect(loaded.players).toEqual(old.players);expect(loaded.fixtures).toEqual(old.fixtures);expect(loaded.legacy!.entries).toEqual([]);expect(loaded.legacy!.baseline.estimated).toBe(false);
  const end=settleLegacySeason(completed());expect(validLegacy(end)).toBe(true);
  for(const mutate of [(c:Career)=>{c.legacy!.entries.push(c.legacy!.entries[0]);},(c:Career)=>{c.legacy!.baseline.target=0;},(c:Career)=>{c.legacy!.tenures[0].wage=-1;},(c:Career)=>{c.legacy!.achievements.push({id:'invented',season:2026,clubId:'hull'});},(c:Career)=>{c.legacy!.entries[0].points=NaN;}]){const bad=structuredClone(end);mutate(bad);localStorage.setItem(SAVE_KEY,JSON.stringify(bad));expect(loadCareer().career).toBeNull();}
 });
 it('renders the points ledger, achievement progress and explicit contract confirmation',()=>{
  const c=settleLegacySeason(completed());let result:Career|undefined;
  render(<LegacyScreen career={c} onChange={next=>{result=next;}}/>);expect(screen.getByText(/legacy points/)).toBeTruthy();expect(screen.getAllByText('League champions.').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:'Achievements'}));expect(screen.getByRole('heading',{name:'Champion'})).toBeTruthy();expect(screen.getAllByText('Unlocked').length).toBeGreaterThan(0);expect(document.querySelectorAll('.legacy-club-grid>div')).toHaveLength(44);
  fireEvent.click(screen.getByRole('button',{name:'Jobs & contracts'}));expect(document.querySelectorAll('.offer-card')).toHaveLength(20);
  fireEvent.click(screen.getAllByRole('button',{name:'Review contract'})[0]);const modal=screen.getByRole('dialog');expect(result).toBeUndefined();fireEvent.click(within(modal).getByRole('button',{name:'Keep reviewing offers'}));expect(result).toBeUndefined();
  fireEvent.click(screen.getByRole('button',{name:'Stay & begin next season'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm & begin next season'}));expect(result!.world.season).toBe(2027);
 });
});
