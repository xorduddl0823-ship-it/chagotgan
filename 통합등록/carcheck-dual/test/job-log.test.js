/*  작업 기록 · 두 번 등록 막기 시험 (설계서 2판 6장 + 검증 추가 1번)
 *  실제 전산에 접속하지 않는다. 임시 폴더에 기록 파일만 만든다. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createJobLog } = require('../src/core/job-log');

const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };   // 시험용 가짜 값

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
  ['carinfo', 'carmodoo', 'entry'].forEach((s) => {
    if (s !== 'carinfo') { log.mark(a, s, 'filled'); log.beginSubmit(a, s); }
    log.mark(a, s, 'saveConfirmed'); log.mark(a, s, 'numberChecked'); log.mark(a, s, 'done');
  });
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
