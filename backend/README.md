# fizika-api — «Fizika 10–11» platformasining backendi

Python 3.12 · Django 5 · Django REST Framework · PostgreSQL 16 · Redis · Celery.
Texnik topshiriq: [`../hujjatlar/backend_TZ.md`](../hujjatlar/backend_TZ.md) ·
Bajarilish holati: [`ROADMAP.md`](ROADMAP.md)

> ⚠️ **Hostingga yuklashda:** `backend/` papkasini oddiy hostingning `public_html` iga **yuklamang** —
> u statik sayt emas. Backend VPS'da (Docker) yoki alohida Python hostingda ishlaydi.

## Tez boshlash (lokal, 10 daqiqa)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

# Ma'lumotlar bazasi: PostgreSQL bo'lsa
export DATABASE_URL=postgres://fizika:fizika@localhost:5432/fizika
# (bo'lmasa DATABASE_URL ni bermang — avtomatik SQLite ishlatiladi)

python manage.py migrate
python manage.py import_simulations       # 15 ta modelni statik saytdan bazaga ko'chiradi
python manage.py import_quiz_bank         # 170 savol + 48 masalani onlayn testdan ko'chiradi
python manage.py import_lesson_plans      # 22 ta dars ishlanmani (fayllar saytda qoladi)
python manage.py import_i18n              # i18n-ru.js tarjimalarini bazaga (admin panelda tahrirlash uchun)
python manage.py createsuperuser          # admin panel uchun
python manage.py runserver                # http://127.0.0.1:8000/api/docs/
```

- API hujjati (Swagger): <http://127.0.0.1:8000/api/docs/>
- Admin panel: <http://127.0.0.1:8000/admin/>
- Holat: <http://127.0.0.1:8000/api/v1/health/>
- Tasdiqlash kodlari lokal rejimda SMS o'rniga **konsolga** yoziladi (`SMS_PROVIDER=console`).

## Docker bilan (production'ga yaqin)

```bash
cd backend
cp .env.example .env          # DJANGO_SECRET_KEY va parollarni to'ldiring
docker compose up -d --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py import_simulations
docker compose exec api python manage.py import_quiz_bank
docker compose exec api python manage.py import_lesson_plans
docker compose exec api python manage.py import_i18n
docker compose exec api python manage.py createsuperuser
```
Nginx `http://localhost/` da statik saytni, `/api/` va `/admin/` da backendni beradi (bitta domen — CORS kerak emas).

## Testlar va sifat

Frontend (repozitoriy ildizida): `npm ci && npm run lint` — ESLint; sayt fayllari o'zgarganda kesh versiyasi:
`npm run version:bump`.

```bash
pytest                     # barcha testlar
pytest --cov               # qamrov (talab: ≥ 75%)
ruff check .               # lint
python manage.py makemigrations --check --dry-run
```
GitHub Actions har bir push/PR'da shularni PostgreSQL bilan bajaradi (`.github/workflows/backend.yml`).

**E2E (brauzerda to'liq ssenariy):** backend va statik sayt ishlab turganda, tasdiqlangan o'qituvchi hisobi bilan:
```bash
SITE=http://localhost:8080/ API=http://127.0.0.1:8000/api/v1/ TEACHER=+998901234500 TEACHER_PW=... node e2e/flow.js
```
(`CHROMIUM=/yo'l/chromium` — tizimdagi brauzerni ishlatish uchun, ixtiyoriy.)
(Playwright kerak: `npm i -D playwright && npx playwright install chromium`.)

**Admin panel → sayt** (admin formalari orqali ma'lumot qo'shib, saytda ko'rinishini tekshiradi; faqat sinov bazasida):
```bash
SITE=http://localhost:8080/ BACKEND=http://127.0.0.1:8000/ ADMIN=admin ADMIN_PW=... TEACHER=+998901234500 TEACHER_PW=... \
CLEAR_CACHE_CMD="python manage.py shell -c 'from django.core.cache import cache; cache.clear()'" node e2e/admin_to_site.js
```

## Tuzilma

```
backend/
├── config/            settings (base/local/test/production), urls, celery, wsgi
├── apps/
│   ├── core/          xato formati, sahifalash, ruxsatlar, /health/
│   ├── accounts/      foydalanuvchi, ro'yxat, JWT, kod (SMS/email), profil, o'chirish
│   ├── schools/       maktab, sinf, qo'shilish kodi, o'quvchilarni import qilish
│   ├── simulations/   modellar katalogi, topshiriqlar, kutilgan natijalar, jurnal sxemasi
│   ├── labs/          laboratoriya jurnali, serverda grafik tahlili, CSV eksport
│   ├── quizzes/       savollar banki, masalalar, test urinishlari, javob tekshiruvi, mashq rejimi
│   ├── assignments/   topshiriqlar, topshirish, avtomatik baho, baholash/qaytarish
│   ├── analytics/     sinf statistikasi, issiqlik xaritasi, o'quvchi kartasi, Excel/CSV eksport
│   ├── notifications/ sayt ichida va email bildirishnomalar, muddat eslatmalari
│   ├── content/       dars ishlanmalar (yuklash, moderatsiya), tarjimalar
│   └── audit/         o'zgarmas audit jurnali
├── tests/             pytest
├── deploy/nginx.conf
├── Dockerfile, docker-compose.yml, .env.example
└── ROADMAP.md         TZ bandlari bo'yicha holat
```

## Asosiy endpointlar

| Metod | Yo'l | Kim |
|---|---|---|
| POST | `/api/v1/auth/register/teacher/` · `register/student/` · `verify/` · `verify/resend/` | hamma |
| POST | `/api/v1/auth/login/` · `refresh/` · `logout/` | hamma / kirgan |
| POST | `/api/v1/auth/password/reset/` · `reset/confirm/` · `change/` | |
| GET/PATCH/DELETE | `/api/v1/me/` · GET `/api/v1/me/logins/` | kirgan |
| GET/POST | `/api/v1/schools/` | hamma / o'qituvchi |
| CRUD | `/api/v1/classrooms/` (+ `join-code/`, `students/`, `students/import/`, `students/{id}/reset-password/`, `students/{id}/move/`, `teachers/`) | o'qituvchi |
| POST | `/api/v1/classrooms/join/` | o'quvchi |
| GET | `/api/v1/simulations/` · `{slug}/` · `{slug}/expected/` | hamma / o'qituvchi |
| CRUD | `/api/v1/labs/` (+ `analyze/`, `export/`) | kirgan |
| GET | `/api/v1/quiz/topics/` · `/api/v1/quiz/practice/?topics=kepler,linza&count=20` | hamma |
| POST/GET | `/api/v1/quiz/attempts/` (+ `{id}/answer/`, `{id}/finish/`, `{id}/result/`) | kirgan |
| CRUD | `/api/v1/quiz/questions/` (+ `import/`), `/api/v1/quiz/problems/` | o'qituvchi |
| CRUD | `/api/v1/assignments/` (+ `{id}/submissions/`, `{id}/submit/`, `{id}/my-submission/`) | o'qituvchi / o'quvchi |
| GET/POST | `/api/v1/submissions/{id}/` (+ `grade/`, `return/`) | o'qituvchi / egasi |
| GET | `/api/v1/analytics/classrooms/{id}/` (+ `heatmap/`, `export.xlsx`), `/api/v1/analytics/students/{id}/` | o'qituvchi |
| GET/POST | `/api/v1/notifications/` (+ `unread-count/`, `read-all/`, `{id}/read/`) | kirgan |
| GET/POST | `/api/v1/lesson-plans/` (+ `{id}/download/`, `{id}/moderate/`) · GET `/api/v1/i18n/ru.js` | hamma / o'qituvchi / admin |

Tarjimani admin panelda o'zgartirgandan keyin: `python manage.py export_i18n` — saytdagi `i18n-ru.js` yangilanadi.

To'liq ro'yxat va namunalar — Swagger'da (`/api/docs/`).

## Saytni backendga ulash

Sayt (statik HTML) API'ga `api.js` orqali murojaat qiladi:
- **Bir domen (tavsiya):** Nginx `/api/` ni backendga yo'naltiradi (`deploy/nginx.conf`) — hech narsa sozlash kerak emas.
- **Backend boshqa domenda:** `api.js` dagi `API_BASE` ga yozing, masalan `'https://api.maktab.uz/api/v1/'`,
  va backend `.env` da `CORS_ALLOWED_ORIGINS=https://maktab.uz`.
- **Lokal sinov:** sayt `python3 -m http.server 8080`, backend `runserver 8000`; brauzer konsolida bir marta:
  `localStorage.setItem('fizika-api', 'http://127.0.0.1:8000/api/v1/')`.

Yangi sahifalar: `kirish.html`, `profil.html`, `oquvchi/`, `oqituvchi/`, `testlar/nazorat.html`, `maxfiylik.html`.
Backend ishlamasa ular «Server bilan aloqa yo'q» deydi, qolgan sayt esa odatdagidek ishlaydi.

## Ishga tushirish (production) — xavfsizlik va zaxira

**Admin 2FA.** Production'da admin panelga kirish uchun parol + 6 xonali kod (Google Authenticator) so'raladi:
```bash
docker compose exec api python manage.py admin_2fa_setup admin   # QR-kod chiqadi — ilovada skanerlang
docker compose exec api python manage.py admin_2fa_setup admin --reset   # telefon yo'qolsa
```
O'chirish (tavsiya etilmaydi): `.env` da `ADMIN_2FA=false`.

**Admin panel ko'rinishi:** [Unfold](https://unfoldadmin.com) — menyu va ranglar `config/settings/base.py` dagi
`UNFOLD`, bosh sahifa `apps/core/admin_ui.py` + `templates/admin/index.html`. O'zbekcha matnlar `locale/uz/LC_MESSAGES/django.po`;
o'zgartirgach `python scripts/compile_po.py` (gettext o'rnatilmagan bo'lsa ham ishlaydi).

**HTTPS (majburiy).** `deploy/nginx.conf` — faqat 80-port (sinov uchun). Production'da `deploy/nginx-ssl.conf`:
`site.uz` ni domeningizga almashtiring, Let's Encrypt sertifikatini oling (certbot, webroot `/var/www/certbot`),
`docker-compose.yml` dagi nginx konfiguratsiyasini shu faylga almashtirib, `443:443` portini va
`/etc/letsencrypt` papkasini ulang. HTTPS ishlamaguncha `.env` da `SECURE_SSL_REDIRECT=false` qoldiring
(aks holda API so'rovlari mavjud bo'lmagan https manzilga yo'naltiriladi).

**CSP (brauzer xavfsizlik siyosati).** `deploy/snippets/fizika-csp-map.conf` — statik sayt uchun
`script-src 'self'`: XSS bo'lgan taqdirda ham begona skript ishlamaydi. Admin panel va Swagger'ga qo'llanmaydi.
Apache hostingda xuddi shu siyosat `.htaccess` da (ikkalasi bir xilligini test tekshiradi).

**Proksi va fayllar.** `NUM_PROXIES=1` (nginx ortida; mijoz IP si soxtalashtirilmaydi),
`MEDIA_X_ACCEL=true` (o'quvchi ishlari va ishlanmalar faqat ruxsat bilan, nginx orqali beriladi).

**Xatolar monitoringi:** `.env` da `SENTRY_DSN=...` — server xatolari Sentry'ga yuboriladi (shaxsiy ma'lumotlarsiz).

**Zaxira nusxa (har kecha):**
```bash
# crontab -e
15 2 * * *  COMPOSE=1 /srv/fizika/backend/scripts/backup.sh >> /var/log/fizika-backup.log 2>&1
```
Baza 30 kun, yuklangan fayllar 8 hafta saqlanadi. Nusxani boshqa serverga ham ko'chirib turing (masalan, `rsync`).
Tiklash: `scripts/restore.sh /var/backups/fizika/db/fizika_YYYY-MM-DD_HHMM.dump` (tasdiq so'raydi; oyiga bir marta
sinov bazasida tiklab ko'rish tavsiya etiladi).

**Yuklama testi:** `loadtest/locustfile.py` boshidagi ko'rsatmaga qarang (sinov bazasida
`create_load_users --count 500`, keyin `--delete`).

**Xavfsizlik tahlili:** `bandit -r apps config -x '*/migrations/*,*/tests/*'` va `pip-audit -r requirements.txt`.

Qo'llanmalar: [`hujjatlar/qollanma_oqituvchi.md`](../hujjatlar/qollanma_oqituvchi.md),
[`hujjatlar/qollanma_admin.md`](../hujjatlar/qollanma_admin.md).

## Muhim kelishuvlar
- **Bolalar ma'lumotlari:** o'quvchidan faqat ism, familiya va login olinadi. Production server **O'zbekistonda**
  bo'lishi shart (O'RQ-547, TZ 11.1).
- **Frontend backendsiz ham ishlaydi:** API ishlamasa sayt hozirgidek (oflayn) ishlayveradi.
- **Mashq va nazorat testi bitta bankdan.** Mashq sahifasi (`testlar_online.html`) internetsiz ishlashi uchun
  barcha 170 savolni to'g'ri javoblari bilan o'z ichida saqlaydi — demak, o'quvchi umumiy bankdagi savollarning
  javobini oldindan ko'rishi mumkin. Nazorat testida variantlar tartibi aralashtiriladi va vaqt cheklanadi, lekin
  jiddiy nazorat uchun o'qituvchi **o'z savollarini** («Savollarim») ishlatishi tavsiya etiladi — qoralama
  holidagi bu savollar faqat uning topshiriqlarida ishlatiladi va mashq sahifasida chiqmaydi. Shu sababli `?oqituvchi=1` dagi kutilgan natijalar ham maxfiy emas.
- Modellar o'zgarsa: `python manage.py import_simulations` qayta ishga tushiriladi — jurnal ustunlari
  o'zgargan bo'lsa yangi sxema versiyasi yaratiladi, eski jurnallar eski versiyada qoladi.
