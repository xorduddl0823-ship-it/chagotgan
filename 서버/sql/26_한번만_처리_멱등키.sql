-- ============================================================
-- 26. «한 번 누름 = 한 번 처리» 멱등 키 표 (2026-10-19 · 서버 방 · 기록·알림톡 출시 마감 · 3차 고침: 상태 넷)
-- ============================================================
-- 왜: 저장·보내기 단추를 연속으로 누르거나, 답을 못 받아 화면이 다시 보내면(같은 rid) 같은 일이 두 번 되면 안 돼요.
-- 무엇을: 화면이 쓰기 요청마다 rid(영문 소문자·숫자 24자)를 붙여요. 서버는 (제품 · 업체/검사소 · 사람 · 기능 · rid)를 한 줄로 잡고,
--   같은 열쇠가 다시 오면 다시 하지 않고 «처음 답»을 그대로 돌려줘요. 처음 것이 아직 처리 중이면 «처리 중이에요»로 답해요.
--   (3차 · 2026-10-19 고침) 줄을 지우지 않아요. 상태는 넷이에요:
--     run(처리 중) · done(끝남 · 처음 답 보관) · retry(못 함 확정 → 같은 rid 로 다시 가능) · unknown(확인 중 — 문자 업체가 받았는지 모름 · 자동으로 다시 안 보냄)
--   다시 잡을 때는 «조건을 건 update 한 번»(state · at 이 그대로일 때만)이라 둘이 동시에 와도 한쪽만 잡아요.
--   24시간 지난 done/retry 줄만 서버가 가끔 지워요(run/unknown 은 남김).
--   열쇠에 «업체 + 사람»이 들어 있어 다른 업체·다른 사람이 같은 rid 를 보내도 남의 답을 받을 수 없어요(보안 방 §5).
-- 실행: 파일 전체를 Run. 두 번 실행해도 괜찮아요. 예전 26(상태 run/done 만)을 이미 돌렸어도 이 파일을 다시 돌리면 상태 넷으로 바뀌어요.
-- ⚠ 순서: 이 SQL 을 서버 sb29 · v54 보다 «먼저». 이 표가 없으면 sb29 · v54 는 문자·알림톡 보내기(rid 가 붙은 것)를 «잠시 뒤 다시»로 막아요
--   (보호 없이 보내지 않음). 기록 저장은 표가 없어도 예전처럼 돼요.
-- 되돌리기: 서버를 먼저 예전 판으로 돌린 뒤(sb29·v54 는 이 표가 없으면 보내기를 막음) drop table if exists cgg_idem;  ※ «확인 중» 줄이 있으면 보낸 기록을 먼저 확인
-- ============================================================
create table if not exists cgg_idem (
  product  text not null check (product in ('wash', 'check')),
  tenant   text not null,            -- 워시 업체 코드 / 체크 검사소 id / 기사는 'drv'
  who      text not null,            -- 로그인한 사람 번호(기사는 열쇠의 지문)
  fn       text not null,
  rid      text not null check (rid ~ '^[a-z0-9]{24}$'),
  state    text not null default 'run',
  result   jsonb,
  at       timestamptz not null default now(),
  done_at  timestamptz,
  primary key (product, tenant, who, fn, rid)
);
create index if not exists cgg_idem_at on cgg_idem (at);
-- 3차: 상태 넷(run · done · retry · unknown) — 예전 26 의 제약(run/done)을 바꿔 끼움
alter table cgg_idem drop constraint if exists cgg_idem_state_check;
alter table cgg_idem add constraint cgg_idem_state_check check (state in ('run', 'done', 'retry', 'unknown'));
alter table cgg_idem enable row level security;   -- 정책 없음 = 서버만

select '표: cgg_idem' as 항목, case when to_regclass('public.cgg_idem') is not null then '있음' else '없음' end as 상태
union all
select '상태 넷(run·done·retry·unknown)', case when exists (select 1 from pg_constraint where conname = 'cgg_idem_state_check'
  and pg_get_constraintdef(oid) like '%unknown%') then '있음' else '없음' end
union all
select '행 보안(RLS)', case when (select relrowsecurity from pg_class where oid = 'public.cgg_idem'::regclass) then '켜짐' else '꺼짐 ⚠' end;
