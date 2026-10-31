// Traditional home colors, checked against the linked kit references on 2026-10-28.
// Hex values are the game's sRGB rendering choices, not licensed brand specifications.
export const colorSources=['https://www.rsssf.org/colours/england.html','https://www.football-stadiums.co.uk/articles/football-club-kit-colours/','https://www.apparelnbags.com/teamcolors/efl.htm'];
const palettes:Record<string,[string,string]>={
 arsenal:['#EF0107','#FFFFFF'],villa:['#670E36','#95BFE5'],bournemouth:['#DA291C','#171717'],brentford:['#E30613','#FFFFFF'],brighton:['#0057B8','#FFFFFF'],coventry:['#6CABDD','#FFFFFF'],chelsea:['#034694','#FFFFFF'],palace:['#1B458F','#C41230'],everton:['#003399','#FFFFFF'],fulham:['#FFFFFF','#171717'],leeds:['#FFFFFF','#1D428A'],liverpool:['#DC0714','#FFFFFF'],city:['#6CABDD','#FFFFFF'],united:['#DA291C','#FFE500'],newcastle:['#241F20','#FFFFFF'],forest:['#DD0000','#FFFFFF'],sunderland:['#EB172B','#FFFFFF'],tottenham:['#FFFFFF','#132257'],hull:['#F5A623','#171717'],ipswich:['#3A64A3','#FFFFFF'],
 birmingham:['#0000FF','#FFFFFF'],blackburn:['#009EE0','#FFFFFF'],bolton:['#FFFFFF','#263C82'],bristol:['#E21A23','#FFFFFF'],burnley:['#6C1D45','#99D6EA'],cardiff:['#0070B5','#FFFFFF'],charlton:['#D4021D','#FFFFFF'],derby:['#FFFFFF','#171717'],lincoln:['#ED1C24','#FFFFFF'],middlesbrough:['#E11B22','#FFFFFF'],millwall:['#001F5B','#FFFFFF'],norwich:['#FFF200','#00A650'],portsmouth:['#001489','#FFFFFF'],preston:['#FFFFFF','#00205B'],qpr:['#003DA5','#FFFFFF'],sheffield:['#EE2737','#FFFFFF'],southampton:['#D71920','#FFFFFF'],stoke:['#E03A3E','#FFFFFF'],swansea:['#FFFFFF','#171717'],watford:['#FBEE23','#171717'],westbrom:['#122F67','#FFFFFF'],westham:['#7A263A','#1BB1E7'],wolves:['#FDB913','#171717'],wrexham:['#E03A3E','#FFFFFF']
};
const customPalettes=new Map<string,[string,string]>();
export function registerClubPalette(id:string,primary:string,secondary:string){if(!/^draft-[0-9]+-[0-9]+$/.test(id)||![primary,secondary].every(c=>/^#[0-9A-F]{6}$/.test(c)))throw Error('Invalid drafted club palette.');customPalettes.set(id,[primary,secondary]);}
export const clubTheme=(id:string)=>({primary:(palettes[id]??customPalettes.get(id))?.[0]??'#BDF47A',secondary:(palettes[id]??customPalettes.get(id))?.[1]??'#172510'});
// Traditional home-strip shorts, separate from accent colors (e.g. United's yellow is not its shorts).
const shortColors:Record<string,string>={liverpool:'#DC0714',chelsea:'#034694',tottenham:'#132257',united:'#FFFFFF',brentford:'#171717',leeds:'#FFFFFF',newcastle:'#171717',hull:'#171717',bournemouth:'#171717',fulham:'#171717',palace:'#1B458F',coventry:'#6CABDD',sunderland:'#171717',birmingham:'#0000FF',bolton:'#263C82',cardiff:'#0070B5',derby:'#171717',lincoln:'#171717',middlesbrough:'#E11B22',millwall:'#001F5B',norwich:'#00A650',preston:'#00205B',sheffield:'#171717',southampton:'#171717',swansea:'#FFFFFF',watford:'#171717',wolves:'#171717'};
export const homeShorts=(id:string)=>shortColors[id]??customPalettes.get(id)?.[1]??'#FFFFFF';
function luminance(hex:string){const a=hex.slice(1).match(/../g)!.map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function themeAccent(id:string){const color=clubTheme(id).primary,channels=color.slice(1).match(/../g)!.map(s=>parseInt(s,16));
 for(let t=0;t<=1;t+=.05){const value='#'+channels.map(v=>Math.round(v+(255-v)*t).toString(16).padStart(2,'0')).join('');if(contrast(value,'#0d1722')>=5&&contrast(value,'#172510')>=4.5)return value;}
 return '#FFFFFF';
}

export const kitInk=(color:string)=>contrast(color,'#FFFFFF')>=4.5?'#FFFFFF':'#000000';
