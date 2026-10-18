/**
 * 사이트에 자동차 사진 올리기 (경기조합·카인포 공통)
 * ------------------------------------------------------------------
 *  자리는 화면에 적힌 이름표(앞면·뒷면·좌측면…)로 찾는다.
 *  사람은 그 자리의 십자가를 눌러 파일 고르기 창에서 사진을 고른다.
 *
 *  파일 고르기 창은 윈도우가 띄우는 창이라 페이지 안 스크립트로는 다룰 수 없다.
 *  그래서 이렇게 한다.
 *
 *    ① 페이지의 파일칸(#singlefile)이 창을 띄우지 못하게 click 을 잠시 막는다
 *    ② 십자가를 누른다  -> 사이트는 "어느 자리에 넣을지" 를 기억하고
 *                          파일칸을 부르지만, 창은 뜨지 않는다
 *    ③ 앱이 그 파일칸에 사진 경로를 직접 넣는다 (크롬 개발자 명령)
 *       -> change 가 일어나 사이트가 제 자리에 올린다
 *    ④ 그 자리에 사진이 붙었는지 확인한다
 *
 *  ①을 빼먹으면 파일 고르기 창이 떠서 앱이 멈춘 것처럼 보인다 (P2 와 같은 함정).
 *
 *  ── 자리를 찾는 방법 (한 번 틀렸던 곳) ──────────────────────────────
 *  처음에는 '뒷면' 글자에서 부모를 타고 올라가 큰 상자를 찾았다. 그런데 두 자리가
 *  한 상자 안에 나란히 있으면 둘 다 같은 부모가 잡혀, 뒷면을 누른다고 눌러도
 *  아무 일이 없었다. 그래도 파일칸에 파일을 꽂아 버리니 사이트는 직전에 기억해 둔
 *  자리(앞면)에 그대로 올렸다 — 전면·후면이 둘 다 앞면에 들어간 이유다.
 *
 *  지금은 글자와 상자를 좌표로 짝짓는다. 이름표는 제 상자 바로 아래에 있으므로
 *  "가로 가운데가 가깝고, 상자 아래에 붙어 있는" 것을 고른다.
 *  그리고 십자가를 누른 뒤 사이트가 파일칸을 실제로 불렀는지 확인한다.
 *  부르지 않았으면 올리지 않고 알린다 — 엉뚱한 자리에 넣느니 멈추는 편이 낫다.
 */

/** 카인포: [사진등록] 을 눌러 사진 팝업을 띄운다 */
const CI_OPEN_PHOTO_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  var byId = document.getElementById('btnModCarimg');
  if (byId) { byId.click(); return { ok: true, how: '#btnModCarimg' }; }
  var all = document.querySelectorAll('a,button,input[type=button],span,div');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.children.length > 2) continue;
    var t = norm(el.textContent || el.value || '');
    if (t !== '사진등록' && t !== '사진등록하기') continue;
    el.click();
    return { ok: true, how: t };
  }
  return { ok: false, error: '[사진등록] 단추를 찾지 못했습니다.' };
})()`;

/** 카인포 사진 팝업이 열렸는가 (자리 이름표로 알아본다) */
const CI_PHOTO_READY_EXPR = `(function () {
  var txt = String(document.body ? document.body.textContent : '').replace(/\\s+/g, '');
  return txt.indexOf('앞면') >= 0 && txt.indexOf('뒷면') >= 0 &&
         (txt.indexOf('좌측면') >= 0 || txt.indexOf('기타1') >= 0);
})()`;

/** 경기조합: 「4 자동차사진」 탭을 연다 */
const PHOTO_TAB_EXPR = `(function () {
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  var hit = null;
  var all = document.querySelectorAll('li,a,button,span,div');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.children.length > 2) continue;
    var t = norm(el.textContent);
    if (t.indexOf('자동차사진') < 0 || t.length > 12) continue;
    hit = el; break;
  }
  if (!hit) {
    /*  왜 없는지까지 알려 준다.
     *  접수등록 화면이 닫혀 목록으로 돌아가 있으면 이 탭이 아예 없다 —
     *  앱이 실수로 저장을 일으켜 화면이 넘어갔을 때 그렇게 됐다. */
    var body = norm(document.body ? document.body.textContent : '');
    var 접수 = body.indexOf('신청인') >= 0 || body.indexOf('접수정보') >= 0;
    return {
      ok: false,
      error: '「자동차사진」 탭을 찾지 못했습니다.' +
             (접수 ? ' (접수등록 화면은 열려 있습니다)'
                   : ' 접수등록 화면이 닫혀 있습니다 — 조합 창에서 그 차의 접수등록을 다시 열어 주세요.'),
      주소: String(location.href).split('/').pop(),
    };
  }
  hit.click();
  return { ok: true };
})()`;

/** 사진 자리를 찾고 상태를 읽는 공통 코드 */
const COMMON = `
  function norm(s) { return String(s || '').replace(/\\s+/g, ''); }
  function rectOf(el) {
    try {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return { x: r.left, y: r.top, w: r.width, h: r.height,
               cx: r.left + r.width / 2, cy: r.top + r.height / 2, bottom: r.bottom };
    } catch (e) { return null; }
  }

  /*  사진이 들어갈 만한 큰 상자들 — 그 안에 또 큰 상자가 없는 것(가장 안쪽)만.
   *
   *  단, 이미 올라간 사진(img)은 "안쪽 상자" 로 치지 않는다.
   *  이걸 빼먹으면 사진이 한 장 붙는 순간 그 자리를 못 찾게 되어,
   *  "올렸는데 확인이 안 된다" 거나 두 번째 전송이 헛돌게 된다. */
  var SKIP_TAG = { HTML: 1, BODY: 1, HEAD: 1, SCRIPT: 1, STYLE: 1, TITLE: 1, META: 1, LINK: 1 };

  /*  ── 한 번 잰 것은 다시 재지 않는다 (속도) ─────────────────────────
   *
   *  자리를 찾으려면 화면의 모든 요소 크기를 재야 한다. 그런데 이걸
   *  자리마다·부호마다 다시 하다 보니 사진 여덟 장을 올리는 데 한참 걸렸다.
   *  (크기 재기는 브라우저가 화면 배치를 다시 계산하게 만들어 특히 느리다)
   *  한 번 실행되는 동안은 결과를 담아 두고 그대로 쓴다. */
  var _boxes = null;
  var _slots = {};

  function photoBoxes() {
    if (_boxes) return _boxes;
    var out = [];
    //  태그를 미리 정해 두면 놓친다 — ul·figure·section 같은 것으로 만든 자리가 있다.
    //  그래서 전부 훑고 크기와 내용물로 가린다.
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (SKIP_TAG[el.tagName]) continue;
      /*  사진(img) 자체를 자리로 잡으면 안 된다.
       *  그 안에서 사진을 찾을 수 없어 "사진이 바뀌었다" 를 영영 못 알아챈다.
       *  실제로 카인포 앞면·뒷면·좌측면·우측면이 img 로 잡혀, 사진은 올라갔는데
       *  확인이 끝나지 않았다. 자리는 사진을 담는 상자여야 한다. */
      if (el.tagName === 'IMG' || el.tagName === 'CANVAS') continue;
      var r = rectOf(el);
      if (!r || r.w < 100 || r.h < 80 || r.w > 1200 || r.h > 900) continue;
      var inner = false;
      for (var j = 0; j < el.children.length; j++) {
        var ch = el.children[j];
        if (ch.tagName === 'IMG' || ch.tagName === 'CANVAS') continue;   // 사진은 내용물이다
        var cr = rectOf(ch);
        //  거의 같은 크기로 겹쳐 있는 껍데기는 "안쪽 상자" 로 치지 않는다
        if (!cr) continue;
        if (cr.w >= 100 && cr.h >= 80 && (cr.w < r.w - 8 || cr.h < r.h - 8)) { inner = true; break; }
      }
      if (inner) continue;
      out.push({ el: el, r: r });
    }
    _boxes = out;
    return out;
  }

  /*  '앞면' · '뒷면' 이름표.
   *  태그를 미리 정해 두면 놓친다 — figcaption 처럼 생각 못 한 태그를 쓰기도 한다.
   *  그래서 전부 훑고 "글자만 든 잎 요소" 로 가린다. */
  var _labels = null;
  function labelOf(word) {
    if (!_labels) {
      //  한 번만 훑어 글자 -> 요소 표를 만든다 (자리마다 다시 훑으면 느리다)
      _labels = {};
      var all = document.getElementsByTagName('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (SKIP_TAG[el.tagName] || el.children.length) continue;
        var t = norm(el.textContent);
        if (!t || t.length > 6) continue;
        if (_labels[t] === undefined) _labels[t] = el;
      }
    }
    var hit = _labels[word];
    if (!hit) return null;
    var r = rectOf(hit);
    return r ? { el: hit, r: r } : null;
  }

  /*  이름표에 딸린 상자.
   *  이름표는 제 상자 바로 아래에 붙어 있다 —
   *  가로 가운데가 가깝고, 상자 아래끝이 이름표 위쪽에 있는 것을 고른다. */
  function findSlot(word) {
    //  이미 찾아 둔 것이 아직 화면에 있으면 그대로 쓴다
    var got = _slots[word];
    if (got !== undefined) {
      if (!got || document.contains(got.box)) return got;
      delete _slots[word];                    // 화면이 새로 그려졌으면 다시 찾는다
      _boxes = null;
    }

    /*  올릴 때 표를 달아 둔 자리가 있으면 그것이 확실하다.
     *  사진이 붙고 나면 화면 모양이 달라져 다시 찾기가 흔들리기 때문이다. */
    var marked = document.querySelector('[data-cc-slot="' + word + '"]');
    if (marked) {
      var mr = rectOf(marked);
      if (mr) return (_slots[word] = { label: null, box: marked, r: mr });
    }

    var lab = labelOf(word);
    if (!lab) return (_slots[word] = null);

    /*  이름표 바로 위에 있는 상자를 고른다.
     *  조건을 빡빡하게 걸었더니 실제 화면에서 하나도 안 걸렸다("자리를 찾지 못했습니다").
     *  그래서 넉넉히 잡고 점수로 고른다 — 가로로 겹치고, 이름표보다 위에 있으며,
     *  이름표를 품고 있지 않은 것 중에서 가장 가까운 것. */
    var best = null, bestScore = 1e9;
    photoBoxes().forEach(function (b) {
      if (b.el.contains(lab.el)) return;                 // 이름표를 품은 상자는 제외
      var gap = lab.r.y - b.r.bottom;                    // 상자 아래 ~ 이름표 위
      if (gap < -b.r.h * 0.5 || gap > 220) return;       // 위아래로 너무 떨어져 있다
      var overlap = Math.min(b.r.x + b.r.w, lab.r.x + lab.r.w) - Math.max(b.r.x, lab.r.x);
      if (overlap <= 0) return;                          // 가로로 겹치지 않는다
      var dx = Math.abs(b.r.cx - lab.r.cx);
      var score = dx + Math.max(0, gap);
      //  점수가 비슷하면 더 작은(안쪽) 상자를 고른다 — 껍데기보다 진짜 자리에 가깝다
      if (score < bestScore - 4 ||
          (Math.abs(score - bestScore) <= 4 && best && b.r.w * b.r.h < best.r.w * best.r.h)) {
        bestScore = Math.min(score, bestScore);
        best = b;
      }
    });
    /*  이름표가 상자 안에 들어 있는 화면도 있다.
     *  그때는 이름표에서 위로 올라가 "다른 이름표를 품지 않는" 첫 큰 상자를 쓴다. */
    if (!best) {
      var otherLab = labelOf(word === '앞면' ? '뒷면' : '앞면');
      var node = lab.el.parentElement, guard = 0;
      while (node && guard++ < 8) {
        var rr = rectOf(node);
        if (rr && rr.w >= 100 && rr.h >= 80 && !(otherLab && node.contains(otherLab.el))) {
          return (_slots[word] = { label: lab.el, box: node, r: rr });
        }
        node = node.parentElement;
      }
      return (_slots[word] = null);
    }
    return (_slots[word] = { label: lab.el, box: best.el, r: best.r });
  }

  /*  사진 한 장이 올라가면 「수정되었습니다」 같은 안내창이 뜨고,
   *  그걸 닫아야 다음 장을 넣을 수 있다. 보이면 눌러서 닫는다. */
  function closeNotice() {
    var words = ['확인', 'ok', '닫기', 'yes'];
    var all = document.querySelectorAll('button,a,input[type=button],input[type=submit],span');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length > 1) continue;
      var t = norm(el.textContent || el.value || '').toLowerCase();
      if (words.indexOf(t) < 0) continue;
      var r = rectOf(el);
      if (!r || r.w < 20 || r.h < 14) continue;
      //  화면 한가운데 떠 있는 것만 (표 안의 '확인' 단추를 누르지 않도록)
      var top = null;
      try { top = document.elementFromPoint(r.cx, r.cy); } catch (e) {}
      if (top && top !== el && !el.contains(top)) continue;
      el.click();
      return true;
    }
    return false;
  }

  /** 그 자리에 지금 무엇이 붙어 있는지 (사진이 바뀌었는지 보려고) */
  function sigOf(word) {
    var s = findSlot(word);
    if (!s) return '(자리없음)';
    var parts = [];
    //  자리가 사진 그 자체인 경우도 있다 (그때는 제 주소를 본다)
    if (s.box.tagName === 'IMG') parts.push(String(s.box.currentSrc || s.box.src || '').slice(-60));
    Array.prototype.slice.call(s.box.querySelectorAll('img')).forEach(function (im) {
      var r = im.getBoundingClientRect();
      if (r.width > 30 && r.height > 30) parts.push(String(im.currentSrc || im.src || '').slice(-60));
    });
    var bg = '';
    try { bg = window.getComputedStyle(s.box).backgroundImage || ''; } catch (e) {}
    if (bg && bg !== 'none') parts.push(bg.slice(-60));
    return parts.join('|') || '(빈자리)';
  }
`;

/** 사진 화면의 구조를 알려준다 (실패했을 때 무엇을 봤는지 알려주려고) */
function buildPhotoProbeScript() {
  return `(function () {
  ${COMMON}
  function tell(el) {
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: String(el.className || '').slice(0, 60),
      onclick: String((el.getAttribute && el.getAttribute('onclick')) || '').slice(0, 160),
      html: String(el.outerHTML || '').slice(0, 260),
    };
  }
  var WORDS = ['앞면', '뒷면', '좌측면', '우측면', '기타1', '기타2', '기타3', '기타4'];
  var labels = {}, slots = {};
  WORDS.forEach(function (w) {
    var l = labelOf(w);
    labels[w] = l ? [Math.round(l.r.x), Math.round(l.r.y), Math.round(l.r.w), Math.round(l.r.h)] : null;
    var s = findSlot(w);
    slots[w] = s ? (s.box.tagName.toLowerCase() + (s.box.id ? '#' + s.box.id : '') +
                    ' ' + [Math.round(s.r.x), Math.round(s.r.y), Math.round(s.r.w), Math.round(s.r.h)].join(',')) : null;
  });
  var front = findSlot('앞면');
  var rear = findSlot('뒷면');
  return {
    url: location.href,
    labels: labels,
    slots: slots,
    boxes: photoBoxes()
      .sort(function (a, b) { return b.r.w * b.r.h - a.r.w * a.r.h; })
      .slice(0, 14)
      .map(function (b) {
        return { tag: b.el.tagName.toLowerCase(), id: b.el.id || null,
                 cls: String(b.el.className || '').slice(0, 40),
                 rect: [Math.round(b.r.x), Math.round(b.r.y), Math.round(b.r.w), Math.round(b.r.h)] };
      }),
    front: front ? tell(front.box) : null,
    rear: rear ? tell(rear.box) : null,
    sig: (function () { var o = {}; WORDS.forEach(function (w) { o[w] = sigOf(w); }); return o; })(),
    files: Array.prototype.slice.call(document.querySelectorAll('input[type=file]')).map(function (f) {
      return { id: f.id || null, name: f.name || null };
    }),
    texts: Array.prototype.slice.call(document.querySelectorAll('div,span,td,p'))
      .filter(function (e) { return !e.children.length && rectOf(e) && norm(e.textContent).length > 1 && norm(e.textContent).length < 20; })
      .slice(0, 40).map(function (e) { return norm(e.textContent); }),
  };
})()`;
}

/**
 * 십자가를 눌러 "이 자리에 넣겠다" 고 알리고, 파일칸에 표를 달아 둔다.
 * 파일 고르기 창은 뜨지 않게 막는다.
 *
 * @param which '앞면' | '뒷면'
 */
function buildPhotoPrepScript(which) {
  return `(async function () {
  ${COMMON}
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var want = ${JSON.stringify(which)};

  /*  앞 장에서 뜬 안내창이 남아 있으면 먼저 닫는다. 열려 있으면 다음 자리를 못 누른다. */
  for (var g = 0; g < 6; g++) {
    if (!closeNotice()) break;
    await sleep(120);
  }

  /*  사이트가 alert 로 알리는 경우 페이지가 통째로 멈춘다.
   *  올리는 동안에는 잠시 막아 둔다 (뒷정리에서 되돌린다). */
  if (!window.__ccAlert) {
    window.__ccAlert = window.alert;
    window.alert = function () {};
  }

  var slot = findSlot(want);
  if (!slot) return { ok: false, error: want + ' 자리를 찾지 못했습니다.' };

  var inputs = Array.prototype.slice.call(document.querySelectorAll('input[type=file]'));
  if (!inputs.length) return { ok: false, error: '파일칸(input[type=file])이 없습니다.' };

  //  ① 파일 고르기 창이 뜨지 못하게 막는다 (원래 것은 남겨 두었다가 되돌린다)
  inputs.forEach(function (inp) {
    if (!inp.__ccClick) {
      inp.__ccClick = inp.click;
      inp.click = function () { inp.setAttribute('data-cc-called', '1'); };
    }
    inp.removeAttribute('data-cc-called');
    inp.removeAttribute('data-cc-target');
  });

  //  이 자리에 표를 달아 둔다 — 사진이 붙어 모양이 바뀌어도 같은 자리를 보게
  slot.box.setAttribute('data-cc-slot', want);

  //  넣기 전 모든 자리의 모습 — 엉뚱한 자리가 바뀌면 잡아내려고
  var WORDS = ['앞면', '뒷면', '좌측면', '우측면', '기타1', '기타2', '기타3', '기타4'];
  var before = {};
  WORDS.forEach(function (w) { if (labelOf(w)) before[w] = sigOf(w); });

  //  ② 십자가를 누른다. 상자 한가운데에 실제로 보이는 요소를 눌러 준다
  //     (상자를 감싼 껍데기를 눌러 봐야 사이트는 아무 반응이 없다)
  var hit = null;
  try { hit = document.elementFromPoint(slot.r.cx, slot.r.cy); } catch (e) {}
  if (!hit || !slot.box.contains(hit)) hit = slot.box;

  //  정해진 시간을 무조건 기다리지 말고, 사이트가 파일칸을 부르면 바로 넘어간다
  function calledNow() {
    return inputs.filter(function (i) { return i.getAttribute('data-cc-called'); });
  }
  async function waitCalled(ms) {
    var t = Date.now();
    while (Date.now() - t < ms) {
      var c = calledNow();
      if (c.length) return c;
      await sleep(40);
    }
    return calledNow();
  }

  hit.click();
  var called = await waitCalled(700);

  //  안 먹으면 상자 자체를 한 번 더
  if (!called.length && hit !== slot.box) {
    slot.box.click();
    called = await waitCalled(700);
  }

  /*  파일칸을 불렀으면 표를 달아 둔다.
   *  부르지 않았어도 여기서 멈추지는 않는다 — 요즘은 앱이 파일 고르기 자체를
   *  가로채서 "어느 칸이 열렸는지" 를 직접 듣기 때문이다(그쪽이 더 확실하다).
   *  <label> 로 여는 화면(카인포)은 이 표가 안 달린다.
   *  둘 다 없으면 앱이 "자리를 모른다" 고 보고 올리지 않는다. */
  if (called.length) called[0].setAttribute('data-cc-target', '1');

  return {
    ok: true,
    which: want,
    before: before,
    called: called.length,
    targetId: called.length ? (called[0].id || called[0].name || '(이름없음)') : null,
    hit: hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : ''),
    rect: [Math.round(slot.r.x), Math.round(slot.r.y), Math.round(slot.r.w), Math.round(slot.r.h)],
  };
})()`;
}

/**
 * 파일칸에 넣은 뒤 — 그 자리의 사진이 바뀌었는지 확인한다.
 * 엉뚱한 자리가 바뀌었으면 그것도 알린다.
 */
/**
 * 그 자리를 한 번 들여다본다 — 기다리지 않고 바로 답한다.
 *
 *  기다리는 일을 페이지 안에서 하면 안 된다. 사진이 올라가면 사이트가 화면을
 *  새로 그리는데, 그때 기다리던 스크립트가 통째로 사라져 답이 영영 오지 않는다
 *  (「사진 확인 응답이 없어 중단했습니다(25초)」의 정체다).
 *  그래서 여기서는 지금 모습만 알려주고, 기다리는 일은 앱이 맡는다.
 */
function buildPhotoWatchScript(which) {
  return `(function () {
  ${COMMON}
  //  사이트가 alert 로 알리면 페이지가 멈춘다. 화면이 새로 그려질 때마다 다시 막아 둔다.
  if (!window.__ccAlert) { window.__ccAlert = window.alert; window.alert = function () {}; }
  var closed = false;
  try { closed = closeNotice(); } catch (e) {}
  return { sig: sigOf(${JSON.stringify(which)}), closed: closed };
})()`;
}

function buildPhotoVerifyScript(which, before, opts) {
  //  안내창을 얼마나 기다릴지. 안 뜨는 사이트(경기조합)에서 오래 기다리면 그만큼 느리다.
  const noticeWait = (opts && opts.noticeWait) || 250;
  return `(async function () {
  ${COMMON}
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var want = ${JSON.stringify(which)};
  var was = ${JSON.stringify(before || {})};
  var NOTICE_WAIT = ${noticeWait};

  /*  촘촘히 보고 바뀌는 즉시 넘어간다 (예전에는 0.25초씩 쉬어 사진마다 시간을 버렸다)
   *  올라가면 「수정되었습니다」 안내창이 뜬다. 그것도 여기서 닫는다 —
   *  닫지 않으면 다음 사진을 넣을 수 없다. */
  var closed = false;
  var done = false;
  var until = Date.now() + 12000;
  while (Date.now() < until) {
    var now = sigOf(want);
    if (!done && now !== was[want] && now !== '(빈자리)' && now !== '(자리없음)') done = true;
    if (closeNotice()) { closed = true; await sleep(120); continue; }
    if (done) {
      /*  안내창은 조금 늦게 뜨기도 한다. 뜨면 바로 닫고 끝낸다.
       *  (무조건 기다리면 사진마다 시간을 버린다 — 여덟 장에 7초를 잡아먹었다) */
      if (!closed) {
        var t2 = Date.now() + NOTICE_WAIT;
        while (Date.now() < t2) {
          if (closeNotice()) { closed = true; break; }
          await sleep(45);
        }
      }
      return { ok: true, which: want, closed: closed };
    }
    await sleep(60);
  }

  //  의도한 자리는 그대로인데 다른 자리가 바뀌었으면 그 사실을 알린다
  var moved = [];
  Object.keys(was).forEach(function (w) {
    if (w === want) return;
    if (sigOf(w) !== was[w]) moved.push(w);
  });
  if (moved.length) {
    return { ok: false, which: want,
             error: want + ' 에 넣으려 했는데 ' + moved.join('·') + ' 자리가 바뀌었습니다.' };
  }
  return { ok: false, which: want, error: want + ' 자리에 사진이 나타나지 않았습니다.' };
})()`;
}

/** 막아 둔 파일칸 click 을 원래대로 돌린다 */
const PHOTO_RESTORE_EXPR = `(function () {
  var n = 0;
  Array.prototype.slice.call(document.querySelectorAll('input[type=file]')).forEach(function (inp) {
    if (inp.__ccClick) { inp.click = inp.__ccClick; delete inp.__ccClick; n++; }
    inp.removeAttribute('data-cc-called');
    inp.removeAttribute('data-cc-target');
  });
  Array.prototype.slice.call(document.querySelectorAll('[data-cc-slot]')).forEach(function (el) {
    el.removeAttribute('data-cc-slot');
  });
  if (window.__ccAlert) { window.alert = window.__ccAlert; delete window.__ccAlert; }
  return n;
})()`;

module.exports = {
  PHOTO_TAB_EXPR,
  PHOTO_RESTORE_EXPR,
  CI_OPEN_PHOTO_EXPR,
  CI_PHOTO_READY_EXPR,
  buildPhotoProbeScript,
  buildPhotoPrepScript,
  buildPhotoVerifyScript,
  buildPhotoWatchScript,
};
