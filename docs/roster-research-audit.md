# Custom roster intake and research audit

The project owner's supplied club assignments are authoritative. The source submission is preserved verbatim in `custom-roster-submission.txt`. Structured records are in `src/data/custom-roster-draft.json`; each record retains its exact Unicode display name, assigned club, a stable draft ID, confidence/status, source list and unresolved notes.

## Current research status

No identities or ratings have been independently verified. Premier League, UEFA, Transfermarkt and FBref access attempts all returned proxy HTTP 403 / CONNECT tunnel failed, with no source content retrieved. These are **access-attempt URLs, not citations supporting player data**. Source references, assessment dates, real identities, positions, attributes and ratings remain empty rather than invented.

The draft is not active in new careers. `requireResearchedCustomRoster()` rejects incomplete data. Activating guessed profiles would violate the requirement to finish research before finalizing ratings. Existing fictional careers and their transactions are unchanged. Every submitted player is explicitly marked unresolved, including widely recognized names, because recognition alone is not a current source audit.

The network-access draft for the requested sources has been saved for environment-settings review/publication. Saving that draft does not enable access in the current runtime. After access is applied, retry the original destinations and record actual source URLs, retrieval dates, identity confidence, position evidence and rating rationales. More source domains may be needed for official club and youth profiles.

## Identity review

The user confirmed that Gabriel, Allan, Kevin, Florentino, Alysson and Costinha are the intended football display names. Preserve them exactly. Their source-backed identities remain unverified; no legal-name expansion or identity guess has been applied.

The user clarified that the merged Bournemouth line represents **two players: Rayan and Ben Gannon-Doak**. The structured dataset records both separately. The original source submission stays verbatim, and the clarification is recorded in the JSON metadata. Bournemouth now contains 28 entries, for 546 total across all clubs.

## Rating methodology required before activation

Use the submitted 1–99 hierarchy, position-relevant weighted attributes and demonstrated recent performance. Keep subjective ratings clearly labeled as estimates; never call them official ratings. A player's rating must not depend on the custom club. Record uncertainty for potential, wages and contracts. Do not infer preferred foot, height, birth date, nationality or injury history from names. All fields must be sourced or explicitly marked unverified/estimated.

Validation currently checks exact membership, Unicode names/order, counts, unique draft IDs, complete accounting and the research activation gate. Real identity uniqueness, real positions, playable ratings, attributes and valid custom starting elevens cannot honestly pass while research is unresolved. Existing gameplay lineup validation remains covered separately.

## Submitted counts

| Custom club | Entries |
|---|---:|
| Everton | 21 |
| Arsenal | 24 |
| Manchester City | 24 |
| Liverpool | 31 |
| Chelsea | 28 |
| Brighton | 30 |
| Tottenham | 28 |
| Manchester United | 29 |
| Brentford | 29 |
| Leeds United | 24 |
| Newcastle United | 25 |
| Aston Villa | 28 |
| Hull City | 33 |
| Ipswich Town | 28 |
| Bournemouth | 28 |
| Fulham | 26 |
| Crystal Palace | 28 |
| Nottingham Forest | 24 |
| Coventry City | 29 |
| Sunderland | 29 |
| **Total** | **546** |

Active real-player imports: **0**. Verified identities: **0**. Entries staged and explicitly unresolved: **546**.
