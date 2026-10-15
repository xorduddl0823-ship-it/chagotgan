"""관리 v4.6 만들기 — 오픈 베타 시험 마무리 (운영/요청서/2026-10-15_07_오픈베타_시험_마무리.md)
쓰는 법: python3 관리/만들기_관리_v4.6.py   (v4.5 파일은 읽기만)
- 재료: 관리/3_차곳간_관리_index_v4.5.html (보안 통과) — 공통 부품 cgg-j4 1.5 동결 그대로
- 결과: 관리/3_차곳간_관리_index_v4.6.html
- 바꾸는 것: ① 말 (규칙 4장: 「돈」→「금액 · 결제」, «~함» 줄임말 → 해요체, 오류 글은 «무엇이 안 됐고 어떻게 하면 되는지»)
             ② 보안: 로그아웃하면 화면을 처음부터 다시 열어 메모리에 남은 목록 · 화면을 모두 비워요
  관리에는 «오픈 베타» 띠를 넣지 않아요 (요청서 4).
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.5.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.6.html")
s = open(SRC, encoding="utf-8").read()
N = {"말": 0}

def rep(old, new, words=True):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)
    if words: N["말"] += 1

rep('var ADM_VER="관리 v4.5 · 공통 1.5 · 2026-10-15";', 'var ADM_VER="관리 v4.6 · 공통 1.5 · 2026-10-15";', False)

# ① 말 — 「돈」 대신 「금액 · 결제」
rep('(x.paidOrder?"돈 냄 · ":"")', '(x.paidOrder?"결제됨 · ":"")')
rep('«확인 필요»는 돈은 냈는데 아직 열리지 않은 곳이라', '«확인 필요»는 결제는 됐는데 아직 열리지 않은 곳이라')
rep('>돈은 냈는데 업체가 아직 열리지 않았어요.', '>결제는 됐는데 업체가 아직 열리지 않았어요.')
rep('{label:"확인 필요 (돈은 냄)"', '{label:"확인 필요 (결제됨)"')
# «~함» 줄임말 → 해요체 · 상태 칩 말
rep("""'<span class="pill off">급함</span>'""", """'<span class="pill off">충전 필요</span>'""")
rep("""'<span class="pill wait">곧</span>'""", """'<span class="pill wait">곧 충전</span>'""")
rep("""'<span class="pill ok">넉넉</span>'""", """'<span class="pill ok">넉넉해요</span>'""")
rep("""'<span class="pill ok">가입함</span>'""", """'<span class="pill ok">가입 완료</span>'""")
rep('purge:"자료 정리함"', 'purge:"자료 정리"')
rep("""r.dealer.withdrawn?'탈퇴함':''""", """r.dealer.withdrawn?'탈퇴했어요':''""")
# 오류 글 — 무엇이 안 됐고 어떻게 하면 되는지 (가입 · 로그인 · 오류 안내는 표준형 «~습니다»)
rep('throw new Error("서버에 연결하지 못했습니다 (인터넷 확인)");', 'throw new Error("서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");')
rep('throw new Error("서버 응답을 읽지 못했습니다");', 'throw new Error("서버 응답을 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.");')
rep('Promise.reject(new Error("로그인이 필요합니다"))', 'Promise.reject(new Error("로그인이 필요합니다. 다시 로그인해 주세요"))')
def fix(m):
    N["말"] += 1
    return 'e.message||"%s못했어요. 다시 시도해 주세요."' % m.group(1)
s = re.sub(r'e\.message\|\|"([가-힣 ]*?)못했습니다"', fix, s)
s = re.sub(r'(\.err=e\.message\|\|")([가-힣 ]*?)못했습니다"', lambda m: (N.__setitem__("말", N["말"]+1) or "") + m.group(1)+m.group(2)+'못했어요. 다시 시도해 주세요."', s)
rep("""'<h3>'+(ok?'계산서를 보냈어요':'계산서를 보내지 못했습니다')+'</h3>'+""", """'<h3>'+(ok?'계산서를 보냈어요':'세금계산서를 보내지 못했어요. 아래 이유를 확인하고 다시 보내 주세요.')+'</h3>'+""")

# ② 보안 — 로그아웃 뒤 남는 자료 0: 화면을 처음부터 다시 열어요 (목록 · 표 상태 · 고른 줄 · 열린 창 모두 사라짐)
rep("""      .then(function(){ D={me:null,sum:null,shops:[],users:[],pays:[],invites:[],plans:[],sess:[]};
        $("gid").value=""; $("gpw").value=""; TICK=""; step2(false); showGate(""); });""",
    """      .then(function(){ D={me:null,sum:null,shops:[],users:[],pays:[],invites:[],plans:[],sess:[]};
        $("main").innerHTML=""; closeSheet(); closeAsk();
        $("gid").value=""; $("gpw").value=""; TICK=""; step2(false); showGate("");
        /* 메모리에 남은 목록(결제 · 계정 · 기록 …)까지 비우려고 처음 화면으로 다시 열어요 */
        try{ location.replace(location.href.split("#")[0]); }catch(e){} });""", False)

# ③ 알림 › 발송 기록 (대표님 «알림톡 발송 데이터 기록», 요청서 07 덧붙임) — 창구 hqSendLog 는 서버 방이 만들어요
rep('["ata","알림톡 템플릿",viewAta],', '["ata","알림톡 템플릿",viewAta],\n  ["slog","발송 기록",viewSendLog],', False)
rep('["noti","알림",["sms","noti","ata"]],', '["noti","알림",["sms","noti","ata","slog"]],', False)
rep('noti:"기한 안내 문자 · 공지사항 · 알림톡 템플릿 코드예요. 안내는 알림톡이 먼저 나가요.",',
    'noti:"기한 안내 문자 · 공지사항 · 알림톡 템플릿 코드 · 발송 기록이에요. 안내는 알림톡이 먼저 나가고, 안 되면 문자로 대신 나가요.",', False)
rep('function navOf(t){', open(os.path.join(HERE, "v4재료", "sendlog.js"), encoding="utf-8").read() + '\nfunction navOf(t){', False)
# ④ 말 대조표 — 디자인 방 디자인/말_대조표.md · 결제 방 결제/12_결제_말_대조표.md (관리 칸)
# 화면에 서버 · 브라우저 글을 그대로 내보내지 않게: 한글이 없는 오류(영어 · 코드)는 쉬운 말로 바꿔요
rep("function open_(fn,args){", 'function emsg(e,fb){ var m=String((e&&e.message)||""); return /[가-힣]/.test(m)?m:(fb||"처리하지 못했어요. 다시 시도해 주세요."); }\nfunction open_(fn,args){', False)
def cnt(a,b,n=None):
    global s
    k=s.count(a)
    if not k or (n is not None and k!=n): raise SystemExit("찾은 수 %d: %s" % (k, a[:60]))
    s=s.replace(a,b); N["말"]+=k
s = re.sub(r'e\.message\|\|("[^"]*")', lambda m: (N.__setitem__("말",N["말"]+1) or "") + "emsg(e,%s)" % m.group(1), s)
cnt('toast(e.message,true)', 'toast(emsg(e),true)')
cnt('esc(e.message)', 'esc(emsg(e))')
# 해요체 · 같은 뜻 같은 말
cnt('<b>불러오지 못했습니다.</b>', '<b>불러오지 못했어요.</b>')
cnt('"확인하지 못했습니다"', '"확인하지 못했어요"')
cnt('<b>찾지 못했습니다.</b>', '<b>찾지 못했어요.</b>')
cnt('>들어가기</button>', '>로그인</button>', 1)
cnt('>다시 불러오기</button>', '>새로고침</button>')
cnt('b2.textContent="다시 불러오기"', 'b2.textContent="새로고침"', 1)
cnt('toast("다시 불러오는 중…")', 'toast("새로고침하는 중이에요…")', 1)
cnt('불러오는 중…"', '불러오는 중이에요…"')
cnt('<div class="empty">불러오는 중…</div>', '<div class="empty">불러오는 중이에요…</div>')
cnt('style="padding:6px 10px;font-size:13px">삭제</button>', 'style="padding:6px 10px;font-size:13px">지우기</button>', 1)
cnt('["m9","업체 삭제에 재확인이 있는지",', '["m9","업체 지우기에 재확인이 있는지",', 1)
cnt('엑셀 내려받기', '엑셀 다운로드', 1)
cnt('ok:okText||"네, 진행"', 'ok:okText||"확인"', 1)
cnt('<option value="1">네, 올려주세요</option><option value="0">아니요</option>', '<option value="1">남은 금액도 올리기</option><option value="0">올리지 않기</option>', 1)
cnt('"기록 없음"', '"아직 기록이 없어요"')
cnt('txt = "자동 읽기 실패 — "+v.auto_err;', 'txt = "자동으로 읽지 못했어요 — "+v.auto_err;', 1)
cnt("'곳 성공 · '+bad.length+'곳 실패</div>'", "'곳 보냈어요 · '+bad.length+'곳은 보내지 못했어요</div>'", 1)
cnt('return ["📝","오늘 메모 · "', 'return ["memo","오늘 메모 · "', 1)
cnt('id="pplGo">찾기</button>', 'id="pplGo">검색</button>', 1)
cnt('title="내 정보"', 'title="마이페이지"', 1)
cnt("'<div><h4>내 정보</h4>", "'<div><h4>마이페이지</h4>", 1)
cnt('켜면 업체 앱에 «카드 등록하고 매달 자동 결제»가 보여요.', '켜면 업체 앱에 «자동 결제 켜기»가 보여요.', 1)
cnt('gmsg(e.message,true)', 'gmsg(emsg(e,"로그인하지 못했습니다. 잠시 후 다시 시도해 주세요."),true)', 2)
# 결제 · 환불 오류는 표준형 + 할 일 (결제 방 대조표)
cnt('emsg(e,"환불하지 못했어요. 다시 시도해 주세요.")', 'emsg(e,"환불하지 못했습니다. 잠시 뒤 다시 시도해 주세요.")', 1)
cnt('<b>환불 금액을 불러오지 못했습니다.</b>', '<b>환불 금액을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</b>', 1)
# 「계산서」 → 「세금계산서」 (폰 아래 탭바 한 칸만 «계산서»)
s = s.replace('label:"계산서"},{key:', 'label:"\u0001"},{key:')
k = len(re.findall(r'(?<!세금)(?<!전자)계산서', s)); N["말"] += k
s = re.sub(r'(?<!세금)(?<!전자)계산서', '세금계산서', s)
s = s.replace('label:"\u0001"},{key:', 'label:"계산서"},{key:')
# ⑤ 보안 방 낮음 ① — 유지비 «바로 가기» 링크는 https:// 로 시작할 때만
rep("""(x.url?('<a class="btn sm" href="'+esc(x.url)+'" target="_blank" rel="noopener">바로 가기</a>'):'')+""",
    """(/^https:\\/\\//i.test(String(x.url||""))?('<a class="btn sm" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">바로 가기</a>'):'')+""", False)
# ⑦ 알림톡 방 버그 알림 — 템플릿 표에 자동결제등록 · 자동결제실패 두 줄 + «코드 저장»이 표에 없는 코드를 지우지 않게
a = s.index('  ["staff_link",'); b = s.index('\n', a)
s = s[:b] + ',\n  ["bill_on",     "차곳간_자동결제등록",   "자동 결제 카드를 등록했을 때",          "등록 전"],\n  ["bill_fail",   "차곳간_자동결제실패",   "자동 결제가 되지 않았을 때 (다음 시도일 안내)", "등록 전"]' + s[b:]
rep("""    var map={}, n=0, pf=$("ataPf").value.trim(); if(pf) map.pfId=pf;""",
    """    /* 표에 없는 코드도 그대로 다시 보내요 — 서버는 보낸 것으로 통째로 바꿔서, 빠진 키는 지워져요 */
    var map={}, n=0, pf=$("ataPf").value.trim(); Object.keys(ATA.tpls||{}).forEach(function(k){ if(ATA.tpls[k]) map[k]=ATA.tpls[k]; }); if(pf) map.pfId=pf;""", False)
rep("""    var tp={}; ATA_LIST.forEach(function(x){ tp[x[0]]=map[x[0]]; });""",
    """    var tp={}; Object.keys(map).forEach(function(k){ if(k!=="pfId") tp[k]=map[k]; });""", False)
# «등록 전» (솔라피에 아직 안 낸 템플릿) — 표 상태 칩 · 보낼 방법 글
rep("""(x[3]==="통과"?"완료":(x[3]==="심사 대기"?"심사 대기":"확인 필요"))""", """(x[3]==="통과"?"완료":(x[3]==="심사 대기"||x[3]==="등록 전"?x[3]:"확인 필요"))""", False)
rep("""  if(row && row[3]==="심사 대기") return""", """  /* 코드가 없으면 서버가 문자로도 안 보내는 새 안내 (워시 서버 noticeAta smsIfNoCode=false) — 알림톡 방 시험표 «코드 없으면 문자로?» */
  var noSms=["cash_done","pay_done","bill_on","bill_fail"].indexOf(key)>=0, hasCode=!!String(code||"").trim();
  if(noSms && (!hasCode || (row && row[3]==="등록 전"))) return '<span class="pill off" title="코드를 넣기 전에는 알림톡도 문자도 나가지 않아요">안 보냄'+(row && row[3]==="등록 전"?' · 등록 전':'')+'</span>';
  if(row && row[3]==="등록 전") return '<span class="pill wait" title="솔라피에 등록하고 카카오 심사가 끝나면 알림톡으로 나가요">문자로 보냄 · 등록 전</span>';
  if(row && row[3]==="심사 대기") return""", False)
rep("«심사 대기»는 새로 심사받는 중이에요.", "«심사 대기»는 새로 심사받는 중이고, «등록 전»은 아직 솔라피에 내지 않은 템플릿이에요.", False)
rep('"코드 넣음 "+n+"개 · 비어 있음(문자로 보냄) "+(ATA_LIST.length-n)+"개"', '"코드 넣음 "+n+"개 · 비어 있음 "+(ATA_LIST.length-n)+"개 (알림톡 대신 문자로 가거나, 새 안내는 안 나가요)"', False)
# ⑥ 알림톡 방 워딩 검토 (알림톡/07_워딩_검토/관리_v4.5.md) — v4재료/wording46.py
import sys; sys.path.insert(0, os.path.join(HERE, "v4재료")); import wording46
s, k, miss = wording46.apply(s); N["말"] += k
for m in miss: print("  못 찾음:", m)
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자 · 고친 말", N["말"], "곳")
