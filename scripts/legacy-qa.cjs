// Disposable QA seasons exercise deterministic titles/relegation, never a user's save.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5175/soccer-pocket-gm/';
const dir=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-legacy-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   const seed=async win=>page.evaluate(async win=>{
    const {newCareer}=await import('./src/simulation/career.ts'),{archiveSeasonReview}=await import('./src/simulation/records.ts'),{settleLegacySeason}=await import('./src/simulation/legacy.ts'),{saveCareer}=await import('./src/storage.ts');
    let c=newCareer('Legacy Mobile QA',win?'elite':'unknown','hull',72,'developer');
    c={...c,week:38,status:win?'survived':'fired',fixtures:c.fixtures.map(f=>{const own=f.homeId===c.clubId||f.awayId===c.clubId;return {...f,homeGoals:own?Number((f.homeId===c.clubId)===win):0,awayGoals:own?Number((f.awayId===c.clubId)===win):0};})};
    c=settleLegacySeason(archiveSeasonReview(c));localStorage.clear();sessionStorage.clear();saveCareer(c);return c.legacy.entries.reduce((n,e)=>n+e.points,0);
   },win);
   const overflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${label} overflow`);
   const points=await seed(true);await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();assert(await page.getByText('Manager of the Season',{exact:true}).isVisible());
   await page.locator('.legacy-summary').click();assert(await page.getByRole('heading',{name:new RegExp(`${points.toLocaleString()} legacy points`)}).isVisible());await overflow('legacy overview');await page.screenshot({path:`${dir}/${width}-legacy.png`,fullPage:true});
   await page.getByRole('button',{name:'Achievements',exact:true}).click();assert.equal(await page.locator('.achievement-card.unlocked').count()>0,true);assert.equal(await page.locator('.legacy-club-grid>div').count(),44);await overflow('achievement grid');await page.screenshot({path:`${dir}/${width}-achievements.png`,fullPage:true});
   await page.getByRole('button',{name:'Jobs & contracts',exact:true}).click();assert.equal(await page.locator('.offer-card').count(),20);assert.equal(await page.locator('.offer-locked').count(),0);await overflow('job graph');
   const card=page.locator('.offer-card').filter({hasText:'Poaching approach'}).first();await card.getByRole('button',{name:'Review contract',exact:true}).click();await page.getByRole('button',{name:'Keep reviewing offers',exact:true}).click();
   assert.equal(await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');return loadCareer().career.world.season;}),2026);
   await card.getByRole('button',{name:'Review contract',exact:true}).click();await overflow('contract confirmation');await page.screenshot({path:`${dir}/${width}-contract.png`,fullPage:true});await page.getByRole('button',{name:'Accept contract & begin next season',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('[aria-modal="true"]'));await page.waitForTimeout(150);
   const moved=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {clubId:c.clubId,season:c.world.season,week:c.week,style:c.managerStyle,tenures:c.legacy.tenures.length,points:c.legacy.entries.reduce((n,e)=>n+e.points,0),controlled:c.world.staff.filter(s=>s.controlled).map(s=>s.clubId)};});
   assert.equal(moved.season,2027);assert.equal(moved.week,0);assert.notEqual(moved.clubId,'hull');assert.equal(moved.tenures,2);assert.equal(moved.points,points+50);assert.equal(moved.style,'developer');assert.deepEqual(moved.controlled,[moved.clubId]);await overflow('new employer');
   await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();assert(await page.getByRole('button',{name:'Play Next Match',exact:true}).isVisible());
   const negative=await seed(false);await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();assert(await page.getByRole('heading',{name:'Relegated · You have been dismissed',exact:true}).isVisible());assert(negative<0);
   await page.getByRole('button',{name:'Review jobs & poaching offers',exact:true}).click();assert.equal(await page.locator('.offer-card').count(),20);assert(await page.locator('.offer-locked').count()>0);await overflow('dismissed manager offers');
   await page.locator('.offer-available').first().getByRole('button',{name:'Review contract',exact:true}).click();await page.getByRole('button',{name:'Accept contract & begin next season',exact:true}).click();await page.waitForTimeout(150);
   const rescued=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {season:c.world.season,status:c.status,club:c.clubId,relegation:c.legacy.achievements.some(a=>a.id==='relegated'),pool:c.world.championshipClubIds};});
   assert.equal(rescued.season,2027);assert.equal(rescued.status,'active');assert.notEqual(rescued.club,'hull');assert(rescued.relegation);assert(rescued.pool.includes('hull'));assert.deepEqual(errors,[]);await overflow('career after relegation');
   console.log(`PASS ${width}x${height}: season ledger, award, permanent achievements, 44-club checklist, all 20 job offers, cancel/accept poaching, +50 once, refresh, dismissal and new-club continuation`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
