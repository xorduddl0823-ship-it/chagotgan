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
 *    (7차) prepare      카인포 신규등록 화면 표시 { formNo: 등록 화면의 점검번호 칸, formCarNo: 등록 화면의 차량번호 칸,
 *                       createsRow: 신규등록 [확인] 때 목록 줄이 먼저 생기나(true/false/null 모름) }
 *          phaseAllow   단계별로만 통과시킬 쓰기 요청 무늬 { prepare: 신규등록 [확인] 요청 · photo: 사진 올리기 요청 }
 *          photoPhase   사진을 언제 올리나: 'beforeSave'(저장 전) · 'afterSave'(저장해 번호가 생긴 뒤) · null(아직 모름 → 사진이 있으면 멈춤)
 *          list.savedStatus  목록 «상태» 칸에서 «저장 끝»을 뜻하는 글자(정규식) — 신규등록 때 줄이 먼저 생기는 전산에서
 *                            «저장했는지 모름»을 목록으로 가릴 때만 씀. 모르면 null(사람 확인)
 *  ※ 엔트리는 «다음 번호»를 프로그램이 정하지 않는다 — 화면에 보이는 값을 읽어 카인포 번호와 같은지만 본다.
 */

const REAL = {
  carinfo: {
    confirmed: false,
    hosts: ['ai.carinfo.co.kr'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    list: { rows: '#carcheckTable tbody tr', cols: null, savedStatus: null }, // 칸 순서 모름 — 10/19
    //  신규등록 화면 칸 — 기존 신규등록 기능(carinfo-prepare.js)이 쓰는 칸과 같음(실제 화면에서 다시 확인 필요)
    //  createsRow: 신규등록 [확인] 때 목록 줄이 먼저 생기나(기존 코드 주석상 생길 수 있음 «성능이 등록되었습니다») — 모름(null)
    prepare: { formNo: '#checkNo', formCarNo: '#carNo', createsRow: null },
    phaseAllow: { prepare: [], photo: [] },                              // 신규등록 [확인]·사진 올리기 요청 주소 — 실제 화면 확인 필요
    photoPhase: null,                                                    // 사진을 저장 전에 올리나 뒤에 올리나 — 실제 화면 확인 필요
  },
  carmodoo: {
    confirmed: false,
    hosts: ['ck.carmodoo.com'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    autoAssign: null,                                                    // 10/19
    numberField: '#j_assocNumber',                                       // schema.js 의 «조합 성능번호» — 같은 칸인지 10/19 확인
    list: { rows: null, cols: null },
    phaseAllow: { photo: [] },
    photoPhase: null,                                                    // 기존 기능은 같은 접수 화면 «4 자동차사진» 탭에서 올림 — 언제 서버로 가는지 확인 필요
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
  const base = { confirmed: true, hosts: [host], savePatterns: ['/api/save'], saveGetPatterns: [], readAllow: ['/api/list'], fillAllow: [], saveButton: '#btnSave' };
  return {
    //  흉내 카인포: 신규등록 [확인] 때 목록에 «작성중» 줄과 번호가 먼저 생기고, 저장하면 «완료» · 사진은 저장 뒤
    carinfo: { ...base, list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1, vin: 2, date: 3, status: 4 }, savedStatus: '^완료$' },
               prepare: { formNo: '#formNo', formCarNo: '#carNo', createsRow: true }, phaseAllow: { prepare: ['/api/prepare'], photo: ['/api/photo'] }, photoPhase: 'afterSave' },
    //  흉내 카모두: 사진은 저장 전(같은 접수 화면)
    carmodoo: { ...base, autoAssign: '#autoNo', numberField: '#checkNo', list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1 } },
                phaseAllow: { photo: ['/api/photo'] }, photoPhase: 'beforeSave' },
    entry: { ...base, loggedIn: '#who', nextNumber: '#nextNo', numberInput: '#inNo', loadButton: '#btnLoad',
             loaded: { entryNo: '#ldNo', carNo: '#ldCar', vin: '#ldVin' },
             list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1 } } },
  };
}

module.exports = { REAL, mockConfig };
