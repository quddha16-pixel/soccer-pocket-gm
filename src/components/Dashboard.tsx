import { ArrowRight, ChevronRight, Trophy, CalendarDays } from 'lucide-react';
import type { Career } from '../models';
import { clubById } from '../data/clubs';
import { dashboard } from '../simulation/dashboard';
import { PlayerFormCard } from './PlayerFormCard';
import { LegacySummary } from './LegacyScreen';
import { ClubMark } from './ClubMark';

export function Dashboard({career:c,onMatch,onStats,onProfile,onSquad,onLegacy,onMarket,onClub}:{career:Career;onMatch:()=>void;onStats:()=>void;onProfile?:(id:string)=>void;onSquad?:()=>void;onLegacy?:()=>void;onMarket?:()=>void;onClub?:()=>void}){
 const d=dashboard(c),club=clubById(c.clubId),next=c.fixtures.find(f=>f.week===c.week+1&&[f.homeId,f.awayId].includes(c.clubId));
 const opponent=next?clubById(next.homeId===c.clubId?next.awayId:next.homeId):null;
 return <div className="home-content">
  <section className="home-club" style={{'--club-color':club.color} as React.CSSProperties}>
   <ClubMark club={club} large/><div><p className="eyebrow">Your club</p><h1>{club.name}</h1><p className="muted">{c.manager} · {c.world.season}–{String(c.world.season+1).slice(-2)}</p></div>
  </section>
  <section className="home-standing" aria-label="Season summary"><div><span><Trophy size={18}/>League position</span><strong>{d.rank}<small> / 20</small></strong></div><div><span>Points</span><strong>{d.row.points}<small> pts</small></strong></div><div className="home-form"><span>Recent form</span><div className="form-chips">{[...d.recent].reverse().map(r=><span key={r.fixture.id} className={`form-chip ${r.outcome}`} aria-label={r.outcome==='W'?'Win':r.outcome==='D'?'Draw':'Loss'}>{r.outcome}</span>)}{!d.recent.length&&<span className="form-empty">— — —</span>}</div><small>{c.week?`${d.row.played} matches played`:'A new season awaits'}</small></div></section>
  <section className="panel next-fixture-card"><div className="section-heading"><h2>Up next</h2><span className="tag"><CalendarDays size={16}/>{next?`Week ${next.week}`:'Full time'}</span></div>{next&&opponent?<>
   <div className="next-opponent"><ClubMark club={opponent} large/><div><h3>{opponent.name}</h3><p>{next.homeId===c.clubId?'At home':'Away from home'} <span aria-hidden="true">·</span> {d.table.findIndex(r=>r.clubId===opponent.id)+1} in the league</p></div></div>
   <button className="primary full play-next" onClick={onMatch}>{c.pending?'Resume Match':'Play Next Match'}<ArrowRight size={22}/></button>
   <p className="button-note">Watch the action or choose a quick simulation.</p>
  </>:<p className="muted">All 38 matchweeks are complete. Review your season below.</p>}</section>
  <div className="home-quick-actions" aria-label="Career shortcuts">{onSquad&&<button onClick={onSquad}><strong>Set your XI</strong><small>Pitch & depth chart</small><ArrowRight size={18}/></button>}{onMarket&&<button onClick={onMarket}><strong>Find a signing</strong><small>Transfers & free agents</small><ArrowRight size={18}/></button>}{onClub&&<button onClick={onClub}><strong>Manage club</strong><small>Staff, budgets & legacy</small><ArrowRight size={18}/></button>}<button onClick={onStats}><strong>Season detail</strong><small>Performance & finances</small><ArrowRight size={18}/></button></div>
  {onLegacy&&<LegacySummary career={c} onOpen={onLegacy}/>}
  <PlayerFormCard career={c} onProfile={onProfile} onSquad={onSquad}/>
  <section className="home-recent"><div className="section-heading"><h2>Recent results</h2><button className="text-button" onClick={onStats}>View details <ChevronRight size={18}/></button></div>{d.recent.length?d.recent.slice(0,3).map(r=><div className="recent-result" key={r.fixture.id}><span className={`form-chip ${r.outcome}`} aria-label={r.outcome==='W'?'Win':r.outcome==='D'?'Draw':'Loss'}>{r.outcome}</span><ClubMark club={clubById(r.opponentId)}/><span className="recent-opponent">{clubById(r.opponentId).name}<small>{r.home?'Home':'Away'} · Week {r.fixture.week}</small></span><strong>{r.gf} – {r.ga}</strong></div>):<div className="empty-state"><CalendarDays size={28}/><p>Your story starts at kickoff.</p><span>Results will appear after your first match.</span></div>}</section>
  <button className="list-link" onClick={onStats}><span><strong>Season in detail</strong><small>Squad leaders, finances & performance</small></span><ChevronRight size={22}/></button>
 </div>;
}
