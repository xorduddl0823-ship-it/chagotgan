"""딜러앱 화면 d3.1 → d3.2 새 판을 만든다. 바탕 파일과 공통 부품은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.2.py   (바탕: 딜러/3_딜러앱_화면_d3.1 — 저장소에 있는 그대로)
결과: 딜러/3_딜러앱_화면_d3.2/
바꾸는 것: 공통 부품 cgg-j4 1.0 → 1.1 (디자인/공통/) 로 다시 묶고,
           딜러가 따로 70으로 올렸던 확인 창 · 알림 글 층을 공통 이름표로 (cgg-dialog 90 · cgg-toast 100)
그 밖의 화면 · 서버 연결은 d3.1 과 같음"""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.1"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.2"
J4CSS = open(ROOT + "/디자인/공통/cgg-j4.css", encoding="utf-8").read()
J4JS = open(ROOT + "/디자인/공통/cgg-j4.js", encoding="utf-8").read()
assert "cgg-j4 1.1" in J4CSS and 'version:"cgg-j4 1.1"' in J4JS, "공통 부품이 1.1 이 아니에요"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

HEAD = "/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.0"

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.1 (2026-10-15, J안 4판 · 공통 부품 cgg-j4 1.0",
    "<!-- 차곳간 딜러앱 화면 · 판 d3.2 (2026-10-15, J안 4판 · 공통 부품 cgg-j4 1.1")
rep('var VER="d3.1";', 'var VER="d3.2";')

# 2) 공통 부품 CSS 1.0 → 1.1 (style 맨 끝 덩어리 통째로)
a = s.index(HEAD); b = s.index("</style>", a)
s = s[:a] + J4CSS + "\n" + s[b:]
# 3) 공통 부품 JS 1.0 → 1.1 («시작» 바로 앞 덩어리 통째로)
a = s.index(HEAD); b = s.index("/* ---------- 시작 ---------- */", a)
s = s[:a] + J4JS + "\n" + s[b:]
assert "cgg-j4 1.0" not in s

# 4) 층 — 숫자 대신 공통 이름표
rep(".cgg-app .sheet-wrap{position:fixed;z-index:70}", ".cgg-app .sheet-wrap{position:fixed}")
rep(".cgg-app .toast{position:fixed;z-index:70;", ".cgg-app .toast{position:fixed;")
rep("""'<div class="sheet-wrap" data-act="close">""", """'<div class="sheet-wrap cgg-dialog" data-act="close">""")
rep("""'<div class="toast" role="status">""", """'<div class="toast cgg-toast" role="status">""")

# 5) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
