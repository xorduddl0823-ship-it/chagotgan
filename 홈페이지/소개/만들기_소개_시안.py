# -*- coding: utf-8 -*-
"""차곳간 대표 홈페이지 시안 만들기 — 요금제 + 미리 써 보기 + 처음 오신 분 흐름(가입·결제).
   python3 홈페이지/소개/만들기_소개_시안.py                 → 제품마다 «가장 새 판»을 저절로 골라 묶음
   python3 홈페이지/소개/만들기_소개_시안.py v121 v33 d3.3   → 워시 · 체크 · 딜러 판을 직접 정함
   - 미리 써 보기 = 실제 제품 화면 그대로 + 서버 대신 브라우저 안 예시 자료
     · 워시: 워시/시안/워시_vNNN_미리보기.html   (워시 방이 만든 사본)
     · 체크: 체크/시안/체크_vNN_미리보기.html    (체크 방이 만든 사본)
     · 딜러: 딜러/3_딜러앱_화면_dX.Y/index.html 의 시연 모드(window.__DEMO)
   - 모양: 디자인/공통/cgg-j4.css · cgg-j4.js (CGG.trial) 를 그대로 붙임
   - 맨 아래 사업자 정보 · 문의 전화/이메일은 홈페이지/공통/사업자정보.json 한 곳에서
   - 결과: 홈페이지/소개/소개_시안.html (파일 하나로 열림)
"""
import io, os, re, sys, glob, base64, html
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "홈페이지", "공통")); import 사업자정보 as B
rd = lambda p: io.open(p, encoding="utf-8").read()

def ver_key(s):
    return [int(x) for x in re.findall(r"\d+", s)]

def newest(pattern, rx):
    c = [(m.group(1), p) for p in glob.glob(os.path.join(ROOT, pattern)) for m in [re.search(rx, p)] if m]
    if not c: raise SystemExit("찾지 못함: " + pattern)
    return max(c, key=lambda x: ver_key(x[0]))

a = sys.argv[1:]
# 판@커밋 (예: v125@80ad4e5) — 그 커밋에 있던 미리보기 사본을 씀 (같은 이름 파일이 나중에 바뀌어도 동결 판 그대로)
def pinned(rel, ver):
    if "@" not in ver: return ver, os.path.join(ROOT, rel % ver)
    v, c = ver.split("@", 1)
    assert re.fullmatch(r"[0-9a-f]{7,40}", c), "커밋 번호 모양이 아님: " + c
    import subprocess
    t = subprocess.check_output(["git", "-C", ROOT, "show", "%s:%s" % (c, rel % v)])
    out = os.path.join(HERE, ".고정_" + os.path.basename(rel % v))
    io.open(out, "wb").write(t); return ver, out
WV, WP = pinned("워시/시안/워시_%s_미리보기.html", a[0]) if len(a) > 0 else newest("워시/시안/워시_v*_미리보기.html", r"워시_(v\d+)_미리보기")
CV, CP = (a[1], os.path.join(ROOT, "체크", "시안", "체크_%s_미리보기.html" % a[1])) if len(a) > 1 else newest("체크/시안/체크_v*_미리보기.html", r"체크_(v\d+)_미리보기")
DV, DP = (a[2], os.path.join(ROOT, "딜러", "3_딜러앱_화면_%s" % a[2], "index.html")) if len(a) > 2 else newest("딜러/3_딜러앱_화면_d*/index.html", r"화면_(d[\d.]+)")

info = B.load()
ok = lambda k: B._ok(info.get(k))
dealer = rd(DP)
assert "<head>" in dealer, "딜러 화면에 <head> 가 없음"
# 딜러 시연은 진짜 브라우저 저장(cgd_key·cgd_phone)을 건드리지 않게 «메모리 저장소»로 바꿔치기 (보안 방 낮음 1)
MEMLS = ("<script>window.__DEMO=true;(function(){var M={};var S={getItem:function(k){return k in M?M[k]:null;},"
         "setItem:function(k,v){M[k]=String(v);},removeItem:function(k){delete M[k];},clear:function(){M={};},"
         "key:function(i){return Object.keys(M)[i]||null;},get length(){return Object.keys(M).length;}};"
         "try{Object.defineProperty(window,'localStorage',{value:S,configurable:true});}catch(e){}"
         "try{Object.defineProperty(window,'sessionStorage',{value:S,configurable:true});}catch(e){}})();</script>")
dealer = dealer.replace("<head>", "<head>" + MEMLS, 1)
# 홈페이지 맨 위에 오픈 베타 띠가 이미 있어요 — 미리 써 보기 안의 딜러 띠는 숨겨 띠를 하나만 보여요
dealer = dealer.replace("</head>", "<style>#cggBeta,.cgg-beta,.beta[role=note]{display:none!important}</style></head>", 1)
GUARD_OLD = 'u.indexOf(location.host) < 0) return Promise.reject'
GUARD_NEW = '(!location.host || u.indexOf(location.host) < 0)) return Promise.reject'
def guard(s, name):
    if GUARD_OLD in s: s = s.replace(GUARD_OLD, GUARD_NEW)
    assert GUARD_NEW in s, name + " 사본에 바깥 연결 막기 줄이 없음"
    return s
pk = lambda s: base64.b64encode(s.encode("utf-8")).decode("ascii")
t = rd(os.path.join(HERE, "소개_시안_틀.html"))
rep = {
    "@@J4CSS@@": rd(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css")),
    "@@J4JS@@": rd(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js")).replace("</script", "<\\/script"),
    "@@APP@@": "https://app.cgg.co.kr/",
    "@@TERMS@@": info.get("이용약관", "https://cgg.co.kr/terms.html"),
    "@@PRIVACY@@": info.get("개인정보처리방침", "https://cgg.co.kr/privacy.html"),
    "@@REFUND@@": info.get("환불규정", "https://cgg.co.kr/refund.html"),
    "@@BIZ@@": B.render(info),
    "@@PKG_WASH@@": pk(guard(rd(WP), "워시")), "@@PKG_CHECK@@": pk(guard(rd(CP), "체크")), "@@PKG_DEALER@@": pk(dealer),
}
# 문의 칸: 사업자정보.json 에 값이 있는 줄만 보여요. 둘 다 비면 안내 한 줄 (검토용 {…} 글이 손님에게 보이지 않게)
row = lambda lab, k: ("<div><b>%s</b><span>%s</span></div>" % (lab, html.escape(info[k]))) if ok(k) else ""
rows = row("전화", "대표전화") + row("이메일", "이메일")
t = t.replace('    <div><b>전화</b><span>@@TEL@@</span></div>\n    <div><b>이메일</b><span>@@MAIL@@</span></div>\n',
              "    " + (rows or "<div><b>문의</b><span>연락처는 곧 이곳에 올려 둘게요.</span></div>") + "\n")
assert "@@TEL@@" not in t and "@@MAIL@@" not in t, "문의 칸 자리 표시가 남음"
for k, v in rep.items():
    assert k in t, k
    t = t.replace(k, v)
assert "@@" not in re.sub(r'<script type="application/octet-stream".*?</script>', "", t, flags=re.S), "채우지 못한 자리 표시가 남음"
out = os.path.join(HERE, "소개_시안.html")
io.open(out, "w", encoding="utf-8").write(t)
print("만듦:", os.path.relpath(out, ROOT), len(t.encode("utf-8")), "bytes · 워시", WV, "· 체크", CV, "· 딜러", DV)
