import type { Career } from '../models';
import { leagueClubs } from '../data/clubs';
import { standings } from './league';
export function dashboard(c:Career){
 const table=standings(leagueClubs(c),c.fixtures),row=table.find(r=>r.clubId===c.clubId)!,rank=table.findIndex(r=>r.clubId===c.clubId)+1;
 const results=c.fixtures.filter(f=>f.homeGoals!==undefined&&[f.homeId,f.awayId].includes(c.clubId)).sort((a,b)=>a.week-b.week).map(f=>{
 const home=f.homeId===c.clubId,gf=home?f.homeGoals!:f.awayGoals!,ga=home?f.awayGoals!:f.homeGoals!;
 return {fixture:f,opponentId:home?f.awayId:f.homeId,gf,ga,outcome:gf>ga?'W':gf===ga?'D':'L',home};
 });
 let unbeaten=0,winning=0;for(const r of [...results].reverse()){if(r.outcome==='L')break;unbeaten++;}for(const r of [...results].reverse()){if(r.outcome!=='W')break;winning++;}
 const squad=c.players.filter(p=>p.clubId===c.clubId),stats=new Map(squad.map(p=>[p.id,{player:p,goals:0,assists:0}]));
 for(const f of c.fixtures)for(const p of f.report?.performances??[]){const stat=stats.get(p.playerId);if(stat&&p.clubId===c.clubId){stat.goals+=p.goals;stat.assists+=p.assists;}}
 const leaders=[...stats.values()],topScorer=[...leaders].sort((a,b)=>b.goals-a.goals)[0],topAssister=[...leaders].sort((a,b)=>b.assists-a.assists)[0];
 return {table,row,rank,recent:results.slice(-5).reverse(),unbeaten,winning,squad,average:squad.reduce((s,p)=>s+p.overall,0)/squad.length,topScorer:topScorer?.goals?topScorer:null,topAssister:topAssister?.assists?topAssister:null};
}
