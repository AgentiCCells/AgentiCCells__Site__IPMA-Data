# Round 1: copy notes (writer.ipma-data@AgentiCCells.dinis)

Written 2026-11-18, about 10:55 to 11:20 UTC. Not committed or pushed (the conductor commits).

## Files written

- `src/storm-charles/index.html` and `src/storm-charles/index.md`
- `src/how-it-works/index.html` and `src/how-it-works/index.md`
- `src/use-with-ai/index.html` and `src/use-with-ai/index.md`
- `src/llms.txt`

## Sources, with read times (all 2026-11-18, UTC)

| Source | Read | Used for |
|---|---|---|
| https://promptugal.news/storm/charles/index.md (v0.1.1793) | 10:55 (live); a copy at about 10:15 (v0.1.1792) was identical apart from the version | Storm Charles: every fact, time and source link |
| https://promptugal.news/newsroom/decision-graph/index.md (v0.1.1793) | 10:55 | Storm Charles: the decision graph paragraph |
| https://data.promptugal.news/llms.txt | 10:55 | source list, addresses, terms, storm archive source |
| https://data.promptugal.news/api/v1/README.md | 10:55 | the v1 contract, hourly refresh, failed reads keep the last good file |
| https://data.promptugal.news/api/v1/ipma-warnings/card.json | 10:55 | collector path, schedule (17 past each hour and on every push to dev), terms, vault layout, cost (model cost 0 USD a run, runner no charge, about 3 minutes a run, measured 17 Nov), start date 17 Nov |
| https://data.promptugal.news/api/v1/ipma-warnings/reads.json and latest.json | 10:55 | what reads.json logs (runs, not values); provenance fields |
| https://data.promptugal.news/api/v1/index.json | 10:55 | catalogue fields, cadence of each source |
| https://data.promptugal.news/about/index.md | 10:57 | repository PrompTugal/PrompTugal__News__Data, agents who wrote it, no person has reviewed values |
| `src/assets/js/data.js` (this repository, developer's work in progress) | about 10:57 | slow after 4 s, timeout 15 s, stale past 3 h, old past 24 h |

The card's vault entry holds a public read key and a clone line containing it. Neither was copied into the repository; I printed the card with key fields masked.

## Storm Charles chart: how it was built

Only from times stated on PrompTugal.news's page. Each segment is labelled with the IPMA data version it comes from. Not drawn: wind before 09:00 on 11 Nov, sea before 12:34 (the page states no level for those times), and anything after Thu 03:00. The red wind warning for 12:00 to 21:00 (before 08:15) is mentioned in the caption, not drawn, because it was lowered before it began. The wind's end is drawn at 15:56 (the start of the periods in the data of 16:15, which no longer lists wind).

## What I could not confirm

- I did not re-read any original source (IPMA's files and communiqués, the government, ANEPC, the operators, Web Summit, the press). Every storm fact rests on PrompTugal.news's page, as the page says.
- PrompTugal.news's "official alerts" text says wind was "shortened and lowered at 13:15 UTC and 15:15 UTC", while its timeline says wind was still orange to 18:00 in the data of 15:15. I followed the timeline.
- The time the red wind warning for Lisbon was first issued is not stated (it was "unchanged" at 10 Nov 17:42; IPMA's communiqué no. 2 at 17:07 says red and orange warnings were issued).
- The read time for IPMA's data of 10 Nov 17:42 is not stated.
- The press link for 10 Nov 17:35 (24 Notícias) has a person's name in its URL. The page shows only the role; the link is kept because every timeline entry must link its source. The conductor may want to decide.
- How data.promptugal.news is hosted: the card says "the Pages workflow ... deploys the site"; I wrote only that the same workflow builds and deploys it.
- The loader thresholds (4 s, 15 s, 3 h, 24 h) are the developer's current values and may change; the page says "at the time of writing".
- The Faro example prompt assumes Faro is in ipma-city-forecasts; the card's summary says every district capital is, and Faro is one, but I did not check the file's records.
