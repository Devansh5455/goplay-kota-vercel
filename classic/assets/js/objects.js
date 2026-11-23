// Procedural 3D sport objects + scenes for GO PLAY. Designed by peaknpixel.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ACC = 0xD4FF3A;
const BASE = (document.querySelector('meta[name="gp-base"]')?.content) || 'assets/';
const mat = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ roughness: .5, metalness: 0 }, o));

/* ---------- object builders (all ~1 unit tall, centred) ---------- */
function shuttle() {
  const g = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.SphereGeometry(.2, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat({ color: 0xF4EFE2, roughness: .7, sheen: 1, sheenColor: 0xffffff }));
  cork.position.y = -.34; g.add(cork);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .08, 40, 1, true), mat({ color: 0x0C1411, roughness: .4, side: THREE.DoubleSide }));
  band.position.y = -.34; g.add(band);
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(.19 + t * .36 + Math.sin(t * Math.PI) * .02, -.3 + t * .78)); }
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mat({ color: 0xffffff, roughness: .55, transparent: true, opacity: .9, side: THREE.DoubleSide, sheen: .6 }));
  g.add(skirt);
  // feather tips (scallops)
  const tipG = new THREE.CircleGeometry(.085, 20, 0, Math.PI);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, tip = new THREE.Mesh(tipG, skirt.material);
    tip.position.set(Math.cos(a) * .555, .48, Math.sin(a) * .555); tip.lookAt(0, .48, 0); tip.rotateY(Math.PI); tip.rotateX(-.42);
    g.add(tip);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.006, .009, .82, 6), mat({ color: 0xDCD8CC }));
    shaft.position.set(Math.cos(a) * .375, .09, Math.sin(a) * .375); shaft.lookAt(Math.cos(a) * .58, .5, Math.sin(a) * .58); shaft.rotateX(Math.PI / 2);
    g.add(shaft);
  }
  for (const [y, r] of [[-.08, .265], [.12, .36]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 8, 64), mat({ color: ACC, roughness: .4 })); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  g.scale.setScalar(.95); g.rotation.z = .35; const w0 = new THREE.Group(); w0.add(g); return w0;
}
function racket() {
  const g = new THREE.Group();
  const frameM = mat({ color: 0x111A16, roughness: .25, metalness: .3, clearcoat: 1, clearcoatRoughness: .15 });
  const accM = mat({ color: ACC, roughness: .35, clearcoat: .8 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(.34, .022, 12, 96), frameM); frame.scale.set(1, 1.32, 1); frame.position.y = .52; g.add(frame);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(.34, .0235, 12, 96, Math.PI * .7), accM); stripe.scale.set(1, 1.32, 1); stripe.position.y = .52; stripe.rotation.z = Math.PI * .15; g.add(stripe);
  // strings
  const lp = [], a = .335, b = .335 * 1.32;
  for (let x = -a + .03; x < a; x += .034) { const h = b * Math.sqrt(Math.max(0, 1 - (x / a) ** 2)); lp.push(x, .52 - h, 0, x, .52 + h, 0); }
  for (let y = -b + .03; y < b; y += .034) { const w = a * Math.sqrt(Math.max(0, 1 - (y / b) ** 2)); lp.push(-w, .52 + y, 0, w, .52 + y, 0); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xEDEFE6, transparent: true, opacity: .75 })));
  const throat = new THREE.Mesh(new THREE.ConeGeometry(.06, .2, 12, 1, true), frameM); throat.position.y = .02; throat.rotation.x = Math.PI; g.add(throat);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .62, 10), frameM); shaft.position.y = -.24; g.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.04, .036, .42, 16), mat({ color: ACC, roughness: .85 })); grip.position.y = -.72; g.add(grip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .03, 16), frameM); cap.position.y = -.945; g.add(cap);
  g.position.y = .12; g.rotation.z = -.5; const w = new THREE.Group(); w.add(g); w.scale.setScalar(.72); return w;
}
function ballTexture(pal) {
  const W = 1024, Hh = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, Hh), d = img.data;
  const phi = (1 + Math.sqrt(5)) / 2, V = [];
  [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]].forEach(v => V.push({ d: new THREE.Vector3(...v).normalize(), k: 0 }));
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  F.forEach(f => V.push({ d: V[f[0]].d.clone().add(V[f[1]].d).add(V[f[2]].d).normalize(), k: 1 }));
  const n = new THREE.Vector3();
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / Hh, ph = u * Math.PI * 2, th = v * Math.PI;
    n.set(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
    let b1 = -2, b2 = -2, k = 0;
    for (const q of V) { const dd = n.dot(q.d) * (q.k ? 1 : 1.035); if (dd > b1) { b2 = b1; b1 = dd; k = q.k; } else if (dd > b2) b2 = dd; }
    const e = b1 - b2, c = k ? pal.hex : pal.pent, sm = Math.min(1, Math.max(0, (e - .004) / .006));
    const i = (y * W + x) * 4;
    d[i] = pal.seam[0] + (c[0] - pal.seam[0]) * sm; d[i + 1] = pal.seam[1] + (c[1] - pal.seam[1]) * sm; d[i + 2] = pal.seam[2] + (c[2] - pal.seam[2]) * sm; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let footTex = null;
function football() {
  footTex = footTex || ballTexture({ pent: [16, 22, 19], hex: [246, 245, 239], seam: [120, 126, 120] });
  return new THREE.Mesh(new THREE.SphereGeometry(.5, 64, 48), mat({ map: footTex, roughness: .38, clearcoat: .6, clearcoatRoughness: .3 }));
}
function cricket() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.42, 64, 48), mat({ color: 0xB3161B, roughness: .32, clearcoat: .9, clearcoatRoughness: .2 })));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(.421, .014, 8, 128), mat({ color: 0x8E1014, roughness: .6 })); g.add(seam);
  const st = mat({ color: 0xF2E8D2, roughness: .7 });
  const sG = new THREE.BoxGeometry(.022, .008, .012);
  for (const off of [-.035, .035]) for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, s = new THREE.Mesh(sG, st), R = Math.sqrt(.425 ** 2 - off ** 2);
    s.position.set(Math.cos(a) * R, Math.sin(a) * R, off); s.lookAt(0, 0, off); s.rotateZ(.6 * Math.sign(off)); g.add(s);
  }
  g.rotation.set(.5, .2, .3); const w = new THREE.Group(); w.add(g); return w;
}
function dumbbell() {
  const g = new THREE.Group();
  const chrome = mat({ color: 0xD8DCD6, metalness: 1, roughness: .18 });
  const rub = mat({ color: 0x141B18, roughness: .7, clearcoat: .3 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .62, 24), chrome); bar.rotation.z = Math.PI / 2; g.add(bar);
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .2, 6), rub); head.rotation.z = Math.PI / 2; head.position.x = s * .42; g.add(head);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .05, 24), mat({ color: ACC, roughness: .4 })); ring.rotation.z = Math.PI / 2; ring.position.x = s * .29; g.add(ring);
  }
  g.scale.setScalar(1.05); g.rotation.set(.35, .7, .25); const w = new THREE.Group(); w.add(g); return w;
}
function buoy() {
  const geo = new THREE.TorusGeometry(.38, .14, 32, 96);
  const p = geo.attributes.position, col = [], red = new THREE.Color(0xFF5A36), wh = new THREE.Color(0xF7F4EC);
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)) + Math.PI; const q = Math.floor(a / (Math.PI / 4)) % 2; const c = q ? red : wh; col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat({ vertexColors: true, roughness: .35, clearcoat: .8 })));
  const rope = mat({ color: 0xE6D9B8, roughness: .9 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 8; const t = new THREE.Mesh(new THREE.TorusGeometry(.15, .012, 6, 24), rope); t.position.set(Math.cos(a) * .38, Math.sin(a) * .38, 0); t.rotation.y = Math.PI / 2; t.rotation.x = a; g.add(t); }
  return g;
}
function ttbat() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .018, 48), mat({ color: 0xC9A06A, roughness: .6 })); blade.rotation.x = Math.PI / 2; blade.scale.set(1, 1, 1.1); blade.position.y = .16; g.add(blade);
  const r1 = new THREE.Mesh(new THREE.CylinderGeometry(.315, .315, .012, 48), mat({ color: 0xD62B2B, roughness: .55, sheen: .5 })); r1.rotation.x = Math.PI / 2; r1.position.set(0, .16, .016); r1.scale.set(1, 1, 1.1); g.add(r1);
  const r2 = r1.clone(); r2.material = mat({ color: 0x111111, roughness: .55 }); r2.position.z = -.016; g.add(r2);
  const h = new THREE.Mesh(new THREE.BoxGeometry(.075, .32, .06), mat({ color: 0xB78A55, roughness: .5, clearcoat: .4 })); h.position.y = -.3; g.add(h);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.06, 32, 16), mat({ color: 0xFFFFFF, roughness: .3 })); ball.position.set(.34, .5, .1); g.add(ball);
  return g;
}
let gltfCache = {};
function loadJSON(name) {
  if (!gltfCache[name]) gltfCache[name] = new Promise((res) => new GLTFLoader().load((window.__A && window.__A['assets/models/' + name + '.json']) || (BASE + 'models/' + name + '.json'), (gl) => res(gl.scene), undefined, () => res(null)));
  return gltfCache[name];
}
function pickle() {
  const g = new THREE.Group();
  loadJSON('paddle_you').then(s => { if (!s) return; const c = s.clone(); fit(c, 1.3); c.rotation.z = -.35; g.add(c); });
  loadJSON('ball').then(s => { if (!s) return; const c = s.clone(); fit(c, .34); c.position.set(.3, .42, .22); g.add(c); });
  return g;
}
function pball() { const g = new THREE.Group(); loadJSON('ball').then(s => { if (!s) return; const c = s.clone(); fit(c, .8); g.add(c); }); return g; }
function fit(o, size) {
  const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z); o.scale.multiplyScalar(k); o.position.sub(c.multiplyScalar(k));
}
export const BUILD = { shuttle, racket, pickle, pball, football, cricket, dumbbell, buoy, ttbat };

/* ---------- shared renderer setup ---------- */
function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75));
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}
function lights(scene, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xFFE2B8, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(ACC, 0); rim.position.set(-4, 1, -3); scene.add(rim);
  const fill = new THREE.HemisphereLight(0xffffff, 0x334433, .4); scene.add(fill);
  const apply = () => {
    const n = document.documentElement.classList.contains('night');
    scene.environmentIntensity = n ? .55 : 1; key.color.set(n ? 0x9FB7FF : 0xFFE2B8); key.intensity = n ? 1.2 : 2.2; rim.intensity = n ? 3.2 : .6;
  };
  apply(); addEventListener('gp-theme', apply);
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- HERO: floating cluster ---------- */
export function heroScene(canvas) {
  const renderer = makeRenderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 100); cam.position.set(0, 0, 10);
  lights(scene, renderer);
  const mob = () => innerWidth < 700;
  const layout = [
    ['pickle', -3.6, 1.5, 0, 1.25], ['shuttle', 3.4, 1.7, -.6, 1.05], ['football', -1.2, -1.1, 1.2, .95], ['racket', 1.2, .2, -1.8, 1.6],
    ['cricket', 4.3, -1.3, .4, .7], ['dumbbell', -4.6, -1.6, -1.2, 1.0], ['buoy', 2.4, -2.3, -1.2, 1.0], ['ttbat', -2.2, 2.6, -2.2, .9], ['pball', .4, 2.9, -.5, .45]
  ];
  const items = layout.map(([k, x, y, z, s], i) => {
    const o = BUILD[k](); const holder = new THREE.Group(); holder.add(o); holder.userData = { base: new THREE.Vector3(x, y, z), s, ph: i * 1.7, spin: (i % 2 ? 1 : -1) * (.15 + (i % 3) * .07), push: new THREE.Vector3() };
    holder.scale.setScalar(s); o.rotation.set(Math.random() * 2, Math.random() * 6, Math.random() * .6); scene.add(holder); return holder;
  });
  const ptr = new THREE.Vector2(9, 9), ptrS = new THREE.Vector2(), ray = new THREE.Raycaster();
  let prog = 0, vis = true, raf = 0, t0 = performance.now(), intro = 0;
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  addEventListener('pointermove', onMove, { passive: true });
  let alive = true;
  canvas.addEventListener('pointerdown', (e) => { onMove(e); ray.setFromCamera(ptr, cam); const hit = ray.intersectObjects(items, true)[0]; if (hit) { let h = hit.object; while (h.parent && !items.includes(h)) h = h.parent; h.userData.kick = 1; } });
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 52 : 32; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);
  const tmp = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!vis) return;
    const t = (now - t0) / 1000; intro = Math.min(1, intro + .012);
    const ei = 1 - Math.pow(1 - intro, 3);
    ptrS.lerp(ptr.x > 5 ? new THREE.Vector2(0, 0) : ptr, .06);
    const m = mob(), sx = m ? .5 : 1, sy = m ? .9 : 1, oy = m ? 2.1 : 0;
    items.forEach((h, i) => {
      const u = h.userData, b = u.base;
      const spread = 1 + prog * 1.6;
      tmp.set(b.x * sx * spread, (b.y * sy + oy) * spread + Math.sin(t * .8 + u.ph) * .18, b.z + prog * 4 * (i % 2 ? 1 : -.4));
      // intro: fly in from centre-back
      tmp.multiplyScalar(ei); tmp.z += (1 - ei) * -12;
      // pointer repel in screen space
      const sp = h.position.clone().project(cam); const dx = sp.x - ptrS.x, dy = (sp.y - ptrS.y) / (cam.aspect || 1) * 1.6, d = Math.hypot(dx, dy);
      if (d < .32 && ptr.x < 5) u.push.add(new THREE.Vector3(dx, dy, 0).normalize().multiplyScalar((.32 - d) * .5));
      u.push.multiplyScalar(.92); tmp.add(u.push);
      h.position.lerp(tmp, .08);
      const o = h.children[0]; const kick = u.kick || 0; u.kick = kick * .95;
      o.rotation.y += (u.spin * .012) * (reduced ? 0 : 1) + kick * .25; o.rotation.x += .002 + kick * .08;
      h.scale.setScalar(u.s * (m ? .62 : 1) * (1 + kick * .15));
    });
    scene.rotation.y += ((ptrS.x * .25) - scene.rotation.y) * .05; scene.rotation.x += ((-ptrS.y * .12) - scene.rotation.x) * .05;
    cam.position.z = 10 - prog * 2.5;
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); io.observe(canvas);
  return { setProgress(p) { prog = p; }, dispose() { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('resize', size); renderer.dispose(); renderer.forceContextLoss(); } };
}

/* ---------- VIEWER: one object, drag to spin ---------- */
export function viewer(canvas, kind, opts = {}) {
  const renderer = makeRenderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 0, opts.dist || 4.2);
  lights(scene, renderer);
  const holder = new THREE.Group(), obj = BUILD[kind](); holder.add(obj); scene.add(holder);
  holder.scale.setScalar(opts.scale || 1.25);
  let vy = .6, rotY = 0, drag = null, vis = true, tx = 0, ty = 0, t0 = performance.now(), sc = 0;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, r: rotY }; vy = 0; });
  const onPM = e => {
    const r = canvas.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5); ty = ((e.clientY - r.top) / r.height - .5);
    if (drag) { const nr = drag.r + (e.clientX - drag.x) * .012; vy = (nr - rotY) * 60; rotY = nr; }
  };
  const onUp = () => { drag = null; };
  addEventListener('pointermove', onPM, { passive: true }); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);
  let raf = 0;
  (function frame(now) {
    raf = requestAnimationFrame(frame); if (!vis) return;
    const t = (now - t0) / 1000;
    if (!drag) { vy += ((reduced ? 0 : .5) - vy) * .02; rotY += vy / 60; }
    holder.rotation.y = rotY; holder.rotation.x += ((ty * .5 + Math.sin(t * .7) * .08) - holder.rotation.x) * .06; holder.rotation.z += ((-tx * .3) - holder.rotation.z) * .06;
    holder.position.y = Math.sin(t * 1.1) * .08 - sc * .6;
    renderer.render(scene, cam);
  })(performance.now());
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); io.observe(canvas);
  return { setScroll(p) { sc = p; }, dispose() { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('pointermove', onPM); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); removeEventListener('resize', size); renderer.dispose(); renderer.forceContextLoss(); } };
}

/* ---------- mount helper used by the router ---------- */
export function mount3D(root) {
  const out = [];
  const st = root.querySelector('canvas[data-scene="hero"]');
  if (st) {
    const h = heroScene(st), sec = st.closest('section');
    const on = () => { const r = sec.getBoundingClientRect(); h.setProgress(Math.min(1, Math.max(0, -r.top / r.height))); };
    addEventListener('scroll', on, { passive: true });
    out.push({ dispose() { removeEventListener('scroll', on); h.dispose(); } });
  }
  root.querySelectorAll('canvas[data-obj]').forEach(c => {
    const v = viewer(c, c.dataset.obj, { scale: +(c.dataset.scale || 1.35) });
    const on = () => v.setScroll(Math.min(1, scrollY / innerHeight));
    addEventListener('scroll', on, { passive: true });
    out.push({ dispose() { removeEventListener('scroll', on); v.dispose(); } });
  });
  return () => out.forEach(o => o.dispose());
}
