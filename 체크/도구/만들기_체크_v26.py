"""체크 v25 → 체크 v26 새 판. v25 는 읽기만 한다. (서버 check-api v25 짝 — 서버/설계/06_체크_직원권한_창구.md)
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v25.py && python3 체크/도구/만들기_체크_v26.py
바꾸는 것: 설정 › 설정 백업 「준비 중인 기능」에 있던 직원 권한을 진짜 칸으로
  - staffList 로 목록, staffAdd(이름, 휴대폰, 권한)로 넣기, staffEdit(id, {권한|사용|비밀번호초기화})로 고치기
  - 고칠 사람은 staffList 의 id 로 고름 (휴대폰은 가려서 옴)
  - 「나: Y」 줄에는 멈춤 · 직원으로 내리기 단추를 숨김 (서버도 막지만 헷갈리지 않게)
  - 대표만 보임 (직원 계정에는 안내만 — 서버도 대표만 받음)
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간체크_index_v25.html".replace("2_차곳간체크", "2_차곳간_체크")
OUT = BASE + "2_차곳간_체크_index_v26.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('''  card("준비 중인 기능",''', '''  card("직원 권한",
    "체크에 들어올 수 있는 사람을 정해요. 대표는 모든 화면을, 직원은 설정을 뺀 화면을 볼 수 있어요. "+
    "새 직원은 체크에 처음 로그인할 때 비밀번호를 정해요. 넣은 뒤 바로 알려 주세요.",
    '<div id="staffBox"><div class="hint">불러오는 중…</div></div>')+
  card("준비 중인 기능",''')
rep('''      '<li><b>직원 권한</b> — 직원을 넣고 빼거나 비밀번호를 다시 정하기. 지금은 차곳간 본사(관리)에서 넣어 드려요.</li>'+\n''', '')

STAFF = r'''
/* ── v26: 설정 › 설정 백업 › 직원 권한 (서버 check-api v25 staffList · staffAdd · staffEdit, 대표만) ── */
var STAFF=[];
function staffDraw(){
  var box=$("staffBox"); if(!box) return;
  if(ST.role!=="owner"){ box.innerHTML='<div class="hint">직원 권한은 대표만 보고 고칠 수 있어요.</div>'; return; }
  function tag(t,c){ return '<span class="tag" style="background:var(--'+c+'-soft);color:var(--'+c+')">'+esc(t)+'</span>'; }
  var rows=STAFF.map(function(u){
    var me=(u.나==="Y"), on=(u.사용!=="N"), owner=(u.권한==="대표");
    var b=[];
    if(!me) b.push('<button class="btn" data-st="use" data-id="'+esc(u.id)+'" data-v="'+(on?"N":"Y")+'">'+(on?"멈추기":"다시 쓰게 하기")+'</button>');
    if(!(me && owner)) b.push('<button class="btn" data-st="role" data-id="'+esc(u.id)+'" data-v="'+(owner?"직원":"대표")+'">'+(owner?"직원으로":"대표로")+'</button>');
    b.push('<button class="btn" data-st="pw" data-id="'+esc(u.id)+'">비밀번호 초기화</button>');
    return '<tr><td><b>'+esc(u.이름||"—")+'</b>'+(me?' <span class="hint" style="display:inline">(나)</span>':'')+'</td>'+
      '<td>'+esc(u.휴대폰||"")+'</td>'+
      '<td>'+(owner?tag("대표","brand"):tag("직원","good"))+'</td>'+
      '<td>'+(on?tag("씀","good"):tag("멈춤","warn"))+'</td>'+
      '<td>'+(u.비밀번호==="정함"?tag("정함","good"):tag("처음 로그인 때 정함","warn"))+'</td>'+
      '<td>'+esc(shortTs(u.마지막로그인)||"—")+'</td>'+
      '<td><div class="staff-btns">'+b.join("")+'</div></td></tr>';
  }).join("");
  box.innerHTML=
    '<div class="staff-add">'+
      '<input id="stName" placeholder="이름" autocomplete="off">'+
      '<input id="stPhone" placeholder="휴대폰 번호" inputmode="tel" autocomplete="off">'+
      '<select id="stRole"><option>직원</option><option>대표</option></select>'+
      '<button class="btn primary" id="stAdd">+ 사람 추가</button></div>'+
    '<div class="staff-wrap"><table class="staff-t"><thead><tr><th>이름</th><th>휴대폰</th><th>권한</th><th>사용</th><th>비밀번호</th><th>마지막 로그인</th><th></th></tr></thead>'+
    '<tbody>'+(rows||'<tr><td colspan="7" class="hint">아직 넣은 사람이 없어요.</td></tr>')+'</tbody></table></div>'+
    '<div class="hint" style="margin-top:8px">권한 · 사용 · 비밀번호를 바꾸면 그 사람은 다시 로그인해야 해요. 대표는 한 명 이상 있어야 하고, 나 자신은 멈추거나 직원으로 내릴 수 없어요.</div>';
  $("stAdd").onclick=function(){
    var n=$("stName").value.trim(), p=$("stPhone").value.replace(/[^0-9]/g,""), r=$("stRole").value;
    if(!n){ bar("이름을 넣어 주세요.","err"); $("stName").focus(); return; }
    if(p.length<10){ bar("휴대폰 번호를 다시 확인해 주세요.","err"); $("stPhone").focus(); return; }
    ask({ title:"«"+n+"» 님을 "+r+"(으)로 넣을까요?", sub:"그 번호로 체크에 처음 로그인할 때 비밀번호를 정해요.", yes:"넣기" }, function(){
      busy(true);
      call("staffAdd",[n,p,r]).then(function(){ busy(false); bar("«"+n+"» 님을 넣었어요. 처음 로그인할 때 비밀번호를 정하라고 알려 주세요.","ok"); staffLoad(); })
        .catch(function(e){ busy(false); bar(e.message||"넣지 못했어요.","err"); });
    });
  };
  Array.prototype.forEach.call(box.querySelectorAll("[data-st]"), function(btn){
    btn.onclick=function(){
      var id=btn.getAttribute("data-id"), k=btn.getAttribute("data-st"), v=btn.getAttribute("data-v");
      var u=STAFF.filter(function(x){ return String(x.id)===id; })[0]||{}, nm=u.이름||"";
      var patch = k==="use" ? {사용:v} : k==="role" ? {권한:v} : {비밀번호초기화:true};
      var title = k==="use" ? (v==="N" ? "«"+nm+"» 님을 멈출까요?" : "«"+nm+"» 님을 다시 쓰게 할까요?")
                : k==="role" ? "«"+nm+"» 님을 "+v+"(으)로 바꿀까요?" : "«"+nm+"» 님의 비밀번호를 초기화할까요?";
      var sub = k==="pw" ? "다음에 로그인할 때 새 비밀번호를 정해요." : "바꾸면 그 사람은 다시 로그인해야 해요.";
      ask({ title:title, sub:sub, yes:"바꾸기" }, function(){
        busy(true);
        call("staffEdit",[id,patch]).then(function(){ busy(false); bar("바꿨어요.","ok"); staffLoad(); })
          .catch(function(e){ busy(false); bar(e.message||"바꾸지 못했어요.","err"); });
      });
    };
  });
}
function staffLoad(){
  if(ST.role!=="owner"){ staffDraw(); return; }
  call("staffList",[]).then(function(r){ STAFF=r||[]; staffDraw(); })
    .catch(function(e){ var box=$("staffBox"); if(box) box.innerHTML='<div class="msg" style="background:var(--danger-soft);color:var(--danger)">'+esc(e.message||"목록을 불러오지 못했어요.")+'</div>'; });
}
AFTER.backup=function(){ staffLoad(); };
'''
rep('''/* ── 설정 › 팝빌 연동 ── */''', STAFF + '''\n/* ── 설정 › 팝빌 연동 ── */''')

rep('''.cgg-todo-list b{font-weight:800}''', '''.cgg-todo-list b{font-weight:800}
.staff-add{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.staff-add input,.staff-add select{height:43px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:14.5px;background:var(--surface);color:var(--text);min-width:0}
.staff-add #stName{flex:1 1 120px} .staff-add #stPhone{flex:1 1 150px} .staff-add select{flex:0 0 96px}
.staff-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.staff-t{width:100%;border-collapse:collapse;font-size:14px;min-width:760px}
.staff-t th,.staff-t td{padding:0 12px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}
.staff-t tr:last-child td{border-bottom:0}
.staff-btns{display:flex;gap:6px;justify-content:flex-end}
.staff-btns .btn{min-height:34px;height:34px;padding:0 10px;font-size:12.5px;border-radius:10px}''')

rep('''  $("hdVer").textContent="체크 v25 · "''', '''  $("hdVer").textContent="체크 v26 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
