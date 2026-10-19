/* 돈 지문 새 기준값 제안 — 디자인 전체검사.js 의 셈(bodies · fp) 그대로, 정식 판 자리만 워시 v140 · 체크 v56.4 로 (기준값 저장은 디자인 방)
   쓰는 법: node 체크/도구/돈지문_제안_v56.4.js  → 체크/올리기용/돈코드_기준값_v56.4_제안.json
   워시 칸은 워시 방 제안(워시/시안/돈코드_기준값_v140_제안.json)과 같은지도 맞춰 봐요. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..','..'), T=fs.readFileSync(path.join(ROOT,'디자인/통합검사/전체검사.js'),'utf8');
const a=T.indexOf('const MONEY='), b=T.indexOf('const args=');
const {MONEY,prints}=new Function('fs','crypto',T.slice(a,b)+'\nreturn {MONEY,prints};')(fs,crypto);
const FILES={wash:'워시/1_차곳간_워시_index_v140.html', check:'체크/2_차곳간_체크_index_v56.4.html'};
process.chdir(ROOT);
const base={made:'2026-10-19',files:FILES,money:{}};
for(const p of ['wash','check']){ base.money[p]=prints(FILES[p],MONEY[p]); const miss=Object.keys(base.money[p]).filter(k=>!base.money[p][k]); if(miss.length){ console.log('❌ 없는 함수 '+p+' '+miss); process.exit(3); } }
const W=JSON.parse(fs.readFileSync('워시/시안/돈코드_기준값_v140_제안.json','utf8'));
const wd=Object.keys(base.money.wash).filter(k=>W.money.wash[k]!==base.money.wash[k]);
const OLD=JSON.parse(fs.readFileSync('디자인/통합검사/돈코드_기준값.json','utf8'));
const cd=Object.keys(base.money.check).filter(k=>OLD.money.check[k]!==base.money.check[k]);
fs.writeFileSync('체크/올리기용/돈코드_기준값_v56.4_제안.json',JSON.stringify(base,null,1)+'\n');
console.log('워시 칸 = 워시 v140 제안과 다른 것 '+wd.length+' · 체크 칸이 지금 기준값과 다른 것: '+cd.join(', '));
