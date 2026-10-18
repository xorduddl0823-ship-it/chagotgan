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
'''    var ba=billAmt(G.amount,G.taxOn),v={sup:ba.supply,vat:ba.vat};   /* v136 청구서와 같은 셈 — 합계 = 공급가액 + 세액 */''')

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

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
