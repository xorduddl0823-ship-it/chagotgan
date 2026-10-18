/**
 * 사고·교환·수리 이력 — 절개도 입력
 * ------------------------------------------------------------------
 * 경기조합 화면과 같은 방식이다.
 *
 *   ① 절개도에서 부위를 누른다
 *   ② 팝업에서 상태를 고른다 (복수 선택 가능)
 *   ③ [저장] 을 누르면 부위에 부호가 찍히고 아래 목록에 나타난다
 *
 * 상태부호   X 교환 · C 부식 · W 판금/용접 · A 흠집 · U 요철 · T 손상
 *
 * 그림은 성능점검기록부 절개도와 같이 네 장이다.
 *   좌측면 · 평면 · 골격 · 우측면
 *
 * ── 위치별 독립 입력 ──────────────────────────────────────────────
 * 같은 부위라도 전·후·좌·우를 따로 표시한다. 예를 들어 도어는
 * 좌앞 / 좌뒤 / 우앞 / 우뒤 네 곳이 각각 독립이다.
 *
 *   위치값   state['pt3@LF']  = 'W'      ← 사람이 그림에서 찍는 값
 *   전송값   state['pt3']     = 'W'      ← 위치값을 합친 것
 *
 * 두 사이트의 부위 목록에는 부위당 체크박스가 하나뿐이라 좌우 구분이 없다.
 * 그래서 "한 곳이라도 표시되면 그 부위를 켠다" 로 합쳐서 보낸다 (filler.js).
 */

const PART_STATES = [
  { code: 'X', name: '교환',      color: '#e5484d' },
  { code: 'C', name: '부식',      color: '#0d9488' },
  { code: 'W', name: '판금/용접', color: '#f76b15' },
  { code: 'A', name: '흠집',      color: '#e0a800' },
  { code: 'U', name: '요철',      color: '#3b82f6' },
  { code: 'T', name: '손상',      color: '#8b5cf6' },
];

const POS_LABEL = {
  L: '좌', R: '우', F: '앞', B: '뒤',
  LF: '좌앞', LR: '좌뒤', RF: '우앞', RR: '우뒤',
};

/* 측면도 — 앞이 위, 바닥(바퀴)이 왼쪽. viewBox "0 0 160 270" */
/*  필러(A·B·C)는 네모 띠가 아니라 기둥이다.
 *  이 그림은 앞이 위쪽이고 차 지붕이 안쪽(오른쪽)이라, 기둥은 바깥(문턱)에서
 *  안쪽(지붕)으로 가로지르는 선으로 보인다. 앞유리 쪽 A 와 뒷유리 쪽 C 는
 *  기울어져 있고, 앞뒤 문 사이의 B 는 곧게 선다.
 *    line: [바깥끝x, 바깥끝y, 지붕끝x, 지붕끝y, 굵기] */
/*  기둥의 자리·기울기·굴곡.
 *    [바깥끝x, 바깥끝y, 지붕끝x, 지붕끝y, 굵기, 휨]
 *  휨은 가운데가 얼마나 배부른가다. 0 이면 곧은 선, +/- 로 휘는 쪽이 갈린다.
 *  숫자를 밖에서 바꿀 수 있게 따로 둔다 — tools/pillar-tuner 로 맞춘 값이
 *  %APPDATA%\carcheck-dual\pillar.json 에 저장되고, 앱이 시작할 때 이걸 덮어쓴다. */
const PILLARS = {
  A: [46, 90, 126, 74, 9, 0],
  B: [42, 138, 126, 138, 9, 0],
  C: [46, 192, 126, 182, 9, 0],
};

/** 기둥 하나의 테두리 그림선 (굵기와 휨을 가진 띠) */
function pillarPath(l) {
  const [x1, y1, x2, y2, t] = l;
  const bend = Number(l[5] || 0);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = -dy / len, uy = dx / len;             // 선에 직각인 방향
  const hx = ux * (t / 2), hy = uy * (t / 2);      // 두께 절반
  //  가운데를 밀어 휘게 한다. 2차 곡선은 조종점의 절반만큼 배가 나오므로 두 배로 민다.
  const cx = (x1 + x2) / 2 + ux * bend * 2;
  const cy = (y1 + y2) / 2 + uy * bend * 2;
  const n = (v) => Math.round(v * 10) / 10;
  return 'M ' + n(x1 + hx) + ',' + n(y1 + hy) +
         ' Q ' + n(cx + hx) + ',' + n(cy + hy) + ' ' + n(x2 + hx) + ',' + n(y2 + hy) +
         ' L ' + n(x2 - hx) + ',' + n(y2 - hy) +
         ' Q ' + n(cx - hx) + ',' + n(cy - hy) + ' ' + n(x1 - hx) + ',' + n(y1 - hy) + ' Z';
}

const SIDE_L = [
  { k: 'pt2',   no: 2,  pos: 'L',  box: [46, 26, 74, 32] },
  { k: 'pt8',   no: 8,  pos: 'L',  box: [32, 92, 14, 94] },
  { k: 'pt14A', no: 14, sub: 'A', pos: 'L', line: PILLARS.A },
  { k: 'pt3',   no: 3,  pos: 'LF', box: [50, 96, 66, 36] },
  { k: 'pt14B', no: 14, sub: 'B', pos: 'L', line: PILLARS.B },
  { k: 'pt3',   no: 3,  pos: 'LR', box: [50, 145, 66, 32] },
  { k: 'pt14C', no: 14, sub: 'C', pos: 'L', line: PILLARS.C },
  { k: 'pt6',   no: 6,  pos: 'L',  box: [46, 200, 74, 38] },
];

/* 우측면은 좌측면을 좌우로 뒤집는다 (x' = 160 - x) */
const SIDE_R = SIDE_L.map((r) => ({
  k: r.k, no: r.no, sub: r.sub,
  pos: r.pos.replace('L', 'R'),
  box: r.box && [160 - r.box[0] - r.box[2], r.box[1], r.box[2], r.box[3]],
  line: r.line && r.line.slice(),
}));

/** 좌측면 기둥값이 바뀌면 우측면도 좌우 뒤집어 따라가게 한다 */
function syncPillars() {
  SIDE_R.forEach((r, i) => {
    const src = SIDE_L[i].line;
    if (!src || !r.line) return;
    r.line[0] = 160 - src[0]; r.line[1] = src[1];
    r.line[2] = 160 - src[2]; r.line[3] = src[3];
    r.line[4] = src[4];
    r.line[5] = -Number(src[5] || 0);      // 좌우를 뒤집으면 휘는 쪽도 뒤집힌다
  });
}
syncPillars();

/** 기둥값 바꾸기 — {A:[...], B:[...], C:[...]}. 바꾼 뒤 화면을 다시 그려야 보인다. */
function setPillars(obj) {
  ['A', 'B', 'C'].forEach((k) => {
    const v = obj && obj[k];
    if (!Array.isArray(v) || v.length < 5) return;
    if (v.some((n) => !isFinite(Number(n)))) return;
    for (let i = 0; i < 6; i++) PILLARS[k][i] = Number(v[i] || 0);
  });
  syncPillars();
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

const LINE = { fill: 'none', stroke: '#8d99a8', 'stroke-width': 1.6, 'stroke-linejoin': 'round' };
const THIN = { fill: 'none', stroke: '#b3bdc9', 'stroke-width': 1.1 };

/** 바퀴 — 테와 살 */
function wheel(svg, cx, cy) {
  svg.appendChild(svgEl('circle', Object.assign({ cx, cy, r: 13 }, LINE)));
  svg.appendChild(svgEl('circle', Object.assign({ cx, cy, r: 5 }, THIN)));
  [[0, 1], [1, 0], [0.7, 0.7], [0.7, -0.7]].forEach(([dx, dy]) => {
    svg.appendChild(svgEl('line', Object.assign({
      x1: cx - dx * 12, y1: cy - dy * 12, x2: cx + dx * 12, y2: cy + dy * 12,
    }, THIN)));
  });
}

/* 차체 윤곽 — 부위 상자 뒤에 깔리는 밑그림 */
const DECOR = {
  //  옆모습 — 앞이 위, 바닥(바퀴)이 왼쪽.
  //  보닛·트렁크는 좁고 실내가 넓게 나오도록 그려 차 옆모습으로 읽히게 한다.
  side(svg, flip) {
    const P = (d) => svg.appendChild(svgEl('path', Object.assign({ d }, LINE)));
    const x = (v) => (flip ? 160 - v : v);

    //  차체 바깥선. 바퀴 자리는 아치로 파여 있다 (두 사이트 절개도와 같은 모양).
    //  앞이 위, 바퀴가 바깥쪽(좌측면은 왼쪽 · 우측면은 오른쪽)이다.
    P(`M ${x(62)},16 C ${x(46)},20 ${x(38)},31 ${x(37)},46
       L ${x(37)},49 A 15 15 0 0 0 ${x(37)},77
       L ${x(37)},193 A 15 15 0 0 0 ${x(37)},221
       L ${x(37)},224 C ${x(38)},240 ${x(46)},252 ${x(62)},256
       L ${x(104)},256 C ${x(116)},251 ${x(123)},234 ${x(124)},214
       L ${x(124)},196 C ${x(131)},191 ${x(133)},183 ${x(133)},170
       L ${x(133)},100 C ${x(133)},87 ${x(131)},79 ${x(124)},74
       L ${x(124)},56 C ${x(123)},36 ${x(116)},19 ${x(104)},16 Z`);

    //  실내 유리선
    P(`M ${x(52)},82 C ${x(46)},98 ${x(46)},172 ${x(52)},188 L ${x(124)},188 L ${x(124)},82 Z`);

    //  기둥(필러) 자리 — 유리선을 끊는 짧은 선
    [90, 134, 186].forEach((y) => {
      svg.appendChild(svgEl('line', Object.assign(
        { x1: x(48), y1: y, x2: x(124), y2: y }, THIN)));
    });

    //  손잡이
    [116, 158].forEach((y) => {
      svg.appendChild(svgEl('rect', Object.assign({
        x: x(flip ? 80 : 76), y, width: 4, height: 9, rx: 1.5,
      }, THIN)));
    });

    wheel(svg, x(37), 63);
    wheel(svg, x(37), 207);
  },

  //  평면 — 앞이 위. 앞뒤 유리선과 사이드미러를 넣어 위에서 본 차로 읽히게 한다.
  top(svg) {
    const P = (d) => svg.appendChild(svgEl('path', Object.assign({ d }, LINE)));
    P(`M 80,14 C 62,14 48,22 44,38 L 40,70 C 38,92 38,178 40,200
       L 44,232 C 48,248 62,256 80,256 C 98,256 112,248 116,232
       L 120,200 C 122,178 122,92 120,70 L 116,38 C 112,22 98,14 80,14 Z`);
    // 앞유리 · 뒷유리
    P('M 46,88 C 56,78 104,78 114,88');
    P('M 46,192 C 56,202 104,202 114,192');
    // 사이드미러
    P('M 40,96 C 31,93 26,97 27,103 C 28,108 35,107 40,105');
    P('M 120,96 C 129,93 134,97 133,103 C 132,108 125,107 120,105');
  },

  //  골격 — 하부 뼈대. 바깥 테두리와 좌우 사이드레일, 크로스멤버 선.
  frame(svg) {
    const P = (d) => svg.appendChild(svgEl('path', Object.assign({ d }, LINE)));
    //  하부 뼈대 — 앞뒤가 둥근 바깥 테두리와 좌우 사이드레일
    P(`M 44,14 L 116,14 C 126,14 132,20 132,30
       L 132,240 C 132,250 126,256 116,256 L 44,256
       C 34,256 28,250 28,240 L 28,30 C 28,20 34,14 44,14 Z`);
    P('M 44,20 L 44,250');
    P('M 116,20 L 116,250');
    //  앞·뒤 범퍼 레일
    P('M 32,20 L 128,20');
    P('M 32,250 L 128,250');
    [50, 118, 190, 242].forEach((y) => {
      svg.appendChild(svgEl('line', Object.assign({ x1: 44, y1: y, x2: 116, y2: y }, THIN)));
    });
    //  휠하우스 자리를 감싸는 아치
    [[28, 62], [132, 62], [28, 200], [132, 200]].forEach(([cx, cy]) => {
      svg.appendChild(svgEl('path', Object.assign({
        d: `M ${cx},${cy - 15} A 15 15 0 0 ${cx < 80 ? 0 : 1} ${cx},${cy + 15}`,
      }, THIN)));
    });
  },
};

const VIEWS = [
  { id: 'sideL', title: '좌측면', decor: (s) => DECOR.side(s, false), regions: SIDE_L },
  {
    id: 'top', title: '평면', decor: DECOR.top,
    regions: [
      { k: 'pt1', no: 1, box: [46, 26, 68, 52] },
      { k: 'pt7', no: 7, box: [46, 96, 68, 96] },
      { k: 'pt4', no: 4, box: [46, 200, 68, 48] },
    ],
  },
  {
    id: 'frame', title: '골격', decor: DECOR.frame,
    regions: [
      { k: 'pt5',  no: 5,  box: [48, 18, 64, 12] },
      { k: 'pt9',  no: 9,  box: [48, 33, 64, 15] },
      { k: 'pt11', no: 11, pos: 'L', box: [30, 33, 13, 33] },
      { k: 'pt11', no: 11, pos: 'R', box: [117, 33, 13, 33] },
      { k: 'pt12', no: 12, pos: 'LF', box: [47, 52, 13, 32] },
      { k: 'pt12', no: 12, pos: 'RF', box: [100, 52, 13, 32] },
      { k: 'pt13', no: 13, pos: 'LF', box: [30, 69, 14, 16] },
      { k: 'pt13', no: 13, pos: 'RF', box: [116, 69, 14, 16] },
      { k: 'pt10', no: 10, box: [48, 88, 64, 12] },
      { k: 'pt15', no: 15, box: [46, 103, 68, 13] },
      { k: 'pt16', no: 16, box: [46, 120, 68, 68] },
      { k: 'pt19', no: 19, box: [46, 192, 68, 12] },
      { k: 'pt13', no: 13, pos: 'LR', box: [30, 192, 14, 16] },
      { k: 'pt13', no: 13, pos: 'RR', box: [116, 192, 14, 16] },
      { k: 'pt12', no: 12, pos: 'LR', box: [47, 210, 13, 30] },
      { k: 'pt12', no: 12, pos: 'RR', box: [100, 210, 13, 30] },
      { k: 'pt17', no: 17, box: [62, 212, 36, 28] },
      { k: 'pt18', no: 18, box: [46, 244, 68, 10] },
    ],
  },
  { id: 'sideR', title: '우측면', decor: (s) => DECOR.side(s, true), regions: SIDE_R },
];

/* 아래 요약 목록은 사이트와 같은 랭크 순서로 보여준다 */
const RANKS = [
  { group: '외판부위', rank: '1랭크', keys: ['pt1', 'pt2', 'pt3', 'pt4', 'pt5'] },
  { group: '외판부위', rank: '2랭크', keys: ['pt6', 'pt7', 'pt8'] },
  { group: '주요골격', rank: 'A랭크', keys: ['pt9', 'pt10', 'pt11', 'pt17', 'pt18'] },
  { group: '주요골격', rank: 'B랭크', keys: ['pt12', 'pt13', 'pt19', 'pt14A', 'pt14B', 'pt14C'] },
  { group: '주요골격', rank: 'C랭크', keys: ['pt15', 'pt16'] },
];

const ALL_REGIONS = VIEWS.flatMap((v) => v.regions);

/*  ── 그림 배치를 밖에서 고칠 수 있게 ──────────────────────────────
 *
 *  부위 상자 하나하나의 자리·크기, 기둥의 선, 그리고 차체 밑그림의 위치·크기를
 *  tools 의 [절개도 맞추기] 로 고쳐 저장하면
 *    %APPDATA%\carcheck-dual\diagram.json
 *  에 담기고, 앱이 켤 때 읽어 그대로 그린다. 파일이 없으면 아래 기본값 그대로다.
 *
 *  칸 이름은 "그림:저장자리" 다.  예) sideL:pt3@LF · frame:pt16 · top:pt1
 */
VIEWS.forEach((v) => {
  v.regions.forEach((r) => { r.id = v.id + ':' + (r.pos ? r.k + '@' + r.pos : r.k); });
});

/** 차체 밑그림의 [가로이동, 세로이동, 크기] */
const VIEW_TF = { sideL: [0, 0, 1], top: [0, 0, 1], frame: [0, 0, 1], sideR: [0, 0, 1] };

/** 지금 배치를 그대로 뽑아낸다 (저장용) */
function getLayout() {
  const regions = {};
  ALL_REGIONS.forEach((r) => {
    regions[r.id] = r.line ? { line: r.line.slice() } : { box: r.box.slice() };
  });
  const views = {};
  Object.keys(VIEW_TF).forEach((k) => { views[k] = VIEW_TF[k].slice(); });
  return { regions, views };
}

/** 배치를 바꾼다. 바꾼 뒤 화면을 다시 그려야 보인다. */
function setLayout(data) {
  if (!data) return;
  const nums = (v, n) => Array.isArray(v) && v.length >= n && v.every((x) => isFinite(Number(x)));

  if (data.regions) {
    ALL_REGIONS.forEach((r) => {
      const got = data.regions[r.id];
      if (!got) return;
      if (r.line && nums(got.line, 5)) {
        for (let i = 0; i < 6; i++) r.line[i] = Number(got.line[i] || 0);
      } else if (r.box && nums(got.box, 4)) {
        for (let i = 0; i < 4; i++) r.box[i] = Number(got.box[i]);
      }
    });
  }

  if (data.views) {
    Object.keys(VIEW_TF).forEach((k) => {
      const got = data.views[k];
      if (nums(got, 3)) for (let i = 0; i < 3; i++) VIEW_TF[k][i] = Number(got[i]);
    });
  }
}

/** 이 칸의 값이 저장되는 자리. 위치가 있으면 부위키@위치 */
const stateKey = (r) => (r.pos ? r.k + '@' + r.pos : r.k);

/** 부호 문자열의 대표색 — 여러 개면 가장 앞선 것 */
function colorOf(codes) {
  for (const s of PART_STATES) if (codes.indexOf(s.code) >= 0) return s.color;
  return null;
}

/**
 * @param container  그림을 넣을 요소
 * @param fields     스키마의 부위 항목들 (k, label)
 * @param state      앱 상태 객체 — 이 객체를 직접 읽고 쓴다
 * @param onChange   값이 바뀔 때 부르는 콜백
 */
function renderPartsDiagram(container, fields, state, onChange) {
  const labelOf = {};
  fields.forEach((f) => { labelOf[f.k] = f.label; });

  const wrap = document.createElement('div');
  wrap.className = 'parts';

  const guide = document.createElement('div');
  guide.className = 'parts-guide';
  guide.textContent =
    '그림에서 부위를 누르면 상태를 고르는 창이 열립니다. 앞·뒤·좌·우를 각각 따로 표시할 수 있고, 여러 상태를 함께 고를 수 있습니다.';
  wrap.appendChild(guide);

  const views = document.createElement('div');
  views.className = 'parts-views';
  const shapes = {}; // 저장자리 -> [{g, rect, text, region}]

  VIEWS.forEach((view) => {
    const col = document.createElement('div');
    col.className = 'parts-view';

    const cap = document.createElement('div');
    cap.className = 'parts-cap';
    cap.textContent = view.title;
    col.appendChild(cap);

    const svg = svgEl('svg', { viewBox: '0 0 160 270', class: 'parts-svg' });

    //  차체 밑그림은 따로 묶어 둔다 — 통째로 옮기거나 키울 수 있게
    const tf = VIEW_TF[view.id] || [0, 0, 1];
    const skin = svgEl('g', {
      class: 'parts-skin',
      transform: 'translate(' + tf[0] + ',' + tf[1] + ') scale(' + tf[2] + ')' +
                 (tf[2] !== 1 ? ' translate(' + (80 * (1 / tf[2] - 1)) + ',' +
                                 (135 * (1 / tf[2] - 1)) + ')' : ''),
    });
    svg.appendChild(skin);
    view.decor(skin);

    view.regions.forEach((r) => {
      const sk = stateKey(r);

      const g = svgEl('g', { class: 'part', tabindex: '0', role: 'button' });

      let rect, cx, cy;
      if (r.line) {
        //  기둥 — 굵기와 휨을 가진 띠. 네모와 같은 방식으로 색칠·테두리를 다룬다.
        const [x1, y1, x2, y2] = r.line;
        const bend = Number(r.line[5] || 0);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        rect = svgEl('path', {
          d: pillarPath(r.line),
          class: 'part-rect', fill: '#eceff3', stroke: '#9aa5b2', 'stroke-width': 1,
        });
        //  글자는 휜 가운데에 얹는다
        cx = (x1 + x2) / 2 + (-dy / len) * bend;
        cy = (y1 + y2) / 2 + (dx / len) * bend;
      } else {
        const [x, y, w, h] = r.box;
        rect = svgEl('rect', {
          x, y, width: w, height: h, rx: 2.5,
          class: 'part-rect', fill: '#eceff3', stroke: '#9aa5b2', 'stroke-width': 1,
        });
        cx = x + w / 2;
        cy = y + h / 2;
      }

      const t = svgEl('text', {
        x: cx, y: cy, class: 'part-no',
        'text-anchor': 'middle', 'dominant-baseline': 'central',
      });
      const title = svgEl('title');
      title.textContent = fullLabel(r);

      g.appendChild(rect);
      g.appendChild(t);
      g.appendChild(title);

      const open = () => openPicker(r);
      g.addEventListener('click', open);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });

      svg.appendChild(g);
      shapes[sk] = shapes[sk] || [];
      shapes[sk].push({ g, rect, text: t, region: r });
    });

    col.appendChild(svg);
    views.appendChild(col);
  });

  wrap.appendChild(views);

  /* ── 랭크 표 ──────────────────────────────────────────────
   *  두 사이트가 절개도 옆에 두고 있는 "교환·판금 등 이상부위" 표와 같은 모양이다.
   *  그림만 보면 어느 랭크인지 한눈에 안 들어와, 전송 전에 눈으로 맞춰 보라고 둔다.
   *  (보여주기만 한다 — 값은 그림에서 고친다)
   */
  const ranks = document.createElement('div');
  ranks.className = 'parts-ranks';
  const rankCells = {};                       // 부위키 -> 그 칸 요소

  const rtab = document.createElement('table');
  const rhead = document.createElement('caption');
  rhead.textContent = '교환·판금 등 이상부위';
  rtab.appendChild(rhead);

  RANKS.forEach((rk, i) => {
    const tr = document.createElement('tr');

    //  '외판부위' · '주요골격' 은 여러 줄에 걸친다
    const first = RANKS.findIndex((x) => x.group === rk.group);
    if (first === i) {
      const th = document.createElement('th');
      th.className = 'rk-group';
      th.rowSpan = RANKS.filter((x) => x.group === rk.group).length;
      th.textContent = rk.group;
      tr.appendChild(th);
    }

    const th2 = document.createElement('th');
    th2.className = 'rk-rank';
    th2.textContent = rk.rank;
    tr.appendChild(th2);

    const td = document.createElement('td');
    const shown = [];
    rk.keys.forEach((k) => {
      if (k === 'pt14B' || k === 'pt14C') return;       // 필러는 한 칸에 A·B·C 를 함께
      shown.push(k === 'pt14A' ? 'pt14' : k);
    });

    shown.forEach((k) => {
      const cell = document.createElement('span');
      cell.className = 'rk-part';
      const box = document.createElement('b');
      box.className = 'rk-box';
      const name = document.createElement('span');
      name.textContent = labelOf[k] || k;
      cell.appendChild(box);
      cell.appendChild(name);

      if (k === 'pt14') {                               // 14.필러패널 ( A B C )
        const subs = document.createElement('span');
        subs.className = 'rk-subs';
        ['A', 'B', 'C'].forEach((s) => {
          const sb = document.createElement('b');
          sb.className = 'rk-box';
          sb.dataset.sub = s;
          const lab = document.createElement('i');
          lab.textContent = s;
          subs.appendChild(sb);
          subs.appendChild(lab);
        });
        cell.appendChild(subs);
      }

      rankCells[k] = cell;
      td.appendChild(cell);
    });

    tr.appendChild(td);
    rtab.appendChild(tr);
  });

  ranks.appendChild(rtab);
  wrap.appendChild(ranks);

  /** 랭크 표를 지금 값에 맞춘다 */
  function paintRanks() {
    Object.entries(rankCells).forEach(([k, cell]) => {
      const codes = String(state[k] || '');
      const box = cell.querySelector('.rk-box');
      box.textContent = codes || '';
      cell.classList.toggle('on', !!codes);

      if (k === 'pt14') {
        cell.querySelectorAll('.rk-box[data-sub]').forEach((sb) => {
          const v = String(state['pt14' + sb.dataset.sub] || '');
          sb.textContent = v || '';
          sb.classList.toggle('on', !!v);
        });
      }
    });
  }

  const summary = document.createElement('div');
  summary.className = 'parts-summary';
  wrap.appendChild(summary);

  const legend = document.createElement('div');
  legend.className = 'parts-legend';
  legend.textContent = '상태표시 부호 : ' +
    PART_STATES.map((s) => s.code + '(' + s.name + ')').join(', ');
  wrap.appendChild(legend);

  /* ── 상태 고르는 팝업 ──────────────────────────── */
  const modal = document.createElement('div');
  modal.className = 'overlay hidden parts-modal';
  modal.innerHTML =
    '<div class="box">' +
    '  <div class="parts-modal-head"><b class="pm-title"></b>' +
    '    <button type="button" class="pm-x" aria-label="닫기">&times;</button></div>' +
    '  <div class="pm-list"></div>' +
    '  <button type="button" class="pm-save">저장</button>' +
    '</div>';
  wrap.appendChild(modal);

  const pmTitle = modal.querySelector('.pm-title');
  const pmList = modal.querySelector('.pm-list');
  let editing = null;

  function fullLabel(r) {
    const base = labelOf[r.k] || String(r.no);
    return r.pos ? base + ' (' + (POS_LABEL[r.pos] || r.pos) + ')' : base;
  }

  function openPicker(region) {
    editing = region;
    pmTitle.textContent = fullLabel(region);
    const cur = String(state[stateKey(region)] || '');

    pmList.textContent = '';
    PART_STATES.forEach((s) => {
      const row = document.createElement('label');
      row.className = 'pm-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = s.code;
      cb.checked = cur.indexOf(s.code) >= 0;
      const tx = document.createElement('span');
      tx.textContent = s.name + ' (' + s.code + ')';
      tx.style.borderLeft = '4px solid ' + s.color;
      row.appendChild(cb);
      row.appendChild(tx);
      pmList.appendChild(row);
    });

    modal.classList.remove('hidden');
    const first = pmList.querySelector('input');
    if (first) first.focus();
  }

  function closePicker() { modal.classList.add('hidden'); editing = null; }

  function savePicker() {
    if (!editing) return closePicker();
    state[stateKey(editing)] = Array.prototype.slice
      .call(pmList.querySelectorAll('input:checked'))
      .map((c) => c.value)
      .join('');
    recomputeAggregates();
    closePicker();
    refresh();
    onChange && onChange();
  }

  modal.querySelector('.pm-save').addEventListener('click', savePicker);
  modal.querySelector('.pm-x').addEventListener('click', closePicker);
  modal.addEventListener('click', (e) => { if (e.target === modal) closePicker(); });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePicker();
    if (e.key === 'Enter') { e.preventDefault(); savePicker(); }
  });

  /**
   * 위치별로 찍은 값을 부위 단위로 합쳐 전송용 값(state[부위키])을 만든다.
   * 두 사이트의 부위 목록에는 좌우·전후 구분이 없기 때문이다.
   */
  function recomputeAggregates() {
    const merged = {};
    ALL_REGIONS.forEach((r) => {
      if (!r.pos) return;                       // 위치 없는 부위는 그 자체가 전송값
      const codes = String(state[stateKey(r)] || '');
      if (!codes) return;
      merged[r.k] = merged[r.k] || new Set();
      for (const c of codes) merged[r.k].add(c);
    });

    const positioned = new Set(ALL_REGIONS.filter((r) => r.pos).map((r) => r.k));
    positioned.forEach((k) => {
      const set = merged[k];
      state[k] = set ? PART_STATES.filter((s) => set.has(s.code)).map((s) => s.code).join('') : '';
    });

    // 사이트의 14.필러패널 은 A·B·C 위의 부모 항목이다. 하나라도 있으면 함께 켠다.
    if ('pt14' in labelOf) {
      const sub = ['pt14A', 'pt14B', 'pt14C'].map((k) => String(state[k] || '')).filter(Boolean);
      state.pt14 = sub.length ? sub[0] : '';
    }
  }

  function refresh() {
    Object.entries(shapes).forEach(([sk, list]) => {
      const codes = String(state[sk] || '');
      const c = colorOf(codes);
      list.forEach(({ g, rect, text, region }) => {
        rect.setAttribute('fill', c || '#eceff3');
        rect.setAttribute('stroke', c ? '#00000038' : '#9aa5b2');
        text.setAttribute('fill', c ? '#fff' : '#59636f');
        text.textContent = codes || (region.sub ? region.sub : String(region.no));
        g.classList.toggle('on', !!c);
      });
    });

    paintRanks();

    summary.textContent = '';
    let any = false;
    RANKS.forEach((rk) => {
      const hits = [];
      rk.keys.forEach((k) => {
        const spots = ALL_REGIONS.filter((r) => r.k === k && r.pos);
        if (spots.length) {
          // 같은 위치가 좌·우 그림에 함께 나오므로 저장자리 기준으로 한 번만
          const seen = new Set();
          spots.forEach((r) => {
            const sk = stateKey(r);
            if (seen.has(sk)) return;
            seen.add(sk);
            const v = String(state[sk] || '');
            if (v) hits.push(v + ' ' + fullLabel(r));
          });
        } else if (String(state[k] || '')) {
          hits.push(String(state[k]) + ' ' + (labelOf[k] || k));
        }
      });
      if (!hits.length) return;
      any = true;
      const row = document.createElement('div');
      row.className = 'parts-sumrow';
      const tag = document.createElement('span');
      tag.className = 'parts-sumtag';
      tag.textContent = rk.group + ' ' + rk.rank;
      const txt = document.createElement('span');
      txt.textContent = hits.join(' · ');
      row.appendChild(tag);
      row.appendChild(txt);
      summary.appendChild(row);
    });

    summary.classList.toggle('empty', !any);
    if (!any) summary.textContent = '표시한 부위가 없습니다.';
  }

  recomputeAggregates();
  refresh();
  container.appendChild(wrap);
}

window.renderPartsDiagram = renderPartsDiagram;
window.PART_STATES = PART_STATES;
window.PILLARS = PILLARS;
window.setPillars = setPillars;
window.pillarPath = pillarPath;
window.VIEWS = VIEWS;
window.VIEW_TF = VIEW_TF;
window.ALL_REGIONS = ALL_REGIONS;
window.getLayout = getLayout;
window.setLayout = setLayout;
