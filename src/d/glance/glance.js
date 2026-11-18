// glance.js: the Glance design (/d/glance/). Phone first: a place picker at the top, one
// sentence per place written only from values in IPMA's files (warnings for the place's warning
// area, today's temperature range and chance of rain), a small map, and every source's read age
// at the foot. Same rules as the main pages: provenance() beside every chart, ageBanner() above,
// plain failure messages, levels as words beside hatched swatches, nothing guessed.
// Reuses data.js, map.js and codes.js. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance D), 2026-11-18, round 2.

import { loadSource, ageBanner, provenance, loading, failure, staleness, fmtUTC, fmtDay, h } from '/assets/js/data.js';
import { buildGrid, areaBase, areaMap, areaName, ORDER, levelsFor, warningWindows, currentWarnings, swatch, levelWord, lisbonNow } from '/assets/js/map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const IPMA_FC = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';
const FIVE = ['Porto', 'Lisboa', 'Faro', 'Funchal', 'Ponta Delgada'];
const DEFAULT_ID = '1110600'; // Lisboa
const KEY = 'glance-place';
const $ = id => document.getElementById(id);
const fin = v => v !== null && v !== undefined && Number.isFinite(Number(v));
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const REGIONS = [['1', 'Mainland, north to south'], ['2', 'Madeira'], ['3', 'Azores']];

// "18:00" when the time is today (Portugal), otherwise "Thu 06:00". IPMA's times have no zone:
// they are Portugal time and are shown as given.
const when = (t, today) => typeof t !== 'string' || t.length < 16 ? 'an unknown time' : t.slice(0, 10) === today ? t.slice(11, 16) : `${fmtDay(t.slice(0, 10)).split(' ')[0]} ${t.slice(11, 16)}`;
const word = l => h('span', { class: 'gl-lvl' }, swatch(l), levelWord(l).toLowerCase());

// The warnings part of a place's sentence: per type, the spell in force now (and the one straight
// after it, if any), or the next one to start. At most two types; the rest are counted.
function warnPart(W, area) {
  if (!W?.latest?.ok) return ['Warnings could not be read.'];
  const now = lisbonNow(), today = now.slice(0, 10);
  const rows = currentWarnings(W.latest.data.active, now).rows.filter(w => w.area === area);
  if (!rows.length) return ['No warning.'];
  const types = [...new Set(rows.map(w => w.type || w.type_pt))];
  const out = [];
  types.slice(0, 2).forEach((type, i) => {
    const sp = rows.filter(w => (w.type || w.type_pt) === type).sort((a, b) => a.start.localeCompare(b.start));
    const cur = sp.find(w => w.start <= now);
    const lead = i ? '; ' : '';
    if (cur) {
      const next = sp.find(w => w.start === cur.end);
      out.push(lead, word(cur.level), ` for ${type} until ${when(cur.end, today)}`);
      if (next) out.push(', then ', word(next.level), ` until ${when(next.end, today)}`);
    } else {
      out.push(lead, word(sp[0].level), ` for ${type} from ${when(sp[0].start, today)}`);
    }
  });
  out.push('.');
  if (types.length > 2) out.push(` ${types.length - 2} more type${types.length - 2 === 1 ? '' : 's'} of warning: see the Warnings page.`);
  return out;
}

// The forecast part: today's lowest and highest temperature and chance of rain, as IPMA gives them.
function fcPart(city) {
  const today = lisbonNow().slice(0, 10);
  const d = (city.days || []).find(x => x.date === today);
  if (!d) return ['No forecast for today in the file.'];
  const t = fin(d.t_min_c) && fin(d.t_max_c) ? `${Math.round(d.t_min_c)} to ${Math.round(d.t_max_c)}°.` : 'No temperature given for today.';
  const r = fin(d.rain_prob_pct) ? ` Rain ${Math.round(d.rain_prob_pct)}%.` : ' No chance of rain given.';
  return [t, r];
}

function sentence(city, W, tag = 'li') {
  const an = areaName(city.area);
  return h(tag, { class: 'gl-s' },
    h('strong', { class: 'gl-name' }, city.name), an && an !== city.name ? h('span', { class: 'gl-area' }, ` (${an} area)`) : null, ': ',
    ...warnPart(W, city.area), ' ', ...fcPart(city));
}

const sortCities = cs => cs.slice().sort((a, b) => String(a.id)[0].localeCompare(String(b.id)[0]) || (String(a.id)[0] === '1' ? b.lat - a.lat : a.id - b.id));

function readPlace(cities) {
  let id = new URLSearchParams(location.search).get('place');
  if (!id) { try { id = localStorage.getItem(KEY); } catch { id = null; } }
  return cities.find(c => String(c.id) === String(id)) || cities.find(c => String(c.id) === DEFAULT_ID) || cities[0];
}

async function places(W) {
  const mine = $('gl-mine'), list = $('gl-list'), sel = $('gl-place');
  const slow = loading(list, "IPMA's forecasts");
  const F = await loadSource('ipma-city-forecasts', { onSlow: slow });
  if (!F.latest.ok) {
    failure(list, "IPMA's forecasts", F.latest, IPMA_FC);
    put(mine, h('p', { class: 'muted' }, 'The places come from the forecast file, which could not be read.'));
    sel.replaceChildren(h('option', {}, 'Places could not be read')); return;
  }
  const cities = sortCities((F.latest.data.cities || []).filter(c => c && c.name && c.id));
  if (!cities.length) { put(list, h('p', { class: 'status' }, "IPMA's forecast file lists no places. Nothing is shown in their place."), provenance(F)); return; }
  sel.replaceChildren(...REGIONS.map(([k, label]) => h('optgroup', { label }, cities.filter(c => String(c.id)[0] === k).map(c => h('option', { value: String(c.id) }, c.name)))));
  sel.disabled = false;
  const show = c => {
    sel.value = String(c.id);
    put(mine, sentence(c, W, 'p'));
  };
  show(readPlace(cities));
  sel.addEventListener('change', () => {
    const c = cities.find(x => String(x.id) === sel.value); if (!c) return;
    show(c);
    try { localStorage.setItem(KEY, String(c.id)); } catch { /* storage may be blocked: the URL keeps the choice */ }
    const u = new URL(location.href); u.searchParams.set('place', String(c.id)); history.replaceState(null, '', u);
  });
  const five = FIVE.map(n => cities.find(c => c.name === n)).filter(Boolean);
  const rest = cities.filter(c => !five.includes(c));
  put(list,
    ageBanner(F.latest, { subject: 'These forecasts', page: IPMA_FC }),
    W.latest.ok ? ageBanner(W.latest, { subject: 'These warnings', page: IPMA_WARN }) : null,
    h('ul', { class: 'gl-list' }, five.map(c => sentence(c, W))),
    rest.length ? h('details', { class: 'gl-more' }, h('summary', {}, `The other ${rest.length} places`), h('ul', { class: 'gl-list' }, rest.map(c => sentence(c, W)))) : null,
    h('p', { class: 'note' }, "Each sentence is written from IPMA's files only: the warnings for the place's warning area in force now or later (Portugal time, as IPMA gives it), then today's lowest and highest temperature, rounded to the nearest degree, and the chance of rain."),
    provenance(F), W.latest.ok ? provenance(W) : null);
}

async function map(W, Fire) {
  const el = $('gl-map');
  if (!W.latest.ok) { failure(el, "IPMA's warnings", W.latest, IPMA_WARN); return; }
  const G = Fire.latest.ok ? buildGrid(Fire.latest.data.municipalities) : null;
  const lv = levelsFor(W.latest.data.active, warningWindows()[0]);
  const n = ORDER.filter(a => lv[a].level !== 'green').length;
  const box = h('div', { class: 'mapbox gl-mapbox' });
  put(el, ageBanner(W.latest, { subject: 'These warnings', page: IPMA_WARN }), box,
    h('ul', { class: 'legend' }, ['green', 'yellow', 'orange', 'red'].map(l => h('li', {}, swatch(l), l === 'green' ? 'Green: none' : levelWord(l)))),
    h('p', { class: 'map-note' }, `In force now (${lisbonNow().slice(11, 16)} Portugal time): ${n} of 25 areas have a yellow, orange or red warning. `,
      G ? "The mainland's shape is drawn from IPMA's municipality points, so coasts and borders are approximate. " : 'Tiles, not geography: the file that gives the map its shape could not be read. ',
      'Madeira and the Azores are tiles, not to scale. ', h('a', { href: '/warnings/' }, 'All warnings, with times and text')),
    provenance(W));
  const m = areaMap(box, areaBase(G), { label: 'Map of the 25 warning areas, each filled by its highest warning level in force now' });
  m.paint(Object.fromEntries(ORDER.map(a => [a, lv[a].level])), a => `${areaName(a)}: ${lv[a].level === 'green' ? 'no warning' : lv[a].level + ' warning'} in force now`);
}

const SOURCES = [
  ['ipma-warnings', 'Warnings'], ['ipma-city-forecasts', 'Forecasts'], ['ipma-observations', 'Stations'], ['ipma-fire-risk', 'Fire risk'],
  ['ipma-sea', 'Sea'], ['ipma-uv', 'UV index'], ['meteoalarm-pt', 'MeteoAlarm (context)'],
];
async function ages() {
  const ul = $('gl-ages');
  const lis = SOURCES.map(([, name]) => h('li', {}, h('span', { class: 'dot d-unknown' }), h('strong', {}, name), ' ', h('span', { class: 'muted' }, 'reading...')));
  ul.replaceChildren(...lis);
  await Promise.all(SOURCES.map(async ([id, name], i) => {
    const src = await loadSource(id);
    if (!src.latest.ok) { lis[i].replaceChildren(h('span', { class: 'dot d-fail' }), h('strong', {}, name), ` could not be read: ${src.latest.error}.`); return; }
    const at = src.latest.data.read_at; const st = staleness(at);
    lis[i].replaceChildren(h('span', { class: `dot d-${st.level}` }), h('strong', {}, name), ` ${at ? fmtUTC(at) : 'read time unknown'} `, h('span', { class: `age age-${st.level}` }, `(${st.text})`));
  }));
}

async function main() {
  const slowW = loading($('gl-map'), "IPMA's warnings");
  const [W, Fire] = await Promise.all([loadSource('ipma-warnings', { onSlow: slowW }), loadSource('ipma-fire-risk')]);
  places(W);
  map(W, Fire);
}
main();
ages();
