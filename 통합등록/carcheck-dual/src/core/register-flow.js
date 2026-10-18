/**
 * 등록 흐름 지휘 — 카인포 → 카모두 → 엔트리를 «한 단계씩, 확인하며» 잇는다
 * ------------------------------------------------------------------
 *  업무 관리 칸(상용화 고려): 전산 화면을 직접 만지지 않는다. 전산마다 «연결 모듈(adapter)»을 받아 부른다.
 *  가온 내부용 연결 모듈은 `src/sites/flow-adapters.js`(Electron), 시험용은 흉내 모듈.
 *
 *  쓰는 안전 모듈: job-log(단계·두 번 등록 막기) · number-check(번호·차대번호) · save-guard 결과(adapter 가 돌려줌)
 *
 *  연결 모듈이 갖춰야 할 것(모두 async):
 *    공통      fill(data, extra) → {filled[], missing[]} · unlockSave() · saveOutcome() → save-guard outcome()
 *              armGuard() — 값 넣기 뒤 저장 통제기를 걸어 둠(사람이 아무 때나 저장하지 못하게)
 *              coverage() → save-guard coverage()
 *    carinfo   readList(car) → [{checkNo, carNo, vin, date, status}]
 *    carmodoo  readForm() → {autoAssignOn, numberValue} · readSaved(car) → {checkNo}
 *    entry     loginState() → {loggedIn, canRead} · readNext() → 번호 · load(checkNo) · readLoaded() → {entryNo, carNo, vin}
 *              readSaved(car) → {checkNo}
 *
 *  사람이 하는 일(이 모듈이 대신하지 않음): 각 전산 [저장] 누르기 · 문자 인증 · 차대번호 일부 일치 확인 · 불확실 정리
 *
 *  설정이 확정되지 않았으면(siteConfirmed[site] false) 저장 허락(allowSave)을 하지 않는다 — 모의 환경(mock:true)만 예외.
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
  const carinfoNo = (j) => j.sites.carinfo && j.sites.carinfo.state === 'done' ? j.sites.carinfo.checkNo : null;

  /** 앞 전산이 끝났는가 (순서: 카인포 → 카모두 → 엔트리) */
  function needPrev(j, site) {
    const i = ORDER.indexOf(site);
    if (i > 0 && state(j, ORDER[i - 1]) !== 'done') {
      throw new Error(site + ' 은(는) ' + ORDER[i - 1] + ' 이(가) 끝난 뒤에 합니다(지금: ' + state(j, ORDER[i - 1]) + ').');
    }
  }

  /** 그 전산의 저장 통제를 푼다(끝났거나 멈췄을 때) — 기존 단추들이 평소처럼 쓰이도록 */
  async function release(site) {
    try { if (A[site] && A[site].release) await A[site].release(); } catch {}
  }

  async function stop(jobId, site, reason) {
    try { jobLog.mark(jobId, site, 'stopped', { reason }); } catch {}
    //  멈춘 전산은 통제를 풀지 않는다 — 사람이 정리하기 전에 저장이 나가지 않게
    return { ok: false, stopped: true, reason };
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
      const ls = await A.entry.loginState();
      if (!ls.loggedIn) return { ok: false, needLogin: true, reason: '엔트리 로그인이 필요합니다(문자 인증). 로그인한 뒤 다시 확인해 주세요.' };
      if (!ls.canRead) return { ok: false, needLogin: true, reason: '엔트리에 로그인은 됐지만 번호를 읽을 수 없는 상태입니다.' };
      const next = await A.entry.readNext();
      const rows = await A.carinfo.readList(null);
      const last = rows.map((r) => nc.normNo(r.checkNo)).filter(Boolean).sort().pop() || '';
      jobLog.setMeta(jobId, { entryNext: next || '', carinfoLast: last });
      return { ok: true, entryNext: next, preview: nc.previewNext(last, next) };
    },

    /** 3. 값 넣기 — 넣은 뒤 저장 통제기를 걸어 둔다. 못 넣은 칸이 있으면 filled 로 기록하지 않는다 */
    async fill(jobId, site, data) {
      const j = job(jobId);
      needPrev(j, site);
      const extra = site === 'carmodoo' || site === 'entry' ? { checkNo: carinfoNo(j) } : {};
      if (site === 'entry') {
        const ls = await A.entry.loginState();
        if (!ls.loggedIn || !ls.canRead) return { ok: false, needLogin: true, reason: '엔트리 로그인이 끊겼습니다. 다시 로그인(문자 인증)해 주세요.' };
      }
      const r = await A[site].fill(data, extra);
      await A[site].armGuard();
      if (r.missing && r.missing.length) return { ok: false, missing: r.missing, reason: '못 넣은 칸이 있어 저장 단계로 가지 않습니다.' };
      jobLog.mark(jobId, site, 'filled');
      return { ok: true, filled: r.filled || [] };
    },

    /** 4. [저장해도 돼요] — 저장 전 확인(카모두·엔트리 번호) → 작업 기록(beginSubmit) → 통제기 허락 */
    async allowSave(jobId, site, opts = {}) {
      const j = job(jobId);
      needPrev(j, site);
      if (!mock && confirmed[site] !== true) {
        return { ok: false, reason: site + ' 의 저장 경로 설정이 아직 확인되지 않아 저장을 허락하지 않습니다(통제 범위 미확정).' };
      }
      const cov = await A[site].coverage();
      if (cov.unattachedWindows && cov.unattachedWindows.length) {
        return { ok: false, reason: '저장 통제기가 붙지 않은 창이 있어 저장을 허락하지 않습니다.' };
      }
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
      await A[site].unlockSave();
      return { ok: true };
    },

    /**
     * 5. 저장 뒤 확인 — 통제기 결과 + 목록 다시 읽기로 판단
     *    notSent → 취소(다시 저장 가능) · unknownPath → 멈춤 · uncertain/waiting → 불확실 유지(목록 확인 필요)
     *    reached → 목록에서 실제 저장·번호 확인 → 맞으면 done, 다르면 멈춤
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
      if (o.result !== 'reached') {
        jobLog.noteUncertain(jobId, site, (o.reasons || [o.result]).join(' · '));
        return { ok: false, uncertain: true, reason: '저장 결과를 확실히 모릅니다. 목록에서 저장됐는지 확인해 주세요.' };
      }
      return this.confirmFromList(jobId, site, opts);
    },

    /**
     * 6. 목록으로 저장·번호 확인 (afterSave 가 부르고, 불확실 정리 때 사람이 다시 부를 수도 있음)
     *    opts.partialConfirmedBy — 차대번호 일부 일치를 사람이 확인했을 때
     */
    async confirmFromList(jobId, site, opts = {}) {
      const j = job(jobId);
      const st = state(j, site);
      if (site === 'carinfo') {
        const rows = await A.carinfo.readList(car(j));
        const old = new Set((j.meta && j.meta.oldNos) || []);
        if (!j.meta || !j.meta.oldNos) return { ok: false, reason: '저장 전 목록을 찍어 둔 기록이 없어 새 번호를 구분할 수 없습니다.' };
        const r = nc.findNewNumber(rows, car(j), old, j.meta.startDate, opts);
        if (!r.ok && r.needsConfirm) {
          if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: r.checkNo, note: '목록에 새 줄 있음(차대번호 일부 일치)' });
          return { ok: false, needsConfirm: true, checkNo: r.checkNo, reason: r.reason };
        }
        if (!r.ok) {
          if (st === 'uncertain') jobLog.noteUncertain(jobId, site, r.reason);
          return { ok: false, uncertain: st === 'uncertain', reason: r.reason };
        }
        if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: r.checkNo });
        jobLog.mark(jobId, site, 'numberChecked', { checkNo: r.checkNo, ...(r.confirmedBy ? { by: r.confirmedBy } : {}) });
        jobLog.mark(jobId, site, 'done');
        await release(site);
        return { ok: true, checkNo: r.checkNo };
      }
      //  카모두·엔트리: 저장된 번호 = 카인포 번호
      const saved = await A[site].readSaved(car(j));
      if (!saved || !nc.normNo(saved.checkNo)) {
        if (st === 'uncertain') jobLog.noteUncertain(jobId, site, '저장된 번호를 목록에서 찾지 못함');
        return { ok: false, uncertain: true, reason: site + ' 목록에서 이 차의 저장된 번호를 찾지 못했습니다.' };
      }
      if (st === 'uncertain') jobLog.mark(jobId, site, 'saveConfirmed', { checkNo: saved.checkNo });
      const c = nc.checkCarmodooAfterSave({ carinfoNo: carinfoNo(j), savedNo: saved.checkNo });
      if (!c.ok) return stop(jobId, site, c.reason + ' — 다른 차 기록일 수 있습니다. 대표님이 확인해 주세요.');
      jobLog.mark(jobId, site, 'numberChecked', { checkNo: saved.checkNo });
      jobLog.mark(jobId, site, 'done');
      await release(site);
      return { ok: true, checkNo: saved.checkNo };
    },

    /** 엔트리: 카인포 번호로 불러오기 (저장 전) */
    async entryLoad(jobId) {
      const j = job(jobId);
      needPrev(j, 'entry');
      const ls = await A.entry.loginState();
      if (!ls.loggedIn || !ls.canRead) return { ok: false, needLogin: true, reason: '엔트리 로그인이 필요합니다(문자 인증).' };
      await A.entry.load(carinfoNo(j));
      return { ok: true };
    },

    /** 7. 끝 — 세 전산 모두 끝났으면 정상 닫기 */
    finish(jobId) {
      const c = jobLog.closeCheck(jobId);
      if (!c.ok) return { ok: false, reasons: c.reasons };
      jobLog.close(jobId);
      return { ok: true };
    },

    /** 다시 켰을 때 */
    resume() { return jobLog.resumeList(); },
  };
}

module.exports = { createRegisterFlow, ORDER };
