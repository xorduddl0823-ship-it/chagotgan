"""관리 v4.7.1 — 시험판 v4.7 에 폰 깨짐 CSS 만 (총괄 승인 10/16 · 디자인/폰_깨짐_목록.md 관리-1 · 관리-2 · 공통-2)
쓰는 법: python3 관리/만들기_관리_v4.7.1.py   (v4.7 파일은 읽기만)
- 결과: 관리/3_차곳간_관리_index_v4.7.1.html
- 바꾸는 것: 판 표시 한 줄 + CSS 한 묶음 (JS · 서버 창구 그대로)
  · 관리-1 홈 달력 — 폰에서 칸 너비 고정 · 금액 한 줄 (넘치면 «…», 정확한 금액은 달력 아래 합계 줄)
  · 관리-2 받는 금액 › 결제 내역 폰 목록 — 날짜가 두 줄로 안 나뉘게
  · 공통-2 숫자 카드 — 관리 숫자 카드에는 작은 그래프가 없어서 이름 오른쪽 빈자리를 없애 꺾이지 않게
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.7.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.7.1.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)
rep('var ADM_VER="관리 v4.7 · 공통 1.5 · 2026-10-16";', 'var ADM_VER="관리 v4.7.1 · 공통 1.5 · 2026-10-16";')
rep("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */",
    "/* 관리 v4.7.1 — 폰 깨짐 (디자인 방 목록 관리-1 · 관리-2 · 공통-2) */\n"
    "@media (max-width:600px){.cal{grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.cal .d{min-width:0;min-height:58px;padding:4px 3px;overflow:hidden}"
    ".cal .amt{font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cal .todaytag{font-size:9.5px;white-space:nowrap}"
    ".cgg-mrow .t b span{white-space:nowrap}}\n"
    "/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */")
# 공통-2 는 공통 부품 CSS 뒤에 와야 이겨요 (맨 끝 </style> 앞)
i = s.rindex("</style>", 0, s.index("<body"))
s = s[:i] + "\n/* 관리 v4.7.1 — 공통-2: 관리 숫자 카드는 작은 그래프가 없어 이름 오른쪽 빈자리를 없애요 */\n.cgg-kpi small{padding-right:0}\n" + s[i:]
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
