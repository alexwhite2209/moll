/* Молл Строй — фон из частиц (порт Particles с reactbits.dev на чистый WebGL, без React и ogl).
   Шейдеры оставлены как в оригинале; матрицы камеры считаем сами.
   Использование:  Particles.mount(el, { particleCount: 200, particleColors: ['#e7c188'] }); */
window.Particles = (function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VERT = `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }`;

  const FRAG = `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));

    if (uAlphaParticles < 0.5) {
      if (d > 0.5) discard;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }`;

  const hexToRgb = hex => {
    let h = String(hex).replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  /* --- немного матриц: перспектива, сдвиг камеры, поворот системы частиц --- */
  function perspective(fovDeg, aspect, near, far) {
    const f = 1 / Math.tan(fovDeg * Math.PI / 360);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }
  function viewAt(z) { // камера смотрит в центр с расстояния z
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -z, 1]);
  }
  function modelMatrix(rx, ry, rz, tx, ty) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Rz * Ry * Rx (по столбцам, как ждёт WebGL)
    return new Float32Array([
      cz * cy, sz * cy, -sy, 0,
      cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx, 0,
      cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx, 0,
      tx, ty, 0, 1
    ]);
  }

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
    return sh;
  }

  function mount(container, opt) {
    if (!container) return null;
    const o = opt || {};
    const count = o.particleCount || 200;
    const spread = o.particleSpread != null ? o.particleSpread : 10;
    const speed = o.speed != null ? o.speed : 0.1;
    const hover = !!o.moveParticlesOnHover;
    const hoverFactor = o.particleHoverFactor != null ? o.particleHoverFactor : 1;
    const alphaParticles = !!o.alphaParticles;
    const baseSize = o.particleBaseSize != null ? o.particleBaseSize : 100;
    const sizeRandomness = o.sizeRandomness != null ? o.sizeRandomness : 1;
    const camZ = o.cameraDistance != null ? o.cameraDistance : 20;
    const noRot = !!o.disableRotation;
    const dpr = Math.min(o.pixelRatio || devicePixelRatio || 1, 2);
    const palette = (o.particleColors && o.particleColors.length ? o.particleColors : ['#ffffff']).map(hexToRgb);

    const canvas = document.createElement('canvas');
    canvas.className = 'particles-canvas';
    const gl = canvas.getContext('webgl', { alpha: true, depth: false, antialias: true, premultipliedAlpha: false })
      || canvas.getContext('experimental-webgl', { alpha: true, depth: false });
    if (!gl) return null;
    container.appendChild(canvas);

    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    } catch (e) {
      canvas.remove();
      return null;
    }
    gl.useProgram(prog);

    // точки: позиция в шаре, случайные числа для колыхания, цвет из палитры
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x, y, z, len;
      do {
        x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      positions[i * 3] = x * r; positions[i * 3 + 1] = y * r; positions[i * 3 + 2] = z * r;
      randoms[i * 4] = Math.random(); randoms[i * 4 + 1] = Math.random();
      randoms[i * 4 + 2] = Math.random(); randoms[i * 4 + 3] = Math.random();
      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col[0]; colors[i * 3 + 1] = col[1]; colors[i * 3 + 2] = col[2];
    }

    const buf = (data, size, name) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    buf(positions, 3, 'position');
    buf(randoms, 4, 'random');
    buf(colors, 3, 'color');

    const U = n => gl.getUniformLocation(prog, n);
    const uTime = U('uTime'), uSpread = U('uSpread'), uBaseSize = U('uBaseSize');
    const uSizeRnd = U('uSizeRandomness'), uAlpha = U('uAlphaParticles');
    const uModel = U('modelMatrix'), uView = U('viewMatrix'), uProj = U('projectionMatrix');

    gl.uniform1f(uSpread, spread);
    gl.uniform1f(uBaseSize, baseSize * dpr);
    gl.uniform1f(uSizeRnd, sizeRandomness);
    gl.uniform1f(uAlpha, alphaParticles ? 1 : 0);
    gl.uniformMatrix4fv(uView, false, viewAt(camZ));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    let w = 0, h = 0;
    function resize() {
      const cw = container.clientWidth || innerWidth, ch = container.clientHeight || innerHeight;
      if (cw === w && ch === h) return;
      w = cw; h = ch;
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniformMatrix4fv(uProj, false, perspective(15, cw / Math.max(1, ch), 0.1, 100));
    }
    addEventListener('resize', resize, { passive: true });
    resize();

    const mouse = { x: 0, y: 0 };
    if (hover) container.addEventListener('mousemove', e => {
      const r = container.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    }, { passive: true });

    let raf = 0, last = performance.now(), elapsed = 0, rz = 0, live = true;
    function draw() {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, elapsed * 0.001);
      const rx = noRot ? 0 : Math.sin(elapsed * 0.0002) * 0.1;
      const ry = noRot ? 0 : Math.cos(elapsed * 0.0005) * 0.15;
      gl.uniformMatrix4fv(uModel, false, modelMatrix(rx, ry, rz,
        hover ? -mouse.x * hoverFactor : 0, hover ? -mouse.y * hoverFactor : 0));
      gl.drawArrays(gl.POINTS, 0, count);
    }
    function frame(t) {
      raf = live ? requestAnimationFrame(frame) : 0;
      const dt = Math.min(60, t - last); last = t;
      elapsed += dt * speed;
      if (!noRot) rz += 0.01 * speed;
      draw();
    }
    function start() { if (!raf && live && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    if (reduced) { draw(); }
    else {
      // крутим только когда фон на экране и вкладка активна
      const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()), { rootMargin: '10%' });
      io.observe(container);
      document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
      start();
    }

    return {
      destroy() { live = false; stop(); removeEventListener('resize', resize); canvas.remove(); }
    };
  }

  return { mount };
})();
