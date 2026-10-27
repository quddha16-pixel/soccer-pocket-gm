# Pocket Football GM — v1.1

A mobile-first, menu-driven football management game built with React, TypeScript and Vite. Created in the existing `quddha16-pixel/soccer-pocket-gm` repository. Created By: Quentin Warminsky. Original SVG insignias are used throughout; they are not official club logos. No photos, external fonts or player likenesses are used.

## Premier League club data

The 20 clubs for the 2026–27 season are maintained in the single replaceable file `src/data/clubs.ts`, using the authoritative list provided by the project owner. Club IDs and row order are preserved for compatibility with existing career saves. Fictional players are generated separately in `src/data/players.ts`.

Club strengths, budgets and expectations are gameplay estimates, not official financial or sporting data.

## Run locally

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/soccer-pocket-gm/`.

```sh
npm test
npm run build
npm run preview
```

`npm test` runs Vitest unit and React interaction tests. `npm run build` checks TypeScript and generates `dist/`. If your environment's default npm cache is not writable, use `npm ci --cache /tmp/pocket-gm-npm-cache`.

## Play

1. Start a career, enter a manager name, and choose a reputation. Unknown managers receive survival-club offers; established and elite managers receive progressively stronger offers.
2. Accept one club's offer. Review your squad, board expectation, fixtures and league position.
3. Use Tactics to select balanced, attacking, defensive or **Feed Your Star** and designate a starting attacker. Choose 4-3-3, 4-4-2 or 4-2-3-1. Tap a player on the pitch to replace them; selecting an existing starter swaps their positions. Goalkeepers stay in goal, and duplicate starters are prevented. The complete squad list remains below the pitch.
4. Advance Matchweek opens a pre-match decision screen. Choose **Watch Match** or **Quick Sim**. Watch replays a resolved timeline from kickoff to 90 minutes, with pause/resume and 1×/2×/4× playback. The clock is accelerated (600/300/150ms per simulated minute). Review scores, shots, full-time possession and Man of the Match, then finish the round to commit all ten league results once.
5. Complete 38 matchweeks. Finishing 18th–20th ends your career with Game Over. Otherwise, review your final position and start a new challenge. This first version ends after one season, including for surviving clubs.

Careers save automatically in localStorage under `pocket-football-gm-v1`, including your roster, formation, lineup, star, tactics, random seed, results, pending match timeline, clock, playback speed and current week. Back navigation preserves career and setup state. Leaving a watch pauses progression until you return. Continue from the main menu after reloading. New Career requires confirmation before replacing an existing career. Invalid or incompatible saves show an error; starting a new career replaces them. Storage errors are reported; progress in private/restricted storage may last only while the tab remains open.

Version-1 saves migrate automatically to schema version 2 while retaining their players, completed results and matchweek. A valid 4-3-3 lineup, star and allocated budget are added. Before a migrated career replaces the previous save, the original is retained under `pocket-football-gm-v1-backup-v1`. Historical results are never resimulated: individual contribution tracking starts with the first new matchweek after migration. Old matches have no invented goalscorers or assists.

## Version 1.1 features

- Minimal welcome screen with creator credit and 44px Back navigation.
- Dashboard derived from completed fixtures: position, points, W/D/L, goals, recent opponents/results, streaks, board target, squad leaders and budget allocation.
- Three most valuable players, calculated from ability, age and potential or an explicit custom-roster `transferValue`. Rankings derive from the current roster each render.
- Original vector club identities with varied shapes and local motifs, served without external assets.
- Formation and position-fit influence on strength. Feed Your Star increases the selected starter's share of shot and goal opportunities, with a predictability penalty and quality-dependent benefit.
- One shared match engine for both playback modes. A pending round is resolved and saved once; speed changes do not reroll it. Lineups and tactics lock during that round. Finishing commits results atomically and clears the pending round; repeated completion has no effect.
- Goals, assists, shots, on-target attempts, saves, tackles, possession and contribution-based player ratings. Man of the Match is selected from both teams, regardless of winner.

## Code layout

- `src/models.ts`: typed club, player, fixture, standings and career models.
- `src/data/clubs.ts`: membership, provenance and configurable club parameters.
- `src/data/players.ts`: fictional roster generation, separate from club records. Each club gets 24 players with stable club/slot IDs. A seeded career has reproducible attributes. Replace this generator with an importer returning `Player[]` to use custom rosters.
- `src/simulation/league.ts`: circle-method double round-robin scheduling, table calculations, relegation detection.
- `src/simulation/career.ts`: offers, pending-round resolution and idempotent round completion.
- `src/simulation/scoring.ts`, `match.ts`: shared Poisson scoring, event timelines, performance ratings and Man of the Match.
- `src/simulation/management.ts`: formations, lineup validity/assignment, position fit and valuations.
- `src/simulation/dashboard.ts`: actual season metrics, streaks and individual leaders.
- `src/simulation/random.ts`: seeded pseudo-random generator, permitting reproducible simulations.
- `src/storage.ts`: versioned saves and validation.
- `src/components/`: shared SVG crests, fixtures, league table, dashboard, editable formation pitch and matchday viewer.
- `src/App.tsx`, `src/style.css`: career screens, responsive layouts, results dialog and game-over state.
- `src/test/`: fixture invariants, standings/tiebreakers, relegation boundaries, full-season accounting, score distributions, persistence and UI flows.

Scores depend on the selected eleven's ratings, positional fit, formation, fitness and morale, home advantage, tactical approach and randomness. Stronger squads have an advantage without certain wins. Fictional players have ID, name, age, position, overall, potential, weekly wage, contract years, fitness and morale. Their names need not be unique; IDs are unique. Fitness and morale have modest random weekly variation. There are no injuries, substitutions or player development yet. Club budgets are informational; there is no spending system.

Standings use points, goal difference and goals scored. Exact ties use club ID as a deterministic display fallback; this version does not implement the Premier League's further head-to-head/play-off rules. Fixtures are valid competition rounds, not the official calendar or official fixture order.

## GitHub Pages deployment

Vite's base path is `/soccer-pocket-gm/`. `.github/workflows/deploy.yml` installs from the lockfile, runs tests, builds and uploads `dist/`, then deploys using GitHub's Pages actions.

1. In the existing repository's **Settings → Pages**, select **GitHub Actions** as the build source.
2. Push the changes to `work` or `main`, or run **Deploy to GitHub Pages** manually from Actions. Ensure the `github-pages` environment permits the deployment branch.
3. After the workflow succeeds, the site should be available at <https://quddha16-pixel.github.io/soccer-pocket-gm/>.

Both `work` and `main` trigger deployment; whichever deploys most recently becomes the live site. No push or live deployment is performed merely by building locally. CI and the deployed site must be verified in GitHub after pushing. Saves are local to the browser and origin; local development saves do not transfer to GitHub Pages.

## Current scope

One playable Premier League season, reputation/job selection, tactical approach, squad browsing, full-league simulation, standings, results and career-ending relegation. No transfers, negotiations, scouting, academies, lower divisions or advanced finances. No real-world player data, cards, suspensions, substitutions or injuries. Player contributions cover only matches with version-1.1 reports; legacy totals are labeled accordingly. The match viewer is a text/event replay, not an action game. Difficulty uses illustrative ratings and has not undergone extended balance testing.
