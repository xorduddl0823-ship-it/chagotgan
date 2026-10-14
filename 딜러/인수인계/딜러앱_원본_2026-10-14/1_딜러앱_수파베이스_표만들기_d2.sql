-- =========================================================
-- 차곳간 딜러앱 — 1번 파일 : 수파베이스 표 만들기 (1단계)
-- 넣는 곳 : chagotgan-wash 프로젝트 → SQL Editor → Run
-- 워시 표(wash_…)와 체크 표(check_…)는 하나도 고치지 않습니다. 새 표만 만듭니다.
-- d2: «상품화 완료» 표(dealer_done) 추가
-- 여러 번 돌려도 괜찮습니다 (이미 있으면 건너뜁니다).
-- =========================================================

-- ① 딜러 인증번호 (워시 직원 인증번호와 섞이지 않게 따로 둡니다)
create table if not exists dealer_otp (
  phone       text primary key,
  code_hash   text not null,
  tries       integer default 0,
  sent_count  integer default 0,
  sent_day    date,
  verified    boolean default false,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

-- ② 딜러 (휴대폰 번호 = 아이디, 비밀번호 없음)
create table if not exists dealer_users (
  phone         text primary key,
  name          text,
  created_at    timestamptz default now(),
  last_login    timestamptz,
  active        boolean default true,
  withdrawn_at  timestamptz            -- 동의 철회(탈퇴)한 때
);

-- ③ 딜러 로그인 유지
create table if not exists dealer_sessions (
  sid         text primary key,
  phone       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz default now(),
  last_seen   timestamptz default now(),
  ua          text
);
create index if not exists dealer_sessions_phone on dealer_sessions (phone);

-- ④ 약관·개인정보 동의 기록 (언제, 어느 판에 동의했는지 남깁니다)
create table if not exists dealer_agreements (
  id           bigserial primary key,
  phone        text not null,
  terms_ver    text,
  privacy_ver  text,
  marketing    boolean default false,
  agreed_at    timestamptz default now(),
  ua           text,
  ip           text,
  what         text default 'agree'   -- agree = 동의 / withdraw = 철회
);
create index if not exists dealer_agreements_phone on dealer_agreements (phone, agreed_at desc);

-- ⑤ 바깥에서 바로 못 읽게 잠금 (서버만 읽고 씁니다)
alter table dealer_otp        enable row level security;
alter table dealer_users      enable row level security;
alter table dealer_sessions   enable row level security;
alter table dealer_agreements enable row level security;

-- ⑤-2 «상품화 완료» 표시 (딜러가 누른 차)
create table if not exists dealer_done (
  phone    text not null,
  rec_key  text not null,          -- 업체코드:기록id
  done_at  timestamptz default now(),
  primary key (phone, rec_key)
);
alter table dealer_done enable row level security;

-- ⑥ 딜러 번호로 입고 기록을 빨리 찾게 하는 색인
create index if not exists wash_docs_intake_phone
  on wash_docs ((regexp_replace(coalesce(data->>'phone',''), '[^0-9]', '', 'g')))
  where col = 'intakes' and demo = false;

-- ⑦ 이 번호로 들어온 차 (모든 업체) — 서버만 부를 수 있습니다
create or replace function dealer_cars(p_phone text)
returns table (shop text, shop_name text, shop_kind text, id text, data jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.shop, s.name, s.biz_kind, d.id, d.data, d.updated_at
  from wash_docs d
  left join wash_shops s on s.shop = d.shop
  where d.col = 'intakes' and d.demo = false and d.data is not null
    and regexp_replace(coalesce(d.data->>'phone',''), '[^0-9]', '', 'g') = p_phone
    and coalesce(s.active, true)
    and d.shop <> 'ADMIN'
  order by d.updated_at desc
  limit 1000;
$$;
revoke all on function dealer_cars(text) from public, anon, authenticated;
grant execute on function dealer_cars(text) to service_role;

-- 끝. 아래에 "Success. No rows returned" 가 나오면 잘 된 것입니다.
