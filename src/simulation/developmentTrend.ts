import type { Career, Player } from '../models';
import { developPlayer } from './development';
import { identity, primarySkills } from './identity';

/** A read-only one-week engine projection, not a promise of future potential. */
export function developmentTrend(p:Player,c:Career){
 if(identity(p).retired)return {direction:'stable' as const,arrows:0,annual:0,label:'Retired · no development'};
 const recent=c.fixtures.filter(f=>f.week<=c.week&&f.week>c.week-4&&f.homeGoals!==undefined);
 const minutes=recent.length?recent.reduce((n,f)=>n+(f.report?.performances.find(x=>x.playerId===p.id)?.minutes??(f.report?.performances.some(x=>x.playerId===p.id)?90:0)),0)/Math.max(1,recent.filter(f=>[f.homeId,f.awayId].includes(p.clubId)).length):c.lineup.includes(p.id)?90:0;
 const a=identity(p),projection=developPlayer(p,c,minutes,a.development.form,75),after=identity(projection),keys=primarySkills(p);
 const annual=keys.reduce((n,k)=>n+after.attributes[k]-a.attributes[k],0)/keys.length*38;
 const direction=annual>.05?'up':annual<-.05?'down':'stable',speed=Math.abs(annual);
 const arrows=direction==='stable'?0:direction==='down'?(speed>=1.5?3:speed>=.75?2:1):(speed>=3?3:speed>=1?2:1);
 const label=direction==='stable'?'Stable development':`${arrows===3?'Ultra':arrows===2?'Fast':'Normal'} ${direction==='up'?'development':'decline'}`;
 return {direction,arrows,annual,label};
}
