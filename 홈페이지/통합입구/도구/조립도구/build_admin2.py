# -*- coding: utf-8 -*-
# build_admin.py 안에서 exec 됩니다 (a, rep, block 을 같이 씁니다)

# ───── 메뉴: 17개 → 워시처럼 8개 + 설정 ▸ (옮긴 것은 아래 줄 그대로 다 있습니다) ─────
i0, i1 = block(a, "function render(){")
rep(a[i0:i1], r'''/* 위 메뉴 — 워시 탭과 같은 모양 (UI 1.1).
   17개 화면은 하나도 빼지 않았습니다. 비슷한 것끼리 8묶음으로 묶고, 묶음 안 화면은 둘째 줄 작은 탭으로 고릅니다.
   내 계정은 설정 안 + 오른쪽 위 「👤 마이페이지」 단추로도 갑니다. */
var NAV = [   /* 19차 추천안 그대로 (다른 방 인수인계 14-5) — 확인 대기 */
  ["sum","홈",["sum","ops"]],
  ["shops","업체",["shops","lock"]],
  ["users","계정",["users","inv"]],
  ["pays","받는 돈",["plans","pays","packs","pg"]],
  ["settle","내는 돈",["settle","svc"]],
  ["tax","세금계산서",["tax"]],
  ["noti","알림",["noti","sms"]],
  ["settings","설정",["sec","me"]]
];
var NAV_LAST = {}, NAV_PREV = "sum";
function navOf(t){ return NAV.filter(function(g){ return g[2].indexOf(t)>=0; })[0]||null; }
function tabLabel(t){ var f=TABS.filter(function(x){return x[0]===t;})[0]; return f?f[1]:t; }
function render(){
  var g = navOf(TAB);
  if(g) NAV_LAST[g[0]] = TAB;
  $("nav").innerHTML = NAV.map(function(n){
    var on = !!g && g[0]===n[0];
    var label = n[1];
    if(n[0]==="settings") label += (on?" ▾":" ▸");
    return '<button data-t="'+n[0]+'" role="tab" title="'+esc(n[1])+'" aria-selected="'+on+'">'+esc(label)+'</button>';
  }).join("");
  Array.prototype.forEach.call($("nav").children,function(b){
    b.onclick=function(){
      var k=b.getAttribute("data-t"), cur=navOf(TAB);
      /* 설정을 한 번 더 누르면 원래 보던 화면으로 — 워시와 같음 */
      if(k==="settings" && cur && cur[0]==="settings"){ TAB=NAV_PREV||"sum"; window.scrollTo(0,0); render(); return; }
      if(!cur || cur[0]!=="settings") NAV_PREV=TAB;
      var n=NAV.filter(function(x){return x[0]===k;})[0];
      /* 설정만 마지막에 본 작은 탭을 기억합니다 (워시와 같음). 나머지 묶음은 누르면 첫 화면 */
      TAB = (k==="settings" && NAV_LAST[k]) || n[2][0];
      window.scrollTo(0,0); render(); };
  });
  /* 둘째 줄 — 묶음 안에 화면이 둘 이상일 때만 (워시 설정 줄과 같은 모양) */
  var subs = g ? g[2] : [];
  $("setSub").hidden = subs.length<2;
  $("setSub").setAttribute("data-label", g ? g[1] : "");
  $("setSub").innerHTML = subs.length<2 ? "" : subs.map(function(t){
    return '<button data-s="'+t+'" aria-selected="'+(t===TAB)+'">'+esc(tabLabel(t))+'</button>'; }).join("");
  Array.prototype.forEach.call($("setSub").children,function(b){
    b.onclick=function(){ TAB=b.getAttribute("data-s"); window.scrollTo(0,0); render(); }; });
  var f = TABS.filter(function(t){return t[0]===TAB;})[0];
  (f?f[2]:viewSummary)();
}''')

# ───── 머리말 채우기 · 로그인 글씨 ─────
i0, i1 = block(a, "function showGate(msg){")
rep(a[i0:i1], '''function showGate(msg){
  $("app").style.display="none";
  $("gate").style.display="flex";
  gmsg(msg||"", !!msg);
  closeSheet();
}''')
i0, i1 = block(a, "function showApp(){")
rep(a[i0:i1], '''function showApp(){
  $("gate").style.display="none";
  $("app").style.display="block";
  hdrFill();
  render();
}
/* 머리말 — 워시와 같은 자리에 같은 모양 (상호 · 사업자 · 대표) */
function fmtBizNo(v){var n=String(v||"").replace(/[^0-9]/g,"");
  return n.length===10?(n.slice(0,3)+"-"+n.slice(3,5)+"-"+n.slice(5)):String(v||"");}
function hdrFill(){
  $("meName").textContent=(D.me&&D.me.name)||"-";
  $("meRole").textContent="본사 관리자";
  var av=$("hAv"); if(av){ var nm0=(D.me&&D.me.name)||""; av.textContent=nm0?nm0.slice(0,1):"·"; av.hidden=!nm0; }
  var hq=D.hq||{}, nm=String(hq.biz_name||"차곳간 본사");
  var bn=nm.length>15?nm.slice(0,15)+"…":nm;
  $("hBiz").hidden=false;
  $("hBiz").innerHTML='<b title="'+esc(nm)+'">'+esc(bn)+'</b>'+
    (hq.biz_no?('<small>사업자 '+esc(fmtBizNo(hq.biz_no))+(hq.ceo?(' · 대표 '+esc(hq.ceo)):"")+'</small>'):"");
}''')
rep('''function gmsg(x,bad){ $("gMsg").textContent=x||""; $("gMsg").className="msg"+(bad?" bad":""); }''',
'''function gmsg(x,bad){ var m=$("gMsg"); m.textContent=x||""; m.style.color=bad?"var(--danger,#b3261e)":"var(--good,#127a4b)"; }''')
rep('''$("btnReload").onclick=function(){''', '''$("hWho").onclick=function(){ TAB="me"; window.scrollTo(0,0); render(); };
$("btnReload").onclick=function(){''')
rep('''  loadAll().then(function(){ render(); toast("새로 불러왔습니다"); })''',
    '''  loadAll().then(function(){ hdrFill(); render(); toast("새로 불러왔습니다"); })''')

# ───── 홈 — 워시 홈 뼈대 그대로 (dashhead → sums → dash homegrid(hgL 일정 / hgR 할 일·수금·업체) → 아래 넓은 카드) ─────
i0, i1 = block(a, "function viewSummary(){")
rep(a[i0:i1], r'''function viewSummary(){
  var s = D.sum || {};
  var now = new Date();
  if(!CALM) CALM = new Date(now.getFullYear(), now.getMonth(), 1);
  var Y = CALM.getFullYear(), M = CALM.getMonth()+1;
  function ds(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  var todayK = ds(now);

  /* ── 손봐야 할 것 — 원래 계산 그대로 모읍니다 ── */
  var stop=[], late=[], unpaid=[], noPrice=[], svcBad=[];
  (D.shops||[]).forEach(function(s2){
    if(s2.shop==="ADMIN") return;
    if(s2.active===false) stop.push(s2);
    if(s2.paid_until && new Date(s2.paid_until).getTime() < Date.now()) late.push(s2);
  });
  (D.pays||[]).filter(function(p){return p.status==="ready";}).forEach(function(p){ unpaid.push(p); });
  (D.plans||[]).forEach(function(p){ if(p.active && !p.price) noPrice.push(p); });
  (D.svcs||[]).filter(function(v){return v.active!==false;}).forEach(function(v){
    var st = svcState(v); if(st.lv===2) svcBad.push({v:v,st:st}); });
  var unpaidAmt = unpaid.reduce(function(a2,p){ return a2+(Number(p.amount)||0); },0);
  var prof = Number(s.salesMonth||0) - Number(s.expMonth||0);
  function names(list,f,n){ n=n||3; return list.slice(0,n).map(f).join(", ")+(list.length>n?" 외":""); }

  /* ── 달력 칸 — 워시 달력과 같은 이름표 (d · n · todaytag · amt · cars · memo) ── */
  var byDay = {};
  calEvents().forEach(function(e){ (byDay[e.d]||(byDay[e.d]={w:0,b:0,r:0,amt:0}));
    if(e.c==="w"){ byDay[e.d].w++; byDay[e.d].amt += Number(e.cost||0); }
    else if(e.c==="d") byDay[e.d].r++;
    else if(e.c!=="g") byDay[e.d].b++; });
  var memoBy = {};
  (TODO.list||[]).forEach(function(t){ if(!t.due_at) return; var k=String(t.due_at).slice(0,10); (memoBy[k]=memoBy[k]||[]).push(t); });
  var first = new Date(Y,M-1,1), last = new Date(Y,M,0).getDate();
  var cal = "";
  for(var i=0;i<first.getDay();i++) cal += '<div class="d blank"></div>';
  var tw=0, tb=0, tr=0, tamt=0, tmemo=0;
  for(var day=1; day<=last; day++){
    var k = Y+"-"+String(M).padStart(2,"0")+"-"+String(day).padStart(2,"0");
    var v = byDay[k], ms = memoBy[k]||[], open = ms.filter(function(m){return !m.done;});
    var isToday = (k===todayK), dow = (first.getDay()+day-1)%7;
    if(v){ tw+=v.w; tb+=v.b; tr+=v.r; tamt+=v.amt; }
    tmemo += open.length;
    var parts = [];
    if(v && v.w) parts.push('<span style="color:var(--warn)">결제 '+v.w+'</span>');
    if(v && v.b) parts.push('<span style="color:var(--brand)">기한 '+v.b+'</span>');
    if(v && v.r) parts.push('<span style="color:var(--danger)">체험 '+v.r+'</span>');
    cal += '<div class="d'+(isToday?" today":"")+'" data-k="'+k+'">'+
      '<div class="n'+(dow===0?" sun":"")+'">'+day+(isToday?'<span class="todaytag">오늘</span>':'')+'</div>'+
      (v && v.amt ? '<div class="amt">'+won(v.amt)+'</div>' : '')+
      (parts.length ? '<div class="cars">'+parts.join(" · ")+'</div>' : '')+
      (ms.length ? ('<div class="memo'+(open.length?"":" done")+'" title="'+esc(ms.map(function(m){return m.title;}).join("\n"))+'">📝 '+
        esc((open[0]||ms[0]).title)+(ms.length>1?(" 외 "+(ms.length-1)):"")+'</div>') : '')+
      '</div>';
  }

  /* ── 오늘 할 일 — 워시와 같은 [숫자, 제목, 설명, 누르면, 중요] 꼴 ── */
  function go(t){ return function(){ TAB=t; window.scrollTo(0,0); render(); }; }
  var memoToday = (TODO.list||[]).filter(function(t){ return !t.done && (!t.due_at || String(t.due_at).slice(0,10)===todayK); });
  var memoOld   = (TODO.list||[]).filter(function(t){ return !t.done && t.due_at && String(t.due_at).slice(0,10)<todayK; });
  var memoTodos = memoToday.slice(0,5).map(function(m){
    return ["📝","오늘 메모 · "+m.title,"누르면 완료 표시·지우기",function(){ hqDaySheet(todayK); }]; });
  if(memoToday.length>5) memoTodos.push([memoToday.length-5,"오늘 메모 더 있음","달력 오늘 칸을 눌러 보세요",function(){ hqDaySheet(todayK); }]);
  if(memoOld.length) memoTodos.push([memoOld.length,"지난 날 메모 · 아직 안 끝남",
    String(memoOld[0].due_at).slice(5,10).replace("-","/")+" "+memoOld[0].title+(memoOld.length>1?" 외":""),
    function(){ hqDaySheet(String(memoOld[0].due_at).slice(0,10)); }]);
  var todos = memoTodos.concat([
    [unpaid.length,"못 받은 돈", unpaid.length?(won(unpaidAmt)+" · "+names(unpaid,function(p){return p.shopName||p.biz_name||"";})):"", go("pays"),"imp"],
    [late.length,"이용 기한 지남", names(late,function(x){return x.name||x.shop;}), go("pays"),"imp"],
    [svcBad.length,"유지비 — 끊기기 직전", names(svcBad,function(x){return x.v.name+" "+x.st.txt;},2), go("svc"),"imp"],
    [stop.length,"멈춘 업체", stop.length?names(stop,function(x){return x.name||x.shop;}):"이용이 멈춘 곳", go("shops")],
    [Number(s.waitInvite||0),"가입 코드 · 아직 가입 안 함","코드를 받고 가입을 안 한 번호", go("inv")],
    [noPrice.length,"요금 미정 요금제", noPrice.length?names(noPrice,function(p){return p.name;}):"금액이 0원인 요금제", go("plans")]
  ]);   /* 0건도 빼지 않습니다 — 워시와 같이 늘 세 줄이 보입니다 */

  /* ── 아래 넓은 카드 — 운영 상태 · 유지비 ── */
  var u=OPS.usage, L=OPS.limits||{dbGb:8,fileGb:100,warnPct:80};
  var sms=(OPS.services||[]).filter(function(x){return x.code==="solapi";})[0];
  var smsLow = !!(sms&&sms.minBal>0&&sms.balance<sms.minBal);
  var svcs = (D.svcs||[]).filter(function(x){return x.active!==false;})
    .sort(function(x,y){ return svcState(y).lv - svcState(x).lv || (x.sort||0)-(y.sort||0); });

  var h =
    '<div class="dashhead"><div class="dh-row"><h2>'+Y+'년 '+M+'월</h2></div>'+
      '<div class="sub2">오늘 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 · '+
        String(now.getHours()).padStart(2,"0")+':'+String(now.getMinutes()).padStart(2,"0")+' 기준</div></div>'+
    /* 이번 달 숫자 칸 4개 — 워시·체크와 같은 자리 */
    '<div class="sums" id="homeSums">'+
      [["업체",(s.shops||0)+"곳","shops",""],
       ["이번 달 번 돈",won(s.salesMonth),"pays",""],
       ["이번 달 쓴 돈",won(s.expMonth),"settle",""],
       ["못 받은 돈",won(unpaidAmt),"pays","bad"]].map(function(x){
        return '<div class="sum'+(x[3]?" "+x[3]:"")+'" data-go="'+x[2]+'"><span>'+esc(x[0])+'</span><b>'+x[1]+'</b></div>'; }).join("")+
    '</div>'+
    '<div class="dash homegrid">'+
      '<div class="hgL">'+
        '<div class="card">'+
          '<h2>일정</h2>'+
          '<div class="tools" style="margin:0 0 4px">'+
            '<button class="btn" id="calPrev">‹ 지난달</button>'+
            '<button class="btn" id="calNow">이번 달</button>'+
            '<button class="btn" id="calNext">다음달 ›</button>'+
            '<span class="hint" id="calLabel">'+Y+'년 '+M+'월</span>'+
          '</div>'+
          '<div class="dow"><span class="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span></div>'+
          '<div class="cal" id="cal">'+cal+'</div>'+
          '<div class="legend" id="calSum">'+
            '<span>이 달 유지비 <b>'+won(tamt)+'</b></span>'+
            '<span><span style="color:var(--warn)">■</span> 유지비 결제일 <b>'+tw+'건</b></span>'+
            '<span><span style="color:var(--brand)">■</span> 업체 이용기한 <b>'+tb+'건</b></span>'+
            '<span><span style="color:var(--danger)">■</span> 체험 끝 <b>'+tr+'건</b></span>'+
            '<span>📝 할 일 <b>'+tmemo+'건</b></span>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="hgR">'+
        '<div class="card">'+
          '<h2>오늘 할 일</h2>'+
          '<div class="todo" id="dashTodo"></div>'+
        '</div>'+
        '<div class="card" id="dashMoneyCard">'+
          '<h2>이번 달 수금</h2>'+
          '<div id="dashMoney"></div>'+
        '</div>'+
        '<div class="card">'+
          '<h2>업체·계정 <span class="rt" id="dashStatTop">7일 동안 쓴 기기 '+(s.active7||0)+'대</span></h2>'+
          '<div id="dashStat">'+
            '<div class="mini-row"><span>업체</span><b>'+(s.shops||0)+' 곳</b></div>'+
            '<div class="mini-row"><span>쓰는 곳 / 멈춘 곳</span><b>'+Math.max(0,(s.shops||0)-(s.shopsOff||0))+' 곳 / '+(s.shopsOff||0)+' 곳</b></div>'+
            '<div class="mini-row"><span>로그인 계정 / 쓸 수 있는 것</span><b>'+(s.users||0)+' 개 / '+(s.usersOn||0)+' 개</b></div>'+
            '<div class="mini-row"><span>가입 코드 대기</span><b>'+(s.waitInvite||0)+' 건</b></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    /* 운영 상태 — 격자 밖 전체 너비 (워시 「작업 항목별」 자리) */
    '<div class="card">'+
      '<h2>운영 상태 <span class="rt"><button class="btn sm" id="goOps">자세히 보기 ›</button></span></h2>'+
      '<div class="sums">'+
        '<div class="sum"><span>자료(DB) 용량</span><b>'+(u?gbTxt(u.db_bytes):"—")+'</b></div>'+
        '<div class="sum"><span>차량 사진 용량</span><b>'+(u?gbTxt(u.file_bytes):"—")+'</b></div>'+
        '<div class="sum"><span>다달이 나가는 돈</span><b>'+won(OPS.monthCost||0)+'</b></div>'+
        '<div class="sum'+(smsLow?" bad":"")+'"><span>문자 남은 돈</span><b>'+(sms?won(sms.balance):"—")+'</b></div>'+
      '</div>'+
      '<div class="legend" style="margin-top:0">'+
        '<span>DB 한도 <b>'+L.dbGb+' GB</b></span>'+
        '<span>사진 한도 <b>'+L.fileGb+' GB</b>'+(u?(' · '+cnt(u.file_cnt)):'')+'</span>'+
        '<span>문자 '+(sms&&sms.balanceAt?("확인 <b>"+esc(dtTime(sms.balanceAt))+"</b>"):"유지비에서 받아오세요")+'</span>'+
      '</div>'+
      (u ? ('<div class="gauges" style="margin:12px 0 0">'+
        opsGauge("자료(DB)",u.db_bytes,L.dbGb,L.warnPct,"업체 기록 · 입출고 · 정산 같은 글자 자료입니다.")+
        opsGauge("차량 사진",u.file_bytes,L.fileGb,L.warnPct,"<b>※ 사진은 자동 백업에 들어가지 않습니다.</b>")+
        '</div>') : '')+
    '</div>'+
    /* 유지비 — 돈을 내야 시스템이 도는 곳 */
    '<div class="card">'+
      '<h2>유지비 — 끊기면 안 되는 곳 <span class="rt">'+(svcBad.length?("끊기기 직전 "+svcBad.length+"곳"):"모두 정상")+'</span></h2>'+
      '<div class="hint" style="margin:-6px 0 12px">충전·결제가 밀리면 문자·주소·서버가 멈춥니다. 「바로 가기」를 누르면 그 회사 결제 화면이 열립니다.</div>'+
      (!svcs.length ? '<div class="hint">운영 서비스 표가 아직 없습니다. 유지비 화면에서 DB 반영을 먼저 해주세요.</div>' :
        ('<div class="svcList">'+svcs.map(function(x){
          var st = svcState(x);
          return '<div class="svcRow lv'+st.lv+'">'+
            '<span class="sN">'+esc(x.name)+
              (x.auto?' <span class="autoTag">자동</span>':' <span class="autoTag hand">직접</span>')+'</span>'+
            '<span class="sW">'+esc(st.note||x.what||"")+'</span>'+
            '<span class="sS">'+svcPill(st.lv)+' <b>'+esc(st.txt)+'</b></span>'+
            (x.url?('<a class="btn sm" href="'+esc(x.url)+'" target="_blank" rel="noopener">바로 가기</a>'):'')+
            '</div>'; }).join("")+'</div>'+
         '<div class="tools" style="margin:12px 0 0">'+
           '<button class="btn sm" id="svcGo">유지비 화면에서 고치기</button>'+
           '<button class="btn sm" id="svcRef">연결된 곳 상태 새로 받기</button></div>'))+
    '</div>';
  $("main").innerHTML = h;

  /* 오늘 할 일 — 워시 todoBtn · 「모두 보기」 그대로 */
  var box=$("dashTodo");
  function todoBtn(t, onGo){
    var b=document.createElement("button");
    var isMemo=typeof t[0]==="string";
    if(t[4]==="imp")b.className="imp";
    if(isMemo){b.style.background="#fff7ec";b.style.borderColor="#f0c48a";}
    b.innerHTML='<span class="cnt" style="color:'+(isMemo?"#b45309":"var(--brand)")+';'+(isMemo&&t[0].length>2?"font-size:15px":"")+'">'+esc(String(t[0]))+'</span>'+
      '<span class="tx"><b>'+(t[4]==="imp"?'<span class="imptag">중요</span>':"")+esc(t[1])+'</b><span>'+esc(t[2])+'</span></span><span class="go">›</span>';
    b.onclick=function(){ if(onGo) onGo(); t[3](); window.scrollTo(0,0); };
    return b;
  }
  todos.slice(0,3).forEach(function(t){ box.appendChild(todoBtn(t)); });
  if(todos.length>3){
    var more=document.createElement("button");
    more.type="button"; more.className="todoMore";
    more.innerHTML='할 일 <b>'+todos.length+'건</b> 모두 보기';
    more.onclick=function(){ todoSheet(todos, todoBtn); };
    box.appendChild(more);
  }

  /* 이번 달 수금 — 워시 수금 카드와 같은 모양 */
  var paid=Number(s.salesMonth||0), billed=paid+unpaidAmt;
  var pct=billed?Math.round(paid/billed*100):0;
  $("dashMoney").innerHTML=
    '<div style="font-size:24px;font-weight:900">'+won(paid)+' <span style="font-size:13px;color:var(--muted);font-weight:600">수금</span></div>'+
    '<div class="prog"><i style="width:'+pct+'%"></i></div>'+
    '<div class="legend"><span>받을 것 <b style="color:var(--warn)">'+won(unpaidAmt)+'</b></span>'+
    '<span>받은 것 <b style="color:var(--good)">'+won(paid)+'</b></span><span><b>'+pct+'%</b></span></div>'+
    '<div class="mini-row" style="margin-top:8px"><span>이번 달 남은 것 (번 돈 − 쓴 돈)</span><b'+(prof<0?' style="color:var(--danger)"':'')+'>'+won(prof)+'</b></div>';

  /* 칸을 누르면 그 화면으로 · 달력 칸을 누르면 그날 창 */
  Array.prototype.forEach.call($("main").querySelectorAll("[data-go]"), function(el){
    el.onclick = function(){ TAB = el.getAttribute("data-go"); window.scrollTo(0,0); render(); };
  });
  $("cal").querySelectorAll(".d[data-k]").forEach(function(el){
    el.onclick=function(){ hqDaySheet(el.getAttribute("data-k")); }; });
  if($("svcGo")) $("svcGo").onclick=function(){ TAB="svc"; window.scrollTo(0,0); render(); };
  if($("svcRef")) $("svcRef").onclick=svcRefresh;
  if($("goOps")) $("goOps").onclick=function(){ TAB="ops"; window.scrollTo(0,0); render(); };
  calBind();
  if(TODO.list===null) todoLoad();
  if(!OPS.loaded){ opsLoad(); }
}
/* 오늘 할 일 모두 보기 — 워시 todoSheet 그대로 */
function todoSheet(list, mk){
  $("sheet").innerHTML='<h3 style="margin:0 0 2px">오늘 할 일</h3>'+
    '<div style="color:var(--muted);font-size:12.5px;margin-bottom:13px">모두 '+list.length+
      '건입니다. 누르면 그 화면으로 갑니다.</div>'+
    '<div class="todo" id="todoAll"></div>'+
    '<div class="sheetbtns"><button class="btn" id="todoClose">닫기</button></div>';
  openSheet();
  var all=$("todoAll");
  list.forEach(function(t){ all.appendChild(mk(t, closeSheet)); });
  $("todoClose").onclick=closeSheet;
}
/* 달력 날짜 창 — 워시 daySheet 와 같은 모양 (메모 상자 + 그날 일정) */
function hqDaySheet(k){
  var p=k.split("-");
  var evs=calEvents().filter(function(e){ return e.d===k && e.c!=="g"; });
  var ms=(TODO.list||[]).filter(function(t){ return t.due_at && String(t.due_at).slice(0,10)===k; });
  var n0=new Date(), tk=n0.getFullYear()+"-"+String(n0.getMonth()+1).padStart(2,"0")+"-"+String(n0.getDate()).padStart(2,"0");
  if(k===tk) ms=ms.concat((TODO.list||[]).filter(function(t){ return !t.due_at; }));
  $("sheet").innerHTML='<h3>'+Number(p[1])+'월 '+Number(p[2])+'일</h3>'+
   '<div class="sub" style="color:var(--muted);font-size:13px">일정 '+evs.length+'건 · 메모 '+ms.length+'건</div>'+
   '<div class="card" style="background:#fff7ec;border-color:#f0c48a;box-shadow:none;margin:12px 0 0;padding:12px 14px">'+
    '<div style="font-weight:800;color:#8a4a00;margin-bottom:4px">📝 이 날 메모 · 할 일 <small style="font-weight:600">('+ms.filter(function(m){return !m.done;}).length+'건 남음)</small></div>'+
    '<div id="mmList">'+(ms.length?ms.map(function(m){
      return '<div class="memorow'+(m.done?" done":"")+'"><input type="checkbox" data-mdone="'+esc(m.id)+'"'+(m.done?" checked":"")+' title="끝나면 체크">'+
        '<div class="mt">'+esc(m.title)+'</div>'+
        '<button class="btn danger" data-mdel="'+esc(m.id)+'" style="padding:6px 10px;font-size:13px">삭제</button></div>';}).join("")
      :'<div class="hint" style="padding:6px 0">아직 메모가 없습니다. 아래에 적으면 이 날 달력과 홈 [오늘 할 일]에 뜹니다.</div>')+'</div>'+
    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'+
      '<input type="text" id="mmText" placeholder="예) QR 스티커 교체 / 문자 충전" style="flex:1;min-width:200px">'+
      '<button class="btn primary" id="mmAdd">메모 추가</button></div>'+
   '</div>'+
   '<div class="f" style="margin:14px 0 4px">이 날 일정</div>'+
   '<div style="max-height:34vh;overflow:auto">'+
   (evs.length?evs.map(function(e,i){
     return '<div class="kv"><span><b>'+esc(e.t)+'</b></span><b><button class="btn sm" data-ev="'+i+'">보기 ›</button></b></div>'; }).join("")
    :'<div class="empty">이 날은 일정이 없습니다.</div>')+'</div>'+
   '<div class="sheetbtns"><button class="btn" id="dsClose">닫기</button></div>';
  openSheet();
  $("dsClose").onclick=closeSheet;
  var again=function(){ api("hqTodo",[]).then(function(r){ TODO.list=(r&&r.todo)||[]; })
    .then(function(){ hqDaySheet(k); if(TAB==="sum") viewSummary(); }); };
  $("mmAdd").onclick=function(){
    var t=$("mmText").value.trim(); if(!t) return toast("메모 내용을 적어주세요",true);
    api("hqTodoAdd",[t,k]).then(function(){ toast("메모를 적었습니다"); again(); }).catch(function(e){ toast(e.message,true); });
  };
  $("mmText").onkeydown=function(e){ if(e.key==="Enter"&&!e.isComposing) $("mmAdd").click(); };
  $("sheet").querySelectorAll("[data-mdone]").forEach(function(c){
    c.onchange=function(){ api("hqTodoDone",[Number(c.getAttribute("data-mdone")), c.checked])
      .then(again).catch(function(e){ toast(e.message,true); }); }; });
  $("sheet").querySelectorAll("[data-mdel]").forEach(function(b){
    b.onclick=function(){ api("hqTodoDel",[Number(b.getAttribute("data-mdel"))])
      .then(function(){ toast("지웠습니다"); again(); }).catch(function(e){ toast(e.message,true); }); }; });
  $("sheet").querySelectorAll("[data-ev]").forEach(function(b){
    b.onclick=function(){ var e=evs[Number(b.getAttribute("data-ev"))]; closeSheet(); TAB=e.go; window.scrollTo(0,0); render(); }; });
}''')

# 유지비 결제일 금액을 달력 칸 금액에 쓰도록 — 일정 자료에 cost 만 하나 더 실어 둡니다 (화면 계산용)
rep('''      t:v.name+(Number(v.cost||0)?(" "+won(v.cost)):"")+" 결제", c:"w", go:"svc"});''',
    '''      t:v.name+(Number(v.cost||0)?(" "+won(v.cost)):"")+" 결제", c:"w", go:"svc", cost:Number(v.cost||0)});''')

# 머리(head) — 글꼴 줄을 워시와 똑같이 (굵기 900 포함), 테마색도 워시와 같게
rep('<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap" rel="stylesheet">',
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">')
rep('<meta name="theme-color" content="#0B2545">', '<meta name="theme-color" content="#1668C4">')

# 손으로 짠 표 (요금제 비교 · 단가표 · 수수료 계산) — 워시 표 이름표로
rep('class="twrap cmpWrap"', 'class="tablebox cmpWrap"', None)
rep('class="twrap"', 'class="tablebox"', None)
rep('<th class="stick">', '<th class="c-name" style="left:0">', None)
rep('<td class="stick">', '<td class="c-name" style="left:0">', None)
rep('table.cmp th.stick,table.cmp td.stick{', 'table.cmp th.c-name,table.cmp td.c-name{')
rep('table.cmp thead th.stick{', 'table.cmp thead th.c-name{')
