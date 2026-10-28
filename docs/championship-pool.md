# Championship pool — v1.5

Implemented for Quentin Warminsky’s custom 2026/27 universe, checked 28 October 2026. The original 20 clubs and all 546 starting-player snapshots remain unchanged.

## Rules and playable integration

On **Begin next season**, positions 18–20 leave the Premier League. Three distinct clubs are drawn uniformly without replacement from the pre-existing 24-club pool, using a career/season seed. Reloading does not reroll the draw. Relegated clubs enter the pool after the draw, allowing a return in a later year. The league stays at 20 clubs and the pool at 24.

Each career stores its own membership; global starting clubs are immutable. New fixtures contain 380 matches, 19 home and 19 away per club. Table, simulation, match reports, market filters, revenue, AI recruitment and save validation use current membership. League → EFL pool shows eligible clubs and the most recent movement. Archived fixtures retain their actual clubs and results.

First promotion initializes the club’s real reference squad, seven staff roles, financial accounts and eligible registration. Original custom players already belonging to another club are excluded. Existing player identity always wins over a reference roster; transferred, released and retired players are never cloned or reclaimed. Returning clubs keep their existing players, accounts, registrations and transfer history rather than receiving a fresh initial roster.

The current manager-dismissal rule remains: relegation ends the user’s career. A surviving manager can continue with the changing league. Championship fixtures, playoffs and a playable lower division are outside this implementation. Off-league clubs retain accounts and participate in annual aging, contracts and the existing future youth-intake system; no Championship weekly revenue, payroll, match statistics or performance development are invented. Their players can be bought after the club has first entered the playable career.

## Squad research and reconciliation

**664 real pool profiles**, 664 unique detailed attribute profiles, 337 with specialist traits, and **1,210 distinct canonical identities** across the pool plus the original 546. All 24 first-entry squads have at least 16 outfield players and two goalkeepers. Only the three selected squads are instantiated at each initial promotion. The other source squads remain staged in the pool; they are not free agents.

Club membership references: [EFL Championship](https://www.efl.com/competitions/efl-championship/) and [2026/27 Championship guide](https://www.paramountplus.com/sneak-peak/how-to-watch-efl-championship/). This is a custom game pool, not a claim about future real-world promotion results.

Selected, dated EA FC 27 team-reference facts are recorded per player in `docs/research/championship-facts.json`, including source URL, canonical identity, date of birth, nationality, natural positions, overall, preferred foot, six summary skills and PlayStyle names. No photos, badges, scouting prose or vendor descriptions are bundled. Source-field lists distinguish those facts from estimates.

**All detailed attributes, potential ceilings, development settings, contracts, values and wages are game estimates.** Detailed attributes are deterministic assessments derived from each player’s sourced summary skills, age, natural role and referenced specialist styles; they are not claimed as verified EA subattributes or individually scouted performance statistics. Goalkeeper summary categories are interpreted as diving/handling/kicking/reflexes/speed/positioning. No random rating numbers or club-strength templates are used. The player profile’s evidence disclosure explicitly labels estimated details even when its starting overall is sourced.

Five source-squad identities were excluded to honor custom ownership: Zian Flemming (Ipswich), Femi Azeez (Brighton), Taylor Harwood-Bellis (Aston Villa), Sorba Thomas (Hull), and El Hadji Malick Diouf (Brentford). Their existing custom records are preserved.

| Pool club | Unique incoming players |
| --- | ---: |
| Birmingham City | 27 |
| Blackburn Rovers | 30 |
| Bolton | 27 |
| Bristol City | 27 |
| Burnley | 32 |
| Cardiff City | 26 |
| Charlton Ath | 31 |
| Derby County | 27 |
| Lincoln City | 26 |
| Middlesbrough | 28 |
| Millwall | 30 |
| Norwich | 34 |
| Portsmouth | 34 |
| Preston | 22 |
| QPR | 28 |
| Sheffield Utd | 25 |
| Southampton | 29 |
| Stoke City | 25 |
| Swansea City | 24 |
| Watford | 24 |
| West Brom | 23 |
| West Ham | 25 |
| Wolves | 30 |
| Wrexham | 30 |
| **Total** | **664** |

Rebuild with `python scripts/build-championship-pool.py`. The builder validates canonical uniqueness against the original database and minimum researched squad depth. Original custom roster source, research and v1.4 reconciliation remain separate historical records.

## Save and registration protection

Existing schema-v3 saves lacking membership lists use the original 20-club league and initial pool until rollover. Their current season, players, fixtures, contracts and pending matches are not replaced. Existing v1/v2 migration remains supported. New lists must be complete, unique, disjoint and contain known clubs; corrupt lists are rejected.

New real squads use the existing custom-game exemption for unverified homegrown training history, and grandfather their initial senior count above 25 where necessary. This is disclosed custom-universe behavior, not verified regulatory homegrown compliance. Legacy squads retain their previous registration rules. Pool players entering later seasons age from the reference date; normal retirement and future youth replenishment remain in force.

## Validation

91 tests pass, including 16 promotion/catalog/UI tests. Coverage includes exact bottom-three movement, deterministic unique draws, full fixture generation, finance/staff/registration initialization, original player preservation, legacy and new saves, corrupt membership rejection, returning-club persistence, real transfers, career isolation, six successive season changes and current/archived league UI. Three full simulated seasons and existing gameplay/transfer/development regressions also pass.

Production TypeScript/Vite build passes. Vite continues to report its advisory warning for the single data-heavy JavaScript chunk (approximately 323 KB gzip); it is not a build failure.

Optional browser checks: `scripts/mobile-qa.cjs` exercises the existing game flows; `scripts/promotion-qa.cjs` exercises the pool, actual Begin next season action, changed table, archived results and save refresh at 320, 375, 390 and 430 pixels. Both use isolated disposable saves against the Vite server. Screenshots are written to `/tmp/pocket-gm-mobile-qa` and `/tmp/pocket-gm-promotion-qa`. These are Chromium mobile-emulation checks, not physical iPhone/Safari tests.
