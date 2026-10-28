import type {Career} from '../models';
import {releasePlayer} from '../simulation/economy';
/** Free a senior registration slot through the real contract-termination API. */
export function releaseReserve(c:Career):Career {
 const reserve=c.players.filter(p=>p.clubId===c.clubId&&!c.lineup.includes(p.id)&&p.identity!.birthDate<'2005-01-01'&&p.position!=='GK'&&c.players.filter(x=>x.clubId===c.clubId&&x.position===p.position).length>=4).sort((a,b)=>a.overall-b.overall)[0];
 if(!reserve)throw Error('Fixture requires a releasable senior reserve');
 return releasePlayer(c,reserve.id);
}
