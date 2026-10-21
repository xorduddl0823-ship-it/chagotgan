-- ============================================================
-- 25. 중복 사업자번호 정리안 — «대표님 승인 뒤에만» (2026-10-19 · 서버 방 · 긴급 검증요청 7번)
-- ============================================================
-- 무엇을: 시험 업체 B(«워시테스트» · 대표님 시험 계정)에 잘못 들어간 남의 사업자 정보만 비워요.
--   · 진짜 손님 A(브라더광택)는 한 글자도 건드리지 않아요.
--   · 지우지 않고 «비우기»만 해요. 업체 · 계정 · 차량 · 청구서 · 사진은 그대로예요(합치지 않아요).
--   · 바꾸기 전 값은 biz_fix_20261019 표에 그대로 남겨서 되돌릴 수 있어요.
-- 비우는 칸(B만):
--   ① 화면 설정(wash_docs settings/config · 설정 백업 bak_*)의 «우리 사업장» 사업자번호 · 상호 · 대표자 — 그 번호가 적힌 것만
--   ② 서버 업체표(wash_shops)의 사업자번호 · 대표자 · 팝빌 아이디 · 확인 시각 — 그 번호가 적혀 있을 때만
-- 안전장치: 아래 B 업체코드 · 이름 · 대표 번호 끝 4자리가 셋 다 맞아야 돌아요(아니면 멈추고 아무것도 안 바뀜).
--
-- 실행(대표님 · 승인 뒤):
--   1단계(연습): 23번 결과에서 B 업체코드를 확인 → 아래 '여기에_B_업체코드' 를 그 코드로 바꿔요 → 파일 전체 Run.
--          맨 끝이 rollback 이라 «연습»만 해요. 결과 표에 바뀔 줄이 나오면 그 화면을 총괄 방에 보내요.
--   2단계(진짜): 총괄이 «진짜 실행» 이라고 하면 맨 끝 rollback; 을 commit; 으로 바꿔 다시 Run.
--   3단계: B 화면(워시테스트)에서 로그아웃 → 다시 로그인(화면에 남아 있던 옛 설정이 다시 저장되지 않게).
--   4단계: 24번 SQL을 한 번 더 Run → «색인: 워시 같은 번호 금지 = 켜짐» 확인.
-- 되돌리기: 맨 아래 «되돌리기»(주석을 풀고 실행).
-- ============================================================

begin;

create table if not exists biz_fix_20261019 (
  at timestamptz not null default now(), tbl text not null, key1 text, key2 text, before jsonb
);

do $$
declare
  b_shop  text := '여기에_B_업체코드';     -- 23번 결과의 B 업체코드(예: WT01)
  b_name  text := '워시테스트';
  b_tail4 text := '5545';                 -- B 대표 휴대폰 끝 4자리
  num     text := '1234567890';           -- 정리할 사업자번호
  ok int; n1 int := 0; n2 int := 0;
begin
  select count(*) into ok from wash_shops
   where shop = b_shop and name = b_name and right(regexp_replace(coalesce(owner_phone,''),'[^0-9]','','g'), 4) = b_tail4;
  if ok <> 1 then raise exception '멈춤: B 업체(코드·이름·번호 끝 4자리)가 맞지 않아요. 아무것도 바꾸지 않았어요.'; end if;

  -- ① 화면 설정(config · 백업) — 그 번호가 적힌 것만
  insert into biz_fix_20261019 (tbl, key1, key2, before)
    select 'wash_docs', d.shop, d.col || '/' || d.id || '/' || d.demo::text, d.data from wash_docs d
     where d.shop = b_shop and d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = num;
  update wash_docs d set data = jsonb_set(d.data, '{supplier}',
           (d.data->'supplier') || jsonb_build_object('bizNo', '', 'bizName', '', 'ceo', ''))
   where d.shop = b_shop and d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = num;
  get diagnostics n1 = row_count;

  -- ② 서버 업체표 — 그 번호가 적혀 있을 때만
  insert into biz_fix_20261019 (tbl, key1, key2, before)
    select 'wash_shops', s.shop, '', to_jsonb(s) - 'token' from wash_shops s
     where s.shop = b_shop and regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = num;
  update wash_shops s set biz_no = null, ceo = null, pb_id = null, biz_ok_at = null
   where s.shop = b_shop and regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = num;
  get diagnostics n2 = row_count;

  raise notice '정리: 화면 설정 %줄 · 업체표 %줄 (B 업체만)', n1, n2;
end $$;

-- 결과 확인(가림) — A 는 그대로, B 는 비워졌는지
select s.shop as 업체, s.name as 이름,
       case when regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = '' then '(빈칸)' else left(regexp_replace(s.biz_no,'[^0-9]','','g'),3) || '-**-***' || right(regexp_replace(s.biz_no,'[^0-9]','','g'),2) end as 업체표_번호,
       coalesce((select case when regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = '' then '(빈칸)' else '있음' end
                   from wash_docs d where d.shop = s.shop and d.col = 'settings' and d.id = 'config' and not d.demo), '-') as 화면설정_번호
  from wash_shops s
 where s.shop in (select key1 from biz_fix_20261019)
    or regexp_replace(coalesce(s.biz_no,''),'[^0-9]','','g') = '1234567890'
    or s.shop in (select d.shop from wash_docs d where d.col = 'settings' and regexp_replace(coalesce(d.data->'supplier'->>'bizNo',''),'[^0-9]','','g') = '1234567890');

rollback;   -- ← 연습. 승인 뒤 진짜로 하려면 이 줄을 commit; 으로 바꿔요.

-- ── 되돌리기 (진짜 실행 뒤 되돌려야 할 때만 · 주석을 풀고 실행) ──────────
-- update wash_docs d set data = f.before from biz_fix_20261019 f
--  where f.tbl = 'wash_docs' and d.shop = f.key1 and d.col || '/' || d.id || '/' || d.demo::text = f.key2;
-- update wash_shops s set biz_no = f.before->>'biz_no', ceo = f.before->>'ceo', pb_id = f.before->>'pb_id',
--        biz_ok_at = (f.before->>'biz_ok_at')::timestamptz
--   from biz_fix_20261019 f where f.tbl = 'wash_shops' and s.shop = f.key1;
