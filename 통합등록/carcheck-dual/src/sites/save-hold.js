/**
 * 저장 붙잡기 — Electron 창(과 그 창이 여는 팝업)의 요청을 개발자 연결(CDP Fetch)로 붙잡아 저장 통제기(save-guard)에 묻는다
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸. 판단은 src/core/save-guard.js 가 하고, 여기는 «붙잡고 / 내보내고 / 결과 알리기»만.
 *
 *  · 붙는 창: 본 창 + did-create-window 로 생기는 팝업(자동으로 붙임). 붙이기 실패한 창은 통제기에 «통제 밖»으로 남아
 *    흐름이 저장을 허락하지 않는다.
 *  · 요청 단계에서 모든 요청을 잠깐 세우고(Fetch.requestPaused) 통제기에 물어 continue / fail 한다.
 *  · 응답·실패는 Network 이벤트로 알린다(Fetch 의 networkId 로 짝지음).
 *  · 이미 다른 기능(사진 올리기)이 개발자 연결을 쓰고 있으면 그것을 같이 쓴다(따로 붙였다 떼지 않음).
 *
 *  ⚠ 알려진 한계: 개발자 연결이 끊기면(창 닫힘 등) 그 뒤 요청은 볼 수 없다 → onWindowClosed 로 «불확실» 처리.
 */

function kindOf(p) {
  const t = String(p.resourceType || '');
  if (t === 'Document') return 'form';
  if (t === 'XHR' || t === 'Fetch') return 'ajax';
  return t.toLowerCase() || 'other';
}

/**
 * @param win    BrowserWindow (본 창)
 * @param guard  createSaveGuard(...) 결과
 * @param opts   { name } — 기록용 이름
 * @returns { ready: Promise<boolean>, detach() }
 */
function attachSaveHold(win, guard, opts = {}) {
  const attached = [];
  let seq = 0;

  function hookContents(wc, id) {
    guard.registerWindow(id);
    const dbg = wc.debugger;
    let mine = false;
    try {
      if (!dbg.isAttached()) { dbg.attach('1.3'); mine = true; }
    } catch (e) {
      return Promise.resolve(false);                      // 못 붙임 → 통제 밖 창으로 남음(흐름이 저장을 허락 안 함)
    }
    const byNet = new Map();                              // networkId → 통제기 요청 id
    const onMsg = async (_e, method, p) => {
      try {
        if (method === 'Fetch.requestPaused') {
          const rid = id + ':' + (++seq);
          if (p.networkId) byNet.set(p.networkId, rid);
          const v = guard.onRequest({ id: rid, url: p.request.url, method: p.request.method, kind: kindOf(p), windowId: id });
          if (v === 'hold') await dbg.sendCommand('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
          else await dbg.sendCommand('Fetch.continueRequest', { requestId: p.requestId });
        } else if (method === 'Network.responseReceived') {
          const rid = byNet.get(p.requestId);
          if (rid) guard.onResponse(rid, p.response && p.response.status);
        } else if (method === 'Network.loadingFailed') {
          const rid = byNet.get(p.requestId);
          if (rid && !/BlockedByClient/i.test(String(p.blockedReason || p.errorText || ''))) guard.onNetworkError(rid);
        }
      } catch { /* 창이 닫히는 중 */ }
    };
    dbg.on('message', onMsg);
    const onDetach = () => guard.onWindowClosed();
    dbg.on('detach', onDetach);
    attached.push({ wc, dbg, onMsg, onDetach, mine });
    //  붙이기가 끝나야(Fetch 켜짐) «통제 안 창»이 된다 — 그 전에는 흐름이 저장을 허락하지 않는다
    return Promise.all([
      dbg.sendCommand('Network.enable'),
      dbg.sendCommand('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] }),
    ]).then(() => { guard.attachWindow(id); return true; }).catch(() => false);
  }

  const ready = hookContents(win.webContents, opts.name || 'main');

  //  팝업 — 생기는 즉시 붙인다(첫 요청 전에 붙도록 did-create-window 에서)
  const onChild = (child) => {
    const cid = 'popup-' + (++seq);
    hookContents(child.webContents, cid);
    child.once('closed', () => guard.onWindowClosed());
  };
  win.webContents.on('did-create-window', onChild);
  win.once('closed', () => guard.onWindowClosed());

  return {
    /** 본 창 붙이기가 끝나면 풀리는 약속 — true(붙음) / false(못 붙음) */
    ready,
    /** 통제 끝 — Fetch 를 끄고, 우리가 붙인 개발자 연결만 뗀다 */
    async detach() {
      win.webContents.removeListener('did-create-window', onChild);
      for (const a of attached) {
        try { a.dbg.removeListener('message', a.onMsg); a.dbg.removeListener('detach', a.onDetach); } catch {}
        try { await a.dbg.sendCommand('Fetch.disable'); } catch {}
        if (a.mine) { try { a.dbg.detach(); } catch {} }
      }
    },
  };
}

module.exports = { attachSaveHold };
