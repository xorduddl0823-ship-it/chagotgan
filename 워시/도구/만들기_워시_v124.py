"""워시 v123 → 워시 v124 새 판. 오픈 베타 말 맞추기 + 보안 낮음 4가지 (총괄 요청 · 금 13:00)
쓰는 법: 만들기_워시_v112 → … → v123 → v124 차례로 (`워시/도구/`)
넣은 목록:
  · 디자인/말_대조표.md (기준) · 디자인/공통/오픈베타_띠.md (띠 하나로)
  · 알림톡/07_워딩_검토/워시_v122.md (꼭 100 · 좋음 28) + 00_대조표_우선.md (화면 «무료»는 그대로, «무료 캐시»만 «기본 제공 캐시»)
  · 결제/12_결제_말_대조표.md (꼭: 자동 결제 «바뀐 금액으로 결제» 고침 · 동의 글 · 카드 꺼짐 한 말)
  · 보안 낮음 ①~④ (로그아웃 지우기 4길 한 함수 · CSV 수식 막기 · 새 창 opener 끊기 · 공지 id esc)
  · 직원 주소 안내를 알림톡(staff_link)으로 먼저 — 접속주소는 서버가 직원용 주소로만 채움(sb14)
운영 v111 · v112~v123 는 덮어쓰지 않는다. 서버 주소 · 창구 · 저장 값 · 손님에게 나가는 알림 글(승인 문구)은 그대로. 약관 글 그대로.
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
sys.path.insert(0, HERE)
from 해요체_표 import T as HAEYO
SRC = os.path.join(BASE, "1_차곳간_워시_index_v123.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v124.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
assert 'version:"cgg-j4 1.5"' in JS
s = open(SRC, encoding="utf-8").read()
assert CSS in s and JS in s, "v123 의 공통 부품이 지금 1.5 와 다름"
WORDS = 0   # 고친 말 개수 (총괄 3줄 보고용)

def rep(old, new, count=1, word=True):
    global s, WORDS
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:100]))
    s = s.replace(old, new)
    if word: WORDS += n

# ═════ 0) 줄 번호 기준 말 바꾸기 (v123 원본 줄 · 저장 값은 건드리지 않음) ═════
L = s.split("\n")
def _lines_of(a, b): return (s.count("\n", 0, a), s.count("\n", 0, b) + 1)
_ca = s.index('<style id="cgg-j4">'); _cb = s.index('</style>', _ca)
_ja = s.index('/* 차곳간 공통 부품 cgg-j4 1.5 (디자인/공통/cgg-j4.js'); _jb = s.index('\n</script>', _ja)
COMMON = [_lines_of(_ca, _cb), _lines_of(_ja, _jb)]
def common(i): return any(x <= i < y for x, y in COMMON)
def line(no, must, fn):
    global WORDS
    i = no - 1
    if must not in L[i]:
        raise SystemExit("줄 %d 에 «%s» 없음: %s" % (no, must, L[i][:120]))
    new = fn(L[i])
    if new == L[i]:
        raise SystemExit("줄 %d 바뀐 것 없음" % no)
    L[i] = new; WORDS += 1
# 계산서 → 세금계산서 (값 «계산서 끊음 · 안 끊음 · 없음» 과 폰 탭바는 그대로)
TAXW = re.compile(r"(?<!세금)(?<!전자)계산서(?! 끊음| 안 끊| 없음)")
for no in [3241, 3978, 5572, 5579, 6867, 6870, 6882, 7501, 8498, 8959, 9033, 9470, 10303, 10595, 10596, 10603,
           10650, 10784, 10817, 10871, 10872, 11547, 12620, 12621, 12698, 12704, 12761, 14864, 14874, 14907,
           14911, 14927, 14930, 14936, 15153, 15868]:
    line(no, "계산서", lambda t: TAXW.sub("세금계산서", t))
# 수금 → 입금 (칩 «수금 완료» · «수금 대기» 와 값 «수금완료» 는 그대로 · 홈택스 양식 · 도움말 검색어 빼고)
SUG = re.compile(r"수금(?!\s?완료|\s?대기)")
for i, t in enumerate(L):
    if i + 1 in (8858, 12779, 13378) or common(i) or not SUG.search(t):
        continue
    L[i] = SUG.sub("입금", t); WORDS += 1
# 미수 → 받을 금액 (합계 숫자) / 입금 대기 (목록 · 상태)
for no in [1790, 6865, 9700, 9886, 11656, 13625, 13653, 13665, 13681, 13688, 13718]:
    line(no, "미수 금액", lambda t: t.replace("미수 금액", "받을 금액"))
line(6891, 'label:"미수"', lambda t: t.replace('label:"미수"', 'label:"받을 금액"'))
line(7142, '"미수"', lambda t: t.replace('"미수"', '"받을 금액"'))
line(10003, "남은 미수 ", lambda t: t.replace("남은 미수 ", "받을 금액 "))
line(10033, "남은 미수 ", lambda t: t.replace("남은 미수 ", "받을 금액 ").replace("[정산 장부]", "[입출고 내역]"))
line(12500, "금액·미수·", lambda t: t.replace("금액·미수·", "금액·받을 금액·"))
line(12516, "아직 못 받은 금액(미수)", lambda t: t.replace("아직 못 받은 금액(미수)", "받을 금액"))
# 삭제 → 지우기
for no in [7407, 7587, 8048, 8162, 8332, 8411]:
    line(no, "선택항목 삭제", lambda t: t.replace("선택항목 삭제", "선택한 줄 지우기"))
for no in [3662, 5726, 6066, 8378, 8483, 11702, 11921, 12041]:
    line(no, ">삭제</button>", lambda t: t.replace(">삭제</button>", ">지우기</button>"))
line(7651, 'textContent="삭제"', lambda t: t.replace('textContent="삭제"', 'textContent="지우기"'))
line(12486, "[선택항목 삭제]", lambda t: t.replace("[선택항목 삭제]", "[선택한 줄 지우기]"))
line(12682, "코드 변경·삭제도", lambda t: t.replace("코드 변경·삭제도", "코드 바꾸기·지우기도"))
line(13199, "선택항목 완전 삭제", lambda t: t.replace("선택항목 완전 삭제", "선택한 줄 완전히 지우기"))
# 찾기 → 검색 (머리말 «메뉴 찾기» · «비밀번호 찾기» · «즐겨찾기» 는 그대로)
PH = re.compile(r'((?:ph:|placeholder=)"[^"]*?)찾기')
for i, t in enumerate(L):
    if PH.search(t) and not common(i):
        L[i] = PH.sub(r"\1검색", t); WORDS += 1
line(1684, "상사 · 딜러 찾기", lambda t: t.replace("상사 · 딜러 찾기", "상사 · 딜러 검색"))
line(4839, "이 번호로 찾기", lambda t: t.replace("이 번호로 찾기", "이 번호로 검색"))
line(8410, "명부에서 새 딜러 찾기", lambda t: t.replace("명부에서 새 딜러 찾기", "명부에서 새 딜러 검색"))
s = "\n".join(L)
assert CSS in s and JS in s

rep('var APP_VER="워시 v123 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v124 · UI 3.0 · 2026-10-16";', word=False)

# ═════ 1) 오픈 베타 띠 — 디자인 방 조각 그대로 (v123 띠 2개는 뺌) ═════
OLD_BETA = ('<div class="cgg-beta" role="note"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. '
            '쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div>\n')
rep(OLD_BETA, "", 2, word=False)
BAND = ('<div class="cgg-beta" id="cggBeta" role="note"><div class="in"><b>오픈 베타</b><span>차곳간은 지금 오픈 베타예요. '
        '쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div></div>\n'
        '<script>try{ if(window.top!==window.self){ document.getElementById("cggBeta").hidden=true; } }catch(e){ document.getElementById("cggBeta").hidden=true; }\n'
        '(function(){var b=document.getElementById("cggBeta"),r=document.documentElement;function f(){var h=b.hidden?0:Math.max(0,b.getBoundingClientRect().bottom);r.style.setProperty("--beta-off",h+"px");}'
        'f();addEventListener("scroll",f,{passive:true});addEventListener("resize",f);addEventListener("load",f);})();</script>\n')
rep('<body>\n', '<body>\n' + BAND, word=False)
a = s.index('/* ── v123 오픈 베타 띠'); b = s.index('@media (max-width:600px){ .cgg-beta{font-size:12.5px;padding:7px 10px;border-radius:10px;margin-bottom:10px} }\n', a)
b = s.index('\n', b) + 1
s = s[:a] + s[b:]
BAND_CSS = """/* 오픈 베타 띠 (디자인 방 2026-10-15) */
:root{--beta-bg:#0d2440;--beta-ink:#e8f0fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--beta-bg:#1d3a5f}}
:root[data-theme="dark"]{--beta-bg:#1d3a5f}
.cgg-beta{background:var(--beta-bg);color:var(--beta-ink);font-size:13.5px;line-height:1.5;word-break:keep-all}
.cgg-beta .in{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;
  padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.cgg-beta b{background:var(--beta-ink);color:var(--beta-bg);border-radius:6px;padding:1px 8px;font-size:12px;font-weight:800;flex:none}
.cgg-beta[hidden]{display:none}
@media (max-width:600px){.cgg-beta{font-size:12.5px}.cgg-beta .in{display:block;padding-block:6px}.cgg-beta b{margin-right:6px}}
/* 워시: 세로 · 아이콘 메뉴는 머리말이 고정이라 띠가 보이는 동안만 그 높이만큼 내려요 (--beta-off · 스크롤하면 0) */
@media (min-width:1000px){
  .lay-side > .cgg-hdr,.lay-icon > .cgg-hdr{top:var(--beta-off,0px)}
  .lay-side .cgg-right,.lay-icon .cgg-right,.lay-icon .cgg-biz{top:var(--beta-off,0px)}
  .lay-side .cgg-sub,.lay-icon .cgg-sub{top:calc(64px + var(--beta-off,0px))}
}
"""
a = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b = s.index('</style>', a)
s = s[:b] + BAND_CSS + s[b:]

# ═════ 2) 오류 글 — 영어 · 코드 글자 안 보이게 (말 대조표 3장 · 5장) ═════
KMSG = r'''/* v124 — 화면에 보여도 되는 오류 글만 (우리말이고 개발 용어가 없을 때). 아니면 정한 말로 */
function kmsg(e,fb){
  var m=(typeof e==="string")?e:String((e&&(e.message||e.__err||e.error))||"");
  m=m.replace(/\s*\[[A-Za-z_]+\]\s*$/,"").trim();
  if(m&&/[가-힣]/.test(m)&&!/[A-Za-z]{4,}|https?:|\/exec|\.gs\b|\.json|JWT|열쇠|스크립트|배포|시트|\{|\}/.test(m))return m;
  return fb||"처리하지 못했어요. 다시 시도해 주세요.";
}
/* v124 — 새 창은 opener 를 끊고 열어요 (보안 낮음 ③) · 막히면 false */
function openSafe(u){var w=window.open("","_blank");if(!w)return false;try{w.opener=null;}catch(e){}w.location.href=u;return true;}
/* v124 — CSV 칸: 따옴표 처리 + = + - @ 로 시작하는 글은 앞에 ' (엑셀 수식 막기 · 보안 낮음 ②) */
function csvQ(v){var t=String(v==null?"":v);if(/^[=+\-@\t\r]/.test(t)&&!/^-?\d+(\.\d+)?$/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';}
/* v124 — 기호 대신 선 아이콘 (말 대조표 5장) */
function jSvg(d){return '<svg class="jic" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';}
function jStar(on){return '<svg class="jic" viewBox="0 0 24 24" aria-hidden="true" style="'+(on?'fill:currentColor':'')+'"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';}
function jCheck(){return jSvg('<path d="M5 12.5l4.5 4.5L19 7.5"/>');}
function jX(){return jSvg('<path d="M6 6l12 12M18 6L6 18"/>');}
function jRefresh(){return jSvg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>');}
/* 결제 · 캐시 · 공지 묶음(다른 <script>)에서도 쓰게 밖으로 */
try{window.kmsg=kmsg;window.jX=jX;window.jStar=jStar;window.jCheck=jCheck;window.jRefresh=jRefresh;window.csvQ=csvQ;window.openSafe=openSafe;}catch(e){}
function errMsg(e){'''
rep('function errMsg(e){', KMSG, word=False)
rep('''    revoked:"저장 권한이 끊겼어요. 화면을 새로 열어주세요",transform_error:"저장 준비 중 문제가 생겼어요"};
  var t=map[c]||(e&&e.message)||"알 수 없는 문제";
  return t+(c?(" ["+c+"]"):"");''',
    '''    revoked:"저장 권한이 끊겼어요. 화면을 새로 열어 주세요",transform_error:"저장 준비 중 문제가 생겼어요"};
  return map[c]||kmsg(e,"저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");''')
rep('invalid_argument:"저장 내용 형식이 잘못됐습니다"', 'invalid_argument:"저장 내용 형식이 잘못됐어요"')
rep('banner("화면에 문제가 생겼습니다: "+(ev&&ev.message?ev.message:"알 수 없음"));',
    'banner("화면에 문제가 생겼어요. 새로고침한 뒤 다시 시도해 주세요.");')
rep('var r=ev&&ev.reason;banner("처리 중 문제: "+errMsg(r));', 'banner("처리하지 못했어요. 다시 시도해 주세요.");')
rep('''  if(/invalid x-api-key|401/.test(m))return "AI 열쇠가 잘못되었습니다 (앱스스크립트 속성의 ANTHROPIC_KEY 확인)";
  if(/not_found|404|model/.test(m))return "AI 모델 이름이 맞지 않아요 (ANTHROPIC_MODEL 확인)";
  if(/credit|billing|402/.test(m))return "AI 잔액이 부족해요";
  if(/429|rate/.test(m))return "잠시 뒤에 다시 해주세요";
  return m||"원인 모름";''',
    '''  if(/429|rate/.test(m))return "번호 자동 읽기가 잠시 바빠요. 잠시 뒤 다시 시도해 주세요.";
  return "번호 자동 읽기를 지금 쓸 수 없어요. 번호를 직접 넣어 주세요.";''')
# «○○ 실패: »+errMsg → 무엇이 안 됐는지 + 할 일
NET = " 인터넷 연결을 확인하고 다시 시도해 주세요."
for what, msg in [("대표자 계정 저장 실패: ", "대표자 계정을 저장하지 못했어요."), ("입고 저장 실패: ", "입고를 저장하지 못했어요."),
                  ("출고 처리 실패: ", "출고를 처리하지 못했어요.")]:
    rep('banner("%s"+errMsg(e));' % what, 'banner("%s");' % (msg + NET))
rep('banner("저장 실패: "+errMsg(e));', 'banner("저장하지 못했어요.%s");' % NET, 2)
rep('banner("직원 삭제 실패: "+errMsg(e));', 'banner("직원을 지우지 못했어요.%s");' % NET, 2)
rep('banner("직원 추가 실패: "+errMsg(e));', 'banner("직원을 추가하지 못했어요.%s");' % NET)
rep('''<div class="plate-result warn">불러오지 못했습니다: '+esc(errMsg(e))+'</div>''',
    '''<div class="plate-result warn">불러오지 못했어요. 새로고침한 뒤 다시 시도해 주세요.</div>''')
rep('''<div class="empty">명부를 불러오지 못했습니다: '+esc(errMsg(e))+'</div>''',
    '''<div class="empty">명부를 불러오지 못했어요. 새로고침한 뒤 다시 시도해 주세요.</div>''')
rep('''$("osMsg").textContent="실패: "+errMsg(e);''', '''$("osMsg").textContent="보내지 못했어요. 다시 시도해 주세요.";''')
rep('''("실패: "+(o.err||""));})''', '''("보내지 못했어요: "+sendErrText(o.err));})''')
rep('''$("pbMsg").textContent="연결 실패: "+errMsg(e);''', '''$("pbMsg").textContent="팝빌에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.";''')
rep('''(s2.err?(' <small style="color:var(--danger)">'+esc(s2.err)+'</small>'):"")''',
    '''(s2.err?(' <small style="color:var(--danger)">'+esc(sendErrText(s2.err))+'</small>'):"")''')
rep('''.catch(function(e){toast((e&&e.message)||"실패",true);});''', '''.catch(function(e){toast(kmsg(e,"보내지 못했어요. 다시 시도해 주세요."),true);});''')
rep('''}catch(e){toast("엑셀을 읽지 못했습니다: "+(e.message||""),true);}''',
    '''}catch(e){toast("엑셀 파일을 읽지 못했어요. xlsx·xls·csv 파일인지 확인해 주세요.",true);}''')
rep('''return '<span class="tag out">실패</span> <small style="color:var(--danger)">'+esc(d.err||"")+'</small>';}},''',
    '''return '<span class="tag out">실패</span> <small style="color:var(--danger)">'+esc(kmsg(d.err,"발급하지 못했어요 — 사업자번호·이메일을 확인해 주세요"))+'</small>';}},''')
rep('''if(!r||!r.ok)throw {message:(r&&r.error)||"수정발행하지 못했습니다"};''',
    '''if(!r||!r.ok)throw {message:kmsg(r&&r.error,"수정발행을 하지 못했어요. 승인번호와 금액을 확인하고 다시 시도해 주세요.")};''')
rep('''.catch(function(e){ toast((e&&e.message)||"«입금 확인» 안내를 보내지 못했어요",true); });''',
    '''.catch(function(e){ toast(kmsg(e,"«입금 확인» 안내를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요."),true); });''')
rep('''toast((e&&e.message)||"보내지 못했어요",true); });''', '''toast(kmsg(e,"보내지 못했어요. 잠시 뒤 다시 시도해 주세요."),true); });''')
rep('''  if (/SignatureDoesNotMatch/i.test(t)) return "솔라피 열쇠가 맞지 않아요 — 설정 ▸ 알림에서 다시 확인해 주세요";''',
    '''  if (/SignatureDoesNotMatch/i.test(t)) return "알림 보내기 설정이 맞지 않아요 — 차곳간에 문의해 주세요";''')
rep('''  if (m) return m[1];
  return t.replace(/\\s*\\{[\\s\\S]*\\}\\s*/, "").trim() || "보내지 못했습니다";''',
    '''  if (m) return kmsg(m[1], "보내지 못했어요. 발송함에서 다시 보내 주세요.");
  return kmsg(t.replace(/\\s*\\{[\\s\\S]*\\}\\s*/, "").trim(), "보내지 못했어요. 발송함에서 다시 보내 주세요.");''')
rep('''    o.err=(e&&e.message)||"보내지 못했습니다 (이 화면에서는 바깥 연결이 막혀 있을 수 있습니다)";''',
    '''    o.err=kmsg(e,"보내지 못했어요. 발송함에서 다시 보내 주세요.");''')
rep('''      $("scMsg").textContent="서버 연결됨 · 솔라피 열쇠 "+(j.hasKey?"등록됨":"없음 — 스크립트 속성에 넣어주세요")+
        " · 발송기록 시트 "+(j.sheet?"연결됨":"없음");})''',
    '''      $("scMsg").textContent=j.hasKey?"알림 보내기 준비됨":"알림 보내기 설정이 아직 안 됐어요. 차곳간에 문의해 주세요.";})''')
rep('''$("scMsg").textContent="연결 실패: "+(e&&e.message?e.message:"알 수 없음");});''',
    '''$("scMsg").textContent="알림 보내기 설정을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.";});''')
rep('''.catch(function(e){toast((e&&e.message)||"보내지 못했습니다",true);renderSend();});''',
    '''.catch(function(e){toast(kmsg(e,"시험 알림을 보내지 못했어요. 다시 시도해 주세요."),true);renderSend();});''')
rep('''toast(j.status==="보냄"?"알림톡을 보냈습니다. 카톡을 확인해 보세요":("실패: "+j.err),j.status!=="보냄");''',
    '''toast(j.status==="보냄"?"알림톡을 보냈어요. 카톡을 확인해 보세요":("시험 알림을 보내지 못했어요: "+sendErrText(j.err)),j.status!=="보냄");''')
rep('''    else{o.status="실패";o.err=(res&&(res.error||res.message))||"알 수 없는 오류";}''',
    '''    else{o.status="실패";o.err=kmsg(res&&(res.error||res.message),"보내지 못했어요. 발송함에서 다시 보내 주세요.");}''')
rep('''err:r.ok?"":(r.error||"알 수 없는 오류"),''', '''err:r.ok?"":kmsg(r.error,"발급하지 못했어요 — 사업자번호·이메일을 확인해 주세요"),''')
# 설정 · 서버 연결 안내 (개발 용어 → 화면에는 한 줄)
CFGERR = "프로그램 설정을 불러오지 못했습니다. 차곳간에 문의해 주세요."
SRVERR = "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."
rep('''throw {message:where+" 의 url 이 앱스스크립트 /exec 주소가 아닙니다 (/dev 주소는 안 됩니다)"};''', 'throw {message:"%s"};' % CFGERR)
rep('''    if(!c)throw {message:key?("shops.json 에 '"+key+"' 업체가 없습니다 (있는 업체: "+keys.join(", ")+")")
                          :("주소 끝에 ?shop=업체 가 없어요 (있는 업체: "+keys.join(", ")+")")};''',
    '''    if(!c)throw {message:"%s"};''' % CFGERR)
rep('''function(){throw {message:"shops.json(또는 wash-config.json)을 찾지 못했습니다 — index.html 과 같은 폴더에 있어야 합니다"};});''',
    '''function(){throw {message:"%s"};});''' % CFGERR)
rep('''if(!r.ok)throw {message:f+" 없음"};''', '''if(!r.ok)throw {message:"%s"};''' % CFGERR)
rep('''function(){throw {message:"서버에 연결하지 못했습니다 (인터넷 연결 확인)"};})''', '''function(){throw {message:"%s"};})''' % SRVERR)
rep('''catch(e){throw {message:"서버 응답을 읽지 못했습니다 — 서버 기능(wash-api) 배포와 Verify JWT 끄기를 확인하세요"};}''',
    '''catch(e){throw {message:"%s"};}''' % SRVERR)
rep('''function(){throw {message:"서버에 연결하지 못했습니다 (인터넷 또는 앱스스크립트 배포 권한 '모든 사용자' 확인)"};})''',
    '''function(){throw {message:"%s"};})''' % SRVERR)
rep('''catch(e){throw {message:"서버 응답을 읽지 못했습니다 — 앱스스크립트 배포의 액세스 권한이 '모든 사용자'인지 확인하세요"};}''',
    '''catch(e){throw {message:"%s"};}''' % SRVERR)
rep('''return Promise.reject({message:"구글 앱스스크립트 주소 또는 나스 주소로 열어주세요"});''', '''return Promise.reject({message:"%s"});''' % CFGERR)
rep('''return rej({message:"구글 앱스스크립트 웹앱 주소(/exec)로 열어주세요"});''', '''return rej({message:"%s"});''' % CFGERR)
rep('''function(){throw new Error("서버에 연결하지 못했습니다 (인터넷 확인)");})''', '''function(){throw new Error("%s");})''' % SRVERR)
rep('''catch(e){throw new Error("서버 응답을 읽지 못했습니다");}''', '''catch(e){throw new Error("%s");}''' % SRVERR)
rep('''    banner("서버 파일(Code.gs)이 옛 버전이라 느립니다 — 새 Code.gs를 넣고 [배포 관리]에서 새 버전으로 배포해 주세요. (설정 → 백업 · 기기 → 속도 점검)");''',
    '''    /* v124: 대표님이 할 수 없는 서버 일이라 화면에는 띄우지 않아요 (서버 방 몫) */''')
rep('''function offline(why){
  S.cfg=S.cfg||defCfg();
  setDbState(false,why);
  banner("저장 안 됨: "+why);''',
    '''function offline(why){
  S.cfg=S.cfg||defCfg();
  why=kmsg(why,"%s");
  setDbState(false,why);
  banner("저장이 안 되고 있어요. 인터넷 연결을 확인하고 새로고침해 주세요.");''' % SRVERR)
rep('''.catch(function(e){offline((e&&e.message)||"서버에 연결하지 못했습니다");});''', '''.catch(function(e){offline(e);});''')
rep('''    setDbState(false,(e&&e.message)||"");''', '''    setDbState(false,kmsg(e,"저장하지 못했어요"));''')
rep('''$("photoHint").textContent="사진 자동 인식이 꺼져 있어요(AI 열쇠 미등록). 차량번호는 직접 넣어주세요.";''',
    '''$("photoHint").textContent="사진으로 번호 읽기가 꺼져 있어요. 차량번호를 직접 넣어 주세요.";''')
# 로그인 · 가입 · 비밀번호 — 표준형 정한 말 (서버의 쉬운 우리말은 그대로 보여 줌)
rep('''      }).catch(function(e){busy(false);msg(e.message,true);});
    }

    function go(){''', '''      }).catch(function(e){busy(false);msg(kmsg(e,"인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요."),true);});
    }

    function go(){''')
rep('''}).catch(function(e){busy(false,"로그인");msg(e.message,true);});''',
    '''}).catch(function(e){busy(false,"로그인");msg(kmsg(e,"로그인하지 못했습니다. 휴대폰 번호와 비밀번호를 확인해 주세요."),true);});''')
rep('''          st.step=3;draw();msg("인증이 완료되었어요.");
        }).catch(function(e){busy(false);msg(e.message,true);});''',
    '''          st.step=3;draw();msg("인증이 완료되었습니다.");
        }).catch(function(e){busy(false);msg(kmsg(e,"인증하지 못했습니다. 인증번호를 확인해 주세요."),true);});''')
rep('''}).catch(function(e){busy(false,"가입하고 시작하기");msg(e.message,true);});''',
    '''}).catch(function(e){busy(false,"가입하고 시작하기");msg(kmsg(e,"가입하지 못했습니다. 잠시 후 다시 시도해 주세요."),true);});''')
rep('''draw();msg("인증번호를 발송했습니다.");})
          .catch(function(e){busy(false);msg(e.message,true);});''',
    '''draw();msg("인증번호를 발송했습니다. 5분 안에 입력해 주세요.");})
          .catch(function(e){busy(false);msg(kmsg(e,"인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요."),true);});''')
rep('''ccwOpen("verifyCode",[st.phone,c]).then(function(){st.step=3;draw();})
          .catch(function(e){busy(false);msg(e.message,true);});''',
    '''ccwOpen("verifyCode",[st.phone,c]).then(function(){st.step=3;draw();})
          .catch(function(e){busy(false);msg(kmsg(e,"인증하지 못했습니다. 인증번호를 확인해 주세요."),true);});''')
rep('''msg("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
        }).catch(function(e){busy(false);msg(e.message,true);});''',
    '''msg("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
        }).catch(function(e){busy(false);msg(kmsg(e,"비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요."),true);});''')
rep('인증번호 재발송', '인증번호 다시 받기')
# 결제 · 충전 · 자동 결제 (결제/12 기준 문구 · 오류는 표준형)
CARD_OFF = "카드 결제는 준비 중이에요. 지금은 계좌로 입금해 주세요."
rep('''esc2(note || "PG사와 계약 중이에요.\\n지금은 이용하실 수 없으니 양해 부탁드려요.")''', '''esc2("%s")''' % CARD_OFF)
rep('''esc2(q.note||"카드 결제는 준비 중이에요. 계좌로 입금해 주세요.")''', '''esc2("%s")''' % CARD_OFF)
rep('''esc2(d.pgNote || "카드 결제는 준비 중이에요. 지금은 계좌이체로 충전해 주세요.")''', '''esc2("%s")''' % CARD_OFF)
rep('''esc2((r&&r.note)||"카드 결제는 아직 준비 중이에요")''', '''esc2("%s")''' % CARD_OFF)
rep('''esc2(q.note || "카드 결제는 준비 중이에요.")+'<br>계좌로 입금해 주시면 차곳간에서 확인하고 처리해 드려요.</div>')''',
    '''esc2("%s")+'<br>입금하시면 차곳간에서 확인하고 처리해 드려요.</div>')''' % CARD_OFF)
rep('''준비가 끝나면 이 화면에서 바로 충전하실 수 있어요.''', '''준비가 끝나면 이 화면에서 바로 충전할 수 있어요.''')
rep('''esc2((e&&e.message)||"신청하지 못했습니다")''', '''esc2(kmsg(e,"신청하지 못했습니다. 잠시 후 다시 시도해 주세요."))''')
rep('''cwMsg('<span style="color:#C0392B">'+esc2((e&&e.message)||"결제하지 못했습니다")+'</span>');''',
    '''cwMsg('<span style="color:#C0392B">'+esc2(kmsg(e,"결제하지 못했습니다. 카드 정보를 확인하고 다시 시도해 주세요."))+'</span>');''')
rep('''        var why = q.get("message") || "결제가 취소되었습니다";
        setTimeout(function(){
          cashBox('<h3 style="margin:0 0 6px">결제가 되지 않았어요</h3>'+''',
    '''        var why = (q.get("code") === "PAY_PROCESS_CANCELED" || !q.get("code")) ? "결제를 취소했어요. 다시 하려면 [결제하기]를 눌러 주세요."
                : "결제하지 못했습니다. 카드 정보를 확인하고 다시 시도해 주세요.";
        setTimeout(function(){
          cashBox('<h3 style="margin:0 0 6px">결제가 되지 않았어요</h3>'+''')
rep('''<h3 style="margin:0 0 6px">결제가 끝났어요</h3>''', '''<h3 style="margin:0 0 6px">결제했어요</h3>''')
rep('''w(amt)+' 결제되었어요.'+''', '''w(amt)+' 결제했어요.'+''')
rep('''          cashBox('<h3 style="margin:0 0 6px">결제 확인을 못 했습니다</h3>'+
            '<div style="border:1px solid #F0B9B4;background:#FCEDEB;border-radius:12px;padding:14px 16px;'+
            'font-size:14px;line-height:1.8;color:#7A2018">'+
            esc2((e&&e.message)||"")+'<br><br>결제 금액이 빠져나갔는데 이 창이 나오면 차곳간으로 연락해 주세요. '+''',
    '''          cashBox('<h3 style="margin:0 0 6px">결제를 확인하지 못했습니다</h3>'+
            '<div style="border:1px solid #F0B9B4;background:#FCEDEB;border-radius:12px;padding:14px 16px;'+
            'font-size:14px;line-height:1.8;color:#7A2018">'+
            '결제를 확인하지 못했습니다. 잠시 뒤 결제 내역에서 확인해 주세요.<br><br>카드 금액이 빠져나갔는데 이 창이 보이면 차곳간으로 연락해 주세요. '+''')
rep('''<div class="sub">잠시만 기다려 주세요…</div>''', '''<div class="sub">처리 중입니다…</div>''', 2)
rep('''\'font-size:13.5px;line-height:1.8;color:#7A2018"><b>결제가 되지 않았어요.</b> 다음 시도일 '+
           esc2(dk(r.nextTry) || "곧 다시 시도해요")+
           (r.lastFail ? ('<br><span style="font-size:12.5px">까닭: '+esc2(r.lastFail)+'</span>') : '')+''',
    '''\'font-size:13.5px;line-height:1.8;color:#7A2018"><b>자동 결제가 되지 않았어요.</b> '+
           (dk(r.nextTry) ? (esc2(dk(r.nextTry).replace(/^\\d+년 /,""))+'에 다시 시도해요.') : '곧 다시 시도해요.')+
           (r.lastFail ? ('<br><span style="font-size:12.5px">까닭: '+esc2(kmsg(r.lastFail,"카드사 사정"))+'</span>') : '')+''')
# 자동 결제 동의 글 — 결제/12 A 글 그대로 (꼭: «바뀐 금액으로 결제» 고침) · 동의 문구판 올림
rep('var BILL_AGREE_VER = "2026-10-15";', 'var BILL_AGREE_VER = "2026-10-16";', word=False)
rep("""        '· 결제는 토스페이먼츠가 바로 처리해요. 카드 번호는 차곳간에 저장되지 않아요.<br>'+
        '· 결제가 안 되면 다음 날, 3일 뒤, 5일 뒤에 다시 시도해요.<br>'+
        '· 끄는 법: 이용요금 창에서 [자동 결제 끄기]를 누르면 돼요. 끈 뒤에도 이번 이용기간 끝까지 쓸 수 있어요.<br>'+
        '· 요금제 금액이 바뀌면 바뀐 금액으로 결제돼요.</div>'+""",
    """        '<b>자동 결제 안내</b><br>'+
        '· 이용기간이 끝나는 날(30일마다) 등록한 카드로 '+w(q.full)+'(부가세 포함)이 결제돼요.<br>'+
        '· 결제는 토스페이먼츠가 처리해요. 카드 번호는 차곳간에 저장되지 않아요.<br>'+
        '· 결제가 안 되면 다음 날, 3일 뒤, 5일 뒤에 다시 시도해요.<br>'+
        '· 요금제 금액이 바뀌면 결제 전에 미리 알려 드리고 다시 동의를 받아요.<br>'+
        '· 끄는 법: 내 요금제 › [자동 결제 끄기]. 끈 뒤에도 이번 이용기간 끝까지 쓸 수 있어요.</div>'+""")
rep("""        '<button class="btn" data-cwclose style="flex:1">닫기</button>'+
        '<button class="btn primary" id="abGo" style="flex:2">카드 등록하기</button></div>');""",
    """        '<button class="btn" data-cwclose style="flex:1">취소</button>'+
        '<button class="btn primary" id="abGo" style="flex:2">카드 등록하기</button></div>');""")
rep('''say((e && e.message) || "카드 등록 창을 열지 못했어요", true);''', '''say(kmsg(e,"카드 등록 창을 열지 못했습니다. 잠시 후 다시 시도해 주세요."), true);''')
rep('''esc2((e&&e.message)||"끄지 못했어요")''', '''esc2(kmsg(e,"자동 결제를 끄지 못했습니다. 잠시 후 다시 시도해 주세요."))''')
rep('''esc2(q.get("message") || "카드 등록이 취소되었어요")''', '''esc2("카드 등록을 취소했어요.")''')
rep('''esc2((e&&e.message)||"")+'<br>자동 결제는 켜지지 않았어요.</div>'+''', '''esc2(kmsg(e,"카드를 등록하지 못했습니다. 카드 정보를 확인하고 다시 시도해 주세요."))+'<br>자동 결제는 켜지지 않았어요.</div>'+''')
rep('''esc2((e&&e.message)||"불러오지 못했어요")''', '''esc2(kmsg(e,"결제 내역을 불러오지 못했어요. 다시 시도해 주세요."))''')
rep('''esc2((e&&e.message)||"불러오지 못했습니다")''', '''esc2(kmsg(e,"불러오지 못했어요. 다시 시도해 주세요."))''')
rep('''offNotice("지금은 이용하실 수 없습니다.\\n" + ((e&&e.message)||""));''', '''offNotice("지금은 이용할 수 없어요.\\n" + kmsg(e,"잠시 뒤 다시 시도해 주세요."));''')
rep('''var m = (e && e.message) || "알려 드리지 못했습니다";''', '''var m = kmsg(e,"알려 드리지 못했어요. 다시 시도해 주세요.");''')
rep('''sub = p.shop+" · 월 "+won(p.price)+"원 (부가세 별도) · 결제일 기준 30일";''', '''sub = p.shop+" · "+won(p.price)+"원 / 월 (부가세 별도) · 결제일부터 30일";''')
rep('''"무료 문자를 다 사용하였습니다. 충전 후 사용하세요."''', '''"무료 문자를 다 썼어요. 충전하면 바로 다시 보낼 수 있어요."''', 2)
rep('<b>무료 캐시</b>: 요금제마다', '<b>기본 제공 캐시</b>: 요금제마다')
rep('무료 캐시 → 충전 캐시', '기본 제공 캐시 → 충전 캐시')
rep("«PG사와 계약 중이에요» 안내가 떠요. 그때는 계좌이체로 해주세요.", "«카드 결제는 준비 중이에요» 안내가 떠요. 그때는 계좌로 입금해 주세요.")
rep('if(!sid) return Promise.reject({message:"로그인이 필요합니다"});', 'if(!sid) return Promise.reject({message:"다시 로그인해 주세요."});')

# ═════ 3) 보안 낮음 ①~④ ═════
# ① 로그아웃 · 세션 끝 · ?logout=1 · 새 로그인 — 지우는 목록 한 곳
rep('''/* 로그아웃 — 화면 어디서든 부를 수 있어요 */
function ccwLogout(){
  var sid=supaLs("ccw_sid");
  try{
    ["ccw_sid","ccw_shop","ccw_key","ccw_user","ccw_me",
     "ccw_money","ccw_mnmatch","ccw_mnseen","ccw_mnpoll",
     "ccw_pay","ccw_bill","cgg_buy"].forEach(function(k){   /* v123: 결제 중 주문 · 자동 결제 동의 · 홈페이지 요금제도 */
       try{localStorage.removeItem(k);}catch(e){}
     });
  }catch(e){}''',
    '''/* v124 · 보안 낮음 ① — 이 기기에 남는 로그인 · 업체 자료를 한 곳에서 지워요
   (로그아웃 · 로그인 시간이 끝남 · 주소 ?logout=1 · 새로 로그인 — 4길 모두 이 함수)
   keepBuy: 새로 로그인할 때는 홈페이지에서 고른 요금제(cgg_buy)는 남겨요 (로그인 뒤 결제로 이어지게) */
var CCW_LOCAL=["ccw_sid","ccw_shop","ccw_key","ccw_user","ccw_me",
  "ccw_money","ccw_mnmatch","ccw_mnseen","ccw_mnpoll","ccw_pay","ccw_bill","cgg_buy"];
function ccwClearLocal(keepBuy){
  CCW_LOCAL.forEach(function(k){ if(keepBuy&&k==="cgg_buy")return; try{localStorage.removeItem(k);}catch(e){} });
}
/* 로그아웃 — 화면 어디서든 부를 수 있어요 */
function ccwLogout(){
  var sid=supaLs("ccw_sid");
  ccwClearLocal(false);''')
rep('''function ccwSaveLogin(r,phone){
  try{ if(r && r.planInfo && window.ccwPlanSet) window.ccwPlanSet(r.planInfo); }catch(e){}''',
    '''function ccwSaveLogin(r,phone){
  ccwClearLocal(true);   /* v124: 앞 사람 자료가 남지 않게 먼저 지워요 */
  try{ if(r && r.planInfo && window.ccwPlanSet) window.ccwPlanSet(r.planInfo); }catch(e){}''')
rep('''      try{
        localStorage.removeItem("ccw_sid");localStorage.removeItem("ccw_shop");
        localStorage.removeItem("ccw_key");localStorage.removeItem("ccw_user");
        localStorage.removeItem("ccw_me");
      }catch(e){}
      try{history.replaceState(null,"",location.pathname);}catch(e){}''',
    '''      ccwClearLocal(false);
      try{history.replaceState(null,"",location.pathname);}catch(e){}''')
rep('''      },function(){
        try{localStorage.removeItem("ccw_sid");}catch(e){}
        ccwAuthUI().then(res);''',
    '''      },function(){
        ccwClearLocal(true);   /* v124: 로그인 시간이 끝났으면 업체 자료도 같이 */
        ccwAuthUI().then(res);''')
# ② CSV 수식 막기 — 6곳 + 청구명세 소계 줄
rep('''.map(function(v){return '"'+String(v==null?"":v).replace(/"/g,'""')+'"';})''', '''.map(csvQ)''', 6, word=False)
rep('''    lines.push(['"'+b.name+' 소계"','""','""','""','""','""','"'+b.cars+'대"','"'+b.amount+'"','""'].join(","));''',
    '''    lines.push([b.name+" 소계","","","","","",b.cars+"대",b.amount,""].map(csvQ).join(","));''', word=False)
# ③ 새 창 — opener 끊기
rep('''      var w=window.open(j.url,"_blank");
      if(!w) toast("새 창이 막혀 있습니다. 주소를 복사해 열어 주세요",true);''',
    '''      if(!openSafe(j.url)) toast("새 창이 막혀 있어요. 주소를 복사해 열어 주세요",true);''', word=False)
rep('''    var o=window.open(j.url,"_blank");
    if(!o) toast("새 창이 막혀 있습니다. 주소를 복사해 열어 주세요",true);''',
    '''    if(!openSafe(j.url)) toast("새 창이 막혀 있어요. 주소를 복사해 열어 주세요",true);''', word=False)
rep('''      var o=window.open(j.url,"_blank");
      if(!o) toast("새 창이 막혀 있습니다. 주소를 복사해 열어 주세요",true);''',
    '''      if(!openSafe(j.url)) toast("새 창이 막혀 있어요. 주소를 복사해 열어 주세요",true);''', word=False)
rep('''      var w=window.open(j.url,"_blank");
      if(!w) toast("새 창이 막혀 있습니다. 창 허용 후 다시 눌러주세요",true);''',
    '''      if(!openSafe(j.url)) toast("새 창이 막혀 있어요. 새 창 열기를 허용한 뒤 다시 시도해 주세요",true);''', word=False)
# ④ 공지 id
rep('''return '<div class="ntItem'+(n.pin?" pin":"")+'" data-no="'+n.id+'">'+''',
    '''return '<div class="ntItem'+(n.pin?" pin":"")+'" data-no="'+e4(n.id)+'">'+''', word=False)

# ═════ 4) 직원 주소 안내 — 알림톡(staff_link) 먼저, 안 되면 문자 (서버가 접속주소를 직원용 주소로 채움) ═════
rep('''    queueSend({type:"주소 안내",to:to,text:text,kind:"AUTO"})''',
    '''    var who=(S.staff||[]).filter(function(p){return p.phone&&digits(p.phone)===digits(to);})[0];
    queueSend({type:"주소 안내",to:to,text:text,kind:"AUTO",
      hq:{key:"staff_link",soft:true,vars:hqVars({"직원명":(who&&who.name)||"직원","업체명":shopLabel()})}})''', word=False)
rep('''if(!confirmed(to+" 로 주소 안내 문자를 보내요.\\n(문자 한 통 요금이 들어요)",btn,"보내기"))return;''',
    '''if(!confirmed(to+" 로 주소 안내를 알림톡으로 보내요. (안 받으면 문자로 가요)\\n(한 통 요금이 들어요)",btn,"보내기"))return;''')
rep('''        $("lkSendMsg").textContent=(o.status==="보냄")?(to+" 로 보냈습니다"):("실패: "+(o.err||""));
        toast(o.status==="보냄"?"보냈어요":"보내지 못했습니다",o.status!=="보냄");
      })
      .catch(function(e){$("lkSendMsg").style.color="var(--danger)";
        $("lkSendMsg").textContent="실패: "+errMsg(e);toast(errMsg(e),true);});''',
    '''        $("lkSendMsg").textContent=(o.status==="보냄")?(to+" 로 "+sentHow(o)):("보내지 못했어요: "+sendErrText(o.err));
        toast(o.status==="보냄"?sentHow(o):"보내지 못했어요. 다시 시도해 주세요.",o.status!=="보냄");
      })
      .catch(function(e){$("lkSendMsg").style.color="var(--danger)";
        $("lkSendMsg").textContent="보내지 못했어요. 다시 시도해 주세요.";toast("보내지 못했어요. 다시 시도해 주세요.",true);});''')
rep('''       '<button class="btn primary" id="lkSend">문자 보내기</button></div>'+''', '''       '<button class="btn primary" id="lkSend">알림 보내기</button></div>'+''')
rep('''<div class="f" style="margin-bottom:6px">직원 폰으로 주소 문자 보내기</div>''', '''<div class="f" style="margin-bottom:6px">직원 폰으로 주소 안내 보내기</div>''')
rep('''문자 연동(발신번호)이 되어 있으면 이 프로그램이 바로 보내요. 안 되어 있으면 폰 문자 앱이 열려요.''',
    '''알림톡으로 먼저 보내고, 안 받으면 문자로 가요. 알림 보내기가 준비 안 됐으면 폰 문자 앱이 열려요.''')
rep('''    field+"\\n\\n이름과 4자리 코드로 들어가시면 돼요.";''', '''    field+"\\n\\n본인 휴대폰 번호와 비밀번호로 로그인하면 돼요.";''')
# staff_link 템플릿이 아직 없으면(심사 뒤) 이 한 건만 문자로 — 다른 본사 알림톡은 끄지 않음
rep('''        HQATA.off=true; return asSms();''', '''        if(!(o.hq&&o.hq.soft))HQATA.off=true; return asSms();''', word=False)
# 서버가 실제 방식(ata/sms)을 돌려줄 때만 «알림톡 · 문자» 를 말해요. 값이 없으면 «보냈어요»
rep('''/* 보내기 실패 이유를 쉬운 말로 — 영어 코드는 감춥니다 */''',
    '''/* v124 — 보낸 방식 말하기: 서버가 res.via(ata/sms)를 주면 그대로, 없으면 «보냈어요» */
function sentHow(o){var v=o&&o.via;return v==="ata"?"알림톡을 보냈어요":(v==="sms"?"문자로 보냈어요":"보냈어요");}
/* 보내기 실패 이유를 쉬운 말로 — 영어 코드는 감춥니다 */''', word=False)
rep('''    if(res&&res.ok){if(GS.demo)o.demo=true;o.status=o.scheduledDate?"예약":"보냄";''',
    '''    if(res&&res.ok){if(GS.demo)o.demo=true;o.status=o.scheduledDate?"예약":"보냄";
      o.via=(res.via==="ata"||res.via==="sms")?res.via:(res.kind==="ATA"?"ata":(/^(SMS|LMS|MMS)$/.test(String(res.kind||""))?"sms":""));''', word=False)

# ═════ 5) 말 목록 ═════
MISS = []
def W(old, new, count=None):
    """말 바꾸기 — count 를 주면 그 수와 같아야, 안 주면 1곳 이상"""
    global s, WORDS
    n = s.count(old)
    if n == 0 or (count is not None and n != count):
        MISS.append((n, old[:90])); return
    s = s.replace(old, new); WORDS += n
# — 알림톡 목록 D: 알림톡이 먼저 나가는데 «문자»로만 적은 곳
W('출고 처리 + 문자 보내기', '출고 처리 + 알림 보내기')
W('출고 처리하고 딜러에게 문자를 보낼까요? 이 순간부터 입금 대상이 돼요.', '출고 처리하고 딜러에게 알림톡을 보낼까요? (안 받으면 문자로 가요) 이 순간부터 입금 대상이 돼요.')
W("'· 출고 문자는 이미 나갔어요. 문자는 되돌릴 수 없어요.</div>'", "'· 출고 알림은 이미 나갔어요. 보낸 알림은 되돌릴 수 없어요.</div>'")
W('딜러에게 문자를 자동으로 보냈어요', '딜러에게 알림을 보냈어요')
W("님에게 갈 문자</div>", "님에게 갈 안내</div>")
W('딜러 연락처가 없어 문자를 못 보냅니다. 거래처에 번호를 넣어주세요.', '딜러 연락처가 없어서 알림을 못 보내요. 거래처에 번호를 넣어 주세요.')
W('id="odAgain">문자 다시 보내기', 'id="odAgain">알림 다시 보내기')
W('id="olAgain">문자 다시 보내기', 'id="olAgain">알림 다시 보내기')
W("에게 <b>문자 보냄</b>')", "에게 <b>알림 보냄</b>')")
W("') 에게 문자 보냄')", "') 에게 알림 보냄')")
W('문자 보내기 실패', '알림 보내기 실패')
W("'문자 보내는 중…'", "'알림 보내는 중…'")
W('replace("문자 보내는 중…",', 'replace("알림 보내는 중…",')
W('"문자 대기 중"', '"알림 대기 중"')
W("<div class=\"sum\"><span>문자 보냄</span>", "<div class=\"sum\"><span>알림 보냄</span>")
W('건에 출고 문자를 다시 보내요.', '건에 출고 알림을 다시 보내요.')
W("<h3>청구 문자 예약</h3>", "<h3>청구 알림 예약</h3>")
W('예약한 문자는 솔라피가 그 시각에 보내요.', '예약한 알림은 그 시각에 나가요.')
W("설정 → 문자 연동 · 발송함에서 할 수 있어요.", "설정 → 발송함에서 할 수 있어요.")
W(">보낼 문자</div>", ">보낼 안내</div>")
W('건에 청구 문자를 보내요.', '건에 청구 알림을 보내요. (알림톡이 안 되면 문자로 가요)')
W('한 달치 입출고를 뽑아 청구서를 만들고, 그대로 문자로 보내요.', '한 달치 입출고를 뽑아 청구서를 만들고, 알림톡으로 보내요(안 되면 문자).')
W('<b>출고할 때 자동으로 나가는 문자</b>에 그대로 쓰여요.', '<b>출고할 때 자동으로 나가는 알림</b>에 그대로 쓰여요.')
W('보낸 문자와 실패한 문자가 모두 남습니다. 실패한 건 다시 보낼 수 있습니다.', '보낸 알림과 못 보낸 알림이 모두 남아요. 못 보낸 건 다시 보낼 수 있어요.')
W('empty:"보낸 문자가 없어요."', 'empty:"보낸 알림이 없어요."')
W('"같은 순간 대표님 휴대폰으로 알림 문자가 나갑니다."', '"같은 때 대표님 휴대폰으로 알림톡이 가요."', 2)
W('사라지기 30일 전과 7일 전에 문자로 알려 드려요.', '사라지기 30일 전과 7일 전에 알림톡으로 알려 드려요 (안 받으면 문자로 가요).')
W('대표님 휴대폰으로 안내 문자가 가요.', '대표님 휴대폰으로 알림톡이 가요 (안 받으면 문자로 가요).')
W('그 전에 안내 문자도 가요.', '그 전에 알림톡으로도 알려 드려요.')
W('체험이 끝나기 전에 차곳간에서 안내 문자를 보내 드려요.', '체험이 끝나기 전에 차곳간에서 알림톡으로 알려 드려요 (안 받으면 문자로 가요).')
W('[출고 처리 + 알림 보내기]를 누르면 딜러에게 출고 문자가 <b>자동으로</b> 나가요. 사진이 있으면 사진 문자로 나가요.',
  '[출고 처리 + 알림 보내기]를 누르면 딜러에게 출고 알림이 <b>자동으로</b> 나가요 (알림톡이 안 되면 문자로 가요).')
W('<b>문자는 되돌릴 수 없어요.</b> 출고 문자가 이미 나갔으면', '<b>보낸 알림은 되돌릴 수 없어요.</b> 출고 알림이 이미 나갔으면')
W('딜러에게 <b>문자가 나갔는지</b> 봐요.', '딜러에게 <b>알림이 나갔는지</b> 봐요.')
W('딜러에게 문자가 나갔는지,', '딜러에게 알림이 나갔는지,')
W('"<li><b>문자 보내기</b>: 아래', '"<li><b>알림 보내기</b>: 아래')
W('out:"사진 찍고 목적지 고르면 문자 자동"', 'out:"사진 찍고 목적지 고르면 알림 자동"')
W('outlog:"나간 차와 보낸 문자 기록"', 'outlog:"나간 차와 보낸 알림 기록"')
W('[오늘 나간 차]에서 오늘 출고한 차를 보고, 차를 눌러 [문자 다시 보내기]', '[오늘 출고한 차]에서 오늘 출고한 차를 보고, 차를 눌러 [알림 다시 보내기]')
W('<li>문자가 실패한 차는 체크 후 [선택항목 재발송].</li>', '<li>알림을 못 보낸 차는 체크 후 [선택항목 다시 보내기].</li>')
W('<h2>출고 문자 — 문구와 보내는 방식</h2>', '<h2>출고 알림 — 문구와 보내는 방식</h2>')
W('아래에서 출고 문자 문구와 보내는 방식을 고쳐요.', '아래에서 출고 알림 문구와 보내는 방식을 고쳐요.')
W('"출고 문자를 내 휴대폰으로 받아 봐요."', '"출고 알림을 내 휴대폰으로 받아 봐요."')
W('"실패한 문자 다시 보내기","못 나간 문자를 다시 보내요."', '"못 보낸 알림 다시 보내기","못 나간 알림을 다시 보내요."')
W('toast("출고 문자 설정을 저장했어요")', 'toast("출고 알림 설정을 저장했어요")')
W('[failed.length,"알림 보내기 실패","발송함에서 다시 보낼 수 있습니다"', '[failed.length,"알림 보내기 실패","발송함에서 다시 보낼 수 있어요"')
# — 재발송 → 다시 보내기
W('선택항목 재발송', '선택항목 다시 보내기')
# — E: 메뉴 · 버튼 이름 맞추기
W('설정 → 문자 연동에서 발신번호를 넣어주세요', '설정 → 알림에서 발신번호를 넣어 주세요')
W('예약 발송은 문자 연동(발신번호)이 돼 있어야 합니다', '예약 발송은 설정 → 알림에서 발신번호를 넣어야 쓸 수 있어요')
W('예약 발송은 설정 → 문자 연동에서 발신번호를 넣어야 쓸 수 있습니다', '예약 발송은 설정 → 알림에서 발신번호를 넣어야 쓸 수 있어요')
W('<b>설정 → 문자 연동·발송함</b>에서 채널ID·템플릿ID를 넣고', '<b>설정 → 알림</b>에서 채널ID·템플릿ID를 넣고')
W('설정 → 문자 연동·발송함에서 채널ID·템플릿ID를', '설정 → 알림에서 채널ID·템플릿ID를')
W('또는 설정 → 문자 연동 · 발송함.', '또는 설정 → 발송함.')
W('t:"설정 · 문자 연동 · 발송함 · 알림톡"', 't:"설정 · 알림 · 발송함 · 알림톡"')
W('설정 → 문자 연동 · 발송함에서 실패 이유를 보고', '설정 → 발송함에서 못 보낸 이유를 보고')
W('"거래처·직원·단가표·문자 연동"', '"거래처·직원·단가표·알림"')
W('["set-send","문자 연동"]', '["set-send","알림"]')
W('(문자 연동이 돼 있으면 프로그램이 바로', '(알림 보내기가 준비돼 있으면 프로그램이 바로')
W('설정 → 차량 출고 설정 → PC 알림창', '설정 → 알림 → PC 알림창')
W('설정 → 차량 출고 설정', '설정 → 출고 지연 기준')
W('t:"설정 · 차량 출고 설정"', 't:"설정 · 출고 지연 기준"', 2)
W('"set-car2":"차량 출고 설정 — 더 보기"', '"set-car2":"출고 지연 기준 — 더 보기"')
W('<h2 id="coTitle">차량 출고 설정</h2>', '<h2 id="coTitle">출고 지연 기준</h2>')
W('설정에서는 「알림 · 음성」만 고칠 수 있어요.', '설정에서는 「알림」만 고칠 수 있어요.')
W('<b>「알림 · 음성」</b> 한 가지만 보여요.', '<b>「알림」</b> 한 가지만 보여요.')
W('(설정 → 목적지 관리에서 넣어요)', '(설정 → 배달 도착지에서 넣어요)')
W('t:"설정 · 목적지 관리"', 't:"설정 · 배달 도착지"')
W('<div class="dashhead"><h2>목적지 관리</h2>', '<div class="dashhead"><h2>배달 도착지</h2>')
W('"(사람 버튼 ▾ › 휴지통에서 되돌릴 수 있어요)"', '"(오른쪽 위 «마이페이지 ▾» › 휴지통에서 되돌릴 수 있어요)"')
W('위쪽 [휴지통] 버튼으로 가요.', '오른쪽 위 «마이페이지 ▾» › 휴지통으로 가요.')
W('<b>로그인</b>: 이름을 누르고 4자리 코드를 넣습니다. 한 번 들어가면 그 기기에서는 다음에 바로 열립니다.',
  '<b>로그인</b>: 휴대폰 번호와 비밀번호를 넣어요. 한 번 들어가면 그 기기에서는 다음에 바로 열려요.')
W('위쪽 초록 [연결됨 시:분]이면', '위쪽 초록 [저장됨 시:분]이면')
W('("연결됨 "+hhmm(GS.lastAt||Date.now()))', '("저장됨 "+hhmm(GS.lastAt||Date.now()))')
W('[목록에 없어요 — 직접 넣기]', '[목록에 없으면 직접 입력]')
W('[입고 등록하고 장부에 올리기]', '[입고 등록]')
W('[입고 처리 + 판금·도색 보냄]', '[입고하고 판금·도색 맡기기]')
W('[선택항목 입금 완료]', '[선택한 차 입금 완료]')
W('[엑셀(CSV) 받기]', '[엑셀 다운로드]')
W('[선택한 곳에 보내기]', '[선택항목 보내기]')
W('[선택한 곳 보냄 표시 지우기]', '[선택항목 보냄 표시 지우기]')
W('[선택한 건 다시 보내기]', '[선택항목 다시 보내기]')
W('[선택한 예약 취소]', '[선택항목 예약 취소]')
W('<b>[↩ PC 화면으로]</b>', '<b>[PC 화면]</b>')
W('관리자나 개발자에게 물어보세요.', '차곳간에 문의해 주세요.')
W('<b>관리자 또는 개발자에게 문의</b>해 주세요', '<b>차곳간에 문의</b>해 주세요')
W('(기록은 구글 시트에 그대로 있어요)', '(기록은 차곳간 서버에 그대로 있어요)')
W("(프로그램을 고친 뒤에는 관리자가 '새 버전 배포'를 해야 반영돼요.)", "(차곳간이 새 버전을 올리면 반영돼요.)")
W('자동으로 읽어 채울 수 있어요(AI 열쇠 필요).', '자동으로 읽어 채울 수 있어요.')
W('작업을 진행하시려면 확인을 해주십시오.",', '작업을 이어서 하려면 [확인 · 작업 진행]을 눌러 주세요.",')
W("'재입고 차량이에요 — 작업을 진행하시려면 확인을 해주십시오' 안내가 떠요.", "'다시 들어온 차예요 — 작업을 이어서 하려면 [확인 · 작업 진행]을 눌러 주세요' 안내가 떠요.")
W('ask("재입고 차량이에요.', 'ask("다시 들어온 차예요.')
W(' · 정산 · 설정 (컨트롤 타워)"', ' · 정산 · 설정"')
# 도움말 «느릴 때»: 개발 용어 줄 빼기 · 캐시(브라우저) 말 고치기
W('''  "<li><b>[↻]</b>(새로고침)을 누르면 캐시를 건너뛰고 서버에서 새로 받아와요. 구글 시트를 직접 고쳤을 때 쓰세요.</li>"+\n''',
  '''  "<li><b>[새로고침]</b>을 누르면 최신 자료를 다시 받아 와요.</li>"+\n''')
import re as _re
for pat in [r'  "<li><b>\'시트 읽는 방법\'[^\n]*\n', r'  "<li><b>Code\.gs를 바꾸는 방법[^\n]*\n']:
    m = _re.search(pat, s)
    if m: s = s[:m.start()] + s[m.end():]; WORDS += 1
    else: MISS.append((0, pat))
W('<p>v56부터 <b>번호표 방식</b>으로 바뀌어 훨씬 빨라졌어요.</p>', '<p>바뀐 것만 주고받는 방식이라 빨라요.</p>')
W("'<div class=\"hint\" style=\"margin-bottom:10px\">이 화면은 구글 앱스스크립트 위에서 돌고 있어 따로 주소를 넣을 필요가 없어요. 솔라피 열쇠는 스크립트 속성에 있어요.</div>'+", "")
# — 무료 · 체험 (화면 «무료»는 그대로 · 총괄 결정)
W('"체험 무료 건수를 모두 썼어요 · 충전하시면 바로 다시 나가요"', '"체험 무료 건수를 모두 썼어요 · 충전하면 바로 다시 나가요"')
# — F: 맞춤법 · 띄어쓰기
W('가입 코드을', '가입 코드를', 2)
W('toast(what+"을 복사했어요");', 'toast("복사했어요");')
W('toast(what+" 를 복사했어요");', 'toast("복사했어요");')
W('작업 버튼(광택·외부세차 등)를 누르면', '작업 버튼(광택·외부세차 등)을 누르면')
W('★즐겨찾기 9개이 버튼으로', '즐겨찾기 9개가 버튼으로')
W('그 날 칸에 로 보이고', '그 날 칸에 메모로 보이고')
W('제목 옆 <b>버튼</b>로 원하는', '제목 옆 <b>달력 버튼</b>으로 원하는')
W('[이번 달] 버튼나 날짜로', '[이번 달] 버튼이나 날짜로')
W('로그아웃 할까요?', '로그아웃할까요?', 2)
W('t:"현장 · 입고 하기"', 't:"현장 · 입고하기"')
W('t:"현장 · 출고 하기"', 't:"현장 · 출고하기"')
W('["in","입고 하기"],["out","출고 하기"]', '["in","입고하기"],["out","출고하기"]')
W('매니저 — PC 도 됨 (정산·설정은 빼고)', '매니저 — PC도 됨 (정산·설정은 빼고)')
W('>매니저 — PC 도 됨, 정산·설정 빼고<', '>매니저 — PC도 됨, 정산·설정 빼고<')
W('PC 로는 들어올 수 없어요.', 'PC로는 들어올 수 없어요.')
W('PC 로 들어와 입출고 내역', 'PC로 들어와 입출고 내역')
W('<b>직원</b>은 PC 로 들어올 수 없어요.', '<b>직원</b>은 PC로 들어올 수 없어요.')
W('<b>매니저</b>는 PC 로 들어와서', '<b>매니저</b>는 PC로 들어와서')
# — 끝남 → 완료
W('가지 끝남', '가지 완료', 2)
W('준비 끝', '준비 완료', 2)
W('"지난 날 메모 · 아직 안 끝남"', '"지난 날 메모 · 확인 필요"')
W(' 발행 끝냄 (누르면 취소)', ' 발행 완료 (누르면 취소)')
W('이 달 발행 끝냄 표시', '이 달 발행 완료로 표시', 2)
W("모두 발행했으면 '끝냄'으로 표시해요.", "모두 발행했으면 '완료'로 표시해요.")
W("'발행 끝냄' 표시를 지울까요?", "'발행 완료' 표시를 지울까요?")
W('"발행 끝냄으로 표시했어요"', '"발행 완료로 표시했어요"')
W('on?"끝냄 표시":"지우기"', 'on?"완료로 표시":"지우기"')
W("'가입 끝 · <b>'", "'가입 완료 · <b>'")
# — 맞추면 좋은 것
W('사장님', '대표님', 3)
W('label:"매칭된 청구서"', 'label:"맞춘 청구서"', 2)
W('"매칭된 청구서"]', '"맞춘 청구서"]')
W('>매칭 안 됨</span>', '>아직 못 맞춤</span>')
W('(fmt==="ata")?"알림톡(ATA)":(plan.photo?"사진문자(MMS)":(lms?"장문(LMS)":"단문(SMS)"))', '(fmt==="ata")?"알림톡":(plan.photo?"사진 문자":(lms?"긴 문자":"짧은 문자"))')
W('(fmt==="ata")?"알림톡(ATA)":(p.imageId?"사진문자(MMS)":(n>45?"장문(LMS)":"단문(SMS)"))', '(fmt==="ata")?"알림톡":(p.imageId?"사진 문자":(n>45?"긴 문자":"짧은 문자"))')
W('블라인드를 켰어요', '숨기기를 켰어요')
W('"블라인드를 껐어요"', '"숨기기를 껐어요"')
W('로고 (CI) <span class="rt">', '로고 <span class="rt">')
W('안 올리면 <b>차곳간 CI</b> 가 나와요.', '안 올리면 <b>차곳간 기본 로고</b>가 나와요.')
W('"차곳간 CI 를 쓰고 있어요"', '"차곳간 기본 로고를 쓰고 있어요"')
W('승인된 템플릿 문구로 나가고, 실패하면 문자로 자동 대체됩니다.', '승인된 문구로 나가고, 안 되면 문자로 가요.')
W('예약 번호가 없어 취소할 수 없습니다 (솔라피 사이트에서 취소해 주세요)', '예약을 취소하지 못했어요. 차곳간에 문의해 주세요.')
W('<h3>입금을 받으셨습니까?</h3>', '<h3>입금을 받으셨나요?</h3>')
W('confirmed("나가시겠습니까?",this)', 'confirmed("나갈까요?",this)')
W('"먼저 골라주세요"', '"먼저 줄을 골라 주세요"', 2)
W('"먼저 체크해 주세요"', '"먼저 줄을 골라 주세요"')
W('"위 표에서 먼저 체크해 주세요"', '"먼저 줄을 골라 주세요"')
W('"발급할 건을 표에서 먼저 체크해 주세요"', '"먼저 줄을 골라 주세요"')
W('"먼저 줄을 골라주세요"', '"먼저 줄을 골라 주세요"')
W('"내보낼 자료가 없습니다"', '"다운로드할 자료가 없어요"', 5)
W('창 허용 후 다시 해주세요', '새 창 열기를 허용한 뒤 다시 시도해 주세요', 3)
W('"잠시 뒤에 다시 해주세요"', '"잠시 뒤 다시 시도해 주세요"')
W('잠시 뒤 다시 눌러주세요', '잠시 뒤 다시 시도해 주세요')
W('"시연 자료를 불러오는 중입니다…"', '"시연 자료를 불러오는 중이에요…"')
W('textContent="불러오는 중…"', 'textContent="불러오는 중이에요…"', 3)
W('toast("불러오는 중…")', 'toast("불러오는 중이에요…")')
W('<div class="hint">불러오는 중…</div>', '<div class="hint">불러오는 중이에요…</div>')
W('btn.textContent="처리 중…";', 'btn.textContent="처리하는 중이에요…";')
W('"복사가 막혔습니다. 글자를 길게 눌러 복사해 주세요"', '"복사하지 못했어요. 길게 눌러 복사해 주세요"')
W('"복사가 막혔어요. 글자를 길게 눌러 복사해 주세요"', '"복사하지 못했어요. 길게 눌러 복사해 주세요"')
W('"복사가 막혔습니다. 직접 적어 주세요: "', '"복사하지 못했어요. 직접 적어 주세요: "')
W('[아예 지우기]를 눌러야 진짜로 지워져요.', '[선택한 줄 완전히 지우기]를 눌러야 진짜로 지워져요.')
W('<b style="color:var(--danger)">아예 지우기</b>를 눌러야', '<b style="color:var(--danger)">완전히 지우기</b>를 눌러야')
W('휴지통 비우기 (전부 아예 지우기)', '휴지통 비우기')
W('},"전부 아예 지우기",true);', '},"휴지통 비우기",true);')
W('},"아예 지우기",true);', '},"완전히 지우기",true);')
W('toast("화면 배치를 "+LY_INFO[pick][0]+" 로 바꿨어요");', 'toast("메뉴 배치를 "+LY_INFO[pick][0]+"(으)로 바꿨어요");')
W('toast("화면 배치를 바꿨어요");', 'toast("메뉴 배치를 바꿨어요");')
W('"메뉴가 화면 맨 위에 한 줄로 놓여요.', '"메뉴가 화면 위에 가로로 놓여요.')
# — 말 대조표: 기호 → 글 · 선 아이콘
W('즐겨찾기(★)는 출고 화면에서 지정해요.', '즐겨찾기는 출고 화면에서 별 버튼으로 지정해요.')
W('[목록]에서 ★을 누르세요.', '[목록]에서 별 버튼을 눌러 주세요.')
W("b.innerHTML='<span class=\"st\">★</span>'+esc(d.name);", "b.innerHTML='<span class=\"st\">'+jStar(true)+'</span>'+esc(d.name);")
W("'<button class=\"star\" type=\"button\">'+(d.fav?\"★\":\"☆\")+'</button>';", "'<button class=\"star\" type=\"button\" aria-label=\"'+(d.fav?\"즐겨찾기 빼기\":\"즐겨찾기\")+'\">'+jStar(d.fav)+'</button>';")
W("'<span class=\"ok\">✓ 번호를 읽었어요</span>'", "'<span class=\"ok\">번호를 읽었어요</span>'")
W("<span class=\"lateMark ok\">✓</span>", "<span class=\"lateMark ok\">'+jCheck()+'</span>")
W('\\u21bb \\uc0c8\\ub85c\\uace0\\uce68', '\\uc0c8\\ub85c\\uace0\\uce68')
W('el.textContent=pc?"↻ 새로고침":"↻";', 'el.textContent=pc?"새로고침":"";if(!pc)el.innerHTML=jRefresh();el.setAttribute("aria-label","새로고침");')
W('바로 보고 싶으면 [↻ 새로고침].', '바로 보고 싶으면 [새로고침].')
W('인터넷 연결 확인 → [↻ 새로고침].', '인터넷 연결 확인 → [새로고침].')
W('''<button class="x" title="닫기">✕</button></div>''', '''<button class="x" title="닫기" aria-label="닫기">'+jX()+'</button></div>''')
W('''<button class="del" type="button">✕</button>''', '''<button class="del" type="button" aria-label="사진 빼기">'+jX()+'</button>''', 2)
W('x.className="sheetx";x.textContent="✕";', 'x.className="sheetx";x.innerHTML=jX();x.setAttribute("aria-label","닫기");')
W('x.className = "sheetx"; x.textContent = "✕";', 'x.className = "sheetx"; x.innerHTML = jX(); x.setAttribute("aria-label","닫기");')
W('막대는 입금 · 미수 금액을 이어 붙인 거예요.', '막대는 입금 · 받을 금액을 이어 붙인 거예요.')
W('알림(재발송)"', '알림(다시 보냄)"', 3)
W('앱스스크립트 주소를 넣으면 출고 알림과 청구 문자가 <b>자동으로</b> 나가요. 넣기 전까지는 지금처럼 문자 앱이 열려요.',
  '알림 보내기가 준비되면 출고 알림과 청구 알림이 <b>자동으로</b> 나가요. 준비 전에는 지금처럼 문자 앱이 열려요.')
W("' 번호로 인증번호를 보냈습니다.</div>'", "' 번호로 인증번호를 발송했습니다. 5분 안에 입력해 주세요.</div>'")
W('<span style="flex:1;color:#667389">매달 금액</span>', '<span style="flex:1;color:#667389">결제 금액 (30일마다)</span>')
# — 그만두기 · 아니요 · 네, 진행 → 취소 · 하는 일 이름
W('esc(okText||"네, 진행")', 'esc(okText||"확인")')
W('{t:"그만두기",kind:"primary",wide:true}', '{t:"취소",kind:"primary",wide:true}', 2)
W('id="uoNo">그만두기</button>', 'id="uoNo">취소</button>')
W('id="dpNo">그만두기</button>', 'id="dpNo">취소</button>')
W('id="dpNo">아니요</button>', 'id="dpNo">취소</button>')

# ═════ 6) 해요체 둘째 판 — 화면 오류 · 알림 글도 해요체 (말 대조표 0 · 3장)
#      그대로: 로그인 · 가입 · 비밀번호 · 인증번호 · 결제 · 카드 · 손님에게 나가는 글 · 인쇄물 · 약관 ═════
SKIP2 = re.compile(r"로그인|가입|비밀번호|인증번호|결제|카드|환불|"
                   r"#\{|\[차곳간\]|DEF_|\{딜러\}|\{업체\}|\{차량번호\}|\{연락처\}|document\.write|이용약관|개인정보|약관|"
                   r"sms|Sms|SMS|msg=|Msg=|text:|encodeURIComponent|주문 부탁|<title>|appName\(\)\+\"\]|shopLabel\(\)\)\+\"\]|"
                   r"aiJson|prompt|PROMPT|HTX_|홈택스 양식")
EXTRA = {"못했습니다": "못했어요", "못합니다": "못해요", "잘못됐습니다": "잘못됐어요", "잘못되었습니다": "잘못됐어요",
         "잡아먹었습니다": "잡아먹었어요", "생겼습니다": "생겼어요", "막혔습니다": "막혔어요"}
TOK2 = re.compile(r"[가-힣]+니다")
def _h2(m):
    w = m.group(0)
    return EXTRA.get(w) or HAEYO.get(w, w)
SP = re.compile(r"(?<=[어아해러라려와워봐써켜꺼내채겨줘])주세요")
changed2 = 0
def haeyo2(text):
    global changed2
    out = []
    for ln in text.split("\n"):
        st = ln.lstrip()
        if st.startswith("/*") or st.startswith("//") or st.startswith("*") or SKIP2.search(ln):
            out.append(ln); continue
        q = SP.sub(" 주세요", TOK2.sub(_h2, ln))
        if q != ln: changed2 += 1
        out.append(q)
    return "\n".join(out)
a = s.index('<style id="cgg-j4">'); b = s.index('</style>', a) + 8
c = s.index('/* 차곳간 공통 부품 cgg-j4 1.5 (디자인/공통/cgg-j4.js'); d = s.index('\n</script>', c)
out, pos = [], 0
for x, y in sorted([(a, b), (c, d)]):
    out.append(haeyo2(s[pos:x])); out.append(s[x:y]); pos = y
out.append(haeyo2(s[pos:])); s = "".join(out)
WORDS += changed2
assert CSS in s and JS in s
print("해요체 둘째 판 줄:", changed2)

# 손님에게 나가는 글은 v122 그대로 (v123 에서 해요체로 바뀐 입금 확인 문자 되돌림)
rep('+"원 입금 확인되었어요. 감사합니다.\\n"', '+"원 입금 확인되었습니다. 감사합니다.\\n"', word=False)
rep(' "[청구 월] 광택·세차 작업 내역을 보내 드려요.\\n\\n"+', ' "[청구 월] 광택·세차 작업 내역을 보내드립니다.\\n\\n"+', word=False)
rep('say("문자를 보냈어요. 5분 안에 넣어 주세요");', 'say("인증번호를 발송했습니다. 5분 안에 입력해 주세요.");')
open(OUT, "w", encoding="utf-8").write(s)
for n, o in MISS: print("못 찾음(%d):" % n, o)
print("고친 말:", WORDS, "· OK", OUT, len(s))
