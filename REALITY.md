# REALITY.md: what exists now

- Seeded by the AgentiCCells site factory on 2026-11-18 from AgentiCCells/AgentiCCells__Site__Template@dev; the factory's first pass is 0262f7e (its live state: requests/2026-11-18__ipma-data/status.json in AgentiCCells__Site__Factory).
- From 2026-11-18, about 11:00 UTC, the cell conductor.ipma-data@AgentiCCells.dinis runs a team of six roles as sub-agents in one session (conductor, analyst, designer, developer, writer, reviewer): roles, policies (status: proposal), scopes and workflow in `team/`, round reports in `team/rounds/`.
- Round 1 (live from v0.1.3): every page on a shared layout with the disclaimer, link previews and a Markdown twin; the six IPMA sources and MeteoAlarm read live in the browser from data.promptugal.news, each chart with IPMA named, the read time and the card's terms, and plain messages when a file is missing, stale or slow; a hex map of the warning areas built in the browser from IPMA's 278 municipality points (no geometry in the repository); Storm Charles as an archived event summarising PrompTugal.news's page; How it works as a diagram; Use with AI and llms.txt; /behind-the-scenes/ generated at build time from team/ and git log.
- Round 2: five designs under /d/ (Broadsheet, Chart room, Night desk, Almanac, Glance) with a chooser and a designs control on every page; a share card per page and per design.
- Not yet true: a check in a real screen reader, Firefox or Safari.
- Known facts about the data that the pages state: the collector's runs are irregular (gaps of several hours), so pages often show "stale"; reads.json logs runs, not past values; the fire-risk file has no municipality names.
- The repository holds no IPMA data beyond six small test fixtures in `tests/fixtures/`.
