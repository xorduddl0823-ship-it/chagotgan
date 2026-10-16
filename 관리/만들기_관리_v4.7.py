"""관리 v4.7 초안 — 대표님 시험(휴대폰)에서 쓰기 편하게. **교체는 총괄 승인 뒤** (지금 시험판은 v4.6 동결)
쓰는 법: python3 관리/만들기_관리_v4.7.py   (v4.6 파일은 읽기만)
- 재료: 관리/3_차곳간_관리_index_v4.6.html (보안 통과 · 동결판)
- 결과: 관리/3_차곳간_관리_index_v4.7.html
- 바꾸는 것 (화면 모양 · 글자만, 서버 창구 그대로)
  ① 알림톡 템플릿 표 — 폰(600 이하)에서는 줄마다 카드: 이름 · 검수 칩 / 언제 / 코드 칸(가로 전체) / 보내는 방법.
     지금은 표가 993px 라 360 폰에서 코드 칸을 쓰려면 옆으로 두 화면을 밀어야 해요.
  ② 재심사 5개 통과(10/16, 알림톡/08) — 기간종료예정 · 이용제한시작 · 로그인제한예정 · 자료보관기한 · 잔액안내 검수 «통과»
     (서버가 아직 알림톡으로 안 보내서 보내는 방법은 «문자로 보냄 · 서버 준비 중» 그대로 — 맞는 표시)
  ③ 거르기 알약 — 안의 고르기 상자가 알약 전체를 덮게 (폰에서 알약 가장자리를 눌러도 열려요)
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.6.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.7.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.6 · 공통 1.5 · 2026-10-15";', 'var ADM_VER="관리 v4.7 · 공통 1.5 · 2026-10-16";')
# ② 재심사 5개 통과
for key in ["expire_soon","use_limit","login_block","data_keep","balance"]:
    a = s.index('  ["%s",' % key); b = s.index("]", a)
    row = s[a:b]
    if '"재검수"' not in row: raise SystemExit("재검수 없음: " + key)
    s = s[:a] + row.replace('"재검수"', '"통과"') + s[b:]
rep("«확인 필요» 템플릿은 카카오 재검수 중이고, ", "")
# ① 폰 카드 · ③ 알약 — 공통 부품 앞 관리 몫 CSS
rep("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */",
    "/* 관리 v4.7 — 폰에서 알림톡 템플릿 표를 줄마다 카드로 (코드 칸을 옆으로 밀지 않게) */\n"
    "@media (max-width:600px){\n"
    "  #ataBody .tablebox{overflow:visible}\n"
    "  #ataBody .tablebox table{min-width:0!important;width:100%;table-layout:auto}\n"
    "  #ataBody .tablebox thead{display:none}\n"
    "  #ataBody .tablebox tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;padding:12px 2px;border-bottom:1px solid var(--line)}\n"
    "  #ataBody .tablebox td{display:block;padding:0;border:0;height:auto;white-space:normal;position:static;background:transparent;text-align:left;box-shadow:none;border-right:0}\n"
    "  #ataBody .tablebox td:nth-child(1){grid-column:1;grid-row:1;font-weight:800}\n"
    "  #ataBody .tablebox td:nth-child(3){grid-column:2;grid-row:1;justify-self:end}\n"
    "  #ataBody .tablebox td:nth-child(2){grid-column:1 / -1;grid-row:2;font-size:12.5px;color:var(--muted)}\n"
    "  #ataBody .tablebox td:nth-child(4){grid-column:1 / -1;grid-row:3}\n"
    "  #ataBody .tablebox td:nth-child(4) input{width:100%;max-width:none;height:42px;font-size:15px}\n"
    "  #ataBody .tablebox td:nth-child(5){grid-column:1 / -1;grid-row:4}\n"
    "  #ataPf{width:100%;max-width:none!important;height:42px!important}\n"
    "}\n"
    "/* 거르기 알약 — 고르기 상자가 알약 전체를 덮어서 어디를 눌러도 열려요 */\n"
    ".cgg-fp.jfp{display:inline-flex;align-items:stretch;overflow:hidden}\n"
    ".cgg-fp.jfp select{margin:0 -13px;padding:0 13px;height:auto;align-self:stretch}\n"
    "@media (max-width:600px){ .cgg-fp.jfp select{margin:0 -10px;padding:0 10px} }\n"
    "/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
