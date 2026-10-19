-- ============================================================
-- 운영 급한 고침 — 사업자번호·팝빌 칸 잠그기 (2026-10-15 · 서버 방)
-- ============================================================
-- 왜: 운영 중인 체크 v21.2(officeSave)·워시 sb1(shopBiz)에서 대표가 사업자번호를
--     남의 번호로 바꾸면, 남의 통장 조회·세금계산서·팝빌 로그인에 닿을 수 있어요.
--     (보안/검사기록/2026-10-15_운영판_급한고침_판정_사업자번호.md)
-- 무엇을: 서버 코드는 그대로 두고, DB에서 막아요.
--   1) 사업자번호·팝빌 칸은 «처음 비어 있을 때만» 넣을 수 있어요.
--      한 번 들어간 뒤 화면(서버)이 바꾸려 하면 바뀌지 않고 예전 값이 그대로 남아요.
--      (오류를 내지 않으니 다른 설정 저장은 그대로 돼요. 시도는 biz_lock_log에 남아요.)
--   2) 같은 번호를 두 곳이 쓰지 못하게 막아요(유일 색인).
--   3) 워시 업체가 차곳간 본사 사업자번호를 쓰지 못하게 막아요.
--   본사는 Supabase SQL Editor(postgres 계정)에서 바꿀 수 있어요. 서버(service_role)는 못 바꿔요.
--
-- 실행 순서 (대표님):
--   ① 아래 «0. 확인» 부분만 먼저 붙여 넣고 Run → 결과가 «행 없음»이면 ②로.
--      결과가 나오면 멈추고 그 화면을 총괄 방에 보내 주세요(같은 번호를 쓰는 곳이 있다는 뜻).
--   ② 파일 전체를 붙여 넣고 Run. 두 번 실행해도 괜찮아요.
--   ③ 맨 끝 «4. 결과 보기»에 잠금 3개·색인이 «켜짐»으로 나오면 끝이에요.
--   되돌리기는 맨 아래 «되돌리기» 부분이에요(주석을 풀고 실행).
-- 처음 넣는 흐름: 체크 v21.2 «설정 → 검사소»와 워시 v111 «설정 → 우리 사업장»에서
--   비어 있는 사업자번호를 처음 넣는 것은 그대로 돼요. 잘못 넣었으면 본사가 SQL로 고쳐요.
-- ============================================================


-- ── 0. 확인 (읽기만) — 같은 번호를 둘 이상이 쓰는지 ─────────────
-- 체크: 세금계산서에 쓰는 번호(팝빌 번호가 있으면 그것, 없으면 사업자번호)
select '체크 같은 번호' as 확인, coalesce(nullif(regexp_replace(coalesce(popbill_corp,''),'[^0-9]','','g'),''),
         regexp_replace(coalesce(biz_no,''),'[^0-9]','','g')) as 번호,
       count(*) as 몇곳, string_agg(code, ', ') as 검사소
  from check_office group by 2
having count(*) > 1 and coalesce(nullif(regexp_replace(coalesce(popbill_corp,''),'[^0-9]','','g'),''),
         regexp_replace(coalesce(biz_no,''),'[^0-9]','','g')) <> ''
union all
select '체크 같은 사업자번호', regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'), count(*), string_agg(code, ', ')
  from check_office where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> '' group by 2 having count(*) > 1
union all
select '체크 같은 팝빌 아이디', lower(btrim(popbill_userid)), count(*), string_agg(code, ', ')
  from check_office where btrim(coalesce(popbill_userid,'')) <> '' group by 2 having count(*) > 1
union all
select '워시 같은 사업자번호', regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'), count(*), string_agg(shop, ', ')
  from wash_shops where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> '' group by 2 having count(*) > 1
union all
select '워시 본사 번호 쓰는 업체', regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g'), count(*), string_agg(s.shop, ', ')
  from wash_shops s join wash_hq h on h.id = 1
 where regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') <> ''
   and regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = regexp_replace(coalesce(h.biz_no,''),'[^0-9]','','g')
 group by 2;


-- ── 1. 잠금 시도 기록 표 ─────────────────────────────────────
create table if not exists biz_lock_log (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  tbl     text not null,          -- check_office / wash_shops
  row_key text,                   -- 검사소 코드 / 업체 코드
  col     text not null,          -- 바꾸려던 칸 이름
  by_role text                    -- 누가(service_role 등)
);                                -- 바꾸려던 값은 남기지 않아요(남의 번호일 수 있음)
alter table biz_lock_log enable row level security;   -- 정책 없음 = 서버·본사만 읽음


-- ── 2. 잠금 함수 (두 표가 같이 씀) ───────────────────────────
-- 본사(SQL Editor = postgres)만 바꿀 수 있어요. 서버는 service_role 이라 못 바꿔요.
-- 주의: security definer 로 바꾸면 안 돼요(그러면 누구나 postgres 로 보여서 잠금이 풀려요).
create or replace function cgg_biz_unlocked() returns boolean
language sql stable as $$
  select current_user in ('postgres', 'supabase_admin')
$$;

-- TG_ARGV[0] = 행 이름 칸(code/shop), 나머지 = 잠글 칸들
create or replace function cgg_biz_lock() returns trigger
language plpgsql as $$
declare
  c text; o text; n text; i int;
  oj jsonb := to_jsonb(old);
  nj jsonb := to_jsonb(new);
begin
  if cgg_biz_unlocked() then return new; end if;
  for i in 1 .. tg_nargs - 1 loop
    c := tg_argv[i];
    o := btrim(coalesce(oj ->> c, ''));
    n := btrim(coalesce(nj ->> c, ''));
    if o <> '' and n is distinct from o then
      new := jsonb_populate_record(new, jsonb_build_object(c, oj -> c));   -- 예전 값 그대로
      begin
        insert into biz_lock_log (tbl, row_key, col, by_role)
        values (tg_table_name, oj ->> tg_argv[0], c, current_user);
      exception when others then null;      -- 기록이 안 돼도 잠금은 그대로
      end;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists check_office_biz_lock on check_office;
create trigger check_office_biz_lock before update on check_office
  for each row execute function cgg_biz_lock('code', 'biz_no', 'popbill_corp', 'popbill_userid');

drop trigger if exists wash_shops_biz_lock on wash_shops;
create trigger wash_shops_biz_lock before update on wash_shops
  for each row execute function cgg_biz_lock('shop', 'biz_no', 'pb_id');

-- 워시 업체가 본사 사업자번호를 새로 넣는 것 막기 (넣기·바꾸기 모두)
create or replace function wash_shops_not_hq_biz() returns trigger
language plpgsql as $$
declare hq text; n text;
begin
  if cgg_biz_unlocked() then return new; end if;
  n := regexp_replace(coalesce(new.biz_no, ''), '[^0-9]', '', 'g');
  if n = '' then return new; end if;
  if tg_op = 'UPDATE' and n = regexp_replace(coalesce(old.biz_no, ''), '[^0-9]', '', 'g') then return new; end if;
  select regexp_replace(coalesce(biz_no, ''), '[^0-9]', '', 'g') into hq from wash_hq where id = 1;
  if hq <> '' and n = hq then
    raise exception '이 사업자번호는 쓸 수 없습니다. 우리 업체 사업자번호를 넣어 주세요.';
  end if;
  return new;
end $$;

drop trigger if exists wash_shops_not_hq_biz on wash_shops;
create trigger wash_shops_not_hq_biz before insert or update of biz_no on wash_shops
  for each row execute function wash_shops_not_hq_biz();
-- (트리거 이름 순서: wash_shops_biz_lock 이 먼저 돌아 바뀐 값을 되돌린 뒤 이 확인이 돌아요)


-- ── 3. 같은 번호 두 곳 금지 (유일 색인) ──────────────────────
-- 이미 같은 번호가 있으면 색인을 만들지 않고 안내만 남겨요(나머지 잠금은 그대로 켜짐).
do $$
declare dup int;
begin
  -- 체크: 세금계산서에 쓰는 번호
  select count(*) into dup from (
    select 1 from check_office
     where coalesce(nullif(regexp_replace(coalesce(popbill_corp,''),'[^0-9]','','g'),''), regexp_replace(coalesce(biz_no,''),'[^0-9]','','g')) <> ''
     group by coalesce(nullif(regexp_replace(coalesce(popbill_corp,''),'[^0-9]','','g'),''), regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'))
    having count(*) > 1) t;
  if dup = 0 then
    execute $i$create unique index if not exists check_office_corp_uq on check_office
      ((coalesce(nullif(regexp_replace(coalesce(popbill_corp,''),'[^0-9]','','g'),''), regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'))))
      where coalesce(nullif(regexp_replace(coalesce(popbill_corp,''),'[^0-9]','','g'),''), regexp_replace(coalesce(biz_no,''),'[^0-9]','','g')) <> ''$i$;
  else raise notice '체크: 같은 세금계산서 번호를 쓰는 검사소가 % 묶음 있어요. 0번 확인을 보고 정리한 뒤 다시 실행하세요.', dup;
  end if;

  -- 체크: 사업자번호
  select count(*) into dup from (
    select 1 from check_office where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> ''
     group by regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') having count(*) > 1) t;
  if dup = 0 then
    execute $i$create unique index if not exists check_office_biz_uq on check_office
      ((regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'))) where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> ''$i$;
  else raise notice '체크: 같은 사업자번호를 쓰는 검사소가 % 묶음 있어요.', dup;
  end if;

  -- 체크: 팝빌 아이디
  select count(*) into dup from (
    select 1 from check_office where btrim(coalesce(popbill_userid,'')) <> ''
     group by lower(btrim(popbill_userid)) having count(*) > 1) t;
  if dup = 0 then
    execute $i$create unique index if not exists check_office_pbuser_uq on check_office
      ((lower(btrim(popbill_userid)))) where btrim(coalesce(popbill_userid,'')) <> ''$i$;
  else raise notice '체크: 같은 팝빌 아이디를 쓰는 검사소가 % 묶음 있어요.', dup;
  end if;

  -- 워시: 사업자번호
  select count(*) into dup from (
    select 1 from wash_shops where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> ''
     group by regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') having count(*) > 1) t;
  if dup = 0 then
    execute $i$create unique index if not exists wash_shops_biz_uq on wash_shops
      ((regexp_replace(coalesce(biz_no,''),'[^0-9]','','g'))) where regexp_replace(coalesce(biz_no,''),'[^0-9]','','g') <> ''$i$;
  else raise notice '워시: 같은 사업자번호를 쓰는 업체가 % 묶음 있어요.', dup;
  end if;
end $$;


-- ── 4. 결과 보기 ─────────────────────────────────────────────
select '잠금: 체크 사업자번호·팝빌' as 항목,
       case when exists (select 1 from pg_trigger where tgname = 'check_office_biz_lock') then '켜짐' else '꺼짐' end as 상태
union all select '잠금: 워시 사업자번호',
       case when exists (select 1 from pg_trigger where tgname = 'wash_shops_biz_lock') then '켜짐' else '꺼짐' end
union all select '막기: 워시 본사 번호',
       case when exists (select 1 from pg_trigger where tgname = 'wash_shops_not_hq_biz') then '켜짐' else '꺼짐' end
union all select '색인: 체크 세금계산서 번호',
       case when to_regclass('public.check_office_corp_uq') is not null then '켜짐' else '꺼짐 — 같은 번호 정리 필요' end
union all select '색인: 체크 사업자번호',
       case when to_regclass('public.check_office_biz_uq') is not null then '켜짐' else '꺼짐 — 같은 번호 정리 필요' end
union all select '색인: 체크 팝빌 아이디',
       case when to_regclass('public.check_office_pbuser_uq') is not null then '켜짐' else '꺼짐 — 같은 아이디 정리 필요' end
union all select '색인: 워시 사업자번호',
       case when to_regclass('public.wash_shops_biz_uq') is not null then '켜짐' else '꺼짐 — 같은 번호 정리 필요' end;


-- ── 본사가 번호를 고쳐야 할 때 (SQL Editor 에서 그대로 하면 돼요) ──
-- update check_office set biz_no = '새 번호', popbill_corp = null, popbill_userid = null where code = '검사소코드';
-- update wash_shops   set biz_no = '새 번호', pb_id = null where shop = '업체코드';
-- 잠긴 뒤 바꾸려던 기록 보기:
-- select * from biz_lock_log order by id desc limit 50;


-- ── 되돌리기 (필요할 때만 주석을 풀고 실행) ──────────────────
-- drop trigger if exists check_office_biz_lock on check_office;
-- drop trigger if exists wash_shops_biz_lock on wash_shops;
-- drop trigger if exists wash_shops_not_hq_biz on wash_shops;
-- drop function if exists wash_shops_not_hq_biz();
-- drop function if exists cgg_biz_lock();
-- drop function if exists cgg_biz_unlocked();
-- drop index if exists check_office_corp_uq;
-- drop index if exists check_office_biz_uq;
-- drop index if exists check_office_pbuser_uq;
-- drop index if exists wash_shops_biz_uq;
-- (biz_lock_log 표는 기록이라 남겨 둬요. 지우려면: drop table if exists biz_lock_log;)
