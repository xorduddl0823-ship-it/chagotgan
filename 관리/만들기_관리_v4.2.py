"""관리 v4.2 시안 만들기 — v4.1 에 «카드 결제» 환불(금액 미리 보기 · 확정)과 자동 결제 스위치를 더합니다.
쓰는 법: python3 관리/만들기_관리_v4.2.py   (먼저 python3 관리/만들기_관리_v4.1.py)
- 재료: 관리/3_차곳간_관리_index_v4.1.html (읽기만) · 관리/v4재료/refund.js
- 결과: 관리/3_차곳간_관리_index_v4.2.html
- 근거: 결제/요청서/2026-10-15_관리_환불화면_자동결제스위치.md · 서버 워시 sb10 (hqPgQuote · hqPgCancel · hqBillingOn)
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.1.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.2.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.1 · UI 3.0 · 2026-10-15";', 'var ADM_VER="관리 v4.2 · UI 3.0 · 2026-10-15";')
# 테스트 열쇠면 제목 옆에 «테스트 모드»
rep('''    '<h2>카드 결제</h2>'+''', '''    '<h2>카드 결제'+(pgTestMode()?' <span class="pill wait">테스트 모드</span>':'')+'</h2>'+''')
# 자동 결제 스위치 카드 — 결제 내역 위
rep('''  h+='<div class="card"><h2>결제 내역</h2><div id="pgT"></div></div>';''',
    '''  h+=billCard();
  h+='<div class="card"><h2>결제 내역</h2><div id="pgT"></div></div>';''')
# 상태 이름: 취소됨 → 환불됨 (카드 결제를 돌려준 것)
rep('var ST={ready:"기다림",paid:"결제됨",failed:"실패",canceled:"취소됨"};', 'var ST={ready:"기다림",paid:"결제됨",failed:"실패",canceled:"환불됨"};')
rep('["취소됨","취소됨"]]}', '["환불됨","환불됨"]]}')
rep('''var c=r.status==="결제됨"?"ok":(r.status==="취소됨"||r.status==="실패"?"":"wait");''',
    '''var c=r.status==="결제됨"?"ok":(r.status==="환불됨"?"gray":(r.status==="실패"?"off":"wait"));''')
# 줄마다 [취소] → [환불]
rep('''        return r.status==="결제됨" ? '<span class="btn sm danger" data-cancel="'+esc(r.oid)+'">취소</span>' : ''; }}''',
    '''        return r.status==="결제됨" ? '<button type="button" class="btn sm" data-refund="'+esc(r.oid)+'">환불</button>' : ''; }}''')
a = s.index('  Array.prototype.forEach.call(document.querySelectorAll("[data-cancel]"),function(b){')
b = s.index('});\n}', a) + len('});\n')
s = s[:a] + '''  billBind();
  /* 줄마다 [환불] — 서버가 셈한 금액을 보고 확정 (결제 방 요청서) */
  Array.prototype.forEach.call(document.querySelectorAll("[data-refund]"),function(b){
    b.onclick=function(ev){
      ev.stopPropagation();
      var oid=b.getAttribute("data-refund");
      var o=(PG.orders||[]).filter(function(x){ return String(x.order_id)===oid; })[0]||{};
      refundSheet(oid,{shop:(PG.names[o.shop]||o.shop||""), kind:(o.kind==="plan"?"이용요금":"캐시 충전")});
    };
  });
''' + s[b:]
rf = open(os.path.join(HERE, "v4재료", "refund.js"), encoding="utf-8").read()
cw = open(os.path.join(HERE, "v4재료", "wallet.js"), encoding="utf-8").read()
rep('function navOf(t){', rf + '\n' + cw + '\nfunction navOf(t){')
# 받는 금액 › 체크 지갑 잇기 (묶음 끝에 붙임 — 원래 화면 차례 그대로)
rep('["pg","카드 결제",viewPg],', '["pg","카드 결제",viewPg],\n  ["cwal","체크 지갑 잇기",viewCwal],')
rep('["pays","받는 금액",["plans","pays","packs","pg"]],', '["pays","받는 금액",["plans","pays","packs","pg","cwal"]],')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
