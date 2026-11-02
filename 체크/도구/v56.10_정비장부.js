<script>
/* ═══ 체크 v56.10 — 가온 정비 장부 받기 (총괄 11/2 · 대표님 «정비비 엑셀이 안 올라가요»)
   가온 장부 모양: 시트가 달마다(«2601정비» … «2610 정비» · 띄어쓰기 섞임 · 빈 시트 있음) ·
   열 «날짜 · 차량 · 차명 · 상사 · 이름 · 사유 · 금액» · 머리줄이 1줄째가 아닐 수 있음 · 맨 아래 합계 줄 · «○○ 청구제외 150,000» 같은 메모 줄
   ① 위쪽 달 칸(지금 고른 달)과 같은 «YYMM정비» 시트만 읽어요(예전에는 줄이 가장 많은 시트를 골라 다른 달이 들어갈 수 있었음)
   ② 열 이름을 서버가 읽는 이름으로(날짜→작업일 · 차량→차량번호 · 이름→신청인 · 사유→작업내용 · 상사→회사명)
   ③ 날짜가 없는 줄(합계 · 메모)은 넣지 않고 «확인 필요»로 보여 줘요 — 청구제외 · 선납 메모는 사람이 보고 정해요
   ④ 거래처에 없는 이름은 청구서에서 빠지니 이름을 알려 줘요
   돈 셈은 서버 그대로(정비비 = 장부 금액 그대로) — 이 파일은 읽기 · 알려 주기만 해요. ═══ */
(function(){
  var SHEET_RE=/^\s*(\d{2})\s*(\d{2})\s*정비/;
  var ALIAS={"날짜":"작업일","작업일":"작업일","일자":"작업일","정비일":"작업일",
    "차량":"차량번호","차량번호":"차량번호","차번":"차량번호",
    "차명":"차명","차종":"차명",
    "상사":"회사명","상사명":"회사명","회사명":"회사명","매매상사":"회사명",
    "이름":"신청인","신청인":"신청인","딜러":"신청인","딜러명":"신청인",
    "사유":"작업내용","작업내용":"작업내용","내용":"작업내용","정비내용":"작업내용",
    "금액":"금액","정비비":"금액"};
  function clean(v){ return String(v==null?"":v).replace(/[\u0000-\u001f]/g," ").trim(); }
  function num(v){ return typeof xNum==="function" ? xNum(v) : (Number(String(v==null?"":v).replace(/[^0-9.-]/g,""))||0); }
  function date(v, ym){ var d=typeof xDate==="function" ? xDate(v) : ""; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    var m=clean(v).match(/^(\d{1,2})\s*[.\/\-월]\s*(\d{1,2})\s*일?\.?$/);   /* «10/3» · «10.03» · «10월 3일» — 해는 고른 달의 해 */
    return (m && ym) ? ym.slice(0,4)+"-"+("0"+m[1]).slice(-2)+"-"+("0"+m[2]).slice(-2) : ""; }
  function wonT(n){ return typeof won==="function" ? won(n) : String(n); }
  try{ var st=document.createElement("style"); st.textContent=".msg.warn{background:var(--warn-soft,#fff4e0);color:var(--warn,#b45309);border-color:var(--warn,#b45309)}"; document.head.appendChild(st); }catch(e){}
  window.chkRepairBook=function(wb, fname){
    if(!wb || !wb.SheetNames) return null;
    var books=wb.SheetNames.filter(function(n){ return SHEET_RE.test(n); });
    if(!books.length) return null;                                   /* 가온 장부 모양이 아니면 예전대로 */
    var ym=String((typeof ST!=="undefined"&&ST&&ST.ym)||""), tag=ym.slice(2,4)+ym.slice(5,7);
    var nm=books.filter(function(n){ var m=n.match(SHEET_RE); return m && m[1]+m[2]===tag; })[0];
    if(!nm) return {err:fname+" 에 «"+tag+"정비» 시트가 없어요. 위쪽 달 칸을 맞는 달로 바꾼 뒤 다시 넣어 주세요. (있는 시트: "+books.join(" · ")+")"};
    var aoa=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1, raw:true, defval:""});
    if(!aoa.some(function(l){ return (l||[]).some(function(v){ return clean(v)!==""; }); })) return {err:"«"+nm+"» 시트에 넣을 정비 줄이 없어요(빈 시트예요)."};
    var hr=-1, map={};
    for(var i=0;i<Math.min(aoa.length,15);i++){
      var m={}, have={};
      (aoa[i]||[]).forEach(function(h,c){ var k=ALIAS[clean(h).replace(/\s/g,"")]; if(k && !have[k]){ m[c]=k; have[k]=1; } });
      if(have["금액"] && have["신청인"] && Object.keys(have).length>=4){ hr=i; map=m; break; }
    }
    if(hr<0) return {err:"«"+nm+"» 시트에서 열 이름(날짜 · 차량 · 이름 · 사유 · 금액) 줄을 못 찾았어요."};
    var rows=[], memo=[], sumSkip=0, total=0;
    for(var j=hr+1;j<aoa.length;j++){
      var line=aoa[j]||[], o={}, any=false;
      Object.keys(map).forEach(function(c){ var k=map[c], v=line[c]; if(clean(v)!=="") any=true; o[k]=(k==="금액")?num(v):(k==="작업일"?date(v,ym):clean(v)); });
      if(!any) continue;
      var txt=line.map(clean).filter(Boolean).join(" ");
      if(o["작업일"] && o["금액"]>0 && o["신청인"]){
        rows.push({"작업일":o["작업일"], "검사일":o["작업일"], "차량번호":o["차량번호"]||"", "차명":o["차명"]||"", "회사명":o["회사명"]||"",
                   "신청인":o["신청인"], "작업내용":o["작업내용"]||"정비비", "금액":o["금액"]});
        total+=o["금액"];
      } else if(/합\s*계|총\s*계|소\s*계/.test(txt)){ sumSkip++; }
      else memo.push(txt.slice(0,40));
    }
    if(!rows.length) return {err:"«"+nm+"» 시트에 넣을 정비 줄이 없어요(빈 시트예요)."};
    var names={}, miss=[];
    try{ (DEALERS||[]).forEach(function(d){ names[clean(d.name)]=1; }); }catch(e){}
    if(Object.keys(names).length) rows.forEach(function(r){ if(!names[r["신청인"]] && miss.indexOf(r["신청인"])<0) miss.push(r["신청인"]); });
    var note="«"+nm+"» 시트 "+wonT(rows.length)+"건 · "+wonT(total)+"원"+
      (memo.length?" · 확인 필요 "+wonT(memo.length)+"줄(넣지 않았어요): "+memo.slice(0,5).join(" / ")+(memo.length>5?" 외 "+wonT(memo.length-5)+"줄":""):"")+
      (miss.length?" · 거래처에 없는 이름 "+wonT(miss.length)+"명: "+miss.slice(0,10).join(", ")+(miss.length>10?" 외":"")+" — 청구서에서 빠져요. 설정 › 거래처에 넣어 주세요":"");
    return {sheet:nm, rows:rows, cols:["검사일","차량번호","차명","회사명","신청인","작업내용","금액"], ym:ym, note:note, warn:!!(memo.length||miss.length)};
  };
})();
</script>
