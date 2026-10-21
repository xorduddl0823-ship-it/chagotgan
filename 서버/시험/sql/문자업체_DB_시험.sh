#!/usr/bin/env bash
# SQL 28(문자 업체 고르기) — 진짜 PostgreSQL 16 으로: 두 번 돌리기 · 처음 값 solapi · 이상한 값 거절 · 화면 계정(anon/authenticated) 못 읽음 · 서버 계정 읽고 씀 (운영 DB 아님)
# 실행:  bash 서버/시험/sql/문자업체_DB_시험.sh   (PGHOST/PGPORT 로 시험용 DB)
set -u
D="$(cd "$(dirname "$0")" && pwd)"; Q="$D/../../sql"
P="psql -d postgres -U postgres -q -X"; S="psql -d postgres -U service_role -q -X"
pass=0; fail=0
ok(){ if [ "$2" = "1" ]; then pass=$((pass+1)); echo "  ✅ $1"; else fail=$((fail+1)); echo "  ❌ $1  ($3)"; fi; }
$P -Atc "select 1" >/dev/null 2>&1 || { echo "DB 에 접속하지 못함(PGHOST · PGPORT 확인)"; exit 2; }
$P -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role login bypassrls; end if; end \$\$;
  grant usage on schema public to anon, authenticated, service_role; drop table if exists cgg_msg_vendor;
  alter default privileges in schema public grant all on tables to service_role, anon, authenticated;" >/dev/null 2>&1
$P -f "$Q/28_문자업체_고르기.sql" >/tmp/cgg28a.out 2>&1; $P -f "$Q/28_문자업체_고르기.sql" >/tmp/cgg28b.out 2>&1
ok "두 번 돌려도 오류 없음" "$([ "$(cat /tmp/cgg28a.out /tmp/cgg28b.out | grep -ci error)" = "0" ] && echo 1 || echo 0)" "$(grep -i error /tmp/cgg28*.out | head -2)"
ok "처음 값: 워시·체크 모두 solapi · RLS 켜짐" "$([ "$($P -Atc "select string_agg(product||'='||vendor, ',' order by product) from cgg_msg_vendor")" = "check=solapi,wash=solapi" ] && grep -q 'RLS 켜짐' /tmp/cgg28b.out && echo 1 || echo 0)" "$(cat /tmp/cgg28b.out)"
ok "서버 계정: 워시=비즈고로 바꿈" "$($S -Atc "update cgg_msg_vendor set vendor='bizgo' where product='wash' returning 1" 2>&1 | grep -c '^1$')" ""
ok "이상한 업체(kakao) 거절" "$($S -c "update cgg_msg_vendor set vendor='kakao' where product='check'" 2>&1 | grep -c 'check constraint')" ""
ok "이상한 제품(park) 거절" "$($S -c "insert into cgg_msg_vendor (product, vendor) values ('park','solapi')" 2>&1 | grep -c 'check constraint')" ""
ok "다시 돌려도 바꾼 값(워시=비즈고) 그대로" "$($P -f "$Q/28_문자업체_고르기.sql" >/dev/null 2>&1; $P -Atc "select count(*) from cgg_msg_vendor where product='wash' and vendor='bizgo'")" ""
ok "화면 계정 anon 은 못 읽음(권한 없음)" "$($P -c "set role anon; select * from cgg_msg_vendor" 2>&1 | grep -c 'permission denied')" ""
ok "화면 계정 authenticated 도 못 읽음" "$($P -c "set role authenticated; select * from cgg_msg_vendor" 2>&1 | grep -c 'permission denied')" ""
echo; echo "결과: ${pass}개 통과, ${fail}개 실패"; [ "$fail" = "0" ]
