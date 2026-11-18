# Round 2 build notes: the behind-the-scenes section

By developer.ipma-data@AgentiCCells.dinis, 18 November 2026, round 2. Not committed or pushed (the conductor commits).

## What I built

- `scripts/behind.mjs` (new): a build step that writes the whole of /behind-the-scenes/ at build time from the repository. Adapted from the Marc-Noah cell's generator (AgentiCCells/AgentiCCells__Site__Marc-Noah, `scripts/behind.mjs`, Apache-2.0, same organisation); the file header records this and what changed.
- `src/behind-the-scenes/bts.css` (new): the section's styles, on the tokens in `src/assets/site.css`.
- `src/behind-the-scenes/index.html` (deleted): the interim page; the generator now writes it.

Pages written:

| Page | From |
|---|---|
| /behind-the-scenes/ | What this is, Dinis's words (the "Dinis's words" section of team/WORKFLOW.md, as a quote), the six roles with their objective from ROLE.md, the flow diagram (inline SVG) beside the loop as WORKFLOW.md writes it, the rounds, the 8 latest commits, links to agenticcells.ai, hub.agenticcells.site and the source |
| /behind-the-scenes/team/<role>/ | ROLE.md and POLICY.md rendered, the paths from team/scopes.json, the role's commit count; the policy's JSON block is collapsed in `<details>` |
| /behind-the-scenes/commits/ | `git log`: a bar chart of commits per role (from the `Agent:` trailer; "no trailer" counted apart), then every commit grouped by day (UTC) with time, role, subject and the short hash linking to the commit on GitHub |
| /behind-the-scenes/rounds/<n>/ | team/rounds/<n>.md rendered, then every file under team/rounds/<n>/ by folder (data, design, build, copy, review): Markdown files rendered as their own pages at /behind-the-scenes/rounds/<n>/<path>/, screenshots under 300 KB copied and shown (collapsed), other files (mock-up HTML) linked on GitHub |

Every page carries the layout markers, so scripts/layout.mjs adds the head, header, disclaimer, footer and link preview. The generator writes each page's Markdown twin (index.md) with the page's own text.

## How it works

- A small Markdown converter (headings with ids, lists, tables in a scrolling `.table-wrap`, code, quotes, links). A code span or link that names a file in the repository links to its page here if there is one (round files, ROLE.md, POLICY.md), otherwise to GitHub; a relative link that resolves nowhere is shown as plain text, so no page carries a broken link.
- The flow diagram is the one hand-written part: a seven-step summary of "The loop" in team/WORKFLOW.md (brief, data, design, build and words, review, release, report) with the files each step writes, from WORKFLOW.md and team/scopes.json. The full text of the loop is rendered from WORKFLOW.md beside it. If the loop changes, FLOW in behind.mjs must be edited.
- Em dashes (U+2014) in any file or commit subject read are shown as a spaced hyphen; the build log and the index say how many. There were none.
- If git is missing, the commits page and the index say so and the build goes on; on a shallow clone they say only the recent commits were available.

## Checks

`node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs`: OK, OK, OK. Playwright at 390 and 1366 px on the index, commits, a role page, round 1 and three round files: no horizontal scroll, no console errors, no failed requests.

## Limits

- Commit subjects and round files are shown as written: a hype word or a personal name in one would fail the validator or need the reviewer; the generator does not rewrite them (only em dashes). No author names or emails are read.
- Round 1's screenshots (about 6 MB in all, 38 files plus the reviewer's) are copied into _site/; they load lazily inside a collapsed `<details>`.
- Alt text for screenshots is made from the file name (page, width, dark theme), not from what the picture shows.
- The `Agent:` trailer is self-asserted (POLICY.md gap G2); the counts show what commits claim.
