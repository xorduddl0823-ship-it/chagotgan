"""체크 정식(check.cgg.co.kr) 통째 묶음 zip — 폴더 찾기 없이 zip 하나만 올리면 돼요 (총괄 10/18 급함)
  안: index.html(사무실 화면 v55) · driver/index.html(기사 화면 v28 · 보안 통과 b621807 · 서버 v34~ 딜러 등록 대기와 짝)
      r/index.html(재검사 차량 목록) · _headers · _redirects(옛 /d/열쇠 · /v/보기코드 → app.cgg.co.kr/v.html · /r/ 화면)
  zip 맨 위에 바로 index.html · 시각 1980-01-01 고정 · 차례 고정(같은 파일이면 지문이 늘 같아요)
"""
import hashlib, zipfile, sys
BASE = "/home/user/chagotgan/"
OUT = BASE + "체크/올리기용/2_차곳간_체크_정식_v55_통째.zip"
ADD = BASE + "체크/올리기용/시험뒤_더할_파일/"

redirects = open(ADD + "_redirects", encoding="utf-8").read().rstrip("\n") + """
# 체크 v55 통째 묶음(10/18): 옛 청구서 보기 주소(/v/보기코드) — 체크 사이트에 v 폴더를 더 두지 않고 새 보기 화면으로 넘겨요
/v/:code  https://app.cgg.co.kr/v.html?c=:code  302
"""
headers = open(ADD + "_headers", encoding="utf-8").read().rstrip("\n") + """
/v/*
  Cache-Control: no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
"""
FILES = [
    ("index.html", open(BASE + "체크/2_차곳간_체크_index_v55.html", "rb").read()),
    ("_headers", headers.encode("utf-8")),
    ("_redirects", redirects.encode("utf-8")),
    ("driver/index.html", open(BASE + "체크/driver/index_v28.html", "rb").read()),
    ("r/index.html", open(ADD + "r/index.html", "rb").read()),
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
