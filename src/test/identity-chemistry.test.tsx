import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newCareer} from '../simulation/career';
import {PlayerAvatar} from '../components/PlayerAvatar';
import {appearance,identity} from '../simulation/identity';
import {teamChemistry,pairKey} from '../simulation/chemistry';
const career=()=>newCareer('Test','unknown','hull',1234);
describe('persistent identity and chemistry',()=>{
 it('keeps faces identical across transfers and serialization, with varied portraits',()=>{const c=career(),p=c.players[0];const avatar=renderToStaticMarkup(<PlayerAvatar player={p}/>);expect(renderToStaticMarkup(<PlayerAvatar player={{...JSON.parse(JSON.stringify(p)),clubId:'city'}}/>)).toBe(avatar);expect(new Set(c.players.slice(0,30).map(p=>JSON.stringify(appearance(identity(p).appearanceSeed)))).size).toBeGreaterThan(20);});
 it('uses positional styles, actual shared games, stability and tactic familiarity, not nationality',()=>{const c=career(),before=teamChemistry(c,c.lineup,c.formation,c.tactic);const updated=structuredClone(c);for(const id of c.lineup){updated.world.chemistry.familiarity[`${id}:${c.tactic}`]=20;for(const other of c.lineup)if(id!==other)updated.world.chemistry.pairs[pairKey(id,other)]=18;}updated.world.chemistry.lastLineups[c.clubId]=c.lineup;expect(teamChemistry(updated,c.lineup,c.formation,c.tactic).score).toBeGreaterThan(before.score);updated.players=updated.players.map(p=>({...p,identity:{...identity(p),nationality:'Changed'}}));const after=teamChemistry(updated,c.lineup,c.formation,c.tactic);expect(after.links.every(l=>l.score>=0&&l.score<=100)).toBe(true);expect(after.score).toBe(teamChemistry({...updated,players:c.players},c.lineup,c.formation,c.tactic).score);});
});
