/* 차곳간 알림톡 문구 부품 ata 1.0 (워시 v137~ · 체크도 같은 부품)
   대표님 10/18: 알림톡은 카카오가 승인한 글자 그대로만 나가요 → 화면에서는 «보기만»(잠금), 고칠 수 있는 건 문자 문구뿐.
   글자 출처: 알림톡/00_확정본_13개_원문.md (솔라피 등록본 · 통과 8개 중 화면이 보내는 5개). 서버 ATA_TPL 과 같은 이름 · 같은 변수.
   CGG_ATATXT.list[key] = {name, body, sms}       key: intake · release · extra_work · bill · deposit_ok
   CGG_ATATXT.box(key, vars?, opt?)  → 잠긴 «알림톡 승인 문구» 칸 HTML (vars 를 주면 #{…} 자리에 예시 값을 넣어 보여 줌, 모두 esc)
                                       opt.noSms: 아래에 문자 문구 칸이 없는 화면(설정 등)이면 «문자 문구만 고칠 수 있어요» 줄을 빼요
   CGG_ATATXT.fill(text, vars) → #{…} 채우기 (빈 값은 «-», 서버와 같음) */
var CGG_ATATXT = (function(){
  var V="ata 1.0";
  function esc(s){ return (window.CGG&&CGG.esc) ? CGG.esc(s) : String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  var T={
    intake:{name:"차곳간_입고안내", body:"[차곳간] 차량 입고 안내\n#{딜러명}님(#{상사명}), #{업체명}에 차량이 입고되었습니다.\n\n차량번호: #{차량번호}\n작업: #{작업내용}\n입고시각: #{입고일시}\n\n작업이 끝나면 다시 안내드리겠습니다.\n문의: #{업체전화}\n\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.",
      sms:"[차곳간] #{차량번호} 입고되었습니다.\n#{업체명} 문의 #{업체전화}"},
    release:{name:"차곳간_출고안내", body:"[차곳간] 차량 출고 안내\n#{딜러명}님(#{상사명}), 작업이 끝나 차량이 출고되었습니다.\n\n차량번호: #{차량번호}\n작업: #{작업내용}\n도착한 곳: #{목적지}\n출고시각: #{출고일시}\n\n차량을 어디에 두었는지는 아래 버튼의 사진에서 확인하실 수 있습니다.\n문의: #{업체전화}\n\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.",
      sms:"[차곳간] #{차량번호} 출고되었습니다.\n도착한 곳: #{목적지}\n도착 사진 https://app.cgg.co.kr/v.html?c=#{보기코드}\n#{업체명} #{업체전화}", button:"도착 사진 보기"},
    extra_work:{name:"차곳간_추가작업", body:"[차곳간] 추가 작업 확인 요청\n\n#{차량번호} 차량에 추가로 손볼 곳이 있어 확인 요청드립니다.\n\n· 작업한 곳 : #{업체명}\n· 확인할 내용 : #{작업내용}\n· 예상 금액 : #{금액}원\n\n확인 후 회신 부탁드립니다.\n문의 #{업체전화}\n\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.",
      sms:"[차곳간] #{차량번호} 추가 작업 확인 부탁드립니다.\n#{작업내용} #{금액}원\n#{업체명} #{업체전화}", button:"사진 보기"},
    bill:{name:"차곳간_청구서", body:"[차곳간] #{기간} 청구 내역 안내\n\n#{받는곳} 님, #{업체명}에서 #{기간} 작업분 청구 내역을 보내드립니다.\n\n· 작업 대수 : #{건수}대\n· 청구 금액 : #{금액}원 (부가세 포함)\n· 입금 기한 : #{입금기한}\n· 입금 계좌 : #{계좌}\n\n자세한 내역은 아래 버튼에서 확인하실 수 있습니다.\n문의 #{업체전화}\n\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.",
      sms:"[차곳간] #{기간} 청구 내역\n· #{건수}대 #{금액}원\n· 입금 기한 #{입금기한}\n· #{계좌}\n내역 보기 https://app.cgg.co.kr/v.html?c=#{보기코드}\n#{업체명} #{업체전화}", button:"청구 내역 보기"},
    deposit_ok:{name:"차곳간_입금확인", body:"[차곳간] 입금 확인 안내\n\n#{받는곳} 님, 보내주신 #{금액}원 입금이 확인되었습니다.\n\n· 확인한 곳 : #{업체명}\n· 확인 시각 : #{확인일시}\n· 대상 : #{기간} 청구분\n\n감사합니다.\n문의 #{업체전화}\n\n본 안내는 #{업체명}의 요청으로 차곳간이 보내드립니다.",
      sms:"[차곳간] #{금액}원 입금 확인되었습니다. 감사합니다.\n#{업체명} #{업체전화}"}
  };
  function fill(text, vars){ return String(text||"").replace(/#\{([^}]+)\}/g,function(m,k){ var v=(vars||{})[k]; return (v==null||v==="")?"-":String(v); }); }
  /* 잠긴 칸 — 고치는 칸(textarea)이 아니라 글로만 보여 줘요. 예시 값이 없으면 #{…} 자리를 파란 글씨로 */
  function box(key, vars, opt){ opt=opt||{};
    var t=T[key]; if(!t) return "";
    var body=vars ? esc(fill(t.body, vars)) : esc(t.body).replace(/#\{([^}]+)\}/g,'<b style="color:var(--brand)">#{$1}</b>');
    return '<div class="ata-lock" style="border:1px solid var(--line);border-radius:12px;background:var(--surface2);padding:10px 12px;margin:0 0 12px">'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:0 0 6px"><b style="font-size:14px">알림톡 문구</b>'+
      '<span style="font-size:12px;font-weight:700;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:1px 8px;background:var(--surface)">🔒 카카오 승인 문구 · 고칠 수 없어요</span></div>'+
      '<div style="white-space:pre-wrap;font-size:13.5px;line-height:1.55">'+body+'</div>'+
      (t.button?'<div style="margin-top:6px;font-size:13px;color:var(--muted)">단추: '+esc(t.button)+'</div>':'')+
      '<div style="margin-top:6px;font-size:12.5px;color:var(--muted)">알림톡은 이 글자 그대로만 나가요.'+(opt.noSms?'':' 아래 <b>문자 문구</b>는 알림톡이 안 갈 때 가는 문자예요 — 이것만 고칠 수 있어요.')+'</div>'+
    '</div>';
  }
  return {V:V, list:T, fill:fill, box:box};
})();
