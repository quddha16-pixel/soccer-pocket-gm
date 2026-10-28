import { validLegacy, legacyState, settleLegacySeason } from './simulation/legacy';
import { momentKinds } from './simulation/momentRules';
import { fixtureLineup } from './simulation/substitutionRules';
import { managerStyles, geniusPlaystyles } from './simulation/managerStyles';
import { encodeSave, decodeSave } from './simulation/codec';
import { initializeWorld } from './simulation/world';
import type { Career } from './models';
import { autoLineup, eligibleStars, formations, validLineup } from './simulation/management';
import { clubs, allClubs, leagueClubs, managedClubs, clubById } from './data/clubs';
import { generateFixtures } from './simulation/league';
export const SAVE_KEY='pocket-football-gm-v1';
export function loadCareer():{career:Career|null;error:string}{
 try{
 const raw=localStorage.getItem(SAVE_KEY);if(!raw)return {career:null,error:''};
 const parsed=JSON.parse(decodeSave(raw));const oldVersion=parsed.version;
 let c=parsed as Career;
 if(parsed.version===1){
  c.version=3;c.formation='4-3-3';c.lineup=autoLineup(c.players,c.clubId,c.formation);
  c.starId=eligibleStars(c)[0]?.id??'';c.transferBudget=clubById(c.clubId).budget*1e6;c.statsStartWeek=c.week+1;
 }
 if(oldVersion===1||oldVersion===2)c=initializeWorld(c);
 const progressRaw=localStorage.getItem(`${SAVE_KEY}-playback`);
 if(progressRaw&&c.pending){try{const progress=JSON.parse(progressRaw);if(progress.seed===c.seed&&progress.season===c.world.season&&progress.week===c.pending.week)c.pending={...c.pending,minute:progress.minute,speed:progress.speed,paused:progress.paused,decisionMode:progress.decisionMode,decisionFeedback:progress.decisionFeedback};}catch{/* The authoritative snapshot remains available. */}}
 const ids=new Set(allClubs.map(x=>x.id)),currentIds=c.world?.leagueClubIds??clubs.map(club=>club.id);
 if(c.matchPlan!==undefined){const plan=c.matchPlan,players=new Set(c.players.map(p=>p.id));if(!plan||!Array.isArray(plan.bench)||plan.bench.length>9||new Set(plan.bench).size!==plan.bench.length||plan.bench.some(id=>!players.has(id))||!Array.isArray(plan.changes)||plan.changes.length>5||plan.changes.some(s=>s.clubId!==c.clubId||!players.has(s.offId)||!players.has(s.onId)||!Number.isInteger(s.minute)||s.minute<1||s.minute>89))throw Error();}
 if(c.recentSubPlans!==undefined){
  const plans=c.recentSubPlans,players=new Set(c.players.map(p=>p.id));
  if(!Array.isArray(plans)||plans.length>5||new Set(plans.map(p=>p.id)).size!==plans.length)throw Error();
  for(const p of plans){if(typeof p.id!=='string'||!ids.has(p.clubId)||!Number.isInteger(p.season)||p.season<2026||!Number.isInteger(p.week)||p.week<1||p.week>38||!formations.includes(p.formation)||!['match','saved'].includes(p.source)||!Array.isArray(p.bench)||p.bench.length>9||new Set(p.bench).size!==p.bench.length||p.bench.some(id=>!players.has(id))||!Array.isArray(p.changes)||p.changes.length>5||p.changes.some(s=>s.clubId!==p.clubId||!players.has(s.offId)||!players.has(s.onId)||!Number.isInteger(s.minute)||s.minute<1||s.minute>89)||new Set(p.changes.filter(s=>s.minute!==45).map(s=>s.minute)).size>3||new Set(p.changes.map(s=>s.onId)).size!==p.changes.length)throw Error();}
 }
 if(!Array.isArray(currentIds)||currentIds.length!==20||new Set(currentIds).size!==20||currentIds.some(id=>!ids.has(id))||!currentIds.includes(c.clubId))throw Error();
 if(c.world?.championshipClubIds!==undefined){const pool=c.world.championshipClubIds;if(!Array.isArray(pool)||pool.length!==allClubs.length-20||new Set(pool).size!==pool.length||pool.some(id=>!ids.has(id)||currentIds.includes(id)))throw Error();}
 if((c.world?.leagueClubIds===undefined)!==(c.world?.championshipClubIds===undefined))throw Error();
 if(c.interactiveMoments!==undefined&&typeof c.interactiveMoments!=='boolean')throw Error();
 if(c.managerStyle!==undefined&&!managerStyles.some(s=>s.id===c.managerStyle))throw Error();
 if(c.geniusPlaystyle!==undefined&&(c.managerStyle!=='genius'||!geniusPlaystyles.some(s=>s.id===c.geniusPlaystyle)))throw Error();
 const expected=generateFixtures(currentIds);
 if(c.version!==3||!ids.has(c.clubId)||typeof c.manager!=='string'||!['unknown','established','elite'].includes(c.reputation)||!['balanced','attacking','defensive','feed-star'].includes(c.tactic)||!['active','survived','fired'].includes(c.status)||!Number.isInteger(c.week)||c.week<0||c.week>38||!Number.isFinite(c.seed)||!Array.isArray(c.fixtures)||c.fixtures.length!==380||!Array.isArray(c.players)||c.players.length<220)throw Error();
 if(c.fixtures.some((f,i)=>f.id!==expected[i].id||f.homeId!==expected[i].homeId||f.awayId!==expected[i].awayId||f.week!==expected[i].week||(f.week<=c.week? !Number.isInteger(f.homeGoals)||!Number.isInteger(f.awayGoals)||f.homeGoals!<0||f.awayGoals!<0:f.homeGoals!==undefined||f.awayGoals!==undefined)))throw Error();
 if(new Set(c.players.map(p=>p.id)).size!==c.players.length||leagueClubs(c).some(club=>c.players.filter(p=>p.clubId===club.id).length<11)||c.players.some(p=>(p.clubId!==''&&!ids.has(p.clubId))||typeof p.id!=='string'||typeof p.name!=='string'||!['GK','CB','FB','CM','WG','ST'].includes(p.position)||[p.age,p.overall,p.potential,p.wage,p.contractYears,p.fitness,p.morale].some(v=>!Number.isFinite(v)||v<0)||p.overall>100||p.fitness>100||p.morale>100||(p.transferValue!==undefined&&(!Number.isFinite(p.transferValue)||p.transferValue<0))))throw Error();
 if(!formations.includes(c.formation)||!validLineup(c.players,c.clubId,c.lineup)||!eligibleStars(c).some(p=>p.id===c.starId)||!Number.isFinite(c.transferBudget)||c.transferBudget<0||!Number.isInteger(c.statsStartWeek)||c.statsStartWeek<1||c.statsStartWeek>39)throw Error();
 if(c.pending){
  const p=c.pending;
  if(c.status!=='active'||p.week!==c.week+1||!Number.isInteger(p.minute)||p.minute<0||p.minute>90||![1,2,4].includes(p.speed)||typeof p.paused!=='boolean'||!Array.isArray(p.fixtures)||p.fixtures.length!==10)throw Error();
  if(p.decisionMode!==undefined&&!['interactive','automatic'].includes(p.decisionMode))throw Error();
  if(p.decisionFeedback!==undefined){const f=p.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId),m=f?.report?.keyMoments?.find(m=>m.id===p.decisionFeedback);if(p.decisionMode!=='interactive'||!m||m.clubId!==c.clubId||m.selection===undefined||m.minute!==p.minute+1)throw Error();}
  const expectedRound=c.fixtures.filter(f=>f.week===p.week);
  if(p.fixtures.some((f,i)=>f.id!==expectedRound[i].id||f.homeId!==expectedRound[i].homeId||f.awayId!==expectedRound[i].awayId||f.week!==p.week||!Number.isInteger(f.homeGoals)||!Number.isInteger(f.awayGoals)||f.homeGoals!<0||f.awayGoals!<0||!f.report))throw Error();
 }
 for(const f of [...c.fixtures,...(c.pending?.fixtures??[])])if(f.report){
  const r=f.report,ids=new Set(c.players.map(p=>p.id));
  if(r.simulationSeed!==undefined&&(!Number.isInteger(r.simulationSeed)||r.simulationSeed<0||r.simulationSeed>4294967295))throw Error();
  if(!Array.isArray(r.events)||!Array.isArray(r.performances)||(r.performances.length<22||r.performances.length>32)||new Set(r.performances.map(p=>p.playerId)).size!==r.performances.length||!r.performances.some(p=>p.playerId===r.motmId)||!Number.isFinite(r.homePossession)||r.homePossession<0||r.homePossession>100)throw Error();
  if(r.events.some(e=>!ids.has(e.playerId)||(e.assistId&&!ids.has(e.assistId))||(e.creatorId&&!ids.has(e.creatorId))||![f.homeId,f.awayId].includes(e.clubId)||!Number.isInteger(e.minute)||e.minute<1||e.minute>90||!['goal','shot'].includes(e.type)))throw Error();
  if(r.substitutions!==undefined){
   if(!Array.isArray(r.substitutions)||r.substitutions.some(s=>![f.homeId,f.awayId].includes(s.clubId)))throw Error();
   for(const clubId of [f.homeId,f.awayId]){
    const start=clubId===f.homeId?r.homeLineup:r.awayLineup,bench=clubId===f.homeId?r.homeBench:r.awayBench,changes=r.substitutions.filter(s=>s.clubId===clubId);
    if(!start||start.length!==11||new Set(start).size!==11||!bench||bench.length>9||new Set(bench).size!==bench.length||bench.some(id=>!ids.has(id)||start.includes(id))||changes.length>5||new Set(changes.filter(s=>s.minute!==45).map(s=>s.minute)).size>3)throw Error();
    const active=[...start],used=new Set(start);
    for(const s of [...changes].sort((a,b)=>a.minute-b.minute)){
     const index=active.indexOf(s.offId);if(!Number.isInteger(s.minute)||s.minute<1||s.minute>89||index<0||!bench.includes(s.onId)||used.has(s.onId)||(index===0)!==(c.players.find(p=>p.id===s.onId)?.position==='GK'))throw Error();active[index]=s.onId;used.add(s.onId);
    }
    for(const perf of r.performances.filter(p=>p.clubId===clubId)){const entered=changes.find(s=>s.onId===perf.playerId)?.minute??0,exited=changes.find(s=>s.offId===perf.playerId)?.minute??90;if(!used.has(perf.playerId)||perf.minutes!==exited-entered||perf.entered!==entered||perf.exited!==exited)throw Error();}
    if(r.performances.filter(p=>p.clubId===clubId).reduce((s,p)=>s+(p.minutes??90),0)!==990)throw Error();
   }
   if(r.events.some(e=>!fixtureLineup(f,e.clubId,e.minute-1).includes(e.playerId)||(e.creatorId&&!fixtureLineup(f,e.clubId,e.minute-1).includes(e.creatorId))||(e.assistId&&!fixtureLineup(f,e.clubId,e.minute-1).includes(e.assistId))))throw Error();
  }
  if(r.keyMoments!==undefined){
   if(!Array.isArray(r.keyMoments)||r.keyMoments.length>64||new Set(r.keyMoments.map(m=>m.id)).size!==r.keyMoments.length||new Set(r.keyMoments.map(m=>m.eventId)).size!==r.keyMoments.length)throw Error();
   for(const m of r.keyMoments){
    if(typeof m.id!=='string'||typeof m.eventId!=='string'||!momentKinds.includes(m.kind)||![f.homeId,f.awayId].includes(m.clubId)||!Number.isInteger(m.minute)||m.minute<1||m.minute>90||!Number.isFinite(m.baseXg)||m.baseXg<0||m.baseXg>1||![0,1,2].includes(m.autoChoice)||(m.selection!==undefined&&![0,1,2].includes(m.selection))||!['set','advancing','committing'].includes(m.keeperApproach)||!['space','closing'].includes(m.pressure)||!['goal','saved','wide','blocked','intercepted'].includes(m.outcome))throw Error();
    const own=fixtureLineup(f,m.clubId,m.minute-1),other=fixtureLineup(f,m.clubId===f.homeId?f.awayId:f.homeId,m.minute-1);
    if([m.actorId,m.receiverId,m.alternateId,m.supportId].some(id=>!ids.has(id)||!own.slice(1).includes(id))||m.keeperId!==other[0])throw Error();
    const events=r.events.filter(e=>e.momentId===m.id),shot=['goal','saved','wide'].includes(m.outcome);
    if(events.length!==Number(shot))throw Error();
    if(shot){const e=events[0];if(e.id!==m.eventId||e.minute!==m.minute||e.clubId!==m.clubId||![m.actorId,m.receiverId,m.alternateId,m.supportId].includes(e.playerId)||(e.type==='goal')!==(m.outcome==='goal')||e.onTarget!==(m.outcome!=='wide')||!Number.isFinite(e.xG)||e.xG!<0||e.xG!>1)throw Error();}
   }
   if(r.events.some(e=>e.momentId&&!r.keyMoments!.some(m=>m.id===e.momentId)))throw Error();
  }
  if(r.events.filter(e=>e.type==='goal'&&e.clubId===f.homeId).length!==f.homeGoals||r.events.filter(e=>e.type==='goal'&&e.clubId===f.awayId).length!==f.awayGoals||r.performances.some(p=>!ids.has(p.playerId)||!Number.isFinite(p.rating)))throw Error();
 }
 if(!c.world||!Number.isInteger(c.world.season)||c.world.season<2026||!/^\d{4}-\d{2}-\d{2}$/.test(c.world.date)||!c.world.chemistry||!Array.isArray(c.world.staff)||!Array.isArray(c.world.offers))throw Error();
 if(!c.world.finances||leagueClubs(c).some(club=>!c.world.finances[club.id])||Object.keys(c.world.finances).some(id=>!ids.has(id))||managedClubs(c).some(club=>{const f=c.world.finances[club.id];return !f||Object.values(f).some(n=>!Number.isFinite(n))||[f.cash,f.budget,f.revenue,f.wageCap].some(n=>n<0);}))throw Error();
 if(c.world.offers.some(o=>!Number.isFinite(o.fee)||o.fee<0||!ids.has(o.buyerId)||(o.sellerId!==''&&!ids.has(o.sellerId))))throw Error();
 if(c.players.some(p=>!p.identity||!Number.isFinite(p.identity.appearanceSeed)||!Number.isFinite(p.identity.development.minutes)||Object.values(p.identity.attributes).some(n=>!Number.isFinite(n)||n<0||n>100)))throw Error();
 if((c.week===38)===(c.status==='active'))throw Error();
 if(!validLegacy(c))throw Error();
 if(!c.legacy)c={...c,legacy:legacyState(c)};
 c=settleLegacySeason(c);
 return {career:c,error:''};
 }catch{return {career:null,error:'Your saved career could not be loaded. Start a new career to replace it.'};}
}
let lastSnapshot:Career|null=null;
export function saveCareer(c:Career){
 const sameRound=localStorage.getItem(SAVE_KEY)&&lastSnapshot&&['seed','week','manager','reputation','clubId','status','tactic','formation','starId'].every(key=>c[key as keyof Career]===lastSnapshot![key as keyof Career])&&c.lineup===lastSnapshot.lineup&&c.world===lastSnapshot.world&&c.players===lastSnapshot.players&&c.fixtures===lastSnapshot.fixtures&&c.pending?.fixtures===lastSnapshot.pending?.fixtures&&c.pending&&lastSnapshot.pending;
 if(sameRound){localStorage.setItem(`${SAVE_KEY}-playback`,JSON.stringify({seed:c.seed,season:c.world.season,week:c.pending!.week,minute:c.pending!.minute,speed:c.pending!.speed,paused:c.pending!.paused,decisionMode:c.pending!.decisionMode,decisionFeedback:c.pending!.decisionFeedback}));lastSnapshot=c;return;}
 const previous=localStorage.getItem(SAVE_KEY);
 if(previous&&!previous.startsWith('PFGM-LZW1:')){try{const version=JSON.parse(previous).version;if(version<3&&!localStorage.getItem(`${SAVE_KEY}-backup-v${version}`))localStorage.setItem(`${SAVE_KEY}-backup-v${version}`,encodeSave(previous));}catch(error){if(error instanceof DOMException)throw error;}}
 localStorage.setItem(SAVE_KEY,encodeSave(JSON.stringify(c)));localStorage.removeItem(`${SAVE_KEY}-playback`);lastSnapshot=c;
}
