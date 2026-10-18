"""워시 v134 → v135. 대표님 10/18(운영/04 맨 위): «세금계산서는 입금한 곳만, 입금 전 발급은 아예 없음» — 체크 v53 과 같은 규칙
쓰는 법: python3 워시/도구/만들기_워시_v135.py  (v134 판 위에 덧붙임 — v134 는 덮어쓰지 않아요)
  1) 발급 대상 = 입금 완료(받을 금액 0원) 묶음만. 입금 전 줄은 회색 «입금 뒤 발급돼요» + 체크칸 잠김(전체 선택에서도 빠짐). 예외 단추 없음
  2) 숫자 칸 = 발급할 수 있는 곳(입금 완료) 기준. 표에 «입금» 칸
  3) 팝빌 발급: 입금 전 묶음은 보내지 않음 · 늘 «영수» · 그 묶음의 월별 청구서를 찾아 보기코드를 받아 req.bill.code 로 함께(서버 sb23 필수)
     — 청구서와 차가 다르면(상사별 묶기) · 합계가 다르면 보내지 않고 까닭을 표에 남김
  4) 홈택스 일괄발급: 체크와 같은 공식 양식(체크/부품/홈택스_일괄발급_양식_일반_1.0.xls)에 칸 이름대로 채워 .xls (100건씩 · 길이 제한 · 영수 01)
     — 코드 = 워시/도구/v135_세금계산서.js (체크 v52_세금계산서.js 의 읽기 방식을 워시 자료에 맞춤)
  5) «청구 / 영수» 고르는 칸 없앰(입금 완료만 발급하니 늘 영수)
  7) 부가세 셈 = 단가표 설정(청구서와 같음). «적은 금액은 부가세 별도» 칸 없앰
  8) 매출 화면: 이번 달 작은 항목 · 맨 위 해 칸 · 큰 숫자 이름 글씨 키움(모양 그대로)
  9) 계산서 끊는 곳 · 부가세 판단 = 청구서와 같음(안 끊는 곳은 «계산서 끊음»으로 바꾸라고 안내) · 상사별 묶기면 팝빌 전에 뺌
  6) 할 일 띠 · 홈 «세금계산서 안 보낸 것»도 입금 완료만 셈
  워시는 «정산 기록» 큰 메뉴가 없어서 «달마다 장부»로 옮길 것은 없어요.
운영 v111 · 시험판 v125 · v126 ~ v134 는 덮어쓰지 않는다.
"""
import os, base64
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v134.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v135.html")
TPL = os.path.join(ROOT, "체크", "부품", "홈택스_일괄발급_양식_일반_1.0.xls")
MOD = open(os.path.join(HERE, "v135_세금계산서.js"), encoding="utf-8").read()
MOD = MOD.replace("__HTX_B64__", base64.b64encode(open(TPL, "rb").read()).decode())
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v134 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v135 · UI 3.0 · 2026-10-18";')

# 0) 공통 표(gTable) — 줄마다 고르기 잠그기(opt.selOff) · 회색 줄(opt.rowOff). 쓰지 않는 표는 그대로
rep('''   (opt.sel?('<th class="c-chk"><input type="checkbox" class="gall"'+
     ((list.length&&list.every(function(r){return st.sel&&st.sel[opt.id(r)];}))?" checked":"")+'></th>'):"")+''',
'''   (opt.sel?('<th class="c-chk"><input type="checkbox" class="gall"'+((opt.selOff&&list.length&&list.every(function(r){return opt.selOff(r);}))?' disabled title="'+esc(opt.offText||"")+'"':'')+
     ((list.some(function(r){return !(opt.selOff&&opt.selOff(r));})&&list.every(function(r){return (opt.selOff&&opt.selOff(r))||(st.sel&&st.sel[opt.id(r)]);}))?" checked":"")+'></th>'):"")+''')
rep('''    return '<tr data-i="'+ri+'">'+(opt.sel?'<td class="c-chk"><input type="checkbox" class="gsel"'+(st.sel&&st.sel[opt.id(r)]?" checked":"")+'></td>':"")+''',
'''    var off=!!(opt.selOff&&opt.selOff(r));
    return '<tr data-i="'+ri+'"'+(opt.rowOff&&opt.rowOff(r)?' class="goff"':'')+'>'+(opt.sel?'<td class="c-chk"><input type="checkbox" class="gsel"'+(off?' disabled title="'+esc(opt.offText||"")+'"':((st.sel&&st.sel[opt.id(r)])?" checked":""))+'></td>':"")+''')
rep('''    g.list.forEach(function(r){if(all.checked)g.st.sel[g.opt.id(r)]=true;else delete g.st.sel[g.opt.id(r)];});''',
'''    g.list.forEach(function(r){if(all.checked&&!(g.opt.selOff&&g.opt.selOff(r)))g.st.sel[g.opt.id(r)]=true;else delete g.st.sel[g.opt.id(r)];});''')

# 1) 묶음마다 받은 · 남은 금액
rep('''    G.issue=(G.issuer&&G.issuer.bizNo&&bizNoOk(G.issuer.bizNo));
''', '''    G.issue=(G.issuer&&G.issuer.bizNo&&bizNoOk(G.issuer.bizNo));
    var pp=taxPayOf(G);G.paid=pp.paid;G.left=pp.left;G.unpaid=pp.left>0;   /* v135 입금 전이면 발급 안 함 */
''')

# 2) 화면 — 청구/영수 칸 없앰 · 숫자 칸 · 입금 칸 · 잠긴 줄
rep('''    '<select id="tPay"><option value="02"'+((S.cfg&&S.cfg.payType)==="01"?"":" selected")+'>청구 (아직 못 받음)</option>'+
      '<option value="01"'+((S.cfg&&S.cfg.payType)==="01"?" selected":"")+'>영수 (받음)</option></select>'+
''', '''    '<span class="hint">입금 완료된 곳만 발급해요 (영수)</span>'+
''')
rep('''  $("tPay").onchange=function(){S.cfg=Object.assign({},S.cfg);S.cfg.payType=this.value;saveCfg();};
''', '')
rep('''  '<div class="sums"><div class="sum"><span>발급 대상</span><b id="tCnt">0건</b></div>''', '''  '<div class="sums"><div class="sum"><span>발급할 수 있는 곳</span><b id="tCnt">0건</b></div>''')
rep('''    '<button class="btn primary" id="tXls">홈택스 일괄발급 엑셀 받기</button>'+''', '''    '<button class="btn primary" id="tXls">홈택스 일괄발급 양식 내려받기</button>'+''')
rep('''  var gs=taxGroups();
  var okList=gs.filter(function(g){return g.issue;});
  var noBiz=gs.length-okList.length;''', '''  var gs=taxGroups();
  gs.forEach(function(g){if(g.unpaid&&T.sel)delete T.sel[g.key];});   /* v135 입금 전 줄은 고를 수 없어요 */
  var okList=gs.filter(function(g){return g.issue&&!g.unpaid&&!taxIssuedReal(g);});   /* 띠 · 홈과 같은 셈 */
  var noBiz=gs.filter(function(g){return !g.issue;}).length;
  var unpaidN=gs.filter(function(g){return g.unpaid&&!taxIssuedReal(g);}).length;''')
rep('''  var cars=gs.reduce(function(s,g){return s+g.cars;},0);
  var supSum=gs.reduce(function(s,g){return s+g.sup;},0);
  var vatSum=gs.reduce(function(s,g){return s+g.vat;},0);''', '''  var cars=gs.reduce(function(s,g){return s+g.cars;},0);
  var supSum=okList.reduce(function(s,g){return s+g.sup;},0);   /* v135 숫자 칸 = 발급할 수 있는 곳(입금 완료) */
  var vatSum=okList.reduce(function(s,g){return s+g.vat;},0);''')
rep('''  note.push("이미 발급 "+doneN+"건");''', '''  note.push("이미 발급 "+doneN+"건");
  if(unpaidN)note.push('<span style="color:var(--muted)">입금 전 '+unpaidN+"건 — 입금 뒤 발급돼요</span>");''')
rep('''    {k:"pb",label:"자동 발급",''', '''    {k:"left",label:"입금",align:"right",val:function(g){return g.left;},
      html:function(g){return g.unpaid?'<span style="color:var(--muted)">'+esc(taxUnpaidText(g))+'</span>':'<span class="tag paid">입금 완료</span>';}},
    {k:"pb",label:"자동 발급",''')
rep('''  ],gs,{sel:true,id:function(g){return g.key;},min:1200,ph:"발행처·딜러 검색",''', '''  ],gs,{sel:true,id:function(g){return g.key;},min:1300,ph:"발행처·딜러 검색",
    selOff:function(g){return g.unpaid;},rowOff:function(g){return g.unpaid&&!taxIssuedReal(g);},offText:"입금 뒤 발급돼요",''')

# 3) 팝빌 발급 — 입금 전은 빼고, 늘 영수, req.bill
rep('''  var gs=all.filter(function(g){return T.sel[g.key];});
  var done=gs.filter(function(g){var d=taxDoc(g);return d&&d.status==="발급"&&!d.test;});''', '''  var gs=all.filter(function(g){return T.sel[g.key]&&!g.unpaid;});   /* v135 입금 완료만 */
  if(!gs.length)return toast("입금 완료된 곳만 발급할 수 있어요 — 입금 전인 곳은 입금 뒤 발급돼요",true);
  var done=gs.filter(function(g){var d=taxDoc(g);return d&&d.status==="발급"&&!d.test;});''')
rep('''    var req={test:c.test,corpNum:digits(sup.bizNo),userId:c.userId,doc:pbDoc(g,key)};''', '''    if(g.unpaid){ return next(); }   /* v135 한 번 더 — 입금 전은 보내지 않아요(앞에서 이미 빠져 거의 없음) */
    var req={test:c.test,corpNum:digits(sup.bizNo),userId:c.userId,doc:pbDoc(g,key)};''')
# 3-1) 서버 sb23: 청구서 보기코드(bill.code)를 꼭 넣어요 — 먼저 그 묶음의 월별 청구서를 찾아 billCode 로 받고 보내요
rep('''    gsCall("pbIssue",[JSON.stringify(req)])
      .then(function(t){return typeof t==="string"?JSON.parse(t):t;},function(e){return {ok:false,error:errMsg(e)};})''',
'''    taxBillCode(g).then(function(code){ req.bill=taxBillOf(g,code);
        return gsCall("pbIssue",[JSON.stringify(req)])
          .then(function(t){return typeof t==="string"?JSON.parse(t):t;},function(e){return {ok:false,error:errMsg(e)};}); },
      function(e){ return {ok:false,error:(e&&e.why)||"청구서를 찾지 못했어요"}; })''')
rep('''  var pay=(S.cfg&&S.cfg.payType)==="01"?"영수":"청구";
  var lines=g.itemList.map''', '''  var pay="영수";   /* v135 입금 완료만 발급 → 늘 영수 */
  var lines=g.itemList.map''')

# 4) 홈택스 일괄발급 — 공식 양식 채우기(입금 완료만). 옛 함수는 이름만 바꿔 남겨 둠(되돌리기 쉬움)
rep('''function exportHometax(all){''', MOD + '''
function exportHometax0(all){''')

# 3-2) 부가세 셈을 청구서와 같게 — 예전엔 세금계산서 화면만 따로 «적은 금액은 부가세 별도» 칸(기본: 포함)을 써서
#      단가표가 «부가세 별도»(기본)인 업체는 청구서(×1.1)와 계산서 금액이 달랐어요. 서버 sb23 은 청구서 금액과 같아야 발급해요
rep('''function splitVat(amount){
  var inc=!(S.cfg&&S.cfg.vatExcluded);''', '''function splitVat(amount){
  var inc=(vatMode()==="in");   /* v135 단가표의 부가세 별도/포함을 따라요(청구서 billAmt 와 같은 셈) */''')
rep('''    '<label class="chip"><input type="checkbox" id="tVat" style="width:18px;height:18px;vertical-align:-3px"'+((S.cfg&&S.cfg.vatExcluded)?" checked":"")+'> 적은 금액은 부가세 <b>별도</b></label>'+''',
'''    '<span class="hint">부가세: 단가표 설정('+(vatMode()==="in"?"포함":"별도")+')대로 · 청구서와 같은 금액</span>'+''')
rep('''  $("tVat").onchange=function(){S.cfg=Object.assign({},S.cfg);S.cfg.vatExcluded=this.checked;saveCfg();renderTax();};
''', '')
# 3-3) 계산서 끊는 곳인지 · 부가세 = 청구서(buildBills · billAmt)와 같은 판단 — 딜러(같은 상사 먼저) → 상사별 묶음이면 상사
rep('''    var v=splitVat(G.amount);G.sup=v.sup;G.vat=v.vat;''', '''    var tw=G.dealer?(S.dealers.filter(function(x){return x.name===G.dealer&&(!G.company||x.company===G.company);})[0]||S.dealers.filter(function(x){return x.name===G.dealer;})[0])
                   :S.comps.filter(function(x){return x.name===G.company;})[0];
    G.taxOn=taxIssues(tw);   /* v135 청구서와 같은 판단 — 안 끊는 곳은 청구서에 부가세가 없어 계산서를 낼 수 없어요 */
    var v=splitVat(G.amount);
    if(G.taxOn){var ba=billAmt(G.amount,true);v={sup:ba.supply,vat:ba.vat};}
    G.sup=v.sup;G.vat=v.vat;''')
rep('''    G.issue=(G.issuer&&G.issuer.bizNo&&bizNoOk(G.issuer.bizNo));
''', '''    G.issue=!!(G.taxOn&&G.issuer&&G.issuer.bizNo&&bizNoOk(G.issuer.bizNo));
''')
rep('''      if(!g.issuer) rNoParty++;''', '''      if(!g.taxOn) rNoTax++;
      else if(!g.issuer) rNoParty++;''')
rep('''    if(rNoParty) why.push("거래처 미등록 "+rNoParty+"건");''', '''    if(rNoParty) why.push("거래처 미등록 "+rNoParty+"건");
    if(rNoTax) why.push("거래처에 «계산서 끊음»이 아님 "+rNoTax+"건 — 청구서에 부가세가 없어요");''')
rep('''    var rNone=0, rBad=0, rNoParty=0;''', '''    var rNone=0, rBad=0, rNoParty=0, rNoTax=0;''')
rep('''        if(!g.issuer||!g.issuer.bizNo)return '<span style="color:var(--danger)">번호 없음 — 거래처에 넣어 주세요</span>';''',
'''        if(!g.taxOn)return '<span style="color:var(--warn)">계산서 안 끊는 곳 — 거래처에서 «계산서 끊음»으로</span>';
        if(!g.issuer||!g.issuer.bizNo)return '<span style="color:var(--danger)">번호 없음 — 거래처에 넣어 주세요</span>';''')
# 3-4) 팝빌 — 맞는 청구서가 없는 묶음(상사별 묶기)은 확인 창 전에 빼고 알려요
rep('''  var go=gs.filter(function(g){return g.issue&&done.indexOf(g)<0;});''', '''  var go=gs.filter(function(g){return g.issue&&done.indexOf(g)<0;});
  var noBill=go.filter(function(g){return !taxBillFor(g);}); go=go.filter(function(g){return noBill.indexOf(g)<0;});   /* v135 청구서 한 장 = 계산서 한 장 */
  if(!go.length&&noBill.length)return toast("맞는 청구서가 없어요 — «상사별로 한 장에 묶기»를 끄고 발급하거나 홈택스 양식을 써 주세요",true);''')
rep('''      (bad.length?("\\n사업자번호가 없는 "+bad.length+"건은 빼요."):"")+''', '''      (bad.length?("\\n사업자번호가 없는 "+bad.length+"건은 빼요."):"")+
      (noBill.length?("\\n맞는 청구서가 없는 "+noBill.length+"건은 빼요(상사별 묶기)."):"")+''')
# 4-1) 할 일 띠 · 홈 «세금계산서 안 보낸 것» — 입금 완료만 셈
rep('''  if(tab==="tax"){var n=0;try{n=taxGroups().filter(function(g){var d=taxDoc(g);return g.issue&&!(d&&d.status==="발급");}).length;}catch(e){}
    return {count:n,text:"아직 발급 안 한 세금계산서 "+n+"건",''', '''  if(tab==="tax"){var n=0,u=0;try{taxGroups().forEach(function(g){var d=taxDoc(g);if(!g.issue||(d&&d.status==="발급"))return;if(g.unpaid)u++;else n++;});}catch(e){}
    return {count:n,text:"발급할 수 있는 세금계산서 "+n+"건 (입금 완료)"+(u?" · 입금 전 "+u+"건은 입금 뒤 발급돼요":""),''')
rep('''    var gs=taxGroups().filter(function(g){var d=taxDoc(g);return !(d&&d.status==="발급"&&!d.test);});''', '''    var gs=taxGroups().filter(function(g){var d=taxDoc(g);return !g.unpaid&&!(d&&d.status==="발급"&&!d.test);});   /* v135 입금 완료만 */''')
# 8) 매출 화면 글씨(대표님 10/18 «너무 작아 한눈에 안 보여요») — 모양은 그대로, 이름은 본문 크기 이상 · 숫자는 크고 굵게
rep('''#hdrOld,#homeOld{display:none!important}''', '''/* v135 매출 화면 글씨 키움 — 이번 달 작은 항목 · 맨 위 해 칸 · 큰 숫자 이름 */
#vSales .hero .big3 .k{font-size:15px}
#vSales .hero .facts > div{padding:14px 20px}
#vSales .hero .facts .k{font-size:15px;margin:0 0 5px}
#vSales .hero .facts .v{font-size:23px;font-weight:900;letter-spacing:-.02em;line-height:1.15}
#vSales .hero .facts .v em{font-size:15px;font-weight:800}
#vSales .sum span{font-size:14.5px}
#vSales .sum b{font-size:22px}
@media (max-width:760px){#vSales .hero .facts .v{font-size:20px}#vSales .sum b{font-size:19px}#vSales .hero .facts .k,#vSales .sum span{font-size:14px}}
#hdrOld,#homeOld{display:none!important}''')
# 5) CSS — 잠긴 줄 회색
rep('''#hdrOld,#homeOld{display:none!important}''', '''#hdrOld,#homeOld{display:none!important}
tr.goff td,tr.goff td.c-chk,tr.goff td.c-name{background:var(--surface2);color:var(--muted)} tr.goff .tag{opacity:.75} .c-chk input:disabled{opacity:.45;cursor:not-allowed}''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
