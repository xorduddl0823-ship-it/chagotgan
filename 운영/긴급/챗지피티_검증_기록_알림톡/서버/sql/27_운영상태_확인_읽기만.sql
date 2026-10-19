-- ============================================================
-- 27. 운영 상태 확인 — «읽기만» 한 장 (2026-10-19 · 서버 방 · 보안 방 요청)
-- ============================================================
-- 아무것도 바꾸지 않아요(select 만). SQL Editor 에 전체를 붙여 넣고 Run → 나온 표를 사진으로 총괄 방에 보내 주세요.
-- 이 SQL 로 못 보는 두 가지는 맨 아래 «SQL 밖에서 보기»에 적었어요.
-- ============================================================
select '① 색인(같은 번호 금지)' as 구분, i.relname::text as 이름,
       case when ix.indisunique then '유일' else '보통' end as 종류,
       left(pg_get_indexdef(i.oid), 160) as 정의
  from pg_index ix join pg_class i on i.oid = ix.indexrelid join pg_class t on t.oid = ix.indrelid
 where t.relname in ('wash_shops', 'check_office') and i.relname like '%biz%'
union all
select '② 문지기·잠금(트리거)', tgname::text, case when tgenabled = 'O' then '켜짐' else '꺼짐' end, tgrelid::regclass::text
  from pg_trigger where tgname in ('wash_shops_biz_lock', 'check_office_biz_lock', 'wash_shops_not_hq_biz', 'wash_shops_zz_biz_cross', 'check_office_zz_biz_cross')
union all
select '③ 행 보안(RLS)', c.relname::text, case when c.relrowsecurity then '켜짐' else '꺼짐 ⚠' end,
       coalesce((select count(*)::text from pg_policy p where p.polrelid = c.oid), '0') || '개 정책'
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and c.relname in ('wash_shops', 'wash_docs', 'wash_users', 'wash_sessions', 'wash_viewcode', 'wash_payments', 'wash_pay_order', 'wash_taxlog',
                     'wash_sendlog', 'cgg_sendlog', 'cgg_access', 'check_office', 'check_user', 'check_session', 'check_car', 'check_invoice',
                     'check_invoice_row', 'check_deposit', 'check_dealer', 'check_deliv', 'check_deliv_photo', 'check_deliv_driver',
                     'dealer_users', 'dealer_sessions', 'hq_audit', 'biz_share_req', 'biz_share_ok', 'cgg_idem')
union all
select '④ 사진 보관함(버킷)', b.id::text, case when b.public then '공개 ⚠' else '비공개' end, coalesce(b.file_size_limit::text, '-')
  from storage.buckets b
union all
select '⑤ 새 표·칸', x.n, case when x.ok then '있음' else '없음(아직 SQL 안 돌림)' end, x.why
  from (values
    ('cgg_idem', to_regclass('public.cgg_idem') is not null, 'SQL 26 · 한 번 누름 = 한 번 처리'),
    ('biz_share_req', to_regclass('public.biz_share_req') is not null, 'SQL 24 · 승인 요청'),
    ('wash_shops.biz_sub', exists (select 1 from information_schema.columns where table_name = 'wash_shops' and column_name = 'biz_sub'), 'SQL 24 · 종사업장번호'),
    ('biz_lock_log', to_regclass('public.biz_lock_log') is not null, '10/15 잠금 SQL')
  ) as x(n, ok, why)
order by 1, 2;

-- ── SQL 밖에서 보기 (사진으로) ─────────────────────────────────
-- ⑥ ALLOW_LEGACY_KEY: Supabase › Edge Functions › Secrets(비밀값) 목록에 이 «이름»이 있는지만 보세요(값은 보지도 적지도 않아요).
--    없으면 꺼짐(예전 주소 방식 막힘)이 정상이에요. 있으면 총괄 방에 «있음»만 알려 주세요.
-- ⑦ 서버 판: 워시 관리 화면 머리말(sb…) · 체크 화면 머리말(check-api v…)을 사진으로. 모르면 «미확인»으로 남겨요.
