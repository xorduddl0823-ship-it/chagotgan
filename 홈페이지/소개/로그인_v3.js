/* 메인 홈페이지 v3 — 통합 로그인 화면(대표님 결정 10/19 A안: 홈페이지에서 로그인하면 가게에 맞는 제품 주소로)
   화면만 여기서 만들어요. 로그인 · 넘겨주기 서버 기능은 서버 방(요청서 홈페이지/요청서/2026-10-19_서버_홈페이지_통합로그인.md).
   ① 휴대폰 번호 → ② 인증번호 6자리 → ③ 가게가 둘 이상이면 «가게 고르기» → ④ «들어가는 중» → 그 제품 주소로
   - 로그인 표(token)와 넘김 코드는 브라우저에 저장하지 않아요(메모리에만). 넘김 코드는 주소의 # 뒤로만 보내요(서버 기록 · 다른 사이트로 새지 않게).
   - 주소에 #demo 가 있으면 «예시 모드»: 서버를 부르지 않고 예시 값으로 화면만 보여 줘요(끝 번호 1111 = 가게 1곳 · 2222 = 3곳 · 그 밖 = 가게 없음 → 회원가입). */
(function(){
  var API = "https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/cgg-api?forceFunctionRegion=ap-northeast-2";
  var DEMO = /(^|[#&])demo\b/.test(location.hash);
  var PROD = { wash:"워시", check:"체크", dealer:"딜러" };
  var ROLE = { owner:"대표", staff:"직원", manager:"관리자", dealer:"딜러" };
  var HOME = { wash:"https://app.cgg.co.kr/", check:"https://check.cgg.co.kr/", dealer:"https://dealer.cgg.co.kr/" };
  var S = { ticket:"", token:"", phone:"", places:[], att:"" };
  /* 챗지피티 Q3 · 보안 ⑤ — 로그인 한 번(시도)마다 맞히기 어려운 «시도 번호»를 만들어 세 단계에 같이 보내요. 서버는 ticket · token · 넘김 코드를 이 시도에 묶어요.
     (메모리에만 · 창을 닫으면 사라짐. PKCE · state 방식은 서버 방이 정하면 여기에 붙여요) */
  function attempt(){ try{ var a=new Uint8Array(32); crypto.getRandomValues(a); return btoa(String.fromCharCode.apply(null,a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }catch(e){ return ""; } }
  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v==null?"":v).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  var FAIL = "잠시 문제가 생겼어요. 잠시 뒤 다시 해 주세요.";
  function KO(t){ var e=new Error(t); e.ko=true; return e; }
  function post(fn,args,token){
    if(DEMO) return demo(fn,args);
    return fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({shop:"",token:token||"",fn:fn,args:args||[]})})
      .then(function(r){ return r.text(); },function(){ throw KO("인터넷 연결을 확인하고 다시 해 주세요."); })
      .then(function(t){ var j; try{ j=JSON.parse(t); }catch(e){ throw KO(FAIL); }
        if(j && j.__err){ if(/모르는 요청/.test(j.__err)) throw KO("SOON"); throw KO(/[가-힣]/.test(j.__err)&&!/[A-Za-z_]{3,}/.test(j.__err)?j.__err:FAIL); }
        return j; });
  }
  /* 예시 모드 — 서버 대신 */
  function demo(fn,a){
    return new Promise(function(ok,no){ setTimeout(function(){
      if(fn==="homeOtp") return ok({ticket:"demo",to:String(a[0]).replace(/^(\d{3})\d+(\d{4})$/,"$1-****-$2")});
      if(fn==="homeVerify"){ if(!/^\d{6}$/.test(a[1])) return no(KO("인증번호 6자리를 넣어 주세요."));
        var p=S.phone.slice(-4), L=[];
        if(p==="1111") L=[{id:"d1",name:"예시 광택",product:"wash",role:"owner"}];
        if(p==="2222") L=[{id:"d1",name:"예시 광택",product:"wash",role:"owner"},{id:"d2",name:"예시 성능검사소",product:"check",role:"staff"},{id:"d3",name:"예시상사",product:"dealer",role:"dealer"}];
        return ok({token:"demo",name:"김예시",places:L,joinToken:L.length?"":"demo"}); }
      if(fn==="homeGo") return ok({url:"#demo-go"});
      no(KO(FAIL)); },350); });
  }
  /* 화면 */
  var box = document.createElement("div");
  box.id="hl"; box.hidden=true; box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-labelledby","hlT");
  box.innerHTML='<div class="hl-card"><button type="button" class="hl-x" id="hlX" aria-label="닫기">✕</button>'
   +'<h2 id="hlT">로그인</h2><p class="hl-sub" id="hlSub">휴대폰 번호로 로그인해요. 워시 · 체크 · 딜러 모두 여기서 들어가요.</p>'
   +(DEMO?'<p class="hl-demo">예시 모드예요. 서버를 부르지 않아요. 끝 번호 1111 = 가게 1곳 · 2222 = 3곳 · 그 밖 = 가게 없음(회원가입으로)</p>':'')
   +'<div id="hl1"><label for="hlPh">휴대폰 번호</label><input id="hlPh" type="tel" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" maxlength="13">'
   +'<button type="button" class="btn p full" id="hlGo1">인증번호 받기</button></div>'
   +'<div id="hl2" hidden><p class="hl-to" id="hlTo"></p><label for="hlCode">인증번호 6자리</label><input id="hlCode" type="tel" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" maxlength="6">'
   +'<button type="button" class="btn p full" id="hlGo2">확인</button><div class="hl-row"><button type="button" class="hl-link" id="hlRe">인증번호 다시 받기</button><button type="button" class="hl-link" id="hlBack">번호 바꾸기</button></div></div>'
   +'<div id="hl3" hidden><ul class="hl-list" id="hlList"></ul></div>'
   +'<div id="hl4" hidden><div class="hl-spin" aria-hidden="true"></div><p class="hl-go" id="hlGoTxt"></p></div>'
   +'<div id="hl0" hidden><p class="hl-none">이 번호로 쓸 수 있는 가게가 아직 없어요.</p><a class="btn p full" href="/join.html">회원가입</a><button type="button" class="btn g full" id="hlBack0">다른 번호로 로그인</button></div>'
   +'<p class="hl-msg" id="hlMsg" role="status"></p>'
   +'<p class="hl-old" id="hlOld">예전처럼 들어가기: <a href="'+HOME.wash+'">워시</a> · <a href="'+HOME.check+'">체크</a> · <a href="'+HOME.dealer+'">딜러</a></p></div>';
  document.body.appendChild(box);
  function step(n){ ["hl1","hl2","hl3","hl4","hl0"].forEach(function(k){ $(k).hidden=(k!==n); }); }
  function msg(t,bad){ var m=$("hlMsg"); m.textContent=t||""; m.className="hl-msg"+(bad?" bad":""); }
  function busy(id,on){ var b=$(id); if(b) b.disabled=!!on; }
  function title(t,s){ $("hlT").textContent=t; $("hlSub").textContent=s; }
  var last=null;
  function open(){ last=document.activeElement; S={ticket:"",token:"",phone:"",places:[],att:attempt()}; title("로그인","휴대폰 번호로 로그인해요. 워시 · 체크 · 딜러 모두 여기서 들어가요."); msg(""); step("hl1"); box.hidden=false; document.documentElement.style.overflow="hidden"; setTimeout(function(){ $("hlPh").focus(); },30); }
  function close(){ box.hidden=true; document.documentElement.style.overflow=""; S.token=""; if(last&&last.focus) last.focus(); }
  function soon(){ msg("새 로그인을 준비하고 있어요. 지금은 아래 «예전처럼 들어가기»로 들어가 주세요.",true); }
  function phone(){ return $("hlPh").value.replace(/[^0-9]/g,""); }
  function sendCode(){
    var p=phone(); if(!/^01[016789]\d{7,8}$/.test(p)){ msg("휴대폰 번호를 다시 확인해 주세요.",true); return; }
    S.phone=p; busy("hlGo1",1); busy("hlRe",1); msg("");
    post("homeOtp",[p,S.att]).then(function(r){ S.ticket=r.ticket||""; $("hlTo").textContent=(r.to||"휴대폰")+" 번호로 인증번호를 보냈어요. 5분 안에 넣어 주세요."; step("hl2"); $("hlCode").value=""; setTimeout(function(){ $("hlCode").focus(); },30); })
      .catch(function(e){ e.message==="SOON"?soon():msg(e.ko?e.message:FAIL,true); })
      .then(function(){ busy("hlGo1",0); busy("hlRe",0); });
  }
  function verify(){
    var c=$("hlCode").value.replace(/[^0-9]/g,""); if(c.length!==6){ msg("인증번호 6자리를 넣어 주세요.",true); return; }
    busy("hlGo2",1); msg("");
    post("homeVerify",[S.ticket,c,S.att]).then(function(r){ S.token=r.token||""; S.places=(r.places||[]).filter(function(x){ return PROD[x.product]; });
        $("hlCode").value="";
        if(!S.places.length){
          /* 계정이 없으면 회원가입으로 이어 가요 — 인증은 끝났으니 번호를 다시 넣지 않게 «가입 표»만 같은 주소 안에서 한 번 건네요(대표님 결정 10/19) */
          if(r.joinToken && (/^[A-Za-z0-9_-]{16,}$/.test(r.joinToken)||(DEMO&&r.joinToken==="demo"))){
            try{ sessionStorage.setItem("cgg_join_vt",JSON.stringify({vt:r.joinToken,to:S.phone.replace(/^(\d{3})\d+(\d{4})$/,"$1-****-$2"),at:Date.now()})); }catch(e){}
            title("회원가입으로 이어 가요","이 번호로 가입된 가게가 없어요. 휴대폰 인증은 끝났으니 요금제부터 골라 주세요.");
            $("hlGoTxt").textContent="회원가입 화면을 여는 중이에요."; step("hl4"); S.token="";
            setTimeout(function(){ location.href = DEMO ? "../join_v7_시안.html#demo" : "/join.html"; }, DEMO?900:200); return; }
          title("가게가 없어요",""); step("hl0"); return; }
        if(S.places.length===1){ go(S.places[0]); return; }
        title("어느 가게로 들어갈까요?",(r.name?r.name+" 님, ":"")+"이 번호로 쓰는 가게가 "+S.places.length+"곳이에요.");
        $("hlList").innerHTML=S.places.map(function(x,i){ return '<li><button type="button" data-i="'+i+'"><span class="hl-pn"><b>'+esc(x.name)+'</b><small>내 역할 · '+esc(ROLE[x.role]||x.role||"")+'</small></span><span class="hl-pr hl-'+esc(x.product)+'">'+PROD[x.product]+'</span></button></li>'; }).join("");
        step("hl3"); var f=$("hlList").querySelector("button"); if(f) f.focus(); })
      .catch(function(e){ e.message==="SOON"?soon():msg(e.ko?e.message:FAIL,true); })
      .then(function(){ busy("hlGo2",0); });
  }
  function go(x){
    title("들어가는 중",""); $("hlGoTxt").textContent=x.name+" · 차곳간 "+PROD[x.product]+"로 들어가고 있어요."; step("hl4"); msg("");
    post("homeGo",[x.id,S.att],S.token).then(function(r){
        var u=String(r.url||""), ok=/^https:\/\/(app|check|dealer)\.cgg\.co\.kr\/[^\s]*#go=[A-Za-z0-9_-]{24,}$/.test(u);
        if(DEMO){ $("hlGoTxt").textContent="(예시) 실제로는 여기서 "+HOME[x.product]+" 로 넘어가요. 다시 로그인하지 않아요."; return; }
        if(!ok){ throw KO(FAIL); }
        S.token=""; location.replace(u); })
      .catch(function(e){ if(S.places.length>1){ title("어느 가게로 들어갈까요?","이 번호로 쓰는 가게가 "+S.places.length+"곳이에요."); step("hl3"); } else { title("로그인","휴대폰 번호로 로그인해요. 워시 · 체크 · 딜러 모두 여기서 들어가요."); step("hl1"); } e.message==="SOON"?soon():msg(e.ko?e.message:FAIL,true); });
  }
  $("hlGo1").onclick=sendCode; $("hlRe").onclick=sendCode; $("hlGo2").onclick=verify;
  $("hlPh").onkeydown=function(e){ if(e.key==="Enter") sendCode(); };
  $("hlCode").onkeydown=function(e){ if(e.key==="Enter") verify(); };
  $("hlBack").onclick=function(){ msg(""); step("hl1"); $("hlPh").focus(); };
  $("hlBack0").onclick=function(){ title("로그인","휴대폰 번호로 로그인해요. 워시 · 체크 · 딜러 모두 여기서 들어가요."); msg(""); step("hl1"); $("hlPh").focus(); };
  $("hlList").onclick=function(e){ var b=e.target.closest("button[data-i]"); if(b) go(S.places[+b.getAttribute("data-i")]); };
  $("hlX").onclick=close;
  box.addEventListener("keydown",function(e){ if(e.key==="Escape") close();
    if(e.key==="Tab"){ var f=Array.prototype.filter.call(box.querySelectorAll("button,input,a[href]"),function(n){ return n.offsetParent!==null&&!n.disabled; }); if(!f.length) return;
      if(e.shiftKey&&document.activeElement===f[0]){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&document.activeElement===f[f.length-1]){ e.preventDefault(); f[0].focus(); } } });
  box.addEventListener("click",function(e){ if(e.target===box) close(); });
  /* 머리말 «로그인» · 다른 로그인 링크는 이 화면을 열어요 */
  /* 폰 메뉴 · 요금제 안내 글의 «로그인»(주소 = app.cgg.co.kr)도 같은 화면으로 — 폰 메뉴는 닫아요 */
  Array.prototype.forEach.call(document.querySelectorAll('a.login, a[data-login], a[href="'+HOME.wash+'"]'),function(a){ if(box.contains(a)) return;
    a.addEventListener("click",function(e){ e.preventDefault(); var m=$("mnav"); if(m&&!m.hidden){ m.hidden=true; var b=$("burger"); if(b) b.setAttribute("aria-expanded","false"); } open(); }); });
  if(/(^|[#&])login\b/.test(location.hash)) open();
})();
