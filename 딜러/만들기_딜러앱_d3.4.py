"""딜러앱 화면 d3.3 → d3.4 새 판을 만든다. 바탕 파일과 공통 부품은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.4.py   (바탕: 딜러/3_딜러앱_화면_d3.3 — 저장소에 있는 그대로)
결과: 딜러/3_딜러앱_화면_d3.4/
근거: 디자인/완성기준/00_공통.md · 03_딜러.md («지금 판에서 고칠 곳» 1~3) · cgg-j4 1.3 (커밋 b0e3263)
바꾸는 것
  1. 공통 부품 1.2 → 1.3. 내 차 표를 CGG.table 로 (상태 탭 · 상태 칩 · 폰 목록 · 쪽 넘기기가 다른 제품과 같아짐)
  2. 확인 창 층 — d3.2 부터 cgg-dialog(90). 그대로 유지 (숫자 70 없음 확인)
  3. 청구서 [한 번에 결제] — 버튼 없음 그대로, 대신 «곧 열려요» 한 줄을 보이게
  + 사람 단추 ▾ 는 빼요 (03_딜러 «딜러는 «내 정보» 메뉴가 그 자리»). 화면 설정은 내 정보 안
  + 시연(?demo)은 CGG.trial.init("preview") 띠 (00_공통 «미리 써 보기» 자리)
  + 차 상세는 화면 넘김 대신 «자세히 창 520» (03_딜러 «이름 누르면 자세히 창 520»)
안 바꾸는 것: 서버 창구 · 로그인 · 동의 · 차 상세 · 청구서 자료 · 홈 숫자 · 할 일"""
import os, shutil, subprocess
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.3"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.4"
J4_COMMIT = "b0e3263"   # cgg-j4 1.3
git = lambda p: subprocess.run(["git", "-C", ROOT, "show", J4_COMMIT + ":" + p], capture_output=True, check=True).stdout.decode("utf-8")
J4CSS, J4JS = git("디자인/공통/cgg-j4.css"), git("디자인/공통/cgg-j4.js")
assert "cgg-j4 1.3" in J4CSS and 'version:"cgg-j4 1.3"' in J4JS
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.3 (2026-10-15, J안 4판 완성 모양 · 공통 부품 cgg-j4 1.2",
    "<!-- 차곳간 딜러앱 화면 · 판 d3.4 (2026-10-15, J안 완성 기준 · 공통 부품 cgg-j4 1.3")
rep('var VER="d3.3";', 'var VER="d3.4";')

# 2) 공통 부품 1.2 → 1.3 (CSS 덩어리 · 앞 script 덩어리 통째로)
H = "/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.2"
a = s.index(H); b = s.index("</style>", a); s = s[:a] + J4CSS + "\n" + s[b:]
a = s.index(H); b = s.index("</script>", a); s = s[:a] + J4JS + "\n" + s[b:]
assert "cgg-j4 1.2 (" not in s

# 3) 사람 단추 ▾ 빼기 (딜러는 «내 정보» 메뉴가 그 자리)
rep("""'<div class="cgg-right"><button class="bell" data-act="tab" data-v="noti">알림'+(u?'<span class="dot">'+(u>99?"99+":u)+'</span>':'')+'</button>'+
    '<button class="mebtn" id="meBtn" type="button">'+esc(S.name||"내 정보")+' ▾</button></div></div>'+""",
    """'<div class="cgg-right"><button class="bell" data-act="tab" data-v="noti">알림'+(u?'<span class="dot">'+(u>99?"99+":u)+'</span>':'')+'</button></div></div>'+""")
a = s.index('  var mb=$("meBtn");'); b = s.index('  var lb=$("layBox");', a); s = s[:a] + s[b:]

# 4) 시연 = 미리 써 보기 띠 (CGG.trial)
rep("""'<main class="cgg-main" id="bd"><div class="stack">'+demoBar().replace('style="','style="border-radius:10px;')+body+'</div></main><nav class="cgg-tbar"></nav>';""",
    """'<main class="cgg-main" id="bd"><div class="stack">'+(DEMO?CGG.trial.band({title:"예시 자료로 딜러앱을 둘러보고 있어요.",sub:"실제 자료가 아니에요. 딜러앱은 무료예요 — 휴대폰 번호로 로그인하면 업체에 맡긴 내 차가 보여요."}):'')+body+'</div></main><nav class="cgg-tbar"></nav>';""")
rep('''  CGG.layout.init(ph,"cgg_dealer_layout");''', '''  CGG.layout.init(ph,"cgg_dealer_layout");
  if(DEMO){CGG.trial.init("preview");var cta=ph.querySelector("[data-cgg-cta]");if(cta)cta.onclick=function(){try{location.href=location.pathname;}catch(e){}};}''')

# 5) 내 차 — CGG.table (열 차례: 선택 → 지금 위치 → 차량번호 → 차종 → 작업 → 마지막 기록 → 들어간 금액 → 단계)
a = s.index("function carsView(){"); b = s.index("function carView(){", a)
CARS = r'''var STMAP={"입고":"run","작업 중":"run","출고":"run","도착":"chk","상품화 완료":"done"};
function carsView(){
  if(S.cars===null)return '<div class="card" style="color:var(--sub);text-align:center">내 차를 불러오는 중…</div>';
  var g=G(),all=g.all;
  var h=CGG.head({crumb:'내 차 · '+today(),title:'작업 중인 차 <em>'+g.work.length+'대</em>, 도착한 차 <em>'+g.arr.length+'대</em>가 있어요',desc:'업체에 맡긴 내 차가 지금 어디 있는지, 어디까지 됐는지 확인해요.',
    acts:all.length?[{label:"선택한 차 상품화 완료",pri:true,id:"finSel",disabled:true}]:[]});
  if(!all.length)return h+'<div class="card lempty">아직 내 번호로 맡겨진 차가 없어요.<br>업체에 차를 맡길 때 <b>'+esc(telFmt(S.phone))+'</b> 번호를 알려 주세요.</div>';
  return h+'<div id="carTbl"></div>'+CGG.help('업체가 입고 · 출고를 찍으면 여기에 바로 보여요. 지금 위치를 누르면 사진과 지나온 기록(최근이 위)이 나와요. 내 상사에 도착한 차는 골라서 «선택한 차 상품화 완료»를 눌러 주세요. 금액이 «—»이면 업체가 아직 금액을 넣지 않은 거예요.');
}
function wireCars(ph){
  var el=ph.querySelector("#carTbl");if(!el)return;
  var L=latest();S.sel={};
  var rows=L.map(function(c){var sm=sumOf(c.plate);return [c.where||"",c.plate,c.model||"차종 없음",worksOf(c),lastAt(c.at),sm||0,stageOf(c)];});
  var fin=ph.querySelector("#finSel");
  var setBtn=function(n){if(!fin)return;fin.disabled=!n;fin.textContent="선택한 차 상품화 완료"+(n?" ("+n+")":"");};
  CGG.table(el,{cols:["지금 위치","차량번호","차종","작업","마지막 기록","들어간 금액","단계"],kinds:["name","id","text","text","date","money","state"],rows:rows,
    tabs:[["","전체"],["입고","입고"],["작업 중","작업 중"],["출고","출고"],["도착","도착"]],stateMap:STMAP,find:"차량번호 · 차종 · 업체 찾기",
    sorts:[[4,-1,"최근 기록순"],[1,1,"차량번호순"],[5,-1,"금액 높은순"],[6,1,"단계순"]],
    mline:function(x){return [x[2],x[3],x[4]].filter(Boolean).join(" · ");},
    onName:function(x,i){var c=L[i];act("car",{getAttribute:function(k){return k==="data-s"?c.shop:c.id;}});},
    onSelect:function(idx){S.sel={};idx.forEach(function(i){if(L[i])S.sel[L[i].key]=true;});setBtn(idx.filter(function(i){return L[i]&&!isDone(L[i]);}).length);}});
  /* 홈 할 일 · 숫자에서 넘어온 단계 탭을 고른 채로 · 사용자가 고른 탭도 기억 (다시 그려도 그대로) */
  if(S.filter&&S.filter!=="전체"){var t=el.querySelector('[data-f="'+S.filter+'"]');if(t)t.click();}
  el.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-f]");if(t)S.filter=t.getAttribute("data-f")||"전체";},true);
  if(fin)fin.onclick=function(){act("finishSel");};
}
'''
s = s[:a] + CARS + s[b:]
rep('''  var lb=$("layBox");''', '''  wireCars(ph);
  var lb=$("layBox");''')

# 6) 청구서 — [한 번에 결제] 자리에 «곧 열려요» 한 줄
rep("""   (open.length?'<div class="note">휴대폰이면 «계좌 복사»를""",
    """   (open.length?'<div class="soon">'+CGG.ic("lock")+'<span><b>한 번에 결제는 곧 열려요.</b> 지금은 업체마다 계좌로 보내 주세요.</span></div>':'')+
   (open.length?'<div class="note">휴대폰이면 «계좌 복사»를""")
CSS = r'''
/* d3.4 — 곧 열려요 한 줄 */
.soon{display:flex;align-items:center;gap:8px;background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:10px 12px;font-size:13px;color:var(--sub)}
.soon svg.ic{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.soon b{color:var(--ink)}
'''
k = s.index("/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.3")
s = s[:k] + CSS + "\n" + s[k:]

# 6-1) 차 상세 → «자세히 창 520» (CGG.dialog size:"detail" · 폰은 아래에서). 내용은 예전 차 상세(carView) 그대로
rep("""  if(a==="car"){var sh=el.getAttribute("data-s");S.detail=null;S.view="car";render();history.pushState({d:1},"");
    api("car",[sh,v]).then(function(r){S.detail=r;render();},function(e){S.view="main";render();toast(e.message);});return;}""",
"""  if(a==="car"){var sh=el.getAttribute("data-s");S.detail=null;S.dlg=true;openCar("불러오는 중…");
    api("car",[sh,v]).then(function(r){S.detail=r;if(S.dlg)openCar();},function(e){S.dlg=false;CGG.closeDialog();toast(e.message);});return;}""")
rep("""function act(a,el){
  var v=el&&el.getAttribute("data-v");""", """function act(a,el){
  var v=el&&el.getAttribute("data-v");
  if(S.dlg&&(a==="tab"||a==="logout"||a==="go")){S.dlg=false;CGG.closeDialog();}""")
rep("""      if(a==="finish"){history.back();toast("상품화 완료! «완료»로 표시했어요.");}else{render();toast("완료를 취소했어요");}},function(e){toast(e.message);});return;}""",
"""      if(a==="finish"){if(S.dlg){S.dlg=false;CGG.closeDialog();render();}else history.back();toast("상품화 완료! «완료»로 표시했어요.");}
      else{render();if(S.dlg)openCar();toast("완료를 취소했어요");}},function(e){toast(e.message);});return;}""")
rep("function wireCars(ph){", """function openCar(wait){
  var c=S.detail&&S.detail.car;
  var d=CGG.dialog({size:"detail",title:c?c.plate+" · 차 상세":"차 상세",desc:c?"상품화 진행 과정":"",body:'<div class="cardlg">'+(wait?'<div class="card" style="color:var(--sub);text-align:center">'+esc(wait)+'</div>':carView())+'</div>'});
  var dim=d&&d.parentNode;if(dim&&!dim._dl){dim._dl=1;new MutationObserver(function(){if(dim.hidden)S.dlg=false;}).observe(dim,{attributes:true,attributeFilter:["hidden"]});}
}
function wireCars(ph){""")
CSS2 = """
/* d3.4 — 자세히 창 안의 차 상세 */
.cardlg{display:flex;flex-direction:column;gap:10px;margin:4px 0 8px}
.cardlg .photo{height:170px}
.cgg-app .sheet-wrap{z-index:calc(var(--z-dialog) + 1)}
"""
k2 = s.index("/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.3")
s = s[:k2] + CSS2 + s[k2:]

# 7) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
