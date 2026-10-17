-- ============================================================
--  체크 입금 엑셀 넣기 고침 — check-api v41 과 함께 (2026-10-18 · TEST «은행 거래내역 엑셀 가져오기» 실패)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. (SQL 14 다음 · 서버 v41 전이든 뒤든 괜찮아요)
--  지우는 자료는 없어요. 입금 표의 «규칙»만 손봐요:
--    ① 계좌(bank_id)·잔액(balance) 칸을 «비어도 됨»으로 — 엑셀 줄은 어느 계좌인지·잔액을 모를 수 있어요
--    ② 가져온 곳(src) 규칙이 «엑셀»을 막으면 «팝빌·문자·손입력·엑셀» 로 다시 만들어요 · 갈래(kind) 규칙이 «미분류»를 막으면 풀어요
--    ③ 같은 줄 두 번 막기 규칙(검사소 + 겹침 확인 글)이 없으면 만들어요 — 팝빌 가져오기도 이 규칙에 기대요
--       (이미 겹친 줄이 있으면 만들지 않고 알려만 줘요 — 줄은 그대로 둬요)
-- ============================================================

-- ① 계좌·잔액 칸: «꼭 채움» 이면 풀어요 (칸이 없거나 이미 풀려 있으면 아무것도 안 함)
do $$
declare c text;
begin
  foreach c in array array['bank_id', 'balance'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'check_deposit' and column_name = c and is_nullable = 'NO') then
      execute format('alter table public.check_deposit alter column %I drop not null', c);
      raise notice '% 칸을 «비어도 됨»으로 바꿨어요', c;
    end if;
  end loop;
end $$;

-- ② 가져온 곳·갈래를 거르는 규칙: «엑셀»·«미분류» 를 못 받는 규칙만 풀고,
--    가져온 곳은 «팝빌·문자·손입력·엑셀» 만 받는 규칙으로 다시 만들어요 (엉뚱한 값 막기는 그대로)
do $$
declare r record;
begin
  for r in
    select c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'check_deposit' and c.contype = 'c'
      and (pg_get_constraintdef(c.oid) ~* '\msrc\M' or pg_get_constraintdef(c.oid) ~* '\mkind\M')
  loop
    if (r.def ~* '\msrc\M' and r.def not like '%엑셀%') or (r.def ~* '\mkind\M' and r.def not like '%미분류%') then
      execute format('alter table public.check_deposit drop constraint %I', r.conname);
      raise notice '% 규칙을 풀었어요 (엑셀 · 미분류 를 넣기 위해)', r.conname;
    end if;
  end loop;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'check_deposit' and column_name = 'src')
     and not exists (
       select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
       where n.nspname = 'public' and t.relname = 'check_deposit' and c.contype = 'c' and pg_get_constraintdef(c.oid) ~* '\msrc\M') then
    -- 예전 줄은 다시 검사하지 않아요(not valid) — 새로 넣는 줄만 거름
    alter table public.check_deposit add constraint check_deposit_src_check
      check (src = any (array['팝빌', '문자', '손입력', '엑셀'])) not valid;
    raise notice '가져온 곳 규칙을 «팝빌·문자·손입력·엑셀» 로 다시 만들었어요';
  end if;
end $$;

-- ③ 같은 줄 두 번 막기 규칙 (검사소 + 겹침 확인 글) — 조건 없는 규칙이 이미 있으면 그대로
do $$
declare dup int;
begin
  if exists (
    select 1 from pg_index i
    join pg_class t on t.oid = i.indrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'check_deposit' and i.indisunique and i.indpred is null
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(i.indkey) k join pg_attribute a on a.attrelid = t.oid and a.attnum = k) = array['office_id', 'uniq_key']
  ) then
    raise notice '같은 줄 막기 규칙은 이미 있어요';
  else
    select count(*) into dup from (
      select 1 from public.check_deposit where uniq_key is not null group by office_id, uniq_key having count(*) > 1) x;
    if dup > 0 then
      raise notice '이미 겹친 줄이 % 묶음 있어서 규칙을 만들지 않았어요 (줄은 그대로). 서버 방에 알려 주세요.', dup;
    else
      create unique index if not exists check_deposit_office_uniq on public.check_deposit (office_id, uniq_key);
      raise notice '같은 줄 막기 규칙을 만들었어요';
    end if;
  end if;
end $$;

-- 확인: 네 줄 모두 «됨» 이면 끝
select '① 계좌 칸 비어도 됨' as 확인,
  case when not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'check_deposit'
                        and column_name = 'bank_id' and is_nullable = 'NO') then '됨' else '안 됨' end as 결과
union all select '① 잔액 칸 비어도 됨',
  case when not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'check_deposit'
                        and column_name = 'balance' and is_nullable = 'NO') then '됨' else '안 됨' end
union all select '② 가져온 곳 «엑셀» 받음',
  case when not exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                        where n.nspname = 'public' and t.relname = 'check_deposit' and c.contype = 'c'
                          and pg_get_constraintdef(c.oid) ~* '\msrc\M' and pg_get_constraintdef(c.oid) not like '%엑셀%') then '됨' else '안 됨' end
union all select '③ 같은 줄 막기 규칙',
  case when exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'check_deposit'
                    and indexdef ilike '%unique%' and indexdef ilike '%(office_id, uniq_key)%' and indexdef not ilike '% where %') then '됨' else '안 됨 (위 알림을 서버 방에)' end;
