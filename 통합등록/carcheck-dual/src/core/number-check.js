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
 *  차대번호 비교 단계 (2026-10-18 검수 반영):
 *    full      17자리 전체가 같음 → 같은 차로 확정
 *    partial   한쪽이 일부만 보여 뒤 6자리 이상이 같음 → «추가 확인 필요» (확정 아님)
 *    different 다름
 *    unknown   못 읽음 / 5자리 이하
 *
 *  ⚠ 2026-10-18 현재: 시험만 통과했고 실제 등록 흐름(main.js)에는 아직 연결하지 않았다.
 *
 *  화면에서 읽은 목록 줄 모양(전산 연결 모듈이 만들어 넘김):
 *    { checkNo, carNo, vin, date, status }   — 없는 칸은 비워 둠
 */

const normCar = (s) => String(s || '').replace(/\s+/g, '');
//  차대번호: 영문·숫자만 남긴다(가림표 *·띄어쓰기·- 는 뺌 — «***123456» 은 뒤 6자리만 보이는 것)
const normVin = (s) => String(s || '').replace(/[^0-9A-Za-z]+/g, '').toUpperCase();
const normNo = (s) => String(s || '').replace(/\s+/g, '');
/**
 * 목록의 차량번호가 이 차인가 — 엔트리 목록은 «****5528»처럼 앞을 가려 보여 준다(10/19 화면 사진).
 *  가림표(*)가 있으면 보이는 뒷자리(4자리 이상)가 이 차 번호 끝과 같을 때만 같다고 본다.
 *  (뒷자리만 같은 다른 차일 수 있으므로 이 판단만으로 끝내지 않는다 — 번호(카인포 번호)가 같아야 하고, 줄이 둘이면 멈춤)
 */
function sameCar(rowCar, carNo) {
  const a = normCar(rowCar), b = normCar(carNo);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.indexOf('*') < 0) return false;
  const tail = a.replace(/^\*+/, '');
  return tail.length >= 4 && tail.indexOf('*') < 0 && b.endsWith(tail);
}

/** 지워진·취소된 줄로 보이는가 (상태 글자로 판단) */
function isDeleted(row) {
  return /삭제|취소|폐기|무효/.test(String((row && row.status) || ''));
}

/**
 * 차대번호 비교 단계: 'full' | 'partial' | 'different' | 'unknown'
 *  둘 다 17자리면 전체 비교. 한쪽이 일부만이면 겹치는 뒷자리(6자리 이상)를 비교하되,
 *  같아도 'partial'(추가 확인 필요)일 뿐 확정이 아니다.
 */
function vinMatchLevel(rowVin, carVin) {
  const a = normVin(rowVin);
  const b = normVin(carVin);
  if (!a || !b) return 'unknown';
  if (a.length >= 17 && b.length >= 17) return a === b ? 'full' : 'different';
  const n = Math.min(a.length, b.length);
  if (n < 6) return 'unknown';
  return a.slice(-n) === b.slice(-n) ? 'partial' : 'different';
}

/** 예전 모양: true(전체 같음) / false(다름) / null(모름·일부만 같음 — 확정 아님) */
function vinMatches(rowVin, carVin) {
  const lv = vinMatchLevel(rowVin, carVin);
  return lv === 'full' ? true : lv === 'different' ? false : null;
}

/** 이 줄이 우리 차로 «확정»인가: 차량번호 같음 + 차대번호 17자리 전체 같음 */
function isOurCar(row, car) {
  if (!row || normCar(row.carNo) !== normCar(car.carNo)) return false;
  return vinMatchLevel(row.vin, car.vin) === 'full';
}

/** 차대번호 단계 → 판단 결과 (partial 은 needsConfirm) */
function vinVerdict(level, label, opts) {
  if (level === 'full') return { ok: true };
  if (level === 'partial') {
    if (opts && String(opts.partialConfirmedBy || '').trim()) {
      return { ok: true, confirmedBy: String(opts.partialConfirmedBy).trim(), partial: true };
    }
    return { ok: false, needsConfirm: true,
             reason: label + ' 차대번호가 일부(뒷자리)만 같습니다. 화면에서 전체 차대번호를 확인해 주세요.' };
  }
  if (level === 'different') return { ok: false, reason: label + ' 차대번호가 이 차와 다릅니다.' };
  return { ok: false, reason: label + ' 차대번호를 읽지 못해 이 차인지 확인할 수 없습니다.' };
}

/**
 * 저장 전에 찍어 두는 «이 차의 예전 번호들» — 예전 점검·재등록·지운 줄 모두.
 *  차대번호를 모르는 줄도 차량번호가 같으면 넣는다(예전 줄을 새 번호로 잘못 고르지 않게).
 */
function snapshotOldNumbers(rows, car) {
  const set = new Set();
  (rows || []).forEach((r) => {
    if (sameCar(r.carNo, car.carNo) && normNo(r.checkNo)) set.add(normNo(r.checkNo));
  });
  return set;
}

/**
 * 저장 뒤 목록에서 이번에 새로 생긴 우리 차 번호를 찾는다.
 *  @param rows      저장 뒤 목록 줄
 *  @param car       { carNo, vin }
 *  @param oldNos    snapshotOldNumbers 결과 (저장 전 목록) — 없으면 찾지 않는다
 *  @param since     작업 시작 날짜(YYYY-MM-DD). 그보다 이른 날짜 줄은 예전 것으로 본다
 *  @param opts      { partialConfirmedBy } — 차대번호 일부 일치를 사람이 화면에서 확인했을 때만
 */
function findNewNumber(rows, car, oldNos, since, opts) {
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
  const no = normNo(row.checkNo);
  const v = vinVerdict(vinMatchLevel(row.vin, car.vin), '번호 ' + no + ' 줄의', opts);
  if (!v.ok) return { ...v, checkNo: no };
  return { ok: true, checkNo: no, ...(v.partial ? { partial: true, confirmedBy: v.confirmedBy } : {}) };
}

/**
 * 카모두·엔트리: 저장 뒤 목록에서 «이번 작업에서 새로 저장된 우리 차 줄»을 찾는다 (검수 4차 — 첫 줄 고르기 금지)
 *  · 저장 전에 찍어 둔 이 전산의 «이 차 예전 번호들»(oldNos)에 없는 줄만
 *  · 지운·취소된 줄 제외 · 차량번호 같음 · 목록에 차대번호가 있으면 17자리 전체 같아야(일부만이면 확인 필요)
 *  · 정확히 한 줄일 때만 ok. 없거나 여럿이면 멈춤
 */
function findNewSavedRow(rows, car, oldNos, label) {
  const name = label || '목록';
  if (!(oldNos instanceof Set)) return { ok: false, reason: name + ': 저장 전 목록을 찍어 두지 않아 이번 저장 줄을 구분할 수 없습니다.' };
  const fresh = (rows || []).filter((r) => sameCar(r.carNo, car.carNo) && normNo(r.checkNo) &&
                                         !oldNos.has(normNo(r.checkNo)) && !isDeleted(r));
  if (!fresh.length) return { ok: false, reason: name + '에서 이번에 저장된 이 차 줄을 찾지 못했습니다.' };
  if (fresh.length > 1) {
    return { ok: false, reason: name + '에 이번에 저장된 것으로 보이는 이 차 줄이 ' + fresh.length + '개입니다(' +
             fresh.map((r) => normNo(r.checkNo)).join(', ') + '). 두 번 저장됐을 수 있어 멈춥니다.', multiple: true };
  }
  const row = fresh[0];
  if (normVin(row.vin)) {
    const v = vinVerdict(vinMatchLevel(row.vin, car.vin), name + ' 줄의');
    if (!v.ok) return { ...v, checkNo: normNo(row.checkNo) };
  }
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
function checkEntryBeforeSave({ carinfoNo, entryNo, entryCarNo, entryVin, car, partialConfirmedBy }) {
  const n = sameNumber('엔트리 번호', carinfoNo, entryNo);
  if (!n.ok) return n;
  if (!normCar(entryCarNo)) return { ok: false, reason: '엔트리가 끌어온 차량번호를 읽지 못했습니다.' };
  if (normCar(entryCarNo) !== normCar(car.carNo)) {
    return { ok: false, reason: '엔트리가 끌어온 차량번호(' + normCar(entryCarNo) + ')가 이 차(' + normCar(car.carNo) + ')와 다릅니다.' };
  }
  return vinVerdict(vinMatchLevel(entryVin, car.vin), '엔트리가 끌어온', { partialConfirmedBy });
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
  normCar, normVin, normNo, sameCar, vinMatchLevel, vinMatches, isOurCar, isDeleted,
  snapshotOldNumbers, findNewNumber, findNewSavedRow,
  checkCarmodooBeforeSave, checkCarmodooAfterSave, checkEntryBeforeSave,
  previewNext,
};
