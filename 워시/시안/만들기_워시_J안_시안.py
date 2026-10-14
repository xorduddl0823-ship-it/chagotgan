"""J안 4판(디자인 서랍)에서 워시 J안 시안을 만든다. 원본은 읽기만 한다."""
import re, sys
SRC = "/home/user/chagotgan/디자인/차곳간_공통_E안_클로드코드_전달파일/08_차곳간_합친디자인_J.html"
OUT = sys.argv[1]
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n < 1:
        raise SystemExit("못 찾음: " + old[:80])
    s = s.replace(old, new, count)

# 1) 제목
rep("<title>차곳간 합친 디자인 J</title>", "<title>워시 J안 시안</title>")

# 2) 메뉴: 화면마다 열쇠를 붙이고, 설정 안 «휴지통»은 뺌 (결정: 휴지통은 사람 버튼 안)
rep('''var MENU=[["홈",[["홈","home"]],"home"],["매출",[["매출"]],"chart"],["일감",[["입출고 내역","work"],["출고 기록"]],"car"],
  ["청구서",[["월별 청구서"]],"file"],["입출금",[["입·출금"],["받아야 할 금액"]],"wallet"],["세금계산서",[["세금계산서"]],"receipt"],
  ["자재",[["자재"]],"box"],["설정",[["우리 사업장"],["QR 코드"],["백업 · 기기"],["출고 지연 기준"],["거래처"],["직원 계정"],["작업 항목 · 단가표"],["배달 도착지"],["입금 자동 확인"],["알림"],["발송함"],["휴지통"]],"gear"]];''',
'''var MENU=[["홈",[["홈","home"]],"home"],["매출",[["매출 내역","sales"]],"chart"],["일감",[["입출고 내역","work"],["출고 기록","outlog"]],"car"],
  ["청구서",[["월별 청구서","bill"]],"file"],["입출금",[["입·출금","money"],["받아야 할 금액","due"]],"wallet"],["세금계산서",[["세금계산서","tax"]],"receipt"],
  ["자재",[["자재","mat"]],"box"],["설정",[["우리 사업장"],["QR 코드"],["백업 · 기기"],["출고 지연 기준"],["거래처"],["직원 계정"],["작업 항목 · 단가표"],["배달 도착지"],["입금 자동 확인"],["알림"],["발송함"]],"gear"]];''')

# 3) 관리(본사)는 이 시안에서 뺌 — 워시 서랍 시안이라 워시만
i = s.index("admin:{ label:\"관리\"")
j = s.index("\n};\nvar PK=", i)
s = s[:i].rstrip().rstrip(",") + s[j:]
rep('var PK="wash"; try{ var pk0=localStorage.getItem("cgg_prod"); if(PR[pk0]) PK=pk0; }catch(e){}', 'var PK="wash";')
rep('''function setProd(k){ var kk=key()||"work"; useProduct(k); try{ localStorage.setItem("cgg_prod",k); }catch(e){}''',
    '''function setProd(k){ var kk=key()||"work"; useProduct(k);''')

# 4) 사람 버튼 ▾ 안 휴지통 — 이미 들어 있음. 문구만 분명하게
rep('<button>휴지통 <small>3건</small></button>', '<button id="openTrash">휴지통 <small>3건</small></button>')

# 5) 새 화면들 + 그리기 연결
NEW = r'''
/* ═════════ 워시 화면 (워시 방 추가) — 틀 · 부품은 J안 그대로, 내용은 워시 원본 화면에서 ═════════ */
var GS={};  /* 화면마다 고른 줄 */
function gsel(k){ return GS[k]||(GS[k]={}); }
function gselN(k){ var o=gsel(k); return Object.keys(o).filter(function(i){ return o[i]; }).length; }
function headH(crumb, h1, desc, btns){
  return '<div class="j-head"><div class="j-hello"><small>'+crumb+' · 10월 13일 화요일</small><h1>'+h1+'</h1>'+(desc?'<p>'+desc+'</p>':'')+'</div>'
    + '<div class="acts">'+(btns||"")+'</div></div>';
}
function kpiRow(nums){
  return '<div class="j-kpis"'+(nums.length===3?' style="grid-template-columns:repeat(3,minmax(0,1fr))"':'')+'>'+nums.map(function(k){ return '<div class="j-card j-kpi"><small><i style="background:'+k[6]+'"></i>'+k[0]+'</small>'+(k[5]?spark(k[5],k[6]):'')
    + '<strong>'+k[1]+'<em>'+k[2]+'</em></strong><span class="tr '+k[4]+'">'+k[3]+(k[3]?' <span>'+(k[7]||"지난달보다")+'</span>':'')+'</span></div>'; }).join("")+'</div>';
}
/* 표 — 열 차례 규칙(☐ → 이름 → 번호 → 내용 → 날짜 → 금액 → 상태) 그대로. 폰은 목록 */
function gtable(k, cols, rows, mline, chips){
  var sel=gsel(k), WD={name:180,id:130,text:0,date:96,time:120,money:130,state:110,num:90};
  return '<div class="j-card">'+(chips?'<div class="j-filters">'+chips.map(function(c,i){ return '<button class="j-fp'+(i?'':' on')+'">'+c+'</button>'; }).join("")+'<span class="sp"></span><label class="j-find">'+ic("search")+'<input placeholder="검색" aria-label="검색"></label></div>':'')
    + '<div class="j-twrap"><table class="j-table"><colgroup><col style="width:52px">'+cols.map(function(c){ return '<col'+(WD[c[1]]?' style="width:'+WD[c[1]]+'px"':'')+'>'; }).join("")+'</colgroup>'
    + '<thead><tr><th class="fx0"><input type="checkbox" data-gall="'+k+'" aria-label="전체 선택"'+(rows.length&&rows.every(function(x,i){return sel[i];})?' checked':'')+'></th>'
    + cols.map(function(c,j){ return '<th class="'+(j===0?'fx1 ':'')+(c[1]==="money"||c[1]==="num"?'n':c[1]==="state"?'c':'')+'">'+c[0]+'</th>'; }).join("")+'</tr></thead><tbody>'
    + rows.map(function(x,i){ return '<tr><td class="fx0"><input type="checkbox" data-gk="'+k+'" data-gi="'+i+'"'+(sel[i]?' checked':'')+' aria-label="'+esc(x[0])+' 선택"></td>'
        + cols.map(function(c,j){ var v=x[j];
            if(c[1]==="money") return '<td class="n">'+won(v)+'원</td>';
            if(c[1]==="num") return '<td class="n">'+esc(v)+'</td>';
            if(c[1]==="state") return '<td class="c"><span class="j-badge2 '+v[1]+'">'+esc(v[0])+'</span></td>';
            return '<td'+(j===0?' class="fx1"':'')+'>'+esc(v)+'</td>'; }).join("")+'</tr>'; }).join("")
    + '</tbody></table></div>'
    + '<div class="j-mlist">'+rows.map(function(x,i){ var st=cols.filter(function(c){return c[1]==="state";}).length?x[cols.length-1]:null, mi=cols.map(function(c){return c[1];}).lastIndexOf("money");
        return '<label class="j-mrow"><input type="checkbox" data-gk="'+k+'" data-gi="'+i+'"'+(sel[i]?' checked':'')+' aria-label="'+esc(x[0])+' 선택">'
        + '<span class="t"><b>'+esc(x[0])+'<span>'+esc(x[1])+'</span></b><small>'+esc(mline(x))+'</small></span>'
        + '<span class="r">'+(mi>=0?'<b>'+won(x[mi])+'원</b>':'')+(st?'<span class="j-badge2 '+st[1]+'">'+esc(st[0])+'</span>':'')+'</span></label>'; }).join("")+'</div>'
    + '<div class="j-pager"><span>총 '+rows.length+'건</span><span class="sp"></span><select aria-label="한 번에 보일 개수"><option>10개씩 보기</option></select><button class="j-btn" disabled>이전</button><button class="j-btn" disabled>다음</button></div></div>';
}
function helpH(t){ return '<details class="j-card j-help"><summary>이 화면 사용법</summary><p>'+t+'</p></details>'; }

/* 매출 내역 — 체크에서 옮겨 온 지금 워시 화면 구성 그대로(올해 숫자 · 달 막대 · 월별/년별 표 · 부가세 포함/별도) */
var SAL=[["2026.10",131,4820000,3660000],["2026.09",142,5310000,5310000],["2026.08",118,4390000,4390000],["2026.07",125,4710000,4710000],["2026.06",109,4020000,4020000],["2026.05",121,4550000,4550000],
         ["2026.04",113,4180000,4180000],["2026.03",104,3870000,3870000],["2026.02",88,3240000,3240000],["2026.01",97,3610000,3610000],["2025.12",101,3790000,3790000],["2025.11",95,3520000,3520000]];
var VAT="in";
function sales(){
  var d=VAT==="in"?1:1/1.1, mx=Math.max.apply(null,SAL.map(function(r){return r[2];}));
  var bars=SAL.slice().reverse().map(function(r,i,a){ var h=Math.round(r[2]/mx*100); return '<div class="w-bar'+(i===a.length-1?' on':'')+'"><span class="v">'+Math.round(r[2]*d/10000).toLocaleString("ko-KR")+'</span><i style="height:'+h+'%"></i><small>'+(+r[0].slice(5))+'월</small></div>'; }).join("");
  var rows=SAL.map(function(r,i){ var p=SAL[i+1], up=p?Math.round((r[2]-p[2])/p[2]*100):null;
    return [r[0], r[1]+"대", Math.round(r[2]/r[1]*d), Math.round(r[2]*d), up===null?["-","run"]:[(up>=0?"▲ ":"▼ ")+Math.abs(up)+"%", up>=0?"done":"stop"]]; });
  return headH("매출 › 매출 내역", '이번 달 매출 <em>'+won(Math.round(4820000*d))+'원</em>, 지난달보다 <em>9% 적어요</em>', "출고한 차의 금액을 달마다 모아서 보여 줘요.",
      '<span class="w-seg" role="group" aria-label="부가세"><button class="'+(VAT==="in"?'on':'')+'" data-vat="in">부가세 포함</button><button class="'+(VAT==="ex"?'on':'')+'" data-vat="ex">부가세 별도</button></span><button class="j-btn">'+ic("down")+'엑셀 다운로드</button>')
    + kpiRow([["올해 매출",won(Math.round(42690000*d)),"원","+14%","",[2.9,3.2,3.6,3.9,4.2,4.4,4.27],"#0B2545","작년보다"],["이번 달 매출",won(Math.round(4820000*d)),"원","−9%","dn",[4.0,4.5,4.7,4.4,5.3,4.8],"#1668C4"],
              ["이번 달 대수","131","대","−11","dn",[109,125,118,142,131],"#4C93E0"],["대당 평균",won(Math.round(36800*d)),"원","+2%","",[35,36,37,37,36.8],"#E08A00"]])
    + '<div class="j-card j-sec"><h3>최근 12달 매출 <span style="font-size:13px;color:var(--sub);font-weight:500">만 원</span><a>년별 매출 보기</a></h3><div class="w-bars">'+bars+'</div></div>'
    + '<div class="j-subtabs"><button class="j-subtab on">월별 매출</button><button class="j-subtab">년별 매출</button></div>'
    + gtable("sales", [["월","name"],["대수","num"],["대당 평균","money"],["매출","money"],["지난달보다","state"]], rows, function(x){ return '대당 평균 '+won(x[2])+'원'; })
    + helpH("저장된 금액은 부가세가 포함된 금액이에요. «부가세 별도»를 누르면 1.1로 나눈 금액으로 보여 줘요. 위쪽 막대를 보면 달마다 늘었는지 줄었는지 한눈에 알 수 있어요.");
}
/* 출고 기록 — 원본: 차가 어디로 갔는지 · 딜러에게 알림이 나갔는지 */
var OUTL=[["솜카","11바 2323","GV80 · 성수동 전시장","10.13 10:20",300000,["보냄","done"]],["오토플러스","22사 6767","아반떼 CN7 · 상사 매장","10.13 11:45",40000,["보냄","done"]],
          ["한빛모터스","34나 1188","팰리세이드 · 탁송 대기","10.13 12:10",220000,["실패","stop"]],["솜카","55차 2828","벤츠 E220d · 손님 인도","10.12 17:30",50000,["보냄","done"]],
          ["대성상사","56다 7741","쏘나타 DN8 · 상사 매장","10.12 16:05",150000,["보냄","done"]],["서울카","78라 1010","그랜저 GN7 · 성수동 전시장","10.12 14:40",180000,["예약","run"]]];
function outlog(){ var n=gselN("outlog");
  return headH("일감 › 출고 기록", '오늘 출고 <em>3대</em>, 알림 실패 <em>1건</em>이 있어요', "차가 어디로 갔는지, 딜러에게 알림이 나갔는지 한눈에 봐요.",
      '<button class="j-btn">'+ic("down")+'엑셀 다운로드</button><button class="j-btn pri"'+(n?'':' disabled')+'>선택한 차 알림 다시 보내기'+(n?' ('+n+')':'')+'</button>')
    + subtabs()
    + kpiRow([["오늘 출고","3","대","+1","",[2,4,3,5,2,3],"#1E9E5A","어제보다"],["알림 보냄","5","건","","",null,"#1668C4"],["알림 실패","1","건","","",null,"#D64545"]])
    + gtable("outlog", [["상사","name"],["차량번호","id"],["차종 · 목적지","text"],["출고 시각","time"],["금액","money"],["알림","state"]], OUTL, function(x){ return x[2]+' · '+x[3]; },
        ["오늘","어제","최근 7일","이번 달","지난 달"])
    + '<details class="j-card j-help"><summary>출고 문자 설정</summary><p>출고할 때 딜러에게 자동으로 나가는 문자의 문구와 보내는 방식(사진 + 글자 · 사진만 · 글자만 · 간단히)을 여기서 고쳐요. 목적지에 주소가 있으면 지도 링크도 붙일 수 있어요. 내 번호로 먼저 시험해 볼 수 있어요.</p></details>'
    + helpH("알림이 «실패»인 차를 선택하고 «선택한 차 알림 다시 보내기»를 누르면 같은 문자를 다시 보내요.");
}
/* 월별 청구서 — 원본 1. 청구서 만들기 · 2. 청구서 보내기 */
var BILL=[["솜카","김영","광택 6 · 세차 4 · 실내 2","10대",1730000,["보냄","done"]],["한빛모터스","박준","광택 5 · 세차 3","8대",1260000,["보냄","done"]],
          ["대성상사","이도","광택 4 · 실내 2","6대",1170000,["안 보냄","chk"]],["서울카","최민","광택+실내 3 · 실내 2","5대",830000,["안 보냄","chk"]],
          ["미래자동차","정우","광택 4","4대",880000,["입금 대기","stop"]],["오토플러스","한결","세차 3","3대",120000,["안 보냄","chk"]]];
function bill(){ var n=gselN("bill");
  return headH("청구서 › 월별 청구서", '10월 청구서 <em>6곳</em> 중 <em>4곳</em>을 아직 안 보냈어요', "한 달치 입출고를 모아 청구서를 만들고, 그대로 문자로 보내요.",
      '<button class="j-btn">'+ic("file")+'미리보기 · 인쇄</button><button class="j-btn">'+ic("down")+'엑셀 다운로드</button><button class="j-btn pri"'+(n?'':' disabled')+'>선택한 곳 보내기'+(n?' ('+n+')':'')+'</button>')
    + '<div class="j-card j-sec"><h3><span class="w-step">1</span>청구서 만들기<a>JPG로 다운로드</a></h3><div class="w-opts">'
    + '<label>청구 기준<span class="w-seg"><button class="on">딜러별</button><button>매매상사별</button></span></label>'
    + '<label>금액 없는 곳<span class="w-seg"><button class="on">빼기</button><button>넣기</button></span></label>'
    + '<label>어떤 차까지<span class="w-seg"><button class="on">출고된 차만</button><button>작업 중인 차도</button></span></label>'
    + '<button class="j-btn">청구서 만들기</button></div></div>'
    + kpiRow([["청구 금액","5,990,000","원","+12%","",[4.2,4.6,4.9,5.3,5.99],"#0B2545"],["청구 대수","36","대","+4","",[28,30,33,32,36],"#1668C4"],["안 보낸 곳","4","곳","","",null,"#E08A00"]])
    + gtable("bill", [["상사","name"],["받는 분","id"],["작업 내역","text"],["대수","num"],["금액","money"],["보낸 상태","state"]], BILL, function(x){ return x[3]+' · '+x[2]; })
    + '<details class="j-card j-help"><summary><span class="w-step">2</span>청구서 보내기 — 문구 · 입금 계좌 · 예약 발송</summary><p>왼쪽에서 문구를 고치면 오른쪽 문자 모양이 바로 바뀌어요. 넣을 수 있는 값: {업체} {받는분} {기간} {대수} {금액} {계좌}. 내 번호로 먼저 시험하거나, 보낼 날을 정해 예약 발송할 수 있어요.</p></details>'
    + helpH("청구 기준을 고르고 «청구서 만들기»를 누르면 아래 표가 만들어져요. 보낼 곳을 선택하고 «선택한 곳 보내기»를 누르면 문자로 나가요.");
}
/* 자재 — 원본: 재고 적기 · 부족하면 도매상에 주문 문자 */
var MATS=[["광택약 3M 퍼펙트잇","대한상사","통 · 안전재고 4",2,["부족","stop"]],["휠크리너","대한상사","통 · 안전재고 6",9,["넉넉","done"]],["극세사 타월","으뜸유통","장 · 안전재고 50",34,["부족","stop"]],
          ["실내 세정제","으뜸유통","통 · 안전재고 3",5,["넉넉","done"]],["코팅제","카케어몰","병 · 안전재고 5",6,["넉넉","done"]]];
function mat(){ var n=gselN("mat");
  return headH("자재", '부족한 자재가 <em>2종</em> 있어요', "광택약 · 휠크리너 같은 자재 재고를 적어 두고, 모자라면 도매상에 주문 문자를 보내요.",
      '<button class="j-btn">자재 설정</button><button class="j-btn"'+(n?'':' disabled')+'>선택한 자재 주문 문자'+(n?' ('+n+')':'')+'</button><button class="j-btn pri">'+ic("plus")+'자재 추가</button>')
    + kpiRow([["자재 종류","5","종","","",null,"#1668C4"],["자재 부족","2","종","","",null,"#D64545"],["이번 달 구매","312,000","원","−8%","dn",[3.6,3.1,3.4,3.12],"#0B2545"]])
    + gtable("mat", [["자재 이름","name"],["도매상","id"],["단위 · 안전재고","text"],["지금 재고","num"],["상태","state"]], MATS, function(x){ return x[1]+' · 재고 '+x[3]+' · '+x[2]; })
    + '<details class="j-card j-help"><summary>도매상 목록 · 최근 들어오고 나간 기록</summary><p>자재 사는 곳을 한 곳에 모아 둬요. 여기서 이름 · 번호를 고치면 그 도매상을 쓰는 자재에도 같이 바뀌어요.</p></details>'
    + helpH("자재를 누르면 구매 · 사용을 적을 수 있어요. 지금 재고가 안전재고보다 적으면 «부족»으로 바뀌어요.");
}
/* 입출금 · 세금계산서 — 대표님 결정: 서버 이사 뒤 체크 화면을 그대로 옮겨 옴. 이 시안에서는 자리만 */
function later(){
  var t={money:["입·출금","통장에 들어오고 나간 금액을 한 표로 봐요. 통장 연결 안내는 «입금 처리» 카드 안으로 들어가요."],
         due:["받아야 할 금액","청구서를 보냈는데 아직 입금되지 않은 곳을 모아 봐요."],
         tax:["세금계산서","한 달치를 모아 버튼 한 번으로 발급해요."]}[key()];
  return headH(esc(MENU[g][0])+" › "+t[0], esc(t[0]), t[1], "") + subtabs()
    + '<div class="j-place"><b>서버 이사가 끝난 뒤에 만들어요.</b><br>대표님 결정대로 이 화면은 <b>체크의 화면을 그대로 옮겨 와요</b>. 모양은 이 시안과 같은 J안 틀을 써요.<br>'
    + (key()==="money"?'통장 연결 안내는 «입금 처리» 카드 안에 넣어요.':key()==="tax"?'워시에만 있던 계산서 기능 6가지는 체크 화면으로 바꿔요.':'«입금 자동 맞추기»는 서버에 새 창구가 생긴 뒤에 넣어요.')+'</div>';
}
function setPlace(){
  return headH("설정 › "+esc(scrName()), esc(scrName()), "", "") + subtabs()
    + '<div class="j-place">설정 화면은 지금 워시의 내용 · 버튼을 그대로 두고 모양만 J안으로 바꿔요.<br><b>휴지통은 설정에서 빠지고, 오른쪽 위 사람 버튼 ▾ 안으로 옮겼어요.</b></div>';
}
function wireWash(M){
  each("[data-gi]", function(c){ c.onchange=function(){ gsel(c.getAttribute("data-gk"))[c.getAttribute("data-gi")]=c.checked; draw(); }; }, M);
  each("[data-gall]", function(c){ c.onchange=function(){ var k=c.getAttribute("data-gall"), o=gsel(k); each('[data-gk="'+k+'"]', function(x){ o[x.getAttribute("data-gi")]=c.checked; }, M); draw(); }; }, M);
  each("[data-vat]", function(b){ b.onclick=function(){ VAT=b.getAttribute("data-vat"); draw(); }; }, M);
}
'''
rep("/* ═════════ 그리기 ═════════ */", NEW + "\n/* ═════════ 그리기 ═════════ */")
rep('''var k=key(), body = k==="home"?home(): k==="work"?work(): place();''',
    '''var k=key(), body = k==="home"?home(): k==="work"?work(): k==="sales"?sales(): k==="outlog"?outlog(): k==="bill"?bill(): k==="mat"?mat()
    : (k==="money"||k==="due"||k==="tax")?later(): setPlace();''')
rep('''  if(FIELD) wireField(M);''', '''  if(FIELD) wireField(M); else wireWash(M);''')
rep('''    $("openScreen").onclick=function(){ drop=false; draw(); openScreen(); }; }''',
    '''    $("openScreen").onclick=function(){ drop=false; draw(); openScreen(); };
    $("openTrash").onclick=function(){ drop=false; draw(); openWin('<h3 id="wt">휴지통</h3><p class="desc">지운 기록이 30일 동안 여기 남아요. 되돌리거나 완전히 지울 수 있어요.</p><dl><dt>지운 기록</dt><dd>3건</dd><dt>위치</dt><dd>사람 버튼 ▾ 안 (설정 메뉴에서 옮김)</dd></dl><div class="ft"><button class="j-btn" data-close>닫기</button></div>'); }; }''')

# 6) 새 부품 모양 (J 값만 씀: 색 토큰 · 모서리 · 글자 크기)
CSS = '''
/* ── 워시 방 추가: 매출 막대 · 두 칸 고르기 · 청구서 단계 ── */
.w-bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;align-items:end;height:190px;padding-top:6px}
.w-bar{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px;min-width:0}
.w-bar i{display:block;width:100%;max-width:34px;background:#C9DDF3;border-radius:6px 6px 2px 2px}
.w-bar.on i{background:var(--blue)}
.w-bar .v{font-size:11.5px;color:var(--sub);font-variant-numeric:tabular-nums}
.w-bar.on .v{color:var(--blue);font-weight:700}
.w-bar small{font-size:12px;color:var(--sub)}
.w-seg{display:inline-flex;border:1px solid var(--ln2);border-radius:10px;overflow:hidden;background:#fff;height:var(--ctl)}
.w-seg button{border:0;background:none;font:inherit;font-size:13.5px;padding:0 14px;color:#344054;cursor:pointer}
.w-seg button+button{border-left:1px solid var(--ln2)}
.w-seg button.on{background:var(--tabon);color:var(--blue);font-weight:700}
.w-step{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;font-size:12.5px;font-weight:900}
.w-opts{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:flex-end}
details.j-help summary .w-step{margin-right:8px}
.w-opts label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--sub);font-weight:700}
.mock.vm .j-kpis[style] .sp{display:none}
.mock.vm .w-bars{gap:4px;height:140px}
.mock.vm .w-bar .v{display:none}
.mock.vm .w-bar small{font-size:10.5px}
.mock.vm .w-seg{height:38px}
.mock.vm .w-seg button{padding:0 10px;font-size:12.5px}
.mock.vm .w-opts{gap:10px}
.mock.vm .w-opts .j-btn{width:100%;justify-content:center}
'''
rep("</style>", CSS + "</style>")

# 7) 바깥 안내 페이지 — 워시용으로
a = s.index('<div class="pg">'); b = s.index('<div id="dim" hidden></div>')
PG = '''<div class="pg">
  <h1>워시 J안 시안</h1>
  <p class="lead">
    디자인 방의 <b>합친 디자인 J안(4판)</b> 틀을 그대로 쓰고, 그 안에 <b>워시의 실제 메뉴</b>를 채운 시안이에요.
    J안에서 자리만 있던 <b>매출 내역 · 출고 기록 · 월별 청구서 · 자재</b>를 새로 그렸어요. 숫자와 이름은 예시예요.
    <b>지금 쓰는 워시 화면은 하나도 바꾸지 않았어요</b> (다음 주 시험은 지금 화면으로 해요).
  </p>
  <div class="pick" role="group" aria-label="메뉴 배치">
    <span>메뉴 배치</span>
    <button class="pb" data-ly="top" aria-pressed="false">가로 메뉴</button>
    <button class="pb" data-ly="side" aria-pressed="true">세로 메뉴</button>
    <button class="pb" data-ly="icon" aria-pressed="false">아이콘 메뉴</button>
  </div>
  <div class="pick" role="group" aria-label="화면">
    <span>화면</span>
    <button class="pb" data-scr="home" aria-pressed="false">홈</button>
    <button class="pb" data-scr="sales" aria-pressed="false">매출 내역</button>
    <button class="pb" data-scr="work" aria-pressed="true">입출고 내역</button>
    <button class="pb" data-scr="outlog" aria-pressed="false">출고 기록</button>
    <button class="pb" data-scr="bill" aria-pressed="false">월별 청구서</button>
    <button class="pb" data-scr="mat" aria-pressed="false">자재</button>
    <button class="pb" data-scr="field" aria-pressed="false">현장 화면 (폰)</button>
  </div>
  <div class="pick" role="group" aria-label="보기 방식">
    <span>보기</span>
    <button class="pb" data-v="fit" aria-pressed="true">PC 한눈에</button>
    <button class="pb" data-v="full" aria-pressed="false">PC 원래 크기</button>
    <button class="pb" data-v="vm" aria-pressed="false">폰 화면</button>
  </div>

  <div class="stage fit" id="stage"><section class="mock" id="mock" aria-label="시안 화면"></section></div>
  <p class="hint" id="hint">PC 화면(가로 1280)을 화면 폭에 맞춰 줄였어요. 글씨가 작으면 «PC 원래 크기»를 눌러 보세요.</p>

  <div class="note">
    <h2>이번 시안에서 한 것</h2>
    <ul>
      <li><b>휴지통 자리 — 「나」안</b>: 설정 메뉴에서 휴지통을 빼고, 오른쪽 위 <b>사람 버튼 ▾ 안</b>에만 두었어요. 눌러 보면 휴지통 창이 열려요.</li>
      <li><b>매출 내역</b>: 지금 워시 화면(체크에서 옮겨 온 것)의 구성 그대로 — 올해 숫자, 최근 12달 막대, 월별/년별 표, <b>부가세 포함 · 별도</b> 바꾸기(눌러 보세요).</li>
      <li><b>출고 기록</b>: 차가 어디로 갔는지와 딜러 알림 상태(보냄 · 실패 · 예약). 실패한 건만 골라 다시 보내기. 출고 문자 설정은 접힌 카드 안.</li>
      <li><b>월별 청구서</b>: 원본 순서 그대로 «1. 청구서 만들기 → 2. 청구서 보내기». 청구 기준(딜러별 · 매매상사별) 같은 고르기는 두 칸 버튼으로.</li>
      <li><b>자재</b>: 자재 종류 · 부족 · 이번 달 구매 숫자, 재고 표, 부족한 자재 주문 문자.</li>
      <li><b>입·출금 · 받아야 할 금액 · 세금계산서</b>: 대표님 결정대로 <b>서버 이사 뒤</b> 체크 화면을 옮겨 올 자리만 표시했어요.</li>
      <li>홈 · 입출고 내역 · 현장 화면은 J안 4판 그대로예요.</li>
    </ul>
    <p><b>지킨 것</b> — 탭 순서 그대로 · 표 열 차례(☐ → 이름 → 번호 → 내용 → 날짜 → 금액 → 상태) · 해요체 쉬운 말 · J안 색과 크기만 사용 · 폰은 표 대신 목록.
      공통 틀과 스타일은 디자인 방 것이라 고치지 않았어요. 새로 넣은 부품(매출 막대 · 두 칸 버튼 · 단계 번호)은 디자인 방에 공통 부품으로 넣을지 물어볼게요.</p>
  </div>
  <div class="note">
    <h2>말 바꾼 곳 (지금 워시 → 시안)</h2>
    <p>J안 «말 바꾼 곳» 29줄 규칙을 따랐어요. 마음에 안 드는 줄은 말씀만 주세요.</p>
    <div class="wt"><table><thead><tr><th>어디</th><th>지금 워시</th><th>시안</th></tr></thead><tbody>
    <tr><td>모든 화면</td><td class="old">엑셀로 받기</td><td class="new">엑셀 다운로드</td></tr>
    <tr><td>출고 기록</td><td class="old">선택항목 재발송</td><td class="new">선택한 차 알림 다시 보내기</td></tr>
    <tr><td>출고 기록</td><td class="old">…알림이 나갔는지 한눈에 봅니다.</td><td class="new">…알림이 나갔는지 한눈에 봐요.</td></tr>
    <tr><td>출고 기록</td><td class="old">출고 문자 — 문구와 보내는 방식</td><td class="new">출고 문자 설정 (접힌 카드)</td></tr>
    <tr><td>월별 청구서</td><td class="old">딜러별로 청구 · 매매상사별로 청구</td><td class="new">청구 기준: 딜러별 · 매매상사별</td></tr>
    <tr><td>월별 청구서</td><td class="old">금액 없는 청구처 제외하기 · 포함하기</td><td class="new">금액 없는 곳: 빼기 · 넣기</td></tr>
    <tr><td>월별 청구서</td><td class="old">출고된 차만 · 작업 중인 차도 포함</td><td class="new">어떤 차까지: 출고된 차만 · 작업 중인 차도</td></tr>
    <tr><td>월별 청구서</td><td class="old">청구서 미리보기 · 인쇄 / 🖼 청구서 JPG로 받기 (청구처별)</td><td class="new">미리보기 · 인쇄 / JPG로 다운로드</td></tr>
    <tr><td>월별 청구서</td><td class="old">선택항목 보내기 · 선택항목 보냄 표시 지우기</td><td class="new">선택한 곳 보내기 (보냄 표시 지우기는 실제 반영 때 «더보기» 안에 둘 예정)</td></tr>
    <tr><td>자재</td><td class="old">＋ 자재 추가 · 📩 부족 자재 주문 문자 · ⚙ 자재 설정</td><td class="new">자재 추가 · 선택한 자재 주문 문자 · 자재 설정 (그림 문자 뺌)</td></tr>
    <tr><td>자재</td><td class="old">🏪 도매상 목록 · 최근 들어오고 나간 기록</td><td class="new">접힌 카드 «도매상 목록 · 최근 들어오고 나간 기록»</td></tr>
    <tr><td>설정</td><td class="old">설정 › 휴지통</td><td class="new">사람 버튼 ▾ › 휴지통 (대표님 「나」안)</td></tr>
    </tbody></table></div>
  </div>
</div>

'''
s = s[:a] + PG + s[b:]
open(OUT, "w", encoding="utf-8").write(s)
print("OK", len(s))
