/*  7차 모의 통합 시험 — 카인포 신규등록 · 사진 올리기 단계를 흐름(runAll)에 넣은 것
 *  · 신규등록은 한 작업에 한 번만(다시 하지 않음) · 단추로 미리 한 것은 이어 씀 · 다른 차 화면이면 멈춤
 *  · 사진은 전산 설정대로 저장 전/뒤 · 올린 칸 기록 → 이어 하기 때 남은 칸만 · 시기를 모르면 저장 전에 멈춤
 *  · 번호 어긋남 안내는 «실제 등록 상태 확인 → 관리자 정정 절차» 먼저(지우고 재등록이 기본 안내가 아님)
 *  실제 전산에 접속하지 않는다. 값은 모두 가짜. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createJobLog } = require('../src/core/job-log');
const { createRegisterFlow } = require('../src/core/register-flow');
const { createSaveGuard } = require('../src/core/save-guard');
const { createWorld } = require('./helpers/mock-world');

const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };
const PHOTOS = { photo1: 'C:/사진/앞.jpg', photo2: 'C:/사진/뒤.jpg', photo3: 'C:/사진/계기판.jpg' };
const NOW = () => new Date('2026-10-19T10:00:00');
const RUN = { pollMs: 5, waitMs: 60, sendWaitMs: 30 };

function setup(world) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-p7-')), 'jobs.jsonl');
  const W = createWorld(world || {});
  const mk = () => createRegisterFlow({ jobLog: createJobLog(file), adapters: W.adapters, mock: true, now: NOW });
  return { W, flow: mk(), mk, jobLog: createJobLog(file) };
}
const saves = (W) => W.world.calls.filter((c) => c.endsWith('.clickSave'));

test('신규등록: 흐름이 카인포 신규등록을 한 번 하고(목록 줄이 먼저 생기는 경우) 세 전산 같은 번호로 끝', async () => {
  const t = setup({ prepare: true, prepareCreatesRow: true, savedStatus: '^완료$' });
  const steps = [];
  const r = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, onStep: (s) => steps.push(s.step) });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.numbers, { carinfo: 'T-0101', carmodoo: 'T-0101', entry: 'T-0101' });
  assert.strictEqual(t.W.world.carinfo.prepares, 1);
  assert.strictEqual(t.W.world.carinfo.rows.length, 1, '줄이 하나만(두 번 생기지 않음)');
  assert.strictEqual(t.W.world.carinfo.rows[0].status, '완료');
  assert.ok(steps.indexOf('카인포 신규등록') >= 0 && steps.indexOf('카인포 신규등록') < steps.indexOf('저장'), '신규등록이 저장보다 먼저');
});

test('신규등록: 입력 화면 단추로 미리 했으면(번호 있는 줄 생김) 흐름은 다시 하지 않고 그 화면을 이어 씀 — 그 번호를 이번 차 번호로 확인', async () => {
  const t = setup({ prepare: true, prepareCreatesRow: true, savedStatus: '^완료$' });
  await t.W.adapters.carinfo.prepare(CAR);                                 // 사람이 [신규등록] 단추를 누른 것
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(r.numbers.carinfo, 'T-0101');
  assert.strictEqual(t.W.world.carinfo.prepares, 1, '흐름이 신규등록을 다시 하지 않음');
  assert.strictEqual(t.jobLog.get(r.jobId).meta.prepared.by, 'button');
});

test('신규등록: 카인포에 다른 차 등록 화면이 열려 있으면 시작하지 않고 멈춤(다른 차 의심) — 저장 0번', async () => {
  const t = setup({ prepare: true });
  t.W.world.carinfo.form = { open: true, carNo: '99하9999', checkNo: '' };
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /다른 차\(99하9999\)/);
  assert.match(r.action, /다른 차 등록 화면/);
  assert.deepStrictEqual(saves(t.W), []);
});

test('신규등록: 하다가 멈추면 이어 하기 때 신규등록을 다시 하지 않고 «목록에서 이 차 줄 확인»을 부탁', async () => {
  const t = setup({ prepare: true });
  t.W.world.faults.prepareCrash = true;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.step, '값 넣기');
  const r2 = await t.mk().runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, false);
  assert.ok(r2.detail.prepareLost, JSON.stringify(r2));
  assert.match(r2.action, /목록에서 이 차 줄이 새로 생겼는지/);
  assert.strictEqual(t.W.world.carinfo.prepares, 1, '신규등록은 한 번뿐');
  //  사람이 그 줄을 열어 두면(등록 화면이 이 차) 이어서 끝까지
  t.W.world.carinfo.form = { open: true, carNo: CAR.carNo, checkNo: '' };
  const r3 = await t.mk().runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r3.ok, true, JSON.stringify(r3));
  assert.strictEqual(t.W.world.carinfo.prepares, 1);
});

test('신규등록: 같은 이름 딜러가 여럿이면 멈추고, 고른 딜러로 이어 하면 끝까지', async () => {
  const t = setup({ prepare: true });
  t.W.world.faults.preparePick = true;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.ok(r.detail.prepareNeedPick && r.detail.rows.length === 2);
  assert.match(r.action, /딜러/);
  const r2 = await t.mk().runAll({ jobId: r.jobId, data: { ...CAR, ciPickKey: 'k2' } }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
});

test('사진: 카인포는 저장·번호 확인 뒤, 카모두는 저장 전에 — 설정대로 올리고 끝', async () => {
  const t = setup({ photoPhase: { carinfo: 'afterSave', carmodoo: 'beforeSave' } });
  const steps = [];
  const r = await t.flow.runAll({ ...CAR, data: { ...CAR, ...PHOTOS } }, { ...RUN, onStep: (s) => steps.push(s.siteName + ':' + s.step) });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(t.W.world.photos.carinfo, ['photo1', 'photo2', 'photo3']);
  assert.deepStrictEqual(t.W.world.photos.carmodoo, ['photo1', 'photo2', 'photo3']);
  const c = t.W.world.calls;
  assert.ok(c.indexOf('carinfo.clickSave') < c.findIndex((x) => x.startsWith('carinfo.photos')), '카인포 사진은 저장 뒤');
  assert.ok(c.findIndex((x) => x.startsWith('carmodoo.photos')) < c.indexOf('carmodoo.clickSave'), '카모두 사진은 저장 전');
  assert.ok(steps.includes('카인포:사진 올리기'));
});

test('사진: 저장 뒤 한 칸 못 올림 → 멈춤(«점검 기록은 이미 저장») → 이어 하기는 못 올린 칸만, 저장은 다시 안 함', async () => {
  const t = setup({ photoPhase: { carinfo: 'afterSave' } });
  t.W.world.faults.photoFail = 'photo3';
  const data = { ...CAR, ...PHOTOS };
  const r = await t.flow.runAll({ ...CAR, data }, RUN);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.step, '사진 올리기');
  assert.match(r.action, /못 올린 칸만/);
  assert.match(r.action, /이미 저장/);
  const r2 = await t.mk().runAll({ jobId: r.jobId, data }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
  assert.deepStrictEqual(t.W.world.photos.carinfo, ['photo1', 'photo2', 'photo3']);
  assert.ok(t.W.world.calls.includes('carinfo.photos:photo3'), '남은 칸만 다시');
  assert.deepStrictEqual(saves(t.W), ['carinfo.clickSave', 'carmodoo.clickSave', 'entry.clickSave'], '저장은 전산마다 한 번');
});

test('사진: 언제 올리는지 설정을 모르면(null) 사진이 있을 때 저장 전에 멈춤 — 사진이 없으면 그냥 진행', async () => {
  const t = setup({ photoPhase: { carinfo: null } });
  const r = await t.flow.runAll({ ...CAR, data: { ...CAR, ...PHOTOS } }, RUN);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /언제 올리는지 아직 확인되지 않아/);
  assert.deepStrictEqual(saves(t.W), []);
  const t2 = setup({ photoPhase: { carinfo: null } });
  const r2 = await t2.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
});

test('신규등록 때 줄이 먼저 생기면: «줄이 있다»만으로 저장됨 처리하지 않음 — «상태» 칸 설정이 없으면 사람 확인, «작성중»이면 불확실, «완료»여야 끝', async () => {
  //  ① «저장 끝» 상태 글자 설정이 없음 → 정상 응답이 와도 사람 확인
  const n = setup({ prepare: true, prepareCreatesRow: true });
  const r0 = await n.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r0.ok, false);
  assert.ok(r0.detail.manual, JSON.stringify(r0));
  assert.match(r0.reason, /상태 글자 설정이 아직 없습니다/);
  //  ② 저장 요청은 나갔는데 응답·저장 모두 없음 → 이어 하기: 줄은 «작성중» → 저장됨 아님
  const t = setup({ prepare: true, prepareCreatesRow: true, savedStatus: '^완료$' });
  t.W.world.faults.carinfo = 'hangNoSave';
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  t.W.world.faults.carinfo = null;
  const r2 = await t.mk().runAll({ jobId: r.jobId, data: CAR }, RUN);
  assert.strictEqual(r2.ok, false);
  assert.match(r2.reason, /아직 저장 끝 상태가 아닙니다/);
  //  ③ 저장은 됐는데 응답만 없던 경우 → 줄이 «완료» → 저장 확인, 다시 저장 없음
  const u = setup({ prepare: true, prepareCreatesRow: true, savedStatus: '^완료$' });
  u.W.world.faults.carinfo = 'hang';
  const a = await u.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(a.ok, false);
  u.W.world.faults.carinfo = null;
  const b = await u.mk().runAll({ jobId: a.jobId, data: CAR }, RUN);
  assert.strictEqual(b.ok, true, JSON.stringify(b));
  assert.deepStrictEqual(saves(u.W), ['carinfo.clickSave', 'carmodoo.clickSave', 'entry.clickSave'], '카인포 다시 저장 없음');
  //  ④ 신규등록 때 줄이 안 생긴다고 확인된 전산(false)이면 예전처럼 «새 줄»로 확인
  const v = setup({ prepare: true, prepareCreatesRow: false });
  const c = await v.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(c.ok, true, JSON.stringify(c));
});

test('엔트리 다음 번호가 다르면 «왜 다른지 확인» 안내 — 지우고 재등록을 안내하지 않고, 엔트리에는 저장 안 함', async () => {
  const t = setup();
  const r = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, onStep: (s) => { if (s.step === '엔트리 번호 규칙 확인') t.W.world.entry.next = 'T-0999'; } });
  assert.strictEqual(r.ok, false);
  assert.match(r.action, /다음 번호가 왜 다른지/);
  assert.doesNotMatch(r.action, /지우고/);
  assert.ok(!saves(t.W).includes('entry.clickSave'));
});

test('저장 통제기 «단계 문»: 사진 문은 봉인 뒤에도 사진 주소만 통과 · 저장 주소·다른 주소는 계속 막음 · 설정 없는 문은 안 열림', () => {
  const g = createSaveGuard({ siteHosts: ['ci.mock'], savePatterns: ['/save'], phaseAllow: { photo: ['/photo'], prepare: [] }, confirmed: true });
  g.registerWindow('main'); g.attachWindow('main');
  g.seal();
  const req = (id, url) => g.onRequest({ id, url, method: 'POST', kind: 'ajax' });
  assert.strictEqual(req('a', 'https://ci.mock/photo'), 'hold', '문 닫힘 → 막음');
  assert.strictEqual(g.openPhase('prepare'), false, '주소 설정이 비면 안 열림');
  assert.strictEqual(g.openPhase('photo'), true);
  assert.strictEqual(req('b', 'https://ci.mock/photo'), 'ignore', '사진 주소 통과');
  assert.strictEqual(req('c', 'https://ci.mock/save'), 'hold', '저장 주소는 막음');
  assert.strictEqual(req('d', 'https://other.example/photo'), 'hold', '다른 주소는 막음');
  g.closePhase();
  assert.strictEqual(req('e', 'https://ci.mock/photo'), 'hold');
  assert.strictEqual(g.coverage().phaseSent, 1);
  assert.deepStrictEqual(g.coverage().unknownHosts, ['other.example']);
});

test('작업 기록: 신규등록 표시(지우기 포함)·사진 칸 기록이 전산별로 합쳐짐', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-p7m-')), 'jobs.jsonl');
  const L = createJobLog(file);
  const id = L.newJob(CAR);
  L.setMeta(id, { prepared: { by: 'flow', checkNo: 'T-1' } });
  L.setMeta(id, { photos: { carinfo: ['photo1', 'bad-key'] } });
  L.setMeta(id, { photos: { carmodoo: ['photo2'] } });
  let m = createJobLog(file).get(id).meta;
  assert.deepStrictEqual(m.prepared, { by: 'flow', checkNo: 'T-1' });
  assert.deepStrictEqual(m.photos, { carinfo: ['photo1'], carmodoo: ['photo2'] });
  L.setMeta(id, { prepared: null });
  m = createJobLog(file).get(id).meta;
  assert.strictEqual(m.prepared, null);
});

test('실제 카인포 목록 모양: 번호 칸의 «재성능» 표시를 떼고 숫자만, 날짜는 앞 날짜만 읽음', () => {
  const { JSDOM } = require('./node_modules/jsdom');
  const { listExpr } = require('../src/sites/flow-adapters');
  const { REAL } = require('../src/sites/site-config');
  const td = (a) => '<tr>' + a.map((x) => '<td>' + x + '</td>').join('') + '</tr>';
  const blank = Array(16).fill('');
  const row = blank.slice(); row[0] = '1'; row[1] = '2026-10-19<br>(2027-02-15)'; row[2] = '12가3456'; row[3] = '2628600001<span>재성능</span>'; row[14] = '● 점검완료';
  const dom = new JSDOM('<table id="carcheckTable"><tbody>' + td(row) + '</tbody></table>', { runScripts: 'outside-only' });
  const out = dom.window.eval(listExpr(REAL.carinfo.list));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(out)), [{ date: '2026-10-19', carNo: '12가3456', checkNo: '2628600001', status: '● 점검완료' }]);
  //  상태 칸 앞에 초록 점(●)이 글자로 붙어 나와도 «저장 끝»으로 알아봄
  assert.ok(new RegExp(REAL.carinfo.list.savedStatus).test(out[0].status));
  assert.ok(!new RegExp(REAL.carinfo.list.savedStatus).test('점검중'));
});

test('목록에 차대번호 칸이 없을 때(실제 카인포): 이번에 생긴 이 차 줄만 눌러 차대번호를 읽어 확인 — 못 읽으면 멈춤', async () => {
  const t = setup();
  const orig = t.W.adapters.carinfo.readList;
  const opened = [];
  t.W.adapters.carinfo.readList = async (c) => (await orig(c)).map((r) => ({ ...r, vin: '' }));
  t.W.adapters.carinfo.readRowVin = async (no) => { opened.push(no); const r = t.W.world.carinfo.rows.find((x) => x.checkNo === no); return r ? r.vin : ''; };
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(opened, ['T-0101'], '이번에 생긴 줄 하나만 열어 봄');
  const u = setup();
  const o2 = u.W.adapters.carinfo.readList;
  u.W.adapters.carinfo.readList = async (c) => (await o2(c)).map((x) => ({ ...x, vin: '' }));
  u.W.adapters.carinfo.readRowVin = async () => '';
  const r2 = await u.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r2.ok, false);
  assert.match(r2.reason, /차대번호를 읽지 못해/);
});

test('카모두 번호 칸(10/19 실제 화면): «수동입력» 체크를 켜야 칸이 열리고 카인포 번호가 들어감 — 이미 켜져 있으면 끄지 않음', () => {
  const { JSDOM } = require('./node_modules/jsdom');
  const { carmodooNumberExpr, carmodooReadExpr } = require('../src/sites/flow-adapters');
  const cfg = { manualInput: '#manual', numberField: '#no' };
  const html = (on) => '<input id="no" value="자동입력" disabled><input type="checkbox" id="manual"' + (on ? ' checked' : '') + '>';
  for (const on of [false, true]) {
    const dom = new JSDOM(html(on), { runScripts: 'outside-only' });
    //  실제 화면처럼: 체크를 켜면 칸이 열림
    dom.window.eval('document.getElementById("manual").addEventListener("click",function(){var n=document.getElementById("no");n.disabled=!this.checked;if(this.checked)n.value="";})');
    assert.deepStrictEqual(dom.window.eval(carmodooReadExpr(cfg)).auto, !on, '읽기만 하면 바꾸지 않음');
    const r = dom.window.eval(carmodooNumberExpr(cfg, '2628604413'));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(r)), { auto: false, no: '2628604413' });
    assert.strictEqual(dom.window.document.getElementById('manual').checked, true);
  }
});

test('엔트리 목록 모양(10/19 실제 화면): 앞을 가린 차량번호 «****5528»은 뒷자리로만 맞춰 보고, 번호 «26-28-604413»은 숫자만 견줌', () => {
  const nc = require('../src/core/number-check');
  assert.strictEqual(nc.sameCar('****5528', '111두5528'), true);
  assert.strictEqual(nc.sameCar('***8900', '65도8900'), true);
  assert.strictEqual(nc.sameCar('****5529', '111두5528'), false);
  assert.strictEqual(nc.sameCar('**28', '111두5528'), false, '보이는 자리가 너무 짧으면 같다고 보지 않음');
  assert.strictEqual(nc.sameCar('12가3456', '12가3456'), true);
  //  저장 뒤: 가린 번호 줄 둘 중 이번에 새로 생긴 줄 하나 → 번호 같음
  const car = { carNo: '111두5528', vin: 'KMHXX00XXXX123456' };
  const rows = [{ checkNo: '2628604413', carNo: '****5528' }, { checkNo: '2628600001', carNo: '****5528' }];
  const r = nc.findNewSavedRow(rows, car, new Set(['2628600001']), '엔트리 목록');
  assert.deepStrictEqual(r, { ok: true, checkNo: '2628604413' });
  //  엔트리 번호 숫자만 → 카인포 번호와 같음
  assert.strictEqual(nc.checkCarmodooAfterSave({ carinfoNo: '2628604413', savedNo: '26-28-604413'.replace(/[^0-9]+/g, '') }).ok, true);
});

test('엔트리 [간편 접수] 번호 칸(대표님 10/19 결정): 프로그램은 번호 칸을 고치지 않음 — 엔트리가 매긴 다음 번호가 이 차 카인포 번호와 다르면 멈춤, 엔트리 저장 0번', async () => {
  const t = setup();
  const r = await t.flow.runAll({ ...CAR, data: CAR }, { ...RUN, onStep: (s) => { if (s.step === '엔트리 번호 규칙 확인') t.W.world.entry.next = 'T-0999'; } });
  assert.strictEqual(r.ok, false);
  assert.ok(r.detail.mismatch);
  assert.ok(!t.W.world.calls.includes('entry.clickSave'));
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src/sites/flow-adapters.js'), 'utf8');
  assert.ok(!/numberInput\)/.test(src), '엔트리 번호 칸에 값을 넣는 코드가 없어야 함');
});

test('엔트리 [저장] 단추가 꺼져 있으면(이미 등록된 번호) 누르지 않고 «이미 등록됨 의심»으로 멈춤', async () => {
  const t = setup();
  t.W.adapters.entry.saveEnabled = async () => false;
  const r = await t.flow.runAll({ ...CAR, data: CAR }, RUN);
  assert.strictEqual(r.ok, false);
  assert.ok(r.detail.alreadyThere, JSON.stringify(r));
  assert.match(r.action, /이미 등록됐는지/);
  assert.ok(!t.W.world.calls.includes('entry.clickSave'));
  const u = setup();
  u.W.adapters.entry.saveEnabled = async () => true;
  assert.strictEqual((await u.flow.runAll({ ...CAR, data: CAR }, RUN)).ok, true);
});

test('[저장] 단추는 글자가 정확히 «저장»인 것만 — [접수저장]·[성능점검기록부 전송]은 누르지 않음 · 꺼져 있으면 안 누름 · 둘 이상이면 안 누름', () => {
  const { JSDOM } = require('./node_modules/jsdom');
  const { saveButtonExpr } = require('../src/sites/flow-adapters');
  const cfg = { saveButtonText: '저장' };
  const run = (html, press) => {
    const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval('window.__hit=[];document.querySelectorAll("button").forEach(function(b){b.getClientRects=function(){return [1];};b.addEventListener("click",function(){window.__hit.push(b.textContent.trim());});})');
    const r = dom.window.eval(saveButtonExpr(cfg, press));
    return { r, hit: Array.from(dom.window.__hit) };
  };
  assert.deepStrictEqual(run('<button>접수저장</button><button> 저장 </button>', true), { r: true, hit: ['저장'] });
  assert.deepStrictEqual(run('<button>성능점검기록부 전송</button><button>성능점검기록부 출력</button><button disabled>저장</button>', true), { r: null, hit: [] });
  assert.deepStrictEqual(run('<button disabled>저장</button>', false), { r: false, hit: [] });
  assert.deepStrictEqual(run('<button>저장</button><button>저장</button>', true), { r: null, hit: [] });
});
