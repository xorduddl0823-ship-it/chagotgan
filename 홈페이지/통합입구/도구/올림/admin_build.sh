#!/usr/bin/env bash
# 관리 시험 칸(cgg-admin-test …)이 올릴 때 돌리는 명령입니다. 관리는 사용자 시험 주소와 «따로» 올려요 (규칙 1-3).
#   관리 화면 파일 하나 + 관리 방의 _headers(끼워 넣기 금지 · 검색 막기 · 저장 안 함)만 out/ 으로 옮깁니다.
#   판 고르기: 명령 끝에 v4.5 처럼 판 이름 (안 붙이면 v4.5). 판 이름은 숫자와 점만 받아요.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
VER="${1:-v4.5}"
case "$VER" in v[0-9]*) ;; *) echo "판 이름은 v4.5 모양이어야 해요: $VER"; exit 1;; esac
case "$VER" in *[!v0-9.]*) echo "판 이름에 쓸 수 없는 글자가 있어요: $VER"; exit 1;; esac
SRC="관리/3_차곳간_관리_index_${VER}.html"
[ -f "$SRC" ] || { echo "없는 파일: $SRC"; exit 1; }
rm -rf out && mkdir out
cp "$SRC" out/index.html
cp "관리/올리기용/_headers" out/_headers
printf 'User-agent: *\nDisallow: /\n' > out/robots.txt
echo "올린 관리 판: $SRC"
ls -la out
