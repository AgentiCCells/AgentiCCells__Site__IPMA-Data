// chart-room.js: the Chart room design (/d/chart-room/). The sea first: IPMA's three-day sea
// forecast for the coastal places, each day marked with the rough-sea warning level for that
// place's area; then the warnings map with rough sea picked out (all types one click away),
// wind at IPMA's stations beside it, the warnings list, and the forecast for coastal places.
// Field meanings follow team/rounds/1/data/NOTES.md: sea_* is IPMA's total sea (significant wave
// height), waves_* the swell. Read live from data.promptugal.news; nothing is guessed, averaged or
// smoothed. Design: team/rounds/1/design/PROPOSAL.md, section 4.2. ES module. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance C), 2026-11-18, round 2.

import { loadSource, ageBanner, provenance, loading, failure, fmtUTC, fmtDay, ageMinutes, h } from '/assets/js/data.js';
import { AREAS, WIND_DIR_ID, WIND_CLASS } from '/assets/js/codes.js';
import { warningsBlock, warningTable, lisbonNow, addDays, areaName, lvl, levelWord } from '/assets/js/map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const IPMA_SEA = 'https://www.ipma.pt/en/maritima/costeira/';
const IPMA_OBS = 'https://www.ipma.pt/en/otempo/obs.superficie/';
const IPMA_FC = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';
const LV = ['green', 'yellow', 'orange', 'red'];
const $ = id => document.getElementById(id);
const fin = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const isRough = w => w && (w.type === 'rough sea' || w.type_pt === 'Agitação Marítima');
const placeName = n => String(n || 'unnamed').replace(/,\s*costa$/i, '');
const rng = (a, b, u) => (!fin(a) && !fin(b) ? 'none' : !fin(a) ? `max ${b}${u}` : !fin(b) ? `min ${a}${u}` : Number(a) === Number(b) ? `${a}${u}` : `${a} to ${b}${u}`);
// The island from IPMA's globalIdLocal prefix: the sea file puts Porto Santo in MCS and Santa Cruz
// das Flores in ACE (analyst's notes), so for warnings they are joined by island: MPS and AOC.
const islandArea = c => (String(c.id).startsWith('232') ? 'MPS' : String(c.id).startsWith('348') ? 'AOC' : c.area);
const regionById = c => ({ 1: 'mainland', 2: 'madeira', 3: 'azores' })[String(c.id)[0]] || AREAS[c.area]?.region || 'mainland';

// The highest rough-sea level for an area on a calendar day (Portugal time, as IPMA gives it), or
// null when the file has no rough-sea spell for it that day.
function roughLevel(active, area, date) {
  const from = `${date}T00:00:00`, to = `${addDays(date, 1)}T00:00:00`;
  let best = null;
  for (const w of active || []) {
    if (!isRough(w) || w.area !== area || typeof w.start !== 'string' || typeof w.end !== 'string' || !LV.includes(w.level) || w.level === 'green') continue;
    if (w.start < to && w.end > from && (!best || LV.indexOf(w.level) > LV.indexOf(best))) best = w.level;
  }
  return best;
}

// ---------- the sea ----------
function seaChart(el, S, W) {
  const L = S.latest.data;
  const coasts = (Array.isArray(L.coasts) ? L.coasts : []).slice();
  if (!coasts.length) { put(el, h('p', { class: 'status' }, 'The sea file was read but lists no coastal places, so there is nothing to draw.'), provenance(S)); return; }
  const today = lisbonNow().slice(0, 10);
  const dates = [...new Set([...(L.files || []).map(f => f.date), ...coasts.flatMap(c => (c.days || []).map(d => d.date))])].filter(Boolean).sort();
  const days = dates.filter(d => d >= today);
  if (!days.length) { put(el, ageBanner(S.latest, { page: IPMA_SEA }), h('p', { class: 'status' }, `Every day in IPMA's sea file is before today (${fmtDay(today)}, Lisbon date), so there is no current sea forecast to draw. See `, h('a', { href: IPMA_SEA }, 'IPMA'), '.'), provenance(S)); return; }
  const order = { mainland: 0, madeira: 1, azores: 2 };
  coasts.sort((a, b) => order[regionById(a)] - order[regionById(b)] || (regionById(a) === 'mainland' ? b.lat - a.lat : b.lon - a.lon));
  const vals = coasts.flatMap(c => (c.days || []).filter(d => days.includes(d.date)).flatMap(d => [d.sea_max_m, d.waves_max_m, d.sea_min_m, d.waves_min_m])).filter(fin).map(Number);
  const mx = Math.max(1, Math.ceil(vals.length ? Math.max(...vals) : 1));
  const X = v => (Number(v) / mx) * 100;
  const bar = (a, b, cls) => {
    if (!fin(a) && !fin(b)) return null;
    const lo = fin(a) ? Number(a) : Number(b), hi = fin(b) ? Number(b) : Number(a);
    return h('i', { class: `cr-bar ${cls}`, style: `left:${X(Math.min(lo, hi))}%;width:${Math.max(X(Math.max(lo, hi)) - X(Math.min(lo, hi)), 0.8)}%` });
  };
  const W0 = W?.latest?.ok ? W.latest.data : null;
  let marked = 0, crossed = 0;
  const rows = coasts.map(c => {
    const area = islandArea(c);
    return h('div', { class: 'cr-row' },
      h('div', { class: 'cr-place' }, h('span', { class: 'cr-name' }, placeName(c.name)),
        h('span', { class: 'cr-area' }, `${areaName(area)}${area !== c.area ? ` (sea file: ${c.area})` : ''}`)),
      days.map(date => {
        const d = (c.days || []).find(x => x.date === date);
        if (!d) return h('div', { class: 'cr-cell' }, h('span', { class: 'cr-fig muted' }, 'no value for this day'));
        const lv = W0 ? roughLevel(W0.active, area, date) : null; if (lv) marked++;
        const x = fin(d.wave_period_min_s) && fin(d.wave_period_max_s) && Number(d.wave_period_min_s) > Number(d.wave_period_max_s); if (x) crossed++;
        const label = `${placeName(c.name)}, ${fmtDay(date)}: total sea ${rng(d.sea_min_m, d.sea_max_m, ' m')}; swell ${rng(d.waves_min_m, d.waves_max_m, ' m')}; direction ${d.wave_dir || 'not given'}; swell period minimum ${fin(d.wave_period_min_s) ? d.wave_period_min_s : 'none'}, maximum ${fin(d.wave_period_max_s) ? d.wave_period_max_s : 'none'} s; sea temperature ${rng(d.sea_temp_min_c, d.sea_temp_max_c, ' °C')}; ${W0 ? (lv ? `${lv} rough-sea warning for ${areaName(area)} that day` : `no rough-sea warning for ${areaName(area)} that day`) : 'rough-sea warnings not read'}.`;
        return h('div', { class: `cr-cell${lv ? ' cr-warned' : ''}`, role: 'group', 'aria-label': label },
          h('span', { class: 'cr-day', 'aria-hidden': 'true' }, date === today ? `Today, ${fmtDay(date)}` : fmtDay(date)),
          h('div', { class: 'cr-track', style: `--steps:${mx}`, 'aria-hidden': 'true' }, bar(d.sea_min_m, d.sea_max_m, 'total'), bar(d.waves_min_m, d.waves_max_m, 'swell')),
          h('div', { class: 'cr-figs', 'aria-hidden': 'true' },
            h('span', {}, h('b', {}, 'Total '), h('span', { class: 'cr-fig' }, rng(d.sea_min_m, d.sea_max_m, ' m'))),
            h('span', {}, h('b', {}, 'Swell '), h('span', { class: 'cr-fig' }, rng(d.waves_min_m, d.waves_max_m, ' m'))),
            h('span', {}, h('b', {}, 'From '), h('span', { class: 'cr-fig' }, `${d.wave_dir || 'none'} · ${fin(d.wave_period_min_s) ? d.wave_period_min_s : 'none'}/${fin(d.wave_period_max_s) ? d.wave_period_max_s : 'none'} s${x ? ' †' : ''}`)),
            h('span', {}, h('b', {}, 'Sea '), h('span', { class: 'cr-fig' }, rng(d.sea_temp_min_c, d.sea_temp_max_c, ' °C')))),
          lv ? h('span', { class: 'cr-warn', 'aria-hidden': 'true' }, lvl(lv, `${levelWord(lv)} rough sea`)) : null);
      }));
  });
  const head = h('div', { class: 'cr-row cr-headrow', 'aria-hidden': 'true' }, h('div', { class: 'cr-place' }, 'Coastal place'),
    days.map(d => h('div', { class: 'cr-cell' }, h('span', { class: 'cr-dayh' }, d === today ? `Today, ${fmtDay(d)}` : fmtDay(d)), h('span', { class: 'cr-axis' }, h('span', {}, '0'), h('span', {}, `${mx} m`)))));
  const table = h('table', { class: 'cr-table' },
    h('caption', {}, "Every value drawn above, as given in IPMA's sea file. Heights in metres, period in seconds, temperature in °C."),
    h('thead', {}, h('tr', {}, ['Place', 'Day', 'Total sea', 'Swell', 'Period min', 'Period max', 'Direction', 'Sea temp.', 'Rough-sea warning'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, coasts.flatMap(c => days.map(date => { const d = (c.days || []).find(x => x.date === date); if (!d) return null; const lv = W0 ? roughLevel(W0.active, islandArea(c), date) : null;
      return h('tr', {}, h('th', { scope: 'row' }, placeName(c.name)), h('td', {}, fmtDay(date)), h('td', { class: 'num' }, rng(d.sea_min_m, d.sea_max_m, ' m')), h('td', { class: 'num' }, rng(d.waves_min_m, d.waves_max_m, ' m')),
        h('td', { class: 'num' }, fin(d.wave_period_min_s) ? d.wave_period_min_s : 'none'), h('td', { class: 'num' }, fin(d.wave_period_max_s) ? d.wave_period_max_s : 'none'), h('td', {}, d.wave_dir || 'none'),
        h('td', { class: 'num' }, rng(d.sea_temp_min_c, d.sea_temp_max_c, ' °C')), h('td', {}, W0 ? (lv ? lvl(lv) : 'none') : 'not read')); })).filter(Boolean)));
  put(el, ageBanner(S.latest, { page: IPMA_SEA }),
    h('figure', { class: 'chart cr-sea' },
      h('div', { class: 'cr-grid', style: `--days:${days.length}` }, head, rows),
      h('figcaption', {},
        h('ul', { class: 'cr-legend' },
          h('li', {}, h('span', { class: 'cr-key total' }), 'Total sea: significant wave height, lowest to highest for the day'),
          h('li', {}, h('span', { class: 'cr-key swell' }), 'Swell height, lowest to highest'),
          W0 ? h('li', {}, lvl('orange', ''), "The day's highest rough-sea warning for that place's area, from IPMA's warnings file") : null),
        `One scale in every cell, 0 to ${mx} m, hairlines every metre. "From": IPMA's wave direction, then the swell's peak period (minimum/maximum, in seconds). "Sea": sea surface temperature.`)),
    h('p', { class: 'note' },
      W0 ? `${marked} of ${coasts.length * days.length} place-days fall in an area with a rough-sea warning that day (Portugal calendar day; for the Azores IPMA's time zone is not confirmed). A cell with no swatch has no rough-sea warning in the file. Porto Santo is joined to its warnings by island (Porto Santo, MPS) and Santa Cruz das Flores to the western group (AOC): IPMA's sea file gives both other areas.`
        : `Rough-sea warnings could not be read (${W?.latest?.error || 'not read'}), so none are marked on the sea chart.`,
      crossed ? ` † On ${crossed} place-day${crossed === 1 ? '' : 's'} the period's minimum is above its maximum, as in IPMA's own file; both are shown as given.` : ''),
    provenance(S, { note: "IPMA's own update time for the sea files is not kept by the collector, so only the read time is known." }),
    h('details', { class: 'cr-more' }, h('summary', {}, 'The sea forecast as a table'), h('div', { class: 'cr-scroll', tabindex: '0', role: 'region', 'aria-label': 'The sea forecast as a table' }, table)));
}

// ---------- warnings, rough sea picked out ----------
function warnings(W, F) {
  const filt = $('w-filter'), block = $('warnings-block'), table = $('warnings-table');
  const all = W.latest.data;
  let rough = true;
  const draw = () => {
    const active = rough ? (all.active || []).filter(isRough) : (all.active || []);
    const hidden = (all.active || []).length - active.length;
    const view = { ...W, latest: { ...W.latest, data: { ...all, active } } };
    filt.querySelector('.cr-filter-note').textContent = rough
      ? `Showing rough-sea warnings only: an area whose only warning is of another type shows green here.${hidden ? ` ${hidden} warning${hidden === 1 ? '' : 's'} of other types ${hidden === 1 ? 'is' : 'are'} hidden.` : ' The file has no warnings of other types.'}`
      : "Showing every warning type in IPMA's file.";
    filt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === 'rough') === rough)));
    warningsBlock(block, view, F, { tableId: 'w-table-h' });
    put(table, h('p', { class: 'note cr-tnote' }, rough ? 'Rough-sea warnings only, as on the map.' : 'Every warning type, as on the map.'), warningTable(active), provenance(W));
  };
  put(filt, h('div', { class: 'ctl', role: 'group', 'aria-label': 'Which warning types to show' },
    h('button', { type: 'button', 'data-v': 'rough', 'aria-pressed': 'true', onclick: () => { rough = true; draw(); } }, 'Rough sea only'),
    h('button', { type: 'button', 'data-v': 'all', 'aria-pressed': 'false', onclick: () => { rough = false; draw(); } }, 'All warning types')),
  h('p', { class: 'note cr-filter-note', role: 'status' }));
  draw();
}

// ---------- wind at the stations ----------
function wind(el, O) {
  const D = O.latest.data;
  const st = Array.isArray(D.stations) ? D.stations : [];
  const withSpeed = st.filter(p => fin(p.reading?.wind_kmh));
  const hourAge = D.hour_utc ? ageMinutes(D.hour_utc) : null;
  const hourLine = hourAge !== null && hourAge > 180 ? h('p', { class: 'status warn age-banner', role: 'note' }, h('strong', {}, `IPMA's latest hour in this file, ${fmtUTC(D.hour_utc)}, is ${Math.round(hourAge / 60)} h old.`), ' Stations normally lag about an hour; see ', h('a', { href: IPMA_OBS }, 'ipma.pt'), '.') : null;
  if (!withSpeed.length) { put(el, ageBanner(O.latest, { page: IPMA_OBS }), hourLine, h('p', { class: 'status' }, `No station in IPMA's file sent a wind speed for ${D.hour_utc ? fmtUTC(D.hour_utc) : 'the latest hour'}. Nothing is shown in their place.`), provenance(O)); return; }
  const top = withSpeed.slice().sort((a, b) => b.reading.wind_kmh - a.reading.wind_kmh || String(a.name).localeCompare(String(b.name), 'pt')).slice(0, 12);
  const mx = Math.max(10, Math.ceil(top[0].reading.wind_kmh / 10) * 10);
  const dirWord = id => (id === 0 ? 'no direction' : id === null || id === undefined || !(id in WIND_DIR_ID) ? 'direction not given' : `from ${WIND_DIR_ID[id]}`);
  const noDir = withSpeed.filter(p => p.reading.wind_dir_id === 0).length;
  put(el, ageBanner(O.latest, { page: IPMA_OBS }), hourLine,
    h('figure', { class: 'chart cr-wind' },
      h('table', { class: 'cr-wtable' },
        h('caption', {}, `The ${top.length} strongest hourly mean winds at 10 m, ${D.hour_utc ? fmtUTC(D.hour_utc) : 'latest hour'}. Bars on one scale, 0 to ${mx} km/h.`),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Station'), h('th', { scope: 'col', class: 'num' }, 'km/h'), h('th', { scope: 'col' }, h('span', { class: 'cr-vh' }, 'Bar')), h('th', { scope: 'col' }, 'Direction'))),
        h('tbody', {}, top.map(p => h('tr', {}, h('th', { scope: 'row' }, p.name || `station ${p.id}`), h('td', { class: 'num cr-fig' }, String(p.reading.wind_kmh)),
          h('td', { class: 'cr-wbar', 'aria-hidden': 'true' }, h('i', { style: `width:${(p.reading.wind_kmh / mx) * 100}%` })), h('td', {}, dirWord(p.reading.wind_dir_id)))))),
      h('figcaption', {}, `${withSpeed.length} of ${st.length} stations sent a wind speed for this hour; ${noDir} of them gave IPMA's class 0, no direction (not north). The latest hour is the emptiest: stations report late. Direction is where the wind blows from. Every station: `, h('a', { href: '/observations/' }, 'Stations'), '.')),
    provenance(O));
}

// ---------- the forecast for coastal places ----------
const COASTAL = ['Viana do Castelo', 'Porto', 'Lisboa', 'Sines', 'Sagres', 'Faro', 'Funchal', 'Porto Santo', 'Ponta Delgada', 'Horta', 'Santa Cruz das Flores'];
function forecast(el, src) {
  const cities = Array.isArray(src.latest.data.cities) ? src.latest.data.cities : [];
  const today = lisbonNow().slice(0, 10);
  const places = COASTAL.map(n => [n, cities.find(c => c.name === n)]);
  const dates = [...new Set(places.flatMap(([, c]) => (c?.days || []).map(d => d.date)))].filter(d => typeof d === 'string' && d >= today).sort();
  if (!dates.length) { put(el, ageBanner(src.latest, { page: IPMA_FC }), h('p', { class: 'status' }, `IPMA's forecast file holds no days from today (${fmtDay(today)}) for these places. Nothing is shown in their place.`), provenance(src)); return; }
  const t = v => (fin(v) ? Number(v).toFixed(1) : 'none');
  const table = h('table', { class: 'cr-ftable' },
    h('caption', {}, "IPMA's daily forecast for the forecast places on the coast: temperature range (°C, as given), chance of rain, and wind direction and class (IPMA gives a class name, not a speed)."),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Place'), dates.map(d => h('th', { scope: 'col' }, d === today ? `Today, ${fmtDay(d)}` : fmtDay(d))))),
    h('tbody', {}, places.map(([n, c]) => h('tr', {}, h('th', { scope: 'row' }, n), !c ? h('td', { colspan: String(dates.length), class: 'muted' }, 'not in the forecast file') : dates.map(date => {
      const d = (c.days || []).find(x => x.date === date);
      if (!d) return h('td', { class: 'muted' }, 'no value');
      return h('td', {}, h('span', { class: 'cr-fig' }, `${t(d.t_min_c)} to ${t(d.t_max_c)} °C`), h('br'),
        h('span', { class: 'cr-sub' }, `rain ${fin(d.rain_prob_pct) ? d.rain_prob_pct + '%' : 'not given'}`), h('br'),
        h('span', { class: 'cr-sub' }, d.wind_dir ? `wind ${d.wind_dir}${WIND_CLASS[d.wind_class] ? ', ' + WIND_CLASS[d.wind_class].toLowerCase() : ''}` : 'wind not given'));
    })))));
  put(el, ageBanner(src.latest, { page: IPMA_FC }), h('div', { class: 'cr-scroll', tabindex: '0', role: 'region', 'aria-label': 'Forecast for coastal places, scrolls sideways on narrow screens' }, table), provenance(src));
}

async function main() {
  const sea = $('sea'), block = $('warnings-block'), table = $('warnings-table'), windEl = $('wind'), fc = $('forecast');
  const slowS = loading(sea, "IPMA's sea forecast"), slowW = [loading(block, "IPMA's warnings"), loading(table, "IPMA's warnings")];
  const slowO = loading(windEl, "IPMA's station readings"), slowF = loading(fc, "IPMA's forecasts");
  const pS = loadSource('ipma-sea', { onSlow: slowS });
  const pW = loadSource('ipma-warnings', { onSlow: () => slowW.forEach(f => f()) });
  const pF = loadSource('ipma-fire-risk');
  const pO = loadSource('ipma-observations', { onSlow: slowO });
  const pC = loadSource('ipma-city-forecasts', { onSlow: slowF });
  const [S, W] = await Promise.all([pS, pW]);
  if (!S.latest.ok) failure(sea, "IPMA's sea forecast (ipma-sea)", S.latest, IPMA_SEA); else seaChart(sea, S, W);
  if (!W.latest.ok) { failure(block, "IPMA's warnings", W.latest, IPMA_WARN); failure(table, "IPMA's warnings", W.latest, IPMA_WARN); $('w-filter').replaceChildren(); }
  else warnings(W, await pF);
  const O = await pO;
  if (!O.latest.ok) failure(windEl, "IPMA's station readings", O.latest, IPMA_OBS); else wind(windEl, O);
  const C = await pC;
  if (!C.latest.ok) failure(fc, "IPMA's forecasts", C.latest, IPMA_FC); else forecast(fc, C);
}
main().catch(e => failure($('sea'), 'the page', { error: `the page could not draw the files (${e.message})` }, IPMA_SEA));
