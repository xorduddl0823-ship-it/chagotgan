#!/usr/bin/env bash
# 출시마감 3차 — 서버 시험 전부를 명령 한 번으로 (운영 접속 0 · 실제 발송 0 · 가짜 DB/가짜 문자 업체)
# 필요: deno 2 · node 18+ · (DB 시험만) PostgreSQL 16 과 PGHOST/PGPORT — 없으면 DB 시험은 «건너뜀»으로 적음
set -u
R="$(cd "$(dirname "$0")" && pwd)"; T="$R/서버/시험"; cd "$R"
W="$R/서버/1_차곳간워시_서버_wash-api_sb29.ts"; C="$R/서버/2_차곳간체크_서버_check-api_v54.ts"; DL="$R/서버/3_딜러앱_서버_dealer-api_d9.ts"
tot=0; bad=0; skip=0
one(){ name="$1"; shift; echo; echo "===== $name"; "$@"; rc=$?; tot=$((tot+1)); [ $rc = 0 ] || { bad=$((bad+1)); echo "!!!!! 실패: $name (끝 코드 $rc)"; }; }
dw(){ WASH_SRC="$W" deno run -A --no-lock --import-map="$T/import_map_wash.json" "$T/$1"; }
dc(){ CHECK_SRC="$C" deno run -A --no-lock --import-map="$T/import_map_check.json" "$T/$1"; }
dd(){ DEALER_SRC="$DL" deno run -A --no-lock --import-map="$T/import_map_dealer.json" "$T/$1"; }
one "1~4 워시 sb29 보내기 한 번만·확인 중"        dw 출시마감3차_워시_sb29_시험.ts
one "1~4 체크 v54 보내기 한 번만·확인 중"        dc 출시마감3차_체크_v54_시험.ts
one "회귀 워시 sb29 기록·알림톡 rid"             dw 기록_알림톡_마감_워시_sb29_시험.ts
one "회귀 체크 v54 기록·알림톡 rid"             dc 체크v54_기록_알림톡_마감_시험.ts
one "회귀 체크 v54 도착 알림(대체 문자·확인 중)" dc 알림톡_체크_v54_시험.ts
one "회귀 체크 v54 도착·출고 안내"              dc 체크v34_도착_출고안내_시험.ts
one "회귀 워시 sb29 중복 사업자번호"             dw 중복사업자번호_워시_sb29_시험.ts
one "회귀 체크 v54 중복 사업자번호"             dc 체크v53_중복사업자번호_시험.ts
one "회귀 체크 v54 재검사·청구서(v33 시험 · 판 이름은 v54 로 맞춤)" dc 체크v33_청구서보내기_재검사알림_시험.ts
one "회귀 딜러 d9 업체 격리"                    dd 업체격리_딜러_d9_시험.ts
if [ -n "${PGHOST:-}" ] && command -v psql >/dev/null; then
  one "DB SQL 26 상태 넷·동시 다시 잡기(진짜 PostgreSQL)" bash "$T/sql/멱등키_DB_시험.sh"
  one "DB SQL 23·24·25 사업자번호(진짜 PostgreSQL)"      bash "$T/sql/사업자번호_DB_시험.sh"
else echo; echo "===== DB 시험 건너뜀(PGHOST 없음)"; skip=2; fi
one "6 보안 방 시험기 A/B 28(격리 HTTP · 127.0.0.1)" env WASH_SRC="$W" CHECK_SRC="$C" DEALER_SRC="$DL" bash "$T/격리환경/실행.sh"
echo; echo "■ 모두: 묶음 ${tot}개 · 실패 ${bad}개 · 건너뜀 ${skip}개"; [ "$bad" = 0 ]
