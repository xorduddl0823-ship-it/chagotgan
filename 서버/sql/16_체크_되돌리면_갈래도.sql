-- ============================================================
--  체크 입금 되돌리기 — 갈래도 처음대로 (check-api v43 · 2026-10-18 · 체크 방 TEST)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요.
--  (이 SQL 없이도 v43 은 돌아가요 — 되돌릴 때 갈래가 지금처럼 «검사비» 로 남을 뿐이에요)
-- ============================================================

-- 맞출 때 서버가 «미분류 → 검사비» 로 채웠다는 표시 — 되돌리면 «미분류» 로 돌려놓아요 (사람이 고른 갈래는 그대로)
alter table check_deposit add column if not exists kind_auto boolean not null default false;

-- 확인: true 면 끝
select 'check_deposit.kind_auto' as 칸, exists (select 1 from information_schema.columns where table_name = 'check_deposit' and column_name = 'kind_auto') as 있음;
