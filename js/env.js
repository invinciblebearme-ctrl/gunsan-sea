// env.js — 자연환경·인문환경: 이름표 걸러 보기 + 분류 놀이
import { ENV, ENV_NAME } from './places.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function setupEnv({ labels, learn, audio }) {
  // 패널: 퀴즈 버튼 아래
  const sec = el('div', 'sec env-sec', `<h2>자연환경 · 인문환경</h2>
    <div class="env-seg" role="radiogroup" aria-label="환경 보기">
      <button type="button" data-f="all" class="on">모두</button><button type="button" data-f="nature">🌿 자연환경</button><button type="button" data-f="human">🏗️ 인문환경</button></div>
    <button type="button" class="env-play">🧺 분류 놀이</button>
    <p class="env-note">자연환경: 산·바다·섬·갯벌처럼 자연이 만든 것<br>인문환경: 다리·항구·건물·공장처럼 사람이 만든 것</p>`);
  document.querySelector('#panel .quiz-entry').after(sec);
  const segBtns = [...sec.querySelectorAll('[data-f]')];
  let filter = 'all';
  function setFilter(f) {
    filter = f; segBtns.forEach(b => { const on = b.dataset.f === f; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    for (const l of labels) { const t = ENV[l.name]?.type; l.el.classList.toggle('env-hide', f !== 'all' && t !== f); }
    learn.closeCard();
  }
  segBtns.forEach(b => b.onclick = () => { setFilter(b.dataset.f); audio.plop?.(); });

  // 분류 놀이: 장소마다 자연/인문 고르기
  const box = el('section', 'quiz sort-game', `<button type="button" class="pc-x" aria-label="닫기">✕</button>
    <div class="qz-head"><small>🧺 분류 놀이</small><small class="sg-score"></small></div>
    <h3>자연환경일까요, 인문환경일까요?</h3><ul class="sg-list"></ul><div class="sg-end"></div>`);
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '자연환경 인문환경 분류 놀이'); document.body.appendChild(box);
  const list = box.querySelector('.sg-list'), endBox = box.querySelector('.sg-end');
  let items = [], answered = 0, right = 0;
  function start() {
    learn.closeCard();
    items = shuffle(labels.filter(l => ENV[l.name] && !l.off).map(l => l.name));   // 지금 시대에 있는 장소만
    answered = right = 0; endBox.innerHTML = '';
    list.innerHTML = items.map((n, i) => `<li data-i="${i}"><span class="sg-name">${n}</span>
      <span class="sg-btns"><button type="button" data-t="nature">🌿 자연</button><button type="button" data-t="human">🏗️ 인문</button></span><small class="sg-why"></small></li>`).join('');
    list.querySelectorAll('li').forEach(li => li.querySelectorAll('[data-t]').forEach(b => b.onclick = () => pick(li, b)));
    score(); box.classList.add('show'); document.body.classList.add('quiz-open');
  }
  function score() { box.querySelector('.sg-score').textContent = `${answered}/${items.length} · 맞힘 ${right}`; }
  function pick(li, b) {
    if (li.classList.contains('done')) return;
    const n = items[+li.dataset.i], ev = ENV[n], ok = b.dataset.t === ev.type;
    li.classList.add('done', ok ? 'ok' : 'no'); answered++; if (ok) right++;
    li.querySelectorAll('[data-t]').forEach(x => { x.disabled = true; if (x.dataset.t === ev.type) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    li.querySelector('.sg-why').textContent = `${ok ? '정답!' : `정답은 ${ENV_NAME[ev.type].ko}.`} ${ev.why}`;
    ok ? audio.blip?.() : audio.plop?.(); score();
    if (answered === items.length) finish();
  }
  function finish() {
    const all = right === items.length;
    endBox.innerHTML = `<p>${all ? '🎉 모두 맞혔어요! 자연환경과 인문환경을 잘 구별했어요.' : `${items.length}곳 중 ${right}곳을 맞혔어요. 틀린 곳의 까닭을 읽고 다시 해 보세요.`}</p>
      <div class="qz-btns"><button type="button" class="sg-close">닫기</button><button type="button" class="qz-again">다시 하기</button></div>`;
    endBox.querySelector('.sg-close').onclick = close; endBox.querySelector('.qz-again').onclick = start;
    endBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (all) learn.complete('env');
  }
  function close() { box.classList.remove('show'); document.body.classList.remove('quiz-open'); }
  box.querySelector('.pc-x').onclick = close;
  sec.querySelector('.env-play').onclick = () => { document.body.classList.remove('panel-open'); start(); };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('show')) close(); });
  return { setFilter, start, close, get filter() { return filter; } };
}
