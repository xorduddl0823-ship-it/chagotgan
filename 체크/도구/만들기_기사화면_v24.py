"""기사 폰 화면(체크/driver/index.html, 2026-10-10 PC 최신판) → 새 판 체크/driver/index_v24.html. 원본은 읽기만 한다.
서버 check-api v24 짝 (서버/설계/04_체크화면v22_서버v24_짝맞추기.md ③④⑤):
  ③ 로그인에 「회사 코드(선택)」 칸 — 같은 이름의 기사가 두 회사에 있을 때만 필요
  ④ 계정 만들기: 서버가 「가입 신청이 됐습니다…」를 오류 모양으로 돌려줌 → 빨간 오류 말고 안내(초록)로,
     로그인 칸으로 돌려 보내고 이름을 채워 둠. 새 비밀번호 안내는 「6자 이상」(서버 v23부터)
  ⑤ 5번 틀려 잠김 → 주황 안내로 그대로 보여 줌
  + 「가온」 박힌 글자 정리 (머리 제목 · 예시 칸). 이 폰에 저장하는 이름(gaon.deliv.*)은 그대로 — 바꾸면 기사들 로그인이 풀림
J안 · 공통 부품(cgg-j4)은 이 화면에 붙이지 않음: 메뉴가 없는 한 화면짜리 현장 도구라 큰 단추 모양이 더 맞음 (추천, 총괄 방에 보고)
"""
BASE = "/home/user/chagotgan/체크/driver/"
SRC = BASE + "index.html"
OUT = BASE + "index_v24.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 가온 박힌 글자
rep('''<b>🚚 가온 배달알림</b>''', '''<b>🚚 차곳간 배달알림</b>''')
rep('''placeholder="예: GAON">''', '''placeholder="예: 검사소 코드 또는 사업자번호">''')
s = s.replace("유현호 광택왕", "홍길동 하늘모터스")

# ③ 로그인 — 회사 코드(선택)
rep('''      <div class="lab" style="margin-top:12px">내 비밀번호</div>
      <input class="in" id="lg-pw" type="password" autocomplete="current-password">''',
    '''      <div class="lab" style="margin-top:12px">내 비밀번호</div>
      <input class="in" id="lg-pw" type="password" autocomplete="current-password">
      <div class="lab" style="margin-top:12px">회사 코드 (선택)</div>
      <input class="in" id="lg-code" inputmode="text" autocapitalize="characters" autocomplete="off" placeholder="같은 이름의 기사가 다른 회사에도 있을 때만">''')
rep('''  call('api_login', nm, pw).then(function(r){ loggedIn(r, $('lg-keep').checked); })
    .catch(function(e){ $('lg-msg').innerHTML='<span class="bad" style="display:block">'+esc(e.message)+'</span>'; });''',
    '''  var code=$('lg-code').value.trim().toUpperCase();
  call('api_login', nm, pw, code).then(function(r){ if(code) try{ localStorage.setItem('cgg.deliv.code.v1', code); }catch(e){} loggedIn(r, $('lg-keep').checked); })
    .catch(function(e){ lgSay(e.message); });''')

# ④ ⑤ 서버 답을 알맞은 색으로
rep('''$('lg-t1').onclick=function(){ lgTab(1); };''',
    '''/* v24: 서버 답을 알맞은 모양으로 — 가입 신청 완료는 안내(초록), 잠김 · 회사 코드 필요는 주의(주황), 나머지는 오류(빨강) */
function lgSay(m){
  m=String(m||'');
  var cls = /가입 신청이 (됐습니다|접수되었습니다)/.test(m) ? 'good'
          : /잠겼습니다|회사 기사 비밀번호.*함께|검사소 코드/.test(m) ? 'warn' : 'bad';
  $('lg-msg').innerHTML='<span class="'+cls+'" style="display:block">'+esc(m)+'</span>';
  if(/회사 기사 비밀번호.*함께|검사소 코드/.test(m)) { var c=$('lg-code'); if(c) c.focus(); }
}
try{ var _c=localStorage.getItem('cgg.deliv.code.v1'); if(_c) $('lg-code').value=_c; }catch(e){}
$('lg-t1').onclick=function(){ lgTab(1); };''')
rep('''  if(pw.length<4){ $('lg-msg').textContent='내 비밀번호는 4자리 이상으로 정해 주세요.'; return; }''',
    '''  if(pw.length<6){ $('lg-msg').textContent='내 비밀번호는 6자리 이상으로 정해 주세요.'; return; }''')
rep('''  call('api_signup', cp, nm, pw).then(function(r){ loggedIn(r, true); })
    .catch(function(e){ $('lg-msg').innerHTML='<span class="bad" style="display:block">'+esc(e.message)+'</span>'; });''',
    '''  call('api_signup', cp, nm, pw).then(function(r){ loggedIn(r, true); })
    .catch(function(e){
      var m=String(e.message||'');
      if(/가입 신청이 됐습니다/.test(m)){
        /* 서버 v23부터: 가입은 «신청» — 사무실이 [사용]으로 승인해야 로그인됨 */
        $('su-pw').value=''; $('su-pw2').value=''; $('su-pin').value='';
        lgTab(1); $('lg-name').value=nm; $('lg-pw').value='';
        lgSay('가입 신청이 접수되었습니다. 사무실에서 승인하면 이 화면에서 로그인할 수 있습니다. (사무실에서 본인 확인 전화가 갈 수 있습니다)');
        return;
      }
      lgSay(m);
    });''')
rep('''<div class="lab" style="margin-top:12px">내 비밀번호 (4자리 이상 · 업무폰 · 개인폰 모두 이걸로 로그인)</div>''',
    '''<div class="lab" style="margin-top:12px">내 비밀번호 (6자리 이상 · 업무폰 · 개인폰 모두 이걸로 로그인)</div>''')
rep('''      <button class="big b-main" id="su-go">계정 만들고 시작하기</button>
      <div class="hint" style="margin-top:8px">비밀번호를 잊으면 사무실에서 초기화해 줍니다. 그 뒤 여기서 새로 정하면 됩니다.</div>''',
    '''      <button class="big b-main" id="su-go">가입 신청하기</button>
      <div class="hint" style="margin-top:8px">가입 신청을 하면 사무실에서 승인한 뒤부터 로그인할 수 있습니다. 비밀번호를 잊으면 사무실에서 초기화해 줍니다. 그 뒤 여기서 새로 정하면 됩니다.</div>''')
# 비밀번호 바꾸기도 6자 (서버 deliv_changePw 가 6자 검사)
rep('''<div class="lab" style="margin-top:8px">새 비밀번호 (4자리 이상)</div>''', '''<div class="lab" style="margin-top:8px">새 비밀번호 (6자리 이상)</div>''')
rep('''    if(n.length<4){ $('cp-msg').textContent='새 비밀번호는 4자리 이상으로 정해 주세요.'; return; }''',
    '''    if(n.length<6){ $('cp-msg').textContent='새 비밀번호는 6자리 이상으로 정해 주세요.'; return; }''')

for bad in ["가온 배달알림", "유현호", "예: GAON"]:
    if bad in s: raise SystemExit("아직 남음: " + bad)
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
