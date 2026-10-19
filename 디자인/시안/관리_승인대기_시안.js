/* 관리 «가입 승인 대기» 화면 시안 (디자인 방 · 2026-10-19) — 지어낸 예시 자료만 · 서버와 잇지 않아요(단추는 «미리보기» 알림만)
   근거: 운영/긴급/챗지피티_검증_중복사업자번호/00_정책_결정서.md «2. 가입 규칙» + 챗지피티 1차 결과 Q1 · Q2
     · 처음 등록하는 사업자번호는 바로 가입 — 이미 등록된 번호와 겹칠 때만 이 화면에 «승인 대기»로 와요.
     · 요청 종류 3가지를 나눠 보여 줘요: 기존 업체에 참여 · 새 사업장 추가 · 제품 추가(업체를 새로 만들지 않음).
     · 승인 · 거절은 사유가 있어야 하고, 누가 · 언제 · 무엇을 · 왜 했는지 «처리 기록»(hq_audit)에 남아요.
     · 신청한 사람에게는 겹치는 업체 이름 · 번호를 보여 주지 않아요(이 화면은 본사만 봐요). 신청한 사람 본인은 승인할 수 없어요.
     · 처리하지 않은 요청은 기한이 지나면 저절로 만료돼요(번호를 영구히 차지하지 못하게).
   완성_미리보기_더.js 뒤 · 본 화면 스크립트 앞에 불러요 → 관리 › 업체 아래 칸에 «가입 승인 대기»를 더하고 그 화면을 그려요. */
(function(){
  var A=PVX.menus.admin, biz=A.groups.filter(function(g){ return g.key==="biz"; })[0];
  biz.subs.splice(1,0,{key:"appr",label:"가입 승인 대기"});
  biz.badge=2;
  A.feats.splice(3,0,{id:"a-appr",label:"가입 승인 대기",path:"업체 › 가입 승인 대기",go:"biz/appr",words:"승인 거절 사업자번호 겹침 중복 가입 요청"});
  PVX.scr.admin["biz/appr"]="a_appr";

  var KIND={join:"기존 업체에 참여",site:"새 사업장 추가",prod:"제품 추가"};
  /* [요청 때, 가입하려는 가게, 사업자번호, 요청 종류, 제품, 상태, 처리 기한, 상세] */
  var RQ=[
    ["10-18 16:20","새길 광택 2호점","000-00-00101","site","워시","승인 대기","10-25",{who:"홍길동",tel:"010-****-0031",ok:"10-18 16:18",cert:"사업자등록증 사진 있음",nts:"계속 사업자 (예시)",sub:"0002",dup:{name:"새길 광택",code:"W1010",boss:"홍*동",since:"2026-03-02",prod:"워시"}}],
    ["10-18 11:05","예시 광택","000-00-00091","join","워시","승인 대기","10-25",{who:"김직원",tel:"010-****-0032",ok:"10-18 11:03",cert:"사진 없음",nts:"계속 사업자 (예시)",sub:"0000",dup:{name:"예시 광택",code:"W1001",boss:"김*표",since:"2026-03-02",prod:"워시"}}],
    ["10-17 09:40","예시 성능검사소","000-00-00092","prod","체크","승인함","—",{who:"박대표",tel:"010-****-0033",ok:"10-17 09:38",cert:"사업자등록증 사진 있음",nts:"계속 사업자 (예시)",sub:"0000",dup:{name:"예시 성능검사소",code:"W1005",boss:"박*표",since:"2026-05-11",prod:"워시"}}],
    ["10-12 13:10","누리 휠 본점","000-00-00103","join","워시","거절함","—",{who:"이누리",tel:"010-****-0034",ok:"10-12 13:08",cert:"사진 없음",nts:"확인 안 됨",sub:"0000",dup:{name:"누리 휠",code:"W1003",boss:"최*리",since:"2026-04-20",prod:"휠"}}],
    ["10-05 10:00","가람 세차","000-00-00104","join","워시","만료됨","10-12",{who:"정가람",tel:"010-****-0035",ok:"10-05 09:58",cert:"사진 없음",nts:"계속 사업자 (예시)",sub:"0000",dup:{name:"가람 세차",code:"W1002",boss:"박*표",since:"2026-05-11",prod:"워시"}}]];
  var LOG=[["10-17 10:02","관리자","승인 · 제품 추가","예시 성능검사소 (000-00-00092)","같은 회사 확인 — 대표 통화 · 사업자등록증 대조"],
           ["10-12 15:30","관리자","거절","누리 휠 본점 (000-00-00103)","기존 업체 대표가 모르는 신청 — 대표 통화로 확인"],
           ["10-12 00:00","자동","만료","가람 세차 (000-00-00104)","7일 동안 처리 안 됨"]];
  var MAP={"승인 대기":"chk","승인함":"done","거절함":"stop","만료됨":"stop"};   /* 만료 = 더 진행 안 됨(공통 부품에 회색 칩이 없어 stop) */

  function rows(){ return RQ.map(function(r){ return [r[0],r[1],r[2],KIND[r[3]],r[4],r[5],r[6]]; }); }
  function why(id,list){ return '<label for="'+id+'s" style="display:block;font-size:13px;font-weight:700;margin:12px 0 4px">사유 고르기</label><select id="'+id+'s" style="width:100%;height:var(--ctl)"><option value="">— 골라 주세요 —</option>'+list.map(function(x){ return '<option>'+E(x)+'</option>'; }).join("")+'</select>'
    +'<label for="'+id+'t" style="display:block;font-size:13px;font-weight:700;margin:10px 0 4px">자세한 사유 (기록에 남아요)</label><textarea id="'+id+'t" rows="3" style="width:100%;box-sizing:border-box" placeholder="예: 대표 통화로 같은 회사 확인"></textarea>'
    +'<p id="'+id+'e" role="alert" style="color:var(--stop);font-size:13px;margin:6px 0 0" hidden>사유를 고르고 한 줄 이상 적어 주세요.</p>'; }
  function need(dlg,id){ var s=dlg.querySelector("#"+id+"s").value, t=dlg.querySelector("#"+id+"t").value.trim(); dlg.querySelector("#"+id+"e").hidden=!!(s&&t); return !!(s&&t); }
  var DO={join:"신청한 사람을 기존 업체의 직원으로 넣어요(대표 권한은 주지 않아요).",site:"같은 사업자번호 아래 새 사업장을 하나 더 만들어요(종사업장 번호로 나눠요).",prod:"기존 업체에 제품을 하나 더 켜요. 업체를 새로 만들지 않아요."};

  function approve(r){ var d=r[7]; CGG.dialog({size:"form",title:"«"+r[1]+"» 승인할까요?",desc:"승인하면 아래 일이 바로 일어나요. 누가 · 언제 · 왜 승인했는지 처리 기록에 남아요.",
    rows:[["요청 종류",KIND[r[3]]],["하는 일",DO[r[3]]],["겹치는 업체",d.dup.name+" ("+d.dup.code+")"],["신청한 사람",d.who+" · "+d.tel]],
    body:why("ap",["대표 통화로 같은 회사 확인","사업자등록증 대조","기존 업체 대표가 직접 요청","그 밖의 사유"]),ok:"승인",cancel:"취소",
    onOk:function(dlg){ if(!need(dlg,"ap")) return false; CGG.toast("승인했어요 (미리보기 — 실제로는 저장되지 않아요)"); }}); }
  function reject(r){ CGG.dialog({size:"form",title:"«"+r[1]+"» 거절할까요?",desc:"거절하면 신청한 사람에게 «차곳간 확인 결과 연결되지 않았어요» 문자만 가요. 겹치는 업체 이름은 알려 주지 않아요.",
    rows:[["요청 종류",KIND[r[3]]],["신청한 사람",r[7].who+" · "+r[7].tel]],
    body:why("rj",["기존 업체 대표가 모르는 신청","서류가 맞지 않음","연락이 닿지 않음","그 밖의 사유"]),ok:"거절",cancel:"취소",
    onOk:function(dlg){ if(!need(dlg,"rj")) return false; CGG.toast("거절했어요 (미리보기 — 실제로는 저장되지 않아요)"); }}); }
  function detail(r){ var d=r[7], wait=r[5]==="승인 대기";
    var dlg=CGG.dialog({size:"detail",title:r[1]+" · 가입 요청",desc:wait?"처리 기한 "+r[6]+" — 그때까지 처리하지 않으면 저절로 만료돼요.":"이 요청은 «"+r[5]+"» 상태예요.",
      rows:[["요청 종류",KIND[r[3]]],["사업자번호",r[2]+" · 종사업장 "+d.sub],["제품",r[4]],["신청한 사람",d.who+" · "+d.tel],["휴대폰 인증",d.ok],["증빙",d.cert],["국세청 상태","확인 준비 중"]],
      body:'<section class="bx" style="margin:12px 0 0;box-shadow:none;border:1px solid var(--line)"><h3>겹치는 기존 업체</h3><p class="d">본사만 보는 칸이에요. 신청한 사람에게는 보이지 않아요.</p>'
        +'<dl style="margin:0">'+[["업체",d.dup.name+" ("+d.dup.code+")"],["대표",d.dup.boss],["가입일",d.dup.since],["쓰는 제품",d.dup.prod]].map(function(x){ return '<dt>'+E(x[0])+'</dt><dd>'+E(x[1])+'</dd>'; }).join("")+'</dl></section>'
        +(wait?'<p class="d" style="margin:12px 0 0;font-size:13px;color:var(--muted)">승인 전에 기존 업체 대표에게 전화로 확인해 주세요. 신청한 사람 본인 계정으로는 승인할 수 없어요.</p><div class="row">'+btn("거절",false,"rjBtn")+'</div>':''),
      ok:wait?"승인":"",cancel:"닫기",onOk:wait?function(){ setTimeout(function(){ approve(r); },0); }:null});
    var rb=dlg.querySelector("#rjBtn"); if(rb) rb.onclick=function(){ CGG.closeDialog(); reject(r); }; }

  PVX.views.a_appr=function(m){
    m.innerHTML=head("가입 승인 대기","이미 등록된 사업자번호로 들어온 가입 요청이에요. 확인하고 승인하거나 거절해요.")
      +slot("b")+slot("k")+bx("요청 목록","업체 이름을 누르면 자세히 보고 승인 · 거절할 수 있어요.",slot("t"))
      +bx("처리 기록","승인 · 거절 · 만료가 모두 남아요. 지우거나 고칠 수 없어요.",slot("t2"))
      +CGG.help("처음 등록하는 사업자번호는 여기 오지 않고 바로 가입돼요. 이미 등록된 번호로 가입하려는 요청만 여기에 와요. 요청 종류는 셋이에요 — «기존 업체에 참여»(직원으로 들어가기), «새 사업장 추가»(같은 번호로 가게 하나 더), «제품 추가»(쓰던 업체에 워시 · 체크 하나 더 켜기). 승인 · 거절에는 사유가 꼭 있어야 해요. 기한 안에 처리하지 않은 요청은 저절로 만료돼요.");
    band("b",{count:2,text:"승인 대기 2건 · 가장 빠른 처리 기한 10-25",go:"요청 보러 가기",onGo:function(){ q("t").scrollIntoView({behavior:"smooth",block:"start"}); }});
    CGG.kpis(q("k"),[{label:"승인 대기",value:"2",unit:"건",tone:"due"},{label:"오늘 들어온 요청",value:"2",unit:"건"},{label:"기한 3일 이내",value:"0",unit:"건",tone:"stop",zeroMuted:true},{label:"이번 달 처리",value:"3",unit:"건",tone:"in"}]);
    tbl("t",{cols:["요청 때","가입하려는 가게","사업자번호","요청 종류","제품","상태","처리 기한"],kinds:["time","name","id","text","text","state","date"],rows:rows(),stateMap:MAP,
      tabs:[["","전체"],["승인 대기","승인 대기"],["승인함","승인함"],["거절함","거절함"],["만료됨","만료됨"]],find:"가게 · 사업자번호 · 신청한 사람",sort:[0,-1],select:false,
      mobileFields:[[2,"사업자번호"],[3,"요청 종류"],[5,"상태"]],onName:function(r,i){ detail(RQ[i]); },
      actions:function(r){ return r[5]==="승인 대기"?[{key:"see",label:"자세히"}]:[{key:"see",label:"보기"}]; },onAction:function(k,r,i){ detail(RQ[i]); }});
    tbl("t2",{cols:["때","누가","무엇","요청","사유"],kinds:["time","name","text","text","text"],rows:LOG,find:"요청 · 사유",sort:[0,-1],select:false,mobileFields:[[2,"무엇"],[3,"요청"]]});
  };
})();
