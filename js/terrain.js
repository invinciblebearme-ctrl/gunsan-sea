// terrain.js — SDF 높이 함수로 만든 군산 블록 지형 + 잘린 단면(지층)
import * as THREE from 'three';

export const W = 26, D = 18, HX = 13, HZ = 9, BOTTOM = -3.4, SEABED = -1.7, VTOP = 2.8;

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
// s: 해안선에서 안쪽(+)/바깥(-) 거리. wu: 물속 경사 폭, wo: 물 위 경사 폭(작으면 절벽, 크면 완만한 해변)
const prof = (s, wu, wo, top) => (s < 0 ? SEABED * sm(0, wu, -s) : top * sm(0, wo, s));
const hill = (x, z, cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const ell = (x, z, cx, cz, rx, rz, wob = 0) => {
  const ex = (x - cx) / rx, ez = (z - cz) / rz;
  let e = Math.hypot(ex, ez);
  if (wob) e *= 1 + wob * Math.sin(Math.atan2(ez, ex) * 3 + cx);
  return (1 - e) * Math.min(rx, rz);
};

// 본 육지 해안선 (뒤쪽). x>4 는 조선소 매립지라 곧게.
export function coastZ(x) {
  const c = -3.3 + 0.55 * Math.sin(x * 0.33 + 0.8) + 0.3 * Math.sin(x * 0.85 + 2.0) - 0.9 * Math.exp(-((x + 3.2) ** 2) / 3.0);
  return mix(c, -3.0, sm(3.5, 5.5, x));
}

export const SEAWALL = { ax: 10.7, az: -3.6, bx: 9.7, bz: 4.4 };
export const SPIT = { ax: -2.6, az: 4.9, bx: -4.7, bz: 3.6 };
export const BREAK = { ax: -2.3, az: 6.5, bx: -3.5, bz: 7.5 };
const ROCKS = [[-11.3, 5.4, 0.5, 0.85], [-10.5, 6.4, 0.42, 0.65], [-11.6, 7.2, 0.38, 0.55]];

let _id = 0, _s = 0;
// id: 0 육지, 1 방조제, 2 신시도, 3 선유도, 4 명사십리, 5 방파제, 6 장자도, 7 바위섬
export function sample(x, z) {
  let H, id = 0, h, s;
  // 0. 본 육지 — 왼쪽 끝은 갯벌(완만), 나머지는 안벽(급경사)
  s = coastZ(x) - z; _s = s;
  const wu = mix(0.8, 3.2, sm(-8.0, -11.5, x));
  h = mix(SEABED, 0.42, sm(-wu, 0.1, s));
  const inl = sm(0.5, 2.2, s);
  h += inl * (hill(x, z, -9.8, -7.2, 2.3, 2.3) + hill(x, z, -6.5, -8.7, 1.8, 1.2) + hill(x, z, -1.5, -8.5, 2.4, 1.5)
    + hill(x, z, 3, -8.9, 2, 0.9) + hill(x, z, 10.6, -8.4, 1.8, 0.9) + 0.05 * Math.sin(x * 2.1) * Math.sin(z * 1.7));
  H = h;
  // 1. 새만금방조제
  s = 0.34 - segDist(x, z, SEAWALL.ax, SEAWALL.az, SEAWALL.bx, SEAWALL.bz);
  h = prof(s, 0.7, 0.14, 0.42); if (h > H) { H = h; id = 1; }
  // 2. 신시도
  s = ell(x, z, 9.9, 5.9, 2.2, 1.7, 0.07);
  h = prof(s, 0.9, 0.5, 0.34) + sm(0, 0.5, s) * hill(x, z, 10.4, 6.4, 1.1, 1.35); if (h > H) { H = h; id = 2; }
  // 3. 선유도 (+망주봉 쌍봉)
  s = ell(x, z, -0.3, 5.4, 2.9, 1.35, 0.05);
  h = prof(s, 0.9, 0.6, 0.32) + sm(0, 0.3, s) * (hill(x, z, -0.25, 4.8, 0.52, 2.0) + hill(x, z, 0.72, 4.68, 0.46, 1.65)
    + hill(x, z, 1.7, 5.9, 0.8, 0.7) + hill(x, z, -1.8, 5.9, 0.7, 0.45));
  if (h > H) { H = h; id = 3; }
  // 4. 명사십리 모래톱 (완만한 해변) + 끝의 솔섬
  s = 0.3 - segDist(x, z, SPIT.ax, SPIT.az, SPIT.bx, SPIT.bz);
  h = prof(s, 1.2, 0.3, 0.17) + hill(x, z, -4.85, 3.5, 0.33, 0.55) * sm(-0.1, 0.2, s); if (h > H) { H = h; id = 4; }
  // 5. 기도등대 방파제
  s = 0.14 - segDist(x, z, BREAK.ax, BREAK.az, BREAK.bx, BREAK.bz);
  h = prof(s, 0.4, 0.08, 0.3); if (h > H) { H = h; id = 5; }
  // 6. 장자도·대장봉 (절벽)
  s = ell(x, z, -6.4, 6.7, 1.3, 1.0, 0.08);
  h = prof(s, 0.6, 0.25, 0.3) + sm(0, 0.3, s) * hill(x, z, -6.5, 6.6, 0.6, 1.5); if (h > H) { H = h; id = 6; }
  // 7. 삼도귀범 바위섬
  for (const r of ROCKS) {
    s = r[2] - Math.hypot(x - r[0], z - r[1]);
    h = prof(s, 0.5, 0.12, r[3] * 0.55) + r[3] * 0.45 * sm(0, r[2], s); if (h > H) { H = h; id = 7; }
  }
  if (H < -0.4) H += (0.12 * Math.sin(x * 0.8 + z * 0.5) + 0.08 * Math.sin(x * 1.7 - z * 1.3)) * sm(-0.4, -1.4, H);
  _id = id;
  return H;
}
export const heightAt = sample;
export const lastId = () => _id;
export const lastInland = () => _s;

// 물/바닥 셰이더가 같이 쓰는 빛줄기 그물(caustic)
export const CAUSTIC_GLSL = /* glsl */`
float caus(vec2 uv, float t){
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0; vec2 i = p; float c = 1.0; const float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}`;

function colorAt(x, z, h, slope, id, inland, out) {
  const n = 0.5 + 0.5 * Math.sin(x * 3.1 + z * 1.3) * Math.sin(z * 2.7 - x * 0.7);
  let r, g, b;
  const set = (R, G, B) => { r = R; g = G; b = B; };
  const mud = id === 0 && x < -7.2;
  if (h < -0.05) {
    const t = sm(-0.05, -1.5, h);
    set(mix(0.95, 0.70, t), mix(0.89, 0.80, t), mix(0.72, 0.74, t));
    if (mud) { const m = 1 - sm(-0.9, -1.6, h); r = mix(r, 0.6, m); g = mix(g, 0.55, m); b = mix(b, 0.47, m); }
  } else if (id === 0) {
    if (mud && h < 0.36) set(0.63, 0.57, 0.48);
    else if (inland < 1.5 && h < 0.62) { if (x > 4.2) set(0.74, 0.75, 0.74); else set(0.83, 0.8, 0.74); }
    else grass();
  } else if (id === 1) set(0.66, 0.65, 0.62);
  else if (id === 4) { if (h > 0.3) grass(); else set(0.97, 0.91, 0.74); }
  else if (id === 5) set(0.82, 0.81, 0.78);
  else if (id === 7) set(mix(0.72, 0.62, n), mix(0.66, 0.58, n), mix(0.56, 0.5, n));
  else if (h < 0.2) set(0.95, 0.89, 0.72);
  else grass();
  function grass() {
    set(mix(0.58, 0.40, n), mix(0.77, 0.63, n), mix(0.42, 0.36, n));
    const rock = sm(0.9, 1.6, slope) * (id === 0 ? 0.6 : 1);
    const bare = (id === 3 && h > 0.75 && z < 5.25) ? sm(0.75, 1.2, h) : 0;
    const k = Math.max(rock, bare);
    r = mix(r, mix(0.80, 0.70, n), k); g = mix(g, mix(0.72, 0.64, n), k); b = mix(b, mix(0.60, 0.55, n), k);
  }
  out[0] = r; out[1] = g; out[2] = b;
}

function strataTexture() {
  const cw = 1024, ch = 512, c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  const py = y => ch * (1 - (y - BOTTOM) / (VTOP - BOTTOM));
  const wav = (x, k, ph, a) => a * Math.sin((x / cw) * Math.PI * 2 * k + ph);
  g.fillStyle = '#573828'; g.fillRect(0, 0, cw, ch);
  const band = (yf, col) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 0);
    for (let x = 0; x <= cw; x += 4) g.lineTo(x, py(yf(x)));
    g.lineTo(cw, 0); g.closePath(); g.fill();
  };
  const y1 = x => -2.75 + wav(x, 2, 0, 0.11) + wav(x, 5, 1, 0.04);
  const y2 = x => -2.2 + wav(x, 3, 1.3, 0.09) + wav(x, 7, 0.4, 0.03);
  const y3 = x => -1.93 + wav(x, 2, 2.2, 0.06) + wav(x, 6, 2, 0.025);
  band(y1, '#87583a'); band(y2, '#b98558'); band(y3, '#e4c68f');
  band(x => 0.25 + wav(x, 3, 0.5, 0.05), '#dcbd8c');
  band(x => 1.1 + wav(x, 4, 1.5, 0.07), '#d2ae80');
  // 흰 모래 줄
  const line = (yf, wpx, col) => {
    g.strokeStyle = col; g.lineWidth = wpx; g.beginPath();
    for (let x = 0; x <= cw; x += 4) { const Y = py(yf(x)); x ? g.lineTo(x, Y) : g.moveTo(x, Y); }
    g.stroke();
  };
  line(x => y3(x) + 0.02, 7, '#fff7e4');
  line(x => y2(x) + 0.03, 3, 'rgba(255,240,210,.55)');
  line(x => y1(x) + 0.02, 3, 'rgba(60,35,22,.5)');
  line(x => -1.2 + wav(x, 4, 0.7, 0.05), 2, 'rgba(255,250,235,.6)');
  line(x => -0.55 + wav(x, 3, 2.7, 0.06), 2, 'rgba(190,150,100,.5)');
  // 자갈 점
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * cw, y = rnd() * ch, r = 0.6 + rnd() * 1.8;
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(40,22,12,.16)';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function buildTerrain(uniforms) {
  const step = 0.1, nx = Math.round(W / step) + 1, nz = Math.round(D / step) + 1;
  const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3);
  const hdata = new Uint16Array(nx * nz), c3 = [0, 0, 0], e = 0.05;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = -HX + i * step, z = -HZ + j * step, k = j * nx + i;
    const gx = (sample(x + e, z) - sample(x - e, z)) / (2 * e), gz = (sample(x, z + e) - sample(x, z - e)) / (2 * e);
    const h = sample(x, z), id = _id, inl = _s;
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const l = Math.hypot(gx, 1, gz); nor[k * 3] = -gx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = -gz / l;
    colorAt(x, z, h, Math.hypot(gx, gz), id, inl, c3); col.set(c3, k * 3);
    hdata[k] = THREE.DataUtils.toHalfFloat(h);
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uSea = uniforms.uSea;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uSea; varying vec3 vLP;\n' + CAUSTIC_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float under = smoothstep(uSea, uSea - 0.12, vLP.y);
          diffuseColor.rgb += vec3(caus(vLP.xz * 0.21, uTime * 0.55)) * 0.3 * under;
          float wet = smoothstep(uSea + 0.07, uSea, vLP.y) * (1.0 - under);
          diffuseColor.rgb *= 1.0 - 0.18 * wet; }`);
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.castShadow = true;

  const heightTex = new THREE.DataTexture(hdata, nx, nz, THREE.RedFormat, THREE.HalfFloatType);
  heightTex.minFilter = heightTex.magFilter = THREE.LinearFilter; heightTex.needsUpdate = true;

  // 단면 벽
  const wp = [], wn = [], wuv = [], wi = []; let peri = 0;
  const edge = (x0, z0, x1, z1, nxn, nzn) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / step), base = wp.length / 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = mix(x0, x1, t), z = mix(z0, z1, t), h = sample(x, z), u = (peri + len * t) / 11;
      wp.push(x, BOTTOM, z, x, h, z); wn.push(nxn, 0, nzn, nxn, 0, nzn);
      wuv.push(u, 0, u, (h - BOTTOM) / (VTOP - BOTTOM));
      if (i < n) { const a = base + i * 2; wi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    peri += len;
  };
  edge(-HX, HZ, HX, HZ, 0, 1); edge(HX, HZ, HX, -HZ, 1, 0); edge(HX, -HZ, -HX, -HZ, 0, -1); edge(-HX, -HZ, -HX, HZ, -1, 0);
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  wg.setAttribute('normal', new THREE.Float32BufferAttribute(wn, 3));
  wg.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2));
  wg.setIndex(wi);
  const walls = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ map: strataTexture(), roughness: 0.85 }));
  walls.castShadow = true; walls.receiveShadow = true;
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x573828 }));
  cap.rotation.x = Math.PI / 2; cap.position.y = BOTTOM;
  return { mesh, walls, cap, heightTex };
}
