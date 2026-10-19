#!/bin/sh
# 워시 v143.1 시험 (V=143 이면 v143) — 저장소 맨 위에서: sh 운영/긴급/챗지피티_검증_출시마감_3차/화면/워시/시험_돌리기.sh
# 필요: python3 · node · playwright(+chromium). 실제 서버 · 실제 발송 없음(미리보기 가짜 서버).
set -e
D=$(dirname "$0"); OUT=${OUT:-/tmp/wash_v143_test}; V=${V:-143.1}; mkdir -p "$OUT/pv$V"
PV_OUT="$OUT/pv$V" SEEDMODE=1 TESTHOOK=1 python3 워시/시안/만들기_워시_v112_미리보기.py v$V
python3 "$D/시험판_만들기_v143.py" "$OUT" v$V
V=$V node "$D/시험_v143.mjs" "$OUT"
