# 메뉴 지도 확정본 — 워시 · 체크 (2026-10-18)

> 대표님 결정(10/18, 총괄 알림): **「메뉴 찾기 쉽게」 = A + C + D 모두 합치기**
> A 왼쪽 메뉴 늘 펼침(폰은 아래 탭 + 전체 메뉴) · C 기능 찾기 검색칸 · D 홈 바로가기(사용자가 고정, 이 기기에만 저장) · 배달은 큰 메뉴(운영/06 O)
> 미리보기: https://claude.ai/artifact/WgNrDzAcwZjuELTUHdgdCq (저장소 `디자인/메뉴찾기_합친모양.html` · 앱 `디자인/메뉴찾기_앱.html`)
> **시험 뒤 새 판에서 만들어요. 시험판 파일은 고치지 않아요. 보안 검사를 받아요.**

## 파일
| 파일 | 무엇 |
|---|---|
| `워시_메뉴.js` | `CGG_MENU_WASH` — 큰 메뉴 9개(groups) · 폰 아래 탭(tabs) · 기능 32가지(feats, 쉬운 말 포함) · 처음 바로가기 6개 |
| `체크_메뉴.js` | `CGG_MENU_CHECK` — 같은 모양. 체크 방이 v44로 확인한 줄 반영 |
| `../공통/cgg-j4-1.7.css · .js` | 공통 부품 1.7 — `CGG.nav` · `CGG.allMenu` · `CGG.find` · `CGG.quick` · `CGG.spot` (아래 «붙이는 법») |

**이 목록 하나가 왼쪽 메뉴 · 폰 전체 메뉴 · 기능 찾기 · 바로가기 고르기에 함께 쓰여요.** 기능을 새로 만들면 이 파일에 한 줄만 더하면 돼요. 그 일은 디자인 방에 요청하거나, 제품 방이 더한 뒤 디자인 방에 알려요.

## 바뀌는 곳 (두 제품)
| 제품 | 지금 | 바뀐 뒤 |
|---|---|---|
| 워시 | 일감 › 출고 기록 · 출고 기록 화면 아래 «출고 알림 문구» · 설정 › 배달 도착지 | **배달**(큰 메뉴): 출고 기록 · 도착지 · 문구 · 발송 설정. 일감에는 입출고 내역만 남아요 |
| 워시 | PC 화면일 때 폰 아래 탭: 홈 · 일감 · 입출금 · 세금계산서 · 전체 | 홈 · 일감 · **배달** · 입출금 · 전체 (세금계산서는 전체 안으로). 현장 화면 탭은 그대로 |
| 체크 | 알림 › 재검사 알림 / 차량 배달 알림(배달 기록 · 목적지별 · 목적지 관리 · 문구 · 발송 설정 · 기사 계정 · 휴지통) | **배달**(큰 메뉴): 배달 기록 · 목적지별 · 목적지 관리 · 문구 · 발송 설정 · 기사 계정. 배달 휴지통은 사람 버튼 ▾ 휴지통으로 합쳐요. **재검사 알림**은 큰 메뉴(이름만 바뀜) |
| 체크 | 폰 아래 탭: 홈 · 정산 기록 · 입출금 · 계산서 · 전체 | 홈 · 청구서 · **배달** · 입출금 · 전체 (정산 기록 · 계산서는 전체 안으로) |
| 체크 | 설정 묶음 이름 «정산 기준 · 연결 · 이 화면» | 왼쪽 메뉴에 7칸이 바로 보이므로 묶음 이름은 쓰지 않아요 |
| 두 제품 | 홈 | 맨 위 **자주 쓰는 기능**(바로가기) + 할 일 카드에 **«오늘 배달 N대 · 못 보낸 것 N대»**(못 보낸 것이 있으면 주황 «확인 필요») |
| 두 제품 | 처음 메뉴 배치 «가로» | 처음은 **«세로»**(왼쪽 메뉴 늘 펼침). 화면 설정에서 가로 · 아이콘으로 바꿀 수 있어요 |

## 열쇠 표 — `go` 이름표를 제품 화면으로 잇기
`go`는 `"묶음/칸"` 이름표예요. 각 제품은 `go` 하나를 받아 자기 화면으로 가는 함수 하나만 만들면 돼요. 오른쪽 칸은 지금 화면 열쇠예요(디자인 방이 미리보기에서 읽은 값). 칸 열쇠를 모르는 곳은 «제품 방이 정함»이라고 적었어요.

### 워시 (v127 기준)
| go | 지금 화면 열쇠 |
|---|---|
| `home` · `sales` · `bill` · `tax` · `mat` | `S.tab` = home · sales · bill · tax · mat |
| `ledger/list` | `S.tab="ledger"` |
| `delivery/outlog` | 지금 `S.tab="outlog"` → 새 큰 메뉴 «배달» 첫 칸 |
| `delivery/dest` | 지금 `S.tab="settings", S.setSub="sms"`(배달 도착지) → 배달 아래로 옮김 |
| `delivery/msg` | 지금 출고 기록 화면 아래 «출고 알림 — 문구와 보내는 방식» 카드 → 배달 아래 칸으로 |
| `money/io` · `money/due` | `S.tab="money"` + 안쪽 탭(입·출금 / 받아야 할 금액) |
| `settings/biz · parties · staff · items · caropt · bank · send · outbox · qr · bak` | `S.tab="settings", S.setSub=` 같은 이름 |
| `field/in` | 현장 화면 «입고» (PC에서는 현장 화면으로 바꾼 뒤) |
| `me/trash · me/plan · me/me` | 사람 버튼 ▾ 항목 열기 |

### 체크 (v44 기준)
| go | 지금 화면 열쇠 |
|---|---|
| `home` · `history` · `hometax` | `data-go` = home · history · hometax |
| `sales/list · sales/upload` | `data-go="sales"` + 안쪽 탭(매출 내역 / 자료 올리기) |
| `bill/month · bill/group · bill/tpl` | `data-go="bill"` + 안쪽 탭(월별 청구서 / 청구처 묶음 / 알림톡 템플릿) |
| `deposit/in · deposit/ins` | `data-go="deposit"` + 안쪽 탭(입금 내역 / 보험료 대조) |
| `remind` | 지금 `data-go="remind"` › 재검사 알림 탭 |
| `delivery/log · bydest · dest · msg · driver` | 지금 `remind` › 차량 배달 알림 › 안쪽 탭 → 새 큰 메뉴 «배달» (칸 열쇠는 제품 방이 정함) |
| `set/partner · price · fee · popbill · sms · alarm · backup` | `data-allgo="set"` + `data-go=` 같은 이름 |
| `me/trash · me/plan · me/me` | 사람 버튼 ▾ 항목 열기 |

### `spot` — 화면 안 칸에 붙일 id
기능 찾기나 바로가기로 오면 그 칸까지 내려가서 2초 동안 빛나요(`CGG.spot`). 아래 id를 그 칸 바깥 상자에 붙여 주세요. 안 붙이면 화면 맨 위만 열리고 오류는 나지 않아요.
- 워시: `#wkBulkPaid`(입금 완료 표시 버튼 줄) · `#billSendCard`(2. 청구서 보내기) · `#matShops`(도매상 목록) · `#ptDealers`(거래처 딜러 목록) · `#smsFrom`(발신번호 칸)
- 체크: `#billSendCard` · `#dealerWait`(딜러 등록 대기) · `#ptCompanies`(매매상사 사업자) · `#ptDealers`(딜러) · `#ptSupplier`(공급자 · 우리 사업장)

## 붙이는 법 (워시 · 체크 방, 시험 뒤 새 판)
1. **넣는 순서**는 지금 규칙과 같아요.
   - `cgg-j4-1.7.css`는 `<style>` 맨 끝에 넣어요.
   - `cgg-j4-1.7.js`는 제품 스크립트보다 먼저 따로 `<script>`로 넣어요.
   - 그 바로 뒤에 `워시_메뉴.js`(또는 `체크_메뉴.js`) 내용을 넣어요.
2. 1.5 → 1.6에서 바뀐 세 가지(`.cgg-hdr-biz`, `render`의 `{html}`, `rowId`)를 먼저 해요. 자세한 것은 `디자인/공통/README.md` «1.6»에 있어요.
3. **화면 이동 함수 하나**를 만들어요. `function goKey(go){ … }`는 위 열쇠 표대로 화면을 바꿔요. 기능 찾기 · 바로가기에서 쓰는 `goFeat(f)`도 만들어요. `me/`나 `field/`로 시작하면 그 동작을 하고, 나머지는 `goKey(f.go)`를 불러요.
4. 머리말과 메뉴를 바꿔요.
   ```js
   CGG.layout.init(바깥상자, "cgg_wash_layout");              // 1.7: 처음은 세로(왼쪽 메뉴 늘 펼침)
   CGG.nav(document.querySelector(".cgg-nav"), M.groups, 지금go, goKey);
   CGG.find(머리말 .cgg-right 안 상자, M.feats, goFeat, {phone:function(){ CGG.allMenu(M.groups, 지금go, goKey, M.feats, goFeat, {focus:true}); }});
   CGG.tabbar(탭바, M.tabs, 지금 큰 메뉴(없으면 "__all"), function(k){ if(k==="__all"){ if(!CGG.closeSheet()) CGG.allMenu(M.groups, 지금go, goKey, M.feats, goFeat); } else { CGG.closeSheet(); goKey(k); } });
   CGG.quick(홈 맨 위 상자, M.feats, M.quickKey, M.quickDefault, goFeat);   // 홈에서만
   ```
   (`M`은 `CGG_MENU_WASH` 또는 `CGG_MENU_CHECK`)
5. 지금 있는 화면 안 작은 탭(안쪽 탭)은 **그대로 둬도 돼요**. 넓은 화면에서는 왼쪽 메뉴에도 같은 칸이 보이고, 폰에서는 화면 안 탭이 그대로 쓰여요. 화면을 다시 그릴 때마다 `CGG.nav`를 다시 불러서 왼쪽 메뉴의 지금 칸을 맞춰요.
6. **바로가기 저장**은 `localStorage`(이 기기)에만 해요. 서버에는 보내지 않아요. 부품이 모르는 id나 겹치는 id는 저절로 버려요.

## 확인 기준 (각 방이 새 판에서)
- 넓은 화면(1400): 왼쪽에 큰 메뉴 9개와 아래 칸이 다 보이고, 지금 칸이 밝게 표시돼요.
- 기능 찾기에 아래 말을 치면 첫 결과가 맞아요: «딜러 추가» «배달 기록» «청구서 보내기» «발신번호» «미수금»(워시) · «입금 대기»(체크). Enter를 누르면 그 화면으로 가고 그 칸이 빛나요.
- 폰(360 · 390): 아래 탭 «전체» → 맨 위 찾기 칸 + 모든 메뉴가 나오고, 아래 탭이 가려지지 않아요.
- 홈 «자주 쓰는 기능»: 처음 6개가 보이고, «바로가기 고르기»로 바꾸면 새로고침해도 남아요.
- 폰 깨짐 검사 0 (`디자인/폰_깨짐_목록.md`의 방법)
