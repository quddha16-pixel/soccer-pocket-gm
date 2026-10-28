// Real engine-generated chances in disposable browser careers. No user saves.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5175/soccer-pocket-gm/';
const dir=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-key-moments-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  let fixtures;
  for(const [wi,[width,height]] of [[320,568],[375,812],[390,844],[430,932]].entries()){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   if(!fixtures)fixtures=await page.evaluate(async()=>{
    const {newCareer,prepareWeek}=await import('./src/simulation/career.ts'),{resolveMatch}=await import('./src/simulation/match.ts'),{random}=await import('./src/simulation/random.ts'),{momentTitles,momentOptions,momentKinds}=await import('./src/simulation/momentRules.ts');
    const c=newCareer('Decision QA','elite','liverpool',23),prepared=prepareWeek(c),original=prepared.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId),found={};
    for(let seed=1;seed<=100&&Object.keys(found).length<6;seed++){
     const f=resolveMatch(original,c,random(seed));
     for(const m of f.report.keyMoments.filter(m=>m.clubId===c.clubId))if(!found[m.kind]){
      const report={...f.report,keyMoments:f.report.keyMoments.map(x=>x.clubId===c.clubId&&x.id!==m.id?{...x,selection:x.autoChoice}:x)};
      const career={...prepared,pending:{...prepared.pending,minute:Math.max(0,m.minute-3),paused:true,speed:4,fixtures:prepared.pending.fixtures.map(x=>x.id===f.id?{...f,report}:x)}};
      found[m.kind]={career,moment:m,title:momentTitles[m.kind],options:momentOptions[m.kind].map(o=>o.title)};
     }
    }
    return momentKinds.map(kind=>found[kind]);
   });
   assert(fixtures.every(Boolean),'all six natural chance types found');
   const overflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${label} overflow`);
   for(const [ki,fixture] of fixtures.entries()){
    await page.evaluate(async c=>{localStorage.clear();sessionStorage.clear();const{saveCareer}=await import('./src/storage.ts');saveCareer(c);},fixture.career);await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
    const expanded=ki===3;
    if(expanded){await page.locator('summary[aria-label="Match options"]').click();await page.getByRole('button',{name:'Full-screen match',exact:true}).click();}
    await (expanded?page.getByRole('dialog').getByRole('button',{name:'Resume',exact:true}):page.getByRole('button',{name:'Resume',exact:true})).click();
    let dialog=page.getByRole('dialog',{name:fixture.title,exact:true});await dialog.waitFor();
    const paused=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career;return {minute:c.pending.minute,paused:c.pending.paused};});assert.equal(paused.paused,true);assert.equal(paused.minute,fixture.moment.minute-1);
    assert.equal(await dialog.locator('.moment-options button').count(),3);assert.equal(await dialog.getByRole('status').count(),0);const body=await dialog.locator('.modal-content').boundingBox(),last=await dialog.locator('.moment-options button').last().boundingBox();assert(last.y+last.height<=body.y+body.height+1,`${width}: all three ${fixture.title} choices fit without scrolling`);await overflow(fixture.title);await page.screenshot({path:`${dir}/${width}-${fixture.moment.kind}-choice.png`,fullPage:true});
    // Refresh a waiting choice: no result or different random chance may appear.
    await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();dialog=page.getByRole('dialog',{name:fixture.title,exact:true});await dialog.waitFor();
    const option=(wi+ki)%3;await dialog.locator('.moment-options button').nth(option).click();
    let outcome=page.getByRole('dialog',{name:'The outcome',exact:true});await outcome.waitFor();assert(await outcome.getByRole('status').isVisible());await overflow('decision outcome');await page.screenshot({path:`${dir}/${width}-${fixture.moment.kind}-result.png`,fullPage:true});
    const result=await page.evaluate(async id=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career,f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId);return {selection:f.report.keyMoments.find(m=>m.id===id).selection,feedback:c.pending.decisionFeedback};},fixture.moment.id);assert.equal(result.selection,option);assert.equal(result.feedback,fixture.moment.id);
    await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();outcome=page.getByRole('dialog',{name:'The outcome',exact:true});await outcome.waitFor();await outcome.getByRole('button',{name:'Continue match',exact:true}).click();
    // Finish through the UI and verify the round can still be committed once.
    if(await page.locator('summary[aria-label="Match options"]').count()){await page.getByRole('button',{name:'Pause',exact:true}).click();await page.locator('summary[aria-label="Match options"]').click();await page.getByRole('button',{name:'Skip to full time',exact:true}).click();}await page.getByRole('button',{name:'Finish matchweek & view results',exact:true}).click();assert.equal(await page.getByRole('dialog').locator('.fixture').count(),10);
   }
   assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: all six decisions, three actions, natural pause, expanded pitch, waiting/result refresh, continue, skip and committed round; no overflow/runtime errors`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
