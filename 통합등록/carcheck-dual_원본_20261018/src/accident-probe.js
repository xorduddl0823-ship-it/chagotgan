/**
 * 사고체크 화면 구조 조사
 * ------------------------------------------------------------------
 * 두 사이트의 절개도(사고·교환·수리 이력) 조작 방식이 서로 다르다.
 *
 *   경기조합  부위를 클릭 -> 팝업이 뜸 -> 상태 체크박스(교환/부식/판금·용접/흠집/요철/손상) -> [저장]
 *   카인포    상태를 라디오로 먼저 고름 -> 차량 그림의 점을 클릭  (안내문: "위 표시 기호를
 *             선택한 후 차량 이미지에서 부위를 클릭하세요")
 *
 * 두 방식 모두 그림 위의 클릭 대상이 무엇인지(무슨 태그·id·좌표인지) 알아야
 * 자동화할 수 있는데, 로그인이 필요한 화면이라 밖에서는 확인할 수 없다.
 * 그래서 열려 있는 사이트 창 안에서 한 번 훑어 구조를 파일로 뽑아낸다.
 *
 * 값을 바꾸지 않는다. 읽기만 한다.
 */

function buildProbeScript(siteKey) {
  return `(async function () {
  var out = { site: ${JSON.stringify(siteKey)}, url: location.href, title: document.title };

  function attrs(el) {
    var a = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var n = el.attributes[i];
      if (n.name === 'style') continue;
      a[n.name] = String(n.value).slice(0, 120);
    }
    return a;
  }

  function box(el) {
    try {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    } catch (e) { return null; }
  }

  function txt(el) {
    return String(el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
  }

  function describe(el) {
    return { tag: el.tagName.toLowerCase(), attr: attrs(el), box: box(el), text: txt(el) };
  }

  /* ── 1. 차량 그림 후보 ─────────────────────────────────────────
     사고 절개도는 <img>+<map>, <svg>, 또는 점들을 얹은 <div> 중 하나다. */
  out.images = [];
  Array.prototype.slice.call(document.querySelectorAll('img')).forEach(function (im) {
    var src = String(im.getAttribute('src') || '');
    var b = box(im);
    if (!b || b[2] < 80 || b[3] < 60) return;              // 아이콘 제외
    out.images.push({ src: src.slice(-90), usemap: im.getAttribute('usemap') || null, box: b });
  });

  out.maps = [];
  Array.prototype.slice.call(document.querySelectorAll('map')).forEach(function (m) {
    out.maps.push({
      name: m.getAttribute('name'),
      areas: Array.prototype.slice.call(m.querySelectorAll('area')).slice(0, 120).map(function (a) {
        return { alt: a.getAttribute('alt'), title: a.getAttribute('title'),
                 shape: a.getAttribute('shape'), coords: a.getAttribute('coords'),
                 href: String(a.getAttribute('href') || '').slice(0, 60), attr: attrs(a) };
      }),
    });
  });

  out.svgs = [];
  Array.prototype.slice.call(document.querySelectorAll('svg')).forEach(function (s) {
    var b = box(s);
    if (!b || b[2] < 80) return;
    out.svgs.push({
      viewBox: s.getAttribute('viewBox'), box: b,
      kids: Array.prototype.slice.call(s.querySelectorAll('[id],[class],[data-no],[data-part]'))
        .slice(0, 150).map(describe),
    });
  });

  /* ── 2. 클릭 지점 후보 ─────────────────────────────────────────
     카인포는 그림 위에 점(초록 동그라미)을 얹어 두고 그것을 누르게 한다.
     이름에 part/pos/point/dot/area/spot/mark 가 들어간 요소를 모은다. */
  var HINT = /part|pos|point|dot|spot|mark|area|panel|frame|acc|damage|bu-?wi|carimg|carmap/i;
  out.spots = [];
  var all = document.querySelectorAll('div,span,a,button,circle,rect,path,polygon,li,td');
  for (var i = 0; i < all.length && out.spots.length < 260; i++) {
    var el = all[i];
    var id = el.id || '';
    var cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : (el.className || ''));
    var data = Object.keys(el.dataset || {}).join(',');
    if (!HINT.test(id + ' ' + cls + ' ' + data)) continue;
    var b = box(el);
    if (!b) continue;
    if (b[2] > 420 || b[3] > 420) continue;                 // 큰 상자는 담는 틀이므로 제외
    out.spots.push(describe(el));
  }

  /* ── 3. 상태 기호 고르는 것 (카인포 라디오 / 경기조합 팝업 체크박스) ── */
  function labelOf(el) {
    var t = '';
    try { if (el.labels && el.labels.length) t = el.labels[0].textContent; } catch (e) {}
    if (!t && el.id) { var l = document.querySelector('label[for="' + el.id + '"]'); if (l) t = l.textContent; }
    if (!t && el.closest) { var c = el.closest('label'); if (c) t = c.textContent; }
    if (!t && el.parentNode) t = el.parentNode.textContent;
    return String(t || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
  }

  var CODE = /교환|부식|판금|용접|흠집|요철|손상|표기삭제|전체삭제|완료/;
  out.codeInputs = [];
  Array.prototype.slice.call(document.querySelectorAll('input[type=radio],input[type=checkbox]'))
    .forEach(function (el) {
      var lab = labelOf(el);
      if (!CODE.test(lab)) return;
      out.codeInputs.push({ tag: 'input', type: el.type, name: el.name || null, id: el.id || null,
                            value: el.value, label: lab, checked: !!el.checked, box: box(el) });
    });

  /* ── 4. 부위 체크박스 (아래쪽 "교환, 판금 등 이상 부위" 표) ── */
  var PART = /후드|펜더|휀다|도어|트렁크|라디에이터|쿼터|루프|사이드실|프론트패널|크로스멤버|인사이드|사이드멤버|휠하우스|필러|대쉬|플로어|리어패널|패키지트레이/;
  out.partBoxes = [];
  Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox]')).forEach(function (el) {
    var lab = labelOf(el);
    if (!PART.test(lab)) return;
    out.partBoxes.push({ name: el.name || null, id: el.id || null, value: el.value,
                         label: lab, checked: !!el.checked, box: box(el) });
  });

  /* ── 5. 사고이력 / 수리이력 라디오 ── */
  var HIST = /사고이력|수리이력|단순수리/;
  out.history = [];
  Array.prototype.slice.call(document.querySelectorAll('input[type=radio]')).forEach(function (el) {
    var lab = labelOf(el);
    var near = el.closest ? txt(el.closest('tr,div')) : '';
    if (!HIST.test(lab) && !HIST.test(near)) return;
    out.history.push({ name: el.name || null, id: el.id || null, value: el.value,
                       label: lab, near: near.slice(0, 50), checked: !!el.checked });
  });

  /* ── 6. 화면의 모든 입력칸 ─────────────────────────────────────
     경기조합 「1. 신청인 및 접수정보」의 신청인정보가 채워지지 않는 문제 때문에
     어떤 칸이 어떤 id/name 을 갖는지 통째로 남긴다. 탭이 숨어 있어도 DOM 에는
     있으므로 여기서 잡힌다. 값은 개인정보가 될 수 있어 담지 않는다. */
  out.fields = [];
  Array.prototype.slice.call(document.querySelectorAll('input,select,textarea'))
    .slice(0, 500)
    .forEach(function (el) {
      var type = (el.type || el.tagName).toLowerCase();
      if (type === 'hidden') return;
      out.fields.push({
        tag: el.tagName.toLowerCase(),
        type: type,
        id: el.id || null,
        name: el.name || null,
        label: labelOf(el).slice(0, 30),
        filled: !!String(el.value || '').trim(),   // 값 자체는 담지 않는다
        disabled: !!el.disabled,
        checked: (el.type === 'radio' || el.type === 'checkbox') ? !!el.checked : null,
        box: box(el),
      });
    });

  /* ── 6-B. 절개도의 번호 글자 ───────────────────────────────────
     카인포 절개도는 초록 점(div.select-circle.part-NN)과 그 옆의 번호 글자로
     되어 있는데, part-NN 은 사이트 내부 좌표 id 라 국토부 부위번호와 다르다.
     점 옆에 적힌 번호를 좌표와 함께 남겨 두면, 가장 가까운 점과 짝지어
     "part-NN = 몇 번 부위" 를 확정할 수 있다. */
  out.numbers = [];
  var walker = document.querySelectorAll('div,span,p,b,strong,text,tspan,li,td');
  for (var ni = 0; ni < walker.length && out.numbers.length < 200; ni++) {
    var nel = walker[ni];
    if (nel.children.length) continue;                     // 글자만 든 잎 요소
    var ntxt = String(nel.textContent || '').trim();
    if (!/^[0-9]{1,2}$/.test(ntxt)) continue;              // 1~2자리 숫자만
    var nb = box(nel);
    if (!nb || nb[2] > 60 || nb[3] > 40) continue;
    out.numbers.push({ no: ntxt, box: nb, cls: String(nel.className || '').slice(0, 60) });
  }

  /* ── 7. 탭 이름 ── */
  out.tabs = Array.prototype.slice.call(document.querySelectorAll('a,li,button,span'))
    .filter(function (el) {
      var t = txt(el);
      return /신청인|접수정보|자동차기본정보|자동차세부상태|자동차사진|점검내역/.test(t) && t.length < 30;
    })
    .slice(0, 20)
    .map(function (el) { return { text: txt(el), tag: el.tagName.toLowerCase(), attr: attrs(el) }; });

  /* ── 8. 경기조합 절개도 조사 ───────────────────────────────────
   *
   *  조합 도면의 표기는 부위 목록과 따로 논다. 목록의 체크는 지워지는데
   *  도면의 X 는 그대로 남는 일이 있었다. 도면이 무엇을 보고 그려지는지
   *  (area 의 checkflag 속성, 그 위에 얹힌 글자 요소, 사이트 스크립트)
   *  한 번에 담아 둔다. 값은 바꾸지 않는다 — 팝업은 열어 보기만 하고 닫는다.
   */
  out.cm = null;
  if (document.querySelector('area[pos]')) {
    var cm = { areas: [], markEls: [], scriptSrcs: [], snippets: [], globals: [], popup: null };

    Array.prototype.slice.call(document.querySelectorAll('area')).forEach(function (a) {
      cm.areas.push({
        title: a.getAttribute('title') || a.getAttribute('value') || '',
        pos: a.getAttribute('pos') || null,
        posleft: a.getAttribute('posleft') || null,
        postop: a.getAttribute('postop') || null,
        checkflag: a.getAttribute('checkflag') || '',
      });
    });

    //  도면 위에 얹힌 부호 글자(X·W…)가 어떤 요소로 그려져 있는지
    var leaves = document.querySelectorAll('div,span,p,b,strong,td,font,label,text,tspan');
    for (var mi = 0; mi < leaves.length && cm.markEls.length < 60; mi++) {
      var mel = leaves[mi];
      if (mel.children.length) continue;
      var mtxt = String(mel.textContent || '').trim();
      if (!/^[XCWAUT]{1,3}$/.test(mtxt)) continue;
      cm.markEls.push({
        text: mtxt, tag: mel.tagName.toLowerCase(), attr: attrs(mel), box: box(mel),
        parent: mel.parentNode ? mel.parentNode.tagName.toLowerCase() +
                '.' + String(mel.parentNode.className || '').slice(0, 40) : null,
      });
    }

    //  사이트 스크립트. 바깥 파일은 주소만, 인라인은 checkflag 부근만 잘라 담는다.
    Array.prototype.slice.call(document.querySelectorAll('script')).forEach(function (s) {
      var src = s.getAttribute('src');
      if (src) { cm.scriptSrcs.push(String(src).slice(0, 160)); return; }
      var code = String(s.textContent || '');
      var re = /checkflag|posleft|CheckFlagMark|SelFlagMark/gi;
      var m, n = 0;
      while ((m = re.exec(code)) && n < 8) {
        n++;
        cm.snippets.push(code.slice(Math.max(0, m.index - 300), m.index + 400));
      }
    });

    try {
      Object.keys(window).forEach(function (k) {
        if (typeof window[k] !== 'function') return;
        if (!/flag|mark|area|pos|check|damage|save|pop|img|map/i.test(k)) return;
        if (cm.globals.length < 80) cm.globals.push(k);
      });
    } catch (e) {}

    //  표시가 남아 있는 부위의 팝업을 하나 열어 구조를 본다 (저장하지 않는다)
    var target = null;
    Array.prototype.slice.call(document.querySelectorAll('area')).forEach(function (a) {
      if (!target && (a.getAttribute('checkflag') || '')) target = a;
    });
    if (target) {
      cm.popup = { area: target.getAttribute('title'), flag: target.getAttribute('checkflag') };
      try {
        target.click();
        await new Promise(function (r) { setTimeout(r, 900); });
        //  후보를 하나만 보면 엉뚱한 상자를 팝업으로 착각했을 때 알 수 없다.
        //  조건에 맞는 상자를 최대 3개까지 그대로 담아 둔다.
        var pop = null, cands2 = [];
        var cands = document.querySelectorAll('div,form,section,table');
        for (var pi = 0; pi < cands.length; pi++) {
          var pe = cands[pi];
          var pb = box(pe);
          if (!pb || pb[2] < 120 || pb[2] > 520 || pb[3] < 120 || pb[3] > 620) continue;
          var pboxes = pe.querySelectorAll('input[type=checkbox]');
          if (pboxes.length < 4 || pboxes.length > 10) continue;
          var pt = String(pe.textContent || '');
          if (pt.indexOf('교환') < 0 || pt.indexOf('손상') < 0) continue;
          if (!pop) pop = pe;
          if (cands2.length < 3) {
            cands2.push({
              box: pb,
              names: Array.prototype.slice.call(pboxes).map(function (c) {
                return (c.name || '') + '/' + (c.value || '') + (c.checked ? '(켜짐)' : '');
              }),
              html: String(pe.outerHTML || '').slice(0, 3000),
            });
          }
        }
        cm.popup.candidates = cands2;
        if (pop) {
          cm.popup.html = String(pop.outerHTML || '').slice(0, 6000);
          cm.popup.buttons = Array.prototype.slice
            .call(pop.querySelectorAll('button,input[type=button],input[type=submit],a,span,i,img'))
            .slice(0, 20)
            .map(function (b) {
              return { text: txt(b), tag: b.tagName.toLowerCase(),
                       onclick: String(b.getAttribute('onclick') || '').slice(0, 200),
                       attr: attrs(b) };
            });
          //  저장하지 않고 닫는다
          var closer = null;
          cm.popup.buttons.forEach(function (b, i) {
            if (closer !== null) return;
            if (b.text === '×' || b.text === '취소' || b.text === '닫기' ||
                /close/i.test(String(b.attr.class || '') + ' ' + String(b.attr.id || ''))) closer = i;
          });
          if (closer !== null) {
            var els = Array.prototype.slice.call(
              pop.querySelectorAll('button,input[type=button],input[type=submit],a,span,i,img'));
            if (els[closer]) els[closer].click();
          }
          try {
            document.dispatchEvent(new KeyboardEvent('keydown',
              { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
          } catch (e2) {}
        } else {
          cm.popup.error = '팝업을 찾지 못했습니다';
        }
      } catch (e3) {
        cm.popup.error = e3.message;
      }
    }

    cm.flagged = cm.areas.filter(function (a) { return a.checkflag; })
                         .map(function (a) { return a.title + '=' + a.checkflag; });
    out.cm = cm;
  }

  out.counts = {
    images: out.images.length, maps: out.maps.length, svgs: out.svgs.length,
    spots: out.spots.length, codeInputs: out.codeInputs.length,
    partBoxes: out.partBoxes.length, history: out.history.length,
    fields: out.fields.length, tabs: out.tabs.length, numbers: out.numbers.length,
  };
  return out;
})();`;
}

module.exports = { buildProbeScript };
