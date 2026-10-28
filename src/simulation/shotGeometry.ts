import type { AimedShot, AimPoint } from '../models';

// Normalised coordinates shared by the touch surface, replay and match rules.
export const shotBall:AimPoint={x:.5,y:.88};
export const shotGoal={left:.10,right:.90,top:.08,bottom:.50};
export const shotWall={left:.41,right:.59,top:.60,bottom:.68};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const pointDistance=(a:AimPoint,b:AimPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
export function validAimedShot(shot:AimedShot){
 return !!shot&&Array.isArray(shot.path)&&shot.path.length>=2&&shot.path.length<=64&&shot.path.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)&&pointDistance(shot.path[0],shotBall)<.002&&pointDistance(shot.path.at(-1)!,shotBall)>=.2&&shot.path.at(-1)!.y<shotBall.y-.15;
}
export function shotPathData(path:AimPoint[]){return path.map((p,i)=>`${i?'L':'M'}${(p.x*320).toFixed(2)} ${(p.y*270).toFixed(2)}`).join(' ');}
export function pathPosition(path:AimPoint[],progress:number):AimPoint {
 if(!path.length)return shotBall;
 if(progress<=0)return path[0];if(progress>=1)return path.at(-1)!;
 const lengths=path.slice(1).map((p,i)=>pointDistance(path[i],p)),total=lengths.reduce((n,v)=>n+v,0);let remaining=total*clamp(progress);
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]&&lengths[i]>0){const t=remaining/lengths[i];return {x:path[i].x+(path[i+1].x-path[i].x)*t,y:path[i].y+(path[i+1].y-path[i].y)*t};}remaining-=lengths[i];}
 return path.at(-1)!;
}
export function shotGeometry(shot:AimedShot){
 const end=shot.path.at(-1)!,inside=end.x>shotGoal.left&&end.x<shotGoal.right&&end.y>shotGoal.top&&end.y<shotGoal.bottom;
 const gx=(end.x-shotGoal.left)/(shotGoal.right-shotGoal.left),gy=(end.y-shotGoal.top)/(shotGoal.bottom-shotGoal.top);
 const corner=clamp(Math.hypot((gx-.5)*2,(gy-.5)*2)/Math.SQRT2),edge=Math.min(end.x-shotGoal.left,shotGoal.right-end.x,end.y-shotGoal.top,shotGoal.bottom-end.y);
 const length=shot.path.slice(1).reduce((n,p,i)=>n+pointDistance(p,shot.path[i]),0),complexity=Math.max(0,length/Math.max(.1,pointDistance(shot.path[0],end))-1.35);
 let wallAt:number|undefined;
 // Sample the actual polyline, not just the endpoint or a chord through a curve.
 for(let i=0;i<=160;i++){const p=pathPosition(shot.path,i/160);if(p.x>=shotWall.left&&p.x<=shotWall.right&&p.y>=shotWall.top&&p.y<=shotWall.bottom){wallAt=i/160;break;}}
 return {end,inside,corner,edgeRisk:clamp((.025-edge)/.025),complexity,wallAt};
}
export function aimedProbabilities(base:{completion:number;conversion:number;onTarget:number},shot:AimedShot,kind:'penalty'|'free-kick',ability:number){
 const geometry=shotGeometry(shot),control=clamp(.82+ability/550-geometry.edgeRisk*(1-ability/125)*.45-geometry.complexity*.12,.4,1);
 const wallRisk=kind==='free-kick'&&geometry.wallAt!==undefined?clamp(.70-ability*.003,.25,.65):0;
 return {...base,completion:1-wallRisk,conversion:geometry.inside?clamp(base.conversion*control+geometry.corner*(kind==='penalty'?.10:.07),.015,kind==='penalty'?.93:.48):0,onTarget:geometry.inside?1:0};
}
