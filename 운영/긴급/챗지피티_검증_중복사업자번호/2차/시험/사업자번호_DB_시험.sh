#!/usr/bin/env bash
# 사업자번호 겹침 막기 — 진짜 PostgreSQL 16 으로 SQL 23·급한고침·24·25 를 돌려 보는 시험 (운영 DB 아님 · 가짜 표)
# 실행:  bash 서버/시험/sql/사업자번호_DB_시험.sh   (PGHOST/PGPORT 로 시험용 DB 를 가리킴 · postgres 와 service_role 계정 필요)
set -u
D="$(cd "$(dirname "$0")" && pwd)"; Q="$D/../../sql"
P="psql -d postgres -U postgres -q -X"; S="psql -d postgres -U service_role -q -X"
pass=0; fail=0
ok(){ if [ "$2" = "1" ]; then pass=$((pass+1)); echo "  ✅ $1"; else fail=$((fail+1)); echo "  ❌ $1  ($3)"; fi; }
err(){ n=$($S -c "$1" 2>&1 | grep -c "이미 등록된 사업자번호\|쓸 수 없습니다"); [ "$n" -gt 0 ] && echo 1 || echo 0; }
none(){ [ "$1" = "0" ] && echo 1 || echo 0; }     # 0건이면 통과
some(){ [ "$1" -gt 0 ] 2>/dev/null && echo 1 || echo 0; }   # 1건 이상이면 통과
$P -f "$D/가짜_운영표.sql" >/dev/null 2>&1
echo "■ 23(읽기만): 바꾸는 것 없음"
before=$($P -Atc "select md5(string_agg(t::text, '|' order by t::text)) from (select * from wash_shops) t")
$P -f "$Q/23_중복사업자번호_확인_읽기만.sql" >/tmp/cgg23.out 2>&1
after=$($P -Atc "select md5(string_agg(t::text, '|' order by t::text)) from (select * from wash_shops) t")
ok "23번 실행 뒤 표가 그대로" "$([ "$before" = "$after" ] && echo 1)" ""
ok "23번이 B 화면설정의 남의 번호를 찾음(업체표 번호 비어 있음)" "$(some "$(grep -c 'WT01.*비어 있음' /tmp/cgg23.out)")" "$(grep WT01 /tmp/cgg23.out | head -2)"
ok "23번 결과에 전화번호 원문 없음" "$(none "$(grep -c '01066555545\|01012345678' /tmp/cgg23.out)")" ""
echo "■ 10/15 잠금 + 24 실행(두 번)"
$P -f "$Q/급한고침_사업자번호_잠금.sql" >/dev/null 2>&1
$P -f "$Q/24_사업자번호_겹침_막기.sql" >/dev/null 2>&1; $P -f "$Q/24_사업자번호_겹침_막기.sql" >/tmp/cgg24.out 2>&1
ok "24번 두 번 실행해도 오류 없음 · 모두 켜짐" "$(none "$(grep -c 'ERROR' /tmp/cgg24.out)")" "$(grep ERROR /tmp/cgg24.out | head -2)"
echo "■ 서버 계정(service_role)으로 남의 번호 넣기"
ok "B 업체에 A 번호" "$(err "update wash_shops set biz_no='876-12-02709' where shop='WT01'")" ""
ok "새 업체를 A 번호로" "$(err "insert into wash_shops (shop,name,biz_no) values ('NEW1','새','8761202709')")" ""
ok "다른 종사업장(0002)이라도 승인 없으면 거절" "$(err "update wash_shops set biz_no='8761202709', biz_sub='0002' where shop='WT01'")" ""
ok "체크 검사소에 A 번호(팝빌 번호로)" "$(err "update check_office set popbill_corp='8761202709' where code='GAON'")" ""
ok "본사 번호" "$(err "update wash_shops set biz_no='1112233333' where shop='WT01'")" ""
echo "■ 본사 승인 뒤"
$P -c "insert into check_office (code,name) values ('NEWC','새검사소'); insert into biz_share_ok (product, code, biz_no, biz_sub, by_who) values ('check','NEWC','8761202709','0000','시험')" >/dev/null
$S -c "update check_office set biz_no='8761202709' where code='NEWC'" >/dev/null 2>&1
ok "승인된 체크 검사소는 같은 번호(다른 제품) 연결됨" "$($P -Atc "select count(*) from check_office where code='NEWC' and biz_no='8761202709'")" ""
$P -c "insert into biz_share_ok (product, code, biz_no, biz_sub, by_who) values ('wash','WT01','8761202709','0002','시험')"
ok "승인돼도 같은 제품 · 같은 키(번호+0000)는 금지" "$(err "update wash_shops set biz_no='8761202709', biz_sub='0000' where shop='WT01'")" ""
$S -c "update wash_shops set biz_no='8761202709', biz_sub='0002' where shop='WT01'" >/dev/null 2>&1
ok "승인된 다른 종사업장(0002)은 들어감" "$($P -Atc "select count(*) from wash_shops where shop='WT01' and biz_sub='0002'")" ""
$P -c "update wash_shops set biz_no=null, biz_sub=null where shop='WT01'; delete from biz_share_ok where code='WT01'" >/dev/null
echo "■ 동시에 같은 번호"
$P -c "insert into wash_shops (shop,name) values ('RACE1','동시1'),('RACE2','동시2'); insert into check_office (code,name) values ('RACEC','동시검사소')" >/dev/null
run(){ $S -c "begin; $1; select pg_sleep(1.2); commit;" >/tmp/cggr$2.out 2>&1; }
run "update wash_shops set biz_no='3334455555' where shop='RACE1'" 1 & run "update wash_shops set biz_no='333-44-55555' where shop='RACE2'" 2 & wait
ok "워시 두 곳 동시 → 한 곳만" "$($P -Atc "select (count(*)=1)::int from wash_shops where cgg_biz_digits(biz_no)='3334455555'")" ""
run "update wash_shops set biz_no='7778899999' where shop='RACE2'" 3 & run "update check_office set biz_no='7778899999' where code='RACEC'" 4 & wait
ok "워시+체크 동시(색인으론 못 막는 경우) → 한 곳만" "$($P -Atc "select ((select count(*) from wash_shops where cgg_biz_digits(biz_no)='7778899999')+(select count(*) from check_office where cgg_biz_digits(biz_no)='7778899999')=1)::int")" ""
echo "■ 다른 칸 저장 · 본사"
$S -c "update wash_shops set name='브라더광택(본점)' where shop='BRO1'" >/dev/null 2>&1
ok "번호를 안 바꾸는 저장은 그대로" "$($P -Atc "select count(*) from wash_shops where name='브라더광택(본점)'")" ""
$P -c "update wash_shops set biz_no='9990001111' where shop='RACE2'" >/dev/null 2>&1
ok "본사(SQL Editor)는 고칠 수 있음" "$($P -Atc "select count(*) from wash_shops where shop='RACE2' and biz_no='9990001111'")" ""
echo "■ 25 정리안(B만 · 연습/진짜/되돌리기)"
$P -f "$D/가짜_운영표.sql" >/dev/null 2>&1; $P -c "update wash_shops set biz_no='876-12-02709', ceo='정대봉', pb_id='x' where shop='WT01'" >/dev/null
ok "업체코드 안 넣으면 멈춤" "$(some "$($P -f "$Q/25_중복사업자번호_정리안_승인뒤.sql" 2>&1 | grep -c '멈춤')")" ""
sed "s/여기에_B_업체코드/WT01/" "$Q/25_중복사업자번호_정리안_승인뒤.sql" > /tmp/cgg25b.sql
$P -f /tmp/cgg25b.sql >/dev/null 2>&1
ok "연습(rollback)은 아무것도 안 바꿈" "$($P -Atc "select count(*) from wash_shops where shop='WT01' and biz_no='876-12-02709'")" ""
sed 's/^rollback;   -- ← 연습.*/commit;/' /tmp/cgg25b.sql > /tmp/cgg25c.sql; $P -f /tmp/cgg25c.sql >/dev/null 2>&1
ok "진짜: B 업체표·화면설정만 비움 · A 그대로" "$($P -Atc "select ((select count(*) from wash_shops where shop='WT01' and biz_no is null and pb_id is null)=1 and (select count(*) from wash_shops where shop='BRO1' and biz_no='8761202709')=1 and (select data->'supplier'->>'bizNo' from wash_docs where shop='WT01' and id='config')='' and (select data->'supplier'->>'bizNo' from wash_docs where shop='BRO1' and id='config')='8761202709')::int")" ""
sed -n '/── 되돌리기/,$p' "$Q/25_중복사업자번호_정리안_승인뒤.sql" | sed 's/^-- //' | grep -v '되돌리기' > /tmp/cgg25r.sql; $P -f /tmp/cgg25r.sql >/dev/null 2>&1
ok "되돌리기로 원래대로" "$($P -Atc "select ((select biz_no from wash_shops where shop='WT01')='876-12-02709' and (select data->'supplier'->>'bizNo' from wash_docs where shop='WT01' and id='config')='876-12-02709')::int")" ""
echo "■ 운영에 이미 겹친 줄이 있을 때(업체표에도 B가 A 번호) — 24번이 실패하지 않고 새 줄만 막음"
$P -f "$D/가짜_운영표.sql" >/dev/null 2>&1; $P -c "update wash_shops set biz_no='876-12-02709' where shop='WT01'" >/dev/null
$P -f "$Q/급한고침_사업자번호_잠금.sql" >/dev/null 2>&1
before=$($P -Atc "select md5(string_agg(t::text, '|' order by t::text)) from (select shop,name,biz_no,ceo,pb_id from wash_shops) t")
$P -f "$Q/24_사업자번호_겹침_막기.sql" >/tmp/cgg24b.out 2>&1
ok "24번 오류 없이 끝남" "$(none "$(grep -c ERROR /tmp/cgg24b.out)")" "$(grep ERROR /tmp/cgg24b.out | head -1)"
after=$($P -Atc "select md5(string_agg(t::text, '|' order by t::text)) from (select shop,name,biz_no,ceo,pb_id from wash_shops) t")
ok "기존 줄(겹친 A·B 포함)은 한 글자도 안 바뀜" "$([ "$before" = "$after" ] && echo 1 || echo 0)" ""
ok "색인은 켜짐 · 겹친 두 곳만 빼 둠" "$($P -Atc "select (pg_get_indexdef('wash_shops_biz_uq'::regclass) like '%<> ALL%' and pg_get_indexdef('wash_shops_biz_uq'::regclass) like '%BRO1%' and pg_get_indexdef('wash_shops_biz_uq'::regclass) like '%WT01%')::int")" ""
ok "겹친 두 곳이 승인 대기로 표시됨" "$($P -Atc "select (count(*)=2)::int from biz_share_req where state='wait' and memo like '24번 실행 때%'")" ""
ok "세 번째 업체는 그 번호 거절" "$(err "insert into wash_shops (shop,name,biz_no) values ('NEW3','셋째','8761202709')")" ""
$S -c "update wash_shops set name='브라더광택2' where shop='BRO1'" >/dev/null 2>&1
ok "겹친 A의 다른 칸 저장은 그대로 됨(손님 영업 안 멈춤)" "$($P -Atc "select count(*) from wash_shops where shop='BRO1' and name='브라더광택2'")" ""
$P -f "$Q/24_사업자번호_겹침_막기.sql" >/dev/null 2>&1; $P -f "$Q/24_사업자번호_겹침_막기.sql" >/dev/null 2>&1
ok "24번 여러 번 실행해도 승인 대기가 늘지 않음" "$($P -Atc "select (count(*)=2)::int from biz_share_req where memo like '24번 실행 때%'")" ""
sed "s/여기에_B_업체코드/WT01/; s/^rollback;   -- ← 연습.*/commit;/" "$Q/25_중복사업자번호_정리안_승인뒤.sql" > /tmp/cgg25d.sql; $P -f /tmp/cgg25d.sql >/dev/null 2>&1
$P -f "$Q/24_사업자번호_겹침_막기.sql" >/dev/null 2>&1
ok "25번 정리 뒤 24번 다시 → 빼 둔 곳 없이 색인" "$($P -Atc "select (pg_get_indexdef('wash_shops_biz_uq'::regclass) not like '%<> ALL%')::int")" ""
echo; echo "결과: ${pass}개 통과, ${fail}개 실패"; [ "$fail" = "0" ]
