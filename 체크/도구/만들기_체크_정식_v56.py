"""체크 정식(check.cgg.co.kr) 통째 묶음 — v56 (디자인 통합 2단계) · 체크 방 10/18
  안: index.html(v56) · driver/index.html(v28) · r/index.html · d/index.html · v/index.html · _headers  — _redirects 는 넣지 않아요(Workers 대시보드가 못 올림)
  _headers: 보기 화면 머리글은 v55.1 그대로 + 모든 쪽(/*)에 «다른 사이트 틀 안에 못 넣게»(frame-ancestors 'self' https://*.cgg.co.kr · 보안 낮음 고침)
  zip 맨 위에 바로 index.html · 시각 1980-01-01 고정 · 차례 고정(같은 파일이면 지문이 늘 같아요)
"""
import hashlib, os, sys, zipfile
V = sys.argv[1] if len(sys.argv) > 1 else "v56"   # v56 · v56.1
BASE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")) + "/"
OUT = BASE + "체크/올리기용/2_차곳간_체크_정식_%s_통째.zip" % V
ADD = BASE + "체크/올리기용/시험뒤_더할_파일/"
NEW = BASE + "체크/올리기용/정식_r살리기/"

headers = """# 모든 쪽 — 차곳간 사이트(cgg.co.kr) 밖의 틀(iframe) 안에 못 넣게 (v56 · 보안 낮음 고침)
/*
  Content-Security-Policy: frame-ancestors 'self' https://*.cgg.co.kr
  X-Content-Type-Options: nosniff
""" + open(ADD + "_headers", encoding="utf-8").read().rstrip("\n") + """
/v/*
  Cache-Control: no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
"""
FILES = [
    ("index.html", open(BASE + "체크/2_차곳간_체크_index_%s.html" % V, "rb").read()),
    ("_headers", headers.encode("utf-8")),
    ("d/index.html", open(NEW + "d/index.html", "rb").read()),
    ("driver/index.html", open(BASE + "체크/driver/index_%s.html" % ({"v56.6":"v29","v56.7":"v30","v56.8":"v31"}.get(V,"v28")), "rb").read()),   # v56.6: 기사 앱 v29
    ("r/index.html", open(ADD + "r/index.html", "rb").read()),
    ("v/index.html", open(NEW + "v/index.html", "rb").read()),
]
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in FILES:
        zi = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_DEFLATED
        zi.external_attr = 0o100644 << 16
        zi.create_system = 3
        z.writestr(zi, data, compresslevel=9)
print("만듦:", OUT)
print("zip 지문:", hashlib.sha256(open(OUT, "rb").read()).hexdigest()[:12])
for name, data in FILES:
    print("  ", name, hashlib.sha256(data).hexdigest()[:12], len(data))
