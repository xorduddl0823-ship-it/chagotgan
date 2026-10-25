"""관리 v4.9.4 만들기 — v4.9.3(보안 통과)에서 «사업자번호 승인 요청» 번호 칸을 서버 sb31 에 맞춰요 (총괄 허락 10/25).
쓰는 법: python3 관리/만들기_관리_v4.9.4.py   (v4.9.3 파일은 읽기만 · 덮어쓰지 않아요)
- 결과: 관리/3_차곳간_관리_index_v4.9.4.html
- 왜: 서버 sb31 부터 hqBizShareList 의 사업자번호(«876-**-***09») · 요청한 사람(«****1234»)이 이미 가려져 와요.
  v4.9.3 은 숫자 10자리 이상만 가린 모양으로 만들고 나머지는 «***» 라서, sb31 과 붙이면 «***»만 보여요.
- 어떻게: 서버 값에 * 가 있고 숫자가 5개 이하면(이미 가림) 숫자 · * · - 만 남겨 그대로 보여 줘요(숫자가 더 많으면 화면에서 가려요 · 검사 일꾼). 전체 번호(sb29 · sb30)는 예전처럼 화면에서 가려요.
  승인 · 거절은 요청번호로 하니 그대로예요.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.9.3.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.9.4.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.9.3 · 공통 1.13.2 · 2026-10-25";', 'var ADM_VER="관리 v4.9.4 · 공통 1.13.2 · 2026-10-25";')
rep('''function bsBiz(v){ var d=String(v||"").replace(/[^0-9]/g,""); return d.length>=10 ? d.slice(0,3)+"-**-***"+d.slice(-2) : (d?"***":"-"); }
function bsPhone(v){ var d=String(v||"").replace(/[^0-9]/g,""); return d.length>=10 ? d.slice(0,3)+"-****-"+d.slice(-4) : (d?"***":"-"); }''',
'''/* v4.9.4 — 서버 sb31 부터 번호가 이미 가려져 와요(* 가 있음) → 숫자 · * · - 만 남겨 그대로. 전체 번호(sb29 · sb30)는 여기서 가려요 */
function bsMasked(v){ var t=String(v||""); if(t.indexOf("*")<0) return ""; var k=t.replace(/[^0-9*\\-]/g,"").slice(0,20); if(k.replace(/[^0-9]/g,"").length>5) return ""; return k||"***"; }
function bsBiz(v){ var m=bsMasked(v); if(m) return m; var d=String(v||"").replace(/[^0-9]/g,""); return d.length>=10 ? d.slice(0,3)+"-**-***"+d.slice(-2) : (d?"***":"-"); }
function bsPhone(v){ var m=bsMasked(v); if(m) return m; var d=String(v||"").replace(/[^0-9]/g,""); return d.length>=10 ? d.slice(0,3)+"-****-"+d.slice(-4) : (d?"***":"-"); }''')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
