# 운영 app.cgg.co.kr — 딜러 «보기» 페이지 v.html 올리는 자리와 머리글 (시험 뒤 · 워시 방 요청)

> 홈페이지·앱 방 · 2026-10-16 · 올리기는 대표님만. 이 문서는 «어디에 · 무엇을» 만 정해요.

## ① 넣는 자리
- 운영 워시를 올릴 때 쓰는 **그 폴더(index.html 이 있는 맨 위)** 에 `워시/올리기용/v.html` 을 **같은 이름 `v.html`** 로 넣어요 → 주소 `https://app.cgg.co.kr/v.html`
- 다른 폴더(예: `v/`)에 넣지 않아요. 이름도 바꾸지 않아요.
- 참고: Cloudflare 정적 파일은 `/v.html` 을 `/v` 로 돌려보낼(redirect) 수 있어요. 뒤에 붙은 `?…` 는 그대로 따라가요. 그래서 아래 머리글은 **두 주소 모두**에 걸어요.
- 워시 방 확인(10/16): 보기 코드는 `?c=…` 로 받고, 알림톡 버튼도 `app.cgg.co.kr/v.html?c=…` 예요. 돌려보내져도 `?c=` 가 따라가서 그대로 열려요. v.html 안에도 CSP · no-referrer · noindex · no-store 가 들어 있어요(1daa6c9, 보안 통과) — `_headers` 와 겹쳐도 괜찮아요.

## ② 머리글 — 같은 폴더 맨 위의 `_headers` 파일
- 폴더에 `_headers` 파일이 **없으면** 아래 내용으로 새로 만들어요. **있으면** 맨 끝에 아래 블록만 덧붙여요(앞 내용은 그대로).
- 글자는 그대로 복사해요. 줄 앞의 빈칸 2개도 그대로예요.

```
/v.html
  Cache-Control: no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
/v
  Cache-Control: no-store
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
```
- 워시 방이 요청한 3줄(no-store · no-referrer · noindex)에, 보안상 흔히 함께 거는 2줄(nosniff · 다른 사이트 안에 끼워 넣기 막기 DENY)을 더했어요. 2줄은 **보안 방이 빼라고 하면 빼요**.
- 이 방식은 Cloudflare Pages(폴더 올리기)와 Workers 정적 파일 둘 다 `_headers` 를 읽어요. 실제로 붙었는지는 올린 뒤 PC 크롬 F12 › Network › 첫 줄 › Response Headers 에서 봐요(시험 날 한 장 ②-4 와 같은 방법).

## 올린 뒤 확인 (대표님 · 2분)
1. 워시 보기 코드가 있는 알림톡 링크(또는 워시 방이 준 시험 링크)를 열어 차 정보가 보이면 됨
2. (PC가 있으면) 위 방법으로 `Cache-Control: no-store` · `X-Robots-Tag: noindex` 가 보이면 됨
