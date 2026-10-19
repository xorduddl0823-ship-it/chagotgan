const { contextBridge, ipcRenderer, webUtils } = require('electron');

/*  끌어다 놓은 파일의 전체 경로.
 *  예전에는 File.path 로 읽었지만 지금 electron 에서는 webUtils 로 읽는다.
 *  둘 다 안 되면 빈 값을 돌려주고, 화면은 [사진 고르기] 로 안내한다. */
function filePath(file) {
  try {
    if (webUtils && webUtils.getPathForFile) return webUtils.getPathForFile(file) || '';
  } catch {}
  return (file && file.path) || '';
}

/*  (10/19 먹통 원인) 프로그램 안쪽(메인)에서 오류가 나면 invoke 가 «거절»되고, 화면의 «전송 중…»이 영영 닫히지 않았다
 *  (예: 경기조합 화면을 불러오다 연결 실패 → 5분 넘게 «전송 중…»). 거절을 화면이 받는 «실패 결과»로 바꾼다 —
 *  화면은 늘 결과 창으로 끝나고, 다시 하기 전에 까닭을 볼 수 있다. */
function friendly(e) {
  let m = String((e && e.message) || e || '알 수 없는 오류').replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '');
  const net = m.match(/(ERR_[A-Z_]+)\s*\(-?\d+\)\s*loading\s*'([^']*)'/);
  if (net) m = '사이트 화면을 열지 못했어요(' + net[1] + '). 인터넷 연결과 사이트 상태를 확인해 주세요. 주소: ' + net[2];
  return m + ' — 프로그램은 저장하지 않고 멈췄어요. 그 전산 창에서 상태를 확인한 뒤 다시 해 주세요.';
}
const invoke = (ch, a) => ipcRenderer.invoke(ch, a).catch((e) => ({ ok: false, error: friendly(e) }));

contextBridge.exposeInMainWorld('api', {
  schema:      ()      => invoke('schema'),
  refocus:     ()      => invoke('win:refocus'),
  getConfig:   ()      => invoke('config:get'),
  setConfig:   (c)     => invoke('config:set', c),
  openSite:    (id)    => invoke('site:open', id),
  siteStatus:  (id)    => invoke('site:status', id),
  send:        (id, d) => invoke('site:send', { id, data: d }),
  prepare:     (o)     => invoke('carinfo:prepare', o),
  scrape:      (id)    => invoke('site:scrape', id),
  syncVin:     (o)     => invoke('vin:sync', o),
  saveRecord:  (d)     => invoke('record:save', d),
  probeAccident: ()      => invoke('accident:probe'),
  learnCarinfo: ()      => invoke('carinfo:learn'),
  calcHistory:  (d)     => invoke('history:calc', d),
  getCreds:     ()      => invoke('creds:get'),
  setCreds:     (d)     => invoke('creds:set', d),
  loginSite:    (id)    => invoke('site:login', id),
  listRecords: ()      => invoke('record:list'),

  //  자동차 사진
  pickPhoto:   (o)     => invoke('photo:pick', o || {}),
  checkPhotos: (fs2)   => invoke('photo:check', fs2),
  openPhoto:   (f)     => invoke('photo:open', f),
  pickDealer:  (n)     => invoke('dealer:pick', n),
  popupDiag:   (id)    => invoke('popup:diag', id),
  ciDealer:    (o)     => invoke('dealer:carinfo', o),
  sendPhotos:  (id, d) => invoke('photo:send', { id, data: d }),
  probePhotos: (id)    => invoke('photo:probe', id),
  filePath,

  //  등록 흐름 (설정 flow 가 켜졌을 때만 동작 — 화면은 시안 확정 뒤)
  flow: {
    start:        (o) => invoke('flow:start', o),
    entryPrecheck:(o) => invoke('flow:entryPrecheck', o),
    fill:         (o) => invoke('flow:fill', o),
    allowSave:    (o) => invoke('flow:allowSave', o),
    afterSave:    (o) => invoke('flow:afterSave', o),
    confirmFromList: (o) => invoke('flow:confirmFromList', o),
    resolve:      (o) => invoke('flow:resolve', o),
    finish:       (o) => invoke('flow:finish', o),
    resume:       ()  => invoke('flow:resume'),
    runAll:       (o) => invoke('flow:runAll', o),
    status:       ()  => invoke('flow:status'),
    stopWait:     () => invoke('flow:stopWait'),
    onProgress:   (fn) => { ipcRenderer.removeAllListeners('flow:progress'); ipcRenderer.on('flow:progress', (_e, info) => fn(info)); },
    forceClose:   (o) => invoke('flow:forceClose', o),
    releaseAfterForce: (o) => invoke('flow:releaseAfterForce', o),
  },
  admin: {
    isSet:  () => invoke('admin:isSet'),
    setPin: (o) => invoke('admin:setPin', o),
  },
  //  전산 진단(8차 · 설정 diagnose 가 켜졌을 때만) — 저장 요청을 서버로 보내지 않고 기록만
  diag: {
    openEntry: () => invoke('diag:openEntry'),
    start: (site, observe) => invoke('diag:start', { site, observe: observe === true }),
    snap:  (site) => invoke('diag:snap', { site }),
    stop:  (site) => invoke('diag:stop', { site }),
    onAborted: (fn) => { ipcRenderer.removeAllListeners('diag:aborted'); ipcRenderer.on('diag:aborted', (_e, r) => fn(r)); },
  },
});
