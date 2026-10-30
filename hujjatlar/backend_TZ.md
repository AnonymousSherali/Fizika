# TEXNIK TOPSHIRIQ (TZ)
## «Fizika 10–11» interaktiv o'quv platformasining backend qismi

| | |
|---|---|
| **Hujjat versiyasi** | 1.1 |
| **Sana** | 2026-yil oktabr |
| **Loyiha** | Fizik jarayonlarni modellashtirishning dasturiy ta'minoti (10–11-sinflar) |
| **Frontend** | Statik HTML/CSS/JS (mavjud, ushbu repozitoriy) |
| **Backend** | Yangi ishlab chiqiladi (ushbu TZ predmeti) |

> **O'zgarishlar (v1.1, 2026-10-30):** buyurtmachi qarori bilan **Telegram bot olib tashlandi**
> (FT-1.4, FT-9.4 va bildirishnomalarning Telegram kanali). Bildirishnomalar — sayt ichida va email orqali.
> Bajarilish holati: [`backend/ROADMAP.md`](../backend/ROADMAP.md).

---

## MUNDARIJA
1. [Umumiy ma'lumotlar](#1-umumiy-malumotlar)
2. [Hozirgi holat va muammolar](#2-hozirgi-holat-va-muammolar)
3. [Backend maqsadlari](#3-backend-maqsadlari)
4. [Dasturlash tili va texnologiyalarni tanlash](#4-dasturlash-tili-va-texnologiyalarni-tanlash)
5. [Foydalanuvchi rollari va huquqlar](#5-foydalanuvchi-rollari-va-huquqlar)
6. [Funksional talablar (modullar)](#6-funksional-talablar-modullar)
7. [Ma'lumotlar bazasi tuzilmasi](#7-malumotlar-bazasi-tuzilmasi)
8. [API spetsifikatsiyasi](#8-api-spetsifikatsiyasi)
9. [Frontend bilan integratsiya](#9-frontend-bilan-integratsiya)
10. [Nofunksional talablar](#10-nofunksional-talablar)
11. [Xavfsizlik va shaxsiy ma'lumotlar](#11-xavfsizlik-va-shaxsiy-malumotlar)
12. [Infratuzilma va joylashtirish (deploy)](#12-infratuzilma-va-joylashtirish-deploy)
13. [Loyiha tuzilmasi (kod)](#13-loyiha-tuzilmasi-kod)
14. [Testlash talablari](#14-testlash-talablari)
15. [Ishlab chiqish bosqichlari va muddatlar](#15-ishlab-chiqish-bosqichlari-va-muddatlar)
16. [Qabul qilish mezonlari](#16-qabul-qilish-mezonlari)
17. [Topshiriladigan hujjatlar](#17-topshiriladigan-hujjatlar)
18. [Atamalar lug'ati](#18-atamalar-lugati)

---

## 1. UMUMIY MA'LUMOTLAR

### 1.1. Tizim nomi
«Fizika 10–11» — interaktiv fizika simulyatsiyalari, laboratoriya jurnali, onlayn testlar va dars ishlanmalar platformasi. Backend ichki nomi: **fizika-api**.

### 1.2. Asos
Hozirgi sayt to'liq statik: barcha ma'lumotlar (laboratoriya jurnali, test natijalari, sozlamalar) faqat foydalanuvchi brauzerida saqlanadi. O'qituvchi o'quvchilar natijalarini ko'ra olmaydi, topshiriq bera olmaydi, test savollari esa ochiq JavaScript kodida turibdi. Backend shu muammolarni hal qiladi.

### 1.3. Foydalanuvchilar
- **O'quvchilar** — 10–11-sinf (15–18 yosh), asosan telefon va maktab kompyuterlaridan.
- **O'qituvchilar** — fizika fani o'qituvchilari.
- **Administrator** — platforma egasi yoki maktab administratori.

### 1.4. Asosiy tamoyillar
1. **Frontend ishlashda davom etadi.** Backend ishlamasa yoki internet bo'lmasa ham modellar, testlar va jurnal hozirgidek (oflayn) ishlaydi. Backend — qo'shimcha imkoniyat.
2. **Mavjud frontend minimal o'zgaradi.** Statik sahifalar qayta yozilmaydi, ular faqat API'ga so'rov yuboradi.
3. **Ikki til:** barcha matnli kontent o'zbek (lotin) va rus tillarida saqlanadi.
4. **Bolalar ma'lumotlari himoyasi:** minimal shaxsiy ma'lumot, O'zbekiston qonunchiligiga muvofiq saqlash.

---

## 2. HOZIRGI HOLAT VA MUAMMOLAR

| Imkoniyat | Hozir qanday ishlaydi | Muammo |
|---|---|---|
| Laboratoriya jurnali | `model-tools.js` — xotirada, sahifa yangilansa yo'qoladi | O'quvchi natijasini saqlay olmaydi, o'qituvchi ko'rmaydi |
| PDF hisobot | Brauzerda chop etish | Topshirish va baholash yo'q |
| Onlayn test | 170 savol + 48 masala `testlar_online.html` ichida | To'g'ri javoblar kodda ochiq, natijalar saqlanmaydi |
| O'qituvchi rejimi | `?oqituvchi=1` + `localStorage` | Har kim yoqa oladi, himoyasiz |
| Dars ishlanmalar | Statik PDF/DOCX fayllar | Yangi faylni faqat dasturchi qo'sha oladi |
| Statistika | Yo'q | Sinf bo'yicha tahlil yo'q |
| Til va mavzu | `localStorage` | Qurilmalar orasida sinxronlanmaydi |

---

## 3. BACKEND MAQSADLARI

1. Foydalanuvchilarni ro'yxatdan o'tkazish va tizimga kiritish (o'qituvchi va o'quvchi).
2. O'qituvchi **sinf** yaratadi, o'quvchilar sinfga **kod** orqali qo'shiladi.
3. O'qituvchi **topshiriq** beradi: laboratoriya ishi (model + qadamlar) yoki test, muddati bilan.
4. O'quvchi laboratoriya jurnalini **serverga saqlaydi** va hisobotni topshiradi. O'qituvchi baholaydi va izoh yozadi.
5. Testlar **serverda tekshiriladi**: to'g'ri javoblar brauzerga yuborilmaydi. Natijalar va urinishlar saqlanadi.
6. O'qituvchi uchun **statistika**: sinf, o'quvchi va mavzu bo'yicha.
7. Administrator **kontentni boshqaradi**: test savollari, dars ishlanmalar, modellar ro'yxati, tarjimalar.
8. **Bildirishnomalar**: muddat yaqinlashsa yoki baho qo'yilsa — Telegram bot va email orqali.

---

## 4. DASTURLASH TILI VA TEXNOLOGIYALARNI TANLASH

### 4.1. Variantlarni solishtirish

| Mezon | **Python + Django** | PHP + Laravel | Node.js + NestJS | Go |
|---|---|---|---|---|
| O'rganish qulayligi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Tayyor admin panel | ✅ Django Admin (bepul, darhol) | Filament (qo'shimcha o'rnatiladi) | Yo'q | Yo'q |
| Ta'lim loyihalari uchun mosligi | Juda yaxshi | Yaxshi | Yaxshi | O'rtacha |
| Ilmiy hisob-kitob (fizika, statistika) | NumPy/SciPy — eng kuchli | Zaif | O'rtacha | O'rtacha |
| Oddiy shared hosting (ahost, cPanel) | ⚠️ «Setup Python App» bo'lsa | ✅ To'g'ridan-to'g'ri | ⚠️ «Setup Node.js App» bo'lsa | ❌ VPS kerak |
| VPS / Docker / Railway | ✅ | ✅ | ✅ | ✅ |
| O'zbekistonda mutaxassislar | Ko'p | Juda ko'p | Ko'p | Kam |
| Telegram bot | aiogram — juda qulay | Bor | Bor | Bor |
| Tezlik (ushbu loyiha uchun) | Yetarli | Yetarli | Yetarli | Ortiqcha |

### 4.2. TAVSIYA: **Python 3.12 + Django 5 + Django REST Framework + PostgreSQL**

**Nima uchun aynan Python va Django:**
1. **Django Admin.** O'qituvchi va administrator uchun test savollari, dars ishlanmalar va foydalanuvchilarni boshqarish paneli **qo'shimcha frontendsiz** tayyor bo'ladi. Bu loyihaning eng katta qismini tejaydi.
2. **O'rganish oson.** Python o'zbek maktablari va kurslarida eng ko'p o'qitiladigan til, unga hujjat va video darslar ko'p.
3. **Fizika va statistika.** NumPy/SciPy bilan grafik tahlili, tajriba natijalarini nazariy qiymat bilan avtomatik solishtirish va sinf statistikasini hisoblash qulay.
4. **Xavfsizlik standart.** CSRF, SQL-injection va XSS himoyasi, parolni xeshlash Django'da tayyor.
5. **Repozitoriyda allaqachon Python bor edi** (statik sayt Python serveri bilan joylangan; keyinchalik bu sozlama olib tashlandi — backend Docker + nginx bilan joylanadi).

**Muqobil variant:** agar loyiha faqat **oddiy shared hostingda (ahost, cPanel) qolishi shart bo'lsa** va VPS olish imkoni bo'lmasa, **PHP 8.3 + Laravel 11 + MySQL 8** tanlang. Bu TZ'dagi barcha talablar, API va ma'lumotlar bazasi Laravel uchun ham o'zgarmaydi: Django Admin o'rniga Filament ishlatiladi, Celery o'rniga Laravel Queue.

### 4.3. Texnologik stek (asosiy variant)

| Qatlam | Texnologiya | Izoh |
|---|---|---|
| Til | Python 3.12 | |
| Freymvork | Django 5.x | ORM, admin, migratsiyalar |
| API | Django REST Framework 3.15 | REST API |
| API hujjati | drf-spectacular | OpenAPI 3 / Swagger UI avtomatik |
| Autentifikatsiya | djangorestframework-simplejwt | JWT (access 15 daqiqa, refresh 30 kun) |
| Ma'lumotlar bazasi | PostgreSQL 16 | |
| Kesh, navbat | Redis 7 | Kesh, rate-limit, Celery broker |
| Fon vazifalari | Celery 5 + Celery Beat | Bildirishnoma, eksport, statistika |
| Fayl saqlash | Lokal disk yoki S3-mos (MinIO) | PDF/DOCX, hisobotlar |
| Telegram bot | aiogram 3 | Bildirishnoma va kirish |
| Server | Gunicorn + Nginx | |
| Konteyner | Docker + docker-compose | |
| CI/CD | GitHub Actions | Test, lint, deploy |
| Monitoring | Sentry (xatolar), Prometheus/Grafana (ixtiyoriy) | |
| Kod sifati | ruff, black, mypy, pre-commit | |

---

## 5. FOYDALANUVCHI ROLLARI VA HUQUQLAR

### 5.1. Rollar
| Rol | Tavsif |
|---|---|
| **Mehmon** | Ro'yxatdan o'tmagan. Modellar, testlar va dars ishlanmalardan hozirgidek foydalanadi, natijalar saqlanmaydi |
| **O'quvchi** | Sinfga a'zo. Jurnal saqlaydi, topshiriq bajaradi, test topshiradi, o'z natijalarini ko'radi |
| **O'qituvchi** | Sinflar yaratadi, topshiriq beradi, baholaydi, statistikani ko'radi, **o'qituvchi rejimi** (kutilgan natijalar) faqat unga ochiladi |
| **Maktab administratori** (ixtiyoriy) | O'z maktabidagi o'qituvchilarni tasdiqlaydi va statistikani ko'radi |
| **Superadministrator** | Butun platforma: kontent, foydalanuvchilar, sozlamalar |

### 5.2. Huquqlar matritsasi

| Amal | Mehmon | O'quvchi | O'qituvchi | Admin |
|---|:-:|:-:|:-:|:-:|
| Modellar va dars ishlanmalarni ko'rish | ✅ | ✅ | ✅ | ✅ |
| Testni mashq rejimida yechish | ✅ | ✅ | ✅ | ✅ |
| Jurnalni serverga saqlash | ❌ | ✅ | ✅ | ✅ |
| Sinfga qo'shilish (kod bilan) | ❌ | ✅ | — | — |
| Sinf yaratish / tahrirlash | ❌ | ❌ | ✅ (o'zinikini) | ✅ |
| Topshiriq berish | ❌ | ❌ | ✅ (o'z sinfiga) | ✅ |
| Topshiriqni bajarish | ❌ | ✅ | — | — |
| Baholash va izoh yozish | ❌ | ❌ | ✅ | ✅ |
| Kutilgan natijalarni ko'rish (o'qituvchi rejimi) | ❌ | ❌ | ✅ | ✅ |
| Test savollarini qo'shish / tahrirlash | ❌ | ❌ | ✅ (o'z savollari) | ✅ |
| Dars ishlanma yuklash | ❌ | ❌ | ✅ (moderatsiyadan keyin chiqadi) | ✅ |
| Statistika | ❌ | O'zinikini | O'z sinflari | Hammasi |
| Foydalanuvchilarni boshqarish | ❌ | ❌ | O'z sinfidagi o'quvchilar | ✅ |

---

## 6. FUNKSIONAL TALABLAR (MODULLAR)

> Har bir talab raqamlangan (FT-x.y). Qabul qilishda shu raqamlar bo'yicha tekshiriladi.

### 6.1. Autentifikatsiya va profil (`accounts`)
- **FT-1.1. O'qituvchi ro'yxatdan o'tishi:** ism, familiya, telefon yoki email, maktab (ro'yxatdan tanlanadi yoki yangisi kiritiladi), parol. Telefon yoki email SMS/email kodi bilan tasdiqlanadi.
- **FT-1.2. O'quvchi ro'yxatdan o'tishi:**
  - O'quvchi o'qituvchi bergan **sinf kodi** (masalan `FZ-7K3Q`) orqali qo'shiladi.
  - U ism, familiya, login va parol kiritadi. Email va telefon **ixtiyoriy**, chunki o'quvchilar voyaga yetmagan.
  - Muqobil yo'l: o'qituvchi sinf ro'yxatini (Excel/CSV) yuklaydi, tizim har bir o'quvchi uchun login va vaqtinchalik parol yaratadi. Ro'yxat PDF «kartochkalar» ko'rinishida chop etiladi.
- **FT-1.3. Kirish:** login (yoki telefon/email) va parol → JWT access + refresh token. «Meni eslab qol» — refresh 30 kun.
- **FT-1.4. Telegram orqali kirish** (ixtiyoriy, 3-bosqich): Telegram Login Widget yoki bot orqali bir martalik kod.
- **FT-1.5. Parolni tiklash:**
  - O'qituvchi — SMS yoki email kodi orqali.
  - O'quvchi — o'qituvchisi parolni qayta o'rnatadi.
- **FT-1.6. Profil:**
  - ism, familiya, avatar (ixtiyoriy);
  - til (`uz` / `ru`) va mavzu (yorug' / qorong'i) — barcha qurilmalarda sinxronlanadi;
  - kirish tarixi (oxirgi 10 ta).
- **FT-1.7. Hisobni o'chirish:** foydalanuvchi so'rovi bilan 30 kun ichida barcha shaxsiy ma'lumotlar o'chiriladi. Statistika anonimlashtiriladi.
- **FT-1.8. Bloklash:** 10 marta noto'g'ri paroldan keyin 15 daqiqa bloklanadi (rate-limit).

### 6.2. Maktablar va sinflar (`schools`)
- **FT-2.1.** Maktab: nomi, viloyat, tuman, raqami. Viloyat va tumanlar ro'yxati oldindan yuklanadi.
- **FT-2.2.** O'qituvchi sinf yaratadi: nomi («10-A»), sinf darajasi (10/11), o'quv yili («2026–2027»). Tizim noyob **qo'shilish kodini** yaratadi.
- **FT-2.3.** Qo'shilish kodini yangilash yoki o'chirish mumkin. Kodga muddat ham qo'yiladi (masalan 7 kun).
- **FT-2.4.** O'qituvchi sinfdagi o'quvchilar ro'yxatini ko'radi: o'quvchini chiqarish, parolini tiklash, boshqa sinfga ko'chirish.
- **FT-2.5.** Bitta sinfda bir nechta o'qituvchi bo'lishi mumkin (asosiy + yordamchi).
- **FT-2.6.** O'quv yili tugaganda sinf **arxivga** o'tkaziladi (o'chirilmaydi).

### 6.3. Modellar katalogi (`simulations`)
- **FT-3.1.** Har bir model uchun yozuv: `slug` (`mayatnik`), sahifa yo'li (`modellar/mayatnik_model.html`), nomi (uz/ru), tavsif (uz/ru), bo'lim (Mexanika, Optika…), sinf (10/11), rasm, tartib raqami, faol/nofaol.
- **FT-3.2.** Model **topshiriq qadamlari** (uz/ru) va **kutilgan natijalar** (faqat o'qituvchiga) bazada saqlanadi. Hozir ular `model-tools.js` dagi `TEACHER` obyektida turibdi.
- **FT-3.3.** Har bir model uchun **jurnal ustunlari sxemasi**: nomi, birligi, turi (son/matn). Server keladigan jurnal ma'lumotini shu sxema bo'yicha tekshiradi.
- **FT-3.4.** `GET /api/v1/simulations/` — bosh sahifadagi katalog shu ro'yxatdan chiziladi. Frontend avval API'dan oladi, ololmasa statik ro'yxatni ishlatadi.

### 6.4. Laboratoriya jurnali (`labs`)
- **FT-4.1.** O'quvchi modeldagi jurnalni **serverga saqlaydi**: model, ustunlar sxemasi versiyasi, qatorlar (≤ 30), yaratilgan vaqt, qurilma turi.
- **FT-4.2.** Avtomatik saqlash: har yangi qator yozilganda (`S` tugmasi) 2 soniya kechikish bilan sinxronlanadi.
- **FT-4.3. Oflayn rejim:** internet bo'lmasa qatorlar brauzerda (IndexedDB) navbatga qo'yiladi va internet paydo bo'lganda yuboriladi. Har bir qator mijoz tomonida yaratilgan `client_id` (UUID) bilan keladi — takroriy yuborishda dublikat paydo bo'lmaydi (idempotentlik).
- **FT-4.4.** Jurnal tarixi: o'quvchi o'zining barcha jurnallarini model bo'yicha ko'radi, ochadi, CSV/PDF ga eksport qiladi.
- **FT-4.5.** **Grafik tahlili serverda ham:**
  - server eng kichik kvadratlar usuli bilan chiziq qiyaligini (k), kesishma nuqtasini (b) va R² ni hisoblaydi va saqlaydi (frontenddagi hisobni tekshirish uchun);
  - model uchun «hosila natija» formulasi bo'lsa, u ham hisoblanadi — masalan mayatnikda g = 4π²/k.
- **FT-4.6.** Natija **nazariy qiymat bilan avtomatik solishtiriladi** va nisbiy xatolik (%) yoziladi.

### 6.5. Topshiriqlar (`assignments`)
- **FT-5.1.** O'qituvchi topshiriq yaratadi:
  - turi: `lab` (laboratoriya ishi) yoki `test`;
  - sinf(lar), sarlavha, ko'rsatma (uz/ru);
  - boshlanish va tugash vaqti, kech topshirishga ruxsat (ha/yo'q, jarima %).
- **FT-5.2. Lab topshiriq:**
  - model tanlanadi va topshiriq qadamlari (standart yoki o'qituvchi tahrirlagan) beriladi;
  - minimal qatorlar soni belgilanadi;
  - talab qilinadigan qismlar tanlanadi: grafik, xulosa matni.
- **FT-5.3. Test topshiriq:**
  - mavzular, savollar soni, hisoblash masalalari soni va vaqt chegarasi (daqiqa) belgilanadi;
  - urinishlar soni (1–3) va javoblarni ko'rsatish vaqti tanlanadi: darhol / muddatdan keyin / hech qachon.
- **FT-5.4.** O'quvchi «Mening topshiriqlarim» ro'yxatini ko'radi. Holatlar: yangi, bajarilmoqda, topshirildi, baholandi, muddati o'tdi.
- **FT-5.5.** Lab topshiriqni topshirish:
  - jurnal qatorlari, grafik parametrlari (X/Y ustunlari, darajalar, k, b, R²) va xulosa matni (≤ 2000 belgi) yuboriladi;
  - grafik rasmi (PNG, ≤ 500 KB) ixtiyoriy.
- **FT-5.6.** O'qituvchi topshiriqni ko'rib chiqadi:
  - baho beradi: 2–5 (yoki 100 ballik tizim — sozlanadi) va izoh yozadi;
  - kerak bo'lsa, «qayta topshirish» so'raydi.
- **FT-5.7.** **Avtomatik dastlabki baho** (o'qituvchi uchun tavsiya):
  - qatorlar soni yetarlimi;
  - o'lchov xatoligi nazariyadan ≤ 5% mi;
  - R² ≥ 0,98 mi;
  - xulosa yozilganmi.
- **FT-5.8.** Muddatga 24 soat va 1 soat qolganda o'quvchiga bildirishnoma boradi (6.9).

### 6.6. Testlar (`quizzes`)
- **FT-6.1. Savollar banki** bazada saqlanadi:
  - savol matni (uz/ru), 4 variant (uz/ru), to'g'ri variant, izoh (uz/ru);
  - mavzu, daraja (Asosiy/Chuqur), qiyinlik (1–3), muallif, holat (qoralama/tasdiqlangan).
- **FT-6.2. Hisoblash masalalari:**
  - matn, to'g'ri javob (son), birlik, ruxsat etilgan xatolik (%), yechim (uz/ru);
  - **parametrlangan masalalar** (3-bosqich): sonlar har o'quvchi uchun tasodifiy tanlanadi, javob formula bo'yicha hisoblanadi.
- **FT-6.3. Import:**
  - hozirgi `testlar_online.html` dagi 170 savol va 48 masala bir martalik skript bilan bazaga ko'chiriladi (`manage.py import_quiz_bank`);
  - Excel shablondan import ham bo'ladi.
- **FT-6.4. Test sessiyasi:**
  - server savollarni tanlaydi va aralashtiradi, mijozga **to'g'ri javobsiz** yuboradi;
  - har bir javob serverda tekshiriladi;
  - vaqt chegarasi serverda nazorat qilinadi.
- **FT-6.5.** Hisoblash javobini tekshirish mantiqi frontenddagi bilan **bir xil** bo'lishi shart:
  - vergul va nuqta qabul qilinadi; `4,22·10⁷`, `4.5e7`, unicode minus va oxiridagi birlik («45 fm») ham qabul qilinadi;
  - xatolik nisbiy (`|x − ans| ≤ |ans|·tol/100`).
- **FT-6.6. Natija:**
  - ball, foiz va baho (2–5);
  - **mavzular bo'yicha tahlil** (to'g'ri / jami);
  - xato javoblar va ularning izohlari (topshiriq sozlamasiga ko'ra).
- **FT-6.7.** **Mashq rejimi** (mehmonlar uchun) hozirgidek frontendda ishlaydi, savollar banki esa API'dan olinadi. Bu rejimda to'g'ri javoblar ham yuboriladi, chunki u nazorat emas.
- **FT-6.8. Savollar statistikasi:** har bir savolga necha marta to'g'ri / noto'g'ri javob berilgan, eng ko'p tanlangan noto'g'ri variant. Bu yomon tuzilgan savollarni topishga yordam beradi.

### 6.7. Dars ishlanmalar va kontent (`content`)
- **FT-7.1.** Dars ishlanma:
  - sarlavha (uz/ru), sinf, mavzu, dars turi, bog'liq model;
  - PDF va DOCX fayllar, muallif, holat (qoralama → moderatsiya → nashr etilgan).
- **FT-7.2.** O'qituvchi dars ishlanma yuklaydi, administrator tasdiqlaydi.
- **FT-7.3.** Fayl cheklovlari: PDF ≤ 15 MB, DOCX ≤ 10 MB. MIME turi tekshiriladi, fayl antivirusdan o'tkaziladi (ClamAV — ixtiyoriy).
- **FT-7.4.** Yuklab olishlar soni hisoblanadi.
- **FT-7.5.** `dars_ishlanmalar/index.html` sahifasi kartalarni API'dan chizadi, ololmasa statik ro'yxat qoladi.
- **FT-7.6.** **Tarjimalar** (`i18n-ru.js` lug'ati) bazada saqlanadi va administrator panelidan tahrirlanadi. `GET /api/v1/i18n/ru.js` hozirgi format bilan bir xil JS faylni qaytaradi.

### 6.8. Statistika va hisobotlar (`analytics`)
- **FT-8.1. O'qituvchi paneli:**
  - har bir sinf bo'yicha topshiriqlar holati va o'rtacha baho;
  - mavzular bo'yicha o'zlashtirish «issiqlik xaritasi» (o'quvchi × mavzu).
- **FT-8.2. O'quvchi kartasi:** barcha topshiriqlar va baholar, test natijalari dinamikasi (grafik), eng zaif mavzular.
- **FT-8.3. Eksport:**
  - sinf jurnali (Excel `.xlsx`);
  - o'quvchi hisoboti (PDF);
  - topshiriq natijalari (CSV).
- **FT-8.4. Administrator paneli:** faol foydalanuvchilar (kunlik/oylik), eng ko'p ishlatiladigan modellar, viloyatlar kesimi.
- **FT-8.5.** Og'ir hisoblar Celery orqali bajariladi va 10 daqiqa keshlanadi.

### 6.9. Bildirishnomalar (`notifications`)
- **FT-9.1.** Kanallar:
  - sayt ichida (qo'ng'iroqcha belgisi);
  - Telegram bot;
  - email (faqat o'qituvchilarga).
- **FT-9.2.** Hodisalar:
  - yangi topshiriq;
  - muddat yaqinlashdi;
  - baho qo'yildi;
  - qayta topshirish so'raldi;
  - sinfga yangi o'quvchi qo'shildi (o'qituvchiga).
- **FT-9.3.** Foydalanuvchi har bir kanalni yoqadi yoki o'chiradi.
- **FT-9.4.** Telegram bot (`@fizika1011_bot` — nomi keyin tanlanadi):
  - `/start` → hisobni bog'lash (saytdagi bir martalik kod orqali);
  - `/topshiriqlar` → faol topshiriqlar ro'yxati;
  - `/baholar` → oxirgi baholar.

### 6.10. Administrator paneli (`/admin`)
- **FT-10.1.** Django Admin asosida, o'zbek tilida.
- **FT-10.2.** Bo'limlar: foydalanuvchilar, maktablar, sinflar, modellar, test savollari (qidiruv va filtr bilan), masalalar, dars ishlanmalar (moderatsiya), tarjimalar, bildirishnomalar jurnali, audit jurnali.
- **FT-10.3.** Savollarni ommaviy amallar bilan tasdiqlash yoki o'chirish, Excel'ga eksport qilish.
- **FT-10.4.** Administrator kirishi **ikki bosqichli autentifikatsiya** (TOTP) bilan himoyalanadi.

### 6.11. Audit jurnali (`audit`)
- **FT-11.1.** Muhim amallar yoziladi: kirish, parol o'zgarishi, baho qo'yish yoki o'zgartirish, kontentni o'chirish, rol o'zgarishi.
- **FT-11.2.** Har bir yozuvda: kim, qachon, IP, amal, obyekt, oldingi va yangi qiymat.
- **FT-11.3.** Audit yozuvlari 1 yil saqlanadi va ularni tahrirlab bo'lmaydi.

---

## 7. MA'LUMOTLAR BAZASI TUZILMASI

> PostgreSQL. Barcha jadvallarda `id` (UUID yoki BIGSERIAL), `created_at`, `updated_at` bor. `*_uz` / `*_ru` — ikki tildagi maydonlar.

### 7.1. Asosiy jadvallar

**users** (Django `AbstractUser` asosida)
| Maydon | Tur | Izoh |
|---|---|---|
| id | UUID | PK |
| username | varchar(40) unique | O'quvchi logini |
| first_name, last_name | varchar(60) | |
| phone | varchar(20) null unique | O'qituvchi uchun |
| email | varchar(120) null unique | |
| role | enum(`student`,`teacher`,`school_admin`,`admin`) | |
| school_id | FK → schools null | |
| language | enum(`uz`,`ru`) default `uz` | |
| theme | enum(`light`,`dark`) default `light` | |
| telegram_id | bigint null unique | |
| is_verified | bool | Telefon/email tasdiqlangan |
| last_login | timestamptz | |

**schools**: `id, name, region, district, number, is_verified`

**classrooms**: `id, school_id, name ("10-A"), grade (10/11), academic_year, join_code (unique), join_code_expires_at, is_archived`

**classroom_members**: `id, classroom_id, user_id, role (student/teacher/assistant), joined_at` — UNIQUE(classroom_id, user_id)

**simulations**: `id, slug unique, page_path, title_uz, title_ru, description_uz, description_ru, category (mexanika/tebranish/molekulyar/elektr/optika/atom/astronomiya), grade, thumbnail, order, is_active`

**simulation_tasks**: `id, simulation_id, step_no, text_uz, text_ru`

**simulation_expected**: `id, simulation_id, text_uz, text_ru` — o'qituvchi rejimi uchun

**lab_schemas**: `id, simulation_id, version, columns JSONB` — `[{"key":"L","label":"L (m)","type":"number"}, ...]`

**lab_journals**: `id, user_id, simulation_id, schema_version, title, rows JSONB, graph JSONB null, conclusion text null, client_id UUID unique, device varchar(20)`
- `rows`: `[[1.0, 10, 9.81, 2.006, 5, 9.77, 0.4], ...]` (≤ 30 qator)
- `graph`: `{"x":0,"y":3,"xp":1,"yp":2,"k":4.02,"b":0.001,"r2":0.9998,"derived":{"g":9.82}}`

**assignments**: `id, teacher_id, type (lab/test), title, instructions_uz, instructions_ru, simulation_id null, quiz_config JSONB null, min_rows, require_graph, require_conclusion, starts_at, due_at, allow_late, late_penalty_pct, max_attempts, show_answers (immediately/after_due/never), grading_scale (5/100)`

**assignment_classrooms**: `assignment_id, classroom_id`

**submissions**: `id, assignment_id, student_id, lab_journal_id null, quiz_attempt_id null, status (draft/submitted/graded/returned), submitted_at, is_late, auto_score JSONB, grade numeric null, teacher_comment text null, graded_by, graded_at` — UNIQUE(assignment_id, student_id)

**quiz_topics**: `id, key ("Kepler"), title_uz, title_ru, simulation_id null, order`

**quiz_questions**: `id, topic_id, level (asosiy/chuqur), difficulty (1–3), text_uz, text_ru, options JSONB [{"uz":"…","ru":"…"} ×4], correct_index (0–3), explanation_uz, explanation_ru, author_id, status (draft/approved), stats_correct, stats_total`

**quiz_problems**: `id, topic_id, text_uz, text_ru, answer numeric, unit, tolerance_pct, solution_uz, solution_ru, params JSONB null, formula text null, status`

**quiz_attempts**: `id, user_id null, assignment_id null, config JSONB, started_at, finished_at null, deadline_at null, score, max_score, percent, grade, topic_breakdown JSONB`

**quiz_attempt_items**: `id, attempt_id, question_id null, problem_id null, order, option_order JSONB, given_answer varchar, is_correct bool null, answered_at`

**lesson_plans**: `id, title_uz, title_ru, grade, topic, lesson_type, simulation_id null, pdf_file, docx_file null, author_id, status (draft/review/published), downloads`

**translations**: `id, key text unique, ru text, updated_by`

**notifications**: `id, user_id, type, payload JSONB, channel, is_read, sent_at`

**audit_log**: `id, actor_id, action, object_type, object_id, before JSONB, after JSONB, ip, user_agent, created_at`

### 7.2. Indekslar (majburiy)
- `lab_journals (user_id, simulation_id, created_at DESC)`
- `submissions (assignment_id, status)`
- `quiz_questions (topic_id, status)`
- `quiz_attempts (user_id, finished_at DESC)`
- `classroom_members (user_id)`
- `notifications (user_id, is_read)`

### 7.3. ER-diagramma (soddalashtirilgan)
```
schools 1─* users
schools 1─* classrooms *─* users (classroom_members)
simulations 1─* simulation_tasks, simulation_expected, lab_schemas
users 1─* lab_journals *─1 simulations
users(teacher) 1─* assignments *─* classrooms
assignments 1─* submissions *─1 users(student)
submissions ─ lab_journals | quiz_attempts
quiz_topics 1─* quiz_questions, quiz_problems
quiz_attempts 1─* quiz_attempt_items
```

---

## 8. API SPETSIFIKATSIYASI

### 8.1. Umumiy qoidalar
- Asosiy manzil: `https://api.<domen>/api/v1/`
- Format: JSON, UTF-8. Vaqt ISO 8601 UTC formatida (`2026-10-30T09:00:00Z`).
- Autentifikatsiya: `Authorization: Bearer <access_token>`
- Til: `Accept-Language: uz` yoki `ru` (xato xabarlari va kontent shu tilda qaytadi).
- Sahifalash: `?page=1&page_size=20` → `{"count", "next", "previous", "results"}`
- Versiyalash: URL'da (`/api/v1/`). Mavjud versiyani buzadigan o'zgarish faqat `/api/v2/` da chiqadi.
- Hujjat: `/api/docs/` (Swagger UI) va `/api/schema/` (OpenAPI 3).

**Xato formati:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Ma'lumotlar noto'g'ri",
    "fields": { "rows": ["Qatorlar soni 30 tadan oshmasligi kerak"] }
  }
}
```
| HTTP | Holat |
|---|---|
| 400 | Noto'g'ri ma'lumot |
| 401 | Kirilmagan yoki token eskirgan |
| 403 | Huquq yo'q |
| 404 | Topilmadi |
| 409 | Ziddiyat (masalan, takroriy topshirish) |
| 429 | So'rovlar juda ko'p |
| 500 | Server xatosi (Sentry'ga yoziladi) |

### 8.2. Endpointlar ro'yxati

**Autentifikatsiya**
| Metod | Yo'l | Tavsif | Kim |
|---|---|---|---|
| POST | `/auth/register/teacher/` | O'qituvchi ro'yxati | Hamma |
| POST | `/auth/register/student/` | O'quvchi ro'yxati (sinf kodi bilan) | Hamma |
| POST | `/auth/verify/` | SMS/email kodni tasdiqlash | Hamma |
| POST | `/auth/login/` | Kirish → access + refresh | Hamma |
| POST | `/auth/refresh/` | Tokenni yangilash | Hamma |
| POST | `/auth/logout/` | Refresh tokenni bekor qilish | Kirgan |
| POST | `/auth/password/reset/` | Parolni tiklash so'rovi | Hamma |
| POST | `/auth/password/reset/confirm/` | Yangi parol | Hamma |
| GET/PATCH | `/me/` | Profil, til, mavzu | Kirgan |
| POST | `/me/telegram/link/` | Telegram bog'lash kodi | Kirgan |
| DELETE | `/me/` | Hisobni o'chirish so'rovi | Kirgan |

**Maktab va sinflar**
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/schools/?region=&q=` | Maktablarni qidirish |
| GET, POST | `/classrooms/` | Mening sinflarim / yangi sinf (o'qituvchi) |
| GET, PATCH, DELETE | `/classrooms/{id}/` | Sinf |
| POST | `/classrooms/{id}/join-code/` | Kodni yangilash |
| POST | `/classrooms/join/` | Kod bilan qo'shilish (o'quvchi) |
| GET | `/classrooms/{id}/students/` | O'quvchilar ro'yxati |
| POST | `/classrooms/{id}/students/import/` | Excel/CSV dan ommaviy yaratish |
| POST | `/classrooms/{id}/students/{uid}/reset-password/` | Parolni tiklash |
| DELETE | `/classrooms/{id}/students/{uid}/` | Sinfdan chiqarish |

**Modellar**
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/simulations/?category=&grade=&q=` | Katalog |
| GET | `/simulations/{slug}/` | Model, topshiriq qadamlari, jurnal sxemasi |
| GET | `/simulations/{slug}/expected/` | Kutilgan natijalar (**faqat o'qituvchi**) |

**Laboratoriya jurnali**
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/labs/?simulation=` | Mening jurnallarim |
| POST | `/labs/` | Yangi jurnal (yoki `client_id` bo'yicha yangilash — upsert) |
| GET, PATCH, DELETE | `/labs/{id}/` | Jurnal |
| POST | `/labs/{id}/analyze/` | Serverda grafik tahlili (k, b, R², hosila natija) |
| GET | `/labs/{id}/export/?format=csv\|pdf` | Eksport |

**Topshiriqlar**
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET, POST | `/assignments/` | O'qituvchi: yaratilganlar; o'quvchi: menga berilganlar |
| GET, PATCH, DELETE | `/assignments/{id}/` | Topshiriq |
| GET | `/assignments/{id}/submissions/` | Barcha topshirishlar (o'qituvchi) |
| POST | `/assignments/{id}/submit/` | Topshirish (o'quvchi) |
| GET | `/submissions/{id}/` | Topshirish tafsiloti |
| POST | `/submissions/{id}/grade/` | Baholash (o'qituvchi) |
| POST | `/submissions/{id}/return/` | Qayta topshirishga qaytarish |

**Testlar**
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/quiz/topics/` | Mavzular va savollar soni |
| GET | `/quiz/practice/?topics=&count=` | Mashq rejimi uchun savollar (javoblar bilan) |
| POST | `/quiz/attempts/` | Nazorat testini boshlash (`assignment_id` yoki konfiguratsiya) |
| GET | `/quiz/attempts/{id}/` | Joriy holat (javoblarsiz) |
| POST | `/quiz/attempts/{id}/answer/` | Bitta savolga javob |
| POST | `/quiz/attempts/{id}/finish/` | Yakunlash → natija |
| GET | `/quiz/attempts/{id}/result/` | Natija, mavzular tahlili, izohlar |
| CRUD | `/quiz/questions/`, `/quiz/problems/` | Savollar banki (o'qituvchi/admin) |
| POST | `/quiz/questions/import/` | Excel import |

**Kontent, statistika, bildirishnomalar**
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/lesson-plans/?grade=&q=&has_model=` | Dars ishlanmalar |
| POST | `/lesson-plans/` | Yuklash (o'qituvchi, moderatsiyaga) |
| GET | `/lesson-plans/{id}/download/?type=pdf\|docx` | Yuklab olish (hisoblanadi) |
| GET | `/i18n/ru.js` | Rus tili lug'ati (JS formatda) |
| GET | `/analytics/classrooms/{id}/` | Sinf statistikasi |
| GET | `/analytics/classrooms/{id}/heatmap/` | O'quvchi × mavzu matritsasi |
| GET | `/analytics/students/{id}/` | O'quvchi kartasi |
| GET | `/analytics/classrooms/{id}/export.xlsx` | Sinf jurnali Excel'da |
| GET | `/notifications/` | Bildirishnomalar |
| POST | `/notifications/read-all/` | Hammasini o'qilgan qilish |
| GET | `/health/` | Server holati (monitoring uchun) |

### 8.3. So'rov va javob namunalari

**Kirish**
```http
POST /api/v1/auth/login/
Content-Type: application/json

{ "login": "aliyev.vali", "password": "••••••••" }
```
```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi...",
  "user": { "id": "7c1e…", "first_name": "Vali", "last_name": "Aliyev",
            "role": "student", "language": "uz", "theme": "light" }
}
```

**Jurnalni saqlash (upsert)**
```http
POST /api/v1/labs/
Authorization: Bearer …

{
  "client_id": "f3b2c1a0-5d1e-4a8b-9c7d-2e6f1a0b3c4d",
  "simulation": "mayatnik",
  "schema_version": 1,
  "rows": [[1.0, 10, 9.81, 2.006, 5, 9.77, 0.4],
           [0.5, 10, 9.81, 1.419, 5, 9.78, 0.3]],
  "graph": { "x": 0, "y": 3, "xp": 1, "yp": 2 },
  "device": "mobile"
}
```
```json
{
  "id": "a19f…",
  "rows_count": 2,
  "analysis": { "k": 4.024, "b": 0.0003, "r2": 0.99999,
                "derived": { "name": "g", "value": 9.81, "unit": "m/s²" },
                "error_pct": 0.0 },
  "updated_at": "2026-10-30T09:12:44Z"
}
```

**Testni boshlash**
```http
POST /api/v1/quiz/attempts/
{ "assignment_id": "c0d1…" }
```
```json
{
  "id": "e5a2…",
  "deadline_at": "2026-10-30T09:40:00Z",
  "items": [
    { "item_id": "1", "type": "mcq", "topic": "Kepler · Asosiy",
      "text": "Kepler nechta qonun kashf etdi?",
      "options": ["3", "2", "5", "4"] },
    { "item_id": "2", "type": "calc", "topic": "Kepler · Hisoblash",
      "text": "Yupiter uchun a = 5.2 AU…", "unit": "yil" }
  ]
}
```
> E'tibor bering: javobda **`correct` maydoni yo'q**, variantlar tartibi esa har o'quvchi uchun boshqacha.

**Javob berish**
```http
POST /api/v1/quiz/attempts/e5a2…/answer/
{ "item_id": "2", "answer": "11,86" }
```
```json
{ "accepted": true, "is_correct": null }
```
`is_correct` qiymati `show_answers` sozlamasiga bog'liq: `immediately` bo'lsa darhol qaytariladi, aks holda `null`.

**Baholash**
```http
POST /api/v1/submissions/9b8c…/grade/
{ "grade": 5, "comment": "Grafik to'g'ri, g = 9.79 m/s² — juda yaxshi!" }
```

---

## 9. FRONTEND BILAN INTEGRATSIYA

### 9.1. Yangi fayl: `api.js`
Barcha sahifalar `theme.js` dan keyin `api.js` ni ulaydi. U quyidagilarni bajaradi:
- `window.FizikaAPI.baseUrl`, `login()`, `logout()`, `me()`, `request(path, options)`;
- tokenni `localStorage` da saqlash va 401 javobida avtomatik `refresh` qilish;
- **oflayn navbat:** IndexedDB'dagi `outbox` jadvaliga yozish, `online` hodisasida va har 60 soniyada yuborish;
- foydalanuvchi kirmagan bo'lsa yoki API ishlamasa hech qanday xato chiqarmaslik — sayt hozirgidek ishlayveradi.

### 9.2. Mavjud fayllardagi o'zgarishlar
| Fayl | O'zgarish |
|---|---|
| `theme.js` | Yuqori o'ng burchakda «Kirish» / profil tugmasi; til va mavzuni profildan olish |
| `model-tools.js` | `labLog.onChange` → `FizikaAPI.saveLab()` (2 s kechikish bilan); «Topshirish» tugmasi (agar faol topshiriq bo'lsa); o'qituvchi rejimi `?oqituvchi=1` o'rniga **rol** bo'yicha; `TEACHER` ma'lumotlari `/simulations/{slug}/expected/` dan |
| `testlar/testlar_online.html` | Savollar `/quiz/practice/` dan (ololmasa — hozirgi o'rnatilgan bank); nazorat testi `/quiz/attempts/` orqali |
| `index.html` | Katalog `/simulations/` dan (ololmasa — statik kartalar) |
| `dars_ishlanmalar/index.html` | Kartalar `/lesson-plans/` dan |
| Yangi sahifalar | `kirish.html`, `profil.html`, `oqituvchi/` (sinflar, topshiriqlar, baholash, statistika), `oquvchi/topshiriqlar.html` |
| `sw.js` | API so'rovlari keshlanmaydi (`/api/` — faqat tarmoq) |

### 9.3. CORS
- Frontend va API alohida domenlarda bo'lsa, `CORS_ALLOWED_ORIGINS` faqat sayt domenini o'z ichiga oladi.
- Tavsiya: bitta domen ishlatilsin — `site.uz` (statik) va `site.uz/api/` (Nginx proxy). Shunda CORS kerak bo'lmaydi.

---

## 10. NOFUNKSIONAL TALABLAR

| # | Talab | Ko'rsatkich |
|---|---|---|
| NF-1 | Javob vaqti | 95% so'rovlar ≤ 300 ms (statistikadan tashqari) |
| NF-2 | Bir vaqtdagi foydalanuvchilar | ≥ 500 (bir maktabda 30 ta sinf bir vaqtda test topshiradi) |
| NF-3 | Ishlash vaqti (uptime) | ≥ 99,5% o'quv yili davomida |
| NF-4 | Zaxira nusxa (backup) | Baza — har kuni, 30 kun saqlanadi; fayllar — har hafta; tiklash har chorakda sinab ko'riladi |
| NF-5 | Masshtablash | Gorizontal: bir nechta Gunicorn konteyneri + umumiy PostgreSQL/Redis |
| NF-6 | Lokalizatsiya | Barcha xabarlar uz/ru (`gettext`), sana formati `dd.mm.yyyy` |
| NF-7 | Kirish imkoniyati | Yangi sahifalar WCAG 2.1 AA, klaviatura bilan boshqarish |
| NF-8 | Mobil | Yangi sahifalar 320 px kenglikdan boshlab |
| NF-9 | Loglar | Strukturalangan JSON loglar, 30 kun |
| NF-10 | Monitoring | Sentry (xatolar), `/api/v1/health/`, disk/CPU ogohlantirishlari |
| NF-11 | Kod sifati | ruff + black + mypy, pre-commit; PR orqali code review |
| NF-12 | Hujjat | OpenAPI avtomatik; README da o'rnatish 10 daqiqada |

---

## 11. XAVFSIZLIK VA SHAXSIY MA'LUMOTLAR

### 11.1. Qonunchilik
- **O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuni (O'RQ-547)** va unga 2021-yilda kiritilgan o'zgartishlar talab qiladi: **O'zbekiston fuqarolarining shaxsiy ma'lumotlari O'zbekiston hududidagi serverlarda saqlanishi** va qayta ishlanishi shart.
  - Shuning uchun ishlab chiqarish (production) serveri va bazasi **O'zbekistondagi** data-markazda joylashtiriladi: ahost, UZINFOCOM, Beeline Cloud, Uztelecom va h.k.
  - Railway / xorijiy bulut faqat test (staging) uchun, haqiqiy o'quvchi ma'lumotlarisiz ishlatiladi.
- Shaxsiy ma'lumotlarni qayta ishlash uchun **foydalanuvchi roziligi** olinadi (ro'yxatdan o'tishda belgi). Voyaga yetmaganlar uchun ota-ona yoki maktab roziligi haqida eslatma ko'rsatiladi.
- **Maxfiylik siyosati** sahifasi (uz/ru) yoziladi.

### 11.2. Minimal ma'lumot tamoyili
- O'quvchidan faqat ism, familiya va login olinadi. Telefon va email ixtiyoriy.
- Tug'ilgan sana, manzil, pasport ma'lumotlari **so'ralmaydi**.

### 11.3. Texnik talablar
1. Faqat HTTPS (TLS 1.2+), HSTS yoqilgan.
2. Parollar Argon2 (yoki Django'dagi PBKDF2) bilan xeshlanadi, minimal uzunlik 8 belgi.
3. JWT: access 15 daqiqa, refresh 30 kun, refresh token **aylantiriladi** va chiqishda qora ro'yxatga qo'shiladi.
4. Rate-limit (Redis):
   - kirish — 10/daqiqa (IP), 5/daqiqa (login);
   - ro'yxatdan o'tish — 5/soat (IP);
   - API — 120/daqiqa (foydalanuvchi).
5. OWASP Top 10 bo'yicha tekshiruv: SQL-injection (faqat ORM), XSS (barcha matn ekranlanadi), CSRF (admin uchun), IDOR (har bir so'rovda egalik tekshiriladi — o'qituvchi faqat **o'z** sinfini ko'radi).
6. Fayl yuklash: MIME va kengaytma tekshiruvi, hajm cheklovi, fayllar `media/` da tasodifiy nom bilan saqlanadi va ishga tushirilmaydi.
7. Maxfiy kalitlar (SECRET_KEY, DB parol, SMS/Telegram tokenlari) faqat `.env` / muhit o'zgaruvchilarida saqlanadi, **repozitoriyga yozilmaydi**.
8. Administrator uchun 2FA (TOTP) va IP cheklovi (ixtiyoriy).
9. Bog'liq kutubxonalardagi zaifliklar tekshiriladi: GitHub Dependabot + `pip-audit` (CI'da).
10. Test javoblari mijozga nazorat rejimida **hech qachon** yuborilmaydi.

---

## 12. INFRATUZILMA VA JOYLASHTIRISH (DEPLOY)

### 12.1. Muhitlar
| Muhit | Maqsad | Joy |
|---|---|---|
| `local` | Dasturchi kompyuteri | docker-compose |
| `staging` | Sinov, test ma'lumotlari | Railway yoki arzon VPS |
| `production` | Haqiqiy foydalanuvchilar | O'zbekistondagi VPS (2 vCPU, 4 GB RAM, 60 GB SSD — boshlanishi uchun yetarli) |

### 12.2. Arxitektura
```
                 ┌─────────────── Nginx (HTTPS, gzip, kesh) ───────────────┐
 Brauzer ───────►│  /            → statik sayt (mavjud HTML/CSS/JS)         │
                 │  /api/, /admin → Gunicorn (Django, 3–5 worker)           │
                 │  /media/       → yuklangan fayllar                       │
                 └──────────────────────────┬──────────────────────────────┘
                                            │
                     ┌──────────────┬───────┴───────┬──────────────────┐
                     │ PostgreSQL 16│   Redis 7     │ Celery worker+beat│
                     └──────────────┴───────────────┴──────────────────┘
                                                     │
                                         Telegram bot (aiogram) · SMS/email
```

### 12.3. docker-compose (namuna)
```yaml
services:
  api:
    build: .
    command: gunicorn config.wsgi -w 4 -b 0.0.0.0:8000
    env_file: .env
    depends_on: [db, redis]
  worker:
    build: .
    command: celery -A config worker -l info
    env_file: .env
  beat:
    build: .
    command: celery -A config beat -l info
    env_file: .env
  bot:
    build: .
    command: python -m bot
    env_file: .env
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    env_file: .env
  redis:
    image: redis:7
  nginx:
    image: nginx:1.27
    ports: ["80:80", "443:443"]
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend:/srv/site        # mavjud statik sayt
      - media:/srv/media
volumes: { pgdata: {}, media: {} }
```

### 12.4. Muhit o'zgaruvchilari (`.env.example`)
```
DJANGO_SECRET_KEY=
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=site.uz,www.site.uz
DATABASE_URL=postgres://fizika:***@db:5432/fizika
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=https://site.uz
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=30
TELEGRAM_BOT_TOKEN=
SMS_PROVIDER=eskiz           # Eskiz.uz yoki PlayMobile
SMS_API_TOKEN=
EMAIL_HOST= / EMAIL_HOST_USER= / EMAIL_HOST_PASSWORD=
SENTRY_DSN=
MEDIA_STORAGE=local          # yoki s3
```

### 12.5. CI/CD (GitHub Actions)
1. Har bir PR uchun ruff, black --check, mypy, pytest (PostgreSQL service bilan) va pip-audit ishga tushadi.
2. `main` ga birlashtirilganda Docker image yig'iladi va GHCR'ga yuboriladi.
3. Teg (`v1.2.0`) qo'yilganda production serveriga SSH orqali `docker compose pull && docker compose up -d` bajariladi, keyin `migrate` va `collectstatic`.
4. Deploydan keyin `/api/v1/health/` tekshiriladi. Xato bo'lsa oldingi versiyaga qaytiladi.

### 12.6. Agar faqat shared hosting (ahost cPanel) bo'lsa
- Laravel variantini tanlang (4.2-bo'lim): PHP 8.3, MySQL 8, `public/` papkasi `public_html/api/` ga, cron orqali `schedule:run` (har daqiqa), navbat uchun `queue:work --stop-when-empty` cron'da.
- Redis bo'lmasa kesh va rate-limit `database` drayverida ishlaydi.
- Mavjud `.htaccess` qoidalari saqlanadi. API uchun alohida `.htaccess` — Laravel standarti.

---

## 13. LOYIHA TUZILMASI (KOD)

Backend **alohida repozitoriyda** (`fizika-api`) bo'lishi tavsiya etiladi. Mavjud statik sayt deploy paytida `frontend/` papkaga ulanadi (git submodule yoki CI orqali).

```
fizika-api/
├── config/                  # settings (base/local/staging/production), urls, wsgi, celery
├── apps/
│   ├── accounts/            # foydalanuvchi, autentifikatsiya, profil
│   ├── schools/             # maktab, sinf, a'zolik, qo'shilish kodi
│   ├── simulations/         # modellar katalogi, topshiriq qadamlari, kutilgan natijalar, jurnal sxemasi
│   ├── labs/                # laboratoriya jurnali, grafik tahlili (numpy)
│   ├── assignments/         # topshiriq, topshirish, baholash, avto-baho
│   ├── quizzes/             # savollar banki, masalalar, urinishlar, javob tekshiruvi
│   ├── content/             # dars ishlanmalar, tarjimalar
│   ├── analytics/           # statistika, eksport (openpyxl, weasyprint)
│   ├── notifications/       # sayt ichi, email, telegram
│   └── audit/               # audit jurnali
├── bot/                     # aiogram Telegram bot
├── scripts/
│   ├── import_quiz_bank.py  # testlar_online.html → baza
│   ├── import_simulations.py
│   └── import_i18n.py       # i18n-ru.js → translations jadvali
├── tests/                   # pytest
├── deploy/                  # nginx.conf, docker, systemd
├── locale/                  # uz, ru (gettext)
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
├── .env.example
└── README.md
```

**Muhim:** hisoblash javobini tekshiradigan funksiya (`quizzes/answer.py`) frontenddagi `checkProblem()` bilan bir xil natija berishini ta'minlovchi **umumiy test to'plami** (≥ 30 holat) yoziladi: `4,22·10⁷`, `−5`, `45 fm`, `1.2.3` → xato va h.k.

---

## 14. TESTLASH TALABLARI
1. **Unit testlar:** javob tekshiruvi, avto-baho, grafik tahlili (k, b, R²), huquqlar.
2. **API testlar:** har bir endpoint uchun muvaffaqiyatli holat, 401, 403 (boshqa o'qituvchining sinfi), 400 (noto'g'ri ma'lumot).
3. **Kod qamrovi:** umumiy ≥ 75%, `quizzes`, `assignments` va `accounts` ilovalarida ≥ 90%.
4. **Yuklama testi** (Locust yoki k6): 500 foydalanuvchi bir vaqtda test topshiradi, p95 ≤ 300 ms, xatolar < 0,5%.
5. **Xavfsizlik:** OWASP ZAP bilan avtomatik skanerlash (staging), qo'lda IDOR tekshiruvi.
6. **Integratsion (E2E):** Playwright — o'qituvchi sinf yaratadi → o'quvchi kod bilan qo'shiladi → topshiriq bajariladi → baho qo'yiladi → o'quvchi bahoni ko'radi.
7. **Oflayn sinxronlash:** internet uziladi → 3 qator yoziladi → ulanadi → serverda 3 qator, dublikatsiz.

---

## 15. ISHLAB CHIQISH BOSQICHLARI VA MUDDATLAR

> Taxminiy hisob: 1 tajribali backend dasturchi (to'liq kun) uchun. Frontend ishlari (yangi sahifalar) alohida, taxminan +30%.

| Bosqich | Mazmuni | Muddat | Natija |
|---|---|---|---|
| **0. Tayyorgarlik** | Repozitoriy, Docker, CI, settings, Sentry, staging | 1 hafta | `/health/` ishlaydi, CI yashil |
| **1. MVP** | accounts, schools, simulations (import), labs (saqlash + oflayn sinxron), admin panel | 3–4 hafta | O'quvchi jurnalini saqlaydi, o'qituvchi sinfini ko'radi |
| **2. Topshiriq va testlar** | assignments, quizzes (import 170+48, serverda tekshiruv), avto-baho, baholash | 3–4 hafta | To'liq «topshiriq → topshirish → baho» sikli |
| **3. Statistika va bildirishnomalar** | analytics, Excel/PDF eksport, Telegram bot, email/SMS | 2–3 hafta | O'qituvchi paneli, bot |
| **4. Kontent va tarjimalar** | lesson-plans (yuklash, moderatsiya), translations, parametrlangan masalalar | 2 hafta | Administrator kontentni o'zi boshqaradi |
| **5. Sifat va ishga tushirish** | Yuklama va xavfsizlik testlari, hujjatlar, production deploy, backup sinovi | 1–2 hafta | Production ishlamoqda |
| **Jami** | | **≈ 12–16 hafta** | |

**Tavsiya:** 1-bosqich (MVP)ni bitta maktabda **pilot** qilib sinab ko'ring, o'qituvchilar fikri asosida 2–3-bosqichlarni aniqlashtiring.

---

## 16. QABUL QILISH MEZONLARI
1. Barcha FT-x.y talablari bajarilgan va staging'da namoyish qilingan.
2. API hujjati (`/api/docs/`) to'liq, har bir endpointda namuna bor.
3. Testlar yashil, qamrov 14-bo'limdagi talablarga mos.
4. Yuklama testi NF-1, NF-2 ko'rsatkichlariga mos.
5. OWASP ZAP hisobotida «High» darajali zaiflik yo'q.
6. Mavjud statik sayt **backend o'chirilganda ham** to'liq ishlaydi (regressiya yo'q).
7. Production O'zbekistondagi serverda, kunlik backup sozlangan va tiklash sinab ko'rilgan.
8. README bo'yicha yangi dasturchi loyihani 10 daqiqada lokal ishga tushira oladi.
9. Administrator va o'qituvchi uchun qo'llanma (uz/ru, skrinshotlar bilan) topshirilgan.

---

## 17. TOPSHIRILADIGAN HUJJATLAR
- Manba kod (Git repozitoriy), barcha migratsiyalar.
- `README.md`: o'rnatish, ishga tushirish, deploy.
- OpenAPI sxemasi (`schema.yaml`).
- Ma'lumotlar bazasi ER-diagrammasi (PNG/PDF).
- O'qituvchi qo'llanmasi va administrator qo'llanmasi (uz/ru).
- Maxfiylik siyosati va foydalanish shartlari matni.
- Backup va tiklash yo'riqnomasi.

---

## 18. ATAMALAR LUG'ATI
| Atama | Ma'nosi |
|---|---|
| **API** | Frontend va server o'rtasidagi so'rov-javob interfeysi |
| **REST** | HTTP metodlari (GET/POST/PATCH/DELETE) orqali resurslar bilan ishlash uslubi |
| **JWT** | Foydalanuvchi kirganini tasdiqlovchi imzolangan token |
| **ORM** | Ma'lumotlar bazasi bilan Python obyektlari orqali ishlash (SQL yozmasdan) |
| **Migratsiya** | Baza tuzilmasini o'zgartiruvchi versiyalangan skript |
| **Celery** | Fon vazifalarini (bildirishnoma, eksport) bajaruvchi tizim |
| **Redis** | Tezkor xotira bazasi: kesh va navbatlar uchun |
| **Idempotentlik** | Bir so'rov bir necha marta yuborilsa ham natija bitta bo'lishi |
| **IDOR** | Boshqa foydalanuvchining ma'lumotiga ID orqali ruxsatsiz kirish zaifligi |
| **PWA** | Oflayn ishlaydigan, telefonga o'rnatiladigan veb-ilova (mavjud sayt shunday) |
| **Staging** | Production'ga o'xshash sinov muhiti |
| **p95** | So'rovlarning 95 foizi shu vaqtdan tez bajariladi |

---

*Ushbu TZ mavjud frontend (15 ta model, laboratoriya jurnali, 170 savollik test, 22 ta dars ishlanma, PWA, uz/ru) asosida tuzilgan. Frontendda o'zgarish bo'lsa, tegishli bo'limlar (6, 7, 9) yangilanadi.*
