/* ═══════════════════════════════════════════════════════════════════
   차곳간 체크 — 메뉴 · 기능 목록 확정본 (2026-10-18, 디자인 방 · 체크 방 확인 v44)
   대표님 결정(10/18) «메뉴 찾기 쉽게 = A 메뉴 아래 칸 늘 보임(가로 기본 · 세로는 왼쪽 펼침) + C 기능 찾기(메뉴 줄 오른쪽 끝) + D 홈 바로가기», 배달은 큰 메뉴(운영/06 O)
   10/18 대표님 확정: 탭 차례 홈 → 일감 → 매출 → 월별 청구서 → 입·출금 내역 → 세금계산서 → (제품 전용) → 설정
   cgg-j4 1.12 의 CGG.nav · CGG.allMenu · CGG.find · CGG.quick 에 그대로 넘겨요. 이 파일 내용은 cgg-j4 1.12 JS 바로 뒤에 붙여요.
   go = "묶음/칸" 이름표. 체크 화면 열쇠로 잇는 표는 디자인/메뉴지도/README.md «체크 열쇠 표»
   spot = 그 화면 안에서 빛낼 칸의 id (체크 방이 그 칸에 id 를 붙여요. 없으면 화면 맨 위만 열려요)
   ═══════════════════════════════════════════════════════════════════ */
var CGG_MENU_CHECK = {
  /* A — 큰 메뉴 8개 («알림» → «재검사 알림», «차량 배달 알림» → 큰 메뉴 «배달») */
  groups: [
    {key:"home",     label:"홈",          icon:"home"},
    {key:"sales",    label:"매출",        icon:"chart"},
    {key:"bill",     label:"월별 청구서", icon:"file",    subs:[{key:"month",label:"청구서 목록"},{group:"체크 전용"},{key:"group",label:"받는 곳 합치기"}]},
    {key:"deposit",  label:"입·출금 내역", icon:"wallet",  subs:[{key:"in",label:"입금 · 출금"},{key:"due",label:"받을 금액"},{group:"체크 전용"},{key:"ins",label:"보험료 맞춰 보기"}]},
    {key:"hometax",  label:"세금계산서",  icon:"receipt", subs:[{key:"issue",label:"세금계산서 발행"},{group:"체크 전용"},{key:"ledger",label:"달마다 장부"}]},
    {key:"delivery", label:"배달",        icon:"truck",   isNew:true, subs:[{key:"log",label:"배달 기록"},{key:"dest",label:"목적지"},{key:"msg",label:"문구 · 발송 설정"},{group:"체크 전용"},{key:"driver",label:"기사 계정"}]},
    {key:"remind",   label:"재검사 알림", icon:"bell"},
    {key:"set",      label:"설정",        icon:"gear",    subs:[{key:"biz",label:"우리 사업장"},{key:"backup",label:"백업 · 기기"},{key:"partner",label:"거래처"},{key:"staff",label:"직원 계정"},{key:"price",label:"작업 항목 · 단가표"},
                                                                {key:"popbill",label:"입금 자동 확인"},{key:"alarm",label:"알림"},{group:"체크 전용"},{key:"fee",label:"검사자 수수료"},{key:"upload",label:"자료 올리기"}]}
  ],
  /* 폰 아래 탭 5칸 — 지금 «홈 · 정산 기록 · 입출금 · 계산서 · 전체»에서 «정산 기록» · «계산서»는 «전체» 안으로 */
  tabs: [{key:"home",icon:"home",label:"홈"},{key:"bill",icon:"file",label:"청구서"},{key:"delivery",icon:"truck",label:"배달"},{key:"deposit",icon:"wallet",label:"입·출금"},{key:"__all",icon:"more",label:"전체"}],
  feats: [
    {id:"sales",        label:"매출 보기",              path:"매출 › 매출 내역",                    go:"sales"     ,       words:"매출 실적 월별 년별 통계"},
    {id:"upload",       label:"엑셀 자료 올리기",       path:"설정 › 자료 올리기",                  go:"set/upload",     words:"엑셀 업로드 올리기 카모두 접수리스트 전산외 정비비 나스 양식"},
    {id:"history",      label:"달마다 장부",              path:"세금계산서 › 달마다 장부",                           go:"hometax/ledger",          words:"정산 기록 월별 기록 홈택스 대조"},
    {id:"bill-make",    label:"청구서 만들기",          path:"월별 청구서 › 청구서 목록",                go:"bill/month",       words:"월별 청구서 정산서 청구 만들기 명세 요금 엑셀"},
    {id:"bill-send",    label:"청구서 보내기",          path:"월별 청구서 › 청구서 목록 › 2. 청구서 보내기", go:"bill/month",   words:"청구서 발송 알림톡 문자 보내기 시험", spot:"#billSendCard"},
    {id:"bill-group",   label:"받는 곳 합치기",            path:"월별 청구서 › 받는 곳 합치기",                go:"bill/group",       words:"묶음 딜러 묶기 한 곳으로 청구처"},
    {id:"tpl",          label:"알림톡 문구",          path:"설정 › 알림",              go:"set/alarm",         words:"알림톡 템플릿 카카오 등록 문구 승인"},
    {id:"deposit",      label:"입금 확인",  path:"입·출금 내역 › 입금 · 출금",                  go:"deposit/in",       words:"입금 들어온 돈 통장 팝빌 가져오기 입금 처리 미수 미수금 입금 대기 못 받은 돈 받을 금액 수금 계좌 입금 내역 입금 처리 입금 확인 수금"},
    {id:"insurance",    label:"보험료 맞춰 보기",            path:"입·출금 내역 › 보험료 맞춰 보기",                go:"deposit/ins",      words:"보험료 보험사 대조 성능보증 보험료 대조"},
    {id:"due",          label:"받을 금액",              path:"입·출금 내역 › 받을 금액",            go:"deposit/due",      words:"미수 미수금 입금 대기 못 받은 돈 받을 금액 외상 받아야 할 잔액"},
    {id:"tax",          label:"세금계산서 발행",        path:"세금계산서 › 세금계산서 발행",                          go:"hometax/issue",          words:"세금계산서 계산서 팝빌 발급 홈택스 수정 국세청 세금 부가세 발행 발급"},
    {id:"remind",       label:"재검사 알림 보내기",     path:"재검사 알림",                         go:"remind",           words:"재검사 알림 유효기간 만료 규칙 보내기"},
    {id:"deliv-log",    label:"배달 기록",              path:"배달 › 배달 기록",                    go:"delivery/log",     words:"배달 기록 출고 차량 이동 배송 탁송 확인 못 보낸 출고차량 오늘 출고 오늘 배달 나간 차"},
    {id:"dealer-wait",  label:"딜러 등록 대기",         path:"배달 › 배달 기록 › 맨 위",            go:"delivery/log",     words:"딜러 등록 승인 대기 기사가 적은 번호 처음 번호", spot:"#dealerWait"},
    {id:"deliv-dest",   label:"목적지별 배달",          path:"배달 › 목적지",                     go:"delivery/dest",  words:"목적지별 장소별 모아 보기"},
    {id:"dest-add",     label:"목적지 추가",            path:"배달 › 목적지",                  go:"delivery/dest",    words:"목적지 도착지 주소 추가 관리"},
    {id:"deliv-msg",    label:"배달 문구 · 발송 설정",  path:"배달 › 문구 · 발송 설정",             go:"delivery/msg",     words:"배달 문자 문구 알림톡 보내는 방법 사진 카톡 발송 예약"},
    {id:"driver",       label:"기사 계정",              path:"배달 › 기사 계정",                    go:"delivery/driver",  words:"기사 배달 기사 계정 추가 로그인"},
    {id:"roster",       label:"카모두 상사명부 · 딜러명부 올리기", path:"설정 › 거래처",           go:"set/partner",      words:"카모두 명부 상사명부 딜러명부 엑셀 한꺼번에 올리기 업로드 거래처 채우기"},
    {id:"company-add",  label:"상사 추가",              path:"설정 › 거래처 › 아래쪽",              go:"set/partner",      words:"매매상사 상사 등록 거래처 추가 사업자등록증", spot:"#ptCompanies"},
    {id:"dealer-add",   label:"딜러 추가",              path:"설정 › 거래처 › 아래쪽 딜러",         go:"set/partner",      words:"딜러 등록 딜러 넣기 명함 연락처 한꺼번에", spot:"#ptDealers"},
    {id:"dealer-del",   label:"딜러 · 상사 지우기",     path:"설정 › 거래처 › 아래쪽",              go:"set/partner",      words:"딜러 지우기 상사 지우기 삭제", spot:"#ptDealers"},
    {id:"biz",          label:"공급자 · 우리 사업장",   path:"설정 › 우리 사업장",               go:"set/biz",      words:"공급자 우리 사업장 상호 사업자번호 계좌 대표", spot:"#ptSupplier"},
    {id:"sms",          label:"메시지 설정",            path:"설정 › 알림",              go:"set/alarm",         words:"문자 알림톡 메시지 보내는 방식 발송 연동 시험 발송"},
    {id:"sender",       label:"보내는 번호(발신번호)",               path:"설정 › 알림", go:"set/alarm", words:"발신번호 보내는 번호 문자 번호 보내는 번호", spot:"#smsFrom"},
    {id:"price",        label:"단가표",                 path:"설정 › 작업 항목 · 단가표",                       go:"set/price",        words:"단가 가격 검사비 구간 부가세"},
    {id:"fee",          label:"검사자 수수료",          path:"설정 › 검사자 수수료",                go:"set/fee",          words:"수수료 검사자 규칙"},
    {id:"popbill",      label:"팝빌 연결",              path:"설정 › 입금 자동 확인",                    go:"set/popbill",      words:"팝빌 연결 세금계산서 계좌 회원 연동"},
    {id:"sms-collect",  label:"문자 자동수집",          path:"설정 › 입금 자동 확인",                go:"set/popbill",          words:"입금 문자 자동 수집 구글 시트 카카오뱅크"},
    {id:"outbox",       label:"보낸 기록",              path:"설정 › 알림 › 보낸 기록",        go:"set/alarm",        words:"발송함 보낸 문자 알림톡 예약 취소 발송 기록 실패 다시 보내기 (보낸 기록)"},
    {id:"alarm",        label:"PC 알림창 · 소리",              path:"설정 › 알림",                    go:"set/alarm",        words:"소리 알람 알림음"},
    {id:"staff",        label:"직원 계정 · 권한",       path:"설정 › 직원 계정",                    go:"set/staff",       words:"직원 추가 권한 사람 추가 계정 비밀번호 비번 매니저 대표 관리자 로그인"},
    {id:"backup",       label:"설정 백업",              path:"설정 › 백업 · 기기",                    go:"set/backup",       words:"백업 되돌리기"},
    {id:"link",         label:"직원에게 앱 주소 보내기", path:"머리말 › 주소",               go:"hdr/link",         words:"링크 복사 앱 주소 직원 주소 보내기 설치 링크"},
    {id:"help",         label:"도움말 (기능 설명서)", path:"머리말 › 도움말",                   go:"hdr/help",         words:"도움말 설명서 사용법 모르겠 어떻게 안됨 안돼 오류 에러 고장 느림 느려"},
    {id:"notice",       label:"공지사항",             path:"머리말 › 공지사항",                 go:"hdr/notice",       words:"공지 공지사항 새 소식 업데이트 안내 알림창 새소식"},
    {id:"trash",        label:"휴지통",                 path:"사람 단추 ▾ › 휴지통",                go:"me/trash",         words:"휴지통 지운 것 지운거 실수로 지움 되돌리기 복구 삭제 배달 휴지통 되돌 취소 잘못 실수"},
    {id:"plan",         label:"요금제 · 결제",          path:"사람 단추 ▾ › 요금제",                go:"me/plan",          words:"요금제 결제 구독 이용료 카드 캐시 지갑 잔액 남은돈 충전 이용요금 만료 기한 체험 연장 잠금 잠김 차단 막힘"},
    {id:"me",           label:"마이페이지",             path:"사람 단추 ▾ › 마이페이지",            go:"me/me",            words:"내 정보 비밀번호 내 계정 로그아웃"}
  ],
  quickDefault: ["upload","bill-make","deposit","deliv-log"],   /* 4개까지 (대표님 10/18) — 자료 올리기 · 청구서 · 입금 확인 · 배달 기록 */
  quickKey: "cgg_check_quick"   /* 실제 저장 이름은 "cgg_check_quick:"+검사소id+":"+사람id */
};
