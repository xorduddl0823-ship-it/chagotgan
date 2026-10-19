-- ============================================================
-- 보안 방 · 2026-10-19 · 같은 사업자번호 두 업체 — «자료가 섞이거나 서로 보인 흔적» 읽기 전용 확인
-- ============================================================
-- 이 파일은 SELECT 만 있어요. 고치거나 지우는 줄은 하나도 없어요.
-- 결과의 개인정보는 SQL 안에서 가려서 나와요(전화 010-****-1234 · 사업자번호 876-**-***09 꼴).
-- 실행: Supabase › SQL Editor 에 한 덩어리씩 붙여 넣고 Run → 결과 화면을 총괄 방에 보내 주세요.
-- 기대값: ①은 겹친 곳 목록, ②~⑨는 «행 없음» 또는 0 이면 섞인 흔적이 없다는 뜻이에요.
-- ============================================================

-- ① 같은 사업자번호를 쓰는 곳 (워시 업체 · 체크 검사소 · 본사) — 번호는 가림
with n as (
  select '워시' as 제품, shop as 코드, name as 이름, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') as b,
         biz_ok_at, biz_set_at, created_at
    from wash_shops
  union all
  select '체크', code, name, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'), biz_ok_at, biz_set_at, null::timestamptz
    from check_office
  union all
  select '본사', 'HQ', biz_name, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'), null, null, null
    from wash_hq where id = 1
)
select 제품, 코드, 이름,
       left(b,3) || '-**-***' || right(b,2) as 사업자번호_가림,
       (biz_ok_at is not null) as 본사확인됨, biz_set_at as 처음넣은때, created_at as 업체만든때
  from n
 where b <> '' and b in (select b from n where b <> '' group by b having count(*) > 1)
 order by b, created_at nulls last;

-- ② 겹친 워시 업체의 계정 — 한 번호가 두 업체에 동시에 있는지 (wash_users 는 번호 하나에 업체 하나)
with dup as (
  select regexp_replace(biz_no,'[^0-9]','','g') b from wash_shops
   where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> ''
   group by 1 having count(*) > 1
)
select s.shop as 업체, u.role as 직급, count(*) as 계정수,
       string_agg(left(u.phone,3) || '-****-' || right(u.phone,4), ', ') as 번호_가림
  from wash_shops s join wash_users u on u.shop = s.shop
 where regexp_replace(s.biz_no,'[^0-9]','','g') in (select b from dup)
 group by s.shop, u.role order by s.shop, u.role;

-- ③ 로그인 열쇠의 업체가 그 사람 계정의 업체와 다른 것 (있으면 안 됨)
select ws.shop as 열쇠업체, wu.shop as 계정업체, count(*) as 몇개
  from wash_sessions ws join wash_users wu on wu.phone = ws.phone
 where ws.shop <> wu.shop
 group by 1, 2;

-- ④ 워시 자료(wash_docs) 안에 «다른 업체 폴더» 사진 주소가 들어 있는 것 (있으면 섞인 흔적)
select d.shop as 자료업체, m[1] as 사진폴더업체, d.col as 칸, count(*) as 몇개
  from wash_docs d,
       lateral regexp_matches(d.data::text, '"sb/([A-Za-z0-9_-]+)/', 'g') as m
 where m[1] <> d.shop and d.shop <> 'ADMIN'
 group by 1, 2, 3 order by 4 desc limit 50;

-- ⑤ 보기 주소(wash_viewcode)가 가리키는 차 기록이 그 업체에 없는 것 (차 보기 주소만)
select vc.shop as 주소업체, count(*) as 몇개
  from wash_viewcode vc
 where coalesce(vc.kind,'car') = 'car'
   and not exists (select 1 from wash_docs d where d.shop = vc.shop and d.col = 'intakes' and d.id = vc.rec_id)
 group by 1 order by 2 desc limit 50;

-- ⑥ 체크 로그인 열쇠의 검사소에 그 사람이 소속돼 있지 않은 것 (있으면 안 됨)
select o.code as 열쇠검사소, count(*) as 몇개
  from check_session cs join check_office o on o.id = cs.office_id
 where not exists (select 1 from check_user u
                    where u.office_id = cs.office_id
                      and regexp_replace(u.phone,'[^0-9]','','g') = regexp_replace(cs.phone,'[^0-9]','','g'))
 group by 1;

-- ⑦ 체크 자료가 다른 검사소 것과 이어진 것 (차↔딜러 · 차↔거래처 · 청구서 줄↔청구서)
select '차-딜러' as 연결, count(*) as 몇개 from check_car c join check_dealer d on d.id = c.dealer_id where d.office_id <> c.office_id
union all
select '차-거래처', count(*) from check_car c join check_company k on k.id = c.company_id where k.office_id <> c.office_id
union all
select '딜러-청구처', count(*) from check_dealer d join check_company k on k.id = d.bill_to_id where k.office_id <> d.office_id
union all
select '배달 사진 경로-배달', count(*) from check_deliv_photo p
 where split_part(p.path,'/',1) <> p.deliv_id::text;   -- 사진 경로는 «배달id/순서.jpg»

-- ⑧ 같은 사업자번호 잠금(급한고침 SQL)이 운영에 들어가 있는지
select indexname as 색인, indexdef is not null as 있음
  from pg_indexes
 where indexname in ('wash_shops_biz_uq','check_office_biz_uq','check_office_corp_uq','check_office_pbuser_uq');
select tgname as 잠금장치 from pg_trigger where not tgisinternal and tgname ilike '%biz%';

-- ⑨ 본사 관리 기록(hq_audit)에 사업자번호 확인(bizOk) 기록 — 겹친 업체 코드만
select at, action, product, result, detail->>'code' as 코드
  from hq_audit
 where action in ('bizOk','bizUndo')
 order by at desc limit 50;
