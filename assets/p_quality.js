(async function () {
const F = FV; F.layout(); const IDX = await F.J('data/index.json'); window.__IDX = IDX;
const HZ = ['1', '5', '21', '63'], HN = {1: '1 day', 5: '1 week', 21: '1 month', 63: '3 months'};
function agg(events, h, pick) { let n = 0, sum = 0, pos = 0, beat = 0, bsum = 0, evs = 0; const bk = F.S.cmp;
  for (const e of events) { const hr = e.h && e.h[h]; if (!hr) continue; const g = pick(hr); if (!g || !g.n) continue; n += g.n; sum += g.sum; pos += g.pos; beat += g['beat_' + bk] || 0; bsum += g.n * ((hr.bench || {})[bk] || 0); evs++; }
  return {n, evs, avg: n ? sum / n : null, pos: n ? pos / n : null, beat: n ? beat / n : null, bavg: n ? bsum / n : null}; }
async function draw() {
  F.clearCharts();
  const D = await F.loadMarket(F.S.market), ev = (D.quality.variants || {})[F.S.variant] || [], bn = IDX.bench_names[F.S.market][F.S.cmp], out = F.$('#qout'), S_ = await F.J(`data/${F.S.market}_stocks.json`);
  const mat = h => ev.filter(e => e.h && e.h[h]).length;
  if (!ev.length) { out.innerHTML = `<div class="card lockcard"><h2 style="margin:0">Waiting for the first results</h2><p class="lead" style="margin:.5rem auto">This page tests whether the model’s ideas actually led to better-than-market outcomes. It needs signal days whose prices are locked, plus time for prices to move. First data: ${F.istText(S_.first_results_ist)} (${F.eta(S_.first_results_ist)}); a meaningful 1-month test needs about 21 trading days.</p></div>`; return; }
  let html = `<div class="card">Signal days counted: <b>${ev.length}</b>. Matured so far: ${HZ.map(h => HN[h] + ': ' + mat(h) + ' day(s)').join(' · ')}. Small samples are anecdotes — each row shows how many stocks (n) it is based on.</div>`;
  const row = (l, a) => `<tr><td class="l">${l}</td><td>${a.n || 0}</td><td class="${F.cls(a.avg)}">${F.spct(a.avg)}</td><td>${F.spct(a.bavg)}</td><td class="${F.cls(a.n ? a.avg - a.bavg : null)}">${a.n ? F.spct(a.avg - a.bavg) : '–'}</td><td>${F.pct(a.pos, 0)}</td><td>${F.pct(a.beat, 0)}</td></tr>`;
  const head = `<tr><th class="l">Group</th><th>n</th><th>Avg move</th><th>${F.esc(bn)}</th><th>Difference</th><th>% that rose</th><th>% beat market</th></tr>`;
  html += `<h2>Did long signals beat the market — and Avoid names lag it?</h2><div class="tw"><table>${head}` + HZ.map(h => row(HN[h] + ' · long signals', agg(ev, h, x => x.g.buy)) + row(HN[h] + ' · Avoid', agg(ev, h, x => x.g.avoid)) + row(HN[h] + ' · Hold', agg(ev, h, x => x.g.hold))).join('') + '</table></div>';
  html += `<h2>Does higher conviction mean better results?</h2><div class="tw"><table>${head}` + ['5', '21'].map(h => F.BUCKETS.slice(1).map(([k, t]) => row(HN[h] + ' · conviction ' + t, agg(ev, h, x => x.bk_all[k]))).join('')).join('') + '</table></div>';
  const regs = new Set(); ev.forEach(e => Object.values(e.h || {}).forEach(hr => Object.keys(hr.reg_buy || {}).forEach(r => regs.add(r))));
  html += `<h2>By model “mood” (regime)</h2><div class="tw"><table>${head}` + ['5', '21'].map(h => [...regs].sort().map(r => row(HN[h] + ' · ' + r, agg(ev, h, x => x.reg_buy[r]))).join('')).join('') + '</table></div>';
  let c = {n: 0, b10: 0, a90: 0, band: 0, a50: 0, sp: 0, sr: 0};
  for (const e of ev) { const hr = e.h && e.h['21']; if (!hr || !hr.calib) continue; const k = hr.calib.all; c.n += k.n; c.b10 += k.below_p10; c.a90 += k.above_p90; c.band += k.in_band; c.a50 += k.above_p50; c.sp += k.sum_pred_p50 || 0; c.sr += k.sum_ret || 0; }
  html += '<h2>Is the model’s own forecast range honest?</h2>' + (c.n ? `<div class="tw"><table><tr><th class="l">Check</th><th>Actual</th><th>Should be</th><th>n</th></tr><tr><td class="l">Landed inside the 10th–90th range</td><td>${F.pct(c.band / c.n)}</td><td>~80%</td><td>${c.n}</td></tr><tr><td class="l">Below the bad-case (10th)</td><td>${F.pct(c.b10 / c.n)}</td><td>~10%</td><td>${c.n}</td></tr><tr><td class="l">Above the good-case (90th)</td><td>${F.pct(c.a90 / c.n)}</td><td>~10%</td><td>${c.n}</td></tr><tr><td class="l">Above its typical (median) guess</td><td>${F.pct(c.a50 / c.n)}</td><td>~50%</td><td>${c.n}</td></tr></table></div>` : '<div class="empty">No signal day has a completed 1-month window yet.</div>');
  out.innerHTML = html;
}
window.__redraw = draw; F.controls(F.$('#filters'), {compare: true, noPeriod: true, variant: true}); draw();
})();
