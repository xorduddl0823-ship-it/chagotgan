/**
 * 각 사이트 페이지 안에서 실행될 자동입력 스크립트를 생성한다.
 * 실행 결과로 { filled:[], missing:[], skipped:[] } 리포트를 돌려주므로
 * "조용히 실패"하지 않는다.
 */
const { ALL_FIELDS, historyFromParts } = require('./schema');

/**
 * 경기조합 절개도(이미지맵)의 영역 이름표.
 * ------------------------------------------------------------------
 * 경기조합은 부위 목록의 체크박스를 켜도 절개도에는 아무 표시가 안 된다.
 * 도면에 부호를 찍으려면 <img usemap="#Map"> 위의 <area> 를 실제로 눌러야 하고,
 * 그때 뜨는 팝업에서 부호를 고르고 [저장] 해야 한다.
 *
 * 아래 이름은 사이트에서 직접 읽어온 값이다(area 의 title/value 속성).
 * 좌우·전후가 이름에 들어 있어 우리 위치값(@L, @LF …)과 1:1 로 붙는다.
 *   L = 좌, R = 우 / F = 앞, R = 뒤   (예: FL도어 = 좌앞도어)
 */
const CM_AREA = {
  pt1: '후드',
  'pt2@L': 'L휀다', 'pt2@R': 'R휀다',
  'pt3@LF': 'FL도어', 'pt3@LR': 'RL도어', 'pt3@RF': 'FR도어', 'pt3@RR': 'RR도어',
  pt4: '트렁크리드',
  pt5: '라디에이터 서포트',
  'pt6@L': 'L쿼터패널', 'pt6@R': 'R쿼터패널',
  pt7: '루프',
  'pt8@L': 'L사이드실', 'pt8@R': 'R사이드실',
  pt9: '프론트패널',
  pt10: '크로스멤버',
  'pt11@L': 'FL인사이드패널', 'pt11@R': 'FR인사이드패널',
  'pt12@LF': 'FL사이드멤버', 'pt12@RF': 'FR사이드멤버',
  'pt12@LR': 'RL사이드멤버', 'pt12@RR': 'RR사이드멤버',
  'pt13@LF': 'FL휠하우스', 'pt13@RF': 'FR휠하우스',
  'pt13@LR': 'RL휠하우스', 'pt13@RR': 'RR휠하우스',
  'pt14A@L': 'LA필러', 'pt14A@R': 'RA필러',
  'pt14B@L': 'LB필러', 'pt14B@R': 'RB필러',
  'pt14C@L': 'LC필러', 'pt14C@R': 'RC필러',
  pt15: '대쉬패널',
  pt16: '플로어패널',
  pt17: '트렁크플로어',
  pt18: '리어패널',
  pt19: '패키지트레이',
};

/**
 * 카인포 절개도의 점(div.select-circle.part-NN) 이름표.
 * ------------------------------------------------------------------
 * 카인포는 부위 체크박스와 랭크 라디오가 모두 잠긴 "표시"일 뿐이고,
 * 값이 들어가는 통로는 절개도의 점을 누르는 것 하나뿐이다.
 * 그런데 part-NN 은 사이트 내부 좌표 id 라 몇 번 부위인지 화면에 적혀 있지 않다.
 * (절개도의 번호는 그림 이미지에 그려져 있어 DOM 으로 읽을 수 없다)
 *
 * 아래 표는 [카인포 절개도 학습] 이 사이트에 직접 물어 만든 결과다.
 *   점을 하나 눌러 -> 어느 부위 칸이 켜지는지 보고 -> 전체삭제로 되돌린다.
 *
 * 좌우·전후는 점의 x·y 좌표로 갈랐다. 네 그림의 x 범위가 뚜렷이 나뉜다.
 *   좌측면 31~122 · 평면 201~215 · 골격 284~364 · 우측면 392~484
 *
 * 사이트 도면이 바뀌면 [카인포 절개도 학습] 을 다시 돌려 이 표를 갱신하면 된다.
 */
const CI_DOT = {
  pt1: '28',                                  // 후드 (평면)
  'pt2@L': '22', 'pt2@R': '39',               // 프론트펜더
  'pt3@LF': '82-xw', 'pt3@LR': '122-xw',      // 도어 앞/뒤
  'pt3@RF': '99-xw', 'pt3@RR': '139-xw',
  pt4: '168',                                 // 트렁크리드 (평면)
  pt5: '14',                                  // 라디에이터서포트
  'pt6@L': '163', 'pt6@R': '179',             // 쿼터패널
  pt7: '107',                                 // 루프패널 (평면)
  'pt8@L': '81', 'pt8@R': '100',              // 사이드실
  pt9: '33',                                  // 프론트패널
  pt10: '73',                                 // 크로스멤버
  'pt11@L': '32', 'pt11@R': '34',             // 인사이드패널
  'pt12@LF': '53', 'pt12@RF': '54',           // 사이드멤버 앞
  'pt12@LR': '172', 'pt12@RR': '174',         // 사이드멤버 뒤
  'pt13@LF': '52', 'pt13@RF': '55',           // 휠하우스 앞
  'pt13@LR': '152', 'pt13@RR': '154',         // 휠하우스 뒤
  'pt14A@L': '63', 'pt14A@R': '78',           // 필러 A
  'pt14B@L': '103', 'pt14B@R': '118',         // 필러 B
  'pt14C@L': '144', 'pt14C@R': '137',         // 필러 C
  pt15: '74',                                 // 대쉬패널
  pt16: '94',                                 // 플로어패널
  pt17: '173',                                // 트렁크플로어
  pt18: '194',                                // 리어패널
  pt19: '153',                                // 패키지트레이
};

/**
 * 부호마다 누를 점이 다르다.
 * ------------------------------------------------------------------
 * 판금(W)은 교환(X)보다 점이 많고 자리도 다르다. 사이트가 점 이름과 class 로
 * 그걸 말해 준다.
 *
 *   part-107            교환 전용     class="… status-x … part-107"
 *   part-107-xw         판금          class="… status-w … part-107-group"
 *   part-107-auct       수리(부식·흠집·요철·손상)  class="… repair-c repair-a …"
 *
 * 아래 표는 [카인포 절개도 학습] 이 여섯 부호를 하나씩 골라 가며 만든 결과에서
 * **근거가 분명한 것만** 추린 것이다. 근거는 두 가지뿐이다.
 *   ① 같은 자리번호 (82-xw ↔ 82-auct)
 *   ② 사이트가 붙인 무리 이름 (part-194-group 안의 194-xw)
 *
 * 좌표가 가깝다는 이유로 짝지어서는 안 된다. 수리 점은 눌러도 부위칸이 켜지지
 * 않아 어느 부위인지 확인할 방법이 없다. 실제로 사이드실 좌의 수리점 자리에
 * 22px 떨어진 도어의 점이 뽑혔다 — 그대로 뒀으면 엉뚱한 곳에 찍혔을 것이다.
 * 그래서 확인 못 한 자리는 비워 두고, 전송할 때 사람에게 알린다.
 *
 * 비어 있는 칸은 CI_DOT 의 점에서 같은 번호·같은 무리를 훑는 되짚기가 맡는다.
 */
const CI_DOT_CODE = {
  pt1: { X: '28', W: '28' },
  'pt2@L': { X: '22', W: '22' },
  'pt2@R': { X: '39', W: '39' },
  'pt3@LF': { X: '82-xw', C: '82-auct', W: '82-xw', A: '82-auct', U: '82-auct', T: '82-auct' },
  'pt3@LR': { X: '122-xw', C: '122-auct', W: '122-xw', A: '122-auct', U: '122-auct', T: '122-auct' },
  'pt3@RF': { X: '99-xw', C: '99-auct', W: '99-xw', A: '99-auct', U: '99-auct', T: '99-auct' },
  'pt3@RR': { X: '139-xw', C: '139-auct', W: '139-xw', A: '139-auct', U: '139-auct', T: '139-auct' },
  pt4: { X: '168', W: '168' },
  pt5: { X: '14', W: '14' },
  'pt6@L': { X: '163', W: '163' },
  'pt6@R': { X: '179', W: '179' },
  pt7: { X: '107', C: '107-auct', W: '107-xw', A: '107-auct', U: '107-auct', T: '107-auct' },
  'pt8@L': { X: '81', W: '81' },
  'pt8@R': { X: '100', W: '100' },
  pt9: { X: '33', C: '33', W: '33', U: '33', T: '33' },
  pt10: { X: '73', C: '73', W: '73', U: '73', T: '73' },
  'pt11@L': { X: '32', C: '32', W: '32', U: '32', T: '32' },
  'pt11@R': { X: '34', C: '34', W: '34', U: '34', T: '34' },
  'pt12@LF': { X: '53', C: '53-xwuct', W: '53-xwuct', U: '53-xwuct', T: '53-xwuct' },
  'pt12@RF': { X: '54', C: '54-xwuct', W: '54-xwuct', U: '54-xwuct', T: '54-xwuct' },
  'pt12@LR': { X: '172', C: '172', W: '172', U: '172', T: '172' },
  'pt12@RR': { X: '174', C: '174', W: '174', U: '174', T: '174' },
  'pt13@LF': { X: '52', C: '52', W: '52', U: '52', T: '52' },
  'pt13@RF': { X: '55', C: '55', W: '55', U: '55', T: '55' },
  'pt13@LR': { X: '152', C: '152', W: '152', U: '152', T: '152' },
  'pt13@RR': { X: '154', C: '154', W: '154', U: '154', T: '154' },
  //  필러패널은 한 점이 교환·판금을 다 받는다. 누르면 사이트가 14번(부모)까지 함께 켠다.
  'pt14A@L': { X: '63', W: '63' },
  'pt14A@R': { X: '78', W: '78' },
  'pt14B@L': { X: '103', W: '103' },
  'pt14B@R': { X: '118', W: '118' },
  'pt14C@L': { X: '144', W: '144' },
  'pt14C@R': { X: '137', W: '137' },
  pt15: { X: '74', C: '74', W: '74', U: '74', T: '74' },
  pt16: { X: '94', C: '94-auct', W: '94-xw', U: '94-auct', T: '94-auct' },
  pt17: { X: '173', C: '173', W: '173', U: '173', T: '173' },
  pt18: { X: '194', C: '194-auct', W: '194-xw', U: '194-auct', T: '194-auct' },
  pt19: { X: '153', C: '153', W: '153', U: '153', T: '153' },
};

/** 그 자리에서 그 부호로 누를 점 (모르면 CI_DOT 의 기본 점) */
function ciDot(key, code) {
  const row = CI_DOT_CODE[key];
  if (row && code && row[code]) return row[code];
  return CI_DOT[key] || null;
}

/** 사이트별 매핑만 뽑아 직렬화 가능한 평면 배열로 만든다 */
function buildPlan(siteKey, data, opts = {}) {
  const plan = [];
  const skipped = [];

  for (const f of ALL_FIELDS) {
    const m = f[siteKey];
    const raw = data[f.k];

    if (f.local) continue; // 앱 내부 전용 항목 (전송 대상 아님)
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;

    if (!m) {
      skipped.push({ k: f.k, label: f.label, why: '이 사이트에 없는 항목' });
      continue;
    }

    // 조건부 항목: 상위 항목이 해당 값일 때만 입력
    if (f.dep && String(data[f.dep.k]) !== String(f.dep.v)) {
      skipped.push({ k: f.k, label: f.label, why: '상위 항목 조건 불일치' });
      continue;
    }

    const value = m.vmap ? (m.vmap[String(raw)] ?? String(raw)) : String(raw);

    if (m.checkbox) {
      plan.push({ k: f.k, label: f.label, kind: 'checkbox', name: m.checkbox[value], value: '1' });
    } else if (m.name) {
      plan.push({ k: f.k, label: f.label, kind: 'radio', name: m.name, value });
    } else if (m.radio) {
      plan.push({ k: f.k, label: f.label, kind: 'radio', name: m.radio, value });
    } else if (m.split === 'vin') {
      //  카인포는 차대번호를 두 칸으로 나눠 받는다. 기준은 "뒷 6자리" 하나뿐이다.
      //  (경기조합에서 받아온 차대번호를 옮겨 담는 vin:sync 와 같은 규칙을 쓴다.
      //   앞에서 몇 자리 자를지로 정하면 두 곳이 어긋날 수 있다.)
      const tail = opts.vinTail || 6;
      const cut = Math.max(0, value.length - tail);
      plan.push({ k: f.k, label: f.label, kind: 'value', sel: '#vin1', value: value.slice(0, cut) });
      plan.push({ k: f.k + '_2', label: f.label + '(뒷자리)', kind: 'value', sel: '#vin2', value: value.slice(cut) });
    } else if (m.part) {
      //  부위 — 화면 라벨 글자로 찾는다. 켜기만 하고 끄지는 않는다.
      //  codes 는 이 부위에 찍힌 상태부호(예 'W', 'XW')로, 사이트마다 쓰는 방법이 다르다.
      //    경기조합 : 부위를 누르면 팝업이 뜨므로 그 안에서 부호를 체크하고 [저장]
      //    카인포   : 부호 라디오를 먼저 고른 뒤 부위를 누른다
      //  위치별로 찍은 값(pt3@LF 등)이 있으면 그 목록을 함께 싣는다.
      //  경기조합은 위치마다 절개도의 area 를 따로 눌러야 하기 때문이다.
      /*  카인포는 부호마다 누를 점이 다르다(판금은 자리가 따로 있다).
       *  그래서 자리마다 "부호 -> 점" 을 함께 싣는다. all 은 이 자리에 딸린
       *  점 전부 — 부호를 바꿀 때 옛 표시를 지우려면 이것이 필요하다. */
      const dotsFor = (key, codes) => {
        const byCode = {};
        const unsure = [];
        String(codes || '').split('').forEach((c) => {
          const id = ciDot(key, c);
          if (id) byCode[c] = id;
          //  표에 없는 부호는 기본 점으로 넘겨 보되, 확인된 자리가 아님을 표시해 둔다.
          //  (수리 부호는 눌러도 부위칸이 안 켜져 어느 부위인지 확인할 방법이 없다)
          if (!(CI_DOT_CODE[key] && CI_DOT_CODE[key][c])) unsure.push(c);
        });
        const row = CI_DOT_CODE[key] || {};
        const all = [];
        [CI_DOT[key]].concat(Object.values(row), Object.values(byCode)).forEach((id) => {
          if (id && all.indexOf(id) < 0) all.push(id);
        });
        return { byCode, all, unsure };
      };

      const spots = Object.keys(data)
        .filter((key) => key.indexOf(f.k + '@') === 0 && String(data[key] || '').trim())
        .map((key) => Object.assign(
          { pos: key.split('@')[1], codes: String(data[key]).trim(),
            area: CM_AREA[key] || null, dot: CI_DOT[key] || null },
          dotsFor(key, String(data[key]).trim())));
      if (!spots.length) {
        spots.push(Object.assign(
          { pos: null, codes: value, area: CM_AREA[f.k] || null, dot: CI_DOT[f.k] || null },
          dotsFor(f.k, value)));
      }

      //  카인포에서 14.필러패널(부모)은 누를 점이 따로 없다.
      //  A·B·C 점을 누르면 사이트가 부모까지 함께 켜준다. 그래서 부모는 건너뛴다.
      if (siteKey === 'ci' && f.k === 'pt14') continue;

      plan.push({ k: f.k, label: f.label, kind: 'part', part: m.part, codes: value, spots });
    } else if (m.sel) {
      plan.push({ k: f.k, label: f.label, kind: 'value', sel: m.sel, value });
    }
  }

  /*  앱에서 지운 표시를 사이트에서도 지우기 위한 목록.
   *
   *  지금까지는 켜기만 하고 끄지 않아서, 잘못 찍은 것을 앱에서 고쳐도 사이트에는
   *  그대로 남았다. 앱 화면을 기준으로 사이트를 맞추려면 "지울 것" 도 알려줘야 한다.
   *  값이 비어 있는 자리 가운데 사이트에 매핑이 있는 것만 담는다.
   */
  const clears = [];
  ALL_FIELDS.forEach((f) => {
    if (f.type !== 'part' || f.k === 'pt14') return;
    const keys = Object.keys(CM_AREA).filter((k) => k === f.k || k.indexOf(f.k + '@') === 0);
    keys.forEach((key) => {
      if (String(data[key] || '').trim()) return;           // 표시가 있으면 지울 대상 아님
      //  카인포는 부호마다 점이 달라서, 지울 때도 그 자리에 딸린 점을 다 봐야 한다
      const row = CI_DOT_CODE[key] || {};
      const all = [];
      [CI_DOT[key]].concat(Object.values(row)).forEach((id) => {
        if (id && all.indexOf(id) < 0) all.push(id);
      });
      clears.push({ k: f.k, label: f.label, pos: key.split('@')[1] || null,
                    part: f.cm && f.cm.part, area: CM_AREA[key] || null,
                    dot: CI_DOT[key] || null, all });
    });
  });

  /*  사고이력·단순수리는 값이 비어 있을 때만 규칙으로 채운다.
   *
   *  화면이 이미 규칙대로 맞춰 두므로(schema.js 의 historyFromParts 를 물어본다)
   *  보통은 여기서 할 일이 없다. 여기서 무조건 덮어쓰면 점검원이 손으로 고친 값이
   *  조용히 사라진다. "화면에 보이는 값이 그대로 나간다" 를 지키기 위한 것이다.
   *  다만 화면을 거치지 않고 값이 비어 있는 경우에는 규칙으로 채워 준다. */
  const hist = historyFromParts(data);
  [['accident', hist.accident], ['accidentSimple', hist.accidentSimple]].forEach(([key, val]) => {
    if (String(data[key] || '').trim()) return;      // 화면 값이 있으면 그대로 둔다
    const fd = ALL_FIELDS.find((x) => x.k === key);
    const mp = fd && fd[siteKey];
    if (mp && (mp.name || mp.radio)) {
      plan.unshift({ k: key, label: fd.label + ' — 부위 표시에 맞춰 자동',
                     kind: 'radio', name: mp.name || mp.radio, value: val });
    }
  });

  /*  카인포의 '현재주행거리' 는 원부에서 채워지는 칸이라 앱에서 비어 있기 쉽다.
   *  점검원이 주행거리를 고쳐도 현재주행거리가 그대로면 두 값이 어긋나므로,
   *  비어 있을 때만 주행거리 값을 같이 넣어준다. (이미 값이 있으면 건드리지 않는다) */
  if (siteKey === 'ci') {
    const km = String(data.mileage || '').trim();
    const cur = String(data.currentKm || '').trim();
    if (km && !cur) {
      plan.push({ k: 'currentKm', label: '현재주행거리(km) — 주행거리와 맞춤',
                  kind: 'value', sel: '#currentKm', value: km });
    }
  }

  return { plan, skipped, clears };
}

/** 페이지 컨텍스트에서 실행될 코드 문자열 */
function buildScript(siteKey, data, opts = {}) {
  const { plan, skipped, clears } = buildPlan(siteKey, data, opts);

  return `(async function () {
  var plan = ${JSON.stringify(plan)};
  var clears = ${JSON.stringify(clears)};
  var SITE = ${JSON.stringify(siteKey)};
  var THOROUGH = ${JSON.stringify(!!opts.thorough)};   // 절개도를 한 곳씩 다 열어 확인 (느림)
  var filled = [], missing = [];
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  async function waitFor(fn, ms) {
    var t = Date.now();
    while (Date.now() - t < (ms || 4000)) {
      try { var v = fn(); if (v) return v; } catch (e) {}
      await sleep(100);
    }
    return null;
  }

  function fire(el) {
    ['input', 'change', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
  }

  /*  상태부호 이름표. 사이트 글자가 조금씩 달라 넉넉히 잡는다.
      (경기조합 "판금/용접", 카인포 "판금 [W]") */
  var CODE_WORDS = {
    X: ['교환'], C: ['부식'], W: ['판금', '용접'],
    A: ['흠집'], U: ['요철'], T: ['손상'],
  };

  function matchesCode(labelText, code) {
    var words = CODE_WORDS[code] || [];
    for (var i = 0; i < words.length; i++) if (labelText.indexOf(words[i]) >= 0) return true;
    return false;
  }

  /* ── 부위 체크박스 찾기 ──────────────────────────────────────────
   *  두 사이트 모두 국토부 고시 서식이라 "1.후드", "12.사이드멤버" 처럼
   *  번호와 이름을 함께 표기한다. id 대신 이 글자를 보고 찾는다.
   *  번호와 이름이 둘 다 맞아야 하므로 오인 위험이 낮다.
   */
  function normTxt(s) {
    return String(s || '').replace(/[\\s\\u00a0]/g, '');
  }

  function labelTextOf(el) {
    var t = '';
    try { if (el.labels && el.labels.length) t = el.labels[0].textContent; } catch (e) {}
    if (!t && el.id) {
      var l = document.querySelector('label[for="' + el.id + '"]');
      if (l) t = l.textContent;
    }
    if (!t && el.closest) {
      var c = el.closest('label');
      if (c) t = c.textContent;
    }
    if (!t && el.parentNode) t = el.parentNode.textContent;
    return normTxt(t).slice(0, 80);
  }

  function allBoxes() {
    return Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox]'));
  }

  /** 화면에 실제로 그려져 있는가 (크기가 0 이면 숨어 있는 것) */
  function isVisible(el) {
    if (!el) return false;
    try {
      var r = el.getBoundingClientRect();
      return !!(r.width || r.height);
    } catch (e) { return false; }
  }

  /* ── 카인포: 성능점검 상세 화면 열기 ────────────────────────────────
   *  사고·교환·수리 이력(부위 표와 절개도)은 목록 화면에 없고
   *  [성능점검] 을 눌러 들어가는 상세 화면 안에 있다.
   *  그 화면을 열지 않으면 부위 칸이 DOM 에는 있어도 크기가 0 이고 잠겨 있어서
   *  아무리 눌러도 체크가 되지 않는다. ("안보임 / 잠김" 으로 진단되던 증상)
   */
  /*  ── 점 찾기 ────────────────────────────────────────────────────
   *
   *  부호마다 보이는 점이 다르다. 판금(W)은 교환(X)보다 점이 많고 자리도 다르다.
   *  점 id 를 보면 이유를 알 수 있다 — 숫자 뒤에 어떤 부호를 받는지 꼬리표가 붙는다.
   *      part-168      part-82-xw
   *  그리고 class 에도 받을 수 있는 부호가 적혀 있다.
   *      status status-x status-w repair-u repair-c repair-t part-173
   *
   *  그래서 이름표(CI_DOT)의 id 로 딱 맞는 점을 못 찾으면, 같은 자리 번호를 가진
   *  점 가운데 그 부호를 받는 것을 찾는다. 표는 교환(X)으로 학습한 것이라
   *  이 되짚기가 없으면 판금은 "점이 나타나지 않았습니다" 로 끝난다.
   */
  function dotIdOf(el) {
    var m = String(el.className || '').match(/part-([0-9a-z\\-]+)/);
    return m ? m[1] : '';
  }

  function dotBase(id) {
    var m = String(id || '').match(/^[0-9]+/);
    return m ? m[0] : String(id || '');
  }

  /** 그 점이 이 부호를 받는가 (꼬리표가 없으면 가리지 않는 것으로 본다) */
  function dotTakes(el, code) {
    if (!code) return true;
    var c = String(code).toLowerCase();
    var cls = ' ' + String(el.className || '').replace(/\\s+/g, ' ') + ' ';
    if (cls.indexOf(' status-' + c + ' ') >= 0 || cls.indexOf(' repair-' + c + ' ') >= 0) return true;
    if (/ (status|repair)-[xcwaut] /.test(cls)) return false;      // 꼬리표가 있는데 그 부호는 없다
    var id = dotIdOf(el);
    var tail = String(id).split('-')[1];
    if (tail) return tail.indexOf(c) >= 0;                          // part-82-xw 처럼 id 에 붙은 경우
    return true;
  }

  /** 조건에 맞는 점 하나 (state: 'free' = 아직 안 찍힌 점, 'marked' = 찍힌 점) */
  function matchDot(id, state, code) {
    var all = Array.prototype.slice.call(document.querySelectorAll('div[class*="part-"]'));
    var want = state === 'marked';
    var pool = all.filter(function (el) {
      var cls = String(el.className || '').split(/\\s+/);
      var marked = cls.indexOf('selected-status') >= 0;
      if (want !== marked) return false;
      if (!want && cls.indexOf('select-circle') < 0) return false;
      return true;
    });

    for (var i = 0; i < pool.length; i++) if (dotIdOf(pool[i]) === String(id)) return pool[i];

    var base = dotBase(id);
    var same = pool.filter(function (el) { return dotBase(dotIdOf(el)) === base; });
    for (var j = 0; j < same.length; j++) if (dotTakes(same[j], code)) return same[j];
    return same.length && !code ? same[0] : null;
  }

  /** 절개도의 점 하나 찾기 — 아직 표시 안 된 것(select-circle) */
  function findDot(id, code) {
    return matchDot(id, 'free', code);
  }

  /** 이미 표시된 점인가 (select-circle 이 빠지고 selected-status 가 붙는다) */
  function findDotMarked(id) {
    return matchDot(id, 'marked', null);
  }

  /*  카인포: 그 점의 표시를 지운다 ('표기삭제' 를 고른 뒤 점을 누른다)
   *
   *  점에는 어떤 부호로 찍혔는지가 적혀 있지 않다 (class 는 selected-status 뿐).
   *  그래서 부호를 바꿀 때는 "지우고 다시 찍는" 방법밖에 없다.
   *  같은 부호였더라도 결과는 똑같으므로 손해는 없다.
   */
  async function clearDot(id) {
    if (!findDotMarked(id)) return true;                 // 이미 비어 있다

    var del = document.getElementById('maskdel');
    if (!(del && del.type === 'radio' && del.name === 'selection')) return false;
    if (!del.checked) { del.click(); if (!del.checked) { del.checked = true; fire(del); } }
    await sleep(120);

    var d = findDotMarked(id);
    if (!d) return true;
    d.click();
    await sleep(280);
    return !findDotMarked(id);
  }

  var partMarked = false;

  /** 절개도가 보이도록 상세 화면을 보장한다 */
  async function ensureCarinfoDetail() {
    if (detailOpen()) return true;
    return await openInspectionPanel();
  }

  /**
   * 성능점검 상세 화면이 열려 있는가.
   *
   *  녹색 점으로 판단하면 안 된다. 점은 상태표시(교환/판금 등)를 고른 뒤에야 생기므로,
   *  화면이 멀쩡히 열려 있어도 점이 없을 수 있다. 상태표시 라디오로 본다.
   */
  function detailOpen() {
    var r = document.getElementsByName("selection");
    for (var i = 0; i < r.length; i++) if (isVisible(r[i])) return true;
    return !!document.querySelector("div[class*=select-circle][class*=part-]");
  }

  /**
   * [성능점검] 버튼 후보를 넓게 모은다.
   *
   *  글자가 정확히 '성능점검' 이 아닐 수 있어(아이콘·줄바꿈·덧말) 포함 여부로 찾는다.
   *  대신 두 가지를 반드시 걸러낸다.
   *    · 왼쪽 메뉴/사이드바 안의 것  — 누르면 페이지가 새로 열려 스크립트가 죽는다
   *    · 진짜 주소로 이동하는 <a>    — 같은 이유
   *  접수정보 옆 버튼(사진등록과 같은 모양, btn-inspec-info)을 가장 앞에 둔다.
   */

  //  [성능점검] 버튼을 여기서 누르면 화면이 새로 열리면서 이 스크립트가 그 자리에서
  //  사라진다. 그러면 앱은 오지 않을 답을 기다리며 멈춘다 (P2 와 같은 함정).
  //  그래서 화면 여는 일은 앱 본체(main.js ensureCarinfoDetail)가 맡고,
  //  여기서는 열려 있는지 확인만 한다.
  async function openInspectionPanel() { return false; }


  function findPart(part) {
    var boxes = allBoxes();
    var want = normTxt(part.name);
    var pfx = part.no + '.';

    var hits = boxes.filter(function (b) {
      var t = labelTextOf(b);
      var i = t.indexOf(pfx);
      if (i < 0) return false;
      //  "11." 이 "1." 로 잘못 잡히지 않도록 앞 글자가 숫자면 제외
      var prev = i > 0 ? t.charAt(i - 1) : '';
      if (prev >= '0' && prev <= '9') return false;
      return t.indexOf(want) >= 0;
    });

    //  번호 표기가 없는 화면이면 이름만으로 한 번 더
    if (!hits.length) {
      hits = boxes.filter(function (b) { return labelTextOf(b).indexOf(want) >= 0; });
    }
    if (!hits.length) return null;
    if (!part.sub) return hits[0];

    //  필러패널 A/B/C — 본 항목 바로 뒤에 붙는 하위 체크박스
    var idx = boxes.indexOf(hits[0]);
    for (var i = idx + 1; i < boxes.length && i <= idx + 8; i++) {
      if (labelTextOf(boxes[i]) === part.sub) return boxes[i];
    }
    return null;
  }

  /*  카인포는 랭크마다 '없음 / 있음' 라디오가 따로 있다 (외판 1랭크, 2랭크, 주요골격).
   *  부위를 체크해도 이 라디오가 '있음' 이 아니면 저장에서 걸릴 수 있으므로,
   *  체크한 부위와 같은 줄(tr)에서 찾아 켜 준다.
   *  경기조합에는 이 라디오가 없다 — 못 찾으면 조용히 건너뛴다.
   */
  var rankRows = [], rankOn = 0;

  /** 이름이 같은 라디오 무리에서 '있음' 을 켠다 */
  function turnOnYesRadio(name) {
    var els = Array.prototype.slice.call(document.getElementsByName(name));
    var yes = null;
    els.forEach(function (e) {
      if (e.type !== 'radio' || yes) return;
      if (labelTextOf(e).indexOf('있음') >= 0) yes = e;
    });
    if (!yes) return false;
    if (yes.checked) return true;
    yes.click();
    //  사이트가 라벨에 이벤트를 걸어 둔 경우가 있어 라벨도 눌러 본다.
    //  (입력칸만 눌러서는 잠금 해제 로직이 안 도는 화면이 있다)
    try {
      var lb = yes.id ? document.querySelector('label[for="' + yes.id + '"]') : null;
      if (!lb && yes.closest) lb = yes.closest('label');
      if (lb) lb.click();
    } catch (e) {}
    if (!yes.checked) { yes.checked = true; fire(yes); }
    if (yes.checked) rankOn++;
    return yes.checked;
  }

  /** 체크박스 하나를 켠다 */
  function turnOnBox(name) {
    var el = document.getElementsByName(name)[0];
    if (!el || el.type !== 'checkbox') return false;
    if (el.checked) return true;
    el.click();
    if (!el.checked) { el.checked = true; fire(el); }
    if (el.checked) rankOn++;
    return el.checked;
  }

  /**
   * 카인포는 부위 체크박스가 잠겨 있다. 위 단계를 먼저 켜야 열린다.
   *
   *  체크박스 이름이 소속을 그대로 알려준다 (사이트에서 읽어온 규칙).
   *    part_1lank_2  (2.프론트펜더)  -> 외판 1랭크 라디오  part_1lank  '있음'
   *    part_2lank_7  (7.루프패널)    -> 외판 2랭크 라디오  part_2lank  '있음'
   *    main_alank_1  (9.프론트패널)  -> 주요골격 라디오 part_main '있음' + A랭크 체크박스 main_alank
   *
   *  예전에는 같은 줄(tr)에서 라디오를 찾았는데, 랭크 라디오가 부위 칸과 다른 줄에
   *  있어 못 찾았다. 그래서 칸이 잠긴 채로 남아 체크가 안 됐다.
   */
  function turnOnRankRadio(box) {
    var nm = String(box.name || '');
    var m = nm.match(/^(part_\\d+lank|main_[a-z]+lank)_/);
    if (m) {
      var group = m[1];
      if (group.indexOf('part_') === 0) {
        turnOnYesRadio(group);
      } else {
        turnOnYesRadio('part_main');   // 주요골격 '있음'
        turnOnBox(group);              // A/B/C 랭크 체크박스
      }
      return;
    }
    turnOnRankRadioByRow(box);
  }

  /**
   * 잠긴 부위 칸을 연다.
   *
   *  카인포는 위 단계가 '있음' 이어야 아래 칸이 열리는데, 어떤 단계가 어느 칸을
   *  여는지는 화면마다 조금씩 달라 보인다(외판은 단순수리, 주요골격은 사고이력 쪽).
   *  그래서 한 번에 다 켜지 않고 필요한 만큼만 단계적으로 올린다.
   *  값을 함부로 '있음' 으로 바꾸지 않으려는 뜻이기도 하다.
   *
   *  또 하나 — 사이트가 잠금을 푸는 데 시간이 걸린다. 라디오를 누른 직후에
   *  disabled 를 보면 아직 잠긴 상태라 "칸이 잠겨 있어" 로 잘못 판단하게 된다.
   *  그래서 각 단계마다 실제로 열릴 때까지 기다린다.
   */
  /**
   * 잠금이 안 풀렸을 때, 각 관문이 실제로 어떤 상태인지 그대로 찍는다.
   * 추측 대신 화면의 사실을 보고 다음 수를 정하기 위한 것이다.
   */
  function gateReport(box) {
    var out = [];
    ['accident_simple', 'accident', 'part_1lank', 'part_2lank', 'part_main',
     'main_alank', 'main_blank', 'main_clank'].forEach(function (nm) {
      var els = Array.prototype.slice.call(document.getElementsByName(nm));
      if (!els.length) { out.push(nm + ':없음'); return; }
      var on = null, dis = 0, hidden = 0;
      els.forEach(function (e) {
        if (e.checked) on = labelTextOf(e) || 'on';
        if (e.disabled) dis++;
        var r = null; try { r = e.getBoundingClientRect(); } catch (x) {}
        if (!r || (!r.width && !r.height)) hidden++;
      });
      out.push(nm + ':' + (on || '미선택') +
               (dis ? '/잠김' + dis : '') + (hidden ? '/안보임' + hidden : ''));
    });
    var br = null; try { br = box.getBoundingClientRect(); } catch (x) {}
    out.push('대상[' + (box.name || '이름없음') + ']' +
             (box.disabled ? '/잠김' : '/열림') +
             (br && (br.width || br.height) ? '' : '/안보임'));
    return out.join(' · ');
  }

  async function unlockPart(box) {
    if (!box.disabled) return true;

    turnOnRankRadio(box);                                    // ① 소속 랭크
    if (await waitFor(function () { return !box.disabled; }, 900)) return true;

    turnOnYesRadio('accident_simple');                       // ② 단순수리 '있음'
    turnOnRankRadio(box);
    if (await waitFor(function () { return !box.disabled; }, 900)) return true;

    turnOnYesRadio('accident');                              // ③ 사고이력 '있음'
    turnOnRankRadio(box);
    return !!(await waitFor(function () { return !box.disabled; }, 1200));
  }

  function turnOnRankRadioByRow(box) {

    //  이름 규칙이 다른 화면이면 같은 줄에서 '있음' 을 찾아 켠다 (예전 방식)
    var row = box.closest ? box.closest('tr') : null;
    if (!row || rankRows.indexOf(row) >= 0) return;
    rankRows.push(row);
    var radios = Array.prototype.slice.call(row.querySelectorAll('input[type=radio]'));
    var yes = null, on = false;
    radios.forEach(function (r) {
      if (labelTextOf(r).indexOf('있음') < 0) return;
      if (!yes) yes = r;
      if (r.checked) on = true;
    });
    if (!yes || on) return;
    yes.click();
    if (!yes.checked) { yes.checked = true; fire(yes); }
    if (yes.checked) rankOn++;
  }

  /* ── 경기조합: 부위를 누르면 뜨는 상태 팝업 처리 ────────────────────
   *  경기조합은 부위를 클릭하면 "교환(X) / 부식(C) / 판금·용접(W) / 흠집(A) /
   *  요철(U) / 손상(T)" 체크박스와 [저장] 이 든 팝업이 뜬다.
   *  이 팝업을 그대로 두면 체크가 반영되지 않고 화면만 막힌다(현재 증상).
   *  그래서 팝업이 뜨면 부호를 체크하고 [저장] 까지 눌러 닫는다.
   */
  function findPopup() {
    var cands = document.querySelectorAll('div,form,section,table');
    for (var i = 0; i < cands.length; i++) {
      var el = cands[i];
      var r = null;
      try { r = el.getBoundingClientRect(); } catch (e) { continue; }
      if (!r || r.width < 120 || r.width > 520 || r.height < 120 || r.height > 620) continue;
      var boxes = el.querySelectorAll('input[type=checkbox]');
      if (boxes.length < 4 || boxes.length > 10) continue;
      var t = normTxt(el.textContent || '');
      if (t.indexOf('교환') < 0 || t.indexOf('손상') < 0) continue;
      //  숨김 검사. offsetParent 로 보면 안 된다 — position:fixed 요소는 항상 null 이라
      //  화면에 떠 있는 팝업까지 걸러내 버린다. (크기 0 인 것은 위에서 이미 제외됨)
      var cs = null;
      try { cs = window.getComputedStyle(el); } catch (e) {}
      if (cs && (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0')) continue;
      return el;
    }
    return null;
  }

  async function handleCodePopup(codes) {
    var pop = await waitFor(findPopup, 2500);
    if (!pop) return null;                                 // 팝업이 없는 사이트

    var wanted = String(codes || 'X');
    var done = [];
    Array.prototype.slice.call(pop.querySelectorAll('input[type=checkbox]')).forEach(function (cb) {
      var lab = labelTextOf(cb);
      for (var i = 0; i < wanted.length; i++) {
        if (!matchesCode(lab, wanted[i])) continue;
        if (!cb.checked) { cb.click(); if (!cb.checked) { cb.checked = true; fire(cb); } }
        if (cb.checked) done.push(wanted[i]);
      }
    });

    //  [저장] 눌러 닫기. 못 닫으면 다음 부위 클릭이 막힌다.
    var save = null;
    Array.prototype.slice.call(pop.querySelectorAll('button,input[type=button],input[type=submit],a'))
      .forEach(function (b) {
        if (save) return;
        var t = normTxt(b.textContent || b.value || '');
        if (t.indexOf('저장') >= 0 || t.indexOf('확인') >= 0) save = b;
      });
    if (save) save.click();
    await waitFor(function () { return !findPopup(); }, 2500);
    return { applied: done.join(''), saved: !!save };
  }

  /* ── 카인포: 부호 라디오를 먼저 고른다 ──────────────────────────────
   *  카인포는 "위 표시 기호를 선택한 후 차량 이미지에서 부위를 클릭하세요" 방식이라
   *  부호를 먼저 정하지 않으면 기본값으로 찍힌다(판금을 골라도 교환으로 들어가는 증상).
   */
  //  카인포 상태표시 라디오의 실제 id (사이트에서 직접 읽어온 값)
  //    교환 #x · 부식 #c · 판금 #w · 흠집 #a · 요철 #u · 손상 #t
  //    표기삭제 #maskdel · 전체삭제 #maskdelall · 완료 #maskfin   (모두 name="selection")
  var CI_CODE_ID = { X: 'x', C: 'c', W: 'w', A: 'a', U: 'u', T: 't' };

  var codeRadioUsed = [];
  function selectCodeRadio(code) {
    //  id 로 바로 잡는 쪽이 확실하다. name 까지 확인해 엉뚱한 요소를 피한다.
    var byId = document.getElementById(CI_CODE_ID[code] || '');
    if (byId && byId.type === 'radio' && byId.name === 'selection') {
      if (!byId.checked) { byId.click(); if (!byId.checked) { byId.checked = true; fire(byId); } }
      if (byId.checked && codeRadioUsed.indexOf(code) < 0) codeRadioUsed.push(code);
      if (byId.checked) return true;
    }
    var radios = Array.prototype.slice.call(document.querySelectorAll('input[type=radio]'));
    var hit = null;
    radios.forEach(function (r) {
      if (hit) return;
      var lab = labelTextOf(r);
      if (lab.length > 12) return;                        // 긴 문장은 부호 이름표가 아니다
      if (matchesCode(lab, code)) hit = r;
    });
    if (!hit) return false;
    if (!hit.checked) { hit.click(); if (!hit.checked) { hit.checked = true; fire(hit); } }
    if (hit.checked && codeRadioUsed.indexOf(code) < 0) codeRadioUsed.push(code);
    return !!hit.checked;
  }

  for (var pi = 0; pi < plan.length; pi++) {
    var p = plan[pi];
    try {
      if (p.kind === 'value') {
        var el = document.querySelector(p.sel);
        if (!el) { missing.push(p.label + ' (' + p.sel + ')'); continue; }
        if (el.tagName === 'SELECT') {
          var ok = Array.prototype.some.call(el.options, function (o) { return o.value === p.value; });
          if (!ok) { missing.push(p.label + ' : 선택지 없음(' + p.value + ')'); continue; }
        }
        el.value = p.value;
        fire(el);

        //  넣었다고 끝난 게 아니다. 사이트가 되돌리거나 제 값으로 다시 쓰는 칸이 있다.
        //  (카인포 현재주행거리가 그랬다) 넣은 값이 남아 있는지 확인한다.
        await sleep(60);
        var now = String(el.value || '');
        var same = now === String(p.value) ||
                   now.replace(/[^0-9]/g, '') === String(p.value).replace(/[^0-9]/g, '');
        if (!same) {
          //  한 번 더 — 사람이 치듯 이벤트를 넉넉히 준다
          el.focus();
          el.value = p.value;
          ['keydown', 'keyup', 'input', 'change', 'blur'].forEach(function (t) {
            el.dispatchEvent(t === 'keydown' || t === 'keyup'
              ? new KeyboardEvent(t, { bubbles: true })
              : new Event(t, { bubbles: true }));
          });
          await sleep(80);
          now = String(el.value || '');
          same = now === String(p.value) ||
                 now.replace(/[^0-9]/g, '') === String(p.value).replace(/[^0-9]/g, '');
        }

        if (!same) {
          missing.push(p.label + ' : 넣었지만 사이트가 「' + now + '」 로 되돌렸습니다 (' + p.sel + ')');
          continue;
        }
        filled.push(p.label);
      } else if (p.kind === 'radio' || p.kind === 'checkbox') {
        if (!p.name) { missing.push(p.label + ' : 대상 없음'); continue; }
        var els = Array.prototype.slice.call(document.getElementsByName(p.name));
        if (!els.length) { missing.push(p.label + ' (' + p.name + ')'); continue; }
        var hit = null;
        if (p.kind === 'checkbox') { hit = els[0]; }
        else {
          els.forEach(function (e) { if (e.value === p.value) hit = e; });
          if (!hit) { missing.push(p.label + ' : 선택지 없음(' + p.value + ')'); continue; }
        }
        //  값(checked)만 바꾸면 사이트가 모르고 지나가는 경우가 있다.
        //  경기조합 사고이력이 '있음' 으로 보냈는데도 '없음' 으로 남던 원인이라
        //  실제 클릭을 먼저 하고, 안 먹을 때만 값으로 밀어넣는다.
        if (!hit.checked) hit.click();
        if (!hit.checked) { hit.checked = true; fire(hit); }
        if (!hit.checked) { missing.push(p.label + ' : 선택되지 않음'); continue; }
        fire(hit);
        filled.push(p.label);
      } else if (p.kind === 'part' && SITE === 'ci') {
        /* ── 카인포: 절개도의 점을 누른다 ────────────────────────────
         *  부위 체크박스와 랭크 라디오는 잠긴 표시일 뿐이라 눌러도 소용없다.
         *  값이 들어가는 통로는 이 점 하나뿐이다.
         *    ① 상태부호 라디오를 먼저 고르고  ② 점을 누른다
         *  (마지막에 재설정 [완료] 를 눌러 확정한다 — 아래 루프 뒤에서)
         */
        if (!(await ensureCarinfoDetail())) {
          missing.push(p.label + ' : 성능점검 상세 화면이 열려 있지 않습니다. 카인포 창에서 [성능점검] 을 눌러 두고 다시 전송해 주세요. → ');
          continue;
        }

        var anyDot = false;
        for (var di = 0; di < p.spots.length; di++) {
          var sp2 = p.spots[di];
          var where = sp2.pos ? ' (' + sp2.pos + ')' : '';

          if (!sp2.dot) {
            missing.push(p.label + where + ' : 절개도에서 누를 점을 모릅니다. [카인포 절개도 학습] 을 한 번 실행해 주세요.');
            continue;
          }

          /*  ── 이 자리에 남아 있는 옛 표시를 먼저 지운다 ──────────────
           *
           *  점에는 어떤 부호로 찍혔는지가 적혀 있지 않다. 그래서 교환(X)을
           *  판금(W)으로 고쳐도 X 가 그대로 남았다. 이 자리에 딸린 점을 모두
           *  훑어 찍혀 있는 것을 지운 뒤, 원하는 부호로 다시 찍는다.
           *  (부호마다 점이 다르므로 all 에는 X·W·수리 점이 함께 들어 있다) */
          var codesWanted = String(sp2.codes || '').split('');
          var spotIds = (sp2.all && sp2.all.length) ? sp2.all : [sp2.dot];

          //  지우기 전에 부호를 고를 수 있는지 먼저 본다.
          //  고르지도 못하면서 지워 버리면 있던 표시만 날아간다.
          var pickable = codesWanted.filter(function (c) { return selectCodeRadio(c); });
          if (!pickable.length) {
            missing.push(p.label + where + ' : 상태부호(' + sp2.codes + ')를 고르지 못했습니다.');
            continue;
          }

          var redone = false;
          for (var ri = 0; ri < spotIds.length; ri++) {
            if (!findDotMarked(spotIds[ri])) continue;
            if (await clearDot(spotIds[ri])) redone = true;
            else {
              missing.push(p.label + where + ' : 이미 있는 표시(part-' + spotIds[ri] + ')를 지우지 못했습니다.');
            }
          }

          //  ── 부호마다 제 자리에 찍는다 ───────────────────────────────
          for (var ki = 0; ki < codesWanted.length; ki++) {
            var wantCode = codesWanted[ki];
            var wantDot = (sp2.byCode && sp2.byCode[wantCode]) || sp2.dot;

            if (!selectCodeRadio(wantCode)) {
              missing.push(p.label + where + ' : 상태부호(' + wantCode + ')를 고르지 못했습니다.');
              continue;
            }

            var dot = await waitFor(
              (function (id, code) {
                return function () { return findDot(id, code); };
              })(wantDot, wantCode), 3000);

            if (!dot) {
              //  무엇이 보였는지 함께 알려 준다. 부호마다 점이 달라서
              //  "안 나타났다" 만으로는 어디를 고쳐야 할지 알 수 없다.
              var seen = Array.prototype.slice
                .call(document.querySelectorAll('div[class*="select-circle"][class*="part-"]'))
                .filter(isVisible).map(dotIdOf).slice(0, 40);
              var notLearned = sp2.unsure && sp2.unsure.indexOf(wantCode) >= 0;
              missing.push(p.label + where + ' : ' + (notLearned
                ? wantCode + ' 부호를 찍을 자리를 아직 모릅니다. 카인포 창에서 직접 찍어 주세요.' +
                  ' (지금 보이는 점: ' + (seen.length ? seen.join(',') : '없음') + ')'
                : wantCode + ' 부호로는 점(part-' + wantDot + ')이 나타나지 않았습니다.' +
                  ' 지금 보이는 점: ' + (seen.length ? seen.join(',') : '없음') +
                  ' → [카인포 절개도 학습] 을 다시 실행해 주세요.'));
              continue;
            }

            var hitId = dotIdOf(dot);
            dot.click();
            await sleep(320);

            if (findDotMarked(hitId)) {
              anyDot = true;
              filled.push(p.label + where + ' → 절개도 ' + wantCode + ' 표시' +
                          (redone ? ' (기존 표시를 지우고 다시 찍음)' : ''));
            } else {
              missing.push(p.label + where + ' : ' + wantCode + ' 점을 눌렀지만 표시되지 않았습니다.');
            }
          }
        }
        if (anyDot) partMarked = true;
        continue;

      } else if (p.kind === 'part') {
        /* ── 경기조합: 절개도의 area 를 눌러야 도면에 부호가 찍힌다 ──────────
         *  부위 목록의 체크박스를 켜는 것만으로는 도면에 아무 표시도 안 된다.
         *  <img usemap="#Map"> 위의 <area title="L휀다"> 를 실제로 눌러야
         *  팝업이 뜨고, 거기서 부호를 골라 [저장] 해야 도면에 찍힌다.
         */
        if (SITE === 'cm' && p.spots && p.spots.length) {
          var anyArea = false;
          for (var si = 0; si < p.spots.length; si++) {
            var sp = p.spots[si];
            if (!sp.area) continue;
            var ar = null;
            Array.prototype.slice.call(document.querySelectorAll('area')).forEach(function (a) {
              if (ar) return;
              var nm = normTxt(a.getAttribute('title') || a.getAttribute('value') || '');
              if (nm === normTxt(sp.area)) ar = a;
            });
            if (!ar) { missing.push(p.label + ' : 절개도에서 "' + sp.area + '" 영역을 찾지 못함'); continue; }

            ar.click();
            var popped = await handleCodePopup(sp.codes);
            if (popped) {
              anyArea = true;
              filled.push(p.label + ' → 절개도 ' + sp.area + ' [' + (popped.applied || '?') + ']');
            } else {
              missing.push(p.label + ' : "' + sp.area + '" 를 눌렀지만 상태 팝업이 뜨지 않음');
            }
          }
          if (anyArea) continue;   // 도면에 찍었으면 목록 체크는 사이트가 알아서 한다
        }

        var box = findPart(p.part);
        if (!box) { missing.push(p.label + ' : 화면에서 부위를 찾지 못함'); continue; }

        //  부위 표가 화면에 없으면 먼저 성능점검 상세 화면을 연다.
        //  목록 화면에도 DOM 은 있지만 크기 0 · 잠김 상태라 아무리 눌러도 안 된다.
        if (SITE === 'ci' && !isVisible(box)) {
          if (await openInspectionPanel()) {
            box = findPart(p.part) || box;
            filled.push('성능점검 상세 화면 열기');
          } else {
            missing.push(p.label + ' : 부위 표가 화면에 없습니다. 카인포 창에서 [성능점검] 을 눌러 점검내역 화면을 연 뒤 다시 전송해 주세요.');
            continue;
          }
        }

        //  ★ 순서가 중요하다.
        //    카인포는 랭크가 '없음' 이면 부위 체크박스가 잠겨 있다(회색).
        //    잠긴 칸을 누르면 아무 일도 안 일어나고 조용히 실패한다.
        //    그래서 랭크 '있음' 을 먼저 켜서 칸을 열어 준 다음에 누른다.
        var opened = await unlockPart(box);

        //  카인포는 부호를 먼저 고르고 눌러야 그 부호로 찍힌다
        if (SITE === 'ci' && p.codes) selectCodeRadio(p.codes[0]);

        if (!opened || box.disabled) {
          missing.push(p.label + ' : 칸이 끝내 열리지 않았습니다 → ' + gateReport(box));
          continue;
        }

        if (!box.checked) box.click();

        //  경기조합은 여기서 팝업이 뜬다. 부호를 체크하고 [저장] 까지 눌러 닫는다.
        var pop = await handleCodePopup(p.codes);

        if (!box.checked && !pop) { box.checked = true; fire(box); }
        if (!box.checked && !pop) { missing.push(p.label + ' : 체크되지 않음'); continue; }

        filled.push(p.label + (pop ? ' [' + (pop.applied || '?') + ' 팝업 처리]' : ''));
      }
    } catch (e) {
      missing.push(p.label + ' : ' + e.message);
    }
  }

  /* ── 앱에서 지운 표시를 사이트에서도 지운다 ────────────────────────
   *  잘못 찍었다가 앱에서 고쳤을 때, 사이트에 옛 표시가 남지 않도록 맞춘다.
   *  이미 비어 있는 자리는 건드리지 않는다 (필요한 것만 손댄다).
   */
  var removed = 0;


  /* ── 경기조합: 절개도 표시 지우기 ─────────────────────────────────
   *
   *  절개도의 표시는 아래 부위 목록과 별개로 움직인다.
   *  목록이 전부 비어 있어도 도면에는 X 가 그대로 남아 있는 경우를 확인했다.
   *  그래서 목록(체크박스·라벨)으로는 "지금 표시돼 있는가" 를 알 수 없다.
   *
   *  대신 그 부위의 팝업을 실제로 열어 본다. 팝업에 켜져 있는 체크박스가
   *  그 부위의 진짜 상태다. 켜진 게 있으면 해제하고 저장, 없으면 그냥 닫는다.
   *  부위 수만큼 여닫아야 해서 조금 느리지만, 이것만이 확실하다.
   */
  function findArea(name) {
    var hit = null;
    Array.prototype.slice.call(document.querySelectorAll('area')).forEach(function (a) {
      if (hit) return;
      var nm = normTxt(a.getAttribute('title') || a.getAttribute('value') || '');
      if (nm === normTxt(name)) hit = a;
    });
    return hit;
  }

  function popupSaveButton(pop) {
    var hit = null;
    Array.prototype.slice.call(pop.querySelectorAll('button,input[type=button],input[type=submit],a'))
      .forEach(function (b) {
        if (hit) return;
        var t = normTxt(b.textContent || b.value || '');
        if (t.indexOf('저장') >= 0 || t.indexOf('확인') >= 0) hit = b;
      });
    return hit;
  }

  /*  팝업 닫기.
   *
   *  닫기 단추를 못 찾으면 팝업이 그대로 남아 마지막에 창 하나가 열린 채로 끝났다.
   *  그래서 세 가지를 차례로 시도한다: 닫기(×·취소) → 저장 → Esc.
   *  저장을 눌러도 바꾼 것이 없으면 상태는 그대로다.
   */
  async function closePopup(pop) {
    var x = null;
    Array.prototype.slice.call(pop.querySelectorAll('button,input[type=button],input[type=submit],a,span,i,img'))
      .forEach(function (b) {
        if (x) return;
        var t = normTxt(b.textContent || b.value || b.getAttribute('alt') || '');
        var cls = String(b.className || '') + ' ' + String(b.id || '');
        if (t === '×' || t === 'X' || t === 'x' || t === '닫기' || t === '취소' ||
            /close/i.test(cls)) x = b;
      });
    if (x) {
      x.click();
      if (await waitFor(function () { return !findPopup(); }, 1200)) return true;
    }

    var sv = popupSaveButton(pop);
    if (sv) {
      sv.click();
      if (await waitFor(function () { return !findPopup(); }, 1500)) return true;
    }

    ['keydown', 'keyup'].forEach(function (ty) {
      try {
        document.dispatchEvent(new KeyboardEvent(ty, { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      } catch (e) {}
    });
    return !!(await waitFor(function () { return !findPopup(); }, 800));
  }

  /*  ── 도면의 진짜 상태는 area 의 checkflag 속성에 있다 ────────────────
   *
   *  조합 절개도의 표기는 아래 부위 목록과 따로 논다. 목록의 체크가 지워져도
   *  도면의 X 는 그대로 남는 것을 확인했다. 도면을 그리는 값은 각 자리(area)의
   *  checkflag 속성이다.  예: <area title="L휀다" pos="3" checkflag="W">
   *
   *  그래서 "표시가 남아 있는 자리" 를 팝업 없이 정확히 집어낼 수 있다.
   *  일일이 대조할 필요 없이 그 자리만 열어 해제하면 된다.
   */
  function areaFlag(name) {
    var a = findArea(name);
    if (!a) return null;                                   // 그런 자리가 없음
    return String(a.getAttribute('checkflag') || '');
  }

  //  이 화면이 checkflag 방식인지 (아니면 예전처럼 전부 열어 확인한다)
  function usesFlags() {
    try { return !!document.querySelector('area[pos]'); } catch (e) { return false; }
  }

  if (SITE === 'cm') {
    var swept = 0, passed = 0, stuck = 0;
    var byFlag = !THOROUGH && usesFlags();       // 표시가 남은 자리만 골라서 연다

    for (var ci2 = 0; ci2 < clears.length; ci2++) {
      var cl = clears[ci2];
      if (!cl.area) continue;

      //  도면에 표시가 없는 자리는 열어 볼 필요가 없다.
      //  35곳을 하나씩 여닫느라 전송이 1분 넘게 걸렸던 것을 이걸로 줄인다.
      if (byFlag && !areaFlag(cl.area)) { passed++; continue; }

      var ar2 = findArea(cl.area);
      if (!ar2) continue;

      ar2.click();
      var pop2 = await waitFor(findPopup, 2000);
      if (!pop2) continue;
      swept++;

      var boxes2 = Array.prototype.slice.call(pop2.querySelectorAll('input[type=checkbox]'));
      var on2 = boxes2.filter(function (cb) { return cb.checked; });

      if (!on2.length) {
        //  팝업은 비어 있는데 도면에는 표기가 남아 있으면, 팝업이 그 자리의
        //  상태를 보여주지 않는 것이다. 조용히 넘어가지 말고 알린다.
        await closePopup(pop2);
        var f0 = byFlag ? areaFlag(cl.area) : null;
        if (f0) {
          stuck++;
          missing.push(cl.label + (cl.pos ? ' (' + cl.pos + ')' : '') +
                       ' : 팝업에는 체크가 없는데 도면에는 [' + f0 + '] 표기가 남아 있습니다 (' + cl.area + ')');
        }
        continue;
      }

      var had = on2.map(function (cb) {
        var t = labelTextOf(cb);
        var m = t.match(/[XCWAUT]/);
        return m ? m[0] : '?';
      }).join('');

      on2.forEach(function (cb) {
        cb.click();
        if (cb.checked) { cb.checked = false; fire(cb); }
      });

      var sv2 = popupSaveButton(pop2);
      if (sv2) sv2.click();
      var closed = await waitFor(function () { return !findPopup(); }, 2500);
      if (!closed) {
        missing.push(cl.label + (cl.pos ? ' (' + cl.pos + ')' : '') +
                     ' : 지우기 팝업이 닫히지 않았습니다 (' + cl.area + ')');
        continue;
      }
      //  저장했다고 끝난 게 아니다. 도면 값(checkflag)이 실제로 비었는지 확인한다.
      //  목록만 지워지고 도면 표기는 남는 일이 있었다.
      var after = byFlag ? areaFlag(cl.area) : null;
      if (after) {
        stuck++;
        missing.push(cl.label + (cl.pos ? ' (' + cl.pos + ')' : '') +
                     ' : 저장했지만 도면 표기 [' + after + ']가 그대로입니다 (' + cl.area + ')');
        continue;
      }

      removed++;
      filled.push(cl.label + (cl.pos ? ' (' + cl.pos + ')' : '') +
                  ' → 절개도 ' + cl.area + ' 표시 [' + had + '] 지움');
    }
    if (swept || passed) {
      filled.push('절개도 확인 ' + swept + '곳' +
                  (passed ? ' (표시가 없는 ' + passed + '곳은 도면 값으로 확인하고 건너뜀)' : '') +
                  (byFlag ? '' : THOROUGH ? ' — 꼼꼼히 확인 설정이 켜져 있어 전부 열어 확인함'
                                          : ' — 도면 값을 읽지 못해 전부 열어 확인함') +
                  (stuck ? ' / 표기가 남은 곳 ' + stuck + '곳' : ''));
    }

    //  마지막에 뜬 팝업이 그대로 남는 일이 있었다. 반드시 닫고 끝낸다.
    var left = await waitFor(findPopup, 400);
    if (left) {
      if (await closePopup(left)) filled.push('열려 있던 마지막 팝업을 닫았습니다');
      else missing.push('마지막 팝업이 닫히지 않았습니다. 경기조합 창에서 직접 닫아 주세요.');
    }
  }

  if (SITE === 'ci') {
    for (var cj = 0; cj < clears.length; cj++) {
      var cl2 = clears[cj];
      if (!cl2.dot) continue;

      //  부호마다 점이 다르므로 이 자리에 딸린 점을 모두 본다
      var ids2 = (cl2.all && cl2.all.length) ? cl2.all : [cl2.dot];
      var wiped = false;
      for (var cq = 0; cq < ids2.length; cq++) {
        if (!findDotMarked(ids2[cq])) continue;        // 이미 비어 있다
        if (await clearDot(ids2[cq])) wiped = true;
      }

      if (wiped) {
        removed++;
        partMarked = true;
        filled.push(cl2.label + (cl2.pos ? ' (' + cl2.pos + ')' : '') + ' → 절개도 표시 지움');
      }
    }
  }

  if (removed) filled.push('앱에서 지운 표시 ' + removed + '곳을 사이트에서도 지웠습니다');

  if (rankOn) filled.push('랭크 "있음" 자동 설정 ' + rankOn + '곳');
  if (codeRadioUsed.length) filled.push('상태부호 선택: ' + codeRadioUsed.join(', '));

  /*  카인포는 표기를 마친 뒤 재설정의 [완료] 를 눌러야 등록이 확정된다.
   *  누르지 않으면 부호 고르는 모드가 그대로 남아 다음 클릭이 계속 표기로 먹힌다.
   *  (사용자 확인: "해당 포인트를 클릭 후 재설정에 완료 를 체크해야 등록이 되는 방식")
   */
  if (SITE === 'ci' && (partMarked || codeRadioUsed.length)) {
    var fin = document.getElementById('maskfin');
    if (!(fin && fin.type === 'radio' && fin.name === 'selection')) {
      fin = null;
      Array.prototype.slice.call(document.querySelectorAll('input[type=radio][name=selection]'))
        .forEach(function (e) { if (!fin && labelTextOf(e).indexOf('완료') >= 0) fin = e; });
    }
    if (!fin) {
      missing.push('재설정 [완료] 항목을 찾지 못했습니다');
    } else {
      if (!fin.checked) fin.click();
      if (!fin.checked) { fin.checked = true; fire(fin); }
      if (fin.checked) filled.push('재설정 [완료] 처리');
      else missing.push('재설정 [완료] 를 누르지 못했습니다');
    }
  }

  return { filled: filled, missing: missing, skipped: ${JSON.stringify(skipped.map((s) => s.label + ' — ' + s.why))} };
})();`;
}

module.exports = { buildPlan, buildScript };
