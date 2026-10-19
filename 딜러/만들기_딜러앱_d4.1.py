"""딜러앱 화면 d4.1 을 만든다 — d4.0 에서 찾기 칸 안내 글만 딜러앱 기능(청구서 · 내 차)으로 바꾼 판.
쓰는 법: python3 딜러/만들기_딜러앱_d4.1.py
결과: 딜러/3_딜러앱_화면_d4.1/ (index.html · manifest.webmanifest · icon-192.png · icon-512.png · apple-touch-icon.png)
근거: 총괄 2026-10-19 후속 일감 «찾기 칸 안내를 딜러앱에 있는 기능으로» · 바탕 d4.0 (d4.0 폴더는 그대로 남김 — 되돌리기용)
재료(모두 읽기만):
  - 딜러/3_딜러앱_화면_d3.9/index.html   — 머리(<head>)의 메타 · 바탕 판 (d3.9 는 지우지 않아요 — 되돌리기용)
  - 딜러/d4재료/dealer-d4.1.css · .js   — 딜러 화면 (서버 주고받기 · 로그인 · 청구서 셈은 d3.9 그대로 옮김)
  - 디자인/공통/cgg-j4-1.13.2.css · .js — 공통 부품 (보안 통과 7257e11) · 글자 하나 안 바꾸고 붙여요
  - 디자인/공통/ci/                      — 차곳간 CI 앱 아이콘 (icon-192 · icon-512 · apple-touch-icon)
"""
import base64, hashlib, os, re, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 저장소 맨 위 (이 파일은 딜러/ 안에 있어요)
SRC = ROOT + "/딜러/3_딜러앱_화면_d3.9"
OUT = ROOT + "/딜러/3_딜러앱_화면_d4.1"
CSS_C = ROOT + "/디자인/공통/cgg-j4-1.13.2.css"
JS_C = ROOT + "/디자인/공통/cgg-j4-1.13.2.js"
CI = ROOT + "/디자인/공통/ci"

def rd(p): return open(p, encoding="utf-8").read()
old = rd(SRC + "/index.html")
css_c, js_c = rd(CSS_C), rd(JS_C)
css_p, js_p = rd(ROOT + "/딜러/d4재료/dealer-d4.1.css"), rd(ROOT + "/딜러/d4재료/dealer-d4.1.js")
assert 'version:"cgg-j4 1.13.2"' in js_c, "공통 부품 판이 1.13.2 가 아니에요"
assert "</script" not in js_c and "</script" not in js_p and "</style" not in css_c + css_p

# 머리: d3.9 의 메타는 그대로, 아이콘만 차곳간 CI 로
head = old[old.index("<head>") + 6: old.index("<style>")]
head = re.sub(r'<link rel="apple-touch-icon" href="data:image/png;base64,[^"]+">',
              '<link rel="apple-touch-icon" href="data:image/png;base64,' + base64.b64encode(open(CI + "/apple-touch-icon.png", "rb").read()).decode() + '">', head)
head = re.sub(r'<link rel="icon" href="data:image/png;base64,[^"]+">\n?', "", head)   # 탭 아이콘은 CGG.favicon() 이 CI 로 넣어요
assert head.count("apple-touch-icon") == 1 and "Noto+Sans+KR" in head

html = ("<!DOCTYPE html>\n<html lang=\"ko\">\n"
  "<!-- 차곳간 딜러앱 화면 · 판 d4.1 (2026-10-19, 찾기 칸 안내 글 딜러용 · d4.0 의 확정 통합 디자인 — 공통 부품 cgg-j4 1.13.2 · 미리보기 11판 «딜러앱» 모양) · 바탕 d3.9 "
  "(서버 주고받는 모양 · 로그인 · 청구서 셈 · 상태 말과 색 그대로) · 주소 dealer.cgg.co.kr / dealer.chagotgan.co.kr · 시연: 주소 끝에 ?demo (인증번호 123456) -->\n"
  "<head>" + head +
  "<style>\n" + css_c + "\n</style>\n<style>\n" + css_p + "</style>\n</head>\n<body>\n"
  '<div class="cgg-beta" id="cggBeta" role="note"><div class="in"><b>오픈 베타</b><span>차곳간은 지금 오픈 베타예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div></div>\n'
  '<div id="login"></div>\n'
  '<div class="cgg-app" id="app" hidden>\n'
  '  <header class="cgg-hdr"><div class="cgg-top" id="top"></div><nav class="cgg-nav" id="nav"></nav></header>\n'
  '  <main class="cgg-main" id="main"></main>\n'
  '  <nav class="cgg-tbar" id="tbar"></nav>\n'
  '</div>\n'
  "<script>\n" + js_c + "\n</script>\n<script>\n" + js_p + "</script>\n</body>\n</html>\n")

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)
open(OUT + "/index.html", "w", encoding="utf-8").write(html)
shutil.copy(SRC + "/manifest.webmanifest", OUT + "/manifest.webmanifest")
for f in ("icon-192.png", "icon-512.png", "apple-touch-icon.png"):
    shutil.copy(CI + "/" + f, OUT + "/" + f)
print("만듦:", OUT, len(html), "글자 · 지문", hashlib.sha256(html.encode()).hexdigest()[:16])
