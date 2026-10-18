/* 돈 코드 지문 — 두 판의 정산 · 입금 · 세금계산서 · 청구서 계산 함수가 글자 하나까지 같은지 봐요 (체크 방 · v56)
   쓰는 법: node 체크/도구/돈코드_지문.js 체크/2_차곳간_체크_index_v55.1.html 체크/2_차곳간_체크_index_v56.html
   - 화면 파일 안 <script> 를 자바스크립트 문법 분석기(acorn)로 읽어, 아래 MONEY 이름의 함수(같은 이름이 여러 번이면 모두 차례대로)를 잘라 sha256 을 비교해요.
   - 하나라도 다르면 «다름» · 종료 값 2. 디자인 방 전체검사.js 가 나오면 그것도 함께 돌려요. */
const fs=require('fs'), crypto=require('crypto');
function req(n){ try{ return require(n); }catch(e){ return require('/opt/node-tools/node_modules/'+n); } }
const acorn=req('acorn'), walk=req('acorn-walk');
const MONEY=`calc leftOf taxOf insSum insG setInsQ depNorm depXlsParse depXlsGuess depXlsRead depXlsWhen depPicked depSrv
depApplyGo depUndoGo depDelGo depKindGo billLoadRows loadBill loadDep loadIns loadPrice loadTax match money vmoney won
feeGet feeKey feeSet priceNext1 priceAddGo priceDelGo billTargets billSendGo billDocHtml billXls billDel billUnsend
hometaxGo payHist dueBlock afterPay cwPay splitPartner billAtaText call insMoney`.split(/\s+/);
function prints(file){
  const html=fs.readFileSync(file,'utf8'), out={}; MONEY.forEach(n=>out[n]=[]);
  const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m, bad=0;
  while((m=re.exec(html))){ const src=m[1]; let ast;
    try{ ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true}); }catch(e){ bad++; continue; }
    const add=(name,node)=>{ if(out[name]) out[name].push(crypto.createHash('sha256').update(src.slice(node.start,node.end)).digest('hex').slice(0,12)); };
    walk.full(ast,node=>{
      if(node.type==='FunctionDeclaration'&&node.id) add(node.id.name,node);
      else if(node.type==='VariableDeclarator'&&node.id.type==='Identifier'&&node.init&&/Function/.test(node.init.type)) add(node.id.name,node.init);
      else if(node.type==='AssignmentExpression'&&node.right&&/Function/.test(node.right.type)){
        const l=node.left, nm=l.type==='Identifier'?l.name:(l.type==='MemberExpression'&&!l.computed?l.property.name:null); if(nm) add(nm,node.right); }
    }); }
  return {out,bad};
}
const [fa,fb]=process.argv.slice(2), A=prints(fa), B=prints(fb); let diff=0;
MONEY.forEach(n=>{ const same=A.out[n].join()===B.out[n].join(); if(!same) diff++;
  console.log((same?'같음 ':'다름 ')+n+' '+A.out[n].join(',')+(same?'':' → '+B.out[n].join(','))); });
const all=crypto.createHash('sha256').update(MONEY.map(n=>n+A.out[n].join()).join('|')).digest('hex').slice(0,12);
console.log(`돈 함수 ${MONEY.length}개 · 다른 것 ${diff} · 지문 ${all} · 못 읽은 script ${A.bad}/${B.bad}`);
process.exit(diff?2:0);
