import type { Tactic } from '../models';
function poisson(lambda:number,rng:()=>number){let p=1,k=0;do{k++;p*=rng();}while(p>Math.exp(-lambda));return k-1;}
export function score(home:number,away:number,rng:()=>number,homeTactic:Tactic='balanced',awayTactic:Tactic='balanced'){
 const attack=(t:Tactic)=>t==='attacking'?1.18:t==='defensive'?.8:1;
 const concede=(t:Tactic)=>t==='attacking'?1.15:t==='defensive'?.85:1;
 const diff=(home-away)/27;
 return [poisson(Math.max(.25,Math.min(4.2,1.5*Math.exp(diff)*attack(homeTactic)*concede(awayTactic))),rng),poisson(Math.max(.2,Math.min(3.8,1.15*Math.exp(-diff)*attack(awayTactic)*concede(homeTactic))),rng)];
}
