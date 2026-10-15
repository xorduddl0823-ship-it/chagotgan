"""체크 v36(보안 통과) → 체크 v37 — 대표님 시험판. 공통 부품 cgg-j4 1.5(동결)로 바꿔 끼움.
쓰는 법: python3 체크/도구/만들기_체크_v37.py   (v36 을 읽기만)
바꾸는 것:
  1) 공통 부품 1.4 → 1.5 (디자인/공통 글자 그대로)
  2) 표 위 일괄 버튼 — 1.5 «bulk» 자리와 같게: 거르기 줄 오른쪽(검색 앞) · 작은 흰 버튼(cgg-btn sm) · 파랑 없음
     «선택항목 · 고른 · 선택한» 버튼은 고른 줄이 없으면 꺼지고, 고르면 (N) — 개수는 글자 대신 CSS 로 붙여서
     글자로 연결된 버튼(#main .btn 글자 비교)도 그대로 움직임
  3) 할 일 칸 기본 너비 150 (1.5) — 계산서 표에만 따로 주던 너비는 뺌
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v36.html"
OUT = BASE + "2_차곳간_체크_index_v37.html"
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

m = re.search(r'<style id="cgg-j4-common">\n.*?\n</style>', s, re.S)
s = s[:m.start()] + '<style id="cgg-j4-common">\n' + CSS + '\n</style>' + s[m.end():]
m = re.search(r'<script>\n/\* ═+\n   차곳간 공통 부품 · J안 4판 · cgg-j4 .*?\nvar CGG = \(function\(\)\{.*?\n\}\)\(\);\n\n?</script>', s, re.S)
if not m: raise SystemExit("공통 부품 JS 덩어리를 못 찾음")
s = s[:m.start()] + "<script>\n" + JS + "\n</script>" + s[m.end():]
if 'version:"cgg-j4 1.5"' not in s: raise SystemExit("1.5 가 안 들어감")

# 할 일 칸 150
rep('''var TB_WID={name:180,id:130,text:0,date:96,money:130,state:104,time:84,act:120};''',
    '''var TB_WID={name:180,id:130,text:0,date:96,money:130,state:104,time:84,act:150};   /* v37: 할 일 150 (1.5) */''')
rep('''    ], TAXES, {pick:true, actWidth:150,''', '''    ], TAXES, {pick:true,''')

# 일괄 버튼 — 검색 앞 오른쪽, cgg-btn sm, 고른 줄 개수
rep('''  h+='<div class="cgg-filters">'+(opt.filters||"")+(opt.tools||"").replace(/class="btn( |")/g,'class="cgg-btn btn$1')+'<span class="sp"></span>'+''',
    '''  /* v37: 일괄 버튼 = 1.5 bulk 자리 (거르기 줄 오른쪽 · 검색 앞 · 작은 흰 버튼). 글자는 그대로 두고 (N)은 CSS 로 */
  var nSel=Object.keys(s.sel).filter(function(k){ return s.sel[k]; }).length;
  var bulk=(opt.tools||"").replace(/<button class="btn( primary| danger)?"/g, function(_,k){ return '<button type="button" class="cgg-btn sm btn'+(k===" danger"?" danger":"")+'"'; })
    .replace(/(<button type="button" class="cgg-btn sm btn[^"]*")([^>]*>)(\\s*(?:선택항목|선택한|고른)[^<]*<\\/button>)/g, function(_,a,b2,c2){
      return a+' data-needsel="1"'+(nSel?' data-n="'+nSel+'"':' disabled')+b2+c2; });
  h+='<div class="cgg-filters">'+(opt.filters||"")+'<span class="sp"></span>'+bulk+''')
rep('''    inBox("[data-all]").forEach(function(a){ a.checked=on; });''',
    '''    inBox("[data-all]").forEach(function(a){ a.checked=on; });
    var n=Object.keys(s.sel).filter(function(k){ return s.sel[k]; }).length;   /* v37: 일괄 버튼 켜기 · (N) */
    inBox("[data-needsel]").forEach(function(b){ b.disabled=!n; if(n) b.setAttribute("data-n", n); else b.removeAttribute("data-n"); });''')
rep('''.cgg-filters button.cgg-btn.btn{height:32px;min-height:0;padding:0 12px;font-size:13px;font-weight:700;border-radius:9px;border:1px solid var(--ln2);background:var(--surface);color:var(--btn-ink)}
.cgg-filters button.cgg-btn.btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}
.cgg-filters button.cgg-btn.btn.danger{color:var(--stop)}''',
    '''/* v37: 일괄 버튼은 공통 cgg-btn sm 그대로 — 예전 button.btn 모양이 새지 않게 되돌림 */
.cgg-filters button.cgg-btn.sm.btn{min-height:auto;transform:none;border:1px solid var(--ln2);background:var(--surface);color:var(--btn-ink);font-weight:700}
.cgg-filters button.cgg-btn.sm.btn.danger{color:var(--stop)}
.cgg-filters button.cgg-btn.sm.btn[disabled]{opacity:.45;cursor:default}
.cgg-filters button[data-n]::after{content:" (" attr(data-n) ")"}''')
rep(".tblk .cgg-pager select,.tblk .cgg-mhead select{width:auto;min-height:0}", ".tblk .cgg-pager select,.tblk .cgg-mhead select{width:auto;min-height:auto}")
rep('''  $("hdVer").textContent="체크 v36 · "''', '''  $("hdVer").textContent="체크 v37 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
