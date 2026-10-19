/*  시험용 «흉내 세 전산» — 카인포·카모두·엔트리의 목록·저장·번호를 메모리로 흉내 낸다.
 *  등록 흐름(register-flow)과 안전 모듈을 이어 붙였을 때 단계별로 맞게 움직이는지 보는 모의 통합 시험용.
 *  저장 통제기는 진짜(save-guard)를 쓴다 — «사람이 [저장]을 누름»은 human.clickSave(site) 로 흉내.
 *  값은 모두 가짜. */
const { createSaveGuard } = require('../../src/core/save-guard');

function createWorld(opts = {}) {
  const w = {
    carinfo: { rows: (opts.carinfoRows || []).slice(), seq: opts.carinfoSeq || 100, form: { open: false, carNo: '', checkNo: '' }, prepares: 0 },
    photos: { carinfo: [], carmodoo: [] },          // 올라간 사진 칸(올린 차례대로)
    carmodoo: { rows: (opts.carmodooRows || []).slice(), form: { autoAssignOn: true, numberValue: '' } },
    entry: { rows: (opts.entryRows || []).slice(), loggedIn: opts.entryLoggedIn !== false, next: null, loaded: null },
    faults: {},                         // 사이트별 고장 흉내: { carinfo: 'serverErrorButSaved' | 'networkLost' | 'foreignPopup' | 'vinPartial' | 'wrongNumber' }
    calls: [],
  };
  const host = { carinfo: 'ci.mock', carmodoo: 'cm.mock', entry: 'en.mock' };
  const guards = {};
  let rid = 0;

  function newGuard(site) {
    const g = createSaveGuard({ siteHosts: [host[site]], savePatterns: ['/save'], readAllow: ['/list'], confirmed: true });
    g.registerWindow('main'); g.attachWindow('main');
    guards[site] = g;
    return g;
  }

  /** 사이트에서 실제로 저장이 일어나면 생기는 일 */
  function commit(site, ctx) {
    if (site === 'carinfo' && w.carinfo.form.checkNo) {
      //  신규등록 때 이미 생긴 줄 → 저장하면 «완료»로 바뀜(새 줄 아님)
      const row = w.carinfo.rows.find((r) => r.checkNo === w.carinfo.form.checkNo);
      row.status = '완료';
      w.entry.next = row.checkNo;
      return row.checkNo;
    }
    if (site === 'carinfo') {
      const no = 'T-' + String(++w.carinfo.seq).padStart(4, '0');
      const vin = w.faults.carinfo === 'vinPartial' ? '*********' + ctx.vin.slice(-8) : ctx.vin;
      w.carinfo.rows.unshift({ checkNo: no, carNo: ctx.carNo, vin, date: ctx.date, status: '완료' });
      w.entry.next = no;                                           // 엔트리는 카인포 번호를 끌어온다
      return no;
    }
    if (site === 'carmodoo') {
      const no = w.faults.carmodoo === 'wrongNumber' ? 'T-9999' : w.carmodoo.form.numberValue;
      w.carmodoo.rows.unshift({ checkNo: no, carNo: ctx.carNo });
      if (w.faults.carmodoo === 'doubleRow') w.carmodoo.rows.unshift({ checkNo: no + '-2', carNo: ctx.carNo });
      return no;
    }
    const no = w.entry.loaded && w.entry.loaded.entryNo;
    //  실제 엔트리처럼 목록에는 차대번호가 없다 — 상세 화면(readSavedDetail)에서만 보임
    w.entry.rows.unshift({ checkNo: no, carNo: ctx.carNo, _vin: w.entry.loaded && w.entry.loaded.vin });
    return no;
  }

  const ctx = { carNo: '', vin: '', date: opts.date || '2026-10-19' };

  /** 사진 올리기 흉내 — faults.photoFail = 'photo3' 이면 그 칸 한 번 실패 */
  function photoUp(site, only) {
    const done = [];
    const missing = [];
    for (const k of only || []) {
      if (w.faults.photoFail === k) { w.faults.photoFail = null; missing.push(k + ' : 자리에 나타나지 않음(흉내)'); continue; }
      w.photos[site].push(k); done.push(k);
    }
    w.calls.push(site + '.photos:' + (only || []).join(','));
    return { done, missing };
  }

  /** 사람이 사이트 창에서 [저장]을 누름 — 저장 통제기를 거친다 */
  function clickSave(site) {
    const g = guards[site];
    const id = 'r' + (++rid);
    if (w.faults[site] === 'popupSave') {                         // 저장 단계에서 팝업이 열리고 그 팝업으로 저장
      g.registerWindow('popup-' + id, 'popup'); g.attachWindow('popup-' + id);
    }
    if (w.faults[site] === 'foreignPopup') {
      g.onRequest({ id, url: 'https://upload.other.example/save', method: 'POST', kind: 'popup' });
      return 'hold';
    }
    const v = g ? g.onRequest({ id, url: 'https://' + host[site] + '/save', method: 'POST', kind: 'ajax' }) : 'pass';
    if (v !== 'pass') return v;
    if (w.faults[site] === 'hangNoSave') return 'pass-no-response';         // 요청은 나갔는데 응답 없음(서버 저장 안 됨)
    const no = commit(site, ctx);
    if (w.faults[site] === 'hang') return 'saved-no-response:' + no;        // 저장은 됐는데 응답이 안 옴
    if (w.faults[site] === 'serverErrorButSaved') g.onResponse(id, 500);
    else if (w.faults[site] === 'networkLost') g.onNetworkError(id);
    else g.onResponse(id, 200);
    return 'saved:' + no;
  }

  const adapters = {
    carinfo: {
      ...(opts.prepare ? {
        async prepareState() { return { ...w.carinfo.form }; },
        async prepare(data) {
          w.calls.push('carinfo.prepare');
          w.carinfo.prepares++;
          if (w.faults.preparePick && !data.ciPickKey) return { ok: false, needPick: true, candidates: [{ key: 'k1', de: '시험딜러' }, { key: 'k2', de: '시험딜러' }] };
          if (w.faults.prepareCrash) { w.faults.prepareCrash = false; return { ok: false, error: '화면이 멈춤(흉내)' }; }
          let no = '';
          if (opts.prepareCreatesRow) {                       // 신규등록 [확인] 때 목록 줄·번호가 먼저 생기는 경우
            no = 'T-' + String(++w.carinfo.seq).padStart(4, '0');
            w.carinfo.rows.unshift({ checkNo: no, carNo: data.carNo, vin: data.vin, date: ctx.date, status: '작성중' });
          }
          w.carinfo.form = { open: true, carNo: data.carNo, checkNo: no };
          return { ok: true, checkNo: no };
        },
      } : {}),
      ...(opts.prepare ? { prepareCreatesRow: !!opts.prepareCreatesRow, savedStatus: opts.savedStatus || null } : {}),
      ...(opts.photoPhase && opts.photoPhase.carinfo !== undefined ? { photoPhase: opts.photoPhase.carinfo } : {}),
      async photos(data, o) { return photoUp('carinfo', o.only); },
      async readList(car) { return car ? w.carinfo.rows.filter((r) => r.carNo === car.carNo) : w.carinfo.rows.slice(); },
      async fill(data) { ctx.carNo = data.carNo; ctx.vin = data.vin; w.calls.push('carinfo.fill'); return { filled: ['차량번호'], missing: [] }; },
      async armGuard() { if (w.faults.armFail === 'carinfo') throw new Error('개발자 연결 실패(흉내)'); newGuard('carinfo'); },
      async unlockSave() { return guards.carinfo.unlock(); },
      async saveOutcome() { return guards.carinfo.outcome(); },
      async coverage() { return guards.carinfo ? guards.carinfo.coverage() : { windows: 0, unattachedWindows: [] }; },
      async seal() { guards.carinfo.seal(); },
      async clickSave() { w.calls.push('carinfo.clickSave'); return clickSave('carinfo'); },
      async timeout() { guards.carinfo.onTimeout(); },
    },
    carmodoo: {
      ...(opts.photoPhase && opts.photoPhase.carmodoo !== undefined ? { photoPhase: opts.photoPhase.carmodoo } : {}),
      async photos(data, o) { return photoUp('carmodoo', o.only); },
      async fill(data, extra) {
        ctx.carNo = data.carNo; ctx.vin = data.vin;
        w.carmodoo.form.autoAssignOn = false;                       // «자동 부여» 끄기
        w.carmodoo.form.numberValue = w.faults.carmodoo === 'typo' ? 'T-0000' : extra.checkNo;
        return { filled: ['성능점검번호'], missing: [] };
      },
      async readForm() { return { ...w.carmodoo.form }; },
      async readSaved(car) { const r = w.carmodoo.rows.find((x) => x.carNo === car.carNo); return r ? { checkNo: r.checkNo } : null; },
      async armGuard() { newGuard('carmodoo'); },
      async unlockSave() { return guards.carmodoo.unlock(); },
      async saveOutcome() { return guards.carmodoo.outcome(); },
      async coverage() { return guards.carmodoo ? guards.carmodoo.coverage() : { windows: 0, unattachedWindows: [] }; },
      async seal() { guards.carmodoo.seal(); },
      async clickSave() { w.calls.push('carmodoo.clickSave'); return clickSave('carmodoo'); },
      async timeout() { guards.carmodoo.onTimeout(); },
      async readList(car) { return w.carmodoo.rows.filter((x) => !car || x.carNo === car.carNo); },
    },
    entry: {
      async loginState() { return { loggedIn: w.entry.loggedIn, canRead: w.entry.loggedIn }; },
      async readNext() { return w.entry.next; },
      async refresh() { w.calls.push('entry.refresh'); },
      async release() { w.calls.push('entry.release'); guards.entry = null; },
      async fill(data, extra) {
        //  엔트리는 «다음 번호»로 카인포 기록을 끌어온다 — 다음 번호가 어긋나 있으면 다른 차가 끌려온다
        ctx.carNo = data.carNo; ctx.vin = data.vin;
        const no = w.entry.next;
        const row = w.carinfo.rows.find((r) => r.checkNo === no);
        w.entry.loaded = row ? { entryNo: no, carNo: row.carNo, vin: row.vin } : { entryNo: no, carNo: '', vin: '' };
        return { filled: ['성능점검번호'], missing: [] };
      },
      async load() {},
      async readLoaded() { return { ...w.entry.loaded }; },
      async readSaved(car) { const r = w.entry.rows.find((x) => x.carNo === car.carNo); return r ? { checkNo: r.checkNo } : null; },
      async armGuard() { newGuard('entry'); },
      async unlockSave() { return guards.entry.unlock(); },
      async saveOutcome() { return guards.entry.outcome(); },
      async coverage() { return guards.entry ? guards.entry.coverage() : { windows: 0, unattachedWindows: [] }; },
      async seal() { if (guards.entry) guards.entry.seal(); },
      async clickSave() { w.calls.push('entry.clickSave'); return clickSave('entry'); },
      async timeout() { guards.entry.onTimeout(); },
      async readList(car) { return w.entry.rows.filter((x) => !car || x.carNo === car.carNo).map((x) => ({ checkNo: x.checkNo, carNo: x.carNo })); },
      /** 저장한 기록의 상세 화면 — faults.entryDetail: 'none'(못 엶) · 'otherVin'(다른 차대번호) */
      async readSavedDetail(no) {
        if (w.faults.entryDetail === 'none') return null;
        const r = w.entry.rows.find((x) => x.checkNo === no);
        if (!r) return null;
        return { carNo: r.carNo, vin: w.faults.entryDetail === 'otherVin' ? 'KMHZZ00ZZZZ999999' : r._vin };
      },
    },
  };

  return { world: w, adapters, human: { clickSave }, guards };
}

module.exports = { createWorld };
