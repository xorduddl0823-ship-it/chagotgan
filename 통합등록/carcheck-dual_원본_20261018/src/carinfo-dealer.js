/**
 * 카인포 고객정보 — 매매상사/딜러 바꾸기
 * ------------------------------------------------------------------
 *  사람이 하는 순서 그대로 따라간다.
 *
 *    ① 고객정보의 「매매상사 / 딜러명」 옆 [검색] 을 누른다
 *    ② 「매매상사/딜러 검색」 창이 뜬다
 *    ③ 「상사/딜러/연락처」 칸에 바꿀 이름을 넣고 [검색]
 *    ④ 목록에서 그 줄의 [선택] 을 누른다
 *    ⑤ 알림 창의 [확인] 을 누르면 고객정보가 바뀐다
 *
 *  목록의 칸:  No · 매매상사 · 딜러명 · 연락처
 *  딜러를 바꾸면 매매상사·연락처도 함께 바뀐다 — 이름만 바꾸면 안 된다.
 */

/** 고객정보의 [검색] 을 눌러 매매상사/딜러 검색 창을 연다 */
const CI_OPEN_DEALER_SEARCH_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }

  /*  「매매상사」·「딜러명」 글자 근처에 있는 [검색] 을 고른다.
   *  화면에 검색 단추가 여럿이라 아무거나 누르면 엉뚱한 창이 뜬다. */
  var anchor = null;
  var all = document.getElementsByTagName('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.children.length) continue;
    var t = norm(el.textContent);
    if (t !== '매매상사' && t !== '딜러명' && t !== '매매상사/딜러명') continue;
    if (!visible(el)) continue;
    anchor = el; break;
  }

  var best = null, bestDist = 1e9;
  Array.prototype.slice.call(document.querySelectorAll('a,button,input[type=button],span,img'))
    .forEach(function (b) {
      if (!visible(b)) return;
      var t = norm(b.textContent || b.value || b.getAttribute('alt') || '');
      var oc = String(b.getAttribute('onclick') || '') + ' ' + String(b.className || '');
      if (t !== '검색' && !/search|dealer|dc/i.test(oc)) return;
      if (!anchor) { if (t === '검색' && !best) best = b; return; }
      try {
        var r1 = anchor.getBoundingClientRect(), r2 = b.getBoundingClientRect();
        var d = Math.abs(r1.top - r2.top) + Math.abs(r1.left - r2.left) / 10;
        if (Math.abs(r1.top - r2.top) > 40) return;      // 같은 줄에 있는 것만
        if (d < bestDist) { bestDist = d; best = b; }
      } catch (e) {}
    });

  if (!best) return { ok: false, error: '고객정보의 [검색] 단추를 찾지 못했습니다.' };
  best.click();
  return { ok: true, how: norm(best.textContent || best.value || '검색') };
})()`;

/*  ── 검색 창은 본 화면 위에 겹쳐 뜬다 ────────────────────────────────
 *
 *  카인포는 성능점검 상세도, 매매상사/딜러 검색도 모두 한 화면 안의 겹침 창이다.
 *  그래서 화면 전체에서 칸을 찾으면 뒤에 가려진 성능점검 화면의 칸이 잡힌다 —
 *  실제로 검색칸이 빈 채 「데이터가 없습니다」 로 끝났다.
 *  반드시 그 창 상자 안에서만 찾아야 한다.
 */
const POP_ROOT = `
  /*  화면에 정말로 떠 있는 상자만 고른다.
   *
   *  이 창은 열기 전에도 문서 안에 틀로 들어 있다. 크기만 보고 고르면
   *  열리지도 않은 틀을 붙잡아, 앱은 "이미 떴다" 고 여겨 [검색] 을 누르지 않고
   *  숨은 틀에 이름만 적어 넣는다 — 머리줄만 있고 목록은 영영 안 뜬다.
   *  그래서 눈에 보이는지(가려지지 않았는지) 까지 본다. */
  /*  자리를 차지하고 있는가 — 숨은 틀을 걸러내는 잣대 */
  function ccLaidOut(el) {
    var r = null;
    try { r = el.getBoundingClientRect(); } catch (e) { return null; }
    if (!r || r.width < 250 || r.height < 120) return null;
    if (r.bottom < 1 || r.right < 1) return null;
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    if (r.top > vh - 1 || r.left > vw - 1) return null;                 // 화면 밖
    for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
      var s = null;
      try { s = getComputedStyle(p); } catch (e) { break; }
      if (!s) break;
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return null;
      /*  흐림(opacity)은 보지 않는다.
       *  창이 다른 창 뒤에 있으면 브라우저가 그림 그리기를 늦춰,
       *  흐림 애니메이션이 0 에 멈춘 채로 남는다. 멀쩡히 뜬 창을 그것 때문에
       *  "안 떴다" 고 내치면 아무것도 못 한다. 자리와 display 로만 가른다. */
    }
    return r;
  }

  /*  맨 앞에 있는가 — 세 곳을 찍어 한 군데라도 이 상자면 떠 있는 것 */
  function ccShown(el) {
    var r = ccLaidOut(el);
    if (!r) return null;
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    var pts = [[r.left + r.width / 2, r.top + Math.min(20, r.height / 2)],
               [r.left + r.width / 2, r.top + r.height / 2],
               [r.left + Math.min(20, r.width / 2), r.top + r.height / 2]];
    for (var i = 0; i < pts.length; i++) {
      var x = Math.max(1, Math.min(vw - 2, pts[i][0]));
      var y = Math.max(1, Math.min(vh - 2, pts[i][1]));
      var top = null;
      try { top = document.elementFromPoint(x, y); } catch (e) {}
      if (top && (top === el || el.contains(top))) return r;
    }
    return null;
  }

  /*  이름표부터 찾는다 — 상자부터 찾으면 안 된다.
   *
   *  창이 닫혀 있어도 그 글자는 문서 안에 남아 있어서,
   *  body 나 #app 처럼 화면을 다 덮는 큰 상자도 「상사/딜러/연락처」 를 품은 것으로 잡힌다.
   *  그러면 앱은 본 화면을 검색 창으로 알고, 고객정보 칸에 이름을 적어 넣는다.
   *  그래서 글자가 실제로 눈에 보일 때만 세고, 거기서 위로 올라가며 창을 찾는다. */
  function popLabels() {
    var out = [];
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length) continue;                       // 글자를 직접 담은 것만
      var t = norm(el.textContent);
      if (t.indexOf('상사/딜러/연락처') < 0 && t.indexOf('매매상사/딜러검색') < 0) continue;
      var r = null;
      try { r = el.getBoundingClientRect(); } catch (e) { continue; }
      if (!r || (!r.width && !r.height)) continue;             // 숨은 틀의 글자는 뺀다
      out.push(el);
    }
    return out;
  }

  function popRoot(allowCovered) {
    var best = null, bestArea = 1e12;
    var alt = null, altArea = 1e12;
    var labels = popLabels();
    for (var i = 0; i < labels.length; i++) {
      //  이름표에서 위로 올라가며 창만 한 상자를 찾는다
      for (var el = labels[i]; el && el.nodeType === 1; el = el.parentElement) {
        if (el === document.body || el === document.documentElement) break;
        var r = ccShown(el);
        if (r) {
          var a = r.width * r.height;
          if (a < bestArea) { bestArea = a; best = el; }
          break;
        }
        /*  눈에는 안 보여도 자리는 잡은 상자를 따로 둔다.
         *  투명한 덮개가 위에 깔리면 멀쩡히 뜬 창도 "가려짐" 으로 보이기 때문이다.
         *  보이는 것이 하나도 없을 때만 이것을 쓴다. */
        var r2 = ccLaidOut(el);
        if (r2) {
          var a2 = r2.width * r2.height;
          if (a2 < altArea) { altArea = a2; alt = el; }
          break;
        }
      }
    }
    return best || (allowCovered ? alt : null);
  }
`;

/**
 * 매매상사/딜러 검색 창이 떴는가.
 *
 *  느슨하게 보면 안 된다 — 카인포 본 화면에도 「매매상사」·「딜러명」 글자가 있어,
 *  본 화면을 검색 창으로 잘못 알아보고 엉뚱한 칸에 이름을 넣은 적이 있다.
 *  이 창에만 있는 표시를 본다: 「상사/딜러/연락처」 라는 이름표,
 *  또는 매매상사·딜러명·연락처가 머리줄인 표에 [선택] 단추가 있는 것.
 */
const CI_DEALER_POPUP_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  ${POP_ROOT}

  /*  "떴다" 는 판단과 "여기에 넣는다" 는 판단이 어긋나면 엉뚱한 칸에 이름이 들어간다.
   *  그래서 같은 잣대를 쓴다 — 뒤에서 실제로 쓸 그 상자가 있고,
   *  그 안에 글을 넣을 칸이 있을 때만 떴다고 본다. */
  var root = popRoot();
  if (root) {
    var box = Array.prototype.slice.call(
      root.querySelectorAll('input[type=text],input[type=search],input:not([type])'))
      .some(function (el) { return visible(el) && !el.readOnly && !el.disabled; });
    if (box) return true;
  }

  /*  다른 잣대는 두지 않는다.
   *  「매매상사·딜러명·연락처」 가 머리줄인 표가 있으면 떴다고 보던 뒷받침이 있었는데,
   *  성능점검 상세에도 그런 표가 있어 창이 이미 떴다고 잘못 알았다.
   *  그러면 앱은 [검색] 을 아예 누르지 않는다 — 실제로 그렇게 막혔다.
   *  뒤에서 다룰 수 있는 창은 popRoot() 로 찾아지는 창뿐이니, 판단도 그것 하나로 한다. */
  return false;
})()`;

/**
 * 같은 물음, 느슨한 잣대 — [검색] 을 누른 뒤에만 쓴다.
 *
 *  창이 떴는데 다른 화면에 덮이면 위의 엄한 잣대로는 영영 "안 떴다" 가 되어,
 *  [검색] 만 되풀이 누르다 끝난다. 이미 눌러 놓고 기다리는 중이라면
 *  덮인 창도 뜬 것으로 쳐서 다음 걸음으로 넘어간다.
 */
const CI_DEALER_POPUP_LOOSE_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  ${POP_ROOT}

  var root = popRoot(true);
  if (!root) return false;
  return Array.prototype.slice.call(
    root.querySelectorAll('input[type=text],input[type=search],input:not([type])'))
    .some(function (el) { return visible(el) && !el.readOnly && !el.disabled; });
})()`;

/**
 * 창이 다 떠서 손댈 수 있는 상태인가.
 *
 *  뜨는 도중에 이름을 넣으면, 목록이 스스로 다시 그려지며 그 이름을 지운다.
 *  실제로 칸이 빈 채 검색이 돌아 「데이터가 없습니다」 로 끝났다.
 *  그래서 「처리중」 이 걷히고 흐림(fade)이 끝난 뒤에 손댄다.
 */
const CI_DEALER_READY_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  ${POP_ROOT}

  var root = popRoot(true);
  if (!root) return false;
  if (norm(root.textContent).indexOf('처리중') >= 0) return false;

  var box = Array.prototype.slice.call(
    root.querySelectorAll('input[type=text],input[type=search],input:not([type])'))
    .filter(function (el) { return visible(el) && !el.readOnly && !el.disabled; })[0];
  if (!box) return false;

  /*  칸에 손을 댈 수 있는가.
   *  흐림(opacity)으로 재지 않는다 — 창이 뒤에 있으면 흐림이 멈춘 채 남는다.
   *  대신 그 칸이 실제로 눌리는 자리에 있는지를 본다. */
  var r = box.getBoundingClientRect();
  if (r.width < 40 || r.height < 8) return false;
  var hit = null;
  try { hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); } catch (e) {}
  if (hit && hit !== box && !box.contains(hit) && !(hit.contains && hit.contains(box))) return false;
  return true;
})()`;

/** 검색창에 이름을 넣고 [검색] 을 누른다 */
function buildCiDealerSearchScript(name) {
  return `(async function () {
  var want = ${JSON.stringify(String(name || '').trim())};
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  ${POP_ROOT}

  var root = popRoot(true);
  if (!root) return { ok: false, error: '매매상사/딜러 검색 창을 찾지 못했습니다.' };

  /*  「상사/딜러/연락처」 이름표 바로 옆 칸을 쓴다.
   *  "가장 넓은 칸" 으로 찾았더니 엉뚱한 화면의 칸이 잡힌 적이 있다. */
  var boxes = Array.prototype.slice.call(
    root.querySelectorAll('input[type=text],input[type=search],input:not([type])'))
    .filter(function (el) { return visible(el) && !el.readOnly && !el.disabled; });
  if (!boxes.length) return { ok: false, error: '검색어 칸을 찾지 못했습니다.' };

  var label = null;
  var all = root.getElementsByTagName('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.children.length) continue;
    var t = norm(el.textContent);
    if (t.indexOf('상사/딜러/연락처') < 0 && t !== '상사' && t !== '딜러') continue;
    if (!visible(el)) continue;
    label = el; break;
  }

  var box = null;
  if (label) {
    var lr = label.getBoundingClientRect();
    var near = 1e9;
    boxes.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (Math.abs(r.top - lr.top) > 30) return;          // 같은 줄
      var d = r.left - lr.left;
      if (d < 0) return;                                   // 이름표 오른쪽
      if (d < near) { near = d; box = el; }
    });
  }
  if (!box) {
    //  이름표를 못 찾으면 보이는 칸 가운데 가장 넓은 것
    var wide = 0;
    boxes.forEach(function (el) {
      var w = el.getBoundingClientRect().width;
      if (w > wide) { wide = w; box = el; }
    });
  }
  if (!box) return { ok: false, error: '검색어 칸을 찾지 못했습니다.' };

  /*  값을 넣고 "남아 있는지" 까지 본다.
   *
   *  창이 뜨는 동안 목록이 스스로 다시 그려지면서 넣어 둔 이름을 지운다.
   *  실제로 그래서 빈 칸으로 검색이 돌아 「데이터가 없습니다」 로 끝났다.
   *  그래서 넣고 → 잠깐 두고 → 지워졌으면 다시 넣기를 되풀이한다.
   *  틀(프레임워크)이 알아채도록 값도 제 방식으로 넣는다. */
  function put(el, v) {
    try {
      var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && desc.set) desc.set.call(el, v);
      else el.value = v;
    } catch (e) { el.value = v; }
    ['input', 'change'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
    try {
      var ku = new KeyboardEvent('keyup', { key: 'a', bubbles: true });
      el.dispatchEvent(ku);
    } catch (e) {}
  }

  var tries = 0;
  box.focus();
  for (var n = 0; n < 14; n++) {
    if (norm(box.value) === norm(want) && n > 0) break;
    put(box, want);
    tries++;
    await sleep(120);
  }
  if (norm(box.value) !== norm(want)) {
    return { ok: false, error: '검색어 칸에 이름이 남지 않습니다. 창이 아직 뜨는 중입니다.',
             칸: box.id || box.name || '이름없음', 넣은값: want, 남은값: box.value };
  }

  //  [검색] 누르기 — 이 창 안의 것만
  var btn = null;
  Array.prototype.slice.call(root.querySelectorAll('a,button,input[type=button],input[type=submit],span,img'))
    .forEach(function (b) {
      if (btn || !visible(b)) return;
      var t = norm(b.textContent || b.value || b.getAttribute('alt') || '');
      if (t === '검색' || t === 'search') btn = b;
    });
  if (btn) btn.click();
  else {
    var ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return 13; } });
      Object.defineProperty(ev, 'which', { get: function () { return 13; } });
    } catch (e) {}
    box.dispatchEvent(ev);
  }
  /*  찾는 동안 「처리중...」 이 떠 있다. 그것이 걷힐 때까지만 기다린다.
   *  (여기서는 화면이 새로 열리지 않으므로 이 스크립트가 죽지 않는다) */
  for (var w2 = 0; w2 < 20; w2++) {
    await sleep(150);
    var t2 = norm(root.textContent);
    if (t2.indexOf('처리중') < 0) break;
  }
  return { ok: true, typed: want, pressed: btn ? '검색 단추' : '엔터',
           남은값: box.value, 다시넣음: tries };
})()`;
}

/**
 * 목록을 읽는다.
 *
 *  칸 생김새가 사이트마다 다르다 — 「매매상사 · 딜러명 · 연락처」 로 나뉜 곳도 있고,
 *  실제 카인포처럼 「매매상사 · 딜러명(연락처)」 로 한 칸에 붙어 나오는 곳도 있다.
 *  그래서 칸 이름이 아니라 값 생김새(전화번호)로 갈라 읽는다.
 *
 *  찾는 범위도 한 번에 넓히지 않는다: 먼저 검색 창 안, 없으면 그 바깥 상자,
 *  그래도 없으면 화면 전체. 좁은 데서 찾은 것을 늘 먼저 쓴다.
 */
function buildCiDealerListScript(name) {
  return `(function () {
  var want = ${JSON.stringify(String(name || '').trim().replace(/\s+/g, ''))};
  function norm(s) { return String(s || '').replace(/\\s+/g, ' ').trim(); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  var HP = /01[016789][-\\s]?[0-9]{3,4}[-\\s]?[0-9]{4}/;

  ${POP_ROOT}
  var root = popRoot(true);

  /*  창 밖으로 넓힐 때는 찾는 이름이 든 줄만 받는다.
   *  넓히자마자 성능점검 상세의 딴 표를 목록으로 잘못 읽어,
   *  엉뚱한 사람을 고를 뻔했다. */
  function read(scope, strict) {
    var out = [];
    Array.prototype.slice.call(scope.querySelectorAll('tr')).forEach(function (tr) {
      if (!visible(tr) || tr.querySelector('th')) return;
      if (strict && want && norm(tr.textContent).replace(/\\s/g, '').indexOf(want) < 0) return;
      var tds = Array.prototype.slice.call(tr.querySelectorAll('td'));
      if (tds.length < 2) return;
      var cells = tds.map(function (td) { return norm(td.textContent); });
      if (!HP.test(cells.join(' '))) return;                 // 연락처가 있는 줄만

      var hpAt = -1;
      for (var i = 0; i < cells.length; i++) { if (HP.test(cells[i])) { hpAt = i; break; } }

      var by = {};
      var hpCell = cells[hpAt];
      by['연락처'] = (hpCell.match(HP) || [hpCell])[0];

      /*  「홍길동(010-****-****)」 처럼 이름과 번호가 한 칸에 붙어 나오면
       *  그 칸에서 이름을 떼어 낸다. 나뉘어 있으면 바로 앞 칸이 이름이다. */
      var same = norm(hpCell.replace(HP, '').replace(/[()\\[\\]·,\\/]/g, ' '));
      if (/[가-힣A-Za-z]/.test(same)) by['딜러명'] = same;
      else if (hpAt >= 1) by['딜러명'] = cells[hpAt - 1];

      var upto = by['딜러명'] === same ? hpAt : hpAt - 1;
      var best = '';
      for (var j = 0; j < upto; j++) {
        if (!/[가-힣A-Za-z]/.test(cells[j])) continue;
        if (cells[j].length > best.length) best = cells[j];
      }
      if (best) by['매매상사'] = best;

      var i2 = out.length;
      tr.setAttribute('data-cc-dl', String(i2));
      out.push({ i: i2, cells: cells, by: by, text: norm(tr.textContent).slice(0, 160) });
    });
    return out;
  }

  var rows = [], where = '';
  if (root) { rows = read(root, false); where = '검색 창 안'; }

  //  창 안에 없으면, 결과가 그 상자 밖에 그려졌을 수 있다 — 한 겹씩 넓힌다
  var up = root;
  for (var k = 0; k < 4 && !rows.length && up && up.parentElement; k++) {
    up = up.parentElement;
    if (up === document.body || up === document.documentElement) break;
    rows = read(up, true);
    if (rows.length) where = '검색 창 바깥 ' + (k + 1) + '겹';
  }
  if (!rows.length && want) { rows = read(document, true); if (rows.length) where = '화면 전체'; }

  if (!rows.length) {
    return { ok: false, error: '목록이 없습니다.',
             글자: norm(root ? root.textContent : document.body.textContent).slice(0, 200) };
  }
  return { ok: true, rows: rows, where: where, url: location.href };
})()`;
}

/**
 * 딜러 검색 창이 실제로 어떻게 생겼는지 그대로 본다.
 *
 *  "목록이 없습니다" 는 세 가지 다른 일을 한 마디로 말한다 —
 *  검색이 아예 안 돌았거나, 결과가 다른 상자에 그려졌거나, 조각(iframe) 안이거나.
 *  어느 쪽인지 눈으로 갈라 보려고 화면 생김새를 그대로 적어 온다.
 */
const CI_DEALER_DIAG_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ' ').trim(); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  function tag(el) {
    if (!el) return '-';
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    var c = String(el.className || '');
    if (c && typeof c === 'string') s += '.' + c.trim().replace(/\\s+/g, '.').slice(0, 60);
    try { var r = el.getBoundingClientRect(); s += ' [' + Math.round(r.width) + '×' + Math.round(r.height) + ']'; } catch (e) {}
    return s;
  }
  ${POP_ROOT}

  var root = popRoot(true);
  var HP = /01[016789][-\\s]?[0-9]{3,4}[-\\s]?[0-9]{4}/;

  /*  「상사/딜러/연락처」 글자를 품은 상자 후보 — 왜 골리지 않았는지까지 적는다.
   *  (작음 / 화면 밖 / 숨김 / 가려짐) */
  function why(el) {
    var r = null;
    try { r = el.getBoundingClientRect(); } catch (e) { return '잴 수 없음'; }
    if (!r || r.width < 250 || r.height < 120) return '작음';
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    if (r.bottom < 1 || r.right < 1 || r.top > vh - 1 || r.left > vw - 1) return '화면 밖';
    for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
      var s = null;
      try { s = getComputedStyle(p); } catch (e) { break; }
      if (!s) break;
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return '숨김';
    }
    return ccShown(el) ? '보임' : '가려짐';
  }

  /*  이름표가 눈에 보이는지 — 여기서 하나도 안 보이면 창이 아직 안 뜬 것이다 */
  var labels = popLabels().slice(0, 6).map(tag);

  var cands = [];
  var all = document.getElementsByTagName('*');
  for (var i = 0; i < all.length && cands.length < 10; i++) {
    var t = norm(all[i].textContent).replace(/\\s/g, '');
    if (t.indexOf('상사/딜러/연락처') < 0 && t.indexOf('매매상사/딜러검색') < 0) continue;
    if (all[i] === document.documentElement || all[i] === document.body) continue;
    cands.push(why(all[i]) + ' — ' + tag(all[i]));
  }

  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe,frame'))
    .map(function (f) { return (f.getAttribute('src') || '(주소없음)').split('/').pop() + ' ' + tag(f); });

  var docRows = 0, sample = [];
  Array.prototype.slice.call(document.querySelectorAll('tr')).forEach(function (tr) {
    if (!HP.test(norm(tr.textContent))) return;
    docRows++;
    if (sample.length < 4) sample.push(norm(tr.textContent).slice(0, 90));
  });

  var boxes = root
    ? Array.prototype.slice.call(root.querySelectorAll('input,select,textarea'))
        .filter(visible)
        .map(function (el) { return tag(el) + ' = "' + String(el.value || '') + '"'; })
    : [];

  return {
    주소: location.href,
    찾은상자: tag(root),
    보이는이름표: labels.length ? labels : '(하나도 안 보임 — 창이 안 뜬 상태)',
    상자후보: cands,
    상자안글자: root ? norm(root.textContent).slice(0, 300) : '(없음)',
    상자안칸: boxes,
    상자안tr: root ? root.querySelectorAll('tr').length : 0,
    화면전체tr: document.querySelectorAll('tr').length,
    번호있는줄: docRows,
    줄맛보기: sample,
    조각: frames,
    안내글: norm(document.body.textContent).indexOf('데이터가 없습니다') >= 0 ? '「데이터가 없습니다」 가 떠 있음' : '',
  };
})()`;

/** 그 줄의 [선택] 을 누르고, 뒤이어 뜨는 알림의 [확인] 까지 누른다 */
function buildCiDealerPickScript(index) {
  return `(async function () {
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function visible(el) {
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); } catch (e) { return false; }
  }
  ${POP_ROOT}

  /*  줄도 이 창 안에서만 찾는다.
   *  성능점검 상세가 뒤에 겹쳐 있어, 화면 전체에서 찾으면
   *  앞서 열었던 창의 남은 표시가 잡힐 수 있다. */
  var root = popRoot(true);
  var tr = null;
  var sel2 = '[data-cc-dl="' + ${JSON.stringify(String(index))} + '"]';
  if (root) tr = root.querySelector(sel2);
  if (!tr) tr = document.querySelector(sel2);
  if (!tr) return { ok: false, error: '고른 줄을 찾지 못했습니다. 목록을 다시 불러 주세요.' };

  //  그 줄 안의 [선택] 단추
  var sel = null;
  Array.prototype.slice.call(tr.querySelectorAll('a,button,input[type=button],span'))
    .forEach(function (b) {
      if (sel || !visible(b)) return;
      var t = norm(b.textContent || b.value || '');
      if (t === '선택' || t === '적용' || t === '확인') sel = b;
    });
  (sel || tr).click();
  await sleep(400);

  /*  알림 창의 [확인] — 이걸 눌러야 고객정보가 바뀐다.
   *  알림은 검색 창 밖(화면 맨 위)에 뜨므로 화면 전체에서 찾되,
   *  가려지지 않고 실제로 눌리는 것만 누른다 (표 안의 '확인' 을 피한다) */
  var okTop = null, okAny = null;
  Array.prototype.slice.call(document.querySelectorAll('button,a,input[type=button],span'))
    .forEach(function (b) {
      if (!visible(b)) return;
      var t = norm(b.textContent || b.value || '').toLowerCase();
      if (t !== '확인' && t !== 'ok' && t !== '예') return;
      if (b.closest && b.closest('table')) return;          // 표 안의 '확인' 은 아니다
      if (!okAny) okAny = b;
      if (okTop) return;
      var r = b.getBoundingClientRect();
      var top = null;
      try { top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); } catch (e) {}
      if (!top || top === b || b.contains(top)) okTop = b;
    });

  /*  맨 앞의 것이 없으면 보이는 것이라도 누른다.
   *  다른 화면이 위에 덮여 있으면 맨 앞 판정이 안 되는데,
   *  여기서 멈추면 [선택] 만 해 놓고 고객정보는 그대로 남는다. */
  var okBtn = okTop || okAny;
  if (okBtn) { okBtn.click(); await sleep(300); }

  return { ok: true, picked: !!sel, confirmed: !!okBtn };
})()`;
}

/** 지금 고객정보의 딜러 값 (바뀌었는지 확인용) */
const CI_CUSTOMER_EXPR = `(function () {
  function v(id) { var e = document.getElementById(id); return e ? String(e.value || '') : null; }
  return { dealerName: v('deName'), sangsaName: v('dcName'), dealerHp: v('deHpNo') };
})()`;

module.exports = {
  CI_OPEN_DEALER_SEARCH_EXPR,
  CI_DEALER_POPUP_EXPR,
  CI_DEALER_POPUP_LOOSE_EXPR,
  CI_DEALER_READY_EXPR,
  buildCiDealerListScript,
  CI_DEALER_DIAG_EXPR,
  CI_CUSTOMER_EXPR,
  buildCiDealerSearchScript,
  buildCiDealerPickScript,
};
