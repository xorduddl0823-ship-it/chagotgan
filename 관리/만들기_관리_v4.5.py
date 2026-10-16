"""관리 v4.5 만들기 — v4.4(보안 통과)의 공통 부품을 동결판 cgg-j4 1.5 로 바꿔 끼워요. 대표님 시험판.
쓰는 법: python3 관리/만들기_관리_v4.5.py   (v4.4 파일은 읽기만)
- 재료: 관리/3_차곳간_관리_index_v4.4.html · 디자인/공통/cgg-j4.css · cgg-j4.js (1.5, 글자 그대로)
- 결과: 관리/3_차곳간_관리_index_v4.5.html
- 1.4 → 1.5 에 맞춘 것: 할 일 칸 150 · 일괄 버튼은 거르기 줄 오른쪽(검색 앞), 고른 줄이 없으면 꺼짐 · 고른 수 표시
  (다시 그려도 상태 유지 · 칸 안 HTML 은 관리 표가 이미 해요)
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, "..", "디자인", "공통")
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.4.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.5.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.4 · 공통 1.4 · 2026-10-15";', 'var ADM_VER="관리 v4.5 · 공통 1.5 · 2026-10-15";')
cggcss = open(os.path.join(G, "cgg-j4.css"), encoding="utf-8").read()
cggjs = open(os.path.join(G, "cgg-j4.js"), encoding="utf-8").read()
assert "cgg-j4 1.5" in cggcss and "cgg-j4 1.5" in cggjs
a = s.index("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n") + len("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n")
b = s.index("</style>", a)
s = s[:a] + cggcss + "\n" + s[b:]
a = s.index("<script>\n/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품") + len("<script>\n")
b = s.index("</script>", a)
s = s[:a] + cggjs + "\n" + s[b:]
s = s.replace("공통 부품 cgg-j4 1.4", "공통 부품 cgg-j4 1.5")

# 표 — 1.5 값
rep("var TWID = {name:180,id:130,text:0,date:96,num:96,money:130,state:104,time:84,act:120};",
    "var TWID = {name:180,id:130,text:0,date:96,num:96,money:130,state:104,time:84,act:150};   /* 1.5: 할 일 150 */")
rep("""      (o.bulk?'<button type="button" class="cgg-btn sm danger" id="'+o.id+'_bulk">고른 줄 처리</button>':'')+
      '<span class="sp"></span><label class="cgg-find">'""",
    """      '<span class="sp"></span>'+
      (o.bulk?(function(){ var n=Object.keys(st.sel).filter(function(k){ return st.sel[k]; }).length;   /* 1.5: 일괄 버튼은 검색 앞 · 고른 줄 없으면 꺼짐 */
        return '<button type="button" class="cgg-btn sm danger" id="'+o.id+'_bulk" data-bulk="1"'+(n?'':' disabled')+'>고른 줄 처리'+(n?' ('+n+')':'')+'</button>'; })():'')+
      '<label class="cgg-find">'""")
# 보안 규칙 ② (보안/검사기록/2026-10-15_공통부품_cgg-j4_1.5.md): 자료를 새로 받아 표를 새로 그리면 고른 줄을 비워요 (정렬 · 쪽 · 탭에서는 그대로)
rep("  if(!st.f) st.f = {};\n  var host = $(o.id);", "  if(!st.f) st.f = {};\n  st.sel = {};   /* 보안 ②: 새 자료면 고른 줄 비우기 */\n  var host = $(o.id);")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
