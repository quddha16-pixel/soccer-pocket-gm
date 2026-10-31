import type {DraftState} from './simulation/draftModels';
import {validDraftState} from './simulation/fantasyDraft';
export const DRAFT_STATE_KEY='pocket-football-gm-draft-board-v1';
export function loadDraftState():{draft:DraftState|null;error:string}{try{const raw=localStorage.getItem(DRAFT_STATE_KEY);if(!raw)return{draft:null,error:''};const draft=JSON.parse(raw);if(!validDraftState(draft))throw Error();return{draft,error:''};}catch{return{draft:null,error:'The saved draft board could not be loaded. Your franchise careers are still separate.'};}}
export function saveDraftState(s:DraftState){localStorage.setItem(DRAFT_STATE_KEY,JSON.stringify(s));}
export function clearDraftState(){localStorage.removeItem(DRAFT_STATE_KEY);}
