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
});
