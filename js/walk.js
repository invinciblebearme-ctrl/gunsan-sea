// walk.js — 🚶 걸어서 탐방: 사람 눈높이로 군산을 걷기
//  1단계 · 땅 높이(heightAt)를 따라 걷고, 바다에는 들어가지 못함
//  2단계 · 새만금방조제 도로·고군산대교 위를 걸어서 섬까지 (그 시대에 있을 때만)
//  3단계 · 장소 가까이 가면 카드 보기, 곳곳의 안내(실제 길이 등), 가까운 이름표만 표시, 자동 탐방
//  4단계 · 배 타고 내항 ↔ 선유도 건너기 (다리가 없던 시대에는 배로만 섬에 갈 수 있음)
//  조작 · 컴퓨터: W A S D/방향키, 화면 클릭 후 마우스로 둘러보기(안 되면 드래그), Shift 빨리, E 카드, F 배, Esc 나가기
//        · 터치: 왼쪽 아래 조이스틱 + 화면 드래그, 아래 버튼
import * as THREE from 'three';
import { heightAt, lastId, coastZ, HX, HZ } from './terrain.js';

const EYE = 0.075;           // 눈높이 (집 높이 0.15~0.27 기준으로 사람 크기)
const SPEED = 0.55, RUN = 2; // 걷는 속도(블록 단위/초), Shift 배수
const SLOPE = 1.6;           // 오를 수 있는 가장 가파른 경사 (높이/거리)
const NEAR = 1.1;            // 장소 '가까이 왔어요' 거리
const LABEL_FAR = 7;         // 이 거리보다 먼 이름표는 숨김
const SKY = 0xbfe2f5, FOG = 0xd3eaf6;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// 처음 들어설 때 한 번 보여 주는 안내 (장소 이름 → 문장)
const TIPS = {
  '새만금방조제': '🧱 새만금방조제 위를 걷고 있어요. 실제 길이는 약 33.9km라서, 사람이 걸으면 8시간이 넘게 걸려요.',
  '고군산대교': '🌉 고군산대교를 건너요. 이 다리가 생기기 전에는 배를 타야만 섬에 갈 수 있었어요.',
  '갯벌': '🦀 갯벌이에요. 썰물 때 넓게 드러나고, 밀물 때는 물에 잠겨요. 물때 슬라이더로 바꿔 볼 수 있어요.',
  '신시도': '🏝️ 신시도에 왔어요. 방조제와 다리로 육지와 이어진 섬이에요.',
  '선유도': '⛰️ 선유도예요. 가운데 우뚝 솟은 두 바위 봉우리가 망주봉이에요.',
  '명사십리 해변': '🏖️ 고운 모래가 길게 이어진 명사십리 해변이에요. 파라솔을 찾아보세요.',
};

export function setupWalk({ camera, scene, root, canvas, water, learn, world, labels }) {
  let on = false, yaw = 0, pitch = -0.05, x = 0, z = 0, y = 0, bob = 0, saved = null, place = '', near = null;
  let tour = null, ride = null, tipT = 0;
  const keys = new Set(), joy = { x: 0, y: 0, id: null }, look = { id: null, px: 0, py: 0 }, tipped = new Set();
  const touch = matchMedia('(pointer: coarse)').matches;

  // ── 지면: 지형 높이와 (그 시대에 있는) 다리·방조제 도로 윗면 중 높은 쪽
  const deckOn = d => (d.key === 'bridge' ? world.eraOn.bridge : world.eraOn.seawall);
  function deckAt(px, pz) {
    let best = null;
    for (const d of world.decks) {
      if (!deckOn(d)) continue; const P = d.poly.pts;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1], vx = b.x - a.x, vz = b.z - a.z, L2 = vx * vx + vz * vz;
        const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (pz - a.z) * vz) / L2));
        if (Math.hypot(px - a.x - vx * t, pz - a.z - vz * t) <= d.half) { const h = a.y + (b.y - a.y) * t; if (!best || h > best.h) best = { h, name: d.name }; }
      }
    }
    return best;
  }
  // 다리 위에 서 있는 주탑·뒤 기둥 (지나갈 수 없음): world.js 고군산대교의 주탑이 도로 높이를 지나는 곳
  const POSTS = [{ x: 6.11, z: 5.82, r: 0.13 }, { x: 6.93, z: 5.86, r: 0.1 }];
  const blocked = (px, pz) => world.eraOn.bridge && POSTS.some(o => Math.hypot(px - o.x, pz - o.z) < o.r);
  const ground = (px, pz) => { const t = heightAt(px, pz), d = deckAt(px, pz); return d && d.h > t ? d.h : t; };
  function placeName(px, pz) {
    const d = deckAt(px, pz), t = heightAt(px, pz), id = lastId();
    if (d && d.h >= t - 0.01) return d.name;
    if (id === 0) return px < -7.2 && t < 0.36 ? '갯벌' : px > 4.2 ? '군산조선소 부근' : '군산 육지 (내항 마을)';
    return ['', '새만금방조제', '신시도', '선유도', '명사십리 해변', '기도등대 방파제', '장자도', '바위섬'][id] || '';
  }

  // ── 화면 요소: 패널 시작 버튼, 위쪽 안내, 아래쪽 알림줄, 조이스틱
  const start = el('button', 'walk-start', '🚶 걸어서 탐방 <small>육지·방조제·다리·섬을 사람 눈높이로 걸어요</small>'); start.type = 'button';
  document.querySelector('#panel .quiz-entry').after(start);
  const hud = el('div', 'walk-hud', `<div class="wh-top"><b>🚶 걸어서 탐방</b><span class="wh-place"></span>
      <button type="button" class="wh-tour">🧭 자동 탐방</button><button type="button" class="wh-exit">나가기</button></div>
    <p class="wh-help">${touch ? '왼쪽 아래 동그라미로 걷기 · 화면을 끌어 둘러보기'
      : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 걷기 · 화면 클릭 후 마우스로 둘러보기 · <kbd>Shift</kbd> 빨리 · <kbd>E</kbd> 카드 · <kbd>F</kbd> 배 · <kbd>Esc</kbd> 나가기'}</p>
    <p class="wh-tip" hidden></p>`);
  const bar = el('div', 'walk-near', '<span class="wn-text"></span><button type="button" class="wn-card">카드 보기</button><button type="button" class="wn-ferry">⛴️ 배 타기</button><button type="button" class="wn-go">계속 ▶</button>');
  const stick = el('div', 'walk-stick', '<i></i>');
  document.body.append(hud, bar, stick);
  const $ = s => document.querySelector(s), knob = stick.querySelector('i');
  if (touch) stick.classList.add('show');
  function tip(t) { const e = $('.wh-tip'); e.textContent = t; e.hidden = false; tipT = 7; }

  // ── 4단계: 배 (내항 부두 ↔ 선유도 북쪽 바닷가)
  const landNear = (tx, tz) => { let b = null; for (let r = 0; r < 1.6 && !b; r += 0.08) for (let a = 0; a < 6.28 && !b; a += 0.4) { const px = tx + Math.cos(a) * r, pz = tz + Math.sin(a) * r; if (heightAt(px, pz) > 0.05 && heightAt(px, pz) < 0.45) b = { x: px, z: pz }; } return b || { x: tx, z: tz }; };
  const DOCKS = [{ name: '내항 부두', ...landNear(-6.9, coastZ(-6.9) - 0.15) }, { name: '선유도 바닷가', ...landNear(1.7, 4.45) }];
  const SEA_PATH = [[-6.9, coastZ(-6.9) + 0.9], [-4.6, 0.4], [-1.2, 2.2], [1.6, 3.5]];   // 바다 위 길 (내항 → 선유도)
  const boat = new THREE.Group();
  { const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.13), M(0x2f6fb5)); hull.position.y = 0.0; boat.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.012, 0.12), M(0xe9e2d2)); deck.position.y = 0.03; boat.add(deck);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.1), M(0xffffff)); cab.position.set(-0.1, 0.07, 0); boat.add(cab);
    boat.visible = false; root.add(boat); }
  function startFerry(from) {
    const to = 1 - from, pts = [DOCKS[from], ...(from === 0 ? SEA_PATH : [...SEA_PATH].reverse()).map(([px, pz]) => ({ x: px, z: pz })), DOCKS[to]];
    ride = { pts, i: 0, t: 0, to }; boat.visible = true; near = null; showBar();
    tip(world.eraOn.bridge ? '⛴️ 배를 타고 바닷길로 가요. 지금은 다리로도 갈 수 있어요.' : '⛴️ 이 시대에는 다리가 없어서, 섬에 가려면 이렇게 배를 타야 했어요.');
  }
  function updRide(dt) {
    const P = ride.pts, a = P[ride.i], b = P[ride.i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
    ride.t += dt * 0.9 / Math.max(L, 0.01);
    if (ride.t >= 1) { ride.i++; ride.t = 0; if (ride.i >= P.length - 1) { x = b.x; z = b.z; boat.visible = false; const to = DOCKS[ride.to].name; ride = null; tip(`⚓ ${to}에 내렸어요.`); if (tour) { tour.wait = false; tour.i++; } showBar(); return; } }
    const c = ride && P[ride.i], d = ride && P[ride.i + 1], t = ride ? ride.t : 1;
    x = c.x + (d.x - c.x) * t; z = c.z + (d.z - c.z) * t;
    const want = Math.atan2(d.x - c.x, d.z - c.z); yaw += Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)) * Math.min(1, dt * 2.5);
    boat.position.set(x, Math.max(water.sea, heightAt(x, z)) + 0.02, z); boat.rotation.set(0, want - Math.PI / 2, Math.sin(performance.now() / 400) * 0.04);
  }

  // ── 3단계: 자동 탐방 경로 (stop: 멈춰서 카드 보기, ferry: 배 타기)
  const ROUTE_NOW = [
    { x: -5.6, z: coastZ(-5.6) - 0.32, stop: '내항 뜬다리부두' }, { x: -4.4, z: coastZ(-4.4) - 0.42, stop: '구 군산세관' },
    { x: -1.0, z: coastZ(-1.0) - 0.4 }, { x: 3.0, z: coastZ(3.0) - 0.4 }, { x: 6.4, z: -3.55, stop: '군산조선소 골리앗 크레인' },
    { x: 10.55, z: -3.4 }, { x: 10.25, z: 0.0, stop: '새만금방조제' }, { x: 9.78, z: 3.9 }, { x: 9.3, z: 5.35, stop: '신시도' },
    { x: 8.9, z: 5.95 }, { x: 7.3, z: 5.96 }, { x: 6.55, z: 5.97 }, { x: 6.1, z: 5.98 }, { x: 5.7, z: 5.84 }, { x: 5.2, z: 5.74, stop: '고군산대교' }, { x: 1.5, z: 5.55 }, { x: 0.9, z: 5.9, stop: '선유도 망주봉' },
    { x: -2.0, z: 5.15 }, { x: -3.6, z: 4.25, stop: '명사십리 해변' },
  ];
  const ROUTE_PAST = [
    { x: -5.6, z: coastZ(-5.6) - 0.32, stop: '내항 뜬다리부두' }, { x: -4.4, z: coastZ(-4.4) - 0.42, stop: '구 군산세관' },
    { x: DOCKS[0].x, z: DOCKS[0].z, ferry: 0 }, { x: 0.9, z: 5.9, stop: '선유도 망주봉' }, { x: -2.0, z: 5.15 }, { x: -3.6, z: 4.25, stop: '명사십리 해변' },
  ];
  function startTour() {
    const past = !world.eraOn.bridge || !world.eraOn.seawall;
    tour = { route: past ? ROUTE_PAST : ROUTE_NOW, i: 0, wait: false }; learn.closeCard();
    const w = tour.route[0]; x = w.x; z = w.z; y = ground(x, z) + EYE;
    tip(past ? '🧭 자동 탐방 (다리가 없던 시대): 내항에서 배를 타고 선유도로 가요.' : '🧭 자동 탐방: 내항 → 조선소 → 새만금방조제 → 신시도 → 고군산대교 → 선유도 → 명사십리');
    arrive(w);
  }
  function stopTour() { tour = null; showBar(); }
  function arrive(w) {
    if (w.ferry != null) { tour.wait = true; startFerry(w.ferry); return; }
    if (w.stop) {
      tour.wait = true;
      if (labels.find(l => l.name === w.stop)) learn.openByName(w.stop); else learn.closeCard();   // 이름표가 없는 곳(신시도)은 안내만
      if (TIPS[w.stop]) tip(TIPS[w.stop]);
    }
    showBar();
  }
  function nextStop() { if (!tour) return; learn.closeCard(); tour.wait = false; tour.i++; if (tour.i >= tour.route.length) { tip('🎉 자동 탐방을 모두 마쳤어요! 이제 마음껏 걸어 보세요.'); stopTour(); } showBar(); }
  function updTour(dt) {
    if (tour.wait || ride) return null;
    const w = tour.route[tour.i]; if (!w) return null;
    const dx = w.x - x, dz = w.z - z, d = Math.hypot(dx, dz);
    if (d < 0.12) { arrive(w); if (!tour.wait) { tour.i++; if (tour.i >= tour.route.length) stopTour(); } return null; }
    const want = Math.atan2(dx, dz); yaw += Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)) * Math.min(1, dt * 4);
    pitch += (-0.08 - pitch) * Math.min(1, dt * 2);
    return Math.min(1, d / 0.3 + 0.3);
  }

  // ── 아래쪽 알림줄: 가까운 장소 / 배 / 자동 탐방 '계속'
  function showBar() {
    const dock = ride ? -1 : DOCKS.findIndex(dk => Math.hypot(dk.x - x, dk.z - z) < 0.6);
    const waiting = tour && tour.wait && !ride;
    const parts = [];
    if (ride) parts.push('⛴️ 배를 타고 가는 중…');
    else if (waiting) parts.push(`📍 ${tour.route[tour.i].stop || ''}`);
    else if (near) parts.push(`📍 ${near.name} 가까이 왔어요`);
    if (!ride && dock >= 0 && !waiting) parts.push(`⛴️ ${DOCKS[dock].name}`);
    $('.wn-text').textContent = parts.join(' · ');
    $('.wn-card').hidden = !(near && !waiting && !ride);
    $('.wn-ferry').hidden = !(dock >= 0 && !ride && !waiting);
    $('.wn-go').hidden = !waiting;
    bar.classList.toggle('show', !!parts.length);
    bar.dataset.dock = dock;
  }
  function openNear() { if (!near) return; if (document.pointerLockElement) document.exitPointerLock?.(); learn.openByName(near.name); }
  bar.querySelector('.wn-card').onclick = openNear;
  bar.querySelector('.wn-ferry').onclick = () => { const k = +bar.dataset.dock; if (k >= 0) startFerry(k); };
  bar.querySelector('.wn-go').onclick = nextStop;
  hud.querySelector('.wh-tour').onclick = () => (tour ? stopTour() : startTour());

  // ── 바다 막기 + 경사
  const ok = (nx, nz, hNow) => {
    if (Math.abs(nx) > HX - 0.15 || Math.abs(nz) > HZ - 0.15 || blocked(nx, nz)) return false;
    const h = ground(nx, nz);
    if (h < water.sea + 0.005 && h < hNow) return false;          // 바다(물속)로는 못 들어감 (물에서 나오는 쪽은 허용)
    if (h - hNow <= 0.07) return true;                                // 턱(다리 이음매·연석) 정도는 그냥 올라감
    return (h - hNow) / Math.max(1e-4, Math.hypot(nx - x, nz - z)) <= SLOPE;
  };
  function spawn() {   // 내항 창고 앞 부두에서 바다 쪽을 보고 시작
    const sx = -5.6; x = sx; z = coastZ(sx) - 0.32;
    for (let i = 0; i < 40 && heightAt(x, z) < water.sea + 0.01; i++) z -= 0.1;
    y = ground(x, z) + EYE; yaw = 0.25; pitch = -0.06;
  }

  function enter() {
    if (on) return; on = true;
    saved = { fov: camera.fov, near: camera.near, far: camera.far, bg: scene.background, fog: scene.fog };
    camera.fov = 68; camera.near = 0.005; camera.far = 45; camera.clearViewOffset(); camera.updateProjectionMatrix();
    scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(FOG, 5, 28);
    learn.closeCard(); document.body.classList.add('walking'); document.body.classList.remove('panel-open');
    spawn(); place = ''; near = null; keys.clear(); tipped.clear(); tour = null; ride = null; boat.visible = false; $('.wh-tip').hidden = true; showBar();
  }
  function exit() {
    if (!on) return; on = false;
    Object.assign(camera, { fov: saved.fov, near: saved.near, far: saved.far }); camera.updateProjectionMatrix();
    scene.background = saved.bg; scene.fog = saved.fog;
    document.body.classList.remove('walking'); keys.clear(); joy.x = joy.y = 0; tour = null; ride = null; boat.visible = false;
    for (const l of labels) l.far = false;
    bar.classList.remove('show'); learn.closeCard();
    if (document.pointerLockElement) document.exitPointerLock?.();
    window.dispatchEvent(new Event('resize'));   // main.js 가 카메라 화면 맞춤을 다시 계산
  }
  start.onclick = enter;
  hud.querySelector('.wh-exit').onclick = exit;

  // ── 키보드
  const K = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  window.addEventListener('keydown', e => {
    if (!on || e.target.closest?.('input, textarea')) return;
    if (e.code === 'Escape') { if (!document.pointerLockElement) exit(); return; }
    if (e.code === 'KeyE') { openNear(); return; }
    if (e.code === 'KeyF') { const k = +bar.dataset.dock; if (k >= 0 && !ride) startFerry(k); return; }
    if ((e.code === 'Enter' || e.code === 'Space') && tour?.wait && !ride) { e.preventDefault(); nextStop(); return; }
    if (K[e.code]) { keys.add(K[e.code]); e.preventDefault(); if (tour && !ride) stopTour(); }   // 직접 걸으면 자동 탐방은 멈춤
    if (e.key === 'Shift') keys.add('run');
  });
  window.addEventListener('keyup', e => { if (K[e.code]) keys.delete(K[e.code]); if (e.key === 'Shift') keys.delete('run'); });
  window.addEventListener('blur', () => keys.clear());

  // ── 둘러보기: 마우스 잠금(가능하면) 또는 드래그
  const turn = (dx, dy, k) => { yaw -= dx * k; pitch = Math.max(-1.2, Math.min(1.1, pitch - dy * k)); };
  canvas.addEventListener('pointerdown', ev => {
    if (!on) return;
    if (ev.pointerType === 'mouse' && !document.pointerLockElement) { try { const r = canvas.requestPointerLock?.(); r?.catch?.(() => {}); } catch (e) { /* 막힌 곳은 드래그로 */ } }
    if (look.id == null) { look.id = ev.pointerId; look.px = ev.clientX; look.py = ev.clientY; try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ } }
  });
  canvas.addEventListener('pointermove', ev => {
    if (!on) return;
    if (document.pointerLockElement === canvas) { turn(ev.movementX, ev.movementY, 0.0026); return; }
    if (ev.pointerId !== look.id) return;
    turn(ev.clientX - look.px, ev.clientY - look.py, 0.005); look.px = ev.clientX; look.py = ev.clientY;
  });
  const lookEnd = ev => { if (ev.pointerId === look.id) look.id = null; };
  canvas.addEventListener('pointerup', lookEnd); canvas.addEventListener('pointercancel', lookEnd);

  // ── 조이스틱
  const R = 46;
  stick.addEventListener('pointerdown', ev => { joy.id = ev.pointerId; try { stick.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ } moveStick(ev); ev.preventDefault(); if (tour && !ride) stopTour(); });
  stick.addEventListener('pointermove', ev => { if (ev.pointerId === joy.id) moveStick(ev); });
  const stickEnd = ev => { if (ev.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
  function moveStick(ev) {
    const b = stick.getBoundingClientRect(); let dx = ev.clientX - (b.left + b.width / 2), dy = ev.clientY - (b.top + b.height / 2);
    const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; joy.x = dx / R; joy.y = -dy / R;
  }

  // ── 매 프레임
  const P = new THREE.Vector3(), T = new THREE.Vector3();
  function step(f, s, run, dt) {
    const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
    if (m <= 0.05) return;
    const hNow = ground(x, z), sp = SPEED * (run ? RUN : 1) * dt * Math.min(1, m), sy = Math.sin(yaw), cy = Math.cos(yaw);
    const n = Math.hypot(f, s), fx = f / n, sx = s / n;
    const dx = (sy * fx - cy * sx) * sp, dz = (cy * fx + sy * sx) * sp;   // 앞 = (sin yaw, cos yaw), 오른쪽 = (-cos yaw, sin yaw)
    for (const a of [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31]) {    // 막히면 옆으로 틀어 해안선·비탈을 따라 걷기
      const c = Math.cos(a), sn = Math.sin(a), k = 1 - Math.abs(a) * 0.35, ex = (dx * c - dz * sn) * k, ez = (dx * sn + dz * c) * k;
      if (ok(x + ex, z + ez, hNow)) { x += ex; z += ez; break; }
    }
    bob += dt * 9 * Math.min(1, m);
  }
  function update(dt) {
    if (ride) updRide(dt);
    else if (tour) { const f = updTour(dt); if (f) step(f, 0, true, dt); }
    else step((keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0) + joy.y, (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0) + joy.x, keys.has('run'), dt);
    const g = ground(x, z), ty = (ride ? Math.max(water.sea, heightAt(x, z)) + 0.06 : Math.max(g, water.sea - 0.03)) + EYE + (ride ? 0 : Math.sin(bob) * 0.004);
    y += (ty - y) * Math.min(1, dt * 10);
    const cp = Math.cos(pitch);
    P.set(x, y, z).applyMatrix4(root.matrixWorld);
    T.set(x + Math.sin(yaw) * cp, y + Math.sin(pitch), z + Math.cos(yaw) * cp).applyMatrix4(root.matrixWorld);
    if (camera.view?.enabled) { camera.clearViewOffset(); camera.updateProjectionMatrix(); }   // 창 크기가 바뀌면 main.js 가 패널 여백을 다시 넣으므로 매번 확인
    camera.position.copy(P); camera.up.set(0, 1, 0); camera.lookAt(T);

    // 지금 위치 이름 + 처음 온 곳 안내
    const n = ride ? '바다 위 (배)' : placeName(x, z);
    if (n !== place) { place = n; $('.wh-place').textContent = n ? `📍 ${n}` : ''; if (!tour && TIPS[n] && !tipped.has(n)) { tipped.add(n); tip(TIPS[n]); } if (tour && TIPS[n]) tipped.add(n); }
    if (tipT > 0 && (tipT -= dt) <= 0) $('.wh-tip').hidden = true;

    // 가까운 장소 · 먼 이름표 숨기기
    let best = null, bd = NEAR;
    for (const l of labels) {
      const d = Math.hypot(l.pos.x - x, l.pos.z - z); l.far = d > LABEL_FAR;
      if (!l.off && d < bd) { bd = d; best = l; }
    }
    const was = near; near = best; if (was !== near || bar.dataset.dockSeen !== String(DOCKS.findIndex(dk => Math.hypot(dk.x - x, dk.z - z) < 0.6))) { bar.dataset.dockSeen = String(DOCKS.findIndex(dk => Math.hypot(dk.x - x, dk.z - z) < 0.6)); showBar(); }
  }
  // 정해진 곳으로 옮기기 (자동 탐방·시험용)
  function teleport(nx, nz, nyaw = yaw) { x = nx; z = nz; yaw = nyaw; y = ground(x, z) + EYE; }
  return { enter, exit, update, teleport, startTour, stopTour, nextStop, startFerry, ground, docks: DOCKS,
    get on() { return on; }, get touring() { return tour ? { i: tour.i, wait: tour.wait, n: tour.route.length } : null; }, get riding() { return !!ride; },
    get pos() { return { x, z, y, yaw, place, near: near?.name || null }; } };
}
