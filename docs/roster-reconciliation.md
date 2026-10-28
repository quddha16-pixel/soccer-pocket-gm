# Pocket Football GM v1.4 — playable custom roster reconciliation

Creator: Quentin Warminsky. Starting season: 2026/27. Reference edition: **FC 27**, following the owner’s correction. Research checked 28 October 2026. Development branch: `work`; `main` is preserved.

## Import result

| Check | Result |
|---|---:|
| Original roster entries | 546 |
| Imported into new careers | 546 |
| Verified FC 27 identities | 543 |
| Official EA FC 27 launch ratings | 523 |
| Supporting FC 27 reference ratings | 20 |
| Total source-verified overall ratings | 543 |
| Clearly provisional overall ratings | 3 |
| Individual attribute profiles | 546 |
| Players with situational traits | 354 |
| No established specialist trait, with explicit rationale | 192 |
| Players aged 16–24 with development profiles | 235 |
| Outstanding identity questions | 0 |

No submitted footballer is replaced by a generated player. Exact Unicode names, intake IDs and custom assignments are reconciled in original submission order. The original text and v1.3 draft remain intact. The separate existing generated free-agent and future youth-intake systems remain in place; those players are not included in the 546 imported squad members.

## Club validation

| Custom club | Original | Playable | Membership |
|---|---:|---:|---|
| EVERTON | 21 | 21 | Exact match |
| ARSENAL | 24 | 24 | Exact match |
| MANCHESTER CITY | 24 | 24 | Exact match |
| LIVERPOOL | 31 | 31 | Exact match |
| CHELSEA | 28 | 28 | Exact match |
| BRIGHTON | 30 | 30 | Exact match |
| TOTTENHAM | 28 | 28 | Exact match |
| MANCHESTER UNITED | 29 | 29 | Exact match |
| BRENTFORD | 29 | 29 | Exact match |
| LEEDS UNITED | 24 | 24 | Exact match |
| NEWCASTLE UNITED | 25 | 25 | Exact match |
| ASTON VILLA | 28 | 28 | Exact match |
| HULL CITY | 33 | 33 | Exact match |
| IPSWICH TOWN | 28 | 28 | Exact match |
| BOURNEMOUTH | 28 | 28 | Exact match |
| FULHAM | 26 | 26 | Exact match |
| CRYSTAL PALACE | 28 | 28 | Exact match |
| NOTTINGHAM FOREST | 24 | 24 | Exact match |
| COVENTRY CITY | 29 | 29 | Exact match |
| SUNDERLAND | 29 | 29 | Exact match |

## Evidence and estimates

The active dataset is `src/data/custom-roster.json`. The individually selected reference facts and review overrides are in `docs/research/fc27-facts.json`. Every player carries dated source URLs, a rating-status label, identity confidence, an assessment and a list of estimated fields. Sources’ real-world teams never control the import assignment. Run `python scripts/build-custom-roster.py` to rebuild deterministically from the committed facts. No random numbers or club-strength templates generate real players’ skills.

EA’s public rating pages describe FC 27 launch player items. These are not promotional Ultimate Team cards. Career Mode potential and alternate positions use explicitly identified secondary references, chiefly individual Futship profiles. Career Mode and launch values can differ; the overall rating uses the official EA value whenever retrieved. Supporting reference ratings are not labelled official EA verification. A few alternate positions use explicitly cited historical FC 26 position references where a current secondary-position page was unavailable; these are not treated as current rating evidence.

The three provisional profiles are:

| Player | OVR | Potential estimate | Basis |
|---|---:|---:|---|
| Max Dowman | 68 | 88 | UEFA identity, senior/academy evidence and documented ball-carrying/technical strengths; limited senior sample |
| Jayden Danns | 64 | 79 | Liverpool and UEFA identity, senior cup goals, injury-disrupted development and clearly historical FC 26 reference |
| Mahdi Nicoll-Jazuli | 59 | 82 | Chelsea/PL identity and academy/senior midfield evidence; limited senior sample |

These are individual game assessments, not verified FC 27 ratings. Their ceilings have wide uncertainty and are not promises. All three appear in new careers. Players requiring a current potential reassessment: Martin Ødegaard, Max Dowman, Luke Chambers, Jayden Danns, Mahdi Nicoll-Jazuli, Michael Svoboda, Noah Okafor, Matt Targett, Calvin Bassey, Kenny Tete, Takehiro Tomiyasu, Frank Onyeka, Aji Alese, Abdoullah Ba.

The goalkeeper distribution, aerial-ability and one-on-one fields are original estimates mapped from the individually referenced keeper skills. Internal trait names and effects are original game mappings from measured strengths and referenced PlayStyles; signature traits use a stronger but bounded situational modifier. A player without a specialist trait still has a unique skill profile.

Starting values, wages and contract lengths are game estimates. Where available, a referenced Career Mode euro valuation/wage is used as a baseline at a fixed **£0.86 per €1 game conversion**, not a claimed current exchange rate or verified real-world salary/market value. Values respond to ability changes, form, age and remaining contract. Preferred foot is left unverified where the retrieved evidence does not establish it. Illustrated faces are stable fictional portraits, not authenticated likenesses.

## Identity checks

The owner confirmed that Newcastle’s Nico González is the Spanish midfielder born 3 January 2002. The short-name profiles identify Gabriel Magalhães, Allan Andrade Elias, Kevin Santos, Alysson Edward, Florentino Luís, Costinha the fullback and Rayan the Brazilian attacker. Other collisions corrected during review include Alisson Becker versus the younger winger, Emiliano Martínez the Argentine goalkeeper versus the Uruguayan midfielder, senior Brentford midfielder Mathias Jensen versus his namesake, and Chelsea’s Reece James versus the older fullback. Submitted display names are preserved.

## Gameplay and save protection

New careers import all 546 players. Existing saves retain their own player snapshots, names, IDs, finances, history and already resolved matches. There is no automatic roster replacement on load. Save key and schema version remain compatible. New portraits use canonical identity seeds; transferring a player does not change their portrait.

The formation system retains its legacy six position groups and adds natural and secondary positions with side-sensitive suitability. New skill profiles feed weighted creation, carrying, defensive pressure and chance conversion. Keeper ability affects saves; fatigue, stamina, morale, form, chemistry, tactics and opponents still matter. Every goal derives from a probabilistic shot event. Watch and quick simulation share the same immutable report. Traits never guarantee goals, saves or wins. Development changes the imported reference calibration through individual skill gains rather than recalculating initial OVR from three arbitrary skills.

Starting custom squads are grandfathered intact. A new custom career’s senior limit is the greater of 25 or its original senior count (Hull: 29). Training history remains unverified, not inferred from nationality; those imported players have an explicit custom-game exemption from the non-homegrown cap until verified. This is a custom-universe rule, not a claim of official Premier League compliance. Legacy careers retain their original 25/17 rules. Free agents and otherwise assessed non-homegrown arrivals still obey the normal checks.

## Validation

75 tests passed, including all original 56 regression tests and 19 new roster/gameplay checks. Legacy transfer/development tests retain a generated-roster fixture to test the prior save schema. New tests independently validate the full custom universe, unique attributes, the identity collisions, all club lineups, actual cash transfers, skill effects, immutable match reports, save storage and three-season world rollover. World-rollover stress testing isolates manager dismissal, which remains covered by the existing relegation tests.

TypeScript and production Vite build passed. Vite reports a large static-data chunk warning (approximately 226 KB gzip for the full JS bundle); this is not a build failure. Mobile browser QA covers 320, 375, 390 and 430 pixel widths, profile attributes, negotiation, match playback and refresh. The release commit and its successful Pages workflow run are reported after publishing.

## Source-access handling

The supplied EA URL now serves FC 27, matching the corrected request. Direct SoFIFA and FIFACM requests returned 403; blocked requests were not repeatedly retried. Direct secondary requests also encountered restrictions, so supported web research and individually retrieved accessible pages were used. No login/access controls were bypassed and no complete vendor database, player imagery, badges or proprietary application code was imported. Selected player references and original game assessments are retained with provenance.
