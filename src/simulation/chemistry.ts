import type { Career, Formation, Player, Tactic } from '../models';
import { coordinates, lineupFit } from './management';
import { staffQuality } from './staff';
import { identity } from './identity';
import { fixtureLineup } from './substitutionRules';
export const pairKey=(a:string,b:string)=>[a,b].sort().join('|');
export const chemistryCategory=(score:number)=>score>=85?'Excellent':score>=70?'Strong':score>=50?'Developing':score>=30?'Weak':'Poor';
export function partnership(c:Career,a:Player,b:Player,formation:Formation,indices:[number,number],tactic:Tactic){
 const shared=c.world.chemistry.pairs[pairKey(a.id,b.id)]??0,ia=identity(a),ib=identity(b);
 const complementary=ia.style!==ib.style,fit=(lineupFit(a,formation,indices[0])+lineupFit(b,formation,indices[1]))/2;
 const familiarity=((c.world.chemistry.familiarity[`${a.id}:${tactic}`]??0)+(c.world.chemistry.familiarity[`${b.id}:${tactic}`]??0))/2;
 const stable=c.world.chemistry.lastLineups[a.clubId]?.includes(a.id)&&c.world.chemistry.lastLineups[a.clubId]?.includes(b.id);
 const attributeLink=Math.max(-2,Math.min(3,(Math.max(ia.attributes.passing+ib.attributes.movement,ib.attributes.passing+ia.attributes.movement)-120)/15));
 const score=Math.round(Math.max(0,Math.min(100,30+attributeLink+(complementary?12:-4)+fit*15+Math.min(22,shared*1.1)+Math.min(13,familiarity*.65)+(stable?5:0))));
 return {a,b,shared,score,reasons:[complementary?'Complementary playing styles':'Prefer similar spaces and responsibilities',fit>=.97?'Natural positional partnership':'One or both players adapting to a role',`${Math.round(shared*10)/10} equivalent matches played together`,`Tactical familiarity: ${Math.round(familiarity)} units with ${tactic}`,stable?'Stable recent lineup':'Partnership still settling']};
}
export function teamChemistry(c:Career,ids:string[],formation:Formation='4-3-3',tactic:Tactic='balanced'){
 const players=ids.map(id=>c.players.find(p=>p.id===id)!);const links=[];
 for(let i=0;i<11;i++)for(let j=i+1;j<11;j++){const a=coordinates[formation][i],b=coordinates[formation][j];if(Math.hypot(a[0]-b[0],a[1]-b[1])<43)links.push({...partnership(c,players[i],players[j],formation,[i,j],tactic),indices:[i,j] as [number,number]});}
 return {score:Math.round(links.reduce((s,l)=>s+l.score,0)/Math.max(1,links.length)),links};
}
export function buildFamiliarity(c:Career){
 const chemistry=structuredClone(c.world.chemistry);
 for(const f of c.pending?.fixtures??[]){for(const clubId of [f.homeId,f.awayId]){
 const players=f.report?.performances.filter(p=>p.clubId===clubId)??[];
 for(let i=0;i<players.length;i++){const p=players[i],key=`${p.playerId}:${clubId===c.clubId?c.tactic:'balanced'}`;chemistry.familiarity[key]=(chemistry.familiarity[key]??0)+(.7+staffQuality(c,clubId,'Assistant Manager')/140)*(p.minutes??90)/90;
  for(let j=i+1;j<players.length;j++){const other=players[j],overlap=Math.max(0,Math.min(p.exited??90,other.exited??90)-Math.max(p.entered??0,other.entered??0)),key=pairKey(p.playerId,other.playerId);if(overlap)chemistry.pairs[key]=(chemistry.pairs[key]??0)+overlap/90;}
 }
 chemistry.lastLineups[clubId]=fixtureLineup(f,clubId,90);
 }}return chemistry;
}
