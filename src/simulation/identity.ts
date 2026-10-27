import type { Player } from '../models';
import type { Attributes, PlayerIdentity, Skill } from '../worldModels';
import { random } from './random';
export function hash(text:string){let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
export const skills:Skill[]=['finishing','passing','control','tackling','positioning','reflexes','handling','movement'];
export const primarySkills=(p:Player):Skill[]=>p.position==='GK'?['reflexes','handling','positioning']:['CB','FB'].includes(p.position)?['tackling','positioning','passing']:p.position==='CM'?['passing','control','positioning']:['finishing','movement','control'];
export function overallFromAttributes(p:Player,attributes:Attributes){const primary=primarySkills(p);return Math.round(primary.reduce((sum,k)=>sum+attributes[k],0)/primary.length);}
export function identity(p:Player,season=2026,week=0):PlayerIdentity{
 if(p.identity)return p.identity;
 const rng=random(hash(p.id));const attributes=Object.fromEntries(skills.map(k=>[k,p.overall])) as Attributes;
 return {appearanceSeed:hash(p.id),nationality:['England','France','Spain','Brazil','Nigeria','Denmark','Netherlands','Argentina'][Math.floor(rng()*8)],birthDate:`${season-p.age}-01-01`,trainingYears:rng()<.55?3:0,style:(['creator','runner','anchor','finisher'] as const)[Math.floor(rng()*4)],attributes,development:{tendency:(['steady','early','late','volatile'] as const)[Math.floor(rng()*4)],growth:.7+rng()*.9,confidence:p.age<22?40+Math.floor(rng()*25):75,minutes:0,form:6.5,seasonStart:p.overall,baseline:{...attributes},history:[]},injuryWeeks:0,recurrence:0,contractEnd:`${season+p.contractYears}-06-30`,signingBonus:0,bookValue:0,annualAmortization:0,joinedSeason:season,joinedWeek:week};
}
export function enrichPlayer(p:Player,season=2026,week=0):Player{return p.identity?p:{...p,identity:identity(p,season,week)};}
export function potentialEstimate(p:Player,scoutRating=50,visits=0){const profile=identity(p),confidence=Math.min(95,profile.development.confidence+scoutRating*.15+visits*8);const uncertainty=Math.max(1,Math.round((100-confidence)/9));const offset=Math.round(((hash(p.id+'scout')%5)-2)*(100-confidence)/100);const centre=Math.max(p.overall,p.potential+offset);return {low:Math.max(p.overall,centre-uncertainty),high:Math.min(99,centre+uncertainty),confidence:Math.round(confidence)};}
export function potentialTier(p:Player){return p.potential>=96?'Generational talent':p.potential>=91?'Elite prospect':p.potential>=84?'High-potential prospect':p.potential-p.overall>=4?'Standard prospect':'Limited upside';}
export function appearance(seed:number){const r=random(seed);return {skin:['#f4c8a5','#dca17b','#bd7d58','#925b40','#603a2c'][Math.floor(r()*5)],hair:['#17191f','#443024','#77513b','#c2a36b','#a34b31'][Math.floor(r()*5)],style:Math.floor(r()*6),beard:r()<.34,face:Math.floor(r()*3),brows:r()<.5};}
