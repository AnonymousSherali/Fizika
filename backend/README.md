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

## Tuzilma

```
backend/
├── config/            settings (base/local/test/production), urls, celery, wsgi
├── apps/
│   ├── core/          xato formati, sahifalash, ruxsatlar, /health/
│   ├── accounts/      foydalanuvchi, ro'yxat, JWT, kod (SMS/email), profil, o'chirish
│   ├── schools/       maktab, sinf, qo'shilish kodi, o'quvchilarni import qilish
│   ├── simulations/   modellar katalogi, topshiriqlar, kutilgan natijalar, jurnal sxemasi
│   └── labs/          laboratoriya jurnali, serverda grafik tahlili, CSV eksport
├── tests/             pytest
├── deploy/nginx.conf
├── Dockerfile, docker-compose.yml, .env.example
└── ROADMAP.md         TZ bandlari bo'yicha holat
```

## Asosiy endpointlar (1-bosqich)

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

To'liq ro'yxat va namunalar — Swagger'da (`/api/docs/`).

## Muhim kelishuvlar
- **Bolalar ma'lumotlari:** o'quvchidan faqat ism, familiya va login olinadi. Production server **O'zbekistonda**
  bo'lishi shart (O'RQ-547, TZ 11.1).
- **Frontend backendsiz ham ishlaydi:** API ishlamasa sayt hozirgidek (oflayn) ishlayveradi.
- Modellar o'zgarsa: `python manage.py import_simulations` qayta ishga tushiriladi — jurnal ustunlari
  o'zgargan bo'lsa yangi sxema versiyasi yaratiladi, eski jurnallar eski versiyada qoladi.
