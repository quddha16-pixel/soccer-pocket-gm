// Disposable browser fixtures; never writes to a real user's career.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5175/soccer-pocket-gm/';
const dir=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-substitutions-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const nav=name=>page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name,exact:true});
  const overflow=async name=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${name} overflow`);
  await page.goto(url);await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();const {newCareer}=await import('./src/simulation/career.ts');const {saveCareer}=await import('./src/storage.ts');saveCareer(newCareer('Matchday QA','elite','liverpool',37));});await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
  await page.getByRole('button',{name:/Play Next Match/}).click();await page.getByRole('button',{name:'Set your subs',exact:true}).click();
  await overflow('substitution sheet');await page.screenshot({path:`${dir}/${width}-set-subs.png`,fullPage:true});
  await page.getByText('Choose bench · 9 / 9 selected',{exact:true}).click();await overflow('bench selection');await page.screenshot({path:`${dir}/${width}-bench.png`,fullPage:true});await page.getByText('Choose bench · 9 / 9 selected',{exact:true}).click();
  await page.getByLabel('Substitution minute',{exact:true}).fill('60');await page.getByRole('button',{name:'Schedule substitution',exact:true}).click();assert(await page.getByRole('status').isVisible());await page.getByRole('button',{name:'Done',exact:true}).click();
  const scheduled=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');return loadCareer().career.matchPlan.changes[0];});
  await page.getByRole('button',{name:'Watch Match',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForFunction(async()=>{const{loadCareer}=await import('./src/storage.ts');return loadCareer().career.pending.paused;});
  // Advance the disposable playback clock without changing its resolved events.
  await page.evaluate(async()=>{const{loadCareer,saveCareer}=await import('./src/storage.ts');const c=loadCareer().career;c.pending.minute=30;c.pending.paused=true;saveCareer(c);});await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
  await page.getByRole('button',{name:'Make a substitution',exact:true}).click();assert(await page.getByText(/Match paused/).isVisible());
  const before=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId).report.events.filter(e=>e.minute<=30);});
  // Cancel the future instruction before using its outgoing player manually.
  await page.getByRole('button',{name:'Cancel planned change',exact:true}).click();
  const offId=await page.getByLabel('Player off',{exact:true}).inputValue(),onId=await page.getByLabel('Player on',{exact:true}).inputValue();
  await page.getByRole('button',{name:'Confirm substitution',exact:true}).click();assert(await page.getByRole('status').isVisible());await overflow('live substitution');await page.screenshot({path:`${dir}/${width}-live-subs.png`,fullPage:true});
  await page.getByRole('button',{name:'Done',exact:true}).click();
  const changed=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career,f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId);return {changes:f.report.substitutions.filter(s=>s.clubId===c.clubId),prefix:f.report.events.filter(e=>e.minute<=30),minute:c.pending.minute,paused:c.pending.paused};});
  assert.equal(changed.minute,30);assert.equal(changed.paused,true);assert.deepEqual(changed.prefix,before);assert.equal(changed.changes.length,1);assert.equal(changed.changes[0].offId,offId);assert.equal(changed.changes[0].onId,onId);
  await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();await page.locator('summary[aria-label="Match options"]').click();await page.getByRole('button',{name:'Skip to full time',exact:true}).click();await page.getByRole('button',{name:'Finish matchweek & view results',exact:true}).click();
  const minutes=await page.evaluate(async({offId,onId})=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {week:c.week,out:c.players.find(p=>p.id===offId).identity.development.minutes,on:c.players.find(p=>p.id===onId).identity.development.minutes};},{offId,onId});assert.deepEqual(minutes,{week:1,out:30,on:60});
  await page.getByRole('button',{name:'Continue to club',exact:true}).click();await nav('Market').click();await page.getByRole('button',{name:/Search & filter players/}).click();await page.getByLabel('Search player',{exact:true}).fill('Declan Rice');await page.getByRole('button',{name:/Show \d+ players/}).click();assert(await page.getByText('Not for sale',{exact:true}).isVisible());await page.getByRole('button',{name:'Approach player',exact:true}).click();assert(await page.getByText('The club is refusing a sale regardless of fee.',{exact:false}).isVisible());await overflow('seller refusal');await page.screenshot({path:`${dir}/${width}-seller-refusal.png`,fullPage:true});
  assert.deepEqual(errors,[]);console.log(`${width}x${height}: bench, planned and live changes, fixed past events, refresh, correct minutes and seller refusal passed (${scheduled.minute} minute plan)`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
