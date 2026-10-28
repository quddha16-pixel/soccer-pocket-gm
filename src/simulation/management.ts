import { seasonRules } from '../data/rules';
import type { Career, Formation, Player, Position } from '../models';
import { coarsePosition } from '../data/playerProfiles';
import type { NaturalPosition } from '../data/playerProfiles';
export const formations:Formation[]=['4-3-3','4-4-2','4-2-3-1'];
export const slots:Record<Formation,Position[]>={
 '4-3-3':['GK','FB','CB','CB','FB','CM','CM','CM','WG','ST','WG'],
 '4-4-2':['GK','FB','CB','CB','FB','WG','CM','CM','WG','ST','ST'],
 '4-2-3-1':['GK','FB','CB','CB','FB','CM','CM','WG','CM','WG','ST']
};
export const naturalSlots:Record<Formation,NaturalPosition[]>={
 '4-3-3':['GK','LB','CB','CB','RB','CM','CDM','CM','LW','ST','RW'],
 '4-4-2':['GK','LB','CB','CB','RB','LM','CM','CM','RM','ST','ST'],
 '4-2-3-1':['GK','LB','CB','CB','RB','CDM','CDM','LW','CAM','RW','ST']
};
export const coordinates:Record<Formation,number[][]>={
 '4-3-3':[[50,89],[14,71],[38,73],[62,73],[86,71],[23,48],[50,53],[77,48],[16,23],[50,16],[84,23]],
 '4-4-2':[[50,89],[14,71],[38,73],[62,73],[86,71],[13,43],[38,47],[62,47],[87,43],[32,19],[68,19]],
 '4-2-3-1':[[50,89],[14,72],[38,74],[62,74],[86,72],[33,56],[67,56],[16,32],[50,35],[84,32],[50,15]]
};
export function positionFit(p:Position,slot:Position){return p===slot?1:(['WG','ST','CM'].includes(p)&&['WG','ST','CM'].includes(slot))||(['FB','CB'].includes(p)&&['FB','CB'].includes(slot))?.94:.72;}
export function naturalFit(player:Player,position:NaturalPosition){
 if(!player.real)return positionFit(player.position,coarsePosition(position));
 const p=player.real;if(p.primaryPosition===position)return 1;
 if(p.secondaryPositions.includes(position))return .98;
 if(p.primaryPosition==='GK'||position==='GK')return .2;
 const adjacent:NaturalPosition[][]=[['LB','LWB'],['RB','RWB'],['LW','LM'],['RW','RM'],['ST','CF'],['CDM','CM'],['CM','CAM']];
 if(adjacent.some(group=>group.includes(position)&&[p.primaryPosition,...p.secondaryPositions].some(pos=>group.includes(pos))))return .94;
 return coarsePosition(position)===player.position?.84:.7;
}
export const lineupFit=(p:Player,formation:Formation,index:number)=>naturalFit(p,naturalSlots[formation][index]);
export function autoLineup(players:Player[],clubId:string,formation:Formation){
 const available=players.filter(p=>p.clubId===clubId&&!(p.identity?.injuryWeeks));return slots[formation].map((slot,index)=>{const candidates=available.filter(p=>slot==='GK'?p.position==='GK':p.position!=='GK').sort((a,b)=>b.overall*lineupFit(b,formation,index)-a.overall*lineupFit(a,formation,index)||a.id.localeCompare(b.id));const chosen=candidates[0];if(!chosen)throw Error('Insufficient players for a valid lineup.');available.splice(available.indexOf(chosen),1);return chosen.id;});
}
export function validLineup(players:Player[],clubId:string,lineup:string[]){return Array.isArray(lineup)&&lineup.length===11&&new Set(lineup).size===11&&lineup.every(id=>players.some(p=>p.id===id&&p.clubId===clubId&&!p.identity?.injuryWeeks))&&players.find(p=>p.id===lineup[0])?.position==='GK'&&lineup.slice(1).every(id=>players.find(p=>p.id===id)?.position!=='GK');}
export function assignPlayer(c:Career,index:number,id:string):Career{
 if(c.pending||index<0||index>=11)return c;
 const lineup=[...c.lineup],old=lineup.indexOf(id);if(old>=0)lineup[old]=lineup[index];lineup[index]=id;
 if(!validLineup(c.players,c.clubId,lineup)||lineup.some(id=>{const p=c.players.find(p=>p.id===id)!;return c.world&&p.identity!.birthDate<seasonRules(c.world.season).u21Cutoff&&!c.world.registration[c.clubId].includes(id);}))return c;
 return {...c,lineup,starId:eligibleStars({...c,lineup}).some(p=>p.id===c.starId)?c.starId:eligibleStars({...c,lineup})[0]?.id??''};
}
export function eligibleStars(c:Pick<Career,'players'|'lineup'>){return c.players.filter(p=>c.lineup.includes(p.id)&&['ST','WG','CM'].includes(p.position)).sort((a,b)=>b.overall-a.overall);}
export function changeFormation(c:Career,formation:Formation):Career{
 if(c.pending)return c;
 const lineup=autoLineup(c.players.filter(p=>!c.world||p.identity!.birthDate>=seasonRules(c.world.season).u21Cutoff||c.world.registration[c.clubId].includes(p.id)),c.clubId,formation);const stars=eligibleStars({...c,lineup});return {...c,formation,lineup,starId:stars.some(p=>p.id===c.starId)?c.starId:stars[0]?.id??''};
}
export function valuation(p:Player){
 if(p.transferValue!==undefined)return p.transferValue;
 const form=Math.max(.85,Math.min(1.2,1+((p.identity?.development.form??6.5)-6.5)*.035));
 if(p.real){const r=p.real,growth=Math.exp((p.overall-r.overall)*.09),ageFactor=Math.max(.18,Math.min(1.4,1+(p.age-r.startingAge)*(p.age>29?-.075:p.age<25?.025:0))),contract=p.contractYears===0?.7:p.contractYears===1?.82:1;
 return Math.round(Math.max(50000,r.startingValue*growth*ageFactor*contract*form)/10000)*10000;}
 return Math.round(Math.max(100000,(p.overall-48)**3*1150)*(p.age<25?1.25:p.age>29?.65:1)*(1+(p.potential-p.overall)/40)*(p.contractYears===0?.82:p.contractYears===1?.9:1)*form/10000)*10000;
}
export function mostValuable(players:Player[],clubId:string){return players.filter(p=>p.clubId===clubId).sort((a,b)=>valuation(b)-valuation(a)||a.id.localeCompare(b.id)).slice(0,3);}
export const formatMoney=(value:number)=>{const sign=value<0?'-':'';const amount=Math.abs(value);return sign+(amount>=1e6?`£${(amount/1e6).toFixed(1)}M`:`£${Math.round(amount/1000)}K`);};
