import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { customRosterDraft } from '../data/customRoster';
import { clubs } from '../data/clubs';
import { customStartingPlayers, startingProfiles, validatePlayableRoster, keeperAttributes, outfieldAttributes } from '../data/playerProfiles';
import { newCareer, prepareWeek, advance, offers } from '../simulation/career';
import { autoLineup, naturalFit, formations, validLineup, valuation } from '../simulation/management';
import { carryingQuality, creationQuality, conversionProbability, defenceQuality, keepingQuality, skill } from '../simulation/playerSkills';
import { identity } from '../simulation/identity';
import { developPlayer } from '../simulation/development';
import { eligiblePlayers, canRegister, finalizeSigning, submitOffer, wageDemand } from '../simulation/economy';
import { rolloverSeason } from '../simulation/worldTick';
import { saveCareer, loadCareer, SAVE_KEY } from '../storage';
import { PlayerProfile } from '../components/PlayerProfile';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { legacyCareer } from './legacyCareer';

afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
const profile=(name:string)=>customStartingPlayers().find(p=>p.name===name)!;

describe('complete playable custom roster',()=>{
 it('reconciles all 546 original entries, exact Unicode names/order, IDs and assignments in every new career',()=>{
  expect(validatePlayableRoster()).toEqual([]);
  const c=newCareer('Quentin','elite','liverpool',27),actual=c.players.filter(p=>p.real);
  expect(actual).toHaveLength(546);expect(new Set(actual.map(p=>p.id)).size).toBe(546);
  for(const club of customRosterDraft.clubs){
   expect(actual.filter(p=>p.clubId===club.clubId).map(p=>p.name)).toEqual(club.players.map(p=>p.displayName));
   expect(actual.filter(p=>p.clubId===club.clubId).map(p=>p.id)).toEqual(club.players.map(p=>p.draftId));
   expect(eligiblePlayers(c,club.clubId)).toHaveLength(club.players.length);
  }
  expect(actual.find(p=>p.name==='Jack Grealish')!.clubId).toBe('everton');
  expect(actual.find(p=>p.name==='Bruno Guimarães')!.clubId).toBe('arsenal');
  expect(actual.find(p=>p.name==='Erling Haaland')!.clubId).toBe('city');
  // Generated free agents remain a separate legacy game system, never replacements.
  expect(c.players.filter(p=>!p.real).every(p=>p.clubId==='')).toBe(true);
 });
 it('has unique individual skill profiles, coherent ceilings, dated citations and justified specialist choices',()=>{
  expect(new Set(startingProfiles.map(p=>outfieldAttributes.map(k=>p.attributes[k]).join(','))).size).toBe(546);
  for(const p of startingProfiles){
   expect(p.overall).toBeGreaterThanOrEqual(1);expect(p.overall).toBeLessThanOrEqual(99);expect(p.potential).toBeGreaterThanOrEqual(p.overall);
   expect(p.startingValue).toBeGreaterThan(0);expect(p.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
   expect(p.sources.every(s=>s.url.startsWith('https://')&&s.retrievedDate==='2026-10-28')).toBe(true);
   expect(p.traitRationale.length).toBeGreaterThan(20);expect(new Set(p.traits.map(t=>t.id)).size).toBe(p.traits.length);
   if(p.primaryPosition==='GK')for(const key of keeperAttributes)expect(p.attributes[key]).toBeGreaterThanOrEqual(1);
   if(p.startingAge<=24){expect(p.development.rate).toBeGreaterThan(0);expect(p.development.uncertainty).toBeGreaterThan(0);}
  }
 });
 it('reports reference coverage honestly instead of presenting provisional profiles as EA data',()=>{
  expect(startingProfiles.filter(p=>p.ratingStatus==='official')).toHaveLength(523);
  expect(startingProfiles.filter(p=>p.ratingStatus==='secondary')).toHaveLength(20);
  expect(startingProfiles.filter(p=>p.ratingStatus==='provisional').map(p=>p.displayName)).toEqual(['Max Dowman','Jayden Danns','Mahdi Nicoll-Jazuli']);
  expect(startingProfiles.filter(p=>p.traits.length)).toHaveLength(354);

 });
 it('resolves duplicate-name traps and the user-confirmed Spanish Nico González',()=>{
  expect(profile('Alisson').position).toBe('GK');expect(profile('Alisson').real!.dateOfBirth).toBe('1992-10-02');
  expect(profile('Emiliano Martínez').position).toBe('GK');expect(profile('Emiliano Martínez').real!.nationality).toBe('Argentina');
  expect(profile('Mathias Jensen').real!.dateOfBirth).toBe('1996-01-01');
  expect(profile('Reece James').real!.dateOfBirth).toBe('1999-12-08');
  expect(profile('Nico González').real!.dateOfBirth).toBe('2002-01-03');expect(profile('Nico González').real!.nationality).toBe('Spain');
  expect(profile('Allan').real!.dateOfBirth).toBe('2004-04-19');
 });
 it('can select valid starting elevens for every club in every supported formation without inventing positions',()=>{
  const players=customStartingPlayers();
  for(const club of clubs)for(const formation of formations){const lineup=autoLineup(players,club.id,formation);expect(validLineup(players,club.id,lineup)).toBe(true);}
  const rice=profile('Declan Rice');expect(naturalFit(rice,'CDM')).toBe(1);expect(naturalFit(rice,'CM')).toBeGreaterThan(naturalFit(rice,'RW'));
  const mitoma=profile('Kaoru Mitoma');expect(naturalFit(mitoma,'LW')).toBeGreaterThan(naturalFit(mitoma,'RB'));
 });
 it('keeps custom data independent of career seeds, club strength and other career snapshots',()=>{
  const a=customStartingPlayers(),b=customStartingPlayers();a[0].real!.attributes.reflexes=1;a[0].identity!.attributes.reflexes=1;
  expect(b[0].real!.attributes.reflexes).toBeGreaterThan(1);expect(b[0].identity!.attributes.reflexes).toBeGreaterThan(1);
  const first=newCareer('One','elite','liverpool',1),second=newCareer('Two','elite','liverpool',2);
  expect(first.players.filter(p=>p.real)).toEqual(second.players.filter(p=>p.real));
 });
});

describe('individual player abilities affect football outcomes',()=>{
 it('distinguishes a clinical striker, a creative midfielder, a defensive midfielder and a distributing goalkeeper',()=>{
  const haaland=profile('Erling Haaland'),odegaard=profile('Martin Ødegaard'),rice=profile('Declan Rice'),pickford=profile('Jordan Pickford');
  expect(skill(haaland,'finishing')).toBeGreaterThan(skill(odegaard,'finishing'));
  expect(creationQuality(odegaard)).toBeGreaterThan(creationQuality(haaland));
  expect(defenceQuality(rice)).toBeGreaterThan(defenceQuality(haaland));
  expect(skill(pickford,'kicking')).toBeGreaterThan(skill(pickford,'handling'));
  expect(conversionProbability(haaland,pickford,78)).toBeGreaterThan(conversionProbability(rice,pickford,78));
 });
 it('changes finishing and keeping probabilities using individual skills while preserving uncertainty',()=>{
  const shooter=profile('Erling Haaland'),keeper=profile('Jordan Pickford'),plain=structuredClone(shooter);plain.real!.traits=[];
  expect(conversionProbability(shooter,keeper,78)).toBeGreaterThan(conversionProbability(plain,keeper,78));
  const weak=structuredClone(keeper);for(const key of keeperAttributes)weak.real!.attributes[key]=40;
  expect(keepingQuality(keeper)).toBeGreaterThan(keepingQuality(weak));expect(conversionProbability(shooter,weak,78)).toBeGreaterThan(conversionProbability(shooter,keeper,78));
  const tired={...shooter,fitness:30};expect(conversionProbability(tired,keeper,78)).toBeLessThan(conversionProbability(shooter,keeper,78));
  for(const type of ['close','distance','aerial','one-on-one'] as const){const probability=conversionProbability(shooter,keeper,78,type);expect(probability).toBeGreaterThan(0);expect(probability).toBeLessThan(.5);}
 });
 it('makes acceleration, technical carrying and creativity consequential independently of overall',()=>{
  const doku=profile('Jérémy Doku'),slow=structuredClone(doku);slow.real!.attributes.acceleration=30;slow.real!.attributes.sprintSpeed=30;slow.real!.attributes.dribbling=30;
  expect(carryingQuality(doku)).toBeGreaterThan(carryingQuality(slow));
  const creator=profile('Martin Ødegaard'),limited=structuredClone(creator);limited.real!.attributes.vision=40;limited.real!.attributes.shortPassing=40;
  expect(creationQuality(creator)).toBeGreaterThan(creationQuality(limited));expect(creator.overall).toBe(limited.overall);
 });
 it('records actual probabilistic goals, shots, saves and assists in immutable watch/quick reports',()=>{
  const c=newCareer('Test','elite','liverpool',27),a=prepareWeek(c),b=prepareWeek(c,false);expect(a.pending!.fixtures).toEqual(b.pending!.fixtures);
  for(const f of a.pending!.fixtures){expect(f.report!.events.filter(e=>e.type==='goal'&&e.clubId===f.homeId)).toHaveLength(f.homeGoals!);expect(f.report!.events.filter(e=>e.type==='goal'&&e.clubId===f.awayId)).toHaveLength(f.awayGoals!);expect(f.report!.events.every(e=>e.xG!>0&&e.xG!<.5)).toBe(true);}
 });
 it('retains the imported OVR calibration during development and responds to minutes, coaching and injuries',()=>{
  const c=newCareer('Test','elite','liverpool',27),p=profile('Ryan McAidoo');
  expect(developPlayer(p,c,0,6.3,75).overall).toBe(p.overall);
  let regular=p,bench=p;for(let week=0;week<38;week++){regular=developPlayer(regular,{...c,week},90,8,85);bench=developPlayer(bench,{...c,week},0,6.3,75);}
  expect(regular.overall).toBeGreaterThanOrEqual(bench.overall);expect(regular.overall).toBeLessThanOrEqual(regular.potential);
  const injured={...p,identity:{...identity(p),injuryWeeks:4}};
  expect(identity(developPlayer(injured,c,0,6.3,75)).attributes.control).toBeLessThan(identity(developPlayer(p,c,90,8,85)).attributes.control);
 });
 it('updates estimated sterling valuations for development, form, age and contracts instead of freezing them',()=>{
  const p=profile('Harrison Armstrong'),initial=valuation(p);
  expect(valuation({...p,overall:p.overall+3})).toBeGreaterThan(initial);
  expect(valuation({...p,contractYears:0})).toBeLessThan(initial);
  expect(valuation({...p,identity:{...identity(p),development:{...identity(p).development,form:8}}})).toBeGreaterThan(initial);
 });
});

describe('careers, transfers and mobile profile protection',()=>{
 it('preserves legacy players, IDs, saves and committed reports when new starting rosters ship',()=>{
  const old=advance(legacyCareer());saveCareer(old);const stored=localStorage.getItem(SAVE_KEY);
  newCareer('New','elite','liverpool',27);expect(localStorage.getItem(SAVE_KEY)).toBe(stored);expect(loadCareer().career).toEqual(old);
 });
 it('round trips all 546 profiles and a pending week within browser storage limits',()=>{
  const c=prepareWeek(newCareer('Test','elite','liverpool',27));saveCareer(c);expect(loadCareer().career).toEqual(c);expect(localStorage.getItem(SAVE_KEY)!.length).toBeLessThan(2_000_000);
 });
 it('keeps an oversized custom squad intact and makes registration uncertainty explicit',()=>{
  const c=newCareer('Test','unknown','hull',27);expect(eligiblePlayers(c,'hull')).toHaveLength(33);expect(c.world.customRoster!.seniorLimits.hull).toBe(29);
  const p=c.players.find(p=>!p.clubId&&p.age>24)!;expect(canRegister(c,p,'hull')).toMatch(/29-player/);
  const old=legacyCareer();expect(old.world.customRoster).toBeUndefined();
 });
 it('supports a genuine cash transfer of a researched player without losing his identity or profile',()=>{
  const c=newCareer('Test','unknown','sunderland',27),p=c.players.find(p=>p.name==='Giovanni Leoni')!;
  const offered=submitOffer(c,p.id,3_000_000),offer=offered.world.offers[0];
  const accepted=offer.status==='accepted'?offered:submitOffer(c,p.id,offer.asking),o=accepted.world.offers[0],w=wageDemand(accepted,p);
  const signed=finalizeSigning(accepted,o.id,w,3,w*5),actual=signed.players.find(x=>x.id===p.id)!;
  expect(actual.clubId).toBe('sunderland');expect(actual.real).toEqual(p.real);expect(identity(actual).appearanceSeed).toBe(identity(p).appearanceSeed);
 });
 it('shows individual attributes, traits, position alternatives and evidence on a mobile profile',()=>{
  const c=newCareer('Test','elite','liverpool',27),p=c.players.find(p=>p.name==='Erling Haaland')!;
  render(<PlayerProfile player={p} career={c} onClose={()=>{}}/>);
  expect(screen.getByText('FC 27 official reference · Starting OVR 91')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Attributes'}));expect(screen.getByLabelText('Finishing rating').getAttribute('value')).toBe('96');
  expect(screen.getByText('Rating evidence & estimates')).toBeTruthy();expect(screen.getAllByText(/Clinical Finisher/).length).toBeGreaterThan(0);
 });
 it('gives a provisional youth profile an honest label and preserves the illustrated avatar through transfers',()=>{
  const c=newCareer('Test','elite','arsenal',27),p=c.players.find(p=>p.name==='Max Dowman')!;
  const portrait=render(<PlayerAvatar player={p}/>),before=portrait.container.innerHTML;portrait.rerender(<PlayerAvatar player={{...p,clubId:'hull'}}/>);expect(portrait.container.innerHTML).toBe(before);portrait.unmount();
  render(<PlayerProfile player={p} career={c} onClose={()=>{}}/>);expect(screen.getByText(/Provisional game assessment/)).toBeTruthy();
 });
 it('keeps every original player and valid lineups through three custom seasons',()=>{
  let c=newCareer('Long career','elite','liverpool',8080);const ids=c.players.filter(p=>p.real).map(p=>p.id);
  for(let season=0;season<3;season++){
   for(let week=0;week<38;week++)c=advance(c);
   expect(c.players.filter(p=>p.real).map(p=>p.id)).toEqual(ids);
   expect(c.players.every(p=>Number.isFinite(p.overall)&&p.overall>=1&&p.overall<=p.potential)).toBe(true);
   // Exercise world rollover even if this test manager is dismissed; dismissal itself is covered by the season tests.
   if(season<2){c=rolloverSeason({...c,status:'survived'});for(const club of clubs){const available=eligiblePlayers(c,club.id);expect(validLineup(available,club.id,autoLineup(available,club.id,'4-3-3'))).toBe(true);}}
  }
  saveCareer(c);expect(loadCareer().error).toBe('');
 },30000);
});
