/**
 * 작업 기록 (차 한 대 = 작업 하나) — 꺼져도 남고, 다시 켜면 이어 본다
 * ------------------------------------------------------------------
 *  설계서 2판 6장. 전산 이름은 문자열로만 받는다(카인포·카모두·엔트리를 모름).
 *
 *  ⚠ 2026-10-18 현재: 이 모듈은 모의 시험만 통과했고 **실제 등록 흐름(main.js)에는 아직 연결하지 않았다.**
 *     연결할 자리는 `통합등록/기획/2026-10-18_연결설계_job-log_number-check.md` 에 있다.
 *
 *  ── 전산별 상태와 허용 전이 (이 표에 없는 이동은 모두 거절) ──────────────────
 *
 *    상태            뜻
 *    none            아직 아무것도 안 함
 *    filled          프로그램이 값을 다 채움
 *    uncertain       저장 단추를 풀어 줌(submitReady) — 저장했는지 아직 모름
 *    saveConfirmed   저장된 것을 화면에서 확인함
 *    numberChecked   실제 번호를 읽어 맞는지 확인함 (점검번호 필수)
 *    done            이 전산은 끝
 *    stopped         멈춤 (번호 다름 등) — 사람이 정리해야 함. 여기서는 더 못 감(작업째 관리자 강제 닫기)
 *
 *    이동                         누가/어떻게
 *    none      → filled           mark('filled')
 *    filled    → filled           mark('filled')            값을 고쳐 다시 채움 (저장 전이라 괜찮음)
 *    filled    → uncertain        beginSubmit()             잠금 안에서 «한 번에 한 대» 확인 + 기록을 디스크에 남긴 뒤에만
 *    uncertain → saveConfirmed    mark('saveConfirmed')     프로그램이 목록에서 저장을 확인
 *    uncertain → saveConfirmed    resolve('saved')          사람이 목록에서 저장을 확인
 *    uncertain → filled           resolve('notSaved')       사람이 목록에서 «저장 안 됨»을 확인
 *    uncertain → filled           cancelSubmit()            저장 요청이 «한 번도 나가지 않았음»이 확실할 때만 (저장 통제기 기록 0건)
 *    saveConfirmed → numberChecked mark('numberChecked', {checkNo})
 *    numberChecked → done         mark('done')
 *    (done·stopped 아닌 상태) → stopped   mark('stopped', {reason})
 *    그 밖 — 건너뛰기(filled→done 등), 되돌리기, done·stopped 에서 움직이기 — 모두 거절
 *
 *  ── 작업 닫기 ───────────────────────────────────────────────────────────
 *    close()            세 전산(requiredSites) 모두 done + 번호 확인 + 번호가 서로 같을 때만 «정상 닫기»
 *    forceClose()       그 밖. **관리자 PIN 확인 표(admin-auth)** 가 있어야 하고 «강제 닫기»로 따로 기록
 *    releaseAfterForce() 강제로 닫힌 작업이 있으면 **다음 차 저장이 막힌다.** 풀기는 **사람이 세 전산 목록을 직접 보고
 *                       확인하는 수동 절차**다 — 프로그램이 자동으로 확인한 것이 아니다. 관리자 확인 표 + 전산별 확인 시각 +
 *                       까닭이 있어야 하고, «manual» 로 기록해 자동 검증 완료와 구분한다.
 *
 *  ── 여러 프로세스가 같은 기록 파일을 쓸 때 (잠금) ───────────────────────────
 *    · 잠금 파일 `<기록파일>.lock` 은 «임시 파일을 다 쓴 뒤 link» 로 만든다 → 내용 없는 잠금이 생기지 않음
 *    · 잠금에는 주인(PC 이름 · 프로세스 번호 · 표)이 적힌다
 *    · 남의 잠금은 **같은 PC 이고 그 프로세스가 이미 죽은 것이 확인될 때만** 치운다.
 *      다른 PC 의 잠금 · 살아 있는 프로세스의 잠금 · 내용을 못 읽는 잠금은 시간이 지나도 치우지 않는다
 *      → 기다리다 멈추고, 저장은 풀지 않는다 (불확실하면 허용하지 않음)
 *    · 풀 때는 **내 표가 적힌 잠금만** 지운다
 *    · 작업 ID 에 PC 표시를 넣는다(YYYYMMDD-PC-순번)
 *    · 여러 PC 사이의 «한 번에 한 대» 는 파일 잠금으로 하지 않는다 → 1차는 «등록 PC 한 대», 2차는 서버 잠금
 *
 *  기록 파일은 한 줄에 하나씩 덧붙이기만 한다(고치지 않음). 줄마다 디스크에 바로 쓴다(fsync).
 *  이름·전화·로그인 정보는 받지 않는다. 차량번호·차대번호는 이어 보기·중복 확인에 꼭 필요해 남기되
 *  **보호 대상**으로 다룬다(화면·콘솔 기록에 그대로 찍지 않음 — maskCar/maskVin).
 *
 *  사업장(office): 지금은 가온 하나지만, 나중에 다른 점검장이 쓸 수 있게 작업마다 사업장 표시를 붙인다.
 */
const fsDefault = require('fs');
const os = require('os');
const crypto = require('crypto');

const STAGES = ['filled', 'submitReady', 'saveConfirmed', 'numberChecked', 'done'];
const DEFAULT_SITES = ['carinfo', 'carmodoo', 'entry'];

/** mark() 로 갈 수 있는 이동 (상태 → 허용되는 다음 단계) */
const MARK_ALLOWED = {
  none: ['filled'],
  filled: ['filled'],
  uncertain: ['saveConfirmed'],
  saveConfirmed: ['numberChecked'],
  numberChecked: ['done'],
  done: [],
  stopped: [],
};
const STOPPABLE = ['none', 'filled', 'uncertain', 'saveConfirmed', 'numberChecked'];

/** 기록에 남겨도 되는 칸만 */
const ALLOWED_EXTRA = ['checkNo', 'reason', 'by', 'note', 'outcome', 'replaces', 'checks'];

function pick(extra) {
  const out = {};
  ALLOWED_EXTRA.forEach((k) => {
    if (extra && extra[k] != null) out[k] = String(extra[k]).slice(0, 300);
  });
  return out;
}

/** PC 표시 — 영문·숫자만, 최대 8자 (작업 ID 에 들어간다) */
function pcTag(s) {
  const t = String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  return t || 'PC';
}

/** 화면·콘솔용 가림 — 차량번호는 뒤 4자리만, 차대번호는 뒤 4자리만 */
function maskCar(s) {
  const t = String(s || '').replace(/\s+/g, '');
  return t.length <= 4 ? '****' : '*'.repeat(t.length - 4) + t.slice(-4);
}
function maskVin(s) {
  const t = String(s || '');
  return t.length <= 4 ? '****' : '*'.repeat(t.length - 4) + t.slice(-4);
}

/** 그 프로세스가 살아 있는가 — true(살아 있음) / false(없음) / null(모름) */
function pidAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return null;
  try { process.kill(n, 0); return true; } catch (e) {
    if (e.code === 'ESRCH') return false;
    if (e.code === 'EPERM') return true;              // 있지만 권한이 없음 = 살아 있음
    return null;
  }
}

/** 잠깐 멈춤 (잠금을 기다릴 때만) */
function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function createJobLog(file, opts = {}) {
  const fs = opts.fs || fsDefault;
  const now = opts.now || (() => new Date());
  const office = String(opts.office || 'default');
  const host = String(opts.hostName || os.hostname());
  const pc = pcTag(opts.pcId || host);
  const required = (opts.requiredSites || DEFAULT_SITES).slice();
  const admin = opts.admin || null;                    // createAdminAuth() — 강제 닫기·풀기에 필요
  const lockFile = file + '.lock';
  const lockWait = opts.lockWaitMs || 5000;
  const isAlive = opts.pidAlive || pidAlive;

  /** 한 줄을 디스크까지 확실히 쓴다. 실패하면 오류를 던진다(호출한 쪽은 단추를 풀면 안 됨). */
  function write(entry) {
    const line = JSON.stringify({ at: now().toISOString(), ...entry }) + '\n';
    const fd = fs.openSync(file, 'a');
    try {
      fs.writeSync(fd, line);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }

  /** 잠금 파일을 읽는다. 못 읽거나 모양이 이상하면 null */
  function readLock() {
    try {
      const o = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      return o && o.token && o.host && o.pid ? o : null;
    } catch { return null; }
  }

  /**
   * 잠금을 잡는다. 임시 파일에 주인 정보를 다 쓴 뒤 link 로 붙이므로(이미 있으면 실패)
   * «내용 없는 잠금»이 생기지 않는다.
   */
  function tryAcquire(token) {
    const tmp = lockFile + '.' + process.pid + '.' + token.slice(0, 8);
    fs.writeFileSync(tmp, JSON.stringify({ host, pc, pid: process.pid, token, at: new Date().toISOString() }));
    try {
      fs.linkSync(tmp, lockFile);
      return true;
    } catch (e) {
      if (e.code === 'EEXIST') return false;
      throw e;
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  }

  /** 남의 잠금을 치워도 되는가 — 같은 PC 이고 그 프로세스가 죽은 것이 확실할 때만 */
  function lockIsDead(info) {
    if (!info) return false;                           // 못 읽음 = 모름 → 치우지 않음
    if (info.host !== host) return false;              // 다른 PC 것은 알 수 없음 → 치우지 않음
    return isAlive(info.pid) === false;
  }

  function withLock(fn) {
    const token = crypto.randomBytes(12).toString('hex');
    const start = Date.now();
    for (;;) {
      if (tryAcquire(token)) break;
      const info = readLock();
      if (lockIsDead(info)) {
        //  치우기 직전에 다시 읽어 같은 잠금인지 본다(그사이 다른 프로세스가 새로 잡았을 수 있음)
        const again = readLock();
        if (again && again.token === info.token) { try { fs.unlinkSync(lockFile); } catch {} }
        continue;
      }
      if (Date.now() - start > lockWait) {
        const who = info ? (info.host === host ? '이 PC의 다른 프로그램(번호 ' + info.pid + ')' : '다른 PC(' + info.pc + ')') : '확인할 수 없는 곳';
        throw new Error('기록 파일을 ' + who + '이(가) 쓰고 있어 기다리다 멈췄습니다. 저장은 풀지 않았습니다.');
      }
      pause(15);
    }
    try {
      return fn();
    } finally {
      const info = readLock();
      if (info && info.token === token) { try { fs.unlinkSync(lockFile); } catch {} }
    }
  }

  /** 기록을 읽어 작업별 상태로 묶는다. 깨진 줄(쓰다 꺼진 마지막 줄 등)은 건너뛴다. */
  function load() {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { text = ''; }
    const jobs = new Map();
    let broken = 0;
    const site = (j, s) => j.sites[s] || (j.sites[s] = { stage: null, history: [], checked: false });
    text.split('\n').forEach((line) => {
      if (!line.trim()) return;
      let e;
      try { e = JSON.parse(line); } catch { broken++; return; }
      const j = e.jobId && jobs.get(e.jobId);
      if (e.type === 'job') {
        jobs.set(e.jobId, { jobId: e.jobId, office: String(e.office || 'default'), pc: e.pc || null,
                            carNo: e.carNo, vin: e.vin, at: e.at, sites: {}, closed: false, forced: false,
                            released: false, replaces: e.replaces || null });
      } else if (!j) {
        return;
      } else if (e.type === 'stage') {
        const s = site(j, e.site);
        s.history.push(e);
        s.stage = e.stage;
        s.lastReason = e.reason || (e.stage === 'submitReady' ? s.lastReason : '');
        if (e.checkNo) s.checkNo = e.checkNo;
        if (e.stage === 'numberChecked' && e.checkNo) s.checked = true;
      } else if (e.type === 'resolve') {
        const s = site(j, e.site);
        s.history.push(e);
        s.stage = e.outcome === 'saved' ? 'saveConfirmed' : 'filled';
        if (e.checkNo) s.checkNo = e.checkNo;
      } else if (e.type === 'cancel') {
        const s = site(j, e.site);
        s.history.push(e);
        s.stage = 'filled';
      } else if (e.type === 'close') {
        j.closed = true;
        j.forced = !!e.forced;
      } else if (e.type === 'meta') {
        const prev = j.meta || {};
        j.meta = Object.assign({}, prev, e.meta || {});
        if (prev.oldBySite || (e.meta && e.meta.oldBySite)) j.meta.oldBySite = Object.assign({}, prev.oldBySite || {}, (e.meta && e.meta.oldBySite) || {});
        if (prev.photos || (e.meta && e.meta.photos)) j.meta.photos = Object.assign({}, prev.photos || {}, (e.meta && e.meta.photos) || {});
      } else if (e.type === 'release') {
        j.released = true;
        j.release = { method: e.method, by: e.by, reason: e.reason, checkedAt: e.checkedAt, at: e.at };
      }
    });
    return { jobs, broken };
  }

  /** 그 전산의 지금 상태 — submitReady 에서 멈춰 있으면 «불확실» */
  function siteState(job, s) {
    const x = job && job.sites[s];
    if (!x || !x.stage) return 'none';
    if (x.stage === 'submitReady') return 'uncertain';
    return x.stage;
  }

  function newJobId(jobs) {
    const d = now();
    const day = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const head = day + '-' + pc + '-';
    let n = 0;
    jobs.forEach((j) => {
      const m = String(j.jobId).startsWith(head) && /-(\d+)$/.exec(j.jobId);
      if (m) n = Math.max(n, Number(m[1]));
    });
    return head + String(n + 1).padStart(3, '0');
  }

  function getJob(jobs, jobId) {
    const j = jobs.get(jobId);
    if (!j) throw new Error('작업을 찾을 수 없습니다: ' + jobId);
    return j;
  }

  /** 정상 닫기가 되는가 — 안 되면 까닭 목록 */
  function closeProblems(j) {
    const why = [];
    required.forEach((s) => {
      const st = siteState(j, s);
      if (st !== 'done') why.push(s + ': 끝나지 않음(' + st + ')');
      else if (!j.sites[s].checked) why.push(s + ': 번호 확인 기록이 없음');
    });
    const nos = required.map((s) => j.sites[s] && j.sites[s].checkNo).filter(Boolean);
    if (nos.length === required.length && new Set(nos).size > 1) why.push('전산마다 번호가 다름: ' + nos.join(' / '));
    return why;
  }

  function canSubmitIn(jobs, jobId, s) {
    const j = jobs.get(jobId);
    if (!j) return { ok: false, reason: '작업을 찾을 수 없습니다.' };
    if (j.closed) return { ok: false, reason: '이미 닫힌 작업입니다.' };
    const st = siteState(j, s);
    if (st === 'uncertain') return { ok: false, reason: '저장했는지 확인되지 않았습니다. 목록에서 먼저 확인해 주세요.', uncertain: true };
    if (st === 'stopped') return { ok: false, reason: '멈춘 작업입니다. 정리한 뒤 새 작업으로 다시 해 주세요.' };
    if (st !== 'filled') return { ok: false, reason: st === 'none' ? '아직 값을 채우지 않았습니다.' : '이미 저장 단계를 지났습니다(' + st + ').' };
    for (const o of jobs.values()) {
      if (o.jobId === jobId || o.office !== j.office) continue;
      //  강제로 닫힌 작업: 관리자가 세 전산 목록을 확인하고 풀기 전에는 다음 차를 막는다
      if (o.closed && o.forced && !o.released) {
        return { ok: false, reason: '강제로 닫힌 작업(' + o.jobId + ')이 있습니다. 관리자가 세 전산 목록을 확인하고 «다음 차 허용»을 해야 합니다.', forcedBlock: o.jobId };
      }
      if (o.closed) continue;
      //  한 번에 한 대: 저장을 한 번이라도 풀어 준 다른 작업이 닫히기 전에는 막는다.
      //  입력만 해 둔 차(저장을 안 푼 작업)는 기다리는 차라 막지 않는다.
      const started = Object.keys(o.sites).some((x) => {
        const v = siteState(o, x);
        return v === 'uncertain' || v === 'stopped' || v === 'saveConfirmed' || v === 'numberChecked' || v === 'done';
      });
      if (started) {
        return { ok: false, reason: '앞 작업(' + o.jobId + ' · 차량 ' + maskCar(o.carNo) + ')이 아직 끝나지 않았습니다. 한 번에 한 대만 등록합니다.' };
      }
    }
    return { ok: true };
  }

  /** 관리자 확인 표 쓰기 — 없거나 틀리면 오류 */
  function useTicket(ticket, what) {
    if (!admin) throw new Error(what + '에는 관리자 확인이 필요한데, 관리자 확인 기능이 연결되지 않았습니다.');
    const t = admin.consume(ticket);
    if (!t) throw new Error(what + ': 관리자 확인이 없거나 시간이 지났습니다. 관리자 PIN 을 다시 확인해 주세요.');
    return t.by;
  }

  return {
    STAGES,
    requiredSites: required,
    pc,

    /** 새 작업. 같은 차가 이미 끝나지 않은 작업에 있으면 만들지 않는다. */
    newJob({ carNo, vin, replaces } = {}) {
      const car = String(carNo || '').replace(/\s+/g, '');
      if (!car) throw new Error('차량번호가 없어 작업을 만들 수 없습니다.');
      return withLock(() => {
        const { jobs } = load();
        for (const j of jobs.values()) {
          if (!j.closed && j.office === office && String(j.carNo) === car && j.jobId !== replaces) {
            throw new Error('이 차(' + maskCar(car) + ')는 아직 끝나지 않은 작업(' + j.jobId + ')이 있습니다. 그 작업을 먼저 이어 하거나 정리해 주세요.');
          }
        }
        const jobId = newJobId(jobs);
        write({ type: 'job', jobId, office, pc, carNo: car, vin: String(vin || '').replace(/\s+/g, '').toUpperCase(), ...(replaces ? { replaces } : {}) });
        return jobId;
      });
    },

    /**
     * 작업에 딸린 판단 자료 저장 — 다시 켜도 이어 판단할 수 있게(예: 저장 전 찍어 둔 «이 차의 예전 번호들»).
     *  받는 칸: oldNos(점검번호 목록) · startDate(YYYY-MM-DD) · entryNext(엔트리 다음 번호) · carinfoLast(카인포 마지막 번호)
     *  사람 정보는 받지 않는다.
     */
    setMeta(jobId, meta) {
      const m = {};
      if (Array.isArray(meta && meta.oldNos)) m.oldNos = meta.oldNos.map((x) => String(x).slice(0, 40)).slice(0, 200);
      //  전산별 «이 차 예전 번호들» (카모두·엔트리 — 저장 전 목록)
      if (meta && meta.oldBySite && typeof meta.oldBySite === 'object') {
        m.oldBySite = {};
        Object.keys(meta.oldBySite).slice(0, 5).forEach((k) => {
          if (Array.isArray(meta.oldBySite[k])) m.oldBySite[String(k).slice(0, 20)] = meta.oldBySite[k].map((x) => String(x).slice(0, 40)).slice(0, 200);
        });
      }
      ['startDate', 'entryNext', 'carinfoLast'].forEach((k) => { if (meta && meta[k] != null) m[k] = String(meta[k]).slice(0, 40); });
      //  카인포 신규등록 기록(7차) — 누가 했는지(button=입력 화면 단추 · flow=자동) · 그때 화면 번호 · 실패 표시. null 이면 지움
      if (meta && 'prepared' in meta) {
        const p = meta.prepared;
        m.prepared = p && typeof p === 'object'
          ? { by: String(p.by || '').slice(0, 10), checkNo: String(p.checkNo || '').slice(0, 40), ...(p.failed ? { failed: true } : {}) }
          : null;
      }
      //  전산별 올린 사진 칸(photo1~8) — 이어 하기 때 남은 칸만 올리려고
      if (meta && meta.photos && typeof meta.photos === 'object') {
        m.photos = {};
        Object.keys(meta.photos).slice(0, 5).forEach((k) => {
          if (Array.isArray(meta.photos[k])) m.photos[String(k).slice(0, 20)] = meta.photos[k].map(String).filter((x) => /^photo\d+$/.test(x)).slice(0, 20);
        });
      }
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        write({ type: 'meta', jobId, meta: m });
      });
    },

    /** 단계 기록 — 위 «허용 전이» 표에 있는 것만 */
    mark(jobId, s, stage, extra) {
      if (stage === 'submitReady') throw new Error('저장 풀기는 beginSubmit() 으로만 합니다.');
      if (!STAGES.includes(stage) && stage !== 'stopped') throw new Error('알 수 없는 단계: ' + stage);
      if (stage === 'numberChecked' && !(extra && String(extra.checkNo || '').trim())) {
        throw new Error('번호 확인(numberChecked)에는 확인한 점검번호가 있어야 합니다.');
      }
      if (stage === 'stopped' && !(extra && String(extra.reason || '').trim())) {
        throw new Error('멈춤(stopped)에는 까닭이 있어야 합니다.');
      }
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        const cur = siteState(j, s);
        const ok = stage === 'stopped' ? STOPPABLE.includes(cur) : (MARK_ALLOWED[cur] || []).includes(stage);
        if (!ok) throw new Error(s + ': «' + cur + '» 에서 «' + stage + '» 로는 갈 수 없습니다(허용 전이 아님).');
        write({ type: 'stage', jobId, site: s, stage, ...pick(extra) });
      });
    },

    canSubmit(jobId, s) {
      return canSubmitIn(load().jobs, jobId, s);
    },

    /** 저장 단추를 풀기 직전에 부른다. 판단과 기록을 잠금 안에서 한 번에 한다. 실패하면 단추를 풀지 말 것. */
    beginSubmit(jobId, s) {
      try {
        return withLock(() => {
          const c = canSubmitIn(load().jobs, jobId, s);
          if (!c.ok) return c;
          write({ type: 'stage', jobId, site: s, stage: 'submitReady' });
          return { ok: true };
        });
      } catch (e) {
        return { ok: false, reason: '저장 단추를 풀지 않았습니다: ' + e.message };
      }
    },

    /** 응답이 끊겨 결과를 모를 때 — 상태는 그대로(불확실) 두고 까닭만 남긴다 */
    noteUncertain(jobId, s, reason) {
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (siteState(j, s) !== 'uncertain') throw new Error(s + ' 은(는) 불확실 상태가 아닙니다.');
        write({ type: 'stage', jobId, site: s, stage: 'submitReady', reason: String(reason || '응답 없음').slice(0, 300) });
      });
    },

    /**
     * 저장을 누르지 않고 취소 — 저장 통제기(save-guard)가 «저장 요청이 한 번도 나가지 않았다»고
     * 확인한 경우에만(sentCount === 0). 모르면(undefined 등) 취소할 수 없고 resolve 로 확인해야 한다.
     */
    cancelSubmit(jobId, s, { sentCount, by } = {}) {
      if (sentCount !== 0) throw new Error('저장 요청이 나갔는지 확실하지 않아 취소할 수 없습니다. 목록에서 저장 여부를 확인해 주세요.');
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (siteState(j, s) !== 'uncertain') throw new Error(s + ' 은(는) 저장을 풀어 둔 상태가 아닙니다.');
        write({ type: 'cancel', jobId, site: s, ...pick({ by, note: '저장 요청 0건 — 저장 전 취소' }) });
      });
    },

    /** 불확실을 풀기: 사람이 목록을 확인한 결과(saved / notSaved) */
    resolve(jobId, s, outcome, extra) {
      if (outcome !== 'saved' && outcome !== 'notSaved') throw new Error('확인 결과는 saved 또는 notSaved 여야 합니다.');
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (siteState(j, s) !== 'uncertain') throw new Error(s + ' 은(는) 불확실 상태가 아닙니다.');
        write({ type: 'resolve', jobId, site: s, outcome, ...pick(extra) });
      });
    },

    /** 정상 닫기 — 세 전산 모두 done + 번호 확인 + 번호가 서로 같을 때만 */
    close(jobId, note) {
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        const why = closeProblems(j);
        if (why.length) throw new Error('작업을 정상으로 닫을 수 없습니다 — ' + why.join(' · ') + '. 꼭 닫아야 하면 관리자 강제 닫기를 쓰세요.');
        write({ type: 'close', jobId, ...pick({ note }) });
      });
    },

    closeCheck(jobId) {
      const j = load().jobs.get(jobId);
      if (!j) return { ok: false, reasons: ['작업을 찾을 수 없습니다.'] };
      const why = closeProblems(j);
      return { ok: !why.length, reasons: why };
    },

    /**
     * 관리자 강제 닫기 — 관리자 PIN 확인 표(ticket) + 까닭(5자 이상) + 작업 ID 재입력.
     *  «강제»로 따로 기록되고, 이 작업 때문에 다음 차 저장이 막힌다(releaseAfterForce 로 풀기).
     */
    forceClose(jobId, { ticket, reason, confirm } = {}) {
      if (String(reason || '').trim().length < 5) throw new Error('강제 닫기 까닭을 5자 이상 적어 주세요.');
      if (String(confirm || '').trim() !== jobId) throw new Error('확인을 위해 작업 ID(' + jobId + ')를 그대로 적어 주세요.');
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        const by = useTicket(ticket, '강제 닫기');
        const snapshot = required.map((s) => s + '=' + siteState(j, s) + (j.sites[s] && j.sites[s].checkNo ? '(' + j.sites[s].checkNo + ')' : '')).join(', ');
        write({ type: 'close', jobId, forced: true, ...pick({ by, reason, note: '닫을 때 상태: ' + snapshot }) });
      });
    },

    /**
     * 강제 닫기 뒤 «다음 차 허용» — **사람이 세 전산 목록을 직접 확인한 수동 절차**.
     *  ticket: 관리자 PIN 확인 표
     *  checkedAt: { carinfo: '2026-10-19T09:10', carmodoo: …, entry: … } — 전산별로 사람이 목록을 확인한 시각(requiredSites 전부)
     *  reason: 무엇을 확인했고 왜 다음 차를 허용하는지(5자 이상)
     *  기록: type 'release' · method 'manual-list-check'(자동 검증이 아님) · 관리자 · 까닭 · 전산별 확인 시각
     */
    releaseAfterForce(jobId, { ticket, checkedAt, reason } = {}) {
      const miss = required.filter((s) => !(checkedAt && checkedAt[s] && !Number.isNaN(Date.parse(checkedAt[s]))));
      if (miss.length) throw new Error('다음 차를 허용하기 전에 이 전산 목록을 직접 확인하고 확인한 시각을 적어 주세요: ' + miss.join(', '));
      if (String(reason || '').trim().length < 5) throw new Error('무엇을 확인했는지 까닭을 5자 이상 적어 주세요.');
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (!(j.closed && j.forced)) throw new Error('강제로 닫힌 작업이 아닙니다: ' + jobId);
        if (j.released) throw new Error('이미 허용했습니다: ' + jobId);
        const by = useTicket(ticket, '다음 차 허용');
        const times = {};
        required.forEach((s) => { times[s] = new Date(Date.parse(checkedAt[s])).toISOString(); });
        write({ type: 'release', jobId, method: 'manual-list-check', auto: false, by, checkedAt: times,
                reason: String(reason).trim().slice(0, 300), sites: required.slice() });
      });
    },

    /** 다시 켰을 때 보여 줄 것: 끝나지 않은 우리 사업장 작업 + 풀리지 않은 강제 닫기. 차량번호·차대번호는 가림 */
    resumeList() {
      const { jobs, broken } = load();
      const list = [];
      const forcedBlocks = [];
      jobs.forEach((j) => {
        if (j.office !== office) return;
        if (j.closed) { if (j.forced && !j.released) forcedBlocks.push(j.jobId); return; }
        const sites = {};
        Object.keys(j.sites).forEach((s) => { sites[s] = { state: siteState(j, s), checkNo: j.sites[s].checkNo || null }; });
        list.push({ jobId: j.jobId, office: j.office, carNo: maskCar(j.carNo), vin: maskVin(j.vin), sites });
      });
      return { list, broken, forcedBlocks };
    },

    /** 한 작업의 전체 상태 (차량번호·차대번호 원래 값 — 앱 안 판단용. 화면·기록에 찍지 말 것) */
    get(jobId) {
      const j = load().jobs.get(jobId);
      if (!j) return null;
      const sites = {};
      Object.keys(j.sites).forEach((s) => { sites[s] = { state: siteState(j, s), checkNo: j.sites[s].checkNo || null, lastReason: j.sites[s].lastReason || '' }; });
      return { jobId: j.jobId, office: j.office, pc: j.pc, carNo: j.carNo, vin: j.vin, closed: j.closed,
               forced: j.forced, released: j.released, release: j.release || null, meta: j.meta || {}, sites };
    },
  };
}

module.exports = { createJobLog, STAGES, DEFAULT_SITES, MARK_ALLOWED, pcTag, maskCar, maskVin, pidAlive };
