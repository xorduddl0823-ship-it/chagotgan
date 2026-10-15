"""체크 v34 → 체크 v35 새 판 — 표 23개를 「표 완성 기준」(디자인/공통/README.md · cgg-j4 1.4)에 맞춤.
쓰는 법: python3 체크/도구/만들기_체크_v35.py   (저장소의 v34 파일을 읽기만)
바꾸는 것 (총괄 · 디자인 방 2026-10-15 「tableBlock 속을 CGG.table 로」):
  1) 공통 부품 1.3 → 1.4 (디자인/공통 글자 그대로 · CSS 는 style 맨 끝 · JS 는 제품 스크립트보다 먼저 — 자리는 v34 그대로)
  2) tableBlock() 이 CGG.table 과 똑같은 틀을 그림 — 상태 탭 + 개수 · 거르기 · 검색 · 열 너비(colgroup) · 머리줄 40 · 줄 50 ·
     직접 그린 네모 20 · 이름 칸 고정 · 금액 오른쪽 · 상태 가운데 · 할 일 칸(줄 버튼) · 폰 목록 · 총 N건 · N개씩 보기 · 이전/다음
     열 차례는 종류(이름 → 번호 → 내용 → 날짜 → 금액 → 상태 → 할 일)로 자동 정렬
     체크 고유 꼬리표(tag)는 공통 네 가지 색(cgg-st run/done/chk/stop)으로
  3) 표 상태(찾기 · 쪽 · 정렬 · 고른 줄)는 예전처럼 ts(id) 에 — 화면을 다시 그려도 그대로, picked(id) · 버튼 연결도 그대로
  4) 줄 안 버튼(계산서 고치기 · 보기 · 안 받음 / 계좌 빼기) → 할 일 칸 작은 흰 버튼 (opt.actions)
  5) 예전 표 CSS 가 공통 표에 새지 않게 범위를 좁힘
기능(서버 부르기 · 계산)은 그대로 — 그리는 부분만 바꿈
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v34.html"
OUT = BASE + "2_차곳간_체크_index_v35.html"
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1) 공통 부품 1.4
m = re.search(r'<style id="cgg-j4-common">\n.*?\n</style>', s, re.S)
s = s[:m.start()] + '<style id="cgg-j4-common">\n' + CSS + '\n</style>' + s[m.end():]
m = re.search(r'<script>\n/\* ═+\n   차곳간 공통 부품 · J안 4판 · cgg-j4 .*?\nvar CGG = \(function\(\)\{.*?\n\}\)\(\);\n\n?</script>', s, re.S)
if not m: raise SystemExit("공통 부품 JS 덩어리를 못 찾음")
s = s[:m.start()] + "<script>\n" + JS + "\n</script>" + s[m.end():]
if 'version:"cgg-j4 1.4"' not in s: raise SystemExit("1.4 가 안 들어감")

# 2) tableBlock — CGG.table 과 같은 틀
a = s.index("function tableBlock(id, cols, rows, opt){")
b = s.index("function wireTable(id, redraw){")
c = s.index("/* 그 표에서 고른 줄의 열쇠값 (고른 순서대로) */")
NEW_TB = r'''/* v35: 표 — 공통 부품 CGG.table 과 똑같은 틀 (디자인/공통 README 「표 완성 기준」 열 가지)
   부르는 쪽은 예전 그대로: cols [{k,t,name,num,mid,fmt, kind?, state?}] · rows [{…}] · opt {pick, filters, tools, actions}
   열 종류(kind): name 180 · id 130 · text(나머지) · date 96 · money 130 · state 104 · 할 일 120 — 차례도 이 순서로 */
var TB_WID={name:180,id:130,text:0,date:96,money:130,state:104,time:84,act:120};
var TB_RANK={name:0,id:1,text:2,date:3,time:3,money:4,state:5};
var TB_IDK=/^(plate|tel|biz|acctNo|bankCode|code|no|corpNum)$/;
function tbPlain(h){   /* 글자만 — template 안에서 읽어 그림 · 스크립트가 움직이지 않음 */
  var t=document.createElement("template"); t.innerHTML=String(h==null?"":h); return (t.content.textContent||"").replace(/\s+/g," ").trim(); }
/* 체크 꼬리표(.tag 색) → 공통 상태 칩 네 가지 색 */
function tbChip(h){
  return String(h).replace(/<span class="tag" style="background:var\(--(good|warn|danger|brand|chip)(?:-soft)?\);?\s*color:var\(--[a-z-]+\)"([^>]*)>/g,
    function(_,c,rest){ return '<span class="cgg-st '+({good:"done",warn:"chk",danger:"stop",brand:"run",chip:"stop"})[c]+'"'+rest+'>'; })
    .replace(/<span class="tag" style="background:var\(--(good|warn|danger|brand)-soft\);color:var\(--\1\)"/g, function(_,c){
      return '<span class="cgg-st '+({good:"done",warn:"chk",danger:"stop",brand:"run"})[c]+'"'; });
}
function tbKind(c, rows){
  if(c.kind) return c.kind;
  if(c.name) return "name";
  if(c.state) return "state";
  if(c.num) return "money";
  if(TB_IDK.test(c.k)) return "id";
  var seen=0, ok=true;
  for(var i=0;i<rows.length && seen<30;i++){ var v=rows[i][c.k]; if(v==null||v==="") continue; seen++;
    if(!/^\d{4}[-.]\d{2}([-.]\d{2})?$/.test(String(v).trim())){ ok=false; break; } }
  return (seen && ok) ? "date" : "text";
}
function tableBlock(id, cols, rows, opt){
  opt=opt||{};
  var s=ts(id);
  /* 열 차례: 이름 → 번호 → 내용 → 날짜 → 금액 → 상태 (같은 종류끼리는 예전 차례) */
  var K=cols.map(function(c,i){ return {c:c, i:i, kind:tbKind(c,rows)}; });
  K.sort(function(x,y){ return (TB_RANK[x.kind]-TB_RANK[y.kind]) || (x.i-y.i); });
  cols=K.map(function(x){ return x.c; });
  var kinds=K.map(function(x){ return x.kind; });
  var si=kinds.indexOf("state"), mi=kinds.indexOf("money");
  function cellHtml(c,r){ return tbChip(c.fmt?c.fmt(r[c.k],r):esc(r[c.k]==null?"":r[c.k])); }
  function stateOf(r){ return si<0?"":tbPlain(cellHtml(cols[si],r)); }

  var q=s.q.trim().toLowerCase();
  var all=!q?rows.slice():rows.filter(function(r){
    if(String(r._q==null?"":r._q).toLowerCase().indexOf(q)>=0) return true;
    return cols.some(function(c){
      return String(r[c.k]==null?"":r[c.k]).toLowerCase().indexOf(q)>=0; }); });
  /* 상태 탭 — 상태 칸이 있는 표만 (전체 + 나오는 값 차례대로 · 개수) */
  var tabs=[];
  if(si>=0){ var seenT={}; tabs.push(["","전체",rows.length]);
    rows.forEach(function(r){ var v=stateOf(r); if(!v) return; if(!seenT[v]){ seenT[v]=1; tabs.push([v,v,0]); } });
    tabs.forEach(function(t){ if(t[0]) t[2]=rows.filter(function(r){ return stateOf(r)===t[0]; }).length; });
    if(s.tf && !seenT[s.tf]) s.tf="";
    if(s.tf) all=all.filter(function(r){ return stateOf(r)===s.tf; }); }
  if(s.sort){
    var cc=cols.filter(function(x){return x.k===s.sort;})[0];
    all.sort(function(a,b){
      var x=a[s.sort],y=b[s.sort];
      if(cc&&cc.num) return ((Number(x)||0)-(Number(y)||0))*s.dir;
      return String(x==null?"":x).localeCompare(String(y==null?"":y),"ko")*s.dir; });
  }
  if([5,10,20,30,50].indexOf(s.per)<0) s.per=10;
  var pages=Math.max(1,Math.ceil(all.length/s.per));
  if(s.page>pages) s.page=pages;
  var view=all.slice((s.page-1)*s.per, s.page*s.per);
  function rk(r,i){ return String(r.id||r.name||r.plate||r.dest||((s.page-1)*s.per+i)); }
  var allOn=view.length>0 && view.every(function(r,i){ return s.sel[rk(r,i)]; });
  var hasAct=!!opt.actions;
  function acts(r){ var A=(opt.actions&&opt.actions(r))||[];
    return A.slice(0,2).map(function(x){ return '<button type="button" class="cgg-btn sm'+(x.danger?' danger':'')+'" data-act="'+esc(x.key||"")+'"'+
      (x.attr?' '+x.attr+'="'+esc(x.val==null?"":x.val)+'"':'')+(x.disabled?' disabled':'')+'>'+esc(x.label)+'</button>'; }).join(""); }

  var h='<div class="tblk cgg-card" id="'+id+'-blk">';
  if(si>=0) h+='<div class="cgg-tabsH" role="tablist">'+tabs.map(function(t){
      return '<button type="button" role="tab" data-tf="'+esc(t[0])+'" aria-selected="'+((s.tf||"")===t[0])+'">'+esc(t[1])+'<b>'+t[2]+'</b></button>'; }).join("")+'</div>';
  h+='<div class="cgg-filters">'+(opt.filters||"")+(opt.tools||"").replace(/class="btn( |")/g,'class="cgg-btn btn$1')+'<span class="sp"></span>'+
     '<label class="cgg-find">'+CGG.ic("search")+'<input id="'+id+'-q" data-q="1" placeholder="표에서 찾기" value="'+esc(s.q)+'" aria-label="검색"></label></div>';
  /* 넓은 화면 — 표 */
  h+='<div class="cgg-twrap"><table class="cgg-table"><colgroup><col style="width:56px">'+kinds.map(function(k){
      return '<col'+(TB_WID[k]?' style="width:'+TB_WID[k]+'px"':'')+'>'; }).join("")+(hasAct?'<col style="width:'+(opt.actWidth||TB_WID.act)+'px">':'')+'</colgroup>';
  h+='<thead><tr><th class="fx0"><input type="checkbox" id="'+id+'-all" data-all="1" aria-label="전체 선택"'+(allOn?' checked':'')+'></th>';
  cols.forEach(function(c,k){
    var kd=kinds[k];
    h+='<th data-sk="'+esc(c.k)+'" class="'+(k===0?'fx1 ':'')+(kd==="money"?'n':kd==="state"?'c':'')+'" aria-sort="'+
       (s.sort===c.k?(s.dir>0?"ascending":"descending"):"none")+'">'+esc(c.t)+(s.sort===c.k?(s.dir>0?' ↑':' ↓'):'')+'</th>';
  });
  if(hasAct) h+='<th class="c" style="cursor:default">할 일</th>';
  h+='</tr></thead><tbody>';
  if(!view.length) h+='<tr><td colspan="'+(cols.length+1+(hasAct?1:0))+'" class="cgg-empty">'+
    (q||s.tf?"조건에 맞는 자료가 없어요.":"아직 자료가 없어요.")+'</td></tr>';
  view.forEach(function(r,i){
    var key=rk(r,i);
    h+='<tr><td class="fx0"><input type="checkbox" class="pk" data-k="'+esc(key)+'"'+(s.sel[key]?" checked":"")+' aria-label="'+esc(tbPlain(cellHtml(cols[0],r)))+' 선택"></td>';
    cols.forEach(function(c,k){
      var kd=kinds[k];
      h+='<td class="'+(k===0?'fx1':kd==="money"?'n':kd==="state"?'c':'')+'">'+cellHtml(c,r)+'</td>';
    });
    if(hasAct) h+='<td class="c cgg-acts-cell">'+acts(r)+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  /* 폰 — 목록 (이름 · 둘째 칸 / 나머지 한 줄 / 금액 · 상태 / 줄 버튼) */
  /* 폰 정렬 고르기 — 이름순 · 금액 높은순 · 날짜 최신순 (있는 칸만) */
  var SO=[[cols[0].k,1,esc(cols[0].t)+"순"]];
  if(mi>=0) SO.push([cols[mi].k,-1,esc(cols[mi].t)+" 높은순"]);
  var di=kinds.indexOf("date"); if(di>=0) SO.push([cols[di].k,-1,esc(cols[di].t)+" 최신순"]);
  h+='<div class="cgg-mlist"><div class="cgg-mhead"><input type="checkbox" data-all="1" aria-label="전체 선택"'+(allOn?' checked':'')+'>전체 선택'+
     '<select data-msort="1" aria-label="정렬"><option value="">기본 차례</option>'+SO.map(function(x){
       return '<option value="'+esc(x[0])+','+x[1]+'"'+(s.sort===x[0]&&s.dir===x[1]?' selected':'')+'>'+x[2]+'</option>'; }).join("")+'</select></div>';
  h+= view.length ? view.map(function(r,i){
      var key=rk(r,i), sub=cols[1]&&kinds[1]!=="money"&&kinds[1]!=="state"?tbPlain(cellHtml(cols[1],r)):"";
      var rest=cols.map(function(c,k){ return (k<2||k===si||k===mi)?"":tbPlain(cellHtml(c,r)); }).filter(Boolean).join(" · ");
      var ra=hasAct?acts(r):"";
      return '<div class="cgg-mrow"><input type="checkbox" class="pk" data-k="'+esc(key)+'"'+(s.sel[key]?" checked":"")+' aria-label="선택">'+
        '<span class="t"><b>'+cellHtml(cols[0],r)+(sub?'<span>'+esc(sub)+'</span>':'')+'</b><small>'+esc(rest)+'</small></span>'+
        '<span class="r">'+(mi>=0?'<b>'+cellHtml(cols[mi],r)+'</b>':'')+(si>=0?cellHtml(cols[si],r):'')+'</span>'+
        (ra?'<span class="ra">'+ra+'</span>':'')+'</div>'; }).join("")
    : '<div class="cgg-empty">'+(q||s.tf?"조건에 맞는 자료가 없어요.":"아직 자료가 없어요.")+'</div>';
  h+='</div>';
  /* 아래 쪽 — 총 N건 · N개씩 보기 · 이전 / 다음 */
  h+='<div class="cgg-pager"><span>총 '+won(all.length)+'건</span><span class="sp"></span><select id="'+id+'-per" data-size="1" aria-label="한 번에 보일 개수">'+
     [5,10,20,30,50].map(function(n){ return '<option value="'+n+'"'+(s.per===n?" selected":"")+'>'+n+'개씩 보기</option>'; }).join("")+'</select>'+
     '<button type="button" class="cgg-btn" data-pg="'+(s.page-1)+'"'+(s.page<=1?" disabled":"")+'>이전</button><span>'+s.page+' / '+pages+'</span>'+
     '<button type="button" class="cgg-btn" data-pg="'+(s.page+1)+'"'+(s.page>=pages?" disabled":"")+'>다음</button></div>';
  h+='</div>';
  return h;
}
function wireTable(id, redraw){
  var s=ts(id), q=$(id+"-q"), per=$(id+"-per");
  /* 이 표의 울타리 — 여기 안에 있는 것만 묶습니다.
     예전에는 화면 전체를 묶어서, 한 화면에 표가 둘이면
     아래 표가 위 표의 체크 · 쪽넘김을 빼앗아 갔습니다. */
  var box=$(id+"-blk");
  function inBox(sel){ return box ? box.querySelectorAll(sel) : []; }

  if(q){ var t=null; q.oninput=function(){ clearTimeout(t); t=setTimeout(function(){
    s.q=q.value; s.page=1; redraw();
    var e=$(id+"-q"); if(e){ e.focus(); e.setSelectionRange(e.value.length,e.value.length); } },200); }; }
  if(per) per.onchange=function(){ s.per=Number(per.value); s.page=1; redraw(); };

  inBox("[data-tf]").forEach(function(b){   /* v35: 상태 탭 */
    b.onclick=function(){ s.tf=b.getAttribute("data-tf")||""; s.page=1; redraw(); };
  });
  inBox("[data-msort]").forEach(function(sel){   /* v35: 폰 정렬 */
    sel.onchange=function(){ var v=sel.value.split(","); s.sort=v[0]||""; s.dir=Number(v[1])||1; s.page=1; redraw(); };
  });
  inBox("th[data-sk]").forEach(function(th){
    th.onclick=function(){ var k=th.getAttribute("data-sk");
      if(s.sort===k) s.dir=-s.dir; else { s.sort=k; s.dir=1; } redraw(); };
  });
  inBox("[data-pg]").forEach(function(b){
    b.onclick=function(){ s.page=Number(b.getAttribute("data-pg"))||1; redraw(); };
  });
  /* 표와 폰 목록에 같은 줄이 두 번 있음 — 하나를 바꾸면 짝도 같이 */
  function syncAll(){
    var ks={}; [].slice.call(inBox(".pk")).forEach(function(x){ ks[x.getAttribute("data-k")]=1; });
    var on=Object.keys(ks).length>0 && Object.keys(ks).every(function(k){ return !!s.sel[k]; });
    inBox("[data-all]").forEach(function(a){ a.checked=on; });
  }
  inBox(".pk").forEach(function(c){
    c.onchange=function(){
      var k=c.getAttribute("data-k");
      if(c.checked) s.sel[k]=true; else delete s.sel[k];
      inBox(".pk").forEach(function(x){ if(x.getAttribute("data-k")===k) x.checked=c.checked; });
      syncAll();
    };
  });
  inBox("[data-all]").forEach(function(all){
    all.onchange=function(){
      inBox(".pk").forEach(function(c){
        c.checked=all.checked; var k=c.getAttribute("data-k");
        if(all.checked) s.sel[k]=true; else delete s.sel[k];
      });
      syncAll();
    };
  });
  syncAll();
}
'''
s = s[:a] + NEW_TB + s[c:]

# 3) 줄 안 버튼 → 할 일 칸 (계산서 · 계좌)
rep('''      {k:"id",t:"",fmt:function(v,r){
        return /발급|전송/.test(r.state)
          ? '<button class="btn small" data-txfix="'+esc(v)+'">고치기</button> '+
            '<button class="btn small" data-txpop="'+esc(v)+'">보기</button>'
          : '<button class="btn small" data-txskip="'+esc(v)+'">'+(r.skip?"다시 받기":"안 받음")+'</button>';}}
    ], TAXES, {pick:true,''',
    '''    ], TAXES, {pick:true, actWidth:150,
      actions:function(r){ return /발급|전송/.test(r.state)   /* v35: 줄 버튼은 할 일 칸 */
          ? [{key:"fix",label:"고치기",attr:"data-txfix",val:r.id},{key:"pop",label:"보기",attr:"data-txpop",val:r.id}]
          : [{key:"skip",label:(r.skip?"다시 받기":"안 받음"),attr:"data-txskip",val:r.id}]; },''')
rep('''      {k:"lastAt",t:"마지막 가져온 때",fmt:function(v){return v?esc(v):'<span style="color:var(--muted)">아직</span>';}},
      {k:"id",t:"",fmt:function(v){return '<button class="btn small danger" data-bdel="'+esc(v)+'">빼기</button>';}}
    ], BANKS, {})''',
    '''      {k:"lastAt",t:"마지막 가져온 때",fmt:function(v){return v?esc(v):'<span style="color:var(--muted)">아직</span>';}}
    ], BANKS, {actions:function(r){ return [{key:"del",label:"빼기",danger:true,attr:"data-bdel",val:r.id}]; }})''')
# 상태 칸 표시 (탭 · 가운데 · 칩)
for old, new in [
    ('''        {k:"state",t:"상태",fmt:tag}
      ], late,''', '''        {k:"state",t:"상태",state:true,fmt:tag}
      ], late,'''),
    ('''      {k:"state",t:"상태",fmt:tag}
    ], DEPS,''', '''      {k:"state",t:"상태",state:true,fmt:tag}
    ], DEPS,'''),
    ('''      {k:"sendState",t:"발송",fmt:function(v){''', '''      {k:"sendState",t:"발송",state:true,fmt:function(v){'''),
    ('''      {k:"state",t:"발급 상태",fmt:function(v,r){''', '''      {k:"state",t:"발급 상태",state:true,fmt:function(v,r){'''),
    ('''      {k:"state",t:"할 일",mid:true,fmt:function(v){''', '''      {k:"state",t:"맞춰 본 결과",state:true,fmt:function(v){'''),
    ('''      {k:"alarm",t:"알림",fmt:function(v){''', '''      {k:"alarm",t:"알림",state:true,fmt:function(v){'''),
    ('''      {k:"writeDate",t:"작성일자",fmt:function(v,r){''', '''      {k:"writeDate",t:"작성일자",kind:"id",fmt:function(v,r){'''),
]:
    rep(old, new)
# 칸 안 버튼(.btn.small)은 더 이상 없음 — 계산서 줄 오른쪽 «보기»는 할 일 칸에서 같은 data-* 로 연결됨

# 4) 체크 상태 칩 색 — tag() 도 공통 칩으로 (표 밖 꼬리표도 같은 네 가지 색)
rep('''function tag(t){
  var c = t==="완납"||t==="맞춤" ? "background:var(--good-soft);color:var(--good)"
        : t==="미납"||t==="확인 대기" ? "background:var(--danger-soft);color:var(--danger)"
        : "background:var(--warn-soft);color:var(--warn)";
  return '<span class="tag" style="'+c+'">'+esc(t)+'</span>';
}''', '''function tag(t){   /* v35: 공통 상태 칩 네 가지 색 — 완납 · 맞춤 = 완료, 미납 · 확인 대기 = 보류(빨강 대신), 나머지 = 확인 필요 */
  var k = t==="완납"||t==="맞춤" ? "done" : t==="미납"||t==="확인 대기" ? "stop" : "chk";
  return '<span class="cgg-st '+k+'">'+esc(t)+'</span>';
}''')

# 5) 예전 표 CSS 가 공통 표에 새지 않게
for old, new in [
    ("table{border-collapse:separate;border-spacing:0;width:100%;min-width:760px;font-size:14px}",
     "table:not(.cgg-table){border-collapse:separate;border-spacing:0;width:100%;min-width:760px;font-size:14px}"),
    ("th,td{padding:11px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--surface)}",
     ":not(.cgg-table)>*>tr>th,:not(.cgg-table)>*>tr>td{padding:11px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--surface)}"),
    ("thead th{background:var(--surface2);font-size:12.5px;color:var(--muted);font-weight:800;cursor:pointer;",
     ":not(.cgg-table)>thead th{background:var(--surface2);font-size:12.5px;color:var(--muted);font-weight:800;cursor:pointer;"),
    ("\ntbody tr{cursor:pointer}", "\n:not(.cgg-table)>tbody tr{cursor:pointer}"),
    ("\ntbody tr:hover td{background:var(--surface2)}", "\n:not(.cgg-table)>tbody tr:hover td{background:var(--surface2)}"),
]:
    rep(old, new)
# 거르기 고르기 칸 · 표 위 일괄 버튼 — 공통 거르기 줄 모양(알약 · 흰 버튼)으로
rep('''.cgg-right .me{position:relative}''', '''.cgg-right .me{position:relative}
/* v35: 표 거르기 줄 — 체크의 고르기 칸은 알약 모양, 일괄 버튼은 공통 흰 버튼 (공통 표에 «일괄 버튼» 칸이 없어 여기서) */
.cgg-filters select{height:32px;min-height:0;width:auto;border:1px dashed var(--ln2);border-radius:999px;padding:0 13px;font:inherit;font-size:13px;color:var(--btn-ink);background:var(--surface);cursor:pointer}
.cgg-filters button.cgg-btn.btn{height:32px;min-height:0;padding:0 12px;font-size:13px;font-weight:700;border-radius:9px;border:1px solid var(--ln2);background:var(--surface);color:var(--btn-ink)}
.cgg-filters button.cgg-btn.btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}
.cgg-filters button.cgg-btn.btn.danger{color:var(--stop)}
.cgg-table .cgg-st+.b{display:block;font-size:10.5px;color:var(--muted);line-height:1.2}
.cgg-table td .two{display:flex;flex-direction:column;line-height:1.25}
.cgg-table td>.a,.cgg-table td>.b{display:block;line-height:1.25;overflow:hidden;text-overflow:ellipsis}
.cgg-table td>.b,.cgg-table td .two .b{font-size:11.5px;font-weight:600;color:var(--muted)}
/* 표 상자 안은 공통 예시와 같은 바탕 글자(글꼴 · 15px · 줄 간격 기본) — 대조 차이 0 */
/* 예전 .card 안에 표가 있으면 카드 속 카드가 되지 않게 — 표를 카드 가장자리까지 */
.card>.tblk.cgg-card{margin:14px -16px 0;border-radius:0;box-shadow:none;border-top:1px solid var(--line)}
.card>.tblk.cgg-card:first-child{margin-top:-16px;border-top:0;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0}
.card>.tblk.cgg-card:last-child{margin-bottom:-16px;border-bottom-left-radius:inherit;border-bottom-right-radius:inherit}
.card:has(>.tblk.cgg-card){overflow:hidden;border:0;background:var(--surface);border-radius:var(--r-card);box-shadow:var(--sh);margin:0 0 16px}
@media (max-width:600px){ .card:has(>.tblk.cgg-card){border-radius:14px;margin-bottom:10px} }
.tblk .cgg-pager select,.tblk .cgg-mhead select{width:auto;min-height:0}
.tblk.cgg-card{font-family:"Noto Sans KR",-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:normal}''')

rep('''  $("hdVer").textContent="체크 v34 · "''', '''  $("hdVer").textContent="체크 v35 · "''')
if 'class="tablebox"><table><thead>\'+\n' in s: pass
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
