-- ============================================================
--  시험 계정 준비 — 시험 날(2026-10-16 금 18시)용 · 설계 05 「★ 시험 날 순서」 2~3번을 한 파일로
--  먼저: SQL 02·04·05~09 + 체크 서버 v30 + 워시 서버 sb13 을 올린 뒤에 Run.
--  번호는 이 파일에 적지 않아요. 아래 <…> 칸만 대표님이 바꿔서 Run (여러 번 Run 해도 안전).
--  시험 기사·시험 딜러는 SQL 이 아니라 화면에서 만들어요 (맨 아래 안내).
-- ============================================================

-- [1] 체크 시험 검사소(TEST) + 시험 직원(대표 직급) — 비밀번호는 비워 둠
--     → Run 뒤 바로 «cgg-test 새 체크 화면» 으로 그 번호 처음 로그인 (휴대폰 확인 번호 → 비밀번호 6자 이상)
--     ※ 운영 체크 화면(check.cgg.co.kr · v21)에는 확인 번호 칸이 없어서 처음 로그인을 못 해요
-- 체크 시험 직원 한 명 넣기 (시험 검사소 TEST 에, 여러 번 Run 해도 안전)
do $$
declare
  v_phone text := '<체크 시험 번호 숫자만>';
  v_name  text := '<이름 — 가온 대표와 다른 이름, 예: 시험대표>';
  t text;
begin
  if v_phone !~ '^01[0-9]{8,9}$' then
    raise exception '번호를 숫자만 01012345678 처럼 넣어 주세요';
  end if;
  -- ① 시험 검사소(TEST) — 실제 손님 자료가 있는 검사소와 따로
  if not exists (select 1 from check_office where code = 'TEST') then
    begin
      insert into check_office (code, name) values ('TEST', '시험검사소');
    exception when not_null_violation then
      select data_type into t from information_schema.columns
       where table_schema = 'public' and table_name = 'check_office' and column_name = 'id';
      execute format('insert into check_office (id, code, name) values (gen_random_uuid()::%s, %L, %L)', t, 'TEST', '시험검사소');
    end;
  end if;
  -- ② 시험 직원 — 비밀번호는 비워 둠 (체크에 처음 로그인할 때 적는 비밀번호로 정해짐)
  if exists (select 1 from check_user where phone = v_phone and office_id = (select id from check_office where code = 'TEST')) then
    update check_user set name = v_name, role = 'owner', active = true
     where phone = v_phone and office_id = (select id from check_office where code = 'TEST');
  else
    begin
      insert into check_user (office_id, phone, name, role, active)
      values ((select id from check_office where code = 'TEST'), v_phone, v_name, 'owner', true);
    exception when not_null_violation then
      select data_type into t from information_schema.columns
       where table_schema = 'public' and table_name = 'check_user' and column_name = 'id';
      execute format('insert into check_user (id, office_id, phone, name, role, active) values (gen_random_uuid()::%s, (select id from check_office where code = %L), %L, %L, %L, true)',
                     t, 'TEST', v_phone, v_name, 'owner');
    end;
  end if;
  raise notice '끝: % 님을 시험검사소(TEST)의 대표(owner)로 넣었어요', v_name;
end $$;

-- [2] 통합 입구 출입 명단 (cgg_access) — 번호는 숫자만(01012345678)
--     「권한 없음」 시험 번호는 명단에 active=false 로 넣어요 (명단에 아예 없으면 워시는 예전 손님처럼 들어가져서 시험이 안 됨)
insert into cgg_access (phone, name, products, active) values
  ('<대표님 번호 숫자만>',     '대표님',   '{wash,check}', true),
  ('<서브 번호 숫자만>',       '서브',     '{wash}',       true),
  ('<회사 대표번호 숫자만>',   '회사대표', '{check}',      true),
  ('<권한 없음 시험 번호 숫자만>', '권한없음', '{}',        false)
on conflict (phone) do update
  set products = excluded.products, name = excluded.name, active = excluded.active,
      fail_count = 0, locked_until = null, updated_at = now();
-- (권한 없음 번호를 안 쓰면 위 넷째 줄을 지우고 Run)

-- [3] 잘 들어갔는지 보기
select name, products, active from cgg_access order by created_at;
select c.code, u.name, u.role, u.active, (u.pw_hash is not null) as 비밀번호정함
  from check_user u join check_office c on c.id = u.office_id where c.code = 'TEST';

-- [4] 시험 기사 · 시험 딜러 — SQL 없이 화면에서
--   기사: cgg-test 새 체크 화면(TEST 대표로 로그인) › 기사 › [기사 등록] 이름 + 비밀번호 6자 이상
--         → 기사 화면 로그인 때 회사 칸에 TEST
--   딜러: 딜러앱에서 시험 번호로 인증번호 받아 들어가면 계정이 생김 (약관 동의 한 번)

-- [5] 시험 뒤 정리 (필요할 때 주석 /* */ 를 빼고 Run)
/*
update check_user set active = false where office_id = (select id from check_office where code = 'TEST');
delete from check_session where office_id = (select id from check_office where code = 'TEST');
update check_deliv_driver set active = false, token = null where office_id = (select id from check_office where code = 'TEST');
update cgg_access set active = false where name in ('대표님','서브','회사대표','권한없음');
*/
