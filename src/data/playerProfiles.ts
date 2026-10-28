import data from './custom-roster.json';
import type { Player, Position } from '../models';
import type { Attributes } from '../worldModels';
import { enrichPlayer, hash } from '../simulation/identity';

export const naturalPositions=['GK','RB','RWB','CB','LB','LWB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST'] as const;
export type NaturalPosition=typeof naturalPositions[number];
export const outfieldAttributes=['acceleration','sprintSpeed','finishing','shotPower','longShots','positioning','shortPassing','longPassing','vision','crossing','dribbling','ballControl','agility','balance','composure','stamina','strength','aggression','interceptions','marking','standingTackle','slidingTackle','heading','jumping'] as const;
export const keeperAttributes=['diving','reflexes','handling','gkPositioning','kicking','distribution','aerialAbility','oneOnOne'] as const;
export type DetailedAttribute=typeof outfieldAttributes[number]|typeof keeperAttributes[number];
export type DetailedAttributes=Record<typeof outfieldAttributes[number],number>&Partial<Record<typeof keeperAttributes[number],number>>;
export interface PlayerTrait {id:string;level:1|2}
export interface RealPlayerProfile {
 origin?:'custom'|'championship'|'free-agent';draftId:string;displayName:string;assignedClubId:string;canonicalIdentityId:string;matchedIdentity:string;dateOfBirth:string;nationality:string;preferredFoot:string|null;primaryPosition:NaturalPosition;secondaryPositions:NaturalPosition[];overall:number;potential:number;attributes:DetailedAttributes;traits:PlayerTrait[];traitRationale:string;ratingStatus:'official'|'secondary'|'provisional';identityConfidence:'high'|'review';assessmentDate:string;sources:{url:string;retrievedDate:string;kind:string;fields:string[]}[];estimatedFields:string[];startingValue:number;weeklyWageEstimate:number;contractYearsEstimate:number;startingAge:number;development:{rate:number;tendency:'early'|'late'|'volatile'|'steady';uncertainty:number;confidence:number};ratingRationale:string;playingStyle:'creator'|'runner'|'anchor'|'finisher'|'keeper';coreBaseline?:Attributes;
}
export const startingProfiles=data.players as RealPlayerProfile[];
export const coarsePosition=(position:NaturalPosition):Position=>position==='GK'?'GK':position==='CB'?'CB':['LB','RB','LWB','RWB'].includes(position)?'FB':['CDM','CM','CAM'].includes(position)?'CM':['LW','RW','LM','RM'].includes(position)?'WG':'ST';
export function coreAttributes(profile:RealPlayerProfile):Attributes {
 const a=profile.attributes,avg=(...keys:DetailedAttribute[])=>keys.reduce((sum,k)=>sum+(a[k]??profile.overall),0)/keys.length;
 return {finishing:avg('finishing','shotPower','composure'),passing:avg('shortPassing','longPassing','vision'),control:avg('dribbling','ballControl','agility'),tackling:avg('standingTackle','interceptions','marking'),positioning:profile.primaryPosition==='GK'?a.gkPositioning!:['CB','LB','RB','CDM'].includes(profile.primaryPosition)?avg('marking','interceptions'):a.positioning,reflexes:a.reflexes??profile.overall,handling:a.handling??profile.overall,movement:avg('acceleration','sprintSpeed','positioning')};
}
export function customStartingPlayers():Player[]{return playersFromProfiles(startingProfiles);}
export function playersFromProfiles(profiles:RealPlayerProfile[],season=2026):Player[]{
 return profiles.map(source=>{
  // Each new career owns its snapshot; developing a player cannot mutate the database.
  const real=structuredClone(source),attributes=coreAttributes(real);real.coreBaseline={...attributes};
  const p=enrichPlayer({id:real.draftId,clubId:real.assignedClubId,name:real.displayName,age:real.startingAge+season-2026,position:coarsePosition(real.primaryPosition),overall:real.overall,potential:real.potential,wage:real.weeklyWageEstimate,contractYears:real.contractYearsEstimate,fitness:96,morale:75,real},season);
  p.identity={...p.identity!,appearanceSeed:hash(real.canonicalIdentityId),nationality:real.nationality,birthDate:real.dateOfBirth,trainingYears:0,style:real.playingStyle==='keeper'?'anchor':real.playingStyle,attributes,development:{...p.identity!.development,tendency:real.development.tendency,growth:real.development.rate,confidence:real.development.confidence,baseline:{...attributes}},contractEnd:`${season+real.contractYearsEstimate}-06-30`};
  return p;
 });
}

export function validatePlayableRoster(profiles:RealPlayerProfile[]=startingProfiles){
 const errors:string[]=[];
 if(profiles.length!==546)errors.push('Expected 546 profiles.');
 if(new Set(profiles.map(p=>p.draftId)).size!==profiles.length||new Set(profiles.map(p=>p.canonicalIdentityId)).size!==profiles.length)errors.push('Duplicate identity.');
 for(const p of profiles){
  const keys=[...outfieldAttributes,...(p.primaryPosition==='GK'?keeperAttributes:[])];
  if(keys.some(k=>!Number.isFinite(p.attributes[k])||p.attributes[k]!<1||p.attributes[k]!>99))errors.push(`${p.displayName}: incomplete attributes.`);
  if(!naturalPositions.includes(p.primaryPosition)||p.secondaryPositions.some(pos=>!naturalPositions.includes(pos)||pos===p.primaryPosition))errors.push(`${p.displayName}: invalid positions.`);
  if(!p.sources.length||!p.ratingRationale||!p.traitRationale||!p.dateOfBirth||p.startingValue<=0||p.potential<p.overall||p.potential>99||p.overall<1)errors.push(`${p.displayName}: incomplete profile.`);
 }
 return errors;
}
