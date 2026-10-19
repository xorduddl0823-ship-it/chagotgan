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

contextBridge.exposeInMainWorld('api', {
  schema:      ()      => ipcRenderer.invoke('schema'),
  getConfig:   ()      => ipcRenderer.invoke('config:get'),
  setConfig:   (c)     => ipcRenderer.invoke('config:set', c),
  openSite:    (id)    => ipcRenderer.invoke('site:open', id),
  siteStatus:  (id)    => ipcRenderer.invoke('site:status', id),
  send:        (id, d) => ipcRenderer.invoke('site:send', { id, data: d }),
  prepare:     (o)     => ipcRenderer.invoke('carinfo:prepare', o),
  scrape:      (id)    => ipcRenderer.invoke('site:scrape', id),
  syncVin:     (o)     => ipcRenderer.invoke('vin:sync', o),
  saveRecord:  (d)     => ipcRenderer.invoke('record:save', d),
  probeAccident: ()      => ipcRenderer.invoke('accident:probe'),
  learnCarinfo: ()      => ipcRenderer.invoke('carinfo:learn'),
  calcHistory:  (d)     => ipcRenderer.invoke('history:calc', d),
  getCreds:     ()      => ipcRenderer.invoke('creds:get'),
  setCreds:     (d)     => ipcRenderer.invoke('creds:set', d),
  loginSite:    (id)    => ipcRenderer.invoke('site:login', id),
  listRecords: ()      => ipcRenderer.invoke('record:list'),

  //  자동차 사진
  pickPhoto:   (o)     => ipcRenderer.invoke('photo:pick', o || {}),
  checkPhotos: (fs2)   => ipcRenderer.invoke('photo:check', fs2),
  openPhoto:   (f)     => ipcRenderer.invoke('photo:open', f),
  pickDealer:  (n)     => ipcRenderer.invoke('dealer:pick', n),
  popupDiag:   (id)    => ipcRenderer.invoke('popup:diag', id),
  ciDealer:    (o)     => ipcRenderer.invoke('dealer:carinfo', o),
  sendPhotos:  (id, d) => ipcRenderer.invoke('photo:send', { id, data: d }),
  probePhotos: (id)    => ipcRenderer.invoke('photo:probe', id),
  filePath,

  //  등록 흐름 (설정 flow 가 켜졌을 때만 동작 — 화면은 시안 확정 뒤)
  flow: {
    start:        (o) => ipcRenderer.invoke('flow:start', o),
    entryPrecheck:(o) => ipcRenderer.invoke('flow:entryPrecheck', o),
    fill:         (o) => ipcRenderer.invoke('flow:fill', o),
    allowSave:    (o) => ipcRenderer.invoke('flow:allowSave', o),
    afterSave:    (o) => ipcRenderer.invoke('flow:afterSave', o),
    confirmFromList: (o) => ipcRenderer.invoke('flow:confirmFromList', o),
    resolve:      (o) => ipcRenderer.invoke('flow:resolve', o),
    finish:       (o) => ipcRenderer.invoke('flow:finish', o),
    resume:       ()  => ipcRenderer.invoke('flow:resume'),
    runAll:       (o) => ipcRenderer.invoke('flow:runAll', o),
    status:       ()  => ipcRenderer.invoke('flow:status'),
    stopWait:     () => ipcRenderer.invoke('flow:stopWait'),
    onProgress:   (fn) => { ipcRenderer.removeAllListeners('flow:progress'); ipcRenderer.on('flow:progress', (_e, info) => fn(info)); },
    forceClose:   (o) => ipcRenderer.invoke('flow:forceClose', o),
    releaseAfterForce: (o) => ipcRenderer.invoke('flow:releaseAfterForce', o),
  },
  admin: {
    isSet:  () => ipcRenderer.invoke('admin:isSet'),
    setPin: (o) => ipcRenderer.invoke('admin:setPin', o),
  },
  //  전산 진단(8차 · 설정 diagnose 가 켜졌을 때만) — 저장 요청을 서버로 보내지 않고 기록만
  diag: {
    openEntry: () => ipcRenderer.invoke('diag:openEntry'),
    start: (site, observe) => ipcRenderer.invoke('diag:start', { site, observe: observe === true }),
    snap:  (site) => ipcRenderer.invoke('diag:snap', { site }),
    stop:  (site) => ipcRenderer.invoke('diag:stop', { site }),
    onAborted: (fn) => { ipcRenderer.removeAllListeners('diag:aborted'); ipcRenderer.on('diag:aborted', (_e, r) => fn(r)); },
  },
});
