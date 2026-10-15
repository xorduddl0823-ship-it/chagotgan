/* =========================================================
   표 만들기 — 관리 v4.4 · 디자인 «표 완성 기준» 10가지 (cgg-j4 1.4 CGG.table 과 같은 모양 · 같은 이름표)
   부르는 쪽(23곳)은 그대로: makeTable({id, cols:[{k,label,w,num,html,nosort,mono,sortVal,kind}], rows, search, filters, checks, bulk, onRow, rowId,
                                         tabs:[[값,이름]…], tabOf:function(row){값}, size})
   CGG.table 과 다른 점은 «관리만 있는 것»뿐: 칸 안 꼬리표(html) · 줄 누르면 자세히(onRow) · 거르기 알약이 실제로 걸러요 · 줄 버튼 누르는 일을 다시 그려도 지켜요
   ========================================================= */
var TSTATE = {};
var TWID = {name:180,id:130,text:0,date:96,num:96,money:130,state:104,time:84,act:120};
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
  var host = $(o.id);
  if(!host) return;
  /* 칸 차례: 선택 → 이름 → 번호 → 내용 → 날짜 → 금액 → 상태 → 할 일 (같은 종류 안에서는 원래 차례) */
  var NAMERX=/^(업체명|업체|이름|서비스|제목|받는 업체|표 이름|어디|휴대폰)$/;
  var ni=-1; o.cols.forEach(function(c,i){ if(ni<0 && !c.kind && NAMERX.test(String(c.label||""))) ni=i; }); if(ni<0) ni=0;
  var sample=(o.rows||[]).slice(0,8);
  var cols=o.cols.map(function(c,i){ var k=i===ni?"name":tKind(c,i);
      if(k!=="act" && c.html && sample.some(function(r){ return /class="(?:cgg-)?btn[ "]/.test(String(c.html(r)||"")); }) && !/상태/.test(String(c.label||""))) k="act";
      return {c:c,kind:k,i:i}; });
  var si=-1; cols.forEach(function(x){ if(x.kind==="state"){ if(si<0) si=x.i; else x.kind="text"; } });
  var actCols=cols.filter(function(x){ return x.kind==="act"; });
  var shown=cols.filter(function(x){ return x.kind!=="act"; }).sort(function(a,b){ return (TRANK[a.kind]-TRANK[b.kind]) || (a.i-b.i); });
  var stateCol=si>=0?o.cols[si]:null;
  function cellH(c,r){ return c.html ? String(c.html(r)==null?"":c.html(r)) : esc(r[c.k]==null?"":r[c.k]); }
  function stateTxt(r){ return stateCol?tStrip(cellH(stateCol,r)):""; }
  function tabVal(r){ return o.tabOf ? String(o.tabOf(r)) : stateTxt(r); }
  function val(r,c){ return c.sortVal ? c.sortVal(r) : r[c.k]; }
  function actsH(r){ var h=actCols.map(function(x){ return cellH(x.c,r); }).join("");
    return h.replace(/class="btn sm( danger| primary)?"/g,function(_,d){ return 'class="cgg-btn sm'+(d===" danger"?" danger":"")+'"'; })
            .replace(/class="btn( danger| primary)?"/g,function(_,d){ return 'class="cgg-btn sm'+(d===" danger"?" danger":"")+'"'; }); }
  function stateH(r){ var h=tChipify(cellH(stateCol,r));
    return /cgg-st/.test(h) ? h : (tStrip(h)?'<span class="cgg-st '+tTone(tStrip(h))+'">'+h+'</span>':''); }
  /* 다시 그려도 줄 버튼이 하는 일 지키기 — data-… 값이 같은 새 버튼에 그대로 */
  function keep(){ var m={}; Array.prototype.forEach.call(host.querySelectorAll("button,span.cgg-btn,span.btn"),function(b){ if(!b.onclick) return;
      for(var i=0;i<b.attributes.length;i++){ var a=b.attributes[i]; if(a.name.indexOf("data-")===0 && !/^data-(f|k|p|q|i|ck|all|size|tab|fp)$/.test(a.name)){ m[a.name+"\u0001"+a.value]=b.onclick; break; } } }); return m; }
  function restore(m){ Array.prototype.forEach.call(host.querySelectorAll("button,span.cgg-btn,span.btn"),function(b){
      for(var i=0;i<b.attributes.length;i++){ var a=b.attributes[i], f=m[a.name+"\u0001"+a.value]; if(f){ b.onclick=f; break; } } }); }

  function draw(){
    var old=keep();
    var base=(o.rows||[]).slice();
    (o.filters||[]).forEach(function(f){ var v=st.f[f.k]; if(v===undefined||v==="") return;
      base=base.filter(function(r){ return String(f.get?f.get(r):r[f.k])===String(v); }); });
    var q=st.q.trim().toLowerCase();
    if(q && o.search && o.search.length) base=base.filter(function(r){ return o.search.some(function(k){ return String(r[k]==null?"":r[k]).toLowerCase().indexOf(q)>=0; }); });
    /* 상태 탭 + 개수 */
    var tabs=null;
    if(o.tabs) tabs=o.tabs;
    else if(stateCol){ var cnt={}; (o.rows||[]).forEach(function(r){ var t=tabVal(r); if(t) cnt[t]=(cnt[t]||0)+1; });
      tabs=[["","전체"]].concat(Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; }).slice(0,5).map(function(t){ return [t,t]; })); }
    var rows=base.filter(function(r){ return !st.tab || tabVal(r)===st.tab; });
    if(st.key){ var col=o.cols.filter(function(c){ return c.k===st.key; })[0];
      if(col) rows.sort(function(a,b){ var x=val(a,col), y=val(b,col); if(x==null) x=""; if(y==null) y="";
        if(typeof x==="number" && typeof y==="number") return st.dir==="asc"?x-y:y-x;
        x=String(x); y=String(y); return st.dir==="asc"?x.localeCompare(y,"ko"):y.localeCompare(x,"ko"); }); }
    var total=rows.length, pages=Math.max(1,Math.ceil(total/st.size)); if(st.page>pages) st.page=pages;
    var view=rows.slice((st.page-1)*st.size, st.page*st.size);
    var rid=function(r,ri){ return o.rowId ? o.rowId(r) : ri; };   /* 예전 표와 같은 값 (rowId 없으면 이 쪽 안 차례) */
    var all=view.length && view.every(function(r,ri){ return st.sel[rid(r,ri)]; });
    var fset=(o.filters||[]).some(function(f){ return st.f[f.k]!==undefined && st.f[f.k]!==""; });
    var h='';
    if(tabs) h+='<div class="cgg-tabsH" role="tablist">'+tabs.map(function(t){
        var n=base.filter(function(r){ return !t[0] || tabVal(r)===t[0]; }).length;
        return '<button type="button" role="tab" data-tab="'+esc(t[0])+'" aria-selected="'+(st.tab===t[0])+'">'+esc(t[1])+'<b>'+n+'</b></button>'; }).join("")+'</div>';
    /* 거르기 알약 · 검색 (상태로 거르는 것은 위 탭이 맡아요) */
    h+='<div class="cgg-filters">'+(o.filters||[]).filter(function(f){ return !(tabs && /상태/.test(String(f.label||"")) && !o.tabs); }).map(function(f){
        var cur=st.f[f.k]===undefined?"":String(st.f[f.k]);
        return '<span class="cgg-fp jfp'+(cur?' on':'')+'"><select data-fp="'+esc(f.k)+'" aria-label="'+esc(f.label)+'">'+f.opts.map(function(op){
          return '<option value="'+esc(op[0])+'"'+(cur===String(op[0])?" selected":"")+'>'+esc(op[1])+'</option>'; }).join("")+'</select></span>'; }).join("")+
      (fset?'<button type="button" class="cgg-fp" id="'+o.id+'_fclr">거르기 지우기 ✕</button>':'')+
      (o.bulk?'<button type="button" class="cgg-btn sm danger" id="'+o.id+'_bulk">고른 줄 처리</button>':'')+
      '<span class="sp"></span><label class="cgg-find">'+CGG.ic("search")+'<input id="'+o.id+'_q" data-q="1" placeholder="검색" value="'+esc(st.q)+'" aria-label="검색"></label></div>';
    /* 표 (넓은 화면) */
    h+='<div class="cgg-twrap"><table class="cgg-table"><colgroup><col style="width:56px">'+shown.map(function(x){ return '<col'+(TWID[x.kind]?' style="width:'+TWID[x.kind]+'px"':'')+'>'; }).join("")+
       (actCols.length?'<col style="width:'+TWID.act+'px">':'')+'</colgroup><thead><tr><th class="fx0"><input type="checkbox" data-all="1" aria-label="전체 선택"'+(all?' checked':'')+'></th>'+
       shown.map(function(x,j){ var c=x.c, on=st.key===c.k;
         return '<th data-k="'+esc(c.k)+'" class="'+(j===0?'fx1 ':'')+(x.kind==="money"||x.kind==="num"?'n':x.kind==="state"?'c':'')+'"'+(c.nosort?' style="cursor:default"':'')+
           ' aria-sort="'+(on?(st.dir==="asc"?"ascending":"descending"):"none")+'">'+esc(c.label)+(on?(st.dir==="asc"?' ↑':' ↓'):'')+'</th>'; }).join("")+
       (actCols.length?'<th class="c" style="cursor:default">할 일</th>':'')+'</tr></thead><tbody>'+
       (view.length?view.map(function(r,ri){ var id=rid(r,ri);
         return '<tr data-id="'+esc(id)+'"'+(o.onRow?' style="cursor:pointer"':'')+'><td class="fx0"><input type="checkbox" data-ck="'+esc(id)+'"'+(st.sel[id]?' checked':'')+' aria-label="선택"></td>'+
           shown.map(function(x,j){ var k=x.kind;
             return '<td class="'+(j===0?'fx1':k==="money"||k==="num"?'n':k==="state"?'c':'')+(x.c.mono?' mono':'')+'">'+(k==="state"?stateH(r):tChipify(cellH(x.c,r)))+'</td>'; }).join("")+
           (actCols.length?'<td class="c cgg-acts-cell">'+actsH(r)+'</td>':'')+'</tr>'; }).join("")
         :'<tr><td colspan="'+(shown.length+1+(actCols.length?1:0))+'" class="cgg-empty">'+esc((typeof o.empty==="function"?o.empty(o.rows||[]):o.empty)||"조건에 맞는 자료가 없어요.")+'</td></tr>')+
       '</tbody></table></div>';
    /* 폰 목록: 이름 · 번호 / 둘째 줄 / 금액 · 상태 / 줄 버튼 */
    var nameX=shown[0], idX=shown.filter(function(x){ return x.kind==="id"; })[0], monX=shown.filter(function(x){ return x.kind==="money"; })[0];
    var restX=shown.filter(function(x){ return x!==nameX && x!==idX && x!==monX && x.kind!=="state"; });
    var sortable=shown.filter(function(x){ return !x.c.nosort; });
    h+='<div class="cgg-mlist"><div class="cgg-mhead"><input type="checkbox" data-all="1" aria-label="전체 선택"'+(all?' checked':'')+'>전체 선택'+
       (sortable.length?'<select data-msort="1" aria-label="정렬">'+sortable.map(function(x){ var up=x.kind==="money"||x.kind==="date"||x.kind==="num"?"desc":"asc";
         return '<option value="'+esc(x.c.k)+','+up+'"'+(st.key===x.c.k&&st.dir===up?' selected':'')+'>'+esc(x.c.label)+(up==="desc"?" 큰 · 최근 순":" 순")+'</option>'; }).join("")+'</select>':'')+'</div>'+
       (view.length?view.map(function(r,ri){ var id=rid(r,ri), a=actsH(r);
         return '<div class="cgg-mrow" data-id="'+esc(id)+'"'+(o.onRow?' style="cursor:pointer"':'')+'><input type="checkbox" data-ck="'+esc(id)+'"'+(st.sel[id]?' checked':'')+' aria-label="선택">'+
           '<span class="t"><b>'+esc(tStrip(cellH(nameX.c,r)))+(idX?'<span>'+esc(tStrip(cellH(idX.c,r)))+'</span>':'')+'</b>'+
           '<small>'+esc(restX.map(function(x){ return tStrip(cellH(x.c,r)); }).filter(Boolean).join(" · "))+'</small></span>'+
           '<span class="r">'+(monX?'<b>'+esc(tStrip(cellH(monX.c,r)))+'</b>':'')+(stateCol?stateH(r):'')+'</span>'+(a?'<span class="ra">'+a+'</span>':'')+'</div>'; }).join("")
         :'<div class="cgg-empty">'+esc((typeof o.empty==="function"?o.empty(o.rows||[]):o.empty)||"조건에 맞는 자료가 없어요.")+'</div>')+'</div>';
    /* 아래 쪽: 총 N건 · N개씩 보기 · 이전 / 다음 */
    h+='<div class="cgg-pager"><span>총 '+total+'건</span><span class="sp"></span><select id="'+o.id+'_size" data-size="1" aria-label="한 번에 보일 개수">'+[5,10,20,30,50].map(function(z){
         return '<option value="'+z+'"'+(z===st.size?' selected':'')+'>'+z+'개씩 보기</option>'; }).join("")+'</select>'+
       '<button type="button" class="cgg-btn" data-p="'+(st.page-1)+'"'+(st.page<=1?' disabled':'')+'>이전</button><span>'+st.page+' / '+pages+'</span>'+
       '<button type="button" class="cgg-btn" data-p="'+(st.page+1)+'"'+(st.page>=pages?' disabled':'')+'>다음</button></div>';
    host.classList.add("cgg-card");
    host.innerHTML=h;
    restore(old);
    bind(view);
  }
  function bind(view){
    function on(sel,ev,fn){ Array.prototype.forEach.call(host.querySelectorAll(sel),function(n){ n[ev]=function(e){ fn(n,e); }; }); }
    on("[data-tab]","onclick",function(n){ st.tab=n.getAttribute("data-tab"); st.page=1; draw(); });
    on("thead th[data-k]","onclick",function(n){ var k=n.getAttribute("data-k"), c=o.cols.filter(function(x){ return x.k===k; })[0]; if(!c||c.nosort) return;
      if(st.key===k) st.dir=(st.dir==="asc"?"desc":"asc"); else { st.key=k; st.dir="asc"; } draw(); });
    on("[data-p]","onclick",function(n){ st.page=Number(n.getAttribute("data-p"))||1; draw(); });
    on("[data-msort]","onchange",function(n){ var p2=n.value.split(","); st.key=p2[0]; st.dir=p2[1]; st.page=1; draw(); });
    on("[data-size]","onchange",function(n){ st.size=Number(n.value)||20; st.page=1; draw(); });
    on("[data-fp]","onchange",function(n){ st.f[n.getAttribute("data-fp")]=n.value; st.page=1; draw(); });
    var fc=$(o.id+"_fclr"); if(fc) fc.onclick=function(){ st.f={}; st.page=1; draw(); };
    on("[data-ck]","onchange",function(n){ st.sel[n.getAttribute("data-ck")]=n.checked; draw(); });
    on("[data-all]","onchange",function(n){ host.querySelectorAll(".cgg-twrap [data-ck]").forEach(function(c){ st.sel[c.getAttribute("data-ck")]=n.checked; }); draw(); });
    on("[data-ck]","onclick",function(n,e){ e.stopPropagation(); });
    var qi=$(o.id+"_q");
    if(qi) qi.oninput=function(){ var pos=qi.selectionStart; st.q=qi.value; st.page=1; draw(); var n=$(o.id+"_q"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } };
    var bk=$(o.id+"_bulk");
    if(bk) bk.onclick=function(){ var ids=Object.keys(st.sel).filter(function(k){ return st.sel[k]; });
      if(!ids.length) return toast("먼저 왼쪽 네모칸을 체크해 주세요",true);
      o.bulk(ids,function(){ st.sel={}; }); };
    if(o.onRow) on("tbody tr[data-id],.cgg-mrow[data-id]","onclick",function(n,ev){
      var t=ev.target; if(t && (t.tagName==="INPUT"||t.tagName==="SELECT"||t.closest("button,.cgg-btn,.btn,a"))) return;
      o.onRow(n.getAttribute("data-id")); });
  }
  draw();
}
