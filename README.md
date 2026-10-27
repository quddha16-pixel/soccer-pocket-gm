# Pocket Football GM — v1.2

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

The authoritative project-owner-supplied 2026–27 list of 20 clubs lives in the single replaceable file `src/data/clubs.ts`. Players are generated separately in `src/data/players.ts`. Keep existing club/player IDs stable when adapting custom data. Budgets, revenue, wages, ratings, fictional nationalities, training histories and playing styles are game data, not official real-world records.

Each season has 380 fixtures, 38 per club, with one home and one away match against every opponent. Standings sort by points, goal difference and goals scored; exact ties use club ID as a display fallback. Official head-to-head/play-off tiebreakers and the real fixture calendar are not implemented.

Relegation still ends the user’s career. A surviving manager can start the next season. Future seasons reuse the fixed 20-club cohort; this version does not simulate other divisions, real promotion/relegation replacements or claim that future club membership is official. Previous fixture scores remain available through the Fixtures season selector. Current-season detailed reports are retained; old seasons archive compact scores and final user position/points, rather than full replay timelines.

## Play and manage the club

1. Start a career, choose reputation and accept an appropriate offer. Continue restores a saved career or pending matchday.
2. Overview shows actual completed results, goals, W/D/L, form, streaks, club expectations, injury availability, finances and the three most valuable current players.
3. Squad/Tactics provides an editable 4-3-3, 4-4-2 or 4-2-3-1 pitch and the full roster. Tap a starter to replace them; another starter swaps slots. Registration and goalkeeper restrictions apply. Position fit, ability, fitness, morale and chemistry influence strength.
4. Choose Balanced, Attack, Defensive or Feed Your Star. The star gets a larger share of recorded chances and goals, with an efficiency/predictability drawback. Ability, opposition strength and randomness still matter.
5. Advance Matchweek opens the choice of Watch Match or Quick Sim. Both resolve the same engine. Watch can pause/resume, use 1×/2×/4×, switch to text, or skip to full time. Finish the matchweek to commit all ten matches, finances, familiarity and development once. Refresh, skipping and speed changes cannot reroll or duplicate this round.
6. Use the management links on Overview or the desktop sidebar to access Transfers, Staff, Finances and Development.

## Persistent portraits and player profiles

`Player.identity.appearanceSeed` derives deterministically from immutable player ID, independent of club, nationality and career seed. Original local SVG portraits vary skin tone, face shape, hairstyles, hair colors, brows and facial hair. Transfers and season rollovers preserve identity. Portraits appear in the roster, lineup, market, profiles, valuable-player cards, development cards, goal commentary, animation highlights and Man of the Match.

Tap a squad player, transfer card or development card for attributes, potential estimate/confidence, minutes, form, growth history and contract information. Own-player profiles support renewals, transfer listings and paid releases. Released players move to free agents rather than disappearing.

## Chemistry

The optional pitch overlay links relevant neighboring positions: green 70+, yellow 50–69, red below 50. Tapping a player shows partner scores and explanations. The overall label uses Excellent 85–100, Strong 70–84, Developing 50–69, Weak 30–49 and Poor below 30.

Scores use natural positional fit, complementary styles, passing/movement attributes, actual shared starting appearances, familiarity with the tactical approach and the last lineup. Nationality and background do not affect chemistry. Recorded partnership counts are actual matches; an assistant improves tactical-familiarity units, not the match count. Familiarity and pair history persist between seasons. New arrivals do not inherit perfect partnerships and retain only 30% of their prior tactical familiarity.

Chemistry adjusts effective strength by `(score - 60) * 0.045`, a maximum range of -2.7 to +1.8 rating points. It supplements player ability and tactics rather than replacing them. The market previews potential partnerships instead of showing every natural-position player as a perfect tactical fit.

## Development, injuries and coaching

Profiles add finishing, passing, control, tackling, positioning, reflexes, handling and movement. Existing players start with attributes equal to their saved overall, preserving that rating. Overall is recalculated from three position-specific primary skills after development.

Growth is applied only on a committed round, to all clubs. Ages 16–18 have the most opportunity, 19–21 remain strong, 22–24 grow more gradually, 25–30 retain slower improvement and older players decline. Growth uses hidden ceiling, trajectory, individual rate, minutes (90 per recorded starter), performance, opposition and appropriate coaching quality. Bench players receive slower training gains. Rare seeded breakouts can accelerate growth but never exceed potential or attribute bounds. New-roster upside tiers are weighted rather than distributed equally; exceptional ceilings are rare. Historical saves retain their existing potential values.

Development reports show current/season rating change, individual attributes and increases, minutes, form, trend, scouting estimate/confidence and history. Scouts improve confidence over repeated weekly assessments without revealing a precise true ceiling. Potential estimates are used in squad and market displays. Values respond to age, ability, potential, form and contract status, unless a custom roster explicitly fixes a transfer value.

Injuries are resolved at round completion, restrict selection and recover weekly. Doctor quality modestly reduces injury risk and can accelerate recovery; a short recurrence-risk period remains. This is a foundational injury model, not a detailed rehabilitation system. There are no in-match substitutions, cards or suspensions. All starters play 90 simulated minutes. Season rollover ages players, expires contracts, retires players at 40, and supplies modest replacement youth cohorts. No separate academy management interface exists.

## Animated matches

`src/simulation/animation.ts` reconstructs schematic movements from recorded match events and saved starting lineups/formations. SVG rendering uses requestAnimationFrame with 22 selectable colored circles, a contrasting ball and pitch markings. It illustrates link-up passes, runs, dribbling, defensive pressure, shots, recorded saves/goals and transitions between attacking teams. These movements do not create extra goals, assists or official passing statistics. Simultaneous events may share a highlight; commentary preserves every recorded event.

The score, contributions, shots, full-time possession and Man of the Match come from the same immutable report used by Quick Sim. The award can go to either team, including a losing goalkeeper. Playback speed affects intervals only. Rendering stops when paused/unmounted; hiding the tab pauses playback. Reduced-motion users start in text view. Corners/set pieces are not statistical engine events in this core version and are not fabricated.

## Functional core transfers

The same database powers all 20 club squads, initial free agents, releases, contract expirations and new cohorts. Player Market and Free Agents offer search, position/age/value/wage/club/nationality filters, availability, rating and potential sorting, projected partnership fit, scouting and a persistent shortlist.

Negotiation has two stages:

- Club offer: below-demand rejection, a counteroffer band or acceptance. Demand reflects valuation, contract length, star importance, squad depth and seller finances.
- Personal terms: wages, 1–5 contract years and signing bonus. Demands consider ability, age/security, club ambition, league position and competition for higher-potential players. Club agreement alone does not guarantee a signing.

Finalization rechecks ownership, window, registrations, positional cover, budget, cash, weekly wage capacity and conservative squad-cost headroom. It records fees, signing bonuses, agent fees, book value/amortization, seller income/profit and new ownership/contracts. Duplicate completion is rejected. Faces and player IDs persist. Lists and dashboard values derive from the current roster.

Own-player profiles can list players at an asking price. AI clubs can send incoming bids; the user must accept or reject. Accepting a sale uses the same financial/terms/depth checks and repairs the lineup when needed. Transfer Offers contains ongoing negotiations and incoming bids. Transfer History and news include genuine completed AI and user deals.

AI clubs consider weak positions, relative ability, youth upside, affordability and coverage during windows. They can recruit free agents and buy from other AI clubs. Core contracts are renewed or expired at season boundaries; unwanted players enter the free-agent pool. AI also fills staff vacancies and replaces poorly performing managers. There is no claim of a fully calibrated real-world transfer economy.

### Not implemented in the core market

Installments, contingent transfer add-ons, player-plus-cash swaps, loans/loan-to-buy, pre-contract agreements, guaranteed squad-role promises, release clauses, performance bonuses and recruitment from named clubs outside the Premier League are unfinished. There are no nonfunctional controls claiming to offer those deal types. The current market uses immediately payable cash fees and signing bonuses. Future transfer installments display zero because none can be created.

## Staff

Each club has seven primary role slots: Manager, Assistant Manager, Shooting Coach, Dribbling Coach, Defensive Coach, Scout and Team Doctor. Vacancies are explicit. The user’s manager is linked to the career and cannot be duplicated, traded, hired or dismissed through the staff market.

Staff cards show identity, role, age, nationality, rating/specialism, reputation, philosophy, salary and contract. Current Staff, Staff Market, Contracts and Performance support free-agent hiring, compensated recruitment from other clubs, renewals and paid releases. Replacements pay the outgoing termination cost. Staff can reject wages, contract security or club ambition. Affordability and weekly wage capacity are checked. Their salaries are paid through the club accounts. Contract expiry creates vacancies; AI clubs recruit into them.

Assistant quality affects familiarity growth and produces partnership advice; specialists change appropriate skill-training efficiency; scout quality improves potential estimates; doctor quality affects genuine injuries. Appointments affect future rounds only. There is no instant rating increase on hiring. Staff philosophies/specialisms are displayed, while core effects currently use role and overall staff quality. Broader staff-career/retirement modeling remains limited. Scout evaluation is manual through the market; automated discovery campaigns and target-recommendation lists are not implemented.

## Calendar, registration and finances

`src/data/rules.ts` contains configurable season windows. The project-supplied initial windows are summer June 15–September 1, 2026 and winter January 1–February 1, 2027, inclusive. Add explicit future-season entries to `transferWindows`; otherwise year-specific projected dates are used and labeled as projections. Game time starts August 1 and advances a week per fixture round, not the official Premier League calendar.

Maximum senior registration is 25, with at most 17 non-homegrown seniors. U21 exemptions use the season-specific January 1 cutoff (2005 for 2026–27). Homegrown status uses fictional qualifying training years, not nationality. Qualifying young players accumulate training history over registered seasons; mid-season arrivals receive a proportional season credit. This is a season-based history approximation rather than a full training-date ledger. Signings automatically register when eligible; aging out is handled each season. There is no manual registration-list editor. A free agent outside a window can sign only if unattached before the previous applicable deadline. More complex registration exceptions and pre-contract rules remain unfinished.

Finances shows cash, debt, transfer budget, weekly wage capacity, player/staff payroll, spending/income, net spend, sale profit/loss, amortization, bonuses, agent fees, termination costs, paid payroll and future salary commitments. Annual revenue and payroll are allocated over 38 rounds; debt is recorded and repaid from future cash rather than silently erased. Contracts/transfers/staff actually change the accounts.

**SCR limitation:** the 85% baseline is project-supplied. Full official 2026–27 definitions, additional allowance, transition measures and sanction rules have not been independently verified or implemented. This game uses a disclosed conservative model: annual player/head-coach wages, amortization, agent fees and signing bonuses over revenue plus net player-sale profits/losses. Extra allowance defaults to zero. New commitments above the limit are blocked. An end-season excess incurs a configurable game penalty of 10% of excess cost; this is not claimed to be an official sanction. Obsolete PSR is not used as the sole financial system.

## Saves and compatibility

The original localStorage key remains `pocket-football-gm-v1`. Schema version is now **3**. Versions 1 and 2 migrate without changing existing IDs, names, overall/potential ratings, wages, fixtures, scores, tactic, formation or valid lineup. A raw legacy snapshot is retained under a versioned `-backup-v1` or `-backup-v2` key (large backups are losslessly compressed).

Migration adds deterministic identities, attributes, finances, staff, registration and free agents. Historical reports can establish actual 90-minute appearances, form and partnership counts. Old matches lacking reports have no invented contributions or tactical familiarity. Historical reports refer to immutable player IDs and snapshot clubs, so a later transfer does not invalidate an earlier match.

Large saves use the internal lossless LZW codec, with an explicit format prefix and Unicode-safe decoding. Small saves remain JSON. Replay clock/speed/pause updates use a tiny `-playback` sidecar linked to the matching seed, season and pending round, avoiding reserializing a whole season every frame. Loading recombines and validates them. Finishing a round replaces the authoritative snapshot and clears replay progress. Storage failure is reported; keep the tab open if storage is unavailable. Careers remain browser/origin-local.

## Architecture and validation

- `src/models.ts`, `worldModels.ts`: typed career, player identity, match, contract, finance and staff state.
- `src/data/`: replaceable clubs, player generation and season rules.
- `src/simulation/identity.ts`, `chemistry.ts`, `development.ts`: deterministic appearance, relationships and skill progression.
- `src/simulation/economy.ts`, `recruitment.ts`, `staff.ts`, `world.ts`, `worldTick.ts`: negotiations, registration, club accounts, staff, AI and season rollover.
- `src/simulation/career.ts`, `match.ts`, `scoring.ts`, `league.ts`, `animation.ts`: authoritative progression and its visual reconstruction.
- `src/storage.ts`, `simulation/codec.ts`: migration, validation, compression and playback persistence.
- `src/components/`: existing shared components plus portraits/profiles, development, recruitment, staff, finances and animated match viewer.
- `src/test/`: existing fixture/standings/relegation tests plus identities, chemistry, progression/coaching/doctor effects, transfer/contract outcomes, staff compensation, AI, registration/windows, migration, save compression, animation and UI flows.

Validation includes three full simulated seasons of ownership/finances/registration and a separate 20-year individual-development stress test. This does **not** establish that complete 20-season careers and all market behaviors have undergone extended balance testing. Long-term tuning remains ongoing.

## GitHub Pages

Vite keeps `/soccer-pocket-gm/`. The existing deployment workflow and environment rules remain unchanged. Pushes to `work` or `main` run `npm ci`, tests, build and Pages deployment. Development uses `work`; no force-push or overwrite of `main` is required.

In repository Settings → Pages, the build source must be GitHub Actions and the `github-pages` environment must permit `work`. After a successful workflow, verify <https://quddha16-pixel.github.io/soccer-pocket-gm/>. A successful local build is not proof of a live deployment. Runtime network policy may prevent direct live-site verification even if the workflow succeeds.
