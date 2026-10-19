/**
 * 저장 통제기 — 사이트 [저장] 요청을 한 번만, 허락했을 때만 내보내고, 결과를 나눈다
 * ------------------------------------------------------------------
 *  화면·네트워크를 직접 다루지 않는 «판단» 부분만 여기 둔다(모의 시험 가능).
 *  실제로 요청을 붙잡는 일은 `src/sites/save-hold.js`(개발자 연결 Fetch 가로채기)가 하고, 일어난 일을 여기에 알린다.
 *
 *  가정하지 않는 것 (검수 반영 2·3차):
 *   · 저장 주소 목록이 모든 저장 경로를 덮는다고 가정하지 않는다
 *     → 잠겨 있는 동안 그 전산 주소(siteHosts)로 가는 «쓰기 요청»(GET·HEAD 가 아닌 것)은 모두 붙잡는다.
 *       조회처럼 꼭 필요한 쓰기 요청만 readAllow(주소 무늬)로 통과. GET 저장은 saveGetPatterns 로 따로 붙잡는다.
 *   · 다른 주소(별도 도메인)로 가는 쓰기 요청 = **알 수 없는 저장 경로** → 붙잡고, 결과를 «unknownPath»(중단)로.
 *   · 팝업 등 통제기가 붙지 않은 창이 있으면 그 창의 요청은 볼 수 없다 → 등록만 되고 붙지 않은 창이 있으면 «unknownPath».
 *   · 서버 오류 응답(4xx·5xx)도 «저장 실패 확정»이 아니다 — 저장한 뒤 오류를 돌려줬을 수 있다 → «uncertain».
 *   · 정상 응답(2xx·3xx)도 «저장됨 확정»이 아니다 — «reached»(서버에 닿음)일 뿐, 확정은 목록 다시 읽기(job-log saveConfirmed).
 *
 *  결과(outcome().result):
 *    notSent      허락 뒤 저장 요청이 하나도 나가지 않음 → 취소 가능(job-log.cancelSubmit sentCount 0)
 *    waiting      나간 요청의 응답을 기다리는 중
 *    reached      나간 요청이 2xx·3xx 응답을 받음 → 목록에서 저장 확인하러 감
 *    uncertain    응답 모름(끊김·창 닫힘·시간 초과·응답 0) 또는 서버 오류(4xx·5xx) → 다시 저장 금지, 목록 확인
 *    unknownPath  알 수 없는 저장 경로(다른 주소 쓰기 요청 · 통제기가 안 붙은 창) → 중단, 사람이 확인
 *    manualCheck  팝업 창이 생김 — 팝업의 «첫 요청 전»에 통제기가 붙는다고 보장할 수 없으므로(검수 4차)
 *                 자동으로 끝내지 않고 사람이 목록에서 확인. (popupAuto:true 는 실제 화면에서 확인된 전산만)
 *
 *  봉인(seal): 그 전산 저장이 끝난 뒤 — 같은 창에서 더는 저장이 나가지 않게 모든 쓰기 요청을 막고 허락도 받지 않는다.
 *              다음 차 작업이 새 통제기를 걸 때까지 유지(검수 4차: 끝난 뒤 중복 저장·기존 단추 우회 막기).
 *
 *  ⚠ 실제 전산의 요청 구조(저장 주소·조회 주소·쓰는 도메인)는 아직 모른다 → coverage() 로 통제 범위를 드러내고,
 *     confirmed:false 이면 흐름(register-flow)은 이 결과만 믿고 넘어가지 않는다.
 */

function compile(list) {
  return (list || []).map((p) => (p instanceof RegExp ? p : new RegExp(String(p), 'i')));
}

function createSaveGuard({ siteHost, siteHosts, savePatterns, saveGetPatterns, readAllow, fillAllow, confirmed, popupAuto } = {}) {
  const hosts = new Set([].concat(siteHosts || [], siteHost || []).map((h) => String(h).toLowerCase()).filter(Boolean));
  const saveRe = compile(savePatterns);
  const saveGetRe = compile(saveGetPatterns);
  const allowRe = compile(readAllow);
  //  값 넣기 단계에서만 통과시키는 쓰기 요청(예: 사진 올리기) — 저장 허락 뒤·잠금(봉인) 뒤에는 통과 안 함
  const fillRe = compile(fillAllow);

  let unlocked = false;
  let sent = 0;
  let blocked = 0;
  const pending = new Map();        // 요청 id → 'waiting' | 'ok' | 'serverError' | 'lost'
  const unknownHosts = new Set();   // 다른 주소로 가려던 쓰기 요청
  const windows = new Map();        // 창 id → { attached }
  let windowClosed = false;
  let sealed = false;
  let popupSeen = 0;            // 저장 허락 뒤(저장 단계)에 열린 팝업 수
  let savePhase = false;        // 한 번이라도 허락했으면 저장 단계 — 값 넣기 중 팝업(딜러 고르기 등)은 세지 않음
  const log = [];

  function note(t) { if (log.length < 50) log.push(t); }
  function hostOf(url) {
    try { return new URL(url).host.toLowerCase(); } catch { return ''; }
  }

  /** 'ignore' | 'write'(그 전산 쓰기) | 'foreignWrite'(다른 주소 쓰기) */
  function classify(req) {
    const m = String(req.method || 'GET').toUpperCase();
    const url = String(req.url || '');
    const h = hostOf(url);
    const isGet = m === 'GET' || m === 'HEAD';
    if (h && hosts.size && !hosts.has(h)) return isGet ? 'ignore' : 'foreignWrite';
    if (isGet) return saveGetRe.some((r) => r.test(url)) ? 'write' : 'ignore';
    if (!savePhase && !sealed && fillRe.some((r) => r.test(url)) && !saveRe.some((r) => r.test(url))) return 'ignore';
    if (allowRe.some((r) => r.test(url)) && !saveRe.some((r) => r.test(url))) return 'ignore';
    return 'write';
  }

  return {
    /** 창(본 창·팝업)이 생기면 등록 — 붙이기(attachWindow) 전까지는 «통제 밖 창» */
    registerWindow(id, kind) {
      if (!windows.has(id)) windows.set(id, { attached: false });
      if (kind === 'popup' && savePhase) popupSeen++;
    },
    attachWindow(id) { windows.set(id, { attached: true }); },
    detachWindow(id) { windows.delete(id); },

    /** [저장해도 돼요] (job-log.beginSubmit 이 ok 일 때만) — 저장 요청 «하나»만 허락 */
    unlock() {
      if (sealed) { note('봉인 — 허락 거절'); return false; }
      unlocked = true; savePhase = true; note('허락'); return true;
    },

    /** 봉인 — 이 창에서 더는 저장이 나가지 않게(끝난 뒤) */
    seal() { sealed = true; unlocked = false; note('봉인'); },
    get sealed() { return sealed; },

    /**
     * 요청이 나가려 할 때 — 'pass'(내보냄) | 'hold'(붙잡음) | 'ignore'(저장과 무관)
     *  req: { id, url, method, kind: 'ajax'|'form'|'popup', windowId }
     */
    onRequest(req) {
      const c = classify(req);
      if (c === 'ignore') return 'ignore';
      if (c === 'foreignWrite') {
        const h = hostOf(req.url) || '(주소 없음)';
        unknownHosts.add(h);
        blocked++;
        note('알 수 없는 저장 경로 막음 ' + h);
        return 'hold';
      }
      if (sealed) { blocked++; note('봉인 — 막음 ' + (req.kind || '')); return 'hold'; }
      if (windowClosed) { blocked++; note('창 닫힌 뒤 요청 막음'); return 'hold'; }
      if (!unlocked) { blocked++; note('잠김 — 막음 ' + (req.kind || '')); return 'hold'; }
      unlocked = false;                                   // 한 번 허락에 한 요청
      sent++;
      pending.set(req.id, 'waiting');
      note('내보냄 ' + (req.kind || ''));
      return 'pass';
    },

    onResponse(id, status) {
      if (!pending.has(id)) return;
      const s = Number(status);
      pending.set(id, s >= 200 && s < 400 ? 'ok' : s >= 400 && s < 600 ? 'serverError' : 'lost');
    },
    onNetworkError(id) { if (pending.has(id)) pending.set(id, 'lost'); },
    onWindowClosed() {
      windowClosed = true;
      pending.forEach((v, k) => { if (v === 'waiting') pending.set(k, 'lost'); });
      note('창 닫힘');
    },
    onTimeout() {
      pending.forEach((v, k) => { if (v === 'waiting') pending.set(k, 'lost'); });
      note('시간 초과');
    },

    /** 통제 범위 — 무엇을 보고 있고 무엇을 모르는지 */
    coverage() {
      const reg = [...windows.entries()];
      return {
        confirmed: !!confirmed,
        hosts: [...hosts],
        savePatterns: saveRe.map(String),
        saveGetPatterns: saveGetRe.map(String),
        readAllow: allowRe.map(String),
        windows: reg.length,
        unattachedWindows: reg.filter(([, w]) => !w.attached).map(([id]) => id),
        unknownHosts: [...unknownHosts],
        popups: popupSeen,
        popupAuto: !!popupAuto,
        sealed,
      };
    },

    outcome() {
      const cov = this.coverage();
      const reasons = [];
      if (cov.unknownHosts.length) reasons.push('다른 주소로 가는 쓰기 요청: ' + cov.unknownHosts.join(', '));
      if (cov.unattachedWindows.length) reasons.push('통제기가 붙지 않은 창 ' + cov.unattachedWindows.length + '개');
      if (reasons.length) return { result: 'unknownPath', sent, blocked, reasons };
      if (popupSeen && !popupAuto) return { result: 'manualCheck', sent, blocked, reasons: ['팝업 창이 열림 — 첫 요청 전 통제를 보장할 수 없어 사람이 목록에서 확인'] };
      if (sent === 0) return { result: 'notSent', sent, blocked };
      const vals = [...pending.values()];
      if (vals.some((v) => v === 'waiting')) return { result: 'waiting', sent, blocked };
      if (vals.some((v) => v === 'lost')) return { result: 'uncertain', sent, blocked, reasons: ['응답을 모름(끊김·창 닫힘·시간 초과)'] };
      if (vals.some((v) => v === 'serverError')) return { result: 'uncertain', sent, blocked, reasons: ['서버 오류 응답 — 저장했는데 오류를 돌려줬을 수 있음'] };
      return { result: 'reached', sent, blocked };
    },

    get sentCount() { return sent; },
    get blockedCount() { return blocked; },
    get locked() { return !unlocked; },
    log() { return log.slice(); },
  };
}

module.exports = { createSaveGuard };
