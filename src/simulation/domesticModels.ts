import type {Fixture} from '../models';
import type {ArchivedBoxScore} from './boxScore';
export type CupId='carabao'|'fa-cup'|'shield';
export interface Shootout {home:number;away:number;kicks:{clubId:string;playerId:string;scored:boolean}[]}
export interface CupRound {id:string;name:string;afterWeek:number;completed:boolean;fixtures:Fixture[]}
export interface CupTournament {id:CupId;season:number;entrants:string[];byes:string[];rounds:CupRound[];championId?:string}
export interface DomesticSeason {version:1;season:number;tournaments:CupTournament[]}
export interface CupArchive {season:number;tournaments:{id:CupId;championId?:string;rounds:{name:string;fixtures:Omit<Fixture,'report'>[]}[];boxScores:Record<string,ArchivedBoxScore>}[]}
