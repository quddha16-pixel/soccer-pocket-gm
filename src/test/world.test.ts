import {legacyCareer} from './legacyCareer';
import {afterEach,describe,it,expect} from 'vitest';
import {newCareer,advance,prepareWeek,commitWeek} from '../simulation/career';
import {acceptIncoming,listPlayer,askingPrice,submitOffer,finalizeSigning,wageDemand,financialSummary,registrationStatus,canRegister,under21,releasePlayer,renewPlayer,eligiblePlayers} from '../simulation/economy';
import {identity,enrichPlayer,overallFromAttributes,primarySkills} from '../simulation/identity';
import {developPlayer} from '../simulation/development';
import {hireStaff,releaseStaff,staffCompensation,staffQuality} from '../simulation/staff';
import {aiTransfers,rolloverSeason} from '../simulation/worldTick';
import {inWindow,seasonRules} from '../data/rules';
import {clubs} from '../data/clubs';
import {teamChemistry} from '../simulation/chemistry';
import {loadCareer,saveCareer,SAVE_KEY} from '../storage';
import {animationFrame} from '../simulation/animation';
import {autoLineup} from '../simulation/management';
const fresh=()=>legacyCareer('Jamie','unknown','hull',1234);
afterEach(()=>localStorage.clear());
function target(c:ReturnType<typeof fresh>){return c.players.find(p=>p.clubId&&p.clubId!==c.clubId&&p.position==='CB'&&p.overall<=74&&askingPrice(c,p)<c.transferBudget*.6)!;}
describe('cash transfers and player contracts',()=>{
 it('rejects and counters club bids, then completes personal terms and balances cash and identities once',()=>{
 const c=fresh(),p=target(c),ask=askingPrice(c,p),portrait=identity(p).appearanceSeed;
 expect(submitOffer(c,p.id,ask*.1).world.offers[0].status).toBe('rejected');
 expect(submitOffer(c,p.id,ask*.8).world.offers[0].status).toBe('countered');
 const offered=submitOffer(c,p.id,ask),offer=offered.world.offers[0],wage=wageDemand(offered,p);expect(offer.status).toBe('accepted');
 expect(()=>finalizeSigning(offered,offer.id,1,3,wage*5)).toThrow(/rejected/);
 const before=c.world.finances[c.clubId],seller=c.world.finances[p.clubId],signed=finalizeSigning(offered,offer.id,wage,3,wage*5),after=signed.world.finances[c.clubId];
 expect(signed.players.find(x=>x.id===p.id)!.clubId).toBe(c.clubId);expect(identity(signed.players.find(x=>x.id===p.id)!).appearanceSeed).toBe(portrait);
 expect(signed.world.finances[p.clubId].cash-seller.cash).toBe(ask);expect(before.cash-after.cash).toBeCloseTo(ask+wage*5+ask*.02+wage*5*.05);
 expect(after.budget).toBeGreaterThanOrEqual(0);expect(()=>finalizeSigning(signed,offer.id,wage,3,wage*5)).toThrow(/no longer/);expect(new Set(signed.players.map(p=>p.id)).size).toBe(signed.players.length);
 saveCareer(signed);expect(loadCareer().career?.players.find(x=>x.id===p.id)?.clubId).toBe(c.clubId);
 });
 it('signs free agents, preserves released players and renews contracts with real wage consequences',()=>{
 const c=fresh(),p=c.players.find(p=>!p.clubId&&p.overall<70)!;const offered=submitOffer(c,p.id,0),wage=wageDemand(c,p),signed=finalizeSigning(offered,offered.world.offers[0].id,wage,3,wage*5);
 expect(signed.world.finances[c.clubId].spending).toBe(0);expect(signed.world.finances[c.clubId].bonuses).toBe(wage*5);
 const own=signed.players.find(p=>p.clubId===c.clubId&&p.position==='CM')!,renewed=renewPlayer(signed,own.id,Math.ceil(own.wage*1.1),4);expect(renewed.players.find(p=>p.id===own.id)!.contractYears).toBe(4);
 const released=releasePlayer(renewed,own.id);expect(released.players.find(p=>p.id===own.id)!.clubId).toBe('');expect(released.players).toHaveLength(c.players.length);expect(released.world.finances[c.clubId].cash).toBeLessThan(renewed.world.finances[c.clubId].cash);
 });
 it('blocks negative-budget, registration, closed-window, depth and pending-match loopholes',()=>{
 let c=fresh();const p=target(c);expect(()=>submitOffer(c,p.id,-1)).toThrow();expect(()=>submitOffer(c,p.id,NaN)).toThrow();expect(()=>submitOffer(c,p.id,c.transferBudget+1)).toThrow(/funds/);
 c={...c,world:{...c.world,date:'2026-10-01'}};expect(()=>submitOffer(c,p.id,askingPrice(c,p))).toThrow(/closed/);
 const pending=prepareWeek(fresh());expect(()=>submitOffer(pending,p.id,1)).toThrow(/locked/);
 const scarce=fresh(),keeper=scarce.players.find(p=>p.clubId===scarce.clubId&&p.position==='GK')!;scarce.players=scarce.players.filter(p=>p.id!==scarce.players.find(p=>p.clubId===scarce.clubId&&p.position==='GK'&&p.id!==keeper.id)!.id);expect(()=>releasePlayer(scarce,keeper.id)).toThrow(/depth/);
 });
 it('lists and sells a player through an incoming bid without overwriting the controlling club',()=>{
 const c=fresh(),p=c.players.find(p=>p.clubId===c.clubId&&p.position==='CM')!,listed=listPlayer(c,p.id,1000000);listed.world.offers.unshift({id:'incoming-test',playerId:p.id,buyerId:'fulham',sellerId:c.clubId,fee:1000000,asking:1000000,status:'incoming',message:'Cash bid',season:2026,week:0});
 const sold=acceptIncoming(listed,'incoming-test');expect(sold.clubId).toBe(c.clubId);expect(sold.manager).toBe(c.manager);expect(sold.players.find(x=>x.id===p.id)!.clubId).toBe('fulham');expect(sold.world.finances[c.clubId].income).toBe(1000000);expect(sold.world.registration[c.clubId]).not.toContain(p.id);expect(sold.lineup).not.toContain(p.id);expect(()=>acceptIncoming(sold,'incoming-test')).toThrow();
 });
 it('resets new signings’ familiarity rather than giving instant perfect chemistry',()=>{const c=fresh(),p=target(c);c.world.chemistry.familiarity[`${p.id}:balanced`]=30;const offered=submitOffer(c,p.id,askingPrice(c,p)),w=wageDemand(c,p),signed=finalizeSigning(offered,offered.world.offers[0].id,w,3,w*5);expect(signed.world.chemistry.familiarity[`${p.id}:balanced`]).toBe(9);const lineup=[...signed.lineup];lineup[2]=p.id;expect(teamChemistry({...signed,lineup},lineup,signed.formation,signed.tactic).score).toBeLessThan(85);});
});
describe('season-specific registration and conservative finances',()=>{
 it('uses inclusive window boundaries and advancing U21 cutoffs, independently of nationality',()=>{
 expect(inWindow('2026-06-15',2026)).toBe(true);expect(inWindow('2026-09-01',2026)).toBe(true);expect(inWindow('2026-09-02',2026)).toBe(false);expect(inWindow('2027-02-01',2026)).toBe(true);expect(inWindow('2027-02-02',2026)).toBe(false);expect(inWindow('2027-08-01',2027)).toBe(true);expect(seasonRules(2027).u21Cutoff).toBe('2006-01-01');
 const c=fresh(),p=c.players[0];p.identity={...identity(p),birthDate:'2005-01-01'};expect(under21(p,2026)).toBe(true);p.identity.birthDate='2004-12-31';expect(under21(p,2026)).toBe(false);
 const seniors=c.players.filter(p=>p.clubId===c.clubId);for(const p of seniors)p.identity={...identity(p),birthDate:'1999-01-01',trainingYears:0,nationality:'England'};
 const candidate=target(c);candidate.identity={...identity(candidate),birthDate:'1999-01-01',trainingYears:0,nationality:'England'};expect(registrationStatus(c,c.clubId).nonHomegrown).toBe(24);expect(canRegister(c,candidate,c.clubId)).toMatch(/17 non-homegrown/);
 });
 it('calculates real wage costs, amortization and headroom and rejects unaffordable commitments',()=>{const c=fresh(),summary=financialSummary(c);expect(summary.players).toBe(c.players.filter(p=>p.clubId===c.clubId).reduce((s,p)=>s+p.wage,0));expect(summary.ratio).toBeGreaterThan(0);const p=target(c),o=submitOffer(c,p.id,askingPrice(c,p));o.world.finances[c.clubId].budget=0;expect(()=>finalizeSigning(o,o.world.offers[0].id,wageDemand(c,p),3,1e6)).toThrow(/funds/);});
});
describe('staff, coaching and medical care',()=>{
 it('has seven primary slots and one controlling manager; hiring and dismissal account for compensation',()=>{
 const c=fresh(),team=c.world.staff.filter(s=>s.clubId===c.clubId);expect(team).toHaveLength(7);expect(team.filter(s=>s.controlled)).toHaveLength(1);
 const s=c.world.staff.find(s=>s.clubId&&s.clubId!==c.clubId&&s.role==='Shooting Coach'&&s.rating<80)!,before=c.world.finances[c.clubId].cash,comp=staffCompensation(s,c.world.date);const hired=hireStaff(c,s.id,s.wage*2,3);
 expect(hired.world.staff.filter(p=>p.clubId===c.clubId&&p.role==='Shooting Coach')).toHaveLength(1);expect(hired.world.finances[s.clubId].cash-c.world.finances[s.clubId].cash).toBe(comp);expect(hired.world.finances[c.clubId].cash).toBeLessThan(before-comp);
 const released=releaseStaff(hired,s.id);expect(released.world.staff.find(p=>p.id===s.id)!.clubId).toBe('');expect(()=>releaseStaff(c,team.find(s=>s.controlled)!.id)).toThrow();expect(()=>hireStaff(c,s.id,1,1)).toThrow(/rejected/);
 });
 it('uses age, minutes, potential, appropriate coaches, form and actual skills for progression',()=>{
 const c=fresh(),base=c.players.find(p=>p.clubId===c.clubId&&p.position==='ST')!;const p={...base,age:18,overall:60,potential:90,identity:undefined};const enriched=enrichPlayer(p),low=structuredClone(c),high=structuredClone(c);for(const s of low.world.staff)if(s.clubId===c.clubId)s.rating=20;for(const s of high.world.staff)if(s.clubId===c.clubId)s.rating=95;
 let a=enriched,b=enriched,bench=enriched;for(let week=0;week<38;week++){a=developPlayer(a,{...high,week},90,8,85);b=developPlayer(b,{...low,week},90,8,85);bench=developPlayer(bench,{...high,week},0,6.3,70);}
 expect(identity(a).attributes.finishing).toBeGreaterThan(identity(b).attributes.finishing);expect(a.overall).toBeGreaterThanOrEqual(bench.overall);expect(identity(a).development.minutes).toBe(3420);expect(a.overall).toBe(overallFromAttributes(a,identity(a).attributes));expect(a.overall).toBeLessThanOrEqual(a.potential);
 const ceiling={...a,potential:a.overall};expect(developPlayer(ceiling,high,90,10,90).overall).toBeLessThanOrEqual(ceiling.potential);
 });
 it('improves recovery using the doctor without removing all injury risk',()=>{const c=fresh(),p=c.players.find(p=>p.clubId===c.clubId)!;let low=0,high=0;for(let week=0;week<60;week++){const a=structuredClone(c),b=structuredClone(c);a.week=week;b.week=week;for(const s of a.world.staff)if(s.role==='Team Doctor')s.rating=10;for(const s of b.world.staff)if(s.role==='Team Doctor')s.rating=99;const injured={...p,identity:{...identity(p),injuryWeeks:4}};low+=identity(developPlayer(injured,a,0,6,70)).injuryWeeks;high+=identity(developPlayer(injured,b,0,6,70)).injuryWeeks;}expect(high).toBeLessThan(low);expect(high).toBeGreaterThan(0);});
});
describe('AI, migration and season integrity',()=>{
 it('produces genuine AI deals with unique ownership and finite budgets',()=>{const c=fresh();c.week=1;c.world.date='2026-08-08';const moved=aiTransfers(c);expect(moved.world.offers.some(o=>o.status==='completed'&&o.buyerId!==c.clubId)).toBe(true);expect(new Set(moved.players.map(p=>p.id)).size).toBe(c.players.length);for(const f of Object.values(moved.world.finances)){expect(f.cash).toBeGreaterThanOrEqual(0);expect(f.budget).toBeGreaterThanOrEqual(0);}});
 it('migrates a genuine v1.1 save and keeps identities, previous matches and pending timeline',()=>{
 const c=prepareWeek(fresh()),{world,...old}=c;const legacy={...old,version:2,players:old.players.filter(p=>p.clubId).map(({identity,...p})=>p)};localStorage.setItem(SAVE_KEY,JSON.stringify(legacy));const loaded=loadCareer();expect(loaded.error).toBe('');expect(loaded.career!.version).toBe(3);expect(loaded.career!.pending).toEqual(legacy.pending);for(const p of legacy.players){const actual=loaded.career!.players.find(x=>x.id===p.id)!;expect(actual.name).toBe(p.name);expect(actual.overall).toBe(p.overall);expect(actual.potential).toBe(p.potential);}saveCareer(loaded.career!);expect(localStorage.getItem(`${SAVE_KEY}-backup-v2`)).toBeTruthy();
 });
 it('commits growth, familiarity and financial movements once despite replay/reload',()=>{const c=prepareWeek(fresh(),false),finished=commitWeek(c);const minutes=finished.players.reduce((s,p)=>s+identity(p).development.minutes,0);expect(minutes).toBe(20*11*90);expect(commitWeek(finished)).toBe(finished);saveCareer(finished);const loaded=loadCareer().career!;expect(loaded.players.reduce((s,p)=>s+identity(p).development.minutes,0)).toBe(minutes);expect(loaded.world.chemistry).toEqual(finished.world.chemistry);});
 it('keeps the economy, contracts, identities and registration stable through three full seasons',()=>{
 let c=legacyCareer('Long game','elite','liverpool',4321);const ids=c.players.map(p=>p.id);let seasons=0;
 for(let year=0;year<3;year++){for(let week=0;week<38;week++)c=advance(c);expect(c.week).toBe(38);expect(c.players.every(p=>p.overall>=30&&p.overall<=p.potential&&Number.isFinite(p.wage))).toBe(true);seasons++;if(c.status==='fired')break;const scores=c.fixtures.map(({report,...f})=>f),training=c.players.filter(p=>p.age<21&&p.clubId).map(p=>({id:p.id,years:identity(p).trainingYears}));c=rolloverSeason(c);for(const p of training)expect(identity(c.players.find(x=>x.id===p.id)!).trainingYears).toBeGreaterThanOrEqual(p.years);expect(c.world.history.at(-1)!.results).toEqual(scores);for(const club of clubs){const r=registrationStatus(c,club.id);expect(r.senior).toBeLessThanOrEqual(25);expect(r.nonHomegrown).toBeLessThanOrEqual(17);expect(eligiblePlayers(c,club.id).length).toBeGreaterThanOrEqual(11);}expect(new Set(c.players.map(p=>p.id)).size).toBe(c.players.length);}
 expect(seasons).toBe(3);expect(ids.every(id=>c.players.some(p=>p.id===id))).toBe(true);for(const f of Object.values(c.world.finances)){expect(f.cash).toBeGreaterThanOrEqual(0);expect(f.budget).toBeGreaterThanOrEqual(0);}saveCareer(c);expect(loadCareer().error).toBe('');
 },30000);
 it('prevents rating inflation over a 20-year individual development stress simulation',()=>{
 let c=fresh();let p=enrichPlayer({...c.players[0],age:16,overall:60,potential:89,identity:undefined});
 for(let season=2026;season<2046;season++){for(let week=0;week<38;week++)p=developPlayer(p,{...c,week,world:{...c.world,season}},90,7.5,80);p={...p,age:p.age+1};expect(p.overall).toBeLessThanOrEqual(89);expect(Object.values(identity(p).attributes).every(n=>n>=30&&n<=100)).toBe(true);}expect(p.age).toBe(36);expect(identity(p).development.history.length).toBeLessThanOrEqual(80);
 },15000);
});
describe('authoritative animation',()=>{
 it('uses actual lineups and actors and reaches only recorded goal/shot outcomes',()=>{const c=prepareWeek(fresh()),f=c.pending!.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))!,original=JSON.stringify(f);for(const e of f.report!.events){const frame=animationFrame(f,e.minute);expect(frame.players).toHaveLength(22);expect(f.report!.events.some(actual=>actual.id===frame.event!.id)).toBe(true);expect(frame.players.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100)).toBe(true);if(frame.event!.type==='goal'){expect(frame.label).toBe('Goal');expect(frame.event!.clubId===f.homeId?frame.ball.y<0:frame.ball.y>100).toBe(true);}}expect(JSON.stringify(f)).toBe(original);expect(animationFrame(f,45.5)).toEqual(animationFrame(f,45.5));});
});

describe('large-save persistence',()=>{
 it('losslessly compresses unicode careers and persists tiny playback updates without resimulating',async()=>{
 const {encodeSave,decodeSave}=await import('../simulation/codec');const raw=JSON.stringify({name:'Émile £ 足球',data:'a long football management save '.repeat(40000)});const encoded=encodeSave(raw);expect(encoded.length).toBeLessThan(raw.length/3);expect(decodeSave(encoded)).toBe(raw);
 const c=prepareWeek(fresh());saveCareer(c);const next={...c,pending:{...c.pending!,minute:12,speed:4 as const,paused:true}};saveCareer(next);expect(loadCareer().career!.pending).toEqual(next.pending);expect(localStorage.getItem(`${SAVE_KEY}-playback`)).toBeTruthy();const finished=commitWeek({...next,pending:{...next.pending,minute:90}});saveCareer(finished);expect(localStorage.getItem(`${SAVE_KEY}-playback`)).toBeNull();
 });
});
