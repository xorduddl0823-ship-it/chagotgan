-- ============================================================
--  체크 검사비 손 입력 칸 (check-api v44 · 2026-10-18 · 가온 검사비 바로잡기)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요.
--  (이 SQL 없이도 v44 는 돌아가요 — «수출 가성능» 금액을 손으로 넣는 것만 안 될 뿐이에요)
-- ============================================================

-- 차 한 대 검사비를 손으로 넣은 값 (원 · 부가세 별도 · 비어 있으면 단가표대로)
alter table check_car add column if not exists fee_manual integer;

-- 확인: true 면 끝
select 'check_car.fee_manual' as 칸, exists (select 1 from information_schema.columns where table_name = 'check_car' and column_name = 'fee_manual') as 있음;
