-- ============================================================
--  체크 검사소 설정 — 검사자 수수료 · 문자 수집함 (check-api v45 · 2026-10-18 · 체크 v50 단추)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요.
--  (이 SQL 없이도 v45 는 돌아가요 — 수수료 규칙 · 문자 수집함 저장만 «먼저 SQL 19» 안내가 나와요)
--  이 표는 서버만 읽고 써요(화면이 바로 읽지 못하게 RLS 켜고 규칙 없음). 수집함 비밀번호는 화면에 돌려주지 않아요.
-- ============================================================

create table if not exists check_office_conf (
  office_id  text primary key,
  fee_rules  jsonb,               -- {on, rules:[{who, how:"한 대마다"|"검사비 %", amt}]}
  sms_url    text,                -- 문자 수집함 주소 (https)
  sms_pw     text,                -- 문자 수집함 비밀번호 (서버에만)
  updated_at timestamptz not null default now()
);
alter table check_office_conf enable row level security;

-- 확인: true 면 끝
select 'check_office_conf' as 표, exists (select 1 from information_schema.tables where table_name = 'check_office_conf') as 있음;
