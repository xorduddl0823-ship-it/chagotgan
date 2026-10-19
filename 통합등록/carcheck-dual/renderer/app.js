let SCHEMA = null;
const state = {};
let prepared = null; // { checkNo, carNo }
let kmTouched = false; // 현재주행거리를 사람이 직접 고쳤는가

/**
 * 현재주행거리를 주행거리에 맞춘다.
 *
 *  카인포는 성능점검의 주행거리(#distance)와 보증정보의 현재주행거리(#currentKm)가
 *  따로 있다. 조회하면 현재주행거리에 옛 숫자가 들어오는데, 점검원이 주행거리만
 *  고치면 그 옛 숫자가 그대로 남아 두 값이 어긋났다.
 *  사람이 현재주행거리를 직접 고친 적이 있으면 그 값을 존중한다.
 */
function syncCurrentKm() {
  if (kmTouched) return;
  const km = String(state.mileage || '');
  if (String(state.currentKm || '') === km) return;
  state.currentKm = km;
  const el = document.getElementById(fieldId('currentKm'));
  if (el) el.value = km;
  const wrap = document.querySelector('.field[data-key="currentKm"]');
  if (wrap) { wrap.classList.add('autoset'); wrap.classList.remove('imported'); }
}

const $ = (s) => document.querySelector(s);
const fieldId = (k) => 'f_' + k;
const fieldOf = (k) => SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.k === k);

/* ───────────────────────── 화면 생성 ───────────────────────── */

function render() {
  const root = $('#form');
  root.innerHTML = '';

  SCHEMA.groups.forEach((g) => {
    const sec = document.createElement('section');
    const h = document.createElement('h2');
    h.textContent = g.title;
    sec.appendChild(h);

    //  그룹 설명 (예: 조회 입력 구역에서 무엇만 치면 되는지)
    if (g.hint) {
      const gh = document.createElement('p');
      gh.className = 'group-hint';
      gh.textContent = g.hint;
      sec.appendChild(gh);
    }

    const grid = document.createElement('div');
    grid.className = 'grid';

    //  부위 항목은 낱개 입력칸 대신 절개도 한 장으로 그린다 (parts-diagram.js)
    const partFields = g.fields.filter((f) => f.type === 'part');
    //  사진 항목도 낱개 입력칸이 아니라 사진 8칸으로 그린다 (photos.js)
    const photoFields = g.fields.filter((f) => f.type === 'photo');

    //  원부·조회로 자동으로 채워지는 항목은 아래쪽 별도 구역으로 내린다.
    //  점검원이 직접 칠 것은 차량번호와 딜러명뿐이다.
    const autoGrid = document.createElement('div');
    autoGrid.className = 'grid auto-grid';

    g.fields.forEach((f) => {
      if (f.type === 'part' || f.type === 'photo') return;
      const wrap = document.createElement('div');
      wrap.className = 'field' + (f.type === 'textarea' ? ' wide' : '');
      wrap.dataset.key = f.k;

      const lab = document.createElement('label');
      lab.setAttribute('for', fieldId(f.k));
      lab.textContent = f.label;
      if (f.req) {
        const s = document.createElement('span');
        s.className = 'req';
        s.textContent = '*';
        lab.appendChild(s);
      }
      const tags = document.createElement('span');
      tags.className = 'tags';
      tags.textContent = f.local ? '앱' : [f.cm ? '조합' : null, f.ci ? '카인포' : null].filter(Boolean).join('·');
      lab.appendChild(tags);
      wrap.appendChild(lab);

      let el;
      if (f.type === 'select') {
        el = document.createElement('select');
        el.appendChild(new Option('선택', ''));
        (SCHEMA.opts[f.opts] || []).forEach(([v, t]) => el.appendChild(new Option(t, v)));
      } else if (f.type === 'textarea') {
        el = document.createElement('textarea');
        el.rows = 3;
      } else {
        el = document.createElement('input');
        el.type = f.type === 'date' ? 'date' : 'text';
      }
      el.id = fieldId(f.k);
      if (state[f.k] !== undefined) el.value = state[f.k];
      const on = () => {
        state[f.k] = el.value;
        wrap.classList.remove('imported');
        //  현재주행거리는 주행거리를 따라간다.
        //  카인포는 두 칸이 따로라, 주행거리만 고치면 보증정보의 현재주행거리에
        //  조회해 온 옛 숫자가 그대로 남아 두 값이 어긋났다.
        if (f.k === 'currentKm') kmTouched = true;
        if (f.k === 'mileage') syncCurrentKm();
        applyDeps();
      };
      el.addEventListener('input', on);
      el.addEventListener('change', on);
      wrap.appendChild(el);

      if (f.hint) {
        const hint = document.createElement('small');
        hint.textContent = f.hint;
        wrap.appendChild(hint);
      }
      (f.auto ? autoGrid : grid).appendChild(wrap);
    });

    sec.appendChild(grid);
    if (autoGrid.children.length) {
      const note = document.createElement('div');
      note.className = 'auto-note';
      note.textContent = '아래는 조회로 자동으로 채워지는 항목입니다. 값이 안 왔을 때만 직접 고치세요.';
      sec.appendChild(note);
      sec.appendChild(autoGrid);
    }
    if (partFields.length) {
      window.renderPartsDiagram(sec, partFields, state, () => { syncAccidentFromParts(); applyDeps(); });
    }
    if (photoFields.length) {
      window.renderPhotos(sec, photoFields, state, () => applyDeps());
    }
    root.appendChild(sec);
  });

  applyDeps();
  syncAccidentFromParts(); // 화면을 처음 그릴 때도 규칙을 한 번 맞춘다 (임시저장 복원 포함)
}

/**
 * 부위 표시에 맞춰 사고이력·단순수리를 자동으로 맞춘다.
 *
 *  규칙 자체는 src/schema.js 의 historyFromParts 한 곳에만 있고,
 *  화면은 그것을 그대로 물어본다(IPC). 전송도 같은 값을 보내므로
 *  화면에 보이는 값과 사이트로 나가는 값이 어긋날 일이 없다.
 *
 *    표시 없음                        -> 사고이력 없음 · 단순수리 없음
 *    외판 부식·흠집·요철·손상          -> 사고이력 없음 · 단순수리 없음
 *    외판 판금                        -> 사고이력 없음 · 단순수리 있음
 *    외판 1랭크 교환                  -> 사고이력 없음 · 단순수리 있음
 *    외판 2랭크 교환                  -> 사고이력 있음 · 단순수리 있음
 *    주요골격 무엇이든                -> 사고이력 있음 · 단순수리 있음
 */
async function syncAccidentFromParts() {
  const hist = await window.api.calcHistory({ ...state });
  if (!hist) return;

  [['accident', hist.accident], ['accidentSimple', hist.accidentSimple]].forEach(([k, v]) => {
    if (String(state[k] || '') === v) return;
    state[k] = v;
    const el = document.getElementById(fieldId(k));
    if (el) el.value = v;
    const wrap = document.querySelector('.field[data-key="' + k + '"]');
    if (wrap) wrap.classList.add('autoset');
  });
}

function applyDeps() {
  SCHEMA.groups.forEach((g) =>
    g.fields.forEach((f) => {
      if (!f.dep) return;
      const wrap = document.querySelector('.field[data-key="' + f.k + '"]');
      if (!wrap) return;
      wrap.classList.toggle('disabled', String(state[f.dep.k] || '') !== String(f.dep.v));
    })
  );
}

/* ───────────────────────── 공통 UI ───────────────────────── */

const busy = (txt) => { $('#busy-text').textContent = txt; $('#busy').classList.remove('hidden'); };
const unbusy = () => { $('#busy').classList.add('hidden'); $('#busy-steps').classList.add('hidden'); };

/** 자동 등록 진행 칸 — 몇 번째 전산까지 왔는지(0 카인포 · 1 카모두 · 2 엔트리 · 3 모두 끝) */
function autoSteps(i) {
  const box = $('#busy-steps');
  box.classList.remove('hidden');
  box.querySelectorAll('span').forEach((s, k) => { s.className = k < i ? 'done' : k === i ? 'now' : ''; });
}
const AUTO_ORDER = ['carinfo', 'carmodoo', 'entry'];
/** 진행 알림 → 한 줄 글 + 진행 칸 (엔트리 로그인 확인은 맨 처음이라 카인포 칸에 둔다) */
function autoProgress(info) {
  const pre = info.step === '엔트리 로그인 확인';
  const i = info.step === '마무리' ? 3 : pre ? 0 : Math.max(0, AUTO_ORDER.indexOf(info.site));
  busy(pre ? '시작 전 확인 · 엔트리 로그인…' : (info.siteName ? info.siteName + ' · ' : '') + info.step + (info.note ? ' — ' + info.note : '') + '…');
  autoSteps(i);
}

function report(title, blocks) {
  $('#report').querySelector('h2').textContent = title;
  const body = $('#report-body');
  body.innerHTML = '';
  blocks.forEach((b) => {
    const box = document.createElement('div');
    box.className = 'rbox ' + (b.tone || (b.ok ? 'ok' : 'bad'));
    const h = document.createElement('h3');
    h.textContent = b.title;
    box.appendChild(h);
    (b.lists || []).forEach((l) => {
      if (!l.items || !l.items.length) return;
      const d = document.createElement('div');
      d.className = 'list ' + (l.cls || '');
      d.innerHTML = '<strong>' + l.title + (l.noCount ? '' : ' (' + l.items.length + ')') + '</strong>';
      const ul = document.createElement('ul');
      l.items.forEach((x) => { const li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
      d.appendChild(ul);
      box.appendChild(d);
    });
    if (b.note) {
      const p = document.createElement('p');
      p.className = 'note';
      p.textContent = b.note;
      box.appendChild(p);
    }
    body.appendChild(box);
  });
  $('#report').classList.remove('hidden');
}

function esc(t) {
  return String(t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function pickDealer(candidates) {
  return new Promise((resolve) => {
    const list = $('#picker-list');
    list.innerHTML = '';
    candidates.forEach((c) => {
      const row = document.createElement('button');
      row.className = 'pick-row';
      row.innerHTML =
        '<span class="p-dc">' + esc(c.dc || '-') + '</span>' +
        '<span class="p-de">' + esc(c.de || '-') + '</span>' +
        '<span class="p-hp">' + esc(c.hp || '') + '</span>';
      row.addEventListener('click', () => { $('#picker').classList.add('hidden'); resolve(c); });
      list.appendChild(row);
    });
    const cancel = () => { $('#picker').classList.add('hidden'); resolve(null); };
    $('#picker-cancel').onclick = cancel;
    $('#picker').classList.remove('hidden');
  });
}

/**
 * 경기조합 딜러 목록에서 고르기.
 *  사이트가 띄운 목록의 줄을 그대로 보여 준다 — 이름·상사명을 눈으로 맞춰 고르도록.
 */
function pickRow(rows) {
  return new Promise((resolve) => {
    const list = $('#picker-list');
    list.innerHTML = '';

    /*  두 사이트의 칸 이름이 다르다.
     *  경기조합 사원선택은 사원명·상사명·휴대폰번호,
     *  카인포 딜러검색은 딜러명·매매상사·연락처로 온다.
     *  한쪽 이름만 알고 있어서 카인포 목록이 빈 줄로 떴다 — 둘 다 본다. */
    const want = ['사원명', '딜러명', '상사명', '매매상사', '휴대폰번호', '연락처', '사원구분', '지역'];
    (rows || []).forEach((r) => {
      const row = document.createElement('button');
      row.className = 'pick-row';
      const by = r.by || {};
      let cells = want.filter((k) => by[k]).map((k) => by[k]);
      //  아는 이름이 하나도 없으면 있는 값을 그대로, 그것도 없으면 줄 글자를 보여준다
      if (!cells.length) cells = Object.keys(by).map((k) => by[k]).filter(Boolean);
      if (!cells.length) cells = (r.cells && r.cells.length ? r.cells : [r.text]).filter(Boolean).slice(0, 5);
      if (!cells.length) cells = ['(내용 없음)'];
      row.innerHTML = cells.map((c) => '<span>' + esc(c) + '</span>').join('');
      row.addEventListener('click', () => { $('#picker').classList.add('hidden'); resolve(r); });
      list.appendChild(row);
    });
    const cancel = () => { $('#picker').classList.add('hidden'); resolve(null); };
    $('#picker-cancel').onclick = cancel;
    $('#picker').classList.remove('hidden');
  });
}

/* ────────────────── 딜러 바꾸기 (두 사이트 공통) ────────────────── */

/**
 * 사이트에서 받아 온 딜러 값을 앱 화면에 되돌려 넣는다.
 *
 *  딜러를 바꾸면 매매상사·연락처도 함께 바뀐다. 이름만 갈아 끼우면
 *  옛 딜러의 상사·번호가 그대로 남아 두 사이트에 어긋난 사람이 등록된다.
 */
function applyDealer(s) {
  const took = [];
  [['dealerName', s && s.dealerName], ['sangsaName', s && s.sangsaName], ['dealerHp', s && s.dealerHp]]
    .forEach(([k, v]) => {
      if (!v || String(state[k] || '') === String(v)) return;
      state[k] = v;
      const el = document.getElementById(fieldId(k));
      if (el) el.value = v;
      const wrap = document.querySelector('.field[data-key="' + k + '"]');
      if (wrap) wrap.classList.add('autoset');
      took.push(k + ' → ' + v);
    });
  return took;
}

/** 카인포 고객정보의 매매상사/딜러를 바꾼다 */
async function dealerCarinfo(name) {
  busy('카인포에서 딜러를 찾는 중…');
  let r;
  try { r = await window.api.ciDealer({ name }); } finally { unbusy(); }

  //  같은 이름이 여럿이면 사람이 고른다 — 상사가 다른 동명이인을 앱이 집으면 안 된다
  if (r && r.needPick) {
    const chosen = await pickRow(r.rows);
    if (!chosen) return { ok: false, canceled: true };
    busy('고른 딜러로 바꾸는 중…');
    try { r = await window.api.ciDealer({ name, row: chosen.i }); } finally { unbusy(); }
  }
  return r || { ok: false, error: '알 수 없는 오류' };
}

/** 경기조합 신청인정보의 딜러를 바꾼다 */
async function dealerCarmodoo(name) {
  busy('경기조합에서 딜러를 찾는 중…');
  let r;
  //  매매상사·연락처까지 넘겨 셋이 다 맞는 사람을 앱이 고를 수 있게 한다
  try {
    r = await window.api.pickDealer({
      name,
      match: { dealerName: name, sangsaName: state.sangsaName, dealerHp: state.dealerHp },
    });
  } finally { unbusy(); }

  if (r && r.needPick) {
    const chosen = await pickRow(r.rows);
    if (!chosen) return { ok: false, canceled: true };
    busy('고른 딜러로 채우는 중…');
    try { r = await window.api.pickDealer({ name, row: chosen.i }); } finally { unbusy(); }
  }
  return r || { ok: false, error: '알 수 없는 오류' };
}

/* ────────────────── ① 카인포 신규등록 + 정보 가져오기 ────────────────── */

async function prepareCarinfo() {
  if (!String(state.carNo || '').trim()) { alert('차량번호를 먼저 입력해 주세요.'); return; }
  const personal = String(state.tradeType || '0') === '1';
  if (!personal && !String(state.dealerName || '').trim()) {
    alert('딜러명을 입력해 주세요. (상사명이나 연락처로도 검색됩니다)');
    return;
  }

  const base = {
    carNo: state.carNo,
    dealer: state.dealerName,
    tradePersonal: personal,
    clientName: state.clientName,
    hp: state.dealerHp,
  };

  busy('카인포에서 신규등록 중…');
  let res = await window.api.prepare(base);

  if (!res.ok && res.needPick) {
    unbusy();
    const picked = await pickDealer(res.candidates);
    if (!picked) return;
    busy('카인포에서 신규등록 중…');
    res = await window.api.prepare({ ...base, pickKey: picked.key });
  }

  if (!res.ok) {
    unbusy();
    report('카인포 신규등록 실패', [{
      ok: false,
      title: '\uba48\ucd98 \ub2e8\uacc4: ' + (res.step || '\uc54c \uc218 \uc5c6\uc74c'),
      lists: [{ title: '\uc9c4\ud589 \uae30\ub85d', items: res.log || [], cls: 'muted' }],
      note: res.error,
    }]);
    return;
  }

  prepared = { checkNo: res.checkNo, carNo: res.carNo };

  // ── 원부에서 끌어온 차량정보를 앱으로 되읽기 ──
  busy('차량정보를 가져오는 중…');
  const s = await window.api.scrape('carinfo');
  unbusy();

  const importedKeys = [];
  const imported = [];
  const conflicts = [];
  if (s.ok) {
    Object.entries(s.data).forEach(([k, v]) => {
      const f = fieldOf(k);
      if (!f) return;
      const cur = String(state[k] || '').trim();
      if (!cur) {
        state[k] = v;
        importedKeys.push(k);
        imported.push(f.label + ' : ' + labelOf(f, v));
      } else if (cur !== String(v)) {
        conflicts.push(f.label + ' \u2014 \uc785\ub825\uac12 "' + labelOf(f, cur) + '" \uc720\uc9c0 (\uce74\uc778\ud3ec "' + labelOf(f, v) + '")');
      }
    });
    render();
    importedKeys.forEach((k) => {
      const w = document.querySelector('.field[data-key="' + k + '"]');
      if (w) w.classList.add('imported');
    });
  } else {
    conflicts.push('\ucc28\ub7c9\uc815\ubcf4\ub97c \uc77d\uc5b4\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: ' + s.error);
  }

  // ── 차대번호: 경기조합에서 전체를 받아 뒷 6자리를 카인포에 넣는다 ──
  //  카인포는 원부로 앞자리까지만 채워 주고 뒷 6자리는 사람이 쳐야 한다.
  //  경기조합은 차량번호로 검색하면 전체를 끌어오므로 그 값을 옮겨 담는다.
  busy('경기조합에서 차대번호를 가져오는 중…');
  const vinRes = await window.api.syncVin({ carNo: state.carNo });
  unbusy();

  const vinLines = [];
  if (vinRes.ok) {
    if (vinRes.vin && String(state.vin || '').trim() !== vinRes.vin) {
      state.vin = vinRes.vin;
      importedKeys.push('vin');
    }
    vinLines.push('차대번호 ' + vinRes.vin + ' (경기조합에서 조회)');
    vinLines.push(vinRes.filled
      ? '카인포 뒷자리 자동 입력: ' + vinRes.tail
      : '카인포 뒷자리 입력 실패 — 직접 넣어 주세요' + (vinRes.error ? ' (' + vinRes.error + ')' : ''));
    render();
    importedKeys.forEach((k) => {
      const w = document.querySelector('.field[data-key="' + k + '"]');
      if (w) w.classList.add('imported');
    });
  } else {
    conflicts.push('차대번호를 가져오지 못했습니다 — ' +
      (vinRes.step ? '[' + vinRes.step + '] ' : '') + (vinRes.error || ''));
  }

  $('#prep-state').textContent = '점검번호 ' + res.checkNo + ' · ' + res.carNo;
  $('#prep-state').classList.add('on');

  report('카인포 신규등록 완료', [{
    ok: true,
    title: '점검번호 ' + res.checkNo + ' 발급 · ' + res.carNo,
    lists: [
      { title: '진행 기록', items: res.log || [], cls: 'muted' },
      { title: '원부에서 가져온 항목', items: imported, cls: 'good' },
      { title: '차대번호', items: vinLines, cls: 'good' },
      { title: '입력값을 유지한 항목', items: conflicts, cls: 'warn' },
    ],
    note: '가져온 값은 파란 테두리로 표시됩니다. 점검 항목을 마저 채운 뒤 전송하세요.',
  }]);
}

function labelOf(f, v) {
  if (f.type !== 'select') return v;
  const hit = (SCHEMA.opts[f.opts] || []).find(([val]) => String(val) === String(v));
  return hit ? hit[1] : v;
}

/* ───────────────────────── ② 전송 ───────────────────────── */

function collect() {
  const required = [];
  SCHEMA.groups.forEach((g) =>
    g.fields.forEach((f) => {
      if (f.req && !String(state[f.k] || '').trim()) required.push(f.label);
    })
  );
  return { data: { ...state }, required };
}

async function send(ids) {
  const { data, required } = collect();
  if (required.length) { alert('필수 항목이 비어 있습니다:\n\n' + required.join(', ')); return; }

  const blocks = [];
  for (const id of ids) {
    busy(SCHEMA.sites[id].name + ' 전송 중…');
    let r = await window.api.send(id, data);

    /*  경기조합은 딜러(사원)를 먼저 골라야 나머지가 등록된다.
     *  사원선택 목록이 뜨면 여기서 고르고, 이어서 다시 전송한다. */
    if (r && r.needDealerPick) {
      unbusy();
      const chosen = await pickRow(r.rows);
      if (chosen) {
        busy('고른 딜러로 채우는 중…');
        const done = await window.api.pickDealer({ name: data.dealerName, row: chosen.i });
        if (done && done.ok) {
          busy(SCHEMA.sites[id].name + ' 전송 중…');
          r = await window.api.send(id, data);
        } else {
          r = { ok: false, error: (done && done.error) || '고른 딜러로 채우지 못했습니다.' };
        }
      }
    }
    blocks.push({
      ok: !!r.ok,
      title: SCHEMA.sites[id].name + (r.ok ? ' — 입력 완료' : ' — 실패'),
      lists: r.ok ? [
        { title: '입력됨', items: r.filled, cls: 'good' },
        { title: '입력 실패 — 직접 확인 필요', items: r.missing, cls: 'warn' },
        { title: '이 사이트에 없는 항목', items: r.skipped, cls: 'muted' },
      ] : [],
      note: r.ok ? '값만 채웠습니다. 해당 창에서 확인한 뒤 직접 [저장]을 누르세요.' : r.error,
    });
  }
  unbusy();
  await window.api.saveRecord({ carNo: data.carNo, checkNo: prepared && prepared.checkNo, data });
  report('전송 결과', blocks);
}

/* ─────────── 세 전산 자동 등록 (대표님 10/19 최종 지시 · 설정 flow 가 켜졌을 때만) ───────────
 *  입력 화면의 같은 자료(위 121칸 · 사진)를 그대로 쓴다. 정상이면 끝까지 사람 조작 없음.
 *  멈추면 «어느 차 · 어느 전산 · 까닭 · 단계 · 할 일»을 보여 주고 [이어 하기]로 이어 간다. */
let autoStop = null;   // 멈춘 작업 { jobId }

/** 저장 전 확인 창(화면 가운데) — [저장]이면 true */
function askAuto(title, text) {
  return new Promise((resolve) => {
    $('#auto-confirm-title').textContent = title;
    $('#auto-confirm-text').textContent = text;
    $('#auto-confirm').classList.remove('hidden');
    const done = (v) => { $('#auto-confirm').classList.add('hidden'); $('#auto-confirm-yes').onclick = null; $('#auto-confirm-no').onclick = null; resolve(v); };
    $('#auto-confirm-yes').onclick = () => done(true);
    $('#auto-confirm-no').onclick = () => done(false);
  });
}

async function autoRegister(resumeJobId) {
  const { data, required } = collect();
  if (!resumeJobId && required.length) {
    report('필수 항목이 비어 있어요', [{ ok: false, title: '먼저 채워 주세요', lists: [{ title: '빈 칸', items: required, cls: 'warn' }] }]);
    return;
  }
  const go = resumeJobId
    ? await askAuto('멈춘 곳부터 이어서 등록할까요?', '작업 번호 ' + resumeJobId + ' · 차량 ' + (data.carNo || '-') + ' · 이미 등록된 곳은 다시 등록하지 않아요.')
    : await askAuto('세 전산에 등록할까요?', '차량 ' + data.carNo + ' · 1대 · 카인포 → 카모두 → 엔트리 3곳에 차례로 등록해요.');
  if (!go) return;
  window.api.flow.onProgress(autoProgress);
  busy('세 전산 자동 등록을 시작해요…');
  if (!resumeJobId) autoSteps(0);                       // 이어 하기는 첫 진행 알림이 올 때 칸을 보임(멈춘 전산부터)
  let res;
  try {
    res = await window.api.flow.runAll(resumeJobId ? { jobId: resumeJobId, data } : { carNo: data.carNo, vin: data.vin, data });
  } finally {
    unbusy();
  }
  return afterAuto(res, data);
}

/** 자동 등록 결과 처리 — 딜러 고르기면 고른 뒤 이어 가고, 끝이면 결과, 아니면 멈춤 안내 (처음·이어 하기 공통) */
async function afterAuto(res, data) {
  //  카인포 신규등록에서 딜러를 골라야 함 — 고르면 그 딜러로 신규등록부터 이어 간다
  if (res && res.ok === false && res.detail && res.detail.prepareNeedPick) {
    const picked = await pickDealer(res.detail.rows || []);
    if (!picked) { showAutoStop({ ...res, reason: '카인포 딜러를 고르지 않았어요.', action: '딜러를 고른 뒤 [이어 하기]를 눌러 주세요.' }); return; }
    return runResume(res.jobId, { ciPickKey: picked.key });
  }
  if (res && res.ok === false && res.detail && res.detail.needDealerPick) {
    const chosen = await pickRow(res.detail.rows || []);
    if (!chosen) { showAutoStop({ ...res, reason: '딜러를 고르지 않았어요.', action: '딜러를 고른 뒤 [이어 하기]를 눌러 주세요.' }); return; }
    busy('고른 딜러로 채우는 중…');
    const done = await window.api.pickDealer({ name: data.dealerName, row: chosen.i });
    unbusy();
    if (!done || !done.ok) { showAutoStop({ ...res, reason: (done && done.error) || '고른 딜러로 채우지 못했어요.' }); return; }
    return runResume(res.jobId);
  }
  if (res && res.ok) {
    autoStop = null;
    $('#btn-auto-resume').classList.add('hidden');
    return autoRegisterDone(res, data);
  }
  showAutoStop(res || { reason: '알 수 없는 오류' });
}

async function autoRegisterDone(res, data) {
  {
    const n = res.numbers || {};
    await window.api.saveRecord({ carNo: res.carNo, checkNo: n.carinfo, data });
    //  «같아요»는 세 번호가 실제로 같을 때만
    const same = !!(n.carinfo && n.carinfo === n.carmodoo && n.carmodoo === n.entry);
    report('세 전산 등록 끝', [{
      ok: same,
      tone: same ? 'ok' : 'warn',                       // 번호 확인 필요 = 주황(멈춤 빨강과 구분)
      title: res.carNo + (same ? ' — 세 곳 모두 등록했어요' : ' — 번호를 확인해 주세요'),
      lists: [
        { title: '점검번호', items: ['카인포 ' + (n.carinfo || '번호 못 받음'), '카모두 ' + (n.carmodoo || '번호 못 받음'), '엔트리 ' + (n.entry || '번호 못 받음')], cls: same ? 'good' : 'warn', noCount: true },
        { title: '걸린 시간', items: [Math.round((res.ms || 0) / 1000) + '초'], cls: 'muted', noCount: true },
      ],
      note: same ? '세 전산 번호가 모두 같아요. 확인만 해 주세요.' : '받지 못했거나 다른 번호가 있어요. 해당 전산에서 확인해 주세요.',
    }]);
  }
}

/** 딜러를 고른 바로 뒤 — 방금 [등록]을 확인한 같은 작업이라 확인 창 없이 이어 간다 (진행 칸도 다시 보임) */
async function runResume(jobId, extra) {
  const { data } = collect();
  window.api.flow.onProgress(autoProgress);
  busy('이어서 등록하는 중…');
  let res;
  try { res = await window.api.flow.runAll({ jobId, data: { ...data, ...(extra || {}) } }); } finally { unbusy(); }
  return afterAuto(res, data);
}

function showAutoStop(res) {
  //  번호 어긋남·사람 확인이 필요한 멈춤은 관리자 확인 전에는 [이어 하기]를 보이지 않는다(정정 절차를 건너뛰지 않게)
  const d = res.detail || {};
  const needAdmin = !!(d.stopped || d.manual || d.needsConfirm);
  autoStop = res.jobId && !needAdmin ? { jobId: res.jobId } : null;
  $('#btn-auto-resume').classList.toggle('hidden', !autoStop);
  report('자동 등록 멈춤', [{
    ok: false,
    title: (res.siteName || '등록') + (res.step ? ' · ' + res.step : '') + ' 에서 멈췄어요',
    lists: [
      { title: '차량', items: [res.carNo || '-'], noCount: true },
      { title: '까닭', items: [res.reason || res.error || '알 수 없음'], cls: 'warn', noCount: true },
      { title: '할 일', items: [res.action || '내용을 확인해 주세요.'], cls: 'muted', noCount: true },
      { title: '작업 번호', items: [res.jobId || '-'], cls: 'muted', noCount: true },
    ],
    note: needAdmin ? '대표님(관리자) 확인이 끝나기 전에는 이어 하지 않아요.' : res.jobId ? '고친 뒤 [이어 하기]를 누르면 멈춘 곳부터 이어 가요.' : '',
  }]);
}

/* ───────────────────────── 시작 ───────────────────────── */

(async function init() {
  SCHEMA = await window.api.schema();

  //  절개도 기둥을 맞춰 둔 값이 있으면 그리기 전에 반영한다
  try {
    const cfg0 = await window.api.getConfig();
    //  기둥만 맞춘 옛 파일을 먼저, 그 뒤에 절개도 전체 배치를 얹는다
    if (cfg0 && cfg0.pillars && window.setPillars) window.setPillars(cfg0.pillars);
    if (cfg0 && cfg0.diagram && window.setLayout) window.setLayout(cfg0.diagram);
  } catch {}

  state.tradeType = '0';
  render();

  document.querySelectorAll('.site-btn').forEach((b) =>
    //  창을 열고, 로그인 화면이면 저장해 둔 정보로 바로 로그인한다.
    //  (저장된 것이 없으면 조용히 지나가고 사람이 직접 로그인하면 된다)
    b.addEventListener('click', async () => {
      const label = b.textContent.trim();
      b.disabled = true;
      try {
        const r = await window.api.openSite(b.dataset.site);
        if (r && r.ok === false) { alert(r.error); return; }
      } catch (e) {
        alert(label + '을 여는 중 오류가 났습니다.\n' + e.message);
        return;
      } finally {
        b.disabled = false;
      }
      //  로그인은 창을 띄운 다음 따로 해 본다.
      //  실패해도 창은 이미 떠 있으니 사람이 직접 로그인하면 된다.
      try { await window.api.loginSite(b.dataset.site); } catch {}
    })
  );
  $('#btn-prepare').addEventListener('click', () => prepareCarinfo().catch((e) => { unbusy(); alert(e.message); }));
  //  등록 흐름이 켜져 있으면 [세 전산 자동 등록]을 보인다(꺼져 있으면 예전 화면 그대로)
  try {
    const cfgF = await window.api.getConfig();
    if (cfgF && cfgF.flow === true && window.api.flow) {
      $('#btn-auto').classList.remove('hidden');
      $('#btn-send-all').classList.remove('primary');
      $('#btn-auto').addEventListener('click', () => autoRegister().catch((e) => { unbusy(); showAutoStop({ reason: e.message }); }));
      $('#btn-auto-resume').addEventListener('click', () => autoStop && autoRegister(autoStop.jobId).catch((e) => { unbusy(); showAutoStop({ reason: e.message }); }));
    }
  } catch {}
  $('#btn-send-cm').addEventListener('click', () => send(['carmodoo']));
  $('#btn-send-ci').addEventListener('click', () => send(['carinfo']));
  $('#btn-send-all').addEventListener('click', () => send(['carmodoo', 'carinfo']));
  $('#report-close').addEventListener('click', () => $('#report').classList.add('hidden'));

  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('입력한 내용을 모두 지울까요?')) return;
    Object.keys(state).forEach((k) => delete state[k]);
    state.tradeType = '0';
    prepared = null;
    $('#prep-state').textContent = '';
    $('#prep-state').classList.remove('on');
    render();
  });
  $('#btn-save').addEventListener('click', async () => {
    const f = await window.api.saveRecord({ carNo: state.carNo, data: { ...state }, draft: true });
    alert('임시저장했습니다.\n' + f);
  });

  //  사고체크 화면 구조 조사 — 두 사이트의 절개도 조작 방식이 서로 달라
  //  자동화하려면 그림 위 클릭 대상이 무엇인지 알아야 한다. 읽기만 하고 값은 안 바꾼다.
  /* ── 설정: 로그인 정보 ──────────────────────────────────────────
   *  비밀번호는 앱이 되돌려주지 않는다. 저장돼 있으면 "저장됨" 으로만 보이고,
   *  칸을 비운 채 저장하면 기존 비밀번호가 그대로 유지된다.
   *  지우려면 '지움' 을 눌러 명시적으로 비운다.
   */
  const CRED_SITES = [
    ['carmodoo', '경기조합 (ck.carmodoo.com)'],
    ['carinfo', '카인포 (ai.carinfo.co.kr)'],
  ];

  async function openSettings() {
    const r = await window.api.getCreds();
    const box = $('#creds-form');
    box.innerHTML = '';

    CRED_SITES.forEach(([id, name]) => {
      const c = (r.creds && r.creds[id]) || { id: '', hasPw: false };
      const sec = document.createElement('div');
      sec.className = 'cred-site';
      sec.innerHTML =
        '<h3>' + esc(name) + '</h3>' +
        '<div class="cred-row">' +
        '  <label>아이디</label>' +
        '  <input type="text" id="cred-id-' + id + '" autocomplete="off">' +
        '</div>' +
        '<div class="cred-row">' +
        '  <label>비밀번호</label>' +
        '  <input type="password" id="cred-pw-' + id + '" autocomplete="new-password"' +
        '         placeholder="' + (c.hasPw ? '저장됨 — 바꿀 때만 입력' : '입력') + '">' +
        '  <button type="button" class="ghost cred-clear" data-site="' + id + '">지움</button>' +
        '</div>';
      box.appendChild(sec);
      sec.querySelector('#cred-id-' + id).value = c.id || '';
    });

    box.querySelectorAll('.cred-clear').forEach((b) => {
      b.addEventListener('click', () => {
        const el = document.getElementById('cred-pw-' + b.dataset.site);
        el.value = '';
        el.dataset.clear = '1';
        el.placeholder = '저장하면 지워집니다';
      });
    });

    const cfgNow = await window.api.getConfig();
    $('#opt-thorough').checked = !!(cfgNow && cfgNow.thorough);

    const warn = $('#creds-warn');
    if (!r.available) {
      warn.textContent = '이 PC에서는 비밀번호를 안전하게 암호화할 수 없어 저장되지 않습니다. 아이디만 저장됩니다.';
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
    $('#settings').classList.remove('hidden');
  }

  $('#btn-settings').addEventListener('click', () => openSettings().catch((e) => alert(e.message)));
  $('#creds-cancel').addEventListener('click', () => $('#settings').classList.add('hidden'));

  $('#creds-save').addEventListener('click', async () => {
    const patch = {};
    CRED_SITES.forEach(([id]) => {
      const pwEl = document.getElementById('cred-pw-' + id);
      const entry = { id: document.getElementById('cred-id-' + id).value.trim() };
      //  빈 칸은 "그대로 두기". 지우려면 [지움] 을 눌러야 한다.
      if (pwEl.dataset.clear === '1') entry.pw = '';
      else if (pwEl.value) entry.pw = pwEl.value;
      patch[id] = entry;
    });

    const cfgNow = (await window.api.getConfig()) || {};
    cfgNow.thorough = $('#opt-thorough').checked;
    await window.api.setConfig(cfgNow);

    const r = await window.api.setCreds(patch);
    if (!r || !r.ok) { alert((r && r.error) || '저장하지 못했습니다.'); return; }
    $('#settings').classList.add('hidden');
    alert('저장했습니다. 다음 전송부터 자동으로 로그인합니다.');
  });

  //  카인포 절개도 학습 — 점이 어느 부위인지 사이트에 직접 물어본다.
  //  표기를 넣었다 지우므로 기존 표시도 함께 지워진다. 먼저 확인을 받는다.
  $('#btn-learn').addEventListener('click', async () => {
    const ok = confirm(
      '카인포 절개도의 점이 어느 부위인지 알아냅니다.\n\n' +
      '교환·부식·판금·흠집·요철·손상을 하나씩 골라 가며,\n' +
      '부호마다 어떤 점이 나타나는지 확인하고 [전체삭제]로 지웁니다.\n' +
      '(판금은 교환보다 점이 많고 자리도 달라 부호별로 익혀야 합니다)\n' +
      '이미 표시해 둔 사고 부위가 있으면 함께 지워집니다.\n\n' +
      '저장하지 않은 시험용 차량에서 한 번만 실행하세요. 계속할까요?'
    );
    if (!ok) return;

    busy('절개도를 부호별로 학습하는 중… (2~3분 걸립니다)');
    let r;
    try { r = await window.api.learnCarinfo(); } finally { unbusy(); }

    if (!r || !r.ok) {
      report('절개도 학습 실패', [{ ok: false, title: '학습하지 못했습니다', note: (r && r.error) || '알 수 없는 오류' }]);
      return;
    }
    report('절개도 학습 완료', [{
      ok: true,
      title: '포인트 ' + r.known + ' / ' + r.total + '개를 부위와 짝지었습니다',
      note: r.file,
      lists: [
        { title: '진행', cls: 'good', items: r.log || [] },
        { title: '다음', cls: 'muted', items: ['이 파일을 알려주시면 절개도에 직접 찍도록 붙입니다.'] },
      ],
    }]);
  });

  /*  사진만 따로 보내기 — 전체 전송을 다시 돌리지 않고 사진 자리만 맞춰 볼 수 있게.
   *  사이트 화면이 조금씩 달라 몇 번 시도가 필요하다. */
  async function sendPhotosOnly(site, name, keys, tip) {
    const have = keys.filter((k) => String(state[k] || '').trim());
    if (!have.length) { alert(tip); return; }
    busy(name + '에 사진을 올리는 중…');
    let r;
    try { r = await window.api.sendPhotos(site, { ...state }); } finally { unbusy(); }

    if (!r || !r.ok) {
      report('사진 전송 실패', [{ ok: false, title: '보내지 못했습니다', note: (r && r.error) || '알 수 없는 오류' }]);
      return;
    }
    report(name + ' 사진 전송 결과', [{
      ok: !(r.missing || []).length,
      title: (r.filled || []).length + '장 올렸습니다',
      lists: [
        { title: '올린 것', items: r.filled || [] },
        { title: '못 올린 것', cls: 'bad', items: r.missing || [] },
      ],
    }]);
  }

  /*  딜러 바꾸기 — 카인포 고객정보와 경기조합 신청인정보를 함께 바꾼다.
   *
   *  이름만 바꾸면 매매상사·연락처가 옛 딜러 것으로 남고,
   *  한쪽만 바꾸면 두 사이트에 서로 다른 사람이 등록된다.
   *  그래서 카인포에서 바꾼 값을 앱에 받아, 그 값으로 경기조합까지 잇달아 바꾼다.
   *  기준은 늘 카인포다 — 데이터가 그쪽에서 나오기 때문이다. */
  $('#btn-dealer-ci').addEventListener('click', async () => {
    const name = String(state.dealerName || '').trim();
    if (!name) { alert('딜러명을 먼저 입력해 주세요.'); return; }

    //  ① 카인포 고객정보
    const ci = await dealerCarinfo(name);
    if (ci.canceled) return;
    if (!ci.ok) {
      report('딜러 바꾸기 실패', [{
        ok: false, title: '카인포에서 바꾸지 못했습니다',
        note: ci.error || '알 수 없는 오류',
      }]);
      return;
    }

    const s = ci.state || {};
    const took = applyDealer(s);
    const blocks = [{
      ok: true,
      title: '카인포 고객정보 — ' + (s.dealerName || name) + (s.sangsaName ? ' · ' + s.sangsaName : ''),
      note: ci.confirmed ? '알림 창까지 확인했습니다.' : '',
      lists: [{ title: '바뀐 값', items: [
        '딜러명 ' + (s.dealerName || '-'),
        '매매상사 ' + (s.sangsaName || '-'),
        '연락처 ' + (s.dealerHp || '-'),
      ] }, {
        title: '앱에도 반영', cls: 'muted',
        items: took.length ? took : ['(바뀐 값 없음)'],
      }],
    }];

    //  ② 경기조합 신청인정보 — 카인포에서 받은 값 그대로
    const cm = await dealerCarmodoo(String(s.dealerName || name).trim());
    if (cm.canceled) {
      blocks.push({ ok: false, title: '경기조합 — 고르기를 그만두었습니다',
                    note: '[딜러 바꾸기 (조합만)] 로 나중에 다시 할 수 있습니다.' });
    } else if (cm.ok) {
      const c = cm.state || {};
      applyDealer(c);
      blocks.push({
        ok: true,
        title: '경기조합 신청인정보 — ' + (c.dealerName || s.dealerName || name),
        lists: [{ title: '바뀐 값', items: [
          '딜러번호 ' + (c.dNo || '-'), '딜러명 ' + (c.dealerName || '-'),
          '연락처 ' + (c.dealerHp || '-'), '상사번호 ' + (c.sNo || '-'),
          '상사명 ' + (c.sangsaName || '-'),
        ] }],
      });
    } else {
      blocks.push({ ok: false, title: '경기조합 — 바꾸지 못했습니다',
                    note: (cm.error || '알 수 없는 오류') +
                          '\n   카인포는 이미 바뀌었습니다. 경기조합만 다시 하시면 됩니다.' });
    }

    report('딜러 바꾸기 결과', blocks);
  });

  /*  팝업 진단 — 사원선택 창에서 골라도 조합 화면에 값이 안 들어올 때.
   *  팝업이 부모 창에 값을 써 넣는 통로가 살아 있는지 그대로 본다. */
  $('#btn-popup-diag').addEventListener('click', async () => {
    busy('팝업을 살펴보는 중…');
    let r;
    try { r = await window.api.popupDiag('carmodoo'); } finally { unbusy(); }

    if (!r || !r.ok) {
      report('팝업 진단 실패', [{ ok: false, title: '보지 못했습니다', note: (r && r.error) || '알 수 없는 오류' }]);
      return;
    }
    const c = r.check || {};
    report('팝업 진단', [{
      ok: !!r.popupOpen,
      title: r.popupOpen ? '팝업이 열려 있습니다' : '열린 팝업이 없습니다',
      note: r.note || r.url || '',
      lists: [
        { title: '부모 창과의 연결', items: [
          'opener 있나 : ' + (c['opener있나'] === undefined ? '-' : c['opener있나']),
          '부모 화면 읽기 : ' + (c['부모읽기'] || '-'),
          '부모 함수 : ' + (c['부모함수'] || '-'),
        ] },
        { title: '팝업 안의 표', cls: 'muted', items: c['표'] || [] },
        { title: '팝업에서 난 오류·기록', cls: 'bad', items: r.logs || [] },
      ],
    }]);
  });

  //  딜러만 따로 골라 보기 — 조합은 이름을 넣는 게 아니라 목록에서 골라야 한다
  $('#btn-dealer').addEventListener('click', async () => {
    const name = String(state.dealerName || '').trim();
    if (!name) { alert('딜러명을 먼저 입력해 주세요.'); return; }
    const r = await dealerCarmodoo(name);
    if (r.canceled) return;
    if (!r.ok) {
      report('딜러 고르기 실패', [{ ok: false, title: '고르지 못했습니다', note: r.error || '알 수 없는 오류' }]);
      return;
    }
    /*  조합에서 고른 값도 앱에 반영한다.
     *  딜러를 바꾸면 매매상사·연락처도 함께 바뀌어야 한다 — 이름만 바뀌면 안 된다. */
    const s = r.state || {};
    applyDealer(s);

    report('딜러 고르기 결과', [{
      ok: true,
      title: (s.dealerName || name) + (s.sangsaName ? ' · ' + s.sangsaName : ''),
      lists: [{ title: '신청인정보', items: [
        '딜러번호 ' + (s.dNo || '-'), '딜러명 ' + (s.dealerName || '-'),
        '연락처 ' + (s.dealerHp || '-'), '상사번호 ' + (s.sNo || '-'),
        '상사명 ' + (s.sangsaName || '-'),
      ] }],
    }]);
  });

  $('#btn-photo-cm').addEventListener('click', () =>
    sendPhotosOnly('carmodoo', '경기조합', ['photo1', 'photo2'],
      '1. 전면사진 또는 2. 후면사진을 먼저 골라 주세요.\n조합은 이 두 장만 받습니다.'));

  //  카인포는 8칸을 다 받는다 (앞면·뒷면·좌측면·우측면·기타1~4)
  $('#btn-photo-ci').addEventListener('click', () =>
    sendPhotosOnly('carinfo', '카인포',
      ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'photo6', 'photo7', 'photo8'],
      '사진을 먼저 골라 주세요.'));

  //  사진 화면 구조 조사 — 자리를 못 찾을 때 무엇이 있는지 그대로 본다
  $('#btn-photo-probe').addEventListener('click', async () => {
    const which = confirm('어느 사이트를 살펴볼까요?\n\n[확인] 경기조합   [취소] 카인포')
      ? 'carmodoo' : 'carinfo';
    busy((which === 'carmodoo' ? '경기조합' : '카인포') + ' 사진 화면을 살펴보는 중…');
    let r;
    try { r = await window.api.probePhotos(which); } finally { unbusy(); }

    if (!r || !r.ok) {
      report('사진 화면 조사 실패', [{
        ok: false, title: '읽지 못했습니다', note: (r && r.error) || '알 수 없는 오류',
        lists: [{ title: '확인할 것', cls: 'muted', items: [
          '경기조합 창을 열고 등록 화면(성능점검 입력)을 띄워 두세요.',
        ] }],
      }]);
      return;
    }
    const s = r.seen || {};
    report('사진 화면 조사 완료', [{
      ok: true,
      title: '파일로 저장했습니다',
      note: r.file,
      lists: [
        { title: '찾은 자리', items: Object.entries(s.slots || {})
            .map(([k, v]) => k + ' : ' + (v || '못찾음')) },
        { title: '이름표 자리', cls: 'muted', items: Object.entries(s.labels || {})
            .map(([k, v]) => k + ' ' + JSON.stringify(v)) },
        { title: '상자 후보 (큰 것부터)', cls: 'muted', items: (s.boxes || []).map((b) =>
            b.tag + (b.id ? '#' + b.id : '') + (b.cls ? '.' + b.cls : '') + ' ' + JSON.stringify(b.rect)) },
        { title: '파일칸', items: (s.files || []).map((f) => (f.id || f.name || '(이름없음)')) },
        { title: '지금 붙어 있는 사진', cls: 'muted', items: Object.entries(s.sig || {})
            .map(([k, v]) => k + ' ' + v) },
      ],
    }]);
  });

  $('#btn-probe').addEventListener('click', async () => {
    busy('사고체크 화면을 살펴보는 중…');
    let r;
    try { r = await window.api.probeAccident(); } finally { unbusy(); }

    if (!r || !r.ok) {
      report('사고체크 구조 조사 실패', [{
        ok: false,
        title: '읽지 못했습니다',
        note: (r && r.error) || '알 수 없는 오류',
        lists: [{ title: '확인할 것', cls: 'muted', items: [
          '두 사이트 창을 모두 열고 로그인해 주세요.',
          '경기조합은 [2. 자동차기본정보] 탭, 카인포는 점검내역 화면을 띄워 두세요.',
        ] }],
      }]);
      return;
    }

    report('사고체크 구조 조사 완료', [{
      ok: true,
      title: '파일로 저장했습니다',
      note: r.file,
      lists: [
        { title: '읽어온 내용', cls: 'good', items: r.summary || [] },
        ...(r.failed && r.failed.length ? [{ title: '읽지 못한 창', cls: 'warn', items: r.failed }] : []),
        { title: '다음', cls: 'muted', items: ['이 파일을 보내주시면 두 사이트 사고체크 매핑을 붙입니다.'] },
      ],
    }]);
  });
})();
