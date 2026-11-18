// broadsheet.js: the Broadsheet design (/d/broadsheet/), a newspaper weather page. A headline
// sentence written only from values in IPMA's warnings file, the warnings map large in the first
// column, the warnings area by area, today's figures from the forecast file, and a dense five-day
// forecast table for every place. Read live from data.promptugal.news; nothing is guessed,
// rounded without saying so, averaged or smoothed. Design: team/rounds/1/design/PROPOSAL.md,
// section 4.1. ES module. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance C), 2026-11-18, round 2.

import { loadSource, ageBanner, provenance, loading, failure, fmtUTC, fmtDay, h } from '/assets/js/data.js';
import { AREAS, WEATHER_TYPES, WIND_CLASS } from '/assets/js/codes.js';
import { warningsBlock, warningTable, currentWarnings, lisbonNow, addDays, areaName, ORDER, levelWord, fmtPT } from '/assets/js/map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const IPMA_FC = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';
const LV = ['yellow', 'orange', 'red'];
const $ = id => document.getElementById(id);
const fin = v => typeof v === 'number' && Number.isFinite(v);
const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : t);
const typeOf = w => w.type || w.type_pt || 'a type not named';
const andList = a => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
// replaceChildren() would print null as text: drop empties first.
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "18:00 today", "06:00 tomorrow", or "Fri 20 Nov 00:00": IPMA's naive Portugal time against the
// Lisbon date now.
function when(t, now) {
  const d = t.slice(0, 10), today = now.slice(0, 10), hm = t.slice(11, 16);
  if (d === today) return `${hm} today`;
  if (d === addDays(today, 1)) return `${hm} tomorrow`;
  return fmtPT(t);
}

// The dateline: the reader's Lisbon date, not a data value.
function dateline() {
  const now = lisbonNow();
  const d = new Date(now.slice(0, 10) + 'T12:00:00Z');
  $('bs-date').textContent = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, Portugal date. Every figure below is IPMA's, read live from data.promptugal.news.`;
}

// ---------- the headline, from the warnings file only ----------
// The most severe level in force or upcoming; of its types, the one with most areas (then the
// earliest start). Every word that carries a fact comes from a field in the file.
export function headline(active, now = lisbonNow()) {
  const { rows } = currentWarnings(active, now);
  if (!rows.length) return { head: "No yellow, orange or red warning in IPMA's file", deck: ['Every one of the 25 warning areas is green for now and for the days the file covers.'] };
  const top = rows.reduce((m, w) => (LV.indexOf(w.level) > LV.indexOf(m) ? w.level : m), 'yellow');
  const tops = rows.filter(w => w.level === top);
  const groups = [...new Set(tops.map(typeOf))].map(t => {
    const ws = tops.filter(w => typeOf(w) === t);
    return { t, ws, areas: ORDER.filter(a => ws.some(w => w.area === a)), start: ws.map(w => w.start).sort()[0], end: ws.map(w => w.end).sort().pop() };
  }).sort((a, b) => b.areas.length - a.areas.length || a.start.localeCompare(b.start));
  const T = groups[0], n = T.areas.length;
  const inForce = T.areas.filter(a => T.ws.some(w => w.area === a && w.start <= now && w.end > now)).length;
  let timing;
  if (inForce === n) timing = 'in force now';
  else if (inForce > 0) timing = `in force now in ${inForce} of them`;
  else timing = (n === 1 || T.ws.every(w => w.start === T.start)) ? `from ${when(T.start, now)}` : `the first from ${when(T.start, now)}`;
  const head = `${cap(levelWord(top))} warning${T.ws.length === 1 ? '' : 's'} for ${T.t} ${n === 1 ? `in ${areaName(T.areas[0])}` : `in ${n} areas`}, ${timing}`;
  const deck = [];
  deck.push(n === 1
    ? `The ${top} spell ends ${when(T.end, now)} (Portugal time, as IPMA gives it).`
    : `${andList(T.areas.map(areaName))}. The last of these ${top} spells ends ${when(T.end, now)} (Portugal time, as IPMA gives it).`);
  // Lower-level spells of the same type that follow straight on (each starting where the last
  // ended) after the top-level spells in these areas: said, so the end above is not read as the
  // end of the warning.
  const after = [];
  for (const a of T.areas) {
    const sp = rows.filter(w => w.area === a && typeOf(w) === T.t);
    const seen = new Set();
    for (const top0 of sp.filter(w => w.level === top)) {
      for (let c = top0, nx; (nx = sp.find(w => !seen.has(w) && w !== top0 && w.start === c.end)); c = nx) {
        seen.add(nx);
        if (nx.level !== top) after.push({ a, w: nx });
      }
    }
  }
  if (after.length) {
    const lvls = LV.filter(l => after.some(x => x.w.level === l));
    const k = new Set(after.map(x => x.a)).size;
    const last = after.map(x => x.w.end).sort().pop();
    deck.push(n === 1
      ? `A ${andList(lvls)} warning for ${T.t} follows straight on, until ${when(last, now)}.`
      : `In ${k} of these areas a ${andList(lvls)} warning for ${T.t} follows straight on; the last of these ends ${when(last, now)}.`);
  }
  const types = [...new Set(rows.map(typeOf))].map(t => {
    const ws = rows.filter(w => typeOf(w) === t);
    const lv = ws.reduce((m, w) => (LV.indexOf(w.level) > LV.indexOf(m) ? w.level : m), 'yellow');
    return `${t} up to ${lv} in ${new Set(ws.map(w => w.area)).size}`;
  });
  const areasAll = new Set(rows.map(w => w.area)).size;
  const nowAreas = new Set(rows.filter(w => w.start <= now).map(w => w.area)).size;
  deck.push(`In all, IPMA's file lists ${rows.length} yellow, orange or red warning${rows.length === 1 ? '' : 's'} in force or upcoming in ${areasAll} of 25 areas (${andList(types)}). In force now: ${nowAreas} area${nowAreas === 1 ? '' : 's'}.`);
  return { head, deck };
}

async function warnings() {
  const headEl = $('bs-head'), deckEl = $('bs-deck'), block = $('warnings-block'), table = $('warnings-table');
  const slows = [loading(block, "IPMA's warnings"), loading(table, "IPMA's warnings")];
  deckEl.replaceChildren(h('p', { class: 'status loading', role: 'status' }, "Reading IPMA's warnings from data.promptugal.news..."));
  const [W, F] = await Promise.all([loadSource('ipma-warnings', { onSlow: () => { slows.forEach(f => f()); const p = deckEl.querySelector('.loading'); if (p) p.textContent = "Still reading IPMA's warnings: data.promptugal.news is slow to answer."; } }), loadSource('ipma-fire-risk')]);
  if (!W.latest.ok) {
    headEl.textContent = 'No headline today: the warnings file could not be read';
    failure(deckEl, "IPMA's warnings", W.latest, IPMA_WARN);
    failure(block, "IPMA's warnings", W.latest, IPMA_WARN);
    failure(table, "IPMA's warnings", W.latest, IPMA_WARN);
    return;
  }
  const D = W.latest.data;
  const { head, deck } = headline(D.active);
  // The age line goes above the headline when the file is stale or old: age before the claim.
  const age = ageBanner(W.latest, { subject: 'These warnings', page: IPMA_WARN });
  if (age) headEl.before(age);
  headEl.textContent = head;
  put(deckEl,
    deck.map((t, i) => h('p', { class: i === 0 ? 'bs-standfirst' : 'bs-deck' }, t)),
    h('p', { class: 'bs-credit' }, `Written by this page from IPMA's warnings file, read ${D.read_at ? fmtUTC(D.read_at) : 'at an unknown time'}. The source box follows the map.`));
  warningsBlock(block, W, F, { tableId: 'w-table-h' });
  put(table, warningTable(D.active), provenance(W));
}

// ---------- forecasts: today's figures and the dense table ----------
const REG = { mainland: 0, madeira: 1, azores: 2 };
const regionOf = c => AREAS[c.area]?.region || ({ 1: 'mainland', 2: 'madeira', 3: 'azores' })[String(c.id)[0]] || 'mainland';
const REG_NAME = { mainland: 'Mainland, north to south', madeira: 'Madeira', azores: 'Azores, east to west' };
const v1 = v => (fin(v) ? v.toFixed(1) : null);

function figures(el, src, cities, today) {
  const rows = cities.map(c => [c, (c.days || []).find(d => d.date === today)]).filter(([, d]) => d);
  if (!rows.length) { put(el, h('p', { class: 'status' }, `IPMA's forecast file holds no values for today (${fmtDay(today)}). Nothing is shown in their place.`), provenance(src)); return; }
  const ext = (key, pick) => {
    const xs = rows.filter(([, d]) => fin(d[key])); if (!xs.length) return null;
    const v = pick(...xs.map(([, d]) => d[key]));
    return { v, names: xs.filter(([, d]) => d[key] === v).map(([c]) => c.name) };
  };
  const hi = ext('t_max_c', Math.max), lo = ext('t_min_c', Math.min), rain = ext('rain_prob_pct', Math.max), wind = ext('wind_class', Math.max);
  const names = a => (a.length > 4 ? `${a.length} places` : andList(a));
  const item = (label, value, who) => h('div', { class: 'bs-fig' }, h('dt', {}, label), h('dd', {}, h('span', { class: 'bs-num' }, value), ' ', h('span', { class: 'bs-who' }, who)));
  put(el, h('dl', { class: 'bs-figs' },
    hi ? item('Highest maximum', `${v1(hi.v)} °C`, names(hi.names)) : item('Highest maximum', 'no value', 'in the file'),
    lo ? item('Lowest minimum', `${v1(lo.v)} °C`, names(lo.names)) : item('Lowest minimum', 'no value', 'in the file'),
    rain ? item('Highest chance of rain', `${rain.v}%`, `${rain.names.length} of ${rows.length} places`) : item('Highest chance of rain', 'no value', 'in the file'),
    wind ? item('Strongest wind class', (WIND_CLASS[wind.v] || `class ${wind.v}`).toLowerCase(), names(wind.names)) : item('Strongest wind class', 'no value', 'in the file')),
  h('p', { class: 'note' }, `For ${fmtDay(today)}, over the ${rows.length} places in IPMA's forecast file that have today. Wind is a class name only: IPMA gives no speed in this file.`),
  provenance(src));
}

function denseTable(el, src, cities, today) {
  const dates = [...new Set(cities.flatMap(c => (c.days || []).map(d => d.date)))].filter(d => typeof d === 'string' && d >= today).sort();
  if (!dates.length) { put(el, ageBanner(src.latest, { page: IPMA_FC }), h('p', { class: 'status' }, `Every day in IPMA's forecast file is before today (${fmtDay(today)}). Nothing is shown in its place.`), provenance(src)); return; }
  const sorted = cities.slice().sort((a, b) => REG[regionOf(a)] - REG[regionOf(b)] || (regionOf(a) === 'azores' ? b.lon - a.lon : b.lat - a.lat));
  const cell = (v, cls) => (v === null ? h('td', { class: `num none ${cls || ''}` }, 'none') : h('td', { class: `num ${cls || ''}` }, v));
  const body = [];
  let reg = null;
  for (const c of sorted) {
    if (regionOf(c) !== reg) { reg = regionOf(c); body.push(h('tr', { class: 'bs-region' }, h('th', { scope: 'colgroup', colspan: String(2 + dates.length * 3) }, REG_NAME[reg]))); }
    const td = (c.days || []).find(d => d.date === dates[0]);
    const wx = td && fin(td.weather_type) && td.weather_type > 0 ? WEATHER_TYPES[td.weather_type] : null;
    body.push(h('tr', {}, h('th', { scope: 'row' }, c.name), h('td', { class: 'bs-wx' }, wx || h('span', { class: 'muted' }, 'not given')),
      dates.flatMap((date, i) => {
        const d = (c.days || []).find(x => x.date === date);
        const first = i === 0 ? '' : 'bs-daystart';
        if (!d) return [h('td', { class: `num none ${first}`, colspan: '3' }, 'no value for this day')];
        return [cell(v1(d.t_min_c), first), cell(v1(d.t_max_c)), cell(fin(d.rain_prob_pct) ? `${d.rain_prob_pct}` : null)];
      })));
  }
  const table = h('table', { class: 'bs-dense' },
    h('caption', {}, `IPMA's daily forecast for ${cities.length} places, as given: minimum and maximum temperature in °C (tenths as in the file), and the chance of rain in %. Weather: IPMA's description for ${fmtDay(dates[0])}.`),
    h('thead', {},
      h('tr', {}, h('th', { scope: 'col', rowspan: '2' }, 'Place'), h('th', { scope: 'col', rowspan: '2' }, `Weather, ${fmtDay(dates[0])}`),
        dates.map((d, i) => h('th', { scope: 'colgroup', colspan: '3', class: `bs-day ${i ? 'bs-daystart' : ''}` }, d === today ? `Today, ${fmtDay(d)}` : fmtDay(d)))),
      h('tr', {}, dates.flatMap((d, i) => [h('th', { scope: 'col', class: `num ${i ? 'bs-daystart' : ''}` }, 'Min'), h('th', { scope: 'col', class: 'num' }, 'Max'), h('th', { scope: 'col', class: 'num' }, 'Rain %')]))),
    h('tbody', {}, body));
  const upd = cities.map(c => c.updated).filter(Boolean).sort().pop();
  put(el, ageBanner(src.latest, { page: IPMA_FC }),
    h('div', { class: 'bs-scroll', tabindex: '0', role: 'region', 'aria-label': 'Five-day forecast table, scrolls sideways on narrow screens' }, table),
    h('p', { class: 'note' }, "\"none\": IPMA's file gives no value there; nothing is filled in.", upd ? ` IPMA last updated these forecasts at ${upd.slice(11, 16)} UTC on ${fmtDay(upd.slice(0, 10))}.` : ''),
    provenance(src));
}

async function forecasts() {
  const fig = $('figures'), dense = $('forecast');
  const slows = [loading(fig, "IPMA's forecasts"), loading(dense, "IPMA's forecasts")];
  const src = await loadSource('ipma-city-forecasts', { onSlow: () => slows.forEach(f => f()) });
  if (!src.latest.ok) { failure(fig, "IPMA's forecasts", src.latest, IPMA_FC); failure(dense, "IPMA's forecasts", src.latest, IPMA_FC); return; }
  const cities = Array.isArray(src.latest.data.cities) ? src.latest.data.cities : [];
  if (!cities.length) { for (const e of [fig, dense]) put(e, h('p', { class: 'status' }, "IPMA's forecast file was read but lists no places. Nothing is shown in their place."), provenance(src)); return; }
  const today = lisbonNow().slice(0, 10);
  figures(fig, src, cities, today);
  denseTable(dense, src, cities, today);
}

dateline();
warnings().catch(e => failure($('warnings-block'), "IPMA's warnings", { error: `the page could not draw the file (${e.message})` }, IPMA_WARN));
forecasts().catch(e => failure($('forecast'), "IPMA's forecasts", { error: `the page could not draw the file (${e.message})` }, IPMA_FC));
