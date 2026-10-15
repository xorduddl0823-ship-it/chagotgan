"""딜러앱 화면 d3.2 → d3.3 새 판을 만든다. 바탕 파일과 공통 부품은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.3.py   (바탕: 딜러/3_딜러앱_화면_d3.2 — 저장소에 있는 그대로)
결과: 딜러/3_딜러앱_화면_d3.3/
근거: 결정 기록 2026-10-15 «새 디자인 먼저, 기능은 그 위에, 시험은 한 번» · 디자인/01 · 디자인/공통 cgg-j4 1.2
바꾸는 것
  - 공통 부품 cgg-j4 1.1 → 1.2. JS 는 README 대로 제품 스크립트보다 «먼저» 따로 <script> 하나로
  - 머리말 사람 단추 ▾ (CGG.menu): 내 정보 · 화면 설정 · 로그아웃 (딜러는 요금제 · 휴지통 없음)
  - ③ 청구서: 업체별 청구서 묶음 + 계좌이체 안내 (서버 dealer-api d6 의 myBills · 읽기만). 결제 단추 없음
    (돈은 차곳간을 거치지 않음 · 결정 기록 2026-10-15)
  - 홈 숫자 3번째 «이번 주 입고된 차» → «결제할 청구서 금액» (디자인/01 4-1 «청구서가 열리면» · 추천안으로 진행)
안 바꾸는 것: 로그인 · 동의 · 차 자료 창구 · 내 차 · 차 상세"""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.2"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.3"
J4CSS = open(ROOT + "/디자인/공통/cgg-j4.css", encoding="utf-8").read()
J4JS = open(ROOT + "/디자인/공통/cgg-j4.js", encoding="utf-8").read()
assert "cgg-j4 1.2" in J4CSS and 'version:"cgg-j4 1.2"' in J4JS, "공통 부품이 1.2 가 아니에요"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

HEAD = "/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.1"

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.2 (2026-10-15, J안 4판 · 공통 부품 cgg-j4 1.1",
    "<!-- 차곳간 딜러앱 화면 · 판 d3.3 (2026-10-15, J안 4판 완성 모양 · 공통 부품 cgg-j4 1.2 · 청구서 묶음(myBills, 서버 d6 이상)")
rep('var VER="d3.2";', 'var VER="d3.3";')

# 2) 공통 부품 — CSS 는 style 맨 끝 덩어리 통째로 1.2 로, JS 는 제품 스크립트 앞 따로 <script> 로
a = s.index(HEAD); b = s.index("</style>", a)
s = s[:a] + J4CSS + "\n" + s[b:]
a = s.index(HEAD); b = s.index("/* ---------- 시작 ---------- */", a)
s = s[:a] + s[b:]
assert "cgg-j4 1.1" not in s
rep('<script>\n"use strict";', '<script>\n' + J4JS + '\n</script>\n<script>\n"use strict";')

# 3) 머리말 사람 단추 ▾
rep("""'<div class="cgg-right"><button class="bell" data-act="tab" data-v="noti">알림'+(u?'<span class="dot">'+(u>99?"99+":u)+'</span>':'')+'</button></div></div>'+""",
    """'<div class="cgg-right"><button class="bell" data-act="tab" data-v="noti">알림'+(u?'<span class="dot">'+(u>99?"99+":u)+'</span>':'')+'</button>'+
    '<button class="mebtn" id="meBtn" type="button">'+esc(S.name||"내 정보")+' ▾</button></div></div>'+""")
rep('''  var lb=$("layBox");''', '''  var mb=$("meBtn");if(mb)CGG.menu(mb,{name:(S.name?S.name+" 딜러":"딜러"),role:telFmt(S.phone)},function(){return [
    {key:"me",icon:"user",label:"내 정보"},"-",{key:"lay",icon:"gear",label:"화면 설정",note:CGG.layout.name()},"-",{key:"out",icon:"out",label:"로그아웃"}];},
    function(k){if(k==="me"||k==="lay"){act("tab",{getAttribute:function(){return "me";}});if(k==="lay")setTimeout(function(){var x=$("layBox");if(x)x.scrollIntoView({block:"center"});},50);}
      if(k==="out")act("logout");});
  var lb=$("layBox");''')
rep('''function render(){
  var ph=$("phone"),h="";''', '''function render(){
  try{CGG.closeMenu();}catch(e){}
  var ph=$("phone"),h="";''')

# 4) 청구서 자료 — 서버 myBills (d6). 시연은 예시 자료
rep("function demoApi(fn,a){", r'''function dday(n){var d=new Date(Date.now()+n*864e5);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
var DEMO_BILLS=[
 {shop:"한결광택 (예시)",month:"9월",name:"수원오토갤러리",cars:6,amount:780000,due:780000,dueDate:dday(-3),bank:"예시은행 000-1111-2222-01 한결광택",state:"입금 전",url:""},
 {shop:"바른리페어 (예시)",month:"9월",name:"수원오토갤러리",cars:3,amount:1250000,due:1250000,dueDate:dday(5),bank:"예시은행 000-3333-4444-02 바른리페어",state:"입금 전",url:""},
 {shop:"새빛휠 (예시)",month:"9월",name:"수원오토갤러리",cars:2,amount:180000,due:0,dueDate:dday(-1),bank:"예시은행 000-5555-6666-03 새빛휠",state:"입금 확인됨",url:""}];
function demoApi(fn,a){''')
rep('      if(fn==="cars")return ok({list:DEMO_CARS.slice(),done:S.done});',
    '      if(fn==="cars")return ok({list:DEMO_CARS.slice(),done:S.done});\n      if(fn==="myBills")return ok({list:DEMO_BILLS.slice(),ready:true});')
rep("function loadCars(){\n  return api(\"cars\")",
    "function loadBills(){return api(\"myBills\").then(function(r){S.bills=(r&&r.list)||[];S.billsReady=!!(r&&r.ready);render();},function(){S.bills=[];S.billsReady=false;render();});}\nfunction loadCars(){\n  loadBills();\n  return api(\"cars\")")

# 5) ③ 청구서 화면
i = s.index("function billsView(){"); j = s.index("function histView(){")
BILLS = r'''/* ③ 청구서 — 업체별 청구서 묶음 + 계좌이체 안내 (서버 myBills · 읽기만 · 결제 단추 없음 · 돈은 차곳간을 거치지 않음) */
function isPaid(b){return b.state==="입금 확인됨";}
function hasDue(b){return /^\d{4}-\d{2}-\d{2}/.test(String(b.dueDate||""));}
function dueLeft(b){if(!hasDue(b))return 9999;var x=new Date(String(b.dueDate).slice(0,10)+"T00:00:00");return Math.round((x-sod(new Date()))/864e5);}
function md(d){return String(d).slice(5,10).replace("-","/");}
function dueTxt(b){if(isPaid(b))return "입금 확인됨";if(!hasDue(b))return "기한 없음";var n=dueLeft(b);
  return n<0?"기한 "+md(b.dueDate)+" · "+(-n)+"일 지남":n===0?"기한 오늘("+md(b.dueDate)+")":"기한 "+md(b.dueDate)+" · "+n+"일 남음";}
function billList(){var L=(S.bills||[]).slice();
  L.sort(function(a,b){if(isPaid(a)!==isPaid(b))return isPaid(a)?1:-1;return dueLeft(a)-dueLeft(b);});return L;}
function billSum(){return (S.bills||[]).filter(function(b){return !isPaid(b);}).reduce(function(a,b){return a+(Number(b.due)||0);},0);}
function billsView(){
  if(!S.bills)return '<div class="card" style="color:var(--sub);text-align:center">청구서를 불러오는 중…</div>';
  var L=billList(),open=L.filter(function(b){return !isPaid(b);}),late=open.filter(function(b){return dueLeft(b)<0;});
  var withDue=open.filter(hasDue),first=withDue.length?withDue.reduce(function(a,b){return dueLeft(a)<=dueLeft(b)?a:b;}):null;
  var h=hello('청구서 · '+today(),open.length?'이번 달 낼 금액 <em>'+won(billSum())+'</em>':'낼 청구서가 없어요',
    open.length?'업체 '+open.length+'곳'+(late.length?' · <b style="color:var(--stop)">기한 지난 곳 '+late.length+'곳</b>':'')+(first?' · 가장 빠른 기한 '+md(first.dueDate):''):'업체가 내 번호로 청구서를 보내면 여기에 모여요.');
  if(!L.length)return h+(S.billsReady===false&&!DEMO?'<div class="card lempty">청구서 모아 보기를 준비하고 있어요. 그동안은 업체가 보낸 알림톡의 청구서를 봐 주세요.</div>':'');
  return h+'<div class="bills">'+L.map(function(b){var n=dueLeft(b),pd=isPaid(b),st=pd?"b-done":n<0?"b-late":"b-open";
    return '<div class="bill '+st+'"><div class="bh"><div><b>'+esc(b.shop)+'</b><small>'+esc([b.month,b.cars?b.cars+"대":"",b.name].filter(Boolean).join(" · "))+'</small></div>'+
      '<span class="pill p-'+(pd?'fin':n<0?'late':'arr')+'" style="margin:0">'+(pd?'입금 확인됨':n<0?'기한 지남':'입금 전')+'</span></div>'+
      '<div class="bm"><strong class="num">'+won(pd?b.amount:b.due)+'</strong><span>'+esc(dueTxt(b))+'</span></div>'+
      (pd?'':(b.bank?'<div class="acct"><span>'+esc(b.bank)+'</span></div>':'')+
        '<div class="bb">'+(b.bank?'<button class="btn sec2" data-act="copy" data-v="'+esc(b.bank)+'" data-m="계좌를">계좌 복사</button>':'')+
        '<button class="btn sec2" data-act="copy" data-v="'+esc(String(Math.round(Number(b.due)||0)))+'" data-m="금액을">금액 복사</button>'+
        '<button class="btn sec2" data-act="billView" data-v="'+esc(b.url||"")+'">내역 보기</button></div>')+
      (pd?'<div class="bb one"><button class="btn sec2" data-act="billView" data-v="'+esc(b.url||"")+'">내역 보기</button></div>':'')+'</div>';}).join("")+'</div>'+
   (open.length?'<div class="note">휴대폰이면 «계좌 복사»를 누른 뒤 은행 앱을 열어 붙여 넣어 주세요. 금액도 따로 복사할 수 있어요.<br>입금하면 업체가 확인한 뒤 «입금 확인됨»으로 바뀌어요. 차곳간은 금액을 받지 않고, 업체 계좌로 바로 보내요.</div>':'')+
   '<details class="help"><summary>이 화면 사용법</summary><p>업체가 내 번호로 보낸 청구서가 업체 · 달마다 한 장씩 모여요. 기한이 지난 것이 맨 위에 와요. «내역 보기»를 누르면 업체가 보낸 청구서(차별 작업과 금액)가 열려요. 한 번에 결제하는 기능은 나중에 열려요.</p></details>';
}
'''
s = s[:i] + BILLS + s[j:]
rep('''  if(a==="filter"){S.filter=v;render();return;}''', '''  if(a==="filter"){S.filter=v;render();return;}
  if(a==="copy"){var what=el.getAttribute("data-m")||"";
    var done=function(){toast(what+" 복사했어요");},fail=function(){S.sheet="copy";S.copyText=v;render();};
    try{navigator.clipboard.writeText(v).then(done,fail);}catch(e){fail();}return;}
  if(a==="billView"){if(/^https:\\/\\/app\\.cgg\\.co\\.kr\\//.test(v||"")){try{window.open(v,"_blank","noopener");}catch(e){}}else toast(DEMO?"업체가 보낸 청구서 화면이 열려요 (시연이라 열리지 않아요)":"청구서 주소가 없어요. 업체에 문의해 주세요");return;}''')
rep('''  if(k==="logout")inner=''', '''  if(k==="copy")inner='<h3>복사하지 못했어요</h3><p style="margin:0;color:var(--sub);font-size:14px">아래 글을 길게 눌러 복사해 주세요.</p><input readonly value="'+esc(S.copyText||"")+'" onfocus="this.select()" style="border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:12px;padding:12px;font:inherit"><button class="btn sec2" data-act="close">닫기</button>';
  if(k==="logout")inner=''')

# 6) 홈 숫자 3번째 — «결제할 청구서 금액» (추천안)
rep('''         ["이번 주 입고된 차",g.wk,"#0B2545",(d>=0?"+":"−")+Math.abs(d),"전체"],''',
    '''         ["결제할 청구서 금액",S.bills?won(billSum()).replace("원",""):"…","#0B2545","","BILLS","원"],''')
rep("""(i===2?spk(g.spark,k[2]):'')""", "''")
rep("""'<strong>'+k[1]+'<em>대</em></strong>""", """'<strong>'+k[1]+'<em>'+(k[5]||"대")+'</em></strong>""")
rep('''  if(a==="go"){S.filter=v||"전체";''', '''  if(a==="go"&&v==="BILLS"){S.tab="bills";S.view="main";render();try{window.scrollTo(0,0);}catch(e){}return;}
  if(a==="go"){S.filter=v||"전체";''')

# 7) 모양 (공통 부품 앞, 딜러 본문 쪽)
CSS = r'''
/* d3.3 — 사람 단추 · 청구서 */
.cgg-right .mebtn{position:relative;border:0;border-radius:8px;height:32px;padding:0 12px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:700;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (min-width:1000px){.lay-side .cgg-right .mebtn,.lay-icon .cgg-right .mebtn{background:var(--bg);color:var(--ink);height:36px;padding:0 14px}}
.bills{display:grid;gap:10px}
.bill{background:var(--card);border-radius:14px;box-shadow:var(--shadow);padding:14px;display:flex;flex-direction:column;gap:10px;border-left:4px solid var(--chk);min-width:0}
.bill.b-late{border-left-color:var(--stop)} .bill.b-done{border-left-color:var(--done);opacity:.85}
.bh{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}
.bh b{font-size:15px} .bh small{display:block;color:var(--sub);font-size:12px;margin-top:2px}
.bm{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.bm strong{font-size:22px;font-weight:900;letter-spacing:-.4px}
.bm span{font-size:12.5px;color:var(--sub)}
.bill.b-late .bm span{color:var(--stop);font-weight:700}
.acct{background:var(--bg);border-radius:10px;padding:9px 11px;font-size:13px;font-variant-numeric:tabular-nums}
.bb{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:6px}
.bb .btn{min-height:36px;padding:8px 6px;font-size:13px}
.p-late{background:var(--stop-bg);color:var(--stop)}
@media (min-width:1000px){.bills{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.bill{border-radius:18px;padding:18px}}
'''
k = s.index("/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.2")
s = s[:k] + CSS + "\n" + s[k:]

# 8) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
