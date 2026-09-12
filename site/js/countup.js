/* Молл Строй — цифры-одометр (порт count-up.tsx на ванильный JS).
   Каждая цифра крутится в своей колонке ровно duration секунд и встаёт точно на нужную.
   Использование:  CountUp.mount(el, { to: 1200, duration: 1 });  CountUp.set(el, 3400); */
window.CountUp = (function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nf = new Intl.NumberFormat('ru-RU');
  const fmt = (v, d) => nf.format(d ? +(+v).toFixed(d) : Math.round(v));

  const items = new Set();
  let raf = 0;

  // цифры крутятся ровно duration секунд и встают точно на нужное число
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    raf = 0;
    let alive = false;
    items.forEach(it => {
      if (!it.running) return;
      const t = Math.min(1, (now - it.t0) / (it.duration * 1000));
      it.value = it.from + (it.to - it.from) * ease(t);
      if (t >= 1) { it.value = it.to; it.running = false; } else alive = true;
      paint(it);
    });
    if (alive) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function build(it) {
    const str = fmt(Math.max(Math.abs(it.to), Math.abs(it.from)), it.decimals);
    if (str === it.shape) return;
    it.shape = str;
    it.el.innerHTML = '';
    it.el.classList.add('cu');
    it.cells = [];
    const head = str.split(/[.,]/)[0];            // целая часть
    const whole = (head.match(/\d/g) || []).length;
    let seen = 0;
    [...str].forEach(ch => {
      if (/\d/.test(ch)) {
        const place = Math.pow(10, whole - 1 - seen); seen++;
        const cell = document.createElement('span');
        cell.className = 'cu-d';
        cell.setAttribute('aria-hidden', 'true');
        const roll = document.createElement('span');
        roll.className = 'cu-r';
        roll.innerHTML = '<i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i><i>0</i>';
        cell.appendChild(roll);
        it.el.appendChild(cell);
        it.cells.push({ roll, place });
      } else {
        const s = document.createElement('span');
        s.className = 'cu-s';
        s.textContent = ch === ' ' ? ' ' : ch;
        it.el.appendChild(s);
      }
    });
    if (it.suffix) {
      const s = document.createElement('span');
      s.className = 'cu-s cu-suf';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = it.suffix;
      it.el.appendChild(s);
    }
    // настоящая цифра — для поиска, копирования и скринридера
    const sr = document.createElement('span');
    sr.className = 'cu-sr';
    sr.textContent = fmt(it.to, it.decimals) + (it.suffix || '');
    it.el.appendChild(sr);
    it.sr = sr;
  }

  function paint(it) {
    const done = !it.running;
    const v = done ? Math.abs(+it.to.toFixed(it.decimals)) : Math.abs(it.value);
    it.cells.forEach(c => {
      // пока крутится — плавное смещение, на финише — ровная цифра без хвоста
      const d = done ? Math.floor((v / c.place) % 10 + 1e-6) : (v / c.place) % 10;
      c.roll.style.setProperty('--d', done ? String(d) : d.toFixed(3));
    });
  }

  function startWhenSeen(it) {
    if (reduced) { it.value = it.to; paint(it); return; }
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        io.disconnect();
        it.from = it.value; it.t0 = performance.now(); it.running = true; kick();
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(it.el);
  }

  function mount(el, opt) {
    if (!el) return null;
    const o = opt || {};
    const it = {
      el,
      to: +o.to || 0,
      from: o.from != null ? +o.from : 0,
      duration: o.duration || 1,
      decimals: o.decimals || 0,
      suffix: o.suffix || '',
      value: o.from != null ? +o.from : 0,
      t0: 0,
      running: false,
      cells: [],
      shape: ''
    };
    el.__cu = it;
    items.add(it);
    el.setAttribute('aria-label', fmt(it.to, it.decimals) + (it.suffix || ''));
    build(it); paint(it);
    startWhenSeen(it);
    return it;
  }

  function set(el, to, opt) {
    const it = el && el.__cu;
    if (!it) return mount(el, Object.assign({ to: to }, opt || {}));
    it.to = +to || 0;
    if (opt && opt.duration) it.duration = opt.duration;
    it.el.setAttribute('aria-label', fmt(it.to, it.decimals) + (it.suffix || ''));
    build(it);
    if (it.sr) it.sr.textContent = fmt(it.to, it.decimals) + (it.suffix || '');
    if (reduced) { it.value = it.to; paint(it); return it; }
    it.from = it.value; it.t0 = performance.now(); it.running = true; kick();
    return it;
  }

  /* размечает все <span class="js-cu" data-to="1200" data-suffix=" ₽"> внутри root */
  function scan(root) {
    (root || document).querySelectorAll('.js-cu:not(.cu)').forEach(el => {
      mount(el, {
        to: +el.dataset.to,
        from: +el.dataset.from || 0,
        duration: +el.dataset.duration || 1,
        decimals: +el.dataset.decimals || 0,
        suffix: el.dataset.suffix || ''
      });
    });
  }

  return { mount, set, scan };
})();
