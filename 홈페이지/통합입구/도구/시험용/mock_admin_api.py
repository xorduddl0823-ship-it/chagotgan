# -*- coding: utf-8 -*-
"""
관리 화면 시험용 임시 서버 — 실제 서버(wash-api 의 hq* 창구)가 돌려주는 모양을 흉내 냅니다.
  POST {shop, token, fn, args:[...]}  →  {result:...} 또는 {__err:"..."}
같은 폴더의 파일도 그대로 보여 줍니다 (시험용 사본을 열 때).
  python mock_admin_api.py   →   http://127.0.0.1:8898/
"""
import json, http.server, socketserver, datetime, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8898
T = datetime.date.today()
def d(n): return (T + datetime.timedelta(days=n)).isoformat()
YM = T.strftime("%Y-%m")

SHOPS = [
  {"shop": "ADMIN", "name": "차곳간 본사", "active": True},
  {"shop": "BROTHER", "name": "브라더광택", "biz_kind": "wash", "plan": "basic", "active": True,
   "paid_until": d(9), "endAt": d(9), "staff": 4, "owner_phone": "01011112222"},
  {"shop": "SOMCAR", "name": "솜카 성능장", "biz_kind": "repair", "plan": "trial", "active": True,
   "trial_until": d(3), "endAt": d(3), "staff": 2, "owner_phone": "01022223333"},
  {"shop": "DOREAM", "name": "두드림휠", "biz_kind": "wheel", "plan": "standard", "active": False,
   "paid_until": d(-5), "endAt": d(-5), "staff": 3, "owner_phone": "01033334444"},
  {"shop": "MUGYEOL", "name": "무결점 카모터스", "biz_kind": "wash", "plan": "pro", "active": True,
   "paid_until": d(21), "endAt": d(21), "staff": 6, "owner_phone": "01044445555"},
]
USERS = [
  {"phone": "admin", "name": "이택영", "shop": "ADMIN", "shopName": "차곳간 본사", "role": "admin", "active": True,
   "last_login": d(0) + "T09:10:00", "created_at": "2026-05-01"},
  {"phone": "01011112222", "name": "정대봉", "shop": "BROTHER", "shopName": "브라더광택", "role": "owner", "active": True,
   "last_login": d(0) + "T08:00:00", "created_at": "2026-06-11"},
  {"phone": "01022223333", "name": "김영", "shop": "SOMCAR", "shopName": "솜카 성능장", "role": "owner", "active": True,
   "last_login": d(-1) + "T18:00:00", "created_at": "2026-09-30"},
  {"phone": "01055556666", "name": "박현수", "shop": "BROTHER", "shopName": "브라더광택", "role": "staff", "active": False,
   "last_login": d(-20) + "T10:00:00", "created_at": "2026-07-02"},
]
PAYS = [
  {"id": 1, "shop": "BROTHER", "shopName": "브라더광택", "amount": 55000, "status": "paid", "period": YM, "paid_at": d(-2)},
  {"id": 2, "shop": "MUGYEOL", "shopName": "무결점 카모터스", "amount": 99000, "status": "paid", "period": YM, "paid_at": d(-1)},
  {"id": 3, "shop": "DOREAM", "shopName": "두드림휠", "amount": 77000, "status": "ready", "period": YM},
]
PLANS = [
  {"code": "basic", "name": "베이직", "price": 55000, "active": True, "sort": 1},
  {"code": "standard", "name": "스탠다드", "price": 77000, "active": True, "sort": 2},
  {"code": "pro", "name": "프로", "price": 0, "active": True, "sort": 3},
]
SVCS = [
  {"id": 1, "code": "supabase", "name": "수파베이스", "kind": "sub", "cost": 35000, "next_due": d(4), "active": True, "sort": 1,
   "url": "https://supabase.com", "what": "서버·자료"},
  {"id": 2, "code": "solapi", "name": "솔라피 문자", "kind": "charge", "balance": 8000, "min_bal": 10000, "active": True, "sort": 2,
   "auto": True, "auto_note": "자동으로 읽음", "what": "문자"},
  {"id": 3, "code": "cloudflare", "name": "클라우드플레어", "kind": "sub", "cost": 0, "next_due": d(17), "active": True, "sort": 3,
   "what": "주소"},
]
TODO = [
  {"id": 1, "title": "QR 스티커 교체", "done": False, "due_at": d(0)},
  {"id": 2, "title": "문자 충전", "done": False, "due_at": d(-2)},
  {"id": 3, "title": "세금계산서 정리", "done": False, "due_at": d(6)},
]
NEXT = {"todo": 10}

# ── 통합 로그인 (새로 만들 창구 cggLogin · cggLogin2 · cggMe · cggLogout 을 흉내 냅니다) ──
ACCOUNTS = {
  "A":     {"pw": "1111", "name": "김영",   "two": False, "products": [{"code": "check", "shop": "SOMCAR",  "sid": "S-CHK"}]},
  "B":     {"pw": "2222", "name": "정대봉", "two": False, "products": [{"code": "wash",  "shop": "BROTHER", "sid": "S-WASH"}]},
  "owner": {"pw": "0000", "name": "이택영", "two": True,  "products": [
              {"code": "wash",  "shop": "BROTHER", "sid": "S-WASH"},
              {"code": "check", "shop": "SOMCAR",  "sid": "S-CHK"},
              {"code": "admin", "shop": "ADMIN",   "sid": "SID-TEST"}]},
}
SESS = {}
def grant(id_):
    a = ACCOUNTS[id_]; sid = "CGG-" + id_
    SESS[sid] = id_
    return {"sid": sid, "name": a["name"], "products": a["products"]}

def FN(fn, args, body=None):
    tok = (body or {}).get("token") or ""
    if fn == "cggLogin":
        a = ACCOUNTS.get(args[0])
        if not a or a["pw"] != args[1]: raise ValueError("아이디나 비밀번호가 맞지 않습니다")
        if a["two"]: return {"tick": "TK-" + args[0], "to": "010-****-1234"}
        return grant(args[0])
    if fn == "cggLogin2":
        if not str(args[0]).startswith("TK-") or args[1] != "123456": raise ValueError("문자로 받은 6자리가 맞지 않습니다")
        return grant(args[0][3:])
    if fn == "cggMe":
        if args[0] not in SESS: raise ValueError("로그인이 필요합니다")
        return grant(SESS[args[0]])
    if fn == "cggLogout":
        SESS.pop(args[0] if args else "", None); return {"ok": True}
    # ── 제품별 «나» 확인 — 열쇠를 보고 어느 제품인지 가립니다 ──
    if fn == "me":
        k = (args[0] if args else "") or tok
        if k == "S-WASH": return {"shop": "BROTHER", "who": "정대봉", "role": "owner"}
        if k == "S-CHK":  return {"office": {"id": 1, "code": "SOMCAR", "name": "솜카 성능장"}, "who": "김영", "role": "owner", "ver": "check-api v21 · 시험"}
        if k == "SID-TEST": return {"shop": "ADMIN", "who": "이택영", "role": "admin"}
        raise ValueError("로그인이 필요합니다")
    if fn == "apiStamp": return {"rev": 1}
    if fn == "apiVer": return {"ver": "wash-api · 시험"}
    if fn == "apiLoad":
        return {"records": [], "comps": [], "dealers": [], "staff": [{"id": "s1", "name": "정대봉", "code": "1234", "role": "owner", "active": True, "phone": "01011112222"}], "mats": [], "bills": {}, "outbox": [], "trash": [], "settings": {}, "__rev": 1}
    if fn == "hqLogin": return {"tick": "T1", "to": "010-****-1234"}
    if fn == "hqLogin2": return {"key": "SID-TEST", "who": "이택영", "shop": "ADMIN", "role": "admin"}
    if fn == "logout": return {"ok": True}
    if fn == "hqSummary":
        return {"salesMonth": 154000, "expMonth": 35000, "shops": 4, "shopsOff": 1, "users": 4, "usersOn": 3,
                "active7": 6, "waitInvite": 2, "unpaid": 1}
    if fn == "hqShops": return {"shops": SHOPS}
    if fn == "hqUsers": return {"users": USERS}
    if fn == "hqPayments": return {"payments": PAYS}
    if fn == "inviteList":
        return {"invites": [{"phone": "01077778888", "memo": "광택 상담", "used": False, "created_at": d(-3)},
                            {"phone": "01099990000", "memo": "", "used": True, "created_at": d(-9)}]}
    if fn == "hqPlans": return {"plans": PLANS}
    if fn == "hqSessions": return {"sessions": []}
    if fn == "hqServices": return {"services": SVCS}
    if fn == "hqExpenses": return {"expenses": [{"id": 1, "day": d(-4), "name": "수파베이스", "amount": 35000}]}
    if fn == "hqInfo":
        return {"hq": {"biz_name": "티와이컴퍼니", "biz_no": "1234567890", "ceo": "이택영", "pb_test": True}, "hasPopbill": True}
    if fn == "hqTodo": return {"todo": TODO}
    if fn == "hqTodoAdd":
        NEXT["todo"] += 1; TODO.append({"id": NEXT["todo"], "title": args[0], "done": False, "due_at": args[1] or None}); return {"ok": True}
    if fn == "hqTodoDone":
        for t in TODO:
            if t["id"] == args[0]: t["done"] = bool(args[1])
        return {"ok": True}
    if fn == "hqTodoDel":
        TODO[:] = [t for t in TODO if t["id"] != args[0]]; return {"ok": True}
    if fn == "hqOps":
        return {"usage": {"db_bytes": 1.9 * 1024**3, "file_bytes": 23.4 * 1024**3, "file_cnt": 18234},
                "limits": {"dbGb": 8, "fileGb": 100, "warnPct": 80}, "services": [
                    {"code": "solapi", "balance": 8000, "minBal": 10000, "balanceAt": d(0) + "T09:00:00"}],
                "monthCost": 35000, "due": [], "low": [], "at": d(0) + "T09:00:00"}
    # 그 밖의 창구 — 빈 묶음으로 돌려 줍니다 (화면이 «자료 없음»으로 그려지는지만 봅니다)
    return {}

ROOT = os.path.dirname(os.path.abspath(__file__))   # 시험용 폴더
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n).decode("utf-8"))
            out = {"result": FN(body.get("fn"), body.get("args") or [], body)}
        except ValueError as e:
            out = {"__err": str(e)}
        except Exception as e:
            out = {"__err": "시험 서버 오류: " + str(e)}
        raw = json.dumps(out, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers(); self.wfile.write(raw)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H) as s:
    print("관리 시험 서버", PORT); s.serve_forever()
