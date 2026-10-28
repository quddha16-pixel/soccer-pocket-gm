import data from './championship-players.json';
import type { Player } from '../models';
import type { RealPlayerProfile } from './playerProfiles';
import { playersFromProfiles } from './playerProfiles';

export const championshipProfiles=data.players as RealPlayerProfile[];
export function promotedSquad(clubId:string,season:number,existing:Player[]):Player[]{
 const identities=new Set(existing.filter(p=>p.real).map(p=>p.real!.canonicalIdentityId));
 // Real career ownership wins over the reference roster, including transfers,
 // released players and retired records. Never clone or reclaim a footballer.
 return playersFromProfiles(championshipProfiles.filter(p=>p.assignedClubId===clubId&&!identities.has(p.canonicalIdentityId)),season).map(p=>p.age>=40?{...p,clubId:'',contractYears:0,identity:{...p.identity!,retired:true}}:p);
}
