"""딜러앱 화면 d2.3(운영 중) → d3.0(J안) 새 판을 만든다. 원본은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.0.py
결과: 딜러/3_딜러앱_화면_d3.0/ (index.html + 아이콘 · manifest 그대로 복사)
바꾸는 것: 모양(J안 4판 규격) · 홈(할 일 3 · 숫자 4 — 가안) · 아래 탭(홈 · 내 차 · 알림 · 청구서 · 전체) · 내 차 목록(공통 열 차례) · PC 넓은 화면
안 바꾸는 것: 로그인 · 동의 · 서버 연결(dealer-api) · 차 상세 기록 · 알림 · 청구서 · 카히스토리 · 내 정보의 내용
안 넣는 것: 개인정보 · 차량 매칭 새 화면 (보안 방 검토 전)"""
import os, shutil
ROOT = "/home/user/chagotgan/딜러"
SRCDIR = ROOT + "/인수인계/딜러앱_원본_2026-10-14/3_딜러앱_화면_d2.3"
OUTDIR = ROOT + "/3_딜러앱_화면_d3.0"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d2.3 (2026-10-11)", "<!-- 차곳간 딜러앱 화면 · 판 d3.0 (2026-10-14, J안 4판 · 숫자·할 일은 가안) · 바탕 d2.3 (2026-10-11)")
rep('var VER="d2.3";', 'var VER="d3.0";')

# 2) 모양 — J안 4판 값으로 덮어쓰기 (원래 규칙은 그대로 두고 뒤에서 덮음)
CSS = r'''
/* ================= d3.0 — J안 4판 (디자인/01_J안_제품별_시안_기준.md 4-1장) ================= */
:root{--bg:#F3F5F8;--card:#FFFFFF;--ink:#101828;--sub:#667085;--line:#EAECF0;--hov:#F7F9FC;--tabon:#E8F1FC;
  --run:#1668C4;--run-bg:#E6F0FB;--done:#1E9E5A;--done-bg:#E4F5EC;--chk:#B26B00;--chk-bg:#FFF2DD;--stop:#D64545;--stop-bg:#FDE8E8;
  --shadow:0 1px 2px rgba(16,24,40,.04),0 2px 8px rgba(16,24,40,.05);--outer:#E4E9F0}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0A1628;--card:#122238;--ink:#E7EEF7;--sub:#9DB0C8;--line:#22385A;--hov:#16304F;--tabon:#16304F;
  --run:#6FA8EC;--run-bg:#16304F;--done:#5CD19A;--done-bg:#113A2A;--chk:#F1B45A;--chk-bg:#3D2B0A;--stop:#FF8A8A;--stop-bg:#431818;--outer:#060E1A}}
:root[data-theme="dark"]{--bg:#0A1628;--card:#122238;--ink:#E7EEF7;--sub:#9DB0C8;--line:#22385A;--hov:#16304F;--tabon:#16304F;
  --run:#6FA8EC;--run-bg:#16304F;--done:#5CD19A;--done-bg:#113A2A;--chk:#F1B45A;--chk-bg:#3D2B0A;--stop:#FF8A8A;--stop-bg:#431818;--outer:#060E1A}
body{font-size:13.5px}
/* 폰 — 남색 윗줄 48 + 아래 탭바 56 */
.top{min-height:48px;padding:calc(6px + env(safe-area-inset-top,0px)) 12px 6px;gap:8px}
.top .logo{width:26px;height:26px}
.top .t1{font-size:15px}
.top .t2{font-size:11.5px}
.top .bell{height:30px;padding:0 10px;border-radius:8px;font-size:12px}
.body{padding:12px;gap:10px}
.tabs{min-height:56px;padding:4px 2px calc(4px + env(safe-area-inset-bottom,0px))}
.tabs button{font-size:10.5px;gap:3px;color:#98A2B3}
.tabs button svg{width:20px;height:20px}
.tabs button[aria-current="page"]{color:var(--navy);font-weight:700}
:root[data-theme="dark"] .tabs button[aria-current="page"]{color:var(--sky)}
.tabs .pc{display:none}
.card{border-radius:14px;padding:12px}
.btn{border-radius:10px;min-height:38px;padding:10px 14px;font-size:14px}
.chips button{padding:6px 12px;font-size:12.5px}
.chips button[aria-pressed="true"]{background:var(--blue)}
/* 상태 칩 — 공통 네 가지 색만. 단계 이름은 그대로 */
.pill{border-radius:6px;padding:3px 8px;font-size:11.5px}
.p-in,.p-work,.p-out{background:var(--run-bg);color:var(--run)}
.p-arr{background:var(--chk-bg);color:var(--chk)}
.p-fin{background:var(--done-bg);color:var(--done)}
/* 말하는 제목 */
.hello small{display:block;font-size:11.5px;color:var(--sub);margin-bottom:3px}
.hello h1{margin:0;font-size:19px;font-weight:900;letter-spacing:-.5px;line-height:1.35}
.hello h1 em{font-style:normal;color:var(--blue)}
.hello p{margin:3px 0 0;font-size:12.5px;color:var(--sub)}
/* 할 일 — 폰은 카드 하나에 세 줄 */
.acts{display:flex;flex-direction:column;background:var(--card);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}
.act{display:flex;align-items:center;gap:10px;padding:10px 12px;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;width:100%}
.act:last-child{border-bottom:0}
.act:hover{background:var(--hov)}
.act .ico{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;flex:none}
.act .ico svg{width:16px;height:16px}
.act .ico.run{background:var(--run-bg);color:var(--run)} .act .ico.chk{background:var(--chk-bg);color:var(--chk)}
.act .ico.stop{background:var(--stop-bg);color:var(--stop)} .act .ico.done{background:var(--done-bg);color:var(--done)}
.act .tx{min-width:0;flex:1}
.act b{display:block;font-size:13.5px}
.act small{display:block;font-size:11.5px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.act .ar{color:#98A2B3;font-size:15px}
/* 숫자 카드 — 폰 2×2 */
.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.kpi{position:relative;background:var(--card);border-radius:14px;box-shadow:var(--shadow);padding:11px 12px;border:0;text-align:left}
.kpi small{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--sub);padding-right:48px}
.kpi small i{width:8px;height:8px;border-radius:3px;flex:none}
.kpi strong{display:block;font-size:19px;font-weight:900;letter-spacing:-.4px;margin-top:4px;font-variant-numeric:tabular-nums}
.kpi strong em{font-style:normal;font-size:11.5px;color:var(--sub);font-weight:700;margin-left:3px}
.kpi .tr{display:block;font-size:11px;font-weight:700;color:var(--done);margin-top:1px;min-height:14px}
.kpi .tr.dn{color:var(--stop)} .kpi .tr span{color:var(--sub);font-weight:500}
.kpi svg.sp{position:absolute;width:44px;height:16px;right:10px;top:12px}
/* 내 차 — 상태 탭 · 목록 */
.lcard{background:var(--card);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}
.stabs{display:flex;gap:2px;padding:0 8px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
.stabs button{flex:none;border:0;background:none;font-size:13px;color:var(--sub);padding:10px 7px;border-bottom:2px solid transparent;margin-bottom:-1px}
.stabs button b{margin-left:3px;font-size:11px;background:var(--bg);border-radius:999px;padding:0 6px;color:var(--sub)}
.stabs button[aria-pressed="true"]{color:var(--blue);border-bottom-color:var(--blue);font-weight:700}
.stabs button[aria-pressed="true"] b{background:var(--tabon);color:var(--blue)}
.ltools{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
.ltools .search{flex:1;border-radius:10px;padding:0 10px}
.ltools .search input{padding:9px 0}
.mrow{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--line)}
.mrow:last-child{border-bottom:0}
.mrow input{width:18px;height:18px;margin:0;accent-color:var(--blue)}
.mrow .go{border:0;background:none;text-align:left;padding:0;min-width:0;display:contents}
.mrow .t{min-width:0;cursor:pointer}
.mrow .t b{font-size:13.5px;font-weight:700}
.mrow .t b span{font-weight:500;color:var(--sub);font-size:12.5px;margin-left:6px}
.mrow .t small{display:block;font-size:11.5px;color:var(--sub);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mrow .r{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px;cursor:pointer}
.mrow .r b{font-size:13.5px;font-variant-numeric:tabular-nums}
.mbar{display:grid;grid-template-columns:repeat(4,10px);gap:2px}
.mbar i{height:3px;border-radius:2px;background:var(--line)} .mbar i.on{background:var(--blue)}
.lfoot{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--line);font-size:12.5px;color:var(--sub)}
.lfoot .btn{width:auto;margin-left:auto}
.lempty{padding:18px 14px;color:var(--sub);line-height:1.6}
.tbl{display:none}
.help{background:var(--card);border-radius:14px;box-shadow:var(--shadow);padding:0 12px;font-size:12.5px;color:var(--sub)}
.help summary{padding:12px 0;font-weight:700;color:var(--ink);cursor:pointer}
.help p{margin:0 0 12px;line-height:1.6}
.more{display:flex;flex-direction:column;background:var(--card);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}
.more button{display:flex;align-items:center;gap:12px;border:0;border-bottom:1px solid var(--line);background:none;padding:14px;font-size:14px;text-align:left}
.more button:last-child{border-bottom:0}
.more button svg{width:20px;height:20px;color:var(--sub)}
.more button span{margin-left:auto;color:#98A2B3}

/* PC — 넓은 화면은 왼쪽 남색 메뉴 + 본문 (한 파일이 PC · 폰 함께) */
@media (min-width:1024px){
  body{padding:0}
  .phone{max-width:none;height:100vh;height:100dvh;border-radius:0;box-shadow:none;display:grid;grid-template-columns:232px minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr)}
  .phone>.top{grid-column:2;background:var(--card);color:var(--ink);box-shadow:0 1px 0 var(--line);padding:12px 32px;min-height:64px}
  .phone>.top .t1{font-size:16px} .phone>.top .t2{color:var(--sub)}
  .phone>.top .logo{display:none}
  .phone>.top .back{color:var(--ink)}
  .phone>.top .bell{background:var(--bg);color:var(--ink);height:36px;padding:0 14px;font-size:13px}
  .phone>div[style*="warnbg"]{grid-column:2}
  .phone>.body{grid-column:2;padding:24px 32px 40px;gap:16px}
  .phone>.body>*{max-width:1180px;width:100%}
  .tabs{grid-column:1;grid-row:1/4;display:flex;flex-direction:column;align-items:stretch;gap:2px;background:var(--navy);border:0;padding:20px 12px;order:-1}
  .tabs:before{content:"차곳간 딜러";color:#fff;font-weight:900;font-size:16px;padding:0 12px 18px;letter-spacing:-.3px}
  .tabs button{flex-direction:row;justify-content:flex-start;gap:12px;font-size:14px;color:#C9D6E6;padding:11px 12px;border-radius:10px}
  .tabs button svg{width:18px;height:18px}
  .tabs button[aria-current="page"],:root[data-theme="dark"] .tabs button[aria-current="page"]{background:rgba(143,201,242,.16);color:#fff}
  .tabs .pc{display:flex} .tabs .m{display:none}
  .hello h1{font-size:26px} .hello small{font-size:13px} .hello p{font-size:14px}
  .acts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;background:none;box-shadow:none;overflow:visible}
  .act{background:var(--card);border-radius:18px;box-shadow:var(--shadow);border:0;padding:16px 18px;gap:12px}
  .act .ico{width:40px;height:40px;border-radius:12px} .act .ico svg{width:20px;height:20px}
  .act b{font-size:14.5px} .act small{font-size:12.5px;white-space:normal}
  .kpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .kpi{border-radius:18px;padding:18px 20px}
  .kpi small{font-size:13px;padding-right:80px} .kpi strong{font-size:30px;margin-top:8px} .kpi strong em{font-size:14px}
  .kpi .tr{font-size:12.5px;margin-top:4px} .kpi svg.sp{width:72px;height:26px;right:18px;top:18px}
  .lcard,.help,.more,.card{border-radius:18px}
  .mlist{display:none} .tbl{display:block;overflow-x:auto}
  .tbl table{width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed;min-width:860px}
  .tbl th{height:40px;padding:0 14px;text-align:left;font-size:12.5px;color:var(--sub);border-bottom:1px solid var(--line);white-space:nowrap}
  .tbl td{height:50px;padding:0 14px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tbl tbody tr{cursor:pointer} .tbl tbody tr:hover td{background:var(--hov)}
  .tbl .n{text-align:right;font-variant-numeric:tabular-nums} .tbl .c{text-align:center}
  .tbl th:first-child,.tbl td:first-child{padding:0;text-align:center;overflow:visible}
  .tbl input{width:18px;height:18px;accent-color:var(--blue)}
  .toast{left:auto;right:32px;bottom:32px;width:360px}
  .sheet-wrap{position:fixed;align-items:center;justify-content:center}
  .sheet{max-width:440px;border-radius:20px}
}
'''
rep("</style>", CSS + "</style>")

# 3) 아이콘 몇 개 더 (홈 · 전체 · 출고 · 시계 · 확인)
rep("var ICON={\n", """var ICON={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8M7 13l5-5 5 5M5 4h14"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
""")

# 4) 단계 칩 — 도착은 «확인 필요» 색, 상품화 완료는 «완료» 색
rep('var PILL={"입고":"p-in","작업 중":"p-work","출고":"p-out","도착":"p-done"};',
    'var PILL={"입고":"p-in","작업 중":"p-work","출고":"p-out","도착":"p-arr"};')
rep('<span class="pill \'+(done?"p-done":PILL[c.stage])+\'">', '<span class="pill \'+(done?"p-fin":PILL[c.stage])+\'">', 2)
rep("(done?\"완료\":esc(c.stage))", "(done?\"상품화 완료\":esc(c.stage))", 2)

# 5) 처음 탭 = 홈, 고른 줄 기억
rep('view:"login",step:1,tab:"cars",', 'view:"login",step:1,tab:"home",sel:{},')
rep('function enterMain(){S.view="main";S.tab="cars";', 'function enterMain(){S.view="main";S.tab="home";')

# 6) 아래 탭: 홈 · 내 차 · 알림 · 청구서 · 전체 (PC 왼쪽 메뉴는 6개 모두)
rep('''  var T=[["cars","내 차","car"],["noti","알림","bell"],["bills","청구서","bill"],["hist","카히스토리","hist"],["me","내 정보","me"]];
  return '<nav class="tabs">'+T.map(function(t){return '<button data-act="tab" data-v="'+t[0]+'" '+(S.tab===t[0]&&S.view==="main"?'aria-current="page"':'')+'>'+ICON[t[2]]+t[1]+'</button>';}).join("")+'</nav>';''',
'''  var T=[["home","홈","home",""],["cars","내 차","car",""],["noti","알림","bell",""],["bills","청구서","bill",""],["hist","카히스토리","hist","pc"],["me","내 정보","me","pc"],["more","전체","more","m"]];
  var cur=S.view==="car"?"cars":S.tab, inMore=(cur==="hist"||cur==="me");
  return '<nav class="tabs" aria-label="메뉴">'+T.map(function(t){var on=cur===t[0]||(t[0]==="more"&&inMore);
    return '<button class="'+t[3]+'" data-act="tab" data-v="'+t[0]+'" '+(on?'aria-current="page"':'')+'>'+ICON[t[2]]+t[1]+'</button>';}).join("")+'</nav>';''')

# 7) 내 차 화면 — 공통 열 차례 (지금 위치 → 차량번호 → 차종 → 작업 → 마지막 기록 → 들어간 금액 → 단계)
i = s.index("function carsView(){"); j = s.index("function carView(){")
CARS = r'''/* ---------- d3.0 자료 계산 (서버에서 받은 내 차 기록만으로) ---------- */
function sod(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function isToday(iso){if(!iso)return false;var d=new Date(iso);return !isNaN(d)&&sod(d).getTime()===sod(new Date()).getTime();}
function daysAgo(iso){var d=new Date(iso);return isNaN(d)?0:Math.floor((Date.now()-d.getTime())/864e5);}
function weekStart(off){var t=sod(new Date()),w=(t.getDay()+6)%7;return new Date(t.getTime()-(w+7*(off||0))*864e5);}
function sumOf(plate){return (S.cars||[]).filter(function(x){return x.plate===plate;}).reduce(function(a,x){return a+(Number(x.total)||0);},0);}
function worksOf(c){return (c.works&&c.works.length)?c.works.join(", "):(c.outAt?"":"작업 대기");}
function lastAt(iso){return isToday(iso)?hm(iso):day(iso).split(" ")[0];}
function stageOf(c){return isDone(c)?"상품화 완료":c.stage;}
function nm2(c){return ((c.model||"").split(" ")[1]||c.model||c.plate);}
function names(L){return L.slice(0,2).map(function(c){return nm2(c);}).join(" · ")+(L.length>2?" 외 "+(L.length-2)+"대":"");}
function G(){
  var all=latest(),act=all.filter(function(c){return !isDone(c);});
  var ws=weekStart(0),pws=weekStart(1);
  var inW=function(a,b){var m={};(S.cars||[]).forEach(function(x){var d=new Date(x.inAt);if(d>=a&&(!b||d<b))m[x.plate]=1;});return Object.keys(m).length;};
  var spark=[6,5,4,3,2,1,0].map(function(k){var t=sod(new Date()).getTime()-k*864e5;
    return (S.cars||[]).filter(function(x){var d=new Date(x.inAt);return !isNaN(d)&&sod(d).getTime()===t;}).length;});
  return {all:all,
    work:act.filter(function(c){return c.stage==="작업 중";}),
    today:act.filter(function(c){return c.outAt&&isToday(c.outAt);}),
    wk:inW(ws),pwk:inW(pws,ws),spark:spark,
    arr:act.filter(function(c){return c.stage==="도착";}),
    moving:act.filter(function(c){return c.stage==="출고";}),
    slow:act.filter(function(c){return c.stage==="작업 중"&&daysAgo(c.inAt)>=3;})};
}
function spk(v,col){var mx=Math.max.apply(null,v.concat([1])),w=72,h=26;
  var p=v.map(function(y,i){return (i*w/(v.length-1)).toFixed(1)+","+(h-2-(y/mx)*(h-4)).toFixed(1);}).join(" ");
  return '<svg class="sp" viewBox="0 0 72 26" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+p+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round"/></svg>';}
function hello(small,h1,p){return '<div class="hello"><small>'+small+'</small><h1>'+h1+'</h1>'+(p?'<p>'+p+'</p>':'')+'</div>';}
function today(){var d=new Date();return (d.getMonth()+1)+"월 "+d.getDate()+"일 "+"일월화수목금토".charAt(d.getDay())+"요일";}

/* 홈 — 할 일 3가지 · 숫자 카드 4개 (둘 다 가안: 시안을 보고 대표님이 정함) */
function homeView(){
  if(S.cars===null)return '<div class="card" style="color:var(--sub);text-align:center">내 차를 불러오는 중…</div>';
  var g=G(),who=S.name?esc(S.name)+" 님":"딜러님";
  var h1=!g.all.length?'아직 내 번호로 맡겨진 차가 없어요'
    :g.arr.length?'도착한 차 <em>'+g.arr.length+'대</em>가 완료를 기다려요'
    :g.work.length?'작업 중인 차 <em>'+g.work.length+'대</em>가 있어요':'오늘 확인할 차가 없어요';
  var A=[
    g.arr.length?["chk","ok","도착한 차 "+g.arr.length+"대 «상품화 완료» 누르기",names(g.arr)+" · 확인하고 눌러 주세요","도착"]
                :["done","ok","«상품화 완료»를 기다리는 차가 없어요","도착한 차가 생기면 여기에 알려 드려요","도착"],
    g.moving.length?["run","out","출고된 차 "+g.moving.length+"대 받을 준비",g.moving.map(function(c){return nm2(c)+" → "+(c.dest||c.where);}).slice(0,2).join(" · "),"출고"]
                   :["done","out","이동 중인 차가 없어요","업체에서 출고되면 여기에 알려 드려요","출고"],
    g.slow.length?["stop","clock","작업이 3일 넘게 걸리는 차 "+g.slow.length+"대",g.slow.slice(0,2).map(function(c){return nm2(c)+"("+c.where+")";}).join(" · ")+" · 업체에 확인해 보세요","작업 중"]
                 :["done","clock","3일 넘게 걸리는 차가 없어요","작업이 늦어지면 여기에 알려 드려요","작업 중"]];
  var d=g.wk-g.pwk;
  var K=[["작업 중인 차",g.work.length,"#1668C4","","작업 중"],["오늘 출고·도착",g.today.length,"#4C93E0","","전체"],
         ["이번 주 입고된 차",g.wk,"#0B2545",(d>=0?"+":"−")+Math.abs(d),"전체"],["완료 기다리는 차",g.arr.length,"#E08A00","","도착"]];
  return hello('안녕하세요, '+who+' · '+today(),h1,'')+
   '<div class="acts">'+A.map(function(a){return '<button class="act" data-act="go" data-v="'+a[4]+'"><span class="ico '+a[0]+'">'+ICON[a[1]]+'</span><span class="tx"><b>'+esc(a[2])+'</b><small>'+esc(a[3])+'</small></span><span class="ar">→</span></button>';}).join("")+'</div>'+
   '<div class="kpis">'+K.map(function(k,i){return '<button class="kpi" data-act="go" data-v="'+k[4]+'"><small><i style="background:'+k[2]+'"></i>'+k[0]+'</small>'+(i===2?spk(g.spark,k[2]):'')+
     '<strong>'+k[1]+'<em>대</em></strong><span class="tr'+(k[3].charAt(0)==="−"?' dn':'')+'">'+(k[3]?k[3]+' <span>지난주보다</span>':'')+'</span></button>';}).join("")+'</div>'+
   (g.all.length?carsList(g.all.slice(0,5),true):'<div class="card" style="color:var(--sub);line-height:1.6">업체에 차를 맡길 때 <b>'+esc(telFmt(S.phone))+'</b> 번호를 알려 주세요. 그 번호로 들어온 차가 여기에 보여요.</div>')+
   '<details class="help"><summary>이 화면 사용법</summary><p>맨 위 문장과 할 일 세 줄이 오늘 먼저 볼 것을 알려 드려요. 줄이나 숫자를 누르면 «내 차»에서 그 차들만 모아 보여 줘요.</p></details>';
}
/* 전체 메뉴 (폰) */
function moreView(){
  var M=[["home","홈","home"],["cars","내 차","car"],["noti","알림","bell"],["bills","청구서","bill"],["hist","카히스토리","hist"],["me","내 정보","me"]];
  return '<div class="more">'+M.map(function(m){return '<button data-act="tab" data-v="'+m[0]+'">'+ICON[m[2]]+esc(m[1])+'<span>›</span></button>';}).join("")+'</div>';
}
/* 내 차 목록 — 폰은 목록, PC는 표 (열 차례 같음) */
function carsList(list,mini){
  var sel=S.sel,n=list.filter(function(c){return sel[c.key];}).length;
  var rows=list.map(function(c){var st=stageOf(c),sm=sumOf(c.plate),k=esc(c.key),cls=isDone(c)?"p-fin":PILL[c.stage];
    return {m:'<div class="mrow"><input type="checkbox" data-sel="'+k+'"'+(sel[c.key]?' checked':'')+' aria-label="'+esc(c.plate)+' 고르기">'+
      '<div class="t" data-act="car" data-s="'+esc(c.shop)+'" data-v="'+esc(c.id)+'"><b>'+esc(c.where)+'<span>'+esc(c.plate)+'</span></b><small>'+esc([c.model||"차종 없음",worksOf(c),lastAt(c.at)].filter(Boolean).join(" · "))+'</small></div>'+
      '<div class="r" data-act="car" data-s="'+esc(c.shop)+'" data-v="'+esc(c.id)+'"><b>'+(sm?won(sm):"—")+'</b><span class="pill '+cls+'" style="margin:0">'+esc(st)+'</span><span class="mbar">'+STAGES.map(function(_,i){return '<i class="'+(isDone(c)||i<=stepOf(c)?'on':'')+'"></i>';}).join("")+'</span></div></div>',
     t:'<tr data-act="car" data-s="'+esc(c.shop)+'" data-v="'+esc(c.id)+'"><td class="c" data-stop><input type="checkbox" data-sel="'+k+'"'+(sel[c.key]?' checked':'')+' aria-label="'+esc(c.plate)+' 고르기"></td>'+
      '<td><b>'+esc(c.where)+'</b></td><td>'+esc(c.plate)+'</td><td>'+esc(c.model||"차종 없음")+'</td><td>'+esc(worksOf(c))+'</td><td>'+esc(lastAt(c.at))+'</td>'+
      '<td class="n">'+(sm?won(sm):"—")+'</td><td class="c"><span class="pill '+cls+'" style="margin:0">'+esc(st)+'</span></td></tr>'};});
  return '<div class="lcard">'+(mini?'<div class="ltools" style="font-weight:700">최근 내 차<button class="btn sec2" data-act="tab" data-v="cars" style="width:auto;margin-left:auto">모두 보기</button></div>':'')+
   '<div class="mlist">'+rows.map(function(r){return r.m;}).join("")+'</div>'+
   '<div class="tbl"><table><colgroup><col style="width:52px"><col style="width:200px"><col style="width:120px"><col><col><col style="width:110px"><col style="width:130px"><col style="width:120px"></colgroup>'+
   '<thead><tr><th></th><th>지금 위치</th><th>차량번호</th><th>차종</th><th>작업</th><th>마지막 기록</th><th class="n">들어간 금액</th><th class="c">단계</th></tr></thead><tbody>'+rows.map(function(r){return r.t;}).join("")+'</tbody></table></div>'+
   (mini?'':'<div class="lfoot">총 '+list.length+'대<button class="btn pri" data-act="finishSel"'+(n?'':' disabled')+'>선택한 차 상품화 완료'+(n?' ('+n+')':'')+'</button></div>')+'</div>';
}
function carsView(){
  if(S.cars===null)return '<div class="card" style="color:var(--sub);text-align:center">내 차를 불러오는 중…</div>';
  var g=G(),all=g.all,F=["전체"].concat(STAGES);
  var q=S.q.replace(/\s/g,"");
  var list=all.filter(function(c){return (S.filter==="전체"||stageOf(c)===S.filter)&&(!q||c.plate.replace(/\s/g,"").indexOf(q)>=0||(c.model||"").replace(/\s/g,"").indexOf(q)>=0||(c.where||"").replace(/\s/g,"").indexOf(q)>=0);});
  var cnt=function(f){return all.filter(function(c){return f==="전체"||stageOf(c)===f;}).length;};
  var h=hello('내 차 · '+today(),'작업 중인 차 <em>'+g.work.length+'대</em>, 도착한 차 <em>'+g.arr.length+'대</em>가 있어요','업체에 맡긴 내 차가 지금 어디 있는지, 어디까지 됐는지 확인해요.')+
   '<div class="lcard"><div class="stabs">'+F.map(function(f){return '<button data-act="filter" data-v="'+f+'" aria-pressed="'+(S.filter===f)+'">'+f+'<b>'+cnt(f)+'</b></button>';}).join("")+'</div>'+
   '<div class="ltools"><label class="search">'+ICON.hist.replace('<svg','<svg width="16" height="16"')+'<input id="q" placeholder="차량번호 · 차종 · 업체 찾기" value="'+esc(S.q)+'" aria-label="차 검색"></label></div></div>';
  if(!all.length)return h+'<div class="card lempty">아직 내 번호로 맡겨진 차가 없어요.<br>업체에 차를 맡길 때 <b>'+esc(telFmt(S.phone))+'</b> 번호를 알려 주세요.</div>';
  if(!list.length)return h+'<div class="card lempty">찾는 차가 없어요.</div>';
  return h+carsList(list,false)+
   '<details class="help"><summary>이 화면 사용법</summary><p>업체가 입고 · 출고를 찍으면 여기에 바로 보여요. 차를 누르면 사진과 지나온 기록(최근이 위)이 나와요. 내 상사에 도착한 차는 골라서 «선택한 차 상품화 완료»를 눌러 주세요. 금액이 «—»이면 업체가 아직 금액을 넣지 않은 거예요.</p></details>';
}
'''
s = s[:i] + CARS + s[j:]

# 8) 그리기 연결 — 홈 · 전체 메뉴
rep('var TITLES={cars:"내 차",noti:"알림",bills:"청구서",hist:"카히스토리",me:"내 정보"};',
    'var TITLES={home:"홈",cars:"내 차",noti:"알림",bills:"청구서",hist:"카히스토리",me:"내 정보",more:"전체 메뉴"};')
rep('var sub=S.tab==="cars"?', 'var sub=(S.tab==="cars"||S.tab==="home")?')
rep('var V={cars:carsView,noti:notiView,bills:billsView,hist:histView,me:meView}[S.tab]||carsView;',
    'var V={home:homeView,cars:carsView,noti:notiView,bills:billsView,hist:histView,me:meView,more:moreView}[S.tab]||homeView;')
rep('h=topBar(TITLES[S.tab]||"내 차",sub)', 'h=topBar(TITLES[S.tab]||"홈",sub)')
rep('if(S.cars===null)S.cars=[];render();toast(e.message);});', 'if(S.cars===null)S.cars=[];render();toast(e.message);});', 1)

# 9) 동작 — 할 일 · 숫자 눌러 내 차로, 줄 고르기, 고른 차 한 번에 완료
rep('''  if(a==="filter"){S.filter=v;render();return;}''',
'''  if(a==="filter"){S.filter=v;render();return;}
  if(a==="go"){S.filter=v||"전체";S.q="";S.tab="cars";S.view="main";render();var b2=$("bd");if(b2)b2.scrollTop=0;return;}
  if(a==="finishSel"){var ks=Object.keys(S.sel).filter(function(k){return S.sel[k];});
    var L=latest().filter(function(c){return ks.indexOf(c.key)>=0&&!isDone(c);});if(!L.length)return;
    S.sheet="fin";S.finL=L;render();return;}
  if(a==="finishDo"){var L2=S.finL||[];S.sheet=null;render();
    L2.reduce(function(p,c){return p.then(function(){return api("finish",[c.shop,c.id]).then(function(){S.done[c.key]=1;});});},Promise.resolve())
      .then(function(){S.sel={};render();toast(L2.length+"대를 «상품화 완료»로 표시했어요");},function(e){render();toast(e.message);});return;}''')
rep('''  if(k==="logout")inner=''', '''  if(k==="fin"){var FL=S.finL||[],fs=FL.reduce(function(a,c){return a+sumOf(c.plate);},0);
    inner='<h3>상품화 완료로 표시할까요?</h3><div class="split"><span class="h">차</span><span>'+esc(FL.map(function(c){return c.plate;}).slice(0,3).join(", "))+(FL.length>3?' 외 '+(FL.length-3)+'대':'')+'</span>'+
    '<span class="h">대수</span><span>'+FL.length+'대</span><span class="h tot">들어간 금액 합계</span><span class="tot num">'+(fs?won(fs):"—")+'</span></div>'+
    '<div class="two"><button class="btn sec2" data-act="close">취소</button><button class="btn pri" data-act="finishDo">완료로 표시</button></div>';}
  if(k==="logout")inner=''')
# 고르기 칸 (줄 누르기와 따로)
rep('''document.addEventListener("click",function(e){
  var el=e.target.closest("[data-act]");if(!el)return;''', '''document.addEventListener("change",function(e){var k=e.target.getAttribute&&e.target.getAttribute("data-sel");if(k==null)return;
  S.sel[k]=e.target.checked;render();});
document.addEventListener("click",function(e){
  if(e.target.closest("[data-sel]")||e.target.closest("td[data-stop]"))return;
  var el=e.target.closest("[data-act]");if(!el)return;''')

# 10) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
