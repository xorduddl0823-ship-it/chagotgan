/**
 * 경기조합 차대번호 조회
 * ------------------------------------------------------------------
 * 경기조합 등록화면([2 자동차기본정보])은 차량번호를 넣고 [검색] 을 누르면
 * 원부에서 차대번호 전체를 끌어온다. 카인포는 차대번호 앞 11자리만 자동으로
 * 채워지고 뒷 6자리는 사람이 쳐야 하므로, 여기서 받아온 전체 차대번호의
 * 뒷 6자리를 카인포에 넣어 준다.
 *
 * [검색] 버튼의 id 를 모르기 때문에 화면의 글자로 찾는다.
 * 차량번호 칸과 같은 줄에 있는 '검색' 버튼만 고르므로 다른 검색 버튼과 섞이지 않는다.
 */

function buildLookupScript({ carNo }) {
  const P = JSON.stringify({ carNo: carNo || '' });

  return `(async function () {
  var P = ${P};
  var log = [];
  var step = '시작';
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function fail(msg) { return { ok: false, error: msg, step: step, log: log }; }

  var norm = function (s) { return String(s || '').replace(/[\\s\\-]/g, ''); };
  var txt = function (el) { return String((el && (el.value || el.textContent)) || '').replace(/\\s+/g, ' ').trim(); };

  async function waitFor(fn, ms) {
    var t = Date.now();
    while (Date.now() - t < (ms || 10000)) {
      try { var v = fn(); if (v) return v; } catch (e) {}
      await sleep(150);
    }
    return null;
  }

  // ── 0. 화면 확인 ────────────────────────────────────────────────
  step = '경기조합 화면 확인';
  if (document.querySelector('input[type=password]') || /login/i.test(location.pathname)) {
    return fail('경기조합 로그인이 필요합니다.\\n경기조합 창에서 로그인한 뒤 다시 눌러 주세요.');
  }

  var carEl = document.querySelector('#j_carNumber');
  var vinEl = document.querySelector('#j_viNumber');
  if (!carEl) {
    return fail('경기조합 등록화면이 아닙니다.\\n경기조합 창에서 성능점검 등록화면을 연 뒤 다시 눌러 주세요.');
  }
  log.push('경기조합 등록화면 확인');

  // 이미 같은 차량의 차대번호가 들어 있으면 그대로 쓴다
  if (vinEl && txt(vinEl) && norm(txt(carEl)) === norm(P.carNo)) {
    log.push('이미 조회된 차대번호를 사용합니다.');
    return { ok: true, vin: txt(vinEl), reused: true, log: log };
  }

  // ── 1. 차량번호 입력 ────────────────────────────────────────────
  step = '차량번호 입력';
  if (!P.carNo) return fail('차량번호가 비어 있습니다.');

  function setVal(el, v) {
    try {
      var d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (d && d.set) d.set.call(el, v); else el.value = v;
    } catch (e) { el.value = v; }
    ['input', 'keyup', 'change'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
  }
  carEl.focus();
  setVal(carEl, P.carNo);
  if (norm(carEl.value) !== norm(P.carNo)) {
    return fail('차량번호가 입력되지 않았습니다. (입력 제한일 수 있습니다)');
  }
  log.push('차량번호 입력: ' + carEl.value);

  // ── 2. [검색] 누르기 ────────────────────────────────────────────
  //  차량번호 칸이 속한 줄(또는 가까운 상위 요소) 안에서 '검색' 버튼을 찾는다.
  //  '중복체크' 처럼 옆에 있는 다른 버튼과 섞이지 않도록 글자가 정확히 맞는 것만 고른다.
  step = '차대번호 검색';
  function findSearchBtn() {
    var scope = carEl.closest ? (carEl.closest('tr') || carEl.closest('div') || document) : document;
    for (var depth = 0; depth < 4 && scope; depth++) {
      var cands = Array.prototype.slice.call(
        scope.querySelectorAll('button, input[type=button], input[type=submit], a, span.btn, .btn')
      );
      for (var i = 0; i < cands.length; i++) {
        var t = txt(cands[i]);
        if (t === '검색' || t === '조회') return cands[i];
      }
      scope = scope.parentElement;
    }
    return null;
  }

  var btn = findSearchBtn();
  if (!btn) {
    return fail('[검색] 버튼을 찾지 못했습니다.\\n경기조합 창에서 차량번호를 넣고 직접 [검색] 을 누른 뒤 다시 시도해 주세요.');
  }

  var before = vinEl ? txt(vinEl) : '';
  btn.click();
  log.push('[검색] 누름');

  // ── 3. 차대번호가 채워질 때까지 대기 ────────────────────────────
  step = '차대번호 받기';
  var vin = await waitFor(function () {
    var el = document.querySelector('#j_viNumber');
    var v = el ? txt(el) : '';
    return v && v !== before ? v : null;
  }, 20000);

  // 안내창이 떴으면 문구를 남긴다 (없는 차량 등)
  var alertTxt = '';
  var swal = document.querySelector('.swal2-html-container, .swal2-title, .layer_alert, .modal.show');
  if (swal) alertTxt = txt(swal).slice(0, 140);

  if (!vin) {
    var diag = [];
    ['#j_carNumber', '#j_viNumber', '#j_model', '#j_year'].forEach(function (q) {
      var e = document.querySelector(q);
      diag.push(q + (e ? ' 값="' + txt(e) + '"' : ' 없음'));
    });
    if (alertTxt) diag.push('안내창: ' + alertTxt);
    return fail('차대번호를 받아오지 못했습니다.\\n경기조합 창에서 직접 [검색] 해 보고 결과를 확인해 주세요.\\n\\n[진단] ' + diag.join(' | '));
  }

  vin = vin.replace(/\\s/g, '').toUpperCase();
  log.push('차대번호 확보: ' + vin + ' (' + vin.length + '자리)');

  return {
    ok: true,
    vin: vin,
    notice: alertTxt || null,
    log: log,
  };
})();`;
}

/** 차대번호 뒷 6자리 — 카인포의 둘째 칸에 넣을 값 */
function vinTail(vin, len) {
  const v = String(vin || '').replace(/\s/g, '').toUpperCase();
  const n = len || 6;
  return v.length > n ? v.slice(-n) : v;
}

/** 카인포 차대번호 칸에 값을 넣는 스크립트 (앞칸은 비어 있을 때만 채운다) */
function buildVinFillScript(vin, tailLen) {
  const tail = vinTail(vin, tailLen);
  const head = String(vin || '').replace(/\s/g, '').toUpperCase().slice(0, Math.max(0, String(vin || '').replace(/\s/g, '').length - tail.length));

  return `(function () {
  var head = ${JSON.stringify(head)}, tail = ${JSON.stringify(tail)};
  function setVal(el, v) {
    try {
      var d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (d && d.set) d.set.call(el, v); else el.value = v;
    } catch (e) { el.value = v; }
    ['input', 'keyup', 'change', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
  }

  var a = document.querySelector('#vin1'), b = document.querySelector('#vin2');
  if (!b) return { ok: false, error: '카인포 차대번호 칸(#vin2)을 찾지 못했습니다. 등록 화면이 열려 있는지 확인해 주세요.' };

  var note = [];
  //  앞자리는 카인포가 원부에서 이미 채운다. 비어 있을 때만 보충한다.
  if (a && !String(a.value || '').trim() && head) { setVal(a, head); note.push('앞자리 보충'); }
  setVal(b, tail);

  var ok = String(b.value || '').trim().toUpperCase() === tail;
  return {
    ok: ok,
    vin1: a ? String(a.value || '') : '',
    vin2: String(b.value || ''),
    note: note.join(', '),
    error: ok ? null : '뒷자리가 입력되지 않았습니다. (입력 제한일 수 있습니다)',
  };
})();`;
}

module.exports = { buildLookupScript, buildVinFillScript, vinTail };
