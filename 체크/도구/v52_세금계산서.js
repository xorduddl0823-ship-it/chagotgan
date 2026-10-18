<script>
/* ═══ v52 — 세금계산서 «입금한 곳만 발급» (대표님 «매우매우 중요» 10/18)
   · 받을 금액이 남은 청구서는 발급 대상 · 전체 선택 · 팝빌 발급 · 홈택스 양식에서 빠지고 «입금 전 — 발급 안 함»(회색 · 체크 안 됨)
   · 예외: 줄마다 «입금 전에 발급» → 가운데 확인 창(누구에게 · 얼마 · 아직 입금 안 됨) → 그 한 장만 발급 (서버 v46 taxIssue opt.unpaidOk)
   · 홈택스 일괄발급: 우리 마음대로 만든 엑셀 대신, 대표님이 홈택스에서 받은 «공식 양식 파일»을 골라 그 칸 이름대로 채워 내려받기
   받은 금액은 서버 taxList 의 paid · left(v46~), 없으면 같은 달 청구서(BILLS)의 받은 금액으로 셈 ═══ */
(function(){
function endOf(ym){ var y=Number(String(ym).slice(0,4)), m=Number(String(ym).slice(5,7)); if(!y||!m) return ""; return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10); }
function wd(t){ return TXDT[t.id]||t.writeDate||endOf(ST.ym); }
function leftOf(t){
  if(t._srv===undefined) t._srv=(t.left!=null&&!isNaN(Number(t.left)))?{left:Number(t.left), paid:Number(t.paid)||0}:null;   /* 서버 v46 값(처음 받은 그대로) */
  if(t._srv) return t._srv;
  var b=(BILLS||[]).filter(function(x){ return x.id===t.id; })[0]||(BILLS||[]).filter(function(x){ return x.name===t.name; })[0];   /* 번호가 같아야 하지만 못 찾으면 청구처 이름으로 */
  return b?{left:Math.max(0,Number(b.left)||0), paid:Number(b.paid)||0}:{left:Number(t.total)||0, paid:0};
}
/* 그릴 때마다 입금 여부를 다시 붙여요 (발급된 것 · 안 받음은 그대로) */
function mark(){
  TAXES.forEach(function(t){
    if(t._can0===undefined) t._can0=t.can;
    var p=leftOf(t); t.paid=p.paid; t.left=p.left;
    var done=/발급|전송/.test(t.state||"");
    t.unpaid=!!(t._can0 && !t.skip && !done && p.left>0);
    t.can=t._can0 && !t.unpaid;
    if(t.unpaid) t.why=p.paid>0?"입금 전 — 발급 안 함 (입금 "+won(p.paid)+"원 · 남은 "+won(p.left)+"원)":"입금 전 — 발급 안 함";
  });
}
var _ph=PAGE.hometax;
PAGE.hometax=function(){ mark(); return _ph.apply(this,arguments); };
window.chkTaxMark=mark;

/* 입금 전에 발급 — 그 한 장만, 확인 창 한 번 더 */
function early(id){
  var t=TAXES.filter(function(x){ return x.id===id; })[0]; if(!t) return;
  if(!isOwner()){ tell("대표만 할 수 있어요","세금계산서 발급은 대표 계정으로 해 주세요."); return; }
  var d=wd(t);
  ask({title:"아직 입금 전이에요. 그래도 발급할까요?\n"+ymText(ST.ym)+"분 · 작성일자 "+d,
       k1:"누구에게", v1:t.name+(t.members?" + "+t.members:"")+" · "+(t.issuer||t.comp||""),
       k2:"얼마", v2:won(t.total)+"원 (받은 "+won(t.paid||0)+"원 · 남은 "+won(t.left||0)+"원)",
       warn:(OFFICE.popbill_test?"지금은 시험 모드예요 — 국세청으로 가지 않아요.":"실제로 국세청에 발급돼요. 입금이 안 되면 수정세금계산서로 바로잡아야 해요."),
       warnKind:OFFICE.popbill_test?"ok":"bad", yes:"입금 전에 발급"}, function(){
    var dates={}; dates[t.id]=d;
    bar("팝빌로 발급하는 중이에요…","info"); busy(true);
    call("taxIssue",[[t.id],"",dates,{unpaidOk:[t.id]}]).then(function(r){
      busy(false); var bad=(r&&r.bad)||[];
      bar(bad.length?"발급하지 못했어요 — "+bad.slice(0,2).join(" / "):"«"+t.name+"» 세금계산서를 발급했어요 (입금 전).", bad.length?"err":"ok");
      refresh(["tax","bill"]);
    }).catch(fail);
  });
}

/* ── 홈택스 공식 양식 채우기 ── */
function nz(v){ return String(v==null?"":v).replace(/[\s* ()\[\]·:.,\-_/]/g,""); }
function digits(v){ return String(v||"").replace(/[^0-9]/g,""); }
function readHead(ws){
  var R=XLSX.utils.decode_range(ws["!ref"]||"A1"), grid=[], maxR=Math.min(R.e.r,40);
  for(var r=0;r<=maxR;r++){ grid[r]=[]; for(var c=0;c<=R.e.c;c++){ var cell=ws[XLSX.utils.encode_cell({r:r,c:c})]; grid[r][c]=cell?String(cell.w!=null?cell.w:cell.v):""; } }
  (ws["!merges"]||[]).forEach(function(m){ if(m.s.r>maxR) return; var v=grid[m.s.r][m.s.c];
    for(var r=m.s.r;r<=Math.min(m.e.r,maxR);r++) for(var c=m.s.c;c<=m.e.c;c++) grid[r][c]=v; });
  var hr=-1;
  for(var r2=0;r2<=maxR;r2++){ var j=nz(grid[r2].join("|")); if(j.indexOf("작성일자")>=0 && (j.indexOf("공급받는자")>=0||j.indexOf("등록번호")>=0)){ hr=r2; break; } }
  if(hr<0) return null;
  /* 칸 이름 = 위 두 줄(묶음 이름) + 그 줄 */
  var labels=grid[hr].map(function(x,c){ var up=[hr-2,hr-1].filter(function(q){ return q>=0; }).map(function(q){ return grid[q][c]; }).join("");
    return nz(up)+"|"+nz(x); });
  return {hr:hr, labels:labels, maxC:R.e.c, R:R};
}
function fieldOf(L){
  var all=L.replace("|",""), own=L.split("|")[1]||"";
  var buyer=/공급받는/.test(all), sup=/공급자/.test(all)&&!buyer;
  var item=/\d$/.test(own) && /^(일자|품목|규격|수량|단가|공급가액|세액|비고)/.test(own) ? own.replace(/\d+$/,"") : "";
  var idx=item?Number(own.match(/(\d+)$/)[1]):0;
  if(item) return idx===1?"item:"+item:"";
  if(/종류/.test(own)&&!/품목/.test(own)) return "kind";
  if(/작성일자/.test(own)) return "date";
  if(/영수/.test(all)&&/청구/.test(all)) return "pay";
  var who=buyer?"b":sup?"s":"";
  if(who){
    if(/종사업장/.test(own)) return who+":sub";
    if(/등록번호/.test(own)) return who+":biz";
    if(/상호/.test(own)) return who+":name";
    if(/성명/.test(own)) return who+":ceo";
    if(/주소/.test(own)) return who+":addr";
    if(/업태/.test(own)) return who+":upte";
    if(/종목/.test(own)) return who+":jong";
    if(/이메일/.test(own)) return who+":mail"+(/2$/.test(own)?"2":"");
  }
  if(/^공급가액$/.test(own)||/^공급가액합계/.test(own)) return "supply";
  if(/^세액$/.test(own)||/^세액합계/.test(own)) return "tax";
  if(/합계금액/.test(own)) return "total";
  if(/^비고$/.test(own)) return "memo";
  return "";
}
function valOf(f, t, d){
  var ymd=digits(d), O=OFFICE||{};
  var V={kind:"01", date:ymd, pay:"01",
    "s:biz":digits(O.popbill_corp||O.biz_no), "s:sub":"", "s:name":O.popbill_corp_name||O.name||"", "s:ceo":O.owner_name||"", "s:addr":O.addr||"",
    "s:upte":O.biz_type||"", "s:jong":O.biz_class||"", "s:mail":O.tax_email||"",
    "b:biz":digits(t.biz), "b:sub":"", "b:name":t.issuer||t.comp||t.name, "b:ceo":t.ceo||"", "b:addr":t.addr||"", "b:upte":"", "b:jong":"", "b:mail":"", "b:mail2":"",
    supply:t.supply, tax:t.tax, total:t.total, memo:"",
    "item:일자":ymd.slice(6,8), "item:품목":"자동차 성능점검 수수료", "item:규격":"", "item:수량":"", "item:단가":"", "item:공급가액":t.supply, "item:세액":t.tax, "item:비고":""};
  return V.hasOwnProperty(f)?V[f]:"";
}
function fill(file){
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var wb=XLSX.read(new Uint8Array(rd.result),{type:"array",cellStyles:true}), sh=null, H=null;
      for(var i=0;i<wb.SheetNames.length&&!H;i++){ var w=wb.Sheets[wb.SheetNames[i]]; var h=readHead(w); if(h){ sh=w; H=h; } }
      if(!H){ tell("홈택스 양식이 아닌 것 같아요","«작성일자» · «공급받는자 등록번호» 칸을 찾지 못했어요. 홈택스 › 전자(세금)계산서 › 일괄발급에서 받은 양식 파일을 그대로 골라 주세요."); return; }
      var F=H.labels.map(fieldOf), need=["date","s:biz","b:biz","supply","tax"], miss=need.filter(function(k){ return F.indexOf(k)<0; });
      if(miss.length){ tell("양식에서 칸을 다 찾지 못했어요","못 찾은 칸: "+esc(miss.join(", "))+". 홈택스에서 받은 양식을 고치지 않고 그대로 골라 주세요."); return; }
      var able=TAXES.filter(function(t){ return t.can && !t.skip && !/발급|전송/.test(t.state||""); });
      var ids=picked("htx"), pick=ids.length?able.filter(function(t){ return ids.indexOf(t.id)>=0; }):able;
      if(!pick.length){ tell("넣을 곳이 없어요","입금 완료 · 아직 발급 안 한 곳이 없어요."); return; }
      /* 제목 줄 아래 첫 빈 줄부터 (예시 줄이 있으면 그 아래) */
      var used=F.map(function(f,c){ return f?c:-1; }).filter(function(c){ return c>=0; }), r=H.hr+1;
      function empty(row){ return used.every(function(c){ var x=sh[XLSX.utils.encode_cell({r:row,c:c})]; return !x||x.v===""||x.v==null; }); }
      while(r<=H.R.e.r && !empty(r)) r++;
      pick.forEach(function(t){ var d=wd(t);
        F.forEach(function(f,c){ if(!f) return; var v=valOf(f,t,d), ad=XLSX.utils.encode_cell({r:r,c:c});
          sh[ad]=(typeof v==="number")?{t:"n",v:v}:{t:"s",v:String(v)}; });
        r++; });
      var rg=XLSX.utils.decode_range(sh["!ref"]); if(r-1>rg.e.r){ rg.e.r=r-1; sh["!ref"]=XLSX.utils.encode_range(rg); }
      var ext=/\.xls$/i.test(file.name)?"xls":"xlsx";
      XLSX.writeFile(wb, "홈택스_일괄발급_"+ST.ym+"_"+pick.length+"건."+ext, {bookType:ext==="xls"?"biff8":"xlsx"});
      bar("홈택스 양식에 "+pick.length+"건(입금 완료)을 채웠어요. 홈택스 › 일괄발급 › 파일 불러오기로 올려 주세요.","ok");
    }catch(e){ tell("양식을 읽지 못했어요","파일이 열려 있으면 닫고 다시 골라 주세요. ("+esc(String(e&&e.message||""))+")"); }
  };
  rd.readAsArrayBuffer(file);
}
function hometaxGo(){
  if(typeof XLSX==="undefined"){ bar("엑셀 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침(F5)해 주세요.","err"); return; }
  var able=TAXES.filter(function(t){ return t.can && !t.skip && !/발급|전송/.test(t.state||""); });
  if(!able.length){ tell("넣을 곳이 없어요","입금 완료 · 아직 발급 안 한 곳이 없어요. 입금 전인 곳은 줄마다 «입금 전에 발급»으로 따로 해요."); return; }
  CGG.dialog({size:"form", title:"홈택스 일괄발급 양식 채우기",
    desc:"홈택스에서 받은 공식 양식 파일을 고르면 입금 완료된 곳만 그 칸대로 채워 드려요.",
    body:'<ol style="margin:0 0 12px;padding-left:18px;line-height:1.8;font-size:13.5px"><li>홈택스 › 전자(세금)계산서 › <b>일괄발급</b>에서 엑셀 양식을 한 번 받아 둬요.</li><li>아래 단추로 그 파일을 골라요(고치지 않은 그대로).</li><li>채워진 파일을 홈택스 일괄발급 화면에 올려요.</li></ol>'+
      '<button type="button" class="cgg-btn pri" id="htxPick">양식 파일 고르기</button> <span class="note">'+able.length+'곳 · 고른 줄이 있으면 고른 곳만</span>',
    cancel:"닫기"});
  var b=document.getElementById("htxPick");
  if(b) b.onclick=function(){ var i=document.createElement("input"); i.type="file"; i.accept=".xls,.xlsx"; i.hidden=true; document.body.appendChild(i);
    i.onchange=function(){ var f=i.files&&i.files[0]; i.remove(); if(f){ CGG.closeDialog(); fill(f); } }; i.click(); };
}
var _a=AFTER.hometax;
AFTER.hometax=function(){
  if(_a) _a.apply(this,arguments);
  var xl=$("txXls"); if(xl){ xl.textContent="홈택스 일괄발급 양식 채우기"; xl.onclick=hometaxGo; }
  document.querySelectorAll("[data-txearly]").forEach(function(b){ b.onclick=function(){ early(b.getAttribute("data-txearly")); }; });
  /* 입금 전 줄은 체크 안 됨 */
  TAXES.forEach(function(t){ if(!t.unpaid) return;
    document.querySelectorAll('#htx-blk .pk[data-k="'+(window.CSS&&CSS.escape?CSS.escape(t.id):t.id)+'"]').forEach(function(c){ c.disabled=true; c.checked=false; c.title="입금 전 — 발급 안 함"; }); });
};
})();
</script>
