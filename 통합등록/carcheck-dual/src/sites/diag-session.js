/**
 * 진단 두 겹 막기 (8차 검수 보완) — 진단하는 동안 그 전산에서 «안전한 조회»만 나가게 한다
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸.
 *
 *  ① 세션 거르개(session.webRequest) — 그 전산 세션 전체에 «먼저» 건다.
 *     본 창 · 팝업(첫 요청부터) · iframe(다른 주소 iframe 포함) · 작업자(worker)까지 같은 세션의 모든 요청이 지난다.
 *     여기서 판단(decide)해 «안전한 조회»가 아니면 취소한다. 기록도 여기서 한다.
 *  ② 창별 붙잡기(save-hold · 개발자 연결) — 본 창과 팝업에 붙여 같은 판단으로 한 번 더 막는다.
 *  ③ 감시 — 붙지 않은 창(팝업)이 정해진 시간 넘게 남아 있거나, 다른 세션 창이 생기면 진단을 «중단»한다(onAbort).
 *
 *  시작: ①을 건 뒤 ②가 붙을 때까지 기다린다. ②가 실패하면 ①도 풀고 시작하지 않는다(ready=false).
 *  끝:   감시 → ② → ① 순서로 푼다. 다 푼 뒤에는 기존 기능이 예전처럼 동작한다(시험으로 확인).
 */
const { attachSaveHold } = require('./save-hold');

/**
 * @param o.win      그 전산 본 창(BrowserWindow)
 * @param o.rec      createDiagRecorder(...)
 * @param o.graceMs  팝업이 붙기를 기다리는 한도(기본 2000) — 넘으면 중단
 * @param o.onAbort  (까닭) => void — 진단을 중단해야 할 때 한 번 부름
 * @returns { ready: Promise<boolean>, stop(): Promise<void>, aborted: string|null }
 */
function startDiagSession(o) {
  const { win, rec } = o;
  const ses = win.webContents.session;
  const grace = o.graceMs || 2000;
  let stopped = false;
  const st = { aborted: null };

  //  ① 세션 거르개 — 이 프로그램은 다른 곳에서 세션 거르개(webRequest)를 쓰지 않는다(8차 기준 확인). 끝날 때 null 로 푼다
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (d, cb) => {
    let body = '';
    try { if (d.uploadData && d.uploadData[0] && d.uploadData[0].bytes) body = d.uploadData[0].bytes.toString('utf8').slice(0, 20000); } catch {}
    let block = true;                                     // 판단 중 오류가 나면 막는 쪽
    try { block = rec.onSessionRequest({ method: d.method, url: d.url, resourceType: d.resourceType, postData: body }); } catch {}
    cb({ cancel: block });
  });

  //  ② 창별 붙잡기
  const hold = attachSaveHold(win, rec, { name: 'diag' });

  //  ③ 감시 — 다른 세션으로 열린 창이 생기면 그 창의 요청은 ①을 안 지나므로 중단
  const onChild = (child) => {
    try { if (child.webContents.session !== ses) abort('진단 중에 막을 수 없는 새 창이 열려서 안전을 위해 멈췄어요'); } catch {}
  };
  win.webContents.on('did-create-window', onChild);
  const timer = setInterval(() => {
    const c = rec.coverage();
    const late = (c.unattachedWindows || []).filter((w) => Date.now() - (w.since || 0) > grace);
    if (late.length) abort('진단 중에 새 창이 열렸는데 막는 장치가 붙지 않아 안전을 위해 멈췄어요');
  }, 250);

  function abort(why) {
    if (st.aborted || stopped) return;
    st.aborted = why;
    try { o.onAbort && o.onAbort(why); } catch {}
  }

  const ready = hold.ready.then(async (ok) => {
    if (!ok) { await stop(); return false; }
    return true;
  });

  async function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    try { win.webContents.removeListener('did-create-window', onChild); } catch {}
    try { await hold.detach(); } catch {}
    try { ses.webRequest.onBeforeRequest(null); } catch {}
  }

  return { ready, stop, get aborted() { return st.aborted; } };
}

module.exports = { startDiagSession };
