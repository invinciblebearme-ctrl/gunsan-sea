// quiz.js — 군산 퀴즈: 장소 카드 내용으로 OX·사지선다 문제를 무작위로 출제
import { QUIZ, QUIZ_ROUND, QUIZ_PASS } from './places.js';

const KEY = 'gunsan-jelly-quiz-best';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function setupQuiz({ learn, labels, focus, audio }) {
  let best = 0; try { best = +localStorage.getItem(KEY) || 0; } catch (e) { /* 무시 */ }

  // 패널: 퀴즈 시작 버튼 (통계 바로 아래, 잘 보이는 자리)
  const entry = el('div', 'sec quiz-entry', `<button type="button" class="quiz-start"><b>🧩 군산 퀴즈</b><small></small></button>`);
  document.querySelector('#panel .stats').after(entry);
  const entrySmall = entry.querySelector('small');
  const updEntry = () => { entrySmall.textContent = best ? `최고 점수 ${best} / ${QUIZ_ROUND}` : `${QUIZ_ROUND}문제 · 장소 카드에 답이 있어요`; };

  const box = el('section', 'quiz', `
    <button type="button" class="pc-x" aria-label="닫기">✕</button>
    <div class="qz-head"><small class="qz-prog"></small><small class="qz-score"></small></div>
    <div class="qz-bar"><i></i></div>
    <div class="qz-main"></div>`);
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '군산 퀴즈'); document.body.appendChild(box);
  const main = box.querySelector('.qz-main');
  let qs = [], idx = 0, score = 0, answered = false;

  function start() {
    learn.closeCard();
    qs = shuffle(QUIZ.slice()).slice(0, QUIZ_ROUND).map(q => {
      if (q.type !== 'mc') return q;
      // 보기 순서도 섞기 (정답 번호 따라 옮김)
      const order = shuffle(q.choices.map((_, i) => i));
      return { ...q, choices: order.map(i => q.choices[i]), answer: order.indexOf(q.answer) };
    });
    idx = 0; score = 0; box.classList.add('show'); document.body.classList.add('quiz-open'); show();
  }
  function close() { box.classList.remove('show'); document.body.classList.remove('quiz-open'); }

  function head() {
    box.querySelector('.qz-prog').textContent = idx < qs.length ? `${idx + 1} / ${qs.length}` : '결과';
    box.querySelector('.qz-score').textContent = `맞힌 문제 ${score}`;
    box.querySelector('.qz-bar i').style.width = (idx / qs.length * 100) + '%';
  }
  function show() {
    answered = false; head();
    if (idx >= qs.length) return result();
    const q = qs[idx];
    const opts = q.type === 'ox'
      ? `<div class="qz-ox"><button type="button" data-v="1">⭕<span>맞아요</span></button><button type="button" data-v="0">❌<span>아니에요</span></button></div>`
      : `<div class="qz-mc">${q.choices.map((c, i) => `<button type="button" data-v="${i}"><em>${i + 1}</em>${c}</button>`).join('')}</div>`;
    main.innerHTML = `<small class="qz-place">📍 ${q.place}</small><h3>${q.type === 'ox' ? '<span class="qz-tag">OX</span>' : ''}${q.q}</h3>${opts}
      <div class="qz-fb" hidden><b></b><p></p><div class="qz-btns"><button type="button" class="qz-see">카드 보기</button><button type="button" class="qz-next"></button></div></div>`;
    main.querySelectorAll('[data-v]').forEach(b => b.onclick = () => pick(b));
    main.querySelector('.qz-see').onclick = () => {
      const l = labels.find(l => l.name === q.place); if (l) focus(l.pos);
      close(); learn.openByName(q.place); reopen.hidden = false;
    };
    main.querySelector('.qz-next').onclick = () => { idx++; show(); };
    main.querySelector('[data-v]').focus({ preventScroll: true });
  }
  function pick(btn) {
    if (answered) return; answered = true;
    const q = qs[idx], v = +btn.dataset.v, ok = q.type === 'ox' ? (v === 1) === q.answer : v === q.answer;
    if (ok) score++;
    const right = q.type === 'ox' ? (q.answer ? 1 : 0) : q.answer;
    main.querySelectorAll('[data-v]').forEach(b => { b.disabled = true; if (+b.dataset.v === right) b.classList.add('right'); });
    if (!ok) btn.classList.add('wrong');
    const fb = main.querySelector('.qz-fb'); fb.hidden = false; fb.classList.toggle('ok', ok);
    fb.querySelector('b').textContent = ok ? '정답이에요! 🎉' : '아쉬워요! 정답을 확인해 보세요';
    fb.querySelector('p').textContent = q.why;
    fb.querySelector('.qz-next').textContent = idx + 1 < qs.length ? '다음 문제 →' : '결과 보기';
    fb.querySelector('.qz-next').focus({ preventScroll: true });
    head(); ok ? audio.blip?.() : audio.plop?.();
  }
  function result() {
    box.querySelector('.qz-bar i').style.width = '100%';
    const pass = score >= QUIZ_PASS, stars = score === qs.length ? 3 : pass ? 2 : score >= qs.length / 2 ? 1 : 0;
    if (score > best) { best = score; try { localStorage.setItem(KEY, best); } catch (e) { /* 무시 */ } updEntry(); }
    main.innerHTML = `<div class="qz-result">
      <div class="qz-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <h3>${qs.length}문제 중 <b>${score}</b>문제를 맞혔어요</h3>
      <p>${score === qs.length ? '만점! 군산 박사예요 👏' : pass ? '훌륭해요! 미션 통과!' : `${QUIZ_PASS}문제 이상 맞히면 미션 통과예요. 장소 카드를 읽고 다시 도전해 보세요!`}</p>
      <div class="qz-btns"><button type="button" class="qz-close">닫기</button><button type="button" class="qz-again">다시 풀기</button></div></div>`;
    main.querySelector('.qz-close').onclick = close;
    main.querySelector('.qz-again').onclick = start;
    if (pass) learn.complete('quiz');
  }

  // 카드 보기 후 퀴즈로 돌아가기 버튼
  const reopen = el('button', 'quiz-back', '🧩 퀴즈로 돌아가기'); reopen.type = 'button'; reopen.hidden = true; document.body.appendChild(reopen);
  reopen.onclick = () => { reopen.hidden = true; learn.closeCard(); box.classList.add('show'); document.body.classList.add('quiz-open'); };

  entry.querySelector('.quiz-start').onclick = () => { reopen.hidden = true; document.body.classList.remove('panel-open'); start(); };
  box.querySelector('.pc-x').onclick = () => { reopen.hidden = true; close(); };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('show')) close(); });
  updEntry();
  return { start, close };
}
