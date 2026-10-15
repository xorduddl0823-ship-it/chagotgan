"""체크 v39 → 체크 v40 — 오픈 베타 시험판 마무리 (v39 를 대신함 · v39 는 읽기만)
쓰는 법: python3 체크/도구/만들기_체크_v40.py
받은 목록:
  · 보안 방 오픈 베타 바탕 검사(e9993d6) — [중간 S-M1] 오늘 메모 esc · [낮음] 팝빌 창 noopener + 주소 확인 · 로그아웃 때 cgg_lastph · ccw_pay
  · 디자인 방 — 디자인/공통/오픈베타_띠.md 조각 그대로 · 디자인/말_대조표.md (체크 칸)
  · 알림톡 방 — 알림톡/07_워딩_검토/체크_v38.md (대조표가 우선 · 00_대조표_우선.md)
  · 결제 방 — 결제/12_결제_말_대조표.md (결제 말은 워시 최신판 결제 덩어리에서 그대로 — 아래 7)
바꾸는 것:
  1) 보안  2) 오픈 베타 띠(디자인 조각)  3) 오류 글(대조표 3장: 화면은 해요체, 로그인은 표준형)
  4) 말 대조표 · 알림톡 목록  5) 해요체(화면 오류 글 포함)  6) 눌러도 아무 일 없는 버튼 → 「준비 중」, 엑셀 버튼은 진짜로
  7) 결제 덩어리 — 워시 최신판과 같은 말 (워시 방이 고친 줄을 그대로)
"""
import re, sys
sys.path.insert(0, "/home/user/chagotgan/체크/도구")
import 해요체
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v39.html"
OUT = BASE + "2_차곳간_체크_index_v40.html"
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

def payblock(t):
    a = t.index("  function cwRpc(fn, args){")
    b = t.index("\n})();", a)
    return t[a:b]

# ───────── 1) 보안 ─────────
# [중간 S-M1] 오늘 할 일의 메모 — 글 · 시간 · 적은 사람을 esc (row · 모두 보기 둘 다 TODOS 에서 받음)
# TODOS 는 글자 그대로 두고(공통 부품 CGG.todos 는 스스로 esc), 글을 HTML 로 바로 넣는 두 곳(row · 모두 보기)에서 esc
rep('''            '<span class="cnt">'+n+'</span>'+
            '<span class="tx"><b>'+(imp?'<span class="imptag">중요</span>':'')+t+'</b>'+
            (sub?('<span>'+sub+'</span>'):'')+'</span><span class="go">›</span></button>';''',
    '''            '<span class="cnt">'+esc(n)+'</span>'+   /* v40: 보안 S-M1 — 메모 글 esc */
            '<span class="tx"><b>'+(imp?'<span class="imptag">중요</span>':'')+esc(t)+'</b>'+
            (sub?('<span>'+esc(sub)+'</span>'):'')+'</span><span class="go">›</span></button>';''')
rep('''          '<span class="cnt">'+x[0]+'</span>'+
          '<span class="tx"><b>'+(imp?'<span class="imptag">중요</span>':'')+x[2]+'</b>'+
          '<span>'+x[3]+'</span></span><span class="go">›</span></button>';''',
    '''          '<span class="cnt">'+esc(x[0])+'</span>'+   /* v40: 보안 S-M1 */
          '<span class="tx"><b>'+(imp?'<span class="imptag">중요</span>':'')+esc(x[2])+'</b>'+
          '<span>'+esc(x[3])+'</span></span><span class="go">›</span></button>';''')
# 메모 저장 — 검사소 + 사람별 (같은 PC의 다른 사람에게 안 보이게)
rep('''    var k="cgg_memos:"+(ST.shop||"");''', '''    var k="cgg_memos:"+(ST.shop||"")+(ST.who?":"+ST.who:"");   /* v40: 검사소 + 사람별 (이름을 모르면 검사소 칸) */''')
rep('''    if(v===null){ var old=localStorage.getItem("cgg_memos"); if(old!==null && ST.shop){ localStorage.setItem(k, old); localStorage.removeItem("cgg_memos"); v=old; } }''',
    '''    if(v===null && ST.who){ ["cgg_memos:"+(ST.shop||""), "cgg_memos"].some(function(ok){ var old=localStorage.getItem(ok);
      if(old!==null && ST.shop){ localStorage.setItem(k, old); localStorage.removeItem(ok); v=old; return true; } return false; }); }''')
rep('''  try { if(ST.shop) localStorage.setItem("cgg_memos:"+ST.shop, JSON.stringify(list)); } catch(e){}''',
    '''  try { if(ST.shop) localStorage.setItem("cgg_memos:"+ST.shop+(ST.who?":"+ST.who:""), JSON.stringify(list)); } catch(e){}''')
# 로그아웃 때 마지막 번호 · 결제 중 표시도 지움
rep('''  ST.key=""; del("cgg_key"); del("cgg_shop"); del("cgg_who"); del("cgg_role"); del("cgg_shopname");
  LOADED={}; drawLogin();
  /* v39''', '''  ST.key=""; del("cgg_key"); del("cgg_shop"); del("cgg_who"); del("cgg_role"); del("cgg_shopname");
  del("cgg_lastph"); try{ localStorage.removeItem("ccw_pay"); }catch(e){}   /* v40: 보안 낮음 */
  LOADED={}; drawLogin();
  /* v39''')
# 팝빌 창 — 팝빌 주소만, 새 창은 opener 끊기
rep('''function txSite(togo, msg){''', '''/* v40: 팝빌 창은 팝빌 주소(https://*.popbill.com)만 · 새 창은 opener 를 끊음 (보안 낮음) */
function popOpen(u){
  var ok=false; try{ var x=new URL(String(u||"")); ok = x.protocol==="https:" && /(^|\\.)popbill\\.com$/i.test(x.hostname); }catch(e){}
  if(!ok){ bar("팝빌 주소가 아니라서 열지 않았어요. 차곳간에 알려 주세요.","err"); return; }
  var w=window.open(String(u),"_blank","noopener,noreferrer"); if(w){ try{ w.opener=null; }catch(e){} }
}
function txSite(togo, msg){''')
rep('''    if(r&&r.url){ window.open(r.url,"_blank"); if(msg) bar(msg,"info"); }''', '''    if(r&&r.url){ popOpen(r.url); if(msg) bar(msg,"info"); }''')
rep('''        busy(false); if(r&&r.url) window.open(r.url,"_blank");''', '''        busy(false); if(r&&r.url) popOpen(r.url);''')
rep('''    window.open(POP.test ? "https://test.popbill.com" : "https://www.popbill.com", "_blank");''',
    '''    popOpen(POP.test ? "https://test.popbill.com" : "https://www.popbill.com");''')
rep('''      busy(false); if(r&&r.url) window.open(r.url,"_blank"); else bar("주소를 받지 못했습니다.","err");''',
    '''      busy(false); if(r&&r.url) popOpen(r.url); else bar("주소를 받지 못했어요. 다시 시도해 주세요.","err");''')

# ───────── 2) 오픈 베타 띠 — 디자인 조각 그대로 ─────────
OLDBETA = '<div class="cgg-beta" role="note"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div>'
rep('''  <div class="cgg-main">''' + OLDBETA + '''<div id="bar"></div>''', '''  <div class="cgg-main"><div id="bar"></div>''')
rep('''  $("root").innerHTML = \'''' + OLDBETA + '''\'+''', '''  $("root").innerHTML =''')
a = s.index("/* v39: 오픈 베타 띠 — 홈페이지 시안 «넣은 안»과 같은 모양 */")
b = s.index("@media (max-width:600px){ .cgg-beta{", a); b = s.index("\n", b)
s = s[:a] + "/* (v40: 오픈 베타 띠는 디자인 조각으로 — 맨 아래 style) */" + s[b:]
BETA_HTML = '<div class="cgg-beta" id="cggBeta" role="note"><div class="in"><b>오픈 베타</b><span>차곳간은 지금 오픈 베타예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div></div>'
BETA_JS = 'try{ if(window.top!==window.self){ document.getElementById("cggBeta").hidden=true; } }catch(e){ document.getElementById("cggBeta").hidden=true; }'
BETA_CSS = '''/* 오픈 베타 띠 (디자인 방 2026-10-15) */
:root{--beta-bg:#0d2440;--beta-ink:#e8f0fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--beta-bg:#1d3a5f}}
:root[data-theme="dark"]{--beta-bg:#1d3a5f}
.cgg-beta{background:var(--beta-bg);color:var(--beta-ink);font-size:13.5px;line-height:1.5;word-break:keep-all}
.cgg-beta .in{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;
  padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.cgg-beta b{background:var(--beta-ink);color:var(--beta-bg);border-radius:6px;padding:1px 8px;font-size:12px;font-weight:800;flex:none}
.cgg-beta[hidden]{display:none}
@media (max-width:600px){.cgg-beta{font-size:12.5px}.cgg-beta .in{display:block;padding-block:6px}.cgg-beta b{margin-right:6px}}'''
rep('''<body>
<div id="root"></div>''', '''<body>
''' + BETA_HTML + '''
<script>''' + BETA_JS + '''</script>
<div id="root"></div>''')
m = re.search(r'<style id="cgg-j4-common">\n.*?\n</style>', s, re.S)
s = s[:m.end()] + '\n<style id="cgg-beta-piece">\n' + BETA_CSS + '\n</style>' + s[m.end():]

# ───────── 3) 오류 글 — 화면은 해요체, 로그인 칸(lg-)은 표준형 ─────────
rep('''function niceMsg(m){
  m=String(m==null?"":m).trim();
  if(!m) return "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
  if(/Failed to fetch|NetworkError|Load failed|network|timed? ?out|aborted|offline/i.test(m))
    return "인터넷 연결이 불안정합니다. 연결을 확인하고 다시 시도해 주세요.";
  if(!/[가-힣]/.test(m) || /undefined|\\bnull\\b|NaN|\\[object /.test(m)){
    try{ console.warn("화면에 그대로 보이지 않게 바꾼 오류 글:", m); }catch(e){}
    return "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
  }
  return m;
}''', '''/* v40: 말 대조표 3장 — 화면 오류는 «○○하지 못했어요. 다시 시도해 주세요.», 로그인 칸은 표준형(formal) */
function niceMsg(m, formal){
  m=String(m==null?"":m).trim();
  var NET = formal ? "연결이 잠시 끊겼습니다. 잠시 후 다시 시도해 주세요." : "연결이 잠시 끊겼어요. 다시 시도해 주세요.";
  var GEN = formal ? "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." : "처리하지 못했어요. 다시 시도해 주세요.";
  if(!m) return GEN;
  if(/Failed to fetch|NetworkError|Load failed|network|timed? ?out|aborted|offline|연결이 잠시 끊겼/i.test(m)) return NET;
  if(!/[가-힣]/.test(m) || /undefined|\\bnull\\b|NaN|\\[object /.test(m)){
    try{ console.warn("화면에 그대로 보이지 않게 바꾼 오류 글:", m); }catch(e){}
    return GEN;
  }
  if(/^처리하지 못했/.test(m)) return GEN;
  if(/^서버에서 답을 받지 못했/.test(m)) return formal ? "서버에서 답을 받지 못했습니다. 잠시 후 다시 시도해 주세요." : "서버에서 답을 받지 못했어요. 다시 시도해 주세요.";
  if(/^서버 설정이 맞지 않아/.test(m)) return formal ? "서버 설정이 맞지 않아 처리하지 못했습니다. 차곳간에 알려 주세요." : "서버 설정이 맞지 않아 처리하지 못했어요. 차곳간에 알려 주세요.";
  return m;
}''')
rep('''  if(kind==="err") text=niceMsg(text);   /* v39 */''', '''  if(kind==="err") text=niceMsg(text, /^lg-/.test(where));   /* v40: 로그인 칸은 표준형 */''')
rep('''function fail(e){ bar((e&&e.message)||"오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "err"); busy(false); }''',
    '''function fail(e){ bar((e&&e.message)||"처리하지 못했어요. 다시 시도해 주세요.", "err"); busy(false); }''')
rep('''      function(e){ say("impMsg", j[1]+" 옮기다 멈췄습니다 : "+e.message, "err"); busy(false); });''',
    '''      function(e){ try{ console.warn(j[1], e); }catch(e2){} say("impMsg", j[1]+" 옮기다 멈췄어요. 다시 시도해 주세요.", "err"); busy(false); });''')
for old in ['''say("insMsg",(e&&e.message)||"안 됐습니다.","err")''', '''say("xlMsg",(e&&e.message)||"안 됐습니다.","err")''']:
    s = s.replace(old, old.replace('"안 됐습니다."', '"올리지 못했어요. 다시 시도해 주세요."'))
rep('''else tell("주소를 받지 못했습니다","잠시 뒤 다시 눌러 주세요.");''', '''else tell("주소를 받지 못했어요","다시 시도해 주세요.");''')
rep('''if(w.length<4){ say("lg-msg","비밀번호를 4자 이상 적어 주세요.","err"); return; }''',
    '''if(w.length<4){ say("lg-msg","비밀번호를 다시 확인해 주세요.","err"); return; }''')

# ───────── 4) 말 대조표 · 알림톡 목록 ─────────
WORDS = [
    # 검색 · 엑셀 · 지우기
    ('placeholder="표에서 찾기"', 'placeholder="검색"'),
    ('>이 목록 엑셀로</button>', '>엑셀 다운로드</button>'), ('>엑셀로 받기</button>', '>엑셀 다운로드</button>'),
    ('>이 기간 엑셀로 받기</button>', '>이 기간 엑셀 다운로드</button>'), ('>엑셀로 받기 (요약)</button>', '>엑셀 다운로드 (요약)</button>'),
    ('>기록 전체를 엑셀로</button>', '>기록 전체 엑셀 다운로드</button>'), ('id="insXls">전체 엑셀로</button>', 'id="insXls">전체 엑셀 다운로드</button>'),
    ('명세까지 포함해 내려받기', '명세까지 포함해 다운로드'), ('내려받을 것이 없습니다', '다운로드할 자료가 없어요'),
    ('>선택항목 삭제</button>', '>선택한 줄 지우기</button>'), ('>선택항목 지우기</button>', '>선택한 줄 지우기</button>'),
    ('>선택항목 수금 처리</button>', '>선택한 줄 입금 처리</button>'), ('>선택항목 다시 보내기</button>', '>선택한 줄 다시 보내기</button>'),
    ('>선택항목 취소 표시</button>', '>선택한 줄 취소 표시</button>'), ('>선택항목 되살리기</button>', '>선택한 줄 되살리기</button>'),
    ("'선택항목 <b>'", "'선택한 곳 <b>'"), ('>이 기록 삭제</button>', '>이 기록 지우기</button>'),
    ('font-size:13px">삭제</button>', 'font-size:13px">지우기</button>'), ('ask({ title:"이 메모를 지울까요?", yes:"삭제" }', 'ask({ title:"이 메모를 지울까요?", yes:"지우기" }'),
    ('>발급할 수 있는 곳 모두 고르기</button>', '>발급할 수 있는 곳 전체 선택</button>'),
    # 입금 · 입금 대기 · 확인 필요
    ('<p>성능점검 정산 · 청구 · 수금</p>', '<p>성능점검 정산 · 청구 · 입금</p>'),
    ("card('이번 달 수금 <span", "card('이번 달 입금 <span"), ('font-weight:600">수금</span></div>', 'font-weight:600">입금</span></div>'),
    ('<b>수금 확인</b>', '<b>입금 확인</b>'),
    ('확실한 건은 바로 수금 처리하고, 애매한 건만 확인 대기로 남겨요', '확실한 건은 바로 입금 처리하고, 애매한 건만 확인 필요로 남겨요'),
    ('["수금 완료","없음"]', '["입금 완료","없음"]'), ('["확인 대기 생김"', '["확인 필요 생김"'),
    ('["미수 금액",', '["입금 대기",'), ('"많이 밀린 곳 · 검사비 미수","검사비 미수 많은 순서', '"많이 밀린 곳 · 검사비 입금 대기","검사비 입금 대기가 많은 순서'),
    ('{k:"left",t:"미수",', '{k:"left",t:"입금 대기",'), ('<option>미수만</option>', '<option>입금 대기만</option>'),
    ('"확인 대기 입금"', '"확인 필요 입금"'), ('["확인 대기",won(wait)+"건"]', '["확인 필요",won(wait)+"건"]'),
    ('<option>확인 대기만</option>', '<option>확인 필요만</option>'), ('입금 · 처리 대기 알림 소리를', '입금 · 확인 필요 알림 소리를'),
    ('["들어온 금액",won(totPaid)+"원"]', '["입금",won(totPaid)+"원"]'),
    # 띄어쓰기 · 화살표 · 어려운 말
    ("'\">지난 달</button>'", "'\">지난달</button>'"), ('지난 달을 한꺼번에', '지난달을 한꺼번에'), ('>다음달 ›</button>', '>다음 달 ›</button>'),
    ('설정 ▸ → ', '설정 → '), ('로그아웃 할까요?', '로그아웃할까요?'), ('올려두면', '올려 두면'), ('켜두세요', '켜 두세요'),
    ('넣어주세요', '넣어 주세요'), ('넘겨주는', '넘겨 주는'), ('올려주세요', '올려 주세요'),
    ('<b>지금은 연동테스트예요</b>', '<b>지금은 시험 모드예요</b>'), ('지금은 <b>연동테스트</b>예요', '지금은 <b>시험 모드</b>예요'),
    ('(test?"연동테스트":"실제 팝빌")', '(test?"시험 모드":"실제 팝빌")'), ('지금은 <b>연동테스트</b>로 해 두었어요', '지금은 <b>시험 모드</b>로 해 두었어요'),
    (' 연동테스트 (test.popbill.com)', ' 시험 모드 (국세청으로 안 가요)'),
    ('<span style="color:var(--muted);font-weight:600">(Claude)</span>', '<span style="color:var(--muted);font-weight:600">(자동으로 읽음)</span>'),
    ('<b>서버에 팝빌 링크아이디가 없습니다.</b> 수파베이스 비밀값을 확인해 주세요.', '<b>팝빌 연결 준비가 아직 안 됐어요.</b> 차곳간에 알려 주세요.'),
    ('팝빌이 연동사의 «신규가입 API» 를 기본으로 막아 둡니다. 그럴 때는 팝빌 홈페이지에서 ', '팝빌에서 바로 가입이 막혀 있을 수 있어요. 그럴 때는 팝빌 홈페이지에서 '),
    ('"팝빌이 «연동회원 신규가입 API»를 막아 두었습니다. "+\n      "이건 우리 쪽 문제가 아니라 팝빌 권한입니다 — 아래 «팝빌에서 직접 가입하기» 를 쓰시거나, "+\n      "팝빌에 그 기능을 열어 달라고 신청하시면 됩니다."',
     '"팝빌에서 바로 가입이 막혀 있습니다. 아래 «팝빌에서 직접 가입하기»로 가입해 주세요."'),
    # 알림톡 먼저 (규칙 6)
    ('<div class="phone-top">문자 메시지</div>', '<div class="phone-top">카카오 알림톡</div>'),
    ('<div class="phone-from">설정에 적은 보내는 번호에서</div>', '<div class="phone-from">차곳간 카카오 채널에서</div>'),
    ('간단히 보낼 때 문구 (단문 · 요금 쌈)', '짧은 문구 (안 되면 문자로 갈 때)'), ('>간단히 (단문)</option>', '>짧은 문구</option>'),
    ('승인되면 청구서 보내기에서 «알림톡» 을 고를 수 있어요.', '승인되면 청구서가 알림톡으로 나가요(안 되면 문자로 자동).'),
    ('"딜러에게 문자(알림톡)가 다시 나가요."', '"딜러에게 알림톡이 다시 나가요. (안 되면 문자로 자동)"'),
    ('청구서 공급자 · 문자 보내는 이름에 모두 쓰여요', '청구서 공급자 · 알림 보내는 이름에 모두 쓰여요'),
    ('ofld("sms_from","문자 보내는 번호")', 'ofld("sms_from","문자로 대신 갈 때 보내는 번호")'),
    ('["문자 보내기 실패","경고음 · 90%"]', '["알림을 보내지 못했을 때","경고음 · 90%"]'),
    ('같은 순간 대표님 휴대폰으로 알림 문자가 나가요.', '그때 대표님 휴대폰으로 알림톡(안 되면 문자)이 가요.'),
    ('cell("남은 문자",', 'cell("남은 알림",'), ('data-mp="cash">문자 충전</button>', 'data-mp="cash">알림 충전</button>'),
    ('go:"문자 충전하기"', 'go:"알림 충전하기"'), ("'<button class=\"pl-go bad\">문자 충전하기</button>'", "'<button class=\"pl-go bad\">알림 충전하기</button>'"),
    ('["문자 소진","bad"]', '["알림 다 씀","bad"]'), ('["문자 멈춤","bad"]', '["알림 멈춤","bad"]'),
    ('한 통 <b>약 110원(MMS)</b>, 끄면 <b>약 45원(LMS)</b>', '한 통 <b>약 110원(사진 문자)</b>, 끄면 <b>약 45원(긴 문자)</b>'),
    ('<span>종류 <b>LMS</b></span>', '<span>종류 <b>긴 문자</b></span>'),
    ('"아직 (솔라피 열쇠 없음)"', '"아직 (차곳간 준비 중)"'), ('"아직 (앤트로픽 열쇠 없음)"', '"아직 (차곳간 준비 중)"'),
    ('구글 Apps Script를 웹앱으로 배포하면 나오는 주소와 비밀번호를 넣어 주세요.', '차곳간이 알려 드린 수집함 주소와 비밀번호를 넣어 주세요.'),
    ('항목별 알림 — 차량 배달 알림 (모듈 2)', '항목별 알림 — 차량 배달 알림'), ('이 팝업으로 열려요', '이 작은 창으로 열려요'),
    ('"통합 입구로 다시 로그인해 주세요."', '"다시 로그인해 주세요."'),
    ('"체험 무료 건수를 모두 썼어요 · 충전하시면 바로 다시 나가요"', '"체험 기본 건수를 모두 썼어요 · 충전하면 바로 다시 나가요"'),
    ('"무료 문자를 다 썼어요. 충전하면 다시 보낼 수 있어요."', '"무료 알림을 다 썼어요."'),
    ('"자료 올리기와 청구서 만들기는 그대로 돼요 · 충전하시면 바로 다시 나가요"', '"청구서 만들기와 기록 보기는 그대로 돼요 · 충전하면 바로 다시 나가요"'),
    # 대조표 1 · 3장 남은 것
    ('<div class="loading">불러오는 중…</div>', '<div class="loading">불러오는 중이에요…</div>'),
    ('내역을 불러오는 중…', '내역을 불러오는 중이에요…'), ('사진을 불러오는 중…', '사진을 불러오는 중이에요…'),
    ('<div class="hint">불러오는 중…</div>', '<div class="hint">불러오는 중이에요…</div>'), ('팝빌에서 계좌를 불러오는 중…', '팝빌에서 계좌를 불러오는 중이에요…'),
    ("% 들어옴</small>", "% 입금</small>"), ('{k:"paid",t:"들어옴",', '{k:"paid",t:"입금",'), ('["이번 달 들어옴",', '["이번 달 입금",'),
    ('["입금 들어옴","딩동 · 70%"]', '["입금","딩동 · 70%"]'),
    ('"오류가 발생했습니다. 잠시 후 다시 시도해 주세요."', '"처리하지 못했어요. 다시 시도해 주세요."'),
]
for a, b in WORDS:
    if a not in s: raise SystemExit("말 못 찾음: " + a[:80])
    s = s.replace(a, b)
# 「계산서」 → 「세금계산서」 (말 대조표 2장 — 폰 탭바 한 칸 · 서버 값 비교 · 자료 칸 이름 · 주석은 그대로)
_P0 = payblock(s)
_L = s.replace(CSS, "\0C").replace(JS, "\0J").replace(_P0, "\0P").split("\n")
TAXN = 0
for _i, _l in enumerate(_L):
    _st = _l.strip()
    if "\0" in _l or _st.startswith(("/*", "//", "*")) or 'label:"계산서"' in _l or 'indexOf("계산서 안 끊음")' in _l or "계산서발행여부" in _l: continue
    _n = re.sub(r"(?<!세금)(?<!수정세금)계산서", "세금계산서", _l)
    if _n != _l: TAXN += len(re.findall(r"(?<!세금)(?<!수정세금)계산서", _l)); _L[_i] = _n
s = "\n".join(_L).replace("\0C", CSS).replace("\0J", JS).replace("\0P", _P0)
# 서버 개발 이야기 빼기
rep('''    "예전에는 구글 스크립트로 돌았지만, 지금은 <b>차곳간체크 서버 안에서 그대로 돌아가요</b> — 따로 연결할 주소가 없어요.");''',
    '''    "");''')
# 상태 칩 이름 — 진행 중 · 확인 필요 · 보류 · 완료 (규칙 4-5) + 대조표 «입금 대기»
rep('''function tag(t){   /* v35: 공통 상태 칩 네 가지 색 — 완납 · 맞춤 = 완료, 미납 · 확인 대기 = 보류(빨강 대신), 나머지 = 확인 필요 */
  var k = t==="완납"||t==="맞춤" ? "done" : t==="미납"||t==="확인 대기" ? "stop" : "chk";
  return '<span class="cgg-st '+k+'">'+esc(t)+'</span>';
}''', '''function tag(t){   /* v40: 상태 이름 — 서버 값은 그대로 두고 보이는 이름만 (규칙 4-5 · 말 대조표 2장) */
  var NM={"완납":"완료","맞춤":"완료","맞음":"완료","확인 대기":"확인 필요","미납":"입금 대기","일부":"일부 입금"};
  var lab=NM[t]||t;
  var k = lab==="완료" ? "done" : lab==="입금 대기" ? "stop" : lab==="일부 입금" ? "run" : "chk";
  return '<span class="cgg-st '+k+'">'+esc(lab)+'</span>';
}''')
# 기호 → 선 아이콘 · 글
rep('''<button class="hb" id="btnRefresh">↻ 새로고침</button>''', '''<button class="hb" id="btnRefresh">새로고침</button>''')
for idn in ["bReload", "txReload"]:
    rep('''<button class="btn" id="%s">↻ 새로고침</button>''' % idn, '''<button class="btn" id="%s">새로고침</button>''' % idn)
rep('''<button class="btn primary" id="dRe">↻ 새로고침</button>''', '''<button class="btn primary" id="dRe">새로고침</button>''')
rep("""'<b>⚠ 딜러를 못 찾은 차가 '""", """'<b>딜러를 못 찾은 차가 '""")
rep("""'<b>⚠ 차량번호로만 찾은 건이 '""", """'<b>차량번호로만 찾은 건이 '""")
rep(""">차량번호 ⚠</span>'""", """>차량번호</span>'""")
rep("""'<div class="ftop"><span class="ico">⚠️</span><div>'""", """'<div class="ftop"><span class="ico">'+CGG.ic("bell")+'</span><div>'""")
rep('''$("hdVer").title=_v||"UI 3.0";''', '''$("hdVer").title=_v||"";''')
rep('''+(_m?("서버 "+_m[0]+" · "):"")+"UI 3.0";''', '''+(_m?("서버 "+_m[0]):"");''')
rep('''esc(ver?("check-api "+ver[0]):"확인 중")''', '''esc(ver?ver[0]:"확인 중")''')
# 청구서 위 가짜 요금 띠(고정 숫자) 빼기 — 진짜 요금 띠는 머리말 아래 #planStrip
a = s.index("function planBar(){"); b = s.index("\n}\n", a)
s = s[:a] + '''function planBar(){ return ""; }   /* v40: 고정 숫자(46일 · 문자 299건)가 보이던 시안 띠 — 진짜 요금 띠는 머리말 아래 */''' + s[b + 2:]

# ───────── 5) 해요체 — 화면 오류 글까지 (로그인 · 가입 · 결제 · 알림톡 원문은 그대로) ─────────
PAY0 = payblock(s)
_t = s.replace(CSS, "\0C").replace(JS, "\0J").replace(PAY0, "\0P")
_t, HEYO, _left = 해요체.make(_t, ("function drawLogin", "function go", "function signOut", "function niceMsg", "function whyBad",
                                  "function readJson", "function pbKo"), errors=True)
s = _t.replace("\0C", CSS).replace("\0J", JS).replace("\0P", PAY0)
for a, b in [("문제가 생겼습니다", "처리하지 못했어요"), ("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "처리하지 못했어요. 다시 시도해 주세요.")]:
    s = s.replace(a, b)

# ───────── 6) 눌러도 아무 일 없는 버튼 ─────────
# 6-a) 표 위 «엑셀 다운로드» 는 지금 보이는 줄(찾기 · 탭 거른 것)을 진짜로 내려받음
rep('''  var bulk=(opt.tools||"")''', '''  TBX[id]={cols:cols, rows:all, cell:cellHtml};   /* v40: 엑셀 다운로드용 */
  var bulk=(opt.tools||"").replace(/<button class="btn">(엑셀 다운로드|기록 전체 엑셀 다운로드)<\\/button>/g, '<button class="btn" data-xls="1">$1</button>')''')
rep('''var TB_WID={''', '''var TBX={};
function tbXls(id){
  var T=TBX[id]; if(!T) return;
  if(typeof XLSX==="undefined"){ bar("엑셀 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침(F5)해 주세요.","err"); return; }
  if(!T.rows.length){ bar("다운로드할 자료가 없어요."); return; }
  var head=T.cols.map(function(c){ return c.t||""; });
  var body=T.rows.map(function(r){ return T.cols.map(function(c){ return tbPlain(T.cell(c,r)); }); });
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head].concat(body)), "목록");
  XLSX.writeFile(wb, "차곳간체크_"+tbName(id)+"_"+(ST.ym||"")+".xlsx");
}
/* 파일 이름 — 표가 든 카드 제목 → 화면 제목 → «목록» */
function tbName(id){
  try{ var bx=$(id+"-blk"), c=bx&&bx.closest(".card"), h=c&&c.querySelector("h3");
    var t=(h&&h.firstChild&&h.firstChild.textContent)||((document.querySelector("#main .cgg-head h1")||{}).textContent)||"목록";
    return String(t).replace(/[›»«]/g,"").trim().replace(/[\\/:*?"<>|·\\s]+/g,"_").replace(/^_+|_+$/g,"").slice(0,30)||"목록"; }catch(e){ return "목록"; }
}
var TB_WID={''')
rep('''  inBox("[data-tf]").forEach(function(b){   /* v35: 상태 탭 */''', '''  inBox("[data-xls]").forEach(function(b){ if(!b.onclick) b.onclick=function(){ tbXls(id); }; });   /* v40 */
  inBox("[data-tf]").forEach(function(b){   /* v35: 상태 탭 */''')
# 6-b) 화면을 그린 뒤, 연결된 동작이 없는 버튼 · 고르기 칸은 «준비 중» 으로 (눌러도 아무 일 없는 버튼 0개)
rep('''function draw(){
  var f=PAGE[page]||PAGE.home;
  $("main").innerHTML=f();
  if(AFTER[page]) AFTER[page]();''', '''function draw(){
  var f=PAGE[page]||PAGE.home;
  $("main").innerHTML=f();
  if(AFTER[page]) AFTER[page]();
  try{ soonPass(); }catch(e){}   /* v40 */''')
rep('''var AFTER={};
var PAGE={};''', '''var AFTER={};
var PAGE={};
/* v40: 연결된 동작이 없는 버튼 · 고르기 칸 → 「준비 중」 (오픈 베타 — 눌러도 아무 일 없는 버튼 0개)
   연결 여부: onclick / onchange 가 붙어 있거나, 문서 전체에서 받는 data-pvhist · data-lk* 이면 «연결됨» */
function soonPass(){
  var root=$("main"); if(!root) return;
  Array.prototype.forEach.call(root.querySelectorAll("button"), function(b){
    if(b.onclick || b.disabled && !b.hasAttribute("data-needsel") || b.hasAttribute("data-soon")) return;
    if(b.closest(".cgg-pager,.cgg-tabsH,.cgg-twrap thead,.ymp,.cgg-dlg") || b.matches("[data-pvhist],[data-lkpay],[data-lksay],[data-lkwhy],[data-pg],[data-tf],[data-sk]")) return;
    if(b.hasAttribute("data-needsel") && b.onclick) return;
    b.disabled=true; b.setAttribute("data-soon","1"); b.removeAttribute("data-needsel"); b.title="준비 중이에요";
  });
  Array.prototype.forEach.call(root.querySelectorAll(".cgg-filters select"), function(x){
    if(x.onchange || x.id) return;
    x.disabled=true; x.setAttribute("data-soon","1"); x.title="준비 중이에요";
  });
}''')
rep('''.cgg-filters button[data-n]::after{content:" (" attr(data-n) ")"}''', '''.cgg-filters button[data-n]::after{content:" (" attr(data-n) ")"}
/* v40: 준비 중 버튼 */
button[data-soon]{opacity:.55;cursor:not-allowed}
button[data-soon]::after{content:" · 준비 중";font-size:.86em;font-weight:600}
.tokchips button[data-soon]::after{content:none}
select[data-soon]{opacity:.55;cursor:not-allowed}''')
# 일괄 버튼 갱신(syncAll)이 «준비 중» 버튼을 다시 켜지 않게
rep('''    inBox("[data-needsel]").forEach(function(b){ b.disabled=!n;''', '''    inBox("[data-needsel]:not([data-soon])").forEach(function(b){ b.disabled=!n;''')

# ───────── 7) 결제 말 — 워시 최신판 결제 덩어리에서 바뀐 줄을 그대로 (결제/12) ─────────
import glob, 워시결제말_옮기기
def wblock(f):
    t = open(f, encoding="utf-8").read(); a = t.index("  function cwRpc(fn, args){"); b = t.index("\n})();", a); return t[a:b]
_wv = sorted(glob.glob("/home/user/chagotgan/워시/1_차곳간_워시_index_v1[2-9][0-9].html"), key=lambda f: int(re.search(r"_v(\d+)\.html", f).group(1)))
WASH_NEW = _wv[-1]
_pb = payblock(s)
_nb, PAY_DONE, PAY_MISS = 워시결제말_옮기기.port(wblock("/home/user/chagotgan/워시/1_차곳간_워시_index_v122.html"), wblock(WASH_NEW), _pb)
s = s.replace(_pb, _nb)
# 결제 내역 창(payHist, W5)은 워시 최신판 덩어리를 통째로 (영수증 링크 — 토스 주소만)
def histblock(t):
    a = t.index("  /* v122 · 결제 확인표 W5"); b = t.index("  window.ccwPayHist = payHist;", a); return t[a:b]
_wt = open(WASH_NEW, encoding="utf-8").read()
s = s.replace(histblock(s), histblock(_wt))
if "tosspayments\\.com" not in histblock(s): raise SystemExit("영수증 링크가 안 들어감")
# 체크만 다른 줄 (결제/12 체크 칸)
for a, b in [('"결제는 체크 로그인으로만 할 수 있습니다. 통합 입구로 다시 로그인해 주세요."', '"결제하려면 다시 로그인해 주세요."')]:
    s = s.replace(a, b)

rep('''  $("hdVer").textContent="체크 v39 · "''', '''  $("hdVer").textContent="체크 v40 · "''')

# ───────── 확인 ─────────
if s.count(CSS) != 1 or s.count(JS) != 1: raise SystemExit("공통 부품 글자가 바뀜")
own = s.replace(CSS, "").replace(JS, "").replace(payblock(s), "")
print("결제 말: 워시", WASH_NEW.split("_v")[-1], "에서", PAY_DONE, "곳 옮김 · 못 옮김", len(PAY_MISS), [m[1][:60] for m in PAY_MISS])
for bad in ["OPEN BETA", "↻", "UI 3.0", "Verify JWT", "(Claude)", "API»", "표에서 찾기", ">선택항목"]:
    if bad in own: raise SystemExit("아직 남음: " + bad + " … " + own[own.index(bad)-60:own.index(bad)+40])
open(OUT, "w", encoding="utf-8").write(s)
open("/home/user/chagotgan/체크/도구/해요체_v40_바꾼말.txt", "w", encoding="utf-8").write(
    "체크 v40 해요체로 바꾼 말 (v39 다음, 화면 오류 글 포함)\n" + "\n".join("%d\t%s\n  전: %s\n  후: %s" % x for x in HEYO))
print("OK", OUT, len(s), "· 세금계산서:", TAXN, "· 바꾼 말(대조표·목록):", len(WORDS), "· 해요체:", len(HEYO), "· 못 바꾼:", len(_left), _left[:3])
