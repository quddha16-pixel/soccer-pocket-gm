import {releaseReserve} from './careerFixtures';
import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import App from '../App';
import type {Career,Fixture,MatchEvent,Performance} from '../models';
import {clubs,allClubs} from '../data/clubs';
import {clubTheme,themeAccent,contrast,kitInk} from '../data/clubThemes';
import managers from '../../docs/research/managers-2026.json';
import {freeAgentProfiles,researchedFreeAgents,addResearchedFreeAgents} from '../data/freeAgents';
import {startingProfiles,outfieldAttributes,keeperAttributes} from '../data/playerProfiles';
import {championshipProfiles} from '../data/promotedPlayers';
import {newCareer,offers,prepareWeek,advance} from '../simulation/career';
import {autoLineup} from '../simulation/management';
import {repairLineup,eligiblePlayers,submitOffer,finalizeSigning,wageDemand} from '../simulation/economy';
import {allTimePlayers,archiveSeasonReview,clubRecords,seasonReview} from '../simulation/records';
import {rolloverSeason} from '../simulation/worldTick';
import {loadCareer,saveCareer} from '../storage';
import {RecordBook,SeasonAwards,AwardsArchive} from '../components/Honours';
import {legacyCareer} from './legacyCareer';

afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
function fixtureSeason():Career {
 const c=newCareer('Review','elite','arsenal',25),f=c.fixtures[0],home=autoLineup(eligiblePlayers(c,f.homeId),f.homeId,'4-3-3'),away=autoLineup(eligiblePlayers(c,f.awayId),f.awayId,'4-3-3');
 const scorer=home[10],creator=home[5];
 const events:MatchEvent[]=Array.from({length:10},(_,i)=>({id:`test-${i}`,minute:i+1,type:i<3?'goal':'shot',clubId:i<8?f.homeId:f.awayId,playerId:i<8?scorer:away[10],creatorId:i<8?creator:away[5],assistId:i<3?creator:undefined,onTarget:true,xG:.12,chanceType:'close'}));
 const performances:Performance[]=[...home,...away].map((id,i)=>({playerId:id,clubId:i<11?f.homeId:f.awayId,goals:id===scorer?3:0,assists:id===creator?3:0,shots:id===scorer?8:id===away[10]?2:0,saves:id===home[0]?2:id===away[0]?5:0,tackles:id===home[1]?20:0,rating:id===home[1]?10:7}));
 const report={events,performances,homePossession:52,motmId:home[1],homeLineup:home,awayLineup:away};
 const fixtures=c.fixtures.map(x=>({...x,homeGoals:x.id===f.id?3:0,awayGoals:0,...(x.id===f.id?{report}:{})}));
 return {...c,week:38,status:'survived',fixtures};
}

describe('all-club contract selection',()=>{
 it('expands offers cumulatively and opens most clubs to established managers and all 20 to elite managers',()=>{
  const unknown=offers('unknown');expect(unknown).toHaveLength(4);
  expect(offers('established')).toHaveLength(12);expect(offers('elite')).toHaveLength(20);for(const rep of ['established','elite'] as const)for(const club of offers(rep))expect(newCareer('Choose',rep,club.id,1).clubId).toBe(club.id);expect(()=>newCareer('No elite offer','established','city')).toThrow(/offered/);
  expect(()=>newCareer('No offer','unknown','city')).toThrow(/offered/);expect(unknown.every(c=>c.strength<=74)).toBe(true);
 });
 it('renders every club and highlights only available contracts without hiding locked teams',()=>{
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Start career'}));fireEvent.click(screen.getByRole('button',{name:'Find job offers'}));
  expect(document.querySelectorAll('.offer-card')).toHaveLength(20);expect(document.querySelectorAll('.offer-available')).toHaveLength(offers('unknown').length);
  const locked=screen.getByRole('article',{name:'Manchester City: Higher reputation required'});expect(within(locked).getByRole('button',{name:'No offer yet'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Back'}));fireEvent.click(screen.getByRole('button',{name:/Established manager/}));fireEvent.click(screen.getByRole('button',{name:'Find job offers'}));
  expect(document.querySelectorAll('.offer-available')).toHaveLength(12);expect(document.querySelectorAll('.legacy-opportunity')).toHaveLength(20);const hull=screen.getByRole('article',{name:'Hull City: Contract offered'});fireEvent.click(within(hull).getByRole('button',{name:'Accept offer'}));expect(loadCareer().career!.clubId).toBe('hull');
 });
});

describe('real reference data and safe imports',()=>{
 it('has traditional home palettes for all 44 clubs and accessible themed actions',()=>{
  for(const club of allClubs){const t=clubTheme(club.id);expect(t.primary).toMatch(/^#[0-9A-F]{6}$/);expect(t.secondary).toMatch(/^#[0-9A-F]{6}$/);expect(club.color).toBe(t.primary);expect(contrast(t.primary,kitInk(t.primary))).toBeGreaterThanOrEqual(4.5);expect(contrast(themeAccent(club.id),'#172510')).toBeGreaterThanOrEqual(4.5);expect(contrast(themeAccent(club.id),'#0d1722')).toBeGreaterThanOrEqual(5);}
  expect(clubTheme('leeds').primary).toBe('#FFFFFF');expect(clubTheme('newcastle').secondary).toBe('#FFFFFF');expect(clubTheme('villa').primary).toBe('#670E36');
 });
 it('places the 20 researched managers in head-coach roles including the user club, preserving legacy identities',()=>{
  const c=newCareer('Football director','elite','everton',1);expect(managers).toHaveLength(20);
  for(const m of managers){const coach=c.world.staff.find(s=>s.clubId===m.clubId&&s.role==='Manager')!;expect(coach.name).toBe(m.name);expect(coach.reference?.source).toBe(m.source);}
  expect(c.manager).toBe('Football director');expect(c.world.staff.find(s=>s.controlled)!.name).toBe('David Moyes');
  const legacy=legacyCareer('Existing manager');expect(legacy.world.staff.find(s=>s.controlled)!.name).toBe('Existing manager');
 });
 it('imports 50 distinct real free agents while keeping the exact original custom squads intact',()=>{
  const c=newCareer('Pool','elite','arsenal',10),free=c.players.filter(p=>!p.clubId);
  expect(free).toHaveLength(50);expect(free.every(p=>p.real?.origin==='free-agent')).toBe(true);
  expect(new Set(freeAgentProfiles.map(p=>p.canonicalIdentityId)).size).toBe(50);
  const all=[...startingProfiles,...championshipProfiles,...freeAgentProfiles];expect(new Set(all.map(p=>p.canonicalIdentityId)).size).toBe(all.length);
  expect(c.players.filter(p=>p.clubId).map(p=>p.id)).toEqual(startingProfiles.map(p=>p.draftId));
  expect(free.some(p=>p.name==='Jadon Sancho')).toBe(true);expect(free.some(p=>p.name==='Paul Pogba')).toBe(true);
  for(const name of ['David Alaba','Riyad Mahrez','Dani Carvajal','Neto','Yves Bissouma','Tyrell Malacia','Tijjani Reijnders','Mason Greenwood'])expect(free.some(p=>p.name===name)).toBe(false);
 });
 it('labels provisional ratings and gives every free agent an individual coherent profile and evidence',()=>{
  expect(freeAgentProfiles.filter(p=>p.ratingStatus==='official')).toHaveLength(1);expect(freeAgentProfiles.filter(p=>p.ratingStatus==='provisional')).toHaveLength(49);
  expect(new Set(freeAgentProfiles.map(p=>outfieldAttributes.map(k=>p.attributes[k]).join(','))).size).toBe(50);
  for(const p of freeAgentProfiles){expect(p.overall).toBeGreaterThan(1);expect(p.potential).toBeGreaterThanOrEqual(p.overall);expect(p.sources.length).toBeGreaterThanOrEqual(2);expect(p.contractYearsEstimate).toBe(0);expect(p.startingValue).toBeGreaterThan(0);expect(p.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);for(const k of [...outfieldAttributes,...(p.primaryPosition==='GK'?keeperAttributes:[])])expect(p.attributes[k]).toBeGreaterThanOrEqual(1);}
 });
 it('adds the pool once to an existing save without reclaiming transferred or retired identities',()=>{
  let c=legacyCareer();const imported=researchedFreeAgents(c.world.season);imported[0].clubId='city';c={...c,players:[...c.players,imported[0]]};
  const next=addResearchedFreeAgents(c);expect(next.players).toHaveLength(c.players.length+49);expect(next.players.find(p=>p.id===imported[0].id)!.clubId).toBe('city');expect(addResearchedFreeAgents(next)).toBe(next);expect(c.world.freeAgentPoolVersion).toBeUndefined();
  const pending=prepareWeek(c);expect(addResearchedFreeAgents(pending)).toBe(pending);saveCareer(next);expect(loadCareer().career).toEqual(next);
 });
 it('supports a real free-agent signing through club agreement, terms and registration',()=>{
  const c=releaseReserve(newCareer('Sign','elite','liverpool',1)),p=c.players.find(p=>p.name==='Guillaume Dietsch')!,offered=submitOffer(c,p.id,0),o=offered.world.offers[0],w=wageDemand(offered,p),signed=finalizeSigning(offered,o.id,w,2,w*5);
  expect(signed.players.find(x=>x.id===p.id)!.clubId).toBe('liverpool');expect(signed.players.find(x=>x.id===p.id)!.real).toEqual(p.real);expect(o.fee).toBe(0);
 });
});

describe('season awards and permanent career records',()=>{
 it('counts real events and performances, including shot-created chances, assists and keeper saves',()=>{
  const c=fixtureSeason(),r=seasonReview(c),f=c.fixtures[0],scorer=f.report!.homeLineup![10],creator=f.report!.homeLineup![5];
  expect(r.complete).toBe(true);expect(r.matches).toBe(380);expect(r.reportedMatches).toBe(1);expect(r.players.find(p=>p.playerId===scorer)).toMatchObject({goals:3,shots:8});expect(r.players.find(p=>p.playerId===creator)).toMatchObject({assists:3,chances:8});
  expect(r.players.find(p=>p.playerId===f.report!.awayLineup![0])).toMatchObject({saves:5,cleanSheets:0});expect(r.players.find(p=>p.playerId===f.report!.homeLineup![0])).toMatchObject({saves:2,cleanSheets:1});
 });
 it('awards performance rather than OVR or fame and does not open a premature ceremony',()=>{
  const c=fixtureSeason(),r=seasonReview(c),f=c.fixtures[0];expect(r.awards.find(a=>a.id==='golden-boot')!.winners).toEqual([f.report!.homeLineup![10]]);
  expect(r.awards.find(a=>a.id==='ballon-dor')!.winners).toEqual([f.report!.homeLineup![1]]);
  const altered={...c,players:c.players.map(p=>({...p,overall:p.id===f.report!.homeLineup![1]?40:99}))};expect(seasonReview(altered).awards).toEqual(r.awards);
  expect(seasonReview({...c,week:37}).awards).toEqual([]);expect(seasonReview({...c,pending:prepareWeek(newCareer('Pending','elite','arsenal',1)).pending,week:0,fixtures:newCareer('Fresh','elite','arsenal',1).fixtures}).players).toEqual([]);
 });
 it('shares counting awards on ties and excludes older players from the Kopa Trophy',()=>{
  const c=fixtureSeason(),f=c.fixtures[0],p=f.report!.performances[8];p.goals=3;
  expect(seasonReview(c).awards.find(a=>a.id==='golden-boot')!.winners).toHaveLength(2);
  for(const id of seasonReview(c).awards.find(a=>a.id==='kopa')?.winners??[])expect(c.players.find(p=>p.id===id)!.age).toBeLessThanOrEqual(21);
 });
 it('archives totals and best games once and retains them through rollover, transfers and reload',()=>{
  const c=fixtureSeason(),id=c.fixtures[0].report!.homeLineup![10],archived=archiveSeasonReview(c),twice=archiveSeasonReview(archived);expect(twice.world.seasonReviews).toHaveLength(1);expect(allTimePlayers(twice).find(p=>p.playerId===id)!.goals).toBe(3);
  let next=rolloverSeason(archived);expect(allTimePlayers(next).find(p=>p.playerId===id)!.goals).toBe(3);expect(allTimePlayers(next).find(p=>p.playerId===id)!.best.goals!.season).toBe(2026);
  next=repairLineup({...next,players:next.players.map(p=>p.id===id?{...p,clubId:'city'}:p)});expect(allTimePlayers(next).find(p=>p.playerId===id)!.clubs).toEqual([c.fixtures[0].homeId]);
  saveCareer(next);expect(loadCareer().career).toEqual(next);expect(allTimePlayers(loadCareer().career!).find(p=>p.playerId===id)!.goals).toBe(3);
 });
 it('tracks win/unbeaten streaks across seasons and ends them on draws, losses or a missing league season',()=>{
  const c=newCareer('Streak','elite','arsenal',1),home='arsenal',away='everton';
  const game=(week:number,h:number,a:number):Fixture=>({id:`streak-${week}`,week,homeId:home,awayId:away,homeGoals:h,awayGoals:a});
  c.fixtures=[game(1,2,0),game(2,1,0),game(3,0,0),game(4,0,1),game(5,3,0)];let r=clubRecords(c).find(r=>r.clubId===home)!;expect(r.wins).toBe(2);expect(r.unbeaten).toBe(3);expect(r.goalsGame).toBe(3);expect(r.pointsSeason).toBe(10);
  c.world.history=[{season:2025,position:1,points:6,results:[game(1,1,0),game(2,2,0)]}];r=clubRecords(c).find(r=>r.clubId===home)!;expect(r.wins).toBe(4);expect(r.unbeaten).toBe(5);
 });
 it('retains team results but never invents player statistics for legacy score-only archives',()=>{
  const c=fixtureSeason();c.fixtures=c.fixtures.map(({report,...f})=>f);expect(seasonReview(c).players).toEqual([]);expect(seasonReview(c).awards.filter(a=>a.id!=='manager-season')).toEqual([]);expect(seasonReview(c).awards.find(a=>a.id==='manager-season')!.clubWinners).toHaveLength(1);expect(clubRecords(c).some(r=>r.goalsGame===3)).toBe(true);
 });
 it('makes awards and record categories browseable and keeps old seasons visible',()=>{
  const c=fixtureSeason();const ui=render(<SeasonAwards career={c} onProfile={()=>{}}/>);expect(screen.getByText('Ballon d’Or')).toBeTruthy();expect(screen.getByText('Golden Glove')).toBeTruthy();ui.unmount();
  render(<RecordBook career={c} onProfile={()=>{}}/>);fireEvent.change(screen.getByLabelText('Player record'),{target:{value:'chances'}});expect(screen.getByRole('heading',{name:'Most chances created'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Single match'}));expect(screen.getByText('Most saves in a match')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Club records'}));expect(screen.getByText('Longest win streak')).toBeTruthy();cleanup();
  render(<AwardsArchive career={rolloverSeason(c)} onProfile={()=>{}}/>);fireEvent.change(screen.getByLabelText('Award season'),{target:{value:'2026'}});expect(screen.getByText('Ballon d’Or')).toBeTruthy();
 });
});
