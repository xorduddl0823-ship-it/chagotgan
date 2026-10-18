/*  저장 통제기 모의 시험 — AJAX·form·팝업·두 번 누름·네트워크 실패·창 닫힘·취소·응답 없음
 *  실제 사이트가 아니라 «일어난 일의 순서»를 흉내 낸다. 저장 주소 무늬는 시험용 가짜. */
const test = require('node:test');
const assert = require('node:assert');
const { createSaveGuard } = require('../src/core/save-guard');
const { createJobLog } = require('../src/core/job-log');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = 'https://site.example';
const guard = () => createSaveGuard({
  siteHost: 'site.example',
  savePatterns: ['/save', '/insert'],
  saveGetPatterns: ['/doSave\\.do'],
  readAllow: ['/search', '/list'],
});
let n = 0;
const req = (pathname, method, kind) => ({ id: 'r' + (++n), url: SITE + pathname, method, kind });

test('잠긴 동안에는 AJAX·form·팝업 저장이 모두 붙잡힌다 (저장 주소 목록에 없는 쓰기 요청도)', () => {
  const g = guard();
  assert.strictEqual(g.onRequest(req('/api/save', 'POST', 'ajax')), 'hold');
  assert.strictEqual(g.onRequest(req('/carCheck/regist.do', 'POST', 'form')), 'hold', '목록에 없는 주소도 쓰기 요청이면 붙잡음');
  assert.strictEqual(g.onRequest(req('/pop/upload', 'PUT', 'popup')), 'hold');
  assert.strictEqual(g.onRequest(req('/doSave.do?x=1', 'GET', 'form')), 'hold', 'GET 으로 저장하는 주소도');
  assert.strictEqual(g.onRequest(req('/list', 'GET', 'ajax')), 'ignore', '조회는 통과');
  assert.strictEqual(g.onRequest(req('/search', 'POST', 'ajax')), 'ignore', '조회용 쓰기 요청은 통과');
  assert.strictEqual(g.onRequest({ id: 'x', url: 'https://cdn.example/a.js', method: 'GET' }), 'ignore');
  assert.strictEqual(g.blockedCount, 4);
  assert.deepStrictEqual(g.outcome(), { result: 'notSent', sent: 0, blocked: 4 });
});

test('허락 한 번에 저장 요청 하나만 — 두 번 누르면 둘째는 붙잡힌다', () => {
  const g = guard();
  g.unlock();
  const a = req('/api/save', 'POST', 'ajax');
  assert.strictEqual(g.onRequest(a), 'pass');
  assert.strictEqual(g.onRequest(req('/api/save', 'POST', 'ajax')), 'hold');
  g.onResponse(a.id, 200);
  assert.strictEqual(g.outcome().result, 'saved');
  assert.strictEqual(g.sentCount, 1);
});

test('form 저장도 같은 규칙 (허락 → 하나 내보냄 → 302 넘김 응답 → saved), 응답 0 은 «불확실»', () => {
  const g = guard();
  g.unlock();
  const f = req('/carCheck/regist.do', 'POST', 'form');
  assert.strictEqual(g.onRequest(f), 'pass');
  assert.strictEqual(g.outcome().result, 'waiting');
  g.onResponse(f.id, 302);
  assert.strictEqual(g.outcome().result, 'saved');
  const g2 = guard();
  g2.unlock();
  const f2 = req('/carCheck/regist.do', 'POST', 'form');
  g2.onRequest(f2);
  g2.onResponse(f2.id, 0);
  assert.strictEqual(g2.outcome().result, 'uncertain');
});

test('팝업에서 나가는 저장도 같은 규칙', () => {
  const g = guard();
  g.unlock();
  const p = req('/pop/insert', 'POST', 'popup');
  assert.strictEqual(g.onRequest(p), 'pass');
  g.onResponse(p.id, 200);
  assert.strictEqual(g.outcome().result, 'saved');
});

test('네트워크가 끊기면 «실패»가 아니라 «불확실» — 서버에 닿았는지 모르므로', () => {
  const g = guard();
  g.unlock();
  const a = req('/api/save', 'POST', 'ajax');
  g.onRequest(a);
  g.onNetworkError(a.id);
  assert.strictEqual(g.outcome().result, 'uncertain');
});

test('저장 요청이 나간 뒤 창이 닫히면 «불확실», 그 뒤 요청은 모두 붙잡힘', () => {
  const g = guard();
  g.unlock();
  g.onRequest(req('/api/save', 'POST', 'ajax'));
  g.onWindowClosed();
  assert.strictEqual(g.outcome().result, 'uncertain');
  g.unlock();
  assert.strictEqual(g.onRequest(req('/api/save', 'POST', 'ajax')), 'hold');
});

test('응답을 끝내 못 받으면(시간 초과) «불확실»', () => {
  const g = guard();
  g.unlock();
  g.onRequest(req('/api/save', 'POST', 'ajax'));
  g.onTimeout();
  assert.strictEqual(g.outcome().result, 'uncertain');
});

test('서버가 분명한 오류(500)를 주면 «실패»', () => {
  const g = guard();
  g.unlock();
  const a = req('/api/save', 'POST', 'ajax');
  g.onRequest(a);
  g.onResponse(a.id, 500);
  assert.strictEqual(g.outcome().result, 'failed');
});

test('허락했지만 사람이 저장을 누르지 않고 창을 닫음 → «안 나감»(notSent) → 작업 기록에서 취소 가능', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-guard-'));
  const log = createJobLog(path.join(dir, 'jobs.jsonl'));
  const id = log.newJob({ carNo: '12가3456', vin: 'KMHXX00XXXX123456' });
  log.mark(id, 'carinfo', 'filled');
  assert.ok(log.beginSubmit(id, 'carinfo').ok);
  const g = guard();
  g.unlock();
  g.onWindowClosed();
  const o = g.outcome();
  assert.strictEqual(o.result, 'notSent');
  log.cancelSubmit(id, 'carinfo', { sentCount: g.sentCount });
  assert.strictEqual(log.get(id).sites.carinfo.state, 'filled');
});

test('저장 요청이 나갔고 결과가 불확실하면 작업 기록에서 취소할 수 없다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-guard-'));
  const log = createJobLog(path.join(dir, 'jobs.jsonl'));
  const id = log.newJob({ carNo: '12가3456', vin: 'KMHXX00XXXX123456' });
  log.mark(id, 'carinfo', 'filled');
  log.beginSubmit(id, 'carinfo');
  const g = guard();
  g.unlock();
  const a = req('/api/save', 'POST', 'ajax');
  g.onRequest(a);
  g.onNetworkError(a.id);
  assert.strictEqual(g.outcome().result, 'uncertain');
  assert.throws(() => log.cancelSubmit(id, 'carinfo', { sentCount: g.sentCount }), /확실하지 않아/);
  assert.strictEqual(log.canSubmit(id, 'carinfo').ok, false);
});
