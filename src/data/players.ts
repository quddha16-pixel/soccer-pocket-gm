import type { Club, Player, Position } from '../models';
import { random } from '../simulation/random';
const first=['Oliver','Leo','Noah','Theo','Ethan','Lucas','Adam','Felix','Oscar','Jude','Hugo','Rafael','Amir','Jonas','Isaac','Luca','Ben','Mateo','Daniel','Tomas','Sam','Elias','Alex','Finn'];
const last=['Bennett','Silva','Clarke','Morgan','Hayes','Costa','Reed','Laurent','Walsh','Jensen','Brooks','Moreau','Khan','Weber','Grant','Marin','Cole','Santos','Price','Novak','Ward','Diallo','Stone','Duarte'];
const positions:Position[]=['GK','GK','CB','CB','CB','CB','FB','FB','FB','FB','CM','CM','CM','CM','CM','CM','WG','WG','WG','WG','ST','ST','ST','GK'];
export function generatePlayers(clubs:Club[],seed:number):Player[]{
 const rng=random(seed);
 return clubs.flatMap((c,ci)=>positions.map((position,i)=>{
 const age=16+Math.floor(rng()*19), overall=Math.round(c.strength-7+rng()*12);
 const tier=rng(),upside=tier<.003?18:tier<.033?13:tier<.20?9:tier<.68?5:2;
 return {id:`${c.id}-p${i+1}`,clubId:c.id,name:`${first[(ci*7+i)%first.length]} ${last[(ci+i*5)%last.length]}`,age,position,overall,potential:age<=24?Math.max(overall,Math.min(tier<.003?98:tier<.033?95:tier<.20?90:tier<.68?85:overall+2,overall+upside)):Math.min(95,overall+Math.round(rng()*3)),wage:Math.round((overall-50)**2*1.1)*100,contractYears:1+Math.floor(rng()*5),fitness:90+Math.floor(rng()*11),morale:65+Math.floor(rng()*26)};
 }));
}
