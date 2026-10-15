"""체크 v35(보안 통과 cdc0d65) → 체크 v36 — 한 줄만: 결제 창 «화면을 열지 못했어요»를 alert 대신 알림 글(CGG.toast)로 (워시 v121과 같게).
쓰는 법: python3 체크/도구/만들기_체크_v36.py   (v35 를 읽기만)
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v35.html"
OUT = BASE + "2_차곳간_체크_index_v36.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('''    if(!sh){ alert("화면을 열지 못했습니다"); return; }''',
    '''    if(!sh){ try{ CGG.toast("화면을 열지 못했어요"); }catch(e){} return; }   /* v36: 워시 v121과 같게 알림 글로 */''')
rep('''  $("hdVer").textContent="체크 v35 · "''', '''  $("hdVer").textContent="체크 v36 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
