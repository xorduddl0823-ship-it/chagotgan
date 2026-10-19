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
    //  10/19 대표님 화면 사진: 목록 칸 = # · 점검일자(성능만료일자) · 차량번호 · 성능점검번호(«재성능» 표시가 붙기도 함) · 카히스토리 · 차량명 ·
    //   주행거리 · 점검원 · 매매상사 · 고객명 · 보증구분 · 점검비 · 보험료 · 합계금액 · 점검상태(저장된 차 «점검완료») · 특약
    //   목록에 차대번호 칸이 없음 → 이번에 생긴 줄을 눌러 위쪽 차량정보의 차대번호를 읽음(vinFromForm)
    //   ⚠ «#» 칸이 td 인지(칸 번호가 하나씩 밀리는지)와 상태 글자는 저장 직전 확인 때 한 번 더 봄
    list: { rows: '#carcheckTable tbody tr', cols: { date: 1, carNo: 2, checkNo: 3, status: 14 },
            pick: { checkNo: '\\d{6,}', date: '\\d{4}-\\d{2}-\\d{2}' }, savedStatus: '점검완료$',     // 앞에 초록 점(●)이 글자로 붙어 나올 수 있어 앞은 묶지 않음
            vinFromForm: { formNo: '#checkNo', vin: ['#vin1', '#vin2'] } },
    //  신규등록 화면 칸 — 기존 신규등록 기능(carinfo-prepare.js)이 쓰는 칸과 같음(실제 화면에서 다시 확인 필요)
    //  10/19 대표님 화면 사진(신규등록 [확인] 바로 뒤): «성능이 등록되었습니다» 안내 + 목록에 그 차 줄이 바로 생김
    //   그 줄은 성능점검번호 «빈칸» · 점검상태 «점검중», 위 «성능번호» 칸은 «차량번호 조회후 자동발급됩니다»(아직 번호 없음)
    //   → 번호는 [저장]해야 생김(대표님 10/18 말씀과 같음) · 줄은 먼저 생김(createsRow true) → 저장 확인은 «점검완료» 상태로만
    //   같은 차의 예전 «점검중(반환)» 줄(번호 없음)이 여럿 남아 있을 수 있음 — 번호 없는 줄은 새 번호 후보가 아님
    prepare: { formNo: '#checkNo', formCarNo: '#carNo', createsRow: true },
    phaseAllow: { prepare: [], photo: [] },                              // 신규등록 [확인]·사진 올리기 요청 주소 — 실제 화면 확인 필요
    //  10/19 화면 사진: «점검완료»된 차에서 [차량사진] → 사진 창(사진 보기 창)에 올라가 있음 → 저장 뒤에 올림
    //   사진 창의 [전체삭제]·칸별 ✕ 는 프로그램이 누르지 않음(사진 올리기 코드에 지우기 없음)
    photoPhase: 'afterSave',
  },
  carmodoo: {
    confirmed: false,
    hosts: ['ck.carmodoo.com'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    //  10/19 대표님 화면 사진(접수등록 «① 신청인 및 접수정보» 탭): «점검번호» 칸 = 기본 «자동입력»(잠김) + 옆 «수동입력» 체크.
    //   «수동입력»을 «켜야» 칸이 열려(«숫자만 입력») 카인포 번호를 넣을 수 있음 — «자동 부여»를 «끄는» 모양이 아님(대표님 지적)
    //   → manualInput(켜야 하는 체크) 을 씀. 두 칸의 선택자(id)는 사진으로 알 수 없어 아직 비움
    manualInput: null,
    autoAssign: null,
    numberField: '#j_assocNumber',                                       // schema.js 의 «조합 성능번호» — «점검번호» 칸과 같은지 확인 필요
    //  ⚠ 화면 오른쪽 위에 [접수저장]과 [저장] 두 단추가 있음 — 어느 쪽을 누르는지 대표님 확인 필요(saveButton 비움)
    //  10/19 화면 사진(접수차량 리스트): 칸 = 체크 · 성능번호 · 접수일 · 검사일 · 차량번호 · 차대번호(17자리 다 보임) · 차명 · 회사명 · 신청인 · … · 맨 끝 ✕(지우기 — 누르지 않음)
    //   줄 선택자는 사진으로 알 수 없어 아직 비움
    list: { rows: null, cols: { checkNo: 1, date: 3, carNo: 4, vin: 5 } },
    phaseAllow: { photo: [] },
    //  같은 접수 화면 «④ 자동차사진» 탭에서 올림(기존 기능) → 저장 전. 사진이 그때 서버로 가는지는 진단 때 확인
    photoPhase: 'beforeSave',
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
