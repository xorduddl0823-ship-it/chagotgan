-- ============================================================
--  체크 세금계산서 입금 뒤 발급 · 전산외 계산서발행 · 보험료 부가세 (check-api v46 · 2026-10-18 · 체크 v52)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요.
--  (이 SQL 없이도 v46 은 돌아가요 — 전산외 Y/N 저장 · «입금 전 발급» · 보험료 부가세 설정만 안 돼요.
--   입금 전 발급은 표시를 남기지 못하면 발급하지 않아요)
-- ============================================================

-- 전산외(나스 엑셀) 차의 «계산서발행(Y/N)» · «사유»
alter table check_car add column if not exists tax_yn   text;
alter table check_car add column if not exists tax_note text;

-- 대표가 «입금 전 발급»을 고른 시각
alter table check_invoice add column if not exists tax_unpaid_ok_at timestamptz;

-- 보험료 금액에 부가세가 들었는지 (미포함 기본 / 포함)
alter table check_office add column if not exists ins_vat text not null default '미포함';

-- 확인: 4줄 모두 true 면 끝
select c.칸, exists (select 1 from information_schema.columns where table_name = c.t and column_name = c.k) as 있음
  from (values ('check_car.tax_yn', 'check_car', 'tax_yn'), ('check_car.tax_note', 'check_car', 'tax_note'),
               ('check_invoice.tax_unpaid_ok_at', 'check_invoice', 'tax_unpaid_ok_at'),
               ('check_office.ins_vat', 'check_office', 'ins_vat')) as c(칸, t, k);
