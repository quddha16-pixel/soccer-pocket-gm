// Project-supplied initial dates and 85% baseline. This is a conservative game model,
// not a certified implementation of every official SCR allowance or penalty.
export const financeRules={scrLimit:.85,additionalAllowance:0,excessPenaltyRate:.1,agentFeeRate:.02,maxContractYears:5};
export const transferWindows:Record<number,{summer:{open:string;close:string};winter:{open:string;close:string}}>={
 2026:{summer:{open:'2026-06-15',close:'2026-09-01'},winter:{open:'2027-01-01',close:'2027-02-01'}}
};
export function seasonRules(year:number){return {projected:!transferWindows[year],...(transferWindows[year]??{summer:{open:`${year}-06-15`,close:`${year}-09-01`},winter:{open:`${year+1}-01-01`,close:`${year+1}-02-01`}}),u21Cutoff:`${year-21}-01-01`,maxSenior:25,maxNonHomegrown:17};}
export function inWindow(date:string,year:number){const r=seasonRules(year);return [r.summer,r.winter].some(w=>date>=w.open&&date<=w.close);}
export function weekDate(year:number,week:number){const d=new Date(`${year}-08-01T12:00:00Z`);d.setUTCDate(d.getUTCDate()+week*7);return d.toISOString().slice(0,10);}
