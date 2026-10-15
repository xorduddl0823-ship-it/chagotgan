"""체크 미리보기 만들기 — 홈페이지 「미리 써 보기」용. 워시 미리보기와 같은 방식.
쓰는 법: python3 체크/시안/만들기_체크_미리보기.py [v31]   (판 이름을 주면 그 판으로. 기본 v31)
- 재료: 체크/2_차곳간_체크_index_vNN.html (읽기만)
- 결과: 체크/시안/체크_vNN_미리보기.html — 실제 서버에 연결하지 않아요.
  서버(/functions/v1/…)로 가는 요청을 이 파일 안에서 가로채 지어낸 예시 검사소 자료로 답해요. 저장해도 이 창 안에서만 바뀌어요.
- 예시 자료는 모두 지어낸 값이에요 (실제 업체 · 사람 · 번호 없음). 사업자번호 000-00-00000, 전화 010-0000-0000 꼴만 씀.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
VER = sys.argv[1] if len(sys.argv) > 1 else "v31"
SRC = os.path.join(HERE, "..", "2_차곳간_체크_index_%s.html" % VER)
OUT = os.path.join(HERE, "체크_%s_미리보기.html" % VER)
s = open(SRC, encoding="utf-8").read()

FAKE = r'''<script>
/* ═══ 미리보기 전용 — 서버로 가는 요청을 가로채서 지어낸 자료로 답합니다 (실제 서버 연결 없음) ═══ */
(function(){
  var MEM = {};
  try{ localStorage.setItem("__t","1"); localStorage.removeItem("__t"); }catch(e){
    try{ Object.defineProperty(window,"localStorage",{value:{getItem:function(k){return k in MEM?MEM[k]:null;},
      setItem:function(k,v){MEM[k]=String(v);},removeItem:function(k){delete MEM[k];},clear:function(){MEM={};}}}); }catch(e2){}
  }
  var OFFICE = {name:"예시 성능검사소", code:"DEMO", biz_no:"000-00-00000", owner_name:"김대표", tel:"010-0000-0000",
    addr:"예시시 예시구 예시로 1", sms_from:"", biz_type:"서비스", biz_class:"자동차 성능점검", tax_email:"", tax_contact:"김대표"};
  try{
    localStorage.setItem("cgg_key","chk_PREVIEW"); localStorage.setItem("cgg_shop","DEMO");
    localStorage.setItem("cgg_who","김대표"); localStorage.setItem("cgg_role","owner");
    localStorage.setItem("cgg_shopname", OFFICE.name);
  }catch(e){}
  /* 지어낸 거래처 — 상사 · 딜러 */
  var COMP = [["하늘모터스","000-00-00001"],["푸른카","000-00-00002"],["바른오토","000-00-00003"],["다온상사","000-00-00004"],
              ["새날모터스","000-00-00005"],["별빛오토","000-00-00006"]];
  var DLR = [["김하늘",0],["이푸름",1],["박바름",2],["최다온",3],["정새날",4],["한별빛",5],["오하늘",0],["윤푸름",1]];
  var DEALERS = DLR.map(function(d,i){ var c=COMP[d[1]];
    return {id:"d"+i, name:d[0], tel:"010-0000-00"+(10+i), company:{name:c[0], biz_no:c[1]}, billTo:null,
            issuer_name:c[0], issuer_biz:c[1], issuer_kind:"company", tax_issue:true}; });
  function ymAdd(ym, k){ var y=+ym.slice(0,4), m=+ym.slice(5,7)+k; while(m<1){m+=12;y--;} while(m>12){m-=12;y++;} return y+"-"+(m<10?"0":"")+m; }
  function seedN(str){ var h=7; for(var i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))%9973; return h; }
  function nowYm(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
  var PAID = {};   /* 이 창 안에서 바뀐 입금 */
  function invoices(ym){
    return DEALERS.map(function(d,i){
      var r=seedN(ym+d.name), dom=8+(r%20), imp=r%6, etc=r%3, fee=(dom*33000+imp*44000+etc*22000), rep=(r%4)*55000;
      var tot=fee+rep, past=(ym<nowYm()), paid = past ? tot : (i%3===0 ? tot : (i%3===1 ? Math.round(tot/2/1000)*1000 : 0));
      if(PAID[ym+i]) paid=tot;
      return {id:"inv_"+ym+"_"+i, bill_to_name:d.name, members:[d.name], fee_amount:fee, ext_amount:0, repair_amount:rep,
        total_amount:tot, paid_amount:paid, company_name:d.company.name, issuer_name:d.company.name, issuer_biz:d.company.biz_no,
        tax_issue:true, sent_at: (past||i%2===0) ? ym+"-28T10:00:00" : null, view_at: (past||i%4===0) ? ym+"-28T12:30:00" : null,
        view_key:"PV"+i, dom_n:dom, imp_n:imp, etc_n:etc};
    });
  }
  function deposits(){
    var out=[], now=new Date();
    for(var k=0;k<40;k++){
      var t=new Date(now.getTime()-k*1.5*86400000), d=DEALERS[k%DEALERS.length], r=seedN(String(k));
      var kind = k%5===0 ? "정비비" : (k%7===0 ? "보험료" : "검사비");
      out.push({tx_at:t.toISOString(), sender:d.name, amount:(3+(r%30))*11000, kind:kind,
        state: k<3 ? "확인 대기" : "맞음", src:"예시은행", memo:""});
    }
    return out;
  }
  function sales(){
    var rows=[], ym=nowYm();
    for(var k=0;k<12;k++){
      var y=ymAdd(ym,-k), r=seedN(y), n=120+(r%60), fee=n*34000, rep=(10+r%15)*55000, ins=(n-20)*9000;
      rows.push({ym:y, n:n, total:fee+rep+ins, fee:fee, rep:rep, repN:10+r%15, ins:ins, insN:n-20,
        dom:n-15-(r%10), imp:10+(r%5), etc:5+(r%5), free:r%3, avg:Math.round((fee+rep+ins)/n)});
    }
    for(var j=0;j<rows.length;j++){ var p=rows[j+1];
      rows[j].mom = p ? Math.round((rows[j].total-p.total)/p.total*1000)/10 : null;
      rows[j].momN = p ? Math.round((rows[j].n-p.n)/p.n*1000)/10 : null; rows[j].yoy = null; }
    var ty=String(new Date().getFullYear()), years={};
    function sum(k){ return rows.filter(function(x){return x.ym.slice(0,4)===ty;}).reduce(function(a,x){return a+x[k];},0); }
    years[ty]={total:sum("total"), n:sum("n"), fee:sum("fee"), rep:sum("rep")};
    years[String(+ty-1)]={total: Math.round(years[ty].total*0.92), n:Math.round(years[ty].n*0.92), fee:Math.round(years[ty].fee*0.92), rep:Math.round(years[ty].rep*0.92)};
    return {rows:rows, years:years};
  }
  var STAFF=[{id:"u1",이름:"김대표",휴대폰:"010-****-0000",권한:"대표",사용:"Y",비밀번호:"정함",마지막로그인:new Date().toISOString(),나:"Y"},
             {id:"u2",이름:"이직원",휴대폰:"010-****-0001",권한:"직원",사용:"Y",비밀번호:"정함",마지막로그인:"",나:""}];
  function answer(fn, a){
    a=a||[];
    switch(fn){
      case "me": return {who:"김대표", role:"owner", office:OFFICE, ver:"check-api 미리보기"};
      case "login": case "loginCode": return {key:"chk_PREVIEW", shop:"DEMO", who:"김대표", role:"owner", shopName:OFFICE.name};
      case "logout": return {ok:true};
      case "invoiceList": return invoices(a[0]||nowYm());
      case "billState": var iv=invoices(a[0]||nowYm()), cars=iv.reduce(function(x,v){return x+v.dom_n+v.imp_n+v.etc_n;},0);
        return {cars:cars, linked:cars, noDealer:0, built:iv.length, builtAt:(function(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" 09:00";})(new Date()), stale:false};
      case "invoiceRows": return [];
      case "dealers": return DEALERS;
      case "depositList": return deposits();
      case "salesStat": return sales();
      case "dataCount": return {"상사":COMP.length, "딜러":DEALERS.length, "차량":540, "단가표":3, "청구서":DEALERS.length};
      case "officeGet": return OFFICE;
      case "taxList": return invoices(a[0]||nowYm()).map(function(v,i){ return {id:"tx"+(i+1), name:v.bill_to_name, members:"", comp:v.company_name,
        issuer:v.issuer_name, biz:v.issuer_biz, supply:Math.round(v.total_amount/1.1), tax:v.total_amount-Math.round(v.total_amount/1.1),
        total:v.total_amount, state: v.paid_amount>=v.total_amount ? "발급" : "", can:true, why:""}; });
      case "insList": return [];
      case "uploadList": return [];
      case "carHealth": return {};
      case "popInfo": return {linked:false};
      case "bankList": case "popBanks": return [];
      case "deliv_list": return {rows:[], dests:[], conf:{way:"ata", fallback:true, photo_on:true}, trashN:0, ver:"미리보기"};
      case "deliv_accounts": return {rows:[]};
      case "deliv_ping": return {ok:true, ver:"미리보기"};
      case "staffList": return STAFF;
      case "cashInfo": case "payDue": return {ok:false, off:true, note:"미리보기에서는 결제 · 충전을 할 수 없어요."};
      case "payStart": return {ok:false, note:"미리보기에서는 결제할 수 없어요."};
      case "lockInfo": return {state:"ok"};
      case "noticeList": return [];
      case "depositMatch": return {n:0};
      default: return {ok:true};   /* 저장 · 고치기는 이 창 안에서 «됐어요»로만 */
    }
  }
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function(url, opt){
    var u = String((url && url.url) || url || "");
    if(u.indexOf("/functions/v1/") >= 0){
      var body = {}; try{ body = JSON.parse((opt && opt.body) || "{}"); }catch(e){}
      var out; try{ out = {result: answer(body.fn, body.args)}; }catch(e){ out = {__err: String(e && e.message || e)}; }
      return new Promise(function(res){ setTimeout(function(){
        res(new Response(JSON.stringify(out), {status:200, headers:{"Content-Type":"application/json"}})); }, 60); });
    }
    if(/^https?:/i.test(u) && (!location.host || u.indexOf(location.host) < 0)) return Promise.reject(new TypeError("미리보기: 바깥 연결 안 함"));
    return realFetch ? realFetch(url, opt) : Promise.reject(new TypeError("no fetch"));
  };
})();
</script>
'''

i = s.index("<script")
s = s[:i] + FAKE + s[i:]
import re
s = re.sub(r"<title>[^<]*</title>", "<title>체크 %s 미리보기</title>" % VER, s, count=1)
k = s.index("<body>") + len("<body>")
s = s[:k] + '\n<div style="position:sticky;top:0;z-index:100000;background:#FFF2DD;color:#7A4A00;font:600 12.5px/1.5 \'Noto Sans KR\',sans-serif;padding:6px 14px;text-align:center">미리보기 — 지어낸 자료예요. 실제 서버에 연결하지 않고, 저장해도 이 창 안에서만 바뀌어요.</div>' + s[k:]
# 공통 부품 1.2 가 있으면 «미리 써 보기» 띠(CGG.trial)를 본문 맨 위에 — 디자인/02 연출 기준
TRIAL = """
<script>
(function(){ function put(){ try{
  if(!window.CGG || !CGG.trial) return; var m=document.querySelector(".cgg-main"); if(!m || m.querySelector(".cgg-trial")) return;
  CGG.trial.init("preview"); var d=document.createElement("div"); d.innerHTML=CGG.trial.band({title:"예시 검사소 자료로 체크의 모든 화면을 둘러보고 있어요."});
  m.insertBefore(d.firstChild, m.firstChild);
  var go=m.querySelector("[data-cgg-cta]"); if(go) go.onclick=function(){ try{ (window.top||window).postMessage({cgg:"start"},"*"); }catch(e){} };
}catch(e){} } setTimeout(put, 900); })();
</script>
"""
k = s.rindex("</body>")
s = s[:k] + TRIAL + s[k:]
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
