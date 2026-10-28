import type { Career } from '../models';
import { allClubs, clubs, clubById, leagueClubs } from '../data/clubs';
import { standings } from './league';
import { financialSummary } from './economy';
import { seasonReview, type SeasonReview } from './records';

export interface LegacyEntry {id:string;season:number;clubId:string;points:number;reason:string;kind:'season'|'title'|'rebuild'|'award'|'conduct'|'move'}
export interface AchievementUnlock {id:string;season:number;clubId:string}
export interface Tenure {clubId:string;fromSeason:number;toSeason?:number;entryTarget:number;entryStrength:number;wage:number}
export interface LegacyBaseline {season:number;clubId:string;target:number;targets?:Record<string,number>;strength:number;debt:number;estimated:boolean}
export interface Legacy {version:1;sinceSeason:number;entries:LegacyEntry[];achievements:AchievementUnlock[];tenures:Tenure[];baseline:LegacyBaseline;settledSeasons:number[]}
export const playerAwardIds=['ballon-dor','player-season','golden-boot','playmaker','golden-glove','yashin','kopa','creator'] as const;
export const awardNames:Record<string,string>={'ballon-dor':'Ballon d’Or','player-season':'Player of the Season','golden-boot':'Golden Boot',playmaker:'Playmaker Award','golden-glove':'Golden Glove',yashin:'Yashin Trophy',kopa:'Kopa Trophy',creator:'Chance Creator of the Season','manager-season':'Manager of the Season'};
export const awardPoints:Record<string,number>={'ballon-dor':150,'player-season':75,'golden-boot':60,playmaker:60,'golden-glove':60,yashin:80,kopa:80,creator:40,'manager-season':100};
export const legacyPoints=(l:Legacy)=>l.entries.reduce((n,e)=>n+e.points,0);
export const legacyTier=(points:number)=>points>=5000?'Immortal':points>=2500?'Legend':points>=1000?'Icon':points>=350?'Respected':points>=0?'Building a name':'Under pressure';
export function squadRating(c:Career,clubId=c.clubId){const top=c.players.filter(p=>p.clubId===clubId&&!p.identity?.retired).sort((a,b)=>b.overall-a.overall).slice(0,11);return Math.round(top.reduce((n,p)=>n+p.overall,0)/Math.max(1,top.length));}

/** Freeze a target before a ball is kicked. Squad quality and club stature both matter. */
export function expectedTargets(c:Career):Record<string,number>{
 const ranked=leagueClubs(c).map(club=>({id:club.id,quality:(squadRating(c,club.id)+club.strength)/2})).sort((a,b)=>b.quality-a.quality||a.id.localeCompare(b.id));
 return Object.fromEntries(ranked.map((club,i)=>[club.id,i<2?1:i<6?4:i<13?10:17]));
}
export function expectedFinish(c:Career,clubId=c.clubId){return expectedTargets(c)[clubId]??17;}
export const startingManagerWage=(c:Career,clubId=c.clubId)=>Math.round((clubById(clubId).budget*150+(c.reputation==='elite'?25000:c.reputation==='established'?10000:0)+8000)/500)*500;
export function startLegacySeason(c:Career,l:Legacy):Legacy {
 const targets=expectedTargets(c);
 return {...l,baseline:{season:c.world.season,clubId:c.clubId,target:targets[c.clubId]??17,targets,strength:squadRating(c),debt:c.world.finances[c.clubId]?.debt??0,estimated:c.week>0}};
}
export function legacyState(c:Career):Legacy {
 if(c.legacy)return c.legacy;
 const target=expectedFinish(c);
 return startLegacySeason(c,{version:1,sinceSeason:c.world.season,entries:[],achievements:[],tenures:[{clubId:c.clubId,fromSeason:c.world.season,entryTarget:target,entryStrength:squadRating(c),wage:startingManagerWage(c)}],baseline:{} as LegacyBaseline,settledSeasons:[]});
}

/** Award credit requires at least half the winner's recorded appearances at your club. */
export function clubAwardIds(c:Career,review:SeasonReview,clubId=c.clubId){
 return [...new Set(review.awards.filter(a=>a.clubWinners?.includes(clubId)||a.winners.some(id=>{
  const season=review.players.find(p=>p.playerId===id);if(!season?.appearances)return false;
  const own=c.fixtures.reduce((n,f)=>n+Number(!!f.report?.performances.some(p=>p.playerId===id&&p.clubId===clubId&&(p.minutes??90)>0)),0);
  return own>=Math.ceil(season.appearances/2);
 })).map(a=>a.id))];
}

export interface AchievementDefinition {id:string;title:string;description:string;goal:number;progress:(l:Legacy)=>number}
const wins=(l:Legacy)=>l.entries.filter(e=>e.kind==='title');
const titles=(l:Legacy)=>new Set(wins(l).map(e=>e.clubId));
const awards=(l:Legacy)=>new Set(l.entries.filter(e=>e.kind==='award').map(e=>e.id.split(':').at(-1)!));
export const achievementDefinitions:AchievementDefinition[]=[
 {id:'champion',title:'Champion',description:'Win the league.',goal:1,progress:l=>wins(l).length},
 {id:'treble-titles',title:'Serial winner',description:'Win three league titles in this career.',goal:3,progress:l=>wins(l).length},
 {id:'three-clubs',title:'Travelling champion',description:'Win the league with three different clubs.',goal:3,progress:l=>titles(l).size},
 {id:'all-original-clubs',title:'The complete Premier League legacy',description:'Win a title with each of the original 20 custom clubs.',goal:20,progress:l=>clubs.filter(c=>titles(l).has(c.id)).length},
 {id:'all-clubs',title:'Every club, every summit',description:'Win with all 44 clubs, including the promotion pool.',goal:44,progress:l=>titles(l).size},
 {id:'rebuilder',title:'From the ground up',description:'Win a first title for a club you joined with a survival target or starting XI rating of 74 or lower.',goal:1,progress:l=>l.entries.filter(e=>e.kind==='rebuild').length},
 {id:'relegated',title:'A hard lesson',description:'Experience relegation. Your legacy can continue at another club.',goal:1,progress:l=>l.entries.filter(e=>e.id.endsWith(':relegation')).length},
 {id:'overachiever',title:'Above and beyond',description:'Finish at least five places above the frozen season target.',goal:1,progress:l=>l.entries.filter(e=>e.id.endsWith(':overachiever')).length},
 {id:'unbeaten',title:'Invincibles',description:'Complete a league season without a defeat.',goal:1,progress:l=>l.entries.filter(e=>e.id.endsWith(':unbeaten')).length},
 {id:'century',title:'The hundred club',description:'Earn 100 league points in a season.',goal:1,progress:l=>l.entries.filter(e=>e.id.endsWith(':century')).length},
 {id:'journeyman',title:'New horizons',description:'Manage three different clubs in this career.',goal:3,progress:l=>new Set(l.tenures.map(t=>t.clubId)).size},
 {id:'poached',title:'In demand',description:'Earn and accept a higher-paying poaching offer after meeting expectations.',goal:1,progress:l=>l.entries.filter(e=>e.kind==='move').length},
 {id:'icon',title:'An enduring name',description:'Reach 1,000 legacy points.',goal:1000,progress:l=>Math.max(0,legacyPoints(l))},
 ...Object.entries(awardNames).map(([id,title])=>({id:`award-${id}`,title:`${title} cabinet`,description:`Have your club win ${title}. Player awards require at least half the winner’s appearances at your club.`,goal:1,progress:(l:Legacy)=>Number(awards(l).has(id))})),
 {id:'all-awards',title:'The full trophy cabinet',description:'Collect all nine award types across your career.',goal:9,progress:l=>Object.keys(awardNames).filter(id=>awards(l).has(id)).length},
 {id:'clean-sweep',title:'Awards night sweep',description:'Win all nine award types in the same season.',goal:9,progress:l=>Math.max(0,...l.settledSeasons.map(year=>new Set(l.entries.filter(e=>e.kind==='award'&&e.season===year).map(e=>e.id.split(':').at(-1))).size))},
];
export function updateAchievements(l:Legacy,season:number,clubId:string):Legacy {
 const unlocked=new Set(l.achievements.map(a=>a.id));
 return {...l,achievements:[...l.achievements,...achievementDefinitions.filter(a=>!unlocked.has(a.id)&&a.progress(l)>=a.goal).map(a=>({id:a.id,season,clubId}))]};
}

/** Idempotent, committed full seasons only. Nothing is paid for an unplayed result. */
export function settleLegacySeason(c:Career):Career {
 if(c.pending||c.week!==38||c.status==='active'||c.fixtures.some(f=>f.homeGoals===undefined||f.awayGoals===undefined))return c;
 let l=legacyState(c);if(l.settledSeasons.includes(c.world.season))return c;
 if(l.baseline.clubId!==c.clubId||l.baseline.season!==c.world.season)l=startLegacySeason(c,l);
 const table=standings(leagueClubs(c),c.fixtures),rank=table.findIndex(r=>r.clubId===c.clubId)+1,row=table[rank-1];if(!row||row.played!==38)return c;
 const season=c.world.season,prefix=`${season}:${c.clubId}`,entries:LegacyEntry[]=[];
 const add=(key:string,points:number,reason:string,kind:LegacyEntry['kind']='season')=>entries.push({id:`${prefix}:${key}`,season,clubId:c.clubId,points,reason,kind});
 const gap=l.baseline.target-rank;
 add('expectations',gap*20,gap>0?`Exceeded target ${l.baseline.target}: finished ${rank}.`:gap<0?`Missed target ${l.baseline.target}: finished ${rank}.`:`Met the season target: ${rank}.`);
 if(rank===1){
  add('champion',500,'League champions.','title');
  if(!titles(l).has(c.clubId))add('new-champion',150,'First league title with this club.');
  const tenure=l.tenures.at(-1)!;
  if(!titles(l).has(c.clubId)&&(tenure.entryTarget===17||tenure.entryStrength<=74))add('rebuild',800,'Rebuilt an underdog into a first-time league champion.','rebuild');
 }else if(rank<=4)add('top-four',100,'Secured a top-four finish.');
 else if(rank<=17)add('survival',25,'Kept the club in the league.');
 if(rank>=18)add('relegation',-250,'Relegation and dismissal.');
 if(gap>=5)add('overachiever',75,'Finished at least five places above expectations.');
 if(row.lost===0)add('unbeaten',150,'An unbeaten league season.');
 if(row.points>=100)add('century',100,'Reached 100 league points.');
 const review=c.world.seasonReviews?.find(r=>r.season===season&&r.complete)??seasonReview(c);
 for(const id of clubAwardIds(c,review))add(id,awardPoints[id]??0,`${awardNames[id]??id} won by your club.`,'award');
 const finance=financialSummary(c),debtGrowth=Math.max(0,(c.world.finances[c.clubId].debt??0)-l.baseline.debt);
 if(finance.headroom<0)add('compliance',-Math.min(150,25+Math.ceil(-finance.headroom/1e6)*5),'Financial compliance overspend.','conduct');
 if(debtGrowth>0)add('debt',-Math.min(100,Math.max(10,Math.ceil(debtGrowth/1e6)*10)),'Increased club debt during your season.','conduct');
 l=updateAchievements({...l,entries:[...l.entries,...entries],settledSeasons:[...l.settledSeasons,season]},season,c.clubId);
 const points=legacyPoints(l),reputation=c.reputation==='elite'||points>=1000?'elite':c.reputation==='established'||points>=350?'established':'unknown';
 return {...c,legacy:l,reputation};
}

/** Strict optional-save validation; old careers without legacy remain supported. */
export function validLegacy(c:Career){
 if(c.legacy===undefined)return true;
 const l=c.legacy,ids=new Set(allClubs.map(t=>t.id)),year=(n:number)=>Number.isInteger(n)&&n>=2026&&n<=c.world.season;
 const integer=(n:number)=>Number.isSafeInteger(n),target=(n:number)=>[1,4,10,17].includes(n);
 if(!l||l.version!==1||!year(l.sinceSeason)||!Array.isArray(l.entries)||!Array.isArray(l.achievements)||!Array.isArray(l.tenures)||!l.tenures.length||!Array.isArray(l.settledSeasons)||new Set(l.settledSeasons).size!==l.settledSeasons.length||l.settledSeasons.some(y=>!year(y)))return false;
 const b=l.baseline;
 if(!b||!year(b.season)||!ids.has(b.clubId)||!target(b.target)||!Number.isFinite(b.strength)||b.strength<0||b.strength>100||!Number.isFinite(b.debt)||b.debt<0||typeof b.estimated!=='boolean')return false;
 if(b.targets!==undefined&&(typeof b.targets!=='object'||b.targets===null||Object.entries(b.targets).some(([id,n])=>!ids.has(id)||!target(n))))return false;
 if(new Set(l.entries.map(e=>e.id)).size!==l.entries.length||l.entries.some(e=>typeof e.id!=='string'||!year(e.season)||!ids.has(e.clubId)||!integer(e.points)||Math.abs(e.points)>10000||typeof e.reason!=='string'||!['season','title','rebuild','award','conduct','move'].includes(e.kind)))return false;
 if(new Set(l.achievements.map(a=>a.id)).size!==l.achievements.length||l.achievements.some(a=>!achievementDefinitions.some(d=>d.id===a.id)||!year(a.season)||!ids.has(a.clubId)))return false;
 return l.tenures.every((t,i)=>ids.has(t.clubId)&&year(t.fromSeason)&&(t.toSeason===undefined?i===l.tenures.length-1:year(t.toSeason)&&t.toSeason>=t.fromSeason)&&target(t.entryTarget)&&Number.isFinite(t.entryStrength)&&t.entryStrength>=0&&t.entryStrength<=100&&Number.isFinite(t.wage)&&t.wage>0);
}
