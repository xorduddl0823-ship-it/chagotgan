/* ═══════════════════════════════════════════════════════════════════
   워시 통합 시안 (v132 후보) — 새 규칙 .claude/skills/chagotgan-builder/SKILL.md 그대로
   공통 부품 cgg-j4 1.8 + 워시 메뉴 지도 위에 덧칠. 자료는 모두 지어낸 예시예요.
   대표님 결정 3가지는 맨 위 «시안 고르기» 띠에서 바로 바꿔 봐요(추천 표시).
   ═══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var esc=CGG.esc, won=CGG.won;
var DEF={find:"btn", rec:"sales", pay:"입금"};
var PICK=(function(){ var o={}; try{ o=JSON.parse(localStorage.getItem("wz_pick")||"{}")||{}; }catch(e){}
  return {find:o.find||DEF.find, rec:o.rec||DEF.rec, pay:o.pay||DEF.pay}; })();
function savePick(){ try{ localStorage.setItem("wz_pick",JSON.stringify(PICK)); }catch(e){} }

/* ── 결정 3가지 ── */
var Q=[
  {key:"find", title:"① 기능 찾기 자리", opts:[["btn","공지 앞 돋보기 단추",1],["wide","공지 앞 넓은 찾기 칸"],["nav","메뉴 줄 오른쪽 끝"]]},
  {key:"rec",  title:"② «기록» 탭에 넣을 화면", opts:[["sales","매출 기록",1],["done","끝난 차 기록"],["both","매출 + 보낸 알림"]]},
  {key:"pay",  title:"③ 홈 오른쪽 카드 이름", opts:[["입금","이번 달 입금",1],["수금","이번 달 수금"]]}
];
var CHANGED=[
  ["머리말 왼쪽","«광택 · 세차 정산 · v132 · 2026-10-18» — 설명 · 판 · 날짜 한 줄"],
  ["머리말 오른쪽 차례","(기능 찾기) → 공지 → 도움말 → 주소 → 새로고침 → 30초마다 → 연결됨 → 현장 화면 → 사람 단추"],
  ["단추 이름","«링크 복사» → «주소», «저장됨 09:12» → «연결됨» (좁은 PC «더보기 ▾» 안 이름은 공통 부품 1.9에서 함께 바뀌어요)"],
  ["사람 단추","이름 밑에 «마이페이지 · 휴지통»이 보여요. 휴지통 · 로그아웃은 그 안에"],
  ["탭 차례","홈 → 일감 → 기록 → 월별 청구서 → 입·출금 내역 → 세금계산서 → 배달 · 자재(워시 전용) → 설정"],
  ["탭 이름","«청구서» → «월별 청구서», «입출금» → «입·출금 내역», «매출» → «기록»(② 고르기)"],
  ["화면 뼈대","모든 일 화면: 제목+설명 → 할 일 띠 [해결하러 가기] → 도구줄 → 숫자 칸 4개 → 표 → 접힌 도움"],
  ["숫자 칸","4칸 · 가운데 정렬 · 자릿수 맞춤"],
  ["표","정렬 · 검색 · 5/10/20/30/50 · 차량번호 칸 틀 고정 · 큰 체크칸"],
  ["요금제 · 사용량","화면 위 줄에서 빼고 사람 단추 › 마이페이지 창 안으로"],
  ["알림 색","입고 파랑 · 출고 초록 · 입금 남색 (달력 · 상태 칩)"],
  ["달 고르기","목록 상자 대신 달력식(12칸) 창"],
  ["되돌리기 어려운 일","입금 완료 · 청구서 보내기 · 세금계산서 발행 전에 «누구에게 · 몇 건 · 얼마» 확인 창"]
];

/* ── 메뉴 (규칙 3 차례) ── */
function recLabel(){ return PICK.rec==="done"?"끝난 차 기록":PICK.rec==="both"?"매출 · 보낸 알림":"매출 기록"; }
function groups(){
  var rec={key:"record",label:"기록",icon:"chart"};
  if(PICK.rec==="both") rec.subs=[{key:"sales",label:"매출"},{key:"sent",label:"보낸 알림"}];
  if(PICK.rec==="done") rec.subs=[{key:"done",label:"끝난 차"},{key:"sales",label:"매출"}];
  var st=[{key:"biz",label:"우리 사업장"},{key:"parties",label:"거래처"},{key:"staff",label:"직원 계정"},{key:"items",label:"작업 항목 · 단가표"},
          {key:"caropt",label:"출고 지연 기준"},{key:"bank",label:"입금 자동 확인"},{key:"send",label:"알림"},{key:"qr",label:"QR 코드"},{key:"bak",label:"백업 · 기기"}];
  if(PICK.rec!=="both") st.splice(7,0,{key:"outbox",label:"보낸 기록"});
  return [
    {key:"home",label:"홈",icon:"home"},
    {key:"ledger",label:"일감",icon:"car",subs:[{key:"list",label:PICK.rec==="done"?"작업 중 · 출고 대기":"입고 · 출고 내역"}]},
    rec,
    {key:"bill",label:"월별 청구서",icon:"file"},
    {key:"money",label:"입·출금 내역",icon:"wallet",subs:[{key:"io",label:"입금 · 출금"},{key:"due",label:"받을 금액"}]},
    {key:"tax",label:"세금계산서",icon:"receipt"},
    {key:"delivery",label:"배달",icon:"truck",badge:1,subs:[{key:"outlog",label:"출고 기록"},{key:"dest",label:"목적지"},{key:"msg",label:"문구 · 발송 설정"}]},
    {key:"mat",label:"자재",icon:"box"},
    {key:"settings",label:"설정",icon:"gear",subs:st}
  ];
}
var TABS=[{key:"home",icon:"home",label:"홈"},{key:"ledger",icon:"car",label:"일감"},{key:"bill",icon:"file",label:"월별 청구서"},{key:"money",icon:"wallet",label:"입·출금 내역"},{key:"__all",icon:"more",label:"전체"}];
/* 기능 목록 — 메뉴 지도 확정본을 새 이름으로 */
function feats(){
  return CGG_MENU_WASH.feats.map(function(f){ var x=Object.assign({},f), p=x.path;
    p=p.replace(/^청구서 ›.*/,"월별 청구서").replace(/^청구서$/,"월별 청구서").replace(/^입출금 ›/,"입·출금 내역 ›").replace(/^매출$/,PICK.rec==="sales"?"기록":"기록 › 매출")
       .replace("머리말 › 링크 복사","머리말 › 주소").replace(/^사람 버튼/,"사람 단추");
    if(x.go==="sales") x.go="record/sales";
    if(x.id==="outbox"&&PICK.rec==="both"){ p="기록 › 보낸 알림"; x.go="record/sent"; }
    if(x.id==="ledger"&&PICK.rec==="done"){ p="일감 › 작업 중 · 출고 대기"; }
    x.path=p; return x; });
}

/* ── 지어낸 자료 ── */
var CARS=[
  ["12가3456","가온모터스","김성훈","광택 · 실내세차","10-17",150000,"입고"],
  ["34나5678","샘플모터스","이민준","외부세차","10-17",30000,"출고"],
  ["56다7890","누리상사","박서연","광택","10-16",100000,"출고"],
  ["78라1234","가온모터스","최지우","하부세차","10-16",50000,"입금 완료"],
  ["90마5678","다온카","정하윤","광택 · 유리막","10-15",220000,"출고"],
  ["11바2233","샘플모터스","이민준","실내세차","10-15",40000,"입금 완료"],
  ["22사3344","누리상사","한도윤","광택","10-14",90000,"입고"],
  ["33아4455","가람모터스","윤서아","외부세차","10-14",40000,"출고"],
  ["44자5566","다온카","정하윤","광택","10-13",120000,"입금 완료"],
  ["55차6677","가온모터스","김성훈","외부세차 · 하부세차","10-12",80000,"출고"],
  ["66카7788","가람모터스","강민재","광택","10-11",100000,"입금 완료"],
  ["77타8899","샘플모터스","오지안","실내세차","10-10",40000,"출고"]
];
var BILLS=[["가온모터스","4대",400000,"안 보냄"],["샘플모터스","3대",110000,"안 보냄"],["누리상사","2대",190000,"보냄"],["다온카","2대",340000,"안 보냄"],["가람모터스","2대",140000,"보냄"]];
var ST={"입고":"run","출고":"done","입금 완료":"pay","보냄":"done","안 보냄":"chk","발행 대기":"chk","발행됨":"done","입금":"pay","출금":"out","실패":"stop","보냄 · 알림톡":"done","부족":"stop","넉넉":"done","예약":"run"};
var MON={y:2026,m:10};
function monLabel(){ return MON.y+"년 "+MON.m+"월"; }
function sum(a){ return a.reduce(function(t,x){ return t+x; },0); }

/* ── 머리말 ── */
var cur="home", HDR=null, TBL={};
function go(k){ cur=norm(k); draw(); window.scrollTo(0,0); }
function grp(k){ return groups().filter(function(g){ return g.key===k.split("/")[0]; })[0]; }
function norm(k){ var g=grp(k); if(!g) return "home"; if(g.subs&&g.subs.length&&k.indexOf("/")<0) return g.key+"/"+g.subs[0].key;
  if(g.subs&&!g.subs.some(function(s){ return g.key+"/"+s.key===k; })) return g.key+"/"+g.subs[0].key; return k; }
function goFeat(f){ CGG.closeDialog&&CGG.closeDialog(); if(f.go==="me/me"){ myPage(); return; } if(f.go==="me/plan"){ myPage("plan"); return; }
  if(/^me\//.test(f.go)){ CGG.toast("사람 단추 › «"+f.label+"»을(를) 열어요 (시안)"); return; }
  if(/^field\//.test(f.go)){ CGG.toast("현장 화면 «"+(f.go==="field/in"?"입고":"출고")+"»으로 가요 (시안)"); return; }
  if(/^hdr\//.test(f.go)){ CGG.toast("머리말 «"+f.label+"» (시안)"); return; }
  go(f.go); }
function findDialog(){
  CGG.dialog({size:"form",title:"기능 찾기",desc:"하고 싶은 일을 쉬운 말로 쳐 보세요. 예) 입금 완료, 청구서 보내기, 딜러 추가",body:'<div class="wz-find-dlg" id="wzFindBox"></div>'});
  var b=document.getElementById("wzFindBox"); CGG.find(b, feats(), goFeat, {});
  setTimeout(function(){ var i=b.querySelector("input"); if(i) i.focus(); },60);
}
function header(){
  var top=document.getElementById("top");
  HDR=CGG.header(top,{product:"워시", sub:"광택 · 세차 정산", ver:"v132 · 2026-10-18",
    biz:{name:"예시 광택", line:"사업자 000-00-00091 · 대표 홍길동"},
    find:PICK.find==="wide"?{feats:feats(), onGo:goFeat, onPhone:function(){ CGG.allMenu(groups(), cur, go, feats(), goFeat, {focus:true}); }}:null,
    notice:function(){ CGG.toast("공지사항 (시안)"); }, help:function(){ CGG.toast("도움말 (시안)"); },
    link:function(){ CGG.toast("직원 앱 주소를 복사했어요 (시안)"); }, refresh:function(){ CGG.toast("새로고침했어요"); },
    auto:{value:"30", options:[["0","자동 끄기"],["30","30초마다"],["60","1분마다"]], onChange:function(){}}, saved:"연결됨",
    field:{label:"현장 화면", on:function(){ CGG.toast("현장 화면(입고 · 출고 큰 단추)으로 바뀌어요 (시안)"); }},
    me:{name:"김대표", role:"대표", items:[{key:"me",icon:"user",label:"마이페이지",note:"요금제 · 사용량"},{key:"trash",icon:"trash",label:"휴지통"},"-",{key:"lay",icon:"pc",label:"화면 설정",note:CGG.layout.name()},"-",{key:"out",icon:"out",label:"로그아웃"}],
      onPick:function(k){ if(k==="me") myPage(); else CGG.toast(k==="trash"?"휴지통 (시안)":k==="out"?"로그아웃 (시안)":"화면 설정 (시안)"); }}});
  var lk=top.querySelector('[data-hb="link"] span'); if(lk) lk.textContent="주소";
  var sv=top.querySelector('[data-hb="saved"]'); if(sv){ sv.classList.add("wz-conn"); sv.innerHTML='<i aria-hidden="true"></i>연결됨'; }
  var me=top.querySelector('[data-hb="me"]'); if(me) me.innerHTML='<span>김대표 ▾</span><small>마이페이지 · 휴지통</small>';
  if(PICK.find==="btn"){ var r=top.querySelector(".cgg-right"), b=document.createElement("button");
    b.type="button"; b.className="cgg-hb wz-find"; b.setAttribute("aria-label","기능 찾기"); b.innerHTML=CGG.ic("search")+'<span>찾기</span>';
    b.onclick=findDialog; r.insertBefore(b, r.firstChild); }
  HDR.fit&&HDR.fit();
}

/* ── 공통 화면 뼈대: 제목+설명 → 할 일 띠 → 도구줄 → 숫자 칸 4 → 표 → 도움 ── */
function screen(o){
  var main=document.getElementById("main");
  main.innerHTML=CGG.head({crumb:o.crumb, title:esc(o.title), desc:o.desc})
    +(o.band?'<div class="wz-band'+(o.band.ok?' ok':'')+'" role="status"><span>'+esc(o.band.text)+'</span>'+(o.band.go?'<button type="button" class="cgg-btn pri" id="wzBandGo">해결하러 가기</button>':'')+'</div>':'')
    +'<div class="wz-tools" id="wzTools"></div><div id="wzKpi"></div><div class="wz-gap"></div><div id="wzTbl"></div>'+CGG.help(o.help||"","이 화면 사용법");
  var t=document.getElementById("wzTools");
  if(o.month===false&&!o.tools&&!o.pri){ t.remove(); }
  else
  t.innerHTML=(o.month!==false?'<button type="button" class="cgg-btn wz-mon" id="wzMon">'+CGG.ic("today")+'<b>'+monLabel()+'</b> ▾</button>':'')
    +(o.tools||"")+'<span class="sp"></span>'+(o.pri?'<button type="button" class="cgg-btn pri" id="wzPri">'+esc(o.pri.label)+'</button>':'');
  var m=document.getElementById("wzMon"); if(m) m.onclick=monthPick;
  var p=document.getElementById("wzPri"); if(p) p.onclick=o.pri.on;
  var bg=document.getElementById("wzBandGo"); if(bg) bg.onclick=o.band.go;
  CGG.kpis(document.getElementById("wzKpi"), o.kpis);
  TBL[cur]=TBL[cur]||{};
  if(o.table) return CGG.table(document.getElementById("wzTbl"), Object.assign({state:TBL[cur], size:10, stateMap:ST}, o.table));
}
var XLS='<button type="button" class="cgg-btn" onclick="CGG.toast(\'엑셀 받기 (시안)\')">'+CGG.ic("down")+'엑셀 받기</button>';
function monthPick(){
  var y=MON.y;
  function body(){ return '<div class="wz-yr"><button type="button" class="cgg-btn sm" data-y="-1">‹ '+(y-1)+'</button><b>'+y+'년</b><button type="button" class="cgg-btn sm" data-y="1">'+(y+1)+' ›</button></div>'
    +'<div class="wz-mg">'+[1,2,3,4,5,6,7,8,9,10,11,12].map(function(n){ return '<button type="button" data-m="'+n+'" aria-pressed="'+(y===MON.y&&n===MON.m)+'" class="'+(y===2026&&n===10?'now':'')+'">'+n+'월</button>'; }).join("")+'</div>'; }
  CGG.dialog({size:"form",title:"달 고르기",desc:"볼 달을 눌러요. 오늘이 있는 달은 파란 테두리예요.",body:'<div id="wzMP">'+body()+'</div>'});
  function bind(){ var b=document.getElementById("wzMP");
    Array.prototype.forEach.call(b.querySelectorAll("[data-y]"),function(x){ x.onclick=function(){ y+=+x.getAttribute("data-y"); b.innerHTML=body(); bind(); }; });
    Array.prototype.forEach.call(b.querySelectorAll("[data-m]"),function(x){ x.onclick=function(){ MON={y:y,m:+x.getAttribute("data-m")}; CGG.closeDialog(); draw(); CGG.toast(monLabel()+"을(를) 봐요 (시안 자료는 같아요)"); }; }); }
  bind();
}
/* 되돌리기 어려운 일 — 누구에게 · 몇 건 · 얼마 */
function sure(o){
  CGG.dialog({size:"confirm",title:o.title,desc:o.desc,rows:[["누구에게",o.who],["몇 건",o.n],[o.amtLabel||"얼마",won(o.amt)+"원"]].concat(o.more||[]),ok:o.ok,cancel:"취소",
    onOk:function(){ CGG.toast(o.done+" (시안이라 실제로는 아무것도 바뀌지 않아요)"); }});
}
function whoOf(rows,col){ var n={}; rows.forEach(function(r){ n[r[col]]=1; }); var k=Object.keys(n); return k.slice(0,3).join(", ")+(k.length>3?" 외 "+(k.length-3)+"곳":"")+" ("+k.length+"곳)"; }
function pick(ids){ return ids.map(function(i){ return CARS[i]; }); }

/* ── 화면들 ── */
function drawHome(){
  var main=document.getElementById("main"), pay=PICK.pay;
  CGG.home(main,{date:"10월 18일 토요일", title:'받을 금액 <em>730,000원</em>이 남아 있어요', desc:"오늘 10월 18일 · 09:12 기준",
    quick:{feats:feats(), key:"wz_quick_preview", defs:CGG_MENU_WASH.quickDefault, onGo:goFeat},
    todo:{items:[{tone:"stop",icon:"box",title:"자재가 부족해요 2건",sub:"광택약(컴파운드), 휠크리너 — 주문하세요"},{tone:"run",icon:"car",title:"작업 중 · 아직 출고 안 됨 4건",sub:"출고하면 입금 대상이 돼요"},{tone:"chk",icon:"wallet",title:"입금 기한 지난 상사 1곳",sub:"샘플모터스 · 110,000원"}],
      total:9, onPick:function(i){ go(["mat","ledger","money/due"][i]); }, onAll:function(){ CGG.toast("할 일 전체 목록 (시안)"); }},
    kpis:[{label:"오늘 입고차량",value:"7",unit:"대",delta:"+2대",vs:"지난주보다",spark:[3,5,4,6,5,5,7],color:"#1668C4"},
          {label:"작업 중",value:"4",unit:"대",delta:"+1대",vs:"지난주보다",spark:[2,3,3,2,4,3,4],color:"#1668C4"},
          {label:"오늘 출고차량",value:"12",unit:"대",delta:"−1대",down:true,vs:"지난주보다",spark:[9,11,13,10,12,13,12],color:"#1E9E5A"},
          {label:"이번 달 "+pay,value:"840,000",unit:"원",delta:"+12%",vs:"지난달보다",spark:[5,6,6,7,7,8,8.4],color:"#0B2545"}],
    cal:{y:2026,m:10,today:18,legend:[["in","입고","run"],["out","출고","done"],["pay",pay,"pay"]],amtLabel:"그날 청구",
      days:{1:{amt:220000,marks:[["in",3],["out",2]]},2:{amt:180000,marks:[["in",2],["out",2],["pay",1]]},6:{amt:330000,marks:[["in",4],["out",3]]},8:{amt:150000,marks:[["out",2],["pay",2]]},
            13:{amt:270000,marks:[["in",3],["out",3]]},15:{amt:90000,marks:[["in",1],["pay",1]]},16:{amt:410000,marks:[["in",5],["out",4]]},17:{amt:300000,marks:[["in",4],["out",3],["pay",2]]},18:{amt:150000,marks:[["in",2]]}},
      onMove:function(){ monthPick(); },onDay:function(d){ CGG.toast("10월 "+d+"일 자세히 (시안)"); }},
    money:{title:"이번 달 "+pay, link:{label:"입·출금 내역",onClick:function(){ go("money"); }}, big:840000, bar:{done:840000,total:1570000},
      legend:[["받은 것",840000,"done"],["받을 것",730000,"chk"]], rows:[["청구한 상사","5곳"],["입금 기한 지난 곳","1곳"]]},
    rank:{title:"이번 달 일감", link:{label:"기록",onClick:function(){ go("record"); }}, sub:"작업 항목별 · 금액 많은 차례",
      items:[{label:"광택",value:"14대",pct:1},{label:"실내세차",value:"9대",pct:.64},{label:"외부세차",value:"7대",pct:.5},{label:"하부세차",value:"3대",pct:.21}]},
    help:"홈은 정산(청구 · "+pay+" · 받을 금액 · 할 일)만 보여요. 배달은 «배달» 메뉴 안에서만 봐요."});
}
function drawLedger(){
  var doneMode=PICK.rec==="done";
  var rows=CARS.map(function(r){ return r.slice(); }).filter(function(r){ return !doneMode||r[6]!=="입금 완료"; });
  var out=rows.filter(function(r){ return r[6]==="출고"; });
  var api=screen({crumb:"일감", title:doneMode?"작업 중 · 출고 대기":"입고 · 출고 내역", desc:"차 한 대가 한 줄이에요. 출고한 차를 골라 «입금 완료»로 바꿔요.",
    band:{text:"출고했는데 아직 입금 안 된 차 "+out.length+"대 · "+won(sum(out.map(function(r){ return r[5]; })))+"원", go:function(){ TBL[cur].f="출고"; TBL[cur].page=1; draw(); CGG.spot&&CGG.spot(document.getElementById("wzTbl")); }},
    tools:XLS, pri:{label:"입고 등록",on:function(){ CGG.toast("현장 화면 «입고»로 가요 (시안)"); }},
    kpis:[{label:"이번 달 입고",value:"48",unit:"대",color:"#1668C4"},{label:"작업 중",value:"4",unit:"대",color:"#1668C4"},{label:"출고 · 입금 대기",value:String(out.length),unit:"대",color:"#1E9E5A"},{label:"이번 달 "+PICK.pay,value:"840,000",unit:"원",color:"#0B2545"}],
    help:"차량번호를 누르면 자세히 창이 열려요. 표를 옆으로 밀어도 차량번호 칸은 그대로 보여요. 입금 완료는 대표만 할 수 있어요.",
    table:{cols:["차량번호","상사","딜러","작업","입고일","금액","상태"], kinds:["name","text","text","text","date","money","state"], rows:rows,
      tabs:doneMode?[["","전체"],["입고","입고"],["출고","출고"]]:[["","전체"],["입고","입고"],["출고","출고"],["입금 완료","입금 완료"]],
      sorts:[[4,-1,"입고일 최근 차례"],[5,-1,"금액 큰 차례"],[1,1,"상사 가나다"]], find:"차량번호 · 상사 · 딜러",
      mline:function(x){ return x[1]+" · "+x[2]+" · "+x[3]; },
      onName:function(x){ CGG.dialog({size:"detail",title:x[0],rows:[["상사",x[1]],["딜러",x[2]],["작업",x[3]],["입고일",x[4]],["금액",won(x[5])+"원"],["상태",x[6]]]}); },
      bulk:[{key:"paid",label:"선택한 차 입금 완료",needSel:true}],
      onBulk:function(k,ids){ var sel=ids.map(function(i){ return rows[i]; }); if(!sel.length) return;
        sure({title:"입금 완료로 바꿀까요?",desc:"바꾸면 그 차는 받을 금액에서 빠져요.",who:whoOf(sel,1),n:sel.length+"대",amt:sum(sel.map(function(r){ return r[5]; })),ok:sel.length+"대 입금 완료",done:sel.length+"대를 입금 완료로 바꿨어요"}); }}});
}
function drawRecord(){
  var sub=cur.split("/")[1]||"sales";
  if(sub==="sent"){
    var rows=[["가온모터스 · 김성훈","입고 알림톡","10-17 14:20","보냄 · 알림톡"],["샘플모터스 · 이민준","출고 알림톡","10-17 11:05","보냄 · 알림톡"],["누리상사","청구서 알림톡","10-16 18:00","보냄 · 알림톡"],["다온카 · 정하윤","출고 알림톡","10-15 16:40","실패"],["가람모터스","청구서 알림톡","10-15 09:00","예약"]];
    screen({crumb:"기록 › 보낸 알림", title:"보낸 알림", desc:"딜러 · 상사에게 보낸 알림톡 · 문자 기록이에요. 못 보낸 줄은 다시 보내요.",
      band:{text:"못 보낸 알림 1건이 있어요", go:function(){ TBL[cur].f="실패"; draw(); }},
      kpis:[{label:"이번 달 보낸 알림",value:"212",unit:"건"},{label:"알림톡",value:"198",unit:"건"},{label:"문자로 대신",value:"13",unit:"건"},{label:"못 보냄",value:"1",unit:"건"}],
      help:"알림톡이 안 되면 문자로 대신 보내요. 예약한 것은 보내기 전까지 취소할 수 있어요.",
      table:{cols:["받는 곳","종류","보낸 때","결과"], kinds:["name","text","time","state"], rows:rows, tabs:[["","전체"],["보냄 · 알림톡","보냄"],["예약","예약"],["실패","못 보냄"]],
        find:"받는 곳 · 종류", bulk:[{key:"re",label:"선택한 줄 다시 보내기",needSel:true}],
        onBulk:function(k,ids){ var s=ids.map(function(i){ return rows[i]; }); sure({title:"다시 보낼까요?",desc:"알림톡 요금이 다시 들어요.",who:whoOf(s,0),n:s.length+"건",amt:s.length*13,ok:s.length+"건 다시 보내기",done:s.length+"건을 다시 보냈어요"}); }}});
    return;
  }
  if(sub==="done"){
    var dr=CARS.filter(function(r){ return r[6]==="입금 완료"; });
    screen({crumb:"기록 › 끝난 차", title:"끝난 차 기록", desc:"출고하고 입금까지 끝난 차예요. 일감에는 아직 할 일이 있는 차만 남아요.",
      band:{text:"이번 달 끝난 차 "+dr.length+"대 · 모두 입금 완료", ok:true}, tools:XLS,
      kpis:[{label:"끝난 차",value:String(dr.length),unit:"대"},{label:"합계",value:won(sum(dr.map(function(r){ return r[5]; }))),unit:"원"},{label:"평균 작업일",value:"1.4",unit:"일"},{label:"다시 온 차",value:"2",unit:"대"}],
      help:"지난달 차도 달 고르기로 봐요. 입금 완료를 되돌리려면 차량번호를 눌러요(대표만).",
      table:{cols:["차량번호","상사","딜러","작업","입고일","금액","상태"], kinds:["name","text","text","text","date","money","state"], rows:dr, tabs:[["","전체"]], find:"차량번호 · 상사 · 딜러",
        mline:function(x){ return x[1]+" · "+x[3]; }}});
    return;
  }
  var by={}; CARS.forEach(function(r){ var b=by[r[1]]||(by[r[1]]={n:0,a:0,p:0}); b.n++; b.a+=r[5]; if(r[6]==="입금 완료") b.p+=r[5]; });
  var srows=Object.keys(by).map(function(k){ var b=by[k]; return [k,b.n+"대",b.a,b.p,b.a-b.p]; });
  screen({crumb:PICK.rec==="sales"?"기록":"기록 › 매출", title:"매출 기록", desc:"상사별 · 달별로 얼마를 했는지 봐요. 숫자는 출고 기준이에요.",
    band:{text:"지난달보다 매출이 12% 늘었어요", ok:true},
    tools:'<button type="button" class="cgg-btn">상사별</button><button type="button" class="cgg-btn">작업별</button><button type="button" class="cgg-btn">날짜별</button>'+XLS,
    kpis:[{label:"이번 달 매출",value:won(sum(CARS.map(function(r){ return r[5]; }))),unit:"원",delta:"+12%",vs:"지난달보다"},{label:"차 대수",value:String(CARS.length),unit:"대"},{label:PICK.pay+" 받은 것",value:"310,000",unit:"원"},{label:"한 대 평균",value:"88,333",unit:"원"}],
    help:"상사 이름을 누르면 그 상사 차만 모아 봐요. 엑셀로도 받을 수 있어요.",
    table:{cols:["상사","대수","매출","받은 것","받을 것"], kinds:["name","id","money","money","money"], rows:srows, find:"상사",
      onName:function(x){ CGG.toast(x[0]+" 차만 모아 봐요 (시안)"); }}});
}
function drawBill(){
  var rows=BILLS.map(function(r){ return r.slice(); });
  var notSent=rows.filter(function(r){ return r[3]==="안 보냄"; });
  screen({crumb:"월별 청구서", title:"월별 청구서", desc:"상사마다 한 달 치를 모아 청구서를 보내요. 고른 곳의 합계가 확인 창에 나와요.",
    band:{text:"아직 안 보낸 청구서 "+notSent.length+"곳 · "+won(sum(notSent.map(function(r){ return r[2]; })))+"원", go:function(){ TBL[cur].f="안 보냄"; draw(); }},
    tools:'<button type="button" class="cgg-btn">계좌 · 기한</button><button type="button" class="cgg-btn">'+CGG.ic("down")+'인쇄 · 그림</button>',
    kpis:[{label:"청구할 곳",value:String(rows.length),unit:"곳"},{label:"청구 합계",value:won(sum(rows.map(function(r){ return r[2]; }))),unit:"원"},{label:"보낸 곳",value:String(rows.length-notSent.length),unit:"곳"},{label:"안 보낸 곳",value:String(notSent.length),unit:"곳"}],
    help:"상사 이름을 누르면 청구서 미리보기가 열려요. 계좌 · 입금 기한은 위 «계좌 · 기한»에서 한 번만 넣어요.",
    table:{cols:["상사","대수","금액","상태"], kinds:["name","id","money","state"], rows:rows, tabs:[["","전체"],["안 보냄","안 보냄"],["보냄","보냄"]], find:"상사",
      onName:function(x){ CGG.dialog({size:"detail",title:x[0]+" · "+monLabel()+" 청구서",rows:[["대수",x[1]],["금액",won(x[2])+"원"],["상태",x[3]]],body:'<p class="desc">미리보기 그림이 여기 나와요 (시안)</p>'}); },
      bulk:[{key:"send",label:"선택한 곳에 청구서 보내기",needSel:true}],
      onBulk:function(k,ids){ var s=ids.map(function(i){ return rows[i]; }); sure({title:"청구서를 보낼까요?",desc:"알림톡으로 가요. 안 되면 문자로 대신 가요.",who:whoOf(s,0),n:s.length+"곳",amt:sum(s.map(function(r){ return r[2]; })),ok:s.length+"곳에 보내기",done:s.length+"곳에 청구서를 보냈어요"}); }}});
}
function drawMoney(){
  var sub=cur.split("/")[1];
  if(sub==="due"){
    var rows=[["샘플모터스","10-10",110000,"기한 지남"],["가온모터스","10-25",320000,"기다림"],["다온카","10-25",220000,"기다림"],["가람모터스","10-25",40000,"기다림"],["누리상사","10-25",40000,"기다림"]];
    screen({crumb:"입·출금 내역 › 받을 금액", title:"받을 금액", desc:"출고했지만 아직 입금되지 않은 금액을 상사별로 모았어요.",
      band:{text:"입금 기한 지난 곳 1곳 · 110,000원", go:function(){ TBL[cur].f="기한 지남"; draw(); }},
      kpis:[{label:"받을 금액",value:"730,000",unit:"원"},{label:"상사",value:"5",unit:"곳"},{label:"기한 지남",value:"1",unit:"곳"},{label:"이번 주 기한",value:"0",unit:"곳"}],
      help:"상사 이름을 누르면 그 상사의 차 목록이 열려요.",
      table:{cols:["상사","입금 기한","금액","상태"], kinds:["name","date","money","state"], rows:rows, tabs:[["","전체"],["기한 지남","기한 지남"],["기다림","기다림"]], stateMap:{"기한 지남":"stop","기다림":"chk"}, find:"상사"}});
    return;
  }
  var io=[["가온모터스","10-17","입금",320000,"입금"],["자재 · 광택약","10-16","출금",88000,"출금"],["누리상사","10-16","입금",190000,"입금"],["다온카","10-15","입금",120000,"입금"],["가람모터스","10-11","입금",100000,"입금"]];
  screen({crumb:"입·출금 내역 › 입금 · 출금", title:"입금 · 출금", desc:"통장에 들어오고 나간 돈이에요. 입금 자동 확인을 켜면 저절로 채워져요.",
    band:{text:"누가 보낸 돈인지 모르는 입금 1건이 있어요", go:function(){ CGG.toast("확인할 입금으로 가요 (시안)"); }},
    pri:{label:"입금 · 출금 넣기",on:function(){ CGG.toast("넣기 창 (시안)"); }},
    kpis:[{label:"이번 달 "+PICK.pay,value:"840,000",unit:"원"},{label:"이번 달 출금",value:"88,000",unit:"원"},{label:"남은 돈",value:"752,000",unit:"원"},{label:"확인 필요",value:"1",unit:"건"}],
    help:"입금은 남색, 출금은 회색으로 보여요.",
    table:{cols:["누구","날짜","종류","금액","상태"], kinds:["name","date","text","money","state"], rows:io, tabs:[["","전체"],["입금","입금"],["출금","출금"]], find:"누구 · 메모"}});
}
function drawTax(){
  var rows=[["가온모터스","220-81-*****",400000,"발행 대기"],["다온카","314-86-*****",340000,"발행 대기"],["누리상사","125-81-*****",190000,"발행됨"],["가람모터스","206-86-*****",140000,"발행됨"]];
  screen({crumb:"세금계산서", title:"세금계산서", desc:"«계산서 끊음»인 상사 · 딜러만 나와요. 홈택스로 바로 발행해요.",
    band:{text:"발행 안 한 세금계산서 2곳 · 740,000원 (부가세 별도)", go:function(){ TBL[cur].f="발행 대기"; draw(); }},
    tools:'<button type="button" class="cgg-btn">'+CGG.ic("down")+'홈택스 엑셀</button>',
    kpis:[{label:"발행할 곳",value:"4",unit:"곳"},{label:"공급가액",value:"1,070,000",unit:"원"},{label:"부가세",value:"107,000",unit:"원"},{label:"발행 대기",value:"2",unit:"곳"}],
    help:"발행하면 되돌릴 수 없어요. 확인 창에서 받는 곳 · 건수 · 금액을 한 번 더 봐요.",
    table:{cols:["받는 곳","사업자번호","공급가액","상태"], kinds:["name","id","money","state"], rows:rows, tabs:[["","전체"],["발행 대기","발행 대기"],["발행됨","발행됨"]], find:"받는 곳",
      bulk:[{key:"iss",label:"선택한 곳 발행",needSel:true}],
      onBulk:function(k,ids){ var s=ids.map(function(i){ return rows[i]; }); var a=sum(s.map(function(r){ return r[2]; }));
        sure({title:"세금계산서를 발행할까요?",desc:"발행하면 국세청으로 바로 가요. 되돌릴 수 없어요.",who:whoOf(s,0),n:s.length+"건",amtLabel:"얼마 (부가세 포함)",amt:Math.round(a*1.1),more:[["공급가액 · 부가세",won(a)+"원 · "+won(Math.round(a*0.1))+"원"]],ok:s.length+"건 발행",done:s.length+"건을 발행했어요"}); }}});
}
function drawDelivery(){
  var rows=[["34나5678","샘플모터스 전시장","10-17 11:05","보냄 · 알림톡"],["90마5678","다온카 본점","10-15 16:40","실패"],["33아4455","가람 오토갤러리","10-14 10:20","보냄 · 알림톡"]];
  screen({crumb:"배달 › 출고 기록", title:"출고 기록", desc:"출고한 차가 어디로 갔는지, 딜러에게 알림이 갔는지 봐요.",
    band:{text:"못 보낸 도착 알림 1건 — 다시 보내 주세요", go:function(){ TBL[cur].f="실패"; draw(); }},
    kpis:[{label:"이번 달 출고",value:"41",unit:"대"},{label:"오늘 출고차량",value:"12",unit:"대"},{label:"알림 보냄",value:"40",unit:"건"},{label:"못 보냄",value:"1",unit:"건"}],
    help:"목적지는 «배달 › 목적지»에서 명함 사진으로도 넣을 수 있어요.",
    table:{cols:["차량번호","목적지","출고 때","알림"], kinds:["name","text","time","state"], rows:rows, tabs:[["","전체"],["보냄 · 알림톡","보냄"],["실패","못 보냄"]], find:"차량번호 · 목적지",
      bulk:[{key:"re",label:"선택한 차 알림 다시 보내기",needSel:true}],
      onBulk:function(k,ids){ var s=ids.map(function(i){ return rows[i]; }); sure({title:"출고 알림을 다시 보낼까요?",desc:"딜러에게 알림톡이 다시 가요.",who:whoOf(s,1),n:s.length+"건",amt:s.length*13,ok:s.length+"건 다시 보내기",done:"다시 보냈어요"}); }}});
}
function drawMat(){
  var rows=[["광택약(컴파운드)","2통","5통","부족"],["휠크리너","1통","3통","부족"],["극세사 타월","40장","20장","넉넉"],["유리막 코팅제","6병","4병","넉넉"]];
  screen({crumb:"자재", title:"자재 · 재고", desc:"남은 양이 기준보다 적으면 빨강으로 보여요. 도매상에 주문 문자를 바로 보내요.", month:false,
    band:{text:"부족한 자재 2가지 — 주문하세요", go:function(){ TBL[cur].f="부족"; draw(); }},
    pri:{label:"자재 추가",on:function(){ CGG.toast("자재 추가 창 (시안)"); }},
    kpis:[{label:"자재 가지 수",value:"4",unit:"가지"},{label:"부족",value:"2",unit:"가지"},{label:"이번 달 산 돈",value:"88,000",unit:"원"},{label:"도매상",value:"3",unit:"곳"}],
    help:"도매상 목록은 이 화면 아래쪽에 있어요.",
    table:{cols:["자재","남은 양","기준","상태"], kinds:["name","id","id","state"], rows:rows, tabs:[["","전체"],["부족","부족"],["넉넉","넉넉"]], find:"자재",
      bulk:[{key:"ord",label:"선택한 자재 주문 문자",needSel:true}],
      onBulk:function(k,ids){ var s2=ids.map(function(i){ return rows[i]; }); if(!s2.length) return;
        sure({title:"주문 문자를 보낼까요?",desc:"도매상에게 문자 1통으로 가요: "+s2.map(function(r){ return r[0]; }).join(", "),who:"한빛상사 (도매상 1곳)",n:"자재 "+s2.length+"가지 · 문자 1통",amtLabel:"얼마 (문자 요금)",amt:30,ok:"주문 문자 보내기",done:"주문 문자를 보냈어요"}); }}});
}
function drawOther(g,sub){
  screen({crumb:g.label+(sub?" › "+sub.label:""), title:sub?sub.label:g.label, desc:"이 화면도 같은 뼈대(제목 → 할 일 띠 → 도구줄 → 숫자 칸 4 → 표 → 도움)로 바뀌어요. 내용은 v131 그대로예요.", month:false,
    band:{text:"할 일이 없어요", ok:true},
    kpis:[{label:"항목",value:"—",unit:""},{label:"항목",value:"—",unit:""},{label:"항목",value:"—",unit:""},{label:"항목",value:"—",unit:""}],
    help:"시안에서는 주요 화면(홈 · 일감 · 기록 · 월별 청구서 · 입·출금 내역 · 세금계산서 · 배달 · 자재)만 자료를 넣어 보여 드려요.",
    table:{cols:["이름","내용","날짜"], kinds:["name","text","date"], rows:[["예시 1","v131 화면 내용이 여기에 들어가요","10-17"],["예시 2","표 · 정렬 · 찾기 · 보기 개수는 같아요","10-16"]], find:"찾기"}});
}
function myPage(focus){
  CGG.dialog({size:"detail",title:"마이페이지",desc:"김대표 · 대표 · 예시 광택",
    body:'<div class="wz-mp">'
      +'<section'+(focus==="plan"?' id="wzPlan"':'')+'><h4>요금제</h4><dl><dt>지금 요금제</dt><dd>스탠다드</dd><dt>다음 결제일</dt><dd>2026-11-15</dd><dt>남은 기간</dt><dd>28일</dd><dt>결제 방법</dt><dd>계좌 입금</dd></dl></section>'
      +'<section><h4>이번 달 사용량</h4><dl><dt>알림톡</dt><dd>198 / 1,000건</dd><span class="bar"><i style="width:20%"></i></span><dt>문자(대신 보냄)</dt><dd>13건</dd><dt>사진 읽기(번호판 · 명함)</dt><dd>412 / 2,000회</dd><span class="bar"><i style="width:21%"></i></span><dt>직원 계정</dt><dd>3 / 5명</dd></dl></section>'
      +'<section><h4>내 계정</h4><dl><dt>로그인 번호</dt><dd>010-****-0000</dd><dt>비밀번호</dt><dd>바꾸기 ›</dd></dl></section></div>',
    ok:"요금제 바꾸기", cancel:"닫기", onOk:function(){ CGG.toast("요금제 · 결제 창 (시안)"); }});
}

/* ── 그리기 ── */
function tabKey(){ var g=cur.split("/")[0]; return TABS.some(function(t){ return t.key===g; })?g:"__all"; }
function draw(){
  var G=groups(), nav=document.getElementById("nav");
  CGG.nav(nav, G, cur, go);
  var old=document.getElementById("wzNavFind"); if(old) old.remove();
  if(PICK.find==="nav"){ var box=document.createElement("div"); box.id="wzNavFind"; box.className="wz-navfind"; nav.appendChild(box); CGG.find(box, feats(), goFeat, {phone:function(){ CGG.allMenu(G, cur, go, feats(), goFeat, {focus:true}); }}); }
  CGG.tabbar(document.getElementById("tbar"), TABS, tabKey(), function(k){ if(k==="__all"){ if(!CGG.closeSheet()) CGG.allMenu(groups(), cur, go, feats(), goFeat); return; } CGG.closeSheet(); go(k); });
  var g=grp(cur)||G[0], sub=(g.subs||[]).filter(function(s){ return g.key+"/"+s.key===cur; })[0];
  ({home:drawHome, ledger:drawLedger, record:drawRecord, bill:drawBill, money:drawMoney, tax:drawTax, delivery:function(){ if(cur==="delivery/outlog") drawDelivery(); else drawOther(g,sub); }, mat:drawMat}[g.key]||function(){ drawOther(g,sub); })();
}
/* ── 시안 고르기 띠 ── */
function bar(){
  var el=document.getElementById("sz");
  el.innerHTML='<div class="in"><span class="tt">워시 통합 시안 · 고르기만 하면 바로 바뀌어요</span>'
    +Q.map(function(q){ return '<div class="q"><span>'+esc(q.title)+'</span><div class="seg" role="group" aria-label="'+esc(q.title)+'">'
      +q.opts.map(function(o){ return '<button type="button" data-q="'+q.key+'" data-v="'+esc(o[0])+'" aria-pressed="'+(PICK[q.key]===o[0])+'">'+esc(o[1])+(o[2]?'<i>추천</i>':'')+'</button>'; }).join("")+'</div></div>'; }).join("")
    +'<details><summary>이 시안에서 바뀐 것 '+CHANGED.length+'가지 (새 규칙 그대로)</summary><ol>'+CHANGED.map(function(c){ return '<li><b>'+esc(c[0])+'</b> — '+esc(c[1])+'</li>'; }).join("")+'</ol></details></div>';
  Array.prototype.forEach.call(el.querySelectorAll("[data-q]"),function(b){ b.onclick=function(){
    PICK[b.getAttribute("data-q")]=b.getAttribute("data-v"); savePick(); bar(); header(); cur=norm(cur); draw(); }; });
}
CGG.layout.init(document.getElementById("app"), "wz_layout_preview");
bar(); header(); draw();
})();
