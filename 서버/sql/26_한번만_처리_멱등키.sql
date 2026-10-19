-- ============================================================
-- 26. «한 번 누름 = 한 번 처리» 멱등 키 표 (2026-10-19 · 서버 방 · 기록·알림톡 출시 마감)
-- ============================================================
-- 왜: 저장·보내기 단추를 연속으로 누르거나, 답을 못 받아 화면이 다시 보내면(같은 rid) 같은 일이 두 번 되면 안 돼요.
-- 무엇을: 화면이 쓰기 요청마다 rid(영문 소문자·숫자 24자)를 붙여요. 서버는 (제품 · 업체/검사소 · 사람 · 기능 · rid)를 한 줄로 잡고,
--   같은 열쇠가 다시 오면 다시 하지 않고 «처음 답»을 그대로 돌려줘요. 처음 것이 아직 처리 중이면 «처리 중이에요»로 답해요.
--   실패한 요청은 줄을 지워서 다시 하기가 되게 해요. 24시간 지난 줄은 서버가 지워요.
--   열쇠에 «업체 + 사람»이 들어 있어 다른 업체·다른 사람이 같은 rid 를 보내도 남의 답을 받을 수 없어요(보안 방 §5).
-- 실행: 파일 전체를 Run. 두 번 실행해도 괜찮아요. 이 표가 없으면 서버는 예전처럼(멱등 없이) 돌아가요.
-- 되돌리기: drop table if exists cgg_idem;
-- ============================================================
create table if not exists cgg_idem (
  product  text not null check (product in ('wash', 'check')),
  tenant   text not null,            -- 워시 업체 코드 / 체크 검사소 id / 기사는 'drv'
  who      text not null,            -- 로그인한 사람 번호(기사는 열쇠의 지문)
  fn       text not null,
  rid      text not null check (rid ~ '^[a-z0-9]{24}$'),
  state    text not null default 'run' check (state in ('run', 'done')),
  result   jsonb,
  at       timestamptz not null default now(),
  done_at  timestamptz,
  primary key (product, tenant, who, fn, rid)
);
create index if not exists cgg_idem_at on cgg_idem (at);
alter table cgg_idem enable row level security;   -- 정책 없음 = 서버만

select '표: cgg_idem' as 항목, case when to_regclass('public.cgg_idem') is not null then '있음' else '없음' end as 상태;
