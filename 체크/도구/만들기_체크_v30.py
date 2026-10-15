"""체크 v29 → 체크 v30 새 판. v29 · 운영 v21.2 는 건드리지 않는다. (결제/요청서/2026-10-15_체크_결제창v2.md (가)만 · 자동 결제는 넣지 않음)
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v29.py && python3 체크/도구/만들기_체크_v30.py
바꾸는 것: 카드 결제창을 토스 v1 → v2 로
  - 서버 payStart 가 sdk:"v2" 를 주면 v2 SDK(https://js.tosspayments.com/v2/standard) · customerKey("ANONYMOUS") 로 결제창
  - sdk 가 없으면(옛 서버) 지금처럼 v1 — 서버와 화면을 따로 올려도 결제가 멈추지 않게
  - 돌아온 뒤 payConfirm 은 그대로 (v2 도 successUrl 에 paymentKey · orderId · amount 를 붙여 돌려줌)
⚠ 체크 서버(check-api)에는 아직 payStart · payConfirm 이 없음 — 이 칸은 서버 방 결정 전까지 체크에서 동작하지 않음 (요청서 참고)
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v29.html"
OUT = BASE + "2_차곳간_체크_index_v30.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('''  function loadToss(){
    return new Promise(function(res, rej){
      if(window.TossPayments) return res(window.TossPayments);
      var sc = document.createElement("script");
      sc.src = "https://js.tosspayments.com/v1/payment";''',
    '''  /* 결제창 v2 (2026-10-15) — 서버가 sdk:"v2" 를 주면 v2, 아니면 옛 v1 */
  function loadToss(sdk){
    return new Promise(function(res, rej){
      if(window.TossPayments && window.__tossSdk === (sdk||"v1")) return res(window.TossPayments);
      var sc = document.createElement("script");
      sc.src = (sdk === "v2") ? "https://js.tosspayments.com/v2/standard" : "https://js.tosspayments.com/v1/payment";
      window.__tossSdk = sdk || "v1";''')
rep('''      return loadToss().then(function(TP){
        var back = location.origin + location.pathname;
        var tp = TP(r.clientKey);
        return tp.requestPayment("카드", {
          amount: r.amount, orderId: r.orderId, orderName: r.orderName,
          customerName: r.customerName,
          successUrl: back + "?pay=ok",
          failUrl:    back + "?pay=no"
        });
      });''',
    '''      return loadToss(r.sdk).then(function(TP){
        var back = location.origin + location.pathname;
        var tp = TP(r.clientKey);
        if(r.sdk === "v2"){
          /* v2: 결제창 하나 — 금액은 {통화, 값}, 결제 수단은 "CARD" */
          var pay = tp.payment({ customerKey: r.customerKey || "ANONYMOUS" });
          return pay.requestPayment({
            method: "CARD",
            amount: { currency: "KRW", value: r.amount },
            orderId: r.orderId, orderName: r.orderName,
            customerName: r.customerName,
            successUrl: back + "?pay=ok",
            failUrl:    back + "?pay=no"
          });
        }
        return tp.requestPayment("카드", {
          amount: r.amount, orderId: r.orderId, orderName: r.orderName,
          customerName: r.customerName,
          successUrl: back + "?pay=ok",
          failUrl:    back + "?pay=no"
        });
      });''')
rep('''  $("hdVer").textContent="체크 v29 · "''', '''  $("hdVer").textContent="체크 v30 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
