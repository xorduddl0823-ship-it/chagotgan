-- ============================================================
--  차곳간 딜러앱 — 인증번호 틀린 횟수 세기 (dealer-api d3 가 씁니다)
--  수파베이스 → SQL Editor 에 통째로 붙여 넣고 Run 한 번.
--  dealer-api d3 를 배포하기 «전에» 먼저 실행해 주세요 (없으면 d3 는 로그인을 막습니다).
--  여러 번 실행해도 안전합니다 (같은 함수를 덮어씁니다).
--  표(dealer_otp)는 딜러 1번 파일(표만들기 d2)에서 이미 만든 것을 그대로 씁니다. 표는 바꾸지 않습니다.
-- ============================================================

-- ① 인증번호 넣어 보기 횟수 — 번호를 맞춰 보기 전에 한 번에 올립니다 (동시에 보내도 새지 않음)
--    경비실 cgg_attempt 와 같은 방식: 그 줄을 잠그고(for update) → 1 올리고 → 올린 값을 돌려줌
--    돌려주는 값: 올린 뒤의 횟수 (서버가 5 이하일 때만 번호를 맞춰 봄)
--                 null = 이 번호로 받은 인증번호가 없음
create or replace function dealer_otp_try(p_phone text) returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform 1 from dealer_otp where phone = p_phone for update;
  if not found then return null; end if;
  update dealer_otp set tries = coalesce(tries, 0) + 1
    where phone = p_phone
    returning tries into n;
  return n;
end $$;
revoke all on function dealer_otp_try(text) from public, anon, authenticated;
grant execute on function dealer_otp_try(text) to service_role;

-- ※ 문자 보내기 횟수 제한(rateOk)은 워시와 같은 함수 wash_rate_bump(p_key text, p_max int) 를 씁니다.
--   이 함수는 워시 쪽 SQL 에서 만든 것이라 이 저장소에는 원본이 없습니다 (여기서 새로 만들지 않습니다).
--   d3 부터는 이 함수가 없거나 오류가 나면 문자를 «보내지 않습니다». 수파베이스에 있는지 꼭 확인해 주세요:
--     select proname from pg_proc where proname = 'wash_rate_bump';

-- 끝. 아래에 "Success. No rows returned" 가 나오면 잘 된 것입니다.
