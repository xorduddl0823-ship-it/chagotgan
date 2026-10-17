"""워시 통합 시안(v132 후보) 한 파일로 묶기 — 공통 부품 1.8 · 워시 메뉴 지도는 글자 그대로, 시안 덧칠은 통합시안/시안.css · 시안.js
쓰는 법: python3 만들기_워시_통합시안.py  →  워시/시안/워시_통합시안_v132.html (바깥 파일 없이 열림)"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
def rd(*p): return open(os.path.join(*p), encoding="utf-8").read()
CSS = rd(ROOT, "디자인", "공통", "cgg-j4-1.8.css"); JS = rd(ROOT, "디자인", "공통", "cgg-j4-1.8.js")
MENU = rd(ROOT, "디자인", "메뉴지도", "워시_메뉴.js")
SCSS = rd(HERE, "통합시안", "시안.css"); SJS = rd(HERE, "통합시안", "시안.js")
for x in (CSS, JS, MENU, SCSS, SJS): assert "</script" not in x.lower() and "</style" not in x.lower()
html = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>워시 통합 시안</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap">
<style>
""" + CSS + "\n</style>\n<style>\n" + SCSS + """
</style>
</head><body>
<div class="sz" id="sz"></div>
<div class="cgg-app" id="app">
  <header class="cgg-hdr">
    <div class="cgg-top" id="top"></div>
    <nav class="cgg-nav" id="nav"></nav>
  </header>
  <main class="cgg-main" id="main"></main>
  <nav class="cgg-tbar" id="tbar"></nav>
</div>
<script>
""" + JS + "\n</script>\n<script>\n" + MENU + "\n</script>\n<script>\n" + SJS + """
</script>
</body></html>
"""
OUT = os.path.join(HERE, "워시_통합시안_v132.html")
open(OUT, "w", encoding="utf-8").write(html); print("OK", OUT, len(html))
