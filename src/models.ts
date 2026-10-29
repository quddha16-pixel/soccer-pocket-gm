import type { ManualState, ManualCombination, ManualPlayerStats } from './simulation/manualModels';
import type { HighlightState, HighlightResult } from './simulation/highlightModels';
import type { ManagerStyle, GeniusPlaystyle } from './simulation/managerStyles';
import type { PlayerIdentity, World } from './worldModels';
import type { RealPlayerProfile } from './data/playerProfiles';
import type { Legacy } from './simulation/legacy';
import type { DomesticSeason, CupId, Shootout } from './simulation/domesticModels';
export type Position = 'GK'|'CB'|'FB'|'CM'|'WG'|'ST';
export interface Club { id:string; name:string; short:string; color:string; strength:number; budget:number; expectation:string }
export interface Player { id:string; clubId:string; name:string; age:number; position:Position; overall:number; potential:number; wage:number; contractYears:number; fitness:number; morale:number; transferValue?:number; identity?:PlayerIdentity; real?:RealPlayerProfile }
export interface MatchEvent { momentId?:string; id:string; minute:number; type:'goal'|'shot'; clubId:string; playerId:string; assistId?:string; creatorId?:string; onTarget:boolean;chanceType?:'close'|'distance'|'aerial'|'one-on-one';xG?:number }
export interface Performance { minutes?:number;entered?:number;exited?:number;conceded?:number; playerId:string; clubId:string; goals:number; assists:number; shots:number; saves:number; tackles:number; rating:number }
export interface Substitution {clubId:string;offId:string;onId:string;minute:number}
export interface MatchPlan {bench:string[];changes:Substitution[]}
export interface SavedSubPlan extends MatchPlan {id:string;clubId:string;season:number;week:number;formation:Formation;source:'match'|'saved'}
export type MomentKind='penalty'|'free-kick'|'corner'|'one-on-one'|'big-chance'|'cross';
export type MomentOption=0|1|2;
export type MomentOutcome='goal'|'saved'|'wide'|'blocked'|'intercepted';
export interface AimPoint {x:number;y:number}
export interface AimedShot {path:AimPoint[];durationMs?:number}
export interface KeyMoment {highlight?:HighlightResult&{elapsed:number;passes:number};shot?:AimedShot;id:string;eventId:string;minute:number;clubId:string;kind:MomentKind;actorId:string;receiverId:string;alternateId:string;supportId:string;keeperId:string;baseXg:number;keeperApproach:'set'|'advancing'|'committing';pressure:'space'|'closing';autoChoice:MomentOption;selection?:MomentOption;outcome:MomentOutcome}
export interface MatchReport {cornerTarget?:number;manualMinutes?:number;manualStats?:Record<string,ManualPlayerStats>;manualLinks?:ManualCombination[];keyMoments?:KeyMoment[]; simulationSeed?:number;substitutions?:Substitution[];homeBench?:string[];awayBench?:string[]; events:MatchEvent[]; performances:Performance[]; homePossession:number; motmId:string; homeLineup?:string[]; awayLineup?:string[]; homeFormation?:Formation; awayFormation?:Formation }
export interface Fixture {competition?:CupId;neutral?:boolean;winnerId?:string;shootout?:Shootout;id:string; week:number; homeId:string; awayId:string; homeGoals?:number; awayGoals?:number; report?:MatchReport }
export interface Standing { clubId:string; played:number; won:number; drawn:number; lost:number; gf:number; ga:number; points:number }
export type Reputation = 'unknown'|'established'|'elite';
export type Tactic = 'balanced'|'attacking'|'defensive'|'feed-star';
export type Formation = '4-3-3'|'4-4-2'|'4-2-3-1';
export interface PendingWeek {competition?:{cupId:CupId;roundId:string};highlight?:HighlightState;manual?:ManualState;decisionMode?:'interactive'|'automatic';decisionFeedback?:string; week:number; fixtures:Fixture[]; minute:number; speed:1|2|4; paused:boolean }
export interface Career {domestic?:DomesticSeason;playableHighlights?:boolean;legacy?:Legacy;recentSubPlans?:SavedSubPlan[];interactiveMoments?:boolean;matchPlan?:MatchPlan; managerStyle?:ManagerStyle;geniusPlaystyle?:GeniusPlaystyle; version:3; world:World; manager:string; reputation:Reputation; clubId:string; players:Player[]; fixtures:Fixture[]; week:number; tactic:Tactic; status:'active'|'survived'|'fired'; seed:number; formation:Formation; lineup:string[]; starId:string; transferBudget:number; statsStartWeek:number; pending?:PendingWeek }
