"""워시 v126 → v127 (시험 뒤 판). 시험 ④ 발견(운영/06 I) — 알림톡 먼저 (규칙 5-6)
쓰는 법: 만들기_워시_v126 다음에
고친 것:
  업체 «설정 → 알림 → 발신번호»가 비어 있으면 화면이 서버 발송을 건너뛰고 폰 문자 앱을 열었음 → 입고 알림톡이 문자 앱으로 넘어감.
  이제 본사 알림톡(HQKEY · staff_link)이 붙은 안내는 발신번호가 없어도 서버로 먼저 보내고, 서버가 못 보냈을 때만 문자 앱을 열어요.
  업체 자기 알림톡(useAta) · 예약 발송 · 시험 문자처럼 업체 발신번호가 꼭 있어야 하는 것은 그대로.
  (서버가 발신번호 없이 본사 대체 문자를 보내려면 SMS_FROM 이 있어야 함 — 서버 방과 맞춤)
운영 v111 · 시험판 v125 · v126 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v126.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v127.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS in s and JS in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v126 · UI 3.0 · 2026-10-16";', 'var APP_VER="워시 v127 · UI 3.0 · 2026-10-17";')
# 0) 도우미: 본사 알림톡으로 보낼 수 있으면(업체 발신번호가 없어도) 알림을 보낼 수 있어요
rep('function sendReady(){var c=sendCfg();return !!c.from;}',
    'function sendReady(){var c=sendCfg();return !!c.from;}\n'
    '/* v127 — 알림 보내기: 업체 발신번호가 있거나, 본사 알림톡(HQKEY)을 쓸 수 있으면 서버로 먼저 (규칙 5-6) */\n'
    'function canNotify(){return sendReady()||!HQATA.off;}')
# 1) 보내기 공통: 본사 알림톡이 붙은 안내는 발신번호가 없어도 서버로 먼저
rep('''  return queueSend(job).then(function(o){
    if(!sendReady()){''', '''  return queueSend(job).then(function(o){
    if(!sendReady()&&!(job&&job.hq&&!HQATA.off)){''')
# 1-1) 서버가 «실패»로 답해도(예: 발신번호 없음) «보냈어요»라 하지 않고 문자 앱으로
rep('''    return sendNow(o).then(function(x){toast(x&&x.sentKind==="ATA"?"알림톡을 보냈어요":"문자를 보냈어요");return x;})''',
    '''    return sendNow(o).then(function(x){
        if(x&&x.status==="실패"){toast("자동 발송 실패 — 발송함에 남겼어요. 문자 앱으로 보내요",true);if(openFallback)openFallback();return x;}
        toast(x&&x.sentKind==="ATA"?"알림톡을 보냈어요":"문자를 보냈어요");return x;})''')
# 2) 입고 알림 자동
rep('var inAuto=!!(autoInOn()&&sendReady()&&rec.phone);', 'var inAuto=!!(autoInOn()&&canNotify()&&rec.phone);')
# 3) 출고 알림 자동 · 띠
rep('if(!sendReady())banner("자동 발송이 꺼져 있어요 — 설정 → 알림에서 발신번호를 넣어 주세요");',
    'if(!canNotify())banner("자동 발송이 꺼져 있어요 — 설정 → 알림에서 발신번호를 넣어 주세요");')
rep('var auto=(sendReady()&&c.autoOut!==false&&n.phone);', 'var auto=(canNotify()&&c.autoOut!==false&&n.phone);')
rep('return (sendReady()&&(useAta||!HQATA.off)?outCode(r):Promise.resolve("")).then(function(code){',
    'return ((useAta?sendReady():!HQATA.off)?outCode(r):Promise.resolve("")).then(function(code){')
# 4) 월 청구서 자동
rep('    if(sendReady()&&c.autoBill!==false)\n      return billCode(b).then(function(code){',
    '    if((useAta?sendReady():canNotify())&&c.autoBill!==false)\n      return billCode(b).then(function(code){')
# 5) 직원 주소 안내 · 입금 확인 · 추가 작업
rep('    if(!sendReady()){openApp();return;}', '    if(!canNotify()){openApp();return;}')
rep("    (sendReady()?'<label style=\"display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:13.5px;cursor:pointer\"><input type=\"checkbox\" id=\"dpAta\"",
    "    (canNotify()?'<label style=\"display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:13.5px;cursor:pointer\"><input type=\"checkbox\" id=\"dpAta\"")
rep("((r.phone&&sendReady())?'<button class=\"btn primary\" id=\"awAta\">", "((r.phone&&canNotify())?'<button class=\"btn primary\" id=\"awAta\">")
rep("'<button class=\"btn'+((r.phone&&sendReady())?'':' primary')+'\" id=\"awC1\">", "'<button class=\"btn'+((r.phone&&canNotify())?'':' primary')+'\" id=\"awC1\">")
# 6) 운영/06 K (대표님 시험 지적) — 기본 형식이 실제로는 «본사 알림톡 먼저». 이름 · 미리보기 · 설명을 그대로 보이게
rep("""    '<option value="sms"'+(cur==="sms"?" selected":"")+'>문자 (SMS·LMS·MMS)</option>'+
    '<option value="ata"'+(cur==="ata"?" selected":"")+(ok?"":" disabled")+'>카카오 알림톡'+
      (ok?"":" — 신청·승인 뒤에 켜져요")+'</option></select>';""",
    """    '<option value="sms"'+(cur==="sms"?" selected":"")+'>'+(HQATA.off?'문자 (SMS·LMS·MMS)':'알림톡 먼저 (안 되면 문자)')+'</option>'+
    '<option value="ata"'+(cur==="ata"?" selected":"")+(ok?"":" disabled")+'>우리 업체 카카오 채널'+
      (ok?"":" (신청·승인 뒤)")+'</option></select>';""")
rep("""  return ataReady(key)?'<span class="hint">알림톡을 고르면 승인된 문구로 나가고, 안 되면 문자로 가요.</span>'
    :'<span class="hint">알림톡은 <b>설정 → 알림</b>에서 채널ID·템플릿ID를 넣고 승인되면 고를 수 있어요.</span>';""",
    """  var hq=HQATA.off?'':'기본은 <b>차곳간 알림톡이 먼저</b> 가고, 안 되면 문자로 가요. ';
  return ataReady(key)?'<span class="hint">'+hq+'«우리 업체 카카오 채널»을 고르면 업체가 승인받은 문구로 나가요.</span>'
    :'<span class="hint">'+hq+'«우리 업체 카카오 채널»은 <b>설정 → 알림</b>에서 채널ID·템플릿ID를 넣고 승인되면 고를 수 있어요.</span>';""")
# 폰 미리보기: 제목 · 보내는 곳 · 알림톡 아래 «안 되면 이 문자»
rep('''          <div class="phone-top">문자 메시지</div>
          <div class="phone-from" id="osFrom">보내는 번호 없음</div>
          <div class="phone-msg" id="osPrev"></div>
        </div>''', '''          <div class="phone-top" id="osTop">문자 메시지</div>
          <div class="phone-from" id="osFrom">보내는 번호 없음</div>
          <div class="phone-msg" id="osPrev"></div>
        </div>
        <div class="phone-alt" id="osAlt" hidden></div>''')
rep('''          <div class="phone-top">문자 메시지</div>
          <div class="phone-from" id="bmFrom">보내는 번호 없음</div>
          <div class="phone-msg" id="bmPrev"></div>
        </div>''', '''          <div class="phone-top" id="bmTop">문자 메시지</div>
          <div class="phone-from" id="bmFrom">보내는 번호 없음</div>
          <div class="phone-msg" id="bmPrev"></div>
        </div>
        <div class="phone-alt" id="bmAlt" hidden></div>''')
rep('#smsPrev,#billPrev,#bmPrev,#of_prev{word-break:break-all;overflow-wrap:anywhere}',
    '#smsPrev,#billPrev,#bmPrev,#of_prev{word-break:break-all;overflow-wrap:anywhere}\n'
    '/* v127 — 본사 알림톡이 먼저 갈 때: 알림톡 모양 + 아래 «안 되면 이 문자» */\n'
    '.phone.kakao .phone-top{background:#3c1e1e;color:#fee500}\n'
    '.phone.kakao .phone-msg{background:#fffbe0;color:#191919}\n'
    '.phone-btn{margin:8px 12px 0;border:1px solid var(--line);border-radius:10px;text-align:center;font-size:12.5px;font-weight:700;padding:8px;background:var(--surface)}\n'
    '.phone-alt{max-width:330px;margin:10px auto 0;font-size:12px;color:var(--muted);white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;'
    'border:1px dashed var(--line);border-radius:12px;padding:8px 10px;line-height:1.5}\n'
    '.phone-alt b{display:block;color:var(--ink,inherit);margin-bottom:4px}')
rep('''function osTemp(fn){''', '''/* v127 — 폰 미리보기 모양: 본사 알림톡 먼저면 알림톡(차곳간 채널 · 확정 문구) + «안 되면 이 문자» */
function phonePrev(p,mode,smsText,ataText,btn,from){
  var box=$(p+"Prev"),ph=box&&box.parentNode,alt=$(p+"Alt"),top=$(p+"Top");
  if(!box)return;
  if(ph)ph.classList.toggle("kakao",mode!=="sms");
  if(top)top.textContent=mode==="sms"?"문자 메시지":"카카오 알림톡";
  $(p+"From").textContent=mode==="hq"?"차곳간 (본사 채널)":((from||"보내는 번호 없음")+" 에서");
  box.textContent=mode==="sms"?smsText:ataText;
  var old=ph&&ph.querySelector(".phone-btn");if(old)old.remove();
  if(mode!=="sms"&&btn&&ph){var b=document.createElement("div");b.className="phone-btn";b.textContent=btn;ph.appendChild(b);}
  if(alt){alt.hidden=(mode!=="hq");alt.textContent="";
    if(mode==="hq"){var h=document.createElement("b");h.textContent="알림톡이 안 되면 이 문자로 가요";alt.appendChild(h);alt.appendChild(document.createTextNode(smsText));}}
}
function osTemp(fn){''')
rep('''  if(fmt==="ata"&&ataReady("bill"))txt=ataFill(ataCfg().bill.text,billVars(target));
  S.cfg.billSms=saved.t;S.cfg.billShort=saved.sh;S.cfg.billSendMode=saved.m;
  $("bmPrev").textContent=txt;''', '''  var bMode=(fmt==="ata"&&ataReady("bill"))?"ata":(HQATA.off?"sms":"hq");
  var aTxt=bMode==="ata"?ataFill(ataCfg().bill.text,billVars(target)):ataFill(DEF_ATA_BILL,billVars(target));
  S.cfg.billSms=saved.t;S.cfg.billShort=saved.sh;S.cfg.billSendMode=saved.m;
  phonePrev("bm",bMode,txt,aTxt,"청구 내역 보기",S.cfg&&S.cfg.send&&S.cfg.send.from);
  if(bMode==="ata")txt=aTxt;''')
rep('''  $("bmKind").textContent=(fmt==="ata")?"알림톡":(plan.photo?"사진 문자":(lms?"긴 문자":"짧은 문자"));
  $("bmPhoto").textContent=(fmt!=="ata"&&plan.photo)?"청구서 그림 붙임":"안 붙임";''',
    '''  $("bmKind").textContent=(fmt==="ata")?"알림톡":((bMode==="hq"?"알림톡 · 안 되면 ":"")+(plan.photo?"사진 문자":(lms?"긴 문자":"짧은 문자")));
  $("bmPhoto").textContent=(fmt!=="ata"&&plan.photo)?(bMode==="hq"?"문자일 때 청구서 그림":"청구서 그림 붙임"):"안 붙임";''')
rep('''  $("bmModeHint").textContent=(fmt!=="ata"&&plan.photo)''',
    '''  $("bmModeHint").textContent=(bMode==="hq"?"보내는 방식(사진 + 글자 · 글자만(장문) · 간단히)은 알림톡이 안 될 때 가는 문자 모양이에요. ":"")+((fmt!=="ata"&&plan.photo)''')
rep('''    : ((plan.mode==="short"&&lms)?"간단 문구가 45자를 넘어 장문으로 나가요 — 더 줄이면 단문 요금이 돼요.":"");
  $("bmWho")''', '''    : ((plan.mode==="short"&&lms)?"간단 문구가 45자를 넘어 장문으로 나가요 — 더 줄이면 단문 요금이 돼요.":""));
  $("bmWho")''')
rep('''  if(fmt==="ata"&&ataReady("out"))txt=ataFill(ataCfg().out.text,outVars(demo));
  $("osPrev").textContent=txt;''', '''  var oMode=(fmt==="ata"&&ataReady("out"))?"ata":(HQATA.off?"sms":"hq");
  var aTxt=oMode==="ata"?ataFill(ataCfg().out.text,outVars(demo)):ataFill(DEF_ATA_OUT,outVars(demo));
  phonePrev("os",oMode,txt,aTxt,"도착 사진 보기",(S.cfg&&S.cfg.send&&S.cfg.send.from));
  if(oMode==="ata")txt=aTxt;''')
rep('''  $("osKind").textContent=(fmt==="ata")?"알림톡":(p.imageId?"사진 문자":(n>45?"긴 문자":"짧은 문자"));
  $("osPhoto").textContent=(fmt!=="ata"&&p.imageId)?"붙임":"안 붙임";''',
    '''  $("osKind").textContent=(fmt==="ata")?"알림톡":((oMode==="hq"?"알림톡 · 안 되면 ":"")+(p.imageId?"사진 문자":(n>45?"긴 문자":"짧은 문자")));
  $("osPhoto").textContent=(fmt!=="ata"&&p.imageId)?(oMode==="hq"?"문자일 때 붙임":"붙임"):"안 붙임";
  var hn=$("osHqNote");if(!hn&&$("osFmtHint")){hn=document.createElement("div");hn.id="osHqNote";hn.className="hint";hn.style.marginTop="4px";$("osFmtHint").after(hn);}
  if(hn)hn.textContent=oMode==="hq"?"보내는 방식(사진 + 글자 · 글자만(장문) · 간단히)은 알림톡이 안 될 때 가는 문자 모양이에요.":"";''')
rep('''      "\\n보내는 형식: "+(fmtOf("out")==="ata"?"카카오 알림톡":"문자"),function(){''',
    '''      "\\n보내는 형식: "+(fmtOf("out")==="ata"?"우리 업체 카카오 채널":(HQATA.off?"문자":"알림톡 먼저 (안 되면 문자)")),function(){''')
rep('''  "<li><b>보내는 형식</b>: <b>문자</b> 또는 <b>카카오 알림톡</b>. 알림톡은 설정 → 알림에서 채널ID·템플릿ID를 넣고 승인이 나야 고를 수 있고, 승인 전에는 회색으로 잠겨 있어요. 알림톡이 실패하면 문자로 자동 대체돼요.</li>"+''',
    '''  "<li><b>보내는 형식</b>: 기본은 <b>알림톡 먼저 (안 되면 문자)</b> — 차곳간 채널로 알림톡이 먼저 가고, 안 되면 위 문구가 문자로 가요. <b>우리 업체 카카오 채널</b>은 설정 → 알림에서 채널ID·템플릿ID를 넣고 승인이 나야 고를 수 있어요(승인 전에는 회색).</li>"+''')
rep('''  "<li><b>보내는 형식</b>: 문자 또는 카카오 알림톡(승인 뒤 선택 가능).</li>"+''',
    '''  "<li><b>보내는 형식</b>: 기본은 <b>알림톡 먼저 (안 되면 문자)</b>. 보내는 방식 4가지는 알림톡이 안 될 때 가는 문자 모양이에요. <b>우리 업체 카카오 채널</b>은 승인 뒤 고를 수 있어요.</li>"+''')
rep('''  $("bmCost").textContent=(fmt==="ata")?"약 8원":(plan.photo?"약 100원":(lms?"약 50원":"약 20원"));''',
    '''  $("bmCost").textContent=(fmt==="ata")?"약 8원":((bMode==="hq"?"알림톡 약 8원 · 문자면 ":"")+(plan.photo?"약 100원":(lms?"약 50원":"약 20원")));''')
# 7) 운영/06 L (서버 sb17) — 청구서 줄마다 그 일감 번호(id)를 함께: 딜러앱 · 청구서 보기가 입금 상태를 그때그때
rep('''      return {plate:r.plate||"",model:r.model||"",dealer:r.dealer||"",company:r.company||"",
        inAt:r.createdAt||"",outAt:r.outAt||"",''', '''      return {id:String(r.id||""),plate:r.plate||"",model:r.model||"",dealer:r.dealer||"",company:r.company||"",
        inAt:r.createdAt||"",outAt:r.outAt||"",''')
assert CSS in s and JS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
