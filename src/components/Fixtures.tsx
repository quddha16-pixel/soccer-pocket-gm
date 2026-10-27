import { clubById } from '../data/clubs';
import type { Fixture } from '../models';
import { ClubMark } from './ClubMark';
export function FixtureList({fixtures,selected}:{fixtures:Fixture[];selected:string}){return <div className="fixture-list">{fixtures.length===0?<p className="muted">No fixtures to show.</p>:fixtures.map(f=><div key={f.id} className={`fixture ${[f.homeId,f.awayId].includes(selected)?'your-match':''}`}><span className="fixture-team home">{clubById(f.homeId).short}<ClubMark club={clubById(f.homeId)}/></span><strong className={f.homeGoals===undefined?'score pending':'score'}>{f.homeGoals===undefined?'vs':`${f.homeGoals} – ${f.awayGoals}`}</strong><span className="fixture-team"><ClubMark club={clubById(f.awayId)}/>{clubById(f.awayId).short}</span></div>)}</div>;}
