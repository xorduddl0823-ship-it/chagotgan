-- ============================================================
--  체크 «거래처에 없는 신청인» 청구서 허락 (check-api v48 · 2026-10-18 · 체크 v54)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요.
--  v48 은 신청인 청구서를 «청구처 id 빈 칸»으로 만들어요. 그 칸이 «꼭 채워야 함»으로 되어 있으면 풀어 줘요.
--  이미 빈 칸을 받는 표라면 아무것도 바꾸지 않아요. (청구처 id 가 있을 때의 연결 규칙은 그대로예요)
-- ============================================================

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'check_invoice' and column_name = 'bill_to_id' and is_nullable = 'NO') then
    alter table check_invoice alter column bill_to_id drop not null;
  end if;
end $$;

-- 확인: «빈 칸 받음 = YES» 면 끝
select 'check_invoice.bill_to_id' as 칸, is_nullable as 빈칸_받음
  from information_schema.columns where table_name = 'check_invoice' and column_name = 'bill_to_id';
