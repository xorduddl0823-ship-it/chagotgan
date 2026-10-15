/* ═══════ 계정 › 번호로 계정 찾기 (관리 v4.3 시안) ═══════
   대표님 지시 (결정 기록 2026-10-15): 모든 제품의 계정을 관리 한 곳에서 컨트롤.
   창구 모양: 워시 서버 sb12 (보안 통과) · 서버/설계/14
     hqPerson([휴대폰 전체]) → {phone, wash:[{shop,name,role,active,last_login}], washOwnerOf:[{shop,name,active}],
        check:[{office,officeName,name,role,active,pwSet}], drivers:[{id,office,officeName,name,active,lastIn,mustChange}],
        dealer:{name,active,withdrawn,lastLogin}|null, cgg:{name,products,active,twoStep,locked}|null,
        locks:{wash,check,cgg}, sessions:{wash,check,cgg,dealer}}   — 찾기만 해도 기록에 남아요
     hqPersonAct([휴대폰, 동작, 대상, 확인]) — 동작 stop · resume · pwReset · unlock · kick · grant · revoke
        멈추기 대상 all · wash · check:<검사소> · driver:<id> · dealer · cgg / 끊기 · 잠금 풀기 대상 all · wash · check · driver · cgg · dealer
        비밀번호 초기화 wash · check:<검사소> · driver:<id> → {note}. 기사 임시 비밀번호는 기사 휴대폰으로 문자로만 가요 (화면에 안 보여요)
        제품 열기(grant) 가 처음이면 {confirm:true, why} → 한 번 더 묻고 확인=true 로 다시 보내요
        한 시간에 바꿀 수 있는 횟수가 정해져 있어요 (넘으면 서버가 알려 줘요)
     hqAudit([휴대폰]) → {list:[{at,who,action,target_phone,product(=대상),result,detail}]}
     hqCheckPwSms([]) → {on} · ([true|false]) 켜고 끄기 — 체크 비밀번호 초기화는 이것이 켜져 있어야 돼요 */
var PPL = {q:"", busy:false, err:"", r:null, audit:[], pwSms:null};
var PACT_LOG = {view:"찾아봄", checkPwSms:"체크 비밀번호 문자 켜기 · 끄기"};
var PROD_NAME = {wash:"워시", check:"체크", dealer:"딜러", cgg:"통합 로그인", driver:"배달 기사", parking:"파킹", studio:"스튜디오"};
var PACT = {
  stop:   ["멈추기",        "이 계정으로 로그인할 수 없게 되고, 켜 둔 기기도 끊겨요. 자료는 그대로 남아요.", true],
  resume: ["다시 쓰기",     "멈춘 계정을 다시 쓸 수 있게 해요.", false],
  pwReset:["비밀번호 초기화","지금 비밀번호를 못 쓰게 하고 로그인을 끊어요. 워시는 본인이 «비밀번호 찾기»로, 체크는 다음 로그인 때 문자 확인으로 새로 정해요. 배달 기사는 임시 비밀번호가 기사 휴대폰으로 문자로 가요.", true],
  unlock: ["잠금 풀기",     "비밀번호 · 인증번호를 여러 번 틀려 잠긴 것을 풀어요.", false],
  kick:   ["접속 끊기",     "지금 켜 둔 기기에서 모두 로그아웃시켜요. 다시 로그인하면 쓸 수 있어요.", true],
  grant:  ["제품 열기",     "통합 로그인에서 이 제품을 쓸 수 있게 열어요.", false],
  revoke: ["제품 닫기",     "통합 로그인에서 이 제품이 사라져요. 다른 제품은 그대로예요.", true]
};
function pv(o,ks,d){ for(var i=0;i<ks.length;i++){ if(o && o[ks[i]]!==undefined && o[ks[i]]!==null && o[ks[i]]!=="") return o[ks[i]]; } return d; }
function tgtTxt(t){ t=String(t||""); var p=t.split(":");
  if(t==="all") return "모든 제품"; if(p[0]==="driver") return "배달 기사 "+(p[1]||""); return (PROD_NAME[p[0]]||p[0])+(p[1]?" · "+p[1]:""); }
function roleTxt(r){ return ({owner:"대표",staff:"직원",manager:"관리자",admin:"관리자",driver:"기사",dealer:"딜러"})[r]||r||"-"; }
/* 체크 비밀번호 초기화 준비 스위치 — 체크 서버 v26 이상(첫 비밀번호 문자 확인)이 운영 중일 때만 켜요 */
function pplSwDraw(){
  var el=$("pplSw"); if(!el) return; var on=PPL.pwSms;
  el.innerHTML='<div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
    '<div style="flex:1 1 260px;min-width:0"><b>체크 비밀번호 초기화 준비</b><div class="hint" style="margin:4px 0 0">'+
      (on==="?"?"서버 새 판(워시 sb12)이 올라가면 여기서 켜고 꺼요.":
       on===null?"불러오는 중이에요…":
       "켜 두면 체크 계정의 «비밀번호 초기화»가 돼요. 체크 서버 v26 이상이 운영 중일 때만 켜 주세요.")+'</div></div>'+
    (on===true||on===false?'<span class="pill '+(on?"run":"off")+'">'+(on?"켜짐":"꺼짐")+'</span>'+
      '<button type="button" class="btn sm'+(on?"":" primary")+'" id="pplSwBtn">'+(on?"끄기":"켜기")+'</button>':'')+'</div>';
  var b=$("pplSwBtn"); if(!b) return;
  b.onclick=function(){ var to=!PPL.pwSms;
    confirmBox("체크 비밀번호 초기화 준비를 "+(to?"켤까요?":"끌까요?"),
      to?"체크 서버 v26 이상이 운영 중인지 먼저 확인해 주세요.":"끄면 관리에서 체크 비밀번호 초기화를 할 수 없어요.", to?"켜기":"끄기", !to, function(){
      api("hqCheckPwSms",[to]).then(function(x){ PPL.pwSms=!!(x&&x.on); toast(PPL.pwSms?"켰어요":"껐어요"); pplSwDraw(); },
        function(e){ toast(e.message||"하지 못했습니다",true); }); }); };
}
function viewPpl(){
  $("main").innerHTML='<div class="dashhead"><h2>번호로 계정 찾기</h2>'+
    '<div class="sub2">휴대폰 번호 하나로 워시 · 체크 · 배달 기사 · 딜러 · 통합 로그인 계정을 한꺼번에 찾아요. 모든 동작은 한 번 더 묻고 아래 기록에 남아요.</div></div>'+
    '<div class="card"><div class="tools" style="margin:0">'+
      '<input type="tel" id="pplQ" inputmode="numeric" placeholder="휴대폰 번호 (예: 010-0000-0000)" value="'+esc(PPL.q)+'" style="max-width:320px">'+
      '<button class="btn primary" id="pplGo">찾기</button></div>'+
      '<div class="hint" style="margin:8px 0 0">본사 계정과 지금 로그인한 내 번호는 바꿀 수 없어요. 비밀번호는 화면에 보이지 않아요 (배달 기사 임시 비밀번호는 기사 휴대폰으로만 가요). 찾기만 해도 기록에 남아요.</div></div>'+
    '<div id="pplSw"></div><div id="pplBody"></div>';
  pplSwDraw();
  if(PPL.pwSms===null) api("hqCheckPwSms",[]).then(function(x){ PPL.pwSms=!!(x&&x.on); }, function(){ PPL.pwSms="?"; }).then(pplSwDraw);
  $("pplGo").onclick=pplFind;
  $("pplQ").onkeydown=function(e){ if(e.key==="Enter") pplFind(); };
  pplDraw();
}
function pplFind(){
  var q=digits($("pplQ")?$("pplQ").value:PPL.q); if($("pplQ")) PPL.q=$("pplQ").value;
  if(q.length<10) return toast("휴대폰 번호를 끝까지 넣어 주세요",true);
  PPL.busy=true; PPL.err=""; pplDraw();
  Promise.all([api("hqPerson",[q]), api("hqAudit",[q]).catch(function(){ return null; })])
    .then(function(x){ PPL.r=x[0]||{}; PPL.r.phone=PPL.r.phone||q; PPL.audit=(x[1]&&(x[1].log||x[1].rows||x[1].list))||(Array.isArray(x[1])?x[1]:[]); },
          function(e){ PPL.err=e.message||"찾지 못했습니다"; PPL.r=null; })
    .then(function(){ PPL.busy=false; pplDraw(); });
}
/* 카드 하나 = 계정 하나 (대상 하나) */
function pplCard(title, sub, st, rows, acts){
  return '<div style="border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--surface);min-width:0">'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap"><b style="font-size:15.5px">'+title+'</b>'+st+'</div>'+
    (sub?'<div class="hint" style="margin:0 0 6px">'+sub+'</div>':'')+
    rows.map(function(x){ return '<div class="kv"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'; }).join("")+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">'+
      acts.map(function(a){ return '<button type="button" class="btn sm'+(PACT[a[0]][2]?" danger":"")+'" data-pa="'+a[0]+'" data-pt="'+esc(a[1])+'" data-pn="'+esc(a[2]||"")+'">'+esc(a[3]||PACT[a[0]][0])+'</button>'; }).join("")+
    '</div></div>';
}
function stPill(active, locked){
  return active===false?'<span class="pill off">보류 · 멈춤</span>':(locked?'<span class="pill wait">잠김</span>':'<span class="pill run">진행 중</span>');
}
function pplDraw(){
  var host=$("pplBody"); if(!host) return;
  if(PPL.busy){ host.innerHTML='<div class="hint">찾는 중이에요…</div>'; return; }
  if(PPL.err){ host.innerHTML='<div class="card"><div class="hint"><b>찾지 못했습니다.</b><br>'+esc(PPL.err)+
    '<br>서버 새 판(워시 sb12, 설계 14)이 아직 안 올라갔으면 이렇게 보여요.</div></div>'; return; }
  var r=PPL.r; if(!r){ host.innerHTML=''; return; }
  var L=r.locks||{}, S=r.sessions||{}, cards=[], nm="";
  /* 워시 — 대상 wash (여러 업체에 있어도 한 계정) */
  (r.wash||[]).forEach(function(w){
    nm=nm||pv(w,["name"],"");
    var ll=pv(w,["lastLogin","last_login"],"");
    var wn=(r.washOwnerOf||[]).filter(function(o){ return o.shop===w.shop; })[0];
    cards.push(pplCard('워시', esc(pv(w,["shopName","shop_name"],wn?wn.name:""))+' <span style="opacity:.7">'+esc(w.shop||"")+'</span>',
      stPill(w.active,L.wash),
      [["역할",esc(roleTxt(w.role))],["마지막 접속",ll?esc(dt(ll,true)):"기록 없음"],["켜 둔 기기",(Number(S.wash)||0)+"대"]],
      [[w.active===false?"resume":"stop","wash","워시 · "+pv(w,["shopName","shop"],"")],["pwReset","wash","워시"]]
        .concat(L.wash?[["unlock","wash","워시"]]:[]).concat([["kick","wash","워시"]])));
  });
  /* 체크 — 대상 check:<검사소> */
  (r.check||[]).forEach(function(c){
    nm=nm||pv(c,["name"],"");
    var off=pv(c,["office","officeCode","code"],""), lk=L.check===true;
    cards.push(pplCard('체크', esc(pv(c,["officeName","office_name"],off)),
      stPill(c.active,lk),
      [["역할",esc(roleTxt(c.role))],["비밀번호",c.pwSet===false||c.pw_set===false?"아직 안 정함":"정해 둠"],["켜 둔 기기",(Number(S.check)||0)+"대"]],
      [[c.active===false?"resume":"stop","check:"+off,"체크 · "+pv(c,["officeName"],off)],["pwReset","check:"+off,"체크 · "+pv(c,["officeName"],off)]]
        .concat(lk?[["unlock","check","체크"]]:[]).concat([["kick","check","체크"]])));
  });
  /* 배달 기사 — 대상 driver:<id> (비밀번호 초기화하면 임시 비밀번호를 한 번 보여 줌) */
  (r.drivers||[]).forEach(function(d){
    nm=nm||pv(d,["name"],"");
    var id=pv(d,["id"],"");
    var li=pv(d,["lastIn","last_in"],"");
    cards.push(pplCard('배달 기사', esc(pv(d,["officeName","office"],""))+(d.name?' · '+esc(d.name):''),
      stPill(d.active,false),
      [["기사 번호",esc(String(id))],["마지막 접속",li?esc(dt(li,true)):"기록 없음"],["새 비밀번호",d.mustChange?"첫 로그인 때 바꿔야 함":"정해 둠"]],
      [[d.active===false?"resume":"stop","driver:"+id,"배달 기사"],["pwReset","driver:"+id,"배달 기사","임시 비밀번호 문자 보내기"],["unlock","driver","배달 기사"],["kick","driver","배달 기사"]]));
  });
  /* 딜러 — 대상 dealer */
  if(r.dealer && (r.dealer.name || r.dealer.active!==undefined)){
    nm=nm||pv(r.dealer,["name"],"");
    var dl=pv(r.dealer,["lastLogin","last_login"],"");
    cards.push(pplCard('딜러', r.dealer.withdrawn?'탈퇴함':'', stPill(r.dealer.active,false),
      [["마지막 접속",dl?esc(dt(dl,true)):"기록 없음"],["켜 둔 기기",(Number(S.dealer)||0)+"대"]],
      [[r.dealer.active===false?"resume":"stop","dealer","딜러"],["unlock","dealer","딜러"],["kick","dealer","딜러"]]));
  }
  /* 통합 로그인 출입 명단 — 대상 cgg, 제품 열기/닫기는 grant/revoke wash|check */
  if(r.cgg && (r.cgg.products || r.cgg.active!==undefined)){
    var pr=r.cgg.products||[];
    cards.push(pplCard('통합 로그인', '출입 명단 — 여기서 연 제품만 통합 입구에 보여요', stPill(r.cgg.active,L.cgg||r.cgg.locked),
      [["열린 제품",pr.length?esc(pr.map(function(p){ return PROD_NAME[p]||p; }).join(" · ")):"없음"],["문자 확인",r.cgg.twoStep?"함":"안 함"],["켜 둔 기기",(Number(S.cgg)||0)+"대"]],
      [[r.cgg.active===false?"resume":"stop","cgg","통합 로그인"]]
        .concat(["wash","check"].map(function(p){ return pr.indexOf(p)>=0?["revoke",p,PROD_NAME[p],PROD_NAME[p]+" 닫기"]:["grant",p,PROD_NAME[p],PROD_NAME[p]+" 열기"]; }))
        .concat(L.cgg||r.cgg.locked?[["unlock","cgg","통합 로그인"]]:[]).concat([["kick","cgg","통합 로그인"]])));
  }
  var own=(r.washOwnerOf||[]);
  var h='<div class="card"><h2>'+esc(nm||"이름 없음")+' <span class="rt">'+esc(phoneFmt(r.phone))+' · 계정 '+cards.length+'개</span></h2>'+
    (own.length?'<div class="hint" style="margin:-4px 0 10px">워시 대표로 등록된 업체: <b>'+esc(own.map(function(o){ return pv(o,["name","shopName","shop"],""); }).join(" · "))+'</b></div>':'')+
    (cards.length?'':'<div class="hint">이 번호로 된 계정이 없어요.</div>')+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">'+cards.join("")+'</div>'+
    (cards.length?'<div class="tools" style="margin:14px 0 0"><span class="hint" style="margin:0">모든 제품 한꺼번에</span>'+
      '<button type="button" class="btn sm" data-pa="unlock" data-pt="all" data-pn="모든 제품">잠금 모두 풀기</button>'+
      '<button type="button" class="btn sm danger" data-pa="kick" data-pt="all" data-pn="모든 제품">접속 모두 끊기</button></div>':'')+
    '</div>';
  var lg=PPL.audit||[];
  h+='<div class="card"><h2>기록 <span class="rt">최근 '+lg.length+'건</span></h2>'+
    (lg.length?'<div class="tablebox"><table><thead><tr><th style="width:140px">언제</th><th style="width:110px">대상</th><th>한 일</th><th style="width:90px">결과</th><th style="width:130px">누가</th></tr></thead><tbody>'+
      lg.map(function(x){ var act=pv(x,["act","action"],""), res=pv(x,["result"],"됨");
        return '<tr><td>'+esc(dt(pv(x,["at","created_at"],""),true))+'</td><td>'+esc(tgtTxt(pv(x,["target","product"],"-")))+'</td><td>'+esc(PACT_LOG[act]||(PACT[act]||[act])[0])+'</td><td>'+esc(res===true||res==="ok"?"됨":String(res).replace(/^error: ?/,"안 됨 — "))+'</td><td>'+esc(pv(x,["who","by"],"-"))+'</td></tr>'; }).join("")+
      '</tbody></table></div>':'<div class="hint">아직 기록이 없어요.</div>')+'</div>';
  host.innerHTML=h;
  Array.prototype.forEach.call(host.querySelectorAll("[data-pa]"),function(b){
    b.onclick=function(){
      var a=b.getAttribute("data-pa"), t=b.getAttribute("data-pt"), n=b.getAttribute("data-pn"), A=PACT[a];
      var label=b.textContent;
      confirmBox(label+" — "+n+"?", (nm||"")+" · "+phoneFmt(r.phone)+"\n"+A[1], label, A[2], function(){
        function done(x){ toast(label+" 했어요"+((x&&x.warn)?" · "+x.warn:((x&&x.note)?" · "+x.note:""))); pplFind(); }
        function fail(e){ toast(e.message||"하지 못했습니다",true); }
        api("hqPersonAct",[r.phone, a, t]).then(function(x){
          /* 제품 열기가 처음이면 서버가 한 번 더 물어요 — 다른 제품이 막힐 수 있어서 */
          if(x && x.confirm) return confirmBox("한 번 더 확인해 주세요", x.why||"", "그래도 "+label, false, function(){
            api("hqPersonAct",[r.phone, a, t, true]).then(done, fail); });
          done(x);
        }, fail);
      });
    };
  });
}
