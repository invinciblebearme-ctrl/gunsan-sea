// multi.js — 👥 함께 걷기: 같은 방 코드로 들어온 친구들이 서로 보이게 (걸어서 탐방 안에서)
//  · 별명만 씀(최대 8자), 위치는 서버에 저장하지 않음, 방은 모두 나가면 사라짐 (server/src/index.js)
//  · 내 위치를 1초에 8번까지 보내고, 친구 캐릭터는 부드럽게 따라 움직임
import * as THREE from 'three';
import { MP_SERVER } from './net-config.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const EYE = 0.075, SEND_HZ = 8;

function nameTag(text, color) {   // 머리 위 별명표 (캔버스 글자 → 스프라이트)
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 256; c.height = 72;
  g.font = '600 34px "Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const w = Math.min(244, g.measureText(text).width + 36);
  g.fillStyle = 'rgba(255,253,249,.94)'; g.beginPath(); g.roundRect((256 - w) / 2, 8, w, 54, 27); g.fill();
  g.lineWidth = 5; g.strokeStyle = color; g.stroke();
  g.fillStyle = '#2b2622'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 37);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false }));
  s.scale.set(0.16, 0.045, 1); s.position.y = 0.12; s.renderOrder = 5; return s;
}
function avatar(name, color) {   // 젤리 색 작은 사람: 몸통 + 머리 + 눈 + 별명표
  const g = new THREE.Group(), M = new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: 0.15 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.03, 4, 10), M); body.position.y = 0.032; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 10), M); head.position.y = 0.075; head.castShadow = true; g.add(head);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x2b2622 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 6, 5), eyeM); e.position.set(s * 0.007, 0.078, 0.015); g.add(e); }
  g.add(nameTag(name, color)); return g;
}

export function setupMulti({ walk, root }) {
  const qs = new URLSearchParams(location.search), server = (qs.get('mp') || MP_SERVER || '').replace(/\/+$/, '');
  let ws = null, me = null, room = '', nick = '', peers = new Map(), sendT = 0, lastSent = null, hbT = 0, retry = 0, wantOpen = false, closedByMe = false;

  // 걸어서 탐방 위쪽 안내줄에 버튼 + 방 상자
  const btn = el('button', 'wh-mp', '👥 함께 걷기'); btn.type = 'button';
  const top = document.querySelector('.walk-hud .wh-top'); top.insertBefore(btn, top.querySelector('.wh-tour'));
  const box = el('div', 'mp-box', `<b>👥 함께 걷기</b>
    <p class="mp-lead">같은 <b>방 코드</b>를 넣은 친구들끼리 서로 보여요. 이름 대신 <b>별명</b>을 써요.</p>
    <label>방 코드 <input class="mp-room" inputmode="numeric" maxlength="6" placeholder="예: 4827" autocomplete="off"></label>
    <label>별명 <input class="mp-nick" maxlength="8" placeholder="예: 바다3" autocomplete="off"></label>
    <div class="mp-btns"><button type="button" class="mp-new">새 방 만들기</button><button type="button" class="mp-join">들어가기</button><button type="button" class="mp-close">닫기</button></div>
    <p class="mp-msg" aria-live="polite"></p>`);
  const chip = el('div', 'mp-chip', '<span class="mp-info"></span><button type="button" class="mp-leave">방 나가기</button>');
  document.querySelector('.walk-hud').append(box, chip);
  const q = s => box.querySelector(s), msg = t => { q('.mp-msg').textContent = t; };
  try { const s = JSON.parse(localStorage.getItem('gunsan-jelly-mp') || '{}'); q('.mp-room').value = s.room || ''; q('.mp-nick').value = s.nick || ''; } catch (e) { /* 무시 */ }

  btn.onclick = () => {
    if (document.pointerLockElement) document.exitPointerLock?.();
    box.classList.toggle('show'); if (box.classList.contains('show')) (q('.mp-room').value ? q('.mp-nick') : q('.mp-room')).focus();
    msg(server ? '' : '아직 함께 걷기 서버가 연결되지 않았어요. 선생님이 서버를 연결하면 쓸 수 있어요.');
  };
  q('.mp-close').onclick = () => box.classList.remove('show');
  q('.mp-new').onclick = () => { q('.mp-room').value = String(1000 + Math.floor(Math.random() * 9000)); msg('새 방 코드를 만들었어요. 친구들에게 알려 주고 들어가기를 누르세요.'); };
  q('.mp-join').onclick = () => {
    const r = q('.mp-room').value.trim(), n = q('.mp-nick').value.trim();
    if (!/^\d{4,6}$/.test(r)) return msg('방 코드는 숫자 4~6자리예요.');
    if (!n) return msg('별명을 써 주세요. (실제 이름은 쓰지 않아요)');
    if (!server) return msg('아직 함께 걷기 서버가 연결되지 않았어요.');
    try { localStorage.setItem('gunsan-jelly-mp', JSON.stringify({ room: r, nick: n })); } catch (e) { /* 무시 */ }
    room = r; nick = n; retry = 0; wantOpen = true; connect();
  };
  chip.querySelector('.mp-leave').onclick = () => leave();

  function connect() {
    closedByMe = false; msg('연결하는 중…');
    try { ws = new WebSocket(`${server}/room/${room}?name=${encodeURIComponent(nick)}`); }
    catch (e) { msg('이 화면에서는 함께 걷기를 쓸 수 없어요. 실제 사이트에서 써 주세요.'); wantOpen = false; return; }
    ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (err) { return; } on(d); };
    ws.onclose = () => {
      const was = !!me; me = null; clearPeers(); render();
      if (closedByMe || !wantOpen) return;
      if (retry < 3) { retry++; msg(`연결이 끊겼어요. 다시 연결하는 중… (${retry}/3)`); setTimeout(() => wantOpen && connect(), 1000 * retry); }
      else { wantOpen = false; box.classList.add('show'); msg(was ? '연결이 끊겼어요. 들어가기를 다시 눌러 주세요.' : '서버에 연결하지 못했어요. 인터넷이나 학교망 설정을 확인해 주세요.'); }
    };
  }
  function on(d) {
    if (d.t === 'welcome') { me = d.id; retry = 0; lastSent = null; box.classList.remove('show'); msg(''); for (const p of d.peers) upsert(p, true); render(); }
    else if (d.t === 'join') { upsert(d, false); render(`👋 ${d.name} 님이 들어왔어요`); }
    else if (d.t === 'pos') upsert(d, !peers.get(d.id)?.seen);
    else if (d.t === 'leave') { const p = peers.get(d.id); if (p) { root.remove(p.g); peers.delete(d.id); render(`${p.name} 님이 나갔어요`); } }
    else if (d.t === 'full') { wantOpen = false; box.classList.add('show'); msg('방이 꽉 찼어요 (최대 40명). 다른 방 코드를 써 주세요.'); }
  }
  function upsert(d, snap) {
    let p = peers.get(d.id);
    if (!p) { p = { name: d.name, color: d.color, g: avatar(d.name, d.color), x: 0, z: 0, y: 0, yaw: 0, tx: 0, tz: 0, ty: 0, tyaw: 0, seen: false }; p.g.visible = false; root.add(p.g); peers.set(d.id, p); }
    if (typeof d.x === 'number') {
      p.tx = d.x; p.tz = d.z; p.ty = d.y - EYE; p.tyaw = d.yaw;
      if (snap || !p.seen) { p.x = p.tx; p.z = p.tz; p.y = p.ty; p.yaw = p.tyaw; }
      p.seen = true; p.g.visible = true;
    }
  }
  function clearPeers() { for (const p of peers.values()) root.remove(p.g); peers.clear(); }
  let noteT = 0, note = '';
  function render(n) {
    if (n) { note = n; noteT = 4; }
    chip.classList.toggle('show', !!me);
    btn.classList.toggle('on', !!me);
    chip.querySelector('.mp-info').textContent = me ? `👥 방 ${room} · ${nick} · 모두 ${peers.size + 1}명${noteT > 0 ? ` · ${note}` : ''}` : '';
  }
  function leave() { wantOpen = false; closedByMe = true; try { ws?.close(1000, 'leave'); } catch (e) { /* 무시 */ } ws = null; me = null; clearPeers(); render(); }

  // 매 프레임 (main.js 가 부름): 내 위치 보내기 + 친구 캐릭터 부드럽게 움직이기
  function update(dt) {
    if (!walk.on) { if (wantOpen || me) leave(); box.classList.remove('show'); return; }
    if (noteT > 0 && (noteT -= dt) <= 0) render();
    if (me && ws?.readyState === 1) {
      sendT -= dt; hbT -= dt; const q2 = walk.pos;
      const moved = !lastSent || Math.hypot(q2.x - lastSent.x, q2.z - lastSent.z) > 0.004 || Math.abs(q2.y - lastSent.y) > 0.004 || Math.abs(q2.yaw - lastSent.yaw) > 0.03;
      if (sendT <= 0 && (moved || hbT <= 0)) {
        ws.send(JSON.stringify({ t: 'pos', x: q2.x, z: q2.z, y: q2.y, yaw: q2.yaw })); lastSent = { x: q2.x, z: q2.z, y: q2.y, yaw: q2.yaw }; sendT = 1 / SEND_HZ; hbT = 2;
      }
    }
    const k = 1 - Math.exp(-dt * 10);
    for (const p of peers.values()) {
      if (!p.seen) continue;
      p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; p.y += (p.ty - p.y) * k;
      p.yaw += Math.atan2(Math.sin(p.tyaw - p.yaw), Math.cos(p.tyaw - p.yaw)) * k;
      p.g.position.set(p.x, p.y, p.z); p.g.rotation.y = p.yaw;
    }
  }
  return { update, leave, get connected() { return !!me; }, get count() { return me ? peers.size + 1 : 0; }, get peers() { return [...peers.values()].map(p => ({ name: p.name, x: p.x, z: p.z })); } };
}
