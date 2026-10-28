import type { Player } from '../models';
import type { DetailedAttribute } from '../data/playerProfiles';
import { identity } from './identity';

export const traitLabels:Record<string,string>={
 'clinical-finisher':'Clinical Finisher','power-shooter':'Power Shooter','long-range-specialist':'Long-Range Specialist','aerial-threat':'Aerial Threat','poacher':'Poacher','intelligent-runner':'Intelligent Runner','technical-dribbler':'Technical Dribbler','explosive-winger':'Explosive Winger','flair-player':'Flair Player','playmaker':'Playmaker','through-ball-specialist':'Through-Ball Specialist','long-pass-specialist':'Long-Pass Specialist','precision-crosser':'Precision Crosser','set-piece-specialist':'Set-Piece Specialist','press-resistant-distributor':'Press-Resistant Distributor','interceptor':'Interceptor','ball-winner':'Ball Winner','strong-tackler':'Strong Tackler','aerial-defender':'Aerial Defender','recovery-defender':'Recovery Defender','shot-blocker':'Shot Blocker','reflex-specialist':'Reflex Specialist','sweeper-keeper':'Sweeper Keeper','cross-collector':'Cross Collector','long-distribution':'Long Distribution'
};
export function trait(p:Player,id:string){return p.real?.traits.find(t=>t.id===id)?.level??0;}
export function skill(p:Player,key:DetailedAttribute):number {
 const a=identity(p),base=p.real?.attributes[key];
 const group=key==='finishing'||key==='shotPower'||key==='longShots'||key==='heading'?'finishing':key==='shortPassing'||key==='longPassing'||key==='vision'||key==='crossing'||key==='distribution'||key==='kicking'?'passing':key==='dribbling'||key==='ballControl'||key==='agility'||key==='balance'||key==='composure'?'control':key==='standingTackle'||key==='slidingTackle'||key==='interceptions'||key==='marking'||key==='aggression'?'tackling':key==='positioning'||key==='gkPositioning'||key==='aerialAbility'?'positioning':key==='reflexes'||key==='diving'||key==='oneOnOne'?'reflexes':key==='handling'?'handling':'movement';
 // Research values are immutable baselines. Training changes are added separately.
 return Math.max(1,Math.min(99,base===undefined?a.attributes[group]:base+a.attributes[group]-(p.real?.coreBaseline?.[group]??a.development.baseline[group])));
}
export const meanSkill=(p:Player,...keys:DetailedAttribute[])=>keys.reduce((n,k)=>n+skill(p,k),0)/keys.length;
export function creationQuality(p:Player){return meanSkill(p,'vision','shortPassing','longPassing','ballControl',...(['FB','WG'].includes(p.position)?['crossing' as const]:[]))+trait(p,'playmaker')*2+trait(p,'through-ball-specialist')*2+trait(p,'press-resistant-distributor')+trait(p,'long-pass-specialist')+trait(p,'precision-crosser')+trait(p,'set-piece-specialist')*.5;}
export function carryingQuality(p:Player){return meanSkill(p,'acceleration','sprintSpeed','dribbling','agility','balance')+trait(p,'technical-dribbler')*2+trait(p,'explosive-winger')*2+trait(p,'flair-player');}
export function defenceQuality(p:Player){return meanSkill(p,'marking','interceptions','standingTackle','slidingTackle')*.94+meanSkill(p,'aggression','strength')*.06+trait(p,'interceptor')*2+trait(p,'ball-winner')+trait(p,'strong-tackler')+trait(p,'shot-blocker')+trait(p,'recovery-defender')+trait(p,'aerial-defender');}
export function keepingQuality(p:Player){return meanSkill(p,'diving','reflexes','handling','gkPositioning')+trait(p,'reflex-specialist')*1.5+trait(p,'sweeper-keeper')+trait(p,'cross-collector');}
export type ChanceType='close'|'distance'|'aerial'|'one-on-one';
export function conversionProbability(shooter:Player,keeper:Player,defence:number,chance:ChanceType='close',positionSuitability=1){
 const finishing=chance==='distance'?meanSkill(shooter,'longShots','shotPower','composure'):chance==='aerial'?meanSkill(shooter,'heading','jumping','strength'):meanSkill(shooter,'finishing','positioning','composure');
 const specialist=chance==='distance'?trait(shooter,'long-range-specialist')+trait(shooter,'power-shooter'):chance==='aerial'?trait(shooter,'aerial-threat')*1.5:trait(shooter,'clinical-finisher')+trait(shooter,'poacher');
 const goalkeeping=chance==='one-on-one'?meanSkill(keeper,'reflexes','oneOnOne','gkPositioning')+trait(keeper,'sweeper-keeper')*2:chance==='aerial'?meanSkill(keeper,'handling','aerialAbility','gkPositioning')+trait(keeper,'cross-collector')*2:keepingQuality(keeper);
 const fatigue=(.86+.14*shooter.fitness/100)*(.94+.06*skill(shooter,'stamina')/100),morale=.96+.04*shooter.morale/100;
 const base=chance==='distance'?.065:chance==='aerial'?.11:chance==='one-on-one'?.23:.145;
 const form=Math.max(.95,Math.min(1.05,1+(identity(shooter).development.form-6.5)*.015));
 return Math.max(.015,Math.min(.48,(base+(finishing-goalkeeping)*.0022+(75-defence)*.0008+specialist*.006)*fatigue*morale*form*positionSuitability));
}

export function profileLabel(p:Player){return p.real?.primaryPosition??p.position;}
export const attributeLabel=(key:string)=>({gkPositioning:'GK positioning',oneOnOne:'One-on-one',aerialAbility:'Aerial ability',standingTackle:'Standing tackling',slidingTackle:'Sliding tackling',heading:'Heading accuracy'}[key]??key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()));
