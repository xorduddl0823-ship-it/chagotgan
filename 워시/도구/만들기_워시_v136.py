"""워시 v135 → v136. 대표님 10/18 시험: 세금계산서 표 «합계»(50,000원)가 공급가액 + 세액(55,000원)과 달라요
쓰는 법: python3 워시/도구/만들기_워시_v136.py  (v135 판 위에 덧붙임 — v135 는 덮어쓰지 않아요)
  1) 묶음 금액 = 청구서와 같은 셈 billAmt(차 금액 합, 계산서 끊는 곳인지) — 안 끊는 곳은 세액 0원(청구서도 부가세 없음)
  2) 표 «합계» · 자세히 창 합계 · 팝빌 / 홈택스 확인 창 합계 = 공급가액 + 세액(실제 계산서 금액)
운영 v111 · 시험판 v125 · v126 ~ v135 는 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v135.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v136.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v135 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v136 · UI 3.0 · 2026-10-18";')

# 1) 공급가액 · 세액 = 청구서와 같은 셈(안 끊는 곳은 세액 0)
rep('''    var v=splitVat(G.amount);
    if(G.taxOn){var ba=billAmt(G.amount,true);v={sup:ba.supply,vat:ba.vat};}''',
'''    var ba=billAmt(G.amount,G.taxOn),v={sup:G.taxOn?ba.supply:ba.charge,vat:ba.vat};   /* v136 청구서와 같은 셈 — 합계 = 공급가액 + 세액 (안 끊는 곳은 청구 금액 그대로) */''')

# 2) 합계 = 공급가액 + 세액
rep('''    {k:"amount",label:"합계",align:"right",html:function(g){return wonExact(g.amount);}},''',
'''    {k:"amount",label:"합계",align:"right",val:function(g){return g.sup+g.vat;},html:function(g){return wonExact(g.sup+g.vat);}},''')
rep('''<span>합계</span><b style="color:var(--brand);font-size:17px">'+wonExact(g.amount)+'</b></div>'+''',
'''<span>합계</span><b style="color:var(--brand);font-size:17px">'+wonExact(g.sup+g.vat)+'</b></div>'+''')
rep('''+go.length+"건 · 합계 "+wonExact(go.reduce(function(s,g){return s+g.amount;},0))+''',
'''+go.length+"건 · 합계 "+wonExact(go.reduce(function(s,g){return s+g.sup+g.vat;},0))+''')
rep('''tot=pick.reduce(function(s,g){return s+g.amount;},0);''', '''tot=pick.reduce(function(s,g){return s+g.sup+g.vat;},0);''')

# 3) 수정발행 · 보낸 기록 · 같은 계산서 확인 창 · 내역 CSV 도 실제 계산서 금액(공급가액 + 세액)으로
rep('''esc(g.issuerName)+' · '+wonExact(g.amount)+''', '''esc(g.issuerName)+' · '+wonExact(g.sup+g.vat)+''')
rep('''? ('<b>'+wonExact(-g.amount)+'</b> 짜리 한 장이 나가요.')''', '''? ('<b>'+wonExact(-(g.sup+g.vat))+'</b> 짜리 한 장이 나가요.')''')
rep('''var amt=(pick[3]==="차액")?Number($("pfAmt").value||0):-g.amount;''', '''var amt=(pick[3]==="차액")?Number($("pfAmt").value||0):-(g.sup+g.vat);''')
rep('''wonExact(pick[3]==="두장"?g.amount:amt)''', '''wonExact(pick[3]==="두장"?(g.sup+g.vat):amt)''')
rep('''dealer:g.dealer||"",amount:g.amount,sup:g.sup,vat:g.vat,mgtKey:key,''', '''dealer:g.dealer||"",amount:g.sup+g.vat,sup:g.sup,vat:g.vat,mgtKey:key,''')
rep('''<span class="dupAmt">'+wonExact(x.g.amount)+'</span>''', '''<span class="dupAmt">'+wonExact(x.g.sup+x.g.vat)+'</span>''')
rep('''      g.amount,g.sup,g.vat,g.itemList.map(function(i){return i.name+"×"+i.qty;}).join(" / "),''', '''      g.sup+g.vat,g.sup,g.vat,g.itemList.map(function(i){return i.name+"×"+i.qty;}).join(" / "),''')

# 4) 검사 일꾼: 입금 칸 «남은 금액»도 계산서 금액 기준(받은 돈도 청구서와 같은 셈 billAmt(…).charge) — 입금 판단은 그대로(받은 차 = 수금완료)
rep('''  var paid=g.recs.filter(function(r){return statusOf(r)==="수금완료";}).reduce(function(s,r){return s+(r.total||0);},0);
  return {paid:paid,left:Math.max(0,(g.amount||0)-paid)};''',
'''  var base=g.recs.filter(function(r){return statusOf(r)==="수금완료";}).reduce(function(s,r){return s+(r.total||0);},0);
  var paid=billAmt(base,g.taxOn).charge, all=billAmt(g.amount||0,g.taxOn).charge;   /* v136 청구서와 같은 셈 */
  return {paid:paid,left:Math.max(0,all-paid)};''')
# 5) 검사 일꾼: 자세히 창 품목 줄 = 계산서에 실제로 들어가는 줄(htxItems — 합이 합계와 같음) · 안 끊는 곳은 세액 없이
rep('''   '<div style="margin-top:10px">'+g.itemList.map(function(i){
     var v=splitVat(i.price*i.qty);
     return '<div class="kv"><span>'+esc(i.name)+' · '+i.qty+'대 × '+wonExact(i.price)+'</span><b>'+wonExact(v.sup)+' + 세 '+wonExact(v.vat)+'</b></div>';}).join("")+''',
'''   '<div style="margin-top:10px">'+(g.taxOn?htxItems(g).map(function(i){
     return '<div class="kv"><span>'+esc(i.name)+' · '+i.qty+'대</span><b>'+wonExact(i.sup)+' + 세 '+wonExact(i.vat)+'</b></div>';}):g.itemList.map(function(i){
     return '<div class="kv"><span>'+esc(i.name)+' · '+i.qty+'대 × '+wonExact(i.price)+'</span><b>'+wonExact(i.price*i.qty)+'</b></div>';})).join("")+''')

# 6) 대표님 10/18 «사진으로 채우면 이메일 · 전화도»(체크와 같게) — 거래처 부품 cpt 1.0 → 1.3(체크 v47.1~ · 보안 통과) · CSS 1.0 → 1.1(높이 43/42)
import os as _os
_P = _os.path.join(_os.path.dirname(BASE), "체크", "부품")
def _r(n): return open(_os.path.join(_P, n), encoding="utf-8").read()
rep(_r("거래처_부품.js"), _r("거래처_부품_1.3.js"))
rep(_r("거래처_부품.css"), _r("거래처_부품_1.1.css"))
# 사진 읽기 글 — 등록증에 손으로 적은 이메일 · 전화도 읽게
rep('''  '형식: {"bizNo":"000-00-00000","bizName":"상호","ceo":"대표자","addr":"사업장 주소","upte":"업태","jongmok":"종목"}\\n'+
  '- 없는 값은 빈 문자열로 두세요.';
function wPtSaveCompany(c){''',
'''  '형식: {"bizNo":"000-00-00000","bizName":"상호","ceo":"대표자","addr":"사업장 주소","upte":"업태","jongmok":"종목","tel":"전화번호","email":"이메일"}\\n'+
  '- 없는 값은 빈 문자열로 두세요.\\n- 이메일 · 전화번호는 인쇄된 칸이 아니어도(손글씨 · 덧붙인 글 · «세금계산서 메일주소» 같은 메모) 사진 어디에 있든 읽어 주세요.';
function wPtSaveCompany(c){''')
rep('''    readPhoto('사업자등록증 사진이에요. JSON 하나로만 답하세요.\\n형식: {"bizNo":"","bizName":"","ceo":"","addr":"","upte":"","jongmok":""}')
    .then(function(v){["bizNo","bizName","ceo","addr","upte","jongmok"].forEach(function(k){if(v[k])$("sp_"+k).value=v[k];});''',
'''    readPhoto('사업자등록증 사진이에요. JSON 하나로만 답하세요.\\n형식: {"bizNo":"","bizName":"","ceo":"","addr":"","upte":"","jongmok":"","email":"","tel":""}\\n- 이메일 · 전화번호는 인쇄된 칸이 아니어도(손글씨 · 덧붙인 글 · «세금계산서 메일주소» 같은 메모) 사진 어디에 있든 읽어 주세요.')
    .then(function(v){["bizNo","bizName","ceo","addr","upte","jongmok","email"].forEach(function(k){var el=$("sp_"+k);if(el&&v[k])el.value=v[k];});   /* v136 이메일도 */''')
rep('''var WPT_CARD='명함 사진이에요. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\\n'+''',
'''var WPT_CARD='명함 사진이에요. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요. 이메일이 있으면 꼭 넣어 주세요.\\n'+''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
