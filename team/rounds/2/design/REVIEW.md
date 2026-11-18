# Round 2 design review: the five designs, the chooser, the designs control and the share cards

By designer.ipma-data@AgentiCCells.dinis, 18 November 2026, about 12:00 to 12:15 UTC. Branch dev, working tree as left by developers C and D, nothing committed. Text CC BY 4.0.

Measured against `team/rounds/1/design/PROPOSAL.md` sections 2 and 4. Built with `node scripts/build.mjs`, served on port 8110 (stopped), looked at with Playwright (Chromium) at 390 and 1366 px, light and dark system settings, live data read at 11:39 to 11:41 UTC. Contrast: every visible text node on every page, foreground against its composited background (WCAG 2), in both system settings. Screenshots in `shots/` (JPEG q70, all under 200 KB).

## Verdicts

| Page | Verdict | In one line |
|---|---|---|
| `/d/` chooser | pass | Six cards as specified, schematic drawings with no data, works in light and dark, no text below 4.5:1. |
| Broadsheet | pass with changes | A real newspaper page; headline written only from the warnings file. Skip link invisible on focus. |
| Chart room | pass with changes | Sea leads, as specified; at 390 px the sea cells wrap badly (units orphaned on their own line). Skip link invisible on focus. |
| Night desk | pass with changes | A convincing operations board; one list prints `[object HTMLSpanElement]`. |
| Almanac | pass with changes | The best-made of the five; prints on one A4 sheet. Its level colours are copied, not inherited. |
| Glance | pass with changes | Right idiom, but sentences drop warning spells after the second, so a warning can read as ending early. Level colours copied, not inherited. |
| Designs control | pass | Opens without JavaScript, marks the current design, stays inside the viewport (16 to 374 px at 390). |
| Share cards (17) | pass | Full disclaimer on every card, no live figure, no level colour; each design card carries its own palette and type. |

What holds everywhere (measured): level fills `#a8d5b5 #f5c518 #d9621a #a51f2a` (light) on Broadsheet, Chart room, Almanac, Glance and the main design in light; `#22382f #f4cc1c #ec8030 #de3c5c` (dark) on Night desk and the main design in dark; hatches in `--hatch-dark` with the same pattern ids everywhere; levels written as words beside the swatch; no horizontal page scroll; no console errors; no text below 4.5:1 on any page in either system setting, apart from the focused skip link below.

## The two decisions

1. **Fixed theme per design: upheld.** Each design in section 4 is one palette, and Night desk's spec names "the dark-mode data tokens". Following the reader's setting would put dark data tokens on newsprint or light ones on the night board, which is worse than either. The main design stays the place that follows the reader's setting, and the chooser says so ("in light or dark"). One condition: do it the same way in all five (must-change 5), so the level colours come from `site.css` and cannot drift.
2. **Darkened status words on Broadsheet and Chart room: upheld.** Section 2 fixes the level colours and hatches; `--fresh`, `--stale` and `--old` are text tokens, and section 2 already gives them per surface. Keeping 4.5:1 on each paper is the rule. Measured: #24663f, #8a4f00, #a3221b give 6.04, 5.75 and 6.57:1 on chart paper #f3f0e4 (and C's figures on newsprint and water). Almanac keeps the site values and still passes on cream #faf6ec (4.67, 4.72, 6.06:1), so it needs no change.

## Must change before release

| # | Page | File, selector | Change | Why |
|---|---|---|---|---|
| 1 | Night desk | `src/d/night-desk/night-desk.js` line 116, `same.map(([n, R], i) => [...])` | `same.flatMap(([n, R], i) => [...])` | `h()` flattens one level only, so the list reads "Unchanged at the last run: ,Warnings, (,[object HTMLSpanElement],)". Shot 07. |
| 2 | Glance | `src/d/glance/glance.js`, `warnPart()`, the `if (next) out.push(', then ', ...)` line | Follow the whole chain: `for (let s = cur, n; (n = sp.find(w => w.start === s.end)); s = n) out.push(', then ', word(n.level), \` until ${when(n.end, today)}\`);` | Lisboa reads "orange until Thu 12:00" and stops, but the file has yellow rough sea until Fri 09:00; Porto stops at Fri 00:00 with yellow until Fri 12:00 in the file. The sentence must not imply a warning ends when it does not. Shot 09. |
| 3 | Broadsheet, Chart room | `src/d/broadsheet/broadsheet.css` and `src/d/chart-room/chart-room.css`: add `body.d-broadsheet .skip{color:var(--accent-ink)}` and `body.d-chart-room .skip{color:var(--accent-ink);text-decoration:none}` | The designs' `body.d-* a{color:var(--ink)}` beats site.css `.skip`, so the focused skip link is ink on ink (1:1). Shot 03. |
| 4 | Chart room | `src/d/chart-room/chart-room.css`: add `@media (max-width:759px){body.d-chart-room .cr-cell{grid-template-columns:minmax(0,1fr)}body.d-chart-room .cr-day{grid-row:auto}}` and `body.d-chart-room .cr-fig{white-space:nowrap}` | At 390 px the day label takes 5.6 rem beside the bar, so figures wrap as "3 to 5" / "m". Day above the bar gives the bar and figures the full width (tested by injecting the rule: shots 04 before, 05 after). |
| 5 | Almanac, Glance | `src/d/almanac/index.html` and `src/d/glance/index.html`: `<html lang="en" data-theme="light">`; then delete the copied `--w-*`, `--map-edge`, `--hatch-*`, `--land`, `--fresh`, `--stale`, `--old` lines from `body.d-almanac` (almanac.css lines 11 to 13, keep `--land:#e9e1cc` if wanted) and `body.d-glance` (glance.css lines 8 to 10), and the `:root body.d-almanac .disclaimer` override | The values match today, but copies drift: section 2 says the level colours never change between designs, so they must come from `site.css` only, as Broadsheet and Chart room already do. |

## Polish (after release is fine)

- Night desk, `src/d/night-desk/night-desk.css` line 65: the forecast table is clipped inside its tile at 1366 px (Sunday cut, scroll needed on desktop). Give it the full row: `.nd-pair{grid-template-columns:minmax(0,1fr)}` or put "What changed" and the forecast one above the other. Shot 06 and 07.
- Night desk tiles: the read time wraps "UTC" onto its own line at both widths; drop the weekday or put the time on its own row (`.nd-kv`).
- Broadsheet "Today in figures": the large figures are set in the serif; the spec says data in the system sans. Either is defensible; if kept, say so in the spec.
- Wording: C's pages say "one of five designs of this site", D's say "one of six designs of the same data". Pick one (suggest "one of six designs of the same data", as the chooser counts the main design).
- Designs control on the main page reads "Designs: main"; use "Designs: The main design" to match the list. At 1366 px it sits on its own line under the NAV (D's note); drop the "Designs" NAV link, since the control links to `/d/`, and both fit on one line.
- Glance: the place card at the top has an empty rule above the sentence (the first `.gl-s` inside the chosen-place box keeps its `border-top`); add `border-top:0` for it.
- Almanac temperatures are rounded to whole degrees and joined with an en dash ("10–16°"). Rounding is said on Glance; say it in the Almanac's forecast caption too.
- Chart room station names in small caps turn IPMA's "De" into a capitalised word; it is IPMA's spelling, so leave the data and consider normal case for the station column only.
