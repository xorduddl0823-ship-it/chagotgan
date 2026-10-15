"""체크 v26 → 체크 v27 새 판. v26 은 읽기만 한다. (서버 check-api v26 짝 — 서버/설계/07_체크_사무실로그인_보안.md)
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v26.py && python3 체크/도구/만들기_체크_v27.py
바꾸는 것 (로그인 화면 — 규칙 4-1: 로그인 · 오류 안내는 표준형 ~습니다):
  - 로그인 응답에 __need:"code" 가 오면 「확인 번호 6자리」 칸을 열고 loginCode(휴대폰, 번호, 검사소코드, UA) 부르기
  - 처음 비밀번호 안내 「6자 이상」 · 문자 확인 안내
  - 5번 틀려 10분 잠김 · 확인 시간 지남 안내는 빨간 오류가 아닌 안내 모양으로
  - 직원 권한 칸 안내: 새 직원은 처음 로그인할 때 휴대폰 문자로 확인
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v26.html"
OUT = BASE + "2_차곳간_체크_index_v27.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 로그인 화면 — 확인 번호 칸 · 안내
rep('''        '<input type="password" id="lg-pw" placeholder="비밀번호" autocomplete="current-password"></div>'+
      '<button class="go" id="lg-go">로그인</button>'+''',
    '''        '<input type="password" id="lg-pw" placeholder="비밀번호" autocomplete="current-password"></div>'+
      '<div class="fld" id="lg-codebox" hidden><label class="f" for="lg-code">확인 번호 6자리</label>'+
        '<input type="text" id="lg-code" inputmode="numeric" maxlength="6" placeholder="문자로 받은 6자리" autocomplete="one-time-code"></div>'+
      '<button class="go" id="lg-go">로그인</button>'+''')
rep('''      '<p class="note">처음 들어오시는 분은 지금 적으신 비밀번호가 그대로 정해집니다.<br>'+''',
    '''      '<p class="note">처음 들어오시는 분은 6자 이상 비밀번호를 적고 로그인을 누르세요.<br>'+
        '휴대폰으로 확인 번호 6자리를 보내 드리며, 확인 번호를 넣으면 그 비밀번호로 정해집니다.<br>'+''')

# 로그인 흐름
rep('''    if(w.length<4){ say("lg-msg","비밀번호를 4자 이상 적어 주세요.","err"); return; }
    say("lg-msg","로그인 중…","info"); busy(true); $("lg-go").disabled=true;
    fetch(API,{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ fn:"login", args:[p, w, "", navigator.userAgent] }) })
      .then(readJson)
      .then(function(j){
        if(j.__err) throw new Error(j.__err);''',
    '''    if(w.length<4){ say("lg-msg","비밀번호를 4자 이상 적어 주세요.","err"); return; }
    /* v27: 처음 비밀번호는 문자 확인 뒤에 (서버 v26) — 확인 번호 칸이 열려 있으면 loginCode */
    var needCode=!$("lg-codebox").hidden, cd=String($("lg-code").value||"").replace(/[^0-9]/g,"");
    if(needCode && cd.length!==6){ say("lg-msg","문자로 받은 확인 번호 6자리를 입력해 주세요.","err"); $("lg-code").focus(); return; }
    say("lg-msg",needCode?"확인 중…":"로그인 중…","info"); busy(true); $("lg-go").disabled=true;
    fetch(API,{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(needCode ? { fn:"loginCode", args:[p, cd, "", navigator.userAgent] }
                                    : { fn:"login", args:[p, w, "", navigator.userAgent] }) })
      .then(readJson)
      .then(function(j){
        if(j.__err){ var er=new Error(j.__err); er.need=j.__need; throw er; }''')
rep('''      .catch(function(e){ say("lg-msg", e.message||"로그인하지 못했습니다.","err"); })''',
    '''      .catch(function(e){
        var m=(e&&e.message)||"로그인하지 못했습니다.";
        if(e && e.need==="code"){
          $("lg-codebox").hidden=false; $("lg-code").value=""; $("lg-code").focus();
          $("lg-go").textContent="확인하고 로그인"; say("lg-msg", m, "info"); return;
        }
        if(/확인 시간이 지났습니다/.test(m)){ $("lg-codebox").hidden=true; $("lg-go").textContent="로그인"; }
        say("lg-msg", m, /잠겼습니다|확인 시간이 지났습니다/.test(m) ? "info" : "err");
      })''')
rep('''  $("lg-go").onclick=go;''',
    '''  $("lg-go").onclick=go;
  /* 번호나 비밀번호를 바꾸면 확인 번호 칸은 닫고 처음부터 */
  [ph,pw].forEach(function(e){ e.addEventListener("input",function(){
    if(!$("lg-codebox").hidden){ $("lg-codebox").hidden=true; $("lg-go").textContent="로그인"; say("lg-msg",""); } }); });
  $("lg-code").onkeydown=function(ev){ if(ev.key==="Enter") go(); };''')

# 직원 권한 칸 안내
rep('''"새 직원은 체크에 처음 로그인할 때 비밀번호를 정해요. 넣은 뒤 바로 알려 주세요."''',
    '''"새 직원은 체크에 처음 로그인할 때 6자 이상 비밀번호를 정하고, 휴대폰 문자로 확인해요. 넣은 뒤 바로 알려 주세요."''')
rep('''sub:"그 번호로 체크에 처음 로그인할 때 비밀번호를 정해요."''',
    '''sub:"그 번호로 체크에 처음 로그인할 때 비밀번호를 정하고, 문자로 확인해요."''')

rep('''  $("hdVer").textContent="체크 v26 · "''', '''  $("hdVer").textContent="체크 v27 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
