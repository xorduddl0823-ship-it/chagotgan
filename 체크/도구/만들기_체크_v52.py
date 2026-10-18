"""체크 v51 → v52 — 서버 check-api v44(검사비 셈 바로잡기 · 보안 통과 d4f11ac)에 맞춘 화면
  · 매출 · 월별 청구서: «단가표에 없는 상품명» · «금액 넣을 수출 가성능 N대» 알림
  · 월별 청구서: «수출 가성능 금액 넣기» → carFeeSet (대표만)
v51(보안 통과 593c067 · 6ab92e3759aa)은 읽기만. 그 밖 기능은 v51 과 같아요. 서버 v44 + SQL 18 을 먼저 올려요.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v51.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('ver:"체크 v51", date:"10/18"', 'ver:"체크 v52", date:"10/18"')
rep('$("hdVer").textContent="체크 v51 · "', '$("hdVer").textContent="체크 v52 · "')
rep('<!-- 체크 v51 · ', '<!-- 체크 v52 (v51 + 검사비 서버 v44 맞춤) · ')
rep('''  home:["bill","dep"], sales:["sales"], bill:["bill","set"],''', '''  home:["bill","dep"], sales:["sales"], bill:["bill","set","sales"],''')
rep('''<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''', open(BASE + "체크/도구/v52_검사비.js", encoding="utf-8").read() + '''
<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''')
open(BASE + "체크/2_차곳간_체크_index_v52.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v52.html", len(s))
