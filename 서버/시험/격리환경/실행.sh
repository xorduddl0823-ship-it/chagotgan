#!/usr/bin/env bash
# 격리 시험 환경: 워시 sb28 · 체크 v53 · 딜러 d9 를 가짜 수파베이스로 127.0.0.1 에 띄우고 보안 방 시험기를 돌림. 운영 접속 0.
D="$(cd "$(dirname "$0")" && pwd)"; M="$D/.."
deno run -A --no-lock --import-map="$M/import_map_wash.json"   "$D/워시_서버.ts"   >/tmp/cgg_w.log 2>&1 & P1=$!
deno run -A --no-lock --import-map="$M/import_map_check.json"  "$D/체크_서버.ts"   >/tmp/cgg_c.log 2>&1 & P2=$!
deno run -A --no-lock --import-map="$M/import_map_dealer.json" "$D/딜러_서버.ts"   >/tmp/cgg_d.log 2>&1 & P3=$!
trap 'kill $P1 $P2 $P3 2>/dev/null' EXIT
for i in $(seq 1 40); do n=$(cat /tmp/cgg_w.log /tmp/cgg_c.log /tmp/cgg_d.log 2>/dev/null | grep -c "듣는 중"); [ "$n" = "3" ] && break; sleep 0.25; done
[ "$n" = "3" ] || { echo "서버를 띄우지 못함"; cat /tmp/cgg_[wcd].log | tail -20; exit 3; }
node "$D/시험기_실행.js"; rc=$?
echo "끝 코드 $rc"; exit $rc
