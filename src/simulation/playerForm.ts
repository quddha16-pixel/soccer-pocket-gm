import type { Career, Player } from '../models';
import { eligiblePlayers } from './economy';
import { identity } from './identity';
import { lineupFit, naturalSlots } from './management';

export interface FormPlayer {player:Player;appearances:number;minutes:number;average:number;starter:boolean;early:boolean;advice:string}
export function playerFormReport(c:Career){
 const squad=c.players.filter(p=>p.clubId===c.clubId&&!identity(p).retired),totals=new Map(squad.map(player=>[player.id,{player,appearances:0,minutes:0,weighted:0}]));
 for(const f of c.fixtures){if(f.week>c.week||f.homeGoals===undefined||f.awayGoals===undefined)continue;
  for(const p of f.report?.performances??[]){if(p.clubId!==c.clubId||!Number.isFinite(p.rating))continue;const stat=totals.get(p.playerId),minutes=p.minutes??90;if(!stat||minutes<=0)continue;stat.appearances++;stat.minutes+=minutes;stat.weighted+=p.rating*minutes;}
 }
 const eligible=new Set(eligiblePlayers(c,c.clubId).map(p=>p.id));
 const rows:FormPlayer[]=[...totals.values()].filter(s=>s.minutes>0).map(s=>({player:s.player,appearances:s.appearances,minutes:s.minutes,average:s.weighted/s.minutes,starter:c.lineup.includes(s.player.id),early:s.appearances<3||s.minutes<180,advice:''}));
 const reliable=(r:FormPlayer)=>r.appearances>=2&&r.minutes>=90;
 function replacementFor(row:FormPlayer){
  const index=c.lineup.indexOf(row.player.id);if(index<0)return;
  return rows.filter(r=>!r.starter&&reliable(r)&&eligible.has(r.player.id)&&r.player.fitness>=80&&r.average>=row.average+.3&&lineupFit(r.player,c.formation,index)>=.85&&((index===0)===(r.player.position==='GK'))).sort((a,b)=>b.average-a.average||b.minutes-a.minutes)[0];
 }
 for(const row of rows){
  const p=row.player,index=c.lineup.indexOf(p.id);
  if(identity(p).injuryWeeks>0){row.advice=`Injured: reassess after recovery (${identity(p).injuryWeeks} weeks).`;continue;}
  if(!eligible.has(p.id)){row.advice='Register this player before considering a start.';continue;}
  if(p.fitness<80){row.advice='Allow recovery before increasing his workload.';continue;}
  if(row.early){row.advice='Early sample: build more minutes before making a firm selection call.';continue;}
  if(row.starter){
   if(lineupFit(p,c.formation,index)<.85){row.advice='Try a natural position before judging him for the bench.';continue;}
   if(row.average<6.5){const replacement=replacementFor(row);row.advice=replacement?`Consider ${replacement.player.name} at ${naturalSlots[c.formation][index]} (${replacement.average.toFixed(2)} average).`:'Consider rotation; no proven replacement has enough suitable minutes yet.';}
   else row.advice=row.average>=6.8?'Keep in the XI: performances support his place.':'Monitor form and compare suitable alternatives before rotating.';
  }else{
   const fitSlots=c.lineup.map((id,i)=>({index:i,starter:rows.find(r=>r.player.id===id)})).filter(s=>lineupFit(p,c.formation,s.index)>=.85&&((s.index===0)===(p.position==='GK')));
   const target=fitSlots.filter(s=>s.starter&&reliable(s.starter)&&row.average>=s.starter.average+.3).sort((a,b)=>a.starter!.average-b.starter!.average)[0];
   row.advice=row.average>=6.8?(target?`Consider a start at ${naturalSlots[c.formation][target.index]} for ${target.starter!.player.name}.`:'Form supports a starting chance in a natural position.'):row.average<6.5?'Use rotation minutes while form improves.':'A useful rotation option; keep building his sample.';
  }
 }
 const best=[...rows].sort((a,b)=>b.average-a.average||b.minutes-a.minutes||a.player.id.localeCompare(b.player.id)).slice(0,3),bestIds=new Set(best.map(r=>r.player.id));
 const worst=rows.filter(r=>!bestIds.has(r.player.id)).sort((a,b)=>a.average-b.average||b.minutes-a.minutes||a.player.id.localeCompare(b.player.id)).slice(0,3);
 return {best,worst,rated:rows.length,rows};
}
