import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import type { Career } from '../models';
import { clubById } from '../data/clubs';
import { findBoxScore, type BoxPlayer } from '../simulation/boxScore';
import { ClubMark } from './ClubMark';
import { Modal } from './Modal';
import { PlayerAvatar } from './PlayerAvatar';

export function BoxScoreDialog({career:c,season,fixtureId,onClose,onProfile}:{career:Career;season:number;fixtureId:string;onClose:()=>void;onProfile?:(id:string)=>void}){
 const data=useMemo(()=>findBoxScore(c,season,fixtureId),[c,season,fixtureId]),id=useId(),content=useRef<HTMLDivElement>(null),tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const [team,setTeam]=useState(()=>data&&[data.fixture.homeId,data.fixture.awayId].includes(c.clubId)?c.clubId:data?.fixture.homeId),[expanded,setExpanded]=useState<string|null>(null);
 if(!data)return <Modal title="Match box score" onClose={onClose} closeLabel="Close box score"><p>This match has not finished. Box scores open at full time.</p></Modal>;
 const {fixture:f,box}=data,clubs=[clubById(f.homeId),clubById(f.awayId)],selected=team===f.awayId?f.awayId:f.homeId,rows=box?(selected===f.homeId?box.home:box.away):[],club=clubById(selected);
 const total=(key:'shots'|'onTarget'|'chances'|'saves'|'tackles')=>rows.reduce((n,p)=>n+p[key],0),possession=box?(selected===f.homeId?box.homePossession:100-box.homePossession):null;
 function select(index:number,focus=false){setTeam(clubs[index].id);setExpanded(null);const scroller=content.current?.closest('.modal-content');if(scroller)scroller.scrollTop=0;if(focus)tabs.current[index]?.focus();}
 function row(p:BoxPlayer){
  const player=c.players.find(x=>x.id===p.playerId),name=player?.name??p.playerId,open=expanded===p.playerId;
  return <tbody key={p.playerId} className={p.minutes===0?'box-unused':''}><tr><td><button className="box-player-name" onClick={()=>setExpanded(open?null:p.playerId)} aria-expanded={open} aria-controls={`${id}-${p.playerId}`} aria-label={`${open?'Hide':'Show'} stats for ${name}`}>{player&&<PlayerAvatar player={player}/>}<span><strong>{name}{box?.motmId===p.playerId&&<Star size={12} aria-label="Player of the Match"/>}</strong><small>{p.position} · {p.minutes===0?'Unused substitute':p.entered===0?'Starter':`On ${p.entered}′`}{p.minutes>0&&p.exited!<90?` · Off ${p.exited}′`:''}</small></span><ChevronDown size={13}/></button></td><td>{p.minutes}</td><td>{p.goals}</td><td>{p.assists}</td><td><span className={`box-rating ${p.rating!==null&&p.rating>=8?'excellent':''}`}>{p.rating===null?'—':p.rating.toFixed(1)}</span></td></tr>
  <tr id={`${id}-${p.playerId}`} hidden={!open}><td colSpan={5}><div className="box-player-detail"><div className="box-stat-grid">{[['Shots',p.shots],['On target',p.onTarget],['Chances created',p.chances],['Saves',p.saves],['Tackles',p.tackles],['Goals conceded',p.conceded]].map(([label,value])=><span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div><p>{p.minutes>0?`Played ${p.entered}′–${p.exited}′ · ${p.minutes} minutes`:'Named on the bench; did not enter the match. No appearance or match rating.'}</p>{player&&onProfile&&<button className="text-button" onClick={()=>onProfile(p.playerId)}>View player profile</button>}</div></td></tr></tbody>;
 }
 return <Modal title="Match box score" onClose={onClose} closeLabel="Close box score" className="box-score-modal"><div ref={content}>
 <div className="box-team-tabs" role="tablist" aria-label="Box score teams">{clubs.map((club,i)=><button key={club.id} ref={el=>{tabs.current[i]=el;}} type="button" role="tab" id={`${id}-tab-${club.id}`} aria-controls={`${id}-panel`} aria-selected={selected===club.id} tabIndex={selected===club.id?0:-1} aria-label={`${club.name} stats`} className={selected===club.id?'selected':''} onClick={()=>select(i)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?0:e.key==='End'?1:i===0?1:0,true);}}}><ClubMark club={club} large/><span><strong>{club.short}</strong><small>{i===0?'Home':'Away'}</small></span></button>)}</div>
 <div className="box-final-score"><strong>{clubs[0].short} {f.homeGoals} – {f.awayGoals} {clubs[1].short}</strong><span>Full time · {season}–{String(season+1).slice(-2)} · Week {f.week}</span></div>
 <section id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected}`}><h3 className="box-team-title">{club.name}</h3>{!box?<p className="notice">Individual stats unavailable. This older game retained its score but no player report. No statistics have been recreated.</p>:<>
 <details className="box-team-metrics"><summary aria-label="Team totals">Team totals <span>{total('shots')} shots · {possession}% possession</span></summary><div className="box-team-summary">{[['Possession',`${possession}%`],['Shots',total('shots')],['On target',total('onTarget')],['Chances created',total('chances')],['Saves',total('saves')],['Tackles',total('tackles')]].map(([label,value])=><span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div></details>
 <p className="box-instruction">Tap a player for all match stats. <Star size={12}/> Player of the Match.</p><table className="box-player-table"><caption className="sr-only">{club.name} player box score</caption><thead><tr><th scope="col">Player</th><th scope="col"><abbr title="Minutes played">Min</abbr></th><th scope="col"><abbr title="Goals">G</abbr></th><th scope="col"><abbr title="Assists">A</abbr></th><th scope="col"><abbr title="Match rating">Rtg</abbr></th></tr></thead>{[...rows.filter(p=>p.minutes>0),...rows.filter(p=>p.minutes===0)].map(row)}</table>
 <p className="box-coverage">Only this match’s participants and named substitutes are shown. Chances created count passes leading to a recorded shot. Goalkeeper saves and conceded goals use their time on the pitch.</p>
 </>}</section></div></Modal>;
}
