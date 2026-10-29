import type { Player } from '../models';
import { playerAppearance } from '../data/appearances';

/** Original vectors; reference photographs are never shipped. */
export function AvatarHead({player:p}:{player:Player}){
 const a=playerAppearance(p),long=['long','locks','twists','braids'].includes(a.style),dark=a.hair;
 return <g data-appearance={a.status}>
  {a.status!=='unverified'&&long&&<path d={a.style==='long'?'M19 27Q18 4 40 6T61 27l4 37-16 7H25L15 63Z':'M22 25Q20 4 40 7T58 25l5 37-10 7H27l-11-8Z'} fill={dark}/>}
  <path d="M32 57v16q8 6 16 0V57" fill={a.skin}/><ellipse cx="22" cy="40" rx="4.5" ry="7" fill={a.skin}/><ellipse cx="58" cy="40" rx="4.5" ry="7" fill={a.skin}/>
  <path d="M22 25q18-15 36 0v23q-1 17-18 20-17-3-18-20Z" fill={a.skin}/>
  {a.status==='unverified'?<path d="M31 40q9-6 18 0m-16 15h14" fill="none" stroke="#6f8591" strokeWidth="2" strokeLinecap="round"/>:<>
   {a.style==='swept'&&<path d="M21 35V23Q17 7 37 8q16-9 22 6l1 20-8-13-26 7Z" fill={dark}/>}
   {a.style==='crop'&&<path d="M21 34V23Q22 7 40 10t19 14v10l-6-13H27Z" fill={dark}/>}
   {a.style==='buzz'&&<path d="M22 29q0-18 18-18t18 18l-4-9H26Z" fill={dark}/>}
   {['curls','twists'].includes(a.style)&&<><path d="M21 35q-8-16 2-19-2-12 11-9 8-10 16-1 16-3 13 11 7 7-5 20l-5-13-27 1Z" fill={dark}/>{a.style==='twists'&&[20,26,33,40,48,55,61].map((x,i)=><path key={x} d={`M${x} 13q${i%2?9:-8} 10 ${i%2?-4:3} 24`} stroke={dark} strokeWidth="5" fill="none" strokeLinecap="round"/>)}</>}
   {['waves','fringe'].includes(a.style)&&<path d={a.style==='fringe'?'M21 36Q13 7 39 8t21 26l-13-6-9 4-10-3Z':'M21 34q-7-18 5-20 5-13 16-6 17-6 18 9l-3 18-7-12-10 6-12-4Z'} fill={dark}/>}
   {a.style==='long'&&<path d="M21 38Q12 6 40 7q26-2 20 31l-8-18-10-4-15 13Z" fill={dark}/>}
   {['locks','braids'].includes(a.style)&&<><path d="M21 35q-3-26 19-26t19 26l-7-14H27Z" fill={dark}/>{[25,32,39,46,53].map(x=><path key={x} d={`M${x} 12q-5 10-3 19`} fill="none" stroke="#ffffff" opacity=".15" strokeWidth="1.2"/>)}</>}
   {a.style==='tied'&&<><circle cx="57" cy="21" r="7" fill={dark}/><path d="M21 35q-3-28 19-26t19 26l-7-16-12-5-14 9Z" fill={dark}/></>}
   {a.style==='headband'&&<><path d="M21 34Q16 8 40 8t20 26l-9-13H27Z" fill={dark}/><path d="M20 25q20-7 40 0v8q-20-6-40 0Z" fill="#272b32"/></>}
   <path d="M28 35h8m8 0h8" stroke={dark} strokeWidth="2" strokeLinecap="round"/><circle cx="32" cy="41" r="2" fill="#202731"/><circle cx="48" cy="41" r="2" fill="#202731"/>
   <path d="m40 43-2 7h4" stroke="#563d32" opacity=".5" fill="none" strokeWidth="1.5"/>
   {['stubble','beard'].includes(a.facialHair)&&<path d="M23 47q4 20 17 21 14-2 17-21l-7 9H30Z" fill={dark} opacity={a.facialHair==='stubble'?.25:.85}/>}
   {a.facialHair==='goatee'&&<><path d="m34 60 6 7 6-7Z" fill={dark}/><path d="M33 54h14" stroke={dark} strokeWidth="2"/></>}
   <path d="M34 57q6 3 12 0" stroke={a.facialHair==='beard'?a.skin:'#593e35'} strokeWidth="1.5" opacity=".8" fill="none" strokeLinecap="round"/>
  </>}
 </g>;
}
