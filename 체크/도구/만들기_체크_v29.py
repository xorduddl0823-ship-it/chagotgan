"""체크 v28 → 체크 v29 새 판. v28 은 읽기만 한다. (서버 check-api v29 짝 — 서버/설계/10_알림톡_전환.md, 규칙 5-6)
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v28.py && python3 체크/도구/만들기_체크_v29.py
바꾸는 것: 문자 설정 칸을 「알림톡(안 되면 문자)」 하나로
  - 차량 배달 알림 › 문구 · 발송 설정: 「문자 / 알림톡」 고르기 · 「실패하면 문자로」 체크를 없애고 안내 한 줄로.
    저장할 때는 늘 way:"ata", fallback:true (서버 v29 도 템플릿이 있으면 늘 알림톡 먼저 · 대신 보내기 늘 켜짐)
  - 「내 번호로 시험」 → 「서버 연결 확인」 (deliv_ping 은 서버가 살아 있는지만 보고 문자를 보내지 않음 — 잘못된 안내 바로잡기)
  - 기사 폰 주소 「문자로 보내기」(아무 일도 안 하던 단추) 빼기 — 문자만 보내는 기능을 새로 만들지 않음
  - 청구서 보내기(모양만 있는 칸) 「보내는 형식」 고르기 → 「알림톡 (안 되면 문자로 자동)」 안내
  - 재검사 알림(모양만 있는 칸) 「문자 (LMS) / 알림톡」 단추 → 안내 한 줄
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v28.html"
OUT = BASE + "2_차곳간_체크_index_v29.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 차량 배달 알림 › 보내는 방법 ──
rep('''  card("보내는 방법","카카오 채널 템플릿이 심사 중이라, 지금은 <b>문자</b>로 보냅니다. 승인되면 여기서 알림톡으로 바꾸면 됩니다.",
    '<div class="tools">'+
      '<label class="chip"><input type="radio" name="dway" id="dw-sms" '+(DCONF.way!=="ata"?"checked":"")+' style="width:18px;height:18px"> 문자 (LMS · 45원)</label>'+
      '<label class="chip"><input type="radio" name="dway" id="dw-ata" '+(DCONF.way==="ata"?"checked":"")+' style="width:18px;height:18px"> 알림톡 (13원)</label>'+
      '<label class="chip"><input type="checkbox" id="dw-fb" '+(DCONF.fallback?"checked":"")+' style="width:18px;height:18px"> 알림톡이 실패하면 문자로 다시 보내기</label>'+
    '</div>'+''',
    '''  card("보내는 방법","<b>알림톡이 먼저</b> 나가고, 알림톡이 안 되면 <b>문자로 자동으로</b> 대신 보내요. 따로 고를 것은 없어요. "+
    "(알림톡 템플릿이 아직 등록되지 않았으면 문자로 나가요)",
    '<div class="msg info" style="margin:0 0 10px">보내는 방법 : <b>알림톡 (안 되면 문자)</b></div>'+''')
rep('''      '<label class="chip"><input type="checkbox" id="dw-photo" '+(DCONF.photo_on!==false?"checked":"")+' style="width:18px;height:18px"> <b>사진 붙여 보내기</b></label>'+
      '<span style="font-size:12.5px;color:var(--muted)">켜면 번호판 사진이 문자에 붙습니다 — 한 통 <b>약 110원(MMS)</b>. '+
      '끄면 글자만 나가고 사진은 링크로 봅니다 — <b>약 45원(LMS)</b>.</span>'+''',
    '''      '<label class="chip"><input type="checkbox" id="dw-photo" '+(DCONF.photo_on!==false?"checked":"")+' style="width:18px;height:18px"> <b>문자로 갈 때 사진 붙이기</b></label>'+
      '<span style="font-size:12.5px;color:var(--muted)">알림톡에는 사진이 붙지 않고 «사진 보기» 링크로 열려요. '+
      '문자로 대신 갈 때만 켜면 번호판 사진이 붙어요 — 한 통 <b>약 110원(MMS)</b>, 끄면 <b>약 45원(LMS)</b>.</span>'+''')
rep('''         ["보내는 번호",'<input type="text" id="dw-tel" value="'+esc(DCONF.from_tel||"")+'" style="width:190px">'],''',
    '''         ["문자로 갈 때 보내는 번호",'<input type="text" id="dw-tel" value="'+esc(DCONF.from_tel||"")+'" style="width:190px">'],''')
rep('''      '<label class="f">문자 문구</label>'+''', '''      '<label class="f">문자로 갈 때 문구</label>'+''')
rep('''      '<label class="f" style="margin-top:6px">알림톡 템플릿 (심사 중 — 승인되면 이 문구로 나갑니다)</label>'+''',
    '''      '<label class="f" style="margin-top:6px">알림톡 문구 (차곳간이 카카오에 등록한 문구 — 여기서 고치지 않아요)</label>'+''')
rep('''      '<button class="btn" id="dwPing">내 번호로 시험</button></div>'+''',
    '''      '<button class="btn" id="dwPing">서버 연결 확인</button></div>'+''')
rep('''    btns([["주소 복사","primary"],["문자로 보내기",""]]));''', '''    btns([["주소 복사","primary"]]));''')

rep('''    var patch={ way: ($("dw-ata")&&$("dw-ata").checked) ? "ata" : "sms",
      fallback: !!($("dw-fb")&&$("dw-fb").checked),''',
    '''    /* v29 (규칙 5-6): 늘 알림톡 먼저 · 안 되면 문자 — 고르는 칸 없음 */
    var patch={ way: "ata", fallback: true,''')
rep('''      busy(false); bar((r&&r.ok)?"시험 문자를 보냈습니다. 폰을 확인해 주세요.":"보내지 못했습니다.",(r&&r.ok)?"ok":"err");''',
    '''      /* v29: deliv_ping 은 서버가 살아 있는지만 확인해요 — 문자는 보내지 않아요 */
      busy(false); bar((r&&r.ok)?"서버에 잘 연결돼 있어요. (시험 문자는 보내지 않았어요)":"서버에 연결하지 못했어요.",(r&&r.ok)?"ok":"err");''')

# ── 청구서 보내기 (모양만 있는 칸) ──
rep('''        '<div><label class="f">보내는 형식</label>'+
          '<select id="sendFmt" style="width:100%">'+
            '<option value="ata" selected>알림톡 (카카오톡)</option>'+
            '<option value="sms">문자 (SMS·LMS·MMS)</option></select></div>'+''',
    '''        '<div><label class="f">보내는 형식</label>'+
          '<div class="msg info" style="margin:0">알림톡 (안 되면 문자로 자동)</div>'+
          '<select id="sendFmt" hidden><option value="ata" selected>알림톡</option></select></div>'+''')

# ── 재검사 알림 (모양만 있는 칸) ──
rep('''    '<div class="tools"><button class="btn primary">문자 (LMS)</button><button class="btn">알림톡</button></div>'+''',
    '''    '<div class="msg info" style="margin:0 0 10px">보내는 방법 : 알림톡 (안 되면 문자로 자동)</div>'+''')

rep('''  $("hdVer").textContent="체크 v28 · "''', '''  $("hdVer").textContent="체크 v29 · "''')
for bad in ['id="dw-sms"', 'id="dw-ata"', 'id="dw-fb"', "시험 문자를 보냈습니다", '["문자로 보내기",""]']:
    if bad in s: raise SystemExit("아직 남음: " + bad)
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
