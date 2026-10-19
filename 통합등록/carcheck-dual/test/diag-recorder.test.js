/*  8차 진단 기록기 (검수 보완) — «안전한 조회만 허용» 판단 · 값 없이 칸 이름만 · 개인정보 가리기와 내보내기 전 검사 */
const test = require('node:test');
const assert = require('node:assert');
const { createDiagRecorder, decide, bodyKeys, maskDiag, checkDiag } = require('../src/sites/diag-recorder');

const H = new Set(['ai.carinfo.co.kr']);
const allow = (method, url, kind) => decide({ method, url, kind }, H).allow;

test('안전한 조회만 내보냄: 그림·코드 파일 GET · 그 전산 주소의 조회 GET 만 — 나머지는 모두 막음', () => {
  //  내보냄
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/carcheck_list?carNo=12', 'xhr'), true);
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/car/model_list', 'xhr'), true, 'model 의 del 같은 짧은 말로 막지 않음');
  assert.strictEqual(allow('GET', 'https://cdn.example/app.js', 'script'), true, '정적 코드 파일');
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/upload/photo.jpg', 'image'), true, '그림은 주소에 upload 가 있어도 보기만');
  //  막음 — 쓰기
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.strictEqual(allow(m, 'https://ai.carinfo.co.kr/ct/list', 'xhr'), false, m);
  //  막음 — GET 으로 바꾸는 요청
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/insertPhoto.do?no=1', 'xhr'), false, '주소에 insert');
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/api?cmd=save&no=1', 'xhr'), false, '물음표 뒤 cmd=save');
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/api?mode=delete', 'document'), false, '화면 이동도');
  //  막음 — 다른 주소로 가는 화면·조회, 실시간 연결·신호
  assert.strictEqual(allow('GET', 'https://other.example/list', 'xhr'), false);
  assert.strictEqual(allow('GET', 'https://other.example/', 'subFrame'), false, '다른 주소 iframe 화면');
  assert.strictEqual(allow('GET', 'wss://ai.carinfo.co.kr/ws', 'webSocket'), false);
  assert.strictEqual(allow('POST', 'https://ai.carinfo.co.kr/log', 'ping'), false);
  //  주소를 모르면 화면·조회 GET 도 막음
  assert.strictEqual(decide({ method: 'GET', url: 'https://x.example/list', kind: 'xhr' }, new Set()).allow, false);
});

test('기록: 막은 요청은 «경로·물음표 뒤 이름·보내려던 칸 이름»만 — 값 없음 · 창별 붙잡기는 판단만(두 번 적지 않음)', () => {
  const r = createDiagRecorder({ siteHosts: ['ai.carinfo.co.kr'], now: () => new Date('2026-10-19T10:00:00Z') });
  assert.strictEqual(r.onSessionRequest({ method: 'POST', url: 'https://ai.carinfo.co.kr/ct/carcheck_save.do?no=2628604413', resourceType: 'xhr', postData: 'carNo=12%EA%B0%803456&vin=KMHXX00XXXX123456' }), true);
  assert.strictEqual(r.onSessionRequest({ method: 'GET', url: 'https://ai.carinfo.co.kr/ct/carcheck_list', resourceType: 'xhr' }), false);
  assert.strictEqual(r.onRequest({ method: 'POST', url: 'https://ai.carinfo.co.kr/x', kind: 'ajax' }), 'hold');
  assert.strictEqual(r.onRequest({ method: 'GET', url: 'https://ai.carinfo.co.kr/ct/carcheck_list', kind: 'ajax' }), 'ignore');
  assert.strictEqual(r.unlock(), false);
  const s = r.summary();
  assert.strictEqual(s.entries.length, 2, '세션 거르개에서만 기록');
  const save = s.entries.find((e) => /carcheck_save/.test(e.path));
  assert.deepStrictEqual(save.bodyKeys, ['carNo', 'vin']);
  assert.deepStrictEqual(save.queryKeys, ['no']);
  assert.ok(!/3456|KMHXX|2628604413/.test(JSON.stringify(s)), '값은 기록에 없음');
});

test('보낸 자료에서 칸 이름만: JSON · 폼 · 파일 올리기(파일 이름은 버림)', () => {
  assert.deepStrictEqual(bodyKeys('{"site":"carinfo","carNo":"12가3456"}'), ['site', 'carNo']);
  assert.deepStrictEqual(bodyKeys('a=1&b=2&a=3'), ['a', 'b']);
  assert.deepStrictEqual(bodyKeys('------x\r\nContent-Disposition: form-data; name="photo1"; filename="a.jpg"\r\n'), ['photo1']);
  assert.deepStrictEqual(bodyKeys(''), []);
});

test('개인정보 가리기 → 내보내기 전 검사: 주소·속성·단추 글자·칸 이름·화면 뼈대 어디에 있어도 가리고, 남은 것이 없어야 파일을 만듦', () => {
  const raw = {
    at: '2026-10-19T10:00:00.000Z',
    requests: { entries: [{ path: '/car/12가3456/detail', queryKeys: ['token'], bodyKeys: ['010-1234-5678'] }] },
    snaps: [{ frames: [{ title: '홍길동 010-9876-5432', buttons: [{ text: '34나5678 보기' }, { text: '김가온 (gaon0823)' }], fields: [{ id: 'vin_KMHXX00XXXX123456', placeholder: 'a@b.co.kr' }],
      page: { html: '<td data-x="">2628604413</td><a href="/x?…">abcdEFGH1234567890abcdEFGH12</a> 880101-1234567 123-45-67890 02-575-5799' } }] }],
  };
  const { data, masked } = maskDiag(raw);
  const text = JSON.stringify(data);
  for (const bad of ['12가3456', '010-1234-5678', '010-9876-5432', '34나5678', 'KMHXX00XXXX123456', 'a@b.co.kr', '2628604413', 'abcdEFGH1234567890abcdEFGH12', '880101-1234567', '123-45-67890', '02-575-5799', 'gaon0823', '김가온']) {
    assert.ok(!text.includes(bad), '남으면 안 됨: ' + bad);
  }
  assert.ok(masked['휴대폰 번호'] >= 2 && masked['차량번호'] >= 2 && masked['차대번호'] >= 1);
  assert.deepStrictEqual(checkDiag(text), {}, '가린 뒤에는 남은 것 없음');
  assert.ok(text.includes('"at":"2026-10-19T10:00:00.000Z"'), '시각은 그대로');
  //  가리지 않은 글이면 검사가 잡아냄(파일을 만들지 않게)
  assert.ok(Object.keys(checkDiag(JSON.stringify(raw))).length >= 3);
  assert.ok(checkDiag('{"x":"password=abcd1234"}')['비밀번호·인증 값 모양'] === 1);
});
