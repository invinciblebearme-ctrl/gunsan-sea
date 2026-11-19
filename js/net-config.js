// 함께 걷기 서버 설정 — server/ 폴더의 Worker 를 배포한 뒤 그 주소를 wss:// 로 적어 주세요.
// 예: export const MP_SERVER = 'wss://gunsan-sea-mp.<계정 이름>.workers.dev';
// 비워 두면 '함께 걷기' 버튼은 보이지만 "서버 연결 전" 안내만 나와요.
// 시험할 때는 주소 뒤에 ?mp=ws://127.0.0.1:8787 처럼 붙여 다른 서버를 쓸 수 있어요.
export const MP_SERVER = 'wss://gunsan-sea-mp.invinciblebearme.workers.dev';
// 방 코드 (하나로 고정). 서버 server/wrangler.toml 의 ROOM_CODE 와 같아야 해요.
export const MP_ROOM = '7703';
