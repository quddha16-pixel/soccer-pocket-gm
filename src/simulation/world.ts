import type { Career, Club, Player, Position } from '../models';
import { clubs } from '../data/clubs';
import { enrichPlayer, hash, identity } from './identity';
import { generateStaff } from './staff';
import { weekDate } from '../data/rules';
import { random } from './random';
import type { Finance } from '../worldModels';
export function freeAgents(season:number):Player[]{return Array.from({length:18},(_,i)=>{const rng=random(hash(`free-${season}-${i}`)),age=i<6?17+i:i<12?24+i%5:32+i%4,overall=54+Math.floor(rng()*25);const p=enrichPlayer({id:`free-${season}-${i}`,name:`${['Dylan','Enzo','Malik','Ruben','Toby','Nico'][i%6]} ${['Harris','Vega','Mensah'][Math.floor(i/6)]}`,clubId:'',age,position:(['GK','CB','FB','CM','WG','ST'] as Position[])[i%6],overall,potential:Math.min(96,overall+(age<23?4+Math.floor(rng()*12):2)),wage:Math.round((overall-45)**2*60),contractYears:0,fitness:92,morale:65},season);p.identity!.contractEnd=`${season}-06-30`;p.identity!.freeSince=`${season}-06-30`;return p;});}
export function initializeWorld(c:Career,addFreeAgents=true):Career{
 if(c.world)return c;
 const season=2026,players=c.players.map(p=>enrichPlayer(p,season,0));if(addFreeAgents&&!players.some(p=>p.clubId===''))players.push(...freeAgents(season));
 const finances=Object.fromEntries(clubs.map(club=>[club.id,initializeClubFinance(club,players,club.id===c.clubId?c.transferBudget:undefined)]));
 const chemistry={pairs:{} as Record<string,number>,familiarity:{} as Record<string,number>,lastLineups:{} as Record<string,string[]>};
 const missing=new Set(c.players.filter(p=>!p.identity).map(p=>p.id));
 for(const f of c.fixtures.filter(f=>f.homeGoals!==undefined)){
  for(const clubId of [f.homeId,f.awayId]){const ids=f.report?.performances.filter(p=>p.clubId===clubId).map(p=>p.playerId)??[];if(!ids.length)continue;
   chemistry.lastLineups[clubId]=ids;
   for(let i=0;i<ids.length;i++){const p=players.find(p=>p.id===ids[i]),performance=f.report?.performances.find(p=>p.playerId===ids[i]);if(p&&missing.has(p.id)&&performance){p.identity={...identity(p),development:{...identity(p).development,minutes:identity(p).development.minutes+90,form:identity(p).development.form*.7+performance.rating*.3}};}
    for(let j=i+1;j<ids.length;j++){const key=[ids[i],ids[j]].sort().join('|');chemistry.pairs[key]=(chemistry.pairs[key]??0)+1;}
   }
  }
 }
 const registration=Object.fromEntries(clubs.map(club=>[club.id,players.filter(p=>p.clubId===club.id).map(p=>p.id)]));
 const customRoster=players.some(p=>p.real)?{seniorLimits:Object.fromEntries(clubs.map(club=>[club.id,Math.max(25,players.filter(p=>p.clubId===club.id&&identity(p).birthDate<'2005-01-01').length)])),unverifiedTrainingExempt:true}:undefined;
 return {...c,version:3,players,world:{freeAgentPoolVersion:players.some(p=>p.real?.origin==='free-agent')?1:undefined,customRoster,season,date:weekDate(season,c.week),chemistry,staff:generateStaff(season,c.clubId,c.manager,clubs,true,players.some(p=>p.real)),finances,offers:[],news:[],shortlist:[],scouting:{},registration,history:[]}};
}

export function initializeClubFinance(club:Club,players:Player[],budget=club.budget*1e6):Finance {
 const wage=players.filter(p=>p.clubId===club.id).reduce((sum,p)=>sum+p.wage,0);
 return {cash:club.budget*2e6+20e6,budget,revenue:(70+club.budget*2)*1e6,wageCap:wage*1.7+200000,spending:0,income:0,saleProfit:0,agentFees:0,bonuses:0,operatingCosts:0,paidPayroll:0,penalties:0};
}
