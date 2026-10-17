(async function () {
const F = FV; F.layout(); const IDX = await F.J('data/index.json'); window.__IDX = IDX;
async function draw() {
  const D = await F.loadMarket(F.S.market), dl = (D.days.variants || {})[F.S.variant] || [];
  const sel = F.$('#daysel'), dates = dl.map(x => x.asof), mk = F.MKT[F.S.market];
  if (!dates.length) { const S_ = await F.J(`data/${F.S.market}_stocks.json`); F.$('#dayout').innerHTML = `<div class="empty">No signal day is unlocked yet. The ${F.dateText(S_.signal_date)} day unlocks ${F.istText(S_.buy_unlock_ist)} (${F.eta(S_.buy_unlock_ist)}).</div>`; sel.innerHTML = ''; F.$('#dayhead').innerHTML = ''; return; }
  if (!F.S.day || !dates.includes(F.S.day)) F.S.day = dates[dates.length - 1];
  sel.innerHTML = '<label class="mut">Signal day: </label><select id="dsel">' + dates.slice().reverse().map(x => `<option ${x === F.S.day ? 'selected' : ''} value="${x}">${F.dateText(x)}</option>`).join('') + '</select>';
  F.$('#dsel').onchange = e => { F.S.day = e.target.value; F.save(); draw(); };
  const d = dl.find(x => x.asof === F.S.day), cost = F.S.cost === 'gross' ? 0 : IDX.cost_round_trip[F.S.market], bnm = IDX.bench_names[F.S.market][F.S.cmp];
  const rows = d.rows.filter(x => x.entry != null && (F.S.bucket === 'all' || F.bucketOf(x.conviction) === F.S.bucket)).map(x => ({ticker: x.ticker, conviction: x.conviction, regime: x.asset_regime, entry: x.entry, exit: x.exit, ret: x.ret != null ? x.ret - cost : null, todate: x.ret_to_date}));
  const rr = rows.filter(x => x.ret != null), avg = rr.length ? rr.reduce((a, x) => a + x.ret, 0) / rr.length : null, b = (d.bench_1s || {})[F.S.cmp];
  F.$('#dayhead').innerHTML = `<p class="longnote">${F.LONG_NOTICE}</p><div class="card">Signal day <b>${F.dateText(d.asof)}</b> · priced on <b>${F.dateText(d.entry_session)}</b> (${d.entry_kind === 'open' ? 'market open' : 'market close'}) · ${d.exit_session ? 'one-day result on ' + F.dateText(d.exit_session) : 'one-day result pending'}.` + (d.status === 'complete' ? ` Equal-weight result: <b class="${F.cls(avg)}">${F.spct(avg)}</b> vs ${F.esc(bnm)} <b>${F.spct(b)}</b> (${rr.length} stocks).` : '') + '</div>';
  F.dataTable(F.$('#dayout'), [{k: 'ticker', t: 'Stock', l: 1}, {k: 'conviction', t: 'Conviction', f: v => F.pct(v, 0)}, {k: 'regime', t: 'Mood', l: 1}, {k: 'entry', t: 'Entry ' + mk.cur, f: v => F.num(v)}, {k: 'exit', t: 'Next close/open ' + mk.cur, f: v => F.num(v)}, {k: 'ret', t: '1-day result', f: v => F.spct(v), pn: 1}, {k: 'todate', t: 'Move to date', f: v => F.spct(v), pn: 1}], rows, 'day_' + F.S.market + '_' + d.asof);
  // names of this signal day that never got an entry price, and earlier unlocked days the tracker did not follow (full detail: Long positions page)
  try {
    const L = await FVL.load(F.S.market), V = (L.variants || {})[F.S.variant] || (L.variants || {}).tradeable || {positions: []};
    const ne = V.positions.filter(p => p.signal_date === d.asof && p.status === 'not_entered').map(p => p.ticker.replace('.NS', ''));
    const ref = V.positions.filter(p => p.signal_date === d.asof && !p.tracked).length;
    const others = [...new Set(V.positions.filter(p => !p.tracked).map(p => p.signal_date))].filter(x => !dates.includes(x));
    F.$('#dayout').insertAdjacentHTML('beforeend', `<p class="small mut">${ne.length ? 'Long on this day but not entered (no usable price on the entry session): <b>' + ne.join(', ') + '</b>. ' : ''}${others.length ? 'Earlier unlocked signal day' + (others.length > 1 ? 's' : '') + ' ' + others.map(F.dateText).join(', ') + ' share an entry session with a newer day and are shown for reference on ' : 'All unlocked long names, with their charts and reasoning, are on '}<a href="long.html">Long positions</a>.</p>`);
  } catch (e) {}
}
window.__redraw = draw; F.controls(F.$('#filters'), {compare: true, noPeriod: true, cost: true, variant: true, bucket: true}); draw();
})();
