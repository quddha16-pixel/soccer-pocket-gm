import { describe,it,expect,afterEach } from 'vitest';
import { cleanup,render,screen,fireEvent } from '@testing-library/react';
import { newCareer,prepareWeek } from '../simulation/career';
import { autoLineup,lineupFit,naturalFit } from '../simulation/management';
import { lineupStrength,resolveMatch } from '../simulation/match';
import { random } from '../simulation/random';
import { setMatchPlan } from '../simulation/substitutions';
import { nextMatchPlan } from '../simulation/substitutionRules';
import { FormationPitch } from '../components/FormationPitch';
afterEach(()=>cleanup());
describe('positional penalties affect real match outcomes',()=>{
 it('preserves primary and secondary positions but severely penalizes unrelated roles',()=>{
  const c=newCareer('Roles','elite','liverpool',1),cb=c.players.find(p=>p.name==='Virgil van Dijk')!,rice=c.players.find(p=>p.name==='Declan Rice')!;
  expect(naturalFit(cb,'CB')).toBe(1);expect(naturalFit(cb,'ST')).toBe(.4);expect(naturalFit(cb,'GK')).toBe(.15);expect(naturalFit(rice,'CDM')).toBe(1);expect(naturalFit(rice,'CM')).toBeGreaterThanOrEqual(.88);
  for(const p of c.players.filter(p=>p.real))for(const pos of p.real!.secondaryPositions)expect(naturalFit(p,pos)).toBeGreaterThanOrEqual(.98);
 });
 it('reduces effective team strength and expected goals over repeated matches when defenders and attackers trade roles',()=>{
  const c=newCareer('Roles','elite','liverpool',23),lineup=[...c.lineup];for(const [a,b] of [[1,8],[2,9],[3,10],[4,6]])[lineup[a],lineup[b]]=[lineup[b],lineup[a]];
  const bad={...c,lineup},players=(ids:string[])=>ids.map(id=>c.players.find(p=>p.id===id)!);
  expect(lineupStrength(players(lineup),c.formation)).toBeLessThan(lineupStrength(players(c.lineup),c.formation)*.75);
  const f=c.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
  let normalXg=0,badXg=0,normalAgainst=0,badAgainst=0;
  for(let seed=1;seed<=60;seed++)for(const [context,normal] of [[c,true],[bad,false]] as const){const match=resolveMatch(f,context,random(seed));for(const e of match.report!.events){if(e.clubId===c.clubId){if(normal)normalXg+=e.xG!;else badXg+=e.xG!;}else if(normal)normalAgainst+=e.xG!;else badAgainst+=e.xG!;}}
  expect(badXg).toBeLessThan(normalXg*.75);expect(badAgainst).toBeGreaterThan(normalAgainst*1.2);
 },15000);
 it('applies the same penalty after a substitute takes over an unfamiliar position',()=>{
  const c=newCareer('Roles','elite','liverpool',12),plan=nextMatchPlan(c),cb=plan.bench.map(id=>c.players.find(p=>p.id===id)!).find(p=>p.position==='CB')!;
  expect(cb).toBeTruthy();expect(lineupFit(cb,c.formation,9)).toBe(.4);
  const quick=prepareWeek(setMatchPlan(c,{...plan,changes:[{clubId:c.clubId,offId:c.lineup[9],onId:cb.id,minute:45}]}),false),f=quick.pending!.fixtures.find(f=>f.homeId===c.clubId||f.awayId===c.clubId)!;
  const attempts=f.report!.events.filter(e=>e.playerId===cb.id);expect(attempts.every(e=>e.minute>45)).toBe(true);expect(f.report!.performances.find(p=>p.playerId===cb.id)!.minutes).toBe(45);
 });
 it('shows the penalty and effective rating before the manager confirms a selection',()=>{
  const c=newCareer('Roles','elite','liverpool',23),lineup=[...c.lineup];[lineup[2],lineup[9]]=[lineup[9],lineup[2]];const bad={...c,lineup},p=c.players.find(p=>p.id===lineup[9])!;
  render(<FormationPitch career={bad} onChange={()=>{}}/>);expect(screen.getByLabelText(`${p.name} effective positional rating ${Math.round(p.overall*.4)}`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:`Assign ST slot 10: ${p.name}`}));expect(screen.getAllByText(/Out of position/).length).toBeGreaterThan(0);
  expect(autoLineup(c.players,c.clubId,c.formation)).toEqual(c.lineup);
 });
});
