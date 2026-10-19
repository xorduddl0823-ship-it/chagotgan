/* 홈택스 일괄발급 파일 나누기 시험 (체크 v56.5) — 50 · 51 · 100 · 101건을 넣고 «홈택스 일괄발급 엑셀 받기»를 눌러 파일 수 · 파일마다 줄 수를 봐요.
   쓰는 법: node 체크/도구/홈택스_50건_시험.js <미리보기.html 절대 경로> <xlsx.full.min.js 0.18.5 절대 경로> (CDN 대신 그 파일을 써요) */
const pw=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const [f]=process.argv.slice(2);const b=await pw.chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
await p.route('**/xlsx.full.min.js',r=>r.fulfill({path:process.argv[3],contentType:'application/javascript'}));let errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
await p.goto('file://'+f);await p.waitForTimeout(1800);await p.evaluate(()=>go('hometax'));await p.waitForTimeout(1200);
for(const N of [50,51,100,101]){
 const r=await p.evaluate(N=>{ const base=TAXES.find(t=>t.can&&!t.skip&&!/발급|발행|전송/.test(t.state||""))||TAXES[0];
  const save=TAXES.slice(); TAXES.length=0;
  for(let i=0;i<N;i++){ const t=Object.assign({},base,{id:"T"+i,can:true,skip:false,state:"",unpaid:false,name:"시험거래처"+i,biz:"999"+String(1000000+i).slice(1)+"0"}); TAXES.push(t); }
  const out=[]; const oa=window.ask, ow=XLSX.writeFile, op=window.picked; let sub="";
  window.picked=function(){ return []; };
  window.ask=function(o,done){ sub=o.v1; done&&done(); };
  XLSX.writeFile=function(wb,name){ let rows=0; wb.SheetNames.forEach(sn=>{ XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1}).forEach(rw=>{ if(rw.some(c=>/^999-?\d\d-?\d{5}$/.test(String(c)))) rows++; }); }); out.push(name.replace(/^.*?_(\d+of\d+_)?/,"$1")+" 줄 "+rows); };
  try{ document.getElementById("txXls").click(); }catch(e){ out.push("오류 "+e.message); }
  window.ask=oa; XLSX.writeFile=ow; window.picked=op; TAXES.length=0; save.forEach(t=>TAXES.push(t));
  return {N, sub, files:out}; },N);
 console.log(r.N+"건 → 파일 "+r.files.length+"개 · "+r.files.join(" / ")+" · 확인 창: "+r.sub);}
console.log("errors",errs);await b.close();})();
