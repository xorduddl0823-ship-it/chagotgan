"""워시 v120 → 워시 v121 새 판. J안 4판 «완성 모양» + v120 까지의 기능 모두 (대표님 결정 2026-10-15 «새 디자인 먼저, 기능은 그 위에, 시험은 한 번»)
쓰는 법: 만들기_워시_v112 → … → v120 → v121 차례로 (`워시/도구/`)
기준: 디자인/01_J안_제품별_시안_기준.md · 08_차곳간_합친디자인_J.html · 디자인/공통 cgg-j4 1.2 · 디자인/02_미리써보기_연출_기준.md
바꾸는 것:
  1) 공통 부품 cgg-j4 1.1 → 1.2 (글자 그대로) — 체험 모드 CGG.trial
  2) 본문 «화면 일곱 칸»: ② 묶음 이름 › 제목(말하는 제목) + 설명 · 오른쪽 위 버튼 ④ 도구줄 ⑤ 숫자 카드(J 모양 · 홈은 지난주보다 + 작은 그래프)
     ⑥ 표(머리줄 40 · 줄 50 · 직접 그린 선택 네모 20 · 상태 칩) ⑦ 접힌 «이 화면 사용법» — 완성 CSS `cgg-j4_워시_완성.css`
  3) 창 3종 — 확인 400 · 입력 560 · 자세히 520(오른쪽에서) · [취소][동작] 오른쪽 아래 · 브라우저 기본 알림창(alert) 0개
  4) 안쪽 작은 탭을 남색 머리말 밖(본문 맨 위)으로
  5) 그림 문자(이모지) → 빼거나 선 아이콘 (기준서 2-2) · «단추» → «버튼» · J안 «말 바꾼 곳» 표 중 워시에 있는 말
  6) 입출고 내역(대표 목록): 말하는 제목 «작업 중인 차 ○대, 수금 대기 ○대가 있어요» · 상태별 탭 + 개수 · 오른쪽 위 버튼(파란 버튼 하나)
  7) 체험 모드 자리 — 체험판 계정이면 맨 위 띠(CGG.trial.band) · 잠금 14 중 화면에 있는 버튼에 자물쇠 + 누르면 안내 창 (진짜 잠금은 서버)
운영 v111 · v112~v120 은 덮어쓰지 않는다. 서버 주소 · 창구 · 저장 방식 · 보내는 알림 글은 한 글자도 바꾸지 않는다.
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v120.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v121.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
assert 'version:"cgg-j4 1.2"' in JS, "공통 부품이 1.2 가 아님"
DONE = open(os.path.join(HERE, "cgg-j4_워시_완성.css"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v120 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v121 · UI 3.0 · 2026-10-15";')

# ───── 1) 공통 부품 1.1 → 1.2 (글자 그대로) ─────
a = s.index('<style id="cgg-j4">\n') + len('<style id="cgg-j4">\n'); b = s.index('\n</style>', a)
s = s[:a] + CSS + s[b:]
rep('<!-- ===== 차곳간 공통 부품 cgg-j4 1.1 (디자인/공통 — 글자 그대로) ===== -->', '<!-- ===== 차곳간 공통 부품 cgg-j4 1.2 (디자인/공통 — 글자 그대로) ===== -->')
mark = '/* 차곳간 공통 부품 cgg-j4 1.1 (디자인/공통/cgg-j4.js — 글자 그대로) */\n'
a = s.index(mark); b = s.index('\n</script>', a)
s = s[:a] + '/* 차곳간 공통 부품 cgg-j4 1.2 (디자인/공통/cgg-j4.js — 글자 그대로) */\n' + JS + s[b:]

# ───── 2) 완성 CSS — 워시 이음 다음 ─────
a = s.index('<style id="cgg-j4-wash">'); b = s.index('</style>', a) + len('</style>')
s = s[:b] + '\n<!-- ===== 워시 v121 · J안 4판 완성 모양 (워시/도구/cgg-j4_워시_완성.css) ===== -->\n<style id="cgg-j4-wash-done">\n' + DONE + '</style>' + s[b:]

# ───── 4) 안쪽 작은 탭 → 본문 맨 위 · 체험 띠 자리 ─────
rep('<div class="tabs cgg-sub" id="setSub" hidden></div>\n</header>\n<main class="cgg-main">',
    '</header>\n<main class="cgg-main">\n<div id="cggTrialBand"></div>\n<div class="tabs cgg-sub" id="setSub" hidden></div>')

# ───── 5) 그림 문자 → 선 아이콘 / 빼기 ─────
SVG_IN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>'
SVG_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg>'
rep('<span class="ic">⬇</span><span class="tx">입고</span>', '<span class="ic">' + SVG_IN + '</span><span class="tx">입고</span>')
rep('<span class="ic">⬆</span><span class="tx">출고</span>', '<span class="ic">' + SVG_OUT + '</span><span class="tx">출고</span>')
rep("""(' <span class="cam">📷'+r.memoPhotos.length+'</span>')""", """(' <span class="cam">사진 '+r.memoPhotos.length+'</span>')""")
# 그림 문자만 있던 자리는 선 아이콘으로 (빼면 빈 버튼이 됨)
def SV(d, sz=""):
    return '<svg class="jic"' + (' style="width:%s;height:%s"' % (sz, sz) if sz else '') + ' viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'
CAM = '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
rep('<div class="top"><span class="cic">📷</span><b>', '<div class="top"><span class="cic">' + SV(CAM) + '</span><b>')
rep('aria-label="사진 촬영">📷</button>', 'aria-label="사진 촬영">' + SV(CAM, "26px") + '</button>')
BIG = {"🔧": '<path d="M14 6a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3z"/>', "✅": '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
       "🚗": '<path d="M3 17h18v-4l-2.2-5.2A1.5 1.5 0 0 0 17.4 7H6.6a1.5 1.5 0 0 0-1.4.8L3 13z"/><path d="M7 17v2M17 17v2M3 13h18"/>'}
for k, d in BIG.items():
    rep('<div style="font-size:44px;line-height:1">' + k + '</div>', '<div style="line-height:1;color:var(--blue)">' + SV(d, "44px") + '</div>')
rep("""'<span style="color:var(--muted);font-size:12px">🔒</span>'""", """'<span style="color:var(--muted);font-size:12px">' + '""" + SV('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', "14px") + """' + '</span>'""")
rep("'<summary><span>⚡</span>", "'<summary><span>" + SV('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>', "16px") + "</span>")
rep("""'<span class="ic">❗</span>'""", """'<span class="ic">""" + SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>', "16px") + """</span>'""")
rep('return [m.time||"📝",', 'return [m.time||"메모",')
rep('<span class="mg">🔍</span>', '<span class="mg">' + SV('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', "16px") + '</span>')
EMO = re.compile(r"[\U0001F300-\U0001FAFF☀-⛿✀-✒✔-✕✗-➿⬆⬇⏰-⏿]️?[  ]?")
KEEP = set("✕★☆✓")
def emo(m):
    return m.group(0) if m.group(0)[0] in KEEP else ""
# 스크립트 · 마크업 모두 (보내는 알림 글에는 그림 문자가 없음 — 확인함). 공통 부품 · 약관은 건드리지 않음
a = s.index('<style id="cgg-j4">'); b = s.index('</style>', s.index('<style id="cgg-j4-wash-done">')) + 8
c = s.index('/* 차곳간 공통 부품 cgg-j4 1.2 (디자인/공통/cgg-j4.js'); d = s.index('\n</script>', c)
segs = sorted([(a, b), (c, d)])
out, pos = [], 0
for x, y in segs:
    out.append(EMO.sub(emo, s[pos:x]).replace("단추", "버튼")); out.append(s[x:y]); pos = y
out.append(EMO.sub(emo, s[pos:]).replace("단추", "버튼"))
s = "".join(out)
# 위에서 «단추» → «버튼»도 함께 (모든 화면, 기준서 «말 바꾼 곳» 마지막 줄) — 공통 부품 글자는 그대로

# ───── J안 «말 바꾼 곳» 중 워시에 있는 말 ─────
W = [
 ('처음 오는 차는 <b style="color:#fff">입고</b>, 작업 중인 차는 <b style="color:#fff">출고</b>로 보냅니다',
  '처음 온 차는 <b style="color:#fff">입고</b>, 작업이 끝난 차는 <b style="color:#fff">출고</b>로 자동 연결돼요', 2),
 ('<span class="step">1</span> 어디 차인가요</h2>', '<span class="step">1</span> 어느 상사 차인가요</h2>', 1),
 ('목록에 없어요 — 직접 넣기</button>', '목록에 없으면 직접 입력</button>', 1),
 ('차량번호 <span style="font-weight:500">(자동 인식 후 고칠 수 있습니다)</span></label>', '차량번호 <span style="font-weight:500">(번호가 틀리면 바로 고칠 수 있어요)</span></label>', 1),
 ('주차 위치 <span style="font-weight:500">(어디에 세웠는지)</span></label>', '주차 위치 <span style="font-weight:500">(예: B-3)</span></label>', 1),
 ('＋ 작업 줄 추가</button>', '＋ 작업 추가</button>', 3),
 ('작업하지 않는 부위·기존 흠집을 사진으로 남겨두면 나중에 다툼이 없습니다.', '원래 있던 흠집을 사진으로 남겨 두면 나중에 확인하기 쉬워요.', 1),
 ('id="btnSave" type="button">입고 등록하고 장부에 올리기</button>', 'id="btnSave" type="button">입고 등록</button>', 1),
 ('id="btnSaveBody" type="button" style="margin-top:8px">입고 처리 + 판금·도색 보냄</button>', 'id="btnSaveBody" type="button" style="margin-top:8px">입고하고 판금·도색 맡기기</button>', 1),
 ('등록하는 순간 작업 의뢰 + 정산 대상이 됩니다.', '등록하면 작업이 시작되고 정산 목록에 들어가요.', 1),
 ('<button data-o="done" aria-selected="false">오늘 나간 차</button>', '<button data-o="done" aria-selected="false">오늘 출고한 차</button>', 1),
 ('아래 목록에서 그 차를 찾아줍니다.', '목록에서 찾아 줘요.', 1),
 ('PC 화면으로 보기 (대표)</button>', 'PC 화면으로 보기</button>', 1),
 ('["search","날짜검색"]', '["search","날짜 검색"]', 1),
 ('<h2>이번 달 수금</h2>', '<h2>이번 달 입금</h2>', 1),
 ("""'<div class="legend"><span>받을 것 <b style="color:var(--warn)">'+won(dueAmt)+'</b></span>'+""",
  """'<div class="legend"><span>남은 금액 <b style="color:var(--warn)">'+won(dueAmt)+'</b></span>'+""", 1),
 ('el.textContent=ok?((narrow?"● ":"연결됨 ")+hhmm(GS.lastAt||Date.now())):(narrow?"안 됨":"저장 안 됨");',
  'el.textContent=ok?((narrow?"● ":"저장됨 ")+hhmm(GS.lastAt||Date.now())):(narrow?"안 됨":"저장 안 됨");', 1),
 # 입출고 내역 아래 버튼 — J «버튼» 줄
 ('<button class="btn" id="lPayed">선택항목 입금 완료</button>', '<button class="btn primary" id="lPayed">선택한 차 입금 완료</button>', 1),
 ('<button class="btn danger" id="lDelSel">선택항목 삭제</button>', '<button class="btn danger" id="lDelSel">선택한 차 지우기</button>', 1),
 ('<option value="5">5개씩</option><option value="10">10개씩</option>\n      <option value="20" selected>20개씩</option><option value="30">30개씩</option><option value="50">50개씩</option>',
  '<option value="5">5개씩 보기</option><option value="10">10개씩 보기</option>\n      <option value="20" selected>20개씩 보기</option><option value="30">30개씩 보기</option><option value="50">50개씩 보기</option>', 1),
 ('<input type="text" id="lq" placeholder="상사·딜러·차량번호·작업 검색">', '<input type="text" id="lq" placeholder="검색 · 상사 · 딜러 · 차량번호 · 작업">', 1),
]
for o, n, c in W:
    rep(o, n, c)

# ───── 3) 창 — 브라우저 기본 알림창 대신 제품 창 · 자세히 창은 오른쪽에서 ─────
rep('    if(!sh){ alert("화면을 열지 못했습니다"); return; }', '    if(!sh){ try{ toast("화면을 열지 못했어요", true); }catch(e){} return; }')
rep('if(box) box(html); else alert("이용기간이 끝나 지금은 보기만 됩니다.");', 'if(box) box(html); else { try{ toast("이용기간이 끝나 지금은 보기만 돼요", true); }catch(e){} }')
rep('if(box) box(html); else alert("차곳간에 알려 드렸습니다. 하루 동안 쓰실 수 있습니다.");', 'if(box) box(html); else { try{ toast("차곳간에 알려 드렸어요. 하루 동안 쓰실 수 있어요"); }catch(e){} }')
rep('      else alert(m);', '      else { try{ toast(m, true); }catch(e){} }')
rep('function closeSheet(){$("sheet").classList.remove("show");$("sheetbg").classList.remove("show");}',
    'function closeSheet(){$("sheet").classList.remove("show","jside");$("sheetbg").classList.remove("show");}')
rep('function sheetEdit(r){', 'function sheetEdit(r){\n  setTimeout(function(){ var sh=$("sheet"); if(sh&&sh.classList.contains("show")) sh.classList.add("jside"); },0);   /* v121: 자세히 창은 오른쪽에서 (520) */')

# ───── 확인 창에 누구 · 몇 대 · 합계 금액 (J 2-5) ─────
rep('  if(!confirmed(ids.length+"건을 수금 완료로 바꿀까요?",this))return;',
    '  if(!confirmed("입금 완료로 바꿀까요?\\n\\n"+jWhoRows(ids),this,"입금 완료"))return;')
rep('  if(!confirmed(ids.length+"건을 지울까요? 장부에서 완전히 빠집니다.",this))return;',
    '  if(!confirmed("고른 차를 지울까요? 휴지통으로 가요.\\n\\n"+jWhoRows(ids),this,"지우기"))return;')
rep('function sheetEdit(r){', r'''/* v121: 확인 창 줄 — 상사 · 대수 · 합계 금액 */
function jWhoRows(ids){
  var rs=ids.map(function(id){return S.records.filter(function(x){return x.id===id;})[0];}).filter(Boolean);
  var cs=[];rs.forEach(function(r){if(r.company&&cs.indexOf(r.company)<0)cs.push(r.company);});
  var amt=rs.reduce(function(a,r){return a+(Number(r.total)||0);},0);
  return "상사 · "+((cs.slice(0,2).join(", ")+(cs.length>2?" 외 "+(cs.length-2)+"곳":""))||"-")+"\n대수 · "+rs.length+"대\n합계 금액 · "+won(amt);
}
function sheetEdit(r){''')

# ───── ⑤ 홈 숫자 카드 4개 — J (이름 · 큰 숫자 + 단위 · 지난주보다 · 작은 그래프) ─────
rep('''    $("homeSums").innerHTML = hs.map(function(x,i){
      return '<div class="sum'+(i===3&&!isManager()?" bad":"")+'">'+
        '<span>'+esc(x[0])+'</span><b>'+x[1]+'</b></div>';
    }).join("");
  }''', '''    $("homeSums").innerHTML = jKpis(totAmt);
  }
  /* v121: 말하는 제목 (J 홈 첫 줄) */
  var say=$("dhSay");
  if(say){
    var wk=S.records.filter(function(r){return statusOf(r)==="입고";}).length;
    say.innerHTML = isManager()
      ? '작업 중인 차 <em>'+wk+'대</em>가 있어요'
      : (dueAmt>0 ? '받을 금액 <em>'+esc(won(dueAmt))+'</em>이 남아 있어요' : '받을 금액이 모두 들어왔어요');
  }''')
rep('''    <div class="sub2" id="dhSub"></div></div>
  <div id="demoBox"></div>''', '''    <h2 class="jsay" id="dhSay"></h2>
    <div class="sub2" id="dhSub"></div></div>
  <div id="demoBox"></div>''')
rep('function renderHome(){', r'''/* ===== v121 · J 숫자 카드 — 오늘 입고 · 작업 중 · 오늘 출고 · 이번 달 청구 금액 (지난주 같은 날과 견줌 · 7일 그래프) ===== */
function jDayKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function jDayOf(iso){var d=new Date(iso);return isNaN(d)?"":jDayKey(d);}
function jSpark(v){
  var mx=Math.max.apply(null,v.concat([1])),mn=Math.min.apply(null,v),n=v.length-1||1,rg=(mx-mn)||1;
  var pts=v.map(function(x,i){return (i*72/n).toFixed(1)+","+(24-(x-mn)/rg*22).toFixed(1);});
  return '<svg class="sp" viewBox="0 0 72 26" aria-hidden="true"><path d="M'+pts.join(" L")+'"/></svg>';
}
function jTrend(now,before,unit){
  if(before==null)return "";
  var d=now-before;
  if(!d)return '<span class="tr eq">지난주와 같아요</span>';
  return '<span class="tr'+(d<0?" dn":"")+'">'+(d>0?"+":"−")+Math.abs(d).toLocaleString("ko-KR")+unit+' <span>지난주보다</span></span>';
}
function jKpis(monthAmt){
  var today=new Date(),D7=[],i;
  for(i=6;i>=0;i--){var d=new Date(today);d.setDate(d.getDate()-i);D7.push(jDayKey(d));}
  var wk=new Date(today);wk.setDate(wk.getDate()-7);var lastK=jDayKey(wk);
  var ins={},outs={};
  S.records.forEach(function(r){var a=jDayOf(r.createdAt);if(a)ins[a]=(ins[a]||0)+1;var b=r.outAt?jDayOf(r.outAt):"";if(b)outs[b]=(outs[b]||0)+1;});
  function busyAt(t){return S.records.filter(function(r){var c=new Date(r.createdAt).getTime();var o=r.outAt?new Date(r.outAt).getTime():Infinity;return c<=t&&o>t;}).length;}
  var end=function(k){return new Date(k+"T23:59:59").getTime();};
  var tk=D7[6];
  var busyNow=S.records.filter(function(r){return statusOf(r)==="입고";}).length;
  var cards=[
    {nm:"오늘 입고",v:ins[tk]||0,u:"대",b:ins[lastK]||0,s:D7.map(function(k){return ins[k]||0;}),c:"var(--run)"},
    {nm:"작업 중",v:busyNow,u:"대",b:busyAt(end(lastK)),s:D7.map(function(k){return k===tk?busyNow:busyAt(end(k));}),c:"var(--chk)"},
    {nm:"오늘 출고",v:outs[tk]||0,u:"대",b:outs[lastK]||0,s:D7.map(function(k){return outs[k]||0;}),c:"var(--done)"}
  ];
  if(isManager()){
    var cs={};S.records.forEach(function(r){if(r.company)cs[r.company]=1;});
    cards.push({nm:"거래 상사",v:Object.keys(cs).length,u:"곳",b:null,s:null,c:"var(--navy)"});
  }else{
    cards.push({nm:"이번 달 청구 금액",v:monthAmt||0,u:"원",b:null,s:null,c:"var(--navy)",money:true});
  }
  return cards.map(function(x){
    var num=x.money?Number(x.v).toLocaleString("ko-KR"):String(x.v);
    return '<div class="sum"><span><i class="kd" style="background:'+x.c+'"></i>'+esc(x.nm)+'</span>'+
      '<b>'+num+'<em>'+x.u+'</em></b>'+(x.s?jSpark(x.s):"")+jTrend(x.v,x.b,x.u)+'</div>';
  }).join("");
}
function renderHome(){''')

# ───── 2) · 6) · 7) 화면 머리 · 대표 목록 · 도움 카드 · 체험 모드 ─────
rep('function refreshDatalists(){', r'''/* ===== v121 · J 화면 일곱 칸 — ② 묶음 이름 › 제목 · ⑦ 이 화면 사용법 (그린 뒤 한 번 더 손봄) ===== */
var JGROUP={home:"홈",sales:"매출",ledger:"일감",outlog:"일감",bill:"청구서",money:"입출금",tax:"세금계산서",mat:"자재",settings:"설정"};
var JHELP={
  vHome:"할 일 카드를 누르면 그 화면으로 가요. 숫자 카드는 오늘 입고 · 작업 중 · 오늘 출고를 지난주 같은 날과 견줘요. 달력의 날짜를 누르면 그날 메모를 남길 수 있어요.",
  vSales:"올해와 달별 매출을 봐요. 부가세 포함 · 별도를 바꿀 수 있고, 엑셀 다운로드로 표를 받을 수 있어요.",
  vLedger:"들어온 차와 나간 차를 한 표로 봐요. 위 상태 탭으로 거르고, 이름을 누르면 자세히 창이 열려요. 고른 차는 오른쪽 위 버튼으로 입금 완료 · 지우기를 해요.",
  vOutLog:"차가 어디로 갔는지, 딜러에게 알림이 나갔는지 봐요. 아래에서 출고 문자 문구와 보내는 방식을 고쳐요.",
  vBill:"한 달치 청구서를 딜러별 · 상사별로 만들어요. 미리보기 · 인쇄 · 알림톡 보내기 · 예약 보내기를 여기서 해요.",
  vMoney:"입금 · 출금 내역과 받아야 할 금액을 봐요.",
  vTax:"한 달치 세금계산서를 모아 보고, 발급하거나 홈택스용 엑셀을 만들어요.",
  vMat:"자재 재고와 부족한 자재를 봐요. 자재를 더하고, 산 것 · 쓴 것을 적어요.",
  vSettings:"우리 사업장 · 거래처 · 직원 계정 · 작업 단가 · 알림 같은 기본 값을 정해요. 위 작은 탭에서 고르면 돼요."
};
function jToday(){var d=new Date();return (d.getMonth()+1)+"월 "+d.getDate()+"일 "+"일월화수목금토".charAt(d.getDay())+"요일";}
function jPage(){
  try{
    if(S.mode!=="pc")return;
    var sec=document.querySelector(".cgg-main > section:not([hidden])");
    if(!sec)return;
    var g=JGROUP[S.tab]||"",sub="";
    if(S.tab==="ledger"||S.tab==="outlog")sub=(WORKSUB.filter(function(x){return x[0]===S.tab;})[0]||[])[1]||"";
    else if(S.tab==="settings")sub=(SETSUB.filter(function(x){return x[0]===S.setSub;})[0]||[])[1]||"";
    var heads=document.querySelectorAll(".cgg-main section:not([hidden]) .dashhead");
    Array.prototype.forEach.call(heads,function(h){
      if(h.offsetParent===null)return;
      var hd=h.querySelector(":scope > .jhd");
      if(!hd){
        hd=document.createElement("div");hd.className="jhd";
        var kids=Array.prototype.slice.call(h.children).filter(function(k){return !k.classList.contains("jacts")&&!k.classList.contains("mpop");});
        h.insertBefore(hd,h.firstChild);kids.forEach(function(k){hd.appendChild(k);});
      }
      var cr=hd.querySelector(":scope > .jcrumb");
      if(!cr){cr=document.createElement("small");cr.className="jcrumb";hd.insertBefore(cr,hd.firstChild);}
      var h2=hd.querySelector("h2:not(.jsay)");
      var nm=(S.tab==="home")?"":(sub||(h2&&!h2.__jsay?h2.textContent:"")||"");
      cr.innerHTML=esc(g)+(nm&&nm!==g?' › <b>'+esc(nm)+'</b>':"")+' · '+esc(jToday());
    });
    if(S.tab==="ledger")jLedger();
    /* ⑦ 이 화면 사용법 — 보이는 마지막 칸 아래 하나만 */
    var secs=document.querySelectorAll(".cgg-main > section:not([hidden])"),last=secs[secs.length-1];
    var hk=(S.tab==="settings")?"vSettings":(sec.id==="vSettings"&&last?last.id:sec.id);
    var tx=JHELP[hk]||JHELP[sec.id]||"";
    var dt=$("jHelp");
    if(!dt){dt=document.createElement("details");dt.className="jhelp";dt.id="jHelp";}
    if(tx&&last){
      if(dt.__k!==hk){dt.__k=hk;dt.open=false;
        dt.innerHTML='<summary>이 화면 사용법</summary><p>'+esc(tx)+'</p><button type="button" class="btn" data-jhelp="1">자세한 도움말 보기</button>';
        dt.querySelector("[data-jhelp]").onclick=function(){var b=$("btnHelp");if(b)b.click();};}
      if(dt.parentNode!==last||last.lastElementChild!==dt)last.appendChild(dt);
      dt.hidden=false;
    }else dt.hidden=true;
    /* 파란 버튼은 한 화면에 하나만 (J 2-4) — 머리 오른쪽 버튼이 있으면 그것, 없으면 맨 처음 것만 파랗게 */
    var pr=Array.prototype.filter.call(document.querySelectorAll(".cgg-main section:not([hidden]) .btn.primary"),function(e){return e.offsetParent!==null;});
    var keep=pr.filter(function(e){return e.closest(".jacts");})[0]||pr[0];
    pr.forEach(function(e){e.classList.toggle("jdemote",e!==keep);});
    jTrialMarks();
  }catch(e){}
}
/* 입출고 내역 — 말하는 제목 · 상태별 탭 + 개수 · 오른쪽 위 버튼 */
var JST=[["","전체"],["입고","작업 중"],["body","판금·도색 중"],["출고","수금 대기"],["수금완료","수금 완료"]];
function jLedger(){
  var sec=$("vLedger");if(!sec)return;
  var h2=sec.querySelector(".dashhead h2");
  var wk=S.records.filter(function(r){return statusOf(r)==="입고";}).length;
  var due=S.records.filter(function(r){return statusOf(r)==="출고";}).length;
  if(h2){h2.__jsay=1;h2.innerHTML='작업 중인 차 <em>'+wk+'대</em>, 수금 대기 <em>'+due+'대</em>가 있어요';}
  var cr=sec.querySelector(".jcrumb");
  if(cr)cr.innerHTML='일감 › <b>입출고 내역</b> · '+esc(jToday());
  var head=sec.querySelector(".dashhead");
  if(head&&!head.querySelector(".jacts")){
    var ac=document.createElement("div");ac.className="jacts";
    ["lCsv","lDelSel","lPayed"].forEach(function(id){var b=$(id);if(b)ac.appendChild(b);});
    head.appendChild(ac);
  }
  var tb=$("jLTabs");
  if(!tb){tb=document.createElement("div");tb.className="jstab";tb.id="jLTabs";tb.setAttribute("role","tablist");
    $("lTable").parentNode.insertBefore(tb,$("lTable"));}
  var sel=$("lStatus"),cur=sel.value;
  var has=function(v){return Array.prototype.some.call(sel.options,function(o){return o.value===v;});};
  tb.innerHTML=JST.filter(function(x){return has(x[0]);}).map(function(x){
    sel.value=x[0];var n=ledgerRows().length;
    return '<button type="button" role="tab" data-st="'+esc(x[0])+'" class="'+(x[0]===cur?"on":"")+'" aria-selected="'+(x[0]===cur)+'">'+esc(x[1])+'<b>'+n+'</b></button>';
  }).join("");
  sel.value=cur;
  tb.querySelectorAll("[data-st]").forEach(function(b){b.onclick=function(){sel.value=b.getAttribute("data-st");L.page=1;renderLedger();jPage();};});
}
/* ===== 체험 모드 자리 (cgg-j4 1.2 CGG.trial) — 체험판 계정이면 띠 · 잠금 버튼에 자물쇠
   모양만 맡아요. 진짜 잠금 · 횟수 세기는 서버가 해요 (워시/기획/2026-10-14_체험판_기능_분류표.md 잠금 14) */
var JLOCK=[["salXls","매출 엑셀 다운로드","매출 표를 엑셀 파일로 받아요."],["olResend","선택한 차 알림 다시 보내기","딜러에게 출고 알림을 다시 보내요."],
  ["osResend","선택한 차 알림 다시 보내기","딜러에게 출고 알림을 다시 보내요."],["osTest","내 번호로 시험 발송","출고 문자를 내 휴대폰으로 받아 봐요."],
  ["bmSend","청구서 보내기","거래처에 청구서 알림톡을 보내요."],["blSend","청구서 보내기","거래처에 청구서 알림톡을 보내요."],
  ["bJpg","청구서 JPG 다운로드","청구서를 그림 파일로 받아요."],["bCsv","청구서 엑셀 다운로드","청구서를 엑셀 파일로 받아요."],["bCsv2","청구서 엑셀 다운로드","청구서를 엑셀 파일로 받아요."],
  ["tXls","홈택스 엑셀 만들기","세금계산서를 홈택스에 올릴 엑셀로 받아요."],["tPbIssue","세금계산서 발급","국세청에 세금계산서를 발급해요."],
  ["matOrder","부족 자재 주문 문자","도매상에게 주문 문자를 보내요."],["mOrder","주문 문자","도매상에게 주문 문자를 보내요."],
  ["lkQrMake","직원 로그인 QR 만들기","직원이 들어오는 QR 코드를 만들어요."],["ccwResend","실패한 문자 다시 보내기","못 나간 문자를 다시 보내요."]];
function jTrialOn(){try{var p=window.ccwPlanGet&&window.ccwPlanGet();return !!(p&&p.trial);}catch(e){return false;}}
function jTrialBand(){
  var box=$("cggTrialBand");if(!box||!window.CGG||!CGG.trial)return;
  if(!jTrialOn()||S.mode!=="pc"){box.innerHTML="";return;}
  if(!box.__init){box.__init=1;CGG.trial.init("trial");}
  box.innerHTML=CGG.trial.band({title:"체험판이에요. 모든 화면을 둘러보실 수 있어요."});
  var go=box.querySelector("[data-cgg-cta]");if(go)go.onclick=function(){whoSheet();};
}
function jTrialMarks(){
  if(!jTrialOn()||!window.CGG)return;
  JLOCK.forEach(function(x){var b=$(x[0]);if(b&&!b.querySelector(".jlock")){var i=document.createElement("span");i.className="jlock";i.innerHTML=CGG.ic("lock");b.appendChild(i);}});
}
document.addEventListener("click",function(ev){
  if(!jTrialOn())return;
  var t=ev.target&&ev.target.closest&&ev.target.closest("button[id]");if(!t)return;
  var x=JLOCK.filter(function(l){return l[0]===t.id;})[0];if(!x)return;
  ev.preventDefault();ev.stopImmediatePropagation();
  var lt=CGG.trial.lockText(x[1],x[2]);
  ask(lt.title+"\n\n"+lt.rows.map(function(r){return r[0]+" · "+r[1];}).join("\n"),function(){whoSheet();},lt.ok);
},true);
try{window.cggTrialPaint=function(){jTrialBand();jTrialMarks();};}catch(e){}
function refreshDatalists(){''')
# 그린 뒤 손봄 — renderAll 끝에서
rep('''  else if(S.tab==="tax")renderTax();
  else if(S.tab==="help")renderHelp();
}''', '''  else if(S.tab==="tax")renderTax();
  else if(S.tab==="help")renderHelp();
  jPage();jTrialBand();
  clearTimeout(window.__jpT);window.__jpT=setTimeout(jPage,700);   /* 늦게 그려지는 칸(세금계산서 등)도 한 번 더 */
}''')
# 요금제를 받아 오면 체험 띠도 다시
rep('  window.ccwPlanSet = function(p){ PLAN = p; paint(); };', '  window.ccwPlanSet = function(p){ PLAN = p; paint(); try{ if(window.cggTrialPaint) window.cggTrialPaint(); }catch(e){} };')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
