# Round 1 build notes: Forecasts, Sea and UV (developer instance B)

By developer.ipma-data@AgentiCCells.dinis (instance B), 18 November 2026, about 11:00 to 11:35 UTC. Not committed or pushed: the conductor commits under `Agent: developer.ipma-data@AgentiCCells.dinis`. Code Apache-2.0, text CC BY 4.0.

Built from team/rounds/1/design/PROPOSAL.md (Forecasts, Sea, UV, the visual system, failure states) and team/rounds/1/data/NOTES.md, which overrides the proposal on data facts. Live files read for testing at 11:13 UTC; their `read_at` was 10:09 to 10:11 UTC.

## Files

| File | What |
|---|---|
| `src/forecasts/index.html`, `src/assets/js/pages/forecasts.js` | Forecasts page |
| `src/sea/index.html`, `src/assets/js/pages/sea.js` | Sea page |
| `src/uv/index.html`, `src/assets/js/pages/uv.js` | UV page |
| `src/assets/charts.css` | chart styles for the three pages, linked after the HEAD marker; colours by `var(--name)` from site.css (fallbacks are the proposal's values, used only if a token is missing) |
| `team/rounds/1/build/shots-b/*.jpg` | 10 screenshots, JPEG q70, 40 to 151 KB each |

The factory's first-pass pages were replaced entirely; `src/assets/ipma.js` is no longer used by these three pages. Each page uses only `data.js` (loadSource with reads, provenance, runStrip, loading, failure, staleness, fmtDay, fmtUTC, h) and `codes.js` (AREAS, WEATHER_TYPES, WIND_CLASS, RAIN_CLASS, UV_BANDS, uvBand). No third-party code, styles or fonts.

## What each page shows

**Forecasts** (`/forecasts/`, `?place=<globalIdLocal>`)
- A place picker: a native `<select>` with optgroups Mainland (north to south by latitude), Madeira, Azores (east to west). It defaults to Lisboa; the choice is kept in the URL and in localStorage (wrapped in try/catch; the page works without it). Each card also has a "Show larger" button that picks that place and moves focus to the larger chart.
- The chosen place, larger: one column per day, the min to max bar on the shared scale with both figures, a separate row for the chance of rain (0 to 100%, never on the temperature axis), the weather type in IPMA's words from `WEATHER_TYPES`, and wind as "W, moderate" from `wind_dir` and `WIND_CLASS`. IPMA's update time (`updated`, no zone, shown as UTC as IPMA's API page says) and that place's own read time to the second, with a link to IPMA's file for the place. A table with every value, including the rain class ("no class given" where `rain_class` is null, never 0).
- Small multiples: all 35 places, grouped Mainland (24), Madeira (2), Azores (9), on one temperature scale for every card (rounded out to 5 °C; 0 to 30 °C at the 10:09 read), with each card's read time and IPMA update time. Every place as a table in a `<details>`.
- Provenance box twice (after the larger chart and after the grid); the collector's run strip at the foot.

**Sea** (`/sea/`)
- 12 coastal places by 3 days, on one scale: 0 to the next whole metre above the largest value (0 to 6 m at the read), gridlines every 1 m.
- Two bars in each cell: **total sea** (solid; `sea_min_m` to `sea_max_m`, IPMA's significant wave height) and **swell** (outlined; `waves_min_m` to `waves_max_m`). Labelled as in the analyst's notes, not as the data site's "about" text. The page says that the data site's description has this the other way round.
- Under the bars: both ranges in metres, the wave direction as given (no "from" or "towards" added), the swell period as min/max seconds, the sea surface temperature range.
- Period minimum above maximum (10 of 36 place-days at the read): shown as given, marked with a dagger, counted in the note; no mean is worked out.
- Porto Santo (area MCS in the sea file) and Santa Cruz das Flores (ACE) are placed by island from the globalIdLocal prefix, marked with an asterisk and explained.
- IPMA's update time for the sea files is not in latest.json (the collector drops it); the provenance box says so.

**UV** (`/uv/`)
- Places by days grid in its own scrolling box. Each cell is coloured by the WHO band (`uvBand`) and the value is written in it; the band name is in visually hidden text for screen readers; legend with the band names and WHO ranges.
- Aveiro, Leiria and Santarém: the cell splits and shows both values for each day, each with its own colour; nothing averaged or dropped.
- 1081525 has no name: shown by id in its own group "Without a name in IPMA's file" (not put in a region, so the page does not guess where it is), and explained. Place 0 (ten values a day, no place) is not drawn in the grid; its values are listed by day in a `<details>` and explained.
- The note says `hours` is empty in IPMA's file, so no hours are shown.

**All three pages**: days before today's Lisbon date are left out and counted; when no day remains the page says so. A line above the chart says when the read is stale (over 3 h) or old (over 24 h); the Forecasts page adds a line when IPMA's own update is over 14 h old (the analyst's proposal). A missing value shows "no value" or "none"; a day with only one temperature shows a single dot and says which. Titles as "Forecasts | IPMA data, drawn", "Sea | ...", "UV | ...", with descriptions.

## How to check

```
node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs   # OK, OK at 11:35 UTC
node --test tests/*.test.mjs                                                         # 11 pass
python3 -m http.server -d _site 8081 &
```

Checked with Playwright (Chromium), 18 November about 11:20 to 11:35 UTC:
- 390 and 1366 px, light and dark: no console errors; 35 forecast cards, 36 sea cells, 120 UV values drawn; the run strip shows 9 runs; page scroll width equals the viewport on every page (the UV grid and the tables scroll inside their own box).
- data.promptugal.news blocked (`page.route('**/data.promptugal.news/**', r => r.abort())`): each page says "Could not read IPMA's ... Nothing is shown in its place: this page does not guess", links IPMA's page, and the run strip says the collector history is unavailable. No overflow.
- latest.json answered with HTTP 404: the same failure, naming the status.
- Delayed by 6 s: after 4 s the line changes to "Still reading ...: data.promptugal.news is slow to answer."
- `read_at` set 5 h and 30 h back: the stale and old lines appear above the chart, and the provenance box takes its amber or red rule.
- The list emptied: "The ... file was read but lists no places, so there is nothing to draw", with the provenance box.
- One place-day's fields all null: drawn with "no value", no error.
- Keyboard: arrow keys in the place select change the larger chart and the URL; Enter on a card's "Show larger" moves focus to the larger chart's heading; `?place=3420300` opens Ponta Delgada.

## What I could not do, and notes for the conductor

- **Compare mode** (up to four places, in the proposal) is not built. The picker shows one place larger; the grid compares all 35 on one scale.
- **Region of unnamed UV places**: I did not infer one from the id prefix; say if the reviewer wants 1081525 under the mainland.
- **UV order**: places have no coordinates in the UV file, so rows are in IPMA's id order within each region (alphabetical by district on the mainland), not north to south. Ordering by the forecast file's coordinates would mean loading a second source; not done.
- **data.js `failure()`** writes "Could not read X. the file answered HTTP 404." with a lower-case letter after the full stop. A capital in data.js would fix every page; I did not change data.js (not mine to change).
- **`replaceChildren()` and null**: data.js's `h()` drops null children, but `el.replaceChildren(null)` writes the text "null". My modules use a small `put()` helper; worth knowing for other pages.
- The weather-type words are IPMA's own English, including its spelling ("Intermittent ligth rain", code 13), as codes.js keeps them.
- I saw `src/assets/js/data.js` and `src/assets/site.css` modified in the working tree by someone else during my work; I did not touch them. The charts now use site.css's `--t-range`, `--wave`, `--uv-*` and `--map-edge`, which match the proposal.
- Screenshots were taken against the live files (read_at 10:09 to 10:11 UTC); the numbers in them will change.
