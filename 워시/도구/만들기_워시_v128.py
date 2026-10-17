"""워시 v127 → v128 (시험 뒤 판). 대표님 결정 10/18 — «2. 청구서 보내기» 시안 A안 + 고른 곳 합계
쓰는 법: 만들기_워시_v127 다음에
고친 것:
  1) 차례: ① 받는 곳 확인 → ② 입금 계좌 · 기한 → ③ 보내기
  2) 아래에 늘 붙은 보내기 줄: «고른 곳 N곳 · 합계 N원» + 내 번호로 시험 · 예약 발송 · «③ N곳에 청구서 보내기»(크게)
     고를 때마다 바로 바뀜 · 폰에서는 아래 탭 위에 붙음 · 보내기 확인 창에도 같은 합계
  3) 문구 · 단문 · 보내는 방식 · 형식은 «문구 · 보내는 방식 바꾸기» 접힘 안으로 · 미리보기는 폰에서 접힘
  보내는 값 · 서버 창구 · 손님에게 가는 글은 그대로.
운영 v111 · 시험판 v125 · v126 · v127 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v127.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v128.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS in s and JS in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v127 · UI 3.0 · 2026-10-17";', 'var APP_VER="워시 v128 · UI 3.0 · 2026-10-18";')

# 1) 화면 틀 — id 는 모두 그대로 두고 자리만 옮겨요
a = s.index('  <div class="card" style="margin-top:16px">\n    <h2>2. 청구서 보내기</h2>')
b = s.index('</section>', a)
OLD = s[a:b]
for k in ['id="bmReset"','id="bmSave"','id="bmBank"','id="bmDue"','id="bmText"','id="bmTokens"','id="bmShort"','id="bmMode"',
          'id="bmFmtWrap"','id="bmFmtHint"','id="bmModeHint"','id="bmTop"','id="bmFrom"','id="bmPrev"','id="bmAlt"','id="bmLen"',
          'id="bmKind"','id="bmPhoto"','id="bmCost"','id="bmTest"','id="bmResv"','id="bmSend"','id="bmWho"']:
    assert OLD.count(k) == 1, k
NEW = '''  <div class="card bm-card" style="margin-top:16px" id="bmCard">
    <h2>2. 청구서 보내기</h2>
    <div class="dash">
      <div>
        <div class="bm-step"><span class="bm-n">1</span><div class="bm-c">
          <b>받는 곳 확인</b>
          <div class="hint">위 표에서 체크한 곳에 보내요. 하나도 체크하지 않으면 목록 전체에 보내요.</div>
          <div class="bm-to" id="bmTo"></div>
        </div></div>
        <div class="bm-step"><span class="bm-n">2</span><div class="bm-c">
          <b>입금 계좌 · 기한</b>
          <label class="f" style="margin-top:8px">입금 계좌 (청구서와 알림에 찍혀요)</label>
          <input type="text" id="bmBank" placeholder="예) 신한 110-000-000000 (상호)" style="margin-bottom:10px">
          <label class="f">입금 기한 (알림톡 청구서에 찍혀요 · 비우면 «업체에 문의»)</label>
          <input type="text" id="bmDue" placeholder="예) 매월 10일" maxlength="30">
          <div class="tools" style="margin:10px 0 0">
            <button class="btn primary" id="bmSave">문구·계좌·기한 저장</button>
          </div>
        </div></div>
        <details class="bm-fold" id="bmFold">
          <summary>문구 · 보내는 방식 바꾸기</summary>
          <div class="tools" style="margin:10px 0">
            <button class="btn" id="bmReset">처음 문구로</button>
            <span class="hint">업체 이름은 설정 → 우리 사업장의 상호가 들어가요</span>
          </div>
          <label class="f">알림톡이 안 될 때 가는 문자 문구</label>
          <textarea id="bmText" style="min-height:200px"></textarea>
          <div class="f" style="margin:12px 0 6px">넣을 수 있는 값 — 누르면 커서 자리에 들어가요</div>
          <div class="chips" id="bmTokens"></div>
          <label class="f" style="margin-top:12px">간단히 보낼 때 문구 (단문 · 요금 쌈)</label>
          <textarea id="bmShort" style="min-height:70px"></textarea>
          <div class="hint" style="margin-top:4px">넣을 수 있는 값: {업체} {받는분} {기간} {대수} {금액} {계좌}</div>
          <div class="row2" style="margin-top:12px">
            <div><label class="f">보내는 방식</label><select id="bmMode"></select></div>
            <div><label class="f">보내는 형식</label><span id="bmFmtWrap"></span></div>
          </div>
          <div class="hint" id="bmFmtHint" style="margin-top:6px"></div>
          <div class="hint" id="bmModeHint" style="margin-top:4px"></div>
        </details>
      </div>
      <details class="bm-pv" id="bmPvFold" open>
        <summary>미리보기</summary>
        <div class="phone">
          <div class="phone-top" id="bmTop">문자 메시지</div>
          <div class="phone-from" id="bmFrom">보내는 번호 없음</div>
          <div class="phone-msg" id="bmPrev"></div>
        </div>
        <div class="phone-alt" id="bmAlt" hidden></div>
        <div class="legend" style="justify-content:center;margin-top:10px">
          <span>글자 수 <b id="bmLen">0자</b></span>
          <span>종류 <b id="bmKind">SMS</b></span>
          <span>사진 <b id="bmPhoto">안 붙임</b></span>
          <span>한 통 <b id="bmCost">약 20원</b></span>
        </div>
        <div class="hint center" id="bmWho" style="margin-top:8px"></div>
      </details>
    </div>
    <div class="bm-go" id="bmGo">
      <div class="bm-sum"><span id="bmSelCnt">고른 곳 0곳</span><span class="bm-dot"> · </span><b id="bmSelSum">합계 0원</b>
        <small id="bmSelSkip"></small></div>
      <div class="bm-acts">
        <button class="btn" id="bmTest">내 번호로 시험</button>
        <button class="btn" id="bmResv">예약 발송</button>
        <button class="btn primary bm-big" id="bmSend">③ 청구서 보내기</button>
      </div>
    </div>
  </div>
'''
s = s[:a] + NEW + s[b:]

# 2) CSS (워시 완성 CSS 끝에)
BM_CSS = """
/* ── v128 청구서 보내기 A안 (대표님 결정 10/18) ── */
.bm-card .bm-step{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)}
.bm-card .bm-step:first-child{padding-top:0}
.bm-card .bm-n{width:26px;height:26px;border-radius:50%;background:var(--blue,#1668C4);color:#fff;font-weight:800;font-size:13px;display:grid;place-items:center;flex:none}
.bm-card .bm-c{flex:1;min-width:0}
.bm-card .bm-c > b{font-size:14.5px}
.bm-to{display:flex;flex-direction:column;gap:3px;margin-top:8px;font-size:13.5px}
.bm-to .r{display:flex;justify-content:space-between;gap:10px;font-variant-numeric:tabular-nums}
.bm-to .r span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bm-to .more,.bm-to .skip{color:var(--muted);font-size:12.5px}
.bm-to .skip{color:var(--warn,#B26B00)}
.bm-fold,.bm-pv{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:12px}
.bm-pv{margin-top:0}
.bm-fold > summary,.bm-pv > summary{cursor:pointer;font-weight:700;font-size:14px;list-style-position:inside}
.bm-pv[open] > summary{margin-bottom:10px}
.bm-go{position:sticky;bottom:0;z-index:6;margin-top:16px;background:var(--surface);border:1px solid var(--line);border-top:2px solid var(--blue,#1668C4);
  border-radius:12px;padding:10px 12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;
  box-shadow:0 -8px 18px -12px rgba(11,37,69,.35)}
.bm-sum{font-size:14.5px;font-variant-numeric:tabular-nums;min-width:0}
.bm-sum b{font-size:17px}
.bm-sum small{display:block;color:var(--muted);font-size:12px}
.bm-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.bm-acts .bm-big{min-height:46px;font-size:15.5px;font-weight:800;padding:0 20px}
.bm-acts .bm-big:not(:disabled){background:var(--blue,#1668C4);border-color:var(--blue,#1668C4);color:#fff}
.bm-acts .bm-big:disabled{opacity:.5;cursor:not-allowed}
@media (max-width:600px){
  .bm-go{bottom:calc(56px + env(safe-area-inset-bottom,0px));padding:10px}
  .bm-acts{width:100%}
  .bm-acts .bm-big{flex:1 1 100%;order:-1}
  .bm-acts .btn:not(.bm-big){flex:1;min-height:36px;padding:0 8px;font-size:13px}
}
"""
a2 = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b2 = s.index('</style>', a2)
s = s[:b2] + BM_CSS + s[b2:]

# 3) 받는 곳 · 합계 — 고를 때마다 (renderBillPreview 가 표 고르기마다 불려요)
rep('''function renderBillPreview(){''', '''/* v128 — 받는 곳 · 고른 곳 합계 (보내기와 같은 셈: 금액 있고 번호 있는 곳) */
function billTargets(){
  var list=B.made||[], ids=Object.keys(B.sel||{});
  var pick=list.filter(function(b){return !ids.length||B.sel[b.name];});
  var go=pick.filter(function(b){return b.amount>0&&b.phone;});
  return {all:!ids.length,pick:pick,go:go,skip:pick.length-go.length,sum:go.reduce(function(t,b){return t+(b.amount||0);},0)};
}
function bmGoUpdate(){
  if(!$("bmGo"))return;
  var t=billTargets(), n=t.go.length;
  $("bmSelCnt").textContent=(t.all?"전체 ":"고른 곳 ")+n+"곳";
  $("bmSelSum").textContent="합계 "+wonExact(t.sum);
  $("bmSelSkip").textContent=t.skip?("번호 없음 · 0원 "+t.skip+"곳은 빠져요"):"";
  $("bmSend").textContent=n?("③ "+n+"곳에 청구서 보내기"):"③ 청구서 보내기";
  $("bmSend").disabled=!n;
  var box=$("bmTo");box.textContent="";
  if(!(B.made||[]).length){box.appendChild(Object.assign(document.createElement("div"),{className:"more",textContent:"먼저 위에서 «청구서 만들기»를 눌러 주세요."}));return;}
  t.go.slice(0,5).forEach(function(b){
    var r=document.createElement("div");r.className="r";
    var a=document.createElement("span");a.textContent=b.name+" · "+b.cars+"대";
    var m=document.createElement("span");m.textContent=wonExact(b.amount);
    r.appendChild(a);r.appendChild(m);box.appendChild(r);});
  if(n>5)box.appendChild(Object.assign(document.createElement("div"),{className:"more",textContent:"외 "+(n-5)+"곳"}));
  if(t.skip)box.appendChild(Object.assign(document.createElement("div"),{className:"skip",textContent:"번호가 없거나 0원인 "+t.skip+"곳은 보내지 않아요"}));
}
function renderBillPreview(){
  bmGoUpdate();''')
# 폰에서는 미리보기를 접어 둬요 (처음 한 번)
rep('''  $("bmFmtHint").innerHTML=fmtHintHtml("bill");
  renderBillPreview();''', '''  $("bmFmtHint").innerHTML=fmtHintHtml("bill");
  if(!B.pvInit){B.pvInit=1;try{if(window.matchMedia&&matchMedia("(max-width:600px)").matches)$("bmPvFold").open=false;}catch(e){}}
  renderBillPreview();''')
# 4) 보내기 확인 창: 같은 합계 글
rep('''  ask(periodLabel(B.month)+"\\n"+targets.length+"건에 청구 알림을 보내요. (알림톡이 안 되면 문자로 가요)\\n합계 "+
      won(targets.reduce(function(s,b){return s+b.amount;},0))+''',
    '''  var tt=billTargets();
  ask(periodLabel(B.month)+"\\n"+(tt.all?"전체 ":"고른 곳 ")+targets.length+"곳 · 합계 "+wonExact(tt.sum)+"\\n청구 알림을 보내요. (알림톡이 안 되면 문자로 가요)"+
      (tt.skip?("\\n번호 없음 · 0원 "+tt.skip+"곳은 빠져요."):"")+''')
# 5) 도움말
rep('''  "<li><b>알림 보내기</b>: 아래 '청구서 발송' 칸에서 문구·입금 계좌를 고치면 오른쪽 폰 모양에 바로 보여요. [내 번호로 시험] → [선택항목 보내기]. 체크를 안 하면 목록 전체.</li>"+''',
    '''  "<li><b>청구서 보내기</b>: 아래 «2. 청구서 보내기»에서 ① 받는 곳 확인 → ② 입금 계좌 · 기한 → ③ 맨 아래 큰 단추 [N곳에 청구서 보내기]. 단추 옆에 고른 곳 수와 합계가 바로 보여요. 체크를 안 하면 목록 전체. 문구는 «문구 · 보내는 방식 바꾸기»를 열어 고쳐요.</li>"+''')
assert CSS in s and JS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
