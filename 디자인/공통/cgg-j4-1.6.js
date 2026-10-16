/* ═══════════════════════════════════════════════════════════════════
   차곳간 공통 부품 · J안 4판 · cgg-j4 1.6 (2026-10-16, 디자인 방 · 초안)
   1.6 바뀐 것: 표 rowId(줄 id로 고르기) · render 기본 esc({html} 일 때만 HTML) · 창 열 때 화면이 아래로 안 밀림 · 숫자 카드 has-sp · 아이콘 refresh · alert
   ① 메뉴 배치 셋  ② 폰 아래 탭바  ③ 홈 할 일 카드 3장  ④ 사람 단추 ▾ 펼침 (1.1)  ⑤ 체험 모드 (1.2)  ⑥ 본문 (1.3)
   바탕: 관리 v4.0 의 관리/v4재료/j4.js. 관리 전용 이름(TAB · render · NAV)에 묶이지 않게
         «무엇을 보여 줄지»와 «눌렀을 때 할 일»을 제품이 넘겨 주는 식으로 바꿨어요.
   서버를 부르지 않아요. 저장은 «이 기기에만»(localStorage) — 못 쓰면 가로 메뉴로 그냥 보여요.

   쓰는 법 (이 파일 내용을 제품 스크립트보다 «먼저» 따로 <script> 하나로 넣고, 제품 스크립트 안에서)
     CGG.layout.init(document.querySelector(".cgg-app"), "cgg_check_layout");   // 저장 이름은 제품마다
     CGG.layout.chooser(상자, function(v){ 창 닫기 · 알림 });                     // 화면 설정 창 안에 고르기 칸 그리기
     CGG.tabbar(document.querySelector(".cgg-tbar"),
       [{key:"home",icon:"home",label:"홈"}, … 5칸], 지금 key, function(key){ 화면 이동 });
     CGG.todos(document.querySelector(".cgg-acts"),
       [{tone:"chk",icon:"car",title:"출고 확인 3대",sub:"한빛모터스 외 2곳 · 오늘"}, … 3장], function(i){ 그 화면으로 });
     CGG.menu(사람단추, {name:"홍길순", role:"대표"}, [                                    // 1.1
       {key:"me",icon:"user",label:"마이페이지"}, {key:"trash",icon:"trash",label:"휴지통",count:3}, "-",
       {key:"lay",icon:"pc",label:"화면 설정",note:CGG.layout.name()}, "-", {key:"out",icon:"out",label:"로그아웃"}], function(key){ … });
     CGG.badge(사람단추, 3);   // 사람 단추 위 빨간 개수 (0이면 숨김)
   tone: run(파랑 · 진행 중) · chk(주황 · 확인 필요) · stop(빨강 · 보류)
   ═══════════════════════════════════════════════════════════════════ */
var CGG = (function(){
  var IC = {
    home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    car:'<path d="M3 17h18v-4l-2.2-5.2A1.5 1.5 0 0 0 17.4 7H6.6a1.5 1.5 0 0 0-1.4.8L3 13z"/><path d="M7 17v2M17 17v2M3 13h18"/>',
    wallet:'<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z"/><path d="M3 7l11-4v4M16 14h2"/>',
    receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    file:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    chart:'<path d="M5 20V11M12 20V5M19 20v-6M3 20h18"/>',
    shop:'<path d="M4 10h16v10H4zM3 10l2-6h14l2 6M9 20v-5h6v5"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.4-1.4M5.6 18.4L7 17M17 17l1.4 1.4M5.6 5.6L7 7"/>',
    box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    today:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    out:'<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>', in:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    pc:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    down:'<path d="M12 4v12M6 12l6 6 6-6M4 20h16"/>', plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',   /* 1.6 새로고침 */
    alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'          /* 1.6 경고 (확인 필요) */
  };
  function ic(n){ return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+(IC[n]||"")+'</svg>'; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function store(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }

  /* ① 메뉴 배치 — 문구는 워시 원본 LY_INFO 그대로 */
  var LAYS=[["top","가로 메뉴","메뉴가 화면 위에 가로로 놓여요. 지금까지 쓰던 모습이에요."],
            ["side","세로 메뉴","메뉴가 왼쪽에 세로로 놓여요. 메뉴 이름이 다 보여서 찾기 쉬워요."],
            ["icon","아이콘 메뉴","왼쪽에 아이콘만 놓여요. 화면을 가장 넓게 쓸 수 있어요."]];
  var layout = { app:null, key:"cgg_layout",
    init:function(app,key){ this.app=app; if(key) this.key=key; this.apply(this.get()); },
    get:function(){ var v=store(this.key); return (v==="side"||v==="icon")?v:"top"; },
    set:function(v){ store(this.key,v); this.apply(v); },
    apply:function(v){ if(!this.app) return; this.app.classList.remove("lay-top","lay-side","lay-icon"); this.app.classList.add("lay-"+v); },
    name:function(v){ for(var i=0;i<LAYS.length;i++) if(LAYS[i][0]===(v||this.get())) return LAYS[i][1]; return ""; },
    chooser:function(box,done){ var self=this, cur=this.get();
      box.innerHTML='<div class="cgg-lays" role="group" aria-label="메뉴 배치">'+LAYS.map(function(x){
        return '<button type="button" data-lay="'+x[0]+'" aria-pressed="'+(x[0]===cur)+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>'; }).join("")+'</div>';
      Array.prototype.forEach.call(box.querySelectorAll("[data-lay]"),function(b){
        b.onclick=function(){ var v=b.getAttribute("data-lay"); self.set(v);
          Array.prototype.forEach.call(box.querySelectorAll("[data-lay]"),function(o){ o.setAttribute("aria-pressed", String(o===b)); });
          if(done) done(v); }; }); }
  };

  /* ② 폰 아래 탭바 — 5칸 (홈 + 주요 3칸 + 전체) */
  function tabbar(el, items, current, onPick){
    if(!el) return;
    el.setAttribute("aria-label","아래 메뉴");
    el.innerHTML=items.map(function(t){ return '<button type="button" data-tb="'+esc(t.key)+'"'+(t.key===current?' class="on" aria-current="page"':'')+'>'+ic(t.icon)+'<span>'+esc(t.label)+'</span></button>'; }).join("");
    Array.prototype.forEach.call(el.children,function(b){ b.onclick=function(){ onPick && onPick(b.getAttribute("data-tb")); }; });
  }

  /* ③ 홈 할 일 카드 3장 — 굵은 한 줄 + 작은 설명 한 줄 */
  function todos(el, items, onPick){
    if(!el) return;
    el.innerHTML=items.slice(0,3).map(function(t,i){ return '<button type="button" class="cgg-act" data-act="'+i+'"><span class="ico '+esc(t.tone||"run")+'">'+ic(t.icon||"file")+'</span>'
      +'<span class="tx"><b>'+esc(t.title)+'</b><small>'+esc(t.sub||"")+'</small></span><span class="ar" aria-hidden="true">→</span></button>'; }).join("");
    Array.prototype.forEach.call(el.querySelectorAll("[data-act]"),function(b){ b.onclick=function(){ onPick && onPick(+b.getAttribute("data-act")); }; });
  }
  /* ④ 사람 단추 ▾ 펼침 (1.1) — 단추 아래(자리가 없으면 위)에 열리고, 바깥 누르기 · Esc · 화면 크기 바뀜에 닫혀요 */
  var drop=null, dropBtn=null;
  function closeMenu(){ if(drop){ drop.hidden=true; } if(dropBtn){ dropBtn.setAttribute("aria-expanded","false"); var b=dropBtn; dropBtn=null; return b; } }
  function menu(btn, who, items, onPick){
    btn.setAttribute("aria-haspopup","menu"); btn.setAttribute("aria-expanded","false");
    btn.addEventListener("click", function(e){ e.stopPropagation();
      if(dropBtn===btn){ closeMenu(); return; }
      if(!drop){ drop=document.createElement("div"); drop.className="cgg-drop"; drop.setAttribute("role","menu"); drop.hidden=true; document.body.appendChild(drop);
        drop.addEventListener("click", function(ev){ ev.stopPropagation(); }); }
      var list=typeof items==="function"?items():items;
      drop.innerHTML=(who?'<div class="who"><b>'+esc(who.name)+'</b>'+esc(who.role||"")+'</div><hr>':'')+list.map(function(x){
        if(x==="-") return '<hr>';
        return '<button type="button" role="menuitem" data-mk="'+esc(x.key)+'">'+ic(x.icon)+esc(x.label)
          +(x.count?'<span class="cnt">'+esc(x.count)+'</span>':x.note?'<small>'+esc(x.note)+'</small>':'')+'</button>'; }).join("");
      drop.hidden=false; dropBtn=btn; btn.setAttribute("aria-expanded","true");
      var r=btn.getBoundingClientRect(), w=drop.offsetWidth, h=drop.offsetHeight;
      drop.style.left=Math.min(window.innerWidth-w-8, Math.max(8, r.right-w))+"px";
      drop.style.top=(r.bottom+6+h>window.innerHeight ? Math.max(8, r.top-6-h) : r.bottom+6)+"px";
      Array.prototype.forEach.call(drop.querySelectorAll("[data-mk]"), function(b){
        b.onclick=function(){ var k=b.getAttribute("data-mk"); closeMenu(); onPick && onPick(k); }; });
      var f=drop.querySelector("[data-mk]"); if(f) f.focus({preventScroll:true});
    });
  }
  document.addEventListener("click", function(){ closeMenu(); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape"){ var b=closeMenu(); if(b) b.focus(); } });
  window.addEventListener("resize", function(){ closeMenu(); });
  function badge(btn, n){ var i=btn.querySelector(".cgg-badge"); if(!n){ if(i) i.remove(); return; }
    if(!i){ i=document.createElement("i"); i.className="cgg-badge"; if(getComputedStyle(btn).position==="static") btn.style.position="relative"; btn.appendChild(i); }
    i.textContent=n; i.setAttribute("aria-label","휴지통 "+n+"건"); }


  /* ⑤ 체험 모드 (1.2) — 미리 써 보기(가입 전) · 체험판(결제 전)이 같은 모양을 씀.
     모양만 맡아요. 진짜 잠금 · 횟수 세기는 서버가 해요 (체험판). 미리 써 보기는 저장 자체가 없어요.
     mode: "preview"(가입 전 — 버튼 글 «무료로 시작하기») · "trial"(결제 전 — «요금제 보기») */
  var trial = { mode:"trial", used:{}, key:"",
    init:function(mode, key){ this.mode=mode||"trial"; this.key=key||""; if(this.key){ try{ this.used=JSON.parse(localStorage.getItem(this.key)||"{}")||{}; }catch(e){ this.used={}; } } },
    left:function(n){ return 3-(this.used[n]||0); },
    use:function(n){ if(this.left(n)<=0) return false; this.used[n]=(this.used[n]||0)+1; if(this.key){ try{ localStorage.setItem(this.key, JSON.stringify(this.used)); }catch(e){} } return true; },
    cta:function(){ return this.mode==="preview"?"무료로 시작하기":"요금제 보기"; },
    band:function(o){ o=o||{}; var pct=o.seen&&o.total?Math.round(o.seen/o.total*100):0;
      return '<div class="cgg-trial" role="note"><span class="tag">'+(this.mode==="preview"?"미리 써 보기":"체험판")+'</span><span class="tx"><b>'+esc(o.title||"예시 자료로 모든 화면을 둘러보고 있어요.")+'</b>'
        +'<small>'+esc(o.sub||"자물쇠가 있는 버튼은 "+(this.mode==="preview"?"가입하고 결제하면":"결제하면")+" 열려요. 편한 기능은 기능마다 3번까지 써 볼 수 있어요.")+'</small>'
        +(o.total?'<span class="prog" aria-label="둘러본 화면 '+o.seen+' / '+o.total+'"><i style="width:'+pct+'%"></i></span>':'')+'</span>'
        +'<button type="button" class="go" data-cgg-cta="1">'+this.cta()+'</button></div>'; },
    lockMark:function(){ return '<span class="cgg-lock" aria-label="잠김">'+ic("lock")+'</span>'; },
    chip:function(n){ var l=this.left(n); return '<span class="cgg-left'+(l?'':' out')+'">'+(l?l+'번 남음':'다 씀')+'</span>'; },
    /* 기능 카드: list = [[기능, "lock"|"try"|"see", 한 줄 소개], …] */
    card:function(list){ var self=this, L={lock:"잠금",try:"3번",see:"보기"};
      return '<div class="cgg-cls"><h3>이 화면에서 할 수 있는 것<small>'+(this.mode==="preview"?"미리 써 보기":"체험판")+'</small></h3>'+list.map(function(x){ var k=x[1];
        return '<div class="cgg-clsrow"><span class="cgg-k '+k+'">'+(k==="lock"?ic("lock"):'')+L[k]+'</span><span class="nm"><b>'+esc(x[0])+'</b>'+(x[2]?'<small>'+esc(x[2])+'</small>':'')+'</span>'
          +(k==="see"?'<span class="st">늘 열려 있어요</span>': k==="lock"?'<button type="button" data-cgg-lock="'+esc(x[0])+'">'+ic("lock")+'결제 후 사용</button>'
            :'<button type="button" data-cgg-try="'+esc(x[0])+'">써 보기'+self.chip(x[0])+'</button>')+'</div>'; }).join("")+'</div>'; },
    /* 창 안에 넣을 글 — 창 틀은 각 제품의 확인 창(400)을 그대로 씀 */
    lockText:function(n, tx){ return {title:"결제하면 쓸 수 있는 기능이에요", rows:[["기능",n],["하는 일",tx||"결제하면 바로 쓸 수 있어요."],["지금","예시 화면을 둘러볼 수 있어요"]], ok:this.cta()}; },
    usedText:function(n){ return {title:"무료로 3번 모두 쓰셨어요", desc:"«"+n+"»은(는) 결제하면 횟수 제한 없이 쓸 수 있어요.", rows:[["기능",n],["쓴 횟수","3번 / 3번"]], ok:this.cta()}; }
  };


  /* ═════════ ⑥ 본문 (1.3) — 화면 일곱 칸의 ②⑤⑥⑦ + 창 3종 + 알림 글 ═════════ */
  function won(n){ return (Number(n)||0).toLocaleString("ko-KR"); }
  var ST={"진행 중":"run","완료":"done","확인 필요":"chk","보류":"stop"};
  /* 상태 칩 — map 을 주면 제품 고유 단계(예: 딜러 입고 · 작업 중 · 출고 · 도착)도 공통 네 가지 색으로 */
  function status(v, map){ var k=(map&&map[v])||ST[v]||"run"; return '<span class="cgg-st '+k+'">'+esc(v)+'</span>'; }
  /* ② 화면 머리: {crumb, title(HTML 허용 — 숫자는 <em>), desc, acts:[{label,icon,pri,id,disabled}]} */
  function head(o){
    return '<div class="cgg-head"><div class="hello">'+(o.crumb?'<small>'+esc(o.crumb)+'</small>':'')+'<h1>'+(o.title||"")+'</h1>'+(o.desc?'<p>'+esc(o.desc)+'</p>':'')+'</div>'
      +((o.acts&&o.acts.length)?'<div class="acts">'+o.acts.map(function(a){ return '<button type="button" class="cgg-btn'+(a.pri?' pri':'')+'"'+(a.id?' id="'+esc(a.id)+'"':'')+(a.disabled?' disabled':'')+'>'+(a.icon?ic(a.icon):'')+esc(a.label)+(a.after||'')+'</button>'; }).join("")+'</div>':'')+'</div>';
  }
  /* ⑤ 숫자 카드 4개: [{label, value, unit, delta, down, spark:[…], color}] */
  function spark(a,c){ if(!a||a.length<2) return ""; var mx=Math.max.apply(null,a), mn=Math.min.apply(null,a);
    var pts=a.map(function(v,i){ return (i/(a.length-1)*72).toFixed(1)+","+(2+(1-(v-mn)/((mx-mn)||1))*22).toFixed(1); }).join(" ");
    return '<svg class="sp" viewBox="0 0 72 26" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>'; }
  function kpis(el, items){ if(!el) return;
    el.className="cgg-kpis";
    el.innerHTML=items.slice(0,4).map(function(k){ var c=k.color||"#1668C4";
      return '<div class="cgg-kpi'+(k.spark&&k.spark.length>1?' has-sp':'')+'"><small><i style="background:'+c+'"></i>'+esc(k.label)+'</small>'+spark(k.spark,c)
        +'<strong>'+esc(k.value)+'<em>'+esc(k.unit||"")+'</em></strong>'+(k.delta!=null?'<span class="tr'+(k.down?' dn':'')+'">'+esc(k.delta)+' <span>지난주보다</span></span>':'')+'</div>'; }).join(""); }
  /* ⑥ 데이터 카드 — 표 열 차례: 선택 → 이름 → 번호 → 내용 → 날짜 → 금액 → 상태 (열 너비는 kinds 로 자동)
     o = {cols:[이름…], kinds:["name","id","text","date","money","state","time"], rows:[[…]], tabs:[[값,이름]…](상태 탭, 빈 값=전체),
          stateMap, filters:["입고일: 최근 7일 ✕", …], sorts:[[열번호,1|-1,"이름"]…], mline:function(row){폰 둘째 줄},
          onName:function(row,i){자세히 창}, onSelect:function(골라진 줄 번호들){} , size:10, find:"검색",
          actions:function(row,i){ return [{key:"refund",label:"환불"}] },   // 1.4 줄 버튼 — 맨 오른쪽 «할 일» 칸 (없으면 칸도 없음)
          onAction:function(key,row,i){},
          // 1.5 (체크 방 요청)
          bulk:[{key:"del",label:"선택한 줄 지우기",needSel:true,danger:true},{key:"xls",label:"엑셀 다운로드",icon:"down"}],  // 표 위 일괄 버튼 (거르기 줄 오른쪽)
          onBulk:function(key, 골라진 줄 번호들){},
          state:{},        // 넘겨 두면 화면을 다시 그려도 찾기 · 쪽 · 정렬 · 고른 줄이 남아요 (제품의 전역 변수 하나)
          // 1.6
          rowId:function(row,i){ return 줄 id },   // 주면 고른 줄을 id로 기억 — 자료를 다시 불러와도 같은 줄이 골라져 있고, 없어진 줄은 저절로 빠져요.
                                                // onSelect · onBulk 에 줄 번호 대신 id 목록이 와요. (안 주면 1.5처럼 줄 번호)
          render:function(row,k){ return 글자 | {html:"…"} | undefined }   // 1.6: 글자는 늘 esc 돼요. HTML이 꼭 필요할 때만 {html:…} — 그 안의 사용자 글은 직접 CGG.esc
        } */
  var WID={name:180,id:130,text:0,date:96,money:130,state:104,time:84,act:150};
  function table(el, o){ if(!el) return;
    var T=o.state||{}; if(T.q==null){ T.f=""; T.q=""; T.k=0; T.dir=1; T.size=o.size||10; T.page=1; T.sel={}; }
    var si=o.kinds.indexOf("state"), mi=o.kinds.indexOf("money");
    function list(){ var q=T.q.trim();
      var r=o.rows.map(function(x,i){ return {x:x,i:i}; }).filter(function(w){ return (!T.f||w.x[si]===T.f)&&(!q||w.x.join(" ").indexOf(q)>=0); });
      r.sort(function(a,b){ var A=a.x[T.k],B=b.x[T.k]; return (A>B?1:A<B?-1:0)*T.dir; }); return r; }
    function cnt(f){ return o.rows.filter(function(x){ return !f||x[si]===f; }).length; }
    function kid(x,i){ return o.rowId?"r"+String(o.rowId(x,i)):String(i); }   /* 앞에 r — id 가 «__proto__» 같아도 안전하게 */
    /* 1.6 — 고른 줄: rowId 가 있으면 id 로, 지금 자료에 없는 줄은 빼요 (다시 불러오면 저절로 정리) */
    function selList(){ var ok=Object.create(null); o.rows.forEach(function(x,i){ ok[kid(x,i)]=1; });
      var l=Object.keys(T.sel).filter(function(k){ return T.sel[k]===true&&ok[k]===1; }); return o.rowId?l.map(function(k){ return k.slice(1); }):l.map(Number); }
    function cell(x,k){ var v=x[k], kd=o.kinds[k];
      if(o.render){ var h=o.render(x,k); if(h!==undefined&&h!==null) return (typeof h==="object"&&h.html!=null)?String(h.html):esc(h); }
      if(kd==="money") return Number(v)?won(v)+'원':'—';
      if(kd==="state") return status(v,o.stateMap);
      return esc(v); }
    /* 줄 버튼: 한 줄에 둘까지(작은 흰 버튼). 셋 이상이면 자세히 창으로 */
    function acts(x,i){ var a=(o.actions&&o.actions(x,i))||[];
      return a.slice(0,2).map(function(b){ return '<button type="button" class="cgg-btn sm'+(b.danger?' danger':'')+'" data-act="'+esc(b.key)+'" data-ai="'+i+'"'+(b.disabled?' disabled':'')+'>'+esc(b.label)+'</button>'; }).join(""); }
    function draw(){
      var r=list(), pages=Math.max(1,Math.ceil(r.length/T.size)); if(T.page>pages) T.page=pages;
      var v=r.slice((T.page-1)*T.size, T.page*T.size); v.forEach(function(w){ w.k=kid(w.x,w.i); }); var all=v.length&&v.every(function(w){ return T.sel[w.k]; });
      var tabs=o.tabs||[["","전체"],["진행 중","진행 중"],["확인 필요","확인 필요"],["보류","보류"],["완료","완료"]];
      el.className="cgg-card";
      el.innerHTML=(si>=0?'<div class="cgg-tabsH" role="tablist">'+tabs.map(function(t){ return '<button type="button" role="tab" data-f="'+esc(t[0])+'" aria-selected="'+(T.f===t[0])+'">'+esc(t[1])+'<b>'+cnt(t[0])+'</b></button>'; }).join("")+'</div>':'')
        +'<div class="cgg-filters">'+(o.filters||[]).map(function(f,i){ return '<button type="button" class="cgg-fp'+(i?'':' on')+'">'+esc(f)+'</button>'; }).join("")+'<span class="sp"></span>'
        +(o.bulk||[]).map(function(b){ var n=selList().length; return '<button type="button" class="cgg-btn sm'+(b.danger?' danger':'')+'" data-bulk="'+esc(b.key)+'"'+(b.needSel&&!n?' disabled':'')+'>'+(b.icon?ic(b.icon):'')+esc(b.label)+(b.needSel&&n?' ('+n+')':'')+'</button>'; }).join("")
        +'<label class="cgg-find">'+ic("search")+'<input data-q="1" placeholder="'+esc(o.find||"검색")+'" value="'+esc(T.q)+'" aria-label="검색"></label></div>'
        +'<div class="cgg-twrap"><table class="cgg-table"><colgroup><col style="width:56px">'+o.kinds.map(function(k){ return '<col'+(WID[k]?' style="width:'+WID[k]+'px"':'')+'>'; }).join("")+(o.actions?'<col style="width:'+(o.actWidth||WID.act)+'px">':'')+'</colgroup>'
        +'<thead><tr><th class="fx0"><input type="checkbox" data-all="1" aria-label="전체 선택"'+(all?' checked':'')+'></th>'
        +o.cols.map(function(c,k){ return '<th data-k="'+k+'" class="'+(k===0?'fx1 ':'')+(o.kinds[k]==="money"?'n':o.kinds[k]==="state"?'c':'')+'" aria-sort="'+(T.k===k?(T.dir>0?"ascending":"descending"):"none")+'">'+esc(c)+(T.k===k?(T.dir>0?' ↑':' ↓'):'')+'</th>'; }).join("")+(o.actions?'<th class="c" style="cursor:default">할 일</th>':'')+'</tr></thead><tbody>'
        +(v.length?v.map(function(w){ var x=w.x; return '<tr><td class="fx0"><input type="checkbox" data-i="'+esc(w.k)+'"'+(T.sel[w.k]?' checked':'')+' aria-label="'+esc(x[0])+' 선택"></td>'
          +o.cols.map(function(c,k){ var kd=o.kinds[k]; return '<td class="'+(k===0?'fx1':kd==="money"?'n':kd==="state"?'c':'')+'">'+(k===0&&o.onName?'<button type="button" class="nm" data-nm="'+w.i+'">'+esc(x[0])+'</button>':cell(x,k))+'</td>'; }).join("")+(o.actions?'<td class="c cgg-acts-cell">'+acts(x,w.i)+'</td>':'')+'</tr>'; }).join("")
          :'<tr><td colspan="'+(o.cols.length+1+(o.actions?1:0))+'" class="cgg-empty">조건에 맞는 자료가 없어요.</td></tr>')+'</tbody></table></div>'
        +'<div class="cgg-mlist"><div class="cgg-mhead"><input type="checkbox" data-all="1" aria-label="전체 선택"'+(all?' checked':'')+'>전체 선택'
        +(o.sorts?'<select data-sort="1" aria-label="정렬">'+o.sorts.map(function(s2){ return '<option value="'+s2[0]+','+s2[1]+'"'+(T.k===s2[0]&&T.dir===s2[1]?' selected':'')+'>'+esc(s2[2])+'</option>'; }).join("")+'</select>':'')+'</div>'
        +(v.length?v.map(function(w){ var x=w.x; return '<div class="cgg-mrow"><input type="checkbox" data-i="'+esc(w.k)+'"'+(T.sel[w.k]?' checked':'')+' aria-label="'+esc(x[0])+' 선택">'
          +'<span class="t"><b>'+(o.onName?'<button type="button" class="nm" data-nm="'+w.i+'" style="border:0;background:none;font:inherit;font-weight:700;color:inherit;padding:0;cursor:pointer">'+esc(x[0])+'</button>':esc(x[0]))+'<span>'+esc(x[1])+'</span></b><small>'+esc(o.mline?o.mline(x):x.slice(2,si>=0?Math.min(si,mi>=0?mi:si):x.length).join(" · "))+'</small></span>'
          +'<span class="r">'+(mi>=0?'<b>'+cell(x,mi)+'</b>':'')+(si>=0?status(x[si],o.stateMap):'')+'</span>'+(o.actions&&acts(x,w.i)?'<span class="ra">'+acts(x,w.i)+'</span>':'')+'</div>'; }).join(""):'<div class="cgg-empty">조건에 맞는 자료가 없어요.</div>')+'</div>'
        +'<div class="cgg-pager"><span>총 '+r.length+'건</span><span class="sp"></span><select data-size="1" aria-label="한 번에 보일 개수">'+[5,10,20,30,50].map(function(z){ return '<option value="'+z+'"'+(z===T.size?' selected':'')+'>'+z+'개씩 보기</option>'; }).join("")+'</select>'
        +'<button type="button" class="cgg-btn" data-p="'+(T.page-1)+'"'+(T.page<=1?' disabled':'')+'>이전</button><span>'+T.page+' / '+pages+'</span><button type="button" class="cgg-btn" data-p="'+(T.page+1)+'"'+(T.page>=pages?' disabled':'')+'>다음</button></div>';
      function on(sel,ev,fn){ Array.prototype.forEach.call(el.querySelectorAll(sel),function(n){ n[ev]=function(e){ fn(n,e); }; }); }
      on("[data-f]","onclick",function(n){ T.f=n.getAttribute("data-f"); T.page=1; draw(); });
      on("[data-k]","onclick",function(n){ var k=+n.getAttribute("data-k"); T.dir=T.k===k?-T.dir:1; T.k=k; draw(); });
      on("[data-p]","onclick",function(n){ T.page=+n.getAttribute("data-p"); draw(); });
      on("[data-i]","onchange",function(n){ T.sel[n.getAttribute("data-i")]=n.checked; draw(); o.onSelect&&o.onSelect(selList()); });
      on("[data-all]","onchange",function(n){ v.forEach(function(w){ T.sel[w.k]=n.checked; }); draw(); o.onSelect&&o.onSelect(selList()); });
      on("[data-size]","onchange",function(n){ T.size=+n.value; T.page=1; draw(); });
      on("[data-sort]","onchange",function(n){ var p2=n.value.split(","); T.k=+p2[0]; T.dir=+p2[1]; draw(); });
      on("[data-nm]","onclick",function(n){ var i=+n.getAttribute("data-nm"); o.onName(o.rows[i],i); });
      on("[data-bulk]","onclick",function(n){ o.onBulk&&o.onBulk(n.getAttribute("data-bulk"), selList()); });
      on("[data-act]","onclick",function(n){ var i=+n.getAttribute("data-ai"); o.onAction&&o.onAction(n.getAttribute("data-act"),o.rows[i],i); });
      var q=el.querySelector("[data-q]"); if(q) q.oninput=function(e){ var p3=e.target.selectionStart; T.q=e.target.value; T.page=1; draw(); var q2=el.querySelector("[data-q]"); q2.focus(); q2.setSelectionRange(p3,p3); };
    }
    draw();
    return { redraw:draw, selected:selList, clear:function(){ T.sel={}; draw(); o.onSelect&&o.onSelect([]); } };
  }
  /* ⑦ 도움 카드 */
  function help(text, title){ return '<details class="cgg-help"><summary>'+esc(title||"이 화면 사용법")+'</summary><p>'+esc(text)+'</p></details>'; }
  /* 창 3종 — size: "confirm"(확인 400) · "form"(입력 560) · "detail"(자세히 520, 오른쪽)
     o = {size, title, desc, rows:[[이름,값]…](확인 창에 «누구 · 몇 개 · 합계 금액»), body(HTML), ok:"출고하기", cancel:"취소", onOk:function(){ return false 면 안 닫힘 }} */
  var dim=null, lastF=null;
  function dialog(o){
    if(!dim){ dim=document.createElement("div"); dim.className="cgg-dim cgg-dialog"; dim.hidden=true; document.body.appendChild(dim);
      dim.addEventListener("click",function(e){ if(e.target===dim) closeDialog(); }); }
    var size=o.size||"confirm"; lastF=document.activeElement;
    dim.className="cgg-dim cgg-dialog"+(size==="detail"?" side":"");
    dim.innerHTML='<div class="cgg-dlg '+size+'" role="dialog" aria-modal="true" aria-labelledby="cggDlgT" style="position:relative">'
      +'<h3 id="cggDlgT">'+esc(o.title)+'</h3>'+(o.desc?'<p class="desc">'+esc(o.desc)+'</p>':'')
      +(o.rows?'<dl>'+o.rows.map(function(r){ return '<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>'; }).join("")+'</dl>':'')+(o.body||"")
      +'<div class="ft"><button type="button" class="cgg-btn" data-dx="1">'+esc(o.cancel||(o.ok?"취소":"닫기"))+'</button>'+(o.ok?'<button type="button" class="cgg-btn pri" data-dok="1">'+esc(o.ok)+'</button>':'')+'</div>'
      +'<button type="button" class="cgg-btn x" data-dx="1" aria-label="닫기" style="height:34px;width:34px;padding:0">'+ic("x")+'</button></div>';
    dim.hidden=false; document.documentElement.style.overflow="hidden";
    Array.prototype.forEach.call(dim.querySelectorAll("[data-dx]"),function(b){ b.onclick=closeDialog; });
    var okb=dim.querySelector("[data-dok]"); if(okb) okb.onclick=function(){ if(!o.onOk || o.onOk(dim.querySelector(".cgg-dlg"))!==false) closeDialog(); };
    var f=dim.querySelector("input,select,textarea,[data-dok]")||dim.querySelector("[data-dx]"); if(f) f.focus({preventScroll:true});
    var dlg=dim.querySelector(".cgg-dlg"); dlg.scrollTop=0;   /* 1.6 — 짧은 폰에서 아래 버튼에 초점이 가며 제목 · X 가 가려지던 것 */
    return dlg;
  }
  function closeDialog(){ if(!dim||dim.hidden) return; dim.hidden=true; dim.innerHTML=""; document.documentElement.style.overflow=""; if(lastF&&lastF.focus) lastF.focus(); }
  document.addEventListener("keydown",function(e){ if(e.key==="Escape" && dim && !dim.hidden) closeDialog(); });
  /* 알림 글 — 2.4초 뒤 사라짐 */
  var tb=null, tt=null;
  function toast(msg){ if(!tb){ tb=document.createElement("div"); tb.className="cgg-toastbox cgg-toast"; tb.setAttribute("role","status"); tb.setAttribute("aria-live","polite"); document.body.appendChild(tb); }
    tb.textContent=msg; tb.hidden=false; clearTimeout(tt); tt=setTimeout(function(){ tb.hidden=true; },2400); }

  return { ic:ic, esc:esc, won:won, layout:layout, tabbar:tabbar, todos:todos, menu:menu, badge:badge, closeMenu:closeMenu, trial:trial,
           status:status, head:head, kpis:kpis, table:table, help:help, dialog:dialog, closeDialog:closeDialog, toast:toast, version:"cgg-j4 1.6" };
})();
