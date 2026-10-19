"""체크 v56.8 = v56.7 + «처리 중이에요» · 서버 v54 «확인 중» 이름(checking · unknown · __checking) 맞춤 (총괄 10/19 · 워시 방 검사 일꾼 지적)
쓰는 법: python3 체크/도구/만들기_체크_v56.8.py   (v56.7 은 읽기만)
  ① 같은 일 표시(rid): 서버가 «처리 중이에요» 또는 «확인 중…»으로 답하면 결과를 모르는 것으로 보고 다시 할 때 같은 rid 를 써요(예전엔 새 rid)
  ② 보내기 결과: checking:true · unknown:true 도 «확인 중»으로 · 배달 다시 보내기 확인 중 수는 unsure · checking 칸
  ③ 보내기 창구에서 «처리 중이에요»도 «확인 중 — 보낸 기록에서 확인»처럼 보여요(다시 하기 없음)
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.7.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.8.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "1cfe2a9c6dec": raise SystemExit("v56.7 이 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.7", date:"10/19"', 'ver:"체크 v56.8", date:"10/19"')
rep('$("hdVer").textContent="체크 v56.7 · "', '$("hdVer").textContent="체크 v56.8 · "')
rep('<!-- 체크 v56.7 (', '<!-- 체크 v56.8 (v56.7 + 처리 중 · 확인 중이면 같은 rid · 서버 v54 이름) · 체크 v56.7 (')
rep('function unknown(m){ return /연결이 잠시 끊겼|서버에서 답을 받지 못했|Failed to fetch|NetworkError|Load failed|timed? ?out/i.test(String(m||"")); }',
    'function unknown(m){ return /연결이 잠시 끊겼|서버에서 답을 받지 못했|Failed to fetch|NetworkError|Load failed|timed? ?out|^처리 중이에요|^확인 중/i.test(String(m||"")); }   /* v56.8: 서버가 처리 중 · 확인 중이면 결과를 모름 — 다시 할 때 같은 rid */')
rep('function unsure(x){ return !!x && (x.unsure===true || x.state==="확인 중" || /^확인 중/.test(String(x.why||""))); }',
    'function unsure(x){ return !!x && (x.unsure===true || x.unknown===true || x.checking===true || x.state==="확인 중" || /^확인 중/.test(String(x.why||""))); }   /* v56.8: 서버 v54 checking · unknown */')
rep('function isUnsureErr(e){ return !!e && (e.unsure===true || /^확인 중/.test(String(e.message||""))); }',
    'function isUnsureErr(e){ return !!e && (e.unsure===true || /^확인 중|^처리 중이에요/.test(String(e.message||""))); }')
rep('else if(fn==="deliv_resend"){ u=Number(r.unsure)||0;', 'else if(fn==="deliv_resend"){ u=Number(r.unsure)||Number(r.checking)||0;')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
