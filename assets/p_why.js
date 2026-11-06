(async function () {
const F = FV; F.layout();
const IDX = await F.J('data/index.json'); window.__IDX = IDX;
const {esc, spct, pct, pts, cls} = F;
let D = null, filt = 'all', sortK = 'ver', asc = true, shown = 100, q = '';
const bk = () => D.bench[F.S.cmp] || {};
const vsb = (r, k) => (r.m[k] == null || bk()[k] == null) ? null : r.m[k] - bk()[k];
const V = r => r.vd && r.vd[F.S.cmp];
async function draw() {
  D = await F.J(`data/${F.S.market}_stocks.json`);
  if (D.empty) { F.$('#app').innerHTML = '<div class="empty">No data yet.</div>'; return; }
  F.clearCharts();
  const av = D.rows.filter(r => r.v === 'AVOID'), bn = IDX.bench_names[F.S.market], names = Object.keys(bn);
  F.$('#hdr').innerHTML = `<span class="badge b-${IDX.status || 'NONE'}">${IDX.status || 'NONE'}</span> <span class="mut">${av.length} Avoid-rated ${F.MKT[F.S.market].name} stocks · signal date <b>${F.dateText(D.signal_date)}</b> · prices to <b>${F.dateText(D.price_end)}</b></span>`;
  // summary chart: avoid average vs all three benchmarks
  const g = D.groups.avoid || {}, rows = [];
  for (const k of ['m1', 'm3']) {
    rows.push({label: `Avoid names · ${k === 'm1' ? '1 month' : '3 months'}`, value: g['avg_' + k], color: F.css('--avoid')});
    names.forEach((key, i) => rows.push({label: `${bn[key]} · ${k === 'm1' ? '1M' : '3M'}`, value: (D.bench[key] || {})[k], color: F.css('--mkt')}));
  }
  F.bars(F.$('#b_av'), rows);
  const cnt = {beat: 0, inline: 0, fell: 0, lagged: 0, none: 0};
  av.forEach(r => { const v = V(r); cnt[v || 'none']++; });
  const t = av.length - cnt.none;
  F.$('#sum').innerHTML = t ? `<div class="grid2"><div><div class="big">${pct((cnt.fell + cnt.lagged) / t, 0)}</div><div>of Avoid names <b>fell more than / lagged</b> ${esc(bn[F.S.cmp])} (3-month look-back).</div></div>
    <div><div class="big">${pct(cnt.inline / t, 0)}</div><div>moved <b>in line</b> (within 2 points).</div></div>
    <div><div class="big" style="color:var(--pos)">${pct(cnt.beat / t, 0)}</div><div><b>beat</b> the market anyway — cases where the model’s caution has not (yet) shown up in the price.</div></div></div><p class="small mut">Based on ${t} Avoid-rated stocks with enough price history (${cnt.none} without). “Fell more than the market” means the stock’s move was at least 2 points below the index; “Lagged” means it still rose but at least 2 points less.</p>` : '<div class="empty">Not enough price history.</div>';
  const chips = [['all', 'All', av.length], ['bad', 'Fell more than / lagged market', cnt.fell + cnt.lagged], ['inline', 'In line', cnt.inline], ['beat', 'Beat the market', cnt.beat]];
  F.$('#chips').innerHTML = chips.map(([k, l, n]) => `<button class="tab ${filt === k ? 'on' : ''}" data-f="${k}">${l}<em>${n}</em></button>`).join('');
  F.$$('#chips .tab').forEach(b => b.onclick = () => { filt = b.dataset.f; shown = 100; draw2(av); F.$$('#chips .tab').forEach(x => x.classList.toggle('on', x === b)); });
  draw2(av);
}
function draw2(av) {
  let r = av.filter(x => { const v = V(x); return filt === 'all' ? true : filt === 'bad' ? (v === 'fell' || v === 'lagged') : v === filt; });
  if (q) r = r.filter(x => (x.t + ' ' + (x.n || '') + ' ' + (x.why || '')).toLowerCase().includes(q));
  const val = x => sortK === 'ver' ? vsb(x, x.vk) : sortK === 'c' ? x.c : sortK === 't' ? x.t : x.m[sortK];
  r = r.slice().sort((a, b) => { const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
  const hs = [['t', 'Stock', 'l'], ['c', 'Conviction'], ['m1', '1 month'], ['m3', '3 months'], ['sn', 'Since signal'], ['ver', 'Verdict', 'l']];
  const cell = (x, k) => { const v = x.m[k], d = vsb(x, k); return v == null ? '<td class="mut">–</td>' : `<td><span class="${cls(v)}">${spct(v)}</span><span class="sub ${cls(d)}">vs mkt ${pts(d)}</span></td>`; };
  const body = r.slice(0, shown).map(x => { const v = V(x); return `<tr><td class="l stk"><b>${esc(x.t.replace('.NS', ''))}</b><span class="nm">${esc(x.n || '')}</span></td><td>${pct(x.c, 0)}</td>${cell(x, 'm1')}${cell(x, 'm3')}${x.m.sn != null ? cell(x, 'sn') : '<td class="mut small">pending</td>'}<td class="l">${v ? `<span class="pill ${F.VERD[v][1]}">${F.VERD[v][0]}</span>` : '–'}</td><td class="l why" style="max-width:34rem">${F.plainWhy(x.why || '')}<span class="sub">Mood: ${esc(x.ar || '–')} · market: ${esc(x.mr || '–')}</span></td></tr>`; }).join('');
  F.$('#tbl').innerHTML = `<div class="small mut" style="margin:.3rem 0">${r.length} stocks · click a column to sort</div><div class="tw"><table><thead><tr>${hs.map(([k, t, l]) => `<th data-k="${k}" class="${l || ''}">${t}${sortK === k ? (asc ? ' ▲' : ' ▼') : ''}</th>`).join('')}<th class="l">Why the model says Avoid</th></tr></thead><tbody>${body || '<tr><td colspan="7" class="l mut">None.</td></tr>'}</tbody></table></div>` + (r.length > shown ? `<p style="text-align:center"><button id="more">Show more (${r.length - shown} left)</button></p>` : '');
  F.$$('#tbl th[data-k]').forEach(t => t.onclick = () => { const k = t.dataset.k; if (sortK === k) asc = !asc; else { sortK = k; asc = k === 't' || k === 'ver'; } draw2(av); });
  const mo = F.$('#more'); if (mo) mo.onclick = () => { shown += 100; draw2(av); };
}
window.__redraw = () => { shown = 100; F.controls(F.$('#filters'), {compare: true, noPeriod: true}); draw(); };
F.controls(F.$('#filters'), {compare: true, noPeriod: true});
F.$('#search').oninput = e => { q = e.target.value.toLowerCase(); if (D) draw2(D.rows.filter(r => r.v === 'AVOID')); };
draw();
})();
