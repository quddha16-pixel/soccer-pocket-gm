import data from './free-agents.json';
import type { Career, Player } from '../models';
import type { RealPlayerProfile } from './playerProfiles';
import { playersFromProfiles } from './playerProfiles';
import { identity } from '../simulation/identity';

export const freeAgentProfiles=data.players as RealPlayerProfile[];
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function researchedFreeAgents(season=2026,existing:Player[]=[]):Player[]{
 const profiles=freeAgentProfiles.filter(p=>!existing.some(x=>x.real?.canonicalIdentityId===p.canonicalIdentityId||normalize(x.name)===normalize(p.displayName)&&identity(x).birthDate===p.dateOfBirth));
 return playersFromProfiles(profiles,season).filter(p=>season===2026||p.age<40).map(p=>({...p,clubId:'',contractYears:0,identity:{...p.identity!,contractEnd:`${season}-06-30`,freeSince:`${season}-06-30`}}));
}
/** Explicit import for old saves; career ownership and retired records win. */
export function addResearchedFreeAgents(c:Career):Career {
 if(c.pending||c.status!=='active'||c.world.freeAgentPoolVersion===1)return c;
 const players=researchedFreeAgents(c.world.season,c.players);
 return {...c,players:[...c.players,...players],world:{...c.world,freeAgentPoolVersion:1,news:[{id:`free-agent-import-${c.world.season}`,date:c.world.date,text:`${players.length} researched real free agents added. Existing players and club assignments were preserved.`},...c.world.news]}};
}
