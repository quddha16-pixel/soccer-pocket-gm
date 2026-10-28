import type { Player } from '../models';
import { traitLabels } from '../simulation/playerSkills';
export function PlayerTraits({player,limit=2}:{player:Player;limit?:number}){
 if(!player.real)return null;
 const traits=[...player.real.traits].sort((a,b)=>b.level-a.level).slice(0,limit);
 return <span className="player-traits">{traits.length?traits.map(t=><span key={t.id} className={`trait-pill ${t.level===2?'specialist':''}`} title={t.level===2?'Signature specialist · stronger situational influence':'Situational influence'}>{traitLabels[t.id]??t.id}{t.level===2?' ★':''}</span>):<span className="no-traits">No established specialist traits</span>}</span>;
}
