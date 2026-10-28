import type { PlayerIdentity, World } from './worldModels';
import type { RealPlayerProfile } from './data/playerProfiles';
export type Position = 'GK'|'CB'|'FB'|'CM'|'WG'|'ST';
export interface Club { id:string; name:string; short:string; color:string; strength:number; budget:number; expectation:string }
export interface Player { id:string; clubId:string; name:string; age:number; position:Position; overall:number; potential:number; wage:number; contractYears:number; fitness:number; morale:number; transferValue?:number; identity?:PlayerIdentity; real?:RealPlayerProfile }
export interface MatchEvent { id:string; minute:number; type:'goal'|'shot'; clubId:string; playerId:string; assistId?:string; creatorId?:string; onTarget:boolean;chanceType?:'close'|'distance'|'aerial'|'one-on-one';xG?:number }
export interface Performance { playerId:string; clubId:string; goals:number; assists:number; shots:number; saves:number; tackles:number; rating:number }
export interface MatchReport { events:MatchEvent[]; performances:Performance[]; homePossession:number; motmId:string; homeLineup?:string[]; awayLineup?:string[]; homeFormation?:Formation; awayFormation?:Formation }
export interface Fixture { id:string; week:number; homeId:string; awayId:string; homeGoals?:number; awayGoals?:number; report?:MatchReport }
export interface Standing { clubId:string; played:number; won:number; drawn:number; lost:number; gf:number; ga:number; points:number }
export type Reputation = 'unknown'|'established'|'elite';
export type Tactic = 'balanced'|'attacking'|'defensive'|'feed-star';
export type Formation = '4-3-3'|'4-4-2'|'4-2-3-1';
export interface PendingWeek { week:number; fixtures:Fixture[]; minute:number; speed:1|2|4; paused:boolean }
export interface Career { version:3; world:World; manager:string; reputation:Reputation; clubId:string; players:Player[]; fixtures:Fixture[]; week:number; tactic:Tactic; status:'active'|'survived'|'fired'; seed:number; formation:Formation; lineup:string[]; starId:string; transferBudget:number; statsStartWeek:number; pending?:PendingWeek }
