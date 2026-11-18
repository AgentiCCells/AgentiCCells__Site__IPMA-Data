// Shared layout for every page: the <head> extras (link previews, styles, icon), the header
// with the navigation and the disclaimer, and the footer. scripts/layout.mjs applies it to
// every built page at build time: a page in src/ writes <!--HEAD-->, <!--HEADER--> and
// <!--FOOTER--> where these go. Node built-ins only. Code Apache-2.0; text CC BY 4.0.
// Written by conductor.ipma-data@AgentiCCells.dinis, 2026-11-18, round 1.
export const SITE = 'https://ipma-data.agenticcells.site';
export const REPO = 'https://github.com/AgentiCCells/AgentiCCells__Site__IPMA-Data';
export const SITE_NAME = 'IPMA data, drawn';
// The brief's rule, on every page, word for word.
export const DISCLAIMER = 'Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC.';
export const NAV = [
  ['/', 'Now'],
  ['/warnings/', 'Warnings'],
  ['/forecasts/', 'Forecasts'],
  ['/observations/', 'Stations'],
  ['/fire-risk/', 'Fire risk'],
  ['/sea/', 'Sea'],
  ['/uv/', 'UV'],
  ['/storm-charles/', 'Storm Charles'],
  ['/how-it-works/', 'How it works'],
  ['/d/', 'Designs'],
  ['/behind-the-scenes/', 'Behind the scenes'],
  ['/use-with-ai/', 'Use with AI'],
];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// path: the page's URL path, e.g. /warnings/. title, description: from the page itself.
// image: the share card's path under /assets/share/ (a 1200x630 PNG), or the default.
export function head({ path, title, description, image }) {
  const url = SITE + path;
  const img = SITE + (image || '/assets/share/home.png');
  return [
    `<link rel="canonical" href="${esc(url)}">`,
    `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">`,
    `<link rel="stylesheet" href="/assets/site.css">`,
    `<link rel="alternate" type="text/markdown" href="${esc(path.endsWith('/') ? path + 'index.md' : path.replace(/\.html$/, '.md'))}" title="This page as Markdown">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`,
  ].join('\n');
}

export function header(path) {
  const here = p => (p === '/' ? path === '/' : path.startsWith(p));
  const links = NAV.map(([p, t]) => `<a href="${p}"${here(p) ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('');
  return `<a class="skip" href="#main">Skip to the content</a>
<header class="site-head">
<div class="bar"><a class="brand" href="/">${esc(SITE_NAME)}</a><nav class="nav" aria-label="Site">${links}</nav></div>
<p class="disclaimer" role="note"><strong>${esc(DISCLAIMER)}</strong> This site is not IPMA's and is not official.</p>
</header>`;
}

export function footer(path) {
  return `<footer class="site-foot">
<p class="disclaimer"><strong>${esc(DISCLAIMER)}</strong></p>
<p>Weather data: <a href="https://www.ipma.pt/">IPMA, Instituto Português do Mar e da Atmosfera</a>, read live in your browser from <a href="https://data.promptugal.news">data.promptugal.news</a>. IPMA's terms: free to copy and use for personal or public use if the use has no profit-making or offensive purpose; always name IPMA as the source. This site has no ads, no payments and no profit-making purpose.</p>
<p>Version <a href="/version.json">__VERSION__</a> · Made by the AgentiCCells agents (<a href="/behind-the-scenes/">behind the scenes</a>) · <a href="${REPO}">Source</a> · <a href="${esc(path.endsWith('/') ? path + 'index.md' : path)}">This page as Markdown</a> · Code Apache-2.0, text CC BY 4.0; data under each source's own terms.</p>
</footer>`;
}
