"""체크 v48 → v48.1 — chagotgan-ui-checker 검사(10/18)에서 걸린 것 고침 (v48 최종 3ccde5e 는 읽기만 · 보안 통과 판은 그 자리에서 고치지 않음)
  ① 브라우저 기본 입력창(prompt) 4곳 → 화면 가운데 창 (배달 «목적지 추가» · «기사 추가» — 기사 처음 비밀번호는 가려지는 칸)
  ② 입금 맞추기 창의 달 고르기 선택 상자 → 달 단추(최근 6달, 이 창 안에서만 바뀜)
  ③ 도구줄 칸 · 단추 높이 43px / 좁은 화면 42px (거래처 부품 CSS 1.1 · 청구서 미리보기 위쪽 줄)
  ④ 청구서 미리보기 글꼴 Noto Sans KR 먼저
  ⑤ 단가 구간 덮어쓰기는 확인 창으로 · 입금 지우기 · 되돌리기 확인 창 제목에 «합계 ○원»
  ⑥ 긴 안내 글 줄이기 (은행 엑셀 카드 · 단가 «서버를 새로 올려야» 띠)
레이아웃(머리말 · 탭 · 뼈대)은 «시안 먼저» 규칙이라 손대지 않음 — 목록은 체크/기획/2026-10-18_통합화면_체크_바뀔곳.md
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v48.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ③ 거래처 부품 CSS 1.0 → 1.1
CSS10 = open(BASE + "부품/거래처_부품.css", encoding="utf-8").read()
CSS11 = open(BASE + "부품/거래처_부품_1.1.css", encoding="utf-8").read()
rep(CSS10, CSS11)

# ① 목적지 추가
rep('''  if(a) a.onclick=function(){
    var n=prompt("새 목적지 이름을 적어 주세요 (기사 폰 버튼에 그대로 보여요)");
    if(!n) return;
    busy(true);
    call("deliv_addDest",[ST.key,n,""]).then(function(){
      busy(false); bar("목적지 «"+n+"» 를 넣었어요.","ok"); refresh(["deliv"]);
    }).catch(fail);
  };''', '''  if(a) a.onclick=function(){   /* v48.1: 기본 입력창 → 화면 가운데 창 */
    CGG.dialog({size:"form", title:"목적지 추가", desc:"기사 폰에 이 이름 그대로 단추로 보여요.",
      body:'<label class="f" for="plcName">목적지 이름</label><input type="text" id="plcName" maxlength="30" style="width:100%">'+
           '<div class="msg err" id="plcErr" hidden style="margin-top:8px"></div>',
      ok:"넣기", cancel:"닫기",
      onOk:function(){ var n=String(($("plcName")||{}).value||"").trim(), e=$("plcErr");
        if(!n){ e.hidden=false; e.textContent="목적지 이름을 적어 주세요."; return false; }
        var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
        call("deliv_addDest",[ST.key,n,""]).then(function(){
          CGG.closeDialog(); bar("목적지 «"+n+"» 를 넣었어요.","ok"); refresh(["deliv"]);
        }).catch(function(er){ if(okb) okb.disabled=false; e.hidden=false; e.textContent=niceMsg(er&&er.message); });
        return false; }});
  };''')
# ① 기사 추가
rep('''  if(a) a.onclick=function(){
    var n=prompt("기사 이름"); if(!n) return;
    var t=prompt("연락처 (안 적어도 돼요)")||"";
    var p=prompt("처음 비밀번호 (6자 이상 · 비워 두면 기사가 폰에서 정해요)")||"";
    if(p && p.length<6){ bar("기사 비밀번호는 6자 이상으로 정해 주세요.","err"); return; }
    busy(true);
    call("deliv_accountAdd",[ST.key,n,p,t]).then(function(){
      busy(false); bar("기사 «"+n+"» 를 넣었어요.","ok"); refresh(["deliv"]);
    }).catch(fail);
  };''', '''  if(a) a.onclick=function(){   /* v48.1: 기본 입력창 3번 → 화면 가운데 창 하나 · 비밀번호는 가려지는 칸 */
    CGG.dialog({size:"form", title:"기사 추가", desc:"이름만 넣어도 돼요. 비밀번호를 비우면 기사가 폰에서 정해요.",
      body:'<label class="f" for="daName">기사 이름</label><input type="text" id="daName" maxlength="20" style="width:100%;margin-bottom:10px">'+
           '<label class="f" for="daTel">연락처 (안 적어도 돼요)</label><input type="tel" id="daTel" inputmode="tel" maxlength="15" style="width:100%;margin-bottom:10px">'+
           '<label class="f" for="daPw">처음 비밀번호 (6자 이상 · 비워도 돼요)</label><input type="password" id="daPw" maxlength="40" autocomplete="new-password" style="width:100%">'+
           '<div class="msg err" id="daErr" hidden style="margin-top:8px"></div>',
      ok:"넣기", cancel:"닫기",
      onOk:function(){ var n=String(($("daName")||{}).value||"").trim(), t=String(($("daTel")||{}).value||"").trim(), p=String(($("daPw")||{}).value||""), e=$("daErr");
        if(!n){ e.hidden=false; e.textContent="기사 이름을 넣어 주세요."; return false; }
        if(p && p.length<6){ e.hidden=false; e.textContent="비밀번호는 6자 이상으로 정해 주세요."; return false; }
        var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
        call("deliv_accountAdd",[ST.key,n,p,t]).then(function(){
          CGG.closeDialog(); bar("기사 «"+n+"» 를 넣었어요.","ok"); refresh(["deliv"]);
        }).catch(function(er){ if(okb) okb.disabled=false; e.hidden=false; e.textContent=niceMsg(er&&er.message); });
        return false; }});
  };''')

# ② 입금 맞추기 창 — 달 단추 (최근 6달)
rep('''  var yms=[ST.ym, ymAddK(ST.ym,-1), ymAddK(ST.ym,-2)];''',
    '''  var yms=[0,-1,-2,-3,-4,-5].map(function(k){ return ymAddK(ST.ym,k); }), curYm=ST.ym;   /* v48.1: 선택 상자 대신 달 단추 */''')
rep('''    body:'<label class="f" for="daYm">어느 달 청구서예요?</label><select id="daYm" style="width:100%;margin-bottom:10px">'+
      yms.map(function(y){ return '<option value="'+esc(y)+'">'+esc(y.replace("-","년 "))+'월</option>'; }).join("")+'</select>'+''',
    '''    body:'<p class="f" style="margin:0 0 6px">어느 달 청구서예요?</p><div id="daYm" role="group" aria-label="청구 달" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'+
      yms.map(function(y){ return '<button type="button" class="cgg-btn sm" data-daym="'+esc(y)+'" aria-pressed="'+(y===curYm)+'">'+esc(ymText(y))+'</button>'; }).join("")+'</div>'+''')
rep('''    var ym=$("daYm").value, box=$("daList"); box.innerHTML='<p class="note">불러오는 중…</p>';''',
    '''    var ym=curYm, box=$("daList"); box.innerHTML='<p class="note">불러오는 중…</p>';
    Array.prototype.forEach.call(document.querySelectorAll("#daYm [data-daym]"),function(b){ var on=b.getAttribute("data-daym")===ym; b.setAttribute("aria-pressed",on); b.classList.toggle("pri",on); });''')
rep('''  $("daYm").onchange=load; load();''',
    '''  Array.prototype.forEach.call(document.querySelectorAll("#daYm [data-daym]"),function(b){ b.onclick=function(){ curYm=b.getAttribute("data-daym"); load(); }; });
  load();''')

# ③ 청구서 미리보기 위쪽 줄 단추 높이 · ④ 글꼴
rep('''  '#prtBox .prt-bar b{font-size:15px;color:#101828}'+''',
    '''  '#prtBox .prt-bar b{font-size:15px;color:#101828}#prtBox .prt-bar .cgg-btn{min-height:43px;height:43px}'+
  '@media (max-width:600px){#prtBox .prt-bar .cgg-btn{min-height:42px;height:42px}}'+''')
rep('''font:14px/1.55 "Pretendard","Noto Sans KR",system-ui,sans-serif;word-break:keep-all}''',
    '''font:14px/1.55 "Noto Sans KR","Pretendard",system-ui,sans-serif;word-break:keep-all}''')

# ⑤ 단가 덮어쓰기 → 확인 창
rep('''      var same=PRICE_BANDS.some(function(b){ return b.from===from; });
      var okb=document.querySelector(".cgg-dlg [data-dok]");
      if(same && !(okb&&okb.getAttribute("data-again"))){ if(okb) okb.setAttribute("data-again","1"); return bad("이미 "+from+" 구간이 있어요. 그 구간을 이 단가로 바꾸려면 «저장»을 한 번 더 눌러 주세요."); }
      if(okb) okb.disabled=true;
      call("priceSave",[{from:from, items:items}]).then(function(){''',
    '''      var same=PRICE_BANDS.some(function(b){ return b.from===from; });
      var okb=document.querySelector(".cgg-dlg [data-dok]");
      function save(){ return call("priceSave",[{from:from, items:items}]); }
      if(same){   /* v48.1: 덮어쓰기는 확인 창으로 (몇 개를 · 어느 날짜를) */
        var old=PRICE_BANDS.filter(function(b){ return b.from===from; })[0];
        ask({title:from+" 구간 단가를 바꿀까요?", sub:"예전 항목 "+won(old.items.length)+"개 → 새 항목 "+won(items.length)+"개",
             rows:items.slice(0,30).map(function(i){ return [esc(i.name), won(i.price)+"원"]; }), rowsTitle:"새 단가",
             warn:"이미 만든 청구서는 «청구서 만들기»를 다시 눌러야 바뀌어요.", yes:"바꾸기"}, function(){
          busy(true);
          save().then(function(){ busy(false); PRICE_OK=null; bar(from+" 구간 단가 "+won(items.length)+"개로 바꿨어요.","ok"); loadPrice().then(function(){ draw(); }); })
            .catch(function(er){ busy(false); fail({message:/지원하지 않는 기능/.test(String(er&&er.message))?"서버를 새로 올려야 쓸 수 있어요(체크 서버 다음 판 — 단가 창구).":er&&er.message}); });
        });
        return false; }   /* 확인 창이 이 창 자리를 넘겨받음 — 닫지 않음 */
      if(okb) okb.disabled=true;
      save().then(function(){''')
# ⑤ 입금 확인 창에 합계
rep('''  askPicked("입금 "+won(L.length)+"건을 되돌릴까요?",''',
    '''  askPicked("입금 "+won(L.length)+"건(합계 "+won(L.reduce(function(s,d){ return s+(Number(d.amount)||0); },0))+"원)을 되돌릴까요?",''')
rep('''  askPicked("입금 "+won(L.length)+"건을 지울까요?",''',
    '''  askPicked("입금 "+won(L.length)+"건(합계 "+won(L.reduce(function(s,d){ return s+(Number(d.amount)||0); },0))+"원)을 지울까요?",''')

# ⑥ 안내 글 줄이기
rep('''  card("은행 거래내역 엑셀 가져오기","팝빌에 안 잡힌 입금이나 지난달을 한꺼번에 넣을 때 써요. 인터넷뱅킹에서 받은 거래내역 엑셀을 고르면, 넣기 전에 미리 보여 드려요. 같은 입금은 두 번 들어가지 않아요.",''',
    '''  card("은행 거래내역 엑셀 가져오기","인터넷뱅킹 거래내역 엑셀을 고르면 넣기 전에 미리 보여 드려요. 같은 입금은 두 번 안 들어가요.",''')
rep('''  (PRICE_OK===false ? '<div class="msg info">지금 들어 있는 구간 '+won(COUNTS.단가표||0)+'개는 서버에서 그대로 쓰이고 있어요. '+
     '여기서 보고 고치려면 서버를 새로 올려야 해요(체크 서버 다음 판 — 단가 창구). 바꿀 단가가 있으면 차곳간에 알려 주세요.</div>' : '')+''',
    '''  (PRICE_OK===false ? '<div class="msg info">지금 단가 구간 '+won(COUNTS.단가표||0)+'개는 서버에서 그대로 쓰여요. '+
     '여기서 고치려면 서버를 새로 올려야 해요(체크 서버 v40 이상).</div>' : '')+''')

rep('$("hdVer").textContent="체크 v48 · "', '$("hdVer").textContent="체크 v48.1 · "')
assert "prompt(" not in s.replace("payConfirm", "")
assert CSS11 in s and CSS10 not in s
open(BASE + "2_차곳간_체크_index_v48.1.html", "w", encoding="utf-8").write(s)
print("OK v48.1", len(s))
