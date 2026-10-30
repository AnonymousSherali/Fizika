"""
Savol va masala tuzilmasini tekshirish — API serializerlari ham, admin panel formalari ham (model.clean)
shu funksiyalardan foydalanadi: admin panel orqali buzilgan savol saytga (mashq/nazorat testiga) chiqmasin.
"""
import math

from apps.labs.analysis import safe_eval


def option_errors(options) -> list[str]:
    if not isinstance(options, list) or len(options) != 4:
        return ["Aniq 4 ta variant bo'lishi kerak"]
    if not all(isinstance(o, dict) and isinstance(o.get("uz"), str) and o["uz"].strip() for o in options):
        return ['Har bir variant {"uz": "matn", "ru": "..."} ko\'rinishida va bo\'sh bo\'lmasligi kerak']
    if len({o["uz"].strip().lower() for o in options}) != 4:
        return ["Variantlar takrorlanmasligi kerak"]
    return []


def question_is_usable(q) -> bool:
    """Bazada qo'lda buzilgan (eski) yozuv bo'lsa — testga qo'shilmaydi, sahifa buzilmaydi."""
    return not option_errors(q.options) and isinstance(q.correct_index, int) and 0 <= q.correct_index <= 3


def param_errors(params, formula: str, text: str) -> tuple[dict, float | None]:
    """Parametrli masala: (maydon → xato) va minimal qiymatlardagi namunaviy javob."""
    if not params:
        return {}, None
    if not isinstance(params, dict):
        return {"params": ['{"U": [2, 12, 0.5]} ko\'rinishida bo\'lishi kerak']}, None
    sample = {}
    for k, v in params.items():
        ok = (isinstance(v, list) and len(v) == 3 and all(isinstance(x, int | float) and not isinstance(x, bool)
                                                           for x in v) and v[2] > 0 and v[1] >= v[0])
        if not ok or not str(k).isidentifier():
            return {"params": [f"«{k}»: [min, max, qadam] (qadam > 0, max ≥ min)"]}, None
        sample[k] = v[0]
    if not formula:
        return {"formula": ["Parametrli masala uchun javob formulasi kerak"]}, None
    try:
        answer = safe_eval(formula, {**sample, "pi": math.pi})
    except (ValueError, ZeroDivisionError, SyntaxError, TypeError) as e:
        return {"formula": [f"Formulani hisoblab bo'lmadi: {e}"]}, None
    missing = [k for k in params if "{" + k + "}" not in (text or "")]
    if missing:
        return {"text_uz": [f"Matnda {{{missing[0]}}} joyi yo'q"]}, None
    return {}, answer


def problem_is_usable(p) -> bool:
    return not param_errors(p.params, p.formula, p.text_uz)[0]
