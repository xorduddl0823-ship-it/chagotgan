-- ============================================================
--  홈페이지 첫 결제 (결제 대기 + 체험판) — wash-api sb13 이 씁니다 (2026-10-15)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. (SQL 08 다음에)
-- ============================================================

-- 1) 업체 — 결제 대기 · 고른 요금제
alter table wash_shops add column if not exists pay_wait boolean not null default false;
alter table wash_shops add column if not exists join_plan text;
create index if not exists wash_shops_pay_wait on wash_shops (pay_wait) where pay_wait;

-- 2) 관리 설정 — 자유 가입 스위치(기본 꺼짐) · 가입 인증 한도
alter table wash_hq add column if not exists open_signup boolean not null default false;
alter table wash_hq add column if not exists signup_cfg jsonb not null default '{}'::jsonb;

-- 3) 카드 주문 — 결제 대기 업체 주문에 요금제를 고정 (결제 뒤 이 요금제로 열림 · 바꿔치기 막기)
alter table wash_pay_order add column if not exists plan_code text;

-- 4) 체험판 횟수 (기능마다 3번 · AI 3번 — 업체와 대표 번호 기준 · 업체를 지워도 번호 기준은 남음)
create table if not exists wash_trial_use (
  key         text primary key,
  n           int not null default 0,
  updated_at  timestamptz not null default now()
);
alter table wash_trial_use enable row level security;
create or replace function wash_trial_bump(p_key text, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into wash_trial_use (key, n) values (p_key, 1)
  on conflict (key) do update set n = wash_trial_use.n + 1, updated_at = now()
    where wash_trial_use.n < p_max
  returning n into v;
  return v is not null and v <= p_max;
end $$;
revoke all on function wash_trial_bump(text, int) from public, anon, authenticated;   -- 보안 SQL-M1: 공개 열쇠로 못 부르게
grant execute on function wash_trial_bump(text, int) to service_role;

-- 5) (SQL 08 보탬 · 보안 방) 관리 기록은 한꺼번에 비우기(truncate)도 막음
create or replace function hq_audit_no_truncate() returns trigger language plpgsql as $$
begin
  raise exception 'hq_audit 는 비울 수 없습니다';
end $$;
drop trigger if exists hq_audit_lock_truncate on hq_audit;
create trigger hq_audit_lock_truncate before truncate on hq_audit for each statement execute function hq_audit_no_truncate();
