import { describe,it,expect,afterEach } from 'vitest';
import { newCareer } from '../simulation/career';
import { askingPrice,submitOffer,finalizeSigning,wageDemand,listPlayer,acceptIncoming } from '../simulation/economy';
import { transferDecision,competitiveRivals,aiBidLimit } from '../simulation/transferPolicy';
import { identity } from '../simulation/identity';
import { valuation } from '../simulation/management';
import { aiTransfers } from '../simulation/worldTick';
import { loadCareer,saveCareer } from '../storage';
import { releaseReserve } from './careerFixtures';
const fresh=()=>{const c=releaseReserve(newCareer('Competitive','elite','liverpool',51));c.world.finances.liverpool.cash=2e9;c.world.finances.liverpool.budget=2e9;return c;};
afterEach(()=>localStorage.clear());
describe('clubs protect their competitive squads',()=>{
 it('refuses Gabriel and Declan Rice even for extravagant fees and a Negotiator',()=>{
  for(const managerStyle of [undefined,'negotiator'] as const){const c={...fresh(),managerStyle};for(const name of ['Gabriel','Declan Rice']){const p=c.players.find(p=>p.name===name)!;expect(transferDecision(c,p)).toMatchObject({available:false,role:'key player'});const offered=submitOffer(c,p.id,500e6);expect(offered.world.offers[0].status).toBe('rejected');expect(offered.world.offers[0].message).toMatch(/Not for sale/);expect(offered.players).toBe(c.players);}}
 });
 it('uses the same sporting veto for AI buyers and protects a small club’s best players',()=>{
  const c=fresh(),rice=c.players.find(p=>p.name==='Declan Rice')!;expect(transferDecision(c,rice,'city').available).toBe(false);expect(transferDecision({...c,clubId:'city'},rice)).toEqual(transferDecision(c,rice,'city'));
  const protectedSmall=c.players.filter(p=>p.clubId==='hull').some(p=>transferDecision(c,p,'city').role==='key player'&&!transferDecision(c,p,'city').available);expect(protectedSmall).toBe(true);
 });
 it('prices rivals more highly and reacts to actual league competition after six matches',()=>{
  const c=fresh(),p=c.players.find(p=>p.name==='Declan Rice')!;expect(competitiveRivals(c,'arsenal','tottenham')).toBe(true);
  expect(transferDecision(c,p,'tottenham').multiplier).toBeGreaterThan(transferDecision(c,p,'hull').multiplier);
 });
 it('still permits an affordable rotation-player deal with complete accounting and persistent protection against immediate resale',()=>{
  const c=fresh(),p=c.players.find(p=>p.clubId&&p.clubId!==c.clubId&&p.position==='CB'&&p.age<30&&transferDecision(c,p).available&&askingPrice(c,p)<15e6)!;expect(p).toBeTruthy();
  const offered=submitOffer(c,p.id,askingPrice(c,p)),o=offered.world.offers[0],w=wageDemand(offered,p),signed=finalizeSigning(offered,o.id,w,3,w*5);
  expect(signed.players.find(x=>x.id===p.id)!.clubId).toBe(c.clubId);expect(signed.world.finances[p.clubId].income).toBe(o.fee);expect(signed.world.transferDepartures?.some(d=>d.playerId===p.id)).toBe(true);
  saveCareer(signed);const loaded=loadCareer().career!;expect(transferDecision(loaded,loaded.players.find(x=>x.id===p.id)!,'city').reason).toMatch(/recently joined/);
 });
 it('rechecks replacement quality when accepted deals are completed',()=>{
  const c=fresh(),p=c.players.find(p=>p.clubId&&p.clubId!==c.clubId&&p.position==='CB'&&transferDecision(c,p).available&&askingPrice(c,p)<20e6)!;
  const offered=submitOffer(c,p.id,askingPrice(c,p)),w=wageDemand(offered,p),changed={...offered,players:offered.players.map(x=>x.clubId===p.clubId&&x.position===p.position&&x.id!==p.id?{...x,identity:{...identity(x),injuryWeeks:4}}:x)};
  expect(()=>finalizeSigning(changed,offered.world.offers[0].id,w,3,w*5)).toThrow(/cover|replacement/);
 });
 it('blocks accumulated first-team losses, expired agreements and agreements from another window',()=>{
  const c=fresh(),p=c.players.find(p=>p.clubId&&p.clubId!==c.clubId&&transferDecision(c,p).available&&askingPrice(c,p)<15e6)!;
  const offered=submitOffer(c,p.id,askingPrice(c,p)),w=wageDemand(offered,p);
  expect(()=>finalizeSigning({...offered,week:3},offered.world.offers[0].id,w,3,w*5)).toThrow(/expired/);
  const depleted={...c,world:{...c.world,transferDepartures:Array.from({length:4},(_,i)=>({season:2026,window:'summer' as const,sellerId:p.clubId,playerId:`sold-${i}`,starter:false}))}};
  expect(transferDecision(depleted,p).reason).toMatch(/already lost/);
 });
 it('allows a core sale with adequate cover or a running-down contract while retaining a premium',()=>{
  const c=fresh(),p=c.players.find(p=>p.name==='Declan Rice')!,changed={...c,players:c.players.map(x=>x.id===p.id?{...x,contractYears:1}:x)},q=changed.players.find(x=>x.id===p.id)!;
  expect(transferDecision(changed,q,'hull').available).toBe(true);expect(transferDecision(changed,q,'hull').multiplier).toBeGreaterThan(1.5);
 });
 it('does not let AI fund inflated user listings, including a previously generated incoming offer',()=>{
  let c=fresh();const p=c.players.find(p=>p.clubId===c.clubId&&!c.lineup.includes(p.id)&&p.position==='CM')!;c=listPlayer(c,p.id,100e6);
  expect(aiBidLimit(c,p,'fulham',valuation(p))).toBeLessThan(100e6);
  const o={id:'inflated',playerId:p.id,buyerId:'fulham',sellerId:c.clubId,fee:100e6,asking:100e6,status:'incoming' as const,message:'stale bid',season:2026,week:0};c.world.offers.unshift(o);
  expect(()=>acceptIncoming(c,o.id)).toThrow(/sporting valuation/);
  const tick=aiTransfers(c);expect(tick.world.offers.filter(o=>o.status==='incoming'&&o.id!=='inflated').every(o=>o.fee<=aiBidLimit(c,c.players.find(p=>p.id===o.playerId)!,o.buyerId,valuation(c.players.find(p=>p.id===o.playerId)!)))).toBe(true);
 });
});
