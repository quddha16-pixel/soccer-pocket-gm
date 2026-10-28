import type { Career } from '../models';

export type ManagerStyle='developer'|'negotiator'|'genius';
export type GeniusPlaystyle='standard'|'positional'|'counterpress'|'transitions';
export const managerStyles:{id:ManagerStyle;name:string;description:string}[]=[
 {id:'developer',name:'Developer',description:'20% faster positive attribute growth for your players. Age, coaching, minutes, injuries and potential still determine development.'},
 {id:'negotiator',name:'Negotiator',description:'Lower transfer fees, wage demands and signing bonuses. Stars are more willing to consider smaller clubs; finances and registration still apply.'},
 {id:'genius',name:'Football genius',description:'Exclusive coached team playstyles with tactical strengths and tradeoffs. No development or negotiation bonus.'}
];
export const geniusPlaystyles:{id:GeniusPlaystyle;name:string;description:string}[]=[
 {id:'standard',name:'Standard football',description:'Use your normal match approach without an exclusive coached pattern.'},
 {id:'positional',name:'Positional mastery',description:'More precise chance creation, with less protection against turnovers and a small extra fitness cost.'},
 {id:'counterpress',name:'Coordinated counterpress',description:'Stronger defensive pressure and more attacking activity, with the highest extra fitness cost.'},
 {id:'transitions',name:'Disguised transitions',description:'Stronger ball carrying and one-on-one chances, but fewer attacks and less settled creation.'}
];
/** AI negotiations temporarily change clubId. Never lend the user's perks to AI. */
export function hasManagerStyle(c:Pick<Career,'managerStyle'|'clubId'|'world'>,style:ManagerStyle,clubId=c.clubId){return c.managerStyle===style&&clubId===c.clubId&&c.world.staff.some(s=>s.controlled&&s.clubId===clubId);}
export const developmentMultiplier=(c:Career,clubId:string)=>hasManagerStyle(c,'developer',clubId)?1.2:1;
export function coachedPattern(c:Career,clubId:string){
 const neutral={creation:0,carrying:0,defence:0,intensity:1,oneOnOne:1,fitnessCost:0};
 if(!hasManagerStyle(c,'genius',clubId))return neutral;
 switch(c.geniusPlaystyle){
  case 'positional':return {creation:7,carrying:0,defence:-2,intensity:1.02,oneOnOne:1,fitnessCost:1};
  case 'counterpress':return {creation:3,carrying:0,defence:6,intensity:1.08,oneOnOne:1,fitnessCost:2};
  case 'transitions':return {creation:-3,carrying:8,defence:2,intensity:.95,oneOnOne:1.07,fitnessCost:1};
  default:return neutral;
 }
}
export const minimumSigningBonus=(c:Career,wage:number)=>wage*(hasManagerStyle(c,'negotiator')?3:4);
export const suggestedSigningBonus=(c:Career,wage:number)=>wage*(hasManagerStyle(c,'negotiator')?3:5);
