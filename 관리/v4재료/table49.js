/* =========================================================
   표 만들기 — 관리 v4.9 · 공통 부품 cgg-j4 1.13.2 CGG.table 과 같은 모양 · 같은 이름표
   부르는 쪽(26곳)은 그대로: makeTable({id, cols:[{k,label,w,num,html,nosort,mono,sortVal,kind}], rows, search, filters, onRow, rowId,
                                         tabs:[[값,이름]…], tabOf:function(row){값}, sortKey, sortDir, empty, size, find, mf:[칸 k 또는 [k,이름표]…]})
   1.13.2 와 같게: 위 한 줄(넓은 찾기 칸 · 상태 칩 · 거르기 · «20개씩») · 칸 머리 정렬 단추(▲▼↕) · 고르기 칸 없음(F18 — 관리 표는 일괄 단추가 없어요)
                   · 아래 «처음 · 이전 · 1 / 1 · 모두 N건 · 다음 · 맨뒤» · 폰은 «이름표: 값» 3칸(mf) · 한글 조합 중엔 다시 그리지 않음(F15) · 정렬 뒤 초점 유지(F17)
   관리만 있는 것(그대로): 칸 안 꼬리표(html) · 줄 누르면 자세히(onRow) · 거르기 알약이 실제로 걸러요 · 줄 버튼 누르는 일을 다시 그려도 지켜요
   ========================================================= */
var TSTATE = {};
var TWID = {name:180,id:130,text:0,date:112,num:96,money:130,state:104,time:110,act:150};
var TRANK = {name:0,id:1,text:2,date:3,time:3,num:4,money:4,state:5,act:6};
function tStrip(h){ return String(h==null?"":h).replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&").replace(/\s+/g," ").trim(); }
/* 예전 알약(pill) 색 → 공통 상태 칩 네 가지 */
var TPILL = {ok:"done",run:"run",wait:"chk",off:"stop",gray:"run",bad:"stop",warn:"chk",done:"done",chk:"chk",stop:"stop"};
function tChipify(h){ return String(h).replace(/class="pill(?: (\w+))?"/g,function(_,c){ return 'class="cgg-st '+(TPILL[c]||"run")+'"'; }); }
function tTone(t){ t=String(t||"");
  if(/실패|지남|막힘|멈|보류|꺼짐|오류|안 됨|끊|정리|기한 지남|못/.test(t)) return "stop";
  if(/확인|기다|대기|전$|입금 전|곧|남음|심사|중간/.test(t)) return "chk";
  if(/완료|됨$|결제됨|켜짐|정상|보냄|승인|받음|열림|좋음/.test(t)) return "done";
  return "run"; }
function tKind(c,i){
  if(c.kind) return c.kind;
  var L=String(c.label||"");
  if(c.k==="_a" || /^할 일$/.test(L)) return "act";
  if(/상태|^결과$|^지금$/.test(L)) return "state";
  if(c.num) return /금액|원|요금|잔액|합계|비용|캐시|달마다/.test(L)?"money":"num";
  if(/코드|번호|주문|아이디|휴대폰|사업자/.test(L)) return "id";
  if(/시각|^때$|보낸 때|넣은 때|^언제$/.test(L)) return "id";
  if(/날$|날짜|일$|기한|기간|마지막|달치/.test(L)) return "date";
  return "text"; }
function makeTable(o){
  var st = TSTATE[o.id] || (TSTATE[o.id]={q:"",size:o.size||20,page:1,key:o.sortKey||"",dir:o.sortDir||"asc",sel:{},tab:""});
  if(!st.f) st.f = {};
  st.sel = {};   /* 1.5 보안 규칙 ② — 관리 표는 고르기 칸이 없지만, 남은 값이 없게 늘 비워요 */
  var host = $(o.id);
  if(!host) return;
  /* 칸 차례: 이름 → 번호 → 내용 → 날짜 → 금액 → 상태 → 할 일 (같은 종류 안에서는 원래 차례) */
  var NAMERX=/^(업체명|업체|이름|서비스|제목|받는 업체|표 이름|어디|휴대폰)$/;
  var ni=-1; o.cols.forEach(function(c,i){ if(ni<0 && c.isName) ni=i; });   /* 화면이 이름 칸을 정해 주면 그 칸 */
  o.cols.forEach(function(c,i){ if(ni<0 && !c.kind && NAMERX.test(String(c.label||""))) ni=i; }); if(ni<0) ni=0;
  var sample=(o.rows||[]).slice(0,8);
  var cols=o.cols.map(function(c,i){ var k=i===ni?"name":tKind(c,i);
      if(k!=="act" && c.html && sample.some(function(r){ return /class="(?:cgg-)?btn[ "]/.test(String(c.html(r)||"")); }) && !/상태/.test(String(c.label||""))) k="act";
      return {c:c,kind:k,i:i}; });
  var si=-1; cols.forEach(function(x){ if(x.kind==="state"){ if(si<0) si=x.i; else x.kind="text"; } });
  var actCols=cols.filter(function(x){ return x.kind==="act"; });
  var shown=cols.filter(function(x){ return x.kind!=="act"; }).sort(function(a,b){ return (TRANK[a.kind]-TRANK[b.kind]) || (a.i-b.i); });
  var stateCol=si>=0?o.cols[si]:null;
  /* 폰 «이름표: 값» 칸 — 화면이 mf 를 주면 그대로, 아니면 날짜 · 금액 · 상태 칸에서 3칸까지(1.13.2 · 미리보기 11판처럼 3칸) */
  var byK={}; shown.forEach(function(x){ byK[x.c.k]=x; });
  var MF=[];
  (o.mf||[]).forEach(function(f){ var k=Array.isArray(f)?f[0]:f, x=byK[k]; if(x && x!==shown[0] && MF.every(function(m){ return m.x!==x; })) MF.push({x:x,label:Array.isArray(f)&&f[1]!=null?String(f[1]):String(x.c.label||"")}); });
  if(!o.mf){ shown.slice(1).filter(function(x){ return /^(date|time|num|money|state)$/.test(x.kind); }).slice(0,3).forEach(function(x){ MF.push({x:x,label:String(x.c.label||"")}); });
    if(MF.length<3) shown.slice(1).filter(function(x){ return x.kind==="text" && MF.every(function(m){ return m.x!==x; }); }).slice(0,3-MF.length).forEach(function(x){ MF.push({x:x,label:String(x.c.label||"")}); }); }
  function cellH(c,r){ return c.html ? String(c.html(r)==null?"":c.html(r)) : esc(r[c.k]==null?"":r[c.k]); }
  function stateTxt(r){ return stateCol?tStrip(cellH(stateCol,r)):""; }
  function tabVal(r){ return o.tabOf ? String(o.tabOf(r)) : stateTxt(r); }
  function val(r,c){ return c.sortVal ? c.sortVal(r) : r[c.k]; }
  function actsH(r){ var h=actCols.map(function(x){ return cellH(x.c,r); }).join("");
    return h.replace(/class="btn sm( danger| primary)?"/g,function(_,d){ return 'class="cgg-btn sm'+(d===" danger"?" danger":"")+'"'; })
            .replace(/class="btn( danger| primary)?"/g,function(_,d){ return 'class="cgg-btn sm'+(d===" danger"?" danger":"")+'"'; }); }
  function stateH(r){ var h=tChipify(cellH(stateCol,r));
    return /cgg-st/.test(h) ? h : (tStrip(h)?'<span class="cgg-st '+tTone(tStrip(h))+'">'+h+'</span>':''); }
  function cellX(x,r){ return x.kind==="state"?stateH(r):tChipify(cellH(x.c,r)); }
  /* 다시 그려도 줄 버튼이 하는 일 지키기 — data-… 값이 같은 새 버튼에 그대로 */
  var MINE=/^data-(tab|k|p|q|size|msort|fp|id)$/;
  function keep(){ var m={}; Array.prototype.forEach.call(host.querySelectorAll("button,span.cgg-btn,span.btn"),function(b){ if(!b.onclick) return;
      for(var i=0;i<b.attributes.length;i++){ var a=b.attributes[i]; if(a.name.indexOf("data-")===0 && !MINE.test(a.name)){ m[a.name+"\u0001"+a.value]=b.onclick; break; } } }); return m; }
  function restore(m){ Array.prototype.forEach.call(host.querySelectorAll("button,span.cgg-btn,span.btn"),function(b){
      for(var i=0;i<b.attributes.length;i++){ var a=b.attributes[i], f=m[a.name+"\u0001"+a.value]; if(f){ b.onclick=f; break; } } }); }
  function emptyTxt(){ return esc((typeof o.empty==="function"?o.empty(o.rows||[]):o.empty)||"조건에 맞는 자료가 없어요."); }

  function draw(focusK){
    var old=keep();
    var base=(o.rows||[]).slice();
    (o.filters||[]).forEach(function(f){ var v=st.f[f.k]; if(v===undefined||v==="") return;
      base=base.filter(function(r){ return String(f.get?f.get(r):r[f.k])===String(v); }); });
    var q=st.q.trim().toLowerCase();
    if(q && o.search && o.search.length) base=base.filter(function(r){ return o.search.some(function(k){ return String(r[k]==null?"":r[k]).toLowerCase().indexOf(q)>=0; }); });
    /* 상태 칩 + 개수 — tabs 를 안 주면 실제 줄에 있는 상태만(0건 칩 없음 · 1.13 R08) */
    var tabs=null;
    if(o.tabs) tabs=o.tabs;
    else if(stateCol){ var cnt={}, seen=[]; (o.rows||[]).forEach(function(r){ var t=tabVal(r); if(t){ if(!cnt[t]) seen.push(t); cnt[t]=(cnt[t]||0)+1; } });
      tabs=[["","전체"]].concat(seen.map(function(t){ return [t,t]; })); }
    var rows=base.filter(function(r){ return !st.tab || tabVal(r)===st.tab; });
    if(st.key){ var col=o.cols.filter(function(c){ return c.k===st.key; })[0];
      if(col) rows.sort(function(a,b){ var x=val(a,col), y=val(b,col); if(x==null) x=""; if(y==null) y="";
        if(typeof x==="number" && typeof y==="number") return st.dir==="asc"?x-y:y-x;
        x=String(x); y=String(y); return st.dir==="asc"?x.localeCompare(y,"ko"):y.localeCompare(x,"ko"); }); }
    var total=rows.length, pages=Math.max(1,Math.ceil(total/st.size)); if(st.page>pages) st.page=pages;
    var view=rows.slice((st.page-1)*st.size, st.page*st.size);
    var rid=function(r,ri){ return o.rowId ? o.rowId(r) : ri; };   /* 예전 표와 같은 값 (rowId 없으면 이 쪽 안 차례) */
    var fset=(o.filters||[]).some(function(f){ return st.f[f.k]!==undefined && st.f[f.k]!==""; });
    /* 위 한 줄 — 넓은 찾기 칸 · 상태 칩 · 거르기 알약 · «20개씩» (1.12 워시 모양) */
    var h='<div class="cgg-ttop"><label class="cgg-find"><input id="'+o.id+'_q" data-q="1" placeholder="'+esc(o.find||"검색")+'" value="'+esc(st.q)+'" aria-label="검색"></label>'+
      (tabs?'<div class="cgg-tchips" role="group" aria-label="상태로 거르기">'+tabs.map(function(t){
        var n=base.filter(function(r){ return !t[0] || tabVal(r)===t[0]; }).length;
        return '<button type="button" class="cgg-fp'+(st.tab===t[0]?' on':'')+'" data-tab="'+esc(t[0])+'" aria-pressed="'+(st.tab===t[0])+'">'+esc(t[1])+' <b>'+n+'</b></button>'; }).join("")+'</div>':'')+
      (o.filters||[]).filter(function(f){ return !(tabs && /상태/.test(String(f.label||"")) && !o.tabs); }).map(function(f){
        var cur=st.f[f.k]===undefined?"":String(st.f[f.k]);
        return '<span class="cgg-fp jfp'+(cur?' on':'')+'"><select data-fp="'+esc(f.k)+'" aria-label="'+esc(f.label)+'">'+f.opts.map(function(op){
          return '<option value="'+esc(op[0])+'"'+(cur===String(op[0])?" selected":"")+'>'+esc(op[1])+'</option>'; }).join("")+'</select></span>'; }).join("")+
      (fset?'<button type="button" class="cgg-fp" id="'+o.id+'_fclr">거르기 지우기 ✕</button>':'')+
      '<span class="sp"></span><select class="cgg-size" id="'+o.id+'_size" data-size="1" aria-label="한 번에 보일 개수">'+[5,10,20,30,50].map(function(z){
         return '<option value="'+z+'"'+(z===st.size?' selected':'')+'>'+z+'개씩</option>'; }).join("")+'</select></div>';
    /* 표 (넓은 화면) — 고르기 칸 없음(F18) · 첫 칸 틀 고정 · 칸 머리 = 정렬 단추 */
    /* 칸 너비: 종류별 공통 값, 글자 칸은 화면이 준 너비(w) — 다 합쳐 본문보다 넓으면 표 안에서만 옆으로 움직여요(1.13.2 F04) */
    function cw(x){ return TWID[x.kind]||Number(x.c.w)||140; }
    var tw=shown.reduce(function(t,x){ return t+cw(x); },0)+(actCols.length?TWID.act:0);
    h+='<div class="cgg-card"><div class="cgg-twrap"><table class="cgg-table" style="min-width:'+tw+'px"><colgroup>'+shown.map(function(x){ return '<col style="width:'+cw(x)+'px">'; }).join("")+
       (actCols.length?'<col style="width:'+TWID.act+'px">':'')+'</colgroup><thead><tr>'+
       shown.map(function(x,j){ var c=x.c, on=st.key===c.k;
         return '<th class="'+(j===0?'fx1 fx0less ':'')+(x.kind==="money"||x.kind==="num"?'n':x.kind==="state"?'c':'')+'" aria-sort="'+(on?(st.dir==="asc"?"ascending":"descending"):"none")+'">'+
           (c.nosort?esc(c.label):'<button type="button" class="cgg-sortb" data-k="'+esc(c.k)+'">'+esc(c.label)+'<i class="so" aria-hidden="true">'+(on?(st.dir==="asc"?'▲':'▼'):'↕')+'</i></button>')+'</th>'; }).join("")+
       (actCols.length?'<th class="c" style="cursor:default">할 일</th>':'')+'</tr></thead><tbody>'+
       (view.length?view.map(function(r,ri){ var id=rid(r,ri);
         return '<tr data-id="'+esc(id)+'"'+(o.onRow?' style="cursor:pointer"':'')+'>'+
           shown.map(function(x,j){ var k=x.kind;
             return '<td class="'+(j===0?'fx1 fx0less':k==="money"||k==="num"?'n':k==="state"?'c':'')+(x.c.mono?' mono':'')+'">'+cellX(x,r)+'</td>'; }).join("")+
           (actCols.length?'<td class="c cgg-acts-cell">'+actsH(r)+'</td>':'')+'</tr>'; }).join("")
         :'<tr><td colspan="'+(shown.length+(actCols.length?1:0))+'" class="cgg-empty">'+emptyTxt()+'</td></tr>')+
       '</tbody></table></div>';
    /* 폰 목록: 이름 · 번호 / «이름표: 값» 3칸 / 줄 버튼 */
    var nameX=shown[0], idX=shown.filter(function(x){ return x.kind==="id" && MF.every(function(m){ return m.x!==x; }); })[0];
    var sorts=shown.filter(function(x){ return !x.c.nosort && x.kind!=="state"; }).map(function(x){ var d=/^(money|num|date|time)$/.test(x.kind)?"desc":"asc";
      return [x.c.k,d,String(x.c.label||"")+(x.kind==="money"||x.kind==="num"?" 큰 순":d==="desc"?" 최근 순":" 가나다 순")]; });
    var hasCur=sorts.some(function(s){ return s[0]===st.key && s[1]===st.dir; });
    var curCol=st.key?o.cols.filter(function(c){ return c.k===st.key; })[0]:null;
    h+='<div class="cgg-mlist"><div class="cgg-mhead"><span>정렬</span>'+
       (sorts.length?'<select data-msort="1" aria-label="정렬">'+(hasCur?'':'<option value="'+esc(st.key)+','+esc(st.dir)+'" selected>'+(curCol?esc(curCol.label)+(st.dir==="asc"?' ▲':' ▼'):'처음 차례')+'</option>')+
         sorts.map(function(s){ return '<option value="'+esc(s[0])+','+s[1]+'"'+(st.key===s[0]&&st.dir===s[1]?' selected':'')+'>'+esc(s[2])+'</option>'; }).join("")+'</select>':'')+'</div>'+
       (view.length?view.map(function(r,ri){ var id=rid(r,ri), a=actsH(r);
         return '<div class="cgg-mrow" data-id="'+esc(id)+'"'+(o.onRow?' style="cursor:pointer"':'')+'>'+
           '<span class="t"><b>'+esc(tStrip(cellH(nameX.c,r)))+(idX?'<span>'+esc(tStrip(cellH(idX.c,r)))+'</span>':'')+'</b>'+
           '<span class="cgg-mf">'+MF.map(function(m){ return '<span class="'+(m.x.kind==="money"||m.x.kind==="num"?'n':'')+'"><i>'+esc(m.label)+'</i>'+cellX(m.x,r)+'</span>'; }).join("")+'</span></span>'+
           (a?'<span class="ra">'+a+'</span>':'')+'</div>'; }).join("")
         :'<div class="cgg-empty">'+emptyTxt()+'</div>')+'</div></div>';
    /* 아래 쪽 넘김 — 처음 · 이전 · 1 / 1 · 모두 N건 · 다음 · 맨뒤 */
    h+='<div class="cgg-pager"><button type="button" class="cgg-btn" data-p="1"'+(st.page<=1?' disabled':'')+'>처음</button>'+
       '<button type="button" class="cgg-btn" data-p="'+(st.page-1)+'"'+(st.page<=1?' disabled':'')+'>이전</button><span>'+st.page+' / '+pages+' · 모두 '+total+'건</span>'+
       '<button type="button" class="cgg-btn" data-p="'+(st.page+1)+'"'+(st.page>=pages?' disabled':'')+'>다음</button>'+
       '<button type="button" class="cgg-btn" data-p="'+pages+'"'+(st.page>=pages?' disabled':'')+'>맨뒤</button></div>';
    host.classList.remove("cgg-card"); host.classList.add("cgg-tblock","nosel");
    host.innerHTML=h;
    restore(old);
    bind();
    if(focusK){ var fb=host.querySelector('.cgg-sortb[data-k="'+focusK+'"]'); if(fb) try{ fb.focus({preventScroll:true}); }catch(e){} }
  }
  function bind(){
    function on(sel,ev,fn){ Array.prototype.forEach.call(host.querySelectorAll(sel),function(n){ n[ev]=function(e){ fn(n,e); }; }); }
    on(".cgg-ttop [data-tab]","onclick",function(n){ st.tab=n.getAttribute("data-tab"); st.page=1; draw(); });
    on(".cgg-sortb[data-k]","onclick",function(n){ var k=n.getAttribute("data-k"), c=o.cols.filter(function(x){ return x.k===k; })[0]; if(!c||c.nosort) return;
      if(st.key===k) st.dir=(st.dir==="asc"?"desc":"asc"); else { st.key=k; st.dir="asc"; } draw(k); });
    on(".cgg-pager [data-p]","onclick",function(n){ st.page=Number(n.getAttribute("data-p"))||1; draw(); });
    on("[data-msort]","onchange",function(n){ var p2=n.value.split(","); st.key=p2[0]; st.dir=p2[1]||"asc"; st.page=1; draw(); });
    on("[data-size]","onchange",function(n){ st.size=Number(n.value)||20; st.page=1; draw(); });
    on("[data-fp]","onchange",function(n){ st.f[n.getAttribute("data-fp")]=n.value; st.page=1; draw(); });
    var fc=$(o.id+"_fclr"); if(fc) fc.onclick=function(){ st.f={}; st.page=1; draw(); };
    var qi=$(o.id+"_q"), cmp=false;
    function find(){ var n0=$(o.id+"_q"); if(!n0) return; var pos=n0.selectionStart; st.q=n0.value; st.page=1; draw(); var n=$(o.id+"_q"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } }
    if(qi){ qi.addEventListener("compositionstart",function(){ cmp=true; });   /* 1.13.2 F15 — 한글 조합 중엔 그대로, 조합이 끝나면 찾아요 */
      qi.addEventListener("compositionend",function(){ cmp=false; find(); });
      qi.oninput=function(e){ if(cmp||e.isComposing){ st.q=qi.value; return; } find(); }; }
    if(o.onRow) on("tbody tr[data-id],.cgg-mrow[data-id]","onclick",function(n,ev){
      var t=ev.target; if(t && (t.tagName==="INPUT"||t.tagName==="SELECT"||t.closest("button,.cgg-btn,.btn,a"))) return;
      o.onRow(n.getAttribute("data-id")); });
  }
  draw();
}
