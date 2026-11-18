// fire-risk.js: the Fire risk page. A municipality hex map by RCM class with a three-day switcher,
// counts by class, and a table by district (DICO codes: the file has no names). Read live from
// data.promptugal.news; nothing is guessed. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance A), 2026-11-18, round 1.

import { loadSource, provenance, loading, failure, fmtDay, h } from '../data.js';
import { RCM_LEVELS, areaForDico } from '../codes.js';
import { buildGrid, classMap, lisbonNow, MAINLAND, areaName } from '../map.js';

const IPMA_RCM = 'https://www.ipma.pt/en/riscoincendio/rcm.pt/';
const CLASSES = [1, 2, 3, 4, 5];
const rcmName = c => RCM_LEVELS[c]?.name || `class ${c}`;
const sw = c => h('span', { class: 'sw', style: `background:var(--rcm-${c})`, 'aria-hidden': 'true' });

async function main() {
  const el = document.getElementById('fire'), tb = document.getElementById('table');
  const slow = loading(el, "IPMA's fire risk"); const slowT = loading(tb, "IPMA's fire risk");
  const src = await loadSource('ipma-fire-risk', { onSlow: () => { slow(); slowT(); } });
  if (!src.latest.ok) { failure(el, "IPMA's fire risk", src.latest, IPMA_RCM); failure(tb, "IPMA's fire risk", src.latest, IPMA_RCM); return; }
  const F = src.latest.data;
  const munis = (F.municipalities || []).filter(m => areaForDico(m.dico));
  const dates = (F.files || []).map(f => f.date).filter(Boolean);
  if (!munis.length || !dates.length) {
    el.replaceChildren(h('p', { class: 'status' }, "IPMA's fire risk file holds no municipalities or no days. Nothing is shown in their place."), provenance(src));
    tb.replaceChildren(); return;
  }
  const today = lisbonNow().slice(0, 10);
  const label = d => (d === today ? `Today, ${fmtDay(d)}` : fmtDay(d));
  const cls = (m, d) => { const v = (m.days || []).find(x => x.date === d)?.rcm; return CLASSES.includes(v) ? v : null; };
  const G = buildGrid(F.municipalities);
  let di = 0;
  const ctl = h('div', { class: 'ctl', role: 'group', 'aria-label': 'Day' });
  const mapEl = h('div', { class: 'mapbox narrow-map' });
  const side = h('div', { 'aria-live': 'polite' });
  const run = [...new Set((F.files || []).map(f => f.run).filter(Boolean))];
  const draw = () => {
    const d = dates[di];
    ctl.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === di)));
    const cnt = Object.fromEntries(CLASSES.map(c => [c, 0])); let miss = 0;
    for (const m of munis) { const c = cls(m, d); if (c) cnt[c]++; else miss++; }
    const max = Math.max(1, ...Object.values(cnt));
    if (G) classMap(mapEl, G, m => cls(m, d) ?? 'none', k => (k === 'none' ? 'var(--bg)' : `var(--rcm-${k})`),
      { label: `Fire risk on ${fmtDay(d)} for ${munis.length} municipalities: ${CLASSES.filter(c => cnt[c]).map(c => `${cnt[c]} ${rcmName(c).toLowerCase()}`).join(', ')}. The counts and the table by district give the same figures.` });
    else mapEl.replaceChildren(h('p', { class: 'status' }, 'The map could not be drawn: the file holds too few municipality points with positions. The counts and the table below still hold every class.'));
    const one = CLASSES.find(c => cnt[c] === munis.length);
    side.replaceChildren(...[h('h3', {}, `${label(d)}: municipalities by class`),
      h('ul', { class: 'bars' }, CLASSES.map(c => h('li', {}, h('span', { class: 'lab' }, sw(c), `${c} ${rcmName(c)}`),
        h('span', { 'aria-hidden': 'true' }, h('span', { class: 'b', style: `width:${cnt[c] / max * 100}%` })), h('span', { class: 'num' }, cnt[c])))),
      miss ? h('p', { class: 'note' }, `${miss} municipalities have no class for this day in the file; they are left blank on the map.`) : null,
      one ? h('p', {}, `All ${munis.length} municipalities are in class ${one}, ${rcmName(one).toLowerCase()}, on this day. The map is one colour because the file says so.`) : null].filter(Boolean));
  };
  ctl.replaceChildren(...dates.map((d, i) => h('button', { type: 'button', 'aria-pressed': String(i === di), onclick: () => { di = i; draw(); } }, label(d))));
  el.replaceChildren(h('div', { class: 'panel' }, ctl, h('div', { class: 'grid two' }, mapEl, side), h('ul', { class: 'legend', 'aria-label': 'Legend' }, CLASSES.map(c => h('li', {}, sw(c), `${c} ${rcmName(c)}`))),
    h('p', { class: 'map-note' }, `Each hexagon takes the class of the nearest municipality point in IPMA's file, so edges are approximate. White lines: district borders, also approximate. Madeira and the Azores are not in this file. ${run.length ? `IPMA's model run: ${run.join(', ')}.` : ''} Days are labelled by IPMA's dates${dates[0] === today ? '' : '; none of them is today in Lisbon, so none is called today'}.`)),
  provenance(src));
  draw();

  // Table by district: counts per class per day, then every municipality by DICO code.
  const byD = MAINLAND.map(a => [a, munis.filter(m => areaForDico(m.dico) === a).sort((x, y) => x.dico.localeCompare(y.dico))]);
  const summary = (list, d) => { const c = {}; let none = 0; for (const m of list) { const v = cls(m, d); if (v) c[v] = (c[v] || 0) + 1; else none++; }
    return CLASSES.filter(k => c[k]).map(k => `${c[k]} ${rcmName(k).toLowerCase()}`).concat(none ? [`${none} no class`] : []).join(', ') || 'none'; };
  tb.replaceChildren(h('div', { class: 'panel' },
    h('div', { class: 'table-wrap' }, h('table', {}, h('caption', {}, `Municipalities in each class, by district, for each day in IPMA's file (${munis.length} municipalities).`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'District'), h('th', { scope: 'col', class: 'num' }, 'Code'), h('th', { scope: 'col', class: 'num' }, 'Municipalities'), dates.map(d => h('th', { scope: 'col' }, fmtDay(d))))),
      h('tbody', {}, byD.map(([a, list]) => h('tr', {}, h('th', { scope: 'row' }, areaName(a)), h('td', { class: 'num' }, list[0]?.dico.slice(0, 2) ?? ''), h('td', { class: 'num' }, list.length), dates.map(d => h('td', {}, summary(list, d)))))))),
    h('details', {}, h('summary', {}, `Every municipality by DICO code (${munis.length})`),
      h('div', { class: 'table-wrap' }, h('table', {}, h('caption', {}, 'Class 1 low to 5 highest, as in IPMA\'s file. No municipality names: the file gives codes only.'),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'DICO'), h('th', { scope: 'col' }, 'District'), dates.map(d => h('th', { scope: 'col' }, fmtDay(d))))),
        h('tbody', {}, byD.flatMap(([a, list]) => list.map(m => h('tr', {}, h('th', { scope: 'row', class: 'num' }, m.dico), h('td', {}, areaName(a)),
          dates.map(d => { const c = cls(m, d); return c ? h('td', {}, `${c} ${rcmName(c)}`) : h('td', { class: 'none' }, 'no class'); })))))))) ),
  provenance(src));
}
main();
