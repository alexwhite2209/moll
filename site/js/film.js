/* Молл Строй — шапка: скролл-видео «дом на разбор».
   Десктоп: mp4 1920×1080, кадр перематывается скроллом (гладко, 30 кадров/с).
   Телефон: кадры-картинки из assets/seq9 на canvas — на мобильных перемотка mp4
   подвисает и часто не рисует кадр вообще, а картинки работают всегда.
   Пока дом стоит целый, кадр почти не двигается — в это время читаются надписи. */
window.Film = (function () {
  'use strict';
  const wideMQ = matchMedia('(min-width: 900px)');
  const HOLD_PART = 0.05;                 // доля ролика, пока дом ещё целый
  const VID = { full: 'assets/film-16x9.mp4', lite: 'assets/film-16x9-lite.mp4', poster: 'assets/film-16x9.jpg', len: 15.63 };
  const FR = { dir: 'assets/seq9/', n: 250 };
  /* Телефон работает такта́ми, как на energy: свайп ведёт ролик до следующей точки
     и останавливает ровно на ней, табличка выходит, когда ролик доехал. */
  /* точки остановки: дом стоит В ТОМ материале, про который табличка.
     кадр 10 — дом в блок-хаусе, 60 — белый под мембраной, 95 — в ОСП,
     130 — в утеплителе, 150 — плёнка и вагонка, 170 — голый каркас, 232 — штабеля */
  const STOPS = [0, 0.04, 0.24, 0.38, 0.52, 0.60, 0.68, 0.93];
  const BEAT_MS = 820;
  const pad = i => String(i).padStart(3, '0');

  function init(opt) {
    const host = opt.video, stage = opt.stage, sticky = opt.sticky;
    const steps = opt.stepEls || [];
    const onProgress = opt.onProgress || function () {};
    const onStep = opt.onStep || function () {};
    if (!host || !stage || !sticky) return Promise.reject(new Error('нет сцены'));

    // общая обёртка: режимы кладут в неё свои слои
    const wrap = document.createElement('div');
    wrap.className = 'film-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    host.parentNode.replaceChild(wrap, host);

    let active = null, box = measure(), lastStep = -1, done = false, readyResolve = null;
    const finish = () => { if (!done) { done = true; onProgress(1); } };
    const ready = new Promise(resolve => {
      readyResolve = resolve;
      setTimeout(() => { finish(); resolve(); }, 2200);   // страницу из-за шапки не держим
    });

    function measure() {
      return {
        len: Math.max(1, stage.offsetHeight - sticky.clientHeight),
        top: stage.getBoundingClientRect().top + scrollY
      };
    }

    /* ---------- десктоп: перемотка mp4 ---------- */
    function videoMode() {
      const v = document.createElement('video');
      v.className = 'film';
      v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.poster = VID.poster;
      v.src = VID.lite;
      wrap.appendChild(v);

      let hi = null, pending = null;

      const seek = t => {
        if (!isFinite(t)) return;
        if (hi && hi.dataset.on === '1' && !hi.seeking) { try { hi.currentTime = t; } catch (e) {} }
        if (v.seeking) { pending = t; return; }
        try { v.currentTime = t; } catch (e) {}
      };
      v.addEventListener('seeked', () => {
        if (pending == null) return;
        const t = pending; pending = null;
        if (Math.abs(t - v.currentTime) > 0.01) seek(t);
      });
      v.addEventListener('loadedmetadata', () => { finish(); readyResolve && readyResolve(); box = measure(); render(); });

      // полный файл — вторым слоем, проявляем когда догрузился
      function loadFull() {
        if (hi) return;
        hi = document.createElement('video');
        hi.className = 'film film-hi';
        hi.muted = true; hi.loop = false; hi.playsInline = true; hi.preload = 'auto';
        hi.setAttribute('playsinline', ''); hi.setAttribute('muted', '');
        hi.src = VID.full;
        wrap.appendChild(hi);
        const show = () => {
          if (hi.dataset.on === '1') return;
          hi.dataset.on = '1';
          try { hi.currentTime = v.currentTime; } catch (e) {}
          hi.classList.add('on');
        };
        hi.addEventListener('canplaythrough', show, { once: true });
        hi.addEventListener('progress', () => {
          try {
            if (hi.buffered.length && hi.duration && hi.buffered.end(hi.buffered.length - 1) > hi.duration * 0.9) show();
          } catch (e) {}
        });
        hi.load();
      }
      v.addEventListener('loadeddata', () => setTimeout(loadFull, 300), { once: true });
      setTimeout(loadFull, 4000);
      v.load();

      return {
        set(part) { seek(Math.max(0, Math.min((v.duration || VID.len) - 0.05, part * (v.duration || VID.len)))); },
        resize() {},
        destroy() { wrap.innerHTML = ''; }
      };
    }

    /* ---------- телефон: кадры на canvas ---------- */
    function framesMode() {
      const cv = document.createElement('canvas');
      cv.className = 'film';
      wrap.appendChild(cv);
      const ctx = cv.getContext('2d', { alpha: false });
      const frames = new Array(FR.n);
      let cur = -1, got = 0;
      const ok = i => frames[i] && frames[i].complete && frames[i].naturalWidth;

      function fit() {
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        paint(cur < 0 ? 0 : cur, true);
      }
      function paint(i, force) {
        let k = i;
        if (!ok(k)) { while (k > 0 && !ok(k)) k--; if (!ok(k)) return; }
        if (k === cur && !force) return;
        cur = k;
        const f = frames[k], cw = cv.width, ch = cv.height;
        const s = Math.max(cw / f.naturalWidth, ch / f.naturalHeight);
        const w = f.naturalWidth * s, h = f.naturalHeight * s;
        ctx.drawImage(f, (cw - w) / 2, (ch - h) / 2, w, h);
      }
      function load(i, cb) {
        if (frames[i]) { cb && cb(); return; }
        const img = new Image();
        img.onload = img.onerror = () => {
          got++;
          if (got >= 6) { finish(); readyResolve && readyResolve(); }
          if (i <= cur + 1) paint(i, true);
          cb && cb();
        };
        img.src = FR.dir + pad(i + 1) + '.jpg';
        frames[i] = img;
      }
      // сначала каждый четвёртый кадр — прокрутка оживает почти сразу, потом добираем остальные
      load(0, () => {
        const pass = (start, stride, after) => {
          let i = start;
          let live = 0;
          const next = () => {
            if (i >= FR.n) { if (--live <= 0 && after) after(); return; }
            const k = i; i += stride;
            load(k, () => setTimeout(next, 0));
          };
          for (let t = 0; t < 4; t++) { live++; next(); }
        };
        pass(4, 4, () => pass(1, 1, null));
      });

      // проезд до такта: кадры бегут с замедлением, как проигранный отрезок
      let shown = 0, from = 0, to = 0, t0 = 0, raf = 0, beat = -1, safety = 0, landed = -1;
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      const frameAt = part => Math.min(FR.n - 1, Math.max(0, Math.round(part * (FR.n - 1))));
      function land() {                       // доехали: ставим точный кадр и зовём табличку
        if (landed === beat) return;
        landed = beat; shown = to; paint(frameAt(to));
        document.dispatchEvent(new CustomEvent('film:beat', { detail: { i: beat } }));
      }
      function run(now) {
        const t = Math.min(1, (now - t0) / BEAT_MS);
        shown = from + (to - from) * easeOut(t);
        paint(frameAt(shown));
        if (t < 1) raf = requestAnimationFrame(run);
        else { raf = 0; land(); }
      }
      return {
        setBeat(i) {
          const target = STOPS[Math.min(STOPS.length - 1, Math.max(0, i))];
          if (i === beat) return;
          beat = i; from = shown; to = target; t0 = performance.now();
          if (!raf) raf = requestAnimationFrame(run);
          // предохранитель: если браузер придушил кадры, всё равно доезжаем и зажигаем табличку
          clearTimeout(safety);
          safety = setTimeout(land, BEAT_MS + 260);
        },
        set(part) { shown = part; paint(frameAt(part)); },
        resize: fit,
        destroy() { if (raf) cancelAnimationFrame(raf); clearTimeout(safety); wrap.innerHTML = ''; }
      };
    }

    function partAt() {
      const p = Math.min(1, Math.max(0, (scrollY - box.top) / box.len));
      const heroH = steps.length ? steps[0].offsetHeight : 0;
      const hold = Math.min(0.5, heroH / box.len) || 0.12;
      return {
        p, hold,
        part: p <= hold ? HOLD_PART * (p / hold) : HOLD_PART + (1 - HOLD_PART) * ((p - hold) / (1 - hold))
      };
    }

    function render() {
      const a = partAt();
      if (active && active.setBeat) {
        // номер такта = номер сцены, до которой дошла прокрутка
        const total = Math.max(1, steps.length - 1);
        const k = Math.min(STOPS.length - 1, Math.round(a.p * total));
        active.setBeat(k);
      } else if (active) {
        active.set(a.part);
        // десктоп: таблички берут момент прямо из ролика, по тем же точкам
        document.dispatchEvent(new CustomEvent('film:part', { detail: { part: a.part } }));
      }
      const n = Math.max(1, steps.length - 1);
      const sIdx = a.p <= a.hold ? 0 : Math.min(n, Math.floor(((a.p - a.hold) / (1 - a.hold)) * n) + 1);
      const f = a.p <= a.hold ? a.p / a.hold : ((a.p - a.hold) / (1 - a.hold) * n) % 1;
      if (sIdx !== lastStep) lastStep = sIdx;
      onStep(sIdx, f);
    }

    function mount() {
      if (active) active.destroy();
      active = wideMQ.matches ? videoMode() : framesMode();
      active.resize();
      box = measure();
      render();
    }
    mount();

    let wasWide = wideMQ.matches;
    const onMedia = () => { if (wideMQ.matches !== wasWide) { wasWide = wideMQ.matches; mount(); } };
    wideMQ.addEventListener ? wideMQ.addEventListener('change', onMedia) : wideMQ.addListener(onMedia);

    addEventListener('scroll', render, { passive: true });
    addEventListener('resize', () => { box = measure(); active && active.resize(); render(); }, { passive: true });
    addEventListener('orientationchange', () => setTimeout(() => { box = measure(); active && active.resize(); render(); }, 200));

    return ready;
  }

  return { init, STOPS };
})();
