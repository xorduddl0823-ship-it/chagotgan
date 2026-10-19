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
# 보안 방(10/19 · 낮음): 미리 써 보기 틀은 sandbox="allow-scripts" 로 — 홈페이지와 다른 출처가 되어 sessionStorage(가입 표)를 못 읽어요.
#   다른 출처라 안쪽 화면이 parent.__cggSeen 을 바로 못 불러요 → 그 한 줄만 postMessage 로 바꾸고, 바깥은 우리 틀에서 온 것만 받아요.
import re, base64
SEEN_OLD = 'try{ if(window.parent&&window.parent!==window&&typeof window.parent.__cggSeen==="function") window.parent.__cggSeen(P,cur,ALLKEYS()); }catch(e){}'
SEEN_NEW = 'try{ if(window.parent&&window.parent!==window) window.parent.postMessage({cggSeen:[P,cur,ALLKEYS()]},"*"); }catch(e){}'
def fix_pkg(m):
    h = base64.b64decode(m.group(2)).decode("utf-8")
    assert h.count(SEEN_OLD) == 1, "미리 써 보기 안 방문 세기 줄이 바뀌었음"
    return m.group(1) + base64.b64encode(h.replace(SEEN_OLD, SEEN_NEW).encode("utf-8")).decode("ascii") + m.group(3)
t, n = re.subn(r'(<script type="application/octet-stream" id="pkg-(?:wash|check|dealer)">)([^<]*)(</script>)', fix_pkg, t)
assert n == 3
FR_OLD = '  f.srcdoc=CACHE[p];\n'
FR_NEW = '  f.setAttribute("sandbox","allow-scripts"); f.srcdoc=CACHE[p];\n'
assert t.count(FR_OLD) == 1; t = t.replace(FR_OLD, FR_NEW)
LISTEN = ('window.addEventListener("message",function(e){ var d=e.data; if(!d||!d.cggSeen||typeof window.__cggSeen!=="function") return;'
          ' var ok=Array.prototype.some.call(document.querySelectorAll("iframe[sandbox]"),function(f){ return f.contentWindow===e.source; }); if(!ok) return;'
          ' var a=d.cggSeen; if(!Array.isArray(a)||!/^(wash|check|dealer)$/.test(a[0])||typeof a[1]!=="string") return; window.__cggSeen(a[0],a[1],Array.isArray(a[2])?a[2].filter(function(k){ return typeof k==="string"; }):[]); });')
assert t.count('<header class="top gut">') == 1
t = t.replace('<header class="top gut">', "<style>\n" + css + "</style>\n" + '<header class="top gut">', 1)
t = t + "\n<script>\n" + LISTEN + "\n" + js.replace("</script", "<\\/script") + "</script>\n"
out = os.path.join(HERE, "0_차곳간_홈페이지_v3_시안.html")
io.open(out, "w", encoding="utf-8").write(t)
print("만듦:", os.path.basename(out), len(t.encode("utf-8")), "bytes · sha", hashlib.sha256(t.encode("utf-8")).hexdigest()[:12])
