/**
 * 카인포 절개도 학습
 * ------------------------------------------------------------------
 * 카인포는 부위 체크박스와 랭크 라디오가 잠겨 있다. 사람이 값을 넣는 통로는
 * 절개도의 녹색 포인트(div.select-circle.part-NN) 하나뿐이고, 체크박스는 그 결과가
 * 비쳐 보이는 표시일 뿐이다.
 *
 * 그런데 part-NN 은 사이트 내부 좌표 id 라서 몇 번 부위인지 화면 어디에도 안 적혀 있다.
 * (절개도의 번호는 그림 이미지에 그려져 있어 DOM 에서 읽을 수 없다)
 *
 * 그래서 사이트에 직접 물어본다.
 *   ① 상태표시에서 [교환] 을 고른다
 *   ② 점을 하나 누른다
 *   ③ 어떤 부위 체크박스가 켜졌는지 본다  ->  이 점 = 그 부위
 *   ④ [전체삭제] 로 지운다
 *   ⑤ 다음 점으로
 * 끝나면 [전체삭제] + [완료] 로 원래대로 돌려놓는다.
 *
 * ※ 표기를 넣었다 지우므로, 이미 표시해 둔 것이 있으면 함께 지워진다.
 *   저장하지 않은 상태에서, 시험용 차량으로 한 번만 돌리면 된다.
 */

function buildLearnScript() {
  return `(async function () {
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var log = [];

  async function waitFor(fn, ms) {
    var t = Date.now();
    while (Date.now() - t < (ms || 3000)) {
      try { var v = fn(); if (v) return v; } catch (e) {}
      await sleep(80);
    }
    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); }
    catch (e) { return false; }
  }

  function labelOf(el) {
    var t = '';
    try { if (el.labels && el.labels.length) t = el.labels[0].textContent; } catch (e) {}
    if (!t && el.id) { var l = document.querySelector('label[for="' + el.id + '"]'); if (l) t = l.textContent; }
    if (!t && el.closest) { var c = el.closest('label'); if (c) t = c.textContent; }
    if (!t && el.parentNode) t = el.parentNode.textContent;
    return String(t || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
  }

  /** 부위 체크박스 이름 -> 라벨 (사람이 읽을 이름) */
  function partBoxes() {
    var out = {};
    Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox]')).forEach(function (b) {
      var nm = String(b.name || '');
      if (!/^(part_\\d+lank|main_[a-z]+lank)_/.test(nm)) return;
      out[nm] = { el: b, label: labelOf(b) };
    });
    return out;
  }

  function checkedNames(map) {
    var on = [];
    Object.keys(map).forEach(function (k) { if (map[k].el.checked) on.push(k); });
    return on;
  }

  function radio(id) {
    var e = document.getElementById(id);
    return (e && e.type === 'radio' && e.name === 'selection') ? e : null;
  }

  function press(el) {
    if (!el) return false;
    el.click();
    if (!el.checked) {
      el.checked = true;
      ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
    }
    return !!el.checked;
  }

  /* ── 준비 확인 ─────────────────────────────────────────── */
  var boxes = partBoxes();
  var names = Object.keys(boxes);
  if (!names.length) {
    return { ok: false, error: '부위 체크박스를 찾지 못했습니다. 카인포 창에서 [성능점검] 상세 화면을 연 뒤 다시 눌러 주세요.' };
  }
  if (!isVisible(boxes[names[0]].el)) {
    return { ok: false, error: '부위 표가 화면에 없습니다. 카인포 창에서 [성능점검] 상세 화면을 연 뒤 다시 눌러 주세요.' };
  }

  var clearAll = radio('maskdelall');
  var finish = radio('maskfin');
  var markX = radio('x');
  if (!markX || !clearAll) {
    return { ok: false, error: '상태표시(교환)나 전체삭제 항목을 찾지 못했습니다.' };
  }

  function dots() {
    return Array.prototype.slice
      .call(document.querySelectorAll('div[class*="select-circle"][class*="part-"]'))
      .filter(isVisible);
  }

  function dotId(el) {
    var m = String(el.className || '').match(/part-([0-9a-z\\-]+)/);
    return m ? m[1] : '';
  }

  /* ── 부호마다 어떤 점이 보이는지 먼저 둘러본다 ─────────────────
   *
   *  판금(W)은 교환(X)보다 점이 많고 자리도 다르다. 교환만 보고 만든 이름표로는
   *  판금을 찍을 수 없다. 그래서 부호를 하나씩 골라 보이는 점을 적어 둔다.
   *  (여기서는 누르지 않는다 — 보기만 하므로 빠르다)
   */
  var CODES = [['x', '교환'], ['c', '부식'], ['w', '판금'], ['a', '흠집'], ['u', '요철'], ['t', '손상']];
  var byCode = {};
  var classOf = {};
  var order = [];                       // 눌러서 알아볼 순서: (부호, 점 id)

  press(clearAll);
  await sleep(300);

  for (var ci = 0; ci < CODES.length; ci++) {
    var code = CODES[ci][0];
    var r0 = radio(code);
    if (!r0) continue;
    press(r0);
    await sleep(220);
    var seen = dots();
    var ids = [];
    seen.forEach(function (el) {
      var id = dotId(el);
      if (!id) return;
      ids.push(id);
      if (!classOf[id]) classOf[id] = String(el.className || '').replace(/\\s+/g, ' ').trim();
      if (order.every(function (o) { return o.id !== id; })) order.push({ id: id, code: code });
    });
    byCode[code] = ids;
    log.push(CODES[ci][1] + '(' + code.toUpperCase() + ') 점 ' + ids.length + '개');
  }

  if (!order.length) {
    return { ok: false, error: '절개도의 녹색 포인트를 찾지 못했습니다. 상태표시에서 [교환] 을 한 번 눌러 점이 보이게 한 뒤 다시 시도해 주세요.' };
  }
  log.push('알아볼 점 모두 ' + order.length + '개 · 부위칸 ' + names.length + '개');

  /* ── 깨끗한 상태에서 시작 ───────────────────────────────── */
  press(clearAll);
  await sleep(400);

  /* ── 점을 하나씩 눌러 어느 부위인지 알아낸다 ─────────────── */
  var map = {};      // part-NN -> { box, label, rect, codes, cls }
  var unknown = 0;

  for (var i = 0; i < order.length; i++) {
    var partId = order[i].id;
    if (map[partId]) continue;

    //  그 점이 보이는 부호를 고른 뒤 찾는다
    var rc = radio(order[i].code);
    if (!rc) continue;
    press(rc);
    await sleep(140);

    var dot = null;
    var live = dots();
    for (var j = 0; j < live.length; j++) if (dotId(live[j]) === partId) { dot = live[j]; break; }
    if (!dot) continue;                   // 이 부호에서는 안 보인다

    var rect = null;
    try { var r = dot.getBoundingClientRect(); rect = [Math.round(r.left), Math.round(r.top)]; } catch (e) {}

    var before = checkedNames(boxes);
    dot.click();
    await sleep(260);

    var after = checkedNames(boxes);
    var added = after.filter(function (n) { return before.indexOf(n) < 0; });

    //  이 점을 받는 부호 목록
    var takes = [];
    Object.keys(byCode).forEach(function (c) {
      if (byCode[c].indexOf(partId) >= 0) takes.push(c.toUpperCase());
    });

    if (added.length === 1) {
      map[partId] = { box: added[0], label: boxes[added[0]].label, rect: rect,
                      codes: takes, cls: classOf[partId] || null };
    } else {
      map[partId] = { box: null, label: null, rect: rect, codes: takes, cls: classOf[partId] || null,
                      note: added.length ? '여러 칸(' + added.join(',') + ')' : '반응 없음' };
      unknown++;
    }

    press(clearAll);
    await sleep(220);
  }

  /* ── 원래대로 되돌리기 ─────────────────────────────────── */
  press(clearAll);
  await sleep(300);
  if (finish) press(finish);

  var known = Object.keys(map).filter(function (k) { return map[k].box; });
  log.push('알아낸 포인트 ' + known.length + '개 / 못 알아낸 것 ' + unknown + '개');

  return { ok: true, map: map, byCode: byCode, log: log,
           total: Object.keys(map).length, known: known.length };
})();`;
}

module.exports = { buildLearnScript };
