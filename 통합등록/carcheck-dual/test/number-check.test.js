/*  점검번호 확인 시험 (설계서 2판 2장 + 검증 추가 2번: 같은 차의 예전 점검·재등록 구분)
 *  모든 번호·차량은 시험용 가짜 값이다. */
const test = require('node:test');
const assert = require('node:assert');
const nc = require('../src/core/number-check');

const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };

test('같은 차의 예전 점검·지운 재등록 줄은 새 번호로 고르지 않는다', () => {
  const before = [
    { checkNo: 'T-0100', carNo: '12가3456', vin: 'KMHXX00XXXX123456', date: '2025-03-02', status: '완료' },   // 작년 점검
    { checkNo: 'T-0150', carNo: '12가3456', vin: 'KMHXX00XXXX123456', date: '2026-10-18', status: '삭제' },   // 오늘 지운 재등록 전 줄
    { checkNo: 'T-0151', carNo: '99다9999', vin: 'KMHZZ00ZZZZ999999', date: '2026-10-18' },
  ];
  const old = nc.snapshotOldNumbers(before, CAR);
  assert.deepStrictEqual([...old].sort(), ['T-0100', 'T-0150']);
  const after = before.concat([{ checkNo: 'T-0152', carNo: '12가 3456', vin: 'KMHXX00XXXX123456', date: '2026-10-18' }]);
  const r = nc.findNewNumber(after, CAR, old, '2026-10-18');
  assert.deepStrictEqual(r, { ok: true, checkNo: 'T-0152' });
});

test('목록 맨 위의 다른 차 번호를 우리 번호로 잡지 않는다', () => {
  const old = nc.snapshotOldNumbers([], CAR);
  const after = [
    { checkNo: 'T-0201', carNo: '34나5678', vin: 'KMHYY00YYYY654321', date: '2026-10-18' },
    { checkNo: 'T-0200', carNo: '12가3456', vin: 'KMHXX00XXXX123456', date: '2026-10-18' },
  ];
  assert.strictEqual(nc.findNewNumber(after, CAR, old, '2026-10-18').checkNo, 'T-0200');
});

test('새 줄이 둘 이상이면 고르지 않고 멈춘다', () => {
  const after = [
    { checkNo: 'T-0300', carNo: '12가3456', vin: 'KMHXX00XXXX123456', date: '2026-10-18' },
    { checkNo: 'T-0301', carNo: '12가3456', vin: 'KMHXX00XXXX123456', date: '2026-10-18' },
  ];
  const r = nc.findNewNumber(after, CAR, new Set(), '2026-10-18');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /2개/);
});

test('저장 전 목록을 찍어 두지 않았으면 찾지 않는다', () => {
  const r = nc.findNewNumber([{ checkNo: 'T-1', carNo: CAR.carNo, vin: CAR.vin }], CAR, undefined);
  assert.strictEqual(r.ok, false);
});

test('차대번호를 못 읽거나 다르면 통과가 아니다', () => {
  const noVin = [{ checkNo: 'T-0400', carNo: '12가3456', vin: '', date: '2026-10-18' }];
  assert.strictEqual(nc.findNewNumber(noVin, CAR, new Set(), '2026-10-18').ok, false);
  const other = [{ checkNo: 'T-0401', carNo: '12가3456', vin: 'KMHXX00XXXX000000', date: '2026-10-18' }];
  assert.match(nc.findNewNumber(other, CAR, new Set(), '2026-10-18').reason, /다릅니다/);
});

test('작업 시작 전 날짜의 줄은 예전 것으로 본다', () => {
  const rows = [{ checkNo: 'T-0500', carNo: '12가3456', vin: CAR.vin, date: '2026-10-17' }];
  assert.strictEqual(nc.findNewNumber(rows, CAR, new Set(), '2026-10-18').ok, false);
});

test('차대번호: 17자리 전체 같음만 확정, 뒷자리만 같으면 «추가 확인 필요», 5자리 이하는 모름', () => {
  assert.strictEqual(nc.vinMatchLevel(CAR.vin, CAR.vin), 'full');
  assert.strictEqual(nc.vinMatchLevel('123456', CAR.vin), 'partial');
  assert.strictEqual(nc.vinMatchLevel('XX123456', CAR.vin), 'partial');
  assert.strictEqual(nc.vinMatchLevel('023456', CAR.vin), 'different');
  assert.strictEqual(nc.vinMatchLevel('23456', CAR.vin), 'unknown');
  assert.strictEqual(nc.vinMatches('123456', CAR.vin), null, '일부 일치는 확정(true)이 아님');
  assert.strictEqual(nc.isOurCar({ carNo: CAR.carNo, vin: '123456' }, CAR), false);
  assert.strictEqual(nc.isOurCar({ carNo: CAR.carNo, vin: CAR.vin }, CAR), true);
});

test('저장 뒤 번호 찾기: 차대번호 뒷자리만 같으면 번호를 알려 주되 «추가 확인 필요»로 멈춘다', () => {
  const rows = [{ checkNo: 'T-0600', carNo: '12가3456', vin: '***123456', date: '2026-10-18' }];
  const r = nc.findNewNumber(rows, CAR, new Set(), '2026-10-18');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.needsConfirm, true);
  assert.strictEqual(r.checkNo, 'T-0600');
  const r2 = nc.findNewNumber(rows, CAR, new Set(), '2026-10-18', { partialConfirmedBy: '대표님' });
  assert.deepStrictEqual(r2, { ok: true, checkNo: 'T-0600', partial: true, confirmedBy: '대표님' });
});

test('엔트리 저장 직전: 차대번호 뒷자리만 같으면 «추가 확인 필요», 사람이 확인하면 통과', () => {
  const base = { carinfoNo: 'T-1', entryNo: 'T-1', entryCarNo: '12가3456', entryVin: '123456', car: CAR };
  const r = nc.checkEntryBeforeSave(base);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.needsConfirm, true);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, partialConfirmedBy: '대표님' }).ok, true);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, entryVin: '000000', partialConfirmedBy: '대표님' }).ok, false, '다르면 확인해도 통과 아님');
});

test('카모두 저장 직전: 자동 부여가 꺼졌는지 모르면 막고, 번호가 같아야 통과', () => {
  assert.strictEqual(nc.checkCarmodooBeforeSave({ carinfoNo: 'T-1', fieldValue: 'T-1' }).ok, false);
  assert.strictEqual(nc.checkCarmodooBeforeSave({ carinfoNo: 'T-1', fieldValue: 'T-1', autoAssignOn: true }).ok, false);
  assert.strictEqual(nc.checkCarmodooBeforeSave({ carinfoNo: 'T-1', fieldValue: 'T-2', autoAssignOn: false }).ok, false);
  assert.strictEqual(nc.checkCarmodooBeforeSave({ carinfoNo: 'T-1', fieldValue: ' T-1 ', autoAssignOn: false }).ok, true);
});

test('카모두 저장 뒤: 읽지 못하면 통과가 아니다', () => {
  assert.strictEqual(nc.checkCarmodooAfterSave({ carinfoNo: 'T-1', savedNo: '' }).ok, false);
  assert.strictEqual(nc.checkCarmodooAfterSave({ carinfoNo: '', savedNo: 'T-1' }).ok, false);
  assert.strictEqual(nc.checkCarmodooAfterSave({ carinfoNo: 'T-1', savedNo: 'T-1' }).ok, true);
});

test('엔트리 저장 직전: 번호·차량번호·차대번호 셋 다 맞아야 통과', () => {
  const base = { carinfoNo: 'T-1', entryNo: 'T-1', entryCarNo: '12가3456', entryVin: CAR.vin, car: CAR };
  assert.strictEqual(nc.checkEntryBeforeSave(base).ok, true);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, entryNo: 'T-2' }).ok, false);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, entryCarNo: '34나5678' }).ok, false);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, entryCarNo: '' }).ok, false);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, entryVin: '' }).ok, false);
  assert.strictEqual(nc.checkEntryBeforeSave({ ...base, entryVin: 'KMHXX00XXXX000000' }).ok, false);
});

test('참고 경보(마지막 번호 + 1)는 같음/다름/모름만 알려 준다', () => {
  assert.strictEqual(nc.previewNext('T-0099', 'T-0100').level, 'same');
  assert.strictEqual(nc.previewNext('T-0099', 'T-0101').level, 'warn');
  assert.strictEqual(nc.previewNext('', 'T-0100').level, 'unknown');
  assert.strictEqual(nc.previewNext('ABC', 'T-0100').level, 'unknown');
});
