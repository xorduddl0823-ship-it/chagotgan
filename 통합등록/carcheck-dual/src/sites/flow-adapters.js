/**
 * 등록 흐름용 Electron 연결 모듈 — register-flow 가 부르는 «adapter» 를 실제 창 위에 만든다
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸(상용 배포본에서 통째로 뺄 수 있음).
 *  · 값 넣기는 기존 기능(filler.js 의 buildScript 등)을 그대로 쓰도록 fillFns 로 받는다 — 기존 기능 보존
 *  · 목록·번호 읽기는 site-config 의 선택자로 읽는다(설정이 비어 있으면 «모름»을 돌려줘 흐름이 멈춤)
 *  · 저장 통제: armGuard() 때 save-guard + save-hold 를 걸고, unlockSave() 로 한 번 허락
 *
 *  ⚠ 실제 전산 선택자는 아직 확정 전(site-config REAL confirmed:false). 모의 사이트에서만 끝까지 시험함.
 */
const { createSaveGuard } = require('../core/save-guard');
const { attachSaveHold } = require('./save-hold');

/** 창의 모든 화면 조각(frame)에서 돌려 처음으로 null 이 아닌 답을 돌려준다 */
async function inAnyFrame(win, expr) {
  const frames = [];
  try {
    frames.push(win.webContents.mainFrame);
    (win.webContents.mainFrame.framesInSubtree || []).forEach((f) => { if (f !== win.webContents.mainFrame) frames.push(f); });
  } catch { return null; }
  for (const f of frames) {
    try {
      const v = await f.executeJavaScript(expr, true);
      if (v != null) return v;
    } catch { /* 그 조각은 아직 그려지는 중 */ }
  }
  return null;
}

/** 목록 읽기 스크립트 — 칸 순서(cols)로 줄마다 값을 꺼낸다 */
function listExpr(list) {
  return '(function(){var L=' + JSON.stringify(list) + ';' +
    'var trs=document.querySelectorAll(L.rows);if(!trs.length)return null;var out=[];' +
    'for(var i=0;i<trs.length;i++){var td=trs[i].querySelectorAll("td");if(!td.length)continue;var r={};' +
    'for(var k in L.cols){var c=td[L.cols[k]];r[k]=c?String(c.textContent||"").trim():"";}out.push(r);}' +
    'return out;})()';
}

const textExpr = (sel) => '(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');' +
  'return e?String(e.value!=null&&e.tagName!=="SPAN"&&e.tagName!=="DIV"&&e.tagName!=="TD"?e.value:e.textContent).trim():null;})()';

/**
 * @param o.getWindow(site)   → BrowserWindow (그 전산 창)
 * @param o.config            site-config (REAL 또는 mockConfig(...))
 * @param o.fillFns           { carinfo(data), carmodoo(data, extra), entry(data, extra) } → {filled, missing} (기존 기능 감싼 것)
 */
function createElectronAdapters(o) {
  const C = o.config;
  const ctl = {};                                         // site → { guard, hold }

  function needCols(site) {
    const l = C[site] && C[site].list;
    if (!l || !l.rows || !l.cols) throw new Error(site + ' 목록 칸 설정이 아직 없습니다(10/19 화면 확인 필요).');
    return l;
  }
  async function rowsOf(site, car) {
    const rows = (await inAnyFrame(o.getWindow(site), listExpr(needCols(site)))) || [];
    return car ? rows.filter((r) => String(r.carNo).replace(/\s+/g, '') === String(car.carNo).replace(/\s+/g, '')) : rows;
  }

  function common(site) {
    return {
      async fill(data, extra) { return o.fillFns[site](data, extra || {}); },
      async armGuard() {
        if (ctl[site]) { try { await ctl[site].hold.detach(); } catch {} }
        const cfg = C[site];
        const guard = createSaveGuard({ siteHosts: cfg.hosts, savePatterns: cfg.savePatterns, saveGetPatterns: cfg.saveGetPatterns,
                                        readAllow: cfg.readAllow, confirmed: cfg.confirmed });
        const hold = attachSaveHold(o.getWindow(site), guard, { name: site });
        ctl[site] = { guard, hold };
        await hold.ready;                                 // 붙이기가 끝난 뒤에 돌려준다(그 전 저장 요청이 새지 않게)
      },
      async unlockSave() { ctl[site].guard.unlock(); },
      async saveOutcome() { return ctl[site] ? ctl[site].guard.outcome() : { result: 'unknownPath', reasons: ['저장 통제기가 걸려 있지 않음'] }; },
      async coverage() { return ctl[site] ? ctl[site].guard.coverage() : { unattachedWindows: ['(통제기 없음)'] }; },
      async release() { if (ctl[site]) { await ctl[site].hold.detach(); delete ctl[site]; } },
    };
  }

  const carinfo = Object.assign(common('carinfo'), {
    async readList(car) { return rowsOf('carinfo', car); },
  });

  const carmodoo = Object.assign(common('carmodoo'), {
    async fill(data, extra) {
      const r = await o.fillFns.carmodoo(data, extra || {});
      const cfg = C.carmodoo;
      if (!cfg.autoAssign || !cfg.numberField) return { ...r, missing: (r.missing || []).concat(['«자동 부여»·번호 칸 설정 없음(10/19 확인 필요)']) };
      //  «자동 부여» 끄기 + 카인포 번호 넣기
      const put = await inAnyFrame(o.getWindow('carmodoo'), '(function(){var a=document.querySelector(' + JSON.stringify(cfg.autoAssign) + ');' +
        'var n=document.querySelector(' + JSON.stringify(cfg.numberField) + ');if(!a||!n)return null;' +
        'if(a.checked){a.click();if(a.checked){a.checked=false;a.dispatchEvent(new Event("change",{bubbles:true}));}}' +
        'n.value=' + JSON.stringify(String(extra.checkNo || '')) + ';["input","change","blur"].forEach(function(t){n.dispatchEvent(new Event(t,{bubbles:true}));});' +
        'return {auto:a.checked,no:n.value};})()');
      if (!put) return { ...r, missing: (r.missing || []).concat(['«자동 부여»·번호 칸을 화면에서 찾지 못함']) };
      return { ...r, filled: (r.filled || []).concat(['자동 부여 끔', '성능점검번호']) };
    },
    async readForm() {
      const cfg = C.carmodoo;
      if (!cfg.autoAssign || !cfg.numberField) return { autoAssignOn: undefined, numberValue: '' };
      const v = await inAnyFrame(o.getWindow('carmodoo'), '(function(){var a=document.querySelector(' + JSON.stringify(cfg.autoAssign) + ');' +
        'var n=document.querySelector(' + JSON.stringify(cfg.numberField) + ');if(!a||!n)return null;return {autoAssignOn:!!a.checked,numberValue:n.value};})()');
      return v || { autoAssignOn: undefined, numberValue: '' };
    },
    async readSaved(car) { const r = await rowsOf('carmodoo', car); return r[0] ? { checkNo: r[0].checkNo } : null; },
  });

  const entry = Object.assign(common('entry'), {
    async loginState() {
      const cfg = C.entry;
      if (!cfg.loggedIn) return { loggedIn: false, canRead: false, reason: '엔트리 화면 설정 없음' };
      const who = await inAnyFrame(o.getWindow('entry'), textExpr(cfg.loggedIn));
      const next = cfg.nextNumber ? await inAnyFrame(o.getWindow('entry'), textExpr(cfg.nextNumber)) : null;
      return { loggedIn: !!who, canRead: !!who && !!next };
    },
    async readNext() { return inAnyFrame(o.getWindow('entry'), textExpr(C.entry.nextNumber)); },
    async fill(data, extra) {
      const r = o.fillFns.entry ? await o.fillFns.entry(data, extra || {}) : { filled: [], missing: [] };
      const cfg = C.entry;
      //  엔트리는 «다음 번호»로 카인포 기록을 끌어온다 — 번호 칸을 비우지 않고 불러오기만 누른다(번호는 사이트가 정함)
      const ok = await inAnyFrame(o.getWindow('entry'), '(function(){var b=document.querySelector(' + JSON.stringify(cfg.loadButton) + ');if(!b)return null;b.click();return true;})()');
      if (!ok) return { ...r, missing: (r.missing || []).concat(['엔트리 불러오기 단추를 찾지 못함']) };
      await new Promise((res) => setTimeout(res, 300));
      return { ...r, filled: (r.filled || []).concat(['엔트리 불러오기']) };
    },
    async load() {},
    async readLoaded() {
      const L = C.entry.loaded;
      const w = o.getWindow('entry');
      return { entryNo: await inAnyFrame(w, textExpr(L.entryNo)), carNo: await inAnyFrame(w, textExpr(L.carNo)), vin: await inAnyFrame(w, textExpr(L.vin)) };
    },
    async readSaved(car) { const r = await rowsOf('entry', car); return r[0] ? { checkNo: r[0].checkNo } : null; },
  });

  return { carinfo, carmodoo, entry };
}

module.exports = { createElectronAdapters, inAnyFrame, listExpr };
