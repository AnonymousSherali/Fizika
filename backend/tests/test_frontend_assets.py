"""
Statik sayt fayllarining yaxlitligi: kesh versiyasi hamma joyda bir xil (aks holda foydalanuvchilar eski
CSS/JS da qolib ketadi) va oflayn ro'yxatdagi (sw.js) har bir fayl mavjud.
"""
import re
from pathlib import Path

from django.conf import settings

ROOT = Path(settings.FRONTEND_DIR)


def _site_files():
    for p in ROOT.rglob("*"):
        if p.suffix in (".html", ".js") and "backend" not in p.parts and ".git" not in p.parts \
                and "node_modules" not in p.parts:
            yield p


def test_cache_version_is_consistent():
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    version = re.search(r"var VERSION = 'fizika-(\w+)'", sw).group(1)
    theme = (ROOT / "theme.js").read_text(encoding="utf-8")
    assert re.search(r"var I18N_VER = '(\w+)'", theme).group(1) == version
    stale = {}
    for p in _site_files():
        for v in re.findall(r"\?v=(\w+)", p.read_text(encoding="utf-8", errors="ignore")):
            if v != version:
                stale.setdefault(str(p.relative_to(ROOT)), set()).add(v)
    assert not stale, f"sw.js versiyasi {version}, lekin boshqacha ?v= bor: {stale}"


def test_precache_list_points_to_existing_files():
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    listed = re.findall(r"'\./([^']+)'", sw)
    assert listed, "sw.js da oflayn fayllar ro'yxati topilmadi"
    missing = [f for f in listed if not (ROOT / f).exists()]
    assert not missing, missing
