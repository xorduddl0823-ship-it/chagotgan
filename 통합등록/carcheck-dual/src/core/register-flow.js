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
 *  사람이 하는 일(대신하지 않음): 각 전산 [저장] · 문자 인증 · 차대번호 일부 일치 확인 · 불확실·팝업 저장 정리
 *  설정이 확정되지 않았으면(siteConfirmed[site] false) 저장 허락을 하지 않는다 — 모의 환경(mock:true)만 예외.
 */
const nc = require('./number-check');

const ORDER = ['carinfo', 'carmodoo', 'entry'];

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
      const jobId = jobLog.newJob({ carNo, vin });
      const rows = await A.carinfo.readList({ carNo, vin });
      const old = nc.snapshotOldNumbers(rows, { carNo, vin });
      jobLog.setMeta(jobId, { oldNos: [...old], startDate: today(clock) });
      return { ok: true, jobId, oldCount: old.size };
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
      const extra = site === 'carinfo' ? {} : { checkNo: carinfoNo(j) };
      const r = await A[site].fill(data, extra);
      if (r.missing && r.missing.length) return { ok: false, missing: r.missing, reason: '못 넣은 칸이 있어 저장 단계로 가지 않습니다.' };
      jobLog.mark(jobId, site, 'filled');
      return { ok: true, filled: r.filled || [] };
    },

    /** 4. [저장해도 돼요] — 저장 전 확인(카모두·엔트리 번호) → 작업 기록(beginSubmit) → 통제기 허락 */
    async allowSave(jobId, site, opts = {}) {
      const j = job(jobId);
      needPrev(j, site);
      if (notImplemented(site)) return NOT_IMPL(site);
      if (!mock && confirmed[site] !== true) {
        return { ok: false, reason: site + ' 의 저장 경로 설정이 아직 확인되지 않아 저장을 허락하지 않습니다(통제 범위 미확정).' };
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
        const r = nc.findNewNumber(rows, car(j), new Set(j.meta.oldNos), j.meta.startDate, opts);
        if (!r.ok && r.needsConfirm) {
          if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: r.checkNo, note: '목록에 새 줄 있음(차대번호 일부 일치)' });
          return { ok: false, needsConfirm: true, checkNo: r.checkNo, reason: r.reason };
        }
        if (!r.ok) {
          if (st === 'uncertain') jobLog.noteUncertain(jobId, site, r.reason);
          return { ok: false, uncertain: st === 'uncertain', reason: r.reason };
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
  };
}

module.exports = { createRegisterFlow, ORDER };
