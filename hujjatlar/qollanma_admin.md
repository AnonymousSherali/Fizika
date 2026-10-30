# «Fizika 10–11» — administrator qo'llanmasi

*Русская версия: [qollanma_admin_ru.md](qollanma_admin_ru.md)*

Administrator platformani boshqaradi: foydalanuvchilar, maktablar, kontent moderatsiyasi, tarjimalar,
statistika va xavfsizlik. Texnik o'rnatish: [`backend/README.md`](../backend/README.md).

---

## 1. Admin panelga kirish

Manzil: `https://<sayt>/admin/`. Production'da kirish **ikki bosqichli**: login + parol + **6 xonali kod**
(Google Authenticator, Microsoft Authenticator yoki boshqa TOTP ilova).

Birinchi sozlash (server administratori bajaradi):
```bash
python manage.py createsuperuser
python manage.py admin_2fa_setup <login>          # QR-kod chiqadi — ilovada skanerlang
```
Telefon yo'qolsa: `python manage.py admin_2fa_setup <login> --reset` va qaytadan skanerlash.

Kirgach **bosh sahifada**: o'quvchilar, o'qituvchilar, maktablar, faol foydalanuvchilar soni, so'nggi 30 kun
faolligi grafigi, **«Ko'rib chiqish kutilmoqda»** ro'yxati (qoralama savollar, moderatsiyadagi ishlanmalar,
tasdiqlanmagan maktab va o'qituvchilar — bosilsa kerakli ro'yxat ochiladi), hududlar va so'nggi amallar.
Chap menyudagi qizil raqamlar — ko'rib chiqilishi kerak bo'lgan yozuvlar soni. Yuqori o'ng burchakda yorug'/qorong'i rejim.

> Admin parolini va telefonni hech kimga bermang. Har bir administratorga alohida hisob oching.

## 2. Foydalanuvchilar

**Foydalanuvchilar** bo'limi: qidiruv (ism, telefon, login), rol (o'quvchi / o'qituvchi / admin), maktab bo'yicha filtr.

- **O'qituvchi tasdiqlanmagan** (SMS kelmagan) — `is_verified` belgisini qo'lda qo'yish mumkin
  (shaxsini telefon orqali aniqlagandan keyin).
- **Rol o'zgartirish** xavfsizlik jurnaliga yoziladi.
- **Hisobni o'chirish so'rovi** — foydalanuvchi o'zi so'raydi; 30 kundan keyin har kecha avtomatik o'chiriladi.
  Test natijalari anonim statistika sifatida qoladi.
- **Kirish tarixi** — har bir foydalanuvchi uchun (IP, brauzer, muvaffaqiyatli/muvaffaqiyatsiz).

## 3. Maktablar va sinflar

Maktablar 14 hudud bo'yicha; tuman o'qituvchi ro'yxatdan o'tganda tayyor ro'yxatdan tanlanadi
(`apps/schools/districts.py`, yo'q bo'lsa qo'lda yoziladi). Bir maktab ikki xil yozilgan bo'lsa (masalan,
«12-maktab» va «12-sonli maktab»), o'qituvchilarni bittasiga o'tkazib, ikkinchisini o'chiring.
**Tasdiqlanmagan maktablar** soni yon menyuda qizil raqam bilan ko'rinadi.

Sinflarni ko'rish, arxivlash mumkin. O'quv yili tugagan sinflar (masalan, «2025–2026») **1-iyuldan keyin har kecha
avtomatik arxivlanadi** — audit jurnalida «Sinf avtomatik arxivlandi» yozuvi qoladi.

## 4. Kontent moderatsiyasi

### Savollar
**Testlar → Savollar**, filtr «Holat: qoralama». O'qituvchi qo'shgan savolni tekshiring (matn, variantlar,
to'g'ri javob, izoh) → holatni **«Tasdiqlangan»** qiling — umumiy bankka qo'shiladi.
Statistika ustunida «to'g'ri %» ko'rinadi: juda past (< 15%) yoki juda baland (> 95%) savollarni qayta ko'rib chiqing.
Topshiriqda ishlatilgan savol o'chirilmaydi — **arxivlanadi**.

Masalalar: javob, birlik va ruxsat etilgan xatolik (%). **Parametrlangan masala**: `params` (masalan,
`{"m": [1, 5, 0.5]}` — 1 dan 5 gacha 0,5 qadam bilan) va `formula` (masalan, `m*9.8`); matnda `{m}`.

### Dars ishlanmalari
**Kontent → Dars ishlanmalar**, filtr «Moderatsiyada». Faylni yuklab ko'ring → **«Nashr qilish»** yoki
**«Rad etish»** (izoh majburiy — o'qituvchi sababini ko'radi). Fayllar yuklashda avtomatik tekshiriladi
(tur, hajm, makrosli DOCX rad etiladi).

### Tarjimalar
**Kontent → Tarjimalar** — saytning ruscha matnlari (interfeys, test savollari, masalalar). O'zgartirish saytda
avtomatik ko'rinadi (brauzer keshi tufayli 10 daqiqagacha). Saytdagi zaxira faylni ham yangilash (internetsiz
ishlash uchun) — ixtiyoriy: `python manage.py export_i18n`. Matnida `{}` bo'lgan tarjima — andoza: `{}` o'rniga
son yoki ism qo'yiladi, tarjimada ham `{}` soni bir xil bo'lishi kerak.

### Modellar
Admin panelda modelning nomi, tavsifi, tartibi, topshiriq qadamlari, kutilgan natijalari o'zgartiriladi va
nofaol qilinadi (katalogdan yashiriladi). **Yangi model** qo'shish uchun esa dasturchi uning sahifasini
(`modellar/*_model.html`) yaratishi kerak — admin panelning o'zi yangi simulyatsiya yarata olmaydi.

Model sahifalari o'zgarsa (yangi model, jurnal ustunlari): `python manage.py import_simulations`. Eski jurnallar
eski sxema versiyasida qoladi. **Diqqat:** bu buyruq nom, tavsif va qadamlarni sahifadagi matnga qaytaradi —
admin panelda qilingan shu o'zgarishlarni qaytadan kiritish kerak bo'ladi (faol/nofaol holati saqlanadi).

### Admin paneldan qo'shilgan ma'lumot saytda qayerda ko'rinadi
| Admin panelda | Saytda | Qachon |
|---|---|---|
| Savol yoki masala (holat «Tasdiqlangan») | Mashq testi, o'qituvchi topshiriqlari | darhol |
| Model nomi, tavsifi, tartibi, «faol» belgisi | Bosh sahifa katalogi | 10 daqiqagacha (kesh) |
| Model topshiriq qadamlari | Model sahifasi | 10 daqiqagacha |
| Model kutilgan natijalari | Model sahifasi (faqat o'qituvchiga) | darhol |
| Dars ishlanma (holat «Nashr etilgan», PDF bilan) | «Dars ishlanmalar» sahifasi | darhol |
| Maktab | O'qituvchi ro'yxatdan o'tish formasi | darhol |
| Bildirishnoma | Foydalanuvchining 🔔 ro'yxati | darhol |
| Ruscha tarjima | Barcha sahifalar (ruscha rejim) | 10 daqiqagacha |
| Foydalanuvchi, sinf, topshiriq | Tegishli foydalanuvchi panelida | darhol |

Bularning hammasi avtomatik sinov bilan tekshiriladi: `backend/e2e/admin_to_site.js` (sinov serverida).

## 5. Statistika

Admin panel **bosh sahifasi**: o'quvchilar, o'qituvchilar, maktablar, faol sinflar, 7/30 kunlik faollar,
laboratoriya jurnallari, yakunlangan testlar, topshiriqlar; 30 kunlik faollik grafigi; hududlar bo'yicha
foydalanuvchilar; eng ko'p ishlatilgan modellar; so'nggi audit amallari. Xuddi shu ma'lumot API orqali:
`GET /api/v1/analytics/platform/` (admin hisobi bilan).

## 6. Xavfsizlik jurnali (audit)

**Audit → Jurnal**: kirishlar, parol o'zgarishi, hisob o'chirish, rol o'zgarishi, baho qo'yish/o'zgartirish
(oldingi va yangi qiymat), qaytarish, o'chirishlar, moderatsiya, sinflarni avtomatik arxivlash. Har bir yozuvda kim, qachon, IP.

Jurnalni **tahrirlash yoki o'chirib bo'lmaydi** (hatto administrator ham). 1 yildan eski yozuvlar har hafta
avtomatik tozalanadi.

Shikoyat bo'lsa («bahoni kimdir o'zgartirgan») — obyekt bo'yicha filtrlang va kim o'zgartirganini ko'ring.

## 7. Server ishi (texnik administrator uchun)

| Vazifa | Qanday |
|---|---|
| Holatni tekshirish | `GET /api/v1/health/` → `{"status":"ok"}` (baza va kesh) |
| Zaxira nusxa | har kecha `scripts/backup.sh` (cron), 30 kun saqlanadi |
| Tiklash | `scripts/restore.sh <fayl.dump>`; oyiga bir marta sinov bazasida tiklab ko'ring |
| Xatolar | Sentry (`SENTRY_DSN`), gunicorn loglari: `docker compose logs api` |
| Yangilash | `git pull` → `docker compose up -d --build` → `docker compose exec api python manage.py migrate` |
| Fon vazifalari | `celery` va `beat` konteynerlari: email, muddat eslatmalari, hisoblarni o'chirish, audit tozalash, sinflarni avtomatik arxivlash |

**Muhim:** server va zaxira nusxalar **O'zbekiston hududida** bo'lishi shart (O'RQ-547, 27¹-modda).

## 8. Muammolar

| Belgi | Sabab va yechim |
|---|---|
| O'qituvchilarga SMS kelmayapti | `SMS_PROVIDER=eskiz` va `SMS_API_TOKEN` to'g'riligini, Eskiz.uz balansini tekshiring |
| Email kelmayapti | `EMAIL_HOST*` sozlamalari; `celery` konteyneri ishlayaptimi |
| Muddat eslatmalari kelmayapti | `beat` konteyneri ishlayaptimi |
| Saytda «Kirish» tugmasi yo'q | API ishlamayapti: `/api/v1/health/` ni oching |
| Admin kodni qabul qilmayapti | telefon vaqti noto'g'ri (avtomatik vaqtni yoqing) yoki `admin_2fa_setup --reset` |
| Admin paneldagi o'zgarish saytda ko'rinmayapti | 10 daqiqagacha kuting (kesh) yoki sahifani keshsiz yangilang (Ctrl+F5) |
