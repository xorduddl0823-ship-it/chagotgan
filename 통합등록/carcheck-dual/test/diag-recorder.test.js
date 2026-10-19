/*  8차 진단 기록기 — 쓰기 요청은 하나도 내보내지 않고, 값 없이 «주소 경로·칸 이름»만 기록하는지 */
const test = require('node:test');
const assert = require('node:assert');
const { createDiagRecorder, bodyKeys } = require('../src/sites/diag-recorder');

test('진단 기록기: POST·PUT·DELETE 는 언제나 붙잡고, 저장처럼 보이는 GET 도 붙잡고, 조회 GET 만 내보냄 · 어떤 허락도 받지 않음', () => {
  const r = createDiagRecorder({ siteHosts: ['ai.carinfo.co.kr'], now: () => new Date('2026-10-19T10:00:00Z') });
  const q = (method, url, kind = 'ajax', postData) => r.onRequest({ id: 'x', method, url, kind, windowId: 'main', postData });
  assert.strictEqual(q('POST', 'https://ai.carinfo.co.kr/ct/carcheck_save.do', 'ajax', 'carNo=12%EA%B0%803456&vin=KMHXX&checkDate=2026-10-19'), 'hold');
  assert.strictEqual(q('PUT', 'https://ai.carinfo.co.kr/api/x'), 'hold');
  assert.strictEqual(q('DELETE', 'https://ai.carinfo.co.kr/api/x'), 'hold');
  assert.strictEqual(q('POST', 'https://other.example/upload', 'popup'), 'hold');
  assert.strictEqual(q('GET', 'https://ai.carinfo.co.kr/ct/insertPhoto.do?no=1'), 'hold', 'GET 저장');
  assert.strictEqual(q('GET', 'https://ai.carinfo.co.kr/ct/carcheck_list?carNo=12'), 'ignore');
  assert.strictEqual(q('GET', 'https://ai.carinfo.co.kr/car/model_list'), 'ignore', 'model 의 del 같은 짧은 말로 막지 않음');
  assert.strictEqual(r.unlock(), false);
  const s = r.summary();
  assert.strictEqual(s.held, 5);
  const text = JSON.stringify(s);
  assert.ok(!/3456|KMHXX|2026-10-19T|12가/.test(text.replace(/"at":"[^"]+"/g, '')), '값은 기록에 없음');
  const save = s.entries.find((e) => /carcheck_save/.test(e.path));
  assert.deepStrictEqual(save.bodyKeys, ['carNo', 'vin', 'checkDate']);
  assert.strictEqual(s.entries.find((e) => e.host === 'other.example').foreign, true);
  assert.deepStrictEqual(s.entries.find((e) => /carcheck_list/.test(e.path)).queryKeys, ['carNo'], '물음표 뒤는 이름만');
});

test('보낸 자료에서 칸 이름만: JSON · 폼 · 파일 올리기', () => {
  assert.deepStrictEqual(bodyKeys('{"site":"carinfo","carNo":"12가3456"}'), ['site', 'carNo']);
  assert.deepStrictEqual(bodyKeys('a=1&b=2&a=3'), ['a', 'b']);
  assert.deepStrictEqual(bodyKeys('------x\r\nContent-Disposition: form-data; name="photo1"; filename="a.jpg"\r\n'), ['photo1']);
  assert.deepStrictEqual(bodyKeys(''), []);
});

test('화면 뼈대 저장: 표 칸 글자·입력 값·선택지·페이지 코드 안 따옴표 글자는 지우고, 머리글·단추 글자·칸 이름은 남김', async () => {
  const { JSDOM } = require('./node_modules/jsdom');
  const { PAGE_EXPR } = require('../src/sites/diag-recorder');
  const dom = new JSDOM('<html><head><script>var USER="lty0823";var me=\'이택영\';</script></head><body>' +
    '<h2>성능점검 현황</h2><div class="who">이택영 (lty0823)</div>' +
    '<table id="list"><thead><tr><th>성능번호</th><th>차량번호</th></tr></thead><tbody><tr><td>26-28-604413</td><td>****5528</td></tr></tbody></table>' +
    '<input id="carNo" name="carNo" value="12가3456"><textarea id="memo">특기사항 내용</textarea>' +
    '<select id="ck"><option>선택</option><option>이택영</option></select>' +
    '<button id="btnSave" onclick="save(\'2628604413\')">저장</button><a href="/detail?no=2628604413">보기</a></body></html>',
    { runScripts: 'outside-only', url: 'https://entry.example/main' });
  const r = await dom.window.eval(PAGE_EXPR);
  const h = r.html;
  for (const bad of ['lty0823', '이택영', '604413', '5528', '12가3456', '특기사항 내용', '2628604413']) assert.ok(!h.includes(bad), '남으면 안 됨: ' + bad);
  for (const good of ['성능점검 현황', '<th>성능번호</th>', '<th>차량번호</th>', 'id="carNo"', 'name="carNo"', '>저장</button>', 'id="list"', 'href="/detail?…"']) assert.ok(h.includes(good), '남아야 함: ' + good);
  assert.strictEqual(r.path, '/main');
  assert.strictEqual(r.scripts.length, 0);
});
