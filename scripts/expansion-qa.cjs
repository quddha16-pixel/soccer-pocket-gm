// Optional Playwright QA against Vite. All browser storage is disposable.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5173/soccer-pocket-gm/';
const dir=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-expansion-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 let completed;
 try{for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const nav=name=>page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name,exact:true});
  const overflow=async name=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${name} overflow`);
  await page.goto(url);await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.reload();
  await page.getByRole('button',{name:'Start career',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:/^Developer/}).count(),1);assert.equal(await page.getByRole('button',{name:/^Negotiator/}).count(),1);await page.getByRole('button',{name:/^Football genius/}).click();await overflow('manager styles');await page.screenshot({path:`${dir}/${width}-styles.png`,fullPage:true});
  await page.getByRole('button',{name:'Find job offers',exact:true}).click();assert.equal(await page.locator('.offer-card').count(),20);assert.equal(await page.locator('.offer-available').count(),6);assert.equal(await page.locator('.offer-locked').count(),14);await overflow('unknown offers');
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:/Established manager/}).click();await page.getByRole('button',{name:'Find job offers',exact:true}).click();assert.equal(await page.locator('.offer-available').count(),20);await overflow('all offers');await page.screenshot({path:`${dir}/${width}-club-grid.png`,fullPage:true});
  await page.getByRole('article',{name:'Liverpool: Contract offered'}).getByRole('button',{name:'Accept offer',exact:true}).click();
  const start=await page.evaluate(async()=>{const {loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {style:c.managerStyle,free:c.players.filter(p=>!p.clubId).length,coach:c.world.staff.find(s=>s.clubId===c.clubId&&s.role==='Manager').name};});assert.deepEqual(start,{style:'genius',free:50,coach:'Andoni Iraola'});await overflow('club theme');await page.screenshot({path:`${dir}/${width}-theme.png`});
  await nav('Squad').click();await page.getByRole('button',{name:/Match approach/}).click();await page.getByLabel('Exclusive coached playstyle').selectOption('counterpress');await overflow('exclusive tactics');await page.getByRole('button',{name:'Back',exact:true}).click();
  await nav('Market').click();await page.getByLabel('Market view').selectOption('Free Agents');await overflow('free agents');assert(await page.getByRole('heading',{name:'Karim Benzema'}).isVisible());
  await page.locator('.player-market-card').filter({has:page.getByRole('heading',{name:'Jadon Sancho',exact:true})}).locator('.market-player-identity').click();assert(await page.getByText('Provisional game assessment · Starting OVR 76',{exact:true}).isVisible());await page.getByRole('button',{name:'Close profile'}).click();
  await nav('League').click();await page.getByText('Head coaches',{exact:true}).click();assert.equal(await page.locator('.coach-directory > div').count(),20);await overflow('head coaches');await page.screenshot({path:`${dir}/${width}-coaches.png`,fullPage:true});
  if(!completed)completed=await page.evaluate(async()=>{const {newCareer,advance}=await import('./src/simulation/career.ts');let c=newCareer('QA','elite','liverpool',5701,'genius');c.geniusPlaystyle='counterpress';for(let i=0;i<38;i++)c=advance(c);return c;});
  await page.evaluate(async c=>{const {saveCareer}=await import('./src/storage.ts');sessionStorage.clear();saveCareer(c);},completed);await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
  assert(await page.getByText('Ballon d’Or',{exact:true}).isVisible());await overflow('end-season awards');await page.screenshot({path:`${dir}/${width}-awards.png`,fullPage:true});
  await nav('League').click();await page.getByRole('button',{name:'Records',exact:true}).click();await page.getByLabel('Player record').selectOption('chances');assert(await page.getByRole('heading',{name:'Most chances created'}).isVisible());await overflow('player records');await page.screenshot({path:`${dir}/${width}-records.png`,fullPage:true});
  await page.getByRole('button',{name:'Single match',exact:true}).click();assert(await page.getByRole('heading',{name:'Most saves in a match'}).isVisible());await overflow('match records');await page.getByRole('button',{name:'Club records',exact:true}).click();assert(await page.getByRole('heading',{name:'Longest win streak'}).isVisible());await overflow('club records');
  await nav('Home').click();assert.equal(completed.status,'survived','QA manager survives the actual full simulation');await page.getByRole('button',{name:'Begin next season',exact:true}).click();await nav('League').click();await page.getByRole('button',{name:'Awards',exact:true}).click();await page.getByLabel('Award season').selectOption('2026');assert(await page.getByText('Ballon d’Or',{exact:true}).isVisible());await overflow('archived awards');
  await page.getByRole('button',{name:'Records',exact:true}).click();await page.getByLabel('Record period').selectOption('2026');await page.getByRole('button',{name:'Player totals',exact:true}).click();assert(await page.locator('.record-row').count()>0);await overflow('archived records');
  await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();const saved=await page.evaluate(async()=>{const {loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {year:c.world.season,style:c.managerStyle,reviews:c.world.seasonReviews.length};});assert.deepEqual(saved,{year:2027,style:'genius',reviews:1});assert.deepEqual(errors,[]);
  console.log(`${width}x${height}: all-club selection, styles, themes, 50 free agents, coaches, full-season awards, records, rollover and refresh passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
