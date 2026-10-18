<script>
/* ═══ v55 — 디자인 방 공통 화면 시안(워시 = 기준 · 화면마다 추천 A안)에 맞춘 네 화면
   세금계산서(발행 / 달마다 장부) · 입·출금 내역(입금·출금 / 받을 금액 / 보험료 대조) · 배달 · 설정(왼쪽 항목 목록)
   단추 · 창구 · 셈은 v54 그대로 — 차례 · 이름 · 숫자 칸 · 할 일 띠만 바꿔요 ═══ */
(function(){
/* ── 할 일 띠 ── */
BANDS.hometax=function(){
  if(!(OFFICE.popbill_userid && OFFICE.biz_no)) return {count:1, tone:"stop", text:"팝빌 회원아이디나 사업자번호가 비어 있어요", go:"팝빌 연동으로", onGo:function(){ go("popbill"); }};
  var able=TAXES.filter(function(t){ return t.can && !t.skip && !/발급|전송/.test(t.state||""); }), tot=0;
  able.forEach(function(t){ tot+=Number(t.total)||0; });
  return {count:able.length, text:"발급할 곳 "+able.length+"곳 · "+won(tot)+"원", empty:"발급할 곳이 없어요 — 입금이 끝나면 여기에 떠요",
    onGo:function(){ var t=$("htx-blk"); if(t) CGG.spot(t); }};
};
BANDS.deliv=function(){
  var f=DRIVES.filter(function(d){ return d.alarm==="못 보냄"; }).length;
  return {count:f, text:"도착 알림을 못 보낸 차 "+f+"대", empty:"못 보낸 도착 알림이 없어요",
    onGo:function(){ var t=$("drv-blk"); if(t) CGG.spot(t); }};
};
BANDS.recv=function(){
  var L=(BILLS||[]).filter(function(b){ return Number(b.left)>0; }), s=0; L.forEach(function(b){ s+=Number(b.left)||0; });
  return {count:L.length, text:"아직 다 안 들어온 곳 "+L.length+"곳 · "+won(s)+"원", empty:"받을 금액이 없어요",
    onGo:function(){ var t=$("rcv-blk"); if(t) CGG.spot(t); }};
};

/* ── 세금계산서 › 보낸 계산서만 보기 ── */
var ah=AFTER.hometax;
AFTER.hometax=function(){ if(ah) ah.apply(this,arguments);
  var b=$("txDoneOnly"); if(b) b.onclick=function(){ TXFIL="done"; var f=$("txFil"); if(f) f.value="done"; refresh(["tax"]); };
};

/* ── 입·출금 내역 › 기간 칩 (표만 거름 · 가져오기는 그대로) ── */
window.DEPR=window.DEPR||"month";
function ymd(d){ return d.toISOString().slice(0,10); }
window.depRange=function(L){
  var now=new Date(Date.now()+9*3600e3), t=ymd(now), y=ymd(new Date(now.getTime()-864e5)), w=ymd(new Date(now.getTime()-6*864e5));
  var m=t.slice(0,7), pm=ymd(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))).slice(0,7);
  return (L||[]).filter(function(d){ var day=String(d.day||d.at||"").slice(0,10);
    return DEPR==="today"?day===t : DEPR==="yday"?day===y : DEPR==="7"?day>=w&&day<=t : DEPR==="month"?day.slice(0,7)===m : DEPR==="prev"?day.slice(0,7)===pm : true; });
};
window.depChips=function(){
  return '<div class="tools" id="depRange" role="group" aria-label="기간">'+[["today","오늘"],["yday","어제"],["7","7일"],["month","이번 달"],["prev","지난 달"],["all","전체"]].map(function(x){
    return '<button type="button" class="cgg-fp'+(DEPR===x[0]?' on':'')+'" data-depr="'+x[0]+'" aria-pressed="'+(DEPR===x[0])+'">'+x[1]+'</button>'; }).join("")+'</div>';
};
var ad=AFTER.deposit;
AFTER.deposit=function(){ if(ad) ad.apply(this,arguments);
  document.querySelectorAll("[data-depr]").forEach(function(b){ b.onclick=function(){ DEPR=b.getAttribute("data-depr"); ts("dep").page=1; draw(); }; });
  var c=$("depBankGo"); if(c) c.onclick=function(){ go("popbill"); };
};

/* ── 입·출금 내역 › 받을 금액 ── */
PAGE.recv=function(){
  var L=(BILLS||[]).filter(function(b){ return Number(b.left)>0; }).map(function(b){
    return {id:b.id, name:b.name, total:Number(b.total)||0, paid:Number(b.paid)||0, left:Number(b.left)||0, sent:b.sent?"보냄":"안 보냄", _q:b.name}; });
  var s=0, part=0; L.forEach(function(r){ s+=r.left; if(r.paid>0) part++; });
  return head("받을 금액 <em>"+won(s)+"원</em>", ymText(ST.ym)+" 청구서 가운데 아직 다 안 들어온 곳이에요. 입금이 들어오면 «입금·출금»에서 맞춰요.")+
    '<div class="tools">'+ymPicker("rcYm","청구 달")+'</div>'+
    sums([["받을 곳",won(L.length)+"곳"],["받을 금액",won(s)+"원",s?"bad":""],["일부 입금",won(part)+"곳"],["청구서",won((BILLS||[]).length)+"곳"]])+
    card("받을 곳","이름을 누르면 월별 청구서로 가요.",
      tableBlock("rcv",[
        {k:"name",t:"청구처",name:true,fmt:function(v){ return '<a href="#" data-rcgo="1"><b>'+esc(v)+'</b></a>'; }},
        {k:"total",t:"청구",num:true,fmt:function(v){ return won(v); }},
        {k:"paid",t:"들어온 돈",num:true,fmt:function(v){ return won(v); }},
        {k:"left",t:"받을 금액",num:true,fmt:function(v){ return '<span style="color:var(--danger);font-weight:800">'+won(v)+'</span>'; }},
        {k:"sent",t:"청구서",fmt:function(v){ return '<span class="cgg-st '+(v==="보냄"?"done":"chk")+'">'+esc(v)+'</span>'; }}
      ], L, {}))+
    CGG.help("받을 금액 = 청구 − 들어온 돈이에요. 입금은 «입금·출금»에서 청구서와 맞추면 여기서 빠져요.","이 화면 사용법");
};
NEEDS.recv=["bill"];
AFTER.recv=function(){ wireTable("rcv",function(){ draw(); }); wireYm("rcYm",["bill"]);
  document.querySelectorAll("[data-rcgo]").forEach(function(a){ a.onclick=function(e){ e.preventDefault(); go("bill"); }; });
};

/* ── 설정 › 우리 사업장 (거래처 화면에서 나눔) ── */
function splitPartner(){
  var tmp=document.createElement("div"); tmp.innerHTML=PAGE._partnerAll();
  var cards=tmp.querySelectorAll(".card"); return {cards:cards};
}
PAGE._partnerAll=PAGE.partner;
PAGE.partner=function(){
  var c=splitPartner().cards;
  return head("거래처","딜러 · 매매상사를 넣고, 세금계산서를 누구 이름으로 끊을지 정해요.")+(c[0]?c[0].outerHTML:"");
};
PAGE.office=function(){
  var c=splitPartner().cards, out="";
  for(var i=1;i<c.length;i++) out+=c[i].outerHTML;
  return head("우리 사업장","세금계산서 · 청구서에 찍히는 정보예요. 상호는 맨 위 이름 · 알림 보내는 이름에도 쓰여요.")+out;
};
NEEDS.office=NEEDS.partner;
AFTER.office=function(){ if(AFTER.partner) AFTER.partner.apply(this,arguments); };

/* ── 설정 › 자료 올리기 (카모두 명부 · 첫날 쓰는 순서) ── */
PAGE.roster=function(){
  var own=isOwner();
  return head("자료 올리기","카모두에서 받은 명부와 엑셀을 올려요. 처음 쓰는 날은 아래 «첫날 쓰는 순서»대로 하면 돼요.")+
  card("카모두 상사명부 · 딜러명부","카모두 전산에서 받은 «상사리스트» · «딜러리스트» 엑셀(.xlsx)이나 CSV를 그대로 올려요. 상사명부는 영업 중인 곳만, 딜러명부는 재직 중인 사람만 들어가요. 회사코드 칸은 읽지 않아요(개인정보일 수 있어요). 이미 있는 이름은 덮지 않고 미리보기에서 «이미 있음»으로 보여 줘요.",
    own?'<div class="tools"><button type="button" class="btn primary" id="rsComp">① 상사명부 올리기</button><button type="button" class="btn primary" id="rsDealer">② 딜러명부 올리기</button><button type="button" class="btn" id="rsTpl">거래처 양식 받기 (CSV)</button></div>'
       :'<p class="note">명부 올리기는 대표만 할 수 있어요.</p>')+
  card("접수리스트 · 나스 엑셀","카모두 접수리스트와 나스 전산외 · 정비비 엑셀은 매출 › 자료 올리기에서 올려요.",
    '<div class="tools"><button type="button" class="btn" id="rsFiles">매출 › 자료 올리기로 가기</button></div>')+
  card("첫날 쓰는 순서","위에서부터 하나씩 하면 그달 청구서까지 나와요.",
    '<ol class="v55-steps">'+
    '<li><b>카모두 상사명부</b> 올리기 — 위 «① 상사명부 올리기»</li>'+
    '<li><b>카모두 딜러명부</b> 올리기 — 위 «② 딜러명부 올리기»</li>'+
    '<li><b>단가표</b> «가온 규칙으로 맞추기» <button type="button" class="btn small" data-v55go="price">단가표로</button></li>'+
    '<li><b>접수리스트 10월</b> 올리기 <button type="button" class="btn small" data-v55go="files">자료 올리기로</button></li>'+
    '<li><b>청구서</b> 확인 — 10월 35곳 · 3,927,000원(부가세 포함)이면 맞아요 <button type="button" class="btn small" data-v55go="bill">월별 청구서로</button></li>'+
    '</ol>');
};
NEEDS.roster=["set"];
AFTER.roster=function(){
  var o=function(){ if(COMPS===null){ tell("거래처를 불러오는 중이에요","잠시 뒤 다시 눌러 주세요."); return; } if(window.chkCsvOpen) chkCsvOpen(); };
  var a=$("rsComp"); if(a) a.onclick=o; var b=$("rsDealer"); if(b) b.onclick=o;
  var t=$("rsTpl"); if(t) t.onclick=function(){ if(window.chkCsvTpl) chkCsvTpl(); };
  var f=$("rsFiles"); if(f) f.onclick=function(){ go("files"); };
  document.querySelectorAll("[data-v55go]").forEach(function(x){ x.onclick=function(){ go(x.getAttribute("data-v55go")); }; });
};

/* ── 설정 › 왼쪽 항목 목록 (넓은 화면 · 폰은 위 작은 칸) ── */
function setNav(){
  var m=$("main"); if(!m||$("v55SetNav")) return;
  if(!SETS.some(function(x){ return x[0]===page; })) return;
  var h=m.querySelector(".cgg-head"); if(!h) return;
  var g=document.createElement("div"); g.className="v55-setg";
  var nav=document.createElement("nav"); nav.id="v55SetNav"; nav.className="v55-setnav"; nav.setAttribute("aria-label","설정 항목");
  nav.innerHTML=SETS.map(function(s){ return (SETLBL[s[0]]?'<small>'+esc(SETLBL[s[0]])+'</small>':'')+
    '<button type="button" data-v55set="'+s[0]+'"'+(s[0]===page?' aria-current="page"':'')+'>'+esc(s[1])+'</button>'; }).join("");
  var body=document.createElement("div"); body.className="v55-setbody";
  var bd=$("chkBand"), start=(bd&&bd.parentNode===h.parentNode)?bd.nextSibling:h.nextSibling;
  var mv=[]; for(var n=start;n;n=n.nextSibling) mv.push(n);
  mv.forEach(function(n){ body.appendChild(n); });
  g.appendChild(nav); g.appendChild(body); h.parentNode.appendChild(g);
  nav.querySelectorAll("[data-v55set]").forEach(function(b){ b.onclick=function(){ go(b.getAttribute("data-v55set")); }; });
}
SETS.forEach(function(s){ var a=AFTER[s[0]]; AFTER[s[0]]=function(){ if(a) a.apply(this,arguments); setNav(); }; });
/* 넓은 화면 설정은 왼쪽 목록이 있어 위 작은 칸 줄은 숨겨요 (폰은 그대로) */
var dt=window.drawTabs;
if(dt) window.drawTabs=drawTabs=function(){ dt.apply(this,arguments); try{ document.body.classList.toggle("v55-setpg", SETS.some(function(x){ return x[0]===page; })); }catch(e){} };
})();
</script>
<style>
/* v55 설정 왼쪽 항목 목록 — 워시 공통 시안 A */
.v55-setg{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}
.v55-setnav{display:flex;flex-direction:column;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px;position:sticky;top:12px}
.v55-setnav small{font-size:12px;font-weight:800;color:var(--muted);padding:10px 10px 4px}
.v55-setnav button{all:unset;cursor:pointer;padding:10px 12px;border-radius:10px;font-size:15px;font-weight:700;color:var(--text);min-height:24px}
.v55-setnav button:hover{background:var(--chip)}
.v55-setnav button[aria-current="page"]{background:var(--brand-soft);color:var(--brand);font-weight:800}
.v55-setnav button:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.v55-setbody{min-width:0}
@media (min-width:761px){ body.v55-setpg #cggSub, body.v55-setpg .cgg-navsub{display:none !important} }
@media (max-width:760px){ .v55-setg{display:block} .v55-setnav{display:none} }
#depRange{gap:6px}
.v55-steps{margin:0;padding-left:22px;display:grid;gap:10px;font-size:15px}
.v55-steps li{line-height:1.6}
.v55-steps .btn{margin-left:8px}
</style>
