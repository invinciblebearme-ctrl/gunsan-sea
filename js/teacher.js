// teacher.js — ⑦ 교사용 기능: 발표 모드(장소별 카메라 이동 + 큰 카드) · 간단 화면(저학년용)
const KEY = 'gunsan-jelly-teacher-v1';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function setupTeacher({ labels, learn, focus, overview }) {
  let save = { simple: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* 무시 */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 무시 */ } };

  // 패널 맨 아래: 교사용 칸
  const sec = el('div', 'sec teacher', `<h2>교사용</h2>
    <div class="tc-row"><button type="button" class="tc-present">🎓 발표 모드</button><button type="button" class="tc-simple" aria-pressed="false">간단 화면</button></div>
    <p class="tc-note">발표 모드: 장소 버튼이나 ←/→ 키로 한 곳씩 설명해요. Esc로 끝내요.<br>간단 화면: 저학년용. 젤리 맛·탱탱함·파도·바람 조절을 숨겨요.</p>`);
  document.querySelector('#panel .row5').after(sec);
  const bSimple = sec.querySelector('.tc-simple');
  function setSimple(on) {
    save.simple = on; persist(); document.body.classList.toggle('simple', on);
    bSimple.classList.toggle('on', on); bSimple.setAttribute('aria-pressed', on); bSimple.textContent = on ? '간단 화면 켜짐' : '간단 화면';
  }
  bSimple.onclick = () => setSimple(!save.simple);

  // 발표 모드: 아래쪽 장소 줄
  const bar = el('nav', 'present-bar', `<button type="button" class="pb-prev" aria-label="이전 장소">◀</button><div class="pb-list"></div>
    <button type="button" class="pb-next" aria-label="다음 장소">▶</button><button type="button" class="pb-end">발표 끝</button>`);
  bar.setAttribute('aria-label', '발표 모드 장소 이동'); document.body.appendChild(bar);
  const list = bar.querySelector('.pb-list');
  const stops = [{ name: '전체 보기', all: true }, ...labels];
  let idx = 0, on = false;
  function drawList() {
    list.innerHTML = stops.map((s, i) => `<button type="button" data-i="${i}" class="${i === idx ? 'on' : ''}" ${s.off ? 'disabled' : ''}>${i ? s.el.textContent : s.name}</button>`).join('');
    list.querySelectorAll('[data-i]').forEach(b => b.onclick = () => go(+b.dataset.i));
  }
  function go(i) {
    const n = stops.length; let k = ((i % n) + n) % n, guard = 0;
    const dir = i < idx ? -1 : 1;
    while (stops[k].off && guard++ < n) k = (((k + dir) % n) + n) % n;   // 그 시대에 없는 장소는 건너뜀
    idx = k; const s = stops[k];
    if (s.all) { learn.closeCard(); overview(); } else { focus(s.pos); learn.openByName(s.name); }
    drawList(); list.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  function start() { on = true; document.body.classList.add('present'); document.body.classList.remove('panel-open'); idx = 0; go(0); }
  function end() { on = false; document.body.classList.remove('present'); learn.closeCard(); overview(); }
  sec.querySelector('.tc-present').onclick = start;
  bar.querySelector('.pb-prev').onclick = () => go(idx - 1);
  bar.querySelector('.pb-next').onclick = () => go(idx + 1);
  bar.querySelector('.pb-end').onclick = end;
  window.addEventListener('keydown', e => {
    if (!on || e.target.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Escape') end();
  });
  // 장소 이름이 언어에 따라 바뀌므로 줄을 가끔 새로 그림
  document.querySelector('.lang-seg')?.addEventListener('click', () => on && setTimeout(drawList, 0));
  document.querySelectorAll('[data-era]').forEach(b => b.addEventListener('click', () => on && setTimeout(drawList, 0)));

  setSimple(!!save.simple);
  return { start, end, setSimple, get presenting() { return on; } };
}
