"""
Hisoblash masalasi javobini o'qish va tekshirish (FT-6.5).
testlar/testlar_online.js dagi checkProblem() bilan AYNAN bir xil natija berishi shart —
tests/test_answers.py da umumiy holatlar to'plami (JS bilan solishtirib tuzilgan) bor.

Qabul qilinadi: 4,5 · 4.5 · −5 · 45 fm · 4,22·10⁷ · 4.5×10^-3 · 4.5e7 · 42 200
Rad etiladi:    1.2.3 · 4,5· · abc · bo'sh
"""
import math
import re

_SUP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺", "0123456789-+")
_SUP_EXP = re.compile(r"10([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)")
_NUM = re.compile(r"^([-+]?(?:\d+\.?\d*|\.\d+))(?:e([-+]?\d+)|[·×x*]10\^?([-+]?\d+))?", re.IGNORECASE | re.ASCII)
_BAD_REST = re.compile(r"^[.\d·×*^]", re.ASCII)


def parse_answer(raw) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, int | float) and not isinstance(raw, bool):
        return float(raw) if math.isfinite(raw) else None
    s = re.sub(r"\s+", "", str(raw).strip())
    s = re.sub("[−–]", "-", s)
    s = s.replace(",", ".", 1)  # JS: .replace(',', '.') — faqat birinchisi
    s = _SUP_EXP.sub(lambda m: "10^" + m.group(1).translate(_SUP), s)
    m = _NUM.match(s)
    if not m:
        return None
    if _BAD_REST.match(s[m.end():]):
        return None
    try:
        v = float(f"{m.group(1)}e{m.group(2) or m.group(3) or '0'}")
    except ValueError:
        return None
    return v if math.isfinite(v) else None


def is_close(value: float, answer: float, tolerance_pct: float) -> bool:
    """|x − ans| ≤ |ans|·tol/100 (nisbiy xatolik; manfiy javoblar uchun ham)."""
    return abs(value - answer) <= abs(answer) * tolerance_pct / 100
