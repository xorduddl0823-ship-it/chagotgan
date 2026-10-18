/* 차곳간 엑셀(CSV) 한꺼번에 올리기 부품 csvup 1.0 (워시 v133~ · 체크도 같은 부품을 그대로 가져다 씀)
   대표님 10/18: 브라더광택이 거래처(상사 · 딜러) · 배달 장소를 양식 파일에 적어 직접 한 번에 올려요.
   순서: [엑셀 양식 받기] → 엑셀에서 적고 저장 → [엑셀로 한꺼번에 올리기] → 미리보기(몇 줄 · 새로 · 이미 있음 · 틀린 줄과 까닭) → [N건 넣기]
   · 글자: UTF-8(BOM 있어도 없어도) → 안 되면 EUC-KR(엑셀 «CSV(쉼표로 분리)» 저장) 로 읽어요
   · 첫 줄 = 칸 이름(괄호 안 설명 · 띄어쓰기는 무시), 양식의 예시 줄(둘째 줄)을 그대로 두면 건너뛰어요
   · 이미 있는 것은 고치지 않고 건너뛰어요(새로 넣기만) — 고치기 · 지우기는 거래처 화면에서
   · 서버에 따로 창구가 없어도 돼요: 제품이 주는 저장 함수(거래처 부품 cpt 와 같은 api)를 줄마다 불러요
   쓰는 공통 부품: CGG.dialog · CGG.closeDialog · CGG.toast · CGG.esc (cgg-j4 1.5 이상)

   CGG_CSVUP.partners(o)   거래처
     o = { owner, tplText(양식 파일 글자), dealers, companies   ← 거래처 부품 cpt 와 같은 모양
           later:true/false(«나중에» 저장 가능 · 없으면 상사 있으면 «상사 이름으로», 없으면 «안 끊음»),
           api:{ saveCompany({name,no,ceo,email}) → Promise, saveDealer({name,tel,comp,tax,biz}, true) → Promise },
           done(msg), fail(err) → 쉬운 말 }
   CGG_CSVUP.places(o)     배달 장소
     o = { owner, tplText, places:[{name,addr,phone,memo}], api:{ savePlaces([{name,addr,phone,memo}]) → Promise }, done, fail }
   CGG_CSVUP.download(name, text)  양식 받기(BOM 붙여서) */
var CGG_CSVUP = (function(){
  var V="csvup 1.0", MAXB=2*1024*1024, MAXR=3000, SHOW=300;
  function esc(s){ return (window.CGG&&CGG.esc) ? CGG.esc(s) : String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function dig(v){ return String(v==null?"":v).replace(/\D/g,""); }
  function toast(t){ try{ CGG.toast(t); }catch(e){} }
  function $id(i){ return document.getElementById(i); }
  function closeD(){ try{ CGG.closeDialog(); }catch(e){} }
  function bizOk(v){ var d=dig(v); if(d.length!==10 || /^0+$/.test(d)) return false;
    var w=[1,3,7,1,3,7,1,3,5], s=0; for(var i=0;i<9;i++) s+=(+d[i])*w[i]; s+=Math.floor((+d[8])*5/10); return (10-s%10)%10===(+d[9]); }
  function telOk(v){ return /^01[016789]\d{7,8}$/.test(dig(v)); }
  function emailOk(v){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }
  function key(s){ return String(s==null?"":s).replace(/\s+/g,"").toLowerCase(); }

  /* ── 파일 글자 읽기 · 나누기 ── */
  function decode(buf){ var u=new Uint8Array(buf), t;
    try{ t=new TextDecoder("utf-8",{fatal:true}).decode(u); }
    catch(e){ try{ t=new TextDecoder("euc-kr").decode(u); }catch(e2){ t=new TextDecoder("utf-8").decode(u); } }
    return t.replace(/^﻿/,""); }
  function parse(text){
    var first=String(text).split("\n")[0]||"", d=(first.indexOf("\t")>=0 && first.indexOf(",")<0)?"\t":",";
    var rows=[], row=[], f="", q=false, i, c;
    for(i=0;i<text.length;i++){ c=text[i];
      if(q){ if(c==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; continue; }
      if(c==='"' && f.trim()===""){ q=true; f=""; continue; }
      if(c===d){ row.push(f); f=""; continue; }
      if(c==="\r") continue;
      if(c==="\n"){ row.push(f); rows.push(row); row=[]; f=""; if(rows.length>MAXR+2) break; continue; }
      f+=c; }
    if(f!=="" || row.length){ row.push(f); rows.push(row); }
    return rows; }
  function hkey(s){ return String(s==null?"":s).replace(/\(.*?\)|\[.*?\]/g,"").replace(/[\s*·:]/g,"").toLowerCase(); }
  /* 칸 이름 → 칸 번호. cols=[{k, label, alias:[]}] */
  function mapHead(head, cols){
    var at={}, miss=[];
    cols.forEach(function(c){ var names=[c.label].concat(c.alias||[]).map(hkey);
      for(var i=0;i<head.length;i++) if(names.indexOf(hkey(head[i]))>=0){ at[c.k]=i; break; }
      if(at[c.k]==null && c.req) miss.push(c.label); });
    return {at:at, miss:miss}; }
  function cellsOf(row, at, cols){ var o={}; cols.forEach(function(c){ var i=at[c.k]; o[c.k]=i==null?"":String(row[i]==null?"":row[i]).trim().slice(0,c.max||100); }); return o; }
  function sameRow(a, b, cols){ return !!b && cols.every(function(c){ return key(a[c.k])===key(b[c.k]); }); }

  function download(name, text){
    var t=String(text||""); if(t.charAt(0)!=="﻿") t="﻿"+t;
    var a=document.createElement("a"), u=URL.createObjectURL(new Blob([t],{type:"text/csv;charset=utf-8"}));
    a.href=u; a.download=name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },1500); }

  function pickFile(done){
    var i=document.createElement("input"); i.type="file"; i.accept=".csv,.txt,text/csv";
    i.onchange=function(){ var f=i.files&&i.files[0]; if(f) done(f); }; i.click(); }

  /* ── 1단계 창: 양식 받기 · 파일 고르기 ── */
  function open(o){
    if(!o.owner){ toast("엑셀로 올리기는 대표만 할 수 있어요."); return; }
    CGG.dialog({size:"form", title:o.title, desc:"양식에 적어 저장한 파일을 올리면, 넣기 전에 한 번 보여 드려요.",
      body:'<ol class="csu-steps"><li>«엑셀 양식 받기»를 눌러 파일을 받아요.</li><li>엑셀로 열어 둘째 줄(예시) 아래부터 적고 그대로 저장해요.</li><li>«파일 고르기»로 저장한 파일을 올려요.</li></ol>'+
        (o.hint?'<div class="csu-hint">'+esc(o.hint)+'</div>':'')+
        '<div class="csu-drop" id="csuDrop">여기에 파일을 끌어다 놓아도 돼요 (.csv)</div>'+
        '<div class="cpt-err" id="csuErr" hidden></div>'+
        '<div class="csu-btns"><button type="button" class="cgg-btn" id="csuTpl">엑셀 양식 받기</button>'+
        '<button type="button" class="cgg-btn pri" id="csuPick">파일 고르기</button></div>',
      cancel:"닫기"});
    $id("csuTpl").onclick=function(){ download(o.tplName, o.tplText); };
    $id("csuPick").onclick=function(){ pickFile(function(f){ readFile(o, f); }); };
    var dz=$id("csuDrop");
    dz.ondragover=function(e){ e.preventDefault(); dz.classList.add("on"); };
    dz.ondragleave=function(){ dz.classList.remove("on"); };
    dz.ondrop=function(e){ e.preventDefault(); dz.classList.remove("on"); var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) readFile(o, f); };
  }
  function err(t){ var b=$id("csuErr"); if(b){ b.hidden=!t; b.textContent=t||""; } else if(t) toast(t); }
  function readFile(o, f){
    if(/\.(xlsx|xls)$/i.test(f.name||"")) return err("엑셀에서 «파일 › 다른 이름으로 저장»을 누르고 파일 형식을 «CSV UTF-8(쉼표로 분리)»로 골라 저장한 뒤 올려 주세요.");
    if(!/\.(csv|txt)$/i.test(f.name||"")) return err("양식 파일(.csv)만 올릴 수 있어요.");
    if(f.size>MAXB) return err("파일이 너무 커요(2MB까지). 나눠서 올려 주세요.");
    var fr=new FileReader();
    fr.onerror=function(){ err("파일을 읽지 못했어요. 다시 골라 주세요."); };
    fr.onload=function(){
      var rows=parse(decode(fr.result)), head=rows[0]||[], m=mapHead(head, o.cols);
      if(m.miss.length) return err("첫 줄 칸 이름이 양식과 달라요 — «"+m.miss.join(" · ")+"» 칸이 없어요. «엑셀 양식 받기»로 받은 파일에 적어 주세요.");
      var ex=null, tr=parse(String(o.tplText||"").replace(/^﻿/,"")); if(tr[1]){ var tm=mapHead(tr[0]||[], o.cols); ex=cellsOf(tr[1], tm.at, o.cols); }
      var recs=[];
      for(var i=1;i<rows.length;i++){ var c=cellsOf(rows[i], m.at, o.cols);
        if(!o.cols.some(function(x){ return c[x.k]; })) continue;
        recs.push({line:i+1, c:c, ex:sameRow(c, ex, o.cols)}); }
      if(!recs.length) return err("파일에 적힌 줄이 없어요. 둘째 줄(예시) 아래에 적어 주세요.");
      if(recs.length>MAXR) return err("한 번에 "+MAXR+"줄까지 올릴 수 있어요. 나눠서 올려 주세요.");
      preview(o, o.check(recs), f.name);
    };
    fr.readAsArrayBuffer(f);
  }

  /* ── 2단계 창: 미리보기 → 넣기 ── */
  var ST={ "new":["새로","csu-new"], dup:["이미 있음","csu-dup"], bad:["틀린 줄","csu-bad"], ex:["예시 줄","csu-dup"] };
  function preview(o, r, fname){
    var L=r.list, cnt={"new":0,dup:0,bad:0,ex:0}; L.forEach(function(x){ cnt[x.st]++; });
    var tab="all";
    function rowsHtml(){
      var v=L.filter(function(x){ return tab==="all" || x.st===tab || (tab==="dup" && x.st==="ex"); }), more=v.length>SHOW;
      return '<table><thead><tr><th>줄</th><th>상태</th><th>내용</th><th>까닭 · 알림</th></tr></thead><tbody>'+
        (v.length?v.slice(0,SHOW).map(function(x){ return '<tr><td class="n">'+x.line+'</td><td><span class="csu-chip '+ST[x.st][1]+'">'+ST[x.st][0]+'</span></td>'+
          '<td>'+esc(o.label(x.c))+'</td><td class="w">'+esc(x.why||"")+'</td></tr>'; }).join(""):'<tr><td colspan="4" class="em">없어요</td></tr>')+
        '</tbody></table>'+(more?'<div class="csu-hint">앞의 '+SHOW+'줄만 보여요.</div>':''); }
    function seg(k, t){ return '<button type="button" data-csut="'+k+'" aria-pressed="'+(tab===k)+'">'+t+'</button>'; }
    var n=cnt["new"];
    CGG.dialog({size:"form", title:"넣기 전에 확인해 주세요", desc:fname,
      rows:[["모두", L.length+"줄"],["새로 넣을 것", n+"줄"+(r.extra?" ("+r.extra+")":"")],["이미 있음 · 예시 (건너뜀)", (cnt.dup+cnt.ex)+"줄"],["틀린 줄 (건너뜀)", cnt.bad+"줄"]],
      body:'<div class="cpt-seg csu-seg">'+seg("all","모두")+seg("new","새로")+seg("dup","이미 있음")+seg("bad","틀린 줄")+'</div>'+
        '<div class="csu-tbl" id="csuTbl">'+rowsHtml()+'</div>'+
        (cnt.bad?'<div class="csu-hint">틀린 줄은 넣지 않아요. 파일에서 고쳐 다시 올리면 이미 넣은 줄은 «이미 있음»으로 건너뛰어요.</div>':'')+
        '<div class="csu-prog" id="csuProg" hidden></div><div class="cpt-err" id="csuErr" hidden></div>',
      ok:n?n+"줄 넣기":"", cancel:n?"취소":"닫기",
      onOk:function(dlg){ run(o, r, dlg); return false; }});
    function wire(){ Array.prototype.forEach.call(document.querySelectorAll("[data-csut]"), function(b){ b.onclick=function(){ tab=b.getAttribute("data-csut");
      Array.prototype.forEach.call(document.querySelectorAll("[data-csut]"), function(x){ x.setAttribute("aria-pressed", String(x===b)); });
      $id("csuTbl").innerHTML=rowsHtml(); }; }); }
    wire();
  }
  function run(o, r, dlg){
    var okb=dlg.querySelector("[data-dok]"), cx=dlg.querySelector(".ft [data-dx]"), pg=$id("csuProg");
    if(okb.disabled) return; okb.disabled=true; if(cx) cx.disabled=true;
    pg.hidden=false; pg.textContent="넣는 중이에요… 창을 닫지 말아 주세요.";
    Promise.resolve(o.save(r, function(i, t){ if(pg) pg.textContent="넣는 중이에요… "+i+" / "+t; })).then(function(res){
      var fails=(res&&res.fails)||[], ok=(res&&res.n)||0;
      closeD();
      o.done && o.done(ok+"줄을 넣었어요."+(fails.length?" "+fails.length+"줄은 못 넣었어요.":""));
      if(fails.length) CGG.dialog({size:"form", title:"못 넣은 줄이 있어요", desc:"나머지는 다 넣었어요. 아래 줄만 다시 올려 주세요.",
        body:'<div class="csu-tbl"><table><thead><tr><th>줄</th><th>내용</th><th>까닭</th></tr></thead><tbody>'+
          fails.slice(0,SHOW).map(function(x){ return '<tr><td class="n">'+x.line+'</td><td>'+esc(o.label(x.c))+'</td><td class="w">'+esc(x.why)+'</td></tr>'; }).join("")+'</tbody></table></div>',
        cancel:"닫기"});
    }).catch(function(e){ okb.disabled=false; if(cx) cx.disabled=false; pg.hidden=true;
      err(o.fail ? o.fail(e) : "넣지 못했어요. 다시 시도해 주세요."); });
  }
  /* 줄마다 차례로(한 번에 4개씩) — 하나가 안 돼도 나머지는 계속 */
  function each(list, fn, prog){
    var i=0, done=0, ok=0, fails=[], N=list.length;
    return new Promise(function(res){
      function next(){
        if(i>=N){ if(done>=N) res({n:ok, fails:fails}); return; }
        var x=list[i++];
        Promise.resolve().then(function(){ return fn(x); }).then(function(){ ok++; }, function(e){ fails.push({line:x.line, c:x.c, why:x.failWhy||"저장하지 못했어요. 다시 올려 주세요."}); })
          .then(function(){ done++; prog && prog(done, N); if(done>=N) res({n:ok, fails:fails}); else next(); });
      }
      if(!N) res({n:0, fails:[]}); for(var k=0;k<4;k++) next();
    }); }

  /* ════════ 거래처(상사 · 딜러) ════════ */
  var PCOLS=[{k:"comp", label:"상사 이름", alias:["상사","상사명","매매상사","소속상사"]},
             {k:"name", label:"딜러 이름", alias:["딜러","딜러명","이름","성명"]},
             {k:"tel",  label:"휴대폰", alias:["휴대폰번호","핸드폰","전화","연락처"]},
             {k:"no",   label:"사업자번호", alias:["사업자등록번호"]},
             {k:"ceo",  label:"대표자", alias:["대표","대표자명"]},
             {k:"email",label:"이메일", alias:["메일","email","e-mail"]},
             {k:"tax",  label:"세금계산서", alias:["계산서"]}];
  PCOLS[0].req=PCOLS[1].req=PCOLS[2].req=true;
  function taxOf(v){ var k=key(v);
    if(!k) return "";
    if(/^(상사|상사이름|상사이름으로|상사로|상사앞)$/.test(k)) return "co";
    if(/^(딜러본인|본인|딜러|개인사업자|본인이름으로)$/.test(k)) return "own";
    if(/^(안끊음|안함|없음|미발행|발행안함|x)$/.test(k)) return "none";
    if(/^(나중에|미정|모름)$/.test(k)) return "later";
    return null; }
  var TAXW={co:"상사 이름으로", own:"딜러 본인", none:"안 끊음", later:"나중에"};
  function checkPartners(o, recs){
    var have={}, haveNm={}, comps={}, seen={}, newComps={}, list=[];
    (o.dealers||[]).forEach(function(d){ var nk=key(d.comp)+"|"+key(d.name); have[nk+"|"+dig(d.tel)]=1; (haveNm[nk]=haveNm[nk]||[]).push(dig(d.tel)); });
    (o.companies||[]).forEach(function(c){ comps[key(c.name)]=c; });
    recs.forEach(function(x){ var c=x.c, tel=dig(c.tel), no=dig(c.no), why=[], notes=[];
      if(x.ex){ x.st="ex"; x.why="양식의 예시 줄이라 건너뛰어요."; list.push(x); return; }
      var tax=taxOf(c.tax);
      if(!c.comp && !c.name) why.push("상사 이름이나 딜러 이름을 넣어 주세요");
      if(tel && !telOk(tel)) why.push("휴대폰 번호가 맞지 않아요(010으로 시작하는 10~11자리)");
      if(no && !bizOk(no)) why.push("사업자번호가 맞지 않아요");
      if(c.email && !emailOk(c.email)) why.push("이메일 모양이 맞지 않아요");
      if(tax===null) why.push("세금계산서 칸은 «상사 이름으로 · 딜러 본인 · 안 끊음 · 나중에» 중 하나로 적어 주세요");
      if(c.name && tax==="co" && !c.comp) why.push("«상사 이름으로»는 상사 이름이 있어야 해요");
      if(why.length){ x.st="bad"; x.why=why.join(" · "); list.push(x); return; }
      if(!tax) tax=o.later?"later":(c.comp?"co":"none");
      if(tax==="later" && !o.later) tax=c.comp?"co":"none";
      var ck=key(c.comp), isOwn=c.name && tax==="own";
      if(!c.name){   /* 상사만 적은 줄 */
        if(comps[ck] || newComps[ck]){ x.st="dup"; x.why=comps[ck]?"이미 있는 상사예요.":"파일 안에서 두 번 나와요."; list.push(x); return; }
      } else {
        var nk=ck+"|"+key(c.name);
        if(have[nk+"|"+tel]){ x.st="dup"; x.why="이미 있는 딜러예요."; list.push(x); return; }
        if(haveNm[nk] && (!tel || haveNm[nk].indexOf("")>=0)){ x.st="dup"; x.why="같은 상사에 같은 이름 딜러가 있어요. 번호는 거래처 화면에서 넣어 주세요."; list.push(x); return; }
        if(seen[nk+"|"+tel]){ x.st="dup"; x.why="파일 안에서 두 번 나와요."; list.push(x); return; }
        seen[nk+"|"+tel]=1;
        if(haveNm[nk]) notes.push("같은 이름 딜러가 있어요(번호 다름)");
        if(!tel) notes.push("휴대폰이 없어 알림톡이 안 가요");
        x.d={name:c.name, tel:tel, comp:comps[ck]?comps[ck].name:(newComps[ck]?newComps[ck].name:c.comp), tax:tax,
             biz:isOwn?{name:"", no:no, ceo:c.ceo, email:c.email}:null};
        if(isOwn) notes.push("딜러 상호는 거래처 화면에서 넣어 주세요");
        notes.unshift("세금계산서 "+TAXW[tax]);
      }
      if(c.comp && !comps[ck]){
        var nc=newComps[ck];
        if(!nc){ nc=newComps[ck]={name:c.comp, no:"", ceo:"", email:"", line:x.line, c:c}; notes.push("새 상사도 같이 만들어요"); }
        if(!isOwn){ if(!nc.no && no) nc.no=no; if(!nc.ceo && c.ceo) nc.ceo=c.ceo; if(!nc.email && c.email) nc.email=c.email; }
      } else if(c.comp && !isOwn && (no || c.ceo || c.email)) notes.push("상사가 이미 있어 사업자 정보는 바꾸지 않아요");
      x.st="new"; x.why=notes.join(" · "); list.push(x); });
    var nn=Object.keys(newComps).length;
    return {list:list, comps:newComps, extra:nn?"새 상사 "+nn+"곳 포함":""};
  }
  function savePartners(o, r, prog){
    var cs=Object.keys(r.comps).map(function(k){ return r.comps[k]; }),
        ds=r.list.filter(function(x){ return x.st==="new" && x.d; }), bad={}, total=cs.length+ds.length, step=0;
    function tick(){ step++; prog && prog(step, total); }
    return each(cs, function(c){ return Promise.resolve(o.api.saveCompany({name:c.name, no:c.no, ceo:c.ceo, email:c.email}))
        .catch(function(e){ bad[key(c.name)]=1; c.failWhy="상사를 만들지 못했어요."; throw e; }); }, tick)
      .then(function(){
        ds.forEach(function(x){ if(bad[key(x.d.comp)]) x.failWhy="소속 상사를 만들지 못해 딜러도 넣지 않았어요."; });
        return each(ds, function(x){ if(bad[key(x.d.comp)]) return Promise.reject(new Error("comp"));
          return o.api.saveDealer(x.d, true); }, tick).then(function(rd){
          var oc=r.list.filter(function(x){ return x.st==="new" && !x.d; }), cf=[];
          oc.forEach(function(x){ if(bad[key(x.c.comp)]) cf.push({line:x.line, c:x.c, why:"상사를 만들지 못했어요. 다시 올려 주세요."}); });
          return {n:rd.n+oc.length-cf.length, fails:cf.concat(rd.fails).sort(function(a,b){ return a.line-b.line; })}; });
      }); }
  function partners(o){
    open({owner:o.owner, title:"거래처 엑셀로 한꺼번에 올리기", tplName:o.tplName||"양식_거래처.csv", tplText:o.tplText, cols:PCOLS,
      hint:"같은 사람(상사 · 딜러 이름 · 휴대폰이 같음)은 두 번 들어가지 않아요. 처음 보는 상사는 같이 만들어요. 사업자번호 · 대표자 · 이메일은 상사 것이에요(세금계산서가 «딜러 본인»이면 딜러 것).",
      label:function(c){ return [c.comp, c.name, c.tel].filter(Boolean).join(" · "); },
      check:function(recs){ return checkPartners(o, recs); },
      save:function(r, prog){ return savePartners(o, r, prog); },
      done:o.done, fail:o.fail}); }

  /* ════════ 배달 장소(목적지) ════════ */
  var DCOLS=[{k:"name", label:"장소 이름", alias:["장소","목적지","목적지이름","이름","상호"], req:true},
             {k:"addr", label:"주소", alias:["도로명주소"], max:200},
             {k:"phone",label:"연락처", alias:["전화","전화번호","휴대폰"]},
             {k:"memo", label:"메모", alias:["비고"], max:300}];
  function checkPlaces(o, recs){
    var have={}, seen={}, list=[];
    (o.places||[]).forEach(function(p){ have[key(p.name)]=1; });
    recs.forEach(function(x){ var c=x.c, why=[], ph=dig(c.phone), k=key(c.name);
      if(x.ex){ x.st="ex"; x.why="양식의 예시 줄이라 건너뛰어요."; list.push(x); return; }
      if(!c.name) why.push("장소 이름을 넣어 주세요");
      if(c.phone && (ph.length<8 || ph.length>12)) why.push("연락처가 맞지 않아요");
      if(why.length){ x.st="bad"; x.why=why.join(" · "); list.push(x); return; }
      if(have[k]){ x.st="dup"; x.why="이미 있는 장소예요."; list.push(x); return; }
      if(seen[k]){ x.st="dup"; x.why="파일 안에서 두 번 나와요."; list.push(x); return; }
      seen[k]=1; x.st="new"; x.why=c.addr?"":"주소가 없어 지도 링크가 안 붙어요"; list.push(x); });
    return {list:list}; }
  function places(o){
    open({owner:o.owner, title:"배달 장소 엑셀로 한꺼번에 올리기", tplName:o.tplName||"양식_배달장소.csv", tplText:o.tplText, cols:DCOLS,
      hint:"이름이 같은 장소는 두 번 들어가지 않아요.",
      label:function(c){ return [c.name, c.addr].filter(Boolean).join(" · "); },
      check:function(recs){ return checkPlaces(o, recs); },
      save:function(r, prog){ var add=r.list.filter(function(x){ return x.st==="new"; });
        prog && prog(0, add.length);
        return Promise.resolve(o.api.savePlaces(add.map(function(x){ return {name:x.c.name, addr:x.c.addr, phone:x.c.phone, memo:x.c.memo}; })))
          .then(function(){ prog && prog(add.length, add.length); return {n:add.length, fails:[]}; }); },
      done:o.done, fail:o.fail}); }

  return {V:V, partners:partners, places:places, download:download, parse:parse, decode:decode, _bizOk:bizOk};
})();
