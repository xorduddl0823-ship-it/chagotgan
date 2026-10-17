/* 통합 검사표 — 명령 줄 (디자인 방)
   쓰는 법:  node 디자인/통합검사/검사.js <워시 미리보기 파일> <체크 미리보기 파일> [폭=1400]
   예:       node 디자인/통합검사/검사.js 워시/시안/워시_v125_미리보기.html 체크/시안/체크_v42_미리보기.html
   저장소 맨 위 폴더에서 돌려요. 화면은 그 자리에서 잠깐 여는 작은 서버로 열어요(파일을 바꾸지 않아요).
   결과: 표(같음 ✅ / 다름 ❌)와 «다른 것 N가지». 판을 올릴 때마다 돌려서 0가지여야 해요. */
const path=require('path'),fs=require('fs'),http=require('http');
let pw; try{ pw=require('playwright'); }catch(e){ pw=require('/opt/node22/lib/node_modules/playwright'); }
const {cggMeasure,cggCompare}=require('./재는것.js');
const [fa,fb,wArg]=process.argv.slice(2).filter(a=>!a.startsWith('--')); if(!fa||!fb){ console.log('쓰는 법: node 디자인/통합검사/검사.js <워시 파일> <체크 파일> [폭]'); process.exit(1); }
const W=+(wArg||1400), ROOT=process.cwd();
const srv=http.createServer((req,res)=>{ const p=path.join(ROOT,decodeURIComponent(req.url.split(/[?#]/)[0]));
  if(!(p===ROOT||p.startsWith(ROOT+path.sep))||!fs.existsSync(p)||fs.statSync(p).isDirectory()){ res.writeHead(404); return res.end(); }
  let body=fs.readFileSync(p); const ext=path.extname(p);
  if(ext==='.html'){ let t=body.toString('utf8'); if(!/^\s*<!doctype/i.test(t)) t='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t; body=Buffer.from(t); }
  res.writeHead(200,{'content-type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'}[ext]||'application/octet-stream'}); res.end(body); }).listen(0,'127.0.0.1');   /* 이 컴퓨터 안에서만 열려요 */
(async()=>{ const port=srv.address().port; const b=await pw.chromium.launch(); const res=[];
  for(const f of [fa,fb]){ const pg=await b.newPage({viewport:{width:W,height:900}}); pg.on('dialog',d=>d.dismiss().catch(()=>{}));
    await pg.goto('http://localhost:'+port+'/'+f.split('#')[0].split('/').map(encodeURIComponent).join('/')+(f.includes('#')?'#'+f.split('#')[1]:''),{waitUntil:'load'}); await pg.waitForTimeout(1600);
    await pg.addScriptTag({content:cggMeasure.toString()}); res.push(await pg.evaluate(()=>cggMeasure(document))); await pg.close(); }
  await b.close(); srv.close();
  const rows=cggCompare(res[0],res[1]); const bad=rows.filter(r=>!r.same);
  console.log('| 묶음 | 재는 것 | '+path.basename(fa)+' | '+path.basename(fb)+' | 같음 |\n|---|---|---|---|---|');
  rows.forEach(r=>console.log('| '+r.group+' | '+r.label+' | '+r.a+' | '+r.b+' | '+(r.same?'✅':'❌')+' |'));
  console.log('\n다른 것 '+bad.length+'가지 / '+rows.length+'가지'+(process.argv.includes('--json')?'\n'+JSON.stringify(rows):''));
  process.exit(bad.length?2:0); })();
