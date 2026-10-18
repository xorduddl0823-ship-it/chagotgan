<script>
/* ═══ 체크 v56.2 = v56.1 + 공통 부품 1.13.1 («이번 달 어디까지 왔나» = CGG.steps · 밀린 달 확인 창 받는 사람 펼쳐 보기) ═══
   ═══ 체크 v56.1 = v56 + 공통 부품 1.13 (결과 목록 · 진행 줄 · 밀린 달 창은 1.13 공통 CGG.listify · CGG.progress · CGG.bundle 로) ═══
   ═══ 체크 v56 — 디자인 통합 2단계 (대표님 승인 10/18 · 대조표 74줄 추천 그대로)
   ① 메뉴 = 디자인 방 메뉴 지도 CGG_MENU_CHECK 그대로(이름 · 차례 · «체크 전용» 묶음) — 체크 화면 열쇠로만 잇기
   ② 홈 = 공통 CGG.home(워시와 같은 차례) + 체크 전용 칸(어디까지 왔나 · 많이 밀린 곳 · 성능보증보험료)
   ③ 결과 창 줄바꿈 · ④ 알림톡 문구 잠금(보기만) · ⑤ 밀린 달 한꺼번에(check-api v51) · ⑥ 배달 휴지통은 휴지통 안으로
   돈 계산 함수(청구서 · 입금 · 세금계산서 · 정산)는 건드리지 않아요 — 화면 그리기만 ═══ */
(function(){
var M=window.CGG_MENU_CHECK||{groups:[],tabs:[],feats:[]};
/* ① 메뉴 지도 열쇠 → 체크 화면 열쇠 */
var GK={delivery:"deliv"};
var PK={"bill/month":"bill","bill/group":"billgrp","deposit/in":"deposit","deposit/due":"recv","deposit/ins":"unpaid",
  "hometax/issue":"hometax","hometax/ledger":"history","delivery/log":"deliv","delivery/dest":"delivplace","delivery/msg":"delivmsg",
  "delivery/driver":"delivdriver","set/biz":"office","set/backup":"backup","set/partner":"partner","set/staff":"staff","set/price":"price",
  "set/popbill":"popbill","set/alarm":"alarm","set/fee":"fee","set/upload":"files"};
function gk(k){ return GK[k]||k; }
function toChk(go){ go=String(go||"home"); if(/^(me|hdr|field)\//.test(go)) return go; var p=PK[go]; if(p) return gk(go.split("/")[0])+"/"+p; return gk(go.split("/")[0]); }
window.chkGroups=chkGroups=function(){
  return M.groups.map(function(g){ var o={key:gk(g.key), label:g.label, icon:g.icon, isNew:g.isNew};
    if(g.subs) o.subs=g.subs.map(function(s){ return s.key ? {key:PK[g.key+"/"+s.key]||s.key, label:s.label} : {group:s.group}; });
    return o; });
};
window.chkFeats=chkFeats=function(){
  return M.feats.map(function(f){ var x={}; for(var k in f) x[k]=f[k]; x.go=toChk(f.go); return x; });
};
/* 안쪽 칸 목록(머리 글 · 폰 작은 탭)도 메뉴 지도 이름으로 */
function subsOf(key){ var g=chkGroups().filter(function(x){ return x.key===key; })[0]; return g&&g.subs?g.subs.filter(function(s){ return s.key; }).map(function(s){ return [s.key,s.label]; }):null; }
["bill","deposit","hometax","deliv","set"].forEach(function(k){ var L=subsOf(k); if(!L) return;
  var T={bill:BILLSUB,deposit:DEPSUB,hometax:TAXSUB,deliv:DELIVSUB,set:SETS}[k]; T.length=0; L.forEach(function(x){ T.push(x); }); });
SETLBL={};
/* 알림톡 문구 화면은 설정 › 알림 안 (메뉴 지도 «알림톡 문구» = 설정 › 알림) */
var _g1=groupOf;
window.groupOf=groupOf=function(p){ if(p==="billtpl"||p==="sms") return ["set",SETS]; if(p==="delivtrash") return ["deliv",DELIVSUB]; return _g1.apply(this,arguments); };
var _cc=chkCur;
window.chkCur=chkCur=function(){ if(page==="billtpl") return "set/alarm"; if(page==="sms") return "set/popbill"; if(page==="delivtrash") return "deliv/deliv"; return _cc.apply(this,arguments); };
/* 폰 작은 탭에 «체크 전용» 묶음 이름 */
var _dt=drawTabs;
window.drawTabs=drawTabs=function(){ _dt.apply(this,arguments);
  var G=groupOf(page), sub=$("cggSub"); if(!sub||!G[1]) return;
  var g=chkGroups().filter(function(x){ return x.key===G[0]; })[0]; if(!g||!g.subs) return;
  var html=g.subs.map(function(s){ return s.key ? '<button role="tab" aria-selected="'+(page===s.key?"true":"false")+'" data-go="'+esc(s.key)+'">'+esc(s.label)+'</button>' : '<span class="cgg-nsgrp">'+esc(s.group||"")+'</span>'; }).join("");
  sub.innerHTML=html;
  Array.prototype.forEach.call(sub.querySelectorAll("[data-go]"),function(b){ b.onclick=function(){ go(b.getAttribute("data-go")); }; });
};
/* 폰 아래 탭 5칸 — 메뉴 지도 tabs (홈 · 청구서 · 배달 · 입·출금 · 전체) */
window.cggTabbar=cggTabbar=function(grp){
  if(!window.CGG) return;
  var T=M.tabs.map(function(t){ return {key:t.key==="__all"?"all":gk(t.key), icon:t.icon, label:t.label}; });
  var main=T.map(function(t){ return t.key; }).filter(function(k){ return k!=="all"; });
  CGG.tabbar($("cggTbar"), T, main.indexOf(grp)>=0?grp:"all",
    function(k){ if(k==="all"){ if(!CGG.closeSheet()) cggAllMenu(); } else { CGG.closeSheet(); go(k); } });
};
/* 기능 찾기 — 머리말 · 사람 단추 · 빛낼 칸(spot) */
var _gf=chkGoFeat;
window.chkGoFeat=chkGoFeat=function(f){
  var g=String((f&&f.go)||"");
  try{ CGG.closeSheet(); }catch(e){}
  if(g==="hdr/link"){ $("btnLink").click(); return; }
  if(f&&f.id==="outbox"){ go("sendlog"); return; }   /* v56.2: 보낸 기록 화면 */
  if(g==="hdr/help"){ $("btnHelp").click(); return; }
  if(g==="hdr/notice"){ if(window.ccwNotice) window.ccwNotice(); return; }
  if(g==="me/plan"){ try{ window.ccwPlanPay(); }catch(e){ bar("요금제는 마이페이지에서 봐요"); } return; }
  _gf.apply(this,arguments);
  if(f&&f.spot) setTimeout(function(){ var c=document.querySelector(f.spot); if(c&&CGG.spot) CGG.spot(c); },400);
};

/* ② 홈 — 공통 CGG.home (워시와 같은 차례 · 같은 첫 줄 규칙) */
var HOMEIC={deposit:"wallet",bill:"file",partner:"shop",hometax:"receipt",home:"today"};

PAGE.home=function(){ return '<div id="chkHome"></div>'; };
AFTER.home=function(){
  var el=$("chkHome"); if(!el||!CGG.home) return;
  var totFee=0,totRep=0,totPaid=0,cnt=0,dom=0,imp=0,etc=0;
  BILLS.forEach(function(b){ totFee+=b.fee; totRep+=b.rep; totPaid+=b.paid; cnt+=b.cnt; dom+=b.dom; imp+=b.imp; etc+=b.etc; });
  var tot=totFee+totRep, left=tot-totPaid;
  var cy=Number(ST.ym.slice(0,4)), cm=Number(ST.ym.slice(5,7)), now=new Date();
  var thisMonth=(now.getFullYear()===cy && now.getMonth()+1===cm);
  /* 할 일 — v55.1 과 같은 셈(메모 · 확인 필요 입금 · 안 보낸 청구서 · 번호 없음 · 세금계산서) */
  var wait=DEPS.filter(function(d){return d.state==="확인 대기";}), notSent=BILLS.filter(function(b){return b.sendState==="안 보냄";}),
      noTel=BILLS.filter(function(b){return !b.tel;}), taxWait=BILLS.filter(function(b){return b.tax==="끊음";});
  var tk=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0"), ms=[];
  try{ ms=chkMemos().filter(function(m){ return m.day===tk && !m.done; }); }catch(e){}
  TODOS=ms.slice(0,3).map(function(m){ return [(m.time||"메모"),"memo","오늘 메모 · "+m.text,(m.by?m.by+" 적음":""),"home"]; });
  [[wait.length,"w","확인 필요 입금","deposit"],[notSent.length,"w","아직 안 보낸 청구서","bill"],[noTel.length,"r","보낼 번호가 없는 청구처","partner"],[taxWait.length,"","세금계산서 대상","hometax"]]
    .forEach(function(x){ if(Number(x[0])>0) TODOS.push([x[0],x[1],x[2],"",x[3]]); });
  function todoItem(x){ var memo=x[1]==="memo";
    return {tone:x[1]==="r"?"stop":x[1]==="w"?"chk":"run", icon:HOMEIC[x[4]]||"file", title:memo?x[2]:(x[2]+" "+won(x[0])+"건"), sub:x[3]||"눌러서 바로 처리해요"}; }
  /* 숫자 칸 4개 — 모두 작은 그래프 + 비교 줄 (차량 · 청구는 매출 기록, 입금 · 받을 금액은 이번 달 날마다) */
  var S=(SALES||[]).slice(0,7).slice().reverse(), sn=S.map(function(x){ return Number(x.n)||0; }), st=S.map(function(x){ return Number(x.total)||0; });
  var prev=(SALES||[]).filter(function(x){ return String(x.ym)<ST.ym; })[0]||null;
  function dlt(a,b,unit){ if(b==null) return {delta:"",vs:"지난달 자료 없음"}; var d=a-b; return {delta:(d>=0?"+":"−")+won(Math.abs(d))+unit, down:d<0, vs:"지난달보다"}; }
  var last=new Date(cy,cm,0).getDate(), upto=thisMonth?now.getDate():last, day=[], acc=0;
  for(var d=1; d<=upto; d++){ DEPS.forEach(function(x){ if(String(x.day).slice(0,7)===ST.ym && Number(String(x.day).slice(8,10))===d) acc+=(x.amount||0); }); day.push(acc); }
  var pct=tot?Math.round(totPaid/tot*100):0, leftN=BILLS.filter(function(b){ return b.left>0; }).length;
  var curS=(SALES||[]).filter(function(x){ return String(x.ym)===ST.ym; })[0]||null;   /* 비교는 매출 기록끼리(같은 셈) */
  var k1=dlt(curS?Number(curS.n)||0:cnt, prev?Number(prev.n)||0:null, "대"), k2=dlt(curS?Number(curS.total)||0:tot, prev?Number(prev.total)||0:null, "원");
  var kp=[{label:"이번 달 차량", value:won(cnt), unit:"대", spark:sn.length>1?sn:null, delta:k1.delta, down:k1.down, vs:k1.vs},
          {label:"이번 달 청구", value:won(tot), unit:"원", spark:st.length>1?st:null, delta:k2.delta, down:k2.down, vs:k2.vs},
          {label:"이번 달 입금", value:won(totPaid), unit:"원", tone:"in", zeroMuted:true, spark:day.length>1?day:null, delta:pct+"%", vs:"청구 중 받은 몫"},
          {label:"받을 금액", value:won(left), unit:"원", tone:"due", zeroMuted:true, spark:day.length>1?day.map(function(v){ return Math.max(0,tot-v); }):null, delta:won(leftN)+"곳", down:leftN>0, vs:"아직 덜 받은 곳"}];
  /* 달력 — 날마다 들어온 돈(검사비 · 정비비 · 보험료) */
  var days={};
  DEPS.forEach(function(x){ if(String(x.day).slice(0,7)!==ST.ym) return; var dd=Number(String(x.day).slice(8,10)); if(!dd) return;
    var k=x.kind==="정비비"?"r":(x.kind==="보험료"?"s":"f"); days[dd]=days[dd]||{amt:0,c:{}}; days[dd].amt+=(x.amount||0); days[dd].c[k]=(days[dd].c[k]||0)+1; });
  try{ chkMemos().forEach(function(m){ if(String(m.day).slice(0,7)!==ST.ym||m.done) return; var dd=Number(String(m.day).slice(8,10)); if(!dd) return; days[dd]=days[dd]||{amt:0,c:{}}; days[dd].c.m=(days[dd].c.m||0)+1; }); }catch(e){}
  var cal={}; Object.keys(days).forEach(function(dd){ var o=days[dd]; cal[dd]={amt:o.amt, marks:["f","r","s","m"].filter(function(k){ return o.c[k]; }).map(function(k){ return [k,o.c[k]]; })}; });
  function calStep(dy){ var y=cy, m=cm+dy; if(dy===0){ y=now.getFullYear(); m=now.getMonth()+1; } while(m<1){ m+=12; y--; } while(m>12){ m-=12; y++; }
    var v=y+"-"+String(m).padStart(2,"0"); if(v===ST.ym) return; ST.ym=v; try{ set("cgg_ym",v); }catch(e){} refresh(); }
  var own=isOwner();
  var title=left>0 ? '받을 금액 <em>'+esc(won(left))+'원</em>이 남아 있어요' : '받을 금액이 모두 들어왔어요';   /* sum 을 못 읽는 옛 부품용 */
  var ranks=[["성능점검 · 국산",dom],["성능점검 · 수입",imp],["재검 · 선납 · 가성능",etc]].filter(function(x){ return x[1]>0; }).sort(function(a,b){ return b[1]-a[1]; }), rmx=ranks.length?ranks[0][1]:1;
  CGG.home(el,{sum:{unsent:notSent.length, due:left}, title:title,   /* 1.12 확정: 홈 첫 줄은 두 제품 같은 규칙(sum) — title 은 옛 부품용 */
    desc:"오늘 "+(now.getMonth()+1)+"월 "+now.getDate()+"일 · "+String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+" 기준"+(thisMonth?"":" · "+ymText(ST.ym)+" 자료"),
    quick:{feats:chkFeats(), key:M.quickKey+":"+(ST.shop||"")+":"+(ST.who||""), defs:M.quickDefault, onGo:chkGoFeat},
    todo:{items:TODOS.slice(0,3).map(todoItem), total:TODOS.length, onPick:function(i){ var t=TODOS[i]; if(t&&t[4]&&t[4]!=="home") go(t[4]); }, onAll:homeAll},
    kpis:kp,
    cal:{y:cy, m:cm, today:thisMonth?now.getDate():0, days:cal, legend:[["f","검사비","run"],["r","정비비","done"],["s","성능보증보험료","chk"],["m","메모","stop"]], amtLabel:"그날 들어온 돈",
      onMove:calStep, onDay:function(d){ var v=ST.ym+"-"+String(d).padStart(2,"0"); var L=DEPS.filter(function(x){ return String(x.day).slice(0,10)===v; });
        tell(cm+"월 "+d+"일", L.length ? L.map(function(x){ return esc(x.who||x.sender||"")+" · "+esc(x.kind||"")+" · "+won(x.amount)+"원"; }).join("<br>") : "이날 들어온 돈이 없어요."); }},
    money:{title:"이번 달 입금", link:{label:"입·출금 내역", onClick:function(){ go("deposit"); }}, big:totPaid, bar:{done:totPaid,total:tot},
      legend:[["받은 것",totPaid,"done"],["받을 것",left,"chk"]], rows:[["검사비 · 정비비 청구", won(totFee)+"원 · "+won(totRep)+"원"],["청구한 곳", won(BILLS.length)+"곳"]]},
    rank:{title:"이번 달 일감", link:{label:"매출", onClick:function(){ go("sales"); }}, sub:"검사 종류별 · 많은 차례", items:ranks.map(function(x){ return {label:x[0], value:won(x[1])+"대", pct:x[1]/rmx}; })},
    help:"홈 차례는 워시와 같아요: 자주 쓰는 기능 → 오늘 할 일 → 숫자 칸 4개 → 일정 · 이번 달 입금 · 이번 달 일감.\n아래 «체크 전용» 칸은 체크에만 있어요."});
  /* 체크 전용 칸 — 사용법 위 */
  var made=BILLS.length, sentN=BILLS.filter(function(b){ return b.sendState!=="안 보냄"; }).length;
  var late=BILLS.filter(function(b){ return b.left>0; }).sort(function(a,b){ return b.left-a.left; });
  var box=document.createElement("div");
  box.innerHTML='<div id="chkSteps"></div>'+   /* v56.2: «이번 달 어디까지 왔나» = 공통 CGG.steps (04 결정 · 두 제품 같음) */
    card("많이 밀린 곳 · 검사비 입금 대기","검사비 입금 대기가 많은 차례예요(보험료 · 정비비 빼고).",
      tableBlock("fo",[
        {k:"name",t:"청구처",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
        {k:"members",t:"함께 묶인 곳",fmt:function(v){return v?esc(v):'<span style="color:var(--muted)">—</span>';}},
        {k:"cnt",t:"건수",num:true},
        {k:"total",t:"청구액",num:true,fmt:function(v){return won(v);}},
        {k:"paid",t:"입금",num:true,fmt:function(v){return won(v);}},
        {k:"left",t:"남은 금액",num:true,fmt:function(v){return won(v);}},
        {k:"state",t:"상태",state:true,fmt:tag}
      ], late, {pick:true, tools:'<button class="btn">엑셀 다운로드</button>'}))+
    card("성능보증보험료","매매상사 앞으로 청구하는 몫이라 따로 봐요.",
      '<div class="tools"><button type="button" class="btn" data-v56go="unpaid">보험료 맞춰 보기</button></div>');
  Array.prototype.forEach.call(box.querySelectorAll(".card"),function(c){ c.classList.add("chk-own"); });   /* 밀린 곳 · 성능보증보험료만 체크 전용 */
  var allSent=made>0&&sentN>=made, allPaid=tot>0&&totPaid>=tot;
  CGG.steps(box.querySelector("#chkSteps"),[
    {label:"자료 올리기", state:made?"done":"now", note:made?"설정 › 자료 올리기":"설정 › 자료 올리기에서 올려요"},
    {label:"청구서 만들기", state:made?"done":"todo", note:made?won(made)+"장 만듦":"남음"},
    {label:"청구서 보내기", state:allSent?"done":(made?"now":"todo"), note:made?won(sentN)+"장 보냄 · "+won(made-sentN)+"장 남음":"남음"},
    {label:"입금 확인", state:allPaid?"done":(allSent?"now":"todo"), note:pct+"% 입금"}],
    {title:"이번 달 어디까지 왔나", desc:"왼쪽부터 차례대로 하시면 돼요."});   /* v56.2: «어디까지 왔나»는 공통 기능(워시 v138) — 체크 전용 표시 없음 */
  var hp=el.querySelector(".cgg-help"); while(box.firstChild) el.insertBefore(box.firstChild, hp||null);
  wireTable("fo",function(){ draw(); });
  Array.prototype.forEach.call(el.querySelectorAll("[data-v56go]"),function(b){ b.onclick=function(){ go(b.getAttribute("data-v56go")); }; });
};
function homeAll(){
  CGG.dialog({size:"input", title:"오늘 할 일 "+TODOS.length+"건", desc:"누르면 그 화면으로 가요.",
    body:'<div style="display:grid;gap:8px">'+TODOS.map(function(x,i){ return '<button type="button" class="cgg-btn" style="justify-content:flex-start;height:auto;min-height:43px;text-align:left" data-ti="'+i+'">'+esc(x[1]==="memo"?x[2]:x[2]+" "+won(x[0])+"건")+'</button>'; }).join("")+'</div>'});
  Array.prototype.forEach.call(document.querySelectorAll("[data-ti]"),function(b){ b.onclick=function(){ var t=TODOS[+b.getAttribute("data-ti")]; CGG.closeDialog(); if(t&&t[4]&&t[4]!=="home") go(t[4]); }; });
}
window.cggTodos=function(){};

/* ③ 여러 건 결과 창 — «이름(까닭) / 이름(까닭)» 한 줄을 한 곳씩 줄 바꿔 목록으로 */
function listify(t){ return CGG.listify(t); }   /* v56.1: 공통 1.13 */
var _tell=tell;
function sameWord(x){ return String(x==null?"":x).replace(/«확인 대기»/g,"«확인 필요»"); }   /* 상태 이름 하나로(표 · 글자 같게) */
window.tell=tell=function(title, html, kind){ return _tell.call(this, sameWord(title), listify(sameWord(html)), kind); };
var _bar=bar;
window.bar=bar=function(text, kind, quiet){
  var t=sameWord(text), m=t.match(/^(.*?)((?:안 된 곳|등록 못 한|못 보낸 곳|못 지운)\s*[\d,]+\s*(?:곳|건|줄))\s*—\s*(.+)$/);
  if(kind==="err" && m && / \/ /.test(m[3])){ _bar.call(this, (m[1]||"")+m[2]+"이 있어요. 창에서 한 곳씩 봐요.", kind, quiet);
    _tell.call(this, m[2]+"이 있어요", (m[1]?esc(m[1])+"<br>":"")+CGG.list(m[3].split(/\s+\/\s+/)));
    return; }
  return _bar.call(this, t, kind, quiet);
};

/* ④ 알림톡 문구 — 카카오 승인 문구는 보기만(잠금), 고칠 수 있는 건 문자 문구뿐 (공통 부품 ata 1.1) */
PAGE.billtpl=function(){
  var A=window.CGG_ATATXT; function bx(t,k,sub){ return card(t,sub,A?A.box(k,null,{noSms:true}):""); }
  return head("알림톡 문구","카카오가 승인한 문구 그대로 나가요. 여기서는 보기만 해요 — 알림톡이 안 갈 때 가는 문자 문구는 그 화면에서 고쳐요.")+
    bx("청구서","bill","월별 청구서 › 청구서 보내기 · 밀린 달 한꺼번에도 이 문구예요.")+
    bx("배달 도착","release","기사 앱 «도착 알림 보내기» · 배달 › 배달 기록 «다시 보내기».")+
    bx("입금 확인","deposit_ok","입금을 청구서에 맞추면 나가요.")+
    bx("재검사 안내","check_remind","재검사 알림 화면에서 보내요. 승인 전에는 문자로 나가요.")+
    card("넣어 둔 값","",'<div class="row2"></div>');
};
var _pa=PAGE.alarm;
PAGE.alarm=function(){
  return _pa.apply(this,arguments)+card("알림톡 문구","청구서 · 배달 도착 · 입금 확인 · 재검사 안내 알림톡 문구(카카오 승인 · 보기만)를 봐요.",
    '<div class="tools"><button type="button" class="btn" data-v56go="billtpl">알림톡 문구 보기</button></div>');
};
var _aa=AFTER.alarm;
AFTER.alarm=function(){ if(_aa) _aa.apply(this,arguments); Array.prototype.forEach.call(document.querySelectorAll("#main [data-v56go]"),function(b){ b.onclick=function(){ go(b.getAttribute("data-v56go")); }; }); };
var _ad=AFTER.delivmsg;
AFTER.delivmsg=function(){ if(_ad) _ad.apply(this,arguments); try{ var a=$("dwAtaLock"); if(a&&window.CGG_ATATXT) a.innerHTML=CGG_ATATXT.box("release"); }catch(e){} };

/* ⑥ 배달 휴지통은 공통 휴지통(사람 단추 ▾ › 휴지통) 안에서 열어요 */
var _pt=PAGE.trash;
PAGE.trash=function(){ return _pt.apply(this,arguments)+card("지운 배달 기록","배달 › 배달 기록에서 지운 줄은 여기서 되살려요.",
  '<div class="tools"><button type="button" class="btn" data-v56go="delivtrash">지운 배달 기록 보기</button></div>'); };
var _at=AFTER.trash;
AFTER.trash=function(){ if(_at) _at.apply(this,arguments); Array.prototype.forEach.call(document.querySelectorAll("#main [data-v56go]"),function(b){ b.onclick=function(){ go(b.getAttribute("data-v56go")); }; }); };

/* ⑤ 밀린 달 한꺼번에 — 서버 check-api v51 billBundleList / billBundleSend (대표만)
   딜러 한 명: 덜 받은 달 목록(오래된 달부터) → 고르기 → «누구 · 몇 달 · 얼마» 확인 → 보내기 · 내 번호로 시험
   여러 딜러: «미수 모아 보내기» — 고른 딜러마다 덜 받은 달을 모두 묶어 한 통씩 */
function dealerOf(b){ var L=DEALERS.filter(function(d){ return d.name===b.name; }); return L.length===1?L[0]:(L.length?"dup":null); }
function bundleOld(e){ return /billBundle|unknown|없는 (기능|요청)|not found/i.test(String((e&&e.message)||"")); }
function bundleOne(b){
  var d=dealerOf(b);
  if(d==="dup"){ tell("이름이 같은 딜러가 있어요","«"+esc(b.name)+"» 이름의 딜러가 여럿이라 누구에게 보낼지 정할 수 없어요. 거래처에서 이름을 다르게 해 주세요."); return; }
  if(!d){ tell("거래처에 없는 청구처예요","«"+esc(b.name)+"»은(는) 거래처 딜러 명단에 없어서 밀린 달을 모을 수 없어요."); return; }
  busy(true);
  call("billBundleList",[{dealerId:d.id}]).then(function(r){ busy(false);
    var rows=((r&&r.rows)||[]).filter(function(x){ return Number(x.left)>0; });
    if(!rows.length){ tell("밀린 달이 없어요","«"+esc(b.name)+"» 딜러는 덜 받은 청구서가 없어요."); return; }
    CGG.bundle.pick({name:b.name, due:String(window.BS_DUE||""),   /* v56.1: 공통 1.13 달 고르기 창 */
      rows:rows.map(function(x){ return {id:x.id, label:ymText(x.ym), sub:"청구 "+won(x.total)+"원 · 받음 "+won(x.paid)+"원"+(x.sentAt?" · "+shortTs(x.sentAt)+" 보냄":""), left:x.left}; }),
      onNext:function(ids, sum, labels, due){ bundleConfirm([{d:d, name:b.name, ids:ids, sum:sum, months:labels}], due); }});
  }).catch(function(e){ busy(false); if(bundleOld(e)) tell("아직 쓸 수 없어요","체크 서버를 v51로 올리면 바로 돼요. 지금은 달마다 «청구서 보내기»로 보내 주세요."); else fail(e); });
}
function bundleConfirm(L, due){   /* v56.1: 공통 1.13 확인 창(«누구에게 · 몇 달 · 얼마 · 입금 기한» + «먼저 내 번호로 시험») */
  CGG.bundle.confirm({list:L.map(function(x){ return {name:x.name, ids:x.ids, sum:x.sum, months:x.months}; }), due:due,
    onSend:function(test){ bundleGo(test?[L[0]]:L, due, test); }});
}
function bundleGo(L, due, test){   /* v56.1: 공통 1.13 차례 보내기 + 진행 줄 — 서버 부르기는 여기 그대로 */
  busy(true); bar(test?"시험 알림을 보내는 중이에요…":"밀린 달 청구서를 보내는 중이에요…","info");
  var stop=false;
  CGG.bundle.run(L, function(x){
    if(stop) return Promise.resolve({ok:false, why:"보내지 않았어요"});
    return call("billBundleSend",[{dealerId:x.d.id, ids:x.ids, due:due, test:!!test}]).then(function(r){ r=r||{}; return {ok:!!r.ok, why:String(r.why||"")}; },
      function(e){ if(bundleOld(e)) stop=true; throw e; });
  }, function(out){ busy(false);
    var ok=out.filter(function(x){ return x.ok; }).length;
    if(stop && !ok){ tell("아직 쓸 수 없어요","체크 서버를 v51로 올리면 바로 돼요. 아무것도 보내지 않았어요."); return; }
    if(test) bar(ok?"내 번호로 시험 알림을 보냈어요. 휴대폰을 확인해 주세요.":"시험 알림을 보내지 못했어요 — "+whyKo(out[0]&&out[0].why), ok?"ok":"err");
    else if(ok===out.length) bar(won(ok)+"명에게 밀린 달 청구서를 보냈어요.","ok");
    else tell(won(out.length-ok)+"명에게 못 보냈어요", CGG.list(out.filter(function(x){ return !x.ok; }).map(function(x){ return x.item.name+" — "+whyKo(x.why); }))+(ok?won(ok)+"명에게는 보냈어요.":""));
    if(!test){ clearPick("bill"); refresh(["bill"]); }
  });
}
function bundleMany(L){
  var bad=[], ok=[];
  L.forEach(function(b){ var d=dealerOf(b); if(d&&d!=="dup") ok.push({b:b,d:d}); else bad.push(b.name+(d==="dup"?"(이름 같은 딜러 여럿)":"(거래처에 없음)")); });
  if(!ok.length){ tell("보낼 수 있는 딜러가 없어요", bad.length?CGG.list(bad):"입금 대기인 청구처를 골라 주세요."); return; }
  busy(true);
  Promise.all(ok.map(function(o){ return call("billBundleList",[{dealerId:o.d.id}]).then(function(r){ var rows=((r&&r.rows)||[]).filter(function(x){ return Number(x.left)>0; }).slice(0,24);
      return rows.length?{d:o.d, name:o.b.name, ids:rows.map(function(x){ return String(x.id); }), sum:rows.reduce(function(t,x){ return t+(Number(x.left)||0); },0), months:rows.map(function(x){ return ymText(x.ym); })}:null; }); }))
    .then(function(R){ busy(false); R=R.filter(Boolean); if(!R.length){ tell("밀린 달이 없어요","고른 딜러는 덜 받은 청구서가 없어요."); return; }
      if(bad.length) CGG.toast("빼고 보내요: "+bad.join(", "));
      bundleConfirm(R, String(window.BS_DUE||"")); })
    .catch(function(e){ busy(false); if(bundleOld(e)) tell("아직 쓸 수 없어요","체크 서버를 v51로 올리면 바로 돼요. 지금은 달마다 «청구서 보내기»로 보내 주세요."); else fail(e); });
}
var _ab=AFTER.bill;
AFTER.bill=function(){ if(_ab) _ab.apply(this,arguments);
  if(!isOwner()) return;
  var row=document.querySelector("#bill-blk .cgg-tacts"), blk=$("bill-blk"); if(!blk) return;
  if(!row){ row=document.createElement("div"); row.className="cgg-tacts"; var pg=blk.querySelector(".cgg-pager"); if(pg&&pg.nextSibling) blk.insertBefore(row,pg.nextSibling); else blk.appendChild(row); }
  var b1=document.createElement("button"); b1.type="button"; b1.className="cgg-btn btn"; b1.id="bBundle"; b1.textContent="밀린 달 한꺼번에 (고른 딜러)";
  var b2=document.createElement("button"); b2.type="button"; b2.className="cgg-btn btn"; b2.id="bBundleAll"; b2.textContent="미수 모아 보내기";
  row.insertBefore(b2,row.firstChild); row.insertBefore(b1,row.firstChild);
  function sel(){ var ids=picked("bill"); return BILLS.filter(function(b){ return ids.indexOf(String(b.id))>=0||ids.indexOf(String(b.name))>=0; }); }
  b1.onclick=function(){ var L=sel(); if(L.length!==1){ tell("딜러를 한 명만 골라 주세요","표 왼쪽 네모로 밀린 달을 모아 보낼 딜러 한 명을 골라 주세요. 여러 명이면 «미수 모아 보내기»를 눌러요."); return; } bundleOne(L[0]); };
  b2.onclick=function(){ var L=sel(); if(!L.length) L=BILLS.filter(function(b){ return b.left>0; }); L=L.filter(function(b){ return b.left>0; });
    if(!L.length){ tell("입금 대기인 곳이 없어요","이 달 청구서는 모두 입금됐어요."); return; } bundleMany(L); };
};
/* ⑦ 화면 제목 = 메뉴 지도 이름 (1.13 메뉴 지도: 청구처 묶음 · 월별 장부 · 보험료 맞춰 보기 · 거래처 관리 · 휴지통 · 알림톡 문구) */
var TT={"달마다 장부":"월별 장부","보험료 대조":"보험료 맞춰 보기","거래처":"거래처 관리","지운 내역":"휴지통","알림톡 템플릿":"알림톡 문구"};
var CR={billtpl:"설정 › 알림 › 알림톡 문구", trash:"사람 단추 › 휴지통", delivtrash:"휴지통 › 지운 배달 기록", help:"머리말 › 도움말"};
var _hd=head;
window.head=head=function(t,p){
  if(page==="delivtrash") t="지운 배달 기록";
  t=TT[t]||t;
  if(CR[page] && window.CGG && CGG.head) return CGG.head({crumb:CR[page], title:t, desc:String(p||"").replace(/<[^>]+>/g,"")});
  return _hd.call(this,t,p);
};
/* ⑧ 할 일 띠 — 할 일이 없으면 두 제품 같은 초록 «지금 처리할 일이 없어요»(대조표 A4) */
Object.keys(BANDS).forEach(function(k){ var f=BANDS[k]; BANDS[k]=function(){ var cf=f.apply(this,arguments); if(cf) delete cf.empty; return cf; }; });
/* ⑨ 체크 전용 칸 표시 — 공통 화면 안에 덧붙는 체크만의 칸(점선 · «체크 전용») */
var OWN=/^(팝빌에서 가져오기|\d{4}년 \d+월 청구 합계|딜러 등록 대기|수출 가성능|거래처에 없는 신청인|작성일자|다른 양식|카모두 상사명부|첫날 쓰는 순서|나스 엑셀|검사비 · 정비비 받는 계좌|쓰는 항목|성능보증보험료)/;
var _dr=draw;
window.draw=draw=function(){ _dr.apply(this,arguments);
  /* 숫자 칸 뜻 색(공통 1.12 tone · 대조표 A2) — sums 는 돈 코드 목록이라 안 고치고, 그린 뒤 이름표로 색만 입혀요: 입금 초록 · 받을 금액/대기/확인 필요 주황 · 0 회색 */
  try{ Array.prototype.forEach.call(document.querySelectorAll("#main .cgg-kpi"),function(k){ if(/\bt-(in|due|out|stop|zero)\b/.test(k.className)) return;
    var lb=String((k.querySelector("small")||{}).textContent||""), v=String((k.querySelector("strong")||{}).textContent||"").replace(/[^\d.\-]/g,"");
    var tn=/실패/.test(lb)?"stop":/받을|대기|확인 필요|미수|안 된|못 /.test(lb)?"due":/입금|받은/.test(lb)?"in":"";
    if(tn && Number(v)===0) tn="zero"; if(tn) k.classList.add("t-"+tn); }); }catch(e){}
  try{ Array.prototype.forEach.call(document.querySelectorAll("#main .card > h3"),function(h){ if(OWN.test(String(h.textContent||"").trim())) h.parentNode.classList.add("chk-own"); }); }catch(e){}
};

/* ⑩ 입·출금 내역 › 받을 금액 — 워시 모양(대조표 05): 제목 «받을 금액 ○원» · 달 고르기 + «받은 건 숨기기» · 숫자 칸(남은 딜러) · 표에 입금 상태 */
var RCV_HIDE=true;
PAGE.recv=function(){
  var ALL=(BILLS||[]).map(function(b){ return {id:b.id, name:b.name, comp:b.comp||"", ym:ST.ym, cnt:Number(b.cnt)||0, left:Math.max(0,Number(b.left)||0), paid:Number(b.paid)||0,
      st:Number(b.left)>0?(Number(b.paid)>0?"일부 입금":"입금 대기"):"완료", _q:b.name+" "+(b.comp||"")}; });
  var L=RCV_HIDE?ALL.filter(function(r){ return r.left>0; }):ALL;
  var s=0, got=0, n=0; ALL.forEach(function(r){ s+=r.left; got+=r.paid; if(r.left>0) n++; });
  var sentL=(BILLS||[]).filter(function(b){ return Number(b.left)>0 && (b.sentRaw||b.sent); }).sort(function(a,z){ return String(a.sentRaw||a.sent)<String(z.sentRaw||z.sent)?-1:1; });
  var oldest=!n?"없음":(sentL.length?String(sentL[0].sent).slice(0,5):Number(String(ST.ym).slice(5,7))+"월분");
  return head("받을 금액 <em>"+esc(won(s))+"원</em>","청구서를 보냈는데 아직 다 안 들어온 돈이에요. 입금이 들어오면 «입금 · 출금»에서 청구서와 맞춰요.")+
    '<div class="cgg-tools">'+ymPicker("rcYm","청구 달")+'<span class="sp"></span><label class="chip"><input type="checkbox" id="rcHide"'+(RCV_HIDE?" checked":"")+'> 받은 건 숨기기</label></div>'+
    sums([["받을 금액",won(s)+"원","warn"],["지금까지 받은 금액",won(got)+"원","good"],["가장 오래된 건",oldest],["남은 딜러",won(n)+"명"]])+
    tableBlock("rcv",[
      {k:"name",t:"딜러",name:true,fmt:function(v){ return '<b>'+esc(v)+'</b>'; }},
      {k:"comp",t:"상사",fmt:function(v){ return esc(v||"—"); }},
      {k:"ym",t:"청구 기간",kind:"id",fmt:function(v){ return esc(ymText(v)); }},
      {k:"cnt",t:"대수",num:true,fmt:function(v){ return won(v)+"대"; }},
      {k:"left",t:"받을 금액",num:true,fmt:function(v){ return won(v)+'원'; }},
      {k:"st",t:"입금",state:true,fmt:tag}
    ], L, {actions:function(r){ return r.left>0?[{key:"in",label:"입금 확인",attr:"data-rcgo",val:r.id}]:[]; }})+
    CGG.help("«입금 확인»을 누르면 입·출금 내역으로 가요. 들어온 줄을 골라 «선택한 줄 청구서에 맞추기»를 누르면 여기서 빠져요.","이 화면 사용법");
};
var _ar=AFTER.recv;
AFTER.recv=function(){ if(_ar) _ar.apply(this,arguments); var h=$("rcHide"); if(h) h.onchange=function(){ RCV_HIDE=h.checked; ts("rcv").page=1; draw(); }; };
/* ⑪ «준비 중» 글 없애기 — 백업 · 기기는 지금 되는 것만 */
var _pbk=PAGE.backup;
PAGE.backup=function(){
  var tmp=document.createElement("div"); tmp.innerHTML=_pbk.apply(this,arguments);
  Array.prototype.forEach.call(tmp.querySelectorAll(".card"),function(c){ var h=c.querySelector("h3"); if(h&&/다음에 붙일 기능/.test(h.textContent)) c.remove(); });
  var p=tmp.querySelector(".cgg-head p"); if(p) p.textContent="자료는 서버에 있어 PC · 폰 어디서 열어도 같아요. 화면 배치 · 글씨는 이름 단추 › 화면 설정에서 바꿔요.";
  return tmp.innerHTML;
};

/* ⑫ 설정 › 알림 — 워시 v137 차례: 메시지 발송 연동(보내는 번호) → 카카오 알림톡(문구 보기) → PC 알림창 · 소리 (보낸 기록은 서버 창구가 생기면) */
var _pa3=PAGE.alarm;
PAGE.alarm=function(){
  var tmp=document.createElement("div"); tmp.innerHTML=_pa3.apply(this,arguments);
  var head=tmp.querySelector(".cgg-head"), cards=[].slice.call(tmp.querySelectorAll(":scope > .card")), help=tmp.querySelector(":scope > .cgg-help");
  function find(re){ return cards.filter(function(c){ var h=c.querySelector("h3"); return h&&re.test(h.textContent); }); }
  var send=find(/발신번호|보내는 번호/), ata=find(/알림톡 문구/), snd=cards.filter(function(c){ return send.indexOf(c)<0&&ata.indexOf(c)<0; });
  send.forEach(function(c){ var h=c.querySelector("h3"); if(h) h.textContent="메시지 발송 연동 — 보내는 번호(발신번호)"; });
  ata.forEach(function(c){ var h=c.querySelector("h3"); if(h) h.textContent="카카오 알림톡"; });
  snd.forEach(function(c){ var h=c.querySelector("h3"); if(h&&/^전체 소리/.test(h.textContent)) h.textContent="PC 알림창 · 소리"; });
  var out=document.createElement("div"); if(head) out.appendChild(head);
  send.concat(ata, snd).forEach(function(c){ out.appendChild(c); }); if(help) out.appendChild(help);
  [].slice.call(tmp.childNodes).forEach(function(n){ if(n.nodeType===1&&!out.contains(n)) out.appendChild(n); });   /* 남은 것은 뒤에 그대로 */
  return out.innerHTML;
};

/* ⑬ 설정 › 알림 › 보낸 기록 — 워시 v138 과 같은 모양 · 같은 이름(알림 맨 아래 카드 → «보낸 기록 열기» → 따로 화면: 숫자 4칸 «보낸 수 · 발송 실패 · 예약 · 남은 문자» · 표 «만든 시각 · 종류 · 받는 번호 · 방식 · 상태»)
   서버 check-api v52 sendLogList (대표만 · 92일까지). err 칸에 문자 업체 원문이 섞일 수 있어서 상태 칸 안 작은 글로 글자 그대로(esc)만.
   체크만 다름: «내용» 칸 없음(서버가 본문을 안 남김) · 다시 보내기/예약 취소 없음(그 화면에서 다시 보내요) */
var SL={rows:null, sums:null, err:"", days:7}, SL7=null;
function slYmd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function slCall(days){ var t=new Date(), f=new Date(t.getTime()-(days-1)*864e5); return call("sendLogList",[{from:slYmd(f), to:slYmd(t)}]); }
function slOld(e){ return /sendLogList|unknown|없는 (기능|요청)|not found/i.test(String((e&&e.message)||"")); }
function slLoad(){
  SL.err="";
  return slCall(SL.days).then(function(r){ r=r||{}; SL.rows=(r.list||[]).map(function(x,i){
      return {id:"sl"+i, at:String(x.createdAt||""), type:String(x.type||""), to:String(x.to||""), kind:String(x.kind||""), st:String(x.status||""), err:String(x.err||"")}; });
      SL.sums=r.sums||{}; SL.need=r.need?String(r.need):""; if(SL.days===7) SL7=SL.sums; })
    .catch(function(e){ SL.rows=[]; SL.sums=null; SL.err=slOld(e)?"old":String((e&&e.message)||""); });
}
function slSt(v,r){ var k=/실패/.test(v)?"stop":/대기/.test(v)?"run":/안 보냄/.test(v)?"chk":"done";
  return '<span class="cgg-st '+k+'">'+esc(v||"—")+'</span>'+(r&&r.err?'<span class="b" style="color:var(--stop)">'+esc(r.err)+'</span>':''); }
function slLeft(){ try{ var pp=window.ccwPlanGet&&window.ccwPlanGet(); if(pp&&pp.smsLeft!=null) return won(pp.smsLeft)+"건"; }catch(e){} return "-"; }
PAGE.sendlog=function(){
  var own=isOwner();
  var h=head("보낸 기록","보낸 메시지와 못 보낸 메시지가 모두 남아요. 못 보낸 건 까닭을 보고 그 화면에서 다시 보내요.")+
    '<div class="cgg-tools"><button type="button" class="btn" data-v56go="alarm">‹ 알림으로</button></div>';
  if(!own) return h+card("보낸 기록은 대표만 볼 수 있어요","","");
  h+='<div class="cgg-tools">'+[[1,"오늘"],[7,"최근 7일"],[31,"최근 31일"],[92,"최근 92일"]].map(function(x){ return '<button type="button" class="cgg-fp'+(SL.days===x[0]?' on':'')+'" data-sld="'+x[0]+'">'+x[1]+'</button>'; }).join("")+'</div>';
  if(SL.rows===null) return h+'<div class="card"><div class="loading">보낸 기록을 읽고 있어요…</div></div>';
  if(SL.err==="old") return h+card("체크 서버를 v52로 올리면 보여요","보낸 기록은 서버 check-api v52부터 볼 수 있어요. 보내기는 지금도 그대로 돼요.","");
  if(SL.err) return h+card("보낸 기록을 읽지 못했어요",esc(niceMsg(SL.err)),"");
  if(SL.need) return h+card("보낸 기록을 아직 볼 수 없어요","서버에 보낸 기록 저장 칸(SQL 11)이 아직 없어요. 차곳간(총괄)에 알려 주세요. 보내기는 지금도 그대로 돼요.","");   /* 보안 낮음: need 를 0건으로 보이지 않게 */
  var S=SL.sums||{};
  return h+sums([["보낸 수",won((S.sent||0)+(S.sub||0))+"건","good"],["발송 실패",won(S.fail||0)+"건","bad"],["예약",won(S.wait||0)+"건"],["남은 문자",slLeft()]])+
    tableBlock("sl",[
      {k:"type",t:"종류"},
      {k:"to",t:"받는 번호"},
      {k:"kind",t:"방식"},
      {k:"at",t:"만든 시각",kind:"id"},
      {k:"st",t:"상태",state:true,fmt:slSt}
    ], SL.rows, {tools:'<button class="btn">엑셀 다운로드</button>'})+
    CGG.help("알림톡이 안 가면 문자로 대신 가요(«문자 대체»). «실패»는 상태 칸 아래 까닭을 보고, 번호를 고친 뒤 그 화면(청구서 · 배달 · 재검사)에서 다시 보내요. 최근 92일까지 볼 수 있어요.","이 화면 사용법");
};
AFTER.sendlog=function(){
  Array.prototype.forEach.call(document.querySelectorAll("#main [data-v56go]"),function(b){ b.onclick=function(){ go(b.getAttribute("data-v56go")); }; });
  Array.prototype.forEach.call(document.querySelectorAll("#main [data-sld]"),function(b){ b.onclick=function(){ SL.days=Number(b.getAttribute("data-sld"))||7; SL.rows=null; draw(); }; });
  if(isOwner() && SL.rows===null){ slLoad().then(function(){ if(page==="sendlog") draw(); }); return; }
  if(SL.rows) wireTable("sl",function(){ draw(); });
};
/* 알림 맨 아래 «보낸 기록» 카드 — 숫자는 늘 «최근 7일» (대표만 단추) */
var _pa4=PAGE.alarm;
PAGE.alarm=function(){
  var own=isOwner(), S=SL7, f=S?(S.fail||0):0, n=S?((S.sent||0)+(S.sub||0)):0;
  var base=_pa4.apply(this,arguments), card1='<div class="card" id="chkOutbox"><h3>보낸 기록<span class="rt">'+(!own?'대표만 볼 수 있어요':!S?'최근 7일':(f?'<span style="color:var(--stop)">최근 7일 못 보냄 '+won(f)+'건</span>':'최근 7일 보냄 '+won(n)+'건'))+'</span></h3>'+
    '<p class="csub">보낸 메시지를 보고, 못 보낸 것은 까닭을 보고 다시 보내요.</p>'+(own?'<div class="tools"><button type="button" class="btn'+(f?' primary':'')+'" data-v56go="sendlog">보낸 기록 열기</button></div>':'')+'</div>';
  var hi=base.lastIndexOf('<details class="cgg-help');   /* 워시처럼 알림 맨 아래(도움 카드 앞) */
  return hi>=0 ? base.slice(0,hi)+card1+base.slice(hi) : base+card1;
};
var _aa4=AFTER.alarm, SL7ask=false;
AFTER.alarm=function(){ if(_aa4) _aa4.apply(this,arguments);
  Array.prototype.forEach.call(document.querySelectorAll("#main [data-v56go]"),function(b){ b.onclick=function(){ go(b.getAttribute("data-v56go")); }; });
  if(isOwner() && !SL7 && !SL7ask){ SL7ask=true; slCall(7).then(function(r){ if(r&&r.need) return; SL7=(r&&r.sums)||{}; if(page==="alarm") draw(); }).catch(function(){}); }
};
var _g2=groupOf;
window.groupOf=groupOf=function(p){ if(p==="sendlog") return ["set",SETS]; return _g2.apply(this,arguments); };
var _cc2=chkCur;
window.chkCur=chkCur=function(){ if(page==="sendlog") return "set/alarm"; return _cc2.apply(this,arguments); };
CR.sendlog="설정 › 알림 › 보낸 기록";
})();
</script>
