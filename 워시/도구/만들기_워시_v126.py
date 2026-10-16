"""워시 v125 → v126 (시험 뒤 판 · 시험판 교체는 총괄 승인 뒤)
쓰는 법: 만들기_워시_v125 다음에
모아 둔 것:
  1) 번호판 사진 읽기 실패 글 — 서버가 준 쉬운 우리말(예: «체험판 AI 읽기 3번을 모두 쓰셨습니다…» · «오늘 한도를 다 썼습니다…»)을
     그대로 보여 줘요. v124~v125 는 늘 «번호 자동 읽기를 지금 쓸 수 없어요» 한 줄로 바꿔 버려서 체험판 3번 한도 안내가 안 보였음.
  2) 디자인 방 폰 깨짐 목록(edb8817 · 920a873): 워시는 고칠 곳 0. «공통-2»만 해당 — 작은 그래프가 없는 숫자 카드(이번 달 청구 금액)의
     이름이 두 줄로 꺾임 (3번: 달력 짧은 금액 1억 경계) → 그 카드만 오른쪽 여백 0. «공통-1»(CGG.dialog 위로 밀림)은 워시가 CGG.dialog 를 안 써서 해당 없음
대표님 결정(04_결정_기록 c94c9a4) 반영 확인:
  · 차 상태 칩 = 워시 말(입고 · 판금·도색 중 · 출고 · 수금 완료) 그대로 + J 색(stateMap run/stop/chk/done) — v122 부터 이미 이 모양, 고칠 것 없음
  · 요금제 베이직 55,000 / 스탠다드 77,000(추천) / 프로 상담 — 워시 화면에는 가격을 직접 적은 곳이 없고 서버(myPlan · payDue)가 준 이름 · 금액을 그대로 보여 줌
    → 값은 서버 · 관리 방 몫. 홈페이지에서 고른 요금제 키(cgg_buy: basic|standard|pro …)는 형식 검사만 하므로 그대로 받음
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v125.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v126.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS in s and JS in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v125 · UI 3.0 · 2026-10-16";', 'var APP_VER="워시 v126 · UI 3.0 · 2026-10-16";')
# 1) 번호판 읽기 실패 글
rep('''  if(/429|rate/.test(m))return "번호 자동 읽기가 잠시 바빠요. 잠시 뒤 다시 시도해 주세요.";
  return "번호 자동 읽기를 지금 쓸 수 없어요. 번호를 직접 넣어 주세요.";''',
    '''  if(/429|rate/.test(m))return "번호 자동 읽기가 잠시 바빠요. 잠시 뒤 다시 시도해 주세요.";
  return kmsg(e,"번호 자동 읽기를 지금 쓸 수 없어요. 번호를 직접 넣어 주세요.");   /* v126: 서버의 쉬운 글(체험 3번 · 하루 한도)은 그대로 */''')
rep('''    plateMsg("번호를 읽지 못했어요 — "+friendlyAi(e),"warn");''', '''    plateMsg(friendlyAi(e),"warn");''')
# 2) 숫자 카드: 작은 그래프 없는 카드는 이름 오른쪽 여백 0 (워시 완성 CSS 끝 · 공통 부품 그대로)
a = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b = s.index('</style>', a)
s = s[:b] + "\n/* v126 · 디자인 폰 깨짐 공통-2 */\n.cgg-kpi:not(:has(svg)) small{padding-right:0}\n" + s[b:]
# 3) 폰 달력 짧은 금액 경계 (체크 방 발견): 99,995,000~99,999,999원이 «10,000만» → «1억»
rep('''  if(n>=100000000)return d1(n/100000000)+"억";
  if(n>=100000)return Math.round(n/10000)+"만";''',
    '''  var m=Math.round(n/10000);
  if(n>=100000000||m>=10000)return d1(n/100000000)+"억";
  if(n>=100000)return m+"만";''')
assert CSS in s and JS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
