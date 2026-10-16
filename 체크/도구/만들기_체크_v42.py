"""체크 v41(시험판 · 보안 통과) → 체크 v42 — 폰 폭 홈 달력 (총괄 2026-10-16 · 워시 v125 와 같은 방식). v41 은 읽기만.
- 큰 금액이 폰 칸에서 «9…» «12…» 처럼 잘리던 것 → 폰(600px 이하)에서는 짧은 금액(8만 · 12만 · 1.5만 · 1.2억) + 막대만, 날짜를 누르면 정확한 금액
- PC 는 그대로(«12,346만»)
쓰는 법: python3 체크/도구/만들기_체크_v42.py
"""
import re
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v41.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('''  function man(n){ return Math.round((Number(n)||0)/10000).toLocaleString("ko-KR")+"만"; }''',
    '''  function man(n){ return Math.round((Number(n)||0)/10000).toLocaleString("ko-KR")+"만"; }
  /* v42 — 폰 달력 칸에 쓰는 짧은 금액 (워시 v125 calShort 와 같음): 8만 · 12만 · 1.5만 · 0.5만 · 1.2억 */
  function calShort(n){
    n=Number(n)||0; if(!n) return "";
    function d1(x){ var t=Math.round(x*10)/10; return (t%1===0?String(t):t.toFixed(1)); }
    var m=Math.round(n/10000);
    if(n>=100000000 || m>=10000) return d1(n/100000000)+"억";   /* 99,995,000원부터는 「1억」 (「10,000만」이 안 나오게) */
    if(n>=100000) return m.toLocaleString("ko-KR")+"만";
    return d1(n/10000)+"만";
  }''')
rep('''      (sum?'<div class="amt">'+man(sum)+'</div>':'')+bar+leg+''',
    '''      (sum?'<div class="amt" title="'+won(sum)+'원"><span class="af">'+man(sum)+'</span><span class="as">'+calShort(sum)+'</span></div>':'')+bar+leg+''')
# v42 (디자인 폰 깨짐 점검 10-16 · 체크-1 · 체크-2): 폰 목록 두 줄 칸
rep(r'''  var t=document.createElement("template"); t.innerHTML=String(h==null?"":h); return (t.content.textContent||"").replace(/\s+/g," ").trim(); }''',
    r'''  var t=document.createElement("template"); t.innerHTML=String(h==null?"":h);
  /* v42: 두 줄 칸(.a/.b)이 한 덩어리로 붙지 않게 — 「하늘모터스 · 000-00-00001」 (빈 .b 는 그대로) */
  t.content.querySelectorAll(".b").forEach(function(b){ if(b.previousSibling && b.textContent.trim()) b.before(/^\s*\+/.test(b.textContent)?" ":" · "); });
  return (t.content.textContent||"").replace(/\s+/g," ").trim(); }''')
CAL = '''<style id="v42-cal">
/* ── v42 폰 폭 홈 달력 (워시 v125 와 같은 방식) — PC 는 그대로 ── */
.cal .d .amt .as{display:none}
@media (max-width:600px){
  .cal{gap:3px;grid-auto-rows:auto}
  .cal .d{min-height:0;aspect-ratio:1/1.08;padding:4px 2px 3px;border-radius:8px;
    display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
  .cal .d .n{font-size:11.5px;line-height:1.1;flex:none}
  .cal .d .todaytag{display:none}
  .cal .d .amt{margin-top:auto;flex:none;font-size:11px;line-height:1.3;white-space:nowrap;letter-spacing:-.05em;max-width:100%;overflow:hidden;text-overflow:clip}
  .cal .d .amt .af{display:none}
  .cal .d .amt .as{display:inline}
  .cal .d .cars{display:none}
  .cal .d .bar{height:3px;margin-top:2px;align-self:stretch;flex:none}
  .cal .d .memo{font-size:0;line-height:0;padding:0;width:6px;height:6px;border-radius:50%;background:#E8840C;margin:3px auto 0;flex:none}
  .cal .d .memo.done{background:var(--line2,#c9d1dc);text-decoration:none}
}
@media (max-width:370px){ .cal .d .amt{font-size:10px} .cal .d .n{font-size:11px} }
/* v42: 폰 목록 오른쪽 금액 두 줄 — 합계 / 공급가액 · 세액 (디자인 체크-1) */
.cgg-mrow .r b .a,.cgg-mrow .r b .b{display:block;text-align:right}
.cgg-mrow .r b .b{font-size:11.5px;font-weight:600;color:var(--muted)}
</style>'''
m = re.search(r'<style id="cgg-beta-piece">\n.*?\n</style>', s, re.S)
s = s[:m.end()] + "\n" + CAL + s[m.end():]
rep('$("hdVer").textContent="체크 v41 · "', '$("hdVer").textContent="체크 v42 · "')
open(BASE + "2_차곳간_체크_index_v42.html", "w", encoding="utf-8").write(s)
print("OK v42", len(s))
