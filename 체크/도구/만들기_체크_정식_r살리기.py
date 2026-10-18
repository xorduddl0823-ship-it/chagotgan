"""체크 정식(check.cgg.co.kr) — /r/ 재검사 목록 링크 살리기 묶음 (총괄 10/18 밤)
  지난 통째 zip 의 _redirects(바깥 주소로 넘기기 · 가운데 :key) 가 Cloudflare Workers 올리기에서 막혀 빠졌어요.
  이번 _redirects 는 «같은 사이트 안에서 잇기(200)» 세 줄만 — 바깥 주소 · 가운데 :key 없음.
  옛 /d/열쇠 · /v/보기코드 는 작은 넘기기 화면(d/index.html · v/index.html)이 새 보기 화면으로 보내요.
  안: index.html(v55.1 — 배달 · 입금 기간만큼 받아 오기) · driver/index.html(v28) · r/index.html · d/index.html · v/index.html · _headers · _redirects
  zip 맨 위에 바로 index.html · 시각 1980-01-01 고정 · 차례 고정(같은 파일이면 지문이 늘 같아요)
  BASE 는 이 파일 자리 기준(보안 방 의견)
  10/18 밤 총괄: Workers 대시보드는 _redirects 가 든 묶음을 Deploy 못 해요(세 번 실패) → _redirects 빼요.
  링크는 /r/?c=열쇠 · /d/?c= · /v/?c= 모양(서버 v49.2) — 폴더 index.html 이 바로 열려요.
"""
import hashlib, os, zipfile
BASE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")) + "/"
OUT = BASE + "체크/올리기용/2_차곳간_체크_정식_v55.1_통째.zip"
ADD = BASE + "체크/올리기용/시험뒤_더할_파일/"
NEW = BASE + "체크/올리기용/정식_r살리기/"

redirects = """# 체크 사이트 주소 잇기 (check.cgg.co.kr · Cloudflare Workers 정적 파일) — 체크 방 2026-10-18
# 같은 사이트 안에서만 이어요(바깥 주소로 넘기는 줄 없음). 옛 /d/ · /v/ 는 그 폴더의 작은 화면이 새 보기 화면으로 보내요.
/r/*  /r/index.html  200
/d/*  /d/index.html  200
/v/*  /v/index.html  200
"""
headers = open(ADD + "_headers", encoding="utf-8").read().rstrip("\n") + """
/v/*
  Cache-Control: no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
"""
FILES = [
    ("index.html", open(BASE + "체크/2_차곳간_체크_index_v55.1.html", "rb").read()),
    ("_headers", headers.encode("utf-8")),
    ("d/index.html", open(NEW + "d/index.html", "rb").read()),
    ("driver/index.html", open(BASE + "체크/driver/index_v28.html", "rb").read()),
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
