-- =========================================================
-- 차곳간 워시 — 3단계 : 사진·파일 보관함(wash)을 «비공개»로 바꿉니다
-- ※ 반드시 1단계(서버 v30.1)와 2단계(앱 v99.1)를 올리고,
--    앱에서 사진이 잘 보이는 것을 확인한 «뒤에» 돌려 주세요.
--    (먼저 돌리면 옛 화면에서 사진이 안 보입니다)
-- ※ 보관함을 되돌리려면 아래 false 를 true 로 바꿔 다시 돌리면 됩니다.
-- =========================================================

-- ① 보관함 비공개
update storage.buckets set public = false where id = 'wash';

-- ② 아직 원본 그대로 남아 있는 옛 로그인 열쇠를 한꺼번에 «바꾼 값»으로 고칩니다
--    (서버 v30.1 이 쓰는 방식과 똑같이 바꿉니다. 로그인해 있는 기기는 그대로 유지됩니다)
update public.wash_sessions
   set sid = 'h_' || substr(encode(sha256(convert_to('wash-sid|' || sid, 'UTF8')), 'hex'), 1, 46)
 where sid ~ '^[0-9a-f]+$';

-- ③ 결과 보기
select '보관함 ' || id as "항목",
       case when public then '공개 (위험)' else '비공개 (정상)' end as "상태"
  from storage.buckets
union all
select '원본 그대로 남은 로그인 열쇠',
       count(*)::text || '개' || case when count(*) = 0 then ' (정상)' else ' (확인 필요)' end
  from public.wash_sessions
 where sid !~ '^h_'
 order by 1;
