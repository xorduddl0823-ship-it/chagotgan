/**
 * 전산별 «등록 흐름» 화면 설정 — 목록 칸 · 번호 칸 · 저장 주소 · 조회 주소
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸.
 *
 *  ⚠ 실제 카인포·카모두·엔트리 값은 아직 모른다(10/19 화면 사진으로 정함).
 *     그래서 REAL 은 모두 confirmed:false — 등록 흐름(register-flow)은 confirmed 가 아니면 저장을 허락하지 않는다.
 *     값을 채우고 실제 화면에서 «저장 직전까지» 확인한 뒤에만 confirmed:true 로 바꾼다.
 *
 *  MOCK 은 모의 통합 시험(test/electron)의 흉내 사이트용 — 실제 전산과 무관.
 *
 *  모양:
 *    hosts          그 전산이 쓰는 주소(host). 여기 없는 주소로 가는 쓰기 요청 = 알 수 없는 저장 경로
 *    savePatterns   저장 요청 주소 무늬 · saveGetPatterns GET 저장 무늬 · readAllow 잠긴 동안에도 보내도 되는 조회 무늬
 *    fillAllow      값 넣기 단계에서만 보내도 되는 쓰기 요청 무늬(사진 올리기 등) · saveButton 그 전산 [저장] 단추 선택자
 *    list           { rows: 목록 줄 선택자, cols: { checkNo, carNo, vin, date, status } — 칸 순서(0부터) }
 *    carmodoo       autoAssign(«자동 부여» 체크 선택자 — 체크=자동) · numberField(성능점검번호 칸)
 *    entry          loggedIn(로그인 됐을 때만 있는 것) · nextNumber · numberInput · loadButton · loaded{entryNo,carNo,vin}
 */

const REAL = {
  carinfo: {
    confirmed: false,
    hosts: ['ai.carinfo.co.kr'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    list: { rows: '#carcheckTable tbody tr', cols: null },               // 칸 순서 모름 — 10/19
  },
  carmodoo: {
    confirmed: false,
    hosts: ['ck.carmodoo.com'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    autoAssign: null,                                                    // 10/19
    numberField: '#j_assocNumber',                                       // schema.js 의 «조합 성능번호» — 같은 칸인지 10/19 확인
    list: { rows: null, cols: null },
  },
  entry: {
    confirmed: false,
    hosts: [],                                                           // 엔트리 주소 — 10/19
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    loggedIn: null, nextNumber: null, numberInput: null, loadButton: null,
    loaded: { entryNo: null, carNo: null, vin: null },
    list: { rows: null, cols: null },
  },
};

/** 모의 시험용 흉내 사이트 설정 (host 는 시험이 정함) */
function mockConfig(host) {
  const base = { confirmed: true, hosts: [host], savePatterns: ['/api/save'], saveGetPatterns: [], readAllow: ['/api/list'], fillAllow: ['/api/photo'], saveButton: '#btnSave' };
  return {
    carinfo: { ...base, list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1, vin: 2, date: 3, status: 4 } } },
    carmodoo: { ...base, autoAssign: '#autoNo', numberField: '#checkNo', list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1 } } },
    entry: { ...base, loggedIn: '#who', nextNumber: '#nextNo', numberInput: '#inNo', loadButton: '#btnLoad',
             loaded: { entryNo: '#ldNo', carNo: '#ldCar', vin: '#ldVin' },
             list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1 } } },
  };
}

module.exports = { REAL, mockConfig };
