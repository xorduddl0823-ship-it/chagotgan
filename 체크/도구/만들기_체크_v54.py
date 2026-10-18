"""체크 v53 → v54 — 대표님 TEST(10/18 · 총괄 전달) 고침 3가지
  ① 청구서 «선택한 줄 지우기»: 서버 창구가 없으면(예전 서버) 화면에서만 빼던 것을 없애고 까닭을 가운데 창으로 · 결과(지운 곳 · 못 지운 까닭 · 못 찾은 곳)도 창으로
     이 달 청구서를 모두 지우면 저절로 다시 만들어지던 것 막기(그 달 저절로 만들기 끔 · «청구서 만들기»로 다시 켬)
  ② 월별 청구서: 거래처에 없는 신청인 → «넣고 청구서 다시 만들기»(대표만) · 서버가 번호 없는 청구서를 주면 «번호 없음 · 거래처에 넣기» 띠
  ③ 매출: 보험료 칸은 «보험료 부가세» 설정대로(insMoney) — 표 · 년별 표도 카드와 같게 (부가세 포함/별도 보기와 상관없음)
v53(보안 통과 219db82 · f66cfd8373eb)은 읽기만.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v53.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('ver:"체크 v53", date:"10/18"', 'ver:"체크 v54", date:"10/18"')
rep('$("hdVer").textContent="체크 v53 · "', '$("hdVer").textContent="체크 v54 · "')
rep('<!-- 체크 v53 (', '<!-- 체크 v54 (v53 + TEST 고침: 청구서 지우기 · 없는 신청인 · 보험료 칸) · 체크 v53 (')

# ① 청구서 지우기
rep("""    call("invoiceDel",[{ids:L.map(function(b){ return b.id; }), ym:ST.ym}]).then(function(r){
      busy(false); clearPick("bill"); var kp=(r&&r.kept)||[]; bar(won((r&&r.n)||0)+"곳 청구서를 지웠어요."+(kp.length?" 못 지운 "+kp.length+"곳 — "+kp.slice(0,2).map(function(x){ return (x.name||"")+"("+(x.why||"")+")"; }).join(" / "):""), kp.length?"err":"ok"); refresh(["bill"]);
    }).catch(function(er){ busy(false);
      if(!noSrv(er)){ fail(er); return; }
      /* 서버 창구 전: 이 화면에서만 빼 두고(보내기 · 인쇄 대상에서 빠짐), 새로고침하면 다시 보여요 */
      var gone=L.map(function(b){ return b.id; }); BILLS=BILLS.filter(function(b){ return gone.indexOf(b.id)<0; }); clearPick("bill"); draw();
      bar(L.length+"곳을 이 화면 목록에서 뺐어요 (보내기 · 인쇄에서 빠짐). 서버 청구서까지 지우는 것은 다음 서버 판부터 돼요.","info");
    });""",
"""    var ym=ST.ym, all=L.length>=BILLS.length;
    call("invoiceDel",[{ids:L.map(function(b){ return b.id; }), ym:ym}]).then(function(r){
      busy(false); clearPick("bill"); r=r||{};
      var n=Number(r.n)||0, kp=Array.isArray(r.kept)?r.kept:[], ms=Number(r.missing)||0;
      if(n && all && !kp.length && window.chkNoAutoSet) chkNoAutoSet(ym,true);   /* v54: 다 지운 달은 저절로 다시 만들지 않게 */
      var lines=[];
      if(kp.length) lines.push("못 지운 "+kp.length+"곳 — "+kp.slice(0,5).map(function(x){ return esc(x.name||"")+"("+esc(x.why||"")+")"; }).join(" / "));
      if(ms) lines.push("못 찾은 "+ms+"곳 — 이미 지워졌거나 다른 달 청구서예요. «새로고침»을 눌러 주세요.");
      if(!n) tell("청구서를 지우지 못했어요", lines.join("<br>")||"지울 수 있는 청구서가 없었어요.");
      else if(lines.length) tell(n+"곳만 지웠어요", lines.join("<br>"));
      else bar(n+"곳 청구서를 지웠어요."+(all?" «청구서 만들기»를 누르면 다시 생겨요.":""),"ok");
      refresh(["bill"]);
    }).catch(function(er){ busy(false);
      if(!noSrv(er)){ fail(er); return; }
      /* v54: 화면에서만 빼던 것 없앰 — 새로고침하면 다시 보여서 «안 지워진다»로 보였어요 */
      tell("아직 지울 수 없어요","지금 서버가 예전 판이라 청구서를 지울 수 없어요. 아무것도 지우지 않았어요.<br>새 서버를 올리면 바로 돼요.");
    });""")
rep("/* 선택한 줄 지우기 — 서버 창구(invoiceDel) 요청함. 그 전에는 «이 달 청구서에서 빼는 길»로 안내 */", "/* 선택한 줄 지우기 — 서버 invoiceDel (v54: 예전 서버면 까닭만 알리고 아무것도 안 지움) */")
rep("""  return Promise.all([ call("invoiceList",[ST.ym, true]), loadDealers(),""",
    """  return Promise.all([ call("invoiceList",[ST.ym, !(window.chkNoAuto&&chkNoAuto(ST.ym))]), loadDealers(),""")
rep("""    call("invoiceBuild",[ST.ym,{keepZero:keep}]).then(function(r){
      busy(false); bar(ymText(ST.ym)+" 청구서 "+won((r&&r.n)||0)+"장을 만들었어요.","ok");""",
    """    call("invoiceBuild",[ST.ym,{keepZero:keep}]).then(function(r){
      if(window.chkNoAutoSet) chkNoAutoSet(ST.ym,false);
      busy(false); bar(ymText(ST.ym)+" 청구서 "+won((r&&r.n)||0)+"장을 만들었어요.","ok");""")
# ② 번호 없는 청구서 표시 (서버가 bill_to_id 를 비워 보내면)
rep("""      var b={ id:v.id, name:v.bill_to_name, members:mem.join(" · "),""",
    """      var b={ id:v.id, name:v.bill_to_name, noId:(v.no_dealer===true||(("bill_to_id" in v)&&!v.bill_to_id)), members:mem.join(" · "),""")
rep("""        '<small>차 한 대마다 딜러가 이어져 있어야 청구서에 들어가요. '+""",
    """        '<small>거래처에 없는 신청인의 차는 청구서에 안 들어가요. '+""")
# ③ 보험료 칸
rep("""      {k:"ins",t:"보험료",num:true,fmt:function(v){return won(vmoney(v));}},""",
    """      {k:"ins",t:"보험료",num:true,fmt:function(v){return won(insMoney(v));}},""", 2)

rep("""<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""", open(BASE + "체크/도구/v54_고침.js", encoding="utf-8").read() + """<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""")

open(BASE + "체크/2_차곳간_체크_index_v54.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v54.html", len(s))
