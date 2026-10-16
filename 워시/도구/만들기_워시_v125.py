"""워시 v124 → 워시 v125 새 판. 대표님 직접 지시(동결 예외) — 폰 폭 홈 달력이 뭉개지는 것 고침
쓰는 법: 만들기_워시_v112 → … → v124 → v125 차례로 (`워시/도구/`)
바꾸는 것 (폰 폭 600px 이하만 · PC 모양 그대로 · 공통 부품 1.5 그대로):
  1) 달력 칸 금액을 짧게 «8만 · 12만 · 1.5만» (줄바꿈 없음, 넘치면 글자 작게)
  2) 칸 안 «입 1 · 출 0» 글자는 폰에서 숨기고 파랑(입고)·초록(출고) 막대만 · 칸을 정사각형 가깝게 · 메모는 주황 점
  3) 날짜를 누르면 나오는 창 위 줄을 «100,000원 · 입고 1 · 출고 1» 로
운영 v111 · v112~v124 는 덮어쓰지 않는다.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v124.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v125.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()
assert CSS in s and JS in s

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v124 · UI 3.0 · 2026-10-16";', 'var APP_VER="워시 v125 · UI 3.0 · 2026-10-16";')

# 1) 금액: 긴 글(PC) + 짧은 글(폰) 둘 다 그리고, 폭에 따라 하나만 보임
rep('''      (v?('<div class="amt">'+(v.amt?money(v.amt):"")+'</div>'+''',
    '''      (v?('<div class="amt">'+(v.amt?('<span class="af">'+money(v.amt)+'</span><span class="as">'+calShort(v.amt)+'</span>'):"")+'</div>'+''')
rep('''function renderHome(){''',
    '''/* v125 — 폰 달력 칸에 쓰는 짧은 금액: 8만 · 12만 · 1.5만 · 0.5만 · 1.2억 */
function calShort(n){
  n=Number(n)||0; if(!n)return "";
  function d1(x){var t=Math.round(x*10)/10;return (t%1===0?String(t):t.toFixed(1));}
  if(n>=100000000)return d1(n/100000000)+"억";
  if(n>=100000)return Math.round(n/10000)+"만";
  return d1(n/10000)+"만";
}
function renderHome(){''')

# 3) 날짜 창 위 줄: 금액 · 입고 · 출고
rep('''   '<div class="sub" style="color:var(--muted);font-size:13px">'+rows.length+'대 · '+won(tot)+'</div>'+''',
    '''   '<div class="sub" style="color:var(--muted);font-size:13px">'+won(tot)+' · 입고 '+rows.length+' · 출고 '+
     S.records.filter(function(r){return r.outAt&&dayKey(r.outAt)===k;}).length+'</div>'+''')

# 2) 폰 폭 CSS (워시 완성 CSS 끝에)
CAL_CSS = """
/* ── v125 폰 폭 홈 달력 (대표님 지시) — PC 는 그대로 ── */
.cal .amt .as{display:none}
@media (max-width:600px){
  .cal{gap:3px;grid-auto-rows:auto}
  .cal .d{min-height:0;aspect-ratio:1/1.08;padding:4px 3px 3px;border-radius:8px;
    display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
  .cal .n{font-size:11.5px;line-height:1.1}
  .cal .todaytag{display:none}
  .cal .amt{margin-top:auto;font-size:11px;line-height:1.1;white-space:nowrap;letter-spacing:-.04em;max-width:100%;overflow:hidden}
  .cal .amt .af{display:none}
  .cal .amt .as{display:inline}
  .cal .cars{display:none}
  .cal .bar{height:3px;margin-top:2px;align-self:stretch}
  .cal .bar + .bar{margin-top:2px}
  .cal .memo{font-size:0;line-height:0;padding:0;width:6px;height:6px;border-radius:50%;background:#E8840C;
    margin:3px auto 0;flex:none}
  .cal .memo.done{background:var(--line2,#c9d1dc);text-decoration:none}
}
@media (max-width:370px){ .cal .amt{font-size:10px} .cal .n{font-size:11px} }
"""
a = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b = s.index('</style>', a)
s = s[:b] + CAL_CSS + s[b:]

assert CSS in s and JS in s
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
