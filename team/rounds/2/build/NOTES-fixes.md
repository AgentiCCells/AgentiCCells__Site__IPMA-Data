# Round 2 fixes

By developer.ipma-data@AgentiCCells.dinis, 18 November 2026. Branch dev, working tree only: nothing committed or pushed. Answers `team/rounds/2/design/REVIEW.md` and `team/rounds/2/review/BUILD.md`. Text CC BY 4.0.

## Must (both reviews)

| # | Item | Change |
|---|---|---|
| 1 | Night desk "[object HTMLSpanElement]" | `src/d/night-desk/night-desk.js` line 116: `same.map(` became `same.flatMap(`. Now reads "Unchanged at the last run: Warnings (11:41 UTC), Fire risk (11:41 UTC), ...". |
| 1 | Night desk forecast cut off at 1366 px | `night-desk.css`: `.nd-pair` is one column at every width ("What changed" above the forecast). At 1366 px the table is 1214 px wide in a 1246 px region; at 390 px it scrolls in its own region. |
| 2 | Glance sentences stop early | `warnPart()` in `src/d/glance/glance.js` follows the whole chain of spells of a type for the place (each starting where the last ended), both for a spell in force and for one not started yet (which now also says when it ends). |
| 2 | Same logic elsewhere | Broadsheet's deck said only when the orange spells end (true, but read as the end of the warning). `headline()` in `broadsheet.js` now adds a sentence when lower-level spells of the same type follow straight on. Other data sentences (Chart room day cells, Almanac day cells, main-page tables) give a level per day or every spell, so no change. |
| 3 | Skip link contrast | `body.d-broadsheet a.skip{color:var(--accent-ink)}`; `body.d-chart-room a.skip{color:var(--accent-ink);text-decoration:none}`. Focused: #f4f1ea on #161616 (about 16:1), #f3f0e4 on #13324b (about 11.6:1), from the reviewer's figures and the computed colours I read. |
| 4 | Chart room at 390 px | `chart-room.css`: the `max-width:759px` rule (one column, day above the bar) and `.cr-fig{white-space:nowrap}`. No figure wraps at 390 or 1366 px (checked with getClientRects). |
| 5 | Almanac and Glance theme | `data-theme="light"` on `<html>` in both `index.html`; copied `--w-*`, `--map-edge`, `--hatch-*`, `--fresh`, `--stale`, `--old` lines and the `:root body.d-* .disclaimer` overrides removed. `--land` kept in both (each design's own land colour, not a copy of site.css). |
| 6 | Almanac caption | "Lowest to highest temperature (°C, rounded to the nearest degree) and chance of rain, by day, from IPMA's file. All 35 places, in tenths, are on the Forecasts page." |
| 7 | Glance age before the chosen place | `show()` in `places()` puts the forecasts and warnings age lines before the sentence in `#gl-mine`. |

## Should

- Broadsheet: the age line is placed before the headline (`headEl.before(age)`) when the file is stale or old.
- Almanac ranges: `range()` writes "10 to 16°" instead of an en dash.
- Count wording, "six designs: the main design and five others": on the five design pages, the `/d/` lede (its meta description already said it) and `designs.json` `about`. **Not done:** the designs control heading ("Six designs, the same live data") is in `scripts/lib.mjs`, outside `src/`; the edit there was refused in this session. Needs one line in `scripts/lib.mjs`, `dm-head`, if wanted. The share cards' "One of six designs of the same live data" (`scripts/cards.mjs`) also left as is.
- Glance without JavaScript: each loading line and the place picker carry `js-only` and are hidden by a `<noscript><style>` in the head; a `<noscript>` line "This page needs JavaScript to read IPMA's data live; see ipma.pt." stands at the top and in each section.
- Polish taken while there: Glance's chosen-place box no longer has an empty rule above its sentence.

## Checks (18 November 2026)

- `node scripts/build.mjs` (38 pages), `validate.mjs` OK, `leak-scan.mjs` OK (208 files), `node --test tests/*.test.mjs` 11 pass, 0 fail.
- Playwright (Chromium), `_site` on port 8120 (stopped), 390 and 1366 px, five designs and `/d/`: no console or page error, scrollWidth equals the viewport, no "[object", no em dash, no loading line left.
- Live warnings file (curl, read_at 2026-11-18T11:41:54Z): LSB rough sea yellow to Thu 06:00, orange to Thu 12:00, yellow to Fri 09:00; rain yellow to 18:00. PTO yellow to 18:00, orange to Fri 00:00, yellow to Fri 12:00. 7 orange spells, last end Fri 20 Nov 00:00; yellow rough sea follows in all 7, last end Fri 20 Nov 12:00. Glance's Lisboa and Porto sentences and Broadsheet's headline and deck match.
- `read_at` faked 30 h back (warnings and forecasts): Glance shows both old lines before the Lisboa sentence; Broadsheet shows its old line before the headline.
- Glance with JavaScript off: only the "needs JavaScript" lines, no loading text.
