-- ============================================================
--  결제 빈 곳 메우기 — wash-api sb10 · pay-hook p1 · dealer-api d6 가 씁니다 (2026-10-15)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다.
--  표만 만들고, 자동 결제는 관리 스위치(billing_on)를 켜기 전까지 움직이지 않습니다.
--  새 표는 RLS 를 켜고 정책을 두지 않습니다 (서버 함수만 읽고 씀 · 화면에서 직접 못 봄).
-- ============================================================

-- 1) 웹훅 받은 기록 (받은 시각 · 이벤트 · 주문번호 · 처리 결과 — 카드 정보는 안 남김)
create table if not exists pay_webhook_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  event      text,
  order_id   text,
  result     text
);
create index if not exists pay_webhook_log_order on pay_webhook_log (order_id);
alter table pay_webhook_log enable row level security;

-- 2) 자동 결제 — 업체마다 한 줄. billing_key_enc 는 서버가 잠근 값(AES-GCM)만
create table if not exists pay_billing (
  shop             text primary key,
  customer_key     text not null unique,
  billing_key_enc  text,
  key_ver          int,
  card_company     text,
  card_last4       text,
  status           text not null default 'pending',   -- pending / on / off
  agreed_at        timestamptz,
  agreed_text_ver  text,
  next_at          date,
  fail_count       int not null default 0,
  first_fail_at    date,
  last_fail_msg    text,
  updated_at       timestamptz not null default now()
);
alter table pay_billing enable row level security;

create table if not exists pay_billing_log (
  id        bigserial primary key,
  shop      text not null,
  order_id  text,
  amount    int,
  try_no    int,
  result    text,
  msg       text,
  at        timestamptz not null default now()
);
create index if not exists pay_billing_log_shop on pay_billing_log (shop, at desc);
alter table pay_billing_log enable row level security;

-- 3) 카드 주문 — 자동 결제 날짜(같은 업체·같은 날 한 줄만) · 몇 번째 시도
alter table wash_pay_order add column if not exists bill_date date;
alter table wash_pay_order add column if not exists try_no int;
create unique index if not exists wash_pay_order_bill_once on wash_pay_order (shop, bill_date) where bill_date is not null;

-- 4) 관리 스위치 — 토스 자동결제 추가 계약 뒤 본사가 켬 (기본 꺼짐)
alter table wash_hq add column if not exists billing_on boolean not null default false;

-- 5) 청구서 보기코드 — 청구서를 받은 휴대폰 번호들 (딜러앱 myBills 는 이 번호로만 이어 붙임)
alter table wash_viewcode add column if not exists to_phones text[] not null default '{}';
create index if not exists wash_viewcode_to_phones on wash_viewcode using gin (to_phones);
