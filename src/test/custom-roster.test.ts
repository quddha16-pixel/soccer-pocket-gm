import {describe,it,expect} from 'vitest';
import source from '../../docs/custom-roster-submission.txt?raw';
import {customRosterDraft,customRosterReadiness,requireResearchedCustomRoster,validateResearchedProfile} from '../data/customRoster';
const expectedCounts:Record<string,number>={everton:21,arsenal:24,city:24,liverpool:31,chelsea:28,brighton:30,tottenham:28,united:29,brentford:29,leeds:24,newcastle:25,villa:28,hull:33,ipswich:28,bournemouth:28,fulham:26,palace:28,forest:24,coventry:29,sunderland:29};
describe('authoritative custom roster intake',()=>{
 it('accounts for every supplied entry and explicit clarification, with exact Unicode names and club assignments',()=>{
 const headings=new Map(customRosterDraft.clubs.map(c=>[c.submittedClub,c]));let club=customRosterDraft.clubs[0];const parsed=new Map<string,string[]>();
 for(const line of source.split('\n').map(s=>s.trim()).filter(Boolean)){const heading=headings.get(line);if(heading){club=heading;parsed.set(club.clubId,[]);}else if(line==='Rayan Ben Gannon-Doak'){parsed.get(club.clubId)!.push('Rayan','Ben Gannon-Doak');}else parsed.get(club.clubId)!.push(line);}
 expect(customRosterDraft.clubs).toHaveLength(20);for(const c of customRosterDraft.clubs){expect(c.players.map(p=>p.displayName)).toEqual(parsed.get(c.clubId));expect(c.players).toHaveLength(expectedCounts[c.clubId]);}
 expect(customRosterDraft.clubs.flatMap(c=>c.players)).toHaveLength(546);
 });
 it('keeps every unresearched profile explicitly unresolved and prevents silent activation',()=>{const status=customRosterReadiness();expect(status.accountedFor).toBe(546);expect(status.verified).toBe(0);expect(status.unresolved).toHaveLength(546);expect(status.ready).toBe(false);expect(status.membershipValid).toBe(true);expect(status.uniqueDraftIds).toBe(true);expect(()=>requireResearchedCustomRoster()).toThrow(/546 profiles/);});
 it('rejects invalid real positions, incomplete attributes and out-of-range ratings instead of fabricating replacements',()=>{const p=structuredClone(customRosterDraft.clubs[0].players[0]);p.overall=120;p.potential=20;p.primaryPosition='not-a-position' as never;const errors=validateResearchedProfile(p);expect(errors).toContain('Primary position is missing or invalid.');expect(errors).toContain('Complete 1–99 attributes required.');expect(errors).toContain('Overall/potential must be coherent and within 1–99.');});
});
