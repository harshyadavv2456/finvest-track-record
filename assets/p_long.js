(async function () {
const F = FV; F.layout();
const IDX = await F.J('data/index.json'); window.__IDX = IDX;
async function draw() { F.clearCharts(); await FVL.mount(F.$('#lout')); }
window.__redraw = draw;
F.controls(F.$('#filters'), {compare: true, noPeriod: true, cost: true, variant: true});
draw();
})();
