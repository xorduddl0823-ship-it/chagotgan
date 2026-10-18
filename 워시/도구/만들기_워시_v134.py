"""워시 v133 → v134. 대표님 10/18: 엑셀 올리기에 «칸 맞추기» — 카모두 전산에서 받은 딜러 명부를 그대로 올려도 되게
쓰는 법: python3 워시/도구/만들기_워시_v134.py  (v133 판 위에 덧붙임 — v133 은 덮어쓰지 않아요)
  1) 부품 csvup 1.0 → 1.1 (체크/부품/엑셀올리기_부품_1.1.js · .css): 비슷한 말 사전 자동 짝 · 미리보기 위 «칸 짝짓기» 줄 · 이 기기 업체별 기억 · .xlsx 받기
  2) 업체별 기억 열쇠 = 우리 사업장 이름(S.cfg.shopName) — 칸 이름만 저장, 손님 자료는 저장 안 함
  3) 거래처 칸 안내 글: 카모두 명부도 그대로
  4) 머리말 업체 이름 밑 둘째 줄: 사업자번호 · 대표 (없으면 짧은 안내)
  5) 카모두 딜러리스트 · 상사리스트: 회사코드(개인정보일 수 있음) 안 읽음 · 재직/영업만 · 2만 줄 · 상사로 거르기
운영 v111 · 시험판 v125 · v126 ~ v133 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v133.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v134.html")
P = os.path.join(ROOT, "체크", "부품")
def rd(n): return open(os.path.join(P, n), encoding="utf-8").read()
U10J, U10C, U11J, U11C = rd("엑셀올리기_부품_1.0.js"), rd("엑셀올리기_부품_1.0.css"), rd("엑셀올리기_부품_1.1.js"), rd("엑셀올리기_부품_1.1.css")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v133 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v134 · UI 3.0 · 2026-10-18";')
rep(U10J, U11J)
rep(U10C, U11C)

# 업체별 기억 열쇠
rep('''      CGG_CSVUP.partners({owner:isOwner(),tplText:W133_TPL_P,''', '''      CGG_CSVUP.partners({owner:isOwner(),store:w134Store(),tplText:W133_TPL_P,''')
rep('''  CGG_CSVUP.places({owner:isOwner(),tplText:W133_TPL_D,''', '''  CGG_CSVUP.places({owner:isOwner(),store:w134Store(),tplText:W133_TPL_D,''')
# 안내 글
rep('''양식에 상사 · 딜러를 적어 올리면 한 번에 들어가요. 이미 있는 사람은 건너뛰어요.''', '''양식이나 카모두에서 받은 딜러 명부(엑셀)를 그대로 올려 바로 거래처로 넣어요. 이미 있는 사람은 건너뛰어요.''')

rep('''카모두에서 받은 명부를 올려 두면 찾아서 바로 딜러로 넣을 수 있어요.''', '''카모두 명부를 찾기용으로 올려 두는 곳이에요(거래처로 바로 넣지는 않아요).''')
# 기억 열쇠 — 우리 사업장 이름(기본값 «차곳간»이거나 비면 기억 안 함)
rep('''var WPT={st:{}};''', '''var WPT={st:{}};
function w134Store(){var n=String((S.cfg&&S.cfg.shopName)||"").trim();return (n&&n!=="차곳간")?n:"";}''')
# 4) 머리말 둘째 줄(대표님 10/18 · 체크처럼): «사업자 000-00-00000 · 대표 ○○○» / 번호 없으면 «대표 ○○○» / 둘 다 없으면 대표에게만 «설정에서 사업자번호를 넣어 주세요»
rep('''    biz:{name:nm||appName(),line:sp.bizNo?("사업자 "+fmtBizNo(sp.bizNo)+(sp.ceo?(" · 대표 "+sp.ceo):"")):""},''',
'''    biz:{name:nm||appName(),line:sp.bizNo?("사업자 "+fmtBizNo(sp.bizNo)+(sp.ceo?(" · 대표 "+sp.ceo):"")):(sp.ceo?("대표 "+sp.ceo):(isOwner()?"설정에서 사업자번호를 넣어 주세요":""))},''')
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
