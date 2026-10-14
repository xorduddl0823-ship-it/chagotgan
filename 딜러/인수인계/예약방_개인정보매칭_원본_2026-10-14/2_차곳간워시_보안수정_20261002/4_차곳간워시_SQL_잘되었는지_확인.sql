-- =========================================================
-- 차곳간 워시 — 4단계 : 잘 잠겼는지 확인 (보기만 합니다. 아무것도 바꾸지 않습니다)
-- 결과 표를 캡처해서 보내 주세요.
--   1. 표 보호(RLS)  → 모두 «켜짐 (정상)» 이어야 합니다
--   2. 보관함        → wash 가 «비공개 (정상)» 이어야 합니다
--   3. 규칙          → 누가 무엇을 할 수 있게 열려 있는지 (없으면 줄이 안 나옵니다)
-- =========================================================
select '1. 표 보호(RLS)' as "구분",
       tablename::text as "이름",
       case when rowsecurity then '켜짐 (정상)' else '꺼짐 (위험)' end as "상태"
  from pg_tables
 where schemaname = 'public'
union all
select '2. 보관함',
       id::text,
       case when public then '공개 (위험)' else '비공개 (정상)' end
  from storage.buckets
union all
select '3. 규칙 — ' || schemaname || '.' || tablename,
       policyname::text,
       cmd || ' / ' || array_to_string(roles, ',') || coalesce(' / ' || qual, '')
  from pg_policies
 where schemaname in ('public', 'storage')
 order by 1, 2;
