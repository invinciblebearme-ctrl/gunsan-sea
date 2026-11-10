// learn.js — 교육 기능: ① 장소 카드 ② 물때 실험 ③ 탐험 미션 ⑥ 영어 모드(카드·이름표·물때 판)
import { heightAt, lastId, HX, HZ } from './terrain.js';
import { NX, NZ, CELL } from './water.js';
import { PLACES, PLACES_EN, MISSIONS, TIDE_RANGE_M } from './places.js';

const KEY = 'gunsan-jelly-learn-v1';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function setupLearning({ labels, water, stats, tideSlider, focus, audio }) {
  // ── 저장된 진행 상황
  let save = { done: {}, seen: [], heard: [], lang: 'ko' };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* 저장 불가 환경 */ }
  const seen = new Set(save.seen), heard = new Set(save.heard);
  let lang = save.lang === 'en' ? 'en' : 'ko';
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ done: save.done, seen: [...seen], heard: [...heard], lang })); } catch (e) { /* 무시 */ } };

  // ── ⑥ 영어 소리: 브라우저 내장 음성(speechSynthesis). 없으면 듣기 버튼을 숨김
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let enVoice = null;
  const pickVoice = () => { const vs = synth.getVoices(); enVoice = vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; };
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  function say(text, onPlace) {
    if (!synth) return; try {
      synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; if (enVoice) u.voice = enVoice; synth.speak(u);
    } catch (e) { return; }
    if (onPlace && !heard.has(onPlace)) { heard.add(onPlace); persist(); render(); if (heard.size >= 3) complete('english'); }
  }
  if (!synth) document.body.classList.add('no-speech');

  // 언어 전환 버튼 (패널 맨 위)
  const langSeg = el('div', 'lang-seg', `<button type="button" data-lang="ko">한국어</button><button type="button" data-lang="en">English</button>`);
  document.querySelector('#panel .acts').before(langSeg);

  // ── 갯벌 칸: 본 육지(id 0) 왼쪽, 밀물~썰물 사이 높이에 있는 칸
  const flat = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = -HX + i * CELL, z = -HZ + j * CELL; if (x > -7.2) continue;
    const h = heightAt(x, z); if (lastId() !== 0) continue;
    if (h > -0.35 && h < 0.27) flat.push(j * NX + i);
  }
  const exposedPct = () => {
    if (!flat.length) return 0; let n = 0;
    for (const k of flat) if (water.land[k]) n++;
    return Math.round(n / flat.length * 100);
  };

  // ── ② 물때 실험: 슬라이더 아래 읽기 판
  const tideLabel = tideSlider.closest('label');
  const meter = el('div', 'tide-meter', `
    <div class="tm-row"><span class="tm-state"></span><b class="tm-m"></b></div>
    <div class="tm-bar"><i></i></div>
    <div class="tm-row tm-sub"><span>갯벌 드러남</span><b class="tm-flat"></b></div>
    <button type="button" class="tm-say" hidden>🔊 Say it</button>
    <p class="tm-note">군산 앞바다의 밀물·썰물 높이 차이(최대 약 ${TIDE_RANGE_M}m)로 환산한 값이에요.</p>`);
  tideLabel.after(meter);
  const q = s => meter.querySelector(s);
  q('.tm-say').onclick = () => { const v = +tideSlider.value; say(v < 30 ? 'It is low tide. The water goes out, and we can see the mudflat.' : v > 70 ? 'It is high tide. The water comes in, and the mudflat is under the water.' : 'The tide is in the middle.'); };
  function updTide() {
    const v = +tideSlider.value, m = v / 100 * TIDE_RANGE_M, f = exposedPct(), en = lang === 'en';
    q('.tm-state').textContent = en ? (v < 30 ? '🌊 Low tide' : v > 70 ? '🌊 High tide' : '🌊 Mid tide')
      : (v < 30 ? '🌊 썰물 (물이 빠짐)' : v > 70 ? '🌊 밀물 (물이 들어옴)' : '🌊 중간 물때');
    q('.tm-m').textContent = en ? `Water level ${m.toFixed(1)} m` : `물 높이 ${m.toFixed(1)} m`;
    q('.tm-sub span').textContent = en ? 'Mudflat showing (갯벌 드러남)' : '갯벌 드러남';
    q('.tm-say').hidden = !en;
    q('.tm-flat').textContent = f + '%';
    q('.tm-bar i').style.width = f + '%';
    return f;
  }

  // ── ③ 미션 판
  const panel = document.querySelector('#panel'), sliders = panel.querySelector('.sliders');
  const box = el('div', 'sec missions', `<h2>탐험 미션 <span class="ms-count"></span></h2><ul></ul><button type="button" class="ms-reset">미션 처음부터</button>`);
  sliders.after(box);
  const ul = box.querySelector('ul'), items = {};
  for (const m of MISSIONS) {
    const li = el('li', '', `<i></i><span>${m.text}</span><em></em>`); ul.appendChild(li); items[m.id] = li;
  }
  const toast = el('div', 'toast'); document.body.appendChild(toast);
  let toastT = 0;
  function showToast(html) { toast.innerHTML = html; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 2600); }
  function complete(id) {
    if (save.done[id]) return; save.done[id] = true; persist(); render();
    const m = MISSIONS.find(m => m.id === id), n = Object.keys(save.done).length;
    audio.blip?.();
    showToast(n === MISSIONS.length ? '🎉 <b>모든 미션 완료!</b> 군산 탐험가가 되었어요' : `⭐ <b>미션 완료</b> ${m.text}`);
  }
  const extra = {};   // 다른 모듈이 알려 주는 진행 수 (예: 둘러본 시대 수)
  function progress(m) {
    if (m.id in extra) return extra[m.id];
    if (m.id === 'cards') return seen.size;
    if (m.id === 'english') return heard.size;
    if (m.id === 'fed') return Math.min(m.goal, stats.fed);
    return null;
  }
  function render() {
    let n = 0;
    for (const m of MISSIONS) {
      const li = items[m.id], d = !!save.done[m.id]; if (d) n++;
      li.classList.toggle('done', d);
      const p = progress(m); li.querySelector('em').textContent = m.goal && !d && p != null ? `${p}/${m.goal}` : '';
    }
    box.querySelector('.ms-count').textContent = `${n}/${MISSIONS.length}`;
    for (const l of labels) { l.el.classList.toggle('seen', seen.has(l.name)); l.el.textContent = lang === 'en' && PLACES_EN[l.name] ? PLACES_EN[l.name].name : l.name; }
  }
  box.querySelector('.ms-reset').onclick = () => { save.done = {}; seen.clear(); heard.clear(); persist(); render(); showToast('미션을 처음부터 시작해요'); };

  // ── ① 장소 카드
  const card = el('section', 'place-card', `
    <button type="button" class="pc-x" aria-label="닫기">✕</button>
    <small class="pc-tag"></small><h3></h3><ul class="pc-body"></ul>
    <div class="pc-ask"><b>생각해 보기</b><p></p></div><div class="pc-words"></div>
    <div class="pc-btns"><button type="button" class="pc-say">🔊 Listen</button><button type="button" class="pc-go">가까이 보기</button><button type="button" class="pc-tide">물때 바꿔 보기</button></div>`);
  card.setAttribute('aria-live', 'polite'); document.body.appendChild(card);
  let open = null, pierTide0 = null;
  function openCard(l) {
    const p = PLACES[l.name]; if (!p) return;
    const e = lang === 'en' ? PLACES_EN[l.name] : null, C = s => card.querySelector(s);
    open = l; card.classList.toggle('en', !!e);
    C('.pc-tag').textContent = e ? e.tag : p.tag;
    C('h3').innerHTML = e ? `${e.name} <small>${l.name}</small>` : l.name;
    C('.pc-body').innerHTML = e
      ? e.body.map((t, i) => `<li><span>${t}</span> <button type="button" class="say" data-i="${i}" aria-label="듣기">🔊</button><small>${p.body[i] || ''}</small></li>`).join('')
      : p.body.map(t => `<li>${t}</li>`).join('');
    C('.pc-ask b').textContent = e ? 'Think about it · 생각해 보기' : '생각해 보기';
    C('.pc-ask p').innerHTML = e ? `${e.ask}<small>${p.ask}</small>` : p.ask;
    C('.pc-words').innerHTML = e ? `<b>Words</b>${e.words.map(([w, k], i) => `<button type="button" class="word" data-w="${i}">${w}<small>${k}</small></button>`).join('')}` : '';
    C('.pc-say').style.display = e ? '' : 'none';
    C('.pc-go').textContent = e ? 'Zoom in' : '가까이 보기';
    C('.pc-tide').textContent = e ? 'Try the tide' : '물때 바꿔 보기';
    if (e) {
      card.querySelectorAll('.say').forEach(b => b.onclick = () => say(e.body[+b.dataset.i], l.name));
      card.querySelectorAll('.word').forEach(b => b.onclick = () => say(e.words[+b.dataset.w][0]));
    }
    card.querySelector('.pc-tide').style.display = p.tryTide ? '' : 'none';
    card.classList.add('show'); for (const o of labels) o.el.classList.toggle('active', o === l);
    pierTide0 = l.name === '내항 뜬다리부두' ? +tideSlider.value : null;
    if (!seen.has(l.name)) { seen.add(l.name); persist(); }
    render(); audio.plop?.();
  }
  function closeCard() { open = null; pierTide0 = null; card.classList.remove('show'); for (const o of labels) o.el.classList.remove('active'); }
  card.querySelector('.pc-x').onclick = closeCard;
  card.querySelector('.pc-go').onclick = () => open && focus(open.pos);
  card.querySelector('.pc-say').onclick = () => { const e = open && PLACES_EN[open.name]; if (e) say(e.body.join(' '), open.name); };
  function setLang(v) {
    lang = v; persist();
    langSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
    document.body.classList.toggle('lang-en', lang === 'en'); document.documentElement.lang = lang;
    lastTide = -1; render(); updTide(); if (open) openCard(open);
  }
  langSeg.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.dataset.lang !== lang) { setLang(b.dataset.lang); audio.plop?.(); } });
  card.querySelector('.pc-tide').onclick = () => {
    document.body.classList.add('panel-open');
    tideSlider.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tideSlider.closest('label').classList.add('flash'); setTimeout(() => tideSlider.closest('label').classList.remove('flash'), 1400);
  };
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
  for (const l of labels) {
    l.el.setAttribute('role', 'button'); l.el.tabIndex = 0;
    l.el.addEventListener('click', () => (open === l ? closeCard() : openCard(l)));
    l.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(l); } });
  }

  // ── 매 프레임(가볍게): 물때 판 + 미션 판정
  let lastTide = -1, lastFed = -1;
  function checkTide() {
    const v = +tideSlider.value; if (v === lastTide) return;
    lastTide = v; const f = updTide();   // main.js의 input 리스너가 먼저 water.setSea를 호출함
    if (f >= 80) complete('ebb');
    if (f <= 20) complete('flood');
    if (pierTide0 != null && Math.abs(v - pierTide0) >= 20) complete('pier');
  }
  tideSlider.addEventListener('input', checkTide);
  function update() {
    checkTide();
    if (seen.size >= 7) complete('cards');
    if (stats.launch >= 1) complete('launch');
    if (stats.laps >= 1) complete('laps');
    if (stats.fed !== lastFed) { lastFed = stats.fed; if (stats.fed >= 3) complete('fed'); render(); }
  }
  render(); updTide(); setLang(lang);
  const openByName = name => { const l = labels.find(l => l.name === name); if (l) openCard(l); };
  const setProgress = (id, n) => { extra[id] = n; render(); };
  return { update, closeCard, openByName, complete, setProgress, isOpen: () => !!open, flatCells: flat.length, exposedPct };
}
