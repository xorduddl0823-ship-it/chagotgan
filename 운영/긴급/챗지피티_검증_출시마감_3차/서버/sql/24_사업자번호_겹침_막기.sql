-- ============================================================
-- 24. 사업자번호 겹침 막기 + 본사 승인 (2026-10-19 · 서버 방 · 긴급 검증요청 3·5번 · 대표님 확정 04)
-- ============================================================
-- 대표님 확정 기준:
--   · 고유 키 = 사업자번호(숫자 10자리) + 종사업장번호(4자리 · 없으면 0000). 같은 키로 업체 두 개는 금지.
--   · 같은 사업자번호로 두 번째 가게(다른 종사업장)나 두 번째 제품(워시↔체크)을 쓰려면 «본사(대표님) 승인» 때만.
--     개인·법인 똑같이 적용(예외 없음). «기존 대표 허락» 길은 없음. 번호만 안다고 되는 일은 없음.
--   · 승인 없이 넣으면 거절 + «승인 요청»(biz_share_req)으로 남음 → 관리에서 승인하면 그때만 연결. 승인·거절은 hq_audit 에 남음.
-- 무엇을:
--   1) 칸: wash_shops.biz_sub · check_office.biz_sub (종사업장번호 · 비우면 0000으로 봄)
--   2) 표: biz_share_req(승인 요청) · biz_share_ok(본사 승인 목록) — 서버·본사만 읽고 씀(RLS 켬 · 정책 없음)
--   3) DB 문지기(트리거): 같은 번호가 다른 곳(워시·체크·본사)에 있으면, 이 업체가 본사 승인 목록에 없을 때 거절(오류 23505).
--      같은 번호를 동시에 넣으면 번호마다 줄을 세워(잠금) 한 곳만 들어감. 번호는 숫자만 뽑아 비교.
--   4) 유일 색인: (사업자번호 + 종사업장번호) 표마다 하나 — 이미 겹친 곳은 그 업체만 색인에서 빼고 승인 대기로 표시(줄은 그대로)
--   5) 10/15 잠금(처음 한 번만)에 종사업장번호 칸도 넣음(잠금 SQL을 실행한 곳만)
--   이미 들어 있는 줄은 지우거나 바꾸지 않아요. 새로 넣는 것만 막아요. 본사(SQL Editor = postgres)는 막지 않아요.
-- 실행(대표님): 23번(읽기만) 결과를 보낸 뒤, 총괄이 «실행» 이라고 하면 이 파일 전체를 Run. 두 번 실행해도 괜찮아요.
-- 되돌리기: 맨 아래.
-- ============================================================

-- 1) 칸
alter table wash_shops   add column if not exists biz_sub text;
alter table check_office add column if not exists biz_sub text;

-- 2) 표
create table if not exists biz_share_req (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  product    text not null check (product in ('wash', 'check')),
  code       text not null,                 -- 워시 업체코드 / 체크 검사소 코드
  biz_no     text not null,                 -- 숫자 10자리
  biz_sub    text not null default '0000',  -- 종사업장번호 4자리
  who        text,                          -- 요청한 사람 번호(연락용)
  state      text not null default 'wait' check (state in ('wait', 'ok', 'no')),
  decided_at timestamptz,
  decided_by text,
  memo       text
);
create unique index if not exists biz_share_req_wait_uq on biz_share_req (product, code, biz_no, biz_sub) where state = 'wait';
alter table biz_share_req enable row level security;

create table if not exists biz_share_ok (
  product text not null check (product in ('wash', 'check')),
  code    text not null,
  biz_no  text not null,
  biz_sub text not null default '0000',
  at      timestamptz not null default now(),
  by_who  text,
  primary key (product, code, biz_no)
);
alter table biz_share_ok enable row level security;

-- 3) 문지기
create or replace function cgg_biz_unlocked() returns boolean
language sql stable as $$
  select current_user in ('postgres', 'supabase_admin')
$$;
create or replace function cgg_biz_digits(t text) returns text
language sql immutable as $$ select regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g') $$;
create or replace function cgg_biz_sub(t text) returns text
language sql immutable as $$ select coalesce(nullif(right('0000' || regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g'), 4), '0000'), '0000') $$;

-- 승인 목록 보기(표 주인 권한 · 행 보안과 상관없이 «있다/없다»만 돌려줌 · 이 함수 안에서만 주인 권한)
create or replace function cgg_biz_share_ok(p_prod text, p_code text, p_no text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from biz_share_ok k where k.product = p_prod and k.code = p_code and k.biz_no = p_no)
$$;
revoke all on function cgg_biz_share_ok(text, text, text) from public;
grant execute on function cgg_biz_share_ok(text, text, text) to service_role;   -- 서버만(로그인 안 한 사람·화면 계정은 못 부름)

create or replace function cgg_biz_cross_guard() returns trigger
language plpgsql as $$
declare
  nj jsonb := to_jsonb(new); oj jsonb;
  prod text := case when tg_table_name = 'check_office' then 'check' else 'wash' end;
  mycode text; n text; p text := ''; sub text; o_n text := ''; o_p text := ''; o_sub text := ''; me text;
begin
  if cgg_biz_unlocked() then return new; end if;
  mycode := coalesce(case when prod = 'wash' then nj ->> 'shop' else nj ->> 'code' end, '');
  n := cgg_biz_digits(nj ->> 'biz_no');
  if prod = 'check' then p := cgg_biz_digits(nj ->> 'popbill_corp'); end if;
  sub := cgg_biz_sub(nj ->> 'biz_sub');
  if tg_op = 'UPDATE' then
    oj := to_jsonb(old);
    o_n := cgg_biz_digits(oj ->> 'biz_no'); o_sub := cgg_biz_sub(oj ->> 'biz_sub');
    if prod = 'check' then o_p := cgg_biz_digits(oj ->> 'popbill_corp'); end if;
    if n = o_n and p = o_p and sub = o_sub then return new; end if;     -- 번호가 그대로면 통과(다른 칸 저장)
  end if;
  foreach me in array array_remove(array[nullif(n, ''), nullif(p, '')], null) loop
    perform pg_advisory_xact_lock(hashtext('cgg_biz:' || me));          -- 같은 번호는 줄 세우기
    -- 본사 번호는 언제나 금지
    if exists (select 1 from wash_hq h where h.id = 1 and cgg_biz_digits(h.biz_no) = me) then
      raise exception using errcode = '23505', message = '이 사업자번호는 쓸 수 없습니다. 우리 업체 사업자번호를 넣어 주세요.';
    end if;
    -- 같은 제품 · 같은 키(번호 + 종사업장)는 승인이 있어도 금지
    if (prod = 'wash' and exists (select 1 from wash_shops s where cgg_biz_digits(s.biz_no) = me and cgg_biz_sub(s.biz_sub) = sub and s.shop <> mycode))
       or (prod = 'check' and exists (select 1 from check_office c where (cgg_biz_digits(c.biz_no) = me or cgg_biz_digits(c.popbill_corp) = me)
                                        and cgg_biz_sub(c.biz_sub) = sub and c.code is distinct from nullif(mycode, ''))) then
      raise exception using errcode = '23505', message = '이미 등록된 사업자번호예요. 본인 업체라면 차곳간(010-9559-3663)에 문의해 주세요.';
    end if;
    -- 다른 곳(다른 종사업장 · 다른 제품)이 쓰는 번호 → 본사 승인 목록에 있을 때만
    if (exists (select 1 from wash_shops s where cgg_biz_digits(s.biz_no) = me and s.shop is distinct from case when prod = 'wash' then mycode end)
        or exists (select 1 from check_office c where (cgg_biz_digits(c.biz_no) = me or cgg_biz_digits(c.popbill_corp) = me)
                     and c.code is distinct from case when prod = 'check' then mycode end))
       and not cgg_biz_share_ok(prod, mycode, me) then
      raise exception using errcode = '23505', message = '이미 등록된 사업자번호예요. 본인 업체라면 차곳간(010-9559-3663)에 문의해 주세요.';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists wash_shops_zz_biz_cross on wash_shops;
create trigger wash_shops_zz_biz_cross before insert or update of biz_no, biz_sub on wash_shops
  for each row execute function cgg_biz_cross_guard();
drop trigger if exists check_office_zz_biz_cross on check_office;
create trigger check_office_zz_biz_cross before insert or update of biz_no, biz_sub, popbill_corp on check_office
  for each row execute function cgg_biz_cross_guard();

-- 4) 유일 색인 (번호 + 종사업장) — 이미 겹쳐 있는 곳이 있어도 실패하지 않게:
--    · 지금 겹친 줄은 «그 업체 코드만» 색인에서 빼고(줄은 그대로 · 지우거나 바꾸지 않음), 나머지 모든 줄은 바로 막아요.
--    · 겹친 곳은 승인 요청(대기)으로 남겨 관리에서 보이게 해요. 문지기(3)는 그 업체들도 «번호를 바꿀 때» 똑같이 막아요.
--    · 25번 정리(승인 뒤)를 하고 이 파일을 다시 실행하면 빼 둔 곳 없이 다시 만들어져요.
--    · 10/15 의 «번호만» 색인(같은 이름)은 «번호 + 종사업장»으로 바꿔 끼워요.
create or replace function cgg_biz_index(p_tbl text, p_key text, p_ex text[]) returns void
language plpgsql as $f$
declare idx text := p_tbl || '_biz_uq'; want text; cur text;
begin
  want := format('create unique index %I on public.%I (cgg_biz_digits(biz_no), cgg_biz_sub(biz_sub)) where cgg_biz_digits(biz_no) <> %L', idx, p_tbl, '')
          || case when cardinality(p_ex) > 0 then format(' and %I <> all (%L::text[])', p_key, p_ex::text) else '' end;
  cur := case when to_regclass('public.' || idx) is not null then pg_get_indexdef(to_regclass('public.' || idx)) end;
  -- 지금 색인이 «번호+종사업장 · 같은 빼 둔 목록»이면 그대로 둠
  if cur is not null and cur like '%cgg_biz_sub%'
     and (cardinality(p_ex) = 0) = (cur not like '%<> ALL%')
     and (cardinality(p_ex) = 0 or cur like '%' || replace(p_ex::text, '"', '') || '%') then
    return;
  end if;
  if cur is not null then execute format('drop index public.%I', idx); end if;
  execute want;
end $f$;

do $$
declare w_ex text[]; c_ex text[];
begin
  select coalesce(array_agg(distinct s.shop order by s.shop), '{}') into w_ex
    from wash_shops s
    join (select cgg_biz_digits(biz_no) n, cgg_biz_sub(biz_sub) sb from wash_shops where cgg_biz_digits(biz_no) <> ''
           group by 1, 2 having count(*) > 1) d on d.n = cgg_biz_digits(s.biz_no) and d.sb = cgg_biz_sub(s.biz_sub);
  perform cgg_biz_index('wash_shops', 'shop', w_ex);
  if cardinality(w_ex) > 0 then raise notice '워시: 이미 겹친 업체 %곳은 색인에서 빼 두고 승인 대기로 남겼어요: %', cardinality(w_ex), w_ex; end if;
  insert into biz_share_req (product, code, biz_no, biz_sub, who, memo)
    select 'wash', s.shop, cgg_biz_digits(s.biz_no), cgg_biz_sub(s.biz_sub), '', '24번 실행 때 이미 겹쳐 있던 곳(자동)'
      from wash_shops s where s.shop = any (w_ex)
    on conflict do nothing;

  select coalesce(array_agg(distinct c.code order by c.code), '{}') into c_ex
    from check_office c
    join (select cgg_biz_digits(biz_no) n, cgg_biz_sub(biz_sub) sb from check_office where cgg_biz_digits(biz_no) <> ''
           group by 1, 2 having count(*) > 1) d on d.n = cgg_biz_digits(c.biz_no) and d.sb = cgg_biz_sub(c.biz_sub);
  perform cgg_biz_index('check_office', 'code', c_ex);
  if cardinality(c_ex) > 0 then raise notice '체크: 이미 겹친 검사소 %곳은 색인에서 빼 두고 승인 대기로 남겼어요: %', cardinality(c_ex), c_ex; end if;
  insert into biz_share_req (product, code, biz_no, biz_sub, who, memo)
    select 'check', c.code, cgg_biz_digits(c.biz_no), cgg_biz_sub(c.biz_sub), '', '24번 실행 때 이미 겹쳐 있던 곳(자동)'
      from check_office c where c.code = any (c_ex)
    on conflict do nothing;

  -- 10/15 «세금계산서 번호» 색인(번호만)은 승인된 다른 종사업장을 막으므로 뺌(문지기가 같은 일을 함)
  if to_regclass('public.check_office_corp_uq') is not null then execute 'drop index public.check_office_corp_uq'; end if;
end $$;

-- 5) 10/15 잠금(처음 한 번만)에 종사업장번호도 — 잠금 SQL을 실행한 곳만
do $$
begin
  if exists (select 1 from pg_proc where proname = 'cgg_biz_lock') then
    execute 'drop trigger if exists wash_shops_biz_lock on wash_shops';
    execute $t$create trigger wash_shops_biz_lock before update on wash_shops
      for each row execute function cgg_biz_lock('shop', 'biz_no', 'biz_sub', 'pb_id')$t$;
    execute 'drop trigger if exists check_office_biz_lock on check_office';
    execute $t$create trigger check_office_biz_lock before update on check_office
      for each row execute function cgg_biz_lock('code', 'biz_no', 'biz_sub', 'popbill_corp', 'popbill_userid')$t$;
  end if;
end $$;

-- 결과 보기
select '문지기: 워시 업체표' as 항목, case when exists (select 1 from pg_trigger where tgname = 'wash_shops_zz_biz_cross') then '켜짐' else '꺼짐' end as 상태
union all select '문지기: 체크 검사소표', case when exists (select 1 from pg_trigger where tgname = 'check_office_zz_biz_cross') then '켜짐' else '꺼짐' end
union all select '색인: 워시 (번호+종사업장) 금지', case when to_regclass('public.wash_shops_biz_uq') is null then '꺼짐' when pg_get_indexdef(to_regclass('public.wash_shops_biz_uq')) like '%<> ALL%' then '켜짐 — 이미 겹친 곳만 빼 둠(25번 정리 뒤 다시 실행)' else '켜짐' end
union all select '색인: 체크 (번호+종사업장) 금지', case when to_regclass('public.check_office_biz_uq') is null then '꺼짐' when pg_get_indexdef(to_regclass('public.check_office_biz_uq')) like '%<> ALL%' then '켜짐 — 이미 겹친 곳만 빼 둠(25번 정리 뒤 다시 실행)' else '켜짐' end
union all select '승인 대기(이미 겹쳐 있던 곳)', (select count(*)::text || '건' from biz_share_req where state = 'wait' and memo like '24번 실행 때%')
union all select '표: 승인 요청 · 승인 목록', case when to_regclass('public.biz_share_req') is not null and to_regclass('public.biz_share_ok') is not null then '있음' else '없음' end
union all select '잠금(10/15): 처음 한 번만', case when exists (select 1 from pg_trigger where tgname = 'wash_shops_biz_lock') then '켜짐' else '꺼짐 — 급한고침_사업자번호_잠금.sql 먼저 실행' end;

-- ── 되돌리기 (필요할 때만 주석을 풀고 실행) ──────────────────
-- drop trigger if exists wash_shops_zz_biz_cross on wash_shops;
-- drop trigger if exists check_office_zz_biz_cross on check_office;
-- drop function if exists cgg_biz_cross_guard();
-- drop function if exists cgg_biz_share_ok(text, text, text);
-- drop function if exists cgg_biz_index(text, text, text[]);
-- (표 biz_share_req · biz_share_ok 와 칸 biz_sub 는 기록이 남도록 그대로 둬요. 색인은 그대로 둬도 서버 동작에 문제 없어요.)
