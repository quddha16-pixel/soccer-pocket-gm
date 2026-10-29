import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {Career,Reputation} from '../models';
import {offers,newCareer} from '../simulation/career';
import {managerJobOffers} from '../simulation/managerJobs';
import {promotionDraw} from '../simulation/promotion';
import {startingLegacyOpportunity} from '../simulation/legacy';
import {ClubOfferCard} from '../components/ClubOfferCard';
import {clubById} from '../data/clubs';
import {saveCareer,loadCareer} from '../storage';
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
describe('exact managerial offer tiers',()=>{
 it('offers cumulative 4 / 12 / 20 clubs and rejects unavailable new-career jobs',()=>{
  const tiers=([['unknown',4],['established',12],['elite',20]] as const).map(([rep,count])=>{const list=offers(rep);expect(list).toHaveLength(count);expect(new Set(list.map(c=>c.id)).size).toBe(count);expect(offers(rep)).toEqual(list);return list;});
  expect(tiers[0].every(c=>tiers[1].some(t=>t.id===c.id))).toBe(true);expect(tiers[1].every(c=>tiers[2].some(t=>t.id===c.id))).toBe(true);
  for(const rep of ['unknown','established'] as const){const locked=tiers[2].find(c=>!offers(rep).some(t=>t.id===c.id))!;expect(()=>newCareer('Locked',rep,locked.id,1)).toThrow(/offered/);}
 });
 it('keeps the exact quota after promotion, including an incumbent renewal within its allocation',()=>{
  for(const [rep,count] of [['unknown',4],['established',12],['elite',20]] as const){
   const base=newCareer('Incumbent','elite','city',12),c:Career={...base,reputation:rep,week:38,status:'survived',legacy:{...base.legacy!,settledSeasons:[2026]},fixtures:base.fixtures.map(f=>({...f,homeGoals:f.homeId==='city'?1:0,awayGoals:f.awayId==='city'?1:0}))};
   const jobs=managerJobOffers(c),available=jobs.filter(o=>o.available);expect(jobs).toHaveLength(20);expect(available).toHaveLength(count);expect(available.some(o=>o.clubId==='city')).toBe(true);expect(jobs).toEqual(managerJobOffers(c));expect(new Set(jobs.map(o=>o.clubId))).toEqual(new Set(promotionDraw(c).leagueClubIds));
   const fired:Career={...c,status:'fired',fixtures:c.fixtures.map(f=>({...f,homeGoals:f.awayId==='city'?1:0,awayGoals:f.homeId==='city'?1:0}))};const next=managerJobOffers(fired);expect(next.filter(o=>o.available)).toHaveLength(count);expect(next.some(o=>o.clubId==='city')).toBe(false);
  }
 });
 it('keeps an existing career at a newly locked club playable',()=>{const c={...newCareer('Existing GM','elite','everton',9),reputation:'unknown' as Reputation};saveCareer(c);const restored=loadCareer();expect(restored.error).toBe('');expect(restored.career!.clubId).toBe('everton');expect(restored.career!.players).toEqual(c.players);});
 it('keeps compact club names and legacy graphics visible and reveals full details on tap',()=>{
  let accepted=false;render(<ClubOfferCard club={clubById('hull')} available projection={startingLegacyOpportunity('hull')} details={<p>Transfer budget £18M</p>} onAccept={()=>{accepted=true;}}/>);
  expect(screen.getByRole('heading',{name:'Hull City'})).toBeTruthy();expect(screen.getByRole('img',{name:/points for a league title/})).toBeTruthy();expect(screen.queryByText('Transfer budget £18M')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'View Hull City offer details'}));const modal=screen.getByRole('dialog',{name:'Hull City'});expect(within(modal).getByText('Transfer budget £18M')).toBeTruthy();expect(accepted).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Close club details'}));fireEvent.click(screen.getByRole('button',{name:'Accept offer'}));expect(accepted).toBe(true);
 });
});
