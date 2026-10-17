"""워시 v128 → v130 (출시 판 · 요청서 B). 거래처(상사 · 딜러) 화면을 체크 v46 과 똑같이 + 입고 중 새 딜러 «휴대폰만»
쓰는 법: 만들기_워시_v128 다음에 (v129 · 공통 1.8 은 출시 뒤 — 이 판에는 넣지 않아요)
대표 지시 10/18 · 운영/요청서/2026-10-18_08 요청서 B:
  1) 설정 › 거래처 = 체크 거래처 부품 cpt 1.0(체크/부품/거래처_부품.js · .css, 보안 통과) 그대로 — 한 화면 · [딜러 | 상사] · 세 칸 추가 ·
     명함 / 사업자등록증 사진으로 채우기 · 계산서는 딜러 줄을 눌러 · «정보 필요» 모아 보기 · 정렬 · 찾기 · 5/10/20/30/50 · 큰 체크칸
  2) 워시 자료 모양은 그대로(companies · dealers 모음, 칸 이름 그대로) — 이음새(wPt*)가 부품 모양으로 바꿔 넘기고, 저장할 때 다시 바꿔요
  3) 조합 전산 딜러 명부(카모두 엑셀)는 거래처 화면 아래 버튼으로 그대로
  4) 입고할 때 목록에 없는 딜러 → 가운데 창: 휴대폰만 넣고 «저장하고 입고»
운영 v111 · 시험판 v125 · v126 ~ v129 는 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v128.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v130.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
PJS = open(os.path.join(ROOT, "체크", "부품", "거래처_부품.js"), encoding="utf-8").read()
PCSS = open(os.path.join(ROOT, "체크", "부품", "거래처_부품.css"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS in s and JS in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v128 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v130 · UI 3.0 · 2026-10-18";')

# 0) 체크 거래처 부품 그대로 — JS 는 공통 부품 바로 뒤(같은 <script>), CSS 는 워시 완성 CSS 끝
rep(JS, JS + "\n" + PJS)
a2 = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b2 = s.index('</style>', a2)
s = s[:b2] + "\n" + PCSS + """
/* v130 — 거래처 화면 아래 조합 전산 딜러 명부 칸 */
.wpt-roster{margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
""" + s[b2:]

# 1) 거래처 화면 — 위 작은 탭 대신 부품 하나
rep('''function renderParties(){
  $("pSub").innerHTML=PSUB.map(function(t){''', '''function renderParties(){
  if(P.sub!=="roster"&&window.CGG_PARTNER&&window.CGG&&CGG.dialog){wPtRender();return;}
  if(P.sub==="roster"&&$("pSub")){$("pSub").hidden=false;
    $("pSub").innerHTML='<button data-s="back" aria-selected="false">← 거래처로</button><button data-s="roster" aria-selected="true">딜러 명부 (조합 전산 엑셀)</button>';
    Array.prototype.forEach.call($("pSub").children,function(b){b.onclick=function(){P.sub=b.getAttribute("data-s")==="back"?"comp":"roster";renderParties();};});
    renderRoster();return;}
  $("pSub").innerHTML=PSUB.map(function(t){''')

PT_JS = r'''
/* ══════════════ v130 — 거래처 부품(체크 cpt 1.0) 이음새: 워시 자료 ↔ 부품 모양 ══════════════
   워시 자료는 그대로: companies {id,name,bizName,bizNo,ceo,manager,managerPhone,mainPhone,addr,upte,jongmok,email,taxType}
                      dealers   {id,name,phone,company,type:"staff"|"biz",taxType,bizName,bizNo,ceo,addr,upte,jongmok,email}
   딜러는 상사를 «이름»으로 이어요(입고 기록과 같은 방식). 계산서: 끊음 + 개인사업자 = 본인 · 끊음 + 소속 = 상사 · 안 끊음 / 현금영수증 = 안 끊음 */
var WPT={st:{}};
function wPtComp(name){return S.comps.filter(function(c){return c.name===name;})[0]||null;}
function wPtDealers(){
  return S.dealers.map(function(d){
    var c=wPtComp(d.company||""), iss=taxIssues(d);
    var t=lastDealOf(d.name);
    return {id:String(d.id),name:d.name||"",tel:d.phone||"",comp:d.company||"",compId:c?String(c.id):"",
      tax:!iss?"none":((d.type||"staff")==="biz"?"own":"co"),
      biz:{name:d.bizName||"",no:String(d.bizNo||"").replace(/\D/g,""),ceo:d.ceo||"",addr:d.addr||"",email:d.email||"",upte:d.upte||"",jongmok:d.jongmok||""},
      last:t?fmtTime(t):""};});
}
function wPtCompanies(){
  return S.comps.map(function(c){
    return {id:String(c.id),name:c.name||"",n:S.dealers.filter(function(d){return d.company===c.name;}).length,
      biz:{no:String(c.bizNo||"").replace(/\D/g,""),ceo:c.ceo||"",tel:c.mainPhone||c.managerPhone||"",addr:c.addr||"",email:c.email||"",upte:c.upte||"",jongmok:c.jongmok||""}};});
}
/* 사진 읽기 — 워시에 있던 그 방식(S.sample.json) 그대로, 부품이 준 사진 글자를 그림으로 바꿔 넘겨요 */
function wPtBlob(b64){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:"image/jpeg"});}
function wPtRead(prompt,b64){return S.sample.json(prompt,{images:[wPtBlob(b64)],modelTier:"default"});}
var WPT_CARD='명함 사진이에요. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\n'+
  '형식: {"name":"이름","phone":"010-0000-0000","company":"회사(상사)명","bizName":"상호","bizNo":"000-00-00000","email":"","addr":""}\n'+
  '- 없는 값은 빈 문자열로 두세요.\n- 휴대폰은 010으로 시작하는 번호를 고르세요.';
var WPT_BIZ='사업자등록증(또는 홈택스 출력물) 사진이에요. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\n'+
  '형식: {"bizNo":"000-00-00000","bizName":"상호","ceo":"대표자","addr":"사업장 주소","upte":"업태","jongmok":"종목"}\n'+
  '- 없는 값은 빈 문자열로 두세요.';
function wPtSaveCompany(c){
  var old=c.id?S.comps.filter(function(x){return String(x.id)===String(c.id);})[0]:null;
  var o=Object.assign({},old||{id:"c_"+Date.now()+"_"+Math.random().toString(36).slice(2,6),taxType:TAXTYPES[0]});
  o.name=String(c.name||o.name||"").trim();
  if(!old&&!o.bizName)o.bizName=o.name;
  if(c.no!=null)o.bizNo=c.no?fmtBizNo(c.no):"";
  if(c.ceo!=null)o.ceo=c.ceo;
  if(c.tel!=null)o.mainPhone=c.tel?ccwPhoneFmt(c.tel):"";
  ["addr","email","upte","jongmok"].forEach(function(k){if(c[k]!=null)o[k]=c[k];});
  o.updatedAt=nowIso();
  var oldName=old?old.name:"";
  var p=(S.db?S.db.collection("companies").doc(o.id).set(o):Promise.resolve()).then(function(){
    S.comps=S.comps.filter(function(x){return x.id!==o.id;}).concat([o]);
    /* 상사 이름을 바꾸면 그 상사 딜러들의 «소속 상사»도 같이 (입고 기록은 그때 이름 그대로) */
    if(oldName&&oldName!==o.name){
      return Promise.all(S.dealers.filter(function(d){return d.company===oldName;}).map(function(d){
        return saveDealer(Object.assign({},d,{company:o.name,updatedAt:nowIso()}));}));
    }
  });
  return p.then(function(){return {id:o.id,name:o.name};});
}
function wPtSaveDealer(nd,isNew){
  var old=(!isNew&&nd.id)?S.dealers.filter(function(x){return String(x.id)===String(nd.id);})[0]:null;
  var o=Object.assign({},old||{id:"d_"+Date.now()+"_"+Math.random().toString(36).slice(2,6)});
  o.name=nd.name;o.phone=nd.tel?ccwPhoneFmt(nd.tel):"";o.company=nd.comp||"";
  if(nd.tax==="none"){o.taxType=(old&&!taxIssues(old))?old.taxType:TAXTYPES[1];if(!o.type)o.type="staff";}
  else{o.taxType=TAXTYPES[0];o.type=(nd.tax==="own")?"biz":"staff";}
  if(nd.tax==="own"&&nd.biz){var b=nd.biz;o.bizName=b.name||"";o.bizNo=b.no?fmtBizNo(b.no):"";o.ceo=b.ceo||"";
    ["addr","email","upte","jongmok"].forEach(function(k){if(b[k]!=null)o[k]=b[k];});}
  o.updatedAt=nowIso();
  return saveDealer(o);
}
function wPtDel(coll,list,ids){
  return Promise.all(ids.map(function(id){
    var doc=list.filter(function(x){return String(x.id)===String(id);})[0];if(!doc)return null;
    return toTrash(coll,doc).then(function(){return S.db?S.db.collection(coll).doc(doc.id).delete():null;});}));
}
function wPtRender(){
  if($("pSub"))$("pSub").hidden=true;
  var host=$("pBody");if(!host)return;
  host.innerHTML='<div class="card" style="padding:16px"><div id="wPt"></div></div>'+
    '<div class="card wpt-roster"><div><b>딜러 명부 (조합 전산 엑셀)</b><div class="hint" style="margin-top:2px">카모두에서 받은 명부를 올려 두면 찾아서 바로 딜러로 넣을 수 있어요.</div></div>'+
    '<button type="button" class="btn" id="wPtRoster">딜러 명부 열기</button></div>';
  $("wPtRoster").onclick=function(){P.sub="roster";renderParties();window.scrollTo(0,0);};
  var photo=!!(S.sample&&S.canImage);
  CGG_PARTNER.mount($("wPt"),{
    state:WPT.st,owner:isOwner(),dealers:wPtDealers(),companies:wPtCompanies(),
    caps:{more:true,last:true,later:false,billTo:false},
    api:{
      saveDealer:function(d,isNew){return wPtSaveDealer(d,isNew);},
      saveCompany:function(c){return wPtSaveCompany(c);},
      delDealers:function(ids){return wPtDel("dealers",S.dealers,ids).then(function(){
        S.dealers=S.dealers.filter(function(d){return ids.indexOf(String(d.id))<0;});return {n:ids.length};});},
      delCompanies:function(ids){
        var kept=[],go=[];
        ids.forEach(function(id){var c=S.comps.filter(function(x){return String(x.id)===String(id);})[0];if(!c)return;
          var n=S.dealers.filter(function(d){return d.company===c.name;}).length;
          if(n)kept.push({id:String(c.id),name:c.name,dealerN:n});else go.push(String(c.id));});
        return wPtDel("companies",S.comps,go).then(function(){
          S.comps=S.comps.filter(function(c){return go.indexOf(String(c.id))<0;});return {n:go.length,kept:kept};});},
      readCard:photo?function(b){return wPtRead(WPT_CARD,b);}:null,
      readBiz:photo?function(b){return wPtRead(WPT_BIZ,b);}:null
    },
    done:function(m){toast(m);renderParties();try{refreshDatalists();}catch(e){}},
    fail:function(e){return errMsg(e);}
  });
}
/* 입고할 때 목록에 없는 딜러 — 가운데 창에서 휴대폰만 넣고 «저장하고 입고» (요청서 B 8) */
function wNewDealer(company,dealer,mode,btn){
  if(WPT.ok===company+"|"+dealer){WPT.ok="";return false;}
  if(!window.CGG||!CGG.dialog)return false;
  var known=S.dealers.some(function(d){return d.name===dealer&&(!d.company||!company||d.company===company);});
  if(known)return false;
  var ph=$("fPhone")?$("fPhone").value.trim():"";
  CGG.dialog({size:"form",title:"처음 보는 딜러예요",desc:dealer+(company?" · "+company:"")+" — 휴대폰 번호만 넣으면 딜러 목록에 저장하고 바로 입고해요.",
    body:'<label class="f" for="wNdTel" style="margin-top:6px">휴대폰</label>'+
      '<input type="tel" id="wNdTel" inputmode="tel" maxlength="15" placeholder="010-0000-0000" value="'+esc(ph)+'">'+
      '<div class="hint" style="margin-top:6px">이 번호로 입고 · 출고 알림톡이 가요. 세금계산서 정보는 나중에 설정 › 거래처에서 넣어요.</div>'+
      '<div class="cpt-err" id="wNdErr" hidden></div>'+
      '<button type="button" class="cgg-btn sm" id="wNdSkip" style="margin-top:10px">번호를 몰라요 — 저장 없이 입고</button>',
    ok:"저장하고 입고",cancel:"취소",
    onOk:function(){
      var t=String($("wNdTel").value||"").replace(/\D/g,""),er=$("wNdErr");
      if(!/^01[016789]\d{7,8}$/.test(t)){er.hidden=false;er.textContent="휴대폰 번호를 010으로 시작하는 10~11자리로 넣어 주세요.";return false;}
      var okb=document.querySelector(".cgg-dlg [data-dok]");if(okb)okb.disabled=true;
      var tel=ccwPhoneFmt(t);if($("fPhone"))$("fPhone").value=tel;
      var o={id:"d_"+Date.now()+"_"+Math.random().toString(36).slice(2,6),name:dealer,phone:tel,company:company,
        type:"staff",taxType:TAXTYPES[0],updatedAt:nowIso()};
      saveDealer(o).then(function(){toast(dealer+" 딜러를 저장했어요");},function(){
        S.dealers=S.dealers.filter(function(x){return x.id!==o.id;});
        toast("딜러 저장은 못 했어요 — 입고는 그대로 해요",true);})
      .then(function(){try{CGG.closeDialog();}catch(e){}try{refreshDatalists();}catch(e){}
        WPT.ok=company+"|"+dealer;doIntake(mode,btn);});
      return false;}
  });
  var sk=$("wNdSkip");if(sk)sk.onclick=function(){try{CGG.closeDialog();}catch(e){}WPT.ok=company+"|"+dealer;doIntake(mode,btn);};
  setTimeout(function(){var e=$("wNdTel");if(e)e.focus();},60);
  return true;
}
'''
rep('''/* --- 사진으로 추가 (명함 / 사업자등록증) --- */''', PT_JS + '''/* --- 사진으로 추가 (명함 / 사업자등록증) --- */''')
# 2) 입고 — 필수 칸 확인 다음, 0원 확인 앞에서
rep('''  if(!works.length)return bad("작업을 한 줄 이상 넣어 주세요");
  if(total<=0&&!confirmed("금액이 0원이에요. 이대로 등록할까요?",btn))return;''',
    '''  if(!works.length)return bad("작업을 한 줄 이상 넣어 주세요");
  if(wNewDealer(company,dealer,mode,btn))return;
  if(total<=0&&!confirmed("금액이 0원이에요. 이대로 등록할까요?",btn))return;''')
# 3) 고친 것(v112 부터 있던 것): 고르는 칸 이름 «계산서 끊음»을 «끊는다»로 못 읽어 청구서에 부가세가 빠지던 것
rep('''  if(/미발|없음/.test(t)) return false;
  return /발행|발급/.test(t);''', '''  if(/미발|없음|안\\s*끊/.test(t)) return false;
  return /발행|발급|끊음/.test(t);   /* v130: 고르는 칸 «계산서 끊음»도 끊는 것으로 */''')
assert CSS in s and JS in s and PJS in s and PCSS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
