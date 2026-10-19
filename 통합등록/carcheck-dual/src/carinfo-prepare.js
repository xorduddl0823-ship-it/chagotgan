/**
 * 카인포 신규등록 자동 진행
 *
 *  사람이 하는 순서를 그대로 따라간다:
 *    [신규등록]
 *      > 차량번호 입력
 *      > 상사/딜러/연락처 칸에 딜러명 입력
 *      > [검색]
 *      > 목록에서 딜러 확인 후 [선택]
 *      > [확인]
 *    -> 성능점검 등록 화면 진입
 *
 *  중요: 딜러는 반드시 목록의 [선택] 버튼을 "클릭" 해야 한다.
 *  값만 몰래 채워 넣으면 모달이 검색 모드에 머물러 [확인] 이 통하지 않는다.
 *  (내부적으로 resetNewCarNoDealer() 가 돌아야 선택 상태로 전환됨)
 */

function buildPrepareScript({ carNo, dealer, pickKey, tradePersonal, clientName, hp, ckId }) {
  const P = JSON.stringify({
    carNo: carNo || '',
    dealer: dealer || '',
    pickKey: pickKey || '',
    tradePersonal: !!tradePersonal,
    clientName: clientName || '',
    hp: hp || '',
    ckId: ckId || '',
  });

  return `(async function () {
  var P = ${P};
  var log = [];
  var step = '시작';
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function fail(msg) { return { ok: false, error: msg, step: step, log: log }; }

  async function waitFor(fn, ms) {
    var t = Date.now();
    while (Date.now() - t < (ms || 10000)) {
      try { var v = fn(); if (v) return v; } catch (e) {}
      await sleep(150);
    }
    return null;
  }

  async function killSwal() {
    var btn = await waitFor(function () { return document.querySelector('.swal2-confirm'); }, 2500);
    if (!btn) return null;
    var msg = ((document.querySelector('.swal2-html-container') || {}).textContent || '') + ' ' +
              ((document.querySelector('.swal2-title') || {}).textContent || '');
    msg = msg.replace(/\\s+/g, ' ').trim();
    if (msg) log.push('안내창: ' + msg.slice(0, 140));
    btn.click();
    await sleep(400);
    return msg;
  }

  var norm = function (s) { return String(s || '').replace(/[\\s\\-()]/g, ''); };

  var $ = window.jQuery;
  if (!$) return fail('페이지가 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.');

  // ── 0-A. 화면 준비 (로그인 / 메뉴 / 공지팝업) ────────────────────
  step = '카인포 화면 준비';

  // 로그인 화면인지
  if (/login|signin/i.test(location.pathname) || document.querySelector('input[type=password]')) {
    return fail('카인포 로그인이 필요합니다.\\n카인포 창에서 로그인한 뒤 다시 눌러 주세요.');
  }

  // 공지사항 등 떠 있는 팝업 닫기 (버튼 클릭을 가로막는다)
  function closeStrayModals() {
    var closed = 0;
    Array.prototype.slice.call(document.querySelectorAll('.modal.show')).forEach(function (m) {
      if (m.id === 'modalNewCarNo') return;
      var x = m.querySelector('[data-bs-dismiss=modal], .btn-close, .btn-cancel');
      if (x) { x.click(); closed++; }
      else { m.classList.remove('show'); m.style.display = 'none'; closed++; }
    });
    Array.prototype.slice.call(document.querySelectorAll('.modal-backdrop')).forEach(function (b) {
      b.parentNode && b.parentNode.removeChild(b);
    });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    return closed;
  }
  var closedCount = closeStrayModals();
  if (closedCount) { log.push('떠 있던 팝업 ' + closedCount + '개 닫음'); await sleep(400); }

  // 성능점검 등록관리 화면인지 확인
  //  ※ 좌측 메뉴 클릭은 페이지 전체를 새로 불러오기 때문에 이 스크립트가 중간에 죽는다.
  //    화면 이동은 앱 본체(main.js ensureCarinfoReady)가 미리 끝내둔다.
  var ready = await waitFor(function () { return document.querySelector('#btnNewCarcheck'); }, 8000);
  if (!ready) {
    return fail('성능점검 등록관리 화면이 아닙니다.\\n카인포 창에서 [성능점검 관리 > 성능점검] 을 연 뒤 다시 눌러 주세요.');
  }
  closeStrayModals();
  log.push('성능점검 등록관리 화면 확인');

  // ── 0-B. 이미 등록 화면이 열려 있는지 ────────────────────────────
  step = '기존 화면 확인';
  var openNo = (document.querySelector('#checkNo') || {}).value || '';
  var openCar = (document.querySelector('#carNo') || {}).value || '';
  if (openNo && openCar) {
    if (P.carNo && norm(openCar) !== norm(P.carNo)) {
      return fail('다른 차량(' + openCar + ' · 점검번호 ' + openNo + ')의 등록 화면이 열려 있습니다.\\n카인포 창에서 목록으로 돌아간 뒤 다시 시도하세요.');
    }
    log.push('이미 ' + openCar + ' 등록 화면이 열려 있어 신규생성을 건너뜁니다.');
    return { ok: true, skipped: true, checkNo: openNo, carNo: openCar, log: log };
  }
  if (!P.carNo) return fail('차량번호가 비어 있습니다.');

  // ── 0-C. 같은 차 오늘 등록이 이미 있는지 (10/19 경기조합 중복 사고 뒤 — 카인포도 신규등록 전에 확인) ──
  //  목록 표(#carcheckTable)를 못 찾으면 확인할 수 없으므로 신규등록을 하지 않는다.
  step = '같은 차 확인';
  var tbl = document.querySelector('#carcheckTable');
  if (!tbl) return fail('성능점검 목록을 찾지 못해 같은 차 등록이 이미 있는지 확인하지 못했어요. 신규등록을 하지 않았어요.\\n카인포 창을 성능점검 목록 화면으로 두고 다시 눌러 주세요.');
  var heads = [].map.call(tbl.querySelectorAll('thead th, thead td'), function (h) { return norm(h.textContent); });
  var iCar = heads.indexOf('차량번호'); if (iCar < 0) iCar = 2;
  var iNo = heads.indexOf('점검번호'); if (iNo < 0) iNo = heads.indexOf('성능번호'); if (iNo < 0) iNo = 3;
  var dd = new Date(), today = dd.getFullYear() + '-' + ('0' + (dd.getMonth() + 1)).slice(-2) + '-' + ('0' + dd.getDate()).slice(-2);
  var dup = [];
  [].forEach.call(tbl.querySelectorAll('tbody tr'), function (tr) {
    var c = tr.querySelectorAll('td');
    if (norm((c[iCar] || {}).textContent) !== norm(P.carNo)) return;
    if (norm(tr.textContent).indexOf(norm(today)) < 0) return;      // 오늘 줄만(같은 차가 다른 날 다시 점검받는 것은 정상) — 날짜도 줄표 빼고 견줌
    dup.push(norm((c[iNo] || {}).textContent) || '(번호 없음)');
  });
  if (dup.length) {
    return fail('카인포에 이 차(' + P.carNo + ')의 오늘 등록이 이미 있어요(점검번호 ' + dup.join(', ') + '). 신규등록을 하지 않았어요.\\n' +
                '목록에서 그 줄을 열어 이어서 하거나, 같은 차가 여러 건이면 정리는 대표님(관리자)이 판단해 주세요.');
  }
  log.push('같은 차 오늘 등록 없음(목록 ' + tbl.querySelectorAll('tbody tr').length + '줄 확인)');

  // ── 1. [신규등록] ────────────────────────────────────────────────
  step = '신규등록 창 열기';
  var newBtn = document.querySelector('#btnNewCarcheck');
  if (!newBtn) return fail('[신규등록] 버튼을 찾을 수 없습니다. 카인포 창이 성능점검 목록 화면인지 확인하세요.');
  closeStrayModals();
  newBtn.click();

  var modal = await waitFor(function () {
    var m = document.querySelector('#modalNewCarNo');
    return (m && m.classList.contains('show')) ? m : null;
  }, 6000);
  if (!modal) return fail('신규등록 창이 열리지 않았습니다.');
  await sleep(400);
  var $m = $(modal);
  log.push('신규등록 창 열림');

  // ── 2. 점검원 / 차량번호 / 거래유형 ──────────────────────────────
  step = '차량번호 입력';
  if (P.ckId) $m.find('select[name=ck_id]').val(P.ckId).trigger('change');

  var carInput = modal.querySelector('#newCarNo');
  if (!carInput) return fail('차량번호 입력칸을 찾을 수 없습니다.');
  carInput.focus();
  $(carInput).val(P.carNo).trigger('input').trigger('keyup').trigger('change');
  if (norm(carInput.value) !== norm(P.carNo)) return fail('차량번호가 입력되지 않았습니다. (입력 마스크 제한일 수 있습니다)');
  log.push('차량번호 입력: ' + carInput.value);

  var cb = modal.querySelector('#newCarNoTradeType');
  if (cb && cb.checked !== P.tradePersonal) { cb.click(); await sleep(400); }

  // ── 3. 딜러 / 고객 ───────────────────────────────────────────────
  if (P.tradePersonal) {
    step = '고객 정보 입력';
    $m.find('input[name=personal_name]').val(P.clientName).trigger('change');
    $m.find('input[name=de_hp_no]').val(P.hp).trigger('change');
    log.push('개인간 거래 · 고객명 ' + (P.clientName || '(미입력)'));

  } else {
    step = '딜러 검색';
    if (!P.dealer) return fail('딜러명이 비어 있습니다.');

    // 검색 목록 영역이 닫혀 있으면 연다
    var tableArea = modal.querySelector('#newCarNoDealerTableArea');
    if (!tableArea || tableArea.classList.contains('d-none')) {
      var openSearch = modal.querySelector('#btnSearchDealerOpen');
      if (openSearch) { openSearch.click(); await sleep(600); }
      tableArea = modal.querySelector('#newCarNoDealerTableArea');
    }
    if (!tableArea) return fail('딜러 검색 목록 영역을 찾을 수 없습니다.');

    // 검색어 입력 후 [검색] 클릭
    var sInput = modal.querySelector('input[name=search_de_text]');
    if (!sInput) return fail('상사/딜러/연락처 입력칸을 찾을 수 없습니다.');

    //  카인포는 Vue + jQuery 혼용이다. jQuery .val() 만으로는 Vue 쪽 모델이
    //  갱신되지 않아 검색어가 서버로 안 나갈 수 있다. 네이티브 setter 로 넣고
    //  input/change 를 모두 발생시켜 양쪽이 다 보게 한다.
    function setVal(el, v) {
      try {
        var d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(el, v); else el.value = v;
      } catch (e) { el.value = v; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try { $(el).trigger('input').trigger('keyup').trigger('change'); } catch (e) {}
    }
    sInput.focus();
    setVal(sInput, P.dealer);

    //  통신을 직접 가로채 (1) 진행 중인 요청 수와 (2) 서버 응답 본문을 기록한다.
    //
    //  jQuery 의 $.active / ajaxComplete 만 믿으면 안 된다. 카인포는 Vue 앱이라
    //  일부 요청이 fetch 나 순수 XHR 로 나가는데, 그러면 $.active 가 0 으로 고정되어
    //  "응답을 기다린다" 는 판단 자체가 무너진다. XHR 과 fetch 를 모두 감싼다.
    //  (한 번만 설치한다 — __ccdHooked)
    if (!window.__ccdHooked) {
      window.__ccdHooked = true;
      window.__ccdPending = 0;
      window.__ccdLog = [];
      var rec = function (url, status, body) {
        window.__ccdLog.push({
          url: String(url || ''),
          status: status,
          body: String(body || '').slice(0, 400),
        });
      };
      var dec = function () { window.__ccdPending = Math.max(0, window.__ccdPending - 1); };

      try {
        var xOpen = window.XMLHttpRequest.prototype.open;
        var xSend = window.XMLHttpRequest.prototype.send;
        window.XMLHttpRequest.prototype.open = function (m, u) {
          this.__ccdUrl = u;
          return xOpen.apply(this, arguments);
        };
        window.XMLHttpRequest.prototype.send = function () {
          var self = this;
          window.__ccdPending++;
          var done = false;
          self.addEventListener('loadend', function () {
            if (done) return;
            done = true;
            dec();
            var b = '';
            try { b = self.responseText || ''; } catch (e2) {}
            rec(self.__ccdUrl, self.status, b);
          });
          return xSend.apply(this, arguments);
        };
      } catch (e) {}

      try {
        if (window.fetch) {
          var fOrig = window.fetch;
          window.fetch = function (input, init) {
            var url = (input && input.url) ? input.url : input;
            window.__ccdPending++;
            return fOrig.apply(this, arguments).then(
              function (res) {
                dec();
                try {
                  res.clone().text().then(function (t) { rec(url, res.status, t); }, function () {});
                } catch (e2) {}
                return res;
              },
              function (err) { dec(); rec(url, 0, 'error: ' + err); throw err; }
            );
          };
        }
      } catch (e) {}
    }
    window.__ccdLog = [];

    var searchBtn = modal.querySelector('#btnDeSearchDealer2');
    if (!searchBtn) return fail('[검색] 버튼을 찾을 수 없습니다.');

    function tbodyEl() { return modal.querySelector('#newCarNoDealerTable tbody'); }
    function hasRows() { var t = tbodyEl(); return !!(t && t.querySelector('.select-row')); }
    //  '결과 없음' 행인지 판정한다.
    //  주의: DataTables 는 로딩 중에도 colspan 짜리 '처리 중...' 행을 그린다.
    //  그것을 '결과 없음' 으로 세면 원래 버그가 그대로 재발하므로 문구로 걸러낸다.
    function hasEmptyMark() {
      var t = tbodyEl();
      if (!t) return false;
      if (t.querySelector('.dataTables_empty')) return true;
      var span = t.querySelector('td[colspan]');
      if (!span) return false;
      var txt = (span.textContent || '').trim();
      if (/처리|로딩|잠시|loading|processing/i.test(txt)) return false;
      return txt.length > 0;
    }

    //  목록이 "확정" 될 때까지 기다린다.
    //
    //  이전 방식은 tbody 의 innerHTML 이 조금이라도 바뀌면 대기를 풀었다.
    //  그런데 DataTables 는 검색을 시작할 때 tbody 를 먼저 비우거나 '처리 중' 행을
    //  그린다. 그 순간 조건이 참이 되어, 서버 응답이 도착하기도 전에 0건으로
    //  단정해 버렸다. ("검색된 딜러가 없습니다" 오진의 원인)
    //
    //  이제는 아래를 모두 만족해야 확정으로 본다.
    //    · 진행 중인 AJAX 가 없다        ($.active === 0)
    //    · 실제 행이 있거나, DataTables 의 '결과 없음' 행이 그려졌다
    //    · 그 상태로 tbody 가 400ms 이상 변하지 않았다
    async function waitTableSettled(ms) {
      var t0 = Date.now();
      var lastHtml = null;
      var stableAt = 0;
      while (Date.now() - t0 < ms) {
        var busy = false;
        try { busy = ($.active || 0) > 0 || (window.__ccdPending || 0) > 0; } catch (e) {}
        var t = tbodyEl();
        var html = t ? t.innerHTML : '';
        var rowsNow = hasRows();
        var emptyNow = hasEmptyMark();
        if (!busy && (rowsNow || emptyNow)) {
          if (html !== lastHtml) { lastHtml = html; stableAt = Date.now(); }
          else if (Date.now() - stableAt >= 400) return rowsNow ? 'rows' : 'empty';
        } else {
          lastHtml = null;
        }
        await sleep(120);
      }
      return 'timeout';
    }

    searchBtn.click();
    log.push('딜러 검색: "' + P.dealer + '"');
    var settled = await waitTableSettled(15000);

    //  끝내 확정되지 않았으면 한 번만 다시 검색한다 (일시적 지연 대비)
    if (settled === 'timeout') {
      log.push('첫 검색 응답이 확정되지 않아 재시도');
      setVal(sInput, P.dealer);
      searchBtn.click();
      settled = await waitTableSettled(15000);
    }
    log.push('목록 상태: ' + settled);

    // 목록 읽기
    step = '딜러 목록 확인';
    function readRows() {
      var trs = Array.prototype.slice.call(modal.querySelectorAll('#newCarNoDealerTable tbody tr'));
      var out = [];
      trs.forEach(function (tr) {
        var btn = tr.querySelector('.select-row');
        if (!btn) return;
        var td = tr.querySelectorAll('td');
        if (td.length < 4) return;
        var deCell = (td[3].textContent || '').trim();
        var m = deCell.match(/^(.*?)\\s*\\((.*)\\)\\s*$/);
        out.push({
          key: deCell,
          jh: (td[1].textContent || '').trim(),
          dc: (td[2].textContent || '').trim(),
          de: m ? m[1].trim() : deCell,
          hp: m ? m[2].trim() : '',
          btn: btn,
        });
      });
      return out;
    }

    var rows = readRows();

    //  0건일 때는 반드시 "왜 0건인지" 근거를 함께 돌려준다.
    if (!rows.length) {
      var seen = (window.__ccdLog || []).filter(function (a) { return /dealer/i.test(a.url); });
      var evid = seen.length
        ? seen.map(function (a) {
            return a.status + ' ' + a.url.split('?')[0] + ' -> ' +
                   a.body.replace(/\\s+/g, ' ').slice(0, 160);
          }).join(' | ')
        : '딜러 조회 요청이 아예 나가지 않았습니다 (검색어가 서버로 전달되지 않은 것으로 보입니다)';
      log.push('서버 응답: ' + evid);

      if (settled === 'timeout') {
        return fail('딜러 목록이 끝내 표시되지 않았습니다. (응답 지연 또는 화면 오류)\\n카인포 창에서 직접 검색해 보고, 잘 되면 다시 시도해 주세요.\\n\\n[진단] ' + evid);
      }
      if (settled === 'rows') {
        return fail('딜러 목록은 표시됐지만 내용을 읽지 못했습니다.\\n카인포 표 구조가 바뀐 것으로 보입니다. (src/carinfo-prepare.js 의 readRows 수정 필요)\\n\\n[진단] ' + evid);
      }
      return fail('"' + P.dealer + '" 로 검색된 딜러가 없습니다.\\n상사명 · 딜러명 · 연락처 중 하나로 다시 입력해 보세요.\\n연락처는 숫자만, 상사명은 앞 두 글자만으로도 검색됩니다.\\n\\n[진단] ' + evid);
    }

    // 전체 건수 확인 (검색이 안 걸리고 전체 목록이 나온 경우 방지)
    var infoEl = modal.querySelector('#newCarNoDealerTable_info') ||
                 modal.querySelector('.dataTables_info');
    var infoTxt = infoEl ? (infoEl.textContent || '').replace(/\\s+/g, ' ').trim() : '';
    if (infoTxt) log.push('검색 결과: ' + infoTxt);

    // 선택할 행 고르기
    var pick = null;
    if (P.pickKey) {
      rows.forEach(function (r) { if (r.key === P.pickKey) pick = r; });
      if (!pick) return fail('선택한 딜러를 목록에서 다시 찾지 못했습니다. 다시 시도해 주세요.');
    } else {
      var exact = rows.filter(function (r) { return r.de === P.dealer; });
      if (exact.length === 1) pick = exact[0];
      else if (exact.length === 0 && rows.length === 1) pick = rows[0];
    }

    if (!pick) {
      // 자동으로 고르지 않는다 — 사용자가 직접 선택
      return {
        ok: false, needPick: true, step: step, log: log,
        candidates: rows.slice(0, 50).map(function (r) {
          return { key: r.key, jh: r.jh, dc: r.dc, de: r.de, hp: r.hp };
        }),
      };
    }

    // ★ 실제 [선택] 버튼 클릭 — 이 단계가 빠지면 [확인] 이 통하지 않는다
    step = '딜러 선택';
    pick.btn.click();
    log.push('딜러 선택: ' + pick.dc + ' / ' + pick.de + (pick.hp ? ' (' + pick.hp + ')' : ''));

    // 선택이 반영될 때까지 대기 (목록이 닫히고 딜러명이 채워짐)
    var applied = await waitFor(function () {
      var v = (modal.querySelector('input[name=de_name]') || {}).value || '';
      return v ? v : null;
    }, 5000);
    if (!applied) return fail('딜러 선택이 반영되지 않았습니다. 카인포 창에서 직접 선택한 뒤 다시 시도해 주세요.');
    await sleep(400);
  }

  // ── 4. [확인] ────────────────────────────────────────────────────
  step = '확인 클릭';
  var ok = modal.querySelector('.btn-ok');
  if (!ok) return fail('[확인] 버튼을 찾을 수 없습니다.');
  ok.click();
  log.push('확인 클릭 — 차량 조회 중');

  await sleep(1500);
  var notice = await killSwal();

  // "차량정보가 없습니다" 안내
  var noCar = modal.querySelector('#noCarContent');
  if (noCar && !noCar.classList.contains('d-none')) {
    return fail('카인포에 해당 차량의 원부 정보가 없습니다.\\n카인포 창에서 [수동 입력]으로 직접 진행해 주세요.');
  }

  // 모달이 안 닫혔다면 검증에 걸린 것
  if (modal.classList.contains('show')) {
    var warn = modal.querySelector('.invalid-feedback-sub');
    var wtxt = warn ? (warn.textContent || '').trim() : '';
    await sleep(2500);
    if (modal.classList.contains('show')) {
      return fail('신규등록 창이 닫히지 않았습니다.' + (wtxt ? '\\n안내: ' + wtxt : '') + '\\n카인포 창 상태를 확인해 주세요.');
    }
  }

  // ── 5. 등록 화면 진입 대기 ───────────────────────────────────────
  step = '등록 화면 진입';

  //  [확인] 이후 카인포가 하는 일은 한 가지가 아니다.
  //    (가) 곧바로 인라인 등록 폼을 열어주는 경우
  //    (나) '성능이 등록되었습니다' 안내만 띄우고 목록을 새로고침하는 경우
  //         — 이때는 목록에서 해당 차량 행을 눌러야 폼이 열린다
  //  예전에는 (가)만 가정하고 #checkNo 만 20초 기다렸다가 실패했다.
  //  이제 두 경우를 모두 받아들이고, (나)면 목록에서 직접 연다.

  function formNo() {
    var el = document.querySelector('#checkNo');
    return el && el.value ? String(el.value).trim() : '';
  }
  //  점검번호가 아직 안 채워졌어도 폼 자체가 열렸는지 본다
  function formOpen() {
    return !!(document.querySelector('#carModel') ||
              document.querySelector('#vin1') ||
              document.querySelector('#gearboxCd'));
  }
  function findRow() {
    var trs = Array.prototype.slice.call(document.querySelectorAll('#carcheckTable tbody tr'));
    for (var i = 0; i < trs.length; i++) {
      if (!trs[i].querySelector('td')) continue;
      if (norm(trs[i].textContent || '').indexOf(norm(P.carNo)) >= 0) return trs[i];
    }
    return null;
  }

  await killSwal();

  var no = await waitFor(function () { return formNo() || (formOpen() ? '-' : null); }, 12000);

  //  (나) 목록만 새로고침된 경우 — 우리 차량 행을 찾아 직접 연다
  if (!no) {
    var row = await waitFor(findRow, 8000);
    if (row) {
      var target = row.querySelector('a, button, .btn') || row.querySelector('td') || row;
      target.click();
      log.push('목록에서 ' + P.carNo + ' 행을 열었습니다.');
      await sleep(600);
      await killSwal();
      no = await waitFor(function () { return formNo() || (formOpen() ? '-' : null); }, 15000);
    }
  }

  await killSwal();

  if (!no) {
    //  화면에 실제로 무엇이 있는지 남긴다. 다음 수정의 출발점.
    var diag = ['주소 ' + location.pathname];
    ['#checkNo', '#carNo', '#carModel', '#carYear', '#vin1', '#gearboxCd'].forEach(function (q) {
      var e2 = document.querySelector(q);
      diag.push(q + (e2 ? ' 값="' + (e2.value || '') + '"' : ' 없음'));
    });
    var mods = Array.prototype.slice.call(document.querySelectorAll('.modal.show'))
      .map(function (m) { return m.id || '(id없음)'; });
    diag.push('열린 모달 ' + (mods.join(',') || '없음'));
    diag.push('목록에 ' + P.carNo + ' 행 ' + (findRow() ? '있음' : '없음'));
    var d = diag.join(' | ');
    log.push('화면 상태: ' + d);

    return fail('등록 화면으로 넘어가지 못했습니다.\\n' +
      (notice ? '카인포 안내: ' + notice + '\\n' : '') +
      '카인포 창에서 목록의 해당 차량을 직접 열어 확인해 주세요.\\n\\n[진단] ' + d);
  }

  if (no === '-') log.push('등록 화면 진입 (점검번호는 화면에 표시되지 않음)');
  else log.push('성능점검번호 발급: ' + no);

  //  원부 조회는 폼이 열린 뒤에도 조금 더 걸린다.
  //  차량정보가 실제로 채워진 것을 확인하고 성공을 돌려줘야, 앱이 곧바로 실행하는
  //  되읽기(scraper.js)가 빈 폼을 긁어 "가져온 값 없음" 이 되는 일을 막을 수 있다.
  step = '차량정보 채워지기 대기';
  var filled = await waitFor(function () {
    var a = document.querySelector('#carModel');
    var b = document.querySelector('#vin1');
    var c = document.querySelector('#carYear');
    var v = ((a && a.value) || '') + ((b && b.value) || '') + ((c && c.value) || '');
    return v.trim() ? true : null;
  }, 20000);

  if (!filled) {
    log.push('주의: 차량정보가 비어 있습니다 (원부 조회 실패 또는 지연). 직접 입력이 필요할 수 있습니다.');
  } else {
    var have = [];
    [['차명', '#carModel'], ['연식', '#carYear'], ['차대번호', '#vin1'],
     ['최초등록일', '#firstDate'], ['검사유효기간', '#inspectionDate1'],
     ['변속기', '#gearboxCd'], ['연료', '#fuelCd'],
     ['원동기형식', '#motorform'], ['배기량', '#enginesize'],
     ['차종구분', '#importGbn']].forEach(function (p) {
      var e3 = document.querySelector(p[1]);
      if (e3 && String(e3.value || '').trim() && String(e3.value).trim() !== '0') have.push(p[0]);
    });
    log.push('카인포가 채운 항목: ' + (have.join(' · ') || '없음'));
  }

  return {
    ok: true,
    checkNo: no,
    carNo: (document.querySelector('#carNo') || {}).value || P.carNo,
    log: log,
    notice: notice || null,
  };
})();`;
}

module.exports = { buildPrepareScript };
