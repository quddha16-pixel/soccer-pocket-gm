import type {Career,Club,Player} from '../models';
import type {DraftState,DraftFranchise} from './draftModels';
import {clubs,clubById,registerDraftClub} from '../data/clubs';
import {championshipClubs} from '../data/championship';
import {customStartingPlayers} from '../data/playerProfiles';
import {hash} from './identity';
import {random} from './random';
import {newCareer} from './career';
import {autoLineup,eligibleStars} from './management';
import {generateFixtures} from './league';
import {initializeClubFinance} from './world';
import {generateStaff} from './staff';
import {initializeDomestic} from './domestic';
import {legacyState} from './legacy';
import {managerStyles} from './managerStyles';

export const DRAFT_ROUNDS=20;
export const removedDraftClub=[...championshipClubs].sort((a,b)=>a.strength-b.strength||a.id.localeCompare(b.id))[0];
let source:Player[]|undefined;
export const draftPlayers=()=>source??=customStartingPlayers();
const attacking=(p:Player)=>['CM','WG','ST'].includes(p.position);
export function draftNeeds(s:DraftState){const picked=s.picks.map(p=>draftPlayers().find(x=>x.id===p.playerId)!),keepers=picked.filter(p=>p.position==='GK').length;return {defenders:picked.filter(p=>['CB','FB'].includes(p.position)).length,midfield:picked.filter(p=>p.position==='CM').length,forwards:picked.filter(p=>['WG','ST'].includes(p.position)).length,keepers,keeperNeed:Math.max(0,2-keepers),attackNeed:picked.some(attacking)?0:1,remaining:20-picked.length};}
/** A selection must leave enough future rounds and keep the source club's XI viable. */
export function availableDraftPlayers(s:DraftState,clubId=s.currentClubId){
 if(!clubId||s.picks.length>=20)return [];
 const ids=new Set(s.picks.map(p=>p.playerId)),squad=draftPlayers().filter(p=>p.clubId===clubId&&!ids.has(p.id)),need=draftNeeds(s);
 return squad.filter(p=>{
  const keeper=p.position==='GK';if(keeper?(need.keepers>=2||squad.filter(p=>p.position==='GK').length<=1):squad.filter(p=>p.position!=='GK').length<=10)return false;
  const keeperNeed=Math.max(0,need.keeperNeed-Number(keeper)),attackNeed=Math.max(0,need.attackNeed-Number(attacking(p)));
  return keeperNeed+attackNeed<=need.remaining-1;
 }).sort((a,b)=>b.overall-a.overall||a.name.localeCompare(b.name));
}
export function spinDraft(s:DraftState):DraftState{
 if(s.currentClubId||s.picks.length>=20)return s;
 const choices=clubs.filter(c=>availableDraftPlayers(s,c.id).length);
 if(!choices.length)throw Error('No club can supply the remaining squad requirements.');
 const rng=random(hash(`${s.seed}:draft:${s.picks.map(p=>p.playerId).join('|')}`)),club=choices[Math.floor(rng()*choices.length)];
 return {...s,currentClubId:club.id};
}
export function pickDraftPlayer(s:DraftState,id:string):DraftState{
 if(!s.currentClubId)throw Error('Spin a club before making your pick.');
 if(!availableDraftPlayers(s).some(p=>p.id===id))throw Error('Choose an available player from the drawn club.');
 return {...s,picks:[...s.picks,{round:s.picks.length+1,clubId:s.currentClubId,playerId:id}],currentClubId:undefined};
}
const validSetup=(s:DraftState)=>s.version===1&&Number.isSafeInteger(s.seed)&&s.seed>=0&&typeof s.name==='string'&&s.name.trim().length>0&&s.name.length<=32&&typeof s.manager==='string'&&s.manager.trim().length>0&&s.manager.length<=40&&[s.primary,s.secondary].every(c=>typeof c==='string'&&/^#[0-9A-F]{6}$/.test(c))&&managerStyles.some(m=>m.id===s.managerStyle);
export function validDraftState(s:DraftState){try{
 if(!s||!validSetup(s)||!Array.isArray(s.picks)||s.picks.length>20)return false;
 let replay:DraftState={...s,picks:[],currentClubId:undefined};for(const p of s.picks){if(p.round!==replay.picks.length+1)return false;replay=spinDraft(replay);if(p.clubId!==replay.currentClubId)return false;replay=pickDraftPlayer(replay,p.playerId);}
 return s.currentClubId===undefined||(s.picks.length<20&&spinDraft(replay).currentClubId===s.currentClubId);
 }catch{return false;}}
export const draftClubId=(seed:number,name:string,primary:string,secondary:string,picks:DraftState['picks'])=>`draft-${seed}-${hash(`${name}|${primary}|${secondary}|${picks.map(p=>p.playerId).join('|')}`)}`;
const abbreviation=(name:string)=>{const words=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/[A-Z0-9]+/g)??[];return (words.length>1?words.map(w=>w[0]).join(''):words[0]??'DFT').slice(0,3).padEnd(2,'F');};
export function finishDraft(s:DraftState):Career{
 if(!validDraftState(s)||s.picks.length!==20||draftNeeds(s).keeperNeed||draftNeeds(s).attackNeed)throw Error('Complete all 20 valid picks before joining the league.');
 const id=draftClubId(s.seed,s.name.trim(),s.primary,s.secondary,s.picks),chosen=new Set(s.picks.map(p=>p.playerId));
 let c=newCareer(s.manager,'unknown','hull',s.seed,s.managerStyle);
 const players=c.players.map(p=>chosen.has(p.id)?{...p,clubId:id,identity:{...p.identity!,joinedSeason:2026,joinedWeek:0,bookValue:0,annualAmortization:0}}:p),lineup=autoLineup(players,id,'4-3-3'),strength=Math.round(lineup.reduce((n,id)=>n+players.find(p=>p.id===id)!.overall,0)/11);
 const club:Club={id,name:s.name.trim(),short:abbreviation(s.name),color:s.primary,secondary:s.secondary,strength,budget:30,expectation:strength>=85?'Challenge for the title':strength>=80?'Qualify for Europe':strength>=75?'Secure a mid-table finish':'Avoid relegation'};
 registerDraftClub(club);
 const draftFranchise:DraftFranchise={version:1,club,removedClubId:removedDraftClub.id,draftSeed:s.seed,picks:s.picks.map(p=>({...p}))};
 const leagueClubIds=clubs.map(t=>t.id==='sunderland'?id:t.id),championshipClubIds=[...championshipClubs.filter(t=>t.id!==removedDraftClub.id).map(t=>t.id),'sunderland'];
 const staff=[...c.world.staff.map(p=>({...p,controlled:false})),...generateStaff(2026,id,s.manager,[club],false,false)],finance=initializeClubFinance(club,players),annualPayroll=(players.filter(p=>p.clubId===id).reduce((n,p)=>n+p.wage,0)+staff.filter(p=>p.clubId===id).reduce((n,p)=>n+p.wage,0))*52;
 finance.revenue=Math.max(finance.revenue,Math.ceil(annualPayroll/.65/1e6)*1e6);finance.cash=Math.max(finance.cash,Math.ceil((annualPayroll*.5+30e6)/1e6)*1e6);
 const registration={...c.world.registration,[id]:players.filter(p=>p.clubId===id).map(p=>p.id)};for(const t of clubs)registration[t.id]=players.filter(p=>p.clubId===t.id).map(p=>p.id);
 c={...c,mode:'draft',players,lineup,starId:eligibleStars({players,lineup})[0].id,clubId:id,fixtures:generateFixtures(leagueClubIds),domestic:undefined,legacy:undefined,transferBudget:finance.budget,world:{...c.world,draftFranchise,leagueClubIds,championshipClubIds,staff,finances:{...c.world.finances,[id]:finance},registration,customRoster:{seniorLimits:{...c.world.customRoster!.seniorLimits,[id]:25},unverifiedTrainingExempt:true},news:[{id:`draft-${s.seed}`,date:c.world.date,text:`${club.name} enter the Premier League with 20 drafted players. Sunderland join the Championship pool; ${removedDraftClub.name} leave this draft universe.`}]}};
 return initializeDomestic({...c,legacy:legacyState(c)});
}
export function validDraftCareer(c:Career){try{
 const d=c.world?.draftFranchise;if(c.mode===undefined)return d===undefined;
 if(c.mode!=='draft'||!d||d.version!==1||d.removedClubId!==removedDraftClub.id)return false;
 const club=d.club;if(!club||club.id!==draftClubId(d.draftSeed,club.name,club.color,club.secondary!,d.picks)||!Number.isInteger(club.strength)||club.strength<1||club.strength>99||club.budget!==30||typeof club.expectation!=='string'||!/^\w{2,3}$/.test(club.short))return false;
 const state:DraftState={version:1,seed:d.draftSeed,name:club.name,primary:club.color,secondary:club.secondary!,manager:c.manager,managerStyle:c.managerStyle??'developer',picks:d.picks};
 if(!validDraftState(state)||state.picks.length!==20)return false;
 const ids=new Set(c.players.map(p=>p.id));if(draftPlayers().some(p=>!ids.has(p.id)))return false;
 for(const p of d.picks){const actual=c.players.find(x=>x.id===p.playerId),original=draftPlayers().find(x=>x.id===p.playerId)!;if(actual?.real?.canonicalIdentityId!==original.real!.canonicalIdentityId)return false;}
 if(c.world.season===2026){const expected=clubs.map(t=>t.id==='sunderland'?club.id:t.id);if(c.world.leagueClubIds?.length!==20||expected.some(id=>!c.world.leagueClubIds!.includes(id))||c.world.championshipClubIds?.includes(d.removedClubId)||!c.world.championshipClubIds?.includes('sunderland'))return false;}
 registerDraftClub(club);return true;
 }catch{return false;}}
