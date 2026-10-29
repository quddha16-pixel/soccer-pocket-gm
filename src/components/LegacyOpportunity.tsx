import type { LegacyOpportunity as Projection } from '../simulation/legacy';

const points=(n:number)=>`${n>=0?'+':'−'}${Math.abs(n).toLocaleString()}`;
export function LegacyOpportunity({projection:p,compact=false}:{projection:Projection;compact?:boolean}){
 return <div className={`legacy-opportunity ${compact?'compact':''}`} role="group" aria-label="Club legacy point potential">
  <span className="eyebrow">League title legacy</span><strong>{points(p.title)}<small> pts</small></strong>
  <div className="legacy-opportunity-bar" role="img" aria-label={`${p.title} points for a league title; ${p.breakdown.filter(r=>r.points>0).map(r=>`${r.reason} ${r.points}`).join(' ')}`}>
   {p.breakdown.filter(r=>r.points>0).map(r=><span key={r.key} className={`legacy-part-${r.kind}`} style={{width:`${r.points/1845*100}%`}} title={`${r.reason} +${r.points}`}/>)}
  </div>
  {!compact&&<><div className="legacy-scenarios"><span>4th <b>{points(p.topFour)}</b></span><span>17th <b>{points(p.survival)}</b></span></div>
  <details><summary>Points breakdown</summary><p>Finish target: {p.target}. {p.estimated?'Preview; next season’s target is fixed after rollover.':'Based on the starting squad.'}</p>{p.breakdown.map(r=><p key={r.key}><span>{r.reason}</span><b>{points(r.points)}</b></p>)}<p>Season outcomes, not a signing reward. Awards, unbeaten seasons, finances and other bonuses are separate.</p></details></>}
 </div>;
}
