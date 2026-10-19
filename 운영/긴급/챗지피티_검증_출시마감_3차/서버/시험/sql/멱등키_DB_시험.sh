#!/usr/bin/env bash
# SQL 26(3차 고침) — 진짜 PostgreSQL 16 으로: 예전 26 위에 덮어 돌리기 · 상태 넷 · 조건을 건 다시 잡기가 동시에 와도 한쪽만 (운영 DB 아님)
# 실행:  bash 서버/시험/sql/멱등키_DB_시험.sh   (PGHOST/PGPORT 로 시험용 DB · postgres 와 service_role 계정 필요)
set -u
D="$(cd "$(dirname "$0")" && pwd)"; Q="$D/../../sql"
P="psql -d postgres -U postgres -q -X"; S="psql -d postgres -U service_role -q -X"
pass=0; fail=0
ok(){ if [ "$2" = "1" ]; then pass=$((pass+1)); echo "  ✅ $1"; else fail=$((fail+1)); echo "  ❌ $1  ($3)"; fi; }
$P -Atc "select 1" >/dev/null 2>&1 || { echo "DB 에 접속하지 못함(PGHOST · PGPORT 확인)"; exit 2; }
K="product='wash' and tenant='SHA1' and who='01000000001' and fn='sendMsg'"
$P -c "drop table if exists cgg_idem" >/dev/null 2>&1
echo "■ 예전 26(run/done) → 새 26 두 번"
$P -f "$D/26_예전판.sql" >/dev/null 2>&1
$P -c "insert into cgg_idem (product,tenant,who,fn,rid,state) values ('wash','SHA1','01000000001','sendMsg','old000000000000000000001','done')" >/dev/null
$P -f "$Q/26_한번만_처리_멱등키.sql" >/tmp/cgg26a.out 2>&1; $P -f "$Q/26_한번만_처리_멱등키.sql" >/tmp/cgg26b.out 2>&1
ok "두 번 돌려도 오류 없음" "$([ "$(grep -ci "ERROR" /tmp/cgg26a.out /tmp/cgg26b.out | awk -F: '{s+=$2} END {print s}')" = "0" ] && echo 1 || echo 0)" "$(grep ERROR /tmp/cgg26*.out | head -2)"
ok "예전 줄은 그대로" "$($P -Atc "select count(*) from cgg_idem where rid='old000000000000000000001' and state='done'")" ""
ok "확인 표에 «상태 넷 있음 · RLS 켜짐»" "$([ "$(grep -c '있음\|켜짐' /tmp/cgg26b.out)" -ge 3 ] && echo 1 || echo 0)" "$(cat /tmp/cgg26b.out)"
echo "■ 상태"
for st in run done retry unknown; do
  $S -c "insert into cgg_idem (product,tenant,who,fn,rid,state) values ('wash','SHA1','01000000001','sendMsg','st${st}$(printf '%0*d' $((22-${#st})) 0)','$st')" >/dev/null 2>&1
done
ok "run·done·retry·unknown 넣기 됨(서버 계정)" "$([ "$($P -Atc "select count(*) from cgg_idem where rid like 'st%'")" = "4" ] && echo 1 || echo 0)" ""
ok "다른 상태(gone)는 거절" "$($S -c "insert into cgg_idem (product,tenant,who,fn,rid,state) values ('wash','SHA1','01000000001','sendMsg','stgone000000000000000000','gone')" 2>&1 | grep -c cgg_idem_state_check)" ""
ok "같은 열쇠 두 번 넣기 → 23505" "$($S -c "insert into cgg_idem (product,tenant,who,fn,rid) values ('wash','SHA1','01000000001','sendMsg','strun0000000000000000000')" 2>&1 | grep -c 'duplicate key')" ""
echo "■ 조건을 건 다시 잡기 — 동시에 둘"
R=race00000000000000000001
$P -c "insert into cgg_idem (product,tenant,who,fn,rid,state,at) values ('wash','SHA1','01000000001','sendMsg','$R','retry','2026-10-19 00:00:00+00')" >/dev/null
U="update cgg_idem set state='run', at=now(), result=null, done_at=null where $K and rid='$R' and state='retry' and at='2026-10-19 00:00:00+00' returning rid"
run(){ $S -At -c "begin; $U; select pg_sleep(1.2); commit;" >/tmp/cggi$1.out 2>&1; }
run 1 & sleep 0.2; run 2 & wait
got=$(cat /tmp/cggi1.out /tmp/cggi2.out | grep -c "$R")
ok "둘 중 하나만 잡음(바뀐 줄 1개)" "$([ "$got" = "1" ] && echo 1 || echo 0)" "$got"
ok "잡힌 뒤 상태 run" "$($P -Atc "select count(*) from cgg_idem where rid='$R' and state='run'")" ""
echo "■ 확인 중(unknown)·처리 중(run)은 다시 잡기 조건에 안 걸림"
$P -c "update cgg_idem set at='2026-10-18 00:00:00+00' where rid in ('stunknown000000000000000','strun0000000000000000000')" >/dev/null
n=$($S -At -c "update cgg_idem set state='run', at=now() where $K and rid='stunknown000000000000000' and state='retry' returning rid" | grep -c st)
ok "unknown 줄은 retry 조건으로 못 잡음" "$([ "$n" = "0" ] && echo 1 || echo 0)" "$n"
echo "■ 행 보안: 화면 계정(anon)은 못 읽음"
$P -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if; end \$\$; grant usage on schema public to anon; grant select on cgg_idem to anon" >/dev/null 2>&1
ok "anon 으로 0줄" "$([ "$($P -Atc "set role anon; select count(*) from cgg_idem")" = "0" ] && echo 1 || echo 0)" ""
echo; echo "결과: ${pass}개 통과, ${fail}개 실패"; [ "$fail" = "0" ]
