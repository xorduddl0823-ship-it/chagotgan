/*  작업 기록 · 두 번 등록 막기 시험 (설계서 2판 6장 + 검증 추가 1번)
 *  실제 전산에 접속하지 않는다. 임시 폴더에 기록 파일만 만든다. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const { createJobLog } = require('../src/core/job-log');

const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };   // 시험용 가짜 값

/** 세 전산을 정상으로 끝까지 진행 (시험용). carinfoStarted 면 carinfo 는 이미 저장을 풀어 둔 상태 */
function finishAll(log, id, no, carinfoStarted) {
  ['carinfo', 'carmodoo', 'entry'].forEach((s) => {
    if (!(s === 'carinfo' && carinfoStarted)) { log.mark(id, s, 'filled'); assert.ok(log.beginSubmit(id, s).ok, s); }
    log.mark(id, s, 'saveConfirmed', { checkNo: no });
    log.mark(id, s, 'numberChecked', { checkNo: no });
    log.mark(id, s, 'done');
  });
}

function tmpFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-joblog-'));
  return path.join(dir, 'jobs.jsonl');
}

test('저장 단추를 푼 직후 프로그램이 강제로 꺼지면, 다시 켰을 때 «불확실»이 되고 다시 저장할 수 없다', () => {
  const file = tmpFile();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'helpers', 'crash-after-submit.js'), file, CAR.carNo, CAR.vin], { encoding: 'utf8' });
  assert.strictEqual(r.signal, 'SIGKILL', '도우미가 강제 종료되어야 함');
  const { jobId, begin } = JSON.parse(r.stdout.trim());
  assert.strictEqual(begin.ok, true);

  const log = createJobLog(file);                              // 다시 켬
  const job = log.get(jobId);
  assert.strictEqual(job.sites.carinfo.state, 'uncertain');
  const c = log.canSubmit(jobId, 'carinfo');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.uncertain, true);
  assert.strictEqual(log.beginSubmit(jobId, 'carinfo').ok, false, '두 번째 저장 풀기는 막혀야 함');

  const { list } = log.resumeList();
  assert.strictEqual(list.length, 1, '처음부터 다시가 아니라 이어 보기 목록에 나와야 함');
  assert.strictEqual(list[0].sites.carinfo.state, 'uncertain');
});

test('응답이 끊긴 경우(결과 모름)도 불확실로 남고 다시 저장할 수 없다', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carmodoo', 'filled');
  assert.ok(log.beginSubmit(id, 'carmodoo').ok);
  log.noteUncertain(id, 'carmodoo', '저장 뒤 30초 동안 응답 없음');
  assert.strictEqual(log.get(id).sites.carmodoo.state, 'uncertain');
  assert.strictEqual(log.canSubmit(id, 'carmodoo').ok, false);
});

test('불확실 → 목록 확인 «저장 안 됨»이면 다시 저장 가능, «저장됨»이면 다시 저장 불가', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  log.beginSubmit(id, 'carinfo');
  log.resolve(id, 'carinfo', 'notSaved', { by: '대표님' });
  assert.strictEqual(log.canSubmit(id, 'carinfo').ok, true);

  log.beginSubmit(id, 'carinfo');
  log.resolve(id, 'carinfo', 'saved', { checkNo: 'T-0001' });
  const s = log.get(id).sites.carinfo;
  assert.strictEqual(s.state, 'saveConfirmed');
  assert.strictEqual(s.checkNo, 'T-0001');
  assert.strictEqual(log.canSubmit(id, 'carinfo').ok, false);
});

test('한 번 저장을 푼 전산은 다시 풀 수 없다(같은 작업 안에서 두 번 등록 방지)', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  assert.ok(log.beginSubmit(id, 'carinfo').ok);
  assert.strictEqual(log.beginSubmit(id, 'carinfo').ok, false);
  log.mark(id, 'carinfo', 'saveConfirmed', { checkNo: 'T-0002' });
  assert.strictEqual(log.beginSubmit(id, 'carinfo').ok, false);
  assert.throws(() => log.mark(id, 'carinfo', 'filled'), /되돌릴 수 없습니다/);
});

test('같은 차로 끝나지 않은 작업이 있으면 새 작업을 만들지 않는다', () => {
  const log = createJobLog(tmpFile());
  log.newJob(CAR);
  assert.throws(() => log.newJob({ carNo: '12가 3456', vin: CAR.vin }), /끝나지 않은 작업/);
});

test('한 번에 한 대: 앞 차가 저장을 시작했으면 다음 차는 저장할 수 없고, 앞 차가 닫히면 풀린다', () => {
  const log = createJobLog(tmpFile());
  const a = log.newJob(CAR);
  const b = log.newJob({ carNo: '34나5678', vin: 'KMHYY00YYYY654321' });
  log.mark(a, 'carinfo', 'filled');
  log.mark(b, 'carinfo', 'filled');
  assert.ok(log.beginSubmit(a, 'carinfo').ok);
  const c = log.canSubmit(b, 'carinfo');
  assert.strictEqual(c.ok, false);
  assert.match(c.reason, /한 번에 한 대/);
  finishAll(log, a, 'T-0001', true);
  assert.strictEqual(log.canSubmit(b, 'carinfo').ok, false, '세 전산이 끝나도 닫기 전에는 막음');
  log.close(a, '세 전산 끝');
  assert.strictEqual(log.canSubmit(b, 'carinfo').ok, true);
});

test('멈춘 작업(번호 다름)이 있으면 대기열 전체가 멈춘다', () => {
  const log = createJobLog(tmpFile());
  const a = log.newJob(CAR);
  const b = log.newJob({ carNo: '34나5678', vin: 'KMHYY00YYYY654321' });
  log.mark(a, 'carinfo', 'filled'); log.beginSubmit(a, 'carinfo');
  log.mark(a, 'carinfo', 'stopped', { reason: '번호 다름' });
  log.mark(b, 'carinfo', 'filled');
  assert.strictEqual(log.canSubmit(b, 'carinfo').ok, false);
  assert.strictEqual(log.canSubmit(a, 'carinfo').ok, false);
});

test('기록 파일 마지막 줄이 쓰다 끊겨 깨져 있어도 앞 기록은 그대로 읽힌다', () => {
  const file = tmpFile();
  const log = createJobLog(file);
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  log.beginSubmit(id, 'carinfo');
  fs.appendFileSync(file, '{"type":"stage","jobId":"' + id + '","site":"carinfo","stage":"save');   // 끊긴 줄
  const again = createJobLog(file);
  const { broken } = again.resumeList();
  assert.strictEqual(broken, 1);
  assert.strictEqual(again.get(id).sites.carinfo.state, 'uncertain');
});

test('기록을 디스크에 남기지 못하면 저장 단추를 풀지 않는다', () => {
  const file = tmpFile();
  const realFs = require('fs');
  let failWrites = false;
  const fakeFs = Object.assign({}, realFs, {
    writeSync: (...a) => { if (failWrites) throw new Error('디스크 가득 참(시험)'); return realFs.writeSync(...a); },
  });
  const log = createJobLog(file, { fs: fakeFs });
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  failWrites = true;
  const r = log.beginSubmit(id, 'carinfo');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /풀지 않았습니다/);
  failWrites = false;
  assert.strictEqual(log.get(id).sites.carinfo.state, 'filled');
});

test('기록에는 이름·전화 같은 칸이 남지 않는다', () => {
  const file = tmpFile();
  const log = createJobLog(file);
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled', { clientName: '홍길동', dealerHp: '010-0000-0000', note: '시험' });
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(!text.includes('홍길동'));
  assert.ok(!text.includes('010-0000-0000'));
  assert.ok(text.includes('시험'));
});

test('사업장이 다르면 «한 번에 한 대»·«같은 차 중복» 판단을 섞지 않는다 (상용화 대비)', () => {
  const file = tmpFile();
  const gaon = createJobLog(file, { office: 'gaon' });
  const other = createJobLog(file, { office: 'other' });
  const a = gaon.newJob(CAR);
  gaon.mark(a, 'carinfo', 'filled');
  assert.ok(gaon.beginSubmit(a, 'carinfo').ok);
  const b = other.newJob(CAR);                                  // 다른 점검장은 같은 차라도 만들 수 있음
  other.mark(b, 'carinfo', 'filled');
  assert.strictEqual(other.canSubmit(b, 'carinfo').ok, true, '다른 사업장 작업 때문에 막히지 않음');
  assert.strictEqual(gaon.get(a).office, 'gaon');
  assert.strictEqual(gaon.resumeList().list.length, 1, '이어 보기 목록에는 우리 사업장 것만');
});

/* ── 검수 반영(10/18 2차): 작업 닫기 · 단계 순서 · 동시 사용 ───────────────── */

test('정상 닫기는 세 전산 모두 done + 번호 확인 + 번호가 같을 때만 된다', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  assert.throws(() => log.close(id), /정상으로 닫을 수 없습니다/);
  assert.strictEqual(log.closeCheck(id).ok, false);
  assert.ok(log.closeCheck(id).reasons.some((r) => /carmodoo/.test(r)));
  const log2 = createJobLog(tmpFile());
  const id2 = log2.newJob(CAR);
  finishAll(log2, id2, 'T-0009');
  assert.strictEqual(log2.closeCheck(id2).ok, true);
  log2.close(id2);
  assert.strictEqual(log2.get(id2).closed, true);
  assert.strictEqual(log2.get(id2).forced, false);
});

test('전산마다 확인한 번호가 다르면 정상 닫기가 안 된다', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  ['carinfo', 'carmodoo', 'entry'].forEach((s, i) => {
    log.mark(id, s, 'filled'); log.beginSubmit(id, s);
    const no = i === 2 ? 'T-0002' : 'T-0001';
    log.mark(id, s, 'saveConfirmed', { checkNo: no });
    log.mark(id, s, 'numberChecked', { checkNo: no });
    log.mark(id, s, 'done');
  });
  assert.throws(() => log.close(id), /번호가 다름/);
});

test('done 은 번호 확인 뒤에만, 번호 확인은 저장 확인 뒤에만, 번호 확인에는 번호가 필수', () => {
  const log = createJobLog(tmpFile());
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  assert.throws(() => log.mark(id, 'carinfo', 'done'), /번호 확인을 마친 뒤/);
  assert.throws(() => log.mark(id, 'carinfo', 'numberChecked', { checkNo: 'T-1' }), /저장 확인 뒤/);
  assert.throws(() => log.mark(id, 'carinfo', 'numberChecked'), /점검번호가 있어야/);
  assert.throws(() => log.mark(id, 'carinfo', 'submitReady'), /beginSubmit/);
});

test('관리자 강제 닫기: 이름·까닭·작업 ID 재입력이 있어야 하고 «강제»로 기록된다', () => {
  const file = tmpFile();
  const log = createJobLog(file);
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled'); log.beginSubmit(id, 'carinfo');
  log.mark(id, 'carinfo', 'stopped', { reason: '번호 다름' });
  assert.throws(() => log.forceClose(id, { reason: '두 곳 지우고 재등록함', confirm: id }), /관리자 이름/);
  assert.throws(() => log.forceClose(id, { by: '대표님', reason: '짧음', confirm: id }), /5자 이상/);
  assert.throws(() => log.forceClose(id, { by: '대표님', reason: '두 곳 지우고 재등록함', confirm: 'x' }), /그대로 적어/);
  log.forceClose(id, { by: '대표님', reason: '두 곳 지우고 재등록함', confirm: id });
  const j = log.get(id);
  assert.strictEqual(j.closed, true);
  assert.strictEqual(j.forced, true);
  const last = fs.readFileSync(file, 'utf8').trim().split('\n').pop();
  assert.match(last, /"forced":true/);
  assert.match(last, /carinfo=stopped/);
  assert.match(last, /대표님/);
});

test('작업 ID 에 PC 표시가 들어가 PC 가 달라도 겹치지 않는다', () => {
  const file = tmpFile();
  const a = createJobLog(file, { pcId: 'office-pc1' }).newJob(CAR);
  const b = createJobLog(file, { pcId: 'PC2' }).newJob({ carNo: '34나5678', vin: 'KMHYY00YYYY654321' });
  assert.match(a, /^\d{8}-OFFICEPC-001$/);
  assert.match(b, /^\d{8}-PC2-001$/);
  assert.notStrictEqual(a, b);
});

function runNode(args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

test('여러 프로세스가 같은 기록 파일에 동시에 작업을 만들어도 ID 가 겹치지 않고 줄이 깨지지 않는다', async () => {
  const file = tmpFile();
  const helper = path.join(__dirname, 'helpers', 'make-jobs.js');
  const rs = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => runNode([helper, file, 'P' + n, '5'])));
  rs.forEach((r) => assert.strictEqual(r.code, 0, r.err));
  const ids = rs.flatMap((r) => JSON.parse(r.out));
  assert.strictEqual(ids.length, 30);
  assert.strictEqual(new Set(ids).size, 30, '작업 ID 겹침');
  const log = createJobLog(file);
  assert.strictEqual(log.resumeList().broken, 0, '깨진 줄 없음');
  assert.strictEqual(log.resumeList().list.length, 30);
});

test('같은 PC 표시로 여러 프로세스가 동시에 만들어도 순번이 겹치지 않는다', async () => {
  const file = tmpFile();
  const helper = path.join(__dirname, 'helpers', 'make-jobs.js');
  const rs = await Promise.all([1, 2, 3, 4].map(() => runNode([helper, file, 'SAME', '5'])));
  rs.forEach((r) => assert.strictEqual(r.code, 0, r.err));
  const ids = rs.flatMap((r) => JSON.parse(r.out));
  assert.strictEqual(new Set(ids).size, 20);
});

test('두 프로세스가 동시에 서로 다른 차의 저장을 풀려 해도 한 대만 풀린다 (한 번에 한 대)', async () => {
  for (let round = 0; round < 5; round++) {
    const file = tmpFile();
    const log = createJobLog(file);
    const a = log.newJob(CAR);
    const b = log.newJob({ carNo: '34나5678', vin: 'KMHYY00YYYY654321' });
    log.mark(a, 'carinfo', 'filled');
    log.mark(b, 'carinfo', 'filled');
    const helper = path.join(__dirname, 'helpers', 'begin-submit.js');
    const rs = await Promise.all([runNode([helper, file, a]), runNode([helper, file, b])]);
    rs.forEach((r) => assert.strictEqual(r.code, 0, r.err));
    const oks = rs.map((r) => JSON.parse(r.out).ok).filter(Boolean);
    assert.strictEqual(oks.length, 1, '정확히 한 대만 저장이 풀려야 함 (round ' + round + ')');
  }
});

test('잠금을 쥔 채 꺼진 프로그램의 오래된 잠금은 치우고 계속한다', () => {
  const file = tmpFile();
  fs.writeFileSync(file + '.lock', '{"pid":1}');
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(file + '.lock', old, old);
  const log = createJobLog(file, { lockStaleMs: 30000 });
  assert.ok(log.newJob(CAR));
});

test('최근 잠금이 풀리지 않으면 기다리다 멈추고, 저장 단추는 풀지 않는다', () => {
  const file = tmpFile();
  const log = createJobLog(file, { lockWaitMs: 200 });
  const id = log.newJob(CAR);
  log.mark(id, 'carinfo', 'filled');
  fs.writeFileSync(file + '.lock', '{"pid":1}');
  const r = log.beginSubmit(id, 'carinfo');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /기다리다 멈췄습니다/);
  fs.unlinkSync(file + '.lock');
  assert.strictEqual(log.get(id).sites.carinfo.state, 'filled');
});
