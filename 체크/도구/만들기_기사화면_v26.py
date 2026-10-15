"""기사 폰 화면 v25(보안 통과) → v26 — 오픈 베타 시험판 (운영/요청서/2026-10-15_07_오픈베타_시험_마무리.md). v25 는 읽기만.
바꾸는 것:
  1) 「오픈 베타」 띠 — 사무실 화면(체크 v39)과 같은 모양 · 같은 문구, 맨 위
  2) 오류 글 — 영어 · 코드 숫자 · 개발 글(«Verify JWT» 등)이 화면에 나오지 않게 한 곳(niceMsg)에서. 자세한 것은 콘솔에만
  3) 보안 — 로그아웃하면 이 폰에 남은 업무 자료(목적지 · 딜러 목록, 차량 목록, 자주 간 곳, 쓰다 만 배달)를 지움
     (다른 기사가 같은 폰으로 로그인해도 앞사람 자료가 안 보이게. 이름 고르기 칩 · 회사 코드는 편의로 남김)
  4) 말 — 해요체(규칙 4-1). 로그인 · 가입 · 오류 안내는 표준형 그대로
"""
import sys, re
sys.path.insert(0, "/home/user/chagotgan/체크/도구")
import 해요체
BASE = "/home/user/chagotgan/체크/driver/"
SRC = BASE + "index_v25.html"
OUT = BASE + "index_v26.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1) 오픈 베타 띠
rep('''<body>
<div class="wrap">''', '''<body>
<div class="cgg-beta" role="note"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div>
<div class="wrap">''')
rep('''body{margin:0; background:var(--ground); color:var(--ink);''', '''/* v26: 오픈 베타 띠 — 사무실 화면 · 홈페이지와 같은 모양 */
.cgg-beta{background:#0d2440;color:#e8f0fb;font-size:12.5px;padding:7px 12px;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;line-height:1.5}
.cgg-beta b{background:#e8f0fb;color:#0d2440;border-radius:6px;padding:0 7px;font-size:12px;letter-spacing:.04em}
@media (prefers-color-scheme: dark){ .cgg-beta{background:#1d3a5f} .cgg-beta b{color:#1d3a5f} }
body{margin:0; background:var(--ground); color:var(--ink);''')

# 2) 오류 글
rep('''    if(!j) throw new Error('서버가 글자로 답했습니다 ('+r.status+') : '+String(t).slice(0,160));''',
    '''    if(!j){ try{ console.warn('check-api 답이 JSON 이 아님', r.status, String(t).slice(0,300)); }catch(e){}
      throw new Error('서버에서 답을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); }''')
rep('''      if(r.status===401) throw new Error('서버가 열쇠를 요구하고 있습니다. 수파베이스에서 check-api 의 Verify JWT 를 꺼 주세요.');
      throw new Error('서버 답을 알아듣지 못했습니다 : '+String(t).slice(0,160));''',
    '''      try{ console.warn('check-api 답을 알아듣지 못함', r.status, String(t).slice(0,300)); }catch(e){}
      if(r.status===401||r.status===404) throw new Error('서버 설정이 맞지 않아 처리하지 못했습니다. 사무실에 알려 주세요.');
      throw new Error('처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');''')
rep('''    return j.result;
  }); });
}''', '''    return j.result;
  }); }).catch(function(e){ var er=new Error(niceMsg(e&&e.message)); if(e&&e.need) er.need=e.need; throw er; });   /* v26 */
}
/* v26: 화면에는 쉬운 말만 */
function niceMsg(m){
  m=String(m==null?'':m).trim();
  if(!m) return '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  if(/Failed to fetch|NetworkError|Load failed|network|timed? ?out|aborted|offline/i.test(m)) return '인터넷 연결이 불안정합니다. 연결을 확인하고 다시 시도해 주세요.';
  if(!/[가-힣]/.test(m) || /undefined|\\bnull\\b|NaN|\\[object /.test(m)){ try{ console.warn('바꾼 오류 글:', m); }catch(e){} return '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; }
  return m;
}''')

# 3) 로그아웃하면 업무 자료 지움
rep('''function forget(){ me={}; try{ localStorage.removeItem(LS); sessionStorage.removeItem(LS); }catch(e){} }''',
    '''function forget(){ me={}; B=null; try{ localStorage.removeItem(LS); sessionStorage.removeItem(LS);
  [BKEY, CKEY, RECENT, FREQ, DRAFT, WHOK].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} }); }catch(e){} }   /* v26: 앞사람 업무 자료 지움 */''')

rep("'위치 못 받음 (괜찮습니다)'", "'위치 못 받음 (괜찮아요)'")
# 4) 해요체 — 로그인 · 가입 · 오류 칸(lg- · cp-msg · alert2 · bad)은 그대로
s, HEYO, LEFT = 해요체.make(s, ("function lgSay", "function niceMsg", "function alert2"))
if re.search(r"Verify JWT|글자로 답했|알아듣지 못했습니다 :", s): raise SystemExit("개발 글이 남음")
open(OUT, "w", encoding="utf-8").write(s)
open("/home/user/chagotgan/체크/도구/해요체_기사v26_바꾼말.txt", "w", encoding="utf-8").write(
    "기사 화면 v26 해요체로 바꾼 말\n" + "\n".join("%d\t%s\n  전: %s\n  후: %s" % x for x in HEYO))
print("OK", OUT, len(s), "· 해요체로 바꾼 말:", len(HEYO), "· 못 바꾼 말:", len(LEFT), LEFT[:5])
