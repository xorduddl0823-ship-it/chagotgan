<script>
/* ═══ v52 — 나스 «가온 정산 v150»과 같게 (대표님 10/18)
   ① 나스 엑셀 올리기: «전산외청구 2026.xlsx»(시트 «성능» 여러 장) · «정비비 2026.xlsx»(시트 «정비» 여러 장) — 시트를 합치고 칸을 짝지어 excelPut
   ② 월별 청구서: «검사비 소계 · 전산외 청구 소계 · 정비비 소계 · 총계»(부가세 포함 — 나스와 같은 기준) · 전산외는 검사비에 섞지 않음
   ③ 매출: «나스와 비교는 부가세 포함» 한 줄 · 보험료는 «보험료 부가세» 설정대로(기본 미포함 = 엑셀 금액 그대로)
   ④ 정산 기록: 달마다 청구 · 입금 · 남은 금액 장부 (salesStat bill · got)
   ⑤ 서버 v45 단추: 알림톡 템플릿은 보기만(관리에서 넣음) · 수수료 규칙 · 수집함 주소를 서버에 (대표만) ═══ */
(function(){
/* ③ 보험료 부가세 — 미포함(기본)이면 엑셀 금액 그대로, 포함이면 다른 금액처럼 */
window.insMoney=function(v){ return (typeof OFFICE!=="undefined"&&OFFICE&&OFFICE.ins_vat==="포함")?vmoney(v):Math.round(Number(v)||0); };
function band(id, text, tone){ if(!text||$(id)) return; var h=$("main").querySelector(".cgg-head"); if(!h) return;
  var b=document.createElement("div"); b.id=id; b.className="msg info"; b.style.margin="0 0 12px"; b.textContent=text;
  /* 할 일 띠(chkBand · v52Sales)가 먼저, 안내 한 줄은 그 아래 */
  var last=h; ["chkBand","v52Sales","v51Gaon"].forEach(function(k){ var x=$(k); if(x&&x.parentNode===h.parentNode) last=x; });
  h.parentNode.insertBefore(b,last.nextSibling); }
var as=AFTER.sales;
AFTER.sales=function(){ if(as) as.apply(this,arguments);
  band("v52Nas","나스(가온 정산)와 견줄 때는 «부가세 포함»으로 봐요. 보험료는 "+((OFFICE&&OFFICE.ins_vat==="포함")?"부가세 포함 설정이에요.":"엑셀 금액 그대로예요(보험료 부가세 미포함).")); };

/* ② 월별 청구서 소계 (부가세 포함) */
var ab=AFTER.bill;
AFTER.bill=function(){ if(ab) ab.apply(this,arguments);
  if(!BILLS.length||$("v52Sub")) return;
  var f=0,x=0,r=0; BILLS.forEach(function(b){ f+=Number(b.feeOnly!=null?b.feeOnly:b.fee)||0; x+=Number(b.ext)||0; r+=Number(b.rep)||0; });
  var k=$("main").querySelector(".cgg-kpis"); if(!k) return;
  var c=document.createElement("div"); c.id="v52Sub"; c.className="card";
  c.innerHTML='<h3>'+esc(ymText(ST.ym))+' 청구 합계 <span class="rt">부가세 포함 · 나스와 같은 기준</span></h3>'+
    '<div class="sums c4">'+[["검사비 소계",f],["전산외 청구 소계",x],["정비비 소계",r],["총계",f+x+r]].map(function(s,i){
      return '<div class="sum'+(i===3?" good":"")+'"><span>'+s[0]+'</span><b>'+won(s[1])+'원</b></div>'; }).join("")+'</div>'+
    '<p class="note">전산외 청구는 검사비 소계와 따로 셈해요(총계에서만 합쳐요).</p>';
  k.parentNode.insertBefore(c, k.nextSibling);
};

/* ① 나스 엑셀 올리기 */
function nz(v){ return String(v==null?"":v).replace(/[\s()\[\]·:.]/g,""); }
function ymd(v, yr){
  if(v instanceof Date && !isNaN(v)) return v.getFullYear()+"-"+("0"+(v.getMonth()+1)).slice(-2)+"-"+("0"+v.getDate()).slice(-2);
  var s=String(v==null?"":v).trim(), n=Number(s);
  if(n>30000&&n<80000){ var d=new Date(Math.round((n-25569)*86400000)); return d.getUTCFullYear()+"-"+("0"+(d.getUTCMonth()+1)).slice(-2)+"-"+("0"+d.getUTCDate()).slice(-2); }
  var m=s.match(/(20\d{2})\D{1,3}(\d{1,2})\D{1,3}(\d{1,2})/); if(m) return m[1]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[3]).slice(-2);
  m=s.match(/^(\d{1,2})\s*[\/.\-월]\s*(\d{1,2})/); if(m&&yr) return yr+"-"+("0"+m[1]).slice(-2)+"-"+("0"+m[2]).slice(-2);
  return ""; }
function ymOf(v, yr){ var s=String(v==null?"":v).trim(), m=s.match(/(20\d{2})\D{0,3}(\d{1,2})/); if(m) return m[1]+"-"+("0"+m[2]).slice(-2);
  m=s.match(/^(\d{1,2})\s*월?$/); if(m&&yr) return yr+"-"+("0"+m[1]).slice(-2); var d=ymd(v,yr); return d?d.slice(0,7):""; }
function money(v){ return Math.round(Number(String(v==null?"":v).replace(/[^0-9.\-]/g,""))||0); }
/* 모든 시트에서 제목 줄(날짜 · 금액 + need)을 찾아 줄을 합쳐요 */
function sheets(wb, need){
  var out=[], used=[];
  wb.SheetNames.forEach(function(sn){
    var A=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:""}), hr=-1;
    for(var r=0;r<Math.min(A.length,15);r++){ var j=A[r].map(nz); if(j.indexOf("날짜")>=0 && j.indexOf("금액")>=0 && need.every(function(w){ return j.some(function(c){ return c.indexOf(w)>=0; }); })){ hr=r; break; } }
    if(hr<0) return; used.push(sn);
    var H=A[hr].map(nz);
    function col(){ for(var i=0;i<arguments.length;i++){ var w=arguments[i]; for(var c=0;c<H.length;c++) if(H[c]===w||H[c].indexOf(w)===0) return c; } return -1; }
    var C={date:col("날짜"),comp:col("상사"),name:col("이름","딜러","신청인"),kind:col("국/수","국수","구분"),amt:col("금액"),plate:col("차량","차량번호"),car:col("차명"),
           tax:col("계산서발행여부","계산서발행","발행여부","계산서"),why:col("사유"),memo:col("특이사항"),bm:col("청구월")};
    for(var r2=hr+1;r2<A.length;r2++){ var R=A[r2]; if(!R||!R.some(function(x){ return x!==""&&x!=null; })) continue;
      var g=function(k){ return C[k]>=0?R[C[k]]:""; }; out.push({sheet:sn, line:r2+1, g:g}); }
  });
  return {rows:out, used:used};
}
function readWb(file, done){
  if(typeof XLSX==="undefined"){ bar("엑셀 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침(F5)해 주세요.","err"); return; }
  var rd=new FileReader(); rd.onload=function(){ try{ done(XLSX.read(new Uint8Array(rd.result),{type:"array",cellDates:true})); }catch(e){ tell("엑셀을 읽지 못했어요","파일이 열려 있으면 닫고 다시 골라 주세요."); } };
  rd.readAsArrayBuffer(file);
}
function byMonth(list){ var M={}; list.forEach(function(x){ (M[x.ym]=M[x.ym]||[]).push(x.row); }); return M; }
function upload(kind, M, file, done){
  var ks=Object.keys(M).sort(), i=0, n=0; busy(true);
  (function next(){ if(i>=ks.length){ busy(false); done(n); return; }
    var ym=ks[i++]; putOne(kind, M[ym], file, "xlMsg", ym).then(function(k){ n+=k; next(); }).catch(function(e){ busy(false); fail(e); }); })();
}
function extGo(file){
  readWb(file, function(wb){
    var yr=(String(file.name).match(/20\d{2}/)||[""])[0], S=sheets(wb,["국"]), bad=0, list=[];
    S.rows.forEach(function(x){ var g=x.g, d=ymd(g("date"),yr), a=money(g("amt")); if(!d||!a){ if(String(g("date")||g("amt")).trim()) bad++; return; }
      var k=String(g("kind")).trim(), goods=/^국/.test(k)?"국산차":/^수/.test(k)?"수입차":(k||"전산외");
      var tx=String(g("tax")).trim(), yn=/미발행|^x$|^n$|아니/i.test(tx)?"N":(/발행|^o$|^y$|^v$|○|●/i.test(tx)?"Y":"");
      list.push({ym:d.slice(0,7), amt:a, row:{성능번호:"", 차량번호:String(g("plate")).trim(), 차명:String(g("car")).trim(), 검사일:d, 회사명:String(g("comp")).trim(),
        신청인:String(g("name")).trim(), 상품명:goods, 금액:a, 성능보험료:0, 보험료납부:"N", 계산서발행:yn, 사유:String(g("why")).trim(), 특이사항:String(g("memo")).trim()}}); });
    confirmUp("전산외", file, S, list, bad);
  });
}
function repGo(file){
  readWb(file, function(wb){
    var yr=(String(file.name).match(/20\d{2}/)||[""])[0], S=sheets(wb,["사유"]), bad=0, list=[];
    S.rows.forEach(function(x){ var g=x.g, d=ymd(g("date"),yr), a=money(g("amt")), bm=ymOf(g("bm"),yr)||(d?d.slice(0,7):"");
      if(!bm||!a){ if(String(g("date")||g("amt")).trim()) bad++; return; }
      list.push({ym:bm, amt:a, row:{작업일:d, 차량번호:String(g("plate")).trim(), 차명:String(g("car")).trim(), 신청인:String(g("name")).trim(),
        회사명:String(g("comp")).trim(), 작업내용:String(g("why")).trim()||"정비비", 금액:a}}); });
    confirmUp("정비비", file, S, list, bad);
  });
}
function confirmUp(kind, file, S, list, bad){
  if(!S.used.length){ tell("칸을 찾지 못했어요","«날짜 · 금액"+(kind==="정비비"?" · 사유":" · 국/수")+"» 칸이 있는 시트가 없어요. 나스에서 쓰던 «"+kind+(kind==="전산외"?"청구":"")+"» 파일을 그대로 골라 주세요."); return; }
  if(!list.length){ tell("넣을 줄이 없어요","날짜 · 금액을 읽은 줄이 없어요."+(bad?" (못 읽은 줄 "+bad+"개)":"")); return; }
  var M=byMonth(list), sum=list.reduce(function(t,x){ return t+x.amt; },0);
  ask({title:(kind==="전산외"?"전산외 청구":"정비비")+" "+list.length+"건을 넣을까요?\n시트 "+S.used.length+"장 합침"+(bad?" · 못 읽은 줄 "+bad+"개는 빼요":""),
       rows:Object.keys(M).sort().map(function(ym){ var a=M[ym].reduce(function(t,r){ return t+(Number(r.금액)||0); },0); return [esc(ymText(ym)), esc(M[ym].length+"건 · "+won(a)+"원")]; }),
       rowsTitle:"달마다", k1:"합계 (부가세 포함)", v1:won(sum)+"원",
       warn:kind==="정비비"?"같은 청구월에 전에 엑셀로 넣은 정비비는 이번 것으로 바뀌어요.":"같은 차 · 같은 날은 한 번만 들어가요. 전산외 청구는 검사비 소계와 따로 셈해요.", yes:"넣기"}, function(){
    upload(kind, M, file.name, function(n){ bar((kind==="전산외"?"전산외 청구":"정비비")+" "+won(n)+"건을 넣었어요. 월별 청구서에서 «청구서 만들기»를 한 번 더 눌러요.","ok"); refresh(["set","up","bill","sales"]); });
  });
}
function pickFile(f){ var i=document.createElement("input"); i.type="file"; i.accept=".xlsx,.xls"; i.hidden=true; document.body.appendChild(i);   /* 문서에 붙여 둬야 고른 뒤 사라지지 않아요 */
  i.onchange=function(){ var x=i.files&&i.files[0]; i.remove(); if(x) f(x); }; i.click(); }
var af=AFTER.files;
AFTER.files=function(){ if(af) af.apply(this,arguments);
  if($("v52Nas2")) return; var c0=$("main").querySelector(".card"); if(!c0) return;
  var c=document.createElement("div"); c.id="v52Nas2"; c.className="card";
  c.innerHTML='<h3>나스 엑셀 올리기 — 전산외 청구 · 정비비</h3><p class="csub">나스(가온 정산)에서 쓰던 파일을 그대로 골라요. 시트가 여러 장이면 모두 합쳐요.</p>'+
    '<div class="tools"><button type="button" class="btn" id="v52Ext">전산외청구 파일 고르기</button><button type="button" class="btn" id="v52Rep">정비비 파일 고르기</button></div>';
  c0.parentNode.insertBefore(c, c0.nextSibling);
  $("v52Ext").onclick=function(){ pickFile(extGo); }; $("v52Rep").onclick=function(){ pickFile(repGo); };
};

/* ④ 정산 기록 — 달마다 장부 */
PAGE.history=function(){
  var H=(SALES||[]).filter(function(r){ return Number(r.bill)>0||Number(r.got)>0; }).map(function(r){
    return {id:r.ym, ym:r.ym, n:r.n, bill:Number(r.bill)||0, got:Number(r.got)||0, left:Math.max(0,(Number(r.bill)||0)-(Number(r.got)||0)), tax:r.taxN!=null?r.taxN+"장":"보기 ›", _q:r.ym}; });
  return head("정산 기록","달마다 만든 청구서와 입금 · 세금계산서 결과를 모아 두는 장부예요.")+
  (H.length?"":'<div class="msg info">월별 청구서에서 청구서를 만들면 여기에 쌓여요.</div>')+
  (function(){ var b=0,g=0; H.forEach(function(r){ b+=r.bill; g+=r.got; });
    return sums([["청구 합계",won(b)+"원"],["입금 합계",won(g)+"원"],["남은 금액",won(Math.max(0,b-g))+"원",b>g?"bad":"good"],["기록한 달",won(H.length)+"달"]]); })()+
  card("달마다 장부","달을 누르면 그 달 청구서로 가요. 금액은 부가세 포함이에요.",
    tableBlock("his",[
      {k:"ym",t:"청구 달",name:true,fmt:function(v){ return '<a href="#" data-hisym="'+esc(v)+'"><b>'+esc(ymText(v))+'</b></a>'; }},
      {k:"n",t:"검사 대수",num:true,fmt:function(v){ return won(v)+"대"; }},
      {k:"bill",t:"청구",num:true,fmt:function(v){ return won(v); }},
      {k:"got",t:"입금",num:true,fmt:function(v){ return won(v); }},
      {k:"left",t:"남은 금액",num:true,fmt:function(v){ return v>0?'<span style="color:var(--danger);font-weight:800">'+won(v)+'</span>':'0'; }},
      {k:"tax",t:"세금계산서",fmt:function(v,r){ return '<a href="#" data-histax="'+esc(r.ym)+'">'+esc(v)+'</a>'; }}
    ], H, {tools:'<button class="btn">기록 전체 엑셀 다운로드</button>'}))+
  CGG.help("청구는 그 달에 만든 청구서 합계, 입금은 그 청구서에 맞춘 돈이에요. 세금계산서 칸을 누르면 그 달 세금계산서 화면으로 가요.","이 화면 사용법");
};
NEEDS.history=["sales"];
AFTER.history=function(){ wireTable("his",function(){ draw(); });
  function goYm(ym, p){ ST.ym=ym; try{ set("cgg_ym",ym); }catch(e){} refresh(["bill","tax","dep"]); go(p); }
  document.querySelectorAll("[data-hisym]").forEach(function(a){ a.onclick=function(e){ e.preventDefault(); goYm(a.getAttribute("data-hisym"),"bill"); }; });
  document.querySelectorAll("[data-histax]").forEach(function(a){ a.onclick=function(e){ e.preventDefault(); goYm(a.getAttribute("data-histax"),"hometax"); }; });
};

/* ⑤ 서버 v45 단추 — 알림톡 템플릿은 보기만 · 수수료 규칙 · 수집함 주소 (모두 대표만) */
var at=AFTER.billtpl;
AFTER.billtpl=function(){ if(at) at.apply(this,arguments);
  var ins=document.querySelector("#main .row2"); if(!ins) return; var card=ins.closest(".card"); if(!card||card.getAttribute("data-v52")) return; card.setAttribute("data-v52","1");
  Array.prototype.forEach.call(card.querySelectorAll("button"),function(b){ if(String(b.textContent).trim()==="저장") b.remove(); });
  ins.innerHTML='<p class="note" style="margin:0">발신프로필 · 템플릿 ID는 <b>차곳간 관리</b>에서 넣어요. 체크에서는 넣었는지만 봐요.</p>';
  call("tplInfo",[]).then(function(r){ if(!r) return; var L=[["발신프로필",r.profile],["① 청구서",r.bill],["② 보험료",r.deposit],["③ 재검사",r.remind],["차량 도착",r.arrive]];
    ins.innerHTML+='<div style="margin-top:8px">'+L.map(function(x){ return '<div class="kv"><span>'+esc(x[0])+'</span><b>'+(x[1]?"넣음":"아직")+'</b></div>'; }).join("")+'</div>'; }).catch(function(){});
};
var aF=AFTER.fee, feeLoaded=false;
AFTER.fee=function(){ if(aF) aF.apply(this,arguments);
  if(!isOwner()||feeLoaded) return; feeLoaded=true;
  call("feeRules",[]).then(function(r){ if(!r||!Array.isArray(r.rules)) return;
    try{ localStorage.setItem("chk_fee:"+(ST.shop||""), JSON.stringify({on:!!r.on, rules:r.rules})); }catch(e){}
    if(page==="fee") draw(); }).catch(function(){});
};
var aS=AFTER.sms;
AFTER.sms=function(){ if(aS) aS.apply(this,arguments);
  if(!isOwner()) return;
  var u=document.querySelector('#main input[type=text]'), p=document.querySelector('#main input[type=password]');
  if(p){ p.value=""; }   /* 예시 점(••••)이 비밀번호로 저장되지 않게 늘 비워 둬요 */
  if(u&&/\.\.\./.test(u.value)) u.value="";
  call("smsConf",[]).then(function(r){ if(!r) return; if(u&&r.url) u.value=r.url; if(p&&r.pwSet) p.placeholder="저장돼 있어요 (바꿀 때만 넣어요)"; }).catch(function(){});
  var ok=Array.prototype.filter.call(document.querySelectorAll("#main button"),function(b){ return String(b.textContent).trim()==="연결 확인"; })[0];
  if(ok){ var ping=ok.onclick; ok.onclick=function(){
    var url=String((u||{}).value||"").trim(), pw=String((p||{}).value||"");
    if(!/^https:\/\//.test(url)||/\.\.\./.test(url)){ if(ping) ping.apply(this,arguments); return; }   /* 예시 주소(…)는 저장 안 함 */
    var body={url:url}; if(pw && !/^[•·*]+$/.test(pw)) body.pw=pw;
    call("smsConf",[body]).then(function(){ if(p) p.value=""; bar("수집함 주소를 서버에 저장했어요.","ok"); }).catch(function(e){ bar(niceMsg(e&&e.message),"err"); });
    if(ping) ping.apply(this,arguments); }; }
};
})();
</script>
