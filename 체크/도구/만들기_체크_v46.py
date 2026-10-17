"""체크 v44 → v46 — 요청서 08 A «거래처 한 화면» (v44 는 읽기만 · 시험판 v42 · 보류된 v45 는 그대로)
받은 일: 총괄 10-18 «가온 매일 쓰기» 첫 단계 — 시안 https://claude.ai/artifact/J6CqnRvhvefztsjWtqYH2Y 그대로
  · 설정 › 거래처의 «매매상사 사업자» · «딜러» 두 표 → 거래처 부품 하나([딜러 | 상사] 버튼)
  · 부품 파일 `체크/부품/거래처_부품.css · .js` 를 글자 그대로 넣음 (워시가 똑같이 가져다 씀)
  · 서버 v34 창구 그대로: dealers · companies · dealerSave · dealerDel · companySave · companyDel · aiCard · aiBiz
    + 있으면 partnerCaps(서버 v35 약속: «나중에» · 주소/이메일/업태/종목 · 마지막 거래) — 없으면 그 칸만 숨김
  · 저장할 때 서버가 모르는 칸을 지우지 않게 예전 값(raw)을 그대로 같이 보냄 (메모 · 추가 번호 · 발행처 칸)
  · 계산서 규칙 그대로(검사비는 딜러별 · 성능보험료는 상사 앞으로). 청구서 만들기 · 묶음 화면은 손대지 않음
창구 약속: 체크/기획/2026-10-18_v46_거래처_한화면_창구_약속.md
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v44.html", encoding="utf-8").read()
CSS = open(BASE + "부품/거래처_부품.css", encoding="utf-8").read()
JS = open(BASE + "부품/거래처_부품.js", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

def cut(a, b, new):
    """a 부터 b 까지(둘 다 포함)를 new 로"""
    global s
    i = s.find(a); assert i >= 0 and s.count(a) == 1, a[:60]
    j = s.find(b, i); assert j >= 0, b[:60]
    s = s[:i] + new + s[j + len(b):]

# ── 1) 부품 넣기 (공통 부품 1.5 바로 뒤, 제품 스크립트보다 먼저) ──
rep('''version:"cgg-j4 1.5" };
})();

</script>''', '''version:"cgg-j4 1.5" };
})();

</script>
<style id="cpt-css">
''' + CSS + '''</style>
<script>
''' + JS + '''</script>''')

# ── 2) 자료: 서버 값(raw)을 그대로 들고 있기 — 저장할 때 모르는 칸을 지우지 않게 ──
rep('''        tax: d.tax_issue===false ? "안 끊음" : "끊음",''', '''        tax: d.tax_issue===false ? "안 끊음" : "끊음", _r:d,   /* v46: 거래처 부품이 저장할 때 씀 */''')
rep('''               cnt:Number(c.dealerN)||0, n:(Number(c.dealerN)||0)+"명", _q:[c.name,c.biz_no,c.ceo].join(" ") }; }) : null; });''',
    '''               cnt:Number(c.dealerN)||0, n:(Number(c.dealerN)||0)+"명", _q:[c.name,c.biz_no,c.ceo].join(" "), _r:c }; }) : null;
    PCAPS = (r[4] && typeof r[4]==="object") ? r[4] : {}; });''')
rep('''                       call("companies",[]).catch(function(){ return null; }) ])   /* v44: 서버 v34 전에는 null */''',
    '''                       call("companies",[]).catch(function(){ return null; }),   /* v44: 서버 v34 전에는 null */
                       call("partnerCaps",[]).catch(function(){ return null; }) ])   /* v46: 서버 v35 약속 — 없으면 {} */''')
rep('''var COMPS=null;   /* v44: null 이면 서버에 companies 창구가 아직 없음 */''',
    '''var COMPS=null;   /* v44: null 이면 서버에 companies 창구가 아직 없음 */
var PCAPS={}, PT_STATE={};   /* v46: 거래처 부품 — 서버가 아는 칸 · 보기 상태(다시 그려도 남음) */''')

# ── 3) 화면: 두 표 → 거래처 부품 한 칸 ──
cut('''  card("매매상사 사업자","딜러에게 개인사업자가 없으면''',
    '''    (own?'':'<p class="note">딜러 · 매매상사를 넣고 지우는 것은 대표만 할 수 있어요.</p>'));''',
    '''  "";''')
# 거래처 부품을 맨 위로 (매일 쓰는 것) — 우리 사업장 · 쓰는 항목은 그 아래
rep('''  return head("거래처","공급자는 청구서 왼쪽 칸에, 청구처는 오른쪽 칸에 들어가요. 등록되지 않은 딜러도 청구서는 만들어지며 사업자 칸만 비어 나와요.")+''',
    '''  return head("거래처","딜러 · 매매상사를 넣고, 세금계산서를 누구 이름으로 끊을지 정해요. 아래에는 청구서 왼쪽 칸에 들어가는 우리 사업장 정보가 있어요.")+
  card("딜러 · 매매상사","이름은 접수리스트의 «신청인» · «회사명»과 똑같이 적어야 자동으로 연결돼요. 줄을 누르면 세금계산서 정보까지 한 창에서 고쳐요.",
    '<div id="ptBox"></div>')+''')
rep('''  var COMP=COMPS || Object.keys(cmap).sort().map(function(k){
    var c=cmap[k]; c.n=c.cnt+"명"; c._q=[c.name,c.biz].join(" "); return c; });
  var own=isOwner();''', '''  void cmap;''')
# 위에서 쓰지 않게 된 상사 모으기(cmap)는 그대로 두되 표에는 안 씀
cut('''AFTER.partner=function(){
  wireTable("cmp",function(){ draw(); }); wireTable("dlr",function(){ draw(); });''',
    '''  var sv=$("offSave");''',
    '''AFTER.partner=function(){
  ptMount();   /* v46: 거래처 부품 */
  var sv=$("offSave");''')
cut('''  /* v44: 딜러 · 매매상사 넣기 · 지우기 (대표만) */
  var da=$("dlrAdd");''', '''    if(b.textContent==="묶음 풀기") b.onclick=function(){ tieDealers(true); };
  });
};''', '''};''')

PT_HOST = r'''/* ═══ v46: 거래처 부품 이음새 — 서버 v34 모양 ↔ 부품 모양 (워시는 워시 서버 모양으로 같은 일을 함) ═══ */
function ptTax(r){ var k=String(r.issuer_kind||"company");
  if(r.tax_issue===false || k==="none") return "none";
  return k==="dealer" ? "own" : k==="later" ? "later" : "co"; }
function ptDealers(){
  var nm={}; DEALERS.forEach(function(d){ nm[String(d.id)]=d.name; });
  return DEALERS.map(function(d){ var r=d._r||{};
    return { id:String(d.id), name:d.name, tel:d.tel||"", compId:String(d.compId||""), comp:d.comp||"",
      tax:ptTax(r), biz:{ name:String(r.issuer_name||""), no:String(r.issuer_biz||""), ceo:String(r.issuer_ceo||""), addr:String(r.issuer_addr||""),
        email:String(r.issuer_email||""), upte:String(r.issuer_upte||""), jongmok:String(r.issuer_jongmok||"") },
      billTo:String(r.bill_to_id||""), billToName:r.bill_to_id?(nm[String(r.bill_to_id)]||d.billto||""):"", last:String(r.last_date||"").slice(0,10), _r:r }; }); }
function ptCompanies(){
  return (COMPS||[]).map(function(c){ var r=c._r||{};
    return { id:c.id, name:c.name, n:c.cnt, biz:{ no:c.biz, ceo:c.ceo, tel:c.tel,
      addr:String(r.addr||""), email:String(r.email||""), upte:String(r.upte||""), jongmok:String(r.jongmok||"") }, _r:r }; }); }
/* 저장 — 서버가 받는 칸을 모두 보냄 (빠지면 서버가 빈 값으로 덮음). 계산서 고르기를 바꾸지 않았으면 예전 값 그대로 */
function ptSaveDealer(nd, isNew, old){
  var r=(old&&old._r)||{}, b=nd.biz||{};
  var body={ name:nd.name, tel:nd.tel, company_id:nd.compId||null, bill_to_id:nd.billTo||null,
    issuer_kind:r.issuer_kind||"company", issuer_name:r.issuer_name||"", issuer_biz:r.issuer_biz||"",
    issuer_ceo:r.issuer_ceo||"", issuer_addr:r.issuer_addr||"", tax_issue:r.tax_issue!==false, memo:r.memo||"" };
  if(PCAPS.more){ body.issuer_email=r.issuer_email||""; body.issuer_upte=r.issuer_upte||""; body.issuer_jongmok=r.issuer_jongmok||""; }
  if(!isNew) body.id=nd.id;
  var was=isNew?"":ptTax(r);
  if(isNew || nd.tax!==was){
    body.issuer_kind = nd.tax==="own"?"dealer" : nd.tax==="none"?"none" : nd.tax==="later"?"later" : "company";
    body.tax_issue = nd.tax!=="none";
  }
  if(nd.tax==="own"){ body.issuer_name=b.name||""; body.issuer_biz=b.no||""; body.issuer_ceo=b.ceo||""; body.issuer_addr=b.addr||"";
    if(PCAPS.more){ body.issuer_email=b.email||""; body.issuer_upte=b.upte||""; body.issuer_jongmok=b.jongmok||""; } }
  return call("dealerSave",[body]);
}
function ptSaveCompany(c){
  var o=(c._old&&c._old.biz)||{};
  var body={ name:c.name, biz_no:c.no!=null?c.no:(o.no||""), ceo:c.ceo!=null?c.ceo:(o.ceo||""), tel:c.tel!=null?c.tel:(o.tel||"") };
  if(PCAPS.more){ ["addr","email","upte","jongmok"].forEach(function(k){ body[k]=c[k]!=null?c[k]:(o[k]||""); }); }
  if(c.id) body.id=c.id;
  return call("companySave",[body]);
}
function ptMount(){
  var el=$("ptBox"); if(!el || !window.CGG_PARTNER) return;
  if(COMPS===null){ el.innerHTML='<div class="msg err">서버를 새로 올려야 쓸 수 있어요(체크 서버 v34). 차곳간에 알려 주세요.</div>'; return; }
  CGG_PARTNER.mount(el, {
    state:PT_STATE, owner:isOwner(), dealers:ptDealers(), companies:ptCompanies(),
    caps:{ later:!!PCAPS.later, more:!!PCAPS.more, last:!!PCAPS.last, billTo:true },
    api:{ saveDealer:ptSaveDealer, saveCompany:ptSaveCompany,
      delDealers:function(ids){ return call("dealerDel",[{ids:ids}]); },
      delCompanies:function(ids){ return call("companyDel",[{ids:ids}]); },
      readCard:function(b64){ return call("aiCard",[b64]); },
      readBiz:function(b64){ return call("aiBiz",[b64]); } },
    done:function(msg){ bar(msg,"ok",true); DEALERS=[]; refresh(["set","bill"]); },
    fail:function(e){ return niceMsg(e&&e.message); }
  });
}
'''
rep('''/* ═══ v44: 거래처 넣기 · 지우기 — 딜러 dealerSave · dealerDel''', PT_HOST + '''/* ═══ v44: 거래처 넣기 · 지우기 — 딜러 dealerSave · dealerDel''')

rep('$("hdVer").textContent="체크 v44 · "', '$("hdVer").textContent="체크 v46 · "')
for need in [CSS, JS]:
    assert need in s
assert 'id="cmp-blk"' not in s
open(BASE + "2_차곳간_체크_index_v46.html", "w", encoding="utf-8").write(s)
print("OK v46", len(s))
