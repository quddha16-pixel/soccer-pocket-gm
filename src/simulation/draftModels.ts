import type {Club} from '../models';
import type {ManagerStyle} from './managerStyles';
export interface DraftPick {round:number;clubId:string;playerId:string}
export interface DraftState {version:1;seed:number;name:string;primary:string;secondary:string;manager:string;managerStyle:ManagerStyle;picks:DraftPick[];currentClubId?:string}
export interface DraftFranchise {version:1;club:Club;removedClubId:string;draftSeed:number;picks:DraftPick[]}
export type CareerMode='franchise'|'draft';
