/* 완성 미리보기 — 관리 · 딜러앱 · 홈페이지 «후» 화면 (공통 부품 1.13 으로 그린 모양만 · 지어낸 예시 자료만)
   차례 · 글자는 지금 판 그대로: 관리 v4.8.2 · 딜러앱 d3.9 · 홈페이지 소개 시안 · 통합 입구 v11.14 · join_v6
   돈 계산 · 업무 로직은 그리지 않아요(단추는 «미리보기» 알림만). 완성_미리보기.html 이 이 파일을 먼저 불러요. */
var PVX=(function(){
  /* ── 메뉴 지도 (워시 · 체크 메뉴 지도와 같은 모양) ── */
  var ADMIN={
    groups:[
      {key:"home",label:"홈",icon:"home",subs:[{key:"main",label:"홈"},{key:"ops",label:"운영 상태"}]},
      {key:"acct",label:"계정",icon:"user",subs:[{key:"code",label:"가입 코드"},{key:"list",label:"계정 관리"},{key:"find",label:"휴대폰 번호로 계정 찾기"}]},
      {key:"biz",label:"업체",icon:"shop",subs:[{key:"list",label:"업체 관리"},{key:"lock",label:"잠금 · 차단"},{key:"wait",label:"결제 대기"},{key:"check",label:"사업자 확인"}]},
      {key:"in",label:"받는 금액",icon:"wallet",subs:[{key:"plan",label:"요금제"},{key:"pay",label:"결제 내역"},{key:"cash",label:"충전"},{key:"card",label:"카드 결제"},{key:"link",label:"체크 지갑 연결"}]},
      {key:"out",label:"내는 금액",icon:"chart",subs:[{key:"settle",label:"정산"},{key:"keep",label:"유지비"}]},
      {key:"tax",label:"세금계산서",icon:"receipt"},
      {key:"noti",label:"알림",icon:"bell",subs:[{key:"due",label:"기한 안내 문자"},{key:"notice",label:"공지사항"},{key:"tpl",label:"알림톡 템플릿"},{key:"log",label:"발송 기록"}]},
      {key:"set",label:"설정",icon:"gear",subs:[{key:"sec",label:"보안 점검"},{key:"me",label:"내 계정"}]}],
    tabs:[{key:"home",icon:"home",label:"홈"},{key:"biz",icon:"shop",label:"업체"},{key:"in",icon:"wallet",label:"받는 금액"},{key:"tax",icon:"receipt",label:"계산서"},{key:"__all",icon:"more",label:"전체"}],
    feats:[
      {id:"a-code",label:"가입 코드 주기",path:"계정 › 가입 코드",go:"acct/code",words:"가입 코드 새 업체 휴대폰"},
      {id:"a-find",label:"휴대폰 번호로 계정 찾기",path:"계정 › 휴대폰 번호로 계정 찾기",go:"acct/find",words:"번호 계정 찾기 잠금 풀기"},
      {id:"a-biz",label:"업체 관리",path:"업체 › 업체 관리",go:"biz/list",words:"업체 요금제 기한"},
      {id:"a-pay",label:"결제 내역",path:"받는 금액 › 결제 내역",go:"in/pay",words:"결제 환불 입금 확인"},
      {id:"a-tax",label:"세금계산서 발행",path:"세금계산서",go:"tax",words:"세금계산서 팝빌 발행"},
      {id:"a-tpl",label:"알림톡 템플릿",path:"알림 › 알림톡 템플릿",go:"noti/tpl",words:"알림톡 템플릿 코드 카카오"},
      {id:"a-sec",label:"보안 점검",path:"설정 › 보안 점검",go:"set/sec",words:"보안 점검 위험"}],
    quickKey:"cgg_admin_quick", quickDefault:["a-pay","a-tax","a-biz","a-code"]};
  var DEALER={
    groups:[{key:"home",label:"홈",icon:"home"},{key:"cars",label:"내 차",icon:"car"},{key:"noti",label:"알림",icon:"bell"},{key:"bill",label:"청구서",icon:"file"},{key:"hist",label:"카히스토리",icon:"search"},{key:"me",label:"내 정보",icon:"user"}],
    tabs:[{key:"home",icon:"home",label:"홈"},{key:"cars",icon:"car",label:"내 차"},{key:"noti",icon:"bell",label:"알림"},{key:"bill",icon:"file",label:"청구서"},{key:"__all",icon:"more",label:"전체"}],
    feats:[{id:"d-cars",label:"내 차 보기",path:"내 차",go:"cars",words:"차 위치 작업 상품화"},{id:"d-bill",label:"청구서 보기",path:"청구서",go:"bill",words:"청구서 계좌 금액"},{id:"d-me",label:"알림 받기 설정",path:"내 정보",go:"me",words:"알림 끄기 켜기"}],
    quickKey:"cgg_dealer_quick", quickDefault:["d-cars","d-bill","d-me"]};

  /* ── 같은 틀로 그리는 화면 — 제목 · 띠 · 도구 · 숫자 칸 · 표 · 상자 ── */
  function G(s){ return function(m){
    m.innerHTML=head(s.t,s.d)+(s.band?slot("b"):"")+(s.tools?tools(s.tools()):"")+(s.k?slot("k"):"")+(s.pre?s.pre():"")+(s.cols?slot("t"):"")+(s.post?s.post():"")+(s.help?CGG.help(s.help):"");
    if(s.band) band("b",s.band); if(s.k) CGG.kpis(q("k"),s.k);
    if(s.cols){ var o={cols:s.cols,kinds:s.kinds,rows:s.rows,stateMap:s.map,tabs:s.tabs,find:s.find||"검색",mobileFields:s.mf,sort:s.sort};
      if(s.acts){ o.actions=function(r){ return s.acts(r); }; o.onAction=function(k,r){ (s.onAct||function(k,r){ ask(k==="del"?"지우기":k,r[0],"1건"); })(k,r); }; }
      tbl("t",Object.assign(o,s.bulk!==false?bulk(s.rows,0,s.bulk||[]):{select:false})); }   /* 일괄 단추가 없는 표는 고르기 칸 없음(1.13.2 F18) */
    if(s.after) s.after(m); }; }
  function card(t,d,body){ return bx(t,d,body); }
  function kv(rows){ return '<div class="small6" style="border:1px solid var(--line);border-radius:12px;overflow:hidden">'+rows.map(function(x){ return '<div><span>'+E(x[0])+'</span><b>'+E(x[1])+(x[2]?'<small>'+E(x[2])+'</small>':'')+'</b></div>'; }).join("")+'</div>'; }
  var BZ=[["예시 광택","W1001","워시","스탠다드","N일 남음 · 12","진행 중"],["가람 세차","W1002","워시","베이직","지남 3일","보류"],["누리 휠","W1003","휠","베이직","24일 남음","진행 중"],["예시 성능검사소","C2001","체크","스탠다드","기한 없음","진행 중"],["샘플 리페어","W1004","리페어","무료 체험","5일 남음","진행 중"]];

  var V={};
  /* ═══ 관리 ═══ */
  V.a_home=function(m){
    CGG.home(m,{date:"10월 18일 일요일",title:'결제일 지난 업체 <em>2곳</em>, 못 받은 금액 <em>330,000원</em>이 남아 있어요',desc:"오늘 10월 18일 · 09:00 기준",
      quick:{feats:ADMIN.feats,key:"cgg_admin_quick_pv",defs:ADMIN.quickDefault,onGo:goFeat},
      todo:{items:[{tone:"stop",icon:"wallet",title:"못 받은 금액 330,000원",sub:"결제일 지난 업체 2곳"},{tone:"chk",icon:"shop",title:"결제 대기 · 확인할 업체 3곳",sub:"홈페이지에서 가입만 한 곳"},{tone:"chk",icon:"alert",title:"유지비 — 끊기기 직전 1곳",sub:"문자 남은 금액이 적어요"}],total:6,onPick:toast("그 화면으로"),onAll:toast("할 일 모두 보기")},
      kpis:[{label:"업체",value:"42",unit:"곳",delta:"",vs:"진행 중 39곳 · 보류 3곳",spark:[30,32,35,36,38,40,42]},{label:"이번 달 들어온 금액",value:"2,310,000",unit:"원",delta:"",vs:"받은 비율 88%",spark:[1.2,1.5,1.7,1.9,2,2.2,2.31]},{label:"이번 달 나간 금액",value:"412,000",unit:"원",delta:"",vs:"남은 것 1,898,000원",spark:[.3,.32,.35,.38,.39,.4,.41]},{label:"못 받은 금액",value:"330,000",unit:"원",delta:"",vs:"입금 대기 2건",spark:[.1,.2,.25,.3,.33,.33,.33]}],
      cal:{y:2026,m:10,today:18,onMove:toast("달 옮기기"),onDay:toast("그날 자세히"),legend:[["pay","결제","run"],["due","기한","chk"]],amtLabel:"그날 결제",days:{1:{amt:550000,marks:[["pay",7]]},10:{amt:330000,marks:[["pay",4],["due",2]]},18:{marks:[["due",1]]},25:{amt:770000,marks:[["pay",10]]}}},
      money:{title:"이번 달 입금",big:2310000,bar:{done:2310000,total:2640000},legend:[["받은 것",2310000,"done"],["받을 것",330000,"chk"]],rows:[["결제한 업체","37곳"]],link:{label:"결제 내역",onClick:function(){ go("in/pay"); }}},
      rank:{title:"운영 상태",sub:"다달이 나가는 금액 · 남은 것",items:[{label:"자료 용량",value:"38%",pct:.38},{label:"차량 사진 용량",value:"61%",pct:.61},{label:"문자 남은 금액",value:"84,000원",pct:.2}],link:{label:"자세히 보기",onClick:function(){ go("home/ops"); }}},
      help:"관리 홈 차례도 워시 · 체크와 같아요: 자주 쓰는 기능 → 오늘 할 일 → 숫자 칸 4개 → 일정 · 이번 달 입금 · 운영 상태."}); };
  V.a_ops=G({t:"운영 상태",d:"자료 용량 · 차량 사진 · 다달이 나가는 금액을 한 번에 봐요.",tools:function(){ return btn("지금 다시 확인",true)+btn("유지비 화면으로"); },
    k:[{label:"자료 용량",value:"38",unit:"%"},{label:"차량 사진 용량",value:"61",unit:"%"},{label:"다달이 나가는 금액",value:"412,000",unit:"원"},{label:"문자 남은 금액",value:"84,000",unit:"원",tone:"due"}],
    cols:["업체","코드","사진 수","용량","마지막 올린 날"],kinds:["name","id","text","text","date"],rows:BZ.map(function(b,i){ return [b[0],b[1],(120+i*37)+"장",(0.4+i*0.3).toFixed(1)+"GB","10-"+(18-i)]; }),find:"업체 · 코드",bulk:false});
  V.a_code=G({t:"가입 코드",d:"여기에 넣은 휴대폰 번호만 새 업체로 가입할 수 있어요. 요금을 받기로 한 곳에만 주세요.",tools:function(){ return btn("＋ 가입 코드 주기",true); },
    cols:["휴대폰","업체명","상태","만들어진 업체","기한","준 날"],kinds:["name","text","state","text","date","date"],rows:[["010-****-0011","예시 광택","가입 완료","W1001","10-20","10-01"],["010-****-0012","가람 세차","기다리는 중","—","10-25","10-15"],["010-****-0013","누리 휠","기한 지남","—","10-10","09-30"]],
    map:{"가입 완료":"done","기다리는 중":"run","기한 지남":"chk"},find:"휴대폰 · 업체명",mf:[[1,"업체"],[2,"상태"],[4,"기한"]]});
  V.a_accts=G({t:"계정 관리",d:"모든 업체의 대표 · 직원 계정이에요. 줄을 누르면 고칠 수 있어요.",
    cols:["이름","업체","아이디","권한","상태","마지막 접속","만든 날"],kinds:["name","text","id","text","state","time","date"],rows:[["김대표","예시 광택","010-****-0001","대표","진행 중","10-18 09:12","03-02"],["직원 A","예시 광택","010-****-0002","직원","진행 중","10-18 08:40","03-05"],["박대표","가람 세차","010-****-0003","대표","보류","10-01 17:00","05-11"]],
    map:{"진행 중":"done","보류":"chk"},find:"이름 · 업체 · 아이디",acts:function(){ return [{key:"edit",label:"고치기"}]; },onAct:function(k,r){ CGG.dialog({size:"form",title:"«"+r[0]+"» 계정 고치기",body:fm([["이름",r[0]],["권한",r[3]]]),ok:"저장",cancel:"취소",onOk:toast("저장했어요")}); }});
  V.a_find=G({t:"휴대폰 번호로 계정 찾기",d:"휴대폰 번호 하나로 워시 · 체크 · 배달 기사 · 딜러 · 통합 로그인 계정을 한꺼번에 찾아요.",tools:function(){ return '<label class="ck">휴대폰 <input type="tel" value="010-****-0001" aria-label="휴대폰 번호" style="width:160px;height:var(--ctl)"></label>'+btn("검색",true)+btn("잠금 모두 풀기",false,"unl")+btn("접속 모두 끊기",false,"kick"); },
    after:function(){ q("unl").onclick=function(){ ask("잠금 모두 풀기","010-****-0001 의 모든 제품 계정","3개"); }; q("kick").onclick=function(){ ask("접속 모두 끊기","010-****-0001 의 켜 둔 기기","4대"); }; },
    cols:["제품","역할","마지막 접속","켜 둔 기기","문자 확인","상태"],kinds:["name","text","time","text","text","state"],rows:[["워시","대표","10-18 09:12","2대","확인함","진행 중"],["딜러","딜러","10-17 20:01","1대","확인함","진행 중"],["통합 로그인","대표","10-18 09:10","1대","—","잠김"]],
    map:{"진행 중":"done","잠김":"stop"},bulk:false});
  V.a_biz=G({t:"업체 관리",d:"줄을 누르면 고칠 수 있어요. 차곳간 본사 계정은 목록에서 빼 두었어요.",tools:function(){ return chip("요금제 전체",true)+chip("진행 중")+chip("보류")+chip("문자 10% 이하"); },
    k:[{label:"업체",value:"42",unit:"곳"},{label:"진행 중",value:"39",unit:"곳",tone:"in"},{label:"보류",value:"3",unit:"곳",tone:"due"},{label:"문자 다 씀",value:"1",unit:"곳",tone:"stop",zeroMuted:true}],
    cols:["업체명","코드","업종","요금제","끝나는 날","상태"],kinds:["name","id","text","text","text","state"],rows:BZ.map(function(b){ return [b[0],b[1],b[2],b[3],b[4].replace("N일 남음 · 12","12일 남음"),b[5]]; }),map:{"진행 중":"done","보류":"chk"},find:"업체명 · 코드 · 대표 번호",
    mf:[[3,"요금제"],[4,"끝나는 날"],[5,"상태"]],acts:function(){ return [{key:"edit",label:"고치기"}]; },onAct:function(k,r){ CGG.dialog({size:"form",title:"«"+r[0]+"» 고치기",body:'<div class="row" style="margin:0 0 10px">'+chip("7일")+chip("14일")+chip("30일",true)+chip("비우기")+'</div>'+fm([["요금제",r[3]],["끝나는 날","2026-11-12","date"]]),ok:"저장",cancel:"취소",onOk:toast("저장했어요")}); }});
  V.a_lock=G({t:"잠금 · 차단",d:"기간이 끝난 업체는 보기만 → 로그인 막힘 → 자료 정리 차례로 흘러가요.",tools:function(){ return btn("새로고침"); },
    pre:function(){ return bx("이렇게 흘러가요","기간 끝 → 다음 날 보기만(잠김) → 7일 뒤 로그인 막힘 → 30일 뒤 자료 정리 예정",""); },
    cols:["업체","무엇","끝나는 날","지금","로그인 막히는 날","자료 정리 예정"],kinds:["name","text","date","state","date","date"],rows:[["가람 세차","베이직","10-15","잠김 (보기만)","10-22","11-14"],["샘플 리페어","무료 체험","10-23","진행 중","—","—"]],map:{"잠김 (보기만)":"chk","진행 중":"done"},
    acts:function(){ return [{key:"open",label:"열어 두기"}]; },onAct:function(k,r){ ask("열어 두기",r[0],"7일"); },bulk:false});
  V.a_wait=G({t:"결제 대기",d:"홈페이지에서 가입만 하고 아직 결제를 안 한 업체예요.",
    k:[{label:"결제 대기",value:"3",unit:"곳"},{label:"확인 필요 (결제됨)",value:"1",unit:"곳",tone:"due"},{label:"7일 지남",value:"1",unit:"곳"},{label:"30일 지남",value:"0",unit:"곳",zeroMuted:true}],
    cols:["업체명","코드","대표 번호","고른 요금제","가입일","지난 날","상태"],kinds:["name","id","text","text","date","text","state"],rows:[["새길 광택","W1010","010-****-0021","스탠다드","10-16","2일","결제 대기"],["미래 세차","W1011","010-****-0022","베이직","10-09","9일","7일 지남"],["다온 휠","W1012","010-****-0023","베이직","10-17","1일","확인 필요"]],
    map:{"결제 대기":"run","7일 지남":"chk","확인 필요":"chk"},find:"업체명 · 번호",tools:function(){ return btn("결제 내역 보기"); }});
  V.a_check=G({t:"사업자 확인",d:"업체가 넣은 사업자번호를 확인해요.",k:[{label:"확인 필요",value:"2",unit:"곳",tone:"due"},{label:"확인됨",value:"40",unit:"곳",tone:"in"}],
    cols:["업체명","사업자번호","코드","대표","넣은 때","상태"],kinds:["name","id","id","text","date","state"],rows:[["새길 광택","000-00-00101","W1010","홍길동","10-16","확인 필요"],["예시 광택","000-00-00091","W1001","홍길동","03-02","확인됨"]],map:{"확인 필요":"chk","확인됨":"done"},
    acts:function(r){ return [{key:r[5]==="확인됨"?"undo":"ok",label:r[5]==="확인됨"?"확인 취소":"확인"}]; },onAct:function(k,r){ ask(k==="ok"?"사업자 확인":"확인 취소",r[0],"1곳"); },bulk:false});
  V.a_plan=function(m){ m.innerHTML=head("요금제","여기서 정한 금액이 회원가입 페이지에 그대로 나와요. 부가세 별도 기준이에요.")+'<div class="two">'+[["베이직","55,000"],["스탠다드","77,000"]].map(function(p){ return bx(p[0],"30일 · 부가세 별도",fm([["금액(원)",p[1]],["최대 인원","제한 없음"]])+'<div class="row">'+btn("이것만 저장",true)+'</div>'); }).join("")+'</div>'+bx("프로","상담으로 안내해요.",'<div class="row">'+btn("이것만 저장",true)+'</div>'); };
  var PAY=[["10-18 09:20","워시","예시 광택","요금제","카드",77000,"결제됨"],["10-17 14:02","체크","예시 성능검사소","충전","계좌 입금",110000,"입금 전"],["10-16 11:40","워시","가람 세차","요금제","카드",55000,"실패"],["10-15 10:00","홈페이지 가입","새길 광택","요금제","카드",77000,"환불됨"]];
  V.a_pay=G({t:"결제 내역",d:"워시 · 체크 · 자동 결제 · 환불 · 홈페이지 가입 · 계좌 입금 · 딜러 청구서를 한 목록으로 봐요.",tools:function(){ return periods()+btn("새로고침")+btn("청구 만들기",true); },
    k:[{label:"이번 달 받은 금액",value:"2,310,000",unit:"원",tone:"in"},{label:"환불 합계",value:"77,000",unit:"원"},{label:"실패",value:"1",unit:"건",tone:"stop"},{label:"자동 결제 켠 업체",value:"18",unit:"곳"}],
    cols:["시각","제품","업체","종류","수단","금액","상태"],kinds:["time","name","text","text","text","money","state"],rows:PAY,map:{"결제됨":"done","입금 전":"chk","실패":"stop","환불됨":"run"},tabs:[["","전체"],["결제됨","결제됨"],["입금 전","입금 전"],["실패","실패"],["환불됨","환불됨"]],
    find:"업체 · 주문번호",mf:[[2,"업체"],[5,"금액"],[6,"상태"]],acts:function(r){ return r[6]==="결제됨"?[{key:"refund",label:"환불",danger:true}]:r[6]==="입금 전"?[{key:"ok",label:"입금 확인"}]:[]; },
    onAct:function(k,r){ ask(k==="refund"?"환불":"입금 확인",r[2],"1건",won(r[5])+"원"); },bulk:false});
  V.a_cash=G({t:"충전 — 캐시 지갑",d:"업체마다 문자 · 사진 문자에 쓰는 캐시를 넣고 빼요.",pre:function(){ return bx("캐시 넣기","잘못 넣었을 때만 빼요.",fm([["업체","예시 광택"],["캐시(원)","10,000"]])+'<div class="row">'+btn("넣기",true,"cin")+btn("빼기 (잘못 넣었을 때)",false,"cout")+'</div>'); },
    cols:["업체","무료 캐시","충전 캐시","합계","가장 먼저 끝나는 날","지난 30일 사용"],kinds:["name","money","money","money","date","money"],rows:BZ.slice(0,4).map(function(b,i){ return [b[0],3000,10000*(i+1),3000+10000*(i+1),"11-"+(10+i),4200*(i+1)]; }),find:"업체",bulk:false,
    after:function(){ q("cin").onclick=function(){ ask("캐시 넣기","예시 광택","1건","10,000원"); }; q("cout").onclick=function(){ ask("캐시 빼기","예시 광택","1건","10,000원"); }; }});
  V.a_card=function(m){ m.innerHTML=head("카드 결제","PG사 승인이 나면 여기서 켜기만 하면 돼요.")+'<div class="two">'+bx("준비 단계","지금은 시험 모드예요.",'<label class="ck"><input type="checkbox" checked> 시험 모드</label><div class="row">'+btn("저장",true)+'</div>')+bx("수수료 계산","카드 결제 77,000원 → 수수료 약 2,500원 (예시)","")+'</div>'; };
  V.a_link=G({t:"체크 지갑 연결",d:"체크 검사소의 이용요금 · 캐시는 여기서 연결해 둔 워시 업체 지갑으로 처리돼요.",tools:function(){ return btn("새로고침"); },
    cols:["체크 검사소","연결한 워시 업체","상태"],kinds:["name","text","state"],rows:[["예시 성능검사소","예시 광택","같은 회사"],["샘플 검사소","—","안 이어짐"]],map:{"같은 회사":"done","안 이어짐":"chk"},
    acts:function(){ return [{key:"link",label:"연결"}]; },onAct:function(k,r){ ask("지갑 연결",r[0],"1곳"); },bulk:false});
  V.a_settle=G({t:"정산",d:"달마다 업체에서 받은 금액과 유지비로 나간 금액을 견줘요.",tools:function(){ return btn("＋ 지출 적기",true); },
    cols:["달","들어온 금액","건수","나간 금액","남은 것"],kinds:["name","money","text","money","money"],rows:[["2026년 10월",2310000,"37건",412000,1898000],["2026년 09월",2150000,"35건",398000,1752000]],find:"달",bulk:false});
  V.a_keep=G({t:"유지비",d:"요금을 내야 차곳간이 계속 도는 곳들이에요.",tools:function(){ return btn("＋ 서비스 넣기",true)+btn("연결된 곳 상태 새로 받기"); },
    cols:["서비스","무엇에 쓰는지","방식","지금 남은 금액","다음 결제일","상태"],kinds:["name","text","text","money","date","state"],rows:[["문자 발송 (예시)","알림톡 · 문자","자동",84000,"11-01","자동"],["서버 (예시)","앱 · 자료","자동",0,"11-05","자동"],["도메인 (예시)","cgg.co.kr","직접",0,"2027-03-01","직접"]],map:{"자동":"done","직접":"run"},bulk:false});
  V.a_tax=function(m){ m.innerHTML=head("세금계산서","차곳간(본사)이 각 업체에 전자세금계산서를 보내요. 팝빌을 써요.")+bx("차곳간 정보 (보내는 쪽)","상호 · 사업자번호 · 대표자 · 연락처 — 펼쳐서 고쳐요.",'<div class="row">'+btn("펼쳐서 고치기")+btn("팝빌 연결 확인")+'</div>')
      +bx("결제 기록에서 발행","결제 완료 건만 단추가 나와요. 결제 전 줄은 «결제 완료 뒤 발행돼요»예요.",slot("t"))+bx("보낸 세금계산서","국세청 승인번호가 찍혔으면 끝난 거예요.",slot("t2"));
    var rows=[["예시 광택","10-18",77000,"결제 완료"],["예시 성능검사소","10-17",110000,"결제 전"],["누리 휠","10-02",55000,"발행함"]];
    tbl("t",{cols:["업체","결제일","결제 금액","상태"],kinds:["name","date","money","state"],rows:rows,stateMap:{"결제 완료":"pay","결제 전":"chk","발행함":"done"},tabs:[["","전체"],["결제 완료","보낼 것"],["발행함","발행함"],["결제 전","결제 전"]],find:"업체",
      actions:function(r){ return r[3]==="결제 완료"?[{key:"issue",label:"세금계산서"}]:[]; },onAction:function(k,r){ CGG.dialog({size:"confirm",title:"세금계산서를 발행할까요?",desc:"발행하면 국세청으로 바로 가요.",rows:[["누구에게",r[0]],["몇 건","1장"],["얼마",won(r[2])+"원 (공급가액 + 부가세)"]],ok:"세금계산서 발행",cancel:"닫기",onOk:toast("발행했어요")}); }});
    tbl("t2",{cols:["받는 업체","사업자번호","결과","국세청 승인번호","보낸 때"],kinds:["name","id","state","text","time"],rows:[["누리 휠","000-00-00103","잘 됨","2026100241000000","10-02 10:10"]],stateMap:{"잘 됨":"done","안 됨":"stop"},find:"업체 · 승인번호"}); };
  V.a_due=G({t:"기한 안내 문자",d:"이용 기한이 끝나기 전에 업체 대표에게 문자를 보내요.",pre:function(){ return '<div class="two">'+bx("언제 보낼까요","끝나기 3일 전 · 당일 · 다음 날",'<div class="row">'+btn("설정 저장",true)+'</div>')+bx("지금 바로 보내기","고른 업체에 지금 보내요.",'<div class="row">'+btn("이 문자 보내기",true,"dsend")+'</div>')+'</div>'; },
    cols:["업체","대표 휴대폰","무엇","끝나는 날","문자 받기"],kinds:["name","text","text","date","state"],rows:[["가람 세차","010-****-0003","베이직","10-15","받음"],["샘플 리페어","010-****-0005","무료 체험","10-23","받음"]],map:{"받음":"done","안 받음":"chk"},bulk:false,
    after:function(){ q("dsend").onclick=function(){ ask("기한 안내 문자 보내기","가람 세차 외 1곳","2건"); }; }});
  V.a_notice=G({t:"공지사항",d:"앱 · 홈페이지에 보일 공지를 써요.",tools:function(){ return btn("＋ 새 공지 쓰기",true)+btn("새로고침"); },
    k:[{label:"전체",value:"8",unit:"건"},{label:"지금 보이는 것",value:"2",unit:"건",tone:"in"},{label:"앱에서 창으로 뜨는 것",value:"1",unit:"건"}],
    cols:["제목","종류","어디에","보이는 기간","지금"],kinds:["name","text","text","text","state"],rows:[["오픈 베타 안내","안내","모든 앱","10-01 ~ 10-31","올라와 있음"],["추석 휴무","휴무","홈페이지 전용","09-28 ~ 10-03","지남"]],map:{"올라와 있음":"done","지남":"chk","예정":"run"},find:"제목"});
  V.a_tpl=function(m){ m.innerHTML=head("알림톡 템플릿","안내는 알림톡이 먼저 나가고, 알림톡이 안 되면 문자로 대신 나가요. 코드가 빈 안내는 문자로만 나가요.")+slot("k")+bx("템플릿 코드 14 / 17 넣음","",fm([["카카오 채널 ID (pfId)","@예시채널"]])+'<div class="row">'+btn("코드 저장",true)+btn("새로고침")+'</div>')+slot("t");
    CGG.kpis(q("k"),[{label:"알림톡 (건당 13원)",value:"1,284",unit:"건"},{label:"문자 단문 (18원)",value:"96",unit:"건"},{label:"문자 장문 (45원)",value:"41",unit:"건"},{label:"사진 문자 (110원)",value:"12",unit:"건"}]);
    var T=[["차곳간_입고안내","차가 입고되어 접수가 끝났을 때","통과","알림톡 먼저"],["차곳간_출고안내","작업이 끝나 차가 나갈 때","통과","알림톡 먼저"],["차곳간_청구서","한 달치 청구서를 보낼 때","통과","알림톡 먼저"],["차곳간_입금확인","입금이 확인되었을 때","통과","알림톡 먼저"],["차곳간_결제완료","카드 결제 또는 입금 확인이 끝났을 때","통과","알림톡 먼저"],["차곳간체크_차량도착","체크 — 차가 목적지에 도착했을 때","심사 대기","문자로 보냄 · 심사 대기"],["차곳간_자동결제등록","자동 결제 카드를 등록했을 때","등록 전","문자로 보냄 · 등록 전"]];
    tbl("t",{cols:["템플릿 이름","언제 나가요","검수","보내는 방법"],kinds:["name","text","state","text"],rows:T,stateMap:{"통과":"done","심사 대기":"chk","등록 전":"run"},find:"템플릿 이름",mobileFields:[[2,"검수"],[3,"보내는 방법"]]}); };
  V.a_log=G({t:"발송 기록",d:"워시 · 체크 · 딜러 · 통합 입구에서 나간 알림톡과 문자를 한 곳에서 봐요.",tools:function(){ return btn("새로고침")+btn("결과 새로 받기"); },
    k:[{label:"이번 달 알림톡 도착",value:"1,284",unit:"건",tone:"in"},{label:"문자 대체",value:"96",unit:"건"},{label:"실패",value:"3",unit:"건",tone:"stop"},{label:"대략 요금 (부가세 별도)",value:"22,500",unit:"원"}],
    cols:["받는 번호","시각","제품","보낸 방법","결과"],kinds:["name","time","text","text","state"],rows:[["010-****-0010","10-18 09:10","워시","알림톡","알림톡 도착"],["010-****-0011","10-18 08:50","체크","문자","문자 대체"],["010-****-0012","10-17 18:00","딜러","알림톡","실패"]],
    map:{"알림톡 도착":"done","문자 대체":"chk","실패":"stop"},find:"번호 · 업체"});
  V.a_sec=function(m){ m.innerHTML=head("보안 점검","차곳간이 지금 어떤 상태인지 한 번에 봐요.")+tools(btn("지금 다시 확인",true)+'<span class="sp"></span><span class="d">마지막 확인 10-18 09:00</span>')+slot("k")+bx("손으로 확인하는 것 (5 / 6)","",'<label class="ck"><input type="checkbox" checked> 관리자 비밀번호 90일 안에 바꿈</label><label class="ck"><input type="checkbox"> 백업 되살리기 시험</label>');
    CGG.kpis(q("k"),[{label:"지금 위험",value:"0",unit:"건",tone:"stop",zeroMuted:true,delta:"",vs:"없어요"},{label:"한 번 봐주실 것",value:"2",unit:"건",tone:"due",delta:"",vs:"급하지는 않아요"},{label:"잘 되어 있는 것",value:"31",unit:"건",tone:"in"}]); };
  V.a_me=function(m){ m.innerHTML=head("관리자 계정","아이디나 비밀번호를 바꾸면 모든 기기에서 로그아웃되고 다시 로그인해야 해요.")+bx("계정 바꾸기","",fm([["지금 아이디","admin (예시)"],["새 아이디 (안 바꾸려면 비워 둬요)",""],["새 비밀번호","","password"],["지금 비밀번호 (확인용)","","password"]])+'<div class="row">'+btn("바꾸기",true,"chg")+'</div>');
    q("chg").onclick=function(){ ask("계정 바꾸기","관리자 계정","1건"); }; };

  /* ═══ 딜러앱 (폰 중심) ═══ */
  var CARS=[["12가 3400","도착","아반떼","광택 · 실내세차","예시 광택 → 예시상사 매장","10-18 09:10",180000],["13가 3407","작업 중","그랜저","유리막코팅","예시 광택","10-18 08:30",350000],["14가 3414","출고","BMW 5","휠복원","예시 광택 → 가람 2주차장","10-17 17:40",120000],["15가 3421","입고","쏘렌토","—","예시 광택","10-17 15:00",0],["16가 3428","상품화 완료","벤츠 E","광택 · 수입 대형","누리상사","10-15 11:20",280000]];
  V.d_home=function(m){
    CGG.home(m,{date:"10월 18일 일요일",title:'도착한 차 <em>1대</em>가 상품화 완료를 기다려요',desc:"안녕하세요, 김민수 님",
      todo:{items:[{tone:"chk",icon:"car",title:"도착한 차 1대 «상품화 완료» 누르기",sub:"12가 3400 · 아반떼"},{tone:"run",icon:"truck",title:"출고된 차 1대 받을 준비",sub:"14가 3414 → 가람 2주차장"},{tone:"done",icon:"today",title:"3일 넘게 걸리는 차가 없어요",sub:""}],total:2,onPick:function(){ go("cars"); },onAll:function(){ go("cars"); }},
      kpis:[{label:"작업 중인 차",value:"1",unit:"대"},{label:"오늘 출고 · 도착",value:"2",unit:"대"},{label:"낼 청구서 금액",value:"730,000",unit:"원",tone:"due"},{label:"상품화 기다리는 차",value:"1",unit:"대",tone:"due"}],
      cal:false,money:false,rank:false,
      help:"딜러앱 홈도 같은 차례예요: 첫 줄 → 오늘 할 일 → 숫자 칸 4개. 일정 · 입금 카드는 딜러에게 필요 없어서 빼요."});
    var x=document.createElement("div"); x.innerHTML=bx("최근 내 차","",'<div id="dcar"></div><div class="row">'+btn("모두 보기",false,"dall")+'</div>'); m.insertBefore(x,m.querySelector(".cgg-help"));
    tbl("dcar",{cols:["차량번호","단계","차종","작업","지금 위치","마지막 기록","들어간 금액"],kinds:["name","state","text","text","text","time","money"],rows:CARS.slice(0,3),stateMap:DSTATE,tabs:[["","전체"]],find:"차량번호",mobileFields:[[2,"차종"],[4,"지금"],[1,"단계"]],select:false,onName:function(r){ carDetail(r); }});
    q("dall").onclick=function(){ go("cars"); }; };
  var DSTATE={"입고":"run","작업 중":"run","출고":"run","도착":"chk","상품화 완료":"done"};   /* 딜러앱 d3.9 STMAP 그대로 */
  V.d_cars=function(m){ var SEL=[]; m.innerHTML=head("작업 중인 차 <em>1대</em>, 도착한 차 <em>1대</em>가 있어요","업체에 맡긴 내 차가 지금 어디 있는지, 어디까지 됐는지 확인해요.")+tools(btn("선택한 차 상품화 완료",true,"done"))+slot("t");
    q("done").disabled=true;
    tbl("t",{cols:["차량번호","단계","차종","작업","지금 위치","마지막 기록","들어간 금액"],kinds:["name","state","text","text","text","time","money"],rows:CARS,stateMap:DSTATE,tabs:[["","전체"],["입고","입고"],["작업 중","작업 중"],["출고","출고"],["도착","도착"]],find:"차량번호 · 차종 · 업체 검색",
      sorts:[[5,-1,"최근 기록순"],[0,1,"차량번호순"],[6,-1,"금액 높은순"],[1,1,"단계순"]],mobileFields:[[2,"차종"],[4,"지금"],[6,"들어간 금액"],[1,"단계"]],
      onName:function(r){ carDetail(r); },onSelect:function(ids){ SEL=ids; var b=q("done"); b.disabled=!ids.length; b.textContent="선택한 차 상품화 완료"+(ids.length?" ("+ids.length+")":""); }});
    q("done").onclick=function(){ var R=SEL.map(function(i){ return CARS[i]; }); if(!R.length) return; CGG.dialog({size:"confirm",title:"상품화 완료로 표시할까요?",rows:[["차",R[0][0]+(R.length>1?" 외 "+(R.length-1)+"대":"")],["대수",R.length+"대"],["들어간 금액 합계",won(R.reduce(function(t,r){ return t+r[6]; },0))+"원"]],ok:"완료로 표시",cancel:"취소",onOk:toast("완료로 표시했어요")}); }; };
  function carDetail(r){ CGG.dialog({size:"detail",title:r[0]+" · 차 상세",desc:"상품화 진행 과정",rows:[["차종",r[2]],["상사","예시상사"],["지금",r[4]],["지금까지 들어간 금액",r[6]?won(r[6])+"원":"업체가 아직 금액을 넣지 않았어요"]],
    body:'<div class="dph" role="img" aria-label="차 사진 예시">사진 3장 (예시)</div><ol class="dlog"><li><b>10-18 09:10</b> 예시상사 매장 도착</li><li><b>10-18 08:40</b> 출고 → 예시상사 매장 이동</li><li><b>10-17 15:00</b> 예시 광택 입고 · 작업: '+E(r[3])+'</li></ol><div class="row">'+btn("카히스토리 조회")+'</div>',
    ok:r[1]==="상품화 완료"?"상품화 완료 취소":"상품화 완료",cancel:"닫기",onOk:toast(r[1]==="상품화 완료"?"완료를 취소했어요":"완료로 표시했어요")}); }
  /* 알림 — 딜러가 보는 핵심 단계 «출고 → 도착 → 상품화 완료»(d3.9)대로 칩을 나누고, 본문은 현장 말로 */
  var NOTI=[["12가 3400 · 예시 광택 → 예시상사 매장 도착 (사진 2장)","도착","10-18 09:10"],["14가 3414 · 예시 광택 → 가람 2주차장 출고","출고","10-18 08:40"],["16가 3428 · 상품화 완료로 표시했어요","상품화 완료","10-17 18:20"],["15가 3421 · 예시 광택 입고","입고","10-17 15:00"],["예시 광택 · 9월 청구서","청구서","10-01 10:00"],["18가 3442 · 성능점검 유효기간이 7일 남았어요","재검사","10-16 09:00"]];
  V.d_noti=G({t:"알림",d:"카카오 알림톡으로 먼저 가고, 알림톡이 안 되면 문자로 가요.",cols:["내용","단계","언제"],kinds:["name","state","time"],rows:NOTI,
    map:{"입고":"run","작업 중":"run","출고":"run","도착":"chk","상품화 완료":"done","청구서":"done","재검사":"chk"},tabs:[["","전체"],["출고","출고"],["도착","도착"],["상품화 완료","상품화 완료"],["청구서","청구서"],["재검사","재검사"]],find:"차량번호 · 내용",mf:[[1,"단계"],[2,"언제"]],bulk:false,sort:[2,-1]});
  V.d_bill=function(m){ var B=[["예시 광택","2026년 10월 · 3대 · 10월 청구서",610000,"기한 10/31 · 13일 남음","입금 전"],["예시 성능검사소","2026년 09월 · 4대 · 9월 청구서",120000,"기한 10/13 · 5일 지남","기한 지남"],["누리 휠","2026년 09월 · 1대 · 9월 청구서",120000,"입금 확인 · 10/17","입금 확인"]];
    var sum=function(st){ return B.filter(function(b){ return b[4]===st; }).reduce(function(t,b){ return t+b[2]; },0); }, late=sum("기한 지남"), soon=sum("입금 전");
    m.innerHTML=head("낼 금액 <em>"+won(late+soon)+"원</em>","기한 지난 것 "+won(late)+"원(1곳) + 기한 전 "+won(soon)+"원(1곳) · 다음 기한 10/31")+'<div class="dbills">'+B.map(function(b,i){ return '<section class="bx dbill"><div class="dbh"><b>'+E(b[0])+'</b>'+CGG.status(b[4],{"입금 전":"chk","기한 지남":"stop","입금 확인":"done"})+'</div><p class="d">'+E(b[1])+'</p><div class="dbm"><strong>'+won(b[2])+'<small>원</small></strong><span>'+E(b[3])+'</span></div><div class="row">'+(b[4]==="입금 확인"?"":btn("계좌 복사",false,"ac"+i)+btn("금액 복사",false,"am"+i))+btn("내역 보기",b[4]!=="입금 확인","bv"+i)+'</div></section>'; }).join("")+'</div>'
      +bx("한 번에 결제는 곧 열려요","지금은 업체마다 계좌로 보내 주세요. 차곳간은 금액을 받지 않고, 업체 계좌로 바로 보내요.","");
    B.forEach(function(b,i){ ["ac","am"].forEach(function(p){ var x=q(p+i); if(x) x.onclick=function(){ CGG.toast(p==="ac"?"(미리보기) 실제로는 업체 계좌가 복사돼요":"(미리보기) 실제로는 금액이 복사돼요"); }; }); q("bv"+i).onclick=toast("업체가 보낸 청구서를 새 창으로 열어요"); }); };
  V.d_hist=function(m){ m.innerHTML=head("카히스토리","차량번호로 사고 · 정비 이력을 조회해요. (곧 열려요)")+bx("남은 조회 0건","조회할 때마다 1건씩 빠져요 · 앱은 무료",'<div class="row">'+btn("5건 충전")+btn("10건 충전")+btn("30건 충전")+'</div>')+bx("조회","",fm([["차량번호","예: 123가4567"]])+'<div class="row">'+btn("조회",true,"hq")+'</div>')+bx("최근 조회","아직 조회한 차가 없어요.","");
    q("hq").onclick=toast("곧 열려요"); Array.prototype.forEach.call(m.querySelectorAll(".bx .cgg-btn"),function(b){ if(/충전/.test(b.textContent)){ b.disabled=true; b.title="곧 열려요"; } }); };
  V.d_me=function(m){ m.innerHTML=head("내 정보","김민수 딜러 · 예시상사")+bx("알림 받기","",[["입고 · 출고 알림","업체에 들어가고 나올 때",1],["목적지 도착 알림","사진과 함께",1],["청구서 알림","알림톡으로 받기 (안 되면 문자)",1],["재검사 안내","검사소에서 정한 유효기간이 끝나기 전에 알려 드려요",0]].map(function(a,i){ return '<label class="ck"><input type="checkbox"'+(a[2]?" checked":"")+'> <span><b>'+E(a[0])+'</b> <small style="color:var(--muted)">'+E(a[1])+'</small></span></label>'; }).join(""))
      +bx("번호","010-****-0000 · 로그인 번호 · 업체에 알려 준 번호",'<div class="row">'+btn("약관 동의 보기")+'</div>')+bx("로그아웃","",'<div class="row">'+btn("로그아웃",false,"lo")+btn("동의 철회 (이용 그만두기)",false,"wd")+'</div><p class="d" style="margin-top:10px">차곳간 딜러 d4.0 · 문의 1600-0000 (예시)</p>');
    q("lo").onclick=function(){ CGG.dialog({size:"confirm",title:"로그아웃할까요?",ok:"로그아웃",cancel:"취소",onOk:toast("로그아웃했어요")}); };
    q("wd").onclick=function(){ CGG.dialog({size:"confirm",title:"동의를 철회할까요?",desc:"철회하면 내 차 · 청구서를 더 볼 수 없어요.",ok:"동의 철회",cancel:"취소",onOk:toast("철회했어요")}); }; };

  /* ═══ 홈페이지 (cgg.co.kr 메인 · 요금제 · 통합 입구 로그인 · 가입) — 앱 틀 대신 사이트 틀 ═══ */
  /* 메인 홈페이지는 «지금 / 손본 뒤» 나란히 (대표님 확정 10/18 — 지금 느낌 그대로, 바꾸는 건 최소만) */
  function compare(root, anchor){ var A=anchor?"#"+anchor:"";
    root.innerHTML='<div class="cmp"><div class="cmph"><b>cgg.co.kr 메인 — 지금 / 손본 뒤</b><span class="d">주 참고는 대표님 시안 3이에요: 첫 화면은 남색 띠, 아래는 밝은 바탕 + 흰 카드. 배치 · 구역 차례 · 실제 링크는 지금 그대로예요. 빨간 점선 = 바뀐 곳, 보라 띠 = 참고 시안에서 빌려 온 칸. 첫 문구는 대표님 확정 «차를 맡는 순간부터, 정산을 마치는 순간까지.»예요.</span>'
      +'<span class="row" style="margin:0" role="group" aria-label="폭 고르기">'+chip("나란히",true)+chip("PC 1440")+chip("폰 400")+'</span><span class="row" style="margin:0">'+'<label class="ck"><input type="checkbox" id="mk" checked> 바뀐 곳 표시</label></span>'
      +'<span class="row" style="margin:0"><a class="cgg-btn" href="#site-login">로그인 화면</a><a class="cgg-btn" href="#site-join">가입 화면</a></span></div>'
      +'<div class="cmpb" data-v="both"><figure><figcaption>지금</figcaption><iframe title="지금 홈페이지" src="시안/홈페이지/지금.html'+A+'"></iframe></figure><figure><figcaption>손본 뒤</figcaption><iframe id="aft" title="손본 뒤 홈페이지" src="시안/홈페이지/손본뒤.html?mark'+A+'"></iframe></figure></div></div>';
    var box=root.querySelector(".cmpb"), cs=root.querySelectorAll(".cmph .cgg-fp");
    if(window.innerWidth<900){ box.setAttribute("data-v","phone"); cs[0].classList.remove("on"); cs[2].classList.add("on"); }
    Array.prototype.forEach.call(cs,function(c,i){ c.onclick=function(){ Array.prototype.forEach.call(cs,function(x){ x.classList.remove("on"); }); c.classList.add("on"); box.setAttribute("data-v",["both","pc","phone"][i]); fit(); }; });
    /* PC 1440 — 두 화면을 위아래로, 1440 폭 그대로 그린 뒤 칸 폭에 맞춰 줄여 보여요 · 폰 400 — 400 폭 두 개를 나란히 */
    function fit(){ var v=box.getAttribute("data-v"); Array.prototype.forEach.call(box.querySelectorAll("iframe"),function(f){ var fg=f.parentNode, W=fg.clientWidth;
      if(v==="pc"){ var sc=Math.min(1,W/1440); f.style.width="1440px"; f.style.height=Math.round(900)+"px"; f.style.transform="scale("+sc+")"; f.style.transformOrigin="0 0"; fg.style.height=(Math.round(900*sc)+42)+"px"; }
      else if(v==="phone"){ var s2=Math.min(1,W/400), H=760; f.style.width="400px"; f.style.height=H+"px"; f.style.transform="scale("+s2+")"; f.style.transformOrigin="0 0"; fg.style.width=""; fg.style.height=(Math.round(H*s2)+42)+"px"; }   /* N02 — 안쪽은 늘 400 폭, 바깥에 맞춰 줄여요 */
      else { f.style.width=""; f.style.transform=""; f.style.height=""; fg.style.height=""; } }); }
    window.addEventListener("resize",fit); setTimeout(fit,0);
    q("mk").onchange=function(){ q("aft").src="시안/홈페이지/손본뒤.html"+(this.checked?"?mark":"")+A; }; }
  function site(root, page){
    /* 검수 3 F09 — #site-try · #site-price · #site-ask 는 홈페이지 안 그 구역으로 */
    if(page==="main"||page==="price"||page==="try"||page==="ask"){ compare(root, page==="main"?"":page); return; }
    var NAV=[["main","차곳간"],["try","미리 써 보기"],["price","요금제"],["join","회원가입"],["ask","문의"],["login","로그인"]];
    var top='<div class="ssb">오픈 베타 · 차곳간은 지금 오픈 베타예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</div>'
      +'<header class="shd"><a class="slogo" href="#site"><img src="'+CGG.CI.white+'" alt="" width="32" height="32"><b>차곳간</b></a><nav class="snav" aria-label="홈페이지 메뉴">'+NAV.slice(1).map(function(n){ return '<a href="#site-'+n[0]+'"'+(page===n[0]?' aria-current="page"':'')+'>'+n[1]+'</a>'; }).join("")+'</nav></header>';
    var foot='<footer class="sft"><b>차곳간</b> · 이용약관 · 개인정보처리방침 · 환불 규정<br>상호 (예시) · 사업자등록번호 000-00-00000 · 대표 홍길동 · 문의 1600-0000 (예시)</footer>';
    var plans=[["베이직","55,000","원 / 30일",["입고 · 출고 · 월별 청구서","출고 알림 자동 발송","엑셀 · 사진 다운로드"],"이 요금제로 시작하기",false],["스탠다드","77,000","원 / 30일",["베이직 전부","세금계산서 발행","통장 연결 · 입금 자동 확인","청구서 보내기 · 예약 발송"],"이 요금제로 시작하기",true],["프로","상담","",["스탠다드 전부","여러 지점","맞춤 상담"],"상담 요청",false]];
    function priceBlock(){ return '<section class="ssec" id="price"><h2>요금제</h2><p class="slead">30일 단위로 결제해요. 고른 요금제로 가입하면 바로 결제 화면으로 이어지고, 결제가 끝나면 앱이 열려요.</p>'
      +'<div class="row" role="group" aria-label="제품">'+chip("워시",true)+chip("체크")+chip("딜러")+'</div><div class="splans">'+plans.map(function(p){ return '<div class="cgg-card splan'+(p[5]?' rec':'')+'">'+(p[5]?'<span class="cgg-st run">추천</span>':'')+'<h3>'+p[0]+'</h3><div class="spr"><strong>'+p[1]+'</strong><small>'+p[2]+'</small></div><p class="d">'+(p[2]?"부가세 별도 · 결제일부터 30일 · 가격 예시":"지점 수에 맞춰 안내해 드려요")+'</p><ul class="cgg-list">'+p[3].map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ul>'+btn(p[4],p[5])+(p[2]?'<p class="d">이미 회원이면 로그인하고 결제</p>':'')+'</div>'; }).join("")+'</div>'
      +'<div class="ssteps">'+[["가입 · 로그인","휴대폰 인증으로 가입해요. 회원이면 로그인해요."],["결제","토스페이먼츠 결제 창에서 카드로 결제해요."],["바로 사용","결제가 끝나면 고른 제품이 바로 열려요."]].map(function(s,i){ return '<div class="cgg-card"><b>'+(i+1)+'. '+s[0]+'</b><p class="d">'+s[1]+'</p></div>'; }).join("")+'</div>'
      +'<p class="d">가격 예시예요. 확정되면 바뀔 수 있어요. 표시 금액은 부가세 별도, 30일 기준이에요. 환불은 환불 규정을 따라요.</p></section>'; }
    var body="";
    if(page==="main"||page==="try"||page==="price") body='<section class="shero"><small>광택 · 세차 · 성능점검 · 딜러</small><h1>입고부터 정산까지, 차를 맡고 내주는 일을 한곳에서</h1><p>차곳간은 광택 · 세차장, 성능점검장, 딜러가 함께 쓰는 업무 장부예요. 가입하지 않아도 예시 자료로 지금 바로 눌러 볼 수 있어요.</p><div class="row">'+btn("가입 없이 미리 써 보기",true,"stry")+btn("요금제 보기",false,"sprice")+'</div>'
      +'<div class="sprod">'+[["워시","광택 · 세차 · 휠 · 판금 업체용 업무 장부","wash"],["체크","성능점검장용 검사 · 청구 · 정산","check"],["딜러","맡긴 차 진행을 휴대폰으로","dealer"]].map(function(p){ return '<a class="cgg-card sprodc" href="#'+p[2]+'"><b>차곳간 '+p[0]+'</b><span>'+p[1]+'</span><em>눌러 보기 →</em></a>'; }).join("")+'</div></section>'
      +priceBlock()+'<section class="ssec"><h2>처음 오신 분</h2><p class="slead">요금제 고르기부터 앱이 열릴 때까지</p><ol class="sflow">'+["고른 요금제를 확인해 주세요","휴대폰 인증","약관 동의","사업장 정보","결제 방법","결제 확인","차곳간 ○○가 열렸어요"].map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ol></section>'
      +'<section class="ssec"><h2>문의</h2><p class="slead">전화 1600-0000 (예시) · 메일 help@example.com</p></section>';
    if(page==="login") body='<section class="sbox cgg-card" id="lgBox"></section>';
    if(page==="join") body='<section class="sbox cgg-card"><ol class="sdots" aria-label="가입 차례">'+["요금제","휴대폰 인증","약관","사업장","결제"].map(function(x,i){ return '<li'+(i===3?' aria-current="step"':'')+'>'+x+'</li>'; }).join("")+'</ol><h1>4. 사업장 정보</h1><p class="d">상호를 입력하면 업종이 자동으로 선택됩니다. 다르면 바꿔 주세요.</p>'+fm([["상호 (사업장 이름)","예) 대박모터스"],["대표자 이름","예) 홍길동"],["비밀번호 (6자 이상)","","password"],["비밀번호 확인","","password"]])+'<div class="row" role="group" aria-label="업종">'+chip("광택 · 세차",true)+chip("휠복원")+chip("판금 · 도색 · 정비")+'</div><div class="row">'+btn("이전")+btn("다음",true)+'</div><p class="d">이미 가입하셨나요? <a href="#site-login">로그인</a></p></section>';
    root.innerHTML=top+'<main class="smain">'+body+'</main>'+foot;
    var t=q("stry"); if(t) t.onclick=function(){ location.hash="wash"; }; var pr=q("sprice"); if(pr) pr.onclick=function(){ var s=document.getElementById("price"); if(s) s.scrollIntoView({behavior:"smooth"}); };
    if(page==="price") setTimeout(function(){ var s2=document.getElementById("price"); if(s2) s2.scrollIntoView(); },0);
    var LB=q("lgBox"); function lgStep(n){ if(!LB) return;
      LB.innerHTML=n===1?'<h1>로그인</h1><p class="d">휴대폰 번호와 비밀번호로 로그인해요.</p>'+fm([["아이디 (휴대폰 번호)","010-0000-0000","tel"],["비밀번호","","password"]])+'<div class="row">'+btn("로그인",true,"slg")+'</div><p class="d"><a href="#site-join">아직 회원이 아니면 회원가입</a></p>'
        :'<h1>인증번호 확인</h1><p class="d">010-****-0000(으)로 인증번호를 보냈어요. 5분 안에 입력해 주세요. (예시)</p>'+fm([["인증번호 6자리","","tel"]])+'<div class="row">'+btn("확인",true,"sok")+btn("처음부터 다시",false,"sback")+'</div>';
      var a1=q("slg"); if(a1) a1.onclick=function(){ lgStep(2); }; var a2=q("sback"); if(a2) a2.onclick=function(){ lgStep(1); }; var a3=q("sok"); if(a3) a3.onclick=toast("예시 화면이라 실제 로그인은 하지 않아요"); }
    lgStep(1);
    Array.prototype.forEach.call(root.querySelectorAll(".splan .cgg-btn"),function(b){ b.onclick=toast(b.textContent==="상담 요청"?"상담을 요청했어요":"회원가입으로 가요"); });
  }
  var SCR={"home/main":"a_home","home/ops":"a_ops","acct/code":"a_code","acct/list":"a_accts","acct/find":"a_find","biz/list":"a_biz","biz/lock":"a_lock","biz/wait":"a_wait","biz/check":"a_check",
    "in/plan":"a_plan","in/pay":"a_pay","in/cash":"a_cash","in/card":"a_card","in/link":"a_link","out/settle":"a_settle","out/keep":"a_keep","tax":"a_tax","noti/due":"a_due","noti/notice":"a_notice","noti/tpl":"a_tpl","noti/log":"a_log","set/sec":"a_sec","set/me":"a_me"};
  var DSCR={"home":"d_home","cars":"d_cars","noti":"d_noti","bill":"d_bill","hist":"d_hist","me":"d_me"};
  return {menus:{admin:ADMIN,dealer:DEALER},scr:{admin:SCR,dealer:DSCR},views:V,site:site};
})();
