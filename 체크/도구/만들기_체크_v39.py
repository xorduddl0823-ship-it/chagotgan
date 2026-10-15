"""체크 v38(보안 통과 b55f57a) → 체크 v39 — 오픈 베타 시험판 (운영/요청서/2026-10-15_07_오픈베타_시험_마무리.md)
쓰는 법: python3 체크/도구/만들기_체크_v39.py   (v38 을 읽기만)
바꾸는 것:
  1) 「오픈 베타」 띠 — 홈페이지 시안 «넣은 안» 그대로(남색 얇은 띠 · OPEN BETA · 문구). 로그인 화면 맨 위 + 앱 본문 맨 위
  2) 오류 글 — 영어 · 코드 숫자(500 · undefined · null) · «Verify JWT» 같은 개발 글이 화면에 나오지 않게 한 곳(niceMsg)에서 쉬운 말로
     (자세한 내용은 개발자 도구 콘솔에만). 인터넷이 끊기면 «인터넷 연결이 불안정합니다 …»
  3) 보안 — 달력 메모를 검사소별로 나눠 저장(같은 PC 다른 검사소에 안 보이게) · 로그아웃하면 화면 메모리까지 비우게 새로 불러오기
  4) 말 — «돈» → «금액»(규칙 4-2) · «알람소리» → «알람 소리»(4-4) · 해요체(4-1, 가입 · 로그인 · 오류 안내는 표준형 그대로)
기능(서버 부르기 · 계산 · 결제)은 그대로. 결제 덩어리(cwRpc ~ 지갑 위젯)는 워시 v122와 같게 두려고 손대지 않음(빌드가 확인)
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v38.html"
OUT = BASE + "2_차곳간_체크_index_v39.html"
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

def payblock(t):
    a = t.index("  function cwRpc(fn, args){")
    b = t.index("\n})();", a)
    return t[a:b]
PAY0 = payblock(s)

# 1) 오픈 베타 띠
BETA = '<div class="cgg-beta" role="note"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div>'
rep('''  <div class="cgg-main"><div id="bar"></div>''', '''  <div class="cgg-main">''' + BETA + '''<div id="bar"></div>''')
rep('''  $("root").innerHTML =
  '<div class="login"><div class="loginbox">'+''', '''  $("root").innerHTML = \'''' + BETA + '''\'+
  '<div class="login"><div class="loginbox">'+''')
rep('''.cgg-right .me{position:relative}''', '''.cgg-right .me{position:relative}
/* v39: 오픈 베타 띠 — 홈페이지 시안 «넣은 안»과 같은 모양 */
:root{--beta:#0d2440;--beta-ink:#e8f0fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--beta:#1d3a5f}}
:root[data-theme="dark"]{--beta:#1d3a5f}
.cgg-beta{background:var(--beta);color:var(--beta-ink);font-size:13.5px;padding:8px 16px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;line-height:1.5}
.cgg-beta b{background:var(--beta-ink);color:var(--beta);border-radius:6px;padding:0 7px;font-size:12px;letter-spacing:.04em}
.cgg-main>.cgg-beta{margin:0 0 14px;border-radius:12px}
#root>.cgg-beta{border-radius:0}
@media (max-width:600px){ .cgg-beta{font-size:12.5px;padding:7px 12px;gap:6px} .cgg-main>.cgg-beta{border-radius:10px;margin-bottom:10px} }''')

# 2) 오류 글 한 곳에서
rep('''function readJson(r){
  return r.text().then(function(t){
    var j=null; try{ j=JSON.parse(t); }catch(e){}
    if(j===null) throw new Error("서버가 글자로 답했습니다 ("+r.status+") : "+String(t).slice(0,160));
    j.__status=r.status; return j;
  });
}
function whyBad(j){
  var code=(j&&(j.code||j.statusCode||j.__status))||0;
  var msg=String((j&&(j.message||j.msg||j.error))||"");
  if(code===401 || /authorization/i.test(msg))
    return "서버가 열쇠를 요구하고 있습니다. 수파베이스에서 check-api 의 «Verify JWT» 를 꺼 주세요. ("+msg+")";
  if(code===404) return "check-api 를 찾지 못했습니다. 서버를 올리셨는지 확인해 주세요.";
  if(msg) return "서버가 답했습니다 : "+msg;
  return "서버 답을 알아듣지 못했습니다 : "+JSON.stringify(j).slice(0,160);
}''', '''function readJson(r){
  return r.text().then(function(t){
    var j=null; try{ j=JSON.parse(t); }catch(e){}
    if(j===null){ try{ console.warn("check-api 답이 JSON 이 아님", r.status, String(t).slice(0,300)); }catch(e){}
      throw new Error("서버에서 답을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요."); }
    j.__status=r.status; return j;
  });
}
/* v39: 화면에는 쉬운 말만 — 자세한 까닭은 개발자 도구 콘솔에 */
function whyBad(j){
  var code=(j&&(j.code||j.statusCode||j.__status))||0;
  var msg=String((j&&(j.message||j.msg||j.error))||"");
  try{ console.warn("check-api 답을 알아듣지 못함", code, msg, JSON.stringify(j).slice(0,300)); }catch(e){}
  if(code===401 || code===404 || /authorization/i.test(msg))
    return "서버 설정이 맞지 않아 처리하지 못했습니다. 차곳간에 알려 주세요.";
  return "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}
function niceMsg(m){
  m=String(m==null?"":m).trim();
  if(!m) return "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
  if(/Failed to fetch|NetworkError|Load failed|network|timed? ?out|aborted|offline/i.test(m))
    return "인터넷 연결이 불안정합니다. 연결을 확인하고 다시 시도해 주세요.";
  if(!/[가-힣]/.test(m) || /undefined|\\bnull\\b|NaN|\\[object /.test(m)){
    try{ console.warn("화면에 그대로 보이지 않게 바꾼 오류 글:", m); }catch(e){}
    return "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
  }
  return m;
}''')
rep('''    if(!j || j.result===undefined) throw new Error(whyBad(j));
    return j.result;
  });
}''', '''    if(!j || j.result===undefined) throw new Error(whyBad(j));
    return j.result;
  }).catch(function(e){ var er=new Error(niceMsg(e&&e.message)); if(e&&e.need) er.need=e.need; if(e&&e.tick) er.tick=e.tick; throw er; });   /* v39 */
}''')
rep('''function say(where, text, kind){
  var e=$(where); if(!e) return;
  if(!text){ e.className="hide"; e.innerHTML=""; return; }''', '''function say(where, text, kind){
  var e=$(where); if(!e) return;
  if(!text){ e.className="hide"; e.innerHTML=""; return; }
  if(kind==="err") text=niceMsg(text);   /* v39 */''')
rep('''  var e=$("bar"); if(!e) return;
  e.innerHTML = text ? '<div class="msg '+(kind||"info")+'">'+esc(text)+'</div>' : "";''', '''  var e=$("bar"); if(!e) return;
  if(text && kind==="err") text=niceMsg(text);   /* v39 */
  e.innerHTML = text ? '<div class="msg '+(kind||"info")+'">'+esc(text)+'</div>' : "";''')
rep('''      }catch(e){ bad(new Error(file.name+" : "+e.message)); }''',
    '''      }catch(e){ try{ console.warn(file.name, e); }catch(e2){} bad(new Error(file.name+" 을 읽지 못했습니다. 엑셀 파일(xlsx · xls · csv)인지 확인해 주세요.")); }''')

# 3-a) 달력 메모 — 검사소별
rep('''  try { return JSON.parse(localStorage.getItem("cgg_memos") || "[]"); } catch(e){ return []; }''',
    '''  /* v39: 검사소별로 저장 — 같은 PC에서 다른 검사소로 로그인해도 서로 안 보이게. 예전(검사소 없는) 메모는 처음 연 검사소로 옮김 */
  try {
    var k="cgg_memos:"+(ST.shop||"");
    var v=localStorage.getItem(k);
    if(v===null){ var old=localStorage.getItem("cgg_memos"); if(old!==null && ST.shop){ localStorage.setItem(k, old); localStorage.removeItem("cgg_memos"); v=old; } }
    return JSON.parse(v || "[]");
  } catch(e){ return []; }''')
rep('''  try { localStorage.setItem("cgg_memos", JSON.stringify(list)); } catch(e){}''',
    '''  try { if(ST.shop) localStorage.setItem("cgg_memos:"+ST.shop, JSON.stringify(list)); } catch(e){}''')
# 3-b) 로그아웃 — 화면 메모리까지 비우기
rep('''function signOut(quiet){
  if(ST.key){ try{ call("logout",[ST.key]); }catch(e){} }
  ST.key=""; del("cgg_key"); del("cgg_shop"); del("cgg_who"); del("cgg_role"); del("cgg_shopname");
  LOADED={}; drawLogin();
  if(quiet) setTimeout(function(){ say("lg-msg","로그인 시간이 지났습니다. 다시 로그인해 주세요.","info"); },30);
}''', '''function signOut(quiet){
  var k=ST.key, done=false;
  ST.key=""; del("cgg_key"); del("cgg_shop"); del("cgg_who"); del("cgg_role"); del("cgg_shopname");
  LOADED={}; drawLogin();
  /* v39: 서버 로그아웃을 기다린 뒤(최대 1.5초) 새로 불러와서, 화면 메모리에 남은 검사소 자료까지 비움 */
  try{ sessionStorage.setItem("cgg_out", quiet?"1":"0"); }catch(e){}
  function go2(){ if(done) return; done=true; try{ location.reload(); }catch(e){} }
  if(k){ try{ fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop:"",token:k,fn:"logout",args:[k]})}).then(go2,go2); }catch(e){ go2(); } }
  setTimeout(go2, k?1500:0);
}''')
rep('''function drawLogin(){
  $("wrap").hidden=true;''', '''function drawLogin(){
  $("wrap").hidden=true;
  var out=""; try{ out=sessionStorage.getItem("cgg_out")||""; sessionStorage.removeItem("cgg_out"); }catch(e){}
  if(out==="1") setTimeout(function(){ say("lg-msg","로그인 시간이 지났습니다. 다시 로그인해 주세요.","info"); },30);''')

# 4) 말 — 돈 → 금액, 알람 소리
for a, b in [("보험사가 달라는 돈", "보험사가 청구한 금액"), ("들어온 돈", "들어온 금액"), ("받은 돈", "받은 금액"), ("남는 돈", "남는 금액"),
             ("받는 돈", "받는 금액"), ("내는 돈", "내는 금액"), ("내야 할 돈", "내야 할 금액"), ("실제로 돈을 받은", "실제로 금액을 받은"),
             ("돈이 나가지 않습니다", "요금이 나가지 않습니다"), ('alarm:"알람소리"', 'alarm:"알람 소리"'),
             ("/* ── 받을 돈 · 입금 확인 ── */", "/* ── 받을 금액 · 입금 확인 ── */"), ("날마다 들어온 금액을", "날마다 들어온 금액을")]:
    s = s.replace(a, b)

# 4-b) 워시에서 옮겨 온 잠금 · 요금 띠의 워시 말(입고 · 출고 · 새 차 접수)을 체크 일 이름으로
for a, b in [("새 차 접수 · 출고 · 문자·알림톡 · 사진 올리기 · 세금계산서", "자료 올리기 · 청구서 보내기 · 문자·알림톡 · 세금계산서"),
             ("새 접수·출고·문자·계산서는 멈춰 있습니다", "자료 올리기·청구서·문자·계산서는 멈춰 있습니다"),
             ("입고·출고 기록은 그대로 됩니다", "자료 올리기와 청구서 만들기는 그대로 됩니다"),
             ("무료 문자를 다 사용하였습니다. 충전 후 사용하세요.", "무료 문자를 다 썼어요. 충전하면 다시 보낼 수 있어요."),
             ("<b>됩니다</b><br>", "<b>쓸 수 있어요</b><br>")]:
    if a not in s: raise SystemExit("못 찾음: " + a)
    s = s.replace(a, b)

# 4-c) 해요체 (규칙 4-1) — 가입 · 로그인 · 오류 안내, 딜러에게 나가는 문자 · 알림톡 글, 공통 부품, 결제 덩어리는 그대로
import sys; sys.path.insert(0, "/home/user/chagotgan/체크/도구"); import 해요체
_t = s.replace(CSS, "\0C").replace(JS, "\0J").replace(PAY0, "\0P")
_t, HEYO, _left = 해요체.make(_t, ("function drawLogin", "function go", "function signOut", "function niceMsg", "function whyBad",
                                  "function readJson", "function pbKo", "function pbBad", "function fail", "function tell"))
s = _t.replace("\0C", CSS).replace("\0J", JS).replace("\0P", PAY0)
open("/home/user/chagotgan/체크/도구/해요체_v39_바꾼말.txt", "w", encoding="utf-8").write(
    "체크 v39 해요체로 바꾼 말 (줄 번호는 공통 부품을 뺀 글 기준)\n" + "\n".join("%d\t%s\n  전: %s\n  후: %s" % x for x in HEYO))

# 4-d) 오픈 베타 — 아직 없는 기능은 솔직하게 «준비 중»
for a, b in [("보험료 청구는 다음 단계에서 붙여요.", "보험료 청구는 아직 준비 중이에요."),
             ("이 화면은 다음 단계에서 붙여요.", "이 화면에서 지난 기록을 보는 기능은 준비 중이에요."),
             ("여기서 고치는 화면은 다음 단계에서 붙여요.", "여기서 단가를 고치는 기능은 준비 중이에요. 바꿀 단가가 있으면 차곳간에 알려 주세요.")]:
    if a not in s: raise SystemExit("못 찾음: " + a)
    s = s.replace(a, b)

# 5) 눌러 보기에서 찾은 것
# 5-a) 청구서 자세히 «정비비 undefined건» — 건수가 없으면 0
rep("""검사비 '+b.cnt+'건 · '""", """검사비 '+won(b.cnt||0)+'건 · '""")
rep("""정비비 '+b.repN+'건 · '""", """정비비 '+won(b.repN||0)+'건 · '""")
# 5-b) 엑셀 도구(SheetJS)를 못 불러왔을 때 아무 말 없이 멈추지 않게
XLS_MSG = "엑셀 도구를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침(F5)해 주세요."
rep('    var wb=XLSX.utils.book_new();', '    if(typeof XLSX==="undefined"){ bar("' + XLS_MSG + '","err"); return; }   /* v39 */\n    var wb=XLSX.utils.book_new();', 3)
rep('        var wb=XLSX.read(new Uint8Array(fr.result), {type:"array"});', '        if(typeof XLSX==="undefined"){ bad(new Error("' + XLS_MSG + '")); return; }   /* v39 */\n        var wb=XLSX.read(new Uint8Array(fr.result), {type:"array"});')
# 5-c) 링크 복사 — 브라우저가 막으면 주소를 보여 줌 (조용히 실패하지 않게)
rep("""  try{ navigator.clipboard.writeText(u); bar("이 화면 주소를 복사했어요 — "+decodeURIComponent(u),"ok"); }
  catch(e){ bar("이 화면 주소 : "+decodeURIComponent(u),"info"); }""",
    """  function shown(){ bar("이 화면 주소예요 — "+decodeURIComponent(u)+" (직접 복사해 주세요)","info"); }
  try{ navigator.clipboard.writeText(u).then(function(){ bar("이 화면 주소를 복사했어요 — "+decodeURIComponent(u),"ok"); }, shown); }
  catch(e){ shown(); }""")

rep('''  $("hdVer").textContent="체크 v38 · "''', '''  $("hdVer").textContent="체크 v39 · "''')

# 확인 — 결제 덩어리 · 공통 부품 그대로, 남은 말
if payblock(s) != PAY0: raise SystemExit("결제 덩어리가 바뀜")
if s.count(CSS) != 1 or s.count(JS) != 1: raise SystemExit("공통 부품 글자가 바뀜")
own = s.replace(CSS, "").replace(JS, "").replace(PAY0, "")
left = [m.start() for m in re.finditer("돈", own)]
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s), "· 남은 «돈»(결제 덩어리 밖):", len(left), "· 해요체로 바꾼 말:", len(HEYO), "· 못 바꾼 말:", len(_left))
for i in left: print("   ", own[max(0,i-40):i+20].replace("\n"," "))
