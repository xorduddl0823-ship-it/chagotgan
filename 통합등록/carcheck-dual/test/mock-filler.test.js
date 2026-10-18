/*  기존 기능 검수 — 흉내 화면(모의 환경)에서 값 넣기 · 사진 알림 받기
 *  실제 카인포·카모두에 접속하지 않는다. 화면은 schema.js 의 선택자로 직접 만든다.
 *  (사고 부위·딜러·사진 업로드처럼 실제 화면 구조가 필요한 부분은 여기서 시험하지 않는다) */
const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const { ALL_FIELDS, OPT } = require('../src/schema');
const { buildPlan, buildScript } = require('../src/filler');
const photo = require('../src/photo-upload');

/** 시험용 입력값 (가짜 차) */
const DATA = {
  carNo: '12가3456', checkDate: '2026-10-18', mileage: '45210', vin: 'KMHXX00XXXX123456',
  carModel: '시험차', carYear: '2020', inspStart: '2026-01-01', inspEnd: '2027-12-31',
  recall: '2', recallDone: '2', tuning: '2', tuningLegal: '1', tuningPart: '1',
  gasCO: '0.1', bcVin: '1',
  clientName: '홍길동',            // 앱 안에서만 쓰는 칸 — 사이트로 나가면 안 됨
};

/** schema 의 선택자로 흉내 화면을 만든다 */
function mockPage(siteKey) {
  const parts = [];
  ALL_FIELDS.forEach((f) => {
    const m = f[siteKey];
    if (!m) return;
    const id = m.sel && m.sel.startsWith('#') ? m.sel.slice(1) : null;
    if (id && f.opts && OPT[f.opts]) {
      const vals = OPT[f.opts].map(([v]) => v);
      parts.push('<select id="' + id + '"><option value=""></option>' + vals.map((v) => '<option value="' + v + '">' + v + '</option>').join('') + '</select>');
    } else if (id) {
      parts.push('<input type="text" id="' + id + '">');
    } else if (m.name || m.radio) {
      const nm = m.name || m.radio;
      const vals = f.opts && OPT[f.opts] ? OPT[f.opts].map(([v]) => v) : ['1', '2'];
      vals.forEach((v) => parts.push('<label><input type="radio" name="' + nm + '" value="' + v + '">' + v + '</label>'));
    } else if (m.checkbox) {
      Object.values(m.checkbox).forEach((nm) => parts.push('<input type="checkbox" name="' + nm + '">'));
    }
  });
  if (siteKey === 'ci') parts.push('<input id="vin1"><input id="vin2"><input id="currentKm">');
  return new JSDOM('<!doctype html><body>' + parts.join('\n') + '</body>', { runScripts: 'outside-only' });
}

test('앱 안에서만 쓰는 칸(고객명)은 어느 사이트로도 나가지 않는다', () => {
  ['cm', 'ci'].forEach((site) => {
    const { plan } = buildPlan(site, DATA);
    assert.ok(!plan.some((p) => p.k === 'clientName'), site);
    assert.ok(!JSON.stringify(plan).includes('홍길동'), site);
  });
});

test('리콜 코드는 카모두로 갈 때만 뒤집힌다 (지우면 안 되는 표)', () => {
  const cm = buildPlan('cm', DATA).plan;
  const ci = buildPlan('ci', DATA).plan;
  assert.strictEqual(cm.find((p) => p.k === 'recall').value, '1');        // 통합 2(해당) → 카모두 1(해당)
  assert.strictEqual(cm.find((p) => p.k === 'recallDone').value, '1');    // 통합 2(이행) → 카모두 1(이행)
  assert.strictEqual(ci.find((p) => p.k === 'recall').value, '2');
  assert.strictEqual(ci.find((p) => p.k === 'recallDone').value, '2');
});

test('튜닝 구분은 하나만 보낸다 (구조·장치 동시 없음 — 대표님 10/18)', () => {
  const ci = buildPlan('ci', DATA).plan.filter((p) => p.k === 'tuningPart');
  assert.strictEqual(ci.length, 1);
  assert.strictEqual(ci[0].name, 'tuning_st');                             // 1 = 구조
});

test('카인포 차대번호는 앞/뒤 6자리로 나뉘고, 현재주행거리가 비면 주행거리로 맞춘다', () => {
  const ci = buildPlan('ci', DATA, { vinTail: 6 }).plan;
  assert.strictEqual(ci.find((p) => p.sel === '#vin1').value, 'KMHXX00XXXX');
  assert.strictEqual(ci.find((p) => p.sel === '#vin2').value, '123456');
  assert.strictEqual(ci.find((p) => p.k === 'currentKm').value, '45210');
});

async function runFill(site) {
  const dom = mockPage(site);
  const result = await dom.window.eval(buildScript(site, DATA, { vinTail: 6 }));
  return { dom, result };
}

test('흉내 카모두 화면에 값이 실제로 들어간다', async () => {
  const { dom, result } = await runFill('cm');
  const $ = (q) => dom.window.document.querySelector(q);
  assert.strictEqual($('#j_carNumber').value, '12가3456');
  assert.strictEqual($('#uc_mileage').value, '45210');
  assert.strictEqual($('#bc_81').value, '1', '리콜 뒤집힘');
  assert.ok(result.filled.length >= 8, '채운 칸 수: ' + result.filled.length);
  assert.ok(!result.missing.some((m) => /차량번호|주행거리/.test(m)), result.missing.join(' / '));
});

test('흉내 카인포 화면에 값이 실제로 들어간다', async () => {
  const { dom, result } = await runFill('ci');
  const d = dom.window.document;
  assert.strictEqual(d.querySelector('#carNo').value, '12가3456');
  assert.strictEqual(d.querySelector('#distance').value, '45210');
  assert.strictEqual(d.querySelector('#vin2').value, '123456');
  assert.strictEqual(d.querySelector('input[name=check_recall][value="2"]').checked, true);
  assert.strictEqual(d.querySelector('input[name=tuning_st]').checked, true);
  assert.ok(result.filled.length >= 8);
});

test('사이트가 값을 되돌리면 «채움»이 아니라 «못 넣음»으로 알린다 (조용히 실패하지 않음)', async () => {
  const dom = mockPage('cm');
  const el = dom.window.document.querySelector('#uc_mileage');
  el.addEventListener('change', () => { el.value = '0'; });   // 흉내: 사이트가 제 값으로 덮어씀
  const result = await dom.window.eval(buildScript('cm', DATA));
  assert.ok(result.missing.some((m) => /주행거리/.test(m) && /되돌렸습니다/.test(m)), result.missing.join(' / '));
});

test('없는 칸은 «못 넣음» 목록에 이름이 나온다', async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const result = await dom.window.eval(buildScript('cm', { carNo: '12가3456' }));
  assert.ok(result.missing.some((m) => /차량번호/.test(m)));
});

test('사진 올리는 동안 사이트 경고창은 막되, 내용은 버리지 않고 뒷정리 때 돌려준다', () => {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  let shown = 0;
  w.alert = () => { shown++; };
  w.eval(photo.ALERT_CATCH);
  w.alert('파일 용량이 너무 큽니다');
  w.alert('저장되었습니다');
  assert.strictEqual(shown, 0, '올리는 동안은 화면을 멈추는 경고창이 뜨지 않음');
  const r = w.eval(photo.PHOTO_RESTORE_EXPR);
  assert.deepStrictEqual(photo.restoreAlerts(r), ['파일 용량이 너무 큽니다', '저장되었습니다']);
  w.alert('뒷정리 뒤');
  assert.strictEqual(shown, 1, '뒷정리 뒤에는 원래 경고창으로 돌아감');
});

test('예전 모양(숫자만) 뒷정리 결과도 받아들인다', () => {
  assert.deepStrictEqual(photo.restoreAlerts(3), []);
  assert.deepStrictEqual(photo.restoreAlerts(null), []);
});
