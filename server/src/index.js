// Gunsan Jelly 함께 걷기 서버 — Cloudflare Worker + Durable Object
//
//  · 방 코드는 하나로 고정 (기본 7703, 환경 변수 ROOM_CODE 로 바꿀 수 있음)
//  · 방은 선생님만 열 수 있음: 선생님 비밀번호는 Worker 비밀값 TEACHER_KEY 에만 둠
//      (설정: server 폴더에서  npx wrangler secret put TEACHER_KEY)
//  · 열린 방은 선생님이 닫거나 3시간이 지나면 닫힘 → 들어와 있던 학생도 모두 나가게 됨
//
//  접속: wss://<이 Worker 주소>/room/7703?name=<별명>&model=<boy|girl>[&role=teacher]
//  주고받는 말(JSON):
//    나 → 서버   {t:'auth', key}(선생님만, 접속 직후) · {t:'pos', x,z,y,yaw} · {t:'close'}(선생님만)
//    서버 → 나   {t:'welcome', id, color, teacher, openUntil, peers:[…]} · {t:'closed'} · {t:'badkey'} · {t:'locked'} · {t:'nokey'} · {t:'full'}
//    서버 → 모두 {t:'join', id,name,color,teacher} · {t:'pos', …} · {t:'leave', id}
//
//  개인정보: 별명만 받고(최대 8자) 위치는 저장하지 않음. 저장하는 것은 '방이 언제까지 열려 있는지' 시각 하나뿐.
//  보호: 방 인원 최대 40명, 메시지 400바이트, 위치는 초당 15번까지, 비밀번호 5번 틀리면 1분 잠금.

const MAX_PEERS = 40, MAX_MSG = 400, MAX_RATE = 15, OPEN_MS = 3 * 60 * 60 * 1000, LOCK_FAILS = 5, LOCK_MS = 60 * 1000;
const COLORS = ['#ff6b6b', '#ffa94d', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#a9e34b', '#63e6be'];
const TEACHER_COLOR = '#f2b705';

export default {
  async fetch(request, env) {
    const url = new URL(request.url), code = String(env.ROOM_CODE || '7703');
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('Gunsan Jelly 함께 걷기 서버가 동작 중이에요.', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    const m = url.pathname.match(/^\/room\/(\d{4,6})$/);
    if (!m || m[1] !== code) return new Response('Not found', { status: 404 });   // 정해진 방 코드만
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket 연결만 받아요.', { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
};

const cleanName = s => (String(s || '').normalize('NFC').replace(/[^\p{L}\p{N} _\-]/gu, '').trim().slice(0, 8) || '친구');
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0);
// 비밀번호 비교 (글자 수·내용과 상관없이 같은 시간이 걸리게)
async function sameKey(a, b) {
  const enc = new TextEncoder(), [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(String(a))), crypto.subtle.digest('SHA-256', enc.encode(String(b)))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0;
}

export class Room {
  constructor(state, env) { this.state = state; this.env = env; this.fails = 0; this.lockUntil = 0; }

  peers() { return this.state.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() })).filter(p => p.a && !p.a.gone); }
  async openUntil() { const t = (await this.state.storage.get('openUntil')) || 0; return t > Date.now() ? t : 0; }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (e) { /* 끊긴 연결 */ } }
  bye(ws, o, why) { this.send(ws, o); try { ws.close(1000, why); } catch (e) { /* 이미 닫힘 */ } }

  async fetch(request) {
    const url = new URL(request.url), [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    const teacher = url.searchParams.get('role') === 'teacher';
    const model = url.searchParams.get('model') === 'girl' ? 'girl' : 'boy';   // 고른 캐릭터 (남학생·여학생)
    const a = { id: crypto.randomUUID().slice(0, 8), name: teacher ? '선생님' : cleanName(url.searchParams.get('name')), color: '', teacher, model, ok: false,
      x: 0, z: 0, y: 0, yaw: 0, has: false, win: 0, n: 0 };
    server.serializeAttachment(a);
    if (!teacher) {   // 학생: 방이 열려 있을 때만 들어올 수 있음
      if (!(await this.openUntil())) { this.bye(server, { t: 'closed' }, 'room closed'); return new Response(null, { status: 101, webSocket: client }); }
      await this.admit(server, a);
    }
    // 선생님: 접속 직후 {t:'auth', key} 를 보내야 들어옴 (주소에 비밀번호를 넣지 않음)
    return new Response(null, { status: 101, webSocket: client });
  }

  async admit(ws, a) {
    const others = this.peers().filter(p => p.ws !== ws && p.a.ok);
    if (others.length >= MAX_PEERS) { this.bye(ws, { t: 'full' }, 'room full'); return; }
    const used = new Set(others.map(p => p.a.color));
    a.color = a.teacher ? TEACHER_COLOR : (COLORS.find(c => !used.has(c)) || COLORS[others.length % COLORS.length]);
    a.ok = true; ws.serializeAttachment(a);
    this.send(ws, { t: 'welcome', id: a.id, color: a.color, teacher: a.teacher, openUntil: await this.openUntil(), peers: others.filter(p => p.a.has).map(p => pub(p.a)) });
    this.broadcast({ t: 'join', id: a.id, name: a.name, color: a.color, teacher: a.teacher, model: a.model }, ws);
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    const a = ws.deserializeAttachment(); if (!a || a.gone) return;
    const now = Date.now(); if (now - a.win > 1000) { a.win = now; a.n = 0; }
    if (++a.n > MAX_RATE) { ws.serializeAttachment(a); return; }   // 너무 자주 보내면 무시
    ws.serializeAttachment(a);
    let d; try { d = JSON.parse(msg); } catch (e) { return; }

    if (d.t === 'auth' && a.teacher && !a.ok) {
      if (!this.env.TEACHER_KEY) return this.bye(ws, { t: 'nokey' }, 'no teacher key');
      if (now < this.lockUntil) return this.bye(ws, { t: 'locked' }, 'locked');
      if (!(await sameKey(String(d.key || '').normalize('NFC').trim(), String(this.env.TEACHER_KEY).normalize('NFC').trim()))) {   // 앞뒤 빈칸은 무시
        if (++this.fails >= LOCK_FAILS) { this.fails = 0; this.lockUntil = now + LOCK_MS; }
        return this.bye(ws, { t: 'badkey' }, 'bad key');
      }
      this.fails = 0;
      await this.state.storage.put('openUntil', now + OPEN_MS);   // 방 열기 (3시간)
      return this.admit(ws, a);
    }
    if (!a.ok) return;
    if (d.t === 'close' && a.teacher) {   // 방 닫기 → 모두 나가게
      await this.state.storage.delete('openUntil');
      for (const p of this.peers()) { p.a.gone = true; p.ws.serializeAttachment(p.a); this.bye(p.ws, { t: 'closed', by: 'teacher' }, 'closed by teacher'); }
      return;
    }
    if (d.t === 'pos') {
      if (!(await this.openUntil())) {   // 3시간이 지나 방이 닫힘
        for (const p of this.peers()) { p.a.gone = true; p.ws.serializeAttachment(p.a); this.bye(p.ws, { t: 'closed', by: 'time' }, 'expired'); }
        return;
      }
      a.x = num(d.x, -20, 20); a.z = num(d.z, -20, 20); a.y = num(d.y, -5, 10); a.yaw = num(d.yaw, -1e3, 1e3); a.has = true;
      ws.serializeAttachment(a);
      this.broadcast({ t: 'pos', ...pub(a) }, ws);
    }
  }

  async webSocketClose(ws) { this.leave(ws); }
  async webSocketError(ws) { this.leave(ws); }
  leave(ws) {
    const a = ws.deserializeAttachment(); if (!a || a.gone) return;
    const was = a.ok; a.gone = true; ws.serializeAttachment(a);
    try { ws.close(1000, 'bye'); } catch (e) { /* 이미 닫힘 */ }
    if (was) this.broadcast({ t: 'leave', id: a.id }, ws);
  }

  broadcast(obj, except) {
    const s = JSON.stringify(obj);
    for (const p of this.peers()) { if (p.ws === except || !p.a.ok) continue; try { p.ws.send(s); } catch (e) { /* close 에서 정리 */ } }
  }
}
const pub = a => ({ id: a.id, name: a.name, color: a.color, teacher: a.teacher, model: a.model, x: +a.x.toFixed(3), z: +a.z.toFixed(3), y: +a.y.toFixed(3), yaw: +a.yaw.toFixed(3) });
