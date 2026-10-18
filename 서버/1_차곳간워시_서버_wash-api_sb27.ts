// =========================================================
// 차곳간 워시 — Supabase 서버 기능 (2번 파일)  이름: wash-api
// 예전 Code.gs 가 하던 일을 그대로 합니다:
//   자료 읽기/쓰기 · 사진 보관 · 솔라피 문자 · AI 사진 읽기 · 팝빌 세금계산서
// 비밀 열쇠는 코드에 쓰지 않고 [Edge Functions → Secrets] 에 넣습니다:
//   SOLAPI_KEY, SOLAPI_SECRET, ANTHROPIC_KEY, ANTHROPIC_MODEL(선택),
//   PF_ID(선택), POPBILL_LINKID(선택), POPBILL_SECRET(선택) · sb15: ADMIN_TOKEN 은 더 안 씀
//   SMS_FROM(선택) — 차곳간 대표번호. 넣으면 모든 업체 문자가 이 번호로 나갑니다.
//   CGG_INTERNAL_KEY(선택) — 경비실(cgg-api)과 서로 확인하는 전용 열쇠, 32자 이상 (sb3)
//   ANTHROPIC_ADMIN_KEY(선택), CF_API_TOKEN(선택), CF_ACCOUNT_ID(선택), SB_PAT(선택)
//     └ 관리 「유지비」 자동 읽기에만 씁니다. 없으면 그 줄만 «직접 적기» 로 남습니다.
// ※ 배포할 때 'Verify JWT' 는 꺼 주세요 (로그인 열쇠로 따로 확인합니다)
// sb27 (2026-10-18) 워시 방 찾음(총괄): «밀린 달 한꺼번에»는 최근 달 코드로만 보내서, 묶인 예전 달 코드엔 받은 번호가 안 남아
//   보기 화면 «밀린 달 목록»(보낸 것만)에서 빠질 수 있었음 → sendMsg(ataKey bill)가 codes:[…](묶인 달 보기코드)를 받으면,
//   이 업체 · 기한 안 · 같은 받는 곳(열쇠의 달 뒤가 같음)인 코드에만 받은 번호를 함께 남김(24개까지). 기록만 — 돈 셈 · 보내기는 그대로. SQL 없음.
// sb26 (2026-10-18) 대표님 «미수금 한꺼번에»(서버/설계/30 A안 · SQL 없음) — 청구서 보기(viewCar · 청구서)에 «밀린 달 목록»(unpaid):
//   같은 업체 · 같은 받는 곳(달|단위|이름[|상사] 열쇠의 달 뒤가 같은 것)의 다른 덜 받은 달 {month, amount, paid, due, code} (최근 12달 · 기한 안 것만).
//   화면은 가장 최근 달 보기코드로 «차곳간_청구서» 한 통(#{기간} «8~10월» · #{금액} 남은 합)을 sendMsg 로 보냄(지금 길 그대로).
//   문자 단문/장문 판단 45글자 → 90바이트(한글 2) — 솔라피가 실제로 고르는 기준과 같게(건수·비용 셈도). 체크 v51 과 같음.
//   보안 낮음(sb25): refundedSet 환불 메모 찾기를 그 주문 번호들로 좁힘(전체 5000줄 한도 없앰).
// sb25 (2026-10-18) 총괄 «대체 문자 전부»: 알림톡 코드·채널 ID 가 없거나 카카오가 실패하면 모든 알림이 확정 대체 문구
//   (알림톡/12_전체_점검표.md ⑦)로 문자 발송 — 결제완료·충전완료·자동결제등록·자동결제실패도 이제 «안 나감» 없음.
//   자동결제등록·실패 문자 문구 업체명 뺌(⑦ 확정본). 보낸 기록 via 로 알림톡(ata) / 문자 대체(sms·lms) 구분.
//   환불 판단 하나로: 결제 줄 환불 확인(refundedSet)이 «카드 환불 주문번호 ·» 기록도 봄(payRefunded 와 같음). SQL 없음.
// sb24 (2026-10-18) 보안 낮음(관리 방 찾음): 카드 환불한 결제(부분 포함)는 본사 → 업체 세금계산서(hqTaxIssue) 거절 ·
//   hqPayments 줄마다 refunded(환불됨) — 결제 줄 order_id → wash_pay_order status «canceled» 또는 raw.cancel. SQL 없음.
// sb23 (2026-10-18) 대표님 규칙 «입금 전 세금계산서 발급 없음»(체크 v47 과 같음 · 예외 없음) —
//   · pbIssue(업체 → 딜러): 요청에 청구서 보기코드 bill(24자)이 꼭 있어야 함 · 이 업체 청구서 · 장부로 다시 셈(billLive)해 모두 입금 완료 ·
//     계산서 합계 = 청구서 금액일 때만 발행 (옛 청구서처럼 셀 수 없으면 거절 · 캐시·건수는 깎기 전에 거름)
//   · hqTaxIssue(본사 → 업체): body.payId(결제 기록 번호) 꼭 · 그 업체 결제 · status «paid» · 계산서 합계 = 결제 금액 ·
//     같은 결제로 이미 발행했으면 거절(«다시 보내기»도 안 됨) · 비고에 «결제 ○○» 남김.
//   · 워시 v135 묶음(bill.recIds · 발행처×딜러)도 받음: 입고 기록을 서버 장부로 다시 읽어 모두 «수금완료» · 합계 = total 합계 ·
//     실제 발행이면 차마다(본사는 결제마다) wash_tax_rec 에 먼저 잡음(같은 차 두 번 · 동시 누름 막기 · 실패하면 놓음). 먼저 서버/sql/21.
// sb22 (2026-10-18) 관리 인증번호(hqLogin 로그인 · hqPhoneStart 본사 번호 바꾸기)도 알림톡 «차곳간_인증번호» 먼저(대표님 요청) —
//   코드는 관리 설정 wash_hq.ata_cfg.tpl.auth · 알림톡이 안 되면 확정본 대체 문구 문자 · 코드가 비면 지금 문자 그대로. SQL 없음.
// sb21 (2026-10-18) viewBill 딜러 단위 보기 주소 열쇠에 상사까지(«달|dealer|이름|상사») — 다른 상사의 같은 이름 딜러 청구서를 덮어쓰지 않음(워시 요청 · 개인정보) ·
//   옛 열쇠 주소는 그대로 열림(옮기지 않음 · 딜러 단위는 한 번 새 주소) · 일감 id 도 상사가 맞는 것만 남김. SQL 없음.
// sb20 (2026-10-18) bizVerify 연결 실패를 짧은 갈래(hdr·dns·tls·conn·timeout·net)로 기록·화면 글 끝에 · 열쇠 앞뒤 따옴표 뗌 · 머리글 연결 실패도 주소 방식 한 번 더 · 8초 끊음(체크 v42 와 같음)
// sb19 (2026-10-18) bizVerify 열쇠는 머리글 먼저, 열쇠 오류면 주소 방식으로 한 번 더(체크 v39 와 같음) · 미등록 열쇠 쉬운 글
// sb18 (2026-10-18) 거래처(companies·dealers): 직원은 새로 넣기만 · 고치기·지우기는 매니저 이상 (보안 낮음 · guardPartners)
// sb18 (2026-10-18) 새 창구 bizVerify({bizNo, ceo?, openDate?}) — 국세청 사업자 상태·진위(대표만 · 하루 100 · 열쇠 NTS_API_KEY 없으면 ready:false)
// sb18 (2026-10-18) 사진 읽기(aiJson) — 답 길이를 넉넉히(1500)·답에서 { … } 만 잘라 읽음 (체크 v37 과 같게 · 긴 사업자등록증·명함). SQL 없음
// sb17 (2026-10-17) 설계 21 — 청구서 입금 상태를 그때그때 (보안 미리 보기 1~4 반영 · SQL 없음)
//   · viewBill: 줄마다 일감 id 를 받아, 이 업체의 실제 일감(intakes · demo=false)이고 이 청구서의 받는 곳·달에 맞을 때만 저장
//     (중복은 하나로 · 40자 · 300줄). 버린 id 수는 서버 기록에만
//   · sendMsg: 본사 안내(ataKey · 서버 확정본 글)는 업체 발신번호가 비어도 SMS_FROM 으로 보냄 (운영/06 I · 워시 v127). 일반 문자는 그대로 업체 번호 필수
//   · viewCar(청구서): 열 때마다 그 id 들의 장부를 다시 읽어 입금 완료·남은 금액·상태를 셈 (billLive). 줄마다 입금 여부만 더함
//     id 가 없는 옛 청구서 · 지워진 일감이 있는 청구서는 찍어 둔 값 그대로. 일감 id·메모·전화는 내보내지 않음
// sb14 (2026-10-15) 오픈 베타 말 다듬기 (규칙 4-1) — 오류 글은 표준형(~습니다)·「무엇이 안 됐고 어떻게 하면 되는지」,
//   알림·안내(note)는 해요체, 영어·코드·데이터베이스 원문은 사용자에게 안 보임(userMsg · 서버 기록에만). 새 창구 없음.
//   본사(관리) 화면의 설정 안내(비밀값 이름)는 대표님이 고칠 수 있게 그대로 둠.
// sb13 (2026-10-15) 홈페이지 첫 결제 (설계 15 «고친 설계» · 결제 방 03 길 A · 보안 방 재검토 조건) · 먼저 서버/sql/09 실행
//   · 가입 signup([…, 요금제]) — 공개 요금제면 «결제 대기»(pay_wait) 업체로 만들고 바로 로그인. trial/비우면 지금처럼 체험
//   · 결제 대기 업체: 좁은 목록 PAYWAIT_OK 만 · 체험판 쓰기는 늘 예시 칸(demo) · 예시 줄 수·크기 상한 · AI 3번(업체 + 대표 번호) ·
//     trialUse([기능]) 기능마다 3번(정해진 18개 이름만 · 한 번에 셈) · 결제는 월 요금(plan)만 · 체크 열쇠·직원 길도 같은 규칙
//   · 결제가 끝나면 «주문에 고정한 요금제»로 열림(바꿔치기 막기) · 예시 칸 비움 · 출입 명단(체크 쓰는 번호면 check 도)
//   · 관리 hqPayWait() · hqPayWaitDel([업체]) (ready/paid 주문이 있으면 거절 · 주문·장부는 남김) · 자유 가입 스위치·한도
//   · sb12 보안 낮음 반영: 관리 바꾸기는 기록을 먼저 남기고 실패하면 거절 · 기사 임시 비밀번호 문자 실패 안내 · hqPerson 시간당 120번
// sb12 (2026-10-15) 관리 한곳에서 (설계 14 · 보안 방 설계 검토 조건 1~5 반영) · 먼저 서버/sql/08 실행
//   · hqPayResults([시작일, 끝일, 꼬리표]) — 카드 주문·장부·자동 결제·환불·홈페이지·딜러 청구서(참고 금액)를 한 목록으로
//   · hqPerson([휴대폰 11자리]) · hqPersonAct([휴대폰, 동작, 대상, 확인]) · hqAudit([휴대폰?]) — 모든 제품 계정을 한곳에서
//     지킴: 본사 사람·본인 번호 제외 · 본사 한 명 시간당 30번(넘으면 멈추고 대표님 문자) · 바뀐 당사자에게 안내 문자 ·
//     기록(hq_audit)은 지우거나 고치는 창구 없음 · 체크 비밀번호 비우기는 관리 스위치(check_first_pw_sms)가 켜졌을 때만 ·
//     기사 임시 비밀번호는 10자 무작위로 그 기사 번호에 문자로만(응답·기록에 안 남김) + 바로 바꾸게(must_change · 체크 v30)
//   · 옛 «로그인 전 가입 결제» payStart([휴대폰, 상호, 요금제]) 는 끔 — 가입(로그인) 먼저, 로그인한 결제 창구로
//   · 체크 화면의 잠금 안내·공지(lockInfo·paidSay·noticeList·noticeHide)도 체크 열쇠로 워시 서버에서
//   · 장부(wash_payments) 줄에 주문번호(order_id)·어디서(source) — SQL 08 전이면 예전처럼 씀
//   아래는 먼저 넣은 것
//   · hqCheckWallets 줄마다 검사소 사업자번호(bizNo)·대표(ceo) — 관리 화면이 워시 업체와 나란히 비교(같은 회사만 잇기)
//   · 체크에서 만든 카드 주문은 who = "check:<검사소코드>" (관리 결제 목록의 «체크 · 검사소» 꼬리표)
// sb11 (2026-10-15) 고침: 로그인한 화면의 카드 결제 payStart 가 홈페이지 가입용 payStart 에 가려져 있던 것 (열쇠가 있으면 로그인 쪽)
// sb11 (2026-10-15) 체크 결제·캐시는 워시 서버 한 곳에서 (규칙 5-1 · 체크 방 요청 체크/요청서/2026-10-15_결제창v2_체크v30)
//   · 체크 로그인 열쇠(chk_…)로 결제 창구 6개(cashInfo·payDue·payStart·payConfirm·payMine·cashAsk)만 부를 수 있음
//   · 그 검사소의 «대표»만 · 경비실 명단에 체크 권한 · 돈은 검사소에 이어 둔 워시 지갑(check_office.wallet_shop) 하나로
//   · 지갑 잇기는 본사만: hqCheckWallet([검사소코드, 업체코드|""]) · hqCheckWallets() — 이어지지 않은 검사소는 «준비 중»
//   먼저 서버/sql/07 실행 (check_office.wallet_shop 칸)
// sb10 (2026-10-15) 결제 방 요청서(결제/요청서/2026-10-15_서버_결제_웹훅_환불_자동결제_v2) · 보안 방 결제 설계 검토 ①~⑥
//   (가) 웹훅 확인 창구 payCheck([주문번호]) — 결제 전용 함수 pay-hook 이 부름. 받은 내용은 주문번호만 쓰고 토스 조회 결과로만 반영
//       예약 실행 cronPay([cron_key]) — 30분 넘게 ready 인 주문을 토스에 다시 물어 정리 (+ 자동 결제)
//   (나) 환불 hqPgQuote([주문]) · hqPgCancel([주문, 사유, 금액]) — paid→canceled 를 한 번에 바꿔 두 번 환불 막기,
//       월 요금은 환불 비율만큼 이용기간을 «빼기», 캐시 충전은 안 쓴 캐시까지만(× 1.1) · 캐시는 마이너스 안 됨
//   (다) 자동 결제 billStart · billIssue · billInfo · billOff (대표만) — 관리 스위치 wash_hq.billing_on 이 꺼져 있으면 안 열림.
//       빌링키는 AES-GCM(PAY_ENC_KEY · 판 번호) 로 잠가 저장, 화면·기록 어디에도 안 내려감. (업체+결제일) 주문 줄을 먼저 만들고
//       Idempotency-Key. 캐시는 성공한 뒤에만 깎음. 실패면 D+1·3·5 다시, 그 뒤는 기존 잠금
//   (라) payStart 가 v2 결제창 값(customerKey: ANONYMOUS) 도 돌려줌
//   (마) 청구서를 휴대폰으로 보내면(ataKey bill) 그 번호를 보기코드에 적어 둠 → 딜러앱 myBills 가 «받은 번호 = 로그인 번호» 로만 보여 줌
//   · 화면이 sendMsg 로 고를 수 있는 ataKey 는 화면 안내 6개만 (자동 결제 알림 같은 서버 안내 키는 못 씀)
//   먼저 서버/sql/06 실행 (새 표·칸). 새 비밀값 이름: PAY_ENC_KEY · TOSS_BILLING_SECRET_KEY(선택) · TOSS_BILLING_CLIENT_KEY(선택)
// sb9 (2026-10-15) 보안 방 결제 설계 검토 [높음] — 카드 승인(payConfirm)을 두 번 와도 한 번만 반영
//   · 이용기간 늘리기(payDone)는 «ready → paid» 를 조건 걸고 한 번에 바꾼 쪽만 (새로고침 2번·웹훅+복귀가 겹쳐도 +30일 한 번)
//   · 승인 요청이 오류면 바로 failed 로 쓰지 않고 토스 조회로 진짜 상태를 본 뒤 씀(이미 끝난 결제를 failed 로 덮지 않음)
//   · 금액은 토스가 알려 준 totalAmount 와 주문 금액이 같을 때만 반영
// sb8 (2026-10-15) 알림톡 방 요청서(알림톡/04) 반영
//   ① 본사 «입금됨»(hqPayMark): 요금제 결제일 때만 결제완료. 요금제 코드가 아닌 건(캐시 충전 입금 등)은 결제완료를 보내지 않음
//      (충전완료는 본사가 실제로 캐시를 넣을 때 hqCashAdd 가 보냄 — 잔액이 맞게)
//   ② 빈 값: 서버가 채우는 업체 대표 안내(noticeAta)는 빈 값이 있으면 알림톡 대신 대체 문구 문자로(코드가 있을 때),
//      화면 안내(ataKey)의 상사명이 비면 «개인»
//   ③ «무료» 는 카카오 금지어 → 대표에게 가는 안내의 «무료 체험» 을 «체험 기간» 으로 (만료·잠금 안내 #{무엇} 값 포함)
//   ④ 새 키 staff_link(차곳간_접속주소안내 · 심사 뒤): #{접속주소} 는 서버가 «직원용 주소»(열쇠 없음)로만 채움
// sb7 (2026-10-15) 보안 방 sb5 검사 반영 + 관리 화면 이름 맞춤
//   ① ataKey 발송: 업체명·업체전화는 서버가 가진 값으로 덮어씀, 보기코드는 서버가 만듦(출고·추가작업 = 입고 기록 id 로) 또는
//      그 업체의 살아 있는 청구서 보기코드인지 확인 → 아니면 거절. 직원이 공식 채널로 가짜 링크를 못 보냄
//   ② 템플릿 키를 관리 화면(v4.1) 13개 이름으로: auth·cash_done·pay_done·intake·release·extra_work·bill·deposit_ok
//      ·expire_soon·use_limit·login_block·data_keep·balance. 창구 hqAta([ym]) → {pfSet, tpls, stats} · hqAtaSave([{키:코드}])
//   ③ 업체 대표에게 가는 문자에서 「충전하기 ▶」 같은 권유 문구 뺌
// sb6 (2026-10-15) 알림톡 — 2026-10-10 확정본(알림톡/00_확정본_13개_원문.md) 변수 이름·대체 문구에 글자까지 맞춤.
//   입금확인은 업체→거래처 안내(화면이 보냄)라 본사 결제 표시에서 빼고, 본사 «입금됨» 표시는 결제완료로. 입고안내(in) 추가.
//   화면이 ataKey 로 보낼 때 확정본 변수가 하나라도 빠지면 알림톡 대신 문자(실패 대신).
// sb5 (2026-10-15) 알림톡 전환 1단계 — noticeAta: 관리 설정(wash_hq.ata_cfg)에 템플릿 코드가 있으면 알림톡 먼저,
//   알림톡이 안 되면 솔라피가 문자로 대신 보냄(disableSms:false). 코드가 비어 있으면 지금처럼 문자.
//   인증번호는 알림톡(+문자 대체) · 충전완료·결제완료·입금확인은 새 안내라 알림톡 코드가 있을 때만(문자 비용 늘지 않게).
//   출고안내·청구서·추가작업은 화면이 sendMsg 에 ataKey 를 주면 본사 채널 템플릿으로. 먼저 서버/sql/05 실행(ata_cfg 칸).
//   ⚠ 변수 이름은 확정본 13개 원문과 글자까지 대조 대기 (ATA_TPL 표만 고치면 됨)
// sb4 (2026-10-15) 보안 ⑤ 1단계 — 사진을 «서명 주소»로 내줌(공개 주소 대신): 새 창구 shotLinks(사진id 목록) · 딜러 «차량 보기»도 서명 주소.
//   보관함(wash) 비공개 전환은 화면이 shotLinks 로 바뀐 뒤에 대표님이 함 (서버/설계/08). 새 비밀값(선택) SHOT_TTL(초, 기본 21600=6시간)
// sb3 (2026-10-15) 보안 방 재검사(2026-10-15) 반영 — 경비실 확인 열쇠를 전용 비밀값 CGG_INTERNAL_KEY 로,
//   [업체이름]은 글이 [ 로 시작해도 붙임(차곳간인 척 막기 · 이미 [우리 업체이름] 이면 그대로)
// sb2 (2026-10-15) 서버 방 — 경비실 명단(cgg_access)으로 워시 권한 확인 + 보안 방 검사(2026-10-14) 반영
//   ① 대표가 아니면 청구서·세금계산서 자료를 내려주지 않고, 직원 전화번호·설정 백업을 뺍니다
//   ② 직원 문자는 하루 횟수 제한 + 모든 문자 앞에 [업체이름]  ③ 횟수 장치가 고장 나면 막는 쪽으로, IP 는 꾸밀 수 없는 값만
//   ④ 직급을 바꾸면 그 사람의 로그인을 모두 끊음  ⑤(작은 것) 업체가 admin 직급을 못 줌 · 본사 비밀번호 6자 · 기기 끊기 와일드카드 거름
//   ⑥ 경비실(cgg-api)이 서버끼리 부를 때 손님 기기 정보(UA·IP)를 넘겨받음 — 서비스 열쇠로 확인
//   ※ 올리기 전에 wash_rate_bump 함수가 있는지 꼭 확인 (없으면 로그인·문자가 모두 막힙니다 — 서버/설계/02 참고)
// v42 (2026-10-10) 추가 작업 요청(딜러가 «진행/안 함» 을 누름) + 청구서 보기 화면
// v41 (2026-10-10) 차량 보기 — 출고 차는 «어디에 두었는지»가 주인공이 되게
// v40 (2026-10-10) 차량 보기 — «들어온 때» 가 비어 보이던 것 고침 (날짜 칸 이름 createdAt)
// v39 (2026-10-10) 딜러가 로그인 없이 보는 «차량 보기» 주소 (/v.html?c=…) — 알림톡 버튼용
// v38 (2026-09-29) 이중발급 막기 — 받는 곳 + 금액 + 비고가 같으면 멈추고 되물음
// v37 (2026-09-29) 같은 달에 같은 업체로 두 번째 계산서도 나가게 — 관리번호에 겹치지 않는 꼬리표
// v36 (2026-09-29) 팝빌 가입은 업체가 직접 — 앱에 링크아이디를 내려줍니다
// v35 (2026-09-29) 보낸 계산서 목록이 비어 보이던 것 고침 — 기록표의 줄번호 칸 이름은 no 입니다
// v34 (2026-09-29) 관리 계산서 발행 고침 — 본사 사업자번호는 본사표에서 읽습니다 + 못 보낸 것도 기록에 남깁니다
// v33 (2026-09-29) 앱 «우리 사업장» 을 저장하면 서버 업체 정보에도 같이 들어갑니다 + 팝빌 가입 제한 안내
// v32 (2026-09-28) 팝빌에 업체를 «연동회원» 으로 넣기 + 인증서 확인 + 입금 확인(수금) 자리
// v31 (2026-09-27) 날짜 칸(체험 끝나는 날 등)이 시각까지 붙은 형태여도 남은 일수·만료 판정이 맞게 — 9곳
// v30 (2026-09-27) 돈이 움직이는 기능(계산서 발행·결제)을 대표만 쓰도록 잠금 + 청구서·계산서 자료도 대표만
// v29 (2026-09-27) 「가입 권한」을 「가입 코드」로 (앱·관리·홈페이지와 같은 말로)
// v28 (2026-09-27) 차곳간 대표번호를 010-9559-3663 으로 (가온진단평가와 분리)
// v27 (2026-09-26) 공지사항 — 관리에서 한 번 쓰면 앱·홈페이지에 같이 올라갑니다
// v26 (2026-09-26) 계정 권한에 «매니저» 추가 (PC 접속 가능 · 정산·설정 빼고 보기)
// v25 (2026-09-26) 이용기간이 끝난 뒤 잠금(7일) → 차단 → 90일 뒤 자료 정리
// v24 (2026-09-26) 카드 결제(PG) 준비 + 월 이용요금 결제 + 캐시 지갑 + 만료 안내 문자 자동발송 + 운영 현황(용량·고정비) 창 추가 + 안전장치 보강 + 관리 사용량 표시 + 보안 점검 창 + 대표번호(SMS_FROM) 통일 — 권한 확인 강제, 문자·계산서 건수 강제 차단,
//   문자 폭탄 방지, 업체별 파일·계산서 칸막이, 인증번호/로그인 조이기.
//   ※ 먼저 1_수파베이스_SQL_안전장치.sql 을 돌려 주세요 (없으면 일부 장치가 꺼진 채 돕니다)
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto as stdCrypto } from "jsr:@std/crypto@1";
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding@1/base64";

const VER = "sb27";
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const env = (k: string, d = "") => (Deno.env.get(k) || d).trim();
const COLS = ["staff", "settings", "intakes", "outbox", "bills", "companies", "dealers",
  "materials", "matlogs", "vendors", "taxdocs", "trash", "memos"];
const BUCKET = "wash";
/* 대표만 고칠 수 있는 표 — 직원이 자기 권한을 바꾸지 못하게 합니다 */
const OWNER_COLS = ["staff", "settings", "bills", "taxdocs"];
/* 계정 권한은 이 셋뿐입니다.
     owner   대표    — 전부
     manager 매니저  — PC 도 되고, 정산(청구·입출금·세금계산서)과 설정만 뺍니다
     staff   직원    — 현장(휴대폰)에서 입고·출고만                          */
function normRole(v: unknown) {
  const r = String(v || "staff").trim().toLowerCase();
  if (r === "owner" || r === "admin") return r === "admin" ? "admin" : "owner";
  if (r === "manager" || r === "매니저") return "manager";
  return "staff";
}
/* 매니저까지 허용하는 자리 */
function managerOk(ss: any) {
  if (!ss) throw new Error("다시 로그인해 주세요");
  const r = String(ss.role || "");
  if (r !== "owner" && r !== "admin" && r !== "manager")
    throw new Error("대표 또는 매니저만 할 수 있습니다");
}
/* 예전 «업체 주소(?shop=&key=)» 방식은 기본으로 잠급니다. 되살리려면 Secrets 에 ALLOW_LEGACY_KEY=1 */
const LEGACY_OK = () => env("ALLOW_LEGACY_KEY", "0") === "1";
/* 올릴 수 있는 파일 종류 */
const MIME_OK = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/json"];
/* 체험 기본 한도 (업체별로 wash_shops.trial_sms / trial_tax 로 바꿀 수 있습니다) */
const TRIAL_SMS = 300, TRIAL_TAX = 20;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};
const out = (o: unknown) => {
  /* sb14: 오류 글은 늘 다듬어서 (본사 응답은 __raw 로 그대로) */
  const x: any = o;
  if (x && typeof x === "object" && typeof x.__err === "string") {
    if (!x.__raw) x.__err = userMsg(x.__err);
    delete x.__raw;
  }
  return new Response(JSON.stringify(x), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
};

/* ---------- 횟수 제한 (DB 에서 한 번에 세고 올립니다) ----------
   sb2: 세는 장치(wash_rate_bump)가 고장 나거나 없으면 «막는 쪽»입니다. 올리기 전에 함수가 있는지 확인하세요. */
async function rateOk(key: string, max: number) {
  try {
    const { data, error } = await sb.rpc("wash_rate_bump", { p_key: key, p_max: max });
    if (error) { console.error("rateOk", key, error.message); return false; }
    return data !== false;
  } catch (e) { console.error("rateOk", key, e); return false; }
}
/* 손님 IP — 손님이 꾸밀 수 있는 x-forwarded-for 의 맨 앞 값은 쓰지 않습니다.
   cf-connecting-ip(앞단이 붙임) → 없으면 x-forwarded-for 의 맨 뒤(가장 가까운 앞단이 붙인 값) */
function ipOf(req: Request) {
  const cf = String(req.headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf;
  const xs = String(req.headers.get("x-forwarded-for") || "").split(",").map((x) => x.trim()).filter(Boolean);
  return xs[xs.length - 1] || "0";
}
/* 경비실(cgg-api)이 서버끼리 부를 때만 — 전용 비밀값(CGG_INTERNAL_KEY)이 맞으면 손님의 UA·IP 를 넘겨받습니다
   sb3: 서비스 열쇠 대신 전용 비밀값. 비밀값이 없거나 짧으면 넘겨받지 않습니다(예전처럼 동작). */
function internalOk(req: Request) {
  const key = env("CGG_INTERNAL_KEY");
  if (key.length < 32) return false;
  const got = String(req.headers.get("x-cgg-internal") || "");
  if (!key || got.length !== key.length) return false;
  let d = 0;
  for (let i = 0; i < key.length; i++) d |= key.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

/* ---------- 경비실 출입 명단 (cgg_access) ----------
   명단에 있는 번호: active 이고 products 에 wash 가 있어야 합니다.
   명단에 없는 번호: 예전처럼 통과 (워시만 쓰는 손님이 멈추지 않게). 표가 없어도 통과. 본사(ADMIN)는 보지 않습니다. */
async function needWash(phone: string) {
  const { data, error } = await sb.from("cgg_access").select("products,active").eq("phone", String(phone || "")).maybeSingle();
  if (error || !data) return;
  const list: string[] = Array.isArray(data.products) ? data.products : [];
  if (data.active === false || list.indexOf("wash") < 0)
    throw new Error("이 계정은 워시를 쓸 권한이 없습니다. 대표님께 권한을 받아 주세요");
}

/* ---------- sb11: 체크 로그인으로 결제 창구 부르기 ----------
   체크 화면은 체크 열쇠(chk_)만 가짐 → 체크 세션·검사소 대표인지 확인 → 그 검사소에 이어 둔 워시 지갑으로 처리 */
const CHECK_PAY: Record<string, number> = { cashInfo: 1, payDue: 1, payStart: 1, payConfirm: 1, payMine: 1, cashAsk: 1, paidSay: 1 };
/* sb12: 대표가 아니어도 볼 수 있는 것 — 잠금 안내 · 공지 */
const CHECK_VIEW: Record<string, number> = { lockInfo: 1, noticeList: 1, noticeHide: 1 };
async function checkPaySs(token: string, officeCode: string, needOwner = true) {
  const { data: cs } = await sb.from("check_session").select("sid,phone,office_id,role,expires_at").eq("sid", token).maybeSingle();
  if (!cs || (cs.expires_at && new Date(String(cs.expires_at)).getTime() < Date.now()))
    throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
  const phone = digits(String(cs.phone || ""));
  /* 경비실 명단 — 명단에 있으면 체크 권한이 있어야 (체크 서버 needCheck 와 같음) */
  const { data: acc, error: ae } = await sb.from("cgg_access").select("products,active").eq("phone", phone).maybeSingle();
  if (!ae && acc) {
    const list: string[] = Array.isArray(acc.products) ? acc.products : [];
    if (acc.active === false || list.indexOf("check") < 0) throw new Error("이 계정은 체크를 쓸 권한이 없습니다. 대표님께 권한을 받아 주세요.");
  }
  const code = String(officeCode || "").trim().toUpperCase();
  const q = sb.from("check_office").select("id,code,name,wallet_shop");
  const { data: office } = code ? await q.eq("code", code).maybeSingle() : await q.eq("id", cs.office_id).maybeSingle();
  if (!office) throw new Error("검사소를 찾지 못했습니다.");
  const { data: me } = await sb.from("check_user").select("role,active").eq("office_id", office.id).eq("phone", phone).maybeSingle();
  if (!me || me.active === false) throw new Error("이 검사소에 들어갈 권한이 없습니다.");
  if (needOwner && String(me.role) !== "owner") throw new Error("결제·캐시는 검사소 대표만 할 수 있습니다");
  const wallet = String(office.wallet_shop || "");
  return { wallet, office: String(office.code),
    ss: { sid: token, phone, shop: wallet, role: needOwner ? "owner" : String(me.role || "staff"), via: "check", office: String(office.code) } };
}

/* sb12: 자동 결제 실패 중이면 다음 시도일 (D+1·3·5 · 마지막 뒤엔 "") */
function billNextTry(row: any) {
  if (!row || row.status !== "on" || !row.first_fail_at) return "";
  const first = ymd10(row.first_fail_at), today = new Date(kstToday()).toISOString().slice(0, 10);
  for (const d of [1, 3, 5]) { const t = ymdAdd(first, d); if (t >= today) return t; }
  return "";
}

/* ===== 사용자에게 보이는 오류 글 다듬기 (규칙 4-1 · 오픈 베타) =====
   영어·코드·데이터베이스 원문은 사용자에게 보이지 않게 하고 서버 기록에만 남깁니다. */
const MSG_OK_WORDS = /\b(TEST|SMS|LMS|MMS|PDF|JPG|PNG|CSV|URL|QR|GAON)\b|[a-z0-9-]+(\.[a-z0-9-]+)*\.(co\.kr|com)\b/gi;
const MSG_HELP = "잠시 뒤 다시 해 주세요. 계속되면 차곳간(010-9559-3663)으로 알려 주세요.";
function userMsg(raw: unknown): string {
  const m = String(raw ?? "").trim().replace(/관리/g, "관리");
  if (!m) return "처리하지 못했습니다. " + MSG_HELP;
  const probe = m.replace(MSG_OK_WORDS, "");
  if (!/[A-Za-z]{3,}/.test(probe)) return m;
  /* 보안 낮음 b: 기록에도 휴대폰·계좌 같은 긴 숫자(8자리 이상)는 가운데를 가림 */
  console.error("userMsg hidden:", m.slice(0, 300).replace(/\d[\d-]{8,}\d/g, (d) => d.slice(0, 3) + "****" + d.slice(-4)));
  const head = m.split(/\s*[:(—]\s*/)[0].trim();
  if (head && /[가-힣]/.test(head) && !/[A-Za-z]{3,}/.test(head.replace(MSG_OK_WORDS, "")))
    return head.replace(/\s*실패$/, "에 실패했습니다").replace(/[.\s]*$/, ".") + " " + MSG_HELP;
  return "처리하지 못했습니다. " + MSG_HELP;
}

/* ---------- sb13: 결제 대기 업체 (홈페이지 첫 결제) ---------- */
/* 결제 대기 업체가 쓸 수 있는 창구 — LOCK_OK 와 따로 (본사에 문자가 가는 cashAsk·paidSay 등은 없음) */
const PAYWAIT_OK: Record<string, number> = {
  apiVer: 1, ping: 1, lockInfo: 1, noticeList: 1, noticeHide: 1,
  payDue: 1, payStart: 1, payConfirm: 1, payMine: 1, joinPlanSet: 1, planList: 1,
  apiStamp: 1, apiLoad: 1, apiSet: 1, apiSetMany: 1, apiDel: 1, apiWipeDemo: 1,
  aiReady: 1, aiJson: 1, trialUse: 1,
};
/* 체험판 «편한 기능 3번» 이름 (워시/기획/2026-10-14_체험판_기능_분류표.md ③ 18개) */
const TRIAL_FEATURES = ["intake", "plate_ai", "intake_body", "release", "calendar_memo", "paid_mark", "edit_delete",
  "msg_text_edit", "bill_make", "bill_preview", "stock_edit", "biz_info", "release_cfg", "partners", "price_table",
  "destinations", "notify_cfg", "trash_restore"];
const TRIAL_MAX = 3, AI_TRIAL_MAX = 3, DEMO_ROWS_MAX = 600, DEMO_ROW_BYTES = 20000;
const _pwBox = new Map<string, { at: number; v: any }>();
async function payWaitOf(shop: string) {
  if (!shop || shop === "ADMIN") return null;
  const hit = _pwBox.get(shop);
  if (hit && Date.now() - hit.at < 30000) return hit.v;
  let v: any = null;
  try {
    const { data, error } = await sb.from("wash_shops").select("pay_wait,join_plan,owner_phone,name").eq("shop", shop).maybeSingle();
    if (!error && data && data.pay_wait === true) v = { joinPlan: String(data.join_plan || ""), owner: digits(data.owner_phone), name: data.name };
  } catch (_) { v = null; }                 // 칸이 없으면(SQL 09 전) 결제 대기 업체가 없는 것
  _pwBox.set(shop, { at: Date.now(), v });
  return v;
}
function payWaitClear(shop: string) { _pwBox.delete(shop); _lockBox.delete(shop); }
async function trialBump(key: string, max: number) {
  const { data, error } = await sb.rpc("wash_trial_bump", { p_key: key, p_max: max });
  if (error) throw new Error("체험판을 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  return data !== false;
}
async function publicPlan(code: string) {
  const { data } = await sb.from("wash_plans").select("code,name,price,active").eq("code", code).maybeSingle();
  return (data && data.active !== false && Number(data.price) > 0) ? data : null;
}
/* 결제 대기 → 이용 중 (월 요금 결제가 반영됐을 때 · 주문에 고정한 요금제로) */
async function payWaitOpen(od: any) {
  const shop = String(od.shop);
  const pw = await payWaitOf(shop);
  if (!pw || String(od.kind) !== "plan") return;
  /* 보안 낮음 ①: 주문에 고정한 요금제가 없으면 열지 않고 기록만 (관리 결제 대기 목록에 «결제된 주문 있음» 으로 보임) */
  const plan = String(od.plan_code || "");
  if (!plan) { console.error("payWaitOpen no plan_code", String(od.order_id)); return; }
  await sb.from("wash_shops").update({ pay_wait: false, join_plan: null, plan }).eq("shop", shop).eq("pay_wait", true);
  payWaitClear(shop);
  try { await sb.from("wash_docs").delete().eq("shop", shop).eq("demo", true); await write(shop, true, []); } catch (_) { /* */ }
  /* 출입 명단 — 줄이 없으면 새로(체크를 쓰는 번호면 check 도), 있으면 wash 만 더함. 관리 권한은 안 넣음 */
  try {
    const owner = pw.owner;
    const { data: ca } = await sb.from("cgg_access").select("products").eq("phone", owner).maybeSingle();
    if (ca) {
      const list: string[] = Array.isArray(ca.products) ? ca.products.map(String) : [];
      if (list.indexOf("wash") < 0) await sb.from("cgg_access").update({ products: list.concat(["wash"]) }).eq("phone", owner);
    } else {
      const { data: cu } = await sb.from("check_user").select("phone").eq("phone", owner).eq("active", true).limit(1);
      const products = (cu && cu.length) ? ["wash", "check"] : ["wash"];
      await sb.from("cgg_access").insert({ phone: owner, products, active: true, two_step: false, fail_count: 0 });
    }
  } catch (_) { /* 명단 표가 없으면 넘어감 */ }
}
async function payWaitGate(shop: string, fn: string, args: any[], ss: any): Promise<{ block?: any; args?: any[] }> {
  const pw = await payWaitOf(shop);
  if (!pw) return {};
  const lock = { state: "pay", kind: "pay", joinPlan: pw.joinPlan, shop, name: pw.name,
    msg: "결제를 마치면 모든 기능이 열려요. 지금은 예시 자료로 둘러볼 수 있어요." };
  if (!PAYWAIT_OK[fn]) return { block: { __err: "결제를 마치면 쓸 수 있는 기능입니다.", __lock: lock } };
  const a = args.slice();
  /* 체험판 쓰기·읽기는 늘 예시 칸으로 */
  if (fn === "apiStamp" || fn === "apiLoad") a[0] = true;
  if (fn === "apiSet") {
    a[3] = true;
    if (JSON.stringify(a[2] ?? "").length > DEMO_ROW_BYTES) return { block: { __err: "체험판에서는 큰 자료를 넣을 수 없습니다", __lock: lock } };
  }
  if (fn === "apiSetMany") {
    a[1] = true;
    const rows = typeof a[0] === "string" ? JSON.parse(a[0]) : a[0];
    if (!Array.isArray(rows) || rows.length > 50 || rows.some((r: any) => JSON.stringify((r && r.data) ?? "").length > DEMO_ROW_BYTES))
      return { block: { __err: "체험판에서는 한 번에 많은 자료를 넣을 수 없습니다", __lock: lock } };
  }
  if (fn === "apiDel") a[2] = true;
  if (fn === "apiSet" || fn === "apiSetMany") {
    const { data: cnt } = await sb.from("wash_docs").select("id").eq("shop", shop).eq("demo", true).limit(DEMO_ROWS_MAX + 1);
    if ((cnt || []).length >= DEMO_ROWS_MAX) return { block: { __err: "체험판 예시 자료가 가득 찼습니다", __lock: lock } };
  }
  if (fn === "aiJson") {
    /* AI 번호판 읽기 맛보기 — 업체 3번 + 대표 번호 3번 (업체를 지우고 다시 가입해도 번호 기준은 남음) */
    if (!await trialBump("ai:shop:" + shop, AI_TRIAL_MAX) || !await trialBump("ai:phone:" + pw.owner, AI_TRIAL_MAX))
      return { block: { __err: "체험판 AI 읽기 3번을 모두 쓰셨습니다. 결제하시면 계속 쓰실 수 있어요.", __lock: lock } };
  }
  if (fn === "payStart" && String(a[0] || "") !== "plan")
    return { block: { __err: "지금은 월 요금 결제만 할 수 있습니다", __lock: lock } };
  if (fn === "payStart") { a[1] = 0; a[2] = 0; }     // 결제 대기 업체는 캐시를 쓰지 않음
  void ss;
  return { args: a };
}

/* ---------- sb12: 관리 한곳에서 — 도우미 ---------- */
function fullPhone(v: unknown) {
  const p = digits(String(v || ""));
  if (!/^01\d{8,9}$/.test(p)) throw new Error("휴대폰 번호 전체(01012345678)를 넣어 주세요");
  return p;
}
async function hqAuditLog(ss: any, action: string, target: string, product: string, result: string, detail?: unknown): Promise<boolean> {
  try {
    const { error } = await sb.from("hq_audit").insert({ who: digits(ss && ss.phone), sid_tail: String((ss && ss.sid) || "").slice(-6),
      ip: String((ss && ss.ip) || "").slice(0, 64), ua: String((ss && ss.ua) || "").slice(0, 200),
      action, target_phone: target, product, result: String(result).slice(0, 120), detail: detail ?? null });
    return !error;
  } catch (_) { return false; }       /* sb13: 성공 여부를 돌려줌 — 바꾸기는 기록이 안 되면 거절 */
}
/* sb15(보안 W-M3): 옛 본사 계정 도구(hqUserSave·hqUserPw·hqUserDel)도 hqPersonAct 와 같은 규칙 —
   본인·본사 계정 제외 · 시간당 한도 · 기록을 먼저 남기고 못 남기면 멈춤 */
async function hqOldGuard(ss: any, phone: string, act: string) {
  const p = digits(phone);
  if (!p) throw new Error("계정을 찾지 못했습니다");
  if (ss && digits(ss.phone) === p) throw new Error("지금 로그인한 본인 번호는 여기서 바꿀 수 없습니다");
  const { data: adm } = await sb.from("wash_users").select("shop").eq("phone", phone).eq("shop", "ADMIN").maybeSingle();
  if (adm) throw new Error("본사 계정은 여기서 바꿀 수 없습니다");
  const hour = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 13);
  if (!await rateOk("hqact:" + digits(ss && ss.phone) + ":" + hour, Number(env("HQ_ACT_MAX_HOUR", "30"))))
    throw new Error("한 시간에 바꿀 수 있는 횟수를 넘었습니다. 잠시 뒤 다시 해 주세요");
  if (!await hqAuditLog(ss, act, p, "wash", "try")) throw new Error("기록을 남기지 못해 멈췄습니다 (SQL 08 확인)");
}
async function checkPwSmsOn() {
  try { const { data } = await sb.from("wash_hq").select("check_first_pw_sms").eq("id", 1).maybeSingle(); return !!(data && data.check_first_pw_sms); }
  catch (_) { return false; }
}
const hexOf = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
async function chkPwHash(pw: string) {     // 체크 서버와 같은 모양 (소금 16바이트 hex $ PBKDF2-SHA256 120000)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return hexOf(salt) + "$" + hexOf(new Uint8Array(bits));
}
function tempPw(n = 10) {
  const A = "abcdefghjkmnpqrstuvwxyz23456789";               // 헷갈리는 글자(0 o 1 l i) 뺌
  const r = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(r).map((x) => A[x % A.length]).join("");
}
async function personOf(phone: string) {
  const safe = async (f: () => Promise<any>, d: any) => { try { return await f(); } catch (_) { return d; } };
  const wash = await safe(async () => (await sb.from("wash_users").select("shop,name,role,active,last_login").eq("phone", phone)).data || [], []);
  const owns = await safe(async () => (await sb.from("wash_shops").select("shop,name,active").eq("owner_phone", phone)).data || [], []);
  const offices: Record<string, any> = {};
  const cu = await safe(async () => (await sb.from("check_user").select("office_id,name,role,active,pw_hash").eq("phone", phone)).data || [], []);
  const dr = await safe(async () => (await sb.from("check_deliv_driver").select("id,office_id,name,active,last_in,must_change").eq("tel", phone)).data || [], []);
  const offIds = Array.from(new Set([...cu, ...dr].map((x: any) => x.office_id)));
  if (offIds.length) {
    const of = await safe(async () => (await sb.from("check_office").select("id,code,name").in("id", offIds)).data || [], []);
    of.forEach((o: any) => (offices[o.id] = o));
  }
  const check = cu.map((u: any) => ({ office: offices[u.office_id]?.code || "", officeName: offices[u.office_id]?.name || "",
    name: u.name || "", role: u.role || "", active: u.active !== false, pwSet: !!u.pw_hash }));
  const drivers = dr.map((d: any) => ({ id: String(d.id), office: offices[d.office_id]?.code || "", officeName: offices[d.office_id]?.name || "",
    name: d.name || "", active: d.active !== false, lastIn: d.last_in || "", mustChange: d.must_change === true }));
  const du = await safe(async () => (await sb.from("dealer_users").select("name,active,withdrawn_at,last_login").eq("phone", phone).maybeSingle()).data, null);
  const ca = await safe(async () => (await sb.from("cgg_access").select("name,products,active,two_step,fail_count,locked_until").eq("phone", phone).maybeSingle()).data, null);
  const now = new Date().toISOString();
  const cnt = async (t: string) => await safe(async () => ((await sb.from(t).select("sid").eq("phone", phone).gt("expires_at", now)).data || []).length, 0);
  const pwfail = await safe(async () => ((await sb.from("wash_rate").select("key").eq("key", "pwfail:" + phone)).data || []).length > 0, false);
  const ckfail = await safe(async () => ((await sb.from("check_deliv_fail").select("key,locked_until").in("key", ["office:" + phone, "pwcode:" + phone])).data || []), []);
  return {
    wash, washOwnerOf: owns, check, drivers,
    dealer: du ? { name: du.name || "", active: du.active !== false, withdrawn: !!du.withdrawn_at, lastLogin: du.last_login || "" } : null,
    cgg: ca ? { name: ca.name || "", products: ca.products || [], active: ca.active !== false, twoStep: !!ca.two_step,
      locked: !!(ca.locked_until && String(ca.locked_until) > now) } : null,
    locks: { wash: pwfail, check: ckfail.some((k: any) => k.locked_until && String(k.locked_until) > now), cgg: !!(ca && ca.locked_until && String(ca.locked_until) > now) },
    sessions: { wash: await cnt("wash_sessions"), check: await cnt("check_session"), cgg: await cnt("cgg_session"), dealer: await cnt("dealer_sessions") },
  };
}
async function officeIdOf(code: string) {
  const { data } = await sb.from("check_office").select("id").eq("code", String(code || "").toUpperCase()).maybeSingle();
  if (!data) throw new Error("검사소를 찾지 못했습니다: " + code);
  return String(data.id);
}
async function personAct(phone: string, act: string, target: string, confirmed: boolean): Promise<any> {
  const now = new Date().toISOString();
  const kick = async (what: string) => {
    if (what === "wash" || what === "all") await sb.from("wash_sessions").delete().eq("phone", phone);
    if (what === "check" || what === "all") await sb.from("check_session").delete().eq("phone", phone);
    if (what === "cgg" || what === "all") await sb.from("cgg_session").delete().eq("phone", phone);
    if (what === "dealer" || what === "all") await sb.from("dealer_sessions").delete().eq("phone", phone);
    if (what === "driver" || what === "all") await sb.from("check_deliv_driver").update({ token: null }).eq("tel", phone);
  };
  const [kind, arg] = target.split(":");
  if (act === "stop" || act === "resume") {
    const on = act === "resume";
    const all = target === "all";
    if (all || kind === "wash") { await sb.from("wash_users").update({ active: on }).eq("phone", phone).neq("shop", "ADMIN"); if (!on) await kick("wash"); }
    if (all || kind === "check") {
      let q = sb.from("check_user").update({ active: on }).eq("phone", phone);
      if (!all) q = q.eq("office_id", await officeIdOf(arg));
      await q; if (!on) await kick("check");
    }
    if (all || kind === "driver") {
      let q = sb.from("check_deliv_driver").update(on ? { active: true } : { active: false, token: null }).eq("tel", phone);
      if (!all) q = q.eq("id", arg);
      await q;
    }
    if (all || kind === "dealer") { await sb.from("dealer_users").update({ active: on }).eq("phone", phone); if (!on) await kick("dealer"); }
    if (all || kind === "cgg") { await sb.from("cgg_access").update({ active: on }).eq("phone", phone); if (!on) await kick("cgg"); }
    if (!all && ["wash", "check", "driver", "dealer", "cgg"].indexOf(kind) < 0) throw new Error("대상을 고르세요");
    return {};
  }
  if (act === "kick") {
    if (["wash", "check", "cgg", "dealer", "driver", "all"].indexOf(kind) < 0) throw new Error("대상을 고르세요");
    await kick(kind);
    return {};
  }
  if (act === "unlock") {
    const all = target === "all";
    if (all || kind === "wash") await sb.from("wash_rate").delete().eq("key", "pwfail:" + phone);
    if (all || kind === "check") await sb.from("check_deliv_fail").delete().in("key", ["office:" + phone, "pwcode:" + phone]);
    if (all || kind === "driver") {
      const { data: ds } = await sb.from("check_deliv_driver").select("office_id,name").eq("tel", phone);
      const keys = (ds || []).map((d: any) => String(d.office_id) + ":" + String(d.name));
      if (keys.length) await sb.from("check_deliv_fail").delete().in("key", keys);
    }
    if (all || kind === "cgg") await sb.from("cgg_access").update({ fail_count: 0, locked_until: null }).eq("phone", phone);
    if (all || kind === "dealer") await sb.from("dealer_otp").update({ tries: 0 }).eq("phone", phone);
    return {};
  }
  if (act === "pwReset") {
    if (kind === "wash") {
      /* 못 쓰는 값으로 바꾸고 끊음 → 본인이 «비밀번호 찾기»(문자 인증)로 새로 정함 */
      await sb.from("wash_users").update({ pw_hash: await pwHash(randHex(24)) }).eq("phone", phone).neq("shop", "ADMIN");
      await kick("wash");
      return { note: "본인이 «비밀번호 찾기»(문자 인증)로 새로 정해요" };
    }
    if (kind === "check") {
      if (!await checkPwSmsOn())
        throw new Error("체크 첫 비밀번호 문자 확인(체크 서버 v26 이상)이 운영 중일 때만 됩니다. 관리 설정에서 먼저 켜 주세요");
      const oid = await officeIdOf(arg);
      await sb.from("check_user").update({ pw_hash: null }).eq("phone", phone).eq("office_id", oid);
      try { await sb.from("check_pw_first").delete().eq("phone", phone); } catch (_) { /* */ }
      await kick("check");
      return { note: "다음 로그인 때 본인 휴대폰 확인 번호로 새 비밀번호를 정해요" };
    }
    if (kind === "driver") {
      const { data: d } = await sb.from("check_deliv_driver").select("id,tel").eq("id", arg).eq("tel", phone).maybeSingle();
      if (!d) throw new Error("이 번호의 기사를 찾지 못했습니다");
      const pw = tempPw(10);
      const { error } = await sb.from("check_deliv_driver").update({ pw_hash: await chkPwHash(pw), token: null, must_change: true }).eq("id", d.id);
      if (error) throw new Error("기사 표에 칸이 없습니다 (SQL 08 을 먼저 실행해 주세요)");
      /* 임시 비밀번호는 그 기사 번호에 문자로만 — 응답·기록에 안 남김 */
      try { await noticeSms(phone, "[차곳간체크] 임시 비밀번호 " + pw + " — 로그인하면 바로 새 비밀번호로 바꿔 주세요.", { tpl: "check_temp_pw" }); }
      catch (_) { return { note: "문자를 보내지 못했어요. [비밀번호 초기화]를 다시 눌러 주세요 (지금 임시 비밀번호는 쓸 수 없어요)", sent: false }; }
      return { note: "임시 비밀번호를 기사 휴대폰으로 보냈어요", sent: true };
    }
    throw new Error("대상을 고르세요");
  }
  if (act === "grant" || act === "revoke") {
    if (kind !== "wash" && kind !== "check") throw new Error("열고 닫을 수 있는 제품은 워시·체크뿐입니다");
    const { data: ca } = await sb.from("cgg_access").select("products").eq("phone", phone).maybeSingle();
    const list: string[] = ca && Array.isArray(ca.products) ? ca.products.map(String) : [];
    if (act === "grant") {
      if (!ca) {
        if (!confirmed) {
          const other = kind === "wash" ? "체크" : "워시";
          return { confirm: true, why: "출입 명단에 처음 넣으면 " + other + " 는 막힙니다. 둘 다 쓰는 분이면 둘 다 열어 주세요." };
        }
        const { error } = await sb.from("cgg_access").insert({ phone, products: [kind], active: true, two_step: false, fail_count: 0 });
        if (error) throw new Error("출입 명단에 넣지 못했습니다");
        return {};
      }
      if (list.indexOf(kind) < 0) await sb.from("cgg_access").update({ products: list.concat([kind]) }).eq("phone", phone);
      return {};
    }
    if (!ca) return {};
    await sb.from("cgg_access").update({ products: list.filter((x) => x !== kind) }).eq("phone", phone);
    await kick(kind === "wash" ? "wash" : "check");
    return {};
  }
  void now;
  throw new Error("동작을 고르세요");
}

/* ---------- 업체 열쇠 확인 (1분 동안 기억) ---------- */
let shopCache: { at: number; map: Record<string, { token: string; name: string; active?: boolean }> } = { at: 0, map: {} };
async function checkShop(shop: string, token: string) {
  if (Date.now() - shopCache.at > 60_000 || !shopCache.map[shop]) {
    const { data, error } = await sb.from("wash_shops").select("shop,token,name,active");
    if (error) throw new Error("업체 목록을 읽지 못했습니다: " + error.message);
    const m: Record<string, { token: string; name: string; active?: boolean }> = {};
    (data || []).forEach((r: any) => (m[r.shop] = { token: r.token, name: r.name, active: r.active }));
    shopCache = { at: Date.now(), map: m };
  }
  const s = shopCache.map[shop];
  if (!s) throw new Error("등록되지 않은 업체입니다: " + shop);
  if (s.token !== token) throw new Error("보안 열쇠가 맞지 않습니다 — 업체 주소를 다시 받아 주세요");
  if (s.active === false) throw new Error("이용이 멈춰 있는 업체입니다. 차곳간으로 연락해 주세요");
  return s;
}

/* ---------- 자료 ---------- */
async function revGet(shop: string, demo: boolean) {
  const { data } = await sb.from("wash_rev").select("rev").eq("shop", shop).eq("demo", demo).maybeSingle();
  return String(data?.rev ?? 1);
}
async function write(shop: string, demo: boolean, rows: any[]) {
  const clean = rows
    .filter((r) => r && COLS.includes(r.col) && r.id !== undefined && r.id !== null && r.id !== "")
    .map((r) => ({
      col: r.col, id: String(r.id),
      data: r.data === null || r.data === undefined ? null
        : typeof r.data === "string" ? JSON.parse(r.data) : r.data,
    }));
  const { data, error } = await sb.rpc("wash_write", { p_shop: shop, p_demo: demo, p_rows: clean });
  if (error) throw new Error("저장 실패: " + error.message);
  return String(data);
}
async function apiLoad(shop: string, demo: boolean, ss?: any) {
  const [{ data, error }, rev] = await Promise.all([
    sb.rpc("wash_load", { p_shop: shop, p_demo: demo }),
    revGet(shop, demo),
  ]);
  if (error) throw new Error("불러오기 실패: " + error.message);
  const o: any = data || {};
  COLS.forEach((c) => (o[c] = o[c] || {}));
  /* sb2: 대표가 아니면 돈 자료(청구서·세금계산서)는 비워서 보내고, 직원 전화번호와 설정 백업(bak_)을 뺍니다.
     직원 명단의 이름·직급·4자리 코드와 설정(config 등)은 직원 화면이 쓰므로 남깁니다. */
  const role = String((ss && ss.role) || "");
  if (ss && role !== "owner" && role !== "admin") {
    o.bills = {}; o.taxdocs = {};
    const st: any = {};
    Object.keys(o.staff).forEach((k) => {
      const p = o.staff[k];
      st[k] = p && typeof p === "object" ? Object.assign({}, p, { phone: "" }) : p;
    });
    o.staff = st;
    const cfg: any = {};
    Object.keys(o.settings).forEach((k) => { if (k.indexOf("bak_") !== 0) cfg[k] = o.settings[k]; });
    o.settings = cfg;
  }
  o.__rev = rev;
  o.__fast = 1;
  return o;
}

/* ---------- 사진·파일 ---------- */
function extOf(mime: string) {
  if (/json/.test(mime)) return "json";
  if (/png/.test(mime)) return "png";
  if (/pdf/.test(mime)) return "pdf";
  return "jpg";
}
async function upload(shop: string, b64: string, mime: string) {
  mime = String(mime || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (MIME_OK.indexOf(mime) < 0) mime = "image/jpeg";   // 모르는 종류는 사진으로 고정합니다
  const d = new Date();
  const ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0");
  const path = `${shop}/${ym}/wash_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extOf(mime)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, decodeBase64(b64), { contentType: mime, upsert: false });
  if (error) throw new Error("사진 저장 실패: " + error.message);
  return "sb/" + path;           // 화면은 'sb/…' 로 시작하면 새 보관함 사진으로 압니다
}
async function fileBytes(id: string, shop?: string): Promise<Uint8Array> {
  if (id.startsWith("sb/")) {
    const path = id.slice(3);
    /* 자기 업체 폴더 안의 파일만 받을 수 있습니다 (남의 업체 사진 열람 차단) */
    if (shop && shop !== "ADMIN" && !path.startsWith(shop + "/"))
      throw new Error("다른 업체의 파일은 볼 수 없습니다");
    if (path.indexOf("..") >= 0) throw new Error("올바르지 않은 파일 경로입니다");
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error || !data) throw new Error("파일을 찾지 못했습니다");
    return new Uint8Array(await data.arrayBuffer());
  }
  // 옛 구글 드라이브 사진 (폴더가 '링크 있는 사람 보기'라 그대로 받아집니다)
  const r = await fetch("https://drive.google.com/uc?export=download&id=" + encodeURIComponent(id));
  if (!r.ok) throw new Error("옛 드라이브 파일을 받지 못했습니다 (" + r.status + ")");
  return new Uint8Array(await r.arrayBuffer());
}

/* ---------- AI 사진 읽기 ---------- */
/* sb16(10/17 시험에서 찾음): 비밀값 ANTHROPIC_MODEL 을 «claude-haiku-5.5» 처럼 점으로 적으면 404 →
   체크 서버 aiModel() 과 같게 숫자 사이 점을 하이픈으로 고쳐 씀 · 기본값도 실제 있는 이름 */
function aiModel() {
  const m = env("ANTHROPIC_MODEL", "claude-haiku-5-5").trim() || "claude-haiku-5-5";
  return m.replace(/(\d)\.(\d)/g, "$1-$2");
}
/** v37·sb18: 답에서 첫 { 부터 마지막 } 까지만 — 앞뒤에 말이 붙어도 읽음 */
function jsonCut(t: string) {
  let x = String(t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = x.indexOf("{"), b = x.lastIndexOf("}");
  if (a >= 0 && b > a) x = x.slice(a, b + 1);
  return x;
}
async function aiJson(shop: string, prompt: string, b64: string) {
  const key = env("ANTHROPIC_KEY");
  if (!key) throw new Error("번호판 자동 읽기를 지금은 쓸 수 없습니다. 번호를 직접 적어 주세요.");
  /* 업체당 하루 한도 — 본사 AI 요금이 새지 않게 합니다 */
  if (!await rateOk("ai:" + shop, Number(env("AI_MAX_DAY", "400"))))
    throw new Error("오늘 번호판 자동읽기 한도를 다 썼습니다. 번호를 직접 적어 주세요");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: aiModel(),
      max_tokens: 1500,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!j.content) { console.error("ai", res.status, String(j.error?.message || "").slice(0, 200)); throw new Error("번호판을 읽지 못했습니다. 번호를 직접 적어 주세요."); }
  try {
    await sb.from("wash_usage").insert({ shop, kind: "ai", in_tok: j.usage?.input_tokens || 0, out_tok: j.usage?.output_tokens || 0 });
  } catch (_) { /* 기록 실패는 무시 */ }
  const text = jsonCut(j.content.map((c: any) => c.text || "").join(""));
  JSON.parse(text);
  return text;
}

/* ---------- 솔라피 ---------- */
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(keyBytes: any, msg: any) {
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", k, msg);
}
async function solapiAuth() {
  const key = env("SOLAPI_KEY"), secret = env("SOLAPI_SECRET");
  if (!key || !secret) throw new Error("문자 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const te = new TextEncoder();
  const sig = hex(await hmac(te.encode(secret), te.encode(date + salt)));
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`;
}
/* ===== 발송 기록 (SQL 11 · cgg_sendlog) — 네 서버 같은 모양 =====
   솔라피로 «보내는» 요청은 모두 solapi() 한 곳을 지나고, 여기서 메시지마다 한 줄씩 남깁니다.
   (솔라피를 부르는 곳 = 기록을 남기는 곳)
   남기는 것: 제품 · 업체(검사소) 코드 · 템플릿 키 · 가린 번호(010-****-1234) · 알림톡/문자 · 솔라피 번호 · 결과 · 쉬운 오류
   남기지 않는 것: 본문 · 변수 «값»(인증번호·임시 비밀번호 등) · 열쇠·서명. 변수는 «이름»만.
   기록이 안 돼도 발송은 그대로 합니다(try 로 무시). */
type SendMeta = { shop?: string; tpl?: string; ref?: string };
const SEND_PRODUCT = "wash";
function sendMask(v: unknown) {
  const d = String(v ?? "").replace(/[^0-9]/g, "");
  if (d.length >= 10) return d.slice(0, 3) + "-****-" + d.slice(-4);
  return d ? "****" + d.slice(-2) : "";
}
/* 솔라피 상태 코드 → 쉬운 말 (모르는 코드는 «보내지 못함 (코드)») */
const SEND_WHY: Record<string, string> = {
  "1062": "보내는 번호가 등록되지 않음", "3059": "받는 번호가 올바르지 않음", "1020": "받는 번호가 올바르지 않음",
  "3104": "카카오톡을 쓰지 않는 번호", "3105": "카카오톡을 쓰지 않는 번호", "3018": "전화가 꺼져 있거나 받을 수 없음",
  "3015": "받는 번호가 없는 번호", "3016": "받는 쪽에서 막음(스팸 차단)", "3022": "받는 쪽에서 막음",
  "3040": "알림톡 문구가 등록된 것과 다름", "3041": "알림톡 템플릿을 찾지 못함", "3043": "알림톡 채널을 찾지 못함",
  "2252": "잔액이 모자람", "1030": "잔액이 모자람",
};
function sendErrEasy(code: string, msg: string, err?: unknown) {
  if (code && SEND_WHY[code]) return SEND_WHY[code];
  if (err) {
    const m = err instanceof Error ? err.message : String(err);
    const st = /솔라피 (\d{3})/.exec(m);
    if (st) return "솔라피가 요청을 받지 않음 (" + st[1] + ")";
    if (/[가-힣]/.test(m) && !/[A-Za-z]{3,}/.test(m)) return m.slice(0, 80);
    return "솔라피에 연결하지 못함";
  }
  if (msg && /[가-힣]/.test(msg) && !/[A-Za-z]{3,}/.test(msg)) return msg.slice(0, 80);
  return "보내지 못함" + (code ? " (" + code + ")" : "");
}
async function sendRecord(payload: any, resp: any, err: unknown, meta?: SendMeta) {
  try {
    const msgs: any[] = Array.isArray(payload && payload.messages) ? payload.messages : [];
    if (!msgs.length) return;
    const dg = (x: unknown) => String(x ?? "").replace(/[^0-9]/g, "");
    const failed: any[] = (resp && resp.failedMessageList) || [];
    const ml = resp && resp.messageList;
    const okList: any[] = Array.isArray(ml) ? ml
      : (ml && typeof ml === "object" ? Object.keys(ml).map((k) => Object.assign({ messageId: k }, ml[k])) : []);
    const gi = (resp && resp.groupInfo) || {};
    const gid = String(gi.groupId || gi._id || (resp && resp.groupId) || "");
    const rows = msgs.map((m: any, i: number) => {
      const ko = m && m.kakaoOptions;
      const to = dg(m && m.to);
      const f = failed.find((x: any) => dg(x && x.to) === to);
      const hit = okList.find((x: any) => dg(x && x.to) === to) || okList[i] || null;
      const bad = !!err || !!f;
      const code = String((f && f.statusCode) || "");
      return {
        product: SEND_PRODUCT, shop: String((meta && meta.shop) || "").slice(0, 40),
        tpl: String((meta && meta.tpl) || (ko ? "ata" : "sms")).slice(0, 40),
        to_mask: sendMask(to), via: ko ? "ata" : (String((m && m.type) || "").toLowerCase() || "auto"),
        msg_id: bad ? "" : String((hit && hit.messageId) || "").slice(0, 60), group_id: gid.slice(0, 60),
        result: bad ? "fail" : "wait", status_code: code.slice(0, 20),
        err: bad ? sendErrEasy(code, String((f && (f.statusMessage || f.reason)) || ""), err) : "",
        vars: ko && ko.variables ? Object.keys(ko.variables).map((k) => k.replace(/^#\{|\}$/g, "").slice(0, 20)).slice(0, 20) : [],
        ref: String((meta && meta.ref) || "").slice(0, 60), scheduled: !!(payload && payload.scheduledDate),
      };
    });
    const { error } = await sb.from("cgg_sendlog").insert(rows);
    if (error) console.error("sendRecord", String(error.message || "").slice(0, 80));
  } catch (e) { console.error("sendRecord", e instanceof Error ? e.message.slice(0, 80) : ""); }
}
/* sb15(결제 방): 일부러 안 보낸 것도 한 줄 — «안 보냄(skip)» + 이유 (코드 없음 · 번호 없음) */
async function sendSkip(to: string, why: string, meta?: SendMeta) {
  try {
    await sb.from("cgg_sendlog").insert({ product: SEND_PRODUCT, shop: String((meta && meta.shop) || "").slice(0, 40),
      tpl: String((meta && meta.tpl) || "").slice(0, 40), to_mask: sendMask(to), via: "", result: "skip",
      err: why, ref: String((meta && meta.ref) || "").slice(0, 60) });
  } catch (_) { /* 기록 실패는 무시 */ }
}
async function solapi(method: string, path: string, payload?: unknown, meta?: SendMeta) {
  const isSend = method === "POST" && /^\/messages\/v4\/send/.test(path);
  let res: Response, body = "";
  try {
    res = await fetch("https://api.solapi.com" + path, {
      method,
      headers: { Authorization: await solapiAuth(), "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    body = await res.text();
  } catch (e) {
    if (isSend) await sendRecord(payload, null, e, meta);
    throw e;
  }
  if (res.status >= 300) {
    const e = new Error("솔라피 " + res.status + ": " + body);
    if (isSend) await sendRecord(payload, null, e, meta);
    throw e;
  }
  const j = body ? JSON.parse(body) : {};
  if (isSend) await sendRecord(payload, j, null, meta);
  return j;
}
/* sb15: 발송 최종 결과 채우기 — 솔라피에 메시지 번호로 물어봄 (서버에서만 · 열쇠는 이름만 씀)
   «대기» 줄 가운데 1분 지난 것부터, 3일 넘은 것은 더 묻지 않음 */
const SEND_PRICE: Record<string, number> = { ata: 13, sms: 18, lms: 45, mms: 110 };   // 대략·부가세 별도 (관리 화면과 같음)
function sendFinal(via: string, m: any): { result: string; via: string; err: string } | null {
  const code = String((m && m.statusCode) || "");
  if (!code || /^2/.test(code) || code === "3000") return null;          // 2000 접수 · 3000 통신사 전달 = 아직 보내는 중
  const type = String((m && m.type) || "").toUpperCase();
  if (code === "4000") {
    if (via === "ata") {
      const repl = m.replacement === true || (!!type && type !== "ATA" && type !== "CTA");
      return repl ? { result: "sms", via: type && type !== "ATA" ? type.toLowerCase() : "sms", err: "" } : { result: "ata", via: "ata", err: "" };
    }
    return { result: "sent", via: type ? type.toLowerCase() : via, err: "" };
  }
  return { result: "fail", via: type ? type.toLowerCase() : via, err: sendErrEasy(code, String((m && m.statusMessage) || "")) };
}
async function sendFill(max = 100): Promise<number> {
  const now = Date.now();
  const { data, error } = await sb.from("cgg_sendlog").select("id,msg_id,via").eq("result", "wait").neq("msg_id", "")
    .gt("at", new Date(now - 3 * 864e5).toISOString()).lt("at", new Date(now - 60000).toISOString())
    .order("id", { ascending: true }).limit(Math.max(1, Math.min(300, max)));
  if (error) return 0;
  let n = 0;
  for (const r of data || []) {
    try {
      const j: any = await solapi("GET", "/messages/v4/list?messageId=" + encodeURIComponent(String(r.msg_id)));
      const ml = j && j.messageList;
      const m = Array.isArray(ml) ? ml[0] : (ml && typeof ml === "object" ? (ml[String(r.msg_id)] || ml[Object.keys(ml)[0]]) : null);
      const fin = m ? sendFinal(String(r.via || ""), m) : null;
      if (!fin) continue;
      await sb.from("cgg_sendlog").update({ result: fin.result, final_via: fin.via, err: fin.err,
        status_code: String(m.statusCode || "").slice(0, 20), checked_at: new Date().toISOString() })
        .eq("id", r.id).eq("result", "wait");
      n++;
    } catch (_) { /* 한 건 안 돼도 다음 */ }
  }
  return n;
}
const digits = (v: unknown) => String(v || "").replace(/[^0-9]/g, "");
async function sendLog(shop: string, row: any) {
  try {
    await sb.from("wash_sendlog").insert({
      shop, label: row.type || "", to_num: row.to || "", method: row.kind || "", ok: !!row.ok,
      msg_id: row.id || "", error: row.error || "", body: String(row.text || "").slice(0, 500), ref: row.ref || "",
    });
  } catch (_) { /* 기록 실패가 발송을 막지 않게 */ }
}

/* =========================================================
   캐시 지갑 — 쓴 만큼 돈이 깎입니다
   본사 설정(wash_hq)에서 cash_on 을 켜야 동작합니다.
   꺼져 있으면 예전처럼 «건수»로 깎습니다.
   ========================================================= */
type HqCfg = {
  cashOn: boolean; note: string; bank: string;
  price: Record<string, number>; exp: any; cronKey: string;
  dayMax: number; bigAmt: number; adminPhone: string;
  pgOn: boolean; pgProvider: string; pgClientKey: string; pgFee: number; pgNote: string;
  lock: any;
};
let _hqBox: HqCfg | null = null;
let _hqAt = 0;
async function hqCfg(force = false): Promise<HqCfg> {
  if (!force && _hqBox && Date.now() - _hqAt < 30000) return _hqBox;
  let d: any = null;
  const COLS = "cash_on,cash_note,price_cfg,exp_cfg,cron_key,cash_bank,cash_day_max,cash_big,admin_phone," +
               "pg_on,pg_provider,pg_client_key,pg_fee,pg_note";
  try {
    const r = await sb.from("wash_hq").select(COLS + ",lock_cfg").eq("id", 1).maybeSingle();
    d = r.data;
    /* 잠금 SQL 을 아직 안 돌리셨으면 그 칸만 빼고 다시 읽습니다 (나머지 설정은 그대로 살립니다) */
    if (!d) {
      const r2 = await sb.from("wash_hq").select(COLS).eq("id", 1).maybeSingle();
      d = r2.data;
    }
  } catch (_) { /* 표가 아직 없으면 기본값으로 갑니다 */ }
  const p = (d && d.price_cfg) || {};
  _hqBox = {
    cashOn: !!(d && d.cash_on),
    note: String((d && d.cash_note) || "카드 결제는 준비 중이에요.\n지금은 이용할 수 없어요."),
    bank: String((d && d.cash_bank) || ""),
    price: {
      sms: Number(p.sms || 40), lms: Number(p.lms || 90), mms: Number(p.mms || 240),
      ata: Number(p.ata || 30), tax: Number(p.tax || 300),
    },
    exp: (d && d.exp_cfg) || {},
    cronKey: String((d && d.cron_key) || ""),
    dayMax: Math.max(0, Number((d && d.cash_day_max) ?? 50000)),
    bigAmt: Math.max(0, Number((d && d.cash_big) ?? 100000)),
    /* 알림·인증번호를 «받는» 번호. 관리에서 바꿀 수 있습니다. */
    adminPhone: digits(String((d && d.admin_phone) || env("ADMIN_PHONE", "") || "01058985525")),
    pgOn: !!(d && d.pg_on),
    pgProvider: String((d && d.pg_provider) || "toss"),
    pgClientKey: String((d && d.pg_client_key) || ""),
    pgFee: Number((d && d.pg_fee) || 0),
    pgNote: String((d && d.pg_note) || "카드 결제는 준비 중이에요. 지금은 계좌이체로만 충전할 수 있어요."),
    lock: (d && d.lock_cfg) || {},
  };
  _hqAt = Date.now();
  return _hqBox;
}
function hqCfgClear() { _hqBox = null; _hqAt = 0; }

async function cashBal(shop: string) {
  try {
    const { data } = await sb.rpc("wash_cash_bal", { p_shop: shop });
    return Math.max(0, Number(data || 0));
  } catch (_) { return 0; }
}
async function cashTake(shop: string, amt: number, what: string, qty: number, memo: string,
                        who?: string, dayMax?: number) {
  const { data, error } = await sb.rpc("wash_cash_take", {
    p_shop: shop, p_amt: Math.max(0, Math.round(amt)), p_what: what,
    p_qty: Math.max(1, qty), p_memo: memo || "",
    p_who: who || null, p_day_max: Math.max(0, Number(dayMax || 0)),
  });
  if (error) throw new Error("캐시를 사용하지 못했습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  return data as any;
}
async function cashUndoLog(id: unknown) {
  if (!id) return;
  try { await sb.rpc("wash_cash_undo", { p_log_id: Number(id) }); } catch (_) { /* */ }
}
function wonTxt2(n: number) { return Math.round(Number(n) || 0).toLocaleString("ko-KR") + "원"; }

/** sb26: 문자 길이(바이트) — 한글 등 2 · 영문·숫자·기호 1 · 90바이트 넘으면 장문 (솔라피 자동 판단과 같음) */
function smsBytes(t: string) { let n = 0; for (const ch of String(t)) n += ch.charCodeAt(0) <= 0x7f ? 1 : 2; return n; }
const isLong = (t: unknown) => smsBytes(String(t || "")) > 90;
/* 어떤 문자인지 — 단문 / 장문 / 사진 / 알림톡 */
function msgKindOf(kind: string, o: any) {
  const k = String(kind || "").toUpperCase();
  if (k === "ATA") return "ata";
  if (k === "MMS" || o.imageB64) return "mms";
  if (k === "LMS") return "lms";
  if (k === "SMS") return "sms";
  return isLong(o.text) ? "lms" : "sms";   // sb26: 90바이트
}

/* 보내기 전 관문 — 캐시가 켜져 있으면 캐시로, 아니면 예전 건수로 */
async function msgGate(shop: string, kind: string, o: any) {
  const cfg = await hqCfg();
  if (!cfg.cashOn) return await smsTake(shop);

  const { data: sh0 } = await sb.from("wash_shops").select(SHOP_COLS).eq("shop", shop).maybeSingle();
  if (!sh0) return { allow: false, from: "off", sh: null, cash: true, why: "업체 정보를 찾지 못했습니다" };
  if (sh0.active === false)
    return { allow: false, from: "off", sh: sh0, cash: true, why: "이용이 멈춰 있는 업체입니다. 차곳간으로 연락해 주세요" };
  const sh = await rollCycle(sh0);
  const isTrial = !sh.plan || sh.plan === "trial";
  if (isTrial && trialExpired(sh))
    return { allow: false, from: "expired", sh, cash: true, why: "무료 체험 기간이 끝났습니다. 요금제를 정하시면 다시 나갑니다" };
  if (!isTrial && paidExpired(sh))
    return { allow: false, from: "expired", sh, cash: true, why: "이용 기간이 지났습니다. 연장하셔야 문자가 다시 나갑니다" };

  const k = msgKindOf(kind, o);
  const price = Number(cfg.price[k] || 0);
  const r: any = await cashTake(shop, price, k, 1, String(o.type || ""), "shop:" + shop, cfg.dayMax);
  if (!r || r.ok === false) {
    const bal = Number((r && r.balance) || 0);
    if (r && r.why === "day_limit") {
      /* 문자 폭탄 방어 — 본사에도 알립니다 */
      try {
        const admin = (await hqCfg()).adminPhone;
        if (admin && await rateOk("daywarn:" + shop, 1))
          await noticeSms(admin, "[차곳간] " + String(sh.name || shop) + " 하루 캐시 한도(" +
            wonTxt2(Number(r.day_max || 0)) + ")를 다 썼습니다. 확인해 주세요");
      } catch (_) { /* */ }
      return { allow: false, from: "daylimit", sh, cash: true,
        why: "오늘 쓸 수 있는 한도(" + wonTxt2(Number(r.day_max || 0)) + ")를 다 썼습니다. 내일 다시 보내시거나 차곳간으로 연락해 주세요" };
    }
    return { allow: false, from: "stop", sh, cash: true,
      why: "남은 캐시가 " + wonTxt2(bal) + " 입니다. 이 문자는 " + wonTxt2(price) + " 이라 보낼 수 없습니다. 충전해 주세요" };
  }
  return { allow: true, from: "cash", sh, cash: true, logId: r.logId, price, balance: r.balance, kindKey: k };
}
async function msgUndo(gate: any) {
  if (!gate || !gate.allow) return;
  if (gate.cash) { await cashUndoLog(gate.logId); return; }
  await smsUndo(gate);
}


/* =========================================================
   만료 안내 문자 — 자동 발송
   수파베이스 안의 자동 시계가 10분마다 cronExpire 를 부릅니다.
   ========================================================= */
/* 한국 시각 기준 오늘 0시 (UTC 밀리초) */
function kstToday() {
  const n = new Date(Date.now() + 9 * 3600000);
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}
/* 한국 시각 지금 — 분 단위 */
function kstMinutes() {
  const n = new Date(Date.now() + 9 * 3600000);
  return n.getUTCHours() * 60 + n.getUTCMinutes();
}
/* 문구 안의 {업체} {날짜} 같은 말을 바꿔 넣습니다 */
function fillTpl(tpl: string, map: Record<string, string>) {
  let out = String(tpl || "");
  for (const k of Object.keys(map)) out = out.split("{" + k + "}").join(String(map[k] ?? ""));
  return out;
}


/* =========================================================
   카드 결제 (PG) — 토스페이먼츠 기준
   Secrets 에 TOSS_SECRET_KEY 를 넣고, 관리에서 켜면 돕니다.
   ========================================================= */
function orderNo() {
  const d = new Date(Date.now() + 9 * 3600000);
  const ymd2 = d.toISOString().slice(2, 10).replace(/-/g, "");
  return "CGG" + ymd2 + randHex(5).toUpperCase();
}
function pgSecret() {
  return env("TOSS_SECRET_KEY", "") || env("PG_SECRET_KEY", "");
}
async function tossCall(path: string, body: unknown, method = "POST", opt: { idem?: string; billing?: boolean } = {}) {
  /* sb10: 자동 결제는 따로 받은 열쇠(TOSS_BILLING_SECRET_KEY)가 있으면 그것으로 · 같은 요청 두 번 막기(Idempotency-Key) */
  const key = (opt.billing && env("TOSS_BILLING_SECRET_KEY", "")) || pgSecret();
  if (!key) throw new Error("카드 결제를 지금은 쓸 수 없습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const auth = encodeBase64(new TextEncoder().encode(key + ":"));
  const headers: Record<string, string> = { Authorization: "Basic " + auth, "Content-Type": "application/json" };
  if (opt.idem) headers["Idempotency-Key"] = opt.idem.slice(0, 300);
  const r = await fetch("https://api.tosspayments.com" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j: any = null; try { j = JSON.parse(t); } catch (_) { /* */ }
  if (r.status >= 300) {
    const m = (j && j.message) || "카드사에서 처리하지 못했습니다";   // sb14: 코드·원문 대신 우리말
    throw Object.assign(new Error("카드사 응답: " + m), { tossCode: String((j && j.code) || "") });   // sb10: 실패 사유 고르기용
  }
  return j;
}
/* sb9: 토스가 «결제 끝»(DONE)이라고 확인한 주문을 반영 — ready → paid 를 조건 걸고 한 번에 바꾼 쪽만 payDone.
   돌려주는 값 applied=false 면 이미 다른 요청이 반영한 것 (결제창 복귀·새로고침·웹훅이 겹쳐도 한 번만). 웹훅도 이 함수를 씁니다. */
async function payFinish(od: any, paymentKey: string, r: any): Promise<{ applied: boolean; why?: string }> {
  const orderId = String(od.order_id);
  if (!r || r.status !== "DONE") return { applied: false, why: "not done" };
  /* sb10: 주문번호·금액이 토스 응답에 «없어도» 반영하지 않음 (보안 방 참고 · 웹훅 경로) */
  if (r.orderId === undefined || String(r.orderId) !== orderId) return { applied: false, why: "order mismatch" };
  if (r.totalAmount === undefined || Math.round(Number(r.totalAmount)) !== Math.round(Number(od.amount)))
    return { applied: false, why: "amount mismatch" };
  const { data: won1, error } = await sb.from("wash_pay_order").update({
    status: "paid", payment_key: paymentKey, paid_at: new Date().toISOString(),
    method: String((r && r.method) || ""), raw: r,
  }).eq("order_id", orderId).in("status", ["ready", "failed"]).select("order_id");
  if (error) throw new Error("결제 기록을 남기지 못했습니다");
  if (!won1 || !won1.length) return { applied: false, why: "already" };
  await payDone(String(od.shop), String(od.kind), Number(od.amount) + Number(od.use_cash || 0),
                Number(od.use_cash || 0), Number(od.amount), String(od.period || ""),
                String(od.order_name || ""), orderId, String((r && r.method) || "카드"));
  try { await payWaitOpen(od); } catch (e) { console.error("payWaitOpen", e instanceof Error ? e.message.slice(0, 80) : ""); }   // sb13
  return { applied: true };
}
/* ===== sb10: 웹훅·정리 — 주문번호 하나를 토스에 물어보고 반영 (받은 웹훅 내용은 믿지 않음) ===== */
const ORDER_RE = /^CG[GB]\d{6}[0-9A-F]{10}$/;
async function payCheckOne(orderId: string): Promise<string> {
  const { data: od } = await sb.from("wash_pay_order").select("*").eq("order_id", orderId).maybeSingle();
  if (!od) return "unknown";                                   // 모르는 주문은 무시
  if (od.status === "paid" || od.status === "canceled") return "already";
  let r: any = null;
  try { r = await tossCall("/v1/payments/orders/" + encodeURIComponent(orderId), null, "GET", { billing: !!od.bill_date }); }
  catch (_) { return "not found"; }                           // 아직 결제창에서 끝나지 않음
  if (r && r.status === "DONE") {
    const f = await payFinish(od, String(r.paymentKey || ""), r);
    return f.applied ? "applied" : (f.why || "already");
  }
  if (r && ["ABORTED", "EXPIRED", "CANCELED", "PARTIAL_CANCELED"].indexOf(String(r.status)) >= 0) {
    await sb.from("wash_pay_order").update({ status: "failed", fail_msg: "토스 " + String(r.status) })
      .eq("order_id", orderId).eq("status", "ready");
    return "failed";
  }
  return "waiting";
}
async function payReconcile(out: string[]) {
  const now = Date.now();
  const { data } = await sb.from("wash_pay_order").select("order_id,created_at").eq("status", "ready")
    .lt("created_at", new Date(now - 30 * 60000).toISOString())
    .gt("created_at", new Date(now - 3 * DAY).toISOString()).limit(50);
  for (const o of data || []) {
    try { out.push("pay " + o.order_id + " " + await payCheckOne(String(o.order_id))); } catch (_) { /* */ }
  }
  /* 3일 넘게 ready 인 주문은 끝난 것으로 */
  await sb.from("wash_pay_order").update({ status: "failed", fail_msg: "결제창에서 끝나지 않음(3일)" })
    .eq("status", "ready").lt("created_at", new Date(now - 3 * DAY).toISOString());
}

/* ===== sb10: 환불 — 얼마까지 돌려줄 수 있는지 서버가 셈 ===== */
async function refundQuote(od: any) {
  const amount = Math.round(Number(od.amount) || 0);
  if (String(od.kind) === "plan") {
    const { data: sh } = await sb.from("wash_shops").select("paid_until").eq("shop", od.shop).maybeSingle();
    const today = new Date(kstToday()).toISOString().slice(0, 10);
    const left = Math.max(0, Math.min(CYCLE_DAYS, ymdGap(today, ymd10(sh && sh.paid_until))));
    return { kind: "plan", amount, max: amount, suggest: Math.round(amount * left / CYCLE_DAYS), leftDays: left };
  }
  const supply = Math.round(Number(od.supply) || vatSplit(amount).supply);
  const unused = Math.max(0, Math.min(supply, await cashBal(String(od.shop))));
  const max = Math.min(amount, Math.round(unused * 1.1));
  return { kind: "cash", amount, max, suggest: max, unusedCash: unused };
}

/* ===== sb10: 자동 결제 — 빌링키 잠그기 (AES-GCM · 판 번호 · 업체 코드를 함께 묶음) ===== */
const ENC_VER = () => Math.max(1, Number(env("PAY_ENC_VER", "1")) || 1);
async function encKeyOf(ver: number) {
  const raw = env(ver === 1 ? "PAY_ENC_KEY" : "PAY_ENC_KEY_" + ver, "");
  let b: Uint8Array | null = null;
  try { b = decodeBase64(raw); } catch (_) { b = null; }
  if (!b || b.length !== 32) throw new Error("자동 결제 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  return await crypto.subtle.importKey("raw", new Uint8Array(b), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealBK(shop: string, plain: string) {
  const ver = ENC_VER();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(shop) },
    await encKeyOf(ver), new TextEncoder().encode(plain)));
  return "v" + ver + "." + encodeBase64(iv) + "." + encodeBase64(ct);
}
async function openBK(shop: string, sealed: string) {
  const m = String(sealed || "").match(/^v(\d+)\.([^.]+)\.([^.]+)$/);
  if (!m) throw new Error("자동 결제 카드 정보를 읽지 못했습니다");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64(m[2]), additionalData: new TextEncoder().encode(shop) },
    await encKeyOf(Number(m[1])), decodeBase64(m[3]));
  return new TextDecoder().decode(pt);
}
async function billingOn() {
  try {
    const { data } = await sb.from("wash_hq").select("billing_on").eq("id", 1).maybeSingle();
    return !!(data && data.billing_on);
  } catch (_) { return false; }
}
async function billRow(shop: string) {
  const { data, error } = await sb.from("pay_billing").select("*").eq("shop", shop).maybeSingle();
  if (error) throw new Error("자동 결제를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  return data;
}
async function billDelKey(shop: string, sealed: string) {
  /* 토스에서도 지웁니다 — 실패해도 우리 쪽은 지움 (기록에는 결과만) */
  try {
    const bk = await openBK(shop, sealed);
    await tossCall("/v1/billing/" + encodeURIComponent(bk), null, "DELETE", { billing: true });
  } catch (e) { console.error("billing key delete", shop, e instanceof Error ? e.message.slice(0, 80) : ""); }
}
async function billLog(shop: string, orderId: string, amount: number, tryNo: number, result: string, msg: string) {
  try {
    await sb.from("pay_billing_log").insert({ shop, order_id: orderId, amount, try_no: tryNo, result, msg: String(msg || "").slice(0, 200) });
  } catch (_) { /* */ }
}
/* 실패 사유를 짧은 우리말로 (카드 번호·영문 오류 코드는 안 넣음 · 알림톡/02 새 F) */
function billWhy(code: string, msg: string) {
  const c = String(code || "").toUpperCase(), m = String(msg || "");
  if (/BALANCE|잔액/.test(c + m)) return "잔액 부족";
  if (/EXCEED|LIMIT|한도/.test(c + m)) return "카드 한도 초과";
  if (/EXPIR|유효기간/.test(c + m)) return "카드 유효기간 지남";
  if (/REJECT|거절/.test(c + m)) return "카드사 승인 거절";
  return "카드사 사정";
}
/* 하루 한 번 — 이용기간이 끝나는 날 자동 결제. 실패하면 D+1·3·5 다시 (모두 4번), 그 뒤는 기존 잠금 그대로 */
async function billRun(out: string[]) {
  const today = new Date(kstToday()).toISOString().slice(0, 10);
  const { data: rows } = await sb.from("pay_billing").select("*").eq("status", "on");
  for (const b of rows || []) {
    try {
      const { data: sh } = await sb.from("wash_shops").select("shop,name,plan,paid_until,owner_phone,active").eq("shop", b.shop).maybeSingle();
      if (!sh || sh.active === false || !b.billing_key_enc) continue;
      const due = ymd10(sh.paid_until);
      if (b.first_fail_at && due && due > today) {          // 다른 방법으로 이미 냄 → 실패 기록 지움
        await sb.from("pay_billing").update({ fail_count: 0, first_fail_at: null, last_fail_msg: null }).eq("shop", b.shop);
        continue;
      }
      let tryNo = 0;
      if (!b.first_fail_at) { if (due && due <= today) tryNo = 1; }
      else { const g = ymdGap(ymd10(b.first_fail_at), today); tryNo = g === 1 ? 2 : g === 3 ? 3 : g === 5 ? 4 : 0; }
      if (!tryNo) continue;
      const { data: pl } = await sb.from("wash_plans").select("code,name,price").eq("code", sh.plan).maybeSingle();
      if (!pl || !Number(pl.price)) { out.push("bill " + b.shop + " 요금제 없음"); continue; }
      const full = Math.round(Number(pl.price) * 1.1);
      const useCash = Math.min(await cashBal(b.shop), full);
      const amount = full - useCash;
      const period = today.slice(0, 7);
      const orderName = "차곳간 " + String(pl.name) + " " + period + " 이용요금(자동)";
      const v = vatSplit(amount);
      const d = new Date(Date.now() + 9 * 3600000);
      const orderId = "CGB" + d.toISOString().slice(2, 10).replace(/-/g, "") + randHex(5).toUpperCase();
      /* (업체+결제일) 한 줄 — 겹침 금지 칸이라 같은 날 두 번 못 만듦 */
      const od: any = { order_id: orderId, shop: b.shop, kind: "plan", amount: v.total, supply: v.supply, vat: v.vat,
        use_cash: useCash, status: "ready", provider: "toss", order_name: orderName, period, who: "billing",
        bill_date: today, try_no: tryNo };
      const { error: e0 } = await sb.from("wash_pay_order").insert(od);
      if (e0) { out.push("bill " + b.shop + " 오늘 이미 함"); continue; }
      if (amount <= 0) {
        /* 캐시만으로 다 냄 — 카드 없이 */
        await payFinish(od, "", { status: "DONE", orderId, totalAmount: v.total, method: "캐시" });
        await billLog(b.shop, orderId, 0, tryNo, "ok", "캐시");
        out.push("bill " + b.shop + " 캐시로"); continue;
      }
      let r: any = null, err = "", errCode = "", sent = false;
      try {
        const bk = await openBK(b.shop, String(b.billing_key_enc));
        sent = true;                                         // 여기부터는 토스에 요청이 갔을 수 있음
        r = await tossCall("/v1/billing/" + encodeURIComponent(bk),
          { customerKey: b.customer_key, amount: v.total, orderId, orderName }, "POST", { idem: orderId, billing: true });
      } catch (e) {
        err = e instanceof Error ? e.message : String(e); errCode = String((e as any)?.tossCode || "");
        if (sent && !errCode && !/^카드사 응답/.test(err)) {
          /* sb10(보안 조건 1): 시간 초과·끊김 = 실제로는 승인됐을 수 있음 → 주문을 ready 로 두고 실패로 세지 않음.
             다음 예약 실행의 payReconcile 이 토스에 물어 정리 (같은 날은 (업체+결제일) 줄이 있어 다시 청구 안 함) */
          await billLog(b.shop, orderId, v.total, tryNo, "unknown", "응답 없음");
          out.push("bill " + b.shop + " 확인 대기");
          continue;
        }
      }
      if (r && r.status === "DONE") {
        await payFinish(od, String(r.paymentKey || ""), r);    // 캐시는 여기(payDone)서 성공한 뒤에만 깎임
        await sb.from("pay_billing").update({ fail_count: 0, first_fail_at: null, last_fail_msg: null }).eq("shop", b.shop);
        await billLog(b.shop, orderId, v.total, tryNo, "ok", "");
        out.push("bill " + b.shop + " ok");
        continue;
      }
      if (!err) err = "결제가 끝나지 않았습니다 (" + String((r && r.status) || "?") + ")";
      await sb.from("wash_pay_order").update({ status: "failed", fail_msg: err.slice(0, 200) }).eq("order_id", orderId).eq("status", "ready");
      await sb.from("pay_billing").update({ fail_count: Number(b.fail_count || 0) + 1,
        first_fail_at: b.first_fail_at || today, last_fail_msg: err.slice(0, 200) }).eq("shop", b.shop);
      await billLog(b.shop, orderId, v.total, tryNo, "fail", err);
      out.push("bill " + b.shop + " 실패 " + tryNo);
      try {
        /* 다음 시도일: D+1 → D+3 → D+5. 마지막(D+5) 실패에는 안 보냄 → 기존 잠금 안내가 나감 */
        const first = ymd10(b.first_fail_at) || today;
        const next = tryNo === 1 ? ymdAdd(first, 1) : tryNo === 2 ? ymdAdd(first, 3) : tryNo === 3 ? ymdAdd(first, 5) : "";
        if (next && sh.owner_phone)
          await noticeAta(String(sh.owner_phone), "bill_fail", { 업체명: sh.name || b.shop, 결제일: korDay(due || first),
            요금제: String(pl.name || sh.plan), 금액: won(v.total), 사유: billWhy(errCode, err), 다음시도일: korDay(next) }, false,
            { shop: b.shop, ref: "wash:" + orderId });
      } catch (_) { /* */ }
    } catch (e) { out.push("bill " + b.shop + " 오류"); console.error("billRun", b.shop, e instanceof Error ? e.message.slice(0, 120) : ""); }
  }
}

/* 부가세 나누기 — 받는 금액은 «부가세 포함» 입니다 */
function vatSplit(total: number) {
  const t = Math.round(Number(total) || 0);
  const supply = Math.round(t / 1.1);
  return { total: t, supply, vat: t - supply };
}


/* sb15(결제 방 부탁): 결제 알림 발송 기록의 참고칸 — «제품:주문번호» (wash / check / join) */
async function payRef(orderId: string | null) {
  if (!orderId) return "wash:캐시";
  try {
    const { data } = await sb.from("wash_pay_order").select("who").eq("order_id", orderId).maybeSingle();
    const w = String((data && data.who) || "");
    return (w.startsWith("check:") ? "check" : w.startsWith("join:") ? "join" : "wash") + ":" + orderId;
  } catch (_) { return "wash:" + orderId; }
}
/* 결제가 끝난 뒤 실제로 반영합니다 (캐시 넣기 / 이용기간 늘리기) */
async function payDone(shop: string, kind: string, full: number, useCash: number,
                       cardAmt: number, period: string, orderName: string,
                       orderId: string | null, method: string) {
  if (kind === "cash") {
    /* 충전 — 카드로 낸 금액(부가세 포함)의 공급가액만큼 캐시를 넣습니다 */
    const v = vatSplit(cardAmt);
    await sb.rpc("wash_cash_add", {
      p_shop: shop, p_amt: v.supply, p_kind: "paid", p_days: 365,
      p_memo: "카드 결제 (" + method + ")" + (orderId ? " · " + orderId : ""),
      p_who: "pg:" + (orderId || ""),
    });
  } else {
    /* 월 이용요금 — 캐시로 먼저 낸 만큼 빼고, 이용기간을 30일 늘립니다 */
    if (useCash > 0 && orderId) {
      /* sb15(보안 W-H3): 캐시를 실제로 깎지 못하면 이용기간을 늘리지 않습니다.
         (카드로 낸 돈은 들어왔으니 주문에 표시하고 본사에 알림 → 본사가 확인해 환불·연장) */
      let c: any = null;
      try { c = await cashTake(shop, useCash, "plan", 1, orderName, "shop:" + shop, 0); } catch (_) { c = null; }
      if (!c || c.ok === false) {
        try {
          await sb.from("wash_pay_order").update({ fail_msg: "캐시 모자람 — 이용기간 안 늘림(본사 확인)" }).eq("order_id", orderId);
          const admin = (await hqCfg()).adminPhone;
          if (admin) await noticeSms(admin, "[차곳간] " + shop + " 이용요금 결제(" + orderId + ")의 캐시 " + wonTxt2(useCash) +
            "을 깎지 못해 이용기간을 늘리지 않았습니다. 관리에서 확인해 주세요");
        } catch (_) { /* */ }
        return;
      }
    }
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const { data: sh } = await sb.from("wash_shops").select("paid_until").eq("shop", shop).maybeSingle();
    const base = (sh && sh.paid_until && String(sh.paid_until) > today) ? String(sh.paid_until) : today;
    const t = new Date(base + "T00:00:00Z");
    t.setUTCDate(t.getUTCDate() + CYCLE_DAYS);
    await sb.from("wash_shops").update({
      paid_at: today, paid_until: t.toISOString().slice(0, 10), cycle_start: today,
      sms_used: 0, tax_used: 0, spare_used: 0, warn_at: null, stop_warn_at: null,
    }).eq("shop", shop);
    try {
      const row: any = { shop, amount: full, status: "paid", paid_at: today, period,
        memo: orderName + " · " + method + (useCash ? (" · 캐시 " + wonTxt2(useCash)) : "") };
      /* sb12: 장부 줄에 주문번호 — 관리 결제 목록에서 카드 주문과 겹쳐 보이지 않게 (SQL 08 전이면 칸 없이) */
      const { error: le } = await sb.from("wash_payments").insert(orderId ? Object.assign({ order_id: orderId, source: "card" }, row) : row);
      if (le && orderId) await sb.from("wash_payments").insert(row);
    } catch (_) { /* */ }
  }
  /* sb5: 업체 대표에게 알림톡 (코드가 있을 때만 · 새 안내라 문자로는 보내지 않음) */
  try {
    const { data: o } = await sb.from("wash_shops").select("name,owner_phone,paid_until,plan").eq("shop", shop).maybeSingle();
    if (o && o.owner_phone) {
      if (kind === "cash")
        await noticeAta(String(o.owner_phone), "cash_done", { 업체명: o.name || shop, 금액: won(vatSplit(cardAmt).supply),
          잔액: won(await cashBal(shop)), 사용기한: korDay(new Date(Date.now() + (9 * 3600e3) + 365 * DAY).toISOString().slice(0, 10)) },
          false, { shop, ref: await payRef(orderId) });
      else
        await noticeAta(String(o.owner_phone), "pay_done", { 업체명: o.name || shop, 금액: won(full),
          요금제: await planName(String(o.plan || "")), 결제수단: method, 이용기한: korDay(String(o.paid_until || "").slice(0, 10)) },
          false, { shop, ref: await payRef(orderId) });
    }
  } catch (_) { /* */ }
  /* 사장님께 알림 */
  try {
    const admin = (await hqCfg()).adminPhone;
    if (admin) await noticeSms(admin,
      "[차곳간] " + shop + " " + (kind === "cash" ? "캐시 충전" : "이용요금") + " " +
      wonTxt2(full) + " 결제 완료 (" + method + ")");
  } catch (_) { /* */ }
}

async function sendMsg(shop: string, json: string) {
  let o: any = {};
  try { o = JSON.parse(json); } catch { return { ok: false, error: "요청을 읽지 못했습니다" }; }
  /* sb6·sb7: 화면이 ataKey(intake·release·extra_work·bill·deposit_ok)만 주면 본사 채널 템플릿으로 (업체가 자기 템플릿을 정했으면 그것 먼저).
     요금을 깎기 전에 알림톡/문자를 정해 둡니다. 코드가 없거나 확정본 변수가 빠졌으면 문자로.
     sb7: 업체명·업체전화는 서버 값으로 덮고, 보기코드는 서버가 만들거나 이 업체 것인지 확인 (공식 채널로 가짜 링크 못 보내게) */
  /* sb15(보안 W-H2): 화면이 보낸 templateId·pfId 는 늘 버립니다. 알림톡은 SCREEN_ATA 의 ataKey 로만,
     변수는 서버가 채운 확정본만. ataKey 가 없거나 화면 안내가 아니면 알림톡이 아니라 보통 문자(업체 이름이 앞에 붙음)로 나갑니다. */
  delete o.templateId; delete o.pfId;
  if (String(o.kind || "").toUpperCase() === "ATA"
      && !(o.ataKey && ATA_TPL[String(o.ataKey)] && SCREEN_ATA.indexOf(String(o.ataKey)) >= 0)) {
    delete o.variables; o.kind = "AUTO";
  }
  let serverAta = false;     // sb17(운영/06 I): 서버가 확정본으로 글을 만든 본사 안내(ataKey)인지
  if (String(o.kind || "").toUpperCase() === "ATA") {
    serverAta = true;
    const k = String(o.ataKey);
    const v: Record<string, unknown> = Object.assign({}, (o.variables || {}) as Record<string, unknown>);
    await ataServerVars(shop, k, v, String(o.rec || ""));
    const ac = await ataCfg();
    const pk = ataPick(k, v);
    /* sb10: 청구서를 받은 번호를 그 보기코드에 적어 둠 → 딜러앱 myBills (받은 번호 = 딜러 로그인 번호) */
    if (k === "bill") await billToPhone(shop, String(v["보기코드"] || ""), String(o.to || ""));
    if (k === "bill" && Array.isArray(o.codes)) await billToPhoneMore(shop, String(v["보기코드"] || ""), o.codes, String(o.to || ""));   // sb27
    o.text = ataSms(k, pk.vars);                         // 대신 보낼 문자도 서버 값으로 만든 확정본 대체 문구
    if (ac.tpl[k] && ac.pfId && !pk.missing.length) {
      o.templateId = ac.tpl[k]; o.pfId = ac.pfId; o.variables = pk.vars;
    } else {
      if (pk.missing.length) console.error("ataKey vars missing", k, pk.missing.join(","));
      o.kind = "AUTO"; delete o.variables;
    }
  }
  /* 남은 캐시(또는 건수)가 없으면 여기서 막습니다 — 미리 깎아 두고, 실패하면 되돌립니다 */
  const gate: any = await msgGate(shop, String(o.kind || "AUTO"), o);
  if (!gate.allow) {
    if (!gate.cash) await smsWarnOwner(gate);
    return { ok: false, error: gate.why || "문자 발송이 멈췄습니다. 충전해야 다시 나갑니다", stopped: true };
  }
  try {
    if (!o.to) throw new Error("받는 번호가 없습니다");
    /* sb17(운영/06 I · 워시 v127): 본사 안내(ataKey)는 업체 발신번호가 비어도 차곳간 대표번호(SMS_FROM)로 — 글은 서버 확정본만.
       일반 문자 · ataKey 없는 글은 지금처럼 업체 발신번호가 꼭 있어야 함. SMS_FROM 도 없으면 거절(화면이 문자 앱으로 이어 줌) */
    if (!o.from && !(serverAta && digits(env("SMS_FROM", "")))) throw new Error("발신번호가 없습니다");
    /* 발신번호 —
       ① Secrets 에 SMS_FROM(차곳간 대표번호)이 있으면 모든 업체가 그 번호로 나갑니다.
          업체마다 통신서류를 낼 필요가 없어집니다. 받는 분께는 문자 맨 앞의 [업체이름]으로 어디서 온 것인지 보입니다.
       ② 없으면 예전처럼 업체가 처음 쓴 번호로 고정합니다 (남의 업체 번호로 보내지 못하게). */
    const hqFrom = digits(env("SMS_FROM", ""));
    let from = digits(o.from);
    if (hqFrom) {
      from = hqFrom;
    } else {
      const saved = digits(String((gate.sh && gate.sh.sms_from) || ""));
      if (!saved) { try { await sb.from("wash_shops").update({ sms_from: from }).eq("shop", shop); } catch (_) { /* */ } }
      else if (saved !== from)
        throw new Error("등록된 발신번호(" + saved + ")로만 보낼 수 있습니다. 바꾸시려면 차곳간으로 연락해 주세요");
    }
    /* sb2·sb3: 차곳간 대표번호로 나가므로 받는 분이 어느 업체 문자인지 알 수 있게 맨 앞에 [업체이름]을 붙입니다
       sb3: 글이 「[차곳간]」처럼 [ 로 시작해도 붙입니다. 이미 [우리 업체이름] 으로 시작할 때만 그대로.
       (알림톡은 등록된 문구와 같아야 하므로 손대지 않음) */
    let text = String(o.text || "");
    if (text && String(o.kind || "AUTO").toUpperCase() !== "ATA") {
      let nm = String((gate.sh && gate.sh.name) || "");
      if (!nm) { const { data: shn } = await sb.from("wash_shops").select("name").eq("shop", shop).maybeSingle(); nm = String((shn && shn.name) || shop); }
      if (text.trim().indexOf("[" + nm + "]") !== 0) text = "[" + nm + "] " + text;
    }
    const msg: any = { to: digits(o.to), from, text };
    const kind = String(o.kind || "AUTO").toUpperCase();
    if (kind === "MMS" && o.imageB64) {
      const up = await solapi("POST", "/storage/v1/files", { file: o.imageB64, name: "wash.jpg", type: "MMS" });
      msg.imageId = up.fileId || up.file?.fileId || "";
      msg.type = "MMS"; msg.subject = "차곳간 워시";
    } else if (kind === "LMS") { msg.type = "LMS"; msg.subject = "차곳간 워시"; }
    else if (kind === "SMS") msg.type = "SMS";
    if (kind === "ATA") {
      const pf = o.pfId;                                   // sb15: 서버가 위에서 정한 본사 채널만
      if (!pf) throw new Error("알림톡 설정이 아직 끝나지 않았습니다. 문자로 보내 주세요.");
      if (!o.templateId) throw new Error("알림톡 문안이 정해지지 않았습니다. 문자로 보내 주세요.");
      msg.kakaoOptions = { pfId: pf, templateId: o.templateId, disableSms: !!o.disableSms };
      if (o.variables) msg.kakaoOptions.variables = o.variables;
    }
    const body: any = { messages: [msg] };
    if (o.scheduledDate) {
      const sd = new Date(o.scheduledDate);
      if (isNaN(sd.getTime())) throw new Error("예약 시각이 올바르지 않습니다");
      body.scheduledDate = sd.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    const r = await solapi("POST", "/messages/v4/send-many/detail", body,
      { shop, tpl: kind === "ATA" ? String(o.ataKey || "ata") : (o.ataKey ? String(o.ataKey) + "_sms" : "sms_free"), ref: String(o.ref || "").slice(0, 60) });
    const failed = r.failedMessageList || [];
    if (failed.length) {
      const f = failed[0] || {};
      throw new Error("솔라피 거절: " + (f.statusMessage || f.reason || f.statusCode || JSON.stringify(f).slice(0, 150)));
    }
    const gid = r.groupInfo?.groupId || r.groupInfo?._id || r.groupId || "";
    let id = "";
    const ml = r.messageList;
    if (Array.isArray(ml) && ml.length) id = ml[0].messageId || "";
    else if (ml && typeof ml === "object") id = Object.keys(ml)[0] || "";
    await sendLog(shop, { type: (o.scheduledDate ? `[예약 ${o.scheduledDate}] ` : "") + (o.type || ""), to: o.to, kind, ok: true, id: id || gid, text: o.text, ref: o.ref });
    if (!gate.cash) await smsWarnOwner(gate);
    return { ok: true, id: id || gid, groupId: gid, from: gate.from,
             via: kind === "ATA" ? "ata" : "sms",            // sb15(알림톡 방): 실제로 보낸 방식 — 알림톡 코드가 없어 문자로 바꿨으면 "sms"
             cash: gate.cash ? { price: gate.price, balance: gate.balance } : undefined };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    await msgUndo(gate);          // 안 나갔으니 미리 깎은 것을 돌려줍니다
    await sendLog(shop, { type: o.type, to: o.to, kind: o.kind, ok: false, error: m, text: o.text, ref: o.ref });
    return { ok: false, error: m };
  }
}


/* =========================================================
   요금제 사용량 — 결제일부터 30일, 무료 건수 → 여유분 20건 → 충전분
   ========================================================= */
const CYCLE_DAYS = 30;
const DAY = 864e5;

function dayStr(d: Date) { return d.toISOString().slice(0, 10); }
/* 날짜 칸은 2026-11-24 일 수도, 2026-11-24 00:00:00+00 일 수도 있습니다.
   어느 쪽이 와도 앞 10글자만 써서 계산이 깨지지 않게 합니다. */
function ymd10(v: unknown) { return String(v ?? "").slice(0, 10); }
function korDay(iso: string) {
  const y = ymd10(iso);
  if (!y) return "";
  const d = new Date(y + "T00:00:00Z");
  return (d.getUTCMonth() + 1) + "월 " + d.getUTCDate() + "일";
}

const SHOP_COLS = "shop,name,active,plan,trial_until,trial_sms,trial_tax,paid_at,paid_until,cycle_start," +
  "sms_used,sms_paid,tax_used,tax_paid,spare_used,spare_max,warn_at,stop_warn_at,owner_phone,sms_from,biz_no";

/* 주기가 지났으면 30일씩 넘기고 이번 주기 사용량을 0으로 되돌립니다 */
async function rollCycle(sh: any) {
  if (!sh || !sh.cycle_start) return sh;
  const start = new Date(ymd10(sh.cycle_start) + "T00:00:00Z").getTime();
  const passed = Math.floor((Date.now() - start) / (CYCLE_DAYS * DAY));
  if (passed < 1) return sh;
  const next = dayStr(new Date(start + passed * CYCLE_DAYS * DAY));
  const patch = { cycle_start: next, sms_used: 0, tax_used: 0, spare_used: 0, warn_at: null, stop_warn_at: null };
  await sb.from("wash_shops").update(patch).eq("shop", sh.shop);
  return Object.assign({}, sh, patch);
}

/* 앱·PC 화면에 뿌릴 요금제 상태 한 덩어리 */
async function planInfoOf(shopRow: any) {
  let sh = shopRow;
  if (!sh) return null;
  const isTrial = !sh.plan || sh.plan === "trial";
  if (isTrial) {
    const tFree = Math.max(0, Number(sh.trial_sms ?? TRIAL_SMS));
    const xFree = Math.max(0, Number(sh.trial_tax ?? TRIAL_TAX));
    const tUsed = Math.max(0, Number(sh.sms_used || 0));
    const xUsed = Math.max(0, Number(sh.tax_used || 0));
    const tPaid = Math.max(0, Number(sh.sms_paid || 0));
    const xPaid = Math.max(0, Number(sh.tax_paid || 0));
    let dLeft = 0;
    const tUntil = ymd10(sh.trial_until);
    if (tUntil)
      dLeft = Math.ceil((new Date(tUntil + "T23:59:59+09:00").getTime() - Date.now()) / DAY);
    return { trial: true, shop: sh.name || sh.shop, name: "무료 체험",
             trialUntil: tUntil || null,
             daysLeft: tUntil ? Math.max(0, dLeft) : null,
             until: tUntil || "",
             smsFree: tFree, smsPaid: tPaid, smsLeft: Math.max(0, tFree - tUsed) + tPaid,
             taxFree: xFree, taxPaid: xPaid, taxLeft: Math.max(0, xFree - xUsed) + xPaid,
             smsStop: (tFree - tUsed) <= 0 && tPaid <= 0 };
  }
  sh = await rollCycle(sh);
  const { data: pl } = await sb.from("wash_plans")
    .select("code,name,price,sms_free,tax_free").eq("code", sh.plan).maybeSingle();

  const smsFree = Math.max(0, Number((pl && pl.sms_free) || 0));
  const taxFree = Math.max(0, Number((pl && pl.tax_free) || 0));
  const smsUsed = Math.max(0, Number(sh.sms_used || 0));
  const taxUsed = Math.max(0, Number(sh.tax_used || 0));
  const smsPaid = Math.max(0, Number(sh.sms_paid || 0));
  const taxPaid = Math.max(0, Number(sh.tax_paid || 0));
  const spareMax = Math.max(0, Number(sh.spare_max ?? 20));
  const spareUsed = Math.max(0, Number(sh.spare_used || 0));

  const smsFreeLeft = Math.max(0, smsFree - smsUsed);
  const taxFreeLeft = Math.max(0, taxFree - taxUsed);
  /* 화면에 보이는 남은 문자 = 무료 남은 것 + 충전분 (여유분은 보여주지 않습니다) */
  const smsLeft = smsFreeLeft + smsPaid;
  const taxLeft = taxFreeLeft + taxPaid;
  const smsStop = smsLeft === 0 && spareUsed >= spareMax;

  const start = sh.cycle_start || sh.paid_at || null;
  let daysLeft = 0, until = "";
  if (start) {
    const endMs = new Date(ymd10(start) + "T00:00:00Z").getTime() + CYCLE_DAYS * DAY;
    daysLeft = Math.ceil((endMs - Date.now()) / DAY);
    until = korDay(dayStr(new Date(endMs)));
  }
  return {
    trial: false,
    shop: sh.name || sh.shop,
    code: sh.plan,
    name: (pl && pl.name) || sh.plan,
    price: Number((pl && pl.price) || 0),
    daysLeft, paidAt: korDay(sh.paid_at || start || ""), until,
    smsFree, smsLeft, smsPaid, smsStop,
    taxFree, taxLeft, taxPaid,
  };
}

async function planInfo(shop: string) {
  const { data } = await sb.from("wash_shops").select(SHOP_COLS).eq("shop", shop).maybeSingle();
  return await planInfoOf(data);
}

/* 이용 기간이 지났는지 — 본사가 적어 둔 paid_until 이 기준입니다 */
function paidExpired(sh: any) {
  if (!sh || !sh.paid_until) return false;
  return new Date(ymd10(sh.paid_until) + "T23:59:59+09:00").getTime() < Date.now();
}
function trialExpired(sh: any) {
  if (!sh || !sh.trial_until) return false;
  return new Date(ymd10(sh.trial_until) + "T23:59:59+09:00").getTime() < Date.now();
}


/* ════════════════════════════════════════════════════════════
   이용기간이 끝난 뒤 — 잠금 → 차단 → 자료 정리
     끝난 날까지            : 평소대로 (ok)
     끝난 다음 날 ~ 7일     : 로그인은 되지만 새 작업은 멈춤 (lock)
     그 다음 날부터         : 로그인도 막힘 (blocked)
     끝난 날로부터 90일 뒤  : 자료 정리 대상 (관리에서 눈으로 보고 지웁니다)
   ※ 7일 · 90일은 관리에서 바꿀 수 있습니다.
   ※ 업체의 «로그인 가능 날짜(open_until)» 가 오늘 이후면 그날까지 평소대로 열립니다.
   ════════════════════════════════════════════════════════════ */
const LOCK_COLS = "shop,name,plan,active,trial_until,paid_until,lock_days,open_until,open_memo,paid_say_at,owner_phone";

function ymdAdd(ymd: string, n: number) {
  if (!ymd) return "";
  return new Date(Date.parse(ymd + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}
function ymdGap(from: string, to: string) {
  if (!from || !to) return 0;
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / DAY);
}
function kstYmd() { return new Date(kstToday()).toISOString().slice(0, 10); }

function lockOf(sh: any, cfg: any) {
  const L = (cfg && cfg.lock) || {};
  const on = L.on !== false;
  const isTrial = !sh || !sh.plan || sh.plan === "trial";
  const endAt = String(((isTrial ? (sh && sh.trial_until) : (sh && sh.paid_until)) || "")).slice(0, 10);
  const hqDays = Math.max(0, Number(L.lockDays ?? 7));
  const lockDays = (sh && sh.lock_days !== null && sh.lock_days !== undefined)
    ? Math.max(0, Number(sh.lock_days))
    : ((isTrial && L.trialSame === false) ? 0 : hqDays);
  const delDays = Math.max(0, Number(L.delDays ?? 90));
  const today = kstYmd();
  const openUntil = String((sh && sh.open_until) || "").slice(0, 10);

  const st: any = {
    state: "ok", kind: isTrial ? "trial" : "paid", endAt, today,
    lockDays, delDays, on,
    warnDel: L.warnDel !== false, paidSay: L.paidSay !== false,
    name: (sh && sh.name) || "", shop: (sh && sh.shop) || "",
  };
  if (!on || !endAt) return st;

  st.lockUntil = ymdAdd(endAt, lockDays);       // 이 날까지는 로그인 가능
  st.blockFrom = ymdAdd(endAt, lockDays + 1);   // 이 날부터 로그인 막힘
  st.delAt     = ymdAdd(endAt, delDays);        // 이 날부터 자료 정리 대상
  st.leftToDel = ymdGap(today, st.delAt);

  if (today <= endAt) return st;                // 아직 안 끝났습니다

  if (openUntil && today <= openUntil) {        // 본사가 따로 열어 둔 업체
    st.opened   = true;
    st.openUntil = openUntil;
    st.openMemo = String((sh && sh.open_memo) || "");
    st.leftOpen = ymdGap(today, openUntil);
    return st;                                   // state = ok
  }
  st.goneDays   = ymdGap(endAt, today);
  st.state      = (today <= st.lockUntil) ? "lock" : "blocked";
  st.leftToBlock = Math.max(0, ymdGap(today, st.lockUntil));
  return st;
}

/* 같은 업체를 1분 안에 여러 번 물어보지 않게 잠깐 담아 둡니다 */
const _lockBox = new Map<string, { at: number; st: any }>();
function lockClear(shop?: string) { if (shop) _lockBox.delete(shop); else _lockBox.clear(); }
async function lockState(shop: string, force = false) {
  const hit = _lockBox.get(shop);
  if (!force && hit && Date.now() - hit.at < 60000) return hit.st;
  const { data: sh } = await sb.from("wash_shops").select(LOCK_COLS).eq("shop", shop).maybeSingle();
  const st = lockOf(sh, await hqCfg());
  st.shop = shop; st.name = (sh && sh.name) || shop;
  _lockBox.set(shop, { at: Date.now(), st });
  return st;
}

/* 잠금·차단일 때 보여 드릴 말 */
function lockMsg(st: any) {
  const what = st.kind === "trial" ? "체험 기간" : "이용기간";
  if (st.state === "blocked")
    return what + "이 " + korDay(st.endAt) + "에 끝나 지금은 쓰실 수 없습니다.\n" +
           "결제하시면 바로 다시 열립니다. 차곳간 010-9559-3663";
  return what + "이 " + korDay(st.endAt) + "에 끝났습니다.\n" +
         "지난 자료는 보실 수 있지만 새 작업은 " + korDay(st.blockFrom) + "까지 멈춰 있습니다.\n" +
         "결제하시면 바로 다시 열립니다.";
}

/* 잠금 중에도 쓸 수 있는 기능 — 보기 · 내려받기 · 결제만 열어 둡니다 */
const LOCK_OK: Record<string, number> = {
  apiVer: 1, ping: 1, apiStamp: 1, apiLoad: 1, shotLinks: 1,   // sb4: 잠긴 업체도 사진은 보기
  driveText: 1, driveB64: 1, aiReady: 1,                       // sb12: sb4 주석에 묻혀 꺼져 있던 것 되살림 (보안 방 발견)
  payStart: 1, payConfirm: 1, billStart: 1, billIssue: 1, billInfo: 1, billOff: 1, payMine: 1, payDue: 1, cashInfo: 1, cashAsk: 1,
  pbCheck: 1, pbReady: 1, viewLink: 1, viewBill: 1, cancelSchedule: 1, lockInfo: 1, paidSay: 1, noticeList: 1, noticeHide: 1,
  inviteList: 1, userList: 1,
};

/* ══════════════════════════════════════════════════════
   공지사항 — 한 번 쓰면 앱과 홈페이지에 같이 올라갑니다
   ══════════════════════════════════════════════════════ */
const NOTICE_KIND = ["update", "price", "etc"];
function noticeKind(v: unknown) {
  const k = String(v || "etc").trim().toLowerCase();
  return NOTICE_KIND.indexOf(k) >= 0 ? k : "etc";
}
function noticeWhere(v: unknown) {
  const w = String(v || "both").trim().toLowerCase();
  return (w === "app" || w === "home") ? w : "both";
}
/* 지금 보여 줄 공지만 골라 옵니다 */
async function noticeLive(where: string) {
  try {
    const { data, error } = await sb.rpc("wash_notice_live", { p_where: where });
    if (error) throw error;
    return (data || []) as any[];
  } catch (_) {
    /* SQL 을 아직 안 돌렸으면 빈 목록으로 조용히 넘어갑니다 */
    return [];
  }
}
function noticeOut(n: any) {
  return {
    id: n.id, kind: n.kind, title: n.title, body: n.body,
    pin: !!n.pin, pop: !!n.pop,
    at: String(n.created_at || "").slice(0, 10),
    from: n.from_at || "", to: n.to_at || "",
  };
}

/* 이 업체의 이번 주기 무료 문자 건수 */
async function smsFreeOf(sh: any) {
  if (!sh.plan || sh.plan === "trial") return Math.max(0, Number(sh.trial_sms ?? TRIAL_SMS));
  const { data: pl } = await sb.from("wash_plans").select("sms_free").eq("code", sh.plan).maybeSingle();
  return Math.max(0, Number((pl && pl.sms_free) || 0));
}

/* 문자 한 건을 «미리 차감»합니다 — 동시에 여러 건이 나가도 정확히 셉니다.
   돌려주는 값: {allow, from, sh, why} · from = free / paid / spare / stop / expired / off */
async function smsTake(shop: string) {
  const { data: sh0 } = await sb.from("wash_shops").select(SHOP_COLS).eq("shop", shop).maybeSingle();
  if (!sh0) return { allow: false, from: "off", sh: null, why: "업체 정보를 찾지 못했습니다" };
  if (sh0.active === false)
    return { allow: false, from: "off", sh: sh0, why: "이용이 멈춰 있는 업체입니다. 차곳간으로 연락해 주세요" };
  const sh = await rollCycle(sh0);
  const isTrial = !sh.plan || sh.plan === "trial";
  if (isTrial && trialExpired(sh))
    return { allow: false, from: "expired", sh, why: "무료 체험 기간이 끝났습니다. 요금제를 정하시면 다시 나갑니다" };
  if (!isTrial && paidExpired(sh))
    return { allow: false, from: "expired", sh, why: "이용 기간이 지났습니다. 연장하셔야 문자가 다시 나갑니다" };

  const free = await smsFreeOf(sh);
  let src = "";
  try {
    const { data, error } = await sb.rpc("wash_sms_take", { p_shop: shop, p_free: free });
    if (error) throw error;
    src = String(data || "stop");
  } catch (_) {
    /* SQL 을 아직 안 돌린 경우 — 예전 방식으로라도 반드시 셉니다 (막는 것은 똑같이 합니다) */
    const used = Math.max(0, Number(sh.sms_used || 0));
    const paid = Math.max(0, Number(sh.sms_paid || 0));
    const sMax = Math.max(0, Number(sh.spare_max ?? 20));
    const sUse = Math.max(0, Number(sh.spare_used || 0));
    if (used < free) { src = "free";  await sb.from("wash_shops").update({ sms_used: used + 1 }).eq("shop", shop); }
    else if (paid > 0) { src = "paid";  await sb.from("wash_shops").update({ sms_paid: paid - 1 }).eq("shop", shop); }
    else if (sUse < sMax) { src = "spare"; await sb.from("wash_shops").update({ spare_used: sUse + 1 }).eq("shop", shop); }
    else src = "stop";
  }
  if (src === "stop" || src === "none")
    return { allow: false, from: "stop", sh, why: "무료 문자를 모두 사용했습니다. 충전한 뒤 사용해 주세요." };
  return { allow: true, from: src, sh, free };
}

/* 발송이 실패했으면 미리 깎은 한 건을 되돌립니다 */
async function smsUndo(gate: any) {
  if (!gate || !gate.sh || !gate.allow) return;
  try {
    const { error } = await sb.rpc("wash_sms_undo", { p_shop: gate.sh.shop, p_src: gate.from });
    if (error) throw error;
  } catch (_) {
    const sh = gate.sh;
    const patch: Record<string, unknown> = {};
    if (gate.from === "free")  patch.sms_used   = Math.max(0, Number(sh.sms_used || 0));
    if (gate.from === "paid")  patch.sms_paid   = Number(sh.sms_paid || 0);
    if (gate.from === "spare") patch.spare_used = Math.max(0, Number(sh.spare_used || 0));
    if (Object.keys(patch).length) await sb.from("wash_shops").update(patch).eq("shop", sh.shop);
  }
}

/* 본사가 보내는 안내 문자 (업체 건수를 깎지 않습니다) */
async function noticeSms(phone: string, text: string, meta?: SendMeta) {
  const to = digits(phone);
  if (!to || to.length < 10) return;
  const from = digits(env("SMS_FROM", "") || env("OTP_FROM", "01095593663"));
  if (!from) return;
  await solapi("POST", "/messages/v4/send-many/detail",
    { messages: [{ to, from, type: isLong(text) ? "LMS" : "SMS",   // sb26: 90바이트
                   subject: "차곳간", text }] }, Object.assign({ tpl: "notice" }, meta || {}));
}

/* =========================================================
   sb5 알림톡 (카카오) — 템플릿 코드는 관리 설정(wash_hq.ata_cfg.tpl)에서 읽습니다.
   ata_cfg = { pfId?: "채널 ID(없으면 비밀값 PF_ID)", tpl: { otp: "KA01TP…", charge: "…", … } }
   ========================================================= */
let _ataBox: { at: number; v: any } = { at: 0, v: null };
async function ataCfg(force = false): Promise<{ pfId: string; tpl: Record<string, string> }> {
  if (!force && _ataBox.v && Date.now() - _ataBox.at < 60000) return _ataBox.v;
  let c: any = {};
  try {
    const { data, error } = await sb.from("wash_hq").select("ata_cfg").eq("id", 1).maybeSingle();
    if (!error && data && data.ata_cfg && typeof data.ata_cfg === "object") c = data.ata_cfg;
  } catch (_) { /* sql/05 를 아직 안 돌렸으면 빈 설정 = 모두 문자 */ }
  const tpl: Record<string, string> = {};
  Object.keys((c && c.tpl) || {}).forEach((k) => { const v = String(c.tpl[k] || "").trim(); if (v) tpl[k] = v; });
  _ataBox = { at: Date.now(), v: { pfId: String((c && c.pfId) || env("PF_ID") || "").trim(), tpl } };
  return _ataBox.v;
}
/* 템플릿별 변수와 대체 문구 — 2026-10-10 확정본(알림톡/00_확정본_13개_원문.md)과 글자까지 같게.
   통과 8개: 입고안내·출고안내·추가작업·청구서·입금확인(업체→거래처, 화면이 보냄) · 결제완료·충전완료·인증번호(서버가 보냄) */
const ATA_TPL: Record<string, { name: string; vars: string[]; sms: string }> = {
  auth:    { name: "차곳간_인증번호", vars: ["인증번호", "유효시간"],
             sms: "[차곳간] 인증번호 #{인증번호} (#{유효시간}분 안에 입력)" },
  cash_done: { name: "차곳간_충전완료", vars: ["업체명", "금액", "잔액", "사용기한"],
             sms: "[차곳간] #{금액}원 충전되었습니다. 잔액 #{잔액}원.\n문의 010-9559-3663" },
  pay_done: { name: "차곳간_결제완료", vars: ["업체명", "금액", "요금제", "결제수단", "이용기한"],
             sms: "[차곳간] #{금액}원 결제 완료. 이용 기한 #{이용기한}까지.\n문의 010-9559-3663" },
  intake:  { name: "차곳간_입고안내", vars: ["딜러명", "상사명", "업체명", "차량번호", "작업내용", "입고일시", "업체전화"],
             sms: "[차곳간] #{차량번호} 입고되었습니다.\n#{업체명} 문의 #{업체전화}" },
  release: { name: "차곳간_출고안내", vars: ["딜러명", "상사명", "차량번호", "작업내용", "목적지", "출고일시", "업체전화", "업체명", "보기코드"],
             sms: "[차곳간] #{차량번호} 출고되었습니다.\n도착한 곳: #{목적지}\n도착 사진 https://app.cgg.co.kr/v.html?c=#{보기코드}\n#{업체명} #{업체전화}" },
  extra_work: { name: "차곳간_추가작업", vars: ["차량번호", "업체명", "작업내용", "금액", "업체전화", "보기코드"],
             sms: "[차곳간] #{차량번호} 추가 작업 확인 부탁드립니다.\n#{작업내용} #{금액}원\n#{업체명} #{업체전화}" },
  bill:    { name: "차곳간_청구서", vars: ["기간", "받는곳", "업체명", "건수", "금액", "입금기한", "계좌", "업체전화", "보기코드"],
             sms: "[차곳간] #{기간} 청구 내역\n· #{건수}대 #{금액}원\n· 입금 기한 #{입금기한}\n· #{계좌}\n내역 보기 https://app.cgg.co.kr/v.html?c=#{보기코드}\n#{업체명} #{업체전화}" },
  deposit_ok: { name: "차곳간_입금확인", vars: ["받는곳", "금액", "업체명", "확인일시", "기간", "업체전화"],
             sms: "[차곳간] #{금액}원 입금 확인되었습니다. 감사합니다.\n#{업체명} #{업체전화}" },
  /* sb8: 새 템플릿(알림톡/02 새 E · 심사 뒤 코드 넣기) — 접속주소는 서버가 채움 */
  staff_link: { name: "차곳간_접속주소안내", vars: ["직원명", "업체명", "접속주소"],
             sms: "[차곳간] #{업체명} 직원 접속 주소 #{접속주소} (본인 번호로 로그인)" },
};
/* sb10: 자동 결제 안내 (서버만 보냄 · 새 템플릿 초안 — 알림톡 방이 문안 다듬고 심사 뒤 코드 넣기. sb25: 코드 없으면 대체 문구 문자) */
/* sb16(알림톡/08 · 10/16 카카오 통과 5개): 기한·잠금·자료 정리·잔액 안내를 알림톡으로 (코드가 없으면 지금처럼 문자) */
Object.assign(ATA_TPL, {
  expire_soon: { name: "차곳간_기간종료예정", vars: ["업체명", "무엇", "종료일", "남은일", "요금제"],
             sms: "[차곳간] #{업체명} #{무엇} #{종료일} 종료 예정. 문의 010-9559-3663" },
  use_limit:   { name: "차곳간_이용제한시작", vars: ["업체명", "무엇", "종료일", "차단일", "보관일"],
             sms: "[차곳간] #{업체명} #{무엇} 종료로 오늘부터 자료 조회만 됩니다. 로그인 제한 #{차단일}부터. 문의 010-9559-3663" },
  login_block: { name: "차곳간_로그인제한예정", vars: ["업체명", "무엇", "종료일", "차단일", "보관일"],
             sms: "[차곳간] #{업체명} #{차단일}부터 로그인이 제한됩니다. 문의 010-9559-3663" },
  data_keep:   { name: "차곳간_자료보관기한", vars: ["업체명", "무엇", "종료일", "보관일"],
             sms: "[차곳간] #{업체명} 자료 정리 예정일 #{보관일}. 문의 010-9559-3663" },
  balance:     { name: "차곳간_잔액안내", vars: ["업체명", "잔액", "기준일"],
             sms: "[차곳간] #{업체명} 이용 잔액 #{잔액}원 (기준 금액 아래). 문의 010-9559-3663" },
});
/* sb16: 알림톡 코드가 있으면 알림톡(안 되면 확정본 대체 문구 문자), 코드가 없으면 지금까지 보내던 문자(관리에서 고친 문구) 그대로 */
async function ataOrSms(phone: string, key: string, v: Record<string, unknown>, smsText: string, meta?: SendMeta): Promise<string> {
  const c = await ataCfg();
  if (c.tpl[key] && c.pfId) return await noticeAta(phone, key, v, true, meta);
  await noticeSms(phone, smsText, Object.assign({ tpl: key + "_sms" }, meta || {}));
  return "sms";
}
Object.assign(ATA_TPL, {
  /* 알림톡/02 새 G (알림톡 방) — #{카드} 는 카드사 이름만 */
  bill_on: { name: "차곳간_자동결제등록", vars: ["업체명", "카드", "다음결제일"],
             sms: "[차곳간] 자동 결제 카드 등록(#{카드}). 다음 결제 #{다음결제일}. 문의 010-9559-3663" },   // sb25: 알림톡/12 ⑦ 확정 문구
  /* 알림톡/02 새 F (알림톡 방 초안 · 결제 방과 맞춘 변수) — D+5 마지막 실패에는 안 보냄 */
  bill_fail: { name: "차곳간_자동결제실패", vars: ["업체명", "결제일", "요금제", "금액", "사유", "다음시도일"],
             sms: "[차곳간] 자동 결제 실패(#{사유}). 다음 시도 #{다음시도일}. 문의 010-9559-3663" },   // sb25: 알림톡/12 ⑦ 확정 문구
});
/* sb10: 화면이 sendMsg 의 ataKey 로 고를 수 있는 것 — 화면 안내만 */
const SCREEN_ATA = ["intake", "release", "extra_work", "bill", "deposit_ok", "staff_link"];
/* sb8: 직원에게 보내도 되는 주소 = 열쇠 없는 «직원용 주소» 하나뿐 (화면 QR_URL 과 같음) */
const STAFF_URL = "https://app.cgg.co.kr/";
/* 관리 화면(v4.1)이 저장하는 13개 키 + 체크 서버 차량 도착(check_arrive · 체크 v29 가 읽음) — 반려 5개(expire_soon·use_limit·login_block·data_keep·balance)는 통과 뒤 ATA_TPL 에 연결 */
const ATA_KEYS = ["intake", "release", "extra_work", "bill", "deposit_ok", "expire_soon", "use_limit", "login_block",
  "data_keep", "pay_done", "cash_done", "balance", "auth",
  "check_arrive", "staff_link", "bill_on", "bill_fail"];   // 체크 차량 도착 알림 (본사 채널 · 새 템플릿 심사 뒤) — 체크 서버 v29 가 읽음
/* 화면이 «#{이름}» 또는 «이름» 으로 보낸 값을 확정본 변수로 맞춥니다. 빠진 이름이 있으면 missing 에 */
function ataPick(key: string, v: Record<string, unknown>) {
  const out: Record<string, string> = {}, missing: string[] = [];
  (ATA_TPL[key]?.vars || []).forEach((n) => {
    const x = v[n] !== undefined ? v[n] : v["#{" + n + "}"];
    if (x === null || x === undefined || String(x).trim() === "") missing.push(n);
    out["#{" + n + "}"] = (x === null || x === undefined || String(x).trim() === "") ? "-" : String(x);
  });
  return { vars: out, missing };
}
function ataVars(key: string, v: Record<string, unknown>) { return ataPick(key, v).vars; }
function ataSms(key: string, vars: Record<string, string>) {
  let t = ATA_TPL[key]?.sms || "";
  Object.keys(vars).forEach((k) => { t = t.split(k).join(vars[k]); });
  return t;
}
/* sb7: 공식 채널로 나가는 안내의 «업체» 칸과 «보기코드» 는 서버가 정합니다 */
function telOf(v: unknown) {
  const n = digits(String(v || ""));
  if (n.length === 11) return n.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (n.length === 10) return n.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  return n;
}
async function ataServerVars(shop: string, k: string, v: Record<string, unknown>, recId: string) {
  const names = ATA_TPL[k]?.vars || [];
  const { data: sh } = await sb.from("wash_shops").select("name,sms_from,owner_phone").eq("shop", shop).maybeSingle();
  if (names.indexOf("업체명") >= 0) v["업체명"] = String((sh && sh.name) || shop);
  if (names.indexOf("업체전화") >= 0) v["업체전화"] = telOf((sh && (sh.sms_from || sh.owner_phone)) || "");
  delete v["#{업체명}"]; delete v["#{업체전화}"];
  /* sb8: 상사명이 비면 «개인» (「홍길동님(-)」 안 되게) */
  if (names.indexOf("상사명") >= 0 && !String(v["상사명"] ?? v["#{상사명}"] ?? "").trim()) { v["상사명"] = "개인"; delete v["#{상사명}"]; }
  /* sb8: 접속주소는 화면 값을 버리고 열쇠 없는 직원용 주소로만 */
  if (names.indexOf("접속주소") >= 0) { v["접속주소"] = STAFF_URL; delete v["#{접속주소}"]; }
  if (names.indexOf("보기코드") < 0) return;
  const given = String(v["보기코드"] ?? v["#{보기코드}"] ?? "").trim().toUpperCase();
  delete v["#{보기코드}"];
  if (k === "release" || k === "extra_work") {
    /* 출고·추가작업: 이 업체의 입고 기록이어야 하고, 보기코드는 서버가 만듭니다 */
    if (!recId) throw new Error("어느 차인지 알 수 없습니다 (입고 기록 번호가 없습니다)");
    const { data: doc } = await sb.from("wash_docs")
      .select("id").eq("shop", shop).eq("demo", false).eq("col", "intakes").eq("id", recId).maybeSingle();
    if (!doc) throw new Error("그 차를 찾지 못했습니다");
    const vc: any = await viewCodeOf(shop, recId);
    v["보기코드"] = String((vc && (vc.code || vc)) || "");
    return;
  }
  /* 청구서: 이 업체의 살아 있는 보기코드인지 확인 (청구서 보기 주소는 대표·매니저가 viewBill 로 만듦) */
  if (!/^[A-F0-9]{24}$/.test(given)) throw new Error("청구서 보기 주소가 올바르지 않습니다");
  const { data: vc } = await sb.from("wash_viewcode").select("shop,expires_at,kind").eq("code", given).maybeSingle();
  if (!vc || String(vc.shop) !== shop || String(vc.kind) !== "bill" || new Date(String(vc.expires_at)).getTime() < Date.now())
    throw new Error("청구서 보기 주소가 이 업체 것이 아니거나 만료되었습니다");
  v["보기코드"] = given;
}
/** sb27: 밀린 달 한꺼번에 — 묶인 다른 달 보기코드에도 받은 번호를 남김. 같은 업체 · kind bill · 기한 안 ·
 *  받는 곳 열쇠(«bill:달|…» 의 달 뒤)가 보낸 코드와 같은 것만. 그 밖은 조용히 건너뜀(보내기는 그대로) */
async function billToPhoneMore(shop: string, mainCode: string, codes: unknown[], to: string) {
  const main = String(mainCode || "").trim().toUpperCase();
  const want = Array.from(new Set(codes.map((c) => String(c || "").trim().toUpperCase())))
    .filter((c) => /^[A-F0-9]{24}$/.test(c) && c !== main).slice(0, 24);
  if (!want.length || !/^[A-F0-9]{24}$/.test(main)) return;
  try {
    const { data: mv } = await sb.from("wash_viewcode").select("shop,kind,rec_id").eq("code", main).maybeSingle();
    const mt = /^bill:\d{4}-\d{2}(\|.+)$/.exec(String((mv && mv.rec_id) || ""));
    if (!mv || String(mv.shop) !== shop || String(mv.kind) !== "bill" || !mt) return;
    const { data: rows } = await sb.from("wash_viewcode").select("code,shop,kind,rec_id,expires_at").in("code", want);
    for (const r of rows || []) {
      const t = /^bill:\d{4}-\d{2}(\|.+)$/.exec(String(r.rec_id || ""));
      if (String(r.shop) !== shop || String(r.kind) !== "bill" || !t || t[1] !== mt[1]) continue;
      if (new Date(String(r.expires_at)).getTime() < Date.now()) continue;
      await billToPhone(shop, String(r.code), to);
    }
  } catch (_) { /* 기록만 — 못 남겨도 알림은 그대로 나감 */ }
}
async function billToPhone(shop: string, code: string, to: string) {
  const p = digits(to);
  if (!/^01\d{8,9}$/.test(p) || !code) return;
  try {
    const { data: vc } = await sb.from("wash_viewcode").select("shop,kind,to_phones").eq("code", code).maybeSingle();
    if (!vc || String(vc.shop) !== shop || String(vc.kind) !== "bill") return;
    const list: string[] = Array.isArray(vc.to_phones) ? vc.to_phones.map(String) : [];
    if (list.indexOf(p) >= 0) return;
    await sb.from("wash_viewcode").update({ to_phones: list.concat([p]).slice(-20) }).eq("code", code);
  } catch (_) { /* 칸이 아직 없으면(SQL 06 전) 그냥 넘어감 — 알림은 그대로 나감 */ }
}
async function planName(code: string) {
  if (!code) return "-";
  const pl = await planOf(code);
  return String((pl && pl.name) || code);
}
const won = (n: unknown) => Math.round(Number(n) || 0).toLocaleString("ko-KR");   // 확정본은 «#{금액}원» 이라 숫자만
/** 알림톡 먼저 → 안 되면 문자(확정본 대체 문구). 돌려주는 값: "ata" | "sms" | "skip"(받는 번호 없을 때만)
 *  sb25(대표님 «대체 메시지 발송을 모든 알림에»): 코드가 없거나 채널 ID 가 없어도 늘 대체 문구 문자로 보냄 —
 *  예전 smsIfNoCode=false(결제완료·충전완료·자동결제등록·자동결제실패 «코드 없으면 안 나감»)는 없앰. 인자는 옛 부르는 곳 때문에 남겨 둠(쓰지 않음).
 *  보낸 기록은 via 로 «ata / sms·lms(대체)» 가 갈림 */
async function noticeAta(phone: string, key: string, v: Record<string, unknown>, _smsIfNoCode = true, meta?: SendMeta): Promise<string> {
  const mt: SendMeta = Object.assign({}, meta || {}, { tpl: key });   // sb15: 발송 기록 — 템플릿 키 그대로
  const to = digits(phone);
  if (!to || to.length < 10) { await sendSkip(to, "받는 번호가 없어 보내지 않음", mt); return "skip"; }
  const c = await ataCfg();
  const tid = c.tpl[key];
  const pk = ataPick(key, v);
  const vars = pk.vars;
  const smsText = ataSms(key, vars);
  const from = digits(env("SMS_FROM", "") || env("OTP_FROM", "01095593663"));
  if (tid && c.pfId && pk.missing.length) {
    /* sb8: 빈 값이 있으면 「-까지」 같은 알림톡 대신 대체 문구 문자로 */
    console.error("noticeAta vars missing", key, pk.missing.join(","));
    await noticeSms(to, smsText, mt);
    return "sms";
  }
  if (tid && c.pfId) {
    try {
      /* 규칙 5-6: 알림톡이 안 되면 솔라피가 문자로 대신 (text = 확정본 대체 문구) */
      const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [{
        to, from, text: smsText, kakaoOptions: { pfId: c.pfId, templateId: tid, variables: vars, disableSms: false } }] }, mt);
      const failed = r.failedMessageList || [];
      if (!failed.length) return "ata";
      console.error("noticeAta failed", key, JSON.stringify(failed[0]).slice(0, 200));
    } catch (e) { console.error("noticeAta", key, e); }
    await noticeSms(to, smsText, mt);          // 알림톡 요청 자체가 거절되면 서버가 바로 문자로
    return "sms";
  }
  await noticeSms(to, smsText, mt);          // sb25: 코드·채널 ID 가 없어도 대체 문구 문자로
  return "sms";
}

/* 무료가 떨어졌을 때 대표에게 알립니다 (이 문자는 건수를 깎지 않습니다) */
async function smsWarnOwner(gate: any) {
  const sh = gate && gate.sh;
  if (!sh) return;
  const phone = digits(sh.owner_phone || "");
  if (!phone || phone.length < 10) return;
  const home = "app.cgg.co.kr";
  try {
    if (gate.from === "spare" && !sh.warn_at) {
      await sb.from("wash_shops").update({ warn_at: new Date().toISOString() }).eq("shop", sh.shop);
      await noticeSms(phone,
        "[차곳간] " + (sh.name || sh.shop) + "\n\n무료 문자를 모두 사용하였습니다.\n" +
        "남은 양이 없으면 곧 출고 알림이 나가지 않습니다.\n이용 현황: " + home);   // sb7: 권유 문구 뺌
    }
    if (gate.from === "stop" && !sh.stop_warn_at) {
      await sb.from("wash_shops").update({ stop_warn_at: new Date().toISOString() }).eq("shop", sh.shop);
      await noticeSms(phone,
        "[차곳간] " + (sh.name || sh.shop) + "\n\n문자 발송이 멈췄습니다.\n" +
        "출고 알림이 나가지 않는 상태입니다.\n이용 현황: " + home);   // sb7: 권유 문구 뺌
    }
  } catch (_) { /* 알림이 실패해도 본 기능은 계속 갑니다 */ }
}

/* 계산서도 같은 방식 (여유분 없음 — 넘으면 바로 막습니다) */
async function taxTake(shop: string) {
  const { data: sh0 } = await sb.from("wash_shops").select(SHOP_COLS).eq("shop", shop).maybeSingle();
  if (!sh0) return { allow: false, from: "off", sh: null, why: "업체 정보를 찾지 못했습니다" };
  if (sh0.active === false)
    return { allow: false, from: "off", sh: sh0, why: "이용이 멈춰 있는 업체입니다" };
  const sh = await rollCycle(sh0);
  const isTrial = !sh.plan || sh.plan === "trial";
  if (isTrial && trialExpired(sh))
    return { allow: false, from: "expired", sh, why: "무료 체험 기간이 끝났습니다" };
  if (!isTrial && paidExpired(sh))
    return { allow: false, from: "expired", sh, why: "이용 기간이 지났습니다. 연장 후 발행해 주세요" };

  let free = 0, planName = "이 요금제";
  if (isTrial) free = Math.max(0, Number(sh.trial_tax ?? TRIAL_TAX));
  else {
    const { data: pl } = await sb.from("wash_plans").select("tax_free,name").eq("code", sh.plan).maybeSingle();
    free = Math.max(0, Number((pl && pl.tax_free) || 0));
    planName = (pl && pl.name) || planName;
  }
  const paid = Math.max(0, Number(sh.tax_paid || 0));
  if (free === 0 && paid === 0)
    return { allow: false, from: "none", sh, why: planName + "는 계산서를 쓸 수 없습니다. 요금제를 올리시면 쓸 수 있습니다" };

  let src = "";
  try {
    const { data, error } = await sb.rpc("wash_tax_take", { p_shop: shop, p_free: free });
    if (error) throw error;
    src = String(data || "stop");
  } catch (_) {
    const used = Math.max(0, Number(sh.tax_used || 0));
    if (used < free) { src = "free"; await sb.from("wash_shops").update({ tax_used: used + 1 }).eq("shop", shop); }
    else if (paid > 0) { src = "paid"; await sb.from("wash_shops").update({ tax_paid: paid - 1 }).eq("shop", shop); }
    else src = "stop";
  }
  if (src === "stop" || src === "none")
    return { allow: false, from: "stop", sh, why: "이번 주기 계산서 건수를 모두 썼습니다. 충전 후 발행해 주세요" };
  return { allow: true, from: src, sh };
}
async function taxUndo(gate: any) {
  if (!gate || !gate.sh || !gate.allow) return;
  try {
    const { error } = await sb.rpc("wash_tax_undo", { p_shop: gate.sh.shop, p_src: gate.from });
    if (error) throw error;
  } catch (_) { /* 되돌리기 실패는 무시 — 한 건 더 깎인 상태로 둡니다 */ }
}

/* ---------- 딜러가 로그인 없이 보는 «차량 보기» ---------- */
const VIEW_DAYS = 90;                       /* 주소가 살아 있는 기간 */
const VIEW_BASE = () => env("VIEW_BASE", "https://app.cgg.co.kr");

function viewUrl(code: string) { return VIEW_BASE() + "/v.html?c=" + code; }

/* 사진 주소 — sb5 부터 보관함(wash)을 비공개로 바꿀 수 있게, 잠깐만 열리는 «서명 주소»를 만듭니다.
   ids: 'sb/업체/…' 모양만. shop 을 주면 그 업체 폴더 안 사진만. 돌려주는 값: { id: 주소 } (못 만든 것은 빠짐) */
const SHOT_TTL = () => Math.max(60, Math.min(86400, Number(env("SHOT_TTL", "21600")) || 21600));   // 기본 6시간
async function shotLinks(ids: string[], shop?: string, ttl = SHOT_TTL()): Promise<Record<string, string>> {
  const paths: string[] = [], back: Record<string, string> = {};
  for (const raw of ids) {
    const v = String(raw || "");
    if (!v.startsWith("sb/") || v.indexOf("..") >= 0) continue;
    const p = v.slice(3);
    if (shop && shop !== "ADMIN" && !p.startsWith(shop + "/")) continue;   // 남의 업체 사진은 만들지 않음
    if (back[p] === undefined) { back[p] = v; paths.push(p); }
  }
  const out: Record<string, string> = {};
  if (!paths.length) return out;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(paths, ttl);
  if (error) { console.error("shotLinks", error.message); return out; }
  (data || []).forEach((d: any) => { if (d && d.signedUrl && !d.error && back[d.path]) out[back[d.path]] = d.signedUrl; });
  return out;
}


/* 이 기록의 보기 주소 — 살아 있으면 그대로 쓰고, 없으면 새로 냅니다
   kind: "car" 는 차 한 대, "bill" 은 한 달 청구서입니다.
   snap 을 주면(청구서) 주소는 그대로 두고 내용만 새로 담습니다. */
async function viewCodeOf(shop: string, recId: string, kind?: string, snap?: unknown) {
  const kd = kind === "bill" ? "bill" : "car";
  const nowIso = new Date().toISOString();
  const { data: cur } = await sb.from("wash_viewcode")
    .select("code,expires_at").eq("shop", shop).eq("rec_id", recId).eq("kind", kd)
    .gt("expires_at", nowIso).order("created_at", { ascending: false }).limit(1);
  const got: any = cur && cur[0];
  if (got) {
    const code0 = String(got.code);
    if (snap !== undefined) {
      const { error: e2 } = await sb.from("wash_viewcode").update({ data: snap }).eq("code", code0);
      if (e2) throw new Error("청구서를 담지 못했습니다: " + e2.message);
    }
    return { code: code0, url: viewUrl(code0), until: got.expires_at, kind: kd };
  }

  const code = randHex(12).toUpperCase();            /* 24자 — 찍어서 맞힐 수 없습니다 */
  const until = new Date(Date.now() + VIEW_DAYS * 864e5).toISOString();
  const row: any = { code, shop, rec_id: recId, expires_at: until, kind: kd };
  if (snap !== undefined) row.data = snap;
  const { error } = await sb.from("wash_viewcode").insert(row);
  if (error) throw new Error("보기 주소를 만들지 못했습니다: " + error.message);
  return { code, url: viewUrl(code), until, kind: kd };
}

/* 청구서 한 장을 «보기» 에 담을 수 있게 다듬습니다 (앱이 셈한 값을 그대로 담습니다) */
function billSnap(v: any) {
  const num = (x: any) => { const n = Number(x); return isFinite(n) ? Math.round(n) : 0; };
  const txt = (x: any, n: number) => String(x == null ? "" : x).slice(0, n);
  const rows = (Array.isArray(v.rows) ? v.rows : []).slice(0, 300).map((r: any) => ({
    id: billRowId(r && r.id),     /* sb17: 일감 id — viewBill 이 이 업체 일감인지 확인한 뒤에만 남김 */
    plate: txt(r && r.plate, 20), model: txt(r && r.model, 40),
    dealer: txt(r && r.dealer, 40), company: txt(r && r.company, 60),
    inAt: txt(r && r.inAt, 40), outAt: txt(r && r.outAt, 40),
    works: (Array.isArray(r && r.works) ? r.works : []).slice(0, 20)
      .map((w: any) => txt(typeof w === "string" ? w : (w && w.name), 40)).filter(Boolean),
    total: num(r && r.total),
  }));
  return {
    month: txt(v.month, 7), unit: v.unit === "company" ? "company" : "dealer",
    name: txt(v.name, 60), company: txt(v.company, 60).trim(),   // sb21: 앞뒤 빈칸 뗌
    cars: num(v.cars) || rows.length,
    base: num(v.base), supply: num(v.supply), vat: num(v.vat),
    amount: num(v.amount), paid: num(v.paid), due: num(v.due),
    taxOn: !!v.taxOn, workText: txt(v.workText, 300),
    bank: txt(v.bank, 120), madeAt: new Date().toISOString(), rows,
    /* sb12: 입금 기한 (YYYY-MM-DD 일 때만) — 딜러앱 myBills 가 보여 줌 */
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(v.dueDate || "")) ? String(v.dueDate) : "",
  };
}

/* sb21: 상사 이름 맞춤 — 앞뒤 빈칸 떼고 «(상사명 없음)» 은 빈 글자 */
function billCo(x: any) {
  const c = String(x == null ? "" : x).trim();
  return c === "(상사명 없음)" ? "" : c;
}
/* sb17(설계 21): 청구서 줄의 일감 id — 글자·숫자·-_ 만 40자까지 */
function billRowId(x: any) {
  const s = String(x == null ? "" : x).trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : "";
}
/* 그 일감의 달 — 화면(mKey)처럼 한국 시간 기준 · month 칸이 있으면 그것도 맞다고 봄 */
function intakeMonths(d: any) {
  const out: string[] = [];
  if (d && /^\d{4}-\d{2}$/.test(String(d.month || ""))) out.push(String(d.month));
  const t = new Date(String((d && d.createdAt) || "")).getTime();
  if (isFinite(t)) out.push(new Date(t + 9 * 3600e3).toISOString().slice(0, 7));
  return out;
}
/* viewBill 저장 전: 이 업체의 실제 일감이고, 이 청구서의 받는 곳(딜러·상사)·달에 맞는 id 만 남김 (보안 미리 보기 1) */
async function billKeepIds(shop: string, snap: any, coKnown = false) {
  const want = Array.from(new Set((snap.rows as any[]).map((r) => r.id).filter(Boolean))) as string[];
  if (!want.length) return 0;
  const { data, error } = await sb.from("wash_docs").select("id,data")
    .eq("shop", shop).eq("demo", false).eq("col", "intakes").in("id", want);
  const ok: Record<string, 1> = {};
  if (!error) {
    const who = (x: any) => String(x == null ? "" : x).trim();
    const name = who(snap.name), none = snap.unit === "company" ? "(상사명 없음)" : "(딜러 없음)";
    (data || []).forEach((d: any) => {
      const r = d && d.data;
      if (!r) return;
      const to = who(snap.unit === "company" ? r.company : r.dealer);
      if (!(to === name || (!to && name === none))) return;
      if (coKnown && billCo(r.company) !== billCo(snap.company)) return;   // sb21: 같은 이름이라도 다른 상사 딜러 일감은 뺌
      if (intakeMonths(r).indexOf(snap.month) < 0) return;
      ok[String(d.id)] = 1;
    });
  }
  let dropped = 0;
  const seen: Record<string, 1> = {};
  (snap.rows as any[]).forEach((r) => {
    if (!r.id) return;
    if (!ok[r.id] || seen[r.id]) { r.id = ""; dropped++; return; }
    seen[r.id] = 1;
  });
  return dropped;
}
/* 청구서를 열 때 장부로 다시 셈 (보안 미리 보기 2) — 금액은 장부의 일감 합계(total), 입금은 «수금완료» 인 일감만.
   부가세는 청구서를 만들 때와 같은 방식(찍어 둔 amount 가 base 보다 크면 10% 별도). 다 들어오면 paid = 청구 금액.
   id 가 없는 옛 청구서 · 줄 가운데 지워진 일감이 있으면 null(찍어 둔 값 그대로 · 합이 틀어지지 않게) */
async function billLive(shop: string, b: any) {
  const rows: any[] = Array.isArray(b && b.rows) ? b.rows : [];
  const ids = rows.map((r) => billRowId(r && r.id));
  if (!rows.length || ids.some((x) => !x)) return null;
  const { data, error } = await sb.from("wash_docs").select("id,data")
    .eq("shop", shop).eq("demo", false).eq("col", "intakes").in("id", Array.from(new Set(ids)));
  if (error) return null;
  const by: Record<string, any> = {};
  (data || []).forEach((d: any) => { if (d && d.data) by[String(d.id)] = d.data; });
  if (ids.some((x) => !by[x])) return null;
  const amount = Math.round(Number(b.amount) || 0);
  const taxOut = amount > Math.round(Number(b.base) || 0) && Math.round(Number(b.base) || 0) > 0;
  let raw = 0, all = true, last = "";
  const paidRow = ids.map((x) => {
    const r = by[x];
    const p = String(r.status || "") === "수금완료";
    if (p) {
      raw += Math.round(Number(r.total) || 0);
      const at = String(r.paidAt || "");
      if (at > last) last = at;
    } else all = false;
    return p;
  });
  let paid = all ? amount : raw + (taxOut ? Math.round(raw * 0.1) : 0);
  paid = Math.max(0, Math.min(amount, paid));
  const due = Math.max(0, amount - paid);
  /* sb23(보안 낮음 1): 줄 합계(장부 값) — 세금계산서 기준 금액은 화면이 담은 amount 가 아니라 이것으로 */
  const sum = ids.reduce((t, x) => t + Math.round(Number(by[x].total) || 0), 0);
  const sumAmt = sum + (taxOut ? Math.round(sum * 0.1) : 0);
  return { paid, due, full: amount > 0 && due === 0, paidAt: amount > 0 && due === 0 ? last : "", paidRow, sumAmt };
}

/** sb26(설계 30 A안): 청구서 보기의 «밀린 달 목록» — 같은 업체 · 같은 받는 곳(열쇠의 달 뒤가 같은 것)의 다른 덜 받은 달.
 *  기한 안 보기코드만 · 최근 12달 · 남은 금액은 장부로 다시 셈(billLive · 못 셈이면 담아 둔 값). 일감 id·메모·전화 없음 */
async function billUnpaidOthers(shop: string, recId: string, code: string) {
  const m = /^bill:(\d{4}-\d{2})\|(.+)$/.exec(String(recId || ""));
  if (!m) return [];
  const tail = "|" + m[2];
  try {
    /* 보안 낮음(체크 v51 과 같음): 보낸 청구서(to_phones 에 받은 번호가 있는 것)만 — 보내기 전 초안은 안 보임 · 칸이 없으면(SQL 06 전) 목록 없음 */
    const { data, error } = await sb.from("wash_viewcode").select("code,rec_id,expires_at,data,to_phones")
      .eq("shop", shop).eq("kind", "bill").gt("expires_at", new Date().toISOString()).limit(2000);
    if (error) return [];
    const byMonth = new Map<string, any>();
    (data || []).forEach((v: any) => {
      const r = /^bill:(\d{4}-\d{2})(\|.+)$/.exec(String(v.rec_id || ""));
      if (!r || r[2] !== tail || String(v.code) === code || !v.data) return;
      if (!(Array.isArray(v.to_phones) && v.to_phones.length)) return;
      const had = byMonth.get(r[1]);
      if (!had || String(v.expires_at) > String(had.expires_at)) byMonth.set(r[1], v);
    });
    const months = [...byMonth.keys()].sort().slice(-12);
    const out: any[] = [];
    for (const mo of months) {
      const v = byMonth.get(mo), b = v.data;
      const amount = Math.round(Number(b.amount) || 0);
      if (amount <= 0) continue;
      const live = await billLive(shop, b).catch(() => null);
      const due = live ? live.due : Math.max(0, Math.round(Number(b.due) || 0));
      const paid = live ? live.paid : Math.max(0, amount - due);
      if (due > 0) out.push({ month: mo, amount, paid, due, code: String(v.code) });
    }
    return out;
  } catch (_) { return []; }   // 목록을 못 읽어도 그 달 청구서는 그대로
}

/** sb23(대표님 «입금 전 세금계산서 발급 없음»): 업체 → 딜러 계산서는 청구서(보기코드)가 모두 입금 완료이고 금액이 같을 때만.
 *  통과면 "" · 아니면 까닭 글 */
async function taxBillGate(shop: string, json: unknown): Promise<{ why: string; json?: string; claims?: string[]; test?: boolean }> {
  let req: any = {};
  const no = (why: string) => ({ why });
  try { req = typeof json === "string" ? JSON.parse(json) : (json || {}); } catch { return no("요청을 읽지 못했습니다"); }
  const bill = req.bill;
  const code = String((bill && typeof bill === "object" ? bill.code : bill) || "").trim().toUpperCase();
  const got = Math.round(Number(req.doc && req.doc.totalAmount) || 0);
  let want = 0, tag = "", recIds: string[] = [];
  if (/^[A-F0-9]{24}$/.test(code)) {
    /* ① 청구서 보기코드 — 그 청구서를 서버 장부로 다시 셈 */
    const { data: vc } = await sb.from("wash_viewcode").select("shop,kind,data").eq("code", code).maybeSingle();
    if (!vc || String(vc.shop) !== shop || String(vc.kind) !== "bill" || !vc.data) return no("이 업체 청구서가 아닙니다");
    const live = await billLive(shop, vc.data).catch(() => null);
    if (!live) return no("이 청구서는 입금 상태를 셀 수 없습니다. 청구서를 다시 만든 뒤 발행해 주세요");
    if (!live.full) return no("아직 입금 전입니다 (남은 금액 " + Math.round(live.due).toLocaleString("ko-KR") + "원) — 입금이 끝나면 발행할 수 있어요");
    want = Math.round(Number(live.sumAmt) || 0);                   // 보안 낮음 1: 장부 줄 합계 기준
    tag = "청구서 " + code + " ·";
    recIds = (Array.isArray(vc.data.rows) ? vc.data.rows : []).map((r: any) => billRowId(r && r.id)).filter(Boolean);
  } else if (bill && typeof bill === "object" && Array.isArray(bill.recIds) && bill.recIds.length) {
    /* ② 워시 v135 세금계산서 묶음(발행처 × 딜러) — 입고 기록 id 를 서버 장부로 다시 읽음.
          화면의 amount·paid·left 는 쓰지 않음 · 계산서 합계 = 청구서와 같은 셈(billAmt): 단가표 설정 vatMode «in» 이면 Σtotal, 아니면(기본 별도) Σ + round(Σ×0.1) */
    const ids = Array.from(new Set(bill.recIds.map((x: unknown) => billRowId(x)))) as string[];
    if (ids.length > 300 || ids.some((x) => !x)) return no("세금계산서에 넣은 차 목록이 올바르지 않습니다");
    const { data, error } = await sb.from("wash_docs").select("id,data")
      .eq("shop", shop).eq("demo", false).eq("col", "intakes").in("id", ids);
    if (error) return no("장부를 읽지 못했습니다. 잠시 뒤 다시 해 주세요");
    const by: Record<string, any> = {};
    (data || []).forEach((d: any) => { if (d && d.data) by[String(d.id)] = d.data; });
    if (ids.some((x) => !by[x])) return no("이 업체 장부에 없는 차가 들어 있습니다");
    let sum = 0, left = 0;
    ids.forEach((x) => { const t = Math.round(Number(by[x].total) || 0); sum += t; if (String(by[x].status || "") !== "수금완료") left += t; });
    if (left > 0) return no("아직 입금 전입니다 (남은 금액 " + left.toLocaleString("ko-KR") + "원) — 입금이 끝나면 발행할 수 있어요");
    let vin = false;
    try {
      const { data: cf } = await sb.from("wash_docs").select("data").eq("shop", shop).eq("col", "settings").eq("id", "config").maybeSingle();
      vin = !!(cf && cf.data && cf.data.vatMode === "in");
    } catch (_) { /* 못 읽으면 기본(별도) */ }
    want = vin ? sum : sum + Math.round(sum * 0.1); recIds = ids;
    tag = "묶음 " + String(bill.month || "").replace(/[^0-9-]/g, "").slice(0, 7) + " " + ids.length + "대 ·";
  } else {
    return no("어느 청구서의 계산서인지 알 수 없습니다. 청구서에서 «세금계산서»를 눌러 주세요");
  }
  if (!want || got !== want) return no("계산서 합계(" + got.toLocaleString("ko-KR") + "원)가 장부 금액(" + want.toLocaleString("ko-KR") + "원)과 다릅니다");
  /* 보안 낮음: 받는 사업자번호가 그 차들의 딜러(본인 사업자) 또는 소속 상사 번호인지 — 숫자만 비교 */
  const corpWhy = await taxCorpCheck(shop, recIds, digits(String((req.doc && req.doc.invoiceeCorpNum) || "")));
  if (corpWhy) return no(corpWhy);
  /* 보안 낮음 2: 한 청구서로 한 번만(옛 기록 대조) — 차 단위로는 아래 wash_tax_rec 잡기가 막음 */
  if (code) {
    const { data: done } = await sb.from("wash_taxlog").select("no").eq("shop", shop).eq("ok", true).ilike("memo", "%" + tag + "%").limit(1);
    if (done && done.length) return no("이 청구서로 이미 세금계산서를 발행했습니다");
  }
  const d = Object.assign({}, req.doc || {});
  d.remark1 = (tag + " " + String(d.remark1 || "")).slice(0, 300);
  const out = Object.assign({}, req, { doc: d }); delete out.bill;
  return { why: "", json: JSON.stringify(out), claims: recIds, test: !!req.test };
}
/** sb24(보안 낮음 · 관리 방): 카드 환불하면 wash_payments 에 «refunded» 줄만 새로 생기고 원래 결제 줄은 «paid» 로 남음.
 *  결제 줄의 order_id 로 wash_pay_order 를 보고 status «canceled» 이거나 raw.cancel 이 있으면 환불된 것(부분 환불 포함).
 *  order_id 칸이 없거나 비면(수동 결제) 환불 기록 줄의 메모 «카드 환불 {주문}» 으로도 한 번 더 봄 */
async function refundedSet(payIds: string[], strict = false): Promise<Set<string>> {
  const out = new Set<string>();
  const ids = payIds.filter(Boolean);
  if (!ids.length) return out;
  const { data: ps, error } = await sb.from("wash_payments").select("id,order_id,shop").in("id", ids);
  if (error) {
    /* order_id 칸이 없는 옛 표면 카드 주문과 이을 수 없어 «환불 없음»으로 봄 · 그 밖의 읽기 오류는 strict(발행)일 때 멈춤(보안 참고) */
    const noCol = String((error as any).code || "") === "42703" || /order_id/.test(String((error as any).message || ""));
    if (strict && !noCol) throw new Error("결제 기록을 확인하지 못했습니다. 잠시 뒤 다시 해 주세요");
    return out;
  }
  const byOrder = new Map<string, string[]>();
  const shopOf = new Map<string, string>();   // sb26: 주문 → 업체 (환불 메모를 그 업체 것만 찾게)
  (ps || []).forEach((p: any) => { const o = String(p.order_id || ""); if (o) { byOrder.set(o, (byOrder.get(o) || []).concat(String(p.id))); shopOf.set(o, String(p.shop || "")); } });
  const orders = [...byOrder.keys()];
  for (let k = 0; k < orders.length; k += 500) {
    const { data: od, error: oe } = await sb.from("wash_pay_order").select("order_id,status,raw").in("order_id", orders.slice(k, k + 500));
    if (oe && strict) throw new Error("결제 기록을 확인하지 못했습니다. 잠시 뒤 다시 해 주세요");
    (od || []).forEach((o: any) => {
      if (String(o.status || "") === "canceled" || (o.raw && typeof o.raw === "object" && o.raw.cancel))
        (byOrder.get(String(o.order_id)) || []).forEach((id) => out.add(id));
    });
  }
  /* sb25(관리 방 참고): 목록과 발급이 같은 판단 — 환불 기록 줄 메모 «카드 환불 {주문} ·» 도 여기서 함께 봄 */
  const rest = orders.filter((o) => !(byOrder.get(o) || []).every((id) => out.has(id)));
  if (rest.length) {
    /* sb26(보안 낮음): 전체 5000줄 한도 대신 그 주문들의 업체 것만 (업체 100곳씩) — 오래된 환불 메모가 밀려나지 않게 */
    const shops = [...new Set(rest.map((o) => shopOf.get(o) || "").filter(Boolean))];
    const hit = new Set<string>();
    for (let k = 0; k < shops.length; k += 100) {
      const { data: rf, error: re } = await sb.from("wash_payments").select("memo").eq("status", "refunded")
        .in("shop", shops.slice(k, k + 100)).ilike("memo", "카드 환불 %").limit(5000);
      if (re && strict) throw new Error("결제 기록을 확인하지 못했습니다. 잠시 뒤 다시 해 주세요");
      (rf || []).forEach((r: any) => { const m = /^카드 환불 (\S+) ·/.exec(String(r.memo || "")); if (m) hit.add(m[1]); });
    }
    rest.forEach((o) => { if (hit.has(o)) (byOrder.get(o) || []).forEach((id) => out.add(id)); });
  }
  return out;
}
/** 발행 전 확인 — 목록과 같은 함수 · 읽기 오류면 던짐(fail-closed · 보안 참고) */
async function payRefunded(payId: string): Promise<boolean> {
  return (await refundedSet([payId], true)).has(payId);
}
/** sb23: 받는 사업자번호 대조 — 차들의 딜러(dealers · type «biz» 면 그 bizNo)와 상사(companies · 차·딜러의 company 이름)의 번호만 허락 */
async function taxCorpCheck(shop: string, ids: string[], corp: string): Promise<string> {
  if (corp.length !== 10) return "받는 곳 사업자등록번호(10자리)가 올바르지 않습니다";
  const { data: recs } = await sb.from("wash_docs").select("id,data").eq("shop", shop).eq("demo", false).eq("col", "intakes").in("id", ids);
  const dealers = new Set<string>(), comps = new Set<string>();
  (recs || []).forEach((r: any) => { const d = r && r.data || {}; if (d.dealer) dealers.add(String(d.dealer)); if (d.company) comps.add(String(d.company)); });
  const { data: book } = await sb.from("wash_docs").select("col,data").eq("shop", shop).eq("demo", false).in("col", ["dealers", "companies"]).limit(5000);
  const ok = new Set<string>();
  (book || []).filter((b: any) => b.col === "dealers" && b.data && dealers.has(String(b.data.name || ""))).forEach((b: any) => {
    if (String(b.data.type || "") === "biz" && digits(String(b.data.bizNo || "")).length === 10) ok.add(digits(String(b.data.bizNo)));
    if (b.data.company) comps.add(String(b.data.company));
  });
  (book || []).filter((b: any) => b.col === "companies" && b.data && comps.has(String(b.data.name || ""))).forEach((b: any) => {
    if (digits(String(b.data.bizNo || "")).length === 10) ok.add(digits(String(b.data.bizNo)));
  });
  if (!ok.size) return "이 차들의 거래처(딜러·상사)에 사업자등록번호가 없습니다. 거래처에 먼저 넣어 주세요";
  if (!ok.has(corp)) return "받는 곳 사업자등록번호가 이 차들의 딜러·상사 번호와 다릅니다";
  return "";
}
/** sb23(SQL 21): 차(입고 기록)마다 «세금계산서 냄» 을 먼저 잡음 — 같은 차 두 번 · 동시에 두 번 누름을 막음.
 *  잡히면 null · 이미 잡혔으면 까닭 · 표가 없으면(SQL 21 전) 발행하지 않음 */
async function taxClaim(shop: string, ids: string[], who: string): Promise<string | null> {
  if (!ids.length) return "세금계산서에 넣은 차가 없습니다";
  const at = new Date().toISOString();
  const { error } = await sb.from("wash_tax_rec").insert(ids.map((rec_id) => ({ shop, rec_id, who: who.slice(0, 40), at })));
  if (!error) return null;
  if (/wash_tax_rec|does not exist|relation/i.test(String(error.message || ""))) return "서버를 준비하는 중입니다(SQL 21). 차곳간(010-9559-3663)으로 알려 주세요.";
  return "이미 세금계산서를 낸 차가 들어 있습니다 (같은 차는 한 번만 발행돼요)";
}
async function taxRelease(shop: string, ids: string[]) {
  if (!ids.length) return;
  try { await sb.from("wash_tax_rec").delete().eq("shop", shop).in("rec_id", ids); } catch (_) { /* */ }
}

/* sb18: 국세청 사업자등록정보 진위확인 및 상태조회(공공데이터포털) — 체크 v37 ntsVerify 와 같음 · 열쇠 NTS_API_KEY(Secrets) */
/** 답 모양 — 체크 v47 약속(state · since · match:{ceo, start}) + 총괄 모양(closedAt · ok) 을 함께.
    국세청 진위확인은 대표자·개업일을 한 번에 맞춰 보므로 둘이 같은 값이에요(안 물었으면 null) */
function vres(ready: boolean, state: string, closed: string, ok: boolean | null, why: string) {
  return { ready, state, since: closed, closedAt: closed, match: { ceo: ok, start: ok }, ok, why };
}
/** sb20: 연결 실패 갈래(짧은 코드만 · 오류 원문·주소·열쇠는 남기지 않음) */
function ntsNetKind(e: unknown): string {
  const name = e instanceof Error ? e.name : "", m = e instanceof Error ? e.message : String(e);
  if (name === "TimeoutError" || name === "AbortError") return "timeout";
  if (/header|bytestring/i.test(m)) return "hdr";
  if (/dns|lookup|resolve|not known|ENOTFOUND|EAI_/i.test(m)) return "dns";
  if (/tls|ssl|certificate|handshake|UnknownIssuer/i.test(m)) return "tls";
  if (/refused|reset|ECONN|unreachable|closed/i.test(m)) return "conn";
  return "net";
}
async function ntsVerify(bizNo: string, ceo: string, openDate: string) {
  const key = env("NTS_API_KEY").trim().replace(/^["']|["']$/g, "").trim();   // sb20: 붙여 넣을 때 딸려 온 줄바꿈·따옴표 뗌(머리글이 깨져 «연결 실패»로 보이던 것)
  const b = digits(bizNo);
  if (!key) return vres(false, "", "", null, "사업자번호 확인은 아직 준비 중이에요.");   // 열쇠 먼저(약속: 열쇠 없으면 ready:false)
  if (b.length !== 10) return vres(true, "없음", "", null, "사업자번호는 숫자 10자리예요.");
  const base = "https://api.odcloud.kr/api/nts-businessman/v1/";
  const q = "?returnType=JSON";   // 보안(중간): 열쇠는 주소에 넣지 않고 머리글로 (오류 글·기록에 주소가 남아도 열쇠는 안 남게)
  /* v39·sb19: 열쇠를 머리글(Infuser)로 먼저, «열쇠 오류»면 주소 방식(serviceKey)으로 한 번 더.
     Decoding 키든 Encoding 키든(이미 %가 들어 있으면 다시 인코딩하지 않음) 받게. 오류 글은 정해진 글만(열쇠·주소 안 남김) */
  const keyQ = /%[0-9A-Fa-f]{2}/.test(key) ? key : encodeURIComponent(key);
  let keyH = key;
  if (/%[0-9A-Fa-f]{2}/.test(key)) { try { keyH = decodeURIComponent(key); } catch (_) { keyH = key; } }   // v40(보안 참고): 잘못된 %면 그대로
  let mode: "h" | "q" = "h";
  const once = async (path: string, body: unknown, how: "h" | "q") => {
    let r: Response;
    try {
      r = await fetch(base + path + q + (how === "q" ? "&serviceKey=" + keyQ : ""), { method: "POST", body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        headers: Object.assign({ "content-type": "application/json", accept: "application/json" } as Record<string, string>, how === "h" ? { Authorization: "Infuser " + keyH } : {}) });
    } catch (e) { throw new Error("nts:" + ntsNetKind(e)); }           // 연결 오류 글(주소 포함)은 버리고 짧은 갈래만
    const txt = await r.text().catch(() => "");
    let j: any = {};
    try { j = JSON.parse(txt); } catch (_) { j = {}; }
    if (!r.ok || !Array.isArray(j?.data)) {
      const code = (r.status === 401 || r.status === 403 || /SERVICE_KEY|NOT_REGISTERED|인증|등록되지/i.test(txt.slice(0, 500))) ? "key" : String(r.status);
      throw new Error("nts:" + code);
    }
    return j.data[0] || {};
  };
  const post = async (path: string, body: unknown) => {
    try { return await once(path, body, mode); }
    catch (e) {
      /* sb20: 머리글이 깨졌거나(hdr) 갈래를 모르는 연결 실패도 주소 방식으로 한 번 더 — 시간 넘김·dns 는 다시 해도 같아서 안 함 */
      if (mode === "h" && e instanceof Error && /^nts:(key|hdr|net|conn)$/.test(e.message)) { mode = "q"; return await once(path, body, "q"); }
      throw e;
    }
  };
  try {
    const st = await post("status", { b_no: [b] });
    const cd = String(st.b_stt_cd || "");
    const state = cd === "01" ? "계속" : cd === "02" ? "휴업" : cd === "03" ? "폐업" : "없음";
    const end = digits(st.end_dt);
    let match: boolean | null = null;
    const od = digits(openDate), nm = String(ceo || "").trim();
    if (state !== "없음" && od.length === 8 && nm) {
      const va = await post("validate", { businesses: [{ b_no: b, start_dt: od, p_nm: nm.slice(0, 40) }] });
      match = String(va.valid || "") === "01";
    }
    return vres(true, state, end.length === 8 ? end.slice(0, 4) + "-" + end.slice(4, 6) + "-" + end.slice(6) : "", match, "");
  } catch (e) {
    /* 기록·답에는 정해진 글만 (열쇠·주소·원문 오류는 남기지 않음) */
    const m = e instanceof Error ? e.message : "";
    const code = /^nts:(net|key|hdr|dns|tls|conn|timeout|\d{3})$/.test(m) ? m.slice(4) : "etc";
    console.error("bizVerify 실패", code);
    const why = code === "key" || code === "401" || code === "403"
      ? "국세청 열쇠가 아직 등록 중이거나 맞지 않아요(새 열쇠는 등록까지 1~2시간, 길면 하루 걸려요 · " + code + ")."
      : code === "hdr" ? "국세청 열쇠 글자에 이상한 글자가 섞여 있어요. 열쇠를 다시 붙여 넣어 주세요(hdr)."
      : code === "timeout" ? "국세청 답이 늦어요. 잠시 뒤 다시 해 주세요(timeout)."
      : /^(net|dns|tls|conn)$/.test(code) ? "국세청에 연결하지 못했어요. 잠시 뒤 다시 해 주세요(" + code + ")."
      : code === "429" ? "국세청 확인이 잠시 몰려 있어요. 잠시 뒤 다시 해 주세요."
      : "지금은 국세청 확인이 안 돼요(" + code + "). 잠시 뒤 다시 해 주세요.";
    return vres(false, "", "", null, why);
  }
}

/* ---------- 팝빌 (세금계산서) ---------- */
async function pbToken(corpNum: string, test: boolean) {
  const linkId = env("POPBILL_LINKID"), secret = env("POPBILL_SECRET");
  if (!linkId || !secret) throw new Error("세금계산서 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  corpNum = digits(corpNum);
  if (corpNum.length !== 10) throw new Error("우리 사업자등록번호(10자리)를 세금계산서 화면에 먼저 넣어 주세요");
  const uri = "/" + (test ? "POPBILL_TEST" : "POPBILL") + "/Token";
  const body = JSON.stringify({ access_id: corpNum, scope: ["member", "110"] });
  const key = decodeBase64(secret.replace(/-/g, "+").replace(/_/g, "/"));
  const te = new TextEncoder();
  let lastErr = "";
  for (const [ver, algo] of [["2.0", "SHA-256"], ["1.0", "MD5"]] as const) {
    const xDate = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const hash = encodeBase64(await stdCrypto.subtle.digest(algo, te.encode(body)));
    const target = `POST\n${hash}\n${xDate}\n*\n${ver}\n${uri}`;
    const sig = encodeBase64(await hmac(key, te.encode(target)));
    const res = await fetch("https://auth.linkhub.co.kr" + uri, {
      method: "POST", body,
      headers: { "content-type": "application/json", "x-lh-date": xDate, "x-lh-version": ver,
        "x-lh-forwarded": "*", Authorization: `LINKHUB ${linkId} ${sig}` },
    });
    const txt = await res.text();
    let j: any = {}; try { j = JSON.parse(txt); } catch (_) { /* */ }
    if (res.status < 300 && j.session_token) return j.session_token as string;
    lastErr = "팝빌 인증 실패 " + res.status + ": " + (j.message || txt.slice(0, 200));
  }
  throw new Error(lastErr);
}
async function pbCheck(corpNum: string, test: boolean) {
  const token = await pbToken(corpNum, test);
  let point: unknown = "";
  try {
    const r = await fetch("https://auth.linkhub.co.kr/" + (test ? "POPBILL_TEST" : "POPBILL") + "/Point",
      { headers: { Authorization: "Bearer " + token } });
    const j: any = await r.json(); if (j.remainPoint !== undefined) point = j.remainPoint;
  } catch (_) { /* */ }
  return { ok: true, test: !!test, point };
}
/* 이 업체로 등록된 사업자등록번호 (숫자만) */
async function bizNoOf(shop: string) {
  /* 본사(ADMIN)는 업체표가 아니라 본사표에 사업자번호가 있습니다 */
  if (shop === "ADMIN") {
    const { data } = await sb.from("wash_hq").select("biz_no").eq("id", 1).maybeSingle();
    return digits(String((data && data.biz_no) || ""));
  }
  const { data } = await sb.from("wash_shops").select("biz_no").eq("shop", shop).maybeSingle();
  return digits(String((data && data.biz_no) || ""));
}
/* sb15(보안 W-H1): 이 번호를 «다른 곳»이 쓰고 있으면 이유를 돌려줍니다 (없으면 "").
   다른 워시 업체 · 체크 검사소(사업자번호·팝빌 번호) · 차곳간 본사 — 모두 같은 팝빌 연동 아래라 남의 이름 발행을 막습니다.
   확인을 못 하면(표 읽기 실패) 막는 쪽으로 봅니다. */
async function bizTaken(corp: string, selfShop: string): Promise<string> {
  const n = digits(corp);
  if (!n) return "";
  try {
    const { data: hq, error: e1 } = await sb.from("wash_hq").select("biz_no").eq("id", 1).maybeSingle();
    if (e1) return "check";
    if (digits(String((hq && hq.biz_no) || "")) === n) return "hq";
    const { data: ws, error: e2 } = await sb.from("wash_shops").select("shop,biz_no").neq("shop", selfShop).ilike("biz_no", "%" + n.slice(-5) + "%").limit(200);
    if (e2) return "check";
    if ((ws || []).some((r: any) => digits(r.biz_no) === n)) return "wash";
    const { data: co, error: e3 } = await sb.from("check_office").select("biz_no,popbill_corp").limit(1000);
    if (e3) return "check";
    if ((co || []).some((r: any) => digits(r.biz_no) === n || digits(r.popbill_corp) === n)) return "check";
  } catch (_) { return "check"; }
  return "";
}
/* sb15(보안 W-H1 남은 위험): 처음 넣은 사업자번호는 본사가 확인(biz_ok_at)한 뒤에만 실제 발행·인증서·팝빌 가입.
   지금 있는 업체는 SQL 11 이 «확인됨»으로 시작. 칸이 없으면(SQL 11 전) 그대로 둠. */
const BIZ_WAIT_MSG = "사업자번호를 차곳간에서 확인하는 중입니다. 확인이 끝나면 쓸 수 있습니다. 급하시면 차곳간(010-9559-3663)으로 알려 주세요.";
async function bizApproved(shop: string): Promise<boolean> {
  if (shop === "ADMIN") return true;
  try {
    const { data, error } = await sb.from("wash_shops").select("biz_ok_at").eq("shop", shop).maybeSingle();
    if (error) return String((error as any).code || "") === "42703";   // 칸이 없을 때(SQL 11 전)만 허락 · 다른 읽기 오류는 막음
    if (!data || !("biz_ok_at" in data)) return true;
    return data.biz_ok_at !== null;
  } catch (_) { return false; }
}
const BIZ_TAKEN_MSG = "이 사업자번호는 다른 곳에서 쓰고 있어 쓸 수 없습니다. 우리 사업자번호가 맞다면 차곳간(010-9559-3663)으로 알려 주세요.";
async function pbIssue(shop: string, json: string) {
  let req: any = {};
  try { req = JSON.parse(json); } catch { return { ok: false, error: "요청을 읽지 못했습니다" }; }
  const d = req.doc || {};
  /* 공급자 사업자번호는 «이 업체로 등록된 번호»만 씁니다 (남의 번호로 발행 차단) */
  /* 같은 계산서를 두 번 보내는 것을 막는 열쇠: 받는 사업자번호 + 합계 금액 + 비고
     한 상사에 딜러별로 여러 장을 끊으므로, 비고(담당딜러)가 다르면 다른 계산서로 봅니다. */
  const toCorp = digits(String(d.invoiceeCorpNum || ""));
  const totalS = String(d.totalAmount ?? "");
  const memo = (String(d.remark1 || "") ||
    (Array.isArray(d.detailList)
      ? d.detailList.map((x: any) => String((x && x.remark) || "")).filter(Boolean).join(" | ")
      : "")).slice(0, 300);
  const log = (ok: boolean, nts: string, err: string) =>
    sb.from("wash_taxlog").insert({ shop, mode: req.test ? "시험" : "실제", mgt_key: d.invoicerMgtKey || "",
      to_name: d.invoiceeCorpName || "", to_corp: toCorp, total: totalS, memo,
      ok, nts_no: nts, error: err }).then(() => {}, () => {});
  const mine = await bizNoOf(shop);
  if (!mine) {
    const why = shop === "ADMIN"
      ? "차곳간 사업자등록번호가 저장되어 있지 않습니다. 관리 → 세금계산서 → 차곳간 정보에서 «저장» 을 먼저 눌러 주세요"
      : "사업자등록번호가 등록되어 있지 않습니다. 관리에서 먼저 넣어 주세요";
    await log(false, "", why);
    return { ok: false, error: why };
  }
  /* sb15(보안 W-H1): 다른 곳이 쓰는 번호면 발행하지 않음 (본사 ADMIN 은 본사 번호) */
  if (shop !== "ADMIN" && await bizTaken(mine, shop)) {
    await log(false, "", "사업자번호 확인 필요");
    return { ok: false, error: BIZ_TAKEN_MSG };
  }
  if (!req.test && !(await bizApproved(shop))) {
    await log(false, "", "사업자번호 본사 확인 전");
    return { ok: false, error: BIZ_WAIT_MSG };
  }
  req.corpNum = mine;
  d.invoicerCorpNum = mine;
  /* 이미 똑같은 계산서를 보낸 적이 있으면 여기서 멈춥니다 (force 가 켜져 있으면 그냥 보냅니다) */
  if (!req.force) {
    const { data: prev } = await sb.from("wash_taxlog")
      .select("no,mgt_key,nts_no,at,memo,to_name,mode")
      .eq("shop", shop).eq("to_corp", toCorp).eq("total", totalS).eq("memo", memo).eq("ok", true)
      .order("no", { ascending: false }).limit(1);
    const p: any = prev && prev[0];
    if (p) return { ok: false, dup: true,
      prev: { nts: p.nts_no || "", at: p.at || "", mgtKey: p.mgt_key || "",
              memo: p.memo || "", toName: p.to_name || "", mode: p.mode || "" },
      toName: d.invoiceeCorpName || "", toCorp, total: totalS, memo,
      error: "이미 같은 곳에 같은 금액 · 같은 비고로 보낸 계산서가 있습니다" +
             (p.nts_no ? (" (승인번호 " + p.nts_no + ")") : "") };
  }
  try {
    const token = await pbToken(req.corpNum, !!req.test);
    const host = req.test ? "https://popbill-test.linkhub.co.kr" : "https://popbill.linkhub.co.kr";
    const headers: Record<string, string> = { Authorization: "Bearer " + token, "x-pb-version": "1.0",
      "content-type": "application/json", "X-HTTP-Method-Override": "ISSUE" };
    if (req.userId) headers["x-pb-userid"] = req.userId;
    const res = await fetch(host + "/Taxinvoice", { method: "POST", headers, body: JSON.stringify(d) });
    const txt = await res.text();
    let j: any = {}; try { j = JSON.parse(txt); } catch { j = { message: txt.slice(0, 200) }; }
    if (res.status >= 300 || (typeof j.code === "number" && j.code < 0))
      throw new Error("세금계산서: " + (j.message || "처리하지 못했습니다"));
    await log(true, j.ntsConfirmNum || "", "");
    return { ok: true, ntsConfirmNum: j.ntsConfirmNum || "", message: j.message || "" };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    await log(false, "", m);
    return { ok: false, error: m };
  }
}

/* ══════════════════════════════════════════════════════
   팝빌 — 업체를 «연동회원» 으로 넣기 · 인증서 보기
   계산서는 그 업체 이름으로 나가므로, 팝빌에도 업체마다
   한 번씩 등록되어 있어야 합니다. 업체는 팝빌에 가입하지 않습니다.
   ══════════════════════════════════════════════════════ */
function pbHost(test: boolean) {
  return test ? "https://popbill-test.linkhub.co.kr" : "https://popbill.linkhub.co.kr";
}
/* 토큰을 달고 부르는 일반 호출 */
async function pbCall(corpNum: string, test: boolean, uri: string,
                      method = "GET", body?: unknown, override?: string) {
  const token = await pbToken(corpNum, test);
  const headers: Record<string, string> = {
    Authorization: "Bearer " + token, "x-pb-version": "1.0",
    "content-type": "application/json;charset=utf-8",
  };
  if (override) headers["X-HTTP-Method-Override"] = override;
  const res = await fetch(pbHost(test) + uri,
    { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const txt = await res.text();
  let j: any = {}; try { j = JSON.parse(txt); } catch { j = { message: txt.slice(0, 200) }; }
  if (res.status >= 300 || (typeof j.code === "number" && j.code < 0))
    throw new Error("세금계산서: " + (j.message || "처리하지 못했습니다"));
  return j;
}
/* 토큰 없이 부르는 호출 (회원 가입·가입 확인) */
async function pbOpen(test: boolean, uri: string, method = "GET", body?: unknown) {
  const res = await fetch(pbHost(test) + uri, {
    method,
    headers: { "content-type": "application/json;charset=utf-8" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await res.text();
  let j: any = {}; try { j = JSON.parse(txt); } catch { j = { message: txt.slice(0, 200) }; }
  return { status: res.status, body: j };
}
/* 이 업체가 팝빌에 들어가 있는지 */
async function pbIsMember(corpNum: string, test: boolean) {
  const lid = env("POPBILL_LINKID");
  if (!lid) throw new Error("세금계산서 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const r = await pbOpen(test, "/Join?CorpNum=" + encodeURIComponent(digits(corpNum)) +
                               "&LID=" + encodeURIComponent(lid));
  /* code 1 = 가입됨, -100003 계열 = 아직 없음 */
  const code = Number(r.body && r.body.code);
  if (code === 1) return { joined: true, mine: true, message: String(r.body.message || "") };
  if (code === -100003 || code === -100004)
    return { joined: false, mine: false, message: String(r.body.message || "") };
  /* 다른 파트너에 이미 물려 있는 경우 등 */
  return { joined: code > 0, mine: false, code, message: String((r.body && r.body.message) || "") };
}
/* 업체를 팝빌에 넣기 */
async function pbJoinShop(shop: string, test: boolean) {
  const lid = env("POPBILL_LINKID");
  if (!lid) throw new Error("세금계산서 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const { data: sh } = await sb.from("wash_shops")
    .select("shop,name,biz_no,ceo,addr,upte,jongmok,owner_phone,tax_email,pb_id")
    .eq("shop", shop).maybeSingle();
  if (!sh) throw new Error("업체 정보를 찾지 못했습니다");
  const corp = digits(String(sh.biz_no || ""));
  if (corp.length !== 10)
    throw new Error("사업자등록번호(10자리)를 먼저 넣어 주세요");
  const already = await pbIsMember(corp, test);
  if (already.joined) return { ok: true, already: true, id: sh.pb_id || "", message: already.message };

  const pbId = String(sh.pb_id || ("cgg" + corp)).slice(0, 20);
  const pw = randHex(6) + "Aa!";                      /* 업체는 이 비밀번호를 쓸 일이 없습니다 */
  const form = {
    LinkID: lid,
    CorpNum: corp,
    CEOName: String(sh.ceo || sh.name || "").slice(0, 30),
    CorpName: String(sh.name || "").slice(0, 60),
    Addr: String(sh.addr || "").slice(0, 200),
    ZipCode: "",
    BizType: String(sh.upte || "서비스").slice(0, 40),
    BizClass: String(sh.jongmok || "자동차").slice(0, 40),
    ContactName: String(sh.ceo || sh.name || "").slice(0, 30),
    ContactEmail: String(sh.tax_email || "").slice(0, 60),
    ContactTEL: digits(String(sh.owner_phone || "")),
    ID: pbId,
    PWD: pw,
  };
  const r = await pbOpen(test, "/Join", "POST", form);
  const code = Number(r.body && r.body.code);
  if (code === -10010030)
    throw new Error("팝빌에서 «연동회원 신규가입» 기능이 아직 열려 있지 않습니다. " +
      "팝빌 개발자센터 고객센터에 «연동회원 신규가입 API 권한을 열어 달라» 고 요청해 주세요. " +
      "열릴 때까지는 업체가 팝빌에 직접 가입한 뒤 우리 LinkID 로 연결하셔도 됩니다.");
  if (r.status >= 300 || (typeof code === "number" && code < 0))
    throw new Error("세금계산서: " + String((r.body && r.body.message) || "처리하지 못했습니다"));
  await sb.from("wash_shops").update({ pb_id: pbId, pb_joined_at: new Date().toISOString() }).eq("shop", shop);
  return { ok: true, already: false, id: pbId, message: String((r.body && r.body.message) || "") };
}
/* 인증서 정보 (있는지 · 언제까지) */
async function pbCertOf(corpNum: string, test: boolean) {
  try {
    const j: any = await pbCall(corpNum, test, "/Taxinvoice/Certificate");
    const until = String(j.certificateExpiration || j.expireDate || "");
    return { ok: true, has: !!until, until: until.slice(0, 10).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
             subject: String(j.subjectDN || j.issuerDN || "") };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/등록.*없|없습니다|-99000[45]|-1000[0-9]{2}/.test(m)) return { ok: true, has: false, until: "", why: m };
    throw e;
  }
}
/* 인증서 올리는 팝업 주소 */
async function pbCertUrlOf(corpNum: string, test: boolean) {
  const j: any = await pbCall(corpNum, test, "/Member?TG=CERT");
  return { ok: true, url: String(j.url || "") };
}

/* ---------- 기능 목록 ---------- */
type Fn = (shop: string, a: any[], ss?: any) => Promise<unknown> | unknown;
const FN: Record<string, Fn> = {
  apiVer: () => ({ ver: VER, at: new Date().toISOString() }),
  ping: () => ({
    ok: true, name: "차곳간 워시 서버 (클라우드)",
    hasKey: !!env("SOLAPI_KEY") && !!env("SOLAPI_SECRET"), hasAi: !!env("ANTHROPIC_KEY"),
    hasPopbill: !!env("POPBILL_LINKID") && !!env("POPBILL_SECRET"),
    sheet: true, demoSheet: true, folder: true, time: new Date().toISOString(),
  }),
  apiStamp: async (s, a) => ({ rev: await revGet(s, !!a[0]) }),
  apiLoad: (s, a, ss) => apiLoad(s, !!a[0], ss),
  apiSet: async (s, a, ss) => {
    guardCols(ss, [String(a[0] || "")]);
    const one = [{ col: a[0], id: a[1], data: a[2] }];
    await guardIntakes(s, ss, !!a[3], one);                  // (날짜 없는 새 줄은 여기서 날짜가 채워짐)
    await guardPartners(s, ss, !!a[3], one);                 // sb18(보안 낮음)
    return { ok: true, rev: await write(s, !!a[3], one) };
  },
  apiSetMany: async (s, a, ss) => {
    const rows = typeof a[0] === "string" ? JSON.parse(a[0]) : a[0];
    if (!rows || !rows.length) return { ok: true, rev: await revGet(s, !!a[1]) };
    guardCols(ss, rows.map((r: any) => String((r && r.col) || "")));
    await guardIntakes(s, ss, !!a[1], rows);
    await guardPartners(s, ss, !!a[1], rows);
    return { ok: true, rev: await write(s, !!a[1], rows) };
  },
  apiDel: async (s, a, ss) => {
    guardCols(ss, [String(a[0] || "")]);
    await guardIntakes(s, ss, !!a[2], [{ col: a[0], id: a[1], data: null }]);
    await guardPartners(s, ss, !!a[2], [{ col: a[0], id: a[1], data: null }]);
    return { ok: true, rev: await write(s, !!a[2], [{ col: a[0], id: a[1], data: null }]) };
  },
  apiWipeDemo: async (s, _a, ss) => {
    ownerOnly(ss);
    await sb.from("wash_docs").delete().eq("shop", s).eq("demo", true);
    await write(s, true, []);
    return "ok";
  },
  driveUpload: (s, a) => upload(s, a[0], a[1]),
  driveUploadMany: async (s, a) => {
    const list = typeof a[0] === "string" ? JSON.parse(a[0]) : a[0];
    return await Promise.all((list || []).map((it: any) => upload(s, it.b64, it.mime).catch(() => "")));
  },
  driveText: async (s, a) => new TextDecoder().decode(await fileBytes(String(a[0]), s)),
  driveB64: async (s, a) => encodeBase64(await fileBytes(String(a[0]), s)),
  aiReady: () => !!env("ANTHROPIC_KEY"),
  aiJson: (s, a) => aiJson(s, a[0], a[1]),
  /* sb4: 사진 서명 주소 묶음 — [사진id 목록] → { id: 주소 } (우리 업체 사진만 · 한 번에 300장까지) */
  shotLinks: async (s, a) => {
    const ids = (Array.isArray(a[0]) ? a[0] : []).slice(0, 300).map((x: any) => String(x || ""));
    return { links: await shotLinks(ids, s), ttl: SHOT_TTL() };
  },
  sendMsg: async (s, a, ss) => {
    /* sb2: 직원은 하루 보낼 수 있는 문자 수에 제한이 있습니다 (대표·매니저는 업체 한도만) */
    const role = String((ss && ss.role) || "");
    if (ss && role !== "owner" && role !== "admin" && role !== "manager") {
      if (!await rateOk("staffmsg:" + String(ss.phone || "") + ":" + new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10),
                        Number(env("STAFF_MSG_MAX", "300"))))   // 대표님 결정 2026-10-15: 하루 300통
        return { ok: false, error: "오늘 직원 계정으로 보낼 수 있는 문자를 다 썼습니다. 대표님께 말씀해 주세요", stopped: true };
    }
    return sendMsg(s, a[0]);
  },
  cancelSchedule: async (s, a, ss) => {
    managerOk(ss);                                         // sb15(보안 낮음): 매니저 이상만
    if (!a[0]) throw new Error("예약 번호가 없습니다");
    /* 우리 업체가 보낸 예약인지 먼저 확인합니다 */
    const { data: mine } = await sb.from("wash_sendlog")
      .select("id").eq("shop", s).eq("msg_id", String(a[0])).limit(1);
    if (!mine || !mine.length) throw new Error("이 업체의 예약이 아닙니다");
    await solapi("DELETE", "/messages/v4/groups/" + encodeURIComponent(a[0]) + "/schedule");
    await sendLog(s, { type: "예약 취소", ok: true, id: a[0] });
    return "ok";
  },
  /* 앱 «설정 → 우리 사업장» 을 저장하면 서버 업체 정보에도 같이 넣습니다.
     (세금계산서·팝빌은 서버에 적힌 사업자번호를 씁니다) */
  shopBiz: async (s, a, ss) => {
    ownerOnly(ss);
    const v: any = a[0] || {};
    const patch: Record<string, unknown> = {};
    /* sb15(보안 W-H1): 사업자번호는 «비어 있을 때 처음 한 번»만. 바꾸려면 본사가 고칩니다.
       같은 번호를 다른 곳(워시·체크·본사)이 쓰고 있으면 넣지 않습니다. */
    if (v.bizNo !== undefined) {
      const nb = digits(v.bizNo);
      const { data: cur } = await sb.from("wash_shops").select("biz_no").eq("shop", s).maybeSingle();
      const ob = digits(String((cur && cur.biz_no) || ""));
      if (nb && nb !== ob) {
        if (ob) throw new Error("사업자번호는 한 번 넣으면 바꿀 수 없습니다. 바꾸시려면 차곳간(010-9559-3663)으로 알려 주세요.");
        if (nb.length !== 10) throw new Error("사업자번호 10자리를 넣어 주세요.");
        if (await bizTaken(nb, s)) throw new Error(BIZ_TAKEN_MSG);
        patch.biz_no = nb;
      }
    }
    if (v.ceo     !== undefined) patch.ceo     = String(v.ceo || "").trim();
    if (v.addr    !== undefined) patch.addr    = String(v.addr || "").trim();
    if (v.upte    !== undefined) patch.upte    = String(v.upte || "").trim();
    if (v.jongmok !== undefined) patch.jongmok = String(v.jongmok || "").trim();
    if (v.email   !== undefined) patch.tax_email = String(v.email || "").trim();
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_shops").update(patch).eq("shop", s);
    dbCheck(error, "업체");
    /* sb15: 처음 넣은 사업자번호는 본사 확인 전까지 «확인 중» (SQL 11 전이면 칸이 없어 넘어감) */
    if (patch.biz_no) {
      try { await sb.from("wash_shops").update({ biz_ok_at: null }).eq("shop", s); await sb.from("wash_shops").update({ biz_set_at: new Date().toISOString() }).eq("shop", s); } catch (_) { /* */ }
      try { const admin = (await hqCfg()).adminPhone;
        if (admin) await noticeSms(admin, "[차곳간] " + s + " 업체가 사업자번호를 처음 넣었습니다. 관리 → 사업자번호 확인에서 확인해 주세요", { tpl: "notice", shop: s }); }
      catch (_) { /* */ }
    }
    return { ok: true, bizWait: !!patch.biz_no };
  },
  /* 우리 업체가 팝빌에 들어가 있는지 · 인증서는 올렸는지 — 한 번에 봅니다 */
  pbReady: async (s, a, ss) => {
    managerOk(ss);
    const test = !!a[0];
    const corp = await bizNoOf(s);
    const out: any = { ok: true, test, bizNo: corp, joined: false, cert: false, until: "",
      linkId: env("POPBILL_LINKID") };
    if (!corp) { out.why = "사업자등록번호가 없습니다"; return out; }
    try {
      const m: any = await pbIsMember(corp, test);
      out.joined = !!m.joined;
      out.mine = !!m.mine;
      if (!out.joined) { out.why = "아직 팝빌에 우리 사업장 계정이 없습니다"; return out; }
    } catch (e) { out.why = e instanceof Error ? e.message : String(e); return out; }
    try {
      const c: any = await pbCertOf(corp, test);
      out.cert = !!c.has; out.until = c.until || "";
      if (!out.cert) out.why = "공동인증서를 아직 올리지 않았습니다";
    } catch (e) { out.why = e instanceof Error ? e.message : String(e); }
    return out;
  },
  /* 이 차의 «보기 주소» 받기 — 대표·매니저 [기록 id] */
  viewLink: async (s2, a, ss) => {
    managerOk(ss);
    const recId = String(a[0] || "");
    if (!recId) throw new Error("어느 차인지 알 수 없습니다");
    const { data: doc } = await sb.from("wash_docs")
      .select("id").eq("shop", s2).eq("demo", false).eq("col", "intakes").eq("id", recId).maybeSingle();
    if (!doc) throw new Error("그 차를 찾지 못했습니다");
    return await viewCodeOf(s2, recId);
  },
  /* 이 달 청구서의 «보기 주소» 받기 — 대표·매니저 [청구서 내용]
     주소는 한 번 만들면 그대로이고, 다시 부르면 내용만 새로 담깁니다. */
  viewBill: async (s2, a, ss) => {
    managerOk(ss);
    const raw = typeof a[0] === "string" ? JSON.parse(a[0]) : a[0];
    if (!raw || !raw.name) throw new Error("어느 청구서인지 알 수 없습니다");
    const snap = billSnap(raw);
    if (!snap.month) throw new Error("청구 월이 비어 있습니다");
    const coKnown = snap.unit === "dealer" && Object.prototype.hasOwnProperty.call(raw, "company");   // sb21: 화면이 상사를 보냈을 때만(옛 화면은 예전처럼)
    const dropped = await billKeepIds(s2, snap, coKnown);                       // sb17(설계 21)
    if (dropped) console.warn("viewBill: 이 업체·받는 곳·달에 맞지 않는 일감 id " + dropped + "개를 버림 (" + s2 + ")");
    /* sb21(워시 요청 · 개인정보): 딜러 단위는 상사까지 열쇠에 — 다른 상사의 같은 이름 딜러 청구서를 덮어쓰지 않게 */
    const old = "bill:" + snap.month + "|" + snap.unit + "|" + snap.name;
    const key = coKnown ? old + "|" + billCo(snap.company) : old;
    /* 옛 열쇠 주소는 옮기지 않음 — 다른 상사 딜러 것이 덮였을 수 있어서. 옛 주소는 그대로 열리고(그때 내용), 딜러 단위는 새 주소를 냄 */
    return await viewCodeOf(s2, key, "bill", snap);
  },

  /* sb18(대표님 10/18): 거래처 사업자번호 진위·상태 확인 — 체크 v37 bizVerify 와 같은 모양 · 대표만 · 하루 100 */
  bizVerify: async (s2, a, ss) => {
    ownerOnly(ss);
    const o0: any = (a[0] && typeof a[0] === "object") ? a[0] : { bizNo: a[0], ceo: a[1], openDate: a[2] };
    const o: any = { bizNo: o0.no ?? o0.bizNo, ceo: o0.ceo, openDate: o0.start ?? o0.openDate };   // 체크 v47 약속({no, ceo, start})도 받음
    if (!await rateOk("bizv:" + s2 + ":" + kstYmd(), Number(env("WASH_BIZV_DAY", "100"))))
      throw new Error("오늘 사업자번호 확인 한도를 다 썼습니다. 내일 다시 해 주세요.");
    const r = await ntsVerify(String(o.bizNo || ""), String(o.ceo || ""), String(o.openDate || ""));
    console.log("bizVerify", s2, digits(o.bizNo).slice(0, 3) + "-**-*****", r.state, r.ok, r.ready);
    return r;
  },

  /* 우리 사업장을 팝빌에 넣기 — 대표만 */
  pbJoin: async (s, a, ss) => {
    ownerOnly(ss);
    if (await bizTaken(await bizNoOf(s), s)) throw new Error(BIZ_TAKEN_MSG);   // sb15(W-H1)
    if (!a[0] && !(await bizApproved(s))) throw new Error(BIZ_WAIT_MSG);      // 실제(시험 아님)는 본사 확인 뒤
    return await pbJoinShop(s, !!a[0]);
  },
  /* 인증서 올리는 창 주소 — 대표만 */
  pbCertUrl: async (s, a, ss) => {
    ownerOnly(ss);
    const corp = await bizNoOf(s);
    if (!corp) throw new Error("사업자등록번호를 먼저 넣어 주세요");
    if (await bizTaken(corp, s)) throw new Error(BIZ_TAKEN_MSG);                 // sb15(W-H1)
    if (!a[0] && !(await bizApproved(s))) throw new Error(BIZ_WAIT_MSG);
    return await pbCertUrlOf(corp, !!a[0]);
  },
  pbCheck: async (s, a, ss) => {
    ownerOnly(ss);                                         // sb15(보안 낮음)
    const mine = await bizNoOf(s);
    if (!mine) throw new Error("사업자등록번호가 등록되어 있지 않습니다");
    return await pbCheck(mine, !!a[1]);
  },
  pbIssue: async (s, a, ss) => {
    ownerOnly(ss);
    /* sb23: 입금 완료된 청구서만 (캐시·건수를 깎기 전에 거름) */
    const gate = await taxBillGate(s, a[0]);
    if (gate.why) return { ok: false, error: gate.why, unpaid: true };
    a = [gate.json];                                        // 서버가 비고 앞에 «청구서/묶음» 을 붙인 요청으로 발행
    /* sb23(SQL 21): 실제 발행이면 차마다 먼저 잡음(시험 발행은 잡지 않음) — 실패하면 놓음 */
    const claims = gate.test ? [] : (gate.claims || []);
    if (!gate.test) {
      const why = await taxClaim(s, claims, String((ss && ss.phone) || "").slice(-4));
      if (why) return { ok: false, error: why, unpaid: true };
    }
    /* 한 건을 미리 깎고, 실패하면 되돌립니다 */
    const cfg = await hqCfg();
    if (cfg.cashOn) {
      const price = Number(cfg.price.tax || 300);
      const c: any = await cashTake(s, price, "tax", 1, "세금계산서 발행", "shop:" + s, cfg.dayMax);
      if (!c || c.ok === false) {
        await taxRelease(s, claims);
        return { ok: false, stopped: true,
          error: "남은 캐시가 " + wonTxt2(Number((c && c.balance) || 0)) +
                 " 입니다. 계산서 한 건은 " + wonTxt2(price) + " 이라 발행할 수 없습니다. 충전해 주세요" };
      }
      let r: any;
      try { r = await pbIssue(s, a[0]); } catch (e) { await cashUndoLog(c.logId); await taxRelease(s, claims); throw e; }   // 보안 참고: 던져도 놓음
      if (!r || !r.ok) { await cashUndoLog(c.logId); await taxRelease(s, claims); }
      return r;
    }
    const g = await taxTake(s);
    if (!g.allow) { await taxRelease(s, claims); return { ok: false, error: g.why || "계산서를 더 발행할 수 없습니다", stopped: true }; }
    let r: any;
    try { r = await pbIssue(s, a[0]); } catch (e) { await taxUndo(g); await taxRelease(s, claims); throw e; }
    if (!r || !r.ok) { await taxUndo(g); await taxRelease(s, claims); }
    return r;
  },

  /* ===== 카드 결제 (업체 화면) ===== */

  /* 결제 준비 — [종류(cash|plan), 금액, 캐시로 먼저 낼 금액]
     PG 결제창에 넣을 값을 돌려줍니다. 아직 돈은 안 빠집니다. */
  payStart: async (s, a, ss) => {
    ownerOnly(ss);
    const cfg = await hqCfg();
    if (!cfg.pgOn) return { ok: false, off: true, note: cfg.pgNote };
    const kind = String(a[0] || "cash") === "plan" ? "plan" : "cash";
    let amount = Math.round(Number(a[1]) || 0);
    let useCash = Math.max(0, Math.round(Number(a[2]) || 0));

    const { data: sh } = await sb.from("wash_shops")
      .select("shop,name,plan,paid_until,owner_phone").eq("shop", s).maybeSingle();
    if (!sh) throw new Error("업체 정보를 찾지 못했습니다");

    let orderName = "";
    let period = "";
    if (kind === "cash") {
      useCash = 0;
      if (amount < 10000) throw new Error("1만원부터 충전하실 수 있습니다");
      if (amount > 3000000) throw new Error("한 번에 300만원까지만 됩니다");
      orderName = "차곳간 캐시 충전 " + wonTxt2(amount);
    } else {
      /* 월 이용요금 — 요금제 금액을 서버가 직접 확인합니다 (화면 값은 믿지 않습니다) */
      const { data: pl } = await sb.from("wash_plans").select("code,name,price").eq("code", sh.plan).maybeSingle();
      if (!pl || !Number(pl.price)) throw new Error("요금제가 정해져 있지 않습니다. 차곳간으로 연락해 주세요");
      const full = Math.round(Number(pl.price) * 1.1);            // 부가세 포함
      const bal = await cashBal(s);
      useCash = Math.min(useCash, bal, full);
      /* sb15(보안 W-H3): 캐시를 쓰는 이용요금 주문이 결제창에 이미 하나 있으면 새로 만들지 않음 (캐시 두 번 쓰기 막음) */
      if (useCash > 0) {
        const { data: open } = await sb.from("wash_pay_order").select("order_id").eq("shop", s).eq("kind", "plan")
          .eq("status", "ready").gt("use_cash", 0).gt("created_at", new Date(Date.now() - 30 * 60000).toISOString()).limit(1);
        if (open && open.length)
          throw new Error("캐시를 쓰는 결제가 이미 진행 중입니다. 그 결제를 끝내거나 30분 뒤 다시 해 주세요.");
      }
      amount = full - useCash;
      period = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
      orderName = "차곳간 " + String(pl.name) + " " + period + " 이용요금";
      if (amount <= 0) {
        /* 캐시만으로 다 내는 경우 — 카드 결제 없이 바로 처리합니다 */
        const c: any = await cashTake(s, useCash, "plan", 1, orderName, "shop:" + s, 0);
        if (!c || c.ok === false) throw new Error("캐시가 모자랍니다");
        await payDone(s, kind, full, useCash, 0, period, orderName, null, "cash");
        return { ok: true, done: true, byCash: true, useCash, amount: 0 };
      }
    }

    const v = vatSplit(amount);
    const orderId = orderNo();
    /* sb13: 결제 대기 업체 주문은 «요금제를 주문에 고정»(plan_code) · who = join:<번호> (관리 꼬리표 «홈페이지» · 첫 결제) */
    const pwx = kind === "plan" ? await payWaitOf(s) : null;
    const orow: any = {
      order_id: orderId, shop: s, kind, amount: v.total, supply: v.supply, vat: v.vat,
      use_cash: useCash, status: "ready", provider: cfg.pgProvider,
      order_name: orderName, period,
      who: pwx ? "join:" + digits(ss && ss.phone) : (ss && ss.via === "check" && ss.office) ? "check:" + String(ss.office) : "shop:" + s,
    };
    if (pwx) orow.plan_code = String(sh.plan || "");
    const { error } = await sb.from("wash_pay_order").insert(orow);
    if (error) throw new Error("결제를 준비하지 못했습니다. 잠시 뒤 다시 해 주세요.");

    return {
      ok: true, orderId, amount: v.total, supply: v.supply, vat: v.vat,
      orderName, useCash, provider: cfg.pgProvider, clientKey: cfg.pgClientKey,
      customerName: String(sh.name || s),
      customerKey: "ANONYMOUS", sdk: "v2",          // sb10: v2 결제창 (한 번 결제는 비회원 ANONYMOUS)
    };
  },

  /* 결제 확인 — [주문번호, 카드사 열쇠, 금액]
     PG 창에서 돌아온 뒤 부릅니다. 여기서 실제로 승인하고 캐시를 넣습니다. */
  payConfirm: async (s, a, ss) => {
    ownerOnly(ss);
    const orderId = String(a[0] || "");
    const paymentKey = String(a[1] || "");
    const amount = Math.round(Number(a[2]) || 0);
    if (!orderId || !paymentKey) throw new Error("결제 정보가 없습니다");

    const { data: od } = await sb.from("wash_pay_order").select("*").eq("order_id", orderId).maybeSingle();
    if (!od) throw new Error("주문을 찾지 못했습니다");
    if (od.shop !== s) throw new Error("다른 업체의 결제는 볼 수 없습니다");
    if (od.status === "paid") return { ok: true, already: true, amount: od.amount };
    if (od.status !== "ready") throw new Error("이미 끝난 주문입니다");
    if (Number(od.amount) !== amount) throw new Error("결제 금액이 맞지 않습니다");

    let r: any = null;
    try {
      r = await tossCall("/v1/payments/confirm", { paymentKey, orderId, amount });
    } catch (e) {
      /* sb9: 승인 오류 = 이미 승인된 결제(두 번째 요청)일 수도 있어요 → 토스에 진짜 상태를 물어본 뒤 씁니다 */
      const m = e instanceof Error ? e.message : String(e);
      let q: any = null;
      try { q = await tossCall("/v1/payments/" + encodeURIComponent(paymentKey), null, "GET"); } catch (_) { /* */ }
      if (!(q && q.status === "DONE" && String(q.orderId) === orderId)) {
        await sb.from("wash_pay_order").update({ status: "failed", fail_msg: m })
          .eq("order_id", orderId).eq("status", "ready");          // 이미 paid 인 줄은 덮지 않음
        const { data: now } = await sb.from("wash_pay_order").select("status,amount").eq("order_id", orderId).maybeSingle();
        if (now && now.status === "paid") return { ok: true, already: true, amount: now.amount };
        throw new Error(m);
      }
      r = q;
    }
    const fin = await payFinish(od, paymentKey, r);
    if (!fin.applied && fin.why !== "already") {
      console.error("payConfirm not applied", orderId, fin.why);
      throw new Error("결제 확인이 맞지 않습니다. 차곳간으로 연락해 주세요 (주문 " + orderId + ")");
    }
    if (!fin.applied) return { ok: true, already: true, amount: Number(od.amount) };
    return { ok: true, amount: Number(od.amount), kind: od.kind,
             balance: await cashBal(s) };
  },

  /* ===== sb10: 자동 결제 (대표만 · 관리 스위치가 켜져 있어야) ===== */
  /* 카드 등록창 열기 전 — 이 업체 전용 customerKey 를 먼저 만들어 묶어 둡니다 */
  billStart: async (s, _a, ss) => {
    ownerOnly(ss);
    if (!await billingOn()) return { ok: false, off: true, note: "자동 결제는 아직 준비 중이에요" };
    let row: any = await billRow(s);
    if (!row) {
      const { error } = await sb.from("pay_billing").insert({ shop: s, customer_key: crypto.randomUUID(), status: "pending" });
      if (error) throw new Error("자동 결제를 준비하지 못했습니다");
      row = await billRow(s);
    }
    const cfg = await hqCfg();
    return { ok: true, customerKey: String(row.customer_key), clientKey: env("TOSS_BILLING_CLIENT_KEY", "") || cfg.pgClientKey };
  },
  /* 카드 등록창에서 돌아온 뒤 — [authKey, 동의 문구 판] · 빌링키는 잠가서 저장, 돌려주지 않음 */
  billIssue: async (s, a, ss) => {
    ownerOnly(ss);
    if (!await billingOn()) return { ok: false, off: true, note: "자동 결제는 아직 준비 중이에요" };
    const authKey = String(a[0] || "").trim();
    if (!authKey || authKey.length > 300) throw new Error("카드 등록 정보가 없습니다");
    const row: any = await billRow(s);
    if (!row) throw new Error("카드 등록을 처음부터 다시 해 주세요");
    let r: any = null;
    try { r = await tossCall("/v1/billing/authorizations/issue", { authKey, customerKey: row.customer_key }, "POST", { billing: true }); }
    catch (e) { throw new Error("카드를 등록하지 못했습니다. " + (e instanceof Error ? e.message.replace(/^카드사 응답: /, "") : "")); }
    const bk = String((r && r.billingKey) || "");
    if (!bk) throw new Error("카드를 등록하지 못했습니다");
    const company = String((r && (r.cardCompany || (r.card && r.card.company) || r.issuerCode)) || "").slice(0, 20);
    const last4 = String((r && (r.cardNumber || (r.card && r.card.number))) || "").replace(/[^0-9*]/g, "").slice(-4);
    const sealed = await sealBK(s, bk);
    const old = String(row.billing_key_enc || "");
    const { error } = await sb.from("pay_billing").update({
      billing_key_enc: sealed, key_ver: ENC_VER(), card_company: company, card_last4: last4, status: "on",
      agreed_at: new Date().toISOString(), agreed_text_ver: String(a[1] || "").slice(0, 20),
      fail_count: 0, first_fail_at: null, last_fail_msg: null,
    }).eq("shop", s);
    if (error) throw new Error("카드 정보를 저장하지 못했습니다");
    if (old) await billDelKey(s, old);                   // 카드를 바꾸면 예전 빌링키는 토스에서도 지움
    try {
      const { data: sh } = await sb.from("wash_shops").select("name,owner_phone,paid_until").eq("shop", s).maybeSingle();
      if (sh && sh.owner_phone)
        await noticeAta(String(sh.owner_phone), "bill_on", { 업체명: sh.name || s,
          카드: company || "카드", 다음결제일: korDay(ymd10(sh.paid_until)) || "-" }, false, { shop: s, ref: "wash:billing" });   // sb12: 카드사 이름만 (잠금 화면에 보임)
    } catch (_) { /* */ }
    return { ok: true, cardCompany: company, last4 };
  },
  /* 자동 결제 보기 — 카드사 · 끝 4자리 · 다음 결제일 (빌링키는 안 내려감) */
  billInfo: async (s, _a, ss) => {
    ownerOnly(ss);
    const on = await billingOn();
    let row: any = null;
    try { row = await billRow(s); } catch (_) { row = null; }
    const { data: sh } = await sb.from("wash_shops").select("paid_until").eq("shop", s).maybeSingle();
    return { ok: true, open: on, on: !!(row && row.status === "on"),
      cardCompany: String((row && row.card_company) || ""), last4: String((row && row.card_last4) || ""),
      nextAt: row && row.status === "on" ? ymd10(sh && sh.paid_until) : "",
      /* sb12: 실패 중이면 다음 자동 결제 시도일 (첫 실패일 + 1·3·5일) */
      nextTry: billNextTry(row),
      failCount: Number((row && row.fail_count) || 0), lastFail: String((row && row.last_fail_msg) || "") };
  },
  /* 자동 결제 끄기 — 빌링키를 토스와 우리 쪽에서 지움. 이번 기간은 끝까지 사용 */
  billOff: async (s, _a, ss) => {
    ownerOnly(ss);
    const row: any = await billRow(s);
    if (!row) return { ok: true };
    if (row.billing_key_enc) await billDelKey(s, String(row.billing_key_enc));
    await sb.from("pay_billing").update({ billing_key_enc: null, status: "off", card_company: null, card_last4: null,
      fail_count: 0, first_fail_at: null, last_fail_msg: null }).eq("shop", s);
    return { ok: true };
  },

  /* sb13: 체험판 «편한 기능» 3번 세기 — [기능 이름] → {ok, left} (결제 대기 업체만 · 정해진 이름만) */
  trialUse: async (s, a) => {
    const pw = await payWaitOf(s);
    if (!pw) return { ok: true, left: -1 };                       // 이용 중 업체는 제한 없음
    const f = String(a[0] || "");
    if (TRIAL_FEATURES.indexOf(f) < 0) throw new Error("모르는 기능입니다");
    const ok = await trialBump("f:" + s + ":" + f, TRIAL_MAX);
    const { data } = await sb.from("wash_trial_use").select("n").eq("key", "f:" + s + ":" + f).maybeSingle();
    return { ok, left: Math.max(0, TRIAL_MAX - Number((data && data.n) || 0)) };
  },
  /* sb13: 결제 대기 중 요금제 바꾸기 — [요금제] (공개 요금제만 · 이미 만든 주문의 요금제는 안 바뀜) */
  joinPlanSet: async (s, a, ss) => {
    ownerOnly(ss);
    if (!await payWaitOf(s)) throw new Error("이용 중인 업체는 요금제 화면에서 바꿔 주세요");
    const pl = await publicPlan(String(a[0] || ""));
    if (!pl) throw new Error("고를 수 없는 요금제입니다");
    await sb.from("wash_shops").update({ join_plan: pl.code, plan: pl.code }).eq("shop", s).eq("pay_wait", true);
    payWaitClear(s);
    return { ok: true, plan: pl.code, name: pl.name, price: Math.round(Number(pl.price) * 1.1) };
  },

  /* 내 결제 내역 — [] */
  payMine: async (s, _a, ss) => {
    if (!isOwnerSs(ss)) return { ok: true, orders: [], ownerOnly: true };   // sb15(보안 낮음): 결제 내역은 대표만
    const { data } = await sb.from("wash_pay_order")
      .select("order_id,kind,amount,use_cash,status,order_name,period,paid_at,method,created_at,raw")
      .eq("shop", s).order("created_at", { ascending: false }).limit(100);
    const cfg = await hqCfg();
    /* sb13 고침(워시 방 요청): 토스 영수증 주소만 꺼내 줌 (토스 원문은 안 내려감 · https://…tosspayments.com 만) */
    const orders = (data || []).map((o: any) => {
      const u = String((o.raw && o.raw.receipt && o.raw.receipt.url) || "");
      const ok = /^https:\/\/([a-z0-9-]+\.)*tosspayments\.com\//.test(u);
      const { raw: _raw, ...rest } = o;
      return Object.assign(rest, { receiptUrl: ok ? u : "" });
    });
    return { ok: true, orders, pgOn: cfg.pgOn, note: cfg.pgNote, fee: cfg.pgFee };
  },

  /* 이번 달 내야 할 금액 보기 — [] */
  payDue: async (s, _a, ss) => {
    const cfg = await hqCfg();
    if (!isOwnerSs(ss)) return { ok: true, ownerOnly: true, pgOn: cfg.pgOn };   // sb15(보안 낮음)
    const { data: sh } = await sb.from("wash_shops").select("shop,name,plan,paid_until").eq("shop", s).maybeSingle();
    if (!sh) throw new Error("업체 정보를 찾지 못했습니다");
    const isTrial = !sh.plan || sh.plan === "trial";
    if (isTrial) return { ok: true, trial: true, pgOn: cfg.pgOn };
    const { data: pl } = await sb.from("wash_plans").select("code,name,price").eq("code", sh.plan).maybeSingle();
    const price = Math.round(Number((pl && pl.price) || 0));
    const full = Math.round(price * 1.1);
    const bal = await cashBal(s);
    const period = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
    const { data: done } = await sb.from("wash_pay_order")
      .select("order_id").eq("shop", s).eq("kind", "plan").eq("period", period).eq("status", "paid").limit(1);
    return { ok: true, trial: false, pgOn: cfg.pgOn, note: cfg.pgNote,
             planName: String((pl && pl.name) || ""), price, vat: full - price, full,
             cash: bal, period, paid: !!(done && done.length), paidUntil: sh.paid_until };
  },

  /* 업체가 보는 내 캐시 지갑 — [] */
  cashInfo: async (s, _a, ss) => {
    const cfg = await hqCfg();
    if (!isOwnerSs(ss)) return { ok: true, on: cfg.cashOn, ownerOnly: true, pgOn: cfg.pgOn };   // sb15(보안 낮음): 지갑은 대표만
    if (!cfg.cashOn) return { ok: true, on: false, note: cfg.note, pgOn: cfg.pgOn, pgNote: cfg.pgNote };
    const bal = await cashBal(s);
    let lots: any[] = [], logs: any[] = [];
    try {
      const r = await sb.from("wash_cash_lot").select("kind,amount,remain,at,expires_at,memo")
        .eq("shop", s).gt("remain", 0).order("expires_at", { ascending: true }).limit(50);
      lots = r.data || [];
    } catch (_) { /* */ }
    try {
      const r = await sb.from("wash_cash_log").select("at,delta,what,qty,memo,bal_after")
        .eq("shop", s).order("at", { ascending: false }).limit(200);
      logs = r.data || [];
    } catch (_) { /* */ }
    const ym = new Date().toISOString().slice(0, 7);
    const usedMonth = logs.filter((l: any) => l.delta < 0 && String(l.at || "").slice(0, 7) === ym)
      .reduce((a: number, b: any) => a + Math.abs(Number(b.delta || 0)), 0);
    const free = lots.filter((l: any) => l.kind === "free").reduce((a: number, b: any) => a + Number(b.remain || 0), 0);
    return { ok: true, on: true, balance: bal, free, paid: Math.max(0, bal - free),
             usedMonth, price: cfg.price, bank: cfg.bank, lots, logs,
             pgOn: cfg.pgOn, pgNote: cfg.pgNote, pgFee: cfg.pgFee };
  },


  /* 공지사항 — [] · 로그인한 사람이 «다시 보지 않기» 한 것도 함께 알려줍니다 */
  noticeList: async (_s, _a, ss) => {
    const list = await noticeLive("app");
    let seen: number[] = [];
    try {
      if (ss && ss.phone) {
        const { data } = await sb.from("wash_notice_read").select("notice_id").eq("phone", ss.phone);
        seen = (data || []).map((r: any) => Number(r.notice_id));
      }
    } catch (_) { /* */ }
    return {
      ok: true,
      list: list.map((n) => Object.assign(noticeOut(n), { seen: seen.indexOf(Number(n.id)) >= 0 })),
    };
  },

  /* «다시 보지 않기» — [공지번호] */
  noticeHide: async (_s, a, ss) => {
    if (!ss || !ss.phone) throw new Error("로그인이 필요합니다");
    const id = Number(a[0] || 0);
    if (!id) throw new Error("공지 번호가 없습니다");
    try {
      await sb.from("wash_notice_read").upsert({ notice_id: id, phone: ss.phone });
    } catch (_) { throw new Error("저장하지 못했습니다"); }
    return { ok: true };
  },

  /* 우리 업체가 지금 잠겨 있는지 — [] */
  lockInfo: async (s) => {
    const st = await lockState(s);
    const cfg = await hqCfg();
    return Object.assign({}, st, { msg: (st.state === "ok" ? "" : lockMsg(st)), pgOn: cfg.pgOn });
  },

  /* «입금했습니다» — 하루 한 번만 누를 수 있고, 24시간 열어 드립니다 — [] */
  paidSay: async (s, _a, ss) => {
    if (ss && ss.role && ss.role !== "owner") throw new Error("대표님 계정에서만 누르실 수 있습니다");
    const cfg = await hqCfg();
    if (((cfg.lock || {}).paidSay) === false) throw new Error("지금은 쓸 수 없습니다. 차곳간으로 연락해 주세요");
    const { data: sh } = await sb.from("wash_shops").select(LOCK_COLS).eq("shop", s).maybeSingle();
    if (!sh) throw new Error("업체 정보를 찾지 못했습니다");
    const last = sh.paid_say_at ? Date.parse(String(sh.paid_say_at)) : 0;
    if (last && Date.now() - last < 20 * 3600000)
      throw new Error("하루에 한 번만 누르실 수 있습니다. 차곳간에서 확인하는 중입니다");
    /* sb15(보안 W-M1): 이용기한이 지난 뒤 «한 번»만. 두 번째부터는 차곳간이 입금을 확인해 열어 드립니다. */
    const due = ymd10(sh.paid_until || sh.trial_until);
    if (last && due && new Date(last + 9 * 3600e3).toISOString().slice(0, 10) >= due)
      throw new Error("«입금했습니다»는 한 번만 누르실 수 있습니다. 차곳간에서 입금을 확인하면 바로 열어 드립니다.");
    const until = ymdAdd(kstYmd(), 1);
    await sb.from("wash_shops").update({ open_until: until, paid_say_at: new Date().toISOString(),
      open_memo: "업체가 «입금했습니다» 를 눌렀습니다" }).eq("shop", s);
    try {
      await sb.from("wash_lock_log").insert({ shop: s, what: "paidsay", note: "~" + until,
        who: (ss && ss.phone) || "" });
    } catch (_) { /* */ }
    lockClear(s);
    try {
      const admin = cfg.adminPhone;
      if (admin) await noticeSms(admin, "[차곳간] " + String(sh.name || s) +
        " 에서 «입금했습니다» 를 눌렀습니다. 입금 확인 후 이용기한을 늘려 주세요");
    } catch (_) { /* */ }
    return { ok: true, until };
  },



  /* 매니저가 바꿀 수 있는 설정 — 소리·알림창만 — [{voice, voiceRate, ...}]
     설정 전체는 대표만 고칠 수 있습니다. 여기는 그 가운데 «듣는 것» 만 열어 둔 좁은 문입니다. */
  cfgVoice: async (s, a, ss) => {
    managerOk(ss);
    const OK = ["voice", "voiceRate", "voicePlate", "voiceSpot", "voiceDest", "ntfMode", "ntfVol"];
    const v = (a[0] || {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    OK.forEach((k) => { if (v[k] !== undefined) patch[k] = v[k]; });
    if (!Object.keys(patch).length) throw new Error("바꿀 내용이 없습니다");
    const { data: cur } = await sb.from("wash_docs")
      .select("data").eq("shop", s).eq("col", "settings").eq("id", "config").maybeSingle();
    const next = Object.assign({}, (cur && cur.data) || {}, patch,
      { updatedAt: new Date().toISOString(), voiceBy: (ss && ss.phone) || "" });
    return { ok: true, rev: await write(s, false, [{ col: "settings", id: "config", data: next }]) };
  },

  /* 충전 신청 남기기 — [금액, 메모] */
  cashAsk: async (s, a, ss) => {
    ownerOnly(ss);                                         // sb15(보안 낮음)
    const cfg = await hqCfg();
    if (!cfg.cashOn) return { ok: false, note: cfg.note };
    /* sb2: 충전 신청은 업체마다 하루 5번까지 (본사로 문자가 가므로) */
    if (!await rateOk("cashask:" + s + ":" + new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), 5))
      throw new Error("오늘은 충전 신청을 더 할 수 없습니다. 내일 다시 해 주시거나 차곳간으로 연락해 주세요");
    const amt = Math.max(0, Math.round(Number(a[0]) || 0));
    if (amt < 10000) throw new Error("1만원부터 신청하실 수 있습니다");
    const { data: sh } = await sb.from("wash_shops").select("name,owner_phone").eq("shop", s).maybeSingle();
    await sb.from("wash_cash_log").insert({
      shop: s, delta: 0, what: "ask", qty: 1,
      memo: "충전 신청 " + wonTxt2(amt) + (a[1] ? (" · " + String(a[1])) : ""),
    });
    const admin = (await hqCfg()).adminPhone;
    if (admin) await noticeSms(admin,
      "[차곳간] " + String((sh && sh.name) || s) + " 캐시 충전 신청 " + wonTxt2(amt));
    return { ok: true, amount: amt, bank: cfg.bank };
  },
};


/* =========================================================================
   로그인 · 자동 가입  (2026-09-25 추가)
   - 휴대폰 번호 + 비밀번호로 로그인합니다.
   - 가입하면 업체·자료공간·대표계정이 자동으로 만들어집니다.
   - 로그인하면 임시 열쇠(sid)를 주고, 그 열쇠로 기존 기능을 그대로 씁니다.
   - 기존 주소(?shop=BT&key=…) 방식도 계속 작동합니다.
   ========================================================================= */
const OTP_FROM = env("SMS_FROM", "") || env("OTP_FROM", "01095593663");   // 인증번호·안내 문자 발신번호 (대표번호가 있으면 그것)
const TRIAL_DAYS = 30;      // 무료 체험 기간(일)
const OTP_MINUTES = 5;      // 인증번호 유효시간(분)
const OTP_MAX_TRY = 5;      // 틀릴 수 있는 횟수
const OTP_MAX_DAY = 5;      // 한 번호가 하루에 받을 수 있는 횟수
const SESSION_DAYS = 14;    // 로그인 유지 기간(일)

function normPhone(p: string) {
  const d = digits(p);
  const ok = (d.length === 11 && d.slice(0, 3) === "010") ||
             (d.length >= 10 && d.length <= 11 && d.slice(0, 2) === "01" && d[2] !== "0");
  if (!ok) throw new Error("휴대폰 번호가 올바르지 않습니다");
  return d;
}
/* 로그인할 때만 쓰는 아이디 판별
   - 숫자로만 되어 있으면 휴대폰 번호로 봅니다 (일반 사용자)
   - 글자가 섞여 있으면 아이디로 봅니다 (시연·관리자 계정 — 가입으로는 만들 수 없고, DB에서만 만듭니다) */
function normId(v: string) {
  const raw = String(v || "").trim();
  if (!raw) throw new Error("아이디 또는 휴대폰 번호를 넣어 주세요");
  if (/^[0-9\-\s+()]+$/.test(raw)) return normPhone(raw);
  if (raw.length < 2 || raw.length > 20) throw new Error("아이디가 올바르지 않습니다");
  return raw;
}
/* 인증번호·임시 비밀번호용 6자리 — 암호용 난수로 만듭니다 */
function sixDigits() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(100000 + (b[0] % 900000));
}
function randHex(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
/* 비밀번호는 원문을 저장하지 않고 해시로만 둡니다 */
async function pwHash(pw: string, saltHex?: string) {
  const salt = saltHex || randHex(16);
  const te = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: te.encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return "pbkdf2$120000$" + salt + "$" + hex(bits);
}
async function pwVerify(pw: string, stored: string) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4) return false;
  const again = await pwHash(pw, parts[2]);
  if (again.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < again.length; i++) diff |= again.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}
async function codeHash(phone: string, code: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(phone + "|" + code));
  return hex(buf);
}
/* 업체 코드 자동 발급 — 헷갈리는 I·O·0·1 은 빼고 4자리 */
async function newShopCode() {
  const AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let t = 0; t < 30; t++) {
    let s = "";
    const b = new Uint8Array(4);
    crypto.getRandomValues(b);
    for (const v of b) s += AB[v % AB.length];
    const { data } = await sb.from("wash_shops").select("shop").eq("shop", s).maybeSingle();
    if (!data) return s;
  }
  throw new Error("업체 코드를 만들지 못했습니다. 다시 시도해 주세요");
}
/* 업종별 기본값 — 화면 이름이 이 값으로 바뀝니다 */
const BIZ_KIND: Record<string, { name: string; item: string; works: string[] }> = {
  wash:   { name: "차곳간 워시",   item: "광택·세차", works: ["외부세차", "실내세차", "광택", "유리막코팅"] },
  wheel:  { name: "차곳간 휠",     item: "휠복원",    works: ["휠복원", "휠도색", "타이어교체"] },
  repair: { name: "차곳간 리페어", item: "판금·도색", works: ["판금", "도색", "덴트", "부분도색"] },
};
/* 인증번호 문자 — 아직 업체가 없으므로 솔라피를 바로 부릅니다 */
async function otpSend(phone: string, code: string) {
  /* sb5: 알림톡 코드가 있으면 알림톡(안 되면 문자로 대신) */
  const c = await ataCfg();
  if (c.tpl.auth && c.pfId) {
    const how = await noticeAta(phone, "auth", { 인증번호: code, 유효시간: OTP_MINUTES }, true).catch(() => "");
    if (how === "ata" || how === "sms") return;
  }
  const msg = {
    to: phone, from: digits(OTP_FROM), type: "SMS",
    text: "[차곳간] 인증번호 " + code + " (" + OTP_MINUTES + "분 안에 입력해 주세요)",
  };
  const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [msg] }, { tpl: "auth" });
  const failed = r.failedMessageList || [];
  if (failed.length) {
    const f = failed[0] || {};
    throw new Error("인증번호를 보내지 못했습니다: " + (f.statusMessage || f.reason || f.statusCode || ""));
  }
}
/* 접속한 기기가 PC인지 휴대폰인지 판별합니다 */
function deviceKind(ua: string) {
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone|Tablet/i.test(String(ua || "")) ? "mo" : "pc";
}
/* 요금제 한 줄 읽기 (1분 기억) */
let planCache: { at: number; map: Record<string, any> } = { at: 0, map: {} };
async function planOf(plan: string) {
  const code = String(plan || "");
  if (!code) return null;
  if (Date.now() - planCache.at > 60_000) { planCache = { at: Date.now(), map: {} }; }
  if (planCache.map[code] !== undefined) return planCache.map[code];
  const { data } = await sb.from("wash_plans")
    .select("code,name,seats,pc_max,staff_pc").eq("code", code).maybeSingle();
  planCache.map[code] = data || null;
  return data || null;
}

/* 기기 규칙
   - 휴대폰 : 계정 하나에 1대. 계정 수(seats)만큼 쓸 수 있습니다.
   - PC     : 업체 전체로 요금제의 'PC 대수'까지. 넘으면 가장 오래된 PC가 로그아웃됩니다.
   - 직원   : 기본은 휴대폰만. 요금제에서 허용하면 PC도 됩니다.
   같은 사람이 같은 종류의 기기로 새로 들어오면 그 사람의 이전 기기만 로그아웃됩니다. */
async function checkDeviceRule(role: string, kind: string, plan: string) {
  if (kind !== "pc") return;                                 // 휴대폰은 통과
  if (role === "owner" || role === "admin") return;          // 대표는 PC도 됩니다
  if (role === "manager") return;                            // 매니저도 PC 가 됩니다
  const pl = await planOf(plan);
  if (pl && pl.staff_pc) return;                             // 요금제가 허용하면 통과
  throw new Error("직원 계정은 휴대폰에서만 들어올 수 있습니다. 대표님께 문의해 주세요");
}
/* 업체 전체 PC 대수 맞추기 — 넘치면 가장 오래된 PC를 내보냅니다 */
async function trimShopPc(shop: string, plan: string) {
  const pl = await planOf(plan);
  const max = Math.max(0, Number((pl && pl.pc_max) || 0));
  if (!max) return;                                          // 0 = 제한 없음
  const { data } = await sb.from("wash_sessions")
    .select("sid,created_at").eq("shop", shop).eq("kind", "pc")
    .order("created_at", { ascending: true });
  const rows = data || [];
  const over = rows.length - max;
  if (over > 0) {
    await sb.from("wash_sessions").delete().in("sid", rows.slice(0, over).map((r: any) => r.sid));
  }
}
async function makeSession(phone: string, shop: string, role: string, ctx?: any, plan?: string) {
  const sid = randHex(24);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  const ua = String((ctx && ctx.ua) || "");
  const kind = deviceKind(ua);
  /* 같은 사람의 같은 종류 기기는 한 대만 — 새로 들어오면 이전 것을 지웁니다 */
  await sb.from("wash_sessions").delete().eq("phone", phone).eq("kind", kind);
  await sb.from("wash_sessions").insert({
    sid, phone, shop, role, expires_at: exp, kind, ua: ua.slice(0, 250),
  });
  if (kind === "pc") await trimShopPc(shop, String(plan || ""));
  return { sid, exp, kind };
}
async function sessionOf(sid: string) {
  if (!sid || sid.length < 20) return null;
  const { data } = await sb.from("wash_sessions")
    .select("sid,phone,shop,role,expires_at").eq("sid", sid).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as { sid: string; phone: string; shop: string; role: string };
}

/* ---------- 가입 코드(초대) ----------
   wash_invites 에 적힌 번호만 «새 업체 가입»을 할 수 있습니다.
   환경변수 OPEN_SIGNUP 을 "1" 로 두면 누구나 가입할 수 있게 열립니다. */
/* DB가 낸 오류를 삼키지 않고 그대로 알려 줍니다 (표가 없으면 바로 보이게) */
function dbCheck(error: any, what: string) {
  if (!error) return;
  const m = String(error.message || error);
  if (/relation .* does not exist|could not find the table|schema cache/i.test(m))
    throw new Error(what + " 기능을 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  throw new Error(what + " 처리 실패: " + m);
}
/* sb13: 자유 가입 스위치 (관리 wash_hq.open_signup · 예전 비밀값 OPEN_SIGNUP=1 도 받음) · 한도 */
async function openSignupOn() {
  if (env("OPEN_SIGNUP", "") === "1") return true;
  try { const { data } = await sb.from("wash_hq").select("open_signup").eq("id", 1).maybeSingle(); return !!(data && data.open_signup); }
  catch (_) { return false; }
}
async function signupCfg(): Promise<any> {
  try { const { data } = await sb.from("wash_hq").select("signup_cfg").eq("id", 1).maybeSingle(); return (data && data.signup_cfg) || {}; }
  catch (_) { return {}; }
}
async function inviteOf(phone: string) {
  const { data, error } = await sb.from("wash_invites").select("*").eq("phone", phone).maybeSingle();
  dbCheck(error, "가입 코드");
  if (!data) return null;
  if (data.used_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}
async function paidOf(phone: string) {
  const { data, error } = await sb.from("wash_payments")
    .select("id,plan,amount,status,paid_at").eq("phone", phone).eq("status", "paid")
    .is("shop", null).order("paid_at", { ascending: false }).limit(1);
  if (error) return null;               // 결제 표가 없어도 가입 코드으로는 계속 진행
  return (data && data[0]) || null;
}
async function needInvite(phone: string) {
  if (env("OPEN_SIGNUP", "") === "1") return null;
  const pay = await paidOf(phone);        // 결제를 마친 번호는 바로 가입
  if (pay) return { paid: pay };
  const iv = await inviteOf(phone);       // 또는 본사가 권한을 준 번호
  if (!iv) throw new Error("아직 가입할 수 없는 번호입니다. 결제를 마치거나 차곳간에 가입 코드를 요청해 주세요");
  return iv;
}

/* ---------- 로그인 전에 쓸 수 있는 기능 ---------- */
const OPEN: Record<string, (a: any[], ctx?: any) => Promise<unknown>> = {
  /* 딜러가 알림톡 «차량 보기» 를 눌러 여는 화면 — 로그인 없음 [보기코드] */
  viewCar: async (a, ctx) => {
    const code = String(a[0] || "").trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 24);
    const gone = { ok: false, gone: true,
      why: "주소가 닫혔거나 올바르지 않습니다. 맡기신 업체로 문의해 주세요" };
    if (code.length !== 24) return gone;
    /* 찍어보기 막기 — 한 아이피에서 하루 300번까지 */
    if (!await rateOk("view:" + String((ctx && ctx.ip) || "0"), 300))
      return { ok: false, gone: true, why: "잠시 뒤 다시 열어 주세요" };

    const { data: vc } = await sb.from("wash_viewcode")
      .select("code,shop,rec_id,expires_at,kind,data").eq("code", code).maybeSingle();
    if (!vc) return gone;
    if (new Date(String(vc.expires_at)).getTime() < Date.now()) return gone;

    const { data: sh } = await sb.from("wash_shops")
      .select("shop,name,active,sms_from,owner_phone,addr").eq("shop", vc.shop).maybeSingle();
    if (!sh || sh.active === false) return gone;

    const place = { name: String(sh.name || ""),
      phone: String(sh.sms_from || sh.owner_phone || ""), addr: String(sh.addr || "") };

    /* 열어본 횟수만 남깁니다 (누가 봤는지는 남기지 않습니다) */
    sb.rpc("wash_view_hit", { p_code: code }).then(() => {}, () => {});

    /* ① 한 달 청구서 — 만들 때 담아 둔 내용을 그대로 보여 드립니다 */
    if (String(vc.kind || "car") === "bill") {
      const b0: any = vc.data;
      if (!b0) return gone;
      /* sb17(설계 21): 열 때마다 장부로 입금 상태를 다시 셈 · 일감 id 는 내보내지 않음 */
      const live = await billLive(String(vc.shop), b0).catch(() => null);
      const b: any = Object.assign({}, b0, {
        rows: (Array.isArray(b0.rows) ? b0.rows : []).map((r: any, i: number) => {
          const o: any = Object.assign({}, r); delete o.id;
          if (live) o.paid = !!live.paidRow[i];
          return o;
        }),
      });
      if (live) { b.paid = live.paid; b.due = live.due; b.paidAt = live.paidAt; b.live = true; }
      const unpaid = await billUnpaidOthers(String(vc.shop), String(vc.rec_id || ""), code);   // sb26: 밀린 달 목록
      return { ok: true, kind: "bill", shop: place, bill: b, unpaid, until: String(vc.expires_at) };
    }

    const { data: doc } = await sb.from("wash_docs")
      .select("data").eq("shop", vc.shop).eq("demo", false)
      .eq("col", "intakes").eq("id", vc.rec_id).maybeSingle();
    const r: any = doc && doc.data;
    if (!r) return gone;

    /* sb4: 사진은 서명 주소로 (보기 주소가 살아 있는 동안, 그 업체 폴더 사진만) */
    const want: [string, string][] = [];
    const push = (id: any, tag: string) => { const v = String(id || ""); if (v) want.push([v, tag]); };
    push(r.photoId, "입고");
    push(r.outPhotoId, "도착");
    (Array.isArray(r.memoPhotos) ? r.memoPhotos : []).forEach((x: any) =>
      push(typeof x === "string" ? x : (x && x.id), "맡길 때"));
    const addIds = (Array.isArray(r.addWorks) ? r.addWorks : []).flatMap((w: any) =>
      (Array.isArray(w && w.photoIds) ? w.photoIds : []).map((x: any) => String(typeof x === "string" ? x : (x && x.id) || "")));
    const links = await shotLinks(want.map((x) => x[0]).concat(addIds), String(vc.shop), 3600);
    const shots: any[] = want.filter((x) => links[x[0]]).map((x) => ({ url: links[x[0]], tag: x[1] }));

    const works = (Array.isArray(r.works) ? r.works : [])
      .map((w: any) => String((w && w.name) || "")).filter(Boolean);   /* 이름만 — 금액은 보내지 않습니다 */

    /* 사장님이 올린 «추가 작업» — 딜러가 여기서 진행 여부를 누릅니다 */
    const adds = (Array.isArray(r.addWorks) ? r.addWorks : []).map((w: any) => ({
      id: String((w && w.id) || ""),
      text: String((w && w.text) || ""),
      amount: Number((w && w.amount) || 0) || 0,
      at: String((w && w.at) || ""),
      state: String((w && w.state) || "대기"),
      answerAt: String((w && w.answerAt) || ""),
      shots: (Array.isArray(w && w.photoIds) ? w.photoIds : [])
        .map((x: any) => links[String(typeof x === "string" ? x : (x && x.id) || "")] || "").filter(Boolean),
    })).filter((w: any) => w.id);

    return { ok: true, kind: "car",
      shop: place,
      car: { plate: String(r.plate || ""), model: String(r.model || ""),
             company: String(r.company || ""), dealer: String(r.dealer || ""),
             inAt: String(r.createdAt || r.at || ""), outAt: String(r.outAt || ""),
             dest: String(r.dest || ""), memo: String(r.memo || ""),
             status: r.outAt ? "출고" : "입고", works },
      adds, shots, until: String(vc.expires_at) };
  },

  /* 딜러가 «추가 작업» 에 진행 여부를 누름 — 로그인 없음 [보기코드, 작업id, 진행?] */
  viewAnswer: async (a, ctx) => {
    const code = String(a[0] || "").trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 24);
    const wid = String(a[1] || "").slice(0, 60);
    const yes = a[2] === true || a[2] === "yes" || a[2] === 1 || a[2] === "1";
    const nope = { ok: false, why: "답을 남기지 못했습니다. 맡기신 업체로 전화해 주세요" };
    if (code.length !== 24 || !wid) return nope;
    if (!await rateOk("vans:" + String((ctx && ctx.ip) || "0"), 100))
      return { ok: false, why: "잠시 뒤 다시 눌러 주세요" };

    const { data: vc } = await sb.from("wash_viewcode")
      .select("shop,rec_id,expires_at,kind").eq("code", code).maybeSingle();
    if (!vc || String(vc.kind || "car") !== "car") return nope;
    if (new Date(String(vc.expires_at)).getTime() < Date.now()) return nope;

    const { data: doc } = await sb.from("wash_docs")
      .select("data").eq("shop", vc.shop).eq("demo", false)
      .eq("col", "intakes").eq("id", vc.rec_id).maybeSingle();
    const r: any = doc && doc.data;
    if (!r) return nope;

    const list = Array.isArray(r.addWorks) ? r.addWorks : [];
    const hit = list.filter((w: any) => String((w && w.id) || "") === wid)[0];
    if (!hit) return nope;
    hit.state = yes ? "진행" : "안 함";
    hit.answerAt = new Date().toISOString();
    r.addWorks = list;
    try {
      await write(String(vc.shop), false, [{ col: "intakes", id: String(vc.rec_id), data: r }]);
    } catch (_) { return nope; }
    return { ok: true, state: hit.state };
  },

  /* 수파베이스 자동 시계가 부르는 문 — [열쇠] */
  /* sb10: 웹훅 확인 — [주문번호] · 결제 전용 함수 pay-hook 이 부름. 누가 불러도 토스 조회 결과로만 반영 */
  payCheck: async (a, ctx) => {
    const orderId = String(a[0] || "").trim().toUpperCase();
    if (!ORDER_RE.test(orderId)) return { ok: false };
    /* sb10(보안 조건 2): pay-hook 이 전용 열쇠(x-cgg-internal)로 부르면 따로 셈 — 바깥에서 막 불러도 진짜 웹훅 반영이 밀리지 않게 */
    const internal = !!(ctx && ctx.internal);
    if (!await rateOk(internal ? "paychk:hook" : "paychk:" + String((ctx && ctx.ip) || "0"), internal ? 50000 : 3000))
      return { ok: false, slow: true };
    return { ok: true, result: await payCheckOne(orderId) };
  },
  /* sb10: 결제 예약 실행 — [cron_key] · 하루 몇 번: ready 주문 정리 + (스위치 켜졌으면) 자동 결제 */
  cronPay: async (a) => {
    const cfg = await hqCfg(true);
    if (!cfg.cronKey || String(a[0] || "") !== cfg.cronKey) throw new Error("허용되지 않은 요청입니다");
    const out: string[] = [];
    try { await payReconcile(out); } catch (_) { out.push("정리 오류"); }
    if (await billingOn()) { try { await billRun(out); } catch (_) { out.push("자동 결제 오류"); } }
    else out.push("자동 결제 꺼짐");
    return { ok: true, out };
  },
  cronExpire: async (a) => {
    const cfg = await hqCfg(true);
    if (!cfg.cronKey || String(a[0] || "") !== cfg.cronKey)
      throw new Error("허용되지 않은 요청입니다");

    const out: string[] = [];

    /* ① 유효기간 지난 캐시 정리 */
    try { await sb.rpc("wash_cash_expire"); } catch (_) { /* */ }
    /* sb15: 발송 기록 — 최종 결과 채우기(10분마다 100건) · 90일 지난 줄은 하루 한 번 달 합계로 옮기고 지움 */
    try { out.push("발송 결과 " + await sendFill(100)); } catch (_) { /* */ }
    try {
      if (await rateOk("sendpurge:" + kstYmd(), 1)) {
        const { data: k } = await sb.rpc("cgg_sendlog_purge", { p_days: 90 });
        out.push("발송 기록 정리 " + Number(k || 0));
      }
    } catch (_) { /* SQL 11 전이면 넘어감 */ }

    const e = cfg.exp || {};
    if (e.on === false) return { ok: true, skipped: "자동 발송이 꺼져 있습니다" };

    /* ② 보낼 시각인지 — 적어둔 시각부터 30분 안에만 움직입니다 */
    const hhmm = String(e.time || "12:00");
    const tgt = (Number(hhmm.slice(0, 2)) || 0) * 60 + (Number(hhmm.slice(3, 5)) || 0);
    const now = kstMinutes();
    if (now < tgt || now - tgt > 30) return { ok: true, waiting: hhmm };

    const days: number[] = Array.isArray(e.days) && e.days.length ? e.days.map(Number) : [3, 0];
    const tpls = (e.tpls || []) as any[];
    const ti = Math.min(2, Math.max(0, Number(e.tplIdx) || 0));
    const tpl = String((tpls[ti] && tpls[ti].text) ||
      "[차곳간] {업체} 사장님, {무엇}이 {날짜}에 끝납니다.\n계속 쓰시려면 연락 주세요.");
    const cashTpl = String((tpls[2] && tpls[2].text) || tpl);

    const t0 = kstToday();
    const { data: shops } = await sb.from("wash_shops")
      .select(LOCK_COLS + ",exp_sms").neq("shop", "ADMIN");
    const LK = cfg.lock || {};

    for (const sh of (shops || [])) {
      if (sh.active === false) continue;
      if (sh.exp_sms === false) continue;
      const phone = digits(String(sh.owner_phone || ""));
      if (!phone || phone.length < 10) continue;

      /* ③ 체험 / 이용기한 */
      const isTrial = !sh.plan || sh.plan === "trial";
      if (isTrial && e.trial === false) { /* 체험은 안 보냄 */ }
      else {
        const end = String((isTrial ? sh.trial_until : sh.paid_until) || "").slice(0, 10);
        if (end) {
          const left = Math.round((Date.parse(end + "T00:00:00Z") - t0) / DAY);
          if (days.indexOf(left) >= 0) {
            const kind = isTrial ? "trial" : "paid";
            const { error: dup } = await sb.from("wash_expire_log")
              .insert({ shop: sh.shop, end_at: end, dleft: left, phone, kind });
            if (!dup) {
              const text = fillTpl(tpl, {
                업체: String(sh.name || sh.shop), 무엇: isTrial ? "체험 기간" : "이용기한",
                날짜: korDay(end), 남은일: String(left), 요금제: String(sh.plan || ""),
                캐시: String(await cashBal(sh.shop)),
              });
              try {
                await ataOrSms(phone, "expire_soon", { 업체명: String(sh.name || sh.shop), 무엇: isTrial ? "체험 기간" : "이용기간",
                  종료일: korDay(end), 남은일: String(left), 요금제: isTrial ? "체험" : await planName(String(sh.plan || "")) },
                  text, { shop: sh.shop });
                out.push(sh.shop + " " + kind + " D-" + left);
              } catch (_) { /* */ }
            }
          }
        }
      }

      /* ③-2 잠금이 시작된 날 · 차단 전날 · 자료 정리 예고 */
      if (LK.on !== false) {
        const st: any = lockOf(sh, cfg);
        const tod = st.today;
        const jobs: Array<{ kind: string; when: string; text: string }> = [];
        const what = st.kind === "trial" ? "체험 기간" : "이용기간";
        const lv = { 업체명: String(sh.name || sh.shop), 무엇: what, 종료일: korDay(st.endAt || ""),
          차단일: korDay(st.blockFrom || ""), 보관일: korDay(st.delAt || "") };
        const ATA_OF: Record<string, string> = { lock: "use_limit", block: "login_block", del: "data_keep" };
        if (st.endAt && !st.opened) {
          /* 잠금이 시작되는 날 (끝난 다음 날) */
          if (st.lockDays > 0 && tod === ymdAdd(st.endAt, 1))
            jobs.push({ kind: "lock", when: st.endAt, text:
              "[차곳간] " + String(sh.name || sh.shop) + " 사장님, " +
              (st.kind === "trial" ? "체험 기간" : "이용기간") + "이 " + korDay(st.endAt) + "에 끝났습니다.\n" +
              "지난 자료는 그대로 보실 수 있지만 새 접수·문자는 멈춰 있습니다.\n" +
              korDay(st.blockFrom) + "부터는 로그인도 막힙니다. 010-9559-3663" });
          /* 차단 하루 전 */
          if (st.lockUntil && tod === st.lockUntil)
            jobs.push({ kind: "block", when: st.endAt, text:
              "[차곳간] " + String(sh.name || sh.shop) + " 사장님, 내일(" + korDay(st.blockFrom) + ")부터는 " +
              "차곳간에 로그인하실 수 없습니다.\n결제하시면 바로 다시 열립니다. 010-9559-3663" });
          /* 자료 정리 7일 전 */
          if (LK.warnDel !== false && st.delAt && tod === ymdAdd(st.delAt, -7))
            jobs.push({ kind: "del", when: st.endAt, text:
              "[차곳간] " + String(sh.name || sh.shop) + " 사장님, " + korDay(st.delAt) + "에 " +
              "그동안 쌓인 자료를 정리할 예정입니다.\n필요하시면 그 전에 연락 주세요. 010-9559-3663" });
        }
        for (const j of jobs) {
          const { error: dup } = await sb.from("wash_expire_log")
            .insert({ shop: sh.shop, end_at: j.when, dleft: -2, phone, kind: j.kind });
          if (dup) continue;
          try {
            const how = await ataOrSms(phone, ATA_OF[j.kind], lv, j.text, { shop: sh.shop });
            await sb.from("wash_lock_log").insert({ shop: sh.shop, what: j.kind, note: how === "ata" ? "알림톡 보냄" : "문자 보냄" });
            out.push(sh.shop + " " + j.kind);
          } catch (_) { /* */ }
        }
      }

      /* ④ 캐시가 사라지기 전 안내 (30일 전 · 7일 전) */
      if (e.cash !== false && cfg.cashOn) {
        try {
          const { data: lots } = await sb.from("wash_cash_lot")
            .select("id,remain,expires_at,warn30,warn7")
            .eq("shop", sh.shop).gt("remain", 0).not("expires_at", "is", null);
          for (const lot of (lots || [])) {
            const left = Math.round((Date.parse(ymd10(lot.expires_at) + "T00:00:00Z") - t0) / DAY);
            let step = 0;
            if (left === 30 && !lot.warn30) step = 30;
            else if (left === 7 && !lot.warn7) step = 7;
            if (!step) continue;
            const text = fillTpl(cashTpl, {
              업체: String(sh.name || sh.shop), 무엇: "캐시",
              날짜: korDay(String(lot.expires_at)), 남은일: String(left),
              요금제: String(sh.plan || ""), 캐시: wonTxt2(Number(lot.remain || 0)),
            });
            try {
              await noticeSms(phone, text);
              await sb.from("wash_cash_lot")
                .update(step === 30 ? { warn30: true } : { warn7: true }).eq("id", lot.id);
              await sb.from("wash_expire_log").insert({
                shop: sh.shop, end_at: String(lot.expires_at), dleft: step,
                phone, kind: "cash" + step, note: "캐시 " + wonTxt2(Number(lot.remain || 0)) });
              out.push(sh.shop + " 캐시 D-" + step);
            } catch (_) { /* */ }
          }
        } catch (_) { /* */ }
      }

      /* ⑤ sb16: 잔액 안내 — 캐시 잔액이 기준 금액(관리 «자동 안내» balMin, 0이면 끔) 아래면 하루 한 번 */
      const balMin = Math.max(0, Number(e.balMin) || 0);
      if (balMin > 0 && cfg.cashOn && !(!sh.plan || sh.plan === "trial")) {
        try {
          const bal = await cashBal(sh.shop);
          if (bal < balMin && await rateOk("balwarn:" + sh.shop + ":" + kstYmd(), 1)) {
            await ataOrSms(phone, "balance", { 업체명: String(sh.name || sh.shop), 잔액: won(bal), 기준일: korDay(kstYmd()) },
              "[차곳간] " + String(sh.name || sh.shop) + " 이용 잔액이 " + wonTxt2(bal) + "입니다. 충전해 주세요. 문의 010-9559-3663",
              { shop: sh.shop });
            out.push(sh.shop + " 잔액 " + bal);
          }
        } catch (_) { /* */ }
      }
    }
    return { ok: true, sent: out.length, list: out, at: new Date().toISOString() };
  },


  /* 인증번호 보내기 — [휴대폰, 쓰임새]
     쓰임새 "new"  : 아직 아무 데도 등록 안 된 번호여야 합니다 (가입 · 직원 계정 만들기 · 번호 바꾸기)
     쓰임새 "reset": 이미 등록된 번호여야 합니다 (비밀번호 찾기)
     쓰임새 없음   : 예전 그대로 */
  sendCode: async (a, ctx) => {
    const phone = normPhone(a[0]);
    /* 문자 폭탄 방지 — 보내는 사람(IP)별 · 전체 하루 상한 */
    if (!await rateOk("otp:ip:" + ((ctx && ctx.ip) || "0"), Number(env("OTP_MAX_IP_DAY", "20"))))
      throw new Error("인증번호를 너무 많이 요청했습니다. 잠시 후 다시 시도해 주세요");
    if (!await rateOk("otp:all", Number(env("OTP_MAX_ALL_DAY", "500"))))
      throw new Error("지금은 인증번호를 보낼 수 없습니다. 잠시 후 다시 시도해 주세요");
    /* 쓰임새: signup = 새 업체 가입 / staff = 직원 계정 / reset = 비밀번호 찾기 */
    let purpose = String(a[1] || "");
    if (purpose === "new") purpose = "staff";          // 예전 이름 그대로 받아 줍니다
    if (purpose === "signup" || purpose === "staff" || purpose === "reset") {
      const { data: u } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
      if (purpose !== "reset" && u) throw new Error("이미 쓰고 있는 휴대폰 번호입니다. 다른 번호를 넣어 주세요");
      if (purpose === "reset" && !u) throw new Error("가입되지 않은 번호입니다");
    }
    if (purpose === "signup") {
      if (await openSignupOn()) {
        /* sb13: 자유 가입 — 가입 인증 따로 한도 (IP 하루 5 · 전체 하루 200 · 넘으면 본사 문자 한 번) */
        const sc = await signupCfg();
        if (!await rateOk("signup:ip:" + ((ctx && ctx.ip) || "0"), Number(sc.perIp || 5)))
          throw new Error("인증번호를 너무 많이 요청했습니다. 내일 다시 시도해 주세요");
        if (!await rateOk("signup:all", Number(sc.allDay || 200))) {
          if (await rateOk("signup:all:warn", 1)) {
            try { const admin = (await hqCfg()).adminPhone; if (admin) await noticeSms(admin, "[차곳간] 오늘 가입 인증이 한도를 넘어 멈췄습니다"); } catch (_) { /* */ }
          }
          throw new Error("지금은 가입 인증을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요");
        }
      } else await needInvite(phone);  // 가입 코드이 있는 번호만
    }
    if (!purpose) {
      /* 쓰임새를 안 적은 옛 호출 — 아무 번호로나 나가지 않게 막습니다 */
      const { data: known } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
      if (!known) await needInvite(phone);
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data: old } = await sb.from("wash_otp").select("*").eq("phone", phone).maybeSingle();
    let sent = 0;
    if (old && old.sent_day === today) sent = old.sent_count;
    if (sent >= OTP_MAX_DAY) throw new Error("오늘은 인증번호를 더 받을 수 없습니다. 내일 다시 시도해 주세요");
    const code = sixDigits();
    await sb.from("wash_otp").upsert({
      phone, code_hash: await codeHash(phone, code), tries: 0,
      sent_count: sent + 1, sent_day: today, verified: false,
      expires_at: new Date(Date.now() + OTP_MINUTES * 60000).toISOString(),
    });
    await otpSend(phone, code);
    return { ok: true, minutes: OTP_MINUTES };
  },

  /* 인증번호 확인 — [휴대폰, 인증번호] */
  verifyCode: async (a) => {
    const phone = normPhone(a[0]);
    const code = digits(a[1]);
    const { data: o } = await sb.from("wash_otp").select("*").eq("phone", phone).maybeSingle();
    if (!o) throw new Error("인증번호를 먼저 받아 주세요");
    if (new Date(o.expires_at).getTime() < Date.now()) throw new Error("인증번호가 만료되었습니다. 다시 받아 주세요");
    /* 먼저 시도 횟수를 올리고(동시에 들어와도 정확) 그 다음에 맞는지 봅니다 */
    let tries = Number(o.tries || 0) + 1;
    try {
      const { data: t, error } = await sb.rpc("wash_otp_try", { p_phone: phone });
      if (error) throw error;
      tries = Number(t);
    } catch (_) {
      await sb.from("wash_otp").update({ tries }).eq("phone", phone);
    }
    if (tries > OTP_MAX_TRY) throw new Error("너무 많이 틀렸습니다. 인증번호를 다시 받아 주세요");
    if (await codeHash(phone, code) !== o.code_hash)
      throw new Error("인증번호가 다릅니다 (" + Math.max(0, OTP_MAX_TRY - tries) + "번 더 가능)");
    await sb.from("wash_otp").update({ verified: true }).eq("phone", phone);
    const { data: u } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
    return { ok: true, joined: !!u };
  },

  /* 가입 — [휴대폰, 상호, 업종, 비밀번호, 대표이름]
     업체 + 빈 자료공간 + 대표계정을 한 번에 만들고 바로 입장시킵니다 */
  signup: async (a, ctx) => {
    const phone = normPhone(a[0]);
    const bizName = String(a[1] || "").trim();
    const kind = String(a[2] || "wash");
    const pw = String(a[3] || "");
    const who = String(a[4] || "").trim() || "대표";
    /* sb13: 고른 요금제 — trial(또는 비움)이면 체험, 공개 요금제면 «결제 대기» */
    const wantPlan = String(a[5] || "trial");
    const payPlan = wantPlan === "trial" ? null : await publicPlan(wantPlan);
    if (wantPlan !== "trial" && !payPlan) throw new Error("고를 수 없는 요금제입니다");
    if (!bizName) throw new Error("상호를 입력해 주세요");
    if (!BIZ_KIND[kind]) throw new Error("업종을 골라 주세요");
    if (pw.length < 6) throw new Error("비밀번호는 6자 이상으로 해 주세요");

    const { data: o } = await sb.from("wash_otp").select("verified,expires_at").eq("phone", phone).maybeSingle();
    if (!o || !o.verified) throw new Error("휴대폰 인증을 먼저 해 주세요");
    if (new Date(o.expires_at).getTime() < Date.now() - 30 * 60000) throw new Error("인증이 오래되었습니다. 다시 받아 주세요");
    const { data: dup } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
    if (dup) throw new Error("이미 가입된 번호입니다. 로그인해 주세요");
    if (!await openSignupOn()) await needInvite(phone);  // 가입 코드이 있는 번호만 (sb13: 자유 가입 스위치가 켜졌으면 누구나)
    /* sb13: 같은 IP 에서 «결제 대기» 업체는 하루 3개까지 */
    if (payPlan && !await rateOk("paywait:ip:" + ((ctx && ctx.ip) || "0"), Number((await signupCfg()).waitPerIp || 3)))
      throw new Error("오늘은 이곳에서 더 가입할 수 없습니다. 내일 다시 해 주세요");

    const shop = await newShopCode();
    const token = randHex(16);
    const meta = BIZ_KIND[kind];
    const trialUntil = new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString();

    const { error: e1 } = await sb.from("wash_shops").insert(payPlan
      ? { shop, name: bizName, token, biz_kind: kind, owner_phone: phone, plan: payPlan.code, pay_wait: true, join_plan: payPlan.code }
      : { shop, name: bizName, token, biz_kind: kind, owner_phone: phone, plan: "trial", trial_until: trialUntil });
    if (e1) throw new Error("업체를 만들지 못했습니다: " + e1.message);

    const now = new Date().toISOString();
    const cfg = {
      updatedAt: now, hideAdmin: true, bizKind: kind,   // ← 화면이 업종을 여기서 읽습니다
      supplier: { bizName, bizNo: "", ceo: who, addr: "", upte: "", jongmok: "", email: "", itemName: meta.item },
      send: { url: "", from: "", mode: "AUTO", token: "", autoOut: true, autoBill: true },
      destinations: [], works: meta.works.map((n) => ({ name: n, amount: 0 })),
    };
    const uid = "s_" + Date.now();
    await write(shop, false, [
      { col: "settings", id: "config", data: JSON.stringify(cfg) },
      { col: "staff", id: uid, data: JSON.stringify({ id: uid, name: who, phone, role: "owner", active: true, createdAt: now }) },
    ]);
    await sb.from("wash_users").insert({ phone, shop, name: who, role: "owner", pw_hash: await pwHash(pw) });
    await sb.from("wash_otp").delete().eq("phone", phone);
    await sb.from("wash_invites").update({ used_at: new Date().toISOString(), used_shop: shop }).eq("phone", phone);
    await sb.from("wash_payments").update({ shop }).eq("phone", phone).eq("status", "paid").is("shop", null);
    await sb.from("wash_agreements").update({ }).eq("phone", phone);   // 동의 기록은 그대로 둡니다

    const s = await makeSession(phone, shop, "owner", ctx, "trial");
    return { ok: true, shop, name: bizName, bizKind: kind, role: "owner", who,
             key: s.sid, expires: s.exp, trialUntil: payPlan ? null : trialUntil,
             payWait: !!payPlan, joinPlan: payPlan ? payPlan.code : "" };
  },

  /* 로그인 — [휴대폰, 비밀번호] */
  /* ===== 관리 2단계 로그인 =====
     ① hqLogin(아이디, 비밀번호) → 맞으면 사장님 휴대폰으로 6자리를 보냅니다
     ② hqLogin2(표, 6자리)       → 맞으면 그때 열쇠(sid)를 줍니다
     비밀번호만 알아서는 들어올 수 없습니다. */
  hqLogin: async (a, ctx) => {
    const id = normId(a[0]);
    const pw = String(a[1] || "");
    if (!await rateOk("pwfail:" + id, Number(env("LOGIN_MAX_FAIL", "10"))))
      throw new Error("비밀번호를 여러 번 틀렸습니다. 잠시 후 다시 시도해 주세요");
    if (!await rateOk("hqlogin:ip:" + ((ctx && ctx.ip) || "0"), Number(env("LOGIN_MAX_IP", "50"))))
      throw new Error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요");

    const { data: u } = await sb.from("wash_users")
      .select("phone,shop,name,role,pw_hash,active").eq("phone", id).maybeSingle();
    if (!u || !u.active) throw new Error("아이디 또는 비밀번호가 맞지 않습니다");
    if (!(await pwVerify(pw, u.pw_hash))) throw new Error("아이디 또는 비밀번호가 맞지 않습니다");
    if (u.shop !== "ADMIN") throw new Error("관리는 차곳간 본사 계정만 들어올 수 있습니다");
    try { await sb.from("wash_rate").delete().eq("key", "pwfail:" + id); } catch (_) { /* */ }

    const cfg0 = await hqCfg(true);
    const to = cfg0.adminPhone;
    if (!to) throw new Error("본사 휴대폰 번호가 없습니다. 관리에서 등록해 주세요");
    if (!await rateOk("hqotp:" + id, 10))
      throw new Error("인증번호를 너무 자주 받았습니다. 잠시 후 다시 해 주세요");

    const code = sixDigits();
    const tick = randHex(16);
    const hash = await pwHash(code);
    const { error } = await sb.from("wash_hq_otp").insert({
      tick, phone: id, code_hash: hash, kind: "login",
      expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
      ua: String((ctx && ctx.ua) || "").slice(0, 200), ip: String((ctx && ctx.ip) || ""),
    });
    if (error) throw new Error("인증번호를 준비하지 못했습니다. 잠시 뒤 다시 해 주세요.");
    /* sb22: 알림톡(차곳간_인증번호) 먼저 → 안 되면 대체 문구 문자 · 코드가 비면 지금 문자 그대로 */
    await ataOrSms(to, "auth", { 인증번호: code, 유효시간: "5" }, "[차곳간 관리] 인증번호 " + code +
      "\n5분 안에 넣어 주세요. 본인이 아니면 비밀번호를 바로 바꿔 주세요.", { tpl: "hq_auth" });
    return { ok: true, need2: true, tick, to: to.slice(0, 3) + "****" + to.slice(-4) };
  },

  /* [표, 6자리] */
  hqLogin2: async (a, ctx) => {
    const tick = String(a[0] || "");
    const code = digits(a[1]);
    if (!tick || code.length !== 6) throw new Error("인증번호 6자리를 넣어 주세요");

    const { data: p } = await sb.from("wash_hq_otp").select("*").eq("tick", tick).maybeSingle();
    if (!p || String(p.kind || "login") !== "login") throw new Error("인증 시간이 지났습니다. 다시 로그인해 주세요");
    if (new Date(p.expires_at).getTime() < Date.now()) {
      await sb.from("wash_hq_otp").delete().eq("tick", tick);
      throw new Error("인증 시간이 지났습니다. 다시 로그인해 주세요");
    }
    if (Number(p.tries || 0) >= 5) {
      await sb.from("wash_hq_otp").delete().eq("tick", tick);
      throw new Error("인증번호를 여러 번 틀렸습니다. 처음부터 다시 해 주세요");
    }
    /* sb15(보안 W-M2): 맞혀 보기 전에 횟수를 먼저 «원자적으로» 하나 올립니다 (동시에 여러 번 보내도 5번까지만) */
    let tq: any = sb.from("wash_hq_otp").update({ tries: Number(p.tries || 0) + 1 }).eq("tick", tick);
    tq = p.tries == null ? tq.is("tries", null) : tq.eq("tries", Number(p.tries));
    const { data: tk } = await tq.select("tick");
    if (!tk || !tk.length) throw new Error("잠시 뒤 다시 넣어 주세요");
    if (!(await pwVerify(code, String(p.code_hash || "")))) throw new Error("인증번호가 맞지 않습니다");
    await sb.from("wash_hq_otp").delete().eq("tick", tick);

    const { data: u } = await sb.from("wash_users")
      .select("phone,shop,name,role,active").eq("phone", p.phone).maybeSingle();
    if (!u || !u.active || u.shop !== "ADMIN") throw new Error("본사 계정이 아닙니다");
    await sb.from("wash_users").update({ last_login: new Date().toISOString() }).eq("phone", u.phone);
    const sess = await makeSession(u.phone, "ADMIN", u.role, ctx, "admin");
    try {
      const to = (await hqCfg()).adminPhone;
      if (to) await noticeSms(to, "[차곳간] 관리에 로그인했습니다 (" +
        new Date(Date.now() + 9 * 3600000).toISOString().slice(5, 16).replace("T", " ") + ")");
    } catch (_) { /* */ }
    return { ok: true, shop: "ADMIN", role: u.role, who: u.name, key: sess.sid, expires: sess.exp };
  },

  login: async (a, ctx) => {
    const phone = normId(a[0]);
    const pw = String(a[1] || "");
    /* 연속으로 틀리면 잠깁니다 (맞으면 아래에서 횟수를 지웁니다) */
    if (!await rateOk("pwfail:" + phone, Number(env("LOGIN_MAX_FAIL", "10"))))
      throw new Error("비밀번호를 여러 번 틀렸습니다. 잠시 후 다시 시도하거나 비밀번호 찾기를 해 주세요");
    if (!await rateOk("login:ip:" + ((ctx && ctx.ip) || "0"), Number(env("LOGIN_MAX_IP", "100"))))
      throw new Error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요");
    const { data: u } = await sb.from("wash_users")
      .select("phone,shop,name,role,pw_hash,active").eq("phone", phone).maybeSingle();
    if (!u || !u.active) throw new Error("번호 또는 비밀번호가 맞지 않습니다");
    if (!(await pwVerify(pw, u.pw_hash))) throw new Error("번호 또는 비밀번호가 맞지 않습니다");
    try { await sb.from("wash_rate").delete().eq("key", "pwfail:" + phone); } catch (_) { /* */ }
    const { data: sh } = await sb.from("wash_shops")
      .select("shop,name,biz_kind,plan,trial_until,active").eq("shop", u.shop).maybeSingle();
    if (!sh) throw new Error("업체 정보를 찾지 못했습니다");
    if (sh.active === false) throw new Error("이용이 멈춰 있는 업체입니다. 차곳간으로 연락해 주세요");
    /* 이용기간이 끝나고 잠금 기간까지 지났으면 로그인 자체를 막습니다 */
    if (u.shop !== "ADMIN") {
      const lk: any = await lockState(u.shop, true);
      if (lk.state === "blocked") throw new Error(lockMsg(lk));
    }
    /* 본사 계정은 2단계 로그인(hqLogin)으로만 들어옵니다 */
    if (u.shop === "ADMIN") throw new Error("관리 주소에서 로그인해 주세요 (2단계 인증이 필요합니다)");
    await needWash(phone);                                   // sb2: 경비실 명단
    await checkDeviceRule(u.role, deviceKind((ctx && ctx.ua) || ""), String(sh.plan || ""));
    await sb.from("wash_users").update({ last_login: new Date().toISOString() }).eq("phone", phone);
    const s = await makeSession(phone, u.shop, u.role, ctx, String(sh.plan || ""));
    const lk2: any = await lockState(sh.shop);
    return { ok: true, shop: sh.shop, name: sh.name, bizKind: sh.biz_kind, plan: sh.plan,
             trialUntil: sh.trial_until, role: u.role, who: u.name, key: s.sid, expires: s.exp,
             device: s.kind, planInfo: await planInfo(sh.shop),
             lock: lk2.state === "ok" ? null : Object.assign({}, lk2, { msg: lockMsg(lk2) }) };
  },

  /* 홈페이지 공지사항 — 로그인 없이 볼 수 있습니다 — [] */
  noticePublic: async () => {
    const list = await noticeLive("home");
    return { ok: true, list: list.map(noticeOut) };
  },

  /* 로그아웃 — [임시열쇠] */
  logout: async (a) => {
    await sb.from("wash_sessions").delete().eq("sid", String(a[0] || ""));
    return { ok: true };
  },

  /* 화면 다시 열 때 확인 — [임시열쇠] */
  me: async (a) => {
    const s = await sessionOf(String(a[0] || ""));
    if (!s) throw new Error("로그인이 필요합니다");
    if (s.shop !== "ADMIN") await needWash(s.phone);         // sb2: 경비실 명단
    const { data: sh } = await sb.from("wash_shops")
      .select("shop,name,biz_kind,plan,trial_until").eq("shop", s.shop).maybeSingle();
    const { data: u } = await sb.from("wash_users").select("name,role").eq("phone", s.phone).maybeSingle();
    const lk: any = await lockState(s.shop);
    if (lk.state === "blocked") throw new Error(lockMsg(lk));
    return { ok: true, shop: s.shop, name: sh ? sh.name : "", bizKind: sh ? sh.biz_kind : "wash",
             plan: sh ? sh.plan : "", trialUntil: sh ? sh.trial_until : null,
             role: s.role, who: u ? u.name : "", planInfo: await planInfo(s.shop),
             lock: lk.state === "ok" ? null : Object.assign({}, lk, { msg: lockMsg(lk) }) };
  },

  /* 내 요금제 상태만 다시 받기 — [임시열쇠] */
  myPlan: async (a) => {
    const s = await sessionOf(String(a[0] || ""));
    if (!s) throw new Error("로그인이 필요합니다");
    return { ok: true, planInfo: await planInfo(s.shop) };
  },

  /* 충전 묶음 보기 — [종류(sms/tax)] */
  packList: async (a) => {
    const kind = String(a[0] || "sms");
    const { data, error } = await sb.from("wash_packs")
      .select("id,kind,qty,price,best").eq("kind", kind).eq("active", true).order("sort");
    dbCheck(error, "충전 묶음");
    return { ok: true, packs: data || [] };
  },

  /* 지금 가입이 어떻게 열려 있는지 — [] (회원가입 페이지가 물어봅니다) */
  joinMode: async () => {
    return {
      ok: true,
      open: await openSignupOn(),             // 누구나 가입 가능? (sb13: 관리 스위치)
      pay: env("PAY_READY", "") === "1",      // 결제 붙었나?
      termsVer: env("TERMS_VER", "2026-09-25"),
      privacyVer: env("PRIVACY_VER", "2026-09-25"),
      refundVer: env("REFUND_VER", "2026-09-25"),
    };
  },

  /* 요금제 보기 — [] */
  planList: async () => {
    const { data, error } = await sb.from("wash_plans")
      .select("code,name,price,seats,pc_max,staff_pc,sms_free,tax_free,features,sort").eq("active", true).order("sort");
    dbCheck(error, "요금제");
    return { ok: true, plans: data || [] };
  },

  /* 이 번호가 가입할 수 있는지 — [휴대폰] */
  joinCheck: async (a) => {
    const phone = normPhone(a[0]);
    const { data: u } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
    if (u) return { ok: true, can: false, why: "joined" };
    if (await openSignupOn()) return { ok: true, can: true, why: "open" };
    if (await paidOf(phone)) return { ok: true, can: true, why: "paid" };
    const iv = await inviteOf(phone);
    if (iv) return { ok: true, can: true, why: "invite", bizName: iv.biz_name || "" };
    return { ok: true, can: false, why: "none" };
  },

  /* 약관 동의 기록 — [휴대폰, {terms,privacy,refund}, 광고수신] */
  agree: async (a) => {
    const phone = normPhone(a[0]);
    const v = (a[1] || {}) as Record<string, string>;
    const { error } = await sb.from("wash_agreements").insert({
      phone,
      terms_ver: String(v.terms || ""),
      privacy_ver: String(v.privacy || ""),
      refund_ver: String(v.refund || ""),
      marketing: !!a[2],
      ua: String(a[3] || "").slice(0, 300),
    });
    dbCheck(error, "약관 동의 기록");
    return { ok: true };
  },

  /* 결제 시작 — [휴대폰, 상호, 요금제]
     PG(결제사)가 붙기 전까지는 «준비 중»으로 돌려보냅니다.
     붙은 뒤에는 여기서 결제창 정보를 만들어 내려주면 됩니다. */
  payStart: async (a) => {
    /* sb12: 로그인 전 결제는 하지 않아요 (총괄·결제 방 결정) — 가입(로그인) 먼저, 로그인한 결제 창구 payStart(["plan",0,0]) 로 */
    if (env("OLD_JOIN_PAY", "") !== "1")
      return { ok: true, ready: false, login: true, message: "가입(로그인)을 먼저 하신 뒤 결제해 주세요." };
    const phone = normPhone(a[0]);
    const bizName = String(a[1] || "").trim();
    const plan = String(a[2] || "");
    const { data: pl, error: e0 } = await sb.from("wash_plans").select("code,name,price").eq("code", plan).maybeSingle();
    dbCheck(e0, "요금제");
    if (!pl) throw new Error("요금제를 골라 주세요");
    const id = "ord_" + Date.now() + "_" + randHex(4);
    const { error: e1 } = await sb.from("wash_payments").insert({
      id, phone, biz_name: bizName, plan, amount: pl.price, status: "ready",
    });
    dbCheck(e1, "결제");
    if (env("PAY_READY", "") !== "1") {
      return { ok: true, ready: false, orderId: id,
               message: "결제 연동은 준비 중입니다. 차곳간에 연락 주시면 바로 열어 드립니다." };
    }
    // PG 붙인 뒤: 여기서 결제창에 넘길 정보를 만들어 돌려줍니다
    return { ok: true, ready: true, orderId: id, amount: pl.price, name: pl.name,
             pg: env("PAY_PG", ""), clientKey: env("PAY_CLIENT_KEY", "") };
  },

  /* 결제 상태 확인 — [주문번호] */
  payStatus: async (a) => {
    const id = String(a[0] || "");
    const { data } = await sb.from("wash_payments")
      .select("id,status").eq("id", id).maybeSingle();
    if (!data) throw new Error("결제 건을 찾지 못했습니다");
    return { ok: true, id: data.id, status: data.status };
  },

  /* 홈페이지 상담 신청 — [상호, 이름, 연락처, 메모, 업종] */
  contact: async (a, ctx) => {
    if (!await rateOk("contact:ip:" + ((ctx && ctx.ip) || "0"), Number(env("CONTACT_MAX_IP_DAY", "5"))))
      throw new Error("신청이 이미 접수되었습니다. 곧 연락드리겠습니다");
    const biz  = String(a[0] || "").trim().slice(0, 60);
    const who  = String(a[1] || "").trim().slice(0, 30);
    const tel  = String(a[2] || "").trim().slice(0, 20);
    const memo = String(a[3] || "").trim().slice(0, 500);
    const kind = String(a[4] || "").trim().slice(0, 30);
    if (!biz || !who || !tel) throw new Error("상호 · 이름 · 연락처를 넣어 주세요");
    const phone = digits(tel);
    if (phone.length < 9) throw new Error("연락처를 다시 확인해 주세요");

    /* 같은 번호로 하루 3번까지만 (장난 신청 막기) */
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await sb.from("wash_contact")
      .select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
    if ((count || 0) >= 3) throw new Error("신청이 이미 접수되었습니다. 곧 연락드리겠습니다");

    const { error } = await sb.from("wash_contact")
      .insert({ biz_name: biz, who, phone, memo, biz_kind: kind });
    if (error) throw new Error("접수하지 못했습니다: " + error.message);

    /* 운영자에게 알림 문자 (실패해도 접수는 유지) */
    try {
      const admin = digits(env("ADMIN_PHONE"));
      if (admin) {
        await solapi("POST", "/messages/v4/send-many/detail", { messages: [{
          to: admin, from: digits(OTP_FROM), type: "LMS", subject: "차곳간 상담신청",
          text: "[차곳간] 새 상담 신청\n업체: " + biz + "\n이름: " + who +
                "\n연락처: " + tel + (kind ? "\n업종: " + kind : "") +
                (memo ? "\n내용: " + memo.slice(0, 200) : ""),
        }] }, { tpl: "contact_hq" });
      }
    } catch (_) { /* 알림 실패는 무시 */ }
    return { ok: true };
  },

  /* 비밀번호 재설정 — [휴대폰, 새비밀번호] (문자 인증 먼저) */
  resetPw: async (a) => {
    const phone = normPhone(a[0]);
    const pw = String(a[1] || "");
    if (pw.length < 6) throw new Error("비밀번호는 6자 이상으로 해 주세요");
    await needVerified(phone);            // 인증이 오래되었으면 여기서 막힙니다
    const { data: u } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
    if (!u) throw new Error("가입되지 않은 번호입니다");
    await sb.from("wash_users").update({ pw_hash: await pwHash(pw) }).eq("phone", phone);
    await sb.from("wash_sessions").delete().eq("phone", phone);
    await sb.from("wash_otp").delete().eq("phone", phone);
    return { ok: true };
  },
};
/* ===================== 로그인 기능 끝 ===================== */

/* ===========================================================================
   대표가 우리 업체 직원의 "로그인 계정"을 만들고 관리하는 기능
   - 로그인(또는 예전 열쇠)으로 통과한 뒤에만 부를 수 있습니다
   - 같은 업체 안에서만 됩니다
   =========================================================================== */
function isOwnerSs(ss: any) { return !!ss && (ss.role === "owner" || ss.role === "admin"); }
function ownerOnly(ss: any) {
  if (!ss) throw new Error("다시 로그인해 주세요 (예전 주소로는 할 수 없습니다)");
  if (ss.role !== "owner" && ss.role !== "admin") throw new Error("대표만 할 수 있습니다");
}
/* 직원 명단·설정은 대표만 고칠 수 있습니다 (직원이 자기 권한을 올리지 못하게) */
function guardCols(ss: any, cols: string[]) {
  if (!cols.some((c) => OWNER_COLS.indexOf(c) >= 0)) return;
  if (!ss) throw new Error("다시 로그인해 주세요 (예전 주소로는 할 수 없습니다)");
  if (ss.role !== "owner" && ss.role !== "admin")
    throw new Error("직원 명단과 설정은 대표만 고칠 수 있습니다");
}
/* sb15(보안 화면 검사 S-M2): 장부(intakes)는 대표가 아니면 화면 규칙(canEdit·canSettle·출고)과 같게 서버에서도 막습니다.
   · 수금완료 기록은 못 고침 · 수금완료로 바꾸기·입금일(paidAt) 바꾸기 금지 · 들어온 날(createdAt) 바꾸기 금지
   · 출고된 기록은 상태를 못 바꾸고, 오늘 것이 아니면 금액·작업도 못 바꿈 (사진·메모 같은 것은 됨)
   · 입고 기록은 출고 처리(작업·금액 정리 포함)가 됨 — 밤새 둔 차도 내보낼 수 있게
   · 새 기록은 오늘 날짜만 · 지우기는 오늘 들어와 아직 «입고» 인 기록만
   시연(demo) 자료는 막지 않습니다. */
/* sb18(보안 낮음 · 2026-10-16 기록): 거래처(상사 companies · 딜러 dealers) — 직원은 «새로 넣기»만(입고 중 새 딜러),
   고치기·지우기는 매니저 이상. 시연(demo) 자료는 막지 않음 */
async function guardPartners(shop: string, ss: any, demo: boolean, rows: any[]) {
  const role = String((ss && ss.role) || "");
  if (demo || role === "owner" || role === "admin" || role === "manager") return;
  const list = (rows || []).filter((r: any) => r && (String(r.col) === "companies" || String(r.col) === "dealers") && r.id !== undefined && r.id !== null && r.id !== "");
  if (!list.length) return;
  const NO = "거래처 고치기·지우기는 매니저 이상만 할 수 있습니다. 새로 넣기는 됩니다.";
  for (const r of list) if (r.data === null || r.data === undefined) throw new Error(NO);
  for (const col of ["companies", "dealers"]) {
    const ids = list.filter((r: any) => String(r.col) === col).map((r: any) => String(r.id));
    if (!ids.length) continue;
    const { data: cur, error } = await sb.from("wash_docs").select("id").eq("shop", shop).eq("demo", false).eq("col", col).in("id", ids);
    if (error) throw new Error("거래처를 확인하지 못했습니다. 잠시 뒤 다시 해 주세요.");
    if ((cur || []).length) throw new Error(NO);
  }
}
async function guardIntakes(shop: string, ss: any, demo: boolean, rows: any[]) {
  const role = String((ss && ss.role) || "");
  if (demo || role === "owner" || role === "admin") return;
  const list = (rows || []).filter((r: any) => r && String(r.col) === "intakes" && r.id !== undefined && r.id !== null && r.id !== "");
  if (!list.length) return;
  const today = kstYmd();
  const dayOf = (v: unknown) => { const t = Date.parse(String(v || "")); return isNaN(t) ? "" : new Date(t + 9 * 3600e3).toISOString().slice(0, 10); };
  const stOf = (r: any) => String((r && r.status) || "입고");
  const ids = list.map((r: any) => String(r.id));
  const { data: cur, error } = await sb.from("wash_docs").select("id,data").eq("shop", shop).eq("demo", false)
    .eq("col", "intakes").in("id", ids);
  if (error) throw new Error("장부를 확인하지 못했습니다. 잠시 뒤 다시 해 주세요.");
  const old: Record<string, any> = {};
  (cur || []).forEach((d: any) => { old[String(d.id)] = d.data || null; });
  const NO = "지난 기록이나 정산된 기록은 대표님만 고칠 수 있습니다.";
  for (const r of list) {
    const o = old[String(r.id)];
    const n = r.data === null || r.data === undefined ? null : (typeof r.data === "string" ? JSON.parse(r.data) : r.data);
    if (!n) {                                                  // 지우기
      if (!o) continue;
      if (dayOf(o.createdAt) !== today || stOf(o) !== "입고" || o.paidAt) throw new Error("이 기록은 대표님만 지울 수 있습니다.");
      continue;
    }
    if (stOf(n) === "수금완료" || String(n.paidAt || "") !== String((o && o.paidAt) || ""))
      throw new Error("수금 처리는 대표님만 할 수 있습니다.");
    if (!o) {                                                  // 새 기록
      if (n.createdAt && dayOf(n.createdAt) !== today) throw new Error(NO);
      if (!n.createdAt) {                                      // 보안 낮음 ①: 날짜 없는 새 줄은 서버가 지금 시각을 채움
        n.createdAt = new Date().toISOString();
        r.data = n;
      }
      continue;
    }
    if (stOf(o) === "수금완료") throw new Error(NO);
    if (String(n.createdAt || "") !== String(o.createdAt || "")) throw new Error(NO);
    if (stOf(o) === "출고") {
      if (stOf(n) !== "출고") throw new Error("출고된 기록의 상태는 대표님만 바꿀 수 있습니다.");
      const same = (k: string) => JSON.stringify(n[k] ?? null) === JSON.stringify(o[k] ?? null);
      if (dayOf(o.createdAt) !== today && (Number(n.total || 0) !== Number(o.total || 0) ||
          !same("works") || !same("company") || !same("dealer") || !same("plate")))
        throw new Error(NO);
    }
  }
}
/* 이 번호가 방금 문자 인증을 마친 번호인지 확인합니다 (본인 번호가 맞는지 확인하는 안전장치) */
async function needVerified(phone: string) {
  const { data: o } = await sb.from("wash_otp").select("verified,expires_at").eq("phone", phone).maybeSingle();
  if (!o || !o.verified) throw new Error("휴대폰 인증을 먼저 해 주세요");
  if (new Date(o.expires_at).getTime() < Date.now() - 30 * 60000)
    throw new Error("인증이 오래되었습니다. 인증번호를 다시 받아 주세요");
}
/* 차곳간 본사(ADMIN) 자리에서만 할 수 있는 일 */
function hqOnly(shop: string, ss: any) {
  if (shop !== "ADMIN") throw new Error("차곳간 본사 계정으로 들어와야 합니다");
  if (!ss) throw new Error("다시 로그인해 주세요 (예전 주소로는 할 수 없습니다)");
  if (ss.shop !== "ADMIN") throw new Error("차곳간 본사 계정으로 들어와야 합니다");
  if (ss.role !== "admin" && ss.role !== "owner") throw new Error("본사 관리자만 할 수 있습니다");
}

/* ---------- 유지비 자동 읽기 ---------- */
const wonTxt = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원";

/* 솔라피 — 지금 남은 돈.
   솔라피는 돈에 해당하는 칸을 여러 개 내려줍니다. 그 중 하나가 이미 «합계» 라서
   전부 더하면 두 번 세어집니다. 그래서 가장 큰 값(=합계)을 씁니다.
   어떤 칸을 봤는지 그대로 적어 두어, 나중에 숫자가 이상하면 바로 알 수 있게 합니다. */
const MONEY_KEYS = /^(balance|point|cash|cashPoint|savedPoint|freePoint|deposit|total|sum)$/i;
async function readSolapi() {
  const r: any = await solapi("GET", "/cash/v1/balance");
  const found: { k: string; v: number }[] = [];
  for (const k of Object.keys(r || {})) {
    const v = Number((r as any)[k]);
    if (!MONEY_KEYS.test(k) || !isFinite(v)) continue;
    found.push({ k, v });
  }
  if (!found.length) throw new Error("솔라피가 잔액을 알려주지 않았습니다");
  const top = found.reduce((a, b) => (b.v > a.v ? b : a));
  const bal = Math.round(top.v);
  const how = found.length > 1
    ? " (" + found.map((x) => x.k + " " + Math.round(x.v).toLocaleString("ko-KR")).join(" · ") + ")"
    : "";
  return { balance: bal, note: "지금 남은 금액 " + wonTxt(bal) + how };
}

/* 도메인 만료일 — 열쇠가 필요 없는 공개 조회.
   .kr 조회 서버가 인증서를 온전히 안 내려줄 때가 있어 여러 길로 차례대로 시도합니다. */
async function readDomain(domain: string) {
  const d = String(domain || "").trim().toLowerCase();
  if (!d) throw new Error("도메인 이름을 «조회값» 칸에 적어 주세요 (예: cgg.co.kr)");
  const tries = [
    "https://rdap.nic.or.kr/domain/" + encodeURIComponent(d),
    "http://rdap.nic.or.kr/domain/" + encodeURIComponent(d),
    "https://rdap.org/domain/" + encodeURIComponent(d),
    "https://www.rdap.net/domain/" + encodeURIComponent(d),
  ];
  let last = "";
  for (const url of tries) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/rdap+json" }, redirect: "follow",
      });
      if (res.status >= 300) { last = "응답 " + res.status; continue; }
      const j: any = await res.json();
      const ev = (j.events || []).filter((e: any) =>
        /expiration/i.test(String(e.eventAction || "")))[0];
      if (!ev || !ev.eventDate) { last = "만료일이 없는 응답"; continue; }
      const day = String(ev.eventDate).slice(0, 10);
      return { nextDue: day, note: d + " 만료일 " + day };
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error("도메인 조회처에 닿지 못했습니다. 가비아에서 만료일을 보고 직접 적어 주세요 (" +
    last.slice(0, 60) + ")");
}

/* 앤트로픽 — 이번 달 쓴 금액 (남은 돈은 앤트로픽이 알려주지 않습니다) */
async function readAnthropic() {
  const key = env("ANTHROPIC_ADMIN_KEY");
  if (!key) throw new Error("ANTHROPIC_ADMIN_KEY 가 없습니다. 개인 계정은 Admin 키를 만들 수 없어 자동 읽기가 안 됩니다 — 직접 적어 주세요");
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const url = "https://api.anthropic.com/v1/organizations/cost_report?starting_at=" +
    encodeURIComponent(from) + "&limit=31";
  const res = await fetch(url, {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  });
  const txt = await res.text();
  if (res.status >= 300) throw new Error("앤트로픽 " + res.status + ": " + txt.slice(0, 120));
  let j: any = {}; try { j = JSON.parse(txt); } catch (_) { /* */ }
  let usd = 0;
  (j.data || []).forEach((b: any) => (b.results || []).forEach((r: any) => {
    usd += Number(r.amount ?? r.cost ?? 0);
  }));
  return { note: "이번 달 쓴 금액 $" + usd.toFixed(2) + " (남은 돈은 앤트로픽이 알려주지 않습니다)" };
}

/* 클라우드플레어 — 요금제와 다음 결제일 */
async function readCloudflare() {
  const tok = env("CF_API_TOKEN"), acc = env("CF_ACCOUNT_ID");
  if (!tok || !acc) throw new Error("CF_API_TOKEN · CF_ACCOUNT_ID 를 Secrets 에 넣어 주세요");
  const res = await fetch("https://api.cloudflare.com/client/v4/accounts/" + acc + "/subscriptions",
    { headers: { Authorization: "Bearer " + tok } });
  const j: any = await res.json().catch(() => ({}));
  if (!j || j.success === false) {
    const m = ((j && j.errors) || [])[0];
    throw new Error("클라우드플레어: " + ((m && m.message) || res.status));
  }
  const subs = (j.result || []).filter((x: any) => String(x.state || "") !== "Cancelled");
  if (!subs.length) return { note: "지금은 무료 요금제 — 나가는 금액이 없습니다" };
  const s1 = subs[0];
  const price = Number(s1.price || 0), cur = String(s1.currency || "USD");
  const end = String(s1.current_period_end || "").slice(0, 10);
  return {
    nextDue: end || undefined,
    note: (s1.rate_plan && s1.rate_plan.public_name ? s1.rate_plan.public_name + " · " : "") +
      (price ? price + " " + cur + "/" + (s1.frequency || "monthly") : "무료") +
      (end ? " · 다음 결제 " + end : ""),
  };
}

/* 수파베이스 — 어떤 요금제를 쓰고 있는지 */
function gbTxtSrv(b: number) {
  b = Number(b) || 0;
  if (b >= 1073741824) return (b / 1073741824).toFixed(2) + " GB";
  if (b >= 1048576) return (b / 1048576).toFixed(1) + " MB";
  return Math.round(b / 1024) + " KB";
}
async function readSupabase() {
  /* 수파베이스는 SUPABASE_ 로 시작하는 이름을 못 쓰게 막아서 SB_PAT 로 넣습니다 */
  const pat = env("SB_PAT") || env("SUPABASE_PAT");
  if (!pat) throw new Error("SB_PAT 를 Secrets 에 넣어 주세요 (SUPABASE_ 로 시작하는 이름은 못 씁니다)");
  const hdr = { Authorization: "Bearer " + pat };
  const gj = async (u: string) => {
    const r = await fetch(u, { headers: hdr });
    const t = await r.text();
    if (r.status >= 300) throw new Error("수파베이스 " + r.status + ": " + t.slice(0, 110));
    try { return JSON.parse(t); } catch (_) { return null; }
  };

  const orgs = await gj("https://api.supabase.com/v1/organizations");
  const list = Array.isArray(orgs) ? orgs : [];
  if (!list.length) throw new Error("조직을 찾지 못했습니다 (열쇠 권한을 확인해 주세요)");
  const orgName = String(list[0].name || "");

  /* 요금제 — 수파베이스가 알려주면 적고, 안 알려주면 그냥 넘어갑니다 (예전에 «?» 로 보이던 곳) */
  let plan = "";
  for (const o of list) {
    const slug = String((o as any).slug || (o as any).id || "");
    if (!slug) continue;
    try {
      const b: any = await gj("https://api.supabase.com/v1/organizations/" + slug + "/billing/subscription");
      const p = b && (b.plan || b.tier);
      const nm = p && (typeof p === "object" ? (p.name || p.id) : p);
      if (nm) { plan = String(nm); break; }
    } catch (_) { /* 이 열쇠로는 요금제를 못 봅니다 — 넘어갑니다 */ }
  }

  /* 프로젝트가 살아 있는지 */
  let projTxt = "";
  try {
    const ps = await gj("https://api.supabase.com/v1/projects");
    const arr = Array.isArray(ps) ? ps : [];
    projTxt = arr.slice(0, 3).map((p: any) => {
      const st = String(p.status || "");
      const ok = /ACTIVE_HEALTHY/i.test(st) ? "정상" : (st || "상태 모름");
      return String(p.name || "") + " " + ok;
    }).join(" · ");
  } catch (_) { /* */ }

  /* 우리가 직접 잰 용량 (사용량 SQL 이 있어야 나옵니다) */
  let sizeTxt = "";
  try {
    const { data } = await sb.rpc("wash_usage");
    if (data) sizeTxt = "자료 " + gbTxtSrv(Number((data as any).db_bytes || 0)) +
      " · 사진 " + gbTxtSrv(Number((data as any).file_bytes || 0));
  } catch (_) { /* */ }

  const note = [orgName + (plan ? (" — " + plan) : ""), projTxt, sizeTxt].filter(Boolean).join(" · ");
  return { note: note || orgName };
}

/* 한 줄을 실제로 읽어옵니다 */
async function readService(v: any): Promise<{ balance?: number; nextDue?: string; note: string }> {
  const code = String(v.code || "");
  if (code === "solapi") return await readSolapi();
  if (code === "anthropic") return await readAnthropic();
  if (code === "cloudflare") return await readCloudflare();
  if (code === "supabase") return await readSupabase();
  if (/^gabia/.test(code) || v.ref) return await readDomain(String(v.ref || ""));
  throw new Error("이 서비스는 아직 자동으로 읽을 수 없습니다");
}

const UFN: Record<string, (shop: string, a: any[], ss: any) => Promise<unknown>> = {

  /* ===== 관리 (차곳간 본사 전용) ===== */

  /* 요약 — [] */
  hqSummary: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data: shops, error: e1 } = await sb.from("wash_shops").select("shop,name,plan,active,created_at");
    dbCheck(e1, "업체");
    const { data: users, error: e2 } = await sb.from("wash_users").select("phone,shop,role,active,last_login");
    dbCheck(e2, "계정");
    const { data: pays } = await sb.from("wash_payments").select("id,amount,status,paid_at,shop");
    const { data: invs } = await sb.from("wash_invites").select("phone,used_at,expires_at");
    const { data: exps } = await sb.from("wash_expenses").select("amount,paid_at");
    const now = Date.now();
    const ym = new Date().toISOString().slice(0, 7);
    const real = (shops || []).filter((x) => x.shop !== "ADMIN");
    const paid = (pays || []).filter((p) => p.status === "paid");
    return {
      ok: true,
      shops: real.length,
      shopsOff: real.filter((x) => x.active === false).length,
      users: (users || []).filter((u) => u.shop !== "ADMIN").length,
      usersOn: (users || []).filter((u) => u.shop !== "ADMIN" && u.active !== false).length,
      active7: (users || []).filter((u) => u.last_login &&
        now - new Date(u.last_login).getTime() < 7 * 864e5).length,
      waitInvite: (invs || []).filter((i) => !i.used_at &&
        (!i.expires_at || new Date(i.expires_at).getTime() > now)).length,
      unpaid: (pays || []).filter((p) => p.status === "ready").length,
      salesMonth: paid.filter((p) => String(p.paid_at || "").slice(0, 7) === ym)
        .reduce((a, b) => a + (b.amount || 0), 0),
      salesAll: paid.reduce((a, b) => a + (b.amount || 0), 0),
      expMonth: (exps || []).filter((e) => String(e.paid_at || "").slice(0, 7) === ym)
        .reduce((a, b) => a + Number(b.amount || 0), 0),
      expAll: (exps || []).reduce((a, b) => a + Number(b.amount || 0), 0),
    };
  },

  /* 업체 목록 — [] */
  hqShops: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data: shops, error } = await sb.from("wash_shops")
      .select("shop,name,biz_kind,plan,active,owner_phone,trial_until,paid_until,memo,created_at," +
              "biz_no,ceo,addr,upte,jongmok,tax_email,tax_phone," +
              "paid_at,cycle_start,sms_used,tax_used,sms_paid,tax_paid,spare_used,spare_max," +
              "trial_sms,trial_tax,sms_from,trial_start,trial_days,exp_sms," +
              "lock_days,open_until,open_memo");
    dbCheck(error, "업체");
    const hq = await hqCfg();
    const { data: users } = await sb.from("wash_users").select("shop,role,active,last_login");
    const cnt: Record<string, { staff: number; last: string }> = {};
    (users || []).forEach((u) => {
      const c = cnt[u.shop] || (cnt[u.shop] = { staff: 0, last: "" });
      if (u.active !== false) c.staff++;
      if (u.last_login && u.last_login > c.last) c.last = u.last_login;
    });
    return {
      ok: true,
      shops: (shops || []).map((s2: any) => {
        const isTrial = !s2.plan || s2.plan === "trial";
        const lk: any = lockOf(s2, hq);
        return Object.assign({}, s2, {
          staff: (cnt[s2.shop] || { staff: 0 }).staff,
          lastLogin: (cnt[s2.shop] || { last: "" }).last,
          isTrial,
          endAt: String((isTrial ? s2.trial_until : s2.paid_until) || "").slice(0, 10),
          lockState: lk.state, lockUntil: lk.lockUntil || "", blockFrom: lk.blockFrom || "",
          delAt: lk.delAt || "", opened: !!lk.opened,
        });
      }),
    };
  },

  /* 업체 고치기 — [업체코드, {name, plan, active, memo, paidUntil}] */
  hqShopSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const v = (a[1] || {}) as Record<string, unknown>;
    if (!code) throw new Error("업체를 고르세요");
    const patch: Record<string, unknown> = {};
    if (v.name !== undefined) patch.name = String(v.name).trim();
    if (v.plan !== undefined) {
      patch.plan = String(v.plan);
      /* 요금제가 바뀌면 이번 주기 사용량을 0으로 되돌리고 오늘부터 30일을 셉니다
         (체험에서 유료로 올릴 때 체험 때 쓴 건수가 남아 막히는 일이 없게) */
      const { data: cur0 } = await sb.from("wash_shops").select("plan").eq("shop", code).maybeSingle();
      if (!cur0 || String(cur0.plan || "") !== String(v.plan)) {
        patch.sms_used = 0; patch.tax_used = 0; patch.spare_used = 0;
        patch.warn_at = null; patch.stop_warn_at = null;
        if (String(v.plan) !== "trial" && v.paidAt === undefined) patch.cycle_start = new Date().toISOString().slice(0, 10);
      }
    }
    if (v.memo !== undefined) patch.memo = String(v.memo);
    if (v.active !== undefined) patch.active = !!v.active;
    if (v.paidUntil !== undefined) patch.paid_until = v.paidUntil ? String(v.paidUntil) : null;
    if (v.openUntil !== undefined) patch.open_until = v.openUntil ? String(v.openUntil).slice(0, 10) : null;
    if (v.lockDays  !== undefined) patch.lock_days  =
      (v.lockDays === "" || v.lockDays === null) ? null : Math.min(180, Math.max(0, Number(v.lockDays) || 0));
    /* 세금계산서용 사업자 정보 */
    if (v.bizNo    !== undefined) patch.biz_no    = digits(v.bizNo);
    if (v.ceo      !== undefined) patch.ceo       = String(v.ceo).trim();
    if (v.addr     !== undefined) patch.addr      = String(v.addr).trim();
    if (v.upte     !== undefined) patch.upte      = String(v.upte).trim();
    if (v.jongmok  !== undefined) patch.jongmok   = String(v.jongmok).trim();
    if (v.taxEmail !== undefined) patch.tax_email = String(v.taxEmail).trim();
    if (v.taxPhone !== undefined) patch.tax_phone = digits(v.taxPhone);
    /* 결제일 — 이 날부터 30일이 시작되고 이번 주기 사용량을 0으로 되돌립니다 */
    if (v.paidAt !== undefined) {
      const d = String(v.paidAt || "").slice(0, 10);
      patch.paid_at = d || null;
      patch.cycle_start = d || null;
      if (d) { patch.sms_used = 0; patch.tax_used = 0; patch.warn_at = null; patch.stop_warn_at = null; }
    }
    if (v.spareMax !== undefined) patch.spare_max = Math.max(0, Number(v.spareMax) || 0);
    if (v.trialSms !== undefined) patch.trial_sms = Math.max(0, Number(v.trialSms) || 0);
    if (v.trialTax !== undefined) patch.trial_tax = Math.max(0, Number(v.trialTax) || 0);
    if (v.trialUntil !== undefined) patch.trial_until = v.trialUntil ? String(v.trialUntil) : null;
    /* 체험 기간 — 시작일 + 며칠 을 적으면 끝나는 날을 자동으로 셉니다 */
    if (v.trialStart !== undefined) patch.trial_start = v.trialStart ? String(v.trialStart).slice(0, 10) : null;
    if (v.trialDays  !== undefined) patch.trial_days  = v.trialDays === null ? null : Math.max(1, Number(v.trialDays) || 0);
    if (v.trialDays !== undefined || v.trialStart !== undefined) {
      const { data: cur1 } = await sb.from("wash_shops").select("trial_start,trial_days,created_at").eq("shop", code).maybeSingle();
      const st = String(patch.trial_start ?? (cur1 && (cur1.trial_start || String(cur1.created_at || "").slice(0, 10))) ?? "").slice(0, 10);
      const dd = Number(patch.trial_days ?? (cur1 && cur1.trial_days) ?? 0);
      if (st && dd > 0 && v.trialUntil === undefined) {
        const t = new Date(st + "T00:00:00Z");
        t.setUTCDate(t.getUTCDate() + dd);
        patch.trial_until = t.toISOString().slice(0, 10);
      }
    }
    if (v.expSms !== undefined) patch.exp_sms = !!v.expSms;
    if (v.smsFrom !== undefined) patch.sms_from = digits(v.smsFrom) || null;
    if (v.spareReset) { patch.spare_used = 0; patch.warn_at = null; patch.stop_warn_at = null; }
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_shops").update(patch).eq("shop", code);
    dbCheck(error, "업체");
    /* 이용을 멈추면 그 업체의 로그인 열쇠를 전부 지웁니다 */
    if (v.active === false) await sb.from("wash_sessions").delete().eq("shop", code);
    lockClear(code);
    return { ok: true };
  },

  /* 업체 지우기 — [업체코드, 확인용으로 다시 적은 업체명] */
  hqShopDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    if (code === "ADMIN") throw new Error("차곳간 본사 자리는 지울 수 없습니다");
    const { data: sh } = await sb.from("wash_shops").select("shop,name").eq("shop", code).maybeSingle();
    if (!sh) throw new Error("업체를 찾지 못했습니다");
    if (String(a[1] || "").trim() !== String(sh.name || "").trim())
      throw new Error("업체명이 다릅니다. 지우려면 업체명을 정확히 적어 주세요");
    await sb.from("wash_sessions").delete().eq("shop", code);
    await sb.from("wash_users").delete().eq("shop", code);
    await sb.from("wash_docs").delete().eq("shop", code);
    const { error } = await sb.from("wash_shops").delete().eq("shop", code);
    dbCheck(error, "업체");
    return { ok: true };
  },

  /* 모든 계정 목록 — [] */
  hqUsers: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data: users, error } = await sb.from("wash_users")
      .select("phone,shop,name,role,active,created_at,last_login");
    dbCheck(error, "계정");
    const { data: shops } = await sb.from("wash_shops")
      .select("shop,name,active,plan,trial_until,paid_until,trial_days,trial_start");
    const nm: Record<string, any> = {};
    (shops || []).forEach((s2: any) => {
      const isTrial = !s2.plan || s2.plan === "trial";
      nm[s2.shop] = {
        name: s2.name, on: s2.active !== false, plan: s2.plan,
        trial: isTrial,
        endAt: String((isTrial ? s2.trial_until : s2.paid_until) || "").slice(0, 10),
        trialDays: s2.trial_days == null ? null : Number(s2.trial_days),
        trialStart: String(s2.trial_start || "").slice(0, 10),
      };
    });
    return {
      ok: true,
      users: (users || []).map((u) => {
        const m = nm[u.shop] || {};
        return Object.assign({}, u, {
          shopName: m.name || "", shopOn: m.on !== false, shopPlan: m.plan || "",
          endAt: m.endAt || "", isTrial: !!m.trial,
          trialDays: m.trialDays == null ? null : m.trialDays,
        });
      }),
    };
  },

  /* 계정 고치기 — [휴대폰, {name, role, active}] */
  hqUserSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const phone = String(a[0] || "");
    await hqOldGuard(ss, phone, "userSave");
    const v = (a[1] || {}) as Record<string, unknown>;
    const { data: u } = await sb.from("wash_users").select("phone,shop,role").eq("phone", phone).maybeSingle();
    if (!u) throw new Error("계정을 찾지 못했습니다");
    const patch: Record<string, unknown> = {};
    if (v.name !== undefined) patch.name = String(v.name).trim();
    if (v.role !== undefined) {
      const r = String(v.role);
      if (r !== "owner" && r !== "staff" && r !== "admin" && r !== "manager")
        throw new Error("권한 값이 올바르지 않습니다");
      if (u.shop !== "ADMIN" && r === "admin") throw new Error("시연 관리자는 본사 계정만 가능합니다");
      patch.role = r;
    }
    if (v.active !== undefined) patch.active = !!v.active;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_users").update(patch).eq("phone", phone);
    dbCheck(error, "계정");
    if (v.active === false || (patch.role !== undefined && patch.role !== u.role))   // sb2: 직급 바뀌면 로그인 끊기
      await sb.from("wash_sessions").delete().eq("phone", phone);
    return { ok: true };
  },

  /* 비밀번호 바꾸기 — [휴대폰, 새 비밀번호] */
  /* sb15(보안 W-M3): 새 비밀번호를 응답에 돌려주지 않습니다. 비워 보내면 서버가 만들어 그 계정 휴대폰으로만 보냅니다. */
  hqUserPw: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const phone = String(a[0] || "");
    const made1 = !a[1];
    const pw = String(a[1] || tempPw(10));
    if (pw.length < 6) throw new Error("비밀번호는 6자 이상으로 해 주세요");
    const { data: u } = await sb.from("wash_users").select("phone").eq("phone", phone).maybeSingle();
    if (!u) throw new Error("계정을 찾지 못했습니다");
    await hqOldGuard(ss, phone, "userPw");
    if (made1) {                                             // 보안 낮음 ⑤: 문자가 먼저 나가야 바꿈
      try { await noticeSms(phone, "[차곳간] 임시 비밀번호: " + pw + "\n로그인한 뒤 바로 바꿔 주세요. 요청하지 않았다면 010-9559-3663 으로 알려 주세요.", { tpl: "temp_pw" }); }
      catch (_) { throw new Error("임시 비밀번호 문자를 보내지 못해 바꾸지 않았습니다. 다시 해 주세요."); }
    }
    const { error } = await sb.from("wash_users").update({ pw_hash: await pwHash(pw) }).eq("phone", phone);
    dbCheck(error, "계정");
    await sb.from("wash_sessions").delete().eq("phone", phone);
    return { ok: true, sent: made1 };
  },

  /* 계정 지우기 — [휴대폰] */
  hqUserDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const phone = String(a[0] || "");
    if (ss && ss.phone === phone) throw new Error("지금 쓰는 계정은 지울 수 없습니다");
    await hqOldGuard(ss, phone, "userDel");
    const { data: u } = await sb.from("wash_users").select("phone,shop,role").eq("phone", phone).maybeSingle();
    if (!u) throw new Error("계정을 찾지 못했습니다");
    if (u.role === "owner") {
      const { data: os } = await sb.from("wash_users").select("phone").eq("shop", u.shop).eq("role", "owner");
      if (!os || os.length <= 1) throw new Error("그 업체의 마지막 대표 계정입니다. 지울 수 없습니다");
    }
    await sb.from("wash_sessions").delete().eq("phone", phone);
    const { error } = await sb.from("wash_users").delete().eq("phone", phone);
    dbCheck(error, "계정");
    return { ok: true };
  },

  /* 결제 목록 — [] */
  hqPayments: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_payments")
      .select("id,phone,biz_name,plan,amount,status,shop,period,method,memo,created_at,paid_at")
      .order("created_at", { ascending: false }).limit(1000);
    dbCheck(error, "결제");
    const { data: shops } = await sb.from("wash_shops").select("shop,name");
    const nm: Record<string, string> = {};
    (shops || []).forEach((s2) => { nm[s2.shop] = s2.name; });
    /* sb24: 카드 결제가 환불(부분 포함)됐는지 — 원래 결제 줄은 «paid» 로 남으므로 주문을 보고 알려 줌 */
    const refunded = await refundedSet((data || []).map((p: any) => String(p.id)));
    return { ok: true, payments: (data || []).map((p) =>
      Object.assign({}, p, { shopName: nm[p.shop || ""] || p.biz_name || "", refunded: refunded.has(String(p.id)) })) };
  },

  /* 청구 만들기 — [업체코드, 요금제, 금액, 기간, 메모] */
  hqPayAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const { data: sh } = await sb.from("wash_shops").select("shop,name,owner_phone").eq("shop", code).maybeSingle();
    if (!sh) throw new Error("업체를 고르세요");
    const id = "ord_" + Date.now() + "_" + randHex(4);
    const { error } = await sb.from("wash_payments").insert({
      id, phone: sh.owner_phone || "", biz_name: sh.name, shop: code,
      plan: String(a[1] || ""), amount: Number(a[2] || 0) || 0,
      period: String(a[3] || ""), memo: String(a[4] || ""), status: "ready",
    });
    dbCheck(error, "결제");
    return { ok: true, id };
  },

  /* 결제 상태 바꾸기 — [주문번호, 상태, 받은 방법] */
  hqPayMark: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const id = String(a[0] || "");
    const st = String(a[1] || "");
    if (["ready", "paid", "failed", "canceled", "refunded"].indexOf(st) < 0)
      throw new Error("상태 값이 올바르지 않습니다");
    const patch: Record<string, unknown> = { status: st };
    if (st === "paid") { patch.paid_at = new Date().toISOString(); patch.method = String(a[2] || "수동 처리"); }
    else patch.paid_at = null;
    const { error } = await sb.from("wash_payments").update(patch).eq("id", id);
    dbCheck(error, "결제");
    /* sb6: 본사가 「입금됨」으로 바꾸면 업체 대표에게 결제완료 알림톡 (확정본: 카드 결제 또는 입금 확인이 끝났을 때) */
    if (st === "paid") {
      try {
        const { data: pmt } = await sb.from("wash_payments").select("shop,amount,plan").eq("id", id).maybeSingle();
        const { data: o } = pmt && pmt.shop
          ? await sb.from("wash_shops").select("name,owner_phone,plan,paid_until").eq("shop", pmt.shop).maybeSingle() : { data: null };
        /* sb8: 요금제 결제 건일 때만 결제완료 (캐시 충전 입금 등 요금제 코드가 아닌 건은 «요금제·이용 기한» 이 틀리게 찍히므로 안 보냄) */
        const pPlan = String((pmt && pmt.plan) || "");
        const isPlanPay = !!pPlan && !!(await planOf(pPlan));
        if (pmt && o && o.owner_phone && isPlanPay)
          await noticeAta(String(o.owner_phone), "pay_done", { 업체명: o.name || pmt.shop, 금액: won(pmt.amount),
            요금제: await planName(pPlan), 결제수단: String(a[2] || "계좌이체"),
            이용기한: korDay(String(o.paid_until || "").slice(0, 10)) }, false, { shop: String(pmt.shop || ""), ref: "wash:입금확인" });
      } catch (_) { /* */ }
    }
    return { ok: true };
  },

  /* 결제 건 지우기 — [주문번호] */
  hqPayDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_payments").delete().eq("id", String(a[0] || ""));
    dbCheck(error, "결제");
    return { ok: true };
  },

  /* 요금제 목록 (꺼진 것 포함) — [] */
  hqPlans: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_plans")
      .select("code,name,price,seats,pc_max,sms_free,tax_free,features,active,sort,staff_pc").order("sort");
    dbCheck(error, "요금제");
    return { ok: true, plans: data || [] };
  },

  /* 요금제 고치기 — [코드, {name, price, seats, pcMax, staffPc, active}] */
  hqPlanSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const v = (a[1] || {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (v.name !== undefined) patch.name = String(v.name).trim();
    if (v.price !== undefined) patch.price = Math.max(0, Number(v.price) || 0);
    if (v.seats !== undefined) patch.seats = Math.max(0, Number(v.seats) || 0);
    if (v.pcMax !== undefined) patch.pc_max = Math.max(0, Number(v.pcMax) || 0);
    if (v.smsFree !== undefined) patch.sms_free = Math.max(0, Number(v.smsFree) || 0);
    if (v.taxFree !== undefined) patch.tax_free = Math.max(0, Number(v.taxFree) || 0);
    if (v.active !== undefined) patch.active = !!v.active;
    if (v.staffPc !== undefined) patch.staff_pc = !!v.staffPc;
    planCache = { at: 0, map: {} };
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_plans").update(patch).eq("code", code);
    dbCheck(error, "요금제");
    return { ok: true };
  },

  /* 요금제 여러 개 한 번에 저장 — [[{code,name,price,seats,pcMax,staffPc,active}, ...]] */
  hqPlanSaveAll: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const list = Array.isArray(a[0]) ? a[0] : [];
    let done = 0;
    for (const v of list) {
      const code = String((v && v.code) || "");
      if (!code) continue;
      const { error } = await sb.from("wash_plans").update({
        name: String(v.name || "").trim(),
        price: Math.max(0, Number(v.price) || 0),
        seats: Math.max(0, Number(v.seats) || 0),
        pc_max: Math.max(0, Number(v.pcMax) || 0),
        sms_free: Math.max(0, Number(v.smsFree) || 0),
        tax_free: Math.max(0, Number(v.taxFree) || 0),
        staff_pc: !!v.staffPc,
        active: !!v.active,
      }).eq("code", code);
      dbCheck(error, "요금제");
      done++;
    }
    planCache = { at: 0, map: {} };
    return { ok: true, done };
  },

  /* 지금 로그인되어 있는 기기 목록 — [] */
  hqSessions: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const now = new Date().toISOString();
    const { data, error } = await sb.from("wash_sessions")
      .select("sid,phone,shop,role,kind,ua,created_at,last_seen,expires_at")
      .gt("expires_at", now).order("last_seen", { ascending: false }).limit(500);
    dbCheck(error, "로그인 기기");
    const { data: shops } = await sb.from("wash_shops").select("shop,name");
    const { data: users } = await sb.from("wash_users").select("phone,name");
    const sn: Record<string, string> = {}; (shops || []).forEach((x) => { sn[x.shop] = x.name; });
    const un: Record<string, string> = {}; (users || []).forEach((x) => { un[x.phone] = x.name; });
    /* 열쇠 원본(sid)은 내려주지 않습니다 — 뒤 10자리만 보내고 그걸로 내보냅니다 */
    return { ok: true, sessions: (data || []).map((x) => {
      const o: any = Object.assign({}, x, { shopName: sn[x.shop] || x.shop, who: un[x.phone] || x.phone });
      o.sid = String(x.sid || "").slice(-10);
      return o;
    }) };
  },

  /* 기기 내보내기 (강제 로그아웃) — [열쇠] */
  hqSessionKill: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const tail = String(a[0] || "");
    if (tail.length < 8 || !/^[0-9a-f]+$/i.test(tail)) throw new Error("기기를 고르지 못했습니다");   // sb2: % _ 같은 와일드카드 거름
    if (ss && String(ss.sid || "").slice(-10) === tail) throw new Error("지금 쓰고 있는 기기는 내보낼 수 없습니다");
    const { error } = await sb.from("wash_sessions").delete().like("sid", "%" + tail);
    dbCheck(error, "로그인 기기");
    return { ok: true };
  },

  /* 업체 요금제 상태 한 덩어리 — [업체코드] */
  hqPlanInfo: async (shop, a, ss) => {
    hqOnly(shop, ss);
    return { ok: true, planInfo: await planInfo(String(a[0] || "")) };
  },

  /* 충전 넣어주기 — [업체코드, {kind, qty, amount, memo}] */
  hqTopup: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const v = (a[1] || {}) as Record<string, any>;
    const kind = v.kind === "tax" ? "tax" : "sms";
    const qty = Math.max(0, Number(v.qty) || 0);
    if (!code) throw new Error("업체를 고르세요");
    if (!qty) throw new Error("건수를 적어 주세요");
    const { data: sh } = await sb.from("wash_shops")
      .select("shop,sms_paid,tax_paid").eq("shop", code).maybeSingle();
    if (!sh) throw new Error("업체를 찾지 못했습니다");
    const patch: Record<string, unknown> = kind === "tax"
      ? { tax_paid: Number(sh.tax_paid || 0) + qty }
      : { sms_paid: Number(sh.sms_paid || 0) + qty, warn_at: null, stop_warn_at: null };
    const { error } = await sb.from("wash_shops").update(patch).eq("shop", code);
    dbCheck(error, "업체");
    await sb.from("wash_topups").insert({
      shop: code, kind, qty, amount: Math.max(0, Number(v.amount) || 0),
      who: "본사", memo: String(v.memo || ""),
    });
    return { ok: true, kind, qty };
  },

  /* 충전 기록 — [] */
  hqTopups: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_topups").select("*")
      .order("at", { ascending: false }).limit(300);
    dbCheck(error, "충전 기록");
    const { data: shops } = await sb.from("wash_shops").select("shop,name");
    const sn: Record<string, string> = {}; (shops || []).forEach((x) => { sn[x.shop] = x.name; });
    return { ok: true, topups: (data || []).map((x) => Object.assign({}, x, { shopName: sn[x.shop] || x.shop })) };
  },

  /* 충전 묶음 목록 — [] */
  hqPacks: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_packs").select("*").order("kind").order("sort");
    dbCheck(error, "충전 묶음");
    return { ok: true, packs: data || [] };
  },

  /* 충전 묶음 저장 — [[{id,kind,qty,price,best,active}, ...]] */
  hqPackSaveAll: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const list = Array.isArray(a[0]) ? a[0] : [];
    let done = 0;
    for (const v of list) {
      const id = Number(v && v.id);
      if (!id) continue;
      const { error } = await sb.from("wash_packs").update({
        qty: Math.max(0, Number(v.qty) || 0),
        price: Math.max(0, Number(v.price) || 0),
        best: !!v.best, active: !!v.active,
      }).eq("id", id);
      dbCheck(error, "충전 묶음");
      done++;
    }
    return { ok: true, done };
  },

  /* 충전 묶음 새로 넣기 — [{kind, qty, price}] */
  hqPackAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const { error } = await sb.from("wash_packs").insert({
      kind: v.kind === "tax" ? "tax" : "sms",
      qty: Math.max(0, Number(v.qty) || 0),
      price: Math.max(0, Number(v.price) || 0),
      best: false, active: true, sort: 99,
    });
    dbCheck(error, "충전 묶음");
    return { ok: true };
  },

  /* 충전 묶음 지우기 — [번호] */
  hqPackDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_packs").delete().eq("id", Number(a[0] || 0));
    dbCheck(error, "충전 묶음");
    return { ok: true };
  },

  /* ===== 유지비 (운영 서비스) ===== */


  /* 운영 서비스 목록 — [] */
  hqServices: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_services").select("*").order("sort");
    dbCheck(error, "운영 서비스");
    return { ok: true, services: data || [] };
  },

  /* 연결된 곳들의 상태를 한 번에 받아옵니다 — [코드(선택, 한 곳만 할 때)] */
  hqSvcRefresh: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const only = String(a[0] || "");
    const { data, error } = await sb.from("wash_services").select("*").order("sort");
    dbCheck(error, "운영 서비스");
    const rows = (data || []).filter((v: any) =>
      v.active !== false && v.auto && (!only || v.code === only));
    const ok: string[] = [], bad: string[] = [];
    for (const v of rows) {
      const at = new Date().toISOString();
      try {
        const r = await readService(v);
        const patch: Record<string, unknown> = { auto_note: r.note, auto_at: at, auto_err: null };
        if (r.balance !== undefined) { patch.balance = r.balance; patch.balance_at = at; }
        if (r.nextDue) patch.next_due = r.nextDue;
        await sb.from("wash_services").update(patch).eq("code", v.code);
        ok.push(v.name + " — " + r.note);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        await sb.from("wash_services").update({ auto_err: m, auto_at: at }).eq("code", v.code);
        bad.push(v.name + " — " + m);
      }
    }
    return { ok: true, done: ok, failed: bad, tried: rows.length };
  },

  /* 운영 서비스 고치기 — [코드, {...}] */
  hqSvcSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const v = (a[1] || {}) as Record<string, any>;
    if (!code) throw new Error("서비스를 고르세요");
    const patch: Record<string, unknown> = {};
    if (v.name     !== undefined) patch.name     = String(v.name).trim();
    if (v.what     !== undefined) patch.what     = String(v.what).trim();
    if (v.url      !== undefined) patch.url      = String(v.url).trim();
    if (v.kind     !== undefined) patch.kind     = String(v.kind);
    if (v.balance  !== undefined) patch.balance  = Math.max(0, Number(v.balance) || 0);
    if (v.balance  !== undefined) patch.balance_at = new Date().toISOString();
    if (v.nextDue  !== undefined) patch.next_due = v.nextDue ? String(v.nextDue) : null;
    if (v.cost     !== undefined) patch.cost     = Math.max(0, Number(v.cost) || 0);
    if (v.minBal   !== undefined) patch.min_bal  = Math.max(0, Number(v.minBal) || 0);
    if (v.warnDays !== undefined) patch.warn_days = Math.max(0, Number(v.warnDays) || 0);
    if (v.memo     !== undefined) patch.memo     = String(v.memo);
    if (v.ref      !== undefined) patch.ref      = String(v.ref).trim();
    if (v.auto     !== undefined) patch.auto     = !!v.auto;
    if (v.active   !== undefined) patch.active   = !!v.active;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_services").update(patch).eq("code", code);
    dbCheck(error, "운영 서비스");
    return { ok: true };
  },

  /* 운영 서비스 새로 넣기 — [{code, name, ...}] */
  hqSvcAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const code = String(v.code || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!code) throw new Error("영문 코드를 적어 주세요 (예: naver)");
    if (!String(v.name || "").trim()) throw new Error("이름을 적어 주세요");
    const { data: dup } = await sb.from("wash_services").select("code").eq("code", code).maybeSingle();
    if (dup) throw new Error("이미 있는 코드입니다");
    const { error } = await sb.from("wash_services").insert({
      code, name: String(v.name).trim(), what: String(v.what || "").trim(),
      url: String(v.url || "").trim(), kind: String(v.kind || "charge"),
      balance: Math.max(0, Number(v.balance) || 0),
      next_due: v.nextDue ? String(v.nextDue) : null,
      cost: Math.max(0, Number(v.cost) || 0),
      min_bal: Math.max(0, Number(v.minBal) || 0),
      warn_days: Math.max(0, Number(v.warnDays) || 14),
      memo: String(v.memo || ""), ref: String(v.ref || "").trim(),
      auto: !!v.auto, active: true, sort: 99,
    });
    dbCheck(error, "운영 서비스");
    return { ok: true, code };
  },

  /* 운영 서비스 지우기 — [코드] */
  hqSvcDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_services").delete().eq("code", String(a[0] || ""));
    dbCheck(error, "운영 서비스");
    return { ok: true };
  },

  /* ===== 지출 장부 ===== */

  /* 지출 목록 — [] */
  hqExpenses: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_expenses").select("*")
      .order("paid_at", { ascending: false }).limit(500);
    dbCheck(error, "지출");
    return { ok: true, expenses: data || [] };
  },

  /* 지출 넣기 — [{svc, name, amount, paidAt, period, memo}] */
  hqExpenseAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const amount = Math.max(0, Number(v.amount) || 0);
    if (!amount) throw new Error("금액을 적어 주세요");
    const name = String(v.name || "").trim();
    if (!name) throw new Error("무엇에 쓴 금액인지 적어 주세요");
    const paidAt = String(v.paidAt || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    const { error } = await sb.from("wash_expenses").insert({
      svc: String(v.svc || ""), name, amount, paid_at: paidAt,
      period: String(v.period || paidAt.slice(0, 7)), memo: String(v.memo || ""),
    });
    dbCheck(error, "지출");
    /* 충전식이면 남은 돈을 그만큼 올려 둡니다.
       단, 「자동으로 읽기」가 켜진 곳은 서버가 직접 읽어온 값이 맞으므로 건드리지 않습니다
       (건드리면 두 번 더해져 숫자가 틀어집니다). */
    if (v.svc && v.addBalance) {
      const { data: sv } = await sb.from("wash_services")
        .select("balance,kind,auto,name").eq("code", String(v.svc)).maybeSingle();
      if (sv && sv.auto) {
        return { ok: true, skipped: true,
          note: sv.name + " 는 자동으로 읽는 곳이라 남은 돈은 그대로 두었습니다. " +
                "「연결된 곳 상태 새로 받기」를 누르면 실제 잔액으로 맞춰집니다" };
      }
      if (sv && sv.kind === "charge") {
        await sb.from("wash_services").update({
          balance: Number(sv.balance || 0) + amount, balance_at: new Date().toISOString(),
        }).eq("code", String(v.svc));
      }
    }
    return { ok: true };
  },

  /* 지출 지우기 — [번호] */
  hqExpenseDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_expenses").delete().eq("id", Number(a[0] || 0));
    dbCheck(error, "지출");
    return { ok: true };
  },

  /* ===== 정산 (달마다 번 돈 · 쓴 돈) ===== */

  /* 월별 정산 — [연도(선택)] */
  hqSettle: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const year = String(a[0] || new Date().getFullYear());
    const { data: pays } = await sb.from("wash_payments")
      .select("amount,status,paid_at,shop,biz_name,plan");
    const { data: exps } = await sb.from("wash_expenses").select("amount,paid_at,svc,name");
    const rows: Record<string, { ym: string; income: number; expense: number; cnt: number }> = {};
    const box = (ym: string) => rows[ym] || (rows[ym] = { ym, income: 0, expense: 0, cnt: 0 });
    (pays || []).filter((p) => p.status === "paid").forEach((p) => {
      const ym = String(p.paid_at || "").slice(0, 7);
      if (!ym || ym.slice(0, 4) !== year) return;
      const b = box(ym); b.income += Number(p.amount || 0); b.cnt++;
    });
    (exps || []).forEach((e) => {
      const ym = String(e.paid_at || "").slice(0, 7);
      if (!ym || ym.slice(0, 4) !== year) return;
      box(ym).expense += Number(e.amount || 0);
    });
    const list = Object.values(rows).sort((x, y) => (x.ym < y.ym ? 1 : -1))
      .map((r) => Object.assign({}, r, { profit: r.income - r.expense }));
    return {
      ok: true, year, months: list,
      income: list.reduce((a, b) => a + b.income, 0),
      expense: list.reduce((a, b) => a + b.expense, 0),
    };
  },

  /* ===== 세금계산서 (본사 → 업체) ===== */

  /* 본사(공급자) 정보 읽기 — [] */
  hqInfo: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_hq").select("*").eq("id", 1).maybeSingle();
    dbCheck(error, "본사 정보");
    return { ok: true, hq: data || {}, hasPopbill: !!env("POPBILL_LINKID") && !!env("POPBILL_SECRET") };
  },

  /* ===== 카드 결제 (본사) ===== */

  /* 설정·주문 목록 — [] */
  hqPg: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    let orders: any[] = [];
    try {
      const r = await sb.from("wash_pay_order").select("*")
        .order("created_at", { ascending: false }).limit(300);
      orders = r.data || [];
    } catch (_) { /* */ }
    const { data: shops } = await sb.from("wash_shops").select("shop,name").neq("shop", "ADMIN");
    const nm: Record<string, string> = {};
    (shops || []).forEach((x: any) => { nm[x.shop] = x.name; });
    return {
      ok: true, on: cfg.pgOn, provider: cfg.pgProvider, clientKey: cfg.pgClientKey,
      fee: cfg.pgFee, note: cfg.pgNote, hasSecret: !!pgSecret(), orders, names: nm,
    };
  },

  /* 설정 저장 — [{on, provider, clientKey, fee, note}] */
  hqPgSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const patch: Record<string, unknown> = {};
    if (v.on        !== undefined) {
      if (v.on && !pgSecret())
        throw new Error("먼저 Secrets 에 TOSS_SECRET_KEY 를 넣어 주세요");
      patch.pg_on = !!v.on;
    }
    if (v.provider  !== undefined) patch.pg_provider   = String(v.provider || "toss");
    if (v.clientKey !== undefined) patch.pg_client_key = String(v.clientKey).trim();
    if (v.fee       !== undefined) patch.pg_fee        = Math.max(0, Number(v.fee) || 0);
    if (v.note      !== undefined) patch.pg_note       = String(v.note);
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_hq").update(patch).eq("id", 1);
    dbCheck(error, "카드 결제 설정");
    hqCfgClear();
    return { ok: true };
  },

  /* 결제 취소(환불) — [주문번호, 사유] */
  /* sb10: 환불 얼마까지 — [주문번호] → {max, suggest, leftDays|unusedCash} */
  hqPgQuote: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { data: od } = await sb.from("wash_pay_order").select("*").eq("order_id", String(a[0] || "")).maybeSingle();
    if (!od) throw new Error("주문을 찾지 못했습니다");
    if (od.status !== "paid") throw new Error("결제가 끝난 주문만 환불할 수 있습니다");
    return Object.assign({ ok: true }, await refundQuote(od));
  },
  /* 카드 환불 — [주문번호, 사유, (금액 · 비우면 전부)]
     sb10: paid→canceled 를 한 번에 바꾼 쪽만 환불(두 번 환불 막기) · 금액은 서버가 셈한 한도까지 ·
     월 요금은 환불 비율만큼 이용기간 빼기 · 캐시 충전은 안 쓴 캐시만(마이너스 안 됨) */
  hqPgCancel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const orderId = String(a[0] || "");
    const why = String(a[1] || "고객 요청").slice(0, 100);
    const { data: od } = await sb.from("wash_pay_order").select("*").eq("order_id", orderId).maybeSingle();
    if (!od) throw new Error("주문을 찾지 못했습니다");
    if (od.status !== "paid") throw new Error("결제가 끝난 주문만 취소할 수 있습니다");
    if (!od.payment_key) throw new Error("카드사 열쇠가 없습니다");
    const q = await refundQuote(od);
    const want = (a[2] === undefined || a[2] === null || a[2] === "") ? q.max : Math.round(Number(a[2]));
    if (!(want > 0)) throw new Error("환불할 금액이 없습니다" + (q.kind === "cash" ? " (남은 캐시가 없습니다)" : ""));
    if (want > q.max)
      throw new Error("환불은 " + wonTxt2(q.max) + "까지만 됩니다" + (q.kind === "cash" ? " (안 쓴 캐시만)" : ""));
    const nowIso = new Date().toISOString();
    const { data: got } = await sb.from("wash_pay_order").update({ status: "canceled", canceled_at: nowIso, fail_msg: why })
      .eq("order_id", orderId).eq("status", "paid").select("order_id");
    if (!got || !got.length) throw new Error("이미 환불했거나 다른 곳에서 환불하는 중입니다");
    let r: any = null;
    try {
      r = await tossCall("/v1/payments/" + encodeURIComponent(String(od.payment_key)) + "/cancel",
        want < q.amount ? { cancelReason: why, cancelAmount: want } : { cancelReason: why },
        "POST", { idem: "cancel-" + orderId, billing: !!od.bill_date });
    } catch (e) {
      await sb.from("wash_pay_order").update({ status: "paid", canceled_at: null, fail_msg: null })
        .eq("order_id", orderId).eq("status", "canceled");
      throw e;
    }
    await sb.from("wash_pay_order").update({
      raw: Object.assign({}, (od.raw && typeof od.raw === "object") ? od.raw : {},
        { cancel: { amount: want, at: nowIso, why, status: String((r && r.status) || "") } }),
    }).eq("order_id", orderId);
    const who = "hq:" + String((ss && (ss.who || ss.phone)) || "?");
    let note = "";
    if (String(od.kind) === "plan") {
      /* 이용기간을 «되돌리지» 않고 환불 비율만큼 «뺍니다» (그사이 다른 결제로 늘어난 기간은 그대로) */
      const days = Math.min(CYCLE_DAYS, Math.round(CYCLE_DAYS * want / Math.max(1, q.amount)));
      const { data: sh } = await sb.from("wash_shops").select("paid_until").eq("shop", od.shop).maybeSingle();
      const pu = ymd10(sh && sh.paid_until);
      if (pu && days > 0) await sb.from("wash_shops").update({ paid_until: ymdAdd(pu, -days) }).eq("shop", od.shop);
      note = "이용기간 -" + days + "일";
    } else {
      const supply = Math.min(Math.round(want / 1.1), await cashBal(String(od.shop)));
      try {
        const c: any = supply > 0 ? await cashTake(String(od.shop), supply, "adjust", 1, "카드 환불 " + orderId, who, 0) : { ok: true };
        note = (c && c.ok === false) ? "캐시 빼기 못 함(모자람)" : "캐시 -" + wonTxt2(supply);
      } catch (_) { note = "캐시 빼기 못 함"; }
    }
    try {
      await sb.from("wash_payments").insert({ shop: od.shop, amount: want, status: "refunded",
        paid_at: nowIso.slice(0, 10), period: od.period || "", memo: "카드 환불 " + orderId + " · " + note + " · " + why });
    } catch (_) { /* */ }
    try {
      const admin = (await hqCfg()).adminPhone;
      if (admin) await noticeSms(admin, "[차곳간] " + String(od.shop) + " 카드 환불 " + wonTxt2(want) + " (" + note + ")");
    } catch (_) { /* */ }
    return { ok: true, amount: want, note };
  },

  /* sb10: 자동 결제 켜기·끄기 스위치 (본사) — [true|false] */
  /* ===== sb12: 관리 한곳에서 — 결제 결과 모으기 (설계 14 · 결제 방 03) ===== */
  hqPayResults: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const from = String(a[0] || "").slice(0, 10) || ymdAdd(kstYmd(), -90);
    const to = String(a[1] || "").slice(0, 10) || kstYmd();
    const want = String(a[2] || "");
    const fromIso = from + "T00:00:00+09:00", toIso = ymdAdd(to, 1) + "T00:00:00+09:00";
    const { data: shops } = await sb.from("wash_shops").select("shop,name");
    const sn: Record<string, string> = {}; (shops || []).forEach((x: any) => (sn[x.shop] = x.name));
    let offices: Record<string, string> = {};
    try { const { data: of } = await sb.from("check_office").select("code,name"); (of || []).forEach((o: any) => (offices[o.code] = o.name)); }
    catch (_) { offices = {}; }
    const rows: any[] = [];
    const { data: ords } = await sb.from("wash_pay_order")
      .select("order_id,shop,kind,amount,use_cash,status,period,method,who,created_at,paid_at,canceled_at")
      .gte("created_at", fromIso).lt("created_at", toIso).limit(3000);
    const cardIds: Record<string, number> = {};
    /* 첫 결제인지 연장인지 — 그 업체의 월 요금 결제 중 가장 이른 것이 첫 결제 */
    const firstPlan: Record<string, string> = {};
    try {
      const { data: pp } = await sb.from("wash_pay_order").select("order_id,shop,paid_at").eq("kind", "plan").eq("status", "paid")
        .order("paid_at", { ascending: true }).limit(20000);
      (pp || []).forEach((o: any) => { if (!firstPlan[o.shop]) firstPlan[o.shop] = String(o.order_id); });
    } catch (_) { /* */ }
    (ords || []).forEach((o: any) => {
      cardIds[String(o.order_id)] = 1;
      const who = String(o.who || "");
      let tag = "워시", from2 = "워시", office = "";
      if (who === "billing") tag = "자동 결제";
      else if (who.startsWith("check:")) { office = who.slice(6); tag = "체크 · " + (offices[office] || office); from2 = "체크"; }
      else if (who.startsWith("join:")) { tag = "홈페이지"; from2 = "홈페이지"; }
      rows.push({ tag, at: String(o.paid_at || o.created_at || ""), shop: o.shop, shopName: sn[o.shop] || o.shop,
        kind: o.kind === "plan" ? "월 요금" : "캐시", method: String(o.method || "카드"), amount: Number(o.amount) || 0,
        useCash: Number(o.use_cash) || 0, status: String(o.status || ""), period: String(o.period || ""),
        orderId: String(o.order_id), from: from2, office,
        first: o.kind === "plan" && o.status === "paid" ? firstPlan[o.shop] === String(o.order_id) : undefined });
    });
    const { data: led } = await sb.from("wash_payments").select("*").gte("created_at", fromIso).lt("created_at", toIso).limit(3000);
    (led || []).forEach((p: any) => {
      if (p.order_id && cardIds[String(p.order_id)]) return;               // 카드 주문 줄과 같은 건
      const refund = String(p.status) === "refunded";
      const homepage = !p.shop && !!p.phone;
      rows.push({ tag: refund ? "환불" : homepage ? "홈페이지" : "계좌 입금", at: String(p.paid_at || p.created_at || ""),
        shop: p.shop || "", shopName: sn[p.shop] || p.biz_name || "", kind: p.plan ? "월 요금" : "", method: String(p.method || (refund ? "카드 환불" : "계좌이체")),
        amount: Number(p.amount) || 0, status: String(p.status || ""), period: String(p.period || ""),
        orderId: String(p.order_id || p.id || ""), from: homepage ? "홈페이지" : "관리" });
    });
    /* 딜러 청구서 — 업체가 딜러에게 받는 돈(차곳간을 거치지 않음) → 상태와 참고 금액만 · 딜러 번호 없음 */
    try {
      const { data: vb } = await sb.from("wash_viewcode").select("shop,data,created_at,kind")
        .eq("kind", "bill").gte("created_at", fromIso).lt("created_at", toIso).limit(3000);
      (vb || []).forEach((v: any) => {
        const b = v.data || {}; const amt = Math.round(Number(b.amount) || 0), paid = Math.round(Number(b.paid) || 0);
        rows.push({ tag: "딜러 청구서", at: String(v.created_at || ""), shop: v.shop, shopName: sn[v.shop] || v.shop,
          kind: "청구서", dealer: String(b.name || ""), month: String(b.month || ""), amount: amt, refOnly: true,
          status: amt > 0 && paid >= amt ? "입금 확인됨" : "입금 전" });
      });
    } catch (_) { /* */ }
    const list = rows.filter((r) => !want || r.tag === want || String(r.tag).startsWith(want))
      .sort((x, y) => (String(y.at) > String(x.at) ? 1 : -1));
    const sum = list.filter((r) => !r.refOnly && (r.status === "paid")).reduce((t, r) => t + (Number(r.amount) || 0), 0);
    const refunds = list.filter((r) => r.tag === "환불").reduce((t, r) => t + (Number(r.amount) || 0), 0);
    /* sb13 고침: 지금 자동 결제를 켜 둔 업체 수 (기간과 상관없이 지금 기준 · 관리 결제 숫자 넷째 칸) */
    let billingShops = 0;
    try { const { data: pb } = await sb.from("pay_billing").select("shop").eq("status", "on"); billingShops = (pb || []).length; }
    catch (_) { billingShops = 0; }
    return { ok: true, from, to, list, sum, refunds, billingShops };
  },

  /* ===== sb12: 관리 한곳에서 — 계정 (휴대폰 번호 11자리로만) ===== */
  hqPerson: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const phone = fullPhone(a[0]);
    const hourV = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 13);
    if (!await rateOk("hqview:" + digits(ss && ss.phone) + ":" + hourV, Number(env("HQ_VIEW_MAX_HOUR", "120"))))
      throw new Error("한 시간에 볼 수 있는 횟수를 넘었습니다. 잠시 뒤 다시 해 주세요");   // sb13(보안 낮음 · 선택)
    const p = await personOf(phone);
    await hqAuditLog(ss, "view", phone, "", "ok");
    return Object.assign({ ok: true, phone }, p);
  },
  hqPersonAct: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const phone = fullPhone(a[0]);
    const act = String(a[1] || ""), target = String(a[2] || "");
    if (["stop", "resume", "pwReset", "unlock", "kick", "grant", "revoke"].indexOf(act) < 0) throw new Error("동작을 고르세요");
    if (ss && digits(ss.phone) === phone) throw new Error("지금 로그인한 본인 번호는 여기서 바꿀 수 없습니다");
    const { data: adm } = await sb.from("wash_users").select("shop").eq("phone", phone).eq("shop", "ADMIN").maybeSingle();
    if (adm) throw new Error("본사 계정은 여기서 바꿀 수 없습니다");
    /* 본사 한 명당 시간당 30번 — 넘으면 멈추고 대표님께 문자 한 번 */
    const hour = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 13);
    if (!await rateOk("hqact:" + digits(ss && ss.phone) + ":" + hour, Number(env("HQ_ACT_MAX_HOUR", "30")))) {
      if (await rateOk("hqact-warn:" + digits(ss && ss.phone) + ":" + hour, 1)) {
        try { const admin = (await hqCfg()).adminPhone; if (admin) await noticeSms(admin, "[차곳간] 관리 계정 바꾸기가 한 시간에 너무 많아 멈췄습니다 (" + digits(ss && ss.phone).slice(-4) + ")"); }
        catch (_) { /* */ }
      }
      await hqAuditLog(ss, act, phone, target, "too many");
      throw new Error("한 시간에 바꿀 수 있는 횟수를 넘었습니다. 잠시 뒤 다시 해 주세요");
    }
    /* sb13(보안 낮음): 기록을 먼저 남기고, 남기지 못하면 바꾸지 않음 */
    if (!await hqAuditLog(ss, act, phone, target, "try")) throw new Error("기록을 남기지 못해 멈췄습니다 (SQL 08 확인)");
    let r: any;
    try { r = await personAct(phone, act, target, a[3] === true); }
    catch (e) { await hqAuditLog(ss, act, phone, target, "error: " + (e instanceof Error ? e.message : "").slice(0, 80)); throw e; }
    await hqAuditLog(ss, act, phone, target, r.confirm ? "confirm" : "ok", r.note ? { note: r.note } : undefined);
    if (!r.confirm) {
      /* 바뀐 당사자에게 안내 (정보성) */
      const what: Record<string, string> = { stop: "이용 멈춤", resume: "이용 다시 열기", pwReset: "비밀번호 초기화", unlock: "로그인 잠금 풀기",
        kick: "접속 끊기", grant: "이용 권한 열기", revoke: "이용 권한 닫기" };
      try { await noticeSms(phone, "[차곳간] 관리자가 회원님 계정의 «" + what[act] + "»을 처리했습니다. 본인이 요청하지 않았다면 010-9559-3663 으로 알려 주세요."); }
      catch (_) { /* */ }
    }
    return Object.assign({ ok: true }, r);
  },
  /* 기록 보기 — 지우거나 고치는 창구는 없습니다 */
  hqAudit: async (shop, a, ss) => {
    hqOnly(shop, ss);
    let q = sb.from("hq_audit").select("at,who,sid_tail,ip,ua,action,target_phone,product,result,detail").order("at", { ascending: false }).limit(300);
    const ph = digits(String(a[0] || ""));
    if (ph) q = q.eq("target_phone", ph);
    const { data, error } = await q;
    if (error) throw new Error("기록 표가 없습니다 (SQL 08 을 먼저 실행해 주세요)");
    return { ok: true, list: data || [] };
  },
  /* sb15: 사업자번호 확인 목록 — 워시 업체 + 체크 검사소 (확인 안 된 것 먼저) — [] */
  hqBizList: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data: ws, error } = await sb.from("wash_shops").select("shop,name,biz_no,biz_ok_at,biz_set_at,owner_phone,ceo").neq("biz_no", "").limit(2000);
    if (error) return { ok: true, list: [], need: "SQL 11 을 먼저 실행해 주세요" };
    const { data: co } = await sb.from("check_office").select("code,name,biz_no,biz_ok_at,biz_set_at,owner_name").neq("biz_no", "").limit(500);
    const kt = (v: unknown) => { const t = Date.parse(String(v || "")); return isNaN(t) ? "" : new Date(t + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " "); };
    const mask = (p: unknown) => { const d = digits(p); return d.length >= 10 ? d.slice(0, 3) + "-****-" + d.slice(-4) : ""; };
    const list = [
      ...(ws || []).filter((r: any) => digits(r.biz_no)).map((r: any) => ({ product: "워시", code: r.shop, name: String(r.name || ""), bizNo: digits(r.biz_no),
        ceo: String(r.ceo || ""), owner: mask(r.owner_phone), ok: r.biz_ok_at !== null, okAt: kt(r.biz_ok_at), setAt: kt(r.biz_set_at) })),
      ...(co || []).filter((r: any) => digits(r.biz_no)).map((r: any) => ({ product: "체크", code: r.code, name: String(r.name || ""), bizNo: digits(r.biz_no),
        ceo: String(r.owner_name || ""), owner: "", ok: r.biz_ok_at !== null, okAt: kt(r.biz_ok_at), setAt: kt(r.biz_set_at) })),
    ];
    list.sort((x, y) => Number(x.ok) - Number(y.ok));
    return { ok: true, list };
  },
  /* sb15: 사업자번호 확인 — [제품("워시"|"체크"), 코드, 확인(true) | 취소(false)] · 기록 먼저 · 다른 곳과 겹치면 거절 */
  hqBizOk: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const prod = String(a[0] || ""), code = String(a[1] || "").trim(), on = a[2] !== false;
    if (!code || (prod !== "워시" && prod !== "체크")) throw new Error("어느 업체인지 골라 주세요");
    const tbl = prod === "워시" ? "wash_shops" : "check_office", key = prod === "워시" ? "shop" : "code";
    const { data: row } = await sb.from(tbl).select("biz_no").eq(key, code).maybeSingle();
    if (!row || !digits(row.biz_no)) throw new Error("사업자번호가 없는 곳입니다");
    if (on) {
      if (prod === "워시" && await bizTaken(String(row.biz_no), code)) throw new Error(BIZ_TAKEN_MSG);
      if (prod === "체크") {
        const n = digits(row.biz_no);
        const { data: others } = await sb.from("check_office").select("code,biz_no,popbill_corp").neq("code", code);
        const { data: wsx } = await sb.from("wash_shops").select("biz_no").ilike("biz_no", "%" + n.slice(-5) + "%");
        if ((others || []).some((r: any) => digits(r.biz_no) === n || digits(r.popbill_corp) === n) || (wsx || []).some((r: any) => digits(r.biz_no) === n))
          throw new Error(BIZ_TAKEN_MSG);
      }
    }
    if (!await hqAuditLog(ss, on ? "bizOk" : "bizUndo", "", prod === "워시" ? "wash" : "check", "try", { code })) throw new Error("기록을 남기지 못해 멈췄습니다 (SQL 08 확인)");
    const { error } = await sb.from(tbl).update({ biz_ok_at: on ? new Date().toISOString() : null }).eq(key, code);
    if (error) throw new Error("칸이 없습니다 (SQL 11 을 먼저 실행해 주세요)");
    await hqAuditLog(ss, on ? "bizOk" : "bizUndo", "", prod === "워시" ? "wash" : "check", "ok", { code });
    return { ok: true };
  },
  /* sb15: 발송 기록 보기 — [시작일 "YYYY-MM-DD", 끝일 "YYYY-MM-DD", {product, shop, tpl, result}]
     받는 번호는 가린 모양(010-****-1234)만 · 본문 없음(템플릿 키와 변수 이름만) */
  hqSendLog: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const ymd = (v: unknown, d: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : d;
    const to = ymd(a[1], kstYmd()), from = ymd(a[0], ymdAdd(to, -6));
    if (ymdGap(from, to) > 92) throw new Error("한 번에 92일까지 볼 수 있습니다. 날짜를 줄여 주세요.");
    const f: any = (a[2] && typeof a[2] === "object") ? a[2] : {};
    let q = sb.from("cgg_sendlog").select("at,product,shop,tpl,to_mask,via,final_via,result,msg_id,err,vars,ref,status_code")
      .gte("at", new Date(Date.parse(from + "T00:00:00+09:00")).toISOString())
      .lt("at", new Date(Date.parse(ymdAdd(to, 1) + "T00:00:00+09:00")).toISOString())
      .order("at", { ascending: false }).limit(3000);
    const PROD: Record<string, string> = { wash: "워시", check: "체크", dealer: "딜러", cgg: "통합" };
    const RES: Record<string, string> = { ata: "알림톡 도착", sms: "문자 대체", sent: "문자 도착", fail: "실패", wait: "대기", skip: "안 보냄" };
    const back = (m: Record<string, string>, v: unknown) => { const k = Object.keys(m).find((x) => m[x] === String(v)); return k || String(v || ""); };
    if (f.product) q = q.eq("product", back(PROD, f.product));
    if (f.shop) q = q.eq("shop", String(f.shop).toUpperCase().slice(0, 40));
    if (f.tpl) q = q.eq("tpl", String(f.tpl).slice(0, 40));
    if (f.result) q = q.eq("result", back(RES, f.result));
    const { data, error } = await q;
    if (error) return { ok: true, list: [], need: "SQL 11 을 먼저 실행해 주세요" };
    const rows: any[] = data || [];
    const names: Record<string, string> = {};
    const ws = [...new Set(rows.filter((r) => r.product !== "check" && r.shop).map((r) => String(r.shop)))];
    const cs = [...new Set(rows.filter((r) => r.product === "check" && r.shop).map((r) => String(r.shop)))];
    try {
      if (ws.length) { const { data: x } = await sb.from("wash_shops").select("shop,name").in("shop", ws); (x || []).forEach((r: any) => (names["w:" + r.shop] = String(r.name || ""))); }
      if (cs.length) { const { data: x } = await sb.from("check_office").select("code,name").in("code", cs); (x || []).forEach((r: any) => (names["c:" + r.code] = String(r.name || ""))); }
    } catch (_) { /* 이름은 없어도 됨 */ }
    return { ok: true, from, to, list: rows.map((r) => ({
      at: new Date(Date.parse(String(r.at)) + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " "),
      product: PROD[String(r.product)] || String(r.product), shop: String(r.shop || ""),
      shopName: names[(r.product === "check" ? "c:" : "w:") + r.shop] || "",
      tpl: String(r.tpl || ""), to: String(r.to_mask || ""), via: String(r.final_via || r.via || ""),
      result: RES[String(r.result)] || String(r.result || ""), msgId: String(r.msg_id || ""),
      err: String(r.err || ""), vars: r.vars || [], ref: String(r.ref || ""), code: String(r.status_code || ""),
    })) };
  },
  /* sb15: 이번 달(또는 고른 달) 발송 건수·대략 요금 — [ "YYYY-MM" ] · 90일 지난 달은 달 합계표에서 */
  hqSendSum: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const ym = /^\d{4}-\d{2}$/.test(String(a[0] || "")) ? String(a[0]) : kstYmd().slice(0, 7);
    const start = new Date(Date.parse(ym + "-01T00:00:00+09:00"));
    const yy = Number(ym.slice(0, 4)), mm = Number(ym.slice(5, 7));
    const nym = mm === 12 ? (yy + 1) + "-01" : yy + "-" + String(mm + 1).padStart(2, "0");
    const end = new Date(Date.parse(nym + "-01T00:00:00+09:00"));
    const acc: Record<string, any> = {};
    const add = (product: string, tpl: string, result: string, via: string, n: number) => {
      const k = product + "|" + tpl;
      const r = acc[k] || (acc[k] = { product, tpl, ata: 0, sms: 0, sent: 0, fail: 0, wait: 0, skip: 0, cost: 0 });
      if (r[result] === undefined) return;
      r[result] += n;
      if (result !== "fail" && result !== "wait" && result !== "skip") r.cost += n * (SEND_PRICE[via] || SEND_PRICE[result === "ata" ? "ata" : "sms"]);
    };
    let page = 0;
    for (;;) {
      const { data, error } = await sb.from("cgg_sendlog").select("product,tpl,result,via,final_via")
        .gte("at", start.toISOString()).lt("at", end.toISOString()).range(page * 1000, page * 1000 + 999);
      if (error) return { ok: true, ym, rows: [], need: "SQL 11 을 먼저 실행해 주세요" };
      (data || []).forEach((r: any) => add(String(r.product), String(r.tpl), String(r.result), String(r.final_via || r.via), 1));
      if (!data || data.length < 1000 || ++page >= 50) break;
    }
    try {
      const { data: mo } = await sb.from("cgg_sendlog_month").select("product,tpl,result,via,n").eq("ym", ym);
      (mo || []).forEach((r: any) => add(String(r.product), String(r.tpl), String(r.result), String(r.via), Number(r.n) || 0));
    } catch (_) { /* */ }
    const rows = Object.values(acc).sort((x: any, y: any) => (y.ata + y.sms + y.sent) - (x.ata + x.sms + x.sent));
    const total = rows.reduce((t: any, r: any) => { ["ata", "sms", "sent", "fail", "wait", "skip", "cost"].forEach((k) => (t[k] += r[k])); return t; },
      { ata: 0, sms: 0, sent: 0, fail: 0, wait: 0, skip: 0, cost: 0 });
    return { ok: true, ym, rows, total, price: SEND_PRICE, note: "요금은 대략(부가세 별도)이에요. 정확한 금액은 솔라피 청구서로 맞춰요." };
  },
  /* sb15: 발송 최종 결과 지금 채우기 (관리에서 누를 때) — [] */
  hqSendCheck: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    return { ok: true, n: await sendFill(200) };
  },
  /* sb13: 결제 대기 업체 목록 — 30일 지나면 «정리 대상» (자동 삭제 안 함 · 권유 알림 안 보냄) */
  hqPayWait: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_shops").select("shop,name,owner_phone,join_plan,created_at").eq("pay_wait", true);
    if (error) throw new Error("칸이 없습니다 (SQL 09 를 먼저 실행해 주세요)");
    const now = Date.now();
    /* 보안 낮음 ③: 돈은 냈는데 아직 결제 대기인 업체(열기 실패) — «결제된 주문 있음» 표시 */
    const codes = (data || []).map((x: any) => x.shop);
    const paid: Record<string, number> = {};
    if (codes.length) {
      const { data: po } = await sb.from("wash_pay_order").select("shop").in("shop", codes).eq("status", "paid");
      (po || []).forEach((o: any) => (paid[o.shop] = 1));
    }
    return { ok: true, list: (data || []).map((x: any) => {
      const days = x.created_at ? Math.floor((now - Date.parse(String(x.created_at))) / DAY) : 0;
      return { shop: x.shop, name: x.name, ownerPhone: x.owner_phone, joinPlan: x.join_plan, createdAt: x.created_at, days, old: days >= 30,
        paidOrder: !!paid[x.shop] };
    }) };
  },
  /* 결제 대기 업체 지우기 — [업체] · ready/paid 주문이 있으면 거절 · 주문·장부는 남김 · 계정은 그 업체 줄만 */
  hqPayWaitDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const { data: sh } = await sb.from("wash_shops").select("shop,pay_wait,owner_phone").eq("shop", code).maybeSingle();
    if (!sh || sh.pay_wait !== true) throw new Error("결제 대기 업체만 여기서 지울 수 있습니다");
    const { data: od } = await sb.from("wash_pay_order").select("order_id").eq("shop", code).in("status", ["ready", "paid"]).limit(1);
    if (od && od.length) throw new Error("결제가 진행 중이거나 끝난 주문이 있어 지울 수 없습니다");
    if (!await hqAuditLog(ss, "payWaitDel", digits(sh.owner_phone), code, "try")) throw new Error("기록을 남기지 못해 멈췄습니다");
    /* 보안 낮음 ②: 먼저 계정을 멈추고 로그인을 끊어 새 주문을 못 만들게 한 뒤, 주문을 다시 확인하고 지움 */
    await sb.from("wash_users").update({ active: false }).eq("shop", code);
    await sb.from("wash_sessions").delete().eq("shop", code);
    const { data: od2 } = await sb.from("wash_pay_order").select("order_id").eq("shop", code).in("status", ["ready", "paid"]).limit(1);
    if (od2 && od2.length) {
      await sb.from("wash_users").update({ active: true }).eq("shop", code);
      await hqAuditLog(ss, "payWaitDel", digits(sh.owner_phone), code, "refused: order");
      throw new Error("결제가 진행 중이거나 끝난 주문이 있어 지울 수 없습니다");
    }
    await sb.from("wash_users").delete().eq("shop", code);
    await sb.from("wash_docs").delete().eq("shop", code);
    await sb.from("wash_shops").delete().eq("shop", code).eq("pay_wait", true);
    payWaitClear(code);
    await hqAuditLog(ss, "payWaitDel", digits(sh.owner_phone), code, "ok");
    return { ok: true };
  },
  /* 자유 가입 스위치 · 한도 — [{on, perIp, allDay, waitPerIp}] (빈 값이면 보기만) */
  hqSignup: async (shop, a, ss) => {
    hqOnly(shop, ss);
    if (a[0] === undefined) return { ok: true, on: await openSignupOn(), cfg: await signupCfg() };
    const v = (a[0] || {}) as any;
    const cfg = { perIp: Math.max(1, Math.min(50, Number(v.perIp) || 5)), allDay: Math.max(1, Math.min(5000, Number(v.allDay) || 200)),
      waitPerIp: Math.max(1, Math.min(20, Number(v.waitPerIp) || 3)) };
    const { error } = await sb.from("wash_hq").update({ open_signup: !!v.on, signup_cfg: cfg }).eq("id", 1);
    if (error) throw new Error("칸이 없습니다 (SQL 09 를 먼저 실행해 주세요)");
    await hqAuditLog(ss, "signupCfg", "", JSON.stringify({ on: !!v.on }), "ok", cfg);
    return { ok: true, on: !!v.on, cfg };
  },
  /* 체크 첫 비밀번호 문자 확인이 운영 중인지 (체크 서버 v26 이상) — 켜져 있어야 체크 비밀번호 비우기가 됨 */
  hqCheckPwSms: async (shop, a, ss) => {
    hqOnly(shop, ss);
    if (a[0] === undefined) return { ok: true, on: await checkPwSmsOn() };
    const { error } = await sb.from("wash_hq").update({ check_first_pw_sms: !!a[0] }).eq("id", 1);
    if (error) throw new Error("칸이 없습니다 (SQL 08 을 먼저 실행해 주세요)");
    await hqAuditLog(ss, "checkPwSms", "", String(!!a[0]), "ok");
    return { ok: true, on: !!a[0] };
  },

  /* sb11: 체크 검사소 ↔ 워시 지갑 잇기 (본사) — [검사소코드, 업체코드 | ""(끊기)] */
  hqCheckWallet: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "").trim().toUpperCase();
    const w = String(a[1] || "").trim();
    const { data: off } = await sb.from("check_office").select("id,code").eq("code", code).maybeSingle();
    if (!off) throw new Error("검사소를 찾지 못했습니다");
    if (w) {
      if (w === "ADMIN") throw new Error("본사 계정은 지갑으로 쓸 수 없습니다");
      const { data: sh } = await sb.from("wash_shops").select("shop").eq("shop", w).maybeSingle();
      if (!sh) throw new Error("업체를 찾지 못했습니다: " + w);
    }
    const { error } = await sb.from("check_office").update({ wallet_shop: w || null }).eq("id", off.id);
    if (error) throw new Error("지갑 칸이 없습니다 (SQL 07 을 먼저 실행해 주세요)");
    return { ok: true, office: code, wallet: w };
  },
  hqCheckWallets: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("check_office").select("code,name,wallet_shop,biz_no,owner_name").order("code");
    if (error) throw new Error("지갑 칸이 없습니다 (SQL 07 을 먼저 실행해 주세요)");
    return { ok: true, offices: (data || []).map((o: any) => ({ code: o.code, name: o.name, wallet: o.wallet_shop || "",
      bizNo: String(o.biz_no || ""), ceo: String(o.owner_name || "") })) };
  },
  hqBillingOn: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_hq").update({ billing_on: !!a[0] }).eq("id", 1);
    if (error) throw new Error("자동 결제 칸이 없습니다 (SQL 06 을 먼저 실행해 주세요)");
    return { ok: true, on: !!a[0] };
  },

  /* ===== 캐시 지갑 (본사) ===== */

  /* 업체별 지갑 · 단가 · 스위치 — [] */
  hqCash: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    const { data: shops } = await sb.from("wash_shops").select("shop,name,active,plan").neq("shop", "ADMIN");
    let lots: any[] = [], logs: any[] = [];
    try {
      const r = await sb.from("wash_cash_lot").select("shop,kind,remain,expires_at").gt("remain", 0);
      lots = r.data || [];
    } catch (_) { /* */ }
    try {
      const r = await sb.from("wash_cash_log").select("*").order("at", { ascending: false }).limit(300);
      logs = r.data || [];
    } catch (_) { /* */ }
    const today = new Date().toISOString().slice(0, 10);
    const box: Record<string, any> = {};
    (shops || []).forEach((x: any) => {
      box[x.shop] = { shop: x.shop, name: x.name, plan: x.plan, active: x.active !== false,
                      free: 0, paid: 0, total: 0, firstExp: "" };
    });
    lots.forEach((l: any) => {
      const b = box[l.shop]; if (!b) return;
      if (l.expires_at && String(l.expires_at) < today) return;
      const v = Number(l.remain || 0);
      if (l.kind === "free") b.free += v; else b.paid += v;
      b.total += v;
      if (l.expires_at && (!b.firstExp || String(l.expires_at) < b.firstExp)) b.firstExp = String(l.expires_at);
    });
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    const used30: Record<string, number> = {};
    logs.forEach((l: any) => {
      if (Number(l.delta || 0) >= 0) return;
      if (String(l.at || "") < since) return;
      used30[l.shop] = (used30[l.shop] || 0) + Math.abs(Number(l.delta || 0));
    });
    Object.keys(box).forEach((k) => { box[k].used30 = used30[k] || 0; });
    return { ok: true, on: cfg.cashOn, note: cfg.note, bank: cfg.bank,
             price: cfg.price, wallets: Object.values(box), logs };
  },

  /* 캐시 넣기 — [업체, 금액, 유효일수, 메모, 종류] */
  hqCashAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const amt = Math.round(Number(a[1]) || 0);
    if (!code) throw new Error("업체를 고르세요");
    if (amt <= 0) throw new Error("금액을 적어 주세요");
    const days = Math.max(0, Number(a[2] ?? 365));
    const cfg = await hqCfg();
    /* 큰 금액은 한 번 더 확인받습니다 (a[5] === true 면 확인된 것) */
    if (cfg.bigAmt > 0 && amt > cfg.bigAmt && a[5] !== true)
      return { ok: false, confirm: true, amount: amt,
               why: wonTxt2(amt) + "은 큰 금액입니다. 한 번 더 확인해 주세요" };
    const who = "hq:" + String((ss && (ss.who || ss.phone)) || "?");
    const { data, error } = await sb.rpc("wash_cash_add", {
      p_shop: code, p_amt: amt, p_kind: String(a[4] || "paid"),
      p_days: days, p_memo: String(a[3] || ""), p_who: who });
    if (error) throw new Error("캐시를 넣지 못했습니다 (캐시 SQL 을 먼저 돌려 주세요)");
    /* sb5: 유료 충전이면 업체 대표에게 충전완료 알림톡 (코드가 있을 때만) */
    if (String(a[4] || "paid") === "paid") {
      try {
        const { data: o } = await sb.from("wash_shops").select("name,owner_phone").eq("shop", code).maybeSingle();
        if (o && o.owner_phone)
          await noticeAta(String(o.owner_phone), "cash_done", { 업체명: o.name || code, 금액: won(amt),
            잔액: won(await cashBal(code)), 사용기한: days > 0 ? korDay(new Date(Date.now() + (9 * 3600e3) + days * DAY).toISOString().slice(0, 10)) : "제한 없음" },
            false, { shop: code, ref: "wash:캐시 넣기" });
      } catch (_) { /* */ }
    }
    /* 본사 계정으로 돈이 움직였으니 사장님 휴대폰으로도 알립니다 */
    try {
      const admin = (await hqCfg()).adminPhone;
      if (admin) await noticeSms(admin,
        "[차곳간] " + code + " 캐시 " + wonTxt2(amt) + " 넣음 (" + who + ")");
    } catch (_) { /* */ }
    return data;
  },

  /* 캐시 빼기(잘못 넣었을 때) — [업체, 금액, 메모] */
  hqCashTake: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const amt = Math.round(Number(a[1]) || 0);
    if (!code || amt <= 0) throw new Error("업체와 금액을 적어 주세요");
    const who2 = "hq:" + String((ss && (ss.who || ss.phone)) || "?");
    const rr: any = await cashTake(code, amt, "adjust", 1, String(a[2] || "본사 조정"), who2, 0);
    try {
      const admin = (await hqCfg()).adminPhone;
      if (admin) await noticeSms(admin, "[차곳간] " + code + " 캐시 " + wonTxt2(amt) + " 뺌 (" + who2 + ")");
    } catch (_) { /* */ }
    return rr;
  },

  /* 단가·스위치·안내문구·계좌 저장 — [{on, note, bank, price:{...}}] */
  hqCashCfg: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const patch: Record<string, unknown> = {};
    if (v.on   !== undefined) patch.cash_on   = !!v.on;
    if (v.note !== undefined) patch.cash_note = String(v.note);
    if (v.bank !== undefined) patch.cash_bank = String(v.bank);
    if (v.price !== undefined) {
      const p = v.price || {};
      patch.price_cfg = {
        sms: Math.max(0, Number(p.sms) || 0), lms: Math.max(0, Number(p.lms) || 0),
        mms: Math.max(0, Number(p.mms) || 0), ata: Math.max(0, Number(p.ata) || 0),
        tax: Math.max(0, Number(p.tax) || 0),
      };
    }
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await sb.from("wash_hq").update(patch).eq("id", 1);
    dbCheck(error, "본사 설정");
    hqCfgClear();
    return { ok: true };
  },

  /* 월 요금을 캐시에서 빼기 — [업체, 금액, 메모] */
  hqCashPay: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const amt = Math.round(Number(a[1]) || 0);
    if (!code || amt <= 0) throw new Error("업체와 금액을 적어 주세요");
    const r: any = await cashTake(code, amt, "plan", 1, String(a[2] || "월 이용요금"),
      "hq:" + String((ss && (ss.who || ss.phone)) || "?"), 0);
    if (!r || r.ok === false)
      throw new Error("남은 캐시가 " + wonTxt2(Number((r && r.balance) || 0)) + " 입니다");
    return r;
  },

  /* ===== 본사 알림 휴대폰 바꾸기 (인증 2단계) ===== */

  /* 지금 번호 보기 — [] */
  hqPhone: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    const p = cfg.adminPhone;
    return { ok: true, phone: p, masked: p ? (p.slice(0, 3) + "****" + p.slice(-4)) : "",
             from: digits(env("SMS_FROM", "") || env("OTP_FROM", "01095593663")) };
  },

  /* ① 새 번호로 인증번호 보내기 — [새 번호] */
  hqPhoneStart: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const nw = normPhone(String(a[0] || ""));
    const cfg = await hqCfg(true);
    if (nw === cfg.adminPhone) throw new Error("지금 쓰고 계신 번호와 같습니다");
    if (!await rateOk("hqphone:" + nw, 5))
      throw new Error("인증번호를 너무 자주 받았습니다. 잠시 후 다시 해 주세요");

    const code = sixDigits();
    const tick = randHex(16);
    const { error } = await sb.from("wash_hq_otp").insert({
      tick, phone: String((ss && ss.phone) || ""), code_hash: await pwHash(code),
      kind: "phone", newphone: nw,
      expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
    });
    if (error) throw new Error("인증번호를 준비하지 못했습니다. 잠시 뒤 다시 해 주세요.");

    /* 새 번호로 6자리, 예전 번호로는 «바꾸려는 시도가 있습니다» 알림 */
    await ataOrSms(nw, "auth", { 인증번호: code, 유효시간: "5" },   // sb22: 알림톡 먼저
      "[차곳간] 본사 알림 번호 변경 인증번호 " + code + "\n5분 안에 넣어 주세요.", { tpl: "hq_auth" });
    if (cfg.adminPhone && cfg.adminPhone !== nw) {
      try {
        await noticeSms(cfg.adminPhone,
          "[차곳간] 본사 알림 번호를 " + nw.slice(0, 3) + "****" + nw.slice(-4) +
          " 로 바꾸려는 시도가 있습니다.\n본인이 아니면 바로 비밀번호를 바꿔 주세요.");
      } catch (_) { /* */ }
    }
    return { ok: true, tick, to: nw.slice(0, 3) + "****" + nw.slice(-4) };
  },

  /* ② 6자리 확인하고 바꾸기 — [표, 6자리] */
  hqPhoneVerify: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const tick = String(a[0] || "");
    const code = digits(a[1]);
    if (!tick || code.length !== 6) throw new Error("인증번호 6자리를 넣어 주세요");
    const { data: p } = await sb.from("wash_hq_otp").select("*").eq("tick", tick).maybeSingle();
    if (!p || String(p.kind || "") !== "phone") throw new Error("인증 시간이 지났습니다. 다시 해 주세요");
    if (new Date(p.expires_at).getTime() < Date.now()) {
      await sb.from("wash_hq_otp").delete().eq("tick", tick);
      throw new Error("인증 시간이 지났습니다. 다시 해 주세요");
    }
    if (Number(p.tries || 0) >= 5) {
      await sb.from("wash_hq_otp").delete().eq("tick", tick);
      throw new Error("인증번호를 여러 번 틀렸습니다. 처음부터 다시 해 주세요");
    }
    /* sb15(보안 W-M2): 맞혀 보기 전에 횟수를 먼저 «원자적으로» 하나 올립니다 (동시에 여러 번 보내도 5번까지만) */
    let tq: any = sb.from("wash_hq_otp").update({ tries: Number(p.tries || 0) + 1 }).eq("tick", tick);
    tq = p.tries == null ? tq.is("tries", null) : tq.eq("tries", Number(p.tries));
    const { data: tk } = await tq.select("tick");
    if (!tk || !tk.length) throw new Error("잠시 뒤 다시 넣어 주세요");
    if (!(await pwVerify(code, String(p.code_hash || "")))) throw new Error("인증번호가 맞지 않습니다");
    const old = (await hqCfg(true)).adminPhone;
    const nw = digits(String(p.newphone || ""));
    if (!nw) throw new Error("바꿀 번호를 찾지 못했습니다");
    const { error } = await sb.from("wash_hq").update({ admin_phone: nw }).eq("id", 1);
    dbCheck(error, "본사 번호");
    await sb.from("wash_hq_otp").delete().eq("tick", tick);
    hqCfgClear();
    try {
      await noticeSms(nw, "[차곳간] 이제 이 번호로 본사 알림이 갑니다.");
      if (old && old !== nw) await noticeSms(old, "[차곳간] 본사 알림 번호가 바뀌었습니다. 이 번호로는 더 이상 알림이 가지 않습니다.");
    } catch (_) { /* */ }
    return { ok: true, phone: nw };
  },

  /* 지갑 합계와 기록 합계가 맞는지 대조 — [] */
  hqCashCheck: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    try {
      const { data, error } = await sb.rpc("wash_cash_check");
      if (error) throw error;
      const rows = (data as any[]) || [];
      const bad = rows.filter((r) => Number(r.gap || 0) !== 0);
      return { ok: true, rows, bad, clean: bad.length === 0 };
    } catch (_) {
      return { ok: false, why: "대조 함수가 없습니다 (캐시 SQL 을 먼저 돌려 주세요)" };
    }
  },

  /* ===== 오늘 해야 할 일 ===== */
  hqTodo: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data } = await sb.from("wash_todo").select("*")
      .order("done").order("due_at", { ascending: true, nullsFirst: false }).order("id", { ascending: false }).limit(200);
    return { ok: true, todo: data || [] };
  },
  hqTodoAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const t = String(a[0] || "").trim();
    if (!t) throw new Error("할 일을 적어 주세요");
    const due = String(a[1] || "").slice(0, 10) || null;
    const { data, error } = await sb.from("wash_todo").insert({ title: t, due_at: due }).select("id").maybeSingle();
    dbCheck(error, "할 일");
    return { ok: true, id: data && data.id };
  },
  hqTodoDone: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const on = !!a[1];
    const { error } = await sb.from("wash_todo")
      .update({ done: on, done_at: on ? new Date().toISOString() : null }).eq("id", Number(a[0] || 0));
    dbCheck(error, "할 일");
    return { ok: true };
  },
  hqTodoDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_todo").delete().eq("id", Number(a[0] || 0));
    dbCheck(error, "할 일");
    return { ok: true };
  },

  /* ═══ 공지사항 ═══ */

  /* 전체 목록 (지난 것·꺼둔 것까지) — [] */
  hqNotices: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_notice").select("*")
      .order("pin", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    dbCheck(error, "공지사항");
    let reads: any[] = [];
    try {
      const r = await sb.from("wash_notice_read").select("notice_id");
      reads = r.data || [];
    } catch (_) { /* */ }
    const cnt: Record<string, number> = {};
    reads.forEach((r: any) => { const k = String(r.notice_id); cnt[k] = (cnt[k] || 0) + 1; });
    return {
      ok: true,
      list: (data || []).map((n: any) => Object.assign({}, n, { hid: cnt[String(n.id)] || 0 })),
      today: kstYmd(),
    };
  },

  /* 새로 쓰기 · 고치기 — [{id, kind, title, body, whereAt, pin, pop, active, fromAt, toAt}] */
  hqNoticeSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const title = String(v.title || "").trim();
    const body = String(v.body || "").trim();
    if (!title) throw new Error("제목을 넣어 주세요");
    if (title.length > 120) throw new Error("제목은 120자까지입니다");
    if (body.length > 4000) throw new Error("내용은 4000자까지입니다");
    const row: Record<string, unknown> = {
      kind: noticeKind(v.kind), title, body,
      where_at: noticeWhere(v.whereAt),
      pin: !!v.pin, pop: !!v.pop,
      active: v.active === undefined ? true : !!v.active,
      from_at: v.fromAt ? String(v.fromAt).slice(0, 10) : null,
      to_at:   v.toAt   ? String(v.toAt).slice(0, 10)   : null,
      who: (ss && ss.phone) || "",
      updated_at: new Date().toISOString(),
    };
    if (v.id) {
      const { error } = await sb.from("wash_notice").update(row).eq("id", Number(v.id));
      dbCheck(error, "공지사항");
      return { ok: true, id: Number(v.id) };
    }
    const { data, error } = await sb.from("wash_notice").insert(row).select("id").maybeSingle();
    dbCheck(error, "공지사항");
    return { ok: true, id: data && data.id };
  },

  /* 지우기 — [공지번호] */
  hqNoticeDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const id = Number(a[0] || 0);
    if (!id) throw new Error("공지를 고르세요");
    const { error } = await sb.rpc("wash_notice_del", { p_id: id });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  /* «다시 보지 않기» 기록 지우기 — 고친 공지를 다시 띄울 때 — [공지번호] */
  hqNoticeAgain: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const id = Number(a[0] || 0);
    if (!id) throw new Error("공지를 고르세요");
    const { error } = await sb.from("wash_notice_read").delete().eq("notice_id", id);
    dbCheck(error, "공지사항");
    return { ok: true };
  },

  /* ═══ 만료 후 «잠금 → 차단 → 자료 정리» ═══ */

  /* 설정과 업체별 상태를 한 번에 — [] */
  hqLock: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    const { data: shops } = await sb.from("wash_shops").select(LOCK_COLS).neq("shop", "ADMIN");
    const rows = (shops || []).map((sh: any) => {
      const st: any = lockOf(sh, cfg);
      return {
        shop: sh.shop, name: sh.name, plan: sh.plan, active: sh.active !== false,
        kind: st.kind, endAt: st.endAt, state: st.state,
        lockDays: st.lockDays, lockUntil: st.lockUntil || "", blockFrom: st.blockFrom || "",
        delAt: st.delAt || "", leftToDel: st.leftToDel ?? null,
        openUntil: String(sh.open_until || "").slice(0, 10), openMemo: sh.open_memo || "",
        opened: !!st.opened, own: sh.lock_days ?? null,
      };
    });
    let logs: any[] = [];
    try {
      const r = await sb.from("wash_lock_log").select("*").order("at", { ascending: false }).limit(100);
      logs = r.data || [];
    } catch (_) { /* */ }
    return { ok: true, cfg: cfg.lock || {}, shops: rows, logs, today: kstYmd() };
  },

  /* 기본값 바꾸기 — [{on, lockDays, delDays, trialSame, warnDel, paidSay}] */
  hqLockSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const cur = (await hqCfg(true)).lock || {};
    const next: Record<string, unknown> = Object.assign({}, cur);
    if (v.on        !== undefined) next.on        = !!v.on;
    if (v.trialSame !== undefined) next.trialSame = !!v.trialSame;
    if (v.warnDel   !== undefined) next.warnDel   = !!v.warnDel;
    if (v.paidSay   !== undefined) next.paidSay   = !!v.paidSay;
    if (v.lockDays  !== undefined) next.lockDays  = Math.min(180, Math.max(0, Number(v.lockDays) || 0));
    if (v.delDays   !== undefined) next.delDays   = Math.min(1825, Math.max(7, Number(v.delDays) || 90));
    if (Number(next.delDays) <= Number(next.lockDays))
      throw new Error("«자료 보관» 날짜는 «잠금» 날짜보다 길어야 합니다");
    const { error } = await sb.from("wash_hq").update({ lock_cfg: next }).eq("id", 1);
    dbCheck(error, "잠금 설정");
    hqCfgClear(); lockClear();
    return { ok: true, cfg: next };
  },

  /* 업체 하나만 따로 — [업체코드, {openUntil, lockDays, memo}] */
  hqLockShop: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    if (!code || code === "ADMIN") throw new Error("업체를 고르세요");
    const v = (a[1] || {}) as Record<string, any>;
    const patch: Record<string, unknown> = {};
    if (v.openUntil !== undefined) patch.open_until = v.openUntil ? String(v.openUntil).slice(0, 10) : null;
    if (v.lockDays  !== undefined) patch.lock_days  =
      (v.lockDays === "" || v.lockDays === null) ? null : Math.min(180, Math.max(0, Number(v.lockDays) || 0));
    if (v.memo      !== undefined) patch.open_memo  = String(v.memo).slice(0, 200);
    if (!Object.keys(patch).length) throw new Error("바꿀 내용이 없습니다");
    const { error } = await sb.from("wash_shops").update(patch).eq("shop", code);
    dbCheck(error, "업체 잠금 설정");
    try {
      await sb.from("wash_lock_log").insert({ shop: code, what: "open",
        note: JSON.stringify(patch), who: (ss && ss.phone) || "" });
    } catch (_) { /* */ }
    lockClear(code);
    return { ok: true, state: await lockState(code, true) };
  },

  /* 자료 정리 대상 보기 — [] */
  hqPurgeList: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    const { data: shops } = await sb.from("wash_shops").select(LOCK_COLS).neq("shop", "ADMIN");
    const out: any[] = [];
    for (const sh of (shops || [])) {
      const st: any = lockOf(sh, cfg);
      if (!st.delAt) continue;
      if ((st.leftToDel ?? 99999) > 7) continue;       // 7일 전부터 미리 보여 드립니다
      out.push({ shop: sh.shop, name: sh.name, endAt: st.endAt, delAt: st.delAt,
                 leftToDel: st.leftToDel, state: st.state, ready: (st.leftToDel ?? 1) <= 0 });
    }
    return { ok: true, list: out, delDays: Number((cfg.lock || {}).delDays ?? 90), today: kstYmd() };
  },

  /* 한 업체 자료가 얼마나 되는지 미리 보기 — [업체코드] */
  hqPurgePeek: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    if (!code || code === "ADMIN") throw new Error("업체를 고르세요");
    const { data } = await sb.rpc("wash_purge_peek", { p_shop: code });
    const st = await lockState(code, true);
    return { ok: true, peek: data || null, state: st };
  },

  /* 진짜로 지우기 — [업체코드, 업체이름(확인용)] */
  hqPurgeRun: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const typed = String(a[1] || "").trim();
    if (!code || code === "ADMIN") throw new Error("업체를 고르세요");
    const { data: sh } = await sb.from("wash_shops").select(LOCK_COLS).eq("shop", code).maybeSingle();
    if (!sh) throw new Error("업체를 찾지 못했습니다");
    if (typed !== String(sh.name || "").trim())
      throw new Error("업체명이 다릅니다. 지우려면 업체명을 정확히 적어 주세요");
    const st: any = lockOf(sh, await hqCfg(true));
    if (!st.delAt || (st.leftToDel ?? 1) > 0)
      throw new Error("아직 보관 기간이 남아 있습니다 (" + (st.delAt || "-") + " 부터 지울 수 있습니다)");
    const { data, error } = await sb.rpc("wash_purge_run", { p_shop: code, p_who: (ss && ss.phone) || "" });
    if (error) throw new Error(error.message);
    lockClear(code);
    return { ok: true, result: data };
  },

  /* ===== 만료 안내 문자 ===== */
  hqExp: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    let logs: any[] = [];
    try {
      const r = await sb.from("wash_expire_log").select("*").order("sent_at", { ascending: false }).limit(200);
      logs = r.data || [];
    } catch (_) { /* */ }
    const { data: shops } = await sb.from("wash_shops")
      .select("shop,name,plan,active,trial_until,paid_until,owner_phone,exp_sms").neq("shop", "ADMIN");
    const nm: Record<string, string> = {};
    (shops || []).forEach((x: any) => { nm[x.shop] = x.name; });
    return { ok: true, cfg: cfg.exp, shops: shops || [], names: nm, logs,
             cronReady: !!cfg.cronKey };
  },
  hqExpSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const cur = (await hqCfg(true)).exp || {};
    const next: Record<string, unknown> = Object.assign({}, cur);
    if (v.on    !== undefined) next.on    = !!v.on;
    if (v.trial !== undefined) next.trial = !!v.trial;
    if (v.cash  !== undefined) next.cash  = !!v.cash;
    if (v.time  !== undefined) next.time  = String(v.time).slice(0, 5);
    if (v.days  !== undefined) next.days  = (Array.isArray(v.days) ? v.days : []).map((x: any) => Number(x) || 0);
    if (v.balMin !== undefined) next.balMin = Math.max(0, Math.min(10000000, Math.round(Number(v.balMin) || 0)));   // sb16: 잔액 안내 기준(원 · 0=끔)
    if (v.tplIdx !== undefined) next.tplIdx = Math.min(2, Math.max(0, Number(v.tplIdx) || 0));
    if (v.tpls  !== undefined) next.tpls  = (Array.isArray(v.tpls) ? v.tpls : []).slice(0, 3)
      .map((t: any) => ({ name: String((t && t.name) || ""), text: String((t && t.text) || "") }));
    const { error } = await sb.from("wash_hq").update({ exp_cfg: next }).eq("id", 1);
    dbCheck(error, "만료 안내 설정");
    hqCfgClear();
    return { ok: true, cfg: next };
  },
  /* sb7: 알림톡 템플릿 코드 보기 — 관리 화면(v4.1) 모양 [ym?] → {ok, pfSet, tpls:{키:코드}, stats} */
  hqAta: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const c = await ataCfg(true);
    const ym = /^\d{4}-\d{2}$/.test(String(a[0] || "")) ? String(a[0])
      : (() => { const d = new Date(Date.now() + 9 * 3600e3); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })();
    const stats: any = { ym, ata: { cnt: 0, won: 0 }, sms: { cnt: 0, won: 0 }, lms: { cnt: 0, won: 0 }, mms: { cnt: 0, won: 0 } };
    try {
      const from = ym + "-01T00:00:00+09:00";
      const nx = new Date(ym + "-01T00:00:00Z"); nx.setUTCMonth(nx.getUTCMonth() + 1);
      const to = nx.toISOString().slice(0, 10) + "T00:00:00+09:00";
      const { data, error } = await sb.from("wash_sendlog").select("method,body,ok,created_at")
        .eq("ok", true).gte("created_at", from).lt("created_at", to).limit(100000);
      if (error) throw error;
      const PRICE: Record<string, number> = { ata: 13, sms: 18, lms: 45, mms: 110 };
      (data || []).forEach((r: any) => {
        let m = String(r.method || "").toLowerCase();
        if (m === "auto" || !PRICE[m]) m = isLong(r.body) ? "lms" : "sms";   // sb26: 90바이트
        stats[m].cnt++; stats[m].won += PRICE[m];
      });
    } catch (_) { stats.error = "발송 기록을 읽지 못했습니다"; }
    const keys = ATA_KEYS;
    return { ok: true, pfSet: !!c.pfId, tpls: Object.fromEntries(keys.map((k) => [k, c.tpl[k] || ""])),
             ready: Object.keys(ATA_TPL), stats };
  },
  /* sb7: 저장 — [{키:코드}] (ATA_KEYS(13개 + check_arrive)만 · 빈 값은 지움 · 64자) */
  hqAtaSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as any;
    const src = (v && typeof v.tpl === "object") ? v.tpl : v;     // 예전 모양 {tpl:{…}} 도 받음
    const tpl: Record<string, string> = {};
    ATA_KEYS.forEach((k) => { const x = String((src && src[k]) || "").trim(); if (x) tpl[k] = x.slice(0, 64); });
    const next: any = { tpl };
    const pfRaw = String((v && v.pfId) || "").trim();
    if (pfRaw) next.pfId = pfRaw.slice(0, 64);
    else {
      const { data } = await sb.from("wash_hq").select("ata_cfg").eq("id", 1).maybeSingle();
      if (data && data.ata_cfg && data.ata_cfg.pfId) next.pfId = data.ata_cfg.pfId;
    }
    const { error } = await sb.from("wash_hq").update({ ata_cfg: next }).eq("id", 1);
    dbCheck(error, "알림톡 설정");
    _ataBox = { at: 0, v: null };
    return { ok: true };
  },
  /* 손으로 한 통 보내기 — [업체(또는 "ME"), 문구번호] */
  hqExpSendNow: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const cfg = await hqCfg(true);
    const tpls = (cfg.exp && cfg.exp.tpls) || [];
    const ti = Math.min(2, Math.max(0, Number(a[1]) || 0));
    const tpl = String((tpls[ti] && tpls[ti].text) || "[차곳간] 안내드립니다.");
    const code = String(a[0] || "");
    if (code === "ME") {
      const me = (await hqCfg()).adminPhone;
      await noticeSms(me, fillTpl(tpl, { 업체: "시험업체", 무엇: "이용기한", 날짜: korDay(new Date().toISOString().slice(0, 10)), 남은일: "3", 요금제: "스탠다드", 캐시: "0" }));
      return { ok: true, to: me, test: true };
    }
    const { data: sh } = await sb.from("wash_shops")
      .select("shop,name,plan,trial_until,paid_until,owner_phone").eq("shop", code).maybeSingle();
    if (!sh) throw new Error("업체를 찾지 못했습니다");
    const phone = digits(String(sh.owner_phone || ""));
    if (!phone) throw new Error("대표 휴대폰이 없습니다");
    const isTrial = !sh.plan || sh.plan === "trial";
    const end = String((isTrial ? sh.trial_until : sh.paid_until) || "").slice(0, 10);
    const left = end ? Math.round((Date.parse(end + "T00:00:00Z") - kstToday()) / DAY) : 0;
    const bal = await cashBal(code);
    const text = fillTpl(tpl, {
      업체: String(sh.name || code), 무엇: isTrial ? "체험 기간" : "이용기한",
      날짜: korDay(end), 남은일: String(left), 요금제: String(sh.plan || ""), 캐시: String(bal),
    });
    /* sb16: 기간종료예정 알림톡 코드가 있으면 알림톡 (남은일이 0 아래면 문자) */
    if (end && left >= 0)
      await ataOrSms(phone, "expire_soon", { 업체명: String(sh.name || code), 무엇: isTrial ? "체험 기간" : "이용기간",
        종료일: korDay(end), 남은일: String(left), 요금제: isTrial ? "체험" : await planName(String(sh.plan || "")) }, text, { shop: code, ref: "본사 손발송" });
    else await noticeSms(phone, text, { shop: code, tpl: "expire_hand" });
    try {
      await sb.from("wash_expire_log").insert({
        shop: code, end_at: end || new Date().toISOString().slice(0, 10),
        dleft: -1, phone, kind: "hand", note: text.slice(0, 120) });
    } catch (_) { /* */ }
    return { ok: true, to: phone, text };
  },

  /* ===== 운영 현황 (용량 · 고정비) ===== */

  /* 자료 용량 · 사진 용량 · 고정비를 한 번에 — [] */
  hqOps: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const at = new Date().toISOString();

    /* (1) 수파베이스 용량 — SQL 함수에 직접 물어봅니다 */
    let usage: any = null, usageErr = "";
    try {
      const { data, error } = await sb.rpc("wash_usage");
      if (error) usageErr = "사용량 함수가 없습니다 (사용량 SQL 을 먼저 돌려 주세요)";
      else usage = data;
    } catch (e) {
      usageErr = e instanceof Error ? e.message : String(e);
    }

    /* (2) 업체 이름 붙이기 */
    const names: Record<string, string> = {};
    try {
      const { data } = await sb.from("wash_shops").select("shop,name,active");
      (data || []).forEach((r: any) => { names[String(r.shop)] = String(r.name || r.shop); });
    } catch (_) { /* */ }

    /* (3) 유지비(서비스) — 잔액 · 다음 결제일 */
    let svcs: any[] = [];
    try {
      const { data } = await sb.from("wash_services").select("*").order("sort");
      svcs = data || [];
    } catch (_) { /* */ }

    const today = new Date();
    const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const live = svcs.filter((v) => v.active !== false);
    let monthCost = 0;
    const due: any[] = [], low: any[] = [];
    live.forEach((v) => {
      monthCost += Number(v.cost || 0);
      if (v.next_due) {
        const t = new Date(ymd10(v.next_due) + "T00:00:00");
        const days = Math.round((t.getTime() - d0.getTime()) / 86400000);
        const warn = Number(v.warn_days || 14);
        if (isFinite(days) && days <= warn)
          due.push({ code: v.code, name: v.name, nextDue: v.next_due, days, cost: Number(v.cost || 0) });
      }
      const min = Number(v.min_bal || 0);
      if (v.kind === "charge" && min > 0 && Number(v.balance || 0) < min)
        low.push({ code: v.code, name: v.name, balance: Number(v.balance || 0), minBal: min });
    });
    due.sort((a, b) => a.days - b.days);

    /* (4) 한도 — Secrets 로 바꿀 수 있습니다 (수파베이스 Pro 기본값) */
    const limits = {
      dbGb:   Number(env("SB_DB_LIMIT_GB", "8")) || 8,
      fileGb: Number(env("SB_FILE_LIMIT_GB", "100")) || 100,
      warnPct: Number(env("SB_WARN_PCT", "80")) || 80,
    };

    /* (5) 사진이 한 달에 얼마나 늘고 있는지 — 남은 기간 어림잡기 */
    let grow: any = null;
    try {
      const ms = (usage && usage.months) || [];
      const last = ms.slice(-3).filter((m: any) => Number(m.bytes || 0) > 0);
      if (last.length) {
        const avg = last.reduce((a: number, b: any) => a + Number(b.bytes || 0), 0) / last.length;
        const used = Number((usage && usage.file_bytes) || 0);
        const cap = limits.fileGb * 1024 * 1024 * 1024;
        grow = {
          perMonth: Math.round(avg),
          monthsLeft: avg > 0 ? Math.max(0, Math.floor((cap - used) / avg)) : null,
        };
      }
    } catch (_) { /* */ }

    return {
      ok: true, at, usage, usageErr, names, limits, grow,
      services: live.map((v) => ({
        code: v.code, name: v.name, what: v.what, kind: v.kind,
        balance: Number(v.balance || 0), balanceAt: v.balance_at,
        cost: Number(v.cost || 0), nextDue: v.next_due,
        minBal: Number(v.min_bal || 0), warnDays: Number(v.warn_days || 14),
        auto: !!v.auto, autoNote: v.auto_note, autoAt: v.auto_at, autoErr: v.auto_err,
        url: v.url, memo: v.memo,
      })),
      monthCost, due, low,
    };
  },

  /* ===== 보안 점검 ===== */

  /* 지금 상태를 한꺼번에 살펴봅니다 — [] */
  hqSecurity: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const out: any[] = [];
    const add = (group: string, name: string, lv: number, txt: string, how = "") =>
      out.push({ group, name, lv, txt, how });   // lv : 0 좋음 · 1 주의 · 2 위험

    /* --- 1. 서버 잠금 --- */
    const legacy = LEGACY_OK();
    add("서버", "예전 업체 주소(?shop=&key=)", legacy ? 2 : 0,
      legacy ? "열려 있습니다 — 로그인 없이 들어올 수 있습니다" : "잠겨 있습니다 (로그인해야 들어옵니다)",
      legacy ? "Secrets 에서 ALLOW_LEGACY_KEY 를 지우고 다시 Deploy 하세요" : "");

    /* --- 2. 안전장치(SQL) 설치 여부 --- */
    let sec: any = null;
    try { const { data } = await sb.rpc("wash_sec_check"); sec = data; } catch (_) { sec = null; }
    if (!sec) {
      add("안전장치", "문자·계산서 차단 장치", 2, "아직 안 깔렸습니다",
        "1_수파베이스_SQL_안전장치.sql 과 보안점검 SQL 을 먼저 돌려 주세요");
    } else {
      const need: [string, string][] = [
        ["rate_table", "횟수 제한 표(wash_rate)"], ["rate_fn", "횟수 세기 함수"],
        ["sms_fn", "문자 차감 함수"], ["sms_undo", "문자 되돌리기 함수"],
        ["tax_fn", "계산서 차감 함수"], ["tax_undo", "계산서 되돌리기 함수"],
        ["otp_fn", "인증번호 횟수 함수"],
      ];
      const bad = need.filter((n) => !sec[n[0]]);
      add("안전장치", "차단 장치 7가지", bad.length ? 2 : 0,
        bad.length ? ("안 깔린 것 " + bad.length + "개 — " + bad.map((b) => b[1]).join(", "))
                   : "7가지 모두 깔려 있습니다",
        bad.length ? "보안점검 SQL 을 다시 돌려 주세요" : "");
    }

    /* --- 3. 비밀 열쇠(Secrets) --- */
    const keys: [string, string, boolean][] = [
      ["문자(솔라피)", "SOLAPI_KEY", !!env("SOLAPI_KEY") && !!env("SOLAPI_SECRET")],
      ["번호판 읽기(앤트로픽)", "ANTHROPIC_KEY", !!env("ANTHROPIC_KEY")],
      ["세금계산서(팝빌)", "POPBILL_LINKID", !!env("POPBILL_LINKID") && !!env("POPBILL_SECRET")],
    ];
    keys.forEach((k) => add("비밀 열쇠", k[0], k[2] ? 0 : 1,
      k[2] ? "등록되어 있습니다" : "아직 없습니다 (" + k[1] + ")",
      k[2] ? "" : "수파베이스 → Edge Functions → Secrets 에 넣어 주세요"));

    /* --- 4. 업체 상태 --- */
    const { data: shops } = await sb.from("wash_shops").select(SHOP_COLS);
    const list = (shops || []).filter((x: any) => x.shop !== "ADMIN");
    const noTrialEnd = list.filter((x: any) => (!x.plan || x.plan === "trial") && !x.trial_until);
    add("업체", "체험 종료일이 없는 업체", noTrialEnd.length ? 2 : 0,
      noTrialEnd.length ? (noTrialEnd.length + "곳 — 기한 없이 계속 쓸 수 있습니다 (" +
        noTrialEnd.map((x: any) => x.name).join(", ") + ")") : "없습니다",
      noTrialEnd.length ? "업체 화면에서 체험 종료일을 넣어 주세요" : "");

    const outSms = list.filter((x: any) => {
      const free = (!x.plan || x.plan === "trial") ? Number(x.trial_sms ?? TRIAL_SMS) : 0;
      return free > 0 && Number(x.sms_used || 0) >= free && Number(x.sms_paid || 0) <= 0;
    });
    add("업체", "문자를 다 쓴 업체", outSms.length ? 1 : 0,
      outSms.length ? (outSms.length + "곳 — " + outSms.map((x: any) => x.name).join(", ")) : "없습니다",
      outSms.length ? "충전 화면에서 채워 주시면 바로 다시 나갑니다" : "");

    const hqFromNo = digits(env("SMS_FROM", ""));
    if (hqFromNo) {
      add("업체", "문자 발신번호", 0,
        "모든 업체가 차곳간 대표번호(" + hqFromNo + ")로 나갑니다 — 업체별 서류가 필요 없습니다");
    } else {
      const noFrom = list.filter((x: any) => !x.sms_from);
      add("업체", "발신번호가 아직 안 정해진 업체", noFrom.length ? 1 : 0,
        noFrom.length ? (noFrom.length + "곳 — 처음 문자를 보낼 때 그 번호로 고정됩니다") : "모두 정해졌습니다",
        "대표번호가 나오면 Secrets 에 SMS_FROM 을 넣으시면 전부 그 번호로 통일됩니다");
    }

    const noBiz = list.filter((x: any) => !x.biz_no);
    add("업체", "사업자등록번호가 없는 업체", noBiz.length ? 1 : 0,
      noBiz.length ? (noBiz.length + "곳 — 세금계산서를 발행할 수 없습니다 (" +
        noBiz.map((x: any) => x.name).join(", ") + ")") : "모두 있습니다",
      noBiz.length ? "업체 화면에서 사업자등록번호를 넣어 주세요" : "");

    const off = list.filter((x: any) => x.active === false);
    add("업체", "이용이 멈춰 있는 업체", off.length ? 1 : 0,
      off.length ? (off.length + "곳 — " + off.map((x: any) => x.name).join(", ")) : "없습니다");

    /* --- 5. 계정 --- */
    const { data: users } = await sb.from("wash_users").select("phone,shop,name,role,active,last_login,created_at");
    const us = users || [];
    const admins = us.filter((u: any) => u.role === "admin" && u.active !== false);
    add("계정", "본사 관리자 계정", admins.length > 1 ? 1 : 0,
      admins.length + "개 — " + admins.map((u: any) => u.name).join(", "),
      admins.length > 1 ? "쓰지 않는 본사 계정은 정지시켜 두시는 것이 안전합니다" : "");

    const never = us.filter((u: any) => !u.last_login && u.active !== false);
    add("계정", "한 번도 안 들어온 계정", never.length ? 1 : 0,
      never.length ? (never.length + "개 — " + never.map((u: any) => u.name).join(", ")) : "없습니다",
      never.length ? "쓰지 않는 계정이면 정지시켜 주세요" : "");

    const old30 = us.filter((u: any) => u.active !== false && u.last_login &&
      (Date.now() - new Date(u.last_login).getTime()) > 30 * DAY);
    add("계정", "30일 넘게 안 들어온 계정", old30.length ? 1 : 0,
      old30.length ? (old30.length + "개 — " + old30.map((u: any) => u.name).join(", ")) : "없습니다");

    /* --- 6. 로그인 기기 --- */
    const now = new Date().toISOString();
    const { data: sess } = await sb.from("wash_sessions").select("sid,shop,kind,created_at").gt("expires_at", now);
    add("기기", "지금 로그인되어 있는 기기", 0, (sess || []).length + "대");

    /* --- 7. 오늘의 이상 징후 (횟수 제한 기록) --- */
    const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const { data: rate } = await sb.from("wash_rate").select("key,cnt,day").eq("day", today);
    const sum = (pre: string) => (rate || []).filter((r: any) => String(r.key).startsWith(pre))
      .reduce((a: number, b: any) => a + Number(b.cnt || 0), 0);
    const otpAll = sum("otp:");
    const fail = sum("pwfail:");
    const contact = sum("contact:");
    add("오늘", "인증번호 보낸 횟수", otpAll > 100 ? 2 : (otpAll > 30 ? 1 : 0), otpAll + "회",
      otpAll > 100 ? "평소보다 많습니다 — 누가 장난치는지 확인해 주세요" : "");
    add("오늘", "비밀번호 틀린 횟수", fail > 30 ? 2 : (fail > 10 ? 1 : 0), fail + "회",
      fail > 30 ? "누가 비밀번호를 찍어보고 있을 수 있습니다" : "");
    add("오늘", "상담 신청", 0, contact + "건");

    /* --- 8. 홈페이지·앱 보안 머리글 --- */
    const sites: [string, string][] = [
      ["앱", "https://app.cgg.co.kr/"],
      ["관리", "https://admin.cgg.co.kr/"],
      ["홈페이지", "https://cgg.co.kr/"],
    ];
    for (const [nm, url] of sites) {
      try {
        const r = await fetch(url, { method: "GET", redirect: "follow" });
        const need2: [string, string][] = [
          ["content-security-policy", "코드 심기 막기"],
          ["x-frame-options", "화면 겹치기 막기"],
          ["x-content-type-options", "파일 종류 속이기 막기"],
          ["referrer-policy", "주소 새어나감 막기"],
          ["strict-transport-security", "https 고정"],
        ];
        const miss2 = need2.filter((h) => !r.headers.get(h[0]));
        add("머리글", nm + " 보안 머리글", miss2.length ? (miss2.length > 2 ? 2 : 1) : 0,
          miss2.length ? ("빠진 것 " + miss2.length + "개 — " + miss2.map((h) => h[1]).join(", ")) : "5가지 모두 있습니다",
          miss2.length ? "_headers 파일을 올려 주세요" : "");
      } catch (_) {
        add("머리글", nm + " 보안 머리글", 1, "확인하지 못했습니다 (주소 연결 실패)");
      }
    }

    /* --- 손으로 확인한 기록 --- */
    let state: any = {};
    try {
      const { data: hq } = await sb.from("wash_hq").select("sec_state").eq("id", 1).maybeSingle();
      state = (hq && hq.sec_state) || {};
    } catch (_) { state = {}; }

    return { ok: true, at: new Date().toISOString(), ver: VER, checks: out, state };
  },

  /* 손으로 확인한 항목 저장 — [열쇠, 체크여부] */
  hqSecSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const key = String(a[0] || "").slice(0, 60);
    if (!key) throw new Error("항목을 고르지 못했습니다");
    const on = !!a[1];
    const { data: hq } = await sb.from("wash_hq").select("sec_state").eq("id", 1).maybeSingle();
    const state: any = (hq && hq.sec_state) || {};
    if (on) state[key] = { at: new Date().toISOString(), who: (ss && ss.phone) || "" };
    else delete state[key];
    const { error } = await sb.from("wash_hq").upsert({ id: 1, sec_state: state });
    dbCheck(error, "보안 점검 기록");
    return { ok: true, state };
  },

  /* 본사 정보 저장 — [{...}] */
  hqInfoSave: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const v = (a[0] || {}) as Record<string, any>;
    const { error } = await sb.from("wash_hq").upsert({
      id: 1,
      biz_name: String(v.bizName || "").trim(), biz_no: digits(v.bizNo),
      ceo: String(v.ceo || "").trim(), addr: String(v.addr || "").trim(),
      upte: String(v.upte || "").trim(), jongmok: String(v.jongmok || "").trim(),
      email: String(v.email || "").trim(), phone: digits(v.phone),
      bank: String(v.bank || "").trim(), pb_userid: String(v.pbUserId || "").trim(),
      pb_test: v.pbTest === undefined ? true : !!v.pbTest,
      updated_at: new Date().toISOString(),
    });
    dbCheck(error, "본사 정보");
    return { ok: true };
  },

  /* 팝빌 연결·잔액 확인 — [] */
  hqTaxCheck: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data: hq } = await sb.from("wash_hq").select("biz_no,pb_test").eq("id", 1).maybeSingle();
    if (!hq || !digits(hq.biz_no)) throw new Error("본사 사업자등록번호를 먼저 넣어 주세요");
    return await pbCheck(String(hq.biz_no), !!hq.pb_test);
  },

  /* 세금계산서 발행 — [업체코드, {amount, period, itemName, mgtKey(선택)}] */
  hqTaxIssue: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const code = String(a[0] || "");
    const v = (a[1] || {}) as Record<string, any>;
    const { data: hq } = await sb.from("wash_hq").select("*").eq("id", 1).maybeSingle();
    if (!hq || digits(hq.biz_no).length !== 10) throw new Error("본사 사업자등록번호(10자리)를 먼저 넣어 주세요");
    const { data: sh } = await sb.from("wash_shops")
      .select("shop,name,biz_no,ceo,addr,upte,jongmok,tax_email,tax_phone,owner_phone")
      .eq("shop", code).maybeSingle();
    if (!sh) throw new Error("업체를 찾지 못했습니다");
    if (digits(sh.biz_no).length !== 10)
      throw new Error(sh.name + " 의 사업자등록번호(10자리)를 먼저 넣어 주세요");

    const supply = Math.max(0, Math.round(Number(v.amount) || 0));      // 공급가액
    if (!supply) throw new Error("공급가액을 적어 주세요");
    const vat = Math.round(supply / 10);
    const total = supply + vat;
    /* sb23(대표님 «입금 전 세금계산서 발급 없음»): 결제 기록 번호로 그 업체 결제가 «결제 완료»이고 금액이 같을 때만 · 같은 결제로 두 번은 안 됨 */
    const payId = String(v.payId || "").trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(payId)) throw new Error("어느 결제의 계산서인지 골라 주세요 (결제 기록에서 «세금계산서»)");
    const { data: pay } = await sb.from("wash_payments").select("id,shop,amount,status").eq("id", payId).maybeSingle();
    if (!pay || String(pay.shop || "") !== code) throw new Error("이 업체의 결제 기록이 아닙니다");
    if (String(pay.status || "") !== "paid") throw new Error("아직 결제(입금) 전입니다. 결제가 끝나면 발행할 수 있어요");
    if (await payRefunded(payId)) throw new Error("환불한 결제라 세금계산서를 발행할 수 없습니다");   // sb24(보안 낮음): 부분 환불 포함
    if (Math.round(Number(pay.amount) || 0) !== total)
      throw new Error("계산서 합계(" + total.toLocaleString("ko-KR") + "원)가 결제 금액(" + Math.round(Number(pay.amount) || 0).toLocaleString("ko-KR") + "원)과 다릅니다");
    {
      const { data: done } = await sb.from("wash_taxlog").select("no").eq("shop", "ADMIN").eq("ok", true)
        .ilike("memo", "%결제 " + payId.replace(/_/g, "\\_") + " ·%").limit(1);   // 보안 참고: 뒤 « ·» 까지(앞부분 같은 id 막지 않게)
      if (done && done.length) throw new Error("이 결제로 이미 세금계산서를 발행했습니다");
    }
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    /* 관리번호는 팝빌에서 한 번 쓰면 다시 못 씁니다.
       달 뒤에 겹치지 않는 꼬리표를 붙여, 같은 달에 두 번째 계산서도 나갈 수 있게 합니다. */
    const per6 = String(v.period || "").replace(/[^0-9]/g, "").slice(0, 6) || today.slice(0, 6);
    const headKey = "CGG" + String(code).replace(/[^A-Za-z0-9]/g, "").slice(0, 6) + "-" + per6 + "-";
    const rnd = () => Math.random().toString(36).slice(2).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const room = Math.max(6, 24 - headKey.length);
    const tail = (Date.now().toString(36).toUpperCase().slice(-4) + rnd() + rnd()).slice(0, room);
    const mgtKey = String(v.mgtKey || (headKey + tail))
      .replace(/[^A-Za-z0-9\-_]/g, "").slice(0, 24);
    const itemName = String(v.itemName || ("차곳간 이용료 " + (v.period || "")));

    const doc = {
      writeDate: today, chargeDirection: "정과금", issueType: "정발행", purposeType: "영수",
      taxType: "과세",
      invoicerCorpNum: digits(hq.biz_no), invoicerCorpName: String(hq.biz_name || ""),
      invoicerMgtKey: mgtKey, invoicerCEOName: String(hq.ceo || ""),
      invoicerAddr: String(hq.addr || ""), invoicerBizType: String(hq.upte || ""),
      invoicerBizClass: String(hq.jongmok || ""), invoicerContactName: String(hq.ceo || ""),
      invoicerTEL: String(hq.phone || ""), invoicerEmail: String(hq.email || ""),
      invoiceeType: "사업자",
      invoiceeCorpNum: digits(sh.biz_no), invoiceeCorpName: String(sh.name || ""),
      invoiceeCEOName: String(sh.ceo || ""), invoiceeAddr: String(sh.addr || ""),
      invoiceeBizType: String(sh.upte || ""), invoiceeBizClass: String(sh.jongmok || ""),
      invoiceeContactName1: String(sh.ceo || ""),
      invoiceeTEL1: String(sh.tax_phone || sh.owner_phone || ""),
      invoiceeEmail1: String(sh.tax_email || ""),
      supplyCostTotal: String(supply), taxTotal: String(vat), totalAmount: String(total),
      detailList: [{
        serialNum: 1, purchaseDT: today, itemName,
        spec: "", qty: "1", unitCost: String(supply),
        supplyCost: String(supply), tax: String(vat), remark: String(v.memo || ""),
      }],
      remark1: ("결제 " + payId + " · " + itemName + (v.memo ? (" · " + String(v.memo)) : "")).slice(0, 300),   // sb23: 결제 번호를 앞에(두 번 발행 막기)
    };
    /* sb23(SQL 21): 실제 발행이면 결제를 먼저 잡음 — 동시에 두 번 누름 막기 · 실패하면 놓음 */
    const hqClaim = hq.pb_test ? [] : ["pay:" + payId];
    if (hqClaim.length) { const why = await taxClaim("ADMIN", hqClaim, String((ss && ss.phone) || "").slice(-4)); if (why) throw new Error(/이미/.test(why) ? "이 결제로 이미 세금계산서를 발행했습니다" : why); }
    let r: any;
    try {
      r = await pbIssue("ADMIN", JSON.stringify({
        corpNum: digits(hq.biz_no), test: !!hq.pb_test, userId: String(hq.pb_userid || ""),
        force: !!v.force, doc,
      }));
    } catch (e) { await taxRelease("ADMIN", hqClaim); throw e; }
    if (!r || !r.ok) await taxRelease("ADMIN", hqClaim);
    if (!r.ok && r.dup) return r;                       /* 화면에서 물어본 뒤 다시 보냅니다 */
    if (!r.ok) throw new Error(r.error || "세금계산서를 보내지 못했습니다");
    return { ok: true, test: !!hq.pb_test, mgtKey, total, ntsConfirmNum: r.ntsConfirmNum || "" };
  },

  /* 발행 기록 — [] */
  hqTaxLog: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_taxlog").select("*")
      .eq("shop", "ADMIN").order("no", { ascending: false }).limit(300);
    if (error) return { ok: true, logs: [], warn: String(error.message || error) };
    return { ok: true, logs: data || [] };
  },

  /* 내 관리자 계정 바꾸기 — [새 아이디, 새 비밀번호, 지금 비밀번호] */
  hqMe: async (shop, a, ss) => {
    hqOnly(shop, ss);
    if (!ss) throw new Error("로그인 상태에서만 바꿀 수 있습니다");
    const newId = String(a[0] || "").trim();
    const newPw = String(a[1] || "");
    const curPw = String(a[2] || "");
    const { data: me } = await sb.from("wash_users")
      .select("phone,shop,name,role,pw_hash,active").eq("phone", ss.phone).maybeSingle();
    if (!me) throw new Error("계정을 찾지 못했습니다");
    if (!(await pwVerify(curPw, me.pw_hash))) throw new Error("지금 비밀번호가 맞지 않습니다");
    if (newPw && newPw.length < 6) throw new Error("새 비밀번호는 6자 이상으로 해 주세요");   // sb2: 다른 곳과 같게 6자
    if (newId && newId !== me.phone) {
      if (newId.length < 2 || newId.length > 20) throw new Error("아이디는 2~20자로 해 주세요");
      const { data: dup } = await sb.from("wash_users").select("phone").eq("phone", newId).maybeSingle();
      if (dup) throw new Error("이미 쓰고 있는 아이디입니다");
      await sb.from("wash_users").insert({
        phone: newId, shop: me.shop, name: me.name, role: me.role,
        pw_hash: newPw ? await pwHash(newPw) : me.pw_hash, active: true,
      });
      await sb.from("wash_sessions").delete().eq("phone", me.phone);
      await sb.from("wash_users").delete().eq("phone", me.phone);
      await sb.from("wash_shops").update({ owner_phone: newId }).eq("shop", me.shop);
      return { ok: true, relogin: true };
    }
    if (newPw) {
      await sb.from("wash_users").update({ pw_hash: await pwHash(newPw) }).eq("phone", me.phone);
      await sb.from("wash_sessions").delete().eq("phone", me.phone);
      return { ok: true, relogin: true };
    }
    return { ok: true, relogin: false };
  },

  /* 가입 코드 목록 — [] */
  inviteList: async (shop, _a, ss) => {
    hqOnly(shop, ss);
    const { data, error } = await sb.from("wash_invites")
      .select("phone,biz_name,memo,created_at,expires_at,used_at,used_shop")
      .order("created_at", { ascending: false }).limit(300);
    dbCheck(error, "가입 코드");
    return { ok: true, invites: data || [] };
  },

  /* 가입 코드 주기 — [휴대폰, 업체명, 메모, 며칠] */
  inviteAdd: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const phone = normPhone(a[0]);
    const bizName = String(a[1] || "").trim();
    const memo = String(a[2] || "").trim();
    const days = Math.max(1, Math.min(365, Number(a[3] || 30) || 30));
    const { data: u } = await sb.from("wash_users").select("phone,shop").eq("phone", phone).maybeSingle();
    if (u) throw new Error("이미 가입해서 쓰고 있는 번호입니다 (" + u.shop + ")");
    const { error: e2 } = await sb.from("wash_invites").upsert({
      phone, biz_name: bizName, memo,
      created_by: (ss && ss.phone) || "",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + days * 864e5).toISOString(),
      used_at: null, used_shop: null,
    });
    dbCheck(e2, "가입 코드");
    return { ok: true, phone, days };
  },

  /* 가입 코드 지우기 — [휴대폰] */
  inviteDel: async (shop, a, ss) => {
    hqOnly(shop, ss);
    const { error } = await sb.from("wash_invites").delete().eq("phone", normPhone(a[0]));
    dbCheck(error, "가입 코드");
    return { ok: true };
  },


  /* 우리 업체 로그인 계정 목록 — [] */
  userList: async (shop, _a, ss) => {
    ownerOnly(ss);
    const { data } = await sb.from("wash_users")
      .select("phone,name,role,active,last_login").eq("shop", shop);
    return { ok: true, users: data || [] };
  },

  /* 직원 로그인 계정 만들기 — [휴대폰, 이름, 권한, 비밀번호] */
  userAdd: async (shop, a, ss) => {
    ownerOnly(ss);
    const phone = normPhone(a[0]);
    const name = String(a[1] || "").trim();
    const role = normRole(a[2]);
    if (role === "admin") throw new Error("업체에서는 대표·매니저·직원 직급만 줄 수 있습니다");   // sb2
    const made = !a[3];
    const pw = String(a[3] || sixDigits());
    if (!name) throw new Error("이름을 넣어 주세요");
    if (pw.length < 6) throw new Error("비밀번호는 6자 이상으로 해 주세요");
    const { data: ex } = await sb.from("wash_users").select("phone,shop,name").eq("phone", phone).maybeSingle();
    if (ex) throw new Error(ex.shop === shop
      ? "이미 로그인 계정이 있는 번호입니다 (" + (ex.name || "") + ")"
      : "다른 업체에 이미 쓰고 있는 번호입니다");
    await needVerified(phone);                       // ← 본인 번호 확인
    /* 요금제에 걸린 계정 수를 넘지 않는지 확인합니다 */
    const { data: sh2 } = await sb.from("wash_shops").select("plan").eq("shop", shop).maybeSingle();
    if (sh2) {
      const { data: pl2 } = await sb.from("wash_plans").select("seats,name").eq("code", sh2.plan).maybeSingle();
      if (pl2 && Number(pl2.seats || 0) > 0) {
        const { data: cur } = await sb.from("wash_users").select("phone").eq("shop", shop).eq("active", true);
        if ((cur || []).length >= Number(pl2.seats))
          throw new Error(pl2.name + " 요금제는 계정을 " + pl2.seats +
            "개까지 쓸 수 있습니다. 쓰지 않는 계정을 지우거나 요금제를 올려 주세요");
      }
    }
    await sb.from("wash_users").insert({ phone, shop, name, role, pw_hash: await pwHash(pw) });
    await sb.from("wash_otp").delete().eq("phone", phone);
    /* 임시 비밀번호를 우리가 만들었으면 대표님께 한 번만 알려 드립니다 */
    return { ok: true, phone, name, role, pw: made ? pw : undefined };
  },

  /* 비밀번호 초기화 — [휴대폰, 새 비밀번호] */
  userPw: async (shop, a, ss) => {
    ownerOnly(ss);
    const phone = normPhone(a[0]);
    const made2 = !a[1];
    const pw = String(a[1] || sixDigits());
    if (pw.length < 6) throw new Error("비밀번호는 6자 이상으로 해 주세요");
    const { data: u } = await sb.from("wash_users").select("phone").eq("phone", phone).eq("shop", shop).maybeSingle();
    if (!u) throw new Error("우리 업체의 계정이 아닙니다");
    await sb.from("wash_users").update({ pw_hash: await pwHash(pw) }).eq("phone", phone);
    await sb.from("wash_sessions").delete().eq("phone", phone);
    return { ok: true, pw: made2 ? pw : undefined };
  },

  /* 이름·권한 고치기 — [휴대폰, 이름, 권한] */
  userEdit: async (shop, a, ss) => {
    ownerOnly(ss);
    const phone = normPhone(a[0]);
    const name = String(a[1] || "").trim();
    const role = normRole(a[2]);
    if (role === "admin") throw new Error("업체에서는 대표·매니저·직원 직급만 줄 수 있습니다");   // sb2
    const { data: u } = await sb.from("wash_users").select("phone,role").eq("phone", phone).eq("shop", shop).maybeSingle();
    if (!u) throw new Error("우리 업체의 계정이 아닙니다");
    if (u.role === "owner" && role !== "owner") {
      const { data: os } = await sb.from("wash_users").select("phone").eq("shop", shop).eq("role", "owner");
      if (!os || os.length <= 1) throw new Error("대표가 한 명은 있어야 합니다");
    }
    const patch: Record<string, unknown> = { role };
    if (name) patch.name = name;
    await sb.from("wash_users").update(patch).eq("phone", phone);
    /* sb2: 직급이 바뀌면 그 사람의 로그인을 모두 끊습니다 (예전 직급으로 계속 쓰지 못하게) */
    if (normRole(u.role) !== role) await sb.from("wash_sessions").delete().eq("phone", phone);
    return { ok: true };
  },

  /* 번호 바꾸기 — [옛 휴대폰, 새 휴대폰] */
  userPhone: async (shop, a, ss) => {
    ownerOnly(ss);
    const oldP = normPhone(a[0]), newP = normPhone(a[1]);
    if (oldP === newP) return { ok: true };
    const { data: u } = await sb.from("wash_users")
      .select("phone,shop,name,role,pw_hash,active").eq("phone", oldP).eq("shop", shop).maybeSingle();
    if (!u) throw new Error("우리 업체의 계정이 아닙니다");
    const { data: ex } = await sb.from("wash_users").select("phone").eq("phone", newP).maybeSingle();
    if (ex) throw new Error("이미 쓰고 있는 번호입니다");
    await needVerified(newP);                        // ← 바꿀 번호가 본인 것인지 확인
    await sb.from("wash_users").insert({ phone: newP, shop, name: u.name, role: u.role, pw_hash: u.pw_hash, active: u.active });
    await sb.from("wash_otp").delete().eq("phone", newP);
    await sb.from("wash_sessions").delete().eq("phone", oldP);
    await sb.from("wash_users").delete().eq("phone", oldP);
    await sb.from("wash_shops").update({ owner_phone: newP }).eq("shop", shop).eq("owner_phone", oldP);
    return { ok: true, phone: newP };
  },

  /* 로그인 계정 지우기 — [휴대폰] */
  userDel: async (shop, a, ss) => {
    ownerOnly(ss);
    const phone = normPhone(a[0]);
    if (ss && ss.phone === phone) throw new Error("지금 쓰는 계정은 지울 수 없습니다");
    const { data: u } = await sb.from("wash_users").select("phone,role").eq("phone", phone).eq("shop", shop).maybeSingle();
    if (!u) throw new Error("우리 업체의 계정이 아닙니다");
    if (u.role === "owner") {
      const { data: os } = await sb.from("wash_users").select("phone").eq("shop", shop).eq("role", "owner");
      if (!os || os.length <= 1) throw new Error("대표가 한 명은 있어야 합니다");
    }
    await sb.from("wash_sessions").delete().eq("phone", phone);
    await sb.from("wash_users").delete().eq("phone", phone);
    return { ok: true };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { return out({ __err: "요청을 읽지 못했습니다" }); }
  let hqRaw = false;              // sb15(보안 낮음 a): 원문 오류는 «본사 세션»일 때만 (shop 글자만 ADMIN 이면 안 됨)
  try {
    const shop = String(body.shop || "");
    const fn = String(body.fn || "");
    const args = Array.isArray(body.args) ? body.args : [];

    /* sb15(보안 W-M5): 고정 열쇠(ADMIN_TOKEN) 하나로 아무 업체 자료를 쓰던 importRows 를 없앴습니다. */

    // 로그인 전에 쓸 수 있는 기능 (인증번호 · 가입 · 로그인)
    /* sb11: payStart 는 이름이 둘 — 홈페이지 가입(로그인 없음 · OPEN)과 업체 카드 결제(로그인 · FN).
       예전에는 로그인한 화면이 불러도 늘 가입 쪽으로 가서 카드 결제가 «휴대폰 번호가 올바르지 않습니다» 로 막혔어요 →
       열쇠(token)를 보내면 로그인 쪽으로 */
    if (OPEN[fn] && !(FN[fn] && String(body.token || ""))) {
      /* sb2: 경비실이 서버끼리 부르면 손님 기기의 UA·IP 를 씁니다 (모두 같은 IP·PC 로 보이지 않게) */
      const via = internalOk(req) && body.__via === "cgg";
      const ctx = via
        ? { ua: String(body.__ua || "").slice(0, 300), ip: String(body.__ip || "0").slice(0, 64), via: "cgg", internal: true }
        : { ua: req.headers.get("user-agent") || "", ip: ipOf(req), internal: internalOk(req) };   // sb10: pay-hook 이 서버끼리 부르면 internal
      return out({ result: await OPEN[fn](args, ctx) });
    }

    // sb11: 체크 열쇠로 결제 창구 — 검사소에 이어 둔 워시 지갑으로만
    const tk = String(body.token || "");
    if (tk.startsWith("chk_") && CHECK_VIEW[fn]) {
      /* sb12: 체크 화면 잠금 안내·공지 — 검사소 사람 누구나. 지갑이 없으면 잠금은 «없음» */
      const cv = await checkPaySs(tk, shop, false);
      if (fn === "lockInfo" && !cv.wallet) return out({ result: { state: "ok", msg: "", notLinked: true } });
      if (fn === "lockInfo" && await payWaitOf(cv.wallet)) return out({ result: (await payWaitGate(cv.wallet, "zz", [], cv.ss)).block.__lock });
      return out({ result: await FN[fn](cv.wallet, args, cv.ss) });
    }
    if (tk.startsWith("chk_") && CHECK_PAY[fn]) {
      const cp = await checkPaySs(tk, shop);
      if (!cp.wallet) return out({ result: { ok: false, off: true, notLinked: true,
        note: "이 검사소는 아직 결제가 연결되지 않았어요. 차곳간(010-9559-3663)으로 연락해 주세요" } });
      const g = await payWaitGate(cp.wallet, fn, args, cp.ss);          // sb13: 지갑이 결제 대기면 같은 규칙
      if (g.block) return out(g.block);
      return out({ result: await FN[fn](cp.wallet, g.args || args, cp.ss) });
    }

    // 열쇠 확인 — 로그인해서 받은 임시 열쇠도 통합니다
    const ss: any = await sessionOf(tk);
    if (ss) { ss.ip = ipOf(req); ss.ua = String(req.headers.get("user-agent") || "").slice(0, 200); }   // sb12: 관리 기록용
    if (ss) {
      if (ss.shop !== shop) throw new Error("다른 업체의 자료는 볼 수 없습니다");
      hqRaw = ss.shop === "ADMIN";
      if (ss.shop !== "ADMIN") await needWash(ss.phone);     // sb2: 경비실 명단에서 워시를 빼면 바로 막힘
    } else {
      /* 예전 «업체 주소(?shop=&key=)» 방식은 잠겨 있습니다 — 로그인해서 쓰셔야 합니다 */
      if (!LEGACY_OK()) throw new Error("다시 로그인해 주세요 (예전 주소는 더 쓸 수 없습니다)");
      await checkShop(shop, tk);
    }
    /* ── sb13: 결제 대기 업체 — 체험판·결제만 ────────────── */
    let args2 = args;
    if (shop && shop !== "ADMIN") {
      const g = await payWaitGate(shop, fn, args, ss);
      if (g.block) return out(g.block);
      if (g.args) {
        args2 = g.args;
        if (fn === "lockInfo") return out({ result: Object.assign({}, (await payWaitGate(shop, "zz", [], ss)).block.__lock) });
        const f0 = FN[fn];
        if (!f0) return out({ __err: "지원하지 않는 기능입니다. 화면을 새로 고쳐 주세요." });
        return out({ result: await f0(shop, args2, ss) });
      }
    }
    /* ── 이용기간이 끝난 업체 — 보기 말고는 모두 멈춥니다 ────────────── */
    if (shop && shop !== "ADMIN" && !LOCK_OK[fn]) {
      const lk: any = await lockState(shop);
      if (lk.state !== "ok")
        return out({ __err: lockMsg(lk), __lock: Object.assign({}, lk, { msg: lockMsg(lk) }) });
    }

    // 대표가 직원 로그인 계정을 관리하는 기능
    if (UFN[fn]) return out({ result: await UFN[fn](shop, args, ss) });

    const f = FN[fn];
    if (!f) return out({ __err: "지원하지 않는 기능입니다. 화면을 새로 고쳐 주세요." });
    return out({ result: await f(shop, args, ss) });
  } catch (e) {
    const em = e instanceof Error ? e.message : String(e);
    /* sb14: 본사(관리) 말고는 영어·코드·원문을 숨김 */
    return out(hqRaw ? { __err: em, __raw: true } : { __err: em });
  }
});
