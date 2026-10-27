import type { Club, Fixture, Standing } from '../models';
export function generateFixtures(ids:string[]):Fixture[]{
 if(ids.length!==20||new Set(ids).size!==20)throw Error('A league requires 20 unique clubs.');
 const ring=[...ids], fixtures:Fixture[]=[];
 for(let week=1;week<=19;week++){
  for(let i=0;i<10;i++){
   const [homeId,awayId]=week%2?[ring[i],ring[19-i]]:[ring[19-i],ring[i]];
   fixtures.push({id:`w${week}-${i}`,week,homeId,awayId});
   fixtures.push({id:`w${week+19}-${i}`,week:week+19,homeId:awayId,awayId:homeId});
  }
  ring.splice(1,0,ring.pop()!);
 }
 return fixtures.sort((a,b)=>a.week-b.week);
}
export function standings(clubs:Pick<Club,'id'>[],fixtures:Fixture[]):Standing[]{
 const rows=new Map(clubs.map(c=>[c.id,{clubId:c.id,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}]));
 for(const f of fixtures){
  if(f.homeGoals===undefined||f.awayGoals===undefined)continue;
  const h=rows.get(f.homeId)!,a=rows.get(f.awayId)!;h.played++;a.played++;
  h.gf+=f.homeGoals;h.ga+=f.awayGoals;a.gf+=f.awayGoals;a.ga+=f.homeGoals;
  if(f.homeGoals>f.awayGoals){h.won++;h.points+=3;a.lost++;}
  else if(f.homeGoals<f.awayGoals){a.won++;a.points+=3;h.lost++;}
  else{h.drawn++;a.drawn++;h.points++;a.points++;}
 }
 return [...rows.values()].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.clubId.localeCompare(b.clubId));
}
export function isRelegated(table:Standing[],clubId:string,seasonComplete:boolean){return seasonComplete&&table.findIndex(r=>r.clubId===clubId)>=17;}
