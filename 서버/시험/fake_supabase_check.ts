// 시험용 가짜 수파베이스 (체크 기사 시험용 사본) — 실제 서버에 붙지 않고 메모리 표로만 움직입니다.
// fake_supabase.ts 를 바탕으로, check-api v23 이 더 쓰는 것(upsert/in/gt/order/single, check_deliv_attempt)을 더했습니다.
// fake_supabase.ts 는 경비실 시험이 쓰므로 건드리지 않습니다.
type Row = Record<string, any>;
const g = globalThis as any;
g.__DB = g.__DB ?? {} as Record<string, Row[]>;
export const store: Record<string, Row[]> = g.__DB;

class Q {
  op = "select"; payload: any = null; filters: ((r: Row) => boolean)[] = [];
  one = false; lim = 0; cols = "*"; conflict = ""; ord = ""; ret = false;
  constructor(public t: string) {}
  select(c = "*") { if (this.op === "select") this.cols = c; else this.ret = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any, o: { onConflict?: string } = {}) { this.op = "upsert"; this.payload = p; this.conflict = o.onConflict ?? "id"; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  in(k: string, v: any[]) { this.filters.push((r) => v.includes(r[k])); return this; }
  gt(k: string, v: any) { this.filters.push((r) => r[k] > v); return this; }
  gte(k: string, v: any) { this.filters.push((r) => r[k] >= v); return this; }
  lte(k: string, v: any) { this.filters.push((r) => r[k] <= v); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  order(k: string) { this.ord = k; return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  then(res: any, rej: any) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    const tbl = store[this.t];
    if (!tbl) return { data: null, error: { message: `relation "${this.t}" does not exist` } };
    const hit = tbl.filter((r) => this.filters.every((f) => f(r)));
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
    if (this.op === "update") { hit.forEach((r) => Object.assign(r, this.payload)); return { data: null, error: null }; }
    if (this.op === "delete") { store[this.t] = tbl.filter((r) => !hit.includes(r)); return { data: null, error: null }; }
    let out = hit.map((r) => {
      const o = { ...r };
      if (this.cols.includes("check_office")) o.check_office = (store.check_office ?? []).find((x) => x.id === r.office_id) ?? null;
      return o;
    });
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
  if (fn.startsWith("check_")) return { data: null, error: { message: `function ${fn} does not exist` } };
  return { data: true, error: null };
}
