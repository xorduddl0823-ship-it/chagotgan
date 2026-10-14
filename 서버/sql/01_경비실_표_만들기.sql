-- ============================================================
--  차곳간 경비실(통합 로그인) 표 3개 — cgg-api v1 / check-api v22 가 씁니다
--  수파베이스 → SQL Editor 에 통째로 붙여 넣고 Run 한 번.
--  여러 번 실행해도 안전합니다 (이미 있으면 건너뜀).
--  손님 자료가 있는 기존 표(wash_*, check_*)는 하나도 바꾸지 않습니다.
-- ============================================================

-- ① 통합 입구 출입 명단 — 「이 번호로 어떤 제품을 열 수 있나」
--    products 에는 'wash', 'check' 만 씁니다 (관리는 통합 입구에 넣지 않음 · 규칙 1-3)
create table if not exists cgg_access (
  phone        text primary key,                 -- 숫자만 (01012345678)
  name         text not null default '',         -- 화면 위에 보일 이름
  products     text[] not null default '{}',     -- 예: {wash} / {check} / {wash,check}
  two_step     boolean not null default false,   -- true 면 로그인 뒤 문자 6자리 확인
  active       boolean not null default true,    -- false 면 통합 입구 · 체크 모두 막힘
  memo         text not null default '',
  fail_count   int not null default 0,           -- 비밀번호 연속 틀린 횟수
  locked_until timestamptz,                      -- 5번 틀리면 10분 잠금
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint cgg_access_products_ok check (products <@ array['wash','check']::text[])
);

-- ② 통합 입구 로그인 기록 — 제품별 로그인 열쇠를 묶어 둡니다
create table if not exists cgg_session (
  sid         text primary key,                  -- cgg_ 로 시작
  phone       text not null,
  wash_sid    text,                              -- wash_sessions.sid
  wash_shop   text,
  check_sid   text,                              -- check_session.sid (chk_)
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists cgg_session_phone on cgg_session(phone);

-- ③ 문자 6자리 확인 대기표 (two_step 계정만)
create table if not exists cgg_tick (
  tick        text primary key,
  phone       text not null,
  code_hash   text not null,                     -- 숫자 자체는 저장하지 않음
  tries       int not null default 0,
  wash_sid    text,
  wash_shop   text,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ④ 로그인 시도 횟수 — 비밀번호를 보기 전에 한 번에 올립니다 (동시에 보내도 새지 않음)
--    5번까지는 시도 가능, 5번째에 10분 잠금. 로그인 성공하면 서버가 0으로 되돌림.
--    돌려주는 값: true = 시도해도 됨, false = 잠김 / 명단에 없음
create or replace function cgg_attempt(p_phone text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; expired boolean;
begin
  select (locked_until is not null and locked_until <= now()) into expired
    from cgg_access where phone = p_phone for update;
  if not found then return false; end if;
  update cgg_access set
      fail_count   = case when expired then 1 else fail_count + 1 end,
      locked_until = case
                       when expired then null
                       when locked_until is not null then locked_until
                       when fail_count + 1 >= 5 then now() + interval '10 minutes'
                       else null end,
      updated_at   = now()
    where phone = p_phone
    returning fail_count into n;
  return n <= 5;
end $$;
revoke all on function cgg_attempt(text) from public, anon, authenticated;

-- 표 보안(RLS) 켜기 — 정책을 하나도 만들지 않으므로
-- 브라우저(공개 열쇠)로는 아무도 못 읽고, 서버 함수(서비스 열쇠)만 읽습니다.
alter table cgg_access  enable row level security;
alter table cgg_session enable row level security;
alter table cgg_tick    enable row level security;

-- ============================================================
--  시험 계정 넣는 예시 (번호·이름은 대표님 것으로 바꿔서 따로 실행)
--  비밀번호는 여기 넣지 않습니다 — 워시/체크에서 쓰던 비밀번호 그대로 씁니다.
--
--  insert into cgg_access (phone, name, products) values
--    ('01011112222', '시험-워시만',  '{wash}'),
--    ('01033334444', '시험-체크만',  '{check}'),
--    ('01055556666', '시험-둘다',    '{wash,check}')
--  on conflict (phone) do update set products = excluded.products, name = excluded.name,
--                                    active = true, updated_at = now();
-- ============================================================
