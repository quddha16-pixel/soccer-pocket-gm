# Pocket Football GM — v1.8

Created By: Quentin Warminsky. A mobile-first football management game built with React, TypeScript and Vite in the existing `quddha16-pixel/soccer-pocket-gm` repository. No licensed club marks, photos, external portrait services or external fonts are used.

## Run, test and build

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the Vite URL including `/soccer-pocket-gm/`. If the default npm cache is not writable, use `npm ci --cache /tmp/pocket-gm-npm-cache`. Tests use Vitest, jsdom and React Testing Library. Build runs TypeScript checking and produces `dist/`.

## Club data and simulation scope

The authoritative project-owner-supplied 2026–27 list of 20 clubs lives in the single replaceable file `src/data/clubs.ts`. New careers import the exact 546-player custom database from `src/data/custom-roster.json` through `src/data/playerProfiles.ts`, plus a separate 50-player real free-agent pool. Existing saves keep their own rosters. `src/data/players.ts` remains available for legacy regression fixtures; it no longer supplies new starting squads. Budgets, revenue, valuations, wages, contracts and original trait effects are game estimates. Each real player separately identifies sourced and estimated fields.

Each season has 380 fixtures, 38 per club, with one home and one away match against every opponent. Standings sort by points, goal difference and goals scored; exact ties use club ID as a display fallback. Official head-to-head/play-off tiebreakers and the real fixture calendar are not implemented.

Relegation still ends the user’s career. A surviving manager can start the next season. At each surviving manager’s season rollover, the bottom three clubs enter a 24-club Championship pool and three distinct clubs are randomly drawn from the existing pool to replace them. A seeded draw survives reloads; newly relegated clubs cannot return in the same draw. Membership belongs to each save. This is a custom promotion rule; Championship fixtures and playoffs are not simulated. Previous fixture scores remain available through the Fixtures season selector. Current-season detailed reports are retained; old seasons archive compact scores and final user position/points, rather than full replay timelines.

## Play and manage the club

1. Start a career, choose reputation and one of three managerial specialties, then browse all 20 clubs. Unknown coaches receive six highlighted offers; Established and Elite coaches can choose any club, including smaller ones. Continue restores a saved career or pending matchday.
2. **Home** shows your club, league position, points, recent form, next opponent and **Play Next Match**. Detailed season metrics and squad leaders are a secondary view.
3. **Squad** contains Lineup, Players and Progress. Choose 4-3-3, 4-4-2 or 4-2-3-1; tap a starter, choose a replacement and confirm. Selecting another starter swaps slots. Toggle chemistry or open a complete profile. Match approach remains a separate screen.
4. **Market** contains player/free-agent search, negotiations, incoming offers, history and shortlist. Search/filter opens a sheet; contract and scouting details expand on each card. **Club** links to Staff & contracts, Finances and performance. **League** contains Table, Fixtures, Stats, EFL pool, Awards and Records, including previous-season scores, head coaches and promotion/relegation changes.
5. Choose Balanced, Attack, Defensive or Feed Your Star. Ability, opposition, fitness, morale and chemistry still affect strength; no approach guarantees success.
6. Play Next Match opens **Watch Match** or **Quick Sim**. Both resolve the same engine. Watch can pause/resume, use 1×/2×/4×, switch to text, expand the pitch, or skip to full time. Finish the matchweek to commit all ten matches, finances, familiarity and development once. Refresh, skipping and speed changes cannot reroll or duplicate this round.

Five persistent destinations replace the old navigation: Home, Squad, Market, Club and League. Secondary screens have Back navigation. Roster and fixture browsing and scroll position survive section changes. Search filters, player/staff negotiation fields and profile contract drafts use separate sessionStorage presentation keys, surviving refresh in the same tab. Saved careers remain in localStorage with the same schema and key. Modal sheets support keyboard focus trapping, Escape and focus restoration. Forms support Enter submission. Reduced-motion preferences default match playback to text. Safe-area insets are applied to headers, bottom navigation and sheets.

## Playable custom roster — FC 27

All **546** submitted players across **20** custom clubs are active in new careers. Exact names, stable intake IDs and player-to-club assignments are preserved, including separate Bournemouth entries **Rayan** and **Ben Gannon-Doak**. The owner clarified that the rating reference is **FC 27** and that Newcastle’s Nico González is the Spanish midfielder born 3 January 2002.

**523 official EA FC 27 launch overall ratings, 20 supporting FC 27 reference ratings, and 3 individually assessed provisional ratings** (Max Dowman, Jayden Danns and Mahdi Nicoll-Jazuli). Every player has a distinct attribute profile, actual primary/secondary positions, development settings, an estimated sterling value, contracts and dated source URLs. 354 have situational traits; the other 192 have an explicit rationale for no established specialist trait. Provisional values are labelled in player profiles.

The original source and v1.3 intake are preserved in `docs/custom-roster-submission.txt` and `src/data/custom-roster-draft.json`. The old `customRoster.ts` gate still protects that historical intake; playable import validation is now in `playerProfiles.ts`. The completed, individually selected research facts are in `docs/research/fc27-facts.json`. Rebuild deterministically with `python scripts/build-custom-roster.py`.

See the [full import reconciliation and methodology](docs/roster-reconciliation.md) and [machine-readable club validation](docs/roster-reconciliation.json). These distinguish official references, supporting references, current potential estimates, original trait mappings, keeper-specific estimates and financial assumptions. This is a playable import, not a research-only staging file.

Natural positions retain all 15 detailed codes, mapped to the six legacy engine groups for save compatibility. Side-sensitive formation suitability uses primary and secondary positions. Detailed passing, carrying, defending, finishing and goalkeeper skills influence probabilistic opportunities and conversions. Traits are bounded situational modifiers; no individual trait guarantees an outcome. Imported OVR calibration survives training instead of being flattened to three equal skills.

## Championship promotion pool

`src/data/championship.ts` adds 24 distinct clubs without changing the original starting 20. `src/data/championship-players.json` contains **664 real incoming player profiles**, excluding five identities already assigned to the custom Premier League. New clubs receive these squads, seven staff roles, accounts and registration when first promoted. Returning clubs retain their career players, transfers, finances and history; no roster is reset. Relegated clubs remain in the pool and their players remain available in the market.

Overall, identity, positions, preferred foot, summary skills and referenced PlayStyles come from dated EA team references. Detailed attributes, potential, development, contracts, values and wages are explicitly labelled game estimates. There is no claim that these are fully researched FC 27 subattributes. Rebuild with `python scripts/build-championship-pool.py`; selected facts and URLs are in `docs/research/championship-facts.json`. See [pool reconciliation and scope](docs/championship-pool.md).

Existing saves adopt the pool at their next season rollover without replacing their current players or fixtures. Off-league clubs keep their accounts and squads; annual aging, contracts and existing youth replenishment continue. They do not receive simulated Championship matches, weekly performance development or weekly league revenue/payroll settlements. The existing future youth-intake system remains separate from the real first-entry squads.

## v1.8: interactive key moments

Watch Match now pauses **before your team's chance is resolved on screen** for penalties, free kicks, corners, one-on-ones, big play chances and major crosses. Each situation offers three football decisions with short tradeoff descriptions, the player involved and a read on the opposition. Choose an approach, see the outcome, then continue. **Let player decide** delegates a single chance; the pre-match **Interactive key moments** toggle enables uninterrupted watching. Quick Sim, opponent teams and skipped chances use the same assessment and resolution rules automatically.

Decisions use individual finishing, power, composure, control, passing, crossing, aerial ability, specialist traits, goalkeeper quality/movement, defensive pressure, fatigue and positional fit. Deliveries or dribbles can fail before a shot, passing options can produce a teammate's goal, and penalties are not constrained by the open-play conversion cap. There is no guaranteed scoring option. Only the current chance changes: past events, unrelated chances and the other fixtures retain their outcomes. Substitutions update future opportunities without erasing completed decisions.

**Substitution access:** while watching, tap the sticky **Substitutions** button below the playback controls, select **Player off** and **Player on**, then **Confirm substitution**. **Done** returns to the paused pitch; press **Resume**. At minute 0, **Confirm lineup change** updates the starting XI without using a substitution. Clear future substitution plans if a desired bench player is reserved for a later change. For Quick Sim, set the bench and schedule changes under **Set your subs** before kickoff.

Waiting choices and result panels survive refresh, with a locked selection that prevents trying different options on the same chance. Goal, assist, shot, save, appearance and award records use the final resolved event. Existing saves and historical reports remain compatible. See [v1.8 implementation and validation](docs/v1.8-release.md).

## v1.7: competitive transfers, substitutions and positional discipline

Clubs now make sporting decisions before agreeing sales: key-player importance, fit/registered replacements, rivals, contract length, financial pressure, deadline timing and departures in the current window. **Not for sale means the club can refuse any fee.** Negotiator benefits cannot bypass the veto. Agreements expire after two matchweeks and are checked again before completion. AI clubs use the same seller rules, shop for weak positions each transfer-window week and reject inflated user listings against their own valuation. The current market implements permanent transfers; a separate loan-contract system is not included.

**Matchday → Set your subs** lets you choose up to nine substitutes and schedule five changes across three windows, plus half-time. Plans apply to Watch Match and Quick Sim. **Make a substitution** pauses live playback and changes personnel from the next minute; completed events and the other nine fixtures stay intact. Future instructions can be cancelled. AI teams also use their benches. Actual minutes feed into development, fatigue, ratings, overlapping chemistry, appearances and goalkeeper records. Unused bench players receive no match appearance. Plans reset after a completed matchweek.

Primary positions retain 100% effectiveness and listed secondary positions 98%. Related roles retain 88%, unfamiliar roles within a position group 72%, unfamiliar attacking/midfield roles 60%, unrelated defensive/attacking roles 40%. Legacy coarse positions use conservative corresponding penalties. Attacking, creation and defending use the **occupied slot**, multiplied by role familiarity, so a striker placed at centre-back contributes as a centre-back with a substantial penalty. Pitch badges show effective positional ratings; profiles retain underlying ability. Substitutions use exactly the same fit rules.

Saves and custom roster files remain intact. Existing completed results are retained. Older pending matches keep the watched prefix when a live substitution is made. See [v1.7 implementation and validation](docs/v1.7-release.md).

## v1.6: specialties, contracts, colors, awards and records

New career creation offers **Developer**, **Negotiator** and **Football genius**. Developer multiplies your club’s positive attribute growth by 1.2 before existing caps. Negotiator reduces buying asks by 10%, base wage demands by 12%, the extra star ambition premium, signing bonuses and renewal demands. Registration, cash, wages, squad costs and positional cover still apply; repeated renewals cannot compound discounts below their reference wage. Football genius receives neither bonus and instead unlocks Positional mastery, Coordinated counterpress and Disguised transitions in Match approach. These change actual chance/defensive probabilities and fitness costs. They never guarantee a result. Existing careers with no chosen specialty remain neutral; temporary AI negotiation contexts cannot borrow the user’s perks.

All 20 starting clubs are shown in a compact contract grid. Available clubs have a highlighted border and active Accept offer button; locked clubs remain named and visible. Established and Elite users have unrestricted club choice. Club reputation and expectations continue to affect the challenge.

All 44 club home palettes now use recognizable real-world primary/secondary colors. Original crests, club headers and managed-club accents use the palette; text accents are lightened for dark-mode readability. Animated player numbers switch ink colors, with contrast separation when two home palettes clash. These are game sRGB choices rather than licensed brand specifications. Colors and research links live in `src/data/clubThemes.ts`.

The 20 researched head-coach names are in `docs/research/managers-2026.json` and appear in new-career staff roles, including the selected club. Your entered name remains your career identity. League → Table → Head coaches lists the current 20 names. Staff ages, salaries, ratings and contracts remain estimates. AI replacements clear the original reference label. Existing staff histories are preserved.

The new **50 real free agents** have dated identity and reported availability references. One selected FC 27 profile is source-rated; **49 ratings and detailed profiles are explicitly provisional game assessments**. No generic random-player replacement is used in new careers. An older active save can explicitly add the pool through Market; existing ownership, retired records, IDs and contracts win over the reference snapshot. See [v1.6 research and validation](docs/v1.6-release.md) for the full roster, methodology and excluded outdated candidates.

At season end, the game presents Ballon d’Or, Player of the Season, Golden Boot, Playmaker, Golden Glove, Yashin, Kopa and Chance Creator awards. These are **in-game honors for the simulated league**, not real worldwide voting or unplayed international competitions. Selection uses committed performances and meaningful positional contributions rather than player OVR or fame. Counting awards share ties. Reviews and awards persist at rollover.

League → Records includes season/all-time goals, assists, saves, chances created, appearances, shots, tackles, goalkeeper clean sheets and Player of the Match awards; individual best matches; club win/unbeaten streaks, highest team score, largest winning margin and season points. Chance creation counts a recorded pass leading to a shot, including assists. Player profiles show recorded career totals. Team streaks can span consecutive seasons; relegation interrupts them. Older score-only archives support team records but cannot recreate discarded individual contributions. Coverage is displayed explicitly.

## Persistent portraits and player profiles

`Player.identity.appearanceSeed` derives deterministically from canonical identity for new real players and immutable player ID for legacy players, independent of current club and career seed. These are fictional illustrated portraits, not verified likenesses. Original local SVG portraits vary skin tone, face shape, hairstyles, hair colors, brows and facial hair. Transfers and season rollovers preserve identity. Portraits appear in the roster, lineup, market, profiles, valuable-player cards, development cards, goal commentary, animation highlights and Man of the Match.

Tap a squad player, transfer card or development card for attributes, potential estimate/confidence, minutes, form, growth history and contract information. Own-player profiles support renewals, transfer listings and paid releases. Released players move to free agents rather than disappearing.

## Chemistry

The optional pitch overlay links relevant neighboring positions: green 70+, yellow 50–69, red below 50. Tapping a player shows partner scores and explanations. The overall label uses Excellent 85–100, Strong 70–84, Developing 50–69, Weak 30–49 and Poor below 30.

Scores use natural positional fit, complementary styles, passing/movement attributes, actual shared starting appearances, familiarity with the tactical approach and the last lineup. Nationality and background do not affect chemistry. Recorded partnership counts are actual matches; an assistant improves tactical-familiarity units, not the match count. Familiarity and pair history persist between seasons. New arrivals do not inherit perfect partnerships and retain only 30% of their prior tactical familiarity.

Chemistry adjusts effective strength by `(score - 60) * 0.045`, a maximum range of -2.7 to +1.8 rating points. It supplements player ability and tactics rather than replacing them. The market previews potential partnerships instead of showing every natural-position player as a perfect tactical fit.

## Development, injuries and coaching

Profiles add finishing, passing, control, tackling, positioning, reflexes, handling and movement. Existing players start with attributes equal to their saved overall, preserving that rating. Overall is recalculated from three position-specific primary skills after development.

Growth is applied only on a committed round, to all clubs. Ages 16–18 have the most opportunity, 19–21 remain strong, 22–24 grow more gradually, 25–30 retain slower improvement and older players decline. Growth uses hidden ceiling, trajectory, individual rate, actual minutes played (including substitutions), performance, opposition and appropriate coaching quality. Bench players receive slower training gains. Rare seeded breakouts can accelerate growth but never exceed potential or attribute bounds. New-roster upside tiers are weighted rather than distributed equally; exceptional ceilings are rare. Historical saves retain their existing potential values.

Development reports show current/season rating change, individual attributes and increases, minutes, form, trend, scouting estimate/confidence and history. Scouts improve confidence over repeated weekly assessments without revealing a precise true ceiling. Potential estimates are used in squad and market displays. Values respond to age, ability, potential, form and contract status, unless a custom roster explicitly fixes a transfer value.

Injuries are resolved at round completion, restrict selection and recover weekly. Doctor quality modestly reduces injury risk and can accelerate recovery; a short recurrence-risk period remains. This is a foundational injury model, not a detailed rehabilitation system. Planned and live substitutions record actual minutes, fatigue, positional fit and overlapping chemistry. Cards and suspensions are not implemented. Season rollover ages players, expires contracts, retires players at 40, and supplies modest replacement youth cohorts. No separate academy management interface exists.

## Animated matches

`src/simulation/animation.ts` reconstructs schematic movements from recorded match events, saved lineups/formations and the substitution timeline. SVG rendering uses requestAnimationFrame with 22 selectable colored circles, a contrasting ball and pitch markings. It illustrates link-up passes, runs, dribbling, defensive pressure, shots, recorded saves/goals and transitions between attacking teams. These movements do not create extra goals, assists or official passing statistics. Simultaneous events may share a highlight; commentary preserves every recorded event.

The score, contributions, shots, full-time possession and Man of the Match come from the same report used by Quick Sim. Live substitutions preserve watched events and update only the remaining play. The award can go to either team, including a losing goalkeeper. Playback speed affects intervals only. Rendering stops when paused/unmounted; hiding the tab pauses playback. Reduced-motion users start in text view. Key set pieces are represented by the generated decision moments; intercepted deliveries record no phantom shot or assist. This remains a compact chance-based match model, not an exhaustive foul/corner/pass log.

## Functional core transfers

The player database powers current and previously active club squads, initial free agents, releases, contract expirations and new cohorts. Promoted clubs join the same transfer and contract systems. Player Market and Free Agents offer search, position/age/value/wage/club/nationality filters, availability, rating and potential sorting, projected partnership fit, scouting and a persistent shortlist.

Negotiation has two stages:

- Club offer: below-demand rejection, a counteroffer band or acceptance. Demand reflects valuation, contract length, star importance, squad depth and seller finances.
- Personal terms: wages, 1–5 contract years and signing bonus. Demands consider ability, age/security, club ambition, league position and competition for higher-potential players. Club agreement alone does not guarantee a signing.

Finalization rechecks ownership, window, registrations, positional cover, budget, cash, weekly wage capacity and conservative squad-cost headroom. It records fees, signing bonuses, agent fees, book value/amortization, seller income/profit and new ownership/contracts. Duplicate completion is rejected. Faces and player IDs persist. Lists and dashboard values derive from the current roster.

Own-player profiles can list players at an asking price. AI clubs can send incoming bids; the user must accept or reject. Accepting a sale uses the same financial/terms/depth checks and repairs the lineup when needed. Transfer Offers contains ongoing negotiations and incoming bids. Transfer History and news include genuine completed AI and user deals.

AI clubs consider weak positions, relative ability, youth upside, affordability and coverage during windows. They can recruit free agents and buy from other AI clubs. Core contracts are renewed or expired at season boundaries; unwanted players enter the free-agent pool. AI also fills staff vacancies and replaces poorly performing managers. There is no claim of a fully calibrated real-world transfer economy.

### Not implemented in the core market

Installments, contingent transfer add-ons, player-plus-cash swaps, loans/loan-to-buy, pre-contract agreements, guaranteed squad-role promises, release clauses, performance bonuses and recruitment from never-promoted pool clubs are unfinished. Previously active relegated clubs remain available in the market. There are no nonfunctional controls claiming to offer those deal types. The current market uses immediately payable cash fees and signing bonuses. Future transfer installments display zero because none can be created.

## Staff

Each club has seven primary role slots: Manager, Assistant Manager, Shooting Coach, Dribbling Coach, Defensive Coach, Scout and Team Doctor. Vacancies are explicit. The selected club’s head coach is linked to the career and cannot be duplicated, traded, hired or dismissed through the staff market.

Staff cards show identity, role, age, nationality, rating/specialism, reputation, philosophy, salary and contract. Current Staff, Staff Market, Contracts and Performance support free-agent hiring, compensated recruitment from other clubs, renewals and paid releases. Replacements pay the outgoing termination cost. Staff can reject wages, contract security or club ambition. Affordability and weekly wage capacity are checked. Their salaries are paid through the club accounts. Contract expiry creates vacancies; AI clubs recruit into them.

Assistant quality affects familiarity growth and produces partnership advice; specialists change appropriate skill-training efficiency; scout quality improves potential estimates; doctor quality affects genuine injuries. Appointments affect future rounds only. There is no instant rating increase on hiring. Staff philosophies/specialisms are displayed, while core effects currently use role and overall staff quality. Broader staff-career/retirement modeling remains limited. Scout evaluation is manual through the market; automated discovery campaigns and target-recommendation lists are not implemented.

## Calendar, registration and finances

`src/data/rules.ts` contains configurable season windows. The project-supplied initial windows are summer June 15–September 1, 2026 and winter January 1–February 1, 2027, inclusive. Add explicit future-season entries to `transferWindows`; otherwise year-specific projected dates are used and labeled as projections. Game time starts August 1 and advances a week per fixture round, not the official Premier League calendar.

Legacy careers retain the maximum of 25 seniors and 17 non-homegrown seniors. New custom careers grandfather each exact starting roster, with a senior cap of at least 25 or its initial senior count if higher (Hull: 29). Imported players with unverified training histories have an explicit custom-game exemption from the non-homegrown cap; they are not falsely labelled homegrown. This is a custom-universe rule rather than official league compliance. U21 exemptions use the season-specific January 1 cutoff (2005 for 2026–27). Verified/legacy qualifying training years are separate from nationality. Qualifying young players accumulate training history over registered seasons; mid-season arrivals receive a proportional season credit. This is a season-based history approximation rather than a full training-date ledger. Signings automatically register when eligible; aging out is handled each season. There is no manual registration-list editor. A free agent outside a window can sign only if unattached before the previous applicable deadline. More complex registration exceptions and pre-contract rules remain unfinished.

Finances shows cash, debt, transfer budget, weekly wage capacity, player/staff payroll, spending/income, net spend, sale profit/loss, amortization, bonuses, agent fees, termination costs, paid payroll and future salary commitments. Annual revenue and payroll are allocated over 38 rounds; debt is recorded and repaid from future cash rather than silently erased. Contracts/transfers/staff actually change the accounts.

**SCR limitation:** the 85% baseline is project-supplied. Full official 2026–27 definitions, additional allowance, transition measures and sanction rules have not been independently verified or implemented. This game uses a disclosed conservative model: annual player/head-coach wages, amortization, agent fees and signing bonuses over revenue plus net player-sale profits/losses. Extra allowance defaults to zero. New commitments above the limit are blocked. An end-season excess incurs a configurable game penalty of 10% of excess cost; this is not claimed to be an official sanction. Obsolete PSR is not used as the sole financial system.

## Saves and compatibility

The original localStorage key remains `pocket-football-gm-v1`. Schema version remains **3**; v1.4 added optional real-player snapshots and explicit custom registration settings, and v1.5 added optional per-career league/pool membership and archived season movements; v1.6 adds optional specialties, archived player reviews/awards and a one-time free-agent import marker. Existing saves are not rewritten with new rosters. Versions 1 and 2 migrate without changing existing IDs, names, overall/potential ratings, wages, fixtures, scores, tactic, formation or valid lineup. A raw legacy snapshot is retained under a versioned `-backup-v1` or `-backup-v2` key (large backups are losslessly compressed).

Migration adds deterministic identities, attributes, finances, staff, registration and free agents. Historical reports can establish actual 90-minute appearances, form and partnership counts. Old matches lacking reports have no invented contributions or tactical familiarity. Historical reports refer to immutable player IDs and snapshot clubs, so a later transfer does not invalidate an earlier match.

Large saves use the internal lossless LZW codec, with an explicit format prefix and Unicode-safe decoding. Small saves remain JSON. Replay clock/speed/pause updates use a tiny `-playback` sidecar linked to the matching seed, season and pending round, avoiding reserializing a whole season every frame. Loading recombines and validates them. Finishing a round replaces the authoritative snapshot and clears replay progress. Storage failure is reported; keep the tab open if storage is unavailable. Careers remain browser/origin-local.

## Architecture and validation

- `src/models.ts`, `worldModels.ts`: typed career, player identity, match, contract, finance and staff state.
- `src/data/`: replaceable clubs, the active 546-player database, sourced profile snapshots, legacy player generation, season rules and the preserved historical intake.
- `src/simulation/identity.ts`, `chemistry.ts`, `development.ts`: deterministic appearance, relationships and skill progression.
- `src/simulation/economy.ts`, `recruitment.ts`, `staff.ts`, `world.ts`, `worldTick.ts`: negotiations, registration, club accounts, staff, AI and season rollover.
- `src/simulation/career.ts`, `match.ts`, `scoring.ts`, `league.ts`, `animation.ts`: authoritative progression and its visual reconstruction.
- `src/storage.ts`, `simulation/codec.ts`: migration, validation, compression and playback persistence.
- `src/components/`: five-section UI, accessible shared modal sheets, portraits/profiles, development, recruitment, staff, finances and animated match viewer.
- `src/uiState.ts`: session-scoped presentation drafts, separate from the career save.
- `src/test/`: existing fixture/standings/relegation tests plus identities, chemistry, progression/coaching/doctor effects, transfer/contract outcomes, staff compensation, AI, registration/windows, migration, save compression, animation and UI flows.

114 tests include exact reconciliation, all club lineups, individual ability/trait effects, source-status honesty, real-player transfers, legacy-save protection and three full simulated seasons of ownership/finances/registration a separate 20-year individual-development stress test, and six season-boundary promotion/save checks. This does **not** establish that complete 20-season careers and all market behaviors have undergone extended balance testing. Long-term tuning remains ongoing.

## Mobile browser QA

`scripts/mobile-qa.cjs` is an optional Playwright browser check against the running Vite dev server. It exercises 320×568, 375×812, 390×844 and 430×932 viewports, all three formations, player overlap, scrolling, long Unicode names, modal dialogs, draft restoration, keyboard signings, compact table width, match controls, results and career refresh. It uses disposable browser storage and saves screenshots under `/tmp/pocket-gm-mobile-qa`.

With Playwright available to Node and its Chromium installed, run:

```sh
npm run dev
# In another terminal:
node scripts/mobile-qa.cjs
```

For external tooling installations, set `PLAYWRIGHT_MODULE` to the Playwright module path and optionally `CHROMIUM_PATH` to a Chromium executable. `BASE_URL` and `QA_ARTIFACTS` override the dev URL and screenshot directory. This script imports Vite development modules to create deterministic disposable fixtures; it is not a production-site test. Browser emulation does not replace physical iPhone/Safari and on-device keyboard testing. All four widths pass for v1.6, including 32-field goalkeeper profiles and U21 negotiations with an oversized custom squad. `scripts/expansion-qa.cjs` additionally checks all-club offers, specialty selection, coach names, free agents, themed screens, a full simulated season, awards, archived records and refresh after rollover. See [v1.6 release notes](docs/v1.6-release.md). See [the v1.4 reconciliation](docs/roster-reconciliation.md); [v1.3 QA notes](docs/v1.3-qa.md) remain as historical evidence.

## GitHub Pages

Vite keeps `/soccer-pocket-gm/`. The existing deployment workflow and environment rules remain unchanged. Pushes to `work` or `main` run `npm ci`, tests, build and Pages deployment. Development uses `work`; no force-push or overwrite of `main` is required.

In repository Settings → Pages, the build source must be GitHub Actions and the `github-pages` environment must permit `work`. After a successful workflow, verify <https://quddha16-pixel.github.io/soccer-pocket-gm/>. A successful local build is not proof of a live deployment. Runtime network policy may prevent direct live-site verification even if the workflow succeeds.
