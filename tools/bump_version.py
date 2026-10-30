#!/usr/bin/env python3
"""
Sayt fayllari o'zgarganda kesh versiyasini oshiradi va sw.js oflayn ro'yxatini yangilaydi.

    python3 tools/bump_version.py            # yangi versiya: bugungi sana + harf (20261101a, ...b, ...)
    python3 tools/bump_version.py 20261105a  # aniq versiya

Nima qiladi:
  1. Barcha .html/.js fayllardagi «?v=<eski>» → «?v=<yangi>» (backend/ dan tashqari);
     theme.js dagi I18N_VER va sw.js dagi VERSION ham.
  2. sw.js dagi CORE ro'yxatini git'dagi fayllardan qayta tuzadi (yangi sahifa qo'shilsa ham oflayn ishlaydi).
Tekshiruv: backend/tests/test_frontend_assets.py (CI) — versiya biror joyda eski qolsa test yiqiladi.
"""
import datetime
import re
import string
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRECACHE = re.compile(r"\.(html|css|js|woff2|jpg|png|webmanifest)$")


def current_version() -> str:
    return re.search(r"var VERSION = 'fizika-(\w+)'", (ROOT / "sw.js").read_text(encoding="utf-8")).group(1)


def next_version(old: str) -> str:
    today = datetime.date.today().strftime("%Y%m%d")
    if old[:8] == today and old[8:] and old[8:][-1] in string.ascii_lowercase[:-1]:
        return today + chr(ord(old[-1]) + 1)
    return today + "a"


def tracked_files() -> list[str]:
    out = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT,
                         capture_output=True, text=True, check=True).stdout.split("\n")
    return sorted(f for f in out if f and not f.startswith(("backend/", "tools/")) and (ROOT / f).exists())


def main():
    old = current_version()
    new = sys.argv[1] if len(sys.argv) > 1 else next_version(old)
    if not re.fullmatch(r"\w+", new):
        sys.exit("Versiya faqat harf/raqamdan iborat bo'lishi kerak")
    files = tracked_files()
    changed = 0
    for f in files:
        if not f.endswith((".html", ".js")) or f == "sw.js":
            continue
        p = ROOT / f
        s = p.read_text(encoding="utf-8")
        t = s.replace(f"?v={old}", f"?v={new}").replace(f"I18N_VER = '{old}'", f"I18N_VER = '{new}'")
        if t != s:
            p.write_text(t, encoding="utf-8")
            changed += 1
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    core = ["./"] + [f"./{f}" for f in files
                     if PRECACHE.search(f) and f != "sw.js" and not f.startswith("img/icons/maskable")]
    listing = "var CORE = [\n" + ",\n".join(f"    '{x}'" for x in core) + "\n];"
    sw = re.sub(r"var CORE = \[.*?\n\];", listing, sw, flags=re.S)
    sw = sw.replace(f"var VERSION = 'fizika-{old}'", f"var VERSION = 'fizika-{new}'")
    (ROOT / "sw.js").write_text(sw, encoding="utf-8")
    print(f"{old} → {new}: {changed} ta fayl, sw.js da {len(core)} ta oflayn fayl")


if __name__ == "__main__":
    main()
