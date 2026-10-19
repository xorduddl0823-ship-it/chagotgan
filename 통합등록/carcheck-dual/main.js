'use strict';
const { app, BrowserWindow, ipcMain, session, safeStorage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/*  시험판(10차) — 프로그램 폴더에 test-install.json 이 있으면 «기록 폴더»를 업무용과 따로 쓴다.
 *  업무용(%APPDATA%\carcheck-dual)의 설정·로그인 정보·작업 기록·사이트 로그인 상태를 읽지도 고치지도 않는다.
 *  이 파일은 시험용 PC 묶음에만 넣는다(저장소·업무용 판에는 없음). */
const TEST_INSTALL = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'test-install.json'), 'utf8')); } catch { return null; } })();
if (TEST_INSTALL && /^[\w가-힣.\-]{3,60}$/.test(String(TEST_INSTALL.dataFolder || '')) && String(TEST_INSTALL.dataFolder) !== 'carcheck-dual') {
  app.setPath('userData', path.join(app.getPath('appData'), String(TEST_INSTALL.dataFolder)));
}
const { GROUPS, OPT, historyFromParts } = require('./src/schema');
const { buildScript } = require('./src/filler');
const { buildPrepareScript } = require('./src/carinfo-prepare');
const { buildScrapeScript } = require('./src/scraper');
const { buildLookupScript, buildVinFillScript, vinTail } = require('./src/carmodoo-lookup');
const { buildProbeScript } = require('./src/accident-probe');
const { buildLearnScript } = require('./src/carinfo-learn');
const creds = require('./src/credentials');
const { buildLoginScript, LOGIN_PAGE_EXPR } = require('./src/auto-login');
const cmPhoto = require('./src/photo-upload');
const cmDealer = require('./src/carmodoo-dealer');
const ciDealer = require('./src/carinfo-dealer');
const safety = require('./src/core/safety');
const quiet = require('./src/sites/quiet-window');

const SITES = {
  carmodoo: {
    key: 'cm',
    name: '경기조합 (carmodoo)',
    partition: 'persist:carmodoo',
    home: 'https://ck.carmodoo.com/main/index.do',
    list: 'https://ck.carmodoo.com/carCheck/carCheckList.do',
    form: 'https://ck.carmodoo.com/carCheck/pop_carcheck.do',
    loginHint: '로그인 후 그대로 두세요. 전송 시 등록 화면으로 자동 이동합니다.',
    autoNavigate: true,
  },
  carinfo: {
    key: 'ci',
    name: '공정정보협회 (carinfo)',
    partition: 'persist:carinfo',
    home: 'https://ai.carinfo.co.kr/ct/carcheck_list',
    form: 'https://ai.carinfo.co.kr/ct/carcheck_list',
    loginHint: '로그인 후 [신규등록]으로 차량을 만들고 점검 입력 화면을 띄워두세요.',
    autoNavigate: false,
  },
};

const windows = { main: null, carmodoo: null, carinfo: null };

/** 창이 화면을 못 띄웠을 때 그 이유를 담아 둔다 (빈 창만 보고는 알 수 없으므로) */
const lastLoadError = { carmodoo: null, carinfo: null };

/** 사이트가 띄운 팝업 창 (카인포 사진등록처럼 그 창을 다뤄야 할 때가 있다) */
const popups = { carmodoo: null, carinfo: null };

/** 팝업 안에서 난 오류·기록 (팝업이 부모 창에 값을 못 넣을 때 여기에 남는다) */
const popupLogs = { carmodoo: [], carinfo: [] };

/** 막은 팝업 주소(host 만) — 전송 결과에 «막은 팝업»으로 알린다. 필요하면 config.json 의 popupHosts 에 넣는다 */
const blockedPopups = { carmodoo: [], carinfo: [] };

/** 조용한 창(config.quietWindows) — 켜면 프로그램이 일할 때 사이트 창을 앞으로 내지 않는다(기본 꺼짐 = 예전 그대로) */
function isQuiet() {
  try { return loadConfig().quietWindows === true; } catch { return false; }
}

/** 사이트 창(과 그 팝업)이 새 창을 열 때의 규칙 — src/core/safety.js popupAllowed */
function popupHandler(id) {
  return ({ url }) => {
    const cfg = SITES[id];
    if (!safety.popupAllowed(url, cfg.home, loadConfig().popupHosts)) {
      const h = safety.hostOf(url) || String(url || '').split(':')[0] + ':';
      const list = blockedPopups[id];
      if (list && !list.includes(h)) { list.push(h); if (list.length > 20) list.shift(); }
      console.log('[막은 팝업] ' + cfg.name + ' → ' + h);
      return { action: 'deny' };
    }
    /*  창 크기만 정해 주고 나머지는 연 창에서 그대로 물려받게 둔다.
     *  webPreferences 를 여기서 다시 쓰면 로그인 정보(session)까지 새로 잡혀
     *  팝업이 로그인 안 된 상태로 뜰 수 있다. */
    return {
      action: 'allow',
      overrideBrowserWindowOptions: { width: 1100, height: 860, autoHideMenuBar: true, ...quiet.popupOptions(isQuiet()) },
    };
  };
}

/** 그 사이트가 지금 띄워 둔 팝업 (없으면 null) */
function sitePopup(id) {
  const p = popups[id];
  return p && !p.isDestroyed() ? p : null;
}

/** 그 창이 지금 실제로 그 사이트를 띄우고 있는가 */
function isOnSite(win, cfg) {
  let u = '';
  try { u = win.webContents.getURL() || ''; } catch { return false; }
  if (!/^https?:/i.test(u)) return false;          // about:blank·빈 주소·오류 화면
  try {
    return new URL(u).host === new URL(cfg.home).host;
  } catch {
    return false;
  }
}

function userFile(name) {
  return path.join(app.getPath('userData'), name);
}

function loadConfig() {
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(userFile('config.json'), 'utf8'));
  } catch {
    cfg = { vinTail: 6, autoSubmit: false };
  }
  //  절개도 기둥(A·B·C필러)의 자리·기울기. tools 의 [기둥 맞추기] 로 저장한 값이다.
  //  없으면 화면이 기본값 그대로 쓴다.
  try {
    cfg.pillars = JSON.parse(fs.readFileSync(userFile('pillar.json'), 'utf8'));
  } catch {
    delete cfg.pillars;
  }
  //  절개도 전체 배치(부위 상자·기둥·차체 밑그림). [절개도 맞추기] 로 저장한 값이다.
  try {
    cfg.diagram = JSON.parse(fs.readFileSync(userFile('diagram.json'), 'utf8'));
  } catch {
    delete cfg.diagram;
  }
  return cfg;
}

function saveConfig(cfg) {
  fs.writeFileSync(userFile('config.json'), JSON.stringify(cfg, null, 2), 'utf8');
}

function createMainWindow() {
  windows.main = new BrowserWindow({
    width: 1180,
    height: 900,
    title: '성능점검 이중등록',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  //  입력 화면은 프로그램 안의 파일만 띄운다. 다른 주소로 옮겨 가거나 새 창을 열지 못하게 막는다.
  windows.main.webContents.on('will-navigate', (e, url) => {
    if (!/^file:/i.test(String(url || ''))) e.preventDefault();
  });
  windows.main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  windows.main.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  //  시험판이면 창 제목에 표시(업무용과 헷갈리지 않게)
  if (TEST_INSTALL) windows.main.webContents.on('did-finish-load', () => { try { windows.main.setTitle(windows.main.getTitle() + ' — 시험판(업무용과 기록 따로)'); } catch {} });
}

/**
 * 사이트 창을 꺼내 온다.
 *  reason: 'user'(사람이 창 열기 단추) | 'auto'(프로그램이 일하려고) — 예전 호출의 true 는 'auto' 로 본다.
 *  조용한 창이 꺼져 있으면 예전처럼 보이고 앞으로 낸다. 켜져 있으면 'user' 일 때만 앞으로 낸다.
 */
function siteWindow(id, reason = 'auto') {
  const why = reason === 'user' ? 'user' : 'auto';
  const show = quiet.windowAction(why, isQuiet()) === 'show-focus';
  const cfg = SITES[id];
  const old = windows[id];
  if (old && !old.isDestroyed()) {
    if (show) { old.show(); old.focus(); }
    //  창은 살아 있는데 사이트가 아닌 화면(빈 창·오류 화면·전송하다 남은 다른 주소)이면
    //  홈으로 되돌린다. 이것이 없으면 한 번 어긋난 창은 눌러도 영영 그대로다.
    //  (주소는 그 사이트인데 오류 화면인 경우도 있으므로 실패 기록도 함께 본다)
    if ((!isOnSite(old, cfg) || lastLoadError[id]) && !old.webContents.isLoading()) {
      lastLoadError[id] = null;
      old.loadURL(cfg.home).catch(() => {});
    }
    return old;
  }
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show,
    title: cfg.name,
    webPreferences: {
      partition: cfg.partition,
      contextIsolation: true,
      nodeIntegration: false,
      ...quiet.extraPrefs(isQuiet()),
    },
  });
  /*  팝업(window.open)은 진짜 창으로 연다.
   *
   *  예전에는 팝업 주소를 본 창에 실어(loadURL) 한 창에서 다 보려 했다.
   *  그런데 그렇게 열면 주소를 GET 으로 가져오게 된다.
   *  카인포 [사진등록] 처럼 빈 팝업을 먼저 띄우고 그 창으로 form 을 POST 하는
   *  화면은 이때 405(허용되지 않은 방법)가 뜨고 「요청한 페이지를 찾을 수 없습니다」
   *  로 끝난다. 크롬에서는 멀쩡히 뜨는데 앱에서만 안 되던 이유다.
   *
   *  진짜 창으로 열면 form 의 target 이 제대로 걸려 사이트가 하던 대로 POST 한다.
   *  로그인 정보(session)는 연 창에서 그대로 물려받는다. */
  //  빈 창 · 같은 사이트 · 따로 허락한 주소(config.popupHosts)만 연다. 그 밖은 막고 알린다.
  win.webContents.setWindowOpenHandler(popupHandler(id));

  //  열린 팝업을 기억해 둔다 — 사진 올리기처럼 그 창을 다뤄야 할 때가 있다
  win.webContents.on('did-create-window', (child) => {
    popups[id] = child;
    popupLogs[id] = [];
    //  팝업이 또 여는 창에도 같은 규칙을 건다 (예전에는 팝업 안의 새 창은 아무 주소나 열렸다)
    child.webContents.setWindowOpenHandler(popupHandler(id));

    /*  팝업 안에서 난 오류를 담아 둔다.
     *  "크롬에서는 되는데 앱에서만 안 된다" 는 대개 팝업이 부모 창에 값을 넣다가
     *  막히는 것이다. 그 오류는 팝업 쪽에만 찍히므로 여기서 받아 둔다. */
    child.webContents.on('console-message', (_e, level, message, line, source) => {
      const log = popupLogs[id];
      if (!log) return;
      log.push((level >= 2 ? '오류: ' : '') + String(message).slice(0, 200) +
               (source ? ' (' + String(source).split('/').pop() + ':' + line + ')' : ''));
      if (log.length > 40) log.shift();
    });

    child.on('closed', () => {
      if (popups[id] === child) popups[id] = null;
    });
  });
  win.webContents.on('did-fail-load', (_e, code, desc, failedUrl, isMainFrame) => {
    if (!isMainFrame) return;
    if (code === -3) return;                       // -3 은 사람이 중단한 것
    lastLoadError[id] = { code, desc, url: failedUrl };
  });
  win.webContents.on('did-finish-load', () => { lastLoadError[id] = null; });
  win.on('closed', () => { windows[id] = null; lastLoadError[id] = null; });
  windows[id] = win;
  win.loadURL(cfg.home).catch((e) => {
    lastLoadError[id] = { code: 0, desc: e.message, url: cfg.home };
  });
  return win;
}

app.whenReady().then(() => {
  //  사이트가 카메라·위치·알림 같은 권한을 달라고 하면 모두 거절한다 (이 일에 필요한 권한이 없다).
  [session.defaultSession, ...Object.values(SITES).map((c) => session.fromPartition(c.partition))]
    .forEach((ses) => {
      try { ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false)); } catch {}
    });
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

/* ---------------- IPC ---------------- */

ipcMain.handle('schema', () => ({ groups: GROUPS, opts: OPT, sites: SITES }));

/** 부위 표시로 사고이력·단순수리를 계산한다 (규칙은 schema.js 한 곳에만 있다) */
ipcMain.handle('history:calc', (_e, data) => historyFromParts(data || {}));

ipcMain.handle('config:get', () => loadConfig());
ipcMain.handle('config:set', (_e, cfg) => { saveConfig(cfg); return cfg; });

/*  윈도우에서 alert·confirm 창을 닫은 뒤 입력 칸에 글자가 안 들어가는 Electron 문제(대표님 10/19 «차량번호 입력이 아예 안돼») —
 *  창 초점을 한 번 뺐다가 다시 주면 풀린다. 화면이 경고창을 닫을 때마다 부른다(app.js 맨 위) */
ipcMain.handle('win:refocus', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w || w.isDestroyed()) return false;
  try { w.blur(); w.focus(); w.webContents.focus(); } catch {}
  return true;
});

ipcMain.handle('site:open', async (_e, id) => {
  const cfg = SITES[id];
  if (!cfg) return { ok: false, error: '알 수 없는 사이트입니다: ' + id };

  const win = siteWindow(id, 'user');
  await waitReady(win, 20000);

  //  화면이 뜨지 않았으면 한 번 더 홈으로 시도한다 (한 번의 실패로 빈 창이 남지 않도록)
  if (!isOnSite(win, cfg) && !lastLoadError[id]) {
    try { await win.loadURL(cfg.home); } catch (e) {
      lastLoadError[id] = { code: 0, desc: e.message, url: cfg.home };
    }
  }

  const err = lastLoadError[id];
  if (err) {
    return {
      ok: false,
      error: cfg.name + ' 화면을 열지 못했습니다.\n' +
             (err.desc || '알 수 없는 오류') + (err.code ? ' (' + err.code + ')' : '') +
             '\n주소: ' + (err.url || cfg.home) +
             '\n인터넷 연결이나 사이트 상태를 확인한 뒤 다시 눌러 주세요.',
    };
  }
  return { ok: true, url: win.webContents.getURL() };
});

ipcMain.handle('site:status', async (_e, id) => {
  const win = windows[id];
  if (!win || win.isDestroyed()) return { open: false };
  return { open: true, url: win.webContents.getURL() };
});

const LOAD_EVENTS = ['did-finish-load', 'did-stop-loading', 'dom-ready', 'did-fail-load'];

/**
 * 페이지 로딩 완료 대기.
 *
 *  did-finish-load 하나만 기다리면, 그 이벤트가 이미 지나갔거나 사이트가
 *  백그라운드 요청을 물고 있을 때 영원히 풀리지 않는다 (P4: 스피너가 영원히 도는 증상).
 *  여러 이벤트를 함께 보고, 반드시 시간 제한을 둔다 (D9).
 */
function waitReady(win, ms = 15000) {
  return new Promise((res) => {
    if (!win || win.isDestroyed()) return res();
    if (!win.webContents.isLoading()) return res();

    let done = false;
    let timer = null;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      LOAD_EVENTS.forEach((ev) => {
        try { win.webContents.removeListener(ev, finish); } catch {}
      });
      res();
    };
    timer = setTimeout(finish, ms);
    LOAD_EVENTS.forEach((ev) => win.webContents.once(ev, finish));
  });
}

/**
 * 페이지 안에서 스크립트를 돌리되 반드시 시간 제한을 둔다.
 *
 *  주입한 스크립트가 도는 도중 페이지가 새로 열리면 그 스크립트는 그 자리에서
 *  사라지고, 기다리던 약속(promise)은 영영 풀리지 않는다. 그러면 앱이 멈춘다.
 *  (P2 와 같은 함정 — 화면 이동은 반드시 앱 본체가 맡아야 하는 이유이기도 하다)
 */
function runScript(win, script, ms = 60000, label = '스크립트') {
  return Promise.race([
    win.webContents.executeJavaScript(script, true),
    new Promise((_r, rej) =>
      setTimeout(() => rej(new Error(label + ' 응답이 없어 중단했습니다 (' + Math.round(ms / 1000) + '초)')), ms)
    ),
  ]);
}

/* 카인포 성능점검 상세 화면이 열려 있는지.
 *
 *  절개도의 녹색 점으로 판단하면 안 된다. 그 점들은 상태표시(교환/판금 등)를
 *  고른 뒤에야 생기기 때문에, 화면이 멀쩡히 열려 있어도 점이 없을 수 있다.
 *  대신 상태표시 라디오(name=selection)가 화면에 보이는지로 본다.
 *  이 라디오는 상세 화면에만 있고 항상 떠 있다. */
const CI_DETAIL_EXPR =
  '(function(){var r=document.getElementsByName("selection");' +
  'for(var i=0;i<r.length;i++){var b=r[i].getBoundingClientRect();' +
  'if(b.width||b.height)return true;}' +
  'var d=document.querySelector("div[class*=select-circle][class*=part-]");' +
  'if(d){var e=d.getBoundingClientRect();if(e.width||e.height)return true;}' +
  'return false;})()';

/* 접수정보 옆의 [성능점검] 버튼을 누른다. 왼쪽 메뉴는 건드리지 않는다. */
const CI_OPEN_EXPR =
  '(function(){var all=document.querySelectorAll("a,button");' +
  'for(var i=0;i<all.length;i++){var b=all[i];' +
  'var t=String(b.textContent||"").replace(/\\s+/g,"");' +
  'if(t.indexOf("성능점검")<0&&t.indexOf("점검내역")<0)continue;' +
  'if(t.length>12)continue;' +
  'if(b.closest&&b.closest("nav,aside,.sidebar,.menu,#lnb,#gnb,.gnb,.lnb"))continue;' +
  'var cls=String(b.className||"");if(cls.indexOf("btn")<0)continue;' +
  'var r=b.getBoundingClientRect();if(!r.width&&!r.height)continue;' +
  'b.click();return t;}return null;})()';

/**
 * 카인포 성능점검 상세 화면을 열어 둔다.
 *
 *  부위 표와 절개도는 목록 화면에 없고 [성능점검] 을 눌러 들어가는 화면 안에 있다.
 *  그 버튼은 화면을 새로 여는 것이라, 주입 스크립트 안에서 누르면 스크립트가 죽는다.
 *  그래서 여는 일은 여기(앱 본체)에서 하고, 열린 뒤에 채우기를 시작한다.
 */
async function ensureCarinfoDetail(win) {
  /*  점검내역은 본 창에서 열릴 수도, 팝업 창으로 뜰 수도 있다.
   *  (팝업을 진짜 창으로 열도록 바꾼 뒤부터는 팝업 쪽일 수 있다)
   *  그래서 두 창을 다 보고, 화면을 가진 쪽을 돌려준다 — 값도 그 창에 넣어야 한다. */
  const pick = async () => {
    if (await probe(win, CI_DETAIL_EXPR)) return win;
    const pop = sitePopup('carinfo');
    if (pop && (await probe(pop, CI_DETAIL_EXPR))) return pop;
    return null;
  };

  let found = await pick();
  if (found) return { ok: true, win: found };

  const clicked = await probe(win, CI_OPEN_EXPR);
  if (!clicked) {
    return { ok: false, error: '카인포 화면에서 [성능점검] 버튼을 찾지 못했습니다.\n카인포 창에서 직접 열어 두고 다시 전송해 주세요.' };
  }

  //  화면이 새로 그려질 시간을 준다. 이동이 있으면 로딩까지 기다린다.
  await waitReady(win, 15000);
  for (let i = 0; i < 60; i++) {
    found = await pick();
    if (found) return { ok: true, win: found };
    await sleep(250);
  }
  return { ok: false, error: '[성능점검] 을 눌렀지만 상세 화면이 나타나지 않았습니다.\n카인포 창 상태를 확인해 주세요.' };
}

ipcMain.handle('site:send', async (_e, { id, data }) => {
  const b = legacyBlock(id);
  if (b) return { ok: false, error: b };
  return sendToSite(id, data);
});

/**
 * 사이트에 값 넣기(전송) — [카인포만]/[경기조합만]/[두 곳 동시 전송] 과 등록 흐름(flow:fill)이 함께 쓴다.
 *  (예전 site:send 안에 있던 코드를 그대로 함수로 옮김 — 동작 같음)
 */
async function sendToSite(id, data) {
  const cfg = loadConfig();
  const site = SITES[id];
  const win = siteWindow(id, 'auto');
  if (blockedPopups[id]) blockedPopups[id].length = 0;

  await waitReady(win);

  //  경기조합 등록 화면은 아래에서 사이트 방식으로 연다 (로그인 확인 뒤)
  await waitReady(win);

  //  로그인 화면이면 저장해 둔 정보로 먼저 로그인한다.
  //  저장된 것이 없으면 예전처럼 사람이 직접 로그인하도록 안내한다.
  if (/login/i.test(win.webContents.getURL()) || (await probe(win, LOGIN_PAGE_EXPR))) {
    const li = await autoLogin(win, id);
    if (!li.ok) {
      return { ok: false, error: '로그인이 필요합니다.\n' + li.error };
    }
  }

  /*  경기조합: 접수차량 리스트에서 [접수등록] 을 눌러 등록 화면을 띄운다.
   *  곧바로 pop_carcheck.do 를 열면 화면은 같아 보여도 부모 창이 없어,
   *  사원선택이 고른 값을 돌려주지 못한다. */
  let formFrame = null;
  if (id === 'carmodoo') {
    const form = await ensureCarmodooForm(win);
    if (!form.ok) return { ok: false, error: form.error };
    formFrame = form.frame;
  }

  const url = win.webContents.getURL();

  //  카인포에 사고 부위를 보낼 때는 상세 화면이 먼저 열려 있어야 한다.
  //  여는 일은 여기서 끝내고, 주입 스크립트는 준비된 화면에서만 돌게 한다.
  const hasParts = Object.keys(data || {}).some(
    (k) => /^pt\d/.test(k) && String(data[k] || '').trim()
  );
  //  값을 넣을 창. 카인포 점검내역이 팝업으로 떠 있으면 그 창에 넣어야 한다.
  let target = win;
  if (id === 'carinfo' && hasParts) {
    const opened = await ensureCarinfoDetail(win);
    if (!opened.ok) return { ok: false, error: opened.error };
    if (opened.win) target = opened.win;
  }

  try {
    /*  ── 경기조합은 딜러(사원) 고르기가 맨 먼저다 ──────────────────
     *  딜러·상사가 잡혀야 나머지 정보를 등록할 수 있다. 그래서 다른 칸을
     *  채우기 전에 이것부터 한다. 고를 사람이 여럿이면 여기서 멈추고
     *  앱에 목록을 띄운다 — 고른 뒤 다시 전송하면 이어서 진행된다. */
    let dealerNote = null;
    if (id === 'carmodoo' && String(data.dealerName || '').trim()) {
      const dl = await pickCarmodooDealer(win, data.dealerName, undefined, data, formFrame);
      if (dl.needPick) {
        return { ok: false, needDealerPick: true, rows: dl.rows,
                 error: '딜러(사원)를 먼저 골라 주세요. 고르면 이어서 전송합니다.' };
      }
      if (!dl.ok) return { ok: false, error: dl.error };
      if (!dl.skipped) {
        dealerNote = '딜러명 → ' + ((dl.state && dl.state.dealerName) || data.dealerName) +
                     ((dl.state && dl.state.sangsaName) ? ' · ' + dl.state.sangsaName : '') +
                     (dl.already ? ' (이미 골라져 있었음)' : '');
      }
    }

    const script = buildScript(site.key, data, { vinTail: cfg.vinTail, thorough: !!cfg.thorough });
    const report = formFrame
      ? await runFrame(formFrame, script, 90000, "전송")
      : await runScript(target, script, 90000, "전송");
    if (dealerNote) report.filled = [dealerNote].concat(report.filled || []);

    /*  사진은 「4 자동차사진」 탭에서 따로 올린다.
     *  입력칸을 다 채운 뒤에 하는 이유 — 사진 탭으로 넘어가면 그 화면이 가려지고,
     *  파일칸을 다루는 동안 다른 칸을 건드리면 서로 방해가 된다. */
    const shot = id === 'carmodoo' ? await sendCarmodooPhotos(win, data)
               : id === 'carinfo'  ? await sendCarinfoPhotos(win, data)
               : null;
    if (shot) {
      report.filled = (report.filled || []).concat(shot.filled);
      report.missing = (report.missing || []).concat(shot.missing);
    }
    //  이번 전송 중에 막은 팝업 — 사이트 기능이 그 팝업을 꼭 써야 하면 config.json popupHosts 에 넣는다
    (blockedPopups[id] || []).forEach((h) => {
      report.missing = (report.missing || []).concat(['막은 팝업: ' + h + ' (필요하면 허락 목록에 넣어야 함)']);
    });

    return { ok: true, url, ...report };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 페이지 안에서 값을 하나 읽어온다. 이동 중이면 null. */
async function probe(win, expr) {
  try {
    return await win.webContents.executeJavaScript(expr, true);
  } catch {
    return null;
  }
}

/**
 * 카인포가 [성능점검 등록관리] 화면에 있고 [신규등록] 버튼이 살아 있을 때까지 보장한다.
 *
 * 화면 이동을 여기(메인 프로세스)에서 하는 이유:
 * 좌측 메뉴 클릭이나 주소 이동은 페이지를 통째로 새로 불러오기 때문에,
 * 페이지 안에 주입한 스크립트는 그 순간 죽어버린다. 그래서 이동과 대기는
 * 바깥에서 끝내고, 주입 스크립트는 이미 준비된 화면에서만 돌게 한다.
 */
async function ensureCarinfoReady(win) {
  const TARGET = SITES.carinfo.form;

  for (let attempt = 1; attempt <= 2; attempt++) {
    await waitReady(win);

    if (!/\/ct\/carcheck_list/.test(win.webContents.getURL())) {
      try {
        await win.loadURL(TARGET);
      } catch (e) {
        return { ok: false, error: '카인포 화면을 열지 못했습니다: ' + e.message };
      }
      await waitReady(win);
    }

    // 로그인 화면이면 더 진행하지 않는다
    const gate = await probe(
      win,
      "({p: location.pathname, login: !!document.querySelector('input[type=password]')})"
    );
    if (gate && (gate.login || /login|signin/i.test(gate.p))) {
      return { ok: false, error: '카인포 로그인이 필요합니다.\n카인포 창에서 로그인한 뒤 다시 눌러 주세요.' };
    }

    // [신규등록] 버튼 + 목록 DataTable 초기화가 모두 끝날 때까지 기다린다 (최대 20초)
    //
    //  ※ 버튼만 보고 누르면 안 된다. 클릭 핸들러가 맨 먼저
    //    carcheckTable.rows().deselect() 를 호출하기 때문에,
    //    목록 DataTable 이 아직 준비되지 않았으면 그 안에서 오류가 나고
    //    모달이 뜨지 않는다. (버튼은 눌리는데 팝업이 안 뜨는 증상)
    const READY_EXPR =
      "(function(){try{var q=window.jQuery;" +
      "return !!document.querySelector('#btnNewCarcheck')" +
      " && !!q && !!q.fn.dataTable" +
      " && q.fn.dataTable.isDataTable('#carcheckTable');}catch(e){return false;}})()";

    for (let i = 0; i < 80; i++) {
      if (await probe(win, READY_EXPR)) {
        await sleep(300); // 마지막 마무리 여유
        return { ok: true };
      }
      await sleep(250);
    }
  }

  return {
    ok: false,
    error: '성능점검 등록관리 화면을 열지 못했습니다.\n카인포 창에서 [성능점검 관리 > 성능점검] 을 직접 연 뒤 다시 눌러 주세요.',
  };
}

/** 카인포: 신규등록 → 차량번호 → 딜러 검색·선택 → 확인 까지 자동 진행 */
ipcMain.handle('carinfo:prepare', async (_e, opts) => {
  { const b = legacyBlock('carinfo'); if (b) return { ok: false, error: b }; }   // 흐름 중 우회 막기
  return prepareCarinfo(opts);
});

/**
 * 카인포 신규등록 — 입력 화면 [신규등록] 단추와 등록 흐름(7차)이 함께 쓴다.
 *  (예전 carinfo:prepare 안에 있던 코드를 그대로 함수로 옮김 — 동작 같음)
 */
async function prepareCarinfo(opts) {
  const win = siteWindow('carinfo', 'auto');

  const ready = await ensureCarinfoReady(win);
  if (!ready.ok) return { ...ready, step: '카인포 화면 준비' };

  try {
    return await runScript(win, buildPrepareScript(opts), 120000, '신규등록');
  } catch (err) {
    return { ok: false, step: '스크립트 실행', error: err.message };
  }
}

/**
 * 경기조합에서 차대번호 전체를 받아, 뒷 6자리를 카인포에 넣는다.
 *
 *  카인포는 원부 조회로 차대번호 앞 11자리까지만 채워 주고 뒷 6자리는 사람이 쳐야 한다.
 *  반면 경기조합은 차량번호로 [검색] 하면 전체를 끌어온다. 그 값을 옮겨 담는다.
 */
ipcMain.handle('vin:sync', async (_e, { carNo }) => {
  { const b = legacyBlock('carmodoo') || legacyBlock('carinfo'); if (b) return { ok: false, error: b }; }   // 흐름 중 우회 막기
  const cfg = loadConfig();
  const tailLen = cfg.vinTail || 6;

  // ── 경기조합에서 조회 ──
  const cm = siteWindow('carmodoo', 'auto');
  await waitReady(cm);
  if (!cm.webContents.getURL().includes('pop_carcheck')) {
    try { await cm.loadURL(SITES.carmodoo.form); } catch (e) {
      return { ok: false, step: '경기조합 화면 열기', error: e.message };
    }
    await waitReady(cm);
  }

  let found;
  try {
    found = await runScript(cm, buildLookupScript({ carNo }), 60000, '차량번호 조회');
  } catch (err) {
    return { ok: false, step: '경기조합 조회', error: err.message };
  }
  if (!found.ok) return found;

  // ── 카인포 뒷자리 채우기 ──
  const ci = windows.carinfo;
  if (!ci || ci.isDestroyed()) {
    return {
      ok: true, vin: found.vin, tail: vinTail(found.vin, tailLen), filled: false,
      log: (found.log || []).concat('카인포 창이 열려 있지 않아 뒷자리는 넣지 못했습니다.'),
    };
  }

  let put;
  try {
    put = await runScript(ci, buildVinFillScript(found.vin, tailLen), 30000, '차대번호 넣기');
  } catch (err) {
    return { ok: true, vin: found.vin, tail: vinTail(found.vin, tailLen), filled: false, error: err.message, log: found.log };
  }

  return {
    ok: true,
    vin: found.vin,
    tail: vinTail(found.vin, tailLen),
    filled: !!put.ok,
    error: put.ok ? null : put.error,
    log: (found.log || []).concat(
      put.ok ? '카인포 차대번호 뒷자리 입력: ' + put.vin2 : '카인포 뒷자리 입력 실패: ' + put.error
    ),
  };
});

/** 사이트 폼에 채워진 값을 통합 스키마 키로 되읽기 */
ipcMain.handle('site:scrape', async (_e, id) => {
  const win = windows[id];
  if (!win || win.isDestroyed()) return { ok: false, error: '창이 열려 있지 않습니다.' };
  try {
    const data = await runScript(win, buildScrapeScript(SITES[id].key), 30000, '차량정보 읽기');
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/*  전송 기록. 개인정보(이름·연락처 등)와 사진 파일 위치는 남기지 않고, 차량번호·차대번호는 가리고,
 *  보관 기간(config.recordDays, 기본 90일)이 지난 줄은 쓸 때마다 정리한다. */
ipcMain.handle('record:save', (_e, rec) => {
  const file = userFile('records.jsonl');
  //  사람 정보는 빼고, 차량번호·차대번호는 뒤 4자리만 남긴다(보호 대상)
  const r = safety.protectRecord(rec);
  let lines = [];
  try { lines = fs.readFileSync(file, 'utf8').split('\n'); } catch {}
  lines = safety.pruneRecordLines(lines, loadConfig().recordDays || 90);
  lines.push(JSON.stringify({ at: new Date().toISOString(), ...r }));
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
  return file;
});

/* ── 사이트의 파일칸에 사진을 직접 넣는다 ─────────────────────────────
 *
 *  파일 고르기 창은 윈도우가 띄우는 창이라 페이지 스크립트로는 다룰 수 없다.
 *  대신 크롬 개발자 명령(DOM.setFileInputFiles)으로 파일칸에 경로를 바로 꽂는다.
 *  이러면 창이 뜨지 않고 change 만 일어나, 사이트가 평소처럼 올린다.
 */
async function setFileInput(win, selector, filePath) {
  const dbg = win.webContents.debugger;
  let mine = false;
  try {
    if (!dbg.isAttached()) { dbg.attach('1.3'); mine = true; }
  } catch (e) {
    throw new Error('브라우저 조종을 붙이지 못했습니다: ' + e.message);
  }
  try {
    const doc = await dbg.sendCommand('DOM.getDocument', { depth: 1 });
    const found = await dbg.sendCommand('DOM.querySelector', {
      nodeId: doc.root.nodeId, selector,
    });
    if (!found || !found.nodeId) throw new Error('파일칸을 찾지 못했습니다 (' + selector + ')');
    await dbg.sendCommand('DOM.setFileInputFiles', { files: [filePath], nodeId: found.nodeId });
  } finally {
    if (mine) { try { dbg.detach(); } catch {} }
  }
}

/*  ── 파일 고르기 창을 아예 뜨지 않게 가로챈다 ─────────────────────────
 *
 *  예전에는 페이지의 파일칸 click 을 막아 창이 뜨는 것을 피했다. 그런데 카인포는
 *  칸을 <label> 로 눌러 열어서 그 방법이 통하지 않았다. 창이 실제로 떠 버리면
 *  그 창이 닫힐 때까지 페이지가 멈추고, 앱은 "응답이 없어 중단했습니다(20초)" 로 끝난다.
 *
 *  크롬에는 파일 고르기 창을 아예 열지 않고 "어느 파일칸이 열렸는지" 만 알려주는
 *  기능이 있다(Page.setInterceptFileChooserDialog). 그걸 켜 두면 무슨 방법으로
 *  누르든 창이 뜨지 않고, 우리가 그 칸에 경로를 바로 꽂을 수 있다.
 *
 *  사진 여러 장을 올리는 동안 조종은 한 번만 붙였다 뗀다.
 */
async function withFileChooser(win, fn) {
  const dbg = win.webContents.debugger;
  let mine = false;
  try {
    if (!dbg.isAttached()) { dbg.attach('1.3'); mine = true; }
  } catch (e) {
    throw new Error('브라우저 조종을 붙이지 못했습니다: ' + e.message);
  }

  const seen = { chooser: null };
  const onMsg = (_e, method, params) => {
    if (method === 'Page.fileChooserOpened') seen.chooser = params;
  };
  dbg.on('message', onMsg);

  try {
    await dbg.sendCommand('DOM.enable');
    await dbg.sendCommand('Page.enable');
    await dbg.sendCommand('Page.setInterceptFileChooserDialog', { enabled: true });
    return await fn(seen, dbg);
  } finally {
    try { await dbg.sendCommand('Page.setInterceptFileChooserDialog', { enabled: false }); } catch {}
    try { dbg.removeListener('message', onMsg); } catch {}
    if (mine) { try { dbg.detach(); } catch {} }
  }
}

/** 조건이 맞을 때까지 잠깐 기다린다 */
async function until(fn, ms, step = 40) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(step);
  }
  return null;
}

/**
 * 경기조합 「4 자동차사진」 에 앞면·뒷면을 올린다.
 *   앱 1.전면사진 -> 조합 앞면
 *   앱 2.후면사진 -> 조합 뒷면
 * 조합은 이 두 장만 받는다. 3~8번은 보내지 않는다.
 */
async function sendCarmodooPhotos(win, data) {
  const jobs = [
    { which: '앞면', key: 'photo1', label: '1. 전면사진' },
    { which: '뒷면', key: 'photo2', label: '2. 후면사진' },
  ].filter((j) => String(data[j.key] || '').trim());

  if (!jobs.length) return { filled: [], missing: [] };

  const filled = [];
  const missing = [];

  //  없는 파일을 넣으려 하면 사이트가 이상해진다. 먼저 확인한다.
  for (const j of jobs) {
    if (!fs.existsSync(data[j.key])) {
      missing.push(j.label + ' : 사진 파일이 그 자리에 없습니다 → ' + data[j.key]);
      j.skip = true;
    }
  }

  /*  사진은 그 차의 접수등록 화면 안에서 올린다.
   *
   *  화면이 없다고 해서 앱이 [접수등록] 을 눌러선 안 된다 — 그러면
   *  빈 접수가 새로 하나 열릴 뿐, 그 차의 사진 자리가 아니다.
   *  없으면 그대로 알리고 사람이 그 차를 열게 한다. */
  const tab = await runScript(win, cmPhoto.PHOTO_TAB_EXPR, 15000, '사진 탭 열기');
  if (!tab || !tab.ok) {
    return { filled, missing: missing.concat(['사진: ' + ((tab && tab.error) || '탭을 열지 못했습니다.')]) };
  }
  await sleep(600);

  await withFileChooser(win, async (box, dbg) => {
    for (const j of jobs) {
      if (j.skip) continue;
      try {
        const r = await putPhoto(win, j.which, data[j.key], j.label, box, dbg, 250);   // 조합은 안내창이 없다
        (r.ok ? filled : missing).push(r.note);
      } catch (err) {
        missing.push(j.label + ' : ' + err.message);
      }
    }
  });

  try {
    const rs = await runScript(win, cmPhoto.PHOTO_RESTORE_EXPR, 8000, '사진 뒷정리');
    cmPhoto.restoreAlerts(rs).forEach((m) => missing.push('사이트 안내(사진): ' + m));
  } catch {}
  return { filled, missing };
}

/**
 * 경기조합 딜러 고르기 — 찾는 칸에 넣고 엔터, 뜬 목록에서 이름이 맞는 줄을 누른다.
 *
 *  사이트가 채워 주는 칸(#j_dealerName)에 글자만 넣으면 화면에는 보이지만
 *  딜러·상사 번호가 비어 저장할 때 「상사가 선택되지 않았습니다」 가 뜬다.
 *  목록은 이 화면에 뜰 수도, 팝업 창으로 뜰 수도 있어 두 곳을 다 본다.
 */

/**
 * 진짜 엔터 키를 보낸다.
 *
 *  페이지 안에서 만든 이벤트는 사이트가 걸어 둔 처리기는 부르지만, 브라우저가
 *  알아서 하는 일(엔터로 form 을 보내는 것 같은)은 일어나지 않는다.
 *  이건 창에 실제 키를 넣는 것이라 사람이 누른 것과 똑같이 동작한다.
 */
/*  ── 앱이 저장을 일으키지 않게 막는다 ─────────────────────────────
 *
 *  이 프로그램은 값만 채우고, [저장]은 사람이 눌러야 한다.
 *  그런데 딜러명 칸에서 진짜 엔터를 누르면 브라우저가 그 칸이 든 form 을
 *  스스로 보내 버린다(implicit submission). 사원선택 창을 띄우려던 엔터가
 *  접수 내용을 저장해 버린 것이다 — 실제로 그렇게 저장되고 있었다.
 *
 *  그래서 앱이 화면을 다루는 동안에는 form 이 나가는 것을 막는다.
 *  단, 사원선택 조회처럼 우리가 바라는 것은 그대로 보낸다.
 */
const NO_SUBMIT_ON = `(function () {
  if (window.__ccNoSubmit) return window.__ccNoSubmit.report;
  var st = { blocked: 0, allowed: 0, 자취: [] };

  function actionOf(f) {
    try { return String((f && f.getAttribute && f.getAttribute('action')) || (f && f.action) || ''); }
    catch (e) { return ''; }
  }
  //  사원·딜러 찾기처럼 우리가 바라는 것만 내보낸다
  function wanted(a) { return /popsearchdealer|dealer|emp|search|list|pop/i.test(a); }
  //  누가 불렀는지 — 사이트의 어느 함수가 저장을 시켰는지 알려면 이게 있어야 한다
  function who() {
    try {
      var lines = String(new Error().stack || '').split('\\n').slice(2, 4);
      //  주소가 길어 읽기 어려우니 파일 이름만 남긴다
      var out = lines.map(function (t) {
        var parts = String(t).split('/');
        return parts.length > 1 ? parts[parts.length - 1] : t;
      });
      return out.join(' | ').slice(0, 160);
    } catch (e) { return ''; }
  }
  function note(t) { if (st['자취'].length < 12) st['자취'].push(t); }

  //  ① 엔터·단추로 일어나는 것 (취소할 수 있다)
  var onSubmit = function (ev) {
    var a = actionOf(ev.target);
    if (wanted(a)) { st.allowed++; note('보냄 ' + a); return; }
    ev.preventDefault();
    ev.stopPropagation();
    st.blocked++;
    note('막음(엔터·단추) ' + (a || '(주소 없음)'));
  };
  document.addEventListener('submit', onSubmit, true);

  /*  ② 사이트 코드가 form.submit() 을 직접 부르는 것.
   *
   *  이건 취소할 수 있는 이벤트가 아예 나지 않는다 — 위의 막이로는 못 막는다.
   *  실제로 막았는데도 차가 계속 등록됐다. 그래서 함수 자체를 잠시 갈아 끼운다. */
  var proto = HTMLFormElement.prototype;
  var oSubmit = proto.submit;
  var oReq = proto.requestSubmit;
  proto.submit = function () {
    var a = actionOf(this);
    if (wanted(a)) { st.allowed++; note('보냄(코드) ' + a); return oSubmit.apply(this, arguments); }
    st.blocked++;
    note('막음(코드) ' + (a || '(주소 없음)') + ' ← ' + who());
  };
  if (oReq) {
    proto.requestSubmit = function () {
      var a = actionOf(this);
      if (wanted(a)) { st.allowed++; note('보냄(코드) ' + a); return oReq.apply(this, arguments); }
      st.blocked++;
      note('막음(코드) ' + (a || '(주소 없음)') + ' ← ' + who());
    };
  }

  window.__ccNoSubmit = { off: function () {
    try { document.removeEventListener('submit', onSubmit, true); } catch (e) {}
    try { proto.submit = oSubmit; if (oReq) proto.requestSubmit = oReq; } catch (e) {}
    delete window.__ccNoSubmit;
  }, report: st };
  return st;
})()`;

const NO_SUBMIT_OFF = `(function () {
  var g = window.__ccNoSubmit;
  if (!g) return null;
  var r = g.report;
  g.off();
  return r;
})()`;

/** 그 창의 모든 화면 조각에 저장 막이를 걸고/푼다 */
async function noSubmit(win, on) {
  const expr = on ? NO_SUBMIT_ON : NO_SUBMIT_OFF;
  const out = [];
  try { out.push(await win.webContents.executeJavaScript(expr, true)); } catch {}
  let frames = [];
  try { frames = win.webContents.mainFrame.framesInSubtree || []; } catch {}
  for (const f of frames) {
    if (f === win.webContents.mainFrame) continue;
    try { out.push(await f.executeJavaScript(expr, true)); } catch {}
  }
  //  막은 것이 있으면 합쳐서 알려준다 (없으면 null)
  const hits = out.filter((r) => r && (r.blocked || r.allowed));
  if (!hits.length) return null;
  return hits.reduce((a, r) => ({
    blocked: a.blocked + (r.blocked || 0),
    allowed: a.allowed + (r.allowed || 0),
    자취: a['자취'].concat(r['자취'] || []),
  }), { blocked: 0, allowed: 0, 자취: [] });
}

/*  ── 엔터가 [저장] 을 누르지 못하게 한다 ───────────────────────────
 *
 *  딜러명 칸의 엔터는 사원선택 창을 여는 신호다. 그런데 그 칸이 든 form 의
 *  기본 단추가 우측 상단 [저장] 이라, 브라우저가 엔터를 받으면 그 단추를
 *  대신 눌러 버린다 — 차가 그대로 전산에 등록됐다.
 *
 *  그래서 엔터를 보내는 동안만:
 *    · 저장 단추를 잠시 눌리지 않는 단추로 바꿔 둔다 (type=button)
 *    · 엔터의 기본 동작을 취소한다 (사이트가 걸어 둔 처리기는 그대로 돈다)
 *  일이 끝나면 원래대로 돌려놓는다.
 */
const NO_ENTER_SAVE_ON = `(function () {
  if (window.__ccNoEnter) return window.__ccNoEnter.report;
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  var st = { 바꾼단추: [], 막은엔터: 0 };

  //  ① 저장으로 이어질 단추를 잠시 무력화한다
  var changed = [];
  Array.prototype.slice.call(document.querySelectorAll('button,input[type=submit]'))
    .forEach(function (b) {
      var t = norm(b.textContent || b.value || '');
      if (t.indexOf('저장') < 0 && t.indexOf('등록') < 0) return;
      var was = b.getAttribute('type');
      if (String(was || '').toLowerCase() === 'button') return;   // 이미 안전한 단추
      b.setAttribute('type', 'button');
      changed.push([b, was]);
      if (st['바꾼단추'].length < 6) st['바꾼단추'].push(t);
    });

  //  ② 엔터의 기본 동작(기본 단추 누르기)만 취소한다
  var onKey = function (ev) {
    if (ev.key !== 'Enter' && ev.keyCode !== 13) return;
    ev.preventDefault();
    st['막은엔터']++;
  };
  document.addEventListener('keydown', onKey, false);   // 사이트 처리기가 먼저 돌게 뒤에서 받는다
  document.addEventListener('keypress', onKey, false);

  window.__ccNoEnter = { off: function () {
    try {
      document.removeEventListener('keydown', onKey, false);
      document.removeEventListener('keypress', onKey, false);
    } catch (e) {}
    changed.forEach(function (p) {
      try { if (p[1] === null) p[0].removeAttribute('type'); else p[0].setAttribute('type', p[1]); }
      catch (e) {}
    });
    delete window.__ccNoEnter;
  }, report: st };
  return st;
})()`;

const NO_ENTER_SAVE_OFF = `(function () {
  var g = window.__ccNoEnter;
  if (!g) return null;
  var r = g.report;
  g.off();
  return r;
})()`;

/** 그 창의 모든 화면 조각에 엔터-저장 막이를 걸고/푼다 */
async function noEnterSave(win, on) {
  const expr = on ? NO_ENTER_SAVE_ON : NO_ENTER_SAVE_OFF;
  const out = [];
  try { out.push(await win.webContents.executeJavaScript(expr, true)); } catch {}
  let frames = [];
  try { frames = win.webContents.mainFrame.framesInSubtree || []; } catch {}
  for (const f of frames) {
    if (f === win.webContents.mainFrame) continue;
    try { out.push(await f.executeJavaScript(expr, true)); } catch {}
  }
  const hits = out.filter((r) => r && (r['막은엔터'] || (r['바꾼단추'] || []).length));
  if (!hits.length) return null;
  return hits.reduce((a, r) => ({
    막은엔터: a['막은엔터'] + (r['막은엔터'] || 0),
    바꾼단추: a['바꾼단추'].concat(r['바꾼단추'] || []),
  }), { 막은엔터: 0, 바꾼단추: [] });
}

async function pressEnter(win) {
  const wc = win.webContents;
  const q = isQuiet();
  if (!q) {
    try { win.focus(); } catch {}
    wc.focus();
    await sleep(120);                     // 창이 앞으로 나올 시간
  }

  /*  누르기 직전에 딜러명 칸을 다시 잡아 둔다.
   *  창을 앞으로 내는 사이 입력 자리가 옮겨간다 — 실제로 엔터가 BODY 로 가서
   *  아무 일도 일어나지 않았다. 잡혔는지 확인까지 하고 누른다. */
  let active = '';
  try {
    active = await wc.executeJavaScript(
      "(function(){var e=document.getElementById('j_dealerName'); if(e){e.focus(); e.click();} " +
      "return document.activeElement ? (document.activeElement.id||document.activeElement.tagName) : '';})()", true);
  } catch {}

  /*  엔터가 [저장] 을 대신 누르지 못하게 막아 두고 보낸다.
   *  사이트가 걸어 둔 처리기(사원선택 열기)는 그대로 돈다. */
  await noEnterSave(win, true);
  try {
    if (q) {
      //  조용한 창: 창 초점 없이 개발자 연결로 «진짜 엔터»(isTrusted) — src/sites/quiet-window.js
      await quiet.cdpKey(wc, 'Enter');
    } else {
      wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
      wc.sendInputEvent({ type: 'char', keyCode: 'Enter' });
      wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
    }
    await sleep(700);                     // 사이트가 사원선택을 여는 동안
  } finally {
    const g = await noEnterSave(win, false);
    if (g) {
      console.log('[저장 막음] 엔터 기본동작 ' + g['막은엔터'] + '회, 잠근 단추: ' +
                  (g['바꾼단추'].join(', ') || '없음'));
    }
  }
  return active;
}

/**
 * 창 안의 모든 화면 조각(frame)에서 돌려 본다.
 *
 *  executeJavaScript 는 맨 바깥 화면에서만 돈다. 그런데 사원선택처럼 겹쳐 뜨는
 *  창은 그 안에 iframe 을 넣어 만드는 경우가 흔하다. 그러면 바깥에서 아무리 찾아도
 *  표가 안 보인다 — "목록이 뜨지 않았습니다" 로 끝나는 이유가 될 수 있다.
 *  그래서 바깥부터 안쪽 조각까지 차례로 물어보고, 쓸 만한 답이 나오면 그것을 쓴다.
 */
async function runInFrames(win, script, ok, label) {
  const tried = [];
  try {
    const r = await runScript(win, script, 8000, label);
    tried.push({ frame: '바깥', r });
    if (ok(r)) return { r, frame: win.webContents.mainFrame, tried };
  } catch (e) { tried.push({ frame: '바깥', error: e.message }); }

  let frames = [];
  try { frames = win.webContents.mainFrame.framesInSubtree || []; } catch {}
  for (const f of frames) {
    if (f === win.webContents.mainFrame) continue;
    try {
      const r = await f.executeJavaScript(script, true);
      tried.push({ frame: f.url ? String(f.url).split('/').pop() : '조각', r });
      if (ok(r)) return { r, frame: f, tried };
    } catch (e) {
      tried.push({ frame: '조각', error: e.message });
    }
  }
  return { r: null, frame: null, tried };
}

/*  ── 경기조합 등록 화면은 "사이트가 여는 방식" 으로 열어야 한다 ──────────
 *
 *  크롬에서는 접수차량 리스트(carCheckList.do)에서 [접수등록] 을 눌러 등록 화면을
 *  띄운다. 주소는 리스트 그대로이고 등록 화면은 그 위에 얹힌다.
 *
 *  앱은 그동안 pop_carcheck.do 를 곧바로 열었다. 그러면 화면은 같아 보이지만
 *  그 화면을 띄운 부모 창이 없다. 사원선택 창은 고른 값을 부모 창에 돌려주는데,
 *  돌려줄 곳이 없으니 조용히 실패한다 — 크롬에서는 되는데 앱에서만
 *  「상사가 선택되지 않았습니다」 가 뜨던 이유다.
 *
 *  그래서 리스트를 열고 [접수등록] 을 눌러 사이트가 하던 대로 띄운다.
 */
const CM_FORM_FRAME_EXPR =
  "(function(){return !!document.getElementById('j_dealerName');})()";

const CM_OPEN_FORM_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }

  /*  「등록」 한 글자만 보고 누르면 안 된다.
   *
   *  접수등록 화면 안의 [등록] 은 새 화면을 여는 단추가 아니라 저장 단추다.
   *  그것을 눌러 차가 실제로 등록되고 있었다 — 이 프로그램은 저장을 하지 않는다.
   *  목록에서 새 화면을 여는 단추 이름만 정확히 받는다. */
  var OPEN = { '접수등록': 1, '신규등록': 1, '신규접수': 1 };
  var all = document.querySelectorAll('a,button,input[type=button],span,div,li');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.children.length > 2) continue;
    var t = norm(el.textContent || el.value || '');
    if (!OPEN[t]) continue;
    //  저장으로 이어질 만한 것은 건드리지 않는다
    var oc = String(el.getAttribute('onclick') || '') + ' ' + String(el.className || '');
    if (/save|저장|submit|insert|update/i.test(oc)) continue;
    try { var r = el.getBoundingClientRect(); if (!r.width && !r.height) continue; } catch (e) { continue; }
    el.click();
    return { ok: true, how: t };
  }
  return { ok: false, error: '접수차량 리스트에서 [접수등록] 단추를 찾지 못했습니다.' };
})()`;

/**
 * 사원선택이 들어 있는 화면 조각을 찾는다.
 *
 *  사원선택은 따로 뜨는 창이 아니라 등록 화면 안의 조각이다.
 *    popSearchDealer.do?search=박형명&ssNo=&target=regist_check
 *  찾는 이름이 붙은 조각을 먼저 고른다 — 이름 없이 열린 조각은 전체 목록이라
 *  거기서 고르면 엉뚱한 사람이 잡힌다.
 */
function findDealerFrame(win, want) {
  let frames = [];
  try {
    frames = [win.webContents.mainFrame].concat(win.webContents.mainFrame.framesInSubtree || []);
  } catch { return null; }

  const hits = frames.filter((f) => String(f.url || '').includes('popSearchDealer'));
  if (!hits.length) return null;

  const key = encodeURIComponent(String(want || '').trim());
  if (key) {
    const named = hits.find((f) => String(f.url).includes('search=' + key));
    if (named) return named;
  }
  //  이름이 붙은 것이 없으면 가장 나중 것 (빈 검색일 수 있으니 있는 대로만)
  return hits[hits.length - 1];
}

/** 등록 화면(신청인정보 칸이 있는 곳)을 담고 있는 화면 조각을 찾는다 */
async function findFormFrame(win) {
  const frames = [];
  try {
    frames.push(win.webContents.mainFrame);
    (win.webContents.mainFrame.framesInSubtree || []).forEach((f) => {
      if (f !== win.webContents.mainFrame) frames.push(f);
    });
  } catch { return null; }

  for (const f of frames) {
    try {
      if (await f.executeJavaScript(CM_FORM_FRAME_EXPR, true)) return f;
    } catch { /* 아직 그려지는 중 */ }
  }
  return null;
}

/** 등록 화면을 연다 — 이미 열려 있으면 그 조각을 그대로 쓴다 */
async function ensureCarmodooForm(win) {
  let f = await findFormFrame(win);
  if (f) return { ok: true, frame: f };

  const site = SITES.carmodoo;
  const url = win.webContents.getURL();
  if (!url.includes('carCheckList')) {
    await win.loadURL(site.list);
    await waitReady(win, 20000);
  }

  const opened = await runScript(win, CM_OPEN_FORM_EXPR, 15000, '접수등록 열기');
  if (!opened || !opened.ok) {
    return { ok: false, error: (opened && opened.error) ||
             '접수차량 리스트에서 [접수등록] 을 찾지 못했습니다.' };
  }

  for (let i = 0; i < 60; i++) {
    f = await findFormFrame(win);
    if (f) return { ok: true, frame: f, opened: true };
    await sleep(250);
  }
  return { ok: false, error: '[접수등록] 을 눌렀지만 등록 화면이 나타나지 않았습니다.' };
}

/** 화면 조각에서 스크립트를 돌린다 (창이 아니라 조각에) */
function runFrame(frame, script, ms = 20000, label = '스크립트') {
  return Promise.race([
    frame.executeJavaScript(script, true),
    new Promise((_r, rej) =>
      setTimeout(() => rej(new Error(label + ' 응답이 없어 중단했습니다 (' +
        Math.round(ms / 1000) + '초)')), ms)),
  ]);
}

/** 새 팝업이 뜨기를 기다린다 (전에 떠 있던 것과 다른 창이어야 한다) */
async function waitForNewPopup(id, before, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const p = sitePopup(id);
    if (p && p !== before) {
      await waitReady(p, 8000);
      return p;
    }
    await sleep(150);
  }
  return null;
}

async function pickCarmodooDealer(win, name, chosen, match, frame) {
  /*  이 안에서 하는 일은 값 채우기뿐이다. 저장은 사람 몫이므로,
   *  form 이 스스로 나가는 것을 막아 둔 채로 한다. */
  await noSubmit(win, true);
  let out;
  try {
    out = await pickCarmodooDealerInner(win, name, chosen, match, frame);
  } finally {
    const g = await noSubmit(win, false);
    if (g && g.blocked) {
      console.log('[저장 막음] 경기조합 form 제출 ' + g.blocked + '건 — ' + g['자취'].join(' / '));
      if (out && typeof out === 'object') out.saveBlocked = g.blocked;
    }
  }
  return out;
}

async function pickCarmodooDealerInner(win, name, chosen, match, frame) {
  const want = String(name || '').trim();
  if (!want) return { ok: true, skipped: true };

  /*  등록 화면은 리스트 위에 얹혀 뜨므로, 신청인정보 칸은 그 화면 조각 안에 있다.
   *  창이 아니라 그 조각에 대고 물어봐야 한다. */
  if (!frame) {
    const f = await ensureCarmodooForm(win);
    if (!f.ok) return { ok: false, error: f.error };
    frame = f.frame;
  }
  //  등록 화면 조각은 방금 생겼을 수 있다 — 그 조각에도 저장 막이를 건다
  await noSubmit(win, true);

  const onForm = (script, ms, label) => runFrame(frame, script, ms || 10000, label || '신청인정보');
  const state = () => onForm(cmDealer.DEALER_STATE_EXPR, 8000, '신청인정보 확인');

  //  앱에서 고른 줄이 있으면 그것을 누르고 끝낸다
  if (chosen !== undefined && chosen !== null) {
    //  사원선택은 등록 화면 안의 조각이다. 그 조각에 대고 고른다.
    const df = findDealerFrame(win, want);
    if (!df) {
      return { ok: false, error: '사원선택 목록이 이미 닫혔습니다. 딜러 고르기를 다시 눌러 주세요.' };
    }

    //  고른 줄의 값을 먼저 읽어 둔다 (목록이 닫혀도 값은 우리가 가지고 있게)
    let rowData = null;
    try {
      const got = await runFrame(df, cmDealer.DEALER_LIST_EXPR, 8000, '딜러 목록 읽기');
      if (got && got.rows) rowData = got.rows[Number(chosen)] || null;
    } catch {}

    //  ① 사이트가 하던 대로 — 줄을 누르고 [확인]
    let r = null;
    try { r = await runFrame(df, cmDealer.buildDealerClickScript(chosen), 10000, '딜러 고르기'); }
    catch (e) { r = { ok: false, error: e.message }; }
    if (!r || !r.ok) {
      //  누르지 못해도 값이 있으면 직접 넣는다
      if (!rowData) return { ok: false, error: (r && r.error) || '고른 줄을 누르지 못했습니다.' };
    }

    for (let i = 0; i < 12; i++) {
      const s = await state();
      if (s && s.dNo && s.dealerName) return { ok: true, state: s };
      await sleep(250);
    }

    /*  ② 사이트가 값을 안 넣었으면 앱이 직접 넣는다.
     *  팝업이 부모 창에 값을 써 넣는 통로가 앱 안에서는 동작하지 않는다 —
     *  크롬에서는 되지만 여기서는 더블클릭해도 신청인정보가 비어 있었다.
     *  필요한 값(사원코드·사원명·휴대폰·상사코드·상사명)은 표에 다 있다. */
    if (rowData) {
      const put = await onForm(cmDealer.buildDealerApplyScript(rowData), 10000, "신청인정보 넣기");
      if (put && put.ok) {
        const s2 = await state();
        return { ok: true, state: s2, applied: put.done };
      }
      return { ok: false, error: '고른 값을 넣지 못했습니다: ' + JSON.stringify(put && put.miss), state: await state() };
    }
    return { ok: false, error: '줄을 눌렀지만 신청인정보가 채워지지 않았습니다.', state: await state() };
  }

  const before = await state();
  //  이미 그 딜러로 골라져 있으면 다시 하지 않는다
  if (before && before.dNo && String(before.dealerName || '').replace(/\s+/g, '') === want.replace(/\s+/g, '')) {
    return { ok: true, already: true, state: before };
  }

  //  ① 딜러명을 찾는 칸에 넣고 ② 진짜 엔터를 친다
  const before0 = sitePopup('carmodoo');
  const typed = await onForm(cmDealer.buildDealerTypeScript(want), 15000, "딜러명 넣기");
  if (!typed || !typed.ok) return { ok: false, error: (typed && typed.error) || '딜러명을 넣지 못했습니다.' };

  if (!isQuiet()) win.show();
  const active = await pressEnter(win);

  /*  ③ 사원선택 조각이 뜨기를 기다린다.
   *
   *  사원선택은 등록 화면 안의 조각(popSearchDealer.do?search=…)으로 뜬다.
   *  이걸 못 알아보고 한 번 더 눌렀더니 이름 없는 전체검색까지 열려 화면이
   *  꼬였다. 그래서 조각이 생겼는지부터 보고, 있으면 다시 누르지 않는다. */
  let dealerFrame = await until(() => findDealerFrame(win, want), 6000, 200);
  let pop = dealerFrame ? null : await waitForNewPopup('carmodoo', before0, 3000);
  let tried = null;

  if (!dealerFrame && !pop) {
    //  진짜 키가 안 먹는 화면이면 다른 통로들을 차례로 시도한다 (한 번만)
    tried = await onForm(cmDealer.DEALER_ENTER_EXPR, 10000, "엔터(다른 방법)");
    dealerFrame = await until(() => findDealerFrame(win, want), 6000, 200);
    if (!dealerFrame) pop = await waitForNewPopup('carmodoo', before0, 3000);
  }

  //  조각을 찾았으면 거기서 읽는다 (그 안에 또 조각이 있을 수 있어 안쪽까지 본다)
  let readNote = null;
  if (dealerFrame) {
    let list = null;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      //  그 조각과 그 아래 조각들을 차례로
      let targets = [dealerFrame];
      try {
        (dealerFrame.framesInSubtree || []).forEach((f) => {
          if (f !== dealerFrame) targets.push(f);
        });
      } catch {}

      for (const f of targets) {
        try {
          const got = await runFrame(f, cmDealer.DEALER_LIST_EXPR, 6000, '사원선택 읽기');
          if (got && got.ok && got.rows && got.rows.length) { list = got; break; }
          if (got && !got.ok) readNote = got;          // 무엇이 보였는지 기억해 둔다
        } catch (e) { readNote = { error: e.message }; }
      }
      if (list) break;
      await sleep(300);
    }

    if (list && list.ok && list.rows && list.rows.length) {
      const only = (s) => String(s || '').replace(/[\s-]/g, '');
      const wantName = only(want);
      const wantSangsa = only(match && match.sangsaName);
      const wantHp = only(match && match.dealerHp);

      const scored = list.rows.filter((r) => {
        const b = r.by || {};
        const nm = only(b['사원명'] || b['딜러명'] || '');
        if (nm && wantName && nm !== wantName) return false;
        if (!nm && String(r.text || '').replace(/\s+/g, '').indexOf(wantName) < 0) return false;
        if (wantSangsa) {
          const s = only(b['상사명'] || b['매매상사'] || '');
          if (s && s !== wantSangsa) return false;
        }
        if (wantHp) {
          const h = only(b['휴대폰번호'] || b['연락처'] || '');
          if (h && h !== wantHp) return false;
        }
        return true;
      });

      if (scored.length === 1) {
        //  사이트가 하던 대로 눌러 보고, 값이 안 들어오면 앱이 직접 넣는다
        try { await runFrame(dealerFrame, cmDealer.buildDealerClickScript(scored[0].i), 10000, '딜러 고르기'); }
        catch {}
        for (let k = 0; k < 8; k++) {
          const s2 = await state();
          if (s2 && s2.dNo && s2.dealerName) return { ok: true, state: s2, picked: scored[0].by };
          await sleep(250);
        }
        const put = await onForm(cmDealer.buildDealerApplyScript(scored[0]), 10000, '신청인정보 넣기');
        if (put && put.ok) {
          return { ok: true, state: await state(), picked: scored[0].by, applied: put.done };
        }
      }

      const rows = scored.length ? scored : list.rows;
      return { ok: false, needPick: true, rows, cols: list.cols, where: dealerFrame.url };
    }
  }

  /*  ④ 목록을 읽는다. 팝업으로 뜨는 화면도, 이 화면에 바로 뜨는 화면도 있다.
   *  기다리는 일은 앱이 한다 — 목록이 뜨면서 화면이 새로 그려지면
   *  페이지 안에서 기다리던 스크립트는 사라진다 (P2). */
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    const now = await state();
    //  한 건뿐이라 사이트가 알아서 채워 줬으면 끝
    if (now && now.dNo && now.dealerName) return { ok: true, state: now, picked: '자동' };

    for (const w of [pop, sitePopup('carmodoo'), win]) {
      if (!w || w.isDestroyed()) continue;
      //  겹쳐 뜨는 창은 iframe 안에 있을 수 있어 조각까지 다 훑는다
      const found = await runInFrames(
        w, cmDealer.DEALER_LIST_EXPR,
        (x) => x && x.ok && x.rows && x.rows.length, '딜러 목록 읽기');
      const list = found.r;
      if (!list || !list.rows || !list.rows.length) continue;

      /*  딜러명·매매상사·연락처가 모두 맞는 사람을 찾는다.
       *  셋 다 맞는 사람이 딱 한 명이면 앱이 고른다. 아니면 사람이 고른다 —
       *  같은 이름의 다른 상사를 앱이 마음대로 집으면 안 된다. */
      const only = (s) => String(s || '').replace(/[\s-]/g, '');
      const wantName = only(want);
      const wantSangsa = only(match && match.sangsaName);
      const wantHp = only(match && match.dealerHp);

      const scored = list.rows.filter((r) => {
        const b = r.by || {};
        const name = only(b['사원명'] || b['딜러명'] || '');
        if (name && wantName && name !== wantName) return false;
        if (!name && String(r.text || '').replace(/\s+/g, '').indexOf(wantName) < 0) return false;
        if (wantSangsa) {
          const s = only(b['상사명'] || b['매매상사'] || '');
          if (s && s !== wantSangsa) return false;
        }
        if (wantHp) {
          const h = only(b['휴대폰번호'] || b['연락처'] || '');
          if (h && h !== wantHp) return false;
        }
        return true;
      });

      if (scored.length === 1) {
        const hit2 = await runInFrames(
          w, cmDealer.buildDealerClickScript(scored[0].i), (x) => x && x.ok, '딜러 고르기');
        const r2 = hit2.r;
        if (r2 && r2.ok) {
          for (let k = 0; k < 12; k++) {
            const s2 = await state();
            if (s2 && s2.dNo && s2.dealerName) {
              return { ok: true, state: s2, picked: scored[0].by || scored[0].cells };
            }
            await sleep(250);
          }
        }
        //  사이트가 값을 안 넣으면 앱이 직접 넣는다 (표에 값이 다 있다)
        const put = await onForm(
          cmDealer.buildDealerApplyScript(scored[0]), 10000, '신청인정보 넣기');
        if (put && put.ok) {
          return { ok: true, state: await state(), picked: scored[0].by, applied: put.done };
        }
      }

      const rows = scored.length ? scored : list.rows;
      return { ok: false, needPick: true, rows, cols: list.cols, where: list.url, popup: !!pop };
    }
    await sleep(250);
  }

  /*  고르기가 끝내 안 되면, 카인포에서 가져온 값을 그대로 넣어 준다.
   *  화면에는 채워지지만 딜러번호·상사번호는 비어 있어 저장할 때 경고가 뜰 수 있다.
   *  그 사실을 감추지 않고 결과에 적는다. */
  const fill = await onForm(
    cmDealer.buildDealerFillScript(match || { dealerName: want }), 10000, '신청인정보 채우기');

  const last = await state();
  let diag = null;
  try { diag = await onForm(cmDealer.DEALER_DIAG_EXPR, 8000, "화면 살피기"); } catch {}

  //  화면 조각(iframe)이 몇 개 있고 무엇이 들어 있는지
  let frames = [];
  try {
    frames = (win.webContents.mainFrame.framesInSubtree || [])
      .map((f) => String(f.url || '').split('/').pop() || '(빈 조각)')
      .slice(0, 8);
  } catch {}

  return {
    ok: false,
    filled: fill && fill.ok ? fill.done : null,
    error: '「' + want + '」 사원선택 목록이 뜨지 않았습니다.' +
           (fill && fill.ok
             ? '\n   대신 카인포에서 가져온 값을 넣어 두었습니다: ' + fill.done.join(' · ') +
               '\n   ※ 딜러·상사 번호는 비어 있어 저장할 때 「상사가 선택되지 않았습니다」 가 뜰 수 있습니다.' +
               ' 그때는 조합 창에서 딜러명 칸을 눌러 엔터로 골라 주세요.'
             : '') +
           '\n   칸 상태: ' + JSON.stringify(last) +
           '\n   팝업 창: ' + (pop ? '떴음' : '안 뜸') +
           '\n   엔터를 받은 곳: ' + (active || '?') +
           '\n   화면 조각: ' + JSON.stringify(frames) +
           (dealerFrame ? '\n   사원선택 조각: 찾음 (' + String(dealerFrame.url).split('?')[0].split('/').pop() + ')'
                        : '\n   사원선택 조각: 못 찾음') +
           (readNote ? '\n   그 조각에서 본 것: ' + JSON.stringify(readNote).slice(0, 700) : '') +
           (tried ? '\n   시도한 방법: ' + JSON.stringify(tried.tried || tried) : '') +
           (diag ? '\n   칸에 적힌 처리기: ' + JSON.stringify(diag['칸에적힌처리기']) +
                   '\n   form: ' + diag.form +
                   '\n   닮은 함수들: ' + JSON.stringify(diag['닮은함수들'])
                 : ''),
  };
}

/*  한 자리에 사진 한 장 올리기 — 두 사이트가 같은 방법을 쓴다.
 *  ① 십자가를 눌러 자리를 알린다  ② 파일칸에 경로를 꽂는다  ③ 바뀌었는지 본다 */
async function putPhoto(win, which, file, label, box, dbg, noticeWait) {
  if (box) box.chooser = null;

  const prep = await runScript(win, cmPhoto.buildPhotoPrepScript(which), 15000, '사진 자리 고르기');
  if (!prep || !prep.ok) {
    const seen = await runScript(win, cmPhoto.buildPhotoProbeScript(), 15000, '사진 화면 살피기');
    return { ok: false, note: label + ' : ' + ((prep && prep.error) || '자리를 고르지 못했습니다.') +
             '\n   찾은 자리: ' + JSON.stringify((seen && seen.slots) || {}).slice(0, 500) };
  }

  /*  누르면 파일 고르기가 열린다 — 창은 가로채져 뜨지 않고, 어느 칸인지만 알려 준다.
   *  그 칸에 경로를 바로 꽂는다. (가로채기가 안 잡히면 예전 방법으로 되짚는다) */
  const got = box ? await until(() => box.chooser, 3000) : null;
  if (got && got.backendNodeId && dbg) {
    await dbg.sendCommand('DOM.setFileInputFiles',
      { files: [file], backendNodeId: got.backendNodeId });
  } else if (prep.called) {
    await setFileInput(win, 'input[data-cc-target="1"]', file);
  } else {
    /*  어느 칸이 열렸는지 모르는 상태다. 그냥 꽂으면 직전에 눌러 둔 자리에 들어간다.
     *  (전면·후면이 둘 다 앞면에 올라간 적이 있다) 엉뚱한 자리에 넣느니 멈춘다. */
    return { ok: false, note: label + ' : ' + which +
             ' 자리를 눌렀지만 사이트가 파일 고르기를 열지 않았습니다 (누른 곳: ' +
             (prep.hit || '?') + ')' };
  }

  const ok = await waitPhotoLanded(win, which, prep.before, { noticeWait });
  if (ok.ok) {
    return { ok: true, note: label + ' → ' + which + (ok.closed ? ' (안내창 닫음)' : '') };
  }
  return { ok: false, note: label + ' : ' + ok.error };
}

/**
 * 사진이 그 자리에 붙을 때까지 기다린다 — 기다리는 일은 앱이 한다.
 *
 *  페이지 안에서 기다리게 하면 안 된다. 사진이 올라갈 때 사이트가 화면을 새로
 *  그리면 그 스크립트가 통째로 사라져 답이 오지 않는다(P2 와 같은 함정).
 *  그래서 짧게 "지금 어떤가" 만 묻고, 사이 간격은 앱에서 쉰다.
 *  화면이 새로 그려지는 중이라 물음이 실패해도 그냥 다시 묻는다.
 */
async function waitPhotoLanded(win, which, before, opts) {
  const grace = (opts && opts.noticeWait) || 250;
  const end = Date.now() + 15000;
  const was = (before || {})[which];
  let closed = false;
  let landedAt = 0;

  while (Date.now() < end) {
    let s = null;
    try {
      s = await runScript(win, cmPhoto.buildPhotoWatchScript(which), 5000, '사진 확인');
    } catch { /* 화면이 바뀌는 중 — 잠시 뒤 다시 묻는다 */ }

    if (s) {
      if (s.closed) closed = true;
      const now = String(s.sig || '');
      if (!landedAt && now && now !== was && now !== '(빈자리)' && now !== '(자리없음)') {
        landedAt = Date.now();
      }
    }
    //  붙은 것을 확인했고, 안내창까지 닫았거나 잠깐 지켜봐도 안 뜨면 끝
    if (landedAt && (closed || Date.now() - landedAt > grace)) return { ok: true, closed };
    await sleep(120);
  }
  return { ok: false, closed, error: which + ' 자리에 사진이 나타나지 않았습니다.' };
}

/*  카인포 사진 팝업의 자리 순서.
 *    앱 1 전면 -> 앞면 · 2 후면 -> 뒷면 · 3 계기판 -> 좌측면
 *    그 뒤로 4~8 은 우측면 · 기타1~4 로 차례대로 간다.
 *  자리는 고정이다 — 앱 6번에 넣은 사진은 늘 기타2 로 간다(중간이 비어도 밀리지 않는다). */
const CI_PHOTO_SLOTS = [
  { key: 'photo1', which: '앞면',   label: '1. 전면사진' },
  { key: 'photo2', which: '뒷면',   label: '2. 후면사진' },
  { key: 'photo3', which: '좌측면', label: '3. 계기판사진' },
  { key: 'photo4', which: '우측면', label: '4. 기타' },
  { key: 'photo5', which: '기타1',  label: '5. 기타' },
  { key: 'photo6', which: '기타2',  label: '6. 기타' },
  { key: 'photo7', which: '기타3',  label: '7. 기타' },
  { key: 'photo8', which: '기타4',  label: '8. 기타' },
];

/** 카인포 사진 팝업을 띄우고 그 창을 돌려준다 */
async function openCarinfoPhotoPopup(win) {
  const ready = async () => {
    const pop = sitePopup('carinfo');
    if (pop && (await probe(pop, cmPhoto.CI_PHOTO_READY_EXPR))) return pop;
    return null;
  };

  let pop = await ready();
  if (pop) return { ok: true, win: pop };

  //  점검내역 화면(본 창일 수도, 팝업일 수도)에서 [사진등록] 을 누른다
  const detail = await ensureCarinfoDetail(win);
  const from = (detail.ok && detail.win) || win;
  const clicked = await runScript(from, cmPhoto.CI_OPEN_PHOTO_EXPR, 15000, '사진등록 누르기');
  if (!clicked || !clicked.ok) {
    return { ok: false, error: (clicked && clicked.error) ||
             '[사진등록] 단추를 찾지 못했습니다. 카인포 창에서 점검내역을 열어 두고 다시 해 주세요.' };
  }

  for (let i = 0; i < 40; i++) {
    pop = await ready();
    if (pop) return { ok: true, win: pop };
    await sleep(300);
  }
  return { ok: false, error: '[사진등록] 을 눌렀지만 사진 창이 뜨지 않았습니다.' };
}

/** 카인포 사진 팝업에 8칸을 채운다 */
async function sendCarinfoPhotos(win, data) {
  const jobs = CI_PHOTO_SLOTS.filter((s) => String(data[s.key] || '').trim());
  if (!jobs.length) return { filled: [], missing: [] };

  const filled = [];
  const missing = [];
  for (const j of jobs) {
    if (!fs.existsSync(data[j.key])) {
      missing.push(j.label + ' : 사진 파일이 그 자리에 없습니다 → ' + data[j.key]);
      j.skip = true;
    }
  }

  const pop = await openCarinfoPhotoPopup(win);
  if (!pop.ok) return { filled, missing: missing.concat(['사진: ' + pop.error]) };

  await withFileChooser(pop.win, async (box, dbg) => {
    for (const j of jobs) {
      if (j.skip) continue;
      try {
        const r = await putPhoto(pop.win, j.which, data[j.key], j.label, box, dbg, 1500); // 카인포는 「수정되었습니다」 창이 뜬다
        (r.ok ? filled : missing).push(r.note);
      } catch (err) {
        missing.push(j.label + ' : ' + err.message);
      }
    }
  });

  try {
    const rs = await runScript(pop.win, cmPhoto.PHOTO_RESTORE_EXPR, 8000, '사진 뒷정리');
    cmPhoto.restoreAlerts(rs).forEach((m) => missing.push('사이트 안내(사진): ' + m));
  } catch {}
  return { filled, missing };
}

/*  사진만 따로 보내기 — 전체 전송을 다시 돌리지 않고 사진만 시험할 수 있게.
 *  사이트 화면이 조금씩 달라 사진 자리를 맞추는 데 여러 번 시도가 필요하다. */
/**
 * 카인포 고객정보의 딜러를 바꾼다.
 *
 *  딜러명만 바꾸면 안 된다 — 매매상사·연락처가 옛 딜러 것으로 남는다.
 *  사람이 하는 순서 그대로: [검색] → 이름 넣고 [검색] → 그 줄 [선택] → 알림 [확인].
 *  바뀐 값(매매상사·연락처)은 앱으로 돌려주어 경기조합에도 같은 값이 쓰이게 한다.
 */
ipcMain.handle('dealer:carinfo', async (_e, arg) => {
  { const b = legacyBlock('carinfo'); if (b) return { ok: false, error: b }; }   // 흐름 중 우회 막기
  const name = String((arg && arg.name) || '').trim();
  const chosen = arg && arg.row;
  if (!name) return { ok: false, error: '딜러명을 먼저 입력해 주세요.' };

  const win = windows.carinfo;
  if (!win || win.isDestroyed()) return { ok: false, error: '카인포 창이 열려 있지 않습니다.' };

  try {
    await waitReady(win);

    /*  성능점검 상세를 열지 않는다.
     *  딜러를 바꾸려고 눌렀는데 상세 화면이 함께 떠서 검색 창을 통째로 가려 버렸다.
     *  고객정보의 [검색] 은 지금 화면에서 바로 누를 수 있다.
     *
     *  고객정보가 실제로 보이는 창을 쓴다 — 딴 팝업이 떠 있으면 거기엔 [검색] 이 없다. */
    let base = win;
    for (const w of [win, sitePopup('carinfo')]) {
      if (!w || w.isDestroyed()) continue;
      try {
        const c = await runScript(w, ciDealer.CI_CUSTOMER_EXPR, 5000, '고객정보 찾기');
        if (c && (c.dealerName !== null || c.sangsaName !== null)) { base = w; break; }
      } catch {}
    }

    /*  검색 창은 팝업으로도, 화면 위 조각으로도 뜬다. 둘 다 본다.
     *  이미 떠 있으면 다시 열지 않는다 (두 번 열면 화면이 꼬인다). */
    const searchTarget = async (loose) => {
      const expr = loose ? ciDealer.CI_DEALER_POPUP_LOOSE_EXPR : ciDealer.CI_DEALER_POPUP_EXPR;
      for (const w of [sitePopup('carinfo'), base, win]) {
        if (!w || w.isDestroyed()) continue;
        try {
          if (await probe(w, expr)) return w;
        } catch {}
      }
      return null;
    };

    let target = await searchTarget();
    if (!target) {
      const before = sitePopup('carinfo');
      let opened = await runScript(base, ciDealer.CI_OPEN_DEALER_SEARCH_EXPR, 15000, '딜러 검색 열기');

      /*  지금 화면에 고객정보가 없을 때만 성능점검 상세를 연다.
       *  먼저 열어 두면 그 화면이 검색 창을 덮어 버린다 — 열어야 할 때만 연다. */
      if (!opened || !opened.ok) {
        const detail = await ensureCarinfoDetail(win);
        if (detail && detail.ok) {
          base = (detail.win && !detail.win.isDestroyed() && detail.win) || base;
          await sleep(400);
          const again = await searchTarget();
          if (again) target = again;
          else opened = await runScript(base, ciDealer.CI_OPEN_DEALER_SEARCH_EXPR, 15000, '딜러 검색 열기');
        }
      }
      if (!target && (!opened || !opened.ok)) {
        return { ok: false, error: (opened && opened.error) ||
                 '고객정보의 [검색] 을 찾지 못했습니다. 카인포 창에서 점검내역을 열어 두고 다시 해 주세요.' };
      }
      /*  [검색] 을 눌러 놓고 기다리는 중이다.
       *  얼마간 기다려도 안 보이면, 다른 화면에 덮인 것일 수 있으니 느슨하게도 본다. */
      for (let i = 0; i < 30; i++) {
        target = (await searchTarget(i >= 8)) || (await waitForNewPopup('carinfo', before, 300));
        if (target) break;
        await sleep(250);
      }
      if (!target) return { ok: false, error: '[검색] 을 눌렀지만 매매상사/딜러 검색 창이 뜨지 않았습니다.' };
    }

    //  고른 줄이 있으면 그것을 누르고 끝낸다
    if (chosen !== undefined && chosen !== null) {
      const r = await runScript(target, ciDealer.buildCiDealerPickScript(chosen), 15000, '딜러 고르기');
      if (!r || !r.ok) return { ok: false, error: (r && r.error) || '고른 줄을 누르지 못했습니다.' };
      await sleep(600);
      let now = null;
      try { now = await runScript(base, ciDealer.CI_CUSTOMER_EXPR, 8000, '고객정보 확인'); } catch {}
      return { ok: true, state: now, confirmed: r.confirmed };
    }

    /*  창이 다 뜰 때까지 기다렸다가 이름을 넣는다.
     *  뜨는 도중에 넣으면 목록이 다시 그려지며 그 이름을 지워 버려,
     *  빈 칸으로 검색이 돌아 「데이터가 없습니다」 로 끝났다. */
    for (let i = 0; i < 24; i++) {
      if (await probe(target, ciDealer.CI_DEALER_READY_EXPR)) break;
      await sleep(250);
    }

    let typed = await runScript(target, ciDealer.buildCiDealerSearchScript(name), 20000, '딜러 찾기');
    //  그래도 지워졌다면 한 번 더 — 이때는 창이 확실히 자리를 잡은 뒤다
    if (!typed || !typed.ok) {
      await sleep(800);
      typed = await runScript(target, ciDealer.buildCiDealerSearchScript(name), 20000, '딜러 찾기');
    }
    if (!typed || !typed.ok) return { ok: false, error: (typed && typed.error) || '검색하지 못했습니다.' };

    let list = null;
    for (let i = 0; i < 24; i++) {
      try {
        list = await runScript(target, ciDealer.buildCiDealerListScript(name), 8000, '목록 읽기');
      } catch {}
      if (list && list.ok && list.rows && list.rows.length) break;
      await sleep(250);
    }
    if (!list || !list.ok || !list.rows || !list.rows.length) {
      /*  왜 비었는지는 화면 생김새를 봐야 안다.
       *  검색이 안 돌았는지, 결과가 다른 상자·조각에 그려졌는지 그대로 적어 온다. */
      let diag = null;
      try { diag = await runScript(target, ciDealer.CI_DEALER_DIAG_EXPR, 8000, '딜러 검색 진단'); } catch {}
      const line = (k, v) => (v === undefined || v === null || v === '' ||
                              (Array.isArray(v) && !v.length) ? '' : '\n   ' + k + ': ' +
                              (Array.isArray(v) ? v.join('\n      ') : String(v)));
      return {
        ok: false,
        error: '「' + name + '」 목록이 뜨지 않았습니다.' +
               '\n   넣은 곳: ' + (typed.pressed || '?') +
               '\n   칸에 남은 값: 「' + String(typed['남은값'] === undefined ? '?' : typed['남은값']) + '」' +
               (typed['다시넣음'] > 1 ? ' (' + typed['다시넣음'] + '번 만에 남음)' : '') +
               (diag
                 ? line('주소', String(diag['주소'] || '').split('/').pop()) +
                   line('찾은 상자', diag['찾은상자']) +
                   line('보이는 이름표', diag['보이는이름표']) +
                   line('상자 안 칸', diag['상자안칸']) +
                   line('상자 안 줄 수', diag['상자안tr'] + ' / 화면 전체 ' + diag['화면전체tr'] +
                        ' (번호 있는 줄 ' + diag['번호있는줄'] + ')') +
                   line('줄 맛보기', diag['줄맛보기']) +
                   line('조각', diag['조각']) +
                   line('상자 후보', diag['상자후보']) +
                   line('안내글', diag['안내글']) +
                   line('상자 안 글자', String(diag['상자안글자'] || '').slice(0, 200))
                 : (list && list['글자'] ? '\n   화면 글자: ' + String(list['글자']).slice(0, 160) : '')),
        diag,
      };
    }

    //  딜러명이 정확히 같은 줄만 남긴다. 하나면 앱이 고르고, 여럿이면 사람이 고른다.
    const only = (s) => String(s || '').replace(/[\s-]/g, '');
    const hit = list.rows.filter((r) => only((r.by || {})['딜러명']) === only(name));
    const rows = hit.length ? hit : list.rows;

    if (rows.length === 1) {
      const r = await runScript(target, ciDealer.buildCiDealerPickScript(rows[0].i), 15000, '딜러 고르기');
      if (r && r.ok) {
        await sleep(600);
        let now = null;
        try { now = await runScript(base, ciDealer.CI_CUSTOMER_EXPR, 8000, '고객정보 확인'); } catch {}
        return { ok: true, state: now, picked: rows[0].by, confirmed: r.confirmed };
      }
    }
    return { ok: false, needPick: true, rows };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/*  팝업 진단 — "크롬에서는 되는데 앱에서만 안 된다" 를 눈으로 확인한다.
 *
 *  사원선택 같은 팝업은 고른 값을 부모 창에 직접 써 넣는다(window.opener).
 *  그 통로가 막혀 있으면 팝업에서 아무리 눌러도 부모 화면은 그대로다.
 *  여기서 그 통로가 살아 있는지, 팝업에 어떤 오류가 났는지 그대로 본다.
 */
ipcMain.handle('popup:diag', async (_e, id0) => {
  const id = id0 || 'carmodoo';
  const win = windows[id];
  const pop = sitePopup(id);
  if (!win || win.isDestroyed()) return { ok: false, error: (SITES[id] || {}).name + ' 창이 열려 있지 않습니다.' };

  const out = { ok: true, logs: (popupLogs[id] || []).slice(-20) };
  out.popupOpen = !!pop;
  if (!pop) {
    out.note = '지금 열려 있는 팝업이 없습니다. 조합 창에서 딜러명을 넣고 엔터를 쳐 ' +
               '사원선택 창을 띄운 뒤 다시 눌러 주세요.';
    return out;
  }

  try {
    out.url = pop.webContents.getURL();
    out.check = await runScript(pop, `(function () {
      var r = { opener있나: !!window.opener, 부모읽기: null, 부모함수: null, 표: null };
      try { r.부모읽기 = window.opener ? String(window.opener.document.title || '(제목없음)') : '창이 없음'; }
      catch (e) { r.부모읽기 = '막힘: ' + e.message; }
      try {
        r.부모함수 = window.opener && typeof window.opener.getDealerInfo === 'function'
          ? 'getDealerInfo 있음' : '없음';
      } catch (e) { r.부모함수 = '막힘: ' + e.message; }
      try {
        var t = Array.prototype.slice.call(document.querySelectorAll('table'))
          .map(function (x) { return String(x.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60); });
        r.표 = t.slice(0, 5);
      } catch (e) {}
      r.주소 = location.href;
      return r;
    })()`, 10000, '팝업 살피기');
  } catch (err) {
    out.error = err.message;
  }
  return out;
});

/*  딜러만 따로 골라 보기 — 전체 전송을 다시 돌리지 않고 이 단계만 시험할 수 있게 */
ipcMain.handle('dealer:pick', async (_e, arg) => {
  { const b = legacyBlock('carmodoo'); if (b) return { ok: false, error: b }; }   // 흐름 중 우회 막기
  const name = typeof arg === 'string' ? arg : (arg && arg.name);
  const chosen = arg && typeof arg === 'object' ? arg.row : undefined;
  const win = windows.carmodoo;
  if (!win || win.isDestroyed()) return { ok: false, error: '경기조합 창이 열려 있지 않습니다.' };
  try {
    await waitReady(win);
    //  등록 화면을 사이트 방식으로 띄운 뒤(이미 떠 있으면 그대로) 고른다
    const form = await ensureCarmodooForm(win);
    if (!form.ok) return { ok: false, error: form.error };
    return await pickCarmodooDealer(win, name, chosen, arg && arg.match, form.frame);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('photo:send', async (_e, { id, data }) => {
  { const b = legacyBlock(id); if (b) return { ok: false, error: b }; }   // 흐름 중 우회 막기
  const site = SITES[id];
  if (!site) return { ok: false, error: '알 수 없는 사이트입니다.' };
  const win = siteWindow(id, 'auto');
  await waitReady(win);
  if (!isOnSite(win, site)) return { ok: false, error: site.name + ' 화면이 열려 있지 않습니다.' };

  try {
    const r = id === 'carmodoo'
      ? await sendCarmodooPhotos(win, data || {})
      : await sendCarinfoPhotos(win, data || {});
    return { ok: true, ...r };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/*  사진 화면 구조 조사 — 자리를 못 찾을 때 무엇이 있는지 그대로 본다.
 *  값은 바꾸지 않는다. */
ipcMain.handle('photo:probe', async (_e, id0) => {
  const id = id0 || 'carmodoo';
  const site = SITES[id];
  const win = windows[id];
  if (!win || win.isDestroyed()) return { ok: false, error: (site ? site.name : '') + ' 창이 열려 있지 않습니다.' };
  try {
    await waitReady(win);

    //  살펴볼 창 — 조합은 사진 탭, 카인포는 사진 팝업
    let look = win;
    let tab;
    if (id === 'carinfo') {
      const pop = await openCarinfoPhotoPopup(win);
      if (!pop.ok) return { ok: false, error: pop.error };
      look = pop.win;
      tab = { ok: true, how: '사진 팝업' };
    } else {
      tab = await runScript(win, cmPhoto.PHOTO_TAB_EXPR, 15000, '사진 탭 열기');
    }
    await sleep(600);
    const seen = await runScript(look, cmPhoto.buildPhotoProbeScript(), 20000, '사진 화면 살피기');
    const file = userFile('photo-probe.json');
    fs.writeFileSync(file, JSON.stringify({ tab, seen }, null, 2), 'utf8');
    return { ok: true, tab, seen, file };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/* ── 자동차 사진 ─────────────────────────────────────────────────────
 *
 *  앱은 사진 파일을 복사해 두지 않는다. 고른 파일의 "전체 경로" 만 기억한다.
 *  나중에 두 사이트에 올릴 때 그 경로 그대로 파일 선택칸에 넣어야 하기 때문이다.
 *  (사진을 어딘가로 옮기거나 지우면 전송할 때 없다고 알려 준다)
 */
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

ipcMain.handle('photo:pick', async (_e, opts) => {
  const many = !!(opts && opts.many);
  const r = await dialog.showOpenDialog(windows.main, {
    title: (opts && opts.title) || '사진 고르기',
    properties: many ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [{ name: '사진', extensions: IMAGE_EXT }, { name: '모든 파일', extensions: ['*'] }],
  });
  if (r.canceled) return { ok: true, files: [] };
  return { ok: true, files: r.filePaths };
});

/** 그 사진이 아직 그 자리에 있는지 (크기도 함께 알려 준다) */
ipcMain.handle('photo:check', (_e, files) => {
  const out = {};
  (Array.isArray(files) ? files : []).forEach((p) => {
    if (!p) return;
    try {
      const st = fs.statSync(p);
      out[p] = { ok: st.isFile(), size: st.size };
    } catch {
      out[p] = { ok: false, size: 0 };
    }
  });
  return out;
});

/** 고른 사진을 기본 뷰어로 열어 본다 */
ipcMain.handle('photo:open', async (_e, file) => {
  if (!file) return { ok: false, error: '사진이 없습니다.' };
  const err = await shell.openPath(String(file));
  return err ? { ok: false, error: err } : { ok: true };
});

ipcMain.handle('record:list', () => {
  const file = userFile('records.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .reverse()
    .slice(0, 100);
});

/**
 * 사고체크 화면 구조 조사.
 *
 *  두 사이트의 절개도 조작 방식이 서로 달라(경기조합=클릭 후 팝업, 카인포=부호 먼저
 *  고르고 클릭) 자동화하려면 그림 위 클릭 대상이 무엇인지 알아야 한다.
 *  로그인이 필요한 화면이라 밖에서는 볼 수 없으므로, 열려 있는 창 안에서 훑어
 *  파일로 남긴다. 값은 바꾸지 않고 읽기만 한다.
 */
ipcMain.handle('accident:probe', async () => {
  const done = [];
  const failed = [];

  for (const id of ['carmodoo', 'carinfo']) {
    const win = windows[id];
    if (!win || win.isDestroyed()) {
      failed.push(SITES[id].name + ' : 창이 열려 있지 않습니다');
      continue;
    }
    try {
      await waitReady(win);
      const data = await runScript(win, buildProbeScript(SITES[id].key), 30000, '구조 조사');
      done.push({ id, data });
    } catch (err) {
      failed.push(SITES[id].name + ' : ' + err.message);
    }
  }

  if (!done.length) return { ok: false, error: failed.join('\n') };

  const file = userFile('accident-probe.json');
  fs.writeFileSync(file, JSON.stringify(done, null, 2), 'utf8');
  return {
    ok: true,
    file,
    summary: done.map((d) => SITES[d.id].name + ' → ' +
      Object.entries(d.data.counts).map(([k, v]) => k + ' ' + v).join(', ')),
    failed,
  };
});

/**
 * 카인포 절개도 학습 — 점(part-NN)이 어느 부위인지 사이트에 직접 물어본다.
 *
 *  카인포는 부위 체크박스가 잠겨 있어 절개도의 점을 눌러야만 값이 들어간다.
 *  그런데 점의 내부 번호가 몇 번 부위인지 화면에 적혀 있지 않아(번호가 그림에 그려져 있다)
 *  점을 하나씩 눌러 보고 어떤 칸이 켜지는지로 짝을 맞춘다. 끝나면 전체삭제로 되돌린다.
 */
ipcMain.handle('carinfo:learn', async () => {
  const win = windows.carinfo;
  if (!win || win.isDestroyed()) return { ok: false, error: '카인포 창이 열려 있지 않습니다.' };
  try {
    await waitReady(win);
    //  부호(교환·부식·판금·흠집·요철·손상)마다 점이 다르므로 여섯 번 훑는다.
    //  점이 많으면 3분을 넘길 수 있어 넉넉히 잡는다.
    const r = await runScript(win, buildLearnScript(), 420000, '절개도 학습');
    if (!r || !r.ok) return r || { ok: false, error: '알 수 없는 오류' };
    /*  이전에 알아낸 것을 지우지 않는다.
     *
     *  절개도 아래쪽이 화면 밖에 있으면 그 점들은 이번 학습에서 안 잡힌다.
     *  그때 통째로 덮어쓰면 지난번에 알아낸 것까지 잃는다.
     *  그래서 새로 알아낸 것만 얹고, 이번에 못 본 것은 그대로 둔다. */
    const file = userFile('carinfo-parts.json');
    let raw = {};
    try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    //  예전 파일은 점 목록이 곧 최상위였다. 새 파일은 부호별 목록도 함께 담는다.
    const prev = raw && raw.dots ? raw.dots : raw;

    const merged = { ...prev };
    let added = 0;
    let kept = 0;
    Object.entries(r.map || {}).forEach(([k, v]) => {
      if (!v) return;
      if (v.box) { if (!merged[k] || !merged[k].box) added++; merged[k] = v; return; }
      /*  부위를 못 알아낸 점이라도 "어떤 부호를 받는지(codes)" 와 class 는 새 값이 맞다.
       *  예전에는 통째로 버려서, 지난번 결과가 있는 점은 부호 정보가 영영 비어 있었다.
       *  (필러패널 A·B·C 가 그래서 부호를 모른 채 남았다) */
      const old = merged[k];
      if (!old) { merged[k] = v; return; }
      merged[k] = Object.assign({}, old, {
        codes: v.codes && v.codes.length ? v.codes : old.codes,
        cls: v.cls || old.cls,
        rect: v.rect || old.rect,
      });
    });
    Object.keys(prev).forEach((k) => { if (prev[k] && prev[k].box && !(r.map || {})[k]) kept++; });

    const byCode = { ...(raw.byCode || {}), ...(r.byCode || {}) };
    fs.writeFileSync(file, JSON.stringify({ version: 2, dots: merged, byCode }, null, 2), 'utf8');

    const known = Object.values(merged).filter((v) => v && v.box).length;
    const log = (r.log || []).concat(
      kept ? ['이번에 안 보인 ' + kept + '곳은 지난 결과를 그대로 유지했습니다'] : []
    );
    return { ...r, file, log, known, total: Object.keys(merged).length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/* ─────────────────── 자동 로그인 ───────────────────
 *
 *  설계 문서 D4 는 원래 "비밀번호를 프로그램이 저장하지 않는다" 였다.
 *  사용자 요청으로 자동 로그인을 넣으면서 그 결정을 바꾸되, 평문으로는 두지 않는다.
 *  safeStorage(윈도우 DPAPI)로 암호화해 이 PC의 이 계정에서만 풀리게 한다.
 *
 *  비밀번호는 화면으로 돌려주지 않고, 기록이나 결과창에도 남기지 않는다.
 */
const credFile = () => userFile('credentials.json');

/** 저장 여부만 알려준다 (비밀번호 자체는 나가지 않는다) */
ipcMain.handle('creds:get', () => ({
  available: safeStorage.isEncryptionAvailable(),
  creds: creds.summary(credFile()),
}));

ipcMain.handle('creds:set', (_e, patch) => creds.save(credFile(), patch, safeStorage));

/**
 * 로그인 화면이면 저장해 둔 값으로 로그인한다.
 * 저장된 것이 없거나 로그인 화면이 아니면 아무것도 하지 않는다.
 */
async function autoLogin(win, id) {
  if (!(await probe(win, LOGIN_PAGE_EXPR))) return { ok: true, skipped: '로그인 화면 아님' };

  //  비밀번호는 진짜 그 사이트(https · 같은 주소)의 로그인 화면에만 넣는다.
  //  다른 주소의 로그인 칸에는 절대 넣지 않는다.
  let here = '';
  try { here = win.webContents.getURL(); } catch {}
  if (!SITES[id] || !safety.isSiteUrl(here, SITES[id].home)) {
    return { ok: false, error: '지금 화면이 ' + ((SITES[id] && SITES[id].name) || id) +
             ' 주소가 아니어서 자동 로그인을 하지 않았습니다. 창에서 직접 확인해 주세요.' };
  }

  const c = creds.load(credFile(), id, safeStorage);
  if (!c) return { ok: false, error: '저장된 로그인 정보가 없습니다. 설정에서 아이디와 비밀번호를 넣어 주세요.' };

  let r;
  try {
    r = await runScript(win, buildLoginScript(c.id, c.pw), 20000, '자동 로그인');
  } catch (err) {
    return { ok: false, error: err.message };
  }
  if (!r || !r.ok) return { ok: false, error: (r && r.error) || '로그인 화면을 다루지 못했습니다.' };

  //  로그인 뒤 화면이 바뀔 시간을 준다
  await waitReady(win, 15000);
  for (let i = 0; i < 40; i++) {
    if (!(await probe(win, LOGIN_PAGE_EXPR))) return { ok: true, step: r.step };
    await sleep(250);
  }
  return { ok: false, error: '로그인을 시도했지만 로그인 화면이 그대로입니다. 아이디·비밀번호를 확인해 주세요.' };
}

ipcMain.handle('site:login', async (_e, id) => {
  const cfg = SITES[id];
  if (!cfg) return { ok: false, error: '알 수 없는 사이트입니다: ' + id };
  const win = siteWindow(id, 'auto');
  await waitReady(win);
  //  화면 자체가 안 떴으면 로그인을 시도해 봐야 소용이 없다
  if (!isOnSite(win, cfg)) return { ok: false, error: cfg.name + ' 화면이 아직 열리지 않았습니다.' };
  return autoLogin(win, id);
});

/* ================================================================
 *  등록 흐름 (카인포 → 카모두 → 엔트리) — 2026-10-19 연결
 * ----------------------------------------------------------------
 *  ⚠ 기본은 꺼져 있다(config.json 의 "flow": true 일 때만). 지금 쓰는 단추·기능은 그대로.
 *  ⚠ 실제 전산 설정(src/sites/site-config.js REAL)이 확정되기 전에는 흐름이 저장을 허락하지 않는다
 *     — 값 넣기·목록 읽기까지만 되고 [저장해도 돼요]는 «통제 범위 미확정»으로 거절된다.
 *  공통 기능(src/core)과 가온 내부용 전산 연결(src/sites)은 나눠 둔다.
 * ================================================================ */
const { createJobLog, pcTag } = require('./src/core/job-log');
const { createAdminAuth } = require('./src/core/admin-auth');
const { createRegisterFlow } = require('./src/core/register-flow');
const { createElectronAdapters } = require('./src/sites/flow-adapters');
const siteConfig = require('./src/sites/site-config');

let flowCtx = null;

/**
 * 흐름의 값 넣기 = 기존 전송(sendToSite) 그대로 — 입력 화면의 같은 자료(121칸)를 쓴다.
 *  사진은 여기서 보내지 않는다(7차) — 흐름의 «사진 올리기» 단계(flowPhotos)가 전산 설정(photoPhase)대로 따로 올린다.
 */
async function flowSend(site, data) {
  const r = await sendToSite(site, noPhotos(data));
  if (r && r.needDealerPick) return { needDealerPick: true, rows: r.rows || [], filled: [], missing: [] };
  if (!r || !r.ok) return { filled: [], missing: [(r && r.error) || '전송 실패'] };
  return r;
}

/**
 * 흐름의 사진 올리기(7차) = 기존 사진 올리기(sendCarinfoPhotos · sendCarmodooPhotos) 그대로, 고른 칸만.
 *  돌려줌 { done:[photo1…], missing[] } — 성공 문구(«1. 전면사진 → 앞면»)로 올라간 칸을 가린다.
 */
async function flowPhotos(site, data, opts) {
  const only = new Set((opts && opts.only) || []);
  const pick = {};
  Object.keys(data || {}).forEach((k) => { if (only.has(k)) pick[k] = data[k]; });
  const win = siteWindow(site, 'auto');
  await waitReady(win);
  const r = site === 'carmodoo' ? await sendCarmodooPhotos(win, pick) : await sendCarinfoPhotos(win, pick);
  const done = [...only].filter((k) => (r.filled || []).some((n) => String(n).startsWith(k.replace('photo', '') + '. ') && String(n).includes(' → ')));
  return { done, missing: r.missing || [] };
}

/** 사진 칸(photo1~8) 뺀 값 */
function noPhotos(data) {
  const out = {};
  Object.keys(data || {}).forEach((k) => { if (!/^photo\d+$/.test(k)) out[k] = data[k]; });
  return out;
}

/** 흐름 작업이 그 전산을 쓰는 중이면 기존 단추를 막는다(통제기 우회 방지) — 흐름이 꺼져 있으면 언제나 null */
function legacyBlock(site) {
  //  진단 중인 전산은 기존 단추(전송·신규등록·사진 등)도 막는다 — 요청이 서버로 안 가는데 된 것처럼 보이지 않게(8차 화면 검사)
  //  (12차) «관찰 기록»은 막지 않으므로 기존 단추(전송·신규등록·사진)를 평소처럼 쓴다
  if (typeof diagState !== 'undefined' && diagState[site] && !diagState[site].observe) return '이 전산은 지금 진단 중이에요. [진단 끝]을 누른 뒤 다시 해 주세요.';
  if (loadConfig().flow !== true) return null;
  try { return flow().flow.legacyBlocked(site); } catch { return null; }
}

function flow() {
  if (loadConfig().flow !== true) throw new Error('등록 흐름이 꺼져 있습니다(설정 flow).');
  if (Object.keys(diagState).length) throw new Error('전산 진단 중에는 자동 등록을 하지 않아요. [진단 끝]을 누른 뒤 다시 해 주세요.');
  if (flowCtx) return flowCtx;
  const os = require('os');
  const admin = createAdminAuth(userFile('admin.json'));
  const jobLog = createJobLog(userFile('jobs-' + pcTag(os.hostname()) + '.jsonl'), { admin, office: loadConfig().office || 'gaon' });
  const C = JSON.parse(JSON.stringify(siteConfig.REAL));                 // 설정 복사(아래에서 엔트리 주소만 채움)
  //  엔트리 주소는 대표님이 진단 창에 넣은 주소(entryUrl)에서 가져온다(설정 파일에 고정하지 않음)
  if (!(C.entry.hosts || []).length) { try { C.entry.hosts = [new URL(String(loadConfig().entryUrl || '')).host].filter(Boolean); } catch {} }
  const adapters = createElectronAdapters({
    config: C,
    //  엔트리 창은 지금 진단 창의 [엔트리 창 열기]로만 열린다 — 열려 있으면 그 창을 씀(연결 모듈 설정이 비어 있으면 어차피 «미구현»)
    getWindow: (s) => (s === 'entry' ? (windows.entry && !windows.entry.isDestroyed() ? windows.entry : null) : siteWindow(s, 'auto')),
    fillFns: {
      //  사진: 그 전산의 사진 올리기 주소(site-config fillAllow)가 정해졌을 때만 같이 보낸다 — 아니면 통제기가 막으므로 빼고 알림
      carinfo: async (data) => flowSend('carinfo', data),
      carmodoo: async (data) => flowSend('carmodoo', data),
      entry: async () => ({ filled: [], missing: ['엔트리 연결 모듈이 아직 없습니다(10/19 화면 확인 뒤)'] }),
    },
    photoFns: { carinfo: (data, o) => flowPhotos('carinfo', data, o), carmodoo: (data, o) => flowPhotos('carmodoo', data, o) },
    //  카인포 신규등록 — 입력 화면 [신규등록] 단추와 같은 기능. 딜러를 골라야 하면 needPick·candidates 를 그대로 돌려준다
    prepareFn: (data) => prepareCarinfo({ carNo: data.carNo, dealer: data.dealerName, pickKey: data.ciPickKey,
                                          tradePersonal: String(data.tradeType || '0') === '1', clientName: data.clientName, hp: data.dealerHp }),
  });
  const siteConfirmed = { carinfo: C.carinfo.confirmed, carmodoo: C.carmodoo.confirmed, entry: C.entry.confirmed };
  flowCtx = { admin, jobLog, adapters, flow: createRegisterFlow({ jobLog, adapters, siteConfirmed }) };
  return flowCtx;
}

/** 흐름 IPC 공통 — 오류는 쉬운 말 한 줄로 돌려준다 */
const flowCall = (fn) => async (_e, arg) => {
  try { return await fn(arg || {}); } catch (e) { return { ok: false, error: e.message }; }
};
ipcMain.handle('flow:start', flowCall((a) => flow().flow.start({ carNo: a.carNo, vin: a.vin })));
ipcMain.handle('flow:entryPrecheck', flowCall((a) => flow().flow.entryPrecheck(a.jobId)));
ipcMain.handle('flow:fill', flowCall((a) => flow().flow.fill(a.jobId, a.site, a.data || {})));
ipcMain.handle('flow:allowSave', flowCall((a) => flow().flow.allowSave(a.jobId, a.site, { partialConfirmedBy: a.partialConfirmedBy })));
ipcMain.handle('flow:afterSave', flowCall((a) => flow().flow.afterSave(a.jobId, a.site)));
ipcMain.handle('flow:confirmFromList', flowCall((a) => flow().flow.confirmFromList(a.jobId, a.site, { partialConfirmedBy: a.partialConfirmedBy })));
ipcMain.handle('flow:resolve', flowCall((a) => { flow().jobLog.resolve(a.jobId, a.site, a.outcome, { by: a.by }); return { ok: true }; }));
ipcMain.handle('flow:finish', flowCall((a) => flow().flow.finish(a.jobId)));
ipcMain.handle('flow:resume', flowCall(() => ({ ok: true, ...flow().flow.resume() })));
/*  한 번에 끝까지(대표님 10/19 최종 지시) — 정상이면 사람 조작 없이 세 전산 등록·검증. 진행은 'flow:progress' 로 알림.
 *  arg: { carNo, vin, data } 새 작업 · { jobId, data } 이어 하기 */
/*  엔트리 인증 만료(약 30분) — 끊기면 자동 등록을 잠시 멈추고 직원 문자 재인증을 기다린다(최대 15분, 3초마다 화면 글자만 확인 · 서버 요청 없음).
 *  확인되면 끝난 단계는 건너뛰고 이어 간다. [기다리기 그만]이면 멈춤 → 나중에 [이어 하기] */
let flowWaitStop = false;
ipcMain.handle('flow:stopWait', () => { flowWaitStop = true; return { ok: true }; });
ipcMain.handle('flow:runAll', flowCall((a) => { flowWaitStop = false; return flow().flow.runAll(
  { jobId: a.jobId, carNo: a.carNo, vin: a.vin, data: a.data || {} },
  { onStep: (info) => { try { if (info.loginBack && windows.main && !windows.main.isDestroyed()) windows.main.flashFrame(false); windows.main && !windows.main.isDestroyed() && windows.main.webContents.send('flow:progress', info); } catch {} },
    loginWaitMs: 15 * 60 * 1000, loginPollMs: 3000, shouldStop: () => flowWaitStop,
    //  직원이 바로 인증할 수 있게 엔트리 창을 앞으로(로그인·인증은 직원이 직접 — 프로그램은 넣지 않음)
    onNeedLogin: () => { flowWaitStop = false; try { const w = windows.entry; if (w && !w.isDestroyed()) { w.show(); w.focus(); } if (windows.main && !windows.main.isDestroyed()) windows.main.flashFrame(true); } catch {} } }); }));
//  관리자 — PIN 은 화면에서 받아 여기(메인)에서만 확인하고, 확인 표는 화면으로 내보내지 않는다
ipcMain.handle('admin:isSet', flowCall(() => ({ ok: true, set: flow().admin.isSet() })));
ipcMain.handle('admin:setPin', flowCall((a) => { flow().admin.setPin(a.pin, a.currentPin); return { ok: true }; }));
ipcMain.handle('flow:forceClose', flowCall((a) => {
  const ctx = flow();
  const v = ctx.admin.verify(a.by, a.pin);
  if (!v.ok) return v;
  ctx.jobLog.forceClose(a.jobId, { ticket: v.ticket, reason: a.reason, confirm: a.confirm });
  return { ok: true };
}));
ipcMain.handle('flow:releaseAfterForce', flowCall((a) => {
  const ctx = flow();
  const v = ctx.admin.verify(a.by, a.pin);
  if (!v.ok) return v;
  ctx.jobLog.releaseAfterForce(a.jobId, { ticket: v.ticket, checkedAt: a.checkedAt, reason: a.reason });
  return { ok: true };
}));

/* ─────────── 전산 진단 (8차 · 검수 보완 · 설정 diagnose:true 일 때만) ───────────
 *  실제 전산 화면에서 «무엇을 누르면 어느 주소로 무슨 칸 이름이 가는지»와 화면 구조를 기록한다.
 *  진단 중에는 그 전산 세션 전체(본 창·팝업·iframe)에서 «안전한 조회»만 나간다 — 두 겹 막기(src/sites/diag-session.js).
 *  막는 장치가 붙지 않은 창이 생기면 진단을 중단한다. 파일에 쓰기 전에 개인정보를 가리고 다시 검사해, 남아 있으면 파일을 만들지 않는다.
 *  로그인(문자 인증)은 진단 «전»에 사람이 한다 — 진단 중에는 로그인 요청도 막히므로. */
const { createDiagRecorder, ELEMENTS_EXPR, pageExpr, maskDiag, checkDiag, endpointsOf } = require('./src/sites/diag-recorder');
const { startDiagSession, loadedScripts } = require('./src/sites/diag-session');
const diagState = {};                                    // site → { rec, ds, win, snaps, startedAt }

/** 엔트리 창 — 기존 프로그램에는 엔트리 창이 없어 진단 때만 연다(주소는 설정 entryUrl). 로그인용으로 먼저 연다(막기 없음) */
function diagEntryWindow(open) {
  if (windows.entry && !windows.entry.isDestroyed()) { if (open) windows.entry.show(); return windows.entry; }
  if (!open) return null;
  const url = String(loadConfig().entryUrl || '').trim();
  if (!/^https:\/\//.test(url)) throw new Error('엔트리 주소가 아직 설정에 없어요. 진단 창의 «엔트리 주소» 칸에 넣어 주세요.');
  const win = new BrowserWindow({ width: 1300, height: 900, title: '엔트리 (진단용)', webPreferences: { partition: 'persist:entry', contextIsolation: true, nodeIntegration: false } });
  try { win.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false)); } catch {}
  win.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));      // 팝업은 같은 세션의 진짜 창으로 — 두 겹 막기가 다 걸림
  win.loadURL(url).catch(() => {});
  windows.entry = win;
  return win;
}
function diagHosts(site) {
  if (site === 'entry') { try { return [new URL(String(loadConfig().entryUrl || '')).host]; } catch { return []; } }
  return (siteConfig.REAL[site] || {}).hosts || [];
}

async function diagSnap(d) {
  const wins = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && w !== windows.main && w.webContents.session === d.ses);
  const frames = [];
  const expr = pageExpr({ includeCode: loadConfig().diagScripts === true });     // 코드 파일 내용은 기본으로 받지 않음
  for (const w of wins) {
    let list = [];
    try { list = [w.webContents.mainFrame].concat((w.webContents.mainFrame.framesInSubtree || []).filter((f) => f !== w.webContents.mainFrame)); } catch {}
    for (const f of list) {
      try {
        const el = await f.executeJavaScript(ELEMENTS_EXPR, true);
        try { el.page = await f.executeJavaScript(expr, true); } catch (e) { el.page = { error: String((e && e.message) || e) }; }
        frames.push(el);
      } catch {}
    }
  }
  //  (9차) 사이트 코드 — 설정 diagScripts:true 일 때만(기본 꺼짐). 네트워크로 받지 않고 «이미 불러와 메모리에 있는 코드»를 읽음(요청 0건)
  //  (10차) 코드 원본은 파일에 남기지 않는다 — 코드 안의 «주소처럼 보이는 글자»만(endpointsOf)
  let code = [];
  if (loadConfig().diagScripts === true) {
    try { code = (await loadedScripts(d.win, diagHosts(d.site))).map((c) => ({ src: c.src, size: c.size, endpoints: endpointsOf(c.code) })); } catch {}
  }
  d.snaps.push({ at: new Date().toISOString(), frames: maskDiag(frames).data, code: maskDiag(code).data });   // 기록하는 순간 가림(메모리에도 가린 것만)
  return d.snaps.length;
}

/*  (12차) 관찰 기록 — 1초마다 ① 직원이 누른 단추 글자를 모으고(요청과 시간 순서 맞추기) ② 화면이 바뀐 뒤 잠잠해지면 화면 칸을 저절로 기록.
 *  직원은 평소처럼 등록·[저장]만 하면 된다([지금 화면 칸 기록]을 안 눌러도 됨). 표 줄을 누른 것은 글자 없이 «표 줄»로만(이름이 섞일 수 있어서) */
const CLICK_EXPR = `(function(){ if(!window.__ccObs){ window.__ccObs=[]; document.addEventListener('click',function(e){ try{
  var b=e.target&&e.target.closest&&e.target.closest('button,a,input[type=button],input[type=submit],input[type=checkbox],input[type=radio],[role=button],tr');
  if(!b) return; var row=b.tagName==='TR'; var t=row?'(표 줄)':((b.tagName==='INPUT'&&b.type!=='checkbox'&&b.type!=='radio'?b.value:(b.textContent||b.getAttribute('aria-label')||b.title||''))||'');
  window.__ccObs.push({at:new Date().toISOString(),text:String(t).replace(/\s+/g,' ').trim().slice(0,40),tag:b.tagName+(b.type?':'+b.type:''),id:b.id||b.name||''});
  if(window.__ccObs.length>200) window.__ccObs.shift(); }catch(_){} },true); } return window.__ccObs.splice(0); })()`;
function observeLoop(d) {
  let lastCount = 0, quietSince = 0, dirty = true;
  let busyTick = false;
  const t = setInterval(async () => {
    if (diagState[d.site] !== d) { clearInterval(t); return; }
    if (busyTick) return;
    busyTick = true;
    try { await tick(); } finally { busyTick = false; }
  }, 1000);
  async function tick() {
    const wins = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && w !== windows.main && w.webContents.session === d.ses);
    for (const w of wins) {
      let fr = [];
      try { fr = [w.webContents.mainFrame].concat((w.webContents.mainFrame.framesInSubtree || []).filter((f) => f !== w.webContents.mainFrame)); } catch {}
      for (const f of fr) { try { ((await f.executeJavaScript(CLICK_EXPR, true)) || []).forEach((c) => { d.rec.noteClick(c); dirty = true; }); } catch {} }
    }
    const n = d.rec.summary().entries.length;
    if (n !== lastCount) { lastCount = n; quietSince = Date.now(); dirty = true; return; }
    if (dirty && Date.now() - quietSince > 1500 && d.snaps.length < 25 && !d.snapping) {
      dirty = false; d.snapping = true;
      try { await diagSnap(d); } catch {} finally { d.snapping = false; }
    }
  }
}

/** 진단 끝내기(정상·중단 공통) — 막기를 풀기 «전»에 같은 세션의 팝업은 닫는다 → 가리기 → 검사 → 파일 */
async function diagFinish(site, abortedWhy) {
  const d = diagState[site];
  if (!d) return { ok: false, error: '진단 중이 아니에요.' };
  delete diagState[site];
  if (!abortedWhy) { try { await diagSnap(d); } catch {} }
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed() && w !== d.win && w !== windows.main && w.webContents.session === d.ses) { try { w.close(); } catch {} }
  });
  await d.ds.stop();
  const raw = { site, mode: d.observe ? 'observe' : 'block', startedAt: d.startedAt, endedAt: new Date().toISOString(), aborted: abortedWhy || null, requests: d.rec.summary(), snaps: d.snaps };
  const { data, masked } = maskDiag(raw);
  const text = JSON.stringify(data, null, 1);
  const left = checkDiag(text);
  const sum = d.rec.summary();
  const base = { site, observe: !!d.observe, aborted: abortedWhy || null, held: sum.held, passed: sum.passed, snaps: d.snaps.length, masked,
                 writes: d.observe ? [...new Set(data.requests.entries.filter((e) => e.method && e.method !== 'GET' && e.method !== 'HEAD').map((e) => e.method + ' ' + e.path))].slice(0, 20) : [],
                 heldPaths: [...new Set(data.requests.entries.filter((e) => /^막음/.test(e.verdict)).map((e) => e.method + ' ' + e.path))].slice(0, 20) };
  if (Object.keys(left).length) return { ok: false, ...base, left, error: '개인정보로 보이는 글자가 남아 있어 기록 파일을 만들지 않았어요.' };
  const dir = userFile('diag');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const file = path.join(dir, 'diag-' + site + (d.observe ? '-관찰' : '') + '-' + stamp + '.json');
  fs.writeFileSync(file, text);
  return { ok: true, ...base, file };
}

//  진단은 «시험판»에서만(10차) — 업무용 프로그램에서는 설정을 켜도 동작하지 않음(시험 실행 CARCHECK_SMOKE 만 예외)
const DIAG_ALLOWED = !!TEST_INSTALL || process.env.CARCHECK_SMOKE === '1';
ipcMain.handle('diag:openEntry', flowCall(async () => {
  if (!DIAG_ALLOWED) return { ok: false, error: '진단은 시험판(업무용과 따로 푼 폴더)에서만 해요.' };
  if (loadConfig().diagnose !== true) return { ok: false, error: '진단 기능이 꺼져 있어요.' };
  if (diagState.entry) return { ok: false, error: '엔트리는 지금 진단 중이에요.' };
  diagEntryWindow(true);
  return { ok: true };
}));
ipcMain.handle('diag:start', flowCall(async (a) => {
  if (!DIAG_ALLOWED) return { ok: false, error: '진단은 시험판(업무용과 따로 푼 폴더)에서만 해요.' };
  if (loadConfig().diagnose !== true) return { ok: false, error: '진단 기능이 꺼져 있어요.' };
  const site = a.site;
  if (!['carinfo', 'carmodoo', 'entry'].includes(site)) return { ok: false, error: '알 수 없는 전산이에요.' };
  if (Object.keys(diagState).length) return { ok: false, error: '이미 진단 중인 전산이 있어요. 한 번에 한 전산만 진단해요.' };
  const b = site === 'entry' ? null : legacyBlock(site);
  if (b) return { ok: false, error: b };
  const hosts = diagHosts(site);
  if (!hosts.length) return { ok: false, error: '이 전산의 주소를 몰라 진단하지 않아요.' };
  const win = site === 'entry' ? diagEntryWindow(false) : (windows[site] && !windows[site].isDestroyed() ? windows[site] : null);
  if (!win) return { ok: false, error: (site === 'entry' ? '먼저 [엔트리 창 열기]로 엔트리에 로그인해 주세요.' : '먼저 맨 위 [' + ({ carinfo: '카인포', carmodoo: '경기조합' })[site] + ' 창] 단추로 창을 열고 로그인해 주세요.') };
  const observe = a.observe === true;
  const rec = createDiagRecorder({ siteHosts: hosts, readPaths: (siteConfig.REAL[site] || {}).diagReadPaths || [], observe,
                                   allowStatic: (siteConfig.REAL[site] || {}).diagAllowStatic === true });      // 정적 파일도 기본 차단
  const st = { site, rec, win, ses: win.webContents.session, snaps: [], observe, startedAt: new Date().toISOString() };   // 세션은 따로 잡아 둠(기록 중 창이 닫혀도 끝내기가 되게)
  st.ds = startDiagSession({ win, rec, onAbort: (why) => {
    diagFinish(site, why).then((r) => {
      if (r && r.ok === false && /진단 중이 아니에요/.test(r.error || '')) return;   // 이미 [진단 끝]으로 마무리 중이면 보내지 않음
      try { windows.main && !windows.main.isDestroyed() && windows.main.webContents.send('diag:aborted', { ...r, reason: why }); } catch {}
    });
  } });
  diagState[site] = st;
  if (!(await st.ds.ready)) {
    delete diagState[site];
    return { ok: false, error: '요청을 막는 장치를 켜지 못해서 진단을 시작하지 않았어요. 프로그램을 다시 켠 뒤 해 주세요.' };
  }
  if (observe) observeLoop(st);
  return { ok: true };
}));
ipcMain.handle('diag:snap', flowCall(async (a) => {
  if (!diagState[a.site]) return { ok: false, error: '진단 중이 아니에요.' };
  return { ok: true, snaps: await diagSnap(diagState[a.site]) };
}));
ipcMain.handle('diag:stop', flowCall(async (a) => diagFinish(a.site, null)));
//  자동 등록 화면 안내용 — 엔트리 연결 모듈이 있는지(지금은 없음)
ipcMain.handle('flow:status', flowCall(async () => { let impl = false; try { impl = !!flow().adapters.entry.implemented; } catch {} return { ok: true, entryImplemented: impl }; }));

/*  시험용 실행(CARCHECK_SMOKE=1): 실제 기록 폴더를 건드리지 않게 임시 폴더를 쓰고, 입력 화면이 뜨면 끝낸다
 *  (10차) 묶음 검사(CARCHECK_PROBE=1, 시험판 묶음에서만): 임시 폴더로 바꾸지 않고 «정해진 기록 폴더»를 그대로 써서 어디에 쓰는지 확인 —
 *  검사 도구가 가짜 APPDATA 를 주고 부른다. 전산 주소는 똑같이 막아 둔 주소 */
const PROBE = process.env.CARCHECK_PROBE === '1' && !!TEST_INSTALL;
if (process.env.CARCHECK_SMOKE === '1' || PROBE) {
  const decidedUserData = app.getPath('userData');                     // 시험판 표시로 정해진 기록 폴더(시험 확인용 — 아래에서 임시 폴더로 바꿈)
  if (!PROBE) app.setPath('userData', fs.mkdtempSync(path.join(require('os').tmpdir(), 'cc-smoke-')));
  //  시험 중에는 실제 전산 주소로 나가지 않게 막아 둔 주소로 바꾼다(접속 거부되는 내 PC 주소)
  Object.keys(SITES).forEach((k) => { SITES[k].home = SITES[k].list = SITES[k].form = 'http://127.0.0.1:9/' + k; });
  if (process.env.CARCHECK_SMOKE_FLOW === '1') fs.writeFileSync(path.join(app.getPath('userData'), 'config.json'), JSON.stringify({ flow: true }));
  if (process.env.CARCHECK_SMOKE_DIAG === '1' && !PROBE) fs.writeFileSync(path.join(app.getPath('userData'), 'config.json'), JSON.stringify({ diagnose: true }));
  app.whenReady().then(() => {
    setTimeout(async () => {
      let title = '';
      try { title = await windows.main.webContents.executeJavaScript('document.title', true); } catch {}
      console.log('SMOKE-INSTALL wtitle=' + windows.main.getTitle() + ' userData=' + path.basename(decidedUserData));
      if (PROBE) {
        const diagBtn = await windows.main.webContents.executeJavaScript('!document.getElementById("btn-diag").classList.contains("hidden")', true).catch(() => null);
        console.log('SMOKE-PROBE userDataFull=' + app.getPath('userData') + ' diagButton=' + diagBtn);
        if (process.env.CARCHECK_SMOKE_DIAG !== '1') { app.exit(0); return; }    // 진단까지 해 보면 기록 파일이 시험판 기록 폴더에 생김(설정은 7_전산진단_켜기 로 켬)
      }
      //  입력 칸에 실제 키로 글자가 들어가는지(대표님 10/19 «차량번호 입력이 아예 안돼») — 칸 가운데를 덮는 것이 있는지도 확인
      if (process.env.CARCHECK_SMOKE_TYPE === '1') {
        const wc = windows.main.webContents;
        const cover = await wc.executeJavaScript('(function(){var e=document.getElementById("f_carNo");if(!e)return "칸 없음";var r=e.getBoundingClientRect();var t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return t===e?"덮는 것 없음":(t?(t.id||t.className||t.tagName):"없음");})()', true);
        windows.main.show(); windows.main.focus();
        await wc.executeJavaScript('document.getElementById("f_carNo").focus();1', true);
        for (const ch of '12가3456') wc.sendInputEvent({ type: 'char', keyCode: ch });
        await new Promise((r) => setTimeout(r, 300));
        const typed = await wc.executeJavaScript('JSON.stringify({value:document.getElementById("f_carNo").value,state:state.carNo||"",active:document.activeElement&&document.activeElement.id,ro:document.getElementById("f_carNo").readOnly,dis:document.getElementById("f_carNo").disabled})', true);
        console.log('SMOKE-TYPE cover=' + cover + ' ' + typed);
      }
      console.log('SMOKE main-title=' + title + ' handlers=' + ['flow:start', 'site:send', 'admin:setPin'].filter((h) => ipcMain._invokeHandlers ? ipcMain._invokeHandlers.has(h) : true).length);
      if (process.env.CARCHECK_SMOKE_FLOW === '1') {
        //  입력 화면의 [세 전산 자동 등록]을 눌러 본다 — 실제 전산 설정이 비어 있으니 저장 전에 멈춰야 정상
        const wc = windows.main.webContents;
        const shown = await wc.executeJavaScript('!document.getElementById("btn-auto").classList.contains("hidden")', true);
        await wc.executeJavaScript('Object.assign(state,{carNo:"12가3456",vin:"KMHXX00XXXX123456",dealerName:"시험딜러",checkDate:"2026-10-19",carModel:"시험차",carYear:"2020",inspStart:"2026-01-01",inspEnd:"2027-12-31",mileage:"45210"}); document.getElementById("btn-auto").click(); setTimeout(function(){ var y=document.getElementById("auto-confirm-yes"); if(y) y.click(); }, 300); 1', true);
        let rep = null;
        for (let i = 0; i < 60 && !rep; i++) {
          await new Promise((r) => setTimeout(r, 250));
          rep = await wc.executeJavaScript('(function(){var r=document.getElementById("report");if(!r||r.classList.contains("hidden"))return null;return {title:r.querySelector("h2").textContent,body:document.getElementById("report-body").textContent.slice(0,400)};})()', true);
        }
        console.log('SMOKE-FLOW button=' + shown + ' report=' + JSON.stringify(rep));
      }
      if (process.env.CARCHECK_SMOKE_DIAG === '1') {
        //  [전산 진단] → 카인포 진단 시작 → 진단 끝 — 실제 전산 주소는 막아 둔 주소라 접속 없음
        const wc = windows.main.webContents;
        const shown = await wc.executeJavaScript('!document.getElementById("btn-diag").classList.contains("hidden")', true);
        //  진단은 그 전산 창을 먼저 연 뒤에만 시작된다(8차 검수 보완) — 창 열기 → 진단 시작
        await wc.executeJavaScript('window.api.openSite("carinfo").then(function(){return 1})', true).catch(() => {});
        await wc.executeJavaScript('document.getElementById("btn-diag").click();1', true);
        await new Promise((r) => setTimeout(r, 300));
        //  (12차) CARCHECK_SMOKE_OBSERVE=1 이면 «관찰 기록»으로 — 막지 않고 기록, 화면 칸은 저절로
        const obs = process.env.CARCHECK_SMOKE_OBSERVE === '1';
        if (obs) await wc.executeJavaScript('state.carNo="00가0000";var o=document.getElementById("diag-observe");o.checked=true;o.dispatchEvent(new Event("change"));1', true);
        await wc.executeJavaScript('document.querySelector(".diag-sites button[data-site=carinfo]").click();1', true);
        //  실제 등록 관찰은 «전산·대상 차량» 확인 칸을 거친다(12차 검수)
        if (obs) {
          const conf = await wc.executeJavaScript('(function(){var c=document.getElementById("diag-confirm");return c.classList.contains("hidden")?null:document.getElementById("diag-confirm-text").textContent;})()', true);
          console.log('SMOKE-OBSERVE-CONFIRM ' + JSON.stringify(conf));
          await wc.executeJavaScript('document.getElementById("diag-confirm-yes").click();1', true);
        }
        let st = '';
        for (let i = 0; i < 40 && !/(진단|관찰) 중/.test(st); i++) { await new Promise((r) => setTimeout(r, 250)); st = await wc.executeJavaScript('document.getElementById("diag-state").textContent', true); }
        if (obs) await new Promise((r) => setTimeout(r, 3500));            // 저절로 화면 칸 기록이 한 번 돌 시간
        await wc.executeJavaScript('document.getElementById("diag-stop").click();1', true);
        let rep = null;
        for (let i = 0; i < 40 && !rep; i++) {
          await new Promise((r) => setTimeout(r, 250));
          rep = await wc.executeJavaScript('(function(){var r=document.getElementById("report");if(!r||r.classList.contains("hidden"))return null;return r.querySelector("h2").textContent+" | "+document.getElementById("report-body").textContent.slice(0,600);})()', true);
        }
        console.log('SMOKE-DIAG button=' + shown + ' state=' + JSON.stringify(st) + ' report=' + JSON.stringify(rep));
      }
      app.exit(0);
    }, 1500);
  });
}
