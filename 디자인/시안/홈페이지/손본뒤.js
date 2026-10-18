/* 대표님 참고 시안에서 «부분만 빌려 온» 칸 6가지 — 영어 소제목 · «차» 글자 로고 · 새 요금 숫자 · 디자인 안내 창은 가져오지 않아요.
   실제 연결(미리 써 보기 · 가입 · 로그인 · 문의)은 지금 홈페이지 링크 그대로예요. */
(function(){
  function el(h){ var d=document.createElement("div"); d.innerHTML=h.trim(); return d.firstChild; }
  function sec(id,alt,n,title,sub,body){ return el('<section class="blk gut bor'+(alt?' alt':'')+'" id="'+id+'"><div class="wrap"><span class="bor-tag">참고 시안에서 빌려 옴 '+n+'</span><h2 class="h2">'+title+'</h2>'+(sub?'<p class="sub">'+sub+'</p>':'')+body+'</div></section>'); }
  var hero=document.querySelector("section.hero"), tryS=document.getElementById("try"), ask=document.getElementById("ask"), foot=document.querySelector("footer.site");
  /* ① 제품 3개 비교 카드 */
  var P=[["광택 · 세차 · 휠 · 판금 업체용","차곳간 워시","차가 들어올 때부터 대금이 들어올 때까지, 업체의 작업과 정산을 정리해요.",["차량 입고 · 작업 · 출고 관리","거래처별 청구서와 입금 확인","매출과 미수 현황 확인"],"워시"],
         ["중고차 성능점검 업체용","차곳간 체크","접수부터 점검과 청구까지, 성능점검 업무의 흐름을 정리해요.",["차량 접수와 점검 업무 관리","거래처별 청구 · 정산 확인","업체 운영에 필요한 설정"],"체크"],
         ["차를 맡긴 딜러용","차곳간 딜러","맡긴 차가 지금 어디까지 왔는지, 진행 상황과 청구 내역을 확인해요.",["내 차의 위치와 진행 상태","차량별 작업 이력 확인","업체별 청구서와 납부 정보"],"딜러"]];
  if(hero) hero.parentNode.insertBefore(sec("products",false,"①","하는 일은 달라도, 필요한 차곳간은 가까이에","내 역할에 맞는 서비스부터 살펴보세요.",
    '<div class="cmp3">'+P.map(function(p){ return '<article><span class="who">'+p[0]+'</span><h3>'+p[1]+'</h3><p>'+p[2]+'</p><ul>'+p[3].map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ul><a class="btn g" href="#try">'+p[4]+' 화면 살펴보기 →</a></article>'; }).join("")+'</div>'), hero.nextSibling);
  /* ② 탭으로 바꿔 보는 미리 써 보기 (예시 숫자) */
  var D={wash:["오늘 확인할 작업을 한눈에",[["작업 중","12","대"],["오늘 출고","8","대"],["확인할 청구서","3","건"]],[["12가 3456","그랜저","광택","작업 중",""],["34나 5678","K5","세차","작업 끝","g"],["56다 7890","쏘렌토","휠","입고","a"]]],
         check:["접수된 차량부터 차근차근",[["오늘 접수","16","대"],["점검 중","5","대"],["점검 끝","11","대"]],[["12가 3456","그랜저","접수","접수","a"],["34나 5678","K5","점검","점검 중",""],["56다 7890","쏘렌토","끝","점검 끝","g"]]],
         dealer:["맡긴 내 차, 지금 어디까지 왔을까",[["진행 중인 차","4","대"],["도착한 차","1","대"],["확인할 청구서","2","건"]],[["12가 3456","그랜저","예시 업체 A","작업 중",""],["34나 5678","K5","예시 업체 B","도착","g"],["56다 7890","쏘렌토","예시 업체 A","출고","a"]]]};
  var NM={wash:"워시",check:"체크",dealer:"딜러"};
  if(tryS){ var box=el('<div class="mini bor"><span class="bor-tag">참고 시안에서 빌려 옴 ②</span><div class="tabs" role="tablist" aria-label="서비스 고르기">'+Object.keys(D).map(function(k,i){ return '<button type="button" role="tab" data-mk="'+k+'" aria-selected="'+(i===0)+'">'+NM[k]+'</button>'; }).join("")+'</div><div id="miniBody" role="tabpanel"></div><p class="note">예시 숫자예요. 아래 카드를 누르면 실제 화면을 눌러 볼 수 있어요.</p></div>');
    var w=tryS.querySelector(".wrap"), sub=w.querySelector(".sub"); w.insertBefore(box, sub?sub.nextSibling:w.children[1]);
    function show(k){ var d=D[k]; Array.prototype.forEach.call(box.querySelectorAll("[data-mk]"),function(b){ b.setAttribute("aria-selected",String(b.getAttribute("data-mk")===k)); });
      document.getElementById("miniBody").innerHTML='<h3>차곳간 '+NM[k]+' — '+d[0]+'</h3><div class="k">'+d[1].map(function(x){ return '<div><small>'+x[0]+'</small><strong>'+x[1]+'<em>'+x[2]+'</em></strong></div>'; }).join("")+'</div>'
        +'<table><thead><tr><th>차량번호</th><th>차종</th><th>'+(k==="dealer"?"업체":"작업")+'</th><th>상태</th></tr></thead><tbody>'+d[2].map(function(r){ return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td><span class="st '+r[4]+'">'+r[3]+'</span></td></tr>'; }).join("")+'</tbody></table>'; }
    Array.prototype.forEach.call(box.querySelectorAll("[data-mk]"),function(b){ b.onclick=function(){ show(b.getAttribute("data-mk")); }; }); show("wash");
  /* ③ 4단계 흐름 */
    tryS.parentNode.insertBefore(sec("flow4",false,"③","차가 들어와서 돈 받기까지","업무 단계마다 필요한 정보를 정리하고, 딜러는 자기 차 정보를 확인해요.",
      '<ol class="flow4"><li><b>차량 입고 · 접수</b><span>어떤 차가, 누구에게서 왔는지.</span></li><li><b>작업 · 점검</b><span>진행 중인 일과 상태를 정리해요.</span></li><li><b>출고 · 진행 확인</b><span>맡긴 차의 다음 단계를 확인해요.</span></li><li><b>청구 · 입금 확인</b><span>차량별 내역을 정산까지 이어가요.</span></li></ol><p class="note">서비스마다 보이는 기능과 정보 범위는 달라요. 위 흐름은 이해를 돕는 예시예요.</p>'), tryS.nextSibling); }
  /* ④ 자주 묻는 질문 */
  var Q=[["워시 · 체크 · 딜러는 어떻게 다른가요?","워시는 광택 · 세차 등 업체의 입고 · 작업 · 정산, 체크는 성능점검 업체의 업무, 딜러앱은 맡긴 차의 진행 상황과 청구 정보를 확인하는 데 맞춰져 있어요."],
         ["가입하지 않고 화면을 볼 수 있나요?","네. 위 «미리 써 보기»에서 예시 자료로 실제 화면을 눌러 볼 수 있어요. 보이는 차량과 금액은 예시예요."],
         ["딜러는 무엇을 확인할 수 있나요?","내 차의 진행 상황, 작업 이력, 업체별 청구서를 확인해요. 보이는 범위는 계정 권한과 업체가 연결한 정보에 따라요."],
         ["결제는 어떻게 하나요?","30일 단위로 카드로 결제해요. 표시 금액은 부가세 별도예요."]];
  if(ask) ask.parentNode.insertBefore(sec("faq",true,"④","궁금한 점을 먼저 확인하세요","처음 차곳간을 살펴보는 분들을 위해 정리했어요.",'<div class="faq">'+Q.map(function(q){ return '<details><summary>'+q[0]+'</summary><p>'+q[1]+'</p></details>'; }).join("")+'</div>'), ask);
  /* ⑤ 남색 시작 띠 — 시작 단계는 새로 만들지 않고, 요금제 아래 기존 «가입 · 로그인 → 결제 → 바로 사용» 3단계를 띠 위로 옮겨 하나로(총괄 10/18) */
  if(foot){ var st=sec("start",false,"⑤","이렇게 시작해요","",'<div class="ctaband"><h2>내일의 업무가 조금 더 또렷해지도록, 차곳간을 먼저 만나 보세요.</h2><p>워시 · 체크 · 딜러, 내 역할에 맞는 화면부터 시작하세요.</p><div class="cta"><a class="btn p" href="#try">가입 없이 미리 써 보기</a><a class="btn g" href="/join.html">회원가입</a></div></div>');
    foot.parentNode.insertBefore(st, foot);
    var s3=document.querySelector("#price .steps3"), bandEl=st.querySelector(".ctaband"); if(s3&&bandEl) bandEl.parentNode.insertBefore(s3, bandEl); }
  /* ⑦ 첫 문구 고르기 — 지금 문구 / 시안 2 문구를 바꿔 보며 대표님이 골라요 */
  var h1=document.querySelector(".hero h1"), hp=document.querySelector(".hero p");
  if(h1&&hp){ var H=[[h1.innerHTML,hp.innerHTML],["차량 업무의 흐름,<br>차곳간으로 한눈에.","입고와 작업, 성능점검, 내 차의 진행 상황까지. 업체와 딜러, 각자의 역할에 맞는 화면을 만나 보세요."]];
    var pick=el('<div class="bor pickh" role="group" aria-label="첫 문구 고르기"><span class="bor-tag">첫 문구 후보 ⑦</span><b>첫 문구 고르기</b><button type="button" aria-pressed="true" data-h="0">지금 문구</button><button type="button" aria-pressed="false" data-h="1">시안 2 문구</button></div>');
    h1.parentNode.insertBefore(pick,h1);
    Array.prototype.forEach.call(pick.querySelectorAll("[data-h]"),function(b){ b.onclick=function(){ var i=+b.getAttribute("data-h"); h1.innerHTML=H[i][0]; hp.innerHTML=H[i][1]; Array.prototype.forEach.call(pick.querySelectorAll("[data-h]"),function(x){ x.setAttribute("aria-pressed",String(x===b)); }); }; }); }
  /* ⑧ 요금제 칸 모양 — 시안 2 처럼 이름 아래 «누구에게 맞는지» 한 줄(금액은 지금 홈페이지 그대로) */
  var PD={"베이직":"기본 업무를 차근차근 정리하고 싶다면","스탠다드":"업체의 업무와 정산을 함께 관리하려면","프로":"우리 업체에 맞는 구성이 필요하다면"};
  function pdesc(){ Array.prototype.forEach.call(document.querySelectorAll("#price .plan h3"),function(h){ var t=h.textContent.trim(); if(PD[t]&&!(h.nextElementSibling&&h.nextElementSibling.classList.contains("pdesc"))){ var d=document.createElement("p"); d.className="pdesc"; d.textContent=PD[t]; h.parentNode.insertBefore(d,h.nextSibling); h.parentNode.classList.add("bor"); } }); }
  pdesc(); var pr=document.getElementById("price"); if(pr) new MutationObserver(pdesc).observe(pr,{childList:true,subtree:true});
  /* ⑥ 폰 메뉴 · 초점 테두리 · 움직임 줄이기 — 메뉴 단추에 표시만(동작은 지금 것 그대로) */
  var bg=document.querySelector(".burger"); if(bg) bg.classList.add("bor");
})();
/* 홈페이지 «손본 뒤» — 로고에 CI 넣기 + 바뀐 곳 표시(주소에 mark 가 있으면 빨간 점선) */
(function(){
  var CI="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSI0LjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+IDx0aXRsZT7ssKjqs7PqsIQg7Ius67O8ICh3aGl0ZSk8L3RpdGxlPiA8cGF0aCBkPSJNNCAyNCBMMzIgNiBMNjAgMjQiLz4gPHBhdGggZD0iTTEyLjUgMjQgVjU4Ii8+IDxwYXRoIGQ9Ik01MS41IDI0IFY1OCIvPiA8cGF0aCBkPSJNMTAgNTggSDU0Ii8+IDxwYXRoIGQ9Ik0yMyAyOSBMMjggMzQuNSBMMzguNSAyMy41IiBzdHJva2Utd2lkdGg9IjUiLz4gPHBhdGggZD0iTTIwIDQ5IEwyNCA0MS41IEgzNiBMNDIgNDkiIHN0cm9rZS13aWR0aD0iMy44Ii8+IDxwYXRoIGQ9Ik0xOSA0OSBINDUiIHN0cm9rZS13aWR0aD0iMy44Ii8+IDxjaXJjbGUgY3g9IjI2IiBjeT0iNTIuNSIgcj0iMi41IiBzdHJva2Utd2lkdGg9IjMiLz4gPGNpcmNsZSBjeD0iMzgiIGN5PSI1Mi41IiByPSIyLjUiIHN0cm9rZS13aWR0aD0iMyIvPiA8L3N2Zz4=";
  var lg=document.querySelector(".logo"); if(lg&&!lg.querySelector(".ci")){ var s=document.createElement("span"); s.className="ci"; s.setAttribute("aria-hidden","true"); var im=document.createElement("img"); im.src=CI; im.alt=""; s.appendChild(im); lg.insertBefore(s,lg.firstChild); }
  function tag(){ var L=[[".logo","로고"],["nav.mn a","메뉴 44px"],[".burger","메뉴 단추 44px"],[".ptabs button","탭 44px"],[".trybar button","탭 44px"],[".plan .member","링크 44px"],[".links a",""],[".chk input","체크칸 22px"],[".panel input","입력칸"],[".panel select","입력칸"],["footer.site a","링크 44px"]];
    L.forEach(function(x){ Array.prototype.forEach.call(document.querySelectorAll(x[0]),function(e){ e.setAttribute("data-chg",x[1]||"1"); }); }); }
  if(/mark/.test(location.search+location.hash)){ document.documentElement.classList.add("cgg-mk"); tag(); new MutationObserver(tag).observe(document.body,{childList:true,subtree:true});
    var d=document.createElement("div"); d.className="cgg-mklegend"; d.textContent="빨간 점선 = 바뀐 곳 · 보라 띠 = 참고 시안 1 · 2 에서 빌려 온 칸 ①~⑧"; document.body.appendChild(d); }
})();
