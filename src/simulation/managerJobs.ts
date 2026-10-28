import type { Career } from '../models';
import { clubById } from '../data/clubs';
import { legacyState, settleLegacySeason, legacyPoints, startingManagerWage, updateAchievements, squadRating } from './legacy';
import { standings } from './league';
import { leagueClubs } from '../data/clubs';
import { promotionDraw } from './promotion';
import { rolloverSeason } from './worldTick';

export interface ManagerOffer {clubId:string;available:boolean;poaching:boolean;wage:number;target:number;reason:string}
/** One job decision at the season boundary: no resign/rejoin points farming. */
export function managerJobOffers(c:Career):ManagerOffer[] {
 if(c.pending||c.week!==38||c.status==='active')return [];
 const settled=settleLegacySeason(c),l=legacyState(settled),points=legacyPoints(l),movement=promotionDraw(c),rank=standings(leagueClubs(c),c.fixtures).findIndex(r=>r.clubId===c.clubId)+1;
 const successful=rank<=l.baseline.target&&rank<18,currentWage=l.tenures.at(-1)?.wage??startingManagerWage(c);
 return movement.leagueClubIds.map(id=>{
  const club=clubById(id),own=id===c.clubId;
  const available=own||settled.reputation!=='unknown'||club.strength<=74||movement.promoted.includes(id)||(successful&&rank<=6&&club.strength<=84);
  const base=startingManagerWage(settled,id),performance=Math.max(0,Math.min(1,points/2500));
  const wage=Math.round(base*(1+performance*.5+(successful?.15:0))/500)*500;
  const poaching=available&&!own&&successful&&wage>currentWage&&club.strength>=clubById(c.clubId).strength;
  return {clubId:id,available,poaching,wage,target:club.strength>=85?1:club.strength>=80?4:club.strength>=75?10:17,reason:own?'Continue building your legacy here.':poaching?'A higher-paying approach earned through your season’s success.':!available?'Build your reputation or exceed expectations to attract this club.':club.strength<=74?'A rebuilding opportunity with a larger first-title legacy reward.':'This club is interested in your management.'};
 }).sort((a,b)=>Number(b.poaching)-Number(a.poaching)||a.wage-b.wage||a.clubId.localeCompare(b.clubId));
}

export function acceptManagerOffer(c:Career,clubId:string):Career {
 const offer=managerJobOffers(c).find(o=>o.clubId===clubId);
 if(!offer?.available)throw Error('This club has not offered you a contract for next season.');
 const settled=settleLegacySeason(c),old=legacyState(settled),next=rolloverSeason(settled,clubId);
 if(next===settled)throw Error('Complete the season before deciding your next job.');
 const moved=clubId!==c.clubId,tenures=structuredClone(old.tenures);
 if(moved){tenures[tenures.length-1].toSeason=c.world.season;tenures.push({clubId,fromSeason:next.world.season,entryTarget:next.legacy!.baseline.target,entryStrength:squadRating(next,clubId),wage:offer.wage});}
 else tenures[tenures.length-1].wage=offer.wage;
 const entries=[...old.entries];
 if(offer.poaching)entries.push({id:`${c.world.season}:${clubId}:poached`,season:c.world.season,clubId,points:50,reason:`Earned a higher-paying move from ${clubById(c.clubId).name} to ${clubById(clubId).name}.`,kind:'move'});
 const legacy=updateAchievements({...next.legacy!,entries,tenures},next.world.season,clubId);
 const news={id:`gm-move-${next.world.season}`,date:next.world.date,text:moved?`${c.manager} joins ${clubById(clubId).name} as GM. Career legacy and achievements continue.`:`${c.manager} agrees a new season at ${clubById(clubId).name}.`};
 return {...next,legacy,world:{...next.world,news:[news,...next.world.news].slice(0,150)}};
}
