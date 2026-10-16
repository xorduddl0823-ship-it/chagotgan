# 만들기_워시_v116.py 가 마지막에 불러 씀 (2026-10-15 추가분): 확정본 변수 이름 · 입금 기한 칸 · 입금 확인 안내
# 이 파일 혼자서는 돌리지 않아요. rep · s 는 만들기_워시_v116.py 의 것을 씁니다.

# 업체 알림톡 기본 문안 · 넣을 수 있는 값 = 확정본(알림톡/00_확정본_13개_원문.md) 그대로
rep('var DEF_ATA_OUT="[#{업체}] 출고 안내\\n\\n#{딜러}님, 맡기신 #{차량번호} 차량 작업을 마치고 #{목적지}(으)로 출고했습니다.\\n\\n■ 작업 : #{작업}\\n■ 금액 : #{금액}\\n\\n감사합니다.";',
    'var DEF_ATA_OUT="[차곳간] 차량 출고 안내\\n#{딜러명}님(#{상사명}), 작업이 끝나 차량이 출고되었습니다.\\n\\n차량번호: #{차량번호}\\n작업: #{작업내용}\\n도착한 곳: #{목적지}\\n출고시각: #{출고일시}\\n\\n차량을 어디에 두었는지는 아래 버튼의 사진에서 확인하실 수 있습니다.\\n문의: #{업체전화}\\n\\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.";')
rep('var DEF_ATA_BILL="[#{업체}] #{청구월} 청구 안내\\n\\n#{받는분}님, #{청구월} 광택·세차 작업 내역을 안내드립니다.\\n\\n■ 차량 : #{대수}\\n■ 합계 : #{합계}\\n■ 입금 계좌 : #{계좌}\\n\\n건별 내역이 필요하시면 연락 주세요.\\n감사합니다.";',
    'var DEF_ATA_BILL="[차곳간] #{기간} 청구 내역 안내\\n\\n#{받는곳} 님, #{업체명}에서 #{기간} 작업분 청구 내역을 보내드립니다.\\n\\n· 작업 대수 : #{건수}대\\n· 청구 금액 : #{금액}원 (부가세 포함)\\n· 입금 기한 : #{입금기한}\\n· 입금 계좌 : #{계좌}\\n\\n자세한 내역은 아래 버튼에서 확인하실 수 있습니다.\\n문의 #{업체전화}\\n\\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.";')
rep("""var ATA_VARS={out:["업체","딜러","상사","차량번호","작업","목적지","금액","목적지주소","지도링크","연락처"],
  bill:["업체","청구월","받는분","소속상사","대수","작업내역","합계","계좌","연락처"]};""",
    """var ATA_VARS={out:["딜러명","상사명","차량번호","작업내용","목적지","출고일시","업체전화","업체명","보기코드"],
  bill:["기간","받는곳","업체명","건수","금액","입금기한","계좌","업체전화","보기코드"]};""")

# 변수 — 확정본 이름 + 예전 이름(업체가 예전에 적어 둔 문안도 그대로 채워지게)
rep("""function outVars(r){
  var dest=r.dest||r.company||"",addr=destAddrOf(dest);
  return {"업체":shopLabel(),"딜러":r.dealer||"","상사":r.company||"",
    "차량번호":r.plate||"","작업":workFull(r),"목적지":dest,"금액":won(r.total),
    "목적지주소":addr,"지도링크":addr?mapUrl(addr):"","연락처":phoneLine()};
}""", """function outVars(r,code){
  var dest=r.dest||r.company||"",addr=destAddrOf(dest);
  return {"딜러명":r.dealer||"","상사명":r.company||"","차량번호":r.plate||"","작업내용":workFull(r),
    "목적지":dest,"출고일시":dtKo(r.outAt||nowIso()),"업체전화":shopTel(),"업체명":shopLabel(),"보기코드":code||"",
    /* 예전 이름 */ "업체":shopLabel(),"딜러":r.dealer||"","상사":r.company||"","작업":workFull(r),"금액":won(r.total),
    "목적지주소":addr,"지도링크":addr?mapUrl(addr):"","연락처":phoneLine()};
}
/* 본사 알림톡에는 확정본 변수만 보냄 (예전 이름은 업체가 적은 문안에서만 씀) */
function onlyKeys(o,keys){var v={};keys.forEach(function(k){v[k]=o[k];});return v;}
function billDue(){var t=String((S.cfg&&S.cfg.billDueText)||"").trim();return t||"업체에 문의";}""")
rep("""function billVars(b){
  return {"업체":shopLabel(),"청구월":periodLabel(b.month),"받는분":b.name,
    "소속상사":b.company||"","대수":b.cars+"대","작업내역":b.workText||"","합계":wonExact(b.amount),
    "계좌":(S.cfg&&S.cfg.bank)||"","연락처":phoneLine()||((S.cfg&&S.cfg.send&&S.cfg.send.from)||"")};
}""", """function billVars(b,code){
  return {"기간":periodLabel(b.month),"받는곳":b.name,"업체명":shopLabel(),"건수":b.cars,"금액":comma(b.amount||0),
    "입금기한":billDue(),"계좌":(S.cfg&&S.cfg.bank)||"","업체전화":shopTel(),"보기코드":code||"",
    /* 예전 이름 */ "업체":shopLabel(),"청구월":periodLabel(b.month),"받는분":b.name,
    "소속상사":b.company||"","대수":b.cars+"대","작업내역":b.workText||"","합계":wonExact(b.amount),
    "연락처":phoneLine()||((S.cfg&&S.cfg.send&&S.cfg.send.from)||"")};
}""")

# 출고 · 청구서 — 보기코드를 한 번 받아 업체 알림톡 · 본사 알림톡 모두에 씀
rep("""function hqOut(r){
  if(HQATA.off)return Promise.resolve(null);
  return gsCall("viewLink",[r.id]).then(function(t){
    var j=typeof t==="string"?JSON.parse(t):t, code=viewCode(j&&j.url);
    if(!code)return null;
    var dest=r.dest||r.company||"";
    return {key:"out",vars:hqVars({"딜러명":r.dealer||"","상사명":r.company||"","차량번호":r.plate||"","작업내용":workFull(r),
      "목적지":dest,"출고일시":dtKo(r.outAt||nowIso()),"업체전화":shopTel(),"업체명":shopLabel(),"보기코드":code})};
  }).catch(function(){return null;});
}""", """function outCode(r){
  return gsCall("viewLink",[r.id]).then(function(t){var j=typeof t==="string"?JSON.parse(t):t;return viewCode(j&&j.url);})
    .catch(function(){return "";});
}""")
rep("""function hqBill(b){
  if(HQATA.off)return Promise.resolve(null);
  return gsCall("viewBill",[JSON.stringify(billPayload(b))]).then(function(t){
    var j=typeof t==="string"?JSON.parse(t):t, code=viewCode(j&&j.url);
    if(!code)return null;
    return {key:"bill",vars:hqVars({"기간":periodLabel(b.month),"받는곳":b.name,"업체명":shopLabel(),"건수":b.cars,
      "금액":comma(b.amount||0),"입금기한":(S.cfg&&S.cfg.billDueText)||"-","계좌":(S.cfg&&S.cfg.bank)||"","업체전화":shopTel(),"보기코드":code})};
  }).catch(function(){return null;});
}""", """function billCode(b){
  return gsCall("viewBill",[JSON.stringify(billPayload(b))]).then(function(t){var j=typeof t==="string"?JSON.parse(t):t;return viewCode(j&&j.url);})
    .catch(function(){return "";});
}""")
rep("""  return (useAta||!sendReady()?Promise.resolve(null):hqOut(r)).then(function(hq){
    return sendOrOpen({type:type||"출고 알림",to:r.phone,text:p.text,imageId:useAta?"":p.imageId,
      kind:useAta?"ATA":p.kind,forceAta:useAta,
      ata:useAta?{key:"out",vars:outVars(r)}:null,hq:hq,ref:r.id},openFallback);
  });""", """  return (sendReady()&&(useAta||!HQATA.off)?outCode(r):Promise.resolve("")).then(function(code){
    var hq=(!useAta&&code&&!HQATA.off)?{key:"out",vars:hqVars(onlyKeys(outVars(r,code),ATA_VARS.out))}:null;
    return sendOrOpen({type:type||"출고 알림",to:r.phone,text:p.text,imageId:useAta?"":p.imageId,
      kind:useAta?"ATA":p.kind,forceAta:useAta,
      ata:useAta?{key:"out",vars:outVars(r,code)}:null,hq:hq,ref:r.id},openFallback);
  });""")
rep("""    return (useAta?Promise.resolve(null):hqBill(b)).then(function(hq){
    return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
    return queueSend({type:"월 청구(예약)",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
        kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
        ata:useAta?{key:"bill",vars:billVars(b)}:null,hq:hq,ref:billKey(b.name),scheduledDate:sched})""",
    """    return billCode(b).then(function(code){
    var hq=(!useAta&&code&&!HQATA.off)?{key:"bill",vars:hqVars(onlyKeys(billVars(b,code),ATA_VARS.bill))}:null;
    return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
    return queueSend({type:"월 청구(예약)",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
        kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
        ata:useAta?{key:"bill",vars:billVars(b,code)}:null,hq:hq,ref:billKey(b.name),scheduledDate:sched})""")
rep("""      return (useAta?Promise.resolve(null):hqBill(b)).then(function(hq){
      return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
        return sendOrOpen({type:"월 청구",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
          kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
          ata:useAta?{key:"bill",vars:billVars(b)}:null,hq:hq,ref:billKey(b.name)},openApp);});});""",
    """      return billCode(b).then(function(code){
      var hq=(!useAta&&code&&!HQATA.off)?{key:"bill",vars:hqVars(onlyKeys(billVars(b,code),ATA_VARS.bill))}:null;
      return (useAta||!plan.photo?Promise.resolve({id:"",b64:""}):billImageId(b)).then(function(img){
        return sendOrOpen({type:"월 청구",to:b.phone,text:text,imageId:useAta?"":img.id,__b64:img.b64,
          kind:useAta?"ATA":(img.id?"MMS":plan.kind),forceAta:useAta,
          ata:useAta?{key:"bill",vars:billVars(b,code)}:null,hq:hq,ref:billKey(b.name)},openApp);});});""")

# 입금 기한 칸 — 청구서 › 2. 청구서 보내기 (입금 계좌 바로 밑, 함께 저장)
rep('''        <input type="text" id="bmBank" placeholder="예) 신한 110-000-000000 (상호)" style="margin-bottom:10px">''',
    '''        <input type="text" id="bmBank" placeholder="예) 신한 110-000-000000 (상호)" style="margin-bottom:10px">
        <label class="f">입금 기한 (알림톡 청구서에 찍혀요 · 비우면 «업체에 문의»)</label>
        <input type="text" id="bmDue" placeholder="예) 매월 10일" maxlength="30" style="margin-bottom:10px">''')
rep('''  if(document.activeElement!==$("bmBank"))$("bmBank").value=(S.cfg&&S.cfg.bank)||"";''',
    '''  if(document.activeElement!==$("bmBank"))$("bmBank").value=(S.cfg&&S.cfg.bank)||"";
  if($("bmDue")&&document.activeElement!==$("bmDue"))$("bmDue").value=(S.cfg&&S.cfg.billDueText)||"";''')
rep('''  S.cfg.billSms=$("bmText").value;S.cfg.bank=$("bmBank").value.trim();''',
    '''  S.cfg.billSms=$("bmText").value;S.cfg.bank=$("bmBank").value.trim();
  if($("bmDue"))S.cfg.billDueText=$("bmDue").value.trim().slice(0,30);''')
rep('<button class="btn primary" id="bmSave">문구·계좌 저장</button>', '<button class="btn primary" id="bmSave">문구·계좌·기한 저장</button>')

# 입금 확인 안내 — 받아야 할 금액 › [입금 확인] 창에서 고르면 거래처에 (기본은 꺼짐: 새 안내라 요금이 늘 수 있어서)
rep("""   '<div class="hint" style="margin-top:12px">확인하시면 <b>수금 완료</b> 로 바뀝니다. 잘못 누르셨으면 그 줄에서 되돌릴 수 있습니다.</div>'+""",
    """   '<div class="hint" style="margin-top:12px">확인하시면 <b>수금 완료</b> 로 바뀝니다. 잘못 누르셨으면 그 줄에서 되돌릴 수 있습니다.</div>'+
    (sendReady()?'<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:13.5px;cursor:pointer"><input type="checkbox" id="dpAta" style="width:18px;height:18px;margin-top:2px">'+
      '<span>거래처에 <b>«입금 확인» 안내</b> 보내기<br><small style="color:var(--muted)">알림톡으로 보내요. 본사 알림톡이 아직 준비 전이면 문자로 가요(문자 요금).</small></span></label>':'')+""")
rep("""  $("dpYes").onclick=function(){
    var v=num(g.value); if(v<=0) return check();
    var day=$("dpDay").value||today;
    duePay(b, v, day);
  };""", """  $("dpYes").onclick=function(){
    var v=num(g.value); if(v<=0) return check();
    var day=$("dpDay").value||today;
    var ann=!!($("dpAta")&&$("dpAta").checked);
    duePay(b, v, day);
    if(ann) depositNotice(b, v, day);
  };
}
/* v116: 입금 확인 안내 (본사 «입금확인» 알림톡 · 확정본 변수) */
function depositNotice(b, v, day){
  var rec=(S.records||[]).filter(function(r){return b.ids.indexOf(r.id)>=0&&r.phone;})[0];
  if(!rec){ toast("받는 분 번호가 없어 «입금 확인» 안내는 보내지 못했어요",true); return; }
  var d=new Date((day||nowIso().slice(0,10))+"T"+new Date().toTimeString().slice(0,5));
  var vars={"받는곳":b.comp||b.dealer||"","금액":comma(v),"업체명":shopLabel(),"확인일시":dtKo(isNaN(d)?nowIso():d.toISOString()),
    "기간":periodLabel(b.month),"업체전화":shopTel()};
  var text="["+shopLabel()+"] "+comma(v)+"원 입금 확인되었습니다. 감사합니다.\\n"+shopLabel()+(shopTel()?(" "+shopTel()):"");
  queueSend({type:"입금 확인",to:rec.phone,text:text,kind:"AUTO",hq:{key:"deposit",vars:hqVars(vars)},ref:b.key})
    .then(function(o){return sendNow(o);})
    .then(function(o){ if(o.status==="보냄") toast(o.sentKind==="ATA"?"«입금 확인» 알림톡을 보냈어요":"«입금 확인» 문자를 보냈어요");
      else toast("«입금 확인» 안내를 보내지 못했어요: "+sendErrText(o.err),true); })
    .catch(function(e){ toast((e&&e.message)||"«입금 확인» 안내를 보내지 못했어요",true); });""")
