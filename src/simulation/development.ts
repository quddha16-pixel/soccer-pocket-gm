import { developmentMultiplier } from './managerStyles';
import type { Career, Player } from '../models';
import { enrichPlayer, hash, identity, overallFromAttributes, primarySkills, skills } from './identity';
import { random } from './random';
import { staffQuality } from './staff';
import { lineupFit } from './management';
export function developPlayer(p:Player,c:Career,minutes:number,rating:number,opposition:number):Player{
 const result=enrichPlayer(p,c.world.season,c.week),a=structuredClone(identity(result)),d=a.development;
 const rng=random(hash(`${p.id}-${c.world.season}-${c.week+1}-growth`));
 d.minutes+=minutes;if(minutes)d.form=d.form*.7+rating*.3;
 const ageFactor=p.age<=18?1.45:p.age<=21?1.2:p.age<=24?.8:p.age<=27?.23:p.age<=30?.06:0;
 const suitability=p.clubId===c.clubId&&c.lineup.includes(p.id)?lineupFit(p,c.formation,c.lineup.indexOf(p.id)):1;
 const headroom=Math.max(0,p.potential-p.overall),time=(a.injuryWeeks>0?.08:.23+Math.min(1,minutes/90)*.77*suitability),form=.8+Math.max(0,rating-6)*.12;
 const tendency=d.tendency==='early'?(p.age<=21?1.25:.8):d.tendency==='late'?(p.age>=22?1.35:.8):d.tendency==='volatile'?(rng()<.08?2.5:.75):1;
 const breakout=headroom>=8&&p.age<=24&&rng()<.06?1.8:1;
 const main=primarySkills(p);
 for(const key of skills){
 const role=['finishing','movement'].includes(key)?'Shooting Coach':['control','passing'].includes(key)?'Dribbling Coach':'Defensive Coach';
 const coach=p.clubId?staffQuality(c,p.clubId,role):20;
 const coaching=.75+coach/200;
 const growth=Math.min(.26,ageFactor*d.growth*time*form*coaching*tendency*breakout*developmentMultiplier(c,p.clubId)*(.65+rng()*.7)*Math.min(1,headroom/5)*(main.includes(key)?1:.3)*.065*(.9+opposition/800));
 const decline=p.age>=31?(.009+(p.age-31)*.005)*(main.includes(key)?1:.4):0;
 a.attributes[key]=Math.max(p.real?1:30,Math.min(p.real?99:p.potential,a.attributes[key]+growth-decline));
 }
 // Keep a hard ceiling and derive overall from position-specific skills.
 const overall=Math.min(p.potential,overallFromAttributes(p,a.attributes));
 const week=c.week+1;if(week%4===0||week===38){d.history.push({season:c.world.season,week,overall,minutes:d.minutes});d.history=d.history.slice(-80);}
 if(a.injuryWeeks>0){const doctor=p.clubId?staffQuality(c,p.clubId,'Team Doctor'):25;a.injuryWeeks=Math.max(0,a.injuryWeeks-1-(rng()<doctor/400?1:0));if(!a.injuryWeeks)a.recurrence=3;}
 else if(minutes&&p.clubId){
 const doctor=staffQuality(c,p.clubId,'Team Doctor'),healthy=c.players.filter(x=>x.clubId===p.clubId&&identity(x).injuryWeeks===0);
 const safe=healthy.length>=17&&(p.position!=='GK'||healthy.filter(x=>x.position==='GK').length>=2);
 if(safe&&rng()<.009*(1-doctor/250)*(a.recurrence?1.3:1)){a.injuryWeeks=1+Math.floor(rng()*4);a.recurrence=0;}
 }
 if(a.recurrence>0)a.recurrence--;
 return {...result,overall,identity:a,transferValue:overall===p.overall?p.transferValue:undefined};
}
export function developRound(c:Career){
 const performances=new Map((c.pending?.fixtures??[]).flatMap(f=>f.report?.performances.map(p=>[p.playerId,{performance:p,opposition:c.players.filter(x=>x.clubId===(p.clubId===f.homeId?f.awayId:f.homeId)).reduce((s,x)=>s+x.overall,0)/Math.max(1,c.players.filter(x=>x.clubId===(p.clubId===f.homeId?f.awayId:f.homeId)).length)}] as const)??[]));
 return c.players.map(p=>{const perf=performances.get(p.id);return developPlayer(p,c,perf?(perf.performance.minutes??90):0,perf?.performance.rating??6.3,perf?.opposition??70);});
}
