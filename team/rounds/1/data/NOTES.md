# Round 1 data notes

By analyst.ipma-data@AgentiCCells.dinis, 18 November 2026. For the designer and the developer: what each file holds, what it can and cannot show, and when it is stale. Lookup tables are in `src/assets/js/codes.js`; fixtures and tests in `tests/`.

## What I read, and when (all times UTC, 18 November 2026)

| File | Read at | Note |
|---|---|---|
| `https://data.promptugal.news/api/v1/<id>/{latest,reads,card,openapi}.json` for the seven sources | 10:55:38 to 10:55:46 | Byte for byte the same size as the copies taken earlier; every latest.json carries `read_at` between 10:09:47 and 10:11:44 (the collector's run of about 10:11). |
| `https://data.promptugal.news/api/v1/README.md` (the API contract) | 10:55:46 | |
| `https://data.promptugal.news/api/v1/<id>/raw/<file>` (warnings, uv, observations) | 10:59 to 11:00 | The publisher's own files of the latest read, served by GET with CORS open (added to the contract on 18 November). |
| IPMA `https://api.ipma.pt/open-data/distrits-islands.json`, `weather-type-classe.json`, `wind-speed-daily-classe.json`, `precipitation-classe.json` | 10:55:46 | |
| IPMA `warnings_www.json`, `uv.json`, `sea-locations.json`, `hp-daily-sea-forecast-day0.json`, `observations.json` (direct) | 10:56 to 11:00 | To check what the collector keeps and drops. |
| IPMA pages: `https://api.ipma.pt/` (field documentation), `https://www.ipma.pt/pt/otempo/prev-sam/` and `/en/otempo/prev-sam/` (warnings, area names), `/en/enciclopedia/otempo/sam/` and `/pt/...` (level meanings), `/en/riscoincendio/rcm.pt/` (RCM labels), `/en/otempo/prev.uv/` | 10:56 to 10:59 | |
| WHO, "Radiation: the ultraviolet (UV) index" Q&A page | 11:01 | UV action bands. |

The cards' `vault` blocks carry a public sgit read key and a clone string; nothing from them is quoted here or in the fixtures.

## Things every page needs to know

- **The collector is not running hourly.** Every card says "hourly, at 17 minutes past each hour", but reads.json for all seven sources shows the same nine runs since the first read: 17 Nov 19:40, 19:44, 23:04, 23:07; 18 Nov 02:28, 09:43, 09:48, 10:08, 10:11 (UTC). None ran at :17. The gaps are 3 h 20 min, 3 h 21 min and 7 h 15 min. The runs look like pushes plus the odd scheduled run. So "stale" will be shown for hours at a time overnight; that is true and should stay visible, not be hidden.
- **reads.json is a log of collector runs, not past values.** Each run: `at`, `finished`, `ok`, `failed`, and per request `name`, `url`, `at`, HTTP `status`, `bytes`, `sha256_prefix` (16 hex) and `changed` (true, false, or the string `"first read"` on the very first run: a truthy string, so treat it as "first read", not "changed"). It can show: when the collector ran, whether each request succeeded, file sizes, and when IPMA's bytes changed (so roughly when IPMA updated). It cannot show any past value: no past warning, temperature or forecast. The dated copies of past bytes live only in the source's sgit vault (card.json `vault.layout`), which a browser page cannot read with a plain GET. No failed run is recorded yet (0 of 9 for every source). It is not known whether reads.json is capped; it held all 9 runs.
- **openapi.json schemas are inferred from one file** (`"x-inferred": true`): a field or label that was absent at that read (for example RCM levels 2 to 5, warning types other than rain and rough sea) is not described. Do not treat the schema as a full list of values.
- **Every latest.json** has `source`, `title`, `read_at` (UTC, Z), `provenance` {`source`, `page`, `read_at`, `by`, `terms`, sometimes `sources[]` and `source_pattern`} and `about`. `provenance.page` is IPMA's reader page, the right "see IPMA directly" link.
- **Every card.json** gives `title`, `what`, `publisher` ("IPMA, Instituto Português do Mar e da Atmosfera"; MeteoAlarm's says "MeteoAlarm (EUMETNET), from IPMA"), `reader_page`, `source_home`, `schedule.cadence` ("hourly") and `schedule.how`, `terms` {`summary`, `page` (https://api.ipma.pt/), `read_at` (2026-11-17), `quote` in Portuguese, `republish`, `open_question`}, `api`, `vault`, `split`, `cost`, `since`. Use `terms.summary` beside every chart. `split.people` says "no person has checked the values yet (not reviewed)": worth showing on the behind-the-scenes page.
- **IPMA's terms** (card `terms.summary`, all six IPMA sources): "free to copy and use for personal or public use if the use has no profit-making or offensive purpose; always name IPMA as the source." MeteoAlarm's card: re-users must name IPMA, keep the time of issue, link www.meteoalarm.org and publish MeteoAlarm's disclaimer (latest.json `attribution.disclaimer` carries the text). MeteoAlarm's terms were read on 2026-11-11 and not re-read since (card says so).
- **CORS**: data.promptugal.news answers `access-control-allow-origin: *` and `cache-control: max-age=600` (checked 10:58). api.ipma.pt also answers `*`, but the site reads data.promptugal.news only, as the brief says.

## ipma-warnings (read_at 2026-11-18T10:11:42Z)

Source: IPMA `warnings_www.json`; reader page https://www.ipma.pt/en/otempo/prev-sam/.

- `counts`: `active` 32, `by_level` {yellow 25, orange 7} (no red), `green` 200, `areas` 25. **`green` counts entries, not areas**: IPMA's file has one green entry for every area and type (25 areas x 8 types = 200), including types that also have a yellow or orange spell. Do not show "200 areas green".
- `active[]`, one per spell of yellow, orange or red: `area` (IPMA code, see the table below), `area_name` (as the collector names it), `type` (English label set by the collector: only "rough sea" and "rain" seen), `type_pt` (IPMA's own name: "Agitação Marítima", "Precipitação"), `level` (yellow, orange, red), `start`, `end`, `text` (IPMA's Portuguese text; filled for every active spell).
- **Times are Portugal local time with no zone** (`2026-11-18T18:00:00`). In winter mainland and Madeira local time equals UTC: the orange rough sea spell for Aveiro starts 18:00 here and at 18:00Z in MeteoAlarm's CAP message, which agrees. For the Azores (UTC-1 in winter) I could not confirm whether IPMA writes Azores or Lisbon time: no Azores warning was active, and the green Azores entries start at 19:16 on 17 Nov, unlike the mainland's 07:19. Show the times as given with "Portugal time" and do not convert them.
- **The first spell starts at the file's issue time**, not at the real onset: Aveiro's yellow rough sea starts 07:19 here, but 03:00Z in MeteoAlarm. "From 07:19" means "in force when IPMA issued this file".
- One area can have several spells of the same type in sequence (yellow, then orange, then yellow). At the read: 13 areas had a spell somewhere in the file (7 reaching orange: AVR, BRG, CBR, LRA, LSB, PTO, VCT); 8 had one in force at 10:11 (all yellow). The latest `end` is 2026-11-20T12:00. IPMA's own page colours each area by its highest level over the whole period (Aveiro "Orange" while its in-force spell was yellow), so say which you show.
- Only active areas appear; the other 12 areas (and every name for Madeira and the Azores) come from `AREAS` in codes.js.
- reads.json: 9 runs, 3 with changed bytes (first read, 23:04 and 09:43): IPMA reissued overnight and in the morning.

### The 25 warning areas

Codes from IPMA's `warnings_www.json` (all 25 present, read 10:56). Names from IPMA's warnings page (Portuguese and English versions, read 10:57). Districts and region from `distrits-islands.json` (`idDistrito`, `idRegiao` 1 mainland, 2 Madeira, 3 Azores, read 10:55), for the 21 codes that file lists. MCN and MRM are in no API file except the warnings: their names come only from the warnings page.

| Code | IPMA name (pt) | IPMA name (en) | Region | DICO district |
|---|---|---|---|---|
| AVR | Aveiro | Aveiro | mainland | 01 |
| BJA | Beja | Beja | mainland | 02 |
| BRG | Braga | Braga | mainland | 03 |
| BGC | Bragança | Bragança | mainland | 04 |
| CBO | Castelo Branco | Castelo Branco | mainland | 05 |
| CBR | Coimbra | Coimbra | mainland | 06 |
| EVR | Évora | Évora | mainland | 07 |
| FAR | Faro | Faro | mainland | 08 |
| GDA | Guarda | Guarda | mainland | 09 |
| LRA | Leiria | Leiria | mainland | 10 |
| LSB | Lisboa | Lisboa | mainland | 11 |
| PTG | Portalegre | Portalegre | mainland | 12 |
| PTO | Porto | Porto | mainland | 13 |
| STM | Santarém | Santarém | mainland | 14 |
| STB | Setúbal | Setúbal | mainland | 15 |
| VCT | Viana do Castelo | Viana do Castelo | mainland | 16 |
| VRL | Vila Real | Vila Real | mainland | 17 |
| VIS | Viseu | Viseu | mainland | 18 |
| MCN | Madeira-Costa Norte | Madeira - North Coast | Madeira | none |
| MRM | Madeira-R. Montanhosas | Madeira - Mountain | Madeira | none |
| MCS | Madeira-Costa Sul | Madeira - South Coast | Madeira (Funchal, idDistrito 31) | none |
| MPS | Madeira-Porto Santo | Madeira - Porto Santo | Madeira (Porto Santo, idDistrito 32) | none |
| AOC | Açores - G. Ocidental | Azores - Ocidental G. | Azores (Flores 48, Corvo 49) | none |
| ACE | Açores - G. Central | Azores - Central G. | Azores (Terceira 43, Graciosa 44, São Jorge 45, Pico 46, Faial 47) | none |
| AOR | Açores - G. Oriental | Azores - Oriental G. | Azores (Santa Maria 41, São Miguel 42) | none |

The island names in brackets are those of the places `distrits-islands.json` lists for each code (Vila do Porto, Ponta Delgada; Angra do Heroísmo, Santa Cruz da Graciosa, Velas, Madalena, Horta; Santa Cruz das Flores, Vila do Corvo). MeteoAlarm writes the Azores groups out in full ("Açores - Grupo Ocidental", "Grupo Central") with EMMA ids PT001, PT002: a separate code system, not to be mixed with IPMA's.

**Two IPMA files disagree on area for islands**: `sea-locations.json` puts the Porto Santo coast in MCS (not MPS) and the Santa Cruz das Flores coast in ACE (not AOC), and ipma-sea latest.json repeats that. Do not join sea places to warnings by `area` for those two; join by island.

### DICO district to warning area

Confirmed: `distrits-islands.json` gives `idDistrito` 1 to 18 with `idAreaAviso`, and for all 24 mainland places it lists, the DICO code `idDistrito`+`idConcelho` (two digits each) exists in ipma-fire-risk latest.json at the same coordinates (22 identical to four decimals; Sagres sits in 0815 and Penhas Douradas in 0908, whose municipal points differ, as expected for a village that is not the seat). IPMA's API page says DICO is the municipality code "de acordo com a CAOP - DGT".

01 AVR, 02 BJA, 03 BRG, 04 BGC, 05 CBO, 06 CBR, 07 EVR, 08 FAR, 09 GDA, 10 LRA, 11 LSB, 12 PTG, 13 PTO, 14 STM, 15 STB, 16 VCT, 17 VRL, 18 VIS. (`DICO_TO_AREA` and `areaForDico()` in codes.js.)

Municipalities per district in the fire-risk file: 01:19, 02:14, 03:14, 04:12, 05:11, 06:17, 07:14, 08:16, 09:14, 10:16, 11:16, 12:15, 13:18, 14:21, 15:13, 16:10, 17:14, 18:24 (278 in all).

## ipma-city-forecasts (read_at 2026-11-18T10:09:47Z)

Source: IPMA `cities/daily/{globalIdLocal}.json`, one file per place; reader page https://www.ipma.pt/en/otempo/prev.localidade.hora/.

- `counts`: places 35, read 35.
- `cities[]`: `id` (IPMA globalIdLocal), `name`, `area` (warning area code), `lat`, `lon`, `source` (that place's file), `read_at` (UTC, per place), `updated` (IPMA's `dataUpdate`, no zone; IPMA's API page says forecasts are given in UTC; all 35 said 2026-11-18T09:31:02), `days[]`.
- `days[]` (5 each, 18 to 22 Nov): `date` (YYYY-MM-DD), `t_min_c`, `t_max_c` (°C), `rain_prob_pct` (%), `weather_type` (IPMA idWeatherType: seen 2, 3, 4, 5, 6, 7, 8, 9, 10, 11; `WEATHER_TYPES`), `wind_dir` (compass letters N to NW), `wind_class` (1 to 4, seen 1 and 2; `WIND_CLASS`; a class name only, no speed), `rain_class` (0 to 3, seen 1 to 3; `RAIN_CLASS`). **`rain_class` is null on 63 of 175 place-days**, the days with little or no rain chance: null means "no class given", not 0.
- Places: 18 district capitals, plus Guimarães (BRG), Sagres, Portimão, Loulé (FAR), Penhas Douradas (GDA), Sines (STB); Funchal (MCS), Porto Santo (MPS); nine Azores places (AOR 2, ACE 5, AOC 2). No place for MCN or MRM.
- IPMA updates twice a day (00 UTC run, usually from 10:00; 12 UTC run, usually from 20:00: IPMA's API page). reads.json: 9 runs, 36 requests each (35 places plus distrits-islands.json), 4 runs with changed bytes.

## ipma-observations (read_at 2026-11-18T10:11:24Z)

Source: IPMA `observations.json` and `stations.json`; reader page https://www.ipma.pt/en/otempo/obs.superficie/.

- `hour_utc` "2026-11-18T09:00:00Z": the latest hour in IPMA's feed (the data site says UTC; IPMA's API page gives the key as "data/hora da observação" without a zone). About 70 minutes behind the read. `hours_in_feed` 24: IPMA's file holds the last 24 hours; latest.json keeps only the last.
- `counts`: stations 227, reporting 124.
- `stations[]`: `id`, `name` (IPMA's, e.g. "Flores (Aeródromo)"), `lat`, `lon` (every station has a position: mainland 177, Madeira 22 including Ilhas Selvagens, Azores 28), `reading` or **null when the station sent nothing that hour (103 of 227)**.
- `reading`: `temp_c` (hourly mean at 1.5 m, °C), `humidity_pct` (hourly mean, %), `wind_kmh` (at 10 m, km/h: IPMA's `intensidadeVentoKM`; IPMA also gives m/s, dropped), `wind_dir_id` (IPMA class: 0 no direction, 1 or 9 N, 2 NE, 3 E, 4 SE, 5 S, 6 SW, 7 W, 8 NW; confirmed on IPMA's API page; `WIND_DIR_ID`), `rain_mm` (accumulated in the hour), `pressure_hpa` (hourly mean reduced to sea level), `radiation_kj_m2`. IPMA's -99 is already null. Nulls among the 124 readings: pressure 67, radiation 59, wind speed 29, rain 24, humidity 10, temperature 8, wind direction 0. **wind_dir_id 0 (31 stations) means no direction, not north.** Ranges at the read: 10.3 to 23.1 °C, 52 to 100 %, 0 to 39.2 km/h, 0 to 2.6 mm, 1011.3 to 1022.1 hPa, 0 to 805.1 kJ/m².
- **The latest hour is always the emptiest**: stations report late. In the raw file read at 10:11, 09:00 had 124 readings, 08:00 had 130 and 10:00 the day before 188. An hour later IPMA's file had 134 for 09:00. So "103 stations silent" partly means "not in yet". The raw file (`api/v1/ipma-observations/raw/observations.json`, 723 KB, CORS open) holds all 24 hours for every station.
- The count of reporting stations fell steadily over the 24 hours (188 to 124): worth a line, not a claim of cause.

## ipma-fire-risk (read_at 2026-11-18T10:11:17Z)

Source: IPMA `rcm/rcm-d0.json`, `-d1`, `-d2`; reader page https://www.ipma.pt/en/riscoincendio/rcm.pt/.

- `files[]`: `d` (0, 1, 2), `date` (2026-11-18, -19, -20), `run` (model run date, 2026-11-17), `file_date` ("2026-11-18 09:35:01", IPMA's file time: IPMA's RCM page labels it UTC), `source`.
- `counts`: municipalities 278, `today_by_level` {low: 278}. The keys are levels seen; others will appear only when present.
- `municipalities[]`: `dico` (four digits: district then municipality), `lat`, `lon` (IPMA's point for the municipality), `days[]` of `date`, `rcm` (1 to 5), `level` (collector's label: only "low" seen). **No municipality names in the file**: name by DICO only, or by district via `areaForDico()`. Mainland only: no Madeira or Azores.
- At the read every municipality was class 1 on all three days, as expected in November rain. A map would be a single colour: say so in words rather than draw an empty map.

## ipma-sea (read_at 2026-11-18T10:11:29Z)

Source: IPMA `hp-daily-sea-forecast-day0..2.json` and `sea-locations.json`; reader page https://www.ipma.pt/en/maritima/costeira/.

- `files[]`: `d`, `date` (18 to 20 Nov), `source`. **IPMA's `dataUpdate` is dropped** (IPMA's day-0 file said 10:31:01 at 10:59, so it had already been updated after the read).
- `coasts[]` (12): `id`, `name` ("Lisboa, costa"), `area`, `lat`, `lon` (from the forecast file; they differ slightly from sea-locations.json), `days[]` (3).
- `days[]`: `waves_min_m`, `waves_max_m` = IPMA `waveHighMin/Max`, **the swell height** (IPMA: "altura da ondulação (swell)"); `sea_min_m`, `sea_max_m` = IPMA `totalSeaMin/Max`, **the significant wave height** ("altura significativa das ondas"). The latest.json `about` calls the first "significant wave height", which is the other one: label them "swell" and "total sea" as IPMA does. `wave_period_min_s`, `wave_period_max_s` (peak period of the swell, s), `wave_dir` (N to NW; seen NW, W, N), `sea_temp_min_c`, `sea_temp_max_c` (sea surface, °C). No nulls.
- **Period min is above max on 10 of 36 place-days** (e.g. Horta 18 Nov: 10.2 s min, 9.9 s max). It is in IPMA's own file; the max looks capped just under 10 s. Show both as given and do not compute a mean.
- Places: 7 mainland, Funchal and Porto Santo, Ponta Delgada, Horta, Santa Cruz das Flores.

## ipma-uv (read_at 2026-11-18T10:11:39Z)

Source: IPMA `uv/uv.json` and `distrits-islands.json`; reader page https://www.ipma.pt/en/otempo/prev.uv/.

- `counts`: places 28. `places[]`: `id` (globalIdLocal), `name` (null where not in IPMA's list), `days[]` of `date` (4 days, 18 to 21 Nov: one more than IPMA's documentation says), `index` (UV index, decimal: 0.2 to 3.8 at the read), `period` (IPMA's `idPeriodo`, "internal code of the period": always 10), `hours` (IPMA's `intervaloHora`: **always null**; IPMA's file has an empty string).
- Quirks: place **id 0** has no name and **ten values a day** (40 rows); IPMA documents no place 0. **1081525** has no name (not in distrits-islands.json; no IPMA file we read names it). **Aveiro, Leiria and Santarém have two values each day** with nothing to tell them apart (Aveiro 18 Nov: 0.6 and 0.7). Show place 0 and 1081525 as "unnamed in IPMA's file" or leave them out, and for the doubled places show both values (a range), never an average.
- Bands: `UV_BANDS` and `uvBand()` in codes.js (WHO names; IPMA's lower bounds 1, 3, 6, 8, 11 applied to decimals; values under 1 count as Low).

## meteoalarm-pt (read_at 2026-11-18T10:11:44Z), context only

Source: MeteoAlarm's CAP feed for Portugal, https://feeds.meteoalarm.org/api/v1/warnings/feeds-portugal; reader page https://www.meteoalarm.org/en/live/region/PT.

- `attribution` {`national_service`, `meteoalarm`, `disclaimer`}: show all, as MeteoAlarm's terms ask. `sha256_prefix`, `bytes`, `counts` {messages 58, not_expired 32}, `changes` {`since`, `appeared[]`, `left[]`: both empty at the read}.
- `messages[]`: `id`, `sent_utc` (time of issue: keep it beside any message), `msg_type` (Alert 17, Update 41), `replaces` (list of {id, sent_utc} or **null**), `area` (MeteoAlarm's name), `emma` (PT001 to PT022), `level` (yellow 51, orange 7), `hazard` ("Rain" 34, "coastalevent" 24: inconsistent casing, as in the feed), `event`, `event_national` ("Aviso Amarelo Precipitação"), `onset_utc`, `expires_utc`, `severity`, `certainty`, `urgency`, `text` (English), `sender`, `h` (a short hash).
- The feed keeps expired messages back to 13 Nov: filter by `expires_utc` before showing anything as current. Times here are UTC (unlike IPMA's warnings file).

## Staleness

data.js marks a file stale when `read_at` is over 3 hours old and old when over 24 hours. **Keep that rule for the read age of every source**: it measures whether the collector is running, and the cards promise hourly runs. Given the gaps seen (up to 7 h 15 min overnight), "stale" will often be true and should be shown plainly.

Proposal: also check the age of the content, which can be old even when the read is fresh. Per source:

| Source | Content time | Proposal |
|---|---|---|
| ipma-warnings | none in latest.json | Mark any spell whose `end` (Portugal time) has passed as ended and leave it off the current map. Old when the read is over 12 hours: IPMA reissues warnings at least twice a day (issue times 07:19 and 19:16 seen), so a half-day-old list should not be shown as current. |
| ipma-city-forecasts | `updated` (UTC) | Drop days before today (Lisbon date). Stale when `updated` is over 14 hours old (IPMA's two runs a day, plus slack). |
| ipma-observations | `hour_utc` | Stale when `hour_utc` is over 3 hours old (normal lag about 70 minutes); old over 24 hours (beyond IPMA's own feed). Say the latest hour is incomplete. |
| ipma-fire-risk | `files[].date`, `file_date` | Label days by date, never "today", unless `files[0].date` is today's Lisbon date. |
| ipma-sea | `files[].date` only | As fire risk. |
| ipma-uv | `days[].date` | Drop past dates. |
| meteoalarm-pt | `sent_utc`, `expires_utc` | Treat messages past `expires_utc` as expired. |

## What can be drawn

**Warnings.** Supported: a map of the 25 areas coloured by the highest level in force now, or over the file's period (say which); a timeline per area (bars from `start` to `end`, coloured by level, one row per type) up to 20 Nov 12:00; counts by level and type; the text of each spell in Portuguese. Not supported: any past warning (reads.json has no values), the real onset of the first spell (it is clipped to the issue time), an Azores timeline in UTC (zone unconfirmed), and any English text (the texts are Portuguese only; MeteoAlarm has English text for the same spells).

**Forecasts.** Supported: per place, a five-day strip of min and max temperature (a range bar), rain chance (%), weather type as IPMA's description, wind direction letter and class name; a small-multiples grid of all 35 places; a map of places coloured by today's max temperature. Not supported: hourly curves (daily values only), wind speed in km/h (class names only), rain amounts (class only, and null on dry days), anything for MCN or MRM.

**Observations.** Supported: a station map (227 positions) with the latest hour's temperature, wind arrow (only where `wind_dir_id` is 1 to 9) and rain; a ranked strip of the hottest, wettest and windiest stations; a count of reporting and silent stations. With the raw file (723 KB) a 24-hour line per station is possible. Not supported from latest.json: trends or history; pressure and radiation maps (over half are null); reading silence as a fault (most silent stations are late, not broken).

**Fire risk.** Supported: a dot map of 278 municipality points by class for each of three days, or a count per class per day (all 278 low at the read); grouping by district through DICO. Not supported: municipality names, Madeira or the Azores, or a filled choropleth without boundaries (see the map method below).

**Sea.** Supported: per coast, three days of swell and total sea as min-max range bars in metres, swell period, wave direction arrow, sea temperature range. Not supported: hourly sea state, a mean period (min and max cross), and joining Porto Santo and Flores to their warning areas by the `area` field.

**UV.** Supported: four days of UV index by named place, banded by WHO category, shown as a value or a range where IPMA gives two. Not supported: the hours of maximum UV (`hours` is null), place 0 and 1081525 by name, or any value of "Very high" at this time of year (max 3.8).

**MeteoAlarm.** Supported: a table of the current CAP messages beside IPMA's warnings, with time of issue and MeteoAlarm's disclaimer; the "appeared / left since the last read" note. Not supported: a full history (the feed holds only recent messages, and reads.json has no values).

**Collector runs (all sources).** Supported: a strip of runs from reads.json (ok, failed, bytes changed), and the gaps between runs. Not supported: past values.

## How to draw the warning map without copying geometry

No boundary file enters the repository. Everything is computed in the browser from points read live.

1. **Mainland (18 areas).** Fetch ipma-fire-risk latest.json (already needed for the fire page): 278 municipality points with `lat`, `lon` and `dico`. Project with a simple equirectangular projection scaled by cos(39.5°) for longitude (mainland spans 37.0 to 42.1 °N, 9.43 to 6.27 °W). Assign each point to its area with `areaForDico(dico)`. Then either:
   - **dot map** (the simplest and most honest): one circle per municipality, filled with its area's level; or
   - **approximate districts**: a Voronoi diagram of the 278 points (a small Delaunay routine, or d3-delaunay from a CDN, which is code, not geometry), each cell clipped to a circle of about 15 km round its point so the coast and border are not invented far out, cells of the same area merged by sharing a fill and dropping internal strokes. Label it "approximate shapes drawn from IPMA's municipality points, not official boundaries".
2. **Madeira (4 areas)** and **the Azores (3 areas)**: insets. The Azores groups can be drawn from the island points in `distrits-islands.json` via ipma-city-forecasts (`cities[]` with `area` AOC, ACE, AOR and `lat`/`lon`), one labelled circle per island grouped by area. Madeira has points only for Funchal (MCS) and Porto Santo (MPS); **MCN and MRM have no coordinates in any file**, so draw Madeira's four areas as four labelled tiles (north coast above, mountains in the middle, south coast below, Porto Santo to the north-east), with a note that the layout is schematic.
3. Colour from `WARNING_LEVELS`; green where an area has no spell; grey with "no data" when the file could not be read.

## Files in tests/

`tests/fixtures/`: six cuts of latest.json (warnings, forecasts, observations, fire risk, sea, UV), each under 2.4 KB, each with a `fixture` line naming its source file, read time, IPMA as the source and IPMA's terms. `tests/data.test.mjs`: 11 tests (codes cover every area, weather type, wind and rain class, RCM level, wind direction and UV value in the fixtures; DICO mapping; staleness at 0, 60, 180, 181, 1440, 1441 minutes and unknown). Run `node --test` or `node --test tests/*.test.mjs` from the repository root: on Node 22, `node --test tests/` fails because Node reads the folder as a module name (a Node behaviour, not a test failure).
