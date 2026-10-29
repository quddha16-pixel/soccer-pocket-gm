import type {Career,Fixture,Player} from '../models';
import type {CupId,CupRound,CupTournament,DomesticSeason,CupArchive,Shootout} from './domesticModels';
import {allClubs,clubById,leagueClubs,poolClubs} from '../data/clubs';
import {promotedSquad} from '../data/promotedPlayers';
import {hash,identity} from './identity';
import {random} from './random';
import {generateStaff} from './staff';
import {initializeClubFinance} from './world';
import {resolveMatch} from './match';
import {buildBoxScore,packBoxScore} from './boxScore';
import {fixtureLineup} from './substitutionRules';
import {meanSkill} from './playerSkills';
import {buildFamiliarity} from './chemistry';
import {legacyState,updateAchievements} from './legacy';
import {rememberCompletedSubstitutions} from './recentSubs';
import {copyLiveWorld} from './worldCopy';

export const cupNames:Record<CupId,string>={carabao:'Carabao Cup','fa-cup':'FA Cup',shield:'Community Shield'};
export const cupStages:Record<CupId,{name:string;afterWeek:number;neutral?:boolean}[]>={
 carabao:[{name:'Opening round',afterWeek:2},{name:'Round of 32',afterWeek:5},{name:'Round of 16',afterWeek:9},{name:'Quarter-finals',afterWeek:16},{name:'Semi-finals · first leg',afterWeek:22},{name:'Semi-finals · second leg',afterWeek:24},{name:'Final · Wembley',afterWeek:28,neutral:true}],
 'fa-cup':[{name:'Opening round',afterWeek:3},{name:'Round of 32',afterWeek:7},{name:'Round of 16',afterWeek:14},{name:'Quarter-finals',afterWeek:23},{name:'Semi-finals · Wembley',afterWeek:31,neutral:true},{name:'Final · Wembley',afterWeek:36,neutral:true}],
 shield:[{name:'Final · Wembley',afterWeek:0,neutral:true}]
};
function shuffle(ids:string[],seed:number){const result=[...ids],rng=random(seed);for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function roundFor(c:Career,id:CupId,index:number,entrants:string[],firstLeg?:CupRound):CupRound{
 const stage=cupStages[id][index],roundId=`${id}-${c.world.season}-r${index}`,draw=shuffle(entrants,hash(`${c.seed}:${roundId}:draw`));
 const fixtures=firstLeg?firstLeg.fixtures.map((f,i)=>({id:`${roundId}-${i}`,week:stage.afterWeek+1,homeId:f.awayId,awayId:f.homeId,competition:id})):
  Array.from({length:draw.length/2},(_,i)=>({id:`${roundId}-${i}`,week:stage.afterWeek+1,homeId:draw[i*2],awayId:draw[i*2+1],competition:id,...(stage.neutral?{neutral:true}:{})}));
 return {id:roundId,name:stage.name,afterWeek:stage.afterWeek,completed:false,fixtures};
}
export function initializeDomestic(c:Career):Career{
 if(c.domestic?.season===c.world.season)return c;
 // Never invent cup results for a season already in progress in an older save.
 if(c.week>0)return c;
 const league=leagueClubs(c).map(t=>t.id),pool=poolClubs(c).map(t=>t.id),entrants=[...league,...pool];
 const tournaments:CupTournament[]=(['carabao','fa-cup'] as const).map(id=>({id,season:c.world.season,entrants,byes:league,rounds:[roundFor(c,id,0,pool)]}));
 const previous=c.world.domesticHistory?.find(h=>h.season===c.world.season-1),fa=previous?.tournaments.find(t=>t.id==='fa-cup')?.championId,table=c.world.history.find(h=>h.season===c.world.season-1)?.results;
 if(fa&&table){const points=new Map<string,{p:number;gd:number;gf:number}>();for(const f of table){for(const [id,gf,ga] of [[f.homeId,f.homeGoals!,f.awayGoals!],[f.awayId,f.awayGoals!,f.homeGoals!]] as const){const old=points.get(id)??{p:0,gd:0,gf:0};points.set(id,{p:old.p+(gf>ga?3:gf===ga?1:0),gd:old.gd+gf-ga,gf:old.gf+gf});}}
  const leaders=[...points].sort((a,b)=>b[1].p-a[1].p||b[1].gd-a[1].gd||b[1].gf-a[1].gf||a[0].localeCompare(b[0])).map(([id])=>id),champ=leaders[0],other=fa===champ?leaders[1]:fa;
  if(champ&&other&&champ!==other)tournaments.unshift({id:'shield',season:c.world.season,entrants:[champ,other],byes:[],rounds:[roundFor(c,'shield',0,[champ,other])]});
 }
 return {...c,domestic:{version:1,season:c.world.season,tournaments}};
}
export const domesticFixtures=(c:Career)=>c.domestic?.tournaments.flatMap(t=>t.rounds.flatMap(r=>r.fixtures))??[];
export function dueCupRound(c:Career){return c.domestic?.tournaments.flatMap(t=>{const r=t.rounds.at(-1)!;return !r.completed&&r.afterWeek<=c.week?[{tournament:t,round:r}]:[];}).sort((a,b)=>a.round.afterWeek-b.round.afterWeek||a.tournament.id.localeCompare(b.tournament.id))[0];}
export function nextCupFixture(c:Career){const next=dueCupRound(c);return next?.round.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId));}
export function nextCareerFixture(c:Career){return c.pending?.fixtures.find(f=>[f.homeId,f.awayId].includes(c.clubId))??nextCupFixture(c)??c.fixtures.find(f=>f.week===c.week+1&&[f.homeId,f.awayId].includes(c.clubId));}
function provision(c:Career,ids:string[]):Career{
 const missing=ids.filter(id=>!c.world.finances[id]);if(!missing.length)return c;
 const world=copyLiveWorld(c.world),players=[...c.players];
 for(const id of missing){players.push(...promotedSquad(id,c.world.season,players));const club=clubById(id);world.finances[id]=initializeClubFinance(club,players);world.registration[id]=players.filter(p=>p.clubId===id&&!identity(p).retired).map(p=>p.id);}
 world.staff.push(...generateStaff(c.world.season,'','',missing.map(clubById),false));
 world.customRoster??={seniorLimits:{},unverifiedTrainingExempt:true};for(const id of missing)world.customRoster.seniorLimits[id]=Math.max(25,players.filter(p=>p.clubId===id&&identity(p).birthDate<`${c.world.season-21}-01-01`).length);
 return {...c,world,players};
}
export function prepareDomestic(c:Career,watch:boolean):Career{
 const due=dueCupRound(c);if(!due)return c;
 const base=provision(c,[...new Set(due.round.fixtures.flatMap(f=>[f.homeId,f.awayId]))]),rng=random(hash(`${c.seed}:${due.round.id}:matches`));
 const fixtures=due.round.fixtures.map(f=>resolveMatch(f,base,rng));
 return {...base,pending:{competition:{cupId:due.tournament.id,roundId:due.round.id},week:c.week+1,fixtures,minute:watch?0:90,paused:false,speed:1,decisionMode:watch&&(c.interactiveMoments??true)?'interactive':'automatic'}};
}
function penalties(f:Fixture,c:Career):Shootout{
 const rng=random(hash(`${c.seed}:${f.id}:shootout`)),byId=new Map(c.players.map(p=>[p.id,p])),line=(id:string)=>fixtureLineup(f,id,90).map(pid=>byId.get(pid)!),home=line(f.homeId),away=line(f.awayId),order=(team:Player[])=>[...team.slice(1)].sort((a,b)=>meanSkill(b,'finishing','composure')-meanSkill(a,'finishing','composure'));
 const takers=[order(home),order(away)],keepers=[away[0],home[0]],s:Shootout={home:0,away:0,kicks:[]};
 const kick=(side:number,index:number)=>{const p=takers[side][index%10],k=keepers[side],chance=Math.max(.5,Math.min(.9,.74+(meanSkill(p,'finishing','composure')-meanSkill(k,'reflexes','oneOnOne'))*.003)),scored=rng()<chance;s.kicks.push({clubId:side?f.awayId:f.homeId,playerId:p.id,scored});if(scored)side?s.away++:s.home++;};
 for(let i=0;i<5;i++){kick(0,i);if(s.home>s.away+5-i||s.away>s.home+4-i)return s;kick(1,i);if(s.home>s.away+4-i||s.away>s.home+4-i)return s;}
 for(let i=5;i<100;i++){kick(0,i);kick(1,i);if(s.home!==s.away)return s;}
 throw Error('Unable to settle the shootout. Your match remains uncommitted.');
}
export function settleCupFixture(f:Fixture,c:Career,t:CupTournament,index:number):Fixture{
 if(t.id==='carabao'&&index===4)return f; // No winner is declared after the first semi-final leg.
 let home=f.homeGoals!,away=f.awayGoals!;
 if(t.id==='carabao'&&index===5){const first=t.rounds[4].fixtures.find(x=>x.homeId===f.awayId&&x.awayId===f.homeId)!;home+=first.awayGoals!;away+=first.homeGoals!;}
 const shootout=home===away?penalties(f,c):undefined,winnerId=shootout?(shootout.home>shootout.away?f.homeId:f.awayId):home>away?f.homeId:f.awayId;
 return {...f,winnerId,...(shootout?{shootout}:{})};
}
/** One commit per cup round. League week, standings and weekly payroll never advance. */
export function commitDomestic(c:Career):Career{
 const pending=c.pending,meta=pending?.competition;if(!pending||!meta||pending.minute!==90||pending.highlight||pending.manual)return c;
 const tournament=c.domestic?.tournaments.find(t=>t.id===meta.cupId),index=tournament?.rounds.findIndex(r=>r.id===meta.roundId)??-1;if(!tournament||index<0||tournament.rounds[index].completed)return c;
 const fixtures=pending.fixtures.map(f=>settleCupFixture(f,c,tournament,index)),completed={...tournament.rounds[index],completed:true,fixtures},rounds=tournament.rounds.map((r,i)=>i===index?completed:r),last=index===cupStages[tournament.id].length-1;
 let championId:string|undefined;
 if(last)championId=fixtures[0].winnerId;
 else if(tournament.id==='carabao'&&index===4)rounds.push(roundFor(c,tournament.id,index+1,[],completed));
 else {const qualifiers=fixtures.map(f=>f.winnerId!);if(index===0)qualifiers.push(...tournament.byes);rounds.push(roundFor(c,tournament.id,index+1,qualifiers));}
 const domestic:DomesticSeason={...c.domestic!,tournaments:c.domestic!.tournaments.map(t=>t.id===tournament.id?{...t,rounds,championId}:t)},world=copyLiveWorld(c.world);world.chemistry=buildFamiliarity(c);
 const performances=new Map(fixtures.flatMap(f=>f.report!.performances.map(p=>[p.playerId,p] as const))),players=c.players.map(p=>{const perf=performances.get(p.id);if(!perf)return p;const a=identity(p);return {...p,fitness:Math.max(40,p.fitness-(perf.minutes??90)/90*8),identity:{...a,development:{...a.development,minutes:a.development.minutes+(perf.minutes??90),form:a.development.form*.75+perf.rating*.25}}};});
 for(const f of fixtures)for(const id of [f.homeId,f.awayId]){const finance=world.finances[id],gate=f.neutral?250000:150000,prize=f.winnerId===id?(last?1000000:50000*(index+1)):0;finance.cash+=gate+prize;finance.cupIncome=(finance.cupIncome??0)+gate+prize;}
 const news=championId?`${clubById(championId).name} lift the ${cupNames[tournament.id]} at Wembley.`:`${cupNames[tournament.id]}: ${completed.name} complete. The next draw is ready.`;
 world.news.unshift({id:`cup-${completed.id}`,date:world.date,text:news});world.news=world.news.slice(0,150);
 const own=fixtures.some(f=>[f.homeId,f.awayId].includes(c.clubId));
 let result:Career={...c,players,world,domestic,pending:undefined,matchPlan:own?undefined:c.matchPlan,recentSubPlans:own?rememberCompletedSubstitutions(c):c.recentSubPlans};
 if(championId===c.clubId){const l=legacyState(result),id=`${c.world.season}:${c.clubId}:cup-${tournament.id}`;if(!l.entries.some(e=>e.id===id))result={...result,legacy:updateAchievements({...l,entries:[...l.entries,{id,season:c.world.season,clubId:c.clubId,points:tournament.id==='shield'?50:tournament.id==='carabao'?150:250,reason:`Won the ${cupNames[tournament.id]}.`,kind:'season'}]},c.world.season,c.clubId)};}
 return result;
}
export function archiveDomestic(c:Career):CupArchive|undefined{
 if(!c.domestic)return;
 return {season:c.world.season,tournaments:c.domestic.tournaments.map(t=>({id:t.id,championId:t.championId,rounds:t.rounds.filter(r=>r.completed).map(r=>({name:r.name,fixtures:r.fixtures.map(({report,...f})=>f)})),boxScores:Object.fromEntries(t.rounds.filter(r=>r.completed).flatMap(r=>r.fixtures.flatMap(f=>{const b=buildBoxScore(f,c);return b?[[f.id,packBoxScore(b)]]:[];})))}))};
}
