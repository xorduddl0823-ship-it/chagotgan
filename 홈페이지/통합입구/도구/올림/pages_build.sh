#!/usr/bin/env bash
# Cloudflare Pages 시험 칸(cgg-test)이 올릴 때 돌리는 명령입니다.
#   통합 입구 파일 하나만 out/index.html 로 옮깁니다. 조립도구·시험용 파일은 올리지 않습니다.
#   판 고르기: 명령 끝에 v3 처럼 판 이름을 붙이면 0_차곳간_통합_index_v3.html 을 올립니다. 안 붙이면 v2.
#   한 번에 올리기: 명령 끝에 «묶음» → 올릴_목록.txt 의 파일을 모두 올립니다 (새 J안 판 시험용).
set -euo pipefail
cd "$(dirname "$0")/../../../.."
rm -rf out && mkdir out
if [ "${1:-}" = "묶음" ]; then
  # 한 번에 올리기: 홈페이지/통합입구/도구/올림/올릴_목록.txt 에 적힌 파일·폴더만 옮깁니다.
  LIST="홈페이지/통합입구/도구/올림/올릴_목록.txt"
  grep -v '^\s*#' "$LIST" | grep '|' | while IFS='|' read -r DEST SRC _; do
    DEST="$(echo "$DEST" | xargs)"; SRC="$(echo "$SRC" | xargs)"
    case "$DEST" in /*) ;; *) echo "경로는 / 로 시작해야 해요: $DEST"; exit 1;; esac
    case "$DEST$SRC" in *..*) echo "'..' 는 쓸 수 없어요"; exit 1;; esac
    echo "올림: $SRC → $DEST"
    if [ -d "$SRC" ]; then mkdir -p "out$DEST"; cp -R "$SRC"/. "out$DEST"
    else mkdir -p "$(dirname "out$DEST")"; cp "$SRC" "out$DEST"; fi
  done
  # 시안처럼 머리(<!doctype>)가 없는 화면 파일은 머리를 씌웁니다.
  for f in $(find out -name '*.html'); do
    head -c 200 "$f" | grep -qi '<!doctype' || { { echo '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'; cat "$f"; echo '</body></html>'; } > "$f.tmp" && mv "$f.tmp" "$f"; }
  done
  # 시험 주소 안에서는 «로그인·결제»가 시험 주소의 통합 입구(/)로 가게 합니다 (손님 주소로 새지 않게).
  for f in out/home/index.html out/join.html; do [ -f "$f" ] && sed -i 's#https://app\.cgg\.co\.kr/#/#g' "$f"; done
  for f in $(grep -rl 'CGG-BIZ-START' out --include='*.html' || true); do python3 홈페이지/공통/사업자정보.py "$f" || true; done
else
  SRC="홈페이지/통합입구/0_차곳간_통합_index${1:+_$1}.html"
  echo "올리는 판: $SRC"
  cp "$SRC" out/index.html
  # 사업자 정보 칸을 홈페이지/공통/사업자정보.json 최신 값으로 다시 채웁니다 (파이썬이 없으면 묶을 때 넣은 값 그대로).
  python3 홈페이지/공통/사업자정보.py out/index.html || echo "사업자 정보: 묶을 때 값 그대로 씀"
fi
# 검색 사이트에 안 뜨게, 다른 사이트가 이 화면을 몰래 품지 못하게 합니다.
cat > out/_headers <<'H'
/*
  X-Robots-Tag: noindex, nofollow
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Content-Security-Policy: frame-ancestors 'self'
  Referrer-Policy: strict-origin-when-cross-origin
H
printf 'User-agent: *\nDisallow: /\n' > out/robots.txt
ls -la out
