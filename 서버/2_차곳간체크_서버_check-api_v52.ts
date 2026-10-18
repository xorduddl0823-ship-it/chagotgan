// ============================================================
//  차곳간체크 — 수파베이스 Edge Function  check-api
//  차곳간 wash-api 와 같은 프로젝트에 따로 둡니다. wash-api 는 손대지 않습니다.
//  부르는 방식은 wash-api 와 똑같습니다:  POST { shop, token, fn, args:[...] }
//
//  배포:
//    supabase functions deploy check-api --no-verify-jwt
//  비밀값 (서버에만 둡니다) — 전부 티와이컴퍼니(차곳간) 것 하나로 공용:
//    ANTHROPIC_KEY, ANTHROPIC_MODEL(기본 claude-haiku-5.5), AI_MAX_DAY(기본 200)
//      ← 사진 읽기 (차곳간워시와 같은 열쇠 · 같은 방식)
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//    POPBILL_LINKID, POPBILL_SECRET(또는 POPBILL_SECRETKEY)  ← 티와이컴퍼니 연동신청 값
//    SOLAPI_KEY, SOLAPI_SECRET              ← 티와이컴퍼니 솔라피 계정
//  검사소마다 다른 값은 비밀값이 아니라 check_office 표에 둡니다:
//    biz_no(사업자번호) · popbill_userid(팝빌 회원아이디) · sms_from(보내는 번호)
//  v52 (2026-10-18): 체크 방 요청(대조표 E) — 설정 › 알림 «보낸 기록» 카드용 sendLogList({from, to, tpl, result}):
//    대표만 · 발송 기록(cgg_sendlog)에서 이 검사소(product check · shop = 검사소 코드) 것만 · 92일까지 · 1000줄.
//    받는 번호는 가린 모양만 · 본문 없음(템플릿 이름 · 방식 · 결과 · 쉬운 말 오류). 워시 보낸 기록 화면과 같은 칸 이름. SQL 없음.
//  v51 (2026-10-18): 대표님 «미수금 한꺼번에 보내기»(서버/설계/30 A안 · SQL 없음) — billBundleList({dealerId}) ·
//    billBundleSend({dealerId, ids, due, test}): 한 딜러의 덜 받은 청구서 여러 달을 «가장 최근 달 청구서» 보기 주소로 한 통 ·
//    #{기간} «2026년 8~10월» · #{금액} = 남은 금액 합 · 달마다 보냄 표시 · invoiceView 답에 unpaid(밀린 달 목록 · 보낸 달만) 더함.
//    문자 단문/장문 판단을 45글자 → 90바이트(한글 2 · 영문·숫자 1)로 (⑦ 확정 문구가 단문으로 가게).
//  v50 은 v49.2(재검사 대체 문자에 «차량 목록 https://check.cgg.co.kr/r/?c=열쇠») 를 품음.
//  v50 (2026-10-18): 총괄 «대체 문자 전부» — 재검사 대체 문구를 알림톡/12 ⑦ 확정본으로(«만료» · 87바이트 단문) ·
//    재검사 «매일 자동»을 알림톡 승인 전에도 켜고 돌림(그동안은 대체 문구 문자 · 문자 비용 늚). 다른 알림은 이미 늘 문자 대체. SQL 없음.
//  v49.1 (2026-10-18): 핵심 흐름 다시 검토(대표님 «배달·청구서·입금 오류 나면 안 됨») — 팝빌 계좌조회(bankPull)가
//    «같은 줄 막기 규칙»(SQL 15 ③)에 기대던 upsert 를 엑셀 넣기(v41)처럼 «먼저 거르고 그냥 넣기»로 · 넣지 못한 건은 bad 로 알림
//    (예전엔 규칙이 없으면 오류가 조용히 버려져 팝빌 입금이 0건). SQL 없음.
//  v49 (2026-10-18): 카모두 상사명부·딜러명부 한꺼번에 넣기(워시 v134 와 같은 기능) — partnerImport({companies, dealers, dryRun})
//    대표만 · 이 검사소만 · 회사코드 등 정한 칸 말고는 받지도 저장하지도 않음 · 이미 있으면 빈 칸만 채움(덮어쓰지 않음) ·
//    상사는 이름으로, 딜러는 이름+상사로 같은지 봄 · dryRun 이면 세기만. SQL 없음.
//  v48 (2026-10-18): 체크 v54 요청(대표님 TEST) — ① 거래처에 안 이어진 차(dealer_id 빈 차)도 «신청인»(dealer_text)마다 청구서
//    (bill_to_id 비움 · 계산서·보내기는 거래처에 넣은 뒤) ② invoiceDel 로 그 달을 다 지우면 invoiceList(auto)가 다시 만들지 않음
//    (다시 만들기는 «청구서 만들기»로만) ③ 매출 보험료는 엑셀 «성능보험료» 그대로(서버가 부가세를 더하지 않음 · 확인만). SQL 없음.
//  v47 (2026-10-18): 대표님 결정 «입금 전 세금계산서 발급은 아예 없음» — v46 의 opt.unpaidOk 예외 길을 없앰.
//    taxIssue 는 청구 금액이 다 입금된 청구서만 발급(아니면 무조건 거절 · 넘겨준 opt 는 읽지 않음). SQL 은 v46 과 같음(20 의 tax_unpaid_ok_at 칸은 안 씀).
//  v46 (2026-10-18): 체크 v52 세금계산서·전산외(대표님 «세금계산서 매우매우 중요») —
//    ① 세금계산서는 입금한 곳만: taxList 줄마다 paid·left · taxIssue 는 남은 금액이 있으면 서버에서도 막음
//       (예외: 대표가 opt.unpaidOk 로 고른 청구서만 · «입금 전 발급» 표시 tax_unpaid_ok_at + 기록, 표시를 못 남기면 발급 안 함)
//    ② 전산외(나스 엑셀): 엑셀 금액(부가세 포함) 그대로 · 계산서발행(Y/N)·사유 저장(tax_yn·tax_note) · N 은 세금계산서 금액에서 뺌 ·
//       salesStat 은 ext 를 따로(fee 에서 뺌) · total = fee + ext + rep
//    ④ check_office.ins_vat(«미포함» 기본 / «포함») — officeGet/Save · salesStat insTotal(부가세 포함 보험료)
//    ⑤ salesStat 달마다 made(청구서 수) · taxN(발급한 세금계산서 수). 먼저 서버/sql/20(없어도 돌아감 · Y/N·표시·설정만 안 됨).
//  v45 (2026-10-18): 체크 v50 «준비 중» 단추(체크/요청서/2026-10-18_v50_단추_서버_요청.md) — 모두 대표만 · 이 검사소 것만
//    invoiceDel({ids,ym}) 발급·입금된 청구서는 남기고 까닭 · invoiceUnsend({ids}) 보낸·열어본 시각 비움 ·
//    tplInfo() 알림톡 템플릿은 본사(관리) 값이라 체크는 보기만(tplSave 는 거절) · feeRules({on,rules}) 검사자 수수료 저장/불러오기 ·
//    smsConf({url,pw}) 문자 수집함 주소·비밀번호 저장(비밀번호는 서버에만 · 돌려줄 때 «넣음» 표시만). 먼저 서버/sql/19(없으면 ④⑤만 안 됨).
//  v44 (2026-10-18): 가온 검사비 바로잡기(체크/요청서/2026-10-18_검사비_단가_서버_요청.md · 운영/04 맨 위) —
//    단가는 코드가 같거나, 코드가 비었으면 이름이 같은 항목 · «금액÷1.1−보험료» 대신 셈 없앰: 선납·재검·가성능 0원 ·
//    수출 가성능 = 차마다 손 입력(check_car.fee_manual · carFeeSet 대표만) · 모르는 상품명 0원 + unknown:[{goods,n}] ·
//    priceSave 0원 허용. invoiceBuild · salesStat 같은 셈(unitOf). 먼저 서버/sql/18(없어도 돌아감 · 손 입력만 안 됨).
//  v43 (2026-10-18): 체크 방 TEST — 입금을 맞출 때 서버가 «미분류 → 검사비» 로 바꾼 갈래는 되돌리기(depositUnapply) 때 «미분류» 로 돌려놓음
//    (kind_auto 표시 · 사람이 «갈래 바꾸기» 로 고른 값은 그대로 · 자동 맞추기도 같음). 먼저 서버/sql/16(없으면 지금처럼 «검사비» 로 남음).
//  v42 (2026-10-18): TEST «국세청에 연결하지 못했어요» — 연결 실패를 짧은 갈래(hdr·dns·tls·conn·timeout·net)로 나눠 기록·화면 글 끝에 남김(열쇠·주소·원문 없음) ·
//    열쇠 앞뒤 줄바꿈·따옴표 뗌 · 머리글 방식이 연결 실패(hdr·net·conn)여도 주소 방식으로 한 번 더 · 8초 넘으면 끊음. SQL 없음.
//  v41 (2026-10-18): TEST «은행 거래내역 엑셀 가져오기» 실패 고침 — depositImport 는 겹침 막기 규칙(office_id,uniq_key)에 기대지 않고 그냥 넣음
//    (겹침은 이미 미리 거름 · 그새 겹치면 한 줄씩 다시) · 계좌(bankId 보내면 이 검사소 것인지 확인 · 안 보내면 쓰는 계좌가 하나일 때 그 계좌)·잔액(balance) 채움 ·
//    실패하면 화면에 «까닭» 갈래(빈 칸 제한·값 제한·연결 제한·중복·표 모양·연결)를 쉬운 말로. 먼저 서버/sql/15(없어도 계좌가 하나면 대개 돌아감).
//  v40 (2026-10-18): 체크 v48 «단가 구간» 약속(체크/기획/2026-10-18_v48_단가_창구_약속.md) — priceList · priceSave(대표만) · priceDel(대표만 · 하나는 남김)
//    · invoiceRows 는 이 검사소 청구서인지 먼저 확인(체크 방 지적) · deliv_photo 도 이 검사소 배달 사진만 · 국세청 열쇠 풀기 실패는 그대로 씀. SQL 없음.
//  v39 (2026-10-18): TEST 결과 — 등록증 아래 «E-mail·전화·팩스» 작은 표·도장·손글씨 칸도 읽기(팩스 말고 전화) ·
//    이메일·전화를 답 전체 글에서 다시 고르기 · bizVerify 열쇠는 머리글 먼저, 열쇠 오류면 주소 방식으로 한 번 더(이중 인코딩 막음) ·
//    열쇠 미등록이면 «아직 등록 중이거나 맞지 않아요». SQL 없음.
//  v38 (2026-10-18): 체크 v47 «입금 내역» 약속(체크/기획/2026-10-18_입금처리_창구_약속_초안.md) · 먼저 서버/sql/14(없어도 돌아감)
//    · depositApply·depositUnapply·depositKind(대표·직원 · 하루 300) · depositDel·depositRestore·depositTrash·depositImport(대표만)
//    · 모두 이 검사소 것만 · 섞이면 전체 거절 · 맞추기/되돌리기는 조건부로 먼저 잡기 · 금액은 check_invoice_add_paid(SQL 13)로 한 번에
//    · 손으로 되돌린 입금(hold)은 자동 맞추기가 다시 잡지 않음 · 입금확인 알림은 입금마다 한 번(notice_at)
//    · 은행 엑셀 ↔ 팝빌 겹침: 같은 검사소·한국 날짜·금액·보낸 분(공백·(주) 뗌)이면 겹침 — 엑셀 넣기와 팝빌 조회 양쪽에서 막음(force 줄은 넣음)
//    · depositList 는 «지움» 을 빼고 줌
//  v37 (2026-10-18): 10/18 시험 — 비스듬히 찍은 법인 사업자등록증(업태·종목 7줄 · 긴 주소)이 «읽지 못했습니다»
//    → 명함·사업자등록증 읽기는 답 길이를 넉넉히(1500 · 번호판은 500 그대로) · 답에서 { … } 만 잘라 읽음 ·
//    읽는 글에 «업태·종목이 여러 줄이면 첫 줄만 · 주소는 한 줄로» 더함. SQL 없음.
//    · 사업자등록증에서 openDate(개업일 YYYYMMDD)·tel(지역번호·1588 도)·email(모양으로 다시 골라냄) 도 읽음 · 명함 이메일도 같은 규칙
//    · 새 창구 bizVerify({bizNo, ceo?, openDate?}) — 국세청 상태(계속·휴업·폐업·없음)·폐업일·진위(match) · 대표만 · 하루 100 ·
//      열쇠 NTS_API_KEY 가 없거나 국세청이 안 되면 ready:false(«확인 준비 중») — 저장은 막지 않음
//  v36 (2026-10-18): 체크 v46 «거래처 한 화면» 약속(체크/기획/2026-10-18_v46_거래처_한화면_창구_약속.md) · 먼저 서버/sql/13
//    · partnerCaps() → {later, more, last} · issuer_kind «later»(나중에) 받음 — 청구서 만들기는 지금처럼 company 로 셈, 홈택스는 «정보 없음»
//    · more: 상사 addr·email·upte·jongmok / 딜러 issuer_email·issuer_upte·issuer_jongmok (보냈을 때만 저장) → 홈택스 받는 쪽 이메일·업태·종목
//    · last: dealers() 줄마다 last_date(마지막 검사일) · 입금 금액 더하기는 SQL 함수로 한 번에(check_invoice_add_paid · 없으면 예전 방식)
//    · 입금확인 알림톡 확인일시 «10월 18일 14:30» 모양(알림톡 방 제안)
//  v35 (2026-10-18): 대표님 «체크에도 청구서·결제 알림톡 다» — 입금이 청구서에 자동으로 맞춰지면 «차곳간_입금확인»(tpl.deposit_ok)을
//    그 청구처 등록 번호로 한 번(원문 그대로 · 변수만 · 청구서 보내기 하루 상한). 결제완료·충전완료·잔액·기한 안내는 체크 결제가 워시 지갑으로 돌아
//    워시 서버가 이미 보냄(서버/설계/24 표).
//  v35 (2026-10-18): 요청서 C(운영/요청서/2026-10-18_08) — 거래처 화면의 명함·사업자등록증 사진 읽기 aiCard·aiBiz 를 대표만 ·
//    검사소당 하루 한도 따로(CHECK_AI_DOC_DAY, 기본 60 · 번호판 한도 AI_MAX_DAY 와 함께 셈) · 사진 크기 상한(6MB) · png/webp 도 받음 ·
//    아무 글이나 시키는 aiJson 도 대표만 · 같은 한도 · 돌려주는 칸은 정해진 이름만(길이 자름) · 오류 글은 «사진을 읽지 못했습니다. 직접 적어 주세요» 쪽(번호판 말 안 섞임). 답 모양은 그대로(JSON 글자). SQL 없음.
//  v34 (2026-10-17): 대표님 결정(운영/06 M) — 차량 도착 알림은 이미 승인된 «차곳간_출고안내»(관리 설정 tpl.release) 템플릿으로.
//    순서: tpl.check_arrive → tpl.release → 검사소 ata_tpl → 문자. 본문 글은 솔라피 원문 그대로, 변수만 채움
//    (딜러명·상사명(없으면 개인)·차량번호·작업내용 «성능점검 · 배달»·목적지·출고일시=도착 시각·업체전화·업체명·보기코드).
//    버튼 https://app.cgg.co.kr/v.html?c=#{보기코드} → 보기코드는 «d» + 배달 열쇠글(18자). v.html 이 d 로 시작하면 deliv_view 로 엶.
//    딜러 등록 대기(체크 방 설계 · 보안 의견 ①~⑨): delivPendingDealers() · delivApproveDealer({name, tel, dealerId?, companyId?, resend}|[…20줄])
//    · delivRejectDealer({name, tel}|[…]) — 대표만 · 최근 14일 «등록된 딜러 번호가 아님» 기록에 실제로 있는 이름·번호만 ·
//    다시 보내기는 그 번호 · 24시간 · 이미 보낸 건 건너뜀 · 하루 상한(notifyOne) · check_log 기록(번호 가림)
//    거래처(운영/06 N · 체크 v44 약속): companies() · companySave · companyDel · dealerDel(active=false) 새로, dealerSave 는 대표만 ·
//    상사·청구처는 이 검사소 것만 · 휴대폰 010 모양 · 추가 번호는 보냈을 때만 고침 · 감사 기록. dealers()·dealerTelOk 는 지운 딜러 뺌.
//    대체 문자의 [사진 주소]도 https://app.cgg.co.kr/v.html?c=d+열쇠 (운영 체크 사이트 /d/ 화면에 기대지 않음).
//    deliv_view: «d» 붙은 열쇠도 받음 · 한 아이피 하루 상한(CHECK_VIEW_IP_MAX, 청구서 보기와 같은 값). 대체 문자 글은 그대로(사진 주소만 바뀜). SQL 없음.
//  v31 (2026-10-15): 오픈 베타 말 다듬기 (규칙 4-1) — 오류 글은 표준형, 영어·코드·데이터베이스 원문은 숨기고 기록에만(userMsg). 새 창구 없음.
//  v30 (2026-10-15): 보안 방 관리 통합 검토 ④ — 본사가 기사 비밀번호를 임시 비밀번호로 바꾸면(check_deliv_driver.must_change)
//    로그인은 되지만 비밀번호를 바꾸기 전까지 다른 기사 기능은 막힘(mustChange: true). 먼저 서버/sql/08 실행(칸 없으면 예전과 같음).
//  v29 (2026-10-15): 규칙 5-6 — 차량 도착 알림은 템플릿이 있으면 늘 알림톡 먼저 · 대신 보내기 늘 켜짐 · 대신 보낼 문자 글 넣음.
//    템플릿: 관리 설정 wash_hq.ata_cfg.tpl.check_arrive(본사 채널) → 없으면 검사소 설정 ata_tpl. 둘 다 없으면 지금처럼 문자.
//    사무실 첫 비밀번호 확인 번호도 차곳간_인증번호(tpl.auth) 알림톡 먼저.
//  v28 (2026-10-15): 보안 방 재검사(v26) 권고 — 첫 비밀번호 확인을 login 이 준 무작위 tick 과 짝 지어야만 받음
//    (남이 중간에 login 을 다시 해서 자기 비밀번호로 바꿔치기하는 길을 막음). sql/04 다시 실행(tick 칸 추가).
//  v27 (2026-10-15): 보안 방 보류 사유 ③ — 직원 권한에서 자기 자신의 「비밀번호초기화」를 막음
//    (자기 비밀번호 바꾸기는 기존 비밀번호 확인이 있는 따로 창구로 — 다음 판). 새 SQL 없음.
//  v26 (2026-10-15): 보안 방 요청 — 사무실 로그인(login) 5번 틀리면 10분 잠금(check_deliv_attempt 재사용, 열쇠 office:번호).
//    비밀번호가 빈 계정(새 직원 · 초기화)은 처음 비밀번호(6자 이상)를 문자 6자리 확인 뒤에 정함 → 새 창구 loginCode.
//    배포 전에 서버/sql/02 와 서버/sql/04_체크_첫비밀번호_문자확인.sql 실행. 문자 보내는 번호는 비밀값 SMS_FROM(워시와 같은 이름) → 없으면 검사소 sms_from.
//  v25 (2026-10-15): 체크 방 요청(2026-10-15) — 「직원 권한」 창구 staffList · staffAdd · staffEdit (대표만). 새 SQL 없음.
//    직원은 비밀번호 없이 넣고 처음 로그인 때 정함(지금 로그인 규칙 그대로). 자기 자신을 멈추거나 대표 권한을 빼지 못함.
//    경비실 명단(cgg_access): 그 번호가 이미 명단에 있으면 check 를 더하고/빼고, 없으면 만들지 않음(체크 로그인은 그대로 됨).
//  v24 (2026-10-15): 체크 방 요청(2026-10-14) — 「가온」 고정값 정리. 새 SQL 없음.
//    ① 관리(ADMIN) 계정이 검사소를 안 고르면 가온으로 열지 않고 「검사소를 골라 주세요」
//    ② 사진 읽기(aiJson·aiPlate·aiCard·aiBiz)는 검사소를 모르면 거절 (가온 한도를 대신 쓰지 않음)
//    ④ 예전 자료 가져오기(importLegacy)는 가온(GAON) 검사소만 — 화면에서 숨기는 것과 별도로 서버가 막음
//    (③ 기사를 검사소까지 보고 찾기는 v22·v23 에서 끝)
//  v23 (2026-10-15): 배포 전에 서버/sql/02_체크_기사_로그인_보안.sql 을 SQL Editor 에서 한 번 실행해야 합니다.
//    기사 로그인 5번 틀리면 10분 잠금 · 같은 이름은 회사 기사 비밀번호로 구분 · 새 비밀번호 6자 이상 ·
//    사무실 기사 목록에 「가입신청」 표시 (보안 재검사 2026-10-14 A·B·C)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const VER = "check-api v52 · 2026-10-18 (보낸 기록)";
const JSON_HEAD = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" };

/* ───────── 작은 도구들 ───────── */
const S = (v: unknown) => String(v ?? "").trim();
const N = (v: unknown) => Math.round(Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0);
const norm = (v: unknown) => S(v).replace(/\s|\(주\)|㈜|주식회사/g, "");
const ymOf = (d: string) => S(d).slice(0, 7);
function ok(result: unknown) { return new Response(JSON.stringify({ result }), { headers: JSON_HEAD }); }
function err(message: string, code = 200) {
  return new Response(JSON.stringify({ __err: message }), { status: code, headers: JSON_HEAD });
}

/* ───────── 로그인 · 권한 ─────────
   차곳간(wash) 계정을 그대로 씁니다. 세션 열쇠(sid)로 사람을 찾고,
   그 사람이 들어갈 수 있는 검사소(office)를 돌려줍니다. */
/* ───────── 비밀번호 섞기 (PBKDF2) ───────── */
async function pwHash(pw: string, saltHex = "") {
  const salt = saltHex ? hex2b(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return b2hex(salt) + "$" + b2hex(new Uint8Array(bits));
}
async function pwOk(pw: string, stored: string) {
  const [saltHex, want] = S(stored).split("$");
  if (!saltHex || !want) return false;
  const made = await pwHash(pw, saltHex);
  return made.split("$")[1] === want;
}
function b2hex(b: Uint8Array) { return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function hex2b(h: string) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

/** 사무실 로그인 시도 횟수 — 비밀번호를 보기 전에 올립니다 (기사 로그인과 같은 함수 · 5번 틀리면 10분 잠금) */
async function officeAttempt(key: string) {
  const { data, error } = await db.rpc("check_deliv_attempt", { p_key: key });
  if (error) throw new Error("서버를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  if (data === false) throw new Error("비밀번호를 여러 번 틀려 10분 동안 잠겼습니다. 잠시 뒤 다시 해 주세요.");
}
async function officeAttemptOk(key: string) {
  await db.from("check_deliv_fail").delete().eq("key", key);
}
/* v29: 본사 알림톡 설정 (워시 서버와 같은 칸 wash_hq.ata_cfg · 1분 기억) — 비어 있으면 문자 */
let _ata: { at: number; pf: string; tpl: Record<string, string> } = { at: 0, pf: "", tpl: {} };
async function hqAta() {
  if (Date.now() - _ata.at < 60000) return _ata;
  let c: any = {};
  try { const { data } = await db.from("wash_hq").select("ata_cfg").eq("id", 1).maybeSingle(); c = (data && data.ata_cfg) || {}; }
  catch (_) { /* 칸이 없으면 문자 */ }
  const tpl: Record<string, string> = {};
  Object.keys((c && c.tpl) || {}).forEach((k) => { const v = S(c.tpl[k]); if (v) tpl[k] = v; });
  _ata = { at: Date.now(), pf: S(c.pfId) || S(Deno.env.get("PF_ID")), tpl };
  return _ata;
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

/** 확인 번호가 필요할 때 — 화면이 확인 번호 칸을 열 수 있게 __need: "code" 를 함께 보냅니다 */
class NeedCode extends Error { need = "code"; tick = ""; }
const FIRST_PW_MIN = 6;
const FIRST_CODE_MIN = 5;
async function sha256hex(s: string) {
  return b2hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function usersOf(phone: string) {
  const { data: users } = await db.from("check_user")
    .select("id, office_id, phone, name, role, active, pw_hash, check_office(*)")
    .eq("phone", phone).eq("active", true);
  if (!users?.length) throw new Error("들어갈 수 있는 검사소가 없습니다. 대표님께 권한을 받아 주세요.");
  return users;
}
function pickUser(users: any[], shopCode: string) {
  const code = S(shopCode).toUpperCase();
  return code ? users.find((u: any) => S(u.check_office?.code).toUpperCase() === code) ?? users[0] : users[0];
}
async function openSession(phone: string, me: any, users: any[], ua: string, first: boolean) {
  const sid = "chk_" + b2hex(crypto.getRandomValues(new Uint8Array(24)));
  const exp = new Date(Date.now() + 14 * 86400000).toISOString();
  await db.from("check_session").delete().eq("phone", phone);
  await db.from("check_session").insert({
    sid, phone, office_id: me.office_id, role: S(me.role) || "staff",
    ua: S(ua).slice(0, 250), expires_at: exp,
  });
  await db.from("check_user").update({ last_in: new Date().toISOString() }).eq("id", me.id);
  return {
    ok: true, key: sid, expires: exp,
    who: S(me.name) || phone, role: S(me.role) || "staff",
    shop: S(me.check_office?.code), shopName: S(me.check_office?.name),
    offices: users.map((u: any) => ({ code: S(u.check_office?.code), name: S(u.check_office?.name) })),
    first,
  };
}

/** 로그인 — [휴대폰, 비밀번호, (검사소코드)]
 *  v26: 5번 틀리면 10분 잠금. 비밀번호를 아직 안 정한 분은 휴대폰 문자 확인 뒤에 정해집니다 (loginCode). */
async function login(_c: Ctx, phoneRaw: string, pwRaw: string, shopCode = "", ua = "") {
  const phone = S(phoneRaw).replace(/[^0-9]/g, "");
  const pw = S(pwRaw);
  if (phone.length < 10) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  if (pw.length < 4) throw new Error("비밀번호는 4자 이상으로 적어 주세요.");
  await officeAttempt("office:" + phone);

  const users = await usersOf(phone);
  const me: any = pickUser(users, shopCode);

  if (!S(me.pw_hash)) {
    /* 처음 비밀번호 — 바로 정하지 않고 휴대폰으로 확인 번호를 보냅니다 (번호를 아는 다른 사람이 먼저 정하지 못하게) */
    if (pw.length < FIRST_PW_MIN) throw new Error(`처음 정하는 비밀번호는 ${FIRST_PW_MIN}자 이상으로 적어 주세요.`);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const tick = "t_" + b2hex(crypto.getRandomValues(new Uint8Array(16)));   // v28: 이 화면과 짝
    await db.from("check_pw_first").delete().eq("phone", phone);
    const { error } = await db.from("check_pw_first").insert({
      phone, tick, user_id: S(me.id), code_hash: await sha256hex(phone + ":" + code), pw_hash: await pwHash(pw),
      expires_at: new Date(Date.now() + FIRST_CODE_MIN * 60000).toISOString(),
    });
    if (error) throw new Error("서버를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
    /* v32(보안 M1): 확인 번호 틀린 횟수(pwcode:)는 되돌리지 않음 · 번호당 하루 확인 문자 5번까지 */
    /*      (SQL 11 전이라 한도 함수가 없으면 막지 않음 — 틀린 횟수 잠금은 그대로 걸림) */
    if (!(await rateOk("pwsms:" + phone + ":" + ymdK(kstNow()), Number(env("CHECK_PWSMS_DAY", "5")))))
      throw new Error("오늘은 확인 문자를 더 보낼 수 없습니다. 내일 다시 해 주시거나 대표님께 말씀해 주세요.");
    const from = (Deno.env.get("SMS_FROM") ?? "").replace(/[^0-9]/g, "") || S(me.check_office?.sms_from).replace(/[^0-9]/g, "");
    if (!from) throw new Error("문자 보내는 번호가 서버에 없습니다. 대표님께 알려 주세요.");
    try {
      /* v29: 알림톡 먼저 (차곳간_인증번호) — 안 되면 문자 */
      const ha = await hqAta();
      let sentAta = false;
      if (ha.tpl.auth && ha.pf) {
        try {
          const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [{ to: phone, from,
            text: `[차곳간] 인증번호 ${code} (${FIRST_CODE_MIN}분 안에 입력)`,
            kakaoOptions: { pfId: ha.pf, templateId: ha.tpl.auth, disableSms: false,
              variables: { "#{인증번호}": code, "#{유효시간}": String(FIRST_CODE_MIN) } } }] },
            { shop: S(me.check_office?.code), tpl: "auth", ref: "첫 비밀번호" });
          sentAta = !(r.failedMessageList || []).length;
          if (!sentAta) console.error("first-pw ata failed", JSON.stringify((r.failedMessageList || [])[0]).slice(0, 200));
        } catch (e2) { console.error("first-pw ata", e2); }
      }
      if (!sentAta)
        await solapi("POST", "/messages/v4/send-many/detail", { messages: [{ to: phone, from, type: "SMS",
          text: `[차곳간체크] 확인 번호 ${code} (${FIRST_CODE_MIN}분) — 본인이 로그인한 게 아니면 넣지 마세요` }] },
          { shop: S(me.check_office?.code), tpl: "auth_sms", ref: "첫 비밀번호" });
    } catch (e) {
      console.error("first-pw sms", e);
      throw new Error("확인 문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
    const nc = new NeedCode("처음 쓰는 비밀번호예요. 휴대폰으로 보낸 확인 번호 6자리를 넣어 주세요.");
    nc.tick = tick;
    throw nc;
  }
  if (!(await pwOk(pw, me.pw_hash))) throw new Error("번호 또는 비밀번호가 맞지 않습니다.");
  await officeAttemptOk("office:" + phone);
  return await openSession(phone, me, users, ua, false);
}

/** 처음 비밀번호 확인 — [휴대폰, 확인번호 6자리, tick(login 이 준 값), (검사소코드)] → 맞으면 login 때 적은 비밀번호가 정해지고 바로 들어갑니다
 *  v28: tick 이 다르면(다른 화면에서 login 을 다시 했으면) 받지 않습니다 */
async function loginCode(_c: Ctx, phoneRaw: string, codeRaw: string, tickRaw = "", shopCode = "", ua = "") {
  const phone = S(phoneRaw).replace(/[^0-9]/g, "");
  const code = S(codeRaw).replace(/[^0-9]/g, "");
  if (phone.length < 10) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  await officeAttempt("pwcode:" + phone);
  const { data: t } = await db.from("check_pw_first").select("*").eq("phone", phone).maybeSingle();
  if (!t || new Date(S(t.expires_at)).getTime() < Date.now()) {
    if (t) await db.from("check_pw_first").delete().eq("phone", phone);
    throw new Error("확인 시간이 지났습니다. 처음부터 다시 로그인해 주세요.");
  }
  if (!S(t.tick) || !sameText(S(tickRaw), S(t.tick)))
    throw new Error("다른 곳에서 다시 로그인했습니다. 처음부터 다시 로그인해 주세요.");
  if (!sameText(await sha256hex(phone + ":" + code), S(t.code_hash)))
    throw new Error("확인 번호가 맞지 않습니다.");
  await db.from("check_pw_first").delete().eq("phone", phone);
  await officeAttemptOk("pwcode:" + phone);
  await officeAttemptOk("office:" + phone);
  const users = await usersOf(phone);
  const me: any = users.find((u: any) => S(u.id) === S(t.user_id)) ?? pickUser(users, shopCode);
  if (S(me.pw_hash)) throw new Error("이미 비밀번호가 정해진 계정입니다. 그 비밀번호로 로그인해 주세요.");
  await db.from("check_user").update({ pw_hash: t.pw_hash }).eq("id", me.id);
  return await openSession(phone, me, users, ua, true);
}

/** 나가기 */
async function logout(ctx: Ctx, key: string) {
  await db.from("check_session").delete().eq("sid", S(key));
  void ctx; return { ok: true };
}

/** 체크를 써도 되는 계정인지 경비실 명단으로 확인합니다.
 *  - 명단에 있으면: active 이고 products 에 check 가 있어야 통과
 *  - 명단에 없으면: 체크 자체 로그인(chk_)은 예전처럼 통과, 워시 로그인 열쇠로는 거절
 *    (워시만 가진 계정이 워시 열쇠로 체크를 부르는 길을 막습니다) */
async function needCheck(phone: string, ownLogin: boolean) {
  const { data: acc, error } = await db.from("cgg_access")
    .select("products, active").eq("phone", phone).maybeSingle();
  if (error) {
    if (ownLogin) return;
    throw new Error("서버를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  }
  if (!acc) {
    if (ownLogin) return;
    throw new Error("이 계정은 체크를 쓸 권한이 없습니다. 대표님께 권한을 받아 주세요.");
  }
  const list: string[] = Array.isArray(acc.products) ? acc.products : [];
  if (acc.active === false || !list.includes("check"))
    throw new Error("이 계정은 체크를 쓸 권한이 없습니다. 대표님께 권한을 받아 주세요.");
}

async function whoIs(shop: string, token: string) {
  const sid = S(token);
  if (!sid) throw new Error("로그인이 필요합니다.");

  let phone = "", isAdmin = false;

  // ① 차곳간체크 자체 로그인
  if (sid.startsWith("chk_")) {
    const { data: cs } = await db.from("check_session")
      .select("sid, phone, office_id, role, expires_at").eq("sid", sid).maybeSingle();
    if (!cs) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    if (cs.expires_at && new Date(cs.expires_at).getTime() < Date.now())
      throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    phone = S(cs.phone).replace(/[^0-9]/g, "");
  } else {
    // ② 차곳간(워시) 로그인도 그대로 받습니다
    const { data: ses } = await db.from("wash_sessions")
      .select("sid, phone, shop, role, expires_at").eq("sid", sid).maybeSingle();
    if (!ses) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    if (ses.expires_at && new Date(ses.expires_at).getTime() < Date.now())
      throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    phone = S(ses.phone).replace(/[^0-9]/g, "");
    isAdmin = S(ses.shop).toUpperCase() === "ADMIN";
  }

  // ①-2 경비실 출입 명단(cgg_access) — 체크 권한이 있는 계정만 (v22)
  if (!isAdmin) await needCheck(phone, sid.startsWith("chk_"));

  // ② 어느 검사소로 들어갈지 — 화면이 보낸 shop(검사소 코드)이 없으면 그 사람의 첫 검사소
  let office: any = null;
  const code = S(shop).toUpperCase();
  if (code) {
    const { data } = await db.from("check_office").select("*").eq("code", code).maybeSingle();
    office = data;
  }
  if (!office) {
    const { data: mine } = await db.from("check_user")
      .select("office_id, role, check_office(*)").eq("phone", phone).eq("active", true).limit(1);
    office = mine?.[0]?.check_office ?? null;
  }
  if (!office) {
    if (!isAdmin) throw new Error("들어갈 수 있는 검사소가 없습니다. 대표님께 권한을 받아 주세요.");
    /* v24: 예전에는 가온(GAON)으로 열었습니다. 다른 검사소 자료가 섞이지 않게 직접 고르게 합니다 */
    throw new Error("검사소를 골라 주세요. (관리 계정은 들어갈 검사소 코드를 함께 보내야 합니다)");
  }
  if (!office) throw new Error("검사소를 찾지 못했습니다.");

  // ③ 그 검사소에 들어갈 수 있는 사람인지 (차곳간 본사 ADMIN 은 모두 가능)
  let role = "staff";
  if (isAdmin) role = "owner";
  else {
    const { data: me } = await db.from("check_user").select("role, name, active")
      .eq("office_id", office.id).eq("phone", phone).maybeSingle();
    if (!me || me.active === false) throw new Error("이 검사소에 들어갈 권한이 없습니다. (" + phone + ")");
    role = S(me.role) || "staff";
  }
  return { office, who: phone, role };
}

/* ============================================================
   1. 거래처 · 딜러 · 청구처(묶음)
   ============================================================ */

/** 딜러 목록 — 청구처(묶음)까지 같이 돌려줍니다 · v34: 지운 딜러(active=false)는 빼고 */
async function dealers(ctx: Ctx) {
  const { data } = await db.from("check_dealer")
    .select("*, company:check_company(id,name,biz_no), billTo:bill_to_id(id,name)")
    .eq("office_id", ctx.office.id).order("name");
  const list = (data ?? []).filter((d: any) => d.active !== false);
  /* v36(약속 4): 줄마다 마지막 검사일 — 최근 검사 기록에서 딜러마다 가장 늦은 날 */
  try {
    const { data: cs } = await db.from("check_car").select("dealer_id,check_date").eq("office_id", ctx.office.id)
      .order("check_date", { ascending: false }).limit(20000);
    const last = new Map<string, string>();
    for (const c of cs ?? []) { const k = S(c.dealer_id); const d = S(c.check_date).slice(0, 10); if (k && d > (last.get(k) ?? "")) last.set(k, d); }
    list.forEach((d: any) => { d.last_date = last.get(S(d.id)) ?? ""; });
  } catch (_) { list.forEach((d: any) => { d.last_date = ""; }); }
  return list;
}
/** v36(약속 1): 화면이 켤 칸 — SQL 13 이 들어갔는지(새 칸이 있는지) 보고 알려 줌 */
async function partnerCaps(ctx: Ctx) {
  const a = await db.from("check_company").select("email,upte,jongmok").eq("office_id", ctx.office.id).limit(1);
  const b = await db.from("check_dealer").select("issuer_email,issuer_upte,issuer_jongmok").eq("office_id", ctx.office.id).limit(1);
  const more = !a.error && !b.error;
  return { later: more, more, last: true };
}
const ISSUER_KINDS = ["company", "dealer", "none", "later"];

/** v34(운영/06 N · 체크 v44 약속): 딜러 넣기·고치기 — 대표만 · 상사·청구처는 이 검사소 것만 · 휴대폰 010 모양 · 감사 기록 */
async function dealerSave(ctx: Ctx, row: Record<string, unknown>) {
  bossOnly(ctx);
  row = row ?? {};
  const oid = ctx.office.id;
  const name = S(row.name).trim().slice(0, 20);
  if (!name) throw new Error("딜러 이름을 넣어 주세요.");
  const tel = onlyDigits(row.tel);
  if (tel && !/^01\d{8,9}$/.test(tel)) throw new Error("딜러 휴대폰 번호(010…)를 다시 확인해 주세요.");
  const companyId = S(row.company_id) || null;
  if (companyId) {
    const { data: c } = await db.from("check_company").select("id").eq("office_id", oid).eq("id", companyId).maybeSingle();
    if (!c) throw new Error("이 검사소의 매매상사가 아닙니다. 상사를 다시 골라 주세요.");
  }
  const billTo = S(row.bill_to_id) || null;
  if (billTo) {
    const { data: b } = await db.from("check_dealer").select("id").eq("office_id", oid).eq("id", billTo).maybeSingle();
    if (!b) throw new Error("청구처로 고른 딜러를 찾지 못했습니다.");
  }
  const body: Record<string, unknown> = {
    office_id: oid, name, company_id: companyId, tel,
    bill_to_id: billTo,                                // ← 청구처 (비우면 자기 자신)
    issuer_kind: ISSUER_KINDS.includes(S(row.issuer_kind)) ? S(row.issuer_kind) : "company",   // v36: later(나중에) 받음
    issuer_name: S(row.issuer_name).slice(0, 60),
    issuer_biz: onlyDigits(row.issuer_biz).slice(0, 10),
    issuer_ceo: S(row.issuer_ceo).slice(0, 40),
    issuer_addr: S(row.issuer_addr).slice(0, 200),
    tax_issue: row.tax_issue !== false,
    memo: S(row.memo).slice(0, 500),
  };
  /* v36(약속 3): 홈택스 받는 쪽 이메일·업태·종목 — 보냈을 때만 (SQL 13 전 화면은 안 보냄) */
  if (row.issuer_email !== undefined) body.issuer_email = S(row.issuer_email).trim().slice(0, 80);
  if (row.issuer_upte !== undefined) body.issuer_upte = S(row.issuer_upte).trim().slice(0, 60);
  if (row.issuer_jongmok !== undefined) body.issuer_jongmok = S(row.issuer_jongmok).trim().slice(0, 60);
  if (Array.isArray(row.tels)) {                       // 추가 번호는 보냈을 때만 고침(빼먹으면 지우지 않음)
    body.tels = (row.tels as any[]).slice(0, 20).map((t) => onlyDigits(t?.tel ?? t))
      .filter((t) => /^01\d{8,9}$/.test(t)).map((t) => ({ tel: telFmt(t) }));
  } else if (!row.id) body.tels = [];
  if (row.id) {
    const { data: mine } = await db.from("check_dealer").select("id").eq("office_id", oid).eq("id", S(row.id)).maybeSingle();
    if (!mine) throw new Error("이 검사소 딜러가 아닙니다.");
    const { data, error } = await db.from("check_dealer").update(body).eq("id", row.id)
      .eq("office_id", oid).select().single();
    if (error || !data) throw new Error("딜러를 고치지 못했습니다.");
    await log(ctx, "딜러 고침", { id: S(row.id), name, tel: tel ? phoneMask(tel) : "" });
    return data;
  }
  body.active = true;
  const { data, error } = await db.from("check_dealer").insert(body).select().single();
  if (error || !data) throw new Error("딜러를 넣지 못했습니다. 같은 이름의 딜러가 이미 있는지 확인해 주세요.");
  await log(ctx, "딜러 넣음", { id: S(data.id), name, tel: tel ? phoneMask(tel) : "" });
  return data;
}
/** 딜러 지우기 — 대표만 · 이 검사소 것만(섞이면 전체 거절) · 실제로 지우지 않고 active=false (지난 청구서·배달 기록 보존) */
async function dealerDel(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const ids = [...new Set(((Array.isArray(opt) ? opt : opt?.ids) ?? []).map(S).filter(Boolean))].slice(0, 500) as string[];
  if (!ids.length) throw new Error("지울 딜러를 골라 주세요.");
  const { data } = await db.from("check_dealer").select("id").eq("office_id", ctx.office.id).in("id", ids);
  if ((data ?? []).length !== ids.length) throw new Error("이 검사소 딜러가 아닌 줄이 섞여 있습니다. 다시 골라 주세요.");
  await db.from("check_dealer").update({ active: false }).eq("office_id", ctx.office.id).in("id", ids);
  await log(ctx, "딜러 지움", { ids, n: ids.length });
  return { n: ids.length };
}
/** 매매상사 목록 — 로그인한 누구나 · 이 검사소만 · dealerN = 쓰는 딜러 수 */
async function companies(ctx: Ctx) {
  let { data: cs, error: ce }: { data: any[] | null; error: any } = await db.from("check_company").select("id,name,biz_no,ceo,tel,addr,email,upte,jongmok").eq("office_id", ctx.office.id).order("name");
  if (ce) ({ data: cs } = await db.from("check_company").select("id,name,biz_no,ceo,tel").eq("office_id", ctx.office.id).order("name"));   // SQL 13 전
  const { data: ds } = await db.from("check_dealer").select("company_id,active").eq("office_id", ctx.office.id).limit(10000);
  const cnt = new Map<string, number>();
  for (const d of ds ?? []) if (d.active !== false && d.company_id) cnt.set(S(d.company_id), (cnt.get(S(d.company_id)) ?? 0) + 1);
  return (cs ?? []).map((c: any) => ({ id: c.id, name: S(c.name), biz_no: S(c.biz_no), ceo: S(c.ceo), tel: S(c.tel),
    addr: S(c.addr), email: S(c.email), upte: S(c.upte), jongmok: S(c.jongmok), dealerN: cnt.get(S(c.id)) ?? 0 }));
}
/** 매매상사 넣기·고치기 — 대표만 · 이름 40자 · 같은 이름이면 그 상사를 돌려줌 · 사업자번호 10자리 또는 빈 값 */
async function companySave(ctx: Ctx, row: any) {
  bossOnly(ctx);
  row = row ?? {};
  const oid = ctx.office.id;
  const name = S(row.name).trim().slice(0, 40);
  if (!name) throw new Error("매매상사 이름을 넣어 주세요.");
  const biz = onlyDigits(row.biz_no);
  if (biz && biz.length !== 10) throw new Error("사업자등록번호는 숫자 10자리로 넣어 주세요.");
  const body: any = { name, biz_no: biz, ceo: S(row.ceo).trim().slice(0, 40), tel: onlyDigits(row.tel).slice(0, 12) };
  /* v36(약속 3): 보냈을 때만 저장 (addr 는 원래 있는 칸 · email·upte·jongmok 은 SQL 13) */
  if (row.addr !== undefined) body.addr = S(row.addr).trim().slice(0, 200);
  if (row.email !== undefined) body.email = S(row.email).trim().slice(0, 80);
  if (row.upte !== undefined) body.upte = S(row.upte).trim().slice(0, 60);
  if (row.jongmok !== undefined) body.jongmok = S(row.jongmok).trim().slice(0, 60);
  if (S(row.id)) {
    const { data: mine } = await db.from("check_company").select("id").eq("office_id", oid).eq("id", S(row.id)).maybeSingle();
    if (!mine) throw new Error("이 검사소 매매상사가 아닙니다.");
    const { data, error } = await db.from("check_company").update(body).eq("office_id", oid).eq("id", S(row.id)).select("id,name").single();
    if (error || !data) throw new Error("매매상사를 고치지 못했습니다. 같은 이름의 상사가 이미 있는지 확인해 주세요.");
    await log(ctx, "상사 고침", { id: S(row.id), name });
    return { id: data.id, name: S(data.name) };
  }
  const { data: same } = await db.from("check_company").select("id,name").eq("office_id", oid).eq("name", name).maybeSingle();
  if (same) return { id: same.id, name: S(same.name) };
  const { data, error } = await db.from("check_company").insert(Object.assign({ office_id: oid }, body)).select("id,name").single();
  if (error || !data) throw new Error("매매상사를 넣지 못했습니다.");
  await log(ctx, "상사 넣음", { id: S(data.id), name });
  return { id: data.id, name: S(data.name) };
}
/** v49: 상사명부·딜러명부 한꺼번에 넣기 — 대표만 · 줄마다 정한 칸만 읽음(회사코드·그 밖의 칸은 버림)
 *  companies:[{name, biz_no|bizNo, ceo, tel, addr}] · dealers:[{name, tel|phone, company}] (회사코드·주민번호 등 다른 칸은 버림)
 *  이미 있는 상사(이름 같음)·딜러(이름+상사 같음)는 빈 칸만 채움 · 없는 상사 이름이 딜러에 있으면 상사도 만듦 · dryRun 이면 세기만 */
async function partnerImport(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const oid = ctx.office.id;
  const dry = opt?.dryRun === true;
  const cIn: any[] = Array.isArray(opt?.companies) ? opt.companies : [];
  const dIn: any[] = Array.isArray(opt?.dealers) ? opt.dealers : [];
  if (!cIn.length && !dIn.length) throw new Error("넣을 상사·딜러가 없습니다.");
  if (cIn.length > 3000 || dIn.length > 5000) throw new Error("한 번에 상사 3,000곳 · 딜러 5,000명까지 넣을 수 있습니다.");
  const clean = (v: unknown, n: number) => S(v).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
  const out = { companies: { add: 0, fill: 0, same: 0, bad: [] as { row: number; why: string }[] },
                dealers: { add: 0, fill: 0, same: 0, bad: [] as { row: number; why: string }[] } };
  const { data: cs0 } = await db.from("check_company").select("id,name,biz_no,ceo,tel,addr").eq("office_id", oid);
  const cBy = new Map<string, any>((cs0 ?? []).map((c: any) => [S(c.name), c]));
  /* ① 상사 */
  const cAdd: any[] = [], cFill: { id: string; patch: any }[] = [];
  cIn.slice(0, 3000).forEach((r, i) => {
    const name = clean(r?.name ?? r?.상사명 ?? r?.회사명, 40);
    if (!name) { out.companies.bad.push({ row: i + 1, why: "상사 이름이 비어 있음" }); return; }
    let biz = onlyDigits(r?.biz_no ?? r?.bizNo ?? r?.사업자번호);
    if (biz && biz.length !== 10) { out.companies.bad.push({ row: i + 1, why: "사업자번호가 10자리가 아님(번호만 빼고 넣음)" }); biz = ""; }
    const v: any = { biz_no: biz, ceo: clean(r?.ceo ?? r?.대표자, 40), tel: onlyDigits(r?.tel ?? r?.전화).slice(0, 12), addr: clean(r?.addr ?? r?.주소, 200) };
    const have = cBy.get(name);
    if (have) {
      const patch: any = {};
      for (const k of Object.keys(v)) if (v[k] && !S(have[k])) patch[k] = v[k];
      if (Object.keys(patch).length) { cFill.push({ id: S(have.id), patch }); Object.assign(have, patch); out.companies.fill++; } else out.companies.same++;
      return;
    }
    const row = { office_id: oid, name, ...v };
    cAdd.push(row); cBy.set(name, row); out.companies.add++;
  });
  /* 딜러에만 나오는 상사 이름도 상사로 만듦 */
  const dRows = dIn.slice(0, 5000).map((r, i) => ({ i, name: clean(r?.name ?? r?.딜러명 ?? r?.이름, 20),
    tel: onlyDigits(r?.tel ?? r?.phone ?? r?.휴대폰 ?? r?.전화), company: clean(r?.company ?? r?.상사명 ?? r?.소속, 40) }));
  for (const d of dRows) if (d.name && d.company && !cBy.has(d.company)) {
    const row = { office_id: oid, name: d.company, biz_no: "", ceo: "", tel: "", addr: "" };
    cAdd.push(row); cBy.set(d.company, row); out.companies.add++;
  }
  if (!dry) {
    for (let k = 0; k < cAdd.length; k += 500) {
      const { data, error } = await db.from("check_company").insert(cAdd.slice(k, k + 500)).select("id,name");
      if (error) throw new Error("상사를 넣지 못했습니다. 잠시 뒤 다시 해 주세요.");
      for (const c of data ?? []) { const h = cBy.get(S(c.name)); if (h) h.id = c.id; }
    }
    for (let k = 0; k < cFill.length; k += 20)                 // 보안 참고: 20개씩 함께 (서버 시간 제한)
      await Promise.all(cFill.slice(k, k + 20).map((f) => db.from("check_company").update(f.patch).eq("office_id", oid).eq("id", f.id)));
  }
  /* ② 딜러 */
  const { data: ds0 } = await db.from("check_dealer").select("id,name,company_id,tel,active").eq("office_id", oid);
  const dKey = (name: string, cid: string) => name + "|" + cid;
  const dBy = new Map<string, any>((ds0 ?? []).filter((d: any) => d.active !== false).map((d: any) => [dKey(S(d.name), S(d.company_id)), d]));
  const dAdd: any[] = [], dFill: { id: string; tel: string }[] = [];
  for (const d of dRows) {
    if (!d.name) { out.dealers.bad.push({ row: d.i + 1, why: "딜러 이름이 비어 있음" }); continue; }
    let tel = d.tel;
    if (tel && !/^01\d{8,9}$/.test(tel)) { out.dealers.bad.push({ row: d.i + 1, why: "휴대폰 번호 모양이 아님(번호만 빼고 넣음)" }); tel = ""; }
    const cid = d.company ? S(cBy.get(d.company)?.id) : "";
    const have = dBy.get(dKey(d.name, cid));
    if (have) {
      if (tel && !S(have.tel)) { if (have.id) dFill.push({ id: S(have.id), tel }); have.tel = tel; out.dealers.fill++; }
      else out.dealers.same++;
      continue;
    }
    const row = { office_id: oid, name: d.name, company_id: cid || null, tel, issuer_kind: "company", tax_issue: true, active: true, tels: [] };
    dAdd.push(row); dBy.set(dKey(d.name, cid), row); out.dealers.add++;
  }
  if (!dry) for (let k = 0; k < dAdd.length; k += 500) {
    const { error } = await db.from("check_dealer").insert(dAdd.slice(k, k + 500));
    if (error) throw new Error("딜러를 넣지 못했습니다. 잠시 뒤 다시 해 주세요.");
  }
  if (!dry) for (let k = 0; k < dFill.length; k += 20)        // 보안 참고: 20개씩 함께
    await Promise.all(dFill.slice(k, k + 20).map((f) => db.from("check_dealer").update({ tel: f.tel }).eq("office_id", oid).eq("id", f.id)));
  out.companies.bad = out.companies.bad.slice(0, 100); out.dealers.bad = out.dealers.bad.slice(0, 100);
  if (!dry) await log(ctx, "거래처 한꺼번에 넣음", { c: { add: out.companies.add, fill: out.companies.fill }, d: { add: out.dealers.add, fill: out.dealers.fill } });
  /* 체크 v55 약속 이름도 함께: made(새로 넣음) · skipped(이미 있어 건너뜀 = 채움 + 같음) */
  const made = out.companies.add + out.dealers.add;
  const skipped = out.companies.fill + out.companies.same + out.dealers.fill + out.dealers.same;
  return { ok: true, dryRun: dry, made, skipped, ...out };
}
/** 매매상사 지우기 — 대표만 · 이 검사소 것만(섞이면 전체 거절) · 쓰는 딜러가 있으면 지우지 않고 kept 로.
    지운(쉬는) 딜러만 남은 상사는 그 딜러들의 상사 칸을 비우고 지움 (지난 청구서는 상사 이름을 따로 갖고 있어 그대로) */
async function companyDel(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const oid = ctx.office.id;
  const ids = [...new Set(((Array.isArray(opt) ? opt : opt?.ids) ?? []).map(S).filter(Boolean))].slice(0, 500) as string[];
  if (!ids.length) throw new Error("지울 매매상사를 골라 주세요.");
  const { data: cs } = await db.from("check_company").select("id,name").eq("office_id", oid).in("id", ids);
  if ((cs ?? []).length !== ids.length) throw new Error("이 검사소 매매상사가 아닌 줄이 섞여 있습니다. 다시 골라 주세요.");
  const { data: ds } = await db.from("check_dealer").select("id,company_id,active").eq("office_id", oid).in("company_id", ids);
  const live = new Map<string, number>();
  for (const d of ds ?? []) if (d.active !== false) live.set(S(d.company_id), (live.get(S(d.company_id)) ?? 0) + 1);
  const kept = (cs ?? []).filter((c: any) => live.has(S(c.id))).map((c: any) => ({ id: c.id, name: S(c.name), dealerN: live.get(S(c.id)) }));
  const go = ids.filter((id) => !live.has(id));
  if (go.length) {
    const idle = (ds ?? []).filter((d: any) => d.active === false && go.includes(S(d.company_id))).map((d: any) => S(d.id));
    if (idle.length) await db.from("check_dealer").update({ company_id: null }).eq("office_id", oid).in("id", idle);
    const { error } = await db.from("check_company").delete().eq("office_id", oid).in("id", go);
    if (error) throw new Error("매매상사를 지우지 못했습니다.");
    await log(ctx, "상사 지움", { ids: go, n: go.length });
  }
  return { n: go.length, kept };
}

/** 여러 딜러를 한 청구처로 묶기 / 풀기
 *  scope: "always" = 거래처에 기억 (다음 달부터 계속)
 *         "month"  = 이번 달만 (check_bill_override)
 *  billToId 가 비면 묶음을 풉니다. */
async function billGroupSet(ctx: Ctx, dealerIds: string[], billToId: string | null, scope: string, ym: string) {
  const ids = (dealerIds || []).filter(Boolean);
  if (!ids.length) throw new Error("묶을 딜러를 골라 주세요.");
  if (billToId && ids.includes(billToId)) throw new Error("청구처로 고른 딜러는 묶을 목록에서 빼 주세요.");
  if (scope === "month") {
    if (!ym) throw new Error("어느 달인지 알려 주세요.");
    const rows = ids.map((id) => ({ office_id: ctx.office.id, ym, dealer_id: id, bill_to_id: billToId }));
    const { error } = await db.from("check_bill_override").upsert(rows, { onConflict: "office_id,ym,dealer_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("check_dealer").update({ bill_to_id: billToId })
      .in("id", ids).eq("office_id", ctx.office.id);
    if (error) throw new Error(error.message);
  }
  await log(ctx, billToId ? "청구처 묶기" : "청구처 풀기", { ids, billToId, scope, ym });
  return { ok: true, n: ids.length };
}

/** 묶기 추천 — 발행처 사업자등록번호가 같은데 청구처가 나뉜 곳 */
async function billGroupHints(ctx: Ctx) {
  const list = await dealers(ctx);
  const by: Record<string, { biz: string; issuer: string; names: string[]; ids: string[] }> = {};
  for (const d of list as any[]) {
    const biz = S(d.issuer_biz) || S(d.company?.biz_no);
    if (!biz || d.bill_to_id) continue;
    (by[biz] ||= { biz, issuer: S(d.issuer_name) || S(d.company?.name), names: [], ids: [] });
    by[biz].names.push(d.name); by[biz].ids.push(d.id);
  }
  return Object.values(by).filter((g) => g.names.length > 1);
}

/* ============================================================
   2. 청구서 만들기 — 여기서 묶음이 적용됩니다
   ============================================================ */

/** 그달 청구처 지도: 딜러 id → 청구처 딜러 id
 *  ① 거래처에 기억해 둔 bill_to_id 를 먼저 쓰고
 *  ② 이번 달만 바꾼 것(check_bill_override)이 있으면 그것이 이깁니다. */
async function billMap(ctx: Ctx, ym: string) {
  const list = await dealers(ctx) as any[];
  const map = new Map<string, string>();
  for (const d of list) map.set(d.id, d.bill_to_id || d.id);
  const { data: ov } = await db.from("check_bill_override").select("dealer_id,bill_to_id")
    .eq("office_id", ctx.office.id).eq("ym", ym);
  for (const o of ov ?? []) map.set(o.dealer_id, o.bill_to_id || o.dealer_id);
  // 두 단계(가→나→다)로 이어진 묶음도 끝까지 따라갑니다
  const head = (id: string, depth = 0): string => {
    const next = map.get(id) || id;
    return (next === id || depth > 5) ? id : head(next, depth + 1);
  };
  const out = new Map<string, string>();
  for (const d of list) out.set(d.id, head(d.id));
  return { map: out, dealers: new Map(list.map((d) => [d.id, d])) };
}

/** 청구서 보기 주소에 쓰는 열쇠글 (사람마다 다릅니다) */
function viewKey() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 18);
}

/** 단가표에서 그 검사일에 맞는 단가 찾기 */
function priceOf(bands: any[], date: string, code: string) {
  const b = bands.filter((x) => x.from_date <= date).sort((a, z) => a.from_date < z.from_date ? 1 : -1)[0];
  const g = S(code);
  /* v44: 코드가 같거나, 코드가 빈 항목은 이름이 같으면 */
  const it = (b?.items ?? []).find((i: any) => S(i.code) === g || (!S(i.code) && S(i.name) === g));
  return it ? { name: S(it.name), price: N(it.price) } : null;
}
/** v44: 차 한 대 검사비(부가세 별도) — 가온 규칙(운영/04). 엑셀 «금액» 으로 대신 셈하지 않습니다.
 *  선납 0 · 손 입력 금액 · 단가표 · 수출 가성능(손 입력 없으면 0 · need) · 재검·가성능 0 · 그 밖은 0 + unknown */
const EXPORT_RE = /수출\s*가성능/;
function unitOf(pr: { price: number } | null, goods: string, manual: unknown): { unit: number; need?: boolean; unknown?: boolean } {
  const g = S(goods);
  if (/^선납/.test(g)) return { unit: 0 };
  if (manual !== null && manual !== undefined && manual !== "" && Number.isFinite(Number(manual))) return { unit: Math.max(0, Math.round(Number(manual))) };
  if (pr) return { unit: pr.price };
  if (EXPORT_RE.test(g)) return { unit: 0, need: true };
  if (/재검|가성능/.test(g)) return { unit: 0 };
  return { unit: 0, unknown: true };
}
function unknownList(m: Map<string, number>) {
  return [...m.entries()].map(([goods, n]) => ({ goods, n })).sort((a, b) => b.n - a.n);
}

/** 월별 청구서 만들기 */
async function invoiceBuild(ctx: Ctx, ym: string, opt: Record<string, unknown> = {}) {
  if (!/^\d{4}-\d{2}$/.test(S(ym))) throw new Error("청구 월을 2026-09 모양으로 알려 주세요.");
  const vat = 1 + (Number(ctx.office.vat_rate ?? 10) / 100);
  const { map, dealers: dmap } = await billMap(ctx, ym);
  const { data: bands } = await db.from("check_price_band").select("*").eq("office_id", ctx.office.id);
  const from = ym + "-01", to = ymNext(ym);

  const { data: cars } = await db.from("check_car").select("*")
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to);
  const { data: reps } = await db.from("check_repair").select("*")
    .eq("office_id", ctx.office.id).eq("bill_month", ym);

  type Grp = {
    head: any; members: Set<string>; fee: number; ext: number; rep: number;
    dom: number; imp: number; etc: number; rows: any[];
  };
  const G = new Map<string, Grp>();
  /* v48: 거래처에 안 이어진 차는 신청인(dealer_text)마다 — 청구처 id 없음 · 계산서·보내기는 거래처에 넣은 뒤 */
  const textGrp = (nameRaw: unknown) => {
    const name = S(nameRaw).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 60) || "(신청인 없음)";
    const k = "text:" + name;
    let g = G.get(k);
    if (!g) {
      g = { head: { id: null, name, company_id: null, issuer_kind: "none", tax_issue: false, _text: true }, members: new Set([name]),
            fee: 0, ext: 0, rep: 0, dom: 0, imp: 0, etc: 0, rows: [] };
      G.set(k, g);
    }
    return g;
  };
  const unk = new Map<string, number>();   // v44: 단가표에 없는 상품명
  let feeNeed = 0;                          // v44: 금액을 넣어야 할 수출 가성능
  const grp = (dealerId: string) => {
    const headId = map.get(dealerId) || dealerId;
    const head = dmap.get(headId);
    if (!head) return null;
    let g = G.get(headId);
    if (!g) { g = { head, members: new Set(), fee: 0, ext: 0, rep: 0, dom: 0, imp: 0, etc: 0, rows: [] }; G.set(headId, g); }
    const me = dmap.get(dealerId);
    if (me) g.members.add(me.name);
    return g;
  };

  for (const c of cars ?? []) {
    const g = c.dealer_id ? grp(c.dealer_id) : textGrp(c.dealer_text);   // v48: 신청인만 있는 차도
    if (!g) continue;
    const pr = priceOf(bands ?? [], c.check_date, c.goods);
    // 선납_* 는 검사비를 이미 받은 건이라 건수만 세고 금액은 0원 (재검과 같은 방식)
    const u = unitOf(pr, c.goods, c.fee_manual);   // v44: 대신 셈 없음
    if (u.unknown && S(c.src) !== "전산외") unk.set(S(c.goods) || "(빈 칸)", (unk.get(S(c.goods) || "(빈 칸)") ?? 0) + 1);
    if (u.need && S(c.src) !== "전산외") feeNeed++;
    const kind = S(c.src) === "전산외" ? "ext" : "fee";
    /* v46: 전산외(나스 엑셀)는 엑셀 금액(부가세 포함) 그대로 — 단가표·손 입력을 쓰지 않음 */
    const amount = kind === "ext" ? Math.max(0, N(c.amount)) : Math.round(u.unit * vat);
    const unit = kind === "ext" ? Math.round(amount / vat) : u.unit;
    if (kind === "ext") g.ext += amount; else g.fee += amount;
    const nm = S(pr?.name || c.goods);
    if (nm.includes("국산")) g.dom++; else if (nm.includes("수입")) g.imp++; else g.etc++;
    g.rows.push({ kind, dealer_name: c.dealer_id ? (dmap.get(c.dealer_id)?.name ?? "") : S(g.head.name), item: nm || S(c.goods),
      qty: 1, unit, amount, car_id: c.id });
  }
  for (const r of reps ?? []) {
    if (r.exempt) continue;
    if (!r.dealer_id) continue;
    const g = grp(r.dealer_id); if (!g) continue;
    g.rep += N(r.amount);
    g.rows.push({ kind: "repair", dealer_name: dmap.get(r.dealer_id)?.name ?? "",
      item: S(r.reason) || "정비비", qty: 1, unit: N(r.amount), amount: N(r.amount), repair_id: r.id });
  }

  // 이번 달 것을 지우고 새로 씁니다 (같은 달을 다시 만들어도 쌓이지 않게)
  /* v32(보안 M4): 세금계산서를 발급했거나 돈이 들어온 청구서는 지우지 않고 그대로 둡니다.
     이미 만든 달을 다시 만드는 것은 대표만. 다시 만들어도 딜러에게 보낸 주소(view_key)는 그대로 씁니다. */
  const { data: old } = await db.from("check_invoice").select("id,bill_to_id,bill_to_name,tax_key,paid_amount,view_key")
    .eq("office_id", ctx.office.id).eq("ym", ym);
  if (old?.length && S(ctx.role) !== "owner") throw new Error("이미 만든 청구서를 다시 만드는 것은 대표님만 할 수 있습니다.");
  const locked = (old ?? []).filter((x: any) => S(x.tax_key) || N(x.paid_amount) > 0);
  const kid = (x: any) => S(x.bill_to_id) || ("text:" + S(x.bill_to_name));   // v48: 청구처 id 가 없으면 신청인 이름으로
  const lockedTo = new Set(locked.map(kid));
  const keyOf = new Map((old ?? []).map((x: any) => [kid(x), S(x.view_key)]));
  const del = (old ?? []).filter((x: any) => !(S(x.tax_key) || N(x.paid_amount) > 0)).map((x: any) => x.id);
  if (del.length) await db.from("check_invoice").delete().in("id", del);

  const keepZero = opt.keepZero === true;
  let noDealerFail = 0;
  const made: any[] = [];
  for (const g of G.values()) {
    const total = g.fee + g.ext + g.rep;
    if (!total && !keepZero) continue;
    const gk = g.head._text ? "text:" + S(g.head.name) : S(g.head.id);
    if (lockedTo.has(gk)) continue;                           // v32: 발급·입금된 청구서는 그대로
    const comp = g.head.company_id ? (await db.from("check_company").select("name,biz_no")
      .eq("office_id", ctx.office.id).eq("id", g.head.company_id).maybeSingle()).data : null;   // v34(보안 3bf8d9b ②): 이 검사소 상사만
    const ik0 = S(g.head.issuer_kind);
    const issuerKind = (!ik0 || ik0 === "later") ? "company" : ik0;   // v36: «나중에» 는 지금 기본값처럼 상사로 (청구 결과 그대로)
    const inv = {
      office_id: ctx.office.id, ym,
      bill_to_id: g.head.id, bill_to_name: g.head.name,
      members: [...g.members].sort((a, b) => a === g.head.name ? -1 : b === g.head.name ? 1 : a.localeCompare(b, "ko")),
      company_name: S(comp?.name),
      issuer_kind: issuerKind,
      issuer_name: issuerKind === "dealer" ? S(g.head.issuer_name) : (issuerKind === "company" ? S(comp?.name) : ""),
      issuer_biz: issuerKind === "dealer" ? S(g.head.issuer_biz) : (issuerKind === "company" ? S(comp?.biz_no) : ""),
      fee_amount: g.fee, ext_amount: g.ext, repair_amount: g.rep, total_amount: total,
      dom_n: g.dom, imp_n: g.imp, etc_n: g.etc,
      tax_issue: g.head.tax_issue !== false && issuerKind !== "none",
      view_key: keyOf.get(gk) || viewKey(),
    };
    const { data: saved, error } = await db.from("check_invoice").insert(inv).select().single();
    if (error && g.head._text) { noDealerFail++; console.error("invoiceBuild 신청인 청구서", S(error.message).slice(0, 120)); continue; }   // v48: 표가 막으면 그것만 건너뜀
    if (error) throw new Error(error.message);
    if (g.rows.length) {
      const rows = g.rows.map((r) => ({ ...r, invoice_id: saved.id }));
      await db.from("check_invoice_row").insert(rows);
    }
    made.push(saved);
  }
  await log(ctx, "청구서 만듦", { ym, n: made.length, kept: locked.length });
  if (locked.length) {
    const { data: keep } = await db.from("check_invoice").select("*").in("id", locked.map((x: any) => x.id));
    made.push(...(keep ?? []));
  }
  made.sort((a, b) => b.total_amount - a.total_amount);
  const noDealer = made.filter((v: any) => !S(v.bill_to_id)).length;   // v48: 거래처에 없는 신청인 청구서 수
  return { ym, n: made.length, list: made, kept: locked.length, unknown: unknownList(unk), feeNeed, noDealer, noDealerFail };
}

/** 청구서 목록 (묶음·포함 딜러까지) */
async function invoiceList(ctx: Ctx, ym: string, auto?: boolean) {
  const { data } = await db.from("check_invoice").select("*")
    .eq("office_id", ctx.office.id).eq("ym", ym).order("total_amount", { ascending: false });
  if ((data ?? []).length || auto === false) return data ?? [];
  /* v48: 대표가 그 달 청구서를 모두 지웠으면 저절로 다시 만들지 않음 («청구서 만들기»로만) */
  if (await monthCleared(ctx, ym)) return [];
  /* 아직 안 만든 달이면, 그 달 차가 있을 때 저절로 만들어 줍니다 */
  const { count } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", ym + "-01").lt("check_date", ymNext(ym))
    .not("dealer_id", "is", null);
  if (!count) return [];
  const built = await invoiceBuild(ctx, ym);
  return built.list ?? [];
}

/** v48: 마지막 «청구서 만듦» 뒤에 «그 달 청구서 모두 지움» 기록이 있는지 */
async function monthCleared(ctx: Ctx, ym: string) {
  /* 기록 표의 시각 칸 이름에 기대지 않음 — 모두 읽어 시각(created_at · at)으로, 없으면 넣은 차례로 */
  const { data } = await db.from("check_log").select("*").eq("office_id", ctx.office.id)
    .in("what", ["청구서 만듦", "청구서 모두 지움"]);
  const tm = (l: any) => S(l && (l.created_at || l.at));
  const list = (data ?? []).map((l: any, i: number) => ({ l, i })).sort((x: any, y: any) =>
    (tm(y.l) > tm(x.l) ? 1 : tm(y.l) < tm(x.l) ? -1 : y.i - x.i)).map((x: any) => x.l);
  for (const l of list) {
    const d: any = l && l.detail;
    if (!d || S(d.ym) !== S(ym)) continue;
    return S(l.what) === "청구서 모두 지움";
  }
  return false;
}
/** 이 달 자료가 청구서보다 새것인지 (엑셀을 다시 올렸을 때 알려 주려고) */
async function billState(ctx: Ctx, ym: string) {
  const from = S(ym) + "-01", to = ymNext(S(ym));
  const { data: inv } = await db.from("check_invoice").select("created_at")
    .eq("office_id", ctx.office.id).eq("ym", S(ym)).order("created_at").limit(1);
  const { count: cars } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to);
  const { count: linked } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to)
    .not("dealer_id", "is", null);
  const builtAt = inv?.[0]?.created_at ?? null;
  let stale = false;
  if (builtAt) {
    const { count: newer } = await db.from("check_car").select("id", { count: "exact", head: true })
      .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to)
      .gt("created_at", builtAt);
    stale = (newer ?? 0) > 0;
  }
  return { ym: S(ym), cars: cars ?? 0, linked: linked ?? 0, noDealer: (cars ?? 0) - (linked ?? 0),
    built: !!builtAt, builtAt: builtAt ? fmtTs(new Date(new Date(builtAt).getTime() + KST)) : "",
    stale };
}

/** 청구서 한 장의 내역 */
async function invoiceRows(ctx: Ctx, invoiceId: string) {
  /* v40(체크 방 지적): 이 검사소 청구서인지 먼저 확인 — 남의 청구서 줄을 id 로 못 읽게 */
  const { data: inv } = await db.from("check_invoice").select("id").eq("office_id", ctx.office.id).eq("id", S(invoiceId)).maybeSingle();
  if (!inv) throw new Error("이 검사소 청구서가 아닙니다.");          // 보안(중간 · v25부터 있던 것): 남의 청구서는 거절
  /* v45(체크 v52): 줄마다 차 번호판·검사일(수출 가성능 금액 넣기 창) — 이 검사소 청구서 줄의 차만 */
  const { data } = await db.from("check_invoice_row").select("*, car:car_id(plate,check_date)").eq("invoice_id", inv.id);
  return data ?? [];
}

/* ───────── v40: 단가 구간 (체크 v48 약속) ───────── */
/** 이 검사소 단가 구간 모두 — 로그인한 누구나 보기 */
async function priceList(ctx: Ctx) {
  const { data } = await db.from("check_price_band").select("from_date,items").eq("office_id", ctx.office.id).order("from_date", { ascending: false });
  return (data ?? []).map((b: any) => ({ from_date: S(b.from_date).slice(0, 10),
    items: (Array.isArray(b.items) ? b.items : []).map((i: any) => ({ code: S(i?.code), name: S(i?.name), price: N(i?.price) })) }));
}
/** 단가 구간 저장 — 대표만 · 같은 날짜면 바꿈 · 항목 1~50 · 단가 0~1천만 정수(부가세 별도) */
async function priceSave(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const from = S(opt?.from).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || isNaN(Date.parse(from + "T00:00:00Z"))) throw new Error("시작 날짜(YYYY-MM-DD)를 다시 확인해 주세요.");
  const raw: any[] = Array.isArray(opt?.items) ? opt.items : [];
  if (raw.length < 1 || raw.length > 50) throw new Error("단가 항목은 1~50개로 넣어 주세요.");
  const seen = new Set<string>();
  const items = raw.map((i, k) => {
    const code = S(i?.code).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20);
    const name = S(i?.name).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 40);
    const price = Number(i?.price);
    if (!name) throw new Error((k + 1) + "번째 항목의 이름이 비어 있습니다.");
    if (!Number.isInteger(price) || price < 0 || price > 10_000_000) throw new Error((k + 1) + "번째 항목의 단가는 0~10,000,000원 정수로 넣어 주세요.");   // v44: 재검·가성능 0원
    const key = code || name;
    if (seen.has(key)) throw new Error("같은 항목이 두 번 들어 있습니다: " + key);
    seen.add(key);
    return { code, name, price };
  });
  const { error } = await db.from("check_price_band").upsert({ office_id: ctx.office.id, from_date: from, items }, { onConflict: "office_id,from_date" });
  if (error) throw new Error("단가 구간을 저장하지 못했습니다. 잠시 뒤 다시 해 주세요.");
  await log(ctx, "단가 구간 저장", { from, n: items.length });
  return { ok: true };
}
/** 단가 구간 지우기 — 대표만 · 이 검사소 것만 · 마지막 하나는 남김 */
async function priceDel(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const want = [...new Set((Array.isArray(opt?.from) ? opt.from : [opt?.from]).map((x: any) => S(x).slice(0, 10)).filter((x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x)))] as string[];
  if (!want.length) throw new Error("지울 구간을 골라 주세요.");
  if (want.length > 20) throw new Error("한 번에 20개까지 지울 수 있습니다.");
  const { data } = await db.from("check_price_band").select("from_date").eq("office_id", ctx.office.id);
  const have = (data ?? []).map((b: any) => S(b.from_date).slice(0, 10));
  const go = want.filter((d) => have.includes(d));
  if (!go.length) return { n: 0 };
  if (have.length - go.length < 1) throw new Error("단가 구간이 하나는 남아 있어야 해요.");
  const { error } = await db.from("check_price_band").delete().eq("office_id", ctx.office.id).in("from_date", go);
  if (error) throw new Error("단가 구간을 지우지 못했습니다. 잠시 뒤 다시 해 주세요.");
  await log(ctx, "단가 구간 지움", { from: go });
  return { n: go.length };
}
/** v44: 차 한 대 검사비 손 입력(수출 가성능 등) — 대표만 · 이 검사소 차만 · 0~1천만 정수(부가세 별도) · null/빈 값 = 지움(단가표대로) */
async function carFeeSet(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const id = S(opt?.carId);
  if (!id) throw new Error("차를 골라 주세요.");
  const raw = opt?.fee;
  const clear = raw === null || raw === undefined || S(raw).trim() === "";
  const fee = clear ? null : Number(raw);
  if (!clear && (!Number.isInteger(fee) || (fee as number) < 0 || (fee as number) > 10_000_000))
    throw new Error("검사비는 0~10,000,000원 정수로 넣어 주세요 (부가세 별도).");
  const { data: car } = await db.from("check_car").select("id,check_date").eq("office_id", ctx.office.id).eq("id", id).maybeSingle();
  if (!car) throw new Error("이 검사소 차가 아닙니다.");
  const { error } = await db.from("check_car").update({ fee_manual: fee }).eq("office_id", ctx.office.id).eq("id", car.id);
  if (error) throw new Error(/fee_manual/.test(S(error.message)) ? "서버를 준비하는 중입니다(SQL 18). 차곳간(010-9559-3663)으로 알려 주세요." : "검사비를 저장하지 못했습니다. 잠시 뒤 다시 해 주세요.");
  await log(ctx, "검사비 손 입력", { car: car.id, fee });
  return { ok: true, carId: car.id, fee, ym: S(car.check_date).slice(0, 7) };
}

/* ============================================================
   v33. 로그인 없이 여는 주소 — 청구서 한 장 · 재검사 차량 목록 (보안 ⑥~⑪)
   · 열쇠는 그대로 길게(청구서 18자 · 재검사 24자), IP별 횟수 제한
   · 정한 칸만 돌려줌 (검사소 id · 세금계산서 칸 · 차대번호 · 전화 원문 없음)
   · 기한: 청구서 약 90일(view_until · 없으면 만든 날 + 120일), 재검사 30일 — 지나면 «만료»만
   · 대표는 주소를 새로 만들 수 있음(예전 주소는 안 열림)
   ============================================================ */
const VIEW_IP_MAX = () => Number(env("CHECK_VIEW_IP_MAX", "300"));      // IP 한 곳 · 하루
const BILL_VIEW_DAYS = 90, BILL_VIEW_OLD_DAYS = 120, REMIND_VIEW_DAYS = 30;
function ipOfReq(req: Request) {
  const cf = S(req.headers.get("cf-connecting-ip")).trim();
  if (cf) return cf.slice(0, 64);
  const xs = S(req.headers.get("x-forwarded-for")).split(",").map((x) => x.trim()).filter(Boolean);
  return (xs[xs.length - 1] || "0").slice(0, 64);
}
async function viewIpOk(c: Ctx, what: string) {
  return await rateOk("view:" + what + ":" + S(c?.ip || "0") + ":" + ymdK(kstNow()), VIEW_IP_MAX());
}
const INV_PUBLIC = "id, ym, bill_to_name, company_name, members, issuer_kind, issuer_name, fee_amount, ext_amount, " +
  "repair_amount, total_amount, dom_n, imp_n, etc_n, created_at, view_until, view_key, office_id, view_n";

/** 알림톡·문자 버튼이 여는 청구서 한 장 — 로그인 없이 열쇠글로만 봅니다.
 *  v33: 체크 코드는 «k» + 열쇠 (v.html 이 k 로 시작하면 체크로 넘김) — k 없이 와도 받음 */
async function invoiceView(c: Ctx, key: string) {
  if (!(await viewIpOk(c, "inv"))) throw new Error("잠시 뒤 다시 열어 주세요.");
  let k = S(key).replace(/[^A-Za-z0-9_-]/g, "");
  if (/^k[a-z0-9]{18}$/.test(k)) k = k.slice(1);
  if (k.length < 8) throw new Error("주소가 올바르지 않습니다.");
  const { data: inv0 } = await db.from("check_invoice").select(INV_PUBLIC).eq("view_key", k).maybeSingle();
  const inv: any = inv0;
  if (!inv) throw new Error("청구서를 찾지 못했습니다. 주소를 다시 확인해 주세요.");
  const until = inv.view_until ? Date.parse(S(inv.view_until))
    : Date.parse(S(inv.created_at)) + BILL_VIEW_OLD_DAYS * 86400000;
  const { data: off } = await db.from("check_office")
    .select("name, tel, bank_fee, bank_repair").eq("id", inv.office_id).maybeSingle();
  if (isFinite(until) && until < Date.now())
    return { expired: true, office: { name: S(off?.name), tel: S(off?.tel) }, msg: "기한이 지난 주소예요. 보낸 곳에 다시 요청해 주세요." };
  const { data: rows } = await db.from("check_invoice_row").select("kind, item, qty, unit, amount").eq("invoice_id", inv.id);
  await db.from("check_invoice").update({
    view_at: new Date().toISOString(), view_n: N(inv.view_n) + 1,          // 열어봄(참고 — 카카오 미리보기도 올림)
  }).eq("id", inv.id);
  /* 정한 칸만 — 체크 v43 약속 3절 모양 (검사소 id·열쇠·세금계산서 칸·차 id·사업자번호 없음) */
  const offPub = { name: S(off?.name), tel: S(off?.tel), bank_fee: S(off?.bank_fee), bank_repair: S(off?.bank_repair) };
  const fee: Record<string, any> = {}, rep: any[] = [];
  let feeN = 0, feeAmt = 0, repAmt = 0;
  for (const x of rows ?? []) {
    const amt = N(x.amount);
    if (S(x.kind) === "repair") { rep.push({ name: S(x.item) || "정비비", amount: amt }); repAmt += amt; continue; }
    const k = S(x.item) + "|" + N(x.unit);
    const g = fee[k] || (fee[k] = { name: S(x.item) || "검사비", unit: N(x.unit), n: 0, amount: 0 });
    g.n += Math.max(1, N(x.qty)); g.amount += amt; feeN += Math.max(1, N(x.qty)); feeAmt += amt;
  }
  /* 두 모양을 함께 — 체크 v43(설계 19: invoice·rows·office)과 약속 3절(ym·to·fee·rep) 어느 쪽 화면도 그대로 읽게 */
  const members = Array.isArray(inv.members) ? inv.members.map(S) : [];
  const unpaid = await unpaidOthers(inv);   // v51: 밀린 달 목록 (같은 검사소 · 같은 청구처 · 이 달 빼고)
  return { ym: S(inv.ym), to: S(inv.bill_to_name), members, total: N(inv.total_amount), office: offPub, unpaid,
    fee: { n: feeN, amount: feeAmt, lines: Object.values(fee) }, rep: { n: rep.length, amount: repAmt, lines: rep },
    invoice: { ym: S(inv.ym), bill_to_name: S(inv.bill_to_name), company_name: S(inv.company_name), members,
      fee_amount: N(inv.fee_amount), ext_amount: N(inv.ext_amount), repair_amount: N(inv.repair_amount), total_amount: N(inv.total_amount),
      dom_n: N(inv.dom_n), imp_n: N(inv.imp_n), etc_n: N(inv.etc_n), created_at: S(inv.created_at) },
    rows: (rows ?? []).map((x: any) => ({ kind: S(x.kind), item: S(x.item), qty: N(x.qty), unit: N(x.unit), amount: N(x.amount) })) };
}

/** v33: 청구서 주소 새로 만들기 (대표만 · 예전 주소는 더 안 열림) — [청구서 id] */
async function invoiceRekey(ctx: Ctx, id: string) {
  bossOnly(ctx);
  const nk = viewKey();
  const { data, error } = await db.from("check_invoice").update({ view_key: nk,
    view_until: new Date(Date.now() + BILL_VIEW_DAYS * 86400000).toISOString() })
    .eq("office_id", ctx.office.id).eq("id", S(id)).select("id");
  if (error || !data?.length) throw new Error("청구서를 찾지 못했습니다.");
  await log(ctx, "청구서 주소 새로 만듦", { id: S(id) });
  return { ok: true };
}

/* ============================================================
   v33. 청구서 보내기 (billSend) — 승인된 «차곳간_청구서» 알림톡 (워시와 같은 본사 채널·템플릿)
   · 대표만 · 한 번에 100곳 · 이 검사소 그 달 청구서만(섞이면 전체 거절)
   · 받는 번호 = 청구처(대표 딜러)의 등록 번호 · 시험은 로그인한 사람 번호로 한 통
   · 변수는 서버가 채움 (보기코드 = k + 그 청구서 열쇠) · 같은 청구서 10분 안 다시 안 보냄 · 하루 상한
   · 처음엔 캐시를 깎지 않음 (대표님 결정 10-16)
   ============================================================ */
const BILL_DAY_MAX = () => Number(env("CHECK_BILL_DAY_MAX", "300"));
const BILL_SMS = "[차곳간] #{기간} 청구 내역\n· #{건수}대 #{금액}원\n· 입금 기한 #{입금기한}\n· #{계좌}\n" +
  "내역 보기 https://app.cgg.co.kr/v.html?c=#{보기코드}\n#{업체명} #{업체전화}";
/** v51: 문자 길이(바이트) — 한글 등 2 · 영문·숫자·기호 1 (단문 90바이트 넘으면 장문) */
function smsBytes(t: string) { let n = 0; for (const ch of String(t)) n += ch.charCodeAt(0) <= 0x7f ? 1 : 2; return n; }
const smsType = (t: string) => smsBytes(t) > 90 ? "LMS" : "SMS";
function fillVars(t: string, v: Record<string, string>) {
  let o = t;
  for (const k of Object.keys(v)) o = o.split(k).join(v[k]);
  return o;
}
function dueText(v: unknown) {
  const t = S(v).trim().slice(0, 20);
  return /^[0-9가-힣.\-/ ]+$/.test(t) && /\d/.test(t) ? t : "확인 후 입금";
}
/* v33(보안 L1): 검사소가 쓴 글이 공식 채널 변수로 나갈 때 — 주소 모양(://·www.·도메인) 지우고 길이 자르기 (보기코드·링크는 서버 값이라 그대로) */
const VAR_KEEP = ["#{보기코드}", "#{링크}"];
function cleanVar(v: unknown, max = 40) {
  let t = S(v).replace(/[\r\n\t]+/g, " ");
  t = t.replace(/[a-z][a-z0-9+.-]*:\/\//gi, "").replace(/www\./gi, "")
    .replace(/[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|kr|io|me|ly|xyz|app|site|link|shop|info|biz|co|cc|tk|gl|to|kakao|page)\b(\/\S*)?/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim().slice(0, max);
  return t || "-";
}
function cleanVars(vars: Record<string, string>, max: Record<string, number> = {}) {
  const o: Record<string, string> = {};
  for (const k of Object.keys(vars)) o[k] = VAR_KEEP.includes(k) ? S(vars[k]) : cleanVar(vars[k], max[k] ?? 40);
  return o;
}
/** 본사 템플릿이 있으면 알림톡(안 되면 대체 문구 문자), 없으면 대체 문구 문자 — 돌려줌: how(ata|sms|lms) · ok · why
 *  변수는 여기서 청소하고, 문자 글도 청소한 변수로 만듦 */
async function ataSend(office: any, to: string, tplKey: string, vars0: Record<string, string>, smsTpl: string, meta: SendMeta) {
  const vars = cleanVars(vars0, { "#{계좌}": 60 });
  const smsText = fillVars(smsTpl, vars);
  const from = onlyDigits(office?.sms_from) || onlyDigits(env("SMS_FROM"));
  if (!from) return { ok: false, how: "", why: "보내는 번호 없음" };
  const ha = await hqAta();
  if (ha.tpl[tplKey] && ha.pf) {
    try {
      const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [{ to, from, text: smsText,
        kakaoOptions: { pfId: ha.pf, templateId: ha.tpl[tplKey], variables: vars, disableSms: false } }] }, meta);
      if (!(r.failedMessageList || []).length) return { ok: true, how: "ata", why: "" };
    } catch (_) { /* 아래 문자로 */ }
  }
  try {
    const type = smsType(smsText);   // v51: 90바이트
    await solapi("POST", "/messages/v4/send-many/detail", { messages: [{ to, from, text: smsText, type, subject: "차곳간" }] },
      Object.assign({}, meta, { tpl: meta.tpl + "_sms" }));
    return { ok: true, how: type.toLowerCase(), why: "" };
  } catch (e) {
    return { ok: false, how: "", why: sendErrEasy("", "", e) };
  }
}
/** 체크 v43 약속: billSend(ym, ids, {due, test}) — 예전 모양 billSend({ym, ids, due, test})도 받음 */
async function billSend(ctx: Ctx, a0: any, a1?: any, a2?: any) {
  bossOnly(ctx);
  const opt: any = (a0 && typeof a0 === "object" && !Array.isArray(a0)) ? a0 : Object.assign({}, a2 || {}, { ym: a0, ids: a1 });
  const ym = S(opt?.ym);
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error("청구 월을 다시 골라 주세요.");
  const ids = [...new Set((Array.isArray(opt?.ids) ? opt.ids : []).map(S).filter(Boolean))];
  if (!ids.length) throw new Error("보낼 청구서를 골라 주세요.");
  if (ids.length > 100) throw new Error("한 번에 100곳까지 보낼 수 있습니다.");
  const test = opt?.test === true;
  const { data: invs } = await db.from("check_invoice").select("id,ym,bill_to_id,bill_to_name,total_amount,view_key,view_until,sent_at")
    .eq("office_id", ctx.office.id).eq("ym", ym).in("id", ids);
  if ((invs ?? []).length !== ids.length) throw new Error("이 검사소의 그 달 청구서가 아닌 것이 섞여 있습니다. 화면을 새로 고쳐 주세요.");
  const o = ctx.office;
  const [yy, mm] = ym.split("-");
  const base = { "#{기간}": yy + "년 " + Number(mm) + "월", "#{업체명}": S(o.name) || "-", "#{업체전화}": S(o.tel) || "-",
    "#{입금기한}": dueText(opt?.due), "#{계좌}": S(o.bank_fee).slice(0, 60) || "-" };
  const results: any[] = [];
  let sent = 0;
  for (const inv of (test ? (invs ?? []).slice(0, 1) : (invs ?? []))) {
    const r: any = { id: inv.id, name: S(inv.bill_to_name), ok: false, how: "", why: "" };
    results.push(r);
    if (!test && inv.sent_at && Date.now() - Date.parse(S(inv.sent_at)) < 10 * 60000) { r.why = "방금 보냄(10분 안)"; continue; }
    if (!S(inv.bill_to_id)) { r.why = "거래처에 없는 신청인이에요 — 거래처에 넣은 뒤 보낼 수 있어요"; continue; }   // v48
    /* v33(보안 L2): 보내기 전에 «지금 보냄»을 조건부로 먼저 잡음 — 동시에 두 번 눌러도 한 번만 */
    if (!test) {
      const tenAgo = new Date(Date.now() - 10 * 60000).toISOString();
      const { data: got } = await db.from("check_invoice").update({ sent_at: new Date().toISOString(), send_how: "sending" })
        .eq("office_id", o.id).eq("id", inv.id).or("sent_at.is.null,sent_at.lt." + tenAgo).select("id");
      if (!got?.length) { r.why = "방금 보냄(10분 안)"; continue; }
    }
    let to = "";
    if (test) to = onlyDigits(ctx.who);
    else {
      const { data: d } = await db.from("check_dealer").select("tel").eq("office_id", o.id).eq("id", S(inv.bill_to_id)).maybeSingle();
      to = onlyDigits(d?.tel);
    }
    if (!/^01\d{8,9}$/.test(to)) { r.why = test ? "내 번호를 찾지 못함" : "청구처 휴대폰 번호가 없음"; continue; }
    if (!(await rateOk("bill:o:" + S(o.id) + ":" + ymdK(kstNow()), BILL_DAY_MAX()))) { r.why = "오늘 보낼 수 있는 수를 다 씀"; continue; }
    const { count } = await db.from("check_invoice_row").select("id", { count: "exact", head: true }).eq("invoice_id", inv.id);
    const vars: Record<string, string> = Object.assign({}, base, { "#{받는곳}": S(inv.bill_to_name) || "-",
      "#{건수}": String(count ?? 0), "#{금액}": Math.round(N(inv.total_amount)).toLocaleString("ko-KR"),
      "#{보기코드}": "k" + S(inv.view_key) });
    const s2 = await ataSend(o, to, "bill", vars, BILL_SMS, { shop: S(o.code), tpl: "check_bill", ref: S(inv.id) });
    Object.assign(r, s2);
    if (test) continue;
    const until = Math.max(Date.parse(S(inv.view_until)) || 0, Date.now() + BILL_VIEW_DAYS * 86400000);
    await db.from("check_invoice").update({ sent_at: s2.ok ? new Date().toISOString() : (inv.sent_at ?? null), send_how: s2.how || null,
      send_err: s2.ok ? null : s2.why, view_until: new Date(until).toISOString() }).eq("id", inv.id);
    if (s2.ok) sent++;
  }
  await log(ctx, test ? "청구서 시험 보내기" : "청구서 보내기", { ym, n: ids.length, sent });
  return { sent, test, results };
}

/* ============================================================
   v51. 밀린 달 한꺼번에 (서버/설계/30 A안 · SQL 없음)
   · 한 딜러(청구처)의 덜 받은 청구서(청구 − 받은 돈 > 0)를 한 통으로 — 승인된 «차곳간_청구서» 그대로
   · 보기 주소 = 가장 최근 달 청구서 · 그 보기 화면이 밀린 달 목록(unpaid)을 함께 보여 줌
   · 대표만 · 섞이면 전체 거절 · 달마다 10분 안 다시 안 보냄(조건부로 먼저 잡음) · 하루 상한은 한 통 = 1
   ============================================================ */
const leftAmt = (v: any) => Math.max(0, Math.round(N(v.total_amount) - N(v.paid_amount)));
async function unpaidOf(officeId: string, dealerId: string) {
  const { data, error } = await db.from("check_invoice").select("id,ym,bill_to_id,bill_to_name,total_amount,paid_amount,view_key,view_until,sent_at,send_how,created_at")
    .eq("office_id", officeId).eq("bill_to_id", dealerId).limit(500);
  if (error) throw new Error("청구서를 읽지 못했습니다. 잠시 뒤 다시 해 주세요.");
  return (data ?? []).filter((v: any) => N(v.total_amount) > 0 && leftAmt(v) > 0)
    .sort((a: any, b: any) => S(a.ym) < S(b.ym) ? -1 : S(a.ym) > S(b.ym) ? 1 : 0);
}
/** 보기 화면용 — 이 청구서와 같은 검사소·같은 청구처의 다른 덜 받은 달 (주소는 기한 안 것만) */
async function unpaidOthers(inv: any) {
  try {
    const { data: me } = await db.from("check_invoice").select("bill_to_id").eq("id", inv.id).maybeSingle();
    const did = S(me?.bill_to_id);
    if (!did) return [];
    const list = await unpaidOf(S(inv.office_id), did);
    /* v51(보안 낮음): 보낸 달(sent_at)만 — 대표가 보내기 전 초안을 딜러가 먼저 보지 않게 */
    return list.filter((v: any) => S(v.id) !== S(inv.id) && !!S(v.sent_at) && S(v.send_how) !== "sending").slice(0, 24).map((v: any) => {
      const until = v.view_until ? Date.parse(S(v.view_until)) : Date.parse(S(v.created_at)) + BILL_VIEW_OLD_DAYS * 86400000;
      return { ym: S(v.ym), total: Math.round(N(v.total_amount)), paid: Math.round(N(v.paid_amount)), left: leftAmt(v),
        view: (isFinite(until) && until > Date.now() && S(v.view_key)) ? "k" + S(v.view_key) : "" };
    });
  } catch (_) { return []; }   // 목록을 못 읽어도 그 달 청구서는 그대로 보여 줌
}
/** «2026년 8~10월» · 해가 바뀌면 «2025년 12월~2026년 1월» · 띄엄띄엄이면 «2026년 8월 외 2개월» */
function bundlePeriod(yms: string[]) {
  const ks = [...new Set(yms)].sort();
  const lab = (ym: string) => { const [y, m] = ym.split("-"); return { y, m: Number(m) }; };
  const a = lab(ks[0]), b = lab(ks[ks.length - 1]);
  if (ks.length === 1) return a.y + "년 " + a.m + "월";
  const idx = (ym: string) => { const x = lab(ym); return Number(x.y) * 12 + x.m; };
  const contiguous = idx(ks[ks.length - 1]) - idx(ks[0]) === ks.length - 1;
  if (!contiguous) return b.y + "년 " + b.m + "월 외 " + (ks.length - 1) + "개월";
  return a.y === b.y ? a.y + "년 " + a.m + "~" + b.m + "월" : a.y + "년 " + a.m + "월~" + b.y + "년 " + b.m + "월";
}
/** 대표만 — [{id, ym, total, paid, left, sentAt}] 오래된 달부터 */
async function billBundleList(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const did = S(opt?.dealerId);
  if (!did) throw new Error("딜러를 골라 주세요.");
  const list = await unpaidOf(S(ctx.office.id), did);
  return { dealerId: did, rows: list.map((v: any) => ({ id: S(v.id), ym: S(v.ym), total: Math.round(N(v.total_amount)),
    paid: Math.round(N(v.paid_amount)), left: leftAmt(v), sentAt: S(v.sent_at) })),
    left: list.reduce((t: number, v: any) => t + leftAmt(v), 0) };
}
async function billBundleSend(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const o = ctx.office;
  const did = S(opt?.dealerId);
  if (!did) throw new Error("딜러를 골라 주세요.");
  const ids = [...new Set((Array.isArray(opt?.ids) ? opt.ids : []).map(S).filter(Boolean))];
  if (!ids.length) throw new Error("보낼 청구서를 골라 주세요.");
  if (ids.length > 24) throw new Error("한 번에 24달까지 묶을 수 있습니다.");
  const test = opt?.test === true;
  const all = await unpaidOf(S(o.id), did);
  const pick = all.filter((v: any) => ids.includes(S(v.id)));
  if (pick.length !== ids.length) throw new Error("이 딜러의 덜 받은 청구서가 아닌 것이 섞여 있습니다. 화면을 새로 고쳐 주세요.");
  const anchor = pick[pick.length - 1];                  // 가장 최근 달 — 보기 주소
  const r: any = { ok: false, how: "", why: "", months: pick.map((v: any) => S(v.ym)), left: pick.reduce((t: number, v: any) => t + leftAmt(v), 0) };
  let to = "";
  if (test) to = onlyDigits(ctx.who);
  else {
    const { data: d } = await db.from("check_dealer").select("tel").eq("office_id", o.id).eq("id", did).maybeSingle();
    to = onlyDigits(d?.tel);
  }
  if (!/^01\d{8,9}$/.test(to)) { r.why = test ? "내 번호를 찾지 못함" : "청구처 휴대폰 번호가 없음"; return r; }
  /* 달마다 «지금 보냄»을 조건부로 먼저 잡음 — 하나라도 방금 보낸 달이면 잡은 것을 풀고 그만 */
  const got: any[] = [];
  if (!test) {
    const tenAgo = new Date(Date.now() - 10 * 60000).toISOString();
    for (const v of pick) {
      const { data: g } = await db.from("check_invoice").update({ sent_at: new Date().toISOString(), send_how: "sending" })
        .eq("office_id", o.id).eq("id", v.id).or("sent_at.is.null,sent_at.lt." + tenAgo).select("id");
      if (!g?.length) {
        for (const x of got) await db.from("check_invoice").update({ sent_at: x.sent_at ?? null, send_how: x.send_how ?? null }).eq("office_id", o.id).eq("id", x.id);
        r.why = S(v.ym) + " 청구서를 방금 보냈어요(10분 안)"; return r;
      }
      got.push(v);
    }
  }
  if (!(await rateOk("bill:o:" + S(o.id) + ":" + ymdK(kstNow()), BILL_DAY_MAX()))) {
    for (const x of got) await db.from("check_invoice").update({ sent_at: x.sent_at ?? null, send_how: x.send_how ?? null }).eq("office_id", o.id).eq("id", x.id);
    r.why = "오늘 보낼 수 있는 수를 다 씀"; return r;
  }
  let cars = 0;
  for (const v of pick) {
    const { count } = await db.from("check_invoice_row").select("id", { count: "exact", head: true }).eq("invoice_id", v.id);
    cars += N(count);
  }
  const vars: Record<string, string> = { "#{기간}": bundlePeriod(pick.map((v: any) => S(v.ym))), "#{업체명}": S(o.name) || "-",
    "#{업체전화}": S(o.tel) || "-", "#{입금기한}": dueText(opt?.due), "#{계좌}": S(o.bank_fee).slice(0, 60) || "-",
    "#{받는곳}": S(anchor.bill_to_name) || "-", "#{건수}": String(cars), "#{금액}": r.left.toLocaleString("ko-KR"),
    "#{보기코드}": "k" + S(anchor.view_key) };
  const s2 = await ataSend(o, to, "bill", vars, BILL_SMS, { shop: S(o.code), tpl: "check_bill", ref: S(anchor.id) });
  Object.assign(r, s2);
  if (!test) {
    const until = new Date(Date.now() + BILL_VIEW_DAYS * 86400000).toISOString();
    for (const v of pick) {
      const keep = Date.parse(S(v.view_until)) > Date.parse(until) ? S(v.view_until) : until;
      await db.from("check_invoice").update({ sent_at: s2.ok ? new Date().toISOString() : (v.sent_at ?? null), send_how: s2.how || null,
        send_err: s2.ok ? null : s2.why, view_until: keep }).eq("office_id", o.id).eq("id", v.id);
    }
  }
  await log(ctx, test ? "밀린 달 청구서 시험 보내기" : "밀린 달 청구서 보내기", { dealer: did, n: pick.length, ok: s2.ok });
  return r;
}

/* ============================================================
   v33. 재검사 알림 — 만료(검사일 + 유효일수) 30·15·7·3일 전 가운데 검사소가 고른 날
   · 딜러 한 명에 한 통 (차 여러 대 묶음) · 같은 차·같은 단계는 한 번만 (check_remind_log 고유)
   · 템플릿 «check_remind» 승인 전에는 문자 · v50: 매일 자동도 승인 전에 켤 수 있음(그동안은 대체 문구 문자)
   · 보기 주소 https://check.cgg.co.kr/r/?c=<보기코드> (v49.2) — 딜러별 30일 · 그 검사소+딜러 차만
   ============================================================ */
const REMIND_STEPS = [30, 15, 7, 3];
const REMIND_DAY_MAX = () => Number(env("CHECK_REMIND_DAY_MAX", "500"));
const REMIND_URL = "https://check.cgg.co.kr/r/?c=";   // v49.2: 체크 사이트에 _redirects 를 못 둬서 «/r/열쇠» 대신 «/r/?c=열쇠» (알림톡 버튼과 같은 모양)
const REMIND_SMS = "[차곳간] #{업체명} 성능점검 만료 #{대수}대 · 가장 빠른 만료 #{빠른만료일} · 문의 #{업체전화}\n" +
  "차량 목록 " + REMIND_URL + "#{보기코드}";   // v50: ⑦ 확정 문구 + v49.2 목록 주소
async function remindRuleOf(officeId: string) {
  const { data } = await db.from("check_remind_rule").select("steps,auto,past").eq("office_id", officeId).maybeSingle();
  const steps = (Array.isArray(data?.steps) ? data.steps : [30, 15, 7]).map(N).filter((x: number) => REMIND_STEPS.includes(x));
  return { steps: steps.length ? [...new Set(steps)].sort((a: number, b: number) => b - a) : [30, 15, 7],
    auto: data?.auto === true, past: data?.past !== false };
}
async function remindRule(ctx: Ctx) {
  const r = await remindRuleOf(S(ctx.office.id));
  const ha = await hqAta();
  return { days: N(ctx.office.ins_valid_days) || 120, steps: r.steps, auto: r.auto, past: r.past, ataReady: !!(ha.tpl.check_remind && ha.pf) };
}
async function remindRuleSave(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const steps = (Array.isArray(opt?.steps) ? opt.steps : []).map(N).filter((x: number) => REMIND_STEPS.includes(x));
  if (!steps.length) throw new Error("알림 날을 하나 이상 골라 주세요 (30·15·7·3일 전).");
  const auto = opt?.auto === true;   // v50: 알림톡 승인 전에도 켬 — 그동안은 ataSend 가 대체 문구 문자로 보냄
  const { error } = await db.from("check_remind_rule").upsert({ office_id: S(ctx.office.id), steps: [...new Set(steps)],
    auto, past: opt?.past !== false, updated_at: new Date().toISOString() }, { onConflict: "office_id" });
  if (error) throw new Error("서버를 준비하는 중입니다(SQL 12). 차곳간(010-9559-3663)으로 알려 주세요.");
  await log(ctx, "재검사 알림 규칙", { steps, auto });
  return { ok: true };
}
function addDays(ymd: string, n: number) {
  const d = new Date(S(ymd).slice(0, 10) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000); }
function korMD(ymd: string) { const d = new Date(S(ymd).slice(0, 10) + "T00:00:00Z"); return (d.getUTCMonth() + 1) + "월 " + d.getUTCDate() + "일"; }
/** 단계: 고른 날 가운데 «남은 날 이하»인 가장 작은 날 (예: 고른 날 30·15·7, 남은 10일 → 15) · 지난 차는 past 일 때 0 */
function stepOf(left: number, steps: number[], past: boolean) {
  if (left < 0) return past ? 0 : -1;
  const ok = steps.filter((s) => left <= s);
  return ok.length ? Math.min(...ok) : -1;
}
async function remindCars(officeId: string, days: number, rule: { steps: number[]; past: boolean }, rangeDays: number) {
  const today = ymdK(kstNow());
  const from = addDays(today, -days - (rule.past ? 30 : 0)), to = addDays(today, -days + rangeDays);
  const { data: cars } = await db.from("check_car").select("id,plate,car_name,check_date,dealer_id,remind_off")
    .eq("office_id", officeId).gte("check_date", from).lte("check_date", to).not("dealer_id", "is", null).limit(5000);
  const ids = (cars ?? []).map((c: any) => S(c.id));
  const sentSet = new Set<string>();
  const sentAt: Record<string, string> = {};
  if (ids.length) {
    const { data: lg } = await db.from("check_remind_log").select("car_id,step,at").eq("office_id", officeId).in("car_id", ids);
    (lg ?? []).forEach((x: any) => { sentSet.add(S(x.car_id) + ":" + N(x.step)); sentAt[S(x.car_id) + ":" + N(x.step)] = S(x.at); });
  }
  return (cars ?? []).map((c: any) => {
    const exp = addDays(S(c.check_date), days);
    const left = daysBetween(today, exp);
    const step = stepOf(left, rule.steps, rule.past);
    return { carId: S(c.id), dealerId: S(c.dealer_id), plate: S(c.plate), car: S(c.car_name), date: S(c.check_date).slice(0, 10),
      exp, left, step, off: c.remind_off === true, sent: step >= 0 && sentSet.has(S(c.id) + ":" + step),
      sentAt: step >= 0 ? (sentAt[S(c.id) + ":" + step] || "") : "" };
  }).filter((x: any) => x.step >= 0);
}
/** 체크 v43 약속: remindList(range) — "today"·"week"·"15d"·"month"·"all" → {days, rows:[…, sentAt]} · 알림 뺀 차 제외 */
const RANGE_DAYS: Record<string, number> = { today: 0, week: 7, "15d": 15, month: 30, all: 60 };
async function remindList(ctx: Ctx, range: any) {
  const rule = await remindRuleOf(S(ctx.office.id));
  const days = N(ctx.office.ins_valid_days) || 120;
  const asArray = !!(range && typeof range === "object");      // 설계 19 모양 remindList({range}) → 배열 · 약속 모양 remindList("month") → {days, rows}
  const r0 = asArray ? S(range.range) : S(range);
  const rangeDays = RANGE_DAYS[r0] ?? Math.min(60, Math.max(0, parseInt(r0, 10) || 30));
  const all = (await remindCars(S(ctx.office.id), days, rule, rangeDays)).filter((x: any) => x.left <= rangeDays);
  const list = asArray ? all : all.filter((x: any) => !x.off);
  const dIds = [...new Set(list.map((x: any) => x.dealerId))];
  const names: Record<string, string> = {};
  if (dIds.length) {
    const { data: ds } = await db.from("check_dealer").select("id,name").eq("office_id", ctx.office.id).in("id", dIds);
    (ds ?? []).forEach((d: any) => (names[S(d.id)] = S(d.name)));
  }
  const rows = list.map((x: any) => ({ carId: x.carId, dealerId: x.dealerId, dealer: names[x.dealerId] || "", plate: x.plate, car: x.car,
    date: x.date, exp: x.exp, left: x.left, step: x.step, sentAt: x.sentAt || "", off: x.off, sent: x.sent })).sort((a: any, b: any) => a.left - b.left);
  return asArray ? rows : { days, rows };
}
function remindKey() {
  const b = crypto.getRandomValues(new Uint8Array(15));
  return [...b].map((x) => (x % 36).toString(36)).join("") + [...crypto.getRandomValues(new Uint8Array(9))].map((x) => (x % 36).toString(36)).join("");
}
/** 딜러 한 명에게 한 통 — 돌려줌 결과 한 줄 */
async function remindOne(office: any, dealer: any, cars: any[], days: number, test: boolean, toTest: string) {
  const r: any = { dealer: S(dealer.name), dealerId: S(dealer.id), cars: cars.length, ok: false, how: "", why: "" };
  const to = test ? onlyDigits(toTest) : onlyDigits(dealer.tel);
  if (!/^01\d{8,9}$/.test(to)) { r.why = test ? "내 번호를 찾지 못함" : "딜러 휴대폰 번호가 없음"; return r; }
  if (!test) {
    /* 같은 차·같은 단계는 한 번만 — 기록을 먼저 넣고, 이미 있는 차는 뺌 */
    const fresh: any[] = [];
    for (const c of cars) {
      const { error } = await db.from("check_remind_log").insert({ office_id: S(office.id), car_id: c.carId, step: c.step, dealer_id: S(dealer.id), at: new Date().toISOString() });
      if (!error) fresh.push(c);
    }
    cars = fresh;
    r.cars = cars.length;
    if (!cars.length) { r.why = "이미 보냄"; return r; }
    if (!(await rateOk("remind:o:" + S(office.id) + ":" + ymdK(kstNow()), REMIND_DAY_MAX()))) {
      await db.from("check_remind_log").delete().eq("office_id", S(office.id)).eq("dealer_id", S(dealer.id)).in("car_id", cars.map((c) => c.carId));
      r.why = "오늘 보낼 수 있는 수를 다 씀"; return r;
    }
  }
  const key = remindKey();
  const { error: ve } = await db.from("check_remind_view").insert({ view_key: key, office_id: S(office.id), dealer_id: S(dealer.id),
    expires_at: new Date(Date.now() + REMIND_VIEW_DAYS * 86400000).toISOString() });
  if (ve) { r.why = "서버를 준비하는 중(SQL 12)"; return r; }
  cars.sort((a, b) => a.exp < b.exp ? -1 : 1);
  const vars: Record<string, string> = { "#{업체명}": S(office.name) || "-", "#{딜러명}": S(dealer.name) || "-",
    "#{유효일수}": String(days), "#{대수}": String(cars.length), "#{빠른만료일}": korMD(cars[0].exp),
    "#{대표차량}": (S(cars[0].plate) || "-") + (cars.length > 1 ? " 외 " + (cars.length - 1) + "대" : ""),
    "#{업체전화}": S(office.tel) || "-", "#{보기코드}": key };
  const s2 = await ataSend(office, to, "check_remind", vars, REMIND_SMS, { shop: S(office.code), tpl: "check_remind", ref: S(dealer.id) });
  Object.assign(r, s2);
  if (!s2.ok && !test)       // 못 보냈으면 다음에 다시 보낼 수 있게 기록을 지움
    await db.from("check_remind_log").delete().eq("office_id", S(office.id)).eq("dealer_id", S(dealer.id)).in("car_id", cars.map((c) => c.carId));
  return r;
}
/** 체크 v43 약속: remindSend(carIds, {test}) — 고른 차를 딜러별로 묶어 한 통씩 · 대표만 · 최대 300 · 이 검사소 차만 */
async function remindSend(ctx: Ctx, a0: any, a1?: any) {
  bossOnly(ctx);
  const test = (a1 && a1.test === true) || (a0 && !Array.isArray(a0) && a0.test === true);
  /* 설계 19 모양 remindSend({dealerIds, test}) — 그 딜러들의 보낼 차 모두 */
  if (a0 && !Array.isArray(a0) && Array.isArray(a0.dealerIds)) {
    const dIds = [...new Set(a0.dealerIds.map(S).filter(Boolean))];
    if (!dIds.length) throw new Error("보낼 딜러를 골라 주세요.");
    if (dIds.length > 100) throw new Error("한 번에 100명까지 보낼 수 있습니다.");
    const { data: dsx } = await db.from("check_dealer").select("id").eq("office_id", ctx.office.id).in("id", dIds);
    if ((dsx ?? []).length !== dIds.length) throw new Error("이 검사소 딜러가 아닌 것이 섞여 있습니다. 화면을 새로 고쳐 주세요.");
    const rule0 = await remindRuleOf(S(ctx.office.id));
    const due = (await remindCars(S(ctx.office.id), N(ctx.office.ins_valid_days) || 120, rule0, Math.max(...rule0.steps)))
      .filter((x: any) => dIds.includes(x.dealerId) && !x.off && (test || !x.sent));
    a0 = due.map((x: any) => x.carId);
    if (!a0.length) return { sent: 0, test, results: dIds.map((d) => ({ dealer: "", dealerId: d, cars: 0, ok: false, how: "", why: "보낼 차가 없음" })) };
  } else if (a0 && !Array.isArray(a0) && Array.isArray(a0.carIds)) a0 = a0.carIds;
  const carIds = [...new Set((Array.isArray(a0) ? a0 : []).map(S).filter(Boolean))];
  if (!carIds.length) throw new Error("보낼 차를 골라 주세요.");
  if (carIds.length > 300) throw new Error("한 번에 300대까지 보낼 수 있습니다.");
  const o = ctx.office;
  const { data: own } = await db.from("check_car").select("id").eq("office_id", o.id).in("id", carIds);
  if ((own ?? []).length !== carIds.length) throw new Error("이 검사소 차가 아닌 것이 섞여 있습니다. 화면을 새로 고쳐 주세요.");
  const rule = await remindRuleOf(S(o.id));
  const days = N(o.ins_valid_days) || 120;
  const pick = new Set(carIds);
  const list = (await remindCars(S(o.id), days, rule, 60)).filter((x: any) => pick.has(x.carId) && !x.off && (test || !x.sent));
  const byDealer = new Map<string, any[]>();
  list.forEach((x: any) => { const v = byDealer.get(x.dealerId) ?? []; v.push(x); byDealer.set(x.dealerId, v); });
  const results: any[] = [];
  if (!byDealer.size) return { sent: 0, test, results: [{ dealer: "", cars: 0, ok: false, how: "", why: "보낼 차가 없음(이미 보냈거나 대상이 아님)" }] };
  const dIds = [...byDealer.keys()];
  const { data: ds } = await db.from("check_dealer").select("id,name,tel").eq("office_id", o.id).in("id", test ? dIds.slice(0, 1) : dIds);
  for (const d of ds ?? []) results.push(await remindOne(o, d, byDealer.get(S(d.id)) ?? [], days, test, ctx.who));
  await log(ctx, test ? "재검사 알림 시험" : "재검사 알림 보내기", { cars: carIds.length, sent: results.filter((x) => x.ok).length });
  return { sent: results.filter((x) => x.ok).length, test, results };
}
/** 체크 v43 약속: remindOff(carIds, off) — 대표·직원 · 이 검사소 차만 → {n} */
async function remindOff(ctx: Ctx, a0: any, a1?: any) {
  const carIds = Array.isArray(a0) ? a0 : (a0 && Array.isArray(a0.carIds) ? a0.carIds : []);
  const off = Array.isArray(a0) ? a1 !== false : (a0?.off !== false);
  const ids = [...new Set(carIds.map(S).filter(Boolean))].slice(0, 500);
  if (!ids.length) return { ok: true, n: 0 };
  const { data, error } = await db.from("check_car").update({ remind_off: off })
    .eq("office_id", ctx.office.id).in("id", ids).select("id");
  if (error) throw new Error("서버를 준비하는 중입니다(SQL 12). 차곳간(010-9559-3663)으로 알려 주세요.");
  await log(ctx, off ? "재검사 알림 빼기" : "재검사 알림 다시 넣기", { n: (data ?? []).length });
  return { ok: true, n: (data ?? []).length };
}
/** 로그인 없이 — 재검사 차량 목록 (딜러별 30일 · 그 검사소+딜러 차만 · 차대번호·전화 없음) */
async function remindView(c: Ctx, key: string) {
  if (!(await viewIpOk(c, "rmd"))) throw new Error("잠시 뒤 다시 열어 주세요.");
  const k = S(key).replace(/[^a-z0-9]/g, "");
  if (k.length < 20) throw new Error("주소가 올바르지 않습니다.");
  const { data: v } = await db.from("check_remind_view").select("office_id,dealer_id,expires_at").eq("view_key", k).maybeSingle();
  if (!v) throw new Error("주소를 찾지 못했습니다. 받은 알림의 버튼을 다시 눌러 주세요.");
  const { data: off } = await db.from("check_office").select("id,name,tel,ins_valid_days").eq("id", v.office_id).maybeSingle();
  if (Date.parse(S(v.expires_at)) < Date.now()) return { expired: true, office: { name: S(off?.name), tel: S(off?.tel) } };
  const { data: dl } = await db.from("check_dealer").select("name").eq("office_id", v.office_id).eq("id", v.dealer_id).maybeSingle();
  if (!off || !dl) return { expired: true, office: { name: S(off?.name), tel: S(off?.tel) } };
  const days = N(off.ins_valid_days) || 120;
  const today = ymdK(kstNow());
  const { data: cars0 } = await db.from("check_car").select("plate,car_name,check_date,remind_off")
    .eq("office_id", v.office_id).eq("dealer_id", v.dealer_id)
    .gte("check_date", addDays(today, -days - 30)).lte("check_date", addDays(today, -days + 60)).limit(500);
  const cars = (cars0 ?? []).filter((x: any) => x.remind_off !== true);
  const list = cars.map((x: any) => { const exp = addDays(S(x.check_date), days);
    return { plate: S(x.plate), car: S(x.car_name), date: S(x.check_date).slice(0, 10), exp, left: daysBetween(today, exp) }; })
    .sort((a: any, b: any) => a.left - b.left);
  return { office: { name: S(off.name), tel: S(off.tel) }, dealer: S(dl.name), days, cars: list };
}
/* ============================================================
   v52. 보낸 기록 (설정 › 알림) — 이 검사소 것만 · 대표만
   돌려줌: { from, to, list:[{createdAt, type, tpl, to, kind, status, err, ref}], sums:{sent, sub, fail, wait, skip} }
   status: «알림톡 도착» · «문자 대체» · «문자 도착» · «실패» · «대기» · «안 보냄» (워시 관리 보낸 기록과 같은 말)
   ============================================================ */
const SENDLOG_TPL: Record<string, string> = { check_bill: "청구서", check_remind: "재검사 안내", check_arrive: "차량 도착 안내",
  check_deposit_ok: "입금 확인", release: "차량 도착 안내", auth: "인증번호", bill: "청구서", deposit_ok: "입금 확인" };
const SENDLOG_RES: Record<string, string> = { ata: "알림톡 도착", sms: "문자 대체", sent: "문자 도착", fail: "실패", wait: "대기", skip: "안 보냄" };
async function sendLogList(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const ymdOk = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(S(v)) && isFinite(Date.parse(S(v) + "T00:00:00+09:00"));
  const today = ymdK(kstNow());
  const to = ymdOk(opt?.to) ? S(opt.to) : today;
  const from = ymdOk(opt?.from) ? S(opt.from) : new Date(Date.parse(to + "T00:00:00Z") - 6 * 86400000).toISOString().slice(0, 10);
  const gap = (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000;
  if (gap < 0) throw new Error("시작일이 끝일보다 늦습니다. 날짜를 다시 골라 주세요.");
  if (gap > 92) throw new Error("한 번에 92일까지 볼 수 있습니다. 날짜를 줄여 주세요.");
  const code = S(ctx.office.code).slice(0, 40);
  if (!code) return { from, to, list: [], sums: { sent: 0, sub: 0, fail: 0, wait: 0, skip: 0 } };
  const end = new Date(Date.parse(to + "T00:00:00+09:00") + 86400000).toISOString();
  let q = db.from("cgg_sendlog").select("at,tpl,to_mask,via,final_via,result,err,ref")
    .eq("product", "check").eq("shop", code)
    .gte("at", new Date(Date.parse(from + "T00:00:00+09:00")).toISOString()).lt("at", end)
    .order("at", { ascending: false }).limit(1000);
  const tplF = S(opt?.tpl).replace(/[^a-z_]/g, "").slice(0, 40);
  if (tplF) q = q.in("tpl", [tplF, tplF + "_sms"]);
  const resF = Object.keys(SENDLOG_RES).find((k) => k === S(opt?.result) || SENDLOG_RES[k] === S(opt?.result));
  if (resF) q = q.eq("result", resF);
  const { data, error } = await q;
  if (error) return { from, to, list: [], sums: { sent: 0, sub: 0, fail: 0, wait: 0, skip: 0 }, need: "서버를 준비하는 중입니다(SQL 11)" };
  const rows0 = (data ?? []).slice().sort((a: any, b: any) => S(b.at).localeCompare(S(a.at)));   // 새것부터
  const list = rows0.map((r: any) => {
    const t = S(r.tpl).replace(/_sms$/, "");
    const via = S(r.final_via || r.via).toLowerCase();
    return {
      createdAt: fmtTs(new Date(Date.parse(S(r.at)) + KST)).slice(0, 16), type: SENDLOG_TPL[t] || "알림", tpl: t,
      to: S(r.to_mask), kind: via === "ata" ? "알림톡" : via === "lms" ? "장문" : via === "mms" ? "사진" : via === "sms" ? "단문" : "문자",
      status: SENDLOG_RES[S(r.result)] || S(r.result), err: S(r.err).slice(0, 80), ref: S(r.ref).slice(0, 60),
    };
  });
  const sums = { sent: 0, sub: 0, fail: 0, wait: 0, skip: 0 };
  (data ?? []).forEach((r: any) => { const x = S(r.result);
    if (x === "ata" || x === "sent") sums.sent++; else if (x === "sms") sums.sub++; else if (x === "fail") sums.fail++;
    else if (x === "wait") sums.wait++; else if (x === "skip") sums.skip++; });
  return { from, to, list, sums };
}
/** 매일 09:10 (한국) 자동 — SQL 12 의 예약이 부름 · 열쇠는 기존 자동 시계 열쇠(wash_hq.cron_key) */
async function remindCron(_c: Ctx, key: string) {
  const { data: hq } = await db.from("wash_hq").select("cron_key").eq("id", 1).maybeSingle();
  const ck = S(hq?.cron_key);
  if (ck.length < 16 || !sameText(S(key), ck)) throw new Error("허용되지 않은 요청입니다.");
  /* v50: 템플릿 승인 전에도 돎 — 알림톡이 안 되면 대체 문구 문자(ataSend) */
  const { data: rules } = await db.from("check_remind_rule").select("office_id").eq("auto", true);
  const out: string[] = [];
  for (const rr of rules ?? []) {
    try {
      const { data: o } = await db.from("check_office").select("*").eq("id", rr.office_id).maybeSingle();
      if (!o) continue;
      const rule = await remindRuleOf(S(o.id));
      const days = N(o.ins_valid_days) || 120;
      /* 자동은 «오늘이 그 단계 날»인 차만 (남은 날 = 고른 날) */
      const list = (await remindCars(S(o.id), days, rule, Math.max(...rule.steps)))
        .filter((x: any) => !x.off && !x.sent && rule.steps.includes(x.left));
      const byDealer = new Map<string, any[]>();
      list.forEach((x: any) => { const a = byDealer.get(x.dealerId) ?? []; a.push(x); byDealer.set(x.dealerId, a); });
      if (!byDealer.size) continue;
      const { data: ds } = await db.from("check_dealer").select("id,name,tel").eq("office_id", o.id).in("id", [...byDealer.keys()]);
      for (const d of ds ?? []) {
        const r = await remindOne(o, d, byDealer.get(S(d.id)) ?? [], days, false, "");
        out.push(S(o.code) + " " + r.dealer.slice(0, 1) + "* " + (r.ok ? r.how : r.why));
      }
    } catch (e) { console.error("remindCron", e instanceof Error ? e.message.slice(0, 80) : ""); }
  }
  return { ok: true, n: out.length, list: out };
}

/** 들어온 돈 목록 */
async function depositList(ctx: Ctx, opt: { days?: number } = {}) {
  const days = Math.min(120, Math.max(1, opt.days ?? 31));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await db.from("check_deposit").select("*")
    .eq("office_id", ctx.office.id).gte("tx_at", since)
    .order("tx_at", { ascending: false }).limit(1000);
  return (data ?? []).filter((d: any) => S(d.state) !== "지움");      // v38: 휴지통은 depositTrash 로
}

/** 청구서 화면에서 청구처 바꾸기 (그 자리에서 다시 만듭니다) */
async function invoiceMove(ctx: Ctx, ym: string, dealerIds: string[], billToId: string | null, scope: string) {
  bossOnly(ctx);                                             // 보안 낮음 ②: 대표 확인을 맨 앞에
  /* 발급·입금된 청구서에 들어 있는 딜러는 옮기지 않음 */
  const { data: lk } = await db.from("check_invoice").select("bill_to_id,members,tax_key,paid_amount")
    .eq("office_id", ctx.office.id).eq("ym", S(ym));
  const locked = (lk ?? []).filter((x: any) => S(x.tax_key) || N(x.paid_amount) > 0);
  if (locked.length) {
    const ids = [...(dealerIds ?? []).map(S), S(billToId)].filter(Boolean);
    const { data: ds } = ids.length ? await db.from("check_dealer").select("id,name").eq("office_id", ctx.office.id).in("id", ids) : { data: [] };
    const names = new Set((ds ?? []).map((d: any) => S(d.name)));
    if (locked.some((x: any) => ids.includes(S(x.bill_to_id)) || (Array.isArray(x.members) && x.members.some((m: any) => names.has(S(m))))))
      throw new Error("세금계산서를 발급했거나 입금된 청구서의 딜러는 옮길 수 없습니다.");
  }
  await billGroupSet(ctx, dealerIds, billToId, scope || "month", ym);
  return await invoiceBuild(ctx, ym);
}

/* ───────── v45: 체크 v50 단추 ───────── */
function idList(v: unknown, max = 200): string[] {
  const a = [...new Set((Array.isArray(v) ? v : [v]).map(S).filter((x) => /^[A-Za-z0-9_-]{1,64}$/.test(x)))];
  if (!a.length) throw new Error("청구서를 골라 주세요.");
  if (a.length > max) throw new Error("한 번에 " + max + "개까지 할 수 있습니다.");
  return a;
}
/** ① 이 달 청구서 지우기 — 대표만 · 세금계산서 발급·입금된 것은 남기고 까닭 · «청구서 만들기»를 다시 누르면 다시 생김 */
async function invoiceDel(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const ym = S(opt?.ym);
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error("청구 월을 2026-09 모양으로 알려 주세요.");
  const ids = idList(opt?.ids);
  const { data } = await db.from("check_invoice").select("id,bill_to_name,tax_key,paid_amount")
    .eq("office_id", ctx.office.id).eq("ym", ym).in("id", ids);
  const kept: { id: string; name: string; why: string }[] = [];
  const go: string[] = [];
  for (const v of data ?? []) {
    if (S(v.tax_key)) kept.push({ id: S(v.id), name: S(v.bill_to_name), why: "세금계산서를 발급한 청구서" });
    else if (N(v.paid_amount) > 0) kept.push({ id: S(v.id), name: S(v.bill_to_name), why: "입금이 붙은 청구서" });
    else go.push(S(v.id));
  }
  if (go.length) {
    await db.from("check_invoice_row").delete().in("invoice_id", go);
    const { error } = await db.from("check_invoice").delete().eq("office_id", ctx.office.id).in("id", go);
    if (error) throw new Error("청구서를 지우지 못했습니다. 잠시 뒤 다시 해 주세요.");
  }
  await log(ctx, "청구서 지움", { ym, n: go.length, kept: kept.length, ids: go });
  /* v48: 그 달에 남은 청구서가 없으면 «모두 지움» — invoiceList 가 저절로 다시 만들지 않게 */
  const { count: left } = await db.from("check_invoice").select("id", { count: "exact", head: true }).eq("office_id", ctx.office.id).eq("ym", ym);
  const cleared = go.length > 0 && !left;
  if (cleared) await log(ctx, "청구서 모두 지움", { ym });
  return { n: go.length, kept, missing: ids.length - (data ?? []).length, cleared };
}
/** ② 보냄 표시 지우기 — 대표만 · 보낸 시각·열어본 시각만 비움(발송 기록은 그대로) */
async function invoiceUnsend(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const ids = idList(opt?.ids);
  const { data } = await db.from("check_invoice").select("id,state")
    .eq("office_id", ctx.office.id).in("id", ids);
  const mine = (data ?? []).map((v: any) => S(v.id));
  if (!mine.length) return { n: 0 };
  const { error } = await db.from("check_invoice").update({ sent_at: null, view_at: null })
    .eq("office_id", ctx.office.id).in("id", mine);
  if (error) throw new Error("보냄 표시를 지우지 못했습니다. 잠시 뒤 다시 해 주세요.");
  const back = (data ?? []).filter((v: any) => S(v.state) === "보냄").map((v: any) => S(v.id));
  if (back.length) await db.from("check_invoice").update({ state: "만듦" }).eq("office_id", ctx.office.id).in("id", back);
  await log(ctx, "보냄 표시 지움", { n: mine.length, ids: mine });
  return { n: mine.length };
}
/** ③ 알림톡 템플릿 — 발신프로필·템플릿 코드는 본사(관리 → 알림톡 템플릿) 값이라 체크에서는 보기만 */
async function tplInfo(_ctx: Ctx) {
  const ha = await hqAta();
  const has = (k: string) => !!(ha.pf && ha.tpl[k]);
  return { readOnly: true, where: "관리 → 알림 → 알림톡 템플릿 (차곳간 본사)", profile: !!ha.pf,
    bill: has("bill"), deposit: has("deposit_ok"), remind: has("check_remind"), arrive: has("check_arrive") || has("release") };
}
async function tplSave(_ctx: Ctx) {
  throw new Error("알림톡 템플릿은 차곳간 본사(관리)에서 넣어요. 체크에서는 볼 수만 있어요.");
}
/* ④⑤ 검사소 설정(서버에만 두는 값) — check_office_conf 한 줄 (SQL 19) */
async function confRow(ctx: Ctx) {
  const { data, error } = await db.from("check_office_conf").select("*").eq("office_id", ctx.office.id).maybeSingle();
  if (error) throw new Error("서버를 준비하는 중입니다(SQL 19). 차곳간(010-9559-3663)으로 알려 주세요.");
  return data ?? {};
}
async function confPut(ctx: Ctx, patch: Record<string, unknown>) {
  const { error } = await db.from("check_office_conf").upsert({ office_id: ctx.office.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "office_id" });
  if (error) throw new Error(/check_office_conf/.test(S(error.message)) ? "서버를 준비하는 중입니다(SQL 19). 차곳간(010-9559-3663)으로 알려 주세요." : "저장하지 못했습니다. 잠시 뒤 다시 해 주세요.");
}
const FEE_HOW = ["한 대마다", "검사비 %"];
/** ④ 검사자 수수료 — 인자 없으면 불러오기 · {on, rules} 를 주면 저장 (둘 다 대표만 · 보안 낮음 권고) */
async function feeRules(ctx: Ctx, opt?: any) {
  bossOnly(ctx);
  const save = opt && typeof opt === "object" && ("on" in opt || "rules" in opt);
  if (!save) {
    const c: any = await confRow(ctx);
    const f = (c.fee_rules && typeof c.fee_rules === "object") ? c.fee_rules : {};
    return { on: f.on === true, rules: Array.isArray(f.rules) ? f.rules : [] };
  }
  const raw: any[] = Array.isArray(opt.rules) ? opt.rules : [];
  if (raw.length > 50) throw new Error("수수료 규칙은 50개까지 넣을 수 있습니다.");
  const rules = raw.map((r, k) => {
    const who = S(r?.who).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 30);
    const how = S(r?.how);
    const amt = Number(r?.amt);
    if (!who) throw new Error((k + 1) + "번째 규칙의 검사자 이름이 비어 있습니다.");
    if (!FEE_HOW.includes(how)) throw new Error((k + 1) + "번째 규칙의 방법은 «한 대마다» 또는 «검사비 %» 로 골라 주세요.");
    if (how === "한 대마다" && (!Number.isInteger(amt) || amt < 0 || amt > 10_000_000)) throw new Error((k + 1) + "번째 규칙의 금액은 0~10,000,000원 정수로 넣어 주세요.");
    if (how === "검사비 %" && (!Number.isFinite(amt) || amt < 0 || amt > 100 || Math.round(amt * 10) !== amt * 10)) throw new Error((k + 1) + "번째 규칙의 비율은 0~100 (소수 한 자리까지)으로 넣어 주세요.");
    return { who, how, amt };
  });
  const fee_rules = { on: opt.on === true, rules };
  await confPut(ctx, { fee_rules });
  await log(ctx, "수수료 규칙 저장", { on: fee_rules.on, n: rules.length });
  return { ok: true, ...fee_rules };
}
/** ⑤ 문자 수집함 — 인자 없으면 불러오기(비밀번호는 «넣음» 표시만) · {url, pw} 저장 (둘 다 대표만 · pw 를 빼면 그대로 · 빈 글이면 지움) */
async function smsConf(ctx: Ctx, opt?: any) {
  bossOnly(ctx);
  const save = opt && typeof opt === "object" && ("url" in opt || "pw" in opt);
  if (!save) {
    const c: any = await confRow(ctx);
    return { url: S(c.sms_url), pwSet: !!S(c.sms_pw) };
  }
  const patch: Record<string, unknown> = {};
  if ("url" in opt) {
    const url = S(opt.url);
    if (url && (url.length > 500 || !/^https:\/\/[^\s<>"']+$/.test(url))) throw new Error("수집함 주소를 다시 확인해 주세요 (보안 주소만 넣을 수 있어요).");
    patch.sms_url = url || null;
  }
  if ("pw" in opt && opt.pw !== undefined && opt.pw !== null) {
    const pw = String(opt.pw);
    if (pw.length > 100 || /[\u0000-\u001f]/.test(pw)) throw new Error("비밀번호는 100자 안으로 넣어 주세요.");
    patch.sms_pw = pw.trim() ? pw : null;
  }
  await confPut(ctx, patch);
  await log(ctx, "문자 수집함 저장", { url: "url" in patch, pw: "sms_pw" in patch });   // 비밀번호 값은 기록에 안 남김
  const c: any = await confRow(ctx);
  return { ok: true, url: S(c.sms_url), pwSet: !!S(c.sms_pw) };
}

/* ============================================================
   3. 팝빌 — 링크허브 토큰 방식
   ============================================================
   · 링크아이디 · 비밀키 : 티와이컴퍼니(운영사) 것 하나를 모든 검사소가 같이 씁니다.
   · 사업자번호 · 회원아이디 : 검사소마다 다르므로 check_office 에서 꺼내 씁니다.
   · 연동테스트 : check_office.popbill_test 가 참이면 팝빌 테스트 서버로 붙습니다.
     (테스트는 test.popbill.com 에서 만든 아이디 · 사업자번호를 씁니다)
   ------------------------------------------------------------
   순서 : ① auth.linkhub.co.kr 에서 토큰 받기 → ② 팝빌에 Bearer 로 부르기
   ============================================================ */
const POPBILL = {
  linkId: Deno.env.get("POPBILL_LINKID") ?? "",
  /* 비밀값 이름이 POPBILL_SECRET 이든 POPBILL_SECRETKEY 든 둘 다 받습니다 */
  secret: Deno.env.get("POPBILL_SECRETKEY") ?? Deno.env.get("POPBILL_SECRET") ?? "",
};
const LH_AUTH = "https://auth.linkhub.co.kr";
const LH_VER = "2.0";
/** 계좌조회(180) · 세금계산서(110) 를 한 토큰으로 같이 씁니다 */
const POP_SCOPES = ["member", "110", "180"];

function popHost(test: boolean) {
  return test ? "https://popbill-test.linkhub.co.kr" : "https://popbill.linkhub.co.kr";
}
function popService(test: boolean) { return test ? "POPBILL_TEST" : "POPBILL"; }

/** 이 검사소의 팝빌 정보 (사업자번호 · 회원아이디 · 테스트 여부) */
function popWho(office: any) {
  const corp = S(office?.popbill_corp || office?.biz_no).replace(/[^0-9]/g, "");
  const user = S(office?.popbill_userid);
  const test = office?.popbill_test === true;
  if (!POPBILL.linkId || !POPBILL.secret)
    throw new Error("세금계산서 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  if (!corp) throw new Error("이 검사소의 사업자번호가 비어 있습니다. 설정 → 팝빌에서 넣어 주세요.");
  if (!user) throw new Error("이 검사소의 팝빌 회원아이디가 비어 있습니다. 설정 → 팝빌에서 넣어 주세요.");
  /* v32(보안 H1 남은 위험): 처음 넣은 사업자번호는 본사가 확인한 뒤에만 실제 팝빌을 씀 (시험 모드는 됨 · SQL 11 전이면 칸이 없어 그대로) */
  if (office?.biz_ok_at === null && !test) throw new Error(BIZ_WAIT_MSG);
  return { corp, user, test };
}

/* 토큰은 사업자번호 + 서버별로 따로 담아 둡니다 (보통 1시간짜리) */
const popTokens = new Map<string, { token: string; until: number }>();

async function sha256b64(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return btoa(String.fromCharCode(...new Uint8Array(h)));
}
function b64bytes(s: string) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacB64(secretB64: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", b64bytes(secretB64),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

/** ① 링크허브에서 토큰 받기 */
async function popToken(corp: string, test: boolean): Promise<string> {
  const ck = (test ? "T|" : "P|") + corp;
  const got = popTokens.get(ck);
  if (got && got.until > Date.now() + 60_000) return got.token;

  const svc = popService(test);
  const uri = "/" + svc + "/Token";
  const body = JSON.stringify({ access_id: corp, scope: POP_SCOPES });
  const xDate = new Date().toISOString();
  const digest = await sha256b64(body);
  const target = ["POST", digest, xDate, LH_VER, uri].join("\n");
  const sign = await hmacB64(POPBILL.secret, target);

  const res = await fetch(LH_AUTH + uri, {
    method: "POST",
    headers: {
      "x-lh-date": xDate, "x-lh-version": LH_VER,
      "Authorization": "LINKHUB " + POPBILL.linkId + " " + sign,
      "Content-Type": "application/json; charset=utf-8",
    },
    body,
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* 아래에서 알림 */ }
  if (!j || !j.session_token) throw new Error(popWhy(txt, corp, test));
  const until = Date.parse(S(j.expiration)) || (Date.now() + 50 * 60_000);
  popTokens.set(ck, { token: S(j.session_token), until });
  return S(j.session_token);
}

/** 팝빌이 돌려준 오류를 사람 말로 */
function popWhy(txt: string, corp: string, test: boolean) {
  const m = S(txt);
  const where = test ? "연동테스트(test.popbill.com)" : "실제 팝빌(www.popbill.com)";
  if (/-10001|not\s*joined|가입/i.test(m))
    return `${where} 에 사업자번호 ${corp} 로 가입된 회원이 없습니다. 그쪽에서 먼저 가입하고, 사업자번호가 같은지 보세요. (${m.slice(0,120)})`;
  if (/-10003|-10002|linkid|secret|인증/i.test(m))
    return `팝빌 링크아이디 · 비밀키가 맞지 않습니다. 수파베이스 비밀값 POPBILL_LINKID · POPBILL_SECRETKEY 를 보세요. (${m.slice(0,120)})`;
  if (/-10015|ip/i.test(m))
    return `팝빌에서 이 서버 아이피를 막고 있습니다. 팝빌 › 연동정보에서 «IP 제한»을 꺼 주세요. (${m.slice(0,120)})`;
  return "팝빌에 들어가지 못했습니다 : " + m.slice(0, 200);
}

/** ② 팝빌 부르기 (Bearer) */
async function popCall(path: string, method: string, body: string, office: any, over = "") {
  const w = popWho(office);
  const tk = await popToken(w.corp, w.test);
  const head: Record<string, string> = {
    "Authorization": "Bearer " + tk,
    "x-pb-userid": w.user,
    "Content-Type": "application/json; charset=utf-8",
  };
  if (over) head["X-HTTP-Method-Override"] = over;   // ISSUE · DELETE 같은 것
  const res = await fetch(popHost(w.test) + path, {
    method, headers: head, body: body || undefined,
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* 아래에서 */ }
  if (j === null) throw new Error("팝빌 응답을 읽지 못했습니다 : " + txt.slice(0, 200));
  if (j.code !== undefined && N(j.code) < 0) throw new Error("세금계산서: " + (S(j.message) || "처리하지 못했습니다"));
  return j;
}

/** 토큰 없이 부르는 팝빌 (회원가입 · 아이디 확인 · 회원 확인) */
async function popOpen(path: string, method: string, body: string, test: boolean) {
  if (!POPBILL.linkId) throw new Error("서버에 팝빌 링크아이디가 없습니다.");
  const res = await fetch(popHost(test) + path, {
    method, headers: { "Content-Type": "application/json; charset=utf-8" },
    body: body || undefined,
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* 아래에서 */ }
  if (j === null) throw new Error("팝빌 응답을 읽지 못했습니다 : " + txt.slice(0, 200));
  return j;
}

/** 이 사업자번호가 이미 팝빌 회원인지 */
async function popMember(ctx: Ctx, corpNum?: string) {
  const test = ctx.office.popbill_test === true;
  const corp = S(corpNum || ctx.office.popbill_corp || ctx.office.biz_no).replace(/[^0-9]/g, "");
  if (corp.length !== 10) throw new Error("사업자번호를 - 없이 10자리로 넣어 주세요.");
  const j = await popOpen(`/Join?CorpNum=${corp}&LID=${encodeURIComponent(POPBILL.linkId)}`, "GET", "", test);
  /* code 1 = 이미 가입됨 · -11000012 = 아직 아님 */
  const code = N(j?.code);
  return { corp, test, joined: code === 1, code, message: S(j?.message) };
}

/** 쓰려는 아이디가 비어 있는지 */
async function popIdCheck(ctx: Ctx, id: string) {
  const test = ctx.office.popbill_test === true;
  const j = await popOpen("/IDCheck?ID=" + encodeURIComponent(S(id)), "GET", "", test);
  const code = N(j?.code);
  return { free: code === 1, code, message: S(j?.message) };
}

/** 이 검사소를 팝빌 회원으로 가입시킵니다 (연동사 = 티와이컴퍼니 밑으로) */
async function popJoin(ctx: Ctx, form: any) {
  if (ctx.role !== "owner") throw new Error("대표님만 가입시킬 수 있습니다.");
  const o = ctx.office;
  const test = o.popbill_test === true;
  /* v32(보안 H1): 팝빌 가입 번호는 이 검사소 사업자번호로만 (화면이 보낸 번호는 쓰지 않음) */
  const corp = S(o.biz_no).replace(/[^0-9]/g, "");
  if (corp && onlyDigits(form?.corpNum) && onlyDigits(form?.corpNum) !== corp)
    throw new Error("검사소에 등록된 사업자번호로만 가입할 수 있습니다.");
  if (S(o.popbill_corp) && onlyDigits(o.popbill_corp) !== corp)
    throw new Error("이미 다른 번호로 팝빌에 연결되어 있습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  if (corp && await bizTaken(corp, S(o.id))) throw new Error(BIZ_TAKEN_MSG);
  if (o.biz_ok_at === null && !test) throw new Error(BIZ_WAIT_MSG);          // v32: 본사 확인 뒤에만
  const id = S(form?.id), pw = S(form?.password);
  if (corp.length !== 10) throw new Error("사업자번호를 - 없이 10자리로 넣어 주세요.");
  if (id.length < 6) throw new Error("아이디는 6자 이상으로 적어 주세요.");
  if (pw.length < 8) throw new Error("비밀번호는 8자 이상으로 적어 주세요.");
  const body = {
    LinkID: POPBILL.linkId,
    CorpNum: corp,
    CEOName: S(form?.ceoName || o.owner_name),
    CorpName: S(form?.corpName || o.name),
    Addr: S(form?.addr || o.addr),
    BizType: S(form?.bizType || o.biz_type),
    BizClass: S(form?.bizClass || o.biz_class),
    ID: id, Password: pw,
    ContactName: S(form?.contactName || o.tax_contact || o.owner_name),
    ContactEmail: S(form?.contactEmail || o.tax_email),
    ContactTEL: S(form?.contactTel || o.tel),
  };
  for (const k of ["CEOName","CorpName","Addr","BizType","BizClass","ContactName","ContactEmail","ContactTEL"]) {
    if (!S((body as any)[k])) throw new Error("빠진 칸이 있습니다 : " + k + " — 설정 → 거래처에서 먼저 채워 주세요.");
  }
  const j = await popOpen("/Join", "POST", JSON.stringify(body), test);
  if (N(j?.code) !== 1) throw new Error("세금계산서: " + (S(j?.message) || "처리하지 못했습니다"));
  /* 가입에 성공하면 이 검사소 설정에 바로 적어 둡니다 (비밀번호는 저장하지 않습니다) */
  await db.from("check_office").update({ popbill_corp: corp, popbill_userid: id, popbill_corp_name: S(body.CorpName) })
    .eq("id", o.id);
  popTokens.clear();
  await log(ctx, "팝빌 회원가입", { corp, id });   /* 비밀번호는 적지 않습니다 */
  return { ok: true, corp, id };
}

/* ───────── 팝빌 연동 상태 · 계좌 ───────── */

/** 설정 → 팝빌 화면에 보여 줄 것 전부 */
async function popInfo(ctx: Ctx) {
  const o = ctx.office;
  const out: any = {
    corp: S(o.popbill_corp || o.biz_no), user: S(o.popbill_userid),
    corpName: S(o.popbill_corp_name) || S(o.name),
    officeCorp: S(o.biz_no).replace(/[^0-9]/g, ""),
    officeName: S(o.name),
    test: o.popbill_test === true,
    keyReady: !!(POPBILL.linkId && POPBILL.secret),
    linked: false, why: "", point: null as number | null,
    partnerPoint: null as number | null,
    bankCharge: null as any, taxCharge: null as any,
    joined: null as boolean | null,
  };
  if (!out.keyReady) { out.why = "서버에 팝빌 링크아이디 · 비밀키가 없습니다."; return out; }
  if (!out.corp || !out.user) { out.why = "사업자번호와 팝빌 회원아이디를 넣어 주세요."; return out; }
  try {
    const w = popWho(o);
    const tk = await popToken(w.corp, w.test);
    out.linked = !!tk;
    out.joined = true;
    /* ① 이 회원(검사소)의 포인트 */
    try {
      const r = await fetch(LH_AUTH + "/" + popService(w.test) + "/Point",
        { headers: { "Authorization": "Bearer " + tk } });
      const j = await r.json();
      out.point = N(j?.remainPoint);
    } catch { /* 없어도 괜찮습니다 */ }
    /* ② 파트너(티와이컴퍼니) 포인트 — 요금은 여기서 빠집니다 */
    try {
      const r = await fetch(LH_AUTH + "/" + popService(w.test) + "/PartnerPoint",
        { headers: { "Authorization": "Bearer " + tk } });
      const j = await r.json();
      out.partnerPoint = N(j?.remainPoint);
    } catch { /* 없어도 괜찮습니다 */ }
    try { out.bankCharge = await popCall("/EasyFin/Bank/ChargeInfo", "GET", "", o); } catch { /* 미신청일 수 있음 */ }
    try { out.taxCharge = await popCall("/Taxinvoice/ChargeInfo", "GET", "", o); } catch { /* 미신청일 수 있음 */ }
  } catch (e) {
    out.why = (e as Error).message;
    /* 아직 팝빌 회원이 아닌지 확인해 둡니다 — 화면에서 «회원으로 추가» 를 띄우려고 */
    try { out.joined = (await popMember(ctx, out.corp)).joined; } catch { /* 넘어갑니다 */ }
  }
  return out;
}

/** 팝빌에 등록해 둔 계좌 목록 (팝빌 사이트에서 먼저 등록해야 보입니다) */
async function popBanks(ctx: Ctx) {
  const list = await popCall("/EasyFin/Bank/ListBankAccount", "GET", "", ctx.office);
  return (Array.isArray(list) ? list : []).map((b: any) => ({
    bankCode: S(b.bankCode), acctNo: S(b.accountNumber), name: S(b.accountName),
    type: S(b.accountType), state: N(b.state), use: S(b.contractState || ""),
    until: S(b.contractEndDate || ""),
  }));
}

/** 우리 표에 담아 둔 계좌 (실제로 가져올 계좌) */
async function bankList(ctx: Ctx) {
  const { data } = await db.from("check_bank").select("*")
    .eq("office_id", ctx.office.id).order("use_for");
  return (data ?? []).map((b: any) => ({
    id: S(b.id), bankCode: S(b.bank_code), bankName: S(b.bank_name), acctNo: S(b.acct_no),
    nickname: S(b.nickname), useFor: S(b.use_for) || "검사비",
    active: b.active !== false, lastAt: b.last_at ? fmtTs(new Date(new Date(b.last_at).getTime() + KST)) : "",
  }));
}
async function bankSave(ctx: Ctx, row: any) {
  if (ctx.role !== "owner") throw new Error("대표님만 고칠 수 있습니다.");
  const acct = S(row?.acctNo).replace(/[^0-9]/g, "");
  if (!acct) throw new Error("계좌번호를 넣어 주세요.");
  if (!S(row?.bankCode)) throw new Error("기관코드를 넣어 주세요. (팝빌에 등록된 계좌에서 고르면 저절로 들어갑니다)");
  const up: any = {
    office_id: ctx.office.id, bank_code: S(row.bankCode), bank_name: S(row.bankName),
    acct_no: acct, nickname: S(row.nickname), use_for: S(row.useFor) || "검사비",
    active: row.active !== false,
  };
  const { error } = await db.from("check_bank").upsert(up, { onConflict: "office_id,acct_no" });
  if (error) throw new Error(error.message);
  await log(ctx, "팝빌 계좌 저장", { acct, use: up.use_for });
  return { ok: true };
}
async function bankDel(ctx: Ctx, id: string) {
  if (ctx.role !== "owner") throw new Error("대표님만 지울 수 있습니다.");
  await db.from("check_bank").delete().eq("office_id", ctx.office.id).eq("id", S(id));
  return { ok: true };
}

/** 수집 요청 → 상태 확인 → 거래내역 가져오기 (한 번에) */
async function bankPull(ctx: Ctx, opt: { days?: number } = {}) {
  const days = Math.min(31, Math.max(1, opt.days ?? 7));
  popWho(ctx.office);                                  // 설정이 비어 있으면 여기서 멈춥니다
  const { data: accts } = await db.from("check_bank").select("*")
    .eq("office_id", ctx.office.id).eq("active", true);
  if (!accts?.length) throw new Error("가져올 계좌가 없습니다. 설정 → 팝빌에서 계좌를 넣어 주세요.");
  const end = new Date(), start = new Date(Date.now() - days * 86400000);
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  let got = 0; const bad: string[] = [];
  for (const a of accts) {
    try {
      // ① 수집 요청
      const job = await popCall(
        `/EasyFin/Bank/${a.bank_code}/${a.acct_no}?SDate=${ymd(start)}&EDate=${ymd(end)}`,
        "POST", "", ctx.office);
      const jobId = S(job?.jobID ?? job?.jobId);
      if (!jobId) { bad.push(S(a.acct_no) + " 수집 요청이 안 됐습니다"); continue; }
      // ② 끝날 때까지 잠깐 기다립니다 (보통 몇 초)
      let done = false;
      for (let i = 0; i < 12; i++) {
        const st = await popCall(`/EasyFin/Bank/${jobId}/State`, "GET", "", ctx.office);
        if (N(st?.jobState) === 3) { done = true; break; }
        if (N(st?.errorCode) < 0) { bad.push(S(a.acct_no) + " : " + S(st?.errorReason)); break; }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!done) { bad.push(S(a.acct_no) + " 수집이 아직 안 끝났습니다. 조금 뒤 다시 눌러 주세요."); continue; }
      // ③ 거래내역 가져오기 (입금만)
      const res = await popCall(`/EasyFin/Bank/${jobId}?TradeType=I&Page=1&PerPage=500&Order=D`,
        "GET", "", ctx.office);
      const xl = await depDupKeys(ctx.office.id, start.toISOString(), new Date(end.getTime() + 86400000).toISOString(), "엑셀");   // v38
      /* v49.1: «같은 줄 막기 규칙»(office_id,uniq_key 유일 · SQL 15 ③)에 기대지 않음 — 규칙이 없으면 예전 upsert 가
         오류로 조용히 버려져 팝빌 입금이 하나도 안 들어갔음. 엑셀 넣기(v41)와 같게 먼저 거르고 그냥 넣음 · 오류는 bad 로 알림 */
      const rows: any[] = [];
      for (const t of res?.list ?? []) {
        const amount = N(t.accIn);
        if (!amount) continue;
        if (xl.has(depKey(toTs(S(t.trdate), S(t.trtime)), amount, S(t.remark1) || S(t.remark2)))) continue;   // v38: 엑셀로 이미 넣은 입금
        const uniq = `${a.acct_no}|${S(t.trdate)}${S(t.trserial)}|${amount}`;
        rows.push({
          office_id: ctx.office.id, bank_id: a.id,
          tx_at: toTs(S(t.trdate), S(t.trtime)), sender: S(t.remark1) || S(t.remark2),
          amount, balance: N(t.balance), kind: S(a.use_for) || "미분류",
          state: "확인 대기", src: "팝빌", uniq_key: uniq,
        });
      }
      const seen = new Set<string>();
      for (let k = 0; k < rows.length; k += 200) {
        const { data: had } = await db.from("check_deposit").select("uniq_key").eq("office_id", ctx.office.id)
          .in("uniq_key", rows.slice(k, k + 200).map((r) => r.uniq_key));
        for (const h of had ?? []) seen.add(S(h.uniq_key));
      }
      const put = rows.filter((r) => { if (seen.has(r.uniq_key)) return false; seen.add(r.uniq_key); return true; });
      let fail = 0;
      for (const one of put) {
        const { error } = await db.from("check_deposit").insert(one);
        if (!error) got++;
        else if (S((error as any).code) !== "23505") fail++;   // 23505 = 그새 같은 줄이 들어옴(겹침) — 건너뜀
      }
      if (fail) bad.push(S(a.acct_no) + " : 입금 " + fail + "건을 넣지 못했습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
      await db.from("check_bank").update({ last_job: jobId, last_at: new Date().toISOString() }).eq("id", a.id);
    } catch (e) { bad.push(S(a.acct_no) + " : " + (e as Error).message); }
  }
  const matched = await depositMatch(ctx);
  await log(ctx, "팝빌 계좌조회", { got, matched, bad });
  return { got, matched, bad };
}
function toTs(d: string, t: string) {
  const s = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${(t||"000000").slice(0,2)}:${(t||"000000").slice(2,4)}:00+09:00`;
  return new Date(s).toISOString();
}


/* ============================================================
   3-2. 솔라피 — 문자 보내기
   열쇠는 티와이컴퍼니 것 하나를 모두가 같이 쓰고,
   '보내는 번호'만 검사소마다 다릅니다 (가온 = 010-9695-3663).
   ============================================================ */
const SOLAPI = {
  key: Deno.env.get("SOLAPI_KEY") ?? "",
  secret: Deno.env.get("SOLAPI_SECRET") ?? "",
};
function smsFrom(office: any) {
  const from = S(office?.sms_from).replace(/[^0-9]/g, "");
  if (!SOLAPI.key || !SOLAPI.secret)
    throw new Error("문자 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  if (!from) throw new Error("이 검사소의 보내는 번호가 비어 있습니다. 설정 → 검사소 정보에서 넣어 주세요.");
  return from;
}

/* ============================================================
   v38. 입금 처리 — 손으로 맞추기·되돌리기·갈래·지우기·되살리기·은행 엑셀 (체크 v47 약속)
   ============================================================ */
const DEP_KINDS = ["검사비", "정비비", "보험료", "기타", "미분류"];
const DEP_OP_DAY = () => Number(env("CHECK_DEP_OP_DAY", "300"));
/** 겹침 열쇠 — 한국 날짜 · 금액 · 보낸 분(공백·(주) 뗌) */
function depKey(txAt: string, amount: number, sender: string) {
  const t = new Date(S(txAt)).getTime();
  const d = isFinite(t) ? new Date(t + KST).toISOString().slice(0, 10) : "";
  return d + "|" + Math.round(N(amount)) + "|" + norm(sender).toLowerCase();
}
async function depDupKeys(officeId: string, fromIso: string, toIso: string, src?: string) {
  let q = db.from("check_deposit").select("tx_at,amount,sender,src,state").eq("office_id", officeId).gte("tx_at", fromIso).lt("tx_at", toIso);
  if (src) q = q.eq("src", src);
  const { data } = await q.limit(20000);
  return new Set((data ?? []).filter((d: any) => S(d.state) !== "지움").map((d: any) => depKey(S(d.tx_at), N(d.amount), S(d.sender))));
}
function depIds(opt: any, max: number) {
  const ids = [...new Set(((Array.isArray(opt) ? opt : opt?.ids) ?? []).map(S).filter(Boolean))] as string[];
  if (!ids.length) throw new Error("고른 입금이 없습니다.");
  if (ids.length > max) throw new Error("한 번에 " + max + "건까지 할 수 있습니다.");
  return ids;
}
async function depMine(ctx: Ctx, ids: string[]) {
  const { data } = await db.from("check_deposit").select("*").eq("office_id", ctx.office.id).in("id", ids);
  if ((data ?? []).length !== ids.length) throw new Error("이 검사소 입금이 아닌 줄이 섞여 있습니다. 화면을 새로 고쳐 주세요.");
  return data as any[];
}
async function depOpOk(ctx: Ctx, n: number) {
  for (let i = 0; i < Math.max(1, n); i++)
    if (!(await rateOk("depop:" + S(ctx.office.id) + ":" + ymdK(kstNow()), DEP_OP_DAY())))
      throw new Error("오늘 입금 처리 한도를 다 썼습니다. 내일 다시 해 주세요.");
}
/** 청구서 받은 금액 더하기·빼기 — SQL 13 함수로 한 번에 (없으면 다시 읽어 더함) · 0원이 되면 «보냄/만듦» 으로 */
async function invoicePaidAdd(officeId: string, inv: any, amount: number) {
  let paid = 0;
  const add = await db.rpc("check_invoice_add_paid", { p_office: officeId, p_id: S(inv.id), p_amount: amount });
  if (!add.error && add.data != null) paid = N(Array.isArray(add.data) ? add.data[0] : add.data);
  else {
    const { data: cur } = await db.from("check_invoice").select("paid_amount").eq("office_id", officeId).eq("id", S(inv.id)).maybeSingle();
    paid = N(cur?.paid_amount ?? inv.paid_amount) + amount;
    await db.from("check_invoice").update({ paid_amount: paid, state: paid >= N(inv.total_amount) ? "완료" : "수금중" }).eq("office_id", officeId).eq("id", S(inv.id));
  }
  if (paid <= 0) await db.from("check_invoice").update({ paid_amount: Math.max(0, paid), state: inv.sent_at ? "보냄" : "만듦" }).eq("office_id", officeId).eq("id", S(inv.id));
  return paid;
}
/** 고른 입금을 그 청구서에 맞추기 — 대표·직원 · «확인 대기» 이고 아직 안 맞춘 것만(조건부로 먼저 잡기) */
async function depositApply(ctx: Ctx, opt: any) {
  const ids = depIds(opt, 50);
  const invId = S(opt?.invoiceId);
  const { data: inv } = await db.from("check_invoice").select("*").eq("office_id", ctx.office.id).eq("id", invId).maybeSingle();
  if (!inv) throw new Error("이 검사소의 청구서를 골라 주세요.");
  const rows = await depMine(ctx, ids);
  await depOpOk(ctx, ids.length);
  let n = 0;
  for (const dep of rows) {
    const { data: got } = await db.from("check_deposit").update({ invoice_id: inv.id, dealer_id: inv.bill_to_id, state: "입금 처리",
      kind: S(dep.kind) === "미분류" || !S(dep.kind) ? "검사비" : dep.kind })
      .eq("office_id", ctx.office.id).eq("id", dep.id).eq("state", "확인 대기").is("invoice_id", null).select("id");
    if (!got?.length) continue;
    await db.from("check_deposit").update({ hold: false }).eq("office_id", ctx.office.id).eq("id", dep.id).then(() => {}, () => {});
    if (S(dep.kind) === "미분류" || !S(dep.kind)) await depKindAuto(ctx, S(dep.id));   // v43: 서버가 갈래를 바꿨다고 표시
    await invoicePaidAdd(S(ctx.office.id), inv, N(dep.amount));
    n++;
    await depositNotice(ctx, inv, dep).catch((e) => console.error("deposit notice", e));
  }
  const { data: now } = await db.from("check_invoice").select("id,paid_amount,total_amount,state").eq("office_id", ctx.office.id).eq("id", inv.id).maybeSingle();
  await log(ctx, "입금 처리", { invoice: S(inv.id), ids, n });
  return { n, invoice: { id: S(inv.id), paid: N(now?.paid_amount), total: N(now?.total_amount), state: S(now?.state) } };
}
/** v43: 맞출 때 서버가 갈래를 «검사비» 로 채웠다는 표시(kind_auto · SQL 16) — 칸이 없으면 조용히 넘어감 */
async function depKindAuto(ctx: Ctx, id: string) {
  await db.from("check_deposit").update({ kind_auto: true }).eq("office_id", ctx.office.id).eq("id", id).then(() => {}, () => {});
}
/** 맞춘 것 되돌리기 — 대표·직원 · 청구서 금액 빼기 · 입금은 «확인 대기» 로(자동 맞추기가 다시 잡지 않게 hold) */
async function depositUnapply(ctx: Ctx, opt: any) {
  const ids = depIds(opt, 50);
  const rows = await depMine(ctx, ids);
  await depOpOk(ctx, ids.length);
  let n = 0;
  for (const dep of rows) {
    if (!S(dep.invoice_id) || !["자동 반영", "입금 처리"].includes(S(dep.state))) continue;
    const { data: got } = await db.from("check_deposit").update({ invoice_id: null, dealer_id: null, state: "확인 대기" })
      .eq("office_id", ctx.office.id).eq("id", dep.id).eq("invoice_id", dep.invoice_id).eq("state", dep.state).select("id");
    if (!got?.length) continue;
    await db.from("check_deposit").update({ hold: true }).eq("office_id", ctx.office.id).eq("id", dep.id).then(() => {}, () => {});
    /* v43(체크 방 TEST): 맞출 때 서버가 «미분류 → 검사비» 로 바꾼 것만 «미분류» 로 되돌림 (사람이 고른 갈래는 그대로) · SQL 16 없으면 지금처럼 */
    await db.from("check_deposit").update({ kind: "미분류", kind_auto: false }).eq("office_id", ctx.office.id).eq("id", dep.id).eq("kind_auto", true).then(() => {}, () => {});
    const { data: inv } = await db.from("check_invoice").select("*").eq("office_id", ctx.office.id).eq("id", S(dep.invoice_id)).maybeSingle();
    if (inv) await invoicePaidAdd(S(ctx.office.id), inv, -N(dep.amount));
    n++;
  }
  await log(ctx, "입금 되돌림", { ids, n });
  return { n };
}
/** 갈래만 바꾸기 — 대표·직원 */
async function depositKind(ctx: Ctx, opt: any) {
  const ids = depIds(opt, 200);
  const kind = S(opt?.kind);
  if (!DEP_KINDS.includes(kind)) throw new Error("갈래를 다시 골라 주세요.");
  await depMine(ctx, ids);
  await depOpOk(ctx, 1);
  await db.from("check_deposit").update({ kind }).eq("office_id", ctx.office.id).in("id", ids);
  await db.from("check_deposit").update({ kind_auto: false }).eq("office_id", ctx.office.id).in("id", ids).then(() => {}, () => {});   // v43: 사람이 고른 갈래는 되돌릴 때도 지킴
  await log(ctx, "입금 갈래", { ids, kind });
  return { n: ids.length };
}
/** 지우기(휴지통) — 대표만 · 맞춘 것은 «먼저 되돌려 주세요» */
async function depositDel(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const ids = depIds(opt, 200);
  const rows = await depMine(ctx, ids);
  const kept = rows.filter((d) => S(d.invoice_id)).map((d) => ({ id: S(d.id), why: "청구서에 맞춘 입금이에요. 먼저 되돌려 주세요." }));
  const go = rows.filter((d) => !S(d.invoice_id) && S(d.state) !== "지움").map((d) => S(d.id));
  if (go.length) await db.from("check_deposit").update({ state: "지움" }).eq("office_id", ctx.office.id).in("id", go).is("invoice_id", null);
  await log(ctx, "입금 지움", { ids: go, kept: kept.length });
  return { n: go.length, kept };
}
/** 휴지통에서 되살리기 — 대표만 */
async function depositRestore(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const ids = depIds(opt, 200);
  await depMine(ctx, ids);
  const { data } = await db.from("check_deposit").update({ state: "확인 대기" }).eq("office_id", ctx.office.id).in("id", ids).eq("state", "지움").select("id");
  await log(ctx, "입금 되살림", { ids, n: (data ?? []).length });
  return { n: (data ?? []).length };
}
/** 휴지통 목록 — 대표만 */
async function depositTrash(ctx: Ctx) {
  bossOnly(ctx);
  const { data } = await db.from("check_deposit").select("*").eq("office_id", ctx.office.id).eq("state", "지움")
    .order("tx_at", { ascending: false }).limit(500);
  return data ?? [];
}
/** v41: 엑셀 줄이 어느 계좌 것인지 — 화면이 bankId 를 보내면 이 검사소 계좌인지 확인 · 안 보내면 쓰는 계좌가 하나뿐일 때 그 계좌 · 아니면 비움 */
async function depImportBank(ctx: Ctx, want: unknown): Promise<string | null> {
  const { data } = await db.from("check_bank").select("id, active").eq("office_id", ctx.office.id);
  const mine = (data ?? []) as any[];
  if (S(want)) {
    if (!mine.some((b) => S(b.id) === S(want))) throw new Error("고른 계좌가 이 검사소 계좌가 아니에요. 다시 골라 주세요.");
    return S(want);
  }
  const live = mine.filter((b) => b.active !== false);
  return live.length === 1 ? S(live[0].id) : null;
}
/** v41: 넣기 실패 까닭 갈래 — 화면에는 쉬운 말만(원문은 기록에만 · 번호 가림) */
const DEP_COL: Record<string, string> = { bank_id: "계좌", balance: "잔액", tx_at: "입금 시각", sender: "보낸 분", amount: "금액", kind: "갈래", src: "가져온 곳", state: "상태", uniq_key: "겹침 확인 글" };
function depImportWhy(error: any): string {
  const code = S(error?.code), raw = [S(error?.message), S(error?.details)].join(" ");
  console.error("depositImport", code, raw.slice(0, 300).replace(/\d[\d-]{8,}\d/g, (d) => d.slice(0, 3) + "****" + d.slice(-4)));
  const col = Object.keys(DEP_COL).find((c) => new RegExp(`"${c}"|\\b${c}\\b|_${c}_`).test(raw));
  const what = col ? `«${DEP_COL[col]}» 칸` : "한 칸";
  const fix = " 서버 방이 준비한 15번 고침(입금 엑셀)을 실행하면 풀려요.";
  if (code === "23502") return `입금을 넣지 못했어요. 까닭: 빈 칸 제한 — 입금 표가 ${what}을 꼭 채우게 되어 있어요.` + fix;
  if (code === "23514") return `입금을 넣지 못했어요. 까닭: 값 제한 — 입금 표가 ${what}에 정해진 값만 받게 되어 있어요.` + fix;
  if (code === "23503") return `입금을 넣지 못했어요. 까닭: 연결 제한 — ${what}이 다른 표와 이어져 있지 않아요. 계좌를 골라서 다시 넣어 주세요.`;
  if (code === "23505" || code === "42P10") return "입금을 넣지 못했어요. 까닭: 중복 — 이미 들어온 줄과 겹쳐요. 화면을 새로 고친 뒤 다시 넣어 주세요.";
  if (code === "42703" || code === "42P01") return "입금을 넣지 못했어요. 까닭: 표 모양 — 입금 표에 필요한 칸이 없어요." + fix;
  return "입금을 넣지 못했어요. 까닭: 연결 — 잠시 뒤 다시 해 주세요. 계속되면 서버 방에 알려 주세요.";
}
/** 은행 엑셀 넣기 — 대표만 · 1,000줄 · 같은 줄 두 번 안 들어감 · 팝빌 줄과 겹치면 dup (force 줄은 넣음) · 끝나면 자동 맞추기 한 번 */
async function depositImport(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const rows: any[] = Array.isArray(opt?.rows) ? opt.rows : [];
  if (!rows.length) throw new Error("넣을 줄이 없습니다.");
  if (rows.length > 1000) throw new Error("한 번에 1,000줄까지 넣을 수 있습니다.");
  const now = Date.now(), oldest = now - 400 * 86400000;
  const bad: any[] = [], good: any[] = [];
  rows.forEach((r, i) => {
    const t = new Date(S(r?.tx_at)).getTime();
    const amount = Number(r?.amount);
    const sender = S(r?.sender).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 40);
    if (!isFinite(t) || t < oldest || t > now + 86400000) return bad.push({ row: i, why: "날짜가 올바르지 않거나 400일보다 오래됐어요" });
    if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000_000) return bad.push({ row: i, why: "금액은 0보다 큰 정수여야 해요" });
    if (!sender) return bad.push({ row: i, why: "보낸 분 이름이 비어 있어요" });
    const iso = new Date(t).toISOString();
    const minute = new Date(t + KST).toISOString().slice(0, 16);
    const bal = Number(r?.balance);
    good.push({ i, iso, amount, sender, force: r?.force === true, memo: S(r?.memo).slice(0, 100),
      balance: Number.isInteger(bal) && Math.abs(bal) <= 1e13 ? bal : 0,
      uniq: "x|" + minute + "|" + amount + "|" + sender });
  });
  let got = 0, dup = 0;
  if (good.length) {
    const bankId = await depImportBank(ctx, opt?.bankId);
    const ts = good.map((g) => Date.parse(g.iso));
    const from = new Date(Math.min(...ts) - 86400000).toISOString(), to = new Date(Math.max(...ts) + 2 * 86400000).toISOString();
    const pop = await depDupKeys(ctx.office.id, from, to, "팝빌");
    const { data: had } = await db.from("check_deposit").select("uniq_key").eq("office_id", ctx.office.id).in("uniq_key", good.map((g) => g.uniq));
    const seen = new Set((had ?? []).map((h: any) => S(h.uniq_key)));
    const put: any[] = [];
    for (const g of good) {
      if (seen.has(g.uniq) || (!g.force && pop.has(depKey(g.iso, g.amount, g.sender)))) { dup++; continue; }
      seen.add(g.uniq);
      put.push({ office_id: ctx.office.id, bank_id: bankId, tx_at: g.iso, sender: g.sender, amount: g.amount, balance: g.balance,
        kind: "미분류", state: "확인 대기", src: "엑셀", uniq_key: g.uniq });
    }
    // v41: «겹침 막기 규칙»(office_id,uniq_key 유일)에 기대지 않고 그냥 넣음 — 위에서 이미 겹침을 걸렀고, 그새 같은 줄이 들어왔으면 한 줄씩 다시
    for (let k = 0; k < put.length; k += 200) {
      const part = put.slice(k, k + 200);
      const { error } = await db.from("check_deposit").insert(part);
      if (!error) { got += part.length; continue; }
      if (S((error as any).code) !== "23505") throw new Error(depImportWhy(error));
      for (const one of part) {
        const { error: e1 } = await db.from("check_deposit").insert(one);
        if (!e1) got++;
        else if (S((e1 as any).code) === "23505") dup++;
        else throw new Error(depImportWhy(e1));
      }
    }
  }
  const matched = got ? await depositMatch(ctx) : 0;
  await log(ctx, "은행 엑셀 넣기", { got, dup, bad: bad.length, matched });
  return { got, dup, bad, matched };
}

/** 들어온 입금을 청구서와 맞춰 봅니다 (입금자명 → 청구처 · 포함 딜러) */
async function depositMatch(ctx: Ctx) {
  const { data: waits } = await db.from("check_deposit").select("*")
    .eq("office_id", ctx.office.id).eq("state", "확인 대기").is("invoice_id", null).limit(500);
  if (!waits?.length) return 0;
  const { data: invs } = await db.from("check_invoice").select("*")
    .eq("office_id", ctx.office.id).in("state", ["만듦", "보냄", "수금중"]);
  let n = 0;
  for (const dep of waits) {
    if (dep.hold === true) continue;                                  // v38: 사람이 되돌린 입금은 자동으로 다시 안 잡음
    const who = norm(dep.sender);
    if (!who) continue;
    const hit = (invs ?? []).find((v) =>
      norm(v.bill_to_name) === who ||
      (v.members ?? []).some((m: string) => norm(m) === who) ||
      norm(v.company_name) === who);
    if (!hit) continue;
    /* v35(보안 중간 2f38fbb): 두 요청이 겹쳐도 같은 입금은 한 번만 — 조건부로 먼저 잡고, 잡힌 것만 더하고 알림 */
    const { data: got } = await db.from("check_deposit").update({
      invoice_id: hit.id, dealer_id: hit.bill_to_id, state: "자동 반영",
      kind: dep.kind === "미분류" ? "검사비" : dep.kind,
    }).eq("office_id", ctx.office.id).eq("id", dep.id).eq("state", "확인 대기").is("invoice_id", null).select("id");
    if (!got?.length) continue;
    if (dep.kind === "미분류") await depKindAuto(ctx, S(dep.id));      // v43
    /* v36(보안 낮음 참고): SQL 13 함수로 한 번에 더함 — 서로 다른 입금이 같은 청구서에 겹쳐도 빠지지 않게. 없으면 예전 방식 */
    let paid = 0;
    const add = await db.rpc("check_invoice_add_paid", { p_office: ctx.office.id, p_id: hit.id, p_amount: N(dep.amount) });
    if (!add.error && add.data != null) paid = N(Array.isArray(add.data) ? add.data[0] : add.data);
    else {
      const { data: cur } = await db.from("check_invoice").select("paid_amount").eq("office_id", ctx.office.id).eq("id", hit.id).maybeSingle();
      paid = N(cur?.paid_amount ?? hit.paid_amount) + N(dep.amount);
      await db.from("check_invoice").update({
        paid_amount: paid, state: paid >= N(hit.total_amount) ? "완료" : "수금중",
      }).eq("id", hit.id);
    }
    hit.paid_amount = paid; n++;
    await depositNotice(ctx, hit, dep).catch((e) => console.error("deposit notice", e));   // v35: 입금확인 알림톡
  }
  return n;
}
/* v35(대표님 10/18 · 알림톡 확정본 5 «차곳간_입금확인»): 입금이 청구서에 맞춰지면 그 청구처에 한 번 알림 — 원문 그대로, 변수만.
   받는 번호는 이 검사소 청구처 딜러의 등록 번호만 · 청구서 보내기와 같은 하루 상한 · 같은 입금은 한 번(자동 반영은 한 번만 일어남) */
const DEPOSIT_SMS = "[차곳간] #{금액}원 입금 확인되었습니다. 감사합니다.\n#{업체명} #{업체전화}";
async function depositNotice(ctx: Ctx, inv: any, dep: any) {
  const o = ctx.office;
  if (dep?.notice_at) return;                                       // v38: 입금마다 한 번 (되돌렸다 다시 맞춰도 다시 안 보냄)
  if (!S(inv.bill_to_id)) return;
  const { data: d } = await db.from("check_dealer").select("tel,active").eq("office_id", o.id).eq("id", S(inv.bill_to_id)).maybeSingle();
  const to = onlyDigits(d?.tel);
  if (!d || d.active === false || !/^01\d{8,9}$/.test(to)) return;
  if (!(await rateOk("bill:o:" + S(o.id) + ":" + ymdK(kstNow()), BILL_DAY_MAX()))) return;
  const [yy, mm] = S(inv.ym).split("-");
  const kd = new Date(new Date(S(dep.tx_at) || Date.now()).getTime() + KST);   // v36: «10월 18일 14:30» (알림톡 방 제안)
  const when = (kd.getUTCMonth() + 1) + "월 " + kd.getUTCDate() + "일 " + String(kd.getUTCHours()).padStart(2, "0") + ":" + String(kd.getUTCMinutes()).padStart(2, "0");
  const vars: Record<string, string> = {
    "#{받는곳}": S(inv.bill_to_name) || "-", "#{금액}": Math.round(N(dep.amount)).toLocaleString("ko-KR"),
    "#{업체명}": S(o.name) || "-", "#{확인일시}": when,
    "#{기간}": yy && mm ? yy + "년 " + Number(mm) + "월" : "-", "#{업체전화}": S(o.tel) || "-",
  };
  /* v38: 먼저 «보냄» 을 조건부로 잡음 (SQL 14 전이면 칸이 없어 그냥 보냄 — 예전과 같음) */
  const nowIso = new Date().toISOString();
  const cl = await db.from("check_deposit").update({ notice_at: nowIso }).eq("office_id", o.id).eq("id", S(dep.id)).is("notice_at", null).select("id");
  if (!cl.error && !(cl.data ?? []).length) return;
  const s2 = await ataSend(o, to, "deposit_ok", vars, DEPOSIT_SMS, { shop: S(o.code), tpl: "check_deposit_ok", ref: S(dep.id) });
  await log(ctx, "입금확인 알림", { invoice: S(inv.id), ok: s2.ok, how: s2.how });
}

/* ============================================================
   4. 자료 옮기기 (가온정산 전체 옮기기 파일 받기)
   ============================================================ */
/** 가온정산 예전 자료 가져오기 — v24: 가온(GAON) 검사소만 (대표님 결정 2026-10-14) */
const LEGACY_OFFICE = "GAON";
async function importLegacy(ctx: Ctx, part: string, rows: any[]) {
  if (S(ctx?.office?.code).toUpperCase() !== LEGACY_OFFICE)
    throw new Error("예전 자료 가져오기는 가온진단평가 검사소만 쓸 수 있습니다.");
  if (!Array.isArray(rows) || !rows.length) return { n: 0 };
  let n = 0;
  if (part === "company") {
    for (const r of rows) {
      await db.from("check_company").upsert({
        office_id: ctx.office.id, name: S(r.상사명 || r.name), biz_no: S(r.사업자등록번호 || r.biz_no),
        ceo: S(r.대표자 || r.ceo), addr: S(r.주소 || r.addr), tel: S(r.전화 || r.tel),
        manager: S(r.담당자), manager_tel: S(r.담당자휴대폰),
      }, { onConflict: "office_id,name" });
      n++;
    }
  } else if (part === "dealer") {
    for (const r of rows) {
      const comp = S(r.소속 || r.상호 || r.company);
      const { data: c } = comp
        ? await db.from("check_company").select("id").eq("office_id", ctx.office.id).eq("name", comp).maybeSingle()
        : { data: null };
      await db.from("check_dealer").upsert({
        office_id: ctx.office.id, name: S(r.딜러 || r.name), company_id: c?.id ?? null,
        tel: S(r.휴대폰 || r.tel), tels: r.추가번호 ?? [],
        issuer_kind: S(r.발행근거) === "딜러 사업자" ? "dealer" : (S(r.발행근거) === "미등록" ? "none" : "company"),
        issuer_name: S(r.발행처 || r.issuer_name), issuer_biz: S(r.사업자등록번호 || r.issuer_biz),
        tax_issue: S(r.계산서발행여부) !== "미발행",
      }, { onConflict: "office_id,name,company_id" });
      n++;
    }
  } else if (part === "band") {
    // 단가표 — [{from:"2026-06-01", items:[{code,name,price}]}]
    for (const b of rows) {
      const from = S(b.from || b.from_date).slice(0, 10);
      if (!from) continue;
      await db.from("check_price_band").upsert({
        office_id: ctx.office.id, from_date: from, items: b.items ?? [],
      }, { onConflict: "office_id,from_date" });
      n++;
    }
  } else if (part === "office") {
    // 검사소 정보 — 가온정산 '공급자'
    bossOnly(ctx);                                           // v32(보안 M3): 계좌가 바뀌므로 대표만
    const o = rows[0] ?? {};
    const up: Record<string, unknown> = {};
    if (S(o.상호)) up.name = S(o.상호);
    if (S(o.사업자등록번호) && !S(ctx.office?.biz_no)) {                    // v32(H1): 비어 있을 때만 · 본사 확인 기다림
      if (await bizTaken(S(o.사업자등록번호), S(ctx.office?.id))) throw new Error(BIZ_TAKEN_MSG);
      up.biz_no = S(o.사업자등록번호);
      try { await db.from("check_office").update({ biz_ok_at: null }).eq("id", ctx.office.id); await db.from("check_office").update({ biz_set_at: new Date().toISOString() }).eq("id", ctx.office.id); } catch (_) { /* SQL 11 전 */ }
    }
    if (S(o.대표자)) up.owner_name = S(o.대표자);
    if (S(o.연락처)) up.tel = S(o.연락처);
    if (S(o.검사비계좌)) up.bank_fee = S(o.검사비계좌);
    if (S(o.정비비계좌)) up.bank_repair = S(o.정비비계좌);
    if (Object.keys(up).length) {
      await db.from("check_office").update(up).eq("id", ctx.office.id);
      n++;
    }
  } else if (part === "car") {
    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const part2 = rows.slice(i, i + chunk).map((r: any) => ({
        office_id: ctx.office.id,
        no: S(r.성능번호) || ("@" + S(r.차량번호) + "/" + S(r.검사일).slice(0, 10)),
        vin: S(r.차대번호), plate: S(r.차량번호),
        car_name: S(r.차명), check_date: S(r.검사일).slice(0, 10), comp_text: S(r.회사명),
        dealer_text: S(r.신청인), goods: S(r.상품명), amount: N(r.금액), ins_fee: N(r.성능보험료),
        ins_pay: (["Y", "N", "P"].includes(S(r.보험료납부).toUpperCase()) ? S(r.보험료납부).toUpperCase() : "N"),
      })).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.check_date));
      if (!part2.length) continue;
      const { error } = await db.from("check_car")
        .upsert(part2, { onConflict: "office_id,no,check_date", ignoreDuplicates: true });
      if (error) throw new Error("차량 올리기 : " + error.message);
      n += part2.length;
    }
    await linkCars(ctx);
  }
  await log(ctx, "자료 옮기기", { part, n });
  return { n };
}

/** 이름으로 올라온 차량에 딜러·상사를 이어 붙입니다 */
async function linkCars(ctx: Ctx) {
  /* 표 안에서 한 번에 이어붙입니다 (14,000대도 몇 초).
     8번 SQL 을 아직 안 돌리셨으면 예전 방식으로 돌아갑니다. */
  try {
    const { data, error } = await db.rpc("check_link_cars", { p_office: ctx.office.id });
    if (error) throw new Error(error.message);
    const r: any = Array.isArray(data) ? data[0] : data;
    return N(r?.dealer_linked);
  } catch (e) {
    if (!/check_link_cars|function|does not exist/i.test(S((e as Error).message))) throw e;
    return await linkCarsSlow(ctx);
  }
}

/** 예전 방식 — 8번 SQL 을 아직 안 돌리셨을 때만 씁니다 */
async function linkCarsSlow(ctx: Ctx) {
  const { data: ds } = await db.from("check_dealer").select("id,name,company_id").eq("office_id", ctx.office.id);
  const { data: cs } = await db.from("check_company").select("id,name,name_norm").eq("office_id", ctx.office.id);
  const dByName = new Map((ds ?? []).map((d) => [S(d.name).trim(), d]));
  const cByNorm = new Map((cs ?? []).map((c) => [S(c.name_norm), c]));
  let done = 0, from = 0;
  for (let round = 0; round < 60; round++) {
    const { data: cars } = await db.from("check_car").select("id,dealer_text,comp_text")
      .eq("office_id", ctx.office.id).is("dealer_id", null)
      .order("id").range(from, from + 999);
    if (!cars?.length) break;
    for (const c of cars) {
      const d = dByName.get(S(c.dealer_text).trim());
      const co = cByNorm.get(norm(c.comp_text));
      if (d || co) {
        await db.from("check_car").update({
          dealer_id: d?.id ?? null, company_id: co?.id ?? d?.company_id ?? null }).eq("id", c.id);
        done++;
      }
    }
    from += 1000;              /* 못 찾은 줄에 걸려 멈추지 않게 계속 넘어갑니다 */
    if (cars.length < 1000) break;
  }
  return done;
}

/** 지금 들어 있는 자료가 몇 줄인지 */
async function dataCount(ctx: Ctx) {
  const one = async (t: string) => {
    const { count } = await db.from(t).select("id", { count: "exact", head: true })
      .eq("office_id", ctx.office.id);
    return count ?? 0;
  };
  return {
    상사: await one("check_company"), 딜러: await one("check_dealer"),
    차량: await one("check_car"), 단가표: await one("check_price_band"),
    청구서: await one("check_invoice"),
  };
}


/* ============================================================
   5-2. 엑셀 올리기 · 보험료 미납 대조
   화면(브라우저)이 엑셀을 읽어 줄 목록으로 바꿔 보내 주면,
   서버는 그것만 표에 넣습니다.
   ============================================================ */
/** 그 달의 다음 달 1일 — 9월처럼 30일까지인 달을 «-31» 로 찾다가
    «없는 날짜» 오류가 나서 그 달이 통째로 빠지던 것을 막습니다. */
function ymNext(ym: string) {
  const y = Number(S(ym).slice(0, 4)), m = Number(S(ym).slice(5, 7));
  if (!y || !m) return "9999-12-31";
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return ny + "-" + String(nm).padStart(2, "0") + "-01";
}
function ymPick(v: unknown) {
  const d = S(v).slice(0, 10);
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : "";
}

/** 엑셀 줄 올리기 — kind : 접수리스트 · 전산외 · 정비비 · 청구보험료 */
async function excelPut(ctx: Ctx, kind: string, rows: any[], ym?: string, meta?: any) {
  const k = S(kind);
  const file = S(meta?.file);
  const last = meta?.last !== false;        /* 마지막 묶음일 때만 기록을 남깁니다 */
  const total = N(meta?.total);
  if (!Array.isArray(rows) || !rows.length) {
    if (last && file) {
      await db.from("check_upload").insert({ office_id: ctx.office.id, kind: k,
        file_name: file, rows_n: total, ym: S(ym), who: ctx.who });
    }
    return { n: 0, kind: k };
  }
  let n = 0;

  if (k === "접수리스트" || k === "전산외") {
    const src = k === "전산외" ? "전산외" : "전산";
    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const part = rows.slice(i, i + chunk).map((r: any) => ({
        office_id: ctx.office.id,
        no: S(r.성능번호) || ("@" + S(r.차량번호) + "/" + S(r.검사일).slice(0, 10)),
        vin: S(r.차대번호), plate: S(r.차량번호), car_name: S(r.차명),
        check_date: S(r.검사일).slice(0, 10), comp_text: S(r.회사명), dealer_text: S(r.신청인),
        goods: S(r.상품명), amount: N(r.금액), ins_fee: N(r.성능보험료),
        ins_pay: (["Y", "N", "P"].includes(S(r.보험료납부).toUpperCase()) ? S(r.보험료납부).toUpperCase() : "N"),
        src,
        /* v46: 전산외 «계산서발행(Y/N)» · «사유» — 비어 있으면 Y */
        ...(src === "전산외" ? { tax_yn: /^(N|아니|미발행)/i.test(S(r.계산서발행 ?? r["계산서발행(Y/N)"] ?? r.계산서발행여부)) ? "N" : "Y",
          tax_note: S(r.사유 ?? r.미발행사유).replace(/[\u0000-\u001f<>]/g, " ").slice(0, 100) } : {}),
      })).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.check_date));
      if (!part.length) continue;
      let { error } = await db.from("check_car")
        .upsert(part, { onConflict: "office_id,no,check_date" });
      if (error && /tax_yn|tax_note/.test(S(error.message))) {      // v46: SQL 20 전이면 그 두 칸만 빼고 다시
        const bare = part.map(({ tax_yn: _a, tax_note: _b, ...x }: any) => x);
        ({ error } = await db.from("check_car").upsert(bare, { onConflict: "office_id,no,check_date" }));
      }
      if (error) throw new Error("차량 올리기 : " + error.message);
      n += part.length;
    }
    if (last) await linkCars(ctx);      /* 다 올라간 뒤 한 번만 이어붙입니다 */

  } else if (k === "정비비") {
    const { data: ds } = await db.from("check_dealer").select("id,name,company_id").eq("office_id", ctx.office.id);
    const dByName = new Map((ds ?? []).map((d: any) => [S(d.name), d]));
    const put = rows.map((r: any) => {
      const date = S(r.작업일 || r.검사일).slice(0, 10);
      const d = dByName.get(S(r.신청인 || r.딜러));
      return {
        office_id: ctx.office.id,
        work_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
        bill_month: S(ym) || ymPick(date),
        plate: S(r.차량번호), car_name: S(r.차명),
        dealer_id: d?.id ?? null, company_id: d?.company_id ?? null,
        dealer_text: S(r.신청인 || r.딜러),
        reason: S(r.작업내용 || r.내용 || r.항목) || "정비비",
        amount: N(r.금액), exempt: S(r.면제).toUpperCase() === "Y", src: "엑셀",
      };
    }).filter((x) => x.amount > 0 && x.bill_month);
    if (put.length) {
      /* 같은 달 엑셀을 다시 올리면 그 달 것을 갈아 끼웁니다 (첫 묶음에서만) */
      if (meta?.first !== false) {
        const months = [...new Set(put.map((x) => x.bill_month))];
        await db.from("check_repair").delete().eq("office_id", ctx.office.id)
          .in("bill_month", months).eq("src", "엑셀");
      }
      const { error } = await db.from("check_repair").insert(put);
      if (error) throw new Error("정비비 올리기 : " + error.message);
      n = put.length;
    }

  } else if (k === "청구보험료") {
    const month = S(ym) || ymPick(rows[0]?.검사일);
    const put = rows.map((r: any) => ({
      office_id: ctx.office.id, ym: month,
      no: S(r.성능번호), vin: S(r.차대번호), plate: S(r.차량번호),
      car_name: S(r.차명), dealer_text: S(r.신청인), comp_text: S(r.회사명),
      check_date: /^\d{4}-\d{2}-\d{2}$/.test(S(r.검사일).slice(0, 10)) ? S(r.검사일).slice(0, 10) : null,
      amount: N(r.성능보험료 || r.보험료 || r.금액), matched: false, state: null as string | null,
    })).filter((x) => x.no || x.vin || x.plate);
    if (put.length) {
      if (meta?.first !== false) {
        await db.from("check_ins").delete().eq("office_id", ctx.office.id).eq("ym", month);
      }
      const { error } = await db.from("check_ins").upsert(put, { onConflict: "office_id,ym,no,vin" });
      if (error) throw new Error("청구보험료 올리기 : " + error.message);
      n = put.length;
      if (last) { try { await insMatch(ctx, month); } catch { /* 대조는 다시 눌러도 됩니다 */ } }
    }
  } else {
    throw new Error("무슨 엑셀인지 모르겠습니다 : " + k);
  }

  if (last && file) {
    await db.from("check_upload").insert({ office_id: ctx.office.id, kind: k,
      file_name: file, rows_n: total || n, ym: S(ym), who: ctx.who });
  }
  await log(ctx, "엑셀 올리기", { kind: k, n });
  return { n, kind: k };
}

/** 올린 엑셀 기록 */
async function uploadList(ctx: Ctx) {
  const { data } = await db.from("check_upload").select("*")
    .eq("office_id", ctx.office.id).order("created_at", { ascending: false }).limit(200);
  return (data ?? []).map((u: any) => ({
    kind: S(u.kind), name: S(u.file_name), n: N(u.rows_n), ym: S(u.ym), who: S(u.who),
    at: fmtTs(new Date(new Date(u.created_at).getTime() + KST)),
  }));
}

/** 보험료 미납 대조 — 올려 둔 청구보험료를 접수리스트에서 찾습니다 */
async function insMatch(ctx: Ctx, ym: string) {
  const month = S(ym);
  const list: any[] = [];
  for (let i = 0; i < 20; i++) {
    const { data: p } = await db.from("check_ins").select("*")
      .eq("office_id", ctx.office.id).eq("ym", month).order("id").range(i * 1000, i * 1000 + 999);
    if (!p?.length) break;
    list.push(...p);
    if (p.length < 1000) break;
  }
  if (!list?.length) return { n: 0, rows: [] };

  /* 보험사 청구서에는 여러 달에 점검한 차가 섞여 옵니다.
     그래서 그 달 차만 보지 않고 «올라온 차 전부» 에서 찾습니다. */
  const want = new Set<string>(), wantVin = new Set<string>(), wantPlate = new Set<string>();
  for (const r of list) {
    if (S(r.no)) want.add(S(r.no));
    if (S(r.vin)) wantVin.add(S(r.vin).toUpperCase());
    if (S(r.plate)) wantPlate.add(plateNorm(r.plate));
  }
  const cars: any[] = [];
  const pull = async (col: string, vals: string[]) => {
    for (let i = 0; i < vals.length; i += 300) {
      const { data: p } = await db.from("check_car")
        .select("id,no,vin,plate,car_name,dealer_text,comp_text,ins_fee,ins_pay")
        .eq("office_id", ctx.office.id).in(col, vals.slice(i, i + 300));
      if (p?.length) cars.push(...p);
    }
  };
  if (wantVin.size) await pull("vin", [...wantVin]);
  if (want.size) await pull("no", [...want]);
  if (wantPlate.size) await pull("plate", [...wantPlate]);
  const byNo = new Map<string, any>(), byVin = new Map<string, any>(), byPlate = new Map<string, any>();
  for (const c of cars ?? []) {
    if (S(c.no)) byNo.set(S(c.no), c);
    if (S(c.vin)) byVin.set(S(c.vin).toUpperCase(), c);
    if (S(c.plate)) byPlate.set(plateNorm(c.plate), c);
  }
  /* ── 룰 ──────────────────────────────────────────────
     우리가 실제로 받은 것은 카모두 «보험료납부 = Y» 뿐입니다.
     보험사가 청구했는데 우리 기록이 N(못 받음) · P(면제) 라면
     그 건은 보험사에 «청구 취소» 를 넣어야 합니다.
     금액 차이(우리가 받은 돈 − 보험사 청구액)는 우리 몫이라 틀린 게 아닙니다.
     ─────────────────────────────────────────────────── */
  const out: any[] = [];
  for (const r of list) {
    let hit: any = null, how = "못 찾음";
    /* 찾는 순서 — 차대번호 ▸ 성능번호 ▸ 차량번호
       차량번호는 중간에 바뀔 수 있습니다(우리에겐 구 번호, 보험사 청구서엔 신 번호).
       차대번호는 차가 사라질 때까지 안 바뀌므로 이것을 가장 먼저 봅니다.
       차량번호로만 찾은 건은 «확인 권함»으로 표시해 사람이 한 번 보게 합니다. */
    if (S(r.vin) && byVin.get(S(r.vin).toUpperCase())) { hit = byVin.get(S(r.vin).toUpperCase()); how = "차대번호"; }
    else if (S(r.no) && byNo.get(S(r.no))) { hit = byNo.get(S(r.no)); how = "성능번호"; }
    else if (S(r.plate) && byPlate.get(plateNorm(r.plate))) { hit = byPlate.get(plateNorm(r.plate)); how = "차량번호"; }

    const pay = S(hit?.ins_pay).toUpperCase();
    const state = !hit ? "못 찾음"
      : pay === "Y" ? "맞음"
      : pay === "P" ? "취소 요청 (면제 P)"
      : "취소 요청 (못 받음 N)";

    await db.from("check_ins").update({
      matched: !!hit, car_id: hit?.id ?? null, state, how, pay: pay || null,
      ours: N(hit?.ins_fee),
    }).eq("id", r.id);

    out.push({
      plate: S(hit?.plate || r.plate), no: S(r.no || hit?.no), vin: S(r.vin),
      car: S(hit?.car_name || r.car_name),
      dealer: S(hit?.dealer_text || r.dealer_text),
      comp: S(hit?.comp_text || r.comp_text),
      date: S(r.check_date).slice(0, 10),
      ins: N(r.amount), ours: N(hit?.ins_fee), pay, how, state,
    });
  }
  const box = (st: string) => {
    const g = out.filter((x) => x.state === st);
    let ins = 0, ours = 0;
    for (const x of g) { ins += x.ins; ours += x.ours; }
    return { n: g.length, ins, ours };
  };
  const ok = box("맞음"), cn = box("취소 요청 (못 받음 N)"),
        cp = box("취소 요청 (면제 P)"), nf = box("못 찾음");
  let insAll = 0; for (const x of out) insAll += x.ins;
  const how = { 차대번호: 0, 성능번호: 0, 차량번호: 0, "못 찾음": 0 } as Record<string, number>;
  for (const x of out) how[x.how] = (how[x.how] ?? 0) + 1;
  await log(ctx, "보험료 대조", { ym: month, n: out.length, 취소: cn.n + cp.n });
  return { n: out.length, ym: month, rows: out, insAll,
    ok, cancelN: cn, cancelP: cp, notFound: nf, how,
    margin: ok.ours - ok.ins };
}

/** 이미 대조해 둔 결과 보기 */
async function insList(ctx: Ctx, ym: string) {
  const data: any[] = [];
  for (let i = 0; i < 20; i++) {
    const { data: p } = await db.from("check_ins")
      .select("*, car:car_id(plate,car_name,dealer_text,comp_text,ins_fee)")
      .eq("office_id", ctx.office.id).eq("ym", S(ym)).order("id").range(i * 1000, i * 1000 + 999);
    if (!p?.length) break;
    data.push(...p);
    if (p.length < 1000) break;
  }
  return (data ?? []).map((r: any) => ({
    plate: S(r.car?.plate || r.plate), no: S(r.no), vin: S(r.vin),
    car: S(r.car?.car_name || r.car_name),
    dealer: S(r.car?.dealer_text || r.dealer_text),
    comp: S(r.car?.comp_text || r.comp_text),
    date: S(r.check_date).slice(0, 10),
    ins: N(r.amount), ours: N(r.ours) || N(r.car?.ins_fee),
    pay: S(r.pay), how: S(r.how) || "",
    state: S(r.state) || "아직 대조 안 함",
  }));
}

/** 딜러를 못 찾은 차가 몇 대인지 (청구서가 비는 가장 큰 까닭) */
async function carHealth(ctx: Ctx, ym: string) {
  const from = S(ym) + "-01", to = ymNext(S(ym));
  const one = async (q: any) => (await q).count ?? 0;
  const base = () => db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to);
  const all = await one(base());
  const noDealer = await one(base().is("dealer_id", null));
  let top: { name: string; n: number }[] = [];
  try {
    const { data: miss } = await db.rpc("check_missing_dealers", { p_office: ctx.office.id, p_ym: S(ym) });
    top = (miss ?? []).slice(0, 15).map((r: any) => ({ name: S(r.name) || "(비어 있음)", n: N(r.n) }));
  } catch { /* 10번 SQL 전이면 비워 둡니다 */ }
  /* 전체 기간도 같이 */
  const allCnt = await (async () => {
    const q = db.from("check_car").select("id", { count: "exact", head: true }).eq("office_id", ctx.office.id);
    return { total: (await q).count ?? 0,
      noDealer: (await db.from("check_car").select("id", { count: "exact", head: true })
        .eq("office_id", ctx.office.id).is("dealer_id", null)).count ?? 0 };
  })();
  return { ym: S(ym), all, noDealer, ok: all - noDealer, top,
    allTotal: allCnt.total, allNoDealer: allCnt.noDealer };
}

/** 딜러 이어붙이기를 다시 돌립니다 */
async function relink(ctx: Ctx) {
  const n = await linkCars(ctx);
  return { n };
}

/** 접수리스트에는 있는데 거래처에 없는 «신청인» 을 딜러로 한꺼번에 넣습니다 */
async function dealerAddMissing(ctx: Ctx, ym?: string) {
  if (ctx.role !== "owner") throw new Error("대표님만 넣을 수 있습니다.");
  const { data: miss, error } = await db.rpc("check_missing_dealers",
    { p_office: ctx.office.id, p_ym: S(ym) || null });
  if (error) throw new Error("이름 모으기 : " + error.message);
  if (!miss?.length) return { n: 0, made: [], linked: 0 };

  const { data: have } = await db.from("check_dealer").select("name").eq("office_id", ctx.office.id);
  const haveSet = new Set((have ?? []).map((d: any) => S(d.name).trim()));
  const { data: comps } = await db.from("check_company").select("id,name,name_norm").eq("office_id", ctx.office.id);
  const cByNorm = new Map((comps ?? []).map((c: any) => [S(c.name_norm), c]));

  const made: string[] = [];
  const put: any[] = [];
  for (const r of miss) {
    const nm = S(r.name).trim();
    if (!nm || haveSet.has(nm)) continue;
    const top = S(r.comp).trim();
    let compId: string | null = cByNorm.get(norm(top))?.id ?? null;
    if (!compId && top) {
      const { data: nc } = await db.from("check_company")
        .upsert({ office_id: ctx.office.id, name: top }, { onConflict: "office_id,name" })
        .select("id,name_norm").single();
      if (nc) { compId = nc.id; cByNorm.set(S(nc.name_norm), nc); }
    }
    put.push({ office_id: ctx.office.id, name: nm, company_id: compId,
               issuer_kind: compId ? "company" : "none", tax_issue: true, active: true });
    made.push(nm);
  }
  for (let i = 0; i < put.length; i += 500) {
    const { error: e2 } = await db.from("check_dealer")
      .upsert(put.slice(i, i + 500), { onConflict: "office_id,name,company_id", ignoreDuplicates: true });
    if (e2) throw new Error("딜러 넣기 : " + e2.message);
  }
  const linked = await linkCars(ctx);
  await log(ctx, "없는 딜러 넣기", { n: made.length, linked });
  return { n: made.length, made: made.slice(0, 50), linked };
}


/* ============================================================
   5-3. 매출 — 달마다 몇 대 · 얼마
   ============================================================
   엑셀(접수리스트)이 곧 자료입니다. 청구서를 만들지 않아도
   차량 표에서 바로 세기 때문에 올리는 즉시 반영됩니다.
   금액은 청구서와 똑같이 «단가표» 를 써서 셉니다.
   ============================================================ */
async function salesStat(ctx: Ctx, _opt?: any) {
  const { data: bands } = await db.from("check_price_band").select("*").eq("office_id", ctx.office.id);
  const vat = 1 + (Number(ctx.office.vat_rate ?? 10) / 100);

  /* 표 안에서 달×상품명으로 묶어 받아 옵니다 — 몇 줄 안 되니 잘릴 일이 없습니다 */
  const { data: raw, error: e1 } = await db.rpc("check_sales_raw", { p_office: ctx.office.id });
  if (e1) throw new Error("매출 세기 : " + e1.message);
  /* v44: 차마다 손으로 넣은 검사비(수출 가성능) — 달×상품명으로 합계·대수 (SQL 18 전이면 칸이 없어 건너뜀) */
  const man = new Map<string, { n: number; sum: number }>();
  {
    const { data: mc, error: e2 } = await db.from("check_car").select("check_date,goods,fee_manual,src")
      .eq("office_id", ctx.office.id).not("fee_manual", "is", null);
    if (!e2) for (const c of mc ?? []) {
      if (c.fee_manual === null || c.fee_manual === undefined || /^선납/.test(S(c.goods)) || S(c.src) === "전산외") continue;
      const k = S(c.check_date).slice(0, 7) + "|" + S(c.goods);
      const x = man.get(k) ?? { n: 0, sum: 0 };
      x.n++; x.sum += Math.round(Math.max(0, Math.round(N(c.fee_manual))) * vat); man.set(k, x);
    }
  }
  const unk = new Map<string, number>();
  let feeNeed = 0;
  const unkBy = new Map<string, Map<string, number>>(), needBy = new Map<string, number>();   // 달마다
  /* v46: 전산외는 엑셀 금액(부가세 포함) 그대로 따로 — 검사비(fee) 셈에서는 그 대수만큼 뺌 */
  const extBy = new Map<string, number>(), extN = new Map<string, number>();
  {
    const { data: ec } = await db.from("check_car").select("check_date,goods,amount").eq("office_id", ctx.office.id).eq("src", "전산외");
    for (const c of ec ?? []) {
      const ym = S(c.check_date).slice(0, 7);
      extBy.set(ym, (extBy.get(ym) ?? 0) + Math.max(0, N(c.amount)));
      const k = ym + "|" + S(c.goods); extN.set(k, (extN.get(k) ?? 0) + 1);
    }
  }

  type M = { ym: string; n: number; dom: number; imp: number; etc: number;
             fee: number; ext: number; ins: number; rep: number; repN: number; insN: number; free: number };
  const M = new Map<string, M>();
  const get = (ym: string) => {
    let m = M.get(ym);
    if (!m) { m = { ym, n: 0, dom: 0, imp: 0, etc: 0, fee: 0, ext: 0, ins: 0, rep: 0, repN: 0, insN: 0, free: 0 }; M.set(ym, m); }
    return m;
  };

  for (const r of raw ?? []) {
    const ym = S(r.ym);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const m = get(ym);
    const n = N(r.n), goods = S(r.goods);
    m.n += n;
    const pre = /^선납/.test(goods);
    /* 그 달 첫날 기준 단가 (단가는 달 단위로 바뀝니다) */
    const pr = priceOf(bands ?? [], ym + "-01", goods);
    let feeSum = 0;
    if (!pre) {
      /* v44: 손 입력 차는 그 금액, 나머지는 단가표(없으면 0 · 대신 셈 없음) — 청구서와 같은 unitOf */
      const mm = man.get(ym + "|" + goods) ?? { n: 0, sum: 0 };
      const nIn = Math.max(0, n - (extN.get(ym + "|" + goods) ?? 0));   // v46: 전산외 차는 뺌
      const k = Math.min(nIn, mm.n), rest = nIn - k;
      feeSum = mm.sum;
      const u = unitOf(pr, goods, null);
      feeSum += Math.round(u.unit * vat) * rest;
      if (rest && u.unknown) {
        const gk = goods || "(빈 칸)", um = unkBy.get(ym) ?? new Map<string, number>();
        unk.set(gk, (unk.get(gk) ?? 0) + rest); um.set(gk, (um.get(gk) ?? 0) + rest); unkBy.set(ym, um);
      }
      if (rest && u.need) { feeNeed += rest; needBy.set(ym, (needBy.get(ym) ?? 0) + rest); }
    }
    m.fee += feeSum;
    const nm = S(pr?.name || goods);
    if (nm.includes("국산")) m.dom += n; else if (nm.includes("수입")) m.imp += n; else m.etc += n;
    m.ins += N(r.ins); m.insN += N(r.ins_n); m.free += N(r.free_n);
  }

  for (const [ym, amt] of extBy) if (/^\d{4}-\d{2}$/.test(ym)) get(ym).ext += amt;   // v46

  /* 정비비 */
  const { data: reps } = await db.rpc("check_repair_raw", { p_office: ctx.office.id });
  for (const r of reps ?? []) {
    const ym = S(r.ym).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const m = get(ym); m.rep += N(r.amount); m.repN += N(r.n);
  }

  /* 청구·수금 */
  const { data: invs } = await db.rpc("check_invoice_raw", { p_office: ctx.office.id });
  const paid = new Map<string, { bill: number; got: number }>();
  for (const v of invs ?? []) paid.set(S(v.ym), { bill: N(v.bill), got: N(v.got) });
  /* v46: 달마다 청구서 수 · 발급한 세금계산서 수 */
  const made = new Map<string, number>(), taxN = new Map<string, number>();
  {
    const { data: iv } = await db.from("check_invoice").select("ym,tax_key,tax_state").eq("office_id", ctx.office.id);
    for (const v of iv ?? []) {
      const ym = S(v.ym); made.set(ym, (made.get(ym) ?? 0) + 1);
      if (S(v.tax_key) && /발급|전송/.test(S(v.tax_state))) taxN.set(ym, (taxN.get(ym) ?? 0) + 1);
    }
  }
  const insInc = S(ctx.office.ins_vat) === "포함";                // v46: 보험료에 부가세가 들었는지

  const rows = [...M.values()].sort((a, b) => a.ym < b.ym ? 1 : -1);   /* 최근 달이 위로 */
  const out = rows.map((m, i) => {
    const total = m.fee + m.ext + m.rep;                          // v46: 전산외 따로 더함
    const prev = rows[i + 1];
    const prevTot = prev ? prev.fee + prev.ext + prev.rep : 0;
    const yoy = rows.find((x) => x.ym === String(Number(m.ym.slice(0, 4)) - 1) + m.ym.slice(4));
    const yoyTot = yoy ? yoy.fee + yoy.ext + yoy.rep : 0;
    const p = paid.get(m.ym);
    return {
      ym: m.ym, n: m.n, dom: m.dom, imp: m.imp, etc: m.etc,
      fee: m.fee, ext: m.ext, rep: m.rep, repN: m.repN, ins: m.ins, insN: m.insN, free: m.free,
      insTotal: insInc ? m.ins : Math.round(m.ins * vat), insVat: insInc ? "포함" : "미포함",   // v46
      made: made.get(m.ym) ?? 0, taxN: taxN.get(m.ym) ?? 0,                               // v46
      total,
      avg: m.n ? Math.round(total / m.n) : 0,
      mom: prevTot ? Math.round((total - prevTot) / prevTot * 1000) / 10 : null,
      momN: prev && prev.n ? Math.round((m.n - prev.n) / prev.n * 1000) / 10 : null,
      yoy: yoyTot ? Math.round((total - yoyTot) / yoyTot * 1000) / 10 : null,
      bill: p?.bill ?? 0, got: p?.got ?? 0,
      unknown: unknownList(unkBy.get(m.ym) ?? new Map()), feeNeed: needBy.get(m.ym) ?? 0,   // v44
    };
  });

  const yearSum: Record<string, { n: number; fee: number; ext: number; rep: number; ins: number; total: number }> = {};
  for (const r of out) {
    const y = r.ym.slice(0, 4);
    const s2 = yearSum[y] ?? { n: 0, fee: 0, ext: 0, rep: 0, ins: 0, total: 0 };
    s2.n += r.n; s2.fee += r.fee; s2.ext += r.ext; s2.rep += r.rep; s2.ins += r.ins; s2.total += r.total;
    yearSum[y] = s2;
  }
  return { rows: out, years: yearSum, unknown: unknownList(unk), feeNeed };
}

/* ───────── 검사소 정보 (설정 화면) ───────── */
const OFFICE_FIELDS = ["name","biz_no","owner_name","tel","bank_fee","bank_repair",
                       "vat_rate","ins_valid_days","popbill_corp","popbill_userid","popbill_test",
                       "sms_from","biz_type","biz_class","addr","tax_email","tax_contact","popbill_corp_name"];
const INS_VAT = ["미포함", "포함"];   // v46: 보험료 금액에 부가세가 들었는지 (기본 미포함 · SQL 20)

/** 이 검사소의 설정을 보여줍니다 (열쇠값은 서버에만 있어 안 보냅니다) */
async function officeGet(ctx: Ctx) {
  const o: any = {};
  for (const k of OFFICE_FIELDS) o[k] = ctx.office[k] ?? "";
  o.code = ctx.office.code;
  o.popbill_test = ctx.office.popbill_test === true;
  o.popbill_ready = !!(POPBILL.linkId && POPBILL.secret);
  o.solapi_ready = !!(SOLAPI.key && SOLAPI.secret);
  o.ins_vat = INS_VAT.includes(S(ctx.office.ins_vat)) ? S(ctx.office.ins_vat) : "미포함";   // v46
  return o;
}

/* v32(보안 H1): 사업자번호·팝빌 번호·팝빌 아이디는 설정 저장으로 바꾸지 못합니다.
   · 사업자번호: 비어 있을 때 처음 한 번만 (다른 검사소·워시 업체·차곳간 본사가 쓰는 번호는 안 됨)
   · 팝빌 아이디: 비어 있을 때 처음 한 번만
   · 팝빌 번호(popbill_corp): 팝빌 가입(popJoin) 때 서버가 이 검사소 사업자번호로만 적음
   바꾸려면 차곳간 본사가 고칩니다. */
const OFFICE_LOCKED = ["biz_no", "popbill_corp", "popbill_userid"];
const BIZ_WAIT_MSG = "사업자번호를 차곳간에서 확인하는 중입니다. 확인이 끝나면 쓸 수 있습니다. 급하시면 차곳간(010-9559-3663)으로 알려 주세요.";
const BIZ_TAKEN_MSG = "이 사업자번호는 다른 곳에서 쓰고 있어 쓸 수 없습니다. 우리 사업자번호가 맞다면 차곳간(010-9559-3663)으로 알려 주세요.";
const onlyDigits = (v: unknown) => S(v).replace(/[^0-9]/g, "");
/** 이 번호를 다른 곳이 쓰고 있으면 true (확인을 못 하면 막는 쪽으로) */
async function bizTaken(corp: string, selfOfficeId: string) {
  const n = onlyDigits(corp);
  if (!n) return false;
  try {
    const { data: co, error: e1 } = await db.from("check_office").select("id,biz_no,popbill_corp");
    if (e1) return true;
    if ((co ?? []).some((r: any) => S(r.id) !== S(selfOfficeId) && (onlyDigits(r.biz_no) === n || onlyDigits(r.popbill_corp) === n))) return true;
    const { data: hq, error: e2 } = await db.from("wash_hq").select("biz_no").eq("id", 1).maybeSingle();
    if (e2) return true;                                     // 읽기 오류면 막는 쪽
    if (onlyDigits(hq?.biz_no) === n) return true;
    const { data: ws, error: e3 } = await db.from("wash_shops").select("biz_no").ilike("biz_no", "%" + n.slice(-5) + "%").limit(200);
    if (e3) return true;
    if ((ws ?? []).some((r: any) => onlyDigits(r.biz_no) === n)) return true;
  } catch (_) { return true; }
  return false;
}

/** 검사소 설정 고치기 — 대표만 */
async function officeSave(ctx: Ctx, body: any) {
  if (ctx.role !== "owner") throw new Error("대표님만 고칠 수 있습니다.");
  const up: any = {};
  for (const k of OFFICE_FIELDS) if (body?.[k] !== undefined && !OFFICE_LOCKED.includes(k)) up[k] = body[k];
  const cur = ctx.office ?? {};
  let newBiz = false;
  if (body?.biz_no !== undefined) {
    const nb = onlyDigits(body.biz_no), ob = onlyDigits(cur.biz_no);
    if (nb && nb !== ob) {
      if (ob) throw new Error("사업자번호는 한 번 넣으면 바꿀 수 없습니다. 바꾸시려면 차곳간(010-9559-3663)으로 알려 주세요.");
      if (nb.length !== 10) throw new Error("사업자번호 10자리를 넣어 주세요.");
      if (await bizTaken(nb, S(cur.id))) throw new Error(BIZ_TAKEN_MSG);
      up.biz_no = S(body.biz_no);
      newBiz = true;
    }
  }
  if (body?.popbill_userid !== undefined && S(body.popbill_userid) && !S(cur.popbill_userid))
    up.popbill_userid = S(body.popbill_userid);
  if (body?.ins_vat !== undefined) {                             // v46
    if (!INS_VAT.includes(S(body.ins_vat))) throw new Error("보험료 부가세는 «미포함» 또는 «포함»으로 골라 주세요.");
    up.ins_vat = S(body.ins_vat);
  }
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_office").update(up).eq("id", ctx.office.id);
  if (error) throw new Error(/ins_vat/.test(S(error.message)) ? "서버를 준비하는 중입니다(SQL 20). 차곳간(010-9559-3663)으로 알려 주세요." : error.message);
  /* v32: 처음 넣은 사업자번호는 본사 확인 전까지 «확인 중» (SQL 11 전이면 칸이 없어 넘어감) */
  if (newBiz) { try { await db.from("check_office").update({ biz_ok_at: null }).eq("id", ctx.office.id); await db.from("check_office").update({ biz_set_at: new Date().toISOString() }).eq("id", ctx.office.id); } catch (_) { /* */ } }
  await log(ctx, "검사소 설정 고침", Object.keys(up));
  return { ok: true };
}


/* ============================================================
   3-3. 팝빌 — 전자세금계산서 (정발행)
   ============================================================
   청구서 한 장 = 세금계산서 한 장 입니다.
   · 공급자  : 이 검사소 (가온진단평가)
   · 공급받는자 : 청구서의 발행처(딜러 사업자 또는 매매상사)
   · 문서번호(invoicerMgtKey) 는 «CK-달-청구서앞자리» 로 만들어 다시 못 쓰게 합니다.
   ============================================================ */
function taxKeyOf(inv: any) {
  return ("CK" + S(inv.ym).replace("-", "") + "-" + S(inv.id).replace(/-/g, "").slice(0, 10)).toUpperCase();
}
function onlyNum(v: unknown) { return S(v).replace(/[^0-9]/g, ""); }

/** v36: 홈택스용 상사 정보 (SQL 13 전이면 예전 칸만) */
async function taxComps(officeId: string) {
  const a = await db.from("check_company").select("name,biz_no,ceo,addr,email,upte,jongmok").eq("office_id", officeId);
  if (!a.error) return a.data ?? [];
  const b = await db.from("check_company").select("name,biz_no,ceo,addr").eq("office_id", officeId);
  return b.data ?? [];
}
/** v36: 계산서 «나중에 정할게요» 딜러 — 홈택스 발급 대상에서 «정보 없음» */
async function laterDealers(officeId: string) {
  const { data } = await db.from("check_dealer").select("id").eq("office_id", officeId).eq("issuer_kind", "later");
  return new Set((data ?? []).map((d: any) => S(d.id)));
}
/** v46: 청구서마다 «계산서발행 N» 전산외 금액(부가세 포함) — 세금계산서 금액에서 뺍니다 (SQL 20 전이면 0) */
async function noTaxOf(officeId: string, invIds: string[]) {
  const out = new Map<string, number>();
  if (!invIds.length) return out;
  const { data: rows } = await db.from("check_invoice_row").select("invoice_id,car_id,amount,kind").in("invoice_id", invIds).eq("kind", "ext");
  const carIds = [...new Set((rows ?? []).map((r: any) => S(r.car_id)).filter(Boolean))];
  if (!carIds.length) return out;
  const { data: cars, error } = await db.from("check_car").select("id,tax_yn").eq("office_id", officeId).in("id", carIds);
  if (error) return out;
  const no = new Set((cars ?? []).filter((c: any) => S(c.tax_yn).toUpperCase() === "N").map((c: any) => S(c.id)));
  for (const r of rows ?? []) if (no.has(S(r.car_id))) out.set(S(r.invoice_id), (out.get(S(r.invoice_id)) ?? 0) + N(r.amount));
  return out;
}
/** v46: 남은 금액(청구 − 입금) */
const leftOf = (v: any) => Math.max(0, N(v.total_amount) - N(v.paid_amount));
/** 발급 대상 목록 — 그 달 청구서에서 사업자번호가 있는 것만 */
async function taxList(ctx: Ctx, ym: string) {
  const { data: invs } = await db.from("check_invoice").select("*")
    .eq("office_id", ctx.office.id).eq("ym", S(ym)).order("total_amount", { ascending: false });
  const comps = await taxComps(ctx.office.id);
  const later = await laterDealers(ctx.office.id);
  const byName = new Map((comps ?? []).map((c: any) => [S(c.name), c]));
  const vat = 1 + (Number(ctx.office.vat_rate ?? 10) / 100);
  const noTax = await noTaxOf(ctx.office.id, (invs ?? []).map((v: any) => S(v.id)));
  return (invs ?? []).map((v: any) => {
    const comp = byName.get(S(v.company_name));
    const biz = onlyNum(v.issuer_biz);
    const notax = noTax.get(S(v.id)) ?? 0;                        // v46: 계산서발행 N 전산외
    const total = Math.max(0, N(v.total_amount) - notax);
    const supply = Math.round(total / vat), tax = total - supply;
    const paid = N(v.paid_amount), left = leftOf(v);              // v46: 입금한 곳만
    const issued = !!S(v.tax_key) && /발급|전송/.test(S(v.tax_state));
    const mem = (v.members ?? []).filter((m: string) => S(m) !== S(v.bill_to_name));
    return {
      id: S(v.id), name: S(v.bill_to_name), members: mem.join(" · "),
      writeDate: ymEnd(S(v.ym)),
      comp: S(v.company_name), issuer: S(v.issuer_name) || S(comp?.name),
      biz, ceo: S(comp?.ceo), addr: S(comp?.addr),
      total, supply, tax, notax, paid, left,
      can: !!(biz.length === 10 && v.tax_issue !== false && total > 0 && !later.has(S(v.bill_to_id)) && (left <= 0 || issued)),
      why: later.has(S(v.bill_to_id)) ? "계산서 정보가 아직 없습니다 (나중에 정할게요)"
         : !biz ? "사업자번호가 없습니다" : biz.length !== 10 ? "사업자번호가 10자리가 아닙니다"
         : v.tax_issue === false ? "계산서 안 끊음으로 되어 있습니다"
         : total <= 0 ? "금액이 0원입니다"
         : (left > 0 && !issued) ? "아직 입금 전입니다 (남은 금액 " + left.toLocaleString("ko-KR") + "원)" : "",
      key: S(v.tax_key), state: S(v.tax_state), at: v.tax_at ? fmtTs(new Date(new Date(v.tax_at).getTime() + KST)) : "",
      ntsid: S(v.tax_ntsid), err: S(v.tax_err),
    };
  });
}

/** 세금계산서 발급 (팝빌 즉시발급) */
/** 그 달의 마지막 날 — 작성일자 기본값 */
function ymEnd(ym: string) {
  const y = Number(S(ym).slice(0, 4)), m = Number(S(ym).slice(5, 7));
  if (!y || !m) return "";
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}
/** 청구처마다 작성일자를 따로 받을 수 있습니다 — dates = { 청구서id: "2026-09-30" } */
async function taxIssue(ctx: Ctx, ids: string[], writeDate?: string, dates?: Record<string, string>) {
  if (ctx.role !== "owner") throw new Error("대표님만 발급할 수 있습니다.");
  const o = ctx.office;
  /* 팝빌은 «로그인한 회원 사업자번호» 로만 발급해 줍니다.
     그래서 공급자 사업자번호는 검사소 사업자번호가 아니라 팝빌 회원 사업자번호를 씁니다. */
  const me = popWho(o);
  if (!S(o.biz_no)) throw new Error("우리 사업자번호가 비어 있습니다. 설정 → 거래처에서 넣어 주세요.");
  const list = (ids ?? []).map(S).filter(Boolean);
  if (!list.length) throw new Error("발급할 청구서를 골라 주세요.");

  const { data: invs } = await db.from("check_invoice").select("*")
    .eq("office_id", o.id).in("id", list);
  const comps = await taxComps(o.id);
  const later = await laterDealers(o.id);
  const { data: dls } = await db.from("check_dealer").select("*").eq("office_id", o.id).in("id", [...new Set((invs ?? []).map((v: any) => S(v.bill_to_id)).filter(Boolean))]);
  const dById = new Map((dls ?? []).map((d: any) => [S(d.id), d]));
  const byName = new Map((comps ?? []).map((c: any) => [S(c.name), c]));
  const vat = 1 + (Number(o.vat_rate ?? 10) / 100);
  const noTax = await noTaxOf(o.id, (invs ?? []).map((v: any) => S(v.id)));
  const wdOf = (v: any) => {
    const one = S(dates?.[S(v.id)]) || S(writeDate) || ymEnd(S(v.ym));
    return one.replace(/-/g, "");
  };

  let ok = 0; const bad: string[] = [];
  for (const v of invs ?? []) {
    try {
      if (S(v.tax_key) && /발급|전송/.test(S(v.tax_state)))
        throw new Error("이미 발급된 청구서입니다");
      if (later.has(S(v.bill_to_id))) throw new Error("계산서 정보가 아직 없습니다 (나중에 정할게요)");
      const biz = onlyNum(v.issuer_biz);
      if (biz.length !== 10) throw new Error("공급받는자 사업자번호가 10자리가 아닙니다");
      const notax = noTax.get(S(v.id)) ?? 0;                      // v46: 계산서발행 N 전산외는 뺌
      const total = Math.max(0, N(v.total_amount) - notax);
      if (total <= 0) throw new Error("금액이 0원입니다");
      const left = leftOf(v);
      /* v47(대표님 결정): 입금 전 발급은 아예 없음 — 다 입금된 청구서만, 예외 없음 */
      if (left > 0) throw new Error("아직 입금 전입니다 (남은 금액 " + left.toLocaleString("ko-KR") + "원) — 입금이 끝나면 발급할 수 있어요");
      const supply = Math.round(total / vat), tax = total - supply;
      const comp = byName.get(S(v.company_name));
      const dl: any = dById.get(S(v.bill_to_id));
      const own = S(v.issuer_kind) === "dealer";      // v36: 딜러 본인 사업자면 딜러 칸, 아니면 상사 칸
      const recv = { email: S(own ? dl?.issuer_email : comp?.email), upte: S(own ? dl?.issuer_upte : comp?.upte),
                     jongmok: S(own ? dl?.issuer_jongmok : comp?.jongmok) };
      const key = taxKeyOf(v);

      /* 명세 — 검사비 · 전산외 · 정비비를 한 줄씩 */
      const detail: any[] = []; let n = 1;
      const cars = N(v.dom_n) + N(v.imp_n) + N(v.etc_n);
      const line = (nm: string, amt: number, qty: number) => {
        if (!amt) return;
        const sp = Math.round(amt / vat);
        detail.push({ serialNum: n++, itemName: nm, qty: String(qty || 1),
          unitCost: String(qty ? Math.round(sp / qty) : sp),
          supplyCost: String(sp), tax: String(amt - sp),
          remark: S(v.ym) + " 분" });
      };
      line("자동차 성능점검 수수료", N(v.fee_amount), cars);
      line("성능점검 수수료(전산외)", Math.max(0, N(v.ext_amount) - notax), 0);
      line("정비비", N(v.repair_amount), 0);

      const ti: any = {
        writeDate: wdOf(v), chargeDirection: "정과금", issueType: "정발행",
        purposeType: "청구", taxType: "과세",
        invoicerMgtKey: key,
        invoicerCorpNum: me.corp,
        invoicerCorpName: S(o.popbill_corp_name) || S(o.name),
        invoicerCEOName: S(o.owner_name) || S(o.name),
        invoicerAddr: S(o.addr), invoicerBizType: S(o.biz_type), invoicerBizClass: S(o.biz_class),
        invoicerContactName: S(o.tax_contact) || S(o.owner_name),
        invoicerTEL: S(o.tel), invoicerEmail: S(o.tax_email),
        invoiceeType: "사업자",
        invoiceeCorpNum: biz,
        invoiceeCorpName: S(v.issuer_name) || S(v.company_name) || S(v.bill_to_name),
        invoiceeAddr: own ? S(dl?.issuer_addr) || S(comp?.addr) : S(comp?.addr),
        invoiceeCEOName: own ? S(dl?.issuer_ceo) || S(v.bill_to_name) : S(comp?.ceo) || S(v.bill_to_name),
        invoiceeBizType: recv.upte, invoiceeBizClass: recv.jongmok, invoiceeEmail1: recv.email,
        invoiceeContactName1: S(v.bill_to_name),
        supplyCostTotal: String(supply), taxTotal: String(tax), totalAmount: String(total),
        detailList: detail.length ? detail : [{
          serialNum: 1, itemName: "자동차 성능점검 수수료", qty: "1",
          unitCost: String(supply), supplyCost: String(supply), tax: String(tax),
        }],
      };
      const r = await popCall("/Taxinvoice", "POST", JSON.stringify(ti), o, "ISSUE");
      await db.from("check_invoice").update({
        tax_key: key, tax_state: "발급", tax_at: new Date().toISOString(),
        tax_ntsid: S(r?.ntsConfirmNum), tax_err: "",
      }).eq("id", v.id);
      ok++;
    } catch (e) {
      const msg = (e as Error).message;
      bad.push(S(v.bill_to_name) + " : " + msg);
      await db.from("check_invoice").update({ tax_state: "실패", tax_err: msg }).eq("id", v.id);
    }
  }
  await log(ctx, "세금계산서 발급", { ok, bad });
  return { ok, bad };
}

/** 이 청구처는 계산서를 안 받습니다 (거래처에도 같이 저장합니다) */
async function taxSkip(ctx: Ctx, invoiceId: string, off: boolean) {
  if (ctx.role !== "owner") throw new Error("대표님만 바꿀 수 있습니다.");
  const { data: v } = await db.from("check_invoice").select("id,bill_to_id,bill_to_name")
    .eq("office_id", ctx.office.id).eq("id", S(invoiceId)).maybeSingle();
  if (!v) throw new Error("그 청구서를 찾지 못했습니다.");
  await db.from("check_invoice").update({ tax_issue: !off }).eq("id", v.id);
  if (v.bill_to_id) {
    await db.from("check_dealer").update({ tax_issue: !off })
      .eq("office_id", ctx.office.id).eq("id", v.bill_to_id);
  }
  await log(ctx, off ? "계산서 안 받음" : "계산서 다시 받음", { who: S(v.bill_to_name) });
  return { ok: true };
}

/** 팝빌 화면 주소 — SBOX(매출문서함) · WRITE(직접 쓰기) · TBOX(임시문서함) */
async function taxSite(ctx: Ctx, togo: string) {
  bossOnly(ctx);                                             // v32(보안 M3)
  const t = S(togo).toUpperCase();
  if (!["TBOX", "SBOX", "SWBOX", "PBOX", "PWBOX", "WRITE"].includes(t))
    throw new Error("어느 화면인지 알 수 없습니다. 화면을 새로 고쳐 주세요.");
  const r = await popCall("/Taxinvoice?TG=" + t, "GET", "", ctx.office);
  return { url: S(r?.url) };
}

/** 발급한 계산서들의 국세청 전송 상태를 다시 읽어 옵니다 */
async function taxState(ctx: Ctx, ym: string) {
  const { data: invs } = await db.from("check_invoice").select("id,tax_key,bill_to_name")
    .eq("office_id", ctx.office.id).eq("ym", S(ym)).not("tax_key", "is", null);
  let n = 0;
  for (const v of invs ?? []) {
    if (!S(v.tax_key)) continue;
    try {
      const r = await popCall("/Taxinvoice/SELL/" + encodeURIComponent(S(v.tax_key)), "GET", "", ctx.office);
      await db.from("check_invoice").update({
        tax_state: S(r?.stateMemo) || S(r?.stateCode), tax_ntsid: S(r?.ntsconfirmNum ?? r?.ntsConfirmNum),
      }).eq("id", v.id);
      n++;
    } catch { /* 한 장 실패해도 넘어갑니다 */ }
  }
  return { n };
}

/** 팝빌 세금계산서 상세 화면을 여는 주소 (30초만 살아 있습니다) */
async function taxPopup(ctx: Ctx, id: string) {
  bossOnly(ctx);                                             // v32(보안 M3)
  const { data: v } = await db.from("check_invoice").select("tax_key")
    .eq("office_id", ctx.office.id).eq("id", S(id)).maybeSingle();
  if (!v || !S(v.tax_key)) throw new Error("아직 발급하지 않은 청구서입니다.");
  const r = await popCall("/Taxinvoice/SELL/" + encodeURIComponent(S(v.tax_key)) + "?TG=POPUP", "GET", "", ctx.office);
  return { url: S(r?.url) };
}

/** 팝빌 홈페이지로 바로 들어가는 주소 (로그인 없이) */
async function popLogin(ctx: Ctx, togo: string) {
  bossOnly(ctx);                                             // v32(보안 M3)
  const w = popWho(ctx.office);
  const tk = await popToken(w.corp, w.test);
  const r = await fetch(LH_AUTH + "/" + popService(w.test) + "/URL?TG=" + encodeURIComponent(S(togo) || "LOGIN"),
    { headers: { "Authorization": "Bearer " + tk } });
  const j = await r.json();
  return { url: S(j?.url) };
}

/* ───────── 기록 ───────── */
type Ctx = { office: any; who: string; role: string; ip?: string };

/* ============================================================
   v25. 검사소 직원 권한 — 대표(owner)만
   ============================================================ */
/** v32(보안 M3): 대표만 할 수 있는 일 (세금계산서 사이트·팝빌 바로 열기·계좌 바꾸기·기사 설정) */
function bossOnly(ctx: Ctx) {
  if (S(ctx?.role) !== "owner") throw new Error("대표님만 할 수 있습니다.");
}
function ownerOnly(ctx: Ctx) {
  if (S(ctx?.role) !== "owner") throw new Error("대표님만 직원 권한을 바꿀 수 있습니다.");
}
function phoneNorm(v: unknown) {
  const p = S(v).replace(/[^0-9]/g, "");
  if (!/^01[0-9]{8,9}$/.test(p)) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  return p;
}
function phoneMask(p: string) {
  const d = S(p).replace(/[^0-9]/g, "");
  return d.length >= 10 ? d.slice(0, 3) + "-****-" + d.slice(-4) : "****";
}
const ROLE_KO: Record<string, string> = { owner: "대표", staff: "직원" };
function roleOf(v: unknown) {
  const r = S(v).toLowerCase();
  if (r === "owner" || r === "대표") return "owner";
  if (r === "staff" || r === "직원" || !r) return "staff";
  throw new Error("권한은 대표 또는 직원만 고를 수 있습니다.");
}
/** 경비실 명단 맞추기 — 명단에 있는 번호만 check 를 더하거나 뺍니다 (없으면 만들지 않음).
 *  뺄 때는 그 사람이 다른 검사소에서 아직 쓰고 있으면 그대로 둡니다. */
async function cggSync(phone: string) {
  const { data: acc, error } = await db.from("cgg_access").select("products").eq("phone", phone).maybeSingle();
  if (error || !acc) return;
  const { data: live } = await db.from("check_user").select("id").eq("phone", phone).eq("active", true);
  const want = (live ?? []).length > 0;
  const list: string[] = Array.isArray(acc.products) ? acc.products.filter((x: string) => x !== "check") : [];
  if (want) list.push("check");
  await db.from("cgg_access").update({ products: list, updated_at: new Date().toISOString() }).eq("phone", phone);
}
async function staffOf(ctx: Ctx, id: string) {
  const { data } = await db.from("check_user").select("id, office_id, phone, name, role, active")
    .eq("id", S(id)).eq("office_id", ctx.office.id).maybeSingle();
  if (!data) throw new Error("이 검사소의 직원이 아닙니다.");
  return data;
}

/** 직원 목록 — [] → [{id, 이름, 휴대폰(가림), 권한, 사용, 비밀번호, 마지막로그인, 나}] */
async function staffList(ctx: Ctx) {
  ownerOnly(ctx);
  const { data } = await db.from("check_user").select("id, phone, name, role, active, pw_hash, last_in")
    .eq("office_id", ctx.office.id);
  return (data ?? []).map((u: any) => ({
    id: S(u.id), 이름: S(u.name), 휴대폰: phoneMask(u.phone), 권한: ROLE_KO[S(u.role)] ?? "직원",
    사용: u.active === false ? "N" : "Y", 비밀번호: S(u.pw_hash) ? "정함" : "처음 로그인 때 정함",
    마지막로그인: S(u.last_in), 나: S(u.phone) === S(ctx.who) ? "Y" : "",
  }));
}

/** 직원 넣기 — [이름, 휴대폰, 권한(대표/직원)]. 비밀번호는 비워 두고 처음 로그인 때 정합니다 */
async function staffAdd(ctx: Ctx, nameRaw: string, phoneRaw: string, roleRaw: string) {
  ownerOnly(ctx);
  const name = S(nameRaw), phone = phoneNorm(phoneRaw), role = roleOf(roleRaw);
  if (!name) throw new Error("이름을 넣어 주세요.");
  if (name.length > 20) throw new Error("이름이 너무 깁니다.");
  const { data: had } = await db.from("check_user").select("id, active")
    .eq("office_id", ctx.office.id).eq("phone", phone).maybeSingle();
  if (had) throw new Error(had.active === false
    ? "이미 있던 직원입니다. 목록에서 [사용]으로 다시 켜 주세요."
    : "이미 이 검사소의 직원입니다.");
  const row: Record<string, unknown> = { office_id: ctx.office.id, phone, name, role, active: true };
  let { error } = await db.from("check_user").insert(row);
  if (error && /null value in column "id"/i.test(S(error.message))) {
    ({ error } = await db.from("check_user").insert({ id: crypto.randomUUID(), ...row }));
  }
  if (error) throw new Error("직원을 넣지 못했습니다: " + error.message);
  await cggSync(phone);
  await log(ctx, "직원 넣기", { name, phone: phoneMask(phone), role });
  return { ok: true };
}

/** 직원 고치기 — [id, {권한?, 사용?, 비밀번호초기화?}] */
async function staffEdit(ctx: Ctx, id: string, patch: any) {
  ownerOnly(ctx);
  const u: any = await staffOf(ctx, id);
  const me = S(u.phone) === S(ctx.who);
  const up: Record<string, unknown> = {};
  if (patch?.권한 !== undefined) up.role = roleOf(patch.권한);
  if (patch?.사용 !== undefined) up.active = S(patch.사용) !== "N";
  if (patch?.비밀번호초기화) up.pw_hash = null;
  if (!Object.keys(up).length) return { ok: true };
  if (me && (up.active === false || up.role === "staff"))
    throw new Error("자기 자신은 멈추거나 대표 권한을 뺄 수 없습니다.");
  if (me && up.pw_hash === null)   // v27
    throw new Error("자기 비밀번호는 여기서 초기화할 수 없습니다. (로그인한 채로 비밀번호 바꾸기를 써 주세요)");
  /* 검사소에 쓰는 대표가 한 명은 남아야 합니다 */
  const losesOwner = S(u.role) === "owner" && u.active !== false && (up.role === "staff" || up.active === false);
  if (losesOwner) {
    const { data: owners } = await db.from("check_user").select("id")
      .eq("office_id", ctx.office.id).eq("role", "owner").eq("active", true);
    if ((owners ?? []).filter((o: any) => S(o.id) !== S(u.id)).length < 1)
      throw new Error("대표가 한 명은 있어야 합니다.");
  }
  const { error } = await db.from("check_user").update(up).eq("id", u.id).eq("office_id", ctx.office.id);
  if (error) throw new Error(error.message);
  /* 권한·사용·비밀번호가 바뀌면 그 사람의 이 검사소 로그인을 끊습니다 */
  await db.from("check_session").delete().eq("phone", S(u.phone)).eq("office_id", ctx.office.id);
  if (up.active !== undefined) await cggSync(S(u.phone));
  await log(ctx, "직원 고치기", { name: S(u.name), phone: phoneMask(u.phone), ...up, pw_hash: up.pw_hash === null ? "초기화" : undefined });
  return { ok: true };
}

async function log(ctx: Ctx, what: string, detail: unknown) {
  await db.from("check_log").insert({ office_id: ctx.office.id, who: ctx.who, what, detail });
}


/* ============================================================
   5. 차량 배달 알림 (모듈 2) — 구글 스크립트에서 그대로 옮김
   · 번호판 읽기 : OCR.space → 앤트로픽 (차곳간워시와 같은 방식)
   · 사진 보관   : 구글 드라이브 → 수파베이스 저장소 (check-deliv)
   · 화면(기사앱·사무실)이 쓰는 이름과 돌려주는 모양은 그대로 둡니다
   ============================================================ */
const DELIV_BUCKET = "check-deliv";
const LOG_HEAD = ["배달ID","도착일시","딜러","상사","딜러연락처","차량번호","차대번호","차명","성능번호",
  "목적지","목적지분류","기사","위도","경도","위치정확도(m)","사진ID","추가사진ID","번호판읽기",
  "발송방법","발송결과","발송사유","메시지ID","보낸일시","상태","메모"];

/* ───────── 작은 도구 ───────── */
const KST = 9 * 3600000;
function kstNow() { return new Date(Date.now() + KST); }
function fmtTs(d: Date) {
  const z = (n: number) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + z(d.getUTCMonth() + 1) + "-" + z(d.getUTCDate()) + " " +
         z(d.getUTCHours()) + ":" + z(d.getUTCMinutes()) + ":" + z(d.getUTCSeconds());
}
function ymdK(d: Date) { return fmtTs(d).slice(0, 10); }
function plateNorm(v: unknown) { return S(v).replace(/[\s\-]/g, ""); }
function telFmt(v: unknown) {
  const n = S(v).replace(/[^0-9]/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (n.length === 10) return n.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  return S(v);
}
/** 글자에서 한국 번호판 모양만 골라냅니다 (12가3456 · 123가4567 · 서울12가3456) */
function platesFrom(text: string) {
  const out: string[] = [];
  const re = /(\d{2,3})\s*([가-힣])\s*(\d{4})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(S(text))) !== null) {
    const p = m[1] + m[2] + m[3];
    if (!out.includes(p)) out.push(p);
  }
  return out;
}
/** 하루 한도 — check_rate_bump 가 아직 없으면 막지 않고 통과시킵니다 */
async function rateOk(key: string, max: number) {
  try {
    const { data, error } = await db.rpc("check_rate_bump", { p_key: key, p_max: max });
    if (error) {                                             // 보안 낮음 ③: 함수가 없을 때(SQL 11 전)만 통과 · 다른 오류는 막음
      const c = String((error as any).code || "");
      return c === "PGRST202" || c === "42883" || /does not exist|Could not find the function/i.test(String(error.message || ""));
    }
    return data !== false;
  } catch (_) { return false; }
}
function env(k: string, d = "") { return Deno.env.get(k) ?? d; }

/* ───────── 기사 로그인 ───────── */
function tokenOf(name: string, hash: string) {
  return "T1." + btoa(unescape(encodeURIComponent(name))).replace(/=+$/, "") + "." + S(hash).slice(0, 16);
}
/** pin = 기사 토큰(T1.…) 또는 사무실 로그인 열쇠 */
async function delivWho(pin: string, need: "driver" | "office" = "driver", allowMust = false) {
  const p = S(pin);
  if (p.startsWith("T1.")) {
    if (need === "office") throw new Error("사무실 화면은 차곳간체크로 로그인해야 합니다.");
    const { data: d } = await db.from("check_deliv_driver")
      .select("*, check_office(*)").eq("token", p).maybeSingle();
    if (!d || d.active === false) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    /* v30: 임시 비밀번호로 들어왔으면 비밀번호 바꾸기만 */
    if (d.must_change === true && !allowMust)
      throw Object.assign(new Error("임시 비밀번호입니다. 비밀번호를 먼저 바꿔 주세요."), { need: "pwchange" });
    return { office: d.check_office, who: S(d.name), driverId: S(d.id), role: "driver" };
  }
  const ctx = await whoIs("", p);
  return { office: ctx.office, who: S(ctx.who), driverId: "", role: S(ctx.role) };
}
async function delivConf(officeId: string) {
  const { data } = await db.from("check_deliv_conf").select("*").eq("office_id", officeId).maybeSingle();
  return data ?? { way: "sms", fallback: false, sms_text: "", from_tel: "",
                   ai_on: true, ai_max_day: 400, photo_on: true };
}

/* v23: 기사 비밀번호 — 새로 정하는 비밀번호는 6자 이상 (이미 쓰던 4~5자 비밀번호는 그대로 로그인 가능) */
const DRV_PW_MIN = 6;
function drvPwCheck(p: string) {
  if (S(p).length < DRV_PW_MIN) throw new Error(`비밀번호는 ${DRV_PW_MIN}자 이상으로 적어 주세요.`);
}
/** 회사 기사 비밀번호 → 검사소. 검사소 코드(GAON, 대소문자 상관없음) 또는 사업자번호 숫자(10자리) 둘 다 받습니다 */
async function officeByPin(companyPin: string) {
  const raw = S(companyPin);
  const code = raw.toUpperCase();
  const digits = raw.replace(/[^0-9]/g, "");
  let off: any = null;
  if (code) {
    const { data } = await db.from("check_office").select("id,code,biz_no").eq("code", code).maybeSingle();
    off = data;
  }
  if (!off && digits.length >= 10) {
    const { data: all } = await db.from("check_office").select("id,code,biz_no");
    off = (all ?? []).find((o: any) => S(o.biz_no).replace(/[^0-9]/g, "") === digits) ?? null;
  }
  return off;
}
/* v23: 틀린 횟수 세기 — 검사소+이름마다 하나. 비밀번호를 보기 전에 데이터베이스 함수가 한 번에 올립니다
   (한꺼번에 보내도 새지 않음). 5번까지 시도 가능, 5번째에 10분 잠금. 성공하면 지웁니다. */
const LOCK_MIN_DRV = 10;
const failKey = (officeId: string, name: string) => S(officeId) + ":" + S(name);

/** 기사 로그인 — [이름, 비밀번호, (회사 기사 비밀번호 = 검사소 코드 또는 사업자번호)]
 *  v23: 같은 이름이 여러 검사소에 있으면 회사 기사 비밀번호로 구분합니다. 안 넣어도 이름이 하나뿐이면 예전처럼 들어갑니다. */
async function deliv_login(_c: Ctx, name: string, pw: string, officeCode?: string) {
  const nm = S(name), p = S(pw);
  if (!nm || !p) throw new Error("이름과 비밀번호를 넣어 주세요.");
  let d: any = null;
  if (S(officeCode)) {
    const off = await officeByPin(S(officeCode));
    if (!off) throw new Error("회사 기사 비밀번호가 맞지 않습니다. 사무실에 물어 보세요.");
    const { data } = await db.from("check_deliv_driver").select("*")
      .eq("office_id", off.id).eq("name", nm).maybeSingle();
    d = data;
  } else {
    const { data: rows } = await db.from("check_deliv_driver").select("*").eq("name", nm);
    const all = rows ?? [];
    const live = all.filter((r: any) => r.active !== false);
    if (live.length > 1 || (!live.length && all.length > 1))
      throw new Error("같은 이름의 기사가 여러 회사에 있습니다. 회사 기사 비밀번호(검사소 코드)를 함께 넣어 주세요.");
    d = live[0] ?? all[0] ?? null;
  }
  if (!d) throw new Error("없는 이름입니다. 처음이면 [계정 만들기]를 눌러 주세요.");
  if (d.active === false) throw new Error("사용이 멈춘 계정입니다. 사무실에 물어 보세요.");
  if (!S(d.pw_hash)) throw new Error("비밀번호가 초기화되었습니다. [계정 만들기]에서 새 비밀번호를 정해 주세요.");
  // v23: 비밀번호를 보기 전에 시도 횟수부터 올립니다. 함수가 없으면 문을 닫는 쪽(거절)
  const key = failKey(d.office_id, d.name);
  const { data: can, error: aerr } = await db.rpc("check_deliv_attempt", { p_key: key });
  if (aerr) throw new Error("서버를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  if (can === false)
    throw new Error(`비밀번호를 여러 번 틀려 ${LOCK_MIN_DRV}분 동안 잠겼습니다. 잠시 뒤 다시 해 주세요.`);
  if (!(await pwOk(p, d.pw_hash))) throw new Error("비밀번호가 맞지 않습니다.");
  await db.from("check_deliv_fail").delete().eq("key", key);
  const tk = tokenOf(nm, d.pw_hash);
  await db.from("check_deliv_driver").update({ token: tk, last_in: new Date().toISOString() }).eq("id", d.id);
  return { ok: true, name: nm, token: tk, mustChange: d.must_change === true };   // v30
}
async function deliv_signup(_c: Ctx, companyPin: string, name: string, pw: string) {
  const nm = S(name), p = S(pw);
  if (!nm) throw new Error("이름을 넣어 주세요.");
  if (nm.length > 20) throw new Error("이름이 너무 깁니다.");
  drvPwCheck(p);
  const off = await officeByPin(companyPin);
  if (!off) throw new Error("회사 기사 비밀번호가 맞지 않습니다. 사무실에 물어 보세요.");
  const h = await pwHash(p);
  /* v22: 이름은 이 검사소 안에서만 찾고, 가입한 계정은 사무실이 [사용]으로 바꿔 줄 때까지 멈춰 둡니다.
     (회사 기사 비밀번호만 알면 아무나 기사 열쇠를 받아 배달 목록을 보던 길을 막음) */
  const { data: had } = await db.from("check_deliv_driver").select("*")
    .eq("office_id", off.id).eq("name", nm).maybeSingle();
  if (had && S(had.pw_hash)) throw new Error("이미 있는 이름입니다. [로그인]으로 들어가세요.");
  /* v23: 「가입 신청」 표시를 먼저 남깁니다 — 사무실 목록에 따로 보여서, 승인 전에 그 기사에게 직접 물어볼 수 있게.
     표시를 못 남기면 가입도 받지 않습니다 (표시 없는 승인 대기가 생기지 않도록) */
  const { error: serr } = await db.from("check_deliv_signup").upsert(
    { office_id: off.id, name: nm, requested_at: new Date().toISOString() }, { onConflict: "office_id,name" });
  if (serr) throw new Error("서버를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  if (had) {
    await db.from("check_deliv_driver").update({ pw_hash: h, token: null, active: false }).eq("id", had.id);
  } else {
    await db.from("check_deliv_driver").insert({ office_id: off.id, name: nm, pw_hash: h, token: null, active: false });
  }
  throw new Error("가입 신청이 접수되었습니다. 사무실에서 [사용]으로 바꾸면 [로그인]으로 들어올 수 있습니다.");
}
async function deliv_changePw(_c: Ctx, token: string, oldPw: string, newPw: string) {
  const w = await delivWho(token, "driver", true);              // v30: 임시 비밀번호여도 바꾸기는 됨
  const { data: d } = await db.from("check_deliv_driver").select("*").eq("id", w.driverId).maybeSingle();
  if (!d || !(await pwOk(S(oldPw), d.pw_hash))) throw new Error("지금 비밀번호가 맞지 않습니다.");
  drvPwCheck(S(newPw));
  const h = await pwHash(S(newPw));
  const tk = tokenOf(w.who, h);
  if (S(newPw) === S(oldPw)) throw new Error("새 비밀번호는 지금 것과 달라야 합니다.");
  const up: any = { pw_hash: h, token: tk };
  if (d.must_change === true) up.must_change = false;          // v30: 칸이 없는 표에는 안 씀
  await db.from("check_deliv_driver").update(up).eq("id", d.id);
  return { ok: true, name: w.who, token: tk };
}

/* ───────── 줄 모양 바꾸기 (표 ↔ 화면) ───────── */
function rowOut(r: any, photos: any[]) {
  const main = photos.find((p) => N(p.ord) === 0);
  const more = photos.filter((p) => N(p.ord) > 0).map((p) => S(p.id));
  return {
    배달ID: S(r.id), 도착일시: fmtTs(new Date(new Date(r.arrived_at).getTime() + KST)),
    딜러: S(r.dealer_name), 상사: S(r.company_name), 딜러연락처: telFmt(r.tel),
    차량번호: S(r.plate), 차대번호: "", 차명: S(r.car_name), 성능번호: "",
    목적지: S(r.dest_name), 목적지분류: "", 기사: S(r.driver_name),
    위도: "", 경도: "", "위치정확도(m)": "",
    사진ID: main ? S(main.id) : "", 추가사진ID: more.join(","),
    번호판읽기: S(r.plate_ocr) ? (S(r.plate_ocr) === S(r.plate) ? "자동" : "고침") : "직접",
    발송방법: S(r.how).toUpperCase(), 발송결과: S(r.state) === "보냄" ? "성공" : (S(r.state) === "못 보냄" ? "실패" : ""),
    발송사유: S(r.err), 메시지ID: "", 보낸일시: r.sent_at ? fmtTs(new Date(new Date(r.sent_at).getTime() + KST)) : "",
    상태: S(r.state) === "취소" ? "취소" : (r.trashed ? "삭제" : ""), 메모: S(r.memo),
    _view: S(r.view_key), _viewAt: r.view_at ? fmtTs(new Date(new Date(r.view_at).getTime() + KST)) : "",
  };
}
async function rowsBetween(officeId: string, from: string, to: string, trash = false) {
  const f = S(from) || ymdK(kstNow());
  const t = S(to) || f;
  const { data } = await db.from("check_deliv").select("*")
    .eq("office_id", officeId).eq("trashed", trash)
    .gte("arrived_at", f + "T00:00:00+09:00").lte("arrived_at", t + "T23:59:59+09:00")
    .order("arrived_at", { ascending: true }).limit(3000);
  const ids = (data ?? []).map((r) => r.id);
  const { data: ph } = ids.length
    ? await db.from("check_deliv_photo").select("id,deliv_id,ord").in("deliv_id", ids)
    : { data: [] as any[] };
  return (data ?? []).map((r) => rowOut(r, (ph ?? []).filter((p) => p.deliv_id === r.id)));
}

/* ───────── 사진 ───────── */
function b64bin(b64: string) {
  const raw = S(b64).replace(/^data:[^,]+,/, "");
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function photoPut(delivId: string, b64: string, ord: number) {
  const bytes = b64bin(b64);
  const path = delivId + "/" + ord + ".jpg";
  const { error } = await db.storage.from(DELIV_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error("사진 저장 실패 : " + error.message);
  const { data } = await db.from("check_deliv_photo")
    .insert({ deliv_id: delivId, ord, path, bytes: bytes.length }).select("id").single();
  return S(data?.id);
}
async function deliv_photo(_c: Ctx, pin: string, photoId: string) {
  const w = await delivWho(pin);
  const { data: p } = await db.from("check_deliv_photo").select("path,deliv_id").eq("id", S(photoId)).maybeSingle();
  if (!p) throw new Error("사진을 찾지 못했습니다.");
  /* v40: 이 검사소 배달 사진만 (사진 id 를 알아도 남의 검사소 사진은 못 봄) */
  const { data: dv } = await db.from("check_deliv").select("id").eq("office_id", w.office.id).eq("id", S(p.deliv_id)).maybeSingle();
  if (!dv) throw new Error("사진을 찾지 못했습니다.");
  const { data: signed } = await db.storage.from(DELIV_BUCKET).createSignedUrl(p.path, 3600);
  /* 화면이 <img src=…> 로 바로 쓰도록 b64 자리에도 주소를 넣어 줍니다 */
  return { ok: true, url: S(signed?.signedUrl), b64: S(signed?.signedUrl) };
}

/* ───────── 사진 읽기 (Claude) — 차곳간워시와 똑같은 방식 ─────────
   앱이 보낸 사진을 읽어 JSON 글자 하나로 돌려줍니다.
   prompt : 무엇을 읽을지 시키는 글
   b64    : 사진을 base64 로 바꾼 글자 (앞의 data:image/... 는 떼고 보냅니다) */
/** 모델 이름 — claude-haiku-5.5 처럼 점을 찍어도 claude-haiku-5-5 로 고쳐 씁니다 */
function aiModel() {
  const m = env("ANTHROPIC_MODEL", "claude-haiku-5-5").trim();
  return m.replace(/(\d)\.(\d)/g, "$1-$2");
}
/** 무엇이 잘못됐는지 쉬운 말로 */
function aiWhy(msg: string) {
  const m = S(msg);
  if (/invalid x-api-key|authentication|401/i.test(m)) return "번호판 자동 읽기 설정이 맞지 않습니다. 차곳간(010-9559-3663)으로 알려 주세요.";
  if (/not_found|404|model/i.test(m)) { console.error("ai model", aiModel()); return "번호판 자동 읽기 설정이 맞지 않습니다. 차곳간(010-9559-3663)으로 알려 주세요."; }
  if (/credit|billing|402/i.test(m)) return "번호판 자동 읽기를 지금은 쓸 수 없습니다. 번호를 직접 적어 주세요.";
  if (/429|rate_limit/i.test(m)) return "잠시 뒤에 다시 해 주세요";
  if (/한도/.test(m)) return m;
  return /[A-Za-z]{3,}/.test(m) ? "번호판을 읽지 못했습니다. 번호를 직접 적어 주세요." : (m || "번호판을 읽지 못했습니다. 번호를 직접 적어 주세요.");
}
function aiShop(c: Ctx) {
  const code = S(c?.office?.code);
  if (!code) throw new Error("검사소를 알 수 없어 사진 읽기를 할 수 없습니다. 다시 로그인해 주세요.");
  return code;
}
/** v35: 사진 종류 — data: 머리말이나 첫 글자로 알아봄 (모르면 jpeg) */
function imgType(b64: string) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,/i.exec(b64);
  if (m) return m[1].toLowerCase();
  const d = b64.replace(/^data:[^,]+,/, "");
  if (d.startsWith("iVBOR")) return "image/png";
  if (d.startsWith("UklGR")) return "image/webp";
  if (d.startsWith("R0lGOD")) return "image/gif";
  return "image/jpeg";
}
/** v37·sb18: 답에서 첫 { 부터 마지막 } 까지만 — 앞뒤에 말이 붙어도 읽음 */
function jsonCut(t: string) {
  let x = String(t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = x.indexOf("{"), b = x.lastIndexOf("}");
  if (a >= 0 && b > a) x = x.slice(a, b + 1);
  return x;
}
async function aiJson(shop: string, prompt: string, b64: string, maxTok = 500) {
  const key = env("ANTHROPIC_KEY");
  if (!key) throw new Error("번호판 자동 읽기를 지금은 쓸 수 없습니다. 번호를 직접 적어 주세요.");

  /* 업체당 하루 한도 — 요금이 새지 않게 합니다 */
  if (!await rateOk("ai:" + shop, Number(env("AI_MAX_DAY", "200"))))
    throw new Error("오늘 번호판 자동읽기 한도를 다 썼습니다. 번호를 직접 적어 주세요");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: aiModel(),
      max_tokens: Math.max(100, Math.min(2000, maxTok)),
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: imgType(S(b64)),
          data: S(b64).replace(/^data:[^,]+,/, "") } },
        { type: "text", text: prompt },
      ] }],
    }),
  });

  const j: any = await res.json().catch(() => ({}));
  if (!j.content) throw new Error(aiWhy((j.error?.message || "") + " " + res.status));

  /* 쓴 만큼 적어 둡니다 (실패해도 그냥 넘어갑니다) */
  try {
    await db.from("check_usage").insert({
      shop, kind: "ai",
      in_tok: j.usage?.input_tokens || 0,
      out_tok: j.usage?.output_tokens || 0,
    });
  } catch (_) { /* 기록 실패는 무시 */ }

  if (j.stop_reason === "max_tokens") console.error("ai 답이 길어서 잘림", shop);
  const text = jsonCut(j.content.map((c: any) => c.text || "").join(""));
  JSON.parse(text);          /* 모양이 틀리면 여기서 걸립니다 */
  return text;
}

/* 시키는 글 — 차곳간워시에서 다듬은 원문. 토씨를 바꾸지 마세요 */
const PLATE_PROMPT =
  "아래 사진은 한국 중고차 사진입니다. 번호판에 적힌 차량번호를 읽어 주세요.\n" +
  "JSON 하나만 답하세요. 다른 말은 쓰지 마세요.\n" +
  '형식: {"plate":"12가3456","sure":true}\n' +
  "- 지역명(서울, 경기 등)이 번호판에 있으면 앞에 붙여 적으세요.\n" +
  "- 공백 없이 붙여 쓰세요.\n" +
  '- 번호판이 안 보이거나 확실하지 않으면 {"plate":"","sure":false}';

const CARD_PROMPT =
  "명함 사진입니다. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\n" +
  '형식: {"name":"이름","phone":"010-0000-0000","company":"회사(상사)명","bizName":"상호","bizNo":"000-00-00000","email":"","addr":""}\n' +
  "- 없는 값은 빈 문자열로 두세요.\n" +
  "- 휴대폰은 010으로 시작하는 번호를 고르세요.";

const BIZ_PROMPT =
  "사업자등록증(또는 홈택스 출력물) 사진입니다. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\n" +
  '형식: {"bizNo":"000-00-00000","bizName":"상호","ceo":"대표자","addr":"사업장 주소","upte":"업태","jongmok":"종목","openDate":"YYYYMMDD","tel":"","email":""}\n' +
  "- 개업연월일은 openDate 에 숫자 8자리(YYYYMMDD)로 적으세요.\n" +
  "- 종이 여백에 손글씨나 도장으로 적힌 전화번호(팩스 말고)와 이메일(전자세금계산서용)이 있으면 tel·email 에 적으세요.\n" +
  "- 등록증 아래쪽에 붙은 작은 표(E-mail · 전화 · 팩스 칸)도 꼭 읽으세요. 전화 칸 번호는 tel 에, 팩스 칸 번호는 적지 마세요.\n" +
  "- 없는 값은 빈 문자열로 두세요.\n" +
  "- 업태·종목이 여러 줄이면 첫 줄만 적으세요.\n" +
  "- 주소는 한 줄로 적으세요(사업장 주소만, 본점 주소는 빼세요).";

/* v35(요청서 C): 거래처 사진 읽기 — 대표만 · 검사소당 하루 한도 따로 · 정해진 칸만 돌려줌 */
const DOC_FAIL = "사진을 읽지 못했습니다. 직접 적어 주세요.";
const CARD_KEYS: Record<string, number> = { name: 20, phone: 20, company: 40, bizName: 40, bizNo: 20, email: 80, addr: 200 };
const BIZ_KEYS: Record<string, number> = { bizNo: 20, bizName: 40, ceo: 40, addr: 200, upte: 60, jongmok: 60, openDate: 20, tel: 20, email: 80 };
/** v37: 이메일은 모델 답을 믿지 않고 모양으로 다시 골라냄 — 첫 번째 것만 · 소문자 · 틀리면 "" */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
function emailPick(...src: string[]) {
  for (const t of src) { const m = EMAIL_RE.exec(S(t)); if (m) return m[0].toLowerCase().slice(0, 80); }
  return "";
}
/** v39: 답 전체 글에서 «전화·TEL» 바로 뒤 번호(팩스 말고) */
function telPick(t: string) {
  const m = /(?:전화|TEL|Tel|tel|연락처)[^0-9]{0,6}(0\d{1,2}[-.\s)]*\d{3,4}[-.\s]*\d{4}|1[5-9]\d{2}[-.\s]*\d{4})/.exec(S(t));
  return m ? telAny(m[1]) : "";
}
/** v37: 전화 — 휴대폰·지역번호(02·031 …)·070·1588 류 · 모양이 아니면 "" */
function telAny(v: unknown) {
  const d = onlyDigits(v);
  if (/^01\d{8,9}$/.test(d)) return telFmt(d);
  if (/^02\d{7,8}$/.test(d)) return d.length === 9 ? d.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3") : d.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
  if (/^0[3-7]\d\d{7,8}$/.test(d)) return d.length === 10 ? d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : d.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (/^1[5-9]\d{6}$/.test(d)) return d.replace(/(\d{4})(\d{4})/, "$1-$2");
  return "";
}
async function aiDoc(c: Ctx, kind: "card" | "biz", b64: string) {
  bossOnly(c);
  const shop = aiShop(c);
  const raw = S(b64);
  if (raw.replace(/^data:[^,]+,/, "").length < 100) throw new Error("사진이 비어 있습니다. 다시 찍어 주세요.");
  if (raw.length > 6_000_000) throw new Error("사진이 너무 큽니다. 조금 작게 찍어 주세요.");
  if (!await rateOk("aidoc:" + shop + ":" + ymdK(kstNow()), Number(env("CHECK_AI_DOC_DAY", "60"))))
    throw new Error("오늘 사진으로 채우기 한도를 다 썼습니다. 직접 적어 주세요.");
  let text = "";
  try { text = await aiJson(shop, kind === "card" ? CARD_PROMPT : BIZ_PROMPT, raw, 1500); }   // v37: 긴 글도 끝까지
  catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/한도/.test(m)) throw new Error("오늘 사진 읽기 한도를 다 썼습니다. 직접 적어 주세요.");
    if (/잠시 뒤/.test(m)) throw new Error("잠시 뒤에 다시 해 주세요.");
    throw new Error(DOC_FAIL);
  }
  let v: any = {};
  try { v = JSON.parse(text); } catch (_) { throw new Error(DOC_FAIL); }
  const keys = kind === "card" ? CARD_KEYS : BIZ_KEYS;
  const out: Record<string, string> = {};
  for (const k of Object.keys(keys)) out[k] = S(v?.[k]).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, keys[k]);
  if (out.bizNo) { const d = onlyDigits(out.bizNo); out.bizNo = d.length === 10 ? d.slice(0, 3) + "-" + d.slice(3, 5) + "-" + d.slice(5) : ""; }
  if (out.phone) { const d = onlyDigits(out.phone); out.phone = /^01\d{8,9}$/.test(d) ? telFmt(d) : ""; }
  if ("email" in out) out.email = emailPick(S(v?.email), text);            // v37: 모양으로 다시 골라냄
  if ("tel" in out) out.tel = telAny(out.tel) || telPick(text);           // v39: 칸이 비면 답 전체 글에서 «전화» 옆 번호
  if ("openDate" in out) { const d = onlyDigits(out.openDate); out.openDate = /^(19|20)\d{6}$/.test(d) ? d : ""; }
  if ("openDate" in out) out.start = out.openDate ? out.openDate.slice(0, 4) + "-" + out.openDate.slice(4, 6) + "-" + out.openDate.slice(6) : "";   // 체크 v47 약속
  await log(c, kind === "card" ? "명함 사진 읽기" : "사업자등록증 사진 읽기", { ok: true });
  return JSON.stringify(out);      // 답 모양은 v34 와 같게 JSON 글자 하나
}

/* v37(대표님 10/18): 사업자번호 진위·상태 확인 — 국세청 사업자등록정보 진위확인 및 상태조회(공공데이터포털 · 무료)
   열쇠 이름 NTS_API_KEY (값은 Secrets 에만). 없으면 «확인 준비 중»(ready:false)으로 조용히 넘어감 · 저장은 막지 않음 · 대표만 · 하루 한도 */
/** 답 모양 — 체크 v47 약속(state · since · match:{ceo, start}) + 총괄 모양(closedAt · ok) 을 함께.
    국세청 진위확인은 대표자·개업일을 한 번에 맞춰 보므로 둘이 같은 값이에요(안 물었으면 null) */
function vres(ready: boolean, state: string, closed: string, ok: boolean | null, why: string) {
  return { ready, state, since: closed, closedAt: closed, match: { ceo: ok, start: ok }, ok, why };
}
/** v42: 연결 실패 갈래(짧은 코드만 · 오류 원문·주소·열쇠는 남기지 않음) */
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
  const key = S(env("NTS_API_KEY")).trim().replace(/^["']|["']$/g, "").trim();   // v42: 붙여 넣을 때 딸려 온 줄바꿈·따옴표 뗌(머리글이 깨져 «연결 실패»로 보이던 것)
  const b = onlyDigits(bizNo);
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
      /* v42: 머리글이 깨졌거나(hdr) 갈래를 모르는 연결 실패도 주소 방식으로 한 번 더 — 시간 넘김·dns 는 다시 해도 같아서 안 함 */
      if (mode === "h" && e instanceof Error && /^nts:(key|hdr|net|conn)$/.test(e.message)) { mode = "q"; return await once(path, body, "q"); }
      throw e;
    }
  };
  try {
    const st = await post("status", { b_no: [b] });
    const cd = S(st.b_stt_cd);
    const state = cd === "01" ? "계속" : cd === "02" ? "휴업" : cd === "03" ? "폐업" : "없음";
    const end = onlyDigits(st.end_dt);
    let match: boolean | null = null;
    const od = onlyDigits(openDate), nm = S(ceo).trim();
    if (state !== "없음" && od.length === 8 && nm) {
      const va = await post("validate", { businesses: [{ b_no: b, start_dt: od, p_nm: nm.slice(0, 40) }] });
      match = S(va.valid) === "01";
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
async function bizVerify(c: Ctx, opt: any) {
  bossOnly(c);
  const o = (opt && typeof opt === "object") ? opt : { bizNo: opt };
  if (!await rateOk("bizv:" + S(c.office.id) + ":" + ymdK(kstNow()), Number(env("CHECK_BIZV_DAY", "100"))))
    throw new Error("오늘 사업자번호 확인 한도를 다 썼습니다. 내일 다시 해 주세요.");
  const no = S(o.no ?? o.bizNo), start = S(o.start ?? o.openDate);     // 체크 v47 약속({no, ceo, start}) · 예전 모양도 받음
  const r = await ntsVerify(no, S(o.ceo), start);
  await log(c, "사업자번호 확인", { biz: onlyDigits(no).slice(0, 3) + "-**-*****", state: r.state, ok: r.ok, ready: r.ready });
  return r;
}

/** 기사앱이 부르는 번호판 읽기 — 화면 코드를 그대로 두려고 모양을 맞춰 돌려줍니다 */
async function deliv_readPlate(_c: Ctx, pin: string, b64: string) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  if (conf.ai_on === false) return { ok: true, engine: "꺼둠", plates: [], text: "" };
  try {
    const raw = await aiJson(S(w.office.code) || S(w.office.id), PLATE_PROMPT, b64);
    const v = JSON.parse(raw);
    const p = S(v.plate).replace(/\s/g, "");
    return { ok: true, engine: "Claude", sure: v.sure !== false,
             plates: p ? [p] : [], text: raw.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── 문자 · 알림톡 보내기 ───────── */
const solaHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function solaHmac(keyBytes: Uint8Array, msg: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", k, msg);
}
async function solapiAuth() {
  const key = Deno.env.get("SOLAPI_KEY") ?? "", secret = Deno.env.get("SOLAPI_SECRET") ?? "";
  if (!key || !secret) throw new Error("문자 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const te = new TextEncoder();
  const sig = solaHex(await solaHmac(te.encode(secret), te.encode(date + salt)));
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`;
}
/* ===== 발송 기록 (SQL 11 · cgg_sendlog) — 네 서버 같은 모양 =====
   솔라피로 «보내는» 요청은 모두 solapi() 한 곳을 지나고, 여기서 메시지마다 한 줄씩 남깁니다.
   (솔라피를 부르는 곳 = 기록을 남기는 곳)
   남기는 것: 제품 · 업체(검사소) 코드 · 템플릿 키 · 가린 번호(010-****-1234) · 알림톡/문자 · 솔라피 번호 · 결과 · 쉬운 오류
   남기지 않는 것: 본문 · 변수 «값»(인증번호·임시 비밀번호 등) · 열쇠·서명. 변수는 «이름»만.
   기록이 안 돼도 발송은 그대로 합니다(try 로 무시). */
type SendMeta = { shop?: string; tpl?: string; ref?: string };
const SEND_PRODUCT = "check";
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
    const { error } = await db.from("cgg_sendlog").insert(rows);
    if (error) console.error("sendRecord", String(error.message || "").slice(0, 80));
  } catch (e) { console.error("sendRecord", e instanceof Error ? e.message.slice(0, 80) : ""); }
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
/** 솔라피에 사진을 올려 두고 그 번호(fileId)를 받습니다 — MMS 에 붙일 때 씁니다 */
async function solapiPhoto(b64: string, name = "car.jpg") {
  const data = S(b64).replace(/^data:[^,]+,/, "");
  if (!data) return "";
  try {
    const r: any = await solapi("POST", "/storage/v1/files", { file: data, name, type: "MMS" });
    return S(r?.fileId);
  } catch (_) { return ""; }   /* 사진이 안 올라가도 글자는 보냅니다 */
}
/** 저장소에 넣어 둔 사진을 base64 로 다시 꺼냅니다 (다시 보내기용) */
async function photoB64(delivId: string) {
  const { data: p } = await db.from("check_deliv_photo").select("path")
    .eq("deliv_id", delivId).eq("ord", 0).maybeSingle();
  if (!p) return "";
  const { data: f } = await db.storage.from(DELIV_BUCKET).download(p.path);
  if (!f) return "";
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

/** 문구에 값 채우기 */
function fillText(tpl: string, v: Record<string, string>) {
  let t = S(tpl);
  for (const k of Object.keys(v)) t = t.split("[" + k + "]").join(v[k]);
  return t;
}
/** 한 건 보내기 — 돌려주는 모양은 구글 스크립트와 같습니다 */
/** v32(보안 M2): 이 검사소가 보내는 번호로 쓸 수 있는 것 — 등록된 문자 발신번호 · 대표 전화 */
function officeFroms(office: any) {
  return [onlyDigits(office?.sms_from), onlyDigits(office?.tel)].filter((x) => x.length >= 8);
}
/** v32(보안 M2): 받는 번호가 이 검사소에 등록된 딜러(대표 번호·추가 번호) 것인지 */
async function dealerTelOk(officeId: string, to: string) {
  const { data } = await db.from("check_dealer").select("tel,tels,active").eq("office_id", officeId).limit(5000);
  for (const d of data ?? []) {
    if (d.active === false) continue;                       // v34(운영/06 N): 지운(쉬는) 딜러에게는 안 보냄
    if (onlyDigits(d.tel) === to) return true;
    for (const t of (Array.isArray(d.tels) ? d.tels : [])) if (onlyDigits(t?.tel ?? t) === to) return true;
  }
  return false;
}
const ARRIVE_OFFICE_DAY = () => Number(env("CHECK_ARRIVE_OFFICE_DAY", "1000"));
const ARRIVE_DRIVER_DAY = () => Number(env("CHECK_ARRIVE_DRIVER_DAY", "300"));
async function notifyOne(office: any, conf: any, row: any, viewKey: string, photo = "") {
  const to = S(row.tel).replace(/[^0-9]/g, "");
  if (!to) return { ok: false, why: "연락처 없음", how: "" };
  /* v32(보안 M2): 보내는 번호는 이 검사소 번호만 · 받는 번호는 등록된 딜러만 · 하루 상한 */
  const fromConf = onlyDigits(conf.from_tel);
  const from = (fromConf && officeFroms(office).includes(fromConf)) ? fromConf : onlyDigits(office.sms_from);
  if (!from) return { ok: false, why: "보내는 번호 없음", how: "" };
  if (!(await dealerTelOk(S(office.id), to))) return { ok: false, why: "등록된 딜러 번호가 아님", how: "" };
  const day = ymdK(kstNow());
  if (!(await rateOk("arrive:o:" + S(office.id) + ":" + day, ARRIVE_OFFICE_DAY())))
    return { ok: false, why: "오늘 보낼 수 있는 알림을 다 씀", how: "" };
  if (S(row.driver_id) && !(await rateOk("arrive:d:" + S(row.driver_id) + ":" + day, ARRIVE_DRIVER_DAY())))
    return { ok: false, why: "오늘 기사 한 명이 보낼 수 있는 알림을 다 씀", how: "" };

  const text = fillText(conf.sms_text || "[우리 회사] 차량 도착 안내\n\n[딜러] 님\n[차량번호] [차명] 차량이 [목적지]에 도착했습니다.\n\n· 도착 [도착 시각]\n· 기사 [기사]\n\n사진은 아래 주소에서 보실 수 있습니다.\n[사진 주소]\n문의 : [우리 연락처]", {
    "우리 회사": S(office.name), "딜러": S(row.dealer_name), "상사": S(row.company_name),
    "차량번호": S(row.plate), "차명": S(row.car_name), "목적지": S(row.dest_name),
    "도착 시각": fmtTs(new Date(new Date(row.arrived_at).getTime() + KST)).slice(5, 16),
    "기사": S(row.driver_name),
    "사진 주소": "https://app.cgg.co.kr/v.html?c=d" + viewKey,   // v34(운영/06 M): /d/ 화면 대신 v.html d 갈래
    "우리 연락처": S(office.tel),
  });

  const way = S(conf.way) || "sms";
  try {
    /* v29 규칙 5-6: 템플릿이 있으면 늘 알림톡 먼저, 대신 보내기 늘 켜짐(text = 문자 글).
       ① 본사 채널 템플릿(관리 설정 check_arrive) → ② 검사소가 정한 템플릿(ata_tpl) → ③ 둘 다 없으면 아래 문자 */
    const ha = await hqAta();
    const arrive = fmtTs(new Date(new Date(row.arrived_at).getTime() + KST)).slice(5, 16);
    const plan = (ha.tpl.check_arrive && ha.pf)
      ? { pf: ha.pf, tpl: ha.tpl.check_arrive, vars: {
          "#{딜러명}": S(row.dealer_name) || "-", "#{차량번호}": S(row.plate) || "-", "#{차명}": S(row.car_name) || "-",
          "#{목적지}": S(row.dest_name) || "-", "#{도착시각}": arrive, "#{보기코드}": viewKey,
          "#{업체전화}": S(office.tel) || "-", "#{업체명}": S(office.name) || "-" } }
      : (ha.tpl.release && ha.pf)   // v34(운영/06 M): 승인된 «차곳간_출고안내» 템플릿 — 변수만 채움 (본문은 솔라피 원문)
      ? { pf: ha.pf, tpl: ha.tpl.release, vars: {
          "#{딜러명}": S(row.dealer_name) || "-", "#{상사명}": S(row.company_name) || "개인",   // 알림톡 방: 상사가 없으면 «개인»
          "#{차량번호}": S(row.plate) || "-", "#{작업내용}": "성능점검 · 배달",
          "#{목적지}": S(row.dest_name) || "-", "#{출고일시}": arrive,
          "#{업체전화}": S(office.tel) || "-", "#{업체명}": S(office.name) || "-",
          "#{보기코드}": "d" + viewKey } }
      : (S(conf.ata_tpl) && ha.pf && Object.values(ha.tpl).includes(S(conf.ata_tpl)))   // 보안 낮음 ⑥: 본사 템플릿 목록 안에서만
      ? { pf: ha.pf, tpl: S(conf.ata_tpl), vars: {
          "#{업체명}": S(office.name), "#{딜러}": S(row.dealer_name),
          "#{차량번호}": S(row.plate), "#{차명}": S(row.car_name), "#{목적지}": S(row.dest_name),
          "#{도착시각}": arrive, "#{기사}": S(row.driver_name), "#{연락처}": S(office.tel), "#{링크}": viewKey } }
      : null;
    if (plan) (plan as any).vars = cleanVars((plan as any).vars);   // v33(보안 L1)
    if (plan) {
      try {
        const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [{
          to, from, text, kakaoOptions: { pfId: plan.pf, templateId: plan.tpl, variables: plan.vars, disableSms: false },
        }] }, { shop: S(office.code), tpl: plan.tpl === ha.tpl.check_arrive ? "check_arrive"
          : plan.tpl === ha.tpl.release ? "check_arrive_release" : "check_arrive_office", ref: S(row.id) });
        if (!(r.failedMessageList || []).length) return { ok: true, why: "", how: "ata" };
        console.error("arrive ata failed", JSON.stringify((r.failedMessageList || [])[0]).slice(0, 200));
      } catch (e3) { console.error("arrive ata", e3); }
      /* 알림톡 요청이 거절되면 아래 문자로 이어서 보냅니다 */
    }
    void way;
    /* 사진 붙여 보내기가 켜져 있고 사진이 있으면 MMS 로 같이 보냅니다 */
    const wantPhoto = conf.photo_on !== false;
    const fileId = (wantPhoto && photo) ? await solapiPhoto(photo, S(row.plate) || "car.jpg") : "";
    const msg: any = { to, from, text, subject: "차량 도착 안내" };
    if (fileId) { msg.type = "MMS"; msg.imageId = fileId; }
    else { msg.type = smsType(text); }   // v51: 90바이트
    await solapi("POST", "/messages/v4/send-many/detail", { messages: [msg] },
      { shop: S(office.code), tpl: "check_arrive_sms", ref: S(row.id) });
    return { ok: true, why: "", how: fileId ? "mms" : smsType(text).toLowerCase() };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : String(e), how: way };
  }
}

/* ───────── 첫 화면 열기 ───────── */
async function deliv_boot(_c: Ctx, pin: string, driver?: string) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  const { data: dests } = await db.from("check_deliv_dest").select("*")
    .eq("office_id", w.office.id).eq("active", true).order("ord");
  const { data: dealers } = await db.from("check_dealer")
    .select("id,name,tel,tels,company_id,check_company(name)").eq("office_id", w.office.id).eq("active", true);
  const today = ymdK(kstNow());
  const rows = await rowsBetween(w.office.id, today, today);
  const freq: Record<string, number> = {}; const recent: string[] = [];
  const { data: last500 } = await db.from("check_deliv").select("dest_name")
    .eq("office_id", w.office.id).eq("trashed", false)
    .order("arrived_at", { ascending: false }).limit(500);
  for (const r of last500 ?? []) {
    const d = S(r.dest_name); if (!d) continue;
    freq[d] = (freq[d] ?? 0) + 1;
    if (!recent.includes(d) && recent.length < 40) recent.push(d);
  }
  return {
    ok: true, ver: VER, me: w.who, company: S(w.office.name),
    dests: (dests ?? []).map((d) => ({ 목적지: S(d.name), 분류: S(d.kind), 사용: "Y" })),
    dealers: (dealers ?? []).map((d: any) => ({
      딜러: S(d.name), 상사: S(d.check_company?.name), 연락처: telFmt(d.tel),
      추가번호: (d.tels ?? []).map((t: any) => telFmt(t?.tel)).filter(Boolean).join(","),
    })),
    cars: [], today: rows, shared: { freq, recent },
    test: false, testTo: "", gps: true, how: S(conf.way).toUpperCase(),
    dupMin: 10, syncAt: "",
  };
}
async function deliv_cars(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  const since = ymdK(new Date(Date.now() + KST - 120 * 86400000));
  const { data } = await db.from("check_car").select("plate,car_name,dealer_text,comp_text,no,check_date")
    .eq("office_id", w.office.id).gte("check_date", since).limit(8000);
  return { ok: true, cars: (data ?? []).map((c) => ({
    차량번호: plateNorm(c.plate), 차명: S(c.car_name), 딜러: S(c.dealer_text),
    상사: S(c.comp_text), 성능번호: S(c.no), 검사일: S(c.check_date),
  })) };
}

/* ───────── 도착 등록 + 알림 보내기 ───────── */
async function deliv_arrive(_c: Ctx, pin: string, rec: any) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  rec = rec ?? {};
  const plate = plateNorm(rec.plate);
  if (!S(rec.dest)) throw new Error("목적지를 골라 주세요.");
  if (!S(rec.dealer) && !S(rec.tel).replace(/[^0-9]/g, "")) throw new Error("딜러 이름이나 연락처를 넣어 주세요.");

  /* 같은 차·같은 목적지를 방금 보냈는지 */
  const dupMin = 10;
  if (!rec.force && dupMin > 0) {
    const since = new Date(Date.now() - dupMin * 60000).toISOString();
    const q = db.from("check_deliv").select("arrived_at")
      .eq("office_id", w.office.id).eq("dest_name", S(rec.dest))
      .neq("state", "취소").gte("arrived_at", since);
    const { data: dup } = plate ? await q.eq("plate", plate) : await q.eq("dealer_name", S(rec.dealer));
    if (dup?.length) {
      return { ok: false, dup: true, at: fmtTs(new Date(new Date(dup[dup.length - 1].arrived_at).getTime() + KST)) };
    }
  }

  /* 목적지가 새 것이면 더합니다 */
  await db.from("check_deliv_dest").upsert(
    { office_id: w.office.id, name: S(rec.dest), kind: S(rec.destKind) },
    { onConflict: "office_id,name", ignoreDuplicates: true });

  /* 딜러 이어 붙이기 */
  const { data: dl } = S(rec.dealer)
    ? await db.from("check_dealer").select("id,tel").eq("office_id", w.office.id).eq("name", S(rec.dealer)).maybeSingle()
    : { data: null };

  const when = new Date();
  const vkey = viewKey();
  const row: any = {
    office_id: w.office.id, arrived_at: when.toISOString(),
    driver_id: w.driverId || null, driver_name: S(w.who || rec.driver),
    plate, plate_ocr: S(rec.plateOcr || (S(rec.plateHow) === "자동" ? plate : "")),
    car_name: S(rec.car), dealer_id: dl?.id ?? null, dealer_name: S(rec.dealer),
    company_name: S(rec.comp), tel: telFmt(rec.tel || dl?.tel),
    dest_name: S(rec.dest), gps: (rec.lat && rec.lng) ? (rec.lat + "," + rec.lng) : "",
    memo: S(rec.memo), state: "대기", how: S(conf.way) || "sms", view_key: vkey,
  };
  const { data: saved, error } = await db.from("check_deliv").insert(row).select().single();
  if (error) throw new Error(error.message);

  /* 사진 — 첫 장은 번호판용, 뒤 2장은 보관용 */
  if (rec.photo) { try { await photoPut(saved.id, rec.photo, 0); } catch (_) { /* 사진 실패는 알림을 막지 않습니다 */ } }
  const more = (rec.photos ?? []).slice(0, 2);
  for (let i = 0; i < more.length; i++) {
    if (!more[i]) continue;
    try { await photoPut(saved.id, more[i], i + 1); } catch (_) { /* 넘어갑니다 */ }
  }

  /* 보내기 — 첫 사진을 문자에 붙입니다 */
  const s = await notifyOne(w.office, conf, saved, vkey, S(rec.photo));
  await db.from("check_deliv").update({
    state: s.ok ? "보냄" : "못 보냄", how: s.how || row.how,
    err: s.why, sent_at: s.ok ? new Date().toISOString() : null,
  }).eq("id", saved.id);

  const { data: fin } = await db.from("check_deliv").select("*").eq("id", saved.id).maybeSingle();
  const { data: ph } = await db.from("check_deliv_photo").select("id,deliv_id,ord").eq("deliv_id", saved.id);
  await log({ office: w.office, who: w.who, role: "driver" } as Ctx, "차량 도착", { plate, dest: S(rec.dest), ok: s.ok });
  return { ok: true, row: rowOut(fin, ph ?? []) };
}

/* ───────── 목록 · 고치기 ───────── */
async function deliv_mylist(_c: Ctx, pin: string, from: string, to: string, driver?: string) {
  const w = await delivWho(pin);
  let rows = await rowsBetween(w.office.id, from, to);
  if (S(driver)) rows = rows.filter((r) => r.기사 === S(driver));
  return { ok: true, rows };
}
async function deliv_list(_c: Ctx, pin: string, from: string, to: string, trash?: boolean) {
  const w = await delivWho(pin);
  const rows = await rowsBetween(w.office.id, from, to, trash === true);
  const conf = await delivConf(w.office.id);
  const { data: dests } = await db.from("check_deliv_dest").select("*").eq("office_id", w.office.id).order("ord");
  const { count: trashN } = await db.from("check_deliv").select("id", { count: "exact", head: true })
    .eq("office_id", w.office.id).eq("trashed", true);
  const { count: dealerN } = await db.from("check_dealer").select("id", { count: "exact", head: true })
    .eq("office_id", w.office.id);
  const { count: carN } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", w.office.id);
  return { ok: true, rows, ver: VER, test: false, testTo: "", syncAt: "",
    dests: (dests ?? []).map((d) => ({ 목적지: S(d.name), 분류: S(d.kind), 사용: d.active ? "Y" : "N" })),
    dealerN: dealerN ?? 0, carN: carN ?? 0, trashN: trashN ?? 0, trashDays: 30, extraN: 0,
    conf: { way: S(conf.way), fallback: conf.fallback === true,
            photo_on: conf.photo_on !== false, from_tel: S(conf.from_tel) } };
}
async function deliv_one(_c: Ctx, pin: string, id: string) {
  const w = await delivWho(pin);
  const { data: r } = await db.from("check_deliv").select("*")
    .eq("office_id", w.office.id).eq("id", S(id)).maybeSingle();
  if (!r) throw new Error("그 배달을 찾지 못했습니다.");
  const { data: ph } = await db.from("check_deliv_photo").select("id,deliv_id,ord").eq("deliv_id", r.id);
  return { ok: true, row: rowOut(r, ph ?? []) };
}
const PATCH_MAP: Record<string, string> = {
  "딜러": "dealer_name", "상사": "company_name", "딜러연락처": "tel", "차량번호": "plate",
  "차명": "car_name", "목적지": "dest_name", "메모": "memo", "상태": "state",
};
async function deliv_update(_c: Ctx, pin: string, id: string, patch: any) {
  const w = await delivWho(pin);
  const up: Record<string, unknown> = {};
  for (const k of Object.keys(patch ?? {})) {
    const col = PATCH_MAP[k]; if (!col) continue;
    up[col] = k === "딜러연락처" ? telFmt(patch[k]) : (k === "차량번호" ? plateNorm(patch[k]) : S(patch[k]));
  }
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_deliv").update(up).eq("office_id", w.office.id).eq("id", S(id));
  if (error) throw new Error(error.message);
  return { ok: true };
}
async function deliv_cancel(_c: Ctx, pin: string, ids: string[], undo?: boolean) {
  const w = await delivWho(pin);
  const list = (ids ?? []).map(S).filter(Boolean);
  if (!list.length) return { ok: true, n: 0 };
  await db.from("check_deliv").update({ state: undo ? "보냄" : "취소" })
    .eq("office_id", w.office.id).in("id", list);
  return { ok: true, n: list.length };
}
async function deliv_trash(_c: Ctx, pin: string, ids: string[], undo?: boolean, who?: string) {
  const w = await delivWho(pin);
  const list = (ids ?? []).map(S).filter(Boolean);
  if (!list.length) return { ok: true, n: 0 };
  await db.from("check_deliv").update(undo
    ? { trashed: false, trashed_at: null, trashed_by: null }
    : { trashed: true, trashed_at: new Date().toISOString(), trashed_by: S(who || w.who) })
    .eq("office_id", w.office.id).in("id", list);
  return { ok: true, n: list.length };
}
async function deliv_resend(_c: Ctx, pin: string, ids: string[]) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  const out: any[] = [];
  for (const id of (ids ?? []).map(S).filter(Boolean)) {
    const { data: r } = await db.from("check_deliv").select("*")
      .eq("office_id", w.office.id).eq("id", id).maybeSingle();
    if (!r) { out.push({ id, ok: false, why: "없는 건" }); continue; }
    if (S(r.state) === "취소") { out.push({ id, ok: false, why: "취소된 건" }); continue; }
    const vkey = S(r.view_key) || viewKey();
    const ph = await photoB64(id);
    const s = await notifyOne(w.office, conf, r, vkey, ph);
    await db.from("check_deliv").update({
      state: s.ok ? "보냄" : "못 보냄", how: s.how || r.how, err: s.why, view_key: vkey,
      sent_at: s.ok ? new Date().toISOString() : r.sent_at,
    }).eq("id", id);
    out.push({ id, ok: s.ok, why: s.why });
  }
  return { ok: true, results: out };
}

/* ───────── v34: 딜러 등록 대기 (체크/기획/2026-10-17_딜러등록대기_설계.md · 보안 의견 ①~⑨) ─────────
   기사가 처음 적은 번호는 보안 M2 로 안 보냄(그대로). 사무실 대표가 보고 승인하면 딜러로 넣고 못 간 알림을 다시 보냄. */
const NOT_DEALER = "등록된 딜러 번호가 아님";
const DEALER_REJECTED = "딜러 등록 안 함(사무실)";
const PENDING_DAYS = 14, RESEND_HOURS = 24, APPROVE_MAX = 20;
/** 이 검사소 최근 14일 «등록 안 된 번호» 로 못 간 기록 — 지금은 등록된 번호면 뺌 */
async function pendingDeliv(officeId: string) {
  const since = new Date(Date.now() - PENDING_DAYS * 864e5).toISOString();
  const { data } = await db.from("check_deliv")
    .select("id,tel,dealer_name,company_name,driver_name,arrived_at,state,err,trashed")
    .eq("office_id", officeId).eq("err", NOT_DEALER).gte("arrived_at", since)
    .order("arrived_at", { ascending: false }).limit(2000);
  const rows = (data ?? []).filter((r: any) => r.trashed !== true && S(r.state) !== "취소" && S(r.state) !== "보냄");
  const okTel = new Map<string, boolean>();
  const out: any[] = [];
  for (const r of rows) {
    const t = onlyDigits(r.tel);
    if (!/^01\d{8,9}$/.test(t)) continue;
    if (!okTel.has(t)) okTel.set(t, await dealerTelOk(officeId, t));
    if (!okTel.get(t)) out.push(r);
  }
  return out;
}
/** 대기 목록 — 대표만 · 번호로 묶음(같은 번호를 여러 이름으로 적어도 한 줄) */
async function delivPendingDealers(ctx: Ctx) {
  bossOnly(ctx);
  const rows = await pendingDeliv(S(ctx.office.id));
  const by = new Map<string, any>();
  for (const r of rows) {
    const t = onlyDigits(r.tel);
    const g = by.get(t) ?? { tel: telFmt(t), names: [] as string[], companies: [] as string[], drivers: [] as string[], n: 0, first: S(r.arrived_at), last: S(r.arrived_at) };
    const add = (arr: string[], v: unknown) => { const s = S(v).trim(); if (s && !arr.includes(s) && arr.length < 10) arr.push(s); };
    add(g.names, r.dealer_name); add(g.companies, r.company_name); add(g.drivers, r.driver_name);
    g.n++;
    if (S(r.arrived_at) < g.first) g.first = S(r.arrived_at);
    if (S(r.arrived_at) > g.last) g.last = S(r.arrived_at);
    by.set(t, g);
  }
  const list = [...by.values()];
  /* 이미 같은 이름의 딜러가 있으면 «기존 딜러에 번호 더하기» 를 먼저 보여 줄 수 있게 */
  const names = [...new Set(list.flatMap((g) => g.names))];
  const same = new Map<string, any[]>();
  if (names.length) {
    const { data: ds } = await db.from("check_dealer").select("id,name").eq("office_id", ctx.office.id).in("name", names.slice(0, 500));
    for (const d of ds ?? []) { const k = S(d.name); same.set(k, (same.get(k) ?? []).concat([{ id: d.id, name: k }])); }
  }
  list.forEach((g) => { g.match = g.names.flatMap((nm: string) => same.get(nm) ?? []); });
  list.sort((x, y) => (y.last > x.last ? 1 : -1));
  return { ok: true, list, days: PENDING_DAYS };
}
/** 승인 — 대표만 · 한 번에 20줄 · 이름+번호가 대기 기록에 실제로 있어야 함(⑥) · 다시 보내기는 그 번호 · 24시간 기록만(②) */
async function delivApproveDealer(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const items = (Array.isArray(opt) ? opt : [opt]).filter(Boolean);
  if (!items.length) throw new Error("승인할 딜러를 골라 주세요.");
  if (items.length > APPROVE_MAX) throw new Error("한 번에 " + APPROVE_MAX + "줄까지 승인할 수 있습니다.");
  const office = ctx.office;
  const pend = await pendingDeliv(S(office.id));
  const conf = await delivConf(S(office.id));
  const results: any[] = [];
  for (const it of items) {
    const tel = phoneNorm(it?.tel);
    const name = S(it?.name).trim().slice(0, 40);
    const mine = pend.filter((r: any) => onlyDigits(r.tel) === tel);
    if (!mine.length || !mine.some((r: any) => S(r.dealer_name).trim() === name)) {
      results.push({ tel: phoneMask(tel), ok: false, why: "대기 목록에 없는 이름·번호" }); continue;
    }
    /* 딜러에 번호 넣기 — 기존 딜러(이 검사소) 또는 새 딜러 */
    let dealerId = "";
    if (S(it?.dealerId)) {
      const { data: d } = await db.from("check_dealer").select("id,tel,tels").eq("office_id", office.id).eq("id", S(it.dealerId)).maybeSingle();
      if (!d) { results.push({ tel: phoneMask(tel), ok: false, why: "그 딜러를 찾지 못함" }); continue; }
      dealerId = S(d.id);
      if (!onlyDigits(d.tel)) await db.from("check_dealer").update({ tel: telFmt(tel) }).eq("id", d.id).eq("office_id", office.id);
      else if (onlyDigits(d.tel) !== tel) {
        const tels = (Array.isArray(d.tels) ? d.tels : []).slice(0, 20);
        if (!tels.some((t: any) => onlyDigits(t?.tel ?? t) === tel)) tels.push({ tel: telFmt(tel) });
        await db.from("check_dealer").update({ tels }).eq("id", d.id).eq("office_id", office.id);
      }
    } else {
      let companyId: string | null = null;
      if (S(it?.companyId)) {
        const { data: c } = await db.from("check_company").select("id").eq("office_id", office.id).eq("id", S(it.companyId)).maybeSingle();
        companyId = c ? S(c.id) : null;
      }
      const { data: nd, error } = await db.from("check_dealer").insert({ office_id: office.id, name, tel: telFmt(tel), tels: [],
        company_id: companyId, issuer_kind: "company", tax_issue: true, memo: "배달 기사가 처음 적은 번호 · 사무실 승인" }).select("id").single();
      if (error || !nd) { results.push({ tel: phoneMask(tel), ok: false, why: "딜러를 넣지 못함" }); continue; }
      dealerId = S(nd.id);
    }
    const ids = mine.map((r: any) => S(r.id));
    await db.from("check_deliv").update({ dealer_id: dealerId }).eq("office_id", office.id).in("id", ids);
    /* 다시 보내기 — 서버가 저장된 기록으로 글을 다시 만듦(⑦ · notifyOne 안에서 cleanVars). 이미 «보냄» 은 건너뜀(③) */
    let sent = 0, failed = 0;
    if (it?.resend !== false) {
      const since = Date.now() - RESEND_HOURS * 3600e3;
      for (const r0 of mine.filter((r: any) => new Date(S(r.arrived_at)).getTime() >= since)) {
        const { data: r } = await db.from("check_deliv").select("*").eq("office_id", office.id).eq("id", r0.id).maybeSingle();
        if (!r || S(r.state) === "보냄" || S(r.state) === "취소" || r.trashed === true) continue;
        /* 보안 낮음(a5e1b14): 승인을 동시에 두 번 눌러도 한 번만 — 조건부로 먼저 잡고 잡힌 것만 보냄 */
        const { data: got } = await db.from("check_deliv").update({ state: "보내는 중" })
          .eq("office_id", office.id).eq("id", r.id).neq("state", "보냄").neq("state", "취소").neq("state", "보내는 중").select("id");
        if (!got || !got.length) continue;
        const vkey = S(r.view_key) || viewKey();
        /* 사진 읽기·보내기에서 오류가 나도 «보내는 중» 에 남지 않게 «못 보냄» 으로 (보안 참고 ②) */
        const s = await (async () => notifyOne(office, conf, r, vkey, await photoB64(S(r.id))))()
          .catch((e) => ({ ok: false, why: e instanceof Error ? e.message : String(e), how: "" }));
        await db.from("check_deliv").update({
          state: s.ok ? "보냄" : "못 보냄", how: s.how || r.how, err: s.why, view_key: vkey,
          sent_at: s.ok ? new Date().toISOString() : r.sent_at,
        }).eq("id", r.id);
        if (s.ok) sent++; else failed++;
      }
    }
    await log(ctx, "딜러 등록 승인", { tel: phoneMask(tel), name, dealerId, records: ids.length, sent, failed });   // ④ 감사 기록
    results.push({ tel: phoneMask(tel), ok: true, dealerId, sent, failed });
  }
  return { ok: true, results };
}
/** 등록 안 함 — 대표만 · 기록은 그대로 두고 대기에서만 뺌 */
async function delivRejectDealer(ctx: Ctx, opt: any) {
  bossOnly(ctx);
  const items = (Array.isArray(opt) ? opt : [opt]).filter(Boolean);
  if (!items.length) throw new Error("뺄 줄을 골라 주세요.");
  if (items.length > APPROVE_MAX) throw new Error("한 번에 " + APPROVE_MAX + "줄까지 뺄 수 있습니다.");
  const pend = await pendingDeliv(S(ctx.office.id));
  let n = 0;
  for (const it of items) {
    const tel = phoneNorm(it?.tel);
    const ids = pend.filter((r: any) => onlyDigits(r.tel) === tel).map((r: any) => S(r.id));
    if (!ids.length) continue;
    await db.from("check_deliv").update({ err: DEALER_REJECTED }).eq("office_id", ctx.office.id).in("id", ids);
    await log(ctx, "딜러 등록 안 함", { tel: phoneMask(tel), records: ids.length });
    n += ids.length;
  }
  return { ok: true, n };
}

/* ───────── 목적지 · 설정 · 기사 계정 ───────── */
async function deliv_addDest(_c: Ctx, pin: string, name: string, kind?: string) {
  const w = await delivWho(pin);
  if (!S(name)) throw new Error("목적지 이름을 넣어 주세요.");
  const { data: max } = await db.from("check_deliv_dest").select("ord")
    .eq("office_id", w.office.id).order("ord", { ascending: false }).limit(1);
  await db.from("check_deliv_dest").upsert({
    office_id: w.office.id, name: S(name), kind: S(kind), ord: (N(max?.[0]?.ord) || 0) + 1, active: true,
  }, { onConflict: "office_id,name" });
  return { ok: true };
}
async function deliv_editDest(_c: Ctx, pin: string, oldName: string, patch: any) {
  const w = await delivWho(pin);
  const up: Record<string, unknown> = {};
  if (patch?.목적지 !== undefined) up.name = S(patch.목적지);
  if (patch?.분류 !== undefined) up.kind = S(patch.분류);
  if (patch?.사용 !== undefined) up.active = S(patch.사용) !== "N";
  if (patch?.주소 !== undefined) up.addr = S(patch.주소);
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_deliv_dest").update(up)
    .eq("office_id", w.office.id).eq("name", S(oldName));
  if (error) throw new Error(error.message);
  if (up.name && S(up.name) !== S(oldName)) {
    await db.from("check_deliv").update({ dest_name: S(up.name) })
      .eq("office_id", w.office.id).eq("dest_name", S(oldName));
  }
  return { ok: true };
}
async function deliv_conf(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  const c = await delivConf(w.office.id);
  return { ok: true, conf: {
    way: S(c.way) || "sms", fallback: c.fallback === true,
    sms_text: S(c.sms_text), ata_tpl: S(c.ata_tpl), from_tel: S(c.from_tel),
    ai_on: c.ai_on !== false, ai_max_day: N(c.ai_max_day) || 400,
    photo_on: c.photo_on !== false,
    ai_ready: !!Deno.env.get("ANTHROPIC_KEY"), sms_ready: !!Deno.env.get("SOLAPI_KEY"),
  } };
}
async function deliv_saveConf(_c: Ctx, pin: string, patch: any) {
  const w = await delivWho(pin, "office");
  if (w.role !== "owner") throw new Error("배달 알림 설정은 대표님만 바꿀 수 있습니다.");   // v32(보안 M2·M3)
  /* v32(보안 M2): 알림톡 채널(ata_pf)은 본사 채널만 써서 받지 않음 · 보내는 번호는 이 검사소 번호만 */
  const ok = ["way", "fallback", "sms_text", "ata_tpl", "from_tel",
              "ai_on", "ai_max_day", "photo_on"];
  const up: Record<string, unknown> = { office_id: w.office.id, updated_at: new Date().toISOString() };
  for (const k of ok) if (patch?.[k] !== undefined) up[k] = patch[k];
  if (up.from_tel !== undefined && S(up.from_tel) && !officeFroms(w.office).includes(onlyDigits(up.from_tel)))
    throw new Error("보내는 번호는 검사소에 등록된 번호(문자 발신번호·대표 전화)만 쓸 수 있습니다.");
  if (up.ata_tpl !== undefined && S(up.ata_tpl) && !Object.values((await hqAta()).tpl).includes(S(up.ata_tpl)))
    throw new Error("알림톡 템플릿은 차곳간에 등록된 것만 고를 수 있습니다.");
  if (up.ai_max_day !== undefined) up.ai_max_day = Math.max(0, Math.min(1000, N(up.ai_max_day) || 0));
  const { error } = await db.from("check_deliv_conf").upsert(up, { onConflict: "office_id" });
  if (error) throw new Error(error.message);
  return { ok: true };
}
async function deliv_accounts(_c: Ctx, pin: string) {
  const w = await delivWho(pin, "office");
  const { data } = await db.from("check_deliv_driver").select("id,name,tel,active,last_in,pw_hash")
    .eq("office_id", w.office.id).order("name");
  /* v23: 기사가 스스로 가입한 계정(승인 대기)은 「가입신청: Y」 — 승인 전에 그 기사에게 직접 물어보세요.
     표가 아직 없으면 표시만 빠지고 목록은 그대로 보여 줍니다 */
  const { data: sign } = await db.from("check_deliv_signup").select("name").eq("office_id", w.office.id);
  const asked = new Set((sign ?? []).map((r: any) => S(r.name)));
  return { ok: true, rows: (data ?? []).map((d) => ({
    이름: S(d.name), 연락처: telFmt(d.tel), 사용: d.active ? "Y" : "N",
    마지막: d.last_in ? fmtTs(new Date(new Date(d.last_in).getTime() + KST)) : "",
    비밀번호: S(d.pw_hash) ? "정해짐" : "초기화됨(새로 정해야 함)",
    가입신청: !d.active && asked.has(S(d.name)) ? "Y" : "",
  })) };
}
/** v23: 「가입 신청」 표시 지우기 (사무실이 승인 · 비밀번호 초기화 · 새로 등록했을 때). 실패해도 막지 않음 */
async function signupClear(officeId: string, name: string) {
  await db.from("check_deliv_signup").delete().eq("office_id", officeId).eq("name", S(name));
}
async function deliv_accountAdd(_c: Ctx, pin: string, name: string, pw: string, tel?: string) {
  const w = await delivWho(pin, "office");
  if (w.role !== "owner") throw new Error("기사 계정은 대표님만 만들 수 있습니다.");          // v32(보안 M3)
  if (!S(name)) throw new Error("이름을 넣어 주세요.");
  if (S(pw)) drvPwCheck(S(pw));   // v23: 비밀번호를 넣을 때만 6자 이상 (비우면 기사가 처음 가입할 때 정함)
  const h = S(pw) ? await pwHash(S(pw)) : null;
  const { error } = await db.from("check_deliv_driver").upsert({
    office_id: w.office.id, name: S(name), tel: telFmt(tel), pw_hash: h, active: true,
    token: null,                                             // v32(보안 L3): 비밀번호를 새로 정하면 예전 로그인은 끊김
  }, { onConflict: "office_id,name" });
  if (error) throw new Error(error.message);
  await signupClear(w.office.id, S(name));   // 사무실이 직접 등록 → 가입 신청 아님
  return { ok: true };
}
async function deliv_accountEdit(_c: Ctx, pin: string, oldName: string, patch: any) {
  const w = await delivWho(pin, "office");
  if (w.role !== "owner") throw new Error("기사 계정은 대표님만 고칠 수 있습니다.");          // v32(보안 M3)
  const up: Record<string, unknown> = {};
  if (patch?.이름 !== undefined) up.name = S(patch.이름);
  if (patch?.연락처 !== undefined) up.tel = telFmt(patch.연락처);
  if (patch?.사용 !== undefined) up.active = S(patch.사용) !== "N";
  if (patch?.비밀번호초기화) { up.pw_hash = null; up.token = null; }
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_deliv_driver").update(up)
    .eq("office_id", w.office.id).eq("name", S(oldName));
  if (error) throw new Error(error.message);
  /* v23: [사용]으로 승인했거나 비밀번호를 초기화하면 「가입 신청」 표시를 지우고, 이름을 바꾸면 표시도 따라 바꿉니다 */
  if (up.active === true || up.pw_hash === null) await signupClear(w.office.id, S(oldName));
  else if (up.name !== undefined && up.name !== S(oldName))
    await db.from("check_deliv_signup").update({ name: up.name })
      .eq("office_id", w.office.id).eq("name", S(oldName));
  return { ok: true };
}
/** 비어 있는 차명을 차량 장부에서 채웁니다 */
async function deliv_fillBlanks(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  const { data: rows } = await db.from("check_deliv").select("id,plate,car_name,dealer_name")
    .eq("office_id", w.office.id).or("car_name.is.null,car_name.eq.").limit(500);
  if (!rows?.length) return { ok: true, n: 0 };
  const plates = [...new Set(rows.map((r) => S(r.plate)).filter(Boolean))];
  if (!plates.length) return { ok: true, n: 0 };
  const { data: cars } = await db.from("check_car").select("plate,car_name,dealer_text")
    .eq("office_id", w.office.id).in("plate", plates);
  const byPlate = new Map((cars ?? []).map((c) => [plateNorm(c.plate), c]));
  let n = 0;
  for (const r of rows) {
    const c = byPlate.get(plateNorm(r.plate)); if (!c) continue;
    await db.from("check_deliv").update({
      car_name: S(c.car_name),
      dealer_name: S(r.dealer_name) || S(c.dealer_text),
    }).eq("id", r.id);
    n++;
  }
  return { ok: true, n };
}
/** 알림톡·문자 버튼이 여는 사진 화면 — 로그인 없이 열쇠글로만 봅니다 */
async function deliv_view(c: Ctx, key: string) {
  let k = S(key).replace(/[^A-Za-z0-9_-]/g, "");
  if (k.length === 19 && k[0] === "d") k = k.slice(1);   // v34: 출고안내 알림톡 버튼(v.html?c=d…)
  if (k.length < 8) throw new Error("주소가 올바르지 않습니다.");
  if (!(await viewIpOk(c, "deliv"))) throw new Error("잠시 뒤 다시 열어 주세요.");
  const { data: r } = await db.from("check_deliv").select("*").eq("view_key", k).maybeSingle();
  if (!r) throw new Error("찾지 못했습니다. 주소를 다시 확인해 주세요.");
  const { data: ph } = await db.from("check_deliv_photo").select("id,path,ord").eq("deliv_id", r.id).order("ord");
  const urls: string[] = [];
  for (const p of ph ?? []) {
    const { data: sg } = await db.storage.from(DELIV_BUCKET).createSignedUrl(p.path, 3600);
    if (sg?.signedUrl) urls.push(sg.signedUrl);
  }
  const { data: off } = await db.from("check_office").select("name,tel").eq("id", r.office_id).maybeSingle();
  await db.from("check_deliv").update({ view_at: new Date().toISOString(), view_n: N(r.view_n) + 1 }).eq("id", r.id);
  return {
    office: off ?? {}, photos: urls,
    deliv: {
      plate: S(r.plate), car: S(r.car_name), dest: S(r.dest_name), driver: S(r.driver_name),
      dealer: S(r.dealer_name), at: fmtTs(new Date(new Date(r.arrived_at).getTime() + KST)),
    },
  };
}
async function deliv_ping(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  return { ok: true, ver: VER, me: w.who, company: S(w.office.name) };
}

/* ============================================================
   들어오는 문 — { shop, token, fn, args }
   ============================================================ */
const OPEN = new Set(["ping", "login", "loginCode", "invoiceView", "remindView", "remindCron",
  /* 배달 — 기사 폰은 자기 열쇠(T1.…)를 args 로 보냅니다 */
  "deliv_login", "deliv_signup", "deliv_changePw", "deliv_boot", "deliv_cars",
  "deliv_readPlate", "deliv_arrive", "deliv_mylist", "deliv_one", "deliv_resend",
  "deliv_cancel", "deliv_trash", "deliv_update", "deliv_photo", "deliv_addDest",
  "deliv_editDest", "deliv_list", "deliv_conf", "deliv_saveConf", "deliv_accounts",
  "deliv_accountAdd", "deliv_accountEdit", "deliv_fillBlanks", "deliv_ping", "deliv_view"]);
const FN: Record<string, (ctx: Ctx, ...a: any[]) => Promise<unknown>> = {
  // 거래처 · 청구처
  dealers, dealerSave, partnerCaps: (c) => partnerCaps(c),   // v36
  // v34(운영/06 N · 체크 v44): 거래처 넣기·지우기
  dealerDel: (c, o) => dealerDel(c, o), companies: (c) => companies(c),
  partnerImport: (c, o) => partnerImport(c, o),   // v49: 상사명부·딜러명부 한꺼번에
  companySave: (c, o) => companySave(c, o), companyDel: (c, o) => companyDel(c, o),
  billGroupSet: (c, ids, to, scope, ym) => billGroupSet(c, ids, to, scope, ym),
  billGroupHints,
  // 청구서
  invoiceBuild: (c, ym, opt) => invoiceBuild(c, ym, opt),
  invoiceList: (c, ym, auto) => invoiceList(c, ym, auto),
  billState: (c, ym) => billState(c, ym),
  salesStat: (c, opt) => salesStat(c, opt),
  invoiceRows: (c, id) => invoiceRows(c, id),
  // v40: 단가 구간 (체크 v48)
  priceList: (c) => priceList(c), priceSave: (c, o) => priceSave(c, o), priceDel: (c, o) => priceDel(c, o),
  carFeeSet: (c, o) => carFeeSet(c, o),   // v44: 수출 가성능 손 입력 (대표만)
  // v45: 체크 v50 단추
  invoiceDel: (c, o) => invoiceDel(c, o), invoiceUnsend: (c, o) => invoiceUnsend(c, o),
  tplInfo: (c) => tplInfo(c), tplSave: (c) => tplSave(c),
  feeRules: (c, o) => feeRules(c, o), smsConf: (c, o) => smsConf(c, o),
  invoiceMove: (c, ym, ids, to, scope) => invoiceMove(c, ym, ids, to, scope),
  invoiceView: (c, key) => invoiceView(c, key),
  invoiceRekey: (c, id) => invoiceRekey(c, id),
  // v33: 청구서 보내기 · 재검사 알림
  billSend: (c, a0, a1, a2) => billSend(c, a0, a1, a2),
  billBundleList: (c, o) => billBundleList(c, o), billBundleSend: (c, o) => billBundleSend(c, o),   // v51: 밀린 달 한꺼번에
  sendLogList: (c, o) => sendLogList(c, o),   // v52: 설정 › 알림 «보낸 기록»
  remindRule: (c) => remindRule(c),
  remindRuleSave: (c, opt) => remindRuleSave(c, opt),
  remindList: (c, range) => remindList(c, range),
  remindSend: (c, a0, a1) => remindSend(c, a0, a1),
  remindOff: (c, a0, a1) => remindOff(c, a0, a1),
  remindView: (c, key) => remindView(c, key),
  remindCron: (c, key) => remindCron(c, key),
  depositList: (c, opt) => depositList(c, opt),
  // v38: 입금 처리 (체크 v47)
  depositApply: (c, o) => depositApply(c, o), depositUnapply: (c, o) => depositUnapply(c, o),
  depositKind: (c, o) => depositKind(c, o), depositDel: (c, o) => depositDel(c, o),
  depositRestore: (c, o) => depositRestore(c, o), depositTrash: (c) => depositTrash(c),
  depositImport: (c, o) => depositImport(c, o),
  // 로그인
  login: (c, ph, pw, code, ua) => login(c, ph, pw, code, ua),
  loginCode: (c, ph, cd, tk, code, ua) => loginCode(c, ph, cd, tk, code, ua),
  logout: (c, key) => logout(c, key),
  // 검사소 설정
  officeGet, officeSave: (c, body) => officeSave(c, body),
  // v25 직원 권한 (대표만)
  staffList,
  staffAdd: (c, n, p, r) => staffAdd(c, n, p, r),
  staffEdit: (c, id, patch) => staffEdit(c, id, patch),
  dataCount,
  /* ── 사진 읽기 (Claude) — 워시와 같은 통로 ── */
  aiReady: () => Promise.resolve(!!env("ANTHROPIC_KEY")),
  /* v24: 검사소를 모르면 거절 (가온 한도로 대신 세지 않음) */
  /* v35: 아무 글이나 시키는 창구는 대표만 · 사진 읽기 한도와 함께 셈 (직원이 aiCard 대신 이걸로 돌아가지 못하게) */
  aiJson: async (c, prompt, b64) => {
    bossOnly(c);
    if (S(b64).length > 6_000_000) throw new Error("사진이 너무 큽니다. 조금 작게 찍어 주세요.");   // 보안 낮음(6daa65b)
    if (!await rateOk("aidoc:" + aiShop(c) + ":" + ymdK(kstNow()), Number(env("CHECK_AI_DOC_DAY", "60"))))
      throw new Error("오늘 사진으로 채우기 한도를 다 썼습니다. 직접 적어 주세요.");
    return await aiJson(aiShop(c), S(prompt).slice(0, 2000), S(b64), 1500);
  },
  aiPlate: (c, b64) => aiJson(aiShop(c), PLATE_PROMPT, S(b64)),
  aiCard: (c, b64) => aiDoc(c, "card", S(b64)),     // v35(요청서 C): 대표만 · 한도 따로 · 칸 거르기
  aiBiz: (c, b64) => aiDoc(c, "biz", S(b64)),
  bizVerify: (c, o) => bizVerify(c, o),             // v37: 국세청 사업자 상태·진위 (대표만)
  /* ── 차량 배달 알림 (모듈 2) ── */
  deliv_login: (c, n, p, oc) => deliv_login(c, n, p, oc),
  deliv_signup: (c, k, n, p) => deliv_signup(c, k, n, p),
  deliv_changePw: (c, t, o, n) => deliv_changePw(c, t, o, n),
  deliv_boot: (c, pin, dr) => deliv_boot(c, pin, dr),
  deliv_cars: (c, pin) => deliv_cars(c, pin),
  deliv_readPlate: (c, pin, b) => deliv_readPlate(c, pin, b),
  deliv_arrive: (c, pin, rec) => deliv_arrive(c, pin, rec),
  deliv_mylist: (c, pin, f, t, d) => deliv_mylist(c, pin, f, t, d),
  deliv_one: (c, pin, id) => deliv_one(c, pin, id),
  deliv_resend: (c, pin, ids) => deliv_resend(c, pin, ids),
  deliv_cancel: (c, pin, ids, u) => deliv_cancel(c, pin, ids, u),
  deliv_trash: (c, pin, ids, u, w) => deliv_trash(c, pin, ids, u, w),
  deliv_update: (c, pin, id, p) => deliv_update(c, pin, id, p),
  deliv_photo: (c, pin, id) => deliv_photo(c, pin, id),
  deliv_addDest: (c, pin, n, k) => deliv_addDest(c, pin, n, k),
  deliv_editDest: (c, pin, o, p) => deliv_editDest(c, pin, o, p),
  deliv_list: (c, pin, f, t, tr) => deliv_list(c, pin, f, t, tr),
  deliv_conf: (c, pin) => deliv_conf(c, pin),
  deliv_saveConf: (c, pin, p) => deliv_saveConf(c, pin, p),
  deliv_accounts: (c, pin) => deliv_accounts(c, pin),
  deliv_accountAdd: (c, pin, n, p, t) => deliv_accountAdd(c, pin, n, p, t),
  deliv_accountEdit: (c, pin, o, p) => deliv_accountEdit(c, pin, o, p),
  deliv_fillBlanks: (c, pin) => deliv_fillBlanks(c, pin),
  deliv_ping: (c, pin) => deliv_ping(c, pin),
  deliv_view: (c, k) => deliv_view(c, k),
  // v34: 딜러 등록 대기 (사무실 대표)
  delivPendingDealers: (c) => delivPendingDealers(c),
  delivApproveDealer: (c, o) => delivApproveDealer(c, o),
  delivRejectDealer: (c, o) => delivRejectDealer(c, o),
  // 입금 (팝빌)
  bankPull: (c, opt) => bankPull(c, opt),
  depositMatch,
  // 팝빌 연동 · 계좌
  popInfo,
  popBanks,
  popMember: (c, corp) => popMember(c, corp),
  popIdCheck: (c, id) => popIdCheck(c, id),
  popJoin: (c, form) => popJoin(c, form),
  popLogin: (c, togo) => popLogin(c, togo),
  bankList,
  bankSave: (c, row) => bankSave(c, row),
  bankDel: (c, id) => bankDel(c, id),
  // 세금계산서 (팝빌 정발행)
  taxList: (c, ym) => taxList(c, ym),
  taxIssue: (c, ids, wd, dates) => taxIssue(c, ids, wd, dates),   // v47: 입금 전 예외 없음
  taxState: (c, ym) => taxState(c, ym),
  taxPopup: (c, id) => taxPopup(c, id),
  taxSkip: (c, id, off) => taxSkip(c, id, off),
  taxSite: (c, togo) => taxSite(c, togo),
  // 자료 옮기기 · 엑셀 올리기
  importLegacy: (c, part, rows) => importLegacy(c, part, rows),
  excelPut: (c, kind, rows, ym, meta) => excelPut(c, kind, rows, ym, meta),
  uploadList,
  insMatch: (c, ym) => insMatch(c, ym),
  insList: (c, ym) => insList(c, ym),
  carHealth: (c, ym) => carHealth(c, ym),
  relink,
  dealerAddMissing: (c, ym) => dealerAddMissing(c, ym),
  // 지금 누구로 들어와 있는지 (화면 첫 줄에 쓰는 값)
  me: async (c: Ctx) => ({ office: { id: c.office.id, code: c.office.code, name: c.office.name },
    who: c.who, role: c.role, ver: VER }),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...JSON_HEAD, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" } });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const fn = S(body.fn);
    if (!fn || fn === "ping") return ok({ ok: true, ver: VER });
    const f = FN[fn];
    if (!f) return err("지원하지 않는 기능입니다. 화면을 새로 고쳐 주세요.");
    const ctx = OPEN.has(fn) ? ({ office: null, who: "", role: "", ip: ipOfReq(req) } as Ctx)
                             : await whoIs(S(body.shop), S(body.token));
    const out = await f(ctx, ...(Array.isArray(body.args) ? body.args : []));
    return ok(out);
  } catch (e) {
    if (e instanceof NeedCode)   // v26: 화면이 확인 번호 칸을 열 수 있게
      return new Response(JSON.stringify({ __err: e.message, __need: e.need, __tick: e.tick }), { headers: JSON_HEAD });
    if (e instanceof Error && (e as any).need === "pwchange")   // v30: 기사 임시 비밀번호 → 비밀번호 바꾸기 화면
      return new Response(JSON.stringify({ __err: e.message, __need: "pwchange" }), { headers: JSON_HEAD });
    return err(userMsg(e instanceof Error ? e.message : String(e)));   // v31: 영어·코드·원문 숨김
  }
});
