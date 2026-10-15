-- ============================================================
--  관리 한곳에서 — wash-api sb12 · check-api v30 이 씁니다 (2026-10-15)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다.
-- ============================================================

-- 1) 관리 기록 — 누가(본사 번호)·언제·무엇을. 넣기만 되고 고치거나 지울 수 없습니다(아래 잠금).
create table if not exists hq_audit (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  who           text,          -- 본사 사람 번호
  sid_tail      text,          -- 로그인 열쇠 끝 6자리
  ip            text,
  ua            text,
  action        text not null, -- view / stop / resume / pwReset / unlock / kick / grant / revoke / …
  target_phone  text,
  product       text,
  result        text,
  detail        jsonb          -- 비밀번호 값은 절대 안 넣음
);
create index if not exists hq_audit_target on hq_audit (target_phone, at desc);
create index if not exists hq_audit_at on hq_audit (at desc);
alter table hq_audit enable row level security;
create or replace function hq_audit_no_change() returns trigger language plpgsql as $$
begin
  raise exception 'hq_audit 는 고치거나 지울 수 없습니다';
end $$;
drop trigger if exists hq_audit_lock on hq_audit;
create trigger hq_audit_lock before update or delete on hq_audit for each row execute function hq_audit_no_change();

-- 2) 결제 장부 — 어느 카드 주문인지 · 어디서 냈는지 (관리 결제 목록에서 겹침 없애기)
alter table wash_payments add column if not exists order_id text;
alter table wash_payments add column if not exists source text;

-- 3) 체크 첫 비밀번호 문자 확인이 운영 중인지 (체크 서버 v26 이상을 올린 뒤 관리에서 켬) — 꺼져 있으면 체크 비밀번호 비우기 막힘
alter table wash_hq add column if not exists check_first_pw_sms boolean not null default false;

-- 4) 배달 기사 — 임시 비밀번호로 바꾼 뒤 «바로 바꾸기» (체크 서버 v30)
alter table check_deliv_driver add column if not exists must_change boolean not null default false;
