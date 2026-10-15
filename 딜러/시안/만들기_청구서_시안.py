"""딜러앱 d3.2 위에 «③ 청구서 — 업체별 청구서 묶음 + 계좌이체 안내» 시안을 만든다. 원본은 읽기만 한다.
쓰는 법: python3 딜러/시안/만들기_청구서_시안.py
결과: 딜러/시안/딜러앱_청구서_시안.html (시연 화면으로만 열림 · 업체 · 계좌 · 금액은 모두 지어낸 예시)
근거: 결제/요청서/2026-10-15_딜러_청구서_묶음_화면.md · 결정 기록 2026-10-15 (돈은 차곳간을 거치지 않음)
안 넣는 것: 결제 단추 · 카드 결제 (2단계, 토스 지급대행 계약 뒤)
실제 파일 반영은 서버 창구 myBills + 보안 검토 뒤."""
ROOT = "/home/user/chagotgan/딜러"
SRC = ROOT + "/3_딜러앱_화면_d3.2/index.html"
OUT = ROOT + "/시안/딜러앱_청구서_시안.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 0) 시안 표시 · 늘 시연 화면
rep("<title>차곳간 딜러</title>", "<title>딜러앱 청구서 시안</title>")
rep('<script>\n"use strict";', '<script>window.__DEMO=true;</script>\n<script>\n"use strict";')
rep('var VER="d3.2";', 'var VER="d3.2 · 청구서 시안";')

# 1) 예시 청구서 (업체 3곳: 기한 지남 1 · 입금 전 1 · 입금 확인됨 1) — 모두 지어낸 것
rep("function demoApi(fn,a){", r'''function dday(n){var d=new Date(Date.now()+n*864e5);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
var DEMO_BILLS=[
 {code:"EX1",shop:"한결광택 (예시)",kind:"광택·세차",month:"9월",cars:6,amount:780000,due:dday(-3),paid:false,bank:"예시은행",acct:"000-1111-2222-01",holder:"한결광택"},
 {code:"EX2",shop:"바른리페어 (예시)",kind:"판금·도색",month:"9월",cars:3,amount:1250000,due:dday(5),paid:false,bank:"예시은행",acct:"000-3333-4444-02",holder:"바른리페어"},
 {code:"EX3",shop:"새빛휠 (예시)",kind:"휠 복원",month:"9월",cars:2,amount:180000,due:dday(-1),paid:true,paidAt:dday(-2),bank:"예시은행",acct:"000-5555-6666-03",holder:"새빛휠"}];
function demoApi(fn,a){''')
rep('      if(fn==="cars")return ok({list:DEMO_CARS.slice(),done:S.done});',
    '      if(fn==="cars")return ok({list:DEMO_CARS.slice(),done:S.done});\n      if(fn==="myBills")return ok({list:DEMO_BILLS.slice()});')

# 2) 청구서 자료 불러오기 (실제 판에서는 서버 창구 myBills — 서버 방이 만들 예정)
rep("function loadCars(){\n  return api(\"cars\")", "function loadBills(){return api(\"myBills\").then(function(r){S.bills=(r&&r.list)||[];render();},function(){S.bills=[];render();});}\nfunction loadCars(){\n  loadBills();\n  return api(\"cars\")")

# 3) 청구서 화면
i = s.index("function billsView(){"); j = s.index("function histView(){")
BILLS = r'''/* ③ 청구서 — 업체별 묶음 + 계좌이체 안내 (결제 단추 없음 · 돈은 차곳간을 거치지 않음) */
function dueLeft(d){var t=sod(new Date()),x=new Date(d+"T00:00:00");return Math.round((x-t)/864e5);}
function dueTxt(b){if(b.paid)return "입금 확인됨 · "+b.paidAt.slice(5).replace("-","/");var n=dueLeft(b.due),md=b.due.slice(5).replace("-","/");
  return n<0?"기한 "+md+" · "+(-n)+"일 지남":n===0?"기한 오늘("+md+")":"기한 "+md+" · "+n+"일 남음";}
function billList(){var L=(S.bills||[]).slice();
  L.sort(function(a,b){if(a.paid!==b.paid)return a.paid?1:-1;return a.due<b.due?-1:a.due>b.due?1:0;});return L;}
function billSum(){return (S.bills||[]).filter(function(b){return !b.paid;}).reduce(function(a,b){return a+(Number(b.amount)||0);},0);}
function billsView(){
  if(!S.bills)return '<div class="card" style="color:var(--sub);text-align:center">청구서를 불러오는 중…</div>';
  var L=billList(),open=L.filter(function(b){return !b.paid;}),late=open.filter(function(b){return dueLeft(b.due)<0;});
  var first=open.length?open.reduce(function(a,b){return a.due<b.due?a:b;}):null;
  var h=hello('청구서 · '+today(),open.length?'이번 달 낼 금액 <em>'+won(billSum())+'</em>':'낼 청구서가 없어요',
    open.length?'업체 '+open.length+'곳'+(late.length?' · <b style="color:var(--stop)">기한 지난 곳 '+late.length+'곳</b>':'')+' · 가장 빠른 기한 '+first.due.slice(5).replace("-","/"):'업체가 청구서를 보내면 여기에 모여요.');
  if(!L.length)return h;
  return h+'<div class="bills">'+L.map(function(b){var n=dueLeft(b.due),st=b.paid?"b-done":n<0?"b-late":"b-open";
    var pay=b.bank+' '+b.acct+' '+b.holder;
    return '<div class="bill '+st+'"><div class="bh"><div><b>'+esc(b.shop)+'</b><small>'+esc(b.kind)+' · '+esc(b.month)+' · '+b.cars+'대</small></div>'+
      '<span class="pill p-'+(b.paid?'fin':n<0?'late':'arr')+'" style="margin:0">'+(b.paid?'입금 확인됨':n<0?'기한 지남':'입금 전')+'</span></div>'+
      '<div class="bm"><strong class="num">'+won(b.amount)+'</strong><span>'+esc(dueTxt(b))+'</span></div>'+
      (b.paid?'':'<div class="acct"><span>'+esc(b.bank)+' <b class="num">'+esc(b.acct)+'</b> · 예금주 '+esc(b.holder)+'</span></div>'+
        '<div class="bb"><button class="btn sec2" data-act="copy" data-v="'+esc(pay)+'" data-m="계좌를">계좌 복사</button><button class="btn sec2" data-act="copy" data-v="'+esc(String(b.amount))+'" data-m="금액을">금액 복사</button>'+
        '<button class="btn sec2" data-act="billView" data-v="'+esc(b.code)+'">내역 보기</button></div>')+
      (b.paid?'<div class="bb"><button class="btn sec2" data-act="billView" data-v="'+esc(b.code)+'">내역 보기</button></div>':'')+'</div>';}).join("")+'</div>'+
   (open.length?'<div class="note">휴대폰이면 «계좌 복사»를 누른 뒤 은행 앱을 열어 붙여 넣어 주세요. 금액도 따로 복사할 수 있어요.<br>입금하면 업체가 확인한 뒤 «입금 확인됨»으로 바뀌어요. 차곳간은 금액을 받지 않고, 업체 계좌로 바로 보내요.</div>':'')+
   '<details class="help"><summary>이 화면 사용법</summary><p>업체마다 한 달 치 청구서가 한 장씩 모여요. 기한이 지난 것이 맨 위에 와요. «내역 보기»를 누르면 업체가 보낸 청구서(차별 작업과 금액)를 볼 수 있어요. 한 번에 결제하는 기능은 나중에 열려요.</p></details>';
}
'''
s = s[:i] + BILLS + s[j:]

# 4) 복사 · 내역 보기 동작
rep('''  if(a==="filter"){S.filter=v;render();return;}''', '''  if(a==="filter"){S.filter=v;render();return;}
  if(a==="copy"){var what=el.getAttribute("data-m")||"";
    var done=function(){toast(what+" 복사했어요");},fail=function(){S.sheet="copy";S.copyText=v;render();};
    try{navigator.clipboard.writeText(v).then(done,fail);}catch(e){fail();}return;}
  if(a==="billView"){toast("업체가 보낸 청구서 화면(차별 작업 · 금액)이 열려요 — 시안이라 열리지 않아요");return;}''')
rep('''  if(k==="logout")inner=''', '''  if(k==="copy")inner='<h3>복사하지 못했어요</h3><p style="margin:0;color:var(--sub);font-size:14px">아래 글을 길게 눌러 복사해 주세요.</p><input readonly value="'+esc(S.copyText||"")+'" onfocus="this.select()" style="border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:12px;padding:12px;font:inherit"><button class="btn sec2" data-act="close">닫기</button>';
  if(k==="logout")inner=''')

# 5) 홈 숫자 카드 — 청구서가 열리면 «이번 주 입고된 차» → «결제할 청구서 금액» (디자인 기준서 4-1 «청구서가 열리면» 줄 · 대표님 확인 대기)
rep('''         ["이번 주 입고된 차",g.wk,"#0B2545",(d>=0?"+":"−")+Math.abs(d),"전체"],''',
    '''         ["결제할 청구서 금액",won(billSum()).replace("원",""),"#0B2545","","BILLS","원"],''')
rep("""(i===2?spk(g.spark,k[2]):'')""", "''")
rep("""'<strong>'+k[1]+'<em>대</em></strong>""", """'<strong>'+k[1]+'<em>'+(k[5]||"대")+'</em></strong>""")
rep('''  if(a==="go"){S.filter=v||"전체";''', '''  if(a==="go"&&v==="BILLS"){S.tab="bills";S.view="main";render();try{window.scrollTo(0,0);}catch(e){}return;}
  if(a==="go"){S.filter=v||"전체";''')

# 6) 모양
CSS = r'''
/* 청구서 시안 */
.bills{display:grid;gap:10px}
.bill{background:var(--card);border-radius:14px;box-shadow:var(--shadow);padding:14px;display:flex;flex-direction:column;gap:10px;border-left:4px solid var(--chk);min-width:0}
.bill.b-late{border-left-color:var(--stop)} .bill.b-done{border-left-color:var(--done);opacity:.85}
.bh{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}
.bh b{font-size:15px} .bh small{display:block;color:var(--sub);font-size:12px;margin-top:2px}
.bm{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.bm strong{font-size:22px;font-weight:900;letter-spacing:-.4px}
.bm span{font-size:12.5px;color:var(--sub)}
.bill.b-late .bm span{color:var(--stop);font-weight:700}
.acct{background:var(--bg);border-radius:10px;padding:9px 11px;font-size:13px}
.bb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.bb .btn{min-height:36px;padding:8px 6px;font-size:13px}
.bill.b-done .bb{grid-template-columns:1fr}
.p-late{background:var(--stop-bg);color:var(--stop)}
@media (min-width:1000px){.bills{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.bill{border-radius:18px;padding:18px}}
'''
k = s.rindex("</style>")
s = s[:k] + CSS + s[k:]

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
