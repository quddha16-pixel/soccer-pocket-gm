// Optional Playwright check against Vite. Uses isolated, disposable browser saves.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5173/soccer-pocket-gm/';
const artifacts=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-promotion-qa';fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const nav=name=>page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name,exact:true});
   const overflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${label} overflow`);
   await page.goto(url);
   const expected=await page.evaluate(async()=>{
    const {newCareer}=await import('./src/simulation/career.ts');const {promotionDraw}=await import('./src/simulation/promotion.ts');const {saveCareer}=await import('./src/storage.ts');
    const c=newCareer('Promotion QA','elite','liverpool',5701);c.fixtures=c.fixtures.map(f=>({...f,homeGoals:f.homeId===c.clubId?4:f.awayId===c.clubId?0:1,awayGoals:f.awayId===c.clubId?4:f.homeId===c.clubId?0:1}));c.week=38;c.status='survived';
    localStorage.clear();sessionStorage.clear();saveCareer(c);return promotionDraw(c);
   });
   await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
   await nav('League').click();await page.getByRole('button',{name:'EFL pool',exact:true}).click();
   assert.equal(await page.locator('.pool-club').count(),24);await overflow('initial pool');await page.screenshot({path:`${artifacts}/${width}-pool.png`});
   await nav('Home').click();await page.getByRole('button',{name:'Begin next season',exact:true}).click();
   const actual=await page.evaluate(async()=>{const {loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {season:c.world.season,league:c.world.leagueClubIds,pool:c.world.championshipClubIds,history:c.world.history.length};});
   assert.equal(actual.season,2027);assert.deepEqual(actual.league,expected.leagueClubIds);assert.deepEqual(actual.pool,expected.championshipClubIds);assert.equal(actual.history,1);
   assert.equal(await page.getByRole('button',{name:'Begin next season',exact:true}).count(),0);
   await nav('League').click();await page.getByRole('button',{name:'Table',exact:true}).click();assert.equal(await page.locator('.compact-table tbody tr').count(),20);await overflow('promoted table');
   await page.screenshot({path:`${artifacts}/${width}-new-table.png`});
   await page.getByRole('button',{name:'EFL pool',exact:true}).click();assert.equal(await page.locator('.pool-club').count(),24);assert(await page.getByRole('heading',{name:'Latest season changes'}).isVisible());await overflow('promotion summary');await page.screenshot({path:`${artifacts}/${width}-movements.png`});
   await page.getByRole('button',{name:'Fixtures',exact:true}).click();await page.getByLabel('Fixture season').selectOption('2026');assert.equal(await page.locator('.fixture').count(),10);assert.equal(await page.locator('.fixture .score:not(.pending)').count(),10);await overflow('archived fixtures');
   await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();await nav('League').click();assert.equal(await page.locator('.compact-table tbody tr').count(),20);await overflow('restored table');
   assert.deepEqual(errors,[]);console.log(`${width}x${height}: pool, rollover, table, archive and refresh passed`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
