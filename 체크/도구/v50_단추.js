<script>
/* ═══ v50 — «준비 중» 단추를 실제로 되게 (대표님 10/18 고침: 빼지 말고 «준비 중» 글을 없애고 동작하게)
   화면만으로 되는 것 · 이미 있는 서버 창구(invoiceMove · depositImport · depositTrash · depositRestore · bankList)로 되는 것은 여기서.
   서버 새 창구가 필요한 것(청구서 지우기 · 보냄 표시 지우기 · 알림톡 ID 저장 · 수수료 규칙 · 문자 수집함)은 가능한 데까지 하고,
   서버 방 요청서(체크/요청서/2026-10-18_v50_단추_서버_요청.md)에 묶었어요. ═══ */
(function(){
/* 공통 — 글 복사 (안 되면 창에 보여 줘서 직접 복사) */
function v50Copy(text, what){
  function show(){ tell(what+" — 직접 복사해 주세요",'<textarea readonly style="width:100%;min-height:160px">'+esc(text)+'</textarea>'); }
  try{ navigator.clipboard.writeText(text).then(function(){ bar(what+"을(를) 복사했어요.","ok"); }, show); }catch(e){ show(); }
}
window.v50Copy=v50Copy;
function btnByText(t){ return Array.prototype.filter.call(document.querySelectorAll("#main button"),function(b){ return String(b.textContent||"").trim()===t; }); }
function on(t, f){ btnByText(t).forEach(function(b){ if(!b.onclick) b.onclick=f; }); }
function after(p, f){ var a=AFTER[p]; AFTER[p]=function(){ if(a) a.apply(this,arguments); try{ f(); }catch(e){ bar((e&&e.message)||"처리하지 못했어요.","err"); } }; }
function noSrv(e){ return /지원하지 않는 기능|unknown|없는 기능/i.test(String((e&&e.message)||"")); }

/* ── 1. 매출 › 자료 올리기 › 양식 다운로드 (화면만) — 서버(excelPut)가 읽는 열 이름 그대로 ── */
var FORMS={
  "접수리스트":{cols:["성능번호","차대번호","차량번호","차명","검사일","회사명","신청인","상품명","금액","성능보험료","보험료납부"],
    ex:["2026-1018-0001","KMHxxxxxxxxxxxxxx","12가3456","그랜저","2026-10-18","예시모터스","홍길동","국산 성능점검","33000","12000","N"],
    guide:[["검사일","2026-10-18 꼴 (이 날짜로 달이 나뉘어요)"],["신청인","딜러 이름 — 설정 › 거래처의 딜러 이름과 똑같이"],["회사명","소속 매매상사"],["금액","검사비 (숫자만)"],["보험료납부","Y · N · P(면제) 중 하나"]]},
  "전산외":{cols:["성능번호","차대번호","차량번호","차명","검사일","회사명","신청인","상품명","금액","성능보험료","보험료납부"],
    ex:["","KMHxxxxxxxxxxxxxx","34나5678","쏘나타","2026-10-18","예시모터스","김철수","전산외 점검","33000","0","N"],
    guide:[["쓰는 곳","전산에 안 올라간 검사 — 접수리스트와 같은 열"],["성능번호","없으면 비워도 돼요 (차량번호 + 검사일로 구분)"]]},
  "정비비":{cols:["작업일","차량번호","차명","신청인","작업내용","금액","면제"],
    ex:["2026-10-18","12가3456","그랜저","홍길동","타이어 교체","44000",""],
    guide:[["작업일","날짜가 없으면 «넣은 달» 칸의 달로 들어가요"],["신청인","딜러 이름"],["면제","청구하지 않을 줄은 Y"]]},
  "청구보험료":{cols:["성능번호","차대번호","차량번호","차명","신청인","회사명","검사일","성능보험료"],
    ex:["2026-1018-0001","KMHxxxxxxxxxxxxxx","12가3456","그랜저","홍길동","예시모터스","2026-10-18","12000"],
    guide:[["쓰는 곳","보험사 청구서 — 올리면 자동으로 대조해요"],["찾는 차례","차대번호 → 성능번호 → 차량번호"]]}
};
function formDown(kind){
  if(!window.XLSX){ tell("엑셀 부품을 불러오지 못했어요","인터넷 연결을 확인하고 새로고침한 뒤 다시 눌러 주세요."); return false; }
  var f=FORMS[kind], wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([f.cols, f.ex]), kind);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["열","적는 법"]].concat(f.guide).concat([["",""],["주의","첫 줄(제목 줄) 이름은 바꾸지 마세요. 예시 줄은 지우고 쓰세요."]])), "작성안내");
  XLSX.writeFile(wb, "차곳간체크_"+kind+"_양식.xlsx");
  return true;
}
after("files", function(){
  Object.keys(FORMS).forEach(function(k){ on(k, function(){ if(formDown(k)) bar(k+" 양식을 받았어요.","ok"); }); });
  btnByText("양식 전체 한꺼번에 받기 (zip)").forEach(function(b){ b.textContent="양식 4개 모두 받기";
    b.onclick=function(){ var ks=Object.keys(FORMS), i=0;
      (function next(){ if(i>=ks.length){ bar("양식 4개를 받았어요.","ok"); return; } if(!formDown(ks[i++])) return; setTimeout(next,400); })(); }; });
});

/* ── 2. 월별 청구서 › 표 위 단추 ── */
function billSel(){ var ids=picked("bill"); return BILLS.filter(function(b){ return ids.indexOf(b.id)>=0; }); }
function whoTxt(L){ var n=L.map(function(b){ return b.group||b.name; }); return n.slice(0,3).join(", ")+(n.length>3?" 외 "+(n.length-3)+"곳":"")+" ("+n.length+"곳)"; }
function dealerId(name){ var d=DEALERS.filter(function(x){ return x.name===name; })[0]; return d?d.id:""; }
/* 고른 청구서 → 다른 청구처로 (서버 invoiceMove — 이미 있음 · 대표만) */
function billMove(){
  var L=billSel(); if(!L.length){ tell("고른 청구서가 없어요","표 왼쪽 네모로 옮길 청구서를 먼저 골라 주세요."); return; }
  if(!isOwner()){ tell("대표만 할 수 있어요","청구처를 옮기는 일은 대표 계정으로 해 주세요."); return; }
  var names=[]; L.forEach(function(b){ names.push(b.name); String(b.members||"").split(" · ").forEach(function(m){ if(m) names.push(m); }); });
  var ids=names.map(dealerId).filter(Boolean);
  var heads=BILLS.filter(function(b){ return L.indexOf(b)<0; });
  if(!heads.length){ tell("옮길 곳이 없어요","이 달 청구처가 하나뿐이에요."); return; }
  var sum=L.reduce(function(t,b){ return t+(b.total||0); },0);
  CGG.dialog({size:"form", title:"어느 청구처로 옮길까요?", desc:"고른 "+whoTxt(L)+" · "+won(sum)+"원 → 고른 청구처 한 장으로 합쳐져요 ("+ymText(ST.ym)+"만)",
    body:'<div style="display:grid;gap:6px;max-height:46vh;overflow:auto">'+heads.map(function(b,i){
      return '<label style="display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:10px;cursor:pointer;font-weight:600;color:var(--text)">'+
        '<input type="radio" name="v50mv" value="'+i+'"> <span><b>'+esc(b.group||b.name)+'</b> <span style="color:var(--muted)">'+esc(b.comp||"")+' · '+won(b.total)+'원</span></span></label>'; }).join("")+'</div>'+
      '<div class="msg err" id="v50mvErr" hidden style="margin-top:8px"></div>',
    ok:"옮기기", cancel:"닫기",
    onOk:function(){ var r=document.querySelector("input[name=v50mv]:checked"), e=$("v50mvErr");
      if(!r){ e.hidden=false; e.textContent="옮길 청구처를 골라 주세요."; return false; }
      var to=heads[Number(r.value)], toId=dealerId(to.name);
      if(!toId||!ids.length){ e.hidden=false; e.textContent="거래처에서 딜러를 찾지 못했어요. 설정 › 거래처에 딜러 이름이 그대로 있는지 봐 주세요."; return false; }
      var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
      call("invoiceMove",[ST.ym, ids.filter(function(x){ return x!==toId; }), toId, "month"]).then(function(){
        CGG.closeDialog(); clearPick("bill"); bar(L.length+"곳을 «"+(to.name)+"» 청구서로 옮기고 청구서를 다시 만들었어요.","ok"); refresh(["bill"]);
      }).catch(function(er){ if(okb) okb.disabled=false; e.hidden=false; e.textContent=niceMsg(er&&er.message); });
      return false; }});
}
/* 선택한 줄 지우기 — 서버 창구(invoiceDel) 요청함. 그 전에는 «이 달 청구서에서 빼는 길»로 안내 */
function billDel(){
  var L=billSel(); if(!L.length){ tell("고른 청구서가 없어요","표 왼쪽 네모로 지울 청구서를 먼저 골라 주세요."); return; }
  var sum=L.reduce(function(t,b){ return t+(b.total||0); },0);
  ask({title:"고른 청구서를 지울까요?", k1:"누구", v1:whoTxt(L), k2:"몇 곳 · 얼마", v2:L.length+"곳 · "+won(sum)+"원",
       warn:"지운 청구서는 «청구서 만들기»를 다시 누르면 다시 생겨요. 아예 빼려면 그 딜러의 차를 다른 청구처로 옮기거나 거래처에서 정리해 주세요.", yes:"지우기"}, function(){
    busy(true);
    call("invoiceDel",[{ids:L.map(function(b){ return b.id; }), ym:ST.ym}]).then(function(r){
      busy(false); clearPick("bill"); bar(won((r&&r.n)||L.length)+"곳 청구서를 지웠어요.","ok"); refresh(["bill"]);
    }).catch(function(er){ busy(false);
      if(!noSrv(er)){ fail(er); return; }
      /* 서버 창구 전: 이 화면에서만 빼 두고(보내기 · 인쇄 대상에서 빠짐), 새로고침하면 다시 보여요 */
      var gone=L.map(function(b){ return b.id; }); BILLS=BILLS.filter(function(b){ return gone.indexOf(b.id)<0; }); clearPick("bill"); draw();
      bar(L.length+"곳을 이 화면 목록에서 뺐어요 (보내기 · 인쇄에서 빠짐). 서버 청구서까지 지우는 것은 다음 서버 판부터 돼요.","info");
    });
  });
}
/* 선택한 곳 보냄 표시 지우기 — 서버 창구(invoiceUnsend) 요청함. 그 전에는 화면에서 «안 보냄»으로 돌려 다시 보낼 수 있게 */
function billUnsend(){
  var L=billSel().filter(function(b){ return b.sent; }); if(!L.length){ tell("보낸 청구서를 골라 주세요","«보냄» · «열어봄»인 줄을 골라야 표시를 지울 수 있어요."); return; }
  ask({title:"보냄 표시를 지울까요?", k1:"누구", v1:whoTxt(L), k2:"몇 곳", v2:L.length+"곳",
       warn:"표시만 지워요. 이미 간 알림톡은 그대로예요. 지운 뒤 «선택한 곳에 보내기»로 다시 보낼 수 있어요.", yes:"표시 지우기"}, function(){
    busy(true);
    call("invoiceUnsend",[{ids:L.map(function(b){ return b.id; })}]).then(function(){
      busy(false); clearPick("bill"); bar(L.length+"곳 보냄 표시를 지웠어요.","ok"); refresh(["bill"]);
    }).catch(function(er){ busy(false);
      if(!noSrv(er)){ fail(er); return; }
      L.forEach(function(b){ b.sent=""; b.seen=""; b.sendState="안 보냄"; }); draw();
      bar(L.length+"곳을 «안 보냄»으로 돌렸어요 — 이 화면에서 바로 다시 보낼 수 있어요 (서버 기록은 다음 서버 판부터 함께 지워져요).","info");
    });
  });
}
after("bill", function(){
  var d=$("bDel"); if(d) d.onclick=billDel;
  var m=$("bMove"); if(m) m.onclick=billMove;
  var u=$("bUnsend"); if(u) u.onclick=billUnsend;
});

/* ── 3. 알림톡 템플릿 — 등록용 복사(화면만) · ID 저장(서버 창구 요청함 · 그 전에는 이 PC에 적어 둠) ── */
after("billtpl", function(){
  on("템플릿 등록용 복사", function(){
    var t=Array.prototype.map.call(document.querySelectorAll("#main .tmpl"),function(x,i){ return "■ "+(i+1)+"\n"+x.textContent; }).join("\n\n");
    var kv=Array.prototype.map.call(document.querySelectorAll("#main .card"),function(c){ var h=c.querySelector("h3"); return h?h.textContent:""; }).filter(Boolean);
    v50Copy(t||kv.join("\n"), "템플릿 문구");
  });
  var ins=Array.prototype.slice.call(document.querySelectorAll("#main .row2 input"));
  var saved={}; try{ saved=JSON.parse(localStorage.getItem("chk_tplids:"+(ST.shop||""))||"{}")||{}; }catch(e){}
  ins.forEach(function(x,i){ if(saved[i]) x.value=saved[i]; });
  on("저장", function(){
    var v={}; ins.forEach(function(x,i){ v[i]=String(x.value||"").trim().slice(0,80); });
    call("tplSave",[{profile:v[0]||"",bill:v[1]||"",ins:v[2]||"",remind:v[3]||""}]).then(function(){ bar("저장했어요.","ok"); })
      .catch(function(er){ if(!noSrv(er)){ fail(er); return; }
        try{ localStorage.setItem("chk_tplids:"+(ST.shop||""), JSON.stringify(v)); }catch(e){}
        bar("이 PC에 적어 뒀어요. 차곳간 서버에 넣는 것은 다음 서버 판부터 돼요 (적어 둔 값은 그때 그대로 올라가요).","info"); });
  });
});

/* ── 4. 입금 내역 ── */
/* 입금 문자 · 시트 줄 읽기 — «[신한] 10/08 14:21 123-456-789012 입금 1,243,000 홍길동» 꼴 */
function smsParse(text){
  var now=new Date(), out=[], bad=0;
  String(text||"").split(/\n\s*\n|\r?\n(?=\s*\[)/).forEach(function(blk){
    var lines=/\t/.test(blk)?blk.split(/\r?\n/):[blk.replace(/\s+/g," ")];
    lines.forEach(function(s){ s=String(s||"").trim(); if(!s) return;
      if(/출금|지급|이체출금/.test(s) && !/입금/.test(s)) return;
      var am=s.match(/입금\s*([\d,]{2,})\s*원?/) || s.match(/([\d]{1,3}(?:,\d{3})+)\s*원?/);
      var amt=am?Number(am[1].replace(/,/g,"")):0;
      var dm=s.match(/(20\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/) || s.match(/(?:^|\D)(\d{1,2})[\/.\-](\d{1,2})(?=\D|$)/);
      var tm=s.match(/(\d{1,2}):(\d{2})/);
      if(!amt||!dm){ bad++; return; }
      var y,mo,da; if(dm.length===4){ y=+dm[1]; mo=+dm[2]; da=+dm[3]; } else { mo=+dm[1]; da=+dm[2]; y=now.getFullYear(); if(mo>now.getMonth()+1) y--; }
      if(mo<1||mo>12||da<1||da>31){ bad++; return; }
      var who="";
      if(am&&am.index!=null){ var rest=s.slice(am.index+am[0].length).replace(/잔액\s*[\d,]+원?.*/,"").replace(/[\d,\-]{5,}/g," ").trim(); who=(rest.split(/\s+/)[0]||""); }
      if(!who){ var t2=s.split(/\t/); who=(t2.length>2?t2[t2.length-1]:""); }
      function p(x){ return (x<10?"0":"")+x; }
      out.push({tx_at:y+"-"+p(mo)+"-"+p(da)+"T"+(tm?p(+tm[1])+":"+tm[2]:"00:00")+":00+09:00", sender:String(who||"입금자미상").replace(/[<>]/g,"").slice(0,40), amount:amt});
    });
  });
  return {rows:out, bad:bad};
}
window.smsParse=smsParse;
function importRows(P, done){
  if(!P.rows.length){ tell("읽은 입금이 없어요","«입금 1,243,000 홍길동»처럼 금액과 날짜가 들어 있는 문자를 붙여 넣어 주세요."+(P.bad?" (못 읽은 줄 "+P.bad+"개)":"")); return; }
  if(!isOwner()){ tell("대표만 할 수 있어요","입금 넣기는 대표 계정으로 해 주세요."); return; }
  var sum=P.rows.reduce(function(t,r){ return t+r.amount; },0);
  ask({title:"입금 "+won(P.rows.length)+"건을 넣을까요?", k1:"합계", v1:won(sum)+"원", k2:"보낸 분",
       v2:P.rows.slice(0,3).map(function(r){ return r.sender; }).join(", ")+(P.rows.length>3?" 외 "+(P.rows.length-3)+"건":""),
       warn:"같은 날 · 같은 금액 · 같은 이름의 입금은 한 번만 들어가요."+(P.bad?" 못 읽은 줄 "+P.bad+"개는 빼요.":""), yes:"넣기"}, function(){
    busy(true);
    call("depositImport",[{rows:P.rows}]).then(function(r){
      busy(false); bar("새로 넣은 입금 "+won((r&&r.got)||0)+"건"+((r&&r.dup)?" · 이미 있던 "+won(r.dup)+"건은 건너뜀":""),"ok");
      if(done) done(); refresh(["dep","bill"]);
    }).catch(function(e){ busy(false); fail({message:depSrv(e)}); });
  });
}
after("deposit", function(){
  var a=$("depAlarm"); if(a) a.onclick=function(){ go("alarm"); };
  var x=$("depXlsDown"); if(x) x.onclick=function(){ tbXls("dep"); };
  var pg=$("depPasteGo"); if(pg) pg.onclick=function(){ importRows(smsParse(($("depPaste")||{}).value), function(){ var t=$("depPaste"); if(t) t.value=""; }); };
  var pc=$("depPasteClr"); if(pc) pc.onclick=function(){ var t=$("depPaste"); if(t){ t.value=""; t.focus(); } };
});

/* ── 5. 배달 › 문구 · 발송 설정 — 넣을 수 있는 값 · 주소 복사 (화면만) ── */
after("delivmsg", function(){
  Array.prototype.forEach.call(document.querySelectorAll("#main .tokchips button"),function(b){
    if(b.onclick) return;
    b.onclick=function(){ var t=$("dw-text"); if(!t) return; var v=t.value, a=t.selectionStart==null?v.length:t.selectionStart, z=t.selectionEnd==null?v.length:t.selectionEnd;
      t.value=v.slice(0,a)+b.textContent+v.slice(z); t.focus(); var c=a+b.textContent.length; try{ t.setSelectionRange(c,c); }catch(e){}
      try{ t.dispatchEvent(new Event("input")); }catch(e){} };
  });
  on("주소 복사", function(){ var i=document.querySelector('#main input[readonly]'); v50Copy(i?i.value:"https://check.cgg.co.kr/driver","기사 폰 주소"); });
});

/* ── 6. 설정 › 검사자 수수료 — 규칙 저장은 서버 창구(feeRules) 요청함. 그 전에는 이 PC에 적어 둠 ── */
function feeKey(){ return "chk_fee:"+(ST.shop||""); }
function feeGet(){ try{ return JSON.parse(localStorage.getItem(feeKey())||"null")||{on:false,rules:[]}; }catch(e){ return {on:false,rules:[]}; } }
function feeSet(v){ try{ localStorage.setItem(feeKey(), JSON.stringify(v)); }catch(e){} call("feeRules",[v]).catch(function(){}); }
after("fee", function(){
  var F=feeGet(), cb=document.querySelector('#main input[type=checkbox]');
  var box=document.createElement("div"); box.id="v50fee"; var card=cb&&cb.closest(".card"); if(card) card.appendChild(box);
  function paint(){ box.innerHTML=F.rules.length?'<div class="cgg-twrap" style="margin-top:10px"><table class="cgg-table" style="min-width:0"><thead><tr><th>검사자</th><th>방식</th><th class="n">금액</th><th></th></tr></thead><tbody>'+
      F.rules.map(function(r,i){ return '<tr><td>'+esc(r.who)+'</td><td>'+esc(r.how)+'</td><td class="n">'+esc(r.how==="한 대마다"?won(r.amt)+"원":r.amt+"%")+'</td><td class="c"><button type="button" class="cgg-btn sm danger" data-fdel="'+i+'">빼기</button></td></tr>'; }).join("")+
      '</tbody></table></div><p class="note">이 PC에 적어 뒀어요. 모든 PC · 청구서에 들어가는 것은 다음 서버 판부터예요.</p>':'';
    Array.prototype.forEach.call(box.querySelectorAll("[data-fdel]"),function(b){ b.onclick=function(){ F.rules.splice(Number(b.getAttribute("data-fdel")),1); feeSet(F); paint(); }; }); }
  if(cb){ cb.checked=!!F.on; cb.onchange=function(){ F.on=cb.checked; feeSet(F); bar(cb.checked?"수수료 계산을 켰어요 (이 PC)":"수수료 계산을 껐어요","ok"); }; }
  on("+ 규칙 추가", function(){
    CGG.dialog({size:"form", title:"수수료 규칙 추가", desc:"검사자마다 한 대에 얼마 또는 검사비의 몇 %를 줄지 정해요.",
      body:'<label class="f" for="fWho">검사자 이름</label><input type="text" id="fWho" maxlength="20" style="width:100%;margin-bottom:10px">'+
        '<label class="f">방식</label><div id="fHow" style="display:flex;gap:6px;margin-bottom:10px"><button type="button" class="cgg-btn sm pri" data-h="한 대마다" aria-pressed="true">한 대마다 (원)</button><button type="button" class="cgg-btn sm" data-h="검사비 %" aria-pressed="false">검사비 %</button></div>'+
        '<label class="f" for="fAmt">금액 · %</label><input type="number" id="fAmt" min="0" inputmode="numeric" style="width:100%"><div class="msg err" id="fErr" hidden style="margin-top:8px"></div>',
      ok:"넣기", cancel:"닫기",
      onOk:function(){ var w=String(($("fWho")||{}).value||"").trim(), a=Number(($("fAmt")||{}).value), h=(document.querySelector('#fHow [aria-pressed="true"]')||{}).getAttribute?document.querySelector('#fHow [aria-pressed="true"]').getAttribute("data-h"):"한 대마다", e=$("fErr");
        if(!w||!(a>0)){ e.hidden=false; e.textContent="검사자 이름과 금액을 넣어 주세요."; return false; }
        F.rules.push({who:w, how:h, amt:a}); feeSet(F); paint(); bar("규칙을 넣었어요 (이 PC).","ok"); }});
    Array.prototype.forEach.call(document.querySelectorAll("#fHow [data-h]"),function(b){ b.onclick=function(){
      Array.prototype.forEach.call(document.querySelectorAll("#fHow [data-h]"),function(x){ var o=x===b; x.setAttribute("aria-pressed",o); x.classList.toggle("pri",o); }); }; });
  });
  paint();
});

/* ── 7. 설정 › 문자 자동수집 ── */
after("sms", function(){
  var cards=document.querySelectorAll("#main .card");
  var inUrl=document.querySelector('#main input[type=text]'), inPw=document.querySelector('#main input[type=password]');
  if(inUrl){ try{ inUrl.value=localStorage.getItem("chk_smsurl:"+(ST.shop||""))||""; }catch(e){} inUrl.placeholder="https://script.google.com/macros/s/…/exec"; }
  if(inPw){ inPw.value=""; inPw.placeholder="차곳간이 알려 드린 비밀번호"; }
  on("연결 확인", function(){
    var u=String((inUrl||{}).value||"").trim();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u)){ tell("수집함 주소를 확인해 주세요","https://script.google.com/macros/s/…/exec 꼴이어야 해요."); return; }
    try{ localStorage.setItem("chk_smsurl:"+(ST.shop||""), u); }catch(e){}
    bar("수집함에 물어보는 중…","info");
    fetch(u+"?ping=1",{method:"GET"}).then(function(r){ bar(r.ok?"수집함이 대답했어요 (연결됨). 주소는 이 PC에 적어 뒀어요.":"수집함이 대답하지 않아요 ("+r.status+"). 주소를 다시 확인해 주세요.", r.ok?"ok":"err"); })
      .catch(function(){ bar("수집함에 닿지 못했어요. 주소 · 공유 설정(모든 사용자)을 확인해 주세요.","err"); });
  });
  /* 입금 계좌 — 지어낸 예시 대신 실제 계좌(팝빌 연동 화면과 같은 목록) */
  var bankCard=cards[1];
  if(bankCard){ var kv=bankCard.querySelectorAll(".kv"); Array.prototype.forEach.call(kv,function(x){ x.remove(); });
    var list=document.createElement("div");
    list.innerHTML=(BANKS&&BANKS.length)?BANKS.map(function(b){ return '<div class="kv"><span>'+esc((b.bankName||"")+" "+(b.acctNo||""))+'</span><b>'+esc(b.useFor||b.nickname||"")+'</b></div>'; }).join("")
      :'<p class="note">아직 넣은 계좌가 없어요. «+ 계좌 추가»를 눌러 넣어 주세요.</p>';
    var tl=bankCard.querySelector(".tools"); bankCard.insertBefore(list, tl); }
  on("+ 계좌 추가", function(){ go("popbill"); setTimeout(function(){ var a=$("bkAdd"); if(a&&CGG.spot) CGG.spot(a.closest(".card")||a); },400); });
  on("서버에 저장", function(){ bar("계좌는 넣을 때마다 서버에 바로 저장돼요. 지금 목록이 서버와 같아요.","ok"); });
  on("서버에서 새로고침", function(){ refresh(["pop"]); });
  function needCode(){ tell("수집함 코드는 차곳간이 검사소마다 만들어 드려요","차곳간(총괄)에 «문자 수집함 코드 요청»이라고 알려 주시면 이 칸에 넣어 드려요. 그 전에는 입금 문자를 아래 «문자 해석 시험» 칸이나 입금 내역 › «통장 문자 붙여넣기»에 붙여 넣어 넣을 수 있어요."); }
  on("코드 복사", needCode); on("코드 펼치기", needCode); on("본문 복사", needCode);
  var ta=document.querySelector("#main textarea");
  on("해석해 보기", function(){ var P=smsParse(ta?ta.value:"");
    if(!P.rows.length){ tell("읽지 못했어요","금액(«입금 1,243,000»)과 날짜(«10/08»)가 들어 있는지 봐 주세요."); return; }
    tell("이렇게 읽었어요", P.rows.map(function(r){ return esc(r.tx_at.slice(0,16).replace("T"," "))+" · <b>"+esc(r.sender)+"</b> · "+won(r.amount)+"원"; }).join("<br>")+(P.bad?"<br>(못 읽은 줄 "+P.bad+"개)":"")); });
  on("이 문자를 입금 내역에 담기", function(){ importRows(smsParse(ta?ta.value:""), function(){ if(ta) ta.value=""; }); });
});

/* ── 8. 설정 › 알람 소리 — 전체 크기 · 소리 시험 (이 PC에만) ── */
after("alarm", function(){
  var r=document.querySelector('#main input[type=range]');
  if(r){ try{ r.value=localStorage.getItem("chk_vol")||r.value; }catch(e){} r.oninput=function(){ try{ localStorage.setItem("chk_vol",r.value); }catch(e){} }; }
  on("전체 소리 시험", function(){
    try{ var C=window.AudioContext||window.webkitAudioContext, ac=new C(), v=(Number(r?r.value:70)||0)/100;
      [880,660].forEach(function(f,i){ var o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=f; g.gain.value=0.25*v; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime+i*0.22); o.stop(ac.currentTime+i*0.22+0.18); });
      bar(v?"딩동 — 지금 크기 "+Math.round(v*100)+"%":"전체 크기가 0이라 소리가 안 나요.","ok");
    }catch(e){ bar("이 브라우저에서는 소리를 낼 수 없어요.","err"); }
  });
});

/* ── 9. 휴지통(지운 입금) — 서버 depositTrash · depositRestore (이미 있음 · 대표만) ── */
var TRASHDEP=null;
var _pt=PAGE.trash;
PAGE.trash=function(){
  if(TRASHDEP===null && isOwner()){ TRASHDEP=[];
    call("depositTrash",[]).then(function(list){ TRASHDEP=(list||[]).map(function(d){ return {id:String(d.id||""), sender:d.sender||"입금자미상", at:shortTs(d.tx_at), amount:d.amount||0, kind:d.kind||"미분류", who:d.who||"", del:shortTs(d.updated_at||"")}; }); if(page==="trash") draw(); })
      .catch(function(){ TRASHDEP=[]; }); }
  return _pt();
};
after("trash", function(){
  on("엑셀 다운로드", function(){ tbXls("trs"); });
  on("선택한 줄 되살리기", function(){
    var ids=picked("trs"); if(!ids.length){ tell("고른 줄이 없어요","표 왼쪽 네모로 되살릴 입금을 골라 주세요."); return; }
    var L=(TRASHDEP||[]).filter(function(d){ return ids.indexOf(d.id)>=0; });
    ask({title:"입금 "+L.length+"건을 되살릴까요?", k1:"합계", v1:won(L.reduce(function(t,d){ return t+d.amount; },0))+"원", k2:"보낸 분", v2:L.slice(0,3).map(function(d){ return d.sender; }).join(", ")+(L.length>3?" 외 "+(L.length-3)+"건":""), yes:"되살리기"}, function(){
      busy(true); call("depositRestore",[{ids:ids}]).then(function(r){ busy(false); clearPick("trs"); TRASHDEP=null; bar(won((r&&r.n)||0)+"건을 입금 내역으로 되살렸어요.","ok"); refresh(["dep"]); }).catch(fail); });
  });
});

/* ── 10. 도움말 — 링크 복사 · 새 창 (화면만) ── */
after("help", function(){
  var u=location.origin+location.pathname+"#"+encodeURIComponent("도움말");
  on("설명서 링크 복사", function(){ v50Copy(u,"설명서 링크"); });
  on("새 창에서 열기", function(){ window.open(u,"_blank","noopener"); });
});
})();
</script>
