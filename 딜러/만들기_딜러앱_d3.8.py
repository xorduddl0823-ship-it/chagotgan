"""딜러앱 화면 d3.7 → d3.8 (대표님 시험 결정 2026-10-17). 바탕 파일은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.8.py   (바탕: 딜러/3_딜러앱_화면_d3.7 — 시험판, 보안 통과)
결과: 딜러/3_딜러앱_화면_d3.8/   ※ 시험 뒤 묶음(운영/06)으로 올려요. 시험판 d3.7은 그대로 둬요.
근거: 총괄 2026-10-17 «알림 문장에서 차량번호 뒤 차종 크기(«중형»)는 빼기»
  워시는 차종 칸에 «수입 중형» 같은 크기 등급을 넣어서, 둘째 낱말을 이름처럼 쓰면 «359저6857 중형이 …»가 됨.
바꾸는 것 (글만 — 서버 · 로그인 · 자료 처리는 그대로)
  1. 알림 문장: «359저6857이 워시테스트에 입고됐어요» — 차량번호만
  2. (추천안) 홈 할 일 카드 작은 글도 같은 이유로 차량번호로 («중형 · 확인하고 눌러 주세요» → «359저6857 · …»)
  그대로: 목록 둘째 줄 «수입 중형 · 외부세차» (업체가 적은 차종 칸을 그대로 보여 주는 자리)
공통 부품: cgg-j4 1.5 동결 그대로."""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.7"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.8"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

rep("<!-- 차곳간 딜러앱 화면 · 판 d3.7 (2026-10-16, ", "<!-- 차곳간 딜러앱 화면 · 판 d3.8 (2026-10-17, 알림 · 할 일 글은 차량번호만 · 바탕 d3.7 · ")
rep('var VER="d3.7";', 'var VER="d3.8";')
# 1) 알림 문장 — 차량번호만
rep('''    var nm=((x.model||"").split(" ")[1]||x.model||"").trim(),who=x.plate+(nm?" "+nm:"");''',
    '''    var who=x.plate||"차";''')
# 2) 홈 할 일 카드 — 차량번호 (없으면 차종)
rep('''function nm2(c){return ((c.model||"").split(" ")[1]||c.model||c.plate);}''',
    '''function nm2(c){return c.plate||c.model||"차";}''')

if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
