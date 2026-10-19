# -*- coding: utf-8 -*-
"""실제 메인 홈페이지(cgg.co.kr)용 머리 손보기 — 총괄 10/19: 실제 홈페이지만 검색에 나오게.
   python3 홈페이지정식_머리.py out/index.html
   - noindex 빼기 · 제목 · 설명 · OG(카톡 · 검색 미리보기) · 대표 주소(canonical) 넣기
   - 시험 주소(t.cgg.co.kr) · 관리 · 앱 · join 은 noindex 그대로(이 도구를 쓰지 않아요)"""
import io, sys
p = sys.argv[1]
t = io.open(p, encoding="utf-8").read()
OLD_T = "<title>차곳간 홈페이지</title>"
OLD_R = '<meta name="robots" content="noindex">\n'
assert t.count(OLD_T) == 1 and t.count(OLD_R) == 1, "홈페이지 머리 모양이 바뀌었어요"
TITLE = "차곳간 — 차를 맡는 순간부터, 정산을 마치는 순간까지"
DESC = "광택·세차장과 성능점검장의 업무 장부. 입고·작업·성능점검·청구·입금 확인까지 한곳에서, 딜러는 맡긴 차 진행을 휴대폰으로 확인해요. 가입 없이 예시 화면으로 미리 써 볼 수 있어요."
HEAD = ("<title>" + TITLE + "</title>\n"
        '<meta name="description" content="' + DESC + '">\n'
        '<link rel="canonical" href="https://cgg.co.kr/">\n'
        '<meta property="og:type" content="website">\n'
        '<meta property="og:site_name" content="차곳간">\n'
        '<meta property="og:locale" content="ko_KR">\n'
        '<meta property="og:url" content="https://cgg.co.kr/">\n'
        '<meta property="og:title" content="' + TITLE + '">\n'
        '<meta property="og:description" content="' + DESC + '">\n'
        '<meta name="theme-color" content="#0B2545">')
t = t.replace(OLD_T, HEAD, 1).replace(OLD_R, "", 1)
assert "noindex" not in t[:4000]
io.open(p, "w", encoding="utf-8").write(t)
print("실제 홈페이지 머리 손봄:", p)
