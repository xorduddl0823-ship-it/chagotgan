/*  엔트리 로그인·문자 인증 처리 (대표님 필수 조건 10/19) — 약 30분이면 인증이 끊긴다
 *  ① 시작 전 확인 ② 엔트리 일 직전 확인 ③ 끊기면 잠시 멈추고 직원 재인증 요청 ④ 인증되면 다시 확인
 *  ⑤ 끝난 단계는 건너뛰고 남은 단계부터 ⑥ 불확실한 저장은 다시 저장하지 않고 목록부터 ⑦ 우회·자동 입력·억지 연장 없음
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

function setup(o = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-login-')), 'jobs.jsonl');
  const W = createWorld(o.world || {});
  let t = new Date('2026-10-19T10:00:00').getTime();
  const clock = { now: () => new Date(t), add: (ms) => { t += ms; } };
  const flow = createRegisterFlow({ jobLog: createJobLog(file), adapters: W.adapters, mock: true, now: clock.now });
  return { file, W, flow, clock, jobLog: () => createJobLog(file) };
}
const RUN = { pollMs: 5, waitMs: 60, sendWaitMs: 30, loginPollMs: 10 };
const saves = (W) => W.world.calls.filter((c) => c.endsWith('.clickSave'));

test('엔트리 일 직전에 인증이 끊기면 잠시 멈추고 재인증을 기다렸다가 — 카인포·카모두는 건너뛰고 엔트리만 이어서 끝냄', async () => {
  const t = setup();
  const asked = [];
  let cut = false;
  const steps = [];
  const r = await t.flow.runAll({ ...CAR, data: CAR }, {
    ...RUN, loginWaitMs: 3000,
    onStep: (s) => {
      steps.push(s.siteName + ':' + s.step + (s.needLogin ? ':기다림' : '') + (s.loginBack ? ':확인' : ''));
      if (!cut && s.site === 'entry' && s.step === '엔트리 번호 규칙 확인') { cut = true; t.W.world.entry.loggedIn = false; }   // 약 30분 지나 끊김
    },
    onNeedLogin: (info) => { asked.push(info); setTimeout(() => { t.W.world.entry.loggedIn = true; }, 50); },               // 직원이 직접 문자 인증
  });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(asked.length, 1, '직원에게 한 번 요청');
  assert.match(asked[0].action, /직접 로그인.*문자 인증/);
  assert.deepStrictEqual(saves(t.W), ['carinfo.clickSave', 'carmodoo.clickSave', 'entry.clickSave'], '끝난 전산은 다시 저장하지 않음 — 저장은 전산마다 한 번');
  assert.strictEqual(t.W.world.carinfo.rows.length, 1);
  assert.strictEqual(t.W.world.carmodoo.rows.length, 1);
  assert.strictEqual(t.W.world.entry.rows.length, 1);
  assert.ok(t.W.world.calls.includes('entry.release'), '기다리는 동안 엔트리 저장 통제기를 풀어 직원 로그인 요청이 막히지 않게');
  assert.ok(steps.includes('엔트리:엔트리 문자 재인증 기다림:기다림') && steps.includes('엔트리:엔트리 문자 재인증 기다림:확인'));
  assert.ok((r.notes || []).some((n) => /재인증 뒤 이어서/.test(n)));
  assert.strictEqual(t.jobLog().get(r.jobId).closed, true);
});

test('기다리는 동안 프로그램은 새로 고치기·요청을 하지 않는다(억지 세션 연장 없음) — 화면 글자만 확인', async () => {
  const t = setup();
  let cut = false, mark = -1, back = -1;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, {
    ...RUN, loginWaitMs: 3000,
    onStep: (s) => {
      if (!cut && s.site === 'entry' && s.step === '엔트리 번호 규칙 확인') { cut = true; t.W.world.entry.loggedIn = false; }
      if (s.loginBack) back = t.W.world.calls.length;
    },
    onNeedLogin: () => { mark = t.W.world.calls.length; setTimeout(() => { t.W.world.entry.loggedIn = true; }, 80); },
  });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.ok(mark >= 0 && back >= mark);
  assert.deepStrictEqual(t.W.world.calls.slice(mark, back), [], '기다리는 동안 전산 화면 조작 0번');
});

test('엔트리 [저장] 직후 인증이 끊겨 결과가 불확실하면 — 재인증 뒤 다시 저장하지 않고 목록으로 실제 등록 여부부터 확인', async () => {
  const t = setup();
  let cut = false;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, {
    ...RUN, loginWaitMs: 3000,
    onStep: (s) => { if (!cut && s.site === 'entry' && s.step === '저장 뒤 번호 확인') { cut = true; t.W.world.entry.loggedIn = false; } },
    onNeedLogin: () => { setTimeout(() => { t.W.world.entry.loggedIn = true; }, 50); },
  });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(saves(t.W).filter((c) => c === 'entry.clickSave'), ['entry.clickSave'], '엔트리 [저장]은 딱 한 번 — 다시 누르지 않음');
  assert.strictEqual(t.W.world.entry.rows.length, 1);
  assert.strictEqual(r.numbers.entry, r.numbers.carinfo);
});

test('끊긴 채 목록을 읽지 않는다 — 빈 목록을 «저장 안 됨»으로 판단하지 않고 상태는 불확실 그대로', async () => {
  const t = setup();
  let cut = false;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, {
    ...RUN,                                                         // 기다리기 없음(0) → 바로 멈춤
    onStep: (s) => { if (!cut && s.site === 'entry' && s.step === '저장 뒤 번호 확인') { cut = true; t.W.world.entry.loggedIn = false; } },
  });
  assert.strictEqual(r.ok, false);
  assert.ok(r.detail.needLogin && r.detail.uncertain, JSON.stringify(r.detail));
  assert.match(r.action, /다시 저장하지 않고 목록부터/);
  assert.strictEqual(t.jobLog().get(r.jobId).sites.entry.state, 'uncertain');
  //  나중에 직원이 인증하고 [이어 하기]
  t.W.world.entry.loggedIn = true;
  const r2 = await t.flow.runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
  assert.deepStrictEqual(saves(t.W).filter((c) => c === 'entry.clickSave'), ['entry.clickSave']);
});

test('정해진 시간 안에 재인증이 없으면 멈추고 [이어 하기] 안내 — 카인포는 저장 전이라 아무것도 안 바뀜', async () => {
  const t = setup({ world: { entryLoggedIn: false } });
  const r = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, loginWaitMs: 120 });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.step, '엔트리 로그인 확인');
  assert.match(r.reason, /기다렸어요/);
  assert.match(r.action, /이어 하기/);
  assert.strictEqual(saves(t.W).length, 0);
  assert.strictEqual(t.W.world.carinfo.rows.length, 0);
});

test('[기다리기 그만]을 누르면 바로 멈춤 — 다음에 [이어 하기]로 남은 단계부터', async () => {
  const t = setup({ world: { entryLoggedIn: false } });
  let stop = false;
  const t0 = Date.now();
  const r = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, loginWaitMs: 60000, shouldStop: () => stop, onNeedLogin: () => setTimeout(() => { stop = true; }, 30) });
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /멈췄어요/);
  assert.ok(Date.now() - t0 < 5000);
  t.W.world.entry.loggedIn = true;
  const r2 = await t.flow.runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
});

test('약 30분 사전 경고 — 로그인 확인 뒤 25분이 지나면 알리기만 하고 멈추지 않음(멈춤은 실제 로그인 상태로만)', async () => {
  const t = setup();
  const notes = [];
  const a = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, onStep: (s) => { if (s.note) notes.push(s.note); } });
  assert.strictEqual(a.ok, true);
  assert.ok(!notes.some((n) => /분 넘었어요/.test(n)), '처음엔 경고 없음');
  t.clock.add(26 * 60 * 1000);
  const b = await t.flow.runAll({ ...CAR2, data: CAR2 }, { ...RUN, onStep: (s) => { if (s.note) notes.push(s.note); } });
  assert.strictEqual(b.ok, true, '경고만 — 실제로 로그인돼 있으면 그대로 진행');
  assert.ok(notes.some((n) => /26분 넘었어요/.test(n)));
  assert.ok((b.notes || []).some((n) => /분 넘었어요/.test(n)));
  //  끊겼다가 다시 로그인하면 시간은 새로 셈
  t.W.world.entry.loggedIn = false;
  await t.flow.entryPrecheck(b.jobId).catch(() => {});
  t.W.world.entry.loggedIn = true;
  const c = await t.flow.runAll({ carNo: '56다7890', vin: 'KMHAA00AAAA111111', data: { carNo: '56다7890', vin: 'KMHAA00AAAA111111' } }, RUN);
  assert.ok(c.ok && !(c.notes || []).some((n) => /분 넘었어요/.test(n)), JSON.stringify(c));
});

test('코드 확인 — 인증 우회·문자 자동 입력·억지 세션 연장이 없다', () => {
  const src = ['src/core/register-flow.js', 'src/sites/flow-adapters.js', 'main.js']
    .map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  //  기다리기 고리 안에서는 entryLogin(화면 글자 읽기)만 — 새로 고치기·단추 누르기·값 넣기 없음
  const flowSrc = fs.readFileSync(path.join(__dirname, '..', 'src/core/register-flow.js'), 'utf8');
  const loop = flowSrc.slice(flowSrc.indexOf('while (Date.now() < deadline)'), flowSrc.indexOf('if (!back)'));
  assert.ok(loop.length > 0);
  assert.ok(!/refresh|reload|clickSave|fill|readNext|loadURL/.test(loop), loop);
  //  인증번호·비밀번호를 프로그램이 엔트리 화면에 넣는 코드 없음
  assert.ok(!/(인증번호|otp|sms)[^\n]{0,80}\.value\s*=/i.test(src));
  assert.ok(!/keepAlive|keep-alive-session|setInterval\([^)]*entry/i.test(src));
});

test('기다리는 한도는 재인증을 부탁할 때마다 새로 — 등록이 오래 걸린 뒤 두 번째로 끊겨도 다시 기다림', async () => {
  const t = setup({ world: { entryLoggedIn: false } });
  let asked = 0, cut2 = false;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, {
    ...RUN, loginWaitMs: 400,
    onNeedLogin: () => { asked++; setTimeout(() => { t.W.world.entry.loggedIn = true; }, 100); },
    onStep: (s) => {
      if (!cut2 && s.site === 'entry' && s.step === '엔트리 번호 규칙 확인') {
        cut2 = true;
        const end = Date.now() + 450; while (Date.now() < end) {}                // 등록이 한도보다 오래 걸림
        t.W.world.entry.loggedIn = false;
      }
    },
  });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(asked, 2, '시작 전 한 번 · 엔트리 직전 한 번 — 둘 다 기다림');
});
