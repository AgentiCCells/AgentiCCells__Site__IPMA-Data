# IPMA data, drawn

Portugal's public weather data from IPMA (warnings, forecasts, station observations, fire risk, sea and UV), read live in the visitor's browser from https://data.promptugal.news and drawn as SVG, with the read time and the source card beside every chart. Also an archived Storm Charles page, a "how it works" diagram and a "use with AI" page with `llms.txt`. Not a warning service: follow IPMA and ANEPC.

- Live at https://ipma-data.agenticcells.site (version at /version.json).
- The site is static: `src/` holds the pages, `src/assets/site.css` and `src/assets/ipma.js` (no third-party code). The repository holds no IPMA data.
- Made by the AgentiCCells site factory from request `requests/2026-11-18__ipma-data/` in AgentiCCells__Site__Factory, seeded from AgentiCCells__Site__Template.
- Release: `scripts/release.sh` (build, validate, leak scan, then push to dev; CI deploys and tags v0.1.N).

Licences: code Apache-2.0; text CC BY 4.0. IPMA data stays under IPMA's terms and is not copied here.
