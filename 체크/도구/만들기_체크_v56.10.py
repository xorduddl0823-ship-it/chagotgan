"""체크 v56.10 = v56.9 + 배달 «도착 알림» 켜기/끄기 스위치 (총괄 11/2 · 대표님 요청)
쓰는 법: python3 체크/도구/만들기_체크_v56.10.py   (v56.9 는 읽기만 · 운영 중이라 덮어쓰지 않아요)
  ① 체크/도구/v56.10_알림스위치.js — 홈 «오늘 할 일» 위 · 배달 기간 줄 위 한 줄 스위치 · 대표만 · 확인 창 ·
     저장 deliv_saveConf({arrive_on}) 뒤 deliv_conf 로 다시 읽어 확인 · 서버가 arrive_on 칸을 안 주면(v54) 잠금 «서버 준비 중»
  ② 배달 기록: 서버 발송결과 «꺼짐»(알림 꺼진 동안 도착) → 알림 칸 «꺼짐» · 상세 창 «알림 꺼짐» · 고른 줄 다시 보내기 확인 창에 «지금 꺼져 있어요»
  돈 셈 · 보내기 함수 본문 · rid · «확인 중» 처리는 그대로.
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.9.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.10.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "8e730b3fbb8f": raise SystemExit("v56.9 가 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.9", date:"10/20"', 'ver:"체크 v56.10", date:"11/2"')
rep('$("hdVer").textContent="체크 v56.9 · "', '$("hdVer").textContent="체크 v56.10 · "')
rep('<!-- 체크 v56.9 (', '<!-- 체크 v56.10 (v56.9 + 배달 도착 알림 켜기/끄기 · 11/2) · 체크 v56.9 (')
# ② 서버 발송결과 «꺼짐»
rep('r.발송결과==="확인 중" ? "확인 중" : "안 보냄";   /* v56.7 */',
    'r.발송결과==="확인 중" ? "확인 중" : r.발송결과==="꺼짐" ? "꺼짐" : "안 보냄";   /* v56.7 · v56.10: 알림 꺼진 동안 도착 */')
rep('d.alarm==="확인 중"?" · 확인 중 — 보낸 기록에서 확인해 주세요":" · 시험")',
    'd.alarm==="확인 중"?" · 확인 중 — 보낸 기록에서 확인해 주세요":d.alarm==="꺼짐"?" · 알림 꺼짐 — 꺼져 있던 동안이라 안 보냈어요":" · 시험")')
rep('return (n?"확인 중 "+won(n)+"건은 이미 나갔을 수 있어요 — 보낸 기록에서 먼저 확인해 주세요. ":"")+',
    'return (typeof DCONF!=="undefined"&&DCONF&&DCONF.arrive_on===false?"지금 도착 알림이 꺼져 있어요 — 고른 줄은 그래도 보내요. ":"")+(n?"확인 중 "+won(n)+"건은 이미 나갔을 수 있어요 — 보낸 기록에서 먼저 확인해 주세요. ":"")+')   # v56.10
# ① 스위치 — 맨 끝
rep("</body>", open(os.path.join(HERE, "v56.10_알림스위치.js"), encoding="utf-8").read() + "</body>")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
