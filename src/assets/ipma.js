// IPMA data, drawn: reads data.promptugal.news live in the visitor's browser and draws it.
// Code Apache-2.0. No third-party code. Data from the API reaches the page only through
// textContent and setAttribute (never innerHTML), and links from the data must be http(s).
//
// The exact field names of each latest.json were not checked when this version was written,
// so every reader below looks for the usual IPMA field names and some plain-English ones,
// and every page also offers a plain table of all records. When a field cannot be found,
// the page says so instead of guessing.
'use strict';
(function () {
  const API = 'https://data.promptugal.news/api/v1/';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TZ = 'Europe/Lisbon';

  // ---------- DOM helpers ----------
  function setAttrs(el, a) {
    if (!a) return;
    for (const [k, v] of Object.entries(a)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  function addKids(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.append(k instanceof Node ? k : String(k));
    }
  }
  function h(tag, attrs, ...kids) { const el = document.createElement(tag); setAttrs(el, attrs); addKids(el, kids); return el; }
  function s(tag, attrs, ...kids) { const el = document.createElementNS(SVGNS, tag); setAttrs(el, attrs); addKids(el, kids); return el; }
  function safeUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null; }
  function link(u, text) { const ok = safeUrl(u); return ok ? h('a', { href: ok }, text || ok) : (text || String(u)); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function status(kind, ...kids) { return h('p', { class: 'status ' + kind }, ...kids); }
  const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('en-GB');

  // ---------- data helpers ----------
  const isObj = v => v != null && typeof v === 'object' && !Array.isArray(v);

  // Flatten nested objects into dotted keys (arrays are kept as values).
  function flat(obj, prefix, out, depth) {
    out = out || {}; depth = depth || 0;
    for (const [k, v] of Object.entries(obj || {})) {
      const key = prefix ? prefix + '.' + k : k;
      if (isObj(v) && depth < 3) flat(v, key, out, depth + 1);
      else out[key] = v;
    }
    return out;
  }
  // First value whose key (last segment) matches a pattern; earlier patterns win.
  function pick(rec, ...patterns) {
    for (const p of patterns) {
      for (const [k, v] of Object.entries(rec)) {
        if (v == null || v === '' || (typeof v === 'object')) continue;
        if (p.test(k.split('.').pop())) return v;
      }
    }
    return undefined;
  }
  // IPMA marks missing observations with -99 (and sometimes -99.0 or "-99").
  function num(v) {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n <= -99) return null;
    return n;
  }
  function featureToRec(f) {
    const r = Object.assign({}, f.properties || {});
    const c = f.geometry && f.geometry.type === 'Point' && f.geometry.coordinates;
    if (Array.isArray(c)) { r._lon = c[0]; r._lat = c[1]; }
    if (f.id != null && r.id == null) r.id = f.id;
    return r;
  }
  // Find the main list of records in a JSON document: the largest array of objects,
  // or the largest map of id -> object, searching a few levels deep.
  function records(json) {
    let best = null;
    const consider = list => { if (list.length && (!best || list.length > best.length)) best = list; };
    (function walk(node, depth) {
      if (depth > 4 || node == null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        const objs = node.filter(isObj);
        if (objs.length && objs.length >= node.length / 2) consider(objs);
        return;
      }
      if (node.type === 'FeatureCollection' && Array.isArray(node.features)) { consider(node.features); return; }
      const entries = Object.entries(node);
      if (entries.length >= 3 && entries.every(([, v]) => isObj(v))) consider(entries.map(([k, v]) => Object.assign({ _key: k }, v)));
      for (const [, v] of entries) walk(v, depth + 1);
    })(json, 0);
    return (best || []).map(r => flat(r.type === 'Feature' ? featureToRec(r) : r));
  }
  function parseTime(v) {
    if (v == null || v === '') return null;
    let d;
    if (typeof v === 'number') d = new Date(v > 1e12 ? v : v * 1000);
    else if (typeof v === 'string') {
      if (!/\d{4}-\d{2}-\d{2}|\d{1,2} \w{3} \d{4}/.test(v)) return null;
      d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(v) ? v.replace(' ', 'T') : v);
    } else return null;
    return isNaN(d) || d.getFullYear() < 2000 ? null : d;
  }
  const READ_KEYS = [
    /^(read|fetched|retrieved|collected|harvested|captured)(_?at|_?time|_?on|_?utc)?$/i,
    /^(read|fetch|retriev|collect|harvest)/i,
    /^(generated|updated|last_?updated|last_?modified|as_?of|timestamp)(_?at|_?utc)?$/i
  ];
  // Find a read time near the top of a JSON document. Returns {key, date} or null.
  function findTime(json, patterns) {
    if (!isObj(json)) return null;
    const f = flat(json);
    for (const p of patterns || READ_KEYS) {
      for (const [k, v] of Object.entries(f)) {
        if (k.split('.').length > 2) continue;
        if (p.test(k.split('.').pop())) { const d = parseTime(v); if (d) return { key: k, date: d }; }
      }
    }
    return null;
  }
  function when(d) {
    if (!d) return 'unknown';
    return d.toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Lisbon time';
  }
  function dayLabel(d) { return d ? d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }) : '?'; }
  function ago(d) {
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 0) return 'in the future (check the clock)';
    if (mins < 60) return mins + ' min ago';
    const hrs = mins / 60;
    if (hrs < 48) return fmt1(hrs) + ' hours ago';
    return Math.round(hrs / 24) + ' days ago';
  }
  const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // ---------- fetching ----------
  async function getJSON(path) {
    const url = API + path;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(url + ' answered HTTP ' + res.status);
    const json = await res.json();
    return { url, json, lastModified: res.headers.get('Last-Modified') };
  }
  async function load(source, withReads) {
    const parts = [getJSON(source + '/latest.json'), getJSON(source + '/card.json')];
    if (withReads) parts.push(getJSON(source + '/reads.json'));
    const [latest, card, reads] = await Promise.allSettled(parts);
    return { source, latest, card, reads };
  }

  // ---------- provenance panel ----------
  const SOURCE_NAMES = {
    'ipma-warnings': 'IPMA weather warnings',
    'ipma-city-forecasts': 'IPMA city forecasts',
    'ipma-observations': 'IPMA surface observations',
    'ipma-fire-risk': 'IPMA fire risk (RCM)',
    'ipma-sea': 'IPMA sea state',
    'ipma-uv': 'IPMA UV index',
    'meteoalarm-pt': 'MeteoAlarm CAP feed for Portugal'
  };
  function readTimeOf(data) {
    if (data.latest.status !== 'fulfilled') return null;
    const L = data.latest.value;
    const t = findTime(L.json);
    if (t) return { date: t.date, how: 'field "' + t.key + '" in latest.json' };
    if (data.card.status === 'fulfilled') {
      const c = findTime(data.card.value.json);
      if (c) return { date: c.date, how: 'field "' + c.key + '" in card.json' };
    }
    if (L.lastModified) { const d = new Date(L.lastModified); if (!isNaN(d)) return { date: d, how: 'the Last-Modified header of latest.json' }; }
    return null;
  }
  function provenance(data, staleHours) {
    const box = h('aside', { class: 'prov panel', 'aria-label': 'Source and read time' });
    const isIpma = data.source.startsWith('ipma-');
    box.append(h('h3', null, 'Source: ' + (SOURCE_NAMES[data.source] || data.source)));
    if (isIpma) box.append(h('p', null, 'Data: IPMA, Instituto Português do Mar e da Atmosfera (', h('a', { href: 'https://www.ipma.pt' }, 'ipma.pt'), '). Collected by PrompTugal.news and served by ', h('a', { href: 'https://data.promptugal.news' }, 'data.promptugal.news'), '. This site is not IPMA and is not official.'));
    else box.append(h('p', null, 'Collected by PrompTugal.news and served by ', h('a', { href: 'https://data.promptugal.news' }, 'data.promptugal.news'), '. This site is not official.'));

    if (data.latest.status !== 'fulfilled') {
      box.append(status('error', 'latest.json could not be read: ' + data.latest.reason.message + '. Nothing is drawn from it.'));
    } else {
      const t = readTimeOf(data);
      if (!t) box.append(status('stale', 'No read time found in latest.json or card.json. Treat these figures as being of unknown age.'));
      else {
        const hrs = (Date.now() - t.date.getTime()) / 3600000;
        const stale = hrs > staleHours;
        box.append(status(stale ? 'stale' : 'ok',
          h('strong', null, 'Read ' + when(t.date)), ' (' + ago(t.date) + '), from ' + t.how + '.',
          stale ? ' This is older than ' + staleHours + ' hours, so it may be stale. Check ipma.pt for the current position.' : ''));
      }
      const issued = findTime(data.latest.value.json, [/^(dataUpdate|dataRun|issued(_?at)?|data_?update|ipma_?updated)$/i]);
      if (issued) box.append(h('p', null, 'IPMA issue time given in the file: ' + when(issued.date) + '.'));
    }

    if (isIpma) box.append(h('p', null, h('strong', null, 'Terms: '), 'IPMA data is free to copy and use for personal or public use if the use has no profit-making or offensive purpose; always name IPMA as the source (as given on data.promptugal.news).'));

    if (data.card.status === 'fulfilled') {
      const card = flat(data.card.value.json);
      const terms = pick(card, /^(terms|licen[cs]e|terms_of_use|usage|attribution)$/i, /terms|licen[cs]e|attribution/i);
      if (terms != null) box.append(h('p', null, h('strong', null, 'From the source card: '), String(terms)));
      const dl = h('dl');
      let n = 0;
      for (const [k, v] of Object.entries(card)) {
        if (n >= 40 || v == null || typeof v === 'object') continue;
        dl.append(h('dt', null, k), h('dd', null, typeof v === 'string' && safeUrl(v) ? link(v) : String(v)));
        n++;
      }
      box.append(h('details', null, h('summary', null, 'Full source card'), dl));
    } else {
      box.append(status('error', 'card.json could not be read: ' + data.card.reason.message + '.'));
    }
    box.append(h('p', null, 'Files: ', h('a', { href: API + data.source + '/latest.json' }, 'latest.json'), ' · ', h('a', { href: API + data.source + '/card.json' }, 'card.json'), ' · ', h('a', { href: API + data.source + '/reads.json' }, 'reads.json'), ' · ', h('a', { href: API + data.source + '/openapi.json' }, 'openapi.json')));
    return box;
  }

  // ---------- reads history ----------
  function readsChart(data) {
    const wrap = h('div');
    if (!data.reads || data.reads.status !== 'fulfilled') {
      wrap.append(status('error', 'reads.json could not be read' + (data.reads ? ': ' + data.reads.reason.message : '') + '.'));
      return wrap;
    }
    const json = data.reads.value.json;
    let times = [];
    if (Array.isArray(json) && json.every(v => typeof v === 'string' || typeof v === 'number')) times = json.map(parseTime);
    else {
      for (const r of records(json)) {
        const t = pick(r, ...READ_KEYS, /(^|_)(at|time|date)$/i, /time|date/i);
        times.push(parseTime(t));
      }
    }
    times = times.filter(Boolean).sort((a, b) => a - b);
    if (!times.length) { wrap.append(status('error', 'reads.json holds no read times this page can recognise.')); return wrap; }
    const end = Date.now(), start = end - 7 * 864e5;
    const recent = times.filter(t => t.getTime() >= start && t.getTime() <= end);
    const W = 640, H = 70, L = 10, R = 10;
    const x = t => L + (t - start) / (end - start) * (W - L - R);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${recent.length} reads in the last 7 days` });
    svg.append(s('line', { class: 'axis', x1: L, x2: W - R, y1: 40, y2: 40 }));
    for (let d = 0; d <= 7; d++) {
      const tx = x(start + d * 864e5);
      svg.append(s('line', { class: 'gridline', x1: tx, x2: tx, y1: 22, y2: 44 }));
      if (d < 7) svg.append(s('text', { x: tx + 4, y: 60, 'font-size': 11, class: 'muted-text' }, dayLabel(new Date(start + d * 864e5 + 12 * 36e5))));
    }
    for (const t of recent) {
      svg.append(s('circle', { class: 'dot', cx: x(t.getTime()), cy: 32, r: 4, fill: 'var(--accent)', tabindex: 0 }, s('title', null, 'Read ' + when(t))));
    }
    wrap.append(h('figure', null, svg, h('figcaption', null,
      `Each dot is one read of this source by PrompTugal.news's collector in the last 7 days (${recent.length} reads; ${times.length} in reads.json in all, first ${when(times[0])}, last ${when(times[times.length - 1])}). Source: reads.json.`)));
    return wrap;
  }

  // ---------- generic table ----------
  function recordTable(recs, caption) {
    const cols = [];
    for (const r of recs.slice(0, 60)) for (const [k, v] of Object.entries(r)) if (!cols.includes(k) && (v == null || typeof v !== 'object')) cols.push(k);
    const shown = cols.slice(0, 14);
    const input = h('input', { type: 'search', placeholder: 'Filter rows', 'aria-label': 'Filter rows' });
    const tbody = h('tbody');
    const rows = recs.slice(0, 1000).map(r => {
      const tr = h('tr', null, shown.map(c => h('td', null, r[c] == null ? '' : String(r[c]))));
      tr.dataset.text = norm(shown.map(c => r[c]).join(' '));
      return tr;
    });
    tbody.append(...rows);
    input.addEventListener('input', () => { const q = norm(input.value); for (const tr of rows) tr.hidden = q && !tr.dataset.text.includes(q); });
    return h('details', null, h('summary', null, caption || `All records (${recs.length})`),
      h('p', { class: 'small' }, `As read from latest.json, ${recs.length} record(s), first ${shown.length} of ${cols.length} column(s).`, recs.length > 1000 ? ' Only the first 1000 rows are shown.' : ''),
      input,
      h('div', { class: 'table-scroll' }, h('table', null, h('thead', null, h('tr', null, shown.map(c => h('th', { scope: 'col' }, c)))), tbody)));
  }
  function legend(items) { return h('ul', { class: 'legend' }, items.map(([colour, label]) => h('li', null, h('span', { class: 'swatch', style: 'background:' + colour }), label))); }

  // ---------- warnings ----------
  // IPMA warning area codes and their places, drawn as a schematic tile map (not to scale).
  const AREAS = {
    VCT: ['Viana do Castelo', 1, 0], BRG: ['Braga', 2, 0], VRL: ['Vila Real', 3, 0], BGC: ['Bragança', 4, 0],
    PTO: ['Porto', 1, 1], VIS: ['Viseu', 2, 1], GDA: ['Guarda', 3, 1],
    AVR: ['Aveiro', 1, 2], CBR: ['Coimbra', 2, 2], CBO: ['Castelo Branco', 3, 2],
    LRA: ['Leiria', 1, 3], STM: ['Santarém', 2, 3], PTG: ['Portalegre', 3, 3],
    LSB: ['Lisboa', 1, 4], STB: ['Setúbal', 2, 4], EVR: ['Évora', 3, 4],
    BJA: ['Beja', 2, 5], FAR: ['Faro', 2, 6],
    AOC: ['Açores, Grupo Ocidental', 'az', 0], ACE: ['Açores, Grupo Central', 'az', 1], AOR: ['Açores, Grupo Oriental', 'az', 2],
    MCN: ['Madeira, Costa Norte', 'ma', 0], MCS: ['Madeira, Costa Sul', 'ma', 1], MRM: ['Madeira, Regiões Montanhosas', 'ma', 2], MPS: ['Porto Santo', 'ma', 3]
  };
  const LEVELS = [
    { name: 'Green', colour: 'var(--good)', ink: '#0b0b0b' },
    { name: 'Yellow', colour: 'var(--warning)', ink: '#0b0b0b' },
    { name: 'Orange', colour: 'var(--serious)', ink: '#0b0b0b' },
    { name: 'Red', colour: 'var(--critical)', ink: '#ffffff' }
  ];
  function levelRank(v) {
    const t = norm(v);
    if (/red|vermelh/.test(t)) return 3;
    if (/orange|laranj/.test(t)) return 2;
    if (/yellow|amarel/.test(t)) return 1;
    if (/green|verde/.test(t)) return 0;
    const m = t.match(/^(\d)(;|$)/); // MeteoAlarm style "2; yellow" or numbers 1 to 4
    if (m) { const n = Number(m[1]); if (n >= 1 && n <= 4) return n - 1; }
    return -1;
  }
  function areaCode(v) {
    if (v == null) return null;
    const up = String(v).trim().toUpperCase();
    if (AREAS[up]) return up;
    const n = norm(v);
    for (const [code, [name]] of Object.entries(AREAS)) if (norm(name) === n || norm(name.split(', ').pop()) === n) return code;
    return null;
  }
  function readWarnings(json) {
    const recs = records(json);
    return recs.map(r => {
      const area = pick(r, /^idAreaAviso$/i, /^area_?(id|code)$/i, /^(area|region|district|zone|areaDesc|area_name)$/i, /area/i);
      return {
        raw: r,
        area,
        code: areaCode(area),
        level: levelRank(pick(r, /^awarenessLevelID$/i, /^(level|awareness_?level|colou?r|severity)$/i, /level|colou?r|severity/i)),
        type: pick(r, /^awarenessTypeName$/i, /^(type|phenomenon|hazard|event|awareness_?type)$/i, /type|phenom|hazard|event/i),
        start: parseTime(pick(r, /^startTime$/i, /^(start|onset|from|effective|begins)(_?time|_?at)?$/i, /start|onset/i)),
        end: parseTime(pick(r, /^endTime$/i, /^(end|expires|until|to|ends)(_?time|_?at)?$/i, /end|expir/i)),
        text: pick(r, /^text$/i, /^(description|texto|headline|instruction)$/i)
      };
    });
  }
  function warningMap(warns) {
    const now = Date.now();
    const byArea = {};
    for (const w of warns) {
      if (!w.code || w.level < 0) continue;
      if (w.end && w.end.getTime() < now) continue; // already over
      byArea[w.code] = Math.max(byArea[w.code] == null ? -1 : byArea[w.code], w.level);
    }
    const W = 620, H = 432;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Schematic map of IPMA warning areas, coloured by the highest warning level in force now or later' });
    const tile = (code, x, y, w, hgt) => {
      const [name] = AREAS[code];
      const lv = byArea[code];
      const L = lv != null && lv >= 0 ? LEVELS[lv] : null;
      const word = L ? L.name : 'No data';
      const g = s('g', { tabindex: 0, role: 'img', 'aria-label': `${name}: ${word}` },
        s('title', null, `${name} (${code}): ${L ? 'highest level ' + word : 'no current warning found in the file'}`),
        s('rect', { class: 'tile', x, y, width: w, height: hgt, rx: 5, fill: L ? L.colour : 'var(--nodata)' }),
        s('text', { x: x + w / 2, y: y + hgt / 2 - 2, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, style: 'fill:' + (L ? L.ink : 'var(--ink)') }, code),
        s('text', { x: x + w / 2, y: y + hgt / 2 + 14, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:' + (L ? L.ink : 'var(--ink)') }, word));
      svg.append(g);
    };
    svg.append(s('text', { x: 230, y: 12, 'font-size': 12, class: 'muted-text' }, 'Mainland (districts)'));
    svg.append(s('text', { x: 16, y: 48, 'font-size': 12, class: 'muted-text' }, 'Açores'));
    svg.append(s('text', { x: 16, y: 238, 'font-size': 12, class: 'muted-text' }, 'Madeira'));
    for (const [code, [, c, r]] of Object.entries(AREAS)) {
      if (c === 'az') tile(code, 16 + r * 66, 56, 62, 50);
      else if (c === 'ma') tile(code, 16 + (r % 2) * 66, 246 + Math.floor(r / 2) * 56, 62, 50);
      else tile(code, 230 + c * 76, 20 + r * 58, 72, 52);
    }
    return h('figure', null, svg,
      legend(LEVELS.map(L => [L.colour, L.name]).concat([['var(--nodata)', 'No data']])),
      h('figcaption', null, 'Schematic map: each tile is one IPMA warning area, placed roughly where it lies, not to scale. Colour shows the highest warning level in the file whose end time has not passed. Source: IPMA, via data.promptugal.news.'));
  }
  function warningList(warns) {
    const now = Date.now();
    const active = warns.filter(w => w.level > 0 && !(w.end && w.end.getTime() < now)).sort((a, b) => b.level - a.level || (a.start || 0) - (b.start || 0));
    if (!active.length) return h('p', null, 'No yellow, orange or red warning in force or ahead in this file.');
    const rows = active.map(w => h('tr', null,
      h('td', null, w.code ? AREAS[w.code][0] : String(w.area == null ? '?' : w.area)),
      h('td', null, h('span', { class: 'level l' + w.level }, LEVELS[w.level].name)),
      h('td', null, w.type == null ? '' : String(w.type)),
      h('td', null, w.start ? when(w.start) : '?'),
      h('td', null, w.end ? when(w.end) : '?'),
      h('td', null, w.text == null ? '' : String(w.text))));
    return h('div', { class: 'table-scroll' }, h('table', null,
      h('thead', null, h('tr', null, ['Area', 'Level', 'Type', 'From', 'Until', 'Text'].map(c => h('th', { scope: 'col' }, c)))),
      h('tbody', null, rows)));
  }
  function warningNotes(warns) {
    const unknown = [...new Set(warns.filter(w => !w.code).map(w => String(w.area)))];
    const noLevel = warns.filter(w => w.level < 0).length;
    const out = [];
    if (!warns.length) out.push(status('error', 'No warning records were found in latest.json.'));
    if (unknown.length) out.push(h('p', { class: 'small' }, 'Areas in the file that are not on the map: ' + unknown.slice(0, 20).join(', ') + (unknown.length > 20 ? ' and more' : '') + '.'));
    if (noLevel) out.push(h('p', { class: 'small' }, noLevel + ' record(s) had no level this page could recognise and are left off the map.'));
    return out;
  }

  // ---------- forecasts ----------
  const PLACE_KEYS = [/^(local|name|place|city|location|nome|place_?name|city_?name|localName|station_?name|estacao|concelho|municipality|municipio)$/i, /name|place|local/i];
  function placeName(r) {
    const n = pick(r, ...PLACE_KEYS);
    if (n != null && typeof n !== 'number') return String(n);
    const id = pick(r, /^globalIdLocal$/i, /^(id|place_?id|station_?id|_key|dico)$/i);
    return id != null ? 'place id ' + id : '?';
  }
  // Returns [{place, days:[{date, tmin, tmax, rain, wx}]}]
  function readForecasts(json) {
    const recs = records(json);
    const toDay = r => ({
      date: parseTime(pick(r, /^forecastDate$/i, /^(date|day|dataPrev|valid_?date|forecast_?date)$/i, /date|day/i)),
      tmin: num(pick(r, /^tMin$/i, /^(min_?temp|temp_?min|tmin|temperature_?min)$/i, /min/i)),
      tmax: num(pick(r, /^tMax$/i, /^(max_?temp|temp_?max|tmax|temperature_?max)$/i, /max/i)),
      rain: num(pick(r, /^precipitaProb$/i, /precip.*prob|prob.*precip|rain.*prob/i)),
      wx: pick(r, /^(weather_?desc|descWeatherTypeEN|weather_?type_?(name|en|desc)|summary|weather)$/i),
      wxId: pick(r, /^idWeatherType$/i, /weather_?type(_?id)?$/i)
    });
    const nested = recs.length && Object.keys(recs[0]).find(k => Array.isArray(recs[0][k]) && recs[0][k].some(isObj));
    let places = [];
    if (nested) {
      places = recs.map(r => {
        const arr = Object.entries(r).find(([, v]) => Array.isArray(v) && v.some(isObj));
        return { place: placeName(r), days: arr ? arr[1].filter(isObj).map(d => toDay(flat(d))) : [] };
      });
    } else {
      const groups = new Map();
      for (const r of recs) {
        const p = placeName(r);
        if (!groups.has(p)) groups.set(p, []);
        groups.get(p).push(toDay(r));
      }
      places = [...groups].map(([place, days]) => ({ place, days }));
    }
    for (const p of places) p.days.sort((a, b) => (a.date || 0) - (b.date || 0));
    return places.filter(p => p.days.some(d => d.tmin != null || d.tmax != null));
  }
  function forecastChart(p, lo, hi) {
    const days = p.days.slice(0, 5);
    const W = 300, H = 190, T = 22, B = 46, L = 30, R = 6;
    const y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    const bw = (W - L - R) / days.length;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Forecast for ${p.place}: daily minimum and maximum temperature` });
    const step = hi - lo > 25 ? 10 : 5;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      svg.append(s('line', { class: 'gridline', x1: L, x2: W - R, y1: y(v), y2: y(v) }));
      svg.append(s('text', { x: L - 4, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 10, class: 'muted-text' }, v + '°'));
    }
    days.forEach((d, i) => {
      const cx = L + bw * i + bw / 2;
      const tip = `${dayLabel(d.date)}: min ${d.tmin == null ? '?' : d.tmin + ' °C'}, max ${d.tmax == null ? '?' : d.tmax + ' °C'}, chance of rain ${d.rain == null ? '?' : d.rain + '%'}${d.wx ? ', ' + d.wx : ''}`;
      const g = s('g', { tabindex: 0 }, s('title', null, tip));
      g.append(s('rect', { x: cx - bw / 2, y: T, width: bw, height: H - T - B, fill: 'transparent' }));
      if (d.tmin != null && d.tmax != null) {
        g.append(s('rect', { x: cx - 5, y: y(d.tmax), width: 10, height: Math.max(2, y(d.tmin) - y(d.tmax)), rx: 4, fill: 'var(--accent)' }));
        g.append(s('text', { x: cx, y: y(d.tmax) - 5, 'text-anchor': 'middle', 'font-size': 11 }, Math.round(d.tmax) + '°'));
        g.append(s('text', { x: cx, y: y(d.tmin) + 13, 'text-anchor': 'middle', 'font-size': 11, class: 'muted-text' }, Math.round(d.tmin) + '°'));
      }
      g.append(s('text', { x: cx, y: H - B + 18, 'text-anchor': 'middle', 'font-size': 10.5, class: 'muted-text' }, d.date ? d.date.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short' }) : '?'));
      g.append(s('text', { x: cx, y: H - B + 34, 'text-anchor': 'middle', 'font-size': 10.5 }, d.rain == null ? '' : Math.round(d.rain) + '%'));
      svg.append(g);
    });
    svg.append(s('text', { x: W - R, y: H - 4, 'text-anchor': 'end', 'font-size': 9.5, class: 'muted-text' }, 'bottom row: chance of rain'));
    return h('div', { class: 'card' }, h('h3', null, p.place), svg);
  }
  function forecastGrid(places) {
    let lo = Infinity, hi = -Infinity;
    for (const p of places) for (const d of p.days.slice(0, 5)) for (const v of [d.tmin, d.tmax]) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    lo = Math.floor((lo - 2) / 5) * 5; hi = Math.ceil((hi + 2) / 5) * 5;
    return h('div', { class: 'cards' }, places.map(p => forecastChart(p, lo, hi)));
  }

  // ---------- dot maps ----------
  const BOXES = [
    { name: 'Mainland', lon: [-9.6, -6.1], lat: [36.9, 42.2], x: 220, y: 10, w: 300 },
    { name: 'Açores', lon: [-31.4, -24.9], lat: [36.8, 39.9], x: 10, y: 10, w: 200 },
    { name: 'Madeira', lon: [-17.4, -16.1], lat: [32.5, 33.2], x: 10, y: 200, w: 200 }
  ];
  function lonLat(r) {
    let lat = num(pick(r, /^_?lat(itude)?$/i));
    let lon = pick(r, /^_?(lon|lng|long|longitude)$/i);
    lon = lon == null ? null : Number(lon);
    if (lat == null || !Number.isFinite(lon)) {
      const c = Object.values(r).find(v => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number'));
      if (c) { lon = c[0]; lat = c[1]; }
    }
    return lat != null && Number.isFinite(lon) ? [lon, lat] : null;
  }
  // points: [{ll:[lon,lat], fill, tip}]
  function dotMap(points, label) {
    const W = 530;
    const geo = BOXES.map(b => {
      const k = Math.cos((b.lat[0] + b.lat[1]) / 2 * Math.PI / 180);
      const sx = b.w / ((b.lon[1] - b.lon[0]) * k);
      return Object.assign({}, b, { k, sx, h: (b.lat[1] - b.lat[0]) * sx });
    });
    const H = Math.max(...geo.map(g => g.y + g.h)) + 10;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
    let outside = 0;
    for (const g of geo) {
      svg.append(s('rect', { class: 'panel-box', x: g.x, y: g.y, width: g.w, height: g.h, rx: 4 }));
      svg.append(s('text', { x: g.x + 6, y: g.y + 15, 'font-size': 11, class: 'muted-text' }, g.name));
    }
    for (const p of points) {
      const [lon, lat] = p.ll;
      const g = geo.find(b => lon >= b.lon[0] && lon <= b.lon[1] && lat >= b.lat[0] && lat <= b.lat[1]);
      if (!g) { outside++; continue; }
      const x = g.x + (lon - g.lon[0]) * g.k * g.sx;
      const y = g.y + (g.lat[1] - lat) * g.sx;
      svg.append(s('circle', { class: 'dot', cx: x, cy: y, r: 5, fill: p.fill, tabindex: 0 }, s('title', null, p.tip)));
    }
    return { svg, outside };
  }
  // Ordinal ramp used for temperature and similar magnitudes (light to dark).
  const WARM = ['#fbd5b5', '#f5a26f', '#eb6834', '#b8481d', '#7a2e10'];
  function bins(values, n) {
    const v = values.filter(x => x != null).sort((a, b) => a - b);
    if (!v.length) return null;
    const lo = Math.floor(v[0]), hi = Math.ceil(v[v.length - 1]);
    const step = Math.max(1, Math.ceil((hi - lo) / n));
    return { lo, step, n, at: x => Math.min(n - 1, Math.floor((x - lo) / step)), label: i => `${lo + i * step} to ${lo + (i + 1) * step}` };
  }

  // ---------- page renderers ----------
  function loading(el, what) { clear(el).append(status('loading', 'Reading ' + what + ' from data.promptugal.news...')); }
  function failed(el, data) { clear(el).append(status('error', 'This data could not be read: ' + (data.latest.reason ? data.latest.reason.message : 'unknown error') + '. Nothing is shown rather than a guess.')); }
  function layout(el, main, data, staleHours) { clear(el).append(h('div', { class: 'grid-2' }, h('div', null, main), provenance(data, staleHours))); }

  async function pageWarnings(el, opts) {
    loading(el, 'IPMA warnings');
    const data = await load('ipma-warnings', !opts.home);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 3)); return; }
    const warns = readWarnings(data.latest.value.json);
    const main = [warningMap(warns), ...warningNotes(warns)];
    if (!opts.home) {
      main.push(h('h2', null, 'Warnings in force or ahead'), warningList(warns), h('h2', null, 'How often this source is read'), readsChart(data), recordTable(warns.map(w => w.raw)));
    }
    layout(el, main, data, 3);
  }
  async function pageMeteoalarm(el) {
    loading(el, 'the MeteoAlarm feed');
    const data = await load('meteoalarm-pt', false);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 6)); return; }
    const recs = records(data.latest.value.json);
    layout(el, [h('p', null, `${recs.length} record(s) in the MeteoAlarm feed file.`), recordTable(recs, 'Show the records')], data, 6);
  }

  async function pageForecasts(el, opts) {
    loading(el, 'IPMA city forecasts');
    const data = await load('ipma-city-forecasts', !opts.home);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 24)); return; }
    let places = readForecasts(data.latest.value.json);
    const main = [];
    if (!places.length) main.push(status('error', 'No forecast with temperatures could be recognised in latest.json. The records are in the table below.'));
    if (opts.home) {
      const wanted = ['lisboa', 'porto', 'faro', 'funchal', 'ponta delgada'];
      const chosen = wanted.map(w => places.find(p => norm(p.place) === w) || places.find(p => norm(p.place).includes(w) && !norm(p.place).includes('porto santo'))).filter(Boolean);
      places = chosen.length ? chosen : places.slice(0, 5);
    }
    if (places.length) main.push(forecastGrid(places), h('p', { class: 'small' }, 'Each bar runs from the day\'s forecast minimum to maximum temperature (°C), on one scale for all places. Hover or focus a day for details. Source: IPMA, via data.promptugal.news.'));
    if (!opts.home) {
      const rows = [];
      for (const p of places) for (const d of p.days) rows.push({ place: p.place, date: d.date ? dayLabel(d.date) : '?', 'min °C': d.tmin, 'max °C': d.tmax, 'rain %': d.rain, weather: d.wx != null ? d.wx : (d.wxId != null ? 'IPMA weather type ' + d.wxId : '') });
      main.push(h('h2', null, 'How often this source is read'), readsChart(data), recordTable(rows, `Table of every forecast day (${rows.length})`), recordTable(records(data.latest.value.json), 'Raw records as read'));
    }
    layout(el, main, data, 24);
  }

  async function pageObservations(el) {
    loading(el, 'IPMA observations');
    const data = await load('ipma-observations', true);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 3)); return; }
    const recs = records(data.latest.value.json);
    const obs = recs.map(r => ({
      name: placeName(r),
      ll: lonLat(r),
      temp: num(pick(r, /^temperatura$/i, /^(temp|temperature|air_?temp(erature)?|t)$/i, /temp/i)),
      wind: num(pick(r, /^intensidadeVentoKM$/i, /wind.*km|km.*wind/i, /^(wind_?speed|wind)$/i)),
      hum: num(pick(r, /^humidade$/i, /humid/i)),
      rain: num(pick(r, /^precAcumulada$/i, /precip|rain/i)),
      pres: num(pick(r, /^pressao$/i, /press/i)),
      time: parseTime(pick(r, /^(time|obs_?time|observed_?at|date|datetime|hora)$/i, /time|date/i))
    }));
    const main = [];
    const withT = obs.filter(o => o.temp != null);
    const top = (arr, key, max) => arr.filter(o => o[key] != null).sort((a, b) => max ? b[key] - a[key] : a[key] - b[key])[0];
    const stat = (label, o, key, unit) => o ? h('div', { class: 'stat' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, fmt1(o[key]) + unit), h('div', { class: 'where' }, o.name)) : null;
    main.push(h('div', { class: 'stats' },
      stat('Warmest station', top(obs, 'temp', true), 'temp', ' °C'),
      stat('Coldest station', top(obs, 'temp', false), 'temp', ' °C'),
      stat('Strongest mean wind', top(obs, 'wind', true), 'wind', ' km/h'),
      stat('Most rain in the hour', top(obs, 'rain', true), 'rain', ' mm')));
    const b = bins(withT.map(o => o.temp), 5);
    const placed = withT.filter(o => o.ll);
    if (b && placed.length) {
      const { svg, outside } = dotMap(placed.map(o => ({ ll: o.ll, fill: WARM[b.at(o.temp)], tip: `${o.name}: ${fmt1(o.temp)} °C${o.wind != null ? ', wind ' + fmt1(o.wind) + ' km/h' : ''}${o.hum != null ? ', humidity ' + fmt1(o.hum) + '%' : ''}${o.time ? ', ' + when(o.time) : ''}` })), 'Map of IPMA stations coloured by air temperature');
      main.push(h('figure', null, svg, legend(WARM.map((c, i) => [c, b.label(i) + ' °C'])),
        h('figcaption', null, `Air temperature at ${placed.length} stations with a position (hover or focus a dot). Insets for Açores and Madeira are on their own scales.${outside ? ' ' + outside + ' station(s) fall outside the drawn areas.' : ''} Missing values (IPMA's -99) are left out. Source: IPMA, via data.promptugal.news.`)));
    } else {
      main.push(status('error', 'No station positions or temperatures could be recognised, so there is no map. The records are in the table below.'));
    }
    const times = obs.map(o => o.time).filter(Boolean).sort((a, b) => a - b);
    if (times.length) main.push(h('p', { class: 'small' }, `Observation times in the file run from ${when(times[0])} to ${when(times[times.length - 1])}.`));
    main.push(h('h2', null, 'How often this source is read'), readsChart(data), recordTable(recs));
    layout(el, main, data, 3);
  }

  const RCM = [
    { n: 1, pt: 'Reduzido', en: 'low', colour: '#fbd5b5' },
    { n: 2, pt: 'Moderado', en: 'moderate', colour: '#f5a26f' },
    { n: 3, pt: 'Elevado', en: 'high', colour: '#eb6834' },
    { n: 4, pt: 'Muito elevado', en: 'very high', colour: '#b8481d' },
    { n: 5, pt: 'Máximo', en: 'maximum', colour: '#7a2e10' }
  ];
  async function pageFire(el) {
    loading(el, 'IPMA fire risk');
    const data = await load('ipma-fire-risk', true);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 36)); return; }
    const recs = records(data.latest.value.json);
    // Group class values by day: either several rcm keys per record (one per day) or a day field per record.
    const days = new Map();
    const add = (day, r, cls) => { if (!days.has(day)) days.set(day, []); days.get(day).push({ r, cls }); };
    for (const r of recs) {
      const keys = Object.keys(r).filter(k => /^(rcm|risk_?class|class|risco|rcm_?class)$/i.test(k.split('.').pop()) || /^rcm/i.test(k.split('.').pop()));
      if (keys.length > 1) for (const k of keys) add(k.split('.').slice(0, -1).join('.') || k, r, num(r[k]));
      else if (keys.length === 1) {
        const d = parseTime(pick(r, /^(dataPrev|date|day|forecast_?date)$/i));
        add(d ? dayLabel(d) : (pick(r, /^(day|d)$/i) != null ? 'day ' + pick(r, /^(day|d)$/i) : 'as given'), r, num(r[keys[0]]));
      }
    }
    const main = [];
    if (!days.size) main.push(status('error', 'No RCM class could be recognised in latest.json. The records are in the table below.'));
    else {
      const W = 620, rowH = 34, L = 110, R = 10;
      const dayList = [...days];
      const svg = s('svg', { viewBox: `0 0 ${W} ${dayList.length * rowH + 30}`, role: 'img', 'aria-label': 'Number of municipalities in each fire risk class, by day' });
      dayList.forEach(([day, list], i) => {
        const valid = list.filter(x => x.cls >= 1 && x.cls <= 5);
        const total = valid.length || 1;
        let x = L;
        svg.append(s('text', { x: L - 8, y: 10 + i * rowH + 15, 'text-anchor': 'end', 'font-size': 12 }, day));
        for (const c of RCM) {
          const n = valid.filter(v => Math.round(v.cls) === c.n).length;
          if (!n) continue;
          const w = n / total * (W - L - R);
          svg.append(s('rect', { x: x + 1, y: 10 + i * rowH, width: Math.max(1, w - 2), height: 22, rx: 3, fill: c.colour, tabindex: 0 }, s('title', null, `${day}: ${n} municipalities at class ${c.n}, ${c.pt} (${c.en})`)));
          if (w > 26) svg.append(s('text', { x: x + w / 2, y: 10 + i * rowH + 15, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:' + (c.n >= 3 ? '#fff' : '#0b0b0b') }, n));
          x += w;
        }
      });
      main.push(h('figure', null, svg, legend(RCM.map(c => [c.colour, `${c.n} ${c.pt} (${c.en})`])),
        h('figcaption', null, 'Each row is one day in the file; each segment is the number of mainland municipalities in that RCM fire risk class. Source: IPMA, via data.promptugal.news.')));
      const [firstDay, firstList] = dayList[0];
      const pts = firstList.filter(x => x.cls >= 1 && x.cls <= 5).map(x => ({ ll: lonLat(x.r), fill: RCM[Math.round(x.cls) - 1].colour, tip: `${placeName(x.r)}: class ${Math.round(x.cls)}, ${RCM[Math.round(x.cls) - 1].pt}` })).filter(p => p.ll);
      if (pts.length) {
        const { svg: map } = dotMap(pts, 'Map of municipalities coloured by fire risk class');
        main.push(h('h2', null, 'Where, for ' + firstDay), h('figure', null, map, h('figcaption', null, `${pts.length} municipalities with a position, one dot each. Source: IPMA, via data.promptugal.news.`)));
      } else main.push(h('p', { class: 'small' }, 'The file gives no positions this page can recognise, so there is no map.'));
    }
    main.push(h('h2', null, 'How often this source is read'), readsChart(data), recordTable(recs));
    layout(el, main, data, 36);
  }

  async function pageSea(el) {
    loading(el, 'IPMA sea data');
    const data = await load('ipma-sea', true);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 24)); return; }
    const recs = records(data.latest.value.json);
    const rows = recs.map(r => ({
      place: placeName(r),
      date: parseTime(pick(r, /^(forecastDate|date|day|dataPrev)$/i, /date/i)),
      hmin: num(pick(r, /^waveHighMin$/i, /wave.*(height|high).*min|hs_?min/i)),
      hmax: num(pick(r, /^waveHighMax$/i, /wave.*(height|high).*max|hs_?max/i, /^(wave_?height|hs)$/i)),
      pmin: num(pick(r, /^wavePeriodMin$/i, /period.*min/i)),
      pmax: num(pick(r, /^wavePeriodMax$/i, /period.*max/i, /period/i)),
      dir: pick(r, /^predWaveDir$/i, /wave.*dir|dir/i),
      sstMin: num(pick(r, /^sstMin$/i, /(sst|sea.*temp).*min/i)),
      sstMax: num(pick(r, /^sstMax$/i, /(sst|sea.*temp).*max/i, /^(sst|sea_?temp(erature)?)$/i))
    }));
    const dates = [...new Set(rows.map(r => r.date && r.date.getTime()).filter(Boolean))].sort();
    const first = dates.length ? rows.filter(r => r.date && r.date.getTime() === dates[0]) : rows;
    const main = [];
    const waves = first.filter(r => r.hmax != null).sort((a, b) => b.hmax - a.hmax);
    if (!waves.length) main.push(status('error', 'No wave heights could be recognised in latest.json. The records are in the table below.'));
    else {
      const max = Math.ceil(Math.max(...waves.map(w => w.hmax)) + 0.5);
      const W = 620, rowH = 26, L = 150, R = 60, T = 24;
      const x = v => L + v / max * (W - L - R);
      const svg = s('svg', { viewBox: `0 0 ${W} ${T + waves.length * rowH + 10}`, role: 'img', 'aria-label': 'Significant wave height range by coastal place' });
      for (let v = 0; v <= max; v++) { svg.append(s('line', { class: 'gridline', x1: x(v), x2: x(v), y1: T - 4, y2: T + waves.length * rowH })); svg.append(s('text', { x: x(v), y: T - 8, 'text-anchor': 'middle', 'font-size': 10, class: 'muted-text' }, v + ' m')); }
      waves.forEach((w, i) => {
        const y = T + i * rowH;
        const lo = w.hmin != null ? w.hmin : w.hmax;
        svg.append(s('text', { x: L - 8, y: y + 15, 'text-anchor': 'end', 'font-size': 12 }, w.place));
        svg.append(s('rect', { x: x(lo) - 1, y: y + 6, width: Math.max(3, x(w.hmax) - x(lo) + 2), height: 12, rx: 4, fill: 'var(--accent)', tabindex: 0 },
          s('title', null, `${w.place}: waves ${w.hmin != null ? fmt1(w.hmin) + ' to ' : ''}${fmt1(w.hmax)} m${w.pmax != null ? ', period ' + (w.pmin != null ? fmt1(w.pmin) + ' to ' : '') + fmt1(w.pmax) + ' s' : ''}${w.dir != null ? ', from ' + w.dir : ''}`)));
        svg.append(s('text', { x: x(w.hmax) + 6, y: y + 16, 'font-size': 11, class: 'muted-text' }, fmt1(w.hmax) + ' m'));
      });
      main.push(h('figure', null, svg, h('figcaption', null, `Significant wave height, from the day's minimum to maximum, for ${dates.length ? dayLabel(new Date(dates[0])) : 'the file'}. Sorted by the maximum. Source: IPMA, via data.promptugal.news.`)));
    }
    const table = first.map(r => ({ place: r.place, 'waves m': r.hmin != null ? fmt1(r.hmin) + ' to ' + fmt1(r.hmax) : (r.hmax != null ? fmt1(r.hmax) : ''), 'period s': r.pmax != null ? (r.pmin != null ? fmt1(r.pmin) + ' to ' : '') + fmt1(r.pmax) : '', direction: r.dir, 'sea temp °C': r.sstMax != null ? (r.sstMin != null ? fmt1(r.sstMin) + ' to ' : '') + fmt1(r.sstMax) : '' }));
    main.push(h('h2', null, 'Waves, period, direction and sea temperature'), recordTable(table, `Table for the first day (${table.length} places)`));
    main.push(h('h2', null, 'How often this source is read'), readsChart(data), recordTable(recs, `Raw records as read (${recs.length})`));
    layout(el, main, data, 24);
  }

  // WHO UV index categories.
  const UVCAT = [
    { max: 2, name: 'Low', colour: '#cde2fb' },
    { max: 5, name: 'Moderate', colour: '#86b6ef' },
    { max: 7, name: 'High', colour: '#3987e5' },
    { max: 10, name: 'Very high', colour: '#1c5cab' },
    { max: Infinity, name: 'Extreme', colour: '#0d366b' }
  ];
  async function pageUV(el) {
    loading(el, 'IPMA UV index');
    const data = await load('ipma-uv', true);
    if (data.latest.status !== 'fulfilled') { failed(el, data); el.append(provenance(data, 36)); return; }
    const recs = records(data.latest.value.json);
    const rows = recs.map(r => ({
      place: placeName(r),
      date: parseTime(pick(r, /^(data|date|day|forecastDate)$/i, /date/i)),
      uv: num(pick(r, /^iUv$/i, /^(uv|uv_?index|index)$/i, /uv/i)),
      hours: pick(r, /^intervaloHora$/i, /interval|hours/i)
    })).filter(r => r.uv != null);
    const main = [];
    if (!rows.length) main.push(status('error', 'No UV index could be recognised in latest.json. The records are in the table below.'));
    else {
      const places = [...new Set(rows.map(r => r.place))].sort((a, b) => a.localeCompare(b, 'pt'));
      const dates = [...new Set(rows.map(r => r.date ? r.date.getTime() : 0))].sort();
      const W = 160 + dates.length * 80, rowH = 26, T = 26;
      const svg = s('svg', { viewBox: `0 0 ${W} ${T + places.length * rowH + 6}`, role: 'img', 'aria-label': 'UV index by place and day' });
      dates.forEach((d, j) => svg.append(s('text', { x: 160 + j * 80 + 39, y: 16, 'text-anchor': 'middle', 'font-size': 11, class: 'muted-text' }, d ? dayLabel(new Date(d)) : '?')));
      places.forEach((p, i) => {
        const y = T + i * rowH;
        svg.append(s('text', { x: 152, y: y + 16, 'text-anchor': 'end', 'font-size': 12 }, p));
        dates.forEach((d, j) => {
          const r = rows.find(x => x.place === p && (x.date ? x.date.getTime() : 0) === d);
          if (!r) return;
          const c = UVCAT.find(c => r.uv <= c.max);
          const idx = UVCAT.indexOf(c);
          svg.append(s('g', { tabindex: 0 }, s('title', null, `${p}, ${d ? dayLabel(new Date(d)) : ''}: UV index ${fmt1(r.uv)} (${c.name})${r.hours != null ? ', ' + r.hours : ''}`),
            s('rect', { x: 160 + j * 80 + 1, y: y + 1, width: 76, height: rowH - 3, rx: 3, fill: c.colour }),
            s('text', { x: 160 + j * 80 + 39, y: y + 16, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:' + (idx >= 2 ? '#fff' : '#0b0b0b') }, fmt1(r.uv))));
        });
      });
      main.push(h('figure', null, svg, legend(UVCAT.map((c, i) => [c.colour, `${c.name} (${i === 0 ? '0' : UVCAT[i - 1].max + 1}${c.max === Infinity ? '+' : ' to ' + c.max})`])),
        h('figcaption', null, 'UV index forecast per place and day, with the WHO UV index categories. Source: IPMA, via data.promptugal.news.')));
    }
    main.push(h('h2', null, 'How often this source is read'), readsChart(data), recordTable(recs));
    layout(el, main, data, 36);
  }

  // ---------- minimal, safe Markdown (for the Storm Charles page) ----------
  function inline(text) {
    const out = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[1]) {
        let u = m[2];
        if (u.startsWith('/')) u = 'https://promptugal.news' + u;
        out.push(safeUrl(u) ? h('a', { href: u }, m[1]) : m[1]);
      } else if (m[3]) out.push(h('strong', null, m[3]));
      else out.push(h('code', null, m[4]));
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function markdown(md) {
    const root = h('div', { class: 'md' });
    let list = null, para = [];
    const flush = () => { if (para.length) { root.append(h('p', null, inline(para.join(' ')))); para = []; } };
    for (const raw of md.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')) {
      const line = raw.trimEnd();
      let m;
      if (!line.trim()) { flush(); list = null; continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flush(); list = null; root.append(h('h' + Math.min(6, m[1].length + 1), null, inline(m[2]))); continue; }
      if ((m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/))) { flush(); if (!list) { list = h('ul'); root.append(list); } list.append(h('li', null, inline(m[1]))); continue; }
      if ((m = line.match(/^>\s?(.*)$/))) { flush(); root.append(h('blockquote', null, inline(m[1]))); continue; }
      if (/^\|/.test(line)) { flush(); if (!/^\|[\s:|-]+\|$/.test(line)) root.append(h('p', { class: 'small' }, inline(line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()).join(' · ')))); continue; }
      list = null; para.push(line.trim());
    }
    flush();
    return root;
  }
  async function pageStorm(el) {
    const url = 'https://promptugal.news/storm/charles/index.md';
    clear(el).append(status('loading', 'Reading ' + url + ' ...'));
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const md = await res.text();
      clear(el).append(status('ok', 'Below is PrompTugal.news\'s Storm Charles page, read just now from ', h('a', { href: url }, url), '. It is their text, shown as published, not this site\'s.'), markdown(md));
    } catch (e) {
      clear(el).append(status('error', 'Your browser could not read ', h('a', { href: url }, url), ' (' + e.message + '). Open it directly on PrompTugal.news.'));
    }
  }

  // ---------- start ----------
  const PAGES = { warnings: pageWarnings, meteoalarm: pageMeteoalarm, forecasts: pageForecasts, observations: pageObservations, fire: pageFire, sea: pageSea, uv: pageUV, storm: pageStorm };
  for (const el of document.querySelectorAll('[data-ipma]')) {
    const fn = PAGES[el.dataset.ipma];
    if (!fn) continue;
    fn(el, { home: el.hasAttribute('data-home') }).catch(e => {
      clear(el).append(status('error', 'Something went wrong while drawing this: ' + e.message + '. Nothing is shown rather than a guess.'));
    });
  }
})();
