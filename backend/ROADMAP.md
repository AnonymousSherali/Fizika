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

## 2-bosqich — Topshiriqlar va testlar ✅
### Topshiriqlar (assignments)
| Band | Holat | Izoh |
|---|---|---|
| FT-5.1 Topshiriq: lab / test, sinflar, boshlanish va muddat, kech topshirish, jarima % | ✅ | faqat o'z sinflariga |
| FT-5.2 Lab: model, qadamlar (o'qituvchi o'zgartira oladi), min. qatorlar, grafik/xulosa talabi | ✅ | |
| FT-5.3 Test: mavzular, savollar/masalalar soni, vaqt, urinishlar (1–3), javoblarni ko'rsatish rejimi | ✅ | |
| FT-5.4 «Mening topshiriqlarim» va holatlar (yangi/bajarilmoqda/topshirildi/baholandi/qaytarildi/muddati o'tdi) | ✅ | |
| FT-5.5 Lab topshirish: jurnal nusxasi, grafik tahlili, xulosa, PNG ≤ 500 KB | ✅ | |
| FT-5.6 Baholash (2–5 / 100), izoh, qayta topshirishga qaytarish | ✅ | |
| FT-5.7 Avtomatik dastlabki baho (qatorlar, R² ≥ 0,98, xatolik ≤ 5%, xulosa) | ✅ | |
| O'qituvchi uchun sinf ro'yxati bo'yicha holat (topshirmaganlar ham) | ✅ | `assignments/{id}/submissions/` |
| Test topshirig'i avtomatik baholanadi (eng yaxshi urinish, kechikish jarimasi) | ✅ | o'qituvchi bahoni o'zgartira oladi |
| FT-5.8 Muddat eslatmasi | ⬜ | 3-bosqich (bildirishnomalar) |

### Testlar (quizzes)
| Band | Holat | Izoh |
|---|---|---|
| FT-6.1 Savollar banki (uz/ru, mavzu, daraja, qiyinlik, holat, muallif) | ✅ | ishlatilgan savol o'chirilmaydi — arxivlanadi |
| FT-6.2 Hisoblash masalalari | ✅ | parametrlangan — ⬜ 4-bosqich |
| FT-6.3 170 savol + 48 masala import; Excel import | ✅ | `manage.py import_quiz_bank`, `quiz/questions/import/` |
| FT-6.4 Serverda tekshiriladigan sessiya, javoblar mijozga yuborilmaydi, vaqt nazorati | ✅ | vaqt tugasa avtomatik yakunlanadi |
| FT-6.5 Javob tekshiruvi frontend bilan bir xil (46 ta umumiy holat, JS'dan olingan) | ✅ | `tests/test_answers.py` |
| FT-6.6 Natija, mavzular tahlili, xato javoblar va izohlar | ✅ | |
| FT-6.7 Mashq rejimi `/quiz/practice/` | ✅ | mavzular navbat bilan |
| FT-6.8 Savollar statistikasi (har variant necha marta tanlangan) | ✅ | admin panelda «to'g'ri %» |
| O'qituvchi o'z savollarini qo'shadi (qoralama), admin tasdiqlaydi | ✅ | o'z topshiriqlarida qoralamasi ham ishlatiladi |
| FT-1.7 davomi: o'chirilgan foydalanuvchi test natijalari anonim saqlanadi | ✅ | |
| Savollarning ruscha tarjimasi | ⬜ | bazada maydon bor, matnlar hali tarjima qilinmagan (4-bosqich) |

## 3-bosqich — Statistika va bildirishnomalar ✅
| Band | Holat | Izoh |
|---|---|---|
| FT-8.1 Sinf paneli: topshiriqlar holati, o'rtacha baho, testlar o'rtachasi, 7 kunlik faollik | ✅ | `analytics/classrooms/{id}/` |
| FT-8.1 «O'quvchi × mavzu» issiqlik xaritasi | ✅ | `analytics/classrooms/{id}/heatmap/` |
| FT-8.2 O'quvchi kartasi: topshiriqlar, test dinamikasi, zaif mavzular, jurnallar | ✅ | o'quvchining o'zi ham ko'radi |
| FT-8.3 Sinf jurnali Excel (.xlsx: baholar + mavzular), topshiriq natijalari CSV | ✅ | |
| FT-8.3 O'quvchi hisoboti PDF | 🟡 | brauzerda chop etish → PDF (model sahifasidagi hisobot); server PDF — kerak bo'lsa 5-bosqich |
| FT-8.4 Administrator statistikasi | ✅ | `analytics/platform/` (sahifa — admin panel orqali, keyin) |
| FT-8.5 Kesh (10 daqiqa), yangi baho/urinishda o'zi yangilanadi | ✅ | Celery shart emas — hisoblar yengil |
| FT-9.1 Sayt ichidagi bildirishnomalar (🔔) + email | ✅ | Telegram ➖ |
| FT-9.2 Hodisalar: yangi topshiriq, muddat, baho, qaytarish, yangi o'quvchi, ish topshirildi | ✅ | |
| FT-9.3 Email kanalini yoqish/o'chirish (profil) | ✅ | |
| FT-5.8 Muddatga 24 soat / 1 soat qolganda eslatma (har 15 daqiqada, takrorlanmaydi) | ✅ | Celery Beat |
| FT-4.4 Jurnal PDF eksporti | 🟡 | model sahifasidagi «Hisobot (PDF)» (brauzer) |

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

## F-bosqich — Frontendni ulash (TZ 9) ✅
Yondashuv: **Django template ishlatilmaydi.** Mavjud statik sayt o'zgarmaydi; `api.js` (oddiy `fetch`) qo'shildi,
yangi sahifalar shu uslubdagi statik HTML. Backend ishlamasa sayt hozirgidek (oflayn) ishlaydi, «Kirish» tugmasi chiqmaydi.
| Band | Holat | Izoh |
|---|---|---|
| `api.js`: token, avtomatik refresh, xatolar, oflayn navbat (IndexedDB) | ✅ | `API_BASE` — backend boshqa domenda bo'lsa |
| `kirish.html`: kirish, o'quvchi (sinf kodi, `?kod=` havolasi), o'qituvchi (kod bilan tasdiqlash), parol tiklash | ✅ | |
| `profil.html`: ism, til/mavzu sinxroni, parol (vaqtinchalik parolni majburiy almashtirish), kirish tarixi, hisobni o'chirish | ✅ | |
| Hisob tugmasi: bosh sahifa menyusi, model sahifasidagi pastki panel, boshqa sahifalarda burchakda | ✅ | |
| FT-4.2 Model jurnali avtomatik saqlanadi (2 s), holat ko'rsatiladi | ✅ | |
| FT-4.3 Internet yo'q — navbatga, ulanganda yuboriladi | ✅ | |
| Modelda topshiriq rejimi (`?topshiriq=`): banner, o'qituvchi qadamlari, «Topshirish», avto-tekshiruv natijasi, qaytarilgan izoh | ✅ | |
| O'qituvchi rejimi rol bo'yicha (kutilgan natijalar serverdan) | ✅ | `?oqituvchi=1` ham ishlaydi |
| `oquvchi/index.html`: topshiriqlar (holat, baho, izoh), jurnallar (CSV), test natijalari, sinfga qo'shilish | ✅ | |
| `testlar/nazorat.html`: nazorat testi (taymer, navigatsiya, davom ettirish, natija va xatolar tahlili) | ✅ | |
| `oqituvchi/index.html`: sinflar, kod/havola, o'quvchilar (import, parol, ko'chirish), **login kartochkalari (chop etish/PDF)** | ✅ | FT-1.2 kartochkalar |
| `oqituvchi/index.html`: topshiriq berish (lab/test), sinf bo'yicha holat, ishni ko'rish va baholash, qaytarish | ✅ | |
| `oqituvchi/index.html`: savollarim (qo'shish, Excel import, statistika) | ✅ | |
| E2E: o'qituvchi → sinf → o'quvchilar → topshiriq → o'quvchi bajaradi → baho | ✅ | Playwright (qo'lda ishga tushiriladi) |
| `testlar_online.html` mashq rejimi savollarini API'dan olish | ⬜ | hozir o'rnatilgan bank (oflayn ishlashi uchun qulay) |
| Katalog va dars ishlanmalar API'dan | ⬜ | 4-bosqich (kontent boshqaruvi bilan) |
| Yangi sahifalarning ruscha tarjimasi (i18n-ru.js) | ⬜ | |
| `sw.js`: `/api/`, `/admin/`, `/media/` keshlanmaydi | ✅ | |
| Topilgan va tuzatilgan xato: yopishqoq kanvas pastdagi jurnal ustiga chiqardi (panel ekran tepasidan chiqqanda) | ✅ | |
