// Real, naturally generated set pieces in disposable mobile browser careers.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BASE_URL||'http://localhost:5175/soccer-pocket-gm/';
const dir=process.env.QA_ARTIFACTS||'/tmp/pocket-gm-aimed-shots-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  let fixtures;
  for(const [wi,[width,height]] of [[320,568],[375,812],[390,844],[430,932]].entries()){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   if(!fixtures)fixtures=await page.evaluate(async()=>{
    const{newCareer,prepareWeek}=await import('./src/simulation/career.ts'),{resolveMatch}=await import('./src/simulation/match.ts'),{random}=await import('./src/simulation/random.ts');
    const c=newCareer('Shot Gesture QA','elite','liverpool',23),prepared=prepareWeek(c),original=prepared.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId),found={};
    for(let seed=1;seed<=150&&Object.keys(found).length<2;seed++){const f=resolveMatch(original,c,random(seed));for(const m of f.report.keyMoments.filter(m=>m.clubId===c.clubId&&['penalty','free-kick'].includes(m.kind)))if(!found[m.kind]){const report={...f.report,keyMoments:f.report.keyMoments.map(x=>x.clubId===c.clubId&&x.id!==m.id?{...x,selection:x.autoChoice}:x)};found[m.kind]={career:{...prepared,pending:{...prepared.pending,minute:m.minute-1,paused:true,fixtures:prepared.pending.fixtures.map(x=>x.id===f.id?{...f,report}:x)}},moment:m};}}
    return [found.penalty,found['free-kick']];
   });
   assert(fixtures.every(Boolean),'natural penalty and free kick found');const cdp=await page.context().newCDPSession(page);
   const overflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${label} overflow`);
   for(const fixture of fixtures){
    await page.goto(url);
    await page.evaluate(async c=>{localStorage.clear();sessionStorage.clear();const{saveCareer}=await import('./src/storage.ts');saveCareer(c);},fixture.career);await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:fixture.moment.kind==='penalty'?'Penalty kick':'Free kick',exact:true});await dialog.waitFor();assert.equal(await dialog.locator('.moment-options').count(),0);assert.equal(await dialog.locator('.shot-matchup .player-avatar').count(),2);
    const shoot=dialog.getByRole('button',{name:'Take shot',exact:true});assert(await shoot.isDisabled());const surface=dialog.getByRole('group',{name:'Shot aiming area',exact:true});
    await surface.tap({position:{x:60,y:65}});assert(await shoot.isEnabled());await dialog.getByRole('button',{name:'Redraw',exact:true}).click();assert(await shoot.isDisabled());
    const path=fixture.moment.kind==='free-kick'?[[.5,.88],[.35,.78],[.27,.65],[.27,.48],[.35,.3],[.70,.16]]:wi===2?[[.5,.88],[.69,.62],[.87,.36],[.98,.16]]:[[.5,.88],[.42,.76],[.34,.57],[.26,.34],[.20,.15]];
    const pixels=await surface.evaluate((svg,points)=>points.map(([x,y])=>{const p=svg.createSVGPoint();p.x=x*320;p.y=y*270;const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};}),path);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pixels[0],radiusX:5,radiusY:5,force:1,id:1}]});for(const p of pixels.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,radiusX:5,radiusY:5,force:1,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert(await shoot.isEnabled());const preview=await dialog.locator('[data-testid="drawn-shot-path"]').getAttribute('d');assert(preview.includes('L'));assert(preview.split('L').length>=4,'touch curve retained');await overflow('aiming');
    const viewport=await shoot.boundingBox();assert(viewport.y>=0&&viewport.y+viewport.height<=height,'shot button visible');await page.screenshot({path:`${dir}/${width}-${fixture.moment.kind}-aim.png`,fullPage:true});
    const before=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');return loadCareer().career.pending.minute;});assert.equal(before,fixture.moment.minute-1);await shoot.click();
    const outcome=page.getByRole('dialog',{name:'The outcome',exact:true});await outcome.waitFor();assert.equal(await outcome.locator('[data-testid="drawn-shot-path"]').getAttribute('d'),preview,'replay matches authored path');await outcome.getByRole('button',{name:'Continue match',exact:true}).waitFor();
    const saved=await page.evaluate(async id=>{const{loadCareer}=await import('./src/storage.ts');const c=loadCareer().career,f=c.pending.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId),m=f.report.keyMoments.find(m=>m.id===id);return {path:m.shot.path,outcome:m.outcome,minute:c.pending.minute,paused:c.pending.paused};},fixture.moment.id);
    assert(saved.path.length>=4);assert.equal(saved.paused,true);assert.equal(saved.minute,before);if(fixture.moment.kind==='penalty'&&wi===2)assert.equal(saved.outcome,'wide');
    const ball=outcome.locator('[data-testid="shot-ball"]');assert(Math.abs(Number(await ball.getAttribute('data-x'))-saved.path.at(-1).x)<.0002);assert(Math.abs(Number(await ball.getAttribute('data-y'))-saved.path.at(-1).y)<.0002);await overflow('shot outcome');await page.screenshot({path:`${dir}/${width}-${fixture.moment.kind}-outcome.png`,fullPage:true});
    await page.reload();await page.getByRole('button',{name:'Continue career',exact:true}).click();const restored=page.getByRole('dialog',{name:'The outcome',exact:true});await restored.getByRole('button',{name:'Continue match',exact:true}).waitFor();assert.equal(await restored.locator('[data-testid="drawn-shot-path"]').getAttribute('d'),preview);await restored.getByRole('button',{name:'Continue match',exact:true}).click();
    const after=await page.evaluate(async()=>{const{loadCareer}=await import('./src/storage.ts');return loadCareer().career.pending;});assert.equal(after.decisionFeedback,undefined);assert(after.minute>=fixture.moment.minute);
   }
   assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: natural penalty/free kick, both avatars, no three-choice menus, real touch curves, tap/redraw, exact ball-path replay, outside-goal miss, pause, persistent result, refresh and continuation`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
