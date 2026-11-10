// era.js — 그때와 지금: 1930년대 · 1990년 무렵 · 지금 을 바꿔 가며 군산 바다의 변화 비교
import { ERA } from './terrain.js';
import { ERAS } from './places.js';

const KEY = 'gunsan-jelly-eras-seen';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const HIDE = { shipyard: '군산조선소 골리앗 크레인', seawall: '새만금방조제', bridge: '고군산대교' };

export function setupEra({ terrain, water, world, life, labels, learn, kick, audio }) {
  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch (e) { /* 무시 */ }
  let cur = ERAS.find(e => e.id === 'now');

  // 패널: 시대 고르기 (퀴즈 버튼 아래)
  const sec = el('div', 'sec era-sec', `<h2>그때와 지금</h2><div class="era-seg" role="radiogroup" aria-label="시대">${ERAS.map(e =>
    `<button type="button" role="radio" data-era="${e.id}"><b>${e.short || e.name}</b><small>${e.sub}</small></button>`).join('')}</div>`);
  document.querySelector('#panel .quiz-entry').after(sec);
  const btns = [...sec.querySelectorAll('[data-era]')];

  // 시대 설명 띠 (화면 위쪽 가운데)
  const note = el('section', 'era-note', `<button type="button" class="pc-x" aria-label="닫기">✕</button>
    <small class="en-tag"></small><h3></h3><ul></ul><div class="pc-ask"><b>생각해 보기</b><p></p></div>`);
  note.setAttribute('aria-live', 'polite'); document.body.appendChild(note);
  note.querySelector('.pc-x').onclick = () => note.classList.remove('show');
  const badge = el('div', 'era-badge'); document.body.appendChild(badge);
  // 장소 카드·퀴즈를 열면 시대 설명은 닫기 (화면 겹침 방지)
  const hideNote = () => note.classList.remove('show');
  for (const l of labels) l.el.addEventListener('click', hideNote);
  document.querySelector('#panel .quiz-start')?.addEventListener('click', hideNote);

  function apply(e, quiet) {
    cur = e;
    if (ERA.seawall !== e.on.seawall) { ERA.seawall = e.on.seawall; terrain.refill(); water.refreshTerrain(); }
    world.setEra(e.on);
    life.setYard(e.on.shipyard);
    for (const k in HIDE) { const l = labels.find(l => l.name === HIDE[k]); if (l) l.off = !e.on[k]; }
    btns.forEach(b => { const on = b.dataset.era === e.id; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    document.body.classList.toggle('past', e.id !== 'now');
    badge.textContent = e.id === 'now' ? '' : `⏳ ${e.name} · ${e.sub}`;
    if (quiet) return;
    learn.closeCard();
    note.querySelector('.en-tag').textContent = e.sub; note.querySelector('h3').textContent = e.name;
    note.querySelector('ul').innerHTML = e.body.map(t => `<li>${t}</li>`).join('');
    note.querySelector('.pc-ask p').textContent = e.ask;
    note.classList.add('show');
    seen.add(e.id); try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch (err) { /* 무시 */ }
    learn.setProgress('eras', seen.size); if (seen.size >= ERAS.length) learn.complete('eras');
    kick(0.14); audio.plop?.();
  }
  btns.forEach(b => b.onclick = () => { const e = ERAS.find(e => e.id === b.dataset.era); if (e !== cur || !note.classList.contains('show')) apply(e); });
  learn.setProgress('eras', seen.size);
  apply(cur, true);
  const clearSeen = () => { seen.clear(); try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } learn.setProgress('eras', 0); };
  document.querySelector('#panel .ms-reset')?.addEventListener('click', clearSeen);   // '미션 처음부터'와 함께 초기화

  return {
    get launchOK() { return cur.on.shipyard; },
    reset() { note.classList.remove('show'); apply(ERAS.find(e => e.id === 'now'), true); },
    clearSeen,
    get current() { return cur.id; },
  };
}
