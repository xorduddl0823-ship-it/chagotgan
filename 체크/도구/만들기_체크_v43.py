"""체크 v42 → v43 — 시험 뒤 첫 판 (v42 는 읽기만 · 시험판 v42 는 그대로)
받은 일: 총괄 10-16 «청구서 보내기 · 재검사 알림 화면 + 숫자 카드, 서버 v33 과 짝 맞춰»
설계: 체크/기획/2026-10-16_청구서보내기_재검사알림_설계.md · 창구 약속: 체크/기획/2026-10-16_v43_v33_창구_약속.md
바꾸는 것:
  1) 월별 청구서 › «2. 청구서 보내기» — 승인된 «차곳간_청구서» 그대로(고칠 수 있는 것은 입금 기한 하나),
     내 번호로 시험 · 선택한 곳에 보내기(대표만 · 이름 확인 창) → billSend · 결과 표 · «안 보낸 곳만» 고르기 칸
  2) 재검사 알림 — 서버 자료(remindRule · remindList), 규칙 저장 · 고른 차 보내기 · 빼기 → remindRuleSave · remindSend · remindOff
  3) 숫자 카드 — 작은 그래프가 없는 카드는 이름 오른쪽 빈칸 없앰 (디자인 «공통-2»)
  4) 버튼 화면 주소 안내 — app.cgg.co.kr/v.html?c=… (총괄 결정 ① 1안)
"""
import re
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v42.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

def cut(a_mark, b_mark, new):
    """a_mark 부터 b_mark 바로 앞까지를 new 로"""
    global s
    if s.count(a_mark) != 1 or s.count(b_mark) != 1:
        raise SystemExit("자리 표시가 하나가 아님: %s / %s" % (a_mark[:60], b_mark[:60]))
    a = s.index(a_mark); b = s.index(b_mark)
    assert a < b
    s = s[:a] + new + s[b:]

# ── 1) 청구서 보내기 ─────────────────────────────────────────────
# 목록 «보낸 상태» 고르기 칸 — 이름(id)을 붙이고 AFTER 에서 잇습니다
rep('''              '<select><option>전체</option><option>안 보낸 곳만</option><option>안 열어본 곳만</option><option>입금 대기만</option></select>',''',
    '''              '<select id="billSendF">'+[["","전체"],["notsent","안 보낸 곳만"],["notopen","안 열어본 곳만"],["unpaid","입금 대기만"]]
                .map(function(o){ return '<option value="'+o[0]+'"'+(BILL_F===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select>',''')
rep('''    ], BILLS, {pick:true,
      filters:'<select id="billKind">''', '''    ], billShown(), {pick:true,
      filters:'<select id="billKind">''')

cut('''  card("2. 청구서 보내기",''', '''  card('버튼을 누르면 열리는 화면 <span class="rt">check.cgg.co.kr/v/…</span>',''', r'''  card("2. 청구서 보내기","카카오에서 승인된 문구 그대로 나가요. 고칠 수 있는 것은 «입금 기한» 하나예요.",
    '<div class="sendgrid"><div>'+
      '<label class="f" for="bsDue">입금 기한 (비우면 «확인 후 입금»)</label>'+
      '<input type="text" id="bsDue" maxlength="20" style="width:100%" placeholder="예: 11월 10일" value="'+esc(BS_DUE)+'">'+
      '<label class="f" style="margin-top:12px">입금 계좌 (설정 › 우리 검사소의 검사비 계좌)</label>'+
      (OFFICE.bank_fee
        ? '<div class="msg info" style="margin:0">'+esc(OFFICE.bank_fee)+'</div>'
        : '<div class="msg err" style="margin:0"><b>검사비 입금 계좌가 비어 있어요.</b> 설정 › 우리 검사소에서 먼저 넣어 주세요.</div>')+
      '<label class="f" style="margin-top:12px">보내는 방법</label>'+
      '<div class="msg info" style="margin:0">알림톡 (안 되면 문자로 자동) · 받는 번호는 거래처에 등록된 딜러 번호예요</div>'+
      '<p class="note" style="margin:10px 0 0">정비비 계좌는 승인된 문구에 칸이 없어서 알림톡에는 안 들어가요. «청구 내역 보기» 화면에는 두 계좌가 모두 나와요.</p>'+
      (isOwner() ? '' : '<div class="msg err" style="margin:10px 0 0">청구서 보내기는 <b>대표만</b> 할 수 있어요.</div>')+
    '</div>'+
    '<div>'+
      '<div class="phone">'+
        '<div class="phone-top">카카오 알림톡</div>'+
        '<div class="phone-from">차곳간 카카오 채널에서</div>'+
        '<div class="phone-msg" id="phoneMsg">'+esc(billAtaText(billSample(), BS_DUE))+'</div>'+
        '<div class="phone-btn" id="phoneBtn">청구 내역 보기</div>'+
      '</div>'+
      '<div class="msgmeta" id="msgMeta"><span>미리보기 <b>'+esc((billSample()||{}).name||"—")+'</b></span><span>종류 <b>알림톡</b></span></div>'+
      '<div class="tools" style="justify-content:center">'+
        '<button class="btn" id="bsTest"'+(isOwner()?'':' disabled')+'>내 번호로 시험</button>'+
        '<button class="btn primary" id="bsSend"'+(isOwner()?'':' disabled')+'>선택한 곳에 보내기</button>'+
        (isOwner()?'<button class="btn" id="bsRekey" title="예전 주소는 더 안 열려요">고른 곳 주소 새로 만들기</button>':'')+
      '</div>'+
    '</div></div>'+
    billSendResult())+

''')
rep('''  card('버튼을 누르면 열리는 화면 <span class="rt">check.cgg.co.kr/v/…</span>',''',
    '''  card('«청구 내역 보기»를 누르면 열리는 화면 <span class="rt">app.cgg.co.kr/v.html?c=…</span>',''')
rep('''    '한 쪽만 있으면 그 한 장만 나와요. 받는 분이 버튼을 누른 시각은 청구서 목록의 <b>확인</b> 칸에 남아요.</p>');''',
    '''    '한 쪽만 있으면 그 한 장만 나와요. 받는 분이 버튼을 누른 시각은 청구서 목록의 <b>확인</b> 칸에 남아요 '+
    '(카카오가 미리보기로 먼저 열 때도 있어서 참고로만 봐 주세요).</p>');''')

# 청구서 보내기 함수들 — PAGE.bill 바로 앞에
BILL_JS = r'''/* ═══ v43: 청구서 보내기 (billSend · 서버 v33) ═══
   문구는 카카오 승인본 «차곳간_청구서» 그대로 — 화면은 미리보기만 하고, 실제 값은 서버가 채웁니다(가짜 링크 막기). */
var BILL_F="", BS_DUE="", BS_LAST=null;
function billShown(){
  return BILLS.filter(function(b){
    if(BILL_F==="notsent") return b.sendState==="안 보냄";
    if(BILL_F==="notopen") return b.sendState!=="열어봄";
    if(BILL_F==="unpaid")  return b.left>0;
    return true;
  });
}
function billSample(){
  var ids=picked("bill"), b=null;
  if(ids.length) b=BILLS.filter(function(x){ return x.id===ids[0]; })[0];
  return b || BILLS[0] || null;
}
function billAtaText(b, due){
  b=b||{name:"홍길동",cnt:0,total:0};
  var per=ymText(ST.ym), shop=OFFICE.name||ST.shopName||"우리 검사소";
  return "[차곳간] "+per+" 청구 내역 안내\n\n"+
    b.name+" 님, "+shop+"에서 "+per+" 작업분 청구 내역을 보내드립니다.\n\n"+
    "· 작업 대수 : "+won(b.cnt||0)+"대\n"+
    "· 청구 금액 : "+won(b.total||0)+"원 (부가세 포함)\n"+
    "· 입금 기한 : "+(String(due||"").trim()||"확인 후 입금")+"\n"+
    "· 입금 계좌 : "+(OFFICE.bank_fee||"(설정에서 넣어 주세요)")+"\n\n"+
    "자세한 내역은 아래 버튼에서 확인하실 수 있습니다.\n"+
    "문의 "+(OFFICE.tel||"")+"\n\n"+
    "본 안내는 "+shop+"의 요청으로 차곳간이 보내드립니다.";
}
function howTxt(h){ h=String(h||"").toLowerCase(); return h==="ata"?"알림톡":h==="mms"?"사진 문자":(h==="lms"||h==="sms")?"문자":"—"; }
function billSendResult(){
  var R=BS_LAST; if(!R || R.ym!==ST.ym) return "";
  var ok=R.results.filter(function(x){return x.ok;}).length;
  return '<div class="card" style="margin-top:14px;box-shadow:none"><h3>'+(R.test?"시험 보낸 결과":"방금 보낸 결과")+
      '<span class="rt">'+esc(R.at)+'</span></h3>'+
    '<p class="csub">'+won(R.results.length)+'곳 중 '+won(ok)+'곳 보냄'+(R.results.length-ok?' · <b style="color:var(--danger)">'+won(R.results.length-ok)+'곳 못 보냄</b>':'')+'</p>'+
    tableBlock("bsr",[
      {k:"name",t:"청구처",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"how",t:"보낸 방법",fmt:function(v,r){return r.ok?esc(howTxt(v)):"—";}},
      {k:"st",t:"결과",state:true,fmt:function(v,r){return r.ok
        ?'<span class="tag" style="background:var(--good-soft);color:var(--good)">보냄</span>'
        :'<span class="tag" style="background:var(--danger-soft);color:var(--danger)">못 보냄</span>';}},
      {k:"why",t:"까닭",fmt:function(v,r){return r.ok?'<span style="color:var(--muted)">—</span>':esc(whyKo(v));}}
    ], R.results.map(function(x){ return {name:x.name, how:x.how, ok:!!x.ok, st:x.ok?"보냄":"못 보냄", why:x.why}; }), {})+'</div>';
}
function whyKo(w){ w=String(w||""); return (!w || !/[가-힣]/.test(w)) ? "보내지 못했어요. 번호를 확인하고 다시 시도해 주세요." : w; }
function billSendGo(ids, test){
  var due=String(($("bsDue")||{}).value||"").trim().slice(0,20); BS_DUE=due;
  bar(test?"시험 알림을 보내는 중이에요…":"청구서를 보내는 중이에요… 한 곳에 1초쯤 걸려요.","info"); busy(true);
  call("billSend",[ST.ym, ids, {due:due, test:!!test}]).then(function(r){
    busy(false); r=r||{};
    var list=(r.results||[]).map(function(x){ return {name:String(x.name||""), ok:!!x.ok, how:String(x.how||""), why:String(x.why||"")}; });
    BS_LAST={ym:ST.ym, test:!!test, at:shortTs(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString()), results:list};
    var ok=list.filter(function(x){return x.ok;}).length;
    bar(test ? (ok?"내 번호로 시험 알림을 보냈어요. 휴대폰을 확인해 주세요.":"시험 알림을 보내지 못했어요. 아래 까닭을 확인해 주세요.")
             : won(ok)+"곳에 보냈어요."+(list.length-ok?" 못 보낸 곳 "+won(list.length-ok)+"곳은 아래에서 까닭을 확인해 주세요.":""),
        (list.length-ok)?"err":"ok");
    if(test) draw(); else { clearPick("bill"); refresh(["bill"]); }
  }).catch(fail);
}
'''
rep('''PAGE.bill=function(){''', BILL_JS + '''PAGE.bill=function(){''')

rep('''AFTER.bill=function(){
  wireTable("bill",function(){ draw(); }); wireSub(); wireSend();''', r'''AFTER.bill=function(){
  wireTable("bill",function(){ draw(); }); wireSub(); wireSend();
  /* v43: 보낸 상태 고르기 · 입금 기한 · 시험 · 보내기 */
  if($("bsr-blk")) wireTable("bsr",function(){ draw(); });
  var bf=$("billSendF"); if(bf) bf.onchange=function(){ BILL_F=bf.value; ts("bill").page=1; draw(); };
  var dueI=$("bsDue"); if(dueI) dueI.oninput=function(){ BS_DUE=dueI.value; var pm=$("phoneMsg"); if(pm) pm.textContent=billAtaText(billSample(), BS_DUE); };
  /* v43: ask() 의 title · sub 는 CGG.dialog 가 esc 해요(두 번 esc 하면 &amp;amp;) — rows 만 esc (보안 d4cc2b4 낮음) */
  var bt=$("bsTest");
  if(bt) bt.onclick=function(){
    var b=billSample(); if(!b){ tell("청구서가 없어요","먼저 «청구서 만들기»를 눌러 주세요."); return; }
    ask({ title:"내 번호로 시험 알림을 보낼까요?", sub:b.name+" 청구서 모양으로 한 통만 가요",
      warn:"받는 번호는 <b>지금 로그인한 분 휴대폰</b>이에요. 청구처에는 가지 않고, «보냄» 표시도 바뀌지 않아요.", warnKind:"info", yes:"시험 보내기" },
      function(){ billSendGo([b.id], true); });
  };
  /* 청구서 주소 새로 만들기 — 서버 v33 invoiceRekey(id) · 대표만 · 예전 주소는 안 열림 (설계 보안 ⑥) */
  var rk=$("bsRekey");
  if(rk) rk.onclick=function(){
    var ids=picked("bill");
    if(!ids.length){ tell("고른 곳이 없어요","청구서 목록 왼쪽 네모로 주소를 새로 만들 곳을 먼저 골라 주세요."); return; }
    var pick=BILLS.filter(function(b){ return ids.indexOf(b.id)>=0; });
    ask({ title:"고른 "+won(pick.length)+"곳의 청구서 주소를 새로 만들까요?", rowsTitle:"새로 만들 곳",
      rows: pick.map(function(b){ return [esc(b.name), esc(b.sendState)]; }),
      warn:"<b>예전에 보낸 «청구 내역 보기» 버튼은 더 이상 열리지 않아요.</b> 주소가 잘못 전달됐을 때만 쓰고, 새로 만든 뒤 다시 보내 주세요.",
      warnKind:"bad", yes:"새로 만들기" },
      function(){
        busy(true); var n=0;
        pick.reduce(function(p,b){ return p.then(function(){ return call("invoiceRekey",[b.id]).then(function(){ n++; }); }); }, Promise.resolve())
          .then(function(){ busy(false); clearPick("bill"); bar(won(n)+"곳의 주소를 새로 만들었어요. 다시 보내 주세요.","ok"); refresh(["bill"]); })
          .catch(fail);
      });
  };
  var bs=$("bsSend");
  if(bs) bs.onclick=function(){
    var ids=picked("bill");
    if(!ids.length){ tell("고른 곳이 없어요","청구서 목록 왼쪽 네모로 보낼 곳을 먼저 골라 주세요."); return; }
    var pick=BILLS.filter(function(b){ return ids.indexOf(b.id)>=0; });
    var noTel=pick.filter(function(b){ return !b.tel; });
    var tot=0; pick.forEach(function(b){ tot+=b.total; });
    var again=pick.filter(function(b){ return b.sendState!=="안 보냄"; }).length;
    ask({ title:"고른 "+won(pick.length)+"곳에 "+ymText(ST.ym)+" 청구서를 보낼까요?",
      k1:"보낼 곳", v1:won(pick.length)+'<span style="font-size:14px">곳</span>',
      k2:"합계 금액", v2:won(tot)+'<span style="font-size:14px">원</span>',
      rows: pick.map(function(b){ return [esc(b.name)+(b.tel?"":' <span style="color:var(--danger);font-weight:700">번호 없음</span>'), won(b.total)+"원"]; }),
      warn:"알림톡으로 가고, 안 되면 문자로 자동으로 가요."+
        (noTel.length?"<br><b>번호가 없는 "+won(noTel.length)+"곳</b>은 보내지 못해요(거래처에서 번호를 넣어 주세요).":"")+
        (again?"<br>이미 보낸 곳 "+won(again)+"곳도 다시 가요. 같은 청구서는 10분 안에 다시 보내지 않아요.":""),
      warnKind: noTel.length?"bad":"info", yes:"보내기" },
      function(){ billSendGo(ids, false); });
  };''')

# ── 2) 재검사 알림 ───────────────────────────────────────────────
REMIND_PAGE = r'''/* ═══ v43: 재검사 알림 — 서버 v33 (remindRule · remindList · remindSend · remindOff) ═══
   성능점검 유효기간(검사일 + 검사소 유효일수)이 끝나기 전에, 딜러 한 명에게 그 딜러 차를 모아 한 통으로 보냅니다. */
var RRULE={}, RM_RANGE="15d", RM_LAST=null;
var RM_STEPS=[[30,"한 달 전"],[15,"보름 전"],[7,"일주일 전"],[3,"3일 전"]];
function loadRemind(){
  return Promise.all([ call("remindRule",[]), call("remindList",[RM_RANGE]) ]).then(function(r){
    RRULE=r[0]||{};
    var L=r[1]||{};
    REMIND=(L.rows||[]).map(function(x){
      var left=Number(x.left);
      return { id:String(x.carId), dealerId:String(x.dealerId||""), dealer:String(x.dealer||""),
        plate:String(x.plate||""), car:String(x.car||""), date:String(x.date||""), exp:String(x.exp||""),
        leftN:left, left: left<0 ? "지남" : (left===0 ? "오늘" : left+"일"),
        sent: x.sentAt ? shortTs(x.sentAt) : "", sentSt: x.sentAt ? "보냄" : "아직",
        _q:[x.dealer, x.plate, x.car].join(" ") };
    });
  });
}
PAGE.remind=function(){
  var days=Number(RRULE.days)||0, steps=RRULE.steps||[], dealers={}, sentN=0;
  REMIND.forEach(function(r){ dealers[r.dealerId||r.dealer]=1; if(r.sent) sentN++; });
  var own=isOwner();
  return head("재검사 알림","성능점검 유효기간(검사일로부터 정해진 날수)이 끝나기 전에 딜러에게 미리 알려 줘요. 정해 둔 때마다 한 번씩, 딜러 한 명에게 그 딜러 차를 모아 한 통으로 보내요. 같은 차 · 같은 때 알림은 두 번 가지 않아요.")+
  sums([["유효기간",(days?won(days)+"일":"—")],["보낼 대상",won(REMIND.length)+"대"],["딜러",won(Object.keys(dealers).length)+"명"],["보낸 차",won(sentN)+"대"]])+
  (days ? "" : '<div class="msg err"><b>유효기간 날수를 받지 못했어요.</b> 차곳간(010-9559-3663)으로 알려 주세요.</div>')+
  card("알림 규칙", own?"고른 때마다 한 번씩 보내요. 바꾼 뒤 «규칙 저장»을 눌러 주세요.":"규칙은 대표만 바꿀 수 있어요.",
    '<div class="tools" id="rmRule">'+
      RM_STEPS.map(function(x){ return '<label class="chip"><input type="checkbox" data-step="'+x[0]+'"'+
        (steps.indexOf(x[0])>=0?" checked":"")+(own?"":" disabled")+'> '+x[1]+'</label>'; }).join("")+
      '<label class="chip"><input type="checkbox" id="rmPast"'+(RRULE.past?" checked":"")+(own?"":" disabled")+'> 이미 지난 차도 보여 주기</label>'+
    '</div>'+
    '<div class="tools" style="margin-top:8px">'+
      '<label class="chip"><input type="checkbox" id="rmAuto"'+(RRULE.auto?" checked":"")+((own&&RRULE.ataReady)?"":" disabled")+'> 매일 아침 9시쯤 자동으로 보내기</label>'+
      (own?'<button class="btn primary" id="rmSave">규칙 저장</button>':'')+
    '</div>'+
    (RRULE.ataReady ? "" : '<p class="note" style="margin:6px 0 0">자동 보내기는 재검사 알림톡이 <b>카카오 승인된 뒤</b>에 켤 수 있어요. 그 전에는 직접 보내면 문자로 가요.</p>'))+
  card("보낼 대상","",
    tableBlock("rmd",[
      {k:"dealer",t:"딜러",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"plate",t:"차량번호"},
      {k:"car",t:"차명"},
      {k:"date",t:"검사일",kind:"date"},
      {k:"exp",t:"만료일",kind:"date"},
      {k:"left",t:"남은 날",fmt:function(v){return v==="지남"?'<span style="color:var(--danger);font-weight:800">지남</span>':esc(v);}},
      {k:"sentSt",t:"보냄",state:true,fmt:function(v,r){return r.sent
        ?'<span class="tag" style="background:var(--good-soft);color:var(--good)">보냄</span> <span style="color:var(--muted);font-size:12px">'+esc(r.sent)+'</span>'
        :'<span class="tag" style="background:var(--warn-soft);color:var(--warn)">아직</span>';}}
    ], REMIND, {pick:true,
      filters:'<select id="rmRange">'+[["today","오늘"],["week","이번 주"],["15d","최근 15일"],["month","이번 달"],["all","전체"]]
        .map(function(o){ return '<option value="'+o[0]+'"'+(RM_RANGE===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select>',
      tools:(own?'<button class="btn primary" id="rmSend">고른 차 딜러에게 보내기</button><button class="btn" id="rmTest">내 번호로 시험</button>':'')+
            '<button class="btn" id="rmOff">고른 차 빼기</button>'}))+
  remindResult()+
  card("보낼 문구",'카카오 심사용 문구예요(차곳간 채널). 실제 값은 서버가 채워요.',
    '<div class="msg info" style="margin:0 0 10px">보내는 방법 : 알림톡 (안 되면 문자로 자동)'+(RRULE.ataReady?"":" · 지금은 승인 전이라 <b>문자</b>로 가요")+'</div>'+
    '<div class="tmpl">'+esc(remindAtaText())+'</div>'+
    '<p class="note">«차량 목록 보기» 버튼을 누르면 그 딜러의 차만 보이는 화면이 30일 동안 열려요(check.cgg.co.kr/r/…). 차대번호와 전화번호는 보이지 않아요.</p>');
};
function remindAtaText(){
  var shop=OFFICE.name||ST.shopName||"우리 검사소", d=Number(RRULE.days)||120;
  return "[차곳간] 성능점검 유효기간 안내\n홍길동님, "+shop+"에서 성능점검을 받은 차량 중 유효기간이 끝났거나 곧 끝나는 차량을 안내드립니다.\n\n"+
    "대상 차량: 2대 (123가4567 외 1대)\n가장 빠른 만료일: 10월 3일\n유효기간: 검사일로부터 "+d+"일\n\n"+
    "차량별 만료일은 아래 버튼에서 확인하실 수 있습니다.\n문의: "+(OFFICE.tel||"")+"\n\n"+
    "※ 이 메시지는 "+shop+"에서 성능점검을 받은 차량의 딜러님께, 유효기간 만료 전에 발송됩니다.";
}
function remindResult(){
  var R=RM_LAST; if(!R) return "";
  var ok=R.results.filter(function(x){return x.ok;}).length;
  return card((R.test?"시험 보낸 결과":"방금 보낸 결과")+' <span class="rt">'+esc(R.at)+'</span>',
    won(R.results.length)+'명 중 '+won(ok)+'명에게 보냄',
    tableBlock("rmr",[
      {k:"dealer",t:"딜러",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"cars",t:"차",num:true,fmt:function(v){return won(v)+"대";}},
      {k:"how",t:"보낸 방법",fmt:function(v,r){return r.ok?esc(howTxt(v)):"—";}},
      {k:"st",t:"결과",state:true,fmt:function(v,r){return r.ok
        ?'<span class="tag" style="background:var(--good-soft);color:var(--good)">보냄</span>'
        :'<span class="tag" style="background:var(--danger-soft);color:var(--danger)">못 보냄</span>';}},
      {k:"why",t:"까닭",fmt:function(v,r){return r.ok?'<span style="color:var(--muted)">—</span>':esc(whyKo(v));}}
    ], R.results, {}));
}
function remindGo(carIds, test){
  bar(test?"시험 알림을 보내는 중이에요…":"재검사 알림을 보내는 중이에요…","info"); busy(true);
  call("remindSend",[carIds, {test:!!test}]).then(function(r){
    busy(false); r=r||{};
    var list=(r.results||[]).map(function(x){ return {dealer:String(x.dealer||""), cars:Number(x.cars)||0, ok:!!x.ok,
      how:String(x.how||""), st:x.ok?"보냄":"못 보냄", why:String(x.why||"")}; });
    RM_LAST={test:!!test, at:shortTs(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString()), results:list};
    var ok=list.filter(function(x){return x.ok;}).length;
    bar(test ? (ok?"내 번호로 시험 알림을 보냈어요. 휴대폰을 확인해 주세요.":"시험 알림을 보내지 못했어요. 아래 까닭을 확인해 주세요.")
             : won(ok)+"명에게 보냈어요."+(list.length-ok?" 못 보낸 "+won(list.length-ok)+"명은 아래에서 까닭을 확인해 주세요.":""),
        (list.length-ok)?"err":"ok");
    if(test) draw(); else { clearPick("rmd"); refresh(["remind"]); }
  }).catch(fail);
}
AFTER.remind=function(){
  wireTable("rmd",function(){ draw(); });
  if($("rmr-blk")) wireTable("rmr",function(){ draw(); });
  var rg=$("rmRange"); if(rg) rg.onchange=function(){ RM_RANGE=rg.value; refresh(["remind"]); };
  var sv=$("rmSave");
  if(sv) sv.onclick=function(){
    var st=[]; document.querySelectorAll("#rmRule [data-step]").forEach(function(c){ if(c.checked) st.push(Number(c.getAttribute("data-step"))); });
    var past=!!($("rmPast")||{}).checked, auto=!!($("rmAuto")||{}).checked;
    if(!st.length){ tell("고른 때가 없어요","언제 보낼지 하나 이상 골라 주세요."); return; }
    busy(true);
    call("remindRuleSave",[{steps:st, past:past, auto:auto}]).then(function(){
      busy(false); bar("알림 규칙을 저장했어요.","ok"); refresh(["remind"]); }).catch(fail);
  };
  function pickedCars(){ var ids=picked("rmd"); return REMIND.filter(function(r){ return ids.indexOf(r.id)>=0; }); }
  function byDealer(list){ var m={}, order=[];
    list.forEach(function(r){ var k=r.dealerId||r.dealer; if(!m[k]){ m[k]={name:r.dealer, n:0}; order.push(k); } m[k].n++; });
    return order.map(function(k){ return m[k]; }); }
  var sd=$("rmSend");
  if(sd) sd.onclick=function(){
    var cars=pickedCars();
    if(!cars.length){ tell("고른 차가 없어요","왼쪽 네모로 알릴 차를 먼저 골라 주세요."); return; }
    var g=byDealer(cars);
    ask({ title:"딜러 "+won(g.length)+"명에게 차 "+won(cars.length)+"대 재검사 알림을 보낼까요?",
      k1:"딜러", v1:won(g.length)+'<span style="font-size:14px">명</span>',
      k2:"차", v2:won(cars.length)+'<span style="font-size:14px">대</span>',
      rowsTitle:"받는 딜러",
      rows: g.map(function(x){ return [esc(x.name), won(x.n)+"대"]; }),
      warn:"딜러 한 명에게 한 통으로 모아서 가요. "+(RRULE.ataReady?"알림톡으로 가고, 안 되면 문자로 가요.":"재검사 알림톡이 아직 승인 전이라 <b>문자</b>로 가요.")+
        "<br>같은 차 · 같은 때 알림은 다시 가지 않아요.", warnKind:"info", yes:"보내기" },
      function(){ remindGo(cars.map(function(r){ return r.id; }), false); });
  };
  var tt=$("rmTest");
  if(tt) tt.onclick=function(){
    var cars=pickedCars(); if(!cars.length) cars=REMIND.slice(0,1);
    if(!cars.length){ tell("보낼 차가 없어요","목록에 차가 있을 때 시험할 수 있어요."); return; }
    var d=cars[0].dealerId; cars=cars.filter(function(r){ return r.dealerId===d; });
    ask({ title:"내 번호로 시험 알림을 보낼까요?", sub:cars[0].dealer+" 님 차 "+won(cars.length)+"대 모양으로 한 통만 가요",
      warn:"받는 번호는 <b>지금 로그인한 분 휴대폰</b>이에요. 딜러에게는 가지 않고 «보냄» 표시도 바뀌지 않아요.", warnKind:"info", yes:"시험 보내기" },
      function(){ remindGo(cars.map(function(r){ return r.id; }), true); });
  };
  var of=$("rmOff");
  if(of) of.onclick=function(){
    var cars=pickedCars();
    if(!cars.length){ tell("고른 차가 없어요","왼쪽 네모로 뺄 차를 먼저 골라 주세요."); return; }
    ask({ title:"고른 차 "+won(cars.length)+"대를 알림에서 뺄까요?", rowsTitle:"뺄 차",
      rows: cars.map(function(r){ return [esc(r.plate||"-"), esc(r.dealer)]; }),
      warn:"이미 팔렸거나 재검사를 받은 차를 빼 두면 앞으로 알림이 가지 않아요.", warnKind:"info", yes:"빼기" },
      function(){
        busy(true);
        call("remindOff",[cars.map(function(r){ return r.id; }), true]).then(function(r){
          busy(false); clearPick("rmd"); bar(won((r&&r.n)||cars.length)+"대를 뺐어요.","ok"); refresh(["remind"]); }).catch(fail);
      });
  };
};
'''
cut('''PAGE.remind=function(){''', '''/* ── 세금계산서 ── */
PAGE.hometax=function(){''', REMIND_PAGE + "\n")
rep('''  deliv:["deliv"], delivdest:["deliv"],''', '''  remind:["remind","set"],
  deliv:["deliv"], delivdest:["deliv"],''')
rep('''  pop:loadPop, tax:loadTax, ins:loadIns, up:loadUp, sales:loadSales };''',
    '''  pop:loadPop, tax:loadTax, ins:loadIns, up:loadUp, sales:loadSales, remind:loadRemind };''')
# 청구서 화면도 우리 검사소 정보(계좌 · 전화)가 필요해요
rep('''home:["bill","dep"], sales:["sales"], bill:["bill"],''', '''home:["bill","dep"], sales:["sales"], bill:["bill","set"],''')

# ── 3) 숫자 카드 · 판 표시 ─────────────────────────────────────
CSS = '''<style id="v43-piece">
/* v43: 작은 그래프가 없는 숫자 카드는 이름 오른쪽을 비우지 않아요 (디자인 «공통-2») */
.cgg-kpi:not(:has(svg.sp)) small{padding-right:0}
</style>'''
m = re.search(r'<style id="v42-cal">.*?</style>', s, re.S)
s = s[:m.end()] + "\n" + CSS + s[m.end():]
rep('$("hdVer").textContent="체크 v42 · "', '$("hdVer").textContent="체크 v43 · "')

for bad in ["wireSend(); wireSend", "check.cgg.co.kr/v/…"]:
    if bad in s: raise SystemExit("남음: " + bad)
open(BASE + "2_차곳간_체크_index_v43.html", "w", encoding="utf-8").write(s)
print("OK v43", len(s))
