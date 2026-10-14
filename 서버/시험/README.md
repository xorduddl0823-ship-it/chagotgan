# 서버 시험

가짜 수파베이스(메모리 표)로 경비실(cgg-api)과 체크 서버(check-api)의 로그인·권한을 시험합니다.
실제 수파베이스에는 붙지 않습니다.

```
deno run -A --no-lock --import-map=서버/시험/import_map.json 서버/시험/경비실_시험.ts
```

- `fake_supabase.ts` — 가짜 수파베이스 (두 서버가 쓰는 만큼만 흉내)
- `import_map.json` — 서버 코드의 수파베이스 불러오기를 가짜로 바꿔 끼움
- `경비실_시험.ts` — 시험 41개 (2026-10-14 전부 통과)
