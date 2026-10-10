(async function () {
const F = FV; F.layout();
const IDX = await F.J('data/index.json'); window.__IDX = IDX;
const {esc, spct, pct, cls} = F;
async function draw() {
  F.clearCharts();
  const m = F.S.market, mk = F.MKT[m], bn = IDX.bench_names[m][F.S.cmp];
  const [S_, D] = await Promise.all([F.J(`data/${m}_stocks.json`), F.loadMarket(m)]);
  F.$('#status').innerHTML = `<span class="badge b-${IDX.status || 'NONE'}" title="OK = today’s data is in. STALE = waiting for FinVest’s fresh data. PENDING = not available yet, will retry.">${IDX.status || 'NONE'}</span> <span class="mut small">Data as of <b id="asof">${IDX.state_as_of || '–'}</b> · last updated <b id="lastupd">${(IDX.state_last_updated || '–').replace('T', ' ').slice(0, 16)}</b> IST</span>`;
  if (S_.empty) { F.$('#verdict').textContent = 'No data yet — the first daily update has not run.'; return; }
  const g = S_.groups, n = S_.n_total, c = S_.counts, buyN = (c.INITIATE || 0) + (c.ADD || 0);
  const v = F.variantOf(D), ser = v ? F.seriesA(D) : null;
  const sl = ser && ser.dates.length >= 2 ? F.slice(ser, ...F.range(ser.dates[ser.dates.length - 1])) : null;
  const tr = F.filteredTrades(D, '0000', '9999'), nClosed = tr.closed.length, nDays = ser ? ser.dates.length : 0;
  let verdict, k = [], caption, ok = false;
  if (sl && sl.r.length >= 2) {
    const kp = F.kpis(sl), ahead = kp.excess >= 0;
    verdict = `Since tracking began, the model’s ${mk.name} long-signal portfolio is ${kp.cum >= 0 ? 'up' : 'down'} ${pct(Math.abs(kp.cum))}, ${ahead ? 'ahead of' : 'behind'} ${bn} (${spct(kp.bench_cum)}) by ${(Math.abs(kp.excess) * 100).toFixed(1)} points — but it is too early to judge (${nClosed} of 30 trades closed, ${nDays} of 60 trading days).`;
    k = [['Model portfolio', spct(kp.cum), `since ${F.dateText(sl.dates[0])}`, cls(kp.cum)], [bn, spct(kp.bench_cum), 'same period', cls(kp.bench_cum)], ['Ahead / behind market', (kp.excess >= 0 ? '+' : '−') + Math.abs(kp.excess * 100).toFixed(1) + ' pts', 'model minus market', cls(kp.excess)], ['Biggest fall from a peak', pct(kp.maxdd), `${sl.r.length} trading days`, 'neg']];
    caption = `Both lines start at 100. The model line is ${spct(kp.cum)}; ${esc(bn)} is ${spct(kp.bench_cum)}. ${F.S.cost === 'net' ? 'After' : 'Before'} trading costs. A short history can swing a lot — read it as a progress report, not a verdict.`;
    ok = true;
  } else {
    const dd = g.avoid || {}, bb = (S_.bench[F.S.cmp] || {});
    const avoidShare = (c.AVOID || 0) / n;
    verdict = `Today the model rates ${pct(avoidShare, 0)} of ${mk.name} stocks as Avoid, ${c.HOLD || 0} as Hold and ${buyN} as long signals. Results start counting after ${F.istText(S_.first_results_ist)} — there is nothing to judge yet.`;
    k = [['Stocks scored', n.toLocaleString(), `${mk.name} · signal date ${F.dateText(S_.signal_date)}`, ''], ['Rated Avoid', pct(avoidShare, 0), `${c.AVOID || 0} stocks`, 'neg'],
         ['Long signals', String(buyN), g.buy && g.buy.locked ? `names shown after ${F.istText(S_.buy_unlock_ist)}` : 'see Stocks page', ''], ['First results', F.eta(S_.first_results_ist), F.istText(S_.first_results_ist), '']];
    caption = `Average price move over the last 3 months for each group of stocks, next to ${esc(bn)}. This is background from before the signal — not a result. Real results fill in as trading days pass.`;
  }
  F.$('#verdict').textContent = verdict;
  F.$('#kpis').innerHTML = k.map(([l, val, s, c_]) => `<div class="kpi"><div class="l">${l}</div><div class="v ${c_}">${val}</div><div class="s">${s}</div></div>`).join('');
  F.$('#caption').textContent = caption.replace(/<[^>]+>/g, '');
  if (ok) {
    const nav = F.navSeries(sl.r), series = [{label: 'Model portfolio', y: nav}, {label: bn, y: F.navSeries(sl.b)}];
    F.$('#charttitle').textContent = 'Model portfolio vs the market (start = 100)';
    if (!F.lineChart(F.$('#chart'), sl.dates, series, {})) {}
  } else {
    F.$('#charttitle').textContent = 'What stocks did over the last 3 months, by model view';
    const C = {buy: F.css('--buy'), hold: F.css('--hold'), avoid: F.css('--avoid'), exit: F.css('--exit')}, nm = {buy: 'Long signals', hold: 'Hold', avoid: 'Avoid', exit: 'Reduce / Exit'};
    const rows = ['hold', 'avoid', 'exit', 'buy'].filter(x => g[x] && g[x].n).map(x => g[x].locked ? {label: nm[x], value: null, note: 'locked'} : {label: nm[x], value: g[x].avg_m3, color: C[x]});
    rows.push({label: bn, value: (S_.bench[F.S.cmp] || {}).m3, color: F.css('--mkt')});
    F.bars(F.$('#chart'), rows);
  }
  if (F.$('#longcard')) FVL.homeCard(F.$('#longcard'));
  const iss = IDX.issues || {};
  F.$('#issues').innerHTML = `Data checks: ${iss.n_open_flags || 0} stocks without Yahoo prices (flagged, never filled), ${iss.n_events_7d || 0} warnings in 7 days — <a href="health.html">details</a>.`;
}
window.__redraw = draw;
F.controls(F.$('#filters'), {compare: true, noPeriod: true});
draw();
})();
