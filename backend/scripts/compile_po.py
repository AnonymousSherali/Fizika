"""
.po → .mo (gettext o'rnatilmagan muhit uchun; `compilemessages` bilan bir xil natija).

    python scripts/compile_po.py            # locale/*/LC_MESSAGES/*.po ning barchasi
"""
import ast
import struct
from pathlib import Path


def parse_po(text: str) -> dict[str, str]:
    """Oddiy .po o'quvchi: msgctxt, msgid, msgid_plural, msgstr[n] (ko'p qatorli satrlar bilan)."""
    entries, cur, key = {}, {}, None

    def flush():
        if "msgid" in cur and not cur.get("fuzzy"):
            mid = cur["msgid"]
            if "msgctxt" in cur:
                mid = cur["msgctxt"] + "\x04" + mid
            if "msgid_plural" in cur:
                mid += "\x00" + cur["msgid_plural"]
                strs = [cur[k] for k in sorted(k for k in cur if k.startswith("msgstr["))]
                val = "\x00".join(strs)
            else:
                val = cur.get("msgstr", "")
            if val.replace("\x00", ""):
                entries[mid] = val

    for line in text.splitlines() + [""]:
        line = line.strip()
        if not line:
            flush()
            cur, key = {}, None
        elif line.startswith("#,") and "fuzzy" in line:
            cur["fuzzy"] = True
        elif line.startswith("#"):
            continue
        elif line.startswith('"'):
            cur[key] += ast.literal_eval(line)
        else:
            key, _, rest = line.partition(" ")
            cur[key] = ast.literal_eval(rest)
    return entries


def write_mo(entries: dict[str, str], path: Path) -> None:
    keys = sorted(entries)
    ids = b"".join(k.encode() + b"\0" for k in keys)
    strs = b"".join(entries[k].encode() + b"\0" for k in keys)
    n = len(keys)
    koff = 7 * 4 + 16 * n
    voff = koff + len(ids)
    table_k, table_v, pk, pv = [], [], 0, 0
    for k in keys:
        b = k.encode()
        table_k += [len(b), koff + pk]
        pk += len(b) + 1
    for k in keys:
        b = entries[k].encode()
        table_v += [len(b), voff + pv]
        pv += len(b) + 1
    header = struct.pack("Iiiiiii", 0x950412DE, 0, n, 7 * 4, 7 * 4 + 8 * n, 0, 0)
    path.write_bytes(header + struct.pack(f"{2 * n}i", *table_k) + struct.pack(f"{2 * n}i", *table_v) + ids + strs)


if __name__ == "__main__":
    for po in Path(__file__).resolve().parent.parent.glob("locale/*/LC_MESSAGES/*.po"):
        entries = parse_po(po.read_text(encoding="utf-8"))
        write_mo(entries, po.with_suffix(".mo"))
        print(f"{po}: {len(entries)} ta")
