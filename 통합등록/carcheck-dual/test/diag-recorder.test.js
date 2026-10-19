/*  8차 진단 기록기 (검수 보완) — «안전한 조회만 허용» 판단 · 값 없이 칸 이름만 · 개인정보 가리기와 내보내기 전 검사 */
const test = require('node:test');
const assert = require('node:assert');
const { createDiagRecorder, decide, bodyKeys, maskDiag, checkDiag } = require('../src/sites/diag-recorder');

const H = new Set(['ai.carinfo.co.kr']);
const R = [/^\/ct\/carcheck_list$/, /^\/car\/model_list$/];             // 읽기 전용으로 «확인된» 경로(시험용)
const allow = (method, url, kind) => decide({ method, url, kind }, H, R).allow;
const allowS = (method, url, kind) => decide({ method, url, kind }, H, R, true).allow;   // 정적 파일 허용 설정

test('확인된 읽기 경로만 허용: 그 전산 주소의 정적 파일 · 확인된 경로의 조회 GET 만 — 확인 안 된 GET 은 기본 차단', () => {
  //  내보냄
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/carcheck_list?carNo=12', 'xhr'), true);
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/car/model_list', 'xhr'), true, 'model 의 del 같은 짧은 말로 막지 않음');
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/js/app.js', 'script'), false, '정적 파일도 기본 차단(9차)');
  assert.strictEqual(allowS('GET', 'https://ai.carinfo.co.kr/js/app.js', 'script'), true, '허용 설정일 때만 같은 주소 코드 파일');
  assert.strictEqual(allowS('GET', 'https://cdn.example/app.js', 'script'), false, '허용 설정이어도 다른 주소는 막음');
  //  기본 차단 — 확인 안 된 GET
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/other_list', 'xhr'), false, '목록에 없는 조회');
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/carcheck_list_x', 'document'), false, '무늬는 끝까지 맞아야');
  assert.strictEqual(decide({ method: 'GET', url: 'https://ai.carinfo.co.kr/ct/carcheck_list', kind: 'xhr' }, H, []).allow, false, '목록이 비면 모두 막힘');
  assert.strictEqual(allow('GET', 'https://cdn.example/app.js', 'script'), false, '다른 주소 파일');
  //  막음 — 쓰기 · 저장처럼 보이는 GET(확인된 경로라도) · 실시간 연결·신호
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.strictEqual(allow(m, 'https://ai.carinfo.co.kr/ct/carcheck_list', 'xhr'), false, m);
  assert.strictEqual(allow('GET', 'https://ai.carinfo.co.kr/ct/carcheck_list?cmd=save', 'xhr'), false, '확인된 경로라도 cmd=save');
  assert.strictEqual(allowS('GET', 'https://ai.carinfo.co.kr/upload/photo.jpg', 'image'), false, '허용 설정이어도 주소에 upload 면 막음');
  assert.strictEqual(allow('GET', 'https://other.example/', 'subFrame'), false, '다른 주소 iframe 화면');
  assert.strictEqual(allow('GET', 'wss://ai.carinfo.co.kr/ws', 'webSocket'), false);
  assert.strictEqual(allow('POST', 'https://ai.carinfo.co.kr/log', 'ping'), false);
  assert.strictEqual(decide({ method: 'GET', url: 'https://x.example/list', kind: 'xhr' }, new Set(), R).allow, false, '주소를 모르면 막음');
});

test('기록: 막은 요청은 «경로·물음표 뒤 이름·보내려던 칸 이름»만 — 값 없음 · 창별 붙잡기는 판단만(두 번 적지 않음)', () => {
  const r = createDiagRecorder({ siteHosts: ['ai.carinfo.co.kr'], readPaths: ['^/ct/carcheck_list$'], now: () => new Date('2026-10-19T10:00:00Z') });
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

test('화면 뼈대 저장: 표 칸 글자·입력 값·선택지·페이지 코드 안 따옴표 글자는 지우고, 머리글·단추 글자·칸 이름은 남김 · 코드 파일 내용은 기본으로 안 받음', async () => {
  const { JSDOM } = require('./helpers/need-jsdom')();
  const { pageExpr } = require('../src/sites/diag-recorder');
  const dom = new JSDOM('<html><head><script>var USER="lty0823";var me=\'이택영\';</script></head><body>' +
    '<h2>성능점검 현황</h2><div class="who">이택영 (lty0823)</div>' +
    '<table id="list"><thead><tr><th>성능번호</th><th>차량번호</th></tr></thead><tbody><tr><td>26-28-604413</td><td>****5528</td></tr></tbody></table>' +
    '<input id="carNo" name="carNo" value="12가3456"><textarea id="memo">특기사항 내용</textarea>' +
    '<select id="ck"><option>선택</option><option>이택영</option></select>' +
    '<button id="btnSave" onclick="save(\'2628604413\')">저장</button><a href="/detail?no=2628604413">보기</a></body></html>',
    { runScripts: 'outside-only', url: 'https://entry.example/main' });
  const r = await dom.window.eval(pageExpr({}));
  const h = r.html;
  for (const bad of ['lty0823', '이택영', '604413', '5528', '12가3456', '특기사항 내용', '2628604413']) assert.ok(!h.includes(bad), '남으면 안 됨: ' + bad);
  for (const good of ['성능점검 현황', '<th>성능번호</th>', '<th>차량번호</th>', 'id="carNo"', 'name="carNo"', '>저장</button>', 'id="list"', 'href="/detail?…"']) assert.ok(h.includes(good), '남아야 함: ' + good);
  assert.strictEqual(r.path, '/main');
  assert.strictEqual(r.scripts.length, 0);
});

test('(10차) 진단 파일 따로 검사: 고객정보·차대번호·인증·세션·코드 원본이 있으면 걸리고, 가린 파일은 통과 — 값은 결과에 안 나옴', () => {
  const { checkFile } = require('../tools/diag-check');
  const { maskDiag } = require('../src/sites/diag-recorder');
  const dirty = JSON.stringify({ requests: { entries: [{ path: '/car/12가3456' }] }, snaps: [{ frames: [{ title: 'JSESSIONID=abc', fields: [{ id: 'KMHXX00XXXX123456' }] }], code: [{ code: 'x' }] }], note: 'Authorization: Bearer abcdefghij1234567890' });
  const f = checkFile(dirty);
  assert.ok(f['차량번호'] >= 1 && f['차대번호'] >= 1, JSON.stringify(f));
  assert.ok(f['세션 쿠키 이름(JSESSIONID 등)'] === 1 && f['인증 머리글(Authorization·Bearer)'] >= 1 && f['사이트 코드 원본'] === 1);
  assert.ok(!JSON.stringify(f).includes('3456') && !JSON.stringify(f).includes('abc'), '값은 결과에 없음');
  const clean = JSON.stringify(maskDiag({ requests: { entries: [{ path: '/car/12가3456', bodyKeys: ['carNo'] }] }, snaps: [{ frames: [{ buttons: [{ text: '저장', id: 'btnSave' }], fields: [{ tag: 'input', id: 'carNo', name: 'carNo', type: 'text' }, { id: 'dealerHp', name: 'dealerHp' }] }] }] }).data);
  assert.deepStrictEqual(checkFile(clean), {});
});

test('(12차 관찰 기록) 막지 않음 · 그 전산 화면·조회·쓰기만 기록 · 응답 번호 · 누른 단추 글자 · 값은 가림', () => {
  const r = createDiagRecorder({ siteHosts: ['ai.carinfo.co.kr'], observe: true, now: () => new Date('2026-10-19T10:00:00Z') });
  assert.strictEqual(r.observe, true);
  const save = { id: 7, method: 'POST', url: 'https://ai.carinfo.co.kr/ct/save?carNo=12%EA%B0%803456', resourceType: 'xhr', postData: JSON.stringify({ carNo: '12가3456', vin: 'KMHXX00XXXX123456' }) };
  assert.strictEqual(r.onSessionRequest(save), false, '쓰기도 막지 않음');
  assert.strictEqual(r.onSessionRequest({ method: 'GET', url: 'https://ai.carinfo.co.kr/img/a.png', resourceType: 'image' }), false);
  assert.strictEqual(r.onSessionRequest({ method: 'POST', url: 'https://other.example/log', resourceType: 'xhr', postData: 'a=1' }), false);
  assert.strictEqual(r.onRequest(save), 'ignore');
  r.onSessionCompleted({ id: 7, statusCode: 200 });
  r.noteClick({ text: '저장 010-1234-5678', tag: 'BUTTON', id: 'btnSave' });
  const s = r.summary();
  assert.strictEqual(s.held, 0);
  const e = s.entries.find((x) => x.path === '/ct/save');
  assert.ok(e && e.status === 200 && e.bodyKeys.includes('vin') && e.queryKeys.includes('carNo'), JSON.stringify(e));
  assert.ok(!s.entries.some((x) => /a\.png/.test(x.path || '')), '그림 파일은 기록 안 함');
  assert.ok(s.entries.some((x) => x.host === 'other.example'), '다른 주소로 가는 쓰기는 기록');
  assert.ok(s.entries.some((x) => x.kind === 'click' && /^저장/.test(x.text)));
  assert.ok(!/12가3456|KMHXX00XXXX123456|010-1234-5678/.test(JSON.stringify(s)), JSON.stringify(s));
});

test('(12차 검수) 주소 경로·물음표 뒤 이름·단추 이름에 섞인 개인정보도 가리고, 검토용 글에는 가린 것만 · 관찰 기록 정리 도구는 [저장] 뒤 요청을 저장 후보로', () => {
  const { reviewText, checkFile } = require('../tools/diag-check');
  const { analyze } = require('../tools/observe-map');
  let t = Date.parse('2026-10-19T10:00:00Z');
  const at = () => new Date(t += 1000).toISOString();
  const r = createDiagRecorder({ siteHosts: ['ai.carinfo.co.kr'], observe: true, now: () => new Date(t += 1000) });
  r.noteClick({ at: at(), text: '신규등록', tag: 'BUTTON', id: 'btnNew' });
  r.onSessionRequest({ id: 1, method: 'POST', url: 'https://ai.carinfo.co.kr/ct/new/12가3456', resourceType: 'xhr', postData: 'carNo=12%EA%B0%803456' });
  r.noteClick({ at: at(), text: '저장', tag: 'BUTTON', id: 'save_01012345678' });
  r.onSessionRequest({ id: 2, method: 'POST', url: 'https://ai.carinfo.co.kr/ct/save/KMHXX00XXXX123456?hp01098765432=1', resourceType: 'xhr', postData: '{"vin":"KMHXX00XXXX123456"}' });
  r.onSessionCompleted({ id: 2, statusCode: 200 });
  r.onSessionRequest({ id: 3, method: 'GET', url: 'https://ai.carinfo.co.kr/ct/carcheck_list', resourceType: 'xhr' });
  const { data } = maskDiag({ site: 'carinfo', mode: 'observe', requests: r.summary(), snaps: [] });
  const text = JSON.stringify(data);
  assert.deepStrictEqual(checkDiag(text), {});
  assert.deepStrictEqual(checkFile(text), {});
  assert.ok(!/12가3456|KMHXX00XXXX123456|01012345678|01098765432/.test(text), text);
  const rv = reviewText(text);
  assert.ok(/요청 \| POST ai\.carinfo\.co\.kr \/ct\/save/.test(rv) && /보낸 칸 이름 \| vin/.test(rv) && /누른 단추 \| 저장/.test(rv), rv);
  assert.ok(!/12가3456|KMHXX00XXXX123456|01012345678/.test(rv));
  //  시각을 붙인 원본(가리기 전 시각은 그대로)으로 정리 — 저장 후보는 [저장] 뒤 요청 하나
  const m = analyze(data);
  assert.strictEqual(m.proposal.savePatterns.length, 1);
  assert.strictEqual(m.proposal.savePatterns[0], '^/ct/save/[^/]+$', '가린 부분은 아무 글자로');
  assert.ok(new RegExp(m.proposal.savePatterns[0]).test('/ct/save/KMHAA00AAAA111111'));
  assert.strictEqual(m.proposal.phaseAllow.prepare.length, 1);
  assert.ok(m.proposal.diagReadPaths.some((p) => /carcheck_list/.test(p)));
});
