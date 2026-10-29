# Backend: TZ bajarilishi holati

TZ: [`hujjatlar/backend_TZ.md`](../hujjatlar/backend_TZ.md). Har bir bosqichdan keyin shu fayl yangilanadi —
**hech bir talab esdan chiqmasligi uchun** barcha bandlar shu yerda.

Belgilar: ✅ bajarildi · 🟡 qisman · ⬜ navbatda · ➖ olib tashlandi (buyurtmachi qarori)

## Buyurtmachi qarorlari
- **Telegram bot kerak emas** (2026-10-30). TZ'dagi FT-1.4, FT-9.4 va bildirishnomalarning Telegram kanali bajarilmaydi.
  Bildirishnomalar: sayt ichida + email.

---

## 0-bosqich — Asos ✅
| Band | Holat | Izoh |
|---|---|---|
| Loyiha tuzilmasi, settings (base/local/test/production) | ✅ | `config/settings/` |
| PostgreSQL, Redis kesh, Celery + Beat | ✅ | `config/celery.py` |
| Yagona xato formati (TZ 8.1) | ✅ | `apps/core/exceptions.py` |
| Sahifalash, versiyalash `/api/v1/` | ✅ | |
| OpenAPI / Swagger `/api/docs/` | ✅ | drf-spectacular |
| `/api/v1/health/` (NF-10) | ✅ | baza + kesh |
| Docker, docker-compose, Nginx | ✅ | `Dockerfile`, `docker-compose.yml`, `deploy/nginx.conf` |
| CI: ruff, migratsiya tekshiruvi, pytest + qamrov ≥ 75%, pip-audit | ✅ | `.github/workflows/backend.yml` |
| Sentry | ⬜ | 5-bosqich |
| CD (teg → production deploy) | ⬜ | 5-bosqich |

## 1-bosqich — MVP ✅
### Autentifikatsiya va profil (accounts)
| Band | Holat | Izoh |
|---|---|---|
| FT-1.1 O'qituvchi ro'yxati, SMS/email kod bilan tasdiqlash | ✅ | Eskiz.uz provayderi tayyor, standart — console |
| FT-1.2 O'quvchi sinf kodi bilan ro'yxati | ✅ | |
| FT-1.2 Excel/CSV dan ommaviy o'quvchi yaratish | ✅ | `classrooms/{id}/students/import/` |
| FT-1.2 Login/parol kartochkalarini PDF chop etish | ⬜ | frontend sahifasi bilan (o'qituvchi paneli) |
| FT-1.3 Kirish: login / telefon / email + JWT | ✅ | access 15 daq, refresh 30 kun, rotatsiya |
| FT-1.4 Telegram orqali kirish | ➖ | buyurtmachi qarori |
| FT-1.5 Parolni tiklash (o'qituvchi — kod, o'quvchi — o'qituvchi) | ✅ | |
| FT-1.6 Profil: til, mavzu, kirish tarixi (10 ta) | ✅ | avatar — ⬜ (ixtiyoriy) |
| FT-1.7 Hisobni o'chirish (30 kun) | ✅ | Celery Beat har kecha |
| FT-1.7 Statistikani anonimlashtirish | ⬜ | test/topshiriq modullari bilan (2-bosqich) |
| FT-1.8 10 xatodan keyin 15 daqiqa bloklash | ✅ | + DRF rate-limit |
| Parolni almashtirish (`must_change_password`) | ✅ | |

### Maktab va sinflar (schools)
| Band | Holat | Izoh |
|---|---|---|
| FT-2.1 Maktab, 14 viloyat | ✅ | tumanlar ro'yxati — ⬜ (hozir erkin matn) |
| FT-2.2 Sinf yaratish, qo'shilish kodi | ✅ | |
| FT-2.3 Kodni yangilash / o'chirish / muddat | ✅ | |
| FT-2.4 O'quvchilar: ro'yxat, chiqarish, parol tiklash, ko'chirish | ✅ | |
| FT-2.5 Bir nechta o'qituvchi | ✅ | |
| FT-2.6 Arxivlash | ✅ | yil oxirida avtomatik arxiv — ⬜ |

### Modellar katalogi (simulations)
| Band | Holat | Izoh |
|---|---|---|
| FT-3.1 Katalog (15 model, uz/ru) | ✅ | `manage.py import_simulations` |
| FT-3.2 Topshiriq qadamlari, kutilgan natijalar (faqat o'qituvchi) | ✅ | |
| FT-3.3 Jurnal ustunlari sxemasi, versiyalash | ✅ | |
| FT-3.4 `GET /simulations/` | ✅ | frontend ulanishi — ⬜ (9-bo'lim) |

### Laboratoriya jurnali (labs)
| Band | Holat | Izoh |
|---|---|---|
| FT-4.1 Serverga saqlash | ✅ | |
| FT-4.2 Avtomatik saqlash (2 s) | ⬜ | frontend `api.js` (9-bo'lim) |
| FT-4.3 Oflayn navbat, `client_id` bilan dublikatsiz | 🟡 | server tomoni ✅, IndexedDB navbati — frontend |
| FT-4.4 Tarix, CSV eksport | ✅ | PDF eksport — ⬜ (3-bosqich, hisobotlar bilan) |
| FT-4.5 Serverda grafik tahlili (k, b, R², hosila natija) | ✅ | xavfsiz formula hisoblagich |
| FT-4.6 Nazariy qiymat bilan solishtirish (xatolik %) | ✅ | |
| O'qituvchi o'z o'quvchilarining jurnalini o'qiydi | ✅ | |

### Admin panel
| Band | Holat | Izoh |
|---|---|---|
| FT-10.1 Django Admin (o'zbekcha) | ✅ | foydalanuvchi, maktab, sinf, model, jurnal |
| FT-10.4 Admin uchun 2FA (TOTP) | ⬜ | 5-bosqich (django-otp) |

---

## 2-bosqich — Topshiriqlar va testlar ⬜
- ⬜ FT-5.1 Topshiriq yaratish (lab / test, sinflar, muddat, kech topshirish jarimasi)
- ⬜ FT-5.2 Lab topshiriq: model, qadamlar (tahrirlanadigan), min. qatorlar, grafik/xulosa talabi
- ⬜ FT-5.3 Test topshiriq: mavzular, soni, vaqt, urinishlar, javoblarni ko'rsatish rejimi
- ⬜ FT-5.4 «Mening topshiriqlarim» va holatlar
- ⬜ FT-5.5 Topshirish (jurnal + grafik + xulosa + PNG ≤ 500 KB)
- ⬜ FT-5.6 Baholash (2–5 / 100 ball), izoh, qayta topshirishga qaytarish
- ⬜ FT-5.7 Avtomatik dastlabki baho
- ⬜ FT-6.1 Savollar banki (uz/ru, mavzu, daraja, qiyinlik, holat)
- ⬜ FT-6.2 Hisoblash masalalari (+ 3-bosqichda parametrlangan)
- ⬜ FT-6.3 170 savol + 48 masalani import qilish; Excel import
- ⬜ FT-6.4 Serverda tekshiriladigan test sessiyasi, vaqt nazorati
- ⬜ FT-6.5 Javob tekshiruvi frontend bilan bir xil (≥ 30 umumiy test holati)
- ⬜ FT-6.6 Natija, mavzular tahlili, izohlar
- ⬜ FT-6.7 Mashq rejimi API (`/quiz/practice/`)
- ⬜ FT-6.8 Savollar statistikasi
- ⬜ FT-1.7 davomi: o'chirilgan foydalanuvchi natijalarini anonimlashtirish

## 3-bosqich — Statistika va bildirishnomalar ⬜
- ⬜ FT-8.1 O'qituvchi paneli, mavzular issiqlik xaritasi
- ⬜ FT-8.2 O'quvchi kartasi
- ⬜ FT-8.3 Eksport: sinf jurnali (.xlsx), o'quvchi hisoboti (PDF), natijalar (CSV)
- ⬜ FT-8.4 Administrator statistikasi
- ⬜ FT-8.5 Og'ir hisoblar Celery'da, 10 daqiqa kesh
- ⬜ FT-9.1 Bildirishnomalar: sayt ichida + email (Telegram ➖)
- ⬜ FT-9.2 Hodisalar: yangi topshiriq, muddat, baho, qaytarish, yangi o'quvchi
- ⬜ FT-9.3 Kanallarni yoqish/o'chirish
- ⬜ FT-5.8 Muddatga 24 soat / 1 soat qolganda eslatma
- ⬜ FT-4.4 jurnal PDF eksporti

## 4-bosqich — Kontent va tarjimalar ⬜
- ⬜ FT-7.1–7.4 Dars ishlanmalar: yuklash, moderatsiya, fayl tekshiruvi, yuklab olishlar soni
- ⬜ FT-7.5 `dars_ishlanmalar/index.html` API'dan
- ⬜ FT-7.6 Tarjimalar bazada, `GET /i18n/ru.js`
- ⬜ FT-6.2 Parametrlangan masalalar
- ⬜ FT-11.1–11.3 Audit jurnali (o'zgarmas, 1 yil)

## 5-bosqich — Sifat va ishga tushirish ⬜
- ⬜ Yuklama testi (k6/Locust): 500 foydalanuvchi, p95 ≤ 300 ms (NF-1, NF-2)
- ⬜ OWASP ZAP skanerlash, qo'lda IDOR tekshiruvi
- ⬜ E2E Playwright: sinf → topshiriq → baho
- ⬜ Sentry, JSON loglar (✅ production settings'da), monitoring ogohlantirishlari
- ⬜ Backup (kunlik pg_dump, 30 kun) + tiklashni sinash (NF-4)
- ⬜ Admin 2FA
- ⬜ O'qituvchi va administrator qo'llanmasi (uz/ru), maxfiylik siyosati
- ⬜ Production (O'zbekistondagi server, TZ 11.1)

## Frontend integratsiyasi (TZ 9) ⬜
- ⬜ `api.js`: login/refresh, oflayn navbat (IndexedDB), xatosiz ishlash
- ⬜ `theme.js`: «Kirish» / profil tugmasi, til va mavzu sinxroni
- ⬜ `model-tools.js`: jurnalni saqlash, «Topshirish», o'qituvchi rejimi rol bo'yicha
- ⬜ Katalog, testlar, dars ishlanmalar — API'dan (zaxira: statik)
- ⬜ Yangi sahifalar: kirish, profil, o'qituvchi paneli, o'quvchi topshiriqlari
- ✅ `sw.js`: `/api/`, `/admin/`, `/media/` keshlanmaydi
