# 인수인계: Claude Code 「차곳간 통합 UI」 방 (서버 부분)

> 작성: 사용자 페이지 구조 설계 방 (2026-10-13). 대화 기록과 보고서를 읽고 정리한 요약입니다.
> 서버 코드 원본은 대표님 PC에 있어 아직 이 서랍에 없습니다.

## 1. 지금 서버 구성
- 수파베이스 프로젝트 하나 (이름 `chagotgan-wash`)
- Edge Function 세 개: `check-api`, `wash-api`, `dealer-api`
- 요청 POST `{shop, token, fn, args}` → 응답 `{result}` 또는 `{__err}`
- 체크: 수파베이스만 씀. 표 23개(`check_*`). 소스 `2_차곳간체크_서버_check-api_v21_1.ts` (PC 꾸러미 폴더)
- 관리: `wash-api` 만 씀 (`SHOP="ADMIN"`, hq 창구 68개). 로그인 `hqLogin`(아이디·비밀번호) + `hqLogin2`(문자 6자리)
- 워시: 둘로 나뉨
  - 로그인·요금제 → 수파베이스 `wash-api` (login / me / signup 등)
  - 자료 저장·팝빌·문자 → **구글 Apps Script + 구글 시트** (창구 27개, 화면 호출부 32곳) → 폐기 예정
- 워시와 체크는 같은 로그인 표 `wash_sessions` 를 씀
- 업체마다 다른 값(사업자번호·팝빌 아이디·발신번호)은 비밀값이 아니라 표에 둠 (`check_office`, 예정 `ccw_office`)

## 2. 비밀값 이름 (값은 수파베이스에만)
`POPBILL_LINKID`, `POPBILL_SECRET`/`POPBILL_SECRETKEY`, `SOLAPI_KEY`, `SOLAPI_SECRET`, `ANTHROPIC_KEY`(사진 읽기), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## 3. 워시 서버 이사 설계 (16·17차)
- 새 표: `ccw_rows`(shop, col, id, data jsonb), `ccw_stamp`, `ccw_deposit`, `ccw_tax`, `ccw_popbill`/`ccw_office`, `ccw_bank`
- 새 `wash-api` = check-api 복사 후 `check_*` → `ccw_*`, 창구 43개
- 화면은 `gsCall` 함수 속만 바꾸면 됨
- 진행: 1차 시험(가짜 서버, 창구 21개)만 통과. 남은 것: SQL 실행·배포, 자료 1회 이사, 2차(팝빌 테스트 모드)·3차(실제 1건) 시험, 옛 코드 삭제
- 설계 시안: https://claude.ai/code/artifact/514e3b23-e1a9-4453-811d-9f7e93c66c83
- 1차 보고: https://claude.ai/code/artifact/bc98ac75-b462-48df-a0b7-97eb9fc85586
- 입·출금 세금계산서 이식안: https://claude.ai/code/artifact/d1763af9-e927-4a4e-9c15-a58a21ebaee4

## 4. 아직 안 만든 것: 통합 로그인 창구 4개 (경비실)
- `cggLogin(id,pw)` → 관리 권한 있으면 `{tick,to}` 돌려주고 문자 발송
- `cggLogin2(tick,code)`
- `cggMe(sid)`
- `cggLogout(sid)`
- 돌려줄 모양: `{sid, name, products:[{code:"wash"|"check"|"admin", shop, sid}]}`
- 계정 표에 `products text[]` 칸 추가 (예: A `{check}`, B `{wash}`, 대표 `{wash,check,admin}`). 실제 표 이름은 로그인 코드 확인 후 맞춤
- 규칙 장부 1-3에 따라 통합 입구에는 관리를 넣지 않으므로 `admin` 은 별도 관리 로그인에서만 쓰도록 정리 필요

## 5. 걱정거리
- 제품별 권한 검사가 서버에 아직 없음
- RLS(표 보안) 이야기가 한 번도 없었음. 모든 함수가 서비스 키로 동작 → 함수 안의 토큰 검사가 유일한 방어선
- 워시 화면이 `ccw_key`(업체 키)를 브라우저 저장소에 두고 토큰으로 보냄 → 노출 영향 검토 필요
- 팝빌 계좌조회 건당 유료, 발급한 세금계산서 취소 불가
