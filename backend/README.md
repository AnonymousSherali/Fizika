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
docker compose exec api python manage.py createsuperuser
```
Nginx `http://localhost/` da statik saytni, `/api/` va `/admin/` da backendni beradi (bitta domen — CORS kerak emas).

## Testlar va sifat

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
(Playwright kerak: `npm i -D playwright && npx playwright install chromium`.)

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
│   └── assignments/   topshiriqlar, topshirish, avtomatik baho, baholash/qaytarish
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

To'liq ro'yxat va namunalar — Swagger'da (`/api/docs/`).

## Saytni backendga ulash

Sayt (statik HTML) API'ga `api.js` orqali murojaat qiladi:
- **Bir domen (tavsiya):** Nginx `/api/` ni backendga yo'naltiradi (`deploy/nginx.conf`) — hech narsa sozlash kerak emas.
- **Backend boshqa domenda:** `api.js` dagi `API_BASE` ga yozing, masalan `'https://api.maktab.uz/api/v1/'`,
  va backend `.env` da `CORS_ALLOWED_ORIGINS=https://maktab.uz`.
- **Lokal sinov:** sayt `python3 -m http.server 8080`, backend `runserver 8000`; brauzer konsolida bir marta:
  `localStorage.setItem('fizika-api', 'http://127.0.0.1:8000/api/v1/')`.

Yangi sahifalar: `kirish.html`, `profil.html`, `oquvchi/`, `oqituvchi/`, `testlar/nazorat.html`.
Backend ishlamasa ular «Server bilan aloqa yo'q» deydi, qolgan sayt esa odatdagidek ishlaydi.

## Muhim kelishuvlar
- **Bolalar ma'lumotlari:** o'quvchidan faqat ism, familiya va login olinadi. Production server **O'zbekistonda**
  bo'lishi shart (O'RQ-547, TZ 11.1).
- **Frontend backendsiz ham ishlaydi:** API ishlamasa sayt hozirgidek (oflayn) ishlayveradi.
- Modellar o'zgarsa: `python manage.py import_simulations` qayta ishga tushiriladi — jurnal ustunlari
  o'zgargan bo'lsa yangi sxema versiyasi yaratiladi, eski jurnallar eski versiyada qoladi.
