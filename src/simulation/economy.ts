import { copyLiveWorld } from './worldCopy';
import { hasManagerStyle, minimumSigningBonus } from './managerStyles';
import type { Career, Player } from '../models';
import { leagueClubs, clubById } from '../data/clubs';
import { financeRules, inWindow, seasonRules, weekDate } from '../data/rules';
import { identity } from './identity';
import { valuation, autoLineup, eligibleStars, validLineup } from './management';
import { standings } from './league';
import { aiBidLimit, transferDecision, transferWindow } from './transferPolicy';
export function clubName(id:string){return id?clubById(id)?.name??id:'Free agent';}
export function under21(p:Player,season:number){return identity(p).birthDate>=seasonRules(season).u21Cutoff;}
// Unknown training histories are never asserted as homegrown. Custom starting
// rosters receive an explicit game exemption; existing careers keep their rules.
export function trainingExempt(c:Career,p:Player){return !!c.world.customRoster?.unverifiedTrainingExempt&&!!p.real?.estimatedFields.includes('homegrownTraining');}
export function registrationStatus(c:Career,clubId:string,players=c.players){
 const registered=new Set(c.world.registration[clubId]??[]),seniors=players.filter(p=>p.clubId===clubId&&!under21(p,c.world.season)&&registered.has(p.id));
 return {senior:seniors.length,nonHomegrown:seniors.filter(p=>identity(p).trainingYears<3&&!trainingExempt(c,p)).length,u21:players.filter(p=>p.clubId===clubId&&under21(p,c.world.season)).length};
}
export function eligiblePlayers(c:Career,clubId:string){return c.players.filter(p=>p.clubId===clubId&&identity(p).injuryWeeks===0&&(under21(p,c.world.season)||(c.world.registration[clubId]??[]).includes(p.id)));}
export function repairLineup(c:Career){const available=eligiblePlayers(c,c.clubId);if(validLineup(available,c.clubId,c.lineup))return c;const lineup=autoLineup(available,c.clubId,c.formation);return {...c,lineup,starId:eligibleStars({...c,lineup}).some(p=>p.id===c.starId)?c.starId:eligibleStars({...c,lineup})[0]?.id??''};}
export function payroll(c:Career,clubId:string){return {players:c.players.filter(p=>p.clubId===clubId).reduce((s,p)=>s+p.wage,0),staff:c.world.staff.filter(s=>s.clubId===clubId).reduce((s,p)=>s+p.wage,0)};}
export function financialSummary(c:Career,clubId=c.clubId){
 const f=c.world.finances[clubId],wages=payroll(c,clubId),manager=c.world.staff.filter(s=>s.clubId===clubId&&s.role==='Manager').reduce((s,p)=>s+p.wage*52,0),amortization=c.players.filter(p=>p.clubId===clubId).reduce((s,p)=>s+identity(p).annualAmortization,0);
 const annualCost=wages.players*52+manager+amortization+f.agentFees+f.bonuses;
 const revenue=Math.max(1,f.revenue+(f.cupIncome??0)+f.saleProfit),ratio=annualCost/revenue;
 return {...f,...wages,manager,amortization,annualCost,ratio,headroom:revenue*(financeRules.scrLimit+financeRules.additionalAllowance)-annualCost,wageCapacity:Math.max(0,f.wageCap-wages.players-wages.staff)};
}
export function canRegister(c:Career,p:Player,clubId:string){
 if(under21(p,c.world.season))return '';
 const r=registrationStatus(c,clubId);const limit=c.world.customRoster?.seniorLimits[clubId]??25;if(r.senior>=limit)return `The ${limit}-player senior registration limit is full.`;
 if(identity(p).trainingYears<3&&!trainingExempt(c,p)&&r.nonHomegrown>=17)return 'The 17 non-homegrown senior player limit is full.';
 return '';
}
export function canSignNow(c:Career,p:Player){if(inWindow(c.world.date,c.world.season))return true;if(p.clubId)return false;
 const r=seasonRules(c.world.season),deadline=c.world.date>r.winter.close?r.winter.close:r.summer.close;return !!identity(p).freeSince&&identity(p).freeSince!<=deadline;
}
export function askingPrice(c:Career,p:Player,decision=transferDecision(c,p)){
 if(!p.clubId)return 0;
 if(c.world.listed?.[p.id]!==undefined)return c.world.listed[p.id];
 const contract=Math.max(.7,Math.min(1.2,p.contractYears/3)),rich=c.world.finances[p.clubId].cash>70e6?1.12:1;
 return Math.round(valuation(p)*decision.multiplier*contract*rich*(p.clubId!==c.clubId&&hasManagerStyle(c,'negotiator')?.9:1)/10000)*10000;
}
export function submitOffer(c:Career,playerId:string,fee:number):Career{
 if(c.pending||c.status!=='active')throw Error('Transfers are locked during a resolved match or ended career.');
 const p=c.players.find(p=>p.id===playerId);if(!p||p.clubId===c.clubId)throw Error('Select a player at another club or a free agent.');
 if(!Number.isFinite(fee)||fee<0)throw Error('Enter a valid transfer fee.');if(!canSignNow(c,p))throw Error('The transfer/registration window is closed for this player.');
 const blocked=canRegister(c,p,c.clubId);if(blocked)throw Error(blocked);
 const f=c.world.finances[c.clubId];if(fee>f.budget||fee>f.cash)throw Error('Transfer fee exceeds available funds.');
 const decision=transferDecision(c,p),asking=askingPrice(c,p,decision),status=!decision.available?'rejected':fee>=asking?'accepted':fee>=asking*.7?'countered':'rejected';
 const message=!decision.available?decision.reason:status==='accepted'?'Club agreement reached. Negotiate personal terms within two matchweeks; sporting circumstances are checked again before signing.':status==='countered'?`Seller counters at £${asking.toLocaleString()}. ${decision.reason}`:'Offer rejected: the selling club values this player more highly.';
 const world=copyLiveWorld(c.world);world.offers=world.offers.filter(o=>!(o.playerId===p.id&&o.buyerId===c.clubId&&o.status!=='completed'));
 world.offers.unshift({id:`offer-${c.world.season}-${c.week}-${p.id}-${c.world.news.length}`,playerId:p.id,buyerId:c.clubId,sellerId:p.clubId,fee,asking,status,message,season:world.season,week:c.week,date:world.date});world.news.unshift({id:`news-${world.news.length}-${world.season}-${c.week}`,date:world.date,text:`${clubName(c.clubId)}: ${status} offer for ${p.name}. ${message}`});
 return {...c,world};
}
export function wageDemand(c:Career,p:Player,buyer=c.clubId){const quality=clubById(buyer).strength,rank=standings(leagueClubs(c),c.fixtures).findIndex(r=>r.clubId===buyer)+1,ambition=p.overall>quality+4?(hasManagerStyle(c,'negotiator',buyer)?1.2:1.65):1.12,competition=p.potential>=87?1.12:1;
 return Math.ceil(Math.max(2000,p.wage)*ambition*competition*(p.clubId?1:1.15)*(c.week>5&&rank>15?1.1:1)*(hasManagerStyle(c,'negotiator',buyer)?.88:1)/100)*100;
}
export function finalizeSigning(c:Career,offerId:string,wage:number,years:number,bonus:number):Career{
 if(c.pending||c.status!=='active')throw Error('Transfer changes are currently locked.');
 const offer=c.world.offers.find(o=>o.id===offerId),p=c.players.find(p=>p.id===offer?.playerId);
 if(!offer||!p||!Number.isFinite(offer.fee)||offer.fee<0||offer.buyerId===offer.sellerId||offer.status!=='accepted'||offer.buyerId!==c.clubId||p.clubId!==offer.sellerId)throw Error('This offer is no longer available.');
 if(offer.season!==c.world.season||c.week<offer.week||c.week-offer.week>2||transferWindow(c)!==((offer.date??weekDate(offer.season,offer.week))>=seasonRules(offer.season).winter.open?'winter':'summer'))throw Error('This club agreement has expired. Submit a fresh offer.');
 if(!Number.isFinite(wage)||!Number.isFinite(bonus)||wage<0||bonus<0||!Number.isInteger(years)||years<1||years>5)throw Error('Use valid wages, bonuses and 1–5 contract years.');
 if(!canSignNow(c,p))throw Error('The signing window has closed.');const problem=canRegister(c,p,c.clubId);if(problem)throw Error(problem);
 if(wage<wageDemand(c,p)||bonus<minimumSigningBonus(c,wage)||(p.age>=32&&years<2)||(p.overall>clubById(c.clubId).strength+10&&c.reputation==='unknown'&&!hasManagerStyle(c,'negotiator')))throw Error('Player rejected the personal terms: ambition, wages, bonus or contract security is insufficient.');
 const decision=transferDecision(c,p);
 if(!decision.available)throw Error(`Seller withdrew. ${decision.reason}`);
 const controlledSeller=c.world.staff.some(s=>s.controlled&&s.clubId===p.clubId),controlledBuyer=c.world.staff.some(s=>s.controlled&&s.clubId===c.clubId);
 if(p.clubId&&!(controlledSeller&&c.world.listed?.[p.id]!==undefined)&&offer.fee<askingPrice(c,p,decision))throw Error('Seller withdrew: circumstances changed and the fee no longer meets the club demand. Submit a fresh offer.');
 if(!controlledBuyer&&offer.fee>aiBidLimit(c,p,c.clubId,valuation(p)))throw Error('Buyer withdrew: the fee exceeds its sporting valuation.');
 const fee=p.clubId?offer.fee:0,agentFee=fee*financeRules.agentFeeRate+bonus*.05,cost=fee+bonus+agentFee,f=c.world.finances[c.clubId],summary=financialSummary(c);
 if(cost>f.budget||cost>f.cash)throw Error('Fee, signing bonus and agent fees exceed available funds.');if(wage>summary.wageCapacity)throw Error('Weekly wage capacity would be exceeded.');
 if(summary.headroom<Math.max(0,wage*52+fee/years+agentFee+bonus))throw Error('This signing would exceed the configured 85% squad cost limit.');
 const world=copyLiveWorld(c.world),oldClub=p.clubId;
 world.finances[c.clubId]={...f,cash:f.cash-cost,budget:f.budget-cost,spending:f.spending+fee,agentFees:f.agentFees+agentFee,bonuses:f.bonuses+bonus};
 if(oldClub){const seller=world.finances[oldClub];seller.cash+=fee;seller.budget+=fee*.75;seller.income+=fee;seller.saleProfit+=fee-identity(p).bookValue;world.registration[oldClub]=(world.registration[oldClub]??[]).filter(id=>id!==p.id);
  world.transferDepartures=[...(world.transferDepartures??[]).filter(d=>d.season===world.season),{season:world.season,window:transferWindow(c),sellerId:oldClub,playerId:p.id,starter:decision.starter}];
 }
 if(world.listed){delete world.listed[p.id];}
 world.registration[c.clubId]=[...(world.registration[c.clubId]??[]),p.id];for(const key of Object.keys(world.chemistry.familiarity))if(key.startsWith(p.id+':'))world.chemistry.familiarity[key]*=.3;
 const players=c.players.map(x=>x.id===p.id?{...x,clubId:c.clubId,wage,contractYears:years,identity:{...identity(x),contractEnd:`${world.season+years}-06-30`,transferArrival:{season:world.season,week:c.week},renewalBaseWage:wage,signingBonus:bonus,bookValue:fee,annualAmortization:fee/years,joinedSeason:world.season,joinedWeek:c.week,freeSince:undefined}}:x);
 world.offers=world.offers.map(o=>o.id===offerId?{...o,status:'completed'}:o);world.news.unshift({id:`signed-${offerId}`,date:world.date,text:`${clubName(c.clubId)} signed ${p.name} from ${clubName(oldClub)} for £${fee.toLocaleString()}.`});
 return {...c,players,world,transferBudget:world.finances[c.clubId].budget};
}
export function releasePlayer(c:Career,id:string):Career{
 if(c.pending||c.status!=='active')throw Error('Player changes are currently locked.');const p=c.players.find(p=>p.id===id);if(!p||p.clubId!==c.clubId)throw Error('Player is not at your club.');
 const squad=c.players.filter(p=>p.clubId===c.clubId);if(squad.length<=20||squad.filter(x=>x.position===p.position).length<=(p.position==='GK'?2:1))throw Error('Keep sufficient squad and positional depth before releasing this player.');
 const cost=Math.max(0,(Date.parse(identity(p).contractEnd)-Date.parse(c.world.date))/(7*864e5))*p.wage*.5,f=c.world.finances[c.clubId];if(cost>f.budget||cost>f.cash)throw Error('Insufficient funds to terminate the contract.');
 const world=copyLiveWorld(c.world);world.finances[c.clubId]={...f,cash:f.cash-cost,budget:f.budget-cost,operatingCosts:f.operatingCosts+cost,saleProfit:f.saleProfit-identity(p).bookValue};world.registration[c.clubId]=world.registration[c.clubId].filter(x=>x!==id);world.news.unshift({id:`release-${id}-${world.news.length}`,date:world.date,text:`${p.name} released and joins the free-agent market.`});
 return repairLineup({...c,players:c.players.map(x=>x.id===id?{...x,clubId:'',contractYears:0,identity:{...identity(x),freeSince:world.date,contractEnd:world.date,bookValue:0,annualAmortization:0}}:x),world,transferBudget:world.finances[c.clubId].budget});
}
export function renewalWageDemand(c:Career,p:Player){const reference=Math.max(p.wage,identity(p).renewalBaseWage??p.real?.weeklyWageEstimate??p.wage);return Math.ceil(reference*(hasManagerStyle(c,'negotiator')?.95:1.05));}
export function renewPlayer(c:Career,id:string,wage:number,years:number):Career{
 if(c.pending||c.status!=='active')throw Error('Contracts are currently locked.');const p=c.players.find(p=>p.id===id);if(!p||p.clubId!==c.clubId||!Number.isFinite(wage)||wage<renewalWageDemand(c,p)||!Number.isInteger(years)||years<1||years>5)throw Error('Renewal rejected. Meet the displayed wage demand and offer 1–5 years.');
 if(wage-p.wage>financialSummary(c).wageCapacity||financialSummary(c).headroom<(wage-p.wage)*52)throw Error('Renewal exceeds wage or squad-cost capacity.');
 return {...c,players:c.players.map(x=>x.id===id?{...x,wage,contractYears:years,identity:{...identity(x),renewalBaseWage:identity(x).renewalBaseWage??x.real?.weeklyWageEstimate??x.wage,contractEnd:`${c.world.season+years}-06-30`,annualAmortization:identity(x).bookValue/years}}:x)};
}

export function listPlayer(c:Career,id:string,asking:number):Career{
 if(c.pending||c.status!=='active')throw Error('Transfer listing is currently locked.');const p=c.players.find(p=>p.id===id);if(!p||p.clubId!==c.clubId||!Number.isFinite(asking)||asking<0)throw Error('Choose your player and a valid asking price.');
 return {...c,world:{...c.world,listed:{...c.world.listed,[id]:asking}}};
}
export function acceptIncoming(c:Career,offerId:string):Career{
 const offer=c.world.offers.find(o=>o.id===offerId);if(!offer||offer.status!=='incoming'||offer.sellerId!==c.clubId)throw Error('Incoming bid is no longer available.');
 const player=c.players.find(p=>p.id===offer.playerId);if(!player||player.clubId!==c.clubId)throw Error('Player ownership has changed.');
 const buyer=clubById(offer.buyerId),temp={...c,clubId:buyer.id,reputation:(buyer.strength<75?'unknown':buyer.strength<82?'established':'elite') as Career['reputation'],world:{...c.world,offers:c.world.offers.map(o=>o.id===offerId?{...o,status:'accepted' as const}:o)}};
 const wage=wageDemand(temp,player,buyer.id),signed=finalizeSigning(temp,offerId,wage,player.age>=30?2:3,wage*5);
 const world={...signed.world,listed:{...signed.world.listed}};delete world.listed[player.id];
 return repairLineup({...signed,world,clubId:c.clubId,reputation:c.reputation,manager:c.manager,lineup:c.lineup,starId:c.starId,transferBudget:world.finances[c.clubId].budget});
}
