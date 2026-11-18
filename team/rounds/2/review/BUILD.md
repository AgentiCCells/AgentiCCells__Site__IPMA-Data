# Round 2 build review

By reviewer.ipma-data@AgentiCCells.dinis, 18 November 2026, about 12:05 to 12:50 UTC. Branch dev at 24e3d74 (4 commits ahead of origin/dev, working tree clean). Local build served from `_site/` on port 8111 (stopped after). `board/HOLD.md` absent. Text CC BY 4.0.

## Verdict: do not release yet

The five designs, the chooser, the designs control, the share cards, S7 and S8 are close to the brief. Every figure I compared with the live files matches, every page fails well when data.promptugal.news is blocked, and the gates pass. Four small changes must be made first (M1 to M4): the skip link cannot be seen on two designs, Glance's sentences stop before the warning ends, the Almanac rounds temperatures while saying "as IPMA gives them", and Glance's main sentence has no age line when the file is old. Re-review only the changed lines.

## Gates (run 12:05 UTC)

| Check | Result |
|---|---|
| `node scripts/build.mjs` | layout applied to 36 pages; behind the scenes: 6 roles, 2 rounds, 10 round files, 22 commits |
| `node scripts/validate.mjs` | OK |
| `node scripts/leak-scan.mjs` | OK (202 files, 256 binary skipped) |
| `node --test tests/*.test.mjs` | 11 pass, 0 fail |
| `node scripts/role-scope.mjs origin/dev HEAD` | OK (4 commits) |
| `node scripts/abp-check.mjs` | OK (6 policies) |

## Pages

| Page | Verdict | Items |
|---|---|---|
| `/d/broadsheet/` | pass with changes | M1, S1 |
| `/d/chart-room/` | pass with changes | M1 |
| `/d/night-desk/` | pass | S5 |
| `/d/almanac/` | pass with changes | M3, S2, S4 |
| `/d/glance/` | pass with changes | M2, M4, S3, S4 |
| `/d/` (chooser) | pass | none |
| Designs control (every page) | pass | none |
| `/` at 390 px (S7) | pass | none |
| `/warnings/` at 390 px (S7) | pass | S6 |
| Share cards (17) | pass | S7 |
| `/behind-the-scenes/` and its pages | pass | note under "could not check" |
| Other main pages (`/forecasts/` to `/use-with-ai/`) | pass (sweep only: disclaimer, scroll, errors, og:image) | none |

Every page, light and dark, 390 and 1366 px (58 loads): the disclaimer "Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC." twice (band and footer) and "This site is not IPMA's and is not official"; no em dash in rendered text; no hype word; no "official" except "not official" (and the reviewer's own policy text quoting the rule); scrollWidth equals the viewport; no console error, page error, failed request or HTTP 400+; no status left loading. On each design, a provenance box (IPMA named, read time, terms) follows every map and table: Broadsheet 4, Chart room 5, Night desk 5, Almanac 4, Glance 3.

## Must fix

**M1. The skip link is invisible when focused on Broadsheet and Chart room** (1.00:1, ink on ink). `body.d-broadsheet a{color:var(--ink)}` (`src/d/broadsheet/broadsheet.css` line 17) and `body.d-chart-room a{color:var(--ink)}` (`src/d/chart-room/chart-room.css` line 16) beat site.css's `.skip{color:var(--accent-ink)}`, and both designs set `--accent` to the ink. Add `body.d-broadsheet a.skip{color:var(--accent-ink)}` and `body.d-chart-room a.skip{color:var(--accent-ink)}` (gives #f4f1ea on #161616, 16:1, and #f3f0e4 on #13324b, 11.6:1). Shot: `shots/broadsheet-skip-focus-1366.jpg`. Owner: developer (instance C).

**M2. Glance's sentences stop before the warning ends.** `warnPart()` in `src/d/glance/glance.js` (lines 33 to 41) follows only one spell after the current one. Live at 12:11 UTC: "Porto: yellow for rough sea until 18:00, then orange until Fri 00:00." but IPMA's file then has yellow rough sea for PTO to Fri 20 Nov 12:00; the same for Viana do Castelo, Braga, Guimarães, Aveiro, Coimbra and Leiria; "Lisboa: ... then orange until Thu 12:00" while yellow follows to Fri 09:00. A reader takes the last "until" as the end. Fix: follow the chain while a spell starts at the previous end (`let c = cur; while ((n = sp.find(w => w.start === c.end))) { out.push(', then ', word(n.level), ` until ${when(n.end, today)}`); c = n; }`), and apply the same loop where no spell is in force yet. Owner: developer (instance D).

**M3. The Almanac rounds temperatures but says "as IPMA gives them".** `src/d/almanac/almanac.js` line 89 rounds `t_min_c` and `t_max_c` (Bragança today 9.8 to 16 shows "10–16°"; Thu 6.5 to 12.1 shows "7–12°"), and the caption at line 84 reads "... by day, as IPMA gives them." Change the caption to "Lowest to highest temperature (°C, rounded to the nearest degree) and chance of rain, by day, from IPMA's file. All 35 places, in tenths, are on the Forecasts page." Owner: developer (instance D).

**M4. Glance's chosen place has no age line above it.** With `read_at` faked 30 h back, the sentence in `#gl-mine` (the first thing on the page) reads as current; the two old lines appear only below it, in the "Five places" list (`shots/glance-old30-390.jpg`). In `places()` in `src/d/glance/glance.js`, change `show` to `put(mine, ageBanner(F.latest, { subject: 'These forecasts', page: IPMA_FC }), W.latest.ok ? ageBanner(W.latest, { subject: 'These warnings', page: IPMA_WARN }) : null, sentence(c, W, 'p'))`. Owner: developer (instance D).

## Should fix (not blocking)

- **S1. Broadsheet headline above its old line.** At 30 h the headline "Orange warnings for rough sea in 7 areas, the first from 18:00 today" stays and the old line comes under it. In `warnings()` in `src/d/broadsheet/broadsheet.js`, when `staleness(D.read_at).level` is `old`, prefix the headline with "From a file read N h ago: ", or move the age line above `#bs-head`. Owner: developer (C).
- **S2. En dash ranges in the Almanac** ("10–16°", "3–5", "16.8–16.9"): `range()` at `src/d/almanac/almanac.js` line 23. Round 1's S6 moved the site to " to "; use `${a} to ${b}${unit}`. Owner: developer (D).
- **S3. Glance without JavaScript** shows "Reading places..." and "Reading IPMA's warnings and forecasts..." for ever under the noscript line (`src/d/glance/index.html` line 22 and the select). Put the placeholder text in by script, or hide it under `<noscript>` styling. Owner: developer (D).
- **S4. "one of five designs"** (Broadsheet, Chart room, Night desk `index.html` line 16 or 17) against "one of six designs" (Almanac, Glance, the chooser, the cards). Pick one wording: "one of six designs of the same data". Owner: writer.
- **S5. "Every figure is IPMA's"** on Night desk and Chart room intros while the MeteoAlarm tile is MeteoAlarm's. Say "Every figure is IPMA's, except the MeteoAlarm tile, which is MeteoAlarm's context". Owner: writer.
- **S6. Deep link `/warnings/#list-h` at 390 px** lands on the heading with the fold closed (known, NOTES-D). The summary is right below, so nothing is hidden; opening the fold when `location.hash` names its heading would be kinder. Owner: developer (D).
- **S7. Behind-the-scenes sub-pages** (commits, rounds, team, round files) all use `behind-the-scenes.png`. Acceptable; one card per sub-page is not needed. No change asked unless the designer wants it.
- **S8. Glance's two provenance boxes** look identical; add the file name ("Forecasts:", "Warnings:") so a reader knows which read time is which. Owner: developer (D).

## Designer rules on the fixed themes (for the designer to decide)

- Broadsheet and Chart room set `data-theme="light"`; Night desk sets `data-theme="dark"`. Their tokens are the same in light and dark system settings (checked computed values and map fills).
- Almanac and Glance are light by overriding tokens on `body` only, with no `data-theme`. In a dark system setting the page looks the same and passes contrast, but `<html>` keeps `color-scheme: dark` and some unused tokens (`--rcm-1`, `--t-1`) take dark values. Proposal: add `data-theme="light"` on `<html>` in `src/d/almanac/index.html` and `src/d/glance/index.html` so all fixed themes work one way.
- Instance C darkened the status words on the light designs (#24663f, #8a4f00, #a3221b); these are text colours, not data colours. I accept them; the designer should confirm section 2 does not fix them.
- Whether a fixed dark design (Night desk) should follow a reader's light setting is a design decision; the brief does not require it.

## Facts checked against the live files

Fetched with curl at 12:07 UTC from https://data.promptugal.news/api/v1/: ipma-warnings (read_at 11:41:54Z), ipma-city-forecasts (11:39:59Z), ipma-observations (11:41:37Z), ipma-fire-risk (11:41:29Z), ipma-sea (11:41:42Z), ipma-uv (11:41:52Z), meteoalarm-pt (11:41:57Z); reads.json for warnings, city forecasts and UV. Pages read 12:08 to 12:12 UTC (Lisbon time equals UTC).

| Design | Sentence or value on the page | Live file | Result |
|---|---|---|---|
| Broadsheet | "Orange warnings for rough sea in 7 areas, the first from 18:00 today" | 7 orange rough-sea spells: VCT, BRG, PTO, AVR, CBR, LRA from 18 Nov 18:00, LSB from 19 Nov 06:00 | match |
| Broadsheet | "... The last of these orange spells ends Fri 20 Nov 00:00" | latest orange end 2026-11-20T00:00:00 | match |
| Broadsheet | "32 ... in 13 of 25 areas (rough sea up to orange in 10 and rain up to yellow in 8). In force now: 13 areas." | 32 rows, 13 areas; rough sea 10 areas, max orange; rain 8 areas, max yellow; 13 areas with start before 12:11 | match |
| Broadsheet | Today in figures: max 25.8 °C Funchal, min 6.5 °C Penhas Douradas, rain 100% in 25 of 35, wind moderate in 34 | same (Funchal class 1, all others class 2) | match |
| Glance | "Lisboa: yellow for rough sea until Thu 06:00, then orange until Thu 12:00; yellow for rain until 18:00. 16 to 21°. Rain 100%." | LSB rough sea yellow to 19 Nov 06:00, orange to 12:00 (then yellow to Fri 09:00); rain yellow to 18:00; 15.9 to 20.9, 100 | values match; stops early (M2) |
| Glance | "Faro: yellow for rough sea until Fri 09:00. 20 to 22°. Rain 100%." | FAR yellow to 20 Nov 09:00; 19.8 to 22.4, 100 | match |
| Glance | "Funchal (Madeira-Costa Sul area): No warning. 19 to 26°. Rain 43%."; Bragança "No warning. 10 to 16°"; Horta "15 to 19°. Rain 59%." | no MCS, BGC or ACE warnings; 19/25.8/43; 9.8/16; 14.9/18.8/59 | match |
| Glance | "Porto: yellow for rough sea until 18:00, then orange until Fri 00:00. 14 to 18°." | PTO yellow to 18:00, orange to Fri 00:00, then yellow to Fri 12:00; 13.7/18.2 | values match; stops early (M2) |
| Chart room | Figueira da Foz, Lisboa, Sines, Faro, three days: total, swell, period, direction, sea temperature; dagger on Sines Thu 10.1/9.9 s | ipma-sea `coasts` | match (total = sea_min..max, swell = waves_min..max) |
| Chart room | Rough-sea warning per day: Lisboa yellow, orange, yellow; Viana orange, orange, yellow | warnings file | match |
| Chart room | 12 strongest winds: Graciosa 43.9 NW ... Angra 25.2 NW; "143 of 227 ... 2 class 0" | observations 11:00 UTC | match |
| Night desk | Warnings "32 ... 13 of 25", last change run 09:43 UTC; Forecasts "36 of 36 ok; 35 of 36 changed"; UV "28 entries", last change 02:28; MeteoAlarm "32 of 58 not expired" | latest.json and reads.json | match |
| Almanac | Warnings table: Lisboa today "Yellow rough sea, rain", Thu "Orange", Fri "Yellow"; Castelo Branco today yellow rain then none | warnings file | match |
| Almanac | Sea: Lisboa 2–4, 3.5–4, 2.5–3.5, 17.5–17.6; Sines; Faro | ipma-sea | match |
| Almanac | Forecast: Bragança 10–16° / 7–12° / 9–13°; Porto 14–18° | 9.8/16, 6.5/12.1, 8.6/12.5; 13.7/18.2 | rounded without saying so (M3) |

No guessed value found. No regional summary or cause is invented in the headline or sentences.

## Failure states (390 px, all five designs, / and /warnings/)

| Test | Result |
|---|---|
| `page.route('**/data.promptugal.news/**', abort)` | Each section: "Could not read IPMA's ... The network request failed. Nothing is shown in its place: this page does not guess", the file and IPMA's page. No map painted, no provenance box, no value. Broadsheet: "No headline today: the warnings file could not be read". Glance: "The places come from the forecast file, which could not be read." Night desk: 7 "could not read" tiles. No page error; only the browser's own blocked-request lines. No overflow. |
| `read_at` faked 5 h back | stale line above the charts: Broadsheet 3, Chart room 4, Night desk 2, Almanac 4, Glance 3, Home 2, Warnings 2; every provenance box stale |
| `read_at` faked 30 h back | old lines in the same places; Broadsheet's headline above its line (S1); Glance's chosen place has none near it (M4) |

## Designs control and chooser

- Reached by Tab after the NAV (15th stop) on /, /warnings/, /d/, Broadsheet, Night desk, Almanac, Glance and /behind-the-scenes/commits/, at 390 and 1366 px. Focus ring 3 px in the design's accent. Enter opens; Tab moves through the six designs and "Compare all six designs"; Escape closes and returns focus to the button; tabbing out closes it. Current design marked with `aria-current="true"` and "(this design)"; on /d/ none is marked. Panel inside the viewport (16 to 374 px at 390).
- Without JavaScript: opens and closes on click, all seven links present; data pages show their noscript line (Glance also keeps its loading text, S3).
- Chooser /d/: six cards, each one link, no live data, passes contrast light and dark, no overflow.

## S7 and S8

- `/` at 390 px: 6,986 px tall (was 11,671). Map, three provenance boxes and MeteoAlarm line visible; the 32-row table is in a closed fold whose summary gives the count; "Skip the map: warnings as a table" opens the fold and moves focus to its heading. All 32 rows present.
- `/warnings/` at 390 px: 5,901 px (was 17,303). Map, four provenance boxes, MeteoAlarm heading and disclaimer visible; two folds (32 warnings with IPMA's text, 32 MeteoAlarm messages), all 64 rows present. Open from 760 px.
- Share cards: all 36 pages have og:image and twitter:image pointing to an existing 1200 x 630 PNG (77 to 135 KB); each top-level page and each design has its own card. Cards checked by eye (home, storm-charles, d-night-desk): the full disclaimer word for word and "Not IPMA's site and not official"; no live figures, no level colours.

## Accessibility and layout

- 390 and 1366 px, light and dark: no horizontal page scroll; wide tables scroll in their own region.
- Contrast (computed WCAG 2, every visible HTML text node, light and dark, 1366 px, all folds opened): no failure on /, /warnings/, /d/, the five designs or /behind-the-scenes/ except M1. SVG map labels not measured here (shared map module, measured in round 1).
- Keyboard: skip link, designs control, map (one tab stop), buttons and scroll regions reached; skip link unreadable on two designs (M1).

## Behind the scenes

36 pages built, 209 distinct internal links across `_site/`, all 200. Team pages for six roles, commits (22, including round 2), rounds/1 and rounds/2 with NOTES-C, NOTES-D and NOTES-behind rendered. Sample of 8 external links: GitHub files and pushed commits 200. Links to the four unpushed commits (24e3d74, 5e5a7c2, 3eaee33, cd191f6) and to new files on `blob/dev` return 404 until the release push. Personal names in `_site/`: only Dinis Cruz (decided in round 1); others by role ("the Minister", "the Prime Minister" on Storm Charles, accepted in round 1).

## What I could not check

- Firefox, Safari, a real screen reader, forced colours.
- The 15 s timeout path and a 404 from the API.
- Almanac print on A4 (developer D reports one page).
- Text in the map SVGs on the designs, and the Night desk tiles' status words in the fake-old run (I counted banners and provenance boxes only).
- The deployed site: local build of 24e3d74 only. External commit links until pushed.

## Screenshots

`shots/` (16 files, JPEG quality 70, each under 200 KB; long pages cut to their top): each design at 390 and 1366 px, the chooser at 390, the designs control open at 390 px dark, Home and Warnings at 390 px (S7), Broadsheet with the skip link focused (M1), Glance with an old file (M4).
