-- ============================================================
--  체크 거래처 한 화면 — check-api v36 이 씁니다 (2026-10-18 · 체크 v46 약속)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. (서버 v36 올리기 전에)
--  지우는 것은 없어요. 새 칸은 모두 빈 값으로 시작하고, 옛 자료는 그대로예요.
-- ============================================================

-- 1) 상사 — 홈택스 받는 쪽 주소·이메일·업태·종목
alter table check_company add column if not exists addr    text not null default '';
alter table check_company add column if not exists email   text not null default '';
alter table check_company add column if not exists upte    text not null default '';
alter table check_company add column if not exists jongmok text not null default '';

-- 2) 딜러(본인 사업자로 끊을 때) — 이메일·업태·종목
alter table check_dealer add column if not exists issuer_email   text not null default '';
alter table check_dealer add column if not exists issuer_upte    text not null default '';
alter table check_dealer add column if not exists issuer_jongmok text not null default '';

-- 3) 계산서 «나중에 정할게요»(later) — issuer_kind 에 거르기 규칙이 있으면 later 도 받게 바꿔요 (없으면 아무것도 안 함)
do $$
declare r record;
begin
  for r in
    select c.conname from pg_constraint c join pg_class t on t.oid = c.conrelid
    where t.relname = 'check_dealer' and c.contype = 'c' and pg_get_constraintdef(c.oid) ilike '%issuer_kind%'
  loop
    execute format('alter table check_dealer drop constraint %I', r.conname);
    raise notice '% 규칙을 later 까지 받게 바꿔요', r.conname;
  end loop;
  if not exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid
                 where t.relname = 'check_dealer' and c.conname = 'check_dealer_issuer_kind_ok') then
    alter table check_dealer add constraint check_dealer_issuer_kind_ok
      check (issuer_kind is null or issuer_kind in ('company', 'dealer', 'none', 'later')) not valid;
  end if;
end $$;

-- 4) 입금 금액 더하기를 한 번에 (서로 다른 입금이 같은 청구서에 겹쳐 들어와도 빠지지 않게) — 서버만 부름
create or replace function check_invoice_add_paid(p_office text, p_id text, p_amount numeric)
returns numeric language sql security invoker as $$
  update check_invoice
     set paid_amount = coalesce(paid_amount, 0) + p_amount,
         state = case when coalesce(paid_amount, 0) + p_amount >= coalesce(total_amount, 0) then '완료' else '수금중' end
   where office_id::text = p_office and id::text = p_id
  returning paid_amount;
$$;
revoke all on function check_invoice_add_paid(text, text, numeric) from public, anon, authenticated;

-- 확인: 아래가 모두 true 면 끝
select 'check_company.email' as 칸, exists (select 1 from information_schema.columns where table_name = 'check_company' and column_name = 'email') as 있음
union all select 'check_company.jongmok', exists (select 1 from information_schema.columns where table_name = 'check_company' and column_name = 'jongmok')
union all select 'check_dealer.issuer_email', exists (select 1 from information_schema.columns where table_name = 'check_dealer' and column_name = 'issuer_email')
union all select 'check_invoice_add_paid', exists (select 1 from pg_proc where proname = 'check_invoice_add_paid');
