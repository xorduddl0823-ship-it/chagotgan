-- ============================================================
--  체크 청구서 보내기 · 재검사 알림 — check-api v33 이 씁니다 (2026-10-16 · 시험 뒤 판)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. (SQL 11 다음 · 서버 v33 올리기 전에)
--  새 표는 모두 RLS 를 켜고 정책을 두지 않아요(서버만 읽고 씀).
-- ============================================================

-- 1) 청구서 — 보낸 방법·안 된 이유 · 보기 주소 기한(약 90일)
alter table check_invoice add column if not exists send_how   text;
alter table check_invoice add column if not exists send_err   text;
alter table check_invoice add column if not exists view_until timestamptz;

-- 2) 재검사 알림 규칙 (검사소마다 한 줄)
create table if not exists check_remind_rule (
  office_id   text primary key,
  steps       int[] not null default '{30,15,7}',   -- 만료 며칠 전에 알릴지 (30·15·7·3 가운데)
  auto        boolean not null default false,       -- 매일 09:10 자동 (재검사 알림톡 승인 뒤에만 켤 수 있음)
  past        boolean not null default true,        -- 이미 끝난 차도 목록에 (30일까지)
  updated_at  timestamptz not null default now()
);
alter table check_remind_rule enable row level security;

-- 3) 보낸 기록 — 같은 차 · 같은 단계는 한 번만
create table if not exists check_remind_log (
  id         bigserial primary key,
  office_id  text not null,
  car_id     text not null,
  step       int  not null,
  dealer_id  text,
  at         timestamptz not null default now(),
  unique (office_id, car_id, step)
);
alter table check_remind_log enable row level security;

-- 4) 차 — 알림 빼기 (팔린 차·이미 재검사한 차)
alter table check_car add column if not exists remind_off boolean not null default false;

-- 5) 재검사 차량 목록 보기 주소 (딜러별 · 30일)
create table if not exists check_remind_view (
  view_key    text primary key,
  office_id   text not null,
  dealer_id   text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table check_remind_view enable row level security;
create index if not exists check_remind_view_exp on check_remind_view (expires_at);

-- 6) 매일 09:10(한국) 자동 — 이미 있는 자동 시계(chagotgan_expire)와 같은 모양으로 check-api remindCron 을 부르는 예약을 만들어요.
--    열쇠 값은 이 파일에 적지 않아요(이미 있는 예약에서 그대로 가져와요). 예약이 없으면 안내만 남겨요.
do $$
declare cmd text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    raise notice '자동 예약(pg_cron)이 꺼져 있어요. 재검사 매일 자동은 나중에 켜요 (손으로 보내기는 그대로 됨).';
    return;
  end if;
  execute $q$select command from cron.job where jobname = 'chagotgan_expire' limit 1$q$ into cmd;
  if cmd is null or position('wash-api' in cmd) = 0 or position('cronExpire' in cmd) = 0 then
    raise notice 'chagotgan_expire 예약을 찾지 못했어요. 서버 방에 알려 주세요 (손으로 보내기는 그대로 됨).';
    return;
  end if;
  cmd := replace(replace(cmd, 'wash-api', 'check-api'), 'cronExpire', 'remindCron');
  begin execute $q$select cron.unschedule('chagotgan_check_remind')$q$; exception when others then null; end;
  execute format($q$select cron.schedule('chagotgan_check_remind', '10 0 * * *', %L)$q$, cmd);   -- 00:10 UTC = 09:10 한국
end $$;

-- 확인: 아래가 모두 true 면 끝 (예약은 없을 수도 있어요 — 위 안내 참고)
select 'check_remind_rule' as 표, to_regclass('public.check_remind_rule') is not null as 있음
union all select 'check_remind_log',  to_regclass('public.check_remind_log') is not null
union all select 'check_remind_view', to_regclass('public.check_remind_view') is not null
union all select 'check_invoice.view_until', exists (select 1 from information_schema.columns where table_name = 'check_invoice' and column_name = 'view_until')
union all select 'check_car.remind_off', exists (select 1 from information_schema.columns where table_name = 'check_car' and column_name = 'remind_off');
