/**
 * 통합 성능점검 스키마 (단일 진실 원천)
 * ------------------------------------------------------------------
 * 이 파일 하나가 (1) 입력 화면 생성 (2) 두 사이트 전송 매핑 을 모두 담당한다.
 * 사이트가 개편되면 여기 선택자(sel/name)만 고치면 된다.
 *
 *  cm = ck.carmodoo.com  (경기자동차매매사업조합)  - select/input 을 #id 로 지정
 *  ci = ai.carinfo.co.kr (한국자동차공정정보협회) - radio 는 name, 그 외 #id
 *
 *  vmap : 통합값 -> 사이트값 변환표 (생략하면 그대로 사용)
 */

const OPT = {
  goodBad:    [['1', '양호'], ['2', '불량']],
  leakOil:    [['1', '없음'], ['2', '미세누유'], ['3', '누유']],
  leakWater:  [['1', '없음'], ['2', '미세누수'], ['3', '누수']],
  qty:        [['1', '적정'], ['2', '부족']],
  qty3:       [['1', '적정'], ['2', '부족'], ['3', '과다']],
  noneYes:    [['1', '없음'], ['2', '있음']],
  mileage:    [['1', '많음'], ['2', '보통'], ['3', '적음']],
  vinState:   [['1', '양호'], ['2', '부식'], ['3', '훼손(오손)'], ['4', '상이'], ['5', '변조(변타)'], ['6', '도말']],
  gearbox:    [['1', '자동'], ['2', '수동'], ['3', '세미오토'], ['4', '무단변속기'], ['5', '기타']],
  fuel:       [['1', '가솔린'], ['2', '디젤'], ['3', 'LPG'], ['4', '하이브리드'], ['6', '전기'], ['7', '수소전기'], ['5', '기타']],
  tuningLegal:[['1', '적법'], ['2', '불법']],
  tuningPart: [['1', '구조'], ['2', '장치']],
  specialOpt: [['1', '침수'], ['2', '화재']],
  useOpt:     [['1', '렌트'], ['3', '영업용']],
  colorType:  [['1', '무채색'], ['2', '유채색']],
  colorWork:  [['1', '전체도색'], ['2', '색상변경']],
  optionOpt:  [['1', '썬루프'], ['2', '네비게이션'], ['3', '기타']],
  recall:     [['1', '해당없음'], ['2', '해당']],
  recallDone: [['1', '미이행'], ['2', '이행']],
  warranty:   [['1', '자가보증'], ['2', '책임보험']],
  importGbn:  [['1', '국산'], ['2', '외산']],
  tradeType:  [['0', '사업자 거래'], ['1', '개인간 거래']],
};

/* 리콜 항목은 두 사이트의 코드값이 정반대다. 통합값은 carinfo 기준으로 두고
   carmodoo 전송 시 뒤집는다. 절대 지우지 말 것. */
const RECALL_TO_CM      = { '1': '2', '2': '1' }; // 통합 1해당없음/2해당 -> cm 1해당/2해당없음
const RECALL_DONE_TO_CM = { '1': '2', '2': '1' }; // 통합 1미이행/2이행   -> cm 1이행/2미이행

const S = (o) => o; // 가독성용

/* ── 교환·판금 등 이상부위 ───────────────────────────────────────────
 *  화면의 라벨 글자로 체크박스를 찾는다. 번호(no)와 이름(name)이 모두 맞아야
 *  잡히므로 "11.인사이드패널" 이 "1.후드" 로 오인되지 않는다.
 *  sub 는 필러패널의 A/B/C 처럼 본 항목 뒤에 붙는 하위 체크박스를 가리킨다.
 */
const PART = (no, name, rank) =>
  S({
    k: 'pt' + no,
    label: no + '. ' + name,
    type: 'part',
    hint: rank,
    cm: { part: { no: no, name: name } },
    ci: { part: { no: no, name: name } },
  });

const PILLAR = (sub) =>
  S({
    k: 'pt14' + sub,
    label: '14. 필러패널 ' + sub,
    type: 'part',
    hint: '주요골격 B랭크',
    cm: { part: { no: 14, name: '필러패널', sub: sub } },
    ci: { part: { no: 14, name: '필러패널', sub: sub } },
  });

/* ── 자동차 사진 ─────────────────────────────────────────────────────
 *  두 사이트 모두 성능점검기록부에 사진을 붙여야 한다.
 *  앱에서는 파일을 골라 두기만 하고(값은 그 파일의 전체 경로),
 *  실제 올리는 방법은 사이트마다 다르므로 cm/ci 매핑은 뒤에 붙인다.
 *
 *  1 전면 · 2 후면 · 3 계기판 은 자리가 정해져 있고, 4~8 은 기타다.
 */
const PHOTO = (no, label, hint) =>
  S({ k: 'photo' + no, label: no + '. ' + label, type: 'photo', hint: hint });

const PHOTOS = [
  PHOTO(1, '전면사진', '차량 앞모습'),
  PHOTO(2, '후면사진', '차량 뒷모습'),
  PHOTO(3, '계기판사진', '주행거리가 보이게'),
  PHOTO(4, '기타'),
  PHOTO(5, '기타'),
  PHOTO(6, '기타'),
  PHOTO(7, '기타'),
  PHOTO(8, '기타'),
];

const PARTS = [
  PART(1, '후드', '외판 1랭크'),
  PART(2, '프론트펜더', '외판 1랭크'),
  PART(3, '도어', '외판 1랭크'),
  PART(4, '트렁크리드', '외판 1랭크'),
  PART(5, '라디에이터서포트', '외판 1랭크'),

  PART(6, '쿼터패널', '외판 2랭크'),
  PART(7, '루프패널', '외판 2랭크'),
  PART(8, '사이드실패널', '외판 2랭크'),

  PART(9, '프론트패널', '주요골격 A랭크'),
  PART(10, '크로스멤버', '주요골격 A랭크'),
  PART(11, '인사이드패널', '주요골격 A랭크'),
  PART(17, '트렁크플로어', '주요골격 A랭크'),
  PART(18, '리어패널', '주요골격 A랭크'),

  PART(12, '사이드멤버', '주요골격 B랭크'),
  PART(13, '휠하우스', '주요골격 B랭크'),
  PART(14, '필러패널', '주요골격 B랭크'),
  PILLAR('A'),
  PILLAR('B'),
  PILLAR('C'),
  PART(19, '패키지트레이', '주요골격 B랭크'),

  PART(15, '대쉬패널', '주요골격 C랭크'),
  PART(16, '플로어패널', '주요골격 C랭크'),
];

const GROUPS = [
  {
    /* 점검원이 실제로 타이핑하는 곳은 여기 하나다.
       차량번호와 딜러명만 넣고 [신규등록 + 차량정보·차대번호 가져오기] 를 누르면
       나머지 차량정보는 조회로 채워진다. */
    title: '1. 조회 입력',
    hint: '이 두 가지만 입력하면 나머지 차량정보는 조회로 채워집니다.',
    fields: [
      S({ k: 'carNo',      label: '차량번호', type: 'text', req: true,
          cm: { sel: '#j_carNumber' }, ci: { sel: '#carNo' } }),
      /*  경기조합은 딜러를 "골라야" 한다.
       *  #j_dealerName 은 사이트가 채워 주는 결과칸이라 글자만 넣으면 화면에는 보여도
       *  딜러·상사 번호가 비어 「상사가 선택되지 않았습니다」 가 뜬다.
       *  그래서 여기서는 매핑하지 않고, 앱이 찾는 칸(#jDNo)에 넣고 엔터 -> 목록에서
       *  고르는 과정을 따로 밟는다 (src/carmodoo-dealer.js). */
      S({ k: 'dealerName', label: '딜러명',   type: 'text', req: true,
          hint: '상사명·연락처로도 검색됩니다',
          ci: { sel: '#deName' } }),
      S({ k: 'tradeType',  label: '거래유형', type: 'select', opts: 'tradeType', local: true,
          hint: '개인간 거래일 때만 바꾸세요' }),
      S({ k: 'clientName', label: '고객명',   type: 'text', local: true,
          hint: '개인간 거래일 때만', dep: { k: 'tradeType', v: '1' } }),
    ],
  },
  {
    title: '2. 기본정보',
    fields: [
      S({ k: 'checkDate',   label: '점검일',        type: 'date',   req: true,  cm: { sel: '#uc_regDate' },     ci: { sel: '#checkDate' } }),
      S({ k: 'receptDate',  label: '접수일',        type: 'date',                                              ci: { sel: '#receptDate' } }),
      S({ k: 'assocNo',     label: '조합 성능번호', type: 'text',   hint: '8~10자리 숫자 (carmodoo 전용)', cm: { sel: '#j_assocNumber' } }),
      S({ k: 'carModel', auto: true,    label: '차명',          type: 'text',   req: true,  cm: { sel: '#j_model' },        ci: { sel: '#carModel' } }),
      S({ k: 'carYear', auto: true,     label: '연식',          type: 'text',   req: true,  cm: { sel: '#j_year' },         ci: { sel: '#carYear' } }),
      S({ k: 'carModel2', auto: true,   label: '세부모델',      type: 'text',               cm: { sel: '#j_series' },       ci: { sel: '#carModel2' } }),
      S({ k: 'firstDate', auto: true,   label: '최초등록일',    type: 'date',               cm: { sel: '#uc_firstDate' },   ci: { sel: '#firstDate' } }),
      S({ k: 'inspStart', auto: true,   label: '검사유효기간 시작', type: 'date', req: true, cm: { sel: '#uc_checkSDate' },  ci: { sel: '#inspectionDate1' } }),
      S({ k: 'inspEnd', auto: true,     label: '검사유효기간 종료', type: 'date', req: true, cm: { sel: '#uc_checkEDate' },  ci: { sel: '#inspectionDate2' } }),
      S({ k: 'vin', auto: true,         label: '차대번호',      type: 'text',   req: true,  cm: { sel: '#j_viNumber' },     ci: { sel: '#vin1', split: 'vin' } }),
      S({ k: 'gearbox', auto: true,     label: '변속기',        type: 'select', opts: 'gearbox', cm: { sel: '#uc_gearbox' }, ci: { sel: '#gearboxCd' } }),
      S({ k: 'fuel', auto: true,        label: '사용연료',      type: 'select', opts: 'fuel',    cm: { sel: '#uc_fuel' },    ci: { sel: '#fuelCd' } }),
      S({ k: 'motorForm', auto: true,   label: '원동기형식',    type: 'text',               cm: { sel: '#j_engineForm' },   ci: { sel: '#motorform' } }),
      S({ k: 'engineSize', auto: true,  label: '배기량(cc)',    type: 'text',               cm: { sel: '#j_displacement' }, ci: { sel: '#enginesize' } }),
      S({ k: 'seatNum', auto: true,     label: '승차정원',      type: 'text',               cm: { sel: '#j_seatNum' } }),
      S({ k: 'mileage',     label: '주행거리(km)',  type: 'text',   req: true,  cm: { sel: '#uc_mileage' },     ci: { sel: '#distance' } }),
      S({ k: 'currentKm', auto: true,   label: '현재주행거리(km)', type: 'text',                                            ci: { sel: '#currentKm' } }),
      S({ k: 'importGbn', auto: true,   label: '차종구분',      type: 'select', opts: 'importGbn',                          ci: { sel: '#importGbn' } }),
    ],
  },
  {
    title: '3. 거래·보증 정보',
    fields: [
      /*  매매상사·연락처도 경기조합에서는 사이트가 채워 주는 칸이다.
       *  글자만 넣으면 화면에는 보여도 상사번호가 비어 저장할 때 막힌다.
       *  대신 사원선택에서 "딜러명·매매상사·연락처가 모두 맞는 사람" 을 고르는 데 쓴다. */
      S({ k: 'sangsaName', auto: true, label: '매매상사',   type: 'text', ci: { sel: '#dcName' } }),
      S({ k: 'dealerHp', auto: true,   label: '연락처',     type: 'text', ci: { sel: '#deHpNo' } }),
      S({ k: 'warranty',   label: '보증구분',   type: 'select', opts: 'warranty',
          cm: { sel: '#uc_warranty', vmap: { '1': '1', '2': '2' } }, ci: { name: 'warranty_type' } }),
      S({ k: 'checkAmt',   label: '점검비(원)', type: 'text', cm: { sel: '#j_price' },  ci: { sel: '#checkAmt' } }),
      S({ k: 'insurAmt',   label: '보험료(원)', type: 'text', cm: { sel: '#j_insuPrice' }, ci: { sel: '#insurAmt' } }),
    ],
  },
  {
    title: '4. 종합상태',
    fields: [
      S({ k: 'bcMileage',  label: '주행거리 상태',   type: 'select', opts: 'mileage',   cm: { sel: '#bc_12' } }),
      S({ k: 'bcMeter',    label: '계기상태',        type: 'select', opts: 'goodBad',   cm: { sel: '#bc_11' }, ci: { name: 'panel_status' } }),
      S({ k: 'bcVin',      label: '차대번호 표기',   type: 'select', opts: 'vinState',  cm: { sel: '#bc_2' },  ci: { name: 'vin_status' } }),
      S({ k: 'gasCO',      label: '배출가스 CO(%)',  type: 'text',   cm: { sel: '#uc_gasCO' },    ci: { sel: '#gas_co' } }),
      S({ k: 'gasHC',      label: '배출가스 HC(ppm)',type: 'text',   cm: { sel: '#uc_gasHC' },    ci: { sel: '#gas_hc' } }),
      S({ k: 'gasSmoke',   label: '매연(%)',         type: 'text',   cm: { sel: '#uc_gasSmoke' }, ci: { sel: '#gas_smoke' } }),
      S({ k: 'tuning',     label: '튜닝',            type: 'select', opts: 'noneYes',     cm: { sel: '#bc_3' },  ci: { name: 'tuning' } }),
      S({ k: 'tuningLegal',label: '튜닝 적법여부',   type: 'select', opts: 'tuningLegal', cm: { sel: '#bc_31' }, ci: { name: 'tuning_legal' }, dep: { k: 'tuning', v: '2' } }),
      S({ k: 'tuningPart', label: '튜닝 구분',       type: 'select', opts: 'tuningPart',  cm: { sel: '#bc_32' }, ci: { checkbox: { '1': 'tuning_st', '2': 'tuning_de' } }, dep: { k: 'tuning', v: '2' } }),
      S({ k: 'special',    label: '특별이력',        type: 'select', opts: 'noneYes',     cm: { sel: '#bc_4' },  ci: { name: 'special' } }),
      S({ k: 'specialOpt', label: '특별이력 구분',   type: 'select', opts: 'specialOpt',  cm: { sel: '#bc_41' }, dep: { k: 'special', v: '2' } }),
      S({ k: 'useChange',  label: '용도변경',        type: 'select', opts: 'noneYes',     cm: { sel: '#bc_5' },  ci: { name: 'use_change' } }),
      S({ k: 'useOpt',     label: '용도변경 구분',   type: 'select', opts: 'useOpt',      cm: { sel: '#bc_51' }, dep: { k: 'useChange', v: '2' } }),
      S({ k: 'colorType',  label: '색상',            type: 'select', opts: 'colorType',   cm: { sel: '#bc_61' } }),
      S({ k: 'colorWork',  label: '도색 이력',       type: 'select', opts: 'colorWork',   cm: { sel: '#bc_62' } }),
      S({ k: 'optionYn',   label: '주요옵션',        type: 'select', opts: 'noneYes',     cm: { sel: '#bc_7' } }),
      S({ k: 'optionOpt',  label: '옵션 구분',       type: 'select', opts: 'optionOpt',   cm: { sel: '#bc_71' }, dep: { k: 'optionYn', v: '2' } }),
      S({ k: 'recall',     label: '리콜 대상',       type: 'select', opts: 'recall',
          cm: { sel: '#bc_81', vmap: RECALL_TO_CM }, ci: { name: 'check_recall' } }),
      S({ k: 'recallDone', label: '리콜 이행여부',   type: 'select', opts: 'recallDone',
          cm: { sel: '#bc_82', vmap: RECALL_DONE_TO_CM }, ci: { name: 'do_recall' }, dep: { k: 'recall', v: '2' } }),
    ],
  },
  {
    title: '5. 사고·교환·수리 이력',
    fields: [
      S({ k: 'accident',       label: '사고이력',   type: 'select', opts: 'noneYes', cm: { radio: 'ucAccFlag' },   ci: { name: 'accident' } }),
      S({ k: 'accidentSimple', label: '단순수리',   type: 'select', opts: 'noneYes', cm: { radio: 'ucAccSimple' }, ci: { name: 'accident_simple' } }),

      /* 교환·판금 등 이상부위 (19개 + 필러패널 A/B/C)
       *
       *  두 사이트 모두 도형 클릭 방식과 별개로 부위 체크박스 목록을 갖고 있고,
       *  국토부 고시 서식이라 번호와 이름 표기가 동일하다. (1.후드, 2.프론트펜더 …)
       *  그래서 id/name 을 추측하는 대신 화면의 라벨 글자로 찾는다 (part 매핑).
       *  사이트가 id 를 바꿔도 표기만 그대로면 계속 동작한다.
       *
       *  주의: 체크 해제는 하지 않는다. 켜는 것만 자동이고, 빼는 건 사람이 한다 (D3).
       */
      ...PARTS,
    ],
  },
  {
    title: '6. 세부상태 — 자기진단 / 원동기',
    fields: [
      S({ k: 'dgEngine',    label: '자기진단 원동기',      type: 'select', opts: 'goodBad',   cm: { sel: '#dc_11' },  ci: { name: 's_engine' } }),
      S({ k: 'dgTrans',     label: '자기진단 변속기',      type: 'select', opts: 'goodBad',   cm: { sel: '#dc_12' },  ci: { name: 'transmission' } }),
      S({ k: 'engStatus',   label: '원동기 작동상태',      type: 'select', opts: 'goodBad',   cm: { sel: '#dc_21' },  ci: { name: 'engine_status' } }),
      S({ k: 'engRocker',   label: '오일누유 로커암커버',  type: 'select', opts: 'leakOil',   cm: { sel: '#dc_221' }, ci: { name: 'engine_locker' } }),
      S({ k: 'engHead',     label: '오일누유 실린더헤드',  type: 'select', opts: 'leakOil',   cm: { sel: '#dc_222' }, ci: { name: 'engine_head' } }),
      S({ k: 'engOilpan',   label: '오일누유 오일팬',      type: 'select', opts: 'leakOil',   cm: { sel: '#dc_223' }, ci: { name: 'engine_oilfan' } }),
      S({ k: 'engOilQty',   label: '오일 유량',            type: 'select', opts: 'qty',       cm: { sel: '#dc_23' },  ci: { name: 'engine_oilq' } }),
      S({ k: 'engCylinder', label: '냉각수누수 실린더헤드',type: 'select', opts: 'leakWater', cm: { sel: '#dc_231' }, ci: { name: 'engine_cylinder' } }),
      S({ k: 'engPump',     label: '냉각수누수 워터펌프',  type: 'select', opts: 'leakWater', cm: { sel: '#dc_232' }, ci: { name: 'engine_pump' } }),
      S({ k: 'engRadiator', label: '냉각수누수 라디에이터',type: 'select', opts: 'leakWater', cm: { sel: '#dc_233' }, ci: { name: 'engine_radiator' } }),
      S({ k: 'engWaterQty', label: '냉각수 유량',          type: 'select', opts: 'qty',       cm: { sel: '#dc_234' }, ci: { name: 'engine_waterq' } }),
      S({ k: 'engHighPress',label: '커먼레일(고압펌프)',   type: 'select', opts: 'goodBad',   cm: { sel: '#dc_24' },  ci: { name: 'engine_highpress' } }),
    ],
  },
  {
    title: '7. 세부상태 — 변속기',
    fields: [
      S({ k: 'atLeak',   label: '자동 오일누유',   type: 'select', opts: 'leakOil', cm: { sel: '#dc_311' }, ci: { name: 'at_oilleakage' } }),
      S({ k: 'atOilQty', label: '자동 오일유량',   type: 'select', opts: 'qty3',    cm: { sel: '#dc_312' }, ci: { name: 'at_oilstatus' } }),
      S({ k: 'atStatus', label: '자동 작동상태',   type: 'select', opts: 'goodBad', cm: { sel: '#dc_313' }, ci: { name: 'at_status' } }),
      S({ k: 'mtLeak',   label: '수동 오일누유',   type: 'select', opts: 'leakOil', cm: { sel: '#dc_321' }, ci: { name: 'mt_oilleakage' } }),
      S({ k: 'mtTrans',  label: '수동 기어변속',   type: 'select', opts: 'goodBad', cm: { sel: '#dc_322' }, ci: { name: 'mt_trans' } }),
      S({ k: 'mtOilQty', label: '수동 오일유량',   type: 'select', opts: 'qty3',    cm: { sel: '#dc_323' }, ci: { name: 'mt_oilstatus' } }),
      S({ k: 'mtStatus', label: '수동 작동상태',   type: 'select', opts: 'goodBad', cm: { sel: '#dc_324' }, ci: { name: 'mt_status' } }),
    ],
  },
  {
    title: '8. 세부상태 — 동력전달 / 조향 / 제동',
    fields: [
      S({ k: 'fClutch',   label: '클러치 어셈블리',    type: 'select', opts: 'goodBad', cm: { sel: '#dc_41' }, ci: { name: 'force_clutch' } }),
      S({ k: 'fJoint',    label: '등속조인트',         type: 'select', opts: 'goodBad', cm: { sel: '#dc_42' }, ci: { name: 'force_joint' } }),
      S({ k: 'fBearing',  label: '추진축 및 베어링',   type: 'select', opts: 'goodBad', cm: { sel: '#dc_43' }, ci: { name: 'force_bearing' } }),
      S({ k: 'fDiff',     label: '디퍼렌셜 기어',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_44' }, ci: { name: 'force_differentialgear' } }),
      S({ k: 'stLeak',    label: '동력조향 오일누유',  type: 'select', opts: 'leakOil', cm: { sel: '#dc_51' }, ci: { name: 'steering_oilleakage' } }),
      S({ k: 'stPump',    label: '스티어링 펌프',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_521' }, ci: { name: 'steering_pump' } }),
      S({ k: 'stGear',    label: '스티어링 기어',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_522' }, ci: { name: 'steering_gear' } }),
      S({ k: 'stJoint',   label: '스티어링 조인트',    type: 'select', opts: 'goodBad', cm: { sel: '#dc_523' }, ci: { name: 'steering_joint' } }),
      S({ k: 'stHose',    label: '파워 고압호스',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_524' }, ci: { name: 'power_highpressurehose' } }),
      S({ k: 'stTierod',  label: '타이로드엔드/볼조인트', type: 'select', opts: 'goodBad', cm: { sel: '#dc_525' }, ci: { name: 'power_steeringjoint' } }),
      S({ k: 'brCylinder',label: '브레이크 마스터실린더', type: 'select', opts: 'leakOil', cm: { sel: '#dc_61' }, ci: { name: 'brake_cylinderoil' } }),
      S({ k: 'brOil',     label: '브레이크 오일누유',  type: 'select', opts: 'leakOil', cm: { sel: '#dc_62' }, ci: { name: 'brake_oilleakage' } }),
      S({ k: 'brStatus',  label: '배력장치 상태',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_63' }, ci: { name: 'brake_status' } }),
    ],
  },
  {
    title: '9. 세부상태 — 전기 / 고전원 / 연료',
    fields: [
      S({ k: 'elOutput', label: '발전기 출력',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_71' }, ci: { name: 'elec_output' } }),
      S({ k: 'elMotor',  label: '시동 모터',        type: 'select', opts: 'goodBad', cm: { sel: '#dc_72' }, ci: { name: 'elec_motor' } }),
      S({ k: 'elWiper',  label: '와이퍼 모터',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_73' }, ci: { name: 'elec_wiper' } }),
      S({ k: 'elWind',   label: '실내송풍 모터',    type: 'select', opts: 'goodBad', cm: { sel: '#dc_74' }, ci: { name: 'elec_wind' } }),
      S({ k: 'elFan',    label: '라디에이터 팬모터',type: 'select', opts: 'goodBad', cm: { sel: '#dc_75' }, ci: { name: 'elec_fan' } }),
      S({ k: 'elWindow', label: '윈도우 모터',      type: 'select', opts: 'goodBad', cm: { sel: '#dc_76' }, ci: { name: 'elec_window' } }),
      S({ k: 'ressIns',  label: '충전구 절연상태',  type: 'select', opts: 'goodBad', cm: { sel: '#dc_91' }, ci: { name: 'ress_insulationstatus' } }),
      S({ k: 'ressIso',  label: '구동축전지 격리상태', type: 'select', opts: 'goodBad', cm: { sel: '#dc_92' }, ci: { name: 'ress_isolationstatus' } }),
      S({ k: 'ressWire', label: '고전원 전기배선',  type: 'select', opts: 'goodBad', cm: { sel: '#dc_93' }, ci: { name: 'ress_wirestatus' } }),
      S({ k: 'fuelLeak', label: '연료누출',         type: 'select', opts: 'noneYes', cm: { sel: '#dc_81' }, ci: { name: 'etc_fuelleakage' } }),
    ],
  },
  {
    title: '10. 메모',
    fields: [
      S({ k: 'memo', label: '점검자 메모', type: 'textarea', cm: { sel: '#uc_memo' }, ci: { sel: '#carMemo' } }),
    ],
  },
  {
    title: '11. 자동차 사진',
    fields: PHOTOS,
  },
];

const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

/**
 * 부위 표시로부터 사고이력·단순수리를 정한다.
 * ------------------------------------------------------------------
 * 현장 규칙 (점검원 확인):
 *
 *   표시 없음                          ->  사고이력 없음 · 단순수리 없음
 *
 *   외판 (1~8)  부식·흠집·요철·손상     ->  사고이력 없음 · 단순수리 없음
 *               판금                    ->  사고이력 없음 · 단순수리 있음
 *   외판 1랭크 (1~5)  교환              ->  사고이력 없음 · 단순수리 있음
 *   외판 2랭크 (6~8)  교환              ->  사고이력 있음 · 단순수리 있음
 *
 *   주요골격 (9~19)   무엇이든          ->  사고이력 있음 · 단순수리 있음
 *
 * 정리하면
 *   사고이력 '있음' :  2랭크 교환(X)  또는  주요골격에 아무 표시
 *   단순수리 '있음' :  외판에 교환(X)·판금(W)  또는  주요골격에 아무 표시
 * 외판의 부식(C)·흠집(A)·요철(U)·손상(T) 은 이력으로 치지 않는다.
 *
 * 이 함수 하나만 고치면 화면과 전송이 함께 바뀐다.
 * (화면은 IPC 'history:calc' 로 물어보고, 전송은 그 결과가 담긴 값을 그대로 보낸다)
 *
 * @returns {{accident: '1'|'2', accidentSimple: '1'|'2'}}  1 = 없음, 2 = 있음
 */
function historyFromParts(data) {
  let repair = false;   // 단순수리 '있음' 조건
  let severe = false;   // 사고이력 '있음' 조건

  for (const f of ALL_FIELDS) {
    if (f.type !== 'part') continue;
    const no = f.cm && f.cm.part ? f.cm.part.no : 0;

    // 부위 자체 값과 위치별 값(pt3@LF 등)을 모두 본다
    let codes = String(data[f.k] || '');
    for (const key of Object.keys(data)) {
      if (key.indexOf(f.k + '@') === 0) codes += String(data[key] || '');
    }
    if (!codes.trim()) continue;

    if (no >= 9) {                       // 주요골격 — 어떤 부호든 둘 다 '있음'
      severe = true;
      repair = true;
      continue;
    }

    // 외판 — 교환·판금만 이력으로 본다
    const hasX = codes.indexOf('X') >= 0;
    const hasW = codes.indexOf('W') >= 0;
    if (hasX || hasW) repair = true;
    if (no >= 6 && hasX) severe = true;  // 2랭크 교환
  }

  return { accident: severe ? '2' : '1', accidentSimple: repair ? '2' : '1' };
}

module.exports = { OPT, GROUPS, ALL_FIELDS, historyFromParts };
