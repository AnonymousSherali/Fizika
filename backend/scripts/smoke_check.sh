#!/usr/bin/env bash
# =============================================================================
# O'rnatilgan saytni tekshirish (nginx orqali): sahifalar, API, admin, xavfsizlik sarlavhalari,
# yopiq yo'llar. Serverga o'rnatgandan keyin yoki CI'da (deploy-smoke) ishga tushiriladi.
#
#   scripts/smoke_check.sh https://site.uz
#   scripts/smoke_check.sh http://localhost
# =============================================================================
set -uo pipefail
BASE=${1:-http://localhost}
BASE=${BASE%/}
fail=0

check() {   # check <tavsif> <kutilgan kod> <yo'l> [sarlavha-regex]
    local name=$1 want=$2 path=$3 header=${4:-}
    local out code
    out=$(curl -sk -o /dev/null -D - -w '%{http_code}' --max-time 15 "$BASE$path")
    code=${out##*$'\n'}
    if [[ "$code" != "$want" ]]; then
        echo "❌ $name: $path → $code (kutilgan $want)"; fail=1; return
    fi
    if [[ -n "$header" ]] && ! grep -qiE "$header" <<<"$out"; then
        echo "❌ $name: $path — sarlavha yo'q: $header"; fail=1; return
    fi
    echo "✅ $name"
}

check "Bosh sahifa"                    200 /index.html           "^content-security-policy: default-src 'self'"
check "Xavfsizlik sarlavhalari"        200 /index.html           "^x-content-type-options: nosniff"
check "Model sahifasi va kodi"         200 /modellar/kepler_model.js
check "Oflayn ishlash (sw.js)"         200 /sw.js                "^cache-control: no-cache"
check "API holati (baza + kesh)"       200 /api/v1/health/
check "Modellar katalogi (API)"        200 /api/v1/simulations/
check "Mashq savollari banki (API)"    200 /api/v1/quiz/bank/
check "Ruscha lug'at (API)"            200 /api/v1/i18n/ru.js
check "Admin panel"                    200 /admin/login/
check "Admin CSS (statik)"             200 /static/admin/css/base.css
check "Backend kodi yopiq"             403 /backend/manage.py
check "Git yopiq"                      403 /.git/config
check "Maxfiy fayllar to'g'ridan yopiq" 404 /media/private/yoq.pdf
check "Ishlab chiqish fayllari yopiq"  403 /package.json

# Admin panelga sayt CSP'si qo'llanmasligi kerak (Unfold o'z skriptlari bilan ishlaydi)
if curl -skI --max-time 15 "$BASE/admin/login/" | grep -qi "^content-security-policy"; then
    echo "❌ Admin panelga sayt CSP'si qo'llangan"; fail=1
else
    echo "✅ Admin panelga sayt CSP'si qo'llanmagan"
fi

# API sog'lom javob berdimi (status: ok)
if curl -sk --max-time 15 "$BASE/api/v1/health/" | grep -q '"ok"'; then echo "✅ API: status ok"; else echo "❌ API: status ok emas"; fail=1; fi

if [[ $fail -ne 0 ]]; then echo; echo "Tekshiruvdan o'tmadi."; exit 1; fi
echo; echo "Hammasi joyida: $BASE"
