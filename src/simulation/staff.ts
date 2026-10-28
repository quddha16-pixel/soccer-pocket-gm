import { copyLiveWorld } from './worldCopy';
import managerReferences from '../../docs/research/managers-2026.json';
import type { Career, Club } from '../models';
import type { Staff, StaffRole } from '../worldModels';
import { clubs, clubById } from '../data/clubs';
import { hash } from './identity';
import { random } from './random';
export const staffRoles:StaffRole[]=['Manager','Assistant Manager','Shooting Coach','Dribbling Coach','Defensive Coach','Scout','Team Doctor'];
export function generateStaff(season:number,userClub:string,manager:string,teams:Club[]=clubs,includeFreeAgents=true,useRealManagers=true):Staff[]{
 const staff:Staff[]=[];
 for(const [ci,club] of teams.entries())for(const [ri,role] of staffRoles.entries()){
 const reference=useRealManagers&&role==='Manager'?managerReferences.find(m=>m.clubId===club.id):undefined;
 const rng=random(hash(`${club.id}-${role}`)),rating=Math.min(95,Math.max(35,club.strength-15+Math.floor(rng()*20)));
 staff.push({id:`staff-${club.id}-${ri}`,reference:reference?{source:reference.source,checked:reference.checked}:undefined,name:reference?.name??(club.id===userClub&&role==='Manager'?manager:`${['Marco','James','Luis','Pierre','Daniel','Ali','Jonas'][ri]} ${['Walker','Moretti','Sanchez','Berg','Parker','Silva','Dubois'][ci%7]}`),age:35+Math.floor(rng()*26),role,nationality:reference?.nationality??['England','Spain','Italy','France'][ci%4],rating,specialism:Math.min(99,rating+3),reputation:rating,philosophy:ri%3===0?'attacking':ri%3===1?'balanced':'defensive',clubId:club.id,wage:Math.round((rating*rating)*(role==='Manager'?3.5:.5)/100)*100,contractEnd:`${season+2}-06-30`,appointedSeason:season,appointedWeek:0,controlled:club.id===userClub&&role==='Manager'});
 }
 for(let i=0;includeFreeAgents&&i<18;i++){const role=staffRoles[1+i%6];staff.push({id:`staff-free-${season}-${i}`,name:`${['Adrian','Sofia','Chris','Elena','Nathan','Amelia'][i%6]} ${['Cole','Marin','Watts'][Math.floor(i/6)]}`,age:32+i,role,nationality:i%2?'England':'Portugal',rating:48+(i*7)%43,specialism:60+(i*3)%35,reputation:50+(i*5)%40,philosophy:'balanced',clubId:'',wage:1000+i*350,contractEnd:`${season+2}-06-30`,appointedSeason:season,appointedWeek:0});}
 return staff;
}
export function staffQuality(c:Career,clubId:string,role:StaffRole){return c.world.staff.find(s=>s.clubId===clubId&&s.role===role)?.rating??30;}
export function staffCompensation(s:Staff,date:string){return s.clubId?Math.max(0,Math.ceil((Date.parse(s.contractEnd)-Date.parse(date))/(7*864e5)))*s.wage*.5:0;}
export function hireStaff(c:Career,id:string,wage:number,years:number):Career{
 if(c.pending||c.status!=='active')throw Error('Staff changes are locked during a resolved match or ended career.');
 const s=c.world.staff.find(s=>s.id===id);if(!s||s.role==='Manager'||s.controlled)throw Error('The manager role is not available for recruitment.');
 if(!Number.isFinite(wage)||wage<0||!Number.isInteger(years)||years<1||years>5)throw Error('Enter valid weekly wages and 1–5 contract years.');
 const own=s.clubId===c.clubId,club=clubById(c.clubId);
 if(wage<s.wage*(own?1:1.12)||(!own&&club.strength+12<s.reputation&&wage<s.wage*1.8))throw Error('Staff member rejected: wages or club ambitions do not meet their expectations.');
 const outgoing=c.world.staff.find(p=>p.clubId===c.clubId&&p.role===s.role&&p.id!==s.id);
 const compensation=own?0:staffCompensation(s,c.world.date),termination=outgoing?staffCompensation(outgoing,c.world.date):0,cost=compensation+termination;
 const f=c.world.finances[c.clubId];if(cost>f.cash||cost>f.budget)throw Error('Insufficient funds for compensation and replacement costs.');
 const payroll=c.world.staff.filter(s=>s.clubId===c.clubId&&s.id!==outgoing?.id&&s.id!==id).reduce((n,s)=>n+s.wage,0)+c.players.filter(p=>p.clubId===c.clubId).reduce((n,p)=>n+p.wage,0)+wage;
 if(payroll>f.wageCap)throw Error('Staff appointment would exceed the weekly wage capacity.');
 const world=copyLiveWorld(c.world);world.finances[c.clubId]={...f,cash:f.cash-cost,budget:f.budget-cost,operatingCosts:f.operatingCosts+cost};
 if(s.clubId&&s.clubId!==c.clubId)world.finances[s.clubId].cash+=compensation;
 world.staff=world.staff.map(p=>p.id===id?{...p,clubId:c.clubId,wage,contractEnd:`${world.season+years}-06-30`,appointedSeason:world.season,appointedWeek:c.week}:p.id===outgoing?.id?{...p,clubId:'',contractEnd:world.date}:p);
 world.news.unshift({id:`hire-${id}-${world.season}-${c.week}-${world.news.length}`,date:world.date,text:`${c.manager} appointed ${s.name} as ${s.role}. Compensation and termination: £${Math.round(cost).toLocaleString()}.`});
 return {...c,world,transferBudget:world.finances[c.clubId].budget};
}
export function releaseStaff(c:Career,id:string):Career{
 if(c.pending||c.status!=='active')throw Error('Staff changes are currently locked.');const s=c.world.staff.find(s=>s.id===id);if(!s||s.clubId!==c.clubId||s.role==='Manager')throw Error('This staff member cannot be released.');
 const cost=staffCompensation(s,c.world.date),f=c.world.finances[c.clubId];if(cost>f.cash||cost>f.budget)throw Error('Insufficient funds to terminate this contract.');
 const world=copyLiveWorld(c.world);world.staff=world.staff.map(p=>p.id===id?{...p,clubId:'',contractEnd:world.date}:p);world.finances[c.clubId]={...f,cash:f.cash-cost,budget:f.budget-cost,operatingCosts:f.operatingCosts+cost};world.news.unshift({id:`release-staff-${id}-${world.news.length}`,date:world.date,text:`${s.name} released from ${s.role}.`});return {...c,world,transferBudget:world.finances[c.clubId].budget};
}
