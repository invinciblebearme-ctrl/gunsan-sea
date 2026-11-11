// record.js — ⑧ 나의 학습 기록: 미션·퀴즈·둘러본 장소를 한 장으로 정리해 복사하거나 인쇄
import { MISSIONS, QUIZ_ROUND } from './places.js';

const KEY = 'gunsan-jelly-record-v1';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function setupRecord({ labels }) {
  let draft = read(KEY, { name: '', note: '' });
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch (e) { /* 무시 */ } };

  // 패널: 미션 판 아래
  const btn = el('button', 'record-open', '📝 나의 학습 기록'); btn.type = 'button';
  document.querySelector('#panel .missions').appendChild(btn);

  const box = el('section', 'quiz record', `<button type="button" class="pc-x" aria-label="닫기">✕</button>
    <div class="rc-sheet">
      <h3>📝 군산 바다 탐험 학습 기록</h3>
      <div class="rc-who"><label>이름 <input type="text" class="rc-name" maxlength="20" placeholder="이름을 써요"></label><span class="rc-date"></span></div>
      <div class="rc-stats"></div>
      <ul class="rc-missions"></ul>
      <label class="rc-note-l">오늘 알게 된 것 한 가지 <small>(자연환경이나 인문환경 중 하나를 골라 써 보세요)</small>
        <textarea class="rc-note" rows="3" maxlength="300" placeholder="예) 군산 앞바다는 밀물과 썰물 차이가 커서 뜬다리부두를 만들었다."></textarea></label>
    </div>
    <div class="qz-btns"><button type="button" class="rc-copy">📋 복사하기</button><button type="button" class="rc-print">🖨️ 인쇄하기</button></div>
    <p class="rc-msg" aria-live="polite"></p>`);
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '나의 학습 기록'); document.body.appendChild(box);
  const $ = s => box.querySelector(s), name = $('.rc-name'), note = $('.rc-note'), msg = $('.rc-msg');
  name.value = draft.name; note.value = draft.note;
  name.oninput = () => { draft.name = name.value; persist(); };
  note.oninput = () => { draft.note = note.value; persist(); };

  function gather() {
    const learn = read('gunsan-jelly-learn-v1', {}), done = learn.done || {};
    const seen = (learn.seen || []).length, total = labels.length;
    return {
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
      missions: MISSIONS.map(m => ({ text: m.text, done: !!done[m.id] })),
      quiz: +read('gunsan-jelly-quiz-best', 0) || 0, seen, total,
      eras: (read('gunsan-jelly-eras-seen', []) || []).length, heard: (learn.heard || []).length,
    };
  }
  function render() {
    const g = gather(), nDone = g.missions.filter(m => m.done).length;
    $('.rc-date').textContent = g.date;
    $('.rc-stats').innerHTML = `
      <div><em>${nDone}<small>/${g.missions.length}</small></em><span>미션</span></div>
      <div><em>${g.quiz}<small>/${QUIZ_ROUND}</small></em><span>퀴즈 최고</span></div>
      <div><em>${g.seen}<small>/${g.total}</small></em><span>본 장소</span></div>
      <div><em>${g.eras}<small>/3</small></em><span>둘러본 시대</span></div>`;
    $('.rc-missions').innerHTML = g.missions.map(m => `<li class="${m.done ? 'done' : ''}">${m.done ? '✅' : '⬜'} ${esc(m.text)}</li>`).join('');
    return g;
  }
  function text() {
    const g = render(), nDone = g.missions.filter(m => m.done).length;
    return [`[군산 바다 탐험 학습 기록] ${g.date}`, `이름: ${draft.name || '(이름 없음)'}`,
      `미션 ${nDone}/${g.missions.length} · 퀴즈 최고 ${g.quiz}/${QUIZ_ROUND} · 본 장소 ${g.seen}/${g.total} · 둘러본 시대 ${g.eras}/3`,
      ...g.missions.map(m => `${m.done ? '[완료]' : '[ ]'} ${m.text}`),
      `오늘 알게 된 것: ${draft.note.trim() || '(아직 안 씀)'}`].join('\n');
  }
  function open() { render(); msg.textContent = ''; box.classList.add('show'); document.body.classList.add('quiz-open'); }
  function close() { box.classList.remove('show'); document.body.classList.remove('quiz-open'); }
  btn.onclick = () => { document.body.classList.remove('panel-open'); open(); };
  $('.pc-x').onclick = close;
  $('.rc-copy').onclick = async () => {
    const t = text();
    try { await navigator.clipboard.writeText(t); msg.textContent = '복사했어요! 활동지나 학급 게시판에 붙여 넣으세요.'; }
    catch (e) {   // 복사가 막힌 곳: 글을 골라 두어 직접 복사하게
      msg.innerHTML = '자동 복사가 안 되는 곳이에요. 아래 글을 길게 눌러 복사하세요.';
      const ta = el('textarea', 'rc-fallback'); ta.value = t; ta.rows = 6; ta.readOnly = true; msg.appendChild(ta); ta.select();
    }
  };
  $('.rc-print').onclick = () => {
    render(); document.body.classList.add('printing');
    try { window.print(); } catch (e) { msg.textContent = '이 화면에서는 인쇄할 수 없어요. 복사하기를 써 주세요.'; }
    setTimeout(() => document.body.classList.remove('printing'), 500);
  };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('show')) close(); });
  return { open, close, text };
}
