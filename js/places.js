// places.js — 장소 카드 내용 (이름표 이름과 같은 키)
// ※ 수업 전에 선생님이 내용을 한 번 확인해 주세요.
export const PLACES = {
  '내항 뜬다리부두': {
    tag: '역사 · 바다',
    body: [
      '일제강점기에 만들어진 부두로, 물 위에 떠 있는 다리(부잔교)예요.',
      '군산 앞바다는 밀물과 썰물의 높이 차이가 커서, 부두가 물에 떠서 물 높이를 따라 오르내리도록 만들었어요.',
      '이 부두로 호남평야의 쌀이 일본으로 많이 실려 나갔어요.',
    ],
    ask: '물때 슬라이더를 움직여 보세요. 뜬다리부두는 어떻게 달라지나요? 왜 이렇게 만들었을까요?',
    tryTide: true,
  },
  '군산조선소 골리앗 크레인': {
    tag: '산업',
    body: [
      '큰 배를 만드는 조선소예요. 배는 여러 조각(블록)으로 나누어 만든 뒤 하나로 이어 붙여요.',
      '골리앗 크레인은 아주 무거운 블록을 들어 옮기는 거대한 크레인이에요.',
      '완성된 배는 바다로 내보내요. 이것을 ‘진수’라고 해요.',
    ],
    ask: '조선소는 왜 바닷가에 있어야 할까요? ‘진수!’ 버튼을 눌러 보세요.',
  },
  '새만금방조제': {
    tag: '지리 · 환경',
    body: [
      '군산과 부안 사이 바다를 막은 방조제로, 길이가 약 33.9km나 돼요.',
      '세계에서 가장 긴 방조제로 기네스 세계 기록에 올랐어요.',
      '바다를 막아 새로운 땅과 호수를 만들었지만, 그 안의 넓은 갯벌은 사라졌어요.',
    ],
    ask: '새 땅이 생긴 좋은 점과 갯벌이 사라진 아쉬운 점을 하나씩 말해 보세요.',
  },
  '고군산대교': {
    tag: '지리 · 교통',
    body: [
      '고군산군도의 신시도와 무녀도를 잇는 다리예요.',
      '이 다리가 생겨서 선유도·장자도 같은 섬까지 차로 갈 수 있게 되었어요.',
      '탑 하나에 줄을 걸어 다리를 매단 모양이에요.',
    ],
    ask: '다리가 생기기 전과 후, 섬 마을 사람들의 생활은 어떻게 달라졌을까요?',
  },
  '선유도 망주봉': {
    tag: '자연 · 관광',
    body: [
      '선유도는 ‘신선이 노닐던 섬’이라는 뜻을 가진 고군산군도의 섬이에요.',
      '망주봉은 섬 가운데 우뚝 솟은 두 개의 바위 봉우리예요.',
      '고운 모래 해변과 바위섬이 어우러져 많은 사람이 찾아와요.',
    ],
    ask: '고군산군도에는 섬이 여러 개 모여 있어요. 지도에서 섬을 몇 개 찾을 수 있나요?',
  },
  '십이동파도 청자 난파선': {
    tag: '역사 · 문화유산',
    body: [
      '군산 앞바다 십이동파도 근처 바닷속에서 고려 시대 배가 발견되었어요.',
      '배 안에서는 고려청자 등 그릇이 수천 점이나 나왔어요.',
      '바닷속 유물을 찾아 꺼내는 일을 ‘수중 발굴’이라고 해요.',
    ],
    ask: '옛날 사람들은 왜 바닷길로 청자를 옮겼을까요?',
  },
  '갯벌': {
    tag: '과학 · 생태',
    body: [
      '바닷물이 빠지면 드러나고, 들어오면 잠기는 진흙 땅이에요.',
      '서해안은 밀물과 썰물이 하루에 약 두 번씩 일어나고, 그 높이 차이가 커서 갯벌이 넓게 생겨요.',
      '갯벌에는 게·조개·짱뚱어 같은 생물이 살고, 바닷물을 깨끗하게 해 주는 역할도 해요.',
    ],
    ask: '물때를 썰물 쪽으로 내려 보세요. 갯벌이 얼마나 드러나나요?',
    tryTide: true,
  },
};

// 물때 슬라이더 0~100 → 군산항 최대 조차(약 7m)로 환산한 물 높이
export const TIDE_RANGE_M = 7;

export const MISSIONS = [
  { id: 'cards', text: '이름표를 모두 눌러 보기', goal: 7 },   // goal은 실행할 때 이름표 수로 바뀜
  { id: 'ebb', text: '썰물: 물때를 내려 갯벌을 80% 이상 드러내기' },
  { id: 'flood', text: '밀물: 물때를 올려 갯벌을 거의 다 잠기게 하기 (20% 이하)' },
  { id: 'pier', text: '뜬다리부두 카드를 열고 물때 바꿔 보기' },
  { id: 'launch', text: '조선소에서 배 진수하기' },
  { id: 'laps', text: '유람선이 한 바퀴 도는 것 지켜보기' },
  { id: 'fed', text: '물고기 밥 3번 먹이기', goal: 3 },
  { id: 'quiz', text: '군산 퀴즈 8문제 중 6문제 이상 맞히기' },
  { id: 'eras', text: '그때와 지금: 세 시대를 모두 둘러보기', goal: 3 },
  { id: 'english', text: 'English: 장소 3곳의 영어 설명 들어 보기 🔊', goal: 3 },
  { id: 'env', text: '자연환경·인문환경 분류 놀이 모두 맞히기' },
];

// ── 퀴즈 문제 (장소 카드 내용에서만 출제)
// type: 'ox' (answer: true/false) 또는 'mc' (choices + answer 번호, 0부터)
export const QUIZ = [
  { place: '내항 뜬다리부두', type: 'mc', q: '뜬다리부두가 물 위에 떠 있도록 만든 까닭은 무엇일까요?',
    choices: ['밀물과 썰물의 높이 차이가 커서', '배가 가볍게 지나가라고', '비가 많이 와서', '물고기를 기르려고'], answer: 0,
    why: '군산 앞바다는 밀물·썰물 높이 차이가 커서, 부두가 물 높이를 따라 오르내려야 배를 댈 수 있어요.' },
  { place: '내항 뜬다리부두', type: 'ox', q: '뜬다리부두를 통해 호남평야의 쌀이 일본으로 많이 실려 나갔다.', answer: true,
    why: '일제강점기에 만들어진 이 부두로 많은 쌀이 일본으로 실려 나갔어요.' },
  { place: '군산조선소 골리앗 크레인', type: 'mc', q: '완성된 배를 바다로 처음 내보내는 것을 무엇이라고 할까요?',
    choices: ['수리', '진수', '정박', '양식'], answer: 1,
    why: '배를 처음 물에 띄워 내보내는 것을 ‘진수’라고 해요. ‘진수!’ 버튼으로 직접 해 볼 수 있어요.' },
  { place: '군산조선소 골리앗 크레인', type: 'mc', q: '조선소의 골리앗 크레인은 어떤 일을 할까요?',
    choices: ['바닷물을 퍼낸다', '등대 불을 밝힌다', '아주 무거운 배 블록을 들어 옮긴다', '물고기를 잡는다'], answer: 2,
    why: '배는 여러 블록으로 나누어 만드는데, 골리앗 크레인이 그 무거운 블록을 들어 옮겨요.' },
  { place: '새만금방조제', type: 'mc', q: '새만금방조제의 길이는 약 몇 km일까요?',
    choices: ['약 3.4km', '약 33.9km', '약 339km', '약 3,390km'], answer: 1,
    why: '약 33.9km로, 세계에서 가장 긴 방조제로 기네스 세계 기록에 올랐어요.' },
  { place: '새만금방조제', type: 'ox', q: '새만금방조제가 생기면서 그 안의 갯벌이 더 넓어졌다.', answer: false,
    why: '바다를 막아 새 땅과 호수가 생겼지만, 그 안의 넓은 갯벌은 사라졌어요.' },
  { place: '고군산대교', type: 'mc', q: '고군산대교가 생기면서 무엇이 달라졌을까요?',
    choices: ['선유도·장자도까지 차로 갈 수 있게 되었다', '섬이 모두 육지와 붙었다', '바닷물이 모두 빠졌다', '배가 다닐 수 없게 되었다'], answer: 0,
    why: '신시도와 무녀도를 잇는 다리가 생겨, 선유도·장자도 같은 섬까지 차로 갈 수 있게 되었어요.' },
  { place: '선유도 망주봉', type: 'mc', q: '‘선유도’라는 이름은 어떤 뜻일까요?',
    choices: ['배가 많은 섬', '신선이 노닐던 섬', '소나무가 많은 섬', '큰 바위 섬'], answer: 1,
    why: '선유도는 ‘신선이 노닐던 섬’이라는 뜻이에요.' },
  { place: '십이동파도 청자 난파선', type: 'mc', q: '십이동파도 근처 바닷속에서 발견된 배는 어느 시대의 배일까요?',
    choices: ['삼국 시대', '고려 시대', '조선 시대', '근대'], answer: 1,
    why: '고려 시대 배가 발견되었고, 그 안에서 고려청자 등 그릇이 수천 점 나왔어요.' },
  { place: '십이동파도 청자 난파선', type: 'mc', q: '바닷속에 있는 유물을 찾아 꺼내는 일을 무엇이라고 할까요?',
    choices: ['간척', '진수', '수중 발굴', '양식'], answer: 2,
    why: '바닷속 유물을 찾아 꺼내는 일을 ‘수중 발굴’이라고 해요.' },
  { place: '갯벌', type: 'ox', q: '서해안은 밀물과 썰물이 하루에 약 두 번씩 일어난다.', answer: true,
    why: '서해안은 하루에 약 두 번씩 밀물과 썰물이 일어나고, 높이 차이도 커요.' },
  { place: '갯벌', type: 'mc', q: '갯벌이 가장 넓게 드러나는 때는 언제일까요? (물때 슬라이더로 확인해 보세요)',
    choices: ['밀물 때', '썰물 때', '바람이 강할 때', '비가 올 때'], answer: 1,
    why: '바닷물이 빠지는 썰물 때 갯벌이 넓게 드러나요.' },
  { place: '갯벌', type: 'mc', q: '다음 중 갯벌에 사는 생물이 아닌 것은?',
    choices: ['게', '조개', '짱뚱어', '다람쥐'], answer: 3,
    why: '갯벌에는 게·조개·짱뚱어 같은 생물이 살아요. 다람쥐는 숲에 살아요.' },
  { place: '고군산대교', type: 'ox', q: '고군산대교가 생기기 전에는 선유도에 가려면 배를 타야 했다.', answer: true,
    why: '‘그때와 지금’의 1990년 무렵을 보면 다리가 없어요. 그때는 배를 타야 섬에 갈 수 있었어요.' },
  { place: '내항 뜬다리부두', type: 'mc', q: '1930년대 군산항에서 일본으로 많이 실어 나른 것은 무엇일까요?',
    choices: ['쌀', '석탄', '자동차', '청자'], answer: 0,
    why: '호남평야에서 거둔 쌀이 군산항을 통해 일본으로 많이 실려 나갔어요. ‘그때와 지금’의 1930년대에서 쌀가마니를 찾아보세요.' },
  { place: '갯벌', type: 'mc', q: '다음 중 자연환경은 무엇일까요?',
    choices: ['갯벌', '고군산대교', '새만금방조제', '조선소'], answer: 0,
    why: '갯벌은 바닷물이 드나들며 저절로 생긴 자연환경이에요. 나머지는 사람이 만든 인문환경이에요.' },
  { place: '구 군산세관', type: 'mc', q: '다음 중 인문환경은 무엇일까요?',
    choices: ['명사십리 해변', '망주봉', '구 군산세관', '갯벌'], answer: 2,
    why: '구 군산세관은 사람이 지은 건물이라 인문환경이에요.' },
  { place: '내항 뜬다리부두', type: 'ox', q: '뜬다리부두는 밀물·썰물 차이가 큰 바다(자연환경)에 맞추어 사람이 만든 인문환경이다.', answer: true,
    why: '자연환경이 인문환경에 영향을 준 예예요. 물 높이가 크게 바뀌는 바다라서 물에 뜨는 부두를 만들었어요.' },
];
export const QUIZ_ROUND = 8;   // 한 번에 푸는 문제 수
export const QUIZ_PASS = 6;    // 미션 통과 점수

// ── 그때와 지금: 시대별로 보이는 것 (on) 과 설명
export const ERAS = [
  { id: '1930', name: '1930년대', sub: '일제강점기 군산항',
    on: { shipyard: false, seawall: false, bridge: false, rice: true },
    body: [
      '군산항은 호남평야에서 거둔 쌀을 일본으로 실어 나르던 항구였어요.',
      '뜬다리부두 옆에 쌀가마니가 높이 쌓였어요. 장면에서 찾아보세요.',
      '새만금방조제, 고군산대교, 조선소는 아직 없었어요.',
    ],
    ask: '쌀을 이렇게 많이 실어 간 일은 그때 우리나라 사람들의 생활에 어떤 영향을 주었을까요?' },
  { id: '1990', name: '1990년 무렵', short: '1990년', sub: '새만금 공사 전',
    on: { shipyard: false, seawall: false, bridge: false, rice: false },
    body: [
      '새만금방조제를 쌓기 전이라 군산과 부안 사이는 넓게 트인 바다였어요.',
      '고군산군도의 섬에 가려면 배를 타야 했어요.',
      '큰 배를 만드는 조선소도 아직 없었어요.',
    ],
    ask: '‘지금’과 번갈아 눌러 보세요. 바다의 모양은 어떻게 달라지나요?' },
  { id: 'now', name: '지금', sub: '새만금·고군산대교·조선소',
    on: { shipyard: true, seawall: true, bridge: true, rice: false },
    body: [
      '새만금방조제가 바다를 막아 새 땅과 호수를 만들었어요. (2010년 완공)',
      '고군산대교가 생겨 섬까지 차로 갈 수 있어요. (2016년 개통)',
      '조선소에서 큰 배를 만들어 바다로 내보내요.',
    ],
    ask: '세 시대를 비교해 보세요. 가장 크게 달라진 것은 무엇인가요? 좋아진 점과 아쉬운 점을 하나씩 말해 보세요.' },
];

// ── 영어 모드: 장소 카드 영어판 (한국어 body와 문장 순서가 같음 → 아래에 한국어가 함께 보임)
// words: [영어, 뜻]
export const PLACES_EN = {
  '내항 뜬다리부두': { name: 'Floating Pier', tag: 'History · Sea',
    body: ['This pier was built when Japan ruled Korea. It floats on the water.',
      'The sea here goes up and down a lot, so the pier goes up and down with the water.',
      'A lot of rice from the Honam Plain was sent to Japan from here.'],
    ask: 'Move the tide slider. What happens to the pier?',
    words: [['pier', '부두'], ['float', '물에 뜨다'], ['tide', '밀물과 썰물'], ['rice', '쌀']] },
  '군산조선소 골리앗 크레인': { name: 'Goliath Crane', tag: 'Industry',
    body: ['This is a shipyard. Big ships are made in pieces, called blocks.',
      'The Goliath crane lifts very heavy blocks.',
      'A new ship goes into the sea. This is called a launch.'],
    ask: 'Why is a shipyard next to the sea? Press the “진수!” button.',
    words: [['ship', '배'], ['shipyard', '조선소'], ['heavy', '무거운'], ['launch', '진수']] },
  '새만금방조제': { name: 'Saemangeum Seawall', tag: 'Geography · Nature',
    body: ['The Saemangeum Seawall blocks the sea between Gunsan and Buan. It is about 33.9 km long.',
      'It is the longest seawall in the world.',
      'It made new land and a lake, but a large mudflat disappeared.'],
    ask: 'Say one good thing and one sad thing about the seawall.',
    words: [['seawall', '방조제'], ['long', '긴'], ['land', '땅'], ['lake', '호수']] },
  '고군산대교': { name: 'Gogunsan Bridge', tag: 'Geography · Travel',
    body: ['Gogunsan Bridge connects Sinsido Island and Munyeodo Island.',
      'Now people can drive to islands like Seonyudo and Jangjado.',
      'The bridge hangs from cables on one tall tower.'],
    ask: 'How did life on the islands change after the bridge was built?',
    words: [['bridge', '다리'], ['island', '섬'], ['drive', '차로 가다'], ['tower', '탑']] },
  '선유도 망주봉': { name: 'Mangjubong Peak', tag: 'Nature · Travel',
    body: ['Seonyudo means “the island where sinseon (wise spirits) played.”',
      'Mangjubong is two big rock peaks in the middle of the island.',
      'Many people visit to see the sandy beach and rocky islands.'],
    ask: 'Gogunsan has many islands. How many can you find?',
    words: [['peak', '봉우리'], ['rock', '바위'], ['beach', '해변'], ['visit', '방문하다']] },
  '십이동파도 청자 난파선': { name: 'Celadon Shipwreck', tag: 'History · Heritage',
    body: ['An old ship from the Goryeo Dynasty was found under the sea near Sibidongpado.',
      'Thousands of Goryeo celadon bowls and jars were inside the ship.',
      'Finding old things under the sea is called underwater excavation.'],
    ask: 'Why did people long ago carry celadon by sea?',
    words: [['shipwreck', '난파선'], ['celadon', '청자'], ['under the sea', '바닷속'], ['found', '발견했다']] },
  '갯벌': { name: 'Mudflat', tag: 'Science · Nature',
    body: ['A mudflat is muddy land. You can see it when the sea water goes out.',
      'On the west coast, the tide comes in and goes out about twice a day.',
      'Crabs, clams and mudskippers live in the mudflat. It also helps clean the sea water.'],
    ask: 'Move the tide slider to low tide. How much of the mudflat can you see?',
    words: [['mudflat', '갯벌'], ['low tide', '썰물'], ['high tide', '밀물'], ['crab', '게']] },
};

// ── 자연환경 · 인문환경 (초등 사회: 우리 지역의 자연환경과 인문환경)
// 새로 추가하는 장소 3곳 (장면에 이미 있는 물체)
Object.assign(PLACES, {
  '명사십리 해변': {
    tag: '자연 · 지형',
    body: [
      '선유도에 있는 고운 모래 해변이에요.',
      '‘명사십리’는 고운 모래가 십 리나 길게 이어진 곳이라는 뜻의 이름이에요.',
      '파도와 바람이 오랫동안 모래를 쌓아 해변이 만들어졌어요.',
    ],
    ask: '해변이 있어서 생긴 인문환경은 무엇일까요? 장면에서 파라솔을 찾아보세요.',
  },
  '구 군산세관': {
    tag: '역사 · 건물',
    body: [
      '붉은 벽돌로 지은 오래된 건물로, 1908년에 지어졌어요.',
      '배로 들어오고 나가는 물건을 검사하고 세금을 걷던 곳이에요.',
      '지금은 옛 모습을 지켜 문화유산으로 보존하고 있어요.',
    ],
    ask: '항구 바로 옆에 세관이 있었던 까닭은 무엇일까요?',
  },
  '풍력발전기': {
    tag: '산업 · 에너지',
    body: [
      '바람의 힘으로 날개를 돌려 전기를 만드는 시설이에요.',
      '바닷가는 바람이 세고 막힌 곳이 없어 풍력발전기를 세우기 좋아요.',
      '‘바람’ 슬라이더를 움직이면 날개가 빨라지거나 느려져요.',
    ],
    ask: '바람처럼 자연을 이용하는 시설을 더 떠올려 볼까요?',
  },
});
Object.assign(PLACES_EN, {
  '명사십리 해변': { name: 'Myeongsasimni Beach', tag: 'Nature · Land',
    body: ['This is a beach with soft sand on Seonyudo Island.',
      'Myeongsasimni means “a place where fine sand goes on for a long way.”',
      'Waves and wind piled up sand for a long time and made the beach.'],
    ask: 'What did people build because of the beach? Find the beach umbrellas!',
    words: [['beach', '해변'], ['sand', '모래'], ['wave', '파도'], ['wind', '바람']] },
  '구 군산세관': { name: 'Old Gunsan Customs House', tag: 'History · Building',
    body: ['This is an old red brick building. It was built in 1908.',
      'People checked things that came in and went out by ship, and collected taxes here.',
      'Today it is kept as a heritage building.'],
    ask: 'Why was the customs house right next to the port?',
    words: [['building', '건물'], ['brick', '벽돌'], ['port', '항구'], ['old', '오래된']] },
  '풍력발전기': { name: 'Wind Turbines', tag: 'Industry · Energy',
    body: ['Wind turns the blades, and the turbine makes electricity.',
      'The seaside is windy and open, so it is a good place for wind turbines.',
      'Move the wind slider. The blades turn faster or slower.'],
    ask: 'What other things use nature to help people?',
    words: [['wind', '바람'], ['electricity', '전기'], ['blade', '날개'], ['windy', '바람이 센']] },
});

// 장소마다 자연환경/인문환경 구분, 그 까닭, 자연↔인문 연결 고리
export const ENV = {
  '갯벌': { type: 'nature', why: '바닷물이 드나들며 저절로 생긴 땅이에요.', link: '갯벌(자연환경)에서 조개·게를 잡는 어업(인문환경)이 이루어져요.' },
  '선유도 망주봉': { type: 'nature', why: '사람이 만들지 않은 섬과 바위산이에요.', link: '아름다운 섬과 바위(자연환경) 덕분에 관광지(인문환경)가 생겼어요.' },
  '명사십리 해변': { type: 'nature', why: '파도와 바람이 모래를 쌓아 저절로 생긴 해변이에요.', link: '모래 해변(자연환경)이 있어서 해수욕장과 파라솔(인문환경)이 생겼어요.' },
  '내항 뜬다리부두': { type: 'human', why: '사람이 배를 대려고 만든 시설이에요.', link: '밀물·썰물 차이가 큰 바다(자연환경) 때문에 물에 뜨는 부두(인문환경)를 만들었어요.' },
  '구 군산세관': { type: 'human', why: '사람이 지은 건물이에요.', link: '배가 드나드는 바닷가(자연환경)에 항구가 생기자 세관(인문환경)도 지었어요.' },
  '군산조선소 골리앗 크레인': { type: 'human', why: '사람이 배를 만들려고 세운 공장과 기계예요.', link: '넓은 바다(자연환경)가 가까워서 큰 배를 만들어 바로 바다에 띄울 수 있어요.' },
  '새만금방조제': { type: 'human', why: '사람이 바다를 막으려고 쌓은 둑이에요.', link: '사람이 만든 방조제(인문환경)가 갯벌과 바다(자연환경)의 모습을 바꾸었어요.' },
  '고군산대교': { type: 'human', why: '사람이 섬과 섬을 이으려고 놓은 다리예요.', link: '바다로 떨어진 섬들(자연환경) 때문에 다리(인문환경)가 필요했어요.' },
  '십이동파도 청자 난파선': { type: 'human', why: '옛날 사람들이 만든 배와 청자로, 사람이 남긴 문화유산이에요.', link: '서해 바닷길(자연환경)을 따라 청자를 배로 실어 날랐어요.' },
  '풍력발전기': { type: 'human', why: '사람이 전기를 만들려고 세운 시설이에요.', link: '바닷가의 센 바람(자연환경)을 이용해 전기(인문환경)를 만들어요.' },
};
export const ENV_NAME = { nature: { ko: '자연환경', en: 'Natural environment', icon: '🌿' }, human: { ko: '인문환경', en: 'Human environment', icon: '🏗️' } };
