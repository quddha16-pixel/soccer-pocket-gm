import type { Career, Standing } from '../models';
import { leagueClubs, poolClubs } from '../data/clubs';
import { standings } from './league';
import { random } from './random';

export function promotionDraw(c:Career,table:Standing[]=standings(leagueClubs(c),c.fixtures)){
 if(c.week!==38||c.pending||c.status==='active'||table.length!==20||table.some(row=>row.played!==38))throw Error('Promotion requires a completed league season.');
 const current=leagueClubs(c).map(club=>club.id),pool=poolClubs(c).map(club=>club.id);
 if(new Set(current).size!==20||new Set(pool).size!==pool.length||pool.length<3||pool.some(id=>current.includes(id)))throw Error('Invalid league or Championship pool membership.');
 const relegated=table.slice(-3).map(row=>row.clubId);
 if(relegated.some(id=>!current.includes(id)))throw Error('Relegated clubs must belong to the completed league.');
 // Draw without replacement from the PRE-season pool. Relegated clubs cannot
 // immediately bounce back in the same draw. Saving/reloading never rerolls it.
 const rng=random(c.seed+c.world.season*104729+17713),available=[...pool],promoted:string[]=[];
 for(let i=0;i<3;i++){const index=Math.floor(rng()*available.length);promoted.push(available.splice(index,1)[0]);}
 const replacements=new Map(relegated.map((id,index)=>[id,promoted[index]]));
 return {relegated,promoted,leagueClubIds:current.map(id=>replacements.get(id)??id),championshipClubIds:[...available,...relegated]};
}
