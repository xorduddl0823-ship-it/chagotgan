"""체크 v21(운영 중) → 체크 v22 새 판을 만든다. 운영 파일은 읽기만 한다.
쓰는 법: python3 체크/도구/만들기_체크_v22.py
바꾸는 것 (대표님 2026-10-14 결정 · 운영/요청서/2026-10-14_05_전부_실행.md):
  1) 메뉴를 J안 4판 묶음으로: 홈 · 매출 · 정산 기록(3번째 그대로) · 청구서 · 입출금 · 세금계산서 · 알림 · 설정
  2) 설정 안 세 가지 옮김(「가」안): 자료 올리기 → 매출 안 / 휴지통 → 사람 단추(마이페이지) 안 / 도움말 → 머리말 「도움말」
  3) 「예전 자료 가져오기(가온정산)」는 검사소 코드 GAON 일 때만 보임
  4) 겉모양을 J안 4판 값으로 (남색 머리말, 색 · 모서리 · 버튼 · 표 · 상태 색)
"""
import os
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index.html"
OUT = BASE + "2_차곳간_체크_index_v22.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 1) 메뉴 묶음 ──
rep('''var JOBS=[["home","홈"],["sales","매출 내역"],["history","정산 기록"],["bill","월별 청구서"],
  ["deposit","입·출금 내역"],["hometax","세금계산서"],
  ["unpaid","보험료 대조"],["remind","재검사 알림"],
  /* 모듈2 배달알림 — 떼어낼 때 이 한 줄만 지우면 됩니다 */ ["deliv","차량 배달 알림"],
  ["set","설정 ▸"]];
var SETS=[["files","자료 올리기"],["price","단가표"],["partner","거래처"],["popbill","팝빌 연동"],["fee","검사자 수수료"],
  ["sms","문자 자동수집"],["alarm","알림 소리"],["backup","백업 설정"],["trash","휴지통"],["help","도움말"]];
/* 보험료 미납 대조는 입금 내역 안쪽 작은 탭으로 들어갑니다 */
var DEPSUB=[["deposit","입금 내역"]];''',
'''/* J안 4판 메뉴 (v22) — 일하는 차례 그대로. 「정산 기록」은 이름 · 자리(3번째) 그대로.
   묶음 안 화면은 머리말 아래 작은 탭(#setSub)으로 나옵니다. */
var JOBS=[["home","홈"],["sales","매출"],["history","정산 기록"],["bill","청구서"],
  ["deposit","입출금"],["hometax","세금계산서"],["remind","알림"],["set","설정"]];
/* 설정 안 — 자료 올리기는 «매출» 안으로, 휴지통은 마이페이지 안으로, 도움말은 머리말로 옮겼습니다 (「가」안) */
var SETS=[["price","단가표"],["partner","거래처"],["popbill","팝빌 연동"],["fee","검사자 수수료"],
  ["sms","문자 자동수집"],["alarm","알람 소리"],["backup","설정 백업"]];
var SALESUB=[["sales","매출 내역"],["files","자료 올리기"]];
/* 보험료 미납 대조는 «입출금» 안쪽 작은 탭으로 들어갑니다 */
var DEPSUB=[["deposit","입금 내역"],["unpaid","보험료 대조"]];
var ALSUB=[["remind","재검사 알림"],
  /* 모듈2 배달알림 — 떼어낼 때 이 한 줄만 지우면 됩니다 */ ["deliv","차량 배달 알림"]];''')

rep('''function subTabs(now){ return subBar(DEPSUB, now); }
function billTabs(now){ return subBar(BILLSUB, now); }''',
'''/* 작은 탭은 이제 머리말 아래 한 곳(#setSub)에서만 그립니다 — 화면 안에서는 그리지 않음 */
function subTabs(now){ return ""; }
function billTabs(now){ return ""; }
/* 큰 메뉴 하나 → 그 안의 작은 탭 */
function groupOf(p){
  if(SALESUB.some(function(x){return x[0]===p;})) return ["sales",SALESUB];
  if(BILLSUB.some(function(x){return x[0]===p;})) return ["bill",BILLSUB];
  if(DEPSUB.some(function(x){return x[0]===p;})) return ["deposit",DEPSUB];
  if(p==="remind" || (typeof DELIVSUB!=="undefined" && DELIVSUB.some(function(x){return x[0]===p;}))) return ["remind",ALSUB];
  if(SETS.some(function(x){return x[0]===p;})) return ["set",SETS];
  return [p,null];
}''')

rep('''function drawTabs(){
  $("tabs").innerHTML=JOBS.map(function(t){
    var on=(t[0]==="set") ? (SETS.some(function(s){return s[0]===page;}))
         : (t[0]==="deposit") ? (page==="deposit")
         : (t[0]==="bill") ? BILLSUB.some(function(x){return x[0]===page;})
         : (t[0]==="deliv") ? DELIVSUB.some(function(x){return x[0]===page;})
         : (page===t[0]);
    return '<button role="tab" aria-selected="'+(on?"true":"false")+'" data-go="'+t[0]+'">'+t[1]+'</button>';
  }).join("");
  var open=SETS.some(function(s){return s[0]===page;});
  $("setSub").hidden=!open;
  if(open) $("setSub").innerHTML=SETS.map(function(s){
    return '<button role="tab" aria-selected="'+(page===s[0]?"true":"false")+'" data-go="'+s[0]+'">'+s[1]+'</button>';
  }).join("");''',
'''function drawTabs(){
  var G=groupOf(page);
  $("tabs").innerHTML=JOBS.map(function(t){
    var on=(G[0]===t[0]);
    return '<button role="tab" aria-selected="'+(on?"true":"false")+'" data-go="'+t[0]+'">'+t[1]+'</button>';
  }).join("");
  var subs=G[1];
  $("setSub").hidden=!subs;
  /* 차량 배달 알림 안쪽 탭(배달 기록 · 목적지별 …)에 있어도 «차량 배달 알림»에 불이 들어옵니다 */
  var cur=(G[0]==="remind" && page!=="remind") ? "deliv" : page;
  if(subs) $("setSub").innerHTML=subs.map(function(s){
    return '<button role="tab" aria-selected="'+(cur===s[0]?"true":"false")+'" data-go="'+s[0]+'">'+s[1]+'</button>';
  }).join("");''')

rep('''  page=(k==="set")?"files":k;''', '''  page=(k==="set")?SETS[0][0]:k;''')
rep('''partner:"거래처", popbill:"팝빌", fee:"수수료", sms:"문자수집", alarm:"알림",''',
    '''partner:"거래처", popbill:"팝빌", fee:"수수료", sms:"문자수집", alarm:"알람소리",''')

# 화면 제목도 메뉴 이름과 같게 («알림 설정» → «알람 소리») — 규칙 4-4
i = s.index("PAGE.alarm=function(){")
seg = s[i:i+400]
if 'head("알림 설정"' in seg:
    s = s[:i] + seg.replace('head("알림 설정"', 'head("알람 소리"', 1) + s[i+400:]

# ── 2) 휴지통 → 마이페이지(사람 단추) 안, 도움말 → 머리말 한 곳 ──
rep('''    '<div class="mpout"><button class="btn danger" data-mp="out">로그아웃</button></div>' +''',
    '''    '<div class="mcard"><div class="mh"><b>휴지통</b><span>지운 자료를 되돌려요</span></div>' +
      '<div class="mrow2"><button class="btn" data-mp="trash">휴지통 열기</button></div></div>' +
    '<div class="mpout"><button class="btn danger" data-mp="out">로그아웃</button></div>' +''')
rep('''      else if (k === "out") { closeSheet(); $("btnOut").click(); }''',
    '''      else if (k === "out") { closeSheet(); $("btnOut").click(); }
      else if (k === "trash") { closeSheet(); go("trash"); }''')
rep('''<button class="mini" id="btnHelp">❓ 도움말</button>''', '''<button class="mini" id="btnHelp">도움말</button>''')
rep('''<button class="mini" id="btnLink" title="이 화면 주소를 복사합니다">🔗 주소</button>''',
    '''<button class="mini" id="btnLink" title="이 화면 주소를 복사합니다">링크 복사</button>''')
rep('''b.innerHTML="📢 공지";''', '''b.innerHTML="공지사항";''')
rep('''    b.innerHTML = '📢 공지' + ''', '''    b.innerHTML = '공지사항' + ''')
rep('''title="지운 자료 되돌리기">🗑 휴지통</button>''', '''title="지운 자료 되돌리기">휴지통</button>''')
rep('''<span class="mypglb">👤 마이페이지</span>''', '''<span class="mypglb">마이페이지 · 휴지통 ▾</span>''')

# ── 3) 가온정산 가져오기 — 검사소 코드 GAON 일 때만 ──
rep('''  card("예전 자료 가져오기","가온정산 → 설정''',
    '''  (ST.officeCode!=="GAON" ? "" :   /* 가온 업체에만 보입니다 (대표님 2026-10-14). 서버도 막도록 서버 방에 요청함 */
  card("예전 자료 가져오기","가온정산 → 설정''')
rep('''        return '<span class="chip">'+k+' '+won(COUNTS[k]||0)+'</span>'; }).join("")+'</div>')+''',
    '''        return '<span class="chip">'+k+' '+won(COUNTS[k]||0)+'</span>'; }).join("")+'</div>'))+''')
rep('''    if(o.name){ ST.shopName=o.name; set("cgg_shopname",o.name); }''',
    '''    if(o.name){ ST.shopName=o.name; set("cgg_shopname",o.name); }
    var oc=String(o.code||"").toUpperCase();
    if(oc!==ST.officeCode){ ST.officeCode=oc; if(page==="files") draw(); }''')
rep('''           ym:get("cgg_ym", todayYm()), busy:false, ver:"" };''',
    '''           ym:get("cgg_ym", todayYm()), busy:false, ver:"", officeCode:"" };''')

# ── 가입 · 로그인 · 오류 안내는 일반 사이트 표준형 (규칙 4-1, 대표님 2026-10-15) ──
rep('''>들어가기<''', '''>로그인<''')
rep('''들어가는 중…''', '''로그인 중…''')
rep('''들어가지 못했습니다.''', '''로그인하지 못했습니다.''')
rep('''로그인이 풀렸습니다. 다시 들어와 주세요.''', '''로그인 시간이 지났습니다. 다시 로그인해 주세요.''')
rep('''뭔가 잘못되었습니다.''', '''오류가 발생했습니다. 잠시 후 다시 시도해 주세요.''', 2)
rep('''서버에 닿지 못했습니다.''', '''서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.''')

# 자료 올리기 자리가 바뀐 것을 안내 글에도
rep('''<small>설정 → 자료 올리기</small>''', '''<small>매출 → 자료 올리기</small>''')
rep('''설정 ▸ 자료 올리기에 ''', '''매출 › 자료 올리기에 ''')

# ── 판 번호 ──
rep('''  $("hdVer").textContent=(_m?(_m[0]+" · "):"")+"UI 1.1";
  $("hdVer").title=_v||"UI 1.1";''',
    '''  $("hdVer").textContent="체크 v22 · "+(_m?("서버 "+_m[0]+" · "):"")+"UI 3.0";
  $("hdVer").title=_v||"UI 3.0";''')

# ── 4) J안 4판 겉모양 — 맨 끝에 두어 앞의 모양보다 이기게 ──
J = '''
<!-- ===== J안 4판 겉모양 (체크 v22) — 값은 디자인/01_J안_제품별_시안_기준.md 2-6장 그대로 ===== -->
<style id="cgg-j4">
:root{--bg:#F3F5F8;--surface:#FFFFFF;--surface2:#F7F9FC;--line:#EAECF0;--text:#101828;--muted:#667085;
  --brand:#1668C4;--brand-soft:#E8F1FC;--accent:#0B2545;--sky:#8FC9F2;
  --good:#1E9E5A;--good-soft:#E4F5EC;--warn:#B26B00;--warn-soft:#FFF2DD;--danger:#D64545;--danger-soft:#FDE8E8;
  --shadow:0 1px 2px #1018280d,0 12px 32px -20px #0B254540;--r:18px;--j-navy:#0B2545;--j-ctl:43px}
body{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}
/* 머리말 — 남색 */
#wrap>header{background:var(--j-navy);color:#fff;border:0;box-shadow:none;margin-left:-14px;margin-right:-14px;padding:12px 22px 0;border-radius:0 0 18px 18px}
#wrap>header .logo{background:var(--sky);color:var(--j-navy);box-shadow:none}
#wrap>header h1{color:#fff}
#wrap>header .sub,#wrap>header #hdVer{color:#fff;opacity:.72}
#wrap>header .bizname{border-color:#ffffff30}
#wrap>header .bizname b{color:#fff;-webkit-text-stroke:0}
#wrap>header .bizname small{color:#ffffffb3}
#wrap>header .mini{height:32px;border-radius:10px;border:1px solid #ffffff30;background:#ffffff12;color:#fff;font-weight:500}
#wrap>header .mini:hover{background:#ffffff22}
#wrap>header #pollSel{color:#fff;background-color:#ffffff12}
#wrap>header #pollSel option{color:#101828}
#wrap>header #dbState{background:#ffffff12;border-color:#ffffff30;color:#fff}
#wrap>header #btnTrash{display:none}
#wrap>header #hWho{background:#ffffff12;border-color:#ffffff30;color:#fff;border-radius:999px}
/* 큰 메뉴 — 남색 띠 위 흰 글자, 고른 칸은 하늘색 밑줄 */
#wrap>header #tabs{background:transparent;padding:6px 0 0;margin-top:10px;gap:4px;border-radius:0;box-shadow:none}
#wrap>header #tabs button{background:transparent;color:#ffffffb8;border:0;border-radius:10px 10px 0 0;box-shadow:none;font-size:14.5px;font-weight:500;padding:11px 14px}
#wrap>header #tabs button:hover{color:#fff;background:#ffffff12}
#wrap>header #tabs button[aria-selected="true"]{color:#fff;font-weight:700;background:#ffffff14;box-shadow:inset 0 -3px 0 var(--sky)}
/* 작은 탭 — 머리말 아래 흰 바탕 알약 */
#wrap>header #setSub{background:var(--bg);margin:0 -22px;padding:12px 22px;gap:6px;border-radius:0;box-shadow:none}
#wrap>header #setSub::before{content:none;display:none}
#wrap>header #setSub button{height:34px;padding:0 14px;border-radius:999px;border:1px solid #E3E8EE;background:#fff;color:var(--muted);font-size:13px;font-weight:500;box-shadow:none;flex:none}
#wrap>header #setSub button[aria-selected="true"]{background:var(--brand-soft);color:var(--brand);border-color:transparent;font-weight:700}
/* 카드 · 버튼 · 표 · 상태 */
.card{border:0;border-radius:18px;box-shadow:var(--shadow);background:var(--surface)}
.btn{min-height:var(--j-ctl);border-radius:12px;border:1px solid #E3E8EE;font-weight:700;font-size:14px;color:#344054;background:#fff}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff;box-shadow:0 6px 16px -8px #1668C4cc}
.btn.danger{color:var(--danger)}
table th{height:40px;font-size:12.5px;font-weight:700;color:var(--muted);background:#fff}
table td{height:50px;border-color:#F0F2F5}
table tbody tr:hover td{background:#F7F9FC}
input[type=checkbox]{width:20px;height:20px;accent-color:var(--brand)}
.photobox{border-radius:14px;border:2px dashed #D0D5DD}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .btn{background:var(--surface);color:var(--text);border-color:var(--line)}
  :root:not([data-theme="light"]) table th,:root:not([data-theme="light"]) table td{background:transparent}}
:root[data-theme="dark"] .btn{background:var(--surface);color:var(--text);border-color:var(--line)}
:root[data-theme="dark"] table th,:root[data-theme="dark"] table td{background:transparent}
/* 폰 (가로 600 이하) — 같은 파일, 따로 만들지 않음 */
@media (max-width:600px){
  #wrap>header{padding:8px 12px 0;border-radius:0 0 14px 14px;margin-left:-14px;margin-right:-14px}
  #wrap>header .brandrow{flex-wrap:wrap;align-items:center;gap:8px 10px}
  #wrap>header .hdr-right{order:3;flex:1 1 100% !important;width:100% !important;max-width:none !important;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:flex-start;align-items:center;gap:6px;margin:0 !important}
  #wrap>header #hdrBreak{display:none !important}
  #wrap>header .hdr-right>*{width:auto;margin:0}
  #wrap>header #pollSel,#wrap>header #dbState,#wrap>header #btnLink{display:none}
  #wrap>header .mini{height:32px;padding:0 10px;font-size:12.5px}
  #wrap>header #hWho{margin-left:auto}
  #wrap>header #tabs{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
  #wrap>header #tabs button{flex:none;font-size:13.5px;padding:10px 11px}
  #wrap>header #setSub{margin:0 -12px;padding:10px 12px;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
  .card{border-radius:14px}
  .btn{min-height:38px;font-size:13px;border-radius:10px}
  /* 홈 「일정」 달력이 폰 너비를 넘지 않게 (v21부터 있던 문제) */
  .dow,.cal{grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
  .cal .d{min-width:0;min-height:58px;padding:4px 3px;overflow:hidden}
  .cal .amt{font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cal .cars,.cal .memo{font-size:9.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dow span{font-size:11px}
  .homegrid{grid-template-columns:minmax(0,1fr) !important}
  .homegrid>.hgL>.card,.homegrid>.hgR>.card,.homegrid .card>*{min-width:0}
  .homegrid .tools{flex-wrap:wrap}
}
</style>
'''
k = s.rindex("</body>")
s = s[:k] + J + s[k:]

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
