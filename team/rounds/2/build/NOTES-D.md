# Round 2 build notes, developer instance D

By developer.ipma-data@AgentiCCells.dinis (instance D), 18 November 2026. Nothing committed or pushed: the changes are in the working tree for the conductor. Instance C built /d/broadsheet/, /d/chart-room/ and /d/night-desk/ at the same time; I did not touch those folders.

## What I built

| Item | Files | Notes |
|---|---|---|
| Almanac | `src/d/almanac/index.html`, `almanac.css`, `almanac.js` | As proposal section 4: warnings as a table by area and day (hatched swatch plus word, and the type), one small map (in force now), a five-day forecast table for eight places, sea (total sea, m, three days, sea temperature today) and UV tables. Serif stack, old-style figures in text, lining tabular in tables, ochre rules. Always light. Two independent columns from 880 px and in print; narrower, the map follows the warnings. Prints on one A4 sheet (checked with `page.pdf`: 1 page). |
| Glance | `src/d/glance/index.html`, `glance.css`, `glance.js` | Place picker at the top (native select, grouped Mainland north to south, Madeira, Azores; choice kept in `?place=` and localStorage, wrapped in try/catch), the chosen place's sentence, five places (Porto, Lisboa, Faro, Funchal, Ponta Delgada), the other 30 in a `<details>`, a small map, every source's read age at the foot. 18 px base. |
| Chooser at /d/ | `src/d/index.html` | Six cards, main design first, two across on phones, three from 820 px. Each card is one link: schematic SVG (boxes and lines, no data), name, one line, five swatches (with a hidden text list), type sample "Lisboa 13 to 19°" in the design's text and figure stacks. The closing line from the proposal is under the grid. |
| designs.json | `src/designs.json` | slug, name, line, path ("/" for main), palette (five, page first), fonts, figures. Where the proposal names fewer than five colours, the rest were added by me (the file's `about` says which designs). Published at /designs.json. |
| Designs control | `scripts/lib.mjs` (`DESIGNS`, `designsControl()`), `src/assets/js/designs-menu.js`, `src/assets/site.css` (appended block) | A `<details>` at the end of the header bar: "Designs: <current>", a list of the six with name and line, the current one marked (`aria-current="true"` and "(this design)"), and a link to /d/. Opens and closes without JavaScript (checked with JS disabled); the script adds Escape (closes, focus back on the button), click outside and focus leaving to close. The NAV, the brand and the disclaimer are unchanged. Hidden in print. |
| Share cards | `scripts/cards.mjs`, `src/assets/share/*.png` | 17 cards, 1200x630, 77 to 140 KB each (gate in the script: fails at 300 KB). Title, one line, a drawing, the site name and the full disclaimer, plus "Not IPMA's site and not official". No live figures, and no level colours on any card, so none can be read as a current warning. `SCHEMATIC` in cards.mjs holds the design drawings the chooser uses too. |
| share-image lines | `src/{warnings,forecasts,observations,fire-risk,sea,uv,storm-charles,how-it-works,use-with-ai}/index.html` (one line each), `src/d/index.html`, the two design pages, `scripts/behind.mjs` (one line in `writePage`) | Home keeps the default home.png (now the new card with the full disclaimer). C's three pages already point to d-<slug>.png, which now exist. |
| S7 | `src/assets/js/pages/home.js`, `src/assets/js/pages/warnings.js`, `site.css` (`details.fold`) | The long lists are in `<details class="fold">`, open from 760 px, closed on phones, with a summary that gives the count. The map's skip link opens the fold. The map, the provenance boxes, MeteoAlarm's comparison line, attribution and disclaimer stay visible. Heights at 390 px (Playwright, live data): / 11,671 to 6,986 px; /warnings/ 17,303 to 5,901 px. |
| S8 | `src/assets/share/home.png` and every card | The full disclaimer, word for word, from `DISCLAIMER` in lib.mjs. |

Shared modules reused, not forked: `data.js` (loadSource, provenance, ageBanner, loading, failure, staleness), `map.js` (buildGrid, areaBase, areaMap, levelsFor, warningWindows, currentWarnings, swatch, lvl), `codes.js` (uvBand).

## Honesty rules in the two designs

- provenance() after every table and map; ageBanner() above; loading() then failure() with the file and IPMA's page when a read fails; nothing drawn in its place.
- Checked with data.promptugal.news blocked: Almanac shows 5 failure messages, Glance 2 plus "could not be read" in each age line; no page errors. With only ipma-fire-risk blocked, both maps fall back to tiles and say so.
- Glance's sentences use only file values: warnings for the place's warning area (`city.area`) in force now or later, as given in Portugal time ("until Thu 06:00", "then orange until 12:00"); today's min and max rounded to the nearest degree, and the chance of rain. No warning: "No warning." No value: said in words.
- UV: where IPMA gives two values for a place and day both are shown ("0.6 and 0.7"); nothing averaged. Sea: Porto Santo and Santa Cruz das Flores are listed by island, with a note (analyst's notes).
- Levels are always a word beside the hatched swatch, so the Almanac reads in greyscale.

## Checks run (18 November 2026, about 12:05 UTC, against the live files)

- `node scripts/cards.mjs`: OK, 17 cards.
- `node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs && node --test tests/*.test.mjs`: OK, OK, 11 of 11 pass (with C's pages present).
- Playwright at 390 and 1366 px on /, /warnings/, /d/, /d/almanac/, /d/glance/: live data drawn, no status left loading, no console errors, no horizontal scroll (scrollWidth equals clientWidth).
- Almanac print emulation and `page.pdf({ format: 'A4' })`: one page (`shots-d/d-almanac-print-a4.jpg`).
- Designs control by keyboard at both widths: Enter opens, Tab reaches the first design, Escape closes and focus returns to the button; the panel stays inside the viewport (16 to 374 px at 390).
- Screenshots: `team/rounds/2/build/shots-d/`, JPEG q70, first screen of each page, all under 200 KB.

## Open, for the conductor or the designer

- At 1366 px the long NAV fills the bar, so the designs control sits on its own line at the right of the header. A shorter NAV, or moving the "Designs" nav link into the control, would put them on one line; I left the NAV as it was.
- The chooser's cards are hand-generated from designs.json and `SCHEMATIC` (scripts/cards.mjs); if designs.json changes, the chooser must be regenerated or edited to match (a build step in `scripts/designs.mjs` could do this; I did not add one, as it was outside this brief's file list).
- The Almanac's eight places and Glance's five are fixed lists (proposal: "fixed list" for home); a reviewer may want different places.
- Deep links to /warnings/#list-h open the page with the list folded on phones; the skip link opens it, a direct hash does not.
