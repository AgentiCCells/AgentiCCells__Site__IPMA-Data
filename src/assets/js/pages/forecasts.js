// pages/forecasts.js: IPMA's five-day forecasts for every place in ipma-city-forecasts, drawn as
// small multiples on one shared temperature scale, with a picker that shows one place larger.
// Every figure comes from latest.json as read; nothing is guessed, smoothed or interpolated.
// ES module, no dependencies beyond data.js and codes.js. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance B), 2026-11-18, round 1.
import { loadSource, provenance, runStrip, loading, failure, staleness, fmtUTC, fmtDay, h } from '../data.js';
import { AREAS, WEATHER_TYPES, WIND_CLASS, RAIN_CLASS } from '../codes.js';

const ID = 'ipma-city-forecasts';
const WHAT = "IPMA's forecasts by place (ipma-city-forecasts)";
const IPMA_PAGE = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';
const STORE = 'ipma-data:forecast-place';
const DEFAULT_PLACE = 1110600; // Lisboa
const UPDATE_STALE_H = 14; // IPMA runs the forecast twice a day; past 14 h a newer one may exist (analyst's notes)
const REGIONS = [['mainland', 'Mainland'], ['madeira', 'Madeira'], ['azores', 'Azores']];

const lisbonToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// replaceChildren() would turn null into the text "null" and an array into a string: flatten and drop empties.
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const fin = v => v !== null && v !== undefined && Number.isFinite(Number(v));
const pad = n => String(n).padStart(2, '0');
// IPMA's dataUpdate has no zone; IPMA's API page says forecast times are UTC.
const updatedMs = u => Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(u || '') ? u : `${u}Z`);
function fmtUTCsec(iso) {
  const d = new Date(iso);
  return isNaN(d) ? 'unknown' : `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
const regionOf = c => AREAS[c.area]?.region || ({ 1: 'mainland', 2: 'madeira', 3: 'azores' })[String(c.id)[0]] || 'mainland';
const weather = code => (!fin(code) || Number(code) < 0) ? 'no weather type given' : (WEATHER_TYPES[code] ?? `IPMA code ${code} (not in IPMA's table)`);
const wind = d => {
  const cls = fin(d.wind_class) ? (WIND_CLASS[d.wind_class] ? WIND_CLASS[d.wind_class].toLowerCase() : `class ${d.wind_class}`) : null;
  if (!d.wind_dir && !cls) return 'no wind given';
  return `wind ${[d.wind_dir || 'no direction', cls || 'no class'].join(', ')}`;
};
const tText = d => fin(d.t_min_c) && fin(d.t_max_c) ? `${d.t_min_c}–${d.t_max_c}°`
  : fin(d.t_max_c) ? `max ${d.t_max_c}°` : fin(d.t_min_c) ? `min ${d.t_min_c}°` : 'no value';
const tWords = d => fin(d.t_min_c) && fin(d.t_max_c) ? `${d.t_min_c} to ${d.t_max_c} °C`
  : fin(d.t_max_c) ? `maximum ${d.t_max_c} °C, no minimum given` : fin(d.t_min_c) ? `minimum ${d.t_min_c} °C, no maximum given` : 'no temperature given';
const rainText = d => fin(d.rain_prob_pct) ? `${d.rain_prob_pct}%` : 'none';

function ageLine(readAt) {
  const st = staleness(readAt);
  if (st.level === 'fresh') return null;
  if (st.level === 'unknown') return h('p', { class: 'cb-age', role: 'note' }, h('strong', {}, 'The read time is unknown. '), 'These figures may not be current: see ipma.pt.');
  return h('p', { class: `cb-age cb-age-${st.level}`, role: 'note' }, h('strong', {}, `These figures were ${st.text}. `),
    st.level === 'old' ? "A newer forecast is almost certainly on IPMA's page: " : 'See IPMA for the latest: ', h('a', { href: IPMA_PAGE }, 'ipma.pt'), '.');
}

async function main() {
  const root = document.getElementById('fc');
  const runsEl = document.getElementById('fc-runs');
  const slow = loading(root, "IPMA's forecasts");
  const src = await loadSource(ID, { reads: true, onSlow: slow });
  runsEl.replaceChildren(runStrip(src.reads));
  if (!src.latest.ok) { failure(root, WHAT, src.latest, IPMA_PAGE); return; }
  const L = src.latest.data;
  const all = Array.isArray(L.cities) ? L.cities : [];
  if (!all.length) {
    put(root, h('p', { class: 'status', role: 'status' }, 'The forecasts file was read but lists no places, so there is nothing to draw.'), provenance(src));
    return;
  }

  // Days before today (Lisbon date) are no longer forecasts: leave them out and say so.
  const today = lisbonToday();
  let dropped = 0;
  const cities = all.map(c => {
    const days = (c.days || []).filter(d => { const keep = !d.date || d.date >= today; if (!keep) dropped++; return keep; });
    return { ...c, days };
  });
  const dates = [...new Set(cities.flatMap(c => c.days.map(d => d.date)))].filter(Boolean).sort();
  if (!dates.length) {
    put(root, ageLine(L.read_at), h('p', { class: 'status', role: 'status' },
      `Every day in the file is before today (${fmtDay(today)}, Lisbon date), so there is no current forecast to draw. See `, h('a', { href: IPMA_PAGE }, 'IPMA'), '.'), provenance(src));
    return;
  }

  // Order: region, then mainland north to south, islands east to west.
  const order = { mainland: 0, madeira: 1, azores: 2 };
  cities.sort((a, b) => order[regionOf(a)] - order[regionOf(b)] || (regionOf(a) === 'mainland' ? b.lat - a.lat : b.lon - a.lon));

  // One temperature scale for every place, rounded out to 5 °C.
  const temps = cities.flatMap(c => c.days.flatMap(d => [d.t_min_c, d.t_max_c])).filter(fin).map(Number);
  let lo = temps.length ? Math.floor(Math.min(...temps) / 5) * 5 : 0;
  let hi = temps.length ? Math.ceil(Math.max(...temps) / 5) * 5 : 30;
  if (hi <= lo) hi = lo + 5;
  const steps = (hi - lo) / 5;
  const pct = v => ((Number(v) - lo) / (hi - lo)) * 100;

  // IPMA's update times: usually one for all places.
  const ups = [...new Set(cities.map(c => c.updated).filter(Boolean))];
  const newestUp = ups.map(updatedMs).filter(Number.isFinite).sort((a, b) => b - a)[0];
  const upAgeH = Number.isFinite(newestUp) ? (Date.now() - newestUp) / 3600000 : null;

  // ---------- picker ----------
  const byId = new Map(cities.map(c => [String(c.id), c]));
  let chosen = new URLSearchParams(location.search).get('place');
  if (!byId.has(chosen)) { try { chosen = localStorage.getItem(STORE); } catch { chosen = null; } }
  if (!byId.has(chosen)) chosen = byId.has(String(DEFAULT_PLACE)) ? String(DEFAULT_PLACE) : String(cities[0].id);

  const select = h('select', { id: 'fc-place', name: 'place' },
    REGIONS.map(([key, label]) => {
      const list = cities.filter(c => regionOf(c) === key);
      return list.length ? h('optgroup', { label }, list.map(c => h('option', { value: String(c.id) }, c.name))) : null;
    }));
  select.value = chosen;
  const focusBox = h('section', { class: 'fc-focus panel', 'aria-live': 'polite', 'aria-labelledby': 'fc-focus-h' });

  function setPlace(id, { move } = {}) {
    if (!byId.has(String(id))) return;
    chosen = String(id);
    select.value = chosen;
    try { localStorage.setItem(STORE, chosen); } catch { /* storage may be blocked: the page works without it */ }
    try { const u = new URL(location.href); u.searchParams.set('place', chosen); history.replaceState(null, '', u); } catch { /* ignore */ }
    drawFocus();
    document.querySelectorAll('.fc-card').forEach(card => card.classList.toggle('is-focus', card.dataset.id === chosen));
    if (move) { focusBox.scrollIntoView({ block: 'start' }); document.getElementById('fc-focus-h')?.focus({ preventScroll: true }); }
  }
  select.addEventListener('change', () => setPlace(select.value));

  // ---------- the focused place, larger ----------
  function drawFocus() {
    const c = byId.get(chosen);
    const ticks = Array.from({ length: steps + 1 }, (_, i) => lo + i * 5);
    const cols = dates.map(date => {
      const d = c.days.find(x => x.date === date);
      if (!d) return h('div', { class: 'fc-col' }, h('div', { class: 'fc-day' }, fmtDay(date)), h('div', { class: 'fc-vtrack', style: `--steps:${steps}` }), h('p', { class: 'fc-words fc-none' }, 'no forecast for this day'));
      const hasMin = fin(d.t_min_c), hasMax = fin(d.t_max_c);
      const track = h('div', { class: 'fc-vtrack', style: `--steps:${steps}` });
      if (hasMin && hasMax) {
        const b = Math.min(pct(d.t_min_c), pct(d.t_max_c)), t = Math.max(pct(d.t_min_c), pct(d.t_max_c));
        track.append(h('span', { class: 'fc-vbar', style: `bottom:${b}%;height:${t - b}%` }),
          h('span', { class: 'fc-vlab', style: `bottom:calc(${t}% + 3px)` }, `${d.t_max_c}°`),
          h('span', { class: 'fc-vlab min', style: `top:calc(${100 - b}% + 3px)` }, `${d.t_min_c}°`));
      } else if (hasMin || hasMax) {
        const v = hasMax ? d.t_max_c : d.t_min_c;
        track.append(h('span', { class: 'fc-vbar', style: `bottom:calc(${pct(v)}% - 5px);height:10px` }),
          h('span', { class: 'fc-vlab', style: `bottom:calc(${pct(v)}% + 7px)` }, `${hasMax ? 'max' : 'min'} ${v}°`));
      } else track.append(h('span', { class: 'fc-vlab min', style: 'bottom:45%' }, 'no value'));
      const rain = h('div', { class: 'fc-rainrow' }, fin(d.rain_prob_pct) ? h('i', { style: `height:${Math.max(0, Math.min(100, d.rain_prob_pct))}%` }) : null);
      return h('div', { class: 'fc-col' },
        h('div', { class: 'fc-day' }, date === today ? 'Today' : fmtDay(date).slice(0, 3), h('br'), fmtDay(date).slice(4)),
        track, rain,
        h('p', { class: 'fc-rainlab' }, fin(d.rain_prob_pct) ? `rain ${d.rain_prob_pct}%` : 'rain: none given'),
        h('p', { class: 'fc-words' }, weather(d.weather_type).replace(/\//g, '/\u200b'), h('span', { class: 'wind' }, wind(d))));
    });
    const axis = h('div', { class: 'fc-axis', 'aria-hidden': 'true' }, ticks.map(t => h('span', { style: `bottom:${pct(t)}%` }, `${t}°`)));
    const label = `${c.name}, ${dates.length}-day forecast. ` + dates.map(date => {
      const d = c.days.find(x => x.date === date);
      return d ? `${fmtDay(date)}: ${tWords(d)}, rain chance ${rainText(d)}, ${weather(d.weather_type)}, ${wind(d)}.` : `${fmtDay(date)}: no forecast.`;
    }).join(' ');
    const rows = c.days.map(d => h('tr', {},
      h('td', {}, fmtDay(d.date)), h('td', { class: 'cb-num' }, fin(d.t_min_c) ? `${d.t_min_c}` : 'none'), h('td', { class: 'cb-num' }, fin(d.t_max_c) ? `${d.t_max_c}` : 'none'),
      h('td', { class: 'cb-num' }, rainText(d)), h('td', {}, fin(d.rain_class) ? (RAIN_CLASS[d.rain_class] ?? `class ${d.rain_class}`) : 'no class given'),
      h('td', {}, weather(d.weather_type)), h('td', {}, d.wind_dir || 'none'), h('td', {}, fin(d.wind_class) ? (WIND_CLASS[d.wind_class] ?? `class ${d.wind_class}`) : 'none')));
    put(focusBox, 
      h('h3', { id: 'fc-focus-h', tabindex: '-1' }, c.name),
      h('p', { class: 'fc-meta' }, `Warning area ${c.area}${AREAS[c.area] ? ` (${AREAS[c.area].name})` : ''}. IPMA's update: ${c.updated ? fmtUTC(updatedMs(c.updated)) : 'not given'}. This place's file read: ${c.read_at ? fmtUTC(c.read_at).replace(/\d\d:\d\d UTC$/, fmtUTCsec(c.read_at)) : 'unknown'}${c.source ? ' from ' : ''}`,
        c.source ? h('a', { href: c.source }, "IPMA's file") : null, '.'),
      h('figure', { class: 'chart', role: 'img', 'aria-label': label },
        h('div', { class: 'fc-big', style: `--days:${dates.length}`, 'aria-hidden': 'true' }, axis, cols),
        h('figcaption', {}, `Bars: IPMA's minimum to maximum temperature for each day, on the scale ${lo} to ${hi} °C shared by every place on this page (gridlines every 5 °C). Grey columns below: chance of rain, 0 to 100%. Weather type and wind in IPMA's words and classes.`)),
      h('div', { class: 'cb-scroll', tabindex: '0', role: 'region', 'aria-label': `${c.name} forecast as a table` },
        h('table', { class: 'cb-table' }, h('caption', {}, `${c.name}: every value in IPMA's file for the days shown.`),
          h('thead', {}, h('tr', {}, ['Day', 'Min °C', 'Max °C', 'Rain chance', 'Rain class', 'Weather type', 'Wind from', 'Wind class'].map((t, i) => h('th', { scope: 'col', class: i > 0 && i < 4 ? 'cb-num' : null }, t)))),
          h('tbody', {}, rows))));
  }

  // ---------- small multiples ----------
  function card(c) {
    const rows = dates.map(date => {
      const d = c.days.find(x => x.date === date);
      if (!d) return h('li', {}, h('span', { class: 'd' }, fmtDay(date).slice(0, 3)), h('span', { class: 'fc-none' }, 'no forecast'), h('span'), h('span'));
      const track = h('span', { class: 'fc-htrack', style: `--steps:${steps}` });
      if (fin(d.t_min_c) && fin(d.t_max_c)) {
        const a = Math.min(pct(d.t_min_c), pct(d.t_max_c)), b = Math.max(pct(d.t_min_c), pct(d.t_max_c));
        track.append(h('i', { class: 'fc-hbar', style: `left:${a}%;width:${b - a}%` }));
      } else if (fin(d.t_min_c) || fin(d.t_max_c)) track.append(h('i', { class: 'fc-dot', style: `left:${pct(fin(d.t_max_c) ? d.t_max_c : d.t_min_c)}%` }));
      const rp = fin(d.rain_prob_pct) ? Math.max(0, Math.min(100, d.rain_prob_pct)) : null;
      return h('li', {},
        h('span', { class: 'd' }, fmtDay(date).slice(0, 3)),
        track,
        h('span', { class: 'fc-t' }, tText(d)),
        h('span', { class: 'fc-rain', title: 'chance of rain' }, h('b', { 'aria-hidden': 'true' }, rp === null ? null : h('i', { style: `width:${rp}%` })), rp === null ? 'none' : `${rp}%`),
        h('span', { class: 'w' }, `${weather(d.weather_type)}; ${wind(d)}`));
    });
    const label = `${c.name}: ` + dates.map(date => { const d = c.days.find(x => x.date === date); return d ? `${fmtDay(date)} ${tWords(d)}, rain chance ${rainText(d)}, ${weather(d.weather_type)}, ${wind(d)}` : `${fmtDay(date)} no forecast`; }).join('; ') + '.';
    return h('article', { class: `fc-card${String(c.id) === chosen ? ' is-focus' : ''}`, 'data-id': String(c.id) },
      h('header', {}, h('h4', {}, c.name), h('button', { type: 'button', class: 'cb-btn', onclick: () => setPlace(c.id, { move: true }) }, 'Show larger', h('span', { class: 'cb-vh' }, `: ${c.name}`))),
      h('p', { class: 'fc-times' }, `Read ${c.read_at ? fmtUTCsec(c.read_at) : 'unknown'} · IPMA update ${c.updated ? fmtUTC(updatedMs(c.updated)).replace(/ \d{4},/, ',') : 'not given'}`),
      h('p', { class: 'cb-vh' }, label),
      h('ul', { class: 'fc-rows', 'aria-hidden': 'true' }, rows),
      h('div', { class: 'fc-scale', 'aria-hidden': 'true' }, h('span'), h('span', {}, h('span', {}, `${lo}°`), h('span', {}, `${hi}°`)), h('span'), h('span')));
  }

  const regionsEl = REGIONS.map(([key, label]) => {
    const list = cities.filter(c => regionOf(c) === key);
    if (!list.length) return null;
    return h('section', { class: 'fc-region', 'aria-labelledby': `fc-r-${key}` },
      h('h3', { id: `fc-r-${key}` }, `${label} (${list.length} ${list.length === 1 ? 'place' : 'places'})`),
      h('div', { class: 'fc-grid' }, list.map(card)));
  });

  // ---------- every place as a table ----------
  const fullRows = cities.flatMap(c => c.days.map((d, i) => h('tr', {},
    i === 0 ? h('th', { scope: 'rowgroup', rowspan: String(c.days.length) }, c.name) : null,
    h('td', {}, fmtDay(d.date)), h('td', { class: 'cb-num' }, fin(d.t_min_c) ? d.t_min_c : 'none'), h('td', { class: 'cb-num' }, fin(d.t_max_c) ? d.t_max_c : 'none'),
    h('td', { class: 'cb-num' }, rainText(d)), h('td', {}, weather(d.weather_type)), h('td', {}, wind(d).replace(/^wind /, '')))));

  const nulls = cities.reduce((n, c) => n + c.days.filter(d => !fin(d.t_min_c) || !fin(d.t_max_c)).length, 0);
  const notes = [
    `${cities.length} places in IPMA's file${L.counts?.places && L.counts.places !== cities.length ? ` (the file's count says ${L.counts.places})` : ''}, ${dates.length} days from ${fmtDay(dates[0])} to ${fmtDay(dates[dates.length - 1])}.`,
    dropped ? ` ${dropped} place-days before today (Lisbon date) are left out: they are no longer forecasts.` : '',
    nulls ? ` ${nulls} place-days lack a minimum or maximum; they show "no value" or a single dot, never a guessed figure.` : '',
  ].join('');
  const upLine = ups.length === 1
    ? `IPMA's update time for every place: ${fmtUTC(updatedMs(ups[0]))} (IPMA's dataUpdate, given without a zone; IPMA's API page says forecast times are UTC).`
    : `IPMA's update times differ between places (${ups.length} different times); each card shows its own.`;

  put(root, 
    ageLine(L.read_at),
    upAgeH !== null && upAgeH > UPDATE_STALE_H ? h('p', { class: 'cb-age', role: 'note' }, h('strong', {}, `IPMA's forecast was last updated ${Math.round(upAgeH)} h ago. `), 'IPMA updates it twice a day, so a newer one may be on ', h('a', { href: IPMA_PAGE }, 'ipma.pt'), '.') : null,
    h('div', { class: 'cb-ctl' }, h('label', { for: 'fc-place' }, 'Place'), select, h('span', { class: 'cb-note', style: 'margin:0' }, 'Grouped Mainland (north to south), Madeira, Azores.')),
    focusBox,
    provenance(src, { note: upLine }),
    h('h2', { id: 'fc-all' }, `Every place, on one scale (${lo} to ${hi} °C)`),
    h('p', { class: 'cb-note' }, notes, ` Each row: the day, IPMA's minimum to maximum temperature on the scale ${lo} to ${hi} °C shared by every card (gridlines every 5 °C), the figures, and the chance of rain (grey bar, 0 to 100%). Under it, the weather type in IPMA's words and the wind direction and class. IPMA gives wind as a class name only, not a speed.`),
    regionsEl,
    provenance(src),
    h('details', { class: 'cb-more' }, h('summary', {}, `Every place as a table (${fullRows.length} rows)`),
      h('div', { class: 'cb-scroll', tabindex: '0', role: 'region', 'aria-label': 'Every place as a table' },
        h('table', { class: 'cb-table' }, h('caption', {}, "Every value drawn above, as given in IPMA's file."),
          h('thead', {}, h('tr', {}, ['Place', 'Day', 'Min °C', 'Max °C', 'Rain chance', 'Weather type', 'Wind'].map((t, i) => h('th', { scope: 'col', class: i > 1 && i < 5 ? 'cb-num' : null }, t)))),
          h('tbody', {}, fullRows)))));
  drawFocus();
}

main().catch(e => {
  const root = document.getElementById('fc');
  if (root) failure(root, WHAT, { error: `the page could not draw the file (${e.message})` }, IPMA_PAGE);
});
