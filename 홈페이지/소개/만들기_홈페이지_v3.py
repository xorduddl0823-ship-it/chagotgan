# -*- coding: utf-8 -*-
"""메인 홈페이지 v3 시안 — v2 + 통합 로그인 화면(대표님 결정 10/19 A안 · 가게 여러 곳 고르기)
   python3 홈페이지/소개/만들기_홈페이지_v2.py && python3 홈페이지/소개/만들기_홈페이지_v3.py
   - 바탕: 홈페이지/소개/0_차곳간_홈페이지_v2.html (고치지 않아요 — 지금 올릴 판)
   - 더하는 것: 로그인_v3.css · 로그인_v3.js (머리말 «로그인»이 홈페이지 안 로그인 화면을 열어요)
   - 서버 기능(homeOtp · homeVerify · homeGo)은 서버 방 요청서 홈페이지/요청서/2026-10-19_서버_홈페이지_통합로그인.md
     서버가 아직 없으면 «새 로그인을 준비하고 있어요» + 예전처럼 들어가기 링크. 주소 끝 #demo = 예시 모드(서버 안 부름)
   - 결과: 홈페이지/소개/0_차곳간_홈페이지_v3_시안.html"""
import io, os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: io.open(os.path.join(HERE, n), encoding="utf-8").read()
t = rd("0_차곳간_홈페이지_v2.html")
css, js = rd("로그인_v3.css"), rd("로그인_v3.js")
assert t.count('<header class="top gut">') == 1
t = t.replace('<header class="top gut">', "<style>\n" + css + "</style>\n" + '<header class="top gut">', 1)
t = t + "\n<script>\n" + js.replace("</script", "<\\/script") + "</script>\n"
out = os.path.join(HERE, "0_차곳간_홈페이지_v3_시안.html")
io.open(out, "w", encoding="utf-8").write(t)
print("만듦:", os.path.basename(out), len(t.encode("utf-8")), "bytes · sha", hashlib.sha256(t.encode("utf-8")).hexdigest()[:12])
