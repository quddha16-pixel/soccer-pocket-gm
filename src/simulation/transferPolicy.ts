import type { Career, Player } from '../models';
import { leagueClubs } from '../data/clubs';
import { seasonRules, weekDate } from '../data/rules';
import { identity } from './identity';
import { autoLineup, lineupFit } from './management';
import { standings } from './league';

export type SquadRole='key player'|'starter'|'rotation player'|'development prospect';
export interface TransferDecision {
 role:SquadRole; available:boolean; reason:string; multiplier:number; rival:boolean;
 replacementGap:number; starter:boolean;
}
export const transferWindow=(c:Career)=>c.world.date>=seasonRules(c.world.season).winter.open?'winter' as const:'summer' as const;
const derbyPairs=[['arsenal','tottenham'],['liverpool','everton'],['city','united'],['newcastle','sunderland'],['brighton','palace'],['villa','birmingham'],['ipswich','norwich']];

/** A healthy, registered first XI measures sporting importance, independent of
 * club reputation or who controls it. Injured stars retain their squad role. */
function firstTeam(c:Career,clubId:string){
 const squad=c.players.filter(p=>p.clubId===clubId&&!identity(p).retired);
 const registered=new Set(c.world.registration[clubId]??[]);
 const eligible=squad.filter(p=>registered.has(p.id)||identity(p).birthDate>=seasonRules(c.world.season).u21Cutoff);
 const healthy=eligible.map(p=>identity(p).injuryWeeks?{...p,identity:{...identity(p),injuryWeeks:0}}:p);
 const lineup=healthy.length>=11&&healthy.some(p=>p.position==='GK')&&healthy.filter(p=>p.position!=='GK').length>=10?autoLineup(healthy,clubId,'4-3-3'):[];
 const quality=lineup.length?lineup.reduce((sum,id,i)=>sum+lineupFit(healthy.find(p=>p.id===id)!,'4-3-3',i)*healthy.find(p=>p.id===id)!.overall,0)/11:0;
 return {squad,eligible,healthy,lineup,quality};
}

export const transferContext=()=>({teams:new Map<string,ReturnType<typeof firstTeam>>()});
type TransferContext=ReturnType<typeof transferContext>;
function teamFor(c:Career,id:string,context:TransferContext){let team=context.teams.get(id);if(!team){team=firstTeam(c,id);context.teams.set(id,team);}return team;}

export function competitiveRivals(c:Career,seller:string,buyer:string,context=transferContext()){
 if(seller===buyer)return false;
 if(derbyPairs.some(pair=>pair.includes(seller)&&pair.includes(buyer)))return true;
 const clubs=leagueClubs(c);if(!clubs.some(x=>x.id===seller)||!clubs.some(x=>x.id===buyer))return false;
 const table=standings(clubs,c.fixtures),s=table.findIndex(x=>x.clubId===seller),b=table.findIndex(x=>x.clubId===buyer);
 if(Math.min(table[s].played,table[b].played)>=6)return (s<6&&b<6)||(s>=15&&b>=15)||(Math.abs(s-b)<=4&&Math.abs(table[s].points-table[b].points)<=6);
 return Math.abs(teamFor(c,seller,context).quality-teamFor(c,buyer,context).quality)<=3;
}

function departures(c:Career,seller:string,context:TransferContext){
 const window=transferWindow(c),entries=(c.world.transferDepartures??[]).filter(d=>d.season===c.world.season&&d.window===window&&d.sellerId===seller);
 // Old saves have no ledger. Recover their completed sales conservatively.
 const known=new Set(entries.map(d=>d.playerId));
 const legacy=c.world.offers.filter(o=>o.status==='completed'&&o.season===c.world.season&&o.sellerId===seller&&!known.has(o.playerId)&&
  ((o.date??weekDate(o.season,o.week))>=seasonRules(o.season).winter.open?'winter':'summer')===window);
 return {total:entries.length+legacy.length,starters:entries.filter(d=>d.starter).length+legacy.filter(o=>{const p=c.players.find(x=>x.id===o.playerId);return p&&p.overall>=teamFor(c,seller,context).quality-2;}).length};
}

/** Seller's sporting veto. A higher offer or Negotiator perk cannot override a
 * refusal. Explicitly listing a player signals willingness, never waives cover. */
export function transferDecision(c:Career,p:Player,buyer=c.clubId,context=transferContext()):TransferDecision {
 const decision:TransferDecision={role:'rotation player',available:true,reason:'The club will consider a fair offer.',multiplier:1,rival:false,replacementGap:0,starter:false};
 if(!p.clubId)return {...decision,reason:'Unattached: negotiate personal terms.'};
 const team=teamFor(c,p.clubId,context),index=team.lineup.indexOf(p.id),starter=index>=0;
 const top=team.squad.filter(x=>x.overall>p.overall).length<6;
 const role:SquadRole=starter?(top?'key player':'starter'):p.age<=21&&p.potential-p.overall>=6?'development prospect':'rotation player';
 const listed=c.world.listed?.[p.id]!==undefined;
 const remaining=team.eligible.filter(x=>x.id!==p.id&&identity(x).injuryWeeks===0);
 const same=remaining.filter(x=>x.position===p.position);
 let gap=0;
 if(starter){
  // Rebuild the entire XI so a versatile teammate cannot cover two vacancies.
  if(remaining.length>=11&&remaining.some(x=>x.position==='GK')&&remaining.filter(x=>x.position!=='GK').length>=10){
   const next=autoLineup(remaining,p.clubId,'4-3-3');
   gap=Math.max(0,team.quality*11-next.reduce((sum,id,i)=>{const x=remaining.find(x=>x.id===id)!;return sum+x.overall*lineupFit(x,'4-3-3',i);},0));
  }else gap=99;
 }
 const rival=competitiveRivals(c,p.clubId,buyer,context),sales=departures(c,p.clubId,context),rules=seasonRules(c.world.season),window=transferWindow(c);
 const daysLeft=(Date.parse(rules[window].close)-Date.parse(c.world.date))/864e5;
 const f=c.world.finances[p.clubId],distressed=(f.debt??0)>0||f.cash<team.squad.reduce((s,x)=>s+x.wage,0)*6;
 const expiring=p.contractYears<=1;
 const multiplier=(role==='key player'?2.15:starter?1.55:role==='development prospect'?1.4:1.08)*(rival?1.3:1)*(window==='winter'&&starter?1.2:1)*(daysLeft<=7&&starter?1.2:1)*(1+sales.starters*.15)*(distressed?.85:1);
 const result={...decision,role,starter,rival,replacementGap:gap,multiplier};
 const refuse=(reason:string)=>({...result,available:false,reason});
 if(team.squad.length<=20||same.length<(p.position==='GK'?2:1))return refuse('Not for sale: insufficient fit, registered positional cover.');
 const arrival=identity(p).transferArrival;
 if(arrival&&(c.world.season-arrival.season)*38+c.week-arrival.week<6)return refuse('Not for sale: the player has only recently joined.');
 if(sales.total>=4||(starter&&sales.starters>=2))return refuse('Not for sale: the club has already lost too much of its squad this window.');
 if(starter&&gap>=8)return refuse('Not for sale: no replacement of sufficient first-team quality.');
 if(starter&&!listed&&daysLeft<=7&&gap>2)return refuse('Not for sale: too little time to replace a first-team player before the deadline.');
 if(role==='key player'&&!listed&&!expiring&&!distressed&&(gap>2||rival||window==='winter'))return refuse(rival?'Not for sale: the club will not strengthen a direct rival with a key player.':'Not for sale: a core player under contract; a first-team replacement is required.');
 return {...result,reason:listed?'Transfer listed; squad cover and competitive pricing still apply.':expiring?'The contract is running down; the club will consider a substantial offer.':starter?'Reluctant seller: a premium is needed to sacrifice a first-team player.':'The club will consider a fair offer.'};
}

/** No AI club funds the user's inflated transfer listings. */
export function aiBidLimit(c:Career,p:Player,buyer:string,marketValue:number){
 const squad=c.players.filter(x=>x.clubId===buyer&&x.position===p.position&&!identity(x).retired).sort((a,b)=>b.overall-a.overall);
 const need=p.overall-(squad[Math.min(squad.length-1,p.position==='GK'?0:p.position==='CM'?2:p.position==='CB'||p.position==='FB'||p.position==='WG'?1:0)]?.overall??50);
 return Math.round(marketValue*(need>=3?1.35:1.05)/10000)*10000;
}
