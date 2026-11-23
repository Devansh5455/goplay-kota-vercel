
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('court');
const hero = document.getElementById('top');
const box = document.getElementById('stagebox');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
const camBase = new THREE.Vector3(0, 3.1, 11.6);
const camLook = new THREE.Vector3(0, 0.2, -1.8);

// ---------- helpers ----------
const cvs = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// acrylic grain texture (white-ish, tinted by material colour)
const grain = (n, base) => cvs(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = 200 + rnd() * 55 | 0; g.fillStyle = `rgba(${v},${v},${v},${.25 + rnd() * .35})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
  for (let i = 0; i < n / 3; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
});

// ---------- lights (matched to the Blender plates) ----------
const hemi = new THREE.HemisphereLight(0xe2eaff, 0x6f8f86, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffead3, 2.2); sun.position.set(-8, 16, 8); scene.add(sun);
const fill = new THREE.DirectionalLight(0x97c5ff, .8); fill.position.set(6, 5, -4); scene.add(fill);
const LIGHT = {
  day:   { hemi: [0xe2eaff, 0x6f8f86, 1.3], sun: [0xffead3, 2.2], fill: .8, exp: 1.0 },
  night: { hemi: [0x7d8fc4, 0x15302a, .55], sun: [0xfff1dc, 2.6], fill: .25, exp: 1.05 }
};
function setLight(m) { const L = LIGHT[m]; hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2]; sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; fill.intensity = L.fill; renderer.toneMappingExposure = L.exp; if (m === 'night') sun.position.set(0, 14, 9); else sun.position.set(-8, 16, 8); }

// court constants (the courts themselves are in the Blender render)
const CW = 6.096, CL = 13.411, HW = CW / 2, HL = CL / 2, NVZ = 2.134, LW = 0.051;
const netH = x => 0.914 - 0.05 * (1 - Math.min(1, (x / 3.35) ** 2));

// ---------- paddles & ball ----------
function swirl(base, stripe, edge) {
  return cvs(512, 720, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    c.strokeStyle = stripe; c.lineCap = 'round'; c.lineJoin = 'round';
    const bands = [[.08, 70], [.28, 84], [.5, 64], [.7, 90], [.9, 70]];
    bands.forEach(([v, lw], k) => {
      c.lineWidth = lw; c.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40; const x = -40 + t * (w + 80); const y = v * h + Math.sin(t * 6.3 + k * 1.7) * 52 + Math.sin(t * 13 + k) * 16; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    });
    c.lineWidth = 46; c.beginPath(); c.moveTo(w * .18, -20); c.bezierCurveTo(w * .55, h * .3, w * .05, h * .55, w * .45, h + 20); c.stroke();
    c.fillStyle = edge; c.font = '700 22px Archivo, sans-serif'; c.textAlign = 'center'; c.fillText('GO PLAY', w / 2, h - 26);
  });
}
const gripTex = tex(cvs(64, 256, (c, w, h) => { c.fillStyle = '#9b3b22'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(40,10,4,.55)'; c.lineWidth = 4; for (let y = -64; y < h + 64; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 26); c.stroke(); } }));
function makePaddle(base, stripe) {
  const W = .095, y0 = -.135, y1 = .135, r = .045, rb = .025;
  const s = new THREE.Shape();
  s.moveTo(-W + rb, y0); s.lineTo(W - rb, y0); s.quadraticCurveTo(W, y0, W, y0 + rb); s.lineTo(W, y1 - r); s.quadraticCurveTo(W, y1, W - r, y1);
  s.lineTo(-W + r, y1); s.quadraticCurveTo(-W, y1, -W, y1 - r); s.lineTo(-W, y0 + rb); s.quadraticCurveTo(-W, y0, -W + rb, y0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .012, bevelEnabled: true, bevelThickness: .002, bevelSize: .003, bevelSegments: 2, curveSegments: 14 });
  geo.translate(0, 0, -.006);
  const face = tex(swirl(base, stripe, 'rgba(11,26,58,.55)')); face.repeat.set(1 / (2 * W), 1 / (y1 - y0)); face.offset.set(.5, .5);
  const head = new THREE.Mesh(geo, [new THREE.MeshPhysicalMaterial({ map: face, roughness: .38, clearcoat: .6, clearcoatRoughness: .3 }), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: .5 })]);
  head.castShadow = true;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.016, .018, .13, 18), new THREE.MeshStandardMaterial({ map: gripTex, roughness: .75 }));
  handle.position.y = y0 - .065; handle.castShadow = true;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .014, 18), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: .4 }));
  collar.position.y = y0 - .004;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.021, .021, .012, 18), new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: .5 }));
  cap.position.y = y0 - .132;
  const inner = new THREE.Group(); inner.add(head, handle, collar, cap);
  const g = new THREE.Group(); g.add(inner); g.scale.setScalar(1.85); g.userData.inner = inner;
  scene.add(g); return g;
}
const youPad = makePaddle('#ffffff', '#f6cf2e');
const aiPad = makePaddle('#ffffff', '#e8573f');

const BALL_SCALE = 1.8, R = .037 * BALL_SCALE, G = 9.81;
const ballTex = tex(cvs(1024, 512, (c, w, h) => {
  const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff8a2a'); gr.addColorStop(1, '#f2650f'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  const N = 40, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const lat = Math.asin(1 - 2 * (i + .5) / N), lon = (i * ga) % (Math.PI * 2);
    const u = lon / (Math.PI * 2) * w, v = (.5 - lat / Math.PI) * h, ry = 18, rx = Math.min(140, 18 / Math.max(.12, Math.cos(lat)));
    for (const du of [-w, 0, w]) { c.fillStyle = '#7a2f06'; c.beginPath(); c.ellipse(u + du, v, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#3b1603'; c.beginPath(); c.ellipse(u + du, v + 2, rx * .72, ry * .72, 0, 0, Math.PI * 2); c.fill(); }
  }
}));
const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .42 }));
ball.castShadow = true; scene.add(ball);
const blob = new THREE.Mesh(new THREE.CircleGeometry(R * 1.6, 24), new THREE.MeshBasicMaterial({ color: 0x0a1a12, transparent: true, opacity: .4, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = .006; scene.add(blob);
const trail = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(R * (1 - i * .08), 12, 8), new THREE.MeshBasicMaterial({ color: 0xe4ff3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(m); return m; });
const hist = [];

// ---------- Blender models (paddles + ball with real holes); code-built versions stay as fallback ----------
const gltf = new GLTFLoader();
const loadGLB = url => new Promise((res, rej) => gltf.load(url, g => res(g.scene), undefined, rej));
const prepare = root => { root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); } }); return root; };
Promise.all([loadGLB('assets/paddle_you.json'), loadGLB('assets/paddle_house.json'), loadGLB('assets/ball.json')]).then(([pY, pH, b]) => {
  for (const [pad, model] of [[youPad, pY], [aiPad, pH]]) { const inner = pad.userData.inner; inner.clear(); inner.add(prepare(model)); }
  prepare(b); b.scale.setScalar(BALL_SCALE); ball.material.visible = false; ball.add(b);
  if (!running) renderer.render(scene, camera);
}).catch(e => console.warn('Using code-built models:', e && e.message));

// ---------- sound (Web Audio, off by default) ----------
let actx = null, soundOn = false;
let noiseBuf = null;
function initAudio() { actx = new (window.AudioContext || window.webkitAudioContext)(); noiseBuf = actx.createBuffer(1, actx.sampleRate * .08, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
function pock(freq = 1350, vol = .5) {
  if (!soundOn || !actx) return; const t = actx.currentTime;
  const n = actx.createBufferSource(); n.buffer = noiseBuf; const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 5;
  const o = actx.createOscillator(); o.frequency.setValueAtTime(freq * .62, t); o.frequency.exponentialRampToValueAtTime(freq * .38, t + .05);
  const gn = actx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.001, t + .09);
  n.connect(bp).connect(gn); o.connect(gn); gn.connect(actx.destination); n.start(t); o.start(t); o.stop(t + .1);
}
document.getElementById('soundBtn').addEventListener('click', e => {
  soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn);
  document.getElementById('waves').setAttribute('opacity', soundOn ? 1 : .35);
  try { if (!actx) initAudio(); actx.resume(); } catch (_) { }
  if (soundOn) pock(1400, .4);
});
let theme = (() => { try { return localStorage.getItem('gp-pal') || 'resort'; } catch (_) { return 'resort'; } })();
const PSET = box.dataset.set || 'gp';
const palSrc = (m, k) => `assets/plates/${PSET}-${m}-${k}.jpg`;
let fx = (() => { try { return localStorage.getItem('gp-fx') !== '0'; } catch (_) { return true; } })();
function syncFx() { const b = document.getElementById('themeBtn'); if (b) b.setAttribute('aria-pressed', fx); const l = document.getElementById('themeLabel'); if (l) l.textContent = fx ? 'Effects on' : 'Effects off'; }
document.getElementById('themeBtn')?.addEventListener('click', () => { fx = !fx; try { localStorage.setItem('gp-fx', fx ? '1' : '0'); } catch (_) { } syncFx(); });
syncFx();

// ---------- court effects: ground rings, impact flashes, smash shock, line sweep ----------
const FX = new THREE.Group(); scene.add(FX);
const ringTex = tex(cvs(256, 256, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, w * .30, w / 2, w / 2, w * .5); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.55, 'rgba(255,255,255,1)'); g.addColorStop(.75, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }));
const pool = [];
function burst(pos, { color = 0xe4ff3a, size = .55, life = .5, ground = true, grow = 2.6 } = {}) {
  if (!fx || reduced) return;
  let m = pool.find(x => !x.visible);
  if (!m) { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); pool.push(m); FX.add(m); }
  m.visible = true; m.position.copy(pos); m.material.color.setHex(color);
  if (ground) { m.position.y = .012; m.rotation.set(-Math.PI / 2, 0, 0); m.quaternion.setFromEuler(m.rotation); } else m.quaternion.copy(camera.quaternion);
  m.userData = { t: 0, life, size, grow };
}
function tickFx(dt) {
  for (const m of pool) { if (!m.visible) continue; const u = m.userData; u.t += dt; const k = u.t / u.life; if (k >= 1) { m.visible = false; continue; } const e = 1 - Math.pow(1 - k, 3); m.scale.setScalar(u.size * (1 + e * u.grow)); m.material.opacity = (1 - k) * (1 - k); }
}
let shake = 0;
const dust = Array.from({ length: 14 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xf2ffc2, transparent: true, opacity: 0, depthWrite: false })); d.userData = { v: new THREE.Vector3(), t: 9 }; FX.add(d); return d; });
function smashHit(pos) {
  if (!fx || reduced) return;
  glowT = 0;
  burst(pos, { color: 0xe4ff3a, size: .7, life: .75, grow: 4.2 }); burst(pos, { color: 0xffffff, size: .35, life: .45, grow: 3 });
  dust.forEach(d => { d.position.set(pos.x, .03, pos.z); const a = rnd() * Math.PI * 2, sp = 1.4 + rnd() * 2.2; d.userData.v.set(Math.cos(a) * sp, 1.6 + rnd() * 2.4, Math.sin(a) * sp); d.userData.t = 0; });
  shake = .35;
}
function tickDust(dt) { dust.forEach(d => { const u = d.userData; if (u.t > .9) { d.material.opacity = 0; return; } u.t += dt; u.v.y -= G * dt; d.position.addScaledVector(u.v, dt); if (d.position.y < .02) { d.position.y = .02; u.v.multiplyScalar(.4); } d.material.opacity = .9 * (1 - u.t / .9); }); }
// lime line sweep that traces the main court when the hero loads
const lineMat = new THREE.MeshBasicMaterial({ color: 0xe4ff3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const sweep = [];
for (const side of [-1, 1]) {
  const pts = [[0, HL], [side * HW, HL], [side * HW, -HL], [0, -HL]]; let run = 0;
  for (let i = 1; i < pts.length; i++) { const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], len = Math.hypot(x1 - x0, z1 - z0); const m = new THREE.Mesh(new THREE.PlaneGeometry(1, .07), lineMat); m.rotation.set(-Math.PI / 2, 0, -Math.atan2(z1 - z0, x1 - x0)); m.position.y = .014; m.userData = { x0, z0, x1, z1, len, run }; FX.add(m); sweep.push(m); run += len; }
}
for (const z of [-NVZ, NVZ]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(CW, .07), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(0, .014, z); m.userData = { kitchen: true }; FX.add(m); sweep.push(m); }
let sweepT = -1;
// every line of the main court lights up lime when a smash hits the ground, then fades back to white
const glowMat = new THREE.MeshBasicMaterial({ color: 0xc8ff2e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const GL = [];
const seg = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(len, .085), glowMat); m.rotation.set(-Math.PI / 2, 0, -Math.atan2(z1 - z0, x1 - x0)); m.position.set((x0 + x1) / 2, .016, (z0 + z1) / 2); FX.add(m); GL.push(m); };
seg(-HW, -HL, -HW, HL); seg(HW, -HL, HW, HL); seg(-HW, -HL, HW, -HL); seg(-HW, HL, HW, HL); seg(-HW, -NVZ, HW, -NVZ); seg(-HW, NVZ, HW, NVZ); seg(0, NVZ, 0, HL); seg(0, -NVZ, 0, -HL);
let glowT = -1;
function tickGlow(dt) {
  if (glowT < 0) return; glowT += dt;
  const k = glowT < .08 ? glowT / .08 : Math.max(0, 1 - (glowT - .08) / 1.1);
  glowMat.opacity = k * .95; GL.forEach(m => m.scale.y = 1 + k * 1.2);
  if (k <= 0 && glowT > .2) { glowT = -1; glowMat.opacity = 0; }
}
function tickSweep(dt) {
  if (sweepT < 0) return; sweepT += dt; const travel = sweepT * 22;
  for (const m of sweep) {
    if (m.userData.kitchen) { const k = THREE.MathUtils.clamp((sweepT - .9) / .4, 0, 1); m.scale.x = Math.max(k, .001); continue; }
    const u = m.userData, k = THREE.MathUtils.clamp((travel - u.run) / u.len, 0, 1); m.scale.x = Math.max(k * u.len, .001);
    m.position.x = u.x0 + (u.x1 - u.x0) * k / 2; m.position.z = u.z0 + (u.z1 - u.z0) * k / 2;
  }
  lineMat.opacity = sweepT < 1.4 ? .95 : Math.max(0, .95 - (sweepT - 1.4) * .9);
  if (sweepT > 2.6) { sweepT = -1; FX.remove(...sweep); }
}
lineMat.opacity = 0;

// ---------- game ----------
const S = { state: 'serve-wait', server: 'ai', last: null, hits: 0, bounces: 0, score: { you: 0, ai: 0 }, waitUntil: 0, over: false };
const P = new THREE.Vector3(), V = new THREE.Vector3();
let engaged = false, pointerDown = false, armedAt = -1e9, serveClickAt = -1e9;
const ptr = new THREE.Vector2(), ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.0), hitPt = new THREE.Vector3();
const youTarget = new THREE.Vector3(0, .85, 6.4), aiTarget = new THREE.Vector3(0, .85, -6.4);
let lastPtrX = 0, ptrVX = 0, botPlan = { you: null, ai: null };
youPad.position.copy(youTarget); aiPad.position.copy(aiTarget);

const $ = id => document.getElementById(id);
function setDigits(el, n) { const s = String(n).padStart(2, '0'); [...el.children].forEach((d, i) => { if (d.textContent !== s[i]) { d.textContent = s[i]; d.classList.remove('flip'); void d.offsetWidth; d.classList.add('flip'); } }); }
function updateBoard() { setDigits($('scoreYou'), S.score.you); setDigits($('scoreHouse'), S.score.ai); $('rallyN').textContent = String(S.hits).padStart(2, '0'); $('modeText').textContent = engaged ? 'You vs house' : 'House rally'; $('modeHint').textContent = engaged ? (S.state === 'serve-wait' && S.server === 'you' ? 'Click to serve' : 'Live') : 'Hover to play'; }
let flashT = 0;
function flash(big, small, ms = 1100) { $('flashBig').textContent = big; $('flashSmall').textContent = small || ''; $('flash').classList.add('on'); clearTimeout(flashT); if (ms) flashT = setTimeout(() => $('flash').classList.remove('on'), ms); }

function shoot(from, tx, tz, T) {
  for (let i = 0; i < 10; i++) {
    const vx = (tx - from.x) / T, vz = (tz - from.z) / T, vy = (R - from.y + .5 * G * T * T) / T;
    const tn = -from.z / vz;
    if (tn > 0 && tn < T) { const yn = from.y + vy * tn - .5 * G * tn * tn; if (yn < 1.02) { T *= 1.1; continue; } }
    return new THREE.Vector3(vx, vy, vz);
  }
  const vx = (tx - from.x) / T, vz = (tz - from.z) / T; return new THREE.Vector3(vx, (R - from.y + .5 * G * T * T) / T, vz);
}
const sideOf = z => z > 0 ? 'you' : 'ai';
const other = s => s === 'you' ? 'ai' : 'you';
const sgn = s => s === 'you' ? 1 : -1;

function setupServe() {
  S.state = 'serve-wait'; S.hits = 0; S.bounces = 0; S.last = null; botPlan = { you: null, ai: null };
  S.waitUntil = performance.now() + (S.server === 'ai' || !engaged ? 1000 : 4500);
  updateBoard();
}
function servePos() {
  const s = S.server, even = S.score[s] % 2 === 0;
  const x = s === 'you' ? (even ? 1.5 : -1.5) : (even ? -1.5 : 1.5);
  return new THREE.Vector3(x, .62, sgn(s) * 7.05);
}
function serve() {
  const s = S.server, from = servePos();
  const tx = -from.x + (rnd() - .5) * 1.2, tz = -sgn(s) * (3.6 + rnd() * 2.4);
  V.copy(shoot(P, tx, tz, 1.15 + rnd() * .15));
  S.state = 'live'; S.last = s; S.hits = 1; S.bounces = 0; swing(s); pock(1300, .45); updateBoard();
  burst(P, { color: 0xffffff, size: .3, life: .35, ground: false, grow: 2 });
}
function chiptune(up) {
  if (!soundOn || !actx) return; const t = actx.currentTime, notes = up ? [523, 659, 784, 1046] : [392, 330, 262];
  notes.forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + i * .08); g.gain.exponentialRampToValueAtTime(.06, t + i * .08 + .01); g.gain.exponentialRampToValueAtTime(.0001, t + i * .08 + .07); o.connect(g).connect(actx.destination); o.start(t + i * .08); o.stop(t + i * .08 + .08); });
}
function pointTo(winner, why) {
  if (S.state !== 'live') return;
  if (engaged) chiptune(winner === 'you');
  S.state = 'dead'; S.waitUntil = performance.now() + 1500;
  if (engaged) {
    S.score[winner]++; S.server = winner;
    const a = S.score.you, b = S.score.ai;
    if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) { S.over = true; flash(a > b ? 'YOU WIN!' : 'GAME OVER', `${a} – ${b} · rally scoring`, 0); $('againBtn').hidden = false; updateBoard(); return; }
    flash(winner === 'you' ? 'YOUR POINT!' : 'HOUSE POINT', why);
  } else { S.server = winner; }
  updateBoard();
}
$('againBtn').addEventListener('click', e => { e.stopPropagation(); S.score = { you: 0, ai: 0 }; S.over = false; S.server = 'you'; $('againBtn').hidden = true; $('flash').classList.remove('on'); setupServe(); });

function hit(who, pad, smash) {
  const s = sgn(who);
  if (S.bounces === 0 && Math.abs(pad.position.z) < NVZ + .05) { pointTo(other(who), 'Kitchen fault · no volleys in the kitchen'); return; }
  let tx, tz, T;
  if (who === 'you' && engaged) {
    const dx = P.x - pad.position.x;
    tx = THREE.MathUtils.clamp(-dx * 6 - ptrVX * .12 + (rnd() - .5) * .6, -2.6, 2.6);
    if (smash) { tz = -(4.8 + rnd() * 1.3); T = .62 + rnd() * .08; } else { tz = -(2.8 + rnd() * 3.2); T = 1.0 + rnd() * .3; }
  } else {
    const dink = rnd() < .18 && Math.abs(P.z) < 5;
    tx = (rnd() - .5) * 4.8; tz = -s * (dink ? 1.2 + rnd() * .7 : 3.2 + rnd() * 3); T = dink ? 1.25 : (who === 'you' ? .95 : 1.0) + rnd() * .3;
  }
  V.copy(shoot(P, tx, tz, T));
  S.last = who; S.hits++; S.bounces = 0; botPlan[other(who)] = null; swing(who, smash);
  burst(P, { color: smash ? 0xe4ff3a : 0xffffff, size: smash ? .5 : .3, life: .35, ground: false, grow: smash ? 3 : 2 });
  pock(smash ? 1150 : 1350, smash ? .7 : .5); updateBoard();
}
function swing(who, big) { const pad = who === 'you' ? youPad : aiPad; pad.userData.swing = big ? 1.3 : 1; }

// predict where a bot should meet the ball (after one bounce, near the top of the bounce)
function plan(who) {
  const p = P.clone(), v = V.clone(); let b = S.bounces, best = null; const s = sgn(who), dt = 1 / 120;
  for (let i = 0; i < 480; i++) {
    v.y -= G * dt; p.addScaledVector(v, dt);
    if (p.y < R && v.y < 0) { p.y = R; v.y *= -.68; v.x *= .82; v.z *= .82; b++; }
    if (b >= 1 && sideOf(p.z) === who && (v.y < 0 || Math.abs(p.z) > 6.4)) { best = p.clone(); break; }
    if (b >= 2) break;
  }
  if (!best) best = new THREE.Vector3(P.x, .8, s * 6.2);
  const smash = Math.hypot(V.x, V.z) > 14;
  const miss = rnd() < (who === 'ai' ? (smash ? .42 : .07 + S.hits * .004) : .02);
  if (miss) best.x += (rnd() < .5 ? -1 : 1) * (.9 + rnd() * .5);
  return best;
}
function moveBot(pad, who, target, dt) {
  const s = sgn(who);
  if (S.state === 'live' && S.last !== who) { if (!botPlan[who]) botPlan[who] = plan(who); target.set(botPlan[who].x, THREE.MathUtils.clamp(botPlan[who].y, .3, 1.5), THREE.MathUtils.clamp(botPlan[who].z + s * .05, s > 0 ? 2.3 : -8.5, s > 0 ? 8.5 : -2.3)); }
  else if (S.state === 'serve-wait' && S.server === who) target.copy(servePos());
  else target.set(target.x * .98, .85, s * 6.4);
  const d = target.clone().sub(pad.position); const maxStep = 6.2 * dt; if (d.length() > maxStep) d.setLength(maxStep); pad.position.add(d);
}

// ---------- input ----------
function toPtr(e) { const r = canvas.getBoundingClientRect(), hr = hero.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); const c = $('gcursor'); c.style.left = (e.clientX - hr.left) + 'px'; c.style.top = (e.clientY - hr.top) + 'px'; }
function engage(on) { if (engaged === on) return; engaged = on; $('gcursor').classList.toggle('on', on && matchMedia('(pointer:fine)').matches); if (on && S.state === 'serve-wait' && S.server === 'you') S.waitUntil = performance.now() + 4500; updateBoard(); }
canvas.addEventListener('pointermove', e => { toPtr(e); engage(true); });
canvas.addEventListener('pointerenter', e => { toPtr(e); engage(true); });
canvas.addEventListener('pointerleave', () => { engage(false); pointerDown = false; });
canvas.addEventListener('pointerdown', e => { toPtr(e); engage(true); pointerDown = true; armedAt = performance.now(); serveClickAt = armedAt; if (reduced && !running) start(); });
addEventListener('pointerup', () => pointerDown = false);

// ---------- loop ----------
let running = false, visible = true, lastT = performance.now();
// ---------- Blender camera plates ----------
const AX = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); // Blender Z-up -> three Y-up
let PLATES = null, plateKey = null;
let mode = (() => { try { const s = localStorage.getItem('gp-mode'); if (s) return s; } catch (_) { } const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()) % 24; return (h >= 18 || h < 6) ? 'night' : 'day'; })();
async function loadPlates() {
  const [wide, tall] = await Promise.all(['wide', 'tall'].map(k => fetch(`assets/plates/${PSET}-${k}.json`).then(r => r.json())));
  PLATES = { wide, tall };
}
const rows = m => new THREE.Matrix4().set(...m[0], ...m[1], ...m[2], ...m[3]);
function setMode(m, first) {
  mode = m; try { localStorage.setItem('gp-mode', m); } catch (_) { }
  document.documentElement.dataset.mode = m; document.documentElement.classList.toggle('night', m === 'night'); setLight(m); dispatchEvent(new Event('gp-theme'));
  box.querySelectorAll('img.plate').forEach(im => im.classList.toggle('on', im.dataset.mode === m));
  dispatchEvent(new CustomEvent('gp-mode-ui', { detail: m }));
  if (!first && !running) render(0);
  dispatchEvent(new CustomEvent('gp-mode', { detail: m }));
}
window.__setMode = m => setMode(m); window.__getMode = () => mode;
function frameCamera() {
  const W = hero.clientWidth, H = hero.clientHeight, key = W / H >= 1 ? 'wide' : 'tall', pl = PLATES[key];
  if (key !== plateKey) {
    plateKey = key;
    box.querySelectorAll('img.plate').forEach(im => { im.src = palSrc(im.dataset.mode, key); });
    const M = AX.clone().multiply(rows(pl.world));
    camera.matrixAutoUpdate = false; camera.matrix.copy(M); camera.matrixWorldNeedsUpdate = true; camera.updateMatrixWorld(true);
    camera.projectionMatrix.copy(rows(pl.projection)); camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  const pa = pl.width / pl.height; let bw, bh;
  if (W / H > pa) { bw = W; bh = W / pa; } else { bh = H; bw = H * pa; }
  // keep the main court where the copy isn't: right side on wide screens, centred on tall ones
  const c = new THREE.Vector3(0, 0, 0).project(camera), cx = (c.x + 1) / 2 * bw, cy = (1 - c.y) / 2 * bh;
  const fx = key === 'wide' ? (W > 900 ? .64 : .5) : .5, fy = key === 'wide' ? .56 : .42;
  const left = THREE.MathUtils.clamp(W * fx - cx, W - bw, 0), top = THREE.MathUtils.clamp(H * fy - cy, H - bh, 0);
  Object.assign(box.style, { width: bw + 'px', height: bh + 'px', left: left + 'px', top: top + 'px' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2, 2600 / bw));
  renderer.setSize(bw, bh, false);
}
addEventListener('resize', () => { frameCamera(); if (!running) render(0); });
setMode(mode, true);

function physics(dt) {
  const prevZ = P.z;
  V.y -= G * dt; P.addScaledVector(V, dt);
  if (prevZ * P.z < 0 && Math.abs(P.x) < 3.35 && P.y < netH(P.x) + R * .5 && S.state !== 'serve-wait') {
    P.z = Math.sign(prevZ) * (R + .01); V.z *= -.12; V.x *= .3; V.y = Math.min(V.y, 0) * .3;
    if (S.state === 'live') pointTo(other(S.last), 'Into the net');
  }
  if (P.y < R && V.y < 0) {
    P.y = R;
    if (Math.abs(V.y) < .5) { V.y = 0; V.x *= 1 - 2 * dt; V.z *= 1 - 2 * dt; }
    else {
      pock(700, Math.min(.35, Math.abs(V.y) * .06));
      if (Math.abs(V.y) > 1.2) { const hard = Math.hypot(V.x, V.z) > 11; if (hard) smashHit(P); else burst(P, { color: 0xf2ffbd, size: .4, life: .55, grow: 2.4 }); }
      if (S.state === 'live') {
        const side = sideOf(P.z), recv = other(S.last);
        if (S.bounces === 0) {
          const out = Math.abs(P.x) > HW + .03 || Math.abs(P.z) > HL + .03 || side !== recv;
          const shortServe = S.hits === 1 && Math.abs(P.z) < NVZ;
          if (out) pointTo(recv, 'Out'); else if (shortServe) pointTo(recv, 'Serve in the kitchen'); else S.bounces = 1;
        } else pointTo(S.last, 'Double bounce');
        botPlan[recv] = null;
      }
      V.y *= -.68; V.x *= .82; V.z *= .82;
    }
  }
  if (S.state === 'live' && (Math.abs(P.z) > 14 || Math.abs(P.x) > 14)) pointTo(S.bounces ? S.last : other(S.last), 'Out');

  // contacts
  if (S.state === 'live') {
    for (const who of ['you', 'ai']) {
      if (S.last === who) continue;
      const pad = who === 'you' ? youPad : aiPad, human = who === 'you' && engaged;
      const towards = V.z * sgn(who) > 0;
      if (!towards) continue;
      const canHit = S.bounces >= 1 || (human && S.hits >= 3);
      if (!canHit) continue;
      const dx = P.x - pad.position.x, dz = P.z - pad.position.z, dy = P.y - pad.position.y;
      const reachX = human ? .62 : .4, reachZ = human ? .3 : .3;
      if (Math.abs(dx) < reachX && Math.abs(dz) < reachZ && Math.abs(dy) < (human ? 1.2 : .45)) {
        const smash = human && (pointerDown || performance.now() - armedAt < 300);
        hit(who, pad, smash); break;
      }
    }
  }
}

function update(dt, now) {
  // human paddle
  if (engaged) {
    ray.setFromCamera(ptr, camera);
    if (ray.ray.intersectPlane(floor, hitPt)) {
      youTarget.x = THREE.MathUtils.clamp(hitPt.x, -4.2, 4.2);
      youTarget.z = THREE.MathUtils.clamp(hitPt.z + 1.0, .6, 8.6);
    }
    const near = S.state === 'live' && S.last === 'ai' && P.z > youPad.position.z - 4;
    youTarget.y = near ? THREE.MathUtils.clamp(P.y, .25, 1.6) : .85;
    youPad.position.lerp(youTarget, 1 - Math.exp(-18 * dt));
    ptrVX = (youPad.position.x - lastPtrX) / Math.max(dt, 1e-3); lastPtrX = youPad.position.x;
  } else moveBot(youPad, 'you', youTarget, dt);
  moveBot(aiPad, 'ai', aiTarget, dt);

  if (S.state === 'serve-wait') {
    const sp = servePos(); const pad = S.server === 'you' ? youPad : aiPad;
    P.set(pad.position.x, pad.position.y + .02, pad.position.z - sgn(S.server) * .12); V.set(0, 0, 0);
    if (!S.over) {
      const humanServe = engaged && S.server === 'you';
      if ((humanServe && serveClickAt > S.waitUntil - 4500 + 300) || now > S.waitUntil) { serveClickAt = -1e9; serve(); }
    }
  } else {
    const steps = 3; for (let i = 0; i < steps; i++) physics(dt / steps);
    if (S.state === 'dead' && now > S.waitUntil && !S.over) { $('flash').classList.remove('on'); setupServe(); }
  }

  // paddle pose + swing
  for (const [pad, who] of [[youPad, 'you'], [aiPad, 'ai']]) {
    const s = sgn(who), inner = pad.userData.inner; let sw = pad.userData.swing || 0;
    const big = sw > 1; sw = Math.max(0, sw - dt * (big ? 3.6 : 4.2)); pad.userData.swing = sw;
    const p = 1 - Math.min(1, sw), amp = big ? 1.35 : 1;
    // 0–20%: wind back, 20–60%: snap through the ball, 60–100%: follow-through settles
    const arc = sw <= 0 ? 0 : p < .2 ? -.55 * amp * (p / .2) : p < .6 ? (-.55 + 1.75 * ((p - .2) / .4) ** .7) * amp : 1.2 * amp * (1 - (p - .6) / .4) ** 2;
    const twist = sw <= 0 ? 0 : Math.sin(p * Math.PI) * .45 * amp;
    pad.rotation.set(-s * (.18 + arc * .75), (who === 'you' ? Math.PI : 0) + (pad.position.x > (S.state === 'live' ? P.x : 0) ? .25 : -.25) * s + twist * s, (pad.position.x - P.x) * .15 * s - twist * .4);
    inner.position.y = sw > 0 ? Math.sin(p * Math.PI) * .06 : 0;
  }
}

function render(dt) {
  ball.position.copy(P); ball.rotation.x += V.z * dt * 4; ball.rotation.z -= V.x * dt * 4;
  blob.position.set(P.x, .006, P.z); const k = THREE.MathUtils.clamp(1 - P.y / 4, .25, 1); blob.scale.setScalar(.7 + (1 - k)); blob.material.opacity = .35 * k;
  hist.unshift(P.clone()); if (hist.length > 30) hist.pop();
  const fast = Math.hypot(V.x, V.z) > 12 && S.state === 'live';
  trail.forEach((m, i) => { const h = hist[(i + 1) * 2]; if (h) m.position.copy(h); m.material.opacity = fast && fx ? .5 * (1 - i / trail.length) : 0; });
  tickFx(dt); tickDust(dt); tickSweep(dt); tickGlow(dt);
  if (shake > 0) { shake = Math.max(0, shake - dt); const a = shake * 14; canvas.style.transform = `translate(${(rnd() - .5) * a}px,${(rnd() - .5) * a}px)`; box.querySelectorAll('img.plate').forEach(im => im.style.transform = canvas.style.transform); if (!shake) { canvas.style.transform = ''; box.querySelectorAll('img.plate').forEach(im => im.style.transform = ''); } }
  renderer.render(scene, camera);
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(1 / 30, (now - lastT) / 1000); lastT = now;
  update(dt, now); render(dt);
  requestAnimationFrame(loop);
}
function start() { if (running) return; running = true; lastT = performance.now(); requestAnimationFrame(loop); }
function stop() { running = false; }

new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (reduced) return; visible ? start() : stop(); }, { threshold: .02 }).observe(hero);
document.addEventListener('visibilitychange', () => { if (reduced) return; document.hidden ? stop() : (visible && start()); });

await loadPlates();
frameCamera();
setupServe();
P.copy(servePos());
if (reduced) {
  // static frame: ball mid-flight over the net
  P.set(.6, 1.6, -.5); youPad.position.set(.4, .85, 6.2); aiPad.position.set(-.8, .85, -6.2); update(0, 0); render(0);
  flash('Motion reduced', 'Click the court to play anyway', 0);
} else start();
requestAnimationFrame(() => $('veil').classList.add('gone'));
if (!reduced) setTimeout(() => { sweepT = 0; }, document.documentElement.classList.contains('loading') ? 3200 : 500);
Promise.all([...box.querySelectorAll('img.plate')].map(im => im.decode().catch(() => { }))).then(() => { window.__gpMode = mode; dispatchEvent(new CustomEvent('gp-ready', { detail: mode })); });
updateBoard();
window.__game = { S, P, V, youPad, aiPad, engage, smash: () => smashHit(new THREE.Vector3(.5, .03, -2)) };
