"""체크 v54 → v55 — 공통 화면(대표님 10/18 결정): 세금계산서 = 시안 A안 + 체크 전용 그대로 · 입·출금 내역 · 배달 = 워시 v134 화면과 같게 · 설정 = 항목 차례 · 이름(목록 모양은 메뉴 모양을 따름)
  세금계산서: 안쪽 칸 «발행 / 달마다 장부» · 할 일 띠 → 도구줄 → 숫자 칸 4개 → 표 → 단추줄 → 보낸 계산서 → 접힌 도움
  입·출금 내역: 안쪽 칸 «입금·출금 / 받을 금액 / 보험료 대조» · 기간 칩 · 숫자 칸 4개 · 표 · 통장 연결
  배달: 안쪽 칸 차례 «배달 기록 / 목적지 / 문구 · 발송 설정 / 기사 계정 …» · 숫자 칸 4개 · 할 일 띠
  설정: 항목 차례 · 이름(우리 사업장 · 거래처 · 단가표 · 직원 계정 · 권한 · 연결 · 백업 · 체크 전용) · 넓은 화면은 왼쪽 항목 목록
단추 · 서버 창구 · 셈은 v54 그대로. v54(보안 통과 e4d62a0)는 읽기만.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v54.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('ver:"체크 v54", date:"10/18"', 'ver:"체크 v55", date:"10/18"')
rep('$("hdVer").textContent="체크 v54 · "', '$("hdVer").textContent="체크 v55 · "')
rep('<!-- 체크 v54 (', '<!-- 체크 v55 (v54 + 공통 화면 시안 A: 세금계산서 · 입·출금 내역 · 배달 · 설정) · 체크 v54 (')

# ── 메뉴 이름 · 차례 ──
rep('var TAXSUB=[["hometax","세금계산서 발행"],["history","달마다 장부"]];', 'var TAXSUB=[["hometax","발행"],["history","달마다 장부"]];')
rep('var DEPSUB=[["deposit","입금 내역"],["unpaid","보험료 대조"]];', 'var DEPSUB=[["deposit","입금·출금"],["recv","받을 금액"],["unpaid","보험료 대조"]];')
rep('''var DELIVSUB=[["deliv","배달 기록"],["delivdest","목적지별"],["delivplace","목적지 관리"],
  ["delivmsg","문구 · 발송 설정"],["delivdriver","기사 계정"],["delivtrash","휴지통"]];''',
    '''var DELIVSUB=[["deliv","배달 기록"],["delivplace","목적지"],["delivmsg","문구 · 발송 설정"],["delivdriver","기사 계정"],
  ["delivdest","목적지별 보기"],["delivtrash","휴지통"]];''')
rep('''var SETS=[["partner","거래처"],["staff","직원 계정 · 권한"],["price","단가표"],["fee","검사자 수수료"],
  ["popbill","팝빌 연동"],["sms","문자 자동수집"],
  ["alarm","알람 소리"],["backup","설정 백업"]];
var SETLBL={partner:"거래처 · 계정",price:"정산 기준",popbill:"연결",alarm:"이 화면"};''',
    '''var SETS=[["office","우리 사업장"],["backup","백업 · 기기"],["partner","거래처"],["staff","직원 계정"],["price","작업 항목 · 단가표"],
  ["popbill","입금 자동 확인"],["alarm","알림"],["fee","검사자 수수료"],["files","자료 올리기"]];   /* v55: 디자인 메뉴 지도(워시와 같은 차례 · 이름) · 체크 전용은 맨 아래 */
var SETLBL={fee:"체크 전용"};''')
rep('var SALESUB=[["sales","매출 내역"],["files","자료 올리기"]];', 'var SALESUB=[];   /* v55: 자료 올리기는 설정 › 자료 올리기로 */')
rep('''    {id:"files",label:"접수리스트 엑셀 올리기",path:"매출 › 자료 올리기",go:"sales/files",''', '''    {id:"files",label:"접수리스트 엑셀 올리기",path:"설정 › 자료 올리기",go:"set/files",''')
rep('''    {id:"staff",label:"직원 계정 · 권한",path:"설정 › 직원 계정 · 권한",''', '''    {id:"staff",label:"직원 계정",path:"설정 › 직원 계정",''')
rep('''    {id:"price",label:"단가표 고치기",path:"설정 › 단가표",''', '''    {id:"price",label:"단가표 고치기",path:"설정 › 작업 항목 · 단가표",''')
rep('''    {id:"alarm",label:"알람 소리",path:"설정 › 알람 소리",''', '''    {id:"sender",label:"발신번호 (문자 보내는 번호)",path:"설정 › 알림",go:"set/alarm",words:"발신번호 보내는 번호 문자 번호"},
    {id:"alarm",label:"알람 소리",path:"설정 › 알림",''')
rep('''    {id:"backup",label:"설정 백업",path:"설정 › 설정 백업",''', '''    {id:"backup",label:"백업 · 기기",path:"설정 › 백업 · 기기",''')
rep('''"팝빌 연결을 먼저 확인해 주세요. 설정 → 팝빌 연동"''', '''"팝빌 연결을 먼저 확인해 주세요. 설정 → 입금 자동 확인"''')
rep('''칸이나 입금 내역 › «통장 문자 붙여넣기»''', '''칸이나 입·출금 내역 › 입금·출금 › «통장 문자 붙여넣기»''')
rep('''  return head("단가표",''', '''  return head("작업 항목 · 단가표",''')
rep('''  return head("알람 소리",''', '''  return head("알림",''')
rep('''  return head("직원 계정 · 권한",''', '''  return head("직원 계정",''')
# 숫자 칸 주황(warn) — 워시와 같게
rep('''              color: x[2]==="bad"?"#D64545":(x[2]==="good"?"#1E9E5A":"#1668C4")}; }));''', '''              color: x[2]==="bad"?"#D64545":(x[2]==="good"?"#1E9E5A":(x[2]==="warn"?"#B26B00":"#1668C4"))}; }));''')
# csvup CSS 1.0 → 1.1 (워시 v134 그대로 · 칸 짝짓기 · 상사로 거르기 모양)
_a = s.index("/* 차곳간 엑셀(CSV) 한꺼번에 올리기 부품 CSS csvup 1.0"); _b = s.index(".csu-tbl{max-height:38vh}}\n", _a) + len(".csu-tbl{max-height:38vh}}\n")
s = s[:_a] + open(BASE + "체크/부품/csvup_1.1.css", encoding="utf-8").read() + s[_b:]

rep('''    {id:"deposit",label:"입금 내역 · 청구서와 맞추기",path:"입·출금 내역 › 입금 내역",go:"deposit/deposit",''',
    '''    {id:"recv",label:"받을 금액 (안 들어온 돈)",path:"입·출금 내역 › 받을 금액",go:"deposit/recv",words:"받을 금액 미수 안 들어온 돈 입금 대기 외상"},
    {id:"deposit",label:"입금 · 출금 · 청구서와 맞추기",path:"입·출금 내역 › 입금·출금",go:"deposit/deposit",''')
rep('''path:"입·출금 내역 › 입금 내역 › 아래쪽",''', '''path:"입·출금 내역 › 입금·출금 › 아래쪽",''')
rep('''    {id:"office",label:"우리 사업장 · 계좌",path:"설정 › 거래처 › 아래쪽",go:"set/partner",''',
    '''    {id:"roster",label:"카모두 딜러명부 · 상사명부 올리기",path:"설정 › 자료 올리기",go:"set/files",words:"카모두 명부 딜러명부 상사명부 딜러리스트 상사리스트 엑셀 올리기 거래처 한꺼번에 처음"},
    {id:"office",label:"우리 사업장 · 계좌",path:"설정 › 우리 사업장",go:"set/office",''')
rep('''{id:"popbill",label:"팝빌 연동",path:"설정 › 팝빌 연동",''', '''{id:"popbill",label:"입금 자동 확인 (팝빌)",path:"설정 › 입금 자동 확인",''')
rep('''{id:"sms",label:"문자 자동수집",path:"설정 › 문자 자동수집",''', '''{id:"sms",label:"문자 자동수집",path:"설정 › 입금 자동 확인 › 아래쪽",''')
rep('billtpl:"알림톡문구", hometax:"세금계산서",', 'billtpl:"알림톡문구", hometax:"세금계산서", recv:"받을금액", office:"우리사업장",')

rep('''path:"설정 › 입금 자동 확인 › 아래쪽",go:"set/sms",''', '''path:"설정 › 입금 자동 확인 › 문자 자동수집",go:"set/sms",''')   # 문자 화면은 따로(보안 b84a8c9)

# 설정 화면 제목 = 메뉴 칸 이름
rep('''  return head("문자 자동수집",''', '''  return head("문자 자동수집",''')
rep('''  return head("설정 백업",''', '''  return head("백업 · 기기",''')
rep('''  return head("팝빌 연동",''', '''  return head("입금 자동 확인",''')

# ── 세금계산서 ──
rep('''  var able=TAXES.filter(function(t){ return t.can && !/발급|전송/.test(t.state); });''', '''  var able=TAXES.filter(function(t){ return t.can && !t.skip && !/발급|전송/.test(t.state); });   /* v55: «안 받음»은 빼고 (할 일 띠와 같게) */''')
rep('''  return head("세금계산서","청구서 한 장이 세금계산서 한 장으로 나가요. 묶음 청구는 대표 사업자 한 곳으로 한 장만 나가요.")+

  (pbOk?'':'<div class="msg err">팝빌 회원아이디가 비어 있어요. 설정 → <b>팝빌 연동</b>에서 넣어 주세요.</div>')+''',
    '''  return head("세금계산서","한 달치를 모아 홈택스에 올릴 엑셀을 만들어요. 팝빌을 쓰면 버튼 한 번으로 발급돼요. 입금이 끝난 청구서만 나가요.")+''')
rep('''  '<div class="ckbar"><div class="l"><b>작성일자는 «청구한 달의 말일»이에요</b>'+
    '<small>'+esc(ymText(ST.ym))+'분은 다음 달에 내더라도 <b>'+endDay+'</b>. '+
    '「이번 달 세금계산서로 해 달라」는 곳은 그 줄의 날짜만 바꾸시면 돼요.</small></div>'+
    '<div class="r">'+endDay+'</div></div>'+

''', "")
rep('''    '<button class="btn" id="txReload">새로고침</button>'+
    '<span style="flex:1"></span>'+''',
    '''    '<button class="btn" id="txReload">새로고침</button>'+
    '<span style="font-size:12.5px;color:var(--muted)">작성일자 = 청구한 달의 말일 <b>'+endDay+'</b> (줄마다 바꿀 수 있어요)</span>'+
    '<span style="flex:1"></span>'+''')
rep('''  sums([["발급할 수 있는 곳",won(able.length)+"곳"],["공급가액",won(sup)+"원"],
        ["부가세",won(vat)+"원"],["합계",won(sup+vat)+"원"],
        ["이미 발급 · 안 받음",won(done.length)+" · "+won(skip.length)+"곳"]],"c5")+''',
    '''  sums([["발급 대상",won(able.length)+"건"],["공급가액",won(sup)+"원"],
        ["세액",won(vat)+"원"],["합계",won(sup+vat)+"원"]])+''')
rep('''  card("발급 대상","왼쪽 네모로 고르고 표 아래 «팝빌로 발급»을 누르면 확인 창이 한 번 더 떠요.",''',
    '''  card("발급할 곳","왼쪽 네모로 고르고 표 아래 «팝빌로 발급»을 누르면 확인 창이 한 번 더 떠요. 입금 전 줄은 «입금 뒤 발급돼요».",''')
rep('''<button class="btn" id="txXls">홈택스 일괄발급 양식 다운로드</button>''', '''<button class="btn" id="txXls">홈택스 일괄발급 양식 받기</button>''')
rep('''xl.textContent="홈택스 일괄발급 양식 내려받기";''', '''xl.textContent="홈택스 일괄발급 양식 받기";''')
rep('''      '. 설정 → 거래처에서 사업자번호를 넣으면 바로 발급 대상이 돼요.</p>':''))+

  '<div class="fixcard">'+''',
    '''      '. 설정 → 거래처에서 사업자번호를 넣으면 바로 발급 대상이 돼요.</p>':''))+
  card("보낸 계산서","지금까지 발급한 계산서예요. 국세청 승인번호가 찍히면 끝난 거예요.",
    '<div class="tools"><span style="font-size:14px">'+esc(ymText(ST.ym))+' 발급 <b>'+won(done.length)+'장</b> · 안 받음 <b>'+won(skip.length)+'곳</b></span>'+
    '<button type="button" class="btn" id="txDoneOnly">보낸 것만 표에서 보기</button></div>')+
  '<details class="chk-fold" id="txFixFold"><summary>세금계산서를 잘못 냈을 때 · 펼쳐 보기</summary>'+
  '<div class="fixcard">'+''')
rep('''      '<span style="font-size:12px;color:var(--muted);font-weight:700">위 표에서 그 줄의 «고치기»를 눌러도 돼요</span>'+
    '</div></div>';''',
    '''      '<span style="font-size:12px;color:var(--muted);font-weight:700">위 표에서 그 줄의 «고치기»를 눌러도 돼요</span>'+
    '</div></div></details>'+
  CGG.help("입금 전 줄은 «입금 뒤 발급돼요»로 보여요. 낸 계산서는 지울 수 없고 «수정세금계산서»로 바로잡아요.","이 화면 사용법");''')

rep('''  '<div class="tools">'+ymPicker("txYm","청구 달")+''', '''  '<div class="card" style="padding:12px 16px"><div class="tools" style="margin:0;align-items:center">'+   /* v55: 워시처럼 공급자 줄 따로 */
    '<span style="font-weight:800">공급자(우리 사업장)</span>'+
    (OFFICE.name?('<span>'+esc(OFFICE.popbill_corp_name||OFFICE.name)+(OFFICE.biz_no?(' · '+esc(OFFICE.biz_no)):"")+(OFFICE.owner_name?(' · 대표 '+esc(OFFICE.owner_name)):"")+'</span>')
      :'<span style="color:var(--danger);font-weight:700">아직 등록 안 됨 — 세금계산서를 만들 수 없어요</span>')+
    '<button type="button" class="btn" data-v55go="office" style="margin-left:auto">설정 → 우리 사업장에서 '+(OFFICE.name?"고치기":"등록하기")+'</button></div></div>'+
  '<div class="tools">'+ymPicker("txYm","청구 달")+''')
rep('''    '<span style="font-size:12.5px;color:var(--muted)">공급자 <b>'+
      esc(OFFICE.popbill_corp_name||OFFICE.name||"—")+'</b></span></div>'+''', '''    '</div>'+''')

# ── 입·출금 내역 ──
rep('''PAGE.deposit=function(){
  return head("입금 내역","팝빌에서 들어온 돈을 가져와 청구서와 자동으로 맞춰요. 애매한 것만 «확인 필요»로 남겨요.")+
  subTabs("deposit")+
  card("입금 처리","팝빌에서 계좌 거래내역을 가져와 청구서와 맞춰요.",''',
    '''PAGE.deposit=function(){
  return head("입·출금 내역","통장에 들어오고 나간 금액을 한 표로 봐요. 청구서와 맞은 입금은 «완료»로 표시돼요.")+   /* v55: 워시 v134 입·출금 내역과 같게 */
  subTabs("deposit")+
  perBox("dep")+
  card("가져오기 · 맞추기","팝빌에서 계좌 거래내역을 가져와 청구서와 맞춰요.",''')
rep('''    '<p class="note">팝빌 링크아이디·비밀키는 티와이컴퍼니 것으로 서버에 들어 있고, 어느 회사 계좌를 보는지(사업자번호·팝빌 아이디)는 검사소마다 따로 적어요.</p>')+''',
    '''    '')+''')
rep('''    return sums([["이번 달 입금",won(inM)+"원"],["맞춘 건",won(ok)+"건"],
                 ["확인 필요",won(wait)+"건"],["입금 대기",won(left)+"원"]]);''',
    '''    return sums([["입금 금액",won(inM)+"원","good"],["출금 금액",won(outM)+"원"],
                 ["확인 필요",won(wait)+"건",wait?"warn":""],["받을 금액",won(left)+"원","warn"]]);''')
rep('''  card("들어온 금액","",
    tableBlock("dep",[
      {k:"sender",t:"입금자",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"at",t:"거래 일시"},''',
    '''  card("입금 · 출금","위 기간에 들어오고 나간 돈이에요.",
    tableBlock("dep",[
      {k:"at",t:"거래 일시",name:true},
      {k:"sender",t:"거래처",kind:"id",fmt:function(v){return '<b>'+esc(v)+'</b>';}},''')
rep('''    ], DEPS, {pick:true,
      tools:'<button class="btn primary" id="depApply">''', '''    ], perFilter("dep",DEPS), {pick:true,
      tools:'<button class="btn primary" id="depApply">''')
rep('''    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>')+'</details>';
};''', '''    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>')+'</details>'+
  (OFFICE.popbill_ready?'':card("통장을 먼저 연결해 주세요","팝빌로 통장을 이어 두면 들어온 돈이 저절로 들어와요. 설정 › 입금 자동 확인에서 한 번만 하면 돼요.",
    '<div class="tools"><button type="button" class="btn primary" id="depBankGo">입금 자동 확인 화면으로 가기</button></div>'))+
  CGG.help("기간을 고르면 숫자 칸과 표가 그 기간으로 바뀌어요. «확인 필요»는 누가 보낸 돈인지 모르는 입금이에요 — 줄을 골라 «선택한 줄 청구서에 맞추기»를 눌러요.","이 화면 사용법");
};''')

rep('''    var inM=0,ok=0,wait=0;
    DEPS.forEach(function(d){
      if(String(d.day).slice(0,7)===ST.ym) inM+=d.amount;
      if(d.state==="확인 대기") wait++; else ok++;
    });''', '''    var inM=0,outM=0,ok=0,wait=0;   /* v55: 고른 기간 안에서 */
    perFilter("dep",DEPS).forEach(function(d){ var a=Number(d.amount)||0;
      if(a>=0) inM+=a; else outM+=-a;
      if(d.state==="확인 대기") wait++; else ok++;
    });''')

rep('''      {k:"amount",t:"금액",num:true,fmt:function(v){return won(v);}},''', '''      {k:"amount",t:"금액",num:true,fmt:function(v){ var n=Number(v)||0; return '<b style="color:'+(n<0?'var(--danger)':'var(--good)')+'">'+(n<0?'-':'+')+won(Math.abs(n))+'</b>'; }},   /* v55: 워시처럼 + 초록 · - 빨강 */''', 2)   # 입금 표 · 지운 입금 표

# ── 배달 ──
rep('''PAGE.deliv=function(){
  var n=DRIVES.length;
  var sent=DRIVES.filter(function(d){return d.alarm==="보냄";}).length;
  var fail=DRIVES.filter(function(d){return d.alarm==="못 보냄";}).length;
  var test=DRIVES.filter(function(d){return d.alarm==="안 보냄";}).length;
  var dest={}; DRIVES.forEach(function(d){ dest[d.dest]=1; });
  var cancel=DRIVES.filter(function(d){return d.alarm==="취소";}).length;''', '''PAGE.deliv=function(){
  var DV=perFilter("drv",DRIVES);   /* v55: 워시 출고 기록과 같게 — 고른 기간만 */
  var n=DV.length;
  var sent=DV.filter(function(d){return d.alarm==="보냄";}).length;
  var fail=DV.filter(function(d){return d.alarm==="못 보냄";}).length;
  var test=DV.filter(function(d){return d.alarm==="안 보냄";}).length;
  var dest={}; DV.forEach(function(d){ dest[d.dest]=1; });
  var cancel=DV.filter(function(d){return d.alarm==="취소";}).length;''')
rep('''  return delivHead()+delivTabs("deliv")+pendCard()+
  card("기간","최근 30일을 보고 있어요.",
    '<div class="tools">'+''',
    '''  return head("배달 기록","차가 어디로 갔는지 · 딜러에게 알림이 나갔는지 한눈에 봐요.")+delivTabs("deliv")+perBox("drv")+
    ('<div class="tools" hidden>'+''')
rep('''  sums([["배달",won(n)+"건"],["목적지",Object.keys(dest).length+"건"],["알림 보냄",won(sent)+"건"],
        ["보내지 못함",won(fail)+"건"],["취소 표시",won(cancel)+"건"],
        ["휴지통",won(DCONF.trashN||0)+"건"]],"c5")+''',
    '''  sums([["배달",won(n)+"대"],["목적지",Object.keys(dest).length+"건"],
        ["알림 보냄",won(sent)+"건","good"],["못 보냄",won(fail)+"건",fail?"bad":""]])+pendCard()+''')
rep('''    '<p class="note">딜러 이름이나 차량번호를 누르면 <b>그 차가 어디로 갔는지 · 도착 사진</b>이 작은 창으로 열려요.</p>'+
    delivDetail());''',
    '''    '<p class="note">딜러 이름이나 차량번호를 누르면 <b>그 차가 어디로 갔는지 · 도착 사진</b>이 작은 창으로 열려요.</p>'+
    delivDetail())+
  CGG.help("알림은 보냄 · 못 보냄 · 안 보냄(시험) · 취소로 나뉘어요. 취소 표시 "+won(cancel)+"건 · 휴지통 "+won(DCONF.trashN||0)+"건. 지금 보내는 방법 «"+(DCONF.way==="ata"?"알림톡":"문자")+"» · 사진 붙여 보내기 «"+(DCONF.photo_on!==false?"켬":"끔")+"».","이 화면 사용법");''')

# csvup 1.0 → 1.1 (워시 v134 · 카모두 명부 그대로 · 개인정보 칸 버림)
_i = s.index("var CGG_CSVUP = (function(){"); _c = s.rfind("/*", 0, _i); _j = s.index("\n})();", _i) + len("\n})();")
if "csvup 1.0" not in s[_c:_c+200]: raise SystemExit("csvup 1.0 자리를 못 찾음")
s = s[:_c] + open(BASE + "체크/부품/csvup_1.1.js", encoding="utf-8").read().rstrip("\n") + s[_j:]
# 거래처 올리기 창을 설정 › 자료 올리기에서도 부르게 (같은 함수) · 칸 짝 기억은 검사소마다
rep('''  $("chkCsv").onclick=function(){
    var CM={};''', '''  $("chkCsv").onclick=function(){ chkCsvOpen(); };
};
window.chkCsvTpl=function(){ CGG_CSVUP.download("양식_거래처.csv", TPL_P); };
window.chkCsvOpen=function(){
    var CM={};''')
rep('''    CGG_CSVUP.partners({owner:isOwner(), tplText:TPL_P,''', '''    CGG_CSVUP.partners({owner:isOwner(), store:String(ST.officeCode||""), tplText:TPL_P,''')
rep('''      fail:function(e){ return niceMsg(e&&e.message); }});
  };
};
})();''', '''      fail:function(e){ return niceMsg(e&&e.message); }});
};
})();''')
rep('''    ], DRIVES, {pick:true,
      tools:'<button class="btn" data-dact="fill">빈 차명 채우기</button>'+''', '''    ], DV, {pick:true,
      tools:'<button class="btn" data-dact="fill">빈 차명 채우기</button>'+''')
r_help=None
# 세금계산서 · 입금 전 줄 글은 하나로 (표 칸 거르기 줄에 금액마다 따로 생기던 것)
rep('''    if(t.unpaid) t.why=p.paid>0?"입금 뒤 발급돼요 (입금 "+won(p.paid)+"원 · 남은 "+won(p.left)+"원)":"입금 뒤 발급돼요";''',
    '''    if(t.unpaid) t.why="입금 뒤 발급돼요";''')
# 배달 안쪽 화면 제목 = 그 칸 이름
rep('''  return head("차량 배달 알림",''', '''  return head((DELIVSUB.filter(function(x){ return x[0]===page; })[0]||[0,"배달"])[1],''')
rep("""<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""", open(BASE + "체크/도구/v55_공통화면.js", encoding="utf-8").read() + """<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""")

import re as _re
def allrep(a, b, need=1):
    global s
    if s.count(a) < need: raise SystemExit("못 찾음: " + a[:60])
    s = s.replace(a, b)
allrep("매출 › 자료 올리기", "설정 › 자료 올리기", 4)
allrep("이 기간 엑셀 다운로드", "엑셀 다운로드")
allrep("이 문자를 입금 내역에 담기", "이 문자를 입·출금 내역에 담기", 2)   # 단추 글자 · 연결 글자 같이
allrep("입금 내역으로 되살렸어요", "입·출금 내역으로 되살렸어요")
allrep("""card('이번 달 입금 <span class="rt">입금 내역 ›</span>'""", """card('이번 달 입금 <span class="rt">입·출금 내역 ›</span>'""")
allrep("입금 내역(계좌조회)과 세금계산서를 팝빌로 주고받아요.", "통장에 입금이 들어오면 청구서와 맞춰 자동으로 입금 완료로 바꿔요. 세금계산서도 팝빌로 발급해요.")
allrep("홈택스 일괄발급 양식 받기", "홈택스 일괄발급 엑셀 받기", 2)
allrep("입금·출금", "입금 · 출금", 3)
allrep("홈택스 일괄발급 양식 내려받기", "홈택스 일괄발급 엑셀 받기", 3)
allrep("홈택스 일괄발급 양식을 내려받을까요?", "홈택스 일괄발급 엑셀을 받을까요?")
allrep("3. 계좌 — 입금 내역에 쓸 계좌", "3. 계좌 — 입·출금 내역에 쓸 계좌")
allrep("설정 › 거래처 › 우리 사업장", "설정 › 우리 사업장")
allrep("sent: shortTs(v.sent_at)", "sent: shortTs(v.sent_at), sentRaw: String(v.sent_at||\"\")")   # 받을 금액 «가장 오래된 건»을 해까지 보고 셈
s = _re.sub(r'return head\("백업 · 기기","[^"]*"\)', 'return head("백업 · 기기","자료는 서버에 있어 PC · 폰 어디서 열어도 같아요. 백업 파일 받기 · 접속 기기 목록은 준비 중이에요.")', s, count=1)
s = _re.sub(r'return head\("자료 올리기","[^"]*"\)', 'return head("자료 올리기","카모두 명부 · 접수리스트 · 나스 엑셀을 여기서 올려요.")', s, count=1)

open(BASE + "체크/2_차곳간_체크_index_v55.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v55.html", len(s))
