-- ============================================================
--  알림톡·문자 발송 기록 (모든 서버 같은 모양) — 워시 sb15 · 체크 v32 · 딜러 d8 · 경비실 v1.6 이 씁니다 (2026-10-15)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. (SQL 10 다음에 · 서버 올리기 전에)
--  SQL 이 없어도 서버는 발송을 그대로 합니다(기록만 빠짐).
-- ============================================================
--  남기는 것: 제품 · 업체(검사소) 코드 · 템플릿 키 · 가린 번호(010-****-1234) · 알림톡/문자 · 솔라피 번호 · 결과 · 쉬운 오류
--  남기지 않는 것: 본문 · 변수 «값»(인증번호·임시 비밀번호 등) · 열쇠·서명. 변수는 «이름»만.
--  보관: 한 줄 기록은 90일 뒤 지움(보안 추천) · 지우기 전에 달마다 합계(cgg_sendlog_month)에 더해 오래 둠.

-- 1) 한 줄 기록
create table if not exists cgg_sendlog (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  product     text not null,                 -- wash / check / dealer / cgg
  shop        text not null default '',      -- 업체 코드 · 검사소 코드 (본사·가입 전이면 빈칸)
  tpl         text not null default '',      -- 템플릿 키 (intake·release·auth·check_arrive·staff_link·pay_done …) 또는 sms_free·notice
  to_mask     text not null default '',      -- 가린 번호 010-****-1234
  via         text not null default '',      -- 보낼 때: ata / sms / lms / mms / auto
  final_via   text not null default '',      -- 결과 확인 뒤 실제로 간 것: ata / sms / lms / mms
  msg_id      text not null default '',      -- 솔라피 메시지 번호
  group_id    text not null default '',
  result      text not null default 'wait',  -- wait(대기) / ata(알림톡 도착) / sms(문자 대체) / sent(문자 도착) / fail(실패) / skip(일부러 안 보냄: 코드 없음 등)
  status_code text not null default '',      -- 솔라피 상태 코드
  err         text not null default '',      -- 안 된 이유 (쉬운 말)
  vars        text[] not null default '{}',  -- 변수 이름만
  ref         text not null default '',      -- 주문번호 등 짧은 참고
  scheduled   boolean not null default false,
  checked_at  timestamptz
);
alter table cgg_sendlog enable row level security;          -- 정책 없음 = 서버(service_role)만
create index if not exists cgg_sendlog_at on cgg_sendlog (at desc);
create index if not exists cgg_sendlog_shop on cgg_sendlog (product, shop, at desc);
create index if not exists cgg_sendlog_wait on cgg_sendlog (id) where result = 'wait';

-- 2) 달마다 합계 (오래 보관 · 요금 맞추기와 분쟁 확인용)
create table if not exists cgg_sendlog_month (
  ym       text not null,          -- 2026-10
  product  text not null,
  shop     text not null default '',
  tpl      text not null default '',
  result   text not null,
  via      text not null default '',
  n        int  not null default 0,
  primary key (ym, product, shop, tpl, result, via)
);
alter table cgg_sendlog_month enable row level security;

-- 3) 90일 지난 줄 → 달 합계에 더하고 지우기 (워시 서버가 하루 한 번 부름)
create or replace function cgg_sendlog_purge(p_days int default 90) returns int
language plpgsql security definer set search_path = public as $$
declare cut timestamptz := now() - make_interval(days => greatest(p_days, 30)); k int;
begin
  insert into cgg_sendlog_month (ym, product, shop, tpl, result, via, n)
  select to_char(at at time zone 'Asia/Seoul', 'YYYY-MM'), product, shop, tpl, result,
         coalesce(nullif(final_via, ''), via), count(*)
    from cgg_sendlog where at < cut
   group by 1, 2, 3, 4, 5, 6
  on conflict (ym, product, shop, tpl, result, via) do update set n = cgg_sendlog_month.n + excluded.n;
  delete from cgg_sendlog where at < cut;
  get diagnostics k = row_count;
  return k;
end $$;
revoke all on function cgg_sendlog_purge(int) from public;
grant execute on function cgg_sendlog_purge(int) to service_role;

-- 4) 체크 서버 하루 한도 (보안 L5 · 체크 v32 의 확인 문자·도착 알림 상한)
--    이미 같은 이름의 함수가 있으면 건드리지 않습니다.
create table if not exists check_rate (
  key         text primary key,
  n           int not null default 0,
  updated_at  timestamptz not null default now()
);
alter table check_rate enable row level security;
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'check_rate_bump') then
    execute $f$
      create function check_rate_bump(p_key text, p_max int) returns boolean
      language plpgsql security definer set search_path = public as $b$
      declare v int;
      begin
        if random() < 0.01 then delete from check_rate where updated_at < now() - interval '3 days'; end if;
        insert into check_rate (key, n) values (p_key, 1)
        on conflict (key) do update set n = check_rate.n + 1, updated_at = now()
          where check_rate.n < p_max
        returning n into v;
        return v is not null and v <= p_max;
      end $b$;
    $f$;
    execute 'revoke all on function check_rate_bump(text, int) from public';
    execute 'grant execute on function check_rate_bump(text, int) to service_role';
  end if;
end $$;

-- 5) 사업자번호 본사 확인 (보안 W-H1 · 체크 H1 남은 위험) — 처음 넣은 번호는 관리에서 확인한 뒤에만 실제 세금계산서·팝빌
--    지금 있는 업체·검사소는 «확인됨»으로 시작해요 (칸을 더할 때 지금 시각을 넣고, 그 뒤 기본값을 비움 → 새로 넣는 번호는 «확인 중»)
alter table wash_shops   add column if not exists biz_ok_at timestamptz default now();
alter table wash_shops   alter column biz_ok_at set default null;
alter table check_office add column if not exists biz_ok_at timestamptz default now();
alter table check_office alter column biz_ok_at set default null;
--    급한고침 SQL 을 아직 안 했으면 같이 해 주세요: 서버/sql/급한고침_사업자번호_잠금.sql

-- 확인: 아래 네 줄이 모두 true 면 끝
select 'cgg_sendlog' as 표, to_regclass('public.cgg_sendlog') is not null as 있음
union all select 'cgg_sendlog_month', to_regclass('public.cgg_sendlog_month') is not null
union all select 'check_rate_bump', exists (select 1 from pg_proc where proname = 'check_rate_bump')
union all select '사업자번호 확인 칸', exists (select 1 from information_schema.columns where table_name = 'wash_shops' and column_name = 'biz_ok_at');
