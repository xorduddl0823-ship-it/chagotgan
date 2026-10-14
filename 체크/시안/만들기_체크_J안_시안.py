"""J안 4판(디자인 서랍)에서 체크 J안 시안을 만든다. 원본은 읽기만 한다.
쓰는 법: python3 만들기_체크_J안_시안.py 체크/시안/체크_J안_시안.html
지금 쓰는 체크 화면(체크/2_차곳간_체크_index.html)은 건드리지 않는다 (다음 주 시험은 지금 화면으로)."""
import sys
SRC = "/home/user/chagotgan/디자인/차곳간_공통_E안_클로드코드_전달파일/08_차곳간_합친디자인_J.html"
OUT = sys.argv[1]
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) < 1:
        raise SystemExit("못 찾음: " + old[:80])
    s = s.replace(old, new, count)

# 1) 제목
rep("<title>차곳간 합친 디자인 J</title>", "<title>체크 J안 시안</title>")

# 2) 제품 등록부: 워시 · 관리는 빼고 체크 한 덩어리만 (체크 서랍 시안이라 체크만)
i = s.index("var PR = {\n") + len("var PR = {\n")
j = s.index("\n};\nvar PK=", i)
CHECK = r'''check:{ label:"체크", desc:"성능점검 정산", sub:"성능점검 정산 · 체크 v21 · UI 3.0", biz:["새빛 성능검사소","123-45-67890 · 대표 김하늘"], me:["김","김 대표"], hello:"김 대표님",
  field:false, find:"청구처 · 차량번호 · 메뉴 찾기",
  /* 메뉴 차례 = 지금 체크 JOBS 차례 그대로 (기준틀 v1.1 PRODUCTS.check). 「정산 기록」은 이름 · 자리(3번째) 그대로.
     설정 안 「휴지통」은 빼고 사람 버튼 ▾ 안으로 (대표님 「나」안) */
  menu:[["홈",[["홈","home"]],"home"],["매출",[["매출"]],"chart"],["정산 기록",[["정산 기록","work"]],"today"],
        ["청구서",[["월별 청구서","bill"],["청구처 묶음"],["알림톡 템플릿"]],"file"],["입출금",[["입금 내역"],["보험료 대조"]],"wallet"],
        ["세금계산서",[["세금계산서"]],"receipt"],["알림",[["재검사 알림"],["차량 배달 알림"]],"bell"],
        ["설정",[["자료 올리기","files"],["단가표"],["거래처"],["팝빌 연동"],["검사자 수수료"],["문자 자동수집","sms"],["알람 소리"],["설정 백업"],["도움말"]],"gear"]],
  rows:[["하늘모터스","211-81-30415","10월 · 68대","10월 청구서","10.31",2167000,"완료"],
        ["푸른카","215-27-20186","10월 · 41대","10월 청구서","10.31",1435000,"완료"],
        ["두리자동차","사업자번호 없음","10월 · 22대","10월 청구서","10.31",770000,"보류"],
        ["바른오토","118-81-29312","10월 · 35대","10월 청구서","10.31",1225000,"진행 중"],
        ["우리상사","220-86-11043","10월 · 18대","10월 청구서","10.31",630000,"확인 필요"],
        ["다온모터스","312-05-77810","10월 · 9대","10월 청구서","10.31",315000,"완료"],
        ["한길카","405-88-20917","10월 · 27대","10월 청구서","10.31",945000,"진행 중"],
        ["미소자동차","사업자번호 없음","10월 · 12대","10월 청구서","10.31",420000,"보류"],
        ["새날모터스","617-23-45102","10월 · 15대","10월 청구서","10.31",525000,"완료"],
        ["별빛광택","129-44-80215","10월 · 6대","10월 청구서","10.31",210000,"확인 필요"],
        ["하늘모터스","211-81-30415","9월 · 71대","9월 청구서","09.30",2272000,"완료"],
        ["푸른카","215-27-20186","9월 · 38대","9월 청구서","09.30",1330000,"완료"]],
  cols:["청구처","사업자번호","청구 달 · 대수","청구서","만든 날","합계","세금계산서"], kinds:["name","id","text","text","date","money","state"],
  nums:[["이번 달 청구서","42","장","+3","",[35,37,38,40,39,41,42],"#1668C4"],["세금계산서 나감","36","장","+2","",[30,31,33,34,33,35,36],"#1E9E5A"],
        ["확인 필요","4","장","+1","dn",[2,3,2,3,3,4,4],"#E08A00"],["이번 달 청구 금액","6,310,000","원","+7%","",[4.9,5.2,5.5,5.8,5.9,6.1,6.31],"#0B2545"]],
  home:{ jobs:[["성능점검","124건",4340000],["재검사","31건",930000],["튜닝","12건",680000],["기타","7건",360000]],
         days:{7:["점검 11대",""],13:["점검 14대","정산 마감"],15:["재검사 5대",""],21:["점검 9대",""],28:["청구서 발송",""]} },
  tabbar:[[0,"home","홈"],[2,"today","정산 기록"],[3,"file","청구서"],[4,"wallet","입출금"],[7,"more","전체"]],
  acts:[["stop","receipt","세금계산서 안 나간 청구서 6장","사업자번호 없는 곳 2곳 · 두리자동차 외"],["chk","wallet","보험료 안 맞는 건 4건","입출금 › 보험료 대조에서 확인"],["run","bell","재검사 안내 보낼 차 6대","유효기간 120일이 곧 끝나요"]],
  work:{ crumb:"정산 기록", h1:'이번 달 청구서 <em>42장</em> 중 세금계산서 확인이 필요한 곳이 <em>6곳</em> 있어요',
    desc:"청구서를 만들 때마다 그 달의 발행 목록이 여기에 쌓여요. 세금계산서가 실제로 나갔는지 건별로 확인할 수 있어요.",
    sel:"선택한 청구서 다시 확인", add:"홈택스 발급내역 올리기", filters:["청구 달: 10월 ✕","＋ 청구처","＋ 합계","＋ 세금계산서"],
    mline:function(x){ return x[2]+' · 만든 날 '+x[4]; }, sorts:[[4,-1,"최근 만든 순"],[0,1,"청구처순"],[5,-1,"합계 높은순"],[6,1,"상태순"]],
    help:"청구서를 만들면 여기에 저절로 쌓여요. «세금계산서» 칸이 «확인 필요»나 «보류»인 줄은 이름을 눌러 왜 안 나갔는지 확인해요. 홈택스에서 받은 발급내역 엑셀을 올리면 사업자번호와 공급가액을 맞춰 나간 건을 자동으로 표시해요.",
    ask:["세금계산서를 다시 확인할까요?","청구처","청구서","장","합계 금액","다시 확인"] },
  homeH:{ h1:'보험료 안 맞는 건 <em>4건</em>, 받을 금액 <em>1,980,000원</em>이 남아 있어요', add:"자료 올리기",
    cashT:"이번 달 입금", cashL:"입금 내역 보기", cash:"6,310,000", pct:76, cashLine:"청구 금액 8,290,000원 중 76% 입금 · 남은 금액 1,980,000원",
    jobsT:"이번 달 검사", jobsL:"매출 보기" } }'''
s = s[:i] + CHECK + s[j:]
rep('var PK="wash"; try{ var pk0=localStorage.getItem("cgg_prod"); if(PR[pk0]) PK=pk0; }catch(e){}', 'var PK="check";')
rep('''function setProd(k){ var kk=key()||"work"; useProduct(k); try{ localStorage.setItem("cgg_prod",k); }catch(e){}''',
    '''function setProd(k){ var kk=key()||"work"; useProduct(k);''')
# 체크 메뉴는 «정산 기록»(3번째)이 대표 목록 — J안 처음 자리 g=2 그대로 맞음
rep('<button>휴지통 <small>3건</small></button>', '<button id="openTrash">휴지통 <small>3건</small></button>')

# 3) 새 화면: 월별 청구서 · 자료 올리기(가온 전용 카드) · 문자 자동수집(구글 카드 그대로) · 나머지 자리
NEW = r'''
/* ═════════ 체크 화면 (체크 방 추가) — 틀 · 부품은 J안 그대로, 내용은 체크 원본 화면에서 ═════════ */
var GAON=false;  /* 시안 보기용: «가온»으로 보면 가온 전용 카드가 보여요. 실제 파일에서는 로그인한 검사소 코드가 GAON 일 때만 */
var BIZ0=PR.check.biz;
function cHead(crumb, h1, desc, btns){
  return '<div class="j-head"><div class="j-hello"><small>'+crumb+' · 10월 13일 화요일</small><h1>'+h1+'</h1>'+(desc?'<p>'+desc+'</p>':'')+'</div>'
    + '<div class="acts">'+(btns||"")+'</div></div>';
}
function cHelp(t){ return '<details class="j-card j-help"><summary>이 화면 사용법</summary><p>'+t+'</p></details>'; }
function cField(label, val, note, type){
  return '<label class="c-fld"><span>'+label+'</span><input type="'+(type||"text")+'" value="'+esc(val)+'">'+(note?'<small>'+note+'</small>':'')+'</label>';
}
/* 월별 청구서 — 업체 이름 · 계좌 · 문의 번호는 «설정»에서 불러와요 (글자로 박아 두지 않음) */
var OFF={ name:"새빛 성능검사소", acct:"국민 000-00-0000-000 김하늘", tel:"031-000-0000" };
function cbill(){
  var who=GAON?"가온진단평가":OFF.name;
  var msg=who+' 2026년 9월 청구서\n\n하늘모터스 담당자 님\n2026년 9월 성능점검 검사비 내역을 보내드려요.\n\n· 검사 40건\n· 합계 1,243,000원\n\n입금 계좌 : '+OFF.acct+'\n문의 : '+OFF.tel+'\n\n검사비 청구서는 아래 «청구서 보기» 버튼에서 볼 수 있어요.';
  return cHead("청구서 › 월별 청구서", '10월 청구서 <em>12곳</em> 중 <em>5곳</em>을 아직 안 보냈어요', "한 달치 검사를 모아 청구서를 만들고, 그대로 문자로 보내요.",
      '<button class="j-btn">'+ic("file")+'미리보기 · 인쇄</button><button class="j-btn">'+ic("down")+'엑셀 다운로드</button><button class="j-btn pri">선택한 곳 보내기</button>')
    + subtabs()
    + '<div class="j-grid2"><div class="j-card j-sec"><h3>청구서 보내기 — 문구 · 입금 계좌</h3>'
    + '<p class="c-note">업체 이름 · 입금 계좌 · 문의 번호는 <b>설정 › 거래처 · 우리 검사소</b>에 적은 값이 들어가요. 업체마다 자기 값이 나와요.</p>'
    + cField("검사비 입금 계좌", OFF.acct, "청구서와 문자에 찍혀요")
    + cField("정비비 입금 계좌", "", "비워 두면 문자에 안 나와요")
    + cField("문의 번호", OFF.tel)
    + '<div class="c-row"><button class="j-btn">처음 문구로</button><button class="j-btn">문구 · 계좌 저장</button><button class="j-btn">내 번호로 시험</button></div></div>'
    + '<div class="j-card j-sec"><h3>문자 미리보기</h3><div class="c-phone"><div class="c-from">보내는 번호 : 설정 › 문자 보내는 번호</div><div class="c-msg">'+esc(msg)+'</div><div class="c-btn">청구서 보기</div></div></div></div>'
    + cHelp("왼쪽에서 문구나 계좌를 고치면 오른쪽 문자 모양이 바로 바뀌어요. 보낼 곳을 선택하고 «선택한 곳 보내기»를 누르면 문자로 나가요.");
}
/* 설정 › 자료 올리기 — «가온정산 가져오기»는 가온 업체에만 보여요 (대표님 결정 2026-10-14) */
function cfiles(){
  return cHead("설정 › 자료 올리기", "자료 올리기", "성능점검 기록 엑셀을 올리면 청구서 · 매출에 바로 쓰여요.", "")
    + subtabs()
    + '<div class="j-card j-sec"><h3>성능점검 기록 올리기</h3><div class="c-drop">점검 기록 엑셀을 끌어다 놓거나 눌러서 고르세요<small>.xlsx · .xls · .csv</small></div></div>'
    + (GAON
      ? '<div class="j-card j-sec c-gaon"><h3>예전 자료 가져오기 <span class="j-badge2 run">가온 업체에만 보여요</span></h3>'
        + '<p class="c-note">가온정산 → 설정 → 설정 백업 → «전체 옮기기 파일 만들기»로 받은 파일을 넣으세요. 검사소 정보 · 단가표 · 매매상사 · 딜러 · 차량을 한 번에 옮겨요.</p>'
        + '<div class="c-drop">가온정산_전체옮기기_○○○.json 파일을 넣으세요</div></div>'
      : '')
    + cHelp("올린 자료는 서버에 저장돼서 회사 PC와 집 PC에서 똑같이 보여요.");
}
/* 설정 › 문자 자동수집 — 구글 Apps Script 카드는 지우지 않고 그대로 (대표님 결정 2026-10-14: 가온정산과 연결 확인 전까지) */
function csms(){
  return cHead("설정 › 문자 자동수집", "문자 자동수집", "입금은 팝빌 계좌조회로 받아요. 이 화면은 휴대폰에 오는 입금 문자를 보조로 모아 두는 설정이에요.", "")
    + subtabs()
    + '<div class="j-card j-sec"><h3>수집함 연결 <span class="j-badge2 chk">지우지 않고 그대로 둬요</span></h3>'
    + '<p class="c-note">구글 Apps Script를 웹앱으로 배포하면 나오는 주소와 비밀번호를 넣어 주세요.</p>'
    + cField("수집함 주소", "https://script.google.com/macros/s/.../exec") + cField("비밀번호", "••••••••••", "", "password")
    + '<div class="c-row"><button class="j-btn">연결 확인</button></div></div>'
    + '<div class="j-card j-sec"><h3>입금 계좌</h3><p class="c-note">계좌를 늘리거나 바꿔도 휴대폰은 손대지 않아요. 여기서 고치고 저장하면 바로 적용돼요.</p>'
    + '<div class="c-kv"><span>'+esc(OFF.acct)+'</span><b>검사비</b></div><div class="c-row"><button class="j-btn">'+ic("plus")+'계좌 추가</button><button class="j-btn">서버에 저장</button></div></div>'
    + '<details class="j-card j-help"><summary>1단계 구글 시트 만들기 · 2단계 휴대폰 설정 · 3단계 카카오뱅크 알림</summary><p>지금 체크 화면의 안내 세 장을 그대로 접어 두었어요. 문구와 버튼(코드 복사 · 본문 복사)은 바꾸지 않아요.</p></details>'
    + cHelp("실제로 받은 입금 문자를 붙여 넣어 보면 금액과 입금자명을 제대로 읽는지 바로 확인할 수 있어요.");
}
function cplace(){
  return cHead(esc(MENU[g][0])+(MENU[g][0]===scrName()?"":" › "+esc(scrName())), esc(scrName()), "", "") + subtabs()
    + '<div class="j-place">이 화면은 지금 체크의 내용 · 버튼 · 문구를 그대로 두고 모양만 J안으로 바꿔요.<br>'
    + (scrName()==="차량 배달 알림"?'안쪽 탭 6개(배달 기록 · 목적지별 · 목적지 관리 · 배달 문구 · 기사 계정 · 배달 휴지통)는 화면 안에 그대로 둬요.':'')
    + (scrName()==="알람 소리"?'메뉴 · 화면 제목 모두 «알람 소리»로 맞췄어요 (원래 «알림 소리 / 알림 설정»).':'')
    + (scrName()==="설정 백업"?'«검사소 · 들어올 수 있는 사람»은 글자로 박아 두지 않고 로그인한 검사소 값으로 보여 줘요.':'')
    + '</div>';
}
function wireCheck(M){
  if($("newBtn") && key()==="work") $("newBtn").onclick=function(){
    openWin('<h3 id="wt">홈택스 발급내역 올리기</h3><p class="desc">홈택스에서 받은 발급내역 엑셀을 올리면 나간 세금계산서를 자동으로 표시해요.</p><div class="c-drop" style="margin:4px 0 0">발급내역 엑셀을 끌어다 놓거나 눌러서 고르세요</div>'
      + '<div class="ft"><button class="j-btn" data-close>취소</button><button class="j-btn pri" data-close>올리기</button></div>', true); };
}
'''
rep("/* ═════════ 그리기 ═════════ */", NEW + "\n/* ═════════ 그리기 ═════════ */")
rep('''var k=key(), body = k==="home"?home(): k==="work"?work(): place();''',
    '''var k=key(), body = k==="home"?home(): k==="work"?work(): k==="bill"?cbill(): k==="files"?cfiles(): k==="sms"?csms(): cplace();''')
rep('''  if($("newBtn")) $("newBtn").onclick=formNew;''', '''  if($("newBtn")) $("newBtn").onclick=formNew;
  wireCheck(M);''')
rep('''    $("openScreen").onclick=function(){ drop=false; draw(); openScreen(); }; }''',
    '''    $("openScreen").onclick=function(){ drop=false; draw(); openScreen(); };
    $("openTrash").onclick=function(){ drop=false; draw(); openWin('<h3 id="wt">휴지통</h3><p class="desc">지운 기록이 30일 동안 여기 남아요. 되돌리거나 완전히 지울 수 있어요.</p><dl><dt>지운 기록</dt><dd>3건</dd><dt>위치</dt><dd>사람 버튼 ▾ 안 (설정 메뉴에서 옮김)</dd></dl><div class="ft"><button class="j-btn" data-close>닫기</button></div>'); }; }''')
# 바깥 «업체로 보기» 버튼 — 가온 전용 카드가 어떻게 보이는지
rep('''each("[data-ly]", function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-ly")===LY?"true":"false"); });
draw();''', '''each("[data-ly]", function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-ly")===LY?"true":"false"); });
each("[data-gaon]", function(b){ b.onclick=function(){ GAON=b.getAttribute("data-gaon")==="1";
  PR.check.biz=GAON?["가온진단평가","검사소 코드 GAON"]:BIZ0;
  each("[data-gaon]", function(x){ x.setAttribute("aria-pressed", x===b?"true":"false"); }); draw(); }; });
draw();''')

# 4) 새 부품 모양 (J 값만 씀)
CSS = '''
/* ── 체크 방 추가: 입력 칸 · 문자 미리보기 · 올리기 칸 ── */
.c-note{margin:0 0 12px;font-size:13.5px;color:var(--sub);line-height:1.6}
.c-fld{display:flex;flex-direction:column;gap:6px;margin:0 0 12px;font-size:13px;font-weight:700;color:#344054}
.c-fld input{height:var(--ctl);border:1px solid var(--ln2);border-radius:var(--r-ctl);padding:0 12px;font:inherit;font-size:14.5px;font-weight:400;background:#fff;color:var(--ink);min-width:0;width:100%}
.c-fld small{font-weight:400;color:var(--sub);font-size:12px}
.c-row{display:flex;gap:8px;flex-wrap:wrap}
.c-phone{background:var(--bg);border-radius:14px;padding:14px;max-width:360px}
.c-from{font-size:12px;color:var(--sub);margin-bottom:8px}
.c-msg{background:#fff;border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.65;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word}
.c-btn{margin-top:8px;height:38px;border-radius:10px;background:#fff;border:1px solid var(--ln2);display:grid;place-items:center;font-size:13.5px;font-weight:700;color:var(--blue)}
.c-drop{border:2px dashed #D0D5DD;border-radius:14px;padding:26px 16px;text-align:center;color:var(--sub);font-size:14px;line-height:1.6}
.c-drop small{display:block;font-size:12.5px}
.c-kv{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--ln);margin-bottom:12px;font-size:14px}
.c-gaon{border:1.5px solid var(--sky)}
.j-sec h3 .j-badge2{font-size:12px}
.mock.vm .c-fld input{height:40px;font-size:14px;border-radius:10px}
.mock.vm .c-row .j-btn{flex:1;justify-content:center;height:38px;font-size:12.5px}
.mock.vm .c-phone{max-width:none}
.mock.vm .c-msg{font-size:12.5px}
'''
rep("</style>", CSS + "</style>")

# 5) 바깥 안내 페이지 — 체크용
a = s.index('<div class="pg">'); b = s.index('<div id="dim" hidden></div>')
PG = '''<div class="pg">
  <h1>체크 J안 시안</h1>
  <p class="lead">
    디자인 방의 <b>합친 디자인 J안(4판)</b> 틀을 그대로 쓰고, 그 안에 <b>체크의 실제 메뉴</b>를 채운 시안이에요.
    <b>홈 · 정산 기록 · 월별 청구서 · 자료 올리기 · 문자 자동수집</b>을 그렸어요. 업체 이름 · 번호 · 금액은 모두 지어낸 예시예요.
    <b>지금 쓰는 체크 화면은 하나도 바꾸지 않았어요</b> (다음 주 시험은 지금 화면으로 해요).
  </p>
  <div class="pick" role="group" aria-label="업체로 보기">
    <span>업체로 보기</span>
    <button class="pb" data-gaon="0" aria-pressed="true">다른 업체</button>
    <button class="pb" data-gaon="1" aria-pressed="false">가온</button>
  </div>
  <div class="pick" role="group" aria-label="메뉴 배치">
    <span>메뉴 배치</span>
    <button class="pb" data-ly="top" aria-pressed="false">가로 메뉴</button>
    <button class="pb" data-ly="side" aria-pressed="true">세로 메뉴</button>
    <button class="pb" data-ly="icon" aria-pressed="false">아이콘 메뉴</button>
  </div>
  <div class="pick" role="group" aria-label="화면">
    <span>화면</span>
    <button class="pb" data-scr="home" aria-pressed="false">홈</button>
    <button class="pb" data-scr="work" aria-pressed="true">정산 기록</button>
    <button class="pb" data-scr="bill" aria-pressed="false">월별 청구서</button>
    <button class="pb" data-scr="files" aria-pressed="false">자료 올리기</button>
    <button class="pb" data-scr="sms" aria-pressed="false">문자 자동수집</button>
  </div>
  <div class="pick" role="group" aria-label="보기 방식">
    <span>보기</span>
    <button class="pb" data-v="fit" aria-pressed="true">PC 한눈에</button>
    <button class="pb" data-v="full" aria-pressed="false">PC 원래 크기</button>
    <button class="pb" data-v="vm" aria-pressed="false">폰 화면</button>
  </div>

  <div class="stage fit" id="stage"><section class="mock" id="mock" aria-label="시안 화면"></section></div>
  <p class="hint" id="hint">PC 화면(가로 1280)을 화면 폭에 맞춰 줄였어요. 글씨가 작으면 «PC 원래 크기»를 눌러 보세요.</p>

  <div class="note">
    <h2>이번 시안에서 한 것</h2>
    <ul>
      <li><b>메뉴 차례 그대로</b>: 홈 · 매출 · <b>정산 기록(3번째, 이름 그대로)</b> · 청구서 · 입출금 · 세금계산서 · 알림 · 설정.</li>
      <li><b>정산 기록</b>: 청구서마다 세금계산서가 나갔는지 상태(완료 · 진행 중 · 확인 필요 · 보류)로 봐요. «홈택스 발급내역 올리기»를 눌러 보세요.</li>
      <li><b>월별 청구서</b>: 업체 이름 · 입금 계좌 · 문의 번호를 <b>글자로 박지 않고 설정 값에서</b> 불러와요. 위에서 «가온»을 누르면 문자 첫 줄의 업체 이름이 바뀌어요.</li>
      <li><b>자료 올리기</b>: «예전 자료 가져오기(가온정산)» 카드는 <b>가온 업체에만</b> 보여요. 위 «업체로 보기»에서 «다른 업체» / «가온»을 바꿔 보세요.</li>
      <li><b>문자 자동수집</b>: 구글 Apps Script «수집함 연결» 카드는 <b>지우지 않고 그대로</b> 뒀어요.</li>
      <li><b>휴지통</b>: 설정 메뉴에서 빼고 오른쪽 위 <b>사람 버튼 ▾ 안</b>에만 뒀어요 (「나」안).</li>
      <li>나머지 화면(매출 · 입출금 · 세금계산서 · 알림 등)은 지금 내용을 그대로 두고 모양만 바꿀 자리예요.</li>
    </ul>
    <p><b>지킨 것</b>: 탭 순서 그대로 · 표 열 차례(☐ → 이름 → 번호 → 내용 → 날짜 → 금액 → 상태) · 해요체 쉬운 말 · J안 색과 크기만 사용 · 폰에서는 표 대신 목록.
      공통 틀과 스타일은 디자인 방 것이라 고치지 않았어요.</p>
  </div>
  <div class="note">
    <h2>원래 문구 → 시안 문구</h2>
    <div class="wt"><table><thead><tr><th>어디</th><th>원래</th><th>시안</th><th>왜</th></tr></thead><tbody>
      <tr><td>메뉴</td><td class="old">매출 내역</td><td class="new">매출</td><td>기준틀 체크 메뉴 그대로</td></tr>
      <tr><td>메뉴</td><td class="old">입·출금 내역</td><td class="new">입출금 (안쪽: 입금 내역 · 보험료 대조)</td><td>묶음 이름은 짧게</td></tr>
      <tr><td>메뉴</td><td class="old">재검사 알림 · 차량 배달 알림</td><td class="new">알림 (안쪽 두 화면)</td><td>묶음</td></tr>
      <tr><td>설정</td><td class="old">알림 소리 (제목 «알림 설정»)</td><td class="new">알람 소리</td><td>규칙 4-4 · 메뉴 «알림»과 안 헷갈리게</td></tr>
      <tr><td>설정</td><td class="old">백업 설정</td><td class="new">설정 백업</td><td>화면 제목과 같게</td></tr>
      <tr><td>설정</td><td class="old">휴지통</td><td class="new">사람 버튼 ▾ › 휴지통</td><td>대표님 「나」안</td></tr>
      <tr><td>정산 기록</td><td class="old">…쌓입니다. …확인할 수 있습니다.</td><td class="new">…쌓여요. …확인할 수 있어요.</td><td>해요체</td></tr>
      <tr><td>정산 기록</td><td class="old">기록 전체를 엑셀로</td><td class="new">엑셀 다운로드</td><td>J안 말 바꾼 곳 표</td></tr>
      <tr><td>정산 기록</td><td class="old">끝남 · 하는 중 · 막힘</td><td class="new">완료 · 진행 중 · 보류</td><td>J안 상태 이름</td></tr>
      <tr><td>월별 청구서</td><td class="old">가온진단평가 · 신한 계좌 · 031-000-0000 (글자로 박혀 있음)</td><td class="new">설정에 적은 업체 이름 · 계좌 · 문의 번호</td><td>다른 업체도 쓰게</td></tr>
      <tr><td>월별 청구서</td><td class="old">보내드립니다</td><td class="new">보내드려요</td><td>해요체</td></tr>
      <tr><td>문자 자동수집</td><td class="old">손댈 일이 없습니다 · 그 즉시 적용됩니다</td><td class="new">손대지 않아요 · 바로 적용돼요</td><td>해요체 (카드 내용은 그대로)</td></tr>
    </tbody></table></div>
  </div>
</div>

'''
s = s[:a] + PG + s[b:]
open(OUT, "w", encoding="utf-8").write(s)
print("OK", len(s))
