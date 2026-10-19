/**
 * 사이트 알림창 감시 (10/19 먹통·속도 지연 대응)
 * ------------------------------------------------------------------
 *  사이트가 alert·confirm·prompt 를 띄우면 그 페이지는 멈춘다. 프로그램이 그 페이지에 보낸 명령은 답을 못 받고
 *  정해 둔 시간(15초·90초)까지 기다렸다 — 대표님 PC에서 «경기조합 전송 중…»이 오래 떠 있던 까닭.
 *  이 감시는 개발자 연결(Page.javascriptDialogOpening)로 알림창이 «뜨는 순간» 알고, 그 화면에 보내던 명령을 바로 멈추게 한다.
 *  알림창의 [확인]·[취소]는 프로그램이 절대 누르지 않는다(Page.handleJavaScriptDialog 를 부르지 않음) — 사람이 읽고 누른다.
 */

class SiteDialogError extends Error {
  constructor(d) {
    const msg = String(d.message || '');
    super('사이트 알림창이 떠서 멈췄어요: «' + (msg.length > 80 ? msg.slice(0, 80) + '…' : msg) + '» — 알림창을 읽고 직접 눌러 주세요. 저장됐는지는 그 전산 창에서 먼저 확인해 주세요.');
    this.siteDialog = d;
  }
}

function createDialogWatch() {
  const open = new Map();        // webContents id → { type, message, at }
  const waiters = new Map();     // webContents id → Set(콜백)
  const watched = new Set();     // 감시 중인 webContents id

  function watch(wc) {
    if (!wc || wc.isDestroyed() || watched.has(wc.id)) return;
    const id = wc.id;
    const dbg = wc.debugger;
    try { if (!dbg.isAttached()) dbg.attach('1.3'); } catch { return; }   // 못 붙이면 예전처럼 시간 제한만
    watched.add(id);
    const onMsg = (_e, method, p) => {
      if (method === 'Page.javascriptDialogOpening') {
        const d = { type: p.type, message: String(p.message || '').slice(0, 300), at: Date.now() };
        open.set(id, d);
        (waiters.get(id) || new Set()).forEach((f) => { try { f(d); } catch {} });
      } else if (method === 'Page.javascriptDialogClosed') {
        open.delete(id);
      }
    };
    dbg.on('message', onMsg);
    //  다른 기능이 개발자 연결을 떼면 감시도 끝 — 다음에 다시 붙인다
    dbg.once('detach', () => { watched.delete(id); open.delete(id); try { dbg.removeListener('message', onMsg); } catch {} });
    wc.once('destroyed', () => { watched.delete(id); open.delete(id); waiters.delete(id); });
    dbg.sendCommand('Page.enable').catch(() => {});
  }

  /** 지금 떠 있는 알림창(없으면 null) */
  function current(wc) { return wc && open.get(wc.id) || null; }

  /** 이 화면에 보내는 명령을 알림창과 겨룬다 — 알림창이 이미 떠 있거나 뜨는 순간 SiteDialogError 로 끝 */
  function guard(wc, promise) {
    if (!wc) return promise;
    watch(wc);
    const now = current(wc);
    if (now) { promise.catch(() => {}); return Promise.reject(new SiteDialogError(now)); }
    let cb;
    const dialog = new Promise((_r, rej) => {
      cb = (d) => rej(new SiteDialogError(d));
      if (!waiters.has(wc.id)) waiters.set(wc.id, new Set());
      waiters.get(wc.id).add(cb);
    });
    return Promise.race([promise, dialog]).finally(() => { const s = waiters.get(wc.id); if (s) s.delete(cb); });
  }

  return { watch, current, guard };
}

module.exports = { createDialogWatch, SiteDialogError };
