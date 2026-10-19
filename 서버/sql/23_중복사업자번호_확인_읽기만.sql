-- ============================================================
-- 23. 중복 사업자번호 조사 — «읽기만» (2026-10-19 · 서버 방 · 긴급 검증요청 1·2·7번)
-- ============================================================
-- 이 파일은 아무것도 바꾸지 않아요(select 만). 몇 번 실행해도 괜찮아요.
-- 결과의 전화·이름·사업자번호는 가려서 나와요(010-****-1234 · 정* · 876-**-***09).
-- 실행: Supabase › SQL Editor 에 파일 전체를 붙여 넣고 Run → 나온 결과 표 하나를 사진 찍어 총괄 방에 보내 주세요(줄이 많으면 내려 가며 여러 장).
-- «hq_audit … does not exist» 오류가 나면 «⑩ 관리 기록» 두 줄(union all 부터 from hq_audit … 까지)을 지우고 다시 Run 해요.
-- 조사할 번호는 맨 위 한 곳(p.n)에만 적혀 있어요.
-- ============================================================

with p as (select '8761202709'::text as n),
mask as (select 1)
-- ① 10/15 잠금 SQL이 운영에 실행됐는지 (켜짐/꺼짐)
select '① 잠금·색인' as 표, x.항목, x.상태, null::text as c3, null::text as c4, null::text as c5, null::text as c6, null::text as c7
  from (
    select '잠금: 워시 사업자번호(처음 한 번만)' as 항목, case when exists (select 1 from pg_trigger where tgname = 'wash_shops_biz_lock') then '켜짐' else '꺼짐' end as 상태
    union all select '잠금: 체크 사업자번호·팝빌', case when exists (select 1 from pg_trigger where tgname = 'check_office_biz_lock') then '켜짐' else '꺼짐' end
    union all select '색인: 워시 같은 번호 금지', case when to_regclass('public.wash_shops_biz_uq') is not null then '켜짐' else '꺼짐' end
    union all select '색인: 체크 같은 번호 금지', case when to_regclass('public.check_office_biz_uq') is not null then '켜짐' else '꺼짐' end
    union all select '색인: 체크 세금계산서 번호', case when to_regclass('public.check_office_corp_uq') is not null then '켜짐' else '꺼짐' end
    union all select '기록표: biz_lock_log', case when to_regclass('public.biz_lock_log') is not null then '있음' else '없음' end
  ) x
union all
-- ② 서버 업체표(wash_shops)에 이 번호가 적힌 업체 — 세금계산서·팝빌은 이 칸을 써요
select '② 워시 업체표', s.shop, coalesce(s.name, ''),
       left(regexp_replace(coalesce(s.owner_phone,''),'[^0-9]','','g'),3) || '-****-' || right(regexp_replace(coalesce(s.owner_phone,''),'[^0-9]','','g'),4),
       left(coalesce(s.ceo,''),1) || '*',
       '팝빌아이디 ' || case when coalesce(s.pb_id,'') <> '' then '있음' else '없음' end,
       '확인 ' || coalesce(to_char(s.biz_ok_at at time zone 'Asia/Seoul','MM-DD HH24:MI'), '안 됨'),
       '만든 날 ' || coalesce(to_char(s.created_at at time zone 'Asia/Seoul','YYYY-MM-DD'), '-')
  from wash_shops s, p where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n
union all
-- ③ 화면 설정(«우리 사업장» · wash_docs settings)에 이 번호가 적힌 업체 — 화면에 보이는 칸
select '③ 워시 화면 설정', d.shop, d.id, case when d.demo then '예시칸' else '실제칸' end,
       left(coalesce(d.data->'supplier'->>'ceo',''),1) || '*',
       '상호 ' || left(coalesce(d.data->'supplier'->>'bizName',''),2) || '…',
       '업체표 번호 ' || case when regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n then '같음' when coalesce(s.biz_no,'') = '' then '비어 있음' else '다름' end,
       null
  from wash_docs d join p on regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = p.n
  left join wash_shops s on s.shop = d.shop
 where d.col = 'settings'
union all
-- ④ 체크 검사소에 이 번호가 있는지
select '④ 체크 검사소', o.code, coalesce(o.name,''), '사업자 ' || case when regexp_replace(coalesce(o.biz_no,''),'[^0-9]','','g') = p.n then '같음' else '-' end,
       '팝빌번호 ' || case when regexp_replace(coalesce(o.popbill_corp,''),'[^0-9]','','g') = p.n then '같음' else '-' end, null, null, null
  from check_office o, p
 where regexp_replace(coalesce(o.biz_no,''),'[^0-9]','','g') = p.n or regexp_replace(coalesce(o.popbill_corp,''),'[^0-9]','','g') = p.n
union all
-- ⑤ 이 번호를 쓰는 업체들의 로그인 계정(소속) — 한 번호(사람)가 두 업체에 묶였는지
select '⑤ 계정 소속', u.shop, u.role, left(regexp_replace(coalesce(u.phone,''),'[^0-9]','','g'),3) || '-****-' || right(regexp_replace(coalesce(u.phone,''),'[^0-9]','','g'),4),
       left(coalesce(u.name,''),1) || '*', case when u.active is false then '꺼짐' else '켜짐' end,
       '다른 업체에도 있음: ' || coalesce((select string_agg(u2.shop || '(' || u2.role || ')', ', ') from wash_users u2 where u2.phone = u.phone and u2.shop <> u.shop), '없음'),
       null
  from wash_users u
 where u.shop in (select s.shop from wash_shops s, p where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n
                  union select d.shop from wash_docs d, p where d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = p.n)
union all
-- ⑥ 로그인 열쇠가 «계정의 업체»와 다른 업체로 열린 적이 있는지 (있으면 무단 연결 의심)
select '⑥ 열쇠·소속 다름', ss.shop, ss.role, left(regexp_replace(coalesce(ss.phone,''),'[^0-9]','','g'),3) || '-****-' || right(regexp_replace(coalesce(ss.phone,''),'[^0-9]','','g'),4),
       '계정 업체: ' || coalesce((select string_agg(u.shop, ', ') from wash_users u where u.phone = ss.phone), '없음'),
       to_char(ss.expires_at at time zone 'Asia/Seoul','MM-DD HH24:MI') || ' 까지', null, null
  from wash_sessions ss
 where ss.shop not in ('ADMIN')
   and ss.shop in (select s.shop from wash_shops s, p where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n
                   union select d.shop from wash_docs d, p where d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = p.n)
   and not exists (select 1 from wash_users u where u.phone = ss.phone and u.shop = ss.shop)
union all
-- ⑦ 피해 확인 — 그 업체들이 세금계산서를 낸 기록(시험/실제 · 됨/안 됨 건수)
select '⑦ 세금계산서 기록', t.shop, t.mode, case when t.ok then '됨' else '안 됨' end, count(*)::text || '건', null, null, null
  from wash_taxlog t
 where t.shop in (select s.shop from wash_shops s, p where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n
                  union select d.shop from wash_docs d, p where d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = p.n)
 group by t.shop, t.mode, t.ok
union all
-- ⑧ 피해 확인 — 그 업체들이 보낸 알림톡·문자(종류·결과별 건수)
select '⑧ 보낸 기록', l.shop, l.tpl, l.result, count(*)::text || '건', to_char(max(l.at) at time zone 'Asia/Seoul','MM-DD HH24:MI') || ' 마지막', null, null
  from cgg_sendlog l
 where l.product = 'wash'
   and l.shop in (select s.shop from wash_shops s, p where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n
                  union select d.shop from wash_docs d, p where d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = p.n)
 group by l.shop, l.tpl, l.result
union all
-- ⑨ 자료가 업체별로 따로 있는지 (업체마다 칸별 줄 수 — 같은 줄이 두 업체에 섞여 있지 않은지)
select '⑨ 업체별 자료 수', d.shop, d.col, case when d.demo then '예시칸' else '실제칸' end, count(*)::text || '줄', null, null, null
  from wash_docs d
 where d.shop in (select s.shop from wash_shops s, p where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = p.n
                  union select d2.shop from wash_docs d2, p where d2.col = 'settings' and regexp_replace(coalesce(d2.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = p.n)
 group by d.shop, d.col, d.demo
union all
-- ⑩ 본사(관리)가 사업자번호 확인·취소를 한 기록 · 잠금이 막은 기록
select '⑩ 관리 기록', to_char(a.at at time zone 'Asia/Seoul','MM-DD HH24:MI'), a.action, coalesce(a.product,''), coalesce(a.result,''), left(coalesce(a.detail::text,''), 60), null, null
  from hq_audit a where a.action in ('bizOk', 'bizUndo')
order by 1, 2;

-- ── (①에 «기록표: biz_lock_log 있음»이 나왔을 때만) 잠금이 막은 기록 보기 — 주석(--)을 풀고 이 줄만 Run ──
-- select to_char(at at time zone 'Asia/Seoul','MM-DD HH24:MI') as 때, tbl as 표, row_key as 업체, col as 칸, by_role as 누가 from biz_lock_log order by id desc limit 30;

-- ── 같은 번호를 쓰는 곳 전체 목록(다른 번호들도) ─────────────────
-- select '워시 같은 번호', left(n,3)||'-**-***'||right(n,2) as 번호, count(*) as 몇곳, string_agg(shop, ', ') as 업체
--   from (select shop, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') n from wash_shops) t where n <> '' group by n having count(*) > 1
-- union all
-- select '워시 화면설정 같은 번호', left(n,3)||'-**-***'||right(n,2), count(distinct shop), string_agg(distinct shop, ', ')
--   from (select shop, regexp_replace(coalesce(data->'supplier'->>'bizNo',''),'[^0-9]','','g') n from wash_docs where col='settings' and id='config' and not demo) t
--  where n <> '' group by n having count(distinct shop) > 1;
