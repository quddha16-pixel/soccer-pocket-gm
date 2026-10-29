import type { Club, Reputation } from '../models';

export const managerOfferCounts:Record<Reputation,number>={unknown:4,established:12,elite:20};

/** Exact, cumulative tiers. An incumbent renewal takes one slot, never an extra offer. */
export function managerOfferClubs(reputation:Reputation,candidates:readonly Club[],incumbentId?:string){
 const ranked=[...candidates].sort((a,b)=>a.strength-b.strength||a.id.localeCompare(b.id)),selected=ranked.slice(0,managerOfferCounts[reputation]);
 const incumbent=ranked.find(c=>c.id===incumbentId);
 if(incumbent&&!selected.some(c=>c.id===incumbent.id))selected[selected.length-1]=incumbent;
 return selected;
}
