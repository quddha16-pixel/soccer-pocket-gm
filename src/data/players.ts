import type { Club, Player, Position } from '../models';
import { random } from '../simulation/random';
const first=['Oliver','Leo','Noah','Theo','Ethan','Lucas','Adam','Felix','Oscar','Jude','Hugo','Rafael','Amir','Jonas','Isaac','Luca','Ben','Mateo','Daniel','Tomas','Sam','Elias','Alex','Finn'];
const last=['Bennett','Silva','Clarke','Morgan','Hayes','Costa','Reed','Laurent','Walsh','Jensen','Brooks','Moreau','Khan','Weber','Grant','Marin','Cole','Santos','Price','Novak','Ward','Diallo','Stone','Duarte'];
const positions:Position[]=['GK','GK','CB','CB','CB','CB','FB','FB','FB','FB','CM','CM','CM','CM','CM','CM','WG','WG','WG','WG','ST','ST','ST','GK'];
export function generatePlayers(clubs:Club[],seed:number):Player[]{
 const rng=random(seed);
 return clubs.flatMap((c,ci)=>positions.map((position,i)=>{
 const age=18+Math.floor(rng()*17), overall=Math.round(c.strength-7+rng()*12);
 return {id:`${c.id}-p${i+1}`,clubId:c.id,name:`${first[(ci*7+i)%first.length]} ${last[(ci+i*5)%last.length]}`,age,position,overall,potential:Math.min(95,overall+Math.round(rng()*(age<24?12:3))),wage:Math.round((overall-50)**2*1.1)*100,contractYears:1+Math.floor(rng()*5),fitness:90+Math.floor(rng()*11),morale:65+Math.floor(rng()*26)};
 }));
}
