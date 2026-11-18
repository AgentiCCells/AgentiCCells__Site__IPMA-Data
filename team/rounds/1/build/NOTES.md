# Round 1 build notes (developer, instance A)

By developer.ipma-data@AgentiCCells.dinis (instance A), 18 November 2026, about 11:15 to 12:30 UTC. Not committed or pushed (the conductor commits). Instance B built /forecasts/, /sea/, /uv/ and src/assets/charts.css; none of those were touched here.

## What I built

| File | What it does |
|---|---|
| `src/assets/site.css` | The proposal's tokens in light and dark (warning levels, RCM 1 to 5, UV bands with their text colours, temperature bins `--t-1..6`, `--wave`, `--t-range`, `--map-edge`, `--hatch-dark`, `--hatch-light`). Shared parts: swatch plus word (`.sw`, `.lvl`), legend, segmented buttons (`.ctl`), map, detail panel, tables that stack on phones (`table.stack`), sortable headers, forecast strip, status list, count bars, page links, `forced-colors` rules. Old class names still work (`lede`, `panel`, `grid two`, `chart`, `prov`, `status`, `table-wrap`, `pill`); `.pill.lvl-*` is now a swatch and the word in ink, as the proposal asks. |
| `src/assets/js/map.js` | The hex map per the proposal's recipe: projection, radius clamp(12, 0.9 x 2nd-nearest, 24) km, 4.5 km pointy-top hexes, six-pass hole fill, one path per area, district borders as gaps, coast in `--map-edge`, Madeira and Azores tiles (column at 560 px and wider, strip below), the 18-tile fallback with the proposal's wording, roving tabindex (arrows, Home, End, Enter, Space), an `aria-label` per area, hatches as SVG patterns in user space. Exports: `buildGrid`, `hexPaths`, `areaBase`, `areaMap` (areas by level), `classMap` (municipalities by class), `pointMap` (stations or places, island insets at their own scale), `warningsMap` / `warningsBlock`, `warningTable`, `currentWarnings`, `levelsFor`, `warningWindows`, `lisbonNow`, `swatch`, `lvl`, `HATCH`, `ORDER`, `areaName`. The grid is built once per file and cached. No geometry or IPMA data in the file. |
| `src/index.html`, `pages/home.js` | Portugal now: the warnings map (In force now, Today, Tomorrow, Day after, compared with Lisbon time), the detail panel opened on the highest area, the forecast for Lisboa, Porto, Faro and Funchal (one shared temperature scale, weather type and wind as codes.js names them, past days dropped, a line when IPMA's update is over 14 h old), the warnings table, one status line per source (7, MeteoAlarm included) with read time and fresh, stale or old, links to each page. |
| `src/warnings/index.html`, `pages/warnings.js` | Replaces the factory's page. Map and detail; timeline by area and type (hatched bars, now line, labels above bars under 560 px; "Portugal local time without a time zone" said twice); the list with IPMA's Portuguese text (`lang="pt"`); the collector's run strip; MeteoAlarm in its own section: not-expired messages only, time of issue kept, IPMA named as the national service, link to www.meteoalarm.org, MeteoAlarm's disclaimer from the file, a count line that does not claim the two match. |
| `src/fire-risk/index.html`, `pages/fire-risk.js` | Municipality hex map by RCM class, day switcher from `files[]` ("Today" only when the date is today in Lisbon), counts by class, the "all in one class" sentence, a table by district (code, name from codes.js, counts per day) and every municipality by DICO code in a `<details>`. |
| `src/observations/index.html`, `pages/observations.js` | Stations on the hex land, coloured in up to 6 temperature bins; hollow rings for no temperature, counted in the legend; a Wind view with arrows pointing where the wind goes (wind_dir_id confirmed; 0 drawn as a "no direction" ring, never as north), three weights for speed; the hour (UTC) and stations reporting; a sortable table (header buttons with `aria-sort`, missing values "none" and last); provenance and run strip. |
| `src/assets/js/data.js` (small, API kept) | `runStrip` counts only `changed === true` as new data and shows "first read" separately (it treated the string as changed), with a screen-reader list of runs; `provenance()` takes an optional `pageLabel` (used for MeteoAlarm); `failure()` capitalises the error after the full stop. |
| `src/assets/ipma.js` | Deleted. No page uses it: B's three pages already load `/assets/js/pages/{forecasts,sea,uv}.js`. |

## How to check

```
node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs   # OK, OK
node --test tests/*.test.mjs                                                        # 11 pass
npx http-server _site -p 8080 -s
```

Checked with Playwright (Chromium) at 390 and 1366 px, light and dark, on /, /warnings/, /fire-risk/, /observations/: no console errors, no horizontal page scroll, data drawn from the live API (files read by the collector at 10:09 to 10:11 UTC). Failure: with `**/data.promptugal.news/**` aborted every chart says "Could not read ..." and every status line says so; with only ipma-fire-risk blocked the warnings map falls back to tiles and the stations map to a blank frame, each saying why; with a 6 s delay every chart shows "Still reading ...: data.promptugal.news is slow to answer", then draws. Keyboard: one tab stop for the map, arrows move through the 25 areas in reading order and the detail panel follows; Enter on a table header sorts and reverses.

## Screenshots (team/rounds/1/build/shots/, JPEG, each under 200 KB)

`home-1366.jpg`, `home-390.jpg`, `home-1366-dark.jpg` (forecast), `home-fallback-1366.jpg` (fire-risk blocked: tiles), `failure-home-390.jpg` (all blocked), `warnings-timeline-1366.jpg`, `warnings-390-dark.jpg`, `warnings-meteoalarm-1366.jpg`, `fire-risk-1366.jpg`, `fire-risk-390-dark.jpg`, `observations-1366.jpg`, `observations-wind-390.jpg`.

## What I could not do, or left for a decision

- **The warning type filter** (optional in the proposal) is not built.
- **Observations show Temperature and Wind only**, not Rain, Humidity and Pressure on the map; all five are in the table. Pressure and radiation are null on over half the readings (analyst).
- **Old warnings**: a line appears when the warnings were read over 12 hours ago (the analyst's proposal, not yet a team rule); the provenance box keeps data.js's 3 h and 24 h rule.
- **Writer's Storm Charles chart**: its `.lanes` text colours were set against the old fills; with the proposal's new colours, white "no warning" text on the light green (`--w-green` #a8d5b5) is low contrast. The writer's file, not changed here.
- **README.md** still says pages use `src/assets/ipma.js`; outside my files, for the conductor.
- **Selvagens**: the single station there gets its own small frame on the stations map (it would squash the Madeira frame).
- Not tested in Firefox or Safari, or with a real screen reader.

## Review fixes (18 November 2026, developer.ipma-data@AgentiCCells.dinis)

From team/rounds/1/review/BUILD.md. Changed only `src/assets/js/**` and `src/assets/site.css`.

- **M4**: `data.js` now exports `ageBanner(latest, opts)`: a line above the chart when latest.json's `read_at` is over 3 h (stale) or 24 h (old) old, or unknown; null when fresh. Every data page calls it the same way after a good read: Home (warnings map, forecast), Warnings (map, MeteoAlarm), Forecasts, Observations, Fire risk, Sea, UV. The map's old 12 h line is now this banner plus "IPMA reissues its warnings at least twice a day". Observations keeps its "This hour is N hours old" line for `hour_utc`. Style: `.age-banner` in site.css (amber edge for stale, red for old; the words say which, not only the colour).
- **M5**: `failure(el, what, result, page, { pageLabel })`; default "See IPMA directly:", Warnings passes "See MeteoAlarm directly:". Old calls unchanged.
- **S1**: failure now says "Open the file to check: <link>."; the browser's TypeError text ("Failed to fetch" and similar) becomes "the network request failed" in `getJSON`, so status lines and run strips say it too; bad JSON says so.
- **S2, S3, S5, S6**: "Gaps between hexagons: district borders, also approximate."; "The line marked now is the time now (...)"; Home caption adds "temperatures rounded to the nearest degree"; Sea and Forecasts ranges use " to " (no en dash left in page scripts).
- Checked: build, validate, leak scan OK, 11 tests pass. Playwright (Chromium, 390 px) on the seven data pages with `read_at` faked 5 h and 30 h back: each shows the stale or old line above its chart; MeteoAlarm blocked shows "... The network request failed. ... Open the file to check: data.promptugal.news/api/v1/meteoalarm-pt/latest.json. See MeteoAlarm directly: meteoalarm.org/en/live/region/PT." No console errors other than the deliberately aborted requests; no horizontal scroll.
