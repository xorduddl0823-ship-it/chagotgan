"""워시 결제 덩어리(cwRpc ~ 지갑 위젯 끝)에서 바뀐 줄을 체크 결제 덩어리에 그대로 옮깁니다 (결제/12 «워시 고친 말을 그대로 복사»).
port(old_wash_block, new_wash_block, check_block) → (새 체크 덩어리, 옮긴 수, 못 옮긴 목록)
  · 워시에서 바뀐 덩어리(줄 묶음)의 «예전 글»이 체크에 똑같이 한 번 있으면 «새 글»로 바꿉니다.
  · 새로 들어간 줄은 바로 앞 줄을 체크에서 찾아 그 뒤에 넣습니다.
  · 체크만 다른 곳(열쇠 · 대표만 · 지갑 안 이어짐 · 자동 결제 없음)은 예전 글이 체크에 없어서 건너뜁니다 → 목록으로 알려 줌.
"""
import difflib

def port(old, new, chk):
    a, b = old.split("\n"), new.split("\n")
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    done, miss = 0, []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("replace", "delete"):
            o = "\n".join(a[i1:i2]); n = "\n".join(b[j1:j2])
            if chk.count(o) == 1 or (o and chk.count(o) == old.count(o)):
                chk = chk.replace(o, n); done += 1
            else:
                miss.append((tag, o[:160], n[:160]))
        elif tag == "insert":
            prev = a[i1 - 1] if i1 > 0 else None
            n = "\n".join(b[j1:j2])
            if prev is not None and chk.count(prev + "\n") == 1:
                chk = chk.replace(prev + "\n", prev + "\n" + n + "\n"); done += 1
            else:
                miss.append((tag, (prev or "")[:160], n[:160]))
    return chk, done, miss
