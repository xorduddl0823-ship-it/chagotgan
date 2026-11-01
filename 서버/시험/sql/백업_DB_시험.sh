#!/usr/bin/env bash
# 데이터 통째 백업 SQL 시험 — 진짜 PostgreSQL 16 · Supabase 비슷한 역할(표 주인 = 슈퍼유저 아님 · anon/authenticated 기본 권한) · 큰 표 · 트리거 · RLS (운영 DB 아님)
# 실행:  bash 서버/시험/sql/백업_DB_시험.sh [백업 SQL 파일]   (기본: 서버/sql/29_데이터_백업_1101.sql · PGHOST/PGPORT 로 시험용 DB)
set -u
D="$(cd "$(dirname "$0")" && pwd)"; Q="$D/../../sql"; F="${1:-$Q/29_데이터_백업_1101.sql}"
P="psql -d postgres -U postgres -q -X"; O="psql -d postgres -U pgowner -q -X"
pass=0; fail=0
ok(){ if [ "$2" = "1" ]; then pass=$((pass+1)); echo "  ✅ $1"; else fail=$((fail+1)); echo "  ❌ $1  ($3)"; fi; }
$P -Atc "select 1" >/dev/null 2>&1 || { echo "DB 에 접속하지 못함"; exit 2; }
$P -c "drop schema if exists backup_20261101 cascade; drop schema if exists backup_20261101_before_restore cascade" >/dev/null 2>&1
$P -f "$D/가짜_운영표.sql" >/dev/null 2>&1
$P -f "$Q/급한고침_사업자번호_잠금.sql" >/dev/null 2>&1; $P -f "$Q/24_사업자번호_겹침_막기.sql" >/dev/null 2>&1; $P -f "$Q/26_한번만_처리_멱등키.sql" >/dev/null 2>&1
# Supabase 흉내: 표 주인은 슈퍼유저가 아닌 pgowner · public 기본 권한 anon/authenticated/service_role · 주인 역할 전체 기본 권한도 anon/authenticated 에(가장 나쁜 경우)
$P -c "do \$\$ begin
  if not exists (select 1 from pg_roles where rolname='pgowner') then create role pgowner login nosuperuser nobypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end \$\$;
  grant create on database postgres to pgowner; grant all on schema public to pgowner;
  grant usage on schema public to anon, authenticated, service_role;
  create table if not exists public.wash_docs_big (id bigint, shop text, data jsonb);
  insert into public.wash_docs_big select g, 'S'||(g%50), jsonb_build_object('n', g, 'plate', '12가'||g) from generate_series(1,300000) g;
  create table if not exists public.rls_only (id int, v text); insert into public.rls_only values (1,'a'),(2,'b'); alter table public.rls_only enable row level security;
  insert into cgg_idem (product,tenant,who,fn,rid,state) values ('wash','S1','010','sendMsg','abcdefghijklmnopqrstuvwx','unknown');
  do \$x\$ declare r record; begin for r in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I owner to pgowner', r.tablename); end loop; end \$x\$;
  grant all on all tables in schema public to anon, authenticated, service_role;
  alter default privileges for role pgowner in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges for role pgowner grant all on tables to anon, authenticated;" >/dev/null
sum(){ $P -Atc "select md5(string_agg(x, '|' order by x)) from (select t.tablename || ':' || (xpath('/row/m/text()', query_to_xml(format('select md5(coalesce(string_agg(z::text, chr(1) order by z::text), %L)) as m from public.%I z', '', t.tablename), false, true, '')))[1]::text as x from pg_tables t where t.schemaname='public') s"; }
before=$(sum)
echo "■ 표 주인(pgowner · 슈퍼유저 아님)으로 두 번 실행"
s1=$(date +%s); $O -f "$F" >/tmp/cggbk1.out 2>&1; s2=$(date +%s); $O -f "$F" >/tmp/cggbk2.out 2>&1
ok "첫 실행 오류 없음($((s2-s1))초 · 30만 줄 표 포함)" "$([ "$(grep -ci 'error' /tmp/cggbk1.out)" = "0" ] && echo 1 || echo 0)" "$(grep -i error /tmp/cggbk1.out | head -3)"
ok "두 번째 실행 오류 없음" "$([ "$(grep -ci 'error' /tmp/cggbk2.out)" = "0" ] && echo 1 || echo 0)" "$(grep -i error /tmp/cggbk2.out | head -3)"
ok "원본 표는 한 글자도 안 바뀜(모든 표 내용 지문)" "$([ "$before" = "$(sum)" ] && echo 1 || echo 0)" ""
n_pub=$($P -Atc "select count(*) from pg_tables where schemaname='public'"); n_bk=$($P -Atc "select count(*) from pg_tables where schemaname='backup_20261101'")
ok "public 표 전부 복사됨($n_pub개)" "$([ "$n_pub" = "$n_bk" ] && echo 1 || echo 0)" "$n_pub / $n_bk"
diffc=$($P -Atc "select count(*) from pg_tables t where t.schemaname='public' and (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text <> (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from backup_20261101.%I', t.tablename), false, true, '')))[1]::text")
ok "표마다 줄 수 같음(RLS 켠 표 · 큰 표 포함)" "$([ "$diffc" = "0" ] && echo 1 || echo 0)" "$diffc 개 다름"
ok "RLS 켠 표(정책 없음)도 줄이 다 복사됨" "$($P -Atc "select (count(*)=2)::int from backup_20261101.rls_only")" ""
ok "내용도 같음(큰 표 지문)" "$($P -Atc "select (md5(string_agg(z::text,'|' order by id)) = (select md5(string_agg(y::text,'|' order by id)) from public.wash_docs_big y))::int from backup_20261101.wash_docs_big z")" ""
echo "■ 복사본은 화면·서버 계정으로 안 보임"
for role in anon authenticated service_role; do
  ok "$role: 백업 칸 사용 권한 없음" "$($P -Atc "select (not has_schema_privilege('$role','backup_20261101','usage'))::int")" ""
  ok "$role: 백업 표 읽기 → permission denied" "$($P -c "set role $role; select count(*) from backup_20261101.wash_shops" 2>&1 | grep -c 'permission denied')" ""
  ok "$role: 백업 표에 권한 하나도 없음(기본 권한 포함)" "$($P -Atc "select (count(*)=0)::int from information_schema.role_table_grants where table_schema='backup_20261101' and grantee='$role'")" ""
done
echo "■ 복사본에는 트리거·색인이 없어 원본 동작에 영향 없음"
ok "백업 표에 트리거 없음" "$($P -Atc "select (count(*)=0)::int from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='backup_20261101' and not g.tgisinternal")" ""
ok "원본 트리거는 그대로(잠금·문지기)" "$($P -Atc "select (count(*)>=4)::int from pg_trigger where tgname in ('wash_shops_biz_lock','check_office_biz_lock','wash_shops_zz_biz_cross','check_office_zz_biz_cross')")" ""
grep -q "원본" /tmp/cggbk1.out && ok "끝에 원본·백업 줄 수 대조 표가 나옴" 1 "" || ok "끝에 원본·백업 줄 수 대조 표가 나옴" 0 "$(tail -3 /tmp/cggbk1.out)"
R="$Q/30_백업으로_되돌리기_1101.sql"
if [ -f "$R" ] && [ -z "${2:-}" ]; then
echo "■ 30 되돌리기 — 그냥 실행하면 아무것도 안 바뀜"
mid=$(sum); $O -f "$R" >/tmp/cggrs0.out 2>&1
ok "목록이 비어 있으면 바뀌는 것 없음 · 안내 글" "$([ "$mid" = "$(sum)" ] && grep -q '아무것도 바꾸지 않았어요' /tmp/cggrs0.out && echo 1 || echo 0)" "$(cat /tmp/cggrs0.out | head -3)"
echo "■ 자료를 망가뜨린 뒤 두 표만 되돌림"
$P -c "update wash_shops set name = '망가짐' ; delete from biz_share_req; insert into biz_share_req (product, code, biz_no, biz_sub, who, memo) values ('wash','ZZ','1112223333','0000','x','뒤에 생김'); update check_office set name = '그대로둠'" >/dev/null 2>&1
ok "(준비) 망가짐 확인" "$($P -Atc "select (count(*)>0)::int from wash_shops where name='망가짐'")" ""
sed "s/restore_list text\[\] := array\[\]::text\[\];/restore_list text[] := array['wash_shops', 'biz_share_req'];/" "$R" > /tmp/cggrs1.sql
$O -f /tmp/cggrs1.sql >/tmp/cggrs1.out 2>&1
ok "되돌리기 오류 없음(잠금·문지기 트리거가 있어도)" "$([ "$(grep -ci 'error' /tmp/cggrs1.out)" = "0" ] && echo 1 || echo 0)" "$(grep -i error /tmp/cggrs1.out | head -3)"
ok "wash_shops 가 백업과 같아짐" "$($P -Atc "select (md5(string_agg(z::text,'|' order by z::text)) = (select md5(string_agg(y::text,'|' order by y::text)) from (select shop,name,biz_no from backup_20261101.wash_shops) y))::int from (select shop,name,biz_no from public.wash_shops) z")" ""
ok "biz_share_req 가 백업과 같아짐(뒤에 생긴 줄 없어짐)" "$($P -Atc "select ((select count(*) from public.biz_share_req) = (select count(*) from backup_20261101.biz_share_req) and not exists (select 1 from public.biz_share_req where memo='뒤에 생김'))::int")" ""
ok "목록에 없는 표(check_office)는 그대로" "$($P -Atc "select (count(*)>0)::int from check_office where name='그대로둠'")" ""
ok "트리거 다시 켜짐" "$($P -Atc "select (count(*)=0)::int from pg_trigger where tgname in ('wash_shops_biz_lock','wash_shops_zz_biz_cross') and tgenabled <> 'O'")" ""
ok "되돌리기 직전 자료 남김(backup_20261101_before_restore)" "$($P -Atc "select (count(*)>0)::int from backup_20261101_before_restore.wash_shops where name='망가짐'")" ""
ok "그 복사본도 anon·서버 계정으로 안 보임" "$($P -c "set role anon; select 1 from backup_20261101_before_restore.wash_shops" 2>&1 | grep -c 'permission denied')" ""
echo "■ 없는 표를 넣으면 멈추고 아무것도 안 바뀜"
$P -c "update wash_shops set name='다시망가짐'" >/dev/null
sed "s/restore_list text\[\] := array\[\]::text\[\];/restore_list text[] := array['wash_shops', 'no_such_table'];/" "$R" > /tmp/cggrs2.sql
$O -f /tmp/cggrs2.sql >/tmp/cggrs2.out 2>&1
ok "오류 글 «멈췄어요» · wash_shops 도 안 바뀜(한 덩어리)" "$(grep -q '멈췄어요' /tmp/cggrs2.out && [ "$($P -Atc "select count(*) from wash_shops where name='다시망가짐'")" -gt 0 ] && echo 1 || echo 0)" "$(cat /tmp/cggrs2.out | head -2)"
fi
echo; echo "결과: ${pass}개 통과, ${fail}개 실패"; [ "$fail" = "0" ]
