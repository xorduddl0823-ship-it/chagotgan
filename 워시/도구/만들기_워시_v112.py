"""워시 v111(운영 중) → 워시 v112 새 판을 만든다. 운영 파일은 읽기만 한다.
쓰는 법: python3 워시/도구/만들기_워시_v112.py
바꾸는 것 (대표님 2026-10-14 결정 · 운영/요청서/2026-10-14_05_전부_실행.md 「워시」 줄):
  1) 메뉴를 J안 4판 묶음으로: 홈 · 매출 · 일감(입출고 내역 · 출고 기록) · 청구서 · 입출금 · 세금계산서 · 자재 · 설정
     (탭 순서 그대로, 화면 · 기능은 하나도 없애지 않음)
  2) 휴지통 「나」안: 설정 안 · 머리말에서 빼고 사람 단추(마이페이지) 안 한 곳만. 빨간 개수는 사람 단추 위에
  3) 머리말 그림 문자 빼기 (공지사항 · 도움말 · 링크 복사 · 새로고침)
  4) 로그인 · 가입 안내 문구를 일반 사이트 표준형으로 (워시/시안/가입완료_문구_시안.html 표 그대로)
  5) 겉모양을 J안 4판 값으로 (남색 머리말, 색 · 모서리 · 버튼 · 표) — 맨 끝에 덮개로 붙임
서버 주소 · 창구 · 저장 방식은 한 글자도 바꾸지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v112.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 판 번호 ──
rep('var APP_VER="워시 v111 · UI 1.1 · 2026-10-12";', 'var APP_VER="워시 v112 · UI 3.0 · 2026-10-15";')
rep('<meta name="theme-color" content="#1668C4">', '<meta name="theme-color" content="#0B2545">')

# ── 1) 메뉴 묶음 — 큰 메뉴 8개, 「일감」 안에 입출고 내역 · 출고 기록 ──
rep('''var APP_VER="워시 v112''', '''/* J안 4판 메뉴 이름 (v112) — 화면 열쇠(S.tab)는 그대로, 큰 메뉴 글자만 */
var JLAB={sales:"매출",ledger:"일감",bill:"청구서",money:"입출금"};
var WORKSUB=[["ledger","입출고 내역"],["outlog","출고 기록"]];
var APP_VER="워시 v112''')
rep('''  $("tabs").innerHTML=tabs.map(function(t){
    var label=t[1];
    if(t[0]==="settings")label+=(S.tab==="settings"?" ▾":" ▸");
    return '<button data-t="'+t[0]+'" role="tab" title="'+esc(t[1])+'" aria-selected="'+(t[0]===S.tab)+'">'+label+'</button>';}).join("");
  Array.prototype.forEach.call($("tabs").children,function(b){
    b.onclick=function(){
      var t=b.getAttribute("data-t");
      if(t==="settings"&&S.tab==="settings"){
        S.tab=(S.prevTab&&S.prevTab!=="settings")?S.prevTab:(S.mode==="pc"?"home":"in");
        decideMode(false);window.scrollTo(0,0);return;}
      if(S.tab!=="settings")S.prevTab=S.tab;''',
'''  /* J안: 「입출고 내역」 · 「출고 기록」은 큰 메뉴 「일감」 하나로 묶고, 안쪽 작은 탭으로 나눕니다 */
  var sb0=$("setSub"); if(sb0&&sb0.parentNode===$("tabs"))$("tabs").parentNode.insertBefore(sb0,$("tabs").nextSibling);
  var pcT=(S.mode==="pc"), hasL=tabs.some(function(t){return t[0]==="ledger";});
  var shown=tabs.filter(function(t){return !(pcT&&hasL&&t[0]==="outlog");});
  $("tabs").innerHTML=shown.map(function(t){
    var on=(t[0]===S.tab)||(pcT&&t[0]==="ledger"&&S.tab==="outlog");
    var label=pcT?(JLAB[t[0]]||(t[0]==="outlog"?"일감":t[1])):t[1];
    return '<button data-t="'+t[0]+'" role="tab" title="'+esc(label)+'" aria-selected="'+on+'">'+label+'</button>';}).join("");
  Array.prototype.forEach.call($("tabs").children,function(b){
    b.onclick=function(){
      var t=b.getAttribute("data-t");
      if(t==="ledger"&&S.tab==="outlog")return;
      if(S.tab!=="settings")S.prevTab=S.tab;''')
# 아이콘 메뉴에서도 「일감」 작은 탭이 보이게 (설정처럼 메뉴가 잠깐 넓어짐)
rep('''+(lm==="icon"&&pc&&S.tab==="settings"?" setopen":"")''',
    '''+(lm==="icon"&&pc&&(S.tab==="settings"||S.tab==="ledger"||S.tab==="outlog")?" setopen":"")''')
rep('''  $("setSub").hidden=(S.tab!=="settings");''',
    '''  var inWork=(S.mode==="pc"&&(S.tab==="ledger"||S.tab==="outlog"));
  $("setSub").hidden=(S.tab!=="settings")&&!inWork;
  if(inWork){
    var ws=WORKSUB.filter(function(w){return tabs.some(function(t){return t[0]===w[0];});});
    $("setSub").hidden=ws.length<2;
    $("setSub").innerHTML=ws.map(function(w){
      return '<button data-s="'+w[0]+'" aria-selected="'+(w[0]===S.tab)+'">'+w[1]+'</button>';}).join("");
    Array.prototype.forEach.call($("setSub").children,function(b){
      b.onclick=function(){S.tab=b.getAttribute("data-s");decideMode(false);window.scrollTo(0,0);};});
  }''')

# ── 2) 휴지통 「나」안 — 설정 작은 탭 · 머리말에서 빼고 사람 단추 안으로 ──
rep('''function renderSettings(){
  $("setSub").innerHTML=setSubFor().map(function(t){''',
    '''function renderSettings(){
  /* 휴지통은 설정에서 빼고 사람 단추(마이페이지) 안 한 곳만 (대표님 「나」안, 2026-10-14) */
  $("setSub").innerHTML=setSubFor().filter(function(t){return t[0]!=="trash";}).map(function(t){''')
rep('''el.innerHTML='🗑 휴지통'+(n?(' <span class="trbdg">'+n+'</span>'):'');''',
    '''el.innerHTML='휴지통'+(n?(' <span class="trbdg">'+n+'</span>'):'');
    /* 빨간 개수는 사람 단추 위에 (J안) */
    var ml=document.querySelector("#hWho .mypglb");
    var own=(typeof isOwner==="function")&&isOwner();
    if(ml)ml.innerHTML=(own?'마이페이지 · 휴지통':'마이페이지')+(own&&n?(' <span class="trbdg">'+n+'</span>'):'');''')
rep('<span class="mypglb">👤 마이페이지</span>', '<span class="mypglb">마이페이지 · 휴지통</span>')
rep('''  var th = mpTheme(), ly = layoutMode();''',
    '''  var trN = (S.trash || []).length;
  /* 휴지통은 원래대로 대표만 (매니저 · 직원 설정에는 휴지통이 없음) */
  if (setSubFor().some(function (t) { return t[0] === "trash"; }))
  h += '<div class="mcard"><div class="mh"><b>휴지통</b><span>지운 자료를 되돌려요</span></div>' +
    '<div class="mrow2"><button class="btn" data-mp="trash">휴지통 열기' + (trN ? (' (' + trN + '건)') : '') + '</button></div></div>';

  var th = mpTheme(), ly = layoutMode();''')
rep('''      else if (k === "out") { closeSheet(); $("btnOut2").click(); }''',
    '''      else if (k === "out") { closeSheet(); $("btnOut2").click(); }
      else if (k === "trash") { closeSheet(); $("btnTrash").click(); }''')

# ── 3) 머리말 그림 문자 빼기 ──
rep('<button class="mini" id="btnHelp" title="기능 설명서">❓ 도움말</button>', '<button class="mini" id="btnHelp" title="기능 설명서">도움말</button>')
rep('<button class="mini" id="btnTrash" title="지운 자료 되돌리기">🗑 휴지통</button>', '<button class="mini" id="btnTrash" title="지운 자료 되돌리기">휴지통</button>')
rep('<button class="mini" id="btnLink" title="직원에게 보낼 주소">🔗 주소</button>', '<button class="mini" id="btnLink" title="직원에게 보낼 주소">링크 복사</button>')
rep('<button class="mini" id="btnRefresh" title="새로고침">↻ 새로고침</button>', '<button class="mini" id="btnRefresh" title="새로고침">새로고침</button>')
rep('''$("btnRefresh").textContent="↻ …";''', '''$("btnRefresh").textContent="불러오는 중…";''')
rep('''.then(function(){$("btnRefresh").textContent="↻ 새로고침";});''', '''.then(function(){$("btnRefresh").textContent="새로고침";});''')
rep('''b.innerHTML = '📢 공지' + ''', '''b.innerHTML = '공지사항' + ''')
rep('''b.innerHTML="📢 공지";''', '''b.innerHTML="공지사항";''')
rep('화면 위쪽 <b>[📢 공지]</b> 를 누르면', '화면 위쪽 <b>[공지사항]</b>을 누르면')
rep('그래도 [📢 공지] 목록에는', '그래도 [공지사항] 목록에는')
rep('''$("btnMode").textContent=S.mode==="pc"?"현장 화면":"↩ PC 화면으로";''', '''$("btnMode").textContent=S.mode==="pc"?"현장 화면":"PC 화면";''')
rep('''el.textContent=pc?"현장 화면":"↩ PC 화면으로";''', '''el.textContent=pc?"현장 화면":"PC 화면";''')

# ── 4) 로그인 · 가입 안내 — 일반 사이트 표준형 (워시/시안/가입완료_문구_시안.html) ──
for a, b in [
    ('return msg("번호와 비밀번호를 넣어주세요",true)', 'return msg("휴대폰 번호와 비밀번호를 입력해 주세요.",true)'),
    ('return msg("휴대폰 번호를 넣어주세요",true)', 'return msg("휴대폰 번호를 입력해 주세요.",true)'),
    ('msg("문자를 보냈습니다. 5분 안에 입력해 주세요")', 'msg("인증번호를 발송했습니다. 5분 안에 입력해 주세요.")'),
    ('return msg("인증번호 6자리를 넣어주세요",true)', 'return msg("인증번호 6자리를 입력해 주세요.",true)'),
    ('"이미 가입된 번호입니다. 로그인해 주세요"', '"이미 가입된 휴대폰 번호입니다. 로그인해 주세요."'),
    ('msg("확인됐습니다")', 'msg("인증이 완료되었습니다.")'),
    ('return msg("상호를 넣어주세요",true)', 'return msg("상호를 입력해 주세요.",true)'),
    ('return msg("비밀번호는 6자 이상으로 해주세요",true)', 'return msg("비밀번호는 6자 이상 입력해 주세요.",true)'),
    ('return msg("비밀번호가 서로 다릅니다",true)', 'return msg("비밀번호가 일치하지 않습니다.",true)'),
    ('msg("사업장을 만드는 중…")', 'msg("가입 처리 중입니다…")'),
    ('msg("비밀번호를 바꿨습니다. 로그인해 주세요")', 'msg("비밀번호가 변경되었습니다. 다시 로그인해 주세요.")'),
]:
    n = s.count(a)
    if n < 1:
        raise SystemExit("문구 못 찾음: " + a)
    s = s.replace(a, b)
# 「들어가기」 단추 · 비밀번호 칸 이름 (가입 창 안에서만 쓰는 글자)
i = s.index("function ccwAuthUI"); j = s.index("function supaInit", i)
blk = s[i:j]
for a, b in [('go="들어가기"', 'go="로그인"'), ('busy(false,"들어가기")', 'busy(false,"로그인")'),
             ('>비밀번호 한 번 더</label>', '>비밀번호 확인</label>'), ('>한 번 더</label>', '>비밀번호 확인</label>'),
             ('placeholder="한 번 더"', 'placeholder="비밀번호를 한 번 더 입력"'),
             # 대표님 확정 (2026-10-15, 규칙 4-1): 가입 · 로그인 · 오류 안내는 일반 사이트 표준형(~습니다)
             ('대표님 휴대폰 번호를 넣어주세요.', '대표자 휴대폰 번호를 입력해 주세요.'),
             ('인증번호를 문자로 보내드립니다.', '입력하신 번호로 인증번호를 보내 드립니다.'),
             ('이미 가입했어요 — 로그인', '이미 회원이신가요? 로그인'),
             (' 으로 보냈습니다', ' 번호로 인증번호를 보냈습니다.'),
             ('앞으로 로그인할 때 쓸 비밀번호입니다 (6자 이상)', '로그인할 때 사용할 비밀번호를 입력해 주세요. (6자 이상)'),
             ('비밀번호 바꾸기', '비밀번호 변경'),
             ('으로 골랐습니다. 다르면 눌러서 바꿔주세요.', '(으)로 선택했습니다. 다르면 눌러서 변경해 주세요.'),
             ('msg("문자를 보냈습니다")', 'msg("인증번호를 발송했습니다.")'),
             ('"만드는 중…"', '"처리 중…"'), ('"바꾸는 중…"', '"변경 중…"'),
             ('새 업체 가입하기', '회원가입'), ('인증번호 다시 받기', '인증번호 재발송'),
             ('가입하신 휴대폰 번호로 인증번호를 보내드립니다.', '가입하신 휴대폰 번호로 인증번호를 보내 드립니다.')]:
    if a not in blk:
        raise SystemExit("가입 창 글자 못 찾음: " + a)
    blk = blk.replace(a, b)
s = s[:i] + blk + s[j:]

# 직원 코드 로그인 화면(예전 방식)도 같은 표준형
s = s.replace('쓰실 분을 고르고 코드를 넣어주세요', '사용하실 분을 선택하고 코드를 입력해 주세요.')
rep('id="aGo">들어가기</button>', 'id="aGo">로그인</button>')

# ── 버튼 이름 — J안 「말 바꾼 곳」 표 ──
s = s.replace('>엑셀로 받기</button>', '>엑셀 다운로드</button>')
s = s.replace('>엑셀로 받기 (요약)</button>', '>엑셀 다운로드 (요약)</button>')
rep('''placeholder="🔍 '+esc(opt.ph||"표에서 찾기")+'">''', '''placeholder="🔍 '+esc(opt.ph||"검색")+'">''')
rep('''placeholder="🔍 표에서 찾기" value="''', '''placeholder="🔍 검색" value="''')


# ── 세로 · 아이콘 메뉴: 작은 탭(일감 · 설정)을 고른 묶음 바로 아래에 (J안) + 한 번만 안내 ──
rep('''  ccwNavSync();
  renderAll();
  renameNote();
}''', '''  ccwNavSync();
  renderAll();
  /* J안: 세로 · 아이콘 메뉴에서는 작은 탭을 고른 큰 메뉴 바로 밑에 붙입니다 */
  try{
    var lmJ=layoutMode(), sbJ=$("setSub"), onJ=$("tabs").querySelector('[aria-selected="true"]');
    if(S.mode==="pc"&&window.innerWidth>=1000&&(lmJ==="side"||lmJ==="icon")&&onJ&&!sbJ.hidden) onJ.insertAdjacentElement("afterend",sbJ);
  }catch(e){}
  renameNote();
  j4Note();
}
/* 새 모양(J안)으로 바뀐 것을 한 번만 알려 드립니다 */
function j4Note(){
  try{
    if(!S.me||S.mode!=="pc")return;
    if(localStorage.getItem("ccw_rn_j4"))return;
    localStorage.setItem("ccw_rn_j4","1");
    setTimeout(function(){toast(isOwner()?"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에, 휴지통은 «마이페이지» 안에 있어요":"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에 있어요");},1600);
  }catch(e){}
}''')

# ── 5) J안 4판 겉모양 — 맨 끝 (앞의 UI 1.1 값을 덮어씀) ──
J = open(os.path.join(HERE, "j4_워시.css"), encoding="utf-8").read()
k = s.rindex("</body>")
s = s[:k] + "\n<!-- ===== J안 4판 겉모양 (워시 v112 · UI 3.0) — 값은 디자인/01_J안_제품별_시안_기준.md 2-6장 그대로 ===== -->\n<style id=\"cgg-j4\">\n" + J + "\n</style>\n" + s[k:]

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
