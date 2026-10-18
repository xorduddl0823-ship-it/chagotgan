# 통합등록 화면 시안 2개 만들기 — 공통 부품 cgg-j4 1.13.2 를 안에 넣은 한 파일짜리 미리보기
# 실행: python3 통합등록/시안/도구/만들기_통합등록_시안.py  → 통합등록/시안/1_…, 2_… 와 zip
import os, zipfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
CSS = open(os.path.join(ROOT, '디자인/공통/cgg-j4-1.13.2.css'), encoding='utf-8').read()
JS = open(os.path.join(ROOT, '디자인/공통/cgg-j4-1.13.2.js'), encoding='utf-8').read()
OUT = os.path.join(ROOT, '통합등록/시안')

BASE_CSS = r'''
body{margin:0;background:var(--bg);font-family:"Noto Sans KR",-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;color:var(--ink,#16202c)}
.card{background:var(--surface);border-radius:var(--r-card);box-shadow:var(--sh);padding:18px 20px;margin:0 0 14px}
.card h3{margin:0 0 4px;font-size:17px;letter-spacing:-.02em}
.card .csub{margin:0 0 12px;color:var(--muted);font-size:13px}
.demo{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 14px;font-size:12.5px;color:var(--muted)}
.demo b{font-weight:700;color:var(--muted)}
.demo button{height:30px;padding:0 10px;border-radius:15px;border:1px solid var(--ln2,#d8e0ea);background:var(--surface);font:inherit;font-size:12.5px;cursor:pointer;color:inherit}
.demo button[aria-pressed="true"]{background:#1668C4;border-color:#1668C4;color:#fff}
.nos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0 0}
.no{border:1px solid var(--ln2,#d8e0ea);border-radius:12px;padding:10px 12px;background:var(--surface)}
.no small{display:block;color:var(--muted);font-size:12px}
.no b{display:block;font-size:20px;letter-spacing:-.02em;margin-top:2px;font-variant-numeric:tabular-nums}
.no.ok{border-color:#9ED7B2;background:#F2FBF5}.no.ok b::after{content:" ✓";color:#1E8E4E;font-size:16px}
.no.bad{border-color:#F3A6A6;background:#FFF3F3}.no.bad b{color:#C62828}
.no.wait b{color:var(--muted)}
.acts2{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.acts2 .cgg-btn{height:var(--ctl,43px)}
.cgg-st.wait{background:#EEF1F5;color:#5B6675}
.note1{margin:10px 0 0;font-size:13px;color:var(--muted)}
.stopbox{border:2px solid #E57373;background:#FFF6F6;border-radius:14px;padding:16px 18px;margin:0 0 14px}
.stopbox h3{margin:0 0 4px;color:#C62828;font-size:17px}
.stopbox ol{margin:10px 0 0;padding-left:20px;line-height:1.75}
.stopbox .why{font-size:14px;margin:0}
.checkbox{border:2px solid #F0B35A;background:#FFF9EF;border-radius:14px;padding:16px 18px;margin:0 0 14px}
.checkbox h3{margin:0 0 4px;color:#B26A00;font-size:17px}
.pin{display:grid;gap:8px;margin-top:6px}.pin label{display:grid;gap:4px;font-size:13px;color:var(--muted)}
.pin input{height:var(--ctl,43px);border:1px solid var(--ln2,#d8e0ea);border-radius:10px;padding:0 12px;font:inherit;font-size:15px}
.chk3{display:grid;gap:6px;margin:6px 0 0}.chk3 label{display:flex;gap:8px;align-items:center;font-size:14px}.chk3 input{width:22px;height:22px}
@media (max-width:600px){.nos{grid-template-columns:1fr}.card{padding:14px}}
'''

COMMON_JS = r'''
var CARS=[
  {no:"12가3456",car:"그랜저 IG",dealer:"김예시 · 예시상사",at:"09:10",st:"진행 중",step:2,ci:"T-0201",cm:"",en:""},
  {no:"34나5678",car:"쏘렌토",dealer:"이시험 · 가람모터스",at:"09:40",st:"기다림",step:0,ci:"",cm:"",en:""},
  {no:"56다1122",car:"K5",dealer:"박가짜 · 누리상사",at:"08:30",st:"끝남",step:4,ci:"T-0200",cm:"T-0200",en:"T-0200"},
  {no:"78라9090",car:"카니발",dealer:"최모의 · 다온카",at:"10:05",st:"기다림",step:0,ci:"",cm:"",en:""}];
var ST_MAP={"진행 중":"run","끝남":"done","확인 필요":"chk","멈춤":"stop","기다림":"wait"};
var MODE="ok";   /* ok · stop · check · login */
var SITES=[["carinfo","카인포"],["carmodoo","카모두"],["entry","엔트리"]];
function cur(){ return CARS[0]; }
/* 지금 몇 번째 칸인지 — «엔트리 로그인 필요» 상태는 카모두까지 끝난 뒤라 3 */
function eff(c){ return MODE==="login"?3:c.step; }
function stepsOf(c){
  var S=["사진·값 확인","카인포 저장","카모두 저장","엔트리 저장"];
  return S.map(function(l,i){
    var st=i<eff(c)?"done":(i===eff(c)?"now":"todo");
    var note=st==="done"?"끝":(st==="now"?"지금":"남음");
    if(MODE==="stop"&&i===2){ st="now"; note="멈춤 — 번호 다름"; }
    if(MODE==="check"&&i===2){ st="now"; note="저장 확인 필요"; }
    if(MODE==="login"&&i===3){ st="now"; note="엔트리 로그인 필요"; }
    return {label:l,note:note,state:st}; });
}
function numBoxes(c){
  var en=eff(c)>3?c.ci:"";
  function box(lbl,v,base){ var k=!v?"wait":(v===base?"ok":"bad"); return '<div class="no '+k+'"><small>'+lbl+'</small><b>'+(v||"아직")+'</b></div>'; }
  return '<div class="nos">'+box("카인포 점검번호 (기준)",c.ci,c.ci)+box("카모두에 넣은 번호",MODE==="stop"?"T-9999":(eff(c)>=2?c.ci:""),c.ci)+box("엔트리가 끌어온 번호",en,c.ci)+'</div>';
}
function askSave(site,c){
  CGG.dialog({title:site+"에서 [저장]을 직접 눌러 주세요",desc:"프로그램이 저장을 한 번만 허락해요. 확인했으면 사이트 창에서 [저장]을 누르세요.",
    rows:[["어느 전산",site],["차량",c.no+" · "+c.car],["건수","1대"],["점검번호",c.ci||"(저장 뒤 생김)"],["딜러",c.dealer]],
    ok:"저장 허락",onOk:function(){ CGG.toast(site+" 저장을 한 번 허락했어요 — 사이트 창에서 [저장]을 누르세요"); }});
}
function askRecover(c){
  CGG.dialog({size:"form",title:"관리자 확인으로 정리",desc:"번호가 어긋난 작업을 닫고, 세 전산 목록을 직접 확인한 뒤 다음 차를 허용해요.",
    body:'<div class="pin"><label>관리자 이름<input value="대표님"></label><label>관리자 비밀번호 (숫자 6자리 이상)<input id="rPin" type="password" inputmode="numeric" placeholder="●●●●●●"></label><label>까닭<input id="rWhy" placeholder="예: 카인포·카모두 지우고 다시 등록함"></label><label>작업 번호를 그대로 적어 주세요 (1019-002)<input id="rJob" placeholder="1019-002"></label></div>'
      +'<div class="chk3"><label><input type="checkbox" class="rChk">카인포 목록을 직접 확인했어요</label><label><input type="checkbox" class="rChk">카모두 목록을 직접 확인했어요</label><label><input type="checkbox" class="rChk">엔트리 목록을 직접 확인했어요</label></div>',
    ok:"정리하고 다음 차 허용",onOk:function(d){
      var miss=[]; if(!/^\d{6,12}$/.test(d.querySelector("#rPin").value)) miss.push("관리자 비밀번호");
      if(d.querySelector("#rWhy").value.trim().length<5) miss.push("까닭(5자 이상)");
      if(d.querySelector("#rJob").value.trim()!=="1019-002") miss.push("작업 번호");
      if([].filter.call(d.querySelectorAll(".rChk"),function(x){return x.checked;}).length<3) miss.push("세 전산 목록 확인");
      if(miss.length){ CGG.toast("아직 안 채운 것: "+miss.join(", ")); return false; }
      CGG.toast("정리했어요 — 사람이 직접 확인한 것으로 기록했어요"); }});
}
/* «저장 안 됐어요» — 두 번 등록 막기를 푸는 일이라 한 번 더 확인 */
function askNotSaved(site,c,after){
  CGG.dialog({title:site+" 목록에서 «저장 안 됨»을 직접 확인했나요?",desc:"확인하면 다시 저장 허락을 할 수 있어요. 목록에 이 차가 있으면 누르지 마세요(두 번 등록돼요).",
    rows:[["어느 전산",site],["차량",c.no+" · "+c.car],["점검번호",c.ci],["건수","1대"]],ok:"목록에 없어요 — 저장 안 됨",onOk:function(){ after(); CGG.toast("저장 안 됨으로 기록 — 다시 저장 허락을 할 수 있어요"); }});
}
function askSaved(site,c,after){
  CGG.dialog({title:site+" 목록에서 저장을 확인했나요?",rows:[["어느 전산",site],["차량",c.no],["확인할 번호",c.ci],["확인한 사람","대표님"]],ok:"확인했어요",onOk:function(){ after(); CGG.toast("확인한 것으로 기록했어요"); }});
}
function frame(cur, title){
  var app=document.getElementById("app");
  CGG.layout.init(app,"cgg_reg_demo_layout");
  var FEATS=[{id:"reg",label:"전산 등록 (카인포·카모두·엔트리)",path:"전산 등록",go:"reg",words:"전산 등록 카인포 카모두 엔트리 성능점검 등록"}];
  CGG.header(document.getElementById("top"),{product:"체크",sub:"성능점검 정산",ver:"체크 v57 시안",
    biz:{name:"가온진단평가",line:"000-00-00000 · 대표 (시안)"},find:{mode:"nav",feats:FEATS,onGo:function(){}},notice:function(){},help:function(){},link:function(){},refresh:function(){CGG.toast("새로고침(시안)");},
    auto:{value:"30",options:[["0","끄기"],["30","30초마다"]],onChange:function(){}},saved:true,
    me:{name:"대표님",role:"대표",sub:"마이페이지 · 휴지통",items:[{key:"me",icon:"user",label:"마이페이지"},{key:"trash",icon:"trash",label:"휴지통"},"-",{key:"out",icon:"out",label:"로그아웃"}],onPick:function(){}}});
  /* 지금 체크 v56.3 메뉴 그대로 + «전산 등록»(체크 전용)만 «재검사 알림»과 «설정» 사이에 */
  var G=[{key:"home",label:"홈",icon:"home"},{key:"sales",label:"매출",icon:"chart"},{key:"bill",label:"월별 청구서",icon:"file"},
    {key:"deposit",label:"입·출금 내역",icon:"wallet"},{key:"hometax",label:"세금계산서",icon:"receipt"},{key:"deliv",label:"배달",icon:"truck"},
    {key:"remind",label:"재검사 알림",icon:"bell"},{key:"reg",label:"전산 등록",icon:"pc",isNew:true},{key:"set",label:"설정",icon:"gear"}];
  CGG.nav(document.getElementById("nav"),G,"reg",function(){ CGG.toast("시안에서는 «전산 등록»만 보여요"); },{find:{feats:FEATS,onGo:function(){}}});
  /* 폰 아래 탭도 지금 체크 그대로 — «전산 등록»은 «전체» 안 */
  CGG.tabbar(document.getElementById("tbar"),[{key:"home",icon:"home",label:"홈"},{key:"bill",icon:"file",label:"청구서"},{key:"delivery",icon:"truck",label:"배달"},{key:"deposit",icon:"wallet",label:"입·출금"},{key:"all",icon:"more",label:"전체"}],"all",function(){});
}
function demoBar(el, redraw){
  var M=[["ok","정상 진행"],["stop","번호 다름(멈춤)"],["check","저장 확인 필요"],["login","엔트리 로그인 필요"]];
  el.innerHTML='<b>시안 보기:</b>'+M.map(function(m){ return '<button type="button" data-m="'+m[0]+'" aria-pressed="'+(MODE===m[0])+'">'+m[1]+'</button>'; }).join("");
  Array.prototype.forEach.call(el.querySelectorAll("[data-m]"),function(b){ b.onclick=function(){ MODE=b.getAttribute("data-m"); redraw(); }; });
}
'''

A_JS = r'''
function draw(){
  var c=cur();
  demoBar(document.getElementById("demo"),draw);
  var wait=CARS.filter(function(x){return x.st==="기다림";}).length;
  document.getElementById("hd").innerHTML=CGG.head({crumb:"전산 등록",title:'등록할 차 <em>'+(wait+1)+'대</em> · 지금 <em>'+c.no+'</em>',
    desc:"카인포 → 카모두 → 엔트리 차례로 한 대씩 등록해요. 저장은 사람이 눌러요.",
    acts:[{label:"사진으로 차 추가",icon:"plus",id:"add"},{label:"다음 차 시작",pri:true,id:"next",disabled:true,after:'<small style="display:block;font-size:11px;font-weight:500;opacity:.8">지금 차가 끝나면</small>'}]});
  document.getElementById("add").onclick=function(){ CGG.dialog({size:"form",title:"사진으로 차 추가",desc:"번호판·계기판 사진을 올리면 차량번호·주행거리를 읽어 넣어요. 숫자는 꼭 확인해 주세요.",body:'<div class="pin"><label>번호판 사진<input type="file" accept="image/*"></label><label>계기판 사진<input type="file" accept="image/*"></label><label>차량번호 (읽은 값)<input value="90마 4545"></label><label>주행거리 km (읽은 값)<input value="45,210"></label></div>',ok:"맞아요 — 대기열에 넣기",onOk:function(){ CGG.toast("대기열에 넣었어요(시안)"); }}); };
  var band=document.getElementById("band");
  if(MODE==="stop") CGG.todoBand(band,{tone:"stop",count:1,text:"카모두 번호가 카인포와 달라 멈췄어요. 다음 차도 기다려요.",go:"정리하러 가기",onGo:function(){ askRecover(c); }});
  else if(MODE==="check") CGG.todoBand(band,{tone:"chk",count:1,text:"카모두 저장이 됐는지 프로그램이 확실히 모릅니다. 목록에서 확인해 주세요.",go:"확인하러 가기",onGo:function(){ document.getElementById("now").scrollIntoView({block:"start"}); }});
  else if(MODE==="login") CGG.todoBand(band,{tone:"chk",count:1,text:"엔트리 로그인이 끊겼어요. 업무폰 문자 인증이 필요해요.",go:"로그인 창 열기",onGo:function(){ CGG.toast("엔트리 창을 앞으로 띄워요(시안)"); }});
  else CGG.todoBand(band,{tone:"run",count:1,text:"카모두 차례예요. 값을 넣었고 번호도 맞아요 — [저장 허락] 뒤 사이트에서 저장을 눌러 주세요.",go:"저장 허락",onGo:function(){ askSave("카모두",c); }});
  CGG.kpis(document.getElementById("kp"),[{label:"기다리는 차",value:String(wait),unit:"대"},{label:"등록 중",value:"1",unit:"대"},
    {label:"확인 필요",value:MODE==="ok"?"0":"1",unit:"대",zeroMuted:true,tone:MODE==="stop"?"stop":"due"},{label:"오늘 끝남",value:"1",unit:"대",tone:"in"}]);
  var now=document.getElementById("now");
  var top='<h3>지금 등록 중 · '+c.no+' · '+c.car+'</h3><p class="csub">'+c.dealer+' · 작업 번호 1019-002</p><div id="stp"></div>'+numBoxes(c);
  var acts='<div class="acts2">';
  if(MODE==="ok") acts+='<button class="cgg-btn pri" id="bSave">카모두 저장 허락</button><button class="cgg-btn" id="bWin">카모두 창 보기</button>';
  if(MODE==="check") acts+='<button class="cgg-btn pri" id="bSaved">목록에서 저장됨을 확인했어요</button><button class="cgg-btn" id="bNot">저장 안 됐어요</button><button class="cgg-btn" id="bWin">카모두 창 보기</button>';
  if(MODE==="login") acts+='<button class="cgg-btn pri" id="bLogin">엔트리 로그인 창 열기</button><button class="cgg-btn" id="bRe">로그인했어요 — 번호 다시 확인</button>';
  if(MODE==="stop") acts+='<button class="cgg-btn pri" id="bRec">관리자 확인으로 정리</button><button class="cgg-btn" id="bWin">카모두 창 보기</button>';
  acts+='</div><p class="note1">'+({ok:"저장은 한 번만 허락돼요. 두 번 눌러도 두 번째는 막혀요.",check:"확인 전에는 다시 저장할 수 없어요(두 번 등록 막기).",login:"문자 인증을 마치면 번호·차량·차대번호를 처음부터 다시 확인해요.",stop:"프로그램은 지우거나 고치지 않아요. 정리는 대표님이 직접 해요."})[MODE]+'</p>';
  var stopTop=MODE==="stop"?'<div class="stopbox"><h3>멈춤 — 다른 차 기록일 수 있어요</h3><p class="why">카모두에 저장된 번호 <b>T-9999</b> 가 카인포 번호 <b>T-0201</b> 과 달라요.</p><ol><li>카인포 목록에서 12가3456 이 T-0201 인지 확인</li><li>카모두 T-9999 줄을 지우기 (대표님이 직접)</li><li>카인포 T-0201 도 지우고 두 곳 다시 등록 (정정 절차 없음)</li><li>[관리자 확인으로 정리] — 세 전산 목록 확인 표시 후 다음 차 허용</li></ol></div>':"";
  now.innerHTML=stopTop+'<div class="card">'+top+acts+'</div>';
  CGG.steps(document.getElementById("stp"),stepsOf(c));
  var on=function(id,f){ var b=document.getElementById(id); if(b) b.onclick=f; };
  on("bSave",function(){ askSave("카모두",c); }); on("bWin",function(){ CGG.toast("카모두 창을 앞으로 띄워요(사람이 누를 때만)"); });
  on("bSaved",function(){ askSaved("카모두",c,function(){ MODE="ok"; draw(); }); });
  on("bNot",function(){ askNotSaved("카모두",c,function(){ MODE="ok"; draw(); }); });
  on("bLogin",function(){ CGG.toast("엔트리 창을 띄워요 — 문자 인증은 직접"); }); on("bRe",function(){ MODE="ok"; draw(); });
  on("bRec",function(){ askRecover(c); });
  var rows=CARS.map(function(x){ return [x.no,x.car,x.dealer,x.at,x.ci||"—",(x===c&&MODE==="stop")?"멈춤":(x===c&&MODE!=="ok")?"확인 필요":x.st]; });
  CGG.table(document.getElementById("tb"),{cols:["차량번호","차종","딜러 · 상사","들어온 시각","점검번호","상태"],kinds:["name","text","text","time","id","state"],rows:rows,stateMap:ST_MAP,
    tabs:[["","전체"],["기다림","기다림"],["진행 중","등록 중"],[["확인 필요","멈춤"],"확인 필요"],["끝남","끝남"]],sorts:[[3,1,"들어온 차례"],[0,1,"차량번호순"]],
    mline:function(r){ return r[1]+" · "+r[3]+" · "+r[4]; },
    onName:function(r){ CGG.dialog({size:"detail",title:r[0]+" · "+r[1],rows:[["딜러",r[2]],["들어온 시각",r[3]],["점검번호",r[4]],["상태",r[5]]]}); }});
  document.getElementById("hp").innerHTML=CGG.help("카인포 저장이 끝나야 번호가 생기고, 그 번호를 카모두에 넣고 엔트리가 끌어와요. 번호·차량번호·차대번호가 하나라도 다르면 멈추고, 지우기는 대표님이 직접 해요.","전산 등록 쓰는 법");
}
frame(); draw();
'''

B_JS = r'''
function siteCard(key,name,c){
  var idx={carinfo:1,carmodoo:2,entry:3}[key], st, no, btn="", note="";
  var e=eff(c);
  if(e>idx){ st="끝남"; no=c.ci; note="번호 확인 끝"; }
  else if(e===idx&&MODE!=="login"){ st="진행 중"; no=key==="carinfo"?"(저장 뒤 생김)":c.ci; btn='<button class="cgg-btn pri" data-save="'+name+'">'+name+' 저장 허락</button>'; note="값 넣기 끝 · 저장 허락 기다림"; }
  else { st="기다림"; no="—"; note="앞 전산이 끝나면"; }
  if(MODE==="stop"&&key==="carmodoo"){ st="멈춤"; no="T-9999"; btn='<button class="cgg-btn pri" data-rec="1">관리자 확인으로 정리</button>'; note="카인포 T-0201 과 다름"; }
  if(MODE==="check"&&key==="carmodoo"){ st="확인 필요"; btn='<button class="cgg-btn pri" data-saved="1">저장됨 확인</button><button class="cgg-btn" data-not="1">안 됐어요</button>'; note="저장 결과를 확실히 모름"; }
  if(MODE==="login"&&key==="entry"){ st="확인 필요"; no="—"; btn='<button class="cgg-btn pri" data-login="1">로그인 창 열기</button>'; note="문자 인증 필요"; }
  return '<div class="card sc"><div class="sch"><b>'+name+'</b>'+CGG.status(st,ST_MAP)+'</div><div class="scn"><small>점검번호</small><strong>'+no+'</strong></div><p class="csub">'+note+'</p><div class="acts2">'+btn+'<button class="cgg-btn" data-win="'+name+'">창 보기</button></div></div>';
}
function draw(){
  var c=cur();
  demoBar(document.getElementById("demo"),draw);
  document.getElementById("hd").innerHTML=CGG.head({crumb:"전산 등록",title:'지금 <em>'+c.no+'</em> · '+(MODE==="login"?"엔트리":"카모두")+' 차례',desc:"왼쪽 대기열에서 차를 고르고, 오른쪽에서 전산마다 저장을 허락해요.",
    acts:[{label:"사진으로 차 추가",icon:"plus",id:"add"}]});
  document.getElementById("add").onclick=function(){ CGG.toast("사진으로 차 추가(시안 A 와 같은 창)"); };
  var band=document.getElementById("band");
  if(MODE==="stop") CGG.todoBand(band,{tone:"stop",count:1,text:"번호가 달라 멈췄어요 — 정리 전에는 다음 차를 시작하지 않아요.",go:"정리하러 가기",onGo:function(){ askRecover(c); }});
  else if(MODE==="check") CGG.todoBand(band,{tone:"chk",count:1,text:"카모두 저장 여부를 목록에서 확인해 주세요.",go:"확인하러 가기",onGo:function(){ document.getElementById("detail").scrollIntoView({block:"start"}); }});
  else if(MODE==="login") CGG.todoBand(band,{tone:"chk",count:1,text:"엔트리 로그인이 끊겼어요(문자 인증).",go:"로그인 창 열기",onGo:function(){ CGG.toast("엔트리 창을 띄워요 — 문자 인증은 직접"); }});
  else CGG.todoBand(band,{count:0,empty:"막힌 일 없어요 — 카모두 저장 허락을 기다려요"});
  var wait=CARS.filter(function(x){return x.st==="기다림";}).length;
  CGG.kpis(document.getElementById("kp"),[{label:"기다리는 차",value:String(wait),unit:"대"},{label:"등록 중",value:"1",unit:"대"},
    {label:"확인 필요",value:MODE==="ok"?"0":"1",unit:"대",zeroMuted:true,tone:MODE==="stop"?"stop":"due"},{label:"오늘 끝남",value:"1",unit:"대",tone:"in"}]);
  var q=document.getElementById("queue");
  q.innerHTML='<div class="card qcard"><h3>대기열</h3><p class="csub">들어온 차례 · 한 번에 한 대</p>'+CARS.map(function(x,i){ var s=(i===0&&MODE==="stop")?"멈춤":(i===0&&MODE!=="ok")?"확인 필요":x.st;
    return '<button type="button" class="qrow'+(i===0?' on':'')+'" data-q="'+i+'"><span><b>'+x.no+'</b><small>'+x.car+' · '+x.at+'</small></span>'+CGG.status(s,ST_MAP)+'</button>'; }).join("")+'</div>';
  Array.prototype.forEach.call(q.querySelectorAll("[data-q]"),function(b){ b.onclick=function(){ var x=CARS[+b.getAttribute("data-q")]; if(x===c) return;
    CGG.toast(x.no+" — 지금 차가 끝나야 시작해요(한 번에 한 대)"); }; });
  var rows=CARS.map(function(x){ return [x.no,x.car,x.dealer,x.at,x.ci||"—",(x===c&&MODE==="stop")?"멈춤":(x===c&&MODE!=="ok")?"확인 필요":x.st]; });
  CGG.table(document.getElementById("tb"),{cols:["차량번호","차종","딜러 · 상사","들어온 시각","점검번호","상태"],kinds:["name","text","text","time","id","state"],rows:rows,stateMap:ST_MAP,
    tabs:[["","전체"],["기다림","기다림"],["진행 중","등록 중"],[["확인 필요","멈춤"],"확인 필요"],["끝남","끝남"]],sorts:[[3,1,"들어온 차례"],[0,1,"차량번호순"]],
    mline:function(r){ return r[1]+" · "+r[3]+" · "+r[4]; },
    onName:function(r){ CGG.dialog({size:"detail",title:r[0]+" · "+r[1],rows:[["딜러",r[2]],["들어온 시각",r[3]],["점검번호",r[4]],["상태",r[5]]]}); }});
  var d=document.getElementById("detail");
  var stopTop=MODE==="stop"?'<div class="stopbox"><h3>멈춤 — 카모두 번호가 달라요</h3><p class="why">기대 <b>T-0201</b> · 읽은 값 <b>T-9999</b>. 다른 차 기록일 수 있어요. 프로그램은 지우지 않아요.</p><ol><li>세 전산 목록에서 12가3456 확인</li><li>카인포·카모두 지우고 다시 등록 (대표님 직접)</li><li>관리자 확인 — 세 전산 확인 표시 → 다음 차 허용</li></ol></div>':"";
  var chk=MODE==="check"?'<div class="checkbox"><h3>저장됐는지 확인해 주세요</h3><p class="why">카모두 저장 뒤 결과를 못 받았어요. 확인 전에는 다시 저장할 수 없어요(두 번 등록 막기).</p></div>':"";
  d.innerHTML=stopTop+chk+'<div class="card"><h3>'+c.no+' · '+c.car+'</h3><p class="csub">'+c.dealer+' · 작업 번호 1019-002</p><div id="stp"></div>'+numBoxes(c)+'</div>'
    +'<div class="cols3">'+SITES.map(function(s){ return siteCard(s[0],s[1],c); }).join("")+'</div>'
    +'<div class="card"><h3>기록</h3><p class="csub">이 차에서 있었던 일 (차량번호·차대번호는 가려서 남아요)</p><ul class="log"><li><b>09:12</b> 카인포 값 넣기 끝</li><li><b>09:14</b> 카인포 저장 허락 → 저장 확인 · 번호 T-0201 (차대번호 17자리 일치)</li><li><b>09:15</b> 카인포 창 잠금 — 같은 창에서 더 저장 못 함</li><li><b>09:16</b> 카모두 «자동 부여» 끔 · T-0201 넣음 · 번호 확인</li></ul></div>';
  CGG.steps(document.getElementById("stp"),stepsOf(c));
  Array.prototype.forEach.call(d.querySelectorAll("[data-save]"),function(b){ b.onclick=function(){ askSave(b.getAttribute("data-save"),c); }; });
  Array.prototype.forEach.call(d.querySelectorAll("[data-win]"),function(b){ b.onclick=function(){ CGG.toast(b.getAttribute("data-win")+" 창을 앞으로 띄워요(사람이 누를 때만)"); }; });
  Array.prototype.forEach.call(d.querySelectorAll("[data-rec]"),function(b){ b.onclick=function(){ askRecover(c); }; });
  Array.prototype.forEach.call(d.querySelectorAll("[data-saved]"),function(b){ b.onclick=function(){ askSaved("카모두",c,function(){ MODE="ok"; draw(); }); }; });
  Array.prototype.forEach.call(d.querySelectorAll("[data-not]"),function(b){ b.onclick=function(){ askNotSaved("카모두",c,function(){ MODE="ok"; draw(); }); }; });
  Array.prototype.forEach.call(d.querySelectorAll("[data-login]"),function(b){ b.onclick=function(){ CGG.toast("엔트리 창을 띄워요 — 문자 인증은 직접"); }; });
  document.getElementById("hp").innerHTML=CGG.help("대기열은 들어온 차례대로 한 대씩만 등록돼요. 끝난 전산 창은 잠겨서 같은 차를 두 번 저장할 수 없어요.","전산 등록 쓰는 법");
}
frame(); draw();
'''

B_CSS = r'''
.split{display:grid;grid-template-columns:280px minmax(0,1fr);gap:14px;align-items:start}
.qcard{position:sticky;top:12px}
.qrow{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;min-height:52px;padding:8px 10px;margin:0 0 6px;border:1px solid var(--ln2,#d8e0ea);border-radius:12px;background:var(--surface);font:inherit;text-align:left;cursor:pointer;color:inherit}
.qrow.on{border-color:#1668C4;box-shadow:0 0 0 2px #1668C433}
.qrow b{display:block;font-size:15px}.qrow small{color:var(--muted);font-size:12px}
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.cols3 .card{margin:0 0 14px}
.sch{display:flex;justify-content:space-between;align-items:center;gap:8px}.sch b{font-size:16px}
.scn small{display:block;color:var(--muted);font-size:12px;margin-top:10px}.scn strong{font-size:22px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.log{margin:0;padding-left:18px;line-height:1.8;font-size:14px}.log b{font-variant-numeric:tabular-nums;margin-right:6px}
@media (max-width:1000px){.split{grid-template-columns:1fr}.qcard{position:static}.cols3{grid-template-columns:1fr}}
'''

def page(title, desc, body, app_js, extra_css=''):
    return ('<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<title>' + title + '</title>\n<meta name="description" content="' + desc + '">\n'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap">\n'
            '<style>\n' + BASE_CSS + extra_css + '\n/* ── 공통 부품 cgg-j4 1.13.2 (그대로) ── */\n' + CSS + '\n</style>\n</head><body>\n'
            '<div class="cgg-app" id="app"><header class="cgg-hdr"><div class="cgg-top" id="top"></div><nav class="cgg-nav" id="nav"></nav></header>\n'
            '<main class="cgg-main">' + body + '</main><nav class="cgg-tbar" id="tbar"></nav></div>\n'
            '<script>\n/* 공통 부품 cgg-j4 1.13.2 (그대로) */\n' + JS + '\n</script>\n<script>\n' + COMMON_JS + app_js + '\n</script>\n</body></html>\n')

A_BODY = '<div class="demo" id="demo"></div><div id="hd"></div><div id="band"></div><div id="kp"></div><div id="now"></div><div id="tb"></div><div id="hp"></div>'
B_BODY = '<div class="demo" id="demo"></div><div id="hd"></div><div id="band"></div><div id="kp"></div><div class="split"><div id="queue"></div><div id="detail"></div></div><div id="tb"></div><div id="hp"></div>'

files = [
  ('1_차곳간_체크_전산등록_시안A_한화면진행판.html', page('전산 등록 시안 A', '차곳간 체크 «전산 등록» 시안 A — 한 화면 진행판(진행 칸 + 번호 확인 + 대기열 표)', A_BODY, A_JS)),
  ('2_차곳간_체크_전산등록_시안B_대기열과전산카드.html', page('전산 등록 시안 B', '차곳간 체크 «전산 등록» 시안 B — 왼쪽 대기열 + 오른쪽 전산 카드 셋 + 기록', B_BODY, B_JS, B_CSS)),
]
for name, html in files:
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(html)
z = os.path.join(OUT, '차곳간_체크_전산등록_시안_묶음.zip')
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for name, _ in files: zf.write(os.path.join(OUT, name), name)
print('ok', [n for n, _ in files])
