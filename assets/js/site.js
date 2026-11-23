/* GO PLAY core interactions. Designed by peaknpixel. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasG = !!window.gsap;
  if (hasG) gsap.registerPlugin(ScrollTrigger);
  const kotaHour = () => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); return +p.find(x => x.type === 'hour').value + (+p.find(x => x.type === 'minute').value) / 60; };

  /* ---------- day / night (same switch as the interactive build) ---------- */
  const sw = $('#modeBtn');
  const getMode = () => window.__getMode ? window.__getMode() : (root.classList.contains('night') ? 'night' : 'day');
  function sync(m) { if (!sw) return; sw.setAttribute('aria-checked', m === 'night'); sw.setAttribute('aria-label', m === 'night' ? 'Switch to day' : 'Switch to night'); const tc = $('meta[name=theme-color]'); if (tc) tc.content = m === 'night' ? '#060B16' : '#F5F2EA'; }
  function setMode(m) {
    if (window.__setMode) window.__setMode(m);
    else { root.classList.toggle('night', m === 'night'); try { localStorage.setItem('gp-mode', m); } catch (e) { } dispatchEvent(new Event('gp-theme')); }
    sync(m);
  }
  sync(getMode());
  addEventListener('gp-mode-ui', e => sync(e.detail));
  sw && sw.addEventListener('click', () => {
    const next = getMode() === 'day' ? 'night' : 'day';
    sync(next);
    const r = $('.dn-knob', sw).getBoundingClientRect();
    root.style.setProperty('--vx', (r.left + r.width / 2) + 'px'); root.style.setProperty('--vy', (r.top + r.height / 2) + 'px');
    if (document.startViewTransition && !reduced) { root.classList.add('vt'); const t = document.startViewTransition(() => setMode(next)); t.finished.finally(() => root.classList.remove('vt')); }
    else setMode(next);
  });

  /* ---------- menu + mega menu ---------- */
  const mb = $('.menubtn');
  function menu(on) { root.classList.toggle('menu-open', on); if (mb) { mb.setAttribute('aria-expanded', on); const t = $('.mtxt', mb); if (t) t.textContent = on ? 'Close' : 'Menu'; } if (lenis) on ? lenis.stop() : lenis.start(); }
  $$('.mm-list a').forEach(a => a.addEventListener('pointerenter', () => { const i = +a.dataset.i; $$('.mm-prev img').forEach((im, j) => im.classList.toggle('on', j === i)); const c = $('#mmCap'); if (c) c.textContent = a.firstChild && a.childNodes[1] ? a.childNodes[1].textContent : ''; }));
  mb && mb.addEventListener('click', () => menu(!root.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') { menu(false); $$('.dd').forEach(d => d.classList.remove('open')); } });
  $$('.dd').forEach(dd => {
    const b = $('button', dd); let t;
    const open = on => { clearTimeout(t); dd.classList.toggle('open', on); b.setAttribute('aria-expanded', on); };
    b.addEventListener('click', () => open(!dd.classList.contains('open')));
    if (!touch) { dd.addEventListener('pointerenter', () => open(true)); dd.addEventListener('pointerleave', () => { t = setTimeout(() => open(false), 180); }); }
    document.addEventListener('click', e => { if (!dd.contains(e.target)) open(false); });
  });

  /* ---------- smooth scroll on desktop only ---------- */
  let lenis = null;
  if (!touch && !reduced && window.Lenis && hasG) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true }); window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const id = a.getAttribute('href'); if (id.length < 2) return; const t = $(id); if (!t) return; e.preventDefault(); menu(false); lenis ? lenis.scrollTo(t, { duration: 1.3, offset: -80 }) : t.scrollIntoView({ behavior: 'smooth' }); }));

  /* ---------- nav: hide on scroll down, adapt over dark heroes ---------- */
  const nav = $('.nav'); let lastY = 0;
  const darkHero = $('.hero:not(.hero-a), .shero');
  function navState() { const y = scrollY; if (!root.classList.contains('menu-open') && !$('.dd.open')) nav.classList.toggle('hide', y > lastY && y > 240); lastY = y; nav.classList.toggle('on-dark', !!darkHero && y < darkHero.offsetHeight - 80); }
  addEventListener('scroll', navState, { passive: true }); navState();

  /* ---------- page transitions ---------- */
  const curtain = $('.curtain');
  $$('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if (!h || h.startsWith('#') || a.target === '_blank' || /^(https?:|mailto:|tel:)/.test(h)) return;
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); menu(false);
      $('b span', curtain).textContent = a.dataset.go || 'Go Play';
      try { sessionStorage.setItem('gp-trans', '1'); } catch (er) { }
      if (!hasG || reduced) { location.href = h; return; }
      gsap.set(curtain, { yPercent: 100 });
      gsap.timeline({ onComplete: () => { location.href = h; } }).to(curtain, { yPercent: 0, duration: .7, ease: 'expo.inOut' }).from($('b span', curtain), { yPercent: 110, duration: .5, ease: 'expo.out' }, '-=.3');
    });
  });
  addEventListener('pageshow', e => { if (e.persisted) { root.classList.remove('entering'); hasG && gsap.set(curtain, { yPercent: 100 }); } });

  /* ---------- loader: the ball bounces in, lands, and becomes the GO PLAY logo ---------- */
  function intro() { document.body.classList.add('ready'); dispatchEvent(new Event('gp-intro')); }
  function runLoader() {
    const L = $('.loader'), ball = $('.ld-ball', L), sh = $('.ld-shadow', L), word = $('.ld-word', L), slot = $('.ld-slot', word);
    const W = innerWidth, H = innerHeight, floorY = H * .58, r = 32, land = floorY - r;
    const sr = slot.getBoundingClientRect(); const tx = sr.left + sr.width / 2, ty = sr.top + sr.height / 2, sc = sr.width / 64;
    gsap.set(ball, { x: -90, y: H * .12 }); gsap.set(sh, { x: -90, opacity: .25, scale: .5 });
    const sync = () => { const x = gsap.getProperty(ball, 'x'), y = gsap.getProperty(ball, 'y'); const k = Math.max(.25, 1 - (land - y) / (H * .5)); gsap.set(sh, { x, scale: k, opacity: .55 * k }); };
    gsap.ticker.add(sync);
    const tl = gsap.timeline({ onComplete: () => gsap.ticker.remove(sync) });
    const squash = (k = .75) => tl.to(ball, { scaleY: k, scaleX: 2 - k, duration: .07, yoyo: true, repeat: 1, transformOrigin: '50% 100%', ease: 'power1.out' });
    const hop = (x, peak, dur, yEnd = land) => {
      tl.to(ball, { x, duration: dur, ease: 'none' });
      tl.to(ball, { y: Math.min(yEnd, land) - peak, duration: dur * .5, ease: 'power2.out' }, '<');
      tl.to(ball, { y: yEnd, duration: dur * .5, ease: 'power2.in' }, '>');
    };
    // 1) drop in from the left and bounce to the centre
    tl.to(ball, { x: W * .22, duration: .5, ease: 'none' }).to(ball, { y: land, duration: .5, ease: 'power2.in' }, '<'); squash();
    hop(W * .5, H * .2, .5); squash();
    // 2) on to the right, then back to the centre
    hop(W * .8, H * .16, .45); squash();
    hop(W * .5, H * .22, .5);
    // 3) land hard: the press creates the logo
    tl.to(ball, { scaleY: .55, scaleX: 1.45, duration: .09, transformOrigin: '50% 100%' })
      .to($$('.lt span', word), { scale: 1, duration: .6, ease: 'back.out(2.2)', stagger: .045 }, '<')
      .to(ball, { scaleY: 1, scaleX: 1, duration: .12 });
    // 4) bounce away to the left, then back into the O
    hop(W * .18, H * .2, .5); squash();
    tl.to(ball, { x: tx, duration: .6, ease: 'none' })
      .to(ball, { y: Math.min(ty, land) - H * .22, duration: .3, ease: 'power2.out' }, '<')
      .to(ball, { y: ty, scale: sc, duration: .3, ease: 'power2.in' }, '>')
      .to(sh, { opacity: 0, duration: .2 }, '<')
      // 5) a few small settling bounces in place
      .to(ball, { y: ty - 16, duration: .12, ease: 'power2.out' }).to(ball, { y: ty, duration: .12, ease: 'power2.in' })
      .to(ball, { y: ty - 5, duration: .07, ease: 'power2.out' }).to(ball, { y: ty, duration: .07, ease: 'power2.in' })
      .to(ball, { rotation: 0, duration: .01 })
      .to('.ld-meta', { opacity: .7, duration: .4 }, '<')
      .to(L, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=.45')
      .add(() => { root.classList.remove('loading'); L.remove(); intro(); }, '-=.5');
    try { sessionStorage.setItem('gp-seen', '1'); } catch (e) { }
  }
  function startIntro() {
    const L = $('.loader');
    if (root.classList.contains('loading') && L && hasG && !reduced) runLoader();
    else {
      L && L.remove(); root.classList.remove('loading');
      if (root.classList.contains('entering') && hasG && !reduced) {
        gsap.set(curtain, { yPercent: 0 }); root.classList.remove('entering');
        gsap.to(curtain, { yPercent: -100, duration: .9, ease: 'expo.inOut', delay: .05, onComplete: () => gsap.set(curtain, { yPercent: 100 }) });
        setTimeout(intro, 300);
      } else { root.classList.remove('entering'); intro(); }
    }
    try { sessionStorage.removeItem('gp-trans'); } catch (e) { }
  }
  if (document.readyState === 'complete') startIntro(); else addEventListener('load', startIntro);
  setTimeout(() => { if (root.classList.contains('loading') || root.classList.contains('entering')) { root.classList.remove('loading', 'entering'); $('.loader') && $('.loader').remove(); intro(); } }, 9000);

  /* ---------- cursor ---------- */
  if (!touch && hasG) {
    const c = $('.cursor'); if (c) {
      const dot = $('.dot', c), ring = $('.ring', c);
      const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
      const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
      addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); c.classList.toggle('hide', !!e.target.closest('#stagebox')); }, { passive: true });
      $$('[data-cursor]').forEach(el => { el.addEventListener('pointerenter', () => { c.classList.add('big'); ring.textContent = el.dataset.cursor; }); el.addEventListener('pointerleave', () => { c.classList.remove('big'); ring.textContent = ''; }); });
    }
  }
  /* ---------- magnetic buttons ---------- */
  if (!touch && hasG) $$('.magnetic').forEach(el => {
    const xT = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), yT = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; xT((x - r.width / 2) * .25); yT((y - r.height / 2) * .35); el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px'); });
    el.addEventListener('pointerleave', () => { xT(0); yT(0); });
  });

  /* ---------- live open status (Kota time) ---------- */
  $$('[data-live]').forEach(el => {
    const h = kotaHour(), open = h >= 6 && h < 24, courts = h >= 5 || h < 1;
    const txt = open ? 'Open now · club closes 12 AM' : courts ? 'Courts open till 1 AM · club opens 6 AM' : 'Closed now · courts open 5 AM';
    el.classList.toggle('closed', !open && !courts); const s = $('span', el) || el; s.textContent = txt;
  });

  /* ---------- sports rail: drag, arrows, progress ---------- */
  $$('.rail-wrap').forEach(w => {
    const rail = $('.rail', w), prev = $('.prev', w), next = $('.next-a', w), bar = $('.rail-prog i', w);
    const step = () => ($('.scard', rail)?.offsetWidth || 300) + 20;
    const upd = () => { const max = rail.scrollWidth - rail.clientWidth; const p = max > 0 ? rail.scrollLeft / max : 0; if (bar) { bar.style.width = Math.max(12, rail.clientWidth / rail.scrollWidth * 100) + '%'; bar.style.left = p * (100 - parseFloat(bar.style.width)) + '%'; } if (prev) prev.disabled = rail.scrollLeft < 4; if (next) next.disabled = rail.scrollLeft > max - 4; };
    prev && prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next && next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    // mouse drag (touch uses native swipe)
    let down = null, moved = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, s: rail.scrollLeft }; moved = 0; });
    addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - down.x; moved = Math.abs(d); if (moved > 6) rail.classList.add('drag'); rail.scrollLeft = down.s - d; });
    addEventListener('pointerup', () => { if (!down) return; down = null; setTimeout(() => rail.classList.remove('drag'), 0); });
    rail.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    // keyboard
    rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') rail.scrollBy({ left: step(), behavior: 'smooth' }); if (e.key === 'ArrowLeft') rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
  });

  /* ---------- slot picker (WhatsApp booking) ---------- */
  $$('.slot-strip').forEach(strip => {
    const out = strip.parentElement.querySelector('.slot-out'), sel = out && $('.sel', out), go = out && $('a', out), sport = strip.dataset.sport;
    let tiers = []; try { tiers = JSON.parse(strip.dataset.tiers || '[]'); } catch (e) { }
    const priceAt = h => { const t = tiers.find(([a, b]) => h >= a && h < b); return t ? t[2] : null; };
    const low = tiers.length > 1 ? Math.min(...tiers.map(t => t[2])) : -1;
    const inr = n => '₹' + n.toLocaleString('en-IN');
    const start = +strip.dataset.start || 5, end = +strip.dataset.end || 25;
    for (let h = start; h < end; h++) {
      const hh = h % 24, lab = `${((hh + 11) % 12) + 1}`, ap = hh < 12 ? 'AM' : 'PM';
      const pr = priceAt(h);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'slot' + (pr === low ? ' happy' : '');
      b.setAttribute('aria-label', `${lab} ${ap}` + (pr ? `, ${inr(pr)} per hour` : ''));
      b.innerHTML = `<small>${ap}</small><b>${lab}</b>` + (pr ? `<span class="pr">${inr(pr)}<i>per hour</i></span>` : `<span class="pr"><i>Members</i></span>`);
      b.addEventListener('click', () => {
        $$('.slot', strip).forEach(x => x.classList.remove('on')); b.classList.add('on');
        const nx = (hh + 1) % 24, txt = `${lab} ${ap} – ${((nx + 11) % 12) + 1} ${nx < 12 ? 'AM' : 'PM'}`;
        if (sel) { sel.textContent = txt + (pr ? ` · ${inr(pr)}` : ''); hasG && gsap.fromTo(sel, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: 'expo.out' }); }
        if (go) go.href = `https://wa.me/919256671777?text=${encodeURIComponent(`Hi Go Play, I'd like to book ${sport} today, ${txt}${pr ? ` (${inr(pr)})` : ''}.`)}`;
      });
      strip.appendChild(b);
    }
  });

  /* ---------- slot strip: wheel, drag, arrows and a progress bar (works with mouse, trackpad and touch) ---------- */
  $$('.slot-wrap').forEach(w => {
    const st = $('.slot-strip', w), pv = $('.sarrow.sprev', w), nx = $('.sarrow.snext', w), bar = w.parentElement.querySelector('.slot-prog i');
    const max = () => st.scrollWidth - st.clientWidth;
    const upd = () => { const m = max(), x = st.scrollLeft; if (pv) pv.disabled = x < 4; if (nx) nx.disabled = x > m - 4; if (bar) { const k = st.clientWidth / st.scrollWidth; bar.style.width = (k * 100) + '%'; bar.style.transform = `translateX(${m ? x / m * (1 / k - 1) * 100 : 0}%)`; } };
    const go = d => { const to = Math.max(0, Math.min(max(), st.scrollLeft + d)); hasG ? gsap.to(st, { scrollLeft: to, duration: .6, ease: 'power3.out', onUpdate: upd }) : st.scrollTo({ left: to, behavior: 'smooth' }); };
    pv && pv.addEventListener('click', () => go(-st.clientWidth * .7)); nx && nx.addEventListener('click', () => go(st.clientWidth * .7));
    st.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    // vertical wheel moves the hours sideways until the end, then the page scrolls on
    st.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; const m = max(), x = st.scrollLeft; if ((e.deltaY > 0 && x < m - 1) || (e.deltaY < 0 && x > 1)) { e.preventDefault(); st.scrollLeft = x + e.deltaY; } else if (lenis) { e.preventDefault(); lenis.scrollTo(scrollY + e.deltaY, { immediate: false }); } }, { passive: false });
    // mouse drag
    let down = false, sx = 0, sl = 0, moved = 0;
    st.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = st.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - sx; moved = Math.max(moved, Math.abs(d)); if (moved > 6) st.classList.add('drag'); st.scrollLeft = sl - d; });
    addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => st.classList.remove('drag'), 0); });
    st.addEventListener('click', e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } moved = 0; }, true);
  });

  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = t, 1600); } catch (e) { } }));
  /* ---------- forms -> WhatsApp ---------- */
  $$('form[data-wa]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); const d = new FormData(f), L = ['Hi Go Play,'];
    for (const [k, v] of d.entries()) if (String(v).trim()) L.push(`${k}: ${v}`);
    window.open('https://wa.me/919256671777?text=' + encodeURIComponent(L.join('\n')), '_blank', 'noopener');
  }));

  if (!hasG) { $$('[data-reveal]').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); return; }

  /* ---------- titles fit ---------- */
  function fitTitles() { $$('.shero h1, .next h2').forEach(h => { h.style.fontSize = ''; const max = h.parentElement.clientWidth; let fs = parseFloat(getComputedStyle(h).fontSize), n = 0; const W = () => Math.max(h.scrollWidth, ...$$('.ln>span', h).map(x => x.offsetWidth)); while (W() > max + 2 && n++ < 40) { fs *= .96; h.style.fontSize = fs + 'px'; } }); }
  fitTitles(); addEventListener('resize', fitTitles); document.fonts && document.fonts.ready.then(fitTitles);

  /* ---------- reveals ---------- */
  function reveals() {
    $$('.ln>span').forEach(s => { if (!s.closest('[data-hero]')) gsap.from(s, { yPercent: 115, rotate: 3, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: s.parentElement, start: 'top 92%' } }); });
    ScrollTrigger.batch('[data-reveal]', { start: 'top 92%', onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08 }) });
    $$('.mask').forEach(m => {
      const img = $('img', m); if (!img) return;
      gsap.fromTo(m, { clipPath: 'inset(14% 8% 14% 8% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: m, start: 'top 95%', end: 'top 40%', scrub: true } });
      gsap.fromTo(img, { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-count]').forEach(el => { const end = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: 0 }, suf = el.dataset.suf || ''; ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'expo.out', onUpdate: () => el.textContent = (dec ? o.v.toFixed(dec) : Math.round(o.v).toLocaleString('en-IN')) + suf }) }); });
    $$('.marq-in, .trust-in').forEach(m => { m.innerHTML += m.innerHTML; const tw = gsap.to(m, { xPercent: -50, duration: m.classList.contains('trust-in') ? 40 : 24, ease: 'none', repeat: -1 }); ScrollTrigger.create({ trigger: m, start: 'top bottom', end: 'bottom top', onToggle: s => s.isActive ? tw.play() : tw.pause(), onUpdate: s => gsap.to(tw, { timeScale: s.direction * Math.min(4, 1 + Math.abs(s.getVelocity()) / 600), duration: .3, overwrite: true }) }); });
    $$('.foot .big .fl').forEach((s, i) => gsap.from(s, { yPercent: 60, opacity: 0, duration: 1, ease: 'expo.out', delay: i * .06, scrollTrigger: { trigger: '.foot .big', start: 'top 96%' } }));
    $$('.gal-track').forEach(t => gsap.fromTo(t, { x: 0 }, { x: () => -Math.max(0, t.scrollWidth - innerWidth) * .7, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }));
    $$('.shero .bg').forEach(bg => gsap.to(bg, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: bg.parentElement, start: 'top top', end: 'bottom top', scrub: true } }));
    const hero = $('.hero'); if (hero) gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } }).to('.hero-copy', { yPercent: -30, autoAlpha: 0, ease: 'none' }, 0).to('.par', { scale: 1.1, ease: 'none' }, 0);
  }
  addEventListener('gp-intro', () => {
    gsap.from($$('[data-hero] .ln>span'), { yPercent: 115, rotate: 4, duration: 1.4, ease: 'expo.out', stagger: .09 });
    gsap.from('[data-hero-fade]', { opacity: 0, y: 24, duration: 1.2, ease: 'expo.out', delay: .35, stagger: .08 });
  }, { once: true });

  /* ---------- fly-over (Blender frames scrubbed by scroll) ---------- */
  function fly() {
    const sec = $('.fly'); if (!sec) return;
    const c = $('canvas', sec), x = c.getContext('2d'), N = +sec.dataset.frames || 36, imgs = [], steps = $$('.fly-step', sec), bar = $('.fly-bar i', sec);
    for (let i = 0; i < N; i++) { const im = new Image(); im.decoding = 'async'; im.src = `assets/fly/f${String(i).padStart(2, '0')}.webp`; imgs.push(im); }
    let p = 0, cur = -1;
    const size = () => { const d = Math.min(devicePixelRatio, 2); c.width = c.clientWidth * d; c.height = c.clientHeight * d; draw(); };
    function draw() { const f = Math.min(N - 1, Math.round(p * (N - 1))); let im = imgs[f]; if (!im.complete || !im.naturalWidth) im = imgs.find(i => i.complete && i.naturalWidth); if (!im) return; const s = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight); const w = im.naturalWidth * s, h = im.naturalHeight * s; x.drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h); }
    imgs[0].onload = draw; addEventListener('resize', size); size();
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { p = s.progress; draw(); bar.style.transform = `scaleX(${p})`; const k = Math.min(steps.length - 1, Math.floor(p * steps.length)); if (k !== cur) { steps.forEach((st, j) => gsap.to(st, { opacity: j === k ? 1 : 0, y: j === k ? 0 : (j < k ? -30 : 30), duration: .6, ease: 'expo.out', overwrite: true })); cur = k; } } });
    gsap.set(steps[0], { opacity: 1 }); cur = 0;
  }

  /* ---------- the day dial: a 24-hour clock that turns with scroll ---------- */
  function day() {
    const sec = $('.day'); if (!sec) return;
    const pin = $('.day-pin', sec), sky = $('.day-sky', sec), stars = $('.day-stars', sec), orb = $('.dial-orb', sec), prog = $('.dial .prog', sec), dial = $('.dial', sec);
    const clock = $('.day-clock b', sec), ampm = $('.day-clock small', sec), acts = $$('.day-act', sec), figs = $$('.dial-photo figure', sec), chips = $$('.day-chips button', sec);
    const hours = acts.map(a => +a.dataset.h);
    const SKY = [[5, '#1A2246', '#D8946E', '#F4F1EA'], [7, '#FFC98A', '#F6E7CF', '#0A1222'], [11, '#9FD3F5', '#EEF3EA', '#0A1222'], [15, '#86C6F0', '#F1EFE3', '#0A1222'], [18, '#F59B5E', '#F7D2A0', '#0A1222'], [20, '#2A2F63', '#B9636A', '#F4F1EA'], [23, '#070B1E', '#141B3A', '#EEF1F7'], [25.5, '#03050C', '#0A0F22', '#EEF1F7']];
    const lc = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const f = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255]; const x = f(A), y = f(B); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
    const R = 140, C = 2 * Math.PI * R; prog.style.strokeDasharray = C;
    let cur = -1;
    function upd(p) {
      const H = 5 + p * 20.5;
      let i = 0; while (i < SKY.length - 2 && H > SKY[i + 1][0]) i++;
      const A = SKY[i], B = SKY[i + 1], t = Math.min(1, Math.max(0, (H - A[0]) / (B[0] - A[0])));
      const top = lc(A[1], B[1], t), bot = lc(A[2], B[2], t), ink = lc(A[3], B[3], t);
      sky.style.background = `radial-gradient(120% 80% at 50% 110%, ${bot}, ${top})`; sec.style.background = bot; pin.style.color = ink; pin.style.setProperty('--dsk2', top);
      const night = H > 19.5 || H < 6.2; stars.style.opacity = night ? Math.min(1, (H > 19.5 ? H - 19.5 : 6.2 - H) / 1.5) : 0;
      // orb travels around the dial: angle from hour (0h at top)
      const ang = ((H % 24) / 24) * Math.PI * 2 - Math.PI / 2, rad = dial.offsetWidth / 2 * (R / 160);
      orb.style.transform = `translate(${Math.cos(ang) * rad}px, ${Math.sin(ang) * rad}px)`;
      orb.style.background = night ? 'radial-gradient(circle at 35% 35%, #fff, #D9DEEA 55%, #9AA6C8)' : 'radial-gradient(circle, #FFF8D8 0%, #FFD36A 45%, #FFA83A 70%)';
      orb.style.boxShadow = night ? '0 0 50px 8px rgba(200,215,255,.35)' : '0 0 80px 24px rgba(255,190,90,.65)';
      prog.style.strokeDashoffset = C * (1 - p * 20.5 / 24);
      const hh = Math.floor(H) % 24, mm = Math.floor((H % 1) * 60 / 15) * 15;
      clock.textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`; ampm.textContent = hh < 12 ? 'AM' : 'PM';
      let k = 0; hours.forEach((h, j) => { if (H >= h - .25) k = j; });
      if (k !== cur) {
        acts.forEach((a, j) => gsap.to(a, { opacity: j === k ? 1 : 0, y: j === k ? 0 : (j < k ? -24 : 24), duration: .6, ease: 'expo.out', overwrite: true }));
        figs.forEach((f, j) => f.classList.toggle('on', j === k)); chips.forEach((c, j) => c.classList.toggle('on', j === k)); cur = k;
      }
    }
    const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => upd(s.progress), onRefresh: s => upd(s.progress) });
    upd(0);
    chips.forEach((c, j) => c.addEventListener('click', () => { const p = (hours[j] - 5) / 20.5 + .005; const y = st.start + (st.end - st.start) * p; lenis ? lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: 'smooth' }); }));
  }

  /* ---------- tilt cards ---------- */
  if (!touch) $$('[data-tilt]').forEach(el => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: .6 }), ry = gsap.quickTo(el, 'rotationY', { duration: .6 });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; ry((x - .5) * 8); rx((.5 - y) * 8); el.style.setProperty('--sx', x * 100 + '%'); el.style.setProperty('--sy', y * 100 + '%'); });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  /* ---------- programme hover image ---------- */
  const pimg = $('.prog-img');
  if (pimg && !touch) {
    const xT = gsap.quickTo(pimg, 'x', { duration: .6, ease: 'power3' }), yT = gsap.quickTo(pimg, 'y', { duration: .6, ease: 'power3' });
    addEventListener('pointermove', e => { xT(e.clientX + 24); yT(e.clientY - 150); }, { passive: true });
    $$('.prog').forEach(p => { p.addEventListener('pointerenter', () => { $('img', pimg).src = p.dataset.img; gsap.to(pimg, { opacity: 1, scale: 1, rotate: -4, duration: .5, ease: 'expo.out' }); }); p.addEventListener('pointerleave', () => gsap.to(pimg, { opacity: 0, scale: .6, rotate: 0, duration: .4 })); });
  }

  /* ---------- faq accordion ---------- */
  $$('.faq details').forEach(d => { const s = $('summary', d), a = $('.ans', d); s.addEventListener('click', e => { e.preventDefault(); if (d.open) gsap.to(a, { height: 0, duration: .5, ease: 'expo.inOut', onComplete: () => { d.open = false; a.style.height = ''; } }); else { d.open = true; gsap.fromTo(a, { height: 0 }, { height: 'auto', duration: .7, ease: 'expo.out' }); } }); });

  /* ---------- sports showcase: horizontal scroll pinned to vertical scroll (every device) ---------- */
  function showcase() {
    const sec = $('.showcase'); if (!sec) return;
    const track = $('.sc-track', sec), bar = $('.sc-prog i', sec), n = $('#scN'), panels = $$('.panel', sec);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 20);
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: s => { bar.style.transform = `scaleX(${s.progress})`; const k = Math.min(panels.length - 1, Math.round(s.progress * (panels.length - 1))); n.textContent = String(k + 1).padStart(2, '0'); } } });
    panels.forEach(p => { const im = $('.pbg', p) || $('.pimg img', p); if (im) gsap.fromTo(im, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
      const ob = $('.obj', p); if (ob) gsap.fromTo(ob, { rotate: -25, y: 40 }, { rotate: 15, y: -20, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }); });
  }
  /* ---------- animated reviews ---------- */
  function reviewsAnim() {
    $$('.rv-row').forEach(r => { const d = +r.dataset.dir || 1; gsap.set(r, { xPercent: d > 0 ? 0 : -50 }); const tw = gsap.to(r, { xPercent: d > 0 ? -50 : 0, duration: 38, ease: 'none', repeat: -1 }); r.addEventListener('pointerenter', () => tw.timeScale(.15)); r.addEventListener('pointerleave', () => tw.timeScale(1)); ScrollTrigger.create({ trigger: r, start: 'top bottom', end: 'bottom top', onToggle: st => st.isActive ? tw.play() : tw.pause() }); });
    $$('.review .stars').forEach(st => ScrollTrigger.create({ trigger: st, start: 'top 95%', once: true, onEnter: () => st.classList.add('go') }));
  }
  /* ---------- footer: the ball bounces in and becomes the O ---------- */
  function footBall() {
    const b = $('.foot .fball'), sh = $('.foot .fshadow'); if (!b) return;
    const drop = () => { const H = b.offsetHeight; const tl = gsap.timeline();
      tl.set(b, { y: -H * 2.6, scaleX: .9, scaleY: 1.1, rotation: -90 }).set(sh, { scaleX: .3, opacity: .1 })
        .to(b, { y: 0, rotation: 0, duration: .55, ease: 'power2.in' }).to(sh, { scaleX: 1, opacity: 1, duration: .55, ease: 'power2.in' }, '<')
        .to(b, { scaleX: 1.25, scaleY: .72, duration: .08, transformOrigin: '50% 100%' })
        .to(b, { scaleX: .94, scaleY: 1.06, y: -H * 1.1, duration: .32, ease: 'power2.out' }).to(sh, { scaleX: .55, opacity: .4, duration: .32 }, '<')
        .to(b, { scaleX: 1, scaleY: 1, y: 0, duration: .3, ease: 'power2.in' }).to(sh, { scaleX: 1, opacity: 1, duration: .3 }, '<')
        .to(b, { scaleX: 1.14, scaleY: .86, duration: .07, transformOrigin: '50% 100%' }).to(b, { scaleX: 1, scaleY: 1, y: -H * .32, duration: .2, ease: 'power2.out' })
        .to(b, { y: 0, duration: .2, ease: 'power2.in' }).to(b, { y: -H * .08, duration: .1, ease: 'power1.out' }).to(b, { y: 0, duration: .1, ease: 'power1.in' });
      return tl; };
    gsap.set(b, { y: -9999 });
    ScrollTrigger.create({ trigger: '.foot .big', start: 'top 95%', once: true, onEnter: drop });
    $('.foot .fo').addEventListener('pointerenter', () => { if (!gsap.isTweening(b)) drop(); });
    $$('.foot .sprites img').forEach((im, i) => gsap.to(im, { y: i % 2 ? -30 : 30, rotate: '+=12', duration: 3 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  }
  /* ---------- header logo: the O bounces in its own place once the page opens ---------- */
  function logoBall() {
    const o = $('.nav .gp .o'); if (!o) return;
    gsap.timeline({ delay: .3 }).fromTo(o, { y: '-1.4em', scale: .6 }, { y: 0, scale: 1, duration: .45, ease: 'power2.in' })
      .to(o, { scaleX: 1.25, scaleY: .75, duration: .07, yoyo: true, repeat: 1, transformOrigin: '50% 100%' })
      .to(o, { y: '-.5em', duration: .22, ease: 'power2.out' }).to(o, { y: 0, duration: .22, ease: 'power2.in' })
      .to(o, { y: '-.15em', duration: .1, ease: 'power1.out' }).to(o, { y: 0, duration: .1, ease: 'power1.in' });
  }
  function cta() {
    const im = $('.cta2 .bgimg'); if (!im) return;
    gsap.fromTo(im, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: '.cta2', start: 'top bottom', end: 'bottom top', scrub: true } });
    const ob = $('.cta2 .ob'); if (ob) ScrollTrigger.create({ trigger: '.cta2 h2', start: 'top 70%', once: true, onEnter: () => gsap.timeline().fromTo(ob, { y: '-1.6em' }, { y: 0, duration: .5, ease: 'bounce.out' }) });
  }
  addEventListener('gp-intro', () => { reveals(); showcase(); fly(); day(); reviewsAnim(); footBall(); logoBall(); cta(); ScrollTrigger.refresh(); }, { once: true });
})();
