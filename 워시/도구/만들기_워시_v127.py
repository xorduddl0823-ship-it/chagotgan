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
assert CSS in s and JS in s
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
