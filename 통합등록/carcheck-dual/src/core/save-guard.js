/**
 * 저장 통제기 — 사이트 [저장] 요청을 한 번만, 허락했을 때만 내보내고, 결과를 «저장됨/안 나감/실패/불확실»로 나눈다
 * ------------------------------------------------------------------
 *  화면·네트워크를 직접 다루지 않는 «판단» 부분만 여기 둔다(모의 시험 가능).
 *  실제로 요청을 붙잡는 일(개발자 연결 Fetch 가로채기 등)은 전산 연결 쪽이 하고, 일어난 일을 여기에 알린다.
 *
 *  ⚠ 2026-10-18 현재: 모의 시험만 통과. 실제 등록 흐름에는 아직 연결하지 않았다.
 *
 *  가정하지 않는 것 (검수 반영):
 *   · 저장 주소 목록이 모든 저장 경로를 덮는다고 가정하지 않는다
 *     → 잠겨 있는 동안 그 사이트로 가는 «쓰기 요청»(GET·HEAD 가 아닌 것)은 저장 주소가 아니어도 **모두 붙잡는다**.
 *       조회처럼 꼭 필요한 쓰기 요청만 readAllow(주소 무늬)로 통과시킨다.
 *   · GET 으로 저장하는 사이트가 있을 수 있다 → saveGetPatterns 로 따로 지정해 붙잡는다.
 *     그래도 모르는 경로는 있을 수 있으므로, **저장 결과는 언제나 목록 다시 읽기로 최종 확인**한다(job-log 의 saveConfirmed).
 *
 *  결과 나누기:
 *    notSent    허락 뒤 저장 요청이 하나도 나가지 않음 → 취소 가능(job-log.cancelSubmit sentCount 0)
 *    saved      나간 저장 요청이 정상 응답(2xx·3xx)을 받음 → «저장된 듯». 목록 확인으로 saveConfirmed
 *    failed     나간 저장 요청이 분명한 오류 응답(4xx·5xx)을 받음 → 저장 안 됨으로 보되, 목록 확인 권장
 *    uncertain  나갔는데 응답을 모름(네트워크 끊김·창 닫힘·시간 초과) → 다시 저장 금지, 목록 확인 필요
 */

function compile(list) {
  return (list || []).map((p) => (p instanceof RegExp ? p : new RegExp(String(p), 'i')));
}

function createSaveGuard({ siteHost, savePatterns, saveGetPatterns, readAllow } = {}) {
  const host = String(siteHost || '').toLowerCase();
  const saveRe = compile(savePatterns);
  const saveGetRe = compile(saveGetPatterns);
  const allowRe = compile(readAllow);

  let unlocked = false;          // 허락(한 번)
  let sent = 0;                  // 내보낸 저장 요청 수
  let blocked = 0;               // 붙잡은 요청 수
  const pending = new Map();     // 내보낸 요청 id → 'waiting' | 'ok' | 'error' | 'lost'
  let windowClosed = false;
  const log = [];

  function note(t) { if (log.length < 50) log.push(t); }

  function hostOf(url) {
    try { return new URL(url).host.toLowerCase(); } catch { return ''; }
  }

  /** 이 요청을 붙잡아야 하는가(저장 성격인가) */
  function isWrite(req) {
    const m = String(req.method || 'GET').toUpperCase();
    const url = String(req.url || '');
    if (host && hostOf(url) && hostOf(url) !== host) return false;           // 다른 사이트 요청은 여기서 다루지 않음
    if (m === 'GET' || m === 'HEAD') return saveGetRe.some((r) => r.test(url));
    if (allowRe.some((r) => r.test(url)) && !saveRe.some((r) => r.test(url))) return false;   // 조회용 쓰기 요청
    return true;                                                              // 그 밖의 쓰기 요청은 모두 저장 성격으로 봄
  }

  return {
    /** 앱이 [저장해도 돼요] 를 받았을 때(job-log.beginSubmit 이 ok 일 때만) — 저장 요청 «하나»만 허락 */
    unlock() { unlocked = true; note('허락'); },

    /**
     * 요청이 나가려 할 때 — 'pass'(내보냄) | 'hold'(붙잡음·실패 처리) | 'ignore'(저장과 무관)
     *  req: { id, url, method, kind: 'ajax'|'form'|'popup' }
     */
    onRequest(req) {
      if (windowClosed) { blocked++; note('창 닫힌 뒤 요청 막음'); return 'hold'; }
      if (!isWrite(req)) return 'ignore';
      if (!unlocked) { blocked++; note('잠김 — 막음 ' + (req.kind || '') ); return 'hold'; }
      //  한 번 허락에 한 요청만. 내보내는 순간 다시 잠근다 → 두 번 누름은 둘째부터 막힘
      unlocked = false;
      sent++;
      pending.set(req.id, 'waiting');
      note('내보냄 ' + (req.kind || ''));
      return 'pass';
    },

    /** 내보낸 요청의 응답 */
    onResponse(id, status) {
      if (!pending.has(id)) return;
      const s = Number(status);
      //  2xx·3xx(form 저장 뒤 다른 화면으로 넘기는 경우가 많다) = 서버에 닿아 처리됨 · 4xx·5xx = 오류 · 그 밖 = 모름
      pending.set(id, s >= 200 && s < 400 ? 'ok' : s >= 400 && s < 600 ? 'error' : 'lost');
    },

    /** 내보낸 요청이 네트워크 문제로 끊김 — 서버에 닿았는지 모름 */
    onNetworkError(id) {
      if (pending.has(id)) pending.set(id, 'lost');
    },

    /** 사이트 창(또는 팝업)이 닫힘 — 기다리던 요청은 결과를 모름 */
    onWindowClosed() {
      windowClosed = true;
      pending.forEach((v, k) => { if (v === 'waiting') pending.set(k, 'lost'); });
      note('창 닫힘');
    },

    /** 기다리다 시간이 다 됨 */
    onTimeout() {
      pending.forEach((v, k) => { if (v === 'waiting') pending.set(k, 'lost'); });
      note('시간 초과');
    },

    /** 지금까지의 결과 */
    outcome() {
      if (sent === 0) return { result: 'notSent', sent, blocked };
      const vals = [...pending.values()];
      if (vals.some((v) => v === 'waiting')) return { result: 'waiting', sent, blocked };
      if (vals.some((v) => v === 'lost')) return { result: 'uncertain', sent, blocked };
      if (vals.every((v) => v === 'error')) return { result: 'failed', sent, blocked };
      return { result: 'saved', sent, blocked };
    },

    get sentCount() { return sent; },
    get blockedCount() { return blocked; },
    get locked() { return !unlocked; },
    log() { return log.slice(); },
  };
}

module.exports = { createSaveGuard };
