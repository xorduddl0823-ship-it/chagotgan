-- ============================================================
--  워시 옛 청구서 보기 주소 일찍 끝내기 — wash-api sb21 과 함께 (2026-10-18 · 보안 권고 · 개인정보)
--  수파베이스 → SQL Editor 에 붙여 넣고 Run. 여러 번 실행해도 안전합니다. 지우는 자료는 없어요(끝나는 날짜만 오늘로).
--  sb21 을 올린 뒤에 실행해 주세요.
--
--  무엇을 끝내나: 옛 모양 열쇠(«bill:달|dealer|이름», 상사 없음)로 만든 딜러 청구서 주소 가운데
--    같은 업체·같은 달·같은 딜러 이름인데 그 달 일감의 상사가 둘 이상인 것만 — 다른 상사 같은 이름 딜러 내용이 덮였을 수 있는 주소.
--  해당하는 줄이 없으면 아무것도 바꾸지 않아요. 이름이 하나뿐인 딜러·상사 단위 청구서·새 열쇠 주소는 그대로예요.
-- ============================================================

with old as (
  select v.code, v.shop,
         split_part(substr(v.rec_id, 6), '|', 1) as ym,
         substr(v.rec_id, length('bill:' || split_part(substr(v.rec_id, 6), '|', 1) || '|dealer|') + 1) as who
  from public.wash_viewcode v
  where v.kind = 'bill' and v.expires_at > now()
    and v.rec_id ~ '^bill:[0-9]{4}-[0-9]{2}\|dealer\|[^|]*$'
),
months as (     -- 일감의 달: month 칸, 또는 만든 시각(한국 시간) — 서버 intakeMonths 와 같음
  select d.shop, btrim(coalesce(d.data->>'dealer', '')) as dealer,
         nullif(nullif(btrim(coalesce(d.data->>'company', '')), '(상사명 없음)'), '') as company,
         m.ym
  from public.wash_docs d
  cross join lateral (
    select d.data->>'month' as ym where coalesce(d.data->>'month', '') ~ '^[0-9]{4}-[0-9]{2}$'
    union
    select to_char((d.data->>'createdAt')::timestamptz at time zone 'Asia/Seoul', 'YYYY-MM')
      where coalesce(d.data->>'createdAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+(Z|[+-][0-9]{2}:?[0-9]{2})?$'
  ) m
  where d.col = 'intakes' and d.demo = false
),
risky as (
  select o.code
  from old o
  join months i on i.shop = o.shop and i.ym = o.ym and i.dealer = btrim(o.who)
  group by o.code
  having count(distinct coalesce(i.company, '')) >= 2
),
done as (
  update public.wash_viewcode v set expires_at = now()
  where v.code in (select code from risky) and v.expires_at > now()
  returning v.code
)
select count(*) as 일찍_끝낸_주소 from done;

-- 확인: 0 이면 끝 (위험한 옛 주소가 더 열려 있지 않아요)
select count(*) as 아직_열린_위험_주소
from public.wash_viewcode v
where v.kind = 'bill' and v.expires_at > now()
  and v.rec_id ~ '^bill:[0-9]{4}-[0-9]{2}\|dealer\|[^|]*$'
  and exists (
    select 1 from public.wash_docs d
    where d.col = 'intakes' and d.demo = false and d.shop = v.shop
      and btrim(coalesce(d.data->>'dealer', '')) = btrim(substr(v.rec_id, length('bill:' || split_part(substr(v.rec_id, 6), '|', 1) || '|dealer|') + 1))
      and (d.data->>'month' = split_part(substr(v.rec_id, 6), '|', 1)
           or (coalesce(d.data->>'createdAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+(Z|[+-][0-9]{2}:?[0-9]{2})?$'
               and to_char((d.data->>'createdAt')::timestamptz at time zone 'Asia/Seoul', 'YYYY-MM') = split_part(substr(v.rec_id, 6), '|', 1)))
    group by d.shop
    having count(distinct coalesce(nullif(nullif(btrim(coalesce(d.data->>'company', '')), '(상사명 없음)'), ''), '')) >= 2);
