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
| Sentry | ✅ | `SENTRY_DSN` bo'lsa yoqiladi (shaxsiy ma'lumotlarsiz) |
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
| FT-10.4 Admin uchun 2FA (TOTP) | ✅ | django-otp, `manage.py admin_2fa_setup` |
| Zamonaviy admin ko'rinishi (Unfold): sayt ranglari, yorug'/qorong'i, telefonda qulay, o'zbekcha menyu | ✅ | `apps/core/admin_site.py`, `UNFOLD` (settings) |
| Admin bosh sahifasi: ko'rsatkichlar, 30 kunlik faollik grafigi, moderatsiya navbati, hududlar, modellar, audit | ✅ | `apps/core/admin_ui.py`, `templates/admin/index.html` |
| Yon menyuda moderatsiya kutayotganlar soni (savollar, masalalar, ishlanmalar, maktablar) | ✅ | |
| Admin matnlarining o'zbekcha tarjimasi (Unfold + Django'da yo'q satrlar) | ✅ | `locale/uz/`, `scripts/compile_po.py` |

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

## 4-bosqich — Kontent, tarjimalar, audit ✅
| Band | Holat | Izoh |
|---|---|---|
| FT-7.1 Dars ishlanmalar bazada (22 ta import qilindi, fayllar saytda qoladi) | ✅ | `manage.py import_lesson_plans` |
| FT-7.2 O'qituvchi yuklaydi → moderatsiya → nashr / rad (izoh bilan) | ✅ | admin panel yoki `lesson-plans/{id}/moderate/` |
| FT-7.3 Fayl tekshiruvi: kengaytma, hajm (PDF 15 MB, DOCX 10 MB), ichki tuzilma, makrosli DOCX rad | ✅ | ClamAV — ixtiyoriy, 5-bosqich |
| FT-7.4 Yuklab olishlar soni | ✅ | statik havolalar ham API orqali hisoblanadi |
| FT-7.5 `dars_ishlanmalar/index.html` API bilan (yangi ishlanmalar qo'shiladi, statik zaxira) | ✅ | |
| O'qituvchi panelida «Ishlanmalarim» (yuklash, holat, moderator izohi) | ✅ | |
| FT-7.6 Tarjimalar bazada, admin panelda tahrirlanadi, `GET /i18n/ru.js` | ✅ | `import_i18n` / `export_i18n` |
| FT-6.2 Parametrlangan masalalar (har o'quvchiga boshqa sonlar, javob formuladan) | ✅ | admin/API orqali; paneldagi forma — ⬜ |
| FT-11.1 Audit: kirish, parol, hisob o'chirish, rol o'zgarishi, baho (oldin/keyin), qaytarish, o'chirishlar, moderatsiya | ✅ | |
| FT-11.2 Kim, qachon, IP, amal, obyekt, oldingi/yangi qiymat | ✅ | |
| FT-11.3 O'zgarmas (tahrir/o'chirish taqiqlangan), 1 yil saqlanadi | ✅ | haftalik tozalash (Celery Beat) |
| Savollarning ruscha tarjimasi (170 + 48) | ⬜ | maydonlar tayyor; matnlarni tarjima qilish kerak |

## 5-bosqich — Sifat va ishga tushirish 🟡
| Band | Holat | Izoh |
|---|---|---|
| FT-10.4 Admin 2FA (TOTP, Google Authenticator) | ✅ | production'da standart yoqilgan (`ADMIN_2FA`) |
| Sentry (xatolar monitoringi) | ✅ | `SENTRY_DSN`; `send_default_pii=False` |
| Maxfiylik siyosati (`maxfiylik.html`), ro'yxatda rozilik belgisi (`accept_privacy`, sana saqlanadi) | ✅ | O'RQ-547 |
| NF-4 Backup: kunlik `pg_dump`, media haftalik, 30 kun / 8 hafta saqlash | ✅ | `scripts/backup.sh` |
| NF-4 Tiklashni sinash | ✅ | `scripts/restore.sh` — sinovda jadval sonlari to'liq mos keldi |
| Statik xavfsizlik tahlili (bandit) | ✅ | yuqori/o'rta xavf yo'q; CI'da ham |
| Yuklama testi (Locust) | 🟡 | 200 foyd.: median 20 ms; 500 foyd.: p95 ≈ 490 ms, 330 so'rov/s, server xatosi 0. Mezon (p95 ≤ 300 ms) umumiy 4 yadroli sinov muhitida (yuklama generatori ham shu mashinada) bajarilmadi — alohida server (≥ 4 vCPU) va alohida generator bilan qayta o'lchash kerak |
| Yuklama testidan keyingi tuzatishlar | ✅ | test yakunidagi deadlock (tartiblangan F() yangilash, variant hisoblagichlari), Argon2 parametrlari (~30 ms), DB ulanishlarini qayta ishlatish, katalog keshi, gunicorn gthread |
| E2E Playwright: sinf → topshiriq → baho | ✅ | `e2e/flow.js` |
| O'qituvchi va administrator qo'llanmasi | ✅ | `hujjatlar/qollanma_oqituvchi.md`, `hujjatlar/qollanma_admin.md` (uz) |
| Qo'llanmalarning ruscha varianti | ⬜ | |
| OWASP ZAP skanerlash | ⬜ | staging serverda (`zap-baseline.py -t https://...`) |
| CD (teg → production deploy) | ⬜ | server tanlangach |
| ClamAV (yuklangan fayllarni antivirus tekshiruvi) | ⬜ | ixtiyoriy |
| Production (O'zbekistondagi server, TZ 11.1) | ⬜ | buyurtmachi serveri kerak |

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
| `testlar_online.html` mashq savollari serverdan (`quiz/bank/`), server bo'lmasa — o'rnatilgan bank | ✅ | admin tasdiqlagan/arxivlagan savol saytda darhol aks etadi |
| Bosh sahifa katalogi serverdan: nofaol model yashiriladi, tartib/nom/tavsif admin bo'yicha | ✅ | `import_simulations` qayta ishga tushirilsa nom/tavsif sahifadagidek qaytadi |
| Dars ishlanmalar: nashrdan olingan statik ishlanma yashiriladi, faqat nashr etilganlar | ✅ | |
| Ruscha tarjimalar admin paneldan (`i18n/ru.js` fayldagi lug'at ustiga) | ✅ | `export_i18n` shart emas; brauzer keshi 10 daqiqa |
| O'qituvchi panelida masalalar: oddiy va parametrli, «Namunani ko'rish» (`quiz/problems/preview/`) | ✅ | |
| Xavfsizlik: formula hisoblagichida daraja/uzunlik chegarasi (`9**9**9**9` serverni osib qo'yardi) | ✅ | |
| Yangi sahifalarning ruscha tarjimasi (i18n-ru.js) | ⬜ | |
| `sw.js`: `/api/`, `/admin/`, `/media/` keshlanmaydi | ✅ | |

### Sahifalar va backend (tekshiruv, 2026-11-01)
| Sahifa | Backend bilan aloqa | Admin paneldagi o'zgarish saytda ko'rinadimi |
|---|---|---|
| `index.html` (katalog) | `simulations/` | ✅ nofaol model, tartib, nom, tavsif; ruscha matnlar — tarjimalar orqali |
| `modellar/*_model.html` (15 ta) | jurnal avto-saqlash, oflayn navbat, topshiriq rejimi, kutilgan natijalar (o'qituvchi) | ✅ kutilgan natijalar, topshiriq qadamlari |
| `testlar/testlar_online.html` (mashq) | `quiz/bank/` | ✅ savollar/masalalar (holat, matn, parametrlar) |
| `testlar/nazorat.html` | `quiz/attempts/` | ✅ |
| `dars_ishlanmalar/index.html` | `lesson-plans/`, yuklab olish hisobi | ✅ nashr/rad, yangi ishlanmalar |
| `kirish.html`, `profil.html` | `auth/*`, `me/` | ✅ (hisob holati, bloklash, tasdiqlash) |
| `oquvchi/`, `oqituvchi/` | sinflar, topshiriqlar, baholar, statistika, savollar, masalalar, ishlanmalar, bildirishnomalar | ✅ |
| Barcha sahifalar (ruscha rejim) | `i18n/ru.js` | ✅ tarjimalar |
| `maxfiylik.html`, `hujjatlar/loyiha_algoritmi.html`, `tekshiruv.html` | yo'q — statik matn | — (kerak emas) |
| `modellar/index.html`, `testlar/index.html`, `hujjatlar/index.html` | yo'q — yo'naltirish sahifalari | — |
| Topilgan va tuzatilgan xato: yopishqoq kanvas pastdagi jurnal ustiga chiqardi (panel ekran tepasidan chiqqanda) | ✅ | |
