/* FinVest Track Record — shared front-end (vanilla JS + vendored uPlot). Plain-English first; advanced options are hidden. */
(function () {
'use strict';
const TD = 252, MIN_TR = 30, MIN_DAYS = 60;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache = {};
async function J(p) { if (!cache[p]) cache[p] = fetch(p, {cache: 'no-cache'}).then(r => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }); return cache[p]; }
const pct = (x, d = 1) => x == null || !isFinite(x) ? '–' : (x * 100).toFixed(d) + '%';
const spct = (x, d = 1) => x == null || !isFinite(x) ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(d) + '%';
const num = (x, d = 2) => x == null || !isFinite(x) ? '–' : Number(x).toFixed(d);
const cls = x => x == null || !isFinite(x) ? '' : x > 0 ? 'pos' : x < 0 ? 'neg' : '';
const pts = x => x == null || !isFinite(x) ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + ' pts';
const bucketOf = c => c == null ? null : c < .5 ? 'lt50' : c < .6 ? '50_60' : c < .7 ? '60_70' : 'ge70';
const BUCKETS = [['all','All'],['lt50','Under 50%'],['50_60','50–60%'],['60_70','60–70%'],['ge70','70%+']];
const MKT = {IN: {name: 'India', cur: '₹', bench: 'NIFTY 500'}, US: {name: 'US', cur: '$', bench: 'SPY (S&P 500)'}};

/* ---- plain-English glossary: any jargon gets a one-line tooltip ---- */
const GLOSS = {
  'conviction': 'How sure the model is about its own view, from 0% to 100%. It is not a probability of profit.',
  'regime': 'The model’s label for the current market mood of a stock (e.g. recovery, accumulation, distribution, markdown).',
  'benchmark': 'A broad market index we compare against: NIFTY 500 for India, SPY (the S&P 500) for the US.',
  'p10/p50/p90': 'The model’s own range for the next ~month: a bad-case (10th percentile), typical (50th) and good-case (90th) return.',
  'cvar': 'Average loss in the worst 5% of the model’s simulated outcomes.',
  'drawdown': 'How far the portfolio fell from its previous high point.',
  'sharpe': 'Return earned per unit of ups-and-downs, after the risk-free rate. Higher is better.',
  'sortino': 'Like Sharpe but only counts the downs.',
  'beta': 'How strongly the portfolio moves with the market (1 = moves the same).',
  'ir': 'Information ratio: how steadily the portfolio beats the benchmark.',
  'cagr': 'Return per year, annualised. Only shown after one year of data.',
  'profit factor': 'Total gains divided by total losses across closed trades.',
  'signal': 'The model’s latest view on a stock: long signal (INITIATE/ADD), Hold, or Avoid.',
  'since signal': 'Price move from the close of the signal date to the latest close. Fills in as trading days pass.',
  'vs market': 'The stock’s move minus the benchmark’s move over the same days, in percentage points.',
  'locked': 'A day’s long signals are published only after their entry price exists (the entry session has closed).'
};
const tip = (t, key) => `<span class="tip" tabindex="0" data-tip="${esc(GLOSS[key || t.toLowerCase()] || '')}">${esc(t)}</span>`;
const VIEWS = {INITIATE: 'Long signal', ADD: 'Long signal', HOLD: 'Hold', AVOID: 'Avoid', REDUCE: 'Reduce', EXIT: 'Exit'};
const GROUPS = {INITIATE: 'buy', ADD: 'buy', HOLD: 'hold', AVOID: 'avoid', REDUCE: 'exit', EXIT: 'exit'};
const VERD = {beat: ['Beat the market', 'd-beat'], fell: ['Fell more than the market', 'd-fell'], lagged: ['Lagged the market', 'd-fell'], inline: ['In line with market', 'd-inline']};

/* ---- plain-English translation of the model's rationale codes (original text always kept) ---- */
const CODES = {momentum_20d: 'the last 20 days’ price trend', below_sma20: 'price is below its 20-day average', above_sma20: 'price is above its 20-day average',
  vol_contained: 'price swings are calm', vol_elevated: 'price swings are large', macd_bullish: 'the trend indicator (MACD) points up', macd_bearish: 'the trend indicator (MACD) points down',
  rsi_oversold: 'the stock looks oversold (fell a lot recently)', rsi_overbought: 'the stock looks overbought (rose a lot recently)',
  rejected_negative: 'recent bad news did not push the price down', absorbed_negative: 'bad news was absorbed by the price', rejected_positive: 'recent good news did not lift the price', absorbed_positive: 'good news was absorbed by the price'};
function plainWhy(t) {
  if (!t) return '';
  return esc(t).replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, c => CODES[c] ? `<span class="tip" tabindex="0" data-tip="Model code: ${c}">${CODES[c]}</span>` : c)
    .replace(/\b(INITIATE|ADD) LONG\b/, 'Long signal').replace(/\bHOLD NEUTRAL\b/, 'Hold').replace(/\bAVOID LONG\b/, 'Avoid');
}
/* ---- "Data for this page": the exact API files behind each dashboard page ---- */
const API = 'api/v1/';
const LONG_NOTICE = 'These long-signal analyses are model outputs shown for testing and educational purposes only. Not investment advice, not a recommendation to buy or sell.';
const DATAFOR = {
  'index.html': m => [['tracker/' + m + '/long_positions.json', 'unlocked long positions vs the 3 indices'], ['latest/' + m + '.json', 'latest model views'], ['tracker/' + m + '/groups.json', 'group averages vs the 3 indices'], ['tracker/indices.json', 'the 3 indices'], ['health/status.json', 'pipeline status']],
  'long.html': m => [['tracker/' + m + '/long_positions.json', 'every unlocked long position: entry, returns vs 3 indices, range, rationale, price series'], ['tracker/' + m + '/long_positions.csv', 'the same as a flat CSV'], ['tracker/' + m + '/core.json', 'long-book equity curve (books A/B) and KPIs'], ['tracker/' + m + '/trades.json', 'open and closed trades'], ['tracker/indices.json', 'the 3 indices'], ['signals/dates.json', 'signal days and their lock status']],
  'stocks.html': m => [['tracker/' + m + '/long_positions.json', 'unlocked long positions (Long positions tab)'], ['latest/' + m + '.json', 'every stock (JSON)'], ['latest/' + m + '.csv', 'every stock (CSV)'], ['tracker/' + m + '/stock_moves.csv', '1D/1W/1M/3M/since-signal moves vs 3 indices (CSV)'], ['tracker/' + m + '/groups.json', 'group bar charts'], ['ticker/' + m + '/index.json', 'one file per stock'], ['prices/index.json', 'full price history per stock (Yahoo-sourced)']],
  'why-avoid.html': m => [['latest/' + m + '.json', 'views + rationale'], ['tracker/' + m + '/stock_moves.csv', 'moves vs 3 indices (CSV)'], ['tracker/' + m + '/groups.json', 'share of Avoid names that lagged']],
  'results.html': m => [['tracker/' + m + '/core.json', 'books A/B, daily returns, KPIs'], ['tracker/' + m + '/trades.json', 'open and closed trades'], ['tracker/indices.json', 'index comparison']],
  'day.html': m => [['signals/dates.json', 'all signal days'], ['tracker/' + m + '/days.json', 'daily-list picks and returns'], ['signals/' + (window.__IDX && window.__IDX.state_as_of || '') + '/' + m + '.json', 'the day’s signals']],
  'quality.html': m => [['tracker/' + m + '/quality.json', 'forward moves by group, conviction and regime']],
  'weekly.html': m => [['tracker/' + m + '/groups.json', 'group performance'], ['health/status.json', 'status']],
  'health.html': m => [['health/log.json', 'pipeline log'], ['health/checks.json', 'price + index cross-checks'], ['health/status.json', 'status']],
  'audit.html': m => [['audit/summary.json', 'workflow reliability summary'], ['finvest/system-status.json', 'FinVest pipeline status'], ['finvest/coverage.json', 'FinVest coverage']],
  'methodology.html': m => [['fields.json', 'field dictionary'], ['index.json', 'endpoint catalogue'], ['tracker/indices.json', 'the 3 indices per market']],
};
function dataFor() {
  const el = $('#datafor'); if (!el) return;
  const cur = location.pathname.split('/').pop() || 'index.html', f = DATAFOR[cur]; if (!f) { el.remove(); return; }
  const draw = () => {
    const items = f(S.market).filter(x => !/\/\/|\/\./.test(x[0]));
    el.innerHTML = `<b>Data for this page</b> <span class="mut small">— the exact files behind it (${MKT[S.market].name}). Free, no keys.</span><ul>` + items.map(([p, t]) => `<li class="${p.startsWith('prices/') ? 'yh' : ''}"><a href="${API + p}">${p}</a> <span class="mut small">${t}</span></li>`).join('') +
      `</ul><span class="small"><a href="api.html#fieldmap">How dashboard fields map to API fields</a> · <a href="api.html#download">Download everything</a> · <a href="${API}index.json">index.json</a></span>`;
  };
  draw(); window.__dfRedraw = draw;
}
/* ---- state ---- */
const DEF = {market: 'IN', cmp: 'primary', period: 'All', book: 'A', cost: 'net', variant: 'tradeable', bucket: 'all', from: '', to: '', day: ''};
let S = Object.assign({}, DEF);
try { Object.assign(S, JSON.parse(localStorage.getItem('fv2') || '{}')); } catch (e) {}
(function () { const h = new URLSearchParams(location.hash.slice(1)); for (const [k, v] of h) if (k in DEF) S[k] = v; })();
if (!MKT[S.market]) S.market = 'IN';
if (!['primary', 'secondary', 'tertiary'].includes(S.cmp)) S.cmp = 'primary';
if (!['1W', '1M', '3M', 'All', 'custom'].includes(S.period)) S.period = 'All';
const save = () => { try { localStorage.setItem('fv2', JSON.stringify(S)); } catch (e) {} };

/* ---- layout ---- */
function layout() {
  dataFor();
  const cur = location.pathname.split('/').pop() || 'index.html';
  const th = localStorage.getItem('fv_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = th;
  $$('header.top nav a').forEach(a => { if (a.getAttribute('href') === cur) { a.classList.add('on'); const d = a.closest('details'); if (d) d.querySelector('summary').classList.add('on'); } });
  const t = $('#theme');
  if (t) { t.textContent = th === 'dark' ? '☀' : '☾'; t.onclick = () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; localStorage.setItem('fv_theme', n); t.textContent = n === 'dark' ? '☀' : '☾'; if (window.__redraw) window.__redraw(); }; }
  document.addEventListener('click', e => { $$('nav details[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
}

/* ---- controls: Market + Period always; the rest under Advanced ---- */
function controls(el, opts) {
  opts = opts || {};
  const seg = (key, items) => `<div class="seg" role="group" data-key="${key}">` + items.map(([v, t]) => `<button data-k="${key}" data-v="${v}" class="${S[key] === v ? 'on' : ''}">${t}</button>`).join('') + '</div>';
  const grp = (label, key, items) => `<div class="grp"><label>${label}</label>${seg(key, items)}</div>`;
  let h = seg('market', [['IN', 'India'], ['US', 'US']]);
  if (opts.compare && window.__IDX) { const bn = window.__IDX.bench_names[S.market]; h += `<div class="grp cmpg"><label class="small mut">Compare with</label>${seg('cmp', [['primary', bn.primary], ['secondary', bn.secondary], ['tertiary', bn.tertiary]])}</div>`; }
  if (!opts.noPeriod) h += seg('period', [['1W', '1 week'], ['1M', '1 month'], ['3M', '3 months'], ['All', 'All']]);
  const adv = [];
  if (opts.book) adv.push(grp('Portfolio', 'book', [['A', 'Signal portfolio (A)'], ['B', 'Daily list (B)']]));
  if (opts.cost) adv.push(grp('Costs', 'cost', [['net', 'After costs'], ['gross', 'Before costs']]));
  if (opts.variant) adv.push(grp('Entry price', 'variant', [['tradeable', 'Tradeable'], ['signalopen', 'Signal-day open (theoretical)']]));
  if (opts.bucket) adv.push(grp('Conviction', 'bucket', BUCKETS));
  if (opts.dates) adv.push(`<div class="grp"><label>From</label><input type="date" id="f_from" value="${S.from}"><label>To</label><input type="date" id="f_to" value="${S.to}"></div>`);
  if (opts.extra) adv.push(opts.extra);
  if (adv.length) h += `<button class="advbtn" id="advbtn" aria-expanded="${!!S._adv}">Advanced ${S._adv ? '▴' : '▾'}</button><div class="adv ${S._adv ? 'open' : ''}" id="advbox">${adv.join('')}</div>`;
  el.innerHTML = h; el.classList.add('controls');
  $$('button[data-k]', el).forEach(b => b.onclick = () => { S[b.dataset.k] = b.dataset.v; if (b.dataset.k === 'period') { S.from = ''; S.to = ''; } save(); controls(el, opts); window.__dfRedraw && window.__dfRedraw(); window.__redraw && window.__redraw(); });
  const ab = $('#advbtn', el); if (ab) ab.onclick = () => { S._adv = !S._adv; save(); controls(el, opts); };
  const f = $('#f_from', el), t = $('#f_to', el);
  if (f) f.onchange = () => { S.from = f.value; S.period = 'custom'; save(); controls(el, opts); window.__redraw && window.__redraw(); };
  if (t) t.onchange = () => { S.to = t.value; S.period = 'custom'; save(); controls(el, opts); window.__redraw && window.__redraw(); };
  if (opts.onMount) opts.onMount(el);
}
const filterBar = (el, o) => { o = o || {}; controls(el, {compare: true, book: !o.noBook, cost: !o.noCost, variant: true, bucket: !o.noBucket, dates: !o.noRange, noPeriod: o.noRange}); };
const PN = {'1W': 5, '1M': 21, '3M': 63, 'All': 1e9};
function range(last) {
  if (S.period === 'custom' && (S.from || S.to)) return [S.from || '0000', S.to || '9999'];
  if (!last || S.period === 'All') return ['0000', '9999'];
  const d = new Date(last + 'T00:00:00Z');
  if (S.period === '1W') d.setUTCDate(d.getUTCDate() - 7); else if (S.period === '1M') d.setUTCMonth(d.getUTCMonth() - 1); else if (S.period === '3M') d.setUTCMonth(d.getUTCMonth() - 3);
  return [d.toISOString().slice(0, 10), '9999'];
}

/* ---- time helpers ---- */
function eta(iso) {
  if (!iso) return '';
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return 'now (shows up with the next site update)';
  const m = Math.round(ms / 60000);
  if (m < 90) return `in about ${m} min`;
  if (m < 2880) return `in about ${Math.round(m / 60)} hours`;
  return `in about ${Math.round(m / 1440)} days`;
}
const istText = iso => { if (!iso) return '–'; const d = new Date(iso); return d.toLocaleString('en-GB', {timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false}) + ' IST'; };
const dateText = s => { if (!s) return '–'; const d = new Date(s + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', {timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric'}); };

/* ---- data ---- */
async function loadMarket(m) {
  const [core, days, trades, quality] = await Promise.all(['core', 'days', 'trades', 'quality'].map(f => J(`data/${m}_${f}.json`)));
  return {core, days, trades, quality};
}
const variantOf = D => { const v = D.core.variants && D.core.variants[S.variant]; return v && !v.empty ? v : null; };
const BKEYS = ['primary', 'secondary', 'tertiary'];
function seriesA(D) { const v = variantOf(D); if (!v) return null; const A = v.A, key = S.cost === 'gross' ? 'gross' : 'net'; const bm = {}; BKEYS.forEach(k => bm[k] = A['bench_' + k] || A.dates.map(() => 0)); return {dates: A.dates, r: A[key], bm, b: bm[S.cmp], rf: A.rf, n_pos: A.n_pos, turnover: A.turnover}; }
function seriesB(D) {
  const dl = D.days.variants && D.days.variants[S.variant]; if (!dl) return null;
  const cost = S.cost === 'gross' ? 0 : (window.__IDX.cost_round_trip[D.core.market] || 0), by = {};
  for (const d of dl) {
    if (d.status !== 'complete') continue;
    const rr = d.rows.filter(x => x.ret != null && (S.bucket === 'all' || bucketOf(x.conviction) === S.bucket)); if (!rr.length) continue;
    const m = rr.reduce((a, x) => a + x.ret, 0) / rr.length, e = by[d.exit_session] || (by[d.exit_session] = {r: [], b: {primary: [], secondary: [], tertiary: []}, n: 0});
    e.r.push(m - cost); BKEYS.forEach(k => e.b[k].push((d.bench_1s || {})[k] || 0)); e.n += rr.length;
  }
  const dates = Object.keys(by).sort(); if (!dates.length) return null;
  const av = a => a.reduce((x, y) => x + y, 0) / a.length, bm = {};
  BKEYS.forEach(k => bm[k] = dates.map(d => av(by[d].b[k])));
  return {dates, r: dates.map(d => av(by[d].r)), bm, b: bm[S.cmp], rf: dates.map(() => 0), n_pos: dates.map(d => by[d].n), turnover: dates.map(() => 1)};
}
function slice(s, lo, hi) { if (!s) return null; const idx = []; s.dates.forEach((d, i) => { if (d >= lo && d <= hi) idx.push(i); }); const p = a => idx.map(i => a[i]); const bm = {}; BKEYS.forEach(k => bm[k] = p(s.bm[k])); return {dates: p(s.dates), r: p(s.r), bm, b: bm[S.cmp], rf: p(s.rf), n_pos: p(s.n_pos), turnover: p(s.turnover)}; }
const cumr = a => a.reduce((p, x) => p * (1 + x), 1) - 1;
function ddSeries(r) { let n = 1, pk = 1; return r.map(x => { n *= 1 + x; pk = Math.max(pk, n); return n / pk - 1; }); }
const navSeries = r => { let n = 100; return r.map(x => (n *= 1 + x)); };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function sd(a) { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); }
function kpis(s) {
  const n = s.r.length, o = {n_days: n}; if (!n) return o;
  o.cum = cumr(s.r); o.bench_cum = cumr(s.b); o.excess = o.cum - o.bench_cum; o.cagr = n >= TD ? Math.pow(1 + o.cum, TD / n) - 1 : null;
  o.best = Math.max(...s.r); o.worst = Math.min(...s.r); o.vol = n > 1 ? sd(s.r) * Math.sqrt(TD) : null;
  const dd = ddSeries(s.r); o.maxdd = Math.min(...dd); o.curdd = dd[dd.length - 1];
  const ex = s.r.map((x, i) => x - s.rf[i]), sdv = sd(s.r); o.sharpe = sdv > 0 ? mean(ex) / sdv * Math.sqrt(TD) : null;
  const dsd = Math.sqrt(mean(ex.map(x => Math.min(x, 0) ** 2))); o.sortino = dsd > 0 ? mean(ex) / dsd * Math.sqrt(TD) : null;
  const mb = mean(s.b), vb = n > 1 ? s.b.reduce((x, y) => x + (y - mb) ** 2, 0) / (n - 1) : 0, mr = mean(s.r);
  o.beta = vb > 0 ? s.r.reduce((x, y, i) => x + (y - mr) * (s.b[i] - mb), 0) / (n - 1) / vb : null;
  const act = s.r.map((x, i) => x - s.b[i]), asd = sd(act); o.ir = asd > 0 ? mean(act) / asd * Math.sqrt(TD) : null;
  o.beat = s.r.filter((x, i) => x > s.b[i]).length / n; o.exposure = s.n_pos.filter(x => x > 0).length / n; o.turn = mean(s.turnover);
  return o;
}
function tradeStats(list) {
  const key = S.cost === 'gross' ? 'gross' : 'net', n = list.length, o = {n}; if (!n) return o;
  const r = list.map(t => t[key]), w = r.filter(x => x > 0), l = r.filter(x => x <= 0);
  o.hit = w.length / n; o.avgwin = w.length ? mean(w) : null; o.avgloss = l.length ? mean(l) : null;
  const sl = l.reduce((a, b) => a + b, 0); o.pf = l.length && sl !== 0 ? w.reduce((a, b) => a + b, 0) / Math.abs(sl) : null;
  const bb = list.filter(t => t.bench && t.bench.primary != null); o.nb = bb.length; o.hitb = bb.length ? bb.filter(t => t[key] > t.bench.primary).length / bb.length : null;
  o.hold = mean(list.map(t => t.hold_sessions || 0)); return o;
}
function filteredTrades(D, lo, hi) {
  const t = D.trades.variants && D.trades.variants[S.variant]; if (!t) return {closed: [], open: []};
  const f = x => S.bucket === 'all' || bucketOf(x.conviction) === S.bucket;
  return {closed: t.closed.filter(x => x.exit_session >= lo && x.exit_session <= hi && f(x)), open: t.open.filter(x => x.entry_session >= lo && x.entry_session <= hi && f(x))};
}
function earlyText(nclosed, ndays) {
  const ok = nclosed >= MIN_TR && ndays >= MIN_DAYS;
  return ok ? '' : `<span class="chip warn">Too early to judge: ${nclosed} of ${MIN_TR} trades closed, ${ndays} of ${MIN_DAYS} trading days</span>`;
}
const nmBadge = earlyText;
function tile(l, v, b, nm, c) { return `<div class="tile ${nm ? 'nm' : ''}"><div class="l">${l}</div><div class="v ${nm ? '' : (c || '')}">${v}</div><div class="b">${b || ''}</div></div>`; }
function advTiles(k, ts, bn, nm) {
  if (!k.n_days) return '<div class="empty">Nothing to show yet.</div>';
  const n = `${k.n_days} days`;
  return '<div class="tiles">' + [
    tile(tip('CAGR', 'cagr'), k.cagr == null ? 'after 1 year' : spct(k.cagr), n, nm || k.cagr == null),
    tile('Ups and downs (yearly)', pct(k.vol), n, nm), tile('Biggest fall from a peak', pct(k.maxdd), `now ${pct(k.curdd)}`, nm, 'neg'),
    tile(tip('Sharpe', 'sharpe'), num(k.sharpe), n, nm), tile(tip('Sortino', 'sortino'), num(k.sortino), n, nm), tile(tip('Beta', 'beta'), num(k.beta), n, nm),
    tile(tip('Information ratio', 'ir'), num(k.ir), n, nm), tile('Days ahead of market', pct(k.beat, 0), n, nm),
    tile('Best / worst day', `${spct(k.best)} / ${spct(k.worst)}`, n, nm), tile('Time invested · trading per day', `${pct(k.exposure, 0)} · ${pct(k.turn, 0)}`, n, nm),
    tile('Winning trades', ts.n ? pct(ts.hit, 0) : '–', `${ts.n ? pct(ts.hitb, 0) : '–'} beat market · ${ts.n || 0} trades`, nm || !ts.n),
    tile('Average win / loss', ts.n ? `${spct(ts.avgwin)} / ${spct(ts.avgloss)}` : '–', `${ts.n || 0} trades`, nm || !ts.n),
    tile(tip('Profit factor', 'profit factor'), ts.n ? num(ts.pf) : '–', ts.n ? `avg hold ${num(ts.hold, 1)} sessions` : '', nm || !ts.n)
  ].join('') + '</div>';
}

/* ---- charts ---- */
const charts = [];
const clearCharts = () => { while (charts.length) { try { charts.pop().destroy(); } catch (e) {} } };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function drawMarks(u, xs, marks) {
  const c = u.ctx, dpr = devicePixelRatio; c.save(); c.font = (12 * dpr) + 'px system-ui';
  marks.forEach(m => { const x = u.valToPos(xs[m.i], 'x', true), y = u.valToPos(m.y, 'y', true); if (!isFinite(x) || !isFinite(y)) return; c.fillStyle = m.color || css('--buy'); c.strokeStyle = css('--card'); c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6 * devicePixelRatio, 0, 7); c.fill(); c.stroke(); c.fillStyle = css('--fg'); c.fillText(m.label, Math.min(x + 8 * dpr, u.bbox.left + u.bbox.width - 90 * dpr), y - 8 * dpr); });
  c.restore();
}
function lineChart(el, dates, series, opts) {
  opts = opts || {};
  if (!el) return false;
  if (!dates || dates.length < 2) { el.innerHTML = `<div class="empty">${dates && dates.length === 1 ? 'Only one data point so far — a chart needs at least two days.' : 'Nothing to draw yet.'}</div>`; return false; }
  el.innerHTML = '';
  const xs = dates.map(d => Date.parse(d + 'T00:00:00Z') / 1000);
  const cols = opts.colors || [css('--acc'), css('--mkt'), css('--avoid'), css('--hold')];
  const w = Math.max(280, el.clientWidth || 300), h = opts.h || (w < 480 ? 230 : 300);
  const sig = opts.signal ? Date.parse(opts.signal + 'T00:00:00Z') / 1000 : null;
  const u = new uPlot({width: w, height: h, scales: {x: {time: true}}, legend: {show: true},
    series: [{}].concat(series.map((s, i) => ({label: s.label, stroke: s.color || cols[i % cols.length], width: i === 0 ? 2.4 : 1.8, spanGaps: false, dash: s.dash, fill: opts.fill && i === 0 ? (s.color || cols[0]) + '22' : undefined,
      value: (u, v) => v == null ? '–' : (opts.pct ? (v * 100).toFixed(2) + '%' : v.toFixed(2))}))),
    axes: [{stroke: css('--mut'), grid: {stroke: css('--bd')}, ticks: {stroke: css('--bd')}}, {stroke: css('--mut'), grid: {stroke: css('--bd')}, ticks: {stroke: css('--bd')}, size: 56, values: (u, t) => t.map(v => opts.pct ? (v * 100).toFixed(0) + '%' : v.toFixed(v < 20 ? 1 : 0))}],
    hooks: (sig || opts.marks) ? {draw: [u => { if (opts.marks) drawMarks(u, xs, opts.marks); if (!sig) return; const x = u.valToPos(sig, 'x', true); if (x < u.bbox.left || x > u.bbox.left + u.bbox.width) return; const c = u.ctx; c.save(); c.strokeStyle = css('--acc2'); c.setLineDash([6, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(x, u.bbox.top); c.lineTo(x, u.bbox.top + u.bbox.height); c.stroke(); c.fillStyle = css('--acc2'); c.font = '12px system-ui'; c.fillText('signal date', Math.max(u.bbox.left + 4, x - 66), u.bbox.top + 14); c.restore(); }]} : {}},
    [xs].concat(series.map(s => s.y)), el);
  charts.push(u); return true;
}
/* horizontal diverging bars. rows: [{label,value,color,n}] */
function bars(el, rows, opts) {
  opts = opts || {};
  const vals = rows.map(r => r.value).filter(v => v != null && isFinite(v));
  if (!vals.length) { el.innerHTML = '<div class="empty">Not enough data yet.</div>'; return; }
  const mx = Math.max(...vals.map(Math.abs), 0.001), hasNeg = vals.some(v => v < 0);
  const zero = hasNeg ? 50 : 0;
  el.innerHTML = '<div class="bars">' + rows.map(r => {
    if (r.value == null) return `<div class="br"><span class="lb">${r.label}</span><span class="tr"></span><span class="vl mut">${r.note || 'n/a'}</span></div>`;
    const w = Math.abs(r.value) / mx * (hasNeg ? 50 : 100), left = r.value < 0 ? zero - w : zero;
    return `<div class="br"><span class="lb">${r.label}</span><span class="tr"><span class="bar" style="left:${left}%;width:${Math.max(w, .8)}%;background:${r.color}"></span>${hasNeg ? '<span class="zero" style="left:50%"></span>' : ''}</span><span class="vl ${opts.plain ? '' : cls(r.value)}">${opts.fmt ? opts.fmt(r.value) : spct(r.value)}</span></div>`;
  }).join('') + '</div>';
}
function monthly(el, s) {
  if (!s || !s.dates.length) { el.innerHTML = '<div class="empty">No data yet.</div>'; return; }
  const agg = r => { const m = {}; s.dates.forEach((d, i) => { const k = d.slice(0, 7); m[k] = (m[k] || 1) * (1 + r[i]); }); return m; };
  const A = agg(s.r), B = agg(s.b), keys = Object.keys(A).sort(), years = [...new Set(keys.map(k => k.slice(0, 4)))];
  const col = v => v == null ? '' : `background:${v >= 0 ? 'rgba(15,157,88,' : 'rgba(217,48,37,'}${Math.min(.75, Math.abs(v) * 6 + .08)})`;
  let h = '<div class="tw"><table class="hm"><tr><th>Year</th><th></th>' + ['J','F','M','A','M','J','J','A','S','O','N','D'].map(x => `<th>${x}</th>`).join('') + '</tr>';
  for (const y of years) for (const [nm, M] of [['Model', A], ['Market', B]]) {
    h += `<tr><td>${y}</td><td class="l mut">${nm}</td>`;
    for (let mo = 1; mo <= 12; mo++) { const k = y + '-' + String(mo).padStart(2, '0'), v = M[k] != null ? M[k] - 1 : null; h += `<td style="${col(v)}">${v == null ? '' : (v * 100).toFixed(1)}</td>`; }
    h += '</tr>';
  }
  el.innerHTML = h + '</table></div><p class="mut small">Monthly return in %. A partial month shows only the days so far.</p>';
}

/* ---- sortable, searchable table (generic; used by trades/day pages) ---- */
function dataTable(el, cols, rows, name) {
  let sortK = null, asc = true, q = '';
  const draw = () => {
    let r = rows.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q));
    if (sortK != null) r = r.slice().sort((a, b) => { const x = a[sortK], y = b[sortK]; return ((x == null) - (y == null)) || (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
    el.innerHTML = `<div class="row" style="margin:.3rem 0"><input type="search" class="search" placeholder="Search…" value="${esc(q)}" id="q_${name}"><button id="csv_${name}">Download CSV</button><span class="mut small">${r.length} of ${rows.length} rows</span></div>` +
      (rows.length ? `<div class="tw"><table><thead><tr>${cols.map(c => `<th data-k="${c.k}" class="${c.l ? 'l' : ''}">${c.t}${sortK === c.k ? (asc ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>` +
      r.map(x => '<tr>' + cols.map(c => `<td class="${c.l ? 'l' : ''} ${c.pn ? cls(x[c.k]) : ''}">${c.f ? c.f(x[c.k], x) : esc(x[c.k] == null ? '' : x[c.k])}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>' : '<div class="empty">None yet.</div>');
    $$('th', el).forEach(th => th.onclick = () => { const k = th.dataset.k; if (sortK === k) asc = !asc; else { sortK = k; asc = true; } draw(); });
    const qi = $('#q_' + name, el); qi.oninput = () => { q = qi.value.toLowerCase(); draw(); const n = $('#q_' + name, el); n.focus(); n.setSelectionRange(q.length, q.length); };
    $('#csv_' + name, el).onclick = () => { const lines = [cols.map(c => c.t).join(',')].concat(rows.map(x => cols.map(c => { const v = x[c.k]; return v == null ? '' : '"' + String(v).replace(/"/g, '""') + '"'; }).join(','))); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], {type: 'text/csv'})); a.download = name + '.csv'; a.click(); };
  };
  draw();
}

const fileOf = t => String(t).replace(/&/g, '-and-').replace(/[^A-Za-z0-9._-]/g, '_');
window.FV = {fileOf, LONG_NOTICE, plainWhy, CODES, BKEYS, S, save, J, $, $$, esc, pct, spct, num, cls, pts, bucketOf, layout, controls, filterBar, range, eta, istText, dateText, loadMarket, variantOf, seriesA, seriesB, slice, kpis, tradeStats,
  filteredTrades, earlyText, nmBadge, advTiles, tile, lineChart, bars, monthly, dataTable, navSeries, ddSeries, cumr, clearCharts, charts, BUCKETS, MKT, VIEWS, GROUPS, VERD, tip, GLOSS, PN, css};
})();
