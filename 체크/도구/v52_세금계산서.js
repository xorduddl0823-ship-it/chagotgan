<script>
/* ═══ v52 — 세금계산서 «입금한 곳만 발급» (대표님 «매우매우 중요» 10/18)
   · 받을 금액이 남은 청구서는 발급 대상 · 전체 선택 · 팝빌 발급 · 홈택스 양식에서 빠지고 «입금 전 — 발급 안 함»(회색 · 체크 안 됨)
   · 예외: 줄마다 «입금 전에 발급» → 가운데 확인 창(누구에게 · 얼마 · 아직 입금 안 됨) → 그 한 장만 발급 (서버 v46 taxIssue opt.unpaidOk)
   · 홈택스 일괄발급: 대표님이 주신 홈택스 공식 양식(일반 · 운영/자료)을 화면 안에 넣어 두고 그 칸 이름대로 채워 .xls 로 내려받기 (100건씩 · 길이 제한 · 영수 01)
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
    if(t._can0===undefined) t._can0=t.can || (/입금 전/.test(t.why||"") && Number(t.left)>0);   /* 서버 v46: 입금 전이면 can:false + why «아직 입금 전입니다» */
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
       k2:"몇 건 · 얼마", v2:"1건 · "+won(t.total)+"원 (받은 "+won(t.paid||0)+"원 · 남은 "+won(t.left||0)+"원)",
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
  var labels=grid[hr].map(function(x,c){ var up=[hr-2,hr-1].filter(function(q){ return q>=0; }).map(function(q){ return grid[q][c]; }).filter(function(v){ return String(v).length<=20; }).join("");   /* 긴 위 줄은 안내 글이라 빼요 */
    return nz(up)+"|"+nz(String(x).replace(/\([^)]*\)/g,"")); });   /* 괄호 안 설명(예: «(2자리, 작성년월 제외)»)은 빼고 읽어요 */
  return {hr:hr, labels:labels, maxC:R.e.c, R:R};
}
function fieldOf(L){
  var all=L.replace("|",""), own=L.split("|")[1]||"";
  var buyer=/공급받는/.test(all), sup=/공급자/.test(all)&&!buyer;
  /* 품목 칸은 «일자1(2자리, 작성년월 제외)»처럼 뒤에 설명이 붙어도 — 낱말 바로 뒤 숫자로 알아봐요 */
  var im=own.match(/^(일자|품목명?|규격|수량|단가|공급가액|세액|비고)(\d+)/);
  if(im) return Number(im[2])===1?"item:"+im[1].replace("품목명","품목"):"";
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
/* 항목설명 시트의 길이 제한(바이트 · 한글 2) — 넘치면 잘라서 알려 드려요 */
var LIM={"s:name":70,"s:ceo":30,"s:addr":150,"s:upte":40,"s:jong":60,"s:mail":40,"b:name":70,"b:ceo":30,"b:addr":150,"b:upte":40,"b:jong":60,"b:mail":40,"b:mail2":40,memo:150,"item:품목":100,"item:규격":60,"item:비고":100};
function bytes(v){ var n=0; String(v).split("").forEach(function(ch){ n+=ch.charCodeAt(0)>127?2:1; }); return n; }
function cut(v,max){ var o="", n=0; String(v).split("").some(function(ch){ var w=ch.charCodeAt(0)>127?2:1; if(n+w>max) return true; n+=w; o+=ch; return false; }); return o; }
/* 화면 안에 넣어 둔 홈택스 공식 양식(일반 · 운영/자료 · 암호 풀어 둔 것) — 시트 4장 · 6줄 칸 이름 · 59칸 · 7줄부터 · 100건까지 */
function makeFile(pick, part, parts, warn){
  var wb=XLSX.read(window.HTX_TPL_B64,{type:"base64"}), sh=wb.Sheets["엑셀업로드양식"], H=sh&&readHead(sh);
  if(!H) throw new Error("양식 칸을 찾지 못했어요");
  var F=H.labels.map(fieldOf), need=["kind","date","s:biz","b:biz","supply","tax","item:일자","item:품목","pay"], miss=need.filter(function(k){ return F.indexOf(k)<0; });
  if(miss.length) throw new Error("양식 칸 "+miss.join(", "));
  var r=H.hr+1;
  pick.forEach(function(t){ var d=wd(t);
    F.forEach(function(f,c){ if(!f) return; var v=valOf(f,t,d);
      if(LIM[f] && bytes(v)>LIM[f]){ warn.push((t.name||"")+" · "+f.replace(/^[sb]:/,"").replace("item:","")+" "+LIM[f]+"바이트로 줄임"); v=cut(v,LIM[f]); }
      if(v===""||v==null) return;
      sh[XLSX.utils.encode_cell({r:r,c:c})]=(typeof v==="number")?{t:"n",v:v}:{t:"s",v:String(v)}; });
    r++; });
  var rg=XLSX.utils.decode_range(sh["!ref"]); if(r-1>rg.e.r){ rg.e.r=r-1; sh["!ref"]=XLSX.utils.encode_range(rg); }
  XLSX.writeFile(wb, "홈택스_일괄발급_"+ST.ym+(parts>1?"_"+part+"of"+parts:"")+"_"+pick.length+"건.xls", {bookType:"biff8"});
}
function hometaxGo(){
  if(typeof XLSX==="undefined"){ bar("엑셀 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침(F5)해 주세요.","err"); return; }
  var able=TAXES.filter(function(t){ return t.can && !t.skip && !/발급|전송/.test(t.state||""); });
  var ids=picked("htx"), pick=ids.length?able.filter(function(t){ return ids.indexOf(t.id)>=0; }):able;
  if(!pick.length){ tell("넣을 곳이 없어요","입금 완료 · 아직 발급 안 한 곳이 없어요. 입금 전인 곳은 줄마다 «입금 전에 발급»으로 따로 해요."); return; }
  var noBiz=pick.filter(function(t){ return digits(t.biz).length!==10; }).length;
  if(!digits((OFFICE||{}).popbill_corp||(OFFICE||{}).biz_no)){ tell("우리 사업장 사업자번호가 비어 있어요","설정 › 거래처 › 우리 사업장에서 사업자등록번호를 먼저 넣어 주세요."); return; }
  var parts=Math.ceil(pick.length/100), tot=pick.reduce(function(a,t){ return a+(Number(t.total)||0); },0);
  ask({title:"홈택스 일괄발급 양식을 내려받을까요?", sub:ymText(ST.ym)+"분 · 입금 완료만 · 영수(01)",
       k1:"몇 건", v1:pick.length+"건"+(parts>1?" (100건씩 파일 "+parts+"개)":""), k2:"얼마", v2:won(tot)+"원 (부가세 포함)",
       warn:"홈택스 공식 양식(일반) 그대로예요. 홈택스 일괄발급 화면에서 이 파일을 불러와요(발급은 한 번에 50건씩)."+(parts>1?" 파일이 여러 개라 브라우저가 «여러 파일 내려받기»를 물으면 «허용»을 눌러요.":"")+(noBiz?" 사업자번호가 10자리가 아닌 곳 "+noBiz+"곳이 있어요.":""), yes:"내려받기"}, function(){
    var warn=[];
    try{ for(var i=0;i<parts;i++) makeFile(pick.slice(i*100,(i+1)*100), i+1, parts, warn); }
    catch(e){ tell("양식을 만들지 못했어요","차곳간에 알려 주세요. ("+esc(String(e&&e.message||""))+")"); return; }
    bar("홈택스 양식 "+parts+"개("+pick.length+"건)를 내려받았어요."+(warn.length?" 길이가 넘쳐 줄인 칸 "+warn.length+"개 — "+warn.slice(0,2).join(" / "):""), warn.length?"info":"ok");
  });
}
var _a=AFTER.hometax;
AFTER.hometax=function(){
  if(_a) _a.apply(this,arguments);
  var xl=$("txXls"); if(xl){ xl.textContent="홈택스 일괄발급 양식 내려받기"; xl.onclick=hometaxGo; }
  document.querySelectorAll("[data-txearly]").forEach(function(b){ b.onclick=function(){ early(b.getAttribute("data-txearly")); }; });
  /* 입금 전 줄은 체크 안 됨 */
  TAXES.forEach(function(t){ if(!t.unpaid) return;
    document.querySelectorAll('#htx-blk .pk[data-k="'+(window.CSS&&CSS.escape?CSS.escape(t.id):t.id)+'"]').forEach(function(c){ c.disabled=true; c.checked=false; c.title="입금 전 — 발급 안 함"; }); });
};
})();
</script>
