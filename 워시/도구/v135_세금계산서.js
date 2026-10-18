/* ═══ 워시 v135 — 세금계산서 «입금한 곳만 발급» (대표님 10/18 · 운영/04 맨 위 · 체크 v53 과 같은 규칙)
   · 입금 완료(받을 금액 0원)인 묶음만 발급 대상 · 전체 선택 · 팝빌 발급 · 홈택스 양식에 들어가요
   · 입금 전 줄은 회색 «입금 뒤 발급돼요» 한 줄 + 체크칸 잠김. 예외 단추 · 확인 창 없음
   · 팝빌 발급 때 req.bill(달 · 묶음 열쇠 · 입고 기록 id · 받은/남은 금액)을 같이 보내요 — 서버 sb23 이 다시 확인
   · 홈택스 일괄발급: 체크와 같은 공식 양식(체크/부품/홈택스_일괄발급_양식_일반_1.0.xls · 암호만 푼 것)을 화면 안에 넣어 두고
     그 칸 이름대로 채워 .xls 로 내려받기 (100건씩 · 길이 제한 · 영수 01). 체크 v52_세금계산서.js 의 readHead · fieldOf · makeFile 을 워시 자료에 맞춤
   (이 글은 만들기_워시_v135.py 가 워시 큰 함수 안 «function exportHometax» 자리에 넣어요) ═══ */
var HTX_TPL_B64_W="__HTX_B64__";
/* 묶음의 받은 금액 · 남은 금액 — 청구서와 같은 셈(차마다 «수금완료»면 받음) */
function taxPayOf(g){
  var paid=g.recs.filter(function(r){return statusOf(r)==="수금완료";}).reduce(function(s,r){return s+(r.total||0);},0);
  return {paid:paid,left:Math.max(0,(g.amount||0)-paid)};
}
function taxIssuedReal(g){var d=taxDoc(g);return !!(d&&d.status==="발급"&&!d.test);}
function taxUnpaidText(g){return "입금 뒤 발급돼요 (받은 "+wonExact(g.paid||0)+" · 남은 "+wonExact(g.left||0)+")";}
/* 서버 sb23 에 같이 보내는 묶음 정보 — 서버는 code(청구서 보기코드)로 장부를 다시 읽어 판단해요(나머지는 참고) */
function taxBillOf(g,code){
  return {code:code||"",month:T.month||"",key:g.key,dealer:g.dealer||"",company:g.company||"",
    recIds:g.recs.map(function(r){return String(r.id);}),amount:g.amount,paid:g.paid||0,left:g.left||0};
}
/* 이 묶음과 차가 똑같은 월별 청구서(딜러 한 명씩 → 없으면 상사별) — «상사별로 한 장에 묶기»로 딜러가 섞이면 없어요 */
function taxBillFor(g){
  var sm=B.month,su=B.unit,ss=B.scope,sz=B.zero,ids=g.recs.map(function(r){return String(r.id);}).sort().join(","),hit=null;
  try{ B.month=T.month; B.scope="out"; B.zero="";
    ["dealer","company"].some(function(u){ B.unit=u;
      hit=buildBills().filter(function(b){return (b.recs||[]).map(function(r){return String(r.id);}).sort().join(",")===ids;})[0]||null; return !!hit; });
  }catch(e){ hit=null; }
  B.month=sm;B.unit=su;B.scope=ss;B.zero=sz;
  return hit;
}
/* 서버와 같은 셈: 청구서에 부가세가 붙으면(amount > base) 일감 합계 × 1.1, 아니면 일감 합계 */
function taxBillTotal(b){ return (b.amount>b.base)?Math.round(b.base*1.1):b.base; }
/* 팝빌로 보내기 전 — 맞는 월별 청구서가 있으면 보기코드도 붙여요(서버 sb23 은 recIds 로 장부를 다시 읽어 판단 · 코드는 참고) */
function taxBillCode(g){
  var b=taxBillFor(g);
  if(!b) return Promise.resolve("");   /* 상사별로 묶어 청구서와 다른 묶음도 보내요 */
  return billCode(b).then(function(c){return c||"";},function(){return "";});
}

/* ── 홈택스 공식 양식 채우기 (체크 v52 와 같은 읽기 방식) ── */
function htxNz(v){ return String(v==null?"":v).replace(/[\s* ()\[\]·:.,\-_/]/g,""); }
function htxHead(ws){
  var R=XLSX.utils.decode_range(ws["!ref"]||"A1"), grid=[], maxR=Math.min(R.e.r,40);
  for(var r=0;r<=maxR;r++){ grid[r]=[]; for(var c=0;c<=R.e.c;c++){ var cell=ws[XLSX.utils.encode_cell({r:r,c:c})]; grid[r][c]=cell?String(cell.w!=null?cell.w:cell.v):""; } }
  (ws["!merges"]||[]).forEach(function(m){ if(m.s.r>maxR) return; var v=grid[m.s.r][m.s.c];
    for(var r=m.s.r;r<=Math.min(m.e.r,maxR);r++) for(var c=m.s.c;c<=m.e.c;c++) grid[r][c]=v; });
  var hr=-1;
  for(var r2=0;r2<=maxR;r2++){ var j=htxNz(grid[r2].join("|")); if(j.indexOf("작성일자")>=0 && (j.indexOf("공급받는자")>=0||j.indexOf("등록번호")>=0)){ hr=r2; break; } }
  if(hr<0) return null;
  var labels=grid[hr].map(function(x,c){ var up=[hr-2,hr-1].filter(function(q){ return q>=0; }).map(function(q){ return grid[q][c]; }).filter(function(v){ return String(v).length<=20; }).join("");
    return htxNz(up)+"|"+htxNz(String(x).replace(/\([^)]*\)/g,"")); });
  return {hr:hr, labels:labels, R:R};
}
/* 칸 이름 → 무엇을 넣을지. 품목은 1~4번까지(워시는 작업 종류가 여러 개라 4줄) */
function htxField(L){
  var all=L.replace("|",""), own=L.split("|")[1]||"";
  var buyer=/공급받는/.test(all), sup=/공급자/.test(all)&&!buyer;
  var im=own.match(/^(일자|품목비고|품목명?|규격|수량|단가|공급가액|세액|비고)(\d+)/);   /* «품목비고1» = 그 줄 비고 */
  if(im){ var n=Number(im[2]); return (n>=1&&n<=4)?"item"+n+":"+im[1].replace("품목비고","비고").replace("품목명","품목"):""; }
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
/* 묶음의 품목 4줄 — 5종 넘으면 넷째 줄에 «기타 작업 N종»으로 묶고, 줄 합이 전체와 1~2원 어긋나면 마지막 줄에서 맞춰요 */
function htxItems(g){
  var items=g.itemList.slice(), use=[];
  if(items.length<=4) use=items.map(function(it){ var v=splitVat(it.price*it.qty); return {name:it.name,qty:it.qty,unit:splitVat(it.price).sup,sup:v.sup,vat:v.vat}; });
  else{
    use=items.slice(0,3).map(function(it){ var v=splitVat(it.price*it.qty); return {name:it.name,qty:it.qty,unit:splitVat(it.price).sup,sup:v.sup,vat:v.vat}; });
    var rest=items.slice(3), amt=rest.reduce(function(s,i){return s+i.price*i.qty;},0), rv=splitVat(amt);
    use.push({name:"기타 작업 "+rest.length+"종",qty:1,unit:rv.sup,sup:rv.sup,vat:rv.vat});
  }
  if(use.length){ var ss=use.reduce(function(s,l){return s+l.sup;},0), tv=use.reduce(function(s,l){return s+l.vat;},0), L=use[use.length-1]; L.sup+=g.sup-ss; L.vat+=g.vat-tv; }
  return use;
}
function htxVal(f, g, ymd, items){
  var sup=supplier(), pt=taxParty(g);
  var im=f.match(/^item(\d):(.+)$/);
  if(im){ var it=items[Number(im[1])-1]; if(!it) return "";
    return {"일자":ymd.slice(6,8),"품목":it.name,"규격":"","수량":it.qty,"단가":it.unit,"공급가액":it.sup,"세액":it.vat,"비고":g.dealer?("담당딜러: "+g.dealer):""}[im[2]]; }
  var V={kind:"01", date:ymd, pay:"01",
    "s:biz":digits(sup.bizNo), "s:sub":"", "s:name":sup.bizName||"", "s:ceo":sup.ceo||"", "s:addr":sup.addr||"",
    "s:upte":sup.upte||"", "s:jong":sup.jongmok||"", "s:mail":sup.email||"",
    "b:biz":digits(pt.bizNo), "b:sub":"", "b:name":pt.name||"", "b:ceo":pt.ceo||"", "b:addr":pt.addr||"", "b:upte":pt.upte||"", "b:jong":pt.jongmok||"", "b:mail":pt.email||"", "b:mail2":"",
    supply:g.sup, tax:g.vat, total:g.sup+g.vat,
    memo:shopLabel()+" "+(T.month||"")+" 광택·세차 "+g.cars+"대"+(g.dealer?(" · 담당딜러 "+g.dealer):"")};
  return V.hasOwnProperty(f)?V[f]:"";
}
var HTX_LIM={"s:name":70,"s:ceo":30,"s:addr":150,"s:upte":40,"s:jong":60,"s:mail":40,"b:name":70,"b:ceo":30,"b:addr":150,"b:upte":40,"b:jong":60,"b:mail":40,"b:mail2":40,memo:150};
function htxBytes(v){ var n=0; String(v).split("").forEach(function(ch){ n+=ch.charCodeAt(0)>127?2:1; }); return n; }
function htxCut(v,max){ var o="", n=0; String(v).split("").some(function(ch){ var w=ch.charCodeAt(0)>127?2:1; if(n+w>max) return true; n+=w; o+=ch; return false; }); return o; }
function htxLim(f){ if(HTX_LIM[f]) return HTX_LIM[f]; var m=f.match(/^item\d:(품목|규격|비고)$/); return m?{"품목":100,"규격":60,"비고":100}[m[1]]:0; }
function htxMake(pick, part, parts, warn){
  var wb=XLSX.read(HTX_TPL_B64_W,{type:"base64"}), sh=wb.Sheets["엑셀업로드양식"], H=sh&&htxHead(sh);
  for(var si=0;!H&&si<wb.SheetNames.length;si++){ sh=wb.Sheets[wb.SheetNames[si]]; H=htxHead(sh); }
  if(!H) throw new Error("양식이 바뀌었어요 — 차곳간에 알려 주세요");
  var F=H.labels.map(htxField), need=["kind","date","s:biz","b:biz","supply","tax","item1:일자","item1:품목","pay"], miss=need.filter(function(k){ return F.indexOf(k)<0; });
  if(miss.length) throw new Error("양식이 바뀌었어요 — 차곳간에 알려 주세요");
  var used=F.map(function(f,c){ return f?c:-1; }).filter(function(c){ return c>=0; }), r=H.hr+1, ymd=lastDayOf(T.month).ymd;
  while(r<=H.R.e.r && !used.every(function(c){ var x=sh[XLSX.utils.encode_cell({r:r,c:c})]; return !x||x.v===""||x.v==null; })) r++;
  pick.forEach(function(g){ var items=htxItems(g);
    F.forEach(function(f,c){ if(!f) return; var v=htxVal(f,g,ymd,items), lim=htxLim(f);
      if(lim && htxBytes(v)>lim){ warn.push((g.issuerName||"")+" · "+f.replace(/^[sb]:|^item\d:/,"")+" "+lim+"바이트로 줄임"); v=htxCut(v,lim); }
      if(v===""||v==null) return;
      sh[XLSX.utils.encode_cell({r:r,c:c})]=(typeof v==="number")?{t:"n",v:v}:{t:"s",v:String(v)}; });
    r++; });
  var rg=XLSX.utils.decode_range(sh["!ref"]); if(r-1>rg.e.r){ rg.e.r=r-1; sh["!ref"]=XLSX.utils.encode_range(rg); }
  var out=XLSX.write(wb,{bookType:"biff8",type:"array"});
  return saveFile("홈택스_일괄발급_"+(T.month||"")+(parts>1?"_"+part+"of"+parts:"")+"_"+pick.length+"건.xls", new Blob([out],{type:"application/vnd.ms-excel"}));
}
/* «홈택스 일괄발급 양식 내려받기» — 입금 완료 · 사업자번호 맞음 · 아직 실제 발급 안 한 묶음만 (고른 줄이 있으면 그중에서) */
function exportHometax(all){
  var sup=supplier();
  if(!sup.bizNo||!bizNoOk(sup.bizNo))return toast("먼저 공급자 사업자등록번호를 제대로 넣어 주세요",true);
  var sel=Object.keys(T.sel||{});
  var base=all.filter(function(g){return !sel.length||T.sel[g.key];});
  var pick=base.filter(function(g){return g.issue&&!g.unpaid&&!taxIssuedReal(g);});
  var unpaidN=base.filter(function(g){return g.unpaid&&!taxIssuedReal(g);}).length, noBizN=base.filter(function(g){return !g.issue;}).length;
  if(!pick.length)return toast("넣을 곳이 없어요 — 입금 완료 · 아직 발급 안 한 곳이 없어요"+(unpaidN?(" (입금 전 "+unpaidN+"건은 입금 뒤 발급돼요)"):""),true);
  var go=function(){
    var parts=Math.ceil(pick.length/100), tot=pick.reduce(function(s,g){return s+g.amount;},0);
    ask("홈택스 일괄발급 양식을 내려받을까요? ("+periodLabel(T.month)+" · 입금 완료만 · 영수)\n\n"+
        "받는 곳 · "+wWho(pick.map(function(g){return g.issuerName;}))+"\n"+
        pick.length+"건"+(parts>1?(" (100건씩 파일 "+parts+"개)"):"")+" · 합계 "+wonExact(tot)+" (부가세 포함)"+
        (unpaidN?("\n입금 전 "+unpaidN+"건은 빼요 — 입금 뒤 발급돼요."):"")+
        (noBizN?("\n사업자번호가 없거나 틀린 "+noBizN+"건은 빼요."):"")+
        "\n\n홈택스 일괄발급 화면에서 이 파일을 불러와요(발급은 한 번에 50건씩).",
      function(){
        var warn=[], chain=Promise.resolve();
        for(var i=0;i<parts;i++)(function(i){ chain=chain.then(function(){ return htxMake(pick.slice(i*100,(i+1)*100), i+1, parts, warn); }); })(i);
        chain.then(function(){ toast("홈택스 양식 "+parts+"개("+pick.length+"건)를 받았어요"+(warn.length?(" · 길이가 넘쳐 줄인 칸 "+warn.length+"개"):""),!!warn.length); },
          function(e){ toast("양식을 만들지 못했어요 — "+errMsg(e),true); });
      },"내려받기");
  };
  if(window.XLSX) return go();
  toast("엑셀 만들기 기능을 불러오는 중이에요…");
  loadLib("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",function(){return !!window.XLSX;})
    .then(go,function(){toast("엑셀 만들기 기능을 불러오지 못했어요 (인터넷 연결 확인)",true);});
}
