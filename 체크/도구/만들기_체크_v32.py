"""체크 v31 → 체크 v32 새 판. v31 · v29 · 운영 v21.2 는 건드리지 않는다.
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v31.py && python3 체크/도구/만들기_체크_v32.py
바꾸는 것: 결제창 v2 를 워시 v120 기준 코드로 한 글자도 다르지 않게 (규칙 3-2)
  — 워시/요청서/2026-10-15_체크_결제창v2_워시기준_맞추기.md 의 코드 그대로 (loadToss 부터 cwPay 끝까지)
  ① 비회원 customerKey 는 상수 TossPayments.ANONYMOUS  ② v1 을 불러온 뒤 v2 를 또 부르면 «새로고침» 안내로 멈춤
  + 청구서 안내 글의 옛 위치 「설정 ▸ → 자료 올리기」 → 「매출 › 자료 올리기」
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v31.html"
OUT = BASE + "2_차곳간_체크_index_v32.html"
REQ = "/home/user/chagotgan/워시/요청서/2026-10-15_체크_결제창v2_워시기준_맞추기.md"
s = open(SRC, encoding="utf-8").read()
req = open(REQ, encoding="utf-8").read()
code = req.split("```js\n", 1)[1].split("```", 1)[0].rstrip("\n") + "\n"

a = s.index("  /* 결제창 v2 (2026-10-15)")
endkey = "      cwMsg('<span style=\"color:#C0392B\">'+esc2((e&&e.message)||\"결제하지 못했습니다\")+'</span>');\n    });\n  }\n"
b = s.index(endkey, a) + len(endkey)
s = s[:a] + code + s[b:]

old = "설정 ▸ → 자료 올리기에서"
if s.count(old) != 2: raise SystemExit("옛 위치 글 수: %d" % s.count(old))
s = s.replace(old, "매출 › 자료 올리기에서")

t = '''  $("hdVer").textContent="체크 v31 · "'''
if s.count(t) != 1: raise SystemExit("판 번호")
s = s.replace(t, '''  $("hdVer").textContent="체크 v32 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
