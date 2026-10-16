#!/usr/bin/env bash
# 시험 주소 · 관리 시험 주소에 «zip 직접 올리기»용 묶음을 만들어요 (Cloudflare GitHub 연결이 막혔을 때).
#   bash 홈페이지/통합입구/도구/올림/zip_만들기.sh [관리판, 기본 v4.7.1]
# 결과: 홈페이지/통합입구/도구/올림/zip/시험주소_<커밋>.zip · 관리_<판>_<커밋>.zip  (저장소에는 안 올라가요 · .gitignore)
# zip 안 맨 위에 index.html · _headers · robots.txt 가 바로 있어야 해요 (out/ 폴더째 넣지 않음).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ADMIN="${1:-v4.7.1}"
[[ "$ADMIN" =~ ^v[0-9.]+$ ]] || { echo "관리판 이름이 이상해요: $ADMIN"; exit 1; }
C=$(git rev-parse --short HEAD)
Z=홈페이지/통합입구/도구/올림/zip; mkdir -p "$Z"
mk(){ python3 - "$1" "$2" <<'P'
import sys,os,zipfile
src,dst=sys.argv[1],sys.argv[2]
with zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED) as z:
    for r,_,fs in os.walk(src):
        for f in sorted(fs):
            p=os.path.join(r,f); z.write(p,os.path.relpath(p,src))
P
}
rm -rf out; bash 홈페이지/통합입구/도구/올림/pages_build.sh 묶음 >/dev/null
test -f out/_headers && test -f out/index.html
mk out "$Z/시험주소_$C.zip"; rm -rf out
bash 홈페이지/통합입구/도구/올림/admin_build.sh "$ADMIN" >/dev/null
test -f out/_headers && test -f out/index.html
mk out "$Z/관리_${ADMIN}_$C.zip"; rm -rf out
ls -la "$Z"
