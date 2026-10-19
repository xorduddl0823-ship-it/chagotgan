// 시험용 가짜 수파베이스 (워시 서버 wash-api 용) — 메모리 표로만 움직입니다.
// 없는 표는 빈 표로 봅니다. 워시 서버가 쓰는 만큼만 흉내 냅니다.
type Row = Record<string, any>;
const g = globalThis as any;
g.__WDB = g.__WDB ?? {} as Record<string, Row[]>;
export const store: Record<string, Row[]> = g.__WDB;
export const rpcLog: { fn: string; args: any }[] = [];
export const signLog: { bucket: string; paths: string[]; ttl: number }[] = [];
export const knobs = { rateBroken: false, missing: new Set<string>(), cash: {} as Record<string, number>, cashLog: [] as any[], bizUniq: false };

const val = (r: Row, k: string) => {
  if (k.includes("->>")) { const [a, b] = k.split("->>"); return r[a]?.[b]; }
  return r[k];
};
class Q {
  op = "select"; payload: any = null; filters: ((r: Row) => boolean)[] = [];
  one = false; lim = 0; cols = "*"; ord: [string, boolean] | null = null; head = false; cnt = false; ret = false;
  constructor(public t: string) {}
  select(c = "*", o: any = {}) { if (this.op === "select") this.cols = c; else this.ret = true; this.head = !!o.head; this.cnt = !!o.count; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(k: string, v: any) { this.filters.push((r) => val(r, k) === v); return this; }
  neq(k: string, v: any) { this.filters.push((r) => val(r, k) !== v); return this; }
  in(k: string, v: any[]) { this.filters.push((r) => v.includes(val(r, k))); return this; }
  is(k: string, v: any) { this.filters.push((r) => (val(r, k) ?? null) === v); return this; }
  gt(k: string, v: any) { this.filters.push((r) => val(r, k) > v); return this; }
  gte(k: string, v: any) { this.filters.push((r) => val(r, k) >= v); return this; }
  lt(k: string, v: any) { this.filters.push((r) => val(r, k) < v); return this; }
  lte(k: string, v: any) { this.filters.push((r) => val(r, k) <= v); return this; }
  like(k: string, pat: string) {
    const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$");
    this.filters.push((r) => re.test(String(val(r, k) ?? ""))); return this;
  }
  ilike(k: string, pat: string) {
    const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
    this.filters.push((r) => re.test(String(val(r, k) ?? ""))); return this;
  }
  filter() { return this; } not() { return this; } or() { return this; }
  order(k: string, o: any = {}) { this.ord = [k, o.ascending !== false]; return this; }
  limit(n: number) { this.lim = n; return this; }
  range() { return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  then(res: any, rej: any) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    if (knobs.missing.has(this.t)) return { data: null, error: { message: `relation "${this.t}" does not exist` } };
    const tbl = store[this.t] ?? (store[this.t] = []);
    const hit = tbl.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "insert" || this.op === "upsert") {
      /* sb23 시험: wash_tax_rec 은 (shop, rec_id) 겹치면 거절 — 한 줄이라도 겹치면 하나도 안 넣음 */
      if (this.t === "wash_tax_rec" && this.op === "insert") {
        const ps = [].concat(this.payload) as Row[];
        if (ps.some((p) => tbl.some((r) => r.shop === p.shop && r.rec_id === p.rec_id)))
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
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
      for (const p of [].concat(this.payload)) tbl.push({ ...(p as Row) });
      return { data: null, error: null };
    }
    if (this.op === "update") {
      /* sb28 시험: SQL 24 문지기 흉내(knobs.bizUniq) — 다른 업체가 쓰는 번호(숫자만 비교)로 바꾸면 23505 */
      if (knobs.bizUniq && this.t === "wash_shops" && this.payload && this.payload.biz_no) {
        const dg = (x: any) => String(x ?? "").replace(/[^0-9]/g, "");
        const n = dg(this.payload.biz_no);
        if (n && tbl.some((r) => !hit.includes(r) && dg(r.biz_no) === n))
          return { data: null, error: { code: "23505", message: "이미 등록된 사업자번호예요." } };
      }
      hit.forEach((r) => Object.assign(r, this.payload));
      /* update().select() 이면 바뀐 줄을 돌려줌 (sb9 조건 걸고 한 번에 바꾸기 시험) */
      return { data: this.ret ? hit.map((r) => ({ ...r })) : null, error: null };
    }
    if (this.op === "delete") { store[this.t] = tbl.filter((r) => !hit.includes(r)); return { data: null, error: null }; }
    let out = hit.map((r) => ({ ...r }));
    if (this.ord) { const [k, asc] = this.ord; out.sort((a, b) => (a[k] > b[k] ? 1 : -1) * (asc ? 1 : -1)); }
    if (this.lim) out = out.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count: out.length };
    if (this.one) return { data: out[0] ?? null, error: null };
    return { data: out, error: null, count: this.cnt ? out.length : undefined };
  }
}

function rpc(fn: string, a: any) {
  rpcLog.push({ fn, args: a });
  if (fn === "wash_rate_bump") {
    if (knobs.rateBroken) return { data: null, error: { message: "function wash_rate_bump does not exist" } };
    const t = store.wash_rate ?? (store.wash_rate = []);
    let r = t.find((x) => x.key === a.p_key);
    if (!r) { r = { key: a.p_key, n: 0 }; t.push(r); }
    r.n++;
    return { data: r.n <= a.p_max, error: null };
  }
  if (fn === "wash_load") {
    const docs = (store.wash_docs ?? []).filter((d) => d.shop === a.p_shop && d.demo === a.p_demo);
    const o: any = {};
    docs.forEach((d) => { (o[d.col] = o[d.col] || {})[d.id] = d.data; });
    return { data: o, error: null };
  }
  if (fn === "wash_write") return { data: "2", error: null };
  if (fn === "wash_sms_take") return { data: "free", error: null };
  if (fn === "wash_tax_take") return { data: "free", error: null };
  /* sb13 체험판 횟수 — SQL 09 wash_trial_bump 와 같음 (한 번에 셈) */
  if (fn === "wash_trial_bump") {
    if (knobs.missing.has("wash_trial_use")) return { data: null, error: { message: "function does not exist" } };
    const t = store.wash_trial_use ?? (store.wash_trial_use = []);
    let r = t.find((x) => x.key === a.p_key);
    if (!r) { r = { key: a.p_key, n: 0 }; t.push(r); }
    if (r.n >= a.p_max) return { data: false, error: null };
    r.n++; return { data: true, error: null };
  }
  /* 결제 시험: knobs.cash 에 업체 잔액을 넣으면 잔액을 흉내 (마이너스 안 됨) */
  if (fn === "wash_cash_bal") return { data: knobs.cash[a.p_shop] ?? 0, error: null };
  if (fn === "wash_cash_take") {
    if (knobs.cash[a.p_shop] === undefined) return { data: { ok: true, logId: 1, balance: 10000 }, error: null };
    if (knobs.cash[a.p_shop] < a.p_amt) return { data: { ok: false, balance: knobs.cash[a.p_shop] }, error: null };
    knobs.cash[a.p_shop] -= a.p_amt; knobs.cashLog.push({ shop: a.p_shop, amt: a.p_amt, what: a.p_what, memo: a.p_memo });
    return { data: { ok: true, logId: knobs.cashLog.length, balance: knobs.cash[a.p_shop] }, error: null };
  }
  return { data: null, error: null };
}

export function createClient(..._a: any[]) {
  return {
    from: (t: string) => new Q(t),
    rpc: async (fn: string, a: any) => rpc(fn, a),
    storage: { from: (b: string) => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      /* 서명 주소 흉내 — 실제 수파베이스처럼 [{ path, signedUrl, error }] */
      createSignedUrls: async (paths: string[], ttl: number) => {
        signLog.push({ bucket: b, paths: [...paths], ttl });
        return { data: paths.map((p) => ({ path: p, signedUrl: `https://fake/sign/${b}/${p}?ttl=${ttl}`, error: null })), error: null };
      },
    }) },
  };
}
