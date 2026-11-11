// main.js — 장면 조립, 젤리 스프링, 입력, 조작 패널
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTerrain, heightAt, coastZ, HX, HZ, BOTTOM, mix } from './terrain.js';
import { Water, Spray } from './water.js';
import { buildWorld } from './world.js';
import { buildLife } from './life.js';
import { createAudio } from './audio.js';
import { setupLearning } from './learn.js';
import { setupQuiz } from './quiz.js';
import { setupEra } from './era.js';
import { setupTeacher } from './teacher.js';
import { setupEnv } from './env.js';

const $ = s => document.querySelector(s);
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const QS = new URLSearchParams(location.search), SIMX = Math.max(1, +QS.get('sim') || 1);
renderer.setPixelRatio(+QS.get('dpr') || Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.NeutralToneMapping;   // ACES는 파랑 채도를 깎아서 Neutral
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
const BG = 0xece7de;
renderer.setClearColor(BG, 1);

const scene = new THREE.Scene(); scene.background = new THREE.Color(BG);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(30, 1, 1, 600);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c9b2, 0.75));
const sun = new THREE.DirectionalLight(0xfff4e2, 2.5); sun.position.set(-11, 20, -7); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.2 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = BOTTOM - 0.02; ground.receiveShadow = true; scene.add(ground);

// ── 블록 (전단 스프링으로 출렁이는 루트)
const root = new THREE.Group(); root.matrixAutoUpdate = false; scene.add(root);
const uniforms = { uTime: { value: 0 }, uSea: { value: 0 } };
const terrain = buildTerrain(uniforms); root.add(terrain.mesh, terrain.walls, terrain.cap);
const water = new Water(terrain.heightTex, uniforms); root.add(water.group);
const spray = new Spray(); root.add(spray.points);
const audio = createAudio();
const stats = { launch: 0, laps: 0, fed: 0, dirty: true };
const clipBase = new THREE.Plane(new THREE.Vector3(0, 0, -1), HZ - 0.002), clipPlane = clipBase.clone();
const world = buildWorld(root, water);
const life = buildLife(root, water, spray, audio, clipPlane, stats);

const env = { wind: 0.4, launching: false };
const jelly = { sx: 0, sz: 0, vx: 0, vz: 0, tx: 0, tz: 0, drag: false, firm: 0.6, wx: 0, wz: 0, wvx: 0, wvz: 0, ax: 0, az: 0 };
function stepJelly(dt) {
  const j = jelly, k = mix(34, 150, j.firm), c = mix(7.5, 2.0, j.firm), n = 3; dt /= n;
  for (let i = 0; i < n; i++) {
    let ax = -k * j.sx - c * j.vx, az = -k * j.sz - c * j.vz;
    if (j.drag) { ax += 320 * (j.tx - j.sx) - 22 * j.vx; az += 320 * (j.tz - j.sz) - 22 * j.vz; }
    j.vx += ax * dt; j.vz += az * dt; j.sx += j.vx * dt; j.sz += j.vz * dt; j.ax = ax; j.az = az;
    // 물은 반대로 쏠림
    const wax = -42 * j.wx - 3.2 * j.wvx - ax * 0.0042, waz = -42 * j.wz - 3.2 * j.wvz - az * 0.0042;
    j.wvx += wax * dt; j.wvz += waz * dt; j.wx += j.wvx * dt; j.wz += j.wvz * dt;
  }
  const lim = 0.03; j.wx = Math.max(-lim, Math.min(lim, j.wx)); j.wz = Math.max(-lim, Math.min(lim, j.wz));
  water.slosh.x = j.wx; water.slosh.z = j.wz;
}
function applyShear() {
  const { sx, sz } = jelly, sy = 1 - 0.35 * (sx * sx + sz * sz);
  root.matrix.set(1, sx, 0, -sx * BOTTOM, 0, sy, 0, BOTTOM * (1 - sy), 0, sz, 1, -sz * BOTTOM, 0, 0, 0, 1);
  root.matrixWorldNeedsUpdate = true; root.updateMatrixWorld(true);
  clipPlane.copy(clipBase).applyMatrix4(root.matrixWorld);
}

// ── 카메라 궤도
const VIEWS = [
  { az: 0.36, pol: 0.99, zoom: 1, t: [0, -0.9, 0] },
  { az: 0.0, pol: 0.3, zoom: 0.98, t: [0, -0.9, 0] },
  { az: -0.75, pol: 1.12, zoom: 0.5, t: [-5.5, 0, -2.5] },
  { az: 0.95, pol: 1.3, zoom: 0.55, t: [3, 0, 4.5] },
];
const orb = { az: 0.36, pol: 0.99, dist: 60, fit: 60, t: new THREE.Vector3(0, -0.9, 0), goal: null, view: 0 };
const layout = { mobile: false, W: 1, H: 1 };
function resize() {
  const W = window.innerWidth, H = window.innerHeight, mobile = W < 760;
  layout.mobile = mobile; layout.W = W; layout.H = H; document.body.classList.toggle('mobile', mobile);
  renderer.setSize(W, H, false); camera.aspect = W / H;
  const panelW = mobile ? 0 : 336, bottomH = mobile ? 128 : 0, topH = mobile ? 84 : 46;
  camera.setViewOffset(W, H, panelW / 2, (bottomH - topH) / 2, W, H);
  Object.assign(VIEWS[0], mobile && H > W ? { az: 1.18, pol: 0.84 } : { az: 0.36, pol: 0.99 });
  camera.updateProjectionMatrix();
  // 기본 시점에서 블록 8꼭짓점이 (패널·제목을 뺀) 화면 안에 다 들어오는 거리를 이분 탐색
  const m = mobile ? 10 : 34, x0 = m, x1 = W - (mobile ? 0 : 336) - m, y0 = topH + m, y1 = H - bottomH - m, v = VIEWS[0], c = new THREE.Vector3();
  const fits = d => {
    const s = Math.sin(v.pol); camera.position.set(v.t[0] + d * s * Math.sin(v.az), v.t[1] + d * Math.cos(v.pol), v.t[2] + d * s * Math.cos(v.az));
    camera.lookAt(v.t[0], v.t[1], v.t[2]); camera.updateMatrixWorld(true);
    for (let i = 0; i < 8; i++) {
      c.set(i & 1 ? HX : -HX, i & 2 ? 2.6 : BOTTOM, i & 4 ? HZ : -HZ).project(camera);
      const px = (c.x * 0.5 + 0.5) * W, py = (-c.y * 0.5 + 0.5) * H; if (px < x0 || px > x1 || py < y0 || py > y1) return false;
    }
    return true;
  };
  let lo = 15, hi = 500; for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  const old = orb.fit0 ? orb.fit : 0; orb.fit = hi; orb.fit0 = true;
  if (layout.wasMobile !== undefined && layout.wasMobile !== (mobile && H > W)) setTimeout(() => setView(0), 0);
  layout.wasMobile = mobile && H > W;
  orb.dist = old ? orb.dist * orb.fit / old : orb.fit;
}
function setView(i, instant) {
  orb.view = i; const v = VIEWS[i], goal = { az: v.az, pol: v.pol, dist: orb.fit * v.zoom, t: new THREE.Vector3(...v.t) };
  if (instant) { orb.az = goal.az; orb.pol = goal.pol; orb.dist = goal.dist; orb.t.copy(goal.t); orb.goal = null; } else orb.goal = goal;
}
function updCamera(dt) {
  const g = orb.goal;
  if (g) {
    const k = Math.min(1, dt * 3.5); orb.az += (g.az - orb.az) * k; orb.pol += (g.pol - orb.pol) * k; orb.dist += (g.dist - orb.dist) * k; orb.t.lerp(g.t, k);
    if (Math.abs(g.az - orb.az) + Math.abs(g.pol - orb.pol) + Math.abs(g.dist - orb.dist) / orb.fit < 0.002) orb.goal = null;
  }
  orb.pol = Math.max(0.12, Math.min(1.5, orb.pol)); orb.dist = Math.max(orb.fit * 0.22, Math.min(orb.fit * 1.7, orb.dist));
  const s = Math.sin(orb.pol);
  camera.position.set(orb.t.x + orb.dist * s * Math.sin(orb.az), orb.t.y + orb.dist * Math.cos(orb.pol), orb.t.z + orb.dist * s * Math.cos(orb.az));
  camera.lookAt(orb.t);
}

// ── 입력: 바다 드래그=물결, 땅/단면 드래그=젤리, 빈 곳·오른쪽 드래그=회전, 스크롤=확대, 더블클릭=구명튜브
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), inv = new THREE.Matrix4(), lray = new THREE.Ray(), P = new THREE.Vector3();
function localRay(ev) {
  ndc.set((ev.clientX / layout.W) * 2 - 1, -(ev.clientY / layout.H) * 2 + 1); ray.setFromCamera(ndc, camera);
  inv.copy(root.matrixWorld).invert(); lray.copy(ray.ray).applyMatrix4(inv); return lray;
}
function seaHit(r, out) {
  if (r.direction.y > -1e-4) return false; const t = (water.sea - r.origin.y) / r.direction.y; if (t < 0) return false;
  out.copy(r.origin).addScaledVector(r.direction, t);
  return Math.abs(out.x) < HX && Math.abs(out.z) < HZ && water.isWater(out.x, out.z);
}
function classify(ev, out) {
  const r = localRay(ev), bb = new THREE.Box3(new THREE.Vector3(-HX, BOTTOM, -HZ), new THREE.Vector3(HX, 4.6, HZ)), E = new THREE.Vector3();
  if (!r.intersectBox(bb, E)) return 'orbit';
  const onSide = Math.abs(Math.abs(E.x) - HX) < 1e-3 || Math.abs(Math.abs(E.z) - HZ) < 1e-3;
  if (onSide && E.y < Math.max(heightAt(E.x, E.z), water.sea)) return 'jelly';
  const th = ray.intersectObject(terrain.mesh, false)[0];
  if (seaHit(r, out)) {
    if (!th) return 'sea';
    const wp = out.clone().applyMatrix4(root.matrixWorld);
    if (wp.distanceTo(ray.ray.origin) < th.distance + 0.02) return 'sea';
  }
  return th && th.point.y > BOTTOM ? 'jelly' : 'orbit';
}
const ptrs = new Map(); let mode = null, last = { x: 0, y: 0 }, lastSea = new THREE.Vector3(), pinch = 0, tap = { t: 0, x: 0, y: 0 }, downAt = { x: 0, y: 0, t: 0 }, swishT = 0, grabbed = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', ev => {
  audio.init(); canvas.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); if (mode === 'jelly') releaseJelly(); mode = 'pinch'; return; }
  last = { x: ev.clientX, y: ev.clientY }; downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() }; orb.goal = null;
  mode = ev.button === 2 ? 'orbit' : classify(ev, lastSea);
  if (mode === 'sea') { water.splash(lastSea.x, lastSea.z, 0.5, -0.03); spray.emit(lastSea.x, water.sea, lastSea.z, 4, 0.5, 1.6); audio.swish(1); }
  if (mode === 'jelly') { jelly.drag = true; jelly.tx = jelly.sx; jelly.tz = jelly.sz; grabbed = 0; document.body.classList.add('grab'); }
});
function releaseJelly() {
  if (!jelly.drag) return; jelly.drag = false; document.body.classList.remove('grab');
  const amt = Math.hypot(jelly.sx, jelly.sz); if (amt > 0.02) audio.wobble(amt * 2);
}
canvas.addEventListener('pointermove', ev => {
  if (!ptrs.has(ev.pointerId)) return; ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (mode === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) orb.dist *= pinch / d; pinch = d; return;
  }
  const dx = ev.clientX - last.x, dy = ev.clientY - last.y; last = { x: ev.clientX, y: ev.clientY };
  if (mode === 'orbit') { orb.az -= dx * 0.006; orb.pol -= dy * 0.005; }
  else if (mode === 'sea') {
    const r = localRay(ev);
    if (seaHit(r, P)) {
      const d = P.distanceTo(lastSea), n = Math.max(1, Math.ceil(d / 0.25)), str = Math.min(0.05, 0.012 + d * 0.05);
      for (let i = 1; i <= n; i++) { const t = i / n; water.splash(mix(lastSea.x, P.x, t), mix(lastSea.z, P.z, t), 0.42, -str); }
      if (d > 0.12) spray.emit(P.x, water.sea, P.z, Math.min(8, 1 + (d * 8 | 0)), 0.6, 1.4 + d * 2, (P.x - lastSea.x) * 2, (P.z - lastSea.z) * 2);
      const now = performance.now(); if (d > 0.2 && now - swishT > 140) { swishT = now; audio.swish(Math.min(1.6, 0.6 + d)); }
      lastSea.copy(P);
    }
  } else if (mode === 'jelly') {
    const sc = orb.dist * 0.00042, ca = Math.cos(orb.az), sa = Math.sin(orb.az);
    jelly.tx += (dx * ca + dy * sa * 0.9) * sc; jelly.tz += (-dx * sa + dy * ca * 0.9) * sc;
    const l = Math.hypot(jelly.tx, jelly.tz), mx = 0.3; if (l > mx) { jelly.tx *= mx / l; jelly.tz *= mx / l; }
    grabbed += Math.abs(dx) + Math.abs(dy);
  }
});
function endPtr(ev) {
  if (!ptrs.has(ev.pointerId)) return; ptrs.delete(ev.pointerId);
  if (mode === 'jelly') releaseJelly();
  const now = performance.now(), still = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) < 9 && now - downAt.t < 350;
  if (still && ptrs.size === 0 && mode !== 'pinch') {
    if (now - tap.t < 340 && Math.hypot(ev.clientX - tap.x, ev.clientY - tap.y) < 34) {
      if (classify(ev, P) === 'sea') life.dropBuoy(P.x, P.z); tap.t = 0;
    } else tap = { t: now, x: ev.clientX, y: ev.clientY };
  }
  if (ptrs.size === 0) mode = null; else if (ptrs.size === 1) { mode = 'orbit'; const p = [...ptrs.values()][0]; last = { x: p.x, y: p.y }; }
}
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', ev => { ev.preventDefault(); orb.goal = null; orb.dist *= Math.exp(ev.deltaY * 0.0012); }, { passive: false });
document.addEventListener('pointerdown', () => audio.init(), { once: true });

// ── 제목: 글자 한 알씩 젤리
const title = $('#title');
[...title.dataset.text].forEach((ch, i) => {
  const s = document.createElement('span'); s.className = 'jl' + (ch === ' ' ? ' sp' : ''); s.textContent = ch === ' ' ? ' ' : ch; s.dataset.ch = ch;
  s.style.setProperty('--d', (i * -0.21).toFixed(2) + 's'); s.style.setProperty('--h', (i % 3)); title.appendChild(s);
  s.addEventListener('pointerenter', () => { s.classList.remove('boing'); void s.offsetWidth; s.classList.add('boing'); });
});

// ── 이름표
const labelBox = $('#labels');
world.labels.push({ name: '갯벌', pos: new THREE.Vector3(-11.2, 0.55, coastZ(-11.2) + 1.2) });
// 자연환경·인문환경 학습용 장소 (장면에 이미 있는 명사십리 해변·구 군산세관·풍력발전기)
world.labels.push({ name: '명사십리 해변', pos: new THREE.Vector3(-3.9, heightAt(-3.9, 4.15) + 0.45, 4.15) });
world.labels.push({ name: '구 군산세관', pos: new THREE.Vector3(-4.4, heightAt(-4.4, coastZ(-4.4) - 0.95) + 1.15, coastZ(-4.4) - 0.95) });
world.labels.push({ name: '풍력발전기', pos: new THREE.Vector3(12.3, heightAt(12.3, -6.0) + 3.25, -6.0) });
const labels = world.labels.map(l => { const el = document.createElement('div'); el.className = 'pill'; el.textContent = l.name; labelBox.appendChild(el); return { ...l, el }; });
let showLabels = true;
function updLabels() {
  if (!showLabels) return;
  for (const l of labels) {
    P.copy(l.pos).applyMatrix4(root.matrixWorld).project(camera);
    const x = (P.x * 0.5 + 0.5) * layout.W, y = (-P.y * 0.5 + 0.5) * layout.H;
    l.el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    const vis = !l.off && P.z < 1 && x > 20 && x < layout.W - 20 && y > 20 && y < layout.H - 10;
    l.el.style.opacity = vis ? 1 : 0; l.el.style.pointerEvents = vis ? '' : 'none';
  }
}

// ── 젤리 맛
const FLAVORS = {
  blue: { att: '#0a82ff', tint: '#bfe4ff', j1: '#a8e0ff', j2: '#2aa4ff', j3: '#0b5fd6', sail: '#1e90ff', ink: '#0b3f8f' },
  barley: { att: '#f5ac12', tint: '#ffeec0', j1: '#ffeaa6', j2: '#f6b730', j3: '#c47d08', sail: '#f0a81e', ink: '#7a4c00' },
  celadon: { att: '#2fc79c', tint: '#d4f6e8', j1: '#c9f3e1', j2: '#58cfa8', j3: '#1c9276', sail: '#3dbf98', ink: '#0d5a47' },
};
let flavor = 'blue';
function setFlavor(name) {
  flavor = name; const f = FLAVORS[name]; water.setColor(f.att, f.tint); life.setSailColor(f.sail);
  const st = document.documentElement.style; for (const k of ['j1', 'j2', 'j3', 'ink']) st.setProperty('--' + k, f[k]);
  document.querySelectorAll('.flavor').forEach(b => b.classList.toggle('on', b.dataset.flavor === name));
}

// ── 패널
let paused = false;
const sl = { firm: $('#sFirm'), calm: $('#sCalm'), tide: $('#sTide'), wind: $('#sWind') };
const DEF = { firm: 60, calm: 45, tide: 50, wind: 40 };
function readSliders() {
  jelly.firm = sl.firm.value / 100; water.calm = sl.calm.value / 100; env.wind = water.wind = sl.wind.value / 100;
  const sea = (sl.tide.value / 100 - 0.5) * 0.62; if (Math.abs(sea - water.sea) > 1e-4) water.setSea(sea);
  uniforms.uSea.value = water.sea; water.uniforms.uRipple.value = 0.25 + (1 - water.calm) * 0.75 + env.wind * 0.35; audio.setCalm(water.calm);
  for (const k in sl) sl[k].style.setProperty('--p', sl[k].value + '%');
}
for (const k in sl) sl[k].addEventListener('input', readSliders);
function updStats() { if (!stats.dirty) return; stats.dirty = false; $('#stLaunch').textContent = stats.launch; $('#stLaps').textContent = stats.laps; $('#stFed').textContent = stats.fed; }
const bLaunch = $('#bLaunch');
bLaunch.onclick = () => { if (era.launchOK) life.launch(); };
$('#bHorn').onclick = () => audio.horn();
$('#bFeed').onclick = () => life.feed();
$('#bBuoy').onclick = () => life.dropBuoy();
document.querySelectorAll('.flavor').forEach(b => b.onclick = () => { setFlavor(b.dataset.flavor); audio.plop(); });
$('#bReset').onclick = () => {
  for (const k in sl) sl[k].value = DEF[k]; era.reset(); readSliders(); setFlavor('blue'); water.reset(); life.reset();
  stats.launch = stats.laps = stats.fed = 0; stats.dirty = true; setView(0); kick(0.16);
};
$('#bPause').onclick = e => { paused = !paused; e.currentTarget.classList.toggle('on', paused); e.currentTarget.textContent = paused ? '계속' : '멈춤'; };
$('#bSound').onclick = e => { audio.init(); audio.setMuted(!audio.muted); e.currentTarget.classList.toggle('off', audio.muted); e.currentTarget.textContent = audio.muted ? '소리 꺼짐' : '소리'; };
$('#bView').onclick = () => { learn.closeCard(); setView((orb.view + 1) % VIEWS.length); };
$('#bLabels').onclick = e => { showLabels = !showLabels; labelBox.classList.toggle('hide', !showLabels); e.currentTarget.classList.toggle('off', !showLabels); };
$('#panelToggle').onclick = () => document.body.classList.toggle('panel-open');
// ── 교육 기능 (장소 카드 · 물때 실험 · 미션)
function focusOn(pos) {
  const t = pos.clone().applyMatrix4(root.matrixWorld); t.y = Math.min(t.y, 1.2);
  orb.goal = { az: orb.az, pol: 0.95, dist: orb.fit * 0.42, t };
}
const learn = setupLearning({ labels, water, stats, tideSlider: sl.tide, focus: focusOn, audio });
const quiz = setupQuiz({ learn, labels, focus: focusOn, audio });
const era = setupEra({ terrain, water, world, life, labels, learn, kick: a => kick(a), audio });
const envEdu = setupEnv({ labels, learn, audio });
const teacher = setupTeacher({ labels, learn, focus: focusOn, overview: () => setView(0) });
function kick(a) { jelly.vx += a * 9; jelly.vz -= a * 5; audio.wobble(a); }

// ── 루프
resize(); window.addEventListener('resize', resize);
setView(0, true); setFlavor('blue'); readSliders(); applyShear(); water.updateMesh();
let tPrev = performance.now(), T = 0, coastT = 0;
function frame(now) {
  let dt = Math.max(0, Math.min(0.05, (now - tPrev) / 1000)); tPrev = now;
  if (!paused) for (let rep = 0; rep < SIMX; rep++) {
    if (SIMX > 1) dt = 1 / 30;
    T += dt; uniforms.uTime.value = T; env.launching = life.state.launching;
    stepJelly(dt); water.step(dt, T, { x: jelly.ax, z: jelly.az }); water.updateMesh();
    life.update(dt, T, env); world.update(dt, T, env); spray.update(dt);
    // 해안에 부딪히는 물보라
    coastT -= dt;
    if (coastT <= 0) {
      coastT = 0.05;
      for (let i = 0; i < 14; i++) {
        const k = (Math.random() * water.h.length) | 0;
        if (water.shore[k] > 0.6 && Math.abs(water.v[k]) > 0.012) spray.emit(-HX + (k % 131) * 0.2, water.ys[k], -HZ + ((k / 131) | 0) * 0.2, 3, 0.4, 1.2 + Math.abs(water.v[k]) * 30);
      }
    }
    bLaunch.disabled = life.busy || !era.launchOK; updStats();
  }
  applyShear(); updCamera(dt); renderer.render(scene, camera); updLabels(); learn.update(); frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => kick(0.12), 500);
let frames = 0; const _f = frame; window.__jelly = { learn, quiz, era, teacher, envEdu, get frames() { return frames; }, water, life, jelly, orb, setView, setFlavor, stats, kick, get T() { return T; } };
document.body.classList.add('ready');
