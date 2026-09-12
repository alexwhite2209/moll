/* Молл Строй — site logic: preloader, scene captions, circular catalog, price list, calculator, reviews. */
(function () {
  'use strict';
  const CAT = window.CATALOG, C = window.CONTENT;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const nf = new Intl.NumberFormat('ru-RU');
  const money = v => nf.format(Math.round(v)) + ' ₽';
  const fmt = (v, d = 2) => nf.format(+(+v).toFixed(d));
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const TEL = 'tel:' + C.company.tel;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* цены берём из data/ceny.js — правится только он; 0 значит «нет в наличии» */
  const priceKey = (p, v) => [p.name].concat(p.pick.map(a => v.a[a]).filter(Boolean)).join(' · ');
  if (window.CENY) {
    let miss = 0;
    CAT.products.forEach(p => p.variants.forEach(v => {
      const val = CENY[priceKey(p, v)];
      if (typeof val === 'number') v.price = val; else miss++;
    }));
    if (miss) console.warn('в data/ceny.js нет цены для позиций:', miss);
  }
  if (window.CENY_DATE) CAT.updated = CENY_DATE;
  CAT.products.forEach(p => { p.variants = p.variants.filter(v => v.price > 0); });
  CAT.products = CAT.products.filter(p => p.variants.length);
  CAT.products.forEach(p => { const pr = p.variants.map(v => v.price).filter(v => v > 0); p.min = Math.min(...pr); p.max = Math.max(...pr); });
  const byId = Object.fromEntries(CAT.products.map(p => [p.id, p]));
  const catName = id => (CAT.categories.find(c => c.id === id) || {}).name || '';
  const inCat = id => CAT.products.filter(p => p.cats.includes(id));
  const UNIT_WORD = { 'шт': 'за штуку', 'м²': 'за м²', 'пог. м': 'за погонный метр', 'м³': 'за м³', 'лист': 'за лист', 'уп.': 'за упаковку', 'плита': 'за плиту', 'рулон': 'за рулон', 'канистра': 'за канистру' };
  const range = p => p.min === p.max ? money(p.min) : `${nf.format(p.min)}–${money(p.max)}`;
  /* цены выводим цифрами-одометром: разметка + CountUp.scan() после вставки */
  const cu = (v, suffix) => `<span class="js-cu" data-to="${Math.round(v)}"${suffix ? ` data-suffix="${suffix}"` : ''}></span>`;
  const moneyCU = v => cu(v, ' ₽');
  const rangeCU = p => p.min === p.max ? moneyCU(p.min) : `${cu(p.min)}–${moneyCU(p.max)}`;
  const scanCU = root => { if (window.CountUp) CountUp.scan(root); };
  const shortName = s => String(s).split(/[,(\/]/)[0].trim().split(' ').slice(0, 2).join(' ');

  /* ---------- preloader ---------- */
  const t0 = performance.now();
  const ring = $('#plRing'), pct = $('#plPct'), pre = $('#preloader');
  const state = { fonts: 0, scene: 0, imgs: 0 };
  let shown = 0, finished = false;
  function paint() {
    if (!pre) return;
    const v = 0.15 * state.fonts + 0.7 * state.scene + 0.15 * state.imgs;
    shown = Math.max(shown, v);
    ring.style.strokeDashoffset = (515.2 * (1 - shown)).toFixed(1);
    pct.textContent = Math.round(shown * 100) + '%';
    if (shown >= 0.999) finish();
  }
  function finish() {
    if (finished) return; finished = true;
    const wait = Math.max(0, 1100 - (performance.now() - t0));
    setTimeout(() => {
      pre.classList.add('done'); document.body.classList.remove('loading');
      setTimeout(() => pre.remove(), 800);
    }, wait);
  }
  if (pre) {
    document.body.classList.add('loading');
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { state.fonts = 1; paint(); });
    const warm = CAT.categories.map(c => c.img);
    let got = 0;
    warm.forEach(src => { const im = new Image(); im.onload = im.onerror = () => { got++; state.imgs = got / warm.length; paint(); }; im.src = src; });
    setTimeout(() => { state.fonts = state.imgs = state.scene = 1; paint(); }, 15000); // never trap the visitor
  }

  /* ---------- scene captions (home page) ---------- */
  const steps = $('#steps');
  if (steps) C.scenes.forEach((s, i) => {
    const n = i + 1;
    const art = el('article', 'step side-' + (s.side || 'left') + (s.final ? ' step-final' : ''));
    art.dataset.step = n;
    let rows = '';
    if (s.show) rows = '<div class="rows">' + s.show.map(id => byId[id]).filter(Boolean)
      .map(p => `<div><span>${esc(p.name)}</span><span>${rangeCU(p)}<small> / ${p.unit}</small></span></div>`).join('') + '</div>';
    let acts;
    if (s.final) acts = `<a class="btn btn-primary" href="catalog.html">Открыть каталог</a><a class="btn btn-ghost js-call" href="${TEL}">Позвонить</a>`;
    else {
      acts = `<a class="btn btn-primary" href="catalog.html#cat-${s.cat}">В каталог: ${esc(catName(s.cat).split(':')[0])} →</a>`;
      if (s.cat2) acts += `<a class="btn btn-ghost" href="catalog.html#cat-${s.cat2[0]}">${esc(s.cat2[1])} →</a>`;
    }
    const kicker = 'Суздальская, 70';
    if (s.final) {
      // финал — не плашка, а заставка: заголовок выходит по словам
      const words = esc(s.title).split(' ')
        .map((w, k) => `<span style="--i:${k}">${w}</span>`).join(' ');
      art.innerHTML = `<div class="scard slate">
        <span class="eyebrow" style="--i:0">${kicker} · склад</span>
        <h2>${words}</h2><p class="morph" style="--i:1"></p>
        <p style="--i:2">${esc(s.text)}</p><div class="acts" style="--i:3">${acts}</div></div>`;
    } else {
      art.innerHTML = `<div class="scard"><div class="top"><span class="eyebrow">${kicker}</span><span class="eyebrow">в наличии</span></div>
      <h2>${esc(s.title)}</h2><p class="morph"></p><p>${esc(s.text)}</p>${rows}<div class="acts">${acts}</div></div>`;
    }
    steps.appendChild(art);

    // текст на карточке: заголовок собирается из размытия, под ним перетекают названия материалов
    if (window.Gooey) {
      if (!s.final) Gooey.reveal(art.querySelector('h2')); // у заставки заголовок выходит по словам
      const names = s.final
        ? ['Доска', 'Брус', 'Вагонка', 'ОСП', 'Фанера', 'Утеплитель', 'Плёнки']
        : (s.show || []).map(id => byId[id]).filter(Boolean).map(p => shortName(p.name));
      Gooey.cycle(art.querySelector('.morph'), names.length ? names : [catName(s.cat).split(':')[0]], { morphTime: 0.9, cooldownTime: 1.1 });
    }
  });
  if (steps) scanCU(steps);

  /* таблички не выезжают снизу, а прилетают со своей стороны */
  if (steps) {
    document.documentElement.classList.add('anim'); // без JS таблички просто видны
    const cards = [...steps.querySelectorAll('.scard')];
    const reveal = () => {
      const h = innerHeight;
      cards.forEach(c => {
        const r = c.getBoundingClientRect();
        const seen = Math.min(r.bottom, h) - Math.max(r.top, 0);
        c.classList.toggle('in', seen > Math.min(r.height * 0.35, h * 0.18));
      });
    };
    ['scroll', 'resize', 'wheel', 'touchmove', 'orientationchange'].forEach(ev => addEventListener(ev, reveal, { passive: true }));
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(reveal, { threshold: [0, 0.2, 0.5, 0.9] });
      cards.forEach(c => io.observe(c));
    }
    reveal();
    addEventListener('load', reveal);
  }

  /* на телефоне свайп доводит до следующей сцены — внутри шапки с роликом */
  if (steps && !reduced) {
    const stage = $('#stage');
    let timer = null, busy = 0;
    const snapNow = () => {
      if (innerWidth >= 900 || !stage) return;
      const h = innerHeight, top = stage.offsetTop;
      const last = top + stage.offsetHeight - h;
      if (scrollY < top - 10 || scrollY > last + 10) return;   // ниже сцен не мешаем листать
      const i = Math.round((scrollY - top) / h);
      const target = Math.min(last, Math.max(top, top + i * h));
      if (Math.abs(target - scrollY) > 4 && performance.now() - busy > 400) {
        busy = performance.now();
        scrollTo({ top: target, behavior: 'smooth' });
      }
    };
    addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(snapNow, 150); }, { passive: true });
  }

  const sceneNo = $('#sceneNo'), sceneBar = $('#sceneBar');
  const stepEls = steps ? [...steps.querySelectorAll('.step')] : [];
  if (window.Film && $('#film')) {
    window.Film.init({
      video: $('#film'), stage: $('#stage'), sticky: $('#stageSticky'), stepEls,
      onProgress: v => { state.scene = Math.max(state.scene, v); paint(); },
      onStep: (s, f) => {
        sceneNo.textContent = String(Math.max(1, s)).padStart(2, '0') + '/0' + (C.scenes.length);
        sceneBar.style.setProperty('--p', f.toFixed(3));
      }
    }).catch(err => { console.warn('ролик недоступен:', err); state.scene = 1; paint(); });
  } else { state.scene = 1; paint(); }

  /* ---------- надписи, пока дом ещё целый ---------- */
  const heroMorph = $('#heroMorph');
  if (heroMorph && window.Gooey) Gooey.cycle(heroMorph,
    ['доска и брус', 'вагонка и блок-хаус', 'ОСП и фанера', 'утеплитель и плёнки'],
    { morphTime: 0.9, cooldownTime: 1.2 });
  const statP = $('#statProducts'), statS = $('#statSizes');
  if ($('#heroStats')) scanCU($('#heroStats'));
  if (statP && window.CountUp) CountUp.set(statP, CAT.products.length, { duration: 1 });
  if (statS && window.CountUp) CountUp.set(statS, CAT.products.reduce((n, p) => n + p.variants.length, 0), { duration: 1 });

  const stageEl0 = $('#stage');
  /* ---------- фон: поле частиц под каталогом и остальными блоками ---------- */
  const homeFx = $('#homeFx');
  if (homeFx && window.Particles) Particles.mount(homeFx, {
    particleCount: innerWidth < 900 ? 260 : 460,
    particleSpread: 14,
    speed: 0.14,
    particleColors: ['#e7c188', '#f2d3a2', '#c9985a', '#86bfd0', '#efe6d8'],
    particleBaseSize: innerWidth < 900 ? 140 : 170,
    sizeRandomness: 1,
    alphaParticles: true,
    moveParticlesOnHover: innerWidth >= 900,
    particleHoverFactor: 0.6,
    cameraDistance: 20
  });

  /* ---------- perks marquee ---------- */
  const perks = $('#perks');
  const perkItems = C.perks.map(p => `<li>${esc(p)}</li>`).join('');
  if (perks) perks.innerHTML = perkItems + perkItems;

  /* ---------- top bar ---------- */
  const topbar = $('#topbar'), stageEl = $('#stage');
  if (stageEl) {
    const onScrollBar = () => topbar.classList.toggle('solid', scrollY > stageEl.offsetHeight - 90);
    addEventListener('scroll', onScrollBar, { passive: true }); onScrollBar();
  }

  /* ---------- variant picker (catalog + calculator) ---------- */
  const numOf = s => { const m = String(s).match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0; };
  function Picker(p, box, onChange, startIdx) {
    let cur = p.variants[startIdx != null ? startIdx : cheapest(p)];
    const values = {};
    p.pick.forEach(a => { values[a] = [...new Set(p.variants.map(v => v.a[a]))].sort((x, y) => numOf(x) - numOf(y) || x.localeCompare(y, 'ru')); });
    function choose(attr, val) {
      const cands = p.variants.filter(v => v.a[attr] === val);
      let best = cands[0], score = -1;
      cands.forEach(v => { const s = p.pick.filter(a => v.a[a] === cur.a[a]).length; if (s > score) { score = s; best = v; } });
      cur = best; render(); onChange(cur, p.variants.indexOf(cur));
    }
    function render() {
      box.innerHTML = '';
      p.pick.forEach(a => {
        const row = el('div', 'pick-row', `<span>${esc(a)}</span>`);
        const pills = el('div', 'pills');
        values[a].forEach(v => {
          const b = el('button', 'pill', esc(v)); b.type = 'button';
          const ok = p.variants.some(x => x.a[a] === v && p.pick.every(o => o === a || x.a[o] === cur.a[o]));
          if (cur.a[a] === v) b.classList.add('on');
          if (!ok) b.style.opacity = '.45';
          b.setAttribute('aria-pressed', cur.a[a] === v);
          b.addEventListener('click', () => choose(a, v));
          pills.appendChild(b);
        });
        row.appendChild(pills); box.appendChild(row);
      });
    }
    render();
    return { get: () => cur, idx: () => p.variants.indexOf(cur) };
  }
  function cheapest(p) { let i = 0; p.variants.forEach((v, j) => { if (v.price < p.variants[i].price) i = j; }); return i; }

  /* ---------- catalog: circular gallery of categories ---------- */
  const ringBox = $('#ring'), ringSec = $('#ringSec');
  const cats = CAT.categories.map(c => ({ ...c, items: inCat(c.id) }));
  const countLine = `${CAT.products.length} товара · ${cats.length} категорий`;
  if ($('#catalogCount')) $('#catalogCount').textContent = countLine;
  if (ringBox) initRing();
  function initRing() {
  cats.forEach((c, i) => {
    const it = el('div', 'ring-item');
    const mins = c.items.map(p => p.min).filter(Boolean);
    it.innerHTML = `<a class="ring-card" href="catalog.html#cat-${c.id}" aria-label="${esc(c.name)}">
      <img src="${c.img}" alt="" loading="lazy" width="240" height="330">
      <span class="cap"><b>${esc(c.name.split(':')[0])}</b><em>от ${moneyCU(Math.min(...mins))}</em><small>${c.items.length} ${plural(c.items.length, 'товар', 'товара', 'товаров')}</small></span></a>`;
    ringBox.appendChild(it);
  });
  scanCU(ringBox);
  const ringItems = [...ringBox.children];
  let ringRot = 0, autoRot = 0, scrolling = false, scrollTimer = null, ringVisible = false;
  function ringLayout() {
    const w = ringItems[0].offsetWidth || 176;
    const radius = Math.max(240, (w * ringItems.length) / (2 * Math.PI) * 1.14);
    const ang = 360 / ringItems.length;
    ringItems.forEach((it, i) => { it.dataset.a = i * ang; it.style.transform = `rotateY(${i * ang}deg) translateZ(${radius}px)`; });
  }
  function ringScroll() {
    if (manual) return;                       // как только потянули рукой — скролл кольцо не крутит
    const r = ringSec.getBoundingClientRect(), total = Math.max(1, ringSec.offsetHeight - innerHeight);
    ringRot = Math.min(1, Math.max(0, -r.top / total)) * 360;
    scrolling = true; clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { scrolling = false; }, 150);
  }

  /* кольцо тянется пальцем и мышкой влево-вправо, с инерцией */
  const stageBox = ringBox.parentElement;
  let manual = false, drag = null, vel = 0;
  const onDown = e => {
    if (e.button != null && e.button !== 0) return;
    drag = { x: e.clientX, rot: ringRot, t: performance.now(), moved: 0 };
    vel = 0; manual = true; scrolling = true;
    stageBox.classList.add('dragging');
    stageBox.setPointerCapture && e.pointerId != null && stageBox.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.abs(dx);
    const now = performance.now(), dt = Math.max(8, now - drag.t);
    const next = drag.rot - dx * 0.42;
    vel = (next - ringRot) / dt * 16;
    ringRot = next; drag.t = now;
  };
  const onUp = e => {
    if (!drag) return;
    const wasDrag = drag.moved > 6;
    drag = null;
    stageBox.classList.remove('dragging');
    scrolling = false;
    if (wasDrag && e && e.cancelable) e.preventDefault();
    inertia();
  };
  function inertia() {
    if (Math.abs(vel) < 0.05) { vel = 0; return; }
    ringRot += vel; vel *= 0.94;
    requestAnimationFrame(inertia);
  }
  stageBox.addEventListener('pointerdown', onDown);
  stageBox.addEventListener('pointermove', onMove, { passive: true });
  stageBox.addEventListener('pointerup', onUp);
  stageBox.addEventListener('pointercancel', onUp);
  stageBox.addEventListener('pointerleave', onUp);
  // клик по карточке не срабатывает, если это было перетаскивание
  stageBox.addEventListener('click', e => { if (Math.abs(vel) > 0.6) { e.preventDefault(); } }, true);
  function ringFrame() {
    requestAnimationFrame(ringFrame);
    if (!ringVisible) return;
    if (!scrolling && !reduced) autoRot += 0.06;
    const rot = -(ringRot + autoRot);
    ringBox.style.transform = `rotateY(${rot}deg)`;
    ringItems.forEach(it => {
      const rel = ((+it.dataset.a + rot) % 360 + 360) % 360;
      const norm = Math.abs(rel > 180 ? 360 - rel : rel);
      it.style.opacity = Math.max(0.25, 1 - norm / 180).toFixed(2);
    });
  }
  new IntersectionObserver(es => { ringVisible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(ringSec);
  addEventListener('scroll', ringScroll, { passive: true });
  addEventListener('resize', ringLayout);
  ringLayout(); ringScroll(); requestAnimationFrame(ringFrame);
  }

  /* ---------- catalog page: chips + price list ---------- */
  const chips = $('#chips'), list = $('#catList');
  if (list) initList();
  function initList() {
  if ($('#pageLede')) $('#pageLede').textContent = `${countLine}. Цены на ${CAT.updated}. Выберите размер — цена обновится. «Рассчитать» посчитает количество и сумму, заказ — одним звонком.`;
  cats.forEach(c => {
    chips.appendChild(el('a', '', esc(c.name.split(':')[0]))).href = '#cat-' + c.id;
    const sec = el('section', 'cat'); sec.id = 'cat-' + c.id;
    sec.innerHTML = `<div class="cat-h"><h3>${esc(c.name)}</h3><span>${c.items.length} ${plural(c.items.length, 'товар', 'товара', 'товаров')}</span></div>`;
    const grid = el('div', 'prods');
    c.items.forEach(p => grid.appendChild(productCard(p)));
    sec.appendChild(grid); list.appendChild(sec);
  });
  const chipLinks = [...chips.children];
  const catObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    chipLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    const on = chips.querySelector('.on'); if (on) chips.scrollTo({ left: on.offsetLeft - 12, behavior: reduced ? 'auto' : 'smooth' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  [...list.children].forEach(s => catObs.observe(s));
  // arrived from the home page with #cat-…: the list is rendered by script, so jump after it exists
  if (location.hash.startsWith('#cat-')) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  if (!reduced) initDepth();
  }

  /* ---------- catalog page: parallax background, cards rise out of depth and settle at the centre ---------- */
  function initDepth() {
    const bg = $('#catBg');
    const cards = [...list.querySelectorAll('.prod')];
    const vis = new Set();
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) vis.add(e.target);
      else { vis.delete(e.target); }
      req();
    }), { rootMargin: '20% 0px' });
    function setDepths() {
      cards.forEach(c => {
        const grid = c.parentElement, col = c.offsetLeft > grid.offsetWidth / 3 ? 1 : 0;
        c._d = innerWidth >= 900 ? (col ? 0.16 : 0.07) : 0.11; // wide screens: columns drift at different speeds
      });
    }
    cards.forEach(c => { io.observe(c); c._img = c.querySelector('.prod-img'); c._t = 0; c._hx = c._hy = c._hs = 0; c._tx = c._ty = c._ts = 0; });
    let queued = false, VH = innerHeight;
    // one transform for both effects: scroll depth (t) + hover tilt toward the saw (hx, hy, hs)
    function apply(c) {
      const t = c._t, a = Math.abs(t);
      c.style.transform = `translate3d(0,${(t * c._d * VH).toFixed(1)}px,${(-a * 90 + c._hs * 26).toFixed(1)}px) rotateX(${(t * 16 + c._hx).toFixed(2)}deg) rotateY(${c._hy.toFixed(2)}deg) scale(${(1 - a * 0.06 + c._hs * 0.015).toFixed(3)})`;
    }
    function frame() {
      queued = false;
      VH = innerHeight;
      const maxS = Math.max(1, document.documentElement.scrollHeight - VH);
      if (bg) bg.style.transform = `translate3d(0,${(-(scrollY / maxS) * 45).toFixed(2)}vh,0)`;
      vis.forEach(c => {
        const r = c.getBoundingClientRect();
        const t = Math.max(-1.2, Math.min(1.2, (r.top + r.height / 2 - VH / 2) / VH)); // <0 above centre, >0 below
        const a = Math.abs(t);
        c._t = t; apply(c);
        c.style.setProperty('--t', t.toFixed(3));
        c.style.setProperty('--lift', Math.max(0, 1 - a * 1.4).toFixed(3));
        c.style.opacity = Math.max(0.35, 1 - Math.max(0, a - 0.75) * 1.6).toFixed(2);
        if (c._img) c._img.style.transform = `scale(1.2) translate3d(0,${(t * -9).toFixed(1)}%,0)`;
      });
    }
    const req = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', () => { setDepths(); req(); sizeDust(); });
    setDepths(); req();
    setTimeout(req, 300);

    /* ----- saw cursor, tilt toward it, sawdust from the blade ----- */
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const dust = el('canvas', 'dust-canvas'); dust.setAttribute('aria-hidden', 'true'); document.body.appendChild(dust);
    const dx = dust.getContext('2d');
    let DPR = 1;
    function sizeDust() { DPR = Math.min(devicePixelRatio || 1, 2); dust.width = innerWidth * DPR; dust.height = innerHeight * DPR; dx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    sizeDust();
    const parts = [];
    const CHIP = ['#e7c188', '#f2d3a2', '#d9a868', '#c9985a', '#fff1d8'];
    function emit(x, y, n, vx0, vy0) {
      for (let i = 0; i < n && parts.length < 420; i++) {
        const ang = Math.PI * (0.55 + Math.random() * 0.4) + (vx0 > 0 ? Math.PI * 0.35 : 0); // spray down and back from the cut
        const sp = 1.4 + Math.random() * 3.4;
        parts.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6, vx: Math.cos(ang) * sp - vx0 * 0.08, vy: Math.sin(ang) * sp * 0.6 - 1.2 - vy0 * 0.05,
          life: 0, max: 38 + Math.random() * 40, s: 0.8 + Math.random() * 2.2, chip: Math.random() < 0.22, rot: Math.random() * 6, c: CHIP[(Math.random() * CHIP.length) | 0] });
      }
      wake();
    }
    function drawDust() {
      dx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++; p.vy += 0.16; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += 0.2;
        if (p.life > p.max || p.y > innerHeight + 10) { parts.splice(i, 1); continue; }
        dx.globalAlpha = Math.max(0, 1 - p.life / p.max) * 0.9; dx.fillStyle = p.c;
        if (p.chip) { dx.save(); dx.translate(p.x, p.y); dx.rotate(p.rot); dx.fillRect(-p.s * 1.6, -p.s * 0.5, p.s * 3.2, p.s); dx.restore(); }
        else { dx.beginPath(); dx.arc(p.x, p.y, p.s * 0.6, 0, 6.283); dx.fill(); }
      }
      dx.globalAlpha = 1;
    }

    let cursor = null, mx = -200, my = -200, sx = -200, sy = -200, lx = -200, ly = -200, ang = 0, spin = 120, hot = null, overBtn = false, pulse = 0;
    if (fine) {
      const N = 18, R1 = 30, R2 = 24.5;
      let d = '';
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * 6.283, a1 = ((i + 0.62) / N) * 6.283, a2 = ((i + 1) / N) * 6.283;
        const pt = (r, a) => `${(32 + Math.cos(a) * r).toFixed(2)},${(32 + Math.sin(a) * r).toFixed(2)}`;
        d += (i ? 'L' : 'M') + pt(R2, a0) + 'L' + pt(R1, a1) + 'L' + pt(R2 + 1.2, a2);
      }
      cursor = el('div', 'saw-cursor', `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="sawg" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#b3bac2"/><stop offset="1" stop-color="#6c747d"/></radialGradient></defs>
        <path d="${d}Z" fill="url(#sawg)" stroke="#2f343a" stroke-width="1.1" stroke-linejoin="round"/>
        <circle cx="32" cy="32" r="16.5" fill="none" stroke="#5e656d" stroke-width=".8" opacity=".7"/>
        <path d="M20 26a13 13 0 0 1 9-8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
        <circle cx="32" cy="32" r="8.5" fill="#e7c188" stroke="#7a5a2e" stroke-width="1.4"/><circle cx="32" cy="32" r="2.6" fill="#2a1f14"/></svg>`);
      document.body.appendChild(cursor);
      document.body.classList.add('saw-on');
      document.addEventListener('mouseleave', () => cursor.classList.add('hide'));
      document.addEventListener('mouseenter', () => cursor.classList.remove('hide'));
    }
    function setHot(card) {
      if (hot === card) return;
      if (hot) { hot.classList.remove('is-hot'); hot._tx = hot._ty = hot._ts = 0; }
      hot = card;
      if (hot) { hot.classList.add('is-hot'); hot._ts = 1; }
    }
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      const t = e.target;
      overBtn = !!(t.closest && t.closest('a, button'));
      const field = !!(t.closest && t.closest('input, select, textarea'));
      if (cursor) cursor.classList.toggle('hide', field);
      setHot(t.closest ? t.closest('.page-catalog .prod') : null);
      wake();
    }, { passive: true });
    addEventListener('pointerdown', e => {
      const card = e.target.closest && e.target.closest('.prod');
      if (card) emit(e.clientX, e.clientY, e.pointerType === 'mouse' ? 16 : 26, 0, 0); // on phones: a puff of sawdust under the finger
      pulse = 1; wake();
    }, { passive: true });

    let running = false, lastT = performance.now();
    const eased = new Set();
    function wake() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(loop); } }
    function loop(now) {
      const dt = Math.min(50, now - lastT); lastT = now;
      if (cursor) {
        sx += (mx - sx) * 0.4; sy += (my - sy) * 0.4;
        const target = hot ? (overBtn ? 1500 : 760) : 110;
        spin += (target - spin) * 0.08; ang = (ang + spin * dt / 1000) % 360;
        pulse *= 0.86;
        const sc = (hot ? 1.14 : 1) * (1 - pulse * 0.22);
        cursor.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) translate(-50%,-50%) rotate(${ang.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      }
      if (hot) {
        const r = hot.getBoundingClientRect(), px = (mx - r.left) / r.width - 0.5, py = (my - r.top) / r.height - 0.5;
        hot._tx = -py * 9; hot._ty = px * 11;
        hot.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
        hot.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
        eased.add(hot);
        const moved = Math.hypot(mx - lx, my - ly);
        if (moved > 1.5) emit(sx + 12, sy + 10, Math.min(5, Math.ceil(moved / 7)), mx - lx, my - ly); // chips fly from the blade's edge
      }
      lx = mx; ly = my;
      eased.forEach(c => {
        c._hx += (c._tx - c._hx) * 0.14; c._hy += (c._ty - c._hy) * 0.14; c._hs += (c._ts - c._hs) * 0.14;
        apply(c);
        if (c !== hot && Math.abs(c._hx) + Math.abs(c._hy) + c._hs < 0.02) { c._hx = c._hy = c._hs = 0; apply(c); eased.delete(c); }
      });
      drawDust();
      const idle = !cursor && !parts.length && !eased.size;
      if (idle) { running = false; return; }
      requestAnimationFrame(loop);
    }
    if (cursor) wake();
  }

  function productCard(p) {
    const card = el('article', 'prod');
    const specs = Object.entries(p.specs).map(([k, v]) => v).concat(UNIT_WORD[p.unit] ? ['цена ' + UNIT_WORD[p.unit]] : []).join(' · ');
    card.innerHTML = `<div class="prod-top"><div class="prod-imgbox"><img class="prod-img" src="${p.img}" alt="${esc(p.name)}" loading="lazy" width="104" height="104"></div>
      <div class="prod-info"><h4>${esc(p.name)}</h4><p class="specs">${esc(specs)}</p>
      <p class="price"><span class="js-price"></span><small>/ ${p.unit}</small></p><p class="specs">${p.variants.length > 1 ? 'от ' + rangeCU(p) : ''}</p></div></div>
      <div class="prod-body"><div class="picker"></div>
      <div class="prod-acts"><a class="btn btn-line btn-sm js-calc" href="#calc">Рассчитать</a><a class="btn btn-primary btn-sm js-call" href="${TEL}">Заказать</a></div></div>`;
    const priceEl = card.querySelector('.js-price');
    const setPrice = v => {
      if (window.CountUp) CountUp.set(priceEl, v.price, { duration: 0.7 });
      else priceEl.textContent = money(v.price);
    };
    if (window.CountUp) CountUp.mount(priceEl, { to: p.variants[cheapest(p)].price, suffix: ' ₽', duration: 1 });
    scanCU(card);
    const pk = Picker(p, card.querySelector('.picker'), v => setPrice(v));
    if (!p.pick.length) card.querySelector('.picker').remove();
    setPrice(pk.get());
    card.querySelector('.js-calc').addEventListener('click', () => calcOpen(p.id, pk.idx()));
    return card;
  }

  /* ---------- calculator ---------- */
  const box = $('#calcBox');
  box.innerHTML = `<div class="field"><label for="cProd">Товар</label><select id="cProd" class="select"></select></div>
    <div class="field" id="cPickF"><span>Размер и сорт</span><div class="picker" id="cPick"></div></div>
    <div id="cIn" style="display:grid;gap:14px"></div>
    <div class="result" id="cRes" aria-live="polite"></div>`;
  const sel = $('#cProd');
  cats.forEach(c => {
    const og = el('optgroup'); og.label = c.name;
    c.items.forEach(p => { const o = el('option', '', esc(p.name)); o.value = p.id; og.appendChild(o); });
    sel.appendChild(og);
  });
  let cp = null, cpk = null, cMode = null, calcPrev = { big: 0, sum: 0 };
  const val = id => { const x = $('#' + id); return x ? Math.max(0, parseFloat(String(x.value).replace(',', '.')) || 0) : 0; };
  const inp = (id, label, unit, v, step = 'any') => `<div class="field"><label for="${id}">${label}</label><div class="unit"><input class="input" id="${id}" type="number" inputmode="decimal" min="0" step="${step}" value="${v}"><i>${unit}</i></div></div>`;
  const seg = (name, opts, on) => `<div class="seg" role="group" aria-label="${name}">${opts.map(([k, t]) => `<button type="button" data-mode="${k}" class="${k === on ? 'on' : ''}">${t}</button>`).join('')}</div>`;

  function calcOpen(id, idx) {
    sel.value = id; setProduct(id, idx);
    document.getElementById('calc').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  function setProduct(id, idx) {
    cp = byId[id]; cMode = null;
    $('#cPickF').style.display = cp.pick.length ? '' : 'none';
    cpk = Picker(cp, $('#cPick'), () => compute(), idx);
    buildInputs(); compute();
  }
  sel.addEventListener('change', () => setProduct(sel.value));

  function buildInputs() {
    const w = $('#cIn');
    const t = cp.calc;
    let h = '';
    if (t === 'lumber') {
      cMode = cMode || 'pcs';
      h = seg('Как считать', [['pcs', 'Штуки'], ['m3', 'Кубометры'], ['area', 'Площадь']], cMode);
      if (cMode === 'pcs') h += inp('cPcs', 'Сколько штук', 'шт', 20, 1);
      if (cMode === 'm3') h += inp('cM3', 'Сколько кубометров', 'м³', 1);
      if (cMode === 'area') h += `<div class="inrow">${inp('cArea', 'Площадь пола или обшивки', 'м²', 20)}${inp('cRes10', 'Запас', '%', 10, 1)}</div>`;
    } else if (t === 'cube') {
      cMode = cMode || 'm3';
      h = seg('Как считать', [['m3', 'Кубометры'], ['pcs', 'Штуки']], cMode);
      if (cMode === 'm3') h += inp('cM3', 'Сколько кубометров', 'м³', 1);
      else h += `<div class="inrow">${inp('cPcs', 'Сколько штук по 6 м', 'шт', 20, 1)}${inp('cW', 'Ширина', 'мм', 150, 10)}</div>`;
    } else if (t === 'finish' || t === 'sheet' || t === 'insulation' || t === 'plate' || t === 'film' || t === 'antiseptic') {
      cMode = cMode || 'area';
      h = seg('Площадь', [['area', 'Знаю площадь'], ['wall', 'Посчитать стену']], cMode);
      if (cMode === 'area') h += inp('cArea', 'Площадь', 'м²', 30);
      else h += `<div class="inrow">${inp('cLen', 'Длина стен', 'м', 24)}${inp('cHgt', 'Высота', 'м', 2.7)}</div>${inp('cHole', 'Минус окна и двери', 'м²', 4)}`;
      if (t === 'finish' || t === 'sheet') h += inp('cRes10', 'Запас на подрезку', '%', 10, 1);
      if (t === 'insulation' || t === 'plate') h += `<div class="inrow">${inp('cLay', 'Слоёв', 'шт', 1, 1)}${inp('cRes10', 'Запас', '%', 5, 1)}</div>`;
      if (t === 'film') h += inp('cRes10', 'Нахлёст', '%', 10, 1);
      if (t === 'antiseptic') h += `<div class="inrow">${inp('cCoat', 'Слоёв', 'шт', 2, 1)}${inp('cRate', 'Расход на слой', 'кг/м²', cp.rate || 0.3, 0.05)}</div>`;
    } else if (t === 'linear') {
      h = `<div class="inrow">${inp('cCnt', 'Сколько досок', 'шт', 6, 1)}${inp('cLenB', 'Длина доски', 'м', 2)}</div>`;
    }
    w.innerHTML = h;
    w.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { cMode = b.dataset.mode; buildInputs(); compute(); }));
    w.querySelectorAll('input').forEach(i => i.addEventListener('input', compute));
  }
  function areaIn() {
    if (cMode === 'wall') return Math.max(0, val('cLen') * val('cHgt') - val('cHole'));
    return val('cArea');
  }
  function compute() {
    if (!cp) return;
    const v = cpk.get(), t = cp.calc, res = $('#cRes');
    const reserve = 1 + val('cRes10') / 100;
    let big = '', bigUnit = '', sum = 0, lines = [], say = '';
    const name = cp.name + (cp.pick.length ? ' — ' + cp.pick.map(a => v.a[a]).join(', ') : '');
    if (t === 'lumber') {
      const vol1 = (v.t / 1000) * (v.w / 1000) * v.L;
      let pcs;
      if (cMode === 'pcs') pcs = Math.ceil(val('cPcs'));
      if (cMode === 'm3') pcs = Math.ceil(val('cM3') / vol1);
      if (cMode === 'area') pcs = Math.ceil(val('cArea') * reserve / ((v.w / 1000) * v.L));
      sum = pcs * v.price; big = nf.format(pcs); bigUnit = 'шт';
      lines = [['Объём', fmt(pcs * vol1, 3) + ' м³'], ['В 1 м³', fmt(1 / vol1, 1) + ' шт'], ['Цена за м³', money(v.price / vol1)], ['Цена за штуку', money(v.price)]];
      if (cMode === 'area') lines.unshift(['Закроет', fmt(pcs * (v.w / 1000) * v.L, 1) + ' м²']);
      say = `${name}: ${pcs} шт`;
    } else if (t === 'cube') {
      let m3 = cMode === 'm3' ? val('cM3') : val('cPcs') * ((v.t || 50) / 1000) * (val('cW') / 1000) * 6;
      sum = m3 * v.price; big = fmt(m3, 3); bigUnit = 'м³';
      lines = [['Цена за м³', money(v.price)]];
      if (cMode === 'pcs') lines.unshift(['Толщина', (v.t || 50) + ' мм, длина 6 м']);
      say = `${name}: ${fmt(m3, 2)} м³`;
    } else if (t === 'finish') {
      const a = areaIn(), buy = a * reserve;
      sum = buy * v.price; big = fmt(buy, 1); bigUnit = 'м²';
      const per3 = (v.w / 1000) * 3, per6 = (v.w / 1000) * 6;
      const n3 = Math.ceil(buy / per3), n6 = Math.ceil(buy / per6);
      lines = [['Площадь без запаса', fmt(a, 1) + ' м²'], ['Это примерно', `${nf.format(n3)} ${plural(n3, 'доска', 'доски', 'досок')} по 3 м`], ['или', `${nf.format(n6)} ${plural(n6, 'доска', 'доски', 'досок')} по 6 м`], ['Цена за м²', money(v.price)]];
      say = `${name}: ${fmt(buy, 1)} м²`;
    } else if (t === 'linear') {
      const m = val('cCnt') * val('cLenB');
      sum = m * v.price; big = fmt(m, 1); bigUnit = 'пог. м';
      lines = [['Цена за погонный метр', money(v.price)]];
      say = `${name}: ${fmt(m, 1)} пог. м`;
    } else if (t === 'sheet') {
      const a = areaIn(), n = Math.ceil(a * reserve / v.area);
      sum = n * v.price; big = nf.format(n); bigUnit = plural(n, 'лист', 'листа', 'листов');
      lines = [['Площадь листа', fmt(v.area, 2) + ' м²'], ['Закроет', fmt(n * v.area, 1) + ' м²'], ['Цена за лист', money(v.price)]];
      say = `${name}: ${n} ${bigUnit}`;
    } else if (t === 'insulation' || t === 'plate') {
      const a = areaIn(), lay = Math.max(1, Math.round(val('cLay'))), n = Math.ceil(a * lay * reserve / v.area);
      sum = n * v.price; big = nf.format(n); bigUnit = t === 'plate' ? plural(n, 'плита', 'плиты', 'плит') : plural(n, 'упаковка', 'упаковки', 'упаковок');
      lines = [[t === 'plate' ? 'Площадь плиты' : 'В упаковке', fmt(v.area, 2) + ' м²'], ['Слой', `${v.t} мм × ${lay}`], ['Объём утеплителя', fmt(a * lay * v.t / 1000, 2) + ' м³'], ['Цена', money(v.price) + ' / ' + cp.unit]];
      say = `${name}: ${n} ${bigUnit}`;
    } else if (t === 'film') {
      const a = areaIn(), n = Math.ceil(a * reserve / v.area);
      sum = n * v.price; big = nf.format(n); bigUnit = plural(n, 'рулон', 'рулона', 'рулонов');
      lines = [['В рулоне', fmt(v.area, 0) + ' м²'], ['Нужно с нахлёстом', fmt(a * reserve, 1) + ' м²'], ['Цена за рулон', money(v.price)]];
      say = `${name}: ${n} ${bigUnit}`;
    } else if (t === 'antiseptic') {
      const a = areaIn(), kg = a * Math.max(1, Math.round(val('cCoat'))) * val('cRate'), n = Math.max(1, Math.ceil(kg / v.kg));
      sum = n * v.price; big = nf.format(n); bigUnit = plural(n, 'канистра', 'канистры', 'канистр') + ` по ${v.kg} кг`;
      lines = [['Нужно состава', fmt(kg, 1) + ' кг'], ['Расход', `${fmt(val('cRate'), 2)} кг/м² на слой`], ['Цена за канистру', money(v.price)]];
      say = `${name}: ${n} × ${v.kg} кг`;
    }
    // цифры итога крутятся одометром от прошлого значения к новому
    const dec = /[.,]/.test(String(big)) ? 2 : 0;
    const bigNum = parseFloat(String(big).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const fromBig = calcPrev.big, fromSum = calcPrev.sum;
    calcPrev = { big: bigNum, sum: Math.round(sum) };
    res.innerHTML = `<p class="eyebrow">Итог</p>
      <div class="big"><b><span class="js-cu" data-to="${bigNum}" data-from="${fromBig}" data-decimals="${dec}" data-duration="0.7"></span></b><span>${bigUnit}</span></div>
      <div class="sum">≈ <span class="js-cu" data-to="${Math.round(sum)}" data-from="${fromSum}" data-suffix=" ₽" data-duration="0.7"></span></div>
      <div class="lines">${lines.map(l => `<div><span>${l[0]}</span><span>${l[1]}</span></div>`).join('')}</div>
      <div class="acts"><a class="btn btn-primary js-call" href="${TEL}">Позвонить и заказать</a><button class="btn btn-ghost" type="button" id="cCopy">Скопировать расчёт</button></div>
      <p class="fine">Сумма примерная, по ценам на ${CAT.updated}. Точную цену, распил и доставку назовёт менеджер.</p>`;
    scanCU(res);
    $('#cCopy').addEventListener('click', e => {
      const text = `Молл Строй, расчёт: ${say}, ≈ ${money(sum)}. Телефон ${C.company.phone}`;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { e.target.textContent = 'Скопировано'; }, () => { e.target.textContent = text; });
    });
  }
  setProduct(CAT.products.find(p => p.id === 'doska-obreznaya') ? 'doska-obreznaya' : CAT.products[0].id);
  sel.value = cp.id;

  /* ---------- reviews ---------- */
  if ($('#revRow')) renderReviews();
  function renderReviews() {
  $('#revMeta').innerHTML = `<span class="rating"><b>${C.rating.value}</b><span>★★★★☆<br><span class="eyebrow">${C.rating.count} на Яндекс Картах</span></span></span>`;
  $('#revRow').innerHTML = C.reviewsList.map(r => `<article class="rev"><span class="stars" aria-label="Оценка ${r.stars} из 5">${'★'.repeat(r.stars)}</span>
    <p>${esc(r.text)}</p><footer>${esc(r.name)} · ${esc(r.date)}</footer></article>`).join('');
  $('#revNote').innerHTML = `Кратко пересказали отзывы с Яндекс Карт. Полные тексты и все отзывы — <a href="${C.company.reviews}" target="_blank" rel="noopener">на Яндекс Картах</a>.`;
  }

  /* ---------- contacts ---------- */
  const co = C.company;
  $('#contBox').innerHTML = `
    <div class="cbox"><p class="eyebrow">Адрес</p><p class="big">Суздальская, 70</p><p>${esc(co.address)}. ${esc(co.place)}.</p>
      <a class="btn btn-line" href="${co.maps}" target="_blank" rel="noopener">Маршрут в Яндекс Картах</a></div>
    <div class="cbox"><p class="eyebrow">Режим работы</p><div class="hours">${co.hours.map(h => `<div><span>${h[0]}</span><span>${h[1]}</span></div>`).join('')}</div>
      <p>Без выходных. Распил в размер и погрузка — на месте.</p></div>
    <div class="cbox"><p class="eyebrow">Телефон</p><p class="big num">${esc(co.phone)}</p><p>Позвоните — подберём материал, посчитаем и привезём.</p>
      <a class="btn btn-primary js-call" href="${TEL}">Позвонить</a></div>`;

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
})();
