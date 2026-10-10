(async function () {
const F = FV; F.layout(); const L = await F.J('data/weekly/index.json'), sel = F.$('#wsel');
function render() {
  const mk = F.S.market, items = L.filter(x => x.market === mk);
  if (!items.length) { F.$('#wout').innerHTML = '<div class="empty">No weekly recap yet for this market. Recaps are generated on Sundays.</div>'; sel.innerHTML = ''; return; }
  const cur = items.find(x => x.week_end === F.S.week) || items[items.length - 1];
  sel.innerHTML = '<label class="mut">Week ending </label><select id="ws">' + items.slice().reverse().map(x => `<option ${x.week_end === cur.week_end ? 'selected' : ''}>${x.week_end}</option>`).join('') + '</select>';
  F.$('#ws').onchange = e => { F.S.week = e.target.value; render(); };
  F.J('data/weekly/' + cur.file).then(w => { F.$('#wout').innerHTML = `<h2>${w.market_name} — week ${w.week_start} → ${w.week_end} <span class="chip">generated ${w.generated_at_ist.replace('T', ' ').slice(0, 16)} IST</span></h2>` + w.sections.map(s => `<div class="card"><h3 style="margin-top:0">${s.title}</h3>${s.html}</div>`).join(''); });
}
window.__redraw = render; F.controls(F.$('#filters'), {noPeriod: true}); render();
})();
