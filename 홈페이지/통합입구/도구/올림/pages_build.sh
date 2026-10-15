#!/usr/bin/env bash
# Cloudflare Pages 시험 칸(cgg-test)이 올릴 때 돌리는 명령입니다.
#   통합 입구 파일 하나만 out/index.html 로 옮깁니다. 조립도구·시험용 파일은 올리지 않습니다.
#   판 고르기: 명령 끝에 v3 처럼 판 이름을 붙이면 0_차곳간_통합_index_v3.html 을 올립니다. 안 붙이면 v2.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
rm -rf out && mkdir out
SRC="홈페이지/통합입구/0_차곳간_통합_index${1:+_$1}.html"
echo "올리는 판: $SRC"
cp "$SRC" out/index.html
# 검색 사이트에 안 뜨게, 다른 사이트가 이 화면을 몰래 품지 못하게 합니다.
cat > out/_headers <<'H'
/*
  X-Robots-Tag: noindex, nofollow
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: frame-ancestors 'self'
  Referrer-Policy: strict-origin-when-cross-origin
H
printf 'User-agent: *\nDisallow: /\n' > out/robots.txt
ls -la out
