/* ═══════════════════════════════════════════════════════════════════
   차곳간 워시 — 메뉴 · 기능 목록 확정본 (2026-10-18, 디자인 방)
   대표님 결정(10/18) «메뉴 찾기 쉽게 = A 메뉴 아래 칸 늘 보임(가로 기본 · 세로는 왼쪽 펼침) + C 기능 찾기(메뉴 줄 오른쪽 끝) + D 홈 바로가기», 배달은 큰 메뉴(운영/06 O)
   10/18 대표님 확정: 탭 차례 홈 → 일감 → 매출 → 월별 청구서 → 입·출금 내역 → 세금계산서 → (제품 전용) → 설정
   cgg-j4 1.13 의 CGG.nav · CGG.allMenu · CGG.find · CGG.quick 에 그대로 넘겨요. 이 파일 내용은 cgg-j4 1.13 JS 바로 뒤에 붙여요.
   go = "묶음/칸" 이름표. 워시 화면 열쇠로 잇는 표는 디자인/메뉴지도/README.md «워시 열쇠 표»
   spot = 그 화면 안에서 빛낼 칸의 id (워시 방이 그 칸에 id 를 붙여요. 없으면 화면 맨 위만 열려요)
   ═══════════════════════════════════════════════════════════════════ */
var CGG_MENU_WASH = {
  /* A — 큰 메뉴 9개 (가로: 메뉴 밑 줄에 아래 칸 · 세로: 왼쪽에 늘 펼침) */
  groups: [
    {key:"home",     label:"홈",        icon:"home"},
    {key:"ledger",   label:"일감",      icon:"car",     subs:[{key:"list",label:"입고 · 출고 내역"}]},
    {key:"sales",    label:"매출",      icon:"chart"},
    {key:"bill",     label:"월별 청구서", icon:"file"},
    {key:"money",    label:"입·출금 내역", icon:"wallet",  subs:[{key:"io",label:"입금 · 출금"},{key:"due",label:"받을 금액"}]},
    {key:"tax",      label:"세금계산서", icon:"receipt"},
    {key:"delivery", label:"배달",      icon:"truck",   isNew:true, subs:[{key:"outlog",label:"배달 기록"},{key:"dest",label:"목적지"},{key:"msg",label:"문구 · 발송 설정"}]},
    {key:"mat",      label:"자재",      icon:"box"},
    {key:"settings", label:"설정",      icon:"gear",    subs:[{key:"biz",label:"우리 사업장"},{key:"bak",label:"백업 · 기기"},{key:"parties",label:"거래처"},{key:"staff",label:"직원 계정"},{key:"items",label:"작업 항목 · 단가표"},
                                                              {key:"bank",label:"입금 자동 확인"},{key:"send",label:"알림"},{group:"워시 전용"},{key:"qr",label:"QR 코드"},{key:"caropt",label:"출고 지연 기준"}]}
  ],
  /* 폰 아래 탭 5칸 (PC 화면일 때. 현장 화면 탭 «홈 · 입고 · 출고 · 오늘 · 날짜 검색»은 그대로) */
  tabs: [{key:"home",icon:"home",label:"홈"},{key:"ledger",icon:"car",label:"일감"},{key:"delivery",icon:"truck",label:"배달"},{key:"money",icon:"wallet",label:"입·출금"},{key:"__all",icon:"more",label:"전체"}],
  /* C · D — 기능 목록 (label 은 화면에 보이는 이름, words 는 사람들이 칠 만한 쉬운 말 · 비슷한 말) */
  feats: [
    {id:"in",          label:"입고 등록",            path:"현장 화면 › 입고",                 go:"field/in",          words:"입고하기 입고차량 들어온 차 차 들어옴 차량 등록 사진 번호판 차번호"},
    {id:"out",         label:"출고 등록",            path:"현장 화면 › 출고",                 go:"field/out",         words:"출고하기 출고차량 나간 차 차 나감 내보내기 배달 보내기"},
    {id:"ledger",      label:"입고 · 출고 내역",          path:"일감 › 입고 · 출고 내역",               go:"ledger/list",       words:"차 목록 작업 중 일감 장부 입고 출고 내역 입고차량 오늘 입고 들어온 차 입출고"},
    {id:"pay-done",    label:"입금 확인",       path:"일감 › 입고 · 출고 내역",               go:"ledger/list",       words:"수금 완료 돈 받음 입금 처리 입금 완료 표시 입금 확인 수금 확인 입출고 내역", spot:"#wkBulkPaid"},
    {id:"extra-ok",    label:"추가 작업 확인 · 입금 확인", path:"일감 › 입고 · 출고 내역 › 차 줄 누르기", go:"ledger/list",     words:"추가 작업 확인 요청 추가 작업 승인 입금 확인 차 자세히 입출고 내역"},
    {id:"outlog",      label:"배달 기록",            path:"배달 › 배달 기록",                 go:"delivery/outlog",   words:"배달 기록 출고 내역 나간 차 배송 이동 확인 탁송 출고차량 오늘 출고 오늘 배달 나간 차"},
    {id:"out-resend",  label:"출고 알림 다시 보내기", path:"배달 › 배달 기록",                 go:"delivery/outlog",   words:"재발송 다시 보내기 못 보낸 실패 문자"},
    {id:"dest",        label:"목적지 추가",          path:"배달 › 목적지",                    go:"delivery/dest",     words:"목적지 배달 도착지 주소 자주 가는 곳 추가"},
    {id:"out-msg",     label:"출고 알림 문구",       path:"배달 › 문구 · 발송 설정",           go:"delivery/msg",      words:"출고 문자 문구 알림 내용 바꾸기 메시지"},
    {id:"sales",       label:"매출 보기",            path:"매출",                             go:"sales",             words:"매출 실적 월별 년별 통계 얼마 벌었"},
    {id:"bill-make",   label:"청구서 만들기",        path:"월별 청구서 › 1. 청구서 만들기",         go:"bill",              words:"월별 청구서 정산서 청구 만들기 명세 요금 엑셀"},
    {id:"bill-send",   label:"청구서 보내기",        path:"월별 청구서 › 2. 청구서 보내기",         go:"bill",              words:"청구서 발송 알림톡 문자 보내기 예약 시험", spot:"#billSendCard"},
    {id:"bill-print",  label:"청구서 인쇄 · 그림 받기", path:"월별 청구서 › 1. 청구서 만들기",      go:"bill",              words:"인쇄 출력 jpg 그림 엑셀 내려받기 다운로드"},
    {id:"money",       label:"입금 · 출금 내역",         path:"입·출금 내역 › 입금 · 출금",                 go:"money/io",          words:"입금 출금 들어온 돈 나간 돈 통장 내역 수금 계좌 입·출금 입출금"},
    {id:"due",         label:"받을 금액",       path:"입·출금 내역 › 받을 금액",           go:"money/due",         words:"미수 미수금 입금 대기 못 받은 돈 받을 금액 외상 수금 받아야 할"},
    {id:"tax",         label:"세금계산서 발행",      path:"세금계산서",                        go:"tax",               words:"세금계산서 계산서 홈택스 발행 부가세 국세청 세금 발급 팝빌"},
    {id:"mat",         label:"자재 추가 · 재고",     path:"자재",                             go:"mat",               words:"자재 재고 약품 소모품 부족 주문"},
    {id:"mat-order",   label:"부족 자재 주문 문자",  path:"자재",                             go:"mat",               words:"자재 주문 발주 부족 문자"},
    {id:"supplier",    label:"도매상 추가",          path:"자재 › 아래쪽 도매상 목록",         go:"mat",               words:"도매상 거래처 자재 사는 곳 공급", spot:"#matShops"},
    {id:"biz",         label:"우리 사업장 · 로고",   path:"설정 › 우리 사업장",               go:"settings/biz",      words:"공급자 사업자 정보 상호 대표 로고 연락처 사업자등록증"},
    {id:"company-add", label:"상사 추가",            path:"설정 › 거래처 › 매매상사 사업자",   go:"settings/parties",  words:"매매상사 상사 등록 거래처 추가 사업자 사업자등록증"},
    {id:"dealer-add",  label:"딜러 추가",            path:"설정 › 거래처 › 딜러 목록",         go:"settings/parties",  words:"딜러 등록 딜러 넣기 딜러 목록 개인사업자 딜러 소속 딜러 거래처", spot:"#ptDealers"},
    {id:"staff",       label:"직원 추가",            path:"설정 › 직원 계정",                 go:"settings/staff",    words:"직원 계정 로그인 만들기 매니저 권한 비밀번호 비번 대표 관리자"},
    {id:"price",       label:"단가표 고치기",        path:"설정 › 작업 항목 · 단가표",         go:"settings/items",    words:"단가 가격 요금 작업 항목 차종별 부가세 세금"},
    {id:"caropt",      label:"출고 지연 기준 · 주차 구역", path:"설정 › 출고 지연 기준",       go:"settings/caropt",   words:"지연 늦어짐 주차 구역 안전장치 안전 출고안됨 사진없이 두번출고 중복 입고없이 경고 경고창 위치 자리"},
    {id:"bank",        label:"입금 자동 확인",       path:"설정 › 입금 자동 확인",             go:"settings/bank",     words:"통장 연결 은행 자동 수금 입금 확인 계좌"},
    {id:"roster",      label:"카모두 상사명부 · 딜러명부 올리기", path:"설정 › 거래처",             go:"settings/parties",  words:"카모두 명부 상사명부 딜러명부 엑셀 한꺼번에 올리기 업로드 거래처 채우기"},
    {id:"sms",         label:"메시지 설정",             path:"설정 › 알림",                      go:"settings/send",     words:"문자 알림톡 카카오 솔라피 자동 발송 연동 카톡 예약"},
    {id:"sender",      label:"보내는 번호(발신번호)",             path:"설정 › 알림",                      go:"settings/send",     words:"발신번호 보내는 번호 문자 번호 솔라피 등록 번호 보내는 번호", spot:"#smsFrom"},
    {id:"outbox",      label:"보낸 기록",   path:"설정 › 알림 › 보낸 기록",              go:"settings/send",     words:"발송함 보낸 문자 알림톡 예약 취소 발송 기록 실패 다시 보내기 (보낸 기록)"},
    {id:"link",        label:"직원에게 앱 주소 보내기", path:"머리말 › 주소",               go:"hdr/link",          words:"링크 복사 앱 주소 직원 주소 보내기 설치 링크"},
    {id:"qr",          label:"QR 코드",              path:"설정 › QR 코드",                   go:"settings/qr",       words:"큐알 직원 앱 주소 링크 설치"},
    {id:"help",        label:"도움말 (기능 설명서)", path:"머리말 › 도움말",                  go:"hdr/help",          words:"도움말 설명서 사용법 모르겠 어떻게 안됨 안돼 오류 에러 고장 느림 느려"},
    {id:"notice",      label:"공지사항",             path:"머리말 › 공지사항",                go:"hdr/notice",        words:"공지 공지사항 새 소식 업데이트 안내 알림창 새소식 다시보지않기"},
    {id:"backup",      label:"백업 · 글씨 크기",     path:"설정 › 백업 · 기기",               go:"settings/bak",      words:"백업 되돌리기 글씨 크기 화면 배치 접속 기기"},
    {id:"trash",       label:"휴지통",               path:"사람 단추 ▾ › 휴지통",             go:"me/trash",          words:"휴지통 지운 것 지운거 실수로 지움 되돌리기 복구 삭제 되돌 출고취소 취소 잘못 실수"},
    {id:"plan",        label:"요금제 · 결제",        path:"사람 단추 ▾ › 요금제",             go:"me/plan",           words:"요금제 결제 구독 이용료 카드 캐시 지갑 잔액 남은돈 충전 이용요금 만료 기한 체험 연장 잠금 잠김 차단 막힘"},
    {id:"me",          label:"마이페이지",           path:"사람 단추 ▾ › 마이페이지",         go:"me/me",             words:"내 정보 비밀번호 내 계정 로그아웃"}
  ],
  /* D — 홈 바로가기 처음 4개 (사용자가 바꾸면 이 기기에만 저장) */
  quickDefault: ["in","out","bill-send","pay-done"],   /* 4개까지 (대표님 10/18) — 입고 · 출고 · 청구서 보내기 · 입금 확인 */
  quickKey: "cgg_wash_quick"   /* 실제 저장 이름은 "cgg_wash_quick:"+업체id+":"+사람id (한 PC에 여러 사람이 로그인할 수 있어서) */
};
