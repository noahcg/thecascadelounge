import { escapeHtml as e, nodeText, walk } from './content.mjs';
import { parseFragment } from 'parse5';
import { highlightCode, highlightCodeBlocks } from './highlight.mjs';
import { featuredArticle } from './article-media.mjs';
import { cssInAction } from './css-in-action.mjs';
import { seoMetadata, structuredData, topics, topicPath, topicEntries, entryTopics, relatedEntries } from './seo.mjs';

export const site = 'The Cascade Lounge';
const nav = [
  ['/articles/', 'Articles'], ['/quick-wins/', 'Quick Wins'],
  ['/resources/', 'Resources'], ['/search/', 'Search'],
];
const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

function loungeBrand(extraClass = '', current = true) {
  return `<a class="lounge-brand${extraClass ? ` ${extraClass}` : ''}" href="/"${current ? ' aria-current="page"' : ''} aria-label="The Cascade Lounge">
    <span class="lounge-brand-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="lounge-wordmark" aria-hidden="true"><span class="lounge-wordmark-the">The</span><span class="lounge-wordmark-name">Cascade Lounge</span><span class="lounge-brand-star"></span><span class="lounge-wordmark-caption">DESIGN · COLOR · LAYOUT</span></span>
  </a>`;
}

const iconPaths = {
  selectors: '<path d="m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18"/>',
  motion: '<path d="M3 6h10M3 12h6M3 18h10"/><path d="m15 7 6 5-6 5Z"/>',
  typography: '<path d="M3 6h14M10 6v15M6 21h8m2-9h7m-3.5 0v9M18 21h4"/>',
  forms: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 12 3 3 7-7"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  external: '<path d="M7 17 17 7M7 7h10v10"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  bookmark: '<path d="M6 3h12v19l-6-4-6 4Z"/>',
  share: '<path d="M12 15V2m-4 4 4-4 4 4M5 11H3v11h18V11h-2"/>',
  more: '<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 5v7l5 3"/>',
  difficulty: '<path d="M4 20v-4m5 4v-8m5 8V7m5 13V2"/>',
  book: '<path d="M12 5C8 2 4 3 1 4v16c4-1 7-1 11 2 4-3 7-3 11-2V4c-3-1-7-2-11 1Zm0 0v17"/>',
  layers: '<path d="m12 1 11 6-11 6L1 7Zm-11 10 11 6 11-6M1 16l11 6 11-6"/>',
  tool: '<path d="M14 3a7 7 0 0 0-8 9L1 18a3 3 0 0 0 4 4l7-7a7 7 0 0 0 9-9l-5 5-4-4 4-5Z"/>',
  people: '<circle cx="12" cy="6" r="4"/><path d="M5 23v-5a7 7 0 0 1 14 0v5M5 4a3 3 0 0 0 0 6m14-6a3 3 0 0 1 0 6M1 21v-4a5 5 0 0 1 4-5m18 9v-4a5 5 0 0 0-4-5"/>',
};
function icon(name, className = '') {
  return `<svg${className ? ` class="${className}"` : ''} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
}
const arrow = icon('external', 'link-icon');
const forward = icon('arrow', 'link-icon');

function interiorVariant(path) {
  if (path?.startsWith('/topics/')) return 'articles-index';
  if (!path || !/^\/(articles|quick-wins|resources)\//.test(path)) return null;
  const section = path.split('/')[1];
  return `${section === 'articles' ? 'articles' : section === 'quick-wins' ? 'quick' : 'resources'}-${path === `/${section}/` ? 'index' : 'detail'}`;
}

function masthead(path) {
  return `<header class="masthead">
    <div class="masthead-inner">
      ${loungeBrand('', path === '/')}
      <nav aria-label="Main"><ul>${nav.slice(0, 3).map(([href, label]) => `<li><a href="${href}"${path === href ? ' aria-current="page"' : path?.startsWith(href) ? ' aria-current="location"' : ''}>${label}</a></li>`).join('')}</ul></nav>
      <form class="masthead-search" role="search" aria-label="Search the Lounge" action="/search/" method="get">
        <label class="visually-hidden" for="masthead-query">Search the Lounge</label>
        <button type="submit" aria-label="Search">${icon('search')}</button>
        <input type="search" id="masthead-query" name="q" required maxlength="100" placeholder="Search the Lounge...">
      </form>
    </div>
  </header>`;
}

function footer(path) {
  return `<footer class="site-footer"><div class="footer-inner">
    ${loungeBrand('footer-brand', path === '/')}
    <p class="footer-tagline">Styles flow. Ideas spill.</p>
    <nav aria-label="Footer"><ul>${[...nav, ['/topics/', 'CSS Topics']].map(([href, label]) => `<li><a href="${href}"${path === href ? ' aria-current="page"' : path?.startsWith(href) ? ' aria-current="location"' : ''}>${label}</a></li>`).join('')}</ul></nav>
  </div></footer>`;
}

function credit(entry) {
  const attribution = !entry.provenance && entry.attribution;
  const source = !entry.provenance && entry.source && new URL(entry.source).hostname !== 'oracleapex.com' ? entry.source : null;
  if (!attribution && !source) return '';
  return `<footer class="credit">${attribution ? `<p>${e(attribution)}</p>` : ''}${source ? `<p>Source <a href="${e(source)}">${e(new URL(source).hostname)}</a></p>` : ''}</footer>`;
}

export function page({ path, title, intro, body, siteUrl, robots, homepage = false, image, article, entry = article, items = [], breadcrumbs = [], analytics = false, gaMeasurementId = null }) {
  const seo = seoMetadata(path, title, intro, entry);
  const metadata = `${seo.title} · ${site}`;
  const description = seo.description;
  const url = siteUrl && path ? new URL(path, siteUrl).href : null;
  const imageUrl = siteUrl && image ? new URL(image.path, siteUrl).href : null;
  const interior = interiorVariant(path);
  const collection = ['/articles/', '/quick-wins/', '/resources/'].includes(path) ? ' collection-page' : '';
  const stageArt = interior && (interior === 'articles-index' ? 'articles' : interior === 'resources-index' ? 'resources' : interior.startsWith('quick') ? 'quick-win' : 'article');
  return `<!doctype html>
<html lang="en" prefix="og: https://ogp.me/ns# article: https://ogp.me/ns/article#">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#172b22">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" href="/assets/favicon-32.png" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" sizes="any">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
<title>${e(metadata)}</title>
<meta name="description" content="${e(description)}">
${robots ? `<meta name="robots" content="${robots}">` : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'}
${url ? `<link rel="canonical" href="${e(url)}"><meta property="og:url" content="${e(url)}">` : ''}
<meta property="og:title" content="${e(metadata)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:site_name" content="${e(site)}">
<meta property="og:type" content="${entry && entry.type !== 'resource' ? 'article' : 'website'}">
<meta property="og:locale" content="en_US">
${entry?.date ? `<meta property="article:published_time" content="${e(entry.date)}">` : ''}
${entry?.updatedAt ? `<meta property="article:modified_time" content="${e(entry.updatedAt)}">` : ''}
${imageUrl ? `<meta property="og:image" content="${e(imageUrl)}">
<meta property="og:image:secure_url" content="${e(imageUrl)}">
<meta property="og:image:type" content="${e(image.type)}">
<meta property="og:image:width" content="${image.width}">
<meta property="og:image:height" content="${image.height}">
<meta property="og:image:alt" content="${e(image.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(metadata)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${e(imageUrl)}">
<meta name="twitter:image:alt" content="${e(image.alt)}">` : ''}
${siteUrl ? `<link rel="alternate" type="application/atom+xml" title="The Cascade Lounge — CSS Tutorials" href="${e(new URL('/feed.xml',siteUrl).href)}">` : ''}
${!robots?.includes('noindex') ? structuredData({ path, title:seo.title, description, siteUrl, image, entry, items, breadcrumbs }) : ''}
${homepage ? '<link rel="preload" as="image" href="/assets/tcl-homepage-background.webp" fetchpriority="high">' : ''}
${stageArt ? `<link rel="preload" as="image" href="/assets/tcl-${stageArt}-hero.webp" fetchpriority="high">` : ''}
${article && image ? `<link rel="preload" as="image" href="${e(image.path)}" fetchpriority="high">` : ''}
<link rel="stylesheet" href="/assets/site.css">
${homepage ? '<link rel="stylesheet" href="/assets/home-background/home-background.css">\n<script type="module" src="/assets/home-background/home-background.js"></script>' : ''}
${homepage ? '<link rel="stylesheet" href="/assets/css-in-action.css"><link rel="stylesheet" href="/assets/article-demos.css">\n<script type="module" src="/assets/css-in-action.js"></script>' : ''}
${interior === 'quick-index' ? '<link rel="stylesheet" href="/assets/quick-wins.css">' : ''}
${interior === 'resources-index' ? '<link rel="stylesheet" href="/assets/resources.css">\n<script type="module" src="/assets/resources.js"></script>' : ''}
<script type="module" src="/assets/site.js"></script>
${analytics || gaMeasurementId ? `<script type="module" src="/assets/analytics.js"${analytics ? ' data-vercel="true"' : ''}${gaMeasurementId ? ` data-ga-measurement-id="${e(gaMeasurementId)}"` : ''}></script>` : ''}
</head>
<body class="site-page ${homepage ? 'home-page' : interior ? `interior-page ${interior}${collection}` : 'utility-page'}">
<a class="skip" href="#main-content">Skip to content</a>
${!homepage ? '<div class="page-art" aria-hidden="true"></div>' : ''}
${masthead(path)}
<main id="main-content" tabindex="-1">${body}</main>
${footer(path)}
</body>
</html>
`;
}

function displayText(value = '') {
  const literal = String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return e(nodeText(parseFragment(literal)));
}

function dateLabel(date) {
  return date ? `<time datetime="${date}">${dateFormat.format(new Date(date))}</time>` : '';
}

function lead(title, summary, extra = '') {
  return `<header class="page-lead"><div class="shell">${extra}<h1>${e(title)}</h1>
    ${summary ? `<p>${e(summary)}</p>` : ''}</div></header>`;
}

function line(entry, external = false) {
  return `<li class="editorial-line">
    <div><h3><a href="${entry.path}">${e(entry.title)}</a></h3>${entry.summary ? `<p>${displayText(entry.summary)}</p>` : ''}</div>
    <div class="line-meta">${dateLabel(entry.date)}${entry.difficulty ? `<span>${e(entry.difficulty)}</span>` : ''}${external ? `<a href="${e(entry.url)}" aria-label="Visit ${e(entry.title)}">Visit site ${arrow}</a>` : ''}</div>
  </li>`;
}

export function home(entries) {
  return `<div class="home-composition">
    <div class="home-first-screen">
    <section class="home-intro" aria-labelledby="home-title">
      <p class="home-kicker">Welcome to</p>
      <h1 id="home-title">The Cascade <em>Lounge</em></h1>
      <p class="home-description">The place to gather for the latest in CSS — where styles flow and ideas spill.</p>
      <div class="home-actions">
        ${entries[0] ? `<a class="home-button home-button-primary" href="${e(entries[0].path)}">Read the latest ${forward}</a>` : ''}
        <a class="home-button home-button-secondary" href="/articles/">Browse articles</a>
      </div>
    </section>
    <a class="home-scroll-cue" href="#css-in-action" aria-label="Explore CSS in action below"><svg viewBox="0 0 24 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v24m-7-7 7 7 7-7"/></svg></a>
    </div>
    ${cssInAction(entries)}
  </div>
  ${topicNavigation('home-topic-navigation')}`;
}

const articleDisplay = {
  'container-query-units': {
    category: 'Layout',
    deck: 'Size typography and spacing relative to a component’s container.',
    lede: 'Container query units (CQ units) size typography, spacing, and other lengths relative to a containing element. Use them to adapt a component wherever it appears in a layout.',
  },
  'modern-resets': { category: 'Styling', deck: 'A practical approach to cleaner, more predictable foundations.' },
};

function readingTime(entry) {
  if (Number.isFinite(entry.readingMinutes) && entry.readingMinutes > 0) return `<span class="reading-time">${e(entry.readingMinutes)} min read</span>`;
  if (typeof entry.readingTime === 'string' && entry.readingTime.trim()) return `<span class="reading-time">${e(entry.readingTime)}</span>`;
  const words = (entry.searchText || nodeText(parseFragment(entry.html || ''))).trim().split(/\s+/).filter(Boolean).length;
  return `<span class="reading-time" title="Estimated at 200 words per minute">Est. ${Math.max(1, Math.ceil(words / 200))} min read</span>`;
}

function interiorLead(title, deck, extraClass = '', { kicker = '', titleHTML = '' } = {}) {
  return `<header class="interior-lead ${extraClass}"><div class="interior-lead-copy">
    ${kicker ? `<p class="interior-kicker">${e(kicker)}</p>` : ''}<h1>${titleHTML || e(title)}</h1><p class="interior-deck">${e(deck)}</p>
  </div></header>`;
}

function archiveEntryCopy(entry, titleId, featured = false) {
  const presentation = articleDisplay[entry.slug] || {};
  const summary = presentation.deck || entry.summary;
  const label = featured ? 'Featured' : presentation.category;
  const meta = [dateLabel(entry.date), readingTime(entry)];
  return `${label ? `<p class="archive-label">${e(label)}</p>` : ''}
    <h2 id="${e(titleId)}"><a href="${e(entry.path)}">${e(entry.title)}<span class="archive-arrow" aria-hidden="true">${icon('arrow')}</span></a></h2>
    <p class="archive-meta">${meta.filter(Boolean).join(' <span aria-hidden="true">·</span> ')}</p>
    ${summary ? `<p class="archive-summary">${e(summary).replace(/`([^`\r\n]+)`/g, '<code>$1</code>')}</p>` : ''}`;
}

export function articlesPage(entries) {
  const featured = featuredArticle(entries);
  const rest = entries.filter(entry => entry !== featured);
  const reset = rest.find(entry => entry.slug === 'modern-resets');
  const ordered = reset ? [reset, ...rest.filter(entry => entry !== reset)] : rest;
  return `${interiorLead('In-depth CSS for real-world builders.', 'Guides, deep dives, and thoughtful explorations of modern CSS.', 'collection-lead', { kicker:'Articles', titleHTML:'In-depth CSS for <span class="title-phrase">real-world builders.</span>' })}
  <div class="interior-paper archive-sheet">
    ${featured ? `<article class="archive-feature${featured.image ? '' : ' without-thumbnail'}" aria-labelledby="archive-feature-title">
      ${featured.image ? `<img src="${e(featured.image.path)}" width="${featured.image.width}" height="${featured.image.height}" alt="${e(featured.image.alt)}" fetchpriority="high">` : ''}
      <div>${archiveEntryCopy(featured, 'archive-feature-title', true)}</div>
    </article>` : ''}
    ${ordered.length ? `<section class="archive-list" aria-label="All articles"><ul role="list">
      ${ordered.map(entry => `<li class="archive-row">${archiveEntryCopy(entry, `archive-${entry.slug}`)}</li>`).join('')}
    </ul></section>` : ''}
    ${topicNavigation('archive-topic-navigation')}
  </div>`;
}

const quickPresentation = {
  'simplify-slideshows-with-scroll-snap': { token: 'scroll-snap-type', preview: 'snap' },
  'smooth-scrolling-for-anchor-links': { token: 'scroll-behavior', preview: 'scroll' },
  'style-one-element-based-on-another': { token: ':has()', preview: 'has' },
  'make-elements-respect-dynamic-viewport-height': { token: '100dvh', preview: 'viewport' },
  'balance-multi-line-headings-automatically': { token: 'text-wrap: balance', preview: 'balance' },
  'keep-form-focus-indicators-consistent': { token: ':focus-visible', preview: 'focus' },
  'prevent-layout-shift-when-scrollbars-appear': { token: 'scrollbar-gutter', preview: 'gutter' },
  'trim-unwanted-spacing-from-text-edges': { token: 'text-box-trim', preview: 'trim' },
  'create-fluid-typography-that-scales': { token: 'clamp()', preview: 'fluid' },
};
const topicLabel = tag => tag === 'typography' ? 'Typography' : tag.charAt(0).toUpperCase() + tag.slice(1);

function quickPreview(entry, type) {
  const id = `quick-preview-${entry.slug}`;
  const previews = {
    snap: `<div class="qp-snap" role="region" aria-label="Scroll snap preview" tabindex="0"><span>01</span><span>02</span><span>03</span></div><span class="quick-preview-hint" aria-hidden="true">Scroll the panels</span>`,
    scroll: `<div class="qp-scroll"><div class="qp-scroll-window" role="region" aria-label="Smooth scrolling preview" tabindex="0"><span>First section</span><span>Second section</span><span id="${id}-end">Last section</span></div><a href="#${id}-end" aria-label="Jump to the last preview panel">Jump down ${icon('arrow')}</a></div>`,
    has: `<div class="qp-has"><div class="qp-has-target" id="${id}"><span>A simple card</span></div><label class="quick-has-control" hidden><input type="checkbox" data-quick-has="${id}">Include an image</label></div>`,
    viewport: '<div class="qp-viewport" aria-hidden="true"><div class="qp-phone"><i></i><span>100<span>dvh</span></span></div><div class="qp-phone qp-phone-short"><i></i><span>100<span>dvh</span></span></div><span class="qp-viewport-caption">Dynamic viewport height</span></div>',
    balance: '<div class="qp-balance" aria-hidden="true"><p>Balanced text avoids short last lines.</p><i></i><i></i></div>',
    focus: '<div class="qp-focus"><span aria-hidden="true">Keyboard focus</span><input type="text" aria-label="Focus indicator preview" placeholder="Tab into this field"></div>',
    gutter: '<div class="qp-gutter" aria-hidden="true"><div><i></i><i></i><i></i><i></i><b></b></div><span>Reserved<br>scrollbar space</span></div>',
    trim: '<div class="qp-trim" aria-hidden="true"><span>Aa</span><i></i><i></i><b>Trimmed text edges.</b></div>',
    fluid: '<div class="qp-fluid" aria-hidden="true"><span>Aa</span><span>Aa</span><span>Aa</span><i></i></div>',
  };
  return previews[type] ? `<div class="quick-visual quick-visual-${type}">${previews[type]}</div>` : '';
}

export function quickPage(entries) {
  const tags = [...new Set(entries.flatMap(item => item.tags))].sort();
  const counts = new Map(tags.map(tag => [tag, entries.filter(entry => entry.tags.includes(tag)).length]));
  return `${interiorLead('Quick Wins', 'Short CSS examples you can try, copy, and adapt.', 'collection-lead')}
    <div class="interior-paper quick-workbench">
      <form class="topic-filter quick-controls" role="search" aria-label="Filter Quick Wins" action="/quick-wins/" method="get" hidden>
        <fieldset class="quick-topics"><legend>Filter by topic</legend><div class="quick-topic-options">${[['', 'All wins', entries.length], ...tags.map(tag => [tag, topicLabel(tag), counts.get(tag)])].map(([value, label, count]) => `<label class="quick-topic"><input type="radio" name="topic" value="${e(value)}"${value === '' ? ' checked' : ''}><span>${e(label)}</span><span class="quick-topic-count" aria-hidden="true">${count}</span></label>`).join('')}</div></fieldset>
        <div class="quick-find"><label for="quick-query">Find a quick win</label><div>${icon('search')}<input type="search" id="quick-query" name="q" maxlength="100" placeholder="Try clamp, focus, or layout"></div></div>
        <p class="status quick-result-count" role="status"></p>
      </form>
      <ul class="quick-list quick-grid">${entries.map(entry => {
        const display = quickPresentation[entry.slug] || {};
        const topic = entry.tags[0] || 'css';
        const token = display.token || entry.code?.match(/^\s*([a-z][a-z-]*)\s*:/m)?.[1] || 'CSS';
        return `<li data-topics="${e(JSON.stringify(entry.tags))}" data-quick-search="${displayText([entry.title, entry.summary, entry.note, entry.code, ...entry.tags].filter(Boolean).join(' '))}">
        <article class="quick-card" data-tone="${e(topic)}" aria-labelledby="quick-${entry.slug}">
          <div class="quick-card-meta"><span class="quick-topic-name">${e(topicLabel(topic))}</span>${entry.difficulty ? `<span class="quick-level">${e(entry.difficulty)}</span>` : ''}</div>
          <div class="quick-card-copy"><p class="quick-token">${e(token)}</p><h2 id="quick-${entry.slug}"><a href="${entry.path}">${e(entry.title)}</a></h2><p class="quick-summary">${displayText(entry.summary || '')}</p></div>
          ${quickPreview(entry, display.preview)}
          ${entry.code ? codeControls(`<pre><code class="language-css">${e(entry.code)}</code></pre>`) : ''}
          <div class="quick-card-footer">${entry.note ? `<details class="quick-note"><summary>Good to know</summary><p>${displayText(entry.note)}</p></details>` : ''}<a href="${entry.path}" aria-label="Read ${e(entry.title)}">Read example</a></div>
        </article></li>`;
      }).join('')}</ul>
      <div class="quick-empty" hidden><h2>No quick wins found.</h2><p>Try a different word or explore all the techniques.</p><button type="button" data-clear-quick>Clear filters</button></div>
    </div>`;
}

const resourceCategories = [
  { id: 'documentation', title: 'Documentation', description: 'Specifications and platform references.', icon: 'book' },
  { id: 'tools', title: 'Tools', description: 'Inspect and debug CSS in the browser.', icon: 'tool' },
  { id: 'patterns', title: 'Patterns', description: 'Layout guides and interface examples.', icon: 'layers' },
  { id: 'community', title: 'Community', description: 'Tutorials, experiments, and developer research.', icon: 'people' },
];

const resourceNotes = {
  'mdn-web-docs': { note: 'CSS syntax, browser support tables, and examples for the web platform.' },
  'css-tricks': { note: 'Front-end articles, CSS layout guides, and reusable interface patterns.' },
  'kevin-powell': { note: 'Video tutorials on CSS layout, responsive design, and modern browser features.' },
  'ahmad-shadeed': { note: 'Illustrated articles on responsive layouts, interface details, and CSS edge cases.' },
  'lynn-fisher': { note: 'CSS experiments, interactive websites, and visual design projects.' },
  'state-of-css-devographics': { note: 'An annual survey of CSS feature adoption and developer experience.' },
};

function resourceItem(entry) {
  const notes = resourceNotes[entry.slug] || {};
  const host = new URL(entry.url).hostname.replace(/^www\./, '');
  const save = `<button class="resource-save" type="button" data-save-resource="${e(entry.slug)}" aria-label="Save ${e(entry.title)}" aria-pressed="false" hidden>${icon('bookmark')}<span>Save</span></button>`;
  return `<li class="resource-entry" data-resource="${e(entry.slug)}" data-resource-title="${e(entry.title)}" data-resource-search="${e([entry.title, entry.summary, notes.note, host].filter(Boolean).join(' '))}">
    <article class="resource-record" aria-labelledby="resource-title-${entry.slug}">
      <div class="resource-record-copy">
        <h3 id="resource-title-${entry.slug}"><a href="${e(entry.path || entry.url)}">${e(entry.title)}</a></h3>
        <p class="resource-description">${e(notes.note || entry.summary || '')}</p>
        <div class="resource-record-actions"><a class="resource-visit" href="${e(entry.url)}" aria-label="Visit ${e(entry.title)}">${e(host)}</a>${save}</div>
      </div>
    </article>
  </li>`;
}

export function resourcesPage(entries) {
  const groups = new Map(resourceCategories.map(category => [category.id, []]));
  for (const entry of entries) {
    const category = entry.slug === 'mdn-web-docs' ? 'documentation' : entry.slug === 'css-tricks' ? 'patterns' : entry.kind === 'Tool' ? 'tools' : 'community';
    groups.get(category).push(entry);
  }
  if (!groups.get('tools').length) groups.get('tools').push({
    slug: 'chrome-devtools-css-guide', title: 'Chrome DevTools CSS guide', kind: 'Official documentation',
    url: 'https://developer.chrome.com/docs/devtools/css/', summary: 'The official guide to inspecting and debugging CSS with Chrome DevTools.',
  });
  const total = [...groups.values()].reduce((sum, group) => sum + group.length, 0);
  return `${interiorLead('CSS resources', 'Documentation, tools, tutorials, and independent work from across the CSS community.', 'collection-lead')}
    <div class="interior-paper resource-paper reading-room" id="reading-room">
      <aside class="resource-sidebar">
        <div class="resource-sidebar-inner">
          <p class="resource-overline">On the shelves</p>
          <nav class="resource-shelf-nav" aria-label="Resource categories">${resourceCategories.map(category => `<a href="#${category.id}" aria-label="${category.title}">${icon(category.icon)}<span>${category.title}</span><span class="resource-shelf-count" aria-hidden="true">${groups.get(category.id).length}</span></a>`).join('')}</nav>
          <div class="resource-shortlist" hidden><button type="button" class="resource-shortlist-toggle" aria-pressed="false" aria-label="Show your shortlist">${icon('bookmark')}<span>Your shortlist</span><span class="resource-saved-count">0</span></button><p>Keep your favorites close.<br>Saved in this browser.</p></div>
          <div class="resource-sidebar-note"><span aria-hidden="true">✳</span><p>A small collection.<br><em>A long shelf life.</em></p><p>Chosen for the way they explain, inspire, and help you build.</p></div>
        </div>
      </aside>
      <div class="resource-library">
        <div class="resource-library-heading"><div><h2>Resource directory</h2></div><p class="resource-total">${total} resources</p></div>
        <form class="resource-find" role="search" aria-label="Filter resources" action="/resources/" method="get" hidden><label class="visually-hidden" for="resource-query">Search resources</label>${icon('search')}<input type="search" id="resource-query" name="q" maxlength="100" placeholder="Search resources…"><button type="button" data-clear-resource-query hidden>Clear</button></form>
        <p class="resource-results" role="status">${total} resources available</p>
        <div class="resource-shelves">${resourceCategories.map(category => `<section class="resource-section" id="${category.id}" aria-labelledby="resource-${category.id}">
          <header class="resource-section-heading"><div><h2 id="resource-${category.id}">${category.title}</h2><p>${category.description}</p></div><span class="resource-section-count" aria-label="${groups.get(category.id).length} ${groups.get(category.id).length === 1 ? 'resource' : 'resources'}">${String(groups.get(category.id).length).padStart(2, '0')}</span></header>
          <ul class="resource-directory">${groups.get(category.id).map(resourceItem).join('')}</ul>
        </section>`).join('')}</div>
        <div class="resource-empty" hidden><span aria-hidden="true">${icon('book')}</span><h2>No resources found.</h2><p>Try another word or browse the whole collection.</p><button type="button" data-reset-resources>Explore all resources</button></div>
      </div>
    </div>`;
}

function codeControls(html) {
  return highlightCodeBlocks(html).replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, block => {
    const pre = block.replace(/^<pre\b([^>]*)>/i, '<pre tabindex="0"$1>');
    return `<div class="code-block"><div class="code-toolbar"><button type="button" class="copy" hidden>Copy code</button></div>${pre}</div>`;
  });
}

function outline(html) {
  const headings = walk(parseFragment(html)).filter(node => node.tagName === 'h2');
  const names = [];
  const ids = new Set(walk(parseFragment(html)).flatMap(node => (node.attrs ?? []).filter(attr => attr.name === 'id').map(attr => attr.value)));
  const updated = html.replace(/<h2\b([^>]*)>/gi, (match, attrs) => {
    const heading = headings[names.length];
    if (!heading) return match;
    const title = nodeText(heading).trim();
    const original = heading.attrs.find(attr => attr.name === 'id')?.value
      || (heading.parentNode.tagName === 'section' && heading.parentNode.attrs.find(attr => attr.name === 'id')?.value);
    let id = original || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const base = id;
    let suffix = 2;
    while (!original && ids.has(id)) id = `${base}-${suffix++}`;
    ids.add(id);
    names.push({ id, title });
    return original ? match : `<h2${attrs} id="${e(id)}">`;
  });
  return { html: updated, names };
}

function articleActions(entry) {
  return `<div class="article-actions" data-article-url="${e(entry.path)}" hidden>
    <button type="button" data-article-action="bookmark" aria-label="Bookmark article" aria-pressed="false">${icon('bookmark')}</button>
    <button type="button" class="round-action" data-article-action="share" aria-label="Share article">${icon('share')}</button>
    <details class="article-more"><summary class="round-action" aria-label="More article actions">${icon('more')}</summary><div class="article-action-menu"><button type="button" data-article-action="copy">Copy link</button><button type="button" data-article-action="print">Print</button></div></details>
    <p class="article-actions-status" role="status"></p>
  </div>`;
}

function articleHero(entry) {
  const display = articleDisplay[entry.slug] || {};
  return `<header class="interior-article-lead${entry.image ? ' has-cover' : ''}">
    <nav class="article-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/articles/">Articles</a></li>${display.category ? `<li>${e(display.category)}</li>` : ''}<li aria-current="location">${e(entry.title)}</li></ol></nav>
    <div class="article-hero-grid">
      <div class="article-hero-copy">
        <h1 id="article-title">${e(entry.title)}</h1>
        ${display.deck || entry.summary ? `<p class="interior-deck">${e(display.deck || entry.summary)}</p>` : ''}
        <div class="article-hero-meta"><div class="entry-meta">${entry.author ? `<span>By ${e(entry.author)}</span>` : ''}${dateLabel(entry.date)}<span aria-hidden="true">·</span>${readingTime(entry)}${entry.updatedAt ? `<span>Updated ${dateLabel(new Date(entry.updatedAt).toISOString().slice(0, 10))}</span>` : ''}</div>${articleActions(entry)}</div>
      </div>
      ${entry.image ? `<img class="article-cover" src="${e(entry.image.path)}" width="${entry.image.width}" height="${entry.image.height}" alt="${e(entry.image.alt)}" fetchpriority="high">` : ''}
    </div>
  </header>`;
}

function quickHero(entry) {
  return `<header class="interior-quick-lead"><div class="interior-lead-copy">
    <p class="interior-kicker">Quick Win</p><h1 id="article-title">${e(entry.title)}</h1>
    ${entry.summary ? `<p class="interior-deck">${displayText(entry.summary)}</p>` : ''}
    <div class="quick-hero-meta"><span>${icon('clock')}${readingTime(entry)}</span>${entry.difficulty ? `<span>${icon('difficulty')}${e(entry.difficulty[0].toUpperCase() + entry.difficulty.slice(1))}</span>` : ''}</div>
  </div></header>`;
}

function quickShowcase() {
  return `<section class="quick-showcase" aria-labelledby="quick-idea">
    <div class="quick-idea"><h2 id="quick-idea">The idea</h2><p>Use CSS scroll snap to create a clean, aligned slideshow — no JavaScript required.</p></div>
    <div class="code-block showcase-code"><div class="code-toolbar"><span class="code-language">CSS</span><button class="copy code-copy-icon" type="button" aria-label="Copy code" hidden>${icon('copy')}</button></div><pre tabindex="0">${highlightCode('.container {\n  scroll-snap-type: x mandatory;\n  overflow-x: auto;\n  display: flex;\n  gap: 1rem;\n}')}</pre></div>
  </section>`;
}

export function detail(entry, entries = []) {
  const section = entry.type === 'article' ? 'Articles' : entry.type === 'quick-win' ? 'Quick Wins' : 'Resources';
  const back = `/${entry.path.split('/')[1]}/`;
  const raw = entry.type === 'resource' ? entry.html.replace(/<h3\b[^>]*>[\s\S]*?<\/h3>/, '') : entry.html;
  const { html, names } = outline(raw.replace('<button type="button" id="toggle">', '<button type="button" id="toggle" hidden>'));
  const contents = entry.type === 'article' && names.length > 2;
  const meta = [
    entry.author && `<span>By ${e(entry.author)}</span>`,
    dateLabel(entry.date),
    entry.updatedAt && `<span>Updated ${dateLabel(new Date(entry.updatedAt).toISOString().slice(0, 10))}</span>`,
    entry.difficulty && `<span>${e(entry.difficulty)}</span>`,
  ].filter(Boolean).join('');
  const display = articleDisplay[entry.slug] || {};
  const showcase = entry.type === 'quick-win' && entry.slug === 'simplify-slideshows-with-scroll-snap';
  return `<article class="detail">
    ${entry.type === 'article' ? articleHero(entry) : entry.type === 'quick-win' ? quickHero(entry) : `<header class="article-lead"><div class="shell">
      <a class="back-link" href="${back}">${icon('back', 'link-icon')} ${section}</a>
      <h1 id="article-title">${e(entry.title)}</h1>
      ${entry.summary && entry.type !== 'resource' ? `<p class="dek">${displayText(entry.summary)}</p>` : ''}
      ${meta ? `<div class="article-meta">${meta}</div>` : ''}
    </div></header>`}
    <div class="interior-paper">
      ${showcase ? quickShowcase() : ''}
    <div class="shell article-layout${contents ? ' with-contents' : ''}">
      ${contents ? `<nav class="contents" aria-label="On this page"><details open>
        <summary id="contents-title"><span class="contents-heading">On this page</span><span class="contents-toggle" aria-hidden="true">${icon('arrow')}</span></summary>
        <div class="contents-meta"><span>${names.length} sections</span><span class="contents-progress" aria-hidden="true">01 / ${String(names.length).padStart(2, '0')}</span></div>
        <ul>${names.map(item => `<li><a href="#${e(encodeURIComponent(item.id))}"><span>${e(item.title)}</span></a></li>`).join('')}</ul>
        <a class="contents-top" href="#article-title">Back to article ${icon('up', 'link-icon')}</a>
      </details></nav>` : ''}
      <div class="prose">
        ${entry.type === 'article' && display.lede ? `<div class="article-opening"><p>${e(display.lede)}</p></div>` : ''}
        ${entry.type === 'quick-win' ? `<p class="quick-published">Published ${dateLabel(entry.date)}</p>` : ''}
        ${entry.slug === 'text-margin-trim' && entry.type === 'article' ? `<aside class="editorial-correction" aria-label="CSS terminology correction"><strong>CSS terminology update</strong><p>The original article below uses the name <code>text-margin-trim</code>. The current CSS properties are <code>text-box-trim</code> and <code>text-box-edge</code>. Use the <a href="/quick-wins/trim-unwanted-spacing-from-text-edges/">current text-box-trim example</a> and <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-box-trim">MDN reference</a> for implementation.</p></aside>` : ''}
        ${codeControls(html).replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => `<div class="table-scroll" tabindex="0" role="region" aria-label="Article table">${table}</div>`)}
        ${entry.url ? `<p><a class="text-link" href="${e(entry.url)}">Visit ${e(entry.title)} ${arrow}</a></p>` : ''}
        ${credit(entry)}
        ${relatedReading(entry, entries)}
      </div>
    </div></div>
  </article>`;
}

export function searchPage() {
  return `${lead('Search', 'Find an article, a Quick Win, a resource, or a CSS term.')}
    <div class="interior-paper"><div class="shell sections search-layout">
      <form class="search-form" role="search" aria-label="Search CSS" action="/search/" method="get">
        <label for="query">Search CSS</label>
        <div><input type="search" name="q" id="query" maxlength="100" placeholder="Try subgrid or @layer" required><button type="submit" class="button">Search</button></div>
      </form>
      <p id="search-status" class="status" role="status"></p>
      <div id="search-results"></div>
      <noscript><p>Search uses JavaScript. Browse <a href="/articles/">Articles</a>, <a href="/quick-wins/">Quick Wins</a>, <a href="/resources/">Resources</a>, or the <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Reference">MDN CSS reference</a>.</p></noscript>
    </div></div>`;
}

export function notFound() {
  return `${lead('Page not found', 'This address doesn’t lead to a page in The Cascade Lounge.')}
    <div class="interior-paper"><div class="shell sections"><a class="text-link" href="/articles/">Browse articles ${forward}</a></div></div>`;
}

const topicNavigationDisplay = {
  'responsive-layout': { label:'Layout' },
  'selectors-and-cascade': { label:'Selectors & cascade' },
  'animation-and-scrolling': { label:'Motion & scrolling' },
  'typography-and-color': { label:'Type & color' },
  'forms-and-accessibility': { label:'Forms & accessibility' },
};

function topicNavigation(className = '') {
  return `<nav class="topic-navigation ${className}" aria-label="Learn CSS by topic">
    <div class="topic-navigation-intro"><h2>CSS topics</h2></div>
    <div class="topic-navigation-menu"><ul>${topics.map(topic => {
      const display = topicNavigationDisplay[topic.slug];
      return `<li><a href="${topicPath(topic)}" aria-label="${e(topic.title)}"><span>${e(display.label)}</span></a></li>`;
    }).join('')}<li><a class="topic-navigation-all" href="/topics/">Browse all CSS topics</a></li></ul></div>
  </nav>`;
}

function relatedReading(entry, entries) {
  const groups = entryTopics(entry);
  const related = relatedEntries(entry, entries);
  if (!groups.length && !related.length) return '';
  return `<aside class="related-reading" aria-labelledby="related-title"><h2 id="related-title">Related CSS guides</h2><ul>${related.map(other => `<li><a href="${e(other.path)}">${e(other.title)}</a><p>${e(seoMetadata(other.path, other.title, other.summary, other).description)}</p></li>`).join('')}</ul>${groups.length ? `<nav aria-label="Related CSS topics">${groups.map(topic => `<a href="${topicPath(topic)}">${e(topic.title)}</a>`).join('')}</nav>` : ''}</aside>`;
}

export function topicsPage() {
  return `${interiorLead('Learn CSS by topic', 'Choose a problem, follow a learning path, and put the examples to work.')}
  <div class="interior-paper topic-paper"><div class="topic-grid">${topics.map(topic => `<section class="topic-card"><h2><a href="${topicPath(topic)}">${e(topic.title)}</a></h2><p>${e(topic.description)}</p><a class="text-link" href="${topicPath(topic)}">Explore this CSS topic</a></section>`).join('')}</div></div>`;
}

export function topicPage(topic, entries) {
  const members = topicEntries(topic, entries);
  const section = (type, title) => {
    const list = members.filter(entry => entry.type === type);
    return list.length ? `<section class="topic-reading-list"><h2>${title}</h2><ul>${list.map(entry => `<li><h3><a href="${e(entry.path)}">${e(entry.title)}</a></h3><p>${e(seoMetadata(entry.path,entry.title,entry.summary,entry).description)}</p></li>`).join('')}</ul></section>` : '';
  };
  return `${interiorLead(topic.title,topic.description)}<div class="interior-paper topic-paper"><nav class="topic-breadcrumbs" aria-label="Breadcrumb"><a href="/topics/">All CSS topics</a><span aria-current="page">${e(topic.title)}</span></nav><div class="topic-guide"><div class="topic-introduction"><h2>Where to begin</h2><p>${e(topic.intro)}</p>${topic.sections.map(part => `<h2>${e(part.title)}</h2><p>${e(part.text)}</p>`).join('')}</div><div>${section('article','In-depth CSS guides')}${section('quick-win','CSS snippets to try')}</div></div>${topicNavigation()}</div>`;
}
