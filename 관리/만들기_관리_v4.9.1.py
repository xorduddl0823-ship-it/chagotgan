"""관리 v4.9.1 만들기 — v4.9(보안 통과)에 «알림 › 알림톡 템플릿» 위 «문자 · 알림톡 보내는 업체» 칸을 더해요 (대표님 10/21).
쓰는 법: python3 관리/만들기_관리_v4.9.1.py   (v4.9 파일은 읽기만 · 덮어쓰지 않아요)
- 재료: 관리/3_차곳간_관리_index_v4.9.html · 관리/v4재료/sendvnd.js
- 결과: 관리/3_차곳간_관리_index_v4.9.1.html
- 워시 · 체크를 따로 «솔라피 / 비즈고» 중에서 골라요. 제품마다 한 줄: 지금 값 · 바꾼 때 · 바꾼 사람 · [솔라피] [비즈고]
- 바꿀 때 확인 창: «워시 문자 업체를 비즈고로 바꿔요 · 이후 보내는 것부터 적용돼요». 서버가 거절하면 그 글을 그대로 보여 줘요.
- 서버 창구 이름은 서버 방이 알려 주면 sendvnd.js 의 SVND_API 두 이름만 채워요. 지금은 비어 있어 화면 틀만 보이고 단추는 잠겨요.
- 그 밖에는 v4.9 와 한 글자도 같아요 (서버 요청 · 돈 · 로그인).
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.9.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.9.1.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.9 · 공통 1.13.2 · 2026-10-19";', 'var ADM_VER="관리 v4.9.1 · 공통 1.13.2 · 2026-10-21";')
rep("function viewAta(){\n", open(os.path.join(HERE, "v4재료", "sendvnd.js"), encoding="utf-8").read() + "function viewAta(){\n")
rep("""    '<div id="ataBody"><div class="hint">불러오는 중이에요…</div></div>';
  if(ATA.loaded) ataDraw(); else ataLoad();""",
    """    '<div id="sendVnd"></div>'+
    '<div id="ataBody"><div class="hint">불러오는 중이에요…</div></div>';
  svndLoad();
  if(ATA.loaded) ataDraw(); else ataLoad();""")
rep("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n",
    """/* 관리 v4.9.1 — 문자 · 알림톡 보내는 업체 줄 (제품 · 지금 · 바꾼 때 · 고르기) */
.svnd-row{display:grid;grid-template-columns:80px auto 1fr auto;align-items:center;gap:8px 14px;padding:12px 0;border-top:1px solid var(--line)}
.svnd-row .pn{font-size:15px} .svnd-row .now{font-size:13px;color:var(--muted);display:inline-flex;align-items:center;gap:6px}
.svnd-row .at{font-size:12.5px;color:var(--muted);min-width:0} .svnd-row .sw{display:flex;gap:6px}
@media (max-width:600px){ .svnd-row{grid-template-columns:auto 1fr} .svnd-row .at{grid-column:1 / -1} .svnd-row .sw{grid-column:1 / -1} .svnd-row .sw .btn{flex:1} }
/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */
""")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
