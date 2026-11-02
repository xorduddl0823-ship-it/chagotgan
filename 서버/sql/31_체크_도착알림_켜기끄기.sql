-- ============================================================
-- 31. 체크 배달 «도착 알림 켜기/끄기» (2026-11-02 · 서버 방 · 대표님·체크 방)
-- ============================================================
-- 무엇을: check_deliv_conf 에 arrive_on(켬 true / 끔 false) 칸 하나를 더해요. 처음 값은 모두 «켬»(지금과 같음).
-- 쓰는 곳: 체크 서버 v56 — 꺼져 있으면 기사가 도착을 기록해도 딜러에게 알림을 보내지 않아요(기록은 남음).
-- 실행: 파일 전체를 Run. 두 번 실행해도 괜찮아요. 이 칸이 없으면 v56 은 늘 «켬»으로 보고, 끄기 저장은 «서버 준비 중»으로 막아요.
-- 되돌리기: alter table check_deliv_conf drop column if exists arrive_on;   (그러면 늘 켬)
-- ============================================================
alter table check_deliv_conf add column if not exists arrive_on boolean not null default true;

select '도착 알림 칸(arrive_on)' as 항목,
       case when exists (select 1 from information_schema.columns where table_name = 'check_deliv_conf' and column_name = 'arrive_on')
            then '있음' else '없음' end as 상태,
       (select count(*) from check_deliv_conf where arrive_on = false)::text || '곳 꺼짐' as 지금;
