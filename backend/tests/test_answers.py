"""FT-6.5: serverdagi javob tekshiruvi frontend (testlar_online.html → checkProblem) bilan bir xil.
Kutilgan qiymatlar brauzerdagi JavaScript funksiyasining o'zidan olingan (46 ta holat)."""
import pytest

from apps.quizzes.answers import is_close, parse_answer

JS_VECTORS = [
    ("4,5", 4.5),
    ("4.5", 4.5),
    ("−5", -5),
    ("–5", -5),
    ("-0.5", -0.5),
    ("+3", 3),
    ("45 fm", 45),
    ("45fm", 45),
    ("4,22·10⁷", 42200000),
    ("4.22×10⁷", 42200000),
    ("4,5·10^1", 45),
    ("4.5*10^-3", 0.0045),
    ("4.5x10^7", 45000000),
    ("4.5X10^7", 45000000),
    ("4.5e7", 45000000),
    ("4.5E-2", 0.045),
    ("1e3", 1000),
    ("42 200", 42200),
    ("  12  ", 12),
    ("0", 0),
    ("0,0", 0),
    ("1.", 1),
    ("  .5", 0.5),
    (".5 m", 0.5),
    ("3.6 N", 3.6),
    ("1.2.3", None),
    ("4,5·", None),
    ("4,5·10", None),
    ("abc", None),
    ("", None),
    ("m 5", None),
    ("5,5,5", 5.5),
    ("1,5 m/s", 1.5),
    ("11,86 yil", 11.86),
    ("−0,673", -0.673),
    ("10⁻³", None),
    ("2·10⁻³", 0.002),
    ("2×10⁻¹²", 2e-12),
    ("4^2", None),
    ("5^", None),
    ("1..2", None),
    ("1,2.3", None),
    ("9.81m/s²", 9.81),
    ("6.63e-34", 6.63e-34),
    ("1 000 000", 1000000),
    ("1,000", 1),
]


@pytest.mark.parametrize(("raw", "expected"), JS_VECTORS)
def test_parse_matches_frontend(raw, expected):
    got = parse_answer(raw)
    if expected is None:
        assert got is None
    else:
        assert got == pytest.approx(expected, rel=1e-12, abs=1e-300)


def test_numeric_input_passthrough():
    assert parse_answer(3.5) == 3.5
    assert parse_answer(float("nan")) is None
    assert parse_answer(None) is None


@pytest.mark.parametrize(("value", "answer", "tol", "ok"), [
    (11.5, 11.86, 5, True), (11.0, 11.86, 5, False), (-0.68, -0.673, 3, True), (-0.6, -0.673, 3, False),
    (0, 0, 1, True), (42.2e6, 42.2e6, 1, True),
])
def test_tolerance(value, answer, tol, ok):
    assert is_close(value, answer, tol) is ok
