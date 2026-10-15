"""관리 v4.3 시안 만들기 — v4.2 에 ① 받는 금액 제품별 걸러 보기 ② 계정 › 번호로 계정 찾기 를 더합니다.
쓰는 법: python3 관리/만들기_관리_v4.3.py   (먼저 v4.1 · v4.2 도구)
- 재료: 관리/3_차곳간_관리_index_v4.2.html (읽기만) · 관리/v4재료/people.js
- 결과: 관리/3_차곳간_관리_index_v4.3.html
- 근거: 대표님 지시 (결정 기록 2026-10-15) «결제 결과는 관리로, 관리에서 계정들을 다 컨트롤»
- 서버 창구 모양: 서버/설계/14 (hqPayResults · hqPerson · hqPersonAct · hqAudit, 워시 sb12 · 보안 설계 검토 중) — 확정되면 다시 맞춰요
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.2.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.3.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

# 0. J안 4판 완성 모양 — 공통 부품 cgg-j4 1.2 로 바꿔 끼우기 (v4재료/cgg_swap.py)
import sys; sys.path.insert(0, os.path.join(HERE, "v4재료")); import cgg_swap
s = cgg_swap.swap(s)
rep('var ADM_VER="관리 v4.2 · UI 3.0 · 2026-10-15";', 'var ADM_VER="관리 v4.3 · 공통 1.3 · 2026-10-15";')

# ① 결제 내역 — 제품 칸 · 제품 걸러 보기 · 제품별 이번 달 합계
PRODF = '''{k:"product", label:"제품", get:function(r){ return r.product||"wash"; },
       opts:[["","제품 전체"],["wash","워시"],["check","체크"],["dealer","딜러"]]},
      '''
rep('''    filters:[
      {k:"status", label:"상태", get:function(r){ return r.status; },
       opts:[["","상태 전체"],["ready","못 받음"],["paid","받음"],["cancel","취소"]]},''',
    '''    filters:[
      ''' + PRODF + '''{k:"status", label:"상태", get:function(r){ return r.status; },
       opts:[["","상태 전체"],["ready","못 받음"],["paid","받음"],["cancel","취소"]]},''')
rep('''      {k:"period", label:"기간", w:90, html:function(r){ return esc(r.period||"-"); }},''',
    '''      {k:"product", label:"제품", w:70, html:function(r){ return esc(PROD_NAME[r.product||"wash"]||r.product); }},
      {k:"period", label:"기간", w:90, html:function(r){ return esc(r.period||"-"); }},''')
rep('''    '<div class="tools"><button class="btn primary" id="payNew">청구 만들기</button></div>'+''',
    '''    /* 제품별 이번 달 받은 금액 */
    '<div class="hint" style="margin:0 0 10px">이번 달 제품별 · '+["wash","check","dealer"].map(function(k){
      return esc(PROD_NAME[k])+' <b>'+won(paid.filter(function(p){ return (p.product||"wash")===k && String(p.paid_at||"").slice(0,7)===ym; }).reduce(function(a,b){return a+(b.amount||0);},0))+'</b>'; }).join(" · ")+'</div>'+
    '<div class="tools"><button class="btn primary" id="payNew">청구 만들기</button></div>'+''')
# 카드 결제 목록도 제품으로 걸러 보기
rep('''    filters:[{k:"status",label:"상태",opts:[["","전체"],["결제됨","결제됨"],["기다림","기다림"],["실패","실패"],["환불됨","환불됨"]]},''',
    '''    filters:[{k:"product",label:"제품",opts:[["","제품 전체"],["워시","워시"],["체크","체크"],["딜러","딜러"]]},
             {k:"status",label:"상태",opts:[["","전체"],["결제됨","결제됨"],["기다림","기다림"],["실패","실패"],["환불됨","환불됨"]]},''')
rep('''               method:String(o.method||""), oid:String(o.order_id||""), raw:o };''',
    '''               method:String(o.method||""), oid:String(o.order_id||""), raw:o, product:(PROD_NAME[o.product||"wash"]||o.product) };''')
a = s.index('raw:o, product:(PROD_NAME'); b = s.index('{k:"shop",label:"업체",w:120},', a) + len('{k:"shop",label:"업체",w:120},')
s = s[:b] + '\n      {k:"product",label:"제품",w:70},' + s[b:]

# ② 계정 › 번호로 계정 찾기 (묶음 끝에 붙임)
rep('["users","계정 관리",viewUsers],', '["users","계정 관리",viewUsers],\n  ["ppl","번호로 계정 찾기",viewPpl],')
rep('["users","계정",["inv","users"]],', '["users","계정",["inv","users","ppl"]],')
pp = open(os.path.join(HERE, "v4재료", "people.js"), encoding="utf-8").read()
pr = open(os.path.join(HERE, "v4재료", "payres.js"), encoding="utf-8").read()
pr += "\n" + open(os.path.join(HERE, "v4재료", "paywait.js"), encoding="utf-8").read()   # 업체 › 결제 대기 · 누구나 가입 (sb13)
# 결제 내역 = 모든 제품 결제 결과 (서버 새 판이 없으면 예전 화면 viewPaysOld 로)
rep('function viewPays(){', 'function viewPaysOld(){')
# sb13 — 업체 › 결제 대기 (홈 할 일에도: 확인 필요 · 7일 지남)
rep('["lock","잠금 · 차단",viewLock],', '["lock","잠금 · 차단",viewLock],\n  ["wait","결제 대기",viewPayWait],')
rep('["shops","업체",["shops","lock"]],', '["shops","업체",["shops","lock","wait"]],')
rep('''    api("hqPayments",[]).then(function(r){ D.pays=(r&&r.payments)||[]; }),''',
    '''    api("hqPayments",[]).then(function(r){ D.pays=(r&&r.payments)||[]; }),
    api("hqPayWait",[]).then(function(r){ PW.list=(r&&r.list)||[]; PW.loaded=true; },function(){ PW.list=null; }),''')
rep('''  var todos = memoTodos.concat([
    [unpaid.length,"못 받은 금액",''', '''  var todos = memoTodos.concat([
    [pwNeed.length,"결제 대기 · 확인할 업체", pwNeed.length?names(pwNeed,function(x){return (x.paidOrder?"돈 냄 · ":"")+(x.name||x.shop);}):"7일 넘게 결제를 안 한 곳", go("wait"), pwNeed.some(function(x){return x.paidOrder;})?"imp":undefined],
    [unpaid.length,"못 받은 금액",''')
rep('''  var todos = memoTodos.concat([''', '''  var pwNeed = (PW.list||[]).filter(function(x){ return x.paidOrder || Number(x.days)>=7; });
  var todos = memoTodos.concat([''')
rep('function navOf(t){', pp + '\n' + pr + '\nfunction navOf(t){')
# 결제 결과 화면에서 환불하면 그 목록도 다시 불러오기
rep('closeSheet(); toast("환불했어요 · "+won((r&&r.amount)||w)+((r&&r.note)?" · "+r.note:"")); pgLoad();',
    'closeSheet(); toast("환불했어요 · "+won((r&&r.amount)||w)+((r&&r.note)?" · "+r.note:"")); pgLoad(); if($("prBody")) prLoad();')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
