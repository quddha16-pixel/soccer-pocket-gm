import type { Club } from '../models';
export function ClubMark({club,large=false}:{club:Club;large?:boolean}){return <span className={`club-mark ${large?'large':''}`} style={{'--club-color':club.color} as React.CSSProperties} aria-hidden="true">{club.short.slice(0,2)}</span>;}
