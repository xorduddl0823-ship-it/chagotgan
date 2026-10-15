"""워시 v121 → 워시 v122 새 판. 디자인 방 완성 기준(디자인/완성기준/00_공통 · 01_워시) · 공통 부품 cgg-j4 1.4 마무리 + 홈페이지 결제 받기
쓰는 법: 만들기_워시_v112 → … → v121 → v122 차례로 (`워시/도구/`)
바꾸는 것 (총괄 전달 2026-10-15 ①~⑥):
  ① 공통 부품 cgg-j4 1.2 → 1.5 동결판 (글자 그대로 · 1.5 보안 규칙: render 안 씀 · 자료가 바뀌면 고른 줄 비움 · 일괄은 줄 id) · 홈 숫자 카드 CGG.kpis · 도움 카드 CGG.help
  ② 휴지통 네 곳 → 사람 버튼 ▾ 한 곳 (머리말 버튼 · 설정 탭은 이미 뺌 → 마이페이지 칸 · 더보기 창도 뺌, 안내 글도 고침)
  ③ «시연 모드» 주황 띠 → 체험 띠 모양(cgg-trial, 그림 문자 없음)
  ④ 대표 목록(일감 › 입출고 내역) 표 → CGG.table (표 완성 기준 10가지) · 청구서 표에 «입금 기한» 열
     머리말 «배치» 버튼 → 사람 버튼 ▾ › 상단 버튼 위치 · 창 층을 var(--z-…) 로
  ⑤ 홈페이지 결제 받기 — 저장 칸 cgg_buy(요금제 코드)가 있으면 지우고, 대표면 그 요금제로 «이용요금» 창을 엶
  ⑦ 체험판 = 서버 sb13 «결제 대기» 업체(lockInfo state "pay"): 띠 · 잠금(자료 가져가기 · 밖으로 보내기) 자물쇠 ·
     «편한 기능 3번»은 서버 trialUse 로 셈 (이름 18개는 서버와 같게)
  + «버튼» 뒤 토씨 바로잡기(버튼가 → 버튼이 …) · 스크립트 안 \\u 그림 문자도 빼기
운영 v111 · v112~v121 은 덮어쓰지 않는다. 서버 주소 · 창구 · 저장 방식 · 손님에게 나가는 알림 글은 그대로.
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v121.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v122.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
assert 'version:"cgg-j4 1.5"' in JS, "공통 부품이 1.5 가 아님"
DONE = open(os.path.join(HERE, "cgg-j4_워시_완성.css"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v121 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v122 · UI 3.0 · 2026-10-15";')

# ───── ① 공통 부품 1.2 → 1.4 · 완성 CSS 새로 ─────
a = s.index('<style id="cgg-j4">\n') + len('<style id="cgg-j4">\n'); b = s.index('\n</style>', a)
s = s[:a] + CSS + s[b:]
rep('<!-- ===== 차곳간 공통 부품 cgg-j4 1.2 (디자인/공통 — 글자 그대로) ===== -->', '<!-- ===== 차곳간 공통 부품 cgg-j4 1.5 (디자인/공통 — 글자 그대로 · 동결판) ===== -->')
mark = '/* 차곳간 공통 부품 cgg-j4 1.2 (디자인/공통/cgg-j4.js — 글자 그대로) */\n'
a = s.index(mark); b = s.index('\n</script>', a)
s = s[:a] + '/* 차곳간 공통 부품 cgg-j4 1.5 (디자인/공통/cgg-j4.js — 글자 그대로) */\n' + JS + s[b:]
EXTRA = """
/* ── v122 덧붙임 ── 창 · 알림 글 층은 이름으로 (완성 기준 00 · 4장) */
.sheetbg,.askbg{z-index:var(--z-dialog)} .sheet,.askbox{z-index:calc(var(--z-dialog) + 1)} #toast,.toast{z-index:var(--z-toast)}
/* 시연 띠 — 체험 띠 모양 (버튼이 많아 줄을 바꿈) */
#demoBar.cgg-trial{flex-wrap:wrap;margin:0 0 16px} #demoBar .go{height:36px;font-size:13px}
@media (max-width:600px){ #demoBar .go{width:auto;flex:1 1 calc(50% - 6px)} }
/* 체험판(결제 대기)일 때는 옛 잠금 띠 대신 체험 띠 하나만 */
body.jpay #ccwLockBar{display:none!important}
/* 머리말 «배치» 버튼은 사람 버튼 ▾ › 상단 버튼 위치로 */
#btnArrange{display:none!important}
#jLT{margin:0 0 18px} .jhelpwrap{margin-top:18px}
/* 대표 목록 표 — 공통 부품 예시(디자인/공통/예시.html)와 계산된 모양이 같게: 워시 옛 규칙(글자 · 줄 간격 · 선택 칸 너비)이 끼어들지 않게 */
#jLT{font-size:15px;line-height:normal}
#jLT select{width:auto;min-height:0}
#jLT td:not(.n):not(.c){text-align:start}
#jLT input[type=checkbox]:not(:checked){border-color:var(--ln2)}
"""
a = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b = s.index('</style>', a)
s = s[:a] + DONE + EXTRA + s[b:]

# ───── 토씨 · 스크립트 안 그림 문자 (공통 부품 글자는 그대로) ─────
P = [("버튼가", "버튼이"), ("버튼를", "버튼을"), ("버튼는", "버튼은"), ("버튼와", "버튼과"), ("버튼로", "버튼으로")]
ESC = re.compile(r"\\ud83[cd]\\ud[c-f][0-9a-f]{2}(?:\\ufe0f)?(?: )?|\\u2(?:6[0-9a-f]{2}|7[0-9a-f]{2})(?:\\ufe0f)?(?: )?", re.I)
KEEPESC = {"\\u2713", "\\u2714", "\\u2715", "\\u2605", "\\u2606"}   # ✓ ✔ ✕ ★ ☆ 는 기호라 둠
def fix(t):
    for o, n in P: t = t.replace(o, n)
    return ESC.sub(lambda m: m.group(0) if m.group(0)[:6].lower() in KEEPESC else "", t)
a = s.index('<style id="cgg-j4">'); b = s.index('</style>', a) + 8
c = s.index('/* 차곳간 공통 부품 cgg-j4 1.5 (디자인/공통/cgg-j4.js'); d = s.index('\n</script>', c)
out, pos = [], 0
for x, y in sorted([(a, b), (c, d)]):
    out.append(fix(s[pos:x])); out.append(s[x:y]); pos = y
out.append(fix(s[pos:])); s = "".join(out)

# ───── ② 휴지통 — 사람 버튼 ▾ 한 곳만 ─────
rep('''  if (setSubFor().some(function (t) { return t[0] === "trash"; }))
  h += '<div class="mcard"><div class="mh"><b>휴지통</b><span>지운 자료를 되돌려요</span></div>' +
    '<div class="mrow2"><button class="btn" data-mp="trash">휴지통 열기' + (trN ? (' (' + trN + '건)') : '') + '</button></div></div>';''',
    '''  /* v122: 휴지통은 사람 버튼 ▾ 한 곳만 (완성 기준 00 · 3장) */''')
rep("""     (isOwner()?'<button class="btn" data-m="trash">\\ud734\\uc9c0\\ud1b5</button>':"")+\n""", "")
s = s.replace("(설정 → 휴지통에서 되돌릴 수 있습니다)", "(사람 버튼 ▾ › 휴지통에서 되돌릴 수 있어요)")

# ───── ③ 시연 모드 띠 → 체험 띠 모양 ─────
a = s.index('<div id="demoBar" hidden'); b = s.index('<div id="arrBar" hidden>', a)
s = s[:a] + '''<div id="demoBar" class="cgg-trial" hidden role="note">
  <span class="tag">시연</span>
  <span class="tx"><b>시연 모드 — 업체 설명용 화면이에요</b><small>여기 자료는 실제 장부와 따로 보관되고, 문자 · 알림톡 · 세금계산서는 실제로 나가지 않아요.</small></span>
  <button type="button" class="go" id="dmSeed">샘플 자료 넣기</button>
  <button type="button" class="go" id="dmWipe">시연 자료 모두 지우기</button>
  <button type="button" class="go" id="dmHelp">설명 순서 보기</button>
  <button type="button" class="go" id="dmAdmin">시연 관리자 설정</button>
</div>
''' + s[b:]

# ───── ④ 머리말 «배치» → 사람 버튼 ▾ › 상단 버튼 위치 ─────
rep('''  L.push({key:"lay",icon:"pc",label:"화면 설정",note:(window.CGG?CGG.layout.name():"")});''',
    '''  L.push({key:"lay",icon:"pc",label:"화면 설정",note:(window.CGG?CGG.layout.name():"")});
  if(S.mode==="pc"&&window.innerWidth>600)L.push({key:"arr",icon:"gear",label:"상단 버튼 위치"});''')
rep('''  else if(k==="lay")screenSheet();''', '''  else if(k==="lay")screenSheet();
  else if(k==="arr")$("btnArrange").click();''')

# ───── ④ 대표 목록 표 — CGG.table (표 완성 기준 10가지) ─────
a = s.index('  var tb=$("jLTabs");'); b = s.index('\n}', s.index('tb.querySelectorAll("[data-st]")', a)) + 2
s = s[:a] + '  var old=$("jLTabs");if(old)old.remove();\n}' + s[b:]
rep('function renderLedger(){\n  renderLateTable();', r'''/* v122: 대표 목록 — 공통 부품 CGG.table. 열: 선택 → 상사명 → 차량번호 → 차종 → 작업 → 입고일 → 금액 → 상태 → 할 일 */
var JLT={o:null,h:null,sig:"",ids:[],st:{}};   /* 1.5 state — 찾기 · 쪽 · 정렬 · 고른 줄이 다시 그려도 남음 */
function jLedgerState(r){var st=statusOf(r);if(st==="입고")return atBody(r)?"판금·도색 중":"입고";return st==="수금완료"?"수금 완료":st;}
function jMD(iso){var d=new Date(iso);return isNaN(d)?"":(String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getDate()).padStart(2,"0"));}
function jLedgerTable(){
  var on=(S.mode==="pc"&&L.view!=="card"&&window.CGG&&CGG.table);
  var host=$("jLT");
  if(!host){host=document.createElement("div");host.id="jLT";$("lTable").parentNode.insertBefore(host,$("lTable"));}
  host.hidden=!on;
  ["lTable","lInfo"].forEach(function(id){var e=$(id);if(e)e.hidden=on;});
  var pg=document.querySelector("#vLedger .pager");if(pg)pg.hidden=on;
  ["lStatus","lq","lSize"].forEach(function(id){var e=$(id);if(e)e.hidden=on;});
  if(!on){var hj0=document.querySelector("#vLedger .dashhead .jacts");if(hj0)hj0.hidden=false;return;}
  var recs=S.records.filter(function(r){return !L.month||(r.month||mKey(r.createdAt))===L.month;})
    .sort(function(a,b){return String(b.createdAt).localeCompare(String(a.createdAt));});
  var rows=recs.map(function(r){return [r.company||"-",r.plate||"-",r.model||"-",workText(r)||"-",jMD(r.createdAt),Number(r.total)||0,jLedgerState(r)];});
  var sig=JSON.stringify(rows)+"|"+L.month;
  if(JLT.h&&JLT.sig===sig&&host.firstChild)return;
  var sameIds=JLT.ids.join(",")===recs.map(function(r){return r.id;}).join(",");
  JLT.ids=recs.map(function(r){return r.id;});JLT.recs=recs;JLT.sig=sig;
  var hj=document.querySelector("#vLedger .dashhead .jacts");if(hj)hj.hidden=true;   /* 표에서는 일괄 버튼이 표 위에 */
  if(!JLT.o){
    JLT.o={cols:["상사명","차량번호","차종","작업","입고일","금액","상태"],kinds:["name","id","text","text","date","money","state"],rows:[],
      tabs:[["","전체"],["입고","작업 중"],["판금·도색 중","판금·도색 중"],["출고","수금 대기"],["수금 완료","수금 완료"]],
      stateMap:{"입고":"run","판금·도색 중":"stop","출고":"chk","수금 완료":"done"},
      filters:[],find:"검색 · 상사 · 차량번호 · 작업",size:20,state:JLT.st,
      /* 1.5 일괄 버튼 (거르기 줄 오른쪽 · 검색 앞) — 고른 줄 번호 → 줄 id 로 바꿔서 기존 확인 창 · 서버 길 그대로 */
      bulk:[{key:"paid",label:"선택한 차 입금 완료",needSel:true},{key:"del",label:"선택한 차 지우기",needSel:true,danger:true},{key:"xls",label:"엑셀 다운로드",icon:"down"}],
      onBulk:function(k,ix){L.sel={};ix.forEach(function(i){var id=JLT.ids[i];if(id)L.sel[id]=true;});
        if(k==="paid"){if(!ix.length)return toast("먼저 줄을 골라 주세요",true);$("lPayed").click();}
        else if(k==="del"){if(!ix.length)return toast("먼저 줄을 골라 주세요",true);$("lDelSel").click();}
        else if(k==="xls")$("lCsv").click();},
      sorts:[[4,-1,"최신 입고순"],[4,1,"오래된 입고순"],[5,-1,"금액 큰 순"],[0,1,"상사명 순"]],
      mline:function(x){return [x[2],x[3],x[4]].filter(function(v){return v&&v!=="-";}).join(" · ");},
      onName:function(x,i){var r=JLT.recs[i];if(r)sheetEdit(r);},
      onSelect:function(ix){L.sel={};ix.forEach(function(i){var id=JLT.ids[i];if(id)L.sel[id]=true;});try{selInfo();}catch(e){}},
      actions:function(x,i){var r=JLT.recs[i];if(!r)return [];var st=statusOf(r);
        if(st==="입고")return [{key:"out",label:"출고"}];
        if(st==="출고")return [{key:"paid",label:"입금 완료"}];
        return [];},
      onAction:function(k,x,i){var r=JLT.recs[i];if(!r)return;
        if(k==="out")openOut(r);
        else if(k==="paid"){L.sel={};L.sel[r.id]=true;$("lPayed").click();}}
    };
  }
  JLT.o.filters=[monthLabel(L.month)];
  JLT.o.rows.length=0;rows.forEach(function(x){JLT.o.rows.push(x);});
  if(!JLT.h||!host.firstChild){JLT.h=CGG.table(host,JLT.o);
    /* 처음 정렬은 «최신 입고순» (입고일 머리 두 번 = 내림차순) */
    for(var k=0;k<2;k++){var th=host.querySelector('th[data-k="4"]');if(th)th.click();}}
  else{if(!sameIds){JLT.st.sel={};L.sel={};}JLT.h.redraw();}   /* 1.5 보안 규칙 ②: 자료가 바뀌면 고른 줄 비움 */
}
function renderLedger(){
  renderLateTable();''')
rep('''  if(S.tab==="ledger")jLedger();''', '''  if(S.tab==="ledger"){jLedger();jLedgerTable();}''')
# 고른 차를 다 처리하면 표의 선택도 비움
rep('''  })).then(function(){L.sel={};toast("수금 완료로 바꿨습니다");renderAll();})''',
    '''  })).then(function(){L.sel={};if(JLT.h)JLT.h.clear();toast("입금 완료로 바꿨어요");renderAll();})''')
rep('''   .then(function(){L.sel={};toast("지웠습니다");renderAll();})''',
    '''   .then(function(){L.sel={};if(JLT.h)JLT.h.clear();toast("휴지통으로 옮겼어요");renderAll();})''')

# 청구서 표 — «입금 기한» 열 (W10 과 같은 날)
rep('''    {k:"due",label:"미수",align:"right",html:function(b){''', '''    {k:"dueDate",label:"입금 기한",val:function(b){return billDueDate(b.month)||"";},html:function(b){var t=billDue(b);return t==="업체에 문의"?'<span style="color:var(--muted)">'+esc(t)+'</span>':esc(t);}},
    {k:"due",label:"미수",align:"right",html:function(b){''')

# ───── ① 홈 숫자 카드 → CGG.kpis · 도움 카드 → CGG.help ─────
rep('''    $("homeSums").innerHTML = jKpis(totAmt);''', '''    if(window.CGG&&CGG.kpis) CGG.kpis($("homeSums"), jKpiItems(totAmt)); else $("homeSums").innerHTML = jKpis(totAmt);''')
rep('function jKpis(monthAmt){', r'''/* v122: CGG.kpis 에 넘길 값 — {label, value, unit, delta, down, spark, color} */
function jKpiItems(monthAmt){
  var tmp=document.createElement("div");tmp.innerHTML=jKpis(monthAmt);
  var today=new Date(),D7=[],i;for(i=6;i>=0;i--){var d=new Date(today);d.setDate(d.getDate()-i);D7.push(jDayKey(d));}
  var wk=new Date(today);wk.setDate(wk.getDate()-7);var lastK=jDayKey(wk),tk=D7[6];
  var ins={},outs={};
  S.records.forEach(function(r){var a=jDayOf(r.createdAt);if(a)ins[a]=(ins[a]||0)+1;var b=r.outAt?jDayOf(r.outAt):"";if(b)outs[b]=(outs[b]||0)+1;});
  function busyAt(t){return S.records.filter(function(r){var c=new Date(r.createdAt).getTime();var o=r.outAt?new Date(r.outAt).getTime():Infinity;return c<=t&&o>t;}).length;}
  var end=function(k){return new Date(k+"T23:59:59").getTime();};
  var busyNow=S.records.filter(function(r){return statusOf(r)==="입고";}).length;
  function dl(now,before,u){var x=now-before;return {delta:(x>0?"+":x<0?"−":"±")+Math.abs(x)+u,down:x<0};}
  var a1=dl(ins[tk]||0,ins[lastK]||0,"대"),a2=dl(busyNow,busyAt(end(lastK)),"대"),a3=dl(outs[tk]||0,outs[lastK]||0,"대");
  var L4;
  if(isManager()){var cs={};S.records.forEach(function(r){if(r.company)cs[r.company]=1;});L4={label:"거래 상사",value:String(Object.keys(cs).length),unit:"곳",color:"#0B2545"};}
  else L4={label:"이번 달 청구 금액",value:Number(monthAmt||0).toLocaleString("ko-KR"),unit:"원",color:"#0B2545"};
  return [
    {label:"오늘 입고",value:String(ins[tk]||0),unit:"대",delta:a1.delta,down:a1.down,spark:D7.map(function(k){return ins[k]||0;}),color:"#1668C4"},
    {label:"작업 중",value:String(busyNow),unit:"대",delta:a2.delta,down:a2.down,spark:D7.map(function(k){return k===tk?busyNow:busyAt(end(k));}),color:"#B26B00"},
    {label:"오늘 출고",value:String(outs[tk]||0),unit:"대",delta:a3.delta,down:a3.down,spark:D7.map(function(k){return outs[k]||0;}),color:"#1E9E5A"},
    L4];
}
function jKpis(monthAmt){''')
rep('''    var dt=$("jHelp");
    if(!dt){dt=document.createElement("details");dt.className="jhelp";dt.id="jHelp";}
    if(tx&&last){
      if(dt.__k!==hk){dt.__k=hk;dt.open=false;
        dt.innerHTML='<summary>이 화면 사용법</summary><p>'+esc(tx)+'</p><button type="button" class="btn" data-jhelp="1">자세한 도움말 보기</button>';
        dt.querySelector("[data-jhelp]").onclick=function(){var b=$("btnHelp");if(b)b.click();};}''',
    '''    var dt=$("jHelp");
    if(!dt){dt=document.createElement("div");dt.className="jhelpwrap";dt.id="jHelp";}
    if(tx&&last){
      if(dt.__k!==hk){dt.__k=hk;
        dt.innerHTML=(window.CGG&&CGG.help?CGG.help(tx):'<details class="cgg-help"><summary>이 화면 사용법</summary><p>'+esc(tx)+'</p></details>');
        var dd=dt.querySelector("details");
        if(dd){var hb=document.createElement("button");hb.type="button";hb.className="btn";hb.textContent="자세한 도움말 보기";
          hb.onclick=function(){var b=$("btnHelp");if(b)b.click();};dd.appendChild(hb);}}''')

# ───── ⑦ 체험판 = 서버 «결제 대기» (lockInfo state "pay") ─────
rep('  window.ccwLockRefresh = function(){ load(true); };', '  window.ccwLockRefresh = function(){ load(true); };\n  window.ccwLockGet = function(){ return LK.st; };')
rep('    rpcL("lockInfo",[]).then(function(r){\n      LK.st = r || null; LK.at = Date.now(); paint();',
    '    rpcL("lockInfo",[]).then(function(r){\n      LK.st = r || null; LK.at = Date.now(); paint(); try{ if(window.cggTrialPaint) window.cggTrialPaint(); }catch(e){}')
rep('function jTrialOn(){try{var p=window.ccwPlanGet&&window.ccwPlanGet();return !!(p&&p.trial);}catch(e){return false;}}',
    '''/* v122: 체험판 = 가입 뒤 결제 전(서버 sb13 «결제 대기», lockInfo state "pay"). 무료 체험 요금제는 기능이 다 열려 있어 띠 없음 */
function jTrialOn(){try{var st=window.ccwLockGet&&window.ccwLockGet();return !!(st&&(st.state==="pay"||st.kind==="pay"));}catch(e){return false;}}''')
rep('  box.innerHTML=CGG.trial.band({title:"체험판이에요. 모든 화면을 둘러보실 수 있어요."});\n  var go=box.querySelector("[data-cgg-cta]");if(go)go.onclick=function(){whoSheet();};',
    '''  box.innerHTML=CGG.trial.band({title:"체험판이에요. 예시 자료로 모든 화면을 둘러보실 수 있어요."});
  document.body.classList.add("jpay");
  var go=box.querySelector("[data-cgg-cta]");if(go){go.textContent="결제 이어 하기";go.onclick=function(){try{window.ccwPlanPay();}catch(e){whoSheet();}};}''')
rep('  if(!jTrialOn()||S.mode!=="pc"){box.innerHTML="";return;}', '  if(!jTrialOn()||S.mode!=="pc"){box.innerHTML="";document.body.classList.remove("jpay");return;}')
# 잠금 — 서버가 막지 못하는 «자료 가져가기»(엑셀 · 그림 · 백업 · QR)를 화면에서 막음. 보내기 · 발급은 서버가 막음(PAYWAIT_OK 밖)
rep('''var JLOCK=[["salXls","매출 엑셀 다운로드","매출 표를 엑셀 파일로 받아요."],''', '''var JLOCK=[["salXls","매출 엑셀 다운로드","매출 표를 엑셀 파일로 받아요."],["lCsv","입출고 엑셀 다운로드","입출고 내역을 엑셀 파일로 받아요."],
  ["olCsv","출고 기록 엑셀 다운로드","출고 기록을 엑셀 파일로 받아요."],["mnCsv","입출금 엑셀 다운로드","입출금 내역을 엑셀 파일로 받아요."],["cXls","엑셀 다운로드","표를 엑셀 파일로 받아요."],
  ["tCsvBtn","세금계산서 엑셀 다운로드","세금계산서 목록을 엑셀 파일로 받아요."],["pvJpg","청구서 JPG 다운로드","청구서를 그림 파일로 받아요."],["pvJpgAll","청구서 JPG 모두 받기","청구서를 그림 파일로 받아요."],
  ["lkQrSave","QR 그림 저장","직원 로그인 QR을 그림으로 저장해요."],["lkQrPrint","QR 인쇄","직원 로그인 QR을 인쇄해요."],''')
# 편한 기능 3번 — 서버 trialUse([이름]) 로 셈 (이름은 서버 TRIAL_FEATURES 18개와 같음 · AI 번호판은 서버가 aiJson 에서 셈)
rep('try{window.cggTrialPaint=function(){jTrialBand();jTrialMarks();};}catch(e){}', r'''var JTRY={btnSave:"intake",btnSaveBody:"intake_body",shOut:"release",lPayed:"paid_mark",eSave:"edit_delete",eDel:"edit_delete",
  osSave:"msg_text_edit",bMake:"bill_make",bPreview:"bill_preview",spSave:"biz_info",cAdd:"partners",cSave:"partners",btnSaveDest:"destinations",dSave:"destinations",
  scSave:"notify_cfg",coSave:"release_cfg",btnSaveItems:"price_table",mSave:"stock_edit",trBack:"trash_restore",mmAdd:"calendar_memo"};
document.addEventListener("click",function(ev){
  if(!jTrialOn())return;
  var t=ev.target&&ev.target.closest&&ev.target.closest("button[id]");if(!t||!JTRY[t.id])return;
  if(t.__jTryOk){t.__jTryOk=false;return;}
  ev.preventDefault();ev.stopImmediatePropagation();
  var nm=t.textContent.replace(/\s+/g," ").trim()||"이 기능";
  gsCall("trialUse",[JTRY[t.id]]).then(function(r){
    var j=typeof r==="string"?JSON.parse(r):r;
    if(j&&j.ok===false){var u=CGG.trial.usedText(nm);ask(u.title+"\n\n"+u.desc,function(){try{window.ccwPlanPay();}catch(e){whoSheet();}},u.ok);return;}
    t.__jTryOk=true;t.click();
    if(j&&j.left>=0)toast("체험판 · «"+nm+"» "+j.left+"번 남았어요");
  }).catch(function(e){toast(errMsg(e),true);});
},true);
try{window.cggTrialPaint=function(){jTrialBand();jTrialMarks();};}catch(e){}

/* ===== ⑤ 홈페이지 결제 받기 — 통합 입구가 넣은 cgg_buy(요금제 코드) ===== */
function jBuy(){
  var code="";try{code=localStorage.getItem("cgg_buy")||"";if(code)localStorage.removeItem("cgg_buy");}catch(e){}
  if(!code)return;
  if(!isOwner()){setTimeout(function(){toast("결제는 대표만 할 수 있습니다",true);},2200);return;}
  var open=function(){try{window.ccwPlanPay();}catch(e){whoSheet();}};
  if(!/^[a-z0-9_-]{1,20}$/i.test(code)){open();return;}
  /* 결제 대기 업체면 고른 요금제로 맞춘 뒤 (공개 요금제인지는 서버가 확인) */
  var go=function(){
    if(jTrialOn())gsCall("joinPlanSet",[code]).then(open,open);
    else open();
  };
  if(window.ccwLockGet&&window.ccwLockGet())go();else setTimeout(go,2500);
}''')
rep('''  jPage();jTrialBand();
  clearTimeout(window.__jpT);''', '''  jPage();jTrialBand();
  if(!window.__jBuyDone&&S.me){window.__jBuyDone=1;setTimeout(jBuy,600);}
  clearTimeout(window.__jpT);''')

# ───── 결제 확인표(결제/10) W4 · W5 ─────
# W4 캐시 충전 1만 ~ 300만 원 (금액은 서버가 다시 확인)
rep('''    if(cardBtn) cardBtn.onclick = function(){ cwPay("cash", Number(amt.value)||0, 0); };''',
    '''    function cwRange(v){ if(v < 10000 || v > 3000000){ document.getElementById("cwMsg").innerHTML =
        '<span style="color:#C0392B">1만 원부터 300만 원까지 충전할 수 있어요.</span>'; return false; } return true; }
    if(cardBtn) cardBtn.onclick = function(){ var v=Number(amt.value)||0; if(!cwRange(v)) return; cwPay("cash", v, 0); };''')
rep('''      if(v < 10000){ document.getElementById("cwMsg").innerHTML =
        '<span style="color:#C0392B">1만원부터 신청하실 수 있습니다.</span>'; return; }''',
    '''      if(!cwRange(v)) return;''')
# W5 내 결제 내역 (주문 · 금액 · 수단 · 상태) — 이용요금 창에서
rep('''          '<div id="abBox"></div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn" data-cwclose style="flex:1">닫기</button></div>');
        abPaint(q);''', '''          '<div id="abBox"></div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn" type="button" data-pvhist="1">결제 내역</button><button class="btn" data-cwclose style="flex:1">닫기</button></div>');
        abPaint(q);''')
rep('''        '<button class="btn" id="pvCash" style="flex:1">캐시 충전 화면</button>'+''',
    '''        '<button class="btn" type="button" data-pvhist="1">결제 내역</button>'+
        '<button class="btn" id="pvCash" style="flex:1">캐시 충전 화면</button>'+''')
rep('''  /* 요금제만 결제하는 창 */
  window.ccwPlanPay = function(){''', '''  /* v122 · 결제 확인표 W5 — 내 결제 내역 (payMine) */
  var PAYST={paid:["완료","#1E9E5A"],ready:["결제 중","#1668C4"],failed:["실패","#D64545"],canceled:["환불","#B26B00"]};
  var PAYKIND={plan:"이용요금",cash:"캐시 충전"};
  function payHist(){
    cashBox('<h3 style="margin:0 0 6px">결제 내역</h3><div class="sub">불러오는 중이에요…</div>');
    cwRpc("payMine",[]).then(function(r){
      var L=((r&&r.orders)||[]).slice(0,50);
      cashBox('<h3 style="margin:0 0 4px">결제 내역</h3><div class="sub" style="margin-bottom:12px">최근 '+L.length+'건 · 영수증은 결제할 때 토스가 보내 드린 안내에서 볼 수 있어요</div>'+
        '<div style="border:1px solid #DDE3EC;border-radius:12px;max-height:56vh;overflow:auto">'+
        (L.length?L.map(function(o){var st=PAYST[o.status]||[o.status||"-","#667085"];
          return '<div style="display:flex;gap:10px;align-items:center;padding:11px 13px;border-bottom:1px solid #EEF2F7;font-size:13.5px">'+
            '<span style="min-width:74px;color:#667085;font-size:12px">'+esc2(String(o.paid_at||o.created_at||"").slice(0,10))+'</span>'+
            '<span style="flex:1;min-width:0">'+esc2(o.order_name||PAYKIND[o.kind]||"-")+'<br><small style="color:#667085">'+esc2(PAYKIND[o.kind]||o.kind||"")+(o.method?' · '+esc2(o.method):'')+(Number(o.use_cash)>0?' · 캐시 '+w(o.use_cash):'')+'</small></span>'+
            '<b style="white-space:nowrap">'+w(o.amount)+'</b>'+
            '<span style="min-width:52px;text-align:center;font-size:12px;font-weight:700;color:'+st[1]+'">'+esc2(st[0])+'</span></div>';}).join("")
          :'<div style="padding:16px;text-align:center;color:#667085;font-size:13px">아직 결제한 내역이 없어요.</div>')+'</div>'+
        '<div class="sheetbtns" style="margin-top:14px"><button class="btn" type="button" id="phBack">이용요금 창으로</button><button class="btn" data-cwclose>닫기</button></div>');
      var bk=document.getElementById("phBack"); if(bk) bk.onclick=function(){ window.ccwPlanPay(); };
    }).catch(function(e){
      cashBox('<h3 style="margin:0 0 6px">결제 내역</h3><div style="color:#C0392B;font-size:14px">'+esc2((e&&e.message)||"불러오지 못했어요")+'</div>'+
        '<div class="sheetbtns" style="margin-top:14px"><button class="btn" data-cwclose>닫기</button></div>');
    });
  }
  document.addEventListener("click",function(ev){ var t=ev.target&&ev.target.closest&&ev.target.closest("[data-pvhist]"); if(t){ ev.preventDefault(); payHist(); } });
  window.ccwPayHist = payHist;

  /* 요금제만 결제하는 창 */
  window.ccwPlanPay = function(){''')

# 1.5 보안 규칙 ② — 일괄 확인 창에 고른 줄 이름(차량번호) 목록
rep('  return "상사 · "+((cs.slice(0,2).join(", ")+(cs.length>2?" 외 "+(cs.length-2)+"곳":""))||"-")+"\\n대수 · "+rs.length+"대\\n합계 금액 · "+won(amt);',
    '  var ps=rs.map(function(r){return r.plate||"-";});\n  return "상사 · "+((cs.slice(0,2).join(", ")+(cs.length>2?" 외 "+(cs.length-2)+"곳":""))||"-")+"\\n차량 · "+ps.slice(0,5).join(", ")+(ps.length>5?" 외 "+(ps.length-5)+"대":"")+"\\n대수 · "+rs.length+"대\\n합계 금액 · "+won(amt);')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
