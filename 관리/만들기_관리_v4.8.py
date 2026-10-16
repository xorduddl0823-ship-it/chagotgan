"""관리 v4.8 초안 — 시험 뒤 판 (워시 서버 sb16 짝 · 보안 통과 2026-10-16). **교체는 총괄 승인 뒤**
쓰는 법: python3 관리/만들기_관리_v4.8.py   (v4.7 파일은 읽기만)
- 재료: 관리/3_차곳간_관리_index_v4.7.html
- 결과: 관리/3_차곳간_관리_index_v4.8.html
- 바꾸는 것: 알림 › 기한 안내 설정에 «잔액 안내 기준 금액(원)» 칸
    읽기 hqExp([]).cfg.balMin · 저장 hqExpSave([{…, balMin}]) — 0 이면 꺼짐, 0 ~ 10,000,000
    서버 동작: 캐시가 켜진 유료 업체의 잔액이 이 금액보다 적으면 하루 한 번 «차곳간_잔액안내» 알림톡 (코드 없으면 문자)
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.7.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.8.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.7 · 공통 1.5 · 2026-10-16";', 'var ADM_VER="관리 v4.8 · 공통 1.5 · 2026-10-16";')
rep("""    '<div class="saveRow"><button class="btn primary sm" id="exSave">설정 저장</button></div></div>';""",
    """    /* 잔액 안내 (워시 서버 sb16) — 캐시가 켜진 유료 업체의 잔액이 이 금액보다 적으면 하루 한 번 알림 */
    '<div style="margin-top:14px"><label class="f" for="exBal">잔액 안내 기준 금액 (원)</label>'+
      '<input type="text" id="exBal" inputmode="numeric" value="'+esc(Number(c.balMin)>0?Number(c.balMin).toLocaleString("ko-KR"):"0")+'" style="max-width:220px">'+
      '<div class="hint" style="margin:4px 0 0">캐시를 쓰는 유료 업체의 남은 금액이 이보다 적으면 하루 한 번 «차곳간_잔액안내»가 나가요 (코드가 없으면 문자). <b>0이면 꺼져요.</b></div></div>'+
    '<div class="saveRow"><button class="btn primary sm" id="exSave">설정 저장</button></div></div>';""")
rep("""    return { on:$("exOn").checked, trial:$("exTrial").checked, cash:$("exCash").checked,
             days:dd, time:twoD(eh.value)+":"+twoD(em.value) };""",
    """    var bal=$("exBal")?Math.max(0,Math.min(10000000,Math.round(Number(String($("exBal").value).replace(/[^0-9]/g,""))||0))):undefined;
    var o={ on:$("exOn").checked, trial:$("exTrial").checked, cash:$("exCash").checked,
             days:dd, time:twoD(eh.value)+":"+twoD(em.value) };
    if(bal!==undefined) o.balMin=bal;
    return o;""")
# 디자인 방 폰 깨짐 목록 (디자인/폰_깨짐_목록.md · 관리-1 · 관리-2)
#  관리-1 홈 달력: 폰에서 칸 너비 고정 + 금액은 «3.5만» (PC 는 정확한 금액 그대로, 달력 아래 합계에 정확한 금액)
rep("""      (v && v.amt ? '<div class="amt">'+won(v.amt)+'</div>' : '')+""",
    """      (v && v.amt ? '<div class="amt" title="'+esc(won(v.amt))+'"><span class="aw">'+won(v.amt)+'</span><span class="am">'+manwon(v.amt)+'</span></div>' : '')+""")
rep('\nfunction won(n){ return (Number(n)||0).toLocaleString("ko-KR")+"원"; }', '\nfunction won(n){ return (Number(n)||0).toLocaleString("ko-KR")+"원"; }\nfunction manwon(n){ n=Number(n)||0; if(Math.abs(n)<10000) return won(n); var m=Math.round(n/1000)/10; return (m%1?m.toFixed(1):String(m))+"만"; }')
rep("/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */",
    "/* 관리 v4.8 — 폰 달력 (체크와 같은 값) · 폰 목록 날짜 안 쪼개기 */\n"
    ".cal .amt .am{display:none}\n"
    "@media (max-width:600px){.cal{grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.cal .d{min-width:0;min-height:58px;padding:4px 3px;overflow:hidden}"
    ".cal .amt{font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cal .amt .aw{display:none}.cal .amt .am{display:inline}"
    ".cal .todaytag{font-size:9.5px;white-space:nowrap}.cgg-mrow .t b span{white-space:nowrap}}\n"
    "/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
