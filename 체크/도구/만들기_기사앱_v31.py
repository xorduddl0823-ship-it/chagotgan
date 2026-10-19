"""기사 앱 v31 = v30 + 서버 v54 «확인 중» 이름 맞춤 · «처리 중이에요»도 같은 rid (10/19)
  ① 도착 답에 checking:true 가 붙으면 «기록은 됐어요 — 알림은 확인 중이에요»(발송결과 칸이 비어도)
  ② «처리 중이에요» 오류: 같은 rid 로 «다시 보내기»(새 rid 를 만들지 않음 · 서버가 한 번만 처리)
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE)
SRC = os.path.join(CHK, "driver", "index_v30.html"); OUT = os.path.join(CHK, "driver", "index_v31.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "1046bef266f6": raise SystemExit("기사 앱 v30 이 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep("<!-- 기사 앱 v30 (", "<!-- 기사 앱 v31 (v30 + 서버 v54 확인 중 이름 · 10/19) · 기사 앱 v30 (")
rep("    if(row.발송결과==='확인 중'){ unsureDone(row); return; }   /* v30 */",
    "    if(r.checking===true || row.발송결과==='확인 중'){ unsureDone(row); return; }   /* v30 · v31: 서버 v54 checking */")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, os.path.dirname(CHK)), hashlib.sha256(s.encode()).hexdigest()[:12])
