// night-desk.js: the Night desk design (/d/night-desk/), a dark operations board. A tile per
// source with its status light, read time and age, and what the collector's last run found; the
// warnings map; what changed at the last read, only where reads.json and meteoalarm-pt's
// `changes` field say so; the warnings list and the forecast for five places. reads.json is a
// log of runs, not of values: it can say that IPMA's bytes changed, never which values did.
// Read live from data.promptugal.news; nothing is guessed. Design: team/rounds/1/design/PROPOSAL.md,
// section 4.3. ES module. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance C), 2026-11-18, round 2.

import { loadSource, ageBanner, provenance, loading, failure, staleness, ageMinutes, fmtUTC, fmtDay, h } from '/assets/js/data.js';
import { WEATHER_TYPES, WIND_CLASS } from '/assets/js/codes.js';
import { warningsBlock, warningTable, currentWarnings, lisbonNow, lvl } from '/assets/js/map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const IPMA_FC = 'https://www.ipma.pt/en/otempo/prev.localidade.hora/';
const $ = id => document.getElementById(id);
const fin = v => typeof v === 'number' && Number.isFinite(v);
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const hm = iso => { const d = new Date(iso); return isNaN(d) ? 'unknown' : `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`; };
const dayHm = iso => { const d = new Date(iso); return isNaN(d) ? 'unknown' : `${fmtDay(d.toISOString().slice(0, 10))}, ${hm(iso)}`; };
const ageText = m => (m === null ? 'unknown' : m < 1 ? 'under 1 min' : m < 90 ? `${m} min` : m < 48 * 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${Math.round(m / 1440)} days`);

const SOURCES = [
  { id: 'ipma-warnings', name: 'Warnings', page: '/warnings/', count: d => { const c = currentWarnings(d.active); return `${c.rows.length} in force or upcoming, in ${c.areas} of 25 areas`; } },
  { id: 'ipma-city-forecasts', name: 'Forecasts', page: '/forecasts/', count: d => `${d.counts?.read ?? (d.cities || []).length} of ${d.counts?.places ?? '?'} places` },
  { id: 'ipma-observations', name: 'Stations', page: '/observations/', count: d => `${d.counts?.reporting ?? '?'} of ${d.counts?.stations ?? '?'} reported for ${d.hour_utc ? hm(d.hour_utc) : 'an unknown hour'}` },
  { id: 'ipma-fire-risk', name: 'Fire risk', page: '/fire-risk/', count: d => `${(d.municipalities || []).length} municipalities, ${(d.files || []).length} days` },
  { id: 'ipma-sea', name: 'Sea', page: '/sea/', count: d => `${(d.coasts || []).length} coastal places, ${(d.files || []).length} days` },
  { id: 'ipma-uv', name: 'UV index', page: '/uv/', count: d => `${(d.places || []).length} entries by place` },
  { id: 'meteoalarm-pt', name: 'MeteoAlarm (context)', page: '/warnings/#meteoalarm-h', count: d => { const now = Date.now(); return `${(d.messages || []).filter(m => Date.parse(m.expires_utc) > now).length} of ${(d.messages || []).length} CAP messages not expired`; } },
];

// The collector's runs, newest first, and what the newest one found. `changed` is true, false, or
// the string "first read" (analyst's notes): only true means the bytes differ from the run before.
function runInfo(readsResult) {
  if (!readsResult?.ok || !Array.isArray(readsResult.data?.runs)) return null;
  const runs = readsResult.data.runs.filter(r => r && typeof r.at === 'string').slice().sort((a, b) => b.at.localeCompare(a.at));
  if (!runs.length) return { runs };
  const reads = r => (Array.isArray(r.reads) ? r.reads : []);
  const last = runs[0];
  const changed = reads(last).filter(x => x.changed === true).length;
  const first = reads(last).filter(x => x.changed === 'first read').length;
  const lastChange = runs.find(r => reads(r).some(x => x.changed === true));
  return { runs, last, prev: runs[1] || null, total: reads(last).length, changed, first, failed: Number(last.failed) || 0, ok: Number(last.ok) || 0, lastChange };
}

const LIGHT_WORD = { fresh: 'Fresh', stale: 'Stale', old: 'Old', unknown: 'Read time unknown', fail: 'Could not read' };

function tile(src, S, publisherNote) {
  const head = (level, word) => h('div', { class: 'nd-tile-head' },
    h('span', { class: `nd-light nd-${level}`, 'aria-hidden': 'true' }), h('h3', {}, h('a', { href: S.page }, S.name)), h('span', { class: `nd-word nd-w-${level}` }, word));
  if (!src.latest.ok) {
    return h('article', { class: 'nd-tile nd-tile-fail', 'aria-label': `${S.name}: could not read` }, head('fail', LIGHT_WORD.fail),
      h('p', { class: 'nd-line' }, `${src.latest.error.charAt(0).toUpperCase() + src.latest.error.slice(1)}. Nothing is shown in its place.`),
      h('p', { class: 'nd-line nd-small' }, h('a', { href: src.latest.url }, 'latest.json')));
  }
  const d = src.latest.data;
  const readAt = d.read_at || d.provenance?.read_at;
  const st = staleness(readAt);
  let count = ''; try { count = S.count(d); } catch { count = ''; }
  const R = runInfo(src.reads);
  let runLine;
  if (!R) runLine = h('p', { class: 'nd-line nd-small' }, `Collector log not read: ${src.reads?.error || 'unknown reason'}.`);
  else if (!R.last) runLine = h('p', { class: 'nd-line nd-small' }, 'No collector runs recorded yet.');
  else {
    const what = R.changed ? `${R.total > 1 ? `${R.changed} of ${R.total} files` : 'the file'} changed since the run before`
      : R.first ? 'first read' : `no change in the publisher's bytes since the run before`;
    runLine = h('p', { class: 'nd-line nd-small' }, 'Last run ', h('span', { class: 'nd-mono' }, hm(R.last.at)), `: ${R.ok} of ${R.ok + R.failed} read${R.failed ? `, ${R.failed} failed` : ' ok'}; ${what}.`,
      R.lastChange && R.lastChange !== R.last ? [' Last change: run of ', h('span', { class: 'nd-mono' }, dayHm(R.lastChange.at)), '.'] : '');
  }
  return h('article', { class: `nd-tile nd-tile-${st.level}`, 'aria-label': `${S.name}: ${LIGHT_WORD[st.level]}` },
    head(st.level, LIGHT_WORD[st.level]),
    h('dl', { class: 'nd-kv' },
      h('div', {}, h('dt', {}, 'Read'), h('dd', { class: 'nd-mono' }, readAt ? dayHm(readAt) : 'unknown')),
      h('div', {}, h('dt', {}, 'Age'), h('dd', { class: 'nd-mono' }, ageText(ageMinutes(readAt))))),
    count ? h('p', { class: 'nd-line' }, count, '.') : null,
    runLine,
    h('p', { class: 'nd-line nd-small' }, publisherNote(src), ' ', h('a', { href: `https://data.promptugal.news/api/v1/${S.id}/card.json` }, 'card'), ' · ', h('a', { href: src.latest.url }, 'latest.json'), ' · ', h('a', { href: `https://data.promptugal.news/api/v1/${S.id}/reads.json` }, 'reads.json')));
}

async function board() {
  const tiles = $('tiles'), changes = $('changes');
  const holders = SOURCES.map(S => h('article', { class: 'nd-tile nd-tile-loading', 'aria-label': `${S.name}: reading` },
    h('div', { class: 'nd-tile-head' }, h('span', { class: 'nd-light nd-unknown', 'aria-hidden': 'true' }), h('h3', {}, S.name), h('span', { class: 'nd-word' }, 'Reading')),
    h('p', { class: 'nd-line nd-small', role: 'status' }, 'Reading from data.promptugal.news...')));
  put(tiles, holders);
  loading(changes, "the collector's logs");
  const results = await Promise.all(SOURCES.map(async (S, i) => {
    const src = await loadSource(S.id, { reads: true, onSlow: () => { const p = holders[i].querySelector('[role=status]'); if (p) p.textContent = 'Still reading: data.promptugal.news is slow to answer.'; } });
    const pub = s => s.card?.ok && s.card.data.publisher ? `Source: ${s.card.data.publisher}.` : 'Source: see the card.';
    const t = tile(src, S, pub);
    holders[i].replaceWith(t); holders[i] = t;
    return src;
  }));
  // The cards' terms, beside the tiles: the six IPMA sources share one, MeteoAlarm's differs.
  const ipmaTerms = results.find(r => r.id !== 'meteoalarm-pt' && r.card?.ok && r.card.data.terms?.summary)?.card.data.terms.summary;
  $('tiles-terms').replaceChildren(h('strong', {}, "IPMA's terms (from the source cards): "), ipmaTerms || h('em', {}, 'the cards could not be read; see each card before reuse.'),
    ' MeteoAlarm re-users must name IPMA, keep the time of issue, link ', h('a', { href: 'https://www.meteoalarm.org/' }, 'www.meteoalarm.org'), " and publish MeteoAlarm's disclaimer, shown under the changes when the feed is read. Fresh: read in the last 3 hours. Stale: 3 to 24 hours. Old: more than 24 hours.");
  whatChanged(changes, results);
}

// ---------- what changed at the last read ----------
function whatChanged(el, results) {
  const items = [];
  const same = [], noLog = [];
  for (const src of results) {
    const S = SOURCES.find(x => x.id === src.id);
    const R = runInfo(src.reads);
    if (!R || !R.last) { noLog.push(`${S.name} (${src.reads?.error || 'no runs recorded'})`); continue; }
    const since = R.prev ? [' since the run of ', h('span', { class: 'nd-mono' }, dayHm(R.prev.at))] : '';
    if (R.failed) items.push(h('li', { class: 'nd-ch-fail' }, h('strong', {}, `${S.name}: `), `${R.failed} of ${R.ok + R.failed} request${R.ok + R.failed === 1 ? '' : 's'} failed at the run of `, h('span', { class: 'nd-mono' }, dayHm(R.last.at)), '.'));
    if (R.changed) items.push(h('li', {}, h('strong', {}, `${S.name}: `), `${R.total > 1 ? `${R.changed} of ${R.total} files` : "the publisher's file"} changed at the run of `, h('span', { class: 'nd-mono' }, dayHm(R.last.at)), since, '.'));
    else if (R.first) items.push(h('li', {}, h('strong', {}, `${S.name}: `), 'the run of ', h('span', { class: 'nd-mono' }, dayHm(R.last.at)), ' was the first read, so there is nothing to compare.'));
    else same.push([S.name, R]);
  }
  if (same.length) items.push(h('li', {}, h('strong', {}, 'Unchanged at the last run: '), same.map(([n, R], i) => [i ? ', ' : '', n, ' (', h('span', { class: 'nd-mono' }, hm(R.last.at)), ')']), '. The same bytes as the run before.'));
  if (noLog.length) items.push(h('li', {}, h('strong', {}, 'No collector log: '), noLog.join('; '), '.'));

  // MeteoAlarm's own changes field: messages that appeared in or left the feed since the last read.
  const M = results.find(r => r.id === 'meteoalarm-pt');
  let maBlock = null;
  if (M?.latest?.ok) {
    const d = M.latest.data, ch = d.changes;
    const desc = m => (m && typeof m === 'object' ? [m.level && ['yellow', 'orange', 'red'].includes(m.level) ? lvl(m.level) : (m.level || ''), ' ', [m.area, m.event || m.hazard].filter(Boolean).join(': ') || m.id || 'a message', m.sent_utc ? ` (issued ${fmtUTC(m.sent_utc)})` : ''] : String(m));
    if (ch && (Array.isArray(ch.appeared) || Array.isArray(ch.left))) {
      const ap = Array.isArray(ch.appeared) ? ch.appeared : [], lf = Array.isArray(ch.left) ? ch.left : [];
      const since = ch.since ? fmtUTC(ch.since) : 'the previous read';
      items.push(h('li', {}, h('strong', {}, 'MeteoAlarm: '), ap.length || lf.length
        ? [`since ${since}, ${ap.length} message${ap.length === 1 ? '' : 's'} appeared in the feed and ${lf.length} left it.`,
          ap.length ? h('ul', {}, ap.map(m => h('li', {}, 'Appeared: ', desc(m)))) : null, lf.length ? h('ul', {}, lf.map(m => h('li', {}, 'Left: ', desc(m)))) : null]
        : `no message appeared in the feed or left it since ${since} (the file's changes field).`));
    } else items.push(h('li', {}, h('strong', {}, 'MeteoAlarm: '), "the file has no changes field, so nothing is said about what changed."));
    const at = d.attribution || {};
    maBlock = h('p', { class: 'note' }, h('strong', {}, 'National service: '), at.national_service || 'IPMA, Instituto Português do Mar e da Atmosfera', '. Via ', h('a', { href: 'https://www.meteoalarm.org/' }, 'www.meteoalarm.org'), '. ',
      h('strong', {}, "MeteoAlarm's disclaimer: "), at.disclaimer || h('em', {}, 'not in the file; see www.meteoalarm.org.'));
  } else if (M) items.push(h('li', { class: 'nd-ch-fail' }, h('strong', {}, 'MeteoAlarm: '), `could not read the feed (${M.latest.error}), so nothing is said about its changes.`));

  const W = results.find(r => r.id === 'ipma-warnings');
  put(el, h('div', { class: 'panel' }, h('ul', { class: 'nd-changes' }, items),
    h('p', { class: 'note' }, "From each source's reads.json (the collector's log: when it ran, whether each request succeeded, and whether the publisher's bytes differed from the run before) and MeteoAlarm's changes field. reads.json holds no past values, so this page cannot say which figures changed, only that a file did."),
    maBlock),
  W?.latest?.ok ? provenance(W, { note: "Shown for the warnings; every tile above links its own card, latest.json and reads.json." }) : null,
  M?.latest?.ok ? provenance(M, { pageLabel: 'MeteoAlarm page' }) : null);
}

// ---------- the map and the list ----------
async function warnings() {
  const block = $('warnings-block'), table = $('warnings-table');
  const slows = [loading(block, "IPMA's warnings"), loading(table, "IPMA's warnings")];
  const [W, F] = await Promise.all([loadSource('ipma-warnings', { onSlow: () => slows.forEach(f => f()) }), loadSource('ipma-fire-risk')]);
  if (!W.latest.ok) { failure(block, "IPMA's warnings", W.latest, IPMA_WARN); failure(table, "IPMA's warnings", W.latest, IPMA_WARN); return; }
  warningsBlock(block, W, F, { tableId: 'w-table-h' });
  put(table, h('div', { class: 'panel' }, warningTable(W.latest.data.active)), provenance(W));
}

// ---------- the forecast for five places ----------
const PLACES = ['Porto', 'Lisboa', 'Faro', 'Funchal', 'Ponta Delgada'];
async function forecast() {
  const el = $('forecast');
  const slow = loading(el, "IPMA's forecasts");
  const src = await loadSource('ipma-city-forecasts', { onSlow: slow });
  if (!src.latest.ok) { failure(el, "IPMA's forecasts", src.latest, IPMA_FC); return; }
  const cities = Array.isArray(src.latest.data.cities) ? src.latest.data.cities : [];
  const today = lisbonNow().slice(0, 10);
  const places = PLACES.map(n => [n, cities.find(c => c.name === n)]);
  const dates = [...new Set(places.flatMap(([, c]) => (c?.days || []).map(d => d.date)))].filter(d => typeof d === 'string' && d >= today).sort();
  if (!dates.length) { put(el, ageBanner(src.latest, { page: IPMA_FC }), h('p', { class: 'status' }, `IPMA's forecast file holds no days from today (${fmtDay(today)}) for these places. Nothing is shown in their place.`), provenance(src)); return; }
  const t = v => (fin(v) ? v.toFixed(1) : 'none');
  const table = h('table', { class: 'nd-ftable' },
    h('caption', {}, "IPMA's daily forecast: minimum to maximum temperature in °C (tenths as in the file), chance of rain, weather as IPMA's code table names it, and wind direction and class."),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Place'), dates.map(d => h('th', { scope: 'col' }, d === today ? `Today, ${fmtDay(d)}` : fmtDay(d))))),
    h('tbody', {}, places.map(([n, c]) => h('tr', {}, h('th', { scope: 'row' }, n), !c ? h('td', { colspan: String(dates.length), class: 'muted' }, 'not in the forecast file') : dates.map(date => {
      const d = (c.days || []).find(x => x.date === date);
      if (!d) return h('td', { class: 'muted' }, 'no value');
      const wx = fin(d.weather_type) && d.weather_type > 0 ? WEATHER_TYPES[d.weather_type] : null;
      return h('td', {}, h('span', { class: 'nd-mono nd-t' }, `${t(d.t_min_c)} to ${t(d.t_max_c)}`), h('br'),
        h('span', { class: 'nd-small' }, `rain ${fin(d.rain_prob_pct) ? d.rain_prob_pct + '%' : 'not given'}`), h('br'),
        h('span', { class: 'nd-small' }, wx || 'weather not given'), h('br'),
        h('span', { class: 'nd-small' }, d.wind_dir ? `wind ${d.wind_dir}${WIND_CLASS[d.wind_class] ? ', ' + WIND_CLASS[d.wind_class].toLowerCase() : ''}` : 'wind not given'));
    })))));
  put(el, ageBanner(src.latest, { page: IPMA_FC }), h('div', { class: 'panel nd-scroll', tabindex: '0', role: 'region', 'aria-label': 'Forecast for five places, scrolls sideways on narrow screens' }, table), provenance(src));
}

board().catch(e => failure($('tiles'), 'the sources', { error: `the page could not draw the files (${e.message})` }, IPMA_WARN));
warnings().catch(e => failure($('warnings-block'), "IPMA's warnings", { error: `the page could not draw the file (${e.message})` }, IPMA_WARN));
forecast().catch(e => failure($('forecast'), "IPMA's forecasts", { error: `the page could not draw the file (${e.message})` }, IPMA_FC));
