// Browser QA uses controlled ratings in disposable, genuinely simulated careers.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5175/soccer-pocket-gm/';
const dir=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-reuse-form-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  let fixture;
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   if(!fixture)fixture=await page.evaluate(async()=>{
    const{newCareer,advance}=await import('./src/simulation/career.ts'),{nextMatchPlan}=await import('./src/simulation/substitutionRules.ts'),{setMatchPlan}=await import('./src/simulation/substitutions.ts'),{recentSubstitutionPlans,reuseSubstitutionPlan}=await import('./src/simulation/recentSubs.ts'),{lineupFit}=await import('./src/simulation/management.ts'),{selectMotm}=await import('./src/simulation/match.ts');
    let c=newCareer('Form QA','elite','liverpool',37);const lineup=[...c.lineup],starId=c.starId,on=c.players.find(p=>p.clubId===c.clubId&&!lineup.includes(p.id)&&p.position==='CM'&&lineupFit(p,c.formation,6)>=.85),off=lineup[6],bench=[...new Set([on.id,...nextMatchPlan(c).bench])].slice(0,9);
    c=setMatchPlan(c,{bench,changes:[{clubId:c.clubId,offId:off,onId:on.id,minute:60}]});
    for(let i=0;i<6;i++){c={...c,lineup,starId,players:c.players.map(p=>({...p,identity:{...p.identity,injuryWeeks:0}}))};if(i)c=reuseSubstitutionPlan(c,recentSubstitutionPlans(c)[0].id);c=advance(c);}
    c={...c,lineup,starId,players:c.players.map(p=>({...p,fitness:95,identity:{...p.identity,injuryWeeks:0}}))};
    const ratings=new Map([[on.id,9],[lineup[9],8.5],[lineup[8],8.1],[off,5],[lineup[1],5.4],[lineup[2],5.8]]);
    c.fixtures=c.fixtures.map(f=>!f.report?f:{...f,report:{...f.report,performances:f.report.performances.map(p=>p.clubId===c.clubId?{...p,rating:ratings.get(p.playerId)??6.8}:p)}});
    for(const f of c.fixtures)if(f.report)f.report.motmId=selectMotm(f.report.performances);
    return {career:c,off,on:on.id,onName:on.name};
   });
   await page.evaluate(async c=>{localStorage.clear();sessionStorage.clear();const{saveCareer}=await import('./src/storage.ts');saveCareer(c);},fixture.career);await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
   const overflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${label} overflow`);
   assert.equal(await page.locator('.form-column.best .form-player').count(),3);assert.equal(await page.locator('.form-column.lowest .form-player').count(),3);assert(await page.getByText(/Consider a start at/).count()>0);assert(await page.getByText(new RegExp(`Consider ${fixture.onName}`)).count()>0);await overflow('form report');await page.locator('.player-form-panel').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-form.png`,fullPage:true});
   await page.getByRole('button',{name:`View ${fixture.onName} profile`,exact:true}).click();assert(await page.getByRole('button',{name:'Close profile',exact:true}).isVisible());await page.getByRole('button',{name:'Close profile',exact:true}).click();
   await page.getByRole('button',{name:'Review starting XI',exact:true}).click();assert(await page.getByRole('heading',{name:'Squad',exact:true}).isVisible());
   const nav=name=>page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name,exact:true});await nav('Home').click();await page.getByRole('button',{name:'Play Next Match',exact:true}).click();
   await page.getByRole('button',{name:'Reuse most recent subs',exact:true}).click();assert(await page.getByRole('status').isVisible());await overflow('reuse action');
   const applied=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');return loadCareer().career.matchPlan;});assert.equal(applied.changes[0].onId,fixture.on);assert.equal(applied.changes[0].minute,60);
   await page.getByRole('button',{name:'Set your subs',exact:true}).click();await page.getByRole('button',{name:'Save this plan for reuse',exact:true}).click();assert(await page.getByRole('status').isVisible());await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByText(/Recent substitution plans ·/).click();await overflow('recent plans');await page.screenshot({path:`${dir}/${width}-recent-plans.png`,fullPage:true});
   await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();await page.getByRole('button',{name:'Play Next Match',exact:true}).click();
   const before=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {plan:c.matchPlan,recent:c.recentSubPlans.length};});assert(before.recent>0);assert.equal(before.plan.changes[0].onId,fixture.on);
   await page.getByRole('button',{name:'Quick Sim',exact:true}).click();const minutes=await page.evaluate(async onId=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career,f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId);return f.report.performances.find(p=>p.playerId===onId).minutes;},fixture.on);assert.equal(minutes,30);
   await page.getByRole('button',{name:'Finish matchweek & view results',exact:true}).click();await page.getByRole('button',{name:'Continue to club',exact:true}).click();assert.equal(await page.locator('.form-column.best .form-player').count(),3);assert.equal(await page.locator('.form-column.lowest .form-player').count(),3);assert.deepEqual(errors,[]);
   console.log(`PASS ${width}x${height}: best/lowest three, useful advice, profiles, lineup navigation, one-tap reuse, saved plans, refresh and actual simulated substitute minutes`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
