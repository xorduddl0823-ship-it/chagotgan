/*  3차 검수 반영 시험: 잠금 안전성 · 상태 전이 · 관리자 강제 닫기 · 차량정보 가림
 *  실제 전산에 접속하지 않는다. 임시 폴더에 기록 파일만 만든다. 차량 값은 모두 가짜. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { createJobLog, MARK_ALLOWED } = require('../src/core/job-log');
const { createAdminAuth } = require('../src/core/admin-auth');

const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };
const CAR2 = { carNo: '34나5678', vin: 'KMHYY00YYYY654321' };
const PIN = '482915';

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cc-safe-')); }
function tmpFile() { return path.join(tmpDir(), 'jobs.jsonl'); }
function withAdmin(file, extra) {
  const admin = createAdminAuth(path.join(path.dirname(file), 'admin.json'));
  admin.setPin(PIN);
  return { admin, log: createJobLog(file, { admin, ...(extra || {}) }) };
}
function finishSite(log, id, s, no) {
  log.mark(id, s, 'filled');
  assert.ok(log.beginSubmit(id, s).ok, s);
  log.mark(id, s, 'saveConfirmed', { checkNo: no });
  log.mark(id, s, 'numberChecked', { checkNo: no });
  log.mark(id, s, 'done');
}
function startHolder(file, mode, ms) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'helpers', 'lock-holder.js'), file, mode, String(ms || '')], { stdio: ['ignore', 'pipe', 'inherit'] });
    p.stdout.once('data', () => resolve(p));
  });
}
const exited = (p) => new Promise((r) => (p.exitCode !== null || p.signalCode !== null ? r() : p.once('exit', r)));

/* ── 1. 잠금 안전성 ──────────────────────────────────────────── */

test('살아 있는 프로세스가 오래 쥔 잠금은 시간이 지나도 치우지 않고, 저장도 풀지 않는다', async () => {
  const file = tmpFile();
  const log = createJobLog(file, { lockWaitMs: 300 });
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  const holder = await startHolder(file, 'hold', 3000);           // 긴 작업 흉내
  const old = new Date(Date.now() - 10 * 60000);
  fs.utimesSync(file + '.lock', old, old);                       // 10분 묵은 것처럼
  const r = log.beginSubmit(id, 'carinfo');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /다른 프로그램.*기다리다 멈췄습니다/);
  assert.ok(fs.existsSync(file + '.lock'), '남의 잠금을 지우지 않음');
  assert.strictEqual(log.get(id).sites.carinfo.state, 'filled');
  holder.kill('SIGKILL');
  await exited(holder);
});

test('잠금을 쥔 채 강제 종료된 프로세스(같은 PC · 죽은 것 확인)의 잠금은 치우고 계속한다', async () => {
  const file = tmpFile();
  const holder = await startHolder(file, 'crash');
  await exited(holder);
  assert.ok(fs.existsSync(file + '.lock'), '죽은 프로세스의 잠금이 남아 있음');
  const log = createJobLog(file, { lockWaitMs: 2000 });
  const id = log.newJob(CAR);
  assert.ok(id);
  assert.ok(!fs.existsSync(file + '.lock'), '일이 끝나면 내 잠금은 지움');
});

test('다른 PC 의 잠금은 그 PC 프로그램이 죽었는지 알 수 없으므로 치우지 않는다', () => {
  const file = tmpFile();
  fs.writeFileSync(file + '.lock', JSON.stringify({ host: 'OTHER-PC-NAME', pc: 'OTHER', pid: 999999, token: 't' }));
  const log = createJobLog(file, { lockWaitMs: 200 });
  assert.throws(() => log.newJob(CAR), /다른 PC\(OTHER\)/);
  assert.ok(fs.existsSync(file + '.lock'));
});

test('내용을 못 읽는 잠금(깨짐)은 주인을 알 수 없으므로 치우지 않고 저장도 풀지 않는다', () => {
  const file = tmpFile();
  const log = createJobLog(file, { lockWaitMs: 200 });
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  fs.writeFileSync(file + '.lock', '{"pid":');
  const r = log.beginSubmit(id, 'carinfo');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /확인할 수 없는 곳/);
  assert.ok(fs.existsSync(file + '.lock'));
});

test('살았는지 «모름»(확인 실패)인 프로세스의 잠금도 치우지 않는다', () => {
  const file = tmpFile();
  fs.writeFileSync(file + '.lock', JSON.stringify({ host: os.hostname(), pc: 'X', pid: 4242, token: 't' }));
  const log = createJobLog(file, { lockWaitMs: 200, pidAlive: () => null });
  assert.throws(() => log.newJob(CAR), /기다리다 멈췄습니다/);
});

test('일을 마칠 때 잠금이 남의 것으로 바뀌어 있으면 지우지 않는다 (소유권)', () => {
  const file = tmpFile();
  const realFs = require('fs');
  let swapped = false;
  const fakeFs = Object.assign({}, realFs, {
    fsyncSync: (fd) => {
      realFs.fsyncSync(fd);
      if (!swapped) {                                              // 쓰는 도중 다른 쪽이 잠금을 가져간 상황 흉내
        swapped = true;
        realFs.writeFileSync(file + '.lock', JSON.stringify({ host: os.hostname(), pc: 'Y', pid: process.pid, token: 'someone-else' }));
      }
    },
  });
  const log = createJobLog(file, { fs: fakeFs });
  log.newJob(CAR);
  const left = JSON.parse(fs.readFileSync(file + '.lock', 'utf8'));
  assert.strictEqual(left.token, 'someone-else', '남의 잠금은 그대로');
});

test('잠금 파일은 처음부터 주인 정보가 적힌 채로 생긴다 (내용 없는 잠금 없음)', () => {
  const file = tmpFile();
  const realFs = require('fs');
  let seen = null;
  const fakeFs = Object.assign({}, realFs, {
    linkSync: (a, b) => { realFs.linkSync(a, b); seen = JSON.parse(realFs.readFileSync(b, 'utf8')); },
  });
  createJobLog(file, { fs: fakeFs }).newJob(CAR);
  assert.ok(seen && seen.token && seen.host && seen.pid);
});

/* ── 2. 상태 전이 ────────────────────────────────────────────── */

test('허용 전이 표대로만 움직이고, 표에 없는 이동은 모두 거절한다', () => {
  const targets = ['filled', 'saveConfirmed', 'numberChecked', 'done'];
  //  각 상태를 만든 뒤, mark 로 갈 수 있는 곳/없는 곳을 전부 시험
  const reach = {
    none: () => {},
    filled: (l, id) => l.mark(id, 'carinfo', 'filled'),
    uncertain: (l, id) => { l.mark(id, 'carinfo', 'filled'); l.beginSubmit(id, 'carinfo'); },
    saveConfirmed: (l, id) => { reach.uncertain(l, id); l.mark(id, 'carinfo', 'saveConfirmed'); },
    numberChecked: (l, id) => { reach.saveConfirmed(l, id); l.mark(id, 'carinfo', 'numberChecked', { checkNo: 'T-1' }); },
    done: (l, id) => { reach.numberChecked(l, id); l.mark(id, 'carinfo', 'done'); },
    stopped: (l, id) => { reach.filled(l, id); l.mark(id, 'carinfo', 'stopped', { reason: '시험 멈춤' }); },
  };
  Object.keys(reach).forEach((from) => {
    targets.forEach((to) => {
      const log = createJobLog(tmpFile());
      const id = log.newJob(CAR);
      reach[from](log, id);
      const allowed = (MARK_ALLOWED[from] || []).includes(to);
      const go = () => log.mark(id, 'carinfo', to, { checkNo: 'T-1' });
      if (allowed) assert.doesNotThrow(go, from + '→' + to);
      else assert.throws(go, /허용 전이 아님/, from + '→' + to);
    });
  });
});

test('멈춤(stopped)은 끝나지 않은 상태에서만, 까닭이 있어야 하고, 멈춘 뒤에는 움직일 수 없다', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  assert.throws(() => log.mark(id, 'carinfo', 'stopped'), /까닭/);
  log.mark(id, 'carinfo', 'stopped', { reason: '번호 다름' });
  assert.throws(() => log.mark(id, 'carinfo', 'stopped', { reason: '또' }), /허용 전이 아님/);
  assert.throws(() => log.resolve(id, 'carinfo', 'notSaved'), /불확실 상태가 아닙니다/);
  assert.strictEqual(log.beginSubmit(id, 'carinfo').ok, false);
  const log2 = createJobLog(tmpFile());
  const id2 = log2.newJob(CAR);
  finishSite(log2, id2, 'carinfo', 'T-1');
  assert.throws(() => log2.mark(id2, 'carinfo', 'stopped', { reason: '끝난 뒤' }), /허용 전이 아님/);
});

test('resolve 는 불확실 상태에서만, noteUncertain 도 불확실 상태에서만', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  assert.throws(() => log.resolve(id, 'carinfo', 'saved'), /불확실 상태가 아닙니다/);
  assert.throws(() => log.noteUncertain(id, 'carinfo', 'x'), /불확실 상태가 아닙니다/);
  log.beginSubmit(id, 'carinfo');
  assert.throws(() => log.resolve(id, 'carinfo', 'maybe'), /saved 또는 notSaved/);
});

test('저장을 누르지 않고 취소: 저장 요청 0건이 확실할 때만 되돌아가고, 모르면 거절', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  log.beginSubmit(id, 'carinfo');
  assert.throws(() => log.cancelSubmit(id, 'carinfo', {}), /확실하지 않아/);
  assert.throws(() => log.cancelSubmit(id, 'carinfo', { sentCount: 1 }), /확실하지 않아/);
  log.cancelSubmit(id, 'carinfo', { sentCount: 0, by: '대표님' });
  assert.strictEqual(log.get(id).sites.carinfo.state, 'filled');
  assert.ok(log.beginSubmit(id, 'carinfo').ok, '취소 뒤에는 다시 저장을 풀 수 있음');
});

/* ── 3. 관리자 강제 닫기 ──────────────────────────────────────── */

test('관리자 이름만으로는 안 되고, PIN 확인 표가 있어야 강제 닫기가 된다', () => {
  const file = tmpFile();
  const { admin, log } = withAdmin(file);
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled'); log.beginSubmit(id, 'carinfo');
  log.mark(id, 'carinfo', 'stopped', { reason: '번호 다름' });
  const args = { reason: '두 곳 지우고 재등록함', confirm: id };
  assert.throws(() => log.forceClose(id, { ...args }), /관리자 확인이 없거나/);
  assert.throws(() => log.forceClose(id, { ...args, ticket: 'made-up' }), /관리자 확인이 없거나/);
  assert.strictEqual(admin.verify('대표님', '000000').ok, false, '틀린 PIN');
  const v = admin.verify('대표님', PIN);
  assert.ok(v.ok);
  assert.throws(() => log.forceClose(id, { ...args, ticket: v.ticket, confirm: 'x' }), /그대로 적어/);
  log.forceClose(id, { ...args, ticket: v.ticket });
  const j = log.get(id);
  assert.strictEqual(j.closed, true);
  assert.strictEqual(j.forced, true, '정상 닫기와 구분됨');
  const last = fs.readFileSync(file, 'utf8').trim().split('\n').pop();
  assert.match(last, /"forced":true/);
  assert.match(last, /carinfo=stopped/);
  const log2 = withAdmin(tmpFile()).log;
  const id2 = log2.newJob(CAR);
  assert.throws(() => log2.forceClose(id2, { reason: '다른 작업에 씀', confirm: id2, ticket: v.ticket }), /관리자 확인이 없거나/, '확인 표는 한 번만');
});

test('관리자 PIN 을 5번 틀리면 잠기고, 확인 표는 5분이 지나면 못 쓴다', () => {
  const dir = tmpDir();
  let t = Date.now();
  const admin = createAdminAuth(path.join(dir, 'admin.json'), { now: () => t });
  admin.setPin(PIN);
  for (let i = 0; i < 5; i++) assert.strictEqual(admin.verify('누구', '111111').ok, false);
  const locked = admin.verify('대표님', PIN);
  assert.strictEqual(locked.ok, false);
  assert.match(locked.reason, /잠겼습니다/);
  t += 11 * 60000;
  const v = admin.verify('대표님', PIN);
  assert.ok(v.ok);
  t += 6 * 60000;
  assert.strictEqual(admin.consume(v.ticket), null);
  assert.throws(() => admin.setPin('12'), /6~12자리/);
  assert.throws(() => admin.setPin('99999999', '000000'), /맞지 않아/);
  assert.ok(!fs.readFileSync(path.join(dir, 'admin.json'), 'utf8').includes(PIN), 'PIN 을 그대로 저장하지 않음');
});

test('강제로 닫힌 작업이 있으면 다음 차 저장이 막히고, 관리자 + 세 전산 목록 확인이 있어야 풀린다', () => {
  const file = tmpFile();
  const { admin, log } = withAdmin(file);
  const a = log.newJob(CAR);
  log.mark(a, 'carinfo', 'filled'); log.beginSubmit(a, 'carinfo');
  log.mark(a, 'carinfo', 'stopped', { reason: '번호 다름' });
  log.forceClose(a, { ticket: admin.verify('대표님', PIN).ticket, reason: '두 곳 지우고 재등록함', confirm: a });
  const b = log.newJob(CAR2);
  log.mark(b, 'carinfo', 'filled');
  const c = log.canSubmit(b, 'carinfo');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.forcedBlock, a);
  assert.deepStrictEqual(log.resumeList().forcedBlocks, [a]);
  assert.throws(() => log.releaseAfterForce(a, { ticket: admin.verify('대표님', PIN).ticket, checks: { carinfo: true, carmodoo: true } }), /entry/);
  assert.throws(() => log.releaseAfterForce(a, { checks: { carinfo: true, carmodoo: true, entry: true } }), /관리자 확인/);
  log.releaseAfterForce(a, { ticket: admin.verify('대표님', PIN).ticket, checks: { carinfo: true, carmodoo: true, entry: true } });
  assert.strictEqual(log.canSubmit(b, 'carinfo').ok, true);
  assert.throws(() => log.releaseAfterForce(a, { ticket: admin.verify('대표님', PIN).ticket, checks: { carinfo: true, carmodoo: true, entry: true } }), /이미 허용/);
});

test('정상으로 닫힌 작업은 다음 차를 막지 않는다', () => {
  const log = createJobLog(tmpFile());
  const a = log.newJob(CAR);
  ['carinfo', 'carmodoo', 'entry'].forEach((s) => finishSite(log, a, s, 'T-0005'));
  log.close(a);
  const b = log.newJob(CAR2);
  log.mark(b, 'carinfo', 'filled');
  assert.ok(log.canSubmit(b, 'carinfo').ok);
});

/* ── 4. 차량정보 가림 ────────────────────────────────────────── */

test('이어 보기 목록과 안내 문구에는 차량번호·차대번호를 가려서 보여 준다', () => {
  const log = createJobLog(tmpFile());
  const a = log.newJob(CAR);
  log.mark(a, 'carinfo', 'filled'); log.beginSubmit(a, 'carinfo');
  const item = log.resumeList().list[0];
  assert.strictEqual(item.carNo, '***3456');
  assert.strictEqual(item.vin, '*************3456');
  const b = log.newJob(CAR2);
  log.mark(b, 'carinfo', 'filled');
  const r = log.canSubmit(b, 'carinfo');
  assert.ok(!r.reason.includes('12가3456'));
  assert.throws(() => log.newJob(CAR), (e) => !e.message.includes('12가3456'));
});
