/*  기존(업무용) 기록 백업 (10차) — %APPDATA%\carcheck-dual 을 «문서\차곳간_백업\carcheck-dual-날짜» 로 복사만 한다.
 *  지우거나 고치지 않는다. 로그인 정보(credentials.json)와 사이트 로그인 상태·임시 파일(Partitions·Cache 등)은 복사하지 않는다.
 *  시험판을 쓰기 «전»에 한 번. 업무용 프로그램은 꺼 두고 실행한다. */
const fs = require('fs');
const path = require('path');
const { appData } = require('./data-dir');
const src = path.join(appData(), 'carcheck-dual');
if (!fs.existsSync(src)) { console.log('업무용 기록 폴더가 없어요(이 PC에서 아직 안 썼거나 다른 곳). 백업할 것이 없어요.'); process.exit(0); }
const home = require('os').homedir();
const docs = fs.existsSync(path.join(home, 'Documents')) ? path.join(home, 'Documents') : home;
const d = new Date();
const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
const dest = path.join(docs, '차곳간_백업', 'carcheck-dual-' + stamp);
const SKIP = /^(credentials\.json|Partitions|Cache|Code Cache|GPUCache|DawnCache|DawnGraphiteCache|DawnWebGPUCache|blob_storage|Crashpad|Session Storage|Local Storage|IndexedDB|Service Worker|Network|Cookies.*|Shared Dictionary|SingletonLock|SingletonCookie|SingletonSocket|lockfile)$/i;
let n = 0;
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true, filter: (p) => { const b = path.basename(p); if (p !== src && SKIP.test(b)) return false; if (fs.statSync(p).isFile()) n++; return true; } });
console.log('업무용 기록을 백업했어요: 파일 ' + n + '개');
console.log('  → ' + dest);
console.log('(로그인 정보와 사이트 로그인 상태는 복사하지 않았어요. 업무용 프로그램 폴더와 기록은 그대로예요.)');
