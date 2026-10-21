// 격리 시험 환경 공통 값 — 가짜 업체·열쇠·번호(운영 자료 아님). 세 서버와 시험기 실행기가 같은 값을 씀.
export const V = {
  WA_SHOP: "TSTA", WB_SHOP: "TSTB", WA_REC: "recA1", WA_PHOTO: "sb/TSTA/202610/a1.jpg", WA_BIZ: "1234567890",
  WA_TOKEN: "wa".repeat(24), WB_TOKEN: "wb".repeat(24), WA_PHONE: "01000000011", WB_PHONE: "01000000012",
  CA_OFFICE: "TESTA", CB_OFFICE: "TESTB", CA_TOKEN: "chk_" + "ca".repeat(22), CB_TOKEN: "chk_" + "cb".repeat(22),
  CA_INVOICE: "invA1", CA_YM: "2026-10", CA_DELIV_PHOTO: "phA1", CA_CAR: "carA1",
  DA_TOKEN: "da".repeat(24), DB_TOKEN: "db".repeat(24), DA_PHONE: "01000000021", DB_PHONE: "01000000022",
};
export const far = () => new Date(Date.now() + 864e5).toISOString();
export const 워시차 = () => [
  { shop: V.WA_SHOP, demo: false, col: "intakes", id: V.WA_REC, data: { plate: "11가1111", phone: V.DA_PHONE, dealer: "A딜러", photoId: V.WA_PHOTO, createdAt: "2026-10-10T01:00:00Z" } },
  { shop: V.WB_SHOP, demo: false, col: "intakes", id: "recB1", data: { plate: "22나2222", phone: V.DB_PHONE, dealer: "B딜러", createdAt: "2026-10-10T01:00:00Z" } },
];
/** Deno.serve 를 «그 포트에서 듣기»로 바꿔 끼움 — 서버 코드는 그대로 */
export function 포트(port: number) {
  const orig = Deno.serve.bind(Deno);
  (Deno as any).serve = (h: any) => orig({ port, hostname: "127.0.0.1", onListen: () => console.log("듣는 중 " + port) }, h);
}
