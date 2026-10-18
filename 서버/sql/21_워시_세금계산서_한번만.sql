-- ============================================================
--  워시 세금계산서 «한 번만» 잡기 표 (wash-api sb23 · 2026-10-18 · 대표님 «입금 전 세금계산서 발급 없음»)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요.
--  같은 차(입고 기록)로 세금계산서가 두 번 나가거나, 두 번 빨리 눌러 두 장 나가는 것을 막아요.
--  (이 SQL 전에는 sb23 이 실제 세금계산서를 발행하지 않고 «서버를 준비하는 중입니다» 안내만 해요 — 시험 발행은 돼요)
--  이 표는 서버만 읽고 써요(RLS 켬 · 규칙 없음).
-- ============================================================

create table if not exists wash_tax_rec (
  shop    text not null,              -- 업체 코드 (본사 결제는 ADMIN)
  rec_id  text not null,              -- 입고 기록 id (본사 결제는 pay:결제번호)
  who     text,                       -- 누른 사람 번호 끝 4자리
  at      timestamptz not null default now(),
  primary key (shop, rec_id)
);
alter table wash_tax_rec enable row level security;

-- 확인: true 면 끝
select 'wash_tax_rec' as 표, exists (select 1 from information_schema.tables where table_name = 'wash_tax_rec') as 있음;
