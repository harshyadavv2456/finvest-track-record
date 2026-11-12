(async function () {
const F = FV; F.layout();
const IDX = await F.J('data/index.json'); window.__IDX = IDX;
const {esc, spct, pct, pts, cls} = F;
let D = null, SER = null, LG = null, openT = null, detailChart = null, tab = 'buy', sortK = 'c', asc = false, q = '', shown = 100, sectorSel = '';
const GN = {buy: 'Long signals', hold: 'Hold', avoid: 'Avoid', exit: 'Reduce / Exit'};
const GC = () => ({buy: F.css('--buy'), hold: F.css('--hold'), avoid: F.css('--avoid'), exit: F.css('--exit')});
const grp = r => F.GROUPS[r.v] || 'hold';
// the first-class tab is 'Long positions' (data/{M}_longs.json); the older 'Long signals' rows of the latest day stay hidden until their entry is locked
const bk = () => (D.bench[F.S.cmp] || {});
function vsb(r, k) { const b = bk()[k]; return r.m[k] == null || b == null ? null : r.m[k] - b; }
function sortVal(r) {
  switch (sortK) {
    case 't': return r.t; case 'v': return r.v; case 'c': return r.c; case 'p50': return r.p[1]; case 'ar': return r.ar || '';
    case 'ver': return vsb(r, r.vk); default: return r.m[sortK];
  }
}
async function load() {
  const m = F.S.market;
  [D, SER, LG] = await Promise.all([F.J(`data/${m}_stocks.json`), F.J(`data/${m}_series.json`), FVL.load(m)]);
}
function head() {
  const mk = F.MKT[F.S.market], bn = IDX.bench_names[F.S.market][F.S.cmp];
  const g = D.groups || {};
  const buyN = (D.counts.INITIATE || 0) + (D.counts.ADD || 0);
  const resultsIn = F.eta(D.first_results_ist);
  const sn = D.bench && D.bench.primary && D.bench.primary.sn != null;
  F.$('#ctx').innerHTML = `<div class="note"><b>How to read the price moves.</b> Moves up to the signal date (<b>${F.dateText(D.signal_date)}</b>) are <b>context from before or at the signal</b> — they are not results. The “Since signal” column fills in as trading days pass.
    ${sn ? 'Since-signal results are now available for names with prices after the signal date.' : `<b>First since-signal results: ${F.istText(D.first_results_ist)} (${resultsIn}).</b>`}
    Prices are real Yahoo Finance closes, adjusted for splits and dividends, up to ${F.dateText(D.price_end)}. “vs market” compares with <b>${esc(bn)}</b>.</div>`;
}
function summary() {
  F.clearCharts();
  const g = D.groups, C = GC(), bn = IDX.bench_names[F.S.market][F.S.cmp];
  const order = ['buy', 'hold', 'avoid', 'exit'].filter(k => g[k] && (g[k].n > 0));
  const blk = (k) => {
    const rows = order.map(o => (g[o].locked ? {label: GN[o], value: null, note: 'locked'} : {label: GN[o], value: g[o]['avg_' + k], color: C[o]}));
    rows.push({label: bn, value: (D.bench[F.S.cmp] || {})[k], color: F.css('--mkt')});
    return rows;
  };
  F.bars(F.$('#b_m1'), blk('m1')); F.bars(F.$('#b_m3'), blk('m3'));
  F.bars(F.$('#b_cnt'), order.map(o => ({label: GN[o], value: g[o].n, color: C[o]})), {fmt: v => v, plain: true});
  // conviction distribution (stacked)
  const names = ['hold', 'avoid', 'exit', 'buy'], tot = [];
  for (let b = 0; b < 10; b++) tot.push(names.reduce((a, n) => a + ((g[n] && !g[n].locked && g[n].hist) ? g[n].hist[b] : 0), 0));
  const mx = Math.max(...tot, 1);
  F.$('#b_hist').innerHTML = '<div class="hist">' + tot.map((t, b) => `<div title="${b * 10}–${b * 10 + 10}%: ${t} stocks">` + names.map(n => { const v = (g[n] && !g[n].locked && g[n].hist) ? g[n].hist[b] : 0; return v ? `<span style="height:${v / mx * 100}px;background:${C[n]}"></span>` : ''; }).join('') + `<small>${b * 10}</small></div>`).join('') + '</div><div class="small mut" style="margin-top:.3rem">Conviction % → number of stocks. ' + names.filter(n => g[n] && g[n].n && !g[n].locked).map(n => `<span style="color:${C[n]}">■</span> ${GN[n]}`).join(' &nbsp; ') + '</div>';
  // avoid share
  const a = g.avoid || {}, key = F.S.cmp;
  const lag = a[`lag_${key}_m3`], w2 = a[`worse2_${key}_m3`], fell = a.fell_m3;
  F.$('#b_share').innerHTML = a.n_m3 ? `<div class="big">${pct(lag, 0)}</div><div>of Avoid-rated stocks did <b>worse than ${esc(bn)}</b> over the last 3 months (${pct(w2, 0)} by more than 2 points; ${pct(fell, 0)} actually fell in price). Based on ${a.n_m3} stocks.</div><div class="small mut">This is a trailing look-back from before the signal. It shows what the model was reacting to — not whether it will be right next.</div>` : '<div class="empty">Not enough price history yet.</div>';
}
function tabs() {
  const g = D.groups, buyN = (D.counts.INITIATE || 0) + (D.counts.ADD || 0), exN = (D.counts.REDUCE || 0) + (D.counts.EXIT || 0);
  const nLong = LG && LG.variants && LG.variants.tradeable ? LG.variants.tradeable.positions.filter(p => p.tracked).length : 0;
  const t = [['buy', 'Long positions', nLong], ['avoid', 'Avoid', D.counts.AVOID], ['hold', 'Hold', D.counts.HOLD]];
  if (exN) t.push(['exit', 'Reduce / Exit', exN]);
  t.push(['all', 'All', D.n_total - (g.buy && g.buy.locked ? buyN : 0)]);
  if (!t.find(x => x[0] === tab)) tab = 'buy';
  F.$('#tabs').innerHTML = t.map(([k, l, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-t="${k}">${l}<em>${n}</em></button>`).join('');
  F.$$('#tabs .tab').forEach(b => b.onclick = () => { tab = b.dataset.t; shown = 100; openT = null; render(); });
}
function rowsNow() {
  let r = D.rows.filter(x => tab === 'all' ? true : grp(x) === tab);
  if (q) r = r.filter(x => (x.t + ' ' + (x.n || '') + ' ' + (x.s || '') + ' ' + (x.why || '')).toLowerCase().includes(q));
  if (sectorSel) r = r.filter(x => x.s === sectorSel);
  const dir = asc ? 1 : -1;
  r = r.slice().sort((a, b) => { const x = sortVal(a), y = sortVal(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  return r;
}
const HEADS = [['t', 'Stock', 'l', 'Ticker and company name'], ['v', 'Model view', 'l', 'The model’s latest view: Long signal, Hold, Avoid, Reduce or Exit'], ['c', 'Conviction', '', F.GLOSS.conviction],
  ['ar', 'Mood (regime)', 'l', F.GLOSS.regime], ['p50', 'Expected range', '', 'Model’s own ~1-month range: bad case / typical / good case (p10 / p50 / p90)'],
  ['d1', '1 day', '', 'Latest 1-session move and how it compares with the market'], ['w1', '1 week', '', 'Last 5 sessions'], ['m1', '1 month', '', 'Last 21 sessions'], ['m3', '3 months', '', 'Last 63 sessions'],
  ['sn', 'Since signal', '', F.GLOSS['since signal']], ['ver', 'Verdict', 'l', 'Plain-English comparison with the market over 3 months (or 1 month if shorter)']];
const cell = (r, k) => { const v = r.m[k], d = vsb(r, k); return v == null ? '<td class="mut">–</td>' : `<td><span class="${cls(v)}">${spct(v)}</span><span class="sub ${cls(d)}">vs mkt ${pts(d)}</span></td>`; };
function snCell(r) {
  if (r.m.sn != null) return cell(r, 'sn');
  return `<td class="mut small" title="Fills in once a trading day has closed after the signal date">pending</td>`;
}
function verdictPill(r) { const v = r.vd && r.vd[F.S.cmp]; if (!v) return '<span class="mut">–</span>'; const [t, c] = F.VERD[v]; return `<span class="pill ${c}">${t}</span>`; }
function table() {
  const rs = rowsNow(), vis = rs.slice(0, shown), g = D.groups;
  const buyN = (D.counts.INITIATE || 0) + (D.counts.ADD || 0);
  let pre = '';
  const LN = `<p class="longnote">${F.LONG_NOTICE}</p>`;
  if (tab === 'buy') { FVL.mount(F.$('#tbl')); return; }
  if (tab === 'all' && g.buy && !g.buy.locked && buyN) pre = LN;
  if (tab === 'all' && g.buy && g.buy.locked && buyN) pre = LN + `<div class="note" style="margin-bottom:.6rem">${buyN} long-signal names are hidden until their entry price is locked (${F.istText(D.buy_unlock_ist)}).</div>`;
  const th = HEADS.map(([k, t, l, tt]) => `<th data-k="${k}" class="${l}" title="${esc(tt)}">${t}${sortK === k ? (asc ? ' ▲' : ' ▼') : ''}</th>`).join('') + '<th class="l">Why (model’s words)</th>';
  const body = vis.map(r => {
    const open = openT === r.t, gr = grp(r), rp = r.p;
    let h = `<tr class="rw" data-t="${esc(r.t)}"><td class="l stk"><b>${esc(r.t.replace('.NS', ''))}</b><span class="nm">${esc(r.n || '')}${r.s ? ' · ' + esc(r.s) : ''}</span>${r.f.length ? '<span class="chip warn" title="' + esc(r.f.join(', ')) + '">data flag</span>' : ''}</td>` +
      `<td class="l"><span class="pill v-${r.v}">${F.VIEWS[r.v]}</span><span class="sub">${r.v}</span></td><td>${pct(r.c, 0)}</td><td class="l small">${esc(r.ar || '–')}<span class="sub">market: ${esc(r.mr || '–')}</span></td>` +
      `<td class="small">${spct(rp[0], 0)} / <b>${spct(rp[1], 0)}</b> / ${spct(rp[2], 0)}</td>` + cell(r, 'd1') + cell(r, 'w1') + cell(r, 'm1') + cell(r, 'm3') + snCell(r) + `<td class="l">${verdictPill(r)}</td><td class="l why">${esc((r.why || '').slice(0, 110))}${(r.why || '').length > 110 ? '…' : ''}</td></tr>`;
    if (open) h += `<tr class="dt"><td colspan="${HEADS.length + 1}"><div class="dtgrid"><div><h3 style="margin-top:0">${esc(r.n || r.t)} <span class="pill v-${r.v}">${F.VIEWS[r.v]}</span></h3><p>${r.why ? F.plainWhy(r.why) : 'No rationale stored.'}</p><details class="small"><summary class="mut">The model’s exact words</summary><p class="mut">${esc(r.why || '')}</p></details>` +
      `<div class="small mut">Conviction ${pct(r.c, 1)} · mood ${esc(r.ar || '–')} (market: ${esc(r.mr || '–')}) · model’s 1-month range ${spct(rp[0])} / ${spct(rp[1])} / ${spct(rp[2])} · worst-5% average loss ${spct(r.cv)} · last price in model ${r.lp != null ? esc(r.lp) : '–'} (dated ${esc(r.pd || '–')})</div>` +
      `<div class="small" style="margin-top:.5rem">Data: <a href="api/v1/ticker/${F.S.market}/${encodeURIComponent(F.fileOf(r.t))}.json">ticker file</a> · <a href="api/v1/prices/${F.S.market}/${encodeURIComponent(F.fileOf(r.t))}.csv" class="yh">price history (CSV)</a></div>` + (grp(r) === 'buy' ? `<p class="longnote">${F.LONG_NOTICE}</p>` : '') + `<div class="small" style="margin-top:.5rem">${r.vd && r.vd[F.S.cmp] ? 'Over ' + (r.vk === 'm3' ? '3 months' : '1 month') + ': <span class="pill ' + F.VERD[r.vd[F.S.cmp]][1] + '">' + F.VERD[r.vd[F.S.cmp]][0] + '</span>' : 'No price verdict (not enough price history).'}</div></div><div><div id="dchart" class="chart sm"></div><div class="small mut">Last 6 months, both lines start at 100. Dashed line = signal date.</div></div></div></td></tr>`;
    return h;
  }).join('');
  F.$('#tbl').innerHTML = pre + `<div class="small mut" style="margin:.3rem 0">${rs.length} stock${rs.length === 1 ? '' : 's'}${q ? ' match' : ''} · click a row for the chart and full reasoning · click a column to sort</div>` +
    `<div class="tw"><table><thead><tr>${th}</tr></thead><tbody>${body || '<tr><td colspan="12" class="l mut">No stocks match.</td></tr>'}</tbody></table></div>` + (rs.length > shown ? `<p style="text-align:center"><button id="more">Show ${Math.min(100, rs.length - shown)} more (of ${rs.length - shown} left)</button></p>` : '');
  F.$$('#tbl th[data-k]').forEach(t => t.onclick = () => { const k = t.dataset.k; if (sortK === k) asc = !asc; else { sortK = k; asc = (k === 't' || k === 'v' || k === 'ar'); } render(true); });
  F.$$('#tbl tr.rw').forEach(t => t.onclick = () => { openT = openT === t.dataset.t ? null : t.dataset.t; table(); drawDetail(); });
  const mo = F.$('#more'); if (mo) mo.onclick = () => { shown += 100; table(); drawDetail(); };
}
function drawDetail() {
  if (detailChart) { try { detailChart.destroy(); } catch (e) {} detailChart = null; }
  if (!openT) return;
  const el = F.$('#dchart'); if (!el) return;
  const s = SER.s[openT], b = (SER.bench || {})[F.S.cmp];
  if (!s || !b) { el.innerHTML = '<div class="empty">No price history from Yahoo for this stock — nothing to chart (we never fill gaps).</div>'; return; }
  const i0 = s.findIndex((v, i) => v != null && b[i] != null);
  if (i0 < 0) { el.innerHTML = '<div class="empty">Not enough overlapping price data.</div>'; return; }
  const dates = SER.dates.slice(i0), ys = s.slice(i0).map(v => v == null ? null : v / s[i0] * 100), yb = b.slice(i0).map(v => v == null ? null : v / b[i0] * 100);
  const n0 = F.charts.length;
  F.lineChart(el, dates, [{label: openT.replace('.NS', ''), y: ys}, {label: IDX.bench_names[F.S.market][F.S.cmp], y: yb, dash: [5, 4]}], {signal: SER.signal_date, h: 230});
  if (F.charts.length > n0) detailChart = F.charts.pop();
}
function render(keep) {
  if (!keep) { head(); summary(); tabs(); }
  F.clearCharts(); if (!keep) summary();
  tabs(); table(); drawDetail();
}
async function draw() {
  await load();
  if (D.empty) { F.$('#app').innerHTML = '<div class="empty">No data yet — run the daily update.</div>'; return; }
  const sec = F.$('#sector'); if (sec) sec.innerHTML = '<option value="">All sectors</option>' + (D.sectors || []).map(s => `<option ${s === sectorSel ? 'selected' : ''}>${esc(s)}</option>`).join('');
  F.$('#hdr').innerHTML = `<span class="badge b-${IDX.status || 'NONE'}">${IDX.status || 'NONE'}</span> <span class="mut">${D.n_total} ${F.MKT[F.S.market].name} stocks scored · signal date <b>${F.dateText(D.signal_date)}</b> · prices to <b>${F.dateText(D.price_end)}</b> · updated ${F.istText(D.generated_at_ist)}</span>`;
  head(); summary(); tabs(); table(); drawDetail();
}
window.__redraw = () => { openT = null; shown = 100; controls(); draw(); };
function controls() { F.controls(F.$('#filters'), {compare: true, noPeriod: true}); }
controls();
F.$('#search').oninput = e => { q = e.target.value.toLowerCase(); shown = 100; if (D) { table(); drawDetail(); } };
F.$('#sector').onchange = e => { sectorSel = e.target.value; shown = 100; if (D) { table(); drawDetail(); } };
draw();
})();
