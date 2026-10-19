/*  (10/19 경기조합 중복 6건 사고 뒤) 기존 업무용 전송 경로의 «같은 차 새 등록 막기» — 화면 흉내(jsdom)로 확인
 *  · 카인포 [신규등록 + 가져오기]: 목록에 같은 차 오늘 줄이 있으면 [신규등록]을 누르지 않음 · 목록 표를 못 찾으면 누르지 않음
 *  · 경기조합: 사진 자동 올리기 꺼짐(사진 자리를 누르지 않음) — 코드 확인
 *  (경기조합 [경기조합만] 실제 실행은 test/electron/legacy-carmodoo-run.js 로 진짜 프로그램을 띄워 확인) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { buildPrepareScript } = require('../src/carinfo-prepare');

const d = new Date();
const TODAY = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function carinfoPage(rows, withTable = true) {
  const { JSDOM } = require('./helpers/need-jsdom')();
  const tr = rows.map((r) => '<tr><td>1</td><td>' + r.date + '</td><td>' + r.car + '</td><td>' + r.no + '</td></tr>').join('');
  const dom = new JSDOM('<!doctype html><body><button id=btnNewCarcheck>신규등록</button>' +
    (withTable ? '<table id=carcheckTable><thead><tr><th>번호</th><th>점검일</th><th>차량번호</th><th>점검번호</th></tr></thead><tbody>' + tr + '</tbody></table>' : '') +
    '</body>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.jQuery = function () { return { find: () => ({ val: () => ({ trigger: () => {} }) }), val: () => ({ trigger() { return this; } }) }; };
  w.__newClicks = 0;
  w.document.getElementById('btnNewCarcheck').addEventListener('click', () => { w.__newClicks++; });
  return w;
}
const run = (w, carNo) => w.eval(buildPrepareScript({ carNo, dealer: '시험딜러' }));

test('카인포 [신규등록]: 같은 차 오늘 줄이 이미 있으면 신규등록을 누르지 않고 점검번호와 함께 멈춤', async () => {
  const w = carinfoPage([{ date: TODAY, car: '99가 9999', no: '2600000002' }, { date: TODAY, car: '11나1111', no: '2600000001' }]);
  const r = await run(w, '99가9999');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /오늘 등록이 이미 있어요\(점검번호 2600000002\)/);
  assert.strictEqual(w.__newClicks, 0, '[신규등록]을 누르지 않음');
});

test('카인포 [신규등록]: 목록 표를 못 찾으면 «확인 못 함»으로 멈춤 — 누르지 않음', async () => {
  const w = carinfoPage([], false);
  const r = await run(w, '99가9999');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /확인하지 못했어요/);
  assert.strictEqual(w.__newClicks, 0);
});

test('카인포 [신규등록]: 같은 차가 다른 날 있거나 다른 차만 있으면 신규등록으로 넘어감', async () => {
  const w = carinfoPage([{ date: '2026-09-06', car: '99가9999', no: '2600000000' }, { date: TODAY, car: '11나1111', no: '2600000001' }]);
  await run(w, '99가9999');
  assert.strictEqual(w.__newClicks, 1, '같은 차 확인을 지나 [신규등록]을 한 번 누름');
});

test('경기조합 사진 자동 올리기는 꺼져 있고, 새 접수는 차량번호·같은 차 확인 뒤에만 열림(코드 확인)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(src, /const CARMODOO_PHOTO_AUTO = false;/);
  const ens = src.slice(src.indexOf('async function ensureCarmodooForm'), src.indexOf("const opened = await runScript(win, CM_OPEN_FORM_EXPR"));
  assert.ok(/if \(!String\(carNo/.test(ens) && /if \(!seen\) return \{ ok: false/.test(ens) && /if \(seen\.same\.length\)/.test(ens), '차량번호 없음·리스트 확인 못 함·같은 차 있음 → 새 접수 안 엶');
});
