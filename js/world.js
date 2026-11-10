// world.js — 군산 명소: 내항 뜬다리부두, 조선소 골리앗 크레인, 새만금방조제, 고군산대교, 선유도, 청자 난파선
import * as THREE from 'three';
import { heightAt, lastId, lastInland, coastZ, SEAWALL, BREAK, SPIT, mix } from './terrain.js';

const mats = new Map();
export const M = (color, o = {}) => {
  const key = color + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
  return mats.get(key);
};
export const box = (w, h, d, color, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, o)); m.castShadow = true; return m; };
const cyl = (r1, r2, h, color, seg = 12, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), M(color, o)); m.castShadow = true; return m; };
const X = new THREE.Vector3(1, 0, 0);
export function beam(a, b, w, t, color, o) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), m = box(len, t, w, color, o);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(X, d.normalize()); return m;
}
export class Poly {
  constructor(pts) { this.pts = pts; this.len = [0]; for (let i = 1; i < pts.length; i++) this.len.push(this.len[i - 1] + pts[i].distanceTo(pts[i - 1])); this.total = this.len[pts.length - 1]; }
  at(d, out, dir) {
    d = Math.max(0, Math.min(this.total, d)); let i = 1; while (i < this.pts.length - 1 && this.len[i] < d) i++;
    const a = this.pts[i - 1], b = this.pts[i], t = (d - this.len[i - 1]) / (this.len[i] - this.len[i - 1]);
    out.lerpVectors(a, b, t); if (dir) dir.subVectors(b, a).normalize(); return out;
  }
}
let seed = 20261110; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildWorld(root, water) {
  const g = new THREE.Group(); root.add(g);
  const updaters = [], labels = [];
  const add = (o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };
  // 시대별로 켜고 끄는 물체 묶음 (그때와 지금)
  const eras = { shipyard: [], seawall: [], bridge: [], rice: [] };
  let mk = 0; const begin = () => { mk = g.children.length; }, end = key => { eras[key].push(...g.children.slice(mk)); };

  // ── 1. 내항 뜬다리부두 (부잔교): 밀물·썰물에 맞춰 오르내리는 부교 + 경사 다리
  const pontoons = [];
  for (const px of [-7.7, -6.5, -5.3]) {
    const cz = coastZ(px), pon = new THREE.Group();
    const deck = box(0.95, 0.16, 0.42, 0xb9b4a8); pon.add(deck);
    const trim = box(0.99, 0.05, 0.46, 0x5d6672); trim.position.y = -0.07; pon.add(trim);
    for (const bx of [-0.36, 0.36]) { const b = cyl(0.035, 0.035, 0.12, 0xf2c230, 8); b.position.set(bx, 0.14, 0.14); pon.add(b); }
    add(pon, px, 0.1, cz + 0.98);
    const ramp = new THREE.Group(), L = 0.86;
    const rb = box(0.2, 0.035, L, 0x7c8792); rb.position.z = L / 2; ramp.add(rb);
    for (const sx of [-0.1, 0.1]) { const rail = box(0.02, 0.09, L, 0xe8e2d4); rail.position.set(sx, 0.06, L / 2); ramp.add(rail); }
    const qy = heightAt(px, cz - 0.12) + 0.02; add(ramp, px, qy, cz - 0.02);
    pontoons.push({ pon, ramp, x: px, z: cz + 0.98, qy, L });
  }
  updaters.push((dt, t) => {
    for (const p of pontoons) {
      const y = water.surfY(p.x, p.z) + 0.03; p.pon.position.y = y;
      p.pon.rotation.z = Math.sin(t * 1.3 + p.x) * 0.02;
      p.ramp.rotation.x = Math.asin(Math.max(-0.9, Math.min(0.9, (p.qy - (y + 0.08)) / p.L)));
    }
  });
  labels.push({ name: '내항 뜬다리부두', pos: V(-6.5, 1.15, coastZ(-6.5) + 0.5) });
  // 구 군산세관 (붉은 벽돌 + 뾰족 지붕) 과 부두 창고
  {
    const cx = -4.4, cz = coastZ(cx) - 0.95, y = heightAt(cx, cz), c = new THREE.Group();
    const body = box(1.0, 0.42, 0.55, 0xb5533c); body.position.y = 0.21; c.add(body);
    const roof = box(1.08, 0.1, 0.63, 0x6d7780); roof.position.y = 0.47; c.add(roof);
    for (const tx of [-0.36, 0, 0.36]) {
      const tw = box(0.2, 0.2, 0.2, 0xb5533c); tw.position.set(tx, 0.56, 0.12); c.add(tw);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.17, tx ? 0.24 : 0.36, 4), M(0x55606b)); sp.rotation.y = Math.PI / 4; sp.position.set(tx, tx ? 0.78 : 0.84, 0.12); sp.castShadow = true; c.add(sp);
    }
    const band = box(1.02, 0.05, 0.57, 0xf0e6d2); band.position.y = 0.3; c.add(band);
    add(c, cx, y, cz);
    for (let i = 0; i < 4; i++) {
      const wx = -8.3 + i * 0.95, wz = coastZ(wx) - 0.75, wh = new THREE.Group();
      const b = box(0.7, 0.26, 0.42, i % 2 ? 0xc9694d : 0xd8cdb8); b.position.y = 0.13; wh.add(b);
      const rg = new THREE.CylinderGeometry(0.27, 0.27, 0.74, 3); rg.rotateZ(Math.PI / 2); rg.rotateX(-Math.PI / 2);
      const r = new THREE.Mesh(rg, M(0x4f5c66)); r.scale.set(1, 0.55, 1); r.position.y = 0.33; r.castShadow = true; wh.add(r);
      add(wh, wx, heightAt(wx, wz), wz);
    }
  }

  // ── 2. 군산조선소 골리앗 크레인
  const crane = new THREE.Group(), CR = 0xe9562d;
  begin();
  {
    const span = 2.7, hgt = 2.5;
    for (const sx of [-span / 2, span / 2]) for (const sz of [-0.32, 0.32]) {
      const leg = beam(V(sx, 0, sz), V(sx, hgt, sz * 0.25), 0.11, 0.11, CR); crane.add(leg);
    }
    for (const sx of [-span / 2, span / 2]) { const foot = box(0.2, 0.1, 0.9, 0x3d4650); foot.position.set(sx, 0.05, 0); crane.add(foot); }
    const girder = box(span + 0.7, 0.3, 0.34, CR); girder.position.y = hgt + 0.1; crane.add(girder);
    const stripe = box(span + 0.72, 0.09, 0.35, 0xffffff); stripe.position.y = hgt + 0.1; crane.add(stripe);
    const trolley = new THREE.Group(); const tb = box(0.34, 0.14, 0.42, 0x2d3640); trolley.add(tb);
    const cable = box(0.02, 1, 0.02, 0x2d3640); trolley.add(cable);
    const hook = box(0.5, 0.26, 0.3, 0x3f78c9); trolley.add(hook);
    trolley.position.y = hgt - 0.12; crane.add(trolley);
    const cx = 7.3, cz = -4.5; add(crane, cx, heightAt(cx, cz), cz);
    const st = { boost: 0 };
    updaters.push((dt, t, s) => {
      const sp = s.launching ? 2.2 : 0.5;
      st.boost += dt * sp;
      trolley.position.x = Math.sin(st.boost * 0.6) * 1.0;
      const drop = 0.7 + 0.5 * Math.sin(st.boost * 0.9 + 1);
      cable.scale.y = drop; cable.position.y = -drop / 2; hook.position.y = -drop - 0.12;
    });
    // 공장동·탱크·선박 블록
    const shed = box(2.3, 0.75, 1.3, 0x7f9bb5); add(shed, 10.2, heightAt(10.2, -5.6) + 0.37, -5.6);
    const shedR = box(2.4, 0.08, 1.4, 0xe8eef2); add(shedR, 10.2, heightAt(10.2, -5.6) + 0.79, -5.6);
    const shed2 = box(1.5, 0.55, 1.0, 0x9fb3c4); add(shed2, 5.0, heightAt(5, -4.9) + 0.27, -4.9);
    for (let i = 0; i < 3; i++) { const tk = cyl(0.24, 0.24, 0.5, 0xf1f1ec, 14); add(tk, 8.9 + i * 0.6, heightAt(9, -7) + 0.25, -7.1); }
    for (const [bx, bz, c] of [[6.6, -4.6, 0x5a6f8a], [7.9, -4.3, 0x7d8ea3], [7.2, -3.8, 0x51647e]]) { const b = box(0.55, 0.3, 0.45, c); add(b, bx, heightAt(bx, bz) + 0.15, bz); }
    labels.push({ name: '군산조선소 골리앗 크레인', pos: V(cx, 3.35, cz) });
  }
  end('shipyard');

  // ── 3. 새만금방조제 (도로 + 차) 와 풍력발전기
  const A = V(SEAWALL.ax, 0.44, SEAWALL.az - 0.6), B = V(SEAWALL.bx, 0.44, SEAWALL.bz + 0.5);
  begin();
  g.add(beam(A, B, 0.36, 0.03, 0x4a4f57));
  g.add(beam(V(A.x, 0.46, A.z), V(B.x, 0.46, B.z), 0.02, 0.012, 0xf4e9b0));
  const roadPaths = [new Poly([A, B])];
  labels.push({ name: '새만금방조제', pos: V(10.25, 1.0, 0.4) });
  const turbines = [];
  for (const [tx, tz] of [[11.9, -4.3], [12.3, -6.0], [11.7, -7.5]]) {
    const t = new THREE.Group(), tower = cyl(0.035, 0.07, 2.2, 0xf6f6f2, 10); tower.position.y = 1.1; t.add(tower);
    const hub = new THREE.Group(); hub.position.set(0, 2.2, 0.1);
    const nac = box(0.12, 0.12, 0.3, 0xf6f6f2); nac.position.set(0, 2.2, 0); t.add(nac);
    for (let b = 0; b < 3; b++) {
      const bl = box(0.07, 0.95, 0.02, 0xffffff); bl.position.y = 0.475; const piv = new THREE.Group(); piv.add(bl); piv.rotation.z = b * 2.094; hub.add(piv);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M(0xf6f6f2)); hub.add(nose);
    t.add(hub); add(t, tx, heightAt(tx, tz), tz); t.rotation.y = -0.5; turbines.push(hub);
  }
  end('seawall');
  updaters.push((dt, t, s) => { turbines.forEach((h, i) => { h.rotation.z -= dt * (0.25 + s.wind * 4.2) * (1 + i * 0.07); }); });

  // ── 4. 고군산대교 — 외기둥(일주탑) 현수교
  begin();
  {
    const zc = 5.72, hA = heightAt(1.5, 5.55) + 0.03, hB = heightAt(8.9, 5.95) + 0.03;
    const P0 = V(1.5, hA, 5.55), P1 = V(3.0, 1.02, 5.62), P2 = V(7.4, 1.02, 5.86), P3 = V(8.9, hB, 5.95);
    for (const [a, b] of [[P0, P1], [P1, P2], [P2, P3]]) {
      g.add(beam(a, b, 0.4, 0.07, 0xdfe3e6));
      g.add(beam(a.clone().setY(a.y + 0.04), b.clone().setY(b.y + 0.04), 0.3, 0.012, 0x4a4f57));
    }
    for (const p of [P1, P2]) { const pier = box(0.16, 2.9, 0.3, 0xcfd4d8); pier.position.set(p.x, p.y - 1.5, p.z); g.add(pier); }
    // 주탑: 한쪽으로 기울어진 큰 D자 기둥
    const base = V(6.25, -1.8, zc + 0.1), top = V(5.95, 4.2, zc + 0.1);
    const py = beam(base, top, 0.26, 0.3, 0xf3f5f6); g.add(py);
    const back = beam(V(6.95, 1.0, zc + 0.14), V(6.05, 3.6, zc + 0.1), 0.2, 0.16, 0xf3f5f6); g.add(back);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M(0xffd766, { emissive: 0xffb300, emissiveIntensity: 0.6 })); cap.position.copy(top); g.add(cap);
    // 주케이블(포물선) + 행어
    const at = (x) => { const t = (x - P1.x) / (P2.x - P1.x); return V(x, 1.05, mix(P1.z, P2.z, t)); };
    const cablePts = (x0, x1, n) => {
      const arr = [];
      for (let i = 0; i <= n; i++) { const t = i / n, x = mix(x0, x1, t), d = at(x), sag = (1 - t) * (1 - t); arr.push(V(mix(x, top.x, sag * 0.0), mix(d.y + 0.12, top.y - 0.1, sag), d.z + 0.02)); }
      arr[0].x = top.x; return arr;
    };
    const mkCable = (x1) => {
      const pts = cablePts(top.x, x1, 12);
      for (let i = 0; i < pts.length - 1; i++) g.add(beam(pts[i], pts[i + 1], 0.03, 0.03, 0xffffff));
      for (let i = 2; i < pts.length; i++) { const d = at(pts[i].x); if (pts[i].y - d.y > 0.12) g.add(beam(d, pts[i], 0.012, 0.012, 0xe9eef2)); }
    };
    mkCable(P1.x + 0.1); mkCable(P2.x - 0.1);
    roadPaths.push(new Poly([P0.clone().setY(P0.y + 0.06), P1.clone().setY(1.08), P2.clone().setY(1.08), P3.clone().setY(P3.y + 0.06)]));
    labels.push({ name: '고군산대교', pos: V(5.95, 4.65, zc) });
  }
  end('bridge');
  // 차들
  const cars = [], carCols = [0xffffff, 0xf2c230, 0x3f78c9, 0x2d3640, 0x58b88a, 0xff8a3d, 0xe8e8e8];
  [[0, 5], [1, 4]].forEach(([pi, n]) => {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Group(), b = box(0.24, 0.07, 0.11, carCols[(i + pi * 3) % carCols.length]); b.position.y = 0.05; c.add(b);
      const cab = box(0.12, 0.06, 0.1, 0xdfe9f2); cab.position.set(-0.01, 0.11, 0); c.add(cab);
      g.add(c); eras[pi ? 'bridge' : 'seawall'].push(c); cars.push({ c, path: roadPaths[pi], d: rnd() * roadPaths[pi].total, dir: i % 2 ? 1 : -1, sp: 0.7 + rnd() * 0.5 });
    }
  });
  const cp = V(), cd = V();
  updaters.push((dt) => {
    for (const c of cars) {
      c.d += c.dir * c.sp * dt; if (c.d > c.path.total) { c.d = c.path.total; c.dir = -1; } if (c.d < 0) { c.d = 0; c.dir = 1; }
      c.path.at(c.d, cp, cd); if (c.dir < 0) cd.multiplyScalar(-1);
      const side = 0.085; c.c.position.set(cp.x - cd.z * side, cp.y, cp.z + cd.x * side);
      c.c.rotation.set(0, Math.atan2(-cd.z, cd.x), 0); c.c.rotateZ(Math.asin(cd.y));
    }
  });

  // ── 5. 선유도: 망주봉(지형) · 명사십리 파라솔 · 기도등대
  labels.push({ name: '선유도 망주봉', pos: V(0.2, 2.55, 4.75) });
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.14, x = mix(SPIT.ax, SPIT.bx, t), z = mix(SPIT.az, SPIT.bz, t) + (i % 2 ? 0.1 : -0.08), y = heightAt(x, z);
    const pole = cyl(0.012, 0.012, 0.26, 0xffffff, 6); add(pole, x, y + 0.13, z);
    const par = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.09, 8), M([0xffd24d, 0x4db8ff, 0xffffff, 0x7ed6a5][i % 4])); par.castShadow = true; add(par, x, y + 0.28, z);
  }
  {
    const lx = BREAK.bx + 0.03, lz = BREAK.bz + 0.03, ly = heightAt(lx, lz), L = new THREE.Group(), RED = 0xe2402f;
    const base = cyl(0.17, 0.2, 0.16, 0xf4f1ea, 14); base.position.y = 0.08; L.add(base);
    // 기도하는 두 손: 맞닿은 두 장의 손바닥
    for (const s of [-1, 1]) {
      const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.62, 6, 12), M(RED)); hand.scale.set(0.42, 1, 1); hand.castShadow = true;
      hand.position.set(s * 0.045, 0.62, 0); hand.rotation.z = s * 0.07; L.add(hand);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), M(RED)); thumb.position.set(s * 0.05, 0.42, 0.13); thumb.rotation.x = -0.35; L.add(thumb);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffe066, emissiveIntensity: 1 })); lamp.position.y = 1.12; L.add(lamp);
    add(L, lx, ly, lz); L.rotation.y = 0.8;
    updaters.push((dt, t) => { lamp.material.emissiveIntensity = (Math.sin(t * 3) > 0.3) ? 2.4 : 0.2; });
  }
  // 월명공원 수시탑 (돛·불꽃 모양 흰 탑)
  {
    const sx = -9.8, sz = -7.2, sy = heightAt(sx, sz), S = new THREE.Group();
    const b = cyl(0.22, 0.26, 0.12, 0xe9e5dc, 12); b.position.y = 0.06; S.add(b);
    for (const [dx, h, r] of [[-0.07, 1.25, 0.1], [0.08, 0.95, -0.14]]) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, h, 4), M(0xfbfaf6)); fin.scale.set(1, 1, 0.35); fin.position.set(dx, 0.12 + h / 2, 0); fin.rotation.z = r; fin.castShadow = true; S.add(fin);
    }
    add(S, sx, sy, sz);
  }

  // ── 6. 십이동파도 청자 난파선 (바닷속)
  {
    const wx = -9.6, wz = 7.75, wy = heightAt(wx, wz), Wk = new THREE.Group(), WOOD = 0x8a5a36;
    const keel = box(1.7, 0.08, 0.1, WOOD); keel.position.y = 0.05; Wk.add(keel);
    for (let i = 0; i < 7; i++) {
      const rx = -0.75 + i * 0.25, w = 0.3 + 0.22 * Math.sin((i + 0.5) / 7 * Math.PI);
      const rib = new THREE.Mesh(new THREE.TorusGeometry(w, 0.03, 6, 14, Math.PI), M(WOOD)); rib.rotation.set(Math.PI, Math.PI / 2, 0); rib.position.set(rx, w + 0.04, 0); Wk.add(rib);
    }
    const pl = box(1.5, 0.05, 0.28, 0x9c6b42); pl.position.set(0, 0.18, 0.33); pl.rotation.x = 0.6; Wk.add(pl);
    const mast = cyl(0.03, 0.04, 1.0, WOOD, 6); mast.position.set(0.2, 0.3, -0.2); mast.rotation.z = 1.1; Wk.add(mast);
    const CEL = M(0xa9e0c3, { roughness: 0.25, emissive: 0x3c9a78, emissiveIntensity: 0.35 });
    const prof = [[0, 0], [0.05, 0], [0.085, 0.06], [0.075, 0.13], [0.04, 0.17], [0.05, 0.2]].map(p => new THREE.Vector2(p[0], p[1]));
    const jarG = new THREE.LatheGeometry(prof, 12), bowlG = new THREE.LatheGeometry([[0.02, 0], [0.07, 0.02], [0.1, 0.07]].map(p => new THREE.Vector2(p[0], p[1])), 12);
    for (let i = 0; i < 11; i++) {
      const m = new THREE.Mesh(i % 3 ? bowlG : jarG, CEL); m.material.side = THREE.DoubleSide;
      m.position.set(-0.7 + rnd() * 1.6, 0.03 + (i % 4 === 0 ? 0.06 : 0), -0.25 + rnd() * 0.75); m.rotation.set((rnd() - 0.5) * 0.9, rnd() * 6, (rnd() - 0.5) * 0.9); m.scale.setScalar(1.25); Wk.add(m);
    }
    add(Wk, wx, wy - 0.02, wz); Wk.rotation.set(0.12, 0.5, -0.1);
    labels.push({ name: '십이동파도 청자 난파선', pos: V(wx, 0.35, wz) });
  }

  // ── 마을 집·나무 (인스턴스)
  {
    const spots = [], trees = [];
    const tryHouse = (x, z) => {
      const h = heightAt(x, z), id = lastId(), inl = lastInland();
      const e = 0.18, sl = Math.abs(heightAt(x + e, z) - heightAt(x - e, z)) + Math.abs(heightAt(x, z + e) - heightAt(x, z - e));
      if (sl > 0.16 || h < 0.3) return;
      if (id === 0 && (x > 4 || inl < 1.25 || inl > 4.2 || h > 1.3)) return;
      if (id !== 0 && id !== 3 && id !== 2) return;
      if (id === 3 && (z < 5.3 || h > 0.6)) return;
      if (id === 2 && h > 0.7) return;
      for (const s of spots) if (Math.hypot(s.x - x, s.z - z) < 0.42) return;
      spots.push({ x, z, h });
    };
    for (let i = 0; i < 2600 && spots.length < 96; i++) tryHouse(-12.6 + rnd() * 25, -8.7 + rnd() * 16);
    const wallG = new THREE.BoxGeometry(1, 1, 1), roofG = new THREE.ConeGeometry(0.72, 1, 4); roofG.rotateY(Math.PI / 4);
    const walls = new THREE.InstancedMesh(wallG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length);
    const roofs = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ roughness: 0.7 }), spots.length);
    const o = new THREE.Object3D(), col = new THREE.Color();
    const wc = [0xfaf5ea, 0xf3ead8, 0xe9dcc6, 0xd9a68a, 0xffffff], rc = [0xb5533c, 0x3f78c9, 0x4d8f86, 0xff9f43, 0x6d7780, 0xc9694d, 0x2f5f9e];
    spots.forEach((s, i) => {
      const w = 0.24 + rnd() * 0.14, d = 0.2 + rnd() * 0.1, hh = 0.15 + rnd() * 0.12, ry = (rnd() - 0.5) * 0.8;
      o.position.set(s.x, s.h + hh / 2 - 0.02, s.z); o.rotation.set(0, ry, 0); o.scale.set(w, hh, d); o.updateMatrix(); walls.setMatrixAt(i, o.matrix);
      walls.setColorAt(i, col.set(wc[(rnd() * wc.length) | 0]));
      o.position.y = s.h + hh + 0.055; o.scale.set(w * 1.12, 0.13, d * 1.25); o.updateMatrix(); roofs.setMatrixAt(i, o.matrix);
      roofs.setColorAt(i, col.set(rc[(rnd() * rc.length) | 0]));
    });
    walls.castShadow = roofs.castShadow = true; g.add(walls, roofs);
    for (let i = 0; i < 9000 && trees.length < 330; i++) {
      const x = -12.8 + rnd() * 25.6, z = -8.8 + rnd() * 17.6, h = heightAt(x, z), id = lastId(), inl = lastInland();
      if (h < 0.36 || id === 1 || id === 5 || id === 7) continue;
      if (id === 0 && (inl < 1.6 || x > 4.2 && h < 0.5)) continue;
      if (id === 3 && h > 0.85 && z < 5.25) continue;
      if (id === 4 && h < 0.33) continue;
      if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 0.25)) continue;
      trees.push({ x, z, h });
    }
    const tg = new THREE.IcosahedronGeometry(0.5, 1);
    const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), trees.length);
    const tc = [0x4f9a52, 0x3f8a4a, 0x67ab5c, 0x2f7a45, 0x7dbb62];
    trees.forEach((t, i) => {
      const s = 0.2 + rnd() * 0.22; o.position.set(t.x, t.h + s * 0.42, t.z); o.rotation.set(0, rnd() * 6, 0); o.scale.set(s, s * (1 + rnd() * 0.6), s); o.updateMatrix();
      tm.setMatrixAt(i, o.matrix); tm.setColorAt(i, col.set(tc[(rnd() * tc.length) | 0]));
    });
    tm.castShadow = true; g.add(tm);
  }

  // 1930년대: 뜬다리부두 옆 쌀가마니 더미 (호남평야의 쌀을 실어 나르던 항구)
  {
    const SACK = 0xd9c79c, SACK2 = 0xcbb688;
    for (const [px, dz] of [[-5.75, -0.45], [-5.2, -0.5], [-7.4, -0.5]]) {
      const pz = coastZ(px) + dz, py = heightAt(px, pz), pile = new THREE.Group();
      let n = 0;
      for (let ly = 0; ly < 3; ly++) for (let ix = 0; ix < 3 - ly; ix++) for (let iz = 0; iz < 2; iz++) {
        const sk = box(0.16, 0.09, 0.11, (n++ % 3) ? SACK : SACK2);
        sk.position.set((ix - (2 - ly) / 2) * 0.17, 0.05 + ly * 0.09, (iz - 0.5) * 0.12); sk.rotation.y = (rnd() - 0.5) * 0.2; pile.add(sk);
      }
      add(pile, px, py, pz); eras.rice.push(pile); pile.visible = false;
    }
  }
  function setEra(on) {   // on: { shipyard, seawall, bridge, rice } → true/false
    for (const k in eras) for (const o of eras[k]) o.visible = !!on[k];
  }
  return { group: g, labels, setEra, update(dt, t, s) { for (const u of updaters) u(dt, t, s); } };
}
