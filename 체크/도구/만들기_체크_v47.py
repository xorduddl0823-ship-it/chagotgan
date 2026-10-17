"""체크 v46 → v47 — 총괄 순서 ② «입금 내역: 입금 처리 · 지우기 · 은행 엑셀 가져오기» (v46 은 읽기만 · 시험판 v42 · 보류된 v45 는 그대로)
가온이 매일 하는 일인데 «준비 중»이던 버튼을 살려요.
  · 선택한 줄 청구서에 맞추기 → depositApply({ids, invoiceId})   (달 고르기 · 남은 금액 · 이름이 같은 청구처를 맨 위로)
  · 선택한 줄 되돌리기       → depositUnapply({ids})
  · 선택한 줄 갈래 바꾸기    → depositKind({ids, kind})
  · 선택한 줄 지우기(대표)   → depositDel({ids}) — 휴지통(state «지움»), 맞춘 것은 서버가 거절
  · 은행 거래내역 엑셀 가져오기(대표) → 브라우저에서 읽고 미리보기 → depositImport({rows}) — 파일은 보내지 않음
  · 서버에 아직 창구가 없으면(«지원하지 않는 기능») «서버를 새로 올려야 써요» 안내만
창구 약속: 체크/기획/2026-10-18_입금처리_창구_약속_초안.md
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v46.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 1) 자료: 입금 id · 맞춘 청구서 id 를 들고 있기 ──
rep('''      return { at:shortTs(d.tx_at), day:String(d.tx_at||"").slice(0,10),
        sender:d.sender||"입금자미상", amount:d.amount||0, kind:d.kind||"미분류",
        state:d.state||"확인 대기", bank:d.src||"", memo:d.memo||"",''',
    '''      return { id:String(d.id||""), inv:String(d.invoice_id||""), at:shortTs(d.tx_at), day:String(d.tx_at||"").slice(0,10),   /* v47 */
        sender:d.sender||"입금자미상", amount:d.amount||0, kind:d.kind||"미분류",
        state:d.state||"확인 대기", bank:d.src||"", memo:d.memo||"",''')

# ── 2) 화면: 표 버튼 살리기 · 은행 엑셀 칸 ──
rep('''    ], DEPS, {pick:true,
      filters:'<select><option>전체</option><option>확인 필요만</option><option>맞춘 것만</option></select>',
      tools:'<button class="btn">선택한 줄 입금 처리</button><button class="btn danger">선택한 줄 지우기</button>'}))+''',
    '''    ], DEPS, {pick:true,
      tools:'<button class="btn primary" id="depApply">선택한 줄 청구서에 맞추기</button><button class="btn" id="depUndo">선택한 줄 되돌리기</button>'+
            '<button class="btn" id="depKind">선택한 줄 갈래 바꾸기</button>'+(isOwner()?'<button class="btn danger" id="depDel">선택한 줄 지우기</button>':'')}))+''')
rep('''  card("은행거래내역으로 채우기","문자를 놓쳤거나 지난달을 한꺼번에 맞출 때 써요. 인터넷뱅킹에서 받은 거래내역 엑셀을 올려 주세요.",
    '<div class="photobox">거래내역 엑셀을 끌어다 놓거나 눌러서 고르세요<br><span style="font-size:12.5px;color:var(--muted)">.xlsx · .xls · .csv</span></div>');''',
    '''  card("은행 거래내역 엑셀 가져오기","팝빌에 안 잡힌 입금이나 지난달을 한꺼번에 넣을 때 써요. 인터넷뱅킹에서 받은 거래내역 엑셀을 고르면, 넣기 전에 미리 보여 드려요. 같은 입금은 두 번 들어가지 않아요.",
    isOwner() ? '<label class="photobox" for="depXls" style="display:block;cursor:pointer">거래내역 엑셀을 눌러서 고르세요<br><span style="font-size:12.5px;color:var(--muted)">.xlsx · .xls · .csv · 파일은 이 기기에서만 읽고 서버로 보내지 않아요</span></label>'+
      '<input type="file" id="depXls" accept=".xlsx,.xls,.csv" hidden><div id="depXlsBox"></div>'
    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>');''')

# ── 3) 동작 ──
rep('''AFTER.deposit=function(){
  wireTable("dep",function(){ draw(); }); wireSub();''', '''AFTER.deposit=function(){
  wireTable("dep",function(){ draw(); }); wireSub();
  depWire();   /* v47 */''')

DEP_JS = r'''/* ═══ v47: 입금 처리 · 되돌리기 · 갈래 · 지우기 · 은행 엑셀 (서버 창구 약속 체크/기획/2026-10-18_입금처리_창구_약속_초안.md) ═══ */
var DEP_KINDS=["검사비","정비비","보험료","기타","미분류"];
function depSrv(e){
  var m=String((e&&e.message)||"");
  if(/지원하지 않는 기능/.test(m)) return "서버를 새로 올려야 쓸 수 있어요(체크 서버 다음 판 — 입금 처리 창구). 차곳간에 알려 주세요.";
  return niceMsg(m);
}
function depPicked(){ var ids=picked("dep"); return DEPS.filter(function(d){ return d.id && ids.indexOf(d.id)>=0; }); }
function depNorm(v){ return String(v||"").replace(/\s|\(주\)|㈜|주식회사/g,""); }
function depWire(){
  var a=$("depApply"); if(a) a.onclick=depApplyGo;
  var u=$("depUndo"); if(u) u.onclick=depUndoGo;
  var k=$("depKind"); if(k) k.onclick=depKindGo;
  var d=$("depDel"); if(d) d.onclick=depDelGo;
  var x=$("depXls"); if(x) x.onchange=function(){ var f=x.files&&x.files[0]; x.value=""; if(f) depXlsRead(f); };
}
/* 청구서에 맞추기 — 달을 고르면 그 달 청구서 중 남은 금액이 있는 곳만. 입금자 이름이 청구처 · 포함 딜러 · 상사와 같으면 맨 위 */
function depApplyGo(){
  var L=depPicked();
  if(!L.length){ tell("고른 입금이 없어요","표 왼쪽 네모로 맞출 입금을 먼저 골라 주세요."); return; }
  var done=L.filter(function(d){ return d.inv || d.state!=="확인 대기"; });
  if(done.length){ tell("이미 맞춘 입금이 섞여 있어요","«확인 대기»인 입금만 골라 주세요. 이미 맞춘 것을 바꾸려면 먼저 «되돌리기»를 해 주세요."); return; }
  var sum=L.reduce(function(s,d){ return s+(Number(d.amount)||0); },0);
  var who=L.map(function(d){ return depNorm(d.sender); });
  var yms=[ST.ym, ymAddK(ST.ym,-1), ymAddK(ST.ym,-2)];
  CGG.dialog({size:"form", title:"청구서에 맞추기", desc:"입금 "+won(L.length)+"건 · 합계 "+won(sum)+"원",
    body:'<label class="f" for="daYm">어느 달 청구서예요?</label><select id="daYm" style="width:100%;margin-bottom:10px">'+
      yms.map(function(y){ return '<option value="'+esc(y)+'">'+esc(y.replace("-","년 "))+'월</option>'; }).join("")+'</select>'+
      '<div id="daList" style="display:grid;gap:6px;max-height:46vh;overflow:auto"><p class="note">불러오는 중…</p></div>'+
      '<div class="msg err" id="daErr" hidden style="margin-top:8px"></div>',
    ok:"맞추기", cancel:"닫기",
    onOk:function(){
      var r=document.querySelector("input[name=daInv]:checked"), e=$("daErr");
      if(!r){ e.hidden=false; e.textContent="맞출 청구서를 골라 주세요."; return false; }
      var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
      call("depositApply",[{ids:L.map(function(d){ return d.id; }), invoiceId:r.value}]).then(function(res){
        CGG.closeDialog(); clearPick("dep");
        bar(won((res&&res.n)||L.length)+"건을 «"+r.getAttribute("data-name")+"» 청구서에 맞췄어요.","ok"); refresh(["dep","bill"]);
      }).catch(function(er){ if(okb) okb.disabled=false; e.hidden=false; e.textContent=depSrv(er); });
      return false; }});
  function load(){
    var ym=$("daYm").value, box=$("daList"); box.innerHTML='<p class="note">불러오는 중…</p>';
    call("invoiceList",[ym, true]).then(function(list){
      var rows=(list||[]).map(function(v){ var left=(Number(v.total_amount)||0)-(Number(v.paid_amount)||0);
        var hit=who.some(function(w){ return w && (depNorm(v.bill_to_name)===w || depNorm(v.company_name)===w || (v.members||[]).some(function(m){ return depNorm(m)===w; })); });
        return {id:String(v.id), name:v.bill_to_name||"", comp:v.company_name||"", left:left, hit:hit}; })
        .filter(function(x){ return x.left>0; })
        .sort(function(p,q){ return (q.hit-p.hit) || p.name.localeCompare(q.name,"ko"); });
      if(!$("daList")) return;
      box.innerHTML = rows.length ? rows.map(function(x){
        return '<label style="display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:9px 11px;cursor:pointer">'+
          '<input type="radio" name="daInv" value="'+esc(x.id)+'" data-name="'+esc(x.name)+'" style="width:20px;height:20px;flex:none;margin:0">'+
          '<span style="flex:1;min-width:0"><b>'+esc(x.name)+'</b>'+(x.comp?' <span style="color:var(--muted)">· '+esc(x.comp)+'</span>':'')+
          (x.hit?' <span class="chip">이름 같음</span>':'')+'</span>'+
          '<span style="white-space:nowrap">남은 <b>'+won(x.left)+'</b>원'+(x.left===sum?' <span class="chip">딱 맞음</span>':'')+'</span></label>'; }).join("")
        : '<p class="note">이 달에는 남은 금액이 있는 청구서가 없어요. 다른 달을 골라 보세요.</p>';
    }).catch(function(er){ if($("daList")) box.innerHTML='<div class="msg err"></div>', box.firstChild.textContent=niceMsg(er&&er.message); });
  }
  $("daYm").onchange=load; load();
}
function ymAddK(ym,k){ var y=+ym.slice(0,4), m=+ym.slice(5,7)+k; while(m<1){m+=12;y--;} while(m>12){m-=12;y++;} return y+"-"+(m<10?"0":"")+m; }
function depUndoGo(){
  var L=depPicked().filter(function(d){ return d.inv; });
  if(!L.length){ tell("되돌릴 입금이 없어요","청구서에 맞춘 입금(자동 반영 · 입금 처리)을 골라 주세요."); return; }
  askPicked("입금 "+won(L.length)+"건을 되돌릴까요?", L.map(function(d){ return [d.sender, won(d.amount)+"원 · "+d.at]; }), "되돌리기", function(){
    busy(true);
    call("depositUnapply",[{ids:L.map(function(d){ return d.id; })}]).then(function(r){
      busy(false); clearPick("dep"); bar(won((r&&r.n)||L.length)+"건을 «확인 대기»로 되돌렸어요. 청구서의 받은 금액도 그만큼 줄었어요.","ok"); refresh(["dep","bill"]);
    }).catch(function(e){ busy(false); fail({message:depSrv(e)}); });
  }, "청구서의 받은 금액에서 이 입금만큼 빠져요. 입금 기록은 남아요.");
}
function depKindGo(){
  var L=depPicked();
  if(!L.length){ tell("고른 입금이 없어요","표 왼쪽 네모로 갈래를 바꿀 입금을 먼저 골라 주세요."); return; }
  CGG.dialog({size:"form", title:"갈래 바꾸기", desc:"입금 "+won(L.length)+"건",
    body:'<label class="f" for="dkSel">어느 갈래로 바꿀까요?</label><select id="dkSel" style="width:100%">'+
      DEP_KINDS.map(function(k){ return '<option>'+esc(k)+'</option>'; }).join("")+'</select><div class="msg err" id="dkErr" hidden style="margin-top:8px"></div>',
    ok:"바꾸기", cancel:"닫기",
    onOk:function(){ var kind=$("dkSel").value, okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
      call("depositKind",[{ids:L.map(function(d){ return d.id; }), kind:kind}]).then(function(r){
        CGG.closeDialog(); clearPick("dep"); bar(won((r&&r.n)||L.length)+"건을 «"+kind+"»(으)로 바꿨어요.","ok"); refresh(["dep"]);
      }).catch(function(e){ if(okb) okb.disabled=false; var b=$("dkErr"); b.hidden=false; b.textContent=depSrv(e); });
      return false; }});
}
function depDelGo(){
  if(!isOwner()) return;
  var L=depPicked();
  if(!L.length){ tell("고른 입금이 없어요","표 왼쪽 네모로 지울 입금을 먼저 골라 주세요."); return; }
  if(L.some(function(d){ return d.inv; })){ tell("청구서에 맞춘 입금이 섞여 있어요","맞춘 입금은 먼저 «되돌리기»를 한 뒤에 지울 수 있어요."); return; }
  askPicked("입금 "+won(L.length)+"건을 지울까요?", L.map(function(d){ return [d.sender, won(d.amount)+"원 · "+d.at]; }), "지우기", function(){
    busy(true);
    call("depositDel",[{ids:L.map(function(d){ return d.id; })}]).then(function(r){
      busy(false); clearPick("dep"); var kept=(r&&r.kept)||[];
      bar(won((r&&r.n)||0)+"건을 지웠어요."+(kept.length?" "+won(kept.length)+"건은 남겼어요.":""), kept.length?"err":"ok"); refresh(["dep"]);
    }).catch(function(e){ busy(false); fail({message:depSrv(e)}); });
  }, "지운 입금은 목록에서 빠져요(서버에는 지운 기록으로 남아요). 청구서 금액은 바뀌지 않아요.");
}

/* ── 은행 거래내역 엑셀: 이 기기에서 읽기 → 칸 찾기 → 미리보기 → 넣기 ── */
var DEPX=null;   /* {rows:[[…]], head:n, col:{date,time,amt,who}} */
function depXlsRead(file){
  if(!window.XLSX){ tell("엑셀을 읽을 수 없어요","인터넷 연결을 확인하고 새로고침해 주세요."); return; }
  if(file.size>8*1024*1024){ tell("파일이 너무 커요","8MB 안의 거래내역 파일로 해 주세요."); return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var wb=XLSX.read(new Uint8Array(rd.result),{type:"array", cellDates:true});   /* 날짜 칸은 Date 로 받음 (은행마다 글 모양이 달라서) */
      var sh=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(sh,{header:1, raw:true, defval:""}).slice(0,3000);
      DEPX={rows:rows, head:-1, col:{}}; depXlsGuess(); depXlsDraw();
    }catch(e){ tell("엑셀을 읽지 못했어요","은행에서 받은 거래내역 파일(.xlsx · .xls · .csv)인지 확인해 주세요."); }
  };
  rd.readAsArrayBuffer(file);
}
function depXlsGuess(){
  var R=DEPX.rows, best=-1, bs=0;
  for(var i=0;i<Math.min(20,R.length);i++){ var t=R[i].map(function(x){ return x instanceof Date?"":String(x); }).join("|"), sc=0;
    if(/거래\s*일|일시|날짜|일자/.test(t)) sc++; if(/입금|맡기신/.test(t)) sc++; if(/적요|내용|보낸|입금자|의뢰인|기재/.test(t)) sc++;
    if(sc>bs){ bs=sc; best=i; } }
  DEPX.head=best; var H=best>=0?R[best].map(function(x){ return String(x||"").replace(/\s/g,""); }):[];
  function find(re, not){ for(var j=0;j<H.length;j++) if(re.test(H[j]) && !(not&&not.test(H[j]))) return j; return -1; }
  DEPX.col={ date:find(/거래일시|거래일자|거래일|일시|날짜|일자/), time:find(/시간|시각/, /일시/),
    amt:find(/입금액|맡기신금액|입금금액|입금\(원\)|^입금$|맡기신/, /출금|찾으신/),
    who:(function(){ var k=find(/보낸분|입금자|의뢰인|기재내용|받는분/); return k>=0?k:find(/적요|내용|메모/); })() };
}
function depXlsParse(){
  var R=DEPX.rows, c=DEPX.col, out=[], bad=0;
  for(var i=DEPX.head+1;i<R.length;i++){ var r=R[i]; if(!r || !r.some(function(x){ return x!=="" && x!=null; })) continue;
    var av=r[c.amt]; var amt=Math.round(typeof av==="number"?av:(Number(String(av==null||av instanceof Date?"":av).replace(/[^0-9.-]/g,""))||0));
    if(c.amt<0 || amt<=0) continue;
    var when=depXlsWhen(r[c.date], c.time>=0?r[c.time]:"");
    if(!when){ bad++; continue; }
    var wv=c.who>=0?r[c.who]:""; if(wv instanceof Date) wv="";
    out.push({tx_at:when, sender:String(wv).trim().slice(0,40)||"입금자미상", amount:amt});
  }
  return {rows:out, bad:bad};
}
function depXlsWhen(d,t){
  function p(x){ return (x<10?"0":"")+x; }
  if(d instanceof Date && !isNaN(d)){   /* 엑셀이 날짜로 읽은 칸 — 이 기기 시각 그대로 */
    var hh=d.getHours(), mi=d.getMinutes(), se=d.getSeconds(), tt=String(t instanceof Date?"":t||"").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(t instanceof Date){ hh=t.getHours(); mi=t.getMinutes(); se=t.getSeconds(); } else if(tt){ hh=+tt[1]; mi=+tt[2]; se=+(tt[3]||0); }
    if(d.getFullYear()<2000) return "";
    return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(hh)+":"+p(mi)+":"+p(se)+"+09:00"; }
  if(t instanceof Date) t=p(t.getHours())+":"+p(t.getMinutes())+":"+p(t.getSeconds());
  var s=String(d==null?"":d).trim(), m=s.match(/(\d{4})[.\-\/년\s]*(\d{1,2})[.\-\/월\s]*(\d{1,2})/) || s.match(/^(\d{4})(\d{2})(\d{2})/);
  if(!m){ var n=Number(s); if(n>30000 && n<80000){ var dt=new Date(Math.round((n-25569)*86400000)); m=[0,dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate()]; } else return ""; }
  var tm=(String(t||"")+" "+s).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  var y=+m[1], mo=+m[2], da=+m[3]; if(y<2000||mo<1||mo>12||da<1||da>31) return "";
  return y+"-"+p(mo)+"-"+p(da)+"T"+(tm?p(+tm[1])+":"+tm[2]+":"+(tm[3]||"00"):"00:00:00")+"+09:00";
}
function depXlsDraw(){
  var box=$("depXlsBox"); if(!box||!DEPX) return;
  var H=DEPX.head>=0?DEPX.rows[DEPX.head]:[], P=depXlsParse();
  function pick(k,label){ return '<label class="f">'+esc(label)+'<select data-dxc="'+k+'" style="width:100%">'+
    '<option value="-1">(없음)</option>'+H.map(function(h,j){ return '<option value="'+j+'"'+(DEPX.col[k]===j?' selected':'')+'>'+esc(String(h||"("+(j+1)+"번째 칸)"))+'</option>'; }).join("")+'</select></label>'; }
  var sum=P.rows.reduce(function(s,r){ return s+r.amount; },0);
  box.innerHTML = DEPX.head<0 ? '<div class="msg err">거래내역의 제목 줄(거래일 · 입금액 · 적요)을 찾지 못했어요. 은행에서 받은 원래 파일로 해 주세요.</div>' :
    '<div class="row2" style="margin-top:12px">'+pick("date","거래일")+pick("time","시간 (따로 있으면)")+pick("amt","입금액")+pick("who","보낸 분 (적요)")+'</div>'+
    '<p class="note" style="margin:10px 0">입금 <b>'+won(P.rows.length)+'</b>건 · 합계 <b>'+won(sum)+'</b>원'+(P.bad?' · 날짜를 못 읽은 줄 '+won(P.bad)+'개는 빼요':'')+' (출금 줄은 넣지 않아요)</p>'+
    '<div class="cgg-twrap"><table class="cgg-table"><thead><tr><th>거래 일시</th><th>보낸 분</th><th class="n">입금액</th></tr></thead><tbody>'+
      (P.rows.slice(0,10).map(function(r){ return '<tr><td>'+esc(r.tx_at.slice(0,16).replace("T"," "))+'</td><td>'+esc(r.sender)+'</td><td class="n">'+won(r.amount)+'</td></tr>'; }).join("")||
       '<tr><td colspan="3" class="cgg-empty">넣을 입금이 없어요. 위 칸을 바꿔 보세요.</td></tr>')+
    '</tbody></table></div>'+(P.rows.length>10?'<p class="note">앞의 10건만 보여 드려요.</p>':'')+
    '<div class="tools" style="margin-top:10px"><button class="btn primary" id="dxGo"'+(P.rows.length?'':' disabled')+'>'+won(P.rows.length)+'건 넣기</button><button class="btn" id="dxNo">취소</button></div>';
  Array.prototype.forEach.call(box.querySelectorAll("[data-dxc]"),function(s){ s.onchange=function(){ DEPX.col[s.getAttribute("data-dxc")]=Number(s.value); depXlsDraw(); }; });
  var no=$("dxNo"); if(no) no.onclick=function(){ DEPX=null; box.innerHTML=""; };
  var go=$("dxGo"); if(go) go.onclick=function(){
    if(P.rows.length>1000){ tell("한 번에 1,000건까지예요","기간을 나눠서 받은 파일로 해 주세요."); return; }
    ask({title:"입금 "+won(P.rows.length)+"건을 넣을까요?", k1:"합계", v1:won(sum)+"원", k2:"기간",
         v2:P.rows.length?(P.rows[P.rows.length-1].tx_at.slice(0,10)+" ~ "+P.rows[0].tx_at.slice(0,10)):"",
         warn:"같은 날 · 같은 금액 · 같은 이름의 입금은 한 번만 들어가요. 넣은 뒤 청구서와 자동으로 맞춰 봐요.", yes:"넣기"}, function(){
      busy(true);
      call("depositImport",[{rows:P.rows}]).then(function(r){
        busy(false); DEPX=null;
        bar("새로 넣은 입금 "+won((r&&r.got)||0)+"건"+((r&&r.dup)?" · 이미 있던 "+won(r.dup)+"건은 건너뜀":"")+((r&&r.bad&&r.bad.length)?" · 못 넣은 "+won(r.bad.length)+"건":""),"ok");
        refresh(["dep","bill"]);
      }).catch(function(e){ busy(false); fail({message:depSrv(e)}); });
    });
  };
}
'''
rep('''function wireSub(){''', DEP_JS + '''function wireSub(){''')

# ── 4) 거래처 부품 1.0 → 1.1 (대표님 v46 시험 10/18 — 사진으로 연락처 · 이메일 · 국세청 확인 · «번호 모양 맞음») ──
JS10 = open(BASE + "부품/거래처_부품.js", encoding="utf-8").read()
JS11 = open(BASE + "부품/거래처_부품_1.2.js", encoding="utf-8").read()   # 1.2: 보안 덧붙임 — 창을 열기만 해서는 묻지 않음
rep(JS10, JS11)
rep('''      readBiz:function(b64){ return call("aiBiz",[b64]); } },''',
    '''      /* v47: 서버 v37 aiBiz 는 개업일을 openDate(YYYYMMDD)로 줌 → 부품 모양 start(YYYY-MM-DD) */
      readBiz:function(b64){ return call("aiBiz",[b64]).then(function(r){ var o=r; if(typeof o==="string"){ try{ o=JSON.parse(o); }catch(e){ return r; } }
        if(o && typeof o==="object" && o.openDate && !o.start){ var d=String(o.openDate).replace(/\\D/g,""); if(d.length===8) o.start=d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6); }
        return o; }); },
      /* v47: 국세청 확인 — 서버 v37 bizVerify({bizNo, ceo, openDate}) → {ready, state, closedAt, match:true|false|null}
         부품 모양 {no, ceo, start} → {ready, state, since, match:{ceo, start}} 으로 이음 (보안 v47 덧붙임) */
      verifyBiz:function(q){ return call("bizVerify",[{bizNo:q.no, ceo:q.ceo||"", openDate:String(q.start||"").replace(/\\D/g,"")}]).then(function(r){
          r=r||{}; var mo=(r.match&&typeof r.match==="object")?r.match:null, m=(r.match===true||r.match===false)?r.match:null;   /* 서버 v38 두 모양 다 받음 */
          return {ready:r.ready!==false, state:r.state||"", since:r.since||r.closedAt||"",
                  match:mo?{ceo:mo.ceo, start:mo.start}:{ceo:m, start:m}}; })
        .catch(function(e){ if(/지원하지 않는 기능/.test(String(e&&e.message))) return {ready:false}; throw e; }); } },''')

rep('$("hdVer").textContent="체크 v46 · "', '$("hdVer").textContent="체크 v47 · "')
assert JS11 in s and JS10 not in s
assert "선택한 줄 입금 처리" not in s
open(BASE + "2_차곳간_체크_index_v47.html", "w", encoding="utf-8").write(s)
print("OK v47", len(s))
