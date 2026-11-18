// home.js: Portugal now. The warnings map with its time control, the forecast for four places,
// the warnings table, and a status line for every source. Everything is read live from
// data.promptugal.news; nothing is guessed. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance A), 2026-11-18, round 1.

import { loadSource, provenance, loading, failure, staleness, fmtUTC, fmtDay, ageMinutes, h } from '../data.js';
import { WEATHER_TYPES, WIND_CLASS } from '../codes.js';
import { warningsBlock, warningTable, currentWarnings, lisbonNow } from '../map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const IPMA_FC = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';

// ---------- warnings: map and table ----------
async function warnings() {
  const block = document.getElementById('warnings-block');
  const table = document.getElementById('warnings-table');
  const slow = loading(block, "IPMA's warnings");
  const slowT = loading(table, "IPMA's warnings");
  const [W, F] = await Promise.all([loadSource('ipma-warnings', { onSlow: () => { slow(); slowT(); } }), loadSource('ipma-fire-risk')]);
  if (!W.latest.ok) {
    failure(block, "IPMA's warnings", W.latest, IPMA_WARN);
    failure(table, "IPMA's warnings", W.latest, IPMA_WARN);
    return;
  }
  warningsBlock(block, W, F, { tableId: 'w-table-h' });
  table.replaceChildren(h('div', { class: 'panel' }, warningTable(W.latest.data.active)), provenance(W));
}

// ---------- forecast for four places ----------
const PLACES = ['Lisboa', 'Porto', 'Faro', 'Funchal'];
const isNum = v => typeof v === 'number' && Number.isFinite(v);
async function forecast() {
  const el = document.getElementById('forecast');
  const slow = loading(el, "IPMA's forecasts");
  const src = await loadSource('ipma-city-forecasts', { onSlow: slow });
  if (!src.latest.ok) { failure(el, "IPMA's forecasts", src.latest, IPMA_FC); return; }
  const D = src.latest.data;
  const today = lisbonNow().slice(0, 10);
  const places = PLACES.map(n => [n, (D.cities || []).find(c => c.name === n)]);
  // Days before today's Lisbon date are dropped; the rest are shown as IPMA gives them.
  const dayList = c => (c?.days || []).filter(d => typeof d.date === 'string' && d.date >= today);
  const vals = places.flatMap(([, c]) => dayList(c).flatMap(d => [d.t_min_c, d.t_max_c])).filter(isNum);
  if (!vals.length) {
    el.replaceChildren(h('p', { class: 'status' }, "IPMA's forecast file holds no temperatures for today or later for these places. Nothing is shown in their place."), provenance(src));
    return;
  }
  const lo = Math.floor(Math.min(...vals) / 5) * 5, hi = Math.max(lo + 5, Math.ceil(Math.max(...vals) / 5) * 5);
  const pct = v => ((v - lo) / (hi - lo)) * 100;
  const body = h('div', { class: 'panel' }, places.map(([name, c]) => {
    if (!c) return h('div', { class: 'fc-place' }, h('h3', {}, name), h('p', { class: 'muted' }, 'This place is not in the forecast file.'));
    const days = dayList(c);
    return h('div', { class: 'fc-place' }, h('h3', {}, name),
      days.length ? h('ul', { class: 'fc-days' }, days.map(d => {
        const ok = isNum(d.t_min_c) && isNum(d.t_max_c);
        const wx = WEATHER_TYPES[d.weather_type];
        const wind = d.wind_dir ? `wind ${d.wind_dir}${WIND_CLASS[d.wind_class] ? ', ' + WIND_CLASS[d.wind_class].toLowerCase() : ''}` : null;
        return h('li', { class: 'fc-day' },
          h('span', { class: 'd' }, fmtDay(d.date)),
          h('span', { class: 'bar', 'aria-hidden': 'true' }, ok ? h('span', { style: `left:${pct(d.t_min_c)}%;width:${Math.max(pct(d.t_max_c) - pct(d.t_min_c), 1.5)}%` }) : null),
          h('span', { class: 't' }, ok ? `${Math.round(d.t_min_c)} to ${Math.round(d.t_max_c)} °C` : 'no value'),
          h('span', { class: 'wx' }, [wx && d.weather_type > 0 ? wx : 'weather type not given', isNum(d.rain_prob_pct) ? `rain ${Math.round(d.rain_prob_pct)}%` : 'chance of rain not given', wind].filter(Boolean).join(' · ')));
      })) : h('p', { class: 'muted' }, 'No days from today onwards in the file for this place.'));
  }));
  const upd = places.map(([, c]) => c?.updated).filter(Boolean).sort().pop();
  const updAge = upd ? ageMinutes(upd + (/Z$/.test(upd) ? '' : 'Z')) : null;
  el.replaceChildren(body,
    h('p', { class: 'note' }, `Bars: minimum to maximum temperature on one scale for all four places, ${lo} to ${hi} °C. Rain: IPMA's chance of rain for the day. Weather and wind as IPMA's code tables name them.`,
      upd ? ` IPMA last updated these forecasts at ${upd.slice(11, 16)} UTC on ${fmtDay(upd.slice(0, 10))}.` : '',
      updAge !== null && updAge > 14 * 60 ? h('strong', {}, ' That is more than 14 hours ago; IPMA normally updates twice a day.') : ''),
    provenance(src));
}

// ---------- every source, as last read ----------
const SOURCES = [
  ['ipma-warnings', 'Warnings', '/warnings/', d => { const c = currentWarnings(d.active); return `${c.rows.length} yellow, orange or red in force or upcoming, in ${c.areas} of 25 areas.`; }],
  ['ipma-city-forecasts', 'Forecasts', '/forecasts/', d => `${d.counts?.read ?? (d.cities || []).length} of ${d.counts?.places ?? '?'} places, by day.`],
  ['ipma-observations', 'Stations', '/observations/', d => `${d.counts?.reporting ?? '?'} of ${d.counts?.stations ?? '?'} stations reported for ${d.hour_utc ? fmtUTC(d.hour_utc).split(', ')[1] : 'an unknown hour'}.`],
  ['ipma-fire-risk', 'Fire risk', '/fire-risk/', d => `${(d.municipalities || []).length} municipalities, ${(d.files || []).length} days.`],
  ['ipma-sea', 'Sea', '/sea/', d => `${(d.coasts || []).length} coastal places, ${(d.files || []).length} days.`],
  ['ipma-uv', 'UV index', '/uv/', d => `${(d.places || []).length} entries by place.`],
  ['meteoalarm-pt', 'MeteoAlarm (context)', '/warnings/#meteoalarm-h', d => { const now = Date.now(); const n = (d.messages || []).filter(m => Date.parse(m.expires_utc) > now).length; return `${n} of ${(d.messages || []).length} CAP messages not expired now.`; }],
];
async function status() {
  const ul = document.getElementById('status');
  const lis = SOURCES.map(([, name]) => h('li', {}, h('span', {}, h('span', { class: 'dot d-unknown' }), name), h('span', { class: 'muted' }, 'Reading from data.promptugal.news...')));
  ul.replaceChildren(...lis);
  await Promise.all(SOURCES.map(async ([id, name, page, count], i) => {
    const src = await loadSource(id, { onSlow: () => { lis[i].lastChild.textContent = 'Still reading: data.promptugal.news is slow to answer.'; } });
    const nameEl = h('span', {}, null, h('a', { href: page }, name));
    if (!src.latest.ok) {
      nameEl.prepend(h('span', { class: 'dot d-fail' }));
      lis[i].replaceChildren(nameEl, h('span', {}, h('strong', {}, 'Could not read: '), `${src.latest.error}. Nothing is shown in its place.`));
      return;
    }
    const d = src.latest.data; const st = staleness(d.read_at);
    let c = ''; try { c = count(d); } catch { c = ''; }
    nameEl.prepend(h('span', { class: `dot d-${st.level}` }));
    lis[i].replaceChildren(nameEl, h('span', {}, `Read ${d.read_at ? fmtUTC(d.read_at) : 'at an unknown time'} `, h('span', { class: `age age-${st.level}` }, `(${st.text})`), `. ${c}`));
  }));
}

warnings();
forecast();
status();
