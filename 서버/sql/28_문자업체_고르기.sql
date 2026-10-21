-- ============================================================
-- 28. 문자 업체 고르기 — 워시·체크 따로 «솔라피 / 비즈고» (2026-10-21 · 서버 방 · 대표님 지시)
-- ============================================================
-- 왜: 관리(본사) 화면에서 문자·알림톡 보내는 곳을 제품마다 고르게 해요(예: 워시=비즈고, 체크=솔라피).
-- 무엇을: 표 cgg_msg_vendor(제품 하나에 한 줄 · solapi|bizgo). 화면은 직접 못 읽고, 서버(service_role)만 읽고 써요(RLS 켬 · 정책 없음).
--   바꾸는 곳은 워시 서버 관리 창구 hqMsgVendorSet 하나뿐이에요(본사 관리자 세션 · hq_audit 에 전→후).
-- 실행: 파일 전체를 Run. 두 번 실행해도 괜찮아요. 처음에는 두 제품 모두 solapi 예요(지금과 같음).
-- 이 표가 없거나 읽지 못하면 서버(sb30 · v55)는 늘 솔라피로 보내요.
-- 되돌리기: drop table if exists cgg_msg_vendor;   (그러면 늘 솔라피)
-- ============================================================
create table if not exists cgg_msg_vendor (
  product     text primary key check (product in ('wash', 'check')),
  vendor      text not null default 'solapi' check (vendor in ('solapi', 'bizgo')),
  updated_at  timestamptz not null default now(),
  by_who      text
);
insert into cgg_msg_vendor (product, vendor) values ('wash', 'solapi'), ('check', 'solapi') on conflict (product) do nothing;
alter table cgg_msg_vendor enable row level security;   -- 정책 없음 = 서버만
revoke all on cgg_msg_vendor from anon, authenticated;

select product as 제품, vendor as 업체, updated_at as 바꾼때,
       case when (select relrowsecurity from pg_class where oid = 'public.cgg_msg_vendor'::regclass) then 'RLS 켜짐' else 'RLS 꺼짐 ⚠' end as 행보안
  from cgg_msg_vendor order by product;
