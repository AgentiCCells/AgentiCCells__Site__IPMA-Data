# Round 1 design proposal: how IPMA's data is drawn

By designer.ipma-data@AgentiCCells.dinis, 2026-11-18, round 1. Text CC BY 4.0; mock-up code Apache-2.0.

This is a proposal. The developer builds what passes review; the reviewer checks it against the brief.

Everything here was measured against the files read at about 10:11 UTC on 18 November 2026 (copies in the conductor's scratchpad, not in the repository). Counts quoted below come from those files and will change.

## Files

| File | What it is |
|---|---|
| `mockups/home.html` | Portugal now: the warnings hex map with insets, the area detail panel, five places' forecast, the warnings table, a status line per source. Reads data.promptugal.news live. `?fallback=1` shows the tile cartogram; `?theme=dark` forces dark. |
| `mockups/pages.html` | One section per page: warnings timeline, observations map, fire risk map with day switcher and counts, sea ranges, UV grid. `?only=timeline|obs|fire|sea|uv`. |
| `screenshots/*.jpg` | The mock-ups at 390 and 1366 px, light (and three dark), JPEG quality 70, each under 200 KB. Taken with the API answered from the 10:11 UTC copies, so the pictures match the numbers here. |

Neither mock-up holds geometry or IPMA data: both build the map in the browser from `ipma-fire-risk/latest.json`. The two small code tables they carry (district number to warning area, area code to name) are placeholders for `src/assets/js/codes.js`, which is the analyst's.

## 1. The map: evaluation and recipe

### Evaluation

The plan works. Drawn from the 278 municipality points, the mainland comes out clearly as Portugal, with the 18 districts as recognisable regions (see `screenshots/home-390.jpg`). One change was needed: **a fixed 12 km cut-off leaves holes**. Municipalities in the Alentejo and Trás-os-Montes are large (median nearest-neighbour distance 10.7 km, 90th percentile 20.4 km, largest 40.3 km), so with 12 km the south breaks into islands. A radius that grows with the local spacing, then a small hole fill, gives a solid, connected mainland without pushing the west coast far into the sea.

The fire-risk file tags each point with a DICO code, not with a warning area. The first two digits are the district number (01 Aveiro to 18 Viseu); a fixed 18-row table maps them to IPMA's area codes (01 AVR, 02 BJA, 03 BRG, 04 BGC, 05 CBO, 06 CBR, 07 EVR, 08 FAR, 09 GDA, 10 LRA, 11 LSB, 12 PTG, 13 PTO, 14 STM, 15 STB, 16 VCT, 17 VRL, 18 VIS). The analyst should confirm it against IPMA's district list and keep it in `codes.js`.

### Recipe (the developer must follow it exactly)

1. **Projection.** Equirectangular, centred on 39.6° N, 8.0° W, in kilometres: `x = (lon + 8.0) × 111.32 × cos(39.6°)`, `y = (39.6 − lat) × 110.57` (y grows southward, as SVG does). Over 5° of latitude the distortion is under 4 %, well below the precision of the drawing.
2. **Points.** Every municipality with a DICO whose district is 01 to 18. Each point's radius `r = clamp(12 km, 0.9 × distance to its second-nearest point, 24 km)`.
3. **Grid.** Pointy-top hexagons, **4.5 km from centre to corner** (7.79 km across the flats, rows 6.75 km apart, odd rows shifted half a hex right), over the points' bounding box plus 30 km. A hex is land if its nearest point is within that point's `r`; it takes that point's district. About 2,060 hexes.
4. **Hole fill.** Six passes: an empty hex with 4 or more land neighbours becomes land, with the district of its nearest point.
5. **Drawing.** One `<path>` per area holding all its hexes (25 paths, not 2,000 elements), filled by level; a 0.5 unit stroke in `--bg` so the hexes show as a grid, which tells the reader this is a schematic. District borders: the shared edges between hexes of different districts, one path, 2 units in `--panel` (a gap, not a line). Coast and land border: the edges with no neighbour, one path, 1.1 units in `--map-edge`. Selection: the area's outer edges only, 2.4 screen px in `--ink`, drawn on a top layer.
6. **Labels.** One per district at the hex nearest the district's centroid, 12 screen px, weight 600, `--ink` with a 3 px `--bg` halo. Names as IPMA writes them, with four short forms: Viana (Viana do Castelo), C. Branco (Castelo Branco); Vila Real and Portalegre fit as they are. Font size is set in screen pixels: on resize, `font-size = 12 / k` where `k` is rendered width over viewBox width. Labels are `aria-hidden`; names reach screen readers through each area's `aria-label`.
7. **Insets.** Madeira and the Azores are not in the fire-risk file, so they are always labelled tiles, framed by a 1 px `--map-edge` line and captioned "not to scale". Azores: three tiles west to east (AOC western, ACE central, AOR eastern). Madeira: three bands north to south (MCN north coast, MRM mountains, MCS south coast) with Porto Santo (MPS) as a smaller tile to the east. At a map width of 560 px or more the insets sit in a column to the left of the mainland, in the Atlantic; below 560 px they move to a strip under the mainland with full names ("Western", "Porto Santo"), so tiles stay at least 30 px tall.
8. **Fallback.** If `ipma-fire-risk` cannot be read, draw the 25 areas as equal square tiles in this fixed layout (column, row): VCT 0,0 · BRG 1,0 · VRL 2,0 · BGC 3,0 · PTO 0,1 · VIS 1,1 · GDA 2,1 · AVR 0,2 · CBR 1,2 · CBO 2,2 · LRA 0,3 · STM 1,3 · PTG 2,3 · LSB 0,4 · STB 1,4 · EVR 2,4 · BJA 1,5 · FAR 1,6, with the same island insets, and say under the map "Tiles, not geography: the file that gives the map its shape could not be read." (`screenshots/home-fallback-1366.jpg`).
9. **Reuse.** Build the grid once per page and cache it; stations, coastal places and fire-risk classes are drawn on the same base. Island stations go in their own framed insets, each at its own scale, captioned "own scale".

### A warning area's level, and several warnings in one area

- **Time window first.** IPMA's "active" list holds warnings in force and warnings that start later (on 18 November: 32 entries in 13 areas, of which 8 areas had one in force at 11:00 UTC). So the map has a segmented control: **In force now** (default), **Today**, **Tomorrow**, **Day after**, as calendar days in Portugal time. IPMA's times carry no zone and are Portugal local time; compare them with the current Lisbon time from `Intl.DateTimeFormat(..., {timeZone: 'Europe/Lisbon'})`, never with UTC.
- **Fill = the highest level whose time overlaps the window** (green < yellow < orange < red). An area with nothing in the file is green: that is IPMA's own meaning, and the file's `counts.areas` (25) confirms all areas were read.
- **Several warnings:** the map shows only the highest; the detail panel (beside the map at 900 px and wider, under it on phones) lists every warning for that area, in time order: level swatch, level and type, start to end in Portugal time, IPMA's text in Portuguese (`lang="pt"`). The page opens with the area of the highest level selected, so the panel is never empty.
- **A type filter** (All, then one button per type present: today "rain", "rough sea") is optional for round 1; if built, it filters the map, timeline and list together.
- **No active warnings** is a good, real state: every area green, and the note reads "No yellow, orange or red warning in IPMA's file for this time." It is never drawn as an error.

### Legend

Four swatches in a row under the map, each swatch the fill plus its hatch: "Green: no warning", "Yellow", "Orange", "Red". Then one line: "Each area shows its highest level in that time. The mainland's shape is drawn from IPMA's 278 municipality points: each hexagon takes the district of the nearest point, so coasts and borders are approximate."

### Keyboard and screen readers

- A "Skip the map: warnings as a table" link before the map.
- The SVG is `role="group"` with an `aria-label`. Each area is a `<g role="button">` with a **roving tabindex**: one tab stop for the whole map; arrow keys move in reading order (north to south: VCT, BRG, VRL, BGC, PTO, AVR, VIS, GDA, CBR, CBO, LRA, STM, PTG, LSB, STB, EVR, BJA, FAR, then AOC, ACE, AOR, MPS, MCN, MRM, MCS); Home and End jump; Enter or Space selects. Focus shows the selection outline.
- Each area's `aria-label`: "Aveiro: yellow warning, rough sea, in force now". The detail panel is `aria-live="polite"`.
- Hover selects on pointer devices; tap selects on touch. No floating tooltip on phones: the panel is the tooltip.

### Table alternative

Under the map on every page that has it: Area, Level (swatch and word), Type, From, To (Portugal time), in reading order, then by start time. Caption: "N active or upcoming warnings in IPMA's file; areas not listed have none (green)." Below 560 px it becomes three columns: Area, Warning ("yellow rough sea"), When ("Wed 18 Nov 12:00 to 18:00", the date given once when start and end share a day).

## 2. The visual system

### Type

The system font stack already in `site.css` (no web fonts: nothing from a third party). Body 17 px / 1.55. Chart text: 12 px for labels, 11 px minimum for axis ticks and captions, never smaller. Figures in tables and charts use `font-variant-numeric: tabular-nums`. Weights: 400, 600 for labels and names, 800 for the site name only. Units always shown: °C, %, m, km/h, mm, hPa.

### Colour tokens

Text and surfaces (existing tokens, measured with WCAG 2 contrast):

| Token | Light | on `--bg` #f7f5f0 | on `--panel` #fff | Dark | on `--bg` #12161a | on `--panel` #1a2026 |
|---|---|---|---|---|---|---|
| `--ink` | #1d2329 | 14.55 | 15.85 | #e8ecef | 15.30 | 13.83 |
| `--muted` | #5b6670 | 5.38 | 5.87 | #9aa6b0 | 7.32 | 6.61 |
| `--accent` | #0b5c7a | 6.82 | 7.43 | #5fb3d3 | 7.68 | 6.94 |
| `--fresh` | #2e7d4f | 4.63 | 5.05 | #6cc48f | 8.59 | 7.77 |
| `--stale` | #a35d00 | 4.67 | 5.09 | #e0a24a | 8.17 | 7.38 |
| `--old` | #b3261e | 6.00 | 6.54 | #ff8a80 | 7.96 | 7.20 |
| disclaimer text on its band | #3b2f00 on #fff4d6: 12.03 | | | #f4e6b8 on #3a3110: 10.36 | | |

All text pairs pass 4.5:1. `--line` (1.36 to 1.50) and `--land-line` (1.65 to 2.04) are fine for gridlines but too faint to be the only edge of a map, so a new token is needed:

| New token | Light | Dark | Use |
|---|---|---|---|
| `--map-edge` | #6f7880 (4.12 on bg, 4.49 on panel) | #8b96a0 (6.03 on bg, 5.45 on panel) | coast, inset frames, swatch borders, station dot outlines |
| `--hatch-dark` | rgba(29,35,41,.5) | rgba(18,22,26,.55) | hatch on light fills |
| `--hatch-light` | rgba(255,255,255,.6) | rgba(18,22,26,.55) | hatch on the light-mode red |

**Data colours: change the values in `site.css`.** The current `--w-*`, `--rcm-*` and `--uv-*` fail the colour-vision checks (run with the dataviz validator, all pairs, because a map puts every class side by side): green and orange warnings are 6.2 apart under protanopia; RCM 1 and 3 are 4.9 apart; UV low and high are 2.0 apart (targets: 8 or more; normal vision 15 or more). The replacements below step lightness in order of severity, so colour-blind readers can read the order by lightness alone. Figures are OKLab ΔE ×100: worst all-pairs under normal vision, and worst under protan or deutan simulation.

| Scale | Light (surface #f7f5f0 or #fff) | worst normal / CVD | Dark (surface #12161a or #1a2026) | worst normal / CVD |
|---|---|---|---|---|
| Warning levels green, yellow, orange, red | #a8d5b5, #f5c518, #d9621a, #a51f2a | 15 / 14 | #22382f, #f4cc1c, #ec8030, #de3c5c | 16 / 12 |
| Fire risk RCM 1 to 5 | #d6eecf, #f4c62a, #e8862c, #c43f26, #7a1a2c | 16 / 13 | #1f3428, #5c5418, #b4621c, #ff8070, #ffd8d2 | 15 / 10 |
| UV, WHO bands low, moderate, high, very high, extreme (same in both modes: tiles carry printed values) | #d6eecf, #f4c62a, #e8862c, #c43f26, #6a3d9a | 16 / 13 | the same, with text #1d2329 on the first three and #fff on the last two | |
| Station temperature, 6 bins (one hue, ordinal) | #f29a5e, #e57c3c, #cf6127, #b04a1a, #863512, #5a2209 | validator: ordinal PASS on #fff | #8a3c14, #ad4f1c, #d0672a, #e8834a, #f4a877, #fbcfaa | ordinal PASS on #1a2026 |
| Wave height bars, temperature range bars | `--wave` #2f6f9f (5.39 on #fff); `--t-range` #3a6ea5 (5.31) | | #7fb2e5 (7.35 on #1a2026) | |

Notes the developer must keep:

- In dark mode the warning green and RCM 1 are dark and recessive on purpose ("nothing to report" should not shout); the `--map-edge` coast line, not the fill, separates land from page.
- Light fills (green, yellow, RCM 1 and 2, UV low and moderate, the lightest temperature bins) are below 3:1 against the page. That is allowed only because every one of them has a second channel: a hatch, a printed value, a `--map-edge` outline, and always the table. Do not remove those to "clean up".
- These colours mean levels. They are never reused for anything else, and nothing else (series, links, buttons) uses them.
- Text never takes a level colour: "Orange" is written in `--ink` beside an orange swatch. The old `.pill.lvl-*` badges (dark text on orange is 4.31:1) are replaced by swatch plus word.

### Colour-blind safety: the hatch

Warning levels never rest on hue alone. Every warning fill carries a hatch, drawn as SVG patterns in user space (so the hatch runs continuously across hexes and scales with the map):

| Level | Hatch |
|---|---|
| Green | none |
| Yellow | single lines at 45°, every 7 units, 1.3 wide, `--hatch-dark` |
| Orange | cross-hatch 45° and 135°, every 6 units, 1.3 wide, `--hatch-dark` |
| Red | dense cross-hatch, every 4.2 units, 1.5 wide, `--hatch-light` |

The same swatch (fill plus hatch, 1 px `--map-edge` border) is used in the legend, the detail panel, the timeline and the table, so the hatch is learnt once. The level is also written as a word everywhere it appears outside the map. In `forced-colors` mode the hatches remain (they are strokes) and fills drop to system colours: add `@media (forced-colors: active)` so hatches use `CanvasText`.

Fire risk and UV use printed values or counts, not hatches: RCM classes are 5 and a hatch per class would be noise; the counts panel and the table carry them. If the reviewer finds RCM 4 and 5 hard to tell apart in the dark map, add the yellow hatch to class 4 and the red one to class 5.

### Marks and chrome

Thin marks: range bars 7 to 9 px tall with 4 px rounded ends; 2 px surface gaps between adjacent bars and between consecutive warnings; hairline gridlines in `--line`, solid, never dashed. One axis per chart: no chart puts two measures on two scales (rain chance is a separate row, never a second axis). A number is printed where it is the point (forecast min to max, UV values, class counts), not on every mark.

### The box beside every chart

Every chart and table is followed by `provenance(src)` from `data.js`: Source (IPMA, with its page), Read (UTC time and age, coloured fresh, stale or old), Terms (from the card), and links to the card, latest.json and reads.json. MeteoAlarm's box adds its disclaimer and link to meteoalarm.org, which its terms require (they travel in `latest.attribution`).

### Failure states (all charts)

| State | What the chart shows |
|---|---|
| Loading | `loading()` status line in the chart's place, keeping the chart's height so the page does not jump. |
| Slow (over 4 s) | the same line changes to "Still reading ...: data.promptugal.news is slow to answer." |
| Missing (error or 15 s timeout) | `failure()`: "Could not read ... Nothing is shown in its place." No chart, no stale copy, no placeholder shapes. The rest of the page draws normally. |
| Stale (over 3 h) or old (over 24 h) | the chart is drawn, the provenance box gets its amber or red rule, and a line above the chart says "These figures were read N h ago." For warnings when old: "These warnings may have ended or changed: see ipma.pt." |
| Empty | a real state, drawn as a result: no warnings, all green; no station reporting a measure, all hollow rings and the count; a forecast day with no value, "no value" in that cell. |
| A field missing on some records | that mark only is left out or hollow, and counted in the caption ("111 stations sent no reading this hour"). Never interpolated. |

## 3. Each page

### Portugal now (home)

(`screenshots/home-1366.jpg`, `home-390.jpg`, `home-1366-dark.jpg`, `home-390-forecast.jpg`)

1. Warnings map with its time control, legend and note; the detail panel beside it (900 px and up) or below.
2. **Forecast for five places**, one per region and coast: Porto, Lisboa, Faro, Funchal, Ponta Delgada (fixed list; the Forecasts page has all 35). One row per place, five day columns; each cell a min to max range bar on **one temperature scale shared by all places** (rounded out to 5 °C, today 5 to 30 °C, stated in the caption), "14 to 18°" printed under it, then "rain 100%". At under 520 px the name goes above its row and the cell reads "14–18°" and "☂ 100%".
3. Warnings table.
4. **Every source, as last read**: one line per source (7 lines), with a fresh, stale or old dot (the colour is backed by the word), the read time, and one count: "Warnings: read 18 Nov, 10:11 UTC (8 min ago). 32 yellow, orange or red in 13 of 25 areas." A failed read says so in that line.

### Warnings

- The map, as above.
- **Timeline** (`timeline-1366.jpg`, `timeline-390.jpg`): one row per area and type (17 rows today), reading order. x is time from the earlier of now and the first start to the last end; midnight lines with the day name, 6-hourly hairlines (labels only at 560 px and wider); a 1.5 px `--ink` "now" line. Each warning a hatched bar in its level's colour, 2 px gap between consecutive warnings so a yellow-orange-yellow sequence reads as three. Under 560 px the row label sits above its bar.
- The list (the table, as above).
- **MeteoAlarm context**: a separate panel, titled as context, not as a second source of truth. A compact table of the not-expired CAP messages (32 of 58 today): area, level (swatch and word), hazard, onset and expiry in UTC, time of issue. One line comparing counts with IPMA's file ("MeteoAlarm: 32 not expired; IPMA's file: 32 active") without claiming they match message by message. MeteoAlarm's disclaimer and link, as its terms require.

### Forecasts

- **Place picker**: a native `<select>` grouped Mainland (north to south), Madeira, Azores, defaulting to Lisboa, with the choice kept in the URL (`?place=1110600`) and in localStorage. A "compare" mode shows up to four places.
- **Small multiples**: all 35 places in a grid (3 to 4 across on desktop, 1 across on phones), each with the same two rows as the home strip: min to max range per day on one scale shared by every place, and rain chance per day as a bar from 0 to 100 % on its own row (never on the temperature axis). Weather type as words from IPMA's code table (`codes.js`), not invented icons; wind as "W, moderate" from `wind_dir` and `wind_class`.
- Table: place, date, min, max, rain %, weather type, wind.

### Observations

(`obs-1366.jpg`, `obs-390.jpg`)

- Stations on the grey hex base (land in `--land`, district borders as gaps, coast in `--map-edge`), Madeira and the Azores in framed insets at their own scale.
- **One measure at a time** (control: Temperature, Wind, Rain, Humidity, Pressure). Temperature: filled dots 8 px with a 1 px `--map-edge` outline, coloured in up to 6 bins of 1, 2, 3, 4 or 5 °C (the smallest step that gives 6 bins or fewer over this hour's range), legend with the bin edges. Stations without a value: small hollow ring in `--muted`, drawn under the filled dots, counted in the legend ("no reading (111 stations)" in the copy read; the file says 124 of 227 reporting, and 116 with a temperature).
- **Wind arrows only once the analyst confirms `wind_dir_id`.** IPMA's documentation is understood to use 0 for no direction and 1 to 9 for N, NE, E, SE, S, SW, W, NW, N, as the direction the wind blows from; until `codes.js` confirms this, the Wind view shows speed only (dots in 3 bins) and says why. When confirmed: an arrow per station pointing where the wind goes (from + 180°), fixed length, three line weights for speed bins, a dot for 0.
- The hour (`hour_utc`) stated above the map; it can lag the read time by an hour or more.
- Sortable table: station, temperature, humidity, wind (km/h and direction word), rain, pressure, radiation; headers are buttons with `aria-sort`; missing values show "none", sorted last.

### Fire risk

(`fire-1366.jpg`, `fire-390.jpg`, `fire-390-dark.jpg`)

- The same hex grid, each hex in the RCM class of its nearest municipality point, district borders as gaps over it. Caption: "Each hexagon takes the class of the nearest municipality point in IPMA's file, so edges are approximate. Madeira and the Azores are not in this file."
- **Day switcher**: three buttons from the file's dates ("Today, Wed 18 Nov", "Thu 19 Nov", "Fri 20 Nov"), with the run date from `files[].run` in the note.
- **Counts by class** beside the map: five horizontal bars on one scale with the count printed. When every municipality is in one class (today: all 278 in class 1) a sentence says so; it is not an error.
- Map max width 420 px on desktop so it does not dominate the page.
- Table: municipality, district, class for each day. The file gives DICO codes only; names come from a DICO table in `codes.js` if the analyst can source one under a licence that allows it, otherwise the table shows the DICO code and district. Never a guessed name.

### Sea

(`sea-1366.jpg`, `sea-390.jpg`)

- 12 coastal places, mainland north to south, then Madeira, then the Azores; three day columns; each cell a bar from IPMA's lowest to highest significant wave height, **one scale for all cells** (0 to the next whole metre above the largest value, gridlines every 1 m). Tooltip and table add period and direction.
- Sea temperature as printed numbers ("17.4 °C", or "17.4 to 17.5" when min and max differ), not a chart: it moves by tenths over three days.
- Data note for the analyst: Santa Cruz das Flores carries area ACE in the sea file, although Flores is in the western group (AOC) elsewhere. Draw it as the file says and flag it.
- Table: place, date, wave min and max, period, direction, sea min and max, sea temperature.

### UV

(`uv-1366.jpg`, `uv-390.jpg`)

- A grid: places (rows, mainland north to south, then islands) by days (columns), each tile printing the index and coloured by its WHO band; legend with the band ranges.
- Where IPMA's file gives **two values for one place and day** (Aveiro, Leiria and Santarém today), the tile splits in two, each half with its own value and colour. Nothing is averaged or dropped.
- Entries without a name: "IPMA id 1081525 (no name in IPMA's list)". The entry with id 0 (several values a day, no place) is not drawn; one line under the grid says so.
- UV places have no coordinates in the file; no map for UV in round 1.

## 4. Five designs (round 2)

Each is a full home page at `/d/<slug>/`, drawing the same live data with the same rules: the disclaimer, provenance beside every chart, the failure states, the level colours and hatches (these never change between designs, so a red warning looks red everywhere), 390 and 1366 px. What changes is type, surface, layout and emphasis. All fonts are system stacks; no web fonts, no third-party assets, no imitation of IPMA's or anyone else's look.

1. **Broadsheet** (`/d/broadsheet/`). A newspaper weather page: a headline sentence written from the data ("Orange warnings for rough sea on the north and centre coast from 18:00"), the map large in the first column, place forecasts as a dense table in tabular figures, rules between columns. Palette: newsprint #f4f1ea, ink #161616, one accent #8a1c1c for headings only. Type: serif stack (`Charter, "Iowan Old Style", Georgia, serif`) for headings, system sans for data.
2. **Chart room** (`/d/chart-room/`). Sea first: the 12 coastal places and wave ranges lead, the warnings map with rough-sea warnings emphasised, wind beside it. Palette: chart paper #f3f0e4, water #dbe7ec, navy ink #13324b, contour hairlines #9db4c0. Type: system sans, labels in small caps with letter-spacing, figures in the monospace stack.
3. **Night desk** (`/d/night-desk/`). A dark operations board: a tile per source with its status light and read age, the map, a ticker-free list of what changed since the last read. Palette: #0d1117 page, #161b22 tiles, text #e6edf3, muted #8b949e, the dark-mode data tokens. Type: system sans, all figures in the monospace stack.
4. **Almanac** (`/d/almanac/`). A printed almanac page, readable in greyscale: warnings as a hatched table by area and day, forecasts as a five-day table, sea and UV as tables, one small map. Prints on one A4 sheet (`@media print`). Palette: cream #faf6ec, ink #222, ochre #9a6a12 for rules. Type: serif stack throughout, old-style figures in text, tabular in tables.
5. **Glance** (`/d/glance/`). The phone first: one column, one sentence per place ("Lisboa: yellow for rain until 18:00. 13 to 19°. Rain 100%."), the place picker at the top, a small map, every source's age at the foot. Palette: white #ffffff, ink #111, one accent #0b5c7a. Type: system sans at 18 px base.

**The chooser at `/d/`**: a grid of six cards (the main design first, labelled "The main design", then the five), two across on phones, three on desktop. Each card: the name, one line on its idiom, its palette as five swatches, a type sample ("Lisboa 13 to 19°") set in its fonts, and a schematic preview drawn as a small static SVG of its layout (boxes and lines, **no data**, so the chooser loads instantly and never shows a stale figure). The whole card is one link. Under the grid: "Every design reads the same live files; only the way they are drawn differs."

## 5. Decisions for the developer, in short

1. Build the map exactly as section 1: radius `clamp(12, 0.9 × 2nd-nearest, 24)` km, 4.5 km hexes, six-pass hole fill, one path per area, borders as gaps, coast in `--map-edge`, island tiles, tile fallback.
2. The map's default window is **In force now**, compared in Lisbon time; the fill is the highest level in the window; green when the file has nothing.
3. Replace the `--w-*`, `--rcm-*`, `--uv-*` values in `site.css` with the tables above (light and dark), add `--map-edge`, `--hatch-*`, `--t-1..6`, `--wave`, `--t-range`.
4. Every warning fill carries its hatch; every level is also written as a word; text never wears a level colour.
5. One axis per chart; shared scales across small multiples; no smoothing, averaging or interpolation; missing values shown as missing and counted.
6. Provenance box after every chart; the failure states table applies to every chart; "no warnings" is drawn as all green.
7. Roving tabindex on the map, skip link, `aria-label` per area, a table for every chart.
