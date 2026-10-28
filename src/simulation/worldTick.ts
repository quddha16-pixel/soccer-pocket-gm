import { settleLegacySeason, startLegacySeason, legacyState } from './legacy';
import { archiveSeasonReview } from './records';
import type { Career, Player, Position } from '../models';
import { clubById, leagueClubs, managedClubs } from '../data/clubs';
import { promotionDraw } from './promotion';
import { promotedSquad } from '../data/promotedPlayers';
import { initializeClubFinance } from './world';
import { generateStaff } from './staff';
import { financeRules, inWindow, weekDate } from '../data/rules';
import { identity, enrichPlayer, hash } from './identity';
import { random } from './random';
import { autoLineup, eligibleStars, valuation } from './management';
import { askingPrice, trainingExempt, financialSummary, finalizeSigning, payroll, repairLineup, submitOffer, wageDemand } from './economy';
import { generateFixtures, standings } from './league';
import { aiBidLimit, transferDecision, transferContext } from './transferPolicy';
export function settleFinances(c:Career):Career{
 const world=structuredClone(c.world);world.date=weekDate(world.season,c.week);
 for(const club of leagueClubs(c)){const f=world.finances[club.id],w=payroll(c,club.id),income=f.revenue/38,expense=(w.players+w.staff)*52/38;const after=f.cash+income-expense;
 const debt=(f.debt??0)+Math.max(0,-after),repayment=Math.min(debt,Math.max(0,after));f.cash=Math.max(0,after)-repayment;f.debt=debt-repayment;f.paidPayroll+=expense;
 if(f.debt>0)f.budget=0;else f.budget=Math.min(f.budget,f.cash);
 }
 for(const club of leagueClubs(c))if(club.id!==c.clubId)for(const role of ['Assistant Manager','Shooting Coach','Dribbling Coach','Defensive Coach','Scout','Team Doctor'] as const){
 if(!world.staff.some(s=>s.clubId===club.id&&s.role===role)){const candidate=world.staff.filter(s=>!s.clubId&&s.role===role&&s.wage<world.finances[club.id].wageCap*.1).sort((a,b)=>b.rating-a.rating)[0];if(candidate){candidate.clubId=club.id;candidate.contractEnd=`${world.season+2}-06-30`;candidate.appointedSeason=world.season;candidate.appointedWeek=c.week;}}
 }
 return {...c,world,transferBudget:world.finances[c.clubId].budget};
}
export function aiTransfers(c:Career):Career{
 if(!inWindow(c.world.date,c.world.season))return c;
 let result=c;const rng=random(c.seed+c.world.season*137+c.week*971);
 for(const club of leagueClubs(c)){if(club.id===c.clubId||rng()>.5)continue;
 const squad=result.players.filter(p=>p.clubId===club.id),positions:Position[]=['GK','CB','FB','CM','WG','ST'];
 const weakest=positions.map(position=>{const depth=squad.filter(p=>p.position===position).sort((a,b)=>b.overall-a.overall),needed=position==='GK'||position==='ST'?1:position==='CM'?3:2;return {position,rating:depth[needed-1]?.overall??50};}).sort((a,b)=>a.rating-b.rating)[0];
 const budget=result.world.finances[club.id].budget;
 const temp={...result,clubId:club.id,reputation:(club.strength<75?'unknown':club.strength<82?'established':'elite') as Career['reputation'],transferBudget:budget};
 const context=transferContext();
 const targets=result.players.filter(p=>p.clubId!==club.id&&p.clubId!==c.clubId&&!identity(p).retired&&p.position===weakest.position&&p.overall>weakest.rating+1).filter(p=>{const decision=transferDecision(temp,p,club.id,context),price=askingPrice(temp,p,decision);return decision.available&&price<budget*.6&&price<=aiBidLimit(temp,p,club.id,valuation(p));}).sort((a,b)=>(b.overall+(b.age<24?3:0))-(a.overall+(a.age<24?3:0)));
 const listed=result.players.filter(p=>p.clubId===c.clubId&&result.world.listed?.[p.id]!==undefined&&p.position===weakest.position&&p.overall>weakest.rating+1&&result.world.listed[p.id]<budget*.6&&result.world.listed[p.id]<=aiBidLimit(temp,p,club.id,valuation(p))&&transferDecision(temp,p).available).sort((a,b)=>b.overall-a.overall)[0];
 if(listed&&(!targets[0]||listed.overall>=targets[0].overall)&&!result.world.offers.some(o=>o.playerId===listed.id&&o.buyerId===club.id&&o.status==='incoming')){
  const fee=Math.min(aiBidLimit(temp,listed,club.id,valuation(listed)),Math.round(result.world.listed![listed.id]*(.9+rng()*.15)/10000)*10000),world=structuredClone(result.world);
  world.offers.unshift({id:`incoming-${world.season}-${c.week}-${club.id}-${listed.id}`,playerId:listed.id,buyerId:club.id,sellerId:c.clubId,fee,asking:world.listed![listed.id],status:'incoming',message:'AI club submits a cash bid. You decide whether to accept; player terms and club budgets are checked on completion.',season:world.season,week:c.week,date:world.date});
  world.news.unshift({id:`bid-${world.season}-${c.week}-${club.id}-${listed.id}`,date:world.date,text:`${club.name} bids £${fee.toLocaleString()} for ${listed.name}.`});result={...result,world};continue;
 }
 for(const p of targets.slice(0,5)){
 try{
 const offered=submitOffer(temp,p.id,askingPrice(temp,p)),offer=offered.world.offers[0],wage=wageDemand(offered,p),years=p.age>=30?2:3;
 const signed=finalizeSigning(offered,offer.id,wage,years,wage*5);
 result={...signed,clubId:c.clubId,manager:c.manager,reputation:c.reputation,lineup:c.lineup,starId:c.starId,transferBudget:signed.world.finances[c.clubId].budget};
 break;
 }catch{/* A club passes when price, player wishes, cover or registration prevent a deal. */}
 }
 }
 return result;
}
function intake(clubId:string,position:Position,season:number,index:number):Player{
 const rng=random(hash(`${clubId}-${season}-${index}`)),overall=54+Math.floor(rng()*15),tier=rng(),upside=tier<.003?24:tier<.033?18:tier<.20?12:tier<.7?7:3;
 return enrichPlayer({id:`intake-${season}-${clubId}-${index}`,clubId,name:`${['Max','Jamal','Oscar','Eli','Nico','Louis','Cameron','Rayan'][index%8]} ${['Baker','Diallo','Mendes','Lewis','Holt','Torres'][Math.floor(rng()*6)]}`,age:16+Math.floor(rng()*3),position,overall,potential:tier<.003?96+Math.floor(rng()*3):tier<.033?90+Math.floor(rng()*6):Math.min(89,overall+upside),wage:1500+Math.floor(rng()*20)*100,contractYears:3,fitness:98,morale:75},season);
}
export function rolloverSeason(c:Career,nextClubId=c.clubId):Career{
 if(c.pending||c.week!==38||c.status==='active'||(c.status==='fired'&&nextClubId===c.clubId))return c;
 c=settleLegacySeason(archiveSeasonReview(c));
 const clubs=managedClubs(c),current=leagueClubs(c),movement=promotionDraw(c);
 if(!movement.leagueClubIds.includes(nextClubId))throw Error('Choose a club that will be in next season’s Premier League.');
 const penalties=Object.fromEntries(clubs.map(club=>[club.id,Math.max(0,-financialSummary(c,club.id).headroom)*financeRules.excessPenaltyRate]));
 const world=structuredClone(c.world),oldSeason=world.season,season=oldSeason+1,table=standings(current,c.fixtures),rank=table.findIndex(r=>r.clubId===c.clubId)+1;
 world.history.push({season:oldSeason,clubId:c.clubId,position:rank,points:table[rank-1].points,leagueClubIds:current.map(club=>club.id),promoted:movement.promoted,relegated:movement.relegated,results:c.fixtures.map(({report,...result})=>result)});world.season=season;world.date=weekDate(season,0);world.leagueClubIds=movement.leagueClubIds;world.championshipClubIds=movement.championshipClubIds;
 let players:Player[]=c.players.map(p=>{
 const a=structuredClone(identity(p)),age=p.age+1;if(p.clubId&&p.age<21){const time=a.joinedSeason===oldSeason?Math.max(0,(38-a.joinedWeek)/38):1;a.trainingYears=Math.min(3,a.trainingYears+time);}a.development.history.push({season:oldSeason,week:38,overall:p.overall,minutes:a.development.minutes});a.development.history=a.development.history.filter((h,i,all)=>h.week===38||i>=all.length-12).slice(-36);a.development.minutes=0;a.development.seasonStart=p.overall;a.development.baseline={...a.attributes};a.injuryWeeks=0;a.bookValue=Math.max(0,a.bookValue-a.annualAmortization);
 let clubId=p.clubId,years=p.clubId?Math.max(0,Number(a.contractEnd.slice(0,4))-season):0;
 if(age>=40){clubId='';a.retired=true;years=0;}
 else if(clubId&&a.contractEnd<=`${season}-06-30`){
  // AI retains affordable core players, while the user must renew expiring deals.
  const ai=clubId!==c.clubId,depth=c.players.filter(x=>x.clubId===clubId).sort((x,y)=>y.overall-x.overall).slice(0,21).some(x=>x.id===p.id);
  if(ai&&depth){a.contractEnd=`${season+2}-06-30`;years=2;}
  else {a.freeSince=`${season}-06-30`;clubId='';years=0;world.news.unshift({id:`expired-${season}-${p.id}`,date:`${season}-06-30`,text:`${p.name} becomes a free agent after contract expiry.`});}
 }
 return {...p,age,clubId,contractYears:years,identity:a};
 });
 const entrants=movement.promoted.map(clubById).filter(club=>!world.finances[club.id]);
 for(const club of entrants){
  players.push(...promotedSquad(club.id,season,players));
  world.finances[club.id]=initializeClubFinance(club,players);clubs.push(club);
 }
 if(entrants.length)world.staff.push(...generateStaff(season,'','',entrants,false));
 // The source pool contains real squads; its unknown training histories use the
 // same explicit custom-game exemption as the owner's original custom players.
 if(entrants.length&&!world.customRoster)world.customRoster={seniorLimits:{},unverifiedTrainingExempt:true};
 if(world.customRoster)for(const club of entrants)world.customRoster.seniorLimits[club.id]=Math.max(25,players.filter(p=>p.clubId===club.id&&identity(p).birthDate<`${season-21}-01-01`).length);
 // A modest youth intake replaces departing/retiring players; there is no academy management screen.
 for(const club of clubs){if(entrants.includes(club)&&players.filter(p=>p.clubId===club.id&&p.position!=='GK').length>=16&&players.filter(p=>p.clubId===club.id&&p.position==='GK').length>=2)continue;let index=0;const count=(position:Position)=>players.filter(p=>p.clubId===club.id&&p.position===position).length;const needed:Position[]=[];for(const position of ['GK','CB','FB','CM','WG','ST'] as Position[]){const target=position==='GK'?3:position==='CM'?5:position==='CB'||position==='FB'?4:3;while(count(position)+needed.filter(p=>p===position).length<target)needed.push(position);}
 for(const position of needed)players.push(intake(club.id,position,season,index++));
 }
 for(const club of clubs){const f=world.finances[club.id];
 const penalty=penalties[club.id]??0;f.penalties+=penalty;f.debt=(f.debt??0)+Math.max(0,penalty-f.cash);f.cash=Math.max(0,f.cash-penalty);f.budget=(f.debt??0)>0?0:Math.min(f.cash,club.budget*1e6);f.spending=0;f.income=0;f.saleProfit=0;f.agentFees=0;f.bonuses=0;f.paidPayroll=0;f.operatingCosts=0;
 world.registration[club.id]=players.filter(p=>p.clubId===club.id).sort((a,b)=>(b.position==='GK'?1:0)-(a.position==='GK'?1:0)||b.overall-a.overall).reduce<string[]>((ids,p)=>{const senior=players.filter(x=>ids.includes(x.id)&&identity(x).birthDate<`${season-21}-01-01`),non=senior.filter(x=>identity(x).trainingYears<3&&!trainingExempt({...c,world,players},x));if(identity(p).birthDate>=`${season-21}-01-01`||(senior.length<(world.customRoster?.seniorLimits[club.id]??25)&&(identity(p).trainingYears>=3||trainingExempt({...c,world,players},p)||non.length<17)))ids.push(p.id);return ids;},[]);
 }
 world.staff=world.staff.map(s=>{
 if(s.controlled)return {...s,age:s.age+1,contractEnd:`${season+1}-06-30`};
 if(s.clubId===c.clubId&&s.contractEnd<=`${season}-06-30`)return {...s,age:s.age+1,clubId:''};
 if(s.clubId&&s.contractEnd<=`${season}-06-30`)return {...s,age:s.age+1,contractEnd:`${season+2}-06-30`};return {...s,age:s.age+1};
 });
 // AI fills vacancies using the same seven role slots and compensates contracted moves through the staff market in user play.
 for(const club of clubs)if(club.id!==c.clubId){for(const role of ['Assistant Manager','Shooting Coach','Dribbling Coach','Defensive Coach','Scout','Team Doctor'] as const){if(!world.staff.some(s=>s.clubId===club.id&&s.role===role)){const candidate=world.staff.filter(s=>!s.clubId&&s.role===role).sort((a,b)=>b.rating-a.rating)[0];if(candidate&&candidate.wage<world.finances[club.id].wageCap*.1){candidate.clubId=club.id;candidate.appointedSeason=season;candidate.appointedWeek=0;candidate.contractEnd=`${season+2}-06-30`;}}}
 const manager=world.staff.find(s=>s.clubId===club.id&&s.role==='Manager');if(manager&&table.findIndex(r=>r.clubId===club.id)>=17){world.news.unshift({id:`manager-${season}-${club.id}`,date:world.date,text:`${club.name} replaces its manager after a disappointing season.`});const replacement={...manager,reference:undefined,id:`manager-${season}-${club.id}`,name:`${['Alex','Rafael','Ben'][season%3]} ${['Foster','Moreno','Scott'][clubs.indexOf(club)%3]}`,rating:Math.max(50,club.strength-6),appointedSeason:season,appointedWeek:0,contractEnd:`${season+2}-06-30`};const termination=Math.max(0,(Date.parse(manager.contractEnd)-Date.parse(world.date))/(7*864e5))*manager.wage*.5;world.finances[club.id].cash=Math.max(0,world.finances[club.id].cash-termination);world.finances[club.id].operatingCosts+=termination;manager.clubId='';world.staff.push(replacement);}
 }
 world.transferDepartures=[];
 world.offers=world.offers.filter(o=>o.status==='completed').slice(0,80);world.news.unshift({id:`promotion-${season}`,date:world.date,text:`Promoted: ${movement.promoted.map(id=>clubById(id).name).join(', ')}. Relegated: ${movement.relegated.map(id=>clubById(id).name).join(', ')}.`});world.news.unshift({id:`season-${season}`,date:world.date,text:`${season}–${String(season+1).slice(-2)} begins. Three clubs promoted from the Championship pool; three relegated.`});world.news=world.news.slice(0,150);
 world.staff=world.staff.map(s=>({...s,controlled:s.role==='Manager'&&s.clubId===nextClubId}));
 const base={...c,clubId:nextClubId,players,world,week:0,status:'active' as const,pending:undefined,matchPlan:undefined,fixtures:generateFixtures(movement.leagueClubIds),statsStartWeek:1,transferBudget:world.finances[nextClubId].budget};
 const available=players.filter(p=>p.clubId===nextClubId&&world.registration[nextClubId].includes(p.id));const lineup=autoLineup(available,nextClubId,c.formation);return {...base,legacy:startLegacySeason(base,legacyState(c)),lineup,starId:eligibleStars({...base,lineup})[0]?.id??''};
}
