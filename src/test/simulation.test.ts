import { describe,it,expect } from 'vitest';
import { clubs } from '../data/clubs';
import { generatePlayers } from '../data/players';
import { generateFixtures,standings,isRelegated } from '../simulation/league';
import { advance,newCareer,offers,score } from '../simulation/career';
import { random } from '../simulation/random';
import { loadCareer,saveCareer,SAVE_KEY } from '../storage';
describe('fixture generation',()=>{
 const fixtures=generateFixtures(clubs.map(c=>c.id));
 it('has 380 unique fixtures and 38 complete matchweeks',()=>{
 expect(fixtures).toHaveLength(380);expect(new Set(fixtures.map(f=>f.id)).size).toBe(380);
 for(let w=1;w<=38;w++){const round=fixtures.filter(f=>f.week===w);expect(round).toHaveLength(10);expect(new Set(round.flatMap(f=>[f.homeId,f.awayId])).size).toBe(20);}
 });
 it('gives each club 19 home and 19 away games, with every opponent twice',()=>{
 for(const a of clubs){expect(fixtures.filter(f=>f.homeId===a.id)).toHaveLength(19);expect(fixtures.filter(f=>f.awayId===a.id)).toHaveLength(19);for(const b of clubs){expect(fixtures.filter(f=>f.homeId===a.id&&f.awayId===b.id)).toHaveLength(a.id===b.id?0:1);}}
 });
 it('rejects invalid membership',()=>expect(()=>generateFixtures(['a','a'])).toThrow());
});
describe('standings',()=>{
 it('accounts for wins, draws, losses and ignores unplayed matches',()=>{
 const f=[{id:'1',week:1,homeId:'a',awayId:'b',homeGoals:3,awayGoals:1},{id:'2',week:2,homeId:'b',awayId:'a',homeGoals:2,awayGoals:2},{id:'3',week:3,homeId:'a',awayId:'b'}];
 expect(standings([{id:'a'},{id:'b'}],f)).toEqual([{clubId:'a',played:2,won:1,drawn:1,lost:0,gf:5,ga:3,points:4},{clubId:'b',played:2,won:0,drawn:1,lost:1,gf:3,ga:5,points:1}]);
 });
 it('orders equal points by goal difference then goals scored',()=>{
 const ids=['a','b','c','d'];const f=[{id:'1',week:1,homeId:'a',awayId:'d',homeGoals:1,awayGoals:0},{id:'2',week:2,homeId:'b',awayId:'d',homeGoals:3,awayGoals:1},{id:'3',week:3,homeId:'c',awayId:'d',homeGoals:4,awayGoals:2}];
 expect(standings(ids.map(id=>({id})),f).map(r=>r.clubId)).toEqual(['c','b','a','d']);
 });
});
describe('career and simulation',()=>{
 it('restricts unknown managers to weaker clubs',()=>{expect(offers('unknown').every(c=>c.strength<=74)).toBe(true);expect(()=>newCareer('Test','unknown','city')).toThrow();});
 it('generates reproducible rosters with stable, unique IDs and full data',()=>{const players=generatePlayers(clubs,5);expect(players).toHaveLength(480);expect(new Set(players.map(p=>p.id)).size).toBe(480);expect(generatePlayers(clubs,5)).toEqual(players);for(const p of players){expect(p.potential).toBeGreaterThanOrEqual(p.overall);expect(p.fitness).toBeLessThanOrEqual(100);expect(p.wage).toBeGreaterThan(0);}});
 it('advances all ten fixtures once and retains previous results',()=>{const c=newCareer('Test','unknown',offers('unknown')[0].id,123);const next=advance(c);expect(next.fixtures.filter(f=>f.homeGoals!==undefined)).toHaveLength(10);expect(next.week).toBe(1);expect(c.week).toBe(0);expect(advance(next).fixtures.slice(0,10)).toEqual(next.fixtures.slice(0,10));});
 it('completes a season, maintains accounting, and fires exactly bottom-three clubs',()=>{
 for(const club of offers('unknown')){
 let c=newCareer('Test','unknown',club.id,123);for(let i=0;i<38;i++)c=advance(c);
 const table=standings(clubs,c.fixtures);expect(table.every(r=>r.played===38&&r.won+r.drawn+r.lost===38)).toBe(true);expect(table.reduce((s,r)=>s+r.gf,0)).toBe(table.reduce((s,r)=>s+r.ga,0));
 expect(c.status).toBe(table.findIndex(r=>r.clubId===club.id)>=17?'fired':'survived');expect(advance(c)).toBe(c);
 }
 },60000);
 it('only relegates ranks 18–20 after season completion',()=>{const table=standings(clubs,[]);table.forEach((r,i)=>{expect(isRelegated(table,r.clubId,false)).toBe(false);expect(isRelegated(table,r.clubId,true)).toBe(i>=17);});expect(isRelegated(table,'missing',true)).toBe(false);});
 it('favours stronger teams and the home side without guaranteeing outcomes',()=>{
 const rng=random(42);let home=0,away=0,wins=0,losses=0;for(let i=0;i<5000;i++){const [h,a]=score(85,70,rng);home+=h;away+=a;if(h>a)wins++;if(h<a)losses++;}expect(home).toBeGreaterThan(away);expect(wins).toBeGreaterThan(losses);expect(losses).toBeGreaterThan(100);
 let hg=0,ag=0;for(let i=0;i<5000;i++){const [h,a]=score(80,80,rng);hg+=h;ag+=a;}expect(hg).toBeGreaterThan(ag);expect((hg+ag)/5000).toBeGreaterThan(2);expect((hg+ag)/5000).toBeLessThan(3.5);
 });
});
describe('persistence',()=>{
 it('round trips careers and rejects malformed or incompatible saves',()=>{const c=newCareer('Test','unknown',offers('unknown')[0].id,123);saveCareer(c);expect(loadCareer().career).toEqual(c);localStorage.setItem(SAVE_KEY,'{broken');expect(loadCareer().error).not.toBe('');localStorage.setItem(SAVE_KEY,JSON.stringify({...c,fixtures:[]}));expect(loadCareer().career).toBeNull();localStorage.clear();});
});
