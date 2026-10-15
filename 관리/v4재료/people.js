/* ═══════ 계정 › 번호로 찾기 (관리 v4.3 시안) ═══════
   대표님 지시 (결정 기록 2026-10-15): 모든 제품의 계정을 관리 한 곳에서 컨트롤.
   창구 이름은 시안용 가칭 — 서버 방이 정해 주면 맞춰요.
     hqPerson([휴대폰])  → {ok, phone, name, products:[{product, shop, shopName, role, active, locked, open, lastLogin, devices}], log:[{at, who, product, act, note}]}
     hqPersonAct([휴대폰, product, act]) → {ok, note}
       act: stop(멈추기) · resume(다시 쓰기) · pwReset(비밀번호 초기화) · unlock(잠금 풀기) · open(제품 열기) · close(제품 닫기) · kick(접속 끊기) */
var PPL = {q:"", busy:false, err:"", r:null};
var PROD_NAME = {wash:"워시", check:"체크", dealer:"딜러", parking:"파킹", studio:"스튜디오"};
var PACT = {
  stop:   ["멈추기",        "이 제품에 로그인할 수 없게 돼요. 자료는 그대로 남아요.", true],
  resume: ["다시 쓰기",     "멈춘 계정을 다시 쓸 수 있게 해요.", false],
  pwReset:["비밀번호 초기화","새 임시 비밀번호를 본인 휴대폰으로 보내요. 지금 켜 둔 기기는 모두 로그아웃돼요.", true],
  unlock: ["잠금 풀기",     "비밀번호를 여러 번 틀려 잠긴 것을 풀어요.", false],
  open:   ["제품 열기",     "이 사람이 이 제품을 쓸 수 있게 열어요.", false],
  close:  ["제품 닫기",     "이 제품 메뉴가 이 사람에게서 사라져요. 다른 제품은 그대로예요.", true],
  kick:   ["접속 끊기",     "지금 켜 둔 기기에서 모두 로그아웃시켜요. 다시 로그인하면 쓸 수 있어요.", true]
};
function viewPpl(){
  $("main").innerHTML='<div class="dashhead"><h2>번호로 계정 찾기</h2>'+
    '<div class="sub2">휴대폰 번호 하나로 워시 · 체크 · 딜러 계정을 한꺼번에 찾아 멈추기 · 비밀번호 초기화 · 잠금 풀기 · 제품 열기/닫기 · 접속 끊기를 해요. 모든 동작은 한 번 더 묻고 기록에 남아요.</div></div>'+
    '<div class="card"><div class="tools" style="margin:0">'+
      '<input type="tel" id="pplQ" inputmode="numeric" placeholder="휴대폰 번호 (예: 010-0000-0000)" value="'+esc(PPL.q)+'" style="max-width:320px">'+
      '<button class="btn primary" id="pplGo">찾기</button></div></div>'+
    '<div id="pplBody"></div>';
  $("pplGo").onclick=pplFind;
  $("pplQ").onkeydown=function(e){ if(e.key==="Enter") pplFind(); };
  pplDraw();
}
function pplFind(){
  var q=digits($("pplQ").value); PPL.q=$("pplQ").value;
  if(q.length<10) return toast("휴대폰 번호를 끝까지 넣어 주세요",true);
  PPL.busy=true; PPL.err=""; pplDraw();
  api("hqPerson",[q]).then(function(r){ PPL.r=r||null; },function(e){ PPL.err=e.message||"찾지 못했습니다"; PPL.r=null; })
    .then(function(){ PPL.busy=false; pplDraw(); });
}
function pplDraw(){
  var host=$("pplBody"); if(!host) return;
  if(PPL.busy){ host.innerHTML='<div class="hint">찾는 중이에요…</div>'; return; }
  if(PPL.err){ host.innerHTML='<div class="card"><div class="hint"><b>찾지 못했습니다.</b><br>'+esc(PPL.err)+
    '<br>서버 새 판(계정 한곳 관리 창구)이 아직 안 올라갔으면 이렇게 보여요.</div></div>'; return; }
  var r=PPL.r; if(!r){ host.innerHTML=''; return; }
  var ps=r.products||[];
  var h='<div class="card"><h2>'+esc(r.name||"이름 없음")+' <span class="rt">'+esc(phoneFmt(r.phone))+' · 제품 '+ps.length+'개</span></h2>'+
    (ps.length?'':'<div class="hint">이 번호로 가입한 제품이 없어요.</div>')+
    '<div class="ppl-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">'+
    ps.map(function(p,i){
      var st=!p.open?'<span class="pill gray">닫힘</span>':(p.active===false?'<span class="pill off">보류 · 멈춤</span>':(p.locked?'<span class="pill wait">잠김</span>':'<span class="pill run">진행 중</span>'));
      /* 닫힌 제품은 «제품 열기»만 */
      var acts=!p.open?["open"]:[p.active===false?"resume":"stop","pwReset"].concat(p.locked?["unlock"]:[]).concat(["close","kick"]);
      return '<div style="border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--surface)">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:15.5px">'+esc(PROD_NAME[p.product]||p.product)+'</b>'+st+'</div>'+
        '<div class="kv"><span>업체</span><b>'+esc(p.shopName||p.shop||"-")+'</b></div>'+
        '<div class="kv"><span>역할</span><b>'+esc(({owner:"대표",staff:"직원",dealer:"딜러",admin:"관리자",driver:"기사"})[p.role]||p.role||"-")+'</b></div>'+
        '<div class="kv"><span>마지막 접속</span><b>'+(p.lastLogin?esc(dt(p.lastLogin,true)):"기록 없음")+'</b></div>'+
        '<div class="kv"><span>켜 둔 기기</span><b>'+(Number(p.devices)||0)+'대</b></div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">'+
          acts.map(function(a){ return '<button type="button" class="btn sm'+(PACT[a][2]?" danger":"")+'" data-pa="'+a+'" data-pi="'+i+'">'+PACT[a][0]+'</button>'; }).join("")+
        '</div></div>'; }).join("")+'</div></div>';
  var lg=r.log||[];
  h+='<div class="card"><h2>기록 <span class="rt">최근 '+lg.length+'건</span></h2>'+
    (lg.length?'<div class="tablebox"><table><thead><tr><th style="width:140px">언제</th><th style="width:90px">제품</th><th>한 일</th><th style="width:120px">누가</th></tr></thead><tbody>'+
      lg.map(function(x){ return '<tr><td>'+esc(dt(x.at,true))+'</td><td>'+esc(PROD_NAME[x.product]||x.product||"-")+'</td><td>'+esc((PACT[x.act]||[x.act])[0])+(x.note?' · '+esc(x.note):'')+'</td><td>'+esc(x.who||"-")+'</td></tr>'; }).join("")+
      '</tbody></table></div>':'<div class="hint">아직 기록이 없어요.</div>')+'</div>';
  host.innerHTML=h;
  Array.prototype.forEach.call(host.querySelectorAll("[data-pa]"),function(b){
    b.onclick=function(){
      var a=b.getAttribute("data-pa"), p=ps[Number(b.getAttribute("data-pi"))], A=PACT[a];
      confirmBox(A[0]+" — "+(PROD_NAME[p.product]||p.product)+"?", (r.name||"")+" · "+phoneFmt(r.phone)+" · "+(p.shopName||p.shop)+"\n"+A[1], A[0], A[2], function(){
        api("hqPersonAct",[r.phone, p.product, a]).then(function(x){ toast(A[0]+" 했어요"+((x&&x.note)?" · "+x.note:"")); pplFind(); },
          function(e){ toast(e.message||"하지 못했습니다",true); });
      });
    };
  });
}
