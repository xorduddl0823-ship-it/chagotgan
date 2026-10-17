"""딜러앱 화면 d3.8 → d3.9 (청구서 «입금 확인»이 늦게 보이던 것 · 운영/06 L). 바탕 파일은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.9.py   (바탕: 딜러/3_딜러앱_화면_d3.8 — 보안 통과 3aab9c2)
결과: 딜러/3_딜러앱_화면_d3.9/   ※ 서버 방 L 고침(myBills 가 부를 때마다 입금 상태 계산)과 함께 시험 뒤 묶음으로.
근거: 2026-10-17 대표님 시험 — 워시에서 «수금 완료»로 바꿔도 딜러앱 청구서가 «입금 전» 그대로
  원인 ① 서버: myBills 가 보낼 때 찍은 값만 봄 (서버 방이 고침)
  원인 ② 화면: 청구서를 로그인할 때 한 번만 불러옴 (이 판이 고침)
바꾸는 것 (화면만 — 서버 창구 · 응답 모양은 그대로, 새 칸 paidAt 은 있으면 씀)
  1. «청구서» 탭을 열 때 다시 불러옴 (5초 안에 또 누르면 건너뜀)
  2. 앱으로 다시 돌아오면(화면이 다시 보이면) 30초가 지났을 때 다시 불러옴
  3. 받은 청구서가 전과 같으면 화면을 다시 그리지 않음 (고른 줄 · 열린 창 그대로)
  4. 서버가 paidAt(입금 확인한 날)을 주면 «입금 확인 · 10/17» 로 보여 줌 (없으면 지금처럼 «입금 확인»)
  5. 로그아웃 때 불러온 시각 · 표시도 비움
공통 부품: cgg-j4 1.5 동결 그대로."""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.8"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.9"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

rep("<!-- 차곳간 딜러앱 화면 · 판 d3.8 (2026-10-17, ", "<!-- 차곳간 딜러앱 화면 · 판 d3.9 (2026-10-17, 청구서 다시 불러오기 · 바탕 d3.8 · ")
rep('var VER="d3.8";', 'var VER="d3.9";')

# 1~3) 청구서 다시 불러오기
rep('''function loadBills(){return api("myBills").then(function(r){S.bills=(r&&r.list)||[];S.billsReady=!!(r&&r.ready);render();},function(){S.bills=[];S.billsReady=false;render();});}''',
    '''function loadBills(){S.billsAt=Date.now();return api("myBills").then(function(r){var L=(r&&r.list)||[],rd=!!(r&&r.ready),sig=JSON.stringify([rd,L]);
  if(sig===S.billsSig&&S.bills)return;S.billsSig=sig;S.bills=L;S.billsReady=rd;render();},function(){if(S.bills)return;S.bills=[];S.billsReady=false;render();});}
/* d3.9 — 청구서는 탭을 열 때 · 앱으로 돌아올 때 다시 불러옴 (gap 밀리초 안에 또 부르면 건너뜀) */
function freshBills(gap){if(!S.key||!S.agreed||S.view==="login"||S.view==="agree")return;if(Date.now()-(S.billsAt||0)<gap)return;loadBills();}
try{document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")freshBills(30000);});}catch(e){}''')
rep('''  if(a==="tab"){if(S.view==="car"){S.skipPop=1;history.back();}S.tab=v;S.view="main";render();
    if(v==="noti"){setTimeout(function(){markSeen();},1500);}''',
    '''  if(a==="tab"){if(S.view==="car"){S.skipPop=1;history.back();}S.tab=v;S.view="main";render();
    if(v==="noti"){setTimeout(function(){markSeen();},1500);}
    if(v==="bills"||v==="home")freshBills(5000);''')
# 4) paidAt
rep('''function dueTxt(b){if(isPaid(b))return "입금 확인";''',
    '''function paidDay(v){var d=new Date(String(v||""));return isNaN(d)?"":(d.getMonth()+1)+"/"+d.getDate();}  /* d3.9 — 입금 확인한 날 (기기 시각대로) */
function dueTxt(b){if(isPaid(b))return "입금 확인"+(paidDay(b.paidAt)?" · "+paidDay(b.paidAt):"");''')
# 5) 로그아웃
rep('''S.bills=null;S.billsReady=false;S.name="";''', '''S.bills=null;S.billsReady=false;S.billsAt=0;S.billsSig="";S.name="";''')

if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
