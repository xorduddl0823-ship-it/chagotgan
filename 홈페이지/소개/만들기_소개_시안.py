# -*- coding: utf-8 -*-
"""차곳간 대표 홈페이지 시안 만들기 — 요금제 + 미리 써 보기.
   python3 홈페이지/소개/만들기_소개_시안.py [워시판 예: v119] [딜러판 예: d3.2]
   - 미리 써 보기 = 실제 제품 화면 그대로 + 서버 대신 브라우저 안 예시 자료
     · 워시: 워시 방이 만든 「워시_vNNN_미리보기.html」(서버로 가는 요청을 가로채 예시 자료로 답함)
     · 딜러: 딜러 화면의 시연 모드(window.__DEMO) — 서버에 연결하지 않음
     · 체크: 체크 방이 같은 방식의 미리보기를 만들면 여기에 넣음 (요청서 보냄)
   - 맨 아래 사업자 정보는 홈페이지/공통/사업자정보.json 한 곳에서
   - 결과: 홈페이지/소개/소개_시안.html (파일 하나로 열림)
"""
import io, os, sys, base64
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "홈페이지", "공통")); import 사업자정보 as B
WV = sys.argv[1] if len(sys.argv) > 1 else "v119"
DV = sys.argv[2] if len(sys.argv) > 2 else "d3.2"
rd = lambda p: io.open(p, encoding="utf-8").read()
info = B.load()
wash = rd(os.path.join(ROOT, "워시", "시안", "워시_%s_미리보기.html" % WV))
dealer = rd(os.path.join(ROOT, "딜러", "3_딜러앱_화면_%s" % DV, "index.html"))
dealer = dealer.replace("<head>", "<head><script>window.__DEMO=true;</script>", 1)
assert "window.__DEMO=true" in dealer
pk = lambda s: base64.b64encode(s.encode("utf-8")).decode("ascii")
t = rd(os.path.join(HERE, "소개_시안_틀.html"))
for k, v in {"@@APP@@": "https://app.cgg.co.kr/", "@@JOIN@@": "https://cgg.co.kr/join.html",
             "@@REFUND@@": info.get("환불규정", "https://cgg.co.kr/refund.html"), "@@BIZ@@": B.render(info),
             "@@PKG_WASH@@": pk(wash), "@@PKG_DEALER@@": pk(dealer)}.items():
    assert k in t, k; t = t.replace(k, v)
out = os.path.join(HERE, "소개_시안.html")
io.open(out, "w", encoding="utf-8").write(t)
print("만듦:", os.path.relpath(out, ROOT), len(t.encode("utf-8")), "bytes · 워시", WV, "· 딜러", DV)
