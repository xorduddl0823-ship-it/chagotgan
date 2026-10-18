/**
 * 점검번호 확인 (설계서 2판 2장) — 전산 화면을 모르는 순수 판단만
 * ------------------------------------------------------------------
 *  원칙
 *   1. 예상(«마지막 번호 + 1»)은 참고 경보일 뿐 안전장치가 아니다.
 *   2. 안전은 실제 번호 확인으로 지킨다.
 *   3. 번호는 «목록 맨 위 줄»이 아니라 우리 차(차량번호 + 차대번호) 줄에서만 읽는다.
 *   4. 같은 차의 예전 점검·재등록 줄은 «저장 전에 찍어 둔 목록»으로 걸러 낸다.
 *   5. 다르거나 읽지 못하면 통과가 아니다(ok:false).
 *
 *  화면에서 읽은 목록 줄 모양(전산 연결 모듈이 만들어 넘김):
 *    { checkNo, carNo, vin, date, status }   — 없는 칸은 비워 둠
 */

const normCar = (s) => String(s || '').replace(/\s+/g, '');
const normVin = (s) => String(s || '').replace(/[\s-]+/g, '').toUpperCase();
const normNo = (s) => String(s || '').replace(/\s+/g, '');

/** 지워진·취소된 줄로 보이는가 (상태 글자로 판단) */
function isDeleted(row) {
  return /삭제|취소|폐기|무효/.test(String((row && row.status) || ''));
}

/**
 * 차대번호가 같은가.
 *  목록에 차대번호 전체(17자리)가 있으면 전체로, 일부만 있으면 뒤 6자리 이상 같을 때만.
 *  목록에 차대번호가 없으면 «모름» — 같다고 치지 않는다.
 */
function vinMatches(rowVin, carVin) {
  const a = normVin(rowVin);
  const b = normVin(carVin);
  if (!a || !b) return null;                      // 모름
  if (a.length >= 17 && b.length >= 17) return a === b;
  const n = Math.min(a.length, b.length);
  if (n < 6) return null;
  return a.slice(-n) === b.slice(-n);
}

/** 이 줄이 우리 차인가: 차량번호 같음 + 차대번호 같음(모르면 아님) */
function isOurCar(row, car) {
  if (!row || normCar(row.carNo) !== normCar(car.carNo)) return false;
  return vinMatches(row.vin, car.vin) === true;
}

/**
 * 저장 전에 찍어 두는 «이 차의 예전 번호들» — 예전 점검·재등록·지운 줄 모두.
 *  차대번호를 모르는 줄도 차량번호가 같으면 넣는다(예전 줄을 새 번호로 잘못 고르지 않게).
 */
function snapshotOldNumbers(rows, car) {
  const set = new Set();
  (rows || []).forEach((r) => {
    if (normCar(r.carNo) === normCar(car.carNo) && normNo(r.checkNo)) set.add(normNo(r.checkNo));
  });
  return set;
}

/**
 * 저장 뒤 목록에서 이번에 새로 생긴 우리 차 번호를 찾는다.
 *  @param rows      저장 뒤 목록 줄
 *  @param car       { carNo, vin }
 *  @param oldNos    snapshotOldNumbers 결과 (저장 전 목록) — 없으면 찾지 않는다
 *  @param since     작업 시작 날짜(YYYY-MM-DD). 그보다 이른 날짜 줄은 예전 것으로 본다
 */
function findNewNumber(rows, car, oldNos, since) {
  if (!(oldNos instanceof Set)) {
    return { ok: false, reason: '저장 전 목록을 찍어 두지 않아 예전 번호와 구분할 수 없습니다.' };
  }
  const sameCar = (rows || []).filter((r) => normCar(r.carNo) === normCar(car.carNo));
  const fresh = sameCar.filter((r) => normNo(r.checkNo) && !oldNos.has(normNo(r.checkNo)) && !isDeleted(r))
    .filter((r) => !(since && r.date && String(r.date).slice(0, 10) < since));
  if (!fresh.length) return { ok: false, reason: '목록에서 이 차의 새 점검번호를 찾지 못했습니다.' };
  if (fresh.length > 1) {
    return { ok: false, reason: '이 차의 새 점검번호로 보이는 줄이 ' + fresh.length + '개입니다(' +
             fresh.map((r) => normNo(r.checkNo)).join(', ') + '). 사람이 확인해 주세요.' };
  }
  const row = fresh[0];
  const v = vinMatches(row.vin, car.vin);
  if (v === null) return { ok: false, reason: '번호 ' + normNo(row.checkNo) + ' 줄의 차대번호를 읽지 못해 이 차인지 확인할 수 없습니다.' };
  if (v === false) return { ok: false, reason: '번호 ' + normNo(row.checkNo) + ' 줄의 차대번호가 이 차와 다릅니다.' };
  return { ok: true, checkNo: normNo(row.checkNo) };
}

/** 두 번호가 같은가 (빈 값이면 통과 아님) */
function sameNumber(label, expected, actual) {
  const a = normNo(expected);
  const b = normNo(actual);
  if (!a) return { ok: false, reason: label + ': 기준 번호(카인포)가 없습니다.' };
  if (!b) return { ok: false, reason: label + ': 번호를 읽지 못했습니다.' };
  if (a !== b) return { ok: false, reason: label + ': 번호가 다릅니다 (기준 ' + a + ' / 읽은 값 ' + b + ').' };
  return { ok: true };
}

/** B. 카모두 저장 직전 — 번호 칸 = 카인포 번호, «자동 부여» 꺼짐 */
function checkCarmodooBeforeSave({ carinfoNo, fieldValue, autoAssignOn }) {
  if (autoAssignOn !== false) {
    return { ok: false, reason: '카모두 «자동 부여»가 꺼졌는지 확인하지 못했습니다.' };
  }
  return sameNumber('카모두 저장 전', carinfoNo, fieldValue);
}

/** C. 카모두 저장 뒤 — 저장된 번호 = 카인포 번호 */
function checkCarmodooAfterSave({ carinfoNo, savedNo }) {
  return sameNumber('카모두 저장 뒤', carinfoNo, savedNo);
}

/** D. 엔트리 저장 직전 — 번호 · 차량번호 · 차대번호 셋 다 */
function checkEntryBeforeSave({ carinfoNo, entryNo, entryCarNo, entryVin, car }) {
  const n = sameNumber('엔트리 번호', carinfoNo, entryNo);
  if (!n.ok) return n;
  if (!normCar(entryCarNo)) return { ok: false, reason: '엔트리가 끌어온 차량번호를 읽지 못했습니다.' };
  if (normCar(entryCarNo) !== normCar(car.carNo)) {
    return { ok: false, reason: '엔트리가 끌어온 차량번호(' + normCar(entryCarNo) + ')가 이 차(' + normCar(car.carNo) + ')와 다릅니다.' };
  }
  const v = vinMatches(entryVin, car.vin);
  if (v === null) return { ok: false, reason: '엔트리가 끌어온 차대번호를 읽지 못했습니다.' };
  if (v === false) return { ok: false, reason: '엔트리가 끌어온 차대번호가 이 차와 다릅니다.' };
  return { ok: true };
}

/**
 * 참고 경보 — 카인포 저장 전, «카인포 마지막 번호 + 1» 과 «엔트리 다음 번호» 비교.
 *  안전장치가 아니다. 다르면 저장 전에 사람에게 물어보는 용도.
 *  번호 모양을 모르면(숫자로 끝나지 않음 등) 'unknown'.
 */
function previewNext(lastCarinfoNo, entryNextNo) {
  const m = /^(.*?)(\d+)$/.exec(normNo(lastCarinfoNo));
  const e = normNo(entryNextNo);
  if (!m || !e) return { level: 'unknown', reason: '번호 모양을 몰라 미리 비교하지 못했습니다.' };
  const next = m[1] + String(Number(m[2]) + 1).padStart(m[2].length, '0');
  if (next === e) return { level: 'same', expected: next };
  return { level: 'warn', expected: next, entry: e,
           reason: '예상 카인포 번호 ' + next + ' 와 엔트리 다음 번호 ' + e + ' 가 다릅니다. 저장하기 전에 확인해 주세요.' };
}

module.exports = {
  normCar, normVin, normNo, vinMatches, isOurCar, isDeleted,
  snapshotOldNumbers, findNewNumber,
  checkCarmodooBeforeSave, checkCarmodooAfterSave, checkEntryBeforeSave,
  previewNext,
};
