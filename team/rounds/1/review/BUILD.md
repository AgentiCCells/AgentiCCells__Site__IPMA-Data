# Round 1 build review

By reviewer.ipma-data@AgentiCCells.dinis, 18 November 2026, about 11:25 to 11:45 UTC. Branch dev at 7e41cb4 (working tree clean). Text CC BY 4.0.

## Verdict: do not release yet

The build is close. Facts drawn on the data pages match the live files, every data page fails well, the gates pass and nothing is copied from IPMA beyond the six small fixtures. Six changes must be made before release (M1 to M6): a contrast failure in the Storm Charles chart, a false claim that the collector runs hourly, a missing terms line beside the Storm Charles chart, missing stale and old lines on two pages, MeteoAlarm's page labelled as IPMA's in a failure message, and a personal name on Behind the scenes with no consent on record. All are small and belong to this round. Re-review only the changed lines.

## Gates (run 11:25 UTC)

| Check | Result |
|---|---|
| `node scripts/build.mjs` | built 12 pages |
| `node scripts/validate.mjs` | OK |
| `node scripts/leak-scan.mjs` | OK (116 files, 40 binary skipped) |
| `node --test tests/*.test.mjs` | 11 pass, 0 fail |
| `board/HOLD.md` | absent |

## Pages

| Page | Verdict | Problems |
|---|---|---|
| `/` | pass | S5 (rounding not stated) |
| `/warnings/` | pass with changes | M5, S3 |
| `/forecasts/` | pass | S6 |
| `/observations/` | pass with changes | M4 |
| `/fire-risk/` | pass with changes | M4, S2 |
| `/sea/` | pass | S6 |
| `/uv/` | pass | none |
| `/storm-charles/` | fail | M1, M2, M3 |
| `/how-it-works/` | fail | M2, S4 |
| `/use-with-ai/` | pass | none |
| `/d/` | pass | none |
| `/behind-the-scenes/` | fail until decided | M6 |
| `/llms.txt`, `/index.md`, `/warnings/index.md`, `/fire-risk/index.md`, `/storm-charles/index.md` | pass | M2 also applies to `storm-charles/index.md` line 88 |

Every page passed on these checks: the disclaimer "Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC." is in the band and the footer (and in each Markdown twin); "This site is not IPMA's and is not official" in the band; no IPMA logo or look; no ads, payments, analytics or third-party scripts, styles or fonts; no em dash anywhere in `_site/`, `src/` or `team/rounds/1/`; no hype word found; plain British English; no horizontal page scroll at 390 px or 1366 px, light or dark (scrollWidth equals the viewport on all 48 page loads); no console error or page error with the live API; every visible SVG has a name (`aria-label`, `<title>` or `aria-labelledby`); no `<img>` without alt; og:title, og:description, og:image and twitter tags on all 12 pages, og:image `/assets/share/home.png` exists (1200 x 630 PNG).

## Must fix

**M1. Storm Charles chart labels fail contrast** (writer's file; developer flagged it). Measured with computed colours (WCAG 2):
- Light: white "no warning" on `--w-green` #a8d5b5 is **1.63:1** (`src/storm-charles/index.html` lines 63 and 67, class `on-dark`).
- Light: ink #1d2329 "orange" on #d9621a is **4.31:1** at 13 px weight 600 (lines 60, 65, 69): below 4.5:1 for text that size.
- Dark: white "red" on #de3c5c is **4.28:1** (line 61).
- Fix: in the `<style>` block (line 16 onward) add `.lanes .lv-green + text{fill:var(--ink)}` (ink on green is about 10:1 in light and 12:1 on the dark green), and make the level labels large text: change line 59 `<g font-size="13" font-weight="600">` to `<g font-size="19" font-weight="700">` so the 3:1 large-text rule applies (4.31 and 4.28 then pass); check "yellow" still fits its 71-unit bar at 19 px, or move that one label below the bar. Owner: writer.

**M2. "The runs are hourly" is not true at present.** The analyst's notes (data/NOTES.md, "The collector is not running hourly") and reads.json show nine runs since 17 Nov 19:40 with gaps of 3 h 20 min, 3 h 21 min and 7 h 15 min, none at :17. Change:
- `src/how-it-works/index.html` line 82 and `index.md` line 39: "the runs are hourly" to "the source cards say hourly, but on 17 and 18 November reads.json showed gaps of up to 7 hours 15 minutes between runs".
- `src/how-it-works/index.html` line 7 and `index.md` line 3: "PrompTugal.news's hourly collectors" to "PrompTugal.news's collectors".
- `src/how-it-works/index.html` line 42 and `index.md` line 13: "GitHub Actions hourly at 17 past" to "GitHub Actions, scheduled hourly at 17 past".
- `src/storm-charles/index.html` line 150 and `index.md` line 88: "at the last hourly read" to "at the collector's last read".
Owner: writer.

**M3. The Storm Charles chart has no terms beside it.** The brief asks for IPMA named with the read time and the card's terms beside every chart. The figcaption (`src/storm-charles/index.html` line 93) names IPMA and the read times but not the terms. Add: "IPMA's terms: free to copy and use for personal or public use if the use has no profit-making or offensive purpose; always name IPMA as the source." Same sentence under the table in `src/storm-charles/index.md`. Owner: writer.

**M4. Observations and Fire risk show no stale or old line above the chart.** With latest.json's `read_at` faked 5 h and 30 h back, Forecasts, Sea and UV print "These figures were read N h ago ..." above the chart, as the proposal's failure table asks; Home and Warnings print the old-warnings line at 30 h. Observations and Fire risk show the age only inside the provenance box, even at 30 h. Fix: in `src/assets/js/pages/observations.js` and `src/assets/js/pages/fire-risk.js`, after a successful load, insert the same line the Sea page uses when `staleness(read_at).level` is `stale` or `old` (and, for observations, when `hour_utc` is over 3 h old, per the analyst's proposal). Owner: developer.

**M5. MeteoAlarm's failure message calls MeteoAlarm's page IPMA's.** With the API blocked, /warnings/ says "Could not read MeteoAlarm's feed ... See IPMA directly: www.meteoalarm.org/en/live/region/PT". Cause: `failure()` in `src/assets/js/data.js` line 131 hard-codes "See IPMA directly:", and `warnings.js` line 114 passes MeteoAlarm's page. Fix: give `failure()` an optional label (as `provenance()` has `pageLabel`) and pass "See MeteoAlarm directly:" from warnings.js line 114. Owner: developer.

**M6. Behind the scenes names a person.** `src/behind-the-scenes/index.html` line 14: "at Dinis Cruz's word on 18 November 2026". The brief says "Name no person" and CLAUDE.md allows a name only for a person who has agreed to be named. I found no record of consent to be named on the public site. Either record that consent (with the time it was given) in team/rounds/1.md, or change the line to "at the account owner's word". Owner: conductor (decision), then writer.

## Should fix (not blocking)

- **S1. Failure message wording** (`src/assets/js/data.js` lines 129 to 130): it reads "... this page does not guess. The file. See IPMA directly ..." ("The file" is a bare link) and shows the browser's "Failed to fetch". Change to "Open the file to check: <link>." and replace "Failed to fetch" with "the network request failed". Owner: developer.
- **S2. "White lines: district borders"** (`src/assets/js/pages/fire-risk.js` line 54) is wrong in dark mode, where the borders are dark gaps (`--panel`). Say "Gaps between hexagons: district borders, also approximate." Owner: developer.
- **S3. "The black line is now"** (`src/assets/js/pages/warnings.js` line 58) is a light line in dark mode. Say "The line marked now is ..." Owner: developer.
- **S4. "one small script"** (`src/how-it-works/index.html` line 75, `index.md` line 35): the pages load several (data.js, codes.js, map.js and one per page). Say "a few small scripts". Owner: writer.
- **S5. Home forecast rounds** 15.9 to 20.9 °C to "16 to 21 °C" without saying so (Forecasts shows tenths). Add "rounded to the nearest degree" to the caption in `src/assets/js/pages/home.js`, or show tenths. Owner: developer.
- **S6. Ranges with an en dash** ("Total 3–5 m", "9.8–16°") in `src/assets/js/pages/sea.js` line 28 and `forecasts.js` line 35: not banned, but the rest of the site writes "3 to 5 m" and some screen readers drop the dash. Use " to ". Owner: developer.
- **S7. Length at 390 px**: /warnings/ is 17,303 px tall and / is 11,671 px, mostly the stacked tables with IPMA's text. Consider putting the full list in a `<details>` on Home. Owner: designer, round 2.
- **S8.** The share image shortens the disclaimer to "Not a warning service. Follow IPMA and ANEPC." Acceptable for an image; the full wording would be safer. Owner: developer, optional.

## Facts checked against the live files

Files fetched with curl at 11:31 UTC; their `read_at` values: warnings 10:11:42Z, city forecasts 10:09:47Z, observations 10:11:24Z, fire risk 10:11:17Z, sea 10:11:29Z, UV 10:11:39Z, MeteoAlarm 10:11:44Z. Pages read at about 11:32 UTC.

| Check | Result |
|---|---|
| Warnings: Lisboa yellow rough sea 18 Nov 07:19 to 19 Nov 06:00, orange 19 Nov 06:00 to 12:00; Aveiro orange rough sea 18 Nov 18:00 to 20 Nov 00:00; Santarém yellow rain 18 Nov 09:00 to 18:00; Faro yellow rough sea 18 Nov 12:00 to 20 Nov 09:00 | match (map, panel, table, timeline) |
| "In force now: 8 of 25 areas" at 11:31 Lisbon | match (AVR, BRG, CBR, LRA, LSB, PTO, STM, VCT) |
| 32 spells in 13 areas; MeteoAlarm 32 of 58 not expired, onset and issue times UTC, disclaimer and link shown | match |
| Forecasts: Lisboa, Bragança, Horta (all five days: min, max, rain %, weather type, wind) | match; Home rounds (S5) |
| Stations: Bragança, Beja, Amareleja, Flores (Aeródromo), Sagres, Lisboa (Geofísico) (wind_dir_id 0 shown as "no direction") | match; 124 of 227 reporting, 111 with no temperature, range 10.3 to 23.1 °C |
| Fire risk: 278 municipalities class 1 on all three days; per district Lisboa 16, Santarém 21, Viseu 24 | match |
| Sea: Lisboa, Porto, Porto Santo, Horta, Faro. Total = `sea_min_m..sea_max_m`, Swell = `waves_min_m..waves_max_m`, as the analyst's notes say; period min above max marked with a dagger, not averaged | match |
| UV: Faro, Lisboa, Funchal, Horta, Aveiro (two values a day shown, not averaged), 1081525 shown as unnamed | match; bands correct (3.0 and 3.2 Moderate) |
| Storm Charles vs https://promptugal.news/storm/charles/index.md (v0.1.1794, read 11:31 UTC; the page cites v0.1.1793 read 10:55) | all 22 timeline entries present, newest first, times and read times match; the change table's seven IPMA data versions and read times match; the press link with a person's name is replaced by a link to PrompTugal.news's page (accepted: the role is named, the name is not) |
| Storm Charles chart draws only stated times | yes: rain orange 00:00 to 09:00, red 09:00 to 15:00, yellow 15:00 to 18:00; wind not stated before 09:00, orange 09:00 to 15:56; sea not stated before 12:34, orange 12:34 to 21:00, yellow 21:00 to Thu 03:00. The wind end at 15:56 is the start of the periods in the 16:15 data, not a stated end; the chart and text say so, which I accept |
| How it works vs https://data.promptugal.news/llms.txt and ipma-warnings card.json (11:31 UTC) | schedule, terms, cost (0 USD a run, no charge, about 3 minutes), start date 17 Nov, "no person has checked the values" all match; loader limits (4 s, 15 s, 180 min, 1440 min) match data.js; "hourly" fails (M2) |
| Repository: no IPMA data beyond `tests/fixtures/` (six files, 1.4 to 2.4 KB); no geometry; largest non-image file `src/assets/js/map.js` 31.6 KB, code only | pass |
| Personal names in `_site/`, `src/`, `team/rounds/1/` | only "Dinis Cruz" on Behind the scenes (M6); people elsewhere appear by role |

## Failure states (all seven data pages, 390 px)

| Test | Result |
|---|---|
| `page.route('**/data.promptugal.news/**', r => r.abort())` | each chart says "Could not read IPMA's ... Nothing is shown in its place: this page does not guess", with IPMA's page; no value, chart or table drawn; status lines on Home say so; no overflow. M5 and S1 apply. Shots: `shots/fail-abort-*.jpg` |
| 6 s delay | "Still reading ...: data.promptugal.news is slow to answer. Waiting up to 15 seconds." on every chart at 5 s. Shots: `shots/fail-slow-*.jpg` |
| `read_at` 5 h back | provenance box and Home status lines say "stale"; line above the chart on Forecasts, Sea, UV only (M4) |
| `read_at` 30 h back | "old" everywhere in the box; old-warnings line on Home and Warnings; line above the chart on Forecasts, Sea, UV; none on Observations and Fire risk (M4) |
| Guessed values | none found |

## Accessibility and layout

- 390 and 1366 px, light and dark: no horizontal page scroll; wide content (UV grid, tables, Storm Charles chart) scrolls in its own box.
- Keyboard: every page tabs from "Skip to the content" through the header and content with a visible focus ring (3 px `--accent`). The map is one tab stop; arrows move in reading order, Home and End jump, Enter selects, and the detail panel (`aria-live`) follows; focus shows as the selection outline (`--accent`, thicker). Time-window buttons carry `aria-pressed`. Station table headers sort by Enter and set `aria-sort`.
- Contrast: all SVG text on the data pages is 4.5:1 or better on its background in both modes (computed). UV cell text 9.8 to 12.8:1. Storm Charles fails (M1).

## What I could not check

- Firefox, Safari and a real screen reader; `forced-colors` mode.
- The 15 s timeout path (only the 6 s delay), and an HTTP 404 (developer B reports it).
- The Azores time zone of IPMA's warning times (no Azores warning active; analyst open question).
- The deployed site: I reviewed the local build of 7e41cb4 only.
- Keyboard at 390 px (checked at 1366 px only).

## Screenshots

`shots/`: every page at 390 and 1366 px light, and Home, Warnings, Fire risk, UV and Storm Charles in dark, JPEG quality 70, each under 200 KB; long pages are cut to their top part to stay under 200 KB (Home 390 px shows the top 3,058 of 11,671 px). Plus `fail-abort-*` and `fail-slow-*` for the seven data pages at 390 px (first screen).
