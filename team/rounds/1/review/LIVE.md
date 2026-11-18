# Round 1 live review

By reviewer.ipma-data@AgentiCCells.dinis, 18 November 2026, about 11:49 to 11:58 UTC. Checked the deployed site https://ipma-data.agenticcells.site, not a local build. `/version.json` reads v0.1.3, commit 1e267f1, built 2026-11-18T11:47:28Z. `board/HOLD.md` absent. Text CC BY 4.0.

## Verdict: pass

Every must-fix item M1 to M5 and every should-fix item S1 to S6 is fixed as deployed. M6 is closed by the conductor's decision in `team/rounds/1.md` ("Conductor's decisions": Dinis Cruz is named as the person who instructs the team; Dinis may ask for "the account owner" instead). No new problem found. Nothing needs a change before round 2; the open items (S7, S8, a share card per page) stay in round 2 as planned.

## How it was checked

Playwright (Chromium headless), every page below at 390 px and 1366 px, light and dark (60 page loads), waiting for network idle plus 1.5 s. Listened for console errors, page errors, failed requests and HTTP 400 or above. Text checks on rendered `innerText`; Markdown twins and `llms.txt` with curl. Script kept outside the repository.

## Pages

| Page | Verdict | Notes |
|---|---|---|
| `/` | pass | S5 fixed: caption says "temperatures rounded to the nearest degree" |
| `/warnings/` | pass | M5 and S1 fixed (with the API blocked: "See MeteoAlarm directly: meteoalarm.org/en/live/region/PT", "The network request failed", "Open the file to check: ..."; no "Failed to fetch"); S3 fixed ("The line marked now is the time now") |
| `/forecasts/` | pass | S6 fixed (no en dash range); stale line at 5 h, old line at 30 h |
| `/observations/` | pass | M4 fixed: "These stations' figures were read 5 h ago: stale ..." and "... 30 h ago: old ..." above the chart |
| `/fire-risk/` | pass | M4 fixed (same lines); S2 fixed ("Gaps between hexagons: district borders, also approximate") |
| `/sea/` | pass | S6 fixed: "Total 3 to 5 m" |
| `/uv/` | pass | none |
| `/storm-charles/` | pass | M1 fixed (below); M2 fixed (no "hourly read"; "scheduled hourly, but their run log shows irregular runs"); M3 fixed (IPMA's terms in the figcaption and in `index.md`) |
| `/how-it-works/` | pass | M2 fixed ("scheduled hourly at 17 minutes past (in practice the runs are irregular)"); S4 fixed ("a few small scripts") |
| `/use-with-ai/` | pass | none |
| `/d/` | pass | none |
| `/behind-the-scenes/` | pass | M6 decided by the conductor (above) |
| `/behind-the-scenes/team/conductor/` | pass | none |
| `/behind-the-scenes/commits/` | pass | none |
| `/behind-the-scenes/rounds/1/` | pass | none |
| `/llms.txt`, `/index.md`, `/warnings/index.md`, `/storm-charles/index.md`, `/how-it-works/index.md`, `/behind-the-scenes/index.md` | pass | all 200, `text/plain` or `text/markdown`, each carries the full disclaimer |

## Checks across all pages

| Check | Result |
|---|---|
| HTTP status | 200 on all 15 pages |
| Console errors, page errors, failed requests | none on any of the 60 loads |
| CORS from the live origin | every request to data.promptugal.news answered 200 with `Access-Control-Allow-Origin: *`; data drawn on every data page |
| Horizontal scroll | none: `scrollWidth` equals `clientWidth` at 390 and 1366 px, light and dark, on every page |
| Dark mode | body background rgb(18, 22, 26) dark, rgb(247, 245, 240) light, on every page |
| Disclaimer | "Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC." at least twice (band and footer) on every page; "not IPMA's and is not official" on every page |
| Link preview | og:title, og:description, og:url, og:image, twitter:card on every page; og:image and twitter:image are absolute, `https://ipma-data.agenticcells.site/assets/share/home.png`, which returns 200 `image/png` (54,439 bytes). One image for all pages (per-page cards are round 2) |
| Em dash | none in rendered text on any page |

## M1, Storm Charles label contrast (computed, WCAG 2)

All labels are now 19 px bold (large text, 3:1 needed) and each fits its bar.

| Label | Light | Dark |
|---|---|---|
| orange | 5.71:1 | 7.70:1 |
| red | 7.42:1 | 4.91:1 |
| yellow | 12.88:1 | 13.50:1 |
| no warning | 9.70:1 | 10.55:1 |

## Drawn values against the live JSON

Files fetched at about 11:55 UTC from https://data.promptugal.news/api/v1/.

| Check | Live file (read_at) | Page | Result |
|---|---|---|---|
| Lisboa today: max, min, rain, wind | `ipma-city-forecasts/latest.json` (11:39:59Z): 20.9, 15.9, 100 %, W | /forecasts/: 20.9°, 15.9°, rain 100%, wind W | match |
| Bragança station, 11:00 UTC | `ipma-observations/latest.json` (11:41:37Z): 14.2 °C, 59 %, 16.2 km/h, dir 7, 0 mm, 1011.7 hPa, 819.5 | /observations/ table: 14.2, 59, 16.2, W, 0.0, 1011.7, 819.5; Bragança (Aeródromo) "none" except wind 33.5 W, as the file | match |
| Fire risk classes | `ipma-fire-risk/latest.json` (11:41:29Z): 278 municipalities, class 1 on all three days | /fire-risk/: "All 278 municipalities are in class 1, low, on this day" | match |

## Behind the scenes links

From the four Behind the scenes pages: 126 distinct links, 90 on this site. All 90 return 200 (team pages for six roles, rounds 1 and 2, commits, every round 1 note and every screenshot). A sample of 6 GitHub links (WORKFLOW.md, scopes.json, release.sh, commits 1e267f1, 44ed7f8, 05d287c) return 200.

## Problems

None.

## What I could not check

Firefox, Safari, a real screen reader, forced colours; keyboard was not re-checked on the live site (unchanged since BUILD.md); the 15 s timeout path.

## Screenshots

`live/`: twelve pages at 390 px light (first 2,400 px; not /d/, commits or rounds/1/), the Storm Charles chart at 1366 px dark, and `/warnings/` at 390 px with the API blocked. JPEG quality 70, each under 200 KB, 14 files.
