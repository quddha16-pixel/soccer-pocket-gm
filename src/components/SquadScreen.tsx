import { useState } from 'react';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { Career } from '../models';
import { PlayerAvatar } from './PlayerAvatar';
import { FormationPitch } from './FormationPitch';
import { DevelopmentScreen } from './DevelopmentScreen';
import { formatMoney, valuation } from '../simulation/management';
import { identity } from '../simulation/identity';

export function SquadScreen({career:c,onChange,onProfile,onTactics,active=true}:{career:Career;onChange:(c:Career)=>void;onProfile:(id:string)=>void;onTactics:()=>void;active?:boolean}){
 const [view,setView]=useState('Lineup'),[filter,setFilter]=useState('All');const squad=c.players.filter(p=>p.clubId===c.clubId);
 return <><div className="segmented" role="group" aria-label="Squad views">{['Lineup','Players','Progress'].map(v=><button key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{v}</button>)}</div>
  <div hidden={view!=='Lineup'}><FormationPitch career={c} onChange={onChange} onProfile={onProfile} active={active&&view==='Lineup'}/><button className="list-link" onClick={onTactics}><SlidersHorizontal size={23}/><span><strong>Match approach</strong><small>{c.tactic==='feed-star'?'Feed Your Star':c.tactic[0].toUpperCase()+c.tactic.slice(1)} · Choose your plan</small></span><ChevronRight size={22}/></button></div>
  <div hidden={view!=='Players'}><div className="section-heading roster-heading"><h2>{squad.length} players</h2><label className="sr-only" htmlFor="roster-filter">Filter squad</label><select id="roster-filter" value={filter} onChange={e=>setFilter(e.target.value)}>{['All','GK','CB','FB','CM','WG','ST'].map(p=><option key={p}>{p}</option>)}</select></div><div className="player-card-list">{squad.filter(p=>filter==='All'||p.position===filter).map(p=><button className="roster-card" key={p.id} onClick={()=>onProfile(p.id)}><PlayerAvatar player={p}/><div className="roster-identity"><h3>{p.name}</h3><p>{p.position} <span>·</span> {p.age} years</p><small>{formatMoney(valuation(p))}{identity(p).injuryWeeks>0?` · Injured ${identity(p).injuryWeeks}w`:''}</small></div><span className="overall-badge"><strong>{p.overall}</strong><small>OVR</small></span><ChevronRight size={18}/></button>)}</div></div>
  <div hidden={view!=='Progress'}><DevelopmentScreen career={c} onProfile={onProfile}/></div>
 </>;
}
