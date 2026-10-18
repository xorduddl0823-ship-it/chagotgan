/*  모의 통합 시험 — 등록 흐름(register-flow) + 작업 기록 + 번호 확인 + 저장 통제기를 이어 붙여
 *  흉내 세 전산에서 단계별로 돌린다. 실제 전산에 접속하지 않는다. 값은 모두 가짜. */
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
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-flow-')), 'jobs.jsonl');
  const W = createWorld(o.world || {});
  const jobLog = createJobLog(file);
  const flow = createRegisterFlow({ jobLog, adapters: W.adapters, mock: o.mock !== false, siteConfirmed: o.siteConfirmed, now: NOW });
  return { file, W, jobLog, flow };
}

/** 한 전산을 «값 넣기 → 허락 → 사람이 저장 → 확인» 까지 */
async function doSite(t, jobId, site, data) {
  const f = await t.flow.fill(jobId, site, data || CAR);
  assert.ok(f.ok, site + ' fill: ' + f.reason);
  const a = await t.flow.allowSave(jobId, site);
  assert.ok(a.ok, site + ' allowSave: ' + a.reason);
  t.W.human.clickSave(site);
  return t.flow.afterSave(jobId, site);
}

test('정상: 카인포 → 카모두 → 엔트리 세 곳 모두 같은 번호로 끝나고 작업이 정상으로 닫힌다', async () => {
  const t = setup({ world: { carinfoRows: [{ checkNo: 'T-0050', carNo: CAR.carNo, vin: CAR.vin, date: '2025-05-01' }] } });
  const s = await t.flow.start(CAR);
  assert.strictEqual(s.oldCount, 1, '작년 점검 번호를 예전 번호로 찍어 둠');
  const pre = await t.flow.entryPrecheck(s.jobId);
  assert.ok(pre.ok);
  const r1 = await doSite(t, s.jobId, 'carinfo');
  assert.deepStrictEqual(r1, { ok: true, checkNo: 'T-0101' }, '작년 번호(T-0050)가 아닌 새 번호');
  const r2 = await doSite(t, s.jobId, 'carmodoo');
  assert.strictEqual(t.W.world.carmodoo.form.autoAssignOn, false, '카모두 «자동 부여» 꺼짐');
  assert.deepStrictEqual(r2, { ok: true, checkNo: 'T-0101' });
  const r3 = await doSite(t, s.jobId, 'entry');
  assert.deepStrictEqual(r3, { ok: true, checkNo: 'T-0101' });
  assert.deepStrictEqual(t.flow.finish(s.jobId), { ok: true });
  assert.strictEqual(t.jobLog.get(s.jobId).closed, true);
  assert.strictEqual(t.W.world.carinfo.rows.filter((r) => r.carNo === CAR.carNo).length, 2, '카인포 등록은 한 번만');
});

test('순서 지키기: 카인포가 끝나기 전에는 카모두·엔트리를 시작하지 않는다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await assert.rejects(t.flow.fill(jobId, 'carmodoo', CAR), /carinfo 이\(가\) 끝난 뒤/);
  await assert.rejects(t.flow.fill(jobId, 'entry', CAR), /carmodoo 이\(가\) 끝난 뒤/);
});

test('허락 전에 사람이 [저장]을 누르면 붙잡히고 아무것도 저장되지 않는다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await t.flow.fill(jobId, 'carinfo', CAR);
  assert.strictEqual(t.W.human.clickSave('carinfo'), 'hold');
  assert.strictEqual(t.W.world.carinfo.rows.length, 0);
});

test('두 번 누름: 허락 한 번에 저장 하나만 — 카인포에 두 줄이 생기지 않는다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await t.flow.fill(jobId, 'carinfo', CAR);
  await t.flow.allowSave(jobId, 'carinfo');
  assert.match(t.W.human.clickSave('carinfo'), /^saved:/);
  assert.strictEqual(t.W.human.clickSave('carinfo'), 'hold');
  assert.strictEqual(t.W.world.carinfo.rows.length, 1);
  assert.ok((await t.flow.afterSave(jobId, 'carinfo')).ok);
});

test('허락했지만 저장을 안 누름 → «안 나감»으로 취소되고 다시 허락할 수 있다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await t.flow.fill(jobId, 'carinfo', CAR);
  await t.flow.allowSave(jobId, 'carinfo');
  const r = await t.flow.afterSave(jobId, 'carinfo');
  assert.strictEqual(r.notSent, true);
  assert.strictEqual(t.jobLog.get(jobId).sites.carinfo.state, 'filled');
  assert.ok((await t.flow.allowSave(jobId, 'carinfo')).ok);
});

test('서버가 오류를 돌려줬지만 실제로는 저장됨 → «불확실» → 목록 확인으로 저장 확인, 두 번 등록 없음', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'serverErrorButSaved';
  const { jobId } = await t.flow.start(CAR);
  const r = await doSite(t, jobId, 'carinfo');
  assert.strictEqual(r.uncertain, true);
  assert.strictEqual((await t.flow.allowSave(jobId, 'carinfo')).ok, false, '불확실한 동안 다시 저장 금지');
  const c = await t.flow.confirmFromList(jobId, 'carinfo');
  assert.deepStrictEqual(c, { ok: true, checkNo: 'T-0101' });
  assert.strictEqual(t.W.world.carinfo.rows.length, 1);
});

test('네트워크가 끊김 → 불확실 → 프로그램을 껐다 켜도(새 흐름) 이어서 목록 확인으로 끝낼 수 있다', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'networkLost';
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  //  프로그램 다시 켬 — 같은 기록 파일로 새 작업 기록·새 흐름
  const jobLog2 = createJobLog(t.file);
  const flow2 = createRegisterFlow({ jobLog: jobLog2, adapters: t.W.adapters, mock: true, now: NOW });
  const res = flow2.resume();
  assert.strictEqual(res.list[0].sites.carinfo.state, 'uncertain');
  assert.strictEqual(jobLog2.canSubmit(jobId, 'carinfo').ok, false, '다시 켜도 두 번 저장 금지');
  const c = await flow2.confirmFromList(jobId, 'carinfo');
  assert.strictEqual(c.ok, true);
  assert.strictEqual(t.W.world.carinfo.rows.length, 1);
});

test('다른 주소 팝업으로 저장하려 함 → «알 수 없는 저장 경로»로 멈추고 대기열 전체가 멈춘다', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'foreignPopup';
  const { jobId } = await t.flow.start(CAR);
  const r = await doSite(t, jobId, 'carinfo');
  assert.strictEqual(r.stopped, true);
  assert.match(r.reason, /upload\.other\.example/);
  const b = await t.flow.start(CAR2);
  await t.flow.fill(b.jobId, 'carinfo', CAR2);
  const a = await t.flow.allowSave(b.jobId, 'carinfo');
  assert.strictEqual(a.ok, false);
  assert.match(a.reason, /앞 작업/);
});

test('차대번호가 일부만 보이면 «추가 확인 필요» → 사람이 확인하면 이어 간다', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'vinPartial';
  const { jobId } = await t.flow.start(CAR);
  const r = await doSite(t, jobId, 'carinfo');
  assert.strictEqual(r.needsConfirm, true);
  assert.strictEqual(t.jobLog.get(jobId).sites.carinfo.state, 'saveConfirmed');
  await assert.rejects(t.flow.fill(jobId, 'carmodoo', CAR), /끝난 뒤/, '확인 전에는 카모두로 못 감');
  const c = await t.flow.confirmFromList(jobId, 'carinfo', { partialConfirmedBy: '대표님' });
  assert.strictEqual(c.ok, true);
});

test('카모두 번호 칸이 카인포 번호와 다르면 저장을 허락하지 않는다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  t.W.world.faults.carmodoo = 'typo';
  await t.flow.fill(jobId, 'carmodoo', CAR);
  const a = await t.flow.allowSave(jobId, 'carmodoo');
  assert.strictEqual(a.ok, false);
  assert.match(a.reason, /번호가 다릅니다/);
});

test('카모두에 다른 번호로 저장되면 멈춘다 (다른 차 기록일 수 있음)', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  t.W.world.faults.carmodoo = 'wrongNumber';
  const r = await doSite(t, jobId, 'carmodoo');
  assert.strictEqual(r.stopped, true);
  assert.strictEqual(t.jobLog.get(jobId).sites.carmodoo.state, 'stopped');
});

test('엔트리 «다음 번호»가 다른 차 번호면 끌어온 차량번호가 달라 저장을 허락하지 않는다 (대형 사고 방지)', async () => {
  const t = setup({ world: { carinfoRows: [{ checkNo: 'T-0099', carNo: '99다9999', vin: 'KMHZZ00ZZZZ999999', date: '2026-10-19' }] } });
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  await doSite(t, jobId, 'carmodoo');
  t.W.world.entry.next = 'T-0099';                                   // 엔트리 다음 번호가 어긋남
  await t.flow.fill(jobId, 'entry', CAR);
  const a = await t.flow.allowSave(jobId, 'entry');
  assert.strictEqual(a.ok, false);
  assert.match(a.reason, /엔트리 번호|번호가 다릅니다/);
  assert.strictEqual(t.W.world.entry.rows.length, 0);
});

test('엔트리 로그인이 끊기면 값 넣기·저장 허락을 하지 않고 로그인을 요청한다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  await doSite(t, jobId, 'carmodoo');
  t.W.world.entry.loggedIn = false;
  const f = await t.flow.fill(jobId, 'entry', CAR);
  assert.strictEqual(f.needLogin, true);
  t.W.world.entry.loggedIn = true;
  assert.ok((await t.flow.fill(jobId, 'entry', CAR)).ok);
  t.W.world.entry.loggedIn = false;
  const a = await t.flow.allowSave(jobId, 'entry');
  assert.strictEqual(a.needLogin, true);
});

test('한 번에 한 대: 앞 차가 끝나기 전에는 다음 차 카인포 저장을 허락하지 않고, 앞 차가 닫히면 풀린다', async () => {
  const t = setup();
  const a = await t.flow.start(CAR);
  await doSite(t, a.jobId, 'carinfo');
  const b = await t.flow.start(CAR2);
  await t.flow.fill(b.jobId, 'carinfo', CAR2);
  assert.strictEqual((await t.flow.allowSave(b.jobId, 'carinfo')).ok, false);
  await doSite(t, a.jobId, 'carmodoo');
  await doSite(t, a.jobId, 'entry');
  assert.ok(t.flow.finish(a.jobId).ok);
  assert.ok((await t.flow.allowSave(b.jobId, 'carinfo')).ok);
});

test('저장 경로 설정이 확정되지 않은 실제 환경(mock 아님)에서는 저장을 허락하지 않는다', async () => {
  const t = setup({ mock: false, siteConfirmed: { carinfo: false } });
  const { jobId } = await t.flow.start(CAR);
  await t.flow.fill(jobId, 'carinfo', CAR);
  const a = await t.flow.allowSave(jobId, 'carinfo');
  assert.strictEqual(a.ok, false);
  assert.match(a.reason, /확인되지 않아/);
});

/* ── 검수 4차 반영 ───────────────────────────────────────────── */

test('저장 통제기 설치에 실패하면 값을 넣지 않고 저장도 하지 않는다 (통제기 먼저)', async () => {
  const t = setup();
  t.W.world.faults.armFail = 'carinfo';
  const { jobId } = await t.flow.start(CAR);
  const f = await t.flow.fill(jobId, 'carinfo', CAR);
  assert.strictEqual(f.ok, false);
  assert.match(f.reason, /통제기를 걸지 못했습니다/);
  assert.ok(!t.W.world.calls.includes('carinfo.fill'), '값 넣기를 하지 않음');
  assert.strictEqual(t.jobLog.get(jobId).sites.carinfo, undefined);
});

test('통제기는 값 넣기 «전»에 걸린다 — 값 넣는 도중 사람이 저장을 눌러도 막힘', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  const origFill = t.W.adapters.carinfo.fill;
  let during = null;
  t.W.adapters.carinfo.fill = async (d, e) => { during = t.W.human.clickSave('carinfo'); return origFill(d, e); };
  await t.flow.fill(jobId, 'carinfo', CAR);
  assert.strictEqual(during, 'hold');
  assert.strictEqual(t.W.world.carinfo.rows.length, 0);
});

test('끝난 전산은 봉인 — 같은 창에서 다시 [저장]을 눌러도 막히고, 허락도 받지 않는다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  assert.strictEqual(t.W.human.clickSave('carinfo'), 'hold', '끝난 뒤 저장 클릭 막힘');
  assert.strictEqual(t.W.world.carinfo.rows.length, 1);
  assert.strictEqual(t.W.guards.carinfo.unlock(), false, '봉인된 통제기는 허락을 받지 않음');
});

test('흐름 중에는 그 전산의 기존 단추(개별 전송 등)를 막는다 — 통제기 우회 방지', async () => {
  const t = setup();
  assert.strictEqual(t.flow.legacyBlocked('carinfo'), null, '작업이 없으면 기존 단추 그대로');
  const { jobId } = await t.flow.start(CAR);
  await t.flow.fill(jobId, 'carinfo', CAR);
  assert.match(t.flow.legacyBlocked('carinfo'), /등록 흐름 작업/);
  assert.strictEqual(t.flow.legacyBlocked('carmodoo'), null, '아직 안 쓰는 전산은 막지 않음');
});

test('카모두 저장 확인: 같은 차의 예전 점검·지운 줄을 «이번 저장»으로 잡지 않는다 (첫 줄 고르기 금지)', async () => {
  const t = setup({ world: { carmodooRows: [
    { checkNo: 'T-0010', carNo: CAR.carNo },                         // 작년 점검
    { checkNo: 'T-0020', carNo: CAR.carNo, status: '삭제' },          // 지운 재등록
  ] } });
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  const r = await doSite(t, jobId, 'carmodoo');
  assert.deepStrictEqual(r, { ok: true, checkNo: 'T-0101' });
});

test('카모두에 이번 저장 줄이 둘이면(두 번 저장 의심) 멈춘다', async () => {
  const t = setup();
  const { jobId } = await t.flow.start(CAR);
  await doSite(t, jobId, 'carinfo');
  t.W.world.faults.carmodoo = 'doubleRow';
  const r = await doSite(t, jobId, 'carmodoo');
  assert.strictEqual(r.stopped, true);
  assert.match(r.reason, /2개/);
});

test('저장 단계에서 팝업이 열리면 자동으로 끝내지 않고 사람 확인 → 사람 표시가 있어야 이어 간다', async () => {
  const t = setup();
  t.W.world.faults.carinfo = 'popupSave';
  const { jobId } = await t.flow.start(CAR);
  const r = await doSite(t, jobId, 'carinfo');
  assert.strictEqual(r.manual, true);
  assert.strictEqual(t.jobLog.get(jobId).sites.carinfo.state, 'uncertain');
  const c1 = await t.flow.confirmFromList(jobId, 'carinfo');
  assert.strictEqual(c1.ok, false);
  assert.strictEqual(c1.manual, true);
  const c2 = await t.flow.confirmFromList(jobId, 'carinfo', { manualChecked: '대표님' });
  assert.strictEqual(c2.ok, true);
});

test('값 넣기 중(딜러 고르기 등) 열린 팝업은 «저장 단계 팝업»으로 세지 않는다', () => {
  const { createSaveGuard } = require('../src/core/save-guard');
  const g = createSaveGuard({ siteHosts: ['x.mock'] });
  g.registerWindow('main', 'main'); g.attachWindow('main');
  g.registerWindow('p1', 'popup'); g.attachWindow('p1');             // 값 넣기 중 팝업
  assert.strictEqual(g.outcome().result, 'notSent');
  g.unlock();
  g.registerWindow('p2', 'popup'); g.attachWindow('p2');             // 저장 단계 팝업
  assert.strictEqual(g.outcome().result, 'manualCheck');
});

test('연결 모듈이 없는 전산(엔트리)은 «미구현»으로 멈추고, 작업이 끝난 것처럼 닫히지 않는다', async () => {
  const t = setup();
  t.W.adapters.entry.implemented = false;
  const { jobId } = await t.flow.start(CAR);
  assert.strictEqual((await t.flow.entryPrecheck(jobId)).notImplemented, true);
  await doSite(t, jobId, 'carinfo');
  await doSite(t, jobId, 'carmodoo');
  const f = await t.flow.fill(jobId, 'entry', CAR);
  assert.strictEqual(f.notImplemented, true);
  assert.match(f.reason, /끝난 것으로 표시하지 않습니다/);
  const fin = t.flow.finish(jobId);
  assert.strictEqual(fin.ok, false);
  assert.deepStrictEqual(fin.notImplemented, ['entry']);
  assert.strictEqual(t.jobLog.get(jobId).closed, false);
});
