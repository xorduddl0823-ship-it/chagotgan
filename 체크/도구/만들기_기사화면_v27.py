"""기사 폰 화면 v26 → v27 — 오픈 베타 시험판 마무리 (v26 을 대신함 · v26 은 읽기만)
받은 목록: 디자인/공통/오픈베타_띠.md · 디자인/말_대조표.md · 알림톡/07_워딩_검토/기사_v25.md(대조표 우선) · 보안 방 바탕 검사(기사 forget)
바꾸는 것:
  1) 오픈 베타 띠 — 디자인 조각 그대로(맨 위 · 통합 입구 안에서는 숨김)
  2) 오류 글 — 화면은 «○○하지 못했어요. 다시 시도해 주세요.», 로그인 · 비밀번호 칸은 표준형 (말 대조표 3장)
  3) 알림톡 먼저 (규칙 6) — 「ATA 보냄」 → 「알림톡 보냄」, 문자(MMS) 안내 → 알림톡 안내, 보낸 결과 이유가 영어면 쉬운 말
  4) 말 — 알림톡 방 목록(아니오 → 아니요 · 맞습니까 → 맞나요 · 명부 · 빈 값 · 취소 풀기 …) · 해요체(오류 글 포함)
  5) 보안 — 로그아웃하면 이름 고르기 칩(NAMES)도 지움 (보안 방 낮음)
"""
import sys, re
sys.path.insert(0, "/home/user/chagotgan/체크/도구")
import 해요체
BASE = "/home/user/chagotgan/체크/driver/"
SRC = BASE + "index_v26.html"
OUT = BASE + "index_v27.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1) 오픈 베타 띠 — 디자인 조각
rep('''<div class="cgg-beta" role="note"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div>''',
    '''<div class="cgg-beta" id="cggBeta" role="note"><div class="in"><b>오픈 베타</b><span>차곳간은 지금 오픈 베타예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div></div>
<script>try{ if(window.top!==window.self){ document.getElementById("cggBeta").hidden=true; } }catch(e){ document.getElementById("cggBeta").hidden=true; }</script>''')
a = s.index("/* v26: 오픈 베타 띠 — 사무실 화면 · 홈페이지와 같은 모양 */")
b = s.index("body{margin:0; background:var(--ground); color:var(--ink);", a)
s = s[:a] + '''/* 오픈 베타 띠 (디자인 방 2026-10-15) */
:root{--beta-bg:#0d2440;--beta-ink:#e8f0fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--beta-bg:#1d3a5f}}
:root[data-theme="dark"]{--beta-bg:#1d3a5f}
.cgg-beta{background:var(--beta-bg);color:var(--beta-ink);font-size:13.5px;line-height:1.5;word-break:keep-all}
.cgg-beta .in{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;
  padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.cgg-beta b{background:var(--beta-ink);color:var(--beta-bg);border-radius:6px;padding:1px 8px;font-size:12px;font-weight:800;flex:none}
.cgg-beta[hidden]{display:none}
@media (max-width:600px){.cgg-beta{font-size:12.5px}.cgg-beta .in{display:block;padding-block:6px}.cgg-beta b{margin-right:6px}}
''' + s[b:]

# 2) 오류 글
a = s.index("/* v26: 화면에는 쉬운 말만 */\nfunction niceMsg(m){")
b = s.index("\n}\n", a) + 3
s = s[:a] + '''/* v27: 화면에는 쉬운 말만 — 화면은 해요체, 로그인 · 비밀번호 칸은 표준형(formal) (말 대조표 3장) */
function niceMsg(m, formal){
  m=String(m==null?'':m).trim();
  var NET = formal ? '연결이 잠시 끊겼습니다. 잠시 후 다시 시도해 주세요.' : '연결이 잠시 끊겼어요. 다시 시도해 주세요.';
  var GEN = formal ? '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' : '처리하지 못했어요. 다시 시도해 주세요.';
  if(!m) return GEN;
  if(/Failed to fetch|NetworkError|Load failed|network|timed? ?out|aborted|offline|연결이 잠시 끊겼/i.test(m)) return NET;
  if(!/[가-힣]/.test(m) || /undefined|\\bnull\\b|NaN|\\[object /.test(m)){ try{ console.warn('바꾼 오류 글:', m); }catch(e){} return GEN; }
  if(/^처리하지 못했/.test(m)) return GEN;
  if(/^서버에서 답을 받지 못했/.test(m)) return formal ? '서버에서 답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.' : '서버에서 답을 받지 못했어요. 다시 시도해 주세요.';
  if(/^서버 설정이 맞지 않아/.test(m)) return formal ? '서버 설정이 맞지 않아 처리하지 못했습니다. 사무실에 알려 주세요.' : '서버 설정이 맞지 않아 처리하지 못했어요. 사무실에 알려 주세요.';
  return m;
}
/* 보낸 결과 — 방법 코드(ATA · MMS · LMS · SMS)는 우리말로, 이유가 영어 · 코드면 쉬운 말로 */
function howKo(h){ h=String(h||'').toUpperCase(); return h==='ATA'?'알림톡':h==='MMS'?'사진 문자':(h==='LMS'||h==='SMS')?'문자':(h||'-'); }
function whyKo(w){ w=String(w||''); return (!w || !/[가-힣]/.test(w)) ? '보내지 못했어요. 연락처를 확인하고 다시 시도해 주세요.' : w; }
''' + s[b:]
rep('''function lgSay(m){
  m=String(m||'');''', '''function lgSay(m){
  m=niceMsg(m, true);   /* v27: 로그인 칸은 표준형 */''')
rep('''    show('login'); $('lg-msg').innerHTML='<span class="bad" style="display:block">'+esc(e.message)+'</span>';''',
    '''    show('login'); $('lg-msg').innerHTML='<span class="bad" style="display:block">'+esc(niceMsg(e.message, true))+'</span>';''')
rep('''  }).catch(function(e){ $('cp-msg').innerHTML='<span class="bad">'+esc(e.message)+'</span>'; });''',
    '''  }).catch(function(e){ $('cp-msg').innerHTML='<span class="bad">'+esc(niceMsg(e.message, true))+'</span>'; });''')
rep('''      .catch(function(e){ alert2('하지 못했습니다', e.message); });''',
    '''      .catch(function(e){ alert2(undo?'취소를 풀지 못했어요':'취소 표시를 하지 못했어요', e.message); });''')

# 3) 알림톡 먼저
rep(''': ok?esc(row.딜러)+' 님께 '+esc(row.발송방법)+' 보냄':esc(row.발송사유))''', ''': ok?esc(row.딜러)+' 님께 '+esc(howKo(row.발송방법))+' 보냄':esc(whyKo(row.발송사유)))''')
rep('''esc(r.발송방법||'-')+' '+esc(r.발송결과||'')''', '''esc(howKo(r.발송방법))+' '+esc(r.발송결과||'')''')
rep('''esc(y.why||'보냈어요')''', '''esc(y.ok?'보냈어요':whyKo(y.why))''')
rep('''$('ocr-st').innerHTML='<span style="color:var(--bad)">'+esc(r.error)+'</span>'; return; }''',
    '''$('ocr-st').innerHTML='<span style="color:var(--bad)">번호판을 못 읽었어요 — 번호판을 손가락으로 누르거나 직접 넣어 주세요</span>'; return; }''')
W = [
    ('<div class="hint">문자(MMS)에는 <b>첫 사진</b>이 붙고, 추가 사진은 배달 기록에 같이 보관돼요.</div>',
     '<div class="hint">딜러는 알림톡의 «사진 보기»로 사진을 봐요. (알림톡이 안 되면 문자에 <b>첫 사진</b>이 붙어요)</div>'),
    ('<span>④ 딜러 (문자 받을 사람)</span>', '<span>④ 딜러 (알림 받을 사람)</span>'),
    ('문자 받을 번호 — 체크한 번호로 모두 보내요', '알림 받을 번호 — 체크한 번호로 모두 보내요'),
    ("(ok?'✅ 완료':'⚠️ 기록은 됐지만 문자 실패')", "(ok?'보냈어요':'기록은 됐지만 알림을 못 보냈어요')"),
    ('사진을 올리고 문자를 보내고 있어요.', '사진을 올리고 알림을 보내고 있어요.'),
    ("'딜러 번호가 없어 기록만 남고 문자는 안 나가요'", "'딜러 번호가 없어서 기록만 남고 알림은 안 나가요'"),
    ("'차량번호 없이 보내요 (문자에 번호는 안 들어가요)'", "'차량번호 없이 보내요 (알림에 번호는 안 들어가요)'"),
    ("'</b> 로 문자가 가요.'", "'</b>로 알림이 가요.'"),
    ('<button class="big b-sub" id="k-no">아니오 — 다른 걸로 고르기</button>', '<button class="big b-sub" id="k-no">아니요 — 다른 걸로 고르기</button>'),
    ("'</b> 가(이) 맞습니까?</div>'", "'</b>가 맞나요?</div>'"),
    ("예, 맞아요", "네, 맞아요"),
    ("'명부에 없는 이름이에요 — 아래 연락처를 넣어 주세요'", "'딜러 목록에 없는 이름이에요 — 아래 연락처를 넣어 주세요'"),
    ("esc(lastOcrText||'(빈 값)')", "esc(lastOcrText||'(읽은 글자 없음)')"),
    ("(r.상태==='취소'?'취소 되돌리기':'이 기록 취소(지움 표시)')", "(r.상태==='취소'?'취소 풀기':'취소 표시')"),
    ("'아직 없어요.'", "'아직 보낸 것이 없어요.'"),
]
for a, b in W:
    if a not in s: raise SystemExit("못 찾음: " + a[:80])
    s = s.replace(a, b)
# 기사가 할 수 없는 일(설정에 비전 키)을 시키는 문장 빼기
m = re.search(r" ?자주 이러면 설정에 비전 키\(또는 OCR\.space 키\)를 [^<'\"]*", s)
if not m: raise SystemExit("비전 키 문장을 못 찾음")
s = s[:m.start()] + s[m.end():]

# 5) 로그아웃하면 이름 칩도
rep('''  [BKEY, CKEY, RECENT, FREQ, DRAFT, WHOK].forEach(''', '''  [BKEY, CKEY, RECENT, FREQ, DRAFT, WHOK, NAMES].forEach(''')

# 4) 해요체 — 오류 글까지 (로그인 · 비밀번호 칸은 그대로)
s, HEYO, LEFT = 해요체.make(s, ("function lgSay", "function niceMsg", "function alert2"), errors=True)
for bad in ["OPEN BETA", "Verify JWT", "아니오 —", "맞습니까", "(빈 값)", "OCR.space"]:
    if bad in s: raise SystemExit("아직 남음: " + bad)
open(OUT, "w", encoding="utf-8").write(s)
open("/home/user/chagotgan/체크/도구/해요체_기사v27_바꾼말.txt", "w", encoding="utf-8").write(
    "기사 화면 v27 해요체로 바꾼 말 (v26 다음, 오류 글 포함)\n" + "\n".join("%d\t%s\n  전: %s\n  후: %s" % x for x in HEYO))
print("OK", OUT, len(s), "· 목록 말:", len(W) + 6, "· 해요체:", len(HEYO), "· 못 바꾼:", len(LEFT), LEFT[:3])
