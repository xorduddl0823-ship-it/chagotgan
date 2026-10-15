"""기사 폰 화면 v24 → v25 새 판. v24 (보안 검사 통과본)는 읽기만 한다.
서버 check-api v30 짝 (기사 임시 비밀번호 — 서버/2_차곳간체크_서버_check-api_v30.ts):
  - 로그인 답에 mustChange:true  → 화면을 열지 않고 바로 「비밀번호 새로 정하기」 창 (지금 비밀번호 칸은 방금 넣은 것으로 채움)
  - 다른 기사 기능이 { __err, __need:"pwchange" } 로 막히면 (예: 폰을 다시 켰을 때) → 같은 창 (지금 비밀번호는 직접 넣음)
  - 이 창은 «닫기» 대신 «로그아웃» — 바꾸기 전에는 다른 기능을 쓸 수 없어서
  - 바꾸기는 예전 그대로 api_changePw(deliv_changePw) · 새 열쇠를 받아 저장하고 화면을 엶
쓰는 법: python3 체크/도구/만들기_기사화면_v25.py
"""
BASE = "/home/user/chagotgan/체크/driver/"
SRC = BASE + "index_v24.html"
OUT = BASE + "index_v25.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1) 서버가 «비밀번호부터 바꾸세요»(__need:"pwchange")로 막으면 그 표시를 오류에 달고, 바꾸기 창을 엶
rep('''    if(j.__err) throw new Error(j.__err);
    if(j.result===undefined){''',
    '''    if(j.__need==='pwchange'){   /* v25: 임시 비밀번호 — 바꾸기 전에는 다른 기능이 막힘 (서버 v30) */
      var pe=new Error(j.__err||'임시 비밀번호입니다. 비밀번호를 먼저 바꿔 주세요.'); pe.need='pwchange';
      setTimeout(function(){ askNewPw(''); }, 0);
      throw pe;
    }
    if(j.__err) throw new Error(j.__err);
    if(j.result===undefined){''')

# 2) 로그인 답에 mustChange → 화면을 열지 않고 바로 바꾸기 창
rep('''function loggedIn(r, keep){
  me={pin:r.token, name:r.name}; saveMe(keep);''',
    '''function loggedIn(r, keep, pw){
  me={pin:r.token, name:r.name}; saveMe(keep);
  if(r.mustChange){   /* v25: 사무실에서 받은 임시 비밀번호로 들어옴 → 내 비밀번호부터 정함 */
    $('lg-pw').value=''; $('lg-msg').textContent=''; askNewPw(pw||''); return;
  }''')
rep('''loggedIn(r, $('lg-keep').checked); })''', '''loggedIn(r, $('lg-keep').checked, pw); })''')

# 3) 비밀번호 바꾸기 창 — 보통(닫기) · 꼭 바꿔야 할 때(로그아웃) 두 모양
rep('''$('chpw').onclick=function(e){
  e.preventDefault();
  modal('<h3>비밀번호 바꾸기</h3>'+
    '<div class="lab">지금 비밀번호</div><input class="in" id="cp-old" type="password">'+''',
    '''$('chpw').onclick=function(e){ e.preventDefault(); pwBox(false, ''); };
var PW_ASKING=false;
function askNewPw(old){
  if(PW_ASKING) return;
  if(!me.pin){ show('login'); lgSay('임시 비밀번호입니다. 로그인한 뒤 비밀번호를 새로 정해 주세요.'); return; }
  PW_ASKING=true; pwBox(true, old);
}
function pwBox(must, old){
  modal('<h3>'+(must?'비밀번호를 새로 정해 주세요':'비밀번호 바꾸기')+'</h3>'+
    (must?'<div class="hint" style="margin-bottom:10px">지금 쓰신 것은 사무실에서 받은 <b>임시 비밀번호</b>입니다. 내 비밀번호로 바꾸면 바로 쓸 수 있습니다.</div>':'')+
    '<div class="lab"'+(must&&old?' style="display:none"':'')+'>'+(must?'임시 비밀번호':'지금 비밀번호')+'</div><input class="in" id="cp-old" type="password"'+(must&&old?' style="display:none"':'')+'>'+''')
rep('''    '<button class="big b-main" id="cp-go">바꾸기</button><div style="height:8px"></div><button class="big b-sub" id="cp-no">닫기</button>');
  $('cp-no').onclick=closeModal;''',
    '''    '<button class="big b-main" id="cp-go">바꾸기</button><div style="height:8px"></div><button class="big b-sub" id="cp-no">'+(must?'로그아웃':'닫기')+'</button>');
  if(old) $('cp-old').value=old;
  $('cp-no').onclick=must ? function(){
      var nm=me.name; PW_ASKING=false; closeModal(); forget(); $('lg-name').value=nm||''; $('lg-pw').value=''; lgTab(1); show('login');
      $('lg-msg').textContent='로그아웃했습니다. 비밀번호를 바꾸려면 다시 로그인해 주세요.'; }
    : closeModal;''')
rep('''      var keep=!!ls(LS); me={pin:r.token, name:r.name}; saveMe(keep);
      modal('<h3>✅ 바꿨습니다</h3><button class="big b-main" id="cp-ok">확인</button>'); $('cp-ok').onclick=closeModal;''',
    '''      var keep=!!ls(LS); me={pin:r.token, name:r.name}; saveMe(keep);
      modal('<h3>바꿨습니다</h3><button class="big b-main" id="cp-ok">확인</button>');
      $('cp-ok').onclick=function(){ closeModal(); if(must){ PW_ASKING=false; B=null; start(); } };   /* v25: 꼭 바꿔야 했으면 이제 화면을 엶 */''')

# 4) 화면을 열 때(api_boot) 막히면: 로그인을 지우지 말고 바꾸기 창만 (예전에는 «비밀번호» 글자를 보고 로그아웃시켰음)
rep('''  }).catch(function(e){
    if(/로그인|비밀번호|계정/.test(e.message)){ var nm=me.name; forget(); $('lg-name').value=nm||''; }''',
    '''  }).catch(function(e){
    if(e && e.need==='pwchange'){ show('login'); $('lg-msg').textContent=''; return; }   /* v25: 바꾸기 창이 곧 뜸 */
    if(/로그인|비밀번호|계정/.test(e.message)){ var nm=me.name; forget(); $('lg-name').value=nm||''; }''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
