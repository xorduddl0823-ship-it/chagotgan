"use strict";
try{ if(window.top!==window.self){ document.getElementById("cggBeta").hidden=true; } }catch(e){ document.getElementById("cggBeta").hidden=true; }
/* =========================================================
   차곳간 딜러앱 — 화면 (dealer.cgg.co.kr)   판: d4.0 (2026-10-19)
   바탕: d3.9 (보안 통과 c6cd803) — 서버 주고받는 모양 · 로그인 · 청구서 셈 · 상태 말과 색은 그대로.
   모양: 공통 부품 cgg-j4 1.13.2 + 확정 미리보기 11판 «딜러앱» (디자인/요청서/딜러앱_d4.0_작업요청서.md)
   주소 끝에 ?demo 를 붙이면 서버 없이 시연 화면으로 열립니다. (인증번호 123456)
   ========================================================= */
var API="https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/dealer-api?forceFunctionRegion=ap-northeast-2";
var VER="d4.0";
var DEMO=/[?&]demo\b/.test(location.search)||location.hash==="#demo"||window.__DEMO===true;

/* ---------- 약관 (초안 — 확정 전 검토 필요 · d3.9 그대로) ---------- */
var TERMS="차곳간 딜러 이용약관 (d1-2026-10)\n\n"+
"제1조 (목적) 이 약관은 티와이컴퍼니(이하 «회사»)가 운영하는 «차곳간 딜러»(이하 «서비스»)를 이용하는 조건과 절차를 정합니다.\n\n"+
"제2조 (서비스 내용) 서비스는 딜러가 차곳간을 쓰는 업체(광택·세차, 휠복원, 판금·도색 등)에 맡긴 차량의 입고·출고·위치·사진 등 진행 정보를 보여 줍니다. 진행 정보는 각 업체가 입력한 내용이며, 회사는 그 정확성을 보증하지 않습니다.\n\n"+
"제3조 (이용요금) 기본 서비스는 무료입니다. 유료 서비스(예: 차량 이력 조회)가 생기면 이용 전에 요금을 알립니다.\n\n"+
"제4조 (계정) 휴대폰 번호와 인증번호로 로그인합니다. 본인 번호가 아닌 번호로 로그인해서는 안 됩니다.\n\n"+
"제5조 (이용 제한) 남의 번호로 들어오거나 서비스를 방해하는 경우 이용을 멈출 수 있습니다.\n\n"+
"제6조 (해지) 딜러는 «내 정보 → 동의 철회»로 언제든 이용을 그만둘 수 있습니다.\n\n"+
"제7조 (문의) 차곳간 010-9559-3663";
var PRIVACY="개인정보 수집·이용 동의 (d1-2026-10)\n\n"+
"1. 수집 항목: 휴대폰 번호, 이름(직접 넣은 경우), 접속 기록(접속 시각, 기기 정보, IP)\n\n"+
"2. 이용 목적: 본인 확인(인증번호), 내 번호로 맡겨진 차량 진행 정보 제공, 문의 응대\n\n"+
"3. 보관 기간: 동의를 철회할 때까지. 단, 동의·철회 기록은 법령에 따라 필요한 기간 동안 보관합니다.\n\n"+
"4. 함께 보이는 정보: 차를 맡긴 업체가 입고할 때 «딜러 연락처»로 적은 번호가 내 번호와 같으면, 그 차의 차량번호·차종·상사·작업·금액·사진·입출고 시각이 보입니다.\n\n"+
"5. 동의를 거부할 권리: 동의하지 않을 수 있으며, 이 경우 차량 진행 정보를 볼 수 없습니다.";
var MKT="광고·소식 받기 (선택)\n\n차곳간의 새 기능, 행사 소식을 문자나 앱 알림으로 받습니다. 언제든 끌 수 있습니다.";

/* ---------- 상태 ---------- */
var STAGES=["입고","작업 중","출고","도착"];
var STMAP={"입고":"run","작업 중":"run","출고":"run","도착":"chk","상품화 완료":"done"};   /* d3.9 색 짝 그대로 */
var S={key:"",phone:"",name:"",agreed:false,agreedAt:"",
  view:"login",step:1,tab:"home",sel:{},sending:false,err:"",
  cars:null,done:{},detail:null,docOpen:"",seen:""};

function ls(k,v){try{if(v===undefined)return localStorage.getItem(k)||"";if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return "";}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function dg(v){return String(v||"").replace(/[^0-9]/g,"");}
function telFmt(v){var d=dg(v);return d.length===11?d.slice(0,3)+"-"+d.slice(3,7)+"-"+d.slice(7):d.length===10?d.slice(0,3)+"-"+d.slice(3,6)+"-"+d.slice(6):d;}
function telMask(v){var t=telFmt(v).split("-");return t.length===3?t[0]+"-****-"+t[2]:"";}   /* d4.0 머리말 · 확인 창은 가운데를 가려요 */
function won(n){return Math.round(Number(n)||0).toLocaleString("ko-KR")+"원";}
function when(iso){if(!iso)return "";var d=new Date(iso);if(isNaN(d))return "";
  var now=new Date(),t=new Date(now.getFullYear(),now.getMonth(),now.getDate()),dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  var diff=Math.round((t-dd)/864e5),hm=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
  if(diff===0)return "오늘 "+hm;if(diff===1)return "어제 "+hm;return (d.getMonth()+1)+"/"+d.getDate()+" "+hm;}
function day(iso){if(!iso)return "";var d=new Date(iso);if(isNaN(d))return "";
  var w=when(iso);return /^(오늘|어제)/.test(w)?w:(d.getMonth()+1)+"/"+d.getDate()+" "+w.split(" ")[1];}
function $(id){return document.getElementById(id);}

/* ---------- 서버 (d3.9 그대로) ---------- */
function inLogin(){return S.view==="login"||S.view==="agree";}
function errStd(){return inLogin()?"처리하지 못했습니다. 잠시 후 다시 시도해 주세요.":"처리하지 못했어요. 다시 시도해 주세요.";}
function safeMsg(m){m=String(m==null?"":m).trim();
  if(m&&m.length<=80&&/[가-힣]/.test(m)&&!/[A-Za-z_]{3,}|[{}<>\n]/.test(m))return m;
  try{console.warn("dealer-api 오류",m.slice(0,200));}catch(_){}return errStd();}
function errMsg(e){return safeMsg(e&&e.message);}
function api(fn,args){
  if(DEMO)return demoApi(fn,args||[]);
  return fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({fn:fn,args:args||[],token:S.key})})
  .then(function(r){return r.text();},function(){throw new Error("연결이 잠시 끊겼어요. 다시 시도해 주세요.");})
  .then(function(t){var j;try{j=JSON.parse(t);}catch(e){try{console.warn("dealer-api 응답",String(t).slice(0,200));}catch(_){}throw new Error(inLogin()?"정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.":"정보를 불러오지 못했어요. 다시 시도해 주세요.");}
    if(j&&j.__login){forget();S.err="로그인 시간이 지났습니다. 다시 로그인해 주세요.";render();throw new Error("로그인 시간이 지났습니다. 다시 로그인해 주세요.");}
    if(j&&j.__agree){S.agreed=false;S.view="agree";render();throw new Error("약관 동의가 필요합니다.");}
    if(j&&j.__err)throw new Error(safeMsg(j.__err));
    if(!j||!("result" in j)){var m=(j&&(j.msg||j.message||j.error))||"";
      try{console.warn("dealer-api 응답",m||String(t).slice(0,200));}catch(_){}
      throw new Error(inLogin()?"정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.":"정보를 불러오지 못했어요. 다시 시도해 주세요.");}
    return j.result;});
}
function forget(){try{CGG.closeDialog();CGG.closeSheet();CGG.closeMenu();}catch(e){}
  S.carT=null;S.notiT=null;S.homeT=null;S.key="";S.agreed=false;S.cars=null;S.bills=null;S.billsReady=false;S.billsAt=0;S.billsSig="";S.name="";S.phone="";S.detail=null;S.seen=null;S.sel={};S.dlgTok=(S.dlgTok||0)+1;
  ls("cgd_key",null);ls("cgd_phone",null);ls("cgd_seen",null);ls("cgd_pref",null);S.view="login";S.step=1;render();}

/* ---------- 시연 자료 (지어낸 예시 · d3.9 그대로, «성능점검»으로 말만 맞춤) ---------- */
function ago(d,h,m){return new Date(Date.now()-d*864e5-h*36e5-(m||0)*6e4).toISOString();}
var DEMO_CARS=[
 {key:"GA:1",shop:"GA",shopName:"가온진단평가",id:"1",plate:"123가4567",model:"현대 그랜저 IG 2019",company:"수원오토갤러리",inAt:ago(3,6),outAt:ago(3,5),stage:"출고",where:"리페어",dest:"리페어",works:["성능점검"],total:30000,at:ago(3,5)},
 {key:"RP:2",shop:"RP",shopName:"리페어",id:"2",plate:"123가4567",model:"현대 그랜저 IG 2019",company:"수원오토갤러리",inAt:ago(3,3),outAt:ago(1,2),stage:"출고",where:"브라더광택",dest:"브라더광택",works:["앞범퍼 판금도색"],total:250000,at:ago(1,2)},
 {key:"BT:3",shop:"BT",shopName:"브라더광택",id:"3",plate:"123가4567",model:"현대 그랜저 IG 2019",company:"수원오토갤러리",inAt:ago(0,1,20),outAt:"",stage:"작업 중",where:"브라더광택",dest:"",spot:"B-3",works:["광택","실내크리닝"],total:0,at:ago(0,1,20)},
 {key:"GA:4",shop:"GA",shopName:"가온진단평가",id:"4",plate:"45나6789",model:"기아 쏘렌토 MQ4 2021",company:"수원오토갤러리",inAt:ago(5,4),outAt:ago(5,3),stage:"출고",where:"대경광택",dest:"대경광택",works:["성능점검"],total:30000,at:ago(5,3)},
 {key:"DK:5",shop:"DK",shopName:"대경광택",id:"5",plate:"45나6789",model:"기아 쏘렌토 MQ4 2021",company:"수원오토갤러리",inAt:ago(4,5),outAt:ago(1,0,40),stage:"도착",where:"수원오토갤러리 주차장",dest:"수원오토갤러리 주차장",works:["외부세차","유리막코팅"],total:180000,at:ago(1,0,40)},
 {key:"GA:6",shop:"GA",shopName:"가온진단평가",id:"6",plate:"201머3344",model:"BMW 520i 2020",company:"수원오토갤러리",inAt:ago(2,5),outAt:ago(2,4),stage:"출고",where:"리페어",dest:"리페어",works:["성능점검 (수입차)"],total:40000,at:ago(2,4)},
 {key:"RP:7",shop:"RP",shopName:"리페어",id:"7",plate:"201머3344",model:"BMW 520i 2020",company:"수원오토갤러리",inAt:ago(2,3),outAt:ago(0,0,25),stage:"출고",where:"리페어 → 브라더광택 이동 중",dest:"브라더광택",works:["휠 복원"],total:120000,at:ago(0,0,25)},
 {key:"GA:8",shop:"GA",shopName:"가온진단평가",id:"8",plate:"78두9012",model:"제네시스 G80 2018",company:"수원오토갤러리",inAt:ago(0,2,45),outAt:"",stage:"입고",where:"가온진단평가",dest:"",works:[],total:0,at:ago(0,2,45)}
];
function dday(n){var d=new Date(Date.now()+n*864e5);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
var DEMO_BILLS=[
 {shop:"한결광택 (예시)",month:"9월",name:"수원오토갤러리",cars:6,amount:780000,due:780000,dueDate:dday(-3),bank:"예시은행 000-1111-2222-01 한결광택",state:"입금 전",url:""},
 {shop:"바른리페어 (예시)",month:"9월",name:"수원오토갤러리",cars:3,amount:1250000,due:1250000,dueDate:dday(5),bank:"예시은행 000-3333-4444-02 바른리페어",state:"입금 전",url:""},
 {shop:"맑은세차 (예시)",month:"8월",name:"수원오토갤러리",cars:1,amount:40000,due:40000,dueDate:"",bank:"예시은행 000-7777-8888-04 맑은세차",state:"입금 전",url:""},
 {shop:"새빛휠 (예시)",month:"9월",name:"수원오토갤러리",cars:2,amount:180000,due:0,dueDate:dday(-1),bank:"예시은행 000-5555-6666-03 새빛휠",state:"입금 확인됨",url:""}];
function demoApi(fn,a){
  return new Promise(function(ok,no){setTimeout(function(){
    try{
      if(fn==="sendCode")return ok({ok:true,minutes:5});
      if(fn==="verifyCode"){if(dg(a[1])!=="123456")throw new Error("시연에서는 인증번호 123456을 입력해 주세요.");
        return ok({ok:true,key:"demo-key-0000000000000000",phone:dg(a[0]),agreed:false,name:"김민수"});}
      if(fn==="me")return ok({phone:S.phone||"01012345678",name:S.name||"김민수",agreed:S.agreed,agreedAt:S.agreedAt});
      if(fn==="agree")return ok({ok:true});
      if(fn==="setName")return ok({ok:true,name:a[0]});
      if(fn==="cars")return ok({list:DEMO_CARS.slice(),done:S.done});
      if(fn==="myBills")return ok({list:DEMO_BILLS.slice(),ready:true});
      if(fn==="car"){var c=DEMO_CARS.filter(function(x){return x.shop===a[0]&&x.id===a[1];})[0];
        return ok({car:c,shots:[],trail:DEMO_CARS.filter(function(x){return x.plate===c.plate;}).sort(function(x,y){return x.inAt>y.inAt?1:-1;})});}
      if(fn==="finish"||fn==="unfinish"||fn==="logout"||fn==="leave")return ok({ok:true});
      no(new Error("시연에서는 쓸 수 없는 기능이에요."));
    }catch(e){no(e);}
  },300);});
}

/* ---------- 자료 정리 (d3.9 그대로) ---------- */
/* 같은 차량번호는 가장 최근 기록이 «지금»입니다 */
function latest(){var m={};(S.cars||[]).forEach(function(x){if(!m[x.plate]||String(x.inAt)>String(m[x.plate].inAt))m[x.plate]=x;});
  return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return a.at<b.at?1:a.at>b.at?-1:0;});}
function isDone(x){return !!S.done[x.key];}
function jong(w){var c=String(w||"").trim().slice(-1),k=c.charCodeAt(0);if(k>=0xAC00&&k<=0xD7A3)return (k-0xAC00)%28;return /[0-9]/.test(c)?("013678".indexOf(c)>=0?1:0):/[lmnr]/i.test(c)?8:0;}
function ro(w){var j=jong(w);return w+(j&&j!==8?"으로":"로");}
/* 알림 = 내 차의 입고 · 출고 · 도착 기록. d4.0: 본문은 현장 말 «차량번호 · 업체 → 도착한 곳 도착» (F01 · F02) */
function events(){
  var E=[];(S.cars||[]).forEach(function(x){
    var who=x.plate||"차";
    E.push({k:"in",st:"입고",d:who+" · "+x.shopName+" 입고",at:x.inAt});
    if(x.outAt){
      if(x.stage==="출고"&&x.dest)E.push({k:"out",st:"출고",d:who+" · "+x.shopName+" → "+x.dest+" 출고",at:x.outAt});
      else E.push({k:"arr",st:"도착",d:who+" · "+x.shopName+" → "+(x.dest||"도착한 곳")+" 도착",at:x.outAt});
    }
  });
  E.sort(function(a,b){return a.at<b.at?1:a.at>b.at?-1:0;});
  return E.slice(0,100);
}
function unread(){var s=S.seen||"";return events().filter(function(e){return e.at>s;}).length;}
function markSeen(){var E=events();if(E.length){S.seen=E[0].at;if(!DEMO)ls("cgd_seen",S.seen);}}

function sod(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function isToday(iso){if(!iso)return false;var d=new Date(iso);return !isNaN(d)&&sod(d).getTime()===sod(new Date()).getTime();}
function daysAgo(iso){var d=new Date(iso);return isNaN(d)?0:Math.floor((Date.now()-d.getTime())/864e5);}
function sumOf(plate){return (S.cars||[]).filter(function(x){return x.plate===plate;}).reduce(function(a,x){return a+(Number(x.total)||0);},0);}
function worksOf(c){return (c.works&&c.works.length)?c.works.join(", "):(c.outAt?"":"작업 대기");}
function hm(iso){var d=new Date(iso);if(isNaN(d))return "";return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
function lastAt(iso){return isToday(iso)?hm(iso):day(iso).split(" ")[0];}
function stageOf(c){return isDone(c)?"상품화 완료":c.stage;}
function nm2(c){return c.plate||c.model||"차";}
function names(L){return L.slice(0,2).map(function(c){return nm2(c);}).join(" · ")+(L.length>2?" 외 "+(L.length-2)+"대":"");}
function G(){
  var all=latest(),act=all.filter(function(c){return !isDone(c);});
  return {all:all,
    work:act.filter(function(c){return c.stage==="작업 중";}),
    today:act.filter(function(c){return c.outAt&&isToday(c.outAt);}),
    arr:act.filter(function(c){return c.stage==="도착";}),
    moving:act.filter(function(c){return c.stage==="출고";}),
    slow:act.filter(function(c){return c.stage==="작업 중"&&daysAgo(c.inAt)>=3;})};
}
/* 표 한 줄 — 미리보기 11판 열 차례: 차량번호 · 단계 · 차종 · 작업 · 지금 위치 · 마지막 기록 · 들어간 금액
   마지막 기록은 ISO 그대로(정렬이 맞게), 보일 때만 «09:20 · 10/17». 들어간 금액 0 = 업체가 아직 금액을 넣지 않음 → «—» */
function carRow(c){var sm=sumOf(c.plate);return [c.plate,stageOf(c),c.model||"차종 없음",worksOf(c),c.where||"",c.at||"",sm?sm:null];}
function carRender(x,k){if(k===5)return lastAt(x[5]);}

/* ---------- 청구서 셈 (d3.9 그대로) ---------- */
function isPaid(b){return b.state==="입금 확인됨";}
function hasDue(b){return /^\d{4}-\d{2}-\d{2}/.test(String(b.dueDate||""));}
function dueLeft(b){if(!hasDue(b))return 9999;var x=new Date(String(b.dueDate).slice(0,10)+"T00:00:00");return Math.round((x-sod(new Date()))/864e5);}
function md(d){return String(d).slice(5,10).replace("-","/");}
function monthKey(b){var m=String(b.month||""),y=m.match(/(\d{4})\D+(\d{1,2})/);if(y)return +y[1]*100+ +y[2];var k=m.match(/(\d{1,2})/);return k?+k[1]:99;}
function paidDay(v){var d=new Date(String(v||""));return isNaN(d)?"":(d.getMonth()+1)+"/"+d.getDate();}
function dueTxt(b){if(isPaid(b))return "입금 확인"+(paidDay(b.paidAt)?" · "+paidDay(b.paidAt):"");if(!hasDue(b))return "";var n=dueLeft(b);
  return n<0?"기한 "+md(b.dueDate)+" · "+(-n)+"일 지남":n===0?"기한 오늘("+md(b.dueDate)+")":"기한 "+md(b.dueDate)+" · "+n+"일 남음";}
function billList(){var L=(S.bills||[]).slice();
  /* 입금 전 먼저 → 기한 있는 것은 기한 순 → 기한 없는 것은 월 순 (결제/10 D4) */
  L.sort(function(a,b){if(isPaid(a)!==isPaid(b))return isPaid(a)?1:-1;
    if(hasDue(a)&&hasDue(b))return dueLeft(a)-dueLeft(b);if(hasDue(a)!==hasDue(b))return hasDue(a)?-1:1;return monthKey(a)-monthKey(b);});return L;}
function billSum(){return (S.bills||[]).filter(function(b){return !isPaid(b);}).reduce(function(a,b){return a+(Number(b.due)||0);},0);}

/* ---------- 앱 틀 (공통 부품 1.13.2 · 미리보기 11판 «DEALER» 메뉴 지도) ---------- */
var DEALER={
  groups:[{key:"home",label:"홈",icon:"home"},{key:"cars",label:"내 차",icon:"car"},{key:"noti",label:"알림",icon:"bell"},{key:"bill",label:"청구서",icon:"file"},{key:"hist",label:"카히스토리",icon:"search"},{key:"me",label:"내 정보",icon:"user"}],
  tabs:[{key:"home",icon:"home",label:"홈"},{key:"cars",icon:"car",label:"내 차"},{key:"noti",icon:"bell",label:"알림"},{key:"bill",icon:"file",label:"청구서"},{key:"__all",icon:"more",label:"전체"}],
  feats:[{id:"d-cars",label:"내 차 보기",path:"내 차",go:"cars",words:"차 위치 작업 상품화"},{id:"d-bill",label:"청구서 보기",path:"청구서",go:"bill",words:"청구서 계좌 금액"},{id:"d-me",label:"알림 받기 설정",path:"내 정보",go:"me",words:"알림 끄기 켜기"}]};
var CRUMB={home:"홈",cars:"내 차",noti:"알림",bill:"청구서",hist:"카히스토리",me:"내 정보"};
function company(){return (latest()[0]||{}).company||"";}
function whoLine(){return (S.name?S.name+" 딜러":"딜러")+(company()?" ("+company()+")":"");}
function head(title,desc){return CGG.head({crumb:CRUMB[S.tab]||"홈",title:title,desc:desc});}
function btn(t,pri,id,dis){return '<button type="button" class="cgg-btn'+(pri?' pri':'')+'"'+(id?' id="'+id+'"':'')+(dis?' disabled':'')+'>'+esc(t)+'</button>';}
function bx(t,d,body){return '<section class="bx"><h3>'+esc(t)+'</h3>'+(d?'<p class="d">'+esc(d)+'</p>':'')+body+'</section>';}
function go(k){if(!CRUMB[k])k="home";S.tab=k;S.view="main";try{CGG.closeSheet();CGG.closeDialog();}catch(e){}
  render();if(k==="noti")setTimeout(function(){markSeen();drawNav();},1500);
  if(k==="bill"||k==="home")freshBills(5000);
  try{window.scrollTo(0,0);}catch(e){}}
function goFeat(f){go(f.go);}
function tabKey(){return DEALER.tabs.some(function(t){return t.key===S.tab;})?S.tab:"__all";}
function drawNav(){
  var u=S.cars?unread():0;
  var groups=DEALER.groups.map(function(g){return g.key==="noti"?{key:g.key,label:g.label,icon:g.icon,badge:u}:g;});
  CGG.nav($("nav"),groups,S.tab,function(k){go(k);},{find:{feats:DEALER.feats,onGo:goFeat}});
  CGG.tabbar($("tbar"),DEALER.tabs.map(function(t){return t.key==="noti"?{key:t.key,icon:t.icon,label:t.label,badge:u}:t;}),tabKey(),function(k){
    if(k==="__all"){if(!CGG.closeSheet())CGG.allMenu(groups,S.tab,function(x){go(x);},DEALER.feats,goFeat);return;}
    CGG.closeSheet();go(k);});
}
function drawHeader(){
  var d=new Date();
  CGG.header($("top"),{product:"딜러",sub:"내 상사 상품화",ver:VER,date:(d.getMonth()+1)+"/"+d.getDate(),
    biz:{name:S.name?S.name+" 딜러":"딜러",line:[company(),telMask(S.phone)].filter(Boolean).join(" · ")},
    find:{mode:"nav",feats:DEALER.feats,onGo:goFeat},
    notice:function(){CGG.dialog({size:"confirm",title:"공지사항",desc:"새 공지사항이 없어요."});},
    help:function(){CGG.dialog({size:"form",title:"도움말",body:'<div class="ddoc">'+esc(HELP)+'</div>'});},
    link:function(){copy(location.origin+location.pathname,"주소를");},
    refresh:function(){if(S.key&&S.agreed){loadCars();CGG.toast("새로 불러왔어요");}},
    saved:true,
    me:{name:S.name||"딜러",role:"딜러",sub:"마이페이지 · 로그아웃",items:[{key:"me",icon:"user",label:"마이페이지",note:"내 계정"},"-",{key:"lay",icon:"pc",label:"화면 설정"},"-",{key:"out",icon:"out",label:"로그아웃"}],
      onPick:function(k){
        if(k==="me")CGG.myPage({who:whoLine(),account:[["로그인 번호",telFmt(S.phone)],["이름",S.name||"아직 넣지 않았어요"],["약관 동의",S.agreedAt?new Date(S.agreedAt).toLocaleDateString("ko-KR")+" 동의":"동의함"]]});
        else if(k==="lay")layDialog();
        else if(k==="out")askLogout();}}});
}
var HELP="차곳간 딜러는 업체에 맡긴 내 차가 지금 어디 있는지, 어디까지 됐는지 보는 앱이에요.\n\n"+
"· 홈: 오늘 먼저 볼 것 세 줄과 숫자 칸 네 개가 있어요.\n· 내 차: 차량번호를 누르면 사진과 상품화 진행 기록이 열려요. 내 상사에 도착한 차는 골라서 «선택한 차 상품화 완료»를 눌러요.\n"+
"· 알림: 입고 · 출고 · 도착 소식이 모여요.\n· 청구서: 업체가 내 번호로 보낸 청구서예요. «계좌 복사» 뒤 은행 앱에 붙여 넣어 보내요.\n\n"+
"휴대폰 홈 화면에 추가하면 앱처럼 바로 열 수 있어요.\n아이폰: 사파리 아래 공유 버튼 → 홈 화면에 추가\n갤럭시: 크롬 오른쪽 위 점 세 개 → 홈 화면에 추가\n\n문의 010-9559-3663";
function layDialog(){CGG.dialog({size:"form",title:"화면 설정",desc:"메뉴 배치는 넓은 화면에서만 바뀌어요. 이 기기에만 저장돼요.",body:'<div id="layBox"></div>'});
  var b=$("layBox");if(b)CGG.layout.chooser(b,function(v){CGG.toast("메뉴 배치를 «"+CGG.layout.name(v)+"»로 바꿨어요 · 이 기기에만 저장돼요");});}

/* ---------- 화면 ---------- */
var V={};
function loadingCard(t){return bx(t,"","");}
/* ② 홈 — 첫 줄 → 오늘 할 일 3줄 → 숫자 칸 4개 → 최근 내 차 (일정 · 입금 · 일감 카드 없음) */
V.home=function(m){
  if(S.cars===null){m.innerHTML=head("내 차를 불러오는 중이에요…","");return;}
  var g=G();
  var h1=!g.all.length?'아직 내 번호로 맡겨진 차가 없어요'
    :g.arr.length?'도착한 차 <em>'+g.arr.length+'대</em>가 상품화 완료를 기다려요'
    :g.work.length?'작업 중인 차 <em>'+g.work.length+'대</em>가 있어요':'오늘 확인할 차가 없어요';
  var A=[
    g.arr.length?{tone:"chk",icon:"car",title:"도착한 차 "+g.arr.length+"대 «상품화 완료» 누르기",sub:names(g.arr)+" · 확인하고 눌러 주세요",go:"도착"}
                :{tone:"run",icon:"car",title:"«상품화 완료»를 기다리는 차가 없어요",sub:"도착한 차가 생기면 여기에 알려 드려요",go:"도착",none:1},
    g.moving.length?{tone:"run",icon:"truck",title:"출고된 차 "+g.moving.length+"대 받을 준비",sub:g.moving.map(function(c){return nm2(c)+" → "+(c.dest||c.where);}).slice(0,2).join(" · "),go:"출고"}
                   :{tone:"run",icon:"truck",title:"이동 중인 차가 없어요",sub:"업체에서 출고되면 여기에 알려 드려요",go:"출고",none:1},
    g.slow.length?{tone:"stop",icon:"today",title:"작업이 3일 넘게 걸리는 차 "+g.slow.length+"대",sub:g.slow.slice(0,2).map(function(c){return nm2(c)+"("+c.where+")";}).join(" · ")+" · 업체에 물어보세요",go:"작업 중"}
                 :{tone:"run",icon:"today",title:"3일 넘게 걸리는 차가 없어요",sub:"작업이 늦어지면 여기에 알려 드려요",go:"작업 중",none:1}];
  var bs=S.bills?billSum():null;
  CGG.home(m,{title:h1,desc:"안녕하세요, "+(S.name?S.name+" 님":"딜러님"),
    todo:{items:A,total:A.filter(function(a){return !a.none;}).length,onPick:function(i){goCars(A[i].go);},onAll:function(){goCars("");}},
    kpis:[{label:"작업 중인 차",value:String(g.work.length),unit:"대"},{label:"오늘 출고 · 도착",value:String(g.today.length),unit:"대"},
          {label:"낼 청구서 금액",value:bs==null?"…":Math.round(bs).toLocaleString("ko-KR"),unit:"원",tone:"due"},{label:"상품화 기다리는 차",value:String(g.arr.length),unit:"대",tone:"due"}],
    cal:false,money:false,rank:false,
    help:"맨 위 문장과 할 일 세 줄이 오늘 먼저 볼 것을 알려 드려요. 할 일 줄을 누르면 «내 차»에서 그 차들만 모아 보여 줘요. 최근 내 차는 차량번호를 누르면 차 상세(사진 · 진행 기록)가 열려요."});
  var x=document.createElement("div");
  x.innerHTML=g.all.length?bx("최근 내 차","",'<div id="dcar"></div><div class="row">'+btn("모두 보기",false,"dall")+'</div>')
    :bx("최근 내 차","업체에 차를 맡길 때 "+telFmt(S.phone)+" 번호를 알려 주세요. 그 번호로 들어온 차가 여기에 보여요.","");
  m.insertBefore(x.firstChild,m.querySelector(".cgg-help"));
  if(g.all.length){var L=g.all.slice(0,5);
    S.homeT={};
    CGG.table($("dcar"),{state:S.homeT,cols:["차량번호","단계","차종","작업","지금 위치","마지막 기록","들어간 금액"],kinds:["name","state","text","text","text","time","money"],
      rows:L.map(carRow),stateMap:STMAP,tabs:[["","전체"]],find:"차량번호",sort:[5,-1],render:carRender,
      mobileFields:[[2,"차종"],[4,"지금"],[1,"단계"]],select:false,size:5,onName:function(r,i){openCar(L[i]);}});
    $("dall").onclick=function(){goCars("");};}
};
function goCars(stage){S.carT={q:"",f:stage||"",k:null,dir:1,size:20,page:1,sel:{}};S.sel={};go("cars");}
/* ③ 내 차 */
V.cars=function(m){
  if(S.cars===null){m.innerHTML=head("내 차를 불러오는 중이에요…","");return;}
  var g=G(),L=g.all;
  m.innerHTML=head('작업 중인 차 <em>'+g.work.length+'대</em>, 도착한 차 <em>'+g.arr.length+'대</em>가 있어요','업체에 맡긴 내 차가 지금 어디 있는지, 어디까지 됐는지 확인해요.')
    +(L.length?'<div class="cgg-tools">'+btn("선택한 차 상품화 완료",true,"finSel",true)+'</div><div id="carTbl"></div>'
      +CGG.help("업체가 입고 · 출고를 기록하면 여기에 바로 보여요. 차량번호를 누르면 사진과 지나온 기록(최근이 위)이 나와요. 내 상사에 도착한 차는 골라서 «선택한 차 상품화 완료»를 눌러 주세요. 금액이 «—»이면 업체가 아직 금액을 넣지 않은 거예요.")
      :bx("아직 내 번호로 맡겨진 차가 없어요","업체에 차를 맡길 때 "+telFmt(S.phone)+" 번호를 알려 주세요.",""));
  if(!L.length)return;
  if(!S.carT)S.carT={};
  var fin=$("finSel"),byKey={};L.forEach(function(c){byKey[c.key]=c;});
  var setBtn=function(ids){S.sel={};ids.forEach(function(k){if(byKey[k])S.sel[k]=true;});
    var n=ids.filter(function(k){return byKey[k]&&!isDone(byKey[k]);}).length;fin.disabled=!n;fin.textContent="선택한 차 상품화 완료"+(n?" ("+n+")":"");};
  var t=CGG.table($("carTbl"),{state:S.carT,cols:["차량번호","단계","차종","작업","지금 위치","마지막 기록","들어간 금액"],kinds:["name","state","text","text","text","time","money"],
    rows:L.map(carRow),rowId:function(r,i){return L[i].key;},
    tabs:[["","전체"],["입고","입고"],["작업 중","작업 중"],["출고","출고"],["도착","도착"]],stateMap:STMAP,find:"차량번호 · 차종 · 업체 검색",
    sorts:[[5,-1,"최근 기록순"],[0,1,"차량번호순"],[6,-1,"금액 높은순"],[1,1,"단계순"]],sort:[5,-1],render:carRender,
    mobileFields:[[2,"차종"],[4,"지금"],[6,"들어간 금액"],[1,"단계"]],
    onName:function(r,i){openCar(L[i]);},onSelect:setBtn});
  setBtn(t.selected());
  fin.onclick=function(){finishAsk(t);};
};
function finishAsk(t){
  var L=latest().filter(function(c){return S.sel[c.key]&&!isDone(c);});if(!L.length)return;
  var fs=L.reduce(function(a,c){return a+sumOf(c.plate);},0);
  CGG.dialog({size:"confirm",title:"상품화 완료로 표시할까요?",rows:[["차",L[0].plate+(L.length>1?" 외 "+(L.length-1)+"대":"")],["대수",L.length+"대"],["들어간 금액 합계",fs?won(fs):"—"]],
    ok:"상품화 완료로 표시",cancel:"취소",onOk:function(){
      L.reduce(function(p,c){return p.then(function(){return api("finish",[c.shop,c.id]).then(function(){S.done[c.key]=1;});});},Promise.resolve())
        .then(function(){S.sel={};if(S.carT)S.carT.sel={};render();CGG.toast(L.length+"대를 «상품화 완료»로 표시했어요");},function(e){render();CGG.toast(errMsg(e));});}});
}
/* ④ 차 상세 — 사진 · 상품화 진행 기록(최근이 위) · 지금 위치 · 들어간 금액 · [카히스토리 조회] [상품화 완료 / 취소] */
function openCar(c){
  var tok=S.dlgTok=(S.dlgTok||0)+1;S.detail=null;
  CGG.dialog({size:"detail",title:c.plate+" · 차 상세",desc:"상품화 진행 과정",body:'<p class="d">불러오는 중이에요…</p>',cancel:"닫기"});
  api("car",[c.shop,c.id]).then(function(r){if(tok!==S.dlgTok||!dlgOpen())return;S.detail=r;carDialog();},
    function(e){if(tok!==S.dlgTok)return;CGG.closeDialog();CGG.toast(errMsg(e));});
}
function dlgOpen(){var d=document.querySelector(".cgg-dim");return !!d&&!d.hidden;}
function carDialog(){
  var D=S.detail;if(!D||!D.car)return;
  var c=D.car,trail=D.trail||[],sum=trail.reduce(function(a,x){return a+(Number(x.total)||0);},0),done=isDone(c),shots=D.shots||[];
  var photo=shots.length?'<button type="button" class="dph" id="dPh" aria-label="사진 '+shots.length+'장 크게 보기"><img src="'+esc(shots[0].url)+'" alt="'+esc(shots[0].tag)+' 사진"><small>'+esc(shots[0].tag)+' 사진 · '+shots.length+'장 · 눌러서 보기</small></button>'
    :'<div class="dph" role="img" aria-label="사진 없음">사진 없음</div>';
  CGG.dialog({size:"detail",title:c.plate+" · 차 상세",desc:"상품화 진행 과정",
    rows:[["단계",done?"상품화 완료":c.stage],["차종",c.model||"차종 없음"],["상사",c.company||"—"],["지금",(c.where||"")+(c.spot&&!c.outAt?" · 주차 "+c.spot:"")],["지금까지 들어간 금액",sum?won(sum):"업체가 아직 금액을 넣지 않았어요"]],
    body:photo+'<h4 style="margin:4px 0 8px;font-size:14px">상품화 진행 기록</h4>'+tlog(trail)+'<div class="row">'+btn("카히스토리 조회",false,"dHist")+'</div>',
    ok:done?"상품화 완료 취소":"상품화 완료",cancel:"닫기",onOk:function(){
      var a=done?"unfinish":"finish";
      api(a,[c.shop,c.id]).then(function(){if(a==="finish")S.done[c.key]=1;else delete S.done[c.key];render();
        CGG.toast(a==="finish"?"«상품화 완료»로 표시했어요.":"상품화 완료를 취소했어요");},function(e){CGG.toast(errMsg(e));});}});
  var h=$("dHist");if(h)h.onclick=function(){go("hist");};
  var p=$("dPh");if(p)p.onclick=function(){photoDialog(shots);};
}
function tlog(trail){
  var E=[];
  (trail||[]).forEach(function(x){
    var wk=x.works&&x.works.length?"작업: "+x.works.join(", "):(x.outAt?"":"작업 대기");
    E.push({at:x.inAt,t:x.shopName+" 입고",s:[wk,Number(x.total)?won(x.total):""].filter(Boolean).join(" · ")});
    if(x.outAt){
      if(x.stage==="출고"&&x.dest)E.push({at:x.outAt,t:x.shopName+" 출고 → "+ro(x.dest)+" 이동",s:""});
      else E.push({at:x.outAt,t:(x.dest||x.shopName)+" 도착",s:x.shopName+"에서 출고 · 도착"});
    }
  });
  E.sort(function(a,b){return a.at<b.at?1:a.at>b.at?-1:0;});
  if(!E.length)return '<p class="d">기록이 없어요.</p>';
  return '<ol class="dlog">'+E.map(function(e,i){return '<li'+(i===0?' class="now"':'')+'><b>'+esc(day(e.at))+'</b> '+esc(e.t)+(i===0?' (지금)':'')+(e.s?'<small>'+esc(e.s)+'</small>':'')+'</li>';}).join("")+'</ol>';
}
function photoDialog(sh){CGG.dialog({size:"form",title:"사진 "+sh.length+"장",body:'<div class="dphoto">'+sh.map(function(x){return '<figure><img src="'+esc(x.url)+'" alt="'+esc(x.tag)+' 사진"><figcaption>'+esc(x.tag)+'</figcaption></figure>';}).join("")+'</div>'});}
/* ⑤ 알림 — 첫 칸 «내용» · 칩은 딜러 단계대로 · 처음 정렬 «언제 최근 순» · 고르기 칸 없음 */
V.noti=function(m){
  var E=events();
  m.innerHTML=head("알림","카카오 알림톡으로 먼저 가고, 알림톡이 안 되면 문자로 가요.")+'<div id="nTbl"></div>'
    +CGG.help("입고 · 출고 · 도착 소식이 여기에 모여요. 청구서 · 재검사 알림은 곧 열려요. 휴대폰 앱 알림도 곧 열려요.");
  if(!S.notiT)S.notiT={};
  CGG.table($("nTbl"),{state:S.notiT,cols:["내용","단계","언제"],kinds:["text","state","time"],rows:E.map(function(e){return [e.d,e.st,e.at];}),
    stateMap:{"입고":"run","작업 중":"run","출고":"run","도착":"chk","상품화 완료":"done","청구서":"done","재검사":"chk"},
    tabs:[["","전체"],["출고","출고"],["도착","도착"],["상품화 완료","상품화 완료"],["청구서","청구서"],["재검사","재검사"]],
    find:"차량번호 · 내용",mobileFields:[[1,"단계"],[2,"언제"]],select:false,sort:[2,-1],render:function(x,k){if(k===2)return when(x[2]);}});
};
/* ⑥ 청구서 — «낼 금액 ○원» + «기한 지난 것 ○원(○곳) + 기한 전 ○원(○곳) · 다음 기한 ○/○» · 카드 한 장씩 */
V.bill=function(m){
  if(!S.bills){m.innerHTML=head("청구서를 불러오는 중이에요…","");return;}
  var L=billList(),open=L.filter(function(b){return !isPaid(b);}),late=open.filter(function(b){return dueLeft(b)<0;}),soon=open.filter(function(b){return dueLeft(b)>=0;});
  var sum=function(a){return a.reduce(function(t,b){return t+(Number(b.due)||0);},0);};
  var next=soon.filter(hasDue).sort(function(a,b){return dueLeft(a)-dueLeft(b);})[0];
  var desc=open.length?"기한 지난 것 "+won(sum(late))+"("+late.length+"곳) + 기한 전 "+won(sum(soon))+"("+soon.length+"곳)"+(next?" · 다음 기한 "+md(next.dueDate):""):"업체가 내 번호로 청구서를 보내면 여기에 모여요.";
  var h=head(open.length?'낼 금액 <em>'+esc(won(billSum()))+'</em>':'낼 청구서가 없어요',desc);
  if(!L.length){m.innerHTML=h+(S.billsReady===false&&!DEMO?bx("청구서 모아 보기를 준비하고 있어요","그동안은 업체가 보낸 알림톡의 청구서를 봐 주세요.",""):"");return;}
  m.innerHTML=h+'<div class="dbills">'+L.map(function(b,i){var n=dueLeft(b),pd=isPaid(b),st=pd?"입금 확인":n<0?"기한 지남":"입금 전";
    return '<section class="bx dbill"><div class="dbh"><b>'+esc(b.shop)+'</b>'+CGG.status(st,{"입금 전":"chk","기한 지남":"stop","입금 확인":"done"})+'</div>'
      +'<p class="d">'+esc([b.month,b.cars?b.cars+"대":"",b.name].filter(Boolean).join(" · "))+'</p>'
      +'<div class="dbm"><strong>'+esc((pd?Math.round(Number(b.amount)||0):Math.round(Number(b.due)||0)).toLocaleString("ko-KR"))+'<small>원</small></strong>'+(dueTxt(b)?'<span'+(!pd&&n<0?' class="late"':'')+'>'+esc(dueTxt(b))+'</span>':'')+'</div>'
      +(!pd&&b.bank?'<div class="dacct">'+esc(b.bank)+'</div>':'')
      +'<div class="row">'+(pd?'':(b.bank?btn("계좌 복사",false,"ac"+i):'')+btn("금액 복사",false,"am"+i))+btn("내역 보기",false,"bv"+i)+'</div></section>';}).join("")+'</div>'
    +(open.length?bx("한 번에 결제는 곧 열려요","지금은 업체마다 계좌로 보내 주세요. 차곳간은 금액을 받지 않고, 업체 계좌로 바로 보내요.",""):"")
    +CGG.help("업체가 내 번호로 보낸 청구서가 업체 · 달마다 한 장씩 모여요. 기한이 지난 것이 맨 위에 와요. 휴대폰이면 «계좌 복사»를 누른 뒤 은행 앱을 열어 붙여 넣어 주세요. 입금하면 업체가 확인한 뒤 «입금 확인»으로 바뀌어요. «내역 보기»를 누르면 업체가 보낸 청구서(차별 작업과 금액)가 열려요.");
  L.forEach(function(b,i){
    var ac=$("ac"+i),am=$("am"+i),bv=$("bv"+i);
    if(ac)ac.onclick=function(){copy(b.bank,"계좌를");};
    if(am)am.onclick=function(){copy(String(Math.round(Number(b.due)||0)),"금액을");};
    if(bv)bv.onclick=function(){billView(b.url);};});
};
function billView(u){if(/^https:\/\/app\.cgg\.co\.kr\//.test(u||"")){try{window.open(u,"_blank","noopener");}catch(e){}}else CGG.toast(DEMO?"시연에서는 청구서 화면이 열리지 않아요.":"청구서를 열지 못했어요. 업체에 문의해 주세요.");}
function copy(v,what){var done=function(){CGG.toast(what+" 복사했어요");},
  fail=function(){CGG.dialog({size:"form",title:"복사하지 못했어요",desc:"아래 글을 길게 눌러 복사해 주세요.",body:'<input class="dcopy" readonly value="'+esc(v)+'" onfocus="this.select()">'});};
  try{navigator.clipboard.writeText(v).then(done,fail);}catch(e){fail();}}
/* ⑦ 카히스토리 — 곧 열려요 (충전 · 조회 단추는 꺼짐) */
V.hist=function(m){
  m.innerHTML=head("카히스토리","차량번호로 사고 · 정비 이력을 조회해요. (곧 열려요)")
    +bx("남은 조회 0건","조회할 때마다 1건씩 빠져요 · 앱은 무료",'<div class="row">'+btn("5건 충전",false,"",true)+btn("10건 충전",false,"",true)+btn("30건 충전",false,"",true)+'</div>')
    +bx("조회","",'<div class="fm"><label for="hp">차량번호<input id="hp" placeholder="예: 123가4567" autocomplete="off" disabled></label></div><div class="row">'+btn("조회",true,"",true)+'</div>')
    +bx("최근 조회","아직 조회한 차가 없어요.","");
};
/* ⑧ 내 정보 — 알림 받기 4줄 · 번호 · 로그아웃 · 동의 철회 (확인 창) */
V.me=function(m){
  var pref={};try{pref=JSON.parse(ls("cgd_pref")||"{}");}catch(e){}
  var P=[["n1","입고 · 출고 알림","업체에 들어가고 나올 때"],["n2","목적지 도착 알림","사진과 함께"],["n3","청구서 알림","알림톡으로 받기 (안 되면 문자)"],["n4","재검사 안내","검사소에서 정한 유효기간이 끝나기 전에 알려 드려요"]];
  m.innerHTML=head("내 정보",[S.name?S.name+" 딜러":"딜러",company()].filter(Boolean).join(" · "))
    +bx("알림 받기","",P.map(function(a){return '<label class="ck"><input type="checkbox" data-pref="'+a[0]+'"'+(pref[a[0]]!==false?" checked":"")+'> <span><b>'+esc(a[1])+'</b> <small style="color:var(--muted)">'+esc(a[2])+'</small></span></label>';}).join(""))
    +bx("번호",telFmt(S.phone)+" · 로그인 번호 · 업체에 알려 준 번호",'<div class="row">'+btn(S.name?"이름 고치기":"이름 넣기",false,"mName")+btn("약관 동의 보기",false,"mDocs")+'</div>')
    +bx("로그아웃","",'<div class="row">'+btn("로그아웃",false,"lo")+btn("동의 철회 (이용 그만두기)",false,"wd")+'</div><p class="dver">차곳간 딜러 '+esc(VER)+' · 문의 010-9559-3663</p>');
  Array.prototype.forEach.call(m.querySelectorAll("[data-pref]"),function(el){el.onchange=function(){var p={};try{p=JSON.parse(ls("cgd_pref")||"{}");}catch(e){}
    p[el.getAttribute("data-pref")]=el.checked;ls("cgd_pref",JSON.stringify(p));CGG.toast("저장했어요 · 앱 알림이 열리면 이대로 보내요");};});
  $("lo").onclick=askLogout;
  $("wd").onclick=function(){CGG.dialog({size:"confirm",title:"동의를 철회할까요?",desc:"모든 기기에서 로그아웃되고, 다시 동의하기 전까지 차가 보이지 않아요. 업체에 맡긴 차 기록은 업체에 그대로 남아요.",
    rows:[["누구",whoLine()]],ok:"동의 철회",cancel:"취소",onOk:function(){api("leave").then(function(){forget();CGG.toast("동의를 철회했어요");},function(e){CGG.toast(errMsg(e));});}});};
  $("mName").onclick=function(){CGG.dialog({size:"form",title:"이름",body:'<div class="fm"><label for="nm">이름<input id="nm" maxlength="20" placeholder="예) 김민수" value="'+esc(S.name)+'"></label></div>',ok:"저장",cancel:"취소",
    onOk:function(){var nm=(($("nm")||{}).value||"").trim();api("setName",[nm]).then(function(r){S.name=r.name;render();CGG.toast("저장했어요");},function(e){CGG.toast(errMsg(e));});}});};
  $("mDocs").onclick=function(){CGG.dialog({size:"form",title:"약관 다시 보기",desc:S.agreedAt?new Date(S.agreedAt).toLocaleDateString("ko-KR")+" 동의":"",body:'<div class="ddoc">'+esc(TERMS)+"\n\n──────────\n\n"+esc(PRIVACY)+'</div>'});};
};
function askLogout(){CGG.dialog({size:"confirm",title:"로그아웃할까요?",desc:"다시 로그인할 때 인증번호를 한 번 더 받아요.",rows:[["누구",whoLine()+" · "+telMask(S.phone)]],ok:"로그아웃",cancel:"취소",
  onOk:function(){api("logout").then(function(){},function(){}).then(function(){forget();CGG.toast("로그아웃했어요");});}});}

/* ---------- 로그인 · 이용 동의 (d3.9 흐름 그대로 · 모양만 1.13.2 토큰) ---------- */
function demoBar(){return DEMO?'<div class="lg-demo">시연 화면 — 실제 자료가 아니에요</div>':'';}
function brand(){return '<div class="lg-brand"><span class="ci"><img src="'+CGG.CI.white+'" alt="" width="28" height="28"></span>차곳간 딜러</div>';}
function loginView(){
  var s=S.step;
  return '<div class="lg">'+demoBar()+'<div class="lg-card">'+brand()+
  '<h2>'+(s===1?'휴대폰 번호로<br>시작하기':'인증번호 6자리를<br>입력해 주세요')+'</h2>'+
  '<p>'+(s===1?'업체에 알려 주신 번호로 로그인하면 맡긴 차가 바로 보입니다. 비밀번호는 필요 없습니다.':esc(telFmt(S.phone))+' 번호로 인증번호를 발송했습니다. 5분 안에 입력해 주세요.'+(DEMO?' (시연: 123456)':''))+'</p>'+
  (s===1?'<label class="t" for="ph">휴대폰 번호</label><input class="lg-in" id="ph" type="tel" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" value="'+esc(telFmt(S.phone))+'">'+
    (S.err?'<p class="lg-err" role="alert">'+esc(S.err)+'</p>':'')+
    '<button type="button" class="cgg-btn pri" data-act="otp" '+(S.sending?'disabled':'')+'>'+(S.sending?'보내는 중…':'인증번호 받기')+'</button>':
   '<div class="lg-otp">'+[0,1,2,3,4,5].map(function(i){return '<input id="o'+i+'" type="tel" inputmode="numeric" maxlength="1" '+(i===0?'autocomplete="one-time-code"':'')+' aria-label="'+(i+1)+'번째 숫자">';}).join("")+'</div>'+
    (S.err?'<p class="lg-err" role="alert">'+esc(S.err)+'</p>':'')+
    '<button type="button" class="cgg-btn pri" data-act="enter" '+(S.sending?'disabled':'')+'>'+(S.sending?'확인 중…':'로그인')+'</button>'+
    '<button type="button" class="cgg-btn" data-act="otpback">번호 다시 입력</button>'+
    '<button type="button" class="lg-link" data-act="resend">인증번호 다시 받기</button>')+
  '<p class="lg-foot">처음 로그인하면 이용약관 · 개인정보 동의 화면이 한 번 나옵니다.</p></div></div>';
}
function agreeView(){
  var d=S.docOpen;
  var row=function(id,label,doc){return '<div class="lg-row"><label><input type="checkbox" id="'+id+'"><span>'+esc(label)+'</span></label>'+
    '<button type="button" data-act="doc" data-v="'+doc+'">'+(d===doc?'접기':'보기')+'</button></div>'+
    (d===doc?'<div class="lg-doc">'+esc(doc==="terms"?TERMS:doc==="privacy"?PRIVACY:MKT)+'</div>':'');};
  return '<div class="lg">'+demoBar()+'<div class="lg-card">'+brand()+'<h2>이용 동의</h2><p>처음 한 번만 하면 돼요.</p>'+
   '<div class="lg-note">내 번호로 맡겨진 차를 보여 드리려면 아래 동의가 필요합니다. 동의하지 않으면 차 목록을 볼 수 없습니다.</div>'+
   '<label class="lg-all"><input type="checkbox" id="aAll"><span><b>모두 동의</b><br><small>필수 2개 + 선택 1개</small></span></label>'+
   '<div class="lg-list">'+row("aT","[필수] 이용약관","terms")+row("aP","[필수] 개인정보 수집·이용","privacy")+row("aM","[선택] 광고·소식 받기","mkt")+'</div>'+
   (S.err?'<p class="lg-err" role="alert">'+esc(S.err)+'</p>':'')+
   '<button type="button" class="cgg-btn pri" data-act="agree">동의하고 시작하기</button>'+
   '<button type="button" class="cgg-btn" data-act="logout">나중에 하기 (로그아웃)</button></div></div>';
}

/* ---------- 그리기 ---------- */
function render(){
  try{CGG.closeMenu();}catch(e){}
  var app=$("app"),lg=$("login"),main=S.view==="main";
  app.hidden=!main;lg.hidden=main;
  if(!main){lg.innerHTML=S.view==="agree"?agreeView():loginView();bindLogin();return;}
  drawHeader();drawNav();
  var m=$("main");m.innerHTML="";(V[S.tab]||V.home)(m);
  if(DEMO){m.insertAdjacentHTML("afterbegin",CGG.trial.band({title:"예시 자료로 딜러앱을 둘러보고 있어요.",sub:"실제 자료가 아니에요. 딜러앱은 무료예요 — 휴대폰 번호로 로그인하면 업체에 맡긴 내 차가 보여요."}));
    var cta=m.querySelector("[data-cgg-cta]");if(cta)cta.onclick=function(){try{location.href=location.pathname;}catch(e){}};}
}
function bindLogin(){
  var ph=$("ph");if(ph){ph.oninput=function(){S.phone=dg(ph.value).slice(0,11);};ph.onkeydown=function(e){if(e.key==="Enter")act("otp");};}
  var o0=$("o0");if(o0){
    var boxes=[0,1,2,3,4,5].map(function(i){return $("o"+i);});
    boxes.forEach(function(b,i){
      b.oninput=function(){var v=dg(b.value);
        if(v.length>1){v.split("").slice(0,6-i).forEach(function(ch,j){boxes[i+j].value=ch;});var nx=Math.min(5,i+v.length);boxes[nx].focus();}
        else{b.value=v;if(v&&i<5)boxes[i+1].focus();}
        if(code().length===6)act("enter");};
      b.onkeydown=function(e){if(e.key==="Backspace"&&!b.value&&i>0){boxes[i-1].focus();boxes[i-1].value="";}if(e.key==="Enter")act("enter");};
      b.onpaste=function(e){var t=dg((e.clipboardData||window.clipboardData).getData("text"));if(t.length>=6){e.preventDefault();t.slice(0,6).split("").forEach(function(ch,j){boxes[j].value=ch;});act("enter");}};
    });
    if(!S.sending)o0.focus();
  }
  var all=$("aAll");if(all){var subs=["aT","aP","aM"].map($);
    all.onchange=function(){subs.forEach(function(x){x.checked=all.checked;});};
    subs.forEach(function(x){x.onchange=function(){all.checked=subs.every(function(y){return y.checked;});};});}
}
function code(){return [0,1,2,3,4,5].map(function(i){return ($("o"+i)||{}).value||"";}).join("");}
function keepChecks(fn){var ids=["aT","aP","aM","aAll"],k=ids.map(function(id){return $(id)&&$(id).checked;});fn();ids.forEach(function(id,i){if($(id))$(id).checked=k[i];});}

/* ---------- 동작 (서버 부르기는 d3.9 그대로) ---------- */
function loadBills(){var k=S.key;S.billsAt=Date.now();return api("myBills").then(function(r){if(S.key!==k)return;var L=(r&&r.list)||[],rd=!!(r&&r.ready),sig=JSON.stringify([rd,L]);
  if(sig===S.billsSig&&S.bills)return;S.billsSig=sig;S.bills=L;S.billsReady=rd;if(S.tab==="bill"||S.tab==="home")render();},function(){if(S.key!==k)return;if(S.bills)return;S.bills=[];S.billsReady=false;if(S.tab==="bill"||S.tab==="home")render();});}
/* d3.9 — 청구서는 탭을 열 때 · 앱으로 돌아올 때 다시 불러옴 (gap 밀리초 안에 또 부르면 건너뜀) */
function freshBills(gap){if(!S.key||!S.agreed||S.view==="login"||S.view==="agree")return;if(Date.now()-(S.billsAt||0)<gap)return;loadBills();}
try{document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")freshBills(30000);});}catch(e){}
function loadCars(){
  loadBills();
  var k=S.key;
  return api("cars").then(function(r){if(S.key!==k)return;S.cars=(r&&r.list)||[];S.done=(r&&r.done)||{};if(S.carT)S.carT.sel={};S.sel={};render();},
    function(e){if(S.key!==k)return;if(S.cars===null)S.cars=[];render();CGG.toast(errMsg(e));});
}
function enterMain(){S.view="main";S.tab="home";S.cars=null;render();loadCars();
  api("me").then(function(m){if(m){S.name=m.name||"";S.agreedAt=m.agreedAt||"";S.phone=m.phone||S.phone;render();}},function(){});}

function act(a,el){
  var v=el&&el.getAttribute("data-v");
  if(a==="otp"||a==="resend"){
    var p=dg(S.phone);if(!/^01\d{8,9}$/.test(p)){S.err="휴대폰 번호가 올바르지 않습니다. 다시 확인해 주세요.";render();return;}
    S.sending=true;S.err="";render();
    api("sendCode",[p]).then(function(){S.sending=false;S.step=2;S.err="";render();if(a==="resend")CGG.toast("인증번호를 다시 발송했습니다.");},
      function(e){S.sending=false;S.err=errMsg(e);render();});return;
  }
  if(a==="otpback"){S.step=1;S.err="";render();return;}
  if(a==="enter"){
    var c=code();if(c.length!==6){S.err="인증번호 6자리를 모두 입력해 주세요.";render();return;}
    if(S.sending)return;S.sending=true;S.err="";
    api("verifyCode",[S.phone,c]).then(function(r){
      S.sending=false;S.key=r.key;S.phone=r.phone;S.name=r.name||"";S.agreed=!!r.agreed;
      if(!DEMO){ls("cgd_key",r.key);ls("cgd_phone",r.phone);}
      armBack();
      if(S.agreed){enterMain();CGG.toast((S.name?S.name+" 딜러님, ":"")+"로그인했습니다.");}else{S.view="agree";S.err="";render();}
    },function(e){S.sending=false;S.err=errMsg(e);render();});return;
  }
  if(a==="doc"){keepChecks(function(){S.docOpen=S.docOpen===v?"":v;render();});return;}
  if(a==="agree"){
    if(!$("aT").checked||!$("aP").checked){keepChecks(function(){S.err="필수 항목 2개에 동의해야 시작할 수 있습니다.";render();});return;}
    var mk=$("aM").checked;
    api("agree",[mk]).then(function(){S.agreed=true;S.agreedAt=new Date().toISOString();S.err="";enterMain();CGG.toast("동의가 완료되었습니다. 어서 오세요.");},
      function(e){keepChecks(function(){S.err=errMsg(e);render();});});return;
  }
  if(a==="logout"){api("logout").then(function(){},function(){}).then(function(){forget();CGG.toast("로그아웃했어요");});return;}
}
document.addEventListener("click",function(e){
  var el=e.target.closest&&e.target.closest("#login [data-act]");if(!el)return;
  if(el.tagName==="BUTTON")e.preventDefault();
  act(el.getAttribute("data-act"),el);
});

/* ---------- 뒤로가기: 로그인한 상태에서는 바로 나가지 않고 물어봅니다 ---------- */
var armed=false;
function armBack(){if(armed)return;armed=true;history.pushState({root:1},"");}
window.addEventListener("popstate",function(){
  if(CGG.closeSheet()){history.pushState({root:1},"");return;}
  if(dlgOpen()){CGG.closeDialog();history.pushState({root:1},"");return;}
  if(S.key&&S.view==="main"){history.pushState({root:1},"");askLogout();return;}
  if(S.key&&S.view==="agree"){history.pushState({root:1},"");}
});

/* ---------- 시작 ---------- */
(function start(){
  CGG.favicon();
  CGG.layout.init($("app"),"cgg_dealer_layout","top");
  if(DEMO){CGG.trial.init("preview");S.view="login";render();return;}
  S.key=ls("cgd_key");S.phone=ls("cgd_phone");S.seen=ls("cgd_seen");
  if(!S.key){render();return;}
  armBack();
  S.view="main";S.cars=null;render();
  api("me").then(function(m){
    S.phone=m.phone;S.name=m.name||"";S.agreed=!!m.agreed;S.agreedAt=m.agreedAt||"";ls("cgd_phone",m.phone);
    if(!S.agreed){S.view="agree";render();}else loadCars();
  },function(e){if(S.key){S.cars=[];render();CGG.toast(errMsg(e));}});
})();
