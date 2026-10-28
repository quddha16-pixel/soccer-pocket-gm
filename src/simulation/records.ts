import type { Career, Fixture } from '../models';
import { leagueClubs } from '../data/clubs';
import { standings } from './league';

export type StatKey='goals'|'assists'|'saves'|'chances'|'shots'|'tackles'|'cleanSheets'|'appearances'|'motm';
export const statLabels:Record<StatKey,string>={goals:'Goals',assists:'Assists',saves:'Saves',chances:'Chances created',shots:'Shots',tackles:'Tackles',cleanSheets:'Clean sheets',appearances:'Appearances',motm:'Player of the Match awards'};
export interface GameBest { value:number;season:number;week:number;fixtureId:string;clubId:string;opponentId:string }
export interface PlayerSeason extends Record<StatKey,number> {playerId:string;name:string;position:string;age:number;clubs:string[];ratingTotal:number;goalsConceded:number;best:Record<'goals'|'assists'|'saves'|'chances',GameBest|null>}
export interface SeasonAward {managerNames?:Record<string,string>;clubWinners?:string[];id:string;title:string;winners:string[];reason:string;score:number}
export interface SeasonReview {season:number;complete:boolean;matches:number;reportedMatches:number;players:PlayerSeason[];awards:SeasonAward[]}
const emptyBest=()=>({goals:null,assists:null,saves:null,chances:null});
export const averageRating=(p:PlayerSeason)=>p.ratingTotal/Math.max(1,p.appearances);

/** Read committed reports only. Pending/replay results never count twice. */
export function seasonReview(c:Career):SeasonReview {
 const players=new Map<string,PlayerSeason>(),matches=c.fixtures.filter(f=>f.homeGoals!==undefined);
 for(const f of matches){if(!f.report)continue;
  for(const perf of f.report.performances){
   const p=c.players.find(p=>p.id===perf.playerId);if(!p)continue;
   let s=players.get(p.id);
   if(!s){s={playerId:p.id,name:p.name,position:p.position,age:p.age,clubs:[],ratingTotal:0,goalsConceded:0,goals:0,assists:0,saves:0,chances:0,shots:0,tackles:0,cleanSheets:0,appearances:0,motm:0,best:emptyBest()};players.set(p.id,s);}
   if(!s.clubs.includes(perf.clubId))s.clubs.push(perf.clubId);
   const conceded=perf.conceded??(perf.clubId===f.homeId?f.awayGoals!:f.homeGoals!),chances=f.report.events.filter(e=>e.creatorId===p.id).length;
   s.appearances++;s.goals+=perf.goals;s.assists+=perf.assists;s.saves+=perf.saves;s.shots+=perf.shots;s.tackles+=perf.tackles;s.chances+=chances;s.ratingTotal+=perf.rating;s.goalsConceded+=conceded;s.cleanSheets+=Number(conceded===0&&(perf.minutes??90)>=60);s.motm+=Number(f.report.motmId===p.id);
   for(const key of ['goals','assists','saves','chances'] as const){const value=key==='chances'?chances:perf[key];if(value>(s.best[key]?.value??0))s.best[key]={value,season:c.world.season,week:f.week,fixtureId:f.id,clubId:perf.clubId,opponentId:perf.clubId===f.homeId?f.awayId:f.homeId};}
  }
 }
 const review:SeasonReview={season:c.world.season,complete:c.week===38&&matches.length===380,matches:matches.length,reportedMatches:matches.filter(f=>f.report).length,players:[...players.values()],awards:[]};
 if(review.complete)review.awards=chooseAwards(c,review);
 return review;
}
function chooseAwards(c:Career,r:SeasonReview):SeasonAward[]{
 const awards:SeasonAward[]=[],table=standings(leagueClubs(c),c.fixtures),minimum=Math.max(1,Math.ceil(r.reportedMatches/10*.45));
 const regular=r.players.filter(p=>p.appearances>=minimum),keepers=regular.filter(p=>p.position==='GK');
 // Position-aware contribution, sustained match quality and team achievement.
 // No OVR, club reputation, real-life fame or random tie-break enters selection.
 const score=(p:PlayerSeason)=>{
  const role=p.position==='GK'?p.saves*.12+p.cleanSheets*2-p.goalsConceded*.08:['CB','FB'].includes(p.position)?p.tackles*.18+p.cleanSheets*1.1+p.chances*.25+p.goals*2+p.assists*2:p.goals*2.2+p.assists*2+p.chances*.28+p.tackles*.06;
  const points=p.clubs.reduce((n,id)=>n+(table.find(t=>t.clubId===id)?.points??0),0)/Math.max(1,p.clubs.length);
  return (averageRating(p)-5)*22+role+p.appearances*.45+points*.13;
 };
 function award(id:string,title:string,candidates:PlayerSeason[],value:(p:PlayerSeason)=>number,reason:string,joint=false){
  const ranked=candidates.map(p=>({p,value:value(p)})).filter(x=>Number.isFinite(x.value)).sort((a,b)=>b.value-a.value||b.p.appearances-a.p.appearances||a.p.playerId.localeCompare(b.p.playerId));
  if(!ranked.length||ranked[0].value<=0)return;
  const best=ranked[0];awards.push({id,title,winners:(joint?ranked.filter(x=>Math.abs(x.value-best.value)<1e-9):[best]).map(x=>x.p.playerId),reason,score:Math.round(best.value*100)/100});
 }
 award('ballon-dor','Ballon d’Or',regular,score,'Sustained match ratings, position-specific contributions, appearances and league achievement.');
 award('player-season','Player of the Season',regular,p=>averageRating(p)+p.motm*.02,'Highest average match rating with a regular-season appearance threshold; Player of the Match awards break close results.');
 award('golden-boot','Golden Boot',r.players,p=>p.goals,'Most league goals. Tied scorers share the award.',true);
 award('playmaker','Playmaker Award',r.players,p=>p.assists,'Most recorded assists. Tied creators share the award.',true);
 award('golden-glove','Golden Glove',r.players.filter(p=>p.position==='GK'),p=>p.cleanSheets,'Most goalkeeper clean sheets. Ties share the award.',true);
 award('yashin','Yashin Trophy',keepers,p=>averageRating(p)*8+p.cleanSheets*1.5+(p.saves/Math.max(1,p.saves+p.goalsConceded))*30,'Regular goalkeeper performance, clean sheets and save percentage.');
 award('kopa','Kopa Trophy',regular.filter(p=>p.age<=21),score,'Best season by a player aged 21 or under at the start of the game season.');
 award('creator','Chance Creator of the Season',r.players,p=>p.chances,'Most recorded passes leading directly to a simulated shot, including assists. Ties share the award.',true);
 const ranked=[...table].map((row,i)=>{const club=leagueClubs(c).find(t=>t.id===row.clubId)!;const expected=(c.legacy?.baseline.season===c.world.season?c.legacy.baseline.targets?.[club.id]??(club.id===c.clubId?c.legacy.baseline.target:undefined):undefined)??(club.strength>=85?1:club.strength>=80?4:club.strength>=75?10:17);return {clubId:club.id,score:(expected-i-1)*6+row.points*.35+(i===0?35:0),points:row.points};}).sort((a,b)=>b.score-a.score||b.points-a.points||a.clubId.localeCompare(b.clubId));
 if(ranked.length)awards.push({id:'manager-season',title:'Manager of the Season',winners:[],clubWinners:[ranked[0].clubId],managerNames:{[ranked[0].clubId]:ranked[0].clubId===c.clubId?c.manager:c.world.staff.find(s=>s.clubId===ranked[0].clubId&&s.role==='Manager')?.name??'Management team'},score:Math.round(ranked[0].score*100)/100,reason:'League achievement and points relative to club stature. Awarded to the winning club’s management team.'});
 return awards;
}
export function completedReviews(c:Career):SeasonReview[]{return (c.world.seasonReviews??[]).filter(r=>r.season!==c.world.season);}
export function reviewFor(c:Career,season:number){return season===c.world.season?seasonReview(c):completedReviews(c).find(r=>r.season===season);}
export function allTimePlayers(c:Career):PlayerSeason[]{
 const all=new Map<string,PlayerSeason>();
 for(const review of [...completedReviews(c),seasonReview(c)])for(const p of review.players){
  const old=all.get(p.playerId);if(!old){all.set(p.playerId,structuredClone(p));continue;}
  for(const key of Object.keys(statLabels) as StatKey[])old[key]+=p[key];old.ratingTotal+=p.ratingTotal;old.goalsConceded+=p.goalsConceded;
  old.clubs=[...new Set([...old.clubs,...p.clubs])];
  for(const key of ['goals','assists','saves','chances'] as const)if((p.best[key]?.value??0)>(old.best[key]?.value??0))old.best[key]=structuredClone(p.best[key]);
 }
 return [...all.values()];
}
/** Fixture-based club records survive even in legacy archives without reports. */
export function clubRecords(c:Career,season?:number){
 const seasons=[...c.world.history.map(h=>({season:h.season,fixtures:h.results??[]})),{season:c.world.season,fixtures:c.fixtures}].filter(s=>season===undefined||s.season===season).sort((a,b)=>a.season-b.season);
 const rows=new Map<string,{clubId:string;wins:number;unbeaten:number;currentWins:number;currentUnbeaten:number;goalsGame:number;goalGame:GameBest|null;biggestWin:number;winGame:GameBest|null;pointsSeason:number;pointsYear:number}>();
 let priorYear:number|undefined;
 for(const s of seasons){const active=new Set(s.fixtures.flatMap(f=>[f.homeId,f.awayId]));
  for(const r of rows.values())if(!active.has(r.clubId)||priorYear!==undefined&&s.season!==priorYear+1){r.currentWins=0;r.currentUnbeaten=0;}
  const points=new Map<string,number>();
  for(const f of [...s.fixtures].sort((a,b)=>a.week-b.week))if(f.homeGoals!==undefined)for(const id of [f.homeId,f.awayId]){
   let r=rows.get(id);if(!r){r={clubId:id,wins:0,unbeaten:0,currentWins:0,currentUnbeaten:0,goalsGame:0,goalGame:null,biggestWin:0,winGame:null,pointsSeason:0,pointsYear:s.season};rows.set(id,r);}
   const gf=id===f.homeId?f.homeGoals:f.awayGoals!,ga=id===f.homeId?f.awayGoals!:f.homeGoals,win=gf>ga;
   r.currentWins=win?r.currentWins+1:0;r.currentUnbeaten=gf>=ga?r.currentUnbeaten+1:0;r.wins=Math.max(r.wins,r.currentWins);r.unbeaten=Math.max(r.unbeaten,r.currentUnbeaten);
   const game={value:gf,season:s.season,week:f.week,fixtureId:f.id,clubId:id,opponentId:id===f.homeId?f.awayId:f.homeId};
   if(gf>r.goalsGame){r.goalsGame=gf;r.goalGame=game;}if(gf-ga>r.biggestWin){r.biggestWin=gf-ga;r.winGame={...game,value:gf-ga};}
   points.set(id,(points.get(id)??0)+(win?3:gf===ga?1:0));
  }
  for(const [id,n] of points){const r=rows.get(id)!;if(n>r.pointsSeason){r.pointsSeason=n;r.pointsYear=s.season;}}
  priorYear=s.season;
 }
 return [...rows.values()];
}
export function archiveSeasonReview(c:Career):Career {
 const review=seasonReview(c);if(!review.complete)return c;
 return {...c,world:{...c.world,seasonReviews:[...completedReviews(c),review]}};
}
