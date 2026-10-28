import type { KeyMoment, MatchEvent } from '../models';
export interface FieldPoint {x:number;y:number}
export interface ManualActor extends FieldPoint {id:string;clubId:string;slot:number;vx:number;vy:number;energy:number;cooldown:number}
export interface ManualFlight {kind:'pass'|'shot';actorId:string;clubId:string;targetId?:string;creatorId?:string;eventId?:string;age:number;offside?:boolean;loft:boolean}
export interface ManualBall extends FieldPoint {vx:number;vy:number;z:number;vz:number;ownerId?:string;flight?:ManualFlight;lastClubId:string;lastPlayerId:string}
export interface ManualPlayerStats {attempted:number;completed:number;interceptions:number;tackles:number;distance:number}
export interface ManualCombination {a:string;b:string;passes:number;last:number}
export interface ManualSetPiece {kind:'penalty'|'free-kick';moment:KeyMoment;resolved?:boolean}
export interface ManualState {version:1;fixtureId:string;userClubId:string;elapsed:number;duration:180|240|360;half:1|2;phase:'playing'|'halftime'|'fulltime';rng:number;sequence:number;actors:ManualActor[];ball:ManualBall;controlledId:string;aim:FieldPoint;events:MatchEvent[];moments:KeyMoment[];stats:Record<string,ManualPlayerStats>;combinations:ManualCombination[];appliedSubs:string[];homePossession:number;awayPossession:number;restart:number;notice:string;aerial?:{playerId:string;until:number};lastPass?:{from:string;to:string;at:number};setPiece?:ManualSetPiece}
export interface ManualInput {x:number;y:number;shoot?:number;pass?:boolean;loft?:boolean;switchPlayer?:boolean;selectId?:string;tackle?:boolean}
