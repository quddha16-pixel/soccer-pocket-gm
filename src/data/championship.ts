import type { Club } from '../models';

// 2026/27 Championship clubs, checked 28 October 2026. Strengths and budgets are
// game estimates, not official financial or EA team ratings. Original colors;
// no licensed club badges are bundled.
export const championshipReference={season:'2026/27',checked:'2026-10-28',sources:['https://www.efl.com/competitions/efl-championship/','https://www.paramountplus.com/sneak-peak/how-to-watch-efl-championship/']};
const rows:[string,string,string,string,number,number][]=[
 ['birmingham','Birmingham City','BIR','#4e80d5',69,16],
 ['blackburn','Blackburn Rovers','BLB','#95b9ed',68,13],
 ['bolton','Bolton Wanderers','BOL','#dce4ed',65,10],
 ['bristol','Bristol City','BRC','#d96068',69,15],
 ['burnley','Burnley','BUR','#a15a76',73,25],
 ['cardiff','Cardiff City','CAR','#5792d9',66,11],
 ['charlton','Charlton Athletic','CHA','#e26b71',65,10],
 ['derby','Derby County','DER','#d6dee8',67,13],
 ['lincoln','Lincoln City','LIN','#e1727c',64,9],
 ['middlesbrough','Middlesbrough','MID','#d9636a',72,21],
 ['millwall','Millwall','MIL','#7193cb',69,13],
 ['norwich','Norwich City','NOR','#d9da67',71,19],
 ['portsmouth','Portsmouth','POR','#5c8fd9',66,11],
 ['preston','Preston North End','PNE','#d4e0ec',67,11],
 ['qpr','Queens Park Rangers','QPR','#8cb4e8',67,12],
 ['sheffield','Sheffield United','SHU','#e16870',73,22],
 ['southampton','Southampton','SOU','#e47279',73,24],
 ['stoke','Stoke City','STK','#da7880',68,14],
 ['swansea','Swansea City','SWA','#d5e0e8',68,13],
 ['watford','Watford','WAT','#e2cb62',70,17],
 ['westbrom','West Bromwich Albion','WBA','#98aed5',71,18],
 ['westham','West Ham United','WHU','#ad718a',76,35],
 ['wolves','Wolverhampton Wanderers','WOL','#edbc5f',74,28],
 ['wrexham','Wrexham','WRE','#e27d80',68,17]
];
export const championshipClubs:Club[]=rows.map(([id,name,short,color,strength,budget])=>({id,name,short,color,strength,budget,expectation:'Establish a place in the Premier League'}));
