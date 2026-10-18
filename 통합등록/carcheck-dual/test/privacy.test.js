/*  지난 기록·진단 파일 점검 · 전송 기록 가림 시험 (값은 모두 가짜) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanDir, backupFiles } = require('../src/core/privacy-scan');
const safety = require('../src/core/safety');

function fakeAppData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-appdata-'));
  fs.writeFileSync(path.join(dir, 'records.jsonl'), [
    JSON.stringify({ at: '2026-10-01T00:00:00Z', carNo: '12가3456', data: { carNo: '12가3456', clientName: '홍길동', dealerName: '김딜러', dealerHp: '010-1234-5678', vin: 'KMHXX00XXXX123456', photo1: 'C:\\a.jpg', mileage: '100' } }),
    JSON.stringify({ at: '2026-10-18T00:00:00Z', carNo: '***3456', data: { carNo: '***3456', mileage: '200' } }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'photo-probe.json'), JSON.stringify({ seen: { text: '신청인 김딜러 010-9876-5432 차량 34나5678' } }));
  fs.writeFileSync(path.join(dir, 'credentials.json'), JSON.stringify({ carinfo: { id: 'x', pw: 'secret-cipher' } }));
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ vinTail: 6 }));
  return dir;
}

test('지난 기록·진단 파일을 훑어 종류별 개수만 알려 주고, 값은 결과에 넣지 않는다', () => {
  const dir = fakeAppData();
  const r = scanDir(dir);
  const out = JSON.stringify(r);
  ['홍길동', '김딜러', '010-1234-5678', '010-9876-5432', '12가3456', '34나5678', 'KMHXX00XXXX123456', 'secret-cipher'].forEach((v) => {
    assert.ok(!out.includes(v), '결과에 값이 나오면 안 됨: ' + v);
  });
  const rec = r.files.find((f) => f.name === 'records.jsonl');
  assert.strictEqual(rec.counts['이름 칸'], 2);
  assert.strictEqual(rec.counts['연락처 칸'], 1);
  assert.strictEqual(rec.counts['차량번호 칸'], 2, '가린 줄(***3456)은 세지 않음');
  assert.strictEqual(rec.counts['차대번호 칸'], 1);
  const probe = r.files.find((f) => f.name === 'photo-probe.json');
  assert.strictEqual(probe.counts['휴대폰 번호 무늬'], 1);
  assert.strictEqual(probe.counts['차량번호 무늬'], 1);
  const cred = r.files.find((f) => f.name === 'credentials.json');
  assert.match(cred.skipped, /열지 않음/);
  assert.strictEqual(r.files.find((f) => f.name === 'config.json').total, 0);
});

test('백업은 복사만 하고 원본은 그대로, 로그인 정보 파일은 복사하지 않는다', () => {
  const dir = fakeAppData();
  const before = fs.readFileSync(path.join(dir, 'records.jsonl'), 'utf8');
  const b = backupFiles(dir, ['records.jsonl', 'photo-probe.json', 'credentials.json'], { now: () => new Date('2026-10-18T09:00:00') });
  assert.match(b.to, /backup-20261018$/);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'records.jsonl'), 'utf8'), before, '원본 그대로');
  assert.ok(fs.existsSync(path.join(b.to, 'records.jsonl')));
  assert.ok(!fs.existsSync(path.join(b.to, 'credentials.json')));
  const again = backupFiles(dir, ['records.jsonl'], { now: () => new Date('2026-10-18T10:00:00') });
  assert.strictEqual(again.done[0].skipped, '이미 있음', '이미 있는 백업은 덮어쓰지 않음');
});

test('새 전송 기록: 사람 정보는 빼고, 차량번호·차대번호는 뒤 4자리만 남긴다', () => {
  const r = safety.protectRecord({ carNo: '12가3456', checkNo: 'T-1', data: { carNo: '12가3456', vin: 'KMHXX00XXXX123456', clientName: '홍길동', mileage: '1' } });
  assert.strictEqual(r.carNo, '***3456');
  assert.strictEqual(r.data.carNo, '***3456');
  assert.strictEqual(r.data.vin, '*************3456');
  assert.strictEqual(r.checkNo, 'T-1');
  assert.ok(!('clientName' in r.data));
});
