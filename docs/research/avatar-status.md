# Appearance research coverage — 2026-10-28

This is a partial, source-attributed appearance catalogue, not a claim that all player likenesses have been researched. The requested gameplay revision took priority after the first research batch. The original roster and rating datasets have not been edited.

| Dataset | Players | Sourced heights | Inspected portraits | Published weights |
|---|---:|---:|---:|---:|
| Custom Premier League | 546 | 545 | 64 | 5 |
| Real Championship pool | 664 | 0 | 0 | 0 |
| Free agents | 50 | 0 | 0 | 0 |
| Total | 1,260 | 545 | 64 | 5 |

All identities have catalogue entries keyed by canonical ID and birth date, plus stable-ID aliases for older careers. Transfers update kits without changing faces. Unreferenced real players receive a neutral placeholder rather than guessed pigmentation or hair. Future fictional academy players retain persistent seeded appearances.

## Evidence and uncertainty

532 custom heights come from the retained individual supporting research in `fc27-facts.json`. Additional heights were checked against published league, federation, club and supporting player profiles. Conflicting heights are recorded in the individual measurement notes. Mahdi Nicoll-Jazuli remains unmeasured: retrieved profiles disagree between 178, 187 and 190 cm. No height was invented for him.

Published weight references are available here for Pickford, Ødegaard, Tomiyasu, Haaland and Abdoullah Ba. Historic values are explicitly labelled. Haaland's opened Bundesliga profile lists 195 cm / 94 kg; other publications list different masses. A listed weight is not treated as a current weigh-in or verified body composition. Width derived from height/weight is only an artistic interpretation; other builds remain schematic.

64 portraits were inspected directly against identity-matched source images. Each observation records the image URL, checked date, artist-selected skin/hair palette, hair silhouette and facial hair, with medium confidence. Image capture dates are unknown: no claim is made that a haircut is current to 2026. Current EA pages themselves point to some older `FC25` image paths. No ethnicity is inferred from names or nationality. No reference photos, logos or downloaded image assets are bundled or served by the game; all avatars are original vectors.

## Access failures and fallback

The EA portrait host returned HTTP 403 at the first denied batch (Vitor Reis, Ayyoub Bouaddi, Allan and Ryan McAidoo). The bounded concurrent importer stopped that provider immediately: 63 successful references, four in-flight denials, and the remaining requests unattempted. The example denied URL was `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p76624.png?padding=0.7`. No access controls were bypassed and it was not repeatedly retried.

A normal request to the independent supporting portrait endpoint `https://cdn.sofifa.net/players/209/331/26_120.png` also returned HTTP 403; it was not retried. Another Salah reference host, `media.gemini.media`, returned 403 and was stopped. An official Premier League portrait referenced by Brighton's match centre was accessible and supplied Haaland's additional inspected reference. This is not a global GitHub/network failure; repository access remains functional.

Further individual appearance references and most weight/build evidence are still outstanding: 482 custom players and all 714 expansion/free-agent players. The catalogue deliberately exposes this gap instead of claiming complete likeness research. Browser gameplay does not depend on any research host being available.

## Reconciliation

`avatar-reconciliation.csv` contains all 546 custom players, their unchanged custom clubs, measurement coverage and appearance status. `appearance-observations.json` and `appearance-measurements.json` preserve the per-field evidence. `python3 scripts/build-appearances.py` rebuilds the runtime catalogue and reconciliation offline; `--check` verifies both without writing. The Pages workflow performs that check before its complete test/build runs.
