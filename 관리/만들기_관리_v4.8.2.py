"""관리 v4.8.2 만들기 — v4.8.1(보안 통과)에 대표님 규칙 «세금계산서는 입금된 것만» (워시 서버 sb23 · 서버/배포안내_워시_sb23.md)을 맞춰요.
쓰는 법: python3 관리/만들기_관리_v4.8.2.py   (v4.8.1 파일은 읽기만)
- 결과: 관리/3_차곳간_관리_index_v4.8.2.html
- 바꾸는 것
  ① 세금계산서 › «업체별 발행» → «결제 기록에서 발행»: 결제 장부(hqPayments = wash_payments) 줄마다
     결제 완료 + 아직 안 보냄 → [세금계산서] · 보냄 → «발행함» · 결제 전 → «결제 완료 뒤 발급돼요»
  ② 결제 건 창(paySheet): 결제 완료면 [세금계산서 보내기], 아니면 «결제 완료 뒤 발급돼요»
  ③ 세금계산서 창(taxSheet): 결제 하나에 묶여요. 합계 = 결제 금액(부가세 포함) 고정, 공급가액 · 부가세는 화면이 나눠 보여 줘요.
     hqTaxIssue body 에 payId. 공급가액을 손으로 바꾸는 칸 없음
  ④ «그래도 보내기»(force) 없앰 — 같은 결제로 두 번은 서버도 막아요
- 새 서버 창구 없음 (hqTaxIssue body 에 payId 하나 더).
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.8.1.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.8.2.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

def cut(a_mark, b_mark, new):
    global s
    if s.count(a_mark) != 1: raise SystemExit("시작 찾은 수 %d: %s" % (s.count(a_mark), a_mark[:60]))
    a = s.index(a_mark); b = s.index(b_mark, a)
    s = s[:a] + new + s[b:]

rep('var ADM_VER="관리 v4.8.1 · 공통 1.5 · 2026-10-17";', 'var ADM_VER="관리 v4.8.2 · 공통 1.5 · 2026-10-18";')

# 보낸 기록이 다 오면 결제 기록 표도 다시 (발행함 표시)
rep('''      {k:"mgt_key", label:"관리번호", w:150, mono:true}
    ]
  });
}''', '''      {k:"mgt_key", label:"관리번호", w:150, mono:true}
    ]
  });
  if($("tTax")) taxPayDraw();
}
/* sb23 «세금계산서는 입금된 것만»: 결제 장부(wash_payments) 한 줄 = 세금계산서 한 장 */
function taxPaid(id){   /* 이 결제로 이미 보낸 것 (서버가 비고 맨 앞에 «결제 {id} ·» 를 붙여요) */
  var key="결제 "+String(id)+" ·";
  return (TAXLOG.rows||[]).filter(function(r){ return r.ok && String(r.memo||"").indexOf(key)===0; })[0]||null;
}
function taxSupply(total){   /* 합계(부가세 포함) → 공급가액 — 서버 셈(공급가액 + 반올림(공급가액/10))과 딱 맞는 값만 */
  total=Math.round(Number(total)||0); if(total<=0) return null;
  var g=Math.floor(total/1.1);
  for(var x=g-2;x<=g+3;x++){ if(x>0 && x+Math.round(x/10)===total) return x; }
  return null;
}
function taxPayState(p){ return p.status!=="paid"?"wait":(taxPaid(p.id)?"done":"todo"); }
function taxPayDraw(){
  var box=$("tTax"); if(!box) return;
  var rows=(D.pays||[]).filter(function(p){ return p.shop && p.shop!=="ADMIN" && (p.status==="paid"||p.status==="ready"); })
    .map(function(p){ return { id:String(p.id), shop:p.shop, name:String(p.shopName||p.biz_name||p.shop), period:String(p.period||""),
      at:String(p.paid_at||p.created_at||"").slice(0,10), amount:Number(p.amount)||0, st:taxPayState(p) }; });
  makeTable({
    id:"tTax", rows:rows, search:["name","period"], sortKey:"at", sortDir:"desc",
    tabs:[["","전체"],["todo","보낼 것"],["done","발행함"],["wait","결제 전"]], tabOf:function(r){ return r.st; },
    rowId:function(r){ return r.id; }, onRow:function(id){ taxPayOpen(id); },
    empty:function(all){ return all.length?"찾으시는 결제가 없어요. 검색어를 지워 보세요.":"아직 결제 기록이 없어요."; },
    cols:[
      {k:"name", label:"업체", w:150, stick:true, html:function(r){ return '<b>'+esc(r.name)+'</b>'; }},
      {k:"at", label:"결제일", w:100},
      {k:"period", label:"어느 달치", w:90},
      {k:"amount", label:"결제 금액", w:110, num:true, html:function(r){ return esc(won(r.amount)); }},
      {k:"st", label:"상태", w:104, html:function(r){
        return r.st==="done"?'<span class="cgg-st done">발행함</span>':r.st==="todo"?'<span class="cgg-st run">결제 완료</span>':'<span class="cgg-st chk">결제 전</span>'; }},
      {k:"_go", label:"할 일", nosort:true, html:function(r){
        return r.st==="todo"?'<button type="button" class="btn sm" data-txp="'+esc(r.id)+'">세금계산서</button>'
          :r.st==="wait"?'<span class="hint" style="margin:0">결제 완료 뒤 발급돼요</span>':''; }}
    ]
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-txp]"),function(b){
    b.onclick=function(ev){ ev.stopPropagation(); taxPayOpen(b.getAttribute("data-txp")); }; });
}
function taxPayOpen(id){
  var p=(D.pays||[]).filter(function(x){ return String(x.id)===String(id); })[0]; if(!p) return;
  if(p.status!=="paid") return toast("세금계산서는 결제 완료 뒤 발급돼요");
  if(taxPaid(p.id)) return toast("이 결제로는 이미 세금계산서를 보냈어요");
  taxSheet(p.shop, p.id);
}''')

# ① 업체별 발행 → 결제 기록에서 발행
rep('''  h += '<div class="card"><h2>업체별 발행</h2>'+
    '<p class="lead" style="margin:2px 0 12px">줄을 누르면 그 업체에 세금계산서를 보내요. 사업자번호가 없으면 먼저 넣어야 해요.</p>'+''',
'''  h += '<div class="card"><h2>결제 기록에서 발행</h2>'+
    '<p class="lead" style="margin:2px 0 12px">결제 완료된 결제 한 건에 세금계산서 한 장이에요. [세금계산서]를 눌러 보내요.</p>'+''')
cut('''  makeTable({
    id:"tTax", rows:(D.shops||[]).filter(function(x){return x.shop!=="ADMIN";}),''',
    '''  $("hqTog").onclick = function(){ TAXHQ.open = !TAXHQ.open; viewTax(); };''',
    '''  taxPayDraw();

''')

# ④ 그래도 보내기(force) 없앰 — 같은 결제로 두 번은 안 돼요
cut('''function taxSend(sh,code,v,force){''', '''function taxDoneSheet(sh,r,err){''',
'''function taxSend(sh,code,v){
  toast("팝빌로 보내는 중이에요…");
  api("hqTaxIssue",[code,Object.assign({},v)])
    .then(function(r){
      if(r && r.dup){ closeSheet(); taxLogLoad(true); taxDoneSheet(sh,null,"이미 보낸 세금계산서와 똑같아요. 아래 «보낸 세금계산서» 목록을 확인해 주세요."); return; }
      closeSheet(); taxLogLoad(true); taxDoneSheet(sh,r,"");
    })
    .catch(function(e){ closeSheet(); taxLogLoad(true); taxDoneSheet(sh,null,emsg(e,"세금계산서를 보내지 못했어요. 다시 시도해 주세요.")); });
}
''')

# ③ 세금계산서 창 — 결제 하나에 묶음
rep('''function taxSheet(code){
  var sh = (D.shops||[]).filter(function(x){return x.shop===code;})[0];
  if(!sh) return;
  var pl = (D.plans||[]).filter(function(p){return p.code===sh.plan;})[0];
  var price = pl ? (pl.price||0) : 0;
  var lastM = new Date(); lastM.setDate(1);
  var per = lastM.toISOString().slice(0,7);
  openSheet(
    '<h3>'+esc(sh.name)+' 세금계산서</h3><div class="sub">업체 코드 '+esc(sh.shop)+'</div>'+''',
'''function taxSheet(code,payId){
  var sh = (D.shops||[]).filter(function(x){return x.shop===code;})[0];
  var pay = (D.pays||[]).filter(function(x){ return String(x.id)===String(payId); })[0];
  if(!sh || !pay || pay.status!=="paid" || String(pay.shop)!==String(code)) return toast("세금계산서는 결제 완료된 결제 기록에서만 보낼 수 있어요",true);
  var total = Math.round(Number(pay.amount)||0), supply = taxSupply(total);
  var per = String(pay.period||String(pay.paid_at||pay.created_at||"").slice(0,7));
  openSheet(
    '<h3>'+esc(sh.name)+' 세금계산서</h3><div class="sub">결제 '+esc(String(pay.id))+' · '+esc(String(pay.paid_at||pay.created_at||"").slice(0,10))+' 결제</div>'+''')
rep('''    '<div class="row2">'+
      '<div><label class="f">공급가액 (부가세 별도, 원)</label><input type="number" id="tAmt" value="'+price+'"></div>'+
      '<div><label class="f">어느 달치</label><input type="text" id="tPer" value="'+per+'"></div>'+
    '</div>'+
    '<label class="f">품목 이름</label><input type="text" id="tItem" value="차곳간 이용료 '+esc(per)+'">'+
    '<div class="hint" id="tSum"></div>'+''',
'''    '<div class="card" style="margin:0 0 16px;padding:14px 16px">'+
      '<div class="mini-row"><span>결제 금액 (= 세금계산서 합계)</span><b>'+esc(won(total))+'</b></div>'+
      (supply!=null
        ? '<div class="mini-row"><span>공급가액 + 부가세</span><b>'+esc(won(supply))+' + '+esc(won(total-supply))+'</b></div>'
        : '<div class="hint" style="color:var(--danger)">이 결제 금액은 공급가액과 부가세로 딱 나눠지지 않아 보낼 수 없어요. 서버 방에 알려 주세요.</div>')+
      '<div class="mini-row"><span>어느 달치</span><b>'+esc(per||"-")+'</b></div>'+
    '</div>'+
    '<label class="f">품목 이름</label><input type="text" id="tItem" value="차곳간 이용료 '+esc(per)+'">'+
    '<div class="hint" id="tSum">'+((D.hq&&D.hq.pb_test===false)?'<span style="color:var(--danger)">실제 발행</span> — 국세청으로 바로 가요':'시험 발행 — 국세청에는 가지 않아요')+'</div>'+''')
rep('''      '<button class="btn primary" id="tGo" style="flex:2">세금계산서 보내기</button></div>'
  );
  function sum(){
    var a=Number($("tAmt").value)||0, v=Math.round(a/10);
    $("tSum").innerHTML = '공급가액 '+esc(won(a))+' + 부가세 '+esc(won(v))+' = <b>합계 '+esc(won(a+v))+'</b>'+
      ((D.hq&&D.hq.pb_test===false)?' · <span style="color:var(--danger)">실제 발행</span>':' · 시험 발행');
  }
  sum(); $("tAmt").oninput = sum;
  $("tCancel").onclick = closeSheet;''',
'''      (supply!=null?'<button class="btn primary" id="tGo" style="flex:2">세금계산서 보내기</button>':'')+'</div>'
  );
  $("tCancel").onclick = closeSheet;''')
cut('''  $("tGo").onclick = function(){
    var amt=Number($("tAmt").value)||0;''', '''

/* =========================================================
   화면 — 충전''',
'''  if($("tGo")) $("tGo").onclick = function(){
    /* 물어보는 창이 뜨면 이 칸들은 사라져요 — 먼저 값을 챙겨 둬요 */
    var item=$("tItem").value.trim(), memo=$("tMemo").value.trim();
    var real = D.hq && D.hq.pb_test===false;
    if(taxPaid(pay.id)) return toast("이 결제로는 이미 세금계산서를 보냈어요",true);
    confirmBox("세금계산서를 보낼까요?",
      "받는 곳: "+sh.name+(sh.biz_no?" ("+bizFmt(sh.biz_no)+")":"")+"\\n건수: 1장\\n합계: "+won(total)+" (공급가액 "+won(supply)+" + 부가세 "+won(total-supply)+")"+
      "\\n결제: "+String(pay.id)+" · "+(per||"-")+"\\n방식: "+(real?"실제 발행 — 국세청으로 바로 가요":"시험 발행 — 국세청에는 가지 않아요"),
      "보내기", real, function(){
      taxSend(sh,code,{ payId:String(pay.id), amount:supply, period:per, itemName:item, memo:memo });
    });
  };
}
''')

# ② 결제 건 창 — 결제 완료면 [세금계산서 보내기]
rep('''      : '<button class="btn" id="pBack" style="width:100%">못 받음으로 되돌리기</button>')+''',
'''      : '<button class="btn" id="pBack" style="width:100%">못 받음으로 되돌리기</button>')+
    (p.status==="paid" && p.shop && p.shop!=="ADMIN"
      ? '<button class="btn primary" id="pTax" style="width:100%;margin-top:10px">세금계산서 보내기</button>'
      : p.status==="ready" ? '<div class="hint" style="margin-top:10px">세금계산서는 결제 완료 뒤 발급돼요.</div>' : '')+''')
rep('''  $("pClose").onclick=closeSheet;
  if($("pPaid")) $("pPaid").onclick=function(){''',
'''  $("pClose").onclick=closeSheet;
  if($("pTax")) $("pTax").onclick=function(){ closeSheet(); taxPayOpen(id); };   /* 같은 결제로 두 번은 서버도 막아요 */
  if($("pPaid")) $("pPaid").onclick=function(){''')

rep('''      : "아직 보낸 세금계산서가 없어요. 위 «업체별 발행» 에서 세금계산서를 보내면 여기에 쌓여요."; },''',
    '''      : "아직 보낸 세금계산서가 없어요. 위 «결제 기록에서 발행» 에서 보내면 여기에 쌓여요."; },''')
rep("  /* 2) 업체별 발행 */", "  /* 2) 결제 기록에서 발행 (sb23) */")

for gone in ("taxDupSheet", "force?", "tAmt", "dpGo", "업체별 발행"):
    if gone in s: raise SystemExit("남은 것: " + gone)
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
