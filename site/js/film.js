/* Молл Строй — шапка: скролл-видео «дом на разбор».
   Ролик разложен на кадры-картинки (assets/seq9 — телефон, assets/seq16 — десктоп)
   и рисуется на canvas по позиции прокрутки. Так надёжнее перемотки mp4: у видео на
   телефонах seek подвисает, а кадр меняется сразу — и от колеса мыши, и от свайпа. */
window.Film = (function () {
  'use strict';
  const SEQ = {
    tall: { dir: 'assets/seq9/', n: 100 },
    wide: { dir: 'assets/seq16/', n: 94 }
  };
  const HOLD_PART = 0.05;            // какая доля ролика проходит, пока дом ещё целый
  const wide = matchMedia('(min-width: 900px)');
  const pad = i => String(i).padStart(3, '0');

  function init(opt) {
    const host = opt.video, stage = opt.stage, sticky = opt.sticky;
    const steps = opt.stepEls || [];
    const onProgress = opt.onProgress || function () {};
    const onStep = opt.onStep || function () {};
    if (!host || !stage || !sticky) return Promise.reject(new Error('нет сцены'));

    // на месте <video> ставим canvas
    const cv = document.createElement('canvas');
    cv.className = host.className || 'film';
    cv.setAttribute('aria-hidden', 'true');
    host.parentNode.replaceChild(cv, host);
    const ctx = cv.getContext('2d', { alpha: false });

    let mode = wide.matches ? 'wide' : 'tall';
    let seq = SEQ[mode], frames = new Array(seq.n), loaded = 0, cur = -1, lastStep = -1;

    function fit() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      draw(cur < 0 ? 0 : cur, true);
    }

    const ok = i => frames[i] && frames[i].complete && frames[i].naturalWidth;

    // кадр рисуем «по-обложке»: заполняем всю площадь, лишнее обрезаем
    function draw(i, force) {
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
        loaded++;
        onProgress(Math.min(1, loaded / 16));   // хватит первых кадров, чтобы открыть страницу
        if (i <= cur + 1) draw(i, true);
        cb && cb();
      };
      img.src = seq.dir + pad(i + 1) + '.jpg';
      frames[i] = img;
    }

    // первый кадр сразу, остальные подряд в четыре потока
    function loadAll() {
      load(0, () => {
        let i = 1;
        const next = () => {
          if (i >= seq.n) return;
          const k = i++;
          load(k, () => setTimeout(next, 0));
        };
        for (let p = 0; p < 4; p++) next();
      });
    }

    const ready = new Promise(resolve => {
      load(0, () => { onProgress(1); resolve(); });
      setTimeout(() => { onProgress(1); resolve(); }, 2500);
    });
    loadAll();

    function measure() {
      return {
        len: Math.max(1, stage.offsetHeight - sticky.clientHeight),
        top: stage.getBoundingClientRect().top + scrollY
      };
    }
    let box = measure();

    function onScroll() {
      const p = Math.min(1, Math.max(0, (scrollY - box.top) / box.len));
      const heroH = steps.length ? steps[0].offsetHeight : 0;
      const hold = Math.min(0.5, heroH / box.len) || 0.12;
      const part = p <= hold
        ? HOLD_PART * (p / hold)
        : HOLD_PART + (1 - HOLD_PART) * ((p - hold) / (1 - hold));
      draw(Math.min(seq.n - 1, Math.max(0, Math.round(part * (seq.n - 1)))));

      const n = Math.max(1, steps.length - 1);
      const sIdx = p <= hold ? 0 : Math.min(n, Math.floor(((p - hold) / (1 - hold)) * n) + 1);
      const f = p <= hold ? p / hold : ((p - hold) / (1 - hold) * n) % 1;
      if (sIdx !== lastStep) lastStep = sIdx;
      onStep(sIdx, f);
    }

    // сменилась ширина — берём другую раскладку кадров
    const swap = () => {
      const next = wide.matches ? 'wide' : 'tall';
      if (next === mode) return;
      mode = next; seq = SEQ[mode];
      frames = new Array(seq.n); loaded = 0; cur = -1;
      loadAll(); fit(); onScroll();
    };
    wide.addEventListener ? wide.addEventListener('change', swap) : wide.addListener(swap);

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { box = measure(); fit(); onScroll(); }, { passive: true });
    addEventListener('orientationchange', () => setTimeout(() => { box = measure(); fit(); onScroll(); }, 200));
    fit(); onScroll();
    ready.then(() => { box = measure(); fit(); onScroll(); });

    return ready;
  }

  return { init };
})();
