export type Position = 'GK'|'CB'|'FB'|'CM'|'WG'|'ST';
export interface Club { id:string; name:string; short:string; color:string; strength:number; budget:number; expectation:string }
export interface Player { id:string; clubId:string; name:string; age:number; position:Position; overall:number; potential:number; wage:number; contractYears:number; fitness:number; morale:number }
export interface Fixture { id:string; week:number; homeId:string; awayId:string; homeGoals?:number; awayGoals?:number }
export interface Standing { clubId:string; played:number; won:number; drawn:number; lost:number; gf:number; ga:number; points:number }
export type Reputation = 'unknown'|'established'|'elite';
export type Tactic = 'balanced'|'attacking'|'defensive';
export interface Career { version:1; manager:string; reputation:Reputation; clubId:string; players:Player[]; fixtures:Fixture[]; week:number; tactic:Tactic; status:'active'|'survived'|'fired'; seed:number }
