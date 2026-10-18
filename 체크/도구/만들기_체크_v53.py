"""체크 v52 → v53 — 대표님 결정(운영/04 10/18 맨 위)
  ① 입금 전 세금계산서 발급은 아예 없음 — «입금 전에 발급» 단추 · 확인 창 · 예외 길(taxIssue opt.unpaidOk)을 모두 없앰.
     입금 전 줄은 «입금 뒤 발급돼요» 한 줄(회색 · 체크 안 됨). 팝빌 발급 · 홈택스 양식 똑같이 입금 완료만.
  ② «정산 기록» 큰 메뉴를 없애고 세금계산서 안쪽 탭 «달마다 장부»로 옮김. 큰 메뉴 차례는 워시와 같게
     (홈 → 매출 → 월별 청구서 → 입·출금 내역 → 세금계산서 → 체크 전용: 배달 · 재검사 알림 → 설정). 폰 아래 탭은 홈 · 매출 · 월별 청구서 · 입·출금 · 전체.
v52(보안 통과 e68e81a · a9678cb96f10)는 읽기만. 그 밖 기능은 v52 와 같아요.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v52.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
def cut(start, end):
    """start 부터 end 앞까지 지우기 (둘 다 한 번만 있어야 함)"""
    global s
    if s.count(start) != 1 or s.count(end) != 1: raise SystemExit("못 찾음: " + start[:60])
    a = s.index(start); b = s.index(end)
    if b <= a: raise SystemExit("차례가 다름: " + start[:60])
    s = s[:a] + s[b:]

rep('ver:"체크 v52", date:"10/18"', 'ver:"체크 v53", date:"10/18"')
rep('$("hdVer").textContent="체크 v52 · "', '$("hdVer").textContent="체크 v53 · "')
rep('<!-- 체크 v52 (v51 + 검사비 서버 v44 맞춤) · ', '<!-- 체크 v53 (v52 + 입금 전 발급 없앰 · 정산 기록 → 세금계산서 › 달마다 장부) · ')

# ── ① 입금 전 발급 없앰 ──
rep(""": (r.unpaid?[{key:"early",label:"입금 전에 발급",attr:"data-txearly",val:r.id}]:[]).concat([{key:"skip",label:(r.skip?"다시 받기":"안 받음"),attr:"data-txskip",val:r.id}]); },""",
    """: (r.unpaid?[]:[{key:"skip",label:(r.skip?"다시 받기":"안 받음"),attr:"data-txskip",val:r.id}]); },""")   # 입금 전 줄은 단추 없음 — «입금 뒤 발급돼요» 한 줄만
rep('TXFIL==="bad"  ? (!t.can && !t.skip && !/입금 전/.test(t.why||""))', 'TXFIL==="bad"  ? (!t.can && !t.skip && !t.unpaid)')
rep("""   · 받을 금액이 남은 청구서는 발급 대상 · 전체 선택 · 팝빌 발급 · 홈택스 양식에서 빠지고 «입금 전 — 발급 안 함»(회색 · 체크 안 됨)
   · 예외: 줄마다 «입금 전에 발급» → 가운데 확인 창(누구에게 · 얼마 · 아직 입금 안 됨) → 그 한 장만 발급 (서버 v46 taxIssue opt.unpaidOk)""",
    """   · 받을 금액이 남은 청구서는 발급 대상 · 전체 선택 · 팝빌 발급 · 홈택스 양식에서 빠지고 «입금 뒤 발급돼요»(회색 · 체크 안 됨)
   · v53(대표님 결정): 입금 전 발급 예외는 없어요 — 단추 · 확인 창 · opt.unpaidOk 를 쓰지 않아요""")
rep("""    if(t.unpaid) t.why=p.paid>0?"입금 전 — 발급 안 함 (입금 "+won(p.paid)+"원 · 남은 "+won(p.left)+"원)":"입금 전 — 발급 안 함";""",
    """    if(t.unpaid) t.why=p.paid>0?"입금 뒤 발급돼요 (입금 "+won(p.paid)+"원 · 남은 "+won(p.left)+"원)":"입금 뒤 발급돼요";""")
cut("/* 입금 전에 발급 — 그 한 장만, 확인 창 한 번 더 */", "/* ── 홈택스 공식 양식 채우기 ── */")
rep("입금 완료 · 아직 발급 안 한 곳이 없어요. 입금 전인 곳은 줄마다 «입금 전에 발급»으로 따로 해요.",
    "입금 완료 · 아직 발급 안 한 곳이 없어요. 입금 전인 곳은 입금 뒤 발급돼요.")
rep("""  document.querySelectorAll("[data-txearly]").forEach(function(b){ b.onclick=function(){ early(b.getAttribute("data-txearly")); }; });
""", "")
rep('c.title="입금 전 — 발급 안 함";', 'c.title="입금 뒤 발급돼요";')

# ── ② 정산 기록 → 세금계산서 › 달마다 장부 ──
rep("""var JOBS=[["home","홈"],["history","정산 기록"],["sales","매출"],["bill","월별 청구서"],""",
    """/* v53(대표님 결정): «정산 기록»은 세금계산서 안쪽 탭 «달마다 장부»로 — 큰 메뉴 차례는 워시와 같게 */
var JOBS=[["home","홈"],["sales","매출"],["bill","월별 청구서"],""")
rep("""var BILLSUB=[["bill","월별 청구서"],["billgrp","청구처 묶음"],["billtpl","알림톡 템플릿"]];""",
    """var BILLSUB=[["bill","월별 청구서"],["billgrp","청구처 묶음"],["billtpl","알림톡 템플릿"]];
var TAXSUB=[["hometax","세금계산서 발행"],["history","달마다 장부"]];""")
rep("""  if(DEPSUB.some(function(x){return x[0]===p;})) return ["deposit",DEPSUB];""",
    """  if(DEPSUB.some(function(x){return x[0]===p;})) return ["deposit",DEPSUB];
  if(TAXSUB.some(function(x){return x[0]===p;})) return ["hometax",TAXSUB];""")
rep("""/* 폰 아래 탭바 5칸 — 홈 · 정산 기록 · 월별 청구서 · 입·출금 · 전체 (시안 v50) */""",
    """/* 폰 아래 탭바 5칸 — 홈 · 매출 · 월별 청구서 · 입·출금 · 전체 (v53: 정산 기록은 세금계산서 안으로) */""")
rep("""  var main=["home","history","bill","deposit"];
  CGG.tabbar($("cggTbar"),[{key:"home",icon:"home",label:"홈"},{key:"history",icon:"today",label:"정산 기록"},""",
    """  var main=["home","sales","bill","deposit"];
  CGG.tabbar($("cggTbar"),[{key:"home",icon:"home",label:"홈"},{key:"sales",icon:"chart",label:"매출"},""")
rep("""    {id:"history",label:"정산 기록",path:"정산 기록",go:"history",words:"검사 기록 차량 목록 월별 기록 지난 청구"},""",
    """    {id:"history",label:"달마다 장부 (정산 기록)",path:"세금계산서 › 달마다 장부",go:"hometax/history",words:"정산 기록 장부 검사 기록 월별 기록 지난 청구 입금 남은 금액"},""")
rep("""  return head("정산 기록","달마다 만든 청구서와 입금 · 세금계산서 결과를 모아 두는 장부예요.")+""",
    """  return head("달마다 장부","달마다 만든 청구서와 입금 · 세금계산서 결과를 모아 두는 장부예요 (예전 «정산 기록»).")+""")
rep('billtpl:"알림톡문구", hometax:"세금계산서", history:"정산기록", remind:"재검사알림",',
    'billtpl:"알림톡문구", hometax:"세금계산서", history:"달마다장부", remind:"재검사알림",')
rep("""  for(var k in HASH) if(HASH[k]===h) return k;
  return "";""", """  for(var k in HASH) if(HASH[k]===h) return k;
  if(h==="정산기록") return "history";       /* v53 전 주소(즐겨찾기)도 열려요 */
  return "";""")
# 장부 «기록 전체 엑셀 다운로드» — 표 엑셀 내려받기와 같은 길로
rep("""    ], H, {tools:'<button class="btn">기록 전체 엑셀 다운로드</button>'}))+""",
    """    ], H, {tools:'<button type="button" class="btn" id="hisXls">기록 전체 엑셀 다운로드</button>'}))+""", 2)   # 예전 정산 기록 화면(덮어써져 안 쓰임)에도 같은 줄이 있어요
rep("""AFTER.history=function(){ wireTable("his",function(){ draw(); });""",
    """AFTER.history=function(){ wireTable("his",function(){ draw(); });
  var hx=$("hisXls"); if(hx) hx.onclick=function(){ tbXls("his"); };""", 2)

open(BASE + "체크/2_차곳간_체크_index_v53.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v53.html", len(s))
