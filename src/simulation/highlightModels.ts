import type { MomentOutcome } from '../models';
export interface HighlightActor {id:string;x:number;y:number;cooldown:number}
export interface HighlightInput {x:number;y:number;pass?:boolean;shoot?:number;selectId?:string}
export interface HighlightResult {outcome:MomentOutcome;shooterId:string;assistId?:string;xG:number;onTarget:boolean}
export interface HighlightFlight {kind:'pass'|'shot';fromId:string;targetId?:string;assistId?:string;startX:number;startY:number;endX:number;endY:number;elapsed:number;duration:number;result?:HighlightResult}
export interface HighlightState {version:1;momentId:string;kind:'breakaway'|'counter';phase:'ready'|'playing'|'finished';elapsed:number;limit:14|18;rng:number;attackers:HighlightActor[];defenders:HighlightActor[];keeper:HighlightActor;controlledId:string;ball:{x:number;y:number;z:number;ownerId?:string;flight?:HighlightFlight};aimY:number;passes:number;attempted:number;links:{a:string;b:string;passes:number;last:number}[];lastPass?:{from:string;to:string;at:number};notice:string;result?:HighlightResult}
