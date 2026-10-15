"""체크 v40 → 체크 v41 — 한 줄: 알림톡 템플릿 화면 «대체발송: 끔» → «알림톡이 안 되면 문자로 자동»
(서버 방 확인: 체크 notifyOne 은 늘 대체 발송 켜짐 — disableSms:false + 문자 글, 알림톡 거절되면 서버가 이어서 문자). v40 은 읽기만.
쓰는 법: python3 체크/도구/만들기_체크_v41.py
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v40.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('["대체발송","끔"]', '["대체발송","알림톡이 안 되면 문자로 자동"]')
rep('$("hdVer").textContent="체크 v40 · "', '$("hdVer").textContent="체크 v41 · "')
open(BASE + "2_차곳간_체크_index_v41.html", "w", encoding="utf-8").write(s)
print("OK v41", len(s))
