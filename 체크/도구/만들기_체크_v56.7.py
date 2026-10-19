"""체크 v56.7 = v56.6 + 알림 «확인 중»(결과 불명) 바르게 (출시마감 3차 · 운영/긴급/2026-10-19_출시마감_3차_요청.md «체크» 줄)
쓰는 법: python3 체크/도구/만들기_체크_v56.7.py   (v56.6 은 읽기만 · 덮어쓰지 않아요)
  ① 체크/도구/v56.7_확인중.js — 보내기 답을 바깥에서 골라 «확인 중 — 보낸 기록에서 확인해 주세요»(노란 칩 · 정보 글 · «보낸 기록 보기») · 다시 하기 단추 없음
  ② 배달 기록 알림 칸 · 상세 창 · 보낸 기록 상태 · 밀린 달 한꺼번에 결과에 «확인 중»
  돈 셈 함수는 고치지 않아요.
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.6.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.7.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "f2ac0f2ef259": raise SystemExit("v56.6 이 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.6", date:"10/19"', 'ver:"체크 v56.7", date:"10/19"')
rep('$("hdVer").textContent="체크 v56.6 · "', '$("hdVer").textContent="체크 v56.7 · "')
rep('<!-- 체크 v56.6 (', '<!-- 체크 v56.7 (v56.6 + 알림 «확인 중» · 출시마감 3차 10/19) · 체크 v56.6 (')
# ② 배달 기록 — 서버 발송결과 «확인 중»
rep('var alarm = r.발송결과==="성공" ? "보냄" : r.발송결과==="실패" ? "못 보냄" : "안 보냄";',
    'var alarm = r.발송결과==="성공" ? "보냄" : r.발송결과==="실패" ? "못 보냄" : r.발송결과==="확인 중" ? "확인 중" : "안 보냄";   /* v56.7 */')
rep('(d.alarm==="보냄"?" · 보냄":d.alarm==="못 보냄"?" · 실패":" · 시험")',
    '(d.alarm==="보냄"?" · 보냄":d.alarm==="못 보냄"?" · 실패":d.alarm==="확인 중"?" · 확인 중 — 보낸 기록에서 확인해 주세요":" · 시험")')
# 보낸 기록 상태 «확인 중» — 노란(진행) 색
rep('function slSt(v,r){ var k=/실패/.test(v)?"stop":/대기/.test(v)?"run":',
    'function slSt(v,r){ var k=/실패/.test(v)?"stop":/대기|확인 중/.test(v)?"run":')
# 밀린 달 한꺼번에 — 확인 중은 «못 보냄»과 따로
rep('''    else tell(won(out.length-ok)+"명에게 못 보냈어요", CGG.list(out.filter(function(x){ return !x.ok; }).map(function(x){ return x.item.name+" — "+whyKo(x.why); }))+(ok?won(ok)+"명에게는 보냈어요.":""));''',
    '''    else { var un=out.filter(function(x){ return !x.ok && /^확인 중/.test(String(x.why||"")); }), bad=out.filter(function(x){ return !x.ok && un.indexOf(x)<0; });   /* v56.7 */
      if(!bad.length) bar(won(ok)+"명에게 보냈어요. 확인 중 "+won(un.length)+"명 — 보낸 기록에서 확인해 주세요. 다시 보내지 마세요.","info");
      else tell(won(bad.length)+"명에게 못 보냈어요", CGG.list(bad.map(function(x){ return x.item.name+" — "+whyKo(x.why); }))+(un.length?"확인 중 "+won(un.length)+"명 — 보낸 기록에서 확인해 주세요. ":"")+(ok?won(ok)+"명에게는 보냈어요.":"")); }''')
# ① 감싸기 — v56.6 감싸기 바깥(맨 끝)
rep("</body>", open(os.path.join(HERE, "v56.7_확인중.js"), encoding="utf-8").read() + "</body>")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
