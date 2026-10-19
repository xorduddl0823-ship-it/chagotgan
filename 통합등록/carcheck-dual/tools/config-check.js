/*  실제 전산 설정 점검표 (9차) — src/sites/site-config.js 의 REAL 을 읽어 «무엇이 비었고 무엇이 짐작인지» 표로 낸다.
 *  사람이 따로 적으면 코드와 어긋나므로, 설정 파일에서 바로 뽑는다.
 *  실행: node tools/config-check.js            → 표(마크다운)
 *        node tools/config-check.js --json     → 기계용
 *  상태(10차 — 사진과 내부 이름을 섞지 않음):
 *    비어 있음 · 짐작(확인 필요) · 사진: 글자·모양만 확인(내부 이름 미확인) · 진단: 내부 이름 확인(근거: 진단 기록 파일)
 *  «진단: 내부 이름 확인»은 진단 기록 파일로 맞춘 뒤 CONFIRMED 에 «근거»와 함께 적는다(지금은 없음). */
const { REAL } = require('../src/sites/site-config');

//  화면 사진(10/19)으로 글자·모양을 본 것 — 내부 이름(id)은 아직 진단 전
const FROM_PHOTO = new Set([
  'carinfo.saveButtonText', 'carinfo.list.cols', 'carinfo.list.savedStatus', 'carinfo.prepare.createsRow', 'carinfo.photoPhase',
  'carmodoo.saveButtonText', 'carmodoo.list.cols', 'carmodoo.photoPhase',
  'entry.saveButtonText', 'entry.quick.openText', 'entry.quick.loadText', 'entry.quick.failCloseText', 'entry.loadRetry.failText',
  'entry.detail.openText', 'entry.list.cols', 'entry.numberDigitsOnly',
]);
//  기존 프로그램 코드에서 가져온 짐작(실제 화면에서 다시 확인 필요)
const GUESSED = new Set([
  'carinfo.list.rows', 'carinfo.prepare.formNo', 'carinfo.prepare.formCarNo', 'carinfo.list.vinFromForm', 'carmodoo.numberField',
]);
//  진단 기록으로 내부 이름까지 맞춘 것 — { '전산.경로': '근거(진단 파일 이름·화면)' } (지금은 없음)
const CONFIRMED = new Map([]);
//  근거 — 사진·코드에서 온 값이 «어디서» 왔는지
const EVIDENCE = {
  'carinfo.saveButtonText': '10/19 사진 — 점검 화면 오른쪽 위 [저장]', 'carinfo.list.cols': '10/19 사진 — 목록 머리글 순서',
  'carinfo.list.savedStatus': '10/19 사진 — 저장된 차 «점검완료»', 'carinfo.prepare.createsRow': '10/19 사진 — [확인] 뒤 목록에 «점검중» 줄',
  'carinfo.photoPhase': '10/19 사진 — 점검완료 차에 사진', 'carmodoo.saveButtonText': '10/19 대표님 답 — [저장]만(접수저장 아님)',
  'carmodoo.list.cols': '10/19 사진 — 접수차량 리스트 머리글', 'carmodoo.photoPhase': '기존 프로그램 — ④ 탭에서 저장 전에 올림',
  'entry.saveButtonText': '10/19 사진 — 맨 아래 [저장]', 'entry.quick.openText': '10/19 사진 — 오른쪽 위 [간편 접수]',
  'entry.quick.loadText': '10/19 사진 — [불러오기]', 'entry.quick.failCloseText': '10/19 사진 — 실패 안내 [확인]',
  'entry.loadRetry.failText': '10/19 사진 — «성능 불러오기가 실패하였습니다»', 'entry.detail.openText': '10/19 사진 — 목록 [성능점검]',
  'entry.list.cols': '10/19 사진 — 성능점검 현황 머리글', 'entry.numberDigitsOnly': '10/19 사진 — «26-28-604413»',
  'carinfo.list.rows': '기존 프로그램 코드(src/carinfo-prepare.js · #carcheckTable)', 'carinfo.prepare.formNo': '기존 프로그램 코드(carinfo-prepare.js · #checkNo)',
  'carinfo.prepare.formCarNo': '기존 프로그램 코드(carinfo-prepare.js · #carNo)', 'carinfo.list.vinFromForm': '기존 프로그램 코드(filler.js · #vin1/#vin2)',
  'carmodoo.numberField': '기존 프로그램 코드(schema.js · #j_assocNumber «조합 성능번호»)', 'carinfo.hosts': '기존 프로그램', 'carmodoo.hosts': '기존 프로그램',
};

//  전산별로 필요한 설정 — [경로, 쉬운 이름, 어떻게 확인하나]
const NEED = {
  carinfo: [
    ['hosts', '전산 주소', '프로그램에 이미 있음'],
    ['savePatterns', '[저장] 요청 주소 무늬', '진단(요청 기록) — 실제 저장 안 함 단계 뒤'],
    ['readAllow', '저장 중에도 보내도 되는 조회 주소', '진단(요청 기록)'],
    ['saveButtonText', '[저장] 단추 글자', '진단(화면 칸 기록)'],
    ['list.rows', '목록 줄 위치', '진단(화면 칸 기록)'],
    ['list.cols', '목록 칸 순서(번호·차량번호·날짜·상태)', '진단(표 머리글·첫 줄 칸 수)'],
    ['list.savedStatus', '«저장 끝» 상태 글자', '진단(목록)'],
    ['list.vinFromForm', '줄을 눌렀을 때 차대번호 칸', '진단(화면 칸 기록)'],
    ['prepare.formNo', '등록 화면 성능번호 칸', '진단(화면 칸 기록)'],
    ['prepare.formCarNo', '등록 화면 차량번호 칸', '진단 — 목록 위 검색 칸과 다른 칸인지'],
    ['prepare.createsRow', '신규등록 때 줄이 먼저 생기나', '사진으로 확인(예)'],
    ['phaseAllow.prepare', '신규등록 [확인] 요청 주소', '진단(요청 기록)'],
    ['phaseAllow.photo', '사진 올리기 요청 주소', '진단(요청 기록)'],
    ['photoPhase', '사진을 저장 전/뒤', '사진으로 확인(저장 뒤)'],
    ['diagReadPaths', '진단 중 보내도 되는 읽기 전용 주소', '진단 기록의 «막은 GET» 검토'],
  ],
  carmodoo: [
    ['hosts', '전산 주소', '프로그램에 이미 있음'],
    ['savePatterns', '[저장] 요청 주소 무늬', '진단(요청 기록)'],
    ['readAllow', '저장 중에도 보내도 되는 조회 주소', '진단(요청 기록)'],
    ['saveButtonText', '[저장] 단추 글자([접수저장] 아님)', '진단(화면 칸 기록)'],
    ['manualInput', '«수동입력» 체크 칸', '진단(화면 칸 기록)'],
    ['numberField', '«점검번호» 칸', '진단(화면 칸 기록)'],
    ['list.rows', '접수 목록 줄 위치', '진단(화면 칸 기록)'],
    ['list.cols', '목록 칸 순서(번호·차량번호·차대번호)', '진단(표 머리글)'],
    ['phaseAllow.photo', '사진 올리기 요청 주소', '진단(요청 기록)'],
    ['photoPhase', '사진을 저장 전/뒤', '진단(④ 탭에서 올릴 때 요청이 바로 가는지)'],
    ['diagReadPaths', '진단 중 보내도 되는 읽기 전용 주소', '진단 기록 검토'],
  ],
  entry: [
    ['hosts', '전산 주소', '대표님(엔트리 주소) — 진단 창에 넣은 주소로 채움'],
    ['savePatterns', '[저장] 요청 주소 무늬', '진단(요청 기록)'],
    ['readAllow', '저장 중에도 보내도 되는 조회 주소', '진단(요청 기록)'],
    ['saveButtonText', '[저장] 단추 글자', '진단(화면 칸 기록)'],
    ['loggedIn', '로그인됐을 때만 보이는 표시(이름·아이디 자리)', '진단(화면 칸 기록)'],
    ['quick.openText', '[간편 접수] 단추 글자', '진단'],
    ['quick.numberInput', '[간편 접수] 창의 번호 칸 — 읽기만, 절대 안 고침', '진단(화면 칸 기록)'],
    ['quick.loadText', '[불러오기] 단추 글자', '진단'],
    ['quick.failCloseText', '«불러오기 실패» 안내의 [확인] 글자', '진단'],
    ['loadRetry.failText', '«성능 불러오기가 실패하였습니다» 글자', '사진으로 확인'],
    ['loadRetry.pureRead', '[불러오기]가 순수 조회인가(다시 하기 허용)', '진단(요청 기록 — 불러오기 때 쓰기 요청이 없는지)'],
    ['loaded.entryNo', '불러온 화면 성능번호 칸', '진단(화면 칸 기록)'],
    ['loaded.carNo', '불러온 화면 차량번호 칸', '진단(화면 칸 기록)'],
    ['loaded.vin', '불러온 화면 차대번호 칸', '진단(화면 칸 기록)'],
    ['list.rows', '성능점검 현황 목록 줄 위치', '진단(화면 칸 기록)'],
    ['list.cols', '목록 칸 순서(성능번호·차량번호)', '진단(표 머리글)'],
    ['detail.openText', '목록의 [성능점검](상세) 단추 글자', '진단'],
    ['detail.carNo', '상세 화면 차량번호 칸', '진단(화면 칸 기록)'],
    ['detail.vin', '상세 화면 차대번호 칸', '진단(화면 칸 기록)'],
    ['numberDigitsOnly', '번호를 숫자만 견줌(26-28-604413)', '사진으로 확인'],
    ['diagReadPaths', '진단 중 보내도 되는 읽기 전용 주소', '진단 기록 검토'],
  ],
};

function get(o, path) { return path.split('.').reduce((v, k) => (v == null ? v : v[k]), o); }
function empty(v) {
  if (v == null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every((x) => x == null || x === '');
  return false;
}
function statusOf(site, path) {
  const key = site + '.' + path;
  const v = get(REAL[site], path);
  if (CONFIRMED.has(key)) return '진단: 내부 이름 확인';
  if (path === 'hosts' && !empty(v)) return '확인(주소)';
  if (path === 'loadRetry.pureRead') return v === true ? '진단: 확인' : '확인 전(지금은 다시 하기 안 함)';
  if (empty(v) || v === false && path !== 'numberDigitsOnly') return '비어 있음';
  if (GUESSED.has(key)) return '짐작(확인 필요)';
  if (FROM_PHOTO.has(key)) return '사진: 글자·모양만 확인(내부 이름 미확인)';
  return '값 있음(확인 필요)';
}

const rows = [];
for (const site of Object.keys(NEED)) {
  for (const [path, label, how] of NEED[site]) {
    const key = site + '.' + path;
    rows.push({ site, path, label, how, status: statusOf(site, path), evidence: CONFIRMED.get(key) || EVIDENCE[key] || '—', confirmed: !!REAL[site].confirmed });
  }
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

const NAME = { carinfo: '카인포', carmodoo: '경기조합(카모두)', entry: '엔트리' };
for (const site of Object.keys(NEED)) {
  const rs = rows.filter((r) => r.site === site);
  const open = rs.filter((r) => !/^(확인|진단:)/.test(r.status)).length;
  console.log('### ' + NAME[site] + ' — 남은 항목 ' + open + ' / ' + rs.length + ' · 자동 저장 ' + (REAL[site].confirmed ? '켜짐' : '꺼짐(confirmed:false)') + '\n');
  console.log('| 설정 | 무엇 | 지금 상태 | 근거 | 확인 방법 |');
  console.log('|---|---|---|---|---|');
  rs.forEach((r) => console.log('| `' + r.path + '` | ' + r.label + ' | ' + r.status + ' | ' + r.evidence + ' | ' + r.how + ' |'));
  console.log('');
}
