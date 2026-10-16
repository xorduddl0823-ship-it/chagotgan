"""딜러앱 화면 d3.6 → d3.7 (360px 폰 손보기 · 총괄 승인 2026-10-16). 바탕 파일은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.7.py   (바탕: 딜러/3_딜러앱_화면_d3.6 — 보안 통과 a5d442a)
결과: 딜러/3_딜러앱_화면_d3.7/   ※ 보안 확인 뒤 올려요.
근거: 총괄 2026-10-16 «d3.6을 360px로 볼 때 깨지는 곳 → d3.7 초안으로 모아 두기»
바꾸는 것 (모두 화면 모양만 — 서버 · 로그인 · 자료 처리는 그대로)
  1. 차 자세히 창: 키 작은 폰(높이 약 700px 아래)에서 창이 아래로 내려간 채 열려 제목 · 닫기(X)가 가려짐
     → 창을 열 때 맨 위부터 보이게
  2. 숫자 카드 이름 «상품화 기다리는 차»가 360px에서 두 줄로 꺾임 (작은 그림 자리 비워 둔 탓)
     → 작은 그림이 없는 카드는 오른쪽 빈자리 없앰 (지금은 넓은 화면에만 적용)
공통 부품: cgg-j4 1.5 동결 그대로."""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.6"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.7"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 0) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.6 (", "<!-- 차곳간 딜러앱 화면 · 판 d3.7 (2026-10-16, 360px 손보기 · 바탕 d3.6 · ")
rep('var VER="d3.6";', 'var VER="d3.7";')

# 1) 자세히 창 — 열 때 맨 위부터 (공통 부품이 아래 «닫기»에 초점을 두며 창이 내려가던 것)
rep('''  var dim=d&&d.parentNode;if(dim&&!dim._dl){''',
    '''  if(d){try{d.scrollTop=0;}catch(e){}}
  var dim=d&&d.parentNode;if(dim&&!dim._dl){''')

# 2) 숫자 카드 — 작은 그림 없으면 오른쪽 빈자리 없앰 (폰 포함 모든 폭)
rep('''@media (min-width:1000px){.kpi:not(:has(svg.sp)) small{padding-right:0}}''',
    '''.kpi:not(:has(svg.sp)) small{padding-right:0}''')

if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
