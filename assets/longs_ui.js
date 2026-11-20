/* Long positions: shared by long.html (full), stocks.html "Long positions" tab (full) and the Home card (compact). */
window.FVL = (function () {
const F = FV, {esc, spct, pct, cls, pts} = F;
const BK = ['primary', 'secondary', 'tertiary'];
const cache = {};
async function load(m) { return cache[m] || (cache[m] = await F.J(`data/${m}_longs.json`)); }
const VNAME = {tradeable: 'Tradeable entry', signalopen: 'Signal-day open (theoretical)'};
const retOf = (p) => F.S.cost === 'gross' ? p.ret_gross : p.ret_net;
const exOf = (p, k) => (F.S.cost === 'gross' ? p.excess_gross : p.excess_net)[k];
const STAT = {open: ['Open', 'pos'], closed: ['Closed', ''], not_entered: ['Not entered', 'mut'], untracked: ['Reference only', 'mut']};
const RP = {below_p10: 'below the model’s bad case', below_p50: 'between bad case and typical', above_p50: 'between typical and good case', above_p90: 'above the model’s good case'};
function rangeBar(p) {
  const r = p.range || {}; if (r.p10 == null || r.p90 == null || p.ret_gross == null) return '';
  const lo = Math.min(r.p10, p.ret_gross, 0), hi = Math.max(r.p90, p.ret_gross, 0), w = (hi - lo) || 1, x = v => ((v - lo) / w * 100).toFixed(1);
  return `<div class="rngbar" title="Model range p10 / p50 / p90 and the actual return so far"><span class="rng" style="left:${x(r.p10)}%;width:${(x(r.p90) - x(r.p10)).toFixed(1)}%"></span><span class="tick" style="left:${x(r.p50)}%"></span><span class="zero" style="left:${x(0)}%"></span><span class="now ${cls(p.ret_gross)}" style="left:${x(p.ret_gross)}%"></span></div>
  <div class="small mut">Model’s ~1-month range ${spct(r.p10)} / <b>${spct(r.p50)}</b> / ${spct(r.p90)}; actual so far <b class="${cls(p.ret_gross)}">${spct(p.ret_gross)}</b> after ${p.days_held == null ? '–' : p.days_held} of ~${r.sessions} sessions — ${RP[p.range_position] || '–'}. Too soon to compare fairly.</div>`;
}
function posChart(el, p) {
  const s = p.series; if (!s) { el.innerHTML = '<div class="empty">No price series for this name.</div>'; return null; }
  const k = F.S.cmp, bn = (window.__L.bench_names || {})[k];
  const ys = s.stock.map(v => v == null || !s.entry_price ? null : v / s.entry_price - 1), yb = (s.bench[k] || []).map(v => v == null || !s.bench_entry[k] ? null : v / s.bench_entry[k] - 1);
  const marks = s.entry_index != null ? [{i: s.entry_index, y: 0, label: 'entry (' + (p.entry_kind === 'open' ? 'open' : 'close') + ')'}] : [];
  const n0 = F.charts.length;
  F.lineChart(el, s.dates, [{label: p.ticker.replace('.NS', ''), y: ys}, {label: bn, y: yb, dash: [5, 4]}], {pct: true, signal: p.signal_date, marks, h: 230});
  return F.charts.length > n0 ? F.charts[F.charts.length - 1] : null;
}
function detail(p, k) {
  const mk = F.MKT[F.S.market], bn = window.__L.bench_names;
  const cmpTbl = BK.map(x => `<tr><td class="l">${esc(bn[x])}</td><td class="${cls(p.bench_ret[x])}">${spct(p.bench_ret[x])}</td><td class="${cls(p.excess_gross[x])}">${pts(p.excess_gross[x])}</td><td class="${cls(p.excess_net[x])}">${pts(p.excess_net[x])}</td></tr>`).join('');
  return `<tr class="dt"><td colspan="11"><div class="dtgrid"><div>
    <h3 style="margin-top:0">${esc(p.name || p.ticker)} <span class="pill v-${p.intent}">Long signal</span></h3>
    <p class="longnote">${F.LONG_NOTICE}</p>
    <p>${p.rationale ? F.plainWhy(p.rationale) : 'No rationale stored for this signal day.'}</p>
    ${p.rationale ? `<details class="small"><summary class="mut">The model’s exact words</summary><p>${esc(p.rationale)}</p></details>` : ''}
    <div class="small mut">Signal day ${F.dateText(p.signal_date)} (observed ${F.istText(p.observed_ist)}) · conviction ${pct(p.conviction, 1)} · mood <b>${esc(p.asset_regime || '–')}</b> (market: ${esc(p.market_regime || '–')}) · model’s worst-5% average loss ${spct(p.range.cvar_95)}${p.flags.length ? ' · flags: ' + esc(p.flags.join(', ')) : ''}</div>
    ${p.note ? `<div class="note" style="margin:.5rem 0">${esc(p.note)}</div>` : ''}
    <h4 style="margin:.8rem 0 .3rem">Expected range vs what happened</h4>${rangeBar(p) || '<div class="mut small">Not available yet.</div>'}
    <table class="mini"><thead><tr><th class="l">Since entry vs</th><th>Index</th><th>Excess (gross)</th><th>Excess (net)</th></tr></thead><tbody>${cmpTbl}</tbody></table>
    <div class="small" style="margin-top:.5rem">Data: <a href="api/v1/tracker/${F.S.market}/long_positions.json">long_positions.json</a> · <a href="api/v1/tracker/${F.S.market}/long_positions.csv">CSV</a></div>
  </div><div><div id="lchart" class="chart sm"></div><div class="small mut">Return since entry, stock vs ${esc(bn[F.S.cmp])}, from 5 sessions before the signal (dotted line = signal date, dot = entry). Real adjusted closes; gaps are never filled.</div></div></div></td></tr>`;
}
function eqChart(el, V) {
  const e = V.equity_daily_returns;
  if (!e || !e.dates.length) { el.innerHTML = '<div class="empty">No priced day yet.</div>'; return; }
  const cum = a => { let n = 100; return [100].concat(a.map(x => (n *= 1 + (x || 0)))); };
  const key = F.S.cost === 'gross' ? 'gross' : 'net', bn = window.__L.bench_names;
  const d0 = (() => { const t = new Date(e.dates[0] + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); })();
  const dates = [d0].concat(e.dates);
  const series = [{label: 'Long book (' + (key === 'net' ? 'after' : 'before') + ' costs)', y: cum(e[key])}].concat(BK.map(k => ({label: bn[k], y: cum(e.bench[k]), dash: k === 'primary' ? undefined : [5, 4]})));
  F.lineChart(el, dates, series, {h: 240});
}
function render(el, L, opts) {
  opts = opts || {};
  window.__L = L;
  const m = F.S.market, mk = F.MKT[m], v = F.S.variant in L.variants ? F.S.variant : 'tradeable', V = L.variants[v], S = V.summary, k = F.S.cmp, bn = L.bench_names[k];
  const pos = V.positions.slice().sort((a, b) => (b.signal_date.localeCompare(a.signal_date)) || ((b.tracked ? 1 : 0) - (a.tracked ? 1 : 0)) || ((b.conviction || 0) - (a.conviction || 0)));
  const ent = pos.filter(p => p.tracked && p.ret_gross != null);
  const lock = (L.locked || []).map(x => `<div class="card lockcard"><div class="big">${x.n_long_signals}</div><div><b>more model long signals</b> for the ${F.dateText(x.signal_date)} signal day.</div><p class="lead" style="margin:.5rem auto">Names appear after the entry price is locked: <b>${F.istText(x.unlock_ist)}</b> (${F.eta(x.unlock_ist)}). Until then only this count is public.</p></div>`).join('');
  const avgEx = S.avg_excess_net[k], avgExG = S.avg_excess_gross[k], aex = F.S.cost === 'gross' ? avgExG : avgEx;
  const tiles = [
    F.tile('Long names shown', String(pos.length), `${S.n_entered} entered · ${S.n_open} open · ${S.n_closed} closed${S.n_not_entered ? ' · ' + S.n_not_entered + ' not entered' : ''}${S.n_reference_only ? ' · ' + S.n_reference_only + ' reference only' : ''}`),
    F.tile('Average return since entry', ent.length ? spct(F.S.cost === 'gross' ? S.avg_ret_gross : S.avg_ret_net) : '–', `${F.S.cost === 'gross' ? 'before' : 'after'} costs · ${ent.length} names`, false, cls(F.S.cost === 'gross' ? S.avg_ret_gross : S.avg_ret_net)),
    F.tile('Average vs ' + esc(bn), aex == null ? '–' : pts(aex), 'position minus index, same dates', false, cls(aex)),
    F.tile('Beat ' + esc(bn), S.beat_rate_net[k] == null ? '–' : pct(S.beat_rate_net[k], 0), `of ${ent.length} names (after costs)`),
    F.tile('Positive after costs', S.hit_rate_net == null ? '–' : pct(S.hit_rate_net, 0), 'hit rate', false),
    F.tile('Average days held', S.avg_days_held == null ? '–' : F.num(S.avg_days_held, 1), 'trading sessions')].join('');
  const head = `<p class="longnote strong">${F.LONG_NOTICE}</p>
    <div class="note"><b>${esc(mk.name)} · ${VNAME[v]}.</b> ${v === 'tradeable' ? (m === 'IN' ? 'India names are entered at the close of the first session that is still ahead when the signal is observed — the first price anyone could actually trade.' : 'US names are entered at the next market open after the signal is observed.') : 'Theoretical: entry at the open of the session after the signal date. Shown for comparison only.'}
      Returns run to the last finished session (<b>${F.dateText(L.last_priced_session)}</b>) and are compared with each index over exactly the same dates. Round-trip cost assumed: ${pct(L.cost_round_trip, 2)}.</div>
    <div class="row"><span class="chip warn">${esc(S.early)}</span></div>
    <div class="tiles">${tiles}</div>${lock}`;
  if (!pos.length) { el.innerHTML = head + `<div class="empty">No long signal day is unlocked yet.</div>`; return; }
  const body = pos.map(p => {
    const [st, sc] = STAT[p.status] || [p.status, ''];
    const open = window.__openL === p.signal_date + p.ticker + v;
    const ex = p.ret_gross == null ? null : exOf(p, k);
    let h = `<tr class="rw ${p.tracked ? '' : 'refrow'}" data-id="${esc(p.signal_date + p.ticker + v)}"><td class="l stk"><b>${esc(p.ticker.replace('.NS', ''))}</b><span class="nm">${esc(p.name || '')}${p.sector ? ' · ' + esc(p.sector) : ''}</span></td>
      <td class="l small">${F.dateText(p.signal_date)}</td>
      <td class="small">${p.entry_price == null ? '<span class="mut">no price</span>' : `${mk.cur}${F.num(p.entry_price)}<span class="sub">${F.dateText(p.entry_session)} ${p.entry_kind === 'open' ? 'open' : 'close'}</span>`}</td>
      <td class="small">${p.last_price == null ? '–' : `${mk.cur}${F.num(p.last_price)}<span class="sub">${F.dateText(p.last_price_date)}</span>`}</td>
      <td>${p.ret_gross == null ? '–' : `<span class="${cls(retOf(p))}"><b>${spct(retOf(p))}</b></span><span class="sub">${F.S.cost === 'gross' ? 'net ' + spct(p.ret_net) : 'gross ' + spct(p.ret_gross)}</span>`}</td>
      ${BK.map(x => `<td class="small ${x === k ? 'cmpcol' : ''}">${p.bench_ret[x] == null ? '–' : spct(p.bench_ret[x])}</td>`).join('')}
      <td>${ex == null ? '–' : `<span class="${cls(ex)}"><b>${pts(ex)}</b></span>`}</td>
      <td>${p.days_held == null ? '–' : p.days_held}</td>
      <td class="l"><span class="pill ${sc === 'pos' ? 'd-beat' : ''}">${st}</span>${p.exit_reason ? `<span class="sub">${esc(p.exit_reason.toLowerCase())}</span>` : ''}</td>
      <td>${pct(p.conviction, 0)}</td></tr>`;
    if (open) h += detail(p, k);
    return h;
  }).join('');
  const bh = BK.map(x => `<th class="${x === k ? 'cmpcol' : ''}" title="Index return over the same dates">${esc(L.bench_names[x])}</th>`).join('');
  const bars = ent.slice().sort((a, b) => (exOf(b, k) ?? -9) - (exOf(a, k) ?? -9));
  el.innerHTML = head + `
    <div class="grid2"><div class="card"><h3 style="margin-top:0">Each position vs ${esc(bn)}</h3><div id="lb_ex"></div><p class="small mut">Position return minus ${esc(bn)} over the same dates (${F.S.cost === 'gross' ? 'before' : 'after'} costs). Green = ahead of the index.</p></div>
    <div class="card"><h3 style="margin-top:0">Return since entry, by name</h3><div id="lb_ret"></div></div></div>
    <div class="card"><h3 style="margin-top:0">Long book vs the three indices (start = 100)</h3><div id="lb_eq" class="chart sm"></div><p class="small mut">Equal-weight long book of all tracked names, rebalanced at each signal day (tracker “Book A”). ${esc(S.early)}</p></div>
    <h3>Every unlocked long name</h3><div class="small mut" style="margin:.3rem 0">Click a row for the reasoning, the model’s range vs reality and a price chart.</div>
    <div class="tw"><table><thead><tr><th class="l">Stock</th><th class="l">Signal day</th><th>Entry</th><th>Last close</th><th>Return since entry</th>${bh}<th>vs ${esc(bn)}</th><th>Days held</th><th class="l">Status</th><th>Conviction</th></tr></thead><tbody>${body}</tbody></table></div>`;
  F.bars(F.$('#lb_ex'), bars.map(p => ({label: esc(p.ticker.replace('.NS', '')), value: exOf(p, k), color: (exOf(p, k) || 0) >= 0 ? F.css('--pos') : F.css('--neg')})), {fmt: v_ => pts(v_)});
  F.bars(F.$('#lb_ret'), bars.map(p => ({label: esc(p.ticker.replace('.NS', '')), value: retOf(p), color: F.css('--buy')})).concat([{label: esc(bn), value: ent.length ? (ent.map(p => p.bench_ret[k]).filter(x => x != null).reduce((a, b, _, r) => a + b / r.length, 0)) : null, color: F.css('--mkt')}]));
  eqChart(F.$('#lb_eq'), V);
  F.$$('tr.rw', el).forEach(r => r.onclick = () => { window.__openL = window.__openL === r.dataset.id ? null : r.dataset.id; F.clearCharts(); render(el, L, opts); });
  if (window.__openL) { const p = pos.find(q => q.signal_date + q.ticker + v === window.__openL); const c = F.$('#lchart'); if (p && c) posChart(c, p); }
}
async function mount(el, opts) { window.__openL = null; const L = await load(F.S.market); if (!L || L.empty || !L.available) { el.innerHTML = '<div class="empty">No data yet.</div>'; return; } F.clearCharts(); render(el, L, opts); }
async function homeCard(el) {
  const L = await load(F.S.market), m = F.S.market, mk = F.MKT[m], v = F.S.variant in (L.variants || {}) ? F.S.variant : 'tradeable', k = F.S.cmp;
  if (!L.available) { el.innerHTML = ''; return; }
  const V = L.variants[v], S = V.summary, pos = V.positions.filter(p => p.tracked), ent = pos.filter(p => p.ret_gross != null), bn = L.bench_names[k];
  const lock = (L.locked || []).map(x => `${x.n_long_signals} more for ${F.dateText(x.signal_date)} (names ${F.istText(x.unlock_ist)})`).join(' · ');
  const aex = F.S.cost === 'gross' ? S.avg_excess_gross[k] : S.avg_excess_net[k];
  const items = ent.slice().sort((a, b) => (retOf(b) ?? -9) - (retOf(a) ?? -9)).slice(0, 8).map(p => `<li><b>${esc(p.ticker.replace('.NS', ''))}</b> <span class="mut small">${esc(p.name || '')}</span> <span class="${cls(retOf(p))}">${spct(retOf(p))}</span> <span class="mut small">vs ${esc(bn)} ${spct(p.bench_ret[k])}</span></li>`).join('');
  el.innerHTML = `<div class="card lgcard"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Long positions · ${esc(mk.name)}</h2><a class="dlbtn" href="long.html">See all long positions →</a></div>
    <p class="longnote">${F.LONG_NOTICE}</p>
    <p style="margin:.3rem 0">${ent.length ? `<b>${ent.length}</b> unlocked long names entered; on average <b class="${cls(F.S.cost === 'gross' ? S.avg_ret_gross : S.avg_ret_net)}">${spct(F.S.cost === 'gross' ? S.avg_ret_gross : S.avg_ret_net)}</b> since entry (${F.S.cost === 'gross' ? 'before' : 'after'} costs), <b class="${cls(aex)}">${pts(aex)}</b> vs ${esc(bn)}.` : 'No unlocked long name has an entry price yet.'} <span class="mut small">${esc(S.early)}</span></p>
    ${items ? `<ul class="lglist">${items}</ul>` : ''}
    ${lock ? `<p class="small mut" style="margin-bottom:0">🔒 Still locked: ${lock}.</p>` : ''}</div>`;
}
return {mount, homeCard, load};
})();
