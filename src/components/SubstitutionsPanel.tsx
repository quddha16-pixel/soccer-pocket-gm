import { useId, useState } from 'react';
import type { Career, Substitution } from '../models';
import { Modal } from './Modal';
import { PlayerAvatar } from './PlayerAvatar';
import { eligiblePlayers } from '../simulation/economy';
import { lineupFit } from '../simulation/management';
import { activeLineup, defaultBench, fixtureLineup, nextMatchPlan } from '../simulation/substitutionRules';
import { cancelFutureSubstitutions, cancelPlannedSubstitution, makeLiveSubstitution, setMatchPlan } from '../simulation/substitutions';

export function SubstitutionsPanel({career:c,onUpdate,dialogOpen,onDialogOpenChange}:{career:Career;onUpdate:(c:Career)=>void;dialogOpen?:boolean;onDialogOpenChange?:(open:boolean)=>void}){
 const [internalOpen,setInternalOpen]=useState(false),[minute,setMinute]=useState(60),[off,setOff]=useState(''),[on,setOn]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const open=dialogOpen??internalOpen,formId=useId(),setOpen=(value:boolean)=>{setInternalOpen(value);onDialogOpenChange?.(value);};
 const live=!!c.pending,f=c.pending?.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId),plan=nextMatchPlan(c);
 const bench=live?((f!.homeId===c.clubId?f!.report?.homeBench:f!.report?.awayBench)??defaultBench(c,c.clubId,fixtureLineup(f!,c.clubId,0))):plan.bench;
 const changes=live?(f!.report?.substitutions??[]):plan.changes,own=changes.filter(s=>s.clubId===c.clubId),now=c.pending?.minute??0;
 const used=new Set(own.map(s=>s.onId));
 const starting=live?fixtureLineup(f!,c.clubId,now):activeLineup(c.lineup,plan.changes,minute);
 const outgoing=starting.map(id=>c.players.find(p=>p.id===id)!),offId=outgoing.some(p=>p.id===off)?off:outgoing.find(p=>p.position!=='GK')?.id??'';
 const out=c.players.find(p=>p.id===offId),incoming=bench.filter(id=>!used.has(id)).map(id=>c.players.find(p=>p.id===id)!).filter(p=>(p.position==='GK')===(out?.position==='GK')).sort((a,b)=>lineupFit(b,c.formation,starting.indexOf(offId))-lineupFit(a,c.formation,starting.indexOf(offId))||b.overall-a.overall);
 const onId=incoming.some(p=>p.id===on)?on:incoming[0]?.id??'';
 const name=(id:string)=>c.players.find(p=>p.id===id)?.name??id;
 function apply(fn:()=>Career,message=''){try{onUpdate(fn());setError('');setSuccess(message);}catch(e){setSuccess('');setError((e as Error).message);}}
 function show(){setError('');setSuccess('');setOpen(true);if(c.pending)onUpdate({...c,pending:{...c.pending,paused:true}});}
 function remove(s:Substitution){if(live)apply(()=>cancelPlannedSubstitution(c,changes.indexOf(s)));else apply(()=>setMatchPlan(c,{bench,changes:own.filter(x=>x!==s)}));}
 return <section className="subs-panel">
  <div className="section-heading"><h3>{live?'Substitutions':'Set your subs'}</h3><span className="tag">{live?`${own.filter(s=>s.minute<=now).length} / 5 used`:`${bench.length} / 9 bench`}</span></div>
  <button className="secondary full" disabled={live&&now>=90} onClick={show}>{live?'Make a substitution':'Set your subs'}</button>
  <p className="small muted">{live?'Pause the action and make a change. Changes affect the remaining match.':'Choose bench players and times before Quick Sim. Watch Match also supports live changes.'} Five changes · three windows · half-time is an extra window.</p>
  {!!own.length&&<ol className="sub-instructions">{[...own].sort((a,b)=>a.minute-b.minute).map((s,i)=><li key={`${s.onId}-${i}`}><time>{s.minute}′</time><span><strong>{name(s.onId)} on</strong><small>{name(s.offId)} off · {live&&s.minute<=now?'Completed':'Scheduled'}</small></span>{(!live||s.minute>now)&&<button className="text-button" aria-label={`Cancel ${name(s.onId)} substitution`} onClick={()=>remove(s)}>Cancel</button>}</li>)}</ol>}
  {error&&!open&&<p className="error" role="alert">{error}</p>}
  {open&&<Modal title={live?(now===0?'Change kickoff lineup':`Make a substitution · ${now}′`):'Set your subs'} onClose={()=>setOpen(false)} closeLabel="Close substitutions" className="substitutions-modal" footer={<div className="sub-footer"><button className="primary full" form={formId} type="submit" disabled={!offId||!onId||(own.length>=5&&(!live||now>0))}>{live?(now===0?'Confirm lineup change':'Confirm substitution'):'Schedule substitution'}</button><button className="secondary full" onClick={()=>setOpen(false)}>Done</button></div>}>
   {error&&<p className="error" role="alert">{error}</p>}
   {success&&<p className="success-message" role="status">{success}</p>}
   {live?<p className="notice">Match paused. {now===0?'Change your starting XI before the first minute; this does not use a substitution.':`Your change takes effect after minute ${now}.`} Tap Done to return, then Resume when ready.</p>:<details className="disclosure"><summary>Choose bench · {bench.length} / 9 selected</summary><div className="bench-selector">{eligiblePlayers(c,c.clubId).filter(p=>!c.lineup.includes(p.id)).sort((a,b)=>b.overall-a.overall).map(p=><label className="check-label" key={p.id}><input type="checkbox" checked={bench.includes(p.id)} disabled={!bench.includes(p.id)&&bench.length>=9} onChange={()=>apply(()=>setMatchPlan(c,{bench:bench.includes(p.id)?bench.filter(id=>id!==p.id):[...bench,p.id],changes:own}))}/><PlayerAvatar player={p}/><span>{p.name}<small>{p.position} · {p.overall} OVR · {p.fitness}% fitness</small></span></label>)}</div></details>}

   {live&&own.some(s=>s.minute>now)&&<div className="notice"><p>Some bench players are reserved for scheduled changes. Clear future plans to make all remaining changes manually.</p><button className="secondary full" onClick={()=>apply(()=>cancelFutureSubstitutions(c),'Future plans cleared. All unused bench players are available for manual changes.')}>Clear future substitution plans</button></div>}
   <form id={formId} onSubmit={e=>{e.preventDefault();apply(()=>live?makeLiveSubstitution(c,offId,onId):setMatchPlan(c,{bench,changes:[...own,{clubId:c.clubId,offId,onId,minute}]}),`${name(onId)} on for ${name(offId)} · ${live?now:minute}′${live?(now===0?' · Starting XI updated':' · Confirmed'):' · Scheduled'}`);}}>
    {!live&&<label>Substitution minute<input aria-label="Substitution minute" type="number" min="1" max="89" value={minute} onChange={e=>setMinute(+e.target.value)}/><span className="small muted">45 = half-time. Group changes at the same minute to use one window.</span></label>}
    <label>Player off<select aria-label="Player off" value={offId} onChange={e=>setOff(e.target.value)}>{outgoing.map(p=><option key={p.id} value={p.id}>{p.name} · {p.real?.primaryPosition??p.position} · {p.overall}</option>)}</select></label>
    <label>Player on<select aria-label="Player on" value={onId} onChange={e=>setOn(e.target.value)}>{incoming.map(p=><option key={p.id} value={p.id}>{p.name} · {p.real?.primaryPosition??p.position} · {p.overall}</option>)}</select></label>
    {onId&&<p className={lineupFit(c.players.find(p=>p.id===onId)!,c.formation,starting.indexOf(offId))<.85?'warning':'small muted'}>Incoming player: {Math.round(lineupFit(c.players.find(p=>p.id===onId)!,c.formation,starting.indexOf(offId))*100)}% role effectiveness.</p>}<p className="small muted">Players keep the outgoing player’s position. Unfamiliar roles substantially reduce chance creation, defending and finishing.</p>
   </form>
   <details className="disclosure"><summary>Browse bench · {bench.filter(id=>!used.has(id)).length} available</summary>   <div className="sub-bench">{bench.map(id=>{const p=c.players.find(p=>p.id===id)!;return <button type="button" key={id} disabled={used.has(id)||(p.position==='GK')!==(out?.position==='GK')} aria-pressed={onId===id} className={used.has(id)?'muted':''} onClick={()=>setOn(id)}><PlayerAvatar player={p}/><span>{p.name}<small>{p.real?.primaryPosition??p.position} · {p.overall}{used.has(id)?' · Used / scheduled':''}</small></span></button>;})}</div></details>
   <div className="sub-instructions">{own.map(s=><div key={s.onId}><strong>{s.minute}′ · {name(s.onId)} on</strong><small>{name(s.offId)} off</small>{(!live||s.minute>now)&&<button className="text-button" onClick={()=>remove(s)}>Cancel planned change</button>}</div>)}</div>

  </Modal>}
 </section>;
}
