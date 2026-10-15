# -*- coding: utf-8 -*-
# 하나의 통합 index — 0_차곳간_통합_index.html
#   사용자 제품(워시·체크) 파일을 그대로 품고, 계정에 따라 열 수 있는 제품만 띄웁니다.
#   관리는 넣지 않습니다 (규칙 1-3: 관리는 주소·배포·로그인을 따로 둠).
#   python build_shell.py        → 진짜 파일
#   python build_shell.py test   → 시험용 사본 (_시험_통합.html, 모든 서버 주소 → 가짜 서버)
#   새 판 묶기: python build_shell.py [test] --판 v3 --wash 워시/파일.html --check 체크/파일.html
#     → 0_차곳간_통합_index_v3.html (시험용은 _시험_통합_v3.html). 경로는 저장소 기준. 기존 판은 덮어쓰지 않습니다.
import io, os, sys, base64
# 저장소 기준 경로: 이 파일은 홈페이지/통합입구/도구/조립도구/ 에 있습니다.
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
OUT = os.path.join(ROOT, "홈페이지", "통합입구")
ARGS = sys.argv[1:]
TEST = "test" in ARGS
def opt(k, d=None):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d
PAN = opt("--판")
SB = "https://ybfpxmmjofyvfprtvmhj.supabase.co"
SRC = {"wash": os.path.join(ROOT, "워시", "1_차곳간_워시_index.html"),
       "check": os.path.join(ROOT, "체크", "2_차곳간_체크_index.html")}
for _c in ("wash", "check"):
    if opt("--" + _c): SRC[_c] = os.path.join(ROOT, opt("--" + _c))
print("묶는 원본:", {k: os.path.relpath(v, ROOT) for k, v in SRC.items()})

def pkg(code):
    t = io.open(SRC[code], encoding="utf-8").read()
    if TEST:
        n = t.count(SB)
        t = t.replace(SB, "http://127.0.0.1:8898/sb")
        print(code, "서버 주소 바꿈", n)
    return base64.b64encode(t.encode("utf-8")).decode("ascii")

sys.path.insert(0, os.path.join(ROOT, "홈페이지", "공통"))
import 사업자정보
BIZ = 사업자정보.render()   # 값은 홈페이지/공통/사업자정보.json 한 곳에서
VER = opt("--ver", "통합 v2 · UI 1.1 · 2026-10-13")
API = ("http://127.0.0.1:8898/sb" if TEST else SB) + "/functions/v1/cgg-api?forceFunctionRegion=ap-northeast-2"

S_IN  = "width:100%;box-sizing:border-box;padding:15px 14px;font-size:17px;border-radius:12px;border:1px solid var(--line,#dde3ec);background:var(--surface,#fff);color:var(--text,#14202e);margin-top:7px"
S_BTN = "width:100%;padding:16px;font-size:17px;font-weight:700;border:0;border-radius:12px;background:var(--brand,#0b5d8f);color:#fff;cursor:pointer;margin-top:16px"
S_GHOST = "width:100%;padding:14px;font-size:16px;border:1px solid var(--line,#dde3ec);border-radius:12px;background:transparent;color:var(--muted,#667389);cursor:pointer;margin-top:10px"
S_LAB = "font-size:14px;font-weight:600;color:var(--muted,#667389);margin-top:14px;display:block"

HTML = r'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#1668C4">
<title>차곳간</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
/* ═══ 통합 껍데기 — 색·글꼴은 워시 :root 값을 그대로 씁니다 ═══ */
:root{
  --bg:#f4f6f9;--surface:#fff;--surface2:#f0f3f7;--line:#dde3ec;--text:#14202e;--muted:#667389;
  --brand:#1668C4;--brand-soft:#E7F2FC;--accent:#0B2545;--danger:#b3261e;--good:#127a4b;
  --shadow:0 2px 10px rgba(16,32,52,.08);--r:14px;
  font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,-apple-system,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0e141c;--surface:#161e28;--surface2:#1d2733;--line:#2b3644;--text:#e8edf4;--muted:#95a3b6;
  --brand:#5FA8E8;--brand-soft:#102B47;--accent:#8FC9F2;--danger:#ff8b82;--good:#4ad48f;--shadow:0 2px 10px rgba(0,0,0,.4)}}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none !important}
html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font-size:16px;line-height:1.55;overflow:hidden}
/* 제품 고르는 띠 — 대표(여러 제품 계정)에게만 보입니다. 워시 .tabs 모양 그대로 */
#cggBar{position:fixed;left:0;right:0;top:0;height:46px;z-index:10;background:var(--surface);border-bottom:1px solid var(--line);
  display:flex;align-items:center;gap:10px;padding:0 14px}
#cggBar .nm{font-weight:900;font-size:15px;letter-spacing:-.02em}
#cggBar .tabs{display:flex;gap:5px;background:var(--surface2);padding:3px;border-radius:12px}
#cggBar .tabs button{border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:14px;font-weight:700;
  padding:6px 16px;border-radius:9px;cursor:pointer;white-space:nowrap}
#cggBar .tabs button[aria-selected="true"]{background:var(--surface);color:var(--brand);box-shadow:var(--shadow)}
#cggBar .sp{flex:1}
#cggBar .who{font-size:12px;color:var(--muted)}
#cggBar .mini{font-family:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:var(--surface2);
  color:var(--text);border-radius:9px;padding:6px 10px;cursor:pointer}
.cggFrame{position:fixed;left:0;right:0;bottom:0;top:0;width:100%;height:100%;border:0;background:var(--bg)}
body.multi .cggFrame{top:46px;height:calc(100% - 46px)}
#cggBusy{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px}
</style>
</head>
<body>

<!-- ═══ 하나뿐인 로그인 — 워시 로그인 화면과 같은 모양 ═══ -->
<div id="cggLogin" hidden style="position:fixed;inset:0;z-index:99999;background:var(--bg,#f4f6f9);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;font-family:inherit;color:var(--text,#14202e)">
  <div style="width:100%;max-width:400px">
    <div style="text-align:center;margin-bottom:22px">
      <div style="font-size:30px;font-weight:800;letter-spacing:-1px">차곳간</div>
      <div style="font-size:13px;color:var(--muted,#667389);margin-top:4px">광택·세차 · 성능점검</div>
    </div>
    <div style="background:var(--surface,#fff);border:1px solid var(--line,#dde3ec);border-radius:var(--r,14px);padding:22px 20px;box-shadow:var(--shadow,0 2px 10px rgba(16,32,52,.08))">
      <h2 style="margin:0 0 4px;font-size:20px">로그인</h2>
      <div id="lgStep1">
        <label style="@@LAB@@" for="lgId">아이디 (휴대폰 번호)</label>
        <input id="lgId" type="text" autocomplete="username" placeholder="010-0000-0000" style="@@IN@@">
        <label style="@@LAB@@" for="lgPw">비밀번호</label>
        <input id="lgPw" type="password" autocomplete="current-password" placeholder="비밀번호" style="@@IN@@">
        <button id="lgGo" style="@@BTN@@">로그인</button>
      </div>
      <div id="lgStep2" hidden>
        <div id="lgTo" style="font-size:14px;color:var(--muted,#667389);margin-top:10px"></div>
        <label style="@@LAB@@" for="lgCode">인증번호 6자리</label>
        <input id="lgCode" type="tel" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code" style="@@IN@@;letter-spacing:8px;font-size:24px;text-align:center;font-weight:700">
        <button id="lgGo2" style="@@BTN@@">확인</button>
        <button id="lgBack" style="@@GHOST@@">처음부터 다시</button>
      </div>
      <div id="lgMsg" style="font-size:14px;margin-top:12px;min-height:20px;line-height:1.5"></div>
    </div>
    <div style="text-align:center;font-size:12px;color:var(--muted,#667389);margin-top:16px;line-height:1.8" id="lgVer"></div>
    @@BIZ@@
  </div>
</div>

<!-- ═══ 제품 고르는 띠 (여러 제품을 가진 계정만) ═══ -->
<div id="cggBar" hidden>
  <span class="nm">차곳간</span>
  <div class="tabs" id="cggTabs" role="tablist"></div>
  <span class="sp"></span>
  <span class="who" id="cggWho"></span>
  <button class="mini" id="cggOut">모두 로그아웃</button>
</div>
<div id="cggBusy" hidden>여는 중…</div>

<!-- ═══ 세 제품 — 파일 그대로 품어 둡니다 (고치지 않은 원본, base64) ═══ -->
<script type="application/octet-stream" id="pkg-wash">@@WASH@@</script>
<script type="application/octet-stream" id="pkg-check">@@CHECK@@</script>

<script>
(function(){
"use strict";
/* =====================================================================
   차곳간 통합 index — 껍데기
   ─────────────────────────────────────────────────────────────────────
   ① 로그인은 여기 한 곳에서 합니다 (서버 창구 cggLogin → 필요하면 cggLogin2).
   ② 서버가 «이 계정이 열 수 있는 제품»(products)을 알려 줍니다.
        A 계정 → 체크만 / B 계정 → 워시만 / 둘 다 허락된 계정 → 워시·체크
   ③ 제품마다 저장 칸을 따로 씁니다 (cgg.wash.* / cgg.check.*).
      워시와 체크가 같은 이름(ccw_sid 등)을 써도 서로 덮어쓰지 않습니다.
   ④ 제품 화면은 원본 파일 그대로 띄웁니다 — 한 글자도 바꾸지 않습니다.
   ===================================================================== */
var SHELL_VER = "@@VER@@";
var API = "@@API@@";
var PRODUCTS = {
  wash:  { name:"워시", keys:function(p){ return { ccw_sid:p.sid, ccw_shop:p.shop }; },           sid:"ccw_sid" },
  check: { name:"체크", keys:function(p){ return { cgg_key:p.sid, cgg_shop:p.shop, cgg_role:p.role||"owner",
                                                   cgg_who:p.who||"", cgg_shopname:p.shopName||"" }; }, sid:"cgg_key" }
};
var ORDER = ["wash","check"];
var SKEY = "cgg_sid";
var ME = null, CUR = "", FRAMES = {};

function $(id){ return document.getElementById(id); }
function esc(v){ return String(v==null?"":v).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k)||""; if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return ""; }

function post(fn,args,token){
  return fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({shop:"",token:token||"",fn:fn,args:args||[]})})
    .then(function(r){ return r.text(); },function(){ throw new Error("서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요."); })
    .then(function(t){ var j; try{ j=JSON.parse(t); }catch(e){ throw new Error("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."); }
      if(j && j.__err){ if(/모르는 요청/.test(j.__err)) throw new Error("로그인 서비스를 준비 중입니다. 잠시 후 다시 시도해 주세요."); throw new Error(j.__err); }
      return j ? j.result : null; });
}

/* ── 로그인 화면 ── */
function msg(t,bad){ var m=$("lgMsg"); m.textContent=t||""; m.style.color=bad?"var(--danger,#b3261e)":"var(--good,#127a4b)"; }
function step2(on){ $("lgStep1").hidden=on; $("lgStep2").hidden=!on; if(on) setTimeout(function(){ try{$("lgCode").focus();}catch(e){} },60); }
var TICK="";
function showLogin(t,bad){
  Object.keys(FRAMES).forEach(function(k){ FRAMES[k].remove(); }); FRAMES={}; CUR="";
  $("cggBar").hidden=true; document.body.classList.remove("multi");
  $("cggLogin").hidden=false; step2(false); msg(t||"",bad);
  setTimeout(function(){ try{$("lgId").focus();}catch(e){} },60);
}
function doLogin(){
  var id=$("lgId").value.trim(), pw=$("lgPw").value;
  if(!id||!pw) return msg("휴대폰 번호와 비밀번호를 입력해 주세요.",true);
  $("lgGo").disabled=true; msg("확인 중…");
  post("cggLogin",[id,pw]).then(function(r){
    $("lgGo").disabled=false;
    if(r && r.tick){ TICK=r.tick; $("lgTo").innerHTML="<b>"+esc(r.to||"")+"</b>(으)로 인증번호를 발송했습니다."; msg(""); step2(true); return; }
    enter(r);
  }).catch(function(e){ $("lgGo").disabled=false; msg(e.message,true); });
}
function doCode(){
  var c=$("lgCode").value.replace(/[^0-9]/g,"");
  if(c.length!==6) return msg("인증번호 6자리를 입력해 주세요.",true);
  $("lgGo2").disabled=true; msg("확인 중…");
  post("cggLogin2",[TICK,c]).then(function(r){ $("lgGo2").disabled=false; $("lgCode").value=""; enter(r); })
    .catch(function(e){ $("lgGo2").disabled=false; msg(e.message,true); });
}

/* ── 들어가기: 열 수 있는 제품만 저장 칸에 열쇠를 넣고, 띄웁니다 ── */
function enter(r){
  if(!r || !r.sid || !r.products || !r.products.length){ showLogin("이 계정으로 이용할 수 있는 서비스가 없습니다.",true); return; }
  ME = { sid:r.sid, name:r.name||"", products:r.products.filter(function(p){ return PRODUCTS[p.code]; }) };
  ls(SKEY, r.sid);
  /* 제품마다 따로 쓰는 저장 칸 — cgg.<제품>.<원래 이름> */
  ME.products.forEach(function(p){
    var kv=PRODUCTS[p.code].keys(p);
    Object.keys(kv).forEach(function(k){ ls("cgg."+p.code+"."+k, kv[k]==null?"":String(kv[k])); });
  });
  /* 허락 안 된 제품의 열쇠는 지웁니다 */
  ORDER.forEach(function(code){
    if(!can(code)) ls("cgg."+code+"."+PRODUCTS[code].sid, null);
  });
  $("cggLogin").hidden=true;
  var multi = ME.products.length>1;
  $("cggBar").hidden=!multi; document.body.classList.toggle("multi",multi);
  $("cggWho").textContent = ME.name ? (ME.name+" 님") : "";
  drawTabs();
  var want=(location.hash||"").replace("#","");
  var last=ls("cgg_last");
  open_( can(want)?want : (can(last)?last : ME.products[0].code) );
}
function can(code){ return !!ME && ME.products.some(function(p){ return p.code===code; }); }

function drawTabs(){
  var t=$("cggTabs");
  t.innerHTML = ORDER.filter(can).map(function(code){
    return '<button role="tab" data-p="'+code+'" aria-selected="'+(code===CUR)+'">'+esc(PRODUCTS[code].name)+'</button>'; }).join("");
  Array.prototype.forEach.call(t.children,function(b){ b.onclick=function(){ open_(b.getAttribute("data-p")); }; });
}

/* ── 제품 띄우기 — 원본 파일을 그대로 풀어서 같은 주소(origin) 안의 틀(iframe)에 넣습니다 ── */
function unpack(code){
  var b=atob($("pkg-"+code).textContent.trim()), u=new Uint8Array(b.length);
  for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
  return new TextDecoder("utf-8").decode(u);
}
/* 제품 안에서 localStorage 를 부르면 cgg.<제품>. 칸만 보이게 합니다 (원본 코드는 그대로) */
function shim(code){
  return '<script>(function(P){var S=window.localStorage;function ks(){var o=[];for(var i=0;i<S.length;i++){var k=S.key(i);if(k&&k.indexOf(P)===0)o.push(k.slice(P.length));}return o;}'+
    'var L={getItem:function(k){return S.getItem(P+k);},setItem:function(k,v){S.setItem(P+k,String(v));},removeItem:function(k){S.removeItem(P+k);},'+
    'clear:function(){ks().forEach(function(k){S.removeItem(P+k);});},key:function(i){return ks()[i]||null;}};'+
    'Object.defineProperty(L,"length",{get:function(){return ks().length;}});'+
    'try{Object.defineProperty(window,"localStorage",{value:L,configurable:true});}catch(e){}'+
    'window.CGG_PRODUCT="'+code+'";})("cgg.'+code+'.");<\/script>';
}
function open_(code){
  if(!can(code)){ alertNo(code);
    /* 허락 안 된 주소(#제품)로 들어오면 보던 제품 주소로 되돌립니다 */
    if(CUR){ try{ history.replaceState(null,"","#"+CUR); }catch(e){} }
    return; }
  CUR=code; ls("cgg_last",code);
  if(location.hash!=="#"+code){ try{ history.replaceState(null,"","#"+code); }catch(e){} }
  drawTabs();
  Object.keys(FRAMES).forEach(function(k){ FRAMES[k].hidden=(k!==code); });
  document.title = "차곳간 "+PRODUCTS[code].name;
  if(FRAMES[code]) return;
  $("cggBusy").hidden=false;
  setTimeout(function(){
    var html=unpack(code);
    html = html.replace(/<head([^>]*)>/i, function(m){ return m+shim(code); });
    var f=document.createElement("iframe");
    f.className="cggFrame"; f.id="frame-"+code; f.title="차곳간 "+PRODUCTS[code].name;
    f.setAttribute("allow","clipboard-write; camera");
    f.onload=function(){ $("cggBusy").hidden=true; };
    f.srcdoc=html;
    document.body.appendChild(f); FRAMES[code]=f;
  },20);
}
function alertNo(code){
  var n=PRODUCTS[code]?PRODUCTS[code].name:code;
  if(code) console.warn("[차곳간] 이 계정은 «"+n+"» 서비스를 이용할 수 없습니다.");
}

/* ── 제품 안에서 로그아웃하면 (그 제품 열쇠가 지워지면) 통합 로그인으로 돌아옵니다 ── */
window.addEventListener("storage",function(e){
  if(!ME || !e.key) return;
  ORDER.forEach(function(code){
    if(e.key==="cgg."+code+"."+PRODUCTS[code].sid && !e.newValue && can(code)) logoutAll("로그아웃되었습니다.");
  });
});
function logoutAll(t){
  var sid=ls(SKEY);
  ORDER.forEach(function(code){
    var kv=PRODUCTS[code].keys({});
    Object.keys(kv).forEach(function(k){ ls("cgg."+code+"."+k, null); });
  });
  ls(SKEY,null); ME=null;
  if(sid) post("cggLogout",[sid]).catch(function(){});
  showLogin(t||"",false);
}
$("cggOut").onclick=function(){ logoutAll("모두 로그아웃되었습니다."); };
window.addEventListener("hashchange",function(){ var c=(location.hash||"").replace("#",""); if(ME && c && c!==CUR) open_(c); });

$("lgGo").onclick=doLogin; $("lgGo2").onclick=doCode;
$("lgBack").onclick=function(){ TICK=""; $("lgCode").value=""; msg(""); step2(false); };
$("lgPw").onkeydown=function(e){ if(e.key==="Enter") doLogin(); };
$("lgId").onkeydown=function(e){ if(e.key==="Enter") $("lgPw").focus(); };
$("lgCode").onkeydown=function(e){ if(e.key==="Enter") doCode(); };
$("lgVer").textContent=SHELL_VER;

/* 이미 로그인해 둔 기기 — 서버에 다시 물어 제품 목록을 새로 받습니다 */
(function boot(){
  var sid=ls(SKEY);
  if(!sid){ showLogin(""); return; }
  $("cggBusy").hidden=false;
  post("cggMe",[sid]).then(function(r){ $("cggBusy").hidden=true; enter(r); })
    .catch(function(){ $("cggBusy").hidden=true; ls(SKEY,null); showLogin(""); });
})();

/* 시험·점검용 — 지금 상태를 돌려줍니다 (화면에는 안 보입니다) */
window.CGG_SHELL = { ver:SHELL_VER, me:function(){ return ME; }, cur:function(){ return CUR; },
  frames:function(){ return Object.keys(FRAMES); }, open:open_, can:can, logoutAll:logoutAll };
})();
</script>
</body>
</html>
'''
out = (HTML.replace("@@IN@@", S_IN).replace("@@BTN@@", S_BTN).replace("@@GHOST@@", S_GHOST).replace("@@LAB@@", S_LAB)
       .replace("@@API@@", API).replace("@@VER@@", VER).replace("@@BIZ@@", BIZ).replace("@@WASH@@", pkg("wash")).replace("@@CHECK@@", pkg("check")))
sfx = "_" + PAN if PAN else ""
name = os.path.join("도구", "시험용", "_시험_통합" + sfx + ".html") if TEST else "0_차곳간_통합_index" + sfx + ".html"
io.open(os.path.join(OUT, name), "w", encoding="utf-8").write(out)
print(name, len(out.encode("utf-8")), "bytes")
