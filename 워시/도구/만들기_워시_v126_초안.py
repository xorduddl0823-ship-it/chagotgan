"""워시 v125 → v126 초안 (시험판 교체는 총괄 승인 뒤 · 대표님 시험 ① 뒤 모아 두는 판)
쓰는 법: 만들기_워시_v125 다음에
모아 둔 것:
  1) 번호판 사진 읽기 실패 글 — 서버가 준 쉬운 우리말(예: «체험판 AI 읽기 3번을 모두 쓰셨습니다…» · «오늘 한도를 다 썼습니다…»)을
     그대로 보여 줘요. v124~v125 는 늘 «번호 자동 읽기를 지금 쓸 수 없어요» 한 줄로 바꿔 버려서 체험판 3번 한도 안내가 안 보였음.
  2) (자리) 디자인 방 «폰에서 깨지는 곳» 목록 — 받으면 여기에 더함
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v125.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v126.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS in s and JS in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v125 · UI 3.0 · 2026-10-16";', 'var APP_VER="워시 v126 · UI 3.0 · 2026-10-16";')
# 1) 번호판 읽기 실패 글
rep('''  if(/429|rate/.test(m))return "번호 자동 읽기가 잠시 바빠요. 잠시 뒤 다시 시도해 주세요.";
  return "번호 자동 읽기를 지금 쓸 수 없어요. 번호를 직접 넣어 주세요.";''',
    '''  if(/429|rate/.test(m))return "번호 자동 읽기가 잠시 바빠요. 잠시 뒤 다시 시도해 주세요.";
  return kmsg(e,"번호 자동 읽기를 지금 쓸 수 없어요. 번호를 직접 넣어 주세요.");   /* v126: 서버의 쉬운 글(체험 3번 · 하루 한도)은 그대로 */''')
rep('''    plateMsg("번호를 읽지 못했어요 — "+friendlyAi(e),"warn");''', '''    plateMsg(friendlyAi(e),"warn");''')
assert CSS in s and JS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
