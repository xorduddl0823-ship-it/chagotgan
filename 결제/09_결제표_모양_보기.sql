-- 차곳간 결제 표 모양 보기 (읽기 전용 — 자료를 바꾸거나 지우지 않아요)
-- 대표님 하는 법: 수파베이스 관리 화면 → 왼쪽 「SQL Editor」 → 새 창(+) → 이 글 전체를 붙여넣기 → 오른쪽 아래 [Run]
--   → 결과 표 오른쪽 위 「Download CSV」(또는 결과 전체 복사) → 총괄 방에 전달.
-- 결과에는 표·칸 이름과 종류만 나와요. 업체 자료·금액·전화번호 같은 내용은 나오지 않아요.

select 'column'::text as what, c.table_name::text as name, c.ordinal_position::text as no,
       c.column_name::text as detail, (c.data_type || coalesce('(' || c.character_maximum_length || ')', ''))::text as type,
       c.is_nullable::text as nullable, coalesce(c.column_default::text, '') as default_value
from information_schema.columns c
where c.table_schema = 'public'
  and (c.table_name like 'wash_pay%' or c.table_name like 'wash_cash%'
       or c.table_name in ('wash_payments', 'wash_plans', 'wash_shops', 'wash_hq', 'wash_viewcode', 'wash_lock_log'))

union all
select 'constraint', tc.table_name::text, '', (tc.constraint_name || ' ' || tc.constraint_type)::text,
       coalesce(string_agg(kcu.column_name::text, ',' order by kcu.ordinal_position), ''), '', ''
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and (tc.table_name like 'wash_pay%' or tc.table_name like 'wash_cash%'
       or tc.table_name in ('wash_payments', 'wash_plans', 'wash_shops', 'wash_hq', 'wash_viewcode', 'wash_lock_log'))
  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
group by tc.table_name, tc.constraint_name, tc.constraint_type

union all
select 'index', tablename::text, '', indexname::text, indexdef, '', ''
from pg_indexes
where schemaname = 'public'
  and (tablename like 'wash_pay%' or tablename like 'wash_cash%' or tablename in ('wash_payments', 'wash_viewcode'))

union all
select 'function', p.proname::text, '', pg_get_function_identity_arguments(p.oid), pg_get_functiondef(p.oid), '', ''
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'wash_cash%'

order by 1, 2, 3;
