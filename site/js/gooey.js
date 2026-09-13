/* Молл Строй — текст с «гуи»-перетеканием (порт gooey-text-morphing.tsx на ванильный JS).
   Два слоя текста с размытием прогоняются через SVG-порог: буквы слипаются и перетекают друг в друга.
   Использование:  Gooey.cycle(el, ['Доска', 'Брус']);   Gooey.reveal(el); */
window.Gooey = (function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function filterId() {
    if (document.getElementById('gooeyThreshold')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'gooey-defs');
    svg.innerHTML = '<defs><filter id="gooeyThreshold">' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"/>' +
      '</filter></defs>';
    document.body.appendChild(svg);
  }

  /* перетекание по кругу: texts[0] → texts[1] → … */
  function cycle(el, texts, opt) {
    if (!el || !texts || !texts.length) return null;
    const o = opt || {};
    const morphTime = o.morphTime || 1;
    const coolTime = o.cooldownTime != null ? o.cooldownTime : 0.6;
    filterId();

    el.classList.add('gooey');
    el.innerHTML = '<span class="gooey-in"><span class="gooey-t"></span><span class="gooey-t"></span></span>';
    const box = el.firstChild, a = box.children[0], b = box.children[1];
    el.setAttribute('aria-label', texts.join(' · '));

    if (reduced || texts.length === 1) {
      a.textContent = texts[0]; a.style.opacity = '1'; b.style.opacity = '0';
      return { stop() {} };
    }

    let idx = texts.length - 1, morph = 0, cool = coolTime, last = performance.now(), raf = 0, on = false;
    a.textContent = texts[idx % texts.length];
    b.textContent = texts[(idx + 1) % texts.length];

    const setMorph = f => {
      box.classList.add('on'); // порог включаем только на время перетекания
      b.style.filter = 'blur(' + Math.min(6 / f - 6, 24) + 'px)';
      b.style.opacity = Math.pow(f, 0.4) * 100 + '%';
      const g = 1 - f;
      a.style.filter = 'blur(' + Math.min(6 / g - 6, 24) + 'px)';
      a.style.opacity = Math.pow(g, 0.4) * 100 + '%';
      if (f >= 0.995) { box.classList.remove('on'); b.style.filter = ''; a.style.filter = ''; }
    };
    const cooldown = () => {
      morph = 0;
      box.classList.remove('on'); // в покое — обычный чёткий текст
      b.style.filter = ''; b.style.opacity = '100%';
      a.style.filter = ''; a.style.opacity = '0%';
    };

    function tick(now) {
      raf = on ? requestAnimationFrame(tick) : 0;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const wasCooling = cool > 0;
      cool -= dt;
      if (cool <= 0) {
        if (wasCooling) {
          idx = (idx + 1) % texts.length;
          a.textContent = texts[idx % texts.length];
          b.textContent = texts[(idx + 1) % texts.length];
        }
        morph -= cool; // cool ушёл в минус на величину кадра — на неё и растёт перетекание
        cool = 0;
        let f = morph / morphTime;
        if (f > 1) { cool = coolTime; f = 1; }
        setMorph(f);
      } else cooldown();
    }

    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting && !on) { on = true; last = performance.now(); raf = requestAnimationFrame(tick); }
        else if (!e.isIntersecting && on) { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
      });
    }, { rootMargin: '10% 0px' });
    io.observe(el);

    return { stop() { on = false; io.disconnect(); if (raf) cancelAnimationFrame(raf); } };
  }

  /* одноразовое появление: текст собирается из размытых пятен.
     { manual: true } — не ждать экрана, а вернуть play(): его зовут, когда подпись вышла в кадр */
  function reveal(el, opt) {
    if (!el) return null;
    filterId();
    const dur = (opt && opt.duration) || 0.65;
    el.classList.add('gooey-once');
    let raf = 0, safety = 0;
    const settle = () => { el.style.filter = ''; el.style.opacity = '1'; }; // в конце — чёткий шрифт
    function play() {
      if (reduced) { settle(); return; }
      cancelAnimationFrame(raf); clearTimeout(safety);
      const t0 = performance.now();
      safety = setTimeout(() => { cancelAnimationFrame(raf); settle(); }, dur * 1000 + 400);
      (function run(now) {
        const p = Math.min(1, Math.max(0, (now - t0) / (dur * 1000)));
        const e2 = 1 - Math.pow(1 - p, 3);
        if (p < 1) {
          el.style.filter = 'url(#gooeyThreshold) blur(' + (7 * (1 - e2)).toFixed(2) + 'px)';
          el.style.opacity = Math.pow(e2, 0.5).toFixed(3);
          raf = requestAnimationFrame(run);
        } else { clearTimeout(safety); settle(); }
      })(t0);
    }
    if ((opt && opt.manual) || reduced) { if (reduced) settle(); return { play }; }
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (!e.isIntersecting) return; io.disconnect(); play(); });
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
    return { play };
  }

  return { cycle, reveal };
})();
