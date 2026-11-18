// Gunsan Jelly 함께 걷기 서버 — Cloudflare Worker + Durable Object (방 코드마다 방 하나)
//
//  접속: wss://<이 Worker 주소>/room/<방 코드 4~6자리 숫자>?name=<별명>
//  주고받는 말(JSON):
//    서버 → 나   {t:'welcome', id, color, peers:[{id,name,color,x,z,y,yaw}]}
//    서버 → 모두 {t:'join', id,name,color} · {t:'pos', id,x,z,y,yaw} · {t:'leave', id} · {t:'full'}
//    나 → 서버   {t:'pos', x,z,y,yaw}
//
//  개인정보: 별명만 받고(최대 8자) 위치는 저장하지 않음. 모두 나가면 방은 저절로 사라짐.
//  보호: 방 인원 최대 40명, 메시지 크기 400바이트, 위치는 초당 15번까지만 받음.

const MAX_PEERS = 40, MAX_MSG = 400, MAX_RATE = 15;
const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#a9e34b'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('Gunsan Jelly 함께 걷기 서버가 동작 중이에요.', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    const m = url.pathname.match(/^\/room\/(\d{4,6})$/);
    if (!m) return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket 연결만 받아요.', { status: 426 });
    const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
    return stub.fetch(request);
  },
};

// 별명 정리: 글자·숫자·공백·일부 기호만, 최대 8자
const cleanName = s => (String(s || '').normalize('NFC').replace(/[^\p{L}\p{N} _\-]/gu, '').trim().slice(0, 8) || '친구');
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0);

export class Room {
  constructor(state) { this.state = state; }

  peers() { return this.state.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() })).filter(p => p.a); }

  async fetch(request) {
    const url = new URL(request.url), [client, server] = Object.values(new WebSocketPair());
    const others = this.peers();
    this.state.acceptWebSocket(server);
    if (others.length >= MAX_PEERS) { server.send(JSON.stringify({ t: 'full' })); server.close(1008, 'room full'); return new Response(null, { status: 101, webSocket: client }); }
    const used = new Set(others.map(p => p.a.color));
    const id = crypto.randomUUID().slice(0, 8), name = cleanName(url.searchParams.get('name'));
    const color = COLORS.find(c => !used.has(c)) || COLORS[others.length % COLORS.length];
    const a = { id, name, color, x: 0, z: 0, y: 0, yaw: 0, has: false, win: 0, n: 0 };
    server.serializeAttachment(a);
    server.send(JSON.stringify({ t: 'welcome', id, color, peers: others.filter(p => p.a.has).map(p => pub(p.a)) }));
    this.broadcast({ t: 'join', id, name, color }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    const a = ws.deserializeAttachment(); if (!a) return;
    const now = Date.now(); if (now - a.win > 1000) { a.win = now; a.n = 0; }
    if (++a.n > MAX_RATE) { ws.serializeAttachment(a); return; }   // 너무 자주 보내면 무시
    let d; try { d = JSON.parse(msg); } catch (e) { return; }
    if (d.t === 'pos') {
      a.x = num(d.x, -20, 20); a.z = num(d.z, -20, 20); a.y = num(d.y, -5, 10); a.yaw = num(d.yaw, -1e3, 1e3); a.has = true;
      ws.serializeAttachment(a);
      this.broadcast({ t: 'pos', ...pub(a) }, ws);
    }
  }

  async webSocketClose(ws) { this.leave(ws); }
  async webSocketError(ws) { this.leave(ws); }
  leave(ws) {
    const a = ws.deserializeAttachment(); if (!a || a.gone) return;
    a.gone = true; ws.serializeAttachment(a);
    try { ws.close(1000, 'bye'); } catch (e) { /* 이미 닫힘 */ }
    this.broadcast({ t: 'leave', id: a.id }, ws);
  }

  broadcast(obj, except) {
    const s = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      if (ws === except) continue; const a = ws.deserializeAttachment(); if (!a || a.gone) continue;
      try { ws.send(s); } catch (e) { /* 끊긴 연결은 close 에서 정리 */ }
    }
  }
}
const pub = a => ({ id: a.id, name: a.name, color: a.color, x: +a.x.toFixed(3), z: +a.z.toFixed(3), y: +a.y.toFixed(3), yaw: +a.yaw.toFixed(3) });
