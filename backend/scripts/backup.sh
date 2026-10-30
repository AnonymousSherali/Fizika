#!/usr/bin/env bash
# =============================================================================
# Zaxira nusxa (TZ NF-4): baza va yuklangan fayllar (media) — har kuni.
# Eski nusxalar o'chiriladi: baza 30 kun, media 14 kun saqlanadi.
# Muhim: nusxalarni boshqa serverga ham ko'chiring (masalan, rsync/rclone) — disk buzilsa ham yo'qolmasin.
#
# Cron (serverda, root yoki deploy foydalanuvchisi):
#   15 2 * * *  /srv/fizika/backend/scripts/backup.sh >> /var/log/fizika-backup.log 2>&1
#
# Muhit o'zgaruvchilari:
#   BACKUP_DIR   — nusxalar papkasi (standart: /var/backups/fizika)
#   DATABASE_URL — postgres://user:parol@host:5432/baza  (yoki .env dan olinadi)
#   MEDIA_DIR    — yuklangan fayllar (standart: backend/media)
#   COMPOSE=1    — Docker'da: pg_dump "db" konteyneri ichida bajariladi
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/[[:space:]]*#.*$//')
fi
: "${DATABASE_URL:?DATABASE_URL topilmadi}"
BACKUP_DIR=${BACKUP_DIR:-/var/backups/fizika}
MEDIA_DIR=${MEDIA_DIR:-media}
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/media"

DB_FILE="$BACKUP_DIR/db/fizika_$STAMP.dump"
if [[ "${COMPOSE:-0}" == "1" ]]; then
    docker compose exec -T db pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DB_FILE"
else
    pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$DB_FILE"
fi
# Nusxa buzilmaganini tekshiramiz (ro'yxatini o'qib bo'lishi kerak). Docker'da — db konteyneridagi pg_restore
if [[ "${COMPOSE:-0}" == "1" ]]; then
    docker compose exec -T db pg_restore --list < "$DB_FILE" > /dev/null
else
    pg_restore --list "$DB_FILE" > /dev/null
fi
echo "$(date '+%F %T') baza: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# Media (o'quvchi ishlari, ishlanmalar) — har kuni. Docker'da fayllar «media» nomli volume'da turadi,
# shuning uchun api konteyneri ichidan arxivlanadi (xostdagi backend/media bo'sh bo'ladi)
MEDIA_FILE="$BACKUP_DIR/media/media_$STAMP.tar.gz"
if [[ "${COMPOSE:-0}" == "1" ]]; then
    docker compose exec -T api tar -czf - -C /app/media . > "$MEDIA_FILE"
elif [[ -d "$MEDIA_DIR" ]]; then
    tar -czf "$MEDIA_FILE" -C "$MEDIA_DIR" .
else
    echo "$(date '+%F %T') OGOHLANTIRISH: media papkasi topilmadi ($MEDIA_DIR) — fayllar nusxalanmadi" >&2
    MEDIA_FILE=""
fi
if [[ -n "$MEDIA_FILE" ]]; then
    tar -tzf "$MEDIA_FILE" > /dev/null   # arxiv butunligini tekshirish
    echo "$(date '+%F %T') media: $MEDIA_FILE ($(du -h "$MEDIA_FILE" | cut -f1))"
fi

find "$BACKUP_DIR/db" -name 'fizika_*.dump' -mtime +30 -delete
find "$BACKUP_DIR/media" -name 'media_*.tar.gz' -mtime +14 -delete
