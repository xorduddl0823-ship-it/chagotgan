"""체크 v43 → v44 — 시험 뒤 판 (v43 은 읽기만 · 시험판 v42 는 그대로)
받은 일: 총괄 10-17 «대표님 시험 지적 — 설정 › 정산 기준 거래처 버튼이 모두 준비 중이라 새 검사소가 딜러를 못 넣음 (운영/06 N)»
바꾸는 것 (출시 전 필수 3가지 — 나머지 사진 · 엑셀은 준비 중 그대로):
  1) + 딜러 추가 — 이름 · 휴대폰 · 소속 상사(있는 상사 고르기 또는 새 이름) → dealerSave
  2) + 매매상사 추가 — 상사명 · 사업자등록번호 · 대표자 · 연락처 → companySave (서버 v34 새 창구)
  3) 선택한 줄 지우기 — 상사(companyDel) · 딜러(dealerDel, «선택한 딜러 지우기» 새 버튼) — 이름 확인 창 (1.5 규칙 ②)
  · 모두 대표만(직원은 버튼이 안 보임 — 서버도 막음). 서버에 새 창구가 아직 없으면 «서버를 새로 올려야 쓸 수 있어요» 안내만.
창구 약속: 체크/기획/2026-10-17_v44_거래처_창구_약속.md
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v43.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 자료: 매매상사 목록 (서버 v34 companies — 없으면 딜러에서 모은 예전 방식) ──
rep('''function loadSet(){
  return Promise.all([ loadDealers(), call("dataCount",[]), call("officeGet",[]) ])
  .then(function(r){ COUNTS=r[1]||{}; OFFICE=r[2]||{}; });
}''', '''function loadSet(){
  return Promise.all([ loadDealers(), call("dataCount",[]), call("officeGet",[]),
                       call("companies",[]).catch(function(){ return null; }) ])   /* v44: 서버 v34 전에는 null */
  .then(function(r){ COUNTS=r[1]||{}; OFFICE=r[2]||{};
    COMPS = Array.isArray(r[3]) ? r[3].map(function(c){
      return { id:String(c.id), name:String(c.name||""), biz:String(c.biz_no||""), ceo:String(c.ceo||""), tel:String(c.tel||""),
               cnt:Number(c.dealerN)||0, n:(Number(c.dealerN)||0)+"명", _q:[c.name,c.biz_no,c.ceo].join(" ") }; }) : null; });
}
var COMPS=null;   /* v44: null 이면 서버에 companies 창구가 아직 없음 */''')

# 딜러 목록에 상사 id 도 들고 있기 (상사 고르기 · 지우기 확인용)
rep('''      return { id:d.id, name:d.name, comp:(d.company&&d.company.name)||"",''',
    '''      return { id:d.id, name:d.name, comp:(d.company&&d.company.name)||"", compId:(d.company&&d.company.id)||"",''')

# ── 화면: 상사 표는 서버 목록이 있으면 그것으로 · 버튼에 이름 붙이기 ──
rep('''  var COMP=Object.keys(cmap).sort().map(function(k){
    var c=cmap[k]; c.n=c.cnt+"명"; c._q=[c.name,c.biz].join(" "); return c; });''',
    '''  var COMP=COMPS || Object.keys(cmap).sort().map(function(k){
    var c=cmap[k]; c.n=c.cnt+"명"; c._q=[c.name,c.biz].join(" "); return c; });
  var own=isOwner();''')
rep('''      tools:'<button class="btn">+ 매매상사 추가</button><button class="btn">사업자등록증 사진으로 추가</button>'+
            '<button class="btn">엑셀에서 불러오기</button><button class="btn danger">선택한 줄 지우기</button>'}))+''',
    '''      tools:(own?'<button class="btn primary" id="cmpAdd">+ 매매상사 추가</button>':'')+'<button class="btn">사업자등록증 사진으로 추가</button>'+
            '<button class="btn">엑셀에서 불러오기</button>'+(own?'<button class="btn danger" id="cmpDel">선택한 줄 지우기</button>':'')}))+''')
rep('''            '<button class="btn">+ 딜러 추가</button><button class="btn">명함 사진으로 추가</button>'+
            '<button class="btn">연락처 한꺼번에 넣기</button>'}));''',
    '''            (own?'<button class="btn primary" id="dlrAdd">+ 딜러 추가</button>':'')+'<button class="btn">명함 사진으로 추가</button>'+
            '<button class="btn">연락처 한꺼번에 넣기</button>'+(own?'<button class="btn danger" id="dlrDel">선택한 딜러 지우기</button>':'')})+
    (own?'':'<p class="note">딜러 · 매매상사를 넣고 지우는 것은 대표만 할 수 있어요.</p>'));''')

# ── 동작 ──
rep('''  document.querySelectorAll("#main .btn").forEach(function(b){
    if(b.textContent==="선택한 딜러를 한 곳으로 묶기") b.onclick=function(){ tieDealers(false); };''',
    '''  /* v44: 딜러 · 매매상사 넣기 · 지우기 (대표만) */
  var da=$("dlrAdd"); if(da) da.onclick=function(){ dealerForm(); };
  var ca=$("cmpAdd"); if(ca) ca.onclick=function(){ companyForm(); };
  var dd=$("dlrDel"); if(dd) dd.onclick=function(){ dealerDelGo(); };
  var cd=$("cmpDel"); if(cd) cd.onclick=function(){ companyDelGo(); };
  document.querySelectorAll("#main .btn").forEach(function(b){
    if(b.textContent==="선택한 딜러를 한 곳으로 묶기") b.onclick=function(){ tieDealers(false); };''')

PARTNER_JS = r'''/* ═══ v44: 거래처 넣기 · 지우기 — 딜러 dealerSave · dealerDel / 매매상사 companySave · companyDel (서버 v34) ═══
   딜러 번호가 등록돼야 차량 도착 알림이 가요(보안 M2). 그래서 넣고 지우는 것은 대표만 해요. */
function telDigits(v){ return String(v||"").replace(/[^0-9]/g,""); }
function telOk(v){ return /^01[016789]\d{7,8}$/.test(telDigits(v)); }
function needNewServer(e){
  var m=String((e&&e.message)||"");
  /* 서버 v34 전(companies 창구 없음)에 실패하면 까닭을 알려 줌 — 그 밖에는 서버 글 그대로 */
  if(COMPS===null) return "서버를 새로 올려야 쓸 수 있어요(체크 서버 v34). 차곳간에 알려 주세요.";
  return m || "처리하지 못했어요. 다시 시도해 주세요.";
}
function sheetForm(title, sub, fields, okText, onOk){
  var sh=$("sheet"); if(!sh) return;
  sh.innerHTML='<h3 style="margin:0 0 2px">'+esc(title)+'</h3>'+
    '<div style="color:var(--muted);font-size:12.5px;margin-bottom:13px">'+esc(sub)+'</div>'+
    fields.map(function(f){
      if(f.html) return f.html;
      return '<label class="f" for="'+f.id+'">'+esc(f.label)+(f.need?' <b style="color:var(--danger)">*</b>':'')+'</label>'+
        '<input type="'+(f.type||"text")+'" id="'+f.id+'" maxlength="'+(f.max||40)+'" style="width:100%;margin-bottom:10px"'+
        (f.ph?' placeholder="'+esc(f.ph)+'"':'')+(f.mode?' inputmode="'+f.mode+'"':'')+' value="'+esc(f.value||"")+'">';
    }).join("")+
    '<div class="msg err" id="sfErr" hidden style="margin:4px 0 10px"></div>'+
    '<div class="sheetbtns"><button class="btn" id="sfNo">닫기</button><button class="btn primary" id="sfOk">'+esc(okText)+'</button></div>';
  openSheet();
  $("sfNo").onclick=closeSheet;
  $("sfOk").onclick=function(){
    var v={}; fields.forEach(function(f){ if(f.id){ var e=$(f.id); v[f.id]=e?String(e.value||"").trim():""; } });
    var err=onOk(v);
    if(err){ var b=$("sfErr"); b.hidden=false; b.textContent=err; }
  };
  var first=fields.filter(function(f){return f.id;})[0]; if(first) setTimeout(function(){ var e=$(first.id); if(e) e.focus(); },50);
}
function compOptions(){
  var list = COMPS || (function(){ var m={}; DEALERS.forEach(function(d){ if(d.comp && d.compId) m[d.compId]=d.comp; });
    return Object.keys(m).map(function(k){ return {id:k, name:m[k]}; }); })();
  list = list.slice().sort(function(a,b){ return a.name.localeCompare(b.name,"ko"); });
  return '<option value="">(소속 상사 없음)</option>'+list.map(function(c){ return '<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'; }).join("")+
    '<option value="__new">+ 새 상사 이름 넣기…</option>';
}
function dealerForm(){
  sheetForm("딜러 추가","이름은 접수리스트의 «신청인»과 똑같이 적어 주세요. 휴대폰 번호가 있어야 차량 도착 알림이 가요.", [
    {id:"dfName", label:"딜러 이름", need:true, ph:"예: 홍길동", max:20},
    {id:"dfTel", label:"휴대폰 번호", need:true, ph:"예: 010-1234-5678", mode:"tel", max:15},
    {html:'<label class="f" for="dfComp">소속 상사</label><select id="dfComp" style="width:100%;margin-bottom:10px">'+compOptions()+'</select>'},
    {html:'<div id="dfNewBox" hidden><label class="f" for="dfNew">새 상사 이름</label><input type="text" id="dfNew" maxlength="40" style="width:100%;margin-bottom:10px" placeholder="접수리스트의 회사명과 똑같이"></div>'}
  ], "딜러 넣기", function(v){
    var name=v.dfName, tel=telDigits(v.dfTel), sel=($("dfComp")||{}).value||"", nw=String(($("dfNew")||{}).value||"").trim();
    if(!name) return "딜러 이름을 넣어 주세요.";
    if(!telOk(tel)) return "휴대폰 번호를 010으로 시작하는 10~11자리로 넣어 주세요.";
    if(sel==="__new" && !nw) return "새 상사 이름을 넣거나, «소속 상사 없음»을 골라 주세요.";
    var same=DEALERS.filter(function(d){ return d.name===name && telDigits(d.tel)===tel; });
    if(same.length) return "같은 이름 · 같은 번호의 딜러가 이미 있어요.";
    busy(true);
    var getComp = sel==="__new" ? call("companySave",[{name:nw}]).then(function(c){ return c&&c.id; }) : Promise.resolve(sel||null);
    getComp.then(function(compId){
      return call("dealerSave",[{name:name, tel:tel, company_id:compId||null}]);
    }).then(function(){
      busy(false); closeSheet(); bar(name+" 딜러를 넣었어요. 이제 이 번호로 차량 도착 알림이 가요.","ok"); refresh(["set"]);
    }).catch(function(e){ busy(false); var b=$("sfErr"); if(b){ b.hidden=false; b.textContent=needNewServer(e); } });
    return "";
  });
  var sel=$("dfComp"), box=$("dfNewBox");
  if(sel) sel.onchange=function(){ if(box) box.hidden = sel.value!=="__new"; };
}
function companyForm(){
  sheetForm("매매상사 추가","상사명은 접수리스트의 회사명과 똑같이 적어야 자동으로 연결돼요.", [
    {id:"cfName", label:"상사명", need:true, ph:"예: 하늘모터스", max:40},
    {id:"cfBiz", label:"사업자등록번호", ph:"숫자 10자리 (세금계산서에 써요)", mode:"numeric", max:12},
    {id:"cfCeo", label:"대표자", max:20},
    {id:"cfTel", label:"연락처", mode:"tel", max:15}
  ], "상사 넣기", function(v){
    if(!v.cfName) return "상사명을 넣어 주세요.";
    var biz=telDigits(v.cfBiz);
    if(biz && biz.length!==10) return "사업자등록번호는 숫자 10자리예요. 모르면 비워 두세요.";
    if((COMPS||[]).some(function(c){ return c.name===v.cfName; })) return "같은 이름의 상사가 이미 있어요.";
    busy(true);
    call("companySave",[{name:v.cfName, biz_no:biz, ceo:v.cfCeo, tel:telDigits(v.cfTel)}]).then(function(){
      busy(false); closeSheet(); bar(v.cfName+" 상사를 넣었어요.","ok"); refresh(["set"]);
    }).catch(function(e){ busy(false); var b=$("sfErr"); if(b){ b.hidden=false; b.textContent=needNewServer(e); } });
    return "";
  });
}
function dealerDelGo(){
  var ids=picked("dlr");
  if(!ids.length){ tell("고른 딜러가 없어요","딜러 표 왼쪽 네모로 지울 딜러를 먼저 골라 주세요."); return; }
  var pick=DEALERS.filter(function(d){ return ids.indexOf(d.id)>=0; });
  askPicked("딜러 "+won(pick.length)+"명을 지울까요?", pick.map(function(d){ return [d.name, d.comp||""]; }), "지우기", function(){
    busy(true);
    call("dealerDel",[{ids:ids}]).then(function(r){
      busy(false); clearPick("dlr"); bar(won((r&&r.n)||ids.length)+"명을 지웠어요.","ok"); refresh(["set","bill"]);
    }).catch(function(e){ fail({message:needNewServer(e)}); });
  }, "지운 딜러에게는 <b>차량 도착 알림이 더 이상 가지 않아요.</b> 지난 청구서 · 배달 기록은 그대로 남아요.");
}
function companyDelGo(){
  if(!COMPS){ tell("아직 지울 수 없어요","서버를 새로 올려야 쓸 수 있어요(체크 서버 v34). 차곳간에 알려 주세요."); return; }
  var ids=picked("cmp");
  if(!ids.length){ tell("고른 상사가 없어요","매매상사 표 왼쪽 네모로 지울 상사를 먼저 골라 주세요."); return; }
  var pick=COMPS.filter(function(c){ return ids.indexOf(c.id)>=0; });
  var busyN=pick.filter(function(c){ return c.cnt>0; });
  askPicked("매매상사 "+won(pick.length)+"곳을 지울까요?", pick.map(function(c){ return [c.name, c.cnt?("소속 딜러 "+c.cnt+"명"):""]; }), "지우기", function(){
    busy(true);
    call("companyDel",[{ids:ids}]).then(function(r){
      busy(false); clearPick("cmp");
      var kept=(r&&r.kept)||[];
      bar(won((r&&r.n)||0)+"곳을 지웠어요."+(kept.length?" 소속 딜러가 있는 "+won(kept.length)+"곳은 남겼어요 — 딜러를 먼저 옮기거나 지워 주세요.":""), kept.length?"err":"ok");
      refresh(["set","bill"]);
    }).catch(function(e){ fail({message:needNewServer(e)}); });
  }, busyN.length ? "소속 딜러가 있는 상사 <b>"+won(busyN.length)+"곳</b>은 지워지지 않아요. 딜러를 먼저 다른 상사로 옮기거나 지워 주세요." : "");
}
'''
rep('''var OFF_KEYS=["name","biz_no","owner_name","tel","addr","sms_from","biz_type","biz_class",''',
    PARTNER_JS + '''var OFF_KEYS=["name","biz_no","owner_name","tel","addr","sms_from","biz_type","biz_class",''')
# ── 4) 딜러 등록 대기 (서버 v34 delivPendingDealers · delivApproveDealer · delivRejectDealer · 대표만) ──
#    설계: 체크/기획/2026-10-17_딜러등록대기_설계.md (보안 ⑥~⑨) · 서버/설계/22
rep(r"""function loadDeliv(){
  var g=delivRange();""", r"""var PEND=null;   /* v44: 딜러 등록 대기 — null 이면 서버 v34 전이거나 대표가 아님 */
function loadPend(){
  if(!isOwner()){ PEND=null; return Promise.resolve(); }
  return call("delivPendingDealers",[]).then(function(r){
    PEND=((r&&r.list)||[]).map(function(x,i){
      var names=(x.names||[]).map(String), comps=(x.companies||[]).map(String), drv=(x.drivers||[]).map(String);
      return { id:"p"+i, tel:String(x.tel||""), names:names, name:names[0]||"", comps:comps, drivers:drv,
        n:Number(x.n)||0, first:shortTs(x.first), last:shortTs(x.last),
        match:(x.match||[]).map(function(m){ return {id:String(m.id), name:String(m.name||"")}; }),
        _q:[x.tel].concat(names, comps, drv).join(" ") };
    });
  }).catch(function(){ PEND=null; });
}
function loadDeliv(){
  var g=delivRange();""")
rep(r"""                       call("deliv_accounts",[ST.key]) ])
  .then(function(r){
    var d=r[0]||{};
    DRIVES=(d.rows||[]).map(mapDrive);""", r"""                       call("deliv_accounts",[ST.key]), loadPend() ])   /* v44: 딜러 등록 대기도 같이 */
  .then(function(r){
    var d=r[0]||{};
    DRIVES=(d.rows||[]).map(mapDrive);""")
rep(r"""  return delivHead()+delivTabs("deliv")+
  card("기간","최근 30일을 보고 있어요.",""", r"""  return delivHead()+delivTabs("deliv")+pendCard()+
  card("기간","최근 30일을 보고 있어요.",""")
rep(r"""AFTER.deliv=function(){
  wireTable("drv",function(){ draw(); }); wireSub();""", r"""AFTER.deliv=function(){
  wireTable("drv",function(){ draw(); }); wireSub(); pendWire();""")
PEND_JS = r"""/* ═══ v44: 딜러 등록 대기 — 기사가 처음 적은 딜러 번호(보안 M2로 못 간 알림)를 대표가 보고 승인 ═══
   기사가 적은 글(이름 · 상사 · 기사)은 모두 esc (보안 ⑧) · 승인 창에 «본인 번호 확인» 체크 (⑨) · 한 번에 20줄 */
var PEND_MAX=20;
function pendCard(){
  if(!PEND || !PEND.length) return "";
  return card('딜러 등록 대기 <span class="rt">'+won(PEND.length)+'건</span>',
    "기사가 처음 적은 딜러 번호예요. 아직 딜러 목록에 없어서 도착 알림이 가지 않았어요. 맞는 번호면 등록하고 다시 보내요.",
    tableBlock("pnd",[
      {k:"name",t:"딜러 (기사가 적은 이름)",name:true,fmt:function(v,r){
        return r.names.length>1
          ? '<select class="pnName" data-p="'+esc(r.id)+'">'+r.names.map(function(x){ return '<option'+(x===r.name?' selected':'')+'>'+esc(x)+'</option>'; }).join("")+'</select>'
          : '<b>'+esc(v)+'</b>';}},
      {k:"tel",t:"휴대폰",kind:"id"},
      {k:"comps",t:"상사",fmt:function(v){ return esc((v||[]).join(", ")); }},
      {k:"match",t:"같은 이름 딜러",fmt:function(v,r){
        if(!v.length) return '<span style="color:var(--muted)">새 딜러로</span>';
        return '<select class="pnMatch" data-p="'+esc(r.id)+'"><option value="">새 딜러로 넣기</option>'+
          v.map(function(m){ return '<option value="'+esc(m.id)+'"'+(r.dealerId===m.id?' selected':'')+'>'+esc(m.name)+' 님에게 번호 더하기</option>'; }).join("")+'</select>';}},
      {k:"n",t:"못 간 알림",num:true,fmt:function(v){ return won(v)+"건"; }},
      {k:"drivers",t:"적은 기사",fmt:function(v){ return esc((v||[]).join(", ")); }},
      {k:"last",t:"마지막",kind:"date"}
    ], PEND, {pick:true,
      tools:'<button class="btn primary" id="pnOk">고른 줄 등록하고 다시 보내기</button><button class="btn" id="pnNo">고른 줄 등록 안 함</button>'}));
}
function pendWire(){
  if(!$("pnd-blk")) return;
  wireTable("pnd",function(){ draw(); });
  document.querySelectorAll(".pnName").forEach(function(sel){ sel.onchange=function(){
    var r=PEND.filter(function(x){ return x.id===sel.getAttribute("data-p"); })[0]; if(r) r.name=sel.value; }; });
  document.querySelectorAll(".pnMatch").forEach(function(sel){ sel.onchange=function(){
    var r=PEND.filter(function(x){ return x.id===sel.getAttribute("data-p"); })[0]; if(r) r.dealerId=sel.value||""; }; });
  function picks(){ var ids=picked("pnd"); return PEND.filter(function(r){ return ids.indexOf(r.id)>=0; }); }
  var ok=$("pnOk");
  if(ok) ok.onclick=function(){
    var L=picks();
    if(!L.length){ tell("고른 줄이 없어요","왼쪽 네모로 등록할 딜러를 먼저 골라 주세요."); return; }
    if(L.length>PEND_MAX){ tell("너무 많이 골랐어요","한 번에 "+PEND_MAX+"줄까지 등록할 수 있어요."); return; }
    var sh=$("sheet"); if(!sh) return;
    var tot=0; L.forEach(function(r){ tot+=r.n; });
    sh.innerHTML='<h3 style="margin:0 0 2px">딜러 '+won(L.length)+'명을 등록하고 알림을 다시 보낼까요?</h3>'+
      '<div style="color:var(--muted);font-size:12.5px;margin-bottom:12px">등록하면 이 번호로 앞으로도 차량 도착 알림이 가요. 못 간 알림 '+won(tot)+'건 중 24시간 안 것만 다시 보내요.</div>'+
      '<div class="dlg-who">'+L.map(function(r){ var m=r.dealerId?r.match.filter(function(x){return x.id===r.dealerId;})[0]:null;
        return '<div><b>'+esc(r.name)+'</b><span style="color:var(--muted);font-weight:700">'+esc(r.tel)+(m?' · '+esc(m.name)+' 님에게 더하기':' · 새 딜러')+'</span></div>'; }).join("")+'</div>'+
      '<label class="chip" style="margin:12px 0 4px;display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="pnSure"> '+
        '<span>이 번호가 <b>그 딜러 본인 번호</b>인지 확인했어요 (전화 · 명함 등)</span></label>'+
      '<label class="chip" style="margin:0 0 10px;display:flex;gap:8px"><input type="checkbox" id="pnResend" checked> <span>못 간 알림 다시 보내기 (24시간 안 것만)</span></label>'+
      '<div class="msg err" id="pnErr" hidden style="margin:0 0 10px"></div>'+
      '<div class="sheetbtns"><button class="btn" id="pnClose">닫기</button><button class="btn primary" id="pnGo">등록하기</button></div>';
    openSheet();
    $("pnClose").onclick=closeSheet;
    $("pnGo").onclick=function(){
      if(!$("pnSure").checked){ var e=$("pnErr"); e.hidden=false; e.textContent="본인 번호인지 확인했다고 체크해 주세요."; return; }
      var resend=!!$("pnResend").checked;
      var body=L.map(function(r){ var o={name:r.name, tel:r.tel, resend:resend}; if(r.dealerId) o.dealerId=r.dealerId; return o; });
      busy(true);
      call("delivApproveDealer",[body]).then(function(res){
        busy(false); closeSheet(); clearPick("pnd");
        var R=(res&&res.results)||[], okN=R.filter(function(x){return x.ok;}).length, sent=0, failN=0;
        R.forEach(function(x){ sent+=Number(x.sent)||0; failN+=Number(x.failed)||0; });
        var bad=R.filter(function(x){return !x.ok;});
        bar(won(okN)+"명을 등록했어요."+(resend?" 알림 "+won(sent)+"건을 다시 보냈어요."+(failN?" "+won(failN)+"건은 못 보냈어요.":""):"")+
          (bad.length?" 등록 못 한 "+won(bad.length)+"줄 — "+bad.slice(0,2).map(function(x){ return String(x.why||""); }).join(" / "):""),
          (bad.length||failN)?"err":"ok");
        DEALERS=[]; refresh(["deliv","set"]);
      }).catch(function(e){ busy(false); var b=$("pnErr"); if(b){ b.hidden=false; b.textContent=String((e&&e.message)||"처리하지 못했어요. 다시 시도해 주세요."); } });
    };
  };
  var no=$("pnNo");
  if(no) no.onclick=function(){
    var L=picks();
    if(!L.length){ tell("고른 줄이 없어요","왼쪽 네모로 뺄 줄을 먼저 골라 주세요."); return; }
    askPicked("고른 "+won(L.length)+"줄을 등록하지 않을까요?", L.map(function(r){ return [r.name, r.tel]; }), "등록 안 함", function(){
      busy(true);
      call("delivRejectDealer",[L.map(function(r){ return {name:r.name, tel:r.tel}; })]).then(function(res){
        busy(false); clearPick("pnd"); bar(won((res&&res.n)||L.length)+"줄을 대기에서 뺐어요. 알림은 가지 않아요.","ok"); refresh(["deliv"]);
      }).catch(fail);
    }, "대기 목록에서만 빠지고, 배달 기록은 그대로 남아요. 이 번호로는 알림이 가지 않아요.");
  };
}
"""
rep(r"""PAGE.deliv=function(){""", PEND_JS + r"""PAGE.deliv=function(){""")

rep('$("hdVer").textContent="체크 v43 · "', '$("hdVer").textContent="체크 v44 · "')
open(BASE + "2_차곳간_체크_index_v44.html", "w", encoding="utf-8").write(s)
print("OK v44", len(s))
