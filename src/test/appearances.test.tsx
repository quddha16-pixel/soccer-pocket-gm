import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { customStartingPlayers, startingProfiles } from '../data/playerProfiles';
import { appearanceRecord, appearanceRecords, bodyProportions, playerAppearance } from '../data/appearances';
import { PlayerBody, PlayerBodyGlyph } from '../components/PlayerBody';
import { AppearanceDetails } from '../components/AppearanceDetails';
import { AvatarHead } from '../components/AvatarHead';
import { prepareManualMatch } from '../simulation/manualCareer';
import { newCareer } from '../simulation/career';

const players=customStartingPlayers(),find=(id:string)=>players.find(p=>p.id===`custom-${id}`)!;
describe('researched, persistent player models',()=>{
 it('reconciles every custom identity without changing its club membership',()=>{
  expect(players).toHaveLength(546);expect(Object.keys(appearanceRecords)).toHaveLength(1260);
  for(const p of players){const r=appearanceRecord(p);expect(r?.birthDate).toBe(p.real!.dateOfBirth);expect(p.clubId).toBe(startingProfiles.find(s=>s.draftId===p.id)!.assignedClubId);}
  expect(players.filter(p=>appearanceRecord(p)?.heightCm)).toHaveLength(545);
  expect(players.filter(p=>appearanceRecord(p)?.visual)).toHaveLength(64);
  expect(players.filter(p=>appearanceRecord(p)?.weightKg)).toHaveLength(5);
 });
 it('keeps source evidence and uncertain physical measurements separate',()=>{
  for(const p of players){const r=appearanceRecord(p)!;for(const field of ['heightCm','weightKg'] as const){if(r[field]){expect(r[field]).toBeGreaterThan(field==='heightCm'?140:40);expect(r[field]).toBeLessThan(field==='heightCm'?215:120);expect(r.sources.some(s=>s.fields.includes(field)&&s.url.startsWith('https://'))).toBe(true);}}if(r.visual){expect(r.sources.some(s=>s.fields.includes('skin'))).toBe(true);expect(r.visual.photoDate).toBe('unknown');}}
  expect(appearanceRecord(find('mahdi-nicoll-jazuli'))?.heightCm).toBeUndefined();expect(appearanceRecord(find('mahdi-nicoll-jazuli'))?.measurementNote).toContain('conflict');
 });
 it('uses directly observed skin/hair instead of a random real-player seed',()=>{
  const p=find('jordan-pickford'),a=playerAppearance(p);expect(a.status).toBe('referenced');expect(a.style).toBe('swept');expect(a.hair).toBe('#463229');
  expect(playerAppearance({...p,identity:{...p.identity!,appearanceSeed:999}})).toEqual(a);
  expect(playerAppearance(find('bukayo-saka')).skin).not.toBe(a.skin);
  expect(playerAppearance(find('erling-haaland')).style).toBe('tied');
 });
 it('does not invent skin, hair or measured build for unchecked real identities',()=>{
  const p=find('nico-gonz-lez')??players.find(p=>p.real!.matchedIdentity.includes('Nicolás González'))!;
  expect(p.real!.dateOfBirth).toBe('2002-01-03');expect(playerAppearance(p).status).toBe('unverified');expect(bodyProportions(p).weightKg).toBeUndefined();
  expect(renderToStaticMarkup(<AppearanceDetails player={p}/>)).toContain('Neutral placeholder shown');
 });
 it('refuses a namesake with a conflicting birth date',()=>{
  const p=find('jordan-pickford'),other={...p,real:{...p.real!,dateOfBirth:'2000-01-01'}};
  expect(appearanceRecord(other)).toBeUndefined();expect(playerAppearance(other).status).toBe('unverified');
 });
 it('applies references to older player snapshots through stable IDs',()=>{
  const p=find('jordan-pickford'),old={...p,real:undefined};expect(playerAppearance(old)).toEqual(playerAppearance(p));expect(bodyProportions(old).heightCm).toBe(185);
 });
 it('keeps appearance across transfers and reload while changing the club strip',()=>{
  const p=find('declan-rice'),moved={...JSON.parse(JSON.stringify(p)),clubId:'everton'};
  expect(renderToStaticMarkup(<AvatarHead player={moved}/>)).toBe(renderToStaticMarkup(<AvatarHead player={p}/>));
  expect(renderToStaticMarkup(<PlayerBody player={moved}/>)).toContain('#003399');
  expect(renderToStaticMarkup(<PlayerBody player={p}/>)).toContain('#EF0107');
 });
 it('scales sourced heights and differentiates measured proportions without changing ability',()=>{
  const h=find('erling-haaland'),o=find('martin-degaard');expect(bodyProportions(h).scale).toBeGreaterThan(bodyProportions(o).scale);expect(bodyProportions(h).width).toBeGreaterThan(bodyProportions(o).width);
  const before=JSON.stringify(h);renderToStaticMarkup(<PlayerBody player={h}/>);expect(JSON.stringify(h)).toBe(before);
 });
 it('renders complete bodies for all 22 live players, with a distinct goalkeeper strip',()=>{
  const c=prepareManualMatch(newCareer('Models QA','elite','everton',23),180),before=JSON.stringify(c);
  for(const a of c.pending!.manual!.actors){const p=c.players.find(p=>p.id===a.id)!;const s=renderToStaticMarkup(<svg><PlayerBodyGlyph player={p} kit="#003399" trim="#fff" number={a.slot+1} pose={1}/></svg>);expect(s).toContain('player-body-glyph');expect(s).not.toContain('NaN');if(p.position==='GK')expect(s).toContain('#FFD166');}
  expect(JSON.stringify(c)).toBe(before);
 });
});
