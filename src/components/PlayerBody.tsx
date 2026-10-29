import { memo } from 'react';
import type { Player } from '../models';
import { bodyProportions, playerAppearance } from '../data/appearances';
import { clubTheme, contrast, homeShorts, kitInk } from '../data/clubThemes';
import { AvatarHead } from './AvatarHead';

export const goalkeeperKit=(kit:string)=>contrast(kit,'#FFD166')>=2?'#FFD166':'#845EF7';

/** Feet anchored at (0,0), suitable for both match renderers. Pose is deliberately low-frequency. */
export const PlayerBodyGlyph=memo(function PlayerBodyGlyph({player:p,kit,trim,number,pose=0}:{player:Player;kit:string;trim:string;number?:number;pose?:number}){
 const a=playerAppearance(p),body=bodyProportions(p),stride=pose===1?11:pose===2?-11:0;
 const shirt=p.position==='GK'?goalkeeperKit(kit):kit,ink=kitInk(shirt),shorts=p.position==='GK'?shirt:homeShorts(p.clubId);
 return <g className="player-body-glyph" data-player-id={p.id} data-appearance={a.status} transform={`scale(${body.scale})`}>
  <ellipse cy=".14" rx="1.35" ry=".36" fill="#061b25" opacity=".32"/>
  <g transform={`scale(.033) translate(-50 -190)`}>
   <g transform={`translate(50 0) scale(${body.width} 1) translate(-50 0)`}>
    <g strokeLinecap="round" strokeLinejoin="round">
     <g transform={`rotate(${-stride} 35 126)`}><path d="M36 127 34 157 32 182" stroke={a.skin} strokeWidth="11" fill="none"/><path d="m33 166-1 17" stroke={shirt} strokeWidth="11"/><path d="m31 185-8 3 17 1" stroke="#17212d" strokeWidth="8"/></g>
     <g transform={`rotate(${stride} 65 126)`}><path d="m64 127 2 30 2 25" stroke={a.skin} strokeWidth="11" fill="none"/><path d="m67 166 1 17" stroke={shirt} strokeWidth="11"/><path d="m69 185 8 3H60" stroke="#17212d" strokeWidth="8"/></g>
     <path d={`M29 71 20 ${96+stride/3} 17 ${119+stride/3}M71 71 80 ${96-stride/3} 83 ${119-stride/3}`} stroke={a.skin} strokeWidth="10" fill="none"/>
     {p.position==='GK'&&<path d="M16 117v7m68-7v7" stroke="#e4eef3" strokeWidth="12"/>}
    </g>
    <path d="M29 62 17 85 29 92l3-12-1 34h38l-1-34 3 12 12-7-12-23-14-5H43Z" fill={shirt} stroke="#101c2d" strokeOpacity=".25" strokeWidth="1.5"/>
    <path d="M31 112h38l3 24H53l-3-13-3 13H28Z" fill={shorts}/>
    <path d="M38 59 50 67l12-8" fill="none" stroke={trim} strokeWidth="4"/>
    <path d="m19 83 9 4m44 0 9-4" stroke={trim} strokeWidth="3"/>
    {number!==undefined&&<text x="50" y="101" fill={ink} textAnchor="middle" fontSize="20" fontWeight="900">{number}</text>}
   </g>
   <g transform="translate(22 8) scale(.7)"><AvatarHead player={p}/></g>
  </g>
 </g>;
});

export function PlayerBody({player:p}:{player:Player}){
 const theme=clubTheme(p.clubId??''),a=playerAppearance(p);
 return <svg className="player-full-body" viewBox="-4 -7.7 8 8.5" role="img" aria-label={`Full-body ${a.status==='unverified'?'appearance placeholder':'illustration'} of ${p.name}`}><ellipse cy=".2" rx="2.4" ry=".45" fill="#172c3a"/><PlayerBodyGlyph player={p} kit={theme.primary} trim={theme.secondary}/></svg>;
}
