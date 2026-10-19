# -*- coding: utf-8 -*-
"""차곳간 메인 홈페이지 v2 만들기 — 디자인 11판 «손본 뒤»(챗지피티 검수 7 최종 통과 10/19)를 실제 홈페이지로.
   python3 홈페이지/소개/만들기_홈페이지_v2.py
   - 바탕: 홈페이지/소개/소개_시안_틀.html (지금 홈페이지와 같은 틀) + 디자인/시안/홈페이지/ 의 손본뒤.css · 손본뒤.js · 만들기.py PATCH
   - 실제 값: 사업자 정보 · 문의 · 약관 링크 · 로그인 주소는 지금 홈페이지(만들기_소개_시안.py)와 똑같이 홈페이지/공통/사업자정보.json 에서
   - 미리 써 보기: 11판 예시 화면(디자인/완성_미리보기.html · 예시 값만 · 서버 · 로그인 · 저장 · 보내기 없음)
   - 올릴 판에서 빼는 것: 검토 표시(빨간 점선 · 보라 띠 · «참고 시안에서 빌려 옴» 표 · 설명 상자) · 첫 문구 후보 고르기 단추
   - 결과: 홈페이지/소개/0_차곳간_홈페이지_v2.html · 같은 폴더 0_차곳간_홈페이지_v2_목록.json(넣은 것 판 · 지문)
   - 지금 판(소개_시안.html)은 지우지 않아요 — 되돌리기용"""
import io, os, re, ast, sys, json, base64, hashlib, html, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
D = os.path.join(ROOT, "디자인")
DS = os.path.join(D, "시안", "홈페이지")
sys.path.insert(0, os.path.join(ROOT, "홈페이지", "공통")); import 사업자정보 as B
rd = lambda p: io.open(p, encoding="utf-8").read()
sha = lambda b: hashlib.sha256(b if isinstance(b, bytes) else b.encode("utf-8")).hexdigest()
MAN = []
def note(kind, rel, text):
    MAN.append({"무엇": kind, "파일": rel, "sha256_12": sha(text)[:12]})
    return text
def src(rel):
    return note("재료", rel, rd(os.path.join(ROOT, rel)))

# ── 디자인 만들기.py 의 PATCH 를 그대로 가져와요(실행하지 않고 글자만 읽음 — 디자인 방 파일은 고치지 않아요)
mk = src("디자인/시안/홈페이지/만들기.py")
PATCH = next(ast.literal_eval(n.value) for n in ast.parse(mk).body if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "PATCH")

# ── 손본뒤.css — 검토 표시 규칙만 빼요
css = src("디자인/시안/홈페이지/손본뒤.css")
cut_css = [
    "/* 바뀐 곳 표시 (?mark · #mark) */\n.cgg-mk [data-chg]{outline:2px dashed #D92D20;outline-offset:2px}\n.cgg-mklegend{position:fixed;right:12px;bottom:12px;z-index:200;background:#fff;color:#101828;border:2px dashed #D92D20;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.15)}\n",
    ".cgg-mk .bor{box-shadow:inset 6px 0 0 #7A5AF8}\n",
    ".cgg-mk .bor-tag{display:inline-block;background:#7A5AF8;color:#fff;font-size:12.5px;font-weight:800;border-radius:999px;padding:2px 10px;margin-bottom:6px;width:max-content}\n",
]
for c in cut_css:
    assert css.count(c) == 1, c[:40]; css = css.replace(c, "")

# ── 손본뒤.js — 검토 표시 · 후보 고르기 단추 · «참고 시안» 표를 빼요(나머지 동작은 그대로)
js = src("디자인/시안/홈페이지/손본뒤.js")
cut_js = [
    ('<span class="bor-tag">참고 시안에서 빌려 옴 \'+n+\'</span>', ""),
    ('<span class="bor-tag">참고 시안에서 빌려 옴 ②</span>', ""),   # MINI=false 라 쓰이지 않는 칸이지만 글자도 빼요
    ("""    var pick=el('<div class="bor pickh" role="group" aria-label="첫 문구 고르기"><span class="bor-tag">첫 문구 후보 ⑦</span><b>첫 문구 고르기</b><button type="button" aria-pressed="true" data-h="0">지금 문구</button><button type="button" aria-pressed="false" data-h="1">시안 3 문구</button><button type="button" aria-pressed="false" data-h="2">시안 2 문구</button></div>');\n""", ""),
    ("""    Array.prototype.forEach.call(pick.querySelectorAll("[data-h]"),function(b){ b.onclick=function(){ var i=+b.getAttribute("data-h"); h1.innerHTML=H[i][0]; hp.innerHTML=H[i][1]; Array.prototype.forEach.call(pick.querySelectorAll("[data-h]"),function(x){ x.setAttribute("aria-pressed",String(x===b)); }); }; }); }""", " }"),
    ("""  if(/mark/.test(location.search+location.hash)){ document.documentElement.classList.add("cgg-mk"); tag(); new MutationObserver(tag).observe(document.body,{childList:true,subtree:true});
    var d=document.createElement("div"); d.className="cgg-mklegend"; d.textContent="빨간 점선 = 바뀐 곳 · 보라 띠 = 참고 시안 1 · 2 · 3 에서 빌려 온 칸"; document.body.appendChild(d); }\n""", ""),
]
for a_, b_ in cut_js:
    assert js.count(a_) == 1, a_[:50]; js = js.replace(a_, b_)
assert "bor-tag" not in js and "cgg-mk" not in js and "pickh" not in js
# 쓰지 않는 찌꺼기 · 내부 메모 빼기 — 누구나 «페이지 소스 보기»로 볼 수 있어서(검사 일꾼 10/19)
js = js.replace('h1.setAttribute("data-chg","첫 문구(확정)");', "").replace(' e.setAttribute("data-chg","시안 3 소제목");', "")
TAG = js[js.index("  function tag(){"):js.index("\n", js.index("L.forEach(function(x){ Array.prototype.forEach.call(document.querySelectorAll(x[0]),function(e){ e.setAttribute(\"data-chg\""))+1]
assert TAG.count("function tag(") == 1; js = js.replace(TAG, "")
assert "data-chg" not in js
css = "\n".join(l for l in css.split("\n") if ".pickh" not in l and "pickh " not in l)
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
js = re.sub(r"[ \t]*/\*[^*]*(?:\*(?!/)[^*]*)*\*/", "", js)   # 메모(/* … */) — 글자 안에 /* 가 없는 것 확인함
assert "/*" not in js and "대표님" not in js and "대표님" not in css and "pickh" not in css

# ── 미리 써 보기: 11판 예시 화면(디자인 만들기.py pv_pkg 와 같은 방법)
pv_src = {r: src(r) for r in ["디자인/완성_미리보기.html", "디자인/공통/cgg-j4-1.13.2.css", "디자인/공통/cgg-j4-1.13.2.js",
                              "디자인/메뉴지도/워시_메뉴.js", "디자인/메뉴지도/체크_메뉴.js", "디자인/완성_미리보기_더.js"]}
def pv_pkg(prod):
    h = pv_src["디자인/완성_미리보기.html"]
    h = h.replace('<link rel="stylesheet" href="공통/cgg-j4-1.13.2.css">', "<style>" + pv_src["디자인/공통/cgg-j4-1.13.2.css"] + "</style>")
    for s in ["공통/cgg-j4-1.13.2.js", "메뉴지도/워시_메뉴.js", "메뉴지도/체크_메뉴.js", "완성_미리보기_더.js"]:
        tag = '<script src="' + s + '"></script>'
        assert tag in h, tag
        h = h.replace(tag, "<script>" + pv_src["디자인/" + s].replace("</script", "<\\/script") + "</script>")
    h = h.replace("<script>\n/* 미리보기 전용", '<script>window.__PVP="' + prod + '";</script>\n<script>\n/* 미리보기 전용', 1)
    assert "window.__PVP=" in h and "318-11" not in h
    assert not re.search(r"fetch\(|XMLHttpRequest|supabase|functions/v1", h), "예시 화면에 서버 부르는 곳이 있음"
    note("미리 써 보기 " + prod, "(위 6개 재료로 묶음)", h)
    return base64.b64encode(h.encode("utf-8")).decode("ascii")

# ── 틀 + 실제 값(지금 홈페이지와 같게)
t = src("홈페이지/소개/소개_시안_틀.html")
info = B.load()
ok = lambda k: B._ok(info.get(k))
row = lambda lab, k: ("<div><b>%s</b><span>%s</span></div>" % (lab, html.escape(info[k]))) if ok(k) else ""
rows = row("전화", "대표전화") + row("이메일", "이메일")
t = t.replace('    <div><b>전화</b><span>@@TEL@@</span></div>\n    <div><b>이메일</b><span>@@MAIL@@</span></div>\n',
              "    " + (rows or "<div><b>문의</b><span>연락처는 곧 이곳에 올려 둘게요.</span></div>") + "\n")
for a_, b_ in PATCH:
    assert t.count(a_) == 1, a_; t = t.replace(a_, b_)
# 첫 문구 확정(04 기록) — 스크립트가 나중에 바꾸기 전에도 처음부터 확정 문구가 보이게(검색 · 링크 미리보기 포함)
H1_OLD = "  <h1>입고부터 정산까지,<br>차를 맡고 내주는 일을 한곳에서</h1>\n  <p>차곳간은 광택·세차장, 성능점검장, 딜러가 함께 쓰는 업무 장부예요. 가입하지 않아도 예시 자료로 지금 바로 눌러 볼 수 있어요.</p>\n"
H1_NEW = "  <h1>차를 맡는 순간부터,<br>정산을 마치는 순간까지.</h1>\n  <p>워시는 입고와 작업을, 체크는 성능점검을. 딜러는 내 차의 진행 상황을 확인해요. 각자의 일에 맞는 차곳간을 만나 보세요.</p>\n"
assert t.count(H1_OLD) == 1; t = t.replace(H1_OLD, H1_NEW)
assert H1_NEW.split("<h1>")[1].split("</h1>")[0] in js and H1_NEW.split("<p>")[1].split("</p>")[0] in js, "11판 문구와 다름"
rep = {
    "@@J4CSS@@": src("디자인/공통/cgg-j4.css"),
    "@@J4JS@@": src("디자인/공통/cgg-j4.js").replace("</script", "<\\/script"),
    "@@APP@@": "https://app.cgg.co.kr/",
    "@@TERMS@@": info.get("이용약관", "https://cgg.co.kr/terms.html"),
    "@@PRIVACY@@": info.get("개인정보처리방침", "https://cgg.co.kr/privacy.html"),
    "@@REFUND@@": info.get("환불규정", "https://cgg.co.kr/refund.html"),
    "@@BIZ@@": B.render(info),
    "@@PKG_WASH@@": pv_pkg("wash"), "@@PKG_CHECK@@": pv_pkg("check"), "@@PKG_DEALER@@": pv_pkg("dealer"),
}
for k, v in rep.items():
    assert k in t, k; t = t.replace(k, v)
assert "@@" not in re.sub(r'<script type="application/octet-stream".*?</script>', "", t, flags=re.S), "채우지 못한 자리 표시가 남음"
t = t.replace("발급", "발행")   # 검수 3 F13 — 세금계산서는 «발행» (11판과 같게)
if "charset" not in t[:300]: t = '<!doctype html>\n<html lang="ko">\n<meta charset="utf-8">\n' + t
if 'name="viewport"' not in t: t = t.replace("<style>", '<meta name="viewport" content="width=device-width,initial-scale=1"><style>', 1)
assert t.count('<header class="top gut">') == 1 and "</body>" not in t   # 틀은 </body> 없이 끝나요 — 맨 끝에 붙여요(11판과 같은 자리)
t = t.replace('<header class="top gut">', "<style>\n" + css + "</style>\n" + '<header class="top gut">', 1)   # 틀의 <style> 뒤 — 덮어써요
t = t + "\n<script>\n" + js.replace("</script", "<\\/script") + "</script>\n"
assert "대표자" in t and "이택영" in t and "000-00-00000" not in t and "example.com" not in t and "1600-0000" not in t
out = os.path.join(HERE, "0_차곳간_홈페이지_v2.html")
io.open(out, "w", encoding="utf-8").write(t)
commit = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
man = {"판": "홈페이지 v2 (디자인 11판 «손본 뒤» · 검수 7 최종 통과 10/19)", "만든 커밋 바탕": commit,
       "결과": {"파일": "홈페이지/소개/0_차곳간_홈페이지_v2.html", "sha256_12": sha(t)[:12]},
       "되돌리기": {"파일": "홈페이지/소개/소개_시안.html", "sha256_12": sha(rd(os.path.join(HERE, "소개_시안.html")))[:12]},
       "넣은 것": MAN}
io.open(os.path.join(HERE, "0_차곳간_홈페이지_v2_목록.json"), "w", encoding="utf-8").write(json.dumps(man, ensure_ascii=False, indent=1) + "\n")
print("만듦:", os.path.relpath(out, ROOT), len(t.encode("utf-8")), "bytes · sha", sha(t)[:12])
