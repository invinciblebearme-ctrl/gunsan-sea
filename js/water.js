// water.js — 색을 품은 물 덩어리 + 높이장 파동 시뮬 + 물보라
import * as THREE from 'three';
import { HX, HZ, W, D, heightAt, CAUSTIC_GLSL, mix } from './terrain.js';

export const NX = 131, NZ = 91, CELL = 0.2;
const N = NX * NZ;

const FRAG_DECL = /* glsl */`
uniform float uTime, uSea, uRipple, uCaus; uniform sampler2D uTerrH; uniform mat3 normalMatrix;
varying vec3 vLP; varying vec3 vON; varying float vFoam;
${CAUSTIC_GLSL}
vec2 ripG(vec2 p, float t){ vec2 g = vec2(0.0);
  #define RL(dx,dy,f,s,a) { vec2 d = vec2(dx,dy); float ph = dot(d,p)*f + t*s + 1.7*sin(dot(vec2(-dy,dx),p)*f*0.37 + t*0.31); g += d*(f*a)*cos(ph); }
  RL(0.8,0.6,2.1,1.1,0.050) RL(-0.5,0.86,3.7,1.6,0.030) RL(0.96,-0.28,6.3,2.3,0.017) RL(-0.7,-0.7,10.5,3.1,0.010) RL(0.2,0.98,17.0,4.2,0.006)
  return g; }
`;

export class Water {
  constructor(heightTex, uniforms) {
    this.sea = 0; this.calm = 0.45; this.wind = 0.4; this.t = 0;
    this.h = new Float32Array(N); this.v = new Float32Array(N); this.ys = new Float32Array(N);
    this.land = new Uint8Array(N); this.shore = new Float32Array(N); this.terr = new Float32Array(N);
    this.slosh = { x: 0, z: 0 };
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) this.terr[j * NX + i] = heightAt(-HX + i * CELL, -HZ + j * CELL);
    this.uniforms = Object.assign(uniforms, {
      uTerrH: { value: heightTex }, uRipple: { value: 0.8 }, uCaus: { value: 0.55 }, uTint: { value: new THREE.Color() },
    });
    this.group = new THREE.Group();
    this._buildTop(); this._buildSides();
    this.setSea(0);
  }

  _buildTop() {
    const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), foam = new Float32Array(N);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i; pos[k * 3] = -HX + i * CELL; pos[k * 3 + 2] = -HZ + j * CELL; nor[k * 3 + 1] = 1;
    }
    const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6); let q = 0;
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aFoam', new THREE.BufferAttribute(foam, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 17);
    const m = this.topMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transmission: 1, thickness: 1.7, roughness: 0.07, ior: 1.33, metalness: 0,
      attenuationColor: new THREE.Color(0x1090ff), attenuationDistance: 2.3, envMapIntensity: 1.1,
      specularIntensity: 1, clearcoat: 0,
    });
    const U = this.uniforms;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aFoam; varying float vFoam; varying vec3 vLP; varying vec3 vON;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position; vON = normal; vFoam = aFoam;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FRAG_DECL)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec2 tuv = vec2((vLP.x + ${HX.toFixed(1)}) / ${W.toFixed(1)}, (vLP.z + ${HZ.toFixed(1)}) / ${D.toFixed(1)});
          float wDepth = max(0.0, uSea - texture2D(uTerrH, tuv).r);
          vec2 rg = ripG(vLP.xz, uTime) * uRipple * smoothstep(0.0, 0.35, wDepth);
          normal = normalize(normalMatrix * normalize(vON + vec3(-rg.x, 0.0, -rg.y)));`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { float cz = caus(vLP.xz * 0.17 + rg * 0.25, uTime * 0.5);
            totalEmissiveRadiance += vec3(cz) * uCaus * smoothstep(0.05, 0.6, wDepth);
            float fz = caus(vLP.xz * 0.43 + 3.7, uTime * 0.8 + 5.0);
            float lap = wDepth + 0.05 * sin(uTime * 1.6 + vLP.x * 3.0 + vLP.z * 2.3);
            float edge = (1.0 - smoothstep(0.02, 0.15, lap)) * step(0.001, wDepth);
            float foam = smoothstep(0.5, 1.0, vFoam * (0.62 + 1.6 * fz)) * 0.85 + edge * 0.85;
            totalEmissiveRadiance += vec3(min(foam, 1.0)) * 0.9; }`)
        .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment
          .replace('material.thickness = thickness;', 'material.thickness = thickness * (0.12 + wDepth);'));
    };
    this.top = new THREE.Mesh(g, m); this.top.receiveShadow = false;
    this.group.add(this.top);
  }

  _buildSides() {
    // 둘레: 앞 → 오른쪽 → 뒤 → 왼쪽
    const P = []; const push = (i, j, nx, nz) => P.push({ k: j * NX + i, x: -HX + i * CELL, z: -HZ + j * CELL, nx, nz });
    const segs = [];
    let s = P.length; for (let i = 0; i < NX; i++) push(i, NZ - 1, 0, 1); segs.push([s, P.length]);
    s = P.length; for (let j = NZ - 1; j >= 0; j--) push(NX - 1, j, 1, 0); segs.push([s, P.length]);
    s = P.length; for (let i = NX - 1; i >= 0; i--) push(i, 0, 0, -1); segs.push([s, P.length]);
    s = P.length; for (let j = 0; j < NZ; j++) push(0, j, -1, 0); segs.push([s, P.length]);
    this.peri = P;
    const n = P.length, pos = new Float32Array(n * 6), nor = new Float32Array(n * 6), aT = new Float32Array(n * 2), idx = [];
    const rpos = new Float32Array(n * 6);
    P.forEach((p, i) => {
      pos[i * 6] = pos[i * 6 + 3] = p.x; pos[i * 6 + 2] = pos[i * 6 + 5] = p.z;
      rpos[i * 6] = rpos[i * 6 + 3] = p.x + p.nx * 0.008; rpos[i * 6 + 2] = rpos[i * 6 + 5] = p.z + p.nz * 0.008;
      nor[i * 6] = nor[i * 6 + 3] = p.nx; nor[i * 6 + 2] = nor[i * 6 + 5] = p.nz; aT[i * 2] = 1; aT[i * 2 + 1] = 0;
    });
    for (const [a, b] of segs) for (let i = a; i < b - 1; i++) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 2, v + 1, v + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 17);
    const m = this.sideMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transmission: 1, thickness: 3.2, roughness: 0.16, ior: 1.2,
      attenuationColor: new THREE.Color(0x1090ff), attenuationDistance: 2.3, envMapIntensity: 0.6,
    });
    const U = this.uniforms;
    m.onBeforeCompile = sh => {
      sh.uniforms.uTint = U.uTint; sh.uniforms.uSea = U.uSea;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aT; varying float vT; varying float vY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvT = aT; vY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTint; uniform float uSea; varying float vT; varying float vY;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { float up = smoothstep(-1.9, 0.0, vY - uSea); totalEmissiveRadiance += uTint * (0.015 + 0.2 * up * up * up); }`);
    };
    this.sides = new THREE.Mesh(g, m); this.group.add(this.sides);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rpos, 3).setUsage(THREE.DynamicDrawUsage));
    rg.setIndex(idx); rg.boundingSphere = g.boundingSphere;
    this.rim = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.92 }));
    this.group.add(this.rim);
  }

  setColor(att, tint) {
    this.topMat.attenuationColor.set(att); this.sideMat.attenuationColor.set(att); this.uniforms.uTint.value.set(tint);
  }

  setSea(sea) {
    this.sea = sea; this.uniforms.uSea.value = sea;
    const { land, terr, shore, h, v } = this;
    for (let k = 0; k < N; k++) { land[k] = terr[k] > sea - 0.04 ? 1 : 0; if (land[k]) { h[k] = 0; v[k] = 0; } }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i; if (land[k]) { shore[k] = 0; continue; }
      let best = 9;
      for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) {
        const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
        if (land[jj * NX + ii]) { const d = Math.hypot(a, b); if (d < best) best = d; }
      }
      shore[k] = best > 3.2 ? 0 : 1 - (best - 1) / 2.4;
    }
  }

  // 지형이 바뀐 뒤(시대 전환) 땅·바다 구분 다시 계산
  refreshTerrain() {
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) this.terr[j * NX + i] = heightAt(-HX + i * CELL, -HZ + j * CELL);
    this.setSea(this.sea);
  }
  reset() { this.h.fill(0); this.v.fill(0); this.slosh.x = this.slosh.z = 0; }
  inside(x, z) { return Math.abs(x) < HX && Math.abs(z) < HZ; }
  cell(x, z) {
    const i = Math.round((x + HX) / CELL), j = Math.round((z + HZ) / CELL);
    return (i < 0 || j < 0 || i >= NX || j >= NZ) ? -1 : j * NX + i;
  }
  isWater(x, z) { const k = this.cell(x, z); return k >= 0 && !this.land[k]; }
  depthAt(x, z) { return this.sea - heightAt(x, z); }
  surfY(x, z) {
    const fx = (x + HX) / CELL, fz = (z + HZ) / CELL;
    const i = Math.max(0, Math.min(NX - 2, Math.floor(fx))), j = Math.max(0, Math.min(NZ - 2, Math.floor(fz)));
    const a = Math.max(0, Math.min(1, fx - i)), b = Math.max(0, Math.min(1, fz - j)), k = j * NX + i, y = this.ys;
    return (y[k] * (1 - a) + y[k + 1] * a) * (1 - b) + (y[k + NX] * (1 - a) + y[k + NX + 1] * a) * b;
  }
  grad(x, z, out) {
    const e = CELL; out.x = (this.surfY(x + e, z) - this.surfY(x - e, z)) / (2 * e); out.z = (this.surfY(x, z + e) - this.surfY(x, z - e)) / (2 * e); return out;
  }
  splash(x, z, r, amt) {
    const ci = Math.round((x + HX) / CELL), cj = Math.round((z + HZ) / CELL), rc = Math.ceil(r / CELL);
    for (let b = -rc; b <= rc; b++) for (let a = -rc; a <= rc; a++) {
      const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
      const k = j * NX + i; if (this.land[k]) continue;
      const d = Math.hypot(a, b) * CELL / r; if (d < 1) this.v[k] += amt * (1 - d * d);
    }
  }

  step(dt, t, shearAcc) {
    this.t = t;
    const { h, v, land } = this, K = 0.14, damp = mix(0.9975, 0.972, this.calm), rough = 1 - this.calm;
    // 잔잔한 너울(바람 방향) + 랜덤 잔물결
    const A = rough * (0.25 + this.wind) * 0.0032;
    for (let j = 0; j < NZ; j++) { const k = j * NX; if (!land[k]) v[k] += A * Math.sin(t * 1.9 + j * 0.13); }
    if (Math.random() < rough * 0.6) {
      const k = (Math.random() * N) | 0;
      if (!land[k]) this.splash(-HX + (k % NX) * CELL, -HZ + ((k / NX) | 0) * CELL, 0.5, (Math.random() - 0.5) * (0.012 + this.wind * 0.02));
    }
    const ax = shearAcc ? shearAcc.x * 0.00035 : 0, az = shearAcc ? shearAcc.z * 0.00035 : 0;
    for (let j = 0; j < NZ; j++) {
      const z = -HZ + j * CELL;
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i; if (land[k]) continue;
        const c = h[k];
        const l = i > 0 && !land[k - 1] ? h[k - 1] : c, r = i < NX - 1 && !land[k + 1] ? h[k + 1] : c;
        const u = j > 0 && !land[k - NX] ? h[k - NX] : c, d = j < NZ - 1 && !land[k + NX] ? h[k + NX] : c;
        v[k] = (v[k] + (l + r + u + d - 4 * c) * K - (ax * (-HX + i * CELL) + az * z)) * damp;
      }
    }
    for (let k = 0; k < N; k++) { if (land[k]) continue; let x = (h[k] + v[k]) * 0.9996; h[k] = x > 0.55 ? 0.55 : x < -0.55 ? -0.55 : x; }
  }

  updateMesh() {
    const { h, v, land, ys, shore, sea } = this, sx = this.slosh.x, sz = this.slosh.z;
    const pos = this.top.geometry.attributes.position, nor = this.top.geometry.attributes.normal, foam = this.top.geometry.attributes.aFoam;
    const P = pos.array, Nn = nor.array, F = foam.array;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i, y = sea + (land[k] ? 0 : h[k]) + sx * (-HX + i * CELL) + sz * (-HZ + j * CELL);
      ys[k] = y; P[k * 3 + 1] = y;
      const av = v[k] < 0 ? -v[k] : v[k], ah = h[k] < 0 ? -h[k] : h[k];
      F[k] = land[k] ? 0 : shore[k] * (0.4 + 4.0 * ah) + Math.min(1, av * 9);
    }
    const inv = 1 / (2 * CELL);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const gx = (ys[i < NX - 1 ? k + 1 : k] - ys[i > 0 ? k - 1 : k]) * inv, gz = (ys[j < NZ - 1 ? k + NX : k] - ys[j > 0 ? k - NX : k]) * inv;
      const l = 1 / Math.sqrt(gx * gx + 1 + gz * gz); Nn[k * 3] = -gx * l; Nn[k * 3 + 1] = l; Nn[k * 3 + 2] = -gz * l;
    }
    pos.needsUpdate = nor.needsUpdate = foam.needsUpdate = true;
    const sp = this.sides.geometry.attributes.position, S = sp.array, rp = this.rim.geometry.attributes.position, R = rp.array, terr = this.terr;
    this.peri.forEach((p, i) => {
      const top = ys[p.k], wet = !land[p.k], bot = wet ? Math.min(terr[p.k], top) : top;
      S[i * 6 + 1] = top; S[i * 6 + 4] = bot;
      R[i * 6 + 1] = top + 0.012; R[i * 6 + 4] = wet ? Math.max(top - 0.055, bot) : top + 0.012;
    });
    sp.needsUpdate = rp.needsUpdate = true;
  }
}

// 물보라 입자
export class Spray {
  constructor(n = 700) {
    this.n = n; this.p = new Float32Array(n * 3).fill(-99); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.i = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false, sizeAttenuation: true }));
    this.points.frustumCulled = false;
  }
  emit(x, y, z, count, spread = 0.5, up = 2.2, dirx = 0, dirz = 0) {
    for (let c = 0; c < count; c++) {
      const i = this.i = (this.i + 1) % this.n, a = Math.random() * 6.283, s = Math.random() * spread;
      this.p[i * 3] = x + (Math.random() - 0.5) * 0.15; this.p[i * 3 + 1] = y + 0.03; this.p[i * 3 + 2] = z + (Math.random() - 0.5) * 0.15;
      this.vel[i * 3] = Math.cos(a) * s + dirx; this.vel[i * 3 + 1] = up * (0.45 + Math.random() * 0.6); this.vel[i * 3 + 2] = Math.sin(a) * s + dirz;
      this.life[i] = 0.5 + Math.random() * 0.5;
    }
  }
  update(dt) {
    const { p, vel, life } = this;
    for (let i = 0; i < this.n; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt; vel[i * 3 + 1] -= 6.5 * dt;
      p[i * 3] += vel[i * 3] * dt; p[i * 3 + 1] += vel[i * 3 + 1] * dt; p[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (life[i] <= 0) p[i * 3 + 1] = -99;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
