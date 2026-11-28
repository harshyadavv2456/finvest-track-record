(function () {
const F = FV; F.layout();
const pv = F.$('#preview'), pb = F.$('#pvb'), pt = F.$('#pvt');
document.addEventListener('click', async ev => {
  const b = ev.target.closest('.tryb'); if (!b) return;
  if (b.id === 'pvx') { pv.style.display = 'none'; return; }
  const u = b.dataset.u; pv.style.display = 'block'; pt.textContent = u; pb.textContent = 'Loading…'; pv.scrollIntoView({block: 'nearest'});
  try { const r = await fetch(u, {cache: 'no-cache'}); const t = await r.text(); pb.textContent = t.length > 3500 ? t.slice(0, 3500) + '\n… (' + t.length.toLocaleString() + ' bytes in total)' : t; }
  catch (e) { pb.textContent = 'Could not load: ' + e; }
});
document.addEventListener('click', ev => {
  const a = ev.target.closest('.dlall'); if (!a || !a.dataset.parts) return;
  const ps = a.dataset.parts.split(',').filter(Boolean); if (ps.length < 2) return;
  ev.preventDefault();
  ps.forEach((u, i) => setTimeout(() => { const l = document.createElement('a'); l.href = u; l.download = u.split('/').pop(); document.body.appendChild(l); l.click(); l.remove(); }, i * 900));
});
const base = F.$('#base'); if (base && location.protocol.startsWith('http') && !/^(localhost|127\.)/.test(location.hostname)) { /* keep canonical URL */ }
})();
