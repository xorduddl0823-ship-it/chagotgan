"""체크 v55 → v56 — 대표님 TEST(10/18) 다듬기
  ① 여러 건 결과 창: 한 곳씩 줄 바꿔 목록 + 할 일 단추(청구서 지우기 · 세금계산서 발급 · 딜러 등록)
  ② 메뉴 · 안쪽 칸 바꿀 때 «불러오는 중이에요…»로 화면을 지우지 않음 — 예전 내용 그대로 + 얇은 진행 줄
  ③ 디자인 메뉴 지도 이름(e24c0ec): 세금계산서 발행 / 달마다 장부 · 입금 · 출금 / 받을 금액 / 보험료 맞춰 보기 ·
     청구서 목록 / 받는 곳 합치기 · 알림톡 문구는 설정 › 알림 안 · 보내는 번호(발신번호)
v55(보안 통과 14d8c99 · 72b3ea72de34)는 읽기만.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v55.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('ver:"체크 v55", date:"10/18"', 'ver:"체크 v56", date:"10/18"')
rep('$("hdVer").textContent="체크 v55 · "', '$("hdVer").textContent="체크 v56 · "')
rep('<!-- 체크 v55 (', '<!-- 체크 v56 (v55 + TEST 다듬기: 결과 목록 창 · 불러오기 글 없앰 · 메뉴 지도 이름) · 체크 v55 (')

# ② 불러오는 중 글 없앰 — 예전 내용 그대로 · 얇은 진행 줄
rep("""    $("main").innerHTML='<div class="card"><div class="loading">불러오는 중이에요…</div></div>';
    bar(""); busy(true);
    need(page).then(function(){ busy(false); bar(""); draw(); })
              .catch(function(e){ busy(false); fail(e); draw(); });""",
    """    if(!String($("main").innerHTML||"").trim()) $("main").innerHTML='<div class="card"><div class="loading">불러오는 중이에요…</div></div>';   /* v56: 처음 한 번만 */
    document.body.classList.add("chk-loading"); busy(true);
    need(page).then(function(){ document.body.classList.remove("chk-loading"); busy(false); draw(); })
              .catch(function(e){ document.body.classList.remove("chk-loading"); busy(false); fail(e); draw(); });""")

# ③ 메뉴 지도 이름
rep('var TAXSUB=[["hometax","발행"],["history","달마다 장부"]];', 'var TAXSUB=[["hometax","세금계산서 발행"],["history","달마다 장부"]];')
rep('var DEPSUB=[["deposit","입금 · 출금"],["recv","받을 금액"],["unpaid","보험료 대조"]];', 'var DEPSUB=[["deposit","입금 · 출금"],["recv","받을 금액"],["unpaid","보험료 맞춰 보기"]];')
rep('var BILLSUB=[["bill","월별 청구서"],["billgrp","청구처 묶음"],["billtpl","알림톡 템플릿"]];', 'var BILLSUB=[["bill","청구서 목록"],["billgrp","받는 곳 합치기"]];   /* v56: 알림톡 문구는 설정 › 알림 안 */')
rep('{id:"unpaid",label:"보험료 대조",path:"입·출금 내역 › 보험료 대조",', '{id:"unpaid",label:"보험료 맞춰 보기",path:"입·출금 내역 › 보험료 맞춰 보기",')
rep('{id:"billgrp",label:"청구처 묶음 (받는 곳 합치기)",path:"월별 청구서 › 청구처 묶음",go:"bill/billgrp",', '{id:"billgrp",label:"받는 곳 합치기",path:"월별 청구서 › 받는 곳 합치기",go:"bill/billgrp",')
rep('{id:"billtpl",label:"알림톡 템플릿",path:"월별 청구서 › 알림톡 템플릿",go:"bill/billtpl",', '{id:"billtpl",label:"알림톡 문구",path:"설정 › 알림 › 알림톡 문구",go:"set/billtpl",')
rep('{id:"sender",label:"발신번호 (문자 보내는 번호)",', '{id:"sender",label:"보내는 번호(발신번호)",')
rep("""<h3>발신번호 (문자 보내는 번호)</h3>""", """<h3>보내는 번호(발신번호)</h3>""")

rep('head("알림톡 템플릿"', 'head("알림톡 문구"')
rep('head("청구처 묶음"', 'head("받는 곳 합치기"')
rep('head("보험료 대조"', 'head("보험료 맞춰 보기"')

# ① 결과 목록 창
rep('''        if(gone<=0) tell("청구서를 지우지 못했어요", lines.join("<br>")||"지울 수 있는 청구서가 없었어요.");
        else if(lines.length) tell(gone+"곳만 지웠어요", lines.join("<br>"));''',
    '''        /* v56: 한 곳씩 줄 바꿔 목록 · 입금이 붙어 못 지우면 입·출금 내역 가는 단추 */
        var paidK=kp.some(function(x){ return /입금/.test(String(x.why||"")); });
        var items=kp.map(function(x){ return {name:x.name, why:x.why}; }).concat(left.map(function(id){
          var b=L.filter(function(z){ return String(z.id)===id; })[0]; return {name:b?b.name:id, why:"서버는 지웠다고 했는데 아직 남아 있어요"}; }));
        var more=(paidK?"입금 맞춤을 먼저 되돌리면 지울 수 있어요. ":"")+(ms?"못 찾은 "+ms+"곳 — 이미 지워졌거나 다른 달 청구서예요. ":"")+(left.length?"이 창을 사진으로 찍어 체크 방에 보내 주세요.":"");
        var g1=paidK?{label:"입·출금 내역 가기", page:"deposit"}:null;
        if(gone<=0 && !items.length) tell("청구서를 지우지 못했어요", more?esc(more):"지울 수 있는 청구서가 없었어요.");
        else if(gone<=0) chkResult("청구서를 지우지 못했어요", "못 지운 "+items.length+"곳", items, more, g1);
        else if(items.length||more) chkResult(gone+"곳만 지웠어요", items.length?"못 지운 "+items.length+"곳":"", items, more, g1);''')
rep('''        var m=won(r.ok)+"장을 발급했어요.";
        if(r.bad&&r.bad.length) m+=" 안 된 곳 "+r.bad.length+"건 — "+r.bad.slice(0,3).join(" / ");
        bar(m,(r.bad&&r.bad.length)?"err":"ok");''',
    '''        var m=won(r.ok)+"장을 발급했어요.";
        if(r.bad&&r.bad.length) chkResult(r.ok?m:"세금계산서를 발급하지 못했어요", "안 된 곳 "+r.bad.length+"건", r.bad.map(chkSplit), "", null);   /* v56: 한 곳씩 */
        else bar(m,"ok");''')
rep('''        bar(won(okN)+"명을 등록했어요."+(resend?" 알림 "+won(sent)+"건을 다시 보냈어요."+(failN?" "+won(failN)+"건은 못 보냈어요.":""):"")+
          (bad.length?" 등록 못 한 "+won(bad.length)+"줄 — "+bad.slice(0,2).map(function(x){ return String(x.why||""); }).join(" / "):""),
          (bad.length||failN)?"err":"ok");''',
    '''        var msg=won(okN)+"명을 등록했어요."+(resend?" 알림 "+won(sent)+"건을 다시 보냈어요."+(failN?" "+won(failN)+"건은 못 보냈어요.":""):"");
        if(bad.length) chkResult("등록 못 한 줄이 있어요", msg+" 등록 못 한 "+won(bad.length)+"줄", bad.map(function(x){ return {name:String(x.name||""), why:String(x.why||"")}; }), "", null);   /* v56 */
        else bar(msg, failN?"err":"ok");''')

rep("""<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""", open(BASE + "체크/도구/v56_다듬기.js", encoding="utf-8").read() + """<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""")

open(BASE + "체크/2_차곳간_체크_index_v56.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v56.html", len(s))
