import {afterEach,describe,it,expect} from 'vitest';
import {newCareer,prepareWeek} from '../simulation/career';
import {animationFrame} from '../simulation/animation';
import {resolveMatch} from '../simulation/match';
import {random} from '../simulation/random';
import {activeDecision,managedFixture,continueAfterDecision} from '../simulation/keyMoments';
import {createHighlight,stepHighlight,highlightContext,snapshotHighlight,completeHighlight,validHighlight} from '../simulation/highlights';
import {saveCareer,loadCareer} from '../storage';
import {makeLiveSubstitution} from '../simulation/substitutions';
import {fixtureLineup} from '../simulation/substitutionRules';
import {shotBall,shotPower,validAimedShot,pathPosition} from '../simulation/shotGeometry';
import type {Career} from '../models';
import type {HighlightState} from '../simulation/highlightModels';
const fresh=()=>prepareWeek({...newCareer('Corner coach','elite','liverpool',23),playableHighlights:true});
function corner(defending=false):Career{const c=fresh(),f=managedFixture(c)!,m=f.report!.keyMoments!.find(m=>m.kind==='corner'&&(m.clubId!==c.clubId)===defending)!;return {...c,pending:{...c.pending!,minute:m.minute-1,paused:true}};}
afterEach(()=>{localStorage.clear();sessionStorage.clear();});
describe('continuous mini-pitch and counted corners',()=>{
 it('keeps all outfield players and the ball moving when no shot is nearby',()=>{
  const c=fresh(),f={...managedFixture(c)!,report:{...managedFixture(c)!.report!,events:[]}},a=animationFrame(f,10.1),b=animationFrame(f,10.4);expect(a.players).toHaveLength(22);expect(a.players.filter((p,i)=>!p.keeper&&Math.hypot(p.x-b.players[i].x,p.y-b.players[i].y)>.01)).toHaveLength(20);expect(a.ball).not.toEqual(b.ball);expect(a.pass).toBeDefined();expect(b.pass).toBeDefined();expect(JSON.stringify(animationFrame(f,12.3))).toBe(JSON.stringify(animationFrame(f,12.3)));
 });
 it('transfers every visual pass continuously from its passer to its actual receiver',()=>{
  const c=fresh(),f={...managedFixture(c)!,report:{...managedFixture(c)!.report!,events:[]}};
  for(let n=5;n<30;n++){const a=animationFrame(f,n*1.4+.1),b=animationFrame(f,(n+1)*1.4+.1);expect(a.pass!.to).toBe(b.pass!.from);expect(a.players.some(p=>p.id===a.pass!.from)).toBe(true);expect(a.players.some(p=>p.id===a.pass!.to)).toBe(true);const before=animationFrame(f,n*1.4-.0001),after=animationFrame(f,n*1.4+.0001);expect(Math.hypot(before.ball.x-after.ball.x,before.ball.y-after.ball.y)).toBeLessThan(.1);}
 });
 it('schedules 4–17 distinct corners per new game and preserves the plan through live substitutions',()=>{
  const c=fresh(),base=managedFixture(c)!;for(let seed=1;seed<=80;seed++){const f=resolveMatch(base,c,random(seed)),corners=f.report!.keyMoments!.filter(m=>m.kind==='corner');expect(corners.length).toBeGreaterThanOrEqual(4);expect(corners.length).toBeLessThanOrEqual(17);expect(corners.length).toBe(f.report!.cornerTarget);expect(new Set(corners.map(m=>m.id)).size).toBe(corners.length);for(const m of corners)expect(fixtureLineup(f,m.clubId,m.minute-1)).toContain(m.actorId);}
  const match={...c,pending:{...c.pending!,minute:35,paused:true}},f=managedFixture(match)!,bench=f.homeId===c.clubId?f.report!.homeBench!:f.report!.awayBench!,on=bench.find(id=>c.players.find(p=>p.id===id)!.position!=='GK')!,off=fixtureLineup(f,c.clubId,35)[9],sub=makeLiveSubstitution(match,off,on),after=managedFixture(sub)!;expect(after.report!.cornerTarget).toBe(f.report!.cornerTarget);expect(after.report!.keyMoments!.filter(m=>m.kind==='corner').length).toBe(f.report!.cornerTarget);expect(after.report!.keyMoments!.filter(m=>m.minute<=35)).toEqual(f.report!.keyMoments!.filter(m=>m.minute<=35));saveCareer(sub);expect(loadCareer().error).toBe('');
 },15000);
 it('plays an attacking corner with a real lofted delivery and a buffered first-time finish',()=>{
  const c=corner(),m=activeDecision(c)!,ctx=highlightContext(c,m);let s:HighlightState={...createHighlight(c,m),phase:'playing'};expect(s.kind).toBe('corner');expect(s.defending).toBe(false);expect(s.defenders).toHaveLength(3);s=stepHighlight(s,{x:0,y:-1,pass:true},1/30,ctx);expect(s.ball.flight?.kind).toBe('cross');for(let i=0;i<20;i++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);expect(s.ball.z).toBeGreaterThan(1);expect(validHighlight(snapshotHighlight(c,s))).toBe(true);saveCareer(snapshotHighlight(c,s));expect(loadCareer().error).toBe('');s=stepHighlight(s,{x:0,y:0,shoot:.65},1/30,ctx);expect(s.queuedShot).toBe(.65);for(let i=0;i<200&&s.phase!=='finished';i++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);expect(s.phase).toBe('finished');expect(s.result!.shooterId).not.toBe(m.actorId);const completed=completeHighlight(c,s);saveCareer(completed);expect(loadCareer().error).toBe('');expect(managedFixture(completed)!.report!.keyMoments!.find(x=>x.id===m.id)!.highlight).toBeDefined();
 });
 it('pauses for opposition corners and lets a selected defender clear without creating a phantom shot',()=>{
  const c=corner(true),m=activeDecision(c)!,ctx=highlightContext(c,m);let s:HighlightState={...createHighlight(c,m),phase:'playing'};expect(m.clubId).not.toBe(c.clubId);expect(s.defending).toBe(true);expect(s.defenders.some(p=>p.id===s.controlledId)).toBe(true);const before=s.controlledId;s=stepHighlight(s,{x:0,y:0,pass:true},1/30,ctx);expect(s.controlledId).not.toBe(before);for(let i=0;i<52;i++)s=stepHighlight(s,{x:0,y:0},1/30,ctx);expect(s.delivered).toBe(true);expect(s.ball.flight?.kind).toBe('cross');saveCareer(snapshotHighlight(c,s));expect(loadCareer().error).toBe('');
  let cleared=false;for(let n=0;n<15&&!cleared;n++){const candidate=structuredClone(s),def=candidate.defenders.find(p=>p.id===candidate.controlledId)!;def.x=candidate.ball.x;def.y=candidate.ball.y;candidate.rng=(0x9e3779b9+n*1234567)>>>0;const next=stepHighlight(candidate,{x:0,y:0,shoot:.65},1/30,ctx);if(next.phase==='finished'){cleared=true;const done=completeHighlight(c,next),f=managedFixture(done)!;expect(next.result!.outcome).toBe('blocked');expect(f.report!.events.some(e=>e.momentId===m.id)).toBe(false);saveCareer(done);expect(loadCareer().error).toBe('');expect(continueAfterDecision(done).pending!.minute).toBe(m.minute);}}expect(cleared).toBe(true);
 });
 it('keeps stroke power optional, validates it, and preserves the actual user path',()=>{
  const path=[shotBall,{x:.3,y:.72},{x:.25,y:.4},{x:.2,y:.16}],fast={path,durationMs:180},slow={path,durationMs:1300};expect(validAimedShot(fast)).toBe(true);expect(validAimedShot({path,durationMs:NaN})).toBe(false);expect(shotPower(fast)).toBeGreaterThan(shotPower(slow));expect(pathPosition(fast.path,.4)).toEqual(pathPosition(slow.path,.4));expect(shotPower({path})).toBe(.65);
 });
});
