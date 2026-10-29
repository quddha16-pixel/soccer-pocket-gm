import catalogue from './player-appearances.json';
import type { Player } from '../models';
import { appearance, hash } from '../simulation/identity';

export type HairStyle='swept'|'crop'|'buzz'|'curls'|'waves'|'long'|'braids'|'twists'|'locks'|'headband'|'fringe'|'tied'|'bald';
export type FacialHair='none'|'stubble'|'beard'|'goatee';
export interface AppearanceSource {url:string;checked:string;fields:string[];kind:string}
export interface AppearanceRecord {name:string;birthDate:string;heightCm?:number;weightKg?:number;measurementNote?:string;buildStatus:string;sources:AppearanceSource[];visual?:{skin:string;hair:string;style:HairStyle;facialHair:FacialHair;status:'photo-observed';confidence:'medium';photoDate:string}}
export const appearanceRecords=catalogue.players as Record<string,AppearanceRecord>;
const aliases=catalogue.aliases as Record<string,string>;
export function appearanceRecord(p:Player):AppearanceRecord|undefined {
 const record=appearanceRecords[p.real?.canonicalIdentityId??aliases[p.id]];
 // A conflicting identity must never silently borrow a namesake's likeness.
 if(record&&p.real&&record.birthDate!==p.real.dateOfBirth)return;
 return record;
}
export function playerAppearance(p:Player){
 const record=appearanceRecord(p);
 if(record?.visual)return {...record.visual,status:'referenced' as const};
 if(p.real||aliases[p.id])return {skin:'#9caeb8',hair:'#546976',style:'bald' as HairStyle,facialHair:'none' as FacialHair,status:'unverified' as const};
 const a=appearance(p.identity?.appearanceSeed??hash(p.id));
 return {skin:a.skin,hair:a.hair,style:(['swept','crop','buzz','curls','waves','bald'] as HairStyle[])[a.style],facialHair:(a.beard?'beard':'none') as FacialHair,status:'fictional' as const};
}
export function bodyProportions(p:Player){
 const record=appearanceRecord(p),height=record?.heightCm,mass=record?.weightKg;
 // Unsourced bodies stay schematic. Measurements never alter collision or ability.
 return {scale:height?Math.max(.82,Math.min(1.16,height/183)):1,width:height&&mass?Math.max(.88,Math.min(1.15,Math.sqrt((mass/(height/100)**2)/23))):1,heightCm:height,weightKg:mass,buildStatus:record?.buildStatus??'unverified'};
}
