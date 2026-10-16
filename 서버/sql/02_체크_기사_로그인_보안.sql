-- ============================================================
--  차곳간체크 배달 기사 로그인 보안 — check-api v23 이 씁니다
--  (보안 재검사 2026-10-14 A · C)
--  수파베이스 → SQL Editor 에 통째로 붙여 넣고 Run 한 번. **check-api v23 배포 전에** 실행하세요.
--  여러 번 실행해도 안전합니다 (이미 있으면 건너뜀).
--  손님 자료가 있는 기존 표(check_deliv_driver 등)는 하나도 바꾸지 않습니다. 새 표 2개 + 함수 1개만 만듭니다.
-- ============================================================

-- ① 기사 로그인 틀린 횟수 — 검사소+이름마다 한 줄 (key = 검사소id:이름)
create table if not exists check_deliv_fail (
  key          text primary key,
  fail_count   int not null default 0,           -- 비밀번호 연속 틀린 횟수
  locked_until timestamptz,                      -- 5번 틀리면 10분 잠금
  updated_at   timestamptz not null default now()
);

-- ② 기사가 스스로 가입한 기록 — 사무실 기사 목록에 「가입신청」으로 보입니다
--    사무실이 [사용]으로 승인하거나 비밀번호를 초기화하면 지워집니다.
create table if not exists check_deliv_signup (
  office_id    text not null,                    -- check_office.id 를 글자로 (id 종류에 상관없이 맞음)
  name         text not null,
  requested_at timestamptz not null default now(),
  primary key (office_id, name)
);

-- ③ 로그인 시도 횟수 — 비밀번호를 보기 전에 한 번에 올립니다 (동시에 보내도 새지 않음)
--    5번까지는 시도 가능, 5번째에 10분 잠금. 로그인 성공하면 서버가 그 줄을 지움.
--    돌려주는 값: true = 시도해도 됨, false = 잠김
--    (서버/sql/01 의 cgg_attempt 와 같은 규칙. 줄이 없으면 먼저 만듭니다)
create or replace function check_deliv_attempt(p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; expired boolean;
begin
  insert into check_deliv_fail (key) values (p_key) on conflict (key) do nothing;
  select (locked_until is not null and locked_until <= now()) into expired
    from check_deliv_fail where key = p_key for update;
  if not found then return false; end if;
  update check_deliv_fail set
      fail_count   = case when expired then 1 else fail_count + 1 end,
      locked_until = case
                       when expired then null
                       when locked_until is not null then locked_until
                       when fail_count + 1 >= 5 then now() + interval '10 minutes'
                       else null end,
      updated_at   = now()
    where key = p_key
    returning fail_count into n;
  return n <= 5;
end $$;
revoke all on function check_deliv_attempt(text) from public, anon, authenticated;
grant execute on function check_deliv_attempt(text) to service_role;   -- 서버 함수만 부를 수 있게 (2026-10-15 보안 재검사)

-- 표 보안(RLS) 켜기 — 정책을 하나도 만들지 않으므로
-- 브라우저(공개 열쇠)로는 아무도 못 읽고, 서버 함수(서비스 열쇠)만 읽습니다.
alter table check_deliv_fail   enable row level security;
alter table check_deliv_signup enable row level security;
