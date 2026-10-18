"""체크 v54 → v55 — 디자인 방 공통 화면 시안(디자인/시안/공통화면 · 워시 = 기준 · 추천 A안)에 맞춘 네 화면
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
    '''var SETS=[["office","우리 사업장"],["partner","거래처"],["price","단가표"],["staff","직원 계정 · 권한"],
  ["popbill","연결 · 팝빌"],["sms","연결 · 문자 수집"],["roster","자료 올리기"],["backup","백업"],
  ["fee","검사자 수수료"],["alarm","알람 소리"]];   /* v55: 공통 시안 차례 · 체크 전용은 맨 아래 */
var SETLBL={office:"사업장 · 거래처",price:"정산 기준",popbill:"연결",roster:"자료",fee:"체크 전용"};''')
rep('''    {id:"deposit",label:"입금 내역 · 청구서와 맞추기",path:"입·출금 내역 › 입금 내역",go:"deposit/deposit",''',
    '''    {id:"recv",label:"받을 금액 (안 들어온 돈)",path:"입·출금 내역 › 받을 금액",go:"deposit/recv",words:"받을 금액 미수 안 들어온 돈 입금 대기 외상"},
    {id:"deposit",label:"입금 · 출금 · 청구서와 맞추기",path:"입·출금 내역 › 입금·출금",go:"deposit/deposit",''')
rep('''path:"입·출금 내역 › 입금 내역 › 아래쪽",''', '''path:"입·출금 내역 › 입금·출금 › 아래쪽",''')
rep('''    {id:"office",label:"우리 사업장 · 계좌",path:"설정 › 거래처 › 아래쪽",go:"set/partner",''',
    '''    {id:"roster",label:"카모두 딜러명부 · 상사명부 올리기",path:"설정 › 자료 올리기",go:"set/roster",words:"카모두 명부 딜러명부 상사명부 딜러리스트 상사리스트 엑셀 올리기 거래처 한꺼번에 처음"},
    {id:"office",label:"우리 사업장 · 계좌",path:"설정 › 우리 사업장",go:"set/office",''')
rep('''{id:"popbill",label:"팝빌 연동",path:"설정 › 팝빌 연동",''', '''{id:"popbill",label:"팝빌 연동",path:"설정 › 연결 · 팝빌",''')
rep('''{id:"sms",label:"문자 자동수집",path:"설정 › 문자 자동수집",''', '''{id:"sms",label:"문자 자동수집",path:"설정 › 연결 · 문자 수집",''')
rep('billtpl:"알림톡문구", hometax:"세금계산서",', 'billtpl:"알림톡문구", hometax:"세금계산서", recv:"받을금액", office:"우리사업장", roster:"명부올리기",')

# ── 세금계산서 ──
rep('''  return head("세금계산서","청구서 한 장이 세금계산서 한 장으로 나가요. 묶음 청구는 대표 사업자 한 곳으로 한 장만 나가요.")+

  (pbOk?'':'<div class="msg err">팝빌 회원아이디가 비어 있어요. 설정 → <b>팝빌 연동</b>에서 넣어 주세요.</div>')+''',
    '''  return head("이번 달 발급할 곳 <em>"+won(able.length)+"곳</em>","입금이 끝난 청구서만 세금계산서로 나가요. 묶음 청구는 대표 사업자 한 곳으로 한 장만 나가요.")+''')
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
    '''  sums([["발급할 곳",won(able.length)+"곳"],["공급가액",won(sup)+"원"],
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

# ── 입·출금 내역 ──
rep('''PAGE.deposit=function(){
  return head("입금 내역","팝빌에서 들어온 돈을 가져와 청구서와 자동으로 맞춰요. 애매한 것만 «확인 필요»로 남겨요.")+
  subTabs("deposit")+
  card("입금 처리","팝빌에서 계좌 거래내역을 가져와 청구서와 맞춰요.",''',
    '''PAGE.deposit=function(){
  var inM0=0; DEPS.forEach(function(d){ if(String(d.day).slice(0,7)===ST.ym) inM0+=d.amount; });
  return head("이번 달 입금 <em>"+won(inM0)+"원</em>","통장에 들어온 돈을 청구서와 짝지어요. 맞지 않는 것만 «확인 필요»로 남아요.")+
  subTabs("deposit")+
  depChips()+
  card("가져오기 · 맞추기","팝빌에서 계좌 거래내역을 가져와 청구서와 맞춰요.",''')
rep('''    '<p class="note">팝빌 링크아이디·비밀키는 티와이컴퍼니 것으로 서버에 들어 있고, 어느 회사 계좌를 보는지(사업자번호·팝빌 아이디)는 검사소마다 따로 적어요.</p>')+''',
    '''    '')+''')
rep('''    return sums([["이번 달 입금",won(inM)+"원"],["맞춘 건",won(ok)+"건"],
                 ["확인 필요",won(wait)+"건"],["입금 대기",won(left)+"원"]]);''',
    '''    return sums([["이번 달 입금",won(inM)+"원"],["확인 필요",won(wait)+"건",wait?"bad":""],
                 ["맞춘 건",won(ok)+"건","good"],["받을 금액",won(left)+"원"]]);''')
rep('''  card("들어온 금액","",
    tableBlock("dep",[
      {k:"sender",t:"입금자",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"at",t:"거래 일시"},''',
    '''  card("입금 · 출금","위 기간 칩으로 표를 거를 수 있어요.",
    tableBlock("dep",[
      {k:"sender",t:"보낸 사람",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"at",t:"날짜"},''')
rep('''    ], DEPS, {pick:true,
      tools:'<button class="btn primary" id="depApply">''', '''    ], depRange(DEPS), {pick:true,
      tools:'<button class="btn primary" id="depApply">''')
rep('''    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>')+'</details>';
};''', '''    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>')+'</details>'+
  card("통장 연결","팝빌로 통장을 이어 두면 들어온 돈이 저절로 들어와요. 설정 › 연결 · 팝빌에서 한 번만 하면 돼요.",
    '<div class="tools"><button type="button" class="btn" id="depBankGo">연결 · 팝빌로 가기</button></div>');
};''')

# ── 배달 ──
rep('''  return delivHead()+delivTabs("deliv")+pendCard()+
  card("기간","최근 30일을 보고 있어요.",
    '<div class="tools">'+''',
    '''  return head("최근 30일 배달 <em>"+won(n)+"대</em>"+(fail?" · 못 보냄 <em>"+won(fail)+"대</em>":""),"기사가 폰으로 차 사진을 찍고 목적지를 누르면, 번호판을 읽어 딜러에게 도착 알림을 보내요.")+delivTabs("deliv")+
    ('<div class="tools">'+''')
rep('''  sums([["배달",won(n)+"건"],["목적지",Object.keys(dest).length+"건"],["알림 보냄",won(sent)+"건"],
        ["보내지 못함",won(fail)+"건"],["취소 표시",won(cancel)+"건"],
        ["휴지통",won(DCONF.trashN||0)+"건"]],"c5")+''',
    '''  sums([["배달",won(n)+"대"],["알림 보냄",won(sent)+"대","good"],
        ["보내지 못함",won(fail)+"대",fail?"bad":""],["취소 표시",won(cancel)+"대"]])+pendCard()+''')
rep('''    '<p class="note">딜러 이름이나 차량번호를 누르면 <b>그 차가 어디로 갔는지 · 도착 사진</b>이 작은 창으로 열려요.</p>'+
    delivDetail());''',
    '''    '<p class="note">딜러 이름이나 차량번호를 누르면 <b>그 차가 어디로 갔는지 · 도착 사진</b>이 작은 창으로 열려요.</p>'+
    delivDetail())+
  CGG.help("알림은 보냄 · 못 보냄 · 안 보냄(시험) · 취소로 나뉘어요. 목적지 "+Object.keys(dest).length+"곳 · 휴지통 "+won(DCONF.trashN||0)+"건은 위 안쪽 칸에서 봐요.","이 화면 사용법");''')

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
# 세금계산서 · 입금 전 줄 글은 하나로 (표 칸 거르기 줄에 금액마다 따로 생기던 것)
rep('''    if(t.unpaid) t.why=p.paid>0?"입금 뒤 발급돼요 (입금 "+won(p.paid)+"원 · 남은 "+won(p.left)+"원)":"입금 뒤 발급돼요";''',
    '''    if(t.unpaid) t.why="입금 뒤 발급돼요";''')
# 배달 안쪽 화면 제목 = 그 칸 이름
rep('''  return head("차량 배달 알림",''', '''  return head((DELIVSUB.filter(function(x){ return x[0]===page; })[0]||[0,"배달"])[1],''')
rep("""<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""", open(BASE + "체크/도구/v55_공통화면.js", encoding="utf-8").read() + """<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""")

open(BASE + "체크/2_차곳간_체크_index_v55.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v55.html", len(s))
