import type { Reputation } from '../models';

/** Experience opens rebuilding and European jobs; title favourites require elite standing. */
export function managerCanJoin(reputation:Reputation,strength:number){
 return reputation==='elite'||strength<=(reputation==='established'?84:74);
}
