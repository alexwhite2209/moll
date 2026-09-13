/* Молл Строй — шапка: скролл-видео «дом на разбор». Система перенесена с energy.
   Компьютер: ролик перематывается прокруткой. Сглаживание и шлюз на seek — перемотки не
   встают в очередь; подписи получают тот же сглаженный прогресс, что и кадр.
   Телефон: такты. Один свайп — сразу следующая табличка; вперёд ролик проигрывается и
   встаёт ровно на точке, назад идёт ступенями по файлу, где каждый кадр опорный. */
window.Film = (function () {
  'use strict';
  const BEATS_MQ = matchMedia('(max-width: 899px), (orientation: portrait) and (pointer: coarse)');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const SRC = {
    wide: { lite: 'assets/film-16x9-lite.mp4', full: 'assets/film-16x9.mp4', poster: 'assets/film-16x9.jpg' },
    tall: { lite: 'assets/film-9x16-intra.mp4', full: null, poster: 'assets/film-9x16.jpg' }
  };
  const FRAME = 1 / 30;
  const SEEK_MIN = coarse ? FRAME * 1.6 : FRAME * 0.9;   // короче кадра перематывать незачем
  const SMOOTH = coarse ? 0.24 : 0.135;                  // на пальце догоняем цель быстрее
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const noop = () => {};
  const listen = (mq, fn) => mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn);

  function init(opt) {
    const host = opt.video, stage = opt.stage, sticky = opt.sticky;
    const STOPS = opt.stops && opt.stops.length ? opt.stops : [0];
    const onReady = opt.onReady || noop, onMove = opt.onMove || noop;
    const onBeat = opt.onBeat || noop, onMode = opt.onMode || noop;
    if (!host || !stage || !sticky) return Promise.reject(new Error('нет сцены'));

    const wrap = document.createElement('div');
    wrap.className = 'film-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    host.parentNode.replaceChild(wrap, host);

    let mode = null, gen = 0, video = null;
    let seekBusy = false, seekAt = 0, pendingTime = null;
    let target = 0, shown = 0, raf = null, lastTick = 0, onScreen = true;
    let beatI = 0, beatRaf = null, cancelMove = null, pinned = null;
    let tY = 0, tActive = false, tDone = false;
    let wAcc = 0, wLock = false, wQuiet = null;

    function makeVideo(src, cls, poster) {
      const v = document.createElement('video');
      v.className = 'film ' + cls;
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('disablepictureinpicture', '');
      if (poster) v.poster = poster;
      v.addEventListener('seeked', onSeeked);
      v.src = src;
      wrap.appendChild(v);
      v.load();
      return v;
    }

    /* ═══ шлюз на seek: без него кадры встают в очередь, и это ощущается рывками ═══ */
    function requestSeek(t) {
      if (!video || !video.duration) return;
      if (seekBusy && performance.now() - seekAt > 600) seekBusy = false;   // кадр потерялся — не зависаем
      if (Math.abs(t - video.currentTime) < SEEK_MIN) return;
      if (seekBusy) { pendingTime = t; return; }
      seekBusy = true; seekAt = performance.now();
      try { video.currentTime = t; } catch (e) { seekBusy = false; }
    }
    function onSeeked(e) {
      if (e.target !== video) return;
      seekBusy = false;
      if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
    }

    /* ═══ компьютер: непрерывная перемотка прокруткой ═══ */
    function progressAt() {
      const range = stage.offsetHeight - sticky.clientHeight;
      if (range <= 0) return 0;
      return clamp(-stage.getBoundingClientRect().top / range, 0, 1);
    }
    /* шаг делаем и по кадру страницы, и прямо на событии прокрутки:
       если браузер придушил кадры, картинка всё равно идёт за пальцем */
    function step(now) {
      const dt = Math.min(100, now - (lastTick || now));
      lastTick = now;
      shown += (target - shown) * (1 - Math.pow(1 - SMOOTH, dt / 16.667));
      if (Math.abs(target - shown) < 0.0005) shown = target;
      if (video && video.duration) requestSeek(shown * video.duration);
      onMove(shown);
      return shown !== target;
    }
    function loop(now) {
      raf = null;
      if (mode !== 'scrub') return;
      if (step(now)) raf = requestAnimationFrame(loop); else lastTick = 0;
    }
    function onScroll() {
      if (mode === 'beats') { pinCheck(); return; }
      if (mode !== 'scrub') return;
      target = progressAt();
      step(performance.now());
      if (onScreen && raf === null && shown !== target) raf = requestAnimationFrame(loop);
    }

    /* ═══ телефон: такты ═══ */
    function stopBeatRaf() { if (beatRaf) { cancelAnimationFrame(beatRaf); beatRaf = null; } }

    /* Вперёд ролик проигрывается, а не перематывается: для декодера это штатный режим.
       Скорость такая, чтобы любой отрезок занял около секунды. Останов держат три опоры:
       покадровый колбэк видео, кадры страницы и таймер. */
    function playForward(to, done) {
      const el = video;
      if (!el) { done(); return; }
      if (!el.duration) {                     // iOS отдаёт ролик только после первого play
        const pr = el.play();
        if (pr && pr.then) pr.then(() => el.pause()).catch(noop);
        done(); return;
      }
      const goal = to * el.duration;
      const span = Math.max(0.05, goal - el.currentTime);
      const rate = Math.min(4.5, Math.max(1, span / 0.85));
      el.playbackRate = rate;
      let fired = false, timer = null;
      /* прерывание ролик не останавливает: pause и play подряд гасят друг друга,
         новый переход просто переставит цель и скорость */
      cancelMove = () => { fired = true; if (timer) clearTimeout(timer); el.removeEventListener('timeupdate', tick); };
      function finish() {
        if (fired) return; fired = true;
        if (timer) clearTimeout(timer);
        stopBeatRaf(); cancelMove = null;
        el.pause(); el.playbackRate = 1;
        try { el.currentTime = goal; } catch (e) {}
        el.removeEventListener('timeupdate', tick);
        done();
      }
      function tick() { if (el.currentTime >= goal - 0.012) finish(); }
      el.addEventListener('timeupdate', tick);
      timer = setTimeout(finish, (span / rate) * 1000 + 700);   // предохранитель
      if (el.paused) { const pr = el.play(); if (pr && pr.catch) pr.catch(finish); }
      if (el.requestVideoFrameCallback) (function frame() {
        if (fired) return;
        if (el.currentTime >= goal - 0.012) { finish(); return; }
        el.requestVideoFrameCallback(frame);
      })();
      (function watch() {
        if (fired) return;
        if (el.currentTime >= goal - 0.012) { finish(); return; }
        beatRaf = requestAnimationFrame(watch);
      })();
    }

    /* Назад проигрывать нельзя: шагаем ступенями и каждый раз ждём готовый кадр */
    function seekTo(to, done) {
      const el = video;
      if (!el || !el.duration) { done(); return; }
      el.pause(); el.playbackRate = 1;
      const from = el.currentTime, goal = to * el.duration, STEPS = 9, PACE = 42;
      let k = 0, dead = false, timer = null, lastAt = performance.now();
      cancelMove = () => { dead = true; if (timer) clearTimeout(timer); el.removeEventListener('seeked', next); };
      function land() {
        if (dead) return;
        dead = true; cancelMove = null;
        el.removeEventListener('seeked', next);
        if (timer) clearTimeout(timer);
        try { el.currentTime = goal; } catch (e) {}
        done();
      }
      function stepBack() {
        if (dead) return;
        if (++k >= STEPS) { land(); return; }
        const e = 1 - Math.pow(1 - k / STEPS, 3);
        lastAt = performance.now();
        timer = setTimeout(next, 260);       // кадр не приехал — на шаге не зависаем
        try { el.currentTime = from + (goal - from) * e; } catch (err) { land(); }
      }
      /* ровный шаг, чтобы откат читался перемоткой, а не склейкой */
      function next() {
        if (dead) return;
        if (timer) clearTimeout(timer);
        const wait = PACE - (performance.now() - lastAt);
        if (wait > 4) timer = setTimeout(stepBack, wait); else stepBack();
      }
      el.addEventListener('seeked', next);
      timer = setTimeout(next, 260);
      try { el.currentTime = from + (goal - from) / STEPS; } catch (e) { land(); }
    }

    function goBeat(i) {
      if (i < 0 || i >= STOPS.length || i === beatI) return false;
      const back = i < beatI;
      beatI = i;
      onBeat(i, STOPS[i]);                    // табличка меняется сразу, ролик догоняет
      if (cancelMove) { cancelMove(); cancelMove = null; }
      stopBeatRaf();
      if (back) seekTo(STOPS[i], noop); else playForward(STOPS[i], noop);
      return true;
    }
    function advance(up) {
      if (up && beatI >= STOPS.length - 1) { tActive = false; leaveHero(); return; }
      if (!up && beatI <= 0) return;
      goBeat(beatI + (up ? 1 : -1));
    }

    /* палец перехватываем, только когда шапка стоит ровно в экране */
    function heroPinned() { const r = stage.getBoundingClientRect(); return r.top > -24 && r.top < 24; }
    function pinCheck() {
      const p = heroPinned();
      if (p !== pinned) { pinned = p; stage.classList.toggle('pinned', p); }
    }
    function onTouchStart(e) {
      if (mode !== 'beats') return;
      if (e.touches.length !== 1) { tActive = false; return; }
      tY = e.touches[0].clientY; tActive = heroPinned(); tDone = false;
    }
    function onTouchMove(e) {
      if (mode !== 'beats' || !tActive || e.touches.length !== 1) return;
      /* прокрутку гасим с первого движения: иначе браузер успеет начать свою */
      if (e.cancelable) e.preventDefault();
      if (tDone) return;
      const dy = tY - e.touches[0].clientY;
      if (Math.abs(dy) < 24) return;
      tDone = true;                           // один жест — один такт
      advance(dy > 0);
    }
    function onTouchEnd() { tActive = false; tDone = false; }

    /* колесо и тачпад в узком окне: тоже один жест — один такт */
    function onWheel(e) {
      if (mode !== 'beats' || e.ctrlKey || !heroPinned()) return;
      const up = e.deltaY > 0;
      if (!up && beatI <= 0 && !wLock) return;
      e.preventDefault();
      clearTimeout(wQuiet);
      wQuiet = setTimeout(() => { wLock = false; wAcc = 0; }, 200);
      if (wLock) return;
      wAcc += e.deltaY;
      if (Math.abs(wAcc) < 24) return;
      wLock = true; wAcc = 0;
      advance(up);
    }

    /* история кончилась: уводим страницу дальше сами, шапка с последней надписью уезжает вверх */
    function leaveHero() {
      const soft = reduceMQ.matches ? 'auto' : 'smooth';
      const y0 = scrollY;
      scrollTo({ top: stage.offsetTop + stage.offsetHeight, left: 0, behavior: soft });
      setTimeout(() => {                      // часть движков прокрутку окна игнорирует
        if (Math.abs(scrollY - y0) > 24) return;
        const t = stage.nextElementSibling;
        if (t) t.scrollIntoView({ behavior: soft, block: 'start' });
      }, 260);
    }

    /* ═══ ролик: лёгкая ступень сразу, полная на компьютере — Blob'ом сзади ═══ */
    function mount(kind) {
      const my = ++gen, cfg = SRC[kind];
      wrap.innerHTML = ''; wrap.classList.remove('hd');
      seekBusy = false; pendingTime = null;
      const lite = video = makeVideo(cfg.lite, 'film-lite', cfg.poster);
      lite.addEventListener('loadedmetadata', () => {
        if (my !== gen) return;
        onReady(1);
        if (mode === 'beats') { try { lite.currentTime = STOPS[beatI] * lite.duration; } catch (e) {} }
        else { target = progressAt(); requestSeek(shown * lite.duration); onScroll(); }
      }, { once: true });
      lite.addEventListener('loadeddata', () => { if (my === gen && cfg.full) upgrade(cfg.full, my); }, { once: true });
      lite.addEventListener('error', () => onReady(1), { once: true });
    }
    /* полная ступень целиком в памяти: любая перемотка мгновенна */
    function upgrade(url, my) {
      if (!window.fetch || !window.URL || !URL.createObjectURL) return;
      fetch(url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); }).then(blob => {
        if (my !== gen) return;
        const hd = makeVideo(URL.createObjectURL(blob), 'film-hd');
        hd.addEventListener('loadeddata', () => {
          if (my !== gen) return;
          let swapped = false;
          const swap = () => {
            if (swapped || my !== gen) return; swapped = true;
            video = hd; seekBusy = false; pendingTime = null;
            wrap.classList.add('hd');
            onScroll();
          };
          hd.addEventListener('seeked', swap, { once: true });
          setTimeout(swap, 900);
          try { hd.currentTime = Math.max(0.001, video.currentTime); } catch (e) { swap(); }
        }, { once: true });
      }).catch(noop);
    }

    function applyMode() {
      const want = BEATS_MQ.matches ? 'beats' : 'scrub';
      if (want === mode) return;
      mode = want;
      stage.classList.toggle('beats', mode === 'beats');
      stage.classList.toggle('scrub', mode === 'scrub');
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      if (cancelMove) { cancelMove(); cancelMove = null; }
      stopBeatRaf();
      beatI = 0; pinned = null;
      mount(mode === 'beats' ? 'tall' : 'wide');
      onMode(mode);
      if (mode === 'beats') { pinCheck(); onBeat(0, STOPS[0]); }
      else { lastTick = 0; shown = target = progressAt(); onMove(shown); }
    }

    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
    stage.addEventListener('touchcancel', onTouchEnd, { passive: true });
    stage.addEventListener('wheel', onWheel, { passive: false });
    /* iOS в режиме прокрутки иногда не отдаёт кадр, пока ролик не тронули проигрыванием */
    addEventListener('touchstart', () => {
      if (mode !== 'scrub' || !video) return;
      const pr = video.play();
      if (pr && pr.then) pr.then(() => video.pause()).catch(noop);
    }, { passive: true, once: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) onScroll(); }, { threshold: 0 }).observe(stage);
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    listen(BEATS_MQ, applyMode);
    applyMode();
    setTimeout(() => onReady(1), 2200);        // страницу из-за ролика не держим

    return Promise.resolve({ go: goBeat, get beat() { return beatI; }, get mode() { return mode; } });
  }

  return { init };
})();
