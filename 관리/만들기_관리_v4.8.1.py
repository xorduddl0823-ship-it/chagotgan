"""관리 v4.8.1 만들기 — v4.8(보안 통과)에 새 점검표(chagotgan-ui-checker)에서 걸린 «꼭 고칠 것» 5가지만 고쳐요.
쓰는 법: python3 관리/만들기_관리_v4.8.1.py   (v4.8 파일은 읽기만)
- 결과: 관리/3_차곳간_관리_index_v4.8.1.html
- 바꾸는 것: ① 지출 기록 지우기 확인 창 ② 충전 묶음 지우기 확인 창 ③ 결제 건 지우기 확인 창에 업체 · 기간 · 금액
             ④ 업체 · 계정을 «보류(로그인 막기)»로 바꿀 때만 저장 전 확인 창 ⑤ 폰 단추 · 도구줄 높이 38 → 42px
- 새 서버 창구 없음. 화면 모양(배치)은 그대로.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.8.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.8.1.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.8 · 공통 1.5 · 2026-10-16";', 'var ADM_VER="관리 v4.8.1 · 공통 1.5 · 2026-10-17";')

# ① 지출 기록 지우기 — 무엇 · 얼마 · 어느 달치를 보여 주고 확인한 뒤에만
rep('''        ev.stopPropagation();
        api("hqExpenseDel",[b.getAttribute("data-ex")]).then(function(){ return loadAll(); })
          .then(function(){ toast("지웠어요"); viewSettle(); })
          .catch(function(e){ toast(emsg(e),true); });''',
'''        ev.stopPropagation();
        var exId=b.getAttribute("data-ex"), x=(D.exps||[]).filter(function(r){ return String(r.id)===exId; })[0]||{};
        confirmBox("지출 기록을 지울까요?",
          "무엇에: "+(x.name||"-")+"\\n금액: "+won(x.amount)+"\\n어느 달치: "+(x.period||"-")+"\\n그 뒤: 되돌릴 수 없어요",
          "지우기", true, function(){
          api("hqExpenseDel",[exId]).then(function(){ return loadAll(); })
            .then(function(){ toast("지웠어요"); viewSettle(); })
            .catch(function(e){ toast(emsg(e),true); }); });''')

# ② 충전 묶음 지우기 — 종류 · 건수 · 금액을 보여 주고 확인한 뒤에만
rep('''    b.onclick=function(){
      api("hqPackDel",[b.getAttribute("data-pkd")]).then(function(){ return loadAll(); })
        .then(function(){ toast("지웠어요"); render(); })
        .catch(function(e){ toast(emsg(e),true); });
    };''',
'''    b.onclick=function(){
      var pkId=b.getAttribute("data-pkd"), p=(D.packs||[]).filter(function(x){ return String(x.id)===pkId; })[0]||{};
      confirmBox("충전 묶음을 지울까요?",
        "종류: "+(p.kind==="tax"?"세금계산서":"문자")+"\\n건수: "+(Number(p.qty)||0).toLocaleString("ko-KR")+"건\\n금액: "+won(p.price)+"\\n그 뒤: 업체 화면에서 이 묶음을 더 살 수 없어요",
        "지우기", true, function(){
        api("hqPackDel",[pkId]).then(function(){ return loadAll(); })
          .then(function(){ toast("지웠어요"); render(); })
          .catch(function(e){ toast(emsg(e),true); }); });
    };''')

# ③ 결제 건 지우기 — 업체 · 기간 · 금액 줄
rep('''    confirmBox("결제 건 지우기","이 기록을 지워요. 회계 증빙이 필요하면 지우지 말고 «취소» 상태로 두세요.",''',
    '''    confirmBox("결제 건 지우기","업체: "+(p.shopName||p.biz_name||"-")+"\\n기간: "+(p.period||"-")+"\\n금액: "+won(p.amount)+"\\n회계 증빙이 필요하면 지우지 말고 «취소» 상태로 두세요.",''')

# ④ 보류(로그인 막기)로 바꿀 때만 저장 전에 묻기
rep('''    if(!v.name) return toast("업체명을 넣어 주세요",true);
    api("hqShopSave",[code,v]).then(function(){ return loadAll(); })
      .then(function(){ closeSheet(); toast("저장했어요"); render(); })
      .catch(function(e){ toast(emsg(e),true); });''',
'''    if(!v.name) return toast("업체명을 넣어 주세요",true);
    function go(){ api("hqShopSave",[code,v]).then(function(){ return loadAll(); })
      .then(function(){ closeSheet(); toast("저장했어요"); render(); })
      .catch(function(e){ toast(emsg(e),true); }); }
    if(s.active!==false && v.active===false)
      confirmBox("이 업체를 보류할까요?","업체: "+(s.name||code)+"\\n그 뒤: 이 업체 사람들 모두 로그인할 수 없어요 (자료는 남아요)","보류하고 저장", true, go);
    else go();''')
rep('''    if(!v.name) return toast("이름을 넣어 주세요",true);
    api("hqUserSave",[phone,v]).then(function(){ return loadAll(); })
      .then(function(){ closeSheet(); toast("저장했어요"); render(); })
      .catch(function(e){ toast(emsg(e),true); });''',
'''    if(!v.name) return toast("이름을 넣어 주세요",true);
    function go(){ api("hqUserSave",[phone,v]).then(function(){ return loadAll(); })
      .then(function(){ closeSheet(); toast("저장했어요"); render(); })
      .catch(function(e){ toast(emsg(e),true); }); }
    if(u.active!==false && v.active===false)
      confirmBox("이 계정을 보류할까요?","이름: "+(u.name||"-")+"\\n업체: "+(u.shopName||u.shop||"-")+"\\n그 뒤: 이 계정은 로그인할 수 없어요","보류하고 저장", true, go);
    else go();''')

# ⑤ 폰 단추 · 도구줄 높이 42px (규칙: 좁은 화면 42px)
rep('''  button.btn{height:38px;font-size:13px;padding:0 12px}
  .tools > input[type=date],.tools > input[type=text],.tools > select,.tools > button.btn,.tools > label.chip{height:38px}''',
'''  button.btn{height:42px;font-size:13px;padding:0 12px}
  .tools > input[type=date],.tools > input[type=text],.tools > select,.tools > button.btn,.tools > label.chip{height:42px}''')

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
