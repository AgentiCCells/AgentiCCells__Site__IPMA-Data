// almanac.js: the Almanac design (/d/almanac/). A printed almanac page in tables: warnings by
// area and day (hatched swatch and word), one small map, a five-day forecast table, sea and UV
// tables. Same rules as the main pages: provenance() beside every chart, ageBanner() above it,
// a plain message when a file cannot be read, nothing guessed, averaged or interpolated.
// Reuses data.js, map.js and codes.js. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance D), 2026-11-18, round 2.

import { loadSource, ageBanner, provenance, loading, failure, fmtDay, h } from '/assets/js/data.js';
import { buildGrid, areaBase, areaMap, areaName, ORDER, levelsFor, warningWindows, lvl, swatch, levelWord, lisbonNow, currentWarnings } from '/assets/js/map.js';
import { uvBand } from '/assets/js/codes.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const IPMA_FC = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';
const IPMA_SEA = 'https://www.ipma.pt/en/maritima/costeira/';
const IPMA_UV = 'https://www.ipma.pt/en/otempo/prev.uv/';
// Eight places spread over the country and the islands; all 35 are on the Forecasts page.
const PLACES = ['Bragança', 'Porto', 'Coimbra', 'Lisboa', 'Évora', 'Faro', 'Funchal', 'Ponta Delgada'];
const $ = id => document.getElementById(id);
const fin = v => v !== null && v !== undefined && Number.isFinite(Number(v));
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const today = () => lisbonNow().slice(0, 10);
const shortDay = ymd => fmtDay(ymd).replace(/ \w+$/, ''); // "Wed 18"
const range = (a, b, unit = '') => !fin(a) && !fin(b) ? null : !fin(a) ? `max ${b}${unit}` : !fin(b) ? `min ${a}${unit}` : Number(a) === Number(b) ? `${a}${unit}` : `${a}–${b}${unit}`;
const regionOf = id => ({ 1: 0, 2: 1, 3: 2 })[String(id)[0]] ?? 3;

// The date line under the title: today in Portugal, not a figure from any file.
function masthead() {
  const d = new Date();
  const txt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  $('alm-date').textContent = `${txt}, Portugal time. Every figure below is IPMA's, as last read by PrompTugal.news's collector; each table says when.`;
}

// ---------- warnings: table by area and day, and the small map ----------
async function warnings() {
  const el = $('alm-warn'), mapEl = $('alm-map');
  const slow = loading(el, "IPMA's warnings");
  const [W, F] = await Promise.all([loadSource('ipma-warnings', { onSlow: slow }), loadSource('ipma-fire-risk')]);
  if (!W.latest.ok) { failure(el, "IPMA's warnings", W.latest, IPMA_WARN); failure(mapEl, "IPMA's warnings", W.latest, IPMA_WARN); return; }
  const D = W.latest.data;
  const wins = warningWindows().slice(1); // today, tomorrow, the day after (Portugal time)
  const by = wins.map(w => levelsFor(D.active, w));
  const areas = ORDER.filter(a => by.some(B => B[a].level !== 'green'));
  const types = items => [...new Set(items.map(w => w.type || w.type_pt).filter(Boolean))].join(', ');
  const cell = B => B.level === 'green'
    ? h('td', { class: 'none' }, 'none')
    : h('td', {}, lvl(B.level), h('span', { class: 'alm-type' }, types(B.items.filter(w => w.level === B.level))));
  const capTxt = `${areas.length} of 25 areas have a yellow, orange or red warning on one of these three days; the other ${25 - areas.length} have none (green). Each cell: the highest level that day and its type. Days in Portugal time, as IPMA gives them.`;
  const table = areas.length
    ? h('table', { class: 'alm-t alm-warn' }, h('caption', {}, capTxt),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Area'), wins.map(w => h('th', { scope: 'col' }, `${w.label.split(',')[0]}, ${shortDay(w.from.slice(0, 10))}`)))),
      h('tbody', {}, areas.map(a => h('tr', {}, h('th', { scope: 'row' }, areaName(a)), by.map(B => cell(B[a]))))))
    : h('p', {}, "No yellow, orange or red warning in IPMA's file for today or the next two days: every area is green.");
  const { ended } = currentWarnings(D.active);
  put(el, ageBanner(W.latest, { subject: 'These warnings', page: IPMA_WARN }), table,
    h('p', { class: 'alm-legend' }, ['green', 'yellow', 'orange', 'red'].map(l => h('span', {}, swatch(l), l === 'green' ? 'Green: none' : levelWord(l)))),
    ended ? h('p', { class: 'note' }, `${ended} spell${ended === 1 ? ' has' : 's have'} ended earlier; a day's cell still counts a spell that ended that day.`) : null,
    provenance(W));

  // The map: warnings in force now, each area at its highest level now.
  const G = F.latest.ok ? buildGrid(F.latest.data.municipalities) : null;
  const box = h('div', { class: 'mapbox alm-mapbox' });
  const now = warningWindows()[0];
  const lv = levelsFor(D.active, now);
  put(mapEl, box, h('p', { class: 'map-note' }, `In force now (${lisbonNow().slice(11, 16)} Portugal time): ${ORDER.filter(a => lv[a].level !== 'green').length} of 25 areas have a warning. `,
    G ? "Shape drawn from IPMA's 278 municipality points (ipma-fire-risk), so coasts and borders are approximate; " : 'Tiles, not geography: the file that gives the map its shape could not be read; ',
    'Madeira and the Azores are tiles, not to scale. The same warnings, by day, are in the table.'));
  const map = areaMap(box, areaBase(G), { label: 'Map of the 25 warning areas, each filled by its highest warning level in force now' });
  map.paint(Object.fromEntries(ORDER.map(a => [a, lv[a].level])), a => `${areaName(a)}: ${lv[a].level === 'green' ? 'no warning' : lv[a].level + ' warning'} in force now`);
}

// ---------- forecasts: five days for eight places ----------
async function forecasts() {
  const el = $('alm-fc');
  const slow = loading(el, "IPMA's forecasts");
  const src = await loadSource('ipma-city-forecasts', { onSlow: slow });
  if (!src.latest.ok) { failure(el, "IPMA's forecasts", src.latest, IPMA_FC); return; }
  const cities = src.latest.data.cities || [];
  const t = today();
  const dates = [...new Set(cities.flatMap(c => (c.days || []).map(d => d.date)))].filter(d => typeof d === 'string' && d >= t).sort().slice(0, 5);
  if (!dates.length) { put(el, ageBanner(src.latest, { page: IPMA_FC }), h('p', { class: 'status' }, "IPMA's forecast file holds no day from today onwards. Nothing is shown in its place."), provenance(src)); return; }
  const rows = PLACES.map(n => [n, cities.find(c => c.name === n)]);
  put(el, ageBanner(src.latest, { page: IPMA_FC }),
    h('table', { class: 'alm-t alm-fc' },
      h('caption', {}, 'Lowest to highest temperature (°C) and chance of rain, by day, as IPMA gives them. All 35 places are on the Forecasts page.'),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Place'), dates.map(d => h('th', { scope: 'col' }, shortDay(d))))),
      h('tbody', {}, rows.map(([n, c]) => h('tr', {}, h('th', { scope: 'row' }, n), dates.map(dt => {
        const d = c?.days?.find(x => x.date === dt);
        if (!d) return h('td', { class: 'none' }, c ? 'no value' : 'not in file');
        const tr = range(fin(d.t_min_c) ? Math.round(d.t_min_c) : null, fin(d.t_max_c) ? Math.round(d.t_max_c) : null, '°');
        return h('td', {}, h('span', { class: 'alm-v' }, tr ?? 'no value'), h('span', { class: 'alm-s' }, fin(d.rain_prob_pct) ? [h('span', { class: 'alm-w' }, 'rain '), `${Math.round(d.rain_prob_pct)}%`] : 'rain: none given'));
      }))))),
    provenance(src));
}

// ---------- sea: three days for the coastal places ----------
async function sea() {
  const el = $('alm-sea');
  const slow = loading(el, "IPMA's sea forecast");
  const src = await loadSource('ipma-sea', { onSlow: slow });
  if (!src.latest.ok) { failure(el, "IPMA's sea forecast", src.latest, IPMA_SEA); return; }
  const coasts = (src.latest.data.coasts || []).slice().sort((a, b) => regionOf(a.id) - regionOf(b.id) || (regionOf(a.id) === 0 ? b.lat - a.lat : a.id - b.id));
  const t = today();
  const dates = [...new Set(coasts.flatMap(c => (c.days || []).map(d => d.date)))].filter(d => typeof d === 'string' && d >= t).sort().slice(0, 3);
  if (!coasts.length || !dates.length) { put(el, ageBanner(src.latest, { page: IPMA_SEA }), h('p', { class: 'status' }, "IPMA's sea file holds no coastal place for today or later. Nothing is shown in its place."), provenance(src)); return; }
  put(el, ageBanner(src.latest, { page: IPMA_SEA }),
    h('table', { class: 'alm-t alm-sea' },
      h('caption', {}, `Total sea (IPMA's significant wave height, m), lowest to highest, by day; and sea surface temperature (°C) on ${shortDay(dates[0])}.`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Coast'), dates.map(d => h('th', { scope: 'col' }, shortDay(d))), h('th', { scope: 'col' }, 'Sea °C'))),
      h('tbody', {}, coasts.map(c => {
        const dd = dt => (c.days || []).find(x => x.date === dt);
        const d0 = dd(dates[0]);
        return h('tr', {}, h('th', { scope: 'row' }, String(c.name || 'unnamed').replace(/,\s*costa$/i, '')),
          dates.map(dt => { const d = dd(dt); const r = d ? range(d.sea_min_m, d.sea_max_m) : null; return h('td', r ? {} : { class: 'none' }, r ?? 'no value'); }),
          h('td', d0 && range(d0.sea_temp_min_c, d0.sea_temp_max_c) ? {} : { class: 'none' }, (d0 && range(d0.sea_temp_min_c, d0.sea_temp_max_c)) ?? 'no value'));
      }))),
    provenance(src, { note: 'IPMA places Porto Santo and Santa Cruz das Flores in the warning areas MCS and ACE in this file; they are listed here by island.' }));
}

// ---------- UV: by day for the same places where IPMA gives a UV value ----------
async function uv() {
  const el = $('alm-uv');
  const slow = loading(el, "IPMA's UV index");
  const src = await loadSource('ipma-uv', { onSlow: slow });
  if (!src.latest.ok) { failure(el, "IPMA's UV index", src.latest, IPMA_UV); return; }
  const places = (src.latest.data.places || []).filter(p => p.name && PLACES.includes(p.name)).sort((a, b) => PLACES.indexOf(a.name) - PLACES.indexOf(b.name));
  const t = today();
  const dates = [...new Set(places.flatMap(p => (p.days || []).map(d => d.date)))].filter(d => typeof d === 'string' && d >= t).sort().slice(0, 4);
  if (!places.length || !dates.length) { put(el, ageBanner(src.latest, { page: IPMA_UV }), h('p', { class: 'status' }, "IPMA's UV file holds none of these places for today or later. Nothing is shown in its place."), provenance(src)); return; }
  const missing = PLACES.filter(n => !places.some(p => p.name === n));
  put(el, ageBanner(src.latest, { page: IPMA_UV }),
    h('table', { class: 'alm-t alm-uv' },
      h('caption', {}, 'UV index by day and its WHO band. Where IPMA gives two values for a place and day, both are shown.'),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Place'), dates.map(d => h('th', { scope: 'col' }, shortDay(d))))),
      h('tbody', {}, places.map(p => h('tr', {}, h('th', { scope: 'row' }, p.name), dates.map(dt => {
        const vals = (p.days || []).filter(d => d.date === dt && fin(d.index)).map(d => Number(d.index));
        if (!vals.length) return h('td', { class: 'none' }, 'no value');
        const bands = [...new Set(vals.map(v => uvBand(v)?.name || 'no band'))];
        return h('td', {}, h('span', { class: 'alm-v' }, vals.join(' and ')), h('span', { class: 'alm-s' }, bands.join(', ').toLowerCase()));
      }))))),
    missing.length ? h('p', { class: 'note' }, `Not in IPMA's UV file: ${missing.join(', ')}.`) : null,
    provenance(src));
}

masthead();
warnings();
forecasts();
sea();
uv();
