-- ============================================================
--  차곳간체크 사무실 로그인 — 처음 비밀번호는 문자 확인 뒤에 (check-api v26 이 씁니다)
--  (보안 방 2026-10-15 요청) 수파베이스 → SQL Editor 에 통째로 붙여 넣고 Run 한 번. check-api v26 배포 전에.
--  여러 번 실행해도 안전합니다. 기존 표는 바꾸지 않고 새 표 1개만 만듭니다.
--  (로그인 틀린 횟수 잠금은 sql/02 의 check_deliv_attempt 를 같이 씁니다 — 02 를 먼저 실행)
-- ============================================================
create table if not exists check_pw_first (
  phone       text primary key,                  -- 숫자만
  user_id     text not null,                     -- check_user.id 를 글자로
  code_hash   text not null,                     -- 확인 번호는 그대로 저장하지 않음
  pw_hash     text not null,                     -- 로그인 때 적은 새 비밀번호(섞은 값) — 확인되면 check_user 로 옮김
  expires_at  timestamptz not null,              -- 5분
  created_at  timestamptz not null default now()
);
alter table check_pw_first enable row level security;   -- 정책 없음 = 서버 함수만 읽음
