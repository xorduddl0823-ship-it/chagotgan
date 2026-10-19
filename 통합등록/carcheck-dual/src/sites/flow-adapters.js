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
const { sameCar } = require('../core/number-check');

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

/**
 * 목록 읽기 스크립트 — 칸 순서(cols)로 줄마다 값을 꺼낸다
 *  pick: 칸 글자에서 쓸 부분만 고르는 무늬(7차) — 예: 카인포 번호 칸은 «2628604413재성능»처럼 표시가 붙어 나와 숫자만 고름
 */
function listExpr(list) {
  return '(function(){var L=' + JSON.stringify({ rows: list.rows, cols: list.cols, pick: list.pick || {} }) + ';' +
    'var trs=document.querySelectorAll(L.rows);if(!trs.length)return null;var out=[];' +
    'for(var i=0;i<trs.length;i++){var td=trs[i].querySelectorAll("td");if(!td.length)continue;var r={};' +
    'for(var k in L.cols){var c=td[L.cols[k]];var t=c?String(c.textContent||"").replace(/\\s+/g," ").trim():"";' +
    'if(L.pick[k]){var m=t.match(new RegExp(L.pick[k]));t=m?m[0]:"";}r[k]=t;}out.push(r);}' +
    'return out;})()';
}

/**
 * 카모두 번호 넣기 스크립트 — 두 가지 화면 모양을 받는다
 *  · manualInput(실제 카모두 10/19 화면): «수동입력» 체크를 «켜야» 번호 칸이 열림(꺼져 있으면 «자동입력»)
 *  · autoAssign(예전 짐작·모의 사이트): «자동 부여» 체크를 «꺼야» 함
 *  돌려줌 {auto: 자동으로 매겨질 상태인가, no: 칸의 값} · 칸을 못 찾으면 null
 */
function carmodooNumberExpr(cfg, checkNo) {
  return '(function(){var C=' + JSON.stringify({ manual: cfg.manualInput || null, auto: cfg.autoAssign || null, field: cfg.numberField }) + ',no=' + JSON.stringify(String(checkNo || '')) + ';' +
    'var n=document.querySelector(C.field);var m=C.manual?document.querySelector(C.manual):null;var a=C.auto?document.querySelector(C.auto):null;' +
    'if(!n||(!m&&!a))return null;' +
    'function ev(e,t){e.dispatchEvent(new Event(t,{bubbles:true}));}' +
    'if(m){if(!m.checked){m.click();if(!m.checked){m.checked=true;ev(m,"change");}}}' +
    'else if(a.checked){a.click();if(a.checked){a.checked=false;ev(a,"change");}}' +
    'if(no!==""){n.removeAttribute("readonly");n.disabled=false;n.value=no;["input","change","blur"].forEach(function(t){ev(n,t);});}' +
    'return {auto:m?!m.checked:!!a.checked,no:n.value};})()';
}
/** 카모두 번호 칸 상태 읽기(넣지 않음) */
const carmodooReadExpr = (cfg) => carmodooNumberExpr(cfg, '').replace('if(m){if(!m.checked){m.click();if(!m.checked){m.checked=true;ev(m,"change");}}}' +
  'else if(a.checked){a.click();if(a.checked){a.checked=false;ev(a,"change");}}', '');

/**
 * [저장] 단추 찾기 — 선택자(saveButton) 또는 단추 글자(saveButtonText, 글자가 «정확히» 같은 것만).
 *  «정확히»: 카모두 [접수저장]·엔트리 [성능점검기록부 전송]처럼 «저장»이 들어간 다른 단추를 누르지 않게(대표님 10/19: [저장]만 누름)
 *  press=true 면 켜진 단추 하나를 누르고 true · false 면 켜져 있는지만(true/false), 없으면 null
 *  같은 글자의 단추가 둘 이상 보이면 누르지 않는다(null).
 */
function saveButtonExpr(cfg, press) { return buttonExpr({ sel: cfg.saveButton || null, text: cfg.saveButtonText || null }, press); }
/** 단추 찾기(선택자 또는 «정확히 같은» 글자 · 보이는 것 하나만) — 누르기(press) 또는 켜졌는지 보기 */
function buttonExpr(spec, press) {
  return '(function(){var C=' + JSON.stringify({ sel: spec.sel || null, text: spec.text || null }) + ';var b=null;' +
    'if(C.sel){b=document.querySelector(C.sel);}' +
    'else if(C.text){var all=document.querySelectorAll("button,a,input[type=button],input[type=submit]");var hit=[];' +
    'for(var i=0;i<all.length;i++){var e=all[i];var t=String(e.value!=null&&e.tagName==="INPUT"?e.value:(e.textContent||"")).replace(/\\s+/g,"");' +
    'if(t===String(C.text).replace(/\\s+/g,"")&&(e.offsetWidth||e.offsetHeight||e.getClientRects().length))hit.push(e);}if(hit.length!==1)return null;b=hit[0];}' +
    'if(!b)return null;var off=b.disabled||b.getAttribute("aria-disabled")==="true"||/(^|\\s)disabled(\\s|$)/.test(b.className);' +
    (press ? 'if(off)return null;b.click();return true;' : 'return !off;') + '})()';
}

const textExpr = (sel) => '(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');' +
  'return e?String(e.value!=null&&e.tagName!=="SPAN"&&e.tagName!=="DIV"&&e.tagName!=="TD"?e.value:e.textContent).trim():null;})()';

/**
 * @param o.getWindow(site)   → BrowserWindow (그 전산 창)
 * @param o.config            site-config (REAL 또는 mockConfig(...))
 * @param o.fillFns           { carinfo(data), carmodoo(data, extra), entry(data, extra) } → {filled, missing} (기존 기능 감싼 것)
 * @param o.photoFns          (7차) { carinfo(data, {only}), carmodoo(data, {only}) } → {done:[photo1…], missing[]} (기존 사진 올리기 감싼 것)
 * @param o.prepareFn         (7차) 카인포 신규등록(data) → {ok, needPick, candidates, checkNo, error} (기존 신규등록 감싼 것)
 */
function createElectronAdapters(o) {
  const C = o.config;
  const ctl = {};                                         // site → { guard, hold }

  function needCols(site) {
    const l = C[site] && C[site].list;
    if (!l || !l.rows || !l.cols) throw new Error(({ carinfo: '카인포', carmodoo: '카모두', entry: '엔트리' })[site] + ' 목록 칸 설정이 아직 없습니다(실제 화면 확인 필요).');
    return l;
  }
  async function rowsOf(site, car) {
    const rows = (await inAnyFrame(o.getWindow(site), listExpr(needCols(site)))) || [];
    return car ? rows.filter((r) => sameCar(r.carNo, car.carNo)) : rows;      // 엔트리 목록처럼 앞을 가린 번호도 받음
  }

  function common(site) {
    return {
      async fill(data, extra) { return o.fillFns[site](data, extra || {}); },
      async armGuard() {
        if (ctl[site]) { try { await ctl[site].hold.detach(); } catch {} }
        const cfg = C[site];
        const win = o.getWindow(site);
        if (!win) throw new Error(site + ' 창이 없습니다.');
        const guard = createSaveGuard({ siteHosts: cfg.hosts, savePatterns: cfg.savePatterns, saveGetPatterns: cfg.saveGetPatterns,
                                        readAllow: cfg.readAllow, fillAllow: cfg.fillAllow, phaseAllow: cfg.phaseAllow, confirmed: cfg.confirmed, popupAuto: cfg.popupAuto === true });
        const hold = attachSaveHold(win, guard, { name: site });
        ctl[site] = { guard, hold };
        const ok = await hold.ready;                      // 붙이기가 끝난 뒤에 돌려준다(그 전 저장 요청이 새지 않게)
        if (!ok) throw new Error('개발자 연결(저장 붙잡기)을 켜지 못했습니다.');
      },
      async unlockSave() { return ctl[site] ? ctl[site].guard.unlock() : false; },
      async seal() { if (ctl[site]) ctl[site].guard.seal(); },
      async timeout() { if (ctl[site]) ctl[site].guard.onTimeout(); },
      /**
       * 그 전산 [저장] 누르기 — 프로그램이 누른다(대표님 10/19 최종 지시: 정상이면 사람 조작 없음).
       *  저장 통제기가 한 번 허락한 상태에서만 요청이 나간다. 단추를 못 찾으면 false(요청이 안 나가 notSent 로 처리됨).
       */
      async clickSave() {
        const ok = await inAnyFrame(o.getWindow(site), saveButtonExpr(C[site] || {}, true));
        return ok === true;
      },
      async readList(car) { return rowsOf(site, car); },
      /**
       * 사진 올리기(7차) — «사진» 단계 문을 연 동안만 사진 주소 요청을 내보낸다(저장 주소는 그래도 막힘).
       *  opts.only: 올릴 칸만(이어 하기 때 남은 칸). 돌려줌 {done:[칸], missing:[까닭]}
       */
      async photos(data, opts) {
        if (!o.photoFns || !o.photoFns[site]) return { done: [], missing: ['사진 올리기 기능이 연결되지 않았습니다.'] };
        const g = ctl[site] && ctl[site].guard;
        if (!g) return { done: [], missing: ['저장 통제기가 걸려 있지 않아 사진을 올리지 않았습니다.'] };
        if (!g.openPhase('photo')) return { done: [], missing: ['사진 올리기 주소 설정이 없습니다(실제 화면 확인 필요).'] };
        try { return await o.photoFns[site](data, opts || {}); } finally { g.closePhase(); }
      },
      async saveOutcome() { return ctl[site] ? ctl[site].guard.outcome() : { result: 'unknownPath', reasons: ['저장 통제기가 걸려 있지 않음'] }; },
      async coverage() { return ctl[site] ? ctl[site].guard.coverage() : { windows: 0, unattachedWindows: ['(통제기 없음)'] }; },
      async release() { if (ctl[site]) { await ctl[site].hold.detach(); delete ctl[site]; } },
    };
  }

  const carinfo = Object.assign(common('carinfo'), {
    async readList(car) { return rowsOf('carinfo', car); },
    /**
     * 목록에 차대번호 칸이 없을 때(실제 카인포) — 그 번호 줄을 눌러 위쪽 차량정보에 불러온 뒤 차대번호를 읽는다(7차).
     *  누르는 것은 «보기»이고 저장이 아니다. 위 정보 칸의 번호가 그 번호로 바뀐 것을 확인한 뒤에만 읽는다. 못 읽으면 ''.
     */
    async readRowVin(checkNo) {
      const V = C.carinfo.list && C.carinfo.list.vinFromForm;
      if (!V) return '';
      const L = C.carinfo.list;
      const w = o.getWindow('carinfo');
      const clicked = await inAnyFrame(w, '(function(){var L=' + JSON.stringify({ rows: L.rows, col: L.cols.checkNo }) + ',no=' + JSON.stringify(String(checkNo)) + ';' +
        'var trs=document.querySelectorAll(L.rows);for(var i=0;i<trs.length;i++){var td=trs[i].querySelectorAll("td")[L.col];' +
        'if(td&&String(td.textContent||"").indexOf(no)>=0){(trs[i].querySelector("td")||trs[i]).click();return true;}}return null;})()');
      if (!clicked) return '';
      const until = Date.now() + 5000;
      while (Date.now() < until) {
        const no = await inAnyFrame(w, textExpr(V.formNo));
        if (no && String(no).replace(/\s+/g, '') === String(checkNo)) {
          const parts = [];
          for (const sel of [].concat(V.vin)) parts.push((await inAnyFrame(w, textExpr(sel))) || '');
          return parts.join('');
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      return '';
    },
    /** 지금 카인포에 신규등록(점검 등록) 화면이 열려 있나 — { open, carNo, checkNo } · 설정이 없으면 unknown */
    async prepareState() {
      const P = C.carinfo.prepare;
      if (!P || !P.formCarNo) return { open: false, unknown: true };
      const w = o.getWindow('carinfo');
      const carNo = await inAnyFrame(w, textExpr(P.formCarNo));
      const checkNo = P.formNo ? await inAnyFrame(w, textExpr(P.formNo)) : null;
      return { open: !!(carNo && String(carNo).trim()), carNo: carNo || '', checkNo: checkNo || '' };
    },
    /** 카인포 신규등록 — «신규등록» 단계 문을 연 동안만 그 요청을 내보낸다 */
    async prepare(data) {
      if (!o.prepareFn) return { ok: false, error: '카인포 신규등록 기능이 연결되지 않았습니다.' };
      const g = ctl.carinfo && ctl.carinfo.guard;
      if (!g) return { ok: false, error: '저장 통제기가 걸려 있지 않아 신규등록을 하지 않았습니다.' };
      if (!g.openPhase('prepare')) return { ok: false, notConfigured: true, error: '카인포 신규등록 요청 주소 설정이 없습니다(실제 화면 확인 필요).' };
      try { return await o.prepareFn(data); } finally { g.closePhase(); }
    },
  });
  if (!o.prepareFn) delete carinfo.prepare;
  if (!(C.carinfo.list && C.carinfo.list.vinFromForm)) delete carinfo.readRowVin;                // 신규등록 기능을 안 넘기면 흐름이 신규등록 단계를 건너뜀(예전 시험·사람이 미리 함)
  //  신규등록 [확인] 때 목록 줄이 먼저 생기나 — true/false/null(모름 → 생긴다고 보고 «상태» 칸으로만 저장 확인)
  carinfo.prepareCreatesRow = C.carinfo.prepare && C.carinfo.prepare.createsRow != null ? C.carinfo.prepare.createsRow : null;
  carinfo.savedStatus = (C.carinfo.list && C.carinfo.list.savedStatus) || null;

  const carmodoo = Object.assign(common('carmodoo'), {
    async fill(data, extra) {
      const r = await o.fillFns.carmodoo(data, extra || {});
      const cfg = C.carmodoo;
      if (!(cfg.manualInput || cfg.autoAssign) || !cfg.numberField) return { ...r, missing: (r.missing || []).concat(['«수동입력»·번호 칸 설정 없음(실제 화면 확인 필요)']) };
      //  «수동입력» 켜기(또는 «자동 부여» 끄기) + 카인포 번호 넣기
      const put = await inAnyFrame(o.getWindow('carmodoo'), carmodooNumberExpr(cfg, extra.checkNo));
      if (!put) return { ...r, missing: (r.missing || []).concat(['«수동입력»·번호 칸을 화면에서 찾지 못함']) };
      return { ...r, filled: (r.filled || []).concat([cfg.manualInput ? '수동입력 켬' : '자동 부여 끔', '성능점검번호']) };
    },
    async readForm() {
      const cfg = C.carmodoo;
      if (!(cfg.manualInput || cfg.autoAssign) || !cfg.numberField) return { autoAssignOn: undefined, numberValue: '' };
      const v = await inAnyFrame(o.getWindow('carmodoo'), carmodooReadExpr(cfg));
      return v ? { autoAssignOn: v.auto, numberValue: v.no } : { autoAssignOn: undefined, numberValue: '' };
    },
  });

  //  (8차 보완) 엔트리 [간편 접수] 창 — 여는 단추 글자 · 번호 칸 · [불러오기] 글자 · 실패 안내의 [확인] 글자
  const Q = C.entry && C.entry.quick && C.entry.quick.numberInput ? C.entry.quick : null;
  /** 엔트리가 매긴 번호 읽기 — [간편 접수] 창이 닫혀 있으면 열고(보기만) 미리 들어간 번호를 읽는다. 번호 칸은 절대 고치지 않음 */
  async function readNextRaw() {
    const w = o.getWindow('entry');
    if (!Q) return inAnyFrame(w, textExpr(C.entry.nextNumber));
    const vis = '(function(){var e=document.querySelector(' + JSON.stringify(Q.numberInput) + ');return e&&(e.offsetWidth||e.offsetHeight)?String(e.value||"").trim():null;})()';
    let v = await inAnyFrame(w, vis);
    if (v == null) {
      if (!(await inAnyFrame(w, buttonExpr({ text: Q.openText }, true)))) return null;     // [간편 접수] 누르기
      const until = Date.now() + 4000;
      while (Date.now() < until && !(v = await inAnyFrame(w, vis))) await new Promise((res) => setTimeout(res, 100));
    }
    return v || null;
  }
  //  엔트리 번호는 «26-28-604413»처럼 줄표를 넣어 보여 준다(10/19 화면 사진) — 카인포 번호(2628604413)와 견주려면 숫자만
  const enNo = (v) => (C.entry && C.entry.numberDigitsOnly && v != null ? String(v).replace(/[^0-9]+/g, '') : v);
  const entry = Object.assign(common('entry'), {
    async readList(car) { return (await rowsOf('entry', car)).map((r) => ({ ...r, checkNo: enNo(r.checkNo) })); },
    async loginState() {
      const cfg = C.entry;
      if (!cfg.loggedIn) return { loggedIn: false, canRead: false, reason: '엔트리 화면 설정 없음' };
      const who = await inAnyFrame(o.getWindow('entry'), textExpr(cfg.loggedIn));
      //  [간편 접수] 화면이면 번호는 창을 열어야 보이므로 로그인만 보면 읽을 수 있다고 본다(번호는 readNext 에서 확인)
      const next = Q ? true : cfg.nextNumber ? await inAnyFrame(o.getWindow('entry'), textExpr(cfg.nextNumber)) : null;
      return { loggedIn: !!who, canRead: !!who && !!next };
    },
    async readNext() { return enNo(await readNextRaw()); },
    /** 엔트리 화면 새로 고치기 — 다시 그려져 로그인 표시나 로그인 칸이 보일 때까지(최대 6초) */
    async refresh() {
      const w = o.getWindow('entry');
      if (!w) return;
      //  새로 고치기 전에 통제기는 그대로(창이 같으면 개발자 연결도 유지된다)
      await new Promise((res) => { const t = setTimeout(res, 6000); w.webContents.once('did-finish-load', () => { clearTimeout(t); res(); }); w.webContents.reload(); });
      const until = Date.now() + 6000;
      while (Date.now() < until) {
        const seen = await inAnyFrame(w, '(function(){return document.querySelector(' + JSON.stringify(C.entry.loggedIn) + ')||document.querySelector("input[type=password]")?true:null;})()');
        if (seen) return;
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    async fill(data, extra) {
      const r = o.fillFns.entry ? await o.fillFns.entry(data, extra || {}) : { filled: [], missing: [] };
      const cfg = C.entry;
      const w = o.getWindow('entry');
      //  번호 칸은 «절대 고치지 않는다»(대표님 10/19 결정) — 엔트리가 스스로 매긴 다음 번호를 그대로 둔다.
      //   그 번호가 이 차 카인포 번호와 같은지는 앞 단계(엔트리 번호 규칙 확인)에서 이미 봤고, 저장 전에 불러온 번호·차량·차대번호를 다시 본다
      //  불러오기 — 카인포 기록이 엔트리로 아직 안 넘어왔으면 «성능 불러오기가 실패하였습니다»가 뜬다(10/19 화면).
      //   (8차) 다시 불러오기는 불러오기가 «순수 조회»임을 진단으로 확인했을 때(pureRead)만, 최대 3번.
      //   다시 할 때마다 엔트리 번호를 다시 읽어 처음과 다르면 즉시 멈춘다.
      const R = cfg.loadRetry || {};
      const times = R.pureRead === true ? Math.min(3, Math.max(1, R.times || 1)) : 1;
      const first = enNo(await readNextRaw());
      for (let i = 0; i < times; i++) {
        if (i) {
          await new Promise((res) => setTimeout(res, R.waitMs || 3000));
          const now = enNo(await readNextRaw());
          if (now !== first) return { ...r, missing: (r.missing || []).concat(['다시 불러오는 중 엔트리 번호가 바뀜(' + first + ' → ' + now + ') — 멈춤']) };
        }
        const ok = await inAnyFrame(w, Q && Q.loadText ? buttonExpr({ text: Q.loadText }, true)
          : '(function(){var b=document.querySelector(' + JSON.stringify(cfg.loadButton) + ');if(!b)return null;b.click();return true;})()');
        if (!ok) return { ...r, missing: (r.missing || []).concat(['엔트리 불러오기 단추를 찾지 못함']) };
        await new Promise((res) => setTimeout(res, 300));
        const failed = R.failText ? await inAnyFrame(w, '(function(){var t=' + JSON.stringify(R.failText) + ';var b=document.body&&document.body.innerText||"";' +
          'if(b.indexOf(t)<0)return null;var c=' + JSON.stringify(R.failClose || '') + ';var e=c&&document.querySelector(c);if(e)e.click();return true;})()') : null;
        if (failed && Q && Q.failCloseText) await inAnyFrame(w, buttonExpr({ text: Q.failCloseText }, true));   // 안내 창 [확인]
        if (!failed) {
          //  불러온 화면이 뜰 때까지(번호 칸이 채워질 때까지) 기다림
          const L = C.entry.loaded;
          const until2 = Date.now() + 5000;
          while (L && L.entryNo && Date.now() < until2 && !(await inAnyFrame(w, textExpr(L.entryNo)))) await new Promise((res2) => setTimeout(res2, 100));
          return { ...r, filled: (r.filled || []).concat(['엔트리 불러오기']) };
        }
      }
      return { ...r, missing: (r.missing || []).concat(['엔트리에서 이 차 기록을 불러오지 못함(카인포 기록이 아직 안 넘어왔을 수 있어요)']) };
    },
    async load() {},
    /**
     * (8차) 저장한 기록의 상세 화면에서 차량번호·차대번호 읽기 — 설정(entry.detail)이 있을 때만.
     *  detail: { openText: 그 줄에서 누를 단추 글자(예 «성능점검»), carNo, vin, back? } — 보기만 하고 아무것도 바꾸지 않음
     */
    async readSavedDetail(checkNo) {
      const D = C.entry.detail;
      const L = C.entry.list;
      const w = o.getWindow('entry');
      const opened = await inAnyFrame(w, '(function(){var L=' + JSON.stringify({ rows: L.rows, col: L.cols.checkNo, text: D.openText }) + ',no=' + JSON.stringify(String(checkNo)) + ';' +
        'var nz=function(v){return String(v||"").replace(/[\\s-]+/g,"");};' +
        'var trs=document.querySelectorAll(L.rows);for(var i=0;i<trs.length;i++){var c=trs[i].children[L.col];if(!c||nz(c.textContent)!==nz(no))continue;' +
        'var bs=trs[i].querySelectorAll("button,a");for(var k=0;k<bs.length;k++){if(String(bs[k].textContent||"").replace(/\\s+/g,"")===L.text){bs[k].click();return true;}}}return null;})()');
      if (!opened) return null;
      const until = Date.now() + 6000;
      while (Date.now() < until) {
        const carNo = await inAnyFrame(w, textExpr(D.carNo));
        const vin = await inAnyFrame(w, textExpr(D.vin));
        if (carNo && vin) return { carNo, vin };
        await new Promise((res) => setTimeout(res, 150));
      }
      return null;
    },
    /** 엔트리 [저장] 단추가 켜져 있나 — true/false · 설정이 없으면 null(모름) */
    async saveEnabled() {
      if (!C.entry.saveButton && !C.entry.saveButtonText) return null;
      return inAnyFrame(o.getWindow('entry'), saveButtonExpr(C.entry, false));
    },
    async readLoaded() {
      const L = C.entry.loaded;
      const w = o.getWindow('entry');
      return { entryNo: enNo(await inAnyFrame(w, textExpr(L.entryNo))), carNo: await inAnyFrame(w, textExpr(L.carNo)), vin: await inAnyFrame(w, textExpr(L.vin)) };
    },
  });
  //  실제 엔트리 화면 설정이 없으면 «미구현» — 흐름이 끝난 것처럼 보이지 않게(검수 4차)
  //  사진을 언제 올리나(설정) — 엔트리는 사진 칸이 없다고 보고 undefined(사진 단계 없음)
  carinfo.photoPhase = C.carinfo.photoPhase || null;
  carmodoo.photoPhase = C.carmodoo.photoPhase || null;
  if (!(C.entry && C.entry.detail && C.entry.detail.carNo && C.entry.detail.vin && C.entry.list && C.entry.list.rows)) delete entry.readSavedDetail;
  //  목록에 차대번호 칸이 있는 전산은 저장 확인 때 차대번호를 반드시 읽음(8차)
  carmodoo.listHasVin = !!(C.carmodoo.list && C.carmodoo.list.cols && C.carmodoo.list.cols.vin != null);
  entry.implemented = !!(C.entry && C.entry.loggedIn && (C.entry.nextNumber || Q) && (C.entry.loadButton || (Q && Q.loadText)) &&
    C.entry.list && C.entry.list.rows && C.entry.list.cols && C.entry.loaded && C.entry.loaded.entryNo && C.entry.loaded.carNo && C.entry.loaded.vin);

  return { carinfo, carmodoo, entry };
}

module.exports = { createElectronAdapters, inAnyFrame, listExpr, carmodooNumberExpr, carmodooReadExpr, saveButtonExpr, buttonExpr };
