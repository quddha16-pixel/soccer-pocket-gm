import type { Career, Reputation } from '../models';
import { newCareer } from '../simulation/career';
import { generatePlayers } from '../data/players';
import { clubs } from '../data/clubs';
import { initializeWorld } from '../simulation/world';
import { autoLineup, eligibleStars } from '../simulation/management';
// Keep regression coverage for the roster/schema actually shipped before v1.4.
export function legacyCareer(manager='Jamie',reputation:Reputation='unknown',clubId='hull',seed=1234):Career {
 const base=newCareer(manager,reputation,clubId,seed),players=generatePlayers(clubs,seed),lineup=autoLineup(players,clubId,base.formation);
 return initializeWorld({...base,players,lineup,starId:eligibleStars({players,lineup})[0].id,world:undefined} as unknown as Career);
}
