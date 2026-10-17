"""체크 v47 → v48 — 총괄 순서 ③ «청구서 미리보기 · 인쇄 · 그림 · 엑셀(요약 · 명세)» (v47 은 읽기만 · 보안 최종 987f5dd)
월별 청구서 아래 «준비 중»이던 네 버튼을 살려요. 서버 새 창구 없음 — 지금 있는 invoiceRows(id) 만 씀.
  · 고른 줄이 있으면 고른 곳만, 없으면 지금 표에 보이는 곳 모두 (한 번에 100곳까지)
  · 청구서 미리보기 · 인쇄 → 화면 위에 청구서들을 펼치고 «인쇄»(인쇄할 때는 청구서만 · 한 곳에 한 장)
  · 청구서 그림으로 받기 → 청구처마다 PNG 한 장 (html2canvas)
  · 엑셀(요약) → 청구처 한 줄씩 · 엑셀(명세 포함) → «요약» + «명세»(신청인 · 갈래 · 항목 · 단가 · 수량 · 금액) 두 장
  · 글은 모두 esc · 파일 이름에서 쓰면 안 되는 글자 뺌
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v47.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('''      '<button class="btn primary">청구서 미리보기 · 인쇄</button>'+
      '<button class="btn go">청구서 그림으로 받기 (청구처별)</button>'+
      '<button class="btn">엑셀 다운로드 (요약)</button>'+
      '<button class="btn">명세까지 포함해 다운로드</button>'+''',
    '''      '<button class="btn primary" id="bPrint">청구서 미리보기 · 인쇄</button>'+
      '<button class="btn go" id="bPng">청구서 그림으로 받기 (청구처별)</button>'+
      '<button class="btn" id="bXls">엑셀 다운로드 (요약)</button>'+
      '<button class="btn" id="bXlsAll">명세까지 포함해 다운로드</button>'+''')
rep('''    '<p class="note">청구처 이름을 누르면 <b>검사비 내역 · 정비비 내역</b>이 아래에 펼쳐져요. 묶인 딜러(+ 이름)로도 찾기가 돼요.</p>'+''',
    '''    '<p class="note">청구처 이름을 누르면 <b>검사비 내역 · 정비비 내역</b>이 아래에 펼쳐져요. 묶인 딜러(+ 이름)로도 찾기가 돼요. '+
      '아래 인쇄 · 그림 · 엑셀은 <b>고른 곳만</b>(고르지 않으면 지금 보이는 곳 모두) 만들어요.</p>'+''')
rep('''  wireYm("bYm",["bill","dep","up"]);''', '''  wireYm("bYm",["bill","dep","up"]);
  /* v48: 미리보기 · 인쇄 · 그림 · 엑셀 */
  var bp=$("bPrint"); if(bp) bp.onclick=function(){ billOut("print"); };
  var bg=$("bPng"); if(bg) bg.onclick=function(){ billOut("png"); };
  var bx=$("bXls"); if(bx) bx.onclick=function(){ billOut("xls"); };
  var ba=$("bXlsAll"); if(ba) ba.onclick=function(){ billOut("xlsAll"); };''')

OUT_JS = r'''/* ═══ v48: 청구서 미리보기 · 인쇄 · 그림 · 엑셀 — 고른 곳(없으면 보이는 곳 모두) ═══ */
function billTargets(){
  var ids=picked("bill"), L=BILLS.filter(function(b){ return ids.indexOf(b.id)>=0; });
  if(!L.length) L=billShown();
  return L.slice(0,100);
}
function billLoadRows(L){
  return L.reduce(function(p,b){ return p.then(function(){
    if(b.rows!==null) return;
    return call("invoiceRows",[b.id]).then(function(list){ b.rows=list||[]; }); }); }, Promise.resolve());
}
function fileSafe(t){ return String(t||"").replace(/[\\\/:*?"<>|\s]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40)||"청구서"; }
/* 청구서 한 장 — 검사비는 같은 항목 · 단가끼리 묶고, 정비비는 한 줄씩 */
function billDocHtml(b){
  var d=detailRows(b), g={}, order=[];
  d.fee.forEach(function(r){ var k=r.kind+"|"+r.goods+"|"+r.unit; if(!g[k]){ g[k]={kind:r.kind, goods:r.goods, unit:r.unit, n:0, amount:0}; order.push(k); }
    g[k].n+=Number(r.qty)||1; g[k].amount+=Number(r.amount)||0; });
  var feeSum=d.fee.reduce(function(s,r){ return s+(Number(r.amount)||0); },0), repSum=d.rep.reduce(function(s,r){ return s+(Number(r.amount)||0); },0);
  var O=OFFICE||{};
  function ln(l,r,cls){ return '<tr'+(cls?' class="'+cls+'"':'')+'><td>'+l+'</td><td class="prt-n">'+r+'</td></tr>'; }
  return '<section class="prt-doc">'+
    '<div class="prt-head"><h2>'+esc(ymText(ST.ym))+'분 청구서</h2><div class="prt-who"><b>'+esc(b.name)+'</b> 님'+(b.members?' <span>(+ '+esc(b.members)+')</span>':'')+(b.comp?' <span>· '+esc(b.comp)+'</span>':'')+'</div></div>'+
    '<div class="prt-sup"><b>공급자</b> '+esc(O.name||ST.shopName||"")+(O.biz_no?' · 사업자 '+esc(O.biz_no):'')+(O.owner_name?' · 대표 '+esc(O.owner_name):'')+(O.tel?' · '+esc(O.tel):'')+(O.addr?'<br>'+esc(O.addr):'')+'</div>'+
    (feeSum?'<h3>검사비 <span>'+won(d.fee.length)+'건</span></h3><table>'+order.map(function(k){ var x=g[k];
        return ln(esc(x.goods||x.kind)+(x.unit?' '+won(x.unit)+' × '+won(x.n):' '+won(x.n)+'건'), won(x.amount)); }).join("")+
      ln('<b>검사비 합계 (부가세 포함)</b>','<b>'+won(feeSum)+'원</b>','prt-tot')+'</table>':'')+
    (repSum?'<h3>정비비 <span>'+won(d.rep.length)+'건</span></h3><table>'+d.rep.map(function(r){
        return ln(esc(r.dealer)+' · '+esc(r.reason), won(r.amount)); }).join("")+
      ln('<b>정비비 합계 (부가세 포함)</b>','<b>'+won(repSum)+'원</b>','prt-tot')+'</table>':'')+
    '<table class="prt-sum">'+ln('<b>총 청구 금액</b>','<b>'+won(b.total)+'원</b>','prt-tot')+
      (b.paid?ln('받은 금액',won(b.paid)+'원')+ln('<b>남은 금액</b>','<b>'+won(Math.max(0,b.left))+'원</b>'):'')+'</table>'+
    '<div class="prt-acct">'+(feeSum&&O.bank_fee?'검사비 입금 계좌: '+esc(O.bank_fee)+'<br>':'')+(repSum&&O.bank_repair?'정비비 입금 계좌: '+esc(O.bank_repair):'')+'</div>'+
  '</section>';
}
var PRT_CSS='#prtBox{position:fixed;inset:0;z-index:2147483000;background:#eef1f5;overflow:auto;padding:0 12px 40px}'+
  '#prtBox .prt-bar{position:sticky;top:0;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#eef1f5;padding:12px 0;z-index:1}'+
  '#prtBox .prt-bar b{font-size:15px;color:#101828}'+
  '#prtBox .prt-doc{background:#fff;color:#111827;max-width:720px;margin:0 auto 16px;padding:28px 30px;border-radius:12px;box-shadow:0 1px 3px #0002;font:14px/1.55 "Pretendard","Noto Sans KR",system-ui,sans-serif;word-break:keep-all}'+
  '#prtBox .prt-doc h2{font-size:22px;margin:0;text-align:left}#prtBox .prt-doc .prt-head{display:block;text-align:left;border:0;padding:0;background:none}#prtBox .prt-doc .prt-who{font-size:16px;margin:6px 0 2px;text-align:left;font-weight:400}#prtBox .prt-doc .prt-who span{color:#5B6472;font-size:14px}'+
  '#prtBox .prt-doc .prt-sup{font-size:12.5px;color:#5B6472;border-bottom:2px solid #111827;padding:8px 0 10px;margin-bottom:6px}'+
  '#prtBox .prt-doc h3{font-size:15px;margin:16px 0 4px;display:flex;justify-content:space-between}#prtBox .prt-doc h3 span{color:#5B6472;font-weight:600}'+
  '#prtBox .prt-doc table{width:100%!important;min-width:0!important;max-width:100%;border-collapse:collapse;table-layout:auto}#prtBox .prt-doc td{padding:6px 0;border-top:1px solid #E3E7EE;font-size:14px;white-space:normal;background:none;color:inherit}'+
  '#prtBox .prt-doc td.prt-n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}#prtBox .prt-doc tr.prt-tot td{border-top:1.5px solid #111827}'+
  '#prtBox .prt-doc table.prt-sum{margin-top:14px;background:none;border:0;display:table}#prtBox .prt-doc .prt-acct{font-size:13px;color:#374151;margin-top:12px}'+
  '@media (max-width:600px){#prtBox .prt-doc{padding:18px 16px}}'+
  '@media print{body>*:not(#prtBox){display:none!important}#prtBox{position:static;background:#fff;padding:0;overflow:visible}'+
  '#prtBox .prt-bar{display:none}#prtBox .prt-doc{box-shadow:none;border-radius:0;margin:0;max-width:none;page-break-after:always;break-after:page}}';
function billOut(what){
  var L=billTargets();
  if(!L.length){ tell("청구서가 없어요","먼저 «청구서 만들기»를 눌러 주세요."); return; }
  bar("청구서 "+won(L.length)+"곳 내역을 불러오는 중이에요…","info",true); busy(true);
  billLoadRows(L).then(function(){
    busy(false); bar("");
    if(what==="xls" || what==="xlsAll") return billXls(L, what==="xlsAll");
    billPrintBox(L, what==="png");
  }).catch(function(e){ busy(false); fail(e); });
}
function billPrintBox(L, png){
  var old=$("prtBox"); if(old) old.remove();
  if(!$("prtCss")){ var st=document.createElement("style"); st.id="prtCss"; st.textContent=PRT_CSS; document.head.appendChild(st); }
  var box=document.createElement("div"); box.id="prtBox"; box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-label","청구서 미리보기");
  box.innerHTML='<div class="prt-bar"><b>'+esc(ymText(ST.ym))+' 청구서 '+won(L.length)+'곳</b><span style="display:flex;gap:8px;flex-wrap:wrap">'+
      (png?'<button type="button" class="cgg-btn pri" id="prtPng">그림으로 받기 ('+won(L.length)+'장)</button>':'<button type="button" class="cgg-btn pri" id="prtGo">인쇄</button>')+
      '<button type="button" class="cgg-btn" id="prtX">닫기</button></span></div>'+
    L.map(billDocHtml).join("");
  document.body.appendChild(box); document.documentElement.style.overflow="hidden";
  function shut(){ box.remove(); document.documentElement.style.overflow=""; document.removeEventListener("keydown",esc1); }
  function esc1(e){ if(e.key==="Escape") shut(); }
  document.addEventListener("keydown",esc1);
  $("prtX").onclick=shut;
  var go=$("prtGo"); if(go) go.onclick=function(){ window.print(); };
  var pg=$("prtPng"); if(pg) pg.onclick=function(){ billPng(L, box, pg); };
  $("prtX").focus();
}
function billPng(L, box, btn){
  if(typeof html2canvas!=="function"){ tell("그림을 만들 수 없어요","인터넷 연결을 확인하고 새로고침해 주세요."); return; }
  var docs=box.querySelectorAll(".prt-doc"), i=0; btn.disabled=true;
  (function next(){
    if(i>=docs.length){ btn.disabled=false; btn.textContent="다 받았어요 ("+won(docs.length)+"장)"; return; }
    btn.textContent="그림 만드는 중… "+(i+1)+" / "+docs.length;
    html2canvas(docs[i],{scale:2, backgroundColor:"#ffffff"}).then(function(cv){
      var a=document.createElement("a"); a.href=cv.toDataURL("image/png");
      a.download="청구서_"+ST.ym+"_"+fileSafe(L[i].name)+".png"; document.body.appendChild(a); a.click(); a.remove();
      i++; setTimeout(next, 250);
    }).catch(function(){ btn.disabled=false; btn.textContent="그림으로 받기"; tell("그림을 만들지 못했어요","다시 시도해 주세요."); });
  })();
}
function billXls(L, withRows){
  if(typeof XLSX==="undefined"){ bar("엑셀 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침(F5)해 주세요.","err"); return; }
  var head=["청구처","함께 청구","소속 상사","검사 건수","검사비","정비비","총금액","받은 금액","입금 대기","세금계산서","발송","확인"];
  var sum=L.map(function(b){ return [b.name, b.members||"", b.comp||"", b.cnt, b.fee, b.rep, b.total, b.paid, Math.max(0,b.left), b.tax, b.sendState, b.seen||""]; });
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head].concat(sum)), "요약");
  if(withRows){
    var rows=[["청구처","신청인","갈래","항목","단가","수량","금액"]];
    L.forEach(function(b){ var d=detailRows(b);
      d.fee.concat(d.rep).forEach(function(r){ rows.push([b.name, r.dealer, r.kind, r.kind==="정비"?r.reason:r.goods, r.unit, r.qty, r.amount]); }); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "명세");
  }
  XLSX.writeFile(wb, "차곳간체크_청구서"+(withRows?"_명세":"_요약")+"_"+ST.ym+".xlsx");
  bar("엑셀을 받았어요 ("+won(L.length)+"곳"+(withRows?" · 명세 포함":"")+").","ok",true);
}
'''
rep('''/* 보내는 형식·방식에 따라 미리보기와 요금이 바뀝니다 */
function wireSend(){''', OUT_JS + '''/* 보내는 형식·방식에 따라 미리보기와 요금이 바뀝니다 */
function wireSend(){''')

# ── 단가 구간 (서버 v39 약속: priceList · priceSave · priceDel — 없으면 안내만) ──
rep("""  '<div class="msg info">단가표는 «예전 자료 가져오기»로 옮겨진 값이 서버에서 그대로 쓰이고 있어요. '+
   '지금 들어 있는 구간 '+won(COUNTS.단가표||0)+'개 — 여기서 단가를 고치는 기능은 준비 중이에요. 바꿀 단가가 있으면 차곳간에 알려 주세요.</div>'+
  card("부가세","모든 단가는 부가세 별도로 입력해요.",
    '<div class="tools"><label class="f" style="margin:0">부가세율</label>'+
    '<input type="number" value="10" style="width:90px"><span style="color:var(--muted)">%</span>'+
    '<button class="btn">+ 단가 구간 추가</button></div>')+""",
"""  (PRICE_OK===false ? '<div class="msg info">지금 들어 있는 구간 '+won(COUNTS.단가표||0)+'개는 서버에서 그대로 쓰이고 있어요. '+
     '여기서 보고 고치려면 서버를 새로 올려야 해요(체크 서버 다음 판 — 단가 창구). 바꿀 단가가 있으면 차곳간에 알려 주세요.</div>' : '')+
  card("단가 구간 추가","모든 단가는 부가세 별도예요. 새 구간은 «적용 시작일»부터 쓰이고, 그 전 검사는 예전 단가 그대로예요.",
    '<div class="tools">'+(isOwner()?'<button class="btn primary" id="prcAdd">+ 단가 구간 추가</button>':'<span class="note">단가를 바꾸는 것은 대표만 할 수 있어요.</span>')+
    (PRICE_BANDS.length?'<span style="color:var(--muted);font-size:13px">지금 쓰는 구간: <b>'+esc(PRICE_BANDS[0].from)+'</b>부터 · 항목 '+won(PRICE_BANDS[0].items.length)+'개</span>':'')+'</div>')+""")
rep(r"""    ], PRICE, {pick:true, tools:'<button class="btn">엑셀 다운로드</button><button class="btn danger">선택한 줄 지우기</button>'}));
};
AFTER.price=function(){ wireTable("prc",function(){ draw(); }); };""",
r"""    ], PRICE, {pick:true, tools:'<button class="btn">엑셀 다운로드</button>'+(isOwner()?'<button class="btn danger" id="prcDel">선택한 줄의 구간 지우기</button>':'')}));
};
AFTER.price=function(){ wireTable("prc",function(){ draw(); });
  var a=$("prcAdd"); if(a) a.onclick=priceAddGo;
  var d=$("prcDel"); if(d) d.onclick=priceDelGo;
  if(PRICE_OK===null) loadPrice().then(function(){ if(page==="price") draw(); });
};
/* ═══ v48: 단가 구간 — priceList() → [{from_date, items:[{code,name,price}]}] · priceSave({from, items}) · priceDel({from:[…]}) ═══ */
var PRICE_BANDS=[], PRICE_OK=null;   /* null = 아직 안 물음 · false = 서버에 창구 없음 */
function loadPrice(){
  return call("priceList",[]).then(function(list){
    PRICE_OK=true;
    PRICE_BANDS=(list||[]).map(function(b){ return {from:String(b.from_date||b.from||"").slice(0,10),
      items:(Array.isArray(b.items)?b.items:[]).map(function(i){ return {code:String(i.code||""), name:String(i.name||""), price:Math.round(Number(i.price)||0)}; })}; })
      .filter(function(b){ return b.from; }).sort(function(x,y){ return x.from<y.from?1:-1; });
    PRICE=[]; PRICE_BANDS.forEach(function(b){ b.items.forEach(function(i,k){ PRICE.push({id:b.from+"#"+k, from:b.from, code:i.code, name:i.name, price:i.price, _q:[b.from,i.code,i.name].join(" ")}); }); });
  }).catch(function(e){ if(/지원하지 않는 기능/.test(String(e&&e.message))){ PRICE_OK=false; return; } PRICE_OK=false; fail(e); });
}
function priceNext1(){ var d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+1); return ymd(d); }
function priceAddGo(){
  if(PRICE_OK===false){ tell("아직 쓸 수 없어요","서버를 새로 올려야 쓸 수 있어요(체크 서버 다음 판 — 단가 창구). 차곳간에 알려 주세요."); return; }
  var base=(PRICE_BANDS[0]&&PRICE_BANDS[0].items.length)?PRICE_BANDS[0].items:[{code:"",name:"국산차",price:0},{code:"",name:"수입차",price:0}];
  function rowH(i,k){ return '<tr data-pr="'+k+'"><td><input type="text" class="prC" maxlength="20" value="'+esc(i.code)+'" style="width:100%" aria-label="코드"></td>'+
    '<td><input type="text" class="prN" maxlength="40" value="'+esc(i.name)+'" style="width:100%" aria-label="항목 이름"></td>'+
    '<td><input type="text" class="prP" inputmode="numeric" maxlength="9" value="'+(i.price?won(i.price):"")+'" style="width:100%;text-align:right" aria-label="단가"></td>'+
    '<td><button type="button" class="cgg-btn sm" data-prx="1" aria-label="이 줄 빼기">빼기</button></td></tr>'; }
  CGG.dialog({size:"form", title:"단가 구간 추가", desc:"지금 쓰는 단가를 불러왔어요. 바뀌는 칸만 고치고 적용 시작일을 정해 주세요.",
    body:'<label class="f" for="prFrom">적용 시작일 (이날 검사부터 새 단가)</label><input type="date" id="prFrom" value="'+esc(priceNext1())+'" style="width:100%;margin-bottom:10px">'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:0"><thead><tr><th style="text-align:left;font-size:12.5px">코드</th><th style="text-align:left;font-size:12.5px">항목 이름</th><th style="text-align:right;font-size:12.5px">단가 (부가세 별도)</th><th></th></tr></thead>'+
      '<tbody id="prRows">'+base.map(rowH).join("")+'</tbody></table></div>'+
      '<button type="button" class="cgg-btn sm" id="prMore" style="margin-top:8px">+ 항목 줄 더하기</button>'+
      '<p class="note" style="margin:10px 0 0">코드는 접수리스트의 «상품 코드»와 같아야 자동으로 맞춰져요. 모르면 비워 두고 이름으로 맞춰요.</p>'+
      '<div class="msg err" id="prErr" hidden style="margin-top:8px"></div>',
    ok:"저장", cancel:"닫기",
    onOk:function(){
      var e=$("prErr"), from=String(($("prFrom")||{}).value||"");
      function bad(t){ e.hidden=false; e.textContent=t; return false; }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(from)) return bad("적용 시작일을 골라 주세요.");
      var items=[]; var rows=document.querySelectorAll("#prRows tr");
      for(var i=0;i<rows.length;i++){ var c=rows[i].querySelector(".prC").value.trim(), n=rows[i].querySelector(".prN").value.trim(), p=Math.round(Number(String(rows[i].querySelector(".prP").value).replace(/[^0-9]/g,""))||0);
        if(!c && !n && !p) continue;
        if(!n) return bad((i+1)+"번째 줄에 항목 이름을 넣어 주세요.");
        if(p<=0 || p>10000000) return bad("«"+n+"» 단가를 숫자로 넣어 주세요.");
        items.push({code:c, name:n, price:p}); }
      if(!items.length) return bad("항목을 하나 이상 넣어 주세요.");
      if(items.length>50) return bad("항목은 50개까지예요.");
      var same=PRICE_BANDS.some(function(b){ return b.from===from; });
      var okb=document.querySelector(".cgg-dlg [data-dok]");
      if(same && !(okb&&okb.getAttribute("data-again"))){ if(okb) okb.setAttribute("data-again","1"); return bad("이미 "+from+" 구간이 있어요. 그 구간을 이 단가로 바꾸려면 «저장»을 한 번 더 눌러 주세요."); }
      if(okb) okb.disabled=true;
      call("priceSave",[{from:from, items:items}]).then(function(){
        CGG.closeDialog(); PRICE_OK=null; bar(from+"부터 쓸 단가 "+won(items.length)+"개를 저장했어요. 이미 만든 청구서는 «청구서 만들기»를 다시 눌러야 바뀌어요.","ok");
        loadPrice().then(function(){ draw(); });
      }).catch(function(er){ if(okb) okb.disabled=false; e.hidden=false; e.textContent=/지원하지 않는 기능/.test(String(er&&er.message))?"서버를 새로 올려야 쓸 수 있어요(체크 서버 다음 판 — 단가 창구).":niceMsg(er&&er.message); });
      return false; }});
  function wireRows(){ Array.prototype.forEach.call(document.querySelectorAll("#prRows [data-prx]"),function(x){ x.onclick=function(){ var tr=x.closest("tr"); if(tr) tr.remove(); }; });
    Array.prototype.forEach.call(document.querySelectorAll("#prRows .prP"),function(x){ x.onblur=function(){ var v=Math.round(Number(String(x.value).replace(/[^0-9]/g,""))||0); x.value=v?won(v):""; }; }); }
  wireRows();
  $("prMore").onclick=function(){ var tb=$("prRows"); if(tb.children.length>=50) return; var t=document.createElement("tbody"); t.innerHTML=rowH({code:"",name:"",price:0},tb.children.length); tb.appendChild(t.firstChild); wireRows(); };
}
function priceDelGo(){
  var ids=picked("prc"), froms=[];
  PRICE.forEach(function(r){ if(ids.indexOf(r.id)>=0 && froms.indexOf(r.from)<0) froms.push(r.from); });
  if(!froms.length){ tell("고른 줄이 없어요","표 왼쪽 네모로 지울 구간의 줄을 먼저 골라 주세요. 고른 줄이 든 구간이 통째로 지워져요."); return; }
  if(froms.length>=PRICE_BANDS.length){ tell("모두 지울 수는 없어요","단가 구간이 하나는 남아 있어야 청구서를 만들 수 있어요."); return; }
  askPicked("단가 구간 "+won(froms.length)+"개를 지울까요?", froms.map(function(f){ var b=PRICE_BANDS.filter(function(x){ return x.from===f; })[0]; return [f+"부터", "항목 "+won(b?b.items.length:0)+"개"]; }), "지우기", function(){
    busy(true);
    call("priceDel",[{from:froms}]).then(function(r){
      busy(false); clearPick("prc"); bar(won((r&&r.n)||froms.length)+"개 구간을 지웠어요. 그 기간 검사는 바로 앞 구간 단가로 계산돼요.","ok"); loadPrice().then(function(){ draw(); });
    }).catch(function(e){ busy(false); fail({message:/지원하지 않는 기능/.test(String(e&&e.message))?"서버를 새로 올려야 쓸 수 있어요(체크 서버 다음 판 — 단가 창구).":e&&e.message}); });
  }, "지운 구간 기간의 검사는 바로 앞 구간 단가로 계산돼요. 이미 만든 청구서는 «청구서 만들기»를 다시 눌러야 바뀌어요.");
}""")

rep('$("hdVer").textContent="체크 v47 · "', '$("hdVer").textContent="체크 v48 · "')
open(BASE + "2_차곳간_체크_index_v48.html", "w", encoding="utf-8").write(s)
print("OK v48", len(s))
