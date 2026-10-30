import type {AimedShot,AimPoint,DrawnPlay,MomentKind,MomentOption} from '../models';
import {aimedProbabilities,pointDistance,shotGeometry,shotPower,validAimedShot} from './shotGeometry';

export const drawnKinds:MomentKind[]=['penalty','free-kick','corner','cross','one-on-one','big-chance'];
export const isDelivery=(kind:MomentKind)=>kind==='corner'||kind==='cross';
export const deliveryTargets=[{id:'near',x:.30,y:.55,label:'Near post'},{id:'far',x:.72,y:.43,label:'Far post'},{id:'edge',x:.49,y:.66,label:'Cut-back'}] as const;
export function deliveryTarget(path:AimPoint[]){const end=path.at(-1)!;return [...deliveryTargets].sort((a,b)=>pointDistance(end,a)-pointDistance(end,b))[0];}
export function drawnOption(kind:MomentKind,p:DrawnPlay):MomentOption {
 if(p.approach==='pass')return kind==='big-chance'?2:1;
 if(isDelivery(kind)){const t=deliveryTarget(p.delivery!.path);return t.id==='edge'?2:kind==='corner'?(t.id==='near'?0:1):p.flight==='driven'?1:0;}
 return kind==='penalty'?(p.flight==='chip'?2:1):kind==='one-on-one'?(p.flight==='chip'?2:0):0;
}
export function validDrawnPlay(p:DrawnPlay,kind:MomentKind){
 const openPass=p?.approach==='pass'&&['one-on-one','big-chance'].includes(kind),delivery=isDelivery(kind)||openPass;
 return !!p&&p.version===1&&(p.approach===undefined||openPass)&&drawnKinds.includes(kind)&&['driven','lofted','chip'].includes(p.flight)&&validAimedShot(p.shot)&&
  (delivery?!!p.delivery&&validAimedShot(p.delivery)&&p.flight!=='chip':p.delivery===undefined&&p.flight!=='lofted'&&(!['free-kick','big-chance'].includes(kind)||p.flight==='driven'));
}
export function copyDrawnPlay(p:DrawnPlay):DrawnPlay {const copy=(s:AimedShot)=>({...s,path:s.path.map(p=>({...p}))});return {...p,shot:copy(p.shot),...(p.delivery?{delivery:copy(p.delivery)}:{})};}
/** Resample the displayed stroke. The same bounded polyline is saved, judged and replayed. */
export function refineStroke(points:AimPoint[]):AimPoint[]{
 if(points.length<3)return points.map(p=>({...p}));
 const smooth=points.map((p,i)=>i===0||i===points.length-1?p:{x:(points[i-1].x+p.x*2+points[i+1].x)/4,y:(points[i-1].y+p.y*2+points[i+1].y)/4});
 if(smooth.length<=64)return smooth;
 const result=[smooth[0]];for(let i=1;i<63;i++)result.push(smooth[Math.round(i*(smooth.length-1)/63)]);result.push(smooth.at(-1)!);return result;
}
interface Assessment {completion:number;conversion:number;onTarget:number}
export function drawnProbabilities(base:Assessment,p:DrawnPlay,kind:MomentKind,ability:number){
 const delivery=!!p.delivery,shot=shotGeometry(p.shot),power=shotPower(p.shot);
 if(!delivery){
  if(kind==='penalty'||kind==='free-kick')return aimedProbabilities(base,p.shot,kind,ability);
  const control=Math.max(.55,Math.min(1,.85+ability/650-shot.edgeRisk*(1-ability/125)*.35-shot.complexity*.10));
  return {...base,conversion:shot.inside?Math.max(.015,Math.min(.65,base.conversion*control+shot.corner*.07+(power-.65)*.035)):0,onTarget:shot.inside?1:0};
 }
 const t=deliveryTarget(p.delivery!.path),distance=pointDistance(p.delivery!.path.at(-1)!,t),quality=Math.max(0,1-distance/.21),route=shotGeometry(p.delivery!),pace=shotPower(p.delivery!);
 const completion=distance>.21?0:Math.max(.05,Math.min(.97,base.completion*(.48+.52*quality)*(1-Math.min(.35,route.complexity*.08))*(p.flight==='driven'?.88+pace*.12:1)));
 const control=Math.max(.45,Math.min(1,.80+ability/650-shot.edgeRisk*(1-ability/125)*.35-shot.complexity*.10));
 return {...base,completion,conversion:shot.inside?Math.max(.01,Math.min(.60,base.conversion*control+shot.corner*.035)):0,onTarget:shot.inside?1:0};
}
export function drawnReceiver(m:{receiverId:string;alternateId:string;supportId:string},p:DrawnPlay){const t=deliveryTarget(p.delivery!.path);return t.id==='far'?m.alternateId:t.id==='edge'?m.supportId:m.receiverId;}
