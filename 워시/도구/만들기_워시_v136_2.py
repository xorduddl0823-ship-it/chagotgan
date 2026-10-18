"""워시 v136.1 → v136.2 (오류만 최소로 고침 · 새 기능 없음). 총괄 10/18 급함 — 브라더 대표 계정이 PC 잠금 화면에 막힘
쓰는 법: python3 워시/도구/만들기_워시_v136_2.py  (v136.1 판 위에 덧붙임 — v136.1 은 덮어쓰지 않아요)
  잠금 화면(authLocked)만 바꿔요. 돈 함수·자리 세는 법(checkDevice)은 그대로예요.
  ① 제목 «로그인할 수 없어요» + 이유 «PC로 들어올 수 있는 자리(2대)가 모두 쓰이고 있어요» + 지금 자리를 쓰는 기기(이름 · 쓴 사람 · 마지막 접속)
  ② 대표(owner)만: 기기 옆 «내보내기» → 확인 → 그 자리를 비우고 바로 들어가기. 직원은 «대표에게 문의해 주세요»
  ③ 잠금 상자 글 가운데 정렬
운영 v111 · 시험판 v125 · v126 ~ v137 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v136_1.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v136_2.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v136.1 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v136.2 · UI 3.0 · 2026-10-18";')

rep('''function authLocked(p){
  showAuth(
   '<div class="plate-result warn" style="margin:0 0 14px;font-size:15px;line-height:1.7">'+
     '<b style="font-size:17px">들어올 수 없어요</b><br>'+
     '차곳간에 문의해 주세요.</div>'+
   '<button class="btn primary big" id="lkRetry">다시 시도</button>'+''',
'''function authLocked(p){
  /* v136.2 이유와 자리를 쓰는 기기를 보여 주고, 대표는 다른 기기를 내보내고 들어올 수 있어요 */
  var kind=devKind(), kname=(kind==="pc"?"PC":"휴대폰"), owner=!!(p&&p.role==="owner");
  var used=devList().filter(function(d){return d&&d.kind===kind;});
  var rows=used.map(function(d,i){
    return '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line);text-align:left">'+
      '<div style="min-width:0"><b style="font-size:14px">'+esc(d.name||"기기")+'</b>'+
        '<div style="font-size:12.5px;color:var(--muted)">'+esc(d.by||"")+(d.by?' · ':'')+'마지막 접속 '+esc(fmtTime(d.at||d.addedAt))+'</div></div>'+
      (owner?'<button class="btn" data-lkout="'+i+'" style="flex:none">내보내기</button>':'')+'</div>';
  }).join("");
  showAuth(
   '<div class="plate-result warn" style="margin:0 0 14px;font-size:15px;line-height:1.7;text-align:center">'+
     '<b style="font-size:17px">로그인할 수 없어요</b><br>'+
     kname+'로 들어올 수 있는 자리('+devLimit(kind)+'대)가 모두 쓰이고 있어요.<br>'+
     (owner?'아래에서 안 쓰는 기기를 <b>내보내면</b> 바로 들어와요.':'대표에게 문의해 주세요.')+'</div>'+
   (rows?'<div style="margin:0 0 14px"><div style="font-size:13px;color:var(--muted);margin-bottom:2px;text-align:center">지금 자리를 쓰는 기기</div>'+rows+'</div>':'')+
   '<button class="btn primary big" id="lkRetry">다시 시도</button>'+''')
rep('''  $("lkBack").onclick=function(){authLogin();};
  /* 잠금 화면에서도 로고를 빠르게 5번 누르면 숨은 관리자 계정이 보여요 */''',
'''  $("lkBack").onclick=function(){authLogin();};
  /* v136.2 대표만: 고른 기기를 자리에서 빼고 다시 들어가요 (자리 세는 법은 checkDevice 그대로) */
  if(owner)Array.prototype.forEach.call(document.querySelectorAll("[data-lkout]"),function(b){
    b.onclick=function(){
      var d=used[Number(b.getAttribute("data-lkout"))];if(!d)return;
      ask((d.name||"기기")+(d.by?" ("+d.by+")":"")+" 을(를) 내보낼까요? 그 기기는 다음에 다시 로그인해야 해요.",function(){
        b.disabled=true;b.textContent="내보내는 중…";
        var left=devList().filter(function(x){return x!==d&&!(x&&x.id===d.id&&x.kind===d.kind);});
        saveDevList(left).then(function(){toast("내보냈어요");login(p);})
          .catch(function(e){b.disabled=false;b.textContent="내보내기";toast(errMsg(e),true);});
      },"내보내기",true);
    };
  });
  /* 잠금 화면에서도 로고를 빠르게 5번 누르면 숨은 관리자 계정이 보여요 */''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
