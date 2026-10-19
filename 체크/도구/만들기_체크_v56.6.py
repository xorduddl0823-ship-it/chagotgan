"""체크 v56.6 = v56.5 + 기록 저장 믿음 · 알림 결과 바로 보이기 (대표님 10/19 최우선 · 운영/긴급/2026-10-19_기록_알림톡_출시마감_요청.md «체크» 줄)
쓰는 법: python3 체크/도구/만들기_체크_v56.6.py   (v56.5 는 읽기만 · 덮어쓰지 않아요)
  ① 체크/도구/v56.6_기록.js — 서버 부르기(call)를 바깥에서 감싸요(본문 그대로): 같은 일 표시 rid · 겹침 막기 · 단추 잠그기 · 실패하면 «다시 하기»
  ② 배달 기록 «다시 보내기» 여러 건: 실패가 있으면 초록(성공) 대신 빨간 글
  ③ 보낸 방법 글: 문자 → «문자(단문)» · «문자(장문)» (알림톡이 안 돼 문자로 간 것을 구분)
  ④ 검사자 수수료 안내 글: «이 PC에 적어 뒀어요 …다음 서버 판부터» → 서버에 저장된다는 지금 말
  돈 셈 함수는 고치지 않아요(돈코드_지문 48개 · 전체검사 123개 같음).
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.5.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.6.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "4930d1074c30": raise SystemExit("v56.5 가 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.5", date:"10/19"', 'ver:"체크 v56.6", date:"10/19"')
rep('$("hdVer").textContent="체크 v56.5 · "', '$("hdVer").textContent="체크 v56.6 · "')
rep('<!-- 체크 v56.5 (', '<!-- 체크 v56.6 (v56.5 + 기록 저장 믿음 · 알림 결과 · 대표님 10/19 최우선) · 체크 v56.5 (')
# ② 다시 보내기 여러 건 — 실패가 있으면 빨간 글
rep('bar("다시 보냄 — 성공 "+won((r&&r.ok)||0)+"건 · 실패 "+won((r&&r.bad)||0)+"건","ok");',
    'bar("다시 보냄 — 성공 "+won((r&&r.ok)||0)+"건 · 실패 "+won((r&&r.bad)||0)+"건"+((r&&r.bad)?" — 실패한 줄은 «알림» 칸에서 까닭을 보고 다시 보내 주세요.":""),(r&&r.bad)?"err":"ok");   /* v56.6 */')
# ③ 보낸 방법 — 알림톡이 안 돼 문자로 간 것을 구분
rep('return h==="ata"?"알림톡":h==="mms"?"사진 문자":(h==="lms"||h==="sms")?"문자":"—";',
    'return h==="ata"?"알림톡":h==="mms"?"사진 문자":h==="lms"?"문자(장문)":h==="sms"?"문자(단문)":"—";   /* v56.6 */')
# ④ 검사자 수수료 안내 — 서버(feeRules)에 저장돼요
rep("이 PC에 적어 뒀어요. 모든 PC · 청구서에 들어가는 것은 다음 서버 판부터예요.",
    "바꾸면 바로 서버에 저장돼요. 저장이 안 되면 맨 위에 빨간 글이 떠요.")
# ① 감싸기 — 맨 끝(모든 화면 함수가 만들어진 뒤)
rep("</script>\n</body>", "</script>\n" + open(os.path.join(HERE, "v56.6_기록.js"), encoding="utf-8").read() + "</body>")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
