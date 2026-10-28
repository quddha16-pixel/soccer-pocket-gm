import draftData from './custom-roster-draft.json';
import { clubs } from './clubs';

// Research intake only. Unresearched profiles must never become playable ratings.
export const realPositions=['GK','RB','RWB','CB','LB','LWB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST'] as const;
export type RealPosition=typeof realPositions[number];
export const requiredRealAttributes=['pace','acceleration','finishing','shooting','passing','vision','dribbling','control','tackling','marking','defensiveAwareness','strength','stamina','positioning','composure','reflexes','handling','distribution','shotStopping'] as const;
export type RealAttributes=Record<typeof requiredRealAttributes[number],number>;
export interface ResearchedPlayer {
 draftId:string;displayName:string;matchedIdentity:string|null;canonicalIdentityId:string|null;primaryPosition:RealPosition|null;secondaryPositions:RealPosition[]|null;positionFamiliarity:Partial<Record<RealPosition,number>>|null;dateOfBirth:string|null;nationality:string|null;preferredFoot:string|null;heightCm:number|null;attributes:RealAttributes|null;overall:number|null;potential:number|null;transferValue:number|null;weeklyWageEstimate:number|null;contractYearsEstimate:number|null;playingStyle:string|null;strengths:string[];weaknesses:string[];ratingRationale:string|null;sources:{url:string;retrievedDate:string;evidence:string}[];identityConfidence:string;researchStatus:string;assessmentDate:string|null;reviewNotes:string;
}
export interface CustomRosterIntake { playerCount:number;clubs:{clubId:string;submittedClub:string;players:ResearchedPlayer[]}[] }
export const customRosterDraft=draftData as unknown as CustomRosterIntake;
export function validateResearchedProfile(p:ResearchedPlayer){
 const errors:string[]=[];const bounded=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 if(p.researchStatus!=='verified'||p.identityConfidence==='unverified'||!p.matchedIdentity||!p.canonicalIdentityId)errors.push('Identity requires source verification.');
 if(!p.primaryPosition||!realPositions.includes(p.primaryPosition))errors.push('Primary position is missing or invalid.');
 if(!Array.isArray(p.secondaryPositions)||p.secondaryPositions.some(pos=>!realPositions.includes(pos)||pos===p.primaryPosition)||new Set(p.secondaryPositions??[]).size!==(p.secondaryPositions?.length??0))errors.push('Secondary positions require validation.');
 if(!p.positionFamiliarity||[p.primaryPosition,...p.secondaryPositions??[]].some(pos=>!pos||!bounded(p.positionFamiliarity?.[pos],0,1)))errors.push('Position familiarity requires assessment.');
 if(!p.dateOfBirth||!/^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth)||!Number.isFinite(Date.parse(p.dateOfBirth))||Date.parse(p.dateOfBirth)>Date.parse('2012-08-01')||Date.parse(p.dateOfBirth)<Date.parse('1976-08-01'))errors.push('Birth date/starting age requires verification.');
 if(!p.nationality)errors.push('Nationality requires verification.');
 if(p.preferredFoot!==null&&!['left','right','both'].includes(p.preferredFoot))errors.push('Invalid preferred foot.');
 if(p.heightCm!==null&&!bounded(p.heightCm,140,220))errors.push('Invalid height.');
 if(!p.attributes||requiredRealAttributes.some(key=>!bounded(p.attributes?.[key],1,99)))errors.push('Complete 1–99 attributes required.');
 if(!bounded(p.overall,1,99)||!bounded(p.potential,p.overall??1,99))errors.push('Overall/potential must be coherent and within 1–99.');
 if(!bounded(p.transferValue,0,1e9)||!bounded(p.weeklyWageEstimate,0,2e6)||!bounded(p.contractYearsEstimate,0,10))errors.push('Valuation and estimated contract data require assessment.');
 if(!p.playingStyle||!p.ratingRationale||!p.assessmentDate||!p.sources.length||p.sources.some(s=>!/^https:\/\//.test(s.url)||!/^\d{4}-\d{2}-\d{2}$/.test(s.retrievedDate)||!s.evidence))errors.push('Source evidence, assessment date and rating rationale required.');
 return errors;
}
export function customRosterReadiness(intake:CustomRosterIntake=customRosterDraft){
 const players=intake.clubs.flatMap(c=>c.players),issues=players.map(p=>({id:p.draftId,name:p.displayName,reason:p.reviewNotes,errors:validateResearchedProfile(p)})),canonicalIds=players.flatMap(p=>p.canonicalIdentityId?[p.canonicalIdentityId]:[]);
 const membership=intake.clubs.length===20&&new Set(intake.clubs.map(c=>c.clubId)).size===20&&clubs.every(c=>intake.clubs.some(x=>x.clubId===c.id));
 const unique=new Set(players.map(p=>p.draftId)).size===players.length&&new Set(canonicalIds).size===canonicalIds.length;
 const unresolved=issues.filter(p=>p.errors.length>0);
 return {ready:membership&&unique&&unresolved.length===0&&players.length===intake.playerCount,accountedFor:players.length,verified:players.length-unresolved.length,unresolved,membershipValid:membership,uniqueDraftIds:unique};
}
export function requireResearchedCustomRoster(){const status=customRosterReadiness();if(!status.ready)throw Error(`Custom roster is not ready: ${status.unresolved.length} profiles require identity, position, attribute and rating research.`);return customRosterDraft;}
