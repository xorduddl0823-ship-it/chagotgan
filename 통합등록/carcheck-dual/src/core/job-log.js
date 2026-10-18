/**
 * 작업 기록 (차 한 대 = 작업 하나) — 꺼져도 남고, 다시 켜면 이어 본다
 * ------------------------------------------------------------------
 *  설계서 2판 6장. 전산 이름은 문자열로만 받는다(카인포·카모두·엔트리를 모름).
 *
 *  ⚠ 2026-10-18 현재: 이 모듈은 시험만 통과했고 **실제 등록 흐름(main.js)에는 아직 연결하지 않았다.**
 *     연결할 자리는 `통합등록/기획/2026-10-18_연결설계_job-log_number-check.md` 에 있다.
 *
 *  단계 (전산마다 따로, 앞으로만 간다):
 *    filled        프로그램이 값을 다 채움
 *    submitReady   [저장] 을 눌러도 된다고 풀어 줌 — 이 기록이 디스크에 남은 뒤에만 단추를 푼다
 *    saveConfirmed 저장된 것을 화면에서 확인함
 *    numberChecked 실제 번호를 읽어 맞는지 확인함 (점검번호 checkNo 필수)
 *    done          이 전산은 끝 (numberChecked 다음에만)
 *    stopped       멈춤 (번호 다름 등) — 사람이 정리해야 함
 *
 *  ❓ 불확실: submitReady 는 있는데 saveConfirmed 가 없는 채로 프로그램이 꺼졌거나
 *  응답이 끊긴 경우. 이때는 다시 저장하지 못하게 막는다(두 번 등록 방지).
 *  사람이(또는 프로그램이 목록을 읽어) «저장됐다 / 안 됐다» 를 확인해 줘야 풀린다.
 *
 *  작업 닫기:
 *    close()      세 전산(requiredSites)이 모두 done 이고, 모두 번호 확인을 거쳤고, 그 번호가 서로 같을 때만.
 *    forceClose() 그 밖의 경우. 관리자 이름 · 까닭 · 작업 ID 를 그대로 다시 적은 확인이 있어야 하고, «강제»로 기록된다.
 *
 *  여러 프로세스가 같은 기록 파일을 쓸 때:
 *    읽고-판단하고-쓰는 일을 잠금 파일(<기록파일>.lock, 'wx' 로 만들기)로 묶는다 → 동시 저장·판단 엇갈림 방지.
 *    작업 ID 에 PC 표시를 넣는다(YYYYMMDD-PC-순번) → 다른 PC 기록을 합쳐도 겹치지 않음.
 *    여러 PC 사이의 «한 번에 한 대» 는 파일 잠금으로 하지 않는다(네트워크 폴더 잠금은 믿기 어렵다)
 *    → PC 마다 자기 기록 파일 + PC 사이 잠금은 서버(차곳간 체크 서버)로. 설계는 연결설계 문서 5장.
 *
 *  기록 파일은 한 줄에 하나씩 덧붙이기만 한다(고치지 않음). 줄마다 디스크에 바로 쓴다(fsync).
 *  이름·전화·로그인 정보는 받지 않는다. 차량번호·차대번호는 이어 보기·중복 확인에 꼭 필요해서 남긴다.
 *
 *  사업장(office): 지금은 가온 하나지만, 나중에 다른 점검장이 쓸 수 있게 작업마다 사업장 표시를 붙인다.
 *  «한 번에 한 대»·«같은 차 중복» 판단은 같은 사업장 안에서만 한다.
 */
const fsDefault = require('fs');
const os = require('os');

const STAGES = ['filled', 'submitReady', 'saveConfirmed', 'numberChecked', 'done'];
const rank = (st) => STAGES.indexOf(st);
const DEFAULT_SITES = ['carinfo', 'carmodoo', 'entry'];

/** 기록에 남겨도 되는 칸만 */
const ALLOWED_EXTRA = ['checkNo', 'reason', 'by', 'note', 'outcome', 'replaces'];

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

/** 잠깐 멈춤 (잠금을 기다릴 때만) */
function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function createJobLog(file, opts = {}) {
  const fs = opts.fs || fsDefault;
  const now = opts.now || (() => new Date());
  const office = String(opts.office || 'default');
  const pc = pcTag(opts.pcId || os.hostname());
  const required = (opts.requiredSites || DEFAULT_SITES).slice();
  const lockFile = file + '.lock';
  const lockWait = opts.lockWaitMs || 5000;
  const lockStale = opts.lockStaleMs || 30000;

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

  /**
   * 잠금 안에서 fn 을 돌린다. 잠금은 «없을 때만 만들기('wx')» 로 잡으므로 한 번에 한 프로세스만 들어온다.
   *  오래된 잠금(프로그램이 잠금을 쥔 채 꺼진 경우)은 lockStale 이 지나면 치운다.
   */
  function withLock(fn) {
    const start = Date.now();
    let fd = null;
    while (fd === null) {
      try {
        fd = fs.openSync(lockFile, 'wx');
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try {
          const st = fs.statSync(lockFile);
          if (Date.now() - st.mtimeMs > lockStale) { fs.unlinkSync(lockFile); continue; }
        } catch { continue; }
        if (Date.now() - start > lockWait) throw new Error('기록 파일을 다른 곳에서 쓰고 있어 기다리다 멈췄습니다. 잠시 뒤 다시 해 주세요.');
        pause(15);
      }
    }
    //  누가 잡았는지 적어 둔다(못 적어도 잠금은 그대로 유효)
    try { fs.writeSync(fd, JSON.stringify({ pid: process.pid, pc, at: new Date().toISOString() })); } catch {}
    try {
      return fn();
    } finally {
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(lockFile); } catch {}
    }
  }

  /** 기록을 읽어 작업별 상태로 묶는다. 깨진 줄(쓰다 꺼진 마지막 줄 등)은 건너뛴다. */
  function load() {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { text = ''; }
    const jobs = new Map();
    let broken = 0;
    text.split('\n').forEach((line) => {
      if (!line.trim()) return;
      let e;
      try { e = JSON.parse(line); } catch { broken++; return; }
      if (e.type === 'job') {
        jobs.set(e.jobId, { jobId: e.jobId, office: String(e.office || 'default'), pc: e.pc || null,
                            carNo: e.carNo, vin: e.vin, at: e.at, sites: {}, closed: false, forced: false,
                            replaces: e.replaces || null });
      } else if (e.type === 'stage' && jobs.has(e.jobId)) {
        const j = jobs.get(e.jobId);
        const s = j.sites[e.site] || (j.sites[e.site] = { stage: null, history: [], checked: false });
        s.history.push(e);
        s.stage = e.stage;
        if (e.checkNo) s.checkNo = e.checkNo;
        if (e.stage === 'numberChecked' && e.checkNo) s.checked = true;
      } else if (e.type === 'resolve' && jobs.has(e.jobId)) {
        const j = jobs.get(e.jobId);
        const s = j.sites[e.site] || (j.sites[e.site] = { stage: null, history: [], checked: false });
        s.history.push(e);
        //  확인 결과: 안 됐다 → 값 채우기 단계로 되돌림(다시 저장 가능) · 됐다 → 저장 확인
        s.stage = e.outcome === 'saved' ? 'saveConfirmed' : 'filled';
        if (e.checkNo) s.checkNo = e.checkNo;
      } else if (e.type === 'close' && jobs.has(e.jobId)) {
        const j = jobs.get(e.jobId);
        j.closed = true;
        j.forced = !!e.forced;
      }
    });
    return { jobs, broken };
  }

  /** 그 전산의 지금 상태 — submitReady 에서 멈춰 있으면 «불확실» */
  function siteState(job, site) {
    const s = job && job.sites[site];
    if (!s || !s.stage) return 'none';
    if (s.stage === 'submitReady') return 'uncertain';
    return s.stage;
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
    required.forEach((site) => {
      const s = j.sites[site];
      const st = siteState(j, site);
      if (st !== 'done') why.push(site + ': 끝나지 않음(' + st + ')');
      else if (!s.checked) why.push(site + ': 번호 확인 기록이 없음');
    });
    const nos = required.map((site) => j.sites[site] && j.sites[site].checkNo).filter(Boolean);
    if (nos.length === required.length && new Set(nos).size > 1) why.push('전산마다 번호가 다름: ' + nos.join(' / '));
    return why;
  }

  function canSubmitIn(jobs, jobId, site) {
    const j = jobs.get(jobId);
    if (!j) return { ok: false, reason: '작업을 찾을 수 없습니다.' };
    if (j.closed) return { ok: false, reason: '이미 닫힌 작업입니다.' };
    const st = siteState(j, site);
    if (st === 'uncertain') return { ok: false, reason: '저장했는지 확인되지 않았습니다. 목록에서 먼저 확인해 주세요.', uncertain: true };
    if (st === 'stopped') return { ok: false, reason: '멈춘 작업입니다. 정리한 뒤 새 작업으로 다시 해 주세요.' };
    if (st !== 'filled') return { ok: false, reason: st === 'none' ? '아직 값을 채우지 않았습니다.' : '이미 저장 단계를 지났습니다(' + st + ').' };
    //  한 번에 한 대: 저장을 한 번이라도 풀어 준 다른 작업이 닫히기(세 전산 모두 끝) 전에는 막는다.
    //  입력만 해 둔 차(저장을 안 푼 작업)는 기다리는 차라 막지 않는다.
    for (const o of jobs.values()) {
      if (o.jobId === jobId || o.closed || o.office !== j.office) continue;
      const started = Object.keys(o.sites).some((s) => {
        const x = siteState(o, s);
        return x === 'uncertain' || x === 'stopped' || rank(x) >= rank('submitReady');
      });
      if (started) {
        return { ok: false, reason: '앞 작업(' + o.jobId + ' · ' + o.carNo + ')이 아직 끝나지 않았습니다. 한 번에 한 대만 등록합니다.' };
      }
    }
    return { ok: true };
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
            throw new Error('이 차(' + car + ')는 아직 끝나지 않은 작업(' + j.jobId + ')이 있습니다. 그 작업을 먼저 이어 하거나 정리해 주세요.');
          }
        }
        const jobId = newJobId(jobs);
        write({ type: 'job', jobId, office, pc, carNo: car, vin: String(vin || '').replace(/\s+/g, '').toUpperCase(), ...(replaces ? { replaces } : {}) });
        return jobId;
      });
    },

    /** 단계 기록. 뒤로 가는 기록은 받지 않고, done 은 번호 확인 다음에만. */
    mark(jobId, site, stage, extra) {
      if (!STAGES.includes(stage) && stage !== 'stopped') throw new Error('알 수 없는 단계: ' + stage);
      if (stage === 'submitReady') throw new Error('저장 풀기는 beginSubmit() 으로만 합니다.');
      if (stage === 'numberChecked' && !(extra && String(extra.checkNo || '').trim())) {
        throw new Error('번호 확인(numberChecked)에는 확인한 점검번호가 있어야 합니다.');
      }
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        const cur = j.sites[site] && j.sites[site].stage;
        if (stage !== 'stopped' && cur && cur !== 'stopped' && rank(stage) < rank(cur)) {
          throw new Error(site + ' 은(는) 이미 «' + cur + '» 단계라 «' + stage + '» 로 되돌릴 수 없습니다.');
        }
        if (stage === 'done' && cur !== 'numberChecked') {
          throw new Error(site + ' 은(는) 번호 확인을 마친 뒤에만 끝낼 수 있습니다(지금: ' + (cur || '없음') + ').');
        }
        if (stage === 'numberChecked' && cur !== 'saveConfirmed') {
          throw new Error(site + ' 은(는) 저장 확인 뒤에만 번호 확인을 기록할 수 있습니다(지금: ' + (cur || '없음') + ').');
        }
        write({ type: 'stage', jobId, site, stage, ...pick(extra) });
      });
    },

    /**
     * [저장] 단추를 풀어도 되는가.
     *  - 이미 저장을 풀어 준 적이 있으면(불확실 포함) 안 됨 → 두 번 등록 방지
     *  - 값 채우기가 끝나지 않았으면 안 됨
     *  - 다른 작업이 어느 전산에서든 저장을 풀어 둔 채 닫히지 않았으면 안 됨(한 번에 한 대)
     */
    canSubmit(jobId, site) {
      return canSubmitIn(load().jobs, jobId, site);
    },

    /** 저장 단추를 풀기 직전에 부른다. 판단과 기록을 잠금 안에서 한 번에 한다. 실패하면 단추를 풀지 말 것. */
    beginSubmit(jobId, site) {
      try {
        return withLock(() => {
          const c = canSubmitIn(load().jobs, jobId, site);
          if (!c.ok) return c;
          try {
            write({ type: 'stage', jobId, site, stage: 'submitReady' });
          } catch (e) {
            return { ok: false, reason: '기록을 남기지 못해 저장 단추를 풀지 않았습니다: ' + e.message };
          }
          return { ok: true };
        });
      } catch (e) {
        return { ok: false, reason: '기록을 남기지 못해 저장 단추를 풀지 않았습니다: ' + e.message };
      }
    },

    /** 응답이 끊겨 결과를 모를 때 — 상태는 그대로(불확실) 두고 까닭만 남긴다 */
    noteUncertain(jobId, site, reason) {
      withLock(() => write({ type: 'stage', jobId, site, stage: 'submitReady', reason: String(reason || '응답 없음').slice(0, 300) }));
    },

    /** 불확실을 풀기: 목록을 확인한 결과(saved / notSaved) */
    resolve(jobId, site, outcome, extra) {
      if (outcome !== 'saved' && outcome !== 'notSaved') throw new Error('확인 결과는 saved 또는 notSaved 여야 합니다.');
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (siteState(j, site) !== 'uncertain') throw new Error(site + ' 은(는) 불확실 상태가 아닙니다.');
        write({ type: 'resolve', jobId, site, outcome, ...pick(extra) });
      });
    },

    /** 정상 닫기 — 세 전산 모두 done + 번호 확인 + 번호가 서로 같을 때만. 아니면 까닭과 함께 오류. */
    close(jobId, note) {
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        const why = closeProblems(j);
        if (why.length) throw new Error('작업을 정상으로 닫을 수 없습니다 — ' + why.join(' · ') + '. 꼭 닫아야 하면 관리자 강제 닫기를 쓰세요.');
        write({ type: 'close', jobId, ...pick({ note }) });
      });
    },

    /** 닫을 수 있는지만 본다 (화면에 까닭을 보여 줄 때) */
    closeCheck(jobId) {
      const j = load().jobs.get(jobId);
      if (!j) return { ok: false, reasons: ['작업을 찾을 수 없습니다.'] };
      const why = closeProblems(j);
      return { ok: !why.length, reasons: why };
    },

    /**
     * 관리자 강제 닫기 — 정상 조건을 못 채운 작업(멈춘 작업 정리 등).
     *  by: 확인한 관리자 · reason: 까닭(5자 이상) · confirm: 작업 ID 를 그대로 다시 적은 것.
     *  그때의 전산별 상태를 함께 «강제»로 기록한다.
     */
    forceClose(jobId, { by, reason, confirm } = {}) {
      if (!String(by || '').trim()) throw new Error('강제 닫기에는 확인한 관리자 이름이 있어야 합니다.');
      if (String(reason || '').trim().length < 5) throw new Error('강제 닫기 까닭을 5자 이상 적어 주세요.');
      if (String(confirm || '').trim() !== jobId) throw new Error('확인을 위해 작업 ID(' + jobId + ')를 그대로 적어 주세요.');
      withLock(() => {
        const j = getJob(load().jobs, jobId);
        if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
        const snapshot = required.map((s) => s + '=' + siteState(j, s) + (j.sites[s] && j.sites[s].checkNo ? '(' + j.sites[s].checkNo + ')' : '')).join(', ');
        write({ type: 'close', jobId, forced: true, ...pick({ by, reason, note: '닫을 때 상태: ' + snapshot }) });
      });
    },

    /** 다시 켰을 때 보여 줄 것: 끝나지 않은 우리 사업장 작업과 전산별 상태 */
    resumeList() {
      const { jobs, broken } = load();
      const list = [];
      jobs.forEach((j) => {
        if (j.closed || j.office !== office) return;
        const sites = {};
        Object.keys(j.sites).forEach((s) => { sites[s] = { state: siteState(j, s), checkNo: j.sites[s].checkNo || null }; });
        list.push({ jobId: j.jobId, office: j.office, carNo: j.carNo, vin: j.vin, sites });
      });
      return { list, broken };
    },

    get(jobId) {
      const j = load().jobs.get(jobId);
      if (!j) return null;
      const sites = {};
      Object.keys(j.sites).forEach((s) => { sites[s] = { state: siteState(j, s), checkNo: j.sites[s].checkNo || null }; });
      return { jobId: j.jobId, office: j.office, pc: j.pc, carNo: j.carNo, vin: j.vin, closed: j.closed, forced: j.forced, sites };
    },
  };
}

module.exports = { createJobLog, STAGES, DEFAULT_SITES, pcTag };
