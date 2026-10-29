import type { Player } from '../models';
import { clubTheme } from '../data/clubThemes';
import { playerAppearance } from '../data/appearances';
import { AvatarHead } from './AvatarHead';
export function PlayerAvatar({player:p,large=false}:{player:Player;large?:boolean}){
 const kit=clubTheme(p.clubId??''),a=playerAppearance(p);
 return <svg className={`player-avatar ${large?'portrait-large':''}`} viewBox="0 0 80 88" role="img" aria-label={`Portrait of ${p.name}`} data-appearance={a.status}><rect width="80" height="88" rx="16" fill="#243447"/><path d="M4 88q3-21 26-23h20q23 2 26 23" fill={kit.primary}/><AvatarHead player={p}/><path d="m28 70 12 8 12-8" stroke={kit.secondary} strokeWidth="3" fill="none"/></svg>;
}
