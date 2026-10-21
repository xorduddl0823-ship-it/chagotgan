-- 시험용 가짜 운영 표(운영 DB 아님) — 사건 재현: A=진짜 손님(가짜 자료) · B=시험 업체(화면 설정에만 A 번호)
drop schema public cascade; create schema public;
do $$ begin if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role login; end if; end $$;
grant usage on schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
-- (Supabase 는 새 표에 서버 계정 권한을 자동으로 줘요 — 같은 흉내)
alter role service_role bypassrls;   -- Supabase 의 service_role 도 행 보안(RLS)을 건너뛰어요 — 같은 흉내
create table wash_hq (id int primary key, biz_no text);
create table wash_shops (shop text primary key, name text, owner_phone text, ceo text, biz_no text, pb_id text, biz_ok_at timestamptz, biz_set_at timestamptz, created_at timestamptz default now(), active boolean default true, plan text);
create table wash_docs (shop text, demo boolean, col text, id text, data jsonb, primary key (shop, demo, col, id));
create table wash_users (phone text, shop text, name text, role text, active boolean default true);
create table wash_sessions (sid text, phone text, shop text, role text, expires_at timestamptz);
create table wash_taxlog (no serial, shop text, mode text, ok boolean);
create table cgg_sendlog (at timestamptz default now(), product text, shop text, tpl text, result text);
create table hq_audit (id bigserial, at timestamptz default now(), action text, product text, result text, detail jsonb);
create table check_office (id uuid primary key default gen_random_uuid(), code text, name text, biz_no text, popbill_corp text, popbill_userid text);
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage on all sequences in schema public to service_role;
insert into wash_hq values (1, '1112233333');
-- A = 진짜 손님(브라더광택) · B = 대표님 시험(워시테스트)
insert into wash_shops (shop,name,owner_phone,ceo,biz_no,plan,biz_ok_at,created_at) values
 ('BRO1','브라더광택','01012345678','정대봉','1234567890','pro', now(), now() - interval '2 day'),
 ('WT01','워시테스트','01066555545','이택영', null,'trial', null, now() - interval '5 day');
insert into wash_docs values
 ('BRO1', false, 'settings', 'config', '{"supplier":{"bizName":"브라더광택","bizNo":"1234567890","ceo":"정대봉"}}'),
 ('WT01', false, 'settings', 'config', '{"supplier":{"bizName":"브라더 세차 광백","bizNo":"123-45-67890","ceo":"정대봉"}}'),
 ('WT01', false, 'settings', 'bak_1', '{"supplier":{"bizName":"워시테스트","bizNo":"","ceo":"이택영"}}'),
 ('BRO1', false, 'intakes', 'i1', '{"plate":"11가1111"}'),
 ('WT01', false, 'intakes', 't1', '{"plate":"22가2222"}');
insert into wash_users values ('01012345678','BRO1','정대봉','owner',true), ('01066555545','WT01','이택영','owner',true);
insert into wash_sessions values ('s1','01012345678','BRO1','owner', now()+interval '1 day'), ('s2','01066555545','WT01','owner', now()+interval '1 day');
insert into wash_taxlog (shop,mode,ok) values ('BRO1','실제',true), ('WT01','시험',false);
insert into cgg_sendlog (product,shop,tpl,result) values ('wash','WT01','release','ata'), ('wash','BRO1','bill','ata');
insert into check_office (code,name,biz_no) values ('GAON','가온진단평가','2223344444');
