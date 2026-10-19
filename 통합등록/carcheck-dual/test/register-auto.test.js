/*  완전 자동 등록 모의 통합 시험 (대표님 10/19 최종 지시) — 한 번 입력 → runAll 한 번 → 세 전산 등록·검증·닫기
 *  사람 조작 없이 끝나는지, 이상하면 «어느 차 · 전산 · 까닭 · 단계 · 할 일»을 내고 멈추는지, 다시 켜서 이어 하는지.
 *  실제 전산에 접속하지 않는다. 값은 모두 가짜. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createJobLog } = require('../src/core/job-log');
const { createRegisterFlow } = require('../src/core/register-flow');
const { createWorld } = require('./helpers/mock-world');

const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };
const CAR2 = { carNo: '34나5678', vin: 'KMHYY00YYYY654321' };
const NOW = () => new Date('2026-10-19T10:00:00');

function setup(o = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-auto-')), 'jobs.jsonl');
  const W = createWorld(o.world || {});
  const jobLog = createJobLog(file);
  const mk = () => createRegisterFlow({ jobLog: createJobLog(file), adapters: W.adapters, mock: true, now: NOW });
  return { file, W, jobLog, flow: mk(), mk };
}
const RUN = { pollMs: 5, waitMs: 60, sendWaitMs: 30 };

test('정상: runAll 한 번으로 세 전산 등록·번호 검증·작업 닫기까지 — 사람 조작 0번', async () => {
  const t = setup();
  const steps = [];
  const r = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, onStep: (s) => steps.push(s.siteName + ':' + s.step) });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.numbers, { carinfo: 'T-0101', carmodoo: 'T-0101', entry: 'T-0101' });
  assert.strictEqual(t.jobLog.get(r.jobId).closed, true);
  assert.deepStrictEqual(t.W.world.calls.filter((c) => c.endsWith('.clickSave')), ['carinfo.clickSave', 'carmodoo.clickSave', 'entry.clickSave'], '저장은 전산마다 정확히 한 번, 차례대로');
  assert.strictEqual(t.W.world.carinfo.rows.length, 1);
  assert.strictEqual(t.W.world.carmodoo.rows.length, 1);
  assert.strictEqual(t.W.world.entry.rows.length, 1);
  assert.ok(steps.includes('엔트리:엔트리 로그인 확인') && steps.indexOf('카인포:저장') < steps.indexOf('카모두:값 넣기'), '앞 전산 저장 확인 뒤 다음 전산');
  assert.ok(typeof r.ms === 'number' && r.times.carinfo >= 0);
});

test('두 대 연속: 차례대로 한 대씩 — 둘 다 자동으로 끝남', async () => {
  const t = setup();
  const a = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  const b = await t.flow.runAll({ ...CAR2, data: CAR2 }, RUN);
  assert.ok(a.ok && b.ok, JSON.stringify([a, b]));
  assert.strictEqual(b.numbers.carinfo, 'T-0102');
});

test('엔트리 로그인 만료면 카인포를 저장하기 «전»에 멈추고 할 일을 알려 준다', async () => {
  const t = setup({ world: { entryLoggedIn: false } });
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.siteName, '엔트리');
  assert.strictEqual(r.step, '엔트리 로그인 확인');
  assert.match(r.action, /문자 인증/);
  assert.strictEqual(r.carNo, CAR.carNo);
  assert.strictEqual(t.W.world.carinfo.rows.length, 0, '카인포에 아무것도 저장 안 함');
  //  로그인 뒤 이어 하기
  t.W.world.entry.loggedIn = true;
  const r2 = await t.flow.runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
});

test('카모두 저장 뒤 응답이 안 옴(실제로는 저장됨) → 불확실 → 다시 저장 안 함 → 이어 하기에서 목록으로 확인하고 끝까지', async () => {
  const t = setup();
  t.W.world.faults.carmodoo = 'hang';
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.siteName, '카모두');
  assert.match(r.action, /다시 저장은 하지 않았어요/);
  delete t.W.world.faults.carmodoo;
  const r2 = await t.mk().runAll({ jobId: r.jobId, data: CAR }, RUN);          // 프로그램을 다시 켠 것처럼 새 흐름
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
  assert.strictEqual(t.W.world.carmodoo.rows.length, 1, '카모두 두 번 등록 없음');
  assert.strictEqual(t.W.world.calls.filter((c) => c === 'carmodoo.clickSave').length, 1, '카모두 저장 단추는 한 번만');
});

test('요청은 나갔는데 서버에 저장 안 됨 + 응답 없음 → 불확실 → 목록에 없어도 자동으로 다시 저장하지 않음', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'hangNoSave';
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  const r2 = await t.flow.runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, false, '목록에 없다고 다시 저장하지 않음 — 사람이 «안 됨»을 골라야');
  assert.strictEqual(t.W.world.calls.filter((c) => c === 'carinfo.clickSave').length, 1);
  t.jobLog.resolve(r.jobId, 'carinfo', 'notSaved', { by: '대표님' });     // 사람이 목록에서 «안 됨» 확인
  delete t.W.world.faults.carinfo;
  const r3 = await t.flow.runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r3.ok, true, JSON.stringify(r3));
});

test('엔트리 다음 번호가 이 차 카인포 번호와 다르면 엔트리 값 넣기 전에 멈춘다 (엔트리 번호 규칙)', async () => {
  const t = setup();
  const origSeal = t.W.adapters.carmodoo.seal;
  t.W.adapters.carmodoo.seal = async () => { await origSeal(); t.W.world.entry.next = 'T-0077'; };   // 카모두 끝난 뒤 엔트리 번호가 어긋남
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.step, '엔트리 번호 규칙 확인');
  assert.match(r.reason, /T-0077/);
  assert.strictEqual(t.W.world.entry.rows.length, 0);
});

test('카모두에 다른 번호로 저장됨 → 멈춤 + «지우고 다시 등록 → 관리자 확인» 안내, 다음 차도 막힘', async () => {
  const t = setup();
  t.W.world.faults.carmodoo = 'wrongNumber';
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.siteName, '카모두');
  assert.match(r.action, /관리자 확인으로 정리/);
  const b = await t.flow.runAll({ ...CAR2, data: CAR2 }, RUN);
  assert.strictEqual(b.ok, false);
  assert.match(b.reason, /앞 작업/);
});

test('딜러를 골라야 하면 멈추고 «고른 뒤 이어 하기» — 이어 하면 끝까지', async () => {
  const t = setup();
  const orig = t.W.adapters.carmodoo.fill;
  let first = true;
  t.W.adapters.carmodoo.fill = async (d, e) => { if (first) { first = false; return { needDealerPick: true, rows: [{ name: '신동민 · 판다카' }, { name: '신동민 · 솔카' }] }; } return orig(d, e); };
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.detail.needDealerPick, true);
  assert.match(r.action, /고른 뒤/);
  const r2 = await t.flow.runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
});

test('엔트리 연결 모듈이 없으면 카인포·카모두는 자동으로 끝내고 엔트리에서 «준비 중 — 직접 등록»으로 멈춘다', async () => {
  const t = setup();
  t.W.adapters.entry.implemented = false;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.siteName, '엔트리');
  assert.match(r.action, /직접 등록/);
  const j = t.jobLog.get(r.jobId);
  assert.strictEqual(j.sites.carinfo.state, 'done');
  assert.strictEqual(j.sites.carmodoo.state, 'done');
  assert.strictEqual(j.closed, false, '끝난 것처럼 닫지 않음');
});

test('같은 차를 이미 등록 중이면 새로 시작하지 않는다 (중복 등록 의심)', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'hang';
  await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.detail.duplicate, true);
  assert.match(r.action, /이어 하기/);
  assert.strictEqual(t.W.world.calls.filter((c) => c === 'carinfo.clickSave').length, 1);
});
