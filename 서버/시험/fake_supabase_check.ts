// 시험용 가짜 수파베이스 (체크 기사 시험용 사본) — 실제 서버에 붙지 않고 메모리 표로만 움직입니다.
// fake_supabase.ts 를 바탕으로, check-api v23 이 더 쓰는 것(upsert/in/gt/order/single, check_deliv_attempt)을 더했습니다.
// fake_supabase.ts 는 경비실 시험이 쓰므로 건드리지 않습니다.
type Row = Record<string, any>;
const g = globalThis as any;
g.__DB = g.__DB ?? {} as Record<string, Row[]>;
export const store: Record<string, Row[]> = g.__DB;

class Q {
  op = "select"; payload: any = null; filters: ((r: Row) => boolean)[] = [];
  one = false; lim = 0; cols = "*"; conflict = ""; ord = ""; ret = false; head = false; cnt = false;
  constructor(public t: string) {}
  select(c = "*", o: any = {}) { if (this.op === "select") this.cols = c; else this.ret = true; this.head = !!o.head; this.cnt = !!o.count; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any, o: { onConflict?: string } = {}) { this.op = "upsert"; this.payload = p; this.conflict = o.onConflict ?? "id"; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(k: string, v: any) { if (k === "kind_auto") (this as any).__kindAutoFilter = true; this.filters.push((r) => r[k] === v); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  in(k: string, v: any[]) { this.filters.push((r) => v.includes(r[k])); return this; }
  gt(k: string, v: any) { this.filters.push((r) => r[k] > v); return this; }
  ilike(k: string, pat: string) {
    const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
    this.filters.push((r) => re.test(String(r[k] ?? ""))); return this;
  }
  gte(k: string, v: any) { this.filters.push((r) => r[k] >= v); return this; }
  lte(k: string, v: any) { this.filters.push((r) => r[k] <= v); return this; }
  lt(k: string, v: any) { this.filters.push((r) => r[k] < v); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  order(k: string) { this.ord = k; return this; }
  limit(n: number) { this.lim = n; return this; }
  not() { return this; }
  /* "칸.is.null,칸.lt.값" 같은 간단한 or 만 흉내 */
  or(expr: string) {
    const parts = String(expr).split(",").map((x) => { const [k, op, ...v] = x.split("."); return { k, op, v: v.join(".") }; });
    this.filters.push((r) => parts.some((p) => p.op === "is" ? (r[p.k] ?? null) === null : p.op === "lt" ? r[p.k] < p.v
      : p.op === "gt" ? r[p.k] > p.v : p.op === "eq" ? String(r[p.k]) === p.v : false));
    return this;
  }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  then(res: any, rej: any) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    const tbl = store[this.t];
    if (!tbl) return { data: null, error: { message: `relation "${this.t}" does not exist` } };
    const hit = tbl.filter((r) => this.filters.every((f) => f(r)));
    if (this.t === "check_deposit" && this.op === "select" && store.__depRule?.blind) return { data: [], error: null };   // v41: 그새 들어온 줄 흉내
    /* v33 시험: 재검사 보낸 기록은 (검사소·차·단계) 겹침 금지 — SQL 12 unique 와 같음 */
    if (this.op === "insert" && this.t === "check_remind_log") {
      for (const p of [].concat(this.payload) as Row[])
        if (tbl.some((r) => r.office_id === p.office_id && r.car_id === p.car_id && r.step === p.step))
          return { data: null, error: { message: "duplicate key value violates unique constraint" } };
    }
    /* v49.1 시험: «같은 줄 막기 규칙»이 없는 표 — onConflict upsert 는 42P10 오류 (store.__depRule.noIdx) */
    if (this.op === "upsert" && this.t === "check_deposit" && store.__depRule?.noIdx)
      return { data: null, error: { code: "42P10", message: "there is no unique or exclusion constraint matching the ON CONFLICT specification" } };
    /* v41 시험: 입금 표 제한 흉내 — store.__depRule = { notNull: ["bank_id"], uniq: true, check: "src", down: true } */
    if (this.op === "insert" && this.t === "check_deposit") {
      const rule = store.__depRule ?? {};
      const ps = [].concat(this.payload) as Row[];
      if (rule.down) return { data: null, error: { code: "08006", message: "connection failure" } };
      for (const p of ps) {
        const nn = (rule.notNull ?? []).find((c: string) => p[c] == null);
        if (nn) return { data: null, error: { code: "23502", message: `null value in column "${nn}" of relation "check_deposit" violates not-null constraint`, details: "Failing row contains (01012345678)" } };
        if (rule.check && p[rule.check] === "엑셀") return { data: null, error: { code: "23514", message: `new row for relation "check_deposit" violates check constraint "check_deposit_${rule.check}_check"` } };
        if (tbl.some((r) => r.office_id === p.office_id && r.uniq_key === p.uniq_key) || ps.filter((q) => q.uniq_key === p.uniq_key).length > 1)
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      for (const p of ps) tbl.push({ id: crypto.randomUUID(), ...p });
      return { data: null, error: null };
    }
      /* sb28·v53 시험: cgg_idem 은 (제품·업체·사람·기능·rid) 겹치면 거절 — SQL 26 기본 열쇠와 같음 */
      if (this.t === "cgg_idem" && this.op === "insert") {
        for (const p of [].concat(this.payload) as Row[]) {
          if (tbl.some((r) => r.product === p.product && r.tenant === p.tenant && r.who === p.who && r.fn === p.fn && r.rid === p.rid))
            return { data: null, error: { code: "23505", message: "duplicate key" } };
          tbl.push(Object.assign({ state: "run", at: new Date().toISOString() }, p));
        }
        return { data: null, error: null };
      }
      /* sb28·v53 시험: 승인 요청 표 기본값(SQL 24 와 같음) — 번호 · 대기 · 종사업장 0000 · 기다리는 같은 요청은 하나만 */
      if (this.t === "biz_share_req" && this.op === "insert") {
        for (const p of [].concat(this.payload) as Row[]) {
          const q = Object.assign({ id: tbl.length + 1, state: "wait", biz_sub: "0000", at: new Date().toISOString() }, p);
          if (tbl.some((r) => r.state === "wait" && r.product === q.product && r.code === q.code && r.biz_no === q.biz_no && r.biz_sub === q.biz_sub))
            return { data: null, error: { code: "23505", message: "duplicate key" } };
          tbl.push(q);
        }
        return { data: null, error: null };
      }
    if (this.op === "insert") {
      /* insert().select() 이면 번호(id)를 붙여 돌려줌 (알림톡 체크 시험 · 도착 등록) */
      const got: Row[] = [];
      for (const p of [].concat(this.payload) as Row[]) { const r = this.ret ? { id: crypto.randomUUID(), ...p } : { ...p }; tbl.push(r); got.push({ ...r }); }
      return { data: this.ret ? (this.one ? got[0] : got) : null, error: null };
    }
    if (this.op === "upsert") {
      const keys = this.conflict.split(",").map((k) => k.trim());
      for (const p of [].concat(this.payload) as Row[]) {
        const had = tbl.find((r) => keys.every((k) => r[k] === p[k]));
        if (had) Object.assign(had, p); else tbl.push({ id: crypto.randomUUID(), ...p });
      }
      return { data: null, error: null };
    }
    if (this.op === "update" && this.t === "check_deposit" && store.__noKindAuto && ("kind_auto" in (this.payload ?? {}) || (this as any).__kindAutoFilter))
      return { data: null, error: { code: "42703", message: 'column "kind_auto" does not exist' } };   // v43 시험: SQL 16 전
    /* v53 시험: SQL 24 문지기 흉내(store.__bizUniq) — 다른 검사소가 쓰는 번호(숫자만)로 바꾸면 23505 */
    if (this.op === "update" && this.t === "check_office" && (store as any).__bizUniq && this.payload && this.payload.biz_no) {
      const dg = (x: any) => String(x ?? "").replace(/[^0-9]/g, "");
      const n = dg(this.payload.biz_no);
      if (n && tbl.some((r) => !hit.includes(r) && (dg(r.biz_no) === n || dg(r.popbill_corp) === n)))
        return { data: null, error: { code: "23505", message: "이미 등록된 사업자번호예요." } };
    }
    if (this.op === "update") { hit.forEach((r) => Object.assign(r, this.payload)); return { data: this.ret ? hit.map((r) => ({ ...r })) : null, error: null }; }
    if (this.op === "delete") { store[this.t] = tbl.filter((r) => !hit.includes(r)); return { data: null, error: null }; }
    let out = hit.map((r) => {
      const o = { ...r };
      if (this.cols.includes("check_office")) o.check_office = (store.check_office ?? []).find((x) => x.id === r.office_id) ?? null;
      return o;
    });
    if (this.head) return { data: null, error: null, count: out.length };
    if (this.ord) out.sort((a, b) => String(a[this.ord]).localeCompare(String(b[this.ord])));
    if (this.lim) out = out.slice(0, this.lim);
    if (this.one) {
      if (out.length > 1) return { data: null, error: { message: "more than one row" } };
      return { data: out[0] ?? null, error: null };
    }
    return { data: out, error: null };
  }
}

export function createClient(..._a: any[]) {
  return { from: (t: string) => new Q(t), rpc: async (fn: string, a: any) => rpc(fn, a) };
}

/* 잠금 규칙 — 서버/sql/01 cgg_attempt · 02 check_deliv_attempt 와 같음 (한 번에 처리되므로 동시에 불러도 안 샘) */
function bump(r: Row) {
  const now = Date.now();
  const expired = r.locked_until != null && new Date(r.locked_until).getTime() <= now;
  const next = expired ? 1 : (Number(r.fail_count) || 0) + 1;
  r.locked_until = expired ? null
    : r.locked_until != null ? r.locked_until
    : next >= 5 ? new Date(now + 600000).toISOString() : null;
  r.fail_count = next;
  return next <= 5;
}

/* SQL 함수 흉내 */
function rpc(fn: string, a: any) {
  /* 시험마다 따로 흉내 낼 SQL 함수 (store.__rpc[이름] = (인자) => 값) */
  const own = (store as any).__rpc?.[fn];
  if (own) return { data: own(a), error: null };
  /* SQL 11 check_rate_bump 흉내 — store.check_rate 가 없으면 «SQL 11 전» (함수 없음) */
  if (fn === "check_rate_bump") {
    if (!store.check_rate) return { data: null, error: { message: "function check_rate_bump does not exist" } };
    let r = store.check_rate.find((x) => x.key === a.p_key);
    if (!r) { r = { key: a.p_key, n: 0 }; store.check_rate.push(r); }
    if (r.n >= a.p_max) return { data: false, error: null };
    r.n++; return { data: true, error: null };
  }
  if (fn === "cgg_attempt") {
    if (!store.cgg_access) return { data: null, error: { message: "function does not exist" } };
    const r = store.cgg_access.find((x) => x.phone === a.p_phone);
    if (!r) return { data: false, error: null };
    return { data: bump(r), error: null };
  }
  if (fn === "check_deliv_attempt") {
    // 표가 없으면 = SQL 02 를 아직 안 돌림 = 함수도 없음
    if (!store.check_deliv_fail) return { data: null, error: { message: "function check_deliv_attempt does not exist" } };
    let r = store.check_deliv_fail.find((x) => x.key === a.p_key);
    if (!r) { r = { key: a.p_key, fail_count: 0, locked_until: null }; store.check_deliv_fail.push(r); }
    return { data: bump(r), error: null };
  }
  /* SQL 13 check_invoice_add_paid 흉내 — store.__sql13 이 있을 때만 (없으면 «함수 없음») */
  if (fn === "check_invoice_add_paid" && (store as any).__sql13) {
    const v = (store.check_invoice ?? []).find((x) => x.office_id === a.p_office && x.id === a.p_id);
    if (!v) return { data: null, error: null };
    v.paid_amount = (Number(v.paid_amount) || 0) + Number(a.p_amount);
    v.state = v.paid_amount >= (Number(v.total_amount) || 0) ? "완료" : "수금중";
    return { data: v.paid_amount, error: null };
  }
  if (fn.startsWith("check_")) return { data: null, error: { message: `function ${fn} does not exist` } };
  return { data: true, error: null };
}
