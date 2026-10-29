"""
Jurnal grafigi tahlili (FT-4.5, FT-4.6) — frontenddagi model-tools.js bilan bir xil hisob:
Y^yp = k·X^xp + b, eng kichik kvadratlar usuli, R²; keyin model andozasidagi hosila natija
(masalan mayatnik: g = 4π²/k) va nazariy qiymatdan nisbiy xatolik.
"""
import ast
import math
import operator

import numpy as np

ALLOWED_POWERS = (1, 2, 3, 0.5, -1)

_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.Pow: operator.pow, ast.USub: operator.neg, ast.UAdd: operator.pos,
}


def safe_eval(expr: str, names: dict) -> float:
    """Faqat sonlar, k/b/pi va + − × ÷ ** — boshqa hech narsa (eval ishlatilmaydi)."""

    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, int | float):
            return node.value
        if isinstance(node, ast.Name) and node.id in names:
            return names[node.id]
        if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](ev(node.left), ev(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](ev(node.operand))
        raise ValueError("Ruxsat etilmagan ifoda")

    return float(ev(ast.parse(expr, mode="eval")))


def find_column(columns: list[dict], prefix: str | None) -> int | None:
    if prefix is None:
        return None
    for i, c in enumerate(columns):
        if c["label"].startswith(prefix) or c["key"].startswith(prefix):
            return i
    return None


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def _pow(v, p):
    if v is None:
        return None
    try:
        r = 1 / v if p == -1 else (math.sqrt(v) if p == 0.5 else v ** p)
    except (ZeroDivisionError, ValueError):
        return None
    return r if isinstance(r, float | int) and math.isfinite(r) else None


def linfit(xs, ys) -> dict | None:
    if len(xs) < 2:
        return None
    x, y = np.asarray(xs, float), np.asarray(ys, float)
    if np.ptp(x) < 1e-12:
        return None
    k, b = np.polyfit(x, y, 1)
    pred = k * x + b
    ss_tot = float(((y - y.mean()) ** 2).sum())
    ss_res = float(((y - pred) ** 2).sum())
    r2 = 1 - ss_res / ss_tot if ss_tot > 1e-12 else 1.0
    if abs(b) < max(abs(y).max(), 1e-300) * 1e-9:
        b = 0.0
    return {"k": float(k), "b": float(b), "r2": float(r2)}


def analyze(rows: list[list], columns: list[dict], graph: dict | None, preset: dict | None) -> dict:
    """graph: {"x": index, "y": index, "xp": 1, "yp": 2} — berilmasa model andozasi ishlatiladi."""
    preset = preset or {}
    if graph and "x" in graph and "y" in graph:
        xi, yi = int(graph["x"]), int(graph["y"])
        xp, yp = graph.get("xp", 1), graph.get("yp", 1)
    else:
        xi, yi = find_column(columns, preset.get("x")), find_column(columns, preset.get("y"))
        xp, yp = preset.get("xp", 1), preset.get("yp", 1)
    if xi is None or yi is None:
        return {"error": "Grafik o'qlari aniqlanmadi"}
    if not (0 <= xi < len(columns) and 0 <= yi < len(columns)):
        return {"error": "Ustun raqami noto'g'ri"}
    if xp not in ALLOWED_POWERS or yp not in ALLOWED_POWERS:
        return {"error": "Daraja faqat 1, 2, 3, 0.5 yoki -1 bo'lishi mumkin"}
    xs, ys = [], []
    for r in rows:
        x, y = _pow(_num(r[xi]), xp), _pow(_num(r[yi]), yp)
        if x is not None and y is not None:
            xs.append(x)
            ys.append(y)
    result = {"x": xi, "y": yi, "xp": xp, "yp": yp, "points": len(xs)}
    fit = linfit(xs, ys)
    if not fit:
        result["fit"] = None
        return result
    result["fit"] = fit
    # Hosila natija faqat andozadagi o'qlar tanlanganda ma'noli
    d = preset.get("derived")
    same_axes = (xi == find_column(columns, preset.get("x")) and yi == find_column(columns, preset.get("y"))
                 and xp == preset.get("xp", 1) and yp == preset.get("yp", 1))
    if d and same_axes:
        try:
            value = safe_eval(d["expr"], {"k": fit["k"], "b": fit["b"], "pi": math.pi})
        except (ZeroDivisionError, ValueError):
            value = None
        derived = {"name": d["name"], "value": value, "unit": d.get("unit", "")}
        theory = d.get("theory")
        if theory is None and d.get("theory_col"):
            ti = find_column(columns, d["theory_col"])
            vals = [_num(r[ti]) for r in rows] if ti is not None else []
            vals = [v for v in vals if v is not None]
            # Nazariy qiymat barcha qatorlarda bir xil bo'lsagina solishtiramiz
            if vals and max(vals) - min(vals) <= 1e-9 * max(1.0, abs(vals[0])):
                theory = vals[0]
        if theory is not None and value is not None and theory != 0:
            derived["theory"] = theory
            derived["error_pct"] = round(abs(value - theory) / abs(theory) * 100, 3)
        result["derived"] = derived
    return result
