"""워시 v130 → v131 (출시 판 · 요청서 B 마무리). 화면 검사 일꾼(chagotgan-ui-checker) 검사에서 걸린 것 고침
쓰는 법: 만들기_워시_v130 다음에 (v129 · 공통 1.8 · 화면 통합은 이 판에 넣지 않아요 — 통합은 시안 확인 뒤 다음 판)
  ❶ 새 딜러 창이 두 번 뜸: «저장 없이 입고» · 저장 실패 뒤 0원 확인 · 같은 차 확인 창에서 [확인] → 입고 다시 → 통과 표시가 지워져 창이 또 뜸
     → 통과 표시는 입고가 끝날 때(resetForm) 지워요
  ❸ 거래처 «마지막 거래» 칸 정렬: «오늘 14:20» · «9/30 10:00» 글자 정렬 → «2026-10-17 14:20» 꼴로 넘겨 날짜 차례
  ❺ «딜러 명부 열기» 단추를 부품과 같은 cgg-btn 모양으로
운영 v111 · 시험판 v125 · v126 ~ v130 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v130.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v131.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
PJS = open(os.path.join(ROOT, "체크", "부품", "거래처_부품.js"), encoding="utf-8").read()
PCSS = open(os.path.join(ROOT, "체크", "부품", "거래처_부품.css"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS in s and JS in s and PJS in s and PCSS in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v130 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v131 · UI 3.0 · 2026-10-18";')

# ❶ 통과 표시는 쓰고 바로 지우지 않고, 입고가 끝날 때 지워요
rep('''  if(WPT.ok===company+"|"+dealer){WPT.ok="";return false;}''',
    '''  if(WPT.ok===company+"|"+dealer)return false;   /* v131: 0원 · 같은 차 확인 창 뒤 다시 와도 창을 또 띄우지 않아요 */''')
rep('''function resetForm(){
  $("fPlate").value="";''', '''function resetForm(){
  if(window.WPT)WPT.ok="";
  $("fPlate").value="";''')

# ❸ 마지막 거래 — 글자 차례가 곧 날짜 차례가 되게
rep('''      last:t?fmtTime(t):""};});''', '''      last:t?wPtWhen(t):""};});''')
rep('''function wPtComp(name){''', '''function wPtWhen(iso){var d=new Date(iso);if(isNaN(d))return "";
  function p(n){return String(n).padStart(2,"0");}
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes());}
function wPtComp(name){''')

# ❺ 단추 모양
rep('''<button type="button" class="btn" id="wPtRoster">딜러 명부 열기</button>''',
    '''<button type="button" class="cgg-btn" id="wPtRoster">딜러 명부 열기</button>''')

assert CSS in s and JS in s and PJS in s and PCSS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
