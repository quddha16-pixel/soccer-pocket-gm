import type { Career, Club } from '../models';
import { championshipClubs } from './championship';
// Authoritative 2026–27 membership supplied by the project owner.
// Replace this module to configure clubs; players are maintained separately.
// Preserve club IDs and row order for compatibility with existing career saves.
export const league = {title:'Premier League', season:'2026–27', verified2026:true,
  notice:'Premier League · 2026–27 season · 20 clubs',
  source:'Authoritative 2026–27 club list provided by the project owner.'};
const rows: [string,string,string,string,number,number][] = [
 ['arsenal','Arsenal','ARS','#e64d5e',86,130],['villa','Aston Villa','AVL','#a5527c',80,75],
 ['bournemouth','Bournemouth','BOU','#df4b50',76,35],['brentford','Brentford','BRE','#e35959',75,30],
 ['brighton','Brighton & Hove Albion','BHA','#4f8dee',78,55],['coventry','Coventry City','COV','#83cde9',69,18],
 ['chelsea','Chelsea','CHE','#4b7fed',83,140],['palace','Crystal Palace','CRY','#557ee4',77,38],
 ['everton','Everton','EVE','#5b80ea',74,28],['fulham','Fulham','FUL','#c9d1dd',76,35],
 ['leeds','Leeds United','LEE','#f0ce58',71,25],['liverpool','Liverpool','LIV','#ed5962',87,150],
 ['city','Manchester City','MCI','#77c9ec',88,180],['united','Manchester United','MUN','#e35353',81,100],
 ['newcastle','Newcastle United','NEW','#b8c6d3',82,90],['forest','Nottingham Forest','NFO','#ed5c60',76,40],
 ['sunderland','Sunderland','SUN','#e7686e',70,22],['tottenham','Tottenham Hotspur','TOT','#d8e2f0',80,85],
 ['hull','Hull City','HUL','#efb649',68,18],['ipswich','Ipswich Town','IPS','#608def',70,22]
];
export const clubs:Club[]=rows.map(([id,name,short,color,strength,budget])=>({id,name,short,color,strength,budget,expectation:strength>=85?'Challenge for the title':strength>=80?'Qualify for Europe':strength>=75?'Secure a mid-table finish':'Avoid relegation'}));
// The starting 20 remain immutable. Every career stores its own current league.
export const allClubs:Club[]=[...clubs,...championshipClubs];
export const clubById=(id:string)=>allClubs.find(c=>c.id===id)!;
export function leagueClubs(c?:Pick<Career,'world'>|null):Club[]{return c?.world?.leagueClubIds?c.world.leagueClubIds.map(clubById):clubs;}
export function poolClubs(c?:Pick<Career,'world'>|null):Club[]{return c?.world?.championshipClubIds?c.world.championshipClubIds.map(clubById):championshipClubs;}
export function managedClubs(c:Pick<Career,'world'>):Club[]{return allClubs.filter(club=>!!c.world.finances[club.id]);}
