/*  보안 수정 시험: 비밀번호 넣을 주소 · 팝업 주소 · 기록 파일 칸/기간 */
const test = require('node:test');
const assert = require('node:assert');
const s = require('../src/core/safety');

const CI = 'https://ai.carinfo.co.kr/ct/carcheck_list';
const CM = 'https://ck.carmodoo.com/main/index.do';

test('비밀번호는 같은 주소(https)에만 넣는다', () => {
  assert.strictEqual(s.isSiteUrl('https://ai.carinfo.co.kr/login', CI), true);
  assert.strictEqual(s.isSiteUrl('https://ck.carmodoo.com/login.do', CM), true);
  assert.strictEqual(s.isSiteUrl('http://ai.carinfo.co.kr/login', CI), false, 'http 는 안 됨');
  assert.strictEqual(s.isSiteUrl('https://ai.carinfo.co.kr.evil.example/login', CI), false);
  assert.strictEqual(s.isSiteUrl('https://evil.example/?u=ai.carinfo.co.kr', CI), false);
  assert.strictEqual(s.isSiteUrl('https://ck.carmodoo.com/login.do', CI), false, '다른 사이트 주소');
  assert.strictEqual(s.isSiteUrl('about:blank', CI), false);
  assert.strictEqual(s.isSiteUrl('', CI), false);
});

test('팝업: 빈 창·http·https 만 열고 javascript:·file:·data: 는 막는다', () => {
  ['', 'about:blank', 'https://ai.carinfo.co.kr/pop', 'http://postcode.example/'].forEach((u) => assert.strictEqual(s.popupAllowed(u), true, u));
  ['javascript:alert(1)', 'file:///C:/Windows/', 'data:text/html,hi', 'chrome://settings'].forEach((u) => assert.strictEqual(s.popupAllowed(u), false, u));
});

test('기록 파일에는 고객명·연락처·사진 파일 위치를 남기지 않는다', () => {
  const d = { carNo: '12가3456', clientName: '홍길동', dealerHp: '010-0000-0000', photo1: 'C:\\사진\\a.jpg', mileage: '12000' };
  const out = s.sanitizeRecordData(d);
  assert.deepStrictEqual(out, { carNo: '12가3456', mileage: '12000' });
  assert.strictEqual(d.clientName, '홍길동', '원래 값은 그대로');
});

test('보관 기간이 지난 기록 줄은 빼고, 날짜를 못 읽는 줄은 남긴다', () => {
  const now = Date.parse('2026-10-18T00:00:00Z');
  const lines = [
    JSON.stringify({ at: '2026-01-01T00:00:00Z', a: 1 }),
    JSON.stringify({ at: '2026-10-01T00:00:00Z', a: 2 }),
    'not json',
    '',
  ];
  const kept = s.pruneRecordLines(lines, 90, now);
  assert.strictEqual(kept.length, 2);
  assert.ok(kept[0].includes('"a":2'));
  assert.strictEqual(kept[1], 'not json');
});
