(async function () {
const F = FV; F.layout();
const IDX = await F.J('data/index.json'); window.__IDX = IDX;
const {esc, spct, pct, cls} = F;
async function draw() {
  F.clearCharts();
  const m = F.S.market, mk = F.MKT[m], bnAll = IDX.bench_names[m], bn = bnAll[F.S.cmp];
  const [D, S_] = await Promise.all([F.loadMarket(m), F.J(`data/${m}_stocks.json`)]);
  const v = F.variantOf(D), full = v ? (F.S.book === 'B' ? F.seriesB(D) : F.seriesA(D)) : null;
  const wait = F.$('#wait'), body = F.$('#body');
  const meta = (D.core.variants && D.core.variants[F.S.variant] || {}).meta || {};
  if (!full || full.dates.length < 1) {
    body.style.display = 'none'; wait.style.display = '';
    wait.innerHTML = `<div class="card lockcard"><div class="big">${F.eta(S_.first_results_ist || S_.buy_unlock_ist)}</div><h2 style="margin:.4rem 0">Results are not ready yet — and that is by design</h2>
      <p class="lead" style="margin:.5rem auto">The model published its first set of signals for <b>${F.dateText(S_.signal_date || '')}</b>. To be fair, we only count a signal from the moment it could actually have been priced: the entry price for ${mk.name} is locked at <b>${F.istText(S_.buy_unlock_ist)}</b>. After that, every trading day adds one more day of real results here.</p>
      <p class="small mut">Until then we show no chart rather than an empty or made-up one. Meanwhile, see <a href="stocks.html">every stock the model scored</a> and how each has moved in the market.</p></div>
      <div class="card"><b>What will appear here</b><ul><li>A line chart: model portfolio vs ${esc(bnAll.primary)}, ${esc(bnAll.secondary)} and ${esc(bnAll.tertiary)}</li><li>How far it fell from its peak, month-by-month returns, every trade</li><li>A clear “too early to judge” label until 30 trades have closed and 60 trading days have passed</li></ul></div>`;
    return;
  }
  wait.style.display = 'none'; body.style.display = '';
  const [lo, hi] = F.range(full.dates[full.dates.length - 1]); const s = F.slice(full, lo, hi);
  const ft = F.filteredTrades(D, lo, hi), ts = F.tradeStats(ft.closed), k = F.kpis(s);
  const early = !(ts.n >= 30 && s.r.length >= 60);
  F.$('#early').innerHTML = F.earlyText(ts.n || 0, s.r.length) + ` <span class="chip">${F.S.book === 'B' ? 'Daily-list portfolio (B)' : 'Signal portfolio (A)'} · ${F.S.cost === 'net' ? 'after costs' : 'before costs'} · ${F.S.variant === 'tradeable' ? 'tradeable prices' : 'signal-day open (theoretical — not tradeable for India)'}</span>`;
  const cards = [['Model portfolio', spct(k.cum), `${k.n_days} trading day${k.n_days > 1 ? 's' : ''}`, cls(k.cum)], [bn, spct(k.bench_cum), 'same days', cls(k.bench_cum)], ['Ahead / behind', (k.excess >= 0 ? '+' : '−') + Math.abs(k.excess * 100).toFixed(1) + ' pts', 'model minus market', cls(k.excess)], ['Trades', `${ft.open.length} open · ${ts.n || 0} closed`, ts.n ? `${pct(ts.hit, 0)} gained money` : 'none closed yet', '']];
  F.$('#kpis').innerHTML = cards.map(([l, val, sub, c_]) => `<div class="kpi"><div class="l">${l}</div><div class="v ${c_}" style="${val.length > 12 ? 'font-size:1.4rem' : ''}">${val}</div><div class="s">${sub}</div></div>`).join('');
  F.$('#cap1').textContent = `Everything starts at 100. The model is at ${F.num(F.navSeries(s.r).slice(-1)[0], 1)}; ${bn} is at ${F.num(F.navSeries(s.b).slice(-1)[0], 1)}. The other two indices are shown for comparison.`;
  const series = [{label: 'Model portfolio', y: F.navSeries(s.r)}];
  F.BKEYS.forEach((key, i) => series.push({label: bnAll[key], y: F.navSeries(s.bm[key]), dash: key === F.S.cmp ? undefined : [5, 4], color: key === F.S.cmp ? F.css('--mkt') : [F.css('--hold'), F.css('--avoid'), F.css('--acc2')][i]}));
  if (s.dates.length < 2) {
    // one priced day only: a line needs two points, so show the honest single-day comparison as bars + say what will appear
    const rows1 = [{label: 'Model portfolio', value: F.cumr(s.r), color: F.css('--acc')}].concat(F.BKEYS.map((key, i) => ({label: bnAll[key], value: F.cumr(s.bm[key]), color: key === F.S.cmp ? F.css('--mkt') : [F.css('--hold'), F.css('--avoid'), F.css('--acc2')][i]})));
    F.$('#c_eq').innerHTML = '<div id="c_eq_b"></div><p class="small mut" style="margin:.5rem 0 0">Only <b>' + s.dates.length + ' priced trading day</b> so far (' + F.dateText(s.dates[0]) + '), so a line chart is not possible yet — this is the one-day move of the model portfolio next to the three indices. The line chart starts automatically on the second priced day.</p>';
    F.bars(F.$('#c_eq_b'), rows1.map(r => ({...r, valueText: spct(r.value)})), {pct: true});
    F.$('#c_dd').innerHTML = '<div class="empty">“Fall from peak” needs at least two priced days. With one day, the portfolio’s only move is the one shown above (' + spct(F.cumr(s.r)) + ').</div>';
  } else {
    F.lineChart(F.$('#c_eq'), s.dates, series, {});
    F.lineChart(F.$('#c_dd'), s.dates, [{label: 'Model: fall from peak', y: F.ddSeries(s.r), color: F.css('--avoid')}, {label: bn, y: F.ddSeries(s.b)}], {pct: true, fill: true, h: 200});
  }
  F.monthly(F.$('#heat'), s);
  F.$('#adv').innerHTML = (early ? '<p class="note">These numbers swing wildly on short histories. Treat them as placeholders until the sample is big enough.</p>' : '') + F.advTiles(k, ts, bn, early) + `<p class="small mut">Sample: ${s.r.length} trading days, ${ts.n || 0} closed trades. Hover the underlined terms for a one-line explanation.</p>`;
  const key = F.S.cost === 'gross' ? 'gross' : 'net';
  F.dataTable(F.$('#tradeopen'), [{k: 'ticker', t: 'Stock', l: 1}, {k: 'entry_session', t: 'Entered', l: 1}, {k: 'conviction', t: 'Conviction', f: x => F.pct(x, 0)}, {k: 'entry_price', t: 'Entry ' + mk.cur, f: x => F.num(x)}, {k: 'mark_price', t: 'Latest ' + mk.cur, f: x => F.num(x)}, {k: 'ret_to_date', t: 'Move', f: x => spct(x), pn: 1}, {k: 'bench', t: 'vs ' + bn, f: x => spct(x)}], ft.open.map(x => ({...x, bench: (x.bench_to_date || {})[F.S.cmp]})), 'open_' + m);
  F.dataTable(F.$('#tradeclosed'), [{k: 'ticker', t: 'Stock', l: 1}, {k: 'entry_session', t: 'Entered', l: 1}, {k: 'exit_session', t: 'Left', l: 1}, {k: 'exit_reason', t: 'Why it left', l: 1}, {k: key, t: 'Result', f: x => spct(x), pn: 1}, {k: 'b', t: 'Market same days', f: x => spct(x)}], ft.closed.map(x => ({...x, b: (x.bench || {})[F.S.cmp]})), 'closed_' + m);
}
window.__redraw = draw;
F.controls(F.$('#filters'), {compare: true, book: true, cost: true, variant: true, bucket: true, dates: true});
draw();
})();
