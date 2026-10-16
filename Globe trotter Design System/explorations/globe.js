// Shared orthographic globe for direction previews (d3-geo + world-atlas).
window.renderGlobe = async function (el, o) {
  await new Promise(r => requestAnimationFrame(r));
  const visited = new Set([250, 380, 724, 620, 392, 504, 840, 124, 484, 604, 352, 300, 704, 764, 826, 276]);
  const wish = new Set([578, 32, 554, 404, 36, 360]);
  const pins = [[2.35, 48.86], [139.69, 35.68], [-9.14, 38.72], [-73.98, 40.75], [-71.97, -13.52]];
  let W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
  let R = Math.min(Math.max(W - 380, 240), H) * (o.scale || 0.42);
  let CX = W > 700 ? (W - 330) / 2 : W / 2;
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block').style('cursor', 'grab');
  const proj = d3.geoOrthographic().scale(R).translate([CX, H / 2]).rotate(o.rotate || [-10, -30]).clipAngle(90);
  const path = d3.geoPath(proj);
  const world = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')).json();
  const countries = topojson.feature(world, world.objects.countries).features;
  if (o.glow) svg.append('circle').attr('class', 'g').attr('cx', CX).attr('cy', H / 2).attr('r', R + 18).attr('fill', o.glow);
  const sphere = svg.append('path').datum({ type: 'Sphere' }).attr('fill', o.ocean).attr('stroke', o.rim || 'none').attr('stroke-width', 1);
  const grat = svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke', o.grat || 'none').attr('stroke-width', 0.5);
  const land = svg.append('g').selectAll('path').data(countries).join('path')
    .attr('fill', d => visited.has(+d.id) ? o.visited : wish.has(+d.id) ? o.wish : o.land)
    .attr('stroke', o.stroke).attr('stroke-width', 0.5);
  const pinG = svg.append('g');
  function draw() {
    sphere.attr('d', path); grat.attr('d', path); land.attr('d', path);
    svg.select('.g').attr('r', proj.scale() + 18);
    const c = proj.invert([CX, H / 2]);
    pinG.selectAll('circle').data(pins).join('circle')
      .attr('r', o.pinR || 3.5).attr('fill', o.pin).attr('stroke', o.pinStroke || 'none').attr('stroke-width', 1.5)
      .attr('cx', d => proj(d)[0]).attr('cy', d => proj(d)[1])
      .attr('display', d => d3.geoDistance(d, c) < Math.PI / 2 ? null : 'none');
  }
  draw();
  let auto = true;
  svg.call(d3.drag().on('start', () => { auto = false; svg.style('cursor', 'grabbing'); })
    .on('drag', e => { const r = proj.rotate(), k = 75 / proj.scale(); proj.rotate([r[0] + e.dx * k, Math.max(-80, Math.min(80, r[1] - e.dy * k))]); draw(); })
    .on('end', () => svg.style('cursor', 'grab')));
  svg.on('wheel', e => { e.preventDefault(); proj.scale(Math.max(R * 0.6, Math.min(R * 4, proj.scale() * (e.deltaY < 0 ? 1.08 : 0.93)))); draw(); });
  new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h || (w === W && h === H)) return; const k = proj.scale() / R; W = w; H = h; R = Math.min(Math.max(W - 380, 240), H) * (o.scale || 0.42); CX = W > 700 ? (W - 330) / 2 : W / 2; svg.attr('width', W).attr('height', H); svg.select('.g').attr('cx', CX).attr('cy', H / 2); proj.translate([CX, H / 2]).scale(R * k); draw(); }).observe(el);
  d3.timer(() => { if (auto) { const r = proj.rotate(); proj.rotate([r[0] + 0.08, r[1]]); draw(); } });
};
