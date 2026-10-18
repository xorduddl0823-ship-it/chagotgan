"""관리 v4.8.3 만들기 — v4.8.2(보안 통과)에 워시 서버 sb24 «hqPayments 줄마다 refunded(환불됨)»를 맞춰요.
쓰는 법: python3 관리/만들기_관리_v4.8.3.py   (v4.8.2 파일은 읽기만)
- 결과: 관리/3_차곳간_관리_index_v4.8.3.html
- 바꾸는 것: refunded===true 인 결제 줄은 세금계산서 단추 없음 + «환불된 결제» 표시 (결제 기록에서 발행 표 · 결제 건 창 · 세금계산서 창)
- 서버가 refunded 를 안 주면(sb23) 지금처럼. 새 서버 창구 없음. 서버 sb24 와 같이 올려요.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.8.2.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.8.3.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.8.2 · 공통 1.5 · 2026-10-18";', 'var ADM_VER="관리 v4.8.3 · 공통 1.5 · 2026-10-18";')

# 결제 기록에서 발행 — 환불된 결제
rep('''function taxPayState(p){ return p.status!=="paid"?"wait":(taxPaid(p.id)?"done":"todo"); }''',
    '''function taxPayState(p){ return p.status!=="paid"?"wait":(taxPaid(p.id)?"done":(p.refunded===true?"refund":"todo")); }''')
rep('''    tabs:[["","전체"],["todo","보낼 것"],["done","발행함"],["wait","결제 전"]], tabOf:function(r){ return r.st; },''',
    '''    tabs:[["","전체"],["todo","보낼 것"],["done","발행함"],["wait","결제 전"],["refund","환불된 결제"]], tabOf:function(r){ return r.st; },''')
rep('''        return r.st==="done"?'<span class="cgg-st done">발행함</span>':r.st==="todo"?''',
    '''        return r.st==="done"?'<span class="cgg-st done">발행함</span>':r.st==="refund"?'<span class="cgg-st stop">환불된 결제</span>':r.st==="todo"?''')
rep('''          :r.st==="wait"?'<span class="hint" style="margin:0">결제 완료 뒤 발급돼요</span>':''; }}''',
    '''          :r.st==="wait"?'<span class="hint" style="margin:0">결제 완료 뒤 발급돼요</span>'
          :r.st==="refund"?'<span class="hint" style="margin:0">세금계산서 안 돼요</span>':''; }}''')
rep('''  if(p.status!=="paid") return toast("세금계산서는 결제 완료 뒤 발급돼요");''',
    '''  if(p.status!=="paid") return toast("세금계산서는 결제 완료 뒤 발급돼요");
  if(p.refunded===true) return toast("환불된 결제라 세금계산서를 보낼 수 없어요");''')
# 세금계산서 창
rep('''  if(!sh || !pay || pay.status!=="paid" || String(pay.shop)!==String(code)) return''',
    '''  if(!sh || !pay || pay.status!=="paid" || pay.refunded===true || String(pay.shop)!==String(code)) return''')
# 결제 건 창
rep('''    (p.status==="paid" && p.shop && p.shop!=="ADMIN"
      ? '<button class="btn primary" id="pTax" style="width:100%;margin-top:10px">세금계산서 보내기</button>'
      : p.status==="ready"''',
    '''    (p.status==="paid" && p.refunded===true
      ? '<div class="hint" style="margin-top:10px"><span class="cgg-st stop">환불된 결제</span> 세금계산서를 보낼 수 없어요.</div>'
      : p.status==="paid" && p.shop && p.shop!=="ADMIN"
      ? '<button class="btn primary" id="pTax" style="width:100%;margin-top:10px">세금계산서 보내기</button>'
      : p.status==="ready"''')

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
