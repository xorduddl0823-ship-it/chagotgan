"""관리 v4.4 만들기 — v4.3(보안 통과)에 디자인 «표 완성 기준» 10가지를 맞춰요 (공통 부품 cgg-j4 1.4).
쓰는 법: python3 관리/만들기_관리_v4.4.py   (v4.3 파일은 읽기만)
- 재료: 관리/3_차곳간_관리_index_v4.3.html · 관리/v4재료/table44.js · 디자인/공통/cgg-j4.css · cgg-j4.js (1.4, 글자 그대로)
- 결과: 관리/3_차곳간_관리_index_v4.4.html
- 바꾸는 것: 표 그리는 함수 makeTable 하나 (부르는 23곳은 그대로) + 공통 부품 1.3 → 1.4 + 결제 내역 · 결제 대기의 상태 탭을 표 안으로
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, "..", "디자인", "공통")
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.3.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.4.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.3 · 공통 1.3 · 2026-10-15";', 'var ADM_VER="관리 v4.4 · 공통 1.4 · 2026-10-15";')

# 1. 공통 부품 1.3 → 1.4 (CSS 는 맨 마지막 <style> 끝, JS 는 제품 스크립트 앞 — 글자 그대로)
cggcss = open(os.path.join(G, "cgg-j4.css"), encoding="utf-8").read()
cggjs = open(os.path.join(G, "cgg-j4.js"), encoding="utf-8").read()
assert "cgg-j4 1.4" in cggcss and "cgg-j4 1.4" in cggjs
a = s.index("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n") + len("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n")
b = s.index("</style>", a)
s = s[:a] + cggcss + "\n" + s[b:]
a = s.index("<script>\n/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품")
a += len("<script>\n")
b = s.index("</script>", a)
s = s[:a] + cggjs + "\n" + s[b:]

# 2. 표 그리는 함수 — 공통 표와 같은 모양 · 같은 이름표 (v4재료/table44.js)
a = s.index("var TSTATE = {};\nfunction makeTable(o){")
b = s.index("/* =========================================================\n   자료 보관")
s = s[:a] + open(os.path.join(HERE, "v4재료", "table44.js"), encoding="utf-8").read().split("   ========================================================= */\n", 1)[1] + "\n" + s[b:]

# 3. 거르기 알약 안의 고르기 상자 (관리 몫 — 공통 알약 모양 그대로, 안에 고르기만)
rep("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */",
    "/* 관리 v4.4 — 거르기 알약 안 고르기 상자 · 표 안 꼬리표 */\n"
    ".cgg-fp.jfp{text-align:center}\n"
    ".cgg-fp.jfp select{border:0;background:transparent;font:inherit;font-weight:inherit;color:inherit;height:auto;width:auto;padding:0;margin:0;cursor:pointer;outline:0;max-width:200px;line-height:normal;-webkit-appearance:none;appearance:none}\n"
    "/* 예전 관리 표 · 글자 규칙이 공통 표에 새지 않게 (줄 높이 · 머리 고정 · 칸 맞춤 · 고르기 너비 · 폰 글자) */\n"
    ".cgg-card{line-height:normal}\n"
    ".cgg-card .cgg-table th:not(.fx0):not(.fx1){position:static}\n"
    ".cgg-card .cgg-table td:not(.n):not(.c):not(.fx0){text-align:start}\n"
    ".cgg-card .cgg-st{text-align:inherit}\n"
    ".cgg-card select{width:auto;min-width:0;max-width:none;margin:0}\n"
    ".cgg-card .cgg-find input{height:auto;padding:1px 2px;border:0;box-shadow:none;margin:0;min-width:0;max-width:none;border-radius:0}\n"
    "@media (max-width:600px){ .cgg-card{font-size:15px} }\n"
    ".cgg-table td .cgg-st+.cgg-st{margin-left:4px} .cgg-table td.mono{font-family:ui-monospace,Menlo,monospace;font-size:13px}\n"
    ".card>.cgg-card{box-shadow:none;margin:0}\n"
    "/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */")

# 4. 결제 내역 — 상태 탭(전체 · 결제됨 · 결제 중 · 실패 · 환불됨)을 표 안으로
rep("""  var rows=all.filter(function(r){ return !PR2.st || prStK(r)===PR2.st; });""", """  var rows=all;""")
a = s.index("""    '<div class="cgg-tabsH" role="tablist" id="prSt" """); b = s.index("""    '<div id="tPR"></div>';""", a)
s = s[:a] + s[b:]
rep("""  Array.prototype.forEach.call(document.querySelectorAll("[data-pst]"),function(b){
    b.onclick=function(){ PR2.st=b.getAttribute("data-pst"); prDraw(); }; });
""", "")
rep("""  makeTable({ id:"tPR", sortKey:"at", sortDir:"desc",""",
    """  makeTable({ id:"tPR", sortKey:"at", sortDir:"desc", tabs:PR_ST, tabOf:function(r){ return prStK(r.raw); },""")
rep("""    filters:[{k:"tk",label:"제품",opts:PR_TAGS},
             {k:"status",label:"상태",opts:[["","상태 글 전체"]].concat(rows.map(function(r){ return String(r.status||""); }).filter(function(v,i,a){ return v&&a.indexOf(v)===i; }).map(function(v){ return [v,v]; }))}],""",
    """    filters:[{k:"tk",label:"제품",opts:PR_TAGS}],""")
# 결제 대기 — 상태 탭 넷
rep("""  makeTable({ id:"tPW", sortKey:"", """,
    """  makeTable({ id:"tPW", sortKey:"", tabs:[["","전체"],["chk","확인 필요"],["wait7","7일 지남"],["stop","30일 지남"],["run","결제 기다림"]], tabOf:function(r){ return r.k; },""")
rep("""    filters:[{k:"k",label:"상태",opts:[["","상태 전체"],["chk","확인 필요"],["wait7","7일 지남"],["stop","30일 지남"],["run","결제 기다림"]]}],
""", "")

s = s.replace("관리 v4.3 (2026-10-15) · 공통 부품 cgg-j4 1.3 위에", "관리 v4.4 (2026-10-15) · 공통 부품 cgg-j4 1.4 위에")
s = s.replace("디자인 방 공통 부품 cgg-j4 1.3 (CGG) 를 써요", "디자인 방 공통 부품 cgg-j4 1.4 (CGG) 를 써요")
# 시각은 번호 칸 너비(130)에 맞게 «10-14 09:00» (연도는 기간 칸에 있음) — 정렬은 그대로 시간 순
rep('''return { i:i, at:String(r.at||"").slice(0,16).replace("T"," "),''', '''return { i:i, at:String(r.at||"").slice(5,16).replace("T"," "),''')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
