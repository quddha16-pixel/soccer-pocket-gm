import type {Career,Fixture} from '../models';
import {allClubs,leagueClubs} from '../data/clubs';
import {cupStages} from './domestic';
import type {CupTournament} from './domesticModels';
import {validArchivedBoxScore} from './boxScore';
const same=(a:string[],b:string[])=>a.length===b.length&&new Set(a).size===a.length&&a.every(id=>b.includes(id));
const scores=(f:Fixture)=>Number.isInteger(f.homeGoals)&&Number.isInteger(f.awayGoals)&&f.homeGoals!>=0&&f.awayGoals!>=0;
function validWinner(f:Fixture,t:CupTournament,index:number,players:Set<string>){
 if(t.id==='carabao'&&index===4)return f.winnerId===undefined&&f.shootout===undefined;
 let h=f.homeGoals!,a=f.awayGoals!;
 if(t.id==='carabao'&&index===5){const first=t.rounds[4].fixtures.find(p=>p.homeId===f.awayId&&p.awayId===f.homeId);if(!first)return false;h+=first.awayGoals!;a+=first.homeGoals!;}
 if(h!==a)return f.shootout===undefined&&f.winnerId===(h>a?f.homeId:f.awayId);
 const s=f.shootout;if(!s||!Array.isArray(s.kicks)||s.kicks.length<6||s.kicks.length>200||s.home===s.away||!Number.isInteger(s.home)||!Number.isInteger(s.away))return false;
 if(s.kicks.some((k,i)=>k.clubId!==(i%2?f.awayId:f.homeId)||!players.has(k.playerId)||typeof k.scored!=='boolean'))return false;
 return s.home===s.kicks.filter(k=>k.clubId===f.homeId&&k.scored).length&&s.away===s.kicks.filter(k=>k.clubId===f.awayId&&k.scored).length&&f.winnerId===(s.home>s.away?f.homeId:f.awayId);
}
export function validDomestic(c:Career){
 const ids=new Set(allClubs.map(t=>t.id)),players=new Set(c.players.map(p=>p.id)),d=c.domestic;
 if(d){
  if(d.version!==1||d.season!==c.world.season||!Array.isArray(d.tournaments)||d.tournaments.length<2||d.tournaments.length>3||new Set(d.tournaments.map(t=>t.id)).size!==d.tournaments.length||!d.tournaments.some(t=>t.id==='carabao')||!d.tournaments.some(t=>t.id==='fa-cup'))return false;
  for(const t of d.tournaments){const stages=cupStages[t.id];if(!stages||t.season!==d.season||!Array.isArray(t.entrants)||new Set(t.entrants).size!==t.entrants.length||t.entrants.some(id=>!ids.has(id))||!Array.isArray(t.byes)||!Array.isArray(t.rounds)||t.rounds.length<1||t.rounds.length>stages.length)return false;
   if(t.id==='shield'?(t.entrants.length!==2||t.byes.length!==0):(!same(t.entrants,[...ids])||!same(t.byes,leagueClubs(c).map(club=>club.id))))return false;
   for(const[rIndex,r]of t.rounds.entries()){
    const stage=stages[rIndex],expected=t.id==='shield'?2:rIndex===0?t.entrants.filter(id=>!t.byes.includes(id)):t.id==='carabao'&&rIndex===5?t.rounds[4].fixtures.flatMap(f=>[f.homeId,f.awayId]):[...t.rounds[rIndex-1].fixtures.map(f=>f.winnerId!),...(rIndex===1?t.byes:[])];
    if(r.id!==`${t.id}-${t.season}-r${rIndex}`||r.name!==stage.name||r.afterWeek!==stage.afterWeek||typeof r.completed!=='boolean'||!Array.isArray(r.fixtures)||!same(r.fixtures.flatMap(f=>[f.homeId,f.awayId]),Array.isArray(expected)?expected:t.entrants)||(!r.completed&&rIndex!==t.rounds.length-1))return false;
    for(const[fIndex,f]of r.fixtures.entries()){if(f.id!==`${r.id}-${fIndex}`||f.competition!==t.id||f.week!==r.afterWeek+1||!ids.has(f.homeId)||!ids.has(f.awayId)||f.homeId===f.awayId||!!f.neutral!==!!stage.neutral)return false;
     if(r.completed){if(!scores(f)||!f.report||!validWinner(f,t,rIndex,players))return false;}else if(f.homeGoals!==undefined||f.awayGoals!==undefined||f.winnerId!==undefined||f.shootout!==undefined||f.report!==undefined)return false;
     if(t.id==='carabao'&&rIndex===5&&!t.rounds[4].fixtures.some(p=>p.homeId===f.awayId&&p.awayId===f.homeId))return false;
    }
   }
   const last=t.rounds.at(-1)!;if(last.completed&&t.rounds.length===stages.length?t.championId!==last.fixtures[0].winnerId:t.championId!==undefined)return false;
  }
 }
 const pending=c.pending?.competition;if(pending){const t=d?.tournaments.find(t=>t.id===pending.cupId),r=t?.rounds.at(-1);if(!r||r.id!==pending.roundId||r.completed||r.afterWeek>c.week||!r.fixtures.some(f=>[f.homeId,f.awayId].includes(c.clubId)))return false;}
 const history=c.world.domesticHistory;if(history!==undefined){if(!Array.isArray(history)||new Set(history.map(h=>h.season)).size!==history.length)return false;for(const h of history){if(!Number.isInteger(h.season)||h.season<2026||h.season>=c.world.season||!Array.isArray(h.tournaments)||h.tournaments.length>3)return false;for(const t of h.tournaments){if(!cupStages[t.id]||(t.championId&&!ids.has(t.championId))||!Array.isArray(t.rounds)||t.rounds.length>cupStages[t.id].length||!t.boxScores)return false;const fixtures=t.rounds.flatMap(r=>r.fixtures);if(fixtures.length>45||new Set(fixtures.map(f=>f.id)).size!==fixtures.length||fixtures.some(f=>!ids.has(f.homeId)||!ids.has(f.awayId)||!scores(f)))return false;for(const[id,b]of Object.entries(t.boxScores)){const f=fixtures.find(f=>f.id===id);if(!f||!validArchivedBoxScore(b,f,players))return false;}}}}
 return true;
}
