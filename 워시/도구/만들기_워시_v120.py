"""워시 v119 → 워시 v120 새 판. 카드 결제창 v2 · 자동 결제 켜기/끄기 · 청구서 입금 기한 (짝 서버 sb10).
쓰는 법: 만들기_워시_v112 → … → v119 → v120 차례로 (`워시/도구/`)
근거: 결제 방 요청서 `결제/요청서/2026-10-15_워시_결제창v2_자동결제_입금기한.md` · 서버 설계 12
바꾸는 것:
  (가) 결제창 v2 — 서버가 sdk:"v2" 를 주면 v2 SDK(js.tosspayments.com/v2/standard)로, 아니면(옛 서버) 예전 v1 그대로
  (나) 자동 결제 (대표만 · 서버 billInfo().open 이 false 면 칸 자체를 숨김) — 이용요금 창 안에
       꺼짐: 「자동 결제 켜기」 → 동의 화면(매달 금액 · 결제일 · 첫 결제일 · 끄는 법 · 동의 문구판) → billStart → v2 카드 등록창
             → 돌아오면(?card=ok) billIssue([authKey, 동의 문구판])
       켜짐: 카드사 · 끝 4자리 · 다음 결제일 · 실패 횟수 + [카드 바꾸기] + [자동 결제 끄기](billOff)
       실패 중: 창 맨 위에 「결제가 되지 않았어요. 다음 시도일 ○○」 + [카드 바꾸기]
  (다) 청구서 보기를 만들 때 viewBill 에 dueDate(YYYY-MM-DD)를 함께 — 알림톡 #{입금기한} 과 같은 날
       입금 기한 칸(설정)에 «매월 10일» · «10일» 처럼 날짜가 있으면 청구 월 다음 달 그날, «2026-11-10» 이면 그날.
       날짜를 못 읽으면 dueDate 는 비우고 알림톡에는 적은 글 그대로(예전처럼)
  (그 밖) 결제 창 «대표만» 확인이 늘 통과하던 것을 바로잡음 (로그인 때 적어 둔 역할로 확인 · 서버는 예전부터 거절)
비밀 열쇠 값은 넣지 않음 (공개 client key 는 서버가 줌). 운영 v111 · 새 판 v112~v119 는 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v119.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v120.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v119 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v120 · UI 3.0 · 2026-10-15";')

# ───── (다) 청구서 입금 기한 ─────
rep('''function billDue(){var t=String((S.cfg&&S.cfg.billDueText)||"").trim();return t||"업체에 문의";}''',
    '''/* v120: 입금 기한 — 설정 글에서 날짜를 읽어 YYYY-MM-DD 로 (청구 월 다음 달). 못 읽으면 "" */
function billDueDate(month){
  var t=String((S.cfg&&S.cfg.billDueText)||"").trim();
  var m=t.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if(m)return t;
  var d=t.match(/(\\d{1,2})\\s*일/);
  var ym=String(month||"").match(/^(\\d{4})-(\\d{2})$/);
  if(!d||!ym)return "";
  var day=Number(d[1]); if(day<1||day>31)return "";
  var y=Number(ym[1]),mo=Number(ym[2])+1; if(mo>12){mo=1;y++;}
  var last=new Date(y,mo,0).getDate(); if(day>last)day=last;
  return y+"-"+String(mo).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}
function billDue(b){
  var dd=b?billDueDate(b.month):"";
  if(dd){var p=dd.split("-");return Number(p[1])+"월 "+Number(p[2])+"일";}
  var t=String((S.cfg&&S.cfg.billDueText)||"").trim();return t||"업체에 문의";
}''')
rep('''    "입금기한":billDue(),"계좌":(S.cfg&&S.cfg.bank)||"",''', '''    "입금기한":billDue(b),"계좌":(S.cfg&&S.cfg.bank)||"",''')
rep('''    taxOn:!!b.taxOn,workText:b.workText||"",bank:(S.cfg&&S.cfg.bank)||"",
    rows:(b.recs||[]).map(function(r){''', '''    taxOn:!!b.taxOn,workText:b.workText||"",bank:(S.cfg&&S.cfg.bank)||"",
    dueDate:billDueDate(b.month),
    rows:(b.recs||[]).map(function(r){''')

# ───── (가) 결제창 v2 ─────
rep('''  function loadToss(){
    return new Promise(function(res, rej){
      if(window.TossPayments) return res(window.TossPayments);
      var sc = document.createElement("script");
      sc.src = "https://js.tosspayments.com/v1/payment";''', '''  /* v120: 서버(sb10)가 sdk:"v2" 를 주면 v2 창, 옛 서버면 v1 창 */
  var TOSSVER = "";
  function loadToss(ver){
    ver = ver === "v2" ? "v2" : "v1";
    return new Promise(function(res, rej){
      if(window.TossPayments && (TOSSVER === ver || window.TossPayments.__preview)) return res(window.TossPayments);
      if(TOSSVER && TOSSVER !== ver) return rej({message:"결제 창을 다시 열려면 화면을 새로고침해 주세요"});
      TOSSVER = ver;
      var sc = document.createElement("script");
      sc.src = ver === "v2" ? "https://js.tosspayments.com/v2/standard" : "https://js.tosspayments.com/v1/payment";''')
rep('''      return loadToss().then(function(TP){
        var back = location.origin + location.pathname;
        var tp = TP(r.clientKey);
        return tp.requestPayment("카드", {''', '''      var v2 = r.sdk === "v2";
      return loadToss(v2 ? "v2" : "v1").then(function(TP){
        var back = location.origin + location.pathname;
        var tp = TP(r.clientKey);
        if(v2){
          var ck = (!r.customerKey || r.customerKey === "ANONYMOUS") ? TP.ANONYMOUS : r.customerKey;
          return tp.payment({customerKey: ck}).requestPayment({
            method: "CARD",
            amount: {currency: "KRW", value: r.amount},
            orderId: r.orderId, orderName: r.orderName,
            customerName: r.customerName,
            successUrl: back + "?pay=ok",
            failUrl:    back + "?pay=no"
          });
        }
        return tp.requestPayment("카드", {''')

# ───── (나) 자동 결제 ─────
rep('''  /* 요금제만 결제하는 창 */
  window.ccwPlanPay = function(){''', '''  /* ===== v120 · 자동 결제 (대표만 · 서버 sb10 billInfo().open 일 때만 보임) ===== */
  var BILL_AGREE_VER = "2026-10-15";
  var AB = {q:null, info:null};
  function dk(x){ var t = String(x||"").slice(0,10); if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(t)) return "";
    var p = t.split("-"); return Number(p[0])+"년 "+Number(p[1])+"월 "+Number(p[2])+"일"; }
  function abCard(r){ return esc2((r.cardCompany||"카드") + (r.last4 ? " 끝 " + r.last4 : "")); }
  var AB_BOX = 'border:1px solid #DDE3EC;border-radius:12px;padding:13px 15px;font-size:13.5px;line-height:1.9;margin-top:14px';
  function abPaint(q){
    AB.q = q || AB.q;
    var top = document.getElementById("abTop"), box = document.getElementById("abBox");
    if(!box || !cashAllowed()) return;
    cwRpc("billInfo",[]).then(function(r){
      box = document.getElementById("abBox"); top = document.getElementById("abTop");
      if(!box) return;
      if(!r || !r.open){ box.innerHTML = ""; if(top) top.innerHTML = ""; return; }
      AB.info = r;
      if(top) top.innerHTML = (r.on && Number(r.failCount||0) > 0)
        ? ('<div style="border:1px solid #F0B9B4;background:#FCEDEB;border-radius:12px;padding:12px 14px;margin-bottom:12px;'+
           'font-size:13.5px;line-height:1.8;color:#7A2018"><b>결제가 되지 않았어요.</b> 다음 시도일 '+
           esc2(dk(r.nextTry) || "곧 다시 시도해요")+
           (r.lastFail ? ('<br><span style="font-size:12.5px">까닭: '+esc2(r.lastFail)+'</span>') : '')+
           '<div style="margin-top:8px"><button class="btn" type="button" data-abcard>카드 바꾸기</button></div></div>')
        : "";
      box.innerHTML = r.on
        ? ('<div style="'+AB_BOX+'"><div style="font-weight:800">자동 결제 <span style="color:#1A7F4B">켜짐</span></div>'+
           '<div style="display:flex"><span style="flex:1;color:#667389">카드</span><b>'+abCard(r)+'</b></div>'+
           '<div style="display:flex"><span style="flex:1;color:#667389">다음 결제일</span><b>'+esc2(dk(r.nextAt)||"-")+'</b></div>'+
           (Number(r.failCount||0) > 0 ? ('<div style="display:flex"><span style="flex:1;color:#667389">결제 안 된 횟수</span><b style="color:#C0392B">'+
             Number(r.failCount)+'번</b></div>') : '')+
           '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'+
             '<button class="btn" type="button" data-abcard style="flex:1">카드 바꾸기</button>'+
             '<button class="btn" type="button" id="abOff" style="flex:1">자동 결제 끄기</button></div></div>')
        : ('<div style="'+AB_BOX+'"><div style="font-weight:800">자동 결제 <span style="color:#667389">꺼짐</span></div>'+
           '<div style="color:#667389;font-size:13px">켜 두면 이용기간이 끝나는 날 등록한 카드로 이용요금이 결제돼요. 언제든 끌 수 있어요.</div>'+
           '<button class="btn" type="button" id="abOn" style="width:100%;margin-top:8px">자동 결제 켜기</button></div>');
      Array.prototype.forEach.call(document.querySelectorAll("[data-abcard]"), function(b){ b.onclick = function(){ abRegister(b); }; });
      var on = document.getElementById("abOn"); if(on) on.onclick = abAgree;
      var off = document.getElementById("abOff"); if(off) off.onclick = abOffAsk;
    }).catch(function(){ if(box) box.innerHTML = ""; });
  }
  /* 동의 화면 — 매달 금액 · 결제일 · 첫 결제일 · 끄는 법 · 동의 문구판 */
  function abAgree(){
    var q = AB.q || {};
    var first = dk(q.paidUntil);
    cashBox('<h3 style="margin:0 0 4px">자동 결제 동의</h3>'+
      '<div class="sub" style="margin-bottom:14px">아래 내용을 확인해 주세요</div>'+
      '<div style="border:1px solid #DDE3EC;border-radius:12px;padding:14px 16px;font-size:14px;line-height:2">'+
        '<div style="display:flex;gap:10px"><span style="flex:1;color:#667389">매달 금액</span><b>'+w(q.full)+' (부가세 포함)</b></div>'+
        '<div style="display:flex;gap:10px"><span style="flex:1;color:#667389">요금제</span><b>'+esc2(q.planName||"-")+'</b></div>'+
        '<div style="display:flex;gap:10px"><span style="flex:1;color:#667389">결제일</span><b>이용기간이 끝나는 날</b></div>'+
        '<div style="display:flex;gap:10px"><span style="flex:1;color:#667389">첫 결제일</span><b>'+esc2(first || "지금 이용기간이 끝나는 날")+'</b></div>'+
      '</div>'+
      '<div style="margin-top:10px;border:1px solid #DDE3EC;background:#F8FAFD;border-radius:11px;padding:11px 13px;'+
        'font-size:13px;color:#4A5668;line-height:1.8">'+
        '· 결제는 토스페이먼츠가 바로 처리해요. 카드 번호는 차곳간에 저장되지 않아요.<br>'+
        '· 결제가 안 되면 다음 날, 3일 뒤, 5일 뒤에 다시 시도해요.<br>'+
        '· 끄는 법: 이용요금 창에서 [자동 결제 끄기]를 누르면 돼요. 끈 뒤에도 이번 이용기간 끝까지 쓸 수 있어요.<br>'+
        '· 요금제 금액이 바뀌면 바뀐 금액으로 결제돼요.</div>'+
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:14px;cursor:pointer">'+
        '<input type="checkbox" id="abYes" style="width:18px;height:18px;margin-top:3px"> 위 내용을 확인했고 자동 결제에 동의해요</label>'+
      '<div style="font-size:11.5px;color:#8792A2;margin-top:4px">동의 문구 '+BILL_AGREE_VER+'판</div>'+
      '<div id="abMsg" style="margin-top:8px;font-size:13px"></div>'+
      '<div class="sheetbtns" style="margin-top:14px">'+
        '<button class="btn" data-cwclose style="flex:1">닫기</button>'+
        '<button class="btn primary" id="abGo" style="flex:2">카드 등록하기</button></div>');
    document.getElementById("abGo").onclick = function(){
      if(!document.getElementById("abYes").checked){
        document.getElementById("abMsg").innerHTML = '<span style="color:#C0392B">동의에 체크해 주세요</span>'; return; }
      abRegister(this, "abMsg");
    };
  }
  /* 카드 등록창 (켜기 · 카드 바꾸기 같음) */
  function abRegister(btn, msgId){
    if(btn) btn.disabled = true;
    function say(t, bad){ var el = document.getElementById(msgId || "abMsg") || document.getElementById("pvMsg");
      if(el) el.innerHTML = '<span style="color:'+(bad?"#C0392B":"#667389")+'">'+esc2(t)+'</span>'; }
    say("카드 등록 창을 여는 중이에요…");
    cwRpc("billStart",[]).then(function(r){
      if(!r || r.ok === false){ say((r && r.note) || "자동 결제는 아직 준비 중이에요", true); if(btn) btn.disabled = false; return; }
      try{ localStorage.setItem("ccw_bill", JSON.stringify({ver:BILL_AGREE_VER, at:Date.now()})); }catch(e){}
      return loadToss("v2").then(function(TP){
        var back = location.origin + location.pathname;
        return TP(r.clientKey).payment({customerKey: r.customerKey}).requestBillingAuth({
          method: "CARD", successUrl: back + "?card=ok", failUrl: back + "?card=no" });
      });
    }).catch(function(e){ say((e && e.message) || "카드 등록 창을 열지 못했어요", true); if(btn) btn.disabled = false; });
  }
  function abOffAsk(){
    var r = AB.info || {};
    cashBox('<h3 style="margin:0 0 6px">자동 결제를 끌까요?</h3>'+
      '<div style="border:1px solid #DDE3EC;background:#F8FAFD;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.8">'+
      '등록한 카드('+abCard(r)+') 정보가 지워지고, 다음 결제는 하지 않아요.<br>'+
      '<b>이번 이용기간'+(dk(r.nextAt) ? ('('+esc2(dk(r.nextAt))+')') : '')+' 끝까지는 그대로 쓸 수 있어요.</b></div>'+
      '<div id="abMsg" style="margin-top:8px;font-size:13px"></div>'+
      '<div class="sheetbtns" style="margin-top:14px">'+
        '<button class="btn" id="abBack" style="flex:1">그대로 두기</button>'+
        '<button class="btn" id="abOffGo" style="flex:1;color:#C0392B">자동 결제 끄기</button></div>');
    document.getElementById("abBack").onclick = function(){ window.ccwPlanPay(); };
    document.getElementById("abOffGo").onclick = function(){
      this.disabled = true;
      cwRpc("billOff",[]).then(function(){
        cashBox('<h3 style="margin:0 0 6px">자동 결제를 껐어요</h3>'+
          '<div style="border:1px solid #B7E4CC;background:#E9F6EF;border-radius:12px;padding:14px 16px;'+
          'font-size:14px;line-height:1.8;color:#14532D">다음 결제는 하지 않아요. 이번 이용기간 끝까지 쓸 수 있어요.</div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn primary" data-cwclose style="flex:1">확인</button></div>');
      }).catch(function(e){
        document.getElementById("abOffGo").disabled = false;
        document.getElementById("abMsg").innerHTML = '<span style="color:#C0392B">'+esc2((e&&e.message)||"끄지 못했어요")+'</span>';
      });
    };
  }
  /* 카드 등록창에서 돌아왔을 때 — ?card=ok&customerKey=…&authKey=… */
  function afterCard(){
    try{
      var q = new URLSearchParams(location.search);
      var st = q.get("card"); if(!st) return;
      var authKey = q.get("authKey") || "";
      try{ history.replaceState(null, "", location.origin + location.pathname); }catch(e){}
      var ver = BILL_AGREE_VER;
      try{ var sv = JSON.parse(localStorage.getItem("ccw_bill") || "{}"); if(sv.ver) ver = sv.ver; }catch(e){}
      setTimeout(function(){
        if(st !== "ok" || !authKey){
          cashBox('<h3 style="margin:0 0 6px">카드를 등록하지 않았어요</h3>'+
            '<div style="border:1px solid #F0B9B4;background:#FCEDEB;border-radius:12px;padding:14px 16px;'+
            'font-size:14px;line-height:1.8;color:#7A2018">'+esc2(q.get("message") || "카드 등록이 취소되었어요")+'<br>자동 결제는 켜지지 않았어요.</div>'+
            '<div class="sheetbtns" style="margin-top:16px"><button class="btn" data-cwclose style="flex:1">닫기</button></div>');
          return;
        }
        cashBox('<h3 style="margin:0 0 6px">카드 등록 중</h3><div class="sub">잠시만 기다려 주세요…</div>');
        cwRpc("billIssue",[authKey, ver]).then(function(r){
          try{ localStorage.removeItem("ccw_bill"); }catch(e){}
          if(!r || r.ok === false) throw {message:(r && r.note) || "자동 결제는 아직 준비 중이에요"};
          cashBox('<h3 style="margin:0 0 6px">자동 결제를 켰어요</h3>'+
            '<div style="border:1px solid #B7E4CC;background:#E9F6EF;border-radius:12px;padding:14px 16px;'+
            'font-size:14.5px;line-height:1.8;color:#14532D">'+abCard(r)+' 카드로 이용기간이 끝나는 날 결제돼요.<br>'+
            '이용요금 창에서 언제든 끌 수 있어요.</div>'+
            '<div class="sheetbtns" style="margin-top:16px"><button class="btn primary" data-cwclose style="flex:1">확인</button></div>');
        }).catch(function(e){
          cashBox('<h3 style="margin:0 0 6px">카드를 등록하지 못했어요</h3>'+
            '<div style="border:1px solid #F0B9B4;background:#FCEDEB;border-radius:12px;padding:14px 16px;'+
            'font-size:14px;line-height:1.8;color:#7A2018">'+esc2((e&&e.message)||"")+'<br>자동 결제는 켜지지 않았어요.</div>'+
            '<div class="sheetbtns" style="margin-top:16px"><button class="btn" data-cwclose style="flex:1">닫기</button></div>');
        });
      }, 700);
    }catch(e){}
  }
  try{
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ setTimeout(afterCard, 1200); });
    else setTimeout(afterCard, 1200);
  }catch(e){}

  /* 요금제만 결제하는 창 */
  window.ccwPlanPay = function(){''')

# 이용요금 창: 이미 낸 달 · 낼 달 모두 자동 결제 칸 (맨 위 실패 안내 + 아래 칸)
rep('''          '<div class="sub" style="margin-bottom:14px">'+esc2(q.planName)+' · '+esc2(q.period)+'</div>'+
          '<div style="border:1px solid #B7E4CC;background:#E9F6EF;border-radius:12px;padding:14px 16px;'+
          'font-size:14.5px;line-height:1.8;color:#14532D"><b>이번 달은 이미 결제하셨습니다.</b><br>'+
          '이용기한 '+esc2(String(q.paidUntil||"").slice(0,10))+' 까지</div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn" data-cwclose style="flex:1">닫기</button></div>');
        return;''', '''          '<div class="sub" style="margin-bottom:14px">'+esc2(q.planName)+' · '+esc2(q.period)+'</div>'+
          '<div id="abTop"></div>'+
          '<div style="border:1px solid #B7E4CC;background:#E9F6EF;border-radius:12px;padding:14px 16px;'+
          'font-size:14.5px;line-height:1.8;color:#14532D"><b>이번 달은 이미 결제하셨습니다.</b><br>'+
          '이용기한 '+esc2(String(q.paidUntil||"").slice(0,10))+' 까지</div>'+
          '<div id="abBox"></div>'+
          '<div class="sheetbtns" style="margin-top:16px"><button class="btn" data-cwclose style="flex:1">닫기</button></div>');
        abPaint(q);
        return;''')
rep('''        '<h3 style="margin:0 0 4px">이번 달 이용요금</h3>'+
        '<div class="sub" style="margin-bottom:14px">'+esc2(q.planName)+' · '+esc2(q.period)+'</div>'+
        '<div style="border:1px solid #DDE3EC;border-radius:12px;padding:14px 16px;font-size:14px;line-height:2">'+''',
    '''        '<h3 style="margin:0 0 4px">이번 달 이용요금</h3>'+
        '<div class="sub" style="margin-bottom:14px">'+esc2(q.planName)+' · '+esc2(q.period)+'</div>'+
        '<div id="abTop"></div>'+
        '<div style="border:1px solid #DDE3EC;border-radius:12px;padding:14px 16px;font-size:14px;line-height:2">'+''')
rep('''        '<div id="pvMsg" style="margin-top:8px;font-size:13px"></div>'+
        '<div class="sheetbtns" style="margin-top:14px">'+
        '<button class="btn" id="pvCash" style="flex:1">캐시 충전 화면</button>'+''', '''        '<div id="pvMsg" style="margin-top:8px;font-size:13px"></div>'+
        '<div id="abBox"></div>'+
        '<div class="sheetbtns" style="margin-top:14px">'+
        '<button class="btn" id="pvCash" style="flex:1">캐시 충전 화면</button>'+''')
rep('''      cashBox(h);

      function calc(){
        var ck = document.getElementById("pvUse");''', '''      cashBox(h);
      abPaint(q);

      function calc(){
        var ck = document.getElementById("pvUse");''')

# 대표만 보기 — isOwner 가 이 조각에서 안 보여서 늘 «허용»이던 것을, 로그인 때 적어 둔 역할(ccw_user)로도 확인
rep('''  function cashAllowed(){
    try{
      if(typeof isOwner === "function") return !!isOwner();
      return true;
    }catch(e){ return true; }
  }''', '''  function cashAllowed(){
    try{
      if(typeof isOwner === "function") return !!isOwner();
      var u = JSON.parse(localStorage.getItem("ccw_user") || "null");
      if(u && u.role) return u.role === "owner" || u.role === "admin";   /* v120: 매니저 · 직원에게는 결제 · 자동 결제 칸 안 보임 */
      return true;
    }catch(e){ return true; }
  }''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
