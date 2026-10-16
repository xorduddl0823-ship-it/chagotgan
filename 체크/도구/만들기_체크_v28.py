"""체크 v27 → 체크 v28 새 판. v27 은 읽기만 한다. (서버 check-api v28 짝 — 서버/설계/07 「v28 갱신」)
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v27.py && python3 체크/도구/만들기_체크_v28.py
바꾸는 것: login 이 확인 번호를 보낼 때 준 __tick 을 기억했다가 loginCode(휴대폰, 번호, tick, 검사소코드, UA) 로 보냄
  (남이 중간에 login 을 다시 해서 비밀번호를 바꿔치기하는 길을 막는 서버 장치와 짝)
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v27.html"
OUT = BASE + "2_차곳간_체크_index_v28.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('''      body: JSON.stringify(needCode ? { fn:"loginCode", args:[p, cd, "", navigator.userAgent] }''',
    '''      body: JSON.stringify(needCode ? { fn:"loginCode", args:[p, cd, LG_TICK, "", navigator.userAgent] }''')
rep('''        if(j.__err){ var er=new Error(j.__err); er.need=j.__need; throw er; }''',
    '''        if(j.__err){ var er=new Error(j.__err); er.need=j.__need; er.tick=j.__tick; throw er; }''')
rep('''          $("lg-codebox").hidden=false; $("lg-code").value=""; $("lg-code").focus();''',
    '''          LG_TICK=String(e.tick||"");   /* v28: 이 화면과 짝인 표 — 확인 번호와 함께 돌려보냄 */
          $("lg-codebox").hidden=false; $("lg-code").value=""; $("lg-code").focus();''')
rep('''    if(!$("lg-codebox").hidden){ $("lg-codebox").hidden=true; $("lg-go").textContent="로그인"; say("lg-msg",""); } }); });''',
    '''    if(!$("lg-codebox").hidden){ $("lg-codebox").hidden=true; $("lg-go").textContent="로그인"; LG_TICK=""; say("lg-msg",""); } }); });''')
rep('''function drawLogin(){''', '''var LG_TICK="";   /* v28: 처음 비밀번호 확인 짝 (login 응답 __tick) */
function drawLogin(){''')
rep('''  $("hdVer").textContent="체크 v27 · "''', '''  $("hdVer").textContent="체크 v28 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
