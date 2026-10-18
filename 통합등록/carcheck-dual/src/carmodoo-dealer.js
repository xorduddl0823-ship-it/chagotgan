/**
 * 경기조합 「1. 신청인 및 접수정보」 — 딜러 고르기
 * ------------------------------------------------------------------
 *  이 화면의 칸은 두 가지로 나뉜다.
 *
 *    #jDNo          "딜러명을 넣고 ENTER"  ← 찾는 칸 (여기에 이름을 넣고 엔터)
 *    #j_dealerName  딜러명                 ← 사이트가 채워 주는 칸
 *    #j_dealerHp    딜러 연락처            ← 사이트가 채워 주는 칸
 *    #jSNo          "상사명을 넣고 ENTER"  ← 상사를 찾는 칸
 *    #j_sangsaName  상사명                 ← 사이트가 채워 주는 칸
 *
 *  앱은 그동안 결과칸(#j_dealerName)에 글자만 넣고 있었다. 화면에는 이름이 보이지만
 *  사이트가 쥐고 있는 딜러·상사 번호는 비어 있어, 저장할 때
 *  「상사가 선택되지 않았습니다」 가 떴다.
 *
 *  그래서 사람이 하는 대로 한다 — 찾는 칸에 넣고 엔터, 뜬 목록에서 이름이 정확히
 *  맞는 줄을 눌러 고른다. 목록은 이 화면에 뜰 수도, 팝업 창으로 뜰 수도 있어
 *  두 곳을 다 본다(앱이 창을 넘겨준다).
 */

/** 지금 신청인정보 칸들이 어떤 상태인지 */
const DEALER_STATE_EXPR = `(function () {
  function v(id) { var e = document.getElementById(id); return e ? String(e.value || '') : null; }
  return {
    dNo: v('jDNo'), dealerName: v('j_dealerName'), dealerHp: v('j_dealerHp'),
    sNo: v('jSNo'), sangsaName: v('j_sangsaName'),
  };
})()`;

/**
 * 찾는 칸에 이름을 넣고 그 칸에 focus 를 둔다.
 * 엔터는 앱이 진짜 키로 보낸다 (아래 설명 참고).
 */
/*  이름을 치는 칸은 #j_dealerName 이다.
 *
 *  화면 안내는 「딜러명을 넣고 ENTER 를 입력하세요」 이고 그 옆 칸이 #jDNo(딜러번호)인데,
 *  #jDNo 를 누르면 사이트가 $('#j_dealerName').focus() 로 옮겨 준다 —
 *  즉 사람이 실제로 치는 곳은 딜러명 칸이다.
 *  처음에 #jDNo 에 넣고 엔터를 쳤더니 아무 일도 없었던 이유가 이것이다. */
const NAME_BOX = 'j_dealerName';

function buildDealerTypeScript(name) {
  return `(function () {
  var want = ${JSON.stringify(String(name || '').trim())};
  var box = document.getElementById('${NAME_BOX}');
  if (!box) return { ok: false, error: '딜러명 칸(#${NAME_BOX})이 없습니다. 「1. 신청인 및 접수정보」 화면인지 확인해 주세요.' };
  box.focus();
  box.value = want;
  ['input', 'change'].forEach(function (t) { box.dispatchEvent(new Event(t, { bubbles: true })); });
  return {
    ok: true, typed: want,
    focused: document.activeElement === box,
    active: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  };
})()`;
}

/**
 * 엔터를 페이지 안에서 흉내 내 본다 (진짜 키가 안 먹을 때의 대비책).
 *
 *  이렇게 만든 이벤트는 사이트가 걸어 둔 처리기(onkeydown 등)는 부르지만,
 *  브라우저가 알아서 하는 일(form 을 보내는 것 같은)은 일어나지 않는다.
 *  엔터로 form 이 넘어가는 화면이라면 이 방법으로는 아무 일도 안 생긴다 —
 *  그래서 앱이 창에 진짜 키를 넣는 쪽을 먼저 쓴다.
 *  keyCode 는 만들 때 넣은 값이 그대로 전해진다(그래도 확실히 얹어 둔다).
 */
const DEALER_ENTER_EXPR = `(function () {
  var box = document.getElementById('${NAME_BOX}');
  if (!box) return { ok: false, error: '딜러명 칸이 없습니다.' };
  var tried = [];

  box.focus();

  /*  사이트가 쥐고 있는 함수를 직접 부른다.
   *  화면을 살펴보니 getDealerInfo 가 있었다 — 이것이 딜러를 찾아 주는 것으로 보인다.
   *  이름이 닮은 것을 아무거나 부르지는 않는다. 확인된 것만 부른다. */
  ['getDealerInfo'].forEach(function (nm) {
    if (typeof window[nm] !== 'function') return;
    try { window[nm](); tried.push(nm + '()'); }
    catch (e) { tried.push(nm + '(오류:' + e.message + ')'); }
  });

  //  ① 이벤트로 알리기
  ['keydown', 'keypress', 'keyup'].forEach(function (t) {
    var ev = new KeyboardEvent(t, { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return 13; } });
      Object.defineProperty(ev, 'which', { get: function () { return 13; } });
    } catch (e) {}
    box.dispatchEvent(ev);
  });
  tried.push('이벤트');

  /*  ② 칸에 직접 적힌 처리기를 불러 본다.
   *  onkeydown="if(event.keyCode==13) fnSearch()" 같은 식이 흔한데,
   *  이런 것은 우리가 만든 이벤트로도 불리지만 안 되는 경우가 있어 직접 부른다. */
  ['onkeydown', 'onkeypress', 'onkeyup', 'onchange'].forEach(function (nm) {
    var code = box.getAttribute(nm);
    if (!code) return;
    try {
      var fake = { keyCode: 13, which: 13, key: 'Enter', target: box, srcElement: box,
                   preventDefault: function () {}, stopPropagation: function () {} };
      new Function('event', 'window.event = event; ' + code).call(box, fake);
      tried.push(nm);
    } catch (e) { tried.push(nm + '(오류:' + e.message + ')'); }
  });

  //  ③ 칸 옆의 찾기 단추 (돋보기 그림·검색 링크)
  var near = null;
  try {
    var r0 = box.getBoundingClientRect();
    Array.prototype.slice.call(document.querySelectorAll('a,button,img,input[type=button],span'))
      .forEach(function (el) {
        if (near) return;
        var oc = String(el.getAttribute('onclick') || '');
        var t = String(el.textContent || el.value || el.getAttribute('alt') || '');
        if (!/검색|찾기|search|dealer|emp|사원/i.test(oc + ' ' + t)) return;
        var r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        if (Math.abs(r.top - r0.top) > 60) return;          // 그 칸 근처만
        near = el;
      });
  } catch (e) {}
  if (near) { near.click(); tried.push('옆의 찾기 단추'); }

  return { ok: true, tried: tried };
})()`;

/** 이 화면이 무엇을 듣고 있는지 (안 될 때 알려주려고) */
const DEALER_DIAG_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ' ').trim(); }
  var box = document.getElementById('${NAME_BOX}');
  var attrs = {};
  if (box) {
    for (var i = 0; i < box.attributes.length; i++) {
      var a = box.attributes[i];
      if (/^on/i.test(a.name)) attrs[a.name] = String(a.value).slice(0, 200);
    }
  }
  var fns = [];
  try {
    Object.keys(window).forEach(function (k) {
      if (typeof window[k] !== 'function') return;
      if (!/dealer|emp|사원|search|find|pop/i.test(k)) return;
      if (fns.length < 40) fns.push(k);
    });
  } catch (e) {}

  var tables = Array.prototype.slice.call(document.querySelectorAll('table')).map(function (t) {
    return norm(t.textContent).slice(0, 60);
  }).slice(0, 8);

  /*  딜러명 칸이 들어 있는 덩어리의 실제 코드.
   *  사이트가 무엇을 어떻게 부르는지는 이걸 봐야 안다 — 짐작으로는 못 맞춘다. */
  var blockHtml = null;
  if (box) {
    var node = box, guard = 0;
    while (node && guard++ < 6) {
      var h = String(node.outerHTML || '');
      if (h.length > 300 || !node.parentElement) { blockHtml = h.slice(0, 2500); break; }
      node = node.parentElement;
    }
    if (!blockHtml) blockHtml = String(box.outerHTML || '').slice(0, 600);
  }

  //  후보 함수들이 인자를 몇 개 받는지 (0개면 그냥 부를 수 있다)
  var fnArgs = {};
  fns.forEach(function (k) {
    try { fnArgs[k] = window[k].length; } catch (e) {}
  });

  return {
    있나: !!box,
    블록: blockHtml,
    함수인자수: fnArgs,
    값: box ? String(box.value || '') : null,
    지금누구에게: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    칸에적힌처리기: attrs,
    form: box && box.form ? (box.form.name || box.form.id || '(이름없음)') : null,
    닮은함수들: fns,
    화면의표: tables,
    주소: location.href,
  };
})()`;

/**
 * 뜬 목록의 줄을 그대로 읽어 온다 (누르지 않는다).
 *
 *  앱이 이 목록을 보여 주고 사람이 고르게 한다 — 이름만으로 자동으로 고르면
 *  같은 이름의 다른 상사를 집을 수 있다. 카인포 딜러 선택과 같은 방식이다.
 *  줄마다 번호를 매겨 두었다가, 고른 번호로 그 줄을 누른다.
 */
const DEALER_LIST_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ' ').trim(); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }

  /*  「사원선택」 표를 찾는다.
   *
   *  머리줄에 사원명·상사명·휴대폰번호 같은 이름이 있는 표만 고른다.
   *  이 조건이 없으면 엉뚱한 목록을 읽는다 — 실제로 조합 창의 탭 이름
   *  (1신청인 및 접수정보 …)을 딜러 목록인 줄 알고 보여준 적이 있다.
   *
   *  머리줄:  지역 · 상사명 · 상태 · 사원명 · 휴대폰번호 · 사원구분 · 사원코드 · 사업번호 · 상사코드
   */
  /*  머리글이 없거나 이름이 달라도 줄의 값만 보고 알아낸다.
   *
   *  실제 줄:  수원 | 명문자동차 | (상태) | (딜러이름) | 010-****-**** | 알선 | (사원코드) | ***-**-***** | (상사코드)
   *  전화번호를 기준으로 삼으면 흔들리지 않는다 —
   *    바로 앞이 사원명, 그 앞쪽에서 가장 긴 한글이 상사명,
   *    전화 뒤의 순수 숫자 두 개가 사원코드·상사코드다.
   *  이게 없으면 목록은 읽어도 "값없음" 으로 끝난다 (실제로 그렇게 막혔다).
   */
  function fillBy(cells, by) {
    by = by || {};
    var phoneAt = -1;
    for (var i = 0; i < cells.length; i++) {
      if (/01[016789][-\\s]?[0-9]{3,4}[-\\s]?[0-9]{4}/.test(cells[i])) { phoneAt = i; break; }
    }
    if (phoneAt < 0) return by;

    if (!by['휴대폰번호']) by['휴대폰번호'] = cells[phoneAt];
    if (!by['사원명'] && phoneAt >= 1) by['사원명'] = cells[phoneAt - 1];

    if (!by['상사명']) {
      var best = '';
      for (var j = 0; j < phoneAt - 1; j++) {
        var c = cells[j];
        if (!/[가-힣]/.test(c)) continue;
        if (c.length > best.length) best = c;
      }
      if (best) by['상사명'] = best;
    }

    var nums = [];
    for (var k = phoneAt + 1; k < cells.length; k++) {
      if (/^[0-9]{3,10}$/.test(cells[k])) nums.push(cells[k]);
    }
    if (!by['사원코드'] && nums[0]) by['사원코드'] = nums[0];
    if (!by['상사코드'] && nums[1]) by['상사코드'] = nums[1];
    return by;
  }

  var all = Array.prototype.slice.call(document.querySelectorAll('table'));
  var tables = all.filter(visible);
  var found = null;
  for (var t = 0; t < tables.length; t++) {
    var head = norm(tables[t].textContent).replace(/\\s/g, '');
    if (head.indexOf('사원명') < 0 && head.indexOf('상사명') < 0 && head.indexOf('휴대폰') < 0) continue;
    if (tables[t].querySelectorAll('tr').length < 2) continue;
    found = tables[t];
    break;
  }

  /*  표가 아닌 방식(div·ul)으로 그린 목록도 있다.
   *  머리글 이름이 안 보여도, 줄마다 이름·전화번호가 나란히 있으면 그것을 목록으로 본다. */
  if (!found) {
    var rowsAlt = Array.prototype.slice.call(document.querySelectorAll('tr,li,div'))
      .filter(function (el) {
        if (!visible(el) || el.children.length < 3 || el.children.length > 14) return false;
        var t = norm(el.textContent);
        if (!t || t.length > 200) return false;
        return /01[016789][-\\s]?\\d{3,4}[-\\s]?\\d{4}/.test(t);   // 줄에 휴대폰번호가 있다
      });
    if (rowsAlt.length) {
      var out2 = [];
      rowsAlt.forEach(function (el) {
        var cells = Array.prototype.slice.call(el.children)
          .map(function (c) { return norm(c.textContent); }).filter(Boolean);
        var i = out2.length;
        el.setAttribute('data-cc-row', String(i));
        out2.push({ i: i, cells: cells, by: fillBy(cells, {}), text: norm(el.textContent).slice(0, 160) });
      });
      return { ok: true, cols: [], rows: out2, url: location.href, how: '표가 아님' };
    }
  }

  /*  못 찾았으면 무엇이 있었는지 그대로 담아 준다.
   *  "표를 못 찾았다" 만으로는 어디를 고쳐야 할지 알 수 없다. */
  if (!found) {
    return {
      ok: false,
      error: '사원선택 표를 찾지 못했습니다.',
      url: location.href,
      표수: all.length,
      보이는표수: tables.length,
      표들: all.slice(0, 6).map(function (x) {
        var r = null;
        try { var b = x.getBoundingClientRect(); r = [Math.round(b.width), Math.round(b.height)]; } catch (e) {}
        return { 크기: r, 줄수: x.querySelectorAll('tr').length, 글: norm(x.textContent).slice(0, 80) };
      }),
      조각수: (function () { try { return window.frames.length; } catch (e) { return -1; } })(),
      글자: norm(document.body ? document.body.textContent : '').slice(0, 200),
    };
  }

  //  머리줄 이름 모으기
  var cols = [];
  var headRow = found.querySelector('tr');
  if (headRow) {
    cols = Array.prototype.slice.call(headRow.querySelectorAll('th,td'))
      .map(function (c) { return norm(c.textContent); });
  }

  var out = [];
  Array.prototype.slice.call(found.querySelectorAll('tr')).forEach(function (tr) {
    if (tr.querySelector('th')) return;                       // 머리줄
    var tds = Array.prototype.slice.call(tr.querySelectorAll('td'));
    if (tds.length < 2) return;
    var text = norm(tr.textContent);
    if (!text) return;
    if (/처리중|검색중|조회중|결과가없|없습니다/.test(text.replace(/\\s/g, ''))) return;

    var cells = tds.map(function (td) { return norm(td.textContent); });
    var by = {};
    cells.forEach(function (v, i) { if (cols[i]) by[cols[i]] = v; });

    var i = out.length;
    tr.setAttribute('data-cc-row', String(i));
    out.push({ i: i, cells: cells, by: fillBy(cells, by), text: text.slice(0, 160) });
  });

  return { ok: true, cols: cols, rows: out, url: location.href };
})()`;

/**
 * 앱에서 고른 줄을 누르고 [확인] 까지 누른다.
 *  사원선택 창은 줄을 고른 뒤 위쪽 [확인] 을 눌러야 신청인정보로 넘어간다.
 */
function buildDealerClickScript(index) {
  return `(async function () {
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }

  var el = document.querySelector('[data-cc-row="' + ${JSON.stringify(String(index))} + '"]');
  if (!el) return { ok: false, error: '고른 줄을 찾지 못했습니다. 목록을 다시 불러 주세요.' };

  //  줄 고르기 — 눌러도 되고 두 번 눌러야 하는 화면도 있어 둘 다 해 준다
  var cell = el.querySelector('td') || el;
  ['click', 'dblclick'].forEach(function (type) {
    cell.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  });
  el.click();
  await sleep(200);

  //  [확인] 누르기
  var okBtn = null;
  Array.prototype.slice.call(document.querySelectorAll('button,a,input[type=button],input[type=submit],span,img'))
    .forEach(function (b) {
      if (okBtn) return;
      var t = norm(b.textContent || b.value || b.getAttribute('alt') || '');
      if (t !== '확인' && t !== '선택' && t !== 'ok') return;
      if (!visible(b)) return;
      okBtn = b;
    });
  if (okBtn) { okBtn.click(); await sleep(250); }

  return { ok: true, confirmed: !!okBtn };
})()`;
}

/**
 * 뜬 목록에서 이름이 맞는 줄을 고른다.
 * 이 화면에서 한 번, 팝업이 떴으면 그 창에서 한 번 — 앱이 두 번 불러 준다.
 */
function buildDealerPickScript(name) {
  return `(async function () {
  var want = ${JSON.stringify(String(name || '').trim())};
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }

  var target = norm(want);

  /*  고를 수 있는 줄을 모은다. 표(tr)로 나오는 화면도, 목록(li·a)으로 나오는 화면도 있다.
   *  "처리 중" 같은 안내줄이 잠깐 보이므로 이름이 든 줄만 고른다. */
  var rows = Array.prototype.slice.call(
    document.querySelectorAll('tr, li, a, div[onclick], td[onclick]'));
  var hits = [];
  rows.forEach(function (el) {
    if (!visible(el)) return;
    var t = norm(el.textContent);
    if (!t || t.length > 120) return;
    if (t.indexOf(target) < 0) return;
    //  줄 안에 더 작은 줄이 또 있으면 안쪽 것을 쓴다
    var inner = el.querySelector('tr, li');
    hits.push({ el: inner && visible(inner) ? inner : el, text: t });
  });

  //  가장 안쪽(짧은) 것부터 — 표 전체가 아니라 그 줄을 누르도록
  hits.sort(function (a, b) { return a.text.length - b.text.length; });

  if (!hits.length) return { ok: false, error: '목록에서 「' + want + '」 을 찾지 못했습니다.', seen: 0 };

  var pick = hits[0];
  //  누를 곳: 줄 안에 링크가 있으면 그것을, 없으면 줄 자체를
  var link = pick.el.querySelector ? pick.el.querySelector('a,button') : null;
  (link && visible(link) ? link : pick.el).click();
  await sleep(250);

  return { ok: true, picked: pick.text.slice(0, 60), candidates: hits.length };
})()`;
}

/**
 * 카인포에서 가져온 값을 신청인정보 칸에 그대로 넣는다 (고르기가 안 될 때의 차선).
 *
 *  이렇게 넣으면 화면에는 보이지만 딜러번호·상사번호는 비어 있다.
 *  저장할 때 「상사가 선택되지 않았습니다」 가 뜰 수 있으므로,
 *  앱은 이 방법을 썼다는 것을 결과에 분명히 적는다.
 */
function buildDealerFillScript(data) {
  const d = data || {};
  return `(function () {
  var vals = ${JSON.stringify({
    j_dealerName: String(d.dealerName || '').trim(),
    j_dealerHp: String(d.dealerHp || '').trim(),
    j_sangsaName: String(d.sangsaName || '').trim(),
  })};
  var done = [], miss = [];
  Object.keys(vals).forEach(function (id) {
    var v = vals[id];
    if (!v) return;
    var el = document.getElementById(id);
    if (!el) { miss.push(id); return; }
    el.value = v;
    ['input', 'change', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
    done.push(id + '=' + v);
  });
  return { ok: !!done.length, done: done, miss: miss };
})()`;
}

/**
 * 사원선택에서 고른 줄의 값을 신청인정보에 직접 넣는다.
 *
 *  원래는 팝업이 부모 창에 값을 써 넣는다. 그런데 앱 안에서는 그 통로가 동작하지
 *  않아, 팝업에서 더블클릭해도 신청인정보가 그대로 비어 있었다(크롬에서는 된다).
 *  값은 사원선택 표에 다 들어 있으므로 앱이 직접 넣는다.
 *
 *    사원코드   -> #jDNo          (딜러번호)
 *    사원명     -> #j_dealerName  (딜러명)
 *    휴대폰번호 -> #j_dealerHp    (딜러 핸드폰)
 *    상사코드   -> #jSNo          (상사번호)
 *    상사명     -> #j_sangsaName  (상사명)
 */
function buildDealerApplyScript(row) {
  const by = (row && row.by) || {};
  const pick = (...names) => {
    for (const n of names) if (by[n]) return String(by[n]).trim();
    return '';
  };
  const vals = {
    jDNo: pick('사원코드', '딜러번호'),
    j_dealerName: pick('사원명', '딜러명'),
    j_dealerHp: pick('휴대폰번호', '연락처', '핸드폰'),
    jSNo: pick('상사코드', '상사번호'),
    j_sangsaName: pick('상사명', '매매상사'),
  };

  return `(function () {
  var vals = ${JSON.stringify(vals)};
  var done = [], miss = [];
  Object.keys(vals).forEach(function (id) {
    var v = vals[id];
    if (!v) { miss.push(id + '(값없음)'); return; }
    var el = document.getElementById(id);
    if (!el) { miss.push(id + '(칸없음)'); return; }
    el.value = v;
    ['input', 'change', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
    done.push(id + '=' + v);
  });
  return { ok: done.length >= 2, done: done, miss: miss };
})()`;
}

module.exports = {
  DEALER_STATE_EXPR,
  buildDealerFillScript,
  buildDealerApplyScript,
  DEALER_LIST_EXPR,
  DEALER_ENTER_EXPR,
  DEALER_DIAG_EXPR,
  buildDealerTypeScript,
  buildDealerPickScript,
  buildDealerClickScript,
};
