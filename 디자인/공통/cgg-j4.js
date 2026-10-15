/* ═══════════════════════════════════════════════════════════════════
   차곳간 공통 부품 · J안 4판 · cgg-j4 1.0 (2026-10-15, 디자인 방)
   ① 메뉴 배치 셋  ② 폰 아래 탭바  ③ 홈 할 일 카드 3장
   바탕: 관리 v4.0 의 관리/v4재료/j4.js. 관리 전용 이름(TAB · render · NAV)에 묶이지 않게
         «무엇을 보여 줄지»와 «눌렀을 때 할 일»을 제품이 넘겨 주는 식으로 바꿨어요.
   서버를 부르지 않아요. 저장은 «이 기기에만»(localStorage) — 못 쓰면 가로 메뉴로 그냥 보여요.

   쓰는 법 (제품 파일 <script> 맨 끝에 이 파일 내용을 넣고)
     CGG.layout.init(document.querySelector(".cgg-app"), "cgg_check_layout");   // 저장 이름은 제품마다
     CGG.layout.chooser(상자, function(v){ 창 닫기 · 알림 });                     // 화면 설정 창 안에 고르기 칸 그리기
     CGG.tabbar(document.querySelector(".cgg-tbar"),
       [{key:"home",icon:"home",label:"홈"}, … 5칸], 지금 key, function(key){ 화면 이동 });
     CGG.todos(document.querySelector(".cgg-acts"),
       [{tone:"chk",icon:"car",title:"출고 확인 3대",sub:"한빛모터스 외 2곳 · 오늘"}, … 3장], function(i){ 그 화면으로 });
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
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
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
  return { ic:ic, layout:layout, tabbar:tabbar, todos:todos, version:"cgg-j4 1.0" };
})();
