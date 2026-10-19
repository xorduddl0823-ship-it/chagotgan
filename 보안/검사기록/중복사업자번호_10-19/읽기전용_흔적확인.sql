-- ============================================================
-- 보안 방 · 2026-10-19 (2차) · 같은 사업자번호 두 업체 — 읽기 전용 확인
-- ============================================================
-- SELECT 만 있어요(고치기 · 지우기 없음). 이름은 첫 글자만, 전화 · 사업자번호는 가려서 나와요.
-- 업체 코드는 그대로 나와요 → 결과를 바깥(챗지피티 등)으로 보낼 때는 코드도 가려 주세요.
-- 실행: Supabase › SQL Editor 에 한 덩어리씩 → 결과 화면을 총괄 방에.
-- ⚠ 한계: 결과가 0건이어도 «예전에 남의 자료를 본 일이 없다»는 증명이 아니에요.
--   남의 자료를 «보기만» 했다면 자료끼리 이어진 흔적이 남지 않아요. 접근 기록이 없으면 과거는 확정할 수 없어요.
--   이 SQL 은 «섞여서 이어진 흔적»과 «지금 잠금 장치 상태»만 봐요.
-- ============================================================

-- ① 같은 사업자번호를 쓰는 곳 — 기대: 지금은 겹친 2곳이 나옴(목록 확인용 · 0건이 정상인 칸 아님)
with n as (
  select '워시' 제품, shop 코드, name 이름, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') b, biz_ok_at, biz_set_at, created_at
    from wash_shops
  union all
  select '체크', code, name, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'), biz_ok_at, biz_set_at, null::timestamptz from check_office
  union all
  select '본사', 'HQ', biz_name, regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'), null, null, null from wash_hq where id = 1
)
select 제품, 코드, left(coalesce(이름,''),1) || '…' as 이름_가림,
       left(b,3) || '-**-***' || right(b,2) as 사업자번호_가림,
       (biz_ok_at is not null) as 본사확인됨, biz_set_at as 처음넣은때, created_at as 업체만든때
  from n
 where b <> '' and b in (select b from n where b <> '' group by b having count(*) > 1)
 order by b, created_at nulls last;

-- ② 겹친 워시 업체의 계정 수 — 기대: 업체마다 정상 계정 줄이 나옴(0건이 정상 아님).
--    봐야 할 것: 같은 번호(가림)가 두 업체에 동시에 나오면 이상(워시는 번호 하나에 업체 하나).
with dup as (
  select regexp_replace(biz_no,'[^0-9]','','g') b from wash_shops
   where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> '' group by 1 having count(*) > 1
)
select s.shop 업체, u.role 직급, coalesce(u.active,true) 사용중, count(*) 계정수,
       string_agg(left(u.phone,3) || '-****-' || right(u.phone,4), ', ') 번호_가림
  from wash_shops s join wash_users u on u.shop = s.shop
 where regexp_replace(s.biz_no,'[^0-9]','','g') in (select b from dup)
 group by 1, 2, 3 order by 1, 2;

-- ③ 워시 로그인 열쇠 상태 — 기대: «업체 다름» 줄은 0건이어야 정상. «계정 없음 · 멈춘 계정 · 만료»는 참고(이상 아님 · 지울 대상).
select case when wu.phone is null then '계정 없음(지운 계정의 열쇠)'
            when ws.shop <> wu.shop then '업체 다름 ← 이상'
            when wu.active = false then '멈춘 계정'
            when ws.expires_at < now() then '만료'
            else '정상' end 상태,
       count(*) 몇개
  from wash_sessions ws left join wash_users wu on wu.phone = ws.phone
 group by 1 order by 1;

-- ④ 워시 자료 안에 «다른 업체 폴더» 사진 주소 — 기대: 0건이 정상. 나오면 섞인 흔적.
select d.shop 자료업체, m[1] 사진폴더업체, d.col 칸, count(*) 몇개
  from wash_docs d, lateral regexp_matches(d.data::text, '"sb/([A-Za-z0-9_-]+)/', 'g') m
 where m[1] <> d.shop and d.shop <> 'ADMIN'
 group by 1, 2, 3 order by 4 desc limit 50;

-- ⑤ 차 보기 주소가 그 업체에 없는 차를 가리킴 — 기대: 0건이 정상(지운 차의 주소면 참고). 다른 업체 차를 가리키면 이상.
select vc.shop 주소업체,
       exists (select 1 from wash_docs d2 where d2.col = 'intakes' and d2.id = vc.rec_id and d2.shop <> vc.shop) 다른업체에있음,
       count(*) 몇개
  from wash_viewcode vc
 where coalesce(vc.kind,'car') = 'car'
   and not exists (select 1 from wash_docs d where d.shop = vc.shop and d.col = 'intakes' and d.id = vc.rec_id)
 group by 1, 2 order by 3 desc limit 50;

-- ⑥ 체크 로그인 열쇠 상태 — 기대: «소속 아님»은 0건이 정상. «멈춘 소속 · 만료»는 참고.
select case when not exists (select 1 from check_user u where u.office_id = cs.office_id
                               and regexp_replace(u.phone,'[^0-9]','','g') = regexp_replace(cs.phone,'[^0-9]','','g')) then '소속 아님 ← 이상'
            when exists (select 1 from check_user u where u.office_id = cs.office_id and u.active = false
                               and regexp_replace(u.phone,'[^0-9]','','g') = regexp_replace(cs.phone,'[^0-9]','','g')) then '멈춘 소속'
            when cs.expires_at < now() then '만료'
            else '정상' end 상태,
       count(*) 몇개
  from check_session cs group by 1 order by 1;

-- ⑦ 체크 자료가 다른 검사소 것과 이어짐 — 기대: 모든 줄 0 이 정상.
select '차-딜러' 연결, count(*) 몇개 from check_car c join check_dealer d on d.id = c.dealer_id where d.office_id <> c.office_id
union all select '차-거래처', count(*) from check_car c join check_company k on k.id = c.company_id where k.office_id <> c.office_id
union all select '딜러-청구처', count(*) from check_dealer d join check_company k on k.id = d.bill_to_id where k.office_id <> d.office_id
union all select '청구서-청구처(같은 검사소에 없음)', count(*) from check_invoice i
   where i.bill_to_id is not null
     and not exists (select 1 from check_dealer d where d.id::text = i.bill_to_id::text and d.office_id = i.office_id)
     and not exists (select 1 from check_company k where k.id::text = i.bill_to_id::text and k.office_id = i.office_id)
union all select '청구서 줄-청구서의 차', count(*) from check_invoice_row r join check_invoice i on i.id = r.invoice_id
                                             join check_car c on c.id = r.car_id where c.office_id <> i.office_id
union all select '배달 사진 경로-배달', count(*) from check_deliv_photo p where split_part(p.path,'/',1) <> p.deliv_id::text;

-- ⑧ 같은 번호 금지 장치가 운영 DB 에 «실제로» 있는지 — 기대: 아래 4개 색인이 모두 나오고 «유일=true».
--    정의(식 · 조건)도 같이 봐요: 숫자만 남긴 식인지, 빈 값 제외 조건(WHERE)이 있는지.
select c.relname 색인, i.indisunique 유일, i.indisvalid 쓸수있음, pg_get_indexdef(i.indexrelid) 정의
  from pg_index i join pg_class c on c.oid = i.indexrelid
 where c.relname in ('wash_shops_biz_uq','check_office_biz_uq','check_office_corp_uq','check_office_pbuser_uq');
select tgname 잠금장치, tgrelid::regclass 표, tgenabled 켜짐 from pg_trigger where not tgisinternal and tgname ilike '%biz%';
--    ⚠ 워시 · 체크 색인은 «표마다 따로»예요. 워시 업체와 체크 검사소 사이의 같은 번호는 이 색인이 막지 못해요(서버 확인 · 공통 원장 몫).

-- ⑨ 겹친 업체에 대한 본사 «사업자번호 확인» 기록 — 기대: 있을 수 있음(이상 아님). 누가 · 언제 확인했는지 보는 칸.
with dup as (
  select shop code from wash_shops where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') in (
    select regexp_replace(biz_no,'[^0-9]','','g') from wash_shops where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> '' group by 1 having count(*) > 1)
)
select at 언제, action 무엇, product 제품, result 결과, left(coalesce(who,''),3) || '-****-' || right(coalesce(who,''),4) 누가_가림, detail->>'code' 코드
  from hq_audit where action in ('bizOk','bizUndo') and detail->>'code' in (select code from dup)
 order by at desc limit 50;
--    ⚠ 관리 «업체 고치기»(hqShopSave)로 넣은 사업자번호는 지금 서버가 기록을 남기지 않아요 → 여기 안 나와요(고침 대상).

-- ⑩ 사진 보관함이 공개인지 — 기대: 워시 · 체크 보관함 모두 public=false.
select id 보관함, public 공개 from storage.buckets order by id;

-- ⑪ 업체 자료 표가 «직접 REST» 로 열려 있지 않은지 — 기대: RLS 켜짐=true 이고, anon · authenticated 에 열린 정책이 없음.
select c.relname 표, c.relrowsecurity RLS켜짐,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
          and (p.roles && array['anon','authenticated','public']::name[])) 바깥에열린정책수
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and c.relname in ('wash_shops','wash_users','wash_docs','wash_sessions','wash_viewcode',
                     'check_office','check_user','check_session','check_car','check_dealer','check_company',
                     'check_invoice','check_invoice_row','check_deliv','check_deliv_photo','dealer_sessions','dealer_users')
 order by 1;
