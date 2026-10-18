/**
 * 작업 기록 (차 한 대 = 작업 하나) — 꺼져도 남고, 다시 켜면 이어 본다
 * ------------------------------------------------------------------
 *  설계서 2판 6장. 전산 이름은 문자열로만 받는다(카인포·카모두·엔트리를 모름).
 *
 *  단계 (전산마다 따로):
 *    filled        프로그램이 값을 다 채움
 *    submitReady   [저장] 을 눌러도 된다고 풀어 줌 — 이 기록이 디스크에 남은 뒤에만 단추를 푼다
 *    saveConfirmed 저장된 것을 화면에서 확인함
 *    numberChecked 실제 번호를 읽어 맞는지 확인함
 *    done          이 전산은 끝
 *    stopped       멈춤 (번호 다름 등) — 사람이 정리해야 함
 *
 *  ❓ 불확실: submitReady 는 있는데 saveConfirmed 가 없는 채로 프로그램이 꺼졌거나
 *  응답이 끊긴 경우. 이때는 다시 저장하지 못하게 막는다(두 번 등록 방지).
 *  사람이(또는 프로그램이 목록을 읽어) «저장됐다 / 안 됐다» 를 확인해 줘야 풀린다.
 *
 *  기록 파일은 한 줄에 하나씩 덧붙이기만 한다(고치지 않음). 줄마다 디스크에 바로 쓴다(fsync).
 *  이름·전화·로그인 정보는 받지 않는다. 차량번호·차대번호는 이어 보기·중복 확인에 꼭 필요해서 남긴다.
 */
const fsDefault = require('fs');

const STAGES = ['filled', 'submitReady', 'saveConfirmed', 'numberChecked', 'done'];
const rank = (st) => STAGES.indexOf(st);

/** 기록에 남겨도 되는 칸만 */
const ALLOWED_EXTRA = ['checkNo', 'reason', 'by', 'note', 'outcome', 'replaces'];

function pick(extra) {
  const out = {};
  ALLOWED_EXTRA.forEach((k) => {
    if (extra && extra[k] != null) out[k] = String(extra[k]).slice(0, 300);
  });
  return out;
}

function createJobLog(file, opts = {}) {
  const fs = opts.fs || fsDefault;
  const now = opts.now || (() => new Date());

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
        jobs.set(e.jobId, { jobId: e.jobId, carNo: e.carNo, vin: e.vin, at: e.at, sites: {}, closed: false, replaces: e.replaces || null });
      } else if (e.type === 'stage' && jobs.has(e.jobId)) {
        const j = jobs.get(e.jobId);
        const s = j.sites[e.site] || (j.sites[e.site] = { stage: null, history: [] });
        s.history.push(e);
        s.stage = e.stage;
        if (e.checkNo) s.checkNo = e.checkNo;
      } else if (e.type === 'resolve' && jobs.has(e.jobId)) {
        const j = jobs.get(e.jobId);
        const s = j.sites[e.site] || (j.sites[e.site] = { stage: null, history: [] });
        s.history.push(e);
        //  확인 결과: 안 됐다 → 값 채우기 단계로 되돌림(다시 저장 가능) · 됐다 → 저장 확인
        s.stage = e.outcome === 'saved' ? 'saveConfirmed' : 'filled';
        if (e.checkNo) s.checkNo = e.checkNo;
      } else if (e.type === 'close' && jobs.has(e.jobId)) {
        jobs.get(e.jobId).closed = true;
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
    let n = 0;
    jobs.forEach((j) => { if (String(j.jobId).startsWith(day + '-')) n++; });
    return day + '-' + String(n + 1).padStart(3, '0');
  }

  return {
    STAGES,

    /** 새 작업. 같은 차가 이미 끝나지 않은 작업에 있으면 만들지 않는다. */
    newJob({ carNo, vin, replaces } = {}) {
      const car = String(carNo || '').replace(/\s+/g, '');
      if (!car) throw new Error('차량번호가 없어 작업을 만들 수 없습니다.');
      const { jobs } = load();
      for (const j of jobs.values()) {
        if (!j.closed && String(j.carNo) === car && j.jobId !== replaces) {
          throw new Error('이 차(' + car + ')는 아직 끝나지 않은 작업(' + j.jobId + ')이 있습니다. 그 작업을 먼저 이어 하거나 정리해 주세요.');
        }
      }
      const jobId = newJobId(jobs);
      write({ type: 'job', jobId, carNo: car, vin: String(vin || '').replace(/\s+/g, '').toUpperCase(), ...(replaces ? { replaces } : {}) });
      return jobId;
    },

    /** 단계 기록. 뒤로 가는 기록(예: 저장 확인 뒤 다시 채움)은 받지 않는다. */
    mark(jobId, site, stage, extra) {
      if (!STAGES.includes(stage) && stage !== 'stopped') throw new Error('알 수 없는 단계: ' + stage);
      const { jobs } = load();
      const j = jobs.get(jobId);
      if (!j) throw new Error('작업을 찾을 수 없습니다: ' + jobId);
      if (j.closed) throw new Error('이미 닫힌 작업입니다: ' + jobId);
      const cur = j.sites[site] && j.sites[site].stage;
      if (stage !== 'stopped' && cur && cur !== 'stopped' && rank(stage) < rank(cur)) {
        throw new Error(site + ' 은(는) 이미 «' + cur + '» 단계라 «' + stage + '» 로 되돌릴 수 없습니다.');
      }
      write({ type: 'stage', jobId, site, stage, ...pick(extra) });
    },

    /**
     * [저장] 단추를 풀어도 되는가.
     *  - 이미 저장을 풀어 준 적이 있으면(불확실 포함) 안 됨 → 두 번 등록 방지
     *  - 값 채우기가 끝나지 않았으면 안 됨
     *  - 다른 작업이 어느 전산에서든 저장을 풀어 둔 채 끝나지 않았으면 안 됨(한 번에 한 대)
     */
    canSubmit(jobId, site) {
      const { jobs } = load();
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
        if (o.jobId === jobId || o.closed) continue;
        const started = Object.keys(o.sites).some((s) => {
          const x = siteState(o, s);
          return x === 'uncertain' || x === 'stopped' || rank(x) >= rank('submitReady');
        });
        if (started) {
          return { ok: false, reason: '앞 작업(' + o.jobId + ' · ' + o.carNo + ')이 아직 끝나지 않았습니다. 한 번에 한 대만 등록합니다.' };
        }
      }
      return { ok: true };
    },

    /** 저장 단추를 풀기 직전에 부른다. 기록이 디스크에 남으면 true. 실패하면 단추를 풀지 말 것. */
    beginSubmit(jobId, site) {
      const c = this.canSubmit(jobId, site);
      if (!c.ok) return c;
      try {
        write({ type: 'stage', jobId, site, stage: 'submitReady' });
      } catch (e) {
        return { ok: false, reason: '기록을 남기지 못해 저장 단추를 풀지 않았습니다: ' + e.message };
      }
      return { ok: true };
    },

    /** 응답이 끊겨 결과를 모를 때 — 상태는 그대로(불확실) 두고 까닭만 남긴다 */
    noteUncertain(jobId, site, reason) {
      write({ type: 'stage', jobId, site, stage: 'submitReady', reason: String(reason || '응답 없음').slice(0, 300) });
    },

    /** 불확실을 풀기: 목록을 확인한 결과(saved / notSaved) */
    resolve(jobId, site, outcome, extra) {
      if (outcome !== 'saved' && outcome !== 'notSaved') throw new Error('확인 결과는 saved 또는 notSaved 여야 합니다.');
      const { jobs } = load();
      const j = jobs.get(jobId);
      if (!j) throw new Error('작업을 찾을 수 없습니다: ' + jobId);
      if (siteState(j, site) !== 'uncertain') throw new Error(site + ' 은(는) 불확실 상태가 아닙니다.');
      write({ type: 'resolve', jobId, site, outcome, ...pick(extra) });
    },

    close(jobId, reason) {
      write({ type: 'close', jobId, ...pick({ reason }) });
    },

    /** 다시 켰을 때 보여 줄 것: 끝나지 않은 작업과 전산별 상태 */
    resumeList() {
      const { jobs, broken } = load();
      const list = [];
      jobs.forEach((j) => {
        if (j.closed) return;
        const sites = {};
        Object.keys(j.sites).forEach((s) => { sites[s] = { state: siteState(j, s), checkNo: j.sites[s].checkNo || null }; });
        list.push({ jobId: j.jobId, carNo: j.carNo, vin: j.vin, sites });
      });
      return { list, broken };
    },

    get(jobId) {
      const j = load().jobs.get(jobId);
      if (!j) return null;
      const sites = {};
      Object.keys(j.sites).forEach((s) => { sites[s] = { state: siteState(j, s), checkNo: j.sites[s].checkNo || null }; });
      return { jobId: j.jobId, carNo: j.carNo, vin: j.vin, closed: j.closed, sites };
    },
  };
}

module.exports = { createJobLog, STAGES };
