"""워시 v136 → v136.1 (오류만 최소로 고침 · 새 기능 없음). 총괄 10/18 «내일 워시는 오류 없이»
쓰는 법: python3 워시/도구/만들기_워시_v136_1.py  (v136 판 위에 덧붙임 — v136 은 덮어쓰지 않아요)
  1) 위쪽 «링크 복사» 단추: 지금 서버(Supabase)에는 webAppUrl 이 없어 «주소를 불러오는 중이에요»만 뜨고 창이 안 열렸어요
     → 직원용 주소(app.cgg.co.kr)는 바로 보여 주고, 옛 서버에만 있던 «내 기기용 주소(열쇠 포함)» 칸은 주소가 없으면 숨겨요
운영 v111 · 시험판 v125 · v126 ~ v137 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v136.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v136_1.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v136 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v136.1 · UI 3.0 · 2026-10-18";')

# 1) 링크 복사 — 옛 서버 주소(webAppUrl)를 기다리지 않아요
rep('''function linkSheet(){
  if(!GS.exec){
    toast("주소를 불러오는 중이에요. 잠시 뒤 다시 시도해 주세요",true);
    gsCall("webAppUrl").then(function(u){GS.exec=u||"";if(GS.exec)linkSheet();});
    return;
  }
  var field=QR_URL, full=appUrl(false);''',
'''function linkSheet(){
  /* v136.1 지금 서버에는 옛 주소(webAppUrl)가 없어요 — 기다리지 않고 직원용 주소로 바로 열어요 */
  var field=QR_URL, full=appUrl(false);''')
rep('''  openSheet();
  $("lkMsg").value=''',
'''  openSheet();
  if(!full){var lf=$("lkFull");if(lf&&lf.parentNode)lf.parentNode.hidden=true;}   /* v136.1 열쇠 주소가 없으면 그 칸은 숨겨요 */
  $("lkMsg").value=''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
