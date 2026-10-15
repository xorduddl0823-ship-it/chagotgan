"""워시 v122 → 워시 v123 새 판. 오픈 베타 시험 마무리 (총괄 요청 `운영/요청서/2026-10-15_07_오픈베타_시험_마무리.md`)
쓰는 법: 만들기_워시_v112 → … → v122 → v123 차례로 (`워시/도구/`)
바꾸는 것:
  1) «오픈 베타» 띠 — 로그인 화면 · 본문 맨 위 (홈페이지 시안 «넣은 안» 문구 · 남색 얇은 띠). 공통 부품은 그대로(1.5 동결)
  2) 말 — 화면 안내 «~습니다/~ㅂ니다» → 해요체 (낱말별 표 `도구/해요체_표.py`). 가입 · 로그인 · 오류 안내와
     손님에게 나가는 글(알림톡 · 문자 · 주문 문자 · 인쇄 청구서)은 그대로(표준형). «돈» → «금액»(자료 값은 그대로)
  3) 로그아웃 때 이 기기에 남는 결제 자료도 지움(ccw_pay · ccw_bill · cgg_buy)
운영 v111 · v112~v122 는 덮어쓰지 않는다. 서버 주소 · 창구 · 저장 방식 · 손님에게 나가는 알림 글은 그대로.
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
sys.path.insert(0, HERE)
from 해요체_표 import T as HAEYO, KEEP as HKEEP
SRC = os.path.join(BASE, "1_차곳간_워시_index_v122.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v123.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
assert 'version:"cgg-j4 1.5"' in JS
s = open(SRC, encoding="utf-8").read()
assert CSS in s and JS in s, "v122 의 공통 부품이 지금 1.5 와 다름"

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v122 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v123 · UI 3.0 · 2026-10-15";')

# ───── 1) 오픈 베타 띠 ─────
BETA = ('<div class="cgg-beta" role="note"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. '
        '쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div>')
rep('<main class="cgg-main">\n<div id="cggTrialBand"></div>', '<main class="cgg-main">\n' + BETA + '\n<div id="cggTrialBand"></div>')
rep('<div class="auth" id="authView" hidden>', '<div class="auth" id="authView" hidden>\n' + BETA)
BETA_CSS = """
/* ── v123 오픈 베타 띠 (홈페이지 시안 «넣은 안» 값) ── */
.cgg-beta{--beta:#0d2440;--beta-ink:#e8f0fb;background:var(--beta);color:var(--beta-ink);font-size:13.5px;line-height:1.5;
  display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;
  padding:8px 14px;border-radius:12px;max-width:1400px;margin:0 auto 14px;word-break:keep-all}
.cgg-beta b{background:var(--beta-ink);color:var(--beta);border-radius:6px;padding:0 7px;font-size:12px;letter-spacing:.04em}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) .cgg-beta{--beta:#1d3a5f} }
:root[data-theme="dark"] .cgg-beta{--beta:#1d3a5f}
.auth > .cgg-beta{margin:0 0 14px}
@media (max-width:600px){ .cgg-beta{font-size:12.5px;padding:7px 10px;border-radius:10px;margin-bottom:10px} }
"""
a = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b = s.index('</style>', a)
s = s[:b] + BETA_CSS + s[b:]

# ───── 3) 로그아웃 — 결제 자료도 지움 ─────
rep('''    ["ccw_sid","ccw_shop","ccw_key","ccw_user","ccw_me",
     "ccw_money","ccw_mnmatch","ccw_mnseen","ccw_mnpoll"].forEach(function(k){''',
    '''    ["ccw_sid","ccw_shop","ccw_key","ccw_user","ccw_me",
     "ccw_money","ccw_mnmatch","ccw_mnseen","ccw_mnpoll",
     "ccw_pay","ccw_bill","cgg_buy"].forEach(function(k){   /* v123: 결제 중 주문 · 자동 결제 동의 · 홈페이지 요금제도 */''')

# ───── 2) 말 — «돈» → «금액» (화면 글만 · 자료 값 «관계없는 돈» 은 그대로) ─────
DON = [
 ("통장에 들어오고 나간 돈을 한 표로 봅니다.", "통장에 들어오고 나간 금액을 한 표로 봅니다.", 2),
 ("잠깐만요 — 돈이 걸린 자료입니다", "잠깐만요 — 금액이 걸린 자료입니다", 1),
 ("청구서를 보낸 뒤 아직 안 들어온 돈입니다.", "청구서를 보낸 뒤 아직 안 들어온 금액입니다.", 1),
 ("<span>지금까지 받은 돈</span>", "<span>지금까지 받은 금액</span>", 1),
 ('empty:"이 기간에 들어오고 나간 돈이 없습니다."', 'empty:"이 기간에 들어오고 나간 금액이 없습니다."', 1),
 ("이 돈이 어느 곳 청구서인지", "이 금액이 어느 곳 청구서인지", 1),
 ('id="mbSkip">청구서와 관계없는 돈</button>', 'id="mbSkip">청구서와 관계없는 입금</button>', 1),
 ('toast("청구서와 관계없는 돈으로 표시했습니다");', 'toast("청구서와 관계없는 입금으로 표시했습니다");', 1),
 ("돈이 들어오는 대로", "금액이 들어오는 대로", 2),
 ("이라 돈이 나가는 기능은", "이라 금액이 나가는 기능은", 1),
 ('"일부를 돌려줬어요","받은 돈 일부를', '"일부를 돌려줬어요","받은 금액 일부를', 1),
 ('["들어온 돈", won(paid)', '["들어온 금액", won(paid)', 1),
 ("출고는 돈이 걸린 일입니다.", "출고는 금액이 걸린 일입니다.", 1),
 ("— 돈 받은 차를 한 번에", "— 입금된 차를 한 번에", 1),
 ("청구서와 관계없는 돈(이자, 내 돈 넣기 등)은 <b>[청구서와 관계없는 돈]</b>", "청구서와 관계없는 입금(이자, 직접 넣은 금액 등)은 <b>[청구서와 관계없는 입금]</b>", 1),
 ("들어온 돈 · 나간 돈 · 확인이 필요한 입금 · 아직 못 받은 돈(미수)", "들어온 금액 · 나간 금액 · 확인이 필요한 입금 · 아직 못 받은 금액(미수)", 1),
 ("</b>입니다. 돈을 옮기거나 보내는", "</b>입니다. 금액을 옮기거나 보내는", 1),
 ("<tr><td>돈이 걸린 기록 지우기", "<tr><td>금액이 걸린 기록 지우기", 1),
 ('"돈(청구서·입출금·세금계', '"금액(청구서·입출금·세금계', 1),
 ("보낼 때 쓰는 돈입니다.", "보낼 때 쓰는 캐시입니다.", 1),
 ('"PC — 장부와 돈"', '"PC — 장부와 금액"', 1),
 ('money:"통장에 들어오고 나간 돈"', 'money:"통장에 들어오고 나간 금액"', 1),
 ('cash:"문자·계산서에 쓰는 돈, 남은 금액 보기"', 'cash:"문자·계산서에 쓰는 캐시, 남은 금액 보기"', 1),
 ("(실제로 받는 돈)", "(실제로 받는 금액)", 1),
 ("<br><br>돈이 빠졌는데 이 창이", "<br><br>결제 금액이 빠져나갔는데 이 창이", 1),
]
for o, n, c in DON:
    rep(o, n, c)

# 토씨 · J 말 (원래 있던 틀린 말)
s = s.replace("딜러 목록를", "딜러 목록을").replace("[엑셀로 받기]", "[엑셀 다운로드]").replace("[엑셀로 받기(요약)]", "[엑셀 다운로드(요약)]")

# ───── 2) 말 — 해요체 ─────
# 그대로 둘 줄 (가입 · 로그인 · 오류 안내 · 손님에게 나가는 글 · 인쇄물 · 약관)
SKIP = re.compile(r"toast\([^;]*,\s*true\)|throw |Error\(|__err|banner\(|errMsg|message|로그인|가입|비밀번호|인증번호|"
                  r"danger|C0392B|7A2018|#\{|\[차곳간\]|DEF_|\{딜러\}|\{업체\}|\{차량번호\}|document\.write|이용약관|개인정보|"
                  r"실패|오류|못 |reject\(|sms|Sms|SMS|msg=|Msg=|text:|encodeURIComponent|주문 부탁|<title>|약관")
EXPL = [  # 앞 글자가 태그 · 띄어쓰기인 «입니다»
 ("<b>받을 금액 전부</b>입니다.", "<b>받을 금액 전부</b>예요."),
 ("<b>공급가액</b>입니다.", "<b>공급가액</b>이에요."),
 ("<b>화면 배치</b> 입니다.", "<b>화면 배치</b>예요."),
 ("<b>보기만 하는 연결</b>입니다.", "<b>보기만 하는 연결</b>이에요."),
 ("<b>세 가지</b>입니다", "<b>세 가지</b>예요"),
 ("<b>7일</b>입니다.", "<b>7일</b>이에요."),
 ("세금계산서</b>입니다.", "세금계산서</b>예요."),
 ("가장 먼저 끝나는 날은 <b>'+esc2(firstExp)+'</b> 입니다.", "가장 먼저 끝나는 날: <b>'+esc2(firstExp)+'</b>"),
]
TOK = re.compile(r"[가-힣]+니다")
def haeyo_seg(t):
    for o, n in EXPL:
        t = t.replace(o, n)
    return TOK.sub(lambda m: m.group(0) if m.group(0) in HKEEP else HAEYO.get(m.group(0), m.group(0)), t)
changed = 0
def haeyo(text):
    global changed
    out = []
    for line in text.split("\n"):
        parts = re.split(r"(;)", line)
        nl = []
        for p in parts:
            if p == ";" or not TOK.search(p) or SKIP.search(p):
                nl.append(p); continue
            q = haeyo_seg(p)
            if q != p: changed += 1
            nl.append(q)
        out.append("".join(nl))
    return "\n".join(out)
# 공통 부품 · 약관 덩어리는 건드리지 않음
a = s.index('<style id="cgg-j4">'); b = s.index('</style>', a) + 8
c = s.index('/* 차곳간 공통 부품 cgg-j4 1.5 (디자인/공통/cgg-j4.js'); d = s.index('\n</script>', c)
out, pos = [], 0
for x, y in sorted([(a, b), (c, d)]):
    out.append(haeyo(s[pos:x])); out.append(s[x:y]); pos = y
out.append(haeyo(s[pos:])); s = "".join(out)
assert CSS in s and JS in s
left = [m for m in set(TOK.findall(s))]
print("해요체로 바꾼 조각:", changed, "· 남은 «~니다» 종류:", len(left))

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
