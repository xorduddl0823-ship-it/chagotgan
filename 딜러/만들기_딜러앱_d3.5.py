"""딜러앱 화면 d3.4 → d3.5 새 판을 만든다 (대표님 시험판). 바탕 파일과 공통 부품은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.5.py   (바탕: 딜러/3_딜러앱_화면_d3.4 — 저장소에 있는 그대로)
결과: 딜러/3_딜러앱_화면_d3.5/
근거: 공통 부품 cgg-j4 1.5 동결 (디자인/공통/README.md «동결», 커밋 3da0f68) — 모든 제품이 1.5
바꾸는 것
  1. 공통 부품 1.3 → 1.5 (CSS · 앞 script 덩어리 통째로, 파일 그대로)
  2. 내 차 표: 1.5 의 «다시 그려도 상태 유지»(state) 를 씀 → d3.4 의 «탭 다시 누르기» 임시 방법을 뺌
     · 홈 할 일 · 숫자에서 넘어오면 그 단계 탭이 골라진 채로 (state.f)
     · 내 차를 새로 받으면 골라 둔 줄은 비움 (줄 차례가 바뀔 수 있어서)
안 바꾸는 것: 그 밖의 모든 화면 · 서버 창구 (d3.4 와 같음)"""
import os, shutil, subprocess
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.4"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.5"
J4_COMMIT = "3da0f68"   # cgg-j4 1.5 (동결)
git = lambda p: subprocess.run(["git", "-C", ROOT, "show", J4_COMMIT + ":" + p], capture_output=True, check=True).stdout.decode("utf-8")
J4CSS, J4JS = git("디자인/공통/cgg-j4.css"), git("디자인/공통/cgg-j4.js")
assert "cgg-j4 1.5" in J4CSS and 'version:"cgg-j4 1.5"' in J4JS
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.4 (2026-10-15, J안 완성 기준 · 공통 부품 cgg-j4 1.3",
    "<!-- 차곳간 딜러앱 화면 · 판 d3.5 (2026-10-15, 대표님 시험판 · J안 완성 기준 · 공통 부품 cgg-j4 1.5 동결")
rep('var VER="d3.4";', 'var VER="d3.5";')

# 2) 공통 부품 1.3 → 1.5
H = "/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.3"
a = s.index(H); b = s.index("</style>", a); s = s[:a] + J4CSS + "\n" + s[b:]
a = s.index(H); b = s.index("</script>", a); s = s[:a] + J4JS + "\n" + s[b:]
assert "cgg-j4 1.3 (" not in s
# 딜러 쪽 CSS 덩어리들이 1.3 머리 바로 앞에 붙어 있던 것은 그대로 남아요 (1.5 덩어리 앞)

# 3) 내 차 표 — 1.5 state 로 상태 유지
rep("""  CGG.table(el,{cols:["지금 위치","차량번호","차종","작업","마지막 기록","들어간 금액","단계"],""",
    """  if(!S.carT)S.carT={};
  var keep=S.carT.sel||{},n0=Object.keys(keep).filter(function(i){return keep[i]&&L[i];});
  n0.forEach(function(i){S.sel[L[i].key]=true;});
  CGG.table(el,{state:S.carT,cols:["지금 위치","차량번호","차종","작업","마지막 기록","들어간 금액","단계"],""")
rep("""  /* 홈 할 일 · 숫자에서 넘어온 단계 탭을 고른 채로 · 사용자가 고른 탭도 기억 (다시 그려도 그대로) */
  if(S.filter&&S.filter!=="전체"){var t=el.querySelector('[data-f="'+S.filter+'"]');if(t)t.click();}
  el.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-f]");if(t)S.filter=t.getAttribute("data-f")||"전체";},true);
""", """  setBtn(n0.filter(function(i){return !isDone(L[i]);}).length);
""")
rep('''  if(a==="go"){S.filter=v||"전체";''',
    '''  if(a==="go"){S.filter=v||"전체";S.carT=S.carT||{};if(S.carT.q==null){S.carT.q="";S.carT.k=0;S.carT.dir=1;S.carT.size=10;S.carT.sel={};}S.carT.f=(v&&v!=="전체")?v:"";S.carT.page=1;''')
rep('return api("cars").then(function(r){S.cars=(r&&r.list)||[];S.done=(r&&r.done)||{};render();},',
    'return api("cars").then(function(r){S.cars=(r&&r.list)||[];S.done=(r&&r.done)||{};if(S.carT)S.carT.sel={};render();},')
rep('function forget(){S.key="";', 'function forget(){S.carT=null;S.key="";')

# 3-1) 고른 줄은 줄 번호로 기억하니(1.5 보안 규칙 2), 한꺼번에 완료한 뒤에도 비움
rep(".then(function(){S.sel={};render();toast(L2.length", ".then(function(){S.sel={};if(S.carT)S.carT.sel={};render();toast(L2.length")

# 4) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
