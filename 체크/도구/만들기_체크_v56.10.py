"""체크 v56.10 = v56.9 + 배달 «도착 알림» 켜기/끄기 스위치 + 가온 정비 장부 받기 + 나스와 한 줄씩 맞춰 보기 (총괄 11/2 · 대표님 요청)
쓰는 법: python3 체크/도구/만들기_체크_v56.10.py   (v56.9 는 읽기만 · 운영 중이라 덮어쓰지 않아요)
  ① 체크/도구/v56.10_알림스위치.js — 홈 «오늘 할 일» 위 · 배달 기간 줄 위 한 줄 스위치 · 대표만 · 확인 창 ·
     저장 deliv_saveConf({arrive_on}) 뒤 deliv_conf 로 다시 읽어 확인 · 서버가 arrive_on 칸을 안 주면(v54) 잠금 «서버 준비 중»
  ② 배달 기록: 서버 발송결과 «꺼짐»(알림 꺼진 동안 도착) → 알림 칸 «꺼짐» · 상세 창 «알림 꺼짐» · 고른 줄 다시 보내기 확인 창에 «지금 꺼져 있어요»
  ③ 체크/도구/v56.10_정비장부.js — 달마다 «YYMM정비» 시트 중 고른 달만 · 열 이름 별칭 · 합계·메모 줄 빼고 주황 «확인 필요» · 거래처에 없는 이름
  ④ 체크/도구/v56.10_대조엑셀.js — 청구처 펼침 표 차량번호·검사일 · «엑셀 (차 한 대씩)» (같은 차 두 줄 · 선납인데 금액 «확인»)
  돈 셈 · 보내기 함수 본문 · rid · «확인 중» 처리는 그대로.
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.9.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.10.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "8e730b3fbb8f": raise SystemExit("v56.9 가 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.9", date:"10/20"', 'ver:"체크 v56.10", date:"11/2"')
rep('$("hdVer").textContent="체크 v56.9 · "', '$("hdVer").textContent="체크 v56.10 · "')
rep('<!-- 체크 v56.9 (', '<!-- 체크 v56.10 (v56.9 + 배달 도착 알림 켜기/끄기 · 가온 정비 장부 받기 · 나스와 맞춰 보기 · 11/2) · 체크 v56.9 (')
# ② 서버 발송결과 «꺼짐»
rep('r.발송결과==="확인 중" ? "확인 중" : "안 보냄";   /* v56.7 */',
    'r.발송결과==="확인 중" ? "확인 중" : r.발송결과==="꺼짐" ? "꺼짐" : "안 보냄";   /* v56.7 · v56.10: 알림 꺼진 동안 도착 */')
rep('d.alarm==="확인 중"?" · 확인 중 — 보낸 기록에서 확인해 주세요":" · 시험")',
    'd.alarm==="확인 중"?" · 확인 중 — 보낸 기록에서 확인해 주세요":d.alarm==="꺼짐"?" · 알림 꺼짐 — 꺼져 있던 동안이라 안 보냈어요":" · 시험")')
rep('return (n?"확인 중 "+won(n)+"건은 이미 나갔을 수 있어요 — 보낸 기록에서 먼저 확인해 주세요. ":"")+',
    'return (typeof DCONF!=="undefined"&&DCONF&&DCONF.arrive_on===false?"지금 도착 알림이 꺼져 있어요 — 고른 줄은 그래도 보내요. ":"")+(n?"확인 중 "+won(n)+"건은 이미 나갔을 수 있어요 — 보낸 기록에서 먼저 확인해 주세요. ":"")+')   # v56.10
# ③ 가온 정비 장부(달마다 시트 «YYMM정비») — 고른 달 시트만 · 열 이름 별칭 · 합계·메모 줄 빼고 «확인 필요» · 거래처에 없는 이름 알림 (체크/도구/v56.10_정비장부.js)
rep("""        var wb=XLSX.read(new Uint8Array(fr.result), {type:"array"});
        var best=null;""", """        var wb=XLSX.read(new Uint8Array(fr.result), {type:"array"});
        var rb=(typeof window.chkRepairBook==="function") ? window.chkRepairBook(wb, file.name) : null;   /* v56.10: 가온 정비 장부 */
        if(rb){ if(rb.err) bad(new Error(rb.err)); else done(rb); return; }
        var best=null;""")
rep("""      if(kind==="청구보험료"||kind==="정비비"){ var g=ymFromName(f.name); if(g) ym=g; }""",
    """      if(kind==="청구보험료"||kind==="정비비"){ var g=ymFromName(f.name); if(g) ym=g; }
      if(res.ym) ym=res.ym;   /* v56.10: 정비 장부는 고른 달 시트 그대로 */""")
rep("""        done.push(kind+" "+won(n)+"줄"+(ym!==ST.ym?" ("+ymText(ym)+"분)":"")); next();""",
    """        done.push(kind+" "+won(n)+"줄"+(ym!==ST.ym?" ("+ymText(ym)+"분)":"")+(res.note?" — "+res.note:"")); next();""")
rep('''          bad.length?"err":"ok");''', '''          bad.length?"err":(done.join(" ").indexOf("확인 필요")>=0?"warn":"ok"));   /* v56.10: 정비 장부 메모 줄 = 주황 «확인 필요» */''')
# ④ 나스와 한 줄씩 맞춰 보기 — 청구처 펼침 표에 차량번호 · 검사일 · «차 한 대씩 엑셀» 단추 (체크/도구/v56.10_대조엑셀.js) · 돈 함수 아님(detailRows · billDetail)
rep('    var o={ dealer:r.dealer_name||"", goods:r.item||"", unit:r.unit||0,',
    '    var o={ dealer:r.dealer_name||"", goods:r.item||"", unit:r.unit||0, plate:(r.car&&r.car.plate)||"", date:String((r.car&&r.car.check_date)||"").slice(5,10),   /* v56.10 */')
rep("""      {k:"dealer",t:"신청인",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"goods",t:"상품명",""", """      {k:"dealer",t:"신청인",name:true,fmt:function(v){return '<b>'+esc(v)+'</b>';}},
      {k:"plate",t:"차량번호"}, {k:"date",t:"검사일"},   /* v56.10: 나스와 한 줄씩 */
      {k:"goods",t:"상품명",""")
rep('<button class="btn" id="bXlsAll">엑셀 (명세 포함)</button>', '<button class="btn" id="bXlsAll">엑셀 (명세 포함)</button><button class="btn" id="bCarXls">엑셀 (차 한 대씩)</button>')
rep('  var ba=$("bXlsAll"); if(ba) ba.onclick=function(){ billOut("xlsAll"); };',
    '  var ba=$("bXlsAll"); if(ba) ba.onclick=function(){ billOut("xlsAll"); };\n  var bc=$("bCarXls"); if(bc) bc.onclick=function(){ if(window.chkV5610Car) chkV5610Car.xls(); };   /* v56.10 */')
# ① 스위치 — 맨 끝
rep("</body>", open(os.path.join(HERE, "v56.10_알림스위치.js"), encoding="utf-8").read() + open(os.path.join(HERE, "v56.10_정비장부.js"), encoding="utf-8").read() + open(os.path.join(HERE, "v56.10_대조엑셀.js"), encoding="utf-8").read() + "</body>")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
