"""워시 v117 → 워시 v118 새 판. 입고 알림톡 (서버 sb7 의 intake 키 · 확정본 「차곳간_입고안내」).
쓰는 법: 만들기_워시_v112 → … → v117 → v118 차례로 (`워시/도구/`)
바꾸는 것 (총괄 요청 2026-10-15):
  - 설정 → 알림 에 「입고하면 딜러에게 알림톡 보내기」 켜고 끄기 칸 (기본 꺼짐 · 업체 설정 send.autoIn)
  - 켜 두면 입고 등록이 끝난 뒤 딜러 번호로 입고안내 알림톡을 보냄 (번호가 없으면 안 보냄)
  - 입고 완료 창에 「딜러에게 입고 알림톡 보내기」 단추 — 한 건씩 보내기 (켜짐이면 «다시 보내기»)
  - 본사 알림톡이 안 되면 확정본 대체 문구로 문자 (v117 sendNow 그대로)
  - 업체명 · 업체전화는 서버가 채움. 보기코드 · rec 는 필요 없음
운영 v111 · 새 판 v112~v117 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v117.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v118.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v117 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v118 · UI 3.0 · 2026-10-15";')

# 키 · 확정본 변수
rep('''var HQKEY={out:"release",add:"extra_work",bill:"bill",deposit:"deposit_ok"};''',
    '''var HQKEY={out:"release",add:"extra_work",bill:"bill",deposit:"deposit_ok",intake:"intake"};''')
rep('''var SENDCFG_KEYS=["url","token","from","mode","tplOut","tplBill","autoOut","autoBill"];''',
    '''var SENDCFG_KEYS=["url","token","from","mode","tplOut","tplBill","autoOut","autoBill","autoIn"];''')

# 입고 알림 보내기 (sendOutMsg 바로 앞)
rep('''function sendOutMsg(r,type,openFallback){''', '''/* ===== 입고 알림톡 (v118 · 서버 sb7 intake · 확정본 «차곳간_입고안내») =====
   업체명 · 업체전화는 서버가 채웁니다. 본사 알림톡이 안 되면 확정본 대체 문구로 문자. */
function autoInOn(){return sendCfg().autoIn===true;}
function inVars(r){
  return {"딜러명":r.dealer||"","상사명":r.company||"","업체명":shopLabel(),"차량번호":r.plate||"",
    "작업내용":workFull(r),"입고일시":dtKo(r.createdAt||nowIso()),"업체전화":shopTel()};
}
function inText(r){
  var t=shopTel();
  return "[차곳간] "+(r.plate||"")+" 입고되었습니다.\\n"+shopLabel()+(t?" 문의 "+t:"");
}
function sendInMsg(r,type,openFallback){
  var hq=HQATA.off?null:{key:HQKEY.intake,vars:hqVars(inVars(r))};
  return sendOrOpen({type:type||"입고 알림",to:r.phone,text:inText(r),kind:"AUTO",hq:hq,ref:r.id},openFallback);
}
function sendOutMsg(r,type,openFallback){''')

# 입고 등록 뒤: 켜져 있으면 자동으로 · 완료 창에 한 건 보내기 단추
rep('''    resetForm();renderAll();
    if(mode==="body")bodySheet(rec,function(){renderAll();});
    else savedSheet(rec);''', '''    resetForm();renderAll();
    var inAuto=!!(autoInOn()&&sendReady()&&rec.phone);
    var inP=inAuto?sendInMsg(rec,"입고 알림",null):null;
    if(mode==="body")bodySheet(rec,function(){renderAll();});
    else savedSheet(rec,inP);''')
rep('''function savedSheet(rec){''', '''function savedSheet(rec,inP){''')
rep('''    '<div class="kv"><span>합계</span><b style="color:var(--brand);font-size:19px">'+won(rec.total)+'</b></div>'+
   '</div>'+
   '<div class="sheetbtns">'+
     '<button class="btn primary" id="okNext" style="flex:2">다음 차 올리기</button>'+''',
    '''    '<div class="kv"><span>합계</span><b style="color:var(--brand);font-size:19px">'+won(rec.total)+'</b></div>'+
   '</div>'+
   (rec.phone
     ? '<div class="tools" style="margin-top:10px;align-items:center">'+
         '<button class="btn" id="okInMsg" type="button">'+(inP?"입고 알림톡 다시 보내기":"딜러에게 입고 알림톡 보내기")+'</button>'+
         '<span class="hint" id="okInHint">'+(inP?"딜러에게 입고 안내를 보내는 중…":"딜러 번호 "+esc(rec.phone))+'</span></div>'
     : '<div class="hint" style="margin-top:10px">딜러 번호가 없어 입고 알림톡은 보내지 않았어요</div>')+
   '<div class="sheetbtns">'+
     '<button class="btn primary" id="okNext" style="flex:2">다음 차 올리기</button>'+''')
rep('''  $("okNext").onclick=function(){closeSheet();$("fPlate").focus();};''',
    '''  $("okNext").onclick=function(){closeSheet();$("fPlate").focus();};
  function inDone(o){
    if($("okInHint"))$("okInHint").textContent=(o&&o.status==="보냄")?(o.sentKind==="ATA"?"입고 알림톡을 보냈어요":"입고 문자를 보냈어요"):"발송함에 남겼어요";
  }
  if(inP)inP.then(inDone,function(){inDone(null);});
  if($("okInMsg"))$("okInMsg").onclick=function(){
    var b=this;b.disabled=true;
    var ios=/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    sendInMsg(rec,inP?"입고 알림(재발송)":"입고 알림",function(){
      location.href="sms:"+digits(rec.phone)+(ios?"&":"?")+"body="+encodeURIComponent(inText(rec));
    }).then(inDone).then(function(){b.disabled=false;},function(){b.disabled=false;});
  };''')

# 설정 → 알림: 켜고 끄기 칸 (기본 꺼짐)
rep('''     '<label class="chip"><input type="checkbox" id="sc_autoBill" style="width:18px;height:18px;vertical-align:-3px"'+(c.autoBill!==false?" checked":"")+'> 청구서도 자동 발송</label>'+
   '</div>'+''', '''     '<label class="chip"><input type="checkbox" id="sc_autoBill" style="width:18px;height:18px;vertical-align:-3px"'+(c.autoBill!==false?" checked":"")+'> 청구서도 자동 발송</label>'+
     '<label class="chip"><input type="checkbox" id="sc_autoIn" style="width:18px;height:18px;vertical-align:-3px"'+(c.autoIn===true?" checked":"")+'> 입고하면 딜러에게 알림톡 보내기</label>'+
   '</div>'+
   '<div class="hint" style="margin-top:6px">입고 알림톡은 처음에 꺼져 있어요. 켜면 입고 등록이 끝날 때 딜러 번호로 «차량 입고 안내»가 나가요 (알림톡이 안 되면 문자). 끈 채로도 입고 완료 창에서 한 건씩 보낼 수 있어요.</div>'+''')
rep('''      autoOut:$("sc_autoOut").checked,autoBill:$("sc_autoBill").checked});''',
    '''      autoOut:$("sc_autoOut").checked,autoBill:$("sc_autoBill").checked,autoIn:$("sc_autoIn").checked});''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
