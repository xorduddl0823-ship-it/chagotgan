/* 차곳간 엑셀(CSV · xlsx) 한꺼번에 올리기 부품 csvup 1.1 (워시 v134~ · 체크도 같은 부품을 그대로 가져다 씀)
   1.1 (대표님 10/18): 카모두 전산에서 받은 딜러 명부를 «그대로» 올려도 되게
     · 칸 맞추기: 칸 이름 비슷한 말 사전으로 차곳간 칸에 자동 짝 → 미리보기 위 «칸 짝짓기» 한 줄에서 바꿀 수 있음(«안 씀» 포함)
     · 고른 짝은 이 기기에 업체별로 기억(o.store) — 칸 이름만 저장, 손님 자료는 저장 안 함
     · 칸 이름 줄 찾기: 맨 위 제목 줄이 있어도 앞 10줄 안에서 칸 이름 줄을 찾아요
     · .xlsx 도 받기 — 바깥 엑셀 읽기 도구(SheetJS) 없이 브라우저 기본 압축 풀기(DecompressionStream)로 첫 시트만 읽어요
       (못 쓰는 브라우저 · 옛 .xls 는 «CSV로 저장» 안내. 웹 표를 .xls 이름으로 내려 주는 전산 파일은 표로 읽어요)
   1.0 (워시 v133):
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
  var V="csvup 1.1", MAXB=2*1024*1024, MAXR=3000, SHOW=300;
  function esc(s){ return (window.CGG&&CGG.esc) ? CGG.esc(s) : String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function dig(v){ return String(v==null?"":v).replace(/\D/g,""); }
  /* 엑셀이 숫자로 바꾸며 맨 앞 0을 지운 번호(1012345678 · 212345678) → 0 붙여 되살림 */
  function telDig(v){ var d=dig(v); return (/^[1-9]/.test(d) && d.length>=8 && d.length<=10 && !/[-\s]/.test(String(v).trim())) ? "0"+d : d; }
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
  function hkey(s){ return String(s==null?"":s).replace(/\(.*?\)|\[.*?\]/g,"").replace(/[\s*·:._\/-]/g,"").toLowerCase(); }
  /* 칸 이름 → 칸 번호 + 확실한지. 차곳간 칸 차례대로, 한 칸은 한 번만 씀
     확실 = 이름 · 비슷한 말과 똑같음 / 확실치 않음 = 이름을 품고 있음(예: «딜러 휴대폰») */
  function mapHead(head, cols){
    var at={}, sure={}, used={}, H=head.map(hkey);
    cols.forEach(function(c){ var names=[c.label].concat(c.alias||[]).map(hkey);
      for(var n=0;n<names.length && at[c.k]==null;n++) for(var i=0;i<H.length;i++) if(!used[i] && H[i]===names[n]){ at[c.k]=i; sure[c.k]=true; used[i]=1; break; } });
    cols.forEach(function(c){ if(at[c.k]!=null) return; var names=[c.label].concat(c.alias||[]).map(hkey).filter(function(x){ return x.length>=2; });
      for(var i=0;i<H.length && at[c.k]==null;i++) if(!used[i] && H[i] && names.some(function(x){ return H[i].indexOf(x)>=0; })){ at[c.k]=i; used[i]=1; } });
    return {at:at, sure:sure}; }
  /* 칸 이름 줄 — 앞 10줄 중 아는 칸 이름이 가장 많은 줄(둘 이상), 없으면 첫 줄 */
  function headRow(rows, cols){ var best=0, bn=1;
    for(var r=0;r<Math.min(10,rows.length);r++){ var m=mapHead(rows[r]||[], cols), n=Object.keys(m.sure).length; if(n>bn){ bn=n; best=r; } }
    return best; }
  function needOk(at, o){ return (o.need||[]).some(function(k){ return at[k]!=null; }); }
  function cellsOf(row, at, cols){ var o={}; cols.forEach(function(c){ var i=at[c.k]; o[c.k]=i==null?"":String(row[i]==null?"":row[i]).trim().slice(0,c.max||100); }); return o; }
  function sameRow(a, b, cols){ return !!b && cols.every(function(c){ return key(a[c.k])===key(b[c.k]); }); }

  function download(name, text){
    var t=String(text||""); if(t.charAt(0)!=="﻿") t="﻿"+t;
    var a=document.createElement("a"), u=URL.createObjectURL(new Blob([t],{type:"text/csv;charset=utf-8"}));
    a.href=u; a.download=name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },1500); }

  function pickFile(done){
    var i=document.createElement("input"); i.type="file"; i.accept=".csv,.txt,.xlsx,.xls,text/csv";
    i.onchange=function(){ var f=i.files&&i.files[0]; if(f) done(f); }; i.click(); }

  /* ── .xlsx 읽기 (첫 시트) — zip 안 sheet1 · sharedStrings 만 풀어서 XML 로 읽어요. 수식 · 서식 · 매크로는 안 봐요 ── */
  var CSVTIP="엑셀에서 «파일 › 다른 이름으로 저장»을 누르고 파일 형식을 «CSV UTF-8(쉼표로 분리)»로 골라 저장한 뒤 올려 주세요.";
  function u16(b,i){ return b[i]|(b[i+1]<<8); } function u32(b,i){ return (b[i]|(b[i+1]<<8)|(b[i+2]<<16)|(b[i+3]<<24))>>>0; }
  function unzipList(b){ var e=-1; for(var i=b.length-22;i>=Math.max(0,b.length-66000);i--) if(u32(b,i)===0x06054b50){ e=i; break; }
    if(e<0) throw new Error("zip"); var n=u16(b,e+10), p=u32(b,e+16), out={};
    for(var k=0;k<n;k++){ if(u32(b,p)!==0x02014b50) throw new Error("zip");
      var m=u16(b,p+10), cs=u32(b,p+20), us=u32(b,p+24), fl=u16(b,p+28), xl=u16(b,p+30), cl=u16(b,p+32), lo=u32(b,p+42);
      var name=new TextDecoder().decode(b.subarray(p+46,p+46+fl)); out[name]={m:m, cs:cs, us:us, lo:lo}; p+=46+fl+xl+cl; }
    return out; }
  function unzipOne(b, z){ if(!z) return Promise.resolve(null);
    if(z.us>20*1024*1024) return Promise.reject(new Error("big"));
    var s=z.lo+30+u16(b,z.lo+26)+u16(b,z.lo+28), raw=b.subarray(s, s+z.cs);
    if(z.m===0) return Promise.resolve(new TextDecoder().decode(raw));
    if(z.m!==8) return Promise.reject(new Error("zip"));
    /* 풀린 크기를 실제로 세어 20MB 넘으면 멈춰요(압축 폭탄 막기) */
    var rd=new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(), parts=[], tot=0;
    function pump(){ return rd.read().then(function(x){ if(x.done) return new Blob(parts).text();
      tot+=x.value.length; if(tot>20*1024*1024){ try{ rd.cancel(); }catch(e){} throw new Error("big"); } parts.push(x.value); return pump(); }); }
    return pump(); }
  function xmlDoc(t){ var d=new DOMParser().parseFromString(t||"","application/xml"); if(d.getElementsByTagName("parsererror").length) throw new Error("xml"); return d; }
  function tags(n, t){ return Array.prototype.slice.call(n.getElementsByTagNameNS("*", t)); }
  function colNo(ref){ var m=/^([A-Z]+)/.exec(ref||""), n=0; if(!m) return -1; for(var i=0;i<m[1].length;i++) n=n*26+(m[1].charCodeAt(i)-64); return n-1; }
  function readXlsx(buf){
    if(typeof DecompressionStream==="undefined") return Promise.reject(new Error("tip"));
    var b=new Uint8Array(buf), z;
    try{ z=unzipList(b); }catch(e){ return Promise.reject(e); }
    var wb=z["xl/workbook.xml"], rel=z["xl/_rels/workbook.xml.rels"];
    return Promise.all([unzipOne(b,wb), unzipOne(b,rel), unzipOne(b,z["xl/sharedStrings.xml"])]).then(function(t){
      var path="xl/worksheets/sheet1.xml";
      try{ var s1=tags(xmlDoc(t[0]),"sheet")[0], rid=s1 && (s1.getAttribute("r:id")||s1.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id"));
        tags(xmlDoc(t[1]),"Relationship").forEach(function(r){ if(r.getAttribute("Id")===rid){ var g=String(r.getAttribute("Target")||"").replace(/^\/?(xl\/)?/,""); path="xl/"+g; } }); }catch(e){}
      var ss=[]; if(t[2]) tags(xmlDoc(t[2]),"si").forEach(function(si){ ss.push(tags(si,"t").map(function(x){ return x.textContent; }).join("")); });
      return unzipOne(b, z[path]||z["xl/worksheets/sheet1.xml"]).then(function(x){
        if(!x) throw new Error("xml");
        var rows=[]; tags(xmlDoc(x),"row").slice(0,MAXR+12).forEach(function(r){
          var ri=(+r.getAttribute("r")||rows.length+1)-1, row=[];
          tags(r,"c").forEach(function(c,ci){ var k=colNo(c.getAttribute("r")); if(k<0) k=ci; if(k>200) return;
            var ty=c.getAttribute("t"), v=tags(c,"v")[0], val="";
            if(ty==="s") val=v?(ss[+v.textContent]||""):""; else if(ty==="inlineStr") val=tags(c,"t").map(function(q){ return q.textContent; }).join(""); else val=v?v.textContent:"";
            row[k]=val; });
          for(var q=0;q<row.length;q++) if(row[q]==null) row[q]="";
          while(rows.length<ri) rows.push([]); rows[ri]=row; });
        return rows; }); }); }
  /* 웹 표를 .xls 이름으로 내려 주는 전산 파일 — 첫 표를 읽어요(스크립트는 실행되지 않아요) */
  function readHtmlTable(text){ var d=new DOMParser().parseFromString(text,"text/html"), t=d.querySelector("table"); if(!t) return null;
    return Array.prototype.slice.call(t.rows,0,MAXR+12).map(function(r){ return Array.prototype.map.call(r.cells,function(c){ return String(c.textContent||"").trim(); }); }); }

  /* ── 1단계 창: 양식 받기 · 파일 고르기 ── */
  function open(o){
    if(!o.owner){ toast("엑셀로 올리기는 대표만 할 수 있어요."); return; }
    CGG.dialog({size:"form", title:o.title, desc:"양식이나 전산에서 받은 엑셀을 올리면, 넣기 전에 한 번 보여 드려요.",
      body:'<ol class="csu-steps"><li>«엑셀 양식 받기»로 받은 파일에 적거나, 전산에서 받은 엑셀을 그대로 써요.</li><li>«파일 고르기»로 올려요. 칸 이름이 달라도 «칸 짝짓기»에서 맞출 수 있어요.</li></ol>'+
        (o.hint?'<div class="csu-hint">'+esc(o.hint)+'</div>':'')+
        '<div class="csu-drop" id="csuDrop">여기에 파일을 끌어다 놓아도 돼요 (.xlsx · .csv)</div>'+
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
    var nm=f.name||"";
    if(!/\.(csv|txt|xlsx|xls)$/i.test(nm)) return err("엑셀(.xlsx) · CSV 파일만 올릴 수 있어요.");
    if(f.size>MAXB*(/\.xlsx?$/i.test(nm)?3:1)) return err("파일이 너무 커요. 나눠서 올려 주세요.");
    var fr=new FileReader();
    fr.onerror=function(){ err("파일을 읽지 못했어요. 다시 골라 주세요."); };
    fr.onload=function(){
      var buf=fr.result, b=new Uint8Array(buf), zip=b[0]===0x50&&b[1]===0x4B, ole=b[0]===0xD0&&b[1]===0xCF;
      var p;
      if(zip) p=readXlsx(buf);
      else if(ole) return err("옛 엑셀 파일(.xls)이에요. "+CSVTIP);
      else { var t=decode(buf); p=Promise.resolve(/^\s*</.test(t) ? readHtmlTable(t) : parse(t)); }
      p.then(function(rows){ if(!rows) throw new Error("tip"); got(o, rows, nm); })
       .catch(function(e){ err((e&&e.message==="big")?"파일이 너무 커요. 나눠서 올려 주세요.":"이 엑셀 파일을 읽지 못했어요. "+CSVTIP); });
    };
    fr.readAsArrayBuffer(f);
  }
  /* 기억한 짝 — 이 기기 · 업체별 · 칸 이름만 */
  function memKey(o){ return "cgg.csvup."+o.kind+"."+String(o.store||"").slice(0,80); }
  function memGet(o){ try{ return JSON.parse(localStorage.getItem(memKey(o))||"{}")||{}; }catch(e){ return {}; } }
  function memPut(o, head, at){ try{ var m={}; o.cols.forEach(function(c){ m[c.k]=at[c.k]==null?"":String(head[at[c.k]]||""); }); localStorage.setItem(memKey(o), JSON.stringify(m)); }catch(e){} }
  function got(o, rows, fname){
    var hr=headRow(rows, o.cols), head=(rows[hr]||[]).map(function(h,i){ return String(h==null?"":h).trim(); }), m=mapHead(head, o.cols), mem=memGet(o), H=head.map(hkey);
    o.cols.forEach(function(c){ if(!(c.k in mem)) return; var w=mem[c.k];
      if(w===""){ delete m.at[c.k]; m.sure[c.k]=true; return; }
      var i=H.indexOf(hkey(w)); if(i>=0){ o.cols.forEach(function(d){ if(m.at[d.k]===i) delete m.at[d.k]; }); m.at[c.k]=i; m.sure[c.k]=true; } });
    var ex=null, tr=parse(String(o.tplText||"").replace(/^﻿/,"")); if(tr[1]){ ex=cellsOf(tr[1], mapHead(tr[0]||[], o.cols).at, o.cols); }
    var F={rows:rows, hr:hr, head:head, at:m.at, sure:m.sure, ex:ex, name:fname};
    if(rows.length-hr-1>MAXR) return err("한 번에 "+MAXR+"줄까지 올릴 수 있어요. 나눠서 올려 주세요.");
    if(!rows.slice(hr+1).some(function(r){ return r.some(function(v){ return String(v||"").trim(); }); })) return err("파일에 적힌 줄이 없어요. 칸 이름 줄 아래에 적어 주세요.");
    preview(o, F);
  }
  function recsOf(o, F){ var recs=[];
    for(var i=F.hr+1;i<F.rows.length;i++){ var c=cellsOf(F.rows[i]||[], F.at, o.cols);
      if(!o.cols.some(function(x){ return c[x.k]; })) continue;
      recs.push({line:i+1, c:c, ex:sameRow(c, F.ex, o.cols)}); }
    return recs; }

  /* ── 2단계 창: 칸 짝짓기 + 미리보기 → 넣기 ── */
  var ST={ "new":["새로","csu-new"], dup:["이미 있음","csu-dup"], bad:["틀린 줄","csu-bad"], ex:["예시 줄","csu-dup"] };
  function colName(i){ var s=""; i++; while(i>0){ var m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }
  function preview(o, F, tab0){
    var ok=needOk(F.at, o), r=ok?o.check(recsOf(o, F)):{list:[]}, L=r.list, cnt={"new":0,dup:0,bad:0,ex:0}; L.forEach(function(x){ cnt[x.st]++; });
    var tab=tab0||"all";
    function warnOf(c){ var cur=F.at[c.k]; return (cur==null&&(o.need||[]).indexOf(c.k)>=0)||(cur!=null&&!F.sure[c.k]); }
    var unsure=o.cols.filter(warnOf).length; if(unsure||!ok) F.open=true;
    function rowsHtml(){
      var v=L.filter(function(x){ return tab==="all" || x.st===tab || (tab==="dup" && x.st==="ex"); }), more=v.length>SHOW;
      return '<table><thead><tr><th>줄</th><th>상태</th><th>내용</th><th>까닭 · 알림</th></tr></thead><tbody>'+
        (v.length?v.slice(0,SHOW).map(function(x){ return '<tr><td class="n">'+x.line+'</td><td><span class="csu-chip '+ST[x.st][1]+'">'+ST[x.st][0]+'</span></td>'+
          '<td>'+esc(o.label(x.c))+'</td><td class="w">'+esc(x.why||"")+'</td></tr>'; }).join(""):'<tr><td colspan="4" class="em">없어요</td></tr>')+
        '</tbody></table>'+(more?'<div class="csu-hint">앞의 '+SHOW+'줄만 보여요.</div>':''); }
    function mapHtml(){
      if(!F.open) return '<div class="csu-map csu-mapc"><span><b>칸 짝짓기</b> '+
        esc(o.cols.filter(function(c){ return F.at[c.k]!=null; }).map(function(c){ return c.label+" ← "+(F.head[F.at[c.k]]||colName(F.at[c.k])+"열"); }).join(" · "))+
        '</span><button type="button" class="cgg-btn sm" data-csuo="1">바꾸기</button></div>';
      return '<div class="csu-map"><div class="csu-maph"><b>칸 짝짓기</b><span class="csu-hint">'+(unsure?'주황 칸을 확인해 주세요. 올린 파일의 어느 칸인지 골라요.':'올린 파일의 어느 칸인지 골라요. 쓰지 않는 칸은 «안 씀».')+'</span></div><div class="csu-mapr">'+
        o.cols.map(function(c){ var cur=F.at[c.k], warn=warnOf(c);
          return '<label class="'+(warn?"warn":"")+'"><span>'+esc(c.label)+'</span><select data-csum="'+c.k+'"><option value="">안 씀</option>'+
            F.head.map(function(h,i){ return '<option value="'+i+'"'+(cur===i?' selected':'')+'>'+esc(h||("("+colName(i)+"열)"))+'</option>'; }).join("")+'</select></label>'; }).join("")+
        '</div></div>'; }
    function seg(k, t){ return '<button type="button" data-csut="'+k+'" aria-pressed="'+(tab===k)+'">'+t+'</button>'; }
    var n=cnt["new"];
    var dlg=CGG.dialog({size:"form", title:"넣기 전에 확인해 주세요", desc:F.name,
      rows:[["모두", L.length+"줄"],["새로 넣을 것", n+"줄"+(r.extra?" ("+r.extra+")":"")],["이미 있음 · 예시 (건너뜀)", (cnt.dup+cnt.ex)+"줄"],["틀린 줄 (건너뜀)", cnt.bad+"줄"]],
      body:mapHtml()+
        (ok?'':'<div class="cpt-err">'+esc(o.needMsg||"칸을 골라 주세요.")+'</div>')+
        '<div class="cpt-seg csu-seg">'+seg("all","모두")+seg("new","새로")+seg("dup","이미 있음")+seg("bad","틀린 줄")+'</div>'+
        '<div class="csu-tbl" id="csuTbl">'+rowsHtml()+'</div>'+
        (cnt.bad?'<div class="csu-hint">틀린 줄은 넣지 않아요. 파일에서 고쳐 다시 올리면 이미 넣은 줄은 «이미 있음»으로 건너뛰어요.</div>':'')+
        '<div class="csu-prog" id="csuProg" hidden></div><div class="cpt-err" id="csuErr" hidden></div>',
      ok:n?n+"줄 넣기":"", cancel:n?"취소":"닫기",
      onOk:function(d){ memPut(o, F.head, F.at); run(o, r, d); return false; }});
    Array.prototype.forEach.call(dlg.querySelectorAll("[data-csum]"), function(sel){ sel.onchange=function(){
      var k=sel.getAttribute("data-csum"), v=sel.value;
      if(v===""){ delete F.at[k]; } else { v=+v; o.cols.forEach(function(d){ if(F.at[d.k]===v) delete F.at[d.k]; }); F.at[k]=v; }
      F.sure[k]=true; var top=dlg.scrollTop; var nd=preview(o, F, tab); if(nd) nd.scrollTop=top; }; });
    var ob=dlg.querySelector("[data-csuo]"); if(ob) ob.onclick=function(){ F.open=true; preview(o, F, tab); };
    Array.prototype.forEach.call(dlg.querySelectorAll("[data-csut]"), function(b){ b.onclick=function(){ tab=b.getAttribute("data-csut");
      Array.prototype.forEach.call(dlg.querySelectorAll("[data-csut]"), function(x){ x.setAttribute("aria-pressed", String(x===b)); });
      $id("csuTbl").innerHTML=rowsHtml(); }; });
    return dlg;
  }
  function run(o, r, dlg){
    var okb=dlg.querySelector("[data-dok]"), cx=dlg.querySelector(".ft [data-dx]"), pg=$id("csuProg");
    if(okb.disabled) return; okb.disabled=true; if(cx) cx.disabled=true;
    pg.hidden=false; pg.textContent="넣는 중이에요… 창을 닫지 말아 주세요.";
    var dim=dlg.parentNode, xb=dlg.querySelectorAll("[data-dx]");
    function blk(e){ if((e.type==="keydown" && e.key==="Escape") || (e.type==="click" && e.target===dim)){ e.stopPropagation(); e.preventDefault(); } }
    document.addEventListener("keydown", blk, true); if(dim) dim.addEventListener("click", blk, true);
    Array.prototype.forEach.call(xb, function(b){ b.disabled=true; });
    function unblk(){ document.removeEventListener("keydown", blk, true); if(dim) dim.removeEventListener("click", blk, true);
      Array.prototype.forEach.call(xb, function(b){ b.disabled=false; }); }
    Promise.resolve(o.save(r, function(i, t){ if(pg) pg.textContent="넣는 중이에요… "+i+" / "+t; })).then(function(res){
      var fails=(res&&res.fails)||[], ok=(res&&res.n)||0;
      unblk(); closeD();
      o.done && o.done(ok+"줄을 넣었어요."+(fails.length?" "+fails.length+"줄은 못 넣었어요.":""));
      if(fails.length) CGG.dialog({size:"form", title:"못 넣은 줄이 있어요", desc:"나머지는 다 넣었어요. 아래 줄만 다시 올려 주세요.",
        body:'<div class="csu-tbl"><table><thead><tr><th>줄</th><th>내용</th><th>까닭</th></tr></thead><tbody>'+
          fails.slice(0,SHOW).map(function(x){ return '<tr><td class="n">'+x.line+'</td><td>'+esc(o.label(x.c))+'</td><td class="w">'+esc(x.why)+'</td></tr>'; }).join("")+'</tbody></table></div>',
        cancel:"닫기"});
    }).catch(function(e){ unblk(); okb.disabled=false; pg.hidden=true;
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
  var PCOLS=[{k:"comp", label:"상사 이름", alias:["상사","상사명","매매상사","매매상사명","소속상사","소속","상호","상호명","회사","회사명","업체","업체명","사업장","사업장명"]},
             {k:"name", label:"딜러 이름", alias:["딜러","딜러명","딜러이름","이름","성명","담당자","담당자명","종사원","종사원명","사원명"]},
             {k:"tel",  label:"휴대폰", alias:["휴대폰번호","휴대전화","휴대전화번호","핸드폰","핸드폰번호","hp","mobile","연락처","전화","전화번호","딜러연락처"]},
             {k:"no",   label:"사업자번호", alias:["사업자등록번호","사업자","등록번호","사업자no"]},
             {k:"ceo",  label:"대표자", alias:["대표","대표자명","대표이사","대표자성명"]},
             {k:"email",label:"이메일", alias:["메일","email","e-mail","전자우편","이메일주소"]},
             {k:"tax",  label:"세금계산서", alias:["계산서","세금계산서발행"]}];
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
    recs.forEach(function(x){ var c=x.c, tel=telDig(c.tel), no=dig(c.no), why=[], notes=[];
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
    open({owner:o.owner, kind:"partners", store:o.store, need:["comp","name"], needMsg:"«상사 이름»이나 «딜러 이름» 칸을 골라 주세요.", title:"거래처 엑셀로 한꺼번에 올리기", tplName:o.tplName||"양식_거래처.csv", tplText:o.tplText, cols:PCOLS,
      hint:"같은 사람은 두 번 안 들어가요. 처음 보는 상사는 같이 만들어요.",
      label:function(c){ return [c.comp, c.name, c.tel].filter(Boolean).join(" · "); },
      check:function(recs){ return checkPartners(o, recs); },
      save:function(r, prog){ return savePartners(o, r, prog); },
      done:o.done, fail:o.fail}); }

  /* ════════ 배달 장소(목적지) ════════ */
  var DCOLS=[{k:"name", label:"장소 이름", alias:["장소","장소명","목적지","목적지이름","목적지명","이름","상호","상호명","업체명","거래처","거래처명"]},
             {k:"addr", label:"주소", alias:["도로명주소","지번주소","소재지","위치"], max:200},
             {k:"phone",label:"연락처", alias:["전화","전화번호","휴대폰","핸드폰","hp"]},
             {k:"memo", label:"메모", alias:["비고"], max:300}];
  function checkPlaces(o, recs){
    var have={}, seen={}, list=[];
    (o.places||[]).forEach(function(p){ have[key(p.name)]=1; });
    recs.forEach(function(x){ var c=x.c, why=[], ph=telDig(c.phone), k=key(c.name);
      if(x.ex){ x.st="ex"; x.why="양식의 예시 줄이라 건너뛰어요."; list.push(x); return; }
      if(!c.name) why.push("장소 이름을 넣어 주세요");
      if(c.phone && (ph.length<8 || ph.length>12)) why.push("연락처가 맞지 않아요");
      if(why.length){ x.st="bad"; x.why=why.join(" · "); list.push(x); return; }
      if(have[k]){ x.st="dup"; x.why="이미 있는 장소예요."; list.push(x); return; }
      if(seen[k]){ x.st="dup"; x.why="파일 안에서 두 번 나와요."; list.push(x); return; }
      seen[k]=1; x.st="new"; x.why=c.addr?"":"주소가 없어 지도 링크가 안 붙어요"; list.push(x); });
    return {list:list}; }
  function places(o){
    open({owner:o.owner, kind:"places", store:o.store, need:["name"], needMsg:"«장소 이름» 칸을 골라 주세요.", title:"배달 장소 엑셀로 한꺼번에 올리기", tplName:o.tplName||"양식_배달장소.csv", tplText:o.tplText, cols:DCOLS,
      hint:"이름이 같은 장소는 두 번 들어가지 않아요.",
      label:function(c){ return [c.name, c.addr].filter(Boolean).join(" · "); },
      check:function(recs){ return checkPlaces(o, recs); },
      save:function(r, prog){ var add=r.list.filter(function(x){ return x.st==="new"; });
        prog && prog(0, add.length);
        return Promise.resolve(o.api.savePlaces(add.map(function(x){ var ph=telDig(x.c.phone); return {name:x.c.name, addr:x.c.addr, phone:(ph!==dig(x.c.phone))?ph:x.c.phone, memo:x.c.memo}; })))
          .then(function(){ prog && prog(add.length, add.length); return {n:add.length, fails:[]}; }); },
      done:o.done, fail:o.fail}); }

  return {V:V, partners:partners, places:places, download:download, parse:parse, decode:decode, _bizOk:bizOk};
})();
