/**
 * 등록 흐름 지휘 — 카인포 → 카모두 → 엔트리를 «한 단계씩, 확인하며» 잇는다
 * ------------------------------------------------------------------
 *  업무 관리 칸(상용화 고려): 전산 화면을 직접 만지지 않는다. 전산마다 «연결 모듈(adapter)»을 받아 부른다.
 *  가온 내부용 연결 모듈은 `src/sites/flow-adapters.js`(Electron), 시험용은 흉내 모듈.
 *
 *  연결 모듈이 갖춰야 할 것(모두 async):
 *    공통      armGuard() — 저장 통제기 설치(값 넣기 «전»에) · coverage() · fill(data, extra) → {filled[], missing[]}
 *              unlockSave() · saveOutcome() · seal() — 끝난 뒤 그 창 봉인(더 저장 못 함)
 *              readList(car) → [{checkNo, carNo, vin?, date?, status?}] — 그 전산 목록에서 이 차 줄들
 *              implemented — false 면 아직 연결 모듈이 없는 전산(엔트리 지금 상태) → 흐름이 «미구현»으로 멈춤
 *    carmodoo  readForm() → {autoAssignOn, numberValue}
 *    entry     loginState() → {loggedIn, canRead} · readNext() · readLoaded() → {entryNo, carNo, vin}
 *
 *  2026-10-19 검수 4차 반영
 *   1. 저장 통제기를 «먼저» 설치하고, 설치(본 창 붙음)를 확인한 뒤에만 값 넣기 — 실패하면 넣기·저장 모두 안 함
 *   2. 끝난 전산은 통제를 풀지 않고 «봉인» — 같은 창에서 추가 저장 불가. 흐름 중에는 기존 단추(개별 전송 등)도 막음(legacyBlocked)
 *   3. 카모두·엔트리 저장 확인도 «첫 줄»이 아니라 저장 전 찍어 둔 목록과 비교해 이번에 새로 생긴 우리 차 줄 하나만
 *   4. 저장 단계에서 팝업이 열리면 자동으로 끝내지 않고 사람 확인(manualCheck)
 *   5. 연결 모듈이 없는 전산(엔트리)은 «미구현»으로 멈추고 끝난 것처럼 보이지 않음
 *
 *  2026-10-19 대표님 최종 지시: «한 번 입력 → 세 전산 자동 등록 → 자동 검증 → 최종 결과 확인»
 *   → runAll(): 정상이면 사람 조작 없이 카인포 → 카모두 → 엔트리를 값 넣기 · [저장](프로그램이 누름) · 번호 검증까지 이어 간다.
 *     이상하면(번호 다름 · 다른 차 의심 · 로그인 만료 · 중복 의심 · 저장 불확실 · 알 수 없는 경로 · 딜러 고르기 필요)
 *     그 자리에서 멈추고 explain() 으로 «어느 차 · 어느 전산 · 무슨 까닭 · 어느 단계 · 무엇을 하면 되는지»를 돌려준다.
 *   → 불확실은 다시 저장하지 않는다(목록으로만 확인). 지우기·취소·재등록은 하지 않는다.
 *   → 연결 모듈은 clickSave()(그 전산 [저장] 누르기)를 갖춰야 한다.
 *
 *  2026-10-19 7차
 *   → 카인포 신규등록(prepare)을 흐름 안에 넣음: 입력 화면 단추로 이미 했으면 그 화면을 이어 쓰고, 안 했으면 흐름이 한 번만 한다.
 *     신규등록은 다시 하지 않는다(같은 차가 두 번 생길 수 있음) — 화면이 닫혔으면 멈추고 목록 확인을 부탁한다.
 *     신규등록 때 목록 줄·번호가 먼저 생기는 경우를 위해, 열린 등록 화면의 번호는 «예전 번호»에서 뺀다.
 *   → 사진 올리기 단계: 전산 설정 photoPhase 가 'beforeSave'면 값 넣기 뒤·저장 전, 'afterSave'면 저장·번호 확인 뒤.
 *     올린 칸은 작업 기록에 남겨 이어 하기 때 남은 칸만 올린다. 설정을 모르면(null) 사진이 있을 때 저장 전에 멈춘다.
 *   → 번호가 어긋나 멈추면 «지우고 다시 등록»을 기본 안내로 내지 않는다 — 실제 등록 상태 확인 → 관리자 정정 절차 확인 순서.
 *
 *  사람이 하는 일(대신하지 않음): 문자 인증 · 딜러 동명이인 고르기 · 차대번호 일부 일치 확인 · 멈춘 작업 정리
 *  설정이 확정되지 않았으면(siteConfirmed[site] false) 저장 허락을 하지 않는다 — 모의 환경(mock:true)만 예외.
 */
const nc = require('./number-check');

const ORDER = ['carinfo', 'carmodoo', 'entry'];
const NAME = { carinfo: '카인포', carmodoo: '카모두', entry: '엔트리' };
const STEP = { precheck: '엔트리 로그인 확인', prepare: '카인포 신규등록', photo: '사진 올리기', fill: '값 넣기', allow: '저장 전 확인', save: '저장', verify: '저장 뒤 번호 확인', entryNext: '엔트리 번호 규칙 확인', finish: '마무리' };

/**
 * 멈춘 까닭 → 담당자가 할 일 (쉬운 말 한 줄)
 *  7차: 번호가 어긋난 경우 «지우고 다시 등록»을 기본으로 안내하지 않는다.
 *       먼저 실제로 어떻게 등록됐는지 확인하고, 그다음 관리자 정정 절차를 확인하게 한다(지우기·재등록은 대표님 판단).
 */
function actionFor(r, site) {
  if (r.otherCar) return '카인포에 다른 차 등록 화면이 열려 있어요. 그 차 일을 먼저 마치거나 카인포를 목록 화면으로 돌린 뒤 다시 눌러 주세요.';
  if (r.prepareLost) return '카인포 목록에서 이 차 줄이 새로 생겼는지 먼저 확인해 주세요. 생겼으면 그 줄을 열어 두고 [이어 하기], 없으면 대표님(관리자)께 알려 주세요. 신규등록은 다시 하지 않았어요.';
  if (r.photoFail) return (NAME[site] || site) + ' 사진 창에서 어느 사진이 올라갔는지 확인해 주세요. [이어 하기]를 누르면 못 올린 칸만 다시 올려요. 점검 기록은 이미 저장됐어요.';
  if (r.mismatch) return '엔트리에서 다음 번호가 왜 다른지(다른 차가 먼저 들어갔는지) 확인해 주세요. 엔트리에는 저장하지 않았어요. 바로잡힌 뒤 [이어 하기]를 누르면 번호부터 다시 확인해요.';
  if (r.needLogin) return '엔트리에 로그인(업무폰 문자 인증)한 뒤 [이어 하기]를 눌러 주세요.';
  if (r.needDealerPick) return '같은 이름 딜러가 여럿이에요. 목록에서 고른 뒤 [이어 하기]를 눌러 주세요.';
  if (r.notImplemented) return '엔트리 자동 등록은 아직 준비 중이에요. 엔트리는 직접 등록해 주세요.';
  if (r.needsConfirm) return '전산 화면에서 차대번호 17자리를 직접 비교한 뒤 대표님(관리자)께 알려 주세요. 관리자 확인 전에는 이어 하지 않아요.';
  if (r.manual) return (NAME[site] || site) + ' 목록에서 이 차가 저장됐는지 확인한 뒤 대표님(관리자)께 알려 주세요. 다시 저장은 하지 않았어요.';
  if (r.uncertain) return '다시 저장은 하지 않았어요. 잠시 뒤 [이어 하기]를 누르면 ' + (NAME[site] || site) + ' 목록으로 저장됐는지만 다시 확인해요.';
  if (r.stopped) return '① 세 전산 목록에서 이 차가 실제로 어떻게 등록됐는지(번호·차량번호) 확인해 주세요. ② 그다음 관리자 정정 절차를 확인해 주세요. ③ 확인한 내용을 대표님(관리자)께 알려 주세요. 관리자 확인 전에는 이어 하지 않아요. 프로그램은 지우거나 다시 등록하지 않았어요.';
  if (r.missing) return '못 넣은 칸을 확인해 고친 뒤 [이어 하기]를 눌러 주세요.';
  if (r.unconfirmed) return '이 전산의 실제 화면 설정이 아직 확정되지 않았어요(개발 쪽 일).';
  return '내용을 확인한 뒤 [이어 하기]를 눌러 주세요.';
}

/** 사진 칸 중 값이 있는 것 (photo1~8) */
function photoKeys(data) {
  return Object.keys(data || {}).filter((k) => /^photo\d+$/.test(k) && String(data[k] || '').trim()).sort();
}

function today(now) {
  const d = now();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function createRegisterFlow({ jobLog, adapters, siteConfirmed, mock, now } = {}) {
  const clock = now || (() => new Date());
  const A = adapters || {};
  const confirmed = siteConfirmed || {};

  function job(jobId) {
    const j = jobLog.get(jobId);
    if (!j) throw new Error('작업을 찾을 수 없습니다: ' + jobId);
    return j;
  }
  const car = (j) => ({ carNo: j.carNo, vin: j.vin });
  const state = (j, s) => (j.sites[s] ? j.sites[s].state : 'none');
  const carinfoNo = (j) => (j.sites.carinfo && j.sites.carinfo.state === 'done' ? j.sites.carinfo.checkNo : null);
  const notImplemented = (site) => A[site] && A[site].implemented === false;
  const NOT_IMPL = (site) => ({ ok: false, notImplemented: true,
    reason: site + ' 연결 모듈이 아직 없습니다(실제 화면 확인 뒤 만듦). 이 단계는 사람이 직접 해 주세요 — 프로그램은 끝난 것으로 표시하지 않습니다.' });

  function needPrev(j, site) {
    const i = ORDER.indexOf(site);
    if (i > 0 && state(j, ORDER[i - 1]) !== 'done') {
      throw new Error(site + ' 은(는) ' + ORDER[i - 1] + ' 이(가) 끝난 뒤에 합니다(지금: ' + state(j, ORDER[i - 1]) + ').');
    }
  }

  async function stop(jobId, site, reason) {
    try { jobLog.mark(jobId, site, 'stopped', { reason }); } catch {}
    return { ok: false, stopped: true, reason };          // 멈춘 전산은 통제 유지(풀지 않음)
  }

  /** 통제기를 걸고, 본 창이 붙었는지(통제 안) 확인 */
  async function armAndCheck(site) {
    try { await A[site].armGuard(); } catch (e) { return { ok: false, reason: site + ' 저장 통제기를 걸지 못했습니다: ' + e.message }; }
    const cov = await A[site].coverage();
    if (!cov || cov.windows < 1 || (cov.unattachedWindows && cov.unattachedWindows.length)) {
      return { ok: false, reason: site + ' 저장 통제기가 창에 붙지 않았습니다 — 값 넣기와 저장을 하지 않습니다.' };
    }
    return { ok: true };
  }

  return {
    ORDER,

    /** 1. 작업 시작 — 작업 만들기 + 카인포 목록에서 이 차의 예전 번호 찍어 두기 */
    async start({ carNo, vin }) {
      //  카인포 신규등록 화면이 이미 열려 있나(입력 화면 [신규등록] 단추로 미리 한 경우) — 다른 차면 시작하지 않음
      const ps = A.carinfo.prepareState ? await A.carinfo.prepareState() : null;
      if (ps && ps.open && nc.normCar(ps.carNo) !== nc.normCar(carNo)) {
        const e = new Error('카인포에 다른 차(' + ps.carNo + ')의 등록 화면이 열려 있습니다.');
        e.otherCar = true;
        throw e;
      }
      const jobId = jobLog.newJob({ carNo, vin });
      const rows = await A.carinfo.readList({ carNo, vin });
      const old = nc.snapshotOldNumbers(rows, { carNo, vin });
      //  신규등록 때 이미 목록 줄·번호가 생긴 경우 그 번호는 «이번 작업 것» — 예전 번호에서 뺀다(빼지 않으면 저장 뒤 새 번호를 못 찾음)
      const preNo = ps && ps.open ? nc.normNo(ps.checkNo) : '';
      if (preNo) old.delete(preNo);
      jobLog.setMeta(jobId, { oldNos: [...old], startDate: today(clock), ...(ps && ps.open ? { prepared: { by: 'button', checkNo: preNo } } : {}) });
      return { ok: true, jobId, oldCount: old.size, prepared: !!(ps && ps.open) };
    },

    /** 2. 엔트리 사전 확인 — 로그인 상태 + 다음 번호(참고 경보용) */
    async entryPrecheck(jobId) {
      job(jobId);
      if (notImplemented('entry')) return NOT_IMPL('entry');
      const ls = await A.entry.loginState();
      if (!ls.loggedIn) return { ok: false, needLogin: true, reason: '엔트리 로그인이 필요합니다(문자 인증). 로그인한 뒤 다시 확인해 주세요.' };
      if (!ls.canRead) return { ok: false, needLogin: true, reason: '엔트리에 로그인은 됐지만 번호를 읽을 수 없는 상태입니다.' };
      const next = await A.entry.readNext();
      const rows = await A.carinfo.readList(null);
      const last = rows.map((r) => nc.normNo(r.checkNo)).filter(Boolean).sort().pop() || '';
      jobLog.setMeta(jobId, { entryNext: next || '', carinfoLast: last });
      return { ok: true, entryNext: next, preview: nc.previewNext(last, next) };
    },

    /**
     * 3. 값 넣기 — ① 통제기 먼저 설치·확인 ② (카모두·엔트리) 저장 전 목록 찍기 ③ 값 넣기
     *    못 넣은 칸이 있으면 filled 로 기록하지 않는다.
     */
    async fill(jobId, site, data) {
      const j = job(jobId);
      needPrev(j, site);
      if (notImplemented(site)) return NOT_IMPL(site);
      if (site === 'entry') {
        const ls = await A.entry.loginState();
        if (!ls.loggedIn || !ls.canRead) return { ok: false, needLogin: true, reason: '엔트리 로그인이 끊겼습니다. 다시 로그인(문자 인증)해 주세요.' };
      }
      const armed = await armAndCheck(site);
      if (!armed.ok) return armed;
      if (site !== 'carinfo') {
        const rows = await A[site].readList(car(j));
        jobLog.setMeta(jobId, { oldBySite: { [site]: [...nc.snapshotOldNumbers(rows, car(j))] } });
      }
      if (site === 'carinfo' && A.carinfo.prepare) {
        const p = await this.prepare(jobId, data);
        if (!p.ok) return p;
      }
      const extra = site === 'carinfo' ? {} : { checkNo: carinfoNo(j) };
      const r = await A[site].fill(data, extra);
      if (r.needDealerPick) return { ok: false, needDealerPick: true, rows: r.rows || [], reason: '딜러(사원)를 골라야 합니다.' };
      if (r.missing && r.missing.length) return { ok: false, missing: r.missing, reason: '못 넣은 칸이 있어 저장 단계로 가지 않습니다: ' + r.missing.slice(0, 5).join(' · ') };
      //  사진 — 저장 전에 올리는 전산이면 여기서(못 올리면 저장 단계로 가지 않음) · 언제 올리는지 모르면 멈춤
      const ph = photoKeys(data);
      if (ph.length && A[site].photoPhase !== undefined) {
        if (!A[site].photoPhase) return { ok: false, missing: ['사진'], reason: NAME[site] + ' 사진을 저장 전·후 언제 올리는지 아직 확인되지 않아 저장 단계로 가지 않습니다(실제 화면 확인 필요).' };
        if (A[site].photoPhase === 'beforeSave') {
          const up = await this.photos(jobId, site, data);
          if (!up.ok) return { ok: false, missing: up.missing, reason: '사진을 다 올리지 못해 저장 단계로 가지 않습니다: ' + up.missing.slice(0, 3).join(' · ') };
        }
      }
      jobLog.mark(jobId, site, 'filled');
      return { ok: true, filled: r.filled || [] };
    },

    /**
     * 카인포 신규등록(7차) — 값 넣기 안에서 통제기를 건 뒤에 부른다.
     *  · 이 차 등록 화면이 이미 열려 있으면 그대로 씀(입력 화면 단추로 미리 했거나, 이어 하기)
     *  · 다른 차 화면이면 멈춤
     *  · 이 작업에서 신규등록을 이미 했는데(기록 있음) 화면이 닫혔으면 다시 하지 않고 멈춤(같은 차 두 번 생김 막기)
     *  · 신규등록 전에 기록을 먼저 남김 — 도중에 프로그램이 꺼져도 «했을 수 있음»을 안다
     */
    async prepare(jobId, data) {
      const j = job(jobId);
      const ps = await A.carinfo.prepareState();
      if (ps.open && nc.normCar(ps.carNo) !== nc.normCar(j.carNo)) {
        return { ok: false, otherCar: true, reason: '카인포에 다른 차(' + ps.carNo + ')의 등록 화면이 열려 있습니다 — 이 차 값을 넣지 않았어요.' };
      }
      if (ps.open) {
        if (!(j.meta && j.meta.prepared)) jobLog.setMeta(jobId, { prepared: { by: 'button', checkNo: nc.normNo(ps.checkNo) } });
        return { ok: true, skipped: true };
      }
      if (j.meta && j.meta.prepared) {
        return { ok: false, prepareLost: true, reason: '이 작업에서 카인포 신규등록을 이미 했는데(또는 하다 멈췄는데) 등록 화면이 닫혀 있습니다.' };
      }
      jobLog.setMeta(jobId, { prepared: { by: 'flow', checkNo: '' } });
      const p = await A.carinfo.prepare(data);
      if (p && p.needPick) {
        //  딜러 고르기는 [확인] 전 단계 — 아직 아무것도 만들지 않았으므로 기록을 지운다
        jobLog.setMeta(jobId, { prepared: null });
        return { ok: false, needDealerPick: true, prepareNeedPick: true, rows: p.candidates || [], reason: '카인포 신규등록에서 딜러를 골라야 합니다.' };
      }
      if (!p || !p.ok) {
        if (p && p.notConfigured) jobLog.setMeta(jobId, { prepared: null });       // 설정이 없어 요청 자체를 안 함
        else jobLog.setMeta(jobId, { prepared: { by: 'flow', checkNo: '', failed: true } });
        return { ok: false, unconfirmed: !!(p && p.notConfigured), reason: '카인포 신규등록을 마치지 못했습니다: ' + ((p && p.error) || '알 수 없는 까닭') };
      }
      const after = await A.carinfo.prepareState();
      if (!after.open || nc.normCar(after.carNo) !== nc.normCar(j.carNo)) {
        return { ok: false, prepareLost: true, reason: '카인포 신규등록 뒤 이 차 등록 화면이 보이지 않습니다.' };
      }
      jobLog.setMeta(jobId, { prepared: { by: 'flow', checkNo: nc.normNo(after.checkNo) } });
      return { ok: true };
    },

    /**
     * 사진 올리기(7차) — 작업 기록에 남은 칸만 올리고, 올린 칸을 기록한다.
     *  돌려줌 { ok, done:[칸], missing:[까닭] }  · 사진이 없으면 ok
     */
    async photos(jobId, site, data) {
      const j = job(jobId);
      const had = new Set((j.meta && j.meta.photos && j.meta.photos[site]) || []);
      const only = photoKeys(data).filter((k) => !had.has(k));
      if (!only.length) return { ok: true, done: [...had], missing: [] };
      const r = (await A[site].photos(data, { only })) || {};
      const done = [...had, ...(r.done || []).filter((k) => only.includes(k))];
      jobLog.setMeta(jobId, { photos: { [site]: done } });
      const left = only.filter((k) => !done.includes(k));
      const missing = (r.missing || []).concat(left.length && !(r.missing || []).length ? ['못 올린 칸: ' + left.join(', ')] : []);
      return { ok: left.length === 0, done, missing };
    },

    /** 4. [저장해도 돼요] — 저장 전 확인(카모두·엔트리 번호) → 작업 기록(beginSubmit) → 통제기 허락 */
    async allowSave(jobId, site, opts = {}) {
      const j = job(jobId);
      needPrev(j, site);
      if (notImplemented(site)) return NOT_IMPL(site);
      if (!mock && confirmed[site] !== true) {
        return { ok: false, unconfirmed: true, reason: site + ' 의 저장 경로 설정이 아직 확인되지 않아 저장을 허락하지 않습니다(통제 범위 미확정).' };
      }
      const cov = await A[site].coverage();
      if (!cov || cov.windows < 1 || (cov.unattachedWindows && cov.unattachedWindows.length)) {
        return { ok: false, reason: '저장 통제기가 붙지 않은 창이 있어 저장을 허락하지 않습니다.' };
      }
      if (cov.sealed) return { ok: false, reason: '이 창은 봉인돼 있습니다(이미 끝난 저장). 새 작업에서 다시 값을 넣어 주세요.' };
      if (site === 'carmodoo') {
        const f = await A.carmodoo.readForm();
        const c = nc.checkCarmodooBeforeSave({ carinfoNo: carinfoNo(j), fieldValue: f.numberValue, autoAssignOn: f.autoAssignOn });
        if (!c.ok) return { ok: false, reason: c.reason };
      }
      if (site === 'entry') {
        const ls = await A.entry.loginState();
        if (!ls.loggedIn || !ls.canRead) return { ok: false, needLogin: true, reason: '엔트리 로그인이 끊겼습니다. 다시 로그인한 뒤 번호부터 다시 확인합니다.' };
        const ld = await A.entry.readLoaded();
        const c = nc.checkEntryBeforeSave({ carinfoNo: carinfoNo(j), entryNo: ld.entryNo, entryCarNo: ld.carNo, entryVin: ld.vin,
                                            car: car(j), partialConfirmedBy: opts.partialConfirmedBy });
        if (!c.ok) return { ok: false, needsConfirm: !!c.needsConfirm, reason: c.reason };
      }
      const b = jobLog.beginSubmit(jobId, site);
      if (!b.ok) return b;
      const u = await A[site].unlockSave();
      if (u === false) {
        jobLog.cancelSubmit(jobId, site, { sentCount: 0, by: '저장 통제기(봉인)' });
        return { ok: false, reason: '저장 통제기가 허락을 받지 않았습니다(봉인).' };
      }
      return { ok: true };
    },

    /**
     * 5. 저장 뒤 확인 — 통제기 결과 + 목록 다시 읽기
     *    notSent → 취소 · unknownPath → 멈춤 · manualCheck(팝업) → 사람 확인 · uncertain/waiting → 불확실 유지
     *    reached → 목록에서 실제 저장·번호 확인 → 맞으면 done + 봉인, 다르면 멈춤
     */
    async afterSave(jobId, site, opts = {}) {
      const j = job(jobId);
      if (state(j, site) !== 'uncertain') return { ok: false, reason: site + ' 은(는) 저장을 허락한 상태가 아닙니다(' + state(j, site) + ').' };
      const o = await A[site].saveOutcome();
      if (o.result === 'notSent') {
        jobLog.cancelSubmit(jobId, site, { sentCount: o.sent, by: '저장 통제기' });
        return { ok: false, notSent: true, reason: '저장 요청이 나가지 않았습니다(취소로 처리). 다시 [저장해도 돼요]를 눌러 주세요.' };
      }
      if (o.result === 'unknownPath') return stop(jobId, site, '알 수 없는 저장 경로: ' + (o.reasons || []).join(' · '));
      if (o.result === 'manualCheck') {
        jobLog.noteUncertain(jobId, site, (o.reasons || []).join(' · '));
        return { ok: false, manual: true, uncertain: true, reason: '저장 중 팝업이 열려 프로그램이 저장 여부를 보장할 수 없습니다. 목록에서 저장됐는지 직접 확인해 주세요.' };
      }
      if (o.result !== 'reached') {
        jobLog.noteUncertain(jobId, site, (o.reasons || [o.result]).join(' · '));
        return { ok: false, uncertain: true, reason: '저장 결과를 확실히 모릅니다. 목록에서 저장됐는지 확인해 주세요.' };
      }
      return this.confirmFromList(jobId, site, opts);
    },

    /**
     * 6. 목록으로 저장·번호 확인 (afterSave 가 부름 · 사람이 불확실을 정리한 뒤에도 부름)
     *    opts.partialConfirmedBy — 차대번호 일부 일치를 사람이 확인했을 때
     *    opts.manualChecked — 팝업 저장(manualCheck)을 사람이 목록에서 확인했다는 표시(누가)
     */
    async confirmFromList(jobId, site, opts = {}) {
      const j = job(jobId);
      const st = state(j, site);
      if (st === 'uncertain') {
        //  불확실(팝업 포함)을 프로그램이 스스로 «저장됨»으로 바꾸지 않는다 — 팝업 경로는 사람 표시가 있어야
        const last = (j.sites[site] && j.sites[site].lastReason) || '';
        if (/팝업/.test(last) && !String(opts.manualChecked || '').trim()) {
          return { ok: false, manual: true, reason: '팝업 저장은 사람이 목록을 확인했다는 표시가 있어야 이어 갑니다.' };
        }
      }
      if (site === 'carinfo') {
        if (!j.meta || !j.meta.oldNos) return { ok: false, reason: '저장 전 목록을 찍어 둔 기록이 없어 새 번호를 구분할 수 없습니다.' };
        const rows = await A.carinfo.readList(car(j));
        //  목록에 차대번호 칸이 없는 전산(실제 카인포) — 이번에 새로 생긴 이 차 줄만 눌러 차대번호를 읽어 채운다(7차)
        if (A.carinfo.readRowVin) {
          const old = new Set(j.meta.oldNos);
          for (const x of rows) {
            if (nc.normCar(x.carNo) === nc.normCar(j.carNo) && !nc.normVin(x.vin) && nc.normNo(x.checkNo) && !old.has(nc.normNo(x.checkNo))) {
              x.vin = (await A.carinfo.readRowVin(nc.normNo(x.checkNo))) || '';
            }
          }
        }
        const r = nc.findNewNumber(rows, car(j), new Set(j.meta.oldNos), j.meta.startDate, opts);
        if (!r.ok && r.needsConfirm) {
          if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: r.checkNo, note: '목록에 새 줄 있음(차대번호 일부 일치)' });
          return { ok: false, needsConfirm: true, checkNo: r.checkNo, reason: r.reason };
        }
        if (!r.ok) {
          if (st === 'uncertain') jobLog.noteUncertain(jobId, site, r.reason);
          return { ok: false, uncertain: st === 'uncertain', reason: r.reason };
        }
        //  신규등록 때 목록 줄이 먼저 생기는 전산이면(또는 그런지 아직 모르면) «줄이 있다»는 저장 증거가 못 된다 —
        //  저장 전에도 그 줄이 있기 때문. 목록 «상태» 칸이 «저장 끝»(설정 savedStatus)일 때만 저장됨으로 본다. 모르면 사람 확인.
        if (j.meta.prepared && A.carinfo.prepareCreatesRow !== false && !String(opts.manualChecked || '').trim()) {
          const row = rows.find((x) => nc.normNo(x.checkNo) === r.checkNo);
          const re = A.carinfo.savedStatus ? new RegExp(A.carinfo.savedStatus) : null;
          if (!re || !row || !re.test(String(row.status || ''))) {
            const why = '이 차 줄(' + r.checkNo + ')은 신규등록 때 생기는 줄이라 목록 «상태»로 저장을 확인해야 하는데, ' +
              (re ? '아직 저장 끝 상태가 아닙니다.' : '«저장 끝» 상태 글자 설정이 아직 없습니다(실제 화면 확인 필요).');
            if (st === 'uncertain') jobLog.noteUncertain(jobId, site, why);
            return { ok: false, manual: true, uncertain: st === 'uncertain', reason: why };
          }
        }
        if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: r.checkNo, ...(opts.manualChecked ? { by: opts.manualChecked } : {}) });
        jobLog.mark(jobId, site, 'numberChecked', { checkNo: r.checkNo, ...(r.confirmedBy ? { by: r.confirmedBy } : {}) });
        jobLog.mark(jobId, site, 'done');
        await A[site].seal();
        return { ok: true, checkNo: r.checkNo };
      }
      //  카모두·엔트리: 저장 전 목록과 비교해 이번에 새로 생긴 우리 차 줄 하나 → 번호 = 카인포 번호
      const old = j.meta && j.meta.oldBySite && j.meta.oldBySite[site];
      if (!old) return { ok: false, reason: site + ' 저장 전 목록을 찍어 둔 기록이 없어 이번 저장 줄을 구분할 수 없습니다.' };
      const rows = await A[site].readList(car(j));
      const r = nc.findNewSavedRow(rows, car(j), new Set(old), site + ' 목록');
      if (!r.ok) {
        if (r.multiple) return stop(jobId, site, r.reason);
        if (st === 'uncertain') jobLog.noteUncertain(jobId, site, r.reason);
        return { ok: false, uncertain: st === 'uncertain', needsConfirm: !!r.needsConfirm, reason: r.reason };
      }
      if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: r.checkNo, ...(opts.manualChecked ? { by: opts.manualChecked } : {}) });
      const c = nc.checkCarmodooAfterSave({ carinfoNo: carinfoNo(j), savedNo: r.checkNo });
      if (!c.ok) return stop(jobId, site, c.reason + ' — 다른 차 기록일 수 있습니다. 대표님이 확인해 주세요.');
      jobLog.mark(jobId, site, 'numberChecked', { checkNo: r.checkNo });
      jobLog.mark(jobId, site, 'done');
      await A[site].seal();
      return { ok: true, checkNo: r.checkNo };
    },

    /**
     * 흐름 중 기존 단추(개별 전송·사진만 전송 등)를 막아야 하는가 — 막아야 하면 까닭, 아니면 null
     *  닫히지 않은 작업이 있으면 그 작업이 쓰는 전산의 기존 단추는 막는다(통제기 우회 방지).
     */
    legacyBlocked(site) {
      const { list, forcedBlocks } = jobLog.resumeList();
      if (forcedBlocks && forcedBlocks.length) return '강제로 닫힌 작업이 정리되지 않았습니다(관리자 확인 필요).';
      const busy = list.find((x) => x.sites && x.sites[site] && x.sites[site].state !== 'none');
      if (busy) return '등록 흐름 작업(' + busy.jobId + ')이 이 전산을 쓰는 중입니다. 흐름 화면에서 이어 해 주세요.';
      return null;
    },

    /** 7. 끝 — 세 전산 모두 끝났으면 정상 닫기 (엔트리 미구현이면 끝나지 않음) */
    finish(jobId) {
      const c = jobLog.closeCheck(jobId);
      if (!c.ok) return { ok: false, reasons: c.reasons, ...(notImplemented('entry') ? { notImplemented: ['entry'] } : {}) };
      jobLog.close(jobId);
      return { ok: true };
    },

    resume() { return jobLog.resumeList(); },

    /**
     * 한 번에 끝까지 — 정상이면 사람 조작 없이 세 전산 등록 · 검증 · 작업 닫기.
     *  jobId 를 주면 그 작업을 이어 한다(멈춘 뒤 [이어 하기] · 프로그램을 다시 켠 뒤). 끝난 전산은 건너뛴다.
     *  불확실(저장했는지 모름)인 전산은 다시 저장하지 않고 목록으로만 확인한다.
     *  opts: { onStep(info), pollMs, waitMs, sendWaitMs }  — waitMs: 저장 뒤 응답 기다리는 한도(넘으면 불확실)
     *        sendWaitMs: [저장]을 누른 뒤 저장 요청이 나타나기를 기다리는 한도(넘도록 없으면 «안 나감»)
     *  돌려주는 것: { ok:true, jobId, numbers, ms } 또는 explain 모양 { ok:false, jobId, carNo, site, siteName, step, reason, action, … }
     */
    async runAll({ jobId, carNo, vin, data } = {}, opts = {}) {
      const t0 = Date.now();
      const pollMs = opts.pollMs || 200, waitMs = opts.waitMs || 30000;
      const say = (site, step, note) => { try { opts.onStep && opts.onStep({ site, siteName: NAME[site] || '', step: STEP[step] || step, note: note || '' }); } catch {} };
      const times = {};
      const self = this;
      /** 저장 뒤에 사진을 올리는 전산이면 남은 칸 올리기 — 못 올리면 멈춤(저장은 다시 안 함) */
      async function afterPhotos(site) {
        if (!A[site] || A[site].photoPhase !== 'afterSave' || !photoKeys(data || {}).length) return { ok: true };
        say(site, 'photo');
        const up = await self.photos(jobId, site, data || {});
        if (!up.ok) return fail(site, 'photo', { photoFail: true, reason: '사진을 다 올리지 못했어요: ' + up.missing.slice(0, 3).join(' · ') });
        return { ok: true };
      }
      const fail = (site, step, r) => ({ ok: false, jobId, carNo: (jobLog.get(jobId) || {}).carNo || carNo, site, siteName: NAME[site] || '',
        step: STEP[step] || step, reason: r.reason || (r.reasons || []).join(' · ') || '알 수 없는 까닭', action: actionFor(r, site), detail: r, ms: Date.now() - t0 });

      if (!jobId) {
        try {
          const s0 = await this.start({ carNo, vin });
          jobId = s0.jobId;
        } catch (e) {
          //  같은 차의 끝나지 않은 작업 = 중복 등록 의심 → 새로 시작하지 않고 이어 하기로
          const dup = /끝나지 않은 작업/.test(e.message);
          return { ok: false, carNo, site: dup ? '' : 'carinfo', siteName: dup ? '' : '카인포', step: '시작', reason: e.message,
                   action: dup ? '같은 차가 이미 등록 중이에요. 새로 시작하지 말고 그 작업을 [이어 하기] 해 주세요.' : actionFor({ otherCar: !!e.otherCar, unconfirmed: /설정/.test(e.message) }, 'carinfo'),
                   detail: { duplicate: dup }, ms: Date.now() - t0 };
        }
      }
      const j0 = job(jobId);
      //  엔트리 먼저 확인 — 카인포를 저장한 뒤 엔트리가 끊겨 있으면 순서가 꼬이므로(설계서 2판)
      if (state(j0, 'carinfo') !== 'done') {
        say('entry', 'precheck');
        const pre = await this.entryPrecheck(jobId);
        if (!pre.ok && !pre.notImplemented) return fail('entry', 'precheck', pre);
      }
      for (const site of ORDER) {
        const ts = Date.now();
        let j = job(jobId);
        let st = state(j, site);
        if (st === 'done') {
          //  이어 하기: 저장은 끝났는데 저장 뒤 사진이 남았으면 사진만
          const pa = await afterPhotos(site);
          if (!pa.ok) return pa;
          continue;
        }
        if (st === 'stopped') return fail(site, 'verify', { stopped: true, reason: (j.sites[site] && j.sites[site].lastReason) || '멈춘 작업입니다.' });
        if (site === 'entry' && notImplemented('entry')) return fail('entry', 'fill', NOT_IMPL('entry'));
        //  엔트리 번호 규칙: 엔트리가 매길 «다음 번호»가 이 차 카인포 번호와 같아야(다르면 다른 차 기록이 끌려옴)
        if (site === 'entry' && (st === 'none' || st === 'filled')) {
          say(site, 'entryNext');
          //  엔트리 화면이 예전 «다음 번호»를 보여 줄 수 있다 — 새로 고친 뒤 한 번만 읽는다(어긋남을 다시 읽어 넘기지 않음)
          if (A.entry.refresh) await A.entry.refresh();
          const ls = await A.entry.loginState();
          if (!ls.loggedIn || !ls.canRead) return fail(site, 'entryNext', { needLogin: true, reason: '엔트리 로그인이 끊겼습니다.' });
          const next = nc.normNo(await A.entry.readNext());
          const want = carinfoNo(j);
          if (!next || next !== want) return fail(site, 'entryNext', { stopped: false, reason: '엔트리 다음 번호(' + (next || '읽지 못함') + ')가 이 차 카인포 번호(' + want + ')와 다릅니다 — 다른 차 기록이 끌려올 수 있어 멈췄어요.', mismatch: true });
        }
        if (st === 'uncertain') {
          //  다시 저장하지 않는다 — 목록으로만 확인
          say(site, 'verify', '저장 여부 목록 확인');
          const c = await this.confirmFromList(jobId, site);
          if (!c.ok) return fail(site, 'verify', c);
          times[site] = Date.now() - ts;
          continue;
        }
        if (st === 'saveConfirmed') {
          const c = await this.confirmFromList(jobId, site);
          if (!c.ok) return fail(site, 'verify', c);
          times[site] = Date.now() - ts;
          continue;
        }
        if (site === 'carinfo' && A.carinfo.prepare && !(j.meta && j.meta.prepared)) say(site, 'prepare');
        say(site, 'fill');
        const f = await this.fill(jobId, site, data || {});
        if (!f.ok) return fail(site, 'fill', f);
        say(site, 'allow');
        const a = await this.allowSave(jobId, site);
        if (!a.ok) return fail(site, 'allow', a);
        say(site, 'save');
        if (!A[site].clickSave) return fail(site, 'save', { reason: NAME[site] + ' [저장] 누르기 기능이 없습니다.', unconfirmed: true });
        //  단추를 못 찾아도 여기서 판단하지 않는다 — 저장 요청이 안 나갔으면 notSent(취소), 나갔으면 afterSave 가 판단
        await A[site].clickSave();
        //  응답 기다리기 (한도를 넘으면 불확실)
        //  단추를 누른 직후에는 저장 요청이 아직 안 나갔을 수 있다(사이트가 잠깐 뒤에 보냄) —
        //  «안 나감»은 sendWaitMs 동안 기다려도 요청이 없을 때만 판단한다(Electron 모의 시험에서 찾은 문제)
        const sendUntil = Date.now() + (opts.sendWaitMs || 3000);
        const until = Date.now() + waitMs;
        for (;;) {
          const o = await A[site].saveOutcome();
          if (o.result === 'notSent' && Date.now() < sendUntil) { await new Promise((r) => setTimeout(r, pollMs)); continue; }
          if (o.result !== 'waiting') break;
          if (Date.now() > until) { if (A[site].timeout) await A[site].timeout(); break; }
          await new Promise((r) => setTimeout(r, pollMs));
        }
        say(site, 'verify');
        const v = await this.afterSave(jobId, site);
        if (!v.ok) return fail(site, v.notSent ? 'save' : 'verify', v.notSent ? { ...v, reason: NAME[site] + ' [저장] 요청이 나가지 않았어요(단추를 못 찾았거나 화면이 막힘).', missing: ['저장 단추'] } : v);
        const pa = await afterPhotos(site);
        if (!pa.ok) return pa;
        times[site] = Date.now() - ts;
      }
      say('', 'finish');
      const fin = this.finish(jobId);
      if (!fin.ok) return fail('', 'finish', { reason: (fin.reasons || []).join(' · ') });
      const j = job(jobId);
      return { ok: true, jobId, carNo: j.carNo, numbers: { carinfo: j.sites.carinfo.checkNo, carmodoo: j.sites.carmodoo.checkNo, entry: j.sites.entry.checkNo },
               ms: Date.now() - t0, times };
    },
  };
}

module.exports = { createRegisterFlow, ORDER, NAME, actionFor };
