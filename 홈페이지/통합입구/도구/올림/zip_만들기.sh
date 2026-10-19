#!/usr/bin/env bash
# 시험 주소 · 관리 시험 주소에 «zip 직접 올리기»용 묶음을 만들어요 (Cloudflare GitHub 연결이 막혔을 때).
#   bash 홈페이지/통합입구/도구/올림/zip_만들기.sh [관리판, 기본 v4.8.2]
# 결과: 홈페이지/통합입구/도구/올림/zip/시험주소_<커밋>.zip · 관리_<판>_<커밋>.zip  (저장소에는 안 올라가요 · .gitignore)
# zip 안 맨 위에 index.html · _headers · robots.txt 가 바로 있어야 해요 (out/ 폴더째 넣지 않음).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ADMIN="${1:-v4.8.2}"
[[ "$ADMIN" =~ ^v[0-9.]+$ ]] || { echo "관리판 이름이 이상해요: $ADMIN"; exit 1; }
C=$(git rev-parse --short HEAD)
Z=홈페이지/통합입구/도구/올림/zip; mkdir -p "$Z"
mk(){ python3 - "$1" "$2" <<'P'
import sys,os,zipfile
src,dst=sys.argv[1],sys.argv[2]
with zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED) as z:
    files=[]
    for r,_,fs in os.walk(src):
        for f in sorted(fs):
            files.append(os.path.join(r,f))
    # 만든 시각을 1980-01-01 로 고정 — 어디서 만들어도 zip 지문(sha256)이 같게 (보안 방 10/18)
    for p in sorted(files, key=lambda x: os.path.relpath(x,src)):
        zi=zipfile.ZipInfo(os.path.relpath(p,src), date_time=(1980,1,1,0,0,0))
        zi.compress_type=zipfile.ZIP_DEFLATED; zi.external_attr=0o644<<16
        z.writestr(zi, open(p,"rb").read())
P
}
rm -rf out; bash 홈페이지/통합입구/도구/올림/pages_build.sh 묶음 >/dev/null
test -f out/_headers && test -f out/index.html
mk out "$Z/시험주소_$C.zip"; rm -rf out
bash 홈페이지/통합입구/도구/올림/admin_build.sh "$ADMIN" >/dev/null
test -f out/_headers && test -f out/index.html
mk out "$Z/관리_${ADMIN}_$C.zip"; rm -rf out
# 체크 정식(check.cgg.co.kr)에 바꿔 넣을 화면 한 장 — 안에는 index.html 하나만 (안내: 체크정식_바꿔치기.md)
CHECK="체크/2_차곳간_체크_index_v55.html"
mkdir out && cp "$CHECK" out/index.html
mk out "$Z/체크정식_v55_index만_$C.zip"; rm -rf out
# 실제 메인 홈페이지(cgg.co.kr)용 — 홈페이지 v2 + 가입 v6 + _headers (안내: 홈페이지정식_올리기.md)
#   시험 주소와 달리 «로그인»은 실제 app.cgg.co.kr 그대로 (주소 바꾸기 없음)
mkdir out && cp 홈페이지/소개/0_차곳간_홈페이지_v2.html out/index.html && cp 홈페이지/join_v6.html out/join.html
python3 홈페이지/통합입구/도구/올림/홈페이지정식_머리.py out/index.html >/dev/null   # 실제 홈페이지만 검색에 나오게(총괄 10/19)
printf '/*\n  X-Frame-Options: SAMEORIGIN\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: frame-ancestors '"'"'self'"'"'\n  Referrer-Policy: strict-origin-when-cross-origin\n' > out/_headers
mk out "$Z/홈페이지정식_v2_$C.zip"; rm -rf out
ls -la "$Z"
