// walk.js — 🚶 걸어서 탐방 (시험판 1단계): 사람 눈높이로 땅 위를 걷기
//  · 땅 높이(heightAt)를 따라 걷고, 바다에는 들어가지 못함 (방조제는 지형이라 걸어서 건널 수 있음)
//  · 컴퓨터: W A S D / 방향키 걷기, 화면 클릭 후 마우스로 둘러보기(안 되면 드래그), Shift 빨리, Esc 나가기
//  · 휴대폰: 왼쪽 아래 조이스틱으로 걷기, 화면 드래그로 둘러보기
import * as THREE from 'three';
import { heightAt, lastId, coastZ, HX, HZ } from './terrain.js';

const EYE = 0.075;           // 눈높이 (집 높이 0.15~0.27 기준으로 사람 크기)
const SPEED = 0.55, RUN = 2; // 걷는 속도(블록 단위/초), Shift 배수
const SLOPE = 1.6;           // 오를 수 있는 가장 가파른 경사 (높이/거리)
const SKY = 0xbfe2f5, FOG = 0xd3eaf6;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// 지금 서 있는 곳 이름 (terrain.js 의 지형 id)
function placeName(x, z, h) {
  heightAt(x, z); const id = lastId();
  if (id === 0) return x < -7.2 && h < 0.36 ? '갯벌' : x > 4.2 ? '군산조선소 부근' : '군산 육지 (내항 마을)';
  return ['', '새만금방조제', '신시도', '선유도', '명사십리 해변', '기도등대 방파제', '장자도', '바위섬'][id] || '';
}

export function setupWalk({ camera, scene, root, canvas, water, learn }) {
  let on = false, yaw = 0, pitch = -0.05, x = 0, z = 0, y = 0, bob = 0, saved = null, place = '';
  const keys = new Set(), joy = { x: 0, y: 0, id: null }, look = { id: null, px: 0, py: 0 };
  const touch = matchMedia('(pointer: coarse)').matches;

  // 패널: 퀴즈 버튼 아래 시작 버튼
  const start = el('button', 'walk-start', '🚶 걸어서 탐방 <small>시험판 · 육지·방조제·섬을 사람 눈높이로 걸어요</small>'); start.type = 'button';
  document.querySelector('#panel .quiz-entry').after(start);

  // 걷는 중 화면 안내 + 조이스틱
  const hud = el('div', 'walk-hud', `<div class="wh-top"><b>🚶 걸어서 탐방</b><span class="wh-place"></span><button type="button" class="wh-exit">나가기</button></div>
    <p class="wh-help">${touch ? '왼쪽 아래 동그라미로 걷기 · 화면을 끌어 둘러보기'
      : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 걷기 · 화면을 클릭하면 마우스로 둘러보기 · <kbd>Shift</kbd> 빨리 · <kbd>Esc</kbd> 나가기'}</p>`);
  const stick = el('div', 'walk-stick', '<i></i>');
  document.body.append(hud, stick);
  const knob = stick.querySelector('i');
  if (touch) stick.classList.add('show');   // 터치 기기(태블릿 포함)는 조이스틱 표시

  const ok = (nx, nz, hNow) => {
    if (Math.abs(nx) > HX - 0.15 || Math.abs(nz) > HZ - 0.15) return false;
    const h = heightAt(nx, nz);
    if (h < water.sea + 0.005 && h < hNow) return false;          // 바다(물속)로는 못 들어감 (물에서 나오는 쪽은 허용)
    return (h - hNow) / Math.max(1e-4, Math.hypot(nx - x, nz - z)) <= SLOPE;   // 너무 가파른 비탈은 못 오름
  };
  function spawn() {   // 내항 창고 앞 부두(창고와 바다 사이 빈터)에서 바다 쪽을 보고 시작
    const sx = -5.6; x = sx; z = coastZ(sx) - 0.32;
    for (let i = 0; i < 40 && heightAt(x, z) < water.sea + 0.01; i++) z -= 0.1;
    y = heightAt(x, z) + EYE; yaw = 0.25; pitch = -0.06;
  }

  function enter() {
    if (on) return; on = true;
    saved = { fov: camera.fov, near: camera.near, far: camera.far, bg: scene.background, fog: scene.fog };
    camera.fov = 68; camera.near = 0.005; camera.far = 45; camera.clearViewOffset(); camera.updateProjectionMatrix();
    scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(FOG, 5, 28);
    learn.closeCard(); document.body.classList.add('walking'); document.body.classList.remove('panel-open');
    spawn(); place = ''; keys.clear();
  }
  function exit() {
    if (!on) return; on = false;
    Object.assign(camera, { fov: saved.fov, near: saved.near, far: saved.far }); camera.updateProjectionMatrix();
    scene.background = saved.bg; scene.fog = saved.fog;
    document.body.classList.remove('walking'); keys.clear(); joy.x = joy.y = 0;
    if (document.pointerLockElement) document.exitPointerLock?.();
    window.dispatchEvent(new Event('resize'));   // main.js 가 카메라 화면 맞춤을 다시 계산
  }
  start.onclick = enter;
  hud.querySelector('.wh-exit').onclick = exit;

  // 키보드
  const K = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  window.addEventListener('keydown', e => {
    if (!on || e.target.closest?.('input, textarea')) return;
    if (e.code === 'Escape') { if (!document.pointerLockElement) exit(); return; }
    if (K[e.code]) { keys.add(K[e.code]); e.preventDefault(); }
    if (e.key === 'Shift') keys.add('run');
  });
  window.addEventListener('keyup', e => { if (K[e.code]) keys.delete(K[e.code]); if (e.key === 'Shift') keys.delete('run'); });
  window.addEventListener('blur', () => keys.clear());

  // 둘러보기: 마우스 잠금(가능하면) 또는 드래그
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

  // 조이스틱 (휴대폰)
  const R = 46;
  stick.addEventListener('pointerdown', ev => { joy.id = ev.pointerId; try { stick.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ } moveStick(ev); ev.preventDefault(); });
  stick.addEventListener('pointermove', ev => { if (ev.pointerId === joy.id) moveStick(ev); });
  const stickEnd = ev => { if (ev.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
  function moveStick(ev) {
    const b = stick.getBoundingClientRect(); let dx = ev.clientX - (b.left + b.width / 2), dy = ev.clientY - (b.top + b.height / 2);
    const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; joy.x = dx / R; joy.y = -dy / R;
  }

  const P = new THREE.Vector3(), T = new THREE.Vector3();
  function update(dt) {
    let f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0) + joy.y, s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0) + joy.x;
    const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
    const hNow = heightAt(x, z);
    if (m > 0.05) {
      const sp = SPEED * (keys.has('run') ? RUN : 1) * dt, sy = Math.sin(yaw), cy = Math.cos(yaw);
      const dx = (sy * f - cy * s) * sp, dz = (cy * f + sy * s) * sp;   // 앞 = (sin yaw, cos yaw), 오른쪽 = (-cos yaw, sin yaw)
      // 막히면 조금씩 옆 방향(±25°, ±50°, ±75°)으로 틀어 해안선·비탈을 따라 미끄러지듯 걷기
      for (const a of [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31]) {
        const c = Math.cos(a), sn = Math.sin(a), k = 1 - Math.abs(a) * 0.35, ex = (dx * c - dz * sn) * k, ez = (dx * sn + dz * c) * k;
        if (ok(x + ex, z + ez, hNow)) { x += ex; z += ez; break; }
      }
      bob += dt * 9 * Math.min(1, m);
    }
    const h = heightAt(x, z), ty = Math.max(h, water.sea - 0.03) + EYE + Math.sin(bob) * 0.004;
    y += (ty - y) * Math.min(1, dt * 12);
    const cp = Math.cos(pitch);
    P.set(x, y, z).applyMatrix4(root.matrixWorld);
    T.set(x + Math.sin(yaw) * cp, y + Math.sin(pitch), z + Math.cos(yaw) * cp).applyMatrix4(root.matrixWorld);
    if (camera.view?.enabled) { camera.clearViewOffset(); camera.updateProjectionMatrix(); }   // 창 크기가 바뀌면 main.js 가 패널 여백을 다시 넣으므로 매번 확인
    camera.position.copy(P); camera.up.set(0, 1, 0); camera.lookAt(T);
    const n = placeName(x, z, h); if (n !== place) { place = n; hud.querySelector('.wh-place').textContent = n ? `📍 ${n}` : ''; }
  }
  // 정해진 곳으로 옮기기 (자동 탐방·시험용)
  function teleport(nx, nz, nyaw = yaw) { x = nx; z = nz; yaw = nyaw; y = heightAt(x, z) + EYE; }
  return { enter, exit, update, teleport, get on() { return on; }, get pos() { return { x, z, y, yaw, place }; } };
}
