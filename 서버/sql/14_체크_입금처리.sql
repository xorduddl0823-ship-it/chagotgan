-- ============================================================
--  체크 입금 처리 — check-api v38 이 씁니다 (2026-10-18 · 체크 v47 약속)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. (SQL 13 다음 · 서버 v38 올리기 전에)
--  지우는 자료는 없어요. (이 SQL 없이도 v38 은 돌아가요 — 아래 두 가지만 빠져요)
-- ============================================================

-- 1) 사람이 «되돌리기» 한 입금 — 자동 맞추기가 다시 잡지 않게
alter table check_deposit add column if not exists hold boolean not null default false;

-- 2) 입금확인 알림을 보낸 때 — 입금마다 한 번만 (되돌렸다 다시 맞춰도 다시 안 보냄)
alter table check_deposit add column if not exists notice_at timestamptz;

-- 3) state 에 «입금 처리» · «지움» 이 들어갈 수 있게 — state 를 거르는 규칙이 있으면 풀어요 (없으면 아무것도 안 함)
do $$
declare r record;
begin
  for r in
    select c.conname from pg_constraint c join pg_class t on t.oid = c.conrelid
    where t.relname = 'check_deposit' and c.contype = 'c' and pg_get_constraintdef(c.oid) ilike '%state%'
  loop
    execute format('alter table check_deposit drop constraint %I', r.conname);
    raise notice '% 규칙을 풀었어요 (입금 처리 · 지움 을 넣기 위해)', r.conname;
  end loop;
end $$;

-- 확인: 둘 다 true 면 끝
select 'check_deposit.hold' as 칸, exists (select 1 from information_schema.columns where table_name = 'check_deposit' and column_name = 'hold') as 있음
union all select 'check_deposit.notice_at', exists (select 1 from information_schema.columns where table_name = 'check_deposit' and column_name = 'notice_at');
