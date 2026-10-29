#!/usr/bin/env bash
# =============================================================================
# Zaxira nusxadan tiklash (TZ NF-4 — har chorakda sinab ko'rish kerak).
#
#   scripts/restore.sh /var/backups/fizika/db/fizika_2026-11-01_0215.dump [maqsad_DATABASE_URL]
#
# Maqsad bazasi berilmasa — .env dagi DATABASE_URL. DIQQAT: maqsad bazadagi jadvallar
# almashtiriladi. Sinov uchun alohida bazaga tiklang:
#   createdb fizika_restore_test && scripts/restore.sh nusxa.dump postgres://.../fizika_restore_test
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
FILE=${1:?Nusxa fayli ko\'rsatilmagan}
TARGET=${2:-${DATABASE_URL:-}}
if [[ -z "$TARGET" && -f .env ]]; then
    TARGET=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/[[:space:]]*#.*$//')
fi
: "${TARGET:?Maqsad baza topilmadi}"
if [[ "${YES:-0}" != "1" ]]; then
    read -r -p "Baza $TARGET almashtiriladi. Davom etasizmi? (ha/yo'q) " ans
    [[ "$ans" == "ha" ]] || { echo "Bekor qilindi"; exit 1; }
fi
pg_restore --clean --if-exists --no-owner --dbname="$TARGET" "$FILE"
echo "Tiklandi: $FILE → $TARGET"
