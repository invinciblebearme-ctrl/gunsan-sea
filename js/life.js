// life.js — 진수선·예인선, 유람선, 어선, 요트, 물고기 떼, 먹이, 구명튜브, 갈매기
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt, coastZ, HX, HZ } from './terrain.js';
import { M, box } from './world.js';

const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
export const ROUTES = {
  ship: [[7.0, -2.2], [4.6, -1.0], [0.5, 0.6], [-4.0, 1.6], [-7.4, 3.0], [-8.5, 5.6], [-8.5, 9.0], [-8.5, 13.5]],
  cruise: [[-6.4, -1.4], [-2, -0.2], [3.2, 1.0], [5.0, 3.2], [4.7, 5.6], [4.3, 7.8], [0, 8.3], [-3.4, 8.5], [-4.45, 7.0], [-4.3, 5.4], [-6.0, 4.3], [-6.8, 1.5]],
  y1: [[-9, 0.3], [-6, -0.8], [-3, 0.6], [-5.5, 2.3], [-9, 3.4], [-11.2, 1.8]],
  y2: [[2, 0], [6, -0.5], [8, 1.5], [6.2, 3], [3.2, 2.6], [1, 1.4]],
};
const curve = (pts, closed) => new THREE.CatmullRomCurve3(pts.map(p => V(p[0], p[1])), closed, 'centripetal');

function hullGeo(L, Wd, H, bow = 0.34) {
  const s = new THREE.Shape(), h = Wd / 2, a = -L / 2, b = L / 2;
  s.moveTo(a, -h * 0.82); s.lineTo(b - L * bow, -h); s.quadraticCurveTo(b - L * 0.08, -h * 0.75, b, 0);
  s.quadraticCurveTo(b - L * 0.08, h * 0.75, b - L * bow, h); s.lineTo(a, h * 0.82); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0, 0); return g; // 앞 = +x, 위 = +y
}
function boat(L, Wd, H, hullCol, deckCol) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(hullGeo(L, Wd, H), M(hullCol)); hull.position.y = -H * 0.45; hull.castShadow = true; g.add(hull);
  const deck = new THREE.Mesh(hullGeo(L * 0.97, Wd * 0.9, 0.02), M(deckCol)); deck.position.y = H * 0.55; g.add(deck);
  return g;
}
const setClip = (obj, plane) => obj.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.clippingPlanes = [plane]; } });

export function buildLife(root, water, spray, audio, clipPlane, stats) {
  const g = new THREE.Group(); root.add(g);
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), gr = { x: 0, z: 0 };
  const windDir = new THREE.Vector2(0.94, 0.34);
  const state = { wind: 0.4, launching: false };

  const ride = (o, x, z, yaw, draft, pitchK = 0.5) => {
    water.grad(x, z, gr);
    o.position.set(x, water.surfY(x, z) + draft, z);
    const c = Math.cos(yaw), s = Math.sin(yaw), fwd = gr.x * c - gr.z * s, side = gr.x * s + gr.z * c;
    o.rotation.set(0, yaw, 0); o.rotateZ(Math.atan(fwd) * pitchK); o.rotateX(-Math.atan(side) * pitchK);
  };
  const wake = (x, z, yaw, L, amt, dt) => {
    const c = Math.cos(yaw), s = -Math.sin(yaw);
    water.splash(x + c * L * 0.5, z + s * L * 0.5, 0.45, -amt); water.splash(x - c * L * 0.45, z - s * L * 0.45, 0.4, amt * 0.7);
    if (Math.random() < dt * 22 * Math.min(1, amt * 60)) spray.emit(x + c * L * 0.52, water.sea + 0.05, z + s * L * 0.52, 2, 0.5, 1.3, c * 0.5, s * 0.5);
  };

  // ── 진수선(벌크선) + 예인선
  const ship = boat(3.0, 0.72, 0.5, 0x1f4f8f, 0xb24a3a);
  { const stripe = new THREE.Mesh(hullGeo(3.02, 0.74, 0.1), M(0xd9472f)); stripe.position.y = -0.24; ship.add(stripe);
    for (let i = 0; i < 4; i++) { const hatch = box(0.42, 0.07, 0.46, 0xe7c15a); hatch.position.set(-0.45 + i * 0.5, 0.33, 0); ship.add(hatch); }
    const house = box(0.42, 0.5, 0.56, 0xfbfbf8); house.position.set(-1.12, 0.55, 0); ship.add(house);
    const bridge = box(0.3, 0.12, 0.7, 0xfbfbf8); bridge.position.set(-1.08, 0.86, 0); ship.add(bridge);
    const win = box(0.31, 0.05, 0.6, 0x2c3e55); win.position.set(-1.07, 0.86, 0); ship.add(win);
    const fun = box(0.16, 0.3, 0.2, 0xff8a3d); fun.position.set(-1.25, 1.05, 0); ship.add(fun); }
  const tug = boat(0.85, 0.36, 0.26, 0x2d3640, 0xd9d2c4);
  { const h = box(0.3, 0.22, 0.26, 0xffc93c); h.position.set(-0.02, 0.26, 0); tug.add(h);
    const f = box(0.08, 0.16, 0.08, 0x2d3640); f.position.set(-0.16, 0.42, 0); tug.add(f);
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 10), M(0x1d2228)); fender.rotation.y = Math.PI / 2; fender.position.set(0.4, 0.1, 0); tug.add(fender); }
  setClip(ship, clipPlane); setClip(tug, clipPlane); g.add(ship, tug);
  const shipC = curve(ROUTES.ship, false), shipLen = shipC.getLength();
  const L = { phase: 'ready', d: 0, sp: 0, wait: 0, pop: 1 };
  let yardOn = true;   // 그때와 지금: 조선소가 없는 시대엔 배를 숨김
  const placeOn = (o, c, len, d, draft, Lb, amt, dt) => {
    const u = Math.max(0, Math.min(1, d / len)); c.getPointAt(u, tmp); c.getTangentAt(u, tan);
    const yaw = Math.atan2(-tan.z, tan.x);
    if (Math.abs(tmp.x) < HX - 0.3 && Math.abs(tmp.z) < HZ - 0.3) { ride(o, tmp.x, tmp.z, yaw, draft, 0.35); if (amt) wake(tmp.x, tmp.z, yaw, Lb, amt, dt); }
    else { o.position.set(tmp.x, water.sea + draft, tmp.z); o.rotation.set(0, yaw, 0); }
  };
  function launch() {
    if (L.phase !== 'ready') return false;
    L.phase = 'out'; L.sp = 0; state.launching = true; audio.horn(); return true;
  }
  function updShip(dt) {
    if (L.phase === 'out') {
      L.sp = Math.min(2.3, L.sp + dt * 0.5); L.d += L.sp * dt;
      if (L.d > shipLen - 2.2) { L.phase = 'gone'; L.wait = 1.6; stats.launch++; stats.dirty = true; state.launching = false; }
    } else if (L.phase === 'gone') {
      L.wait -= dt; if (L.wait <= 0) { L.phase = 'ready'; L.d = 0; L.pop = 0; audio.plop(); }
    }
    L.pop = Math.min(1, L.pop + dt * 1.6);
    const e = L.pop, sc = e < 1 ? 1 + 0.18 * Math.sin(e * Math.PI) * (1 - e) - (1 - e) * (1 - e) : 1;
    const moving = L.phase === 'out' ? 0.004 + L.sp * 0.006 : 0;
    placeOn(ship, shipC, shipLen, L.d, 0.02, 3.0, moving, dt); ship.scale.setScalar(Math.max(0.01, sc));
    placeOn(tug, shipC, shipLen, L.d + 2.3, 0.0, 0.85, moving * 0.5, dt); tug.scale.setScalar(Math.max(0.01, sc));
    ship.visible = tug.visible = yardOn && L.phase !== 'gone';
  }

  // ── 유람선 (선유도 순환)
  const cruise = boat(1.5, 0.5, 0.3, 0xffffff, 0xe9e4d8);
  { const c1 = box(0.9, 0.16, 0.4, 0xffffff); c1.position.set(-0.08, 0.26, 0); cruise.add(c1);
    const w1 = box(0.92, 0.07, 0.41, 0x2c6fb5); w1.position.set(-0.08, 0.27, 0); cruise.add(w1);
    const c2 = box(0.55, 0.13, 0.32, 0xffffff); c2.position.set(-0.15, 0.41, 0); cruise.add(c2);
    const f = box(0.1, 0.16, 0.12, 0x2c6fb5); f.position.set(-0.4, 0.55, 0); cruise.add(f);
    const stripe = new THREE.Mesh(hullGeo(1.51, 0.51, 0.05), M(0x2c6fb5)); stripe.position.y = 0.08; cruise.add(stripe); }
  g.add(cruise);
  const cruiseC = curve(ROUTES.cruise, true), cruiseLen = cruiseC.getLength(); let cd = cruiseLen * 0.08;

  // ── 정박 어선
  const moored = [];
  const mooredSpots = [[-3.7, coastZ(-3.7) + 0.55, 0.3], [-2.9, coastZ(-2.9) + 0.6, -0.2], [-2.2, coastZ(-2.2) + 0.5, 0.1], [-3.35, 6.75, 0.9], [-3.95, 6.25, 2.2], [1.2, coastZ(1.2) + 0.55, 0.2], [7.4, 6.9, 1.2]];
  const fc = [0x3f8fd6, 0x58b88a, 0xffffff, 0xf2c230, 0x2f5f9e, 0x7ed6a5, 0xffffff];
  mooredSpots.forEach(([x, z, yaw], i) => {
    if (heightAt(x, z) > -0.45) return;
    const b = boat(0.62, 0.26, 0.18, fc[i % fc.length], 0xe7dfcf);
    const cab = box(0.16, 0.16, 0.16, 0xffffff); cab.position.set(-0.14, 0.2, 0); b.add(cab);
    const mast = box(0.015, 0.34, 0.015, 0x5a4a3a); mast.position.set(0.08, 0.28, 0); b.add(mast);
    g.add(b); moored.push({ b, x, z, yaw, ph: i * 1.7 });
  });

  // ── 요트 (돛 줄무늬 = 젤리 맛 색)
  const sailCv = document.createElement('canvas'); sailCv.width = 8; sailCv.height = 64;
  const sailTex = new THREE.CanvasTexture(sailCv); sailTex.colorSpace = THREE.SRGBColorSpace; sailTex.magFilter = THREE.NearestFilter;
  function setSailColor(col) {
    const x = sailCv.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : col; x.fillRect(0, i * 8, 8, 8); }
    sailTex.needsUpdate = true;
  }
  const sailMat = new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 0.8 });
  const tri = (pts, uv) => { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.computeVertexNormals(); return ge; };
  const mainG = tri([0, 0, 0, 0, 1.25, 0, -0.72, 0.04, 0], [0, 0, 0, 1, 1, 0.03]);
  const jibG = tri([0.04, 0.02, 0, 0.04, 1.0, 0, 0.5, 0.02, 0], [0, 0, 0, 1, 1, 0]);
  const yachts = [];
  [['y1', 0], ['y1', 0.52], ['y2', 0.2]].forEach(([r, ph]) => {
    const y = boat(0.8, 0.26, 0.16, 0xffffff, 0xf4efe6), rig = new THREE.Group();
    const mast = box(0.02, 1.34, 0.02, 0xe8e8e8); mast.position.set(0, 0.67, 0); rig.add(mast);
    const sail = new THREE.Mesh(mainG, sailMat); sail.position.set(-0.01, 0.1, 0); sail.castShadow = true; rig.add(sail);
    const jib = new THREE.Mesh(jibG, M(0xffffff, { side: THREE.DoubleSide })); jib.position.set(0, 0.1, 0); rig.add(jib);
    rig.position.set(0.08, 0.08, 0); y.add(rig); g.add(y);
    const c = curve(ROUTES[r], true); yachts.push({ y, rig, c, len: c.getLength(), d: ph * c.getLength(), heel: 0 });
  });

  // ── 물고기 떼 (boids)
  const NF = 64, fishG = (() => {
    const b = new THREE.SphereGeometry(0.5, 8, 6); b.scale(1, 0.55, 0.36);
    const t = new THREE.ConeGeometry(0.3, 0.45, 4); t.rotateZ(-Math.PI / 2); t.scale(1, 1, 0.25); t.translate(-0.62, 0, 0);
    return mergeGeometries([b, t]);
  })();
  const fishM = new THREE.InstancedMesh(fishG, new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.12 }), NF);
  fishM.frustumCulled = false; g.add(fishM);
  const fish = [], fcol = [0xffb347, 0xfff1c9, 0xffd166, 0xffffff, 0xff9966], cc = new THREE.Color();
  for (let i = 0; i < NF; i++) {
    let x, z, n = 0; do { x = (Math.random() * 2 - 1) * 12; z = (Math.random() * 2 - 1) * 8; } while (heightAt(x, z) > -1.1 && n++ < 60);
    const a = Math.random() * 6.28; fish.push({ x, z, y: -0.4, vx: Math.cos(a), vz: Math.sin(a), vy: 0, off: Math.random() * 0.35, s: 0.2 + Math.random() * 0.12, ph: Math.random() * 6 });
    fishM.setColorAt(i, cc.set(fcol[i % fcol.length]));
  }
  const food = [], foodM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5), M(0xc98b4a), 48); foodM.frustumCulled = false; g.add(foodM);
  const o3 = new THREE.Object3D();
  function feed(x, z) {
    if (x === undefined || !water.isWater(x, z)) { let n = 0; do { x = (Math.random() * 2 - 1) * 9; z = -1 + Math.random() * 4; } while (heightAt(x, z) > -1 && n++ < 40); }
    for (let i = 0; i < 9 && food.length < 48; i++) {
      const a = Math.random() * 6.28, r = Math.random() * 0.6, fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r;
      if (water.isWater(fx, fz)) food.push({ x: fx, z: fz, fall: 1.4 + Math.random() * 0.8, ttl: 22 });
    }
    audio.plop();
  }
  function updFish(dt, t) {
    const sea = water.sea;
    for (let i = 0; i < NF; i++) {
      const f = fish[i]; let ax = 0, az = 0, cx = 0, cz = 0, mx = 0, mz = 0, n = 0;
      for (let j = 0; j < NF; j++) {
        if (j === i) continue; const q = fish[j], dx = q.x - f.x, dz = q.z - f.z, d2 = dx * dx + dz * dz;
        if (d2 < 1.7) { n++; cx += q.x; cz += q.z; mx += q.vx; mz += q.vz; if (d2 < 0.13) { ax -= dx / (d2 + 0.01) * 0.25; az -= dz / (d2 + 0.01) * 0.25; } }
      }
      if (n) { ax += (cx / n - f.x) * 0.5 + (mx / n - f.vx) * 0.9; az += (cz / n - f.z) * 0.5 + (mz / n - f.vz) * 0.9; }
      // 땅·가장자리 피하기
      const sp = Math.hypot(f.vx, f.vz) || 1, lx = f.x + f.vx / sp * 0.9, lz = f.z + f.vz / sp * 0.9;
      if (heightAt(lx, lz) > sea - 0.7) {
        const e = 0.5, gx = heightAt(f.x + e, f.z) - heightAt(f.x - e, f.z), gz = heightAt(f.x, f.z + e) - heightAt(f.x, f.z - e), gl = Math.hypot(gx, gz) || 1;
        ax -= gx / gl * 6; az -= gz / gl * 6;
      }
      if (Math.abs(lx) > HX - 0.7) ax -= Math.sign(lx) * 6; if (Math.abs(lz) > HZ - 0.7) az -= Math.sign(lz) * 6;
      // 먹이
      let best = null, bd = 30;
      for (const p of food) { if (p.fall > 0) continue; const d = (p.x - f.x) ** 2 + (p.z - f.z) ** 2; if (d < bd) { bd = d; best = p; } }
      let ty = sea - 0.3 - f.off;
      if (best) {
        const d = Math.sqrt(bd) || 1; ax += (best.x - f.x) / d * 4; az += (best.z - f.z) / d * 4; ty = sea - 0.12;
        if (d < 0.22) { best.ttl = 0; stats.fed++; stats.dirty = true; water.splash(best.x, best.z, 0.3, 0.02); audio.blip(); }
      }
      ax += Math.sin(t * 0.7 + f.ph) * 0.4; az += Math.cos(t * 0.6 + f.ph * 1.3) * 0.4;
      f.vx += ax * dt; f.vz += az * dt;
      const v = Math.hypot(f.vx, f.vz) || 1, target = best ? 1.9 : 1.05, nv = v + (target - v) * Math.min(1, dt * 3);
      f.vx *= nv / v; f.vz *= nv / v; f.x += f.vx * dt; f.z += f.vz * dt;
      f.x = Math.max(-HX + 0.25, Math.min(HX - 0.25, f.x)); f.z = Math.max(-HZ + 0.25, Math.min(HZ - 0.25, f.z));
      const floor = heightAt(f.x, f.z) + 0.14; ty = Math.max(ty, floor); f.y += (ty - f.y) * Math.min(1, dt * 2.5);
      if (floor > sea - 0.1) { f.x -= f.vx * dt * 1.5; f.z -= f.vz * dt * 1.5; f.vx *= -1; f.vz *= -1; }
      o3.position.set(f.x, Math.min(f.y, water.surfY(f.x, f.z) - 0.08), f.z);
      o3.rotation.set(0, Math.atan2(-f.vz, f.vx) + Math.sin(t * 9 + f.ph) * 0.18, 0); o3.scale.setScalar(f.s); o3.updateMatrix(); fishM.setMatrixAt(i, o3.matrix);
    }
    fishM.instanceMatrix.needsUpdate = true;
    let k = 0;
    for (let i = food.length - 1; i >= 0; i--) {
      const p = food[i]; p.ttl -= dt; if (p.ttl <= 0 || !water.isWater(p.x, p.z)) { food.splice(i, 1); continue; }
      if (p.fall > 0) { p.fall -= dt * 3.2; if (p.fall <= 0) { water.splash(p.x, p.z, 0.3, -0.018); spray.emit(p.x, sea, p.z, 2, 0.3, 1); } }
    }
    for (const p of food) { o3.position.set(p.x, water.surfY(p.x, p.z) + Math.max(0, p.fall) + 0.01, p.z); o3.rotation.set(0, 0, 0); o3.scale.setScalar(1); o3.updateMatrix(); foodM.setMatrixAt(k++, o3.matrix); }
    foodM.count = k; foodM.instanceMatrix.needsUpdate = true;
  }

  // ── 구명튜브
  const buoyTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff7a1a'; x.fillRect(i * 8, 0, 8, 8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const buoyG = new THREE.TorusGeometry(0.2, 0.075, 10, 24); buoyG.rotateX(Math.PI / 2);
  const buoyMat = new THREE.MeshStandardMaterial({ map: buoyTex, roughness: 0.5 }), buoys = [];
  function dropBuoy(x, z) {
    if (x === undefined) { let n = 0; do { x = (Math.random() * 2 - 1) * 10; z = (Math.random() * 2 - 1) * 6; } while (heightAt(x, z) > -0.8 && n++ < 60); }
    if (!water.isWater(x, z)) return false;
    const m = new THREE.Mesh(buoyG, buoyMat); m.castShadow = true; g.add(m);
    buoys.push({ m, x, z, y: water.sea + 3.6, vy: 0, vx: 0, vz: 0, air: true, spin: Math.random() * 6 });
    if (buoys.length > 14) { const b = buoys.shift(); g.remove(b.m); }
    return true;
  }
  function updBuoys(dt, t) {
    for (const b of buoys) {
      const sy = water.surfY(b.x, b.z);
      if (b.air) {
        b.vy -= 13 * dt; b.y += b.vy * dt; b.m.rotation.set(Math.sin(b.spin + t * 5) * 0.5, 0, Math.cos(b.spin + t * 4) * 0.5);
        if (b.y <= sy) { b.air = false; b.y = sy; b.vy *= -0.12; water.splash(b.x, b.z, 0.7, -0.11); spray.emit(b.x, sy, b.z, 30, 1.3, 3.2); audio.splash(1); }
        b.m.position.set(b.x, b.y, b.z);
      } else {
        water.grad(b.x, b.z, gr); b.vx = (b.vx - gr.x * 2.2 * dt) * 0.985 + windDir.x * state.wind * 0.02 * dt; b.vz = (b.vz - gr.z * 2.2 * dt) * 0.985 + windDir.y * state.wind * 0.02 * dt;
        const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
        if (water.isWater(nx, nz) && Math.abs(nx) < HX - 0.3 && Math.abs(nz) < HZ - 0.3 && water.depthAt(nx, nz) > 0.12) { b.x = nx; b.z = nz; } else { b.vx *= -0.4; b.vz *= -0.4; }
        b.vy += ((sy + 0.02 - b.y) * 60 - b.vy * 7) * dt; b.y += b.vy * dt;
        b.m.position.set(b.x, b.y, b.z); b.m.rotation.set(Math.atan(gr.z) * 0.9, b.spin, -Math.atan(gr.x) * 0.9);
      }
    }
  }

  // ── 갈매기
  const gulls = [];
  for (let i = 0; i < 6; i++) {
    const G = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(0xffffff)); body.scale.set(1.9, 0.8, 0.8); G.add(body);
    const wg = tri([0, 0, 0, -0.07, 0, 0.36, 0.1, 0, 0.03], [0, 0, 0, 1, 1, 0]), wings = [];
    for (const s of [1, -1]) { const w = new THREE.Mesh(wg, M(0xf2f2f2, { side: THREE.DoubleSide })); w.scale.z = s; const tip = new THREE.Group(); tip.add(w); G.add(tip); wings.push(tip); }
    g.add(G); gulls.push({ G, wings, cx: -7 + i * 3.1, cz: -1.5 + (i % 3) * 2.6, r: 1.6 + (i % 4) * 0.8, sp: (0.5 + i * 0.07) * (i % 2 ? 1 : -1), h: 2.4 + (i % 3) * 0.55, ph: i * 1.3 });
  }
  function updGulls(dt, t) {
    for (const u of gulls) {
      const a = t * u.sp + u.ph, x = u.cx + Math.cos(a) * u.r, z = u.cz + Math.sin(a) * u.r * 0.7;
      u.G.position.set(x, u.h + Math.sin(t * 0.8 + u.ph) * 0.25, z);
      const dx = -Math.sin(a) * u.sp, dz = Math.cos(a) * 0.7 * u.sp; u.G.rotation.set(0, Math.atan2(-dz, dx), 0); u.G.rotateX(-0.25 * Math.sign(u.sp));
      const f = Math.sin(t * 7 + u.ph) * 0.55; u.wings[0].rotation.x = -f; u.wings[1].rotation.x = f;
    }
  }

  function update(dt, t, env) {
    state.wind = env.wind;
    updShip(dt);
    // 유람선
    const cs = 1.15; cd += cs * dt; if (cd >= cruiseLen) { cd -= cruiseLen; stats.laps++; stats.dirty = true; }
    placeOn(cruise, cruiseC, cruiseLen, cd, 0.0, 1.5, 0.0045, dt);
    for (const m of moored) ride(m.b, m.x + Math.sin(t * 0.5 + m.ph) * 0.03, m.z, m.yaw + Math.sin(t * 0.4 + m.ph) * 0.08, 0.0, 0.9);
    // 요트: 바람과 이루는 각에 따라 속도·기울기
    for (const y of yachts) {
      const u = (((y.d / y.len) % 1) + 1) % 1; y.c.getPointAt(u, tmp); y.c.getTangentAt(u, tan);
      const cross = tan.x * windDir.y - tan.z * windDir.x, along = tan.x * windDir.x + tan.z * windDir.y;
      const sp = (0.18 + env.wind * 1.5) * (0.5 + 0.5 * Math.abs(cross) + 0.25 * Math.max(0, along));
      y.d += sp * dt; const yaw = Math.atan2(-tan.z, tan.x);
      ride(y.y, tmp.x, tmp.z, yaw, 0.0, 0.5);
      const heel = -cross * env.wind * 0.5; y.heel += (heel - y.heel) * Math.min(1, dt * 2); y.y.rotateX(y.heel);
      y.rig.rotation.y = -Math.sign(cross || 1) * (0.25 + 0.5 * (1 - Math.abs(cross))) + Math.sin(t * 2 + y.d) * 0.03 * env.wind;
      if (sp > 0.5) water.splash(tmp.x + tan.x * 0.4, tmp.z + tan.z * 0.4, 0.3, -0.0018 * sp);
    }
    updFish(dt, t); updBuoys(dt, t); updGulls(dt, t);
  }
  function reset() {
    L.phase = 'ready'; L.d = 0; L.pop = 1; state.launching = false; cd = cruiseLen * 0.08;
    for (const b of buoys) g.remove(b.m); buoys.length = 0; food.length = 0;
  }
  return { update, launch, feed, dropBuoy, setSailColor, reset, state, setYard(on) { yardOn = on; ship.visible = tug.visible = on && L.phase !== 'gone'; }, get busy() { return L.phase !== 'ready'; } };
}
