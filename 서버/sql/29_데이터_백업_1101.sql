-- ============================================================
-- 29. 데이터 통째 백업 (2026-11-01 · 총괄 초안 → 서버 방 확인·보강) — 새 판 올리기 «전에» 한 번 실행
-- ============================================================
-- 무엇을: 지금 운영 자료(public 의 모든 표)를 «backup_20261101» 이라는 따로 된 칸에 그대로 복사해 둬요.
--   · 원래 표는 읽기만 하고 바꾸지 않아요. 지우는 것도 없어요.
--   · 복사본은 손님 화면·서버에서 보이지 않게 잠가 둬요(본사 SQL Editor 에서만 보여요).
--   · 두 번 실행해도 괜찮아요(이미 있는 복사본은 그대로 둬요).
-- 실행: SQL Editor → 새 쿼리 → 이 파일 전체 붙여 넣기 → Run
-- 끝나면: 맨 아래 표에서 «원본»과 «백업» 숫자가 줄마다 같으면 백업 끝이에요. 사진을 총괄 방에 보내 주세요.
-- 되돌리기(자료를 이 때로 돌리기)는 혼자 하지 말고 꼭 총괄 방에 먼저 알려 주세요(표마다 순서가 있어요).
--   순서·SQL: 서버/sql/30_백업으로_되돌리기_1101.sql (그냥 실행하면 아무것도 안 바뀌게 만들어 뒀어요)
-- 알아 둘 것(서버 방 확인 2026-11-01 · 진짜 PostgreSQL 시험 서버/시험/sql/백업_DB_시험.sh):
--   · 표의 «자료»만 복사해요. 색인·트리거·RLS 는 복사하지 않아요(복사본이 원래 표 동작에 끼어들지 않게).
--   · 사진 파일(Storage 보관함)과 로그인 계정(auth)은 이 백업에 들어가지 않아요. 이번 새 판은 그 둘을 바꾸지 않아요.
--   · 두 번째 실행은 «처음 복사본을 그대로» 둬요. 그 사이 손님 자료가 바뀌었으면 아래 표의 «같음?»이 «다름»으로 보여요(정상).
--   · 큰 표가 있어도 멈추지 않게 이 실행 동안만 시간 제한을 15분으로 늘려요.
-- ============================================================

set statement_timeout = '15min';
create schema if not exists backup_20261101;
revoke all on schema backup_20261101 from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema backup_20261101 from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema backup_20261101 from authenticated'; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'revoke all on schema backup_20261101 from service_role'; end if;   -- 서버 방: 서버 열쇠로도 못 보게
end $$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' order by tablename loop
    if to_regclass(format('backup_20261101.%I', r.tablename)) is null then
      execute format('create table backup_20261101.%I as table public.%I', r.tablename, r.tablename);
    end if;
  end loop;
  -- 복사본은 서버 열쇠·손님 열쇠로 못 보게 (본사 SQL Editor 만)
  execute 'revoke all on all tables in schema backup_20261101 from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on all tables in schema backup_20261101 from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on all tables in schema backup_20261101 from authenticated'; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'revoke all on all tables in schema backup_20261101 from service_role'; end if;
end $$;

-- 확인 표: 표마다 원본 줄 수 = 백업 줄 수 (같음? 칸이 모두 «같음»이면 끝)
select 표, 원본, 백업, case when 원본 = 백업 then '같음' else '다름 ⚠' end as "같음?" from (
select t.tablename as 표,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text::bigint as 원본,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from backup_20261101.%I', t.tablename), false, true, '')))[1]::text::bigint as 백업
  from pg_tables t
 where t.schemaname = 'public'
) x
 order by 1;
