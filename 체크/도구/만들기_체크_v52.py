"""체크 v51 → v52 — 서버 check-api v44(검사비 셈 바로잡기 · 보안 통과 d4f11ac)에 맞춘 화면
  · 매출 · 월별 청구서: «단가표에 없는 상품명» · «금액 넣을 수출 가성능 N대» 알림
  · 월별 청구서: «수출 가성능 금액 넣기» → carFeeSet (대표만)
  · (총괄 10/18 덧붙임) 세금계산서 입금한 곳만 발급 · 홈택스 공식 양식 채우기 · 나스 전산외 청구 · 정비비 올리기 · 청구 소계 · 보험료 부가세 설정 · 정산 기록 장부 · 서버 v45 단추
v51(보안 통과 593c067 · 6ab92e3759aa)은 읽기만. 그 밖 기능은 v51 과 같아요. 서버 v44 + SQL 18 을 먼저 올려요.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v51.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('ver:"체크 v51", date:"10/18"', 'ver:"체크 v52", date:"10/18"')
rep('$("hdVer").textContent="체크 v51 · "', '$("hdVer").textContent="체크 v52 · "')
rep('<!-- 체크 v51 · ', '<!-- 체크 v52 (v51 + 검사비 서버 v44 맞춤) · ')
rep('''  home:["bill","dep"], sales:["sales"], bill:["bill","set"],''', '''  home:["bill","dep"], sales:["sales"], bill:["bill","set","sales"],''')
rep('''<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''', open(BASE + "체크/도구/v52_검사비.js", encoding="utf-8").read() + '''
<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''')

# ── v52 덧붙임 (총괄 10/18: 세금계산서 «입금한 곳만» · 나스 맞춤 · 서버 v45 단추) ──
rep("vmoney(r.ins)", "insMoney(r.ins)", 2)
rep("popbill:[\"set\",\"pop\"], hometax:[\"bill\",\"tax\"],", "popbill:[\"set\",\"pop\"], hometax:[\"bill\",\"tax\",\"set\"],")   # 홈택스 양식 공급자 칸 = 우리 사업장(OFFICE)   # 보험료 부가세 설정대로 (기본 미포함 = 엑셀 금액 그대로)
rep("fee:fee, rep:rep, paid:paid,", "fee:fee, rep:rep, paid:paid, feeOnly:(v.fee_amount||0), ext:(v.ext_amount||0),")   # 전산외 청구 소계를 따로
rep('var OFF_KEYS=["name",', 'var OFF_KEYS=["ins_vat","name",')
rep('ofld("bank_fee","검사비 받는 계좌")+ofld("bank_repair","정비비 받는 계좌")+',
    'ofld("bank_fee","검사비 받는 계좌")+ofld("bank_repair","정비비 받는 계좌")+'
    + "'<div class=\"fld\"><label class=\"f\" for=\"of-ins_vat\">보험료 부가세 (카모두 환경설정과 같게)</label><select id=\"of-ins_vat\"><option value=\"미포함\">부가세 미포함 — 엑셀 금액 그대로</option><option value=\"포함\"'+(OFFICE.ins_vat===\"포함\"?\" selected\":\"\")+'>부가세 포함</option></select></div>'+")
# 세금계산서 — 입금 전 줄: 못 하는 곳 목록에서 빼고 · 회색 칩 · «입금 전에 발급» 줄 단추
rep("var bad =TAXES.filter(function(t){ return !t.can && !t.skip; });", "var bad =TAXES.filter(function(t){ return !t.can && !t.skip && !t.unpaid; });")
rep(""": [{key:"skip",label:(r.skip?"다시 받기":"안 받음"),attr:"data-txskip",val:r.id}]; },""",
    """: (r.unpaid?[{key:"early",label:"입금 전에 발급",attr:"data-txearly",val:r.id}]:[]).concat([{key:"skip",label:(r.skip?"다시 받기":"안 받음"),attr:"data-txskip",val:r.id}]); },""")
rep("""          : '<span class="tag" style="background:var(--danger-soft);color:var(--danger)">'+esc(r.why)+'</span>';""",
    """          : '<span class="tag" style="'+(r.unpaid?'background:var(--line);color:var(--muted)':'background:var(--danger-soft);color:var(--danger)')+'">'+esc(r.why)+'</span>';""")
# 서버 v45 invoiceDel — 못 지운 곳(발급 · 입금된 청구서) 까닭
rep('busy(false); clearPick("bill"); bar(won((r&&r.n)||L.length)+"곳 청구서를 지웠어요.","ok"); refresh(["bill"]);',
    'busy(false); clearPick("bill"); var kp=(r&&r.kept)||[]; bar(won((r&&r.n)||0)+"곳 청구서를 지웠어요."+(kp.length?" 못 지운 "+kp.length+"곳 — "+kp.slice(0,2).map(function(x){ return (x.name||"")+"("+(x.why||"")+")"; }).join(" / "):""), kp.length?"err":"ok"); refresh(["bill"]);')
rep("""<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""", open(BASE + "체크/도구/v52_세금계산서.js", encoding="utf-8").read() + open(BASE + "체크/도구/v52_나스맞춤.js", encoding="utf-8").read() + """
<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""")

open(BASE + "체크/2_차곳간_체크_index_v52.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v52.html", len(s))
