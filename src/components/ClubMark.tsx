import { clubTheme } from '../data/clubThemes';
import type { Club } from '../models';
// Original vector insignias, inspired by local identity; these are not official club marks.
const motifs:Record<string,string>={arsenal:'cannon',villa:'lion',bournemouth:'ball',brentford:'bee',brighton:'bird',coventry:'tower',chelsea:'lion',palace:'bird',everton:'tower',fulham:'cross',leeds:'flower',liverpool:'bird',city:'ship',united:'trident',newcastle:'tower',forest:'tree',sunderland:'bridge',tottenham:'bird',hull:'tiger',ipswich:'horse'};
function Motif({type}:{type:string}){switch(type){
 case 'cannon':return <><circle cx="30" cy="54" r="7"/><path d="M22 43h34v6H22zM41 40l15-5 2 6-17 5"/><path d="m20 57 35 4"/></>;
 case 'bird':return <><path d="M18 40q12-4 20 6 7-16 22-10-7 2-13 10l-8 12-3-10q-11-5-18-8Z"/><path d="m38 58-3 6h12M48 39l6 2"/></>;
 case 'tower':return <><path d="M27 59V37h6v5h5v-5h5v5h5v-5h6v22ZM23 63h35M36 59V49h8v10"/></>;
 case 'lion':return <><path d="m30 60 6-13-6-8 8-9 7 4 2 9-6 6 8 8 8-2M32 60h9m6-1 2 6h9M31 47q-13 1-10-12M43 36h9l-5 6"/></>;
 case 'bee':return <><ellipse cx="40" cy="48" rx="9" ry="14"/><path d="M32 43h16m-17 6h18m-16 6h14M36 34l-5-6m13 6 5-6"/><path d="M31 46q-21-18-13-20 15-2 15 16M49 46q21-18 13-20-15-2-15 16"/></>;
 case 'tree':return <><path d="m40 28-15 14h7L21 53h13v10h12V53h13L48 42h7ZM22 67q9-6 18 0t18 0"/></>;
 case 'ship':return <><path d="M19 54h44l-9 10H28ZM40 27v27M37 30 24 49h13ZM44 33l14 16H44Z"/><path d="M21 68q9-5 19 0t20 0"/></>;
 case 'trident':return <><path d="M40 64V30m-12 4v12q12 10 24 0V34m-16 0 4-6 4 6m-20 4 4-7 4 7m16 0 4-7 4 7M33 64h14"/></>;
 case 'cross':return <path d="M35 29h10v13h13v10H45v13H35V52H22V42h13Z"/>;
 case 'flower':return <><circle cx="40" cy="47" r="7"/>{[0,72,144,216,288].map(a=><ellipse key={a} cx="40" cy="33" rx="7" ry="11" transform={`rotate(${a} 40 47)`}/>)}</>;
 case 'tiger':return <><path d="m25 34 7 2 8-3 8 3 7-2 1 17-7 12H31l-7-12ZM27 42l8 4m18-4-8 4M30 53l8 3m12-3-8 3m-5 3 3 4 3-4"/></>;
 case 'horse':return <><path d="m29 63 4-15-8-5 9-14 4 5 10-2 6 10-8 4-2 17ZM34 38h1M48 46l9 13"/></>;
 case 'bridge':return <><path d="M19 57h42M24 57V35m32 22V35M24 39q16 24 32 0M32 49v8m8-5v5m8-8v8M20 64h40"/></>;
 default:return <><circle cx="40" cy="47" r="17"/><path d="m40 36 10 8-4 12H34l-4-12ZM24 42l6 2m20 0 6-2M34 56l-4 7m16-7 4 7M40 30v6"/></>;
}}
export function ClubMark({club,large=false}:{club:Club;large?:boolean}){
 const palette=clubTheme(club.id);
 const index=Object.keys(motifs).indexOf(club.id),round=index%3===0,diamond=index%3===1;
 return <span className={`club-mark crest ${large?'large':''}`} style={{'--club-color':club.color} as React.CSSProperties} aria-hidden="true"><svg viewBox="0 0 80 92" focusable="false">{round?<circle cx="40" cy="45" r="36" fill={palette.primary} stroke={palette.secondary} strokeWidth="3"/>:<path d={diamond?'M40 4 74 17v35L62 72 40 87 18 72 6 52V17Z':'M8 8h64v44q-4 21-32 35Q12 73 8 52Z'} fill={palette.primary} stroke={palette.secondary} strokeWidth="3"/>}<path d="M19 22h42" stroke={palette.secondary} strokeOpacity=".5"/><g stroke={palette.secondary} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"><Motif type={motifs[club.id]}/></g><text x="40" y="77" fill={palette.secondary} fontSize="7" fontWeight="800" textAnchor="middle" letterSpacing="1">{club.short}</text></svg></span>;
}
