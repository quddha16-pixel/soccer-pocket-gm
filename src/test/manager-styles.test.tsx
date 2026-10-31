import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import App from '../App';
import {newCareer,prepareWeek,commitWeek} from '../simulation/career';
import {identity,primarySkills} from '../simulation/identity';
import {developPlayer} from '../simulation/development';
import {askingPrice,wageDemand,submitOffer,finalizeSigning,renewPlayer,renewalWageDemand} from '../simulation/economy';
import {coachedPattern,developmentMultiplier,hasManagerStyle,minimumSigningBonus} from '../simulation/managerStyles';
import {resolveMatch} from '../simulation/match';
import {random} from '../simulation/random';
import {loadCareer,saveCareer} from '../storage';
import {releaseReserve} from './careerFixtures';

afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
describe('persistent managerial specialties',()=>{
 it('offers all three specialties at creation and persists the chosen style through club selection and refresh',()=>{
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Build Your Franchise'}));expect(screen.getByRole('button',{name:/^Developer/})).toBeTruthy();expect(screen.getByRole('button',{name:/^Negotiator/})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/^Football genius/}));fireEvent.click(screen.getByRole('button',{name:/Established manager/}));fireEvent.click(screen.getByRole('button',{name:'Find job offers'}));
  fireEvent.click(within(screen.getByRole('article',{name:'Hull City: Contract offered'})).getByRole('button',{name:'Accept offer'}));expect(loadCareer().career!.managerStyle).toBe('genius');expect(loadCareer().career!.geniusPlaystyle).toBe('positional');
  fireEvent.click(screen.getAllByRole('button',{name:'Squad'})[0]);fireEvent.click(screen.getByRole('button',{name:/Match approach/}));expect(screen.getByLabelText('Exclusive coached playstyle')).toBeTruthy();fireEvent.change(screen.getByLabelText('Exclusive coached playstyle'),{target:{value:'counterpress'}});expect(loadCareer().career!.geniusPlaystyle).toBe('counterpress');
 },15000);
 it('gives developers exactly 20% faster positive growth, retaining the same football inputs and potential ceiling',()=>{
  const c=newCareer('Growth','elite','chelsea',55),p=c.players.filter(p=>p.clubId===c.clubId&&p.age<=20&&p.potential-p.overall>=8).sort((a,b)=>a.overall-b.overall)[0]!;expect(p).toBeTruthy();
  const ordinary=developPlayer(p,c,90,7.5,80),special=developPlayer(p,{...c,managerStyle:'developer'},90,7.5,80),key=primarySkills(p)[0];const normal=identity(ordinary).attributes[key]-identity(p).attributes[key],boost=identity(special).attributes[key]-identity(p).attributes[key];expect(normal).toBeGreaterThan(0);expect(boost/normal).toBeCloseTo(1.2,6);expect(special.overall).toBeLessThanOrEqual(p.potential);
  expect(developmentMultiplier({...c,managerStyle:'developer'},'everton')).toBe(1);expect(developmentMultiplier({...c,managerStyle:'genius'},c.clubId)).toBe(1);
 });
 it('reduces transfer asks, wage demands and minimum bonuses without granting the same benefits to other styles or AI',()=>{
  const c=newCareer('Terms','elite','liverpool',13),neg={...c,managerStyle:'negotiator' as const},p=c.players.find(p=>p.name==='Erling Haaland')!;
  expect(askingPrice(neg,p)/askingPrice(c,p)).toBeCloseTo(.9,4);expect(wageDemand(neg,p)).toBeLessThan(wageDemand(c,p));expect(minimumSigningBonus(neg,10000)).toBe(30000);
  for(const managerStyle of ['developer','genius'] as const){expect(askingPrice({...c,managerStyle},p)).toBe(askingPrice(c,p));expect(wageDemand({...c,managerStyle},p)).toBe(wageDemand(c,p));}
  const ai={...neg,clubId:'arsenal'};expect(hasManagerStyle(ai,'negotiator')).toBe(false);expect(wageDemand(ai,p)).toBe(wageDemand({...ai,managerStyle:undefined},p));
 });
 it('lets an unknown negotiator attract a star to a smaller club while retaining real budgets and registrations',()=>{
  const base=releaseReserve(newCareer('Deal maker','unknown','hull',27)),star=base.players.find(p=>p.name==='Karim Benzema')!,ordinary=submitOffer(base,star.id,0),w=wageDemand(ordinary,star);
  expect(()=>finalizeSigning(ordinary,ordinary.world.offers[0].id,w,2,w*5)).toThrow(/ambition/);
  const neg=submitOffer({...base,managerStyle:'negotiator'},star.id,0),n=wageDemand(neg,star),signed=finalizeSigning(neg,neg.world.offers[0].id,n,2,n*3);expect(signed.players.find(p=>p.id===star.id)!.clubId).toBe('hull');expect(n).toBeLessThan(w);
  const broke={...neg,world:{...neg.world,finances:{...neg.world.finances,hull:{...neg.world.finances.hull,cash:0,budget:0}}}};expect(()=>finalizeSigning(broke,neg.world.offers[0].id,n,2,n*3)).toThrow(/funds/);
 });
 it('lowers renewal demands while preventing repeated renewal discount compounding',()=>{
  const c=newCareer('Renew','elite','liverpool',2),neg={...c,managerStyle:'negotiator' as const},p=c.players.find(p=>p.clubId===c.clubId&&!c.lineup.includes(p.id))!,demand=renewalWageDemand(neg,p);expect(demand).toBeLessThan(renewalWageDemand(c,p));
  const first=renewPlayer(neg,p.id,demand,3),after=first.players.find(x=>x.id===p.id)!;const demand2=renewalWageDemand(first,first.players.find(x=>x.id===p.id)!);expect(demand2).toBe(demand);expect(after.wage).toBe(demand);
 });
 it('restricts coached patterns to a football genius and gives each a distinct bounded tradeoff',()=>{
  const c=newCareer('Pattern','elite','arsenal',1),gen={...c,managerStyle:'genius' as const,geniusPlaystyle:'counterpress' as const};expect(coachedPattern(gen,c.clubId)).toMatchObject({defence:6,fitnessCost:2});expect(coachedPattern(gen,'everton').defence).toBe(0);
  for(const managerStyle of ['developer','negotiator',undefined] as const)expect(coachedPattern({...gen,managerStyle},c.clubId)).toMatchObject({defence:0,creation:0,fitnessCost:0});
  expect(coachedPattern({...gen,geniusPlaystyle:'positional'},c.clubId)).toMatchObject({creation:7,defence:-2});expect(coachedPattern({...gen,geniusPlaystyle:'transitions'},c.clubId)).toMatchObject({intensity:.95,oneOnOne:1.07});
 });
 it('changes actual match probabilities and fitness, keeps replay deterministic and never guarantees results',()=>{
  const c=newCareer('Genius','elite','arsenal',1),gen={...c,managerStyle:'genius' as const,geniusPlaystyle:'counterpress' as const},fixture=c.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
  let different=0;for(let seed=1;seed<=20;seed++){const normal=resolveMatch(fixture,c,random(seed)),special=resolveMatch(fixture,gen,random(seed));expect(resolveMatch(fixture,gen,random(seed))).toEqual(special);if(JSON.stringify(normal.report)!==JSON.stringify(special.report))different++;expect(special.report!.events.every(e=>e.xG!>=.015&&e.xG!<=(special.report!.keyMoments?.some(m=>m.id===e.momentId&&m.kind==='penalty')?.93:.48))).toBe(true);}expect(different).toBeGreaterThan(0);
  const p=prepareWeek(c,false),played=new Set(p.pending!.fixtures.flatMap(f=>f.report!.performances.map(p=>p.playerId))),normal=commitWeek(p),special=commitWeek({...p,managerStyle:'genius',geniusPlaystyle:'counterpress'});
  for(const id of c.lineup){expect(played.has(id)).toBe(true);expect(special.players.find(p=>p.id===id)!.fitness).toBe(normal.players.find(p=>p.id===id)!.fitness-2);}
 });
 it('preserves old careers with neutral behavior and rejects invalid or inaccessible style combinations',()=>{
  const c=newCareer('Legacy style','elite','arsenal',2);saveCareer(c);expect(loadCareer().career!.managerStyle).toBeUndefined();
  for(const managerStyle of ['developer','negotiator','genius'] as const){saveCareer({...c,managerStyle,...(managerStyle==='genius'?{geniusPlaystyle:'transitions' as const}:{})});expect(loadCareer().career!.managerStyle).toBe(managerStyle);}
  saveCareer({...c,managerStyle:'developer',geniusPlaystyle:'counterpress'});expect(loadCareer().career).toBeNull();
 },15000);
});
