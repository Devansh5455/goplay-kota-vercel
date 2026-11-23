/* Go Play · 3D pickleball (Blender, 36 spin frames) + hard-ball bounce engine. Designed by peaknpixel */
(function () {
  const N = 36, COLS = 6;
  function frame(el, ang) { const f = ((Math.round(ang / (2 * Math.PI) * N) % N) + N) % N; el.style.backgroundPosition = `${(f % COLS) * 20}% ${Math.floor(f / COLS) * 20}%`; }
  // pts: [{x, y, h, pop}] — y is the floor (screen y grows down); h = apex height of the arc that leaves this point
  function path(pts, D, opt = {}) {
    const g = (opt.g || 6400) * Math.pow(Math.max(16, D) / 120, 0.35);
    const items = []; let t = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const lim = a.y < (opt.minTop ?? -1e9) ? -1e9 : (opt.minTop ?? -1e9);
      const top = Math.max(lim, Math.min(a.y, b.y) - a.h);
      const up = Math.sqrt(2 * Math.max(.5, a.y - top) / g), dn = Math.sqrt(2 * Math.max(.5, b.y - top) / g);
      items.push({ k: 'arc', t0: t, t1: t + up + dn, a, b, top, up, dn, g }); t += up + dn;
      const s = Math.min(1, g * dn / 2600) * (b.soft ?? 1);
      if (s > .03) { const sd = .022 + .026 * s; items.push({ k: 'hit', t0: t, t1: t + sd, x: b.x, y: b.y, s, pt: b }); t += sd; }
    }
    return { items, dur: t };
  }
  function at(p, t) {
    const it = p.items.find(i => t >= i.t0 && t <= i.t1) || p.items[p.items.length - 1];
    if (it.k === 'arc') {
      const u = Math.min(it.t1 - it.t0, Math.max(0, t - it.t0)), q = u / (it.t1 - it.t0), x = it.a.x + (it.b.x - it.a.x) * q;
      let y, vy; if (u < it.up) { y = it.top + .5 * it.g * (it.up - u) ** 2; vy = -it.g * (it.up - u); } else { const d = u - it.up; y = it.top + .5 * it.g * d * d; vy = it.g * d; }
      const k = Math.min(.06, Math.abs(vy) / 40000); return { x, y, sx: 1 - k * .6, sy: 1 + k, air: 1, it };
    }
    const e = Math.sin(Math.PI * (t - it.t0) / (it.t1 - it.t0));
    return { x: it.x, y: it.y, sx: 1 + .09 * it.s * e, sy: 1 - .13 * it.s * e, air: 0, it };
  }
  /* run a bounce on an element.  o: { el, shadow?, pts, D, base:[x,y] (el's own origin offset), spin:radians per px or per s, onHit(pt), onDone, maxH } */
  function play(o) {
    const p = path(o.pts, o.D, o);
    let last = null, t = 0, dist = 0, lx = null, raf;
    const tick = ts => {
      if (last != null) t += Math.min(.05, (ts - last) / 1000); last = ts;
      const s = at(p, Math.min(t, p.dur));
      if (lx != null) dist += s.x - lx; lx = s.x;
      const [bx, by] = o.base || [0, 0];
      o.el.style.transformOrigin = '50% 100%';
      o.el.style.transform = `translate(${s.x - bx}px, ${s.y - by}px) scale(${s.sx}, ${s.sy})`;
      frame(o.el, (o.ang0 || 0) + dist / (o.D / 2) + t * (o.idle || 0));
      if (o.shadow) { const fy = o.floor ?? s.y, h = Math.max(0, fy - s.y), k = 1 - Math.min(1, h / (o.maxH || o.D * 4)); o.shadow.style.opacity = (.15 + .75 * k) * (o.shOp ?? 1); o.shadow.style.transform = `translate(${s.x - bx}px, 0) scale(${(.5 + .6 * k) * (s.air ? 1 : s.sx)}, 1)`; }
      if (!s.air && !s.it.done) { s.it.done = 1; o.onHit && o.onHit(s.it.pt); }
      if (t < p.dur) raf = requestAnimationFrame(tick); else { o.el.style.transform = `translate(${s.x - bx}px, ${s.y - by}px)`; o.onDone && o.onDone(); }
    };
    raf = requestAnimationFrame(tick);
    return { stop: () => cancelAnimationFrame(raf), dur: p.dur };
  }
  // a slow idle spin for balls at rest (logo O etc.), cheap: one rAF for all
  const idle = new Set(); let ia = 0;
  (function spin() { ia += .006; idle.forEach(el => frame(el, ia + (el._a0 || 0))); requestAnimationFrame(spin); })();
  window.GPBall = { frame, path, at, play, idle };
})();
