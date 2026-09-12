/* «Дом на разбор»: scroll-driven 3D. The house stands; each layer is ripped off and flies out of frame
   (some boards straight past the camera) while the camera orbits like a drone; at the end everything
   flies back into stacks. Requires three.js r128 (global THREE). */
(function () {
  'use strict';
  const tick = () => new Promise(r => requestAnimationFrame(() => r()));

  window.House = { init };

  async function init(o) {
    const { canvas, stage, sticky, stepEls } = o;
    const progress = o.onProgress || (() => {});
    const onStep = o.onStep || (() => {});
    if (!window.THREE) throw new Error('three.js не загрузился');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = () => innerWidth < 900 || innerWidth / innerHeight < 1;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, narrow() ? 1.5 : 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f0d0b, 26, 62);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220);
    progress(0.08);

    /* ---------- helpers ---------- */
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const UP = V(0, 1, 0), X = V(1, 0, 0), Z = V(0, 0, 1);
    const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const flyOut = k => k * k * (0.35 + 0.65 * k) + 0.05 * Math.sin(Math.min(1, k * 4) * Math.PI / 2);
    const _m = new THREE.Matrix4();
    function basis(ex, ey) {
      const ez = new THREE.Vector3().crossVectors(ex, ey).normalize();
      _m.makeBasis(ex, ey, ez);
      return new THREE.Quaternion().setFromRotationMatrix(_m);
    }
    const qY90 = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2);
    function flat(size, alongZ) {
      const d = [['x', size.x], ['y', size.y], ['z', size.z]].sort((a, b) => a[1] - b[1]);
      const map = {}; map[d[2][0]] = X.clone(); map[d[1][0]] = Z.clone(); map[d[0][0]] = UP.clone();
      let ez = map.z;
      if (new THREE.Vector3().crossVectors(map.x, map.y).dot(ez) < 0) ez = ez.clone().negate();
      _m.makeBasis(map.x, map.y, ez);
      let q = new THREE.Quaternion().setFromRotationMatrix(_m);
      if (alongZ) q = qY90.clone().multiply(q);
      return { q, thin: d[0][1], mid: d[1][1], long: d[2][1] };
    }
    function tex(w, h, draw, rep) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return t;
    }

    /* ---------- procedural textures ---------- */
    const woodTex = tex(1024, 128, (g, w, h) => {
      g.fillStyle = '#d9b07a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(${150 + rnd() * 60 | 0},${95 + rnd() * 40 | 0},${48 + rnd() * 25 | 0},${0.08 + rnd() * 0.12})`; g.fillRect(0, rnd() * h, w, 2 + rnd() * 14); }
      for (let i = 0; i < 70; i++) {
        const y0 = rnd() * h, amp = 1 + rnd() * 4, fr = 0.002 + rnd() * 0.01, ph = rnd() * 6;
        g.strokeStyle = `rgba(108,66,30,${0.1 + rnd() * 0.25})`; g.lineWidth = 0.6 + rnd() * 1.4; g.beginPath();
        for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * fr + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const x = rnd() * w, y = rnd() * h, r = 3 + rnd() * 5, gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
        gr.addColorStop(0, 'rgba(88,48,18,.85)'); gr.addColorStop(0.5, 'rgba(120,70,30,.35)'); gr.addColorStop(1, 'rgba(120,70,30,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 2.4, r, 0, 0, 7); g.fill();
      }
    });
    const osbTex = tex(512, 512, (g, w, h) => {
      g.fillStyle = '#b98a50'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) {
        const l = 18 + rnd() * 46, t = 5 + rnd() * 9, c = 150 + rnd() * 80 | 0;
        g.save(); g.translate(rnd() * w, rnd() * h); g.rotate((rnd() - 0.5) * 0.9);
        g.fillStyle = `rgb(${Math.min(255, c + 30)},${c - 12},${c - 72})`; g.fillRect(-l / 2, -t / 2, l, t);
        g.strokeStyle = 'rgba(70,40,15,.22)'; g.strokeRect(-l / 2, -t / 2, l, t); g.restore();
      }
    });
    await tick(); progress(0.18);
    const woolTex = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#cdb56e'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const x = rnd() * w, y = rnd() * h, l = 4 + rnd() * 14, a = rnd() * Math.PI;
        g.strokeStyle = rnd() < 0.5 ? `rgba(246,226,150,${0.25 + rnd() * 0.35})` : `rgba(118,92,40,${0.15 + rnd() * 0.25})`;
        g.lineWidth = 0.6 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    });
    const film = (base, ink, word) => tex(512, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.22; g.strokeStyle = ink; for (let y = 0; y < h; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.globalAlpha = 0.55; g.fillStyle = ink; g.font = '600 22px sans-serif';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) g.fillText(word, c * 190 + (r % 2) * 80 - 20, 40 + r * 52);
    });
    const windTex = film('#eef2f3', '#3b7fa6', 'ВЕТРОЗАЩИТА А');
    const vaporTex = film('#dde2e5', '#5d6770', 'ПАРОИЗОЛЯЦИЯ В');
    const plyTex = tex(512, 512, (g, w, h) => {
      g.fillStyle = '#dcc196'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const y0 = rnd() * h, amp = 8 + rnd() * 30, fr = 0.004 + rnd() * 0.008, ph = rnd() * 6;
        g.strokeStyle = `rgba(150,110,60,${0.08 + rnd() * 0.15})`; g.lineWidth = 1 + rnd() * 2; g.beginPath();
        for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * fr + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    });
    await tick(); progress(0.3);

    const MAT = {
      pine: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.78 }),
      clad: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.68, color: 0xcf9860 }),
      osb: new THREE.MeshStandardMaterial({ map: osbTex, roughness: 0.86 }),
      ply: new THREE.MeshStandardMaterial({ map: plyTex, roughness: 0.8 }),
      wool: new THREE.MeshStandardMaterial({ map: woolTex, roughness: 1 }),
      wind: new THREE.MeshStandardMaterial({ map: windTex, roughness: 0.55, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
      vapor: new THREE.MeshStandardMaterial({ map: vaporTex, roughness: 0.4, metalness: 0.15, transparent: true, opacity: 0.86, side: THREE.DoubleSide }),
      rollW: new THREE.MeshStandardMaterial({ map: windTex, roughness: 0.6 }),
      rollV: new THREE.MeshStandardMaterial({ map: vaporTex, roughness: 0.45, metalness: 0.1 }),
      can: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.5, metalness: 0.35, transparent: true }),
      glass: new THREE.MeshStandardMaterial({ color: 0x2a1a0c, emissive: 0xff9a3c, emissiveIntensity: 1.0, transparent: true }),
      frameW: new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6, transparent: true }),
      door: new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.7, transparent: true }),
      pile: new THREE.MeshStandardMaterial({ color: 0x5b5752, roughness: 0.95, transparent: true })
    };
    const VANISH = ['roof', 'glass', 'frameW', 'door', 'pile'];
    const APPEAR = new Set(['rollW', 'rollV', 'can']);

    /* ---------- pieces (assembled state A) ---------- */
    const groups = {};
    function P(kind, a, qa, size, o) {
      const p = Object.assign({ kind, a, qa, size, stage: 1, dir: UP, dist: 1, lift: 0, delay: null, cat: '', spin: 0.09 }, o);
      (groups[kind] = groups[kind] || []).push(p);
      return p;
    }
    function sub(r, o) {
      if (o.u1 <= r.u0 || o.u0 >= r.u1 || o.v1 <= r.v0 || o.v0 >= r.v1) return [r];
      const out = [], v0 = Math.max(r.v0, o.v0), v1 = Math.min(r.v1, o.v1);
      if (o.v0 > r.v0) out.push({ u0: r.u0, u1: r.u1, v0: r.v0, v1: o.v0 });
      if (o.v1 < r.v1) out.push({ u0: r.u0, u1: r.u1, v0: o.v1, v1: r.v1 });
      if (o.u0 > r.u0) out.push({ u0: r.u0, u1: o.u0, v0, v1 });
      if (o.u1 < r.u1) out.push({ u0: o.u1, u1: r.u1, v0, v1 });
      return out;
    }
    function tile(u0, u1, v0, v1, tw, th, holes) {
      let rs = [];
      for (let v = v0; v < v1 - 1e-6; v += th) for (let u = u0; u < u1 - 1e-6; u += tw) rs.push({ u0: u, u1: Math.min(u + tw, u1), v0: v, v1: Math.min(v + th, v1) });
      (holes || []).forEach(o => { rs = rs.flatMap(r => sub(r, o)); });
      return rs.filter(r => r.u1 - r.u0 > 0.05 && r.v1 - r.v0 > 0.03);
    }

    const FLOOR = 0.704, WH = 2.7, H = 3.0, DEPTH = 0.15;
    const TANP = 1.9 / 3.0, PITCH = Math.atan(TANP), CP = Math.cos(PITCH), SP = Math.sin(PITCH);
    const RIDGE_Y = FLOOR + WH + H * TANP, LS = 3.4 / CP;
    const qX = basis(X, UP), qZ = basis(Z, UP);

    for (const x of [-2.9, 0, 2.9]) for (const z of [-2.9, 0, 2.9]) P('pile', V(x, 0, z), new THREE.Quaternion(), V(0.24, 0.6, 0.24), { dist: 0, lift: -0.5 });
    P('pine', V(0, 0.375, 2.925), qX, V(6, 0.15, 0.15), { stage: 6, dir: Z, cat: 'brus' });
    P('pine', V(0, 0.375, -2.925), qX, V(6, 0.15, 0.15), { stage: 6, dir: V(0, 0, -1), cat: 'brus' });
    P('pine', V(2.925, 0.375, 0), qZ, V(5.7, 0.15, 0.15), { stage: 6, dir: X, cat: 'brus' });
    P('pine', V(-2.925, 0.375, 0), qZ, V(5.7, 0.15, 0.15), { stage: 6, dir: V(-1, 0, 0), cat: 'brus' });
    P('pine', V(0, 0.375, 0), qX, V(5.7, 0.15, 0.15), { stage: 6, dir: UP, cat: 'brus' });
    for (let x = -2.7; x <= 2.71; x += 0.6) P('pine', V(x, 0.55, 0), qZ, V(5.7, 0.2, 0.05), { stage: 6, dir: V(Math.sign(x) || 1, 0.4, 0).normalize(), cat: 'doska' });
    tile(-2.85, 2.85, -2.85, 2.85, 2.44, 1.22).forEach(r => P('ply', V((r.u0 + r.u1) / 2, 0.659, (r.v0 + r.v1) / 2), qX, V(r.u1 - r.u0, 0.018, r.v1 - r.v0), { stage: 6, dir: UP, cat: 'ply' }));
    for (let z = -2.85 + 0.0675, i = 0; z < 2.85; z += 0.135, i++) P('pine', V(0, 0.686, z), qX, V(5.7, 0.036, 0.13), { stage: 6, dir: UP, cat: 'shpunt', delay: (i % 7) / 7 * 0.4, tint: 0.9 });

    const walls = [
      { n: V(0, 0, 1), op: [{ u0: -0.45, u1: 0.45, v0: 0, v1: 2.1, door: 1 }, { u0: -2.4, u1: -1.2, v0: 0.9, v1: 2.1 }, { u0: 1.2, u1: 2.4, v0: 0.9, v1: 2.1 }] },
      { n: V(1, 0, 0), op: [{ u0: -0.6, u1: 0.6, v0: 0.9, v1: 2.1 }] },
      { n: V(0, 0, -1), op: [{ u0: -1.5, u1: -0.3, v0: 0.9, v1: 2.1 }] },
      { n: V(-1, 0, 0), op: [{ u0: -0.6, u1: 0.6, v0: 0.9, v1: 2.1 }] }
    ];
    walls.forEach(w => {
      w.t = new THREE.Vector3().crossVectors(UP, w.n);
      w.fb = Math.abs(w.n.z) > 0.5;
      w.qH = basis(w.t, UP); w.qV = basis(UP, w.t);
      w.up = w.n.clone().multiplyScalar(-0.35).add(UP).normalize(); // inner layers leave upward through the open roof
      w.gable = !w.fb;
    });
    const wp = (w, u, v, d) => new THREE.Vector3().addScaledVector(w.n, d).addScaledVector(w.t, u).addScaledVector(UP, FLOOR + v);

    walls.forEach(w => {
      const uh = w.fb ? H : H - DEPTH, dF = H - DEPTH / 2, out = w.n;
      P('pine', wp(w, 0, 0.025, dF), w.qH, V(uh * 2, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska' });
      P('pine', wp(w, 0, WH - 0.025, dF), w.qH, V(uh * 2, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska' });
      let us = [];
      for (let u = -uh + 0.025; u <= uh - 0.025 + 1e-6; u += 0.6) us.push(u);
      us.push(uh - 0.025);
      w.op.forEach(o => us.push(o.u0 - 0.025, o.u1 + 0.025));
      us = [...new Set(us.map(u => +u.toFixed(3)))].sort((a, b) => a - b);
      const studs = [];
      us.forEach(u => { if (!studs.length || u - studs[studs.length - 1] >= 0.12) studs.push(u); });
      const inOp = u => w.op.find(o => u > o.u0 + 0.02 && u < o.u1 - 0.02);
      studs.forEach(u => {
        const o = inOp(u), dl = (u + uh) / (2 * uh) * 0.35;
        if (!o) { P('pine', wp(w, u, WH / 2, dF), w.qV, V(WH - 0.1, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska', delay: dl, flyCam: true }); return; }
        if (o.v0 > 0.15) { const h = o.v0 - 0.1; P('pine', wp(w, u, 0.05 + h / 2, dF), w.qV, V(h, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska', delay: dl }); }
        const t0 = o.v1 + 0.2, h2 = WH - 0.05 - t0;
        if (h2 > 0.08) P('pine', wp(w, u, t0 + h2 / 2, dF), w.qV, V(h2, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska', delay: dl });
      });
      w.op.forEach(o => {
        const L = o.u1 - o.u0 + 0.1, uc = (o.u0 + o.u1) / 2;
        P('pine', wp(w, uc, o.v1 + 0.1, dF), w.qH, V(L, 0.2, DEPTH), { stage: 6, dir: out, cat: 'doska' });
        if (o.v0 > 0.1) P('pine', wp(w, uc, o.v0 - 0.025, dF), w.qH, V(L, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska' });
        const ow = o.u1 - o.u0, oh = o.v1 - o.v0, vc = (o.v0 + o.v1) / 2;
        if (o.door) P('door', wp(w, uc, vc, H - 0.07), w.qH, V(ow - 0.02, oh - 0.02, 0.05), { dir: out, dist: 2, lift: 0.3 });
        else {
          P('glass', wp(w, uc, vc, H - 0.07), w.qH, V(ow - 0.1, oh - 0.1, 0.02), { dir: out, dist: 2, lift: 0.3 });
          [[0, oh / 2 - 0.03, ow, 0.06], [0, -oh / 2 + 0.03, ow, 0.06], [-ow / 2 + 0.03, 0, 0.06, oh], [ow / 2 - 0.03, 0, 0.06, oh]].forEach(f =>
            P('frameW', wp(w, uc + f[0], vc + f[1], H - 0.07), w.qH, V(f[2], f[3], 0.07), { dir: out, dist: 2, lift: 0.3 }));
        }
      });
      for (let i = 0; i < studs.length - 1; i++) {
        const a = studs[i], b = studs[i + 1], bw = b - a - 0.05, uc = (a + b) / 2;
        if (bw < 0.1) continue;
        let ranges = [[0.05, WH - 0.05]];
        const o = w.op.find(q => uc > q.u0 && uc < q.u1);
        if (o) ranges = [[0.05, o.v0 - 0.05], [o.v1 + 0.2, WH - 0.05]].filter(r => r[1] - r[0] > 0.1);
        ranges.forEach(r => {
          const n = Math.ceil((r[1] - r[0]) / 1.25), hh = (r[1] - r[0]) / n;
          for (let k = 0; k < n; k++) P('wool', wp(w, uc, r[0] + hh * (k + 0.5), dF), w.qH, V(bw, hh - 0.01, DEPTH - 0.01), { stage: 4, dir: out, cat: 'uteplitel', flyCam: true });
        });
      }
      const eo = w.fb ? 0.012 : 0;
      tile(-H - eo, H + eo, -0.35, WH, 1.25, 2.5, w.op).forEach(r =>
        P('osb', wp(w, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, H + 0.006), w.qH, V(r.u1 - r.u0 - 0.004, r.v1 - r.v0 - 0.004, 0.012), { stage: 3, dir: out, cat: 'osb', flyCam: true }));
      const em = w.fb ? 0.015 : 0.003;
      tile(-H - em, H + em, -0.35, WH, 2 * (H + em), 1.5, w.op).forEach(r =>
        P('wind', wp(w, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, H + 0.0135), w.qH, V(r.u1 - r.u0, r.v1 - r.v0, 0.004), { stage: 2, dir: out, cat: 'wind', flyCam: true }));
      const ec = w.fb ? 0.04 : 0.016;
      tile(-H - ec, H + ec, -0.35, WH + 0.05, 2 * (H + ec), 0.14, w.op).forEach(r => {
        const vc = (r.v0 + r.v1) / 2;
        P('clad', wp(w, (r.u0 + r.u1) / 2, vc, H + 0.027), w.qH, V(r.u1 - r.u0, r.v1 - r.v0 - 0.006, 0.022), { stage: 1, dir: out, cat: 'otdelka', delay: 0.45 * (1 - (vc + 0.35) / 3.1), flyCam: true });
      });
      tile(-2.85, 2.85, 0.05, WH - 0.05, 5.7, 1.5, w.op).forEach(r =>
        P('vapor', wp(w, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, H - DEPTH - 0.003), w.qH, V(r.u1 - r.u0, r.v1 - r.v0, 0.004), { stage: 5, dir: w.up, cat: 'vapor' }));
      tile(-2.84, 2.84, 0, WH, 5.68, 0.096, w.op).forEach(r =>
        P('pine', wp(w, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, H - DEPTH - 0.014), w.qH, V(r.u1 - r.u0, r.v1 - r.v0 - 0.005, 0.016), { stage: 5, dir: w.up, cat: 'vagonka', tint: 1.08, delay: 0.4 * (r.v0 / WH) }));
      if (w.gable) {
        for (let u = -2.7; u <= 2.71; u += 0.6) {
          const hgt = (H - Math.abs(u)) * TANP - 0.06;
          if (hgt > 0.15) P('pine', wp(w, u, WH + hgt / 2, dF), w.qV, V(hgt, 0.05, DEPTH), { stage: 6, dir: out, cat: 'doska' });
        }
        for (let v = WH + 0.05; v < WH + 1.9; v += 0.14) {
          const vm = v + 0.07, half = H + 0.04 - (vm - WH) / TANP;
          if (half < 0.12) break;
          P('clad', wp(w, 0, vm, H + 0.027), w.qH, V(2 * half, 0.134, 0.022), { stage: 1, dir: out, cat: 'otdelka', delay: 0.45 * (1 - (vm + 0.35) / 4.6), flyCam: true });
        }
      }
    });

    [1, -1].forEach(s => {
      const D = V(0, -SP, s * CP), N = V(0, CP, s * SP);
      const rp = (u, w, n) => V(u, RIDGE_Y, 0).addScaledVector(D, w).addScaledVector(N, n);
      const qR = basis(D, N), qS = basis(X, N);
      for (let u = -3.3; u <= 3.31; u += 0.6) P('pine', rp(u, LS / 2, 0.1), qR, V(LS, 0.2, 0.05), { stage: 6, dir: N, cat: 'doska' });
      for (let u = -2.4; u <= 2.41; u += 0.6) {
        const wl = H / CP, n = 3, hl = (wl - 0.15) / n;
        for (let k = 0; k < n; k++) P('wool', rp(u, 0.15 + hl * (k + 0.5), 0.1), qR, V(hl - 0.01, 0.19, 0.55), { stage: 4, dir: N, cat: 'uteplitel' });
      }
      tile(-3.4, 3.4, 0, LS, 2.5, 1.25).forEach(r => P('osb', rp((r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, 0.206), qS, V(r.u1 - r.u0 - 0.004, 0.012, r.v1 - r.v0 - 0.004), { stage: 3, dir: N, cat: 'osb' }));
      tile(-3.4, 3.4, 0, LS, 6.8, 1.5).forEach(r => P('wind', rp(0, (r.v0 + r.v1) / 2, 0.2135), qS, V(6.8, 0.004, r.v1 - r.v0), { stage: 2, dir: N, cat: 'wind' }));
      for (let wv = 0.2; wv < LS; wv += 0.35) P('pine', rp(0, wv, 0.228), qS, V(6.8, 0.025, 0.05), { stage: 1, dir: N, cat: 'brusok' });
      tile(-3.4, 3.4, 0, LS, 1.134, LS).forEach(r => P('roof', rp((r.u0 + r.u1) / 2, LS / 2, 0.247), qS, V(r.u1 - r.u0 - 0.01, 0.012, LS + 0.04), { dir: N, dist: 7, lift: 2 }));
      tile(-2.85, 2.85, 0.1, H / CP, 5.7, 1.5).forEach(r => P('vapor', rp(0, (r.v0 + r.v1) / 2, -0.004), qS, V(5.7, 0.004, r.v1 - r.v0), { stage: 5, dir: UP, cat: 'vapor' }));
    });
    P('pine', V(0, RIDGE_Y + 0.11, 0), qX, V(6.8, 0.22, 0.05), { stage: 6, dir: UP, cat: 'doska' });
    await tick(); progress(0.5);

    /* ---------- camera path: drone orbit, one key per caption ---------- */
    const CAMK = [
      { az: 38, el: 13, r: 12.8, tx: 0, ty: 2.2 },
      { az: 88, el: 17, r: 13.6, tx: 0, ty: 2.5 },
      { az: 142, el: 22, r: 14.0, tx: 0, ty: 2.6 },
      { az: 196, el: 19, r: 13.6, tx: 0, ty: 2.6 },
      { az: 250, el: 27, r: 14.0, tx: 0, ty: 2.5 },
      { az: 305, el: 22, r: 13.2, tx: 0, ty: 2.5 },
      { az: 358, el: 34, r: 14.8, tx: 0, ty: 2.2 },
      { az: 372, el: 50, r: 16.5, tx: 0.2, ty: 0.4 }
    ];
    const NARROW_R = [1.5, 1.4, 1.4, 1.4, 1.4, 1.4, 1.45, 1.45];
    const OFF_NARROW = [0.2, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.1]; // phone: lift the scene above the caption card
    const OFF_WIDE = [-0.22, -0.13, -0.12, -0.12, -0.12, -0.12, -0.12, -0.1];
    const keyPos = (k, mul) => {
      const c = CAMK[k], az = c.az * Math.PI / 180, el = c.el * Math.PI / 180, r = c.r * (mul || 1);
      return V(c.tx + Math.sin(az) * Math.cos(el) * r, c.ty + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    };

    /* ---------- flight targets B: out of frame, some boards straight past the camera ---------- */
    const all = () => Object.values(groups).flat();
    // the frame leaves top-down: rafters first, then walls from the top plate down, the floor last
    all().forEach(p => {
      if (p.stage !== 6) return;
      if (p.cat === 'shpunt' || p.cat === 'ply') p.delay = 0.3 + rnd() * 0.12;
      else p.delay = Math.min(0.45, Math.max(0, 0.42 - (p.a.y / 5.5) * 0.4 + rnd() * 0.04));
    });
    all().forEach(p => {
      if (APPEAR.has(p.kind)) return;
      const cam = keyPos(p.stage, 1.4);
      if (VANISH.includes(p.kind)) {
        p.b = p.a.clone().addScaledVector(p.dir, p.dist).addScaledVector(UP, p.lift);
      } else {
        const toCam = cam.clone().sub(p.a).normalize();
        const horiz = V(toCam.x, 0, toCam.z).normalize();
        const facing = V(p.dir.x, 0, p.dir.z).normalize().dot(horiz);
        if (p.flyCam && facing > 0.3 && rnd() < 0.28) {
          const side = V(-horiz.z, 0, horiz.x);
          p.b = cam.clone().addScaledVector(toCam, 3 + rnd() * 6).addScaledVector(side, (rnd() - 0.5) * 8).add(V(0, (rnd() - 0.3) * 5, 0));
          p.viaCam = true;
        } else {
          const side = V(-p.dir.z, 0, p.dir.x);
          if (side.lengthSq() < 0.01) side.set(1, 0, 0);
          p.b = p.a.clone().addScaledVector(p.dir, 22 + rnd() * 16).addScaledVector(UP, 3 + rnd() * 10).addScaledVector(side.normalize(), (rnd() - 0.5) * 14);
        }
      }
      const axis = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      const ang = VANISH.includes(p.kind) ? 0.3 : (1.4 + rnd() * 2.6) * (rnd() < 0.5 ? -1 : 1);
      p.qb = p.qa.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      if (p.delay === null) p.delay = rnd() * 0.4;
      p.delay2 = rnd() * 0.3;
      p.arc = 1 + rnd() * 2.5;
    });

    /* ---------- stacked state C: the yard (long piles run toward the camera) ---------- */
    const piles = {};
    const byCat = cats => all().filter(p => cats.includes(p.cat) && !APPEAR.has(p.kind));
    function packBoards(name, list, cx, cz, width) {
      list.sort((a, b) => b.size.x - a.size.x);
      let y = 0, xc = -width / 2, layer = 0;
      list.forEach(p => {
        const f = flat(p.size, true);
        if (xc + f.mid > width / 2) { y += layer + 0.022; xc = -width / 2; layer = 0; }
        p.c = V(cx + xc + f.mid / 2, y + f.thin / 2, cz); p.qc = f.q;
        xc += f.mid + 0.01; layer = Math.max(layer, f.thin);
      });
      piles[name] = V(cx, y + layer, cz);
    }
    function packSheets(name, list, cx, cz) {
      const area = p => { const s = [p.size.x, p.size.y, p.size.z].sort((a, b) => a - b); return s[1] * s[2]; };
      list.sort((a, b) => area(b) - area(a));
      let y = 0;
      list.forEach(p => { const f = flat(p.size, true); p.c = V(cx + (rnd() - 0.5) * 0.05, y + f.thin / 2, cz + (rnd() - 0.5) * 0.05); p.qc = f.q; y += f.thin + 0.002; });
      piles[name] = V(cx, y, cz);
    }
    function packSlabs(name, list, cx, cz, nx, nz) {
      const cols = [];
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) cols.push({ x: cx + (i - (nx - 1) / 2) * 0.68, z: cz + (j - (nz - 1) / 2) * 1.32, y: 0 });
      list.forEach((p, i) => { const c = cols[i % cols.length], f = flat(p.size, true); p.c = V(c.x, c.y + f.thin / 2, c.z); p.qc = f.q; c.y += f.thin + 0.004; });
      piles[name] = V(cx, Math.max(...cols.map(c => c.y)), cz);
    }
    packBoards('doska', byCat(['doska']), -2.3, 0, 1.4);
    packBoards('otdelka', byCat(['otdelka', 'vagonka']), -0.7, 0, 1.3);
    packBoards('shpunt', byCat(['shpunt']), 0.75, 0, 1.2);
    packBoards('brus', byCat(['brus', 'brusok']), 2.0, 0, 0.9);
    packSheets('osb', byCat(['osb']), -4.0, -1.3);
    packSheets('ply', byCat(['ply']), -4.0, 1.8);
    packSlabs('wool', byCat(['uteplitel']), 3.9, -1.9, 3, 4);
    const ROLLS = V(3.7, 0, 2.2), qRoll = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2);
    [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]].forEach(rc => P('rollW', V(ROLLS.x, 0.1 + rc[1] * 0.18, ROLLS.z - 0.3 + rc[0] * 0.21), qRoll, V(0.1, 1.5, 0.1), {}));
    [[0, 0], [1, 0], [2, 0], [1, 1]].forEach(rc => P('rollV', V(ROLLS.x + 0.1, 0.1 + rc[1] * 0.18, ROLLS.z + 0.55 + rc[0] * 0.21), qRoll, V(0.1, 1.3, 0.1), {}));
    piles.rolls = V(ROLLS.x, 0.5, ROLLS.z + 0.3);
    [0x2f7d4a, 0xc98a2b, 0x2f5f9a, 0xa8362c].forEach((c, i) => P('can', V(4.9 + (i % 2) * 0.32, 0.16, 2.4 + Math.floor(i / 2) * 0.34), new THREE.Quaternion(), V(0.13, 0.32, 0.13), { col: c }));
    all().forEach(p => {
      if (APPEAR.has(p.kind)) { p.c = p.a; p.qc = p.qa; p.b = p.a; p.qb = p.qa; p.delay2 = rnd() * 0.3; }
      if (p.kind === 'wind' || p.kind === 'vapor') { p.c = piles.rolls.clone(); p.qc = p.qb; }
    });
    await tick(); progress(0.66);

    /* ---------- meshes ---------- */
    const box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 24);
    const meshes = {}, col = new THREE.Color();
    Object.keys(groups).forEach(kind => {
      const list = groups[kind];
      const mesh = new THREE.InstancedMesh(APPEAR.has(kind) ? cyl : box, MAT[kind], list.length);
      mesh.castShadow = !['glass', 'wind', 'vapor'].includes(kind);
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (['pine', 'clad', 'osb', 'wool', 'can'].includes(kind)) {
        list.forEach((p, i) => {
          if (p.col) col.setHex(p.col);
          else { const v = (p.tint || 1) * (0.84 + rnd() * 0.24); col.setRGB(v, v * (0.97 + rnd() * 0.03), v * (0.93 + rnd() * 0.05)); }
          mesh.setColorAt(i, col);
        });
        mesh.instanceColor.needsUpdate = true;
      }
      scene.add(mesh);
      meshes[kind] = mesh;
    });

    const groundTex = tex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256);
      gr.addColorStop(0, 'rgba(62,47,34,1)'); gr.addColorStop(0.5, 'rgba(32,25,19,.92)'); gr.addColorStop(1, 'rgba(15,13,11,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), new THREE.MeshStandardMaterial({ map: groundTex, transparent: true, roughness: 1, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; scene.add(ground);

    scene.add(new THREE.HemisphereLight(0x51607a, 0x1a120a, 0.55));
    const sun = new THREE.DirectionalLight(0xffb27a, 2.5);
    sun.position.set(-9, 7.5, 7.5); sun.castShadow = true;
    const sm = narrow() ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 42 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x86bfd0, 0.95); rim.position.set(8, 6, -9); scene.add(rim);
    const inner = new THREE.PointLight(0xffc07a, 2.2, 10, 2); inner.position.set(0, 2.1, 0); scene.add(inner);

    const PN = narrow() ? 240 : 480;
    const pa = new Float32Array(PN * 3), pv = new Float32Array(PN);
    for (let i = 0; i < PN; i++) { pa[i * 3] = (rnd() - 0.5) * 20; pa[i * 3 + 1] = rnd() * 9 - 0.3; pa[i * 3 + 2] = (rnd() - 0.5) * 20; pv[i] = 0.2 + rnd() * 0.5; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
    const dot = tex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,232,196,1)'); gr.addColorStop(0.35, 'rgba(255,200,140,.45)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const pmat = new THREE.PointsMaterial({ size: 0.07, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45, color: 0xffd29a });
    scene.add(new THREE.Points(pg, pmat));
    const posAttr = pg.getAttribute('position');
    await tick(); progress(0.82);

    /* ---------- scroll mapping ---------- */
    let pc = [], R = [], W = 1, Hh = 1, target = 0, prog = 0;
    function measure() {
      const vh = innerHeight, total = Math.max(1, stage.offsetHeight - vh);
      pc = stepEls.map(el => clamp01((el.offsetTop + el.offsetHeight / 2 - vh / 2) / total));
      pc[0] = 0;
      R = [];
      const last = pc.length - 1;
      for (let k = 1; k < last; k++) {
        const gp = pc[k] - pc[k - 1], gn = pc[k + 1] - pc[k];
        R[k] = [pc[k] - 0.42 * gp, pc[k] + 0.46 * gn];
      }
      const gl = pc[last] - pc[last - 1];
      R[last] = [pc[last - 1] + 0.52 * gl, pc[last] - 0.04 * gl];
    }
    const readScroll = () => { const total = Math.max(1, stage.offsetHeight - innerHeight); target = clamp01(-stage.getBoundingClientRect().top / total); };
    function resize() {
      W = sticky.clientWidth; Hh = sticky.clientHeight;
      renderer.setSize(W, Hh, false);
      camera.aspect = W / Hh;
      camera.fov = narrow() ? 50 : 34;
      camera.updateProjectionMatrix();
      measure(); readScroll();
    }

    /* ---------- per-frame update ---------- */
    const tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3(), mx = new THREE.Matrix4();
    const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    function camParam(p) {
      let i = 0; while (i < pc.length - 2 && p > pc[i + 1]) i++;
      const t = clamp01((p - pc[i]) / Math.max(1e-6, pc[i + 1] - pc[i]));
      const k = j => CAMK[Math.max(0, Math.min(CAMK.length - 1, j))];
      const mulA = j => NARROW_R[Math.max(0, Math.min(NARROW_R.length - 1, j))];
      const out = {};
      ['az', 'el', 'r', 'tx', 'ty'].forEach(f => { out[f] = cr(k(i - 1)[f], k(i)[f], k(i + 1)[f], k(i + 2)[f], t); });
      out.mul = cr(mulA(i - 1), mulA(i), mulA(i + 1), mulA(i + 2), t);
      out.off = OFF_WIDE[i] + (OFF_WIDE[i + 1] - OFF_WIDE[i]) * t;
      out.offN = OFF_NARROW[i] + (OFF_NARROW[i + 1] - OFF_NARROW[i]) * t;
      out.i = i; out.t = t;
      return out;
    }
    let lastAz = null;
    function update(p, time) {
      const last = R.length - 1, rS = R[last], k2raw = clamp01((p - rS[0]) / (rS[1] - rS[0]));
      let act = 0;
      Object.keys(groups).forEach(kind => {
        const list = groups[kind], mesh = meshes[kind], shrink = kind === 'wind' || kind === 'vapor', appear = APPEAR.has(kind);
        for (let i = 0; i < list.length; i++) {
          const pz = list[i];
          if (appear) {
            const k = ease(clamp01((k2raw - 0.4 - pz.delay2 * 0.5) / 0.45));
            ts.copy(pz.size).multiplyScalar(Math.max(k, 0.0001));
            mx.compose(pz.a, pz.qa, ts); mesh.setMatrixAt(i, mx); continue;
          }
          const r = R[pz.stage];
          const kr = clamp01((p - r[0]) / (r[1] - r[0]));
          const k1 = clamp01((kr - pz.delay) / 0.55);
          const k2 = pz.c ? easeOut(clamp01((k2raw - pz.delay2) / 0.7)) : 0;
          ts.copy(pz.size);
          if (k2 > 0) {
            tp.copy(pz.b).lerp(pz.c, k2); tp.y += Math.sin(k2 * Math.PI) * pz.arc;
            tq.copy(pz.qb).slerp(pz.qc, k2);
            if (shrink) ts.multiplyScalar(Math.max(1 - k2, 0.0001));
          } else {
            const f = flyOut(k1);
            tp.copy(pz.a).lerp(pz.b, f); tq.copy(pz.qa).slerp(pz.qb, Math.min(1, k1 * 1.2));
            if (k1 >= 0.995) ts.multiplyScalar(0.0001); // gone: out of frame for the rest of the film
          }
          mx.compose(tp, tq, ts); mesh.setMatrixAt(i, mx);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
      for (let k = 1; k < R.length; k++) act = Math.max(act, Math.sin(clamp01((p - R[k][0]) / (R[k][1] - R[k][0])) * Math.PI));
      const fade = 1 - clamp01((p - R[1][0]) / ((R[1][1] - R[1][0]) * 0.35));
      VANISH.forEach(k => { MAT[k].opacity = fade; if (meshes[k]) meshes[k].visible = fade > 0.01; });
      MAT.glass.emissiveIntensity = fade;
      inner.intensity = 0.7 + 1.6 * fade;
      pmat.opacity = 0.3 + 0.55 * act;

      // drone camera
      const c = camParam(p), nar = narrow();
      const az = c.az * Math.PI / 180, el = c.el * Math.PI / 180, rad = c.r * (nar ? c.mul : 1);
      const tgt = V(c.tx, c.ty, 0);
      camera.position.set(tgt.x + Math.sin(az) * Math.cos(el) * rad, tgt.y + Math.sin(el) * rad, Math.cos(az) * Math.cos(el) * rad);
      if (!reduced) { camera.position.y += Math.sin(time * 0.0009) * 0.12; camera.position.x += Math.sin(time * 0.0006) * 0.1; }
      camera.lookAt(tgt);
      const dAz = lastAz === null ? 0 : c.az - lastAz; lastAz = c.az;
      bank += (clamp(-dAz * 0.05, -0.07, 0.07) - bank) * 0.08;
      if (!reduced) camera.rotateZ(bank);
      if (nar) camera.setViewOffset(W, Hh, 0, Hh * c.offN, W, Hh); else camera.setViewOffset(W, Hh, W * c.off, 0, W, Hh);
      camera.updateProjectionMatrix();

      let s = 0; for (let i = 0; i < pc.length; i++) if (p >= pc[i] - 0.5 * (pc[i] - (pc[i - 1] || 0))) s = i;
      onStep(s, clamp01(p / (pc[pc.length - 1] || 1)));
    }
    let bank = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function dust(dt) {
      if (reduced) return;
      for (let i = 0; i < PN; i++) { let y = pa[i * 3 + 1] + pv[i] * dt * 0.00035; if (y > 8.7) y = -0.3; pa[i * 3 + 1] = y; pa[i * 3] += Math.sin((y + i) * 0.7) * dt * 0.00004; }
      posAttr.needsUpdate = true;
    }

    let visible = true, last = performance.now();
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(stage);
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min(64, now - last); last = now;
      prog += (target - prog) * (reduced ? 1 : Math.min(1, dt * 0.008));
      if (Math.abs(target - prog) < 1e-4) prog = target;
      dust(dt);
      update(prog, reduced ? 0 : now);
      renderer.render(scene, camera);
    }
    addEventListener('scroll', readScroll, { passive: true });
    addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(sticky);
    resize();
    update(0, 0);
    renderer.render(scene, camera);
    await tick();
    progress(1);
    requestAnimationFrame(frame);
    return { remeasure: resize };
  }
})();
