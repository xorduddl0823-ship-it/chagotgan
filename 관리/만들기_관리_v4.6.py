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
rep('throw new Error("서버에 연결하지 못했습니다 (인터넷 확인)");', 'throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요");')
rep('throw new Error("서버 응답을 읽지 못했습니다");', 'throw new Error("서버 응답을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요");')
rep('Promise.reject(new Error("로그인이 필요합니다"))', 'Promise.reject(new Error("로그인이 필요합니다. 다시 로그인해 주세요"))')
def fix(m):
    N["말"] += 1
    return 'e.message||"%s못했습니다. 다시 시도해 주세요"' % m.group(1)
s = re.sub(r'e\.message\|\|"([가-힣 ]*?)못했습니다"', fix, s)
s = re.sub(r'(\.err=e\.message\|\|")([가-힣 ]*?)못했습니다"', lambda m: (N.__setitem__("말", N["말"]+1) or "") + m.group(1)+m.group(2)+'못했습니다. 다시 시도해 주세요"', s)
rep("""'<h3>'+(ok?'계산서를 보냈어요':'계산서를 보내지 못했습니다')+'</h3>'+""", """'<h3>'+(ok?'계산서를 보냈어요':'계산서를 보내지 못했습니다. 아래 이유를 확인하고 다시 보내 주세요')+'</h3>'+""")

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
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자 · 고친 말", N["말"], "곳")
