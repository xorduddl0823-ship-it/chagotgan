/* 차곳간 거래처 부품 cpt 1.2 (체크 v47~ · 워시가 그대로 가져다 씀)
   1.2 (보안 v47 덧붙임 · 10/18): 창을 열기만 해서는 국세청에 묻지 않음 — 번호를 고치거나 사진으로 채울 때, 또는 «국세청에 확인» 단추를 누를 때만 (하루 한도 아끼기)
   1.1 (대표님 v46 시험 10/18): 사업자등록증 사진 → 연락처 · 이메일도 채우기 · 명함 → 이메일 · 국세청 확인(api.verifyBiz, 있으면)
       · 모양 검사 글은 «번호 모양 맞음»(진짜 확인과 헷갈리지 않게) · 휴업/폐업/없는 번호는 저장 전에 한 번 더 묻기
   시안: https://claude.ai/artifact/J6CqnRvhvefztsjWtqYH2Y
   제품은 «정리한 자료 + 창구 함수»만 넘겨요. 서버 모양은 제품 쪽 이음새(adapter)가 맞춰요.
   쓰는 공통 부품: CGG.dialog · CGG.closeDialog · CGG.toast · CGG.esc (cgg-j4 1.5 이상)

   CGG_PARTNER.mount(el, o)
   o = {
     state: {}                       제품의 전역 변수 하나 — 다시 그려도 보기 · 찾기 · 정렬 · 쪽 · 고른 줄이 남아요
     owner: true/false               넣기 · 고치기 · 지우기는 대표만 (직원은 보기만)
     dealers:  [{id,name,tel,compId,comp,tax:"co"|"own"|"none"|"later",biz:{name,no,ceo,addr,email,upte,jongmok},billTo,billToName,last}]
     companies:[{id,name,biz:{no,ceo,tel,addr,email,upte,jongmok},n}]
     caps: {later, more, last, billTo}  later=«나중에» 저장 가능 · more=주소·이메일·업태·종목 칸 · last=마지막 거래 칸 · billTo=«청구서 받는 사람» 칸
     api: { saveDealer(d, isNew) → Promise, saveCompany(c) → Promise<{id,name}>,
            delDealers(ids) → Promise<{n}>, delCompanies(ids) → Promise<{n,kept:[{id,name,dealerN}]}>,
            readCard(b64) → Promise<{name,phone,company,email,…}>, readBiz(b64) → Promise<{bizNo,bizName,ceo,addr,upte,jongmok,tel,email,start}>,
            verifyBiz({no,ceo,start}) → Promise<{ready, state:"계속"|"휴업"|"폐업"|"없음", since, match:{ceo,start}}>  (없으면 모양 검사만) }
     done(msg)                       저장 · 지우기가 끝나면 (제품이 자료를 다시 불러 다시 그림)
     fail(msg)                       서버 오류 글 (쉬운 말로 바꿔 보여 줌)
   } */
var CGG_PARTNER = (function(){
  var V="cpt 1.2";
  var VERIFY=null, VST={}, VSTART={}, VCACHE={}, WIRE_AUTO={};   /* WIRE_AUTO[pre]=true → 다음 wireBizNo 때 바로 물음(사진으로 채운 뒤) */   /* 1.1: 국세청 확인 — 창마다 새로 */
  function esc(s){ return (window.CGG&&CGG.esc) ? CGG.esc(s) : String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function dig(v){ return String(v==null?"":v).replace(/\D/g,""); }
  function bizOk(v){ var d=dig(v); if(d.length!==10) return false;
    var w=[1,3,7,1,3,7,1,3,5], s=0; for(var i=0;i<9;i++) s+=(+d[i])*w[i]; s+=Math.floor((+d[8])*5/10); return (10-s%10)%10===(+d[9]); }
  function bizFmt(v){ var d=dig(v).slice(0,10); return d.length>5?d.slice(0,3)+"-"+d.slice(3,5)+"-"+d.slice(5):d.length>3?d.slice(0,3)+"-"+d.slice(3):d; }
  function telFmt(v){ var d=dig(v); if(d.length===11) return d.slice(0,3)+"-"+d.slice(3,7)+"-"+d.slice(7);
    if(d.length===10) return d.slice(0,3)+"-"+d.slice(3,6)+"-"+d.slice(6); return String(v==null?"":v); }
  function telOk(v){ return /^01[016789]\d{7,8}$/.test(dig(v)); }
  function toast(t){ try{ CGG.toast(t); }catch(e){} }
  function $id(i){ return document.getElementById(i); }

  /* 딜러 한 명의 세금계산서 상태 — 계산서를 끊으려면 사업자번호(맞는 번호)가 있어야 해요 */
  function compOf(o, d){ for(var i=0;i<o.companies.length;i++) if(String(o.companies[i].id)===String(d.compId)) return o.companies[i]; return null; }
  function compFull(c){ return !!(c && bizOk(c.biz&&c.biz.no)); }
  function ownFull(b){ return !!(b && b.name && bizOk(b.no)); }
  function state(o, d){
    if(d.tax==="none") return {c:"no", t:"안 끊음"};
    if(d.tax==="own")  return ownFull(d.biz) ? {c:"ok", t:"본인 사업자"} : {c:"need", t:"정보 필요 · 본인"};
    if(d.tax==="co"){ var c=compOf(o,d);
      if(!c) return {c:"need", t:"정보 필요 · 상사 없음"};
      return compFull(c) ? {c:"ok", t:"상사로"} : {c:"need", t:"정보 필요 · 상사"}; }
    return {c:"need", t:"정보 필요"};
  }

  var BIZ_OWN=[["name","상호",1],["no","사업자등록번호",1],["ceo","대표자"],["addr","사업장 주소",0,"full"]];
  var BIZ_CO =[["no","사업자등록번호",1],["ceo","대표자"],["tel","연락처"]];
  var BIZ_MORE=[["email","계산서 받을 이메일"],["addr","사업장 주소",0,"full"],["upte","업태"],["jongmok","종목"]];

  function mount(el, o){
    if(!el) return;
    o.state=o.state||{}; var S=o.state;
    if(!S.view){ S.view="d"; S.q=""; S.k=""; S.dir=1; S.page=1; S.per=10; S.sel={}; S.need=false; }
    o.caps=o.caps||{}; o.dealers=o.dealers||[]; o.companies=o.companies||[];
    var isD=S.view==="d";
    /* 지금 없는 줄의 고른 표시는 빼요 (사라진 줄에 지우기가 가지 않게) */
    var live={}; (isD?o.dealers:o.companies).forEach(function(r){ live[String(r.id)]=1; });
    Object.keys(S.sel).forEach(function(k){ if(!live[k]) delete S.sel[k]; });

    var needD=o.dealers.filter(function(d){ return state(o,d).c==="need"; }).length;
    var needC=o.companies.filter(function(c){ return !compFull(c); }).length;
    var nNeed=isD?needD:needC;

    var cols=isD ? [["name","딜러"],["comp","상사"],["tel","휴대폰"],["tax","세금계산서"]]
                   .concat(o.caps.billTo?[["billToName","청구서 받는 사람"]]:[]).concat(o.caps.last?[["last","마지막 거래"]]:[])
                 : [["name","상사"],["no","사업자등록번호"],["ceo","대표자"],["n","딜러 수"],["ok","계산서 정보"]];
    var rows=isD ? o.dealers.map(function(d){ var s=state(o,d);
                     return {id:String(d.id), name:d.name, comp:d.comp||"", tel:d.tel||"", tax:s.t, _c:s.c, billToName:d.billToName||"", last:d.last||"", _d:d}; })
                 : o.companies.map(function(c){ var ok=compFull(c);
                     return {id:String(c.id), name:c.name, no:(c.biz&&c.biz.no)||"", ceo:(c.biz&&c.biz.ceo)||"", n:Number(c.n)||0, ok:ok?"다 있음":"정보 필요", _c:ok?"ok":"need", _co:c}; });
    var q=String(S.q||"").trim().toLowerCase();
    var all=rows.filter(function(r){
      if(S.need && r._c!=="need") return false;
      if(!q) return true;
      return [r.name, r.comp, r.tel, dig(r.tel), r.no, dig(r.no), r.ceo, r.billToName].join(" ").toLowerCase().indexOf(q)>=0; });
    if(S.k){ all.sort(function(a,b){ var x=a[S.k], y=b[S.k];
      if(typeof x==="number") return (x-y)*S.dir;
      return String(x==null?"":x).localeCompare(String(y==null?"":y),"ko")*S.dir; }); }
    else all.sort(function(a,b){ return String(a.name).localeCompare(String(b.name),"ko"); });
    if([5,10,20,30,50].indexOf(S.per)<0) S.per=10;
    var pages=Math.max(1,Math.ceil(all.length/S.per)); if(S.page>pages) S.page=pages; if(S.page<1) S.page=1;
    var part=all.slice((S.page-1)*S.per, S.page*S.per);
    var nSel=Object.keys(S.sel).filter(function(k){ return S.sel[k]; }).length;
    var allOn=part.length>0 && part.every(function(r){ return S.sel[r.id]; });
    var own=!!o.owner, hasPhoto=own && (isD?!!o.api.readCard:!!o.api.readBiz);

    var h='<div class="cpt" data-cpt="'+V+'">'+
      '<div class="cpt-top"><h3>'+(isD?"딜러":"매매상사")+' <span class="cpt-dim" style="font-size:14px;font-weight:500">'+(isD?o.dealers.length+"명":o.companies.length+"곳")+'</span></h3>'+
        '<div class="cpt-seg" role="group" aria-label="보기"><button type="button" data-cv="d" aria-pressed="'+isD+'">딜러</button><button type="button" data-cv="c" aria-pressed="'+(!isD)+'">상사</button></div></div>';
    if(nNeed || S.need) h+='<div class="cpt-alert">'+(S.need
        ? '<span>«정보 필요»만 보는 중이에요</span><button type="button" class="cgg-btn sm" data-cneed="0">전체 보기</button>'
        : '<span>계산서 정보가 빠진 '+(isD?'딜러':'상사')+' <b>'+nNeed+(isD?'명':'곳')+'</b></span><button type="button" class="cgg-btn sm" data-cneed="1">모아 보기</button>')+'</div>';
    h+='<div class="cpt-tools"><input type="search" class="cpt-q" data-cq="1" placeholder="'+(isD?"이름 · 상사 · 번호 찾기":"상사 · 사업자번호 · 대표자 찾기")+'" aria-label="찾기" value="'+esc(S.q)+'">'+
      (own?'<button type="button" class="cgg-btn pri" data-cadd="1">＋ '+(isD?"딜러":"상사")+' 추가</button>':'')+
      (hasPhoto?'<button type="button" class="cgg-btn" data-cphoto="1">'+(isD?"명함 사진으로 추가":"사업자등록증 사진으로 추가")+'</button>':'')+
      (own?'<button type="button" class="cgg-btn danger" data-cdel="1"'+(nSel?'':' disabled')+'>선택한 줄 지우기'+(nSel?' ('+nSel+')':'')+'</button>':'')+'</div>';
    h+='<div class="cpt-tbl"><table><thead><tr><th class="ck"><input type="checkbox" data-call="1" aria-label="이 쪽 모두 고르기"'+(allOn?' checked':'')+'></th>'+
      cols.map(function(c,i){ return '<th data-ck="'+c[0]+'"'+(i===0?' class="nm"':'')+' aria-sort="'+(S.k===c[0]?(S.dir>0?"ascending":"descending"):"none")+'">'+esc(c[1])+(S.k===c[0]?(S.dir>0?" ▲":" ▼"):" ↕")+'</th>'; }).join("")+'</tr></thead><tbody>';
    if(!part.length) h+='<tr><td class="em" colspan="'+(cols.length+1)+'">'+(q||S.need?"찾는 항목이 없어요.":(isD?"아직 딜러가 없어요.":"아직 매매상사가 없어요."))+'</td></tr>';
    part.forEach(function(r){
      h+='<tr data-id="'+esc(r.id)+'"><td class="ck"><input type="checkbox" data-cpk="'+esc(r.id)+'"'+(S.sel[r.id]?' checked':'')+' aria-label="'+esc(r.name)+' 고르기"></td>';
      cols.forEach(function(c,i){ var v=r[c[0]], t;
        if(c[0]==="tax"||c[0]==="ok") t='<span class="cpt-chip '+r._c+'">'+esc(v)+'</span>';
        else if(c[0]==="tel") t=v?esc(telFmt(v)):'<span class="cpt-bad">없음</span>';
        else if(c[0]==="no") t=v?esc(bizFmt(v)):'<span class="cpt-dim">—</span>';
        else if(c[0]==="n") t=esc(v)+'명';
        else if(c[0]==="billToName") t=v?esc(v):'<span class="cpt-dim">본인</span>';
        else if(c[0]==="last") t=v?esc(v):'<span class="cpt-dim">거래 없음</span>';
        else t=v?esc(v):'<span class="cpt-dim">—</span>';
        h+='<td'+(i===0?' class="nm"':'')+'>'+t+'</td>'; });
      h+='</tr>'; });
    h+='</tbody></table></div>'+
      '<div class="cpt-pager"><span>전체 '+all.length+(isD?'명':'곳')+' · '+S.page+' / '+pages+'쪽</span><span class="b">'+
      '<select class="cpt-per" data-cper="1" aria-label="한 번에 보일 개수">'+[5,10,20,30,50].map(function(n){ return '<option value="'+n+'"'+(S.per===n?' selected':'')+'>'+n+'개씩 보기</option>'; }).join("")+'</select>'+
      '<button type="button" class="cgg-btn" data-cpg="'+(S.page-1)+'"'+(S.page<=1?' disabled':'')+'>이전</button>'+
      '<button type="button" class="cgg-btn" data-cpg="'+(S.page+1)+'"'+(S.page>=pages?' disabled':'')+'>다음</button></span></div>'+
      (own?'':'<p class="cpt-note">딜러 · 매매상사를 넣고 고치고 지우는 것은 대표만 할 수 있어요. 줄을 누르면 내용을 볼 수 있어요.</p>')+
      '</div>';
    el.innerHTML=h;

    function redraw(){ mount(el,o); }
    function on(sel, ev, fn){ Array.prototype.forEach.call(el.querySelectorAll(sel), function(x){ x["on"+ev]=fn; }); }
    on("[data-cv]","click",function(){ var v=this.getAttribute("data-cv"); if(v===S.view) return;
      S.view=v; S.k=""; S.dir=1; S.page=1; S.sel={}; S.need=false; redraw(); });
    on("[data-cneed]","click",function(){ S.need=this.getAttribute("data-cneed")==="1"; S.page=1; redraw(); });
    var qt=null;
    on("[data-cq]","input",function(){ var me=this; clearTimeout(qt); qt=setTimeout(function(){ S.q=me.value; S.page=1; redraw();
      var e=el.querySelector("[data-cq]"); if(e){ e.focus(); try{ e.setSelectionRange(e.value.length,e.value.length); }catch(x){} } },200); });
    on("[data-cper]","change",function(){ S.per=Number(this.value)||10; S.page=1; redraw(); });
    on("[data-cpg]","click",function(){ S.page=Number(this.getAttribute("data-cpg"))||1; redraw(); });
    on("th[data-ck]","click",function(){ var k=this.getAttribute("data-ck"); if(S.k===k) S.dir=-S.dir; else { S.k=k; S.dir=1; } redraw(); });
    on("[data-cpk]","click",function(e){ e.stopPropagation(); });
    on("[data-cpk]","change",function(){ var k=this.getAttribute("data-cpk"); if(this.checked) S.sel[k]=true; else delete S.sel[k]; redraw(); });
    on("[data-call]","change",function(){ var c=this.checked; part.forEach(function(r){ if(c) S.sel[r.id]=true; else delete S.sel[r.id]; }); redraw(); });
    on("tbody tr[data-id]","click",function(){ var id=this.getAttribute("data-id");
      if(isD){ var d=o.dealers.filter(function(x){ return String(x.id)===id; })[0]; if(d) dealerPop(o,d); }
      else { var c=o.companies.filter(function(x){ return String(x.id)===id; })[0]; if(c) companyPop(o,c); } });
    on("[data-cadd]","click",function(){ isD ? dealerPop(o,null) : companyPop(o,null); });
    on("[data-cphoto]","click",function(){ pickPhoto(function(b64){
      if(isD) dealerPop(o,null,{photo:b64}); else companyPop(o,null,{photo:b64}); }); });
    on("[data-cdel]","click",function(){ delPicked(o, isD); });
  }

  /* ── 사진 고르기 → 긴 변 1600px 안팎 JPEG 로 줄여 data: 앞부분을 뗀 글자 ── */
  function pickPhoto(done){
    var i=document.createElement("input"); i.type="file"; i.accept="image/*";
    i.onchange=function(){ var f=i.files&&i.files[0]; if(!f) return; shrink(f, done); };
    i.click();
  }
  function shrink(file, done){
    var rd=new FileReader();
    rd.onerror=function(){ toast("사진을 열지 못했어요. 다른 사진으로 해 주세요."); };
    rd.onload=function(){ var img=new Image();
      img.onerror=function(){ toast("사진을 열지 못했어요. 다른 사진으로 해 주세요."); };
      img.onload=function(){ var M=1600, w=img.naturalWidth, h=img.naturalHeight, r=Math.min(1, M/Math.max(w,h));
        var cv=document.createElement("canvas"); cv.width=Math.round(w*r); cv.height=Math.round(h*r);
        cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
        var u=cv.toDataURL("image/jpeg",0.85); done(u.slice(u.indexOf(",")+1)); };
      img.src=rd.result; };
    rd.readAsDataURL(file);
  }
  function readPhoto(fn, b64, fill){
    toast("사진을 읽는 중이에요…");
    Promise.resolve().then(function(){ return fn(b64); }).then(function(r){
      if(typeof r==="string"){ try{ r=JSON.parse(r); }catch(e){ r=null; } }
      if(!r || typeof r!=="object") throw new Error("x");
      var n=fill(r); toast(n ? "사진에서 읽은 값을 채웠어요. 맞는지 보고 저장해 주세요." : "사진에서 읽은 글자가 없어요. 직접 적어 주세요.");
    }).catch(function(){ toast("사진을 읽지 못했어요. 직접 적어 주세요."); });
  }
  /* 빈 칸만 채워요 (사람이 쓴 값은 그대로) */
  function fillEmpty(pairs){ var n=0;
    pairs.forEach(function(p){ var e=$id(p[0]), v=String(p[1]==null?"":p[1]).trim(); if(e && !e.disabled && !String(e.value||"").trim() && v){ e.value=v; n++; } });
    return n; }

  function fieldsHtml(pre, defs, b, dis){
    return '<div class="cpt-g2">'+defs.map(function(f){ var v=b?b[f[0]]:"";
      if(f[0]==="no") v=bizFmt(v);
      return '<label class="l'+(f[3]?' full':'')+'">'+esc(f[1])+'<input type="text" id="'+pre+f[0]+'" value="'+esc(v||"")+'"'+
        (f[0]==="no"?' inputmode="numeric" placeholder="000-00-00000" maxlength="12"':' maxlength="'+(f[0]==="addr"?120:f[0]==="email"?80:40)+'"')+
        (f[0]==="tel"?' inputmode="tel"':'')+(dis?' disabled':'')+'></label>'; }).join("")+'</div>'+
      '<div class="cpt-msg" id="'+pre+'chk"></div>';
  }
  function wireBizNo(pre){
    var bn=$id(pre+"no"); if(!bn) return; var t=null;
    function put(text, cls){ var m=$id(pre+"chk"); if(!m) return; m.textContent=text; m.className="cpt-msg"+(cls?" "+cls:""); }
    function ceoVal(){ var e=$id(pre+"ceo"); return e?String(e.value||"").trim():""; }
    function show(r){ VST[pre]=r;
      if(!r || r.ready===false){ put("번호 모양 맞음","ok"); return; }
      var st=String(r.state||""), mm=r.match||{}, diff=[mm.ceo===false?"대표자":"", mm.start===false?"개업일":""].filter(Boolean).join(" · ");
      if(st==="계속") put("국세청 확인: 영업 중"+(diff?" — 국세청 등록과 "+diff+(/일$/.test(diff)?"이":"가")+" 달라요":""), diff?"bad":"ok");
      else if(st==="휴업") put("휴업 중이에요"+(r.since?" ("+r.since+")":""),"bad");
      else if(st==="폐업") put("폐업한 번호예요"+(r.since?" ("+r.since+")":""),"bad");
      else if(st==="없음") put("국세청에 등록되지 않은 번호예요","bad");
      else put("번호 모양 맞음","ok"); }
    function ask(d){
      put("번호 모양 맞음 · 국세청에 확인하는 중…","ok"); var key=d+"|"+ceoVal()+"|"+(VSTART[pre]||"");
      Promise.resolve().then(function(){ return VERIFY({no:d, ceo:ceoVal(), start:VSTART[pre]||""}); }).then(function(r){
        if(dig(bn.value)!==d) return; if(r && r.ready!==false) VCACHE[key]=r; show(r);
      }).catch(function(){ if(dig(bn.value)===d) put("번호 모양 맞음 (국세청 확인은 잠시 뒤 다시 해 볼게요)","ok"); }); }
    /* 모양만 맞고 아직 묻지 않았을 때 — «국세청에 확인» 단추 (누를 때만 물음) */
    function askBtn(d){ var m=$id(pre+"chk"); if(!m || !VERIFY || bn.disabled) return;
      var b=document.createElement("button"); b.type="button"; b.className="cgg-btn sm"; b.style.marginLeft="8px"; b.textContent="국세청에 확인";
      b.onclick=function(){ ask(d); }; m.appendChild(b); }
    function chk(auto){ bn.value=bizFmt(bn.value); var d=dig(bn.value); VST[pre]=null;
      if(!d){ put("",""); return; }
      if(!bizOk(d)){ put("사업자번호가 맞지 않아요. 다시 봐 주세요.","bad"); return; }
      var key=d+"|"+ceoVal()+"|"+(VSTART[pre]||"");
      if(VCACHE[key]){ show(VCACHE[key]); return; }
      put("번호 모양 맞음","ok");
      if(!VERIFY) return;
      if(auto===false){ askBtn(d); return; }
      clearTimeout(t); t=setTimeout(function(){ ask(d); }, 600); }
    bn.oninput=function(){ chk(true); }; var ce=$id(pre+"ceo"); if(ce) ce.onchange=function(){ if(VST[pre]) chk(true); };
    chk(WIRE_AUTO[pre]===true); WIRE_AUTO[pre]=false;
  }
  /* 1.1: 휴업 · 폐업 · 없는 번호면 저장 전에 한 번 더 (막지는 않음) */
  function closedWarn(pres){ for(var i=0;i<pres.length;i++){ var r=VST[pres[i]]; if(!r||r.ready===false||!$id(pres[i]+"no")) continue;
      if(r.state==="휴업") return "휴업 중인 사업자번호예요."; if(r.state==="폐업") return "폐업한 사업자번호예요."; if(r.state==="없음") return "국세청에 등록되지 않은 사업자번호예요."; }
    return ""; }
  function popStart(o){ VERIFY=(o.api&&o.api.verifyBiz)||null; VST={}; VSTART={}; WIRE_AUTO={}; }
  function readFields(pre, defs){ var r={}; defs.forEach(function(f){ var e=$id(pre+f[0]); if(e) r[f[0]]=String(e.value||"").trim(); });
    if(r.no!=null) r.no=dig(r.no); if(r.tel!=null) r.tel=dig(r.tel); return r; }
  function bizMsg(pre){ var e=$id(pre+"no"); if(e && dig(e.value) && !bizOk(e.value)) return "사업자등록번호가 맞지 않아요. 다시 봐 주세요."; return ""; }
  function showErr(t){ var b=$id("cptErr"); if(b){ b.hidden=!t; b.textContent=t||""; if(t) b.scrollIntoView({block:"nearest"}); } }
  function closeD(){ try{ CGG.closeDialog(); }catch(e){} }

  /* ── 딜러 창: 넣기 · 고치기 한 곳 ── */
  function dealerPop(o, d, opt){
    opt=opt||{}; var isNew=!d, own=!!o.owner, dis=!own, warned=false; popStart(o);
    d=d||{id:"",name:"",tel:"",compId:"",comp:"",tax:o.caps.later?"later":"co",biz:{},billTo:""};
    var b=d.biz||{}, extra=o.caps.more?BIZ_MORE.filter(function(f){ return f[0]!=="addr"; }):[];
    var ownDefs=BIZ_OWN.concat(extra), coDefs=BIZ_CO.concat(o.caps.more?BIZ_MORE:[]);
    var comps=o.companies.slice().sort(function(a,c){ return String(a.name).localeCompare(String(c.name),"ko"); });
    var others=o.dealers.filter(function(x){ return String(x.id)!==String(d.id); }).sort(function(a,c){ return String(a.name).localeCompare(String(c.name),"ko"); });
    var T=[["co","상사 이름으로"],["own","딜러 본인 사업자로"],["none","안 끊어요"]].concat(o.caps.later||d.tax==="later"?[["later","나중에 정할게요"]]:[]);
    var body='<div class="cpt-f">'+
      (own && o.api.readCard?'<button type="button" class="cgg-btn sm cpt-sm" id="cpCard">명함 사진으로 채우기</button>':'')+
      '<div class="cpt-g2">'+
        '<label class="l">상사<input type="text" id="cpCo" list="cpCos" value="'+esc(d.comp||"")+'" maxlength="40" autocomplete="off" placeholder="접수리스트의 회사명과 똑같이"'+(dis?' disabled':'')+'></label>'+
        '<label class="l">딜러 이름<input type="text" id="cpName" value="'+esc(d.name||"")+'" maxlength="20" autocomplete="off" placeholder="접수리스트의 신청인과 똑같이"'+(dis?' disabled':'')+'></label>'+
        '<label class="l full">휴대폰<input type="tel" id="cpTel" inputmode="tel" maxlength="15" placeholder="010-0000-0000" value="'+esc(d.tel?telFmt(d.tel):"")+'"'+(dis?' disabled':'')+'></label>'+
      '</div>'+
      '<datalist id="cpCos">'+comps.map(function(c){ return '<option value="'+esc(c.name)+'">'; }).join("")+'</datalist>'+
      '<div class="cpt-msg ok" id="cpNewCo" hidden>처음 보는 상사예요. 저장하면 같이 만들어져요.</div>'+
      '<h4>세금계산서는 누구 이름으로?</h4>'+
      '<div class="cpt-radios" role="radiogroup" aria-label="세금계산서">'+T.map(function(t){
        return '<label><input type="radio" name="cpTax" value="'+t[0]+'"'+(d.tax===t[0]?' checked':'')+(dis?' disabled':'')+'> '+esc(t[1])+'</label>'; }).join("")+'</div>'+
      '<div id="cpTaxBox"></div>'+
      (o.caps.billTo?'<h4>청구서 받는 사람</h4><label class="l">이 딜러 차 청구서를 누구 앞으로 합칠까요?<select id="cpBill"'+(dis?' disabled':'')+'>'+
        '<option value="">본인 (따로 청구)</option>'+others.map(function(x){ return '<option value="'+esc(x.id)+'"'+(String(d.billTo)===String(x.id)?' selected':'')+'>'+esc(x.name)+(x.comp?' · '+esc(x.comp):'')+'</option>'; }).join("")+
        '</select></label><p class="cpt-note">고른 사람 앞으로 한 장에 합쳐서 청구해요. 이번 달만 바꾸는 것은 «청구서 › 청구처 묶음»에서 해요.</p>':'')+
      '<div class="cpt-err" id="cptErr" hidden></div>'+
      (own && !isNew?'<button type="button" class="cgg-btn sm danger cpt-sm" id="cpDel">이 딜러 지우기</button>':'')+
    '</div>';
    CGG.dialog({size:"form", title:isNew?"딜러 추가":d.name+" 딜러", desc:isNew?"세 칸만 넣으면 돼요. 휴대폰 번호가 있어야 차량 도착 알림이 가요.":"",
      body:body, ok:own?"저장":"", cancel:"닫기", onOk:function(){ save(); return false; }});
    var coIn=$id("cpCo");
    function curComp(){ var n=String(coIn.value||"").trim(); for(var i=0;i<o.companies.length;i++) if(o.companies[i].name===n) return o.companies[i]; return null; }
    function taxBox(){
      var r=document.querySelector("input[name=cpTax]:checked"), v=r?r.value:"", n=String(coIn.value||"").trim(), c=curComp(), box=$id("cpTaxBox");
      var nb=$id("cpNewCo"); if(nb) nb.hidden=!own || !n || !!c;
      if(v==="own"){
        box.innerHTML='<div class="cpt-box"><b class="t">본인 사업자 정보</b>'+fieldsHtml("cpo_",ownDefs,b,dis)+
          (own && o.api.readBiz?'<button type="button" class="cgg-btn sm cpt-sm" id="cpoPhoto">사업자등록증 사진으로 채우기</button>':'')+'</div>';
        wireBizNo("cpo_");
        var p=$id("cpoPhoto"); if(p) p.onclick=function(){ pickPhoto(function(x){ readPhoto(o.api.readBiz, x, function(r){
          if(r.start) VSTART.cpo_=String(r.start); var k=fillEmpty([["cpo_name",r.bizName],["cpo_no",r.bizNo],["cpo_ceo",r.ceo],["cpo_addr",r.addr],["cpo_upte",r.upte],["cpo_jongmok",r.jongmok],["cpo_email",r.email]]); WIRE_AUTO.cpo_=true; wireBizNo("cpo_"); return k; }); }); };
        return; }
      if(v==="co"){
        if(!n){ box.innerHTML='<p class="cpt-note">상사를 먼저 넣어 주세요.</p>'; return; }
        if(compFull(c)){ box.innerHTML='<div class="cpt-box"><span class="cpt-msg ok">'+esc(n)+' 사업자 정보가 있어요 — '+esc(bizFmt(c.biz.no))+(c.biz.ceo?' · '+esc(c.biz.ceo):'')+'</span></div>'; return; }
        var cb=(c&&c.biz)||{};
        box.innerHTML='<div class="cpt-box"><b class="t">'+esc(n)+' 사업자 정보 <span class="cpt-msg bad">비어 있어요</span></b>'+
          '<p class="cpt-note">여기서 한 번 넣으면 이 상사 딜러 모두에게 쓰여요.</p>'+fieldsHtml("cpc_",coDefs,cb,dis)+
          (own && o.api.readBiz?'<button type="button" class="cgg-btn sm cpt-sm" id="cpcPhoto">사업자등록증 사진으로 채우기</button>':'')+'</div>';
        wireBizNo("cpc_");
        var q=$id("cpcPhoto"); if(q) q.onclick=function(){ pickPhoto(function(x){ readPhoto(o.api.readBiz, x, function(r){
          if(r.start) VSTART.cpc_=String(r.start); var k=fillEmpty([["cpc_no",r.bizNo],["cpc_ceo",r.ceo],["cpc_tel",r.tel],["cpc_addr",r.addr],["cpc_upte",r.upte],["cpc_jongmok",r.jongmok],["cpc_email",r.email]]); WIRE_AUTO.cpc_=true; wireBizNo("cpc_"); return k; }); }); };
        return; }
      box.innerHTML = v==="none" ? '<p class="cpt-note">세금계산서를 끊지 않아요. 청구서에 «계산서 미발급»으로 나와요.</p>'
                                 : '<p class="cpt-note">표에 «정보 필요»로 남고, 위에 모아서 알려 드려요.</p>';
    }
    Array.prototype.forEach.call(document.querySelectorAll("input[name=cpTax]"), function(r){ r.onchange=taxBox; });
    coIn.oninput=taxBox; taxBox();
    var cc=$id("cpCard");
    function fromCard(x){ readPhoto(o.api.readCard, x, function(r){
      var k=fillEmpty([["cpName",r.name],["cpCo",r.company||r.bizName],["cpTel",r.phone?telFmt(r.phone):""]]); taxBox(); k+=fillEmpty([["cpo_email",r.email],["cpc_email",r.email]]); return k; }); }
    if(cc) cc.onclick=function(){ pickPhoto(fromCard); };
    if(opt.photo) fromCard(opt.photo);
    var del=$id("cpDel"); if(del) del.onclick=function(){ closeD(); askDel(o, true, [d]); };

    function save(){
      if(!own) return;
      var name=String($id("cpName").value||"").trim(), tel=dig($id("cpTel").value), n=String(coIn.value||"").trim();
      var r=document.querySelector("input[name=cpTax]:checked"), tax=r?r.value:d.tax;
      if(!name) return showErr("딜러 이름을 넣어 주세요.");
      if(tel && !telOk(tel)) return showErr("휴대폰 번호를 010으로 시작하는 10~11자리로 넣어 주세요.");
      if(isNew && !tel) return showErr("휴대폰 번호를 넣어 주세요. 이 번호로 차량 도착 알림이 가요.");
      if(isNew && o.dealers.some(function(x){ return x.name===name && dig(x.tel)===tel; })) return showErr("같은 이름 · 같은 번호의 딜러가 이미 있어요.");
      if(tax==="co" && !n) return showErr("«상사 이름으로»를 고르셨어요. 상사를 넣어 주세요.");
      var e=bizMsg("cpo_")||bizMsg("cpc_"); if(e) return showErr(e);
      var cw=closedWarn([tax==="own"?"cpo_":"", tax==="co"?"cpc_":""].filter(Boolean)); if(cw && !warned){ warned=true; return showErr(cw+" 그래도 저장하려면 «저장»을 한 번 더 눌러 주세요."); }
      var c=curComp(), nd={id:d.id, name:name, tel:tel, tax:tax, biz:d.biz||{}, billTo:"", comp:n, compId:c?c.id:""};
      if(tax==="own" && $id("cpo_no")) nd.biz=readFields("cpo_", ownDefs);
      var bl=$id("cpBill"); nd.billTo = bl ? bl.value : (d.billTo||"");
      var coBody=null;
      if(n && !c) coBody={name:n};                                         // 처음 보는 상사 → 같이 만들기
      if($id("cpc_no")){ var cb=readFields("cpc_", coDefs);
        if(cb.no || cb.ceo || cb.tel || cb.addr || cb.email || cb.upte || cb.jongmok){ coBody=coBody||{id:c.id, name:c.name, _old:c}; for(var k in cb) coBody[k]=cb[k]; } }
      showErr(""); var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
      var newCo=coBody && !coBody.id;
      Promise.resolve(coBody ? o.api.saveCompany(coBody) : null).then(function(cr){
        if(cr && cr.id) nd.compId=String(cr.id);
        if(!n) nd.compId="";
        return o.api.saveDealer(nd, isNew, d);
      }).then(function(){
        closeD(); o.done && o.done(name+" 딜러를 저장했어요."+(newCo?" 새 상사 «"+n+"»도 만들었어요.":""));
      }).catch(function(er){ if(okb) okb.disabled=false; showErr(o.fail ? o.fail(er) : String((er&&er.message)||"저장하지 못했어요. 다시 시도해 주세요.")); });
    }
  }

  /* ── 상사 창: 사업자 정보 + 소속 딜러 ── */
  function companyPop(o, c, opt){
    opt=opt||{}; var isNew=!c, own=!!o.owner, dis=!own, warned=false; popStart(o);
    c=c||{id:"",name:"",biz:{},n:0};
    var defs=BIZ_CO.concat(o.caps.more?BIZ_MORE:[]);
    var ds=isNew?[]:o.dealers.filter(function(d){ return String(d.compId)===String(c.id); });
    var body='<div class="cpt-f">'+
      (own && o.api.readBiz?'<button type="button" class="cgg-btn sm cpt-sm" id="ckPhoto">사업자등록증 사진으로 채우기</button>':'')+
      '<label class="l">상사 이름 (접수리스트의 회사명과 똑같이)<input type="text" id="ckName" maxlength="40" value="'+esc(c.name||"")+'"'+(dis?' disabled':'')+'></label>'+
      '<h4>사업자 정보 (세금계산서용)</h4>'+fieldsHtml("ck_",defs,c.biz||{},dis)+
      (isNew?'':'<h4>소속 딜러 '+ds.length+'명</h4><p class="cpt-note">'+(ds.map(function(d){ return esc(d.name); }).join(" · ")||"아직 없어요")+'</p>')+
      '<div class="cpt-err" id="cptErr" hidden></div>'+
      (own && !isNew?'<button type="button" class="cgg-btn sm danger cpt-sm" id="ckDel">이 상사 지우기</button>':'')+
    '</div>';
    CGG.dialog({size:"form", title:isNew?"매매상사 추가":c.name, desc:isNew?"사업자등록번호가 있어야 상사 이름으로 세금계산서를 끊을 수 있어요.":"",
      body:body, ok:own?"저장":"", cancel:"닫기", onOk:function(){ save(); return false; }});
    wireBizNo("ck_");
    function fromBiz(x){ readPhoto(o.api.readBiz, x, function(r){
      if(r.start) VSTART.ck_=String(r.start); var k=fillEmpty([["ckName",r.bizName],["ck_no",r.bizNo],["ck_ceo",r.ceo],["ck_tel",r.tel],["ck_addr",r.addr],["ck_upte",r.upte],["ck_jongmok",r.jongmok],["ck_email",r.email]]); WIRE_AUTO.ck_=true; wireBizNo("ck_"); return k; }); }
    var p=$id("ckPhoto"); if(p) p.onclick=function(){ pickPhoto(fromBiz); };
    if(opt.photo) fromBiz(opt.photo);
    var del=$id("ckDel"); if(del) del.onclick=function(){ closeD(); askDel(o, false, [c]); };
    function save(){
      if(!own) return;
      var name=String($id("ckName").value||"").trim();
      if(!name) return showErr("상사 이름을 넣어 주세요.");
      if(isNew && o.companies.some(function(x){ return x.name===name; })) return showErr("같은 이름의 상사가 이미 있어요.");
      if(!isNew && name!==c.name && o.companies.some(function(x){ return x.name===name; })) return showErr("같은 이름의 상사가 이미 있어요.");
      var e=bizMsg("ck_"); if(e) return showErr(e);
      var cw=closedWarn(["ck_"]); if(cw && !warned){ warned=true; return showErr(cw+" 그래도 저장하려면 «저장»을 한 번 더 눌러 주세요."); }
      var nb=readFields("ck_", defs); nb.name=name; if(!isNew){ nb.id=c.id; nb._old=c; }
      showErr(""); var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
      Promise.resolve(o.api.saveCompany(nb)).then(function(){ closeD(); o.done && o.done(name+" 상사를 저장했어요."); })
        .catch(function(er){ if(okb) okb.disabled=false; showErr(o.fail ? o.fail(er) : String((er&&er.message)||"저장하지 못했어요. 다시 시도해 주세요.")); });
    }
  }

  /* ── 지우기: 고른 줄 이름을 다 보여 주고 한 번 더 묻기 (1.5 규칙 ②) ── */
  function delPicked(o, isD){
    var S=o.state, ids=Object.keys(S.sel).filter(function(k){ return S.sel[k]; });
    if(!ids.length){ toast("먼저 지울 줄을 골라 주세요."); return; }
    var list=(isD?o.dealers:o.companies).filter(function(r){ return ids.indexOf(String(r.id))>=0; });
    askDel(o, isD, list);
  }
  function askDel(o, isD, list){
    if(!list.length) return;
    var ids=list.map(function(r){ return String(r.id); });
    var busy=isD?[]:list.filter(function(c){ return Number(c.n)>0; });
    var warn = isD ? "지운 딜러에게는 차량 도착 알림이 더 이상 가지 않아요. 지난 청구서 · 배달 기록은 그대로 남아요."
                   : (busy.length ? "소속 딜러가 있는 상사 "+busy.length+"곳은 지워지지 않아요. 딜러를 먼저 다른 상사로 옮기거나 지워 주세요." : "지난 청구서는 상사 이름을 따로 갖고 있어 그대로 남아요.");
    CGG.dialog({size:"confirm", title:(isD?"딜러 ":"매매상사 ")+list.length+(isD?"명":"곳")+"을 지울까요?", desc:warn,
      rows:list.slice(0,30).map(function(r){ return [r.name, isD?(r.comp||""):(Number(r.n)?"소속 딜러 "+r.n+"명":"")]; }).concat(list.length>30?[["…","외 "+(list.length-30)+(isD?"명":"곳")]]:[]),
      body:'<div class="cpt-err" id="cptErr" hidden></div>', ok:"지우기", cancel:"아니요",
      onOk:function(){ var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
        Promise.resolve(isD ? o.api.delDealers(ids) : o.api.delCompanies(ids)).then(function(r){
          ids.forEach(function(k){ delete o.state.sel[k]; }); closeD();
          var n=(r&&r.n!=null)?r.n:ids.length, kept=(r&&r.kept)||[];
          o.done && o.done(n+(isD?"명":"곳")+"을 지웠어요."+(kept.length?" 소속 딜러가 있는 "+kept.length+"곳은 남겼어요.":""));
        }).catch(function(er){ if(okb) okb.disabled=false; showErr(o.fail ? o.fail(er) : "지우지 못했어요. 다시 시도해 주세요."); });
        return false; }});
  }

  return { mount:mount, state:state, bizOk:bizOk, bizFmt:bizFmt, telFmt:telFmt, version:V };
})();
