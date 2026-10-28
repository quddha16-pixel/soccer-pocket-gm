import type { Career } from '../models';
import { playerFormReport } from '../simulation/playerForm';
import { PlayerAvatar } from './PlayerAvatar';

export function PlayerFormCard({career:c,onProfile,onSquad}:{career:Career;onProfile?:(id:string)=>void;onSquad?:()=>void}){
 const report=playerFormReport(c);
 return <section className="panel player-form-panel" aria-label="Player form report"><div className="section-heading"><h2>Player form</h2><span className="tag">Season averages</span></div>
  <p className="small muted">Match ratings weighted by minutes played for your club. Early samples need more time.</p>
  {!report.rated?<div className="empty-state"><p>Play a match to reveal your best and lowest averages.</p><span>Unused players have no rating yet.</span></div>:<div className="form-comparison">{[{title:'Best 3 averages',rows:report.best,kind:'best'},{title:'Lowest 3 averages',rows:report.worst,kind:'lowest'}].map(group=><div className={`form-column ${group.kind}`} key={group.kind}><h3>{group.title}</h3>{group.rows.map(row=><article className="form-player" key={row.player.id}>
   <button className="form-player-heading" disabled={!onProfile} onClick={()=>onProfile?.(row.player.id)} aria-label={`View ${row.player.name} profile`}><PlayerAvatar player={row.player}/><span><strong>{row.player.name}</strong><small>{row.player.real?.primaryPosition??row.player.position} · {row.starter?'Starting XI':'Bench / rotation'}</small></span><b aria-label={`${row.player.name} average ${row.average.toFixed(2)}`}>{row.average.toFixed(2)}<small>AVG</small></b></button>
   <p className="form-sample">{row.appearances} {row.appearances===1?'appearance':'appearances'} · {row.minutes} min{row.early?' · Early sample':''}</p><p className="form-advice">{row.advice}</p>
  </article>)}{!group.rows.length&&<p className="small muted">More players need match minutes before this list fills.</p>}</div>)}</div>}
  {onSquad&&report.rated>0&&<button className="secondary full" onClick={onSquad}>Review starting XI</button>}
 </section>;
}
