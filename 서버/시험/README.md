# 서버 시험

가짜 수파베이스(메모리 표)로 경비실(cgg-api)과 체크 서버(check-api)의 로그인·권한을 시험합니다.
실제 수파베이스에는 붙지 않습니다.

```
deno run -A --no-lock --import-map=서버/시험/import_map.json 서버/시험/경비실_시험.ts
```

- `fake_supabase.ts` — 가짜 수파베이스 (두 서버가 쓰는 만큼만 흉내)
- `import_map.json` — 서버 코드의 수파베이스 불러오기를 가짜로 바꿔 끼움
- `경비실_시험.ts` — 시험 41개 (2026-10-14 전부 통과)

체크 서버 v23 배달 기사 로그인 시험 (잠금 · 같은 이름 구분 · 가입 신청 표시):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크기사_시험.ts
```

- `fake_supabase_check.ts` — 위 가짜의 사본 + upsert/in/gt/order/single, `check_deliv_attempt`
- `import_map_check.json` — 이 사본으로 바꿔 끼움
- `체크기사_시험.ts` — 시험 44개 (2026-10-15 전부 통과)

워시 서버 sb3 + 경비실 v1.3 시험 (경비실 명단 권한 · 대표 전용 자료 · 직원 문자 · 횟수 장치 · 직급 변경 · 손님 기기 정보):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/워시_시험.ts
```

- `fake_supabase_wash.ts` · `import_map_wash.json` — 워시 서버용 가짜 (없는 표는 빈 표)
- `워시_시험.ts` — 시험 38개 (2026-10-15 전부 통과 · `WASH_SRC` 로 옛 판을 넣으면 실패가 나옴)

딜러 서버 d3 시험 (인증번호 횟수 · 횟수 장치 고장 · IP · 솔라피 오류 숨김):

```
deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/딜러_시험.ts
```

- `fake_supabase_dealer.ts` · `import_map_dealer.json`
- `딜러_시험.ts` — 시험 29개 (2026-10-15 전부 통과)

체크 서버 v24 시험 (가온 고정값 정리 · 예전 자료 가져오기는 가온만):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v24_시험.ts
```

- `체크v24_시험.ts` — 시험 7개 (2026-10-15 전부 통과 · v23 으로 돌리면 4개 실패)

체크 서버 v25 시험 (직원 권한 창구 staffList · staffAdd · staffEdit):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v25_직원_시험.ts
```

- `체크v25_직원_시험.ts` — 시험 25개 (2026-10-15 전부 통과 · v24 로 돌리면 12개 실패)

체크 서버 v26 시험 (사무실 로그인 잠금 · 첫 비밀번호 문자 확인):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v26_로그인_시험.ts
```

- `체크v26_로그인_시험.ts` — 시험 18개 (2026-10-15 전부 통과 · v25 로 돌리면 13개 실패)

체크 급한 고침 v21.2 · v27 시험 (운영 v21 + 사무실 로그인 잠금 / 자기 비밀번호 초기화 막기):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크_급한고침_v27_시험.ts
```

- `체크_급한고침_v27_시험.ts` — 시험 10개 (2026-10-15 전부 통과 · v21 원본이면 5개 실패)

체크 서버 v28 시험 (v26 로그인 시험 + 첫 비밀번호 확인 tick 짝 맞추기):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v28_로그인_시험.ts
```

- `체크v28_로그인_시험.ts` — 시험 22개 (2026-10-15 전부 통과 · v27 로 돌리면 4개 실패)

사진 서명 주소 시험 (워시 sb4 shotLinks · 차량 보기 / 딜러 d4 차 상세):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/사진_서명주소_워시_시험.ts
deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/사진_서명주소_딜러_시험.ts
```

- 워시 10개 (sb3 면 8개 실패) · 딜러 4개 (d3 면 3개 실패) — 2026-10-15 전부 통과

알림톡 전환 시험 (워시 sb7 noticeAta · 확정본 변수 · 가짜 링크 막기):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/알림톡_워시_시험.ts
```

- `알림톡_워시_시험.ts` — 시험 26개 (2026-10-15 전부 통과 · 워시 sb7 · sb6 으로 돌리면 22개 실패)

알림톡 먼저 시험 (체크 v29 차량 도착·첫 비밀번호 / 딜러 d5 인증번호 / 경비실 v1.4 확인 번호):

```
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/알림톡_체크_시험.ts
deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/알림톡_딜러_시험.ts
deno run -A --no-lock --import-map=서버/시험/import_map.json 서버/시험/알림톡_경비실_시험.ts
```

- 체크 30개 (v28 이면 19개 실패) · 딜러 15개 (d4 면 11개 실패) · 경비실 17개 (v1.3 이면 13개 실패) — 2026-10-15 전부 통과
- `fake_supabase_check.ts` 에 `insert().select()` 가 번호(id)를 붙여 돌려주는 것 · gte/lte/neq 를 더함 (예전 체크 시험 그대로 통과)
- 워시 알림톡 시험은 sb7 의 키 14개(13 + check_arrive)로 맞춤

워시 sb8 시험 (알림톡 방 요청서 04 — 입금됨은 요금제 건만 · 빈 값 · 「무료」 금지어 · 접속주소는 서버가):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/알림톡_워시_sb8_시험.ts
```

- 34개 (2026-10-15 전부 통과 · sb7 이면 7개 실패). sb7 시험(`알림톡_워시_시험.ts`)은 sb7 그대로 둠

워시 sb9 결제 승인 한 번만 시험 (보안 방 결제 설계 검토 [높음] — 동시에 두 번 · 승인 오류 뒤 토스 조회 · 금액 다름):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/결제_승인_한번만_시험.ts
```

- 9개 (2026-10-15 전부 통과 · sb8 이면 5개 실패) · `fake_supabase_wash.ts` 에 `update().select()` 가 바뀐 줄을 돌려주는 것 더함

결제 빈 곳 메우기 시험 (워시 sb10 + pay-hook p1 · 딜러 d6):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/결제_웹훅_환불_자동결제_시험.ts
deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/딜러_청구서목록_시험.ts
```

- 58개 (sb9 면 실패가 나옴) · 9개 (d5 면 5개 실패) — 2026-10-15 전부 통과
- 가짜에 더함: 워시 `knobs.cash`(잔액 흉내 · 마이너스 안 됨) · 딜러 `contains`·`gt`

체크 결제는 워시 지갑으로 (워시 sb11):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/체크_결제지갑_시험.ts
```

- 21개 (2026-10-15 전부 통과 · sb10 이면 14개 실패) — 체크 대표만 · 이어 둔 지갑만 · 다른 창구 못 부름 · 워시 카드 payStart 가려짐 고침

관리 한곳에서 (워시 sb12) · 기사 임시 비밀번호 (체크 v30):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/관리_통합_시험.ts
deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v30_기사임시비번_시험.ts
```

- 46개 · 7개 (2026-10-15 전부 통과 · sb11 / v29 면 실패)

홈페이지 첫 결제 (워시 sb13):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/홈페이지_첫결제_시험.ts
```

- 51개 (2026-10-15 전부 통과 · sb12 면 실패) — 결제 대기 · 체험판 예시 칸 · 3번/AI 3번 · 바꿔치기 막기 · 결제 대기 목록 · 돌아 들어오는 길

오픈 베타 말 다듬기 (워시 sb14 · 체크 v31 · 딜러 d7 · 경비실 v1.5):

```
deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/말_다듬기_시험.ts
```

- 6개 (2026-10-15 전부 통과 · sb13 이면 실패) · 예전 시험도 새 판으로 모두 통과 (판 이름 줄 제외)
