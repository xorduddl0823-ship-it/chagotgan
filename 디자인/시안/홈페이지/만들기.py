# -*- coding: utf-8 -*-
"""홈페이지 «지금 / 손본 뒤» 미리보기 만들기 (디자인 방 · 대표님 확정 10/18: 지금 느낌 최대한 그대로, 바꾸는 건 최소만)
   python3 디자인/시안/홈페이지/만들기.py
   - 읽기만: 홈페이지/소개/소개_시안_틀.html (홈페이지 방 파일 — 고치지 않아요)
   - 사업자 정보 · 연락처는 모두 «예시» 값(진짜 사업자번호 · 전화 안 씀). 미리 써 보기 앱 묶음은 빈 안내 쪽으로 바꿔요(용량 · 진짜 자료 없음)
   - 결과: 디자인/시안/홈페이지/지금.html · 손본뒤.html (손본뒤 = 지금 + 손본뒤.css + 바뀐 곳 표시)"""
import io, os, sys, base64, html
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "홈페이지", "공통")); import 사업자정보 as B
rd = lambda p: io.open(p, encoding="utf-8").read()
t = rd(os.path.join(ROOT, "홈페이지", "소개", "소개_시안_틀.html"))
EX = {"상호": "차곳간 (예시 상호)", "대표자": "이택영", "사업자등록번호": "000-00-00000", "통신판매업신고번호": "제0000-예시-0000호",
      "주소": "서울시 예시구 예시로 00", "대표전화": "1600-0000", "이메일": "help@example.com", "개인정보보호책임자": "이택영"}
soon = lambda name: base64.b64encode(('<!doctype html><meta charset="utf-8"><body style="font:15px/1.6 sans-serif;margin:0;display:grid;place-items:center;height:100vh;color:#667085;background:#F7F9FC"><p style="text-align:center;padding:20px"><b style="color:#101828">' + name + ' 미리 써 보기</b><br>이 미리보기에서는 맨 위 «' + name + '» 단추로 손본 뒤 화면을 봐요.</p>').encode("utf-8")).decode("ascii")
t = t.replace('    <div><b>전화</b><span>@@TEL@@</span></div>\n    <div><b>이메일</b><span>@@MAIL@@</span></div>\n',
              '    <div><b>전화</b><span>' + EX["대표전화"] + '</span></div><div><b>이메일</b><span>' + EX["이메일"] + '</span></div>\n')
rep = {"@@J4CSS@@": rd(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css")),
       "@@J4JS@@": rd(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js")).replace("</script", "<\\/script"),
       "@@APP@@": "#", "@@TERMS@@": "#", "@@PRIVACY@@": "#", "@@REFUND@@": "#", "@@BIZ@@": B.render(EX),
       "@@PKG_WASH@@": soon("워시"), "@@PKG_CHECK@@": soon("체크"), "@@PKG_DEALER@@": soon("딜러앱")}
for k, v in rep.items():
    assert k in t, k
    t = t.replace(k, v)
assert "@@" not in t, "채우지 못한 자리 표시"
assert "318-11" not in t
if "charset" not in t[:300]: t = '<!doctype html>\n<meta charset="utf-8">\n' + t
if 'name="viewport"' not in t: t = t.replace("<style>", '<meta name="viewport" content="width=device-width,initial-scale=1"><style>', 1)
io.open(os.path.join(HERE, "지금.html"), "w", encoding="utf-8").write(t)
assert '<header class="top gut">' in t
after = t.replace('<header class="top gut">', '<link rel="stylesheet" href="손본뒤.css">\n<header class="top gut">', 1)   # 틀의 <style> 뒤에 와야 덮어써요
after = after.replace("</body>", '<script src="손본뒤.js"></script></body>', 1) if "</body>" in after else after + '<script src="손본뒤.js"></script>'
io.open(os.path.join(HERE, "손본뒤.html"), "w", encoding="utf-8").write(after)
print("만듦: 지금.html", len(t.encode("utf-8")), "· 손본뒤.html", len(after.encode("utf-8")))
