"""체크 v24 → 체크 v25 새 판. v24 는 읽기만 한다.
쓰는 법: python3 체크/도구/만들기_체크_v22.py && … _v23.py && … _v24.py && python3 체크/도구/만들기_체크_v25.py
바꾸는 것 (총괄 방 2026-10-15, 대표님이 운영 v21에서 직원을 넣으려다 막히심):
  1) 홈 — 옛 「오늘 할 일」 칸을 빼고 할 일 카드 3장 + 「모두 보기」만 (관리 v4.0과 같은 방식)
  2) 설정 › 설정 백업 — 글자만 박힌 가짜 카드(서버 연결 · 직원 권한 · 되돌리기 · 설정 잠금 · 내보내기)를
     진짜 값 한 칸 + 「준비 중」 한 칸으로. 직원 넣기 창구는 서버 방에 요청 (체크/요청서/2026-10-15_직원_권한_창구.md)
  3) 화면 파일에 박혀 있던 실제 전화번호 · 계좌 · 이름을 지어낸 예시로
  4) 설정 안 작은 탭 차례 · 묶음 정리: 정산 기준 → 연결 → 이 화면
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v24.html"
OUT = BASE + "2_차곳간_체크_index_v25.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 1) 홈: 옛 「오늘 할 일」 칸 빼기 (TODOS 계산은 그대로 — 카드 3장과 「모두 보기」가 씀) ──
rep('''    card("오늘 할 일","",
      (function(){''', '''    cggNoCard("오늘 할 일","",
      (function(){''')
rep('''  '<div class="cgg-acts" id="cggActs"></div>'+''',
    '''  '<div class="cgg-acts" id="cggActs"></div><div class="cgg-more" id="cggMore"></div>'+''')
rep('''function cggIc(n){ return (window.CGG&&CGG.ic)?CGG.ic(n):""; }''',
    '''function cggIc(n){ return (window.CGG&&CGG.ic)?CGG.ic(n):""; }
/* v25: 홈 옛 「오늘 할 일」 칸은 그리지 않음 (할 일 계산만 하고 버림) */
function cggNoCard(){ return ""; }''')

# ── 2) 설정 백업: 가짜 카드 정리 ──
i = s.index('PAGE.backup=function(){')
j = s.index('\n};\n', i) + 4
s = s[:i] + '''PAGE.backup=function(){
  /* v25: 예전 카드 다섯 장은 글자만 박힌 가짜였습니다(단추를 눌러도 아무 일 없음). 진짜 값만 남기고 나머지는 「준비 중」으로 */
  var ver=String(ST.ver||"").match(/v[\\d.]+/i);
  return head("설정 백업","차곳간체크는 자료를 서버에 두기 때문에 PC끼리 따로 맞출 일이 없어요. 회사 PC에서 고치면 집 PC에도 그대로 보여요.")+
  card("지금 연결","",
    kvs([["검사소",esc((ST.shopName||"—")+(ST.officeCode?" ("+ST.officeCode+")":""))],
         ["서버",esc(ver?("check-api "+ver[0]):"확인 중")],["주소",esc(location.host||"—")]]))+
  card("준비 중인 기능",
    "아래 기능은 서버 창구가 생기면 이 자리에 붙여요. 지금은 눌러도 되는 단추가 없어요.",
    '<ul class="cgg-todo-list">'+
      '<li><b>직원 권한</b> — 직원을 넣고 빼거나 비밀번호를 다시 정하기. 지금은 차곳간 본사(관리)에서 넣어 드려요.</li>'+
      '<li><b>되돌리기</b> — 설정이 바뀔 때마다 한 벌씩 남겨 두고 그때로 되돌리기</li>'+
      '<li><b>설정 잠금</b> — 설정 화면을 열 때 암호 묻기</li>'+
      '<li><b>내보내기 · 가져오기</b> — 설정을 파일로 내보내거나 다시 넣기</li>'+
    '</ul>');
};
''' + s[j:]

# ── 3) 박혀 있던 실제 정보 → 지어낸 예시 ──
rep('''<input type="text" style="width:100%" value="신한 110-496-002410 이택영(가온진단평가)">''',
    '''<input type="text" style="width:100%" placeholder="예: 국민 000-00-0000-000 홍길동">''')
rep('''<input type="text" style="width:100%" value="카카오뱅크 3333-01-3012250 이택영">''',
    '''<input type="text" style="width:100%" placeholder="예: 카카오뱅크 0000-00-0000000 홍길동">''')
rep('''(POP.corpName||"가온진단평가")''', '''(POP.corpName||ST.shopName||"우리 검사소")''')
for old, new in [
    ("신한 110-496-002410 이택영(가온진단평가)", "국민 000-00-0000-000 홍길동"),
    ("신한 110-496-002410", "국민 000-00-0000-000"),
    ("카카오뱅크 3333-01-3012250", "카카오뱅크 0000-00-0000000"),
    ("01096953663 에서", "설정에 적은 보내는 번호에서"),
    ("유현호 (+ 임동재)", "홍길동 (+ 김철수)"),
    ("유현호", "홍길동"),
    ("수원 도이치오토월드", "○○ 전시장"),
    ("가온진단평가", "○○검사소"),
    ("이택영", "홍길동"),
    ("예: gaon_check", "예: abc_check"),
]:
    s = s.replace(old, new)
for bad in ["110-496", "3333-01", "01096953663", "010-5898", "010-9695", "이택영", "유현호", "도이치", "가온진단평가"]:
    if bad in s:
        raise SystemExit("아직 남음: " + bad)

# ── 4) 설정 안 작은 탭: 차례 · 묶음 ──
rep('''var SETS=[["price","단가표"],["partner","거래처"],["popbill","팝빌 연동"],["fee","검사자 수수료"],
  ["sms","문자 자동수집"],["alarm","알람 소리"],["backup","설정 백업"]];''',
    '''/* v25: 묶음으로 정리 — 정산 기준(누구에게 · 얼마) → 연결(팝빌 · 문자) → 이 화면(소리 · 백업) */
var SETS=[["partner","거래처"],["price","단가표"],["fee","검사자 수수료"],
  ["popbill","팝빌 연동"],["sms","문자 자동수집"],
  ["alarm","알람 소리"],["backup","설정 백업"]];
var SETLBL={partner:"정산 기준",popbill:"연결",alarm:"이 화면"};''')
rep('''  if(subs) $("cggSub").innerHTML=subs.map(function(s){
    return '<button role="tab" ''',
    '''  if(subs) $("cggSub").innerHTML=subs.map(function(s){
    return (G[0]==="set" && SETLBL[s[0]] ? '<span class="cgg-sublbl">'+SETLBL[s[0]]+'</span>' : '')+'<button role="tab" ''')

# 할 일 카드 아래 「모두 보기」 (AFTER.home 의 todoMoreBtn 연결을 그대로 씀)
rep('''      function(i){ var t=list[i]; if(t && t[4] && t[4]!=="home") go(t[4]); });''',
    '''      function(i){ var t=list[i]; if(t && t[4] && t[4]!=="home") go(t[4]); });
    var more=document.getElementById("cggMore");
    if(more) more.innerHTML=(TODOS||[]).length>3
      ? '<button type="button" class="todoMore" id="todoMoreBtn">할 일 <b>'+TODOS.length+'건</b> 모두 보기</button>' : "";''')
rep('''.cgg-main #main{margin:0}''', '''.cgg-main #main{margin:0}
.cgg-sublbl{flex:none;align-self:center;font-size:11.5px;font-weight:800;color:var(--muted);margin:0 2px 0 8px}
.cgg-sublbl:first-child{margin-left:0}
.cgg-more{margin:-6px 0 16px}
.cgg-more .todoMore{width:100%;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;font-size:13.5px;cursor:pointer}
.cgg-todo-list{margin:0;padding-left:20px;line-height:1.8;font-size:14px;color:var(--text)}
.cgg-todo-list b{font-weight:800}''')

# 판 번호
rep('''  $("hdVer").textContent="체크 v24 · "''', '''  $("hdVer").textContent="체크 v25 · "''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
