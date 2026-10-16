"""체크 v37 → 체크 v38 (대표님 시험판 — v37 을 대신함). v37 을 읽기만.
바꾸는 것 (총괄 보안 규칙 · 워시 방 v122 대조 2026-10-15):
  1) 보안 규칙 ② — 자료를 새로 받으면 고른 줄 비움(refresh) · 표에 없는 줄 열쇠는 고른 목록에서 뺌(tableBlock)
     일괄 발송 · 취소 · 삭제 · 기사 계정 바꾸기 · 딜러 묶기/풀기는 확인 창에 «고른 줄 이름 목록»을 보여 주고 확인 뒤에만 서버로 (줄 id 그대로)
  2) 워시 ④ alert 3곳 → 알림 글(CGG.toast)
  3) 워시 ⑤ 화면 글 «단추» → «버튼» (토씨까지: 단추가→버튼이 · 단추를→버튼을 · 단추로→버튼으로 · 단추는→버튼은 · 단추와→버튼과)
  4) 워시 ③ 도움 카드 — 보험료 대조 «표 보는 법» 카드를 접힌 도움 카드(CGG.help)로
기능(서버 부르기 · 계산 · 결제)은 그대로
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v37.html"
OUT = BASE + "2_차곳간_체크_index_v38.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1-a) 새로 받으면 고른 줄 비움
rep('''function refresh(keys){
  (keys||Object.keys(LOADED)).forEach(function(k){ delete LOADED[k]; });''',
    '''function refresh(keys){
  Object.keys(TS).forEach(function(k){ TS[k].sel={}; });   /* v38: 자료를 새로 받으면 고른 줄 비움 (보안 규칙 ②) */
  (keys||Object.keys(LOADED)).forEach(function(k){ delete LOADED[k]; });''')
# 1-b) 표에 없는 줄은 고른 목록에서 뺌
rep('''  function rk(r,i){ return String(r.id||r.name||r.plate||r.dest||((s.page-1)*s.per+i)); }''',
    '''  function rk(r,i){ return String(r.id||r.name||r.plate||r.dest||((s.page-1)*s.per+i)); }
  /* v38: 지금 표에 없는 줄의 열쇠는 고른 목록에서 뺌 — 사라진 줄에 일괄 처리가 가지 않게 */
  var live={}; rows.forEach(function(r){ var k=r.id||r.name||r.plate||r.dest; if(k!=null&&k!=="") live[String(k)]=1; });
  Object.keys(s.sel).forEach(function(k){ if(!live[k] && !/^\\d+$/.test(k)) delete s.sel[k]; });''')
# 1-c) 고른 줄 이름 목록 확인 창
rep('''/* ───────── 배달 단추 동작 ───────── */
function delivAct(what){
  var ids=picked("drv");''',
    '''/* v38: 일괄 처리 전 확인 — 고른 줄 이름 목록을 보여 줌 (보안 규칙 ②). 서버에는 줄 id 를 그대로 보냄 */
function askPicked(title, list, yes, done, warn){
  ask({ title:title, rowsTitle:"고른 줄 "+won(list.length)+"개",
        rows:list.slice(0,30).map(function(x){ return [esc(x[0]||"—"), esc(x[1]||"")]; })
             .concat(list.length>30?[["…","그 밖 "+won(list.length-30)+"개"]]:[]),
        warn:warn||"", yes:yes }, done);
}
function drvRows(ids){ var m={}; DRIVES.forEach(function(d){ m[String(d.id)]=d; });
  return ids.map(function(i){ var d=m[i]||{}; return [d.dealer||i, [d.plate,d.dest].filter(Boolean).join(" · ")]; }); }

/* ───────── 배달 버튼 동작 ───────── */
function delivAct(what){
  var ids=picked("drv");''')
rep('''  if(what==="resend"){
    bar(won(ids.length)+"건을 다시 보내는 중…","info"); busy(true);''',
    '''  if(what==="resend"){
    askPicked(won(ids.length)+"건에 알림을 다시 보낼까요?", drvRows(ids), "다시 보내기", function(){
    bar(won(ids.length)+"건을 다시 보내는 중…","info"); busy(true);''')
rep('''      bar("다시 보냄 — 성공 "+won((r&&r.ok)||0)+"건 · 실패 "+won((r&&r.bad)||0)+"건","ok");
      refresh(["deliv"]);
    }).catch(fail);
  } else if(what==="cancel"){
    busy(true);
    call("deliv_cancel",[ST.key,ids,false]).then(function(){
      busy(false); clearPick("drv"); bar(won(ids.length)+"건을 취소로 표시했습니다.","ok"); refresh(["deliv"]);
    }).catch(fail);
  } else if(what==="trash"){
    ask({ title: ids.length+"건을 휴지통으로 보냅니다. 휴지통에서 되살릴 수 있습니다.", yes: "확인" }, function(){''',
    '''      bar("다시 보냄 — 성공 "+won((r&&r.ok)||0)+"건 · 실패 "+won((r&&r.bad)||0)+"건","ok");
      refresh(["deliv"]);
    }).catch(fail);
    }, "딜러에게 문자(알림톡)가 다시 나갑니다.");
  } else if(what==="cancel"){
    askPicked(won(ids.length)+"건을 취소로 표시할까요?", drvRows(ids), "취소 표시", function(){
    busy(true);
    call("deliv_cancel",[ST.key,ids,false]).then(function(){
      busy(false); clearPick("drv"); bar(won(ids.length)+"건을 취소로 표시했습니다.","ok"); refresh(["deliv"]);
    }).catch(fail);
    });
  } else if(what==="trash"){
    askPicked(won(ids.length)+"건을 휴지통으로 보낼까요?", drvRows(ids), "휴지통으로", function(){''')
# 기사 계정 바꾸기
rep('''    var names=picked("drvacc");
    if(!names.length){ bar("기사를 먼저 골라 주세요.","err"); return; }
    busy(true);
    Promise.all(names.map(function(nm){ return call("deliv_accountEdit",[ST.key,nm,patch]); }))
      .then(function(){ busy(false); clearPick("drvacc"); bar(msg,"ok"); refresh(["deliv"]); })
      .catch(fail);''',
    '''    var names=picked("drvacc");
    if(!names.length){ bar("기사를 먼저 골라 주세요.","err"); return; }
    var n0=won(names.length);
    var t0=patch["비밀번호초기화"]?["기사 "+n0+"명의 비밀번호를 초기화할까요?","초기화"]:(patch["사용"]==="N"?["기사 "+n0+"명을 멈출까요?","멈추기"]:["기사 "+n0+"명을 다시 쓰게 할까요?","다시 쓰게 하기"]);
    askPicked(t0[0], names.map(function(n){ return [n,""]; }), t0[1], function(){
    busy(true);
    Promise.all(names.map(function(nm){ return call("deliv_accountEdit",[ST.key,nm,patch]); }))
      .then(function(){ busy(false); clearPick("drvacc"); bar(msg,"ok"); refresh(["deliv"]); })
      .catch(fail);
    });''')
# 딜러 묶기 · 풀기
rep('''  if(undo){
    bar("묶음을 푸는 중…","info"); busy(true);
    call("billGroupSet",[ids, null, "always", ST.ym]).then(function(){
      busy(false); clearPick("dlr"); bar("묶음을 풀었습니다.","ok"); refresh(["set","bill"]);
    }).catch(fail);
    return;
  }
  if(ids.length<2){ bar("두 명 이상 골라 주세요. 맨 처음 고른 분이 청구 받는 분이 됩니다.","err"); return; }
  bar("묶는 중…","info"); busy(true);''',
    '''  if(undo){
    askPicked("딜러 "+won(ids.length)+"명의 묶음을 풀까요?", names.map(function(n){ return [n,""]; }), "묶음 풀기", function(){
    bar("묶음을 푸는 중…","info"); busy(true);
    call("billGroupSet",[ids, null, "always", ST.ym]).then(function(){
      busy(false); clearPick("dlr"); bar("묶음을 풀었습니다.","ok"); refresh(["set","bill"]);
    }).catch(fail);
    });
    return;
  }
  if(ids.length<2){ bar("두 명 이상 골라 주세요. 맨 처음 고른 분이 청구 받는 분이 됩니다.","err"); return; }
  askPicked(names[0]+" 님 앞으로 "+won(ids.length-1)+"명을 묶을까요?", names.map(function(n,i){ return [n, i?"":"청구 받는 분"]; }), "묶기", function(){
  bar("묶는 중…","info"); busy(true);''')
rep('''    bar(names[0]+" 님 앞으로 "+(ids.length-1)+"명을 묶었습니다.","ok"); refresh(["set","bill"]);
  }).catch(fail);
}''', '''    bar(names[0]+" 님 앞으로 "+(ids.length-1)+"명을 묶었습니다.","ok"); refresh(["set","bill"]);
  }).catch(fail);
  });
}''')

# 2) alert 3곳 → 알림 글
rep('''if(box) box(html); else alert("이용기간이 끝나 지금은 보기만 됩니다.");''',
    '''if(box) box(html); else { try{ CGG.toast("이용기간이 끝나 지금은 보기만 됩니다."); }catch(e){} }''')
rep('''if(box) box(html); else alert("차곳간에 알려 드렸습니다. 하루 동안 쓰실 수 있습니다.");''',
    '''if(box) box(html); else { try{ CGG.toast("차곳간에 알려 드렸습니다. 하루 동안 쓰실 수 있습니다."); }catch(e){} }''')
rep('''      else alert(m);''', '''      else { try{ CGG.toast(String(m)); }catch(e2){} }''')

# 3) 단추 → 버튼 (토씨 먼저)
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
if s.count(CSS) != 1 or s.count(JS) != 1: raise SystemExit("공통 부품 글자를 못 찾음")
s = s.replace(CSS, "\x00CGGCSS\x00").replace(JS, "\x00CGGJS\x00")   # 공통 부품 글자는 건드리지 않음
for a, b in [("단추가", "버튼이"), ("단추를", "버튼을"), ("단추로", "버튼으로"), ("단추는", "버튼은"), ("단추와", "버튼과"), ("단추", "버튼")]:
    s = s.replace(a, b)
s = s.replace("\x00CGGCSS\x00", CSS).replace("\x00CGGJS\x00", JS)

# 4) 표 보는 법 → 접힌 도움 카드
a = s.index('''  card("표 보는 법","칸 이름이 무슨 뜻인지 적어 뒀습니다.",''')
b = s.index("'</div>'));\n};\nvar INSFIL", a) + len("'</div>'));")
s = s[:a] + '''  '<div style="margin-top:14px">'+CGG.help(   /* v38: 접힌 도움 카드 (00_공통 ⑦) */
    "우리가 받았나 — 카모두(carCheckList)의 «보험료납부» 칸입니다. Y 실제로 받음 · N 못 받음 · P 면제 차량. 우리가 실제로 돈을 받은 것은 Y 뿐입니다.\\n"+
    "보험사가 달라는 돈 — 보험사 청구 엑셀의 «청구보험료» 입니다. 우리가 보험사에 내야 할 돈입니다.\\n"+
    "딜러에게 받은 돈 — 그 차의 성능보험료로 딜러에게 받은 금액입니다. 보험사에 내는 돈보다 많은 만큼이 우리 몫이라 틀린 게 아닙니다. 아직 못 찾은 차는 «—» 로 비어 있습니다.\\n"+
    "무엇으로 찾았나 — 보험사 청구서의 차를 우리 자료에서 무엇으로 찾았는지입니다. 차대번호 ▸ 성능번호 ▸ 차량번호 순서로 찾습니다. 차량번호는 중간에 바뀔 수 있어 맨 뒤에서만 보고, 그것으로만 찾은 줄은 한 번 봐 주시는 게 좋습니다.\\n"+
    "맞춰 본 결과 — 그대로 냄: 우리도 Y라 맞습니다 · 취소 요청: 우리는 N·P인데 보험사가 청구했으니 취소를 넣으세요 · 우리 자료에 없음: 카모두에서 그 차를 못 찾았습니다 · 아직 안 맞춰 봄: «다시 대조하기» 를 아직 안 눌렀습니다.",
    "표 보는 법")+'</div>');''' + s[b:]
rep('''.tblk.cgg-card{font-family:''', '''.cgg-help p{white-space:pre-line}
.tblk.cgg-card{font-family:''')


# 5) 워시 v122 결제 맞추기 (결제/10 C2 «W1~W5 같은 코드») — 충전 금액 범위 + 결제 내역(payMine) 창
PAYHIST = open("/home/user/chagotgan/체크/도구/워시v122_결제내역.js", encoding="utf-8").read()
rep('''    if(cardBtn) cardBtn.onclick = function(){ cwPay("cash", Number(amt.value)||0, 0); };''',
    '''    function cwRange(v){ if(v < 10000 || v > 3000000){ document.getElementById("cwMsg").innerHTML =
        '<span style="color:#C0392B">1만 원부터 300만 원까지 충전할 수 있어요.</span>'; return false; } return true; }
    if(cardBtn) cardBtn.onclick = function(){ var v=Number(amt.value)||0; if(!cwRange(v)) return; cwPay("cash", v, 0); };''')
rep('''      var v = Number(amt.value)||0;
      if(v < 10000){ document.getElementById("cwMsg").innerHTML =
        '<span style="color:#C0392B">1만원부터 신청하실 수 있습니다.</span>'; return; }''',
    '''      var v = Number(amt.value)||0;
      if(!cwRange(v)) return;''')
rep('''  /* 요금제만 결제하는 창 */''', PAYHIST + '''
  /* 요금제만 결제하는 창 */''')
rep('''          '이용기한 '+esc2(String(q.paidUntil||"").slice(0,10))+' 까지</div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn" data-cwclose style="flex:1">닫기</button></div>');''',
    '''          '이용기한 '+esc2(String(q.paidUntil||"").slice(0,10))+' 까지</div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn" type="button" data-pvhist="1">결제 내역</button><button class="btn" data-cwclose style="flex:1">닫기</button></div>');''')
rep('''        '<div id="pvMsg" style="margin-top:8px;font-size:13px"></div>'+
        '<div class="sheetbtns" style="margin-top:14px">'+''',
    '''        '<div id="pvMsg" style="margin-top:8px;font-size:13px"></div>'+
        '<div class="sheetbtns" style="margin-top:14px">'+
        '<button class="btn" type="button" data-pvhist="1">결제 내역</button>'+''')

rep('''  $("hdVer").textContent="체크 v37 · "''', '''  $("hdVer").textContent="체크 v38 · "''')
chk = s.replace(CSS, "").replace(JS, "")
for bad in ["alert(", "단추"]:
    if bad in chk:
        # alert 은 함수 이름 안(예: CGG 안)에 없어야 함
        idx = chk.find(bad); raise SystemExit("아직 남음: " + bad + " … " + chk[idx-60:idx+40])
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
