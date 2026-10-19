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
 *    (8차 보완) diagReadPaths  진단 중에도 내보내도 되는 «읽기 전용으로 확인된» GET 경로 무늬(정규식). 비어 있으면 화면·조회 GET 은 모두 막힘.
 *                   진단 기록에 남은 «막은 GET» 경로를 보고 읽기 전용임을 확인한 것만 더한다(지금은 모두 비어 있음 — 확인 전)
 *  ※ 엔트리는 «다음 번호»를 프로그램이 정하지 않는다 — 화면에 보이는 값을 읽어 카인포 번호와 같은지만 본다.
 */

const REAL = {
  carinfo: {
    confirmed: false,
    hosts: ['ai.carinfo.co.kr'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    diagReadPaths: [],                                                   // 진단 중 내보내도 되는 «읽기 전용 확인» GET 경로 — 확인 전이라 비움
    diagAllowStatic: false,                                              // 진단 중 그림·코드 파일 GET — 기본 차단(9차)
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
    //  점검 내용 화면 오른쪽 위 [변경처리] · [저장] · [취소] — 글자가 정확히 «저장»인 단추(10/19 화면 사진)
    saveButtonText: '저장',
    //  사진을 [저장] 전에 올리나 뒤에 올리나 — 아직 모름(12차 보완 검수: 확인 전에는 어느 순서도 정하지 않음).
    //   10/19 사진(«점검완료» 차에 사진이 있음)은 순서의 근거가 못 된다. 실제 등록 관찰 기록의 시간 순서로 확인한 뒤에만 채운다.
    //   비어 있으면(null) 사진이 있는 차는 저장 단계로 가지 않고 멈춘다(register-flow).
    //   사진 창의 [전체삭제]·칸별 ✕ 는 프로그램이 누르지 않음(사진 올리기 코드에 지우기 없음)
    photoPhase: null,
  },
  carmodoo: {
    confirmed: false,
    hosts: ['ck.carmodoo.com'],
    savePatterns: [], saveGetPatterns: [], readAllow: [], fillAllow: [], saveButton: null,
    diagReadPaths: [],                                                   // 진단 중 내보내도 되는 «읽기 전용 확인» GET 경로 — 확인 전이라 비움
    diagAllowStatic: false,                                              // 진단 중 그림·코드 파일 GET — 기본 차단(9차)
    //  10/19 대표님 화면 사진(접수등록 «① 신청인 및 접수정보» 탭): «점검번호» 칸 = 기본 «자동입력»(잠김) + 옆 «수동입력» 체크.
    //   «수동입력»을 «켜야» 칸이 열려(«숫자만 입력») 카인포 번호를 넣을 수 있음 — «자동 부여»를 «끄는» 모양이 아님(대표님 지적)
    //   → manualInput(켜야 하는 체크) 을 씀. 두 칸의 선택자(id)는 사진으로 알 수 없어 아직 비움
    manualInput: null,
    autoAssign: null,
    numberField: '#j_assocNumber',                                       // schema.js 의 «조합 성능번호» — «점검번호» 칸과 같은지 확인 필요
    //  화면 오른쪽 위에 [접수저장]과 [저장] 두 단추 — 대표님 10/19: «[저장]만 누르면 돼» → 글자가 정확히 «저장»인 단추만(접수저장 안 누름)
    saveButtonText: '저장',
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
    diagReadPaths: [],                                                   // 진단 중 내보내도 되는 «읽기 전용 확인» GET 경로 — 확인 전이라 비움
    diagAllowStatic: false,                                              // 진단 중 그림·코드 파일 GET — 기본 차단(9차)
    //  10/19 대표님 화면 사진(«성능점검 현황»):
    //   · 로그인할 때마다 문자 «본인확인»(인증번호, 3분) · 한동안 안 쓰면 끊겨 다시 로그인+문자 — 사람이 함(프로그램은 우회·연장 안 함)
    //   · 로그인되면 오른쪽 위에 이름(아이디) 표시 → loggedIn 은 그 자리(선택자는 사진으로 알 수 없어 비움)
    //   · 목록 칸: 성능번호(«26-28-604413» 줄표 모양) · 차량번호(«****5528» 앞을 가림) · 차량명 · 성능(«완료») · 결제방식 · 성능점검료 · 보험료 ·
    //     표시보험료 · 주행거리 · 사진(«2/2») · 이름 · 매매/상사 · 접수일 · 만료일 · [성능점검] · [성능기록부] · [보험사]
    //   · 오른쪽 위 [간편 접수] · [성능점검 접수] — «다음 번호»·불러오기는 [성능점검 접수] 안쪽으로 보임(사진 필요)
    numberDigitsOnly: true,                                              // 번호는 숫자만 견줌(줄표 뗌)
    //  10/19 화면 사진([간편 접수]): «불러올 성능번호를 입력해 주세요» 창에 다음 번호(카인포 마지막 번호 + 1, 예 26-28-604414)가 미리 들어가 있고
    //   [불러오기] → «자동차성능·상태점검» 화면에 카인포 기록이 채워짐. 없는 번호면 «성능 불러오기가 실패하였습니다»
    //   번호 칸은 고쳐 쓸 수 있지만 «프로그램은 절대 고치지 않음»(대표님 10/19 결정 — 카인포 번호는 순서대로 매겨져 잘못 넣으면 엔트리 번호가 꼬임)
    //   → 엔트리가 매긴 번호가 이 차 카인포 번호와 같을 때만 불러오고, 다르면 멈춤. (그래서 numberInput 은 쓰지 않음)
    //  pureRead: 불러오기가 저장·신규등록을 만들지 않는 «순수 조회»임을 진단 기능으로 확인했을 때만 true → 그때만 최대 3번 다시 불러옴
    loadRetry: { times: 3, waitMs: 3000, failText: '성능 불러오기가 실패하였습니다', failClose: null, pureRead: false },
    //  (8차) 저장 뒤 상세 기록 확인 — 목록의 [성능점검] 단추로 열리는 화면의 차량번호·차대번호 칸(선택자는 진단 때)
    detail: { openText: '성능점검', carNo: null, vin: null },
    loggedIn: null, nextNumber: null, numberInput: null, loadButton: null,
    //  (8차 보완) [간편 접수] 흐름 — 단추 글자는 화면 사진으로 확인(간편 접수 · 불러오기 · 확인), 번호 칸 선택자(numberInput)는 진단 뒤에.
    //   numberInput 이 비어 있으면 이 흐름은 꺼져 있음(엔트리 연결 미구현으로 표시)
    quick: { openText: '간편 접수', numberInput: null, loadText: '불러오기', failCloseText: '확인' },
    loaded: { entryNo: null, carNo: null, vin: null },
    //  10/19 화면 사진(불러오기 성공 뒤 «자동차성능·상태점검»): 차량번호·차대번호 17자리가 가리지 않고 보임 · 점검 내용·사진(«2/2»)도 카인포에서 채워짐
    //   맨 아래 [성능점검기록부 전송] · [성능점검기록부 출력] · [저장] — [저장]은 새 기록일 때 빨갛게 켜지고, 이미 등록된 것은 꺼져 있음
    //   → [저장]이 꺼져 있으면 «이미 등록됨 의심»으로 멈춤(saveEnabled)
    //   대표님 10/19: [성능점검기록부 전송]은 안 눌러도 됨 · 특기사항 등도 카인포에서 다 불러옴 → 엔트리는 불러오기 + [저장]만
    saveButtonText: '저장',
    //  표가 아닌 칸 모양일 수 있어 줄 선택자는 비움 · 칸 순서만 적어 둠(성능번호 0 · 차량번호 1 · 성능 3 · 접수일 12)
    list: { rows: null, cols: { checkNo: 0, carNo: 1, status: 3, date: 12 } },
  },
};

/** 모의 시험용 흉내 사이트 설정 (host 는 시험이 정함) */
function mockConfig(host, opt = {}) {
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
             list: { rows: '#list tbody tr', cols: { checkNo: 0, carNo: 1 } },
             detail: { openText: '성능점검', carNo: '#dtCar', vin: '#dtVin' },
             //  (8차 보완) 실제 엔트리 모양 흉내(/entry2) — [간편 접수] → 미리 들어간 번호 → [불러오기] → [저장](글자로 찾음)
             ...(opt.entryQuick ? {
               saveButton: null, saveButtonText: '저장', loggedIn: '#whoName', nextNumber: null, loadButton: null,
               quick: { openText: '간편 접수', numberInput: '#quickNo', loadText: '불러오기', failCloseText: '확인' },
               loaded: { entryNo: '#fNo', carNo: '#fCar', vin: '#fVin' },
               detail: { openText: '성능점검', carNo: '#dCar', vin: '#dVin' },
               loadRetry: { times: 3, waitMs: 400, failText: '성능 불러오기가 실패하였습니다', pureRead: true },
             } : {}) },
  };
}

module.exports = { REAL, mockConfig };
