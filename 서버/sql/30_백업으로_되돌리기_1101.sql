-- ============================================================
-- 30. 백업(backup_20261101)으로 되돌리기 — 2026-11-01 · 서버 방 · «쓰지 않아도 되게» 준비만
-- ============================================================
-- ⚠ 혼자 실행하지 말고 꼭 총괄 방에 먼저 알려 주세요. 이 파일을 그냥 Run 하면 «아무것도 바뀌지 않아요»(아래 ③의 표 목록이 비어 있어요).
--
-- 문제가 생기면 이 순서로 해요(위에서부터 · 대부분 ①에서 끝나요)
-- ① 서버·화면 되돌리기(자료는 그대로): Supabase › Edge Functions 에 예전 판 파일을 다시 붙여 Deploy · 화면도 예전 판 파일로.
--     새 판이 자료를 망가뜨리지 않았다면 이것만으로 예전처럼 돌아가요.
-- ② 설치한 SQL 걷어 내기(자료는 그대로) — 서버를 예전 판으로 돌린 «뒤에»:
--     · 26: (확인 중 줄이 있으면 보낸 기록을 먼저 보고) drop table if exists cgg_idem;
--     · 24: 24번 파일 맨 아래 «되돌리기» 다섯 줄(문지기 트리거 2개 · 함수 3개). 표 biz_share_req · biz_share_ok · 칸 biz_sub 는 남겨도 돼요.
--     · 급한고침: 급한고침_사업자번호_잠금.sql 맨 아래 «되돌리기»(잠금 트리거 3개 · 함수 3개 · 색인 4개).
--     ※ 이 세 SQL 은 손님 자료를 바꾸지 않아요(표·칸·트리거·색인을 «더하기»만 해요 · 24 는 승인 대기 줄을 biz_share_req 에 더함).
--       그래서 ②만 해도 자료는 11/1 그대로예요.
-- ③ 자료를 11/1 백업으로 되돌리기 — 자료가 정말 망가졌을 때만, 망가진 «표만»:
--     아래 restore_list 에 표 이름을 넣고 Run. 한 덩어리로 움직여서 중간에 오류가 나면 «아무것도 안 바뀌어요».
--     · 되돌리기 «직전» 자료를 backup_20261101_before_restore 칸에 먼저 복사해 둬요(되돌린 것을 다시 되돌릴 수 있게).
--     · 그 표의 트리거(잠금·문지기)는 되돌리는 동안만 끄고 끝나면 다시 켜요.
--     · 백업 뒤에 생긴 칸(예: biz_sub)은 빈 값으로 둬요. 백업에 있는 칸만 되돌려요.
--     · ⚠ 백업 «뒤에» 들어온 손님 자료(새 입고·청구서 등)는 그 표에서 사라져요. 꼭 필요한 표만 넣어요.
-- ============================================================
set statement_timeout = '15min';
do $$
declare
  restore_list text[] := array[]::text[];      -- ← 예: array['wash_shops', 'check_office']  (비어 있으면 아무것도 안 함)
  t text; cols text; n_bk bigint; n_now bigint;
begin
  if coalesce(array_length(restore_list, 1), 0) = 0 then
    raise notice '되돌릴 표가 없어요(restore_list 가 비어 있음) — 아무것도 바꾸지 않았어요.';
    return;
  end if;
  execute 'create schema if not exists backup_20261101_before_restore';
  execute 'revoke all on schema backup_20261101_before_restore from public';
  foreach t in array restore_list loop
    if to_regclass(format('backup_20261101.%I', t)) is null then raise exception '백업에 표 % 이(가) 없어요 — 멈췄어요(아무것도 안 바뀜)', t; end if;
    if to_regclass(format('public.%I', t)) is null then raise exception '운영에 표 % 이(가) 없어요 — 멈췄어요(아무것도 안 바뀜)', t; end if;
    -- 두 쪽에 다 있는 칸만 · 계산되는 칸(generated)은 뺌
    select string_agg(format('%I', a.attname), ', ' order by a.attnum) into cols
      from pg_attribute a
     where a.attrelid = format('public.%I', t)::regclass and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
       and exists (select 1 from pg_attribute b where b.attrelid = format('backup_20261101.%I', t)::regclass
                    and b.attname = a.attname and b.attnum > 0 and not b.attisdropped);
    if to_regclass(format('backup_20261101_before_restore.%I', t)) is null then
      execute format('create table backup_20261101_before_restore.%I as table public.%I', t, t);
    end if;
    execute format('alter table public.%I disable trigger user', t);
    execute format('delete from public.%I', t);
    execute format('insert into public.%I (%s) overriding system value select %s from backup_20261101.%I', t, cols, cols, t);
    execute format('alter table public.%I enable trigger user', t);
    execute format('select count(*) from backup_20261101.%I', t) into n_bk;
    execute format('select count(*) from public.%I', t) into n_now;
    if n_bk <> n_now then raise exception '표 % 줄 수가 달라요(백업 % · 지금 %) — 멈췄어요(아무것도 안 바뀜)', t, n_bk, n_now; end if;
    raise notice '표 % : 11/1 백업으로 되돌림(% 줄) · 직전 자료는 backup_20261101_before_restore.% 에', t, n_now, t;
  end loop;
  execute 'revoke all on all tables in schema backup_20261101_before_restore from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema backup_20261101_before_restore from anon'; execute 'revoke all on all tables in schema backup_20261101_before_restore from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema backup_20261101_before_restore from authenticated'; execute 'revoke all on all tables in schema backup_20261101_before_restore from authenticated'; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'revoke all on schema backup_20261101_before_restore from service_role'; execute 'revoke all on all tables in schema backup_20261101_before_restore from service_role'; end if;
end $$;
