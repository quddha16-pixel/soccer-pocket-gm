import type { Career, Player } from '../models';
import { coordinates, slots, lineupFit } from './management';
import { partnership } from './chemistry';
export function prospectiveCompatibility(c:Career,p:Player){
 const index=slots[c.formation].map((_slot,i)=>({i,fit:lineupFit(p,c.formation,i)})).sort((a,b)=>b.fit-a.fit)[0].i,point=coordinates[c.formation][index];
 const projected={...p,clubId:c.clubId},context={...c,world:{...c.world,chemistry:{...c.world.chemistry,familiarity:{...c.world.chemistry.familiarity,[`${p.id}:${c.tactic}`]:0}}}};
 const scores=c.lineup.flatMap((id,j)=>{const other=c.players.find(x=>x.id===id),xy=coordinates[c.formation][j];return j!==index&&other&&Math.hypot(point[0]-xy[0],point[1]-xy[1])<43?[partnership(context,projected,other,c.formation,[index,j],c.tactic).score]:[];});
 return Math.round(scores.reduce((s,n)=>s+n,0)/Math.max(1,scores.length));
}
