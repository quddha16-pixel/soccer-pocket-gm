# Pocket Football GM

A mobile-first, menu-driven football management game built with React, TypeScript and Vite. Created in the existing `quddha16-pixel/soccer-pocket-gm` repository. No licensed logos, photos, external fonts or player likenesses are used.

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
3. Choose a balanced, attacking or defensive approach on the overview screen. Attacking increases your scoring and conceding rates; defensive reduces both. Neither guarantees a result.
4. Advance Matchweek to simulate all ten fixtures. Review the round's results before continuing. All results update the league table.
5. Complete 38 matchweeks. Finishing 18th–20th ends your career with Game Over. Otherwise, review your final position and start a new challenge. This first version ends after one season, including for surviving clubs.

Careers save automatically in localStorage under `pocket-football-gm-v1`, including your roster, tactics, random seed, results and current week. Continue from the main menu after reloading. New Career requires confirmation before replacing an existing career. Invalid or incompatible saves show an error; starting a new career replaces them. Storage errors are reported; progress in private/restricted storage may last only while the tab remains open.

## Code layout

- `src/models.ts`: typed club, player, fixture, standings and career models.
- `src/data/clubs.ts`: membership, provenance and configurable club parameters.
- `src/data/players.ts`: fictional roster generation, separate from club records. Each club gets 24 players with stable club/slot IDs. A seeded career has reproducible attributes. Replace this generator with an importer returning `Player[]` to use custom rosters.
- `src/simulation/league.ts`: circle-method double round-robin scheduling, table calculations, relegation detection.
- `src/simulation/career.ts`: reputation-based offers, season progression, squad strength and Poisson scoring.
- `src/simulation/random.ts`: seeded pseudo-random generator, permitting reproducible simulations.
- `src/storage.ts`: versioned saves and validation.
- `src/components/`: shared club marks, fixtures and league table.
- `src/App.tsx`, `src/style.css`: career screens, responsive layouts, results dialog and game-over state.
- `src/test/`: fixture invariants, standings/tiebreakers, relegation boundaries, full-season accounting, score distributions, persistence and UI flows.

Scores depend on the best eleven's ratings, fitness and morale, home advantage, tactical approach and randomness. Stronger squads have an advantage without certain wins. Fictional players have ID, name, age, position, overall, potential, weekly wage, contract years, fitness and morale. Their names need not be unique; IDs are unique. Fitness and morale have modest random weekly variation. There are no injuries, substitutions or player development yet. Club budgets are informational; there is no spending system.

Standings use points, goal difference and goals scored. Exact ties use club ID as a deterministic display fallback; this version does not implement the Premier League's further head-to-head/play-off rules. Fixtures are valid competition rounds, not the official calendar or official fixture order.

## GitHub Pages deployment

Vite's base path is `/soccer-pocket-gm/`. `.github/workflows/deploy.yml` installs from the lockfile, runs tests, builds and uploads `dist/`, then deploys using GitHub's Pages actions.

1. In the existing repository's **Settings → Pages**, select **GitHub Actions** as the build source.
2. Push the changes to `work` or `main`, or run **Deploy to GitHub Pages** manually from Actions. Ensure the `github-pages` environment permits the deployment branch.
3. After the workflow succeeds, the site should be available at <https://quddha16-pixel.github.io/soccer-pocket-gm/>.

Both `work` and `main` trigger deployment; whichever deploys most recently becomes the live site. No push or live deployment is performed merely by building locally. CI and the deployed site must be verified in GitHub after pushing. Saves are local to the browser and origin; local development saves do not transfer to GitHub Pages.

## Current scope

One playable Premier League season, reputation/job selection, tactical approach, squad browsing, full-league simulation, standings, results and career-ending relegation. No transfers, negotiations, scouting, academies, lower divisions or advanced finances. No lineup selection or real-world player data. Difficulty uses illustrative ratings and has not undergone extended balance testing.
