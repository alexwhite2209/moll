/* Молл Строй — шапка: ролик «дом на разбор», перемотанный скроллом.
   Вертикаль (720×1280) для телефона, горизонталь (1280×720) для десктопа.
   Пока дом стоит целый, кадр почти не двигается — в это время читаются надписи. */
window.Film = (function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 900px)');
  const SRC = { wide: 'assets/film-16x9.mp4', tall: 'assets/film-9x16.mp4' };
  const LITE = { wide: 'assets/film-16x9-lite.mp4', tall: 'assets/film-9x16-lite.mp4' }; // лёгкий ролик грузится первым
  const POSTER = { wide: 'assets/film-16x9.jpg', tall: 'assets/film-9x16.jpg' };
  const HOLD_PART = 0.05; // какая доля ролика проходит, пока дом ещё целый
  const LEN = { wide: 15.63, tall: 16.67 }; // длина роликов — чтобы скролл работал, не дожидаясь загрузки

  function init(opt) {
    const video = opt.video, stage = opt.stage, sticky = opt.sticky;
    const steps = opt.stepEls || [];
    const onProgress = opt.onProgress || function () {};
    const onStep = opt.onStep || function () {};
    if (!video || !stage || !sticky) return Promise.reject(new Error('нет видео или сцены'));

    let mode = wide.matches ? 'wide' : 'tall';
    video.poster = POSTER[mode];
    video.src = LITE[mode];
    video.muted = true; video.loop = false; video.playsInline = true;
    video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
    video.preload = 'auto';
    video.load();

    // при смене ширины подставляем другой файл и возвращаемся на тот же момент
    const swap = () => {
      const next = wide.matches ? 'wide' : 'tall';
      if (next === mode) return;
      mode = next;
      const at = video.currentTime;
      video.poster = POSTER[mode];
      video.src = full && full.ready ? SRC[mode] : LITE[mode];
      video.load();
      video.addEventListener('loadedmetadata', () => { try { video.currentTime = at; } catch (e) {} }, { once: true });
    };
    wide.addEventListener ? wide.addEventListener('change', swap) : wide.addListener(swap);

    // прогресс загрузки — для прелоадера
    const loadPart = () => {
      try {
        if (video.readyState >= 3) return 1;
        if (video.buffered.length && video.duration) return Math.min(0.95, video.buffered.end(0) / video.duration);
      } catch (e) {}
      return 0;
    };
    const tellProgress = () => onProgress(loadPart());
    video.addEventListener('progress', tellProgress);
    video.addEventListener('loadeddata', tellProgress);

    const ready = new Promise(resolve => {
      const done = () => { onProgress(1); resolve(); };
      if (video.readyState >= 1) done();
      else {
        // не держим страницу из-за ролика: он догрузится сам, а перемотка уже работает
        video.addEventListener('loadedmetadata', done, { once: true });
        video.addEventListener('loadeddata', done, { once: true });
        setTimeout(done, 2500);
      }
    });

    // iOS иногда декодирует только после короткого play()
    const nudge = () => {
      const p = video.play();
      if (p && p.then) p.then(() => video.pause()).catch(() => {});
      else { try { video.pause(); } catch (e) {} }
      removeEventListener('touchstart', nudge); removeEventListener('scroll', nudge);
    };
    addEventListener('touchstart', nudge, { passive: true, once: true });
    addEventListener('scroll', nudge, { passive: true, once: true });

    /* полный ролик грузим вторым слоем и плавно показываем, когда он готов */
    let full = null;
    function loadFull() {
      const hi = document.createElement('video');
      hi.className = 'film film-hi';
      hi.muted = true; hi.loop = false; hi.playsInline = true;
      hi.setAttribute('playsinline', ''); hi.setAttribute('muted', '');
      hi.preload = 'auto';
      hi.src = SRC[mode];
      hi.ready = false;
      video.parentNode.insertBefore(hi, video.nextSibling);
      const show = () => {
        if (hi.ready) return;
        hi.ready = true;
        try { hi.currentTime = video.currentTime; } catch (e) {}
        hi.classList.add('on');
      };
      hi.addEventListener('canplaythrough', show, { once: true });
      hi.addEventListener('progress', () => {
        try {
          if (hi.buffered.length && hi.duration && hi.buffered.end(hi.buffered.length - 1) > hi.duration * 0.9) show();
        } catch (e) {}
      });
      hi.load();
      full = hi;
    }

    let want = 0, pending = null, lastStep = -1;

    /* перемотка кадра — сразу в обработчике прокрутки, без ожидания анимационного кадра */
    function seek(t) {
      if (!isFinite(t)) return;
      if (full && full.ready && !full.seeking) { try { full.currentTime = t; } catch (e) {} }
      if (video.seeking) { pending = t; return; }   // если ещё догоняет — запомним и доедем
      try { video.currentTime = t; } catch (e) {}
    }
    video.addEventListener('seeked', () => {
      if (pending == null) return;
      const t = pending; pending = null;
      if (Math.abs(t - video.currentTime) > 0.01) seek(t);
    });

    function measure() {
      const len = Math.max(1, stage.offsetHeight - sticky.clientHeight);
      const top = stage.getBoundingClientRect().top + scrollY;
      return { len, top };
    }
    let box = measure();
    addEventListener('resize', () => { box = measure(); onScroll(); }, { passive: true });

    function onScroll() {
      const dur = video.duration || LEN[mode] || 0;   // пока метаданные не пришли — считаем по известной длине
      if (!dur) return;
      const p = Math.min(1, Math.max(0, (scrollY - box.top) / box.len));
      const heroH = steps.length ? steps[0].offsetHeight : 0;
      const hold = Math.min(0.5, heroH / box.len) || 0.12;
      const part = p <= hold
        ? HOLD_PART * (p / hold)
        : HOLD_PART + (1 - HOLD_PART) * ((p - hold) / (1 - hold));
      want = Math.min(dur - 0.05, Math.max(0, part * dur));
      seek(want);

      // номер сцены для индикатора
      const n = Math.max(1, steps.length - 1);
      const sIdx = p <= hold ? 0 : Math.min(n, Math.floor(((p - hold) / (1 - hold)) * n) + 1);
      const f = p <= hold ? p / hold : ((p - hold) / (1 - hold) * n) % 1;
      if (sIdx !== lastStep) lastStep = sIdx;
      onStep(sIdx, f);
    }

    addEventListener('scroll', onScroll, { passive: true });
    // тяжёлый файл начинаем тянуть, когда лёгкий уже показывает кадры
    video.addEventListener('loadeddata', () => { if (!full) setTimeout(loadFull, 400); }, { once: true });
    setTimeout(() => { if (!full) loadFull(); }, 4000);
    video.addEventListener('loadedmetadata', () => { box = measure(); onScroll(); });
    ready.then(() => { box = measure(); onScroll(); });

    return ready;
  }

  return { init };
})();
