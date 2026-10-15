"""워시 v115 → 워시 v116 새 판. 안내를 «알림톡 먼저, 안 되면 문자» (규칙 5-6 · 서버/설계/10_알림톡_전환.md · 서버 짝 sb5).
쓰는 법: 만들기_워시_v112 → v113 → v114 → v115 → v116 차례로 (`워시/도구/`)
바꾸는 것:
  - 출고안내 · 청구서 · 추가작업을 보낼 때, 업체가 자기 알림톡을 켜 두지 않았으면
    sendMsg 에 kind:"ATA", ataKey:"out"|"bill"|"add", variables(확정본 원문 변수 이름 그대로), text(문자로 대신 보낼 글), disableSms:false
  - 본사 템플릿 코드가 아직 비어 있거나 옛 서버(sb4 까지)라 «템플릿 ID가 없습니다» 가 오면 → 그 자리에서 v115 와 똑같이 문자로 다시 보냄
    (한 번 그러면 이 화면을 닫을 때까지는 바로 문자로 — 두 번 묻지 않음)
  - 추가작업 «딜러에게 보내기»: 휴대폰 문자 앱만 열던 것 → «알림톡으로 보내기»(앞) + «문자 앱으로 직접»(뒤)
  - 보낸 뒤 알림 글: 알림톡이면 «알림톡을 보냈어요», 문자면 «문자를 보냈어요»
  - 직원 «주소 안내»는 새 템플릿 심사 뒤에 (지금은 그대로) · 도매상 «자재 주문»은 휴대폰 문자 앱 그대로 (총괄 결정 2026-10-15)
운영 v111 · 새 판 v112~v115 는 덮어쓰지 않는다. 서버 주소 · 저장 방식 · 로그인은 그대로.
"""
import os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v115.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v116.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v115 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v116 · UI 3.0 · 2026-10-15";')

# ── 본사 알림톡 (sb5) — 변수 이름은 알림톡/00_확정본_13개_원문.md 그대로 ──
rep('''var KIND_NAME={AUTO:"자동",SMS:"단문",LMS:"장문",MMS:"사진 문자",ATA:"알림톡"};''',
'''var KIND_NAME={AUTO:"자동",SMS:"단문",LMS:"장문",MMS:"사진 문자",ATA:"알림톡"};
/* ===== 본사 알림톡 먼저 (v116 · 규칙 5-6 · 서버 sb5 ataKey) =====
   업체가 자기 알림톡을 켜 두지 않았을 때 본사 채널 템플릿(출고안내 · 청구서 · 추가작업)으로 보냅니다.
   본사 코드가 아직 없거나 옛 서버면 «템플릿 ID가 없습니다» → 그 자리에서 예전처럼 문자로 다시 보냅니다. */
var HQATA={off:false};
function hqVars(o){var v={};Object.keys(o).forEach(function(k){var x=o[k];v["#{"+k+"}"]=(x==null||x==="")?"-":String(x);});return v;}
function shopTel(){return phoneLine()||((S.cfg&&S.cfg.send&&S.cfg.send.from)||"");}
function viewCode(url){var m=String(url||"").match(/[?&]c=([^&#]+)/);return m?decodeURIComponent(m[1]):"";}
function dtKo(iso){if(!iso)return "";var d=new Date(iso);if(isNaN(d))return String(iso);
  return (d.getMonth()+1)+"월 "+d.getDate()+"일 "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
/* 출고안내 변수 — 보기코드(도착 사진 보기 단추)를 서버에서 받아 옵니다 */
function hqOut(r){
  if(HQATA.off)return Promise.resolve(null);
  return gsCall("viewLink",[r.id]).then(function(t){
    var j=typeof t==="string"?JSON.parse(t):t, code=viewCode(j&&j.url);
    if(!code)return null;
    var dest=r.dest||r.company||"";
    return {key:"out",vars:hqVars({"딜러명":r.dealer||"","상사명":r.company||"","차량번호":r.plate||"","작업내용":workFull(r),
      "목적지":dest,"출고일시":dtKo(r.outAt||nowIso()),"업체전화":shopTel(),"업체명":shopLabel(),"보기코드":code})};
  }).catch(function(){return null;});
}
/* 청구서 변수 — 청구 내역 보기 단추 주소를 서버에서 받아 옵니다 */
function hqBill(b){
  if(HQATA.off)return Promise.resolve(null);
  return gsCall("viewBill",[JSON.stringify(billPayload(b))]).then(function(t){
    var j=typeof t==="string"?JSON.parse(t):t, code=viewCode(j&&j.url);
    if(!code)return null;
    return {key:"bill",vars:hqVars({"기간":periodLabel(b.month),"받는곳":b.name,"업체명":shopLabel(),"건수":b.cars,
      "금액":comma(b.amount||0),"입금기한":(S.cfg&&S.cfg.billDueText)||"-","계좌":(S.cfg&&S.cfg.bank)||"","업체전화":shopTel(),"보기코드":code})};
  }).catch(function(){return null;});
}
function hqAdd(r,w,url){
  if(HQATA.off)return null;
  var code=viewCode(url); if(!code)return null;
  return {key:"add",vars:hqVars({"차량번호":r.plate||"","업체명":shopLabel(),"작업내용":w.text||"",
    "금액":comma(w.amount||0),"업체전화":shopTel(),"보기코드":code})};
}''')

# sendNow — hq 알림톡 몸통 + «템플릿 없음»이면 그 자리에서 문자로 다시
rep('''    if(plan){body.kind="ATA";body.templateId=plan.tpl;body.pfId=plan.pfId;
      body.variables=plan.vars;body.text=plan.text;body.disableSms=!plan.fallback;}
    o.sentKind=body.kind;
    return GS.send(body);
  }).then(function(res){''',
'''    if(plan){body.kind="ATA";body.templateId=plan.tpl;body.pfId=plan.pfId;
      body.variables=plan.vars;body.text=plan.text;body.disableSms=!plan.fallback;}
    else if(o.hq&&!HQATA.off){body.kind="ATA";body.ataKey=o.hq.key;body.variables=o.hq.vars;body.imageB64="";body.disableSms=false;}
    o.sentKind=body.kind;
    return GS.send(body).then(function(res){
      /* 본사 템플릿이 아직 없거나 옛 서버 → 예전처럼 문자로 (이 화면에서는 다시 묻지 않음) */
      if(body.ataKey&&!(res&&res.ok)&&/템플릿 ID|채널 ID|pfId/.test(String((res&&(res.error||res.message))||""))){
        HQATA.off=true;
        var o2=Object.assign({},o);delete o2.hq;
        return jobImage(o2).then(function(b2){
          body.kind=o.kind||c.mode||"AUTO";if(body.kind==="ATA")body.kind="AUTO";
          delete body.ataKey;delete body.variables;delete body.disableSms;body.imageB64=b2||"";
          o.sentKind=body.kind;
          return GS.send(body);
        });
      }
      return res;
    });
  }).then(function(res){''')
rep('''  var plan=ataPlan(o);
  return (plan?Promise.resolve(""):jobImage(o)).then(function(b64){''',
    '''  var plan=ataPlan(o);
  return ((plan||(o.hq&&!HQATA.off))?Promise.resolve(""):jobImage(o)).then(function(b64){''')

# 보낸 뒤 알림 글
rep('''    return sendNow(o).then(function(x){toast("문자를 보냈습니다");return x;})''',
    '''    return sendNow(o).then(function(x){toast(x&&x.sentKind==="ATA"?"알림톡을 보냈어요":"문자를 보냈어요");return x;})''')

# 출고안내
rep('''function sendOutMsg(r,type,openFallback){
  var p=outPlan(r);
  var useAta=(fmtOf("out")==="ata");
  return sendOrOpen({type:type||"출고 알림",to:r.phone,text:p.text,imageId:useAta?"":p.imageId,
    kind:useAta?"ATA":p.kind,forceAta:useAta,
    ata:useAta?{key:"out",vars:outVars(r)}:null,ref:r.id},openFallback);
}''', '''function sendOutMsg(r,type,openFallback){
  var p=outPlan(r);
  var useAta=(fmtOf("out")==="ata");
  /* v116: 업체 알림톡을 안 켰으면 본사 «출고안내» 알림톡 먼저 (안 되면 아래 문자 그대로) */
  return (useAta||!sendReady()?Promise.resolve(null):hqOut(r)).then(function(hq){
    return sendOrOpen({type:type||"출고 알림",to:r.phone,text:p.text,imageId:useAta?"":p.imageId,
      kind:useAta?"ATA":p.kind,forceAta:useAta,
      ata:useAta?{key:"out",vars:outVars(r)}:null,hq:hq,ref:r.id},openFallback);
  });
}''')

# 청구서 (보내기 · 예약)
rep('''    return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
    return queueSend({type:"월 청구(예약)",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
        kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
        ata:useAta?{key:"bill",vars:billVars(b)}:null,ref:billKey(b.name),scheduledDate:sched})''',
    '''    return (useAta?Promise.resolve(null):hqBill(b)).then(function(hq){
    return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
    return queueSend({type:"월 청구(예약)",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
        kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
        ata:useAta?{key:"bill",vars:billVars(b)}:null,hq:hq,ref:billKey(b.name),scheduledDate:sched})''')
rep('''        return markBilled(b,true,sched);
      });});
  }''', '''        return markBilled(b,true,sched);
      });});});
  }''')
rep('''      return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
        return sendOrOpen({type:"월 청구",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
          kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
          ata:useAta?{key:"bill",vars:billVars(b)}:null,ref:billKey(b.name)},openApp);});''',
    '''      return (useAta?Promise.resolve(null):hqBill(b)).then(function(hq){
      return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
        return sendOrOpen({type:"월 청구",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
          kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
          ata:useAta?{key:"bill",vars:billVars(b)}:null,hq:hq,ref:billKey(b.name)},openApp);});});''')


# 추가작업 «딜러에게 보내기» — 알림톡으로 보내기(앞) + 문자 앱(뒤)
rep("""    '<div class="tools" style="margin-top:12px">'+
      '<button class="btn primary" id="awC1">글 복사</button>'+""",
    """    '<div class="tools" style="margin-top:12px">'+
      ((r.phone&&sendReady())?'<button class="btn primary" id="awAta">알림톡으로 보내기</button>':'')+
      '<button class="btn'+((r.phone&&sendReady())?'':' primary')+'" id="awC1">글 복사</button>'+""")
rep("""      (r.phone?'<button class="btn" id="awSms">문자 앱으로</button>':"")+""",
    """      (r.phone?'<button class="btn" id="awSms">문자 앱으로 직접</button>':"")+""")
rep("""  $("awC1").onclick=function(){ vlCopy($("awMsg").value,"글"); };""",
    """  $("awC1").onclick=function(){ vlCopy($("awMsg").value,"글"); };
  /* v116: 본사 «추가작업» 알림톡 먼저, 안 되면 아래 글을 문자로 */
  if($("awAta")) $("awAta").onclick=function(){
    var bt=this; bt.disabled=true; bt.textContent="보내는 중…";
    queueSend({type:"추가 작업",to:r.phone,text:$("awMsg").value,kind:"AUTO",hq:hqAdd(r,w,j.url),ref:r.id})
      .then(function(o){return sendNow(o);})
      .then(function(o){
        if(o.status==="보냄"){ toast(o.sentKind==="ATA"?"알림톡을 보냈어요":"문자를 보냈어요"); closeSheet(); renderAll(); }
        else { bt.disabled=false; bt.textContent="알림톡으로 보내기"; toast("보내지 못했어요: "+sendErrText(o.err),true); }
      }).catch(function(e){ bt.disabled=false; bt.textContent="알림톡으로 보내기"; toast((e&&e.message)||"보내지 못했어요",true); });
  };""")

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
